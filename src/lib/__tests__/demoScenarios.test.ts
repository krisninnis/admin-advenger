import { describe, expect, it } from "vitest";
import { demoScenarios, workplaceDemoScenarios } from "../demoScenarios";
import { goldenLetterFixtures, runGoldenLetterFixture } from "../goldenLetters";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";

const forbiddenWorkplacePhrases = [
  "employer broke the law",
  "you will win",
  "unfair dismissal proven",
  "discrimination proven",
  "valid claim",
  "invalid claim",
  "case strength",
  "success chance",
  "win chance",
  "tribunal prediction",
  "compensation owed",
  "you are owed",
  "money saved",
  "money recovered",
  "resign now",
  "refuse the meeting",
  "sign the agreement",
  "do not sign the agreement",
];

describe("pilot demo scenarios", () => {
  it("uses curated synthetic fixtures from the Golden Letter Corpus", () => {
    expect(demoScenarios.length).toBeGreaterThanOrEqual(8);

    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    for (const scenario of demoScenarios) {
      const fixture = goldenLetterFixtures.find((item) => item.id === scenario.fixtureId);

      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
      expect(scenario.inputText).toBe(fixture?.inputText);
      expect(scenario.synthetic).toBe(true);
      expect(["standard", "workplace"]).toContain(scenario.demoKind);
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

  it("includes workplace demo scenarios for the demo tour only", () => {
    expect(workplaceDemoScenarios.length).toBeGreaterThanOrEqual(6);
    expect(workplaceDemoScenarios.map((scenario) => scenario.title)).toEqual(
      expect.arrayContaining([
        "Workplace: disciplinary meeting invite",
        "Workplace: pay or wage confusion",
        "Workplace: sickness or capability meeting",
        "Workplace: redundancy consultation",
        "Workplace: settlement agreement warning",
        "Workplace: unclear workplace message",
      ]),
    );
    expect(workplaceDemoScenarios.every((scenario) => scenario.demoKind === "workplace")).toBe(true);
    expect(workplaceDemoScenarios.every((scenario) => scenario.synthetic)).toBe(true);
  });

  it("keeps workplace demo scenario labels preparation-oriented and safe", () => {
    const visibleText = workplaceDemoScenarios
      .flatMap((scenario) => [scenario.title, scenario.category, scenario.description])
      .join("\n");
    const normalised = normaliseSafetyText(visibleText);

    expect(findForbiddenSafetyPhrases(visibleText)).toEqual([]);
    expect(normalised).toContain("workplace");
    expect(normalised).toContain("preparation");

    for (const phrase of forbiddenWorkplacePhrases) {
      expect(normalised).not.toContain(normaliseSafetyText(phrase));
    }
  });

  it("uses only synthetic workplace fixture text without real-address-looking data", () => {
    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    for (const scenario of workplaceDemoScenarios) {
      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
      expect(scenario.inputText).toContain("Example");
      expect(scenario.inputText).not.toMatch(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/);
      expect(scenario.inputText).not.toMatch(/\b(?:0|\+44)\d{9,10}\b/);
      expect(scenario.inputText).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      expect(scenario.inputText).not.toMatch(/\b\d{1,4}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\s+(Street|Road|Avenue|Lane|Terrace|Close|Drive)\b/);
    }
  });

  it("includes the settlement agreement workplace demo", () => {
    const settlementDemo = workplaceDemoScenarios.find(
      (scenario) => scenario.id === "demo-workplace-settlement",
    );

    expect(settlementDemo).toBeDefined();
    expect(settlementDemo?.fixtureId).toBe("workplace-settlement-agreement-001");
    expect(settlementDemo?.description.toLowerCase()).toContain("human-review");
  });
});
