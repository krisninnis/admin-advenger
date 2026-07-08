import { describe, expect, it } from "vitest";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import type { DecisionDocumentType, DecisionResult } from "../decisionEngine/types";
import {
  RESULT_FORBIDDEN_PHRASES,
  buildResultViewModel,
  flattenResultViewModelText,
  normaliseResultText,
  validateResultViewModelSafety,
} from "../resultViewModel";
import { buildStrategicNextStepPlan } from "../strategicNextStep";

const makeDecision = (
  documentType: DecisionDocumentType,
  overrides: Partial<DecisionResult> = {},
): DecisionResult => ({
  documentType,
  title: "Benefits letter check",
  plainEnglishSummary: "This appears to be a benefits-related letter that needs checking.",
  caseStrength: "not_enough_information",
  strengthLabel: "Check the letter and evidence",
  whatThisLooksLike: "This appears to be about a benefits process.",
  possibleGrounds: ["The letter mentions a step that may need checking."],
  confidence: {
    level: "medium",
    reason: "The wording matches a benefits letter, but the original letter still needs checking.",
  },
  uncertainty: ["The exact stage may depend on wording elsewhere in the letter."],
  cannotKnow: ["Whether the organisation has all evidence it needs."],
  evidenceNeeded: ["Full letter", "Any supporting evidence mentioned in the letter"],
  deadlines: ["Respond by 12 August 2026 if the letter says this applies."],
  risks: ["Missing a date could make the next step harder."],
  nextSteps: ["Check the date and gather the evidence named in the letter."],
  safetyNotes: ["AdminAvenger helps organise the letter. You decide what happens next."],
  amountMentioned: undefined,
  amountTreatment: "no_money_counted",
  sourceFacts: [
    {
      label: "Letter date",
      value: "12 July 2026",
      sourceQuote: "12 July 2026",
    },
  ],
  questionsToAnswer: ["What date is printed on the letter?"],
  ...overrides,
});

