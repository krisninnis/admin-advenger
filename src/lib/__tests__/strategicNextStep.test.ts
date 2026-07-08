import { describe, expect, it } from "vitest";
import {
  STRATEGIC_NEXT_STEP_SAFETY_NOTE,
  buildStrategicNextStepPlan,
  type StrategicMove,
  type StrategicNextStepPlan,
} from "../strategicNextStep";
import type { DecisionDocumentType, DecisionResult } from "../decisionEngine/types";

const makeDecision = (
  documentType: DecisionDocumentType,
  overrides: Partial<DecisionResult> = {},
): DecisionResult => ({
  documentType,
  title: "Admin document check",
  plainEnglishSummary: "This appears to be an admin document that needs checking.",
  caseStrength: "not_enough_information",
  strengthLabel: "Check before acting",
  whatThisLooksLike: "This appears to be about an admin process.",
  possibleGrounds: ["The document mentions a step that may need checking."],
  confidence: {
    level: "medium",
    reason: "The wording gives a reasonable match, but the original document still needs checking.",
  },
  uncertainty: ["The exact deadline may depend on the full document."],
  cannotKnow: ["Whether the sender has more information than appears here."],
  evidenceNeeded: ["Full document", "Reference number"],
  deadlines: ["Check any response date on the letter."],
  risks: ["A rushed response can miss important detail."],
  nextSteps: ["Check the document before acting."],
  safetyNotes: ["AdminAvenger helps organise the document. You decide what happens next."],
  amountTreatment: "no_money_counted",
  sourceFacts: [],
  questionsToAnswer: ["What date is printed on the letter?"],
  ...overrides,
});

const allMoves = (plan: StrategicNextStepPlan): StrategicMove[] => [
  plan.safestMove,
  ...plan.otherSafeMoves,
];

const flattenPlan = (plan: StrategicNextStepPlan) =>
  [
    plan.title,
    plan.plainEnglishSummary,
    ...plan.actors.map((actor) => `${actor.label} ${actor.role} ${actor.likelyGoal} ${actor.caution ?? ""}`),
    plan.userGoal,
    ...plan.missingInformation,
    ...allMoves(plan).flatMap((move) => [
      move.label,
      move.description,
      move.whyThisHelps,
      move.safeDraftPrompt ?? "",
    ]),
    ...plan.movesToAvoid,
    ...plan.whenToGetAdvice,
    ...plan.uncertainty,
    ...plan.cannotKnow,
    ...plan.safetyNotes,
  ].join(" \n ");

const forbiddenPhrases = [
  "game theory",
  "opponent",
  "exploit",
  "beat dwp",
  "beat the council",
  "pressure them",
  "force them",
  "guaranteed",
  "you will win",
  "you qualify",
  "dwp is wrong",
  "this is unlawful",
  "you do not owe this",
  "valid claim",
  "invalid claim",
];

describe("Strategic Next Step Planner", () => {
  it("returns a UC statement plan focused on deductions, breakdowns, and records", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("benefits_uc_statement"),
    });
    const flattened = flattenPlan(plan).toLowerCase();

    expect(plan.title).toBe("Best next move");
    expect(plan.safestMove.label.toLowerCase()).toContain("deduction breakdown");
    expect(flattened).toContain("deduction");
    expect(flattened).toContain("breakdown");
    expect(flattened).toContain("previous statement");
  });

  it("makes UC sanction planning date, reason, and evidence focused", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("benefits_uc_sanction"),
    });
    const safestMove = `${plan.safestMove.label} ${plan.safestMove.description}`.toLowerCase();

    expect(safestMove).toContain("decision date");
    expect(safestMove).toContain("reason");
    expect(safestMove).toContain("evidence");
  });

  it("makes PIP decision planning focus on date, points, activities, and disagreement", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("benefits_decision"),
    });
    const safestMove = `${plan.safestMove.label} ${plan.safestMove.description} ${plan.safestMove.whyThisHelps}`.toLowerCase();

    expect(safestMove).toContain("decision date");
    expect(safestMove).toContain("points");
    expect(safestMove).toContain("activities");
    expect(safestMove).toContain("disagree");
  });

  it("warns debt and parking users not to ignore, admit, or pay automatically", () => {
    for (const documentType of ["parking_ticket", "debt_collection"] as const) {
      const plan = buildStrategicNextStepPlan({
        decisionResult: makeDecision(documentType),
      });
      const avoidText = plan.movesToAvoid.join(" ").toLowerCase();

      expect(avoidText).toContain("do not ignore");
      expect(avoidText).toContain("do not admit");
      expect(avoidText).toContain("pay automatically");
    }
  });

  it("returns a conservative unknown fallback", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("unknown_admin_dispute"),
    });
    const flattened = flattenPlan(plan).toLowerCase();

    expect(plan.safestMove.label.toLowerCase()).toContain("identify");
    expect(flattened).toContain("sender");
    expect(flattened).toContain("reference");
    expect(flattened).toContain("deadline");
  });

  it("preserves uncertainty and cannot-know boundaries", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("benefits_migration_notice", {
        uncertainty: ["The migration date needs checking on the actual notice."],
        cannotKnow: ["Whether this is the latest letter sent to the user."],
      }),
    });

    expect(plan.uncertainty).toContain("The migration date needs checking on the actual notice.");
    expect(plan.cannotKnow).toContain("Whether this is the latest letter sent to the user.");
    expect(plan.cannotKnow).toContain("AdminAvenger cannot decide your rights, entitlement, liability, or outcome.");
  });

  it("marks every move as review-only and keeps low-risk moves option-preserving", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("consumer_dispute"),
    });

    expect(allMoves(plan).every((planMove) => planMove.doNotAutoSend === true)).toBe(true);
    expect(plan.safestMove.preservesOptions).toBe(true);
    expect(plan.otherSafeMoves.some((planMove) => planMove.preservesOptions)).toBe(true);
  });

  it("includes the required safety note and avoids forbidden wording", () => {
    const plan = buildStrategicNextStepPlan({
      decisionResult: makeDecision("benefits_uc_deductions"),
    });
    const flattened = flattenPlan(plan).toLowerCase();

    expect(plan.safetyNotes).toContain(STRATEGIC_NEXT_STEP_SAFETY_NOTE);
    for (const phrase of forbiddenPhrases) {
      expect(flattened).not.toContain(phrase);
    }
  });
});
