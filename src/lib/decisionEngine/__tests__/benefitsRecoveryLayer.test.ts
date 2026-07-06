import { describe, expect, it } from "vitest";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine";
import { FORBIDDEN_DECISION_PHRASES } from "../types";

const containsForbiddenPhrase = (text: string) => {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_DECISION_PHRASES.some((phrase) => lowerText.includes(phrase));
};

const neverCountsAsMoney = (flattened: string) => {
  const lower = flattened.toLowerCase();
  // Targets phrasing that would wrongly present an amount as money that has
  // been saved/recovered FOR the user (a money-safety violation). Does not
  // flag factual, third-person descriptions of DWP recovering an overpayment
  // FROM the user (e.g. "unpaid amounts usually continue to be recovered
  // from future payments"), which is safe, accurate process explanation.
  expect(lower).not.toContain("confirmed saved");
  expect(lower).not.toContain("confirmed recovered");
  expect(lower).not.toContain("pending recovery");
  expect(lower).not.toMatch(/you('ve| have)? (saved|recovered) £/);
  expect(lower).not.toMatch(/£[\d,.]+ (has been |was )?(saved|recovered)\b/);
  expect(lower).not.toMatch(/your (savings|recovered amount)/);
};

describe("Benefits Recovery Layer - new engines", () => {
  describe("Migration Notice engine", () => {
    const fullText =
      "Migration Notice. You must claim Universal Credit by 15 August 2026. Your Working Tax Credit will end when you claim Universal Credit.";
    const partialText = "Migration Notice about Universal Credit.";

    it("classifies a full Migration Notice, extracts the deadline day and legacy benefit, and is urgent", () => {
      const result = analyseDecisionProblem(fullText);

      expect(result.documentType).toBe("benefits_migration_notice");
      expect(result.caseStrength).toBe("urgent_get_advice");
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Deadline day mentioned", value: "15 August 2026" }),
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Existing benefit mentioned" }),
      );
      expect(result.confidence.level).toBe("high");
      expect(result.deadlines.join(" ")).toMatch(/15 August 2026|deadline day/i);
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
      neverCountsAsMoney(flattenDecisionResultText(result));
    });

    it("never claims to know whether Universal Credit will pay more or less", () => {
      const result = analyseDecisionProblem(fullText);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(flattened).toMatch(/cannot tell you whether you will be better or worse off/);
      expect(result.cannotKnow.length).toBeGreaterThan(0);
    });

    it("gracefully degrades for a partial Migration Notice with no deadline day or named benefit", () => {
      const result = analyseDecisionProblem(partialText);

      expect(result.documentType).toBe("benefits_migration_notice");
      expect(result.confidence.level).toBe("low");
      expect(result.uncertainty).toContain(
        "The exact deadline day for claiming Universal Credit is not clear from this text alone.",
      );
      expect(result.uncertainty).toContain(
        "Which of your existing benefits will end is not named clearly in this text.",
      );
      expect(result.cannotKnow.length).toBeGreaterThan(0);
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    });
  });

  describe("Change of circumstances engine", () => {
    const text = "Change of circumstances: I started work on 3 June 2026. My income has changed.";

    it("classifies a change-of-circumstances message and explains the reporting duty", () => {
      const result = analyseDecisionProblem(text);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("benefits_change_of_circumstances");
      expect(flattened).toMatch(/report the change|reporting duty|as soon as possible/);
      expect(result.risks.join(" ").toLowerCase()).toContain("overpayment");
      expect(containsForbiddenPhrase(flattened)).toBe(false);
      neverCountsAsMoney(flattened);
    });

    it("never promises backdating will succeed", () => {
      const result = analyseDecisionProblem(
        "Change of circumstances - can I backdate this change of address?",
      );
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(flattened).not.toMatch(/backdating is guaranteed|will definitely (be )?backdat/);
      expect(result.uncertainty.some((entry) => entry.toLowerCase().includes("backdat"))).toBe(true);
    });

    it("gracefully degrades when no specific change type is named", () => {
      const result = analyseDecisionProblem("Change of circumstances form received.");

      expect(result.documentType).toBe("benefits_change_of_circumstances");
      expect(result.confidence.level).toBe("low");
      expect(result.uncertainty.length).toBeGreaterThan(0);
      expect(result.cannotKnow.length).toBeGreaterThan(0);
    });
  });

  describe("Council Tax Reduction engine", () => {
    const refusedText =
      "Council Tax Reduction decision: your application has been refused. You can ask us to reconsider or appeal to the Valuation Tribunal.";
    const awardedText =
      "Council Tax Reduction: your reduction has been awarded of £15.50 per week under our Council Tax Support scheme.";

    it("classifies council tax reduction separately from council tax arrears/debt", () => {
      const result = analyseDecisionProblem(refusedText);

      expect(result.documentType).toBe("council_tax_reduction");
      expect(result.documentType).not.toBe("debt_collection");
      expect(result.caseStrength).toBe("possible_ground");
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    });

    it("never states an exact reduction figure as confirmed and flags the local-scheme cannotKnow", () => {
      const result = analyseDecisionProblem(awardedText);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("council_tax_reduction");
      expect(result.amountTreatment).toBe("possible_refund_or_reduction");
      expect(result.amountMentioned).toBe("£15.50");
      expect(flattened).toMatch(/local council's scheme|local scheme/);
      neverCountsAsMoney(flattened);
      expect(containsForbiddenPhrase(flattened)).toBe(false);
    });

    it("gracefully degrades when only the scheme name is mentioned", () => {
      const result = analyseDecisionProblem("I applied for Council Tax Reduction.");

      expect(result.documentType).toBe("council_tax_reduction");
      expect(result.confidence.level).toBe("low");
      expect(result.cannotKnow.length).toBeGreaterThan(0);
    });
  });

  describe("Crisis help / local welfare signposting engine", () => {
    const urgentText = "I have no food and no heating, and I might be evicted this week.";
    const infoText = "Can I get a Discretionary Housing Payment or apply for a budgeting advance?";

    it("treats an urgent crisis message as urgent and tells the user to get help today", () => {
      const result = analyseDecisionProblem(urgentText);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("benefits_crisis_support");
      expect(result.caseStrength).toBe("urgent_get_advice");
      expect(flattened).toMatch(/today|as soon as possible/);
      expect(containsForbiddenPhrase(flattened)).toBe(false);
    });

    it("signposts named schemes without inventing amounts or guaranteeing eligibility", () => {
      const result = analyseDecisionProblem(infoText);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("benefits_crisis_support");
      expect(result.sourceFacts.some((fact) => fact.value.includes("Discretionary Housing Payment"))).toBe(true);
      expect(result.sourceFacts.some((fact) => fact.value.includes("Budgeting advance"))).toBe(true);
      expect(result.amountTreatment).toBe("no_money_counted");
      expect(flattened).not.toMatch(/you will (get|receive)/);
      expect(containsForbiddenPhrase(flattened)).toBe(false);
      neverCountsAsMoney(flattened);
    });

    it("leaves possibleGrounds empty since crisis signposting has no grounds/case-strength concept", () => {
      const result = analyseDecisionProblem(infoText);

      expect(result.possibleGrounds).toEqual([]);
    });

    it("gracefully degrades for a bare mention of a foodbank with no other context", () => {
      const result = analyseDecisionProblem("I was told to visit a foodbank.");

      expect(result.documentType).toBe("benefits_crisis_support");
      expect(result.caseStrength).toBe("not_enough_information");
      expect(result.cannotKnow.length).toBeGreaterThan(0);
    });
  });

  describe("WCA/LCWRA evidence engine", () => {
    it("classifies an evidence-prep stage message (UC50/questionnaire)", () => {
      const result = analyseDecisionProblem(
        "I need to complete the UC50 capability for work questionnaire.",
      );

      expect(result.documentType).toBe("benefits_wca_lcwra");
      expect(result.title).toContain("evidence check");
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    });

    it("classifies an assessment report stage message (ESA85)", () => {
      const result = analyseDecisionProblem(
        "This is my ESA85 assessment report from the health professional.",
      );

      expect(result.documentType).toBe("benefits_wca_lcwra");
      expect(result.title).toContain("report check");
    });

    it("classifies a decision stage message and treats it as urgent with a Mandatory Reconsideration deadline", () => {
      const result = analyseDecisionProblem(
        "We have decided you do not have limited capability for work. Decision date 1 July 2026.",
      );
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("benefits_wca_lcwra");
      expect(result.caseStrength).toBe("urgent_get_advice");
      expect(flattened).toContain("mandatory reconsideration");
      expect(containsForbiddenPhrase(flattened)).toBe(false);
    });

    it("classifies an appeal stage message", () => {
      const result = analyseDecisionProblem(
        "I want to appeal my Work Capability Assessment decision. Tribunal hearing scheduled. Form SSCS1 attached.",
      );

      expect(result.documentType).toBe("benefits_wca_lcwra");
      expect(result.title).toContain("appeal check");
    });

    it("maps named descriptors/activities without scoring or predicting an outcome", () => {
      const result = analyseDecisionProblem(
        "My Work Capability Assessment - I struggle with mobilising and manual dexterity due to my condition.",
      );

      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Activity/descriptor mentioned", value: "mobilising" }),
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Activity/descriptor mentioned", value: "manual dexterity" }),
      );
      expect(result.confidence.level).toBe("high");
      expect(result.uncertainty).toEqual([]);
    });

    it("never invents points, a guaranteed award, or asserts DWP is wrong across every stage", () => {
      const stageTexts = [
        "I need to complete the UC50 capability for work questionnaire.",
        "This is my ESA85 assessment report from the health professional.",
        "We have decided you do not have limited capability for work. Decision date 1 July 2026.",
        "I want to appeal my Work Capability Assessment decision. Tribunal hearing scheduled.",
      ];

      for (const text of stageTexts) {
        const result = analyseDecisionProblem(text);
        const flattened = flattenDecisionResultText(result).toLowerCase();

        expect(containsForbiddenPhrase(flattened)).toBe(false);
        expect(flattened).not.toMatch(/you (will|are going to) (win|qualify|be awarded)/);
        expect(flattened).not.toMatch(/dwp is (definitely )?wrong/);
        expect(["low", "medium", "high"]).toContain(result.confidence.level);
        expect(Array.isArray(result.uncertainty)).toBe(true);
        expect(Array.isArray(result.cannotKnow)).toBe(true);
      }
    });
  });

  describe("Universal Credit deductions/overpayment engine", () => {
    const fullText =
      "Overpayment decision: You have an overpayment of £320.00. This overpayment arose because you did not report a change in earnings. We will be deducting £25 per month from your Universal Credit.";
    const disputeText =
      "Overpayment decision for £150. I disagree with this overpayment decision. I do not think I owe this amount.";

    it("classifies a standalone overpayment/deduction notice, separate from a full UC statement", () => {
      const result = analyseDecisionProblem(fullText);

      expect(result.documentType).toBe("benefits_uc_deductions");
      expect(result.documentType).not.toBe("benefits_uc_statement");
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Overpayment amount mentioned", value: "£320.00" }),
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Deduction rate mentioned" }),
      );
      expect(result.confidence.level).toBe("high");
    });

    it("never treats an overpayment as a saving, and flags a user-stated dispute as a possible ground", () => {
      const result = analyseDecisionProblem(disputeText);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(result.documentType).toBe("benefits_uc_deductions");
      expect(result.amountTreatment).toBe("amount_mentioned_only");
      expect(result.caseStrength).toBe("possible_ground");
      expect(result.possibleGrounds.some((ground) => ground.toLowerCase().includes("disagree"))).toBe(true);
      neverCountsAsMoney(flattened);
      expect(containsForbiddenPhrase(flattened)).toBe(false);
    });

    it("gracefully degrades when no amount or reason is given", () => {
      const result = analyseDecisionProblem("Overpayment decision letter received.");

      expect(result.documentType).toBe("benefits_uc_deductions");
      expect(result.confidence.level).toBe("low");
      expect(result.uncertainty.length).toBeGreaterThan(0);
      expect(result.cannotKnow.length).toBeGreaterThan(0);
    });
  });

  describe("Cross-cutting: forbidden wording, money safety, and required confidence fields", () => {
    const allNewEngineTexts = [
      "Migration Notice. You must claim Universal Credit by 15 August 2026.",
      "Change of circumstances: I started work on 3 June 2026.",
      "Council Tax Reduction decision: your application has been refused.",
      "I have no food and no heating, and I might be evicted this week.",
      "This is my ESA85 assessment report from the health professional.",
      "Overpayment decision: You have an overpayment of £320.00.",
    ];

    it("never uses forbidden wording, and always returns valid confidence/uncertainty/cannotKnow", () => {
      for (const text of allNewEngineTexts) {
        const result = analyseDecisionProblem(text);
        const flattened = flattenDecisionResultText(result);

        expect(containsForbiddenPhrase(flattened)).toBe(false);
        expect(["low", "medium", "high"]).toContain(result.confidence.level);
        expect(typeof result.confidence.reason).toBe("string");
        expect(result.confidence.reason.length).toBeGreaterThan(0);
        expect(Array.isArray(result.uncertainty)).toBe(true);
        expect(Array.isArray(result.cannotKnow)).toBe(true);
      }
    });

    it("never counts a Benefits Recovery Layer amount as saved, recovered, or a confirmed outcome", () => {
      for (const text of allNewEngineTexts) {
        const result = analyseDecisionProblem(text);
        neverCountsAsMoney(flattenDecisionResultText(result));
        expect(result.amountTreatment).not.toBe("amount_being_demanded");
      }
    });

    it("gracefully degrades on badly garbled/OCR-damaged text without throwing, falling back to unknown_admin_dispute", () => {
      const garbledTexts = [
        "asdkfj 29471 %%%$$ garbled nonsense",
        "Un1v3rs4l Cr3d1t st4t3m3nt !!! [illegible] ...",
        "",
        "   ",
      ];

      for (const text of garbledTexts) {
        expect(() => analyseDecisionProblem(text)).not.toThrow();

        const result = analyseDecisionProblem(text);
        expect(result.documentType).toBe("unknown_admin_dispute");
        expect(result.confidence.level).toBe("low");
        expect(result.cannotKnow.length).toBeGreaterThan(0);
        expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
      }
    });
  });
});
