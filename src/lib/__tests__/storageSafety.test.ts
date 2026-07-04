import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AdminCase, AdminFinding, AdminItem, ImpactEntry } from "../../types";
import { AI_PROVIDER_SETTINGS_STORAGE_KEY } from "../aiProviderSettings";
import { INBOX_SCAN_SETTINGS_STORAGE_KEY } from "../inboxScanStorage";
import {
  ADMIN_AVENGER_LOCAL_STORAGE_KEYS,
  ADMIN_AVENGER_STORAGE_KEY,
  clearAllAdminAvengerLocalData,
  createAdminAvengerBackup,
  getLastStorageLoadDiagnostic,
  loadSavedAdminAvengerState,
  sanitizeStoredAdminAvengerState,
  saveAdminAvengerState,
  subscribeToStorageSaveErrors,
  type StoredAdminAvengerState,
} from "../storage";
import { FEEDBACK_STORAGE_KEY, VALIDATION_STORAGE_KEY } from "../validationStorage";

class FakeLocalStorage implements Storage {
  private values = new Map<string, string>();
  throwOnSet = false;

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    if (this.throwOnSet) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }

    this.values.set(key, value);
  }
}

const originalWindow = globalThis.window;
let localStorage: FakeLocalStorage;

const now = "2026-07-04T10:30:00.000Z";

const sampleItem: AdminItem = {
  id: "item-storage-test",
  title: "Refund approved",
  sourceType: "email",
  rawText: "Your refund of GBP 42.99 has been approved. Reference RF12345.",
  createdAt: now,
  analysedAt: now,
};

const sampleFinding: AdminFinding = {
  id: "finding-storage-test",
  itemId: sampleItem.id,
  category: "refund",
  title: "Refund approved",
  summary: "A refund appears to be approved but not yet confirmed received.",
  whyItMatters: "Approved is not the same as received.",
  suggestedAction: "Track until the money arrives.",
  estimatedValue: "GBP 42.99",
  urgency: "medium",
  confidence: "high",
  status: "new",
  createdAt: now,
};

const sampleCase: AdminCase = {
  id: "case-storage-test",
  findingId: sampleFinding.id,
  itemId: sampleItem.id,
  title: "Refund approved",
  category: "refund",
  summary: "Track the approved refund.",
  valueLabel: "GBP 42.99 pending",
  urgency: "medium",
  confidence: "high",
  status: "waiting",
  nextAction: "Wait for the refund to arrive, then confirm it.",
  createdAt: now,
  updatedAt: now,
  evidence: [],
  timeline: [],
};

const sampleImpactEntry: ImpactEntry = {
  id: "impact-storage-test",
  caseId: sampleCase.id,
  title: sampleCase.title,
  type: "pending_recovery",
  amount: 42.99,
  currency: "GBP",
  frequency: "one_off",
  status: "pending",
  evidenceNote: "Refund approved, not yet received.",
  proofAttached: true,
  proofImageName: "refund-proof.png",
  proofImageDataUrl: "data:image/png;base64,pretend-this-is-a-large-photo",
  proofText: "Refund approved.",
  createdAt: now,
  updatedAt: now,
};

const sampleState = (): StoredAdminAvengerState => ({
  adminItems: [sampleItem],
  findings: [sampleFinding],
  adminCases: [sampleCase],
  drafts: [],
  impactEntries: [sampleImpactEntry],
  selectedFindingId: sampleFinding.id,
  selectedCaseId: sampleCase.id,
});

const emptyFallback = (): StoredAdminAvengerState => ({
  adminItems: [],
  findings: [],
  adminCases: [],
  drafts: [],
  impactEntries: [],
});

beforeEach(() => {
  localStorage = new FakeLocalStorage();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
  });
});

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  }
});

