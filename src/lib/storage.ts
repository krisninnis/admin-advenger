import type { AdminCase, AdminDraft, AdminFinding, AdminItem, ImpactEntry } from "../types";
import { AI_PROVIDER_SETTINGS_STORAGE_KEY } from "./aiProviderSettings";
import { deriveImpactFromCase } from "./impactLedger";
import { INBOX_SCAN_SETTINGS_STORAGE_KEY } from "./inboxScanStorage";
import { FEEDBACK_STORAGE_KEY, VALIDATION_STORAGE_KEY } from "./validationStorage";

export const ADMIN_AVENGER_STORAGE_KEY = "admin-avenger-state-v1";

const LEGACY_STORAGE_KEYS = [
  "admin-avenger-state",
  "admin-avenger-state-v0",
  "adminAvengerState",
];

export const ADMIN_AVENGER_LOCAL_STORAGE_KEYS = [
  ADMIN_AVENGER_STORAGE_KEY,
  ...LEGACY_STORAGE_KEYS,
  AI_PROVIDER_SETTINGS_STORAGE_KEY,
  INBOX_SCAN_SETTINGS_STORAGE_KEY,
  VALIDATION_STORAGE_KEY,
  FEEDBACK_STORAGE_KEY,
];

export type StoredAdminAvengerState = {
  adminItems: AdminItem[];
  findings: AdminFinding[];
  adminCases: AdminCase[];
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
  selectedFindingId?: string;
  selectedCaseId?: string;
};

export type StorageLoadDiagnostic = {
  source: "empty" | "saved" | "legacy" | "invalid";
  key?: string;
  caseCount: number;
  itemCount: number;
  findingCount: number;
  impactCount: number;
  skippedKeys: string[];
};

export type StorageSaveResult =
  | { ok: true }
  | { ok: false; message: string; error: unknown };

export type AdminAvengerBackup = {
  exportedAt: string;
  version: 1;
  note: string;
  localStorage: Record<string, unknown>;
};

let lastStorageLoadDiagnostic: StorageLoadDiagnostic = {
  source: "empty",
  caseCount: 0,
  itemCount: 0,
  findingCount: 0,
  impactCount: 0,
  skippedKeys: [],
};

let storageSaveErrorListener: ((message: string) => void) | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asArray = <T>(value: unknown, fallback: T[]) =>
  Array.isArray(value) ? (value as T[]) : fallback;

const asOptionalString = (value: unknown, fallback?: string) =>
  typeof value === "string" ? value : fallback;

const hasStringId = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && typeof value.id === "string";

