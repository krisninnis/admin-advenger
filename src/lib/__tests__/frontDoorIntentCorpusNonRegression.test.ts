import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import { publicMessageCorpusV1 } from "../publicMessageEvaluation/corpusV1";

// Approved decision 15: all 159 existing public-message scenarios are a release
// gate for this work. Approved decision 5: document-shaped input preserves exact
// e40285b behaviour.
//
// This suite asserts the classifier only. It deliberately does not import the
// existing evaluator, does not recompose any result, and cannot alter document
// analysis. Its single job is to prove that intent routing never captures a
// document.

describe("existing public-message corpus stays document-shaped", () => {
  it("holds the expected 159 records", () => {
    expect(publicMessageCorpusV1).toHaveLength(159);
  });

  it.each(publicMessageCorpusV1.map((scenario) => ({ scenario })))(
    "classifies $scenario.id as document_or_message",
    ({ scenario }) => {
      const result = classifyFrontDoorIntent(scenario.message);
      expect(result.inputShape, scenario.id).toBe("document_or_message");
      expect(result.documentAnalysisSelected, scenario.id).toBe(true);
    },
  );

  it("records no situation signal for any existing document scenario", () => {
    for (const scenario of publicMessageCorpusV1) {
      const result = classifyFrontDoorIntent(scenario.message);
      expect(result.signals, scenario.id).toEqual([]);
    }
  });

  it("records no urgency signal for any existing document scenario", () => {
    for (const scenario of publicMessageCorpusV1) {
      expect(classifyFrontDoorIntent(scenario.message).urgency, scenario.id).toBe(
        "none_detected",
      );
    }
  });

  it("never confirms a target, opens a specialist route, or creates a case", () => {
    for (const scenario of publicMessageCorpusV1) {
      const result = classifyFrontDoorIntent(scenario.message);
      expect(result.targetConfirmed, scenario.id).toBe(false);
      expect(result.specialistRouteOpened, scenario.id).toBe(false);
      expect(result.caseCreated, scenario.id).toBe(false);
      expect(result.helpTarget, scenario.id).toBe("unknown");
    }
  });

  it("leaves the security-shaped records as documents", () => {
    const securityIds = publicMessageCorpusV1
      .filter((scenario) => scenario.category === "security_scams")
      .map((scenario) => scenario.id);

    expect(securityIds.length).toBeGreaterThan(0);
    for (const id of securityIds) {
      const scenario = publicMessageCorpusV1.find((entry) => entry.id === id);
      const result = classifyFrontDoorIntent(scenario!.message);
      expect(result.inputShape, id).toBe("document_or_message");
      expect(result.signals, id).toEqual([]);
    }
  });

  it("leaves the bereavement-category records as documents", () => {
    const bereavementIds = publicMessageCorpusV1
      .filter((scenario) => scenario.category === "bereavement_general")
      .map((scenario) => scenario.id);

    expect(bereavementIds.length).toBeGreaterThan(0);
    for (const id of bereavementIds) {
      const scenario = publicMessageCorpusV1.find((entry) => entry.id === id);
      const result = classifyFrontDoorIntent(scenario!.message);
      expect(result.inputShape, id).toBe("document_or_message");
      expect(result.signals, id).not.toContain("possible_bereavement");
    }
  });

  it("does not mutate any existing corpus record", () => {
    const before = JSON.stringify(publicMessageCorpusV1);
    for (const scenario of publicMessageCorpusV1) {
      classifyFrontDoorIntent(scenario.message);
    }
    expect(JSON.stringify(publicMessageCorpusV1)).toBe(before);
  });
});