const buildModelForDecision = (decisionResult: DecisionResult) => {
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult,
    benefitsActionPack,
  });

  return buildResultViewModel({
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
};

const expectUniqueText = (items: string[]) => {
  const keys = items.map(normaliseResultText);

  expect(new Set(keys).size).toBe(keys.length);
};

describe("ResultViewModel", () => {
  it("builds a conservative view model for a UC sanction result", () => {
    const decision = analyseDecisionProblem(`Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask us to look at this decision again.`);
    const model = buildModelForDecision(decision);

    expect(decision.documentType).toBe("benefits_uc_sanction");
    expect(model.title).toBe("Universal Credit sanction check");
    expect(model.keyDates.some((date) => date.value.includes("10 July 2026"))).toBe(true);
    expect(model.bestNextMove?.label.toLowerCase()).toContain("decision date");
    expect(model.cannotKnow.length).toBeGreaterThan(0);
    expect(model.uncertainty.length).toBeGreaterThan(0);
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("builds a UC statement model with display-only money lines", () => {
    const decision = analyseDecisionProblem(`Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Standard allowance: GBP 393.45
Housing: GBP 500.00
Advance repayment: GBP 50.00
Your payment this month: GBP 843.45`);
    const model = buildModelForDecision(decision);

    expect(decision.documentType).toBe("benefits_uc_statement");
    expect(model.showBenefitsActionPack).toBe(true);
    expect(model.moneyMentioned.length).toBeGreaterThan(0);
    expect(model.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(model.moneyMentioned.every((line) => normaliseResultText(line.caution).includes("not counted"))).toBe(true);
    expect(validateResultViewModelSafety(model).moneyDisplayOnly).toBe(true);
  });

  it("builds a PIP decision model with the decision date and safe next move", () => {
    const decision = analyseDecisionProblem(`Personal Independence Payment decision
We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.`);
    const model = buildModelForDecision(decision);
    const flattened = flattenResultViewModelText(model).toLowerCase();

    expect(decision.documentType).toBe("benefits_decision");
    expect(model.keyDates.some((date) => date.value.includes("4 July 2026"))).toBe(true);
    expect(model.bestNextMove?.label.toLowerCase()).toContain("decision date");
    expect(flattened).toContain("activities");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("includes Best next move data when a strategic plan is present", () => {
    const decision = makeDecision("benefits_uc_sanction");
    const model = buildModelForDecision(decision);

    expect(model.showStrategicNextStep).toBe(true);
    expect(model.bestNextMove).toBeDefined();
    expect(model.sections.map((section) => section.id)).toContain("best-next-move");
    expect(model.primaryAction?.source).toBe("best_next_move");
  });

  it("includes Benefits Action Pack dates, money, evidence, and questions when present", () => {
    const decision = makeDecision("benefits_uc_statement", {
      amountMentioned: "GBP 813.45",
      amountTreatment: "amount_mentioned_only",
      sourceFacts: [
        { label: "Payment date", value: "7 July 2026" },
        { label: "Payment this month", value: "GBP 813.45" },
        { label: "Deduction", value: "Advance repayment" },
      ],
      questionsToAnswer: ["Which deduction has changed?"],
    });
    const model = buildModelForDecision(decision);

    expect(model.keyDates.some((date) => date.value === "7 July 2026")).toBe(true);
    expect(model.moneyMentioned.some((line) => line.amountText === "GBP 813.45")).toBe(true);
    expect(model.evidenceFound.some((item) => item.value === "Advance repayment")).toBe(true);
    expect(model.questionsToAnswer).toContain("Which deduction has changed?");
  });

  it("dedupes repeated evidence, questions, risks, cannotKnow, and uncertainty", () => {
    const decision = makeDecision("benefits_uc_sanction", {
      evidenceNeeded: ["Full letter", " full   letter ", "Decision date"],
      questionsToAnswer: ["What date is printed?", " what   date is printed? "],
      risks: ["Missing a date could make the next step harder.", " missing a date could make the next step harder. "],
      cannotKnow: ["Whether the organisation has all evidence it needs.", "whether the organisation has all evidence it needs."],
      uncertainty: ["The exact stage may depend on the full letter.", " the exact stage may depend on the full letter. "],
    });
    const model = buildModelForDecision(decision);

    expectUniqueText(model.evidenceToGather.map((item) => item.value));
    expectUniqueText(model.questionsToAnswer);
    expectUniqueText(model.risks);
    expectUniqueText(model.cannotKnow);
    expectUniqueText(model.uncertainty);
  });

  it("keeps cannotKnow and uncertainty present after dedupe", () => {
    const model = buildModelForDecision(
      makeDecision("benefits_migration_notice", {
        cannotKnow: ["Whether this is the latest letter sent to you.", "Whether this is the latest letter sent to you."],
        uncertainty: ["The exact migration date needs checking.", "The exact migration date needs checking."],
      }),
    );

    expect(model.cannotKnow).toContain("Whether this is the latest letter sent to you.");
    expect(model.uncertainty).toContain("The exact migration date needs checking.");
    expect(validateResultViewModelSafety(model).cannotKnowPresent).toBe(true);
    expect(validateResultViewModelSafety(model).uncertaintyPresent).toBe(true);
  });

  it("marks every date as user-check-required", () => {
    const model = buildModelForDecision(makeDecision("benefits_uc_statement"));

    expect(model.keyDates.length).toBeGreaterThan(0);
    expect(model.keyDates.every((date) => date.userMustCheck === true)).toBe(true);
    expect(model.keyDates.every((date) => normaliseResultText(date.caution).includes("check"))).toBe(true);
    expect(validateResultViewModelSafety(model).datesUserCheckRequired).toBe(true);
  });

  it("does not include forbidden or adversarial wording", () => {
    const model = buildModelForDecision(makeDecision("benefits_uc_deductions"));
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const safety = validateResultViewModelSafety(model);

    for (const phrase of RESULT_FORBIDDEN_PHRASES) {
      expect(flattened).not.toContain(phrase);
    }

    expect(safety.hasForbiddenWording).toBe(false);
    expect(safety.hasAdversarialLanguage).toBe(false);
  });

  it("does not use game framing or unsafe DWP outcome claims", () => {
    const model = buildModelForDecision(makeDecision("benefits_decision"));
    const flattened = flattenResultViewModelText(model).toLowerCase();

    expect(flattened).not.toContain("game theory");
    expect(flattened).not.toContain("dwp is wrong");
    expect(flattened).not.toContain("you will win");
    expect(flattened).not.toContain("you qualify");
  });

  it("preserves the no-contact safety note", () => {
    const model = buildModelForDecision(makeDecision("benefits_crisis_support"));
    const safety = validateResultViewModelSafety(model);

    expect(model.safetyNotes.some((note) => note.includes("does not contact anyone"))).toBe(true);
    expect(safety.noContactSafetyNotePresent).toBe(true);
  });

  it("still produces a useful conservative fallback for unknown admin documents", () => {
    const decision = makeDecision("unknown_admin_dispute", {
      title: "",
      plainEnglishSummary: "",
      uncertainty: [],
      cannotKnow: [],
      sourceFacts: [],
      deadlines: [],
      evidenceNeeded: [],
      questionsToAnswer: [],
      risks: [],
    });
    const model = buildResultViewModel({ decisionResult: decision });

    expect(model.title).toBe("Admin document check");
    expect(model.summary).toContain("careful check");
    expect(model.cannotKnow).toContain(
      "AdminAvenger cannot verify anything outside the text, image, or file you provided.",
    );
    expect(model.uncertainty).toContain(
      "Some details may be missing, unclear, or need checking against the original document.",
    );
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });
});
