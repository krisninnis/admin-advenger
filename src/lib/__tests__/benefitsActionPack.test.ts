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
    ...pack.risks,
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

  describe("UC statement date and money clean-up (manual test input)", () => {
    const ucStatementText = `Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Standard allowance: £393.45
Housing: £500.00
Deductions: £75.00
Total payment: £818.45`;

    it("splits the assessment period and payment date into separate date entries", () => {
      const decision = analyseDecisionProblem(ucStatementText);
      const pack = buildBenefitsActionPack(decision)!;

      const assessmentEntry = pack.possibleDatesToCheck.find((date) =>
        /assessment period/i.test(date.label),
      );
      const paymentDateEntry = pack.possibleDatesToCheck.find((date) =>
        /payment date/i.test(date.label),
      );

      expect(assessmentEntry?.value).toBe("1 June 2026 to 30 June 2026");
      // The payment date must not be swallowed into the assessment period value.
      expect(assessmentEntry?.value).not.toMatch(/payment date/i);
      expect(paymentDateEntry?.value).toBe("7 July 2026");
    });

    it("does not treat 'as soon as possible' urgency copy as a date", () => {
      const decision = analyseDecisionProblem(ucStatementText);
      const pack = buildBenefitsActionPack(decision)!;

      for (const date of pack.possibleDatesToCheck) {
        expect(`${date.label} ${date.value}`.toLowerCase()).not.toContain("as soon as possible");
      }
    });

    it("dedupes repeated money lines and keeps a single line per amount", () => {
      const decision = analyseDecisionProblem(ucStatementText);
      const pack = buildBenefitsActionPack(decision)!;

      const amounts = pack.moneyMentioned.map((line) => line.amountText);
      const uniqueAmounts = new Set(amounts);

      expect(amounts.length).toBe(uniqueAmounts.size);
      // The standard allowance amount must not also appear as a generic line.
      expect(amounts.filter((amount) => amount === "£393.45").length).toBe(1);
      expect(amounts).toContain("£818.45");
    });

    it("keeps every money line display-only (countedInMoneyTracker false)", () => {
      const decision = analyseDecisionProblem(ucStatementText);
      const pack = buildBenefitsActionPack(decision)!;

      expect(pack.moneyMentioned.length).toBeGreaterThan(0);
      expect(pack.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    });
  });

  describe("Evidence section stays human (no raw internal prefixes)", () => {
    it("drops internal case-file labels like 'Possible ground:' and 'Missing:' from evidence", () => {
      const decision = makeDecision("benefits_decision");
      const adminCase: AdminCase = {
        ...makeCase(decision),
        evidence: [
          { id: "e1", caseId: "case-benefits-1", label: "Possible ground", value: "You may disagree with the points.", source: "detected" },
          { id: "e2", caseId: "case-benefits-1", label: "Missing: Full decision letter", value: "Needed before acting", source: "manual" },
          { id: "e3", caseId: "case-benefits-1", label: "Deadline/urgency", value: "within one month", source: "manual" },
          { id: "e4", caseId: "case-benefits-1", label: "Risk", value: "Do not miss the window.", source: "manual" },
          { id: "e5", caseId: "case-benefits-1", label: "Safety note", value: "You decide what happens next.", source: "manual" },
          { id: "e6", caseId: "case-benefits-1", label: "Source", value: "Pasted letter", source: "user_text" },
        ],
      };

      const pack = buildBenefitsActionPack(decision, undefined, adminCase)!;
      const evidenceLabels = pack.evidenceFound.map((item) => item.label.toLowerCase());

      for (const rawLabel of [
        "possible ground",
        "missing:",
        "deadline/urgency",
        "risk",
        "safety note",
        "source",
      ]) {
        expect(evidenceLabels.some((label) => label.startsWith(rawLabel))).toBe(false);
      }
    });
  });

  describe("PIP decision routing and wording (manual test input)", () => {
    const pipDecisionText = `Personal Independence Payment decision
We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.`;

    it("routes a PIP refusal/decision letter to the PIP decision Action Pack, not the claim-form pack", () => {
      const decision = analyseDecisionProblem(pipDecisionText);
      const pack = buildBenefitsActionPack(decision)!;

      expect(decision.documentType).toBe("benefits_decision");
      expect(pack.title).toBe("PIP decision check");
      expect(pack.title).not.toBe("PIP claim form check");
    });

    it("includes the decision date as a date the user must check", () => {
      const decision = analyseDecisionProblem(pipDecisionText);
      const pack = buildBenefitsActionPack(decision)!;

      const decisionDate = pack.possibleDatesToCheck.find((date) =>
        /decision date/i.test(date.label),
      );

      expect(decisionDate?.value).toBe("4 July 2026");
      expect(decisionDate?.userMustCheck).toBe(true);
    });

    it("uses cautious look-again wording and avoids unsafe claims", () => {
      const decision = analyseDecisionProblem(pipDecisionText);
      const pack = buildBenefitsActionPack(decision)!;
      const flattened = flattenPack(pack).toLowerCase();

      expect(flattened).toContain("looked at again");
      expect(flattened).toContain("adminavenger cannot know whether dwp will change the decision");
      for (const phrase of unsafeBenefitClaims) {
        expect(flattened).not.toContain(phrase);
      }
    });
  });

  describe("UC sanction pack stays safe", () => {
    const ucSanctionText = `Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask us to look at this decision again.`;

    it("renders a safe sanction pack with the start date and visible uncertainty/cannot-know", () => {
      const decision = analyseDecisionProblem(ucSanctionText);
      const pack = buildBenefitsActionPack(decision)!;
      const flattened = flattenPack(pack).toLowerCase();

      expect(decision.documentType).toBe("benefits_uc_sanction");
      expect(pack.title).toBe("Universal Credit sanction check");
      expect(
        pack.possibleDatesToCheck.some((date) => date.value.includes("10 July 2026")),
      ).toBe(true);
      expect(pack.uncertainty.length).toBeGreaterThan(0);
      expect(pack.cannotKnow.length).toBeGreaterThan(0);
      for (const phrase of unsafeBenefitClaims) {
        expect(flattened).not.toContain(phrase);
      }
    });
  });
});
