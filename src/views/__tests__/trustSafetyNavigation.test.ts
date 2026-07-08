import { describe, expect, it } from "vitest";
import appSource from "../../App.tsx?raw";
import sidebarSource from "../../components/Sidebar.tsx?raw";
import settingsSource from "../SettingsView.tsx?raw";

describe("trust safety navigation", () => {
  it("wires the Trust Safety view into the app", () => {
    expect(appSource).toContain("TrustSafetyView");
    expect(appSource).toContain('currentView === "trust_safety"');
  });

  it("links to Trust & safety from the desktop sidebar", () => {
    expect(sidebarSource).toContain("Trust &amp; safety");
    expect(sidebarSource).toContain('onNavigate("trust_safety")');
  });

  it("links to Trust & safety from Settings", () => {
    expect(settingsSource).toContain("Open Trust &amp; safety");
    expect(settingsSource).toContain('onNavigate("trust_safety")');
  });
});