const hydrateItems = (value: unknown, fallback: AdminItem[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminItem[];

const hydrateFindings = (value: unknown, fallback: AdminFinding[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminFinding[];

const hydrateDrafts = (value: unknown, fallback: AdminDraft[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminDraft[];

const hydrateImpactEntries = (value: unknown, fallback: ImpactEntry[]) =>
  asArray<unknown>(value, fallback)
    .filter(hasStringId)
    .map((entry) => ({
      ...entry,
      proofImageDataUrl: undefined,
    })) as ImpactEntry[];

const hydrateCases = (value: unknown, fallback: AdminCase[]) =>
  asArray<unknown>(value, fallback)
    .filter(hasStringId)
    .map((adminCase) => ({
      ...adminCase,
      evidence: Array.isArray(adminCase.evidence)
        ? adminCase.evidence.filter(hasStringId)
        : [],
      timeline: Array.isArray(adminCase.timeline)
        ? adminCase.timeline.filter(
            (event) => hasStringId(event) && typeof event.createdAt === "string",
          )
        : [],
    })) as AdminCase[];

const emptyStoredState = (): StoredAdminAvengerState => ({
  adminItems: [],
  findings: [],
  adminCases: [],
  drafts: [],
  impactEntries: [],
});

const getStorageKeysToTry = () => [ADMIN_AVENGER_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

const storageSaveFailureMessage =
  "AdminAvenger could not save changes in this browser. Recent changes may be lost after closing. Export a backup if needed.";

export const sanitizeStoredAdminAvengerState = (
  state: StoredAdminAvengerState,
): StoredAdminAvengerState => ({
  ...state,
  impactEntries: state.impactEntries.map((entry) => ({
    ...entry,
    proofImageDataUrl: undefined,
  })),
});

const readStoredRawState = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const values: Array<{ key: string; rawState: string }> = [];

  for (const key of getStorageKeysToTry()) {
    try {
      const rawState = window.localStorage.getItem(key);

      if (rawState) {
        values.push({ key, rawState });
      }
    } catch {
      // Keep trying other keys so one storage failure does not hide saved data.
    }
  }

  return values;
};

const getFirstValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  return undefined;
};

const hydrateStoredState = (
  parsedState: Record<string, unknown>,
  fallback: StoredAdminAvengerState,
): StoredAdminAvengerState => {
  const itemsValue = getFirstValue(parsedState, ["adminItems", "items"]);
  const findingsValue = getFirstValue(parsedState, ["findings", "adminFindings"]);
  const casesValue = getFirstValue(parsedState, ["adminCases", "cases"]);
  const draftsValue = getFirstValue(parsedState, ["drafts", "adminDrafts"]);
  const impactEntriesValue = getFirstValue(parsedState, ["impactEntries", "impacts", "impactRecords"]);

  const hydratedState: StoredAdminAvengerState = {
    adminItems: hydrateItems(itemsValue, fallback.adminItems),
    findings: hydrateFindings(findingsValue, fallback.findings),
    adminCases: hydrateCases(casesValue, fallback.adminCases),
    drafts: hydrateDrafts(draftsValue, fallback.drafts),
    impactEntries: hydrateImpactEntries(impactEntriesValue, []),
    selectedFindingId: asOptionalString(
      parsedState.selectedFindingId,
      fallback.selectedFindingId,
    ),
    selectedCaseId: asOptionalString(parsedState.selectedCaseId, fallback.selectedCaseId),
  };

  const hasSelectedFinding = hydratedState.findings.some(
    (finding) => finding.id === hydratedState.selectedFindingId,
  );
  const hasSelectedCase = hydratedState.adminCases.some(
    (adminCase) => adminCase.id === hydratedState.selectedCaseId,
  );

  return {
    ...hydratedState,
    impactEntries:
      hydratedState.impactEntries.length > 0
        ? hydratedState.impactEntries
        : hydratedState.adminCases.flatMap((adminCase) => {
            const item = hydratedState.adminItems.find((adminItem) => adminItem.id === adminCase.itemId);
            const finding = hydratedState.findings.find(
              (adminFinding) => adminFinding.id === adminCase.findingId,
            );
            return deriveImpactFromCase(adminCase, item, finding);
          }),
    selectedFindingId: hasSelectedFinding
      ? hydratedState.selectedFindingId
      : hydratedState.findings[0]?.id,
    selectedCaseId: hasSelectedCase ? hydratedState.selectedCaseId : hydratedState.adminCases[0]?.id,
  };
};

const updateDiagnostic = (
  state: StoredAdminAvengerState,
  source: StorageLoadDiagnostic["source"],
  key: string | undefined,
  skippedKeys: string[],
) => {
  lastStorageLoadDiagnostic = {
    source,
    key,
    caseCount: state.adminCases.length,
    itemCount: state.adminItems.length,
    findingCount: state.findings.length,
    impactCount: state.impactEntries.length,
    skippedKeys,
  };
};

export const loadSavedAdminAvengerState = (
  fallback: StoredAdminAvengerState,
): StoredAdminAvengerState => {
  const rawStates = readStoredRawState();
  const skippedKeys: string[] = [];

  if (rawStates.length === 0) {
    updateDiagnostic(fallback, "empty", undefined, skippedKeys);
    return fallback;
  }

  for (const { key, rawState } of rawStates) {
    try {
      const parsedState: unknown = JSON.parse(rawState);

      if (!isRecord(parsedState)) {
        skippedKeys.push(key);
        continue;
      }

      const storedFallback = key === ADMIN_AVENGER_STORAGE_KEY ? emptyStoredState() : fallback;
      const hydratedState = hydrateStoredState(parsedState, storedFallback);

      updateDiagnostic(
        hydratedState,
        key === ADMIN_AVENGER_STORAGE_KEY ? "saved" : "legacy",
        key,
        skippedKeys,
      );

      return hydratedState;
    } catch {
      skippedKeys.push(key);
    }
  }

  updateDiagnostic(fallback, "invalid", undefined, skippedKeys);
  return fallback;
};

export const saveAdminAvengerState = (state: StoredAdminAvengerState): StorageSaveResult => {
  if (typeof window === "undefined") {
    return { ok: true };
  }

  try {
    window.localStorage.setItem(
      ADMIN_AVENGER_STORAGE_KEY,
      JSON.stringify(sanitizeStoredAdminAvengerState(state)),
    );

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(legacyKey);
    }

    return { ok: true };
  } catch (error) {
    storageSaveErrorListener?.(storageSaveFailureMessage);
    return { ok: false, message: storageSaveFailureMessage, error };
  }
};

export const clearSavedAdminAvengerState = () => {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of getStorageKeysToTry()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures so the app stays usable.
    }
  }
};

export const clearAllAdminAvengerLocalData = () => {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Keep trying other keys so one failing removal does not leave everything behind.
    }
  }
};

export const createAdminAvengerBackup = (
  state?: StoredAdminAvengerState,
): AdminAvengerBackup => {
  const localStorageData: Record<string, unknown> = {};

  if (state) {
    localStorageData[ADMIN_AVENGER_STORAGE_KEY] = sanitizeStoredAdminAvengerState(state);
  }

  if (typeof window !== "undefined") {
    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      if (key === ADMIN_AVENGER_STORAGE_KEY && state) {
        continue;
      }

      try {
        const rawValue = window.localStorage.getItem(key);

        if (!rawValue) {
          continue;
        }

        try {
          localStorageData[key] = JSON.parse(rawValue) as unknown;
        } catch {
          localStorageData[key] = rawValue;
        }
      } catch {
        // Skip unreadable keys and keep the backup usable.
      }
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    note: "Local AdminAvenger backup. This JSON is for manual safekeeping in the prototype and is not automatically imported by the app.",
    localStorage: localStorageData,
  };
};

export const getLastStorageLoadDiagnostic = () => lastStorageLoadDiagnostic;

export const subscribeToStorageSaveErrors = (listener: (message: string) => void) => {
  storageSaveErrorListener = listener;

  return () => {
    if (storageSaveErrorListener === listener) {
      storageSaveErrorListener = undefined;
    }
  };
};
