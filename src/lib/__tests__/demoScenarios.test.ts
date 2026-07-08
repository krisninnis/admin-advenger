import { describe, expect, it } from "vitest";
import { demoScenarios } from "../demoScenarios";
import { goldenLetterFixtures, runGoldenLetterFixture } from "../goldenLetters";
import { findForbiddenSafetyPhrases } from "../safetyWording";

describe("pilot demo scenarios", () => {
  it("uses curated synthetic fixtures from the Golden Letter Corpus", () => {
    expect(demoScenarios.length).toBeGreaterThanOrEqual(8);

    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    for (const scenario of demoScenarios) {
      const fixture = goldenLetterFixtures.find((item) => item.id === scenario.fixtureId);

      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
      expect(scenario.inputText).toBe(fixture?.inputText);
      expect(scenario.synthetic).toBe(true);
    }
  });

  it("has unique safe labels and no duplicate demo ids", () => {
    const ids = demoScenarios.map((scenario) => scenario.id);
    const visibleText = demoScenarios
      .flatMap((scenario) => [scenario.title, scenario.category, scenario.description])
      .join("\n");

    expect(new Set(ids).size).toBe(ids.length);
    expect(findForbiddenSafetyPhrases(visibleText)).toEqual([]);
    expect(visibleText.toLowerCase()).not.toContain("real user data upload");
  });

  it("keeps suspicious and unclear demo fixtures conservative", () => {
    const conservativeDemoIds = ["demo-suspicious-message", "demo-unclear-letter"];

    for (const demoId of conservativeDemoIds) {
      const scenario = demoScenarios.find((item) => item.id === demoId);

      if (!scenario) {
        throw new Error(`Missing demo scenario ${demoId}`);
      }

      const fixture = goldenLetterFixtures.find((item) => item.id === scenario.fixtureId);

      if (!fixture) {
        throw new Error(`Missing golden fixture ${scenario.fixtureId}`);
      }

      const run = runGoldenLetterFixture(fixture);

      expect(run.decisionResult.documentType).toBe("unknown_admin_dispute");
      expect(findForbiddenSafetyPhrases(run.outputText)).toEqual([]);
      expect(run.resultViewModel.cannotKnow.length).toBeGreaterThan(0);
    }
  });
});
