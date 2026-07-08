import { describe, expect, it } from "vitest";
import appSource from "../../App.tsx?raw";
import settingsSource from "../SettingsView.tsx?raw";

describe("covenant navigation", () => {
  it("wires the Covenant view into the app", () => {
    expect(appSource).toContain("CovenantView");
    expect(appSource).toContain('currentView === "covenant"');
  });

  it("links to the Covenant from Settings", () => {
    expect(settingsSource).toContain("Read the Free-Forever Covenant");
    expect(settingsSource).toContain('onNavigate("covenant")');
  });
});
