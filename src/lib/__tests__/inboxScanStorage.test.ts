import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  INBOX_SCAN_SETTINGS_STORAGE_KEY,
  SELECTABLE_NOTIFICATION_METHODS,
  clearInboxScanSettings,
  defaultInboxScanSettings,
  isSelectableNotificationMethod,
  loadInboxScanSettings,
  resolveActiveNotificationMethod,
  saveInboxScanSettings,
  type InboxScanSettings,
} from "../inboxScanStorage";
import {
  ADMIN_AVENGER_LOCAL_STORAGE_KEYS,
  clearAllAdminAvengerLocalData,
  createAdminAvengerBackup,
} from "../storage";

class FakeLocalStorage implements Storage {
  private values = new Map<string, string>();

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
    this.values.set(key, value);
  }
}

const originalWindow = globalThis.window;
let localStorage: FakeLocalStorage;

const writeRawSettings = (value: unknown) => {
  localStorage.setItem(INBOX_SCAN_SETTINGS_STORAGE_KEY, JSON.stringify(value));
};

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

describe("Inbox scan notification method safety", () => {
  it("only lists in-app as a selectable notification method", () => {
    expect(SELECTABLE_NOTIFICATION_METHODS).toEqual(["in_app"]);
    expect(isSelectableNotificationMethod("in_app")).toBe(true);
    expect(isSelectableNotificationMethod("email_later")).toBe(false);
    expect(isSelectableNotificationMethod("text_later")).toBe(false);
  });

  it("cannot load email or text as the active notification method", () => {
    writeRawSettings({ notificationMethod: "email_later" });
    expect(loadInboxScanSettings().notificationMethod).toBe("in_app");

    writeRawSettings({ notificationMethod: "text_later" });
    expect(loadInboxScanSettings().notificationMethod).toBe("in_app");
  });

  it("falls back disabled future methods to in-app when resolving the active method", () => {
    expect(resolveActiveNotificationMethod("in_app")).toBe("in_app");
    expect(resolveActiveNotificationMethod("email_later")).toBe("in_app");
    expect(resolveActiveNotificationMethod("text_later")).toBe("in_app");
  });

  it("never persists email or text as the active method even if asked to save one", () => {
    const settings: InboxScanSettings = {
      ...defaultInboxScanSettings,
      notificationMethod: "email_later",
    };

    saveInboxScanSettings(settings);

    const rawStored = localStorage.getItem(INBOX_SCAN_SETTINGS_STORAGE_KEY) ?? "{}";
    expect(JSON.parse(rawStored).notificationMethod).toBe("in_app");
    expect(loadInboxScanSettings().notificationMethod).toBe("in_app");
  });
});

describe("Inbox scan local beta interest preference", () => {
  it("defaults to no beta interest and an empty note", () => {
    expect(defaultInboxScanSettings.betaInterestFutureAlerts).toBe(false);
    expect(defaultInboxScanSettings.betaAlertsNote).toBe("");
  });

  it("round trips the local beta interest toggle and note", () => {
    saveInboxScanSettings({
      ...defaultInboxScanSettings,
      betaInterestFutureAlerts: true,
      betaAlertsNote: "Refund deadlines and price rises",
    });

    const loaded = loadInboxScanSettings();
    expect(loaded.betaInterestFutureAlerts).toBe(true);
    expect(loaded.betaAlertsNote).toBe("Refund deadlines and price rises");
  });

  it("caps the beta note length so it stays a short local note", () => {
    saveInboxScanSettings({
      ...defaultInboxScanSettings,
      betaAlertsNote: "x".repeat(2000),
    });

    expect(loadInboxScanSettings().betaAlertsNote.length).toBe(500);
  });

  it("clears beta interest data when inbox scan settings are cleared", () => {
    saveInboxScanSettings({
      ...defaultInboxScanSettings,
      betaInterestFutureAlerts: true,
      betaAlertsNote: "Notes",
    });

    clearInboxScanSettings();

    expect(localStorage.getItem(INBOX_SCAN_SETTINGS_STORAGE_KEY)).toBeNull();
    const loaded = loadInboxScanSettings();
    expect(loaded.betaInterestFutureAlerts).toBe(false);
    expect(loaded.betaAlertsNote).toBe("");
  });

  it("removes beta interest data when all local data is cleared", () => {
    saveInboxScanSettings({
      ...defaultInboxScanSettings,
      betaInterestFutureAlerts: true,
      betaAlertsNote: "Notes",
    });

    clearAllAdminAvengerLocalData();

    expect(localStorage.getItem(INBOX_SCAN_SETTINGS_STORAGE_KEY)).toBeNull();
    expect(ADMIN_AVENGER_LOCAL_STORAGE_KEYS).toContain(INBOX_SCAN_SETTINGS_STORAGE_KEY);
  });

  it("includes beta preferences in the local backup but stores no phone, email, or token fields", () => {
    saveInboxScanSettings({
      ...defaultInboxScanSettings,
      betaInterestFutureAlerts: true,
      betaAlertsNote: "Price rises",
    });

    const backup = createAdminAvengerBackup();
    const storedSettings = backup.localStorage[INBOX_SCAN_SETTINGS_STORAGE_KEY] as InboxScanSettings;

    expect(storedSettings.betaInterestFutureAlerts).toBe(true);
    expect(storedSettings.betaAlertsNote).toBe("Price rises");

    const forbiddenKeys = [
      "phone",
      "phoneNumber",
      "email",
      "emailAddress",
      "token",
      "accessToken",
      "oauth",
      "password",
    ];
    for (const key of Object.keys(storedSettings)) {
      expect(forbiddenKeys).not.toContain(key);
    }
  });
});
