import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import demoTourViewSource from "../DemoTourView.tsx?raw";
import appSource from "../../App.tsx?raw";
import sidebarSource from "../../components/Sidebar.tsx?raw";
import settingsSource from "../SettingsView.tsx?raw";
import { demoScenarios } from "../../lib/demoScenarios";
import { goldenLetterFixtures } from "../../lib/goldenLetters";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

describe("Pilot demo flow", () => {
  it("keeps the full demo selector out of the Home input area", () => {
    expect(homeViewSource).not.toContain("Try a safe demo letter");
    expect(homeViewSource).not.toContain("Use this demo");
    expect(homeViewSource).toContain("Paste text");
    expect(homeViewSource).toContain("Take or upload a photo");
  });

  it("adds a Demo / tour route and navigation", () => {
    expect(appSource).toContain('currentView === "demo_tour"');
    expect(sidebarSource).toContain("Demo / tour");
    expect(sidebarSource).toContain('"demo_tour"');
    expect(settingsSource).toContain("Open Demo / tour");
    expect(settingsSource).toContain('onNavigate("demo_tour")');
  });

  it("renders the dedicated Demo / tour page copy and result label", () => {
    expect(demoTourViewSource).toContain("Demo / tour");
    expect(demoTourViewSource).toContain(
      "Try AdminAvenger safely with synthetic examples.",
    );
    expect(demoTourViewSource).toContain(
      "All examples here are synthetic and come from the Golden Letter",
    );
    expect(demoTourViewSource).toContain("Choose a synthetic demo letter");
    expect(demoTourViewSource).toContain("Run demo check");
    expect(demoTourViewSource).toContain("Synthetic demo");
    expect(demoTourViewSource).toContain(
      "This result was created from a synthetic example, not a real document.",
    );
  });

  it("uses demo fixtures through the normal result flow on Demo / tour", () => {
    expect(demoTourViewSource).toContain("handleRunDemo");
    expect(demoTourViewSource).toContain("onCheck(");
    expect(demoTourViewSource).toContain("selectedScenario.inputText.trim()");
    expect(demoTourViewSource).toContain("<ResultCaseSheet");
    expect(demoTourViewSource).toContain("onDownloadAdviserPack");
    expect(appSource).toContain("handleDemoTourCheck");
    expect(appSource).toContain("setDemoTourResult");
  });

  it("keeps demo scenarios sourced from the Golden Letter Corpus", () => {
    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    expect(demoScenarios.map((scenario) => scenario.title)).toEqual(
      expect.arrayContaining([
        "Universal Credit statement",
        "Universal Credit sanction",
        "PIP decision",
        "UC deductions",
        "Parking/legal-looking letter",
        "Debt collection letter",
        "Consumer refund refusal",
        "Suspicious message",
        "Unclear letter",
      ]),
    );

    for (const scenario of demoScenarios) {
      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
    }
  });

  it("keeps visible demo copy inside safety boundaries", () => {
    const visibleDemoCopy = [
      "Demo / tour",
      "Try AdminAvenger safely with synthetic examples.",
      "Use a synthetic example to see how AdminAvenger works without using a real letter.",
      "This result was created from a synthetic example, not a real document.",
      ...demoScenarios.flatMap((scenario) => [
        scenario.title,
        scenario.category,
        scenario.description,
      ]),
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleDemoCopy)).toEqual([]);
    expect(visibleDemoCopy.toLowerCase()).not.toContain("real user data upload");
  });
});
