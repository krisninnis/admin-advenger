import { describe, expect, it } from "vitest";
import demoTourViewSource from "../DemoTourView.tsx?raw";
import { demoScenarios } from "../../lib/demoScenarios";
import { goldenLetterFixtures } from "../../lib/goldenLetters";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

describe("DemoTourView", () => {
  it("explains the synthetic demo journey", () => {
    expect(demoTourViewSource).toContain("Demo / tour");
    expect(demoTourViewSource).toContain(
      "Try AdminAvenger safely with synthetic examples.",
    );
    expect(demoTourViewSource).toContain("Choose a synthetic demo letter.");
    expect(demoTourViewSource).toContain("Run the normal check.");
    expect(demoTourViewSource).toContain("Review the result case sheet.");
    expect(demoTourViewSource).toContain("Download an adviser pack if useful.");
    expect(demoTourViewSource).toContain("Clear local data from Settings if needed.");
  });

  it("renders result-sheet and adviser export wiring for demo results", () => {
    expect(demoTourViewSource).toContain("<ResultCaseSheet");
    expect(demoTourViewSource).toContain("buildResultViewModel");
    expect(demoTourViewSource).toContain("buildAdviserExportPack");
    expect(demoTourViewSource).toContain("downloadAdviserExportMarkdown");
  });

  it("keeps curated scenarios available from Golden Letter Corpus fixtures", () => {
    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    expect(demoScenarios.length).toBeGreaterThanOrEqual(8);
    for (const scenario of demoScenarios) {
      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
      expect(scenario.synthetic).toBe(true);
    }
  });

  it("does not introduce forbidden safety wording in visible tour copy", () => {
    const visibleTourCopy = [
      "Demo / tour",
      "Try AdminAvenger safely with synthetic examples.",
      "Use this tour to see how AdminAvenger works without using a real letter.",
      "All examples here are synthetic and come from the Golden Letter Corpus.",
      "Preparation only. Nothing is sent. Nothing is submitted. AdminAvenger helps prepare. You stay in control.",
      "Check dates and money against the original letter.",
      "This result was created from a synthetic example, not a real document.",
      ...demoScenarios.flatMap((scenario) => [
        scenario.title,
        scenario.category,
        scenario.description,
      ]),
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleTourCopy)).toEqual([]);
  });
});
