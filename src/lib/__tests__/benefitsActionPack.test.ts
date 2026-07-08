import { describe, expect, it } from "vitest";
import type { AdminCase } from "../../types";
import {
  BENEFITS_DATE_CAUTION,
  BENEFITS_MONEY_CAUTION,
  buildBenefitsActionPack,
} from "../benefitsActionPack";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import type {
  DecisionAmountTreatment,
  DecisionDocumentType,
  DecisionResult,
} from "../decisionEngine/types";
import { calculateImpactTotals, deriveImpactFromCase } from "../impactLedger";

const supportedBenefitsTypes = [
  "benefits_evidence_prep",
  "benefits_assessment_report",
  "benefits_decision",
  "benefits_appeal",
  "benefits_review",
  "benefits_uc_statement",
  "benefits_uc_sanction",
  "benefits_uc_deductions",
  "benefits_wca_lcwra",
  "benefits_migration_notice",
  "benefits_change_of_circumstances",
  "council_tax_reduction",
  "benefits_crisis_support",
] as const satisfies readonly DecisionDocumentType[];

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

const makeCase = (decisionResult: DecisionResult): AdminCase => ({
  id: "case-benefits-1",
  findingId: "finding-benefits-1",
  itemId: "item-benefits-1",
  title: decisionResult.title,
  category: "admin_dispute",
  summary: decisionResult.plainEnglishSummary,
  urgency: "medium",
  confidence: "medium",
  status: "new",
  nextAction: decisionResult.nextSteps[0] ?? "Check the letter.",
  createdAt: "2026-07-08T09:00:00.000Z",
  updatedAt: "2026-07-08T09:00:00.000Z",
  evidence: [],
  timeline: [],
  decisionResult,
});

const flattenPack = (pack: NonNullable<ReturnType<typeof buildBenefitsActionPack>>) =>
  [
    pack.title,
    pack.documentStage,
    pack.summary,
    ...pack.whatMatters,
    ...pack.possibleDatesToCheck.map((date) => `${date.label} ${date.value} ${date.caution}`),
    ...pack.moneyMentioned.map((line) => `${line.label} ${line.amountText} ${line.caution}`),
    ...pack.evidenceFound.map((item) => `${item.label} ${item.value}`),
    ...pack.evidenceMissing,
    ...pack.questionsToAnswer.map((question) => question.question),
    ...pack.uncertainty,
    ...pack.cannotKnow,
    pack.nextSafeStep,
    pack.draftOrChecklist ?? "",
  ].join(" \n ");

const unsafeBenefitClaims = [
  "you definitely qualify",
  "dwp is definitely wrong",
  "you will win",
  "you are entitled to",
  "this decision is unlawful",
  "you do not owe this",
  "confirmed deadline",
  "confirmed saving",
];

describe("Benefits Action Pack", () => {
  it("returns null for non-benefits decision results", () => {
    const result = makeDecision("parking_ticket", {
      title: "Parking notice check",
      documentType: "parking_ticket",
    });

    expect(buildBenefitsActionPack(result)).toBeNull();
  });

  it("supports every benefits document type without using case strength as the stage", () => {
    for (const documentType of supportedBenefitsTypes) {
      const pack = buildBenefitsActionPack(
        makeDecision(documentType, {
          caseStrength: "stronger_possible_ground",
          strengthLabel: "This label must not become the stage",
        }),
      );

      expect(pack).not.toBeNull();
      expect(pack?.documentStage).toContain("This appears to be");
      expect(pack?.documentStage).not.toContain("This label must not become the stage");
      expect(pack?.documentStage).not.toContain("stronger_possible_ground");
    }
  });

  it("keeps benefits money display-only and outside impact ledger totals", () => {
    const decision = makeDecision("benefits_uc_statement", {
      amountMentioned: "GBP 813.45",
      amountTreatment: "amount_mentioned_only" satisfies DecisionAmountTreatment,
      sourceFacts: [
        { label: "Payment this month", value: "GBP 813.45" },
        { label: "Advance repayment", value: "GBP 50.00" },
      ],
    });
    const adminCase = makeCase(decision);
    const pack = buildBenefitsActionPack(decision, undefined, adminCase);
    const impacts = deriveImpactFromCase(adminCase);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(pack?.moneyMentioned.length).toBeGreaterThan(0);
    expect(pack?.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(pack?.moneyMentioned.every((line) => line.caution === BENEFITS_MONEY_CAUTION)).toBe(true);
    expect(totals.confirmedSavedRecovered).toBe(0);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.potentialSaving).toBe(0);
  });

  it("marks every date as something the user must check", () => {
    const pack = buildBenefitsActionPack(makeDecision("benefits_uc_sanction"));

    expect(pack?.possibleDatesToCheck.length).toBeGreaterThan(0);
    expect(pack?.possibleDatesToCheck.every((date) => date.userMustCheck === true)).toBe(true);
    expect(pack?.possibleDatesToCheck.every((date) => date.caution === BENEFITS_DATE_CAUTION)).toBe(true);
  });

  it("preserves uncertainty and cannot-know boundaries", () => {
    const decision = makeDecision("benefits_migration_notice", {
      uncertainty: ["The exact deadline needs checking on the letter."],
      cannotKnow: ["Whether this is the latest letter sent to you."],
    });
    const pack = buildBenefitsActionPack(decision);

    expect(pack?.uncertainty).toContain("The exact deadline needs checking on the letter.");
    expect(pack?.cannotKnow).toContain("Whether this is the latest letter sent to you.");
  });

  it("uses cautious draft or checklist wording and avoids unsafe benefits claims", () => {
    const decision = makeDecision("benefits_decision", {
      draftMessage:
        "Hello,\n\nPlease can you explain the reasons for this decision and confirm what evidence you used?\n\nKind regards,",
    });
    const pack = buildBenefitsActionPack(decision);
    const flattened = flattenPack(pack ?? buildBenefitsActionPack(makeDecision("benefits_decision"))!);
    const lowerText = flattened.toLowerCase();

    expect(pack?.draftOrChecklist).toContain("Please can you explain");
    for (const phrase of unsafeBenefitClaims) {
      expect(lowerText).not.toContain(phrase);
    }
  });

  it("builds from real Universal Credit statement output without turning the payment into savings", () => {
    const decision = analyseDecisionProblem(`Universal Credit statement
Assessment period: 1 June to 30 June 2026
Standard allowance: GBP 393.45
Housing: GBP 500.00
Advance repayment: GBP 50.00
Your payment this month: GBP 843.45`);
    const pack = buildBenefitsActionPack(decision);

    expect(decision.documentType).toBe("benefits_uc_statement");
    expect(pack?.moneyMentioned.length).toBeGreaterThan(0);
    expect(flattenPack(pack!)).toContain("This is money mentioned in the letter");
    expect(flattenPack(pack!).toLowerCase()).not.toContain("confirmed saving");
  });
});
