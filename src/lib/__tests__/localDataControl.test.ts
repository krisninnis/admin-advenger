import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  KNOWN_LOCAL_DATA_ITEMS,
  clearAdminAvengerLocalData,
  getLocalDataSummary,
  hasAnyAdminAvengerLocalData,
} from "../localDataControl";
import { ADMIN_AVENGER_LOCAL_STORAGE_KEYS, ADMIN_AVENGER_STORAGE_KEY } from "../storage";

class FakeStorage implements Storage {
  private values = new Map<string, string>();
  throwOnRemove = false;

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
    if (this.throwOnRemove) {
      throw new DOMException("Storage is blocked", "SecurityError");
    }

    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const originalWindow = globalThis.window;
let localStorage: FakeStorage;
let sessionStorage: FakeStorage;

const installWindow = (value: unknown) => {
  Object.defineProperty(globalThis, "window", {
    value,
    configurable: true,
  });
};

beforeEach(() => {
  localStorage = new FakeStorage();
  sessionStorage = new FakeStorage();
  installWindow({ localStorage, sessionStorage });
});

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    installWindow(originalWindow);
  }
});

describe("local data control", () => {
  it("registry contains all known AdminAvenger storage keys", () => {
    const registryKeys = KNOWN_LOCAL_DATA_ITEMS.map((item) => item.key);

    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      expect(registryKeys).toContain(key);
    }

    expect(new Set(registryKeys).size).toBe(registryKeys.length);
  });

  it("summary handles empty storage", () => {
    const summary = getLocalDataSummary();

    expect(summary.hasAnyData).toBe(false);
    expect(summary.items).toHaveLength(KNOWN_LOCAL_DATA_ITEMS.length);
    expect(summary.items.every((item) => item.isPresent === false)).toBe(true);
  });

  it("summary detects present known keys and approximate size", () => {
    localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, JSON.stringify({ adminCases: [] }));

    const summary = getLocalDataSummary();
    const savedWorkspace = summary.items.find((item) => item.key === ADMIN_AVENGER_STORAGE_KEY);

    expect(summary.hasAnyData).toBe(true);
    expect(savedWorkspace?.isPresent).toBe(true);
    expect(savedWorkspace?.approximateSizeBytes).toBeGreaterThan(0);
  });

  it("clear only clears known AdminAvenger keys", () => {
    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      localStorage.setItem(key, JSON.stringify({ saved: true }));
    }
    localStorage.setItem("unrelated-app-key", "keep me");

    const result = clearAdminAvengerLocalData();

    for (const key of ADMIN_AVENGER_LOCAL_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("unrelated-app-key")).toBe("keep me");
    expect(result.clearedKeys).toEqual(expect.arrayContaining(ADMIN_AVENGER_LOCAL_STORAGE_KEYS));
  });

  it("clear reports cleared and missing keys", () => {
    localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, "{}");

    const result = clearAdminAvengerLocalData();

    expect(result.clearedKeys).toContain(ADMIN_AVENGER_STORAGE_KEY);
    expect(result.missingKeys.length).toBeGreaterThan(0);
    expect(result.failedKeys).toEqual([]);
  });

  it("clear reports failed keys without throwing", () => {
    localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, "{}");
    localStorage.throwOnRemove = true;

    const result = clearAdminAvengerLocalData();

    expect(result.failedKeys.length).toBeGreaterThan(0);
    expect(localStorage.getItem(ADMIN_AVENGER_STORAGE_KEY)).toBe("{}");
  });

  it("helpers do not throw if storage is unavailable", () => {
    installWindow({});

    expect(() => getLocalDataSummary()).not.toThrow();
    expect(() => clearAdminAvengerLocalData()).not.toThrow();
    expect(hasAnyAdminAvengerLocalData()).toBe(false);
  });

  it("hasAnyAdminAvengerLocalData reflects known saved data", () => {
    expect(hasAnyAdminAvengerLocalData()).toBe(false);

    localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, "{}");

    expect(hasAnyAdminAvengerLocalData()).toBe(true);
  });
});