describe("AdminAvenger storage safety", () => {
  it("round trips saved cases and impact records without storing proof image data URLs", () => {
    const saveResult = saveAdminAvengerState(sampleState());
    const loadedState = loadSavedAdminAvengerState(emptyFallback());

    expect(saveResult.ok).toBe(true);
    expect(loadedState.adminCases).toHaveLength(1);
    expect(loadedState.impactEntries).toHaveLength(1);
    expect(loadedState.adminCases[0]?.id).toBe(sampleCase.id);
    expect(loadedState.impactEntries[0]?.amount).toBe(42.99);
    expect(loadedState.impactEntries[0]?.proofImageName).toBe("refund-proof.png");
    expect(loadedState.impactEntries[0]?.proofImageDataUrl).toBeUndefined();
  });

  it("loads recoverable legacy state when the main saved state is malformed", () => {
    localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, "{not valid json");
    localStorage.setItem("admin-avenger-state", JSON.stringify(sampleState()));

    const loadedState = loadSavedAdminAvengerState(emptyFallback());
    const diagnostic = getLastStorageLoadDiagnostic();

    expect(loadedState.adminCases[0]?.id).toBe(sampleCase.id);
    expect(diagnostic.source).toBe("legacy");
    expect(diagnostic.skippedKeys).toContain(ADMIN_AVENGER_STORAGE_KEY);
  });

  it("surfaces quota/save errors instead of silently succeeding", () => {
    let visibleError = "";
    const unsubscribe = subscribeToStorageSaveErrors((message) => {
      visibleError = message;
    });

    localStorage.throwOnSet = true;
    const saveResult = saveAdminAvengerState(sampleState());
    unsubscribe();

    expect(saveResult.ok).toBe(false);
    expect(visibleError).toBe(
      "AdminAvenger could not save changes in this browser. Recent changes may be lost after closing. Export a backup if needed.",
    );
    expect(localStorage.getItem(ADMIN_AVENGER_STORAGE_KEY)).toBeNull();
  });

  it("deletes all known AdminAvenger local storage keys", () => {
    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify({ saved: true }));
    }

    clearAllAdminAvengerLocalData();

    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });

  it("includes the real local state and settings in backup JSON without full proof images", () => {
    localStorage.setItem(AI_PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify({ mode: "local_rules" }));
    localStorage.setItem(INBOX_SCAN_SETTINGS_STORAGE_KEY, JSON.stringify({ previewEnabled: false }));
    localStorage.setItem(VALIDATION_STORAGE_KEY, JSON.stringify([{ id: "validation-1" }]));
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([{ id: "feedback-1" }]));

    const backup = createAdminAvengerBackup(sampleState());
    const backedUpState = backup.localStorage[ADMIN_AVENGER_STORAGE_KEY] as StoredAdminAvengerState;

    expect(backup.version).toBe(1);
    expect(backedUpState.adminCases[0]?.id).toBe(sampleCase.id);
    expect(backedUpState.impactEntries[0]?.proofImageName).toBe("refund-proof.png");
    expect(backedUpState.impactEntries[0]?.proofImageDataUrl).toBeUndefined();
    expect(backup.localStorage[AI_PROVIDER_SETTINGS_STORAGE_KEY]).toEqual({ mode: "local_rules" });
    expect(backup.localStorage[INBOX_SCAN_SETTINGS_STORAGE_KEY]).toEqual({ previewEnabled: false });
    expect(backup.localStorage[VALIDATION_STORAGE_KEY]).toEqual([{ id: "validation-1" }]);
    expect(backup.localStorage[FEEDBACK_STORAGE_KEY]).toEqual([{ id: "feedback-1" }]);
  });

  it("sanitizes old impact records that already contain proof image data URLs", () => {
    const sanitizedState = sanitizeStoredAdminAvengerState(sampleState());

    expect(sanitizedState.impactEntries[0]?.proofImageName).toBe("refund-proof.png");
    expect(sanitizedState.impactEntries[0]?.proofImageDataUrl).toBeUndefined();
  });
});
