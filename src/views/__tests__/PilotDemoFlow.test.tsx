import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import { demoScenarios } from "../../lib/demoScenarios";
import { goldenLetterFixtures } from "../../lib/goldenLetters";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

describe("Pilot demo flow", () => {
  it("renders a safe demo selector near the Home input", () => {
    expect(homeViewSource).toContain("Try a safe demo letter");
    expect(homeViewSource).toContain(
      "Use a synthetic example to see how AdminAvenger works without using a real",
    );
    expect(homeViewSource).toContain("Use this demo");
    expect(homeViewSource).toContain("Synthetic example");
  });

  it("uses demo fixtures through the normal Home result flow", () => {
    expect(homeViewSource).toContain("handleUseDemoScenario");
    expect(homeViewSource).toContain("onCheck(");
    expect(homeViewSource).toContain("selectedDemoScenario.inputText.trim()");
    expect(homeViewSource).toContain("<ResultCaseSheet");
    expect(homeViewSource).toContain("onDownloadAdviserPack");
  });

  it("labels demo results clearly", () => {
    expect(homeViewSource).toContain("Synthetic demo");
    expect(homeViewSource).toContain(
      "This result was created from a synthetic example, not a real document.",
    );
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
      "Try a safe demo letter",
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
