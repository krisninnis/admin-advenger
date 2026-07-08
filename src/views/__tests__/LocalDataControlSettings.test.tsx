import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { defaultInboxScanSettings } from "../../lib/inboxScanStorage";
import {
  clearAdminAvengerLocalData,
  type ClearLocalDataResult,
} from "../../lib/localDataControl";
import { ADMIN_AVENGER_STORAGE_KEY } from "../../lib/storage";
import { SettingsView } from "../SettingsView";
import settingsSource from "../SettingsView.tsx?raw";

const emptyClearResult = (): ClearLocalDataResult => ({
  clearedKeys: [],
  missingKeys: [],
  failedKeys: [],
});

const renderSettings = () =>
  renderToStaticMarkup(
    <SettingsView
      onResetDemoData={() => undefined}
      onClearLocalData={emptyClearResult}
      onDownloadBackup={() => undefined}
      onNavigate={() => undefined}
      inboxScanSettings={defaultInboxScanSettings}
      onUpdateInboxScanSettings={() => undefined}
      onViewTermsAgain={() => undefined}
      onResetTermsAcceptance={() => undefined}
    />,
  );

describe("Local data control settings", () => {
  it("renders Local data control with local-only explanation", () => {
    const html = renderSettings();

    expect(html).toContain("Local data control");
    expect(html).toContain("AdminAvenger is designed to keep your work under your control.");
    expect(html).toContain("saved in this browser on this device");
  });

  it("shows the clear button and downloaded-file limitation", () => {
    const html = renderSettings();

    expect(html).toContain("Clear AdminAvenger data from this device");
    expect(html).toContain("It will not delete files you already downloaded, such as adviser packs.");
    expect(html).toContain("It will not contact anyone or cancel anything.");
  });

  it("requires a confirmation step before clearing", () => {
    expect(settingsSource).toContain("setConfirmingClear(true)");
    expect(settingsSource).toContain("Yes, clear local AdminAvenger data");
    expect(settingsSource).toContain("handleClear");
  });

  it("settings clear helper removes known keys and keeps unrelated localStorage", () => {
    const originalWindow = globalThis.window;
    const localStorage = new Map<string, string>();

    try {
      Object.defineProperty(globalThis, "window", {
        value: {
          localStorage: {
            getItem: (key: string) => localStorage.get(key) ?? null,
            removeItem: (key: string) => localStorage.delete(key),
            setItem: (key: string, value: string) => localStorage.set(key, value),
          },
        },
        configurable: true,
      });

      localStorage.set(ADMIN_AVENGER_STORAGE_KEY, "{}");
      localStorage.set("unrelated-app-key", "keep");

      const result = clearAdminAvengerLocalData();

      expect(result.clearedKeys).toContain(ADMIN_AVENGER_STORAGE_KEY);
      expect(localStorage.has(ADMIN_AVENGER_STORAGE_KEY)).toBe(false);
      expect(localStorage.get("unrelated-app-key")).toBe("keep");
    } finally {
      if (originalWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
        });
      }
    }
  });

  it("renders the success message copy used after clearing", () => {
    expect(settingsSource).toContain(
      "AdminAvenger local data was cleared from this browser.",
    );
  });
});
