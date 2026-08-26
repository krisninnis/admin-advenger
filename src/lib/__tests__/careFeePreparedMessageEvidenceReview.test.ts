import { describe, expect, it } from "vitest";
import {
  CARE_FEE_CASE_SUMMARIES,
  type CareFeeComparisonCaseV1,
} from "../careFeeCase";
import {
  prepareCareFeeDraft,
  renderCareFeePreparedMessageStatements,
  type CareFeeDraftIntentV1,
} from "../careFeeDraftPreparation";
import { createCareFeePreparedMessageEvidenceReview } from "../careFeePreparedMessageEvidenceReview";
import type { ComparabilityReason } from "../financialClaimComparability";
import { RECONCILIATION_REASON_EXPLANATIONS } from "../safeReconciliationResult";

const sourceRecord = (
  recordLabel: "Record 1" | "Record 2",
  claimId: string,
  amountMinor: number,
): CareFeeComparisonCaseV1["sourceRecords"][number] => {
  const documentId = `${claimId}-document`;
  const sourceSegmentId = `${documentId}-segment`;
  const sourceQuote = `Resident contribution: GBP ${amountMinor / 100} per week`;
  return {
    recordLabel,
    claim: {
      id: claimId,
      subjectId: "unknown",
      providerId: "unknown",
      concept: "resident_contribution",
      amountMinor,
      currency: "GBP",
      cadence: "weekly",
      payerRole: "resident",
      payeeRole: "care_provider",
      effectiveDate: "2026-08-20",
      provenance: {
        claimId,
        sourceDocumentId: documentId,
        sourceSegmentId,
        sourceQuote,
        reviewState: "confirmed",
      },
    },
    document: {
      id: documentId,
      displayName: `${recordLabel.toLowerCase().replace(" ", "-")}.txt`,
      intakeType: "text_file",
      extractionMethod: "browser_text",
      order: recordLabel === "Record 1" ? 1 : 2,
      warnings: [],
      reviewState: "confirmed",
    },
    sourceLocation: { sourceSegmentId, segmentKind: "document", segmentOrder: 1 },
    sourceQuote,
    reviewState: "confirmed",
  };
};

const careFeeCase = (
  state: "agreement" | "disagreement" | "not_safely_comparable",
  reasons: readonly ComparabilityReason[] = ["missing_period_context"],
): CareFeeComparisonCaseV1 => {
  const secondAmount = state === "agreement" ? 48_600 : 50_000;
  return {
    kind: "care_fee_comparison_case",
    version: 1,
    id: `care-fee-evidence-${state}`,
    title: "Care fee record comparison",
    summary: CARE_FEE_CASE_SUMMARIES[state],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    creation: { kind: "explicit_user_save" },
    sourceRecords: [
      sourceRecord("Record 1", "claim-a", 48_600),
      sourceRecord("Record 2", "claim-b", secondAmount),
    ],
    userConfirmedContext: [
      {
        kind: "user_confirmed_context",
        dimension: "same_subject",
        appliesToClaimIds: ["claim-a", "claim-b"],
        answer: "yes",
      },
      {
        kind: "user_confirmed_context",
        dimension: "same_provider",
        appliesToClaimIds: ["claim-a", "claim-b"],
        answer: "yes",
      },
    ],
    resolutionLedger: {
      subject: ["user_confirmed", "user_confirmed"],
      provider: ["user_confirmed", "user_confirmed"],
      payerRoles: ["source_derived", "source_derived"],
      payeeRoles: ["source_derived", "source_derived"],
    },
    reconciliation: state === "agreement"
      ? {
          state,
          claimIds: ["claim-a", "claim-b"],
          amountMinor: 48_600,
          currency: "GBP",
          cadence: "weekly",
          applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
        }
      : state === "disagreement"
        ? {
            state,
            claimIds: ["claim-a", "claim-b"],
            amountsMinor: [48_600, 50_000],
            differenceMinor: 1_400,
            differenceKind: "absolute",
            currency: "GBP",
            cadence: "weekly",
            applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
          }
        : { state, claimIds: ["claim-a", "claim-b"], reasons: [...reasons] },
    blockingExplanations: state === "not_safely_comparable"
      ? reasons.map((reason) => RECONCILIATION_REASON_EXPLANATIONS[reason])
      : [],
    safetyBoundary: "This comparison does not establish what should apply.",
  };
};

const prepare = (
  savedCase: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
  recipient?: string,
) => {
  const outcome = prepareCareFeeDraft({
    kind: "care_fee_draft_preparation_request",
    version: 1,
    savedCase,
    intent,
    ...(recipient
      ? { recipient: { label: recipient, origin: "user_entered_drafting_input" } }
      : {}),
  }, { id: "prepared-evidence-test", now: "2026-08-21T10:00:00.000Z" });
  if (outcome.status !== "prepared") throw new Error(outcome.message);
  return outcome;
};

const reviewOf = (
  outcome: ReturnType<typeof prepare>,
  currentSavedCase: unknown,
  editedSubject = outcome.draft.preparedSubject,
  editedBody = outcome.draft.preparedBody,
) => createCareFeePreparedMessageEvidenceReview({
  currentSavedCase,
  preparedDraft: outcome.draft,
  preparedContext: outcome.context,
  preparedAgainstSnapshotIdentity: outcome.preparedAgainstSnapshotIdentity,
  editedSubject,
  editedBody,
});

describe("Care Fee prepared-message evidence review", () => {
  it.each([
    ["agreement", "confirm_or_break_down_figure"],
    ["disagreement", "explain_comparison_difference"],
    ["not_safely_comparable", "request_missing_information"],
  ] as const)("matches the exact saved %s snapshot", (state, intent) => {
    const savedCase = careFeeCase(state);
    const outcome = prepare(savedCase, intent);
    const review = reviewOf(outcome, savedCase);

    expect(review.savedSnapshotMatchStatus).toBe("matches_saved_snapshot");
    expect(review.draftId).toBe(outcome.draft.id);
    expect(review.caseId).toBe(savedCase.id);
    expect(review.templateVersion).toBe(1);
    expect(review.safetyBoundary).toBe("prepared_version_evidence_review_only_no_send");
  });

  it("keeps deterministic statement IDs, order, classifications, and exact rendered output", () => {
    const savedCase = careFeeCase("disagreement");
    const first = prepare(savedCase, "explain_comparison_difference", "Care Accounts");
    const second = prepare(savedCase, "explain_comparison_difference", "Care Accounts");

    expect(first.draft.preparedStatements).toEqual(second.draft.preparedStatements);
    expect(first.draft.preparedStatements.map(({ id }) => id)).toEqual([
      "subject",
      "body-greeting-prefix",
      "body-recipient-label",
      "body-greeting-punctuation",
      "body-purpose",
      "body-record-1",
      "body-record-2",
      "body-comparability",
      "body-absolute-difference",
      "body-request",
      "body-response-request",
      "body-signoff",
    ]);
    expect(first.draft.preparedStatements.map(({ order }) => order)).toEqual(
      first.draft.preparedStatements.map((_, index) => index),
    );
    expect(renderCareFeePreparedMessageStatements(first.draft.preparedStatements)).toEqual({
      subject: first.draft.preparedSubject,
      body: first.draft.preparedBody,
    });
  });

  it("uses exact source and derived support without treating document references as message facts", () => {
    const outcome = prepare(careFeeCase("disagreement"), "explain_comparison_difference");
    const firstRecord = outcome.draft.preparedStatements.find(({ id }) => id === "body-record-1");
    const difference = outcome.draft.preparedStatements.find(({ id }) => id === "body-absolute-difference");

    expect(firstRecord?.classification).toBe("source_grounded_statement");
    expect(firstRecord?.supportReferences.map((reference) =>
      reference.partition === "source_fact" ? reference.field : reference.partition)).toEqual([
      "amount_minor",
      "cadence",
    ]);
    expect(difference?.classification).toBe("derived_comparison_statement");
    expect(difference?.supportReferences.map((reference) =>
      reference.partition === "derived_comparison_fact" ? reference.field : reference.partition)).toEqual([
      "difference_minor",
      "difference_kind",
      "currency",
      "cadence",
    ]);
    expect(outcome.draft.preparedStatements.flatMap(({ supportReferences }) => supportReferences)
      .some((reference) => reference.partition === "source_fact" &&
        reference.field === "document_reference")).toBe(false);
  });

  it("classifies recipient and fixed wording without fabricating evidence support", () => {
    const outcome = prepare(careFeeCase("agreement"), "confirm_or_break_down_figure", "Care Accounts");
    const recipient = outcome.draft.preparedStatements.find(({ id }) => id === "body-recipient-label");
    const templateStatements = outcome.draft.preparedStatements.filter(
      ({ classification }) => classification === "adminavenger_template_wording",
    );

    expect(recipient).toMatchObject({
      text: "Care Accounts",
      classification: "user_entered_recipient",
      supportReferences: [{ partition: "user_entered_drafting_input", field: "recipient_label" }],
    });
    expect(templateStatements.length).toBeGreaterThan(0);
    expect(templateStatements.every(({ supportReferences }) => supportReferences.length === 0)).toBe(true);
  });

  it("keeps user-confirmed facts as supporting context rather than stated message facts", () => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    const review = reviewOf(outcome, savedCase);

    expect(review.supportingContextReferences.userConfirmedReferences).toHaveLength(2);
    expect(review.preparedStatements.some(
      ({ classification }) => classification === "user_confirmed_input",
    )).toBe(false);
    expect(review.statementSupportReferences.some(
      ({ partition }) => partition === "user_confirmed_fact",
    )).toBe(false);
  });

  it.each([
    ["subject edited", "Changed subject", undefined, "edited", "unchanged"],
    ["body edited", undefined, "Changed body", "unchanged", "edited"],
    ["both edited", "Changed subject", "Changed body", "edited", "edited"],
  ] as const)("records whole-field %s state only", (_, subject, body, subjectState, bodyState) => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    const review = reviewOf(
      outcome,
      savedCase,
      subject ?? outcome.draft.preparedSubject,
      body ?? outcome.draft.preparedBody,
    );
    expect(review.editState).toEqual({ subject: subjectState, body: bodyState });
    expect(review.preparedStatements).toEqual(outcome.draft.preparedStatements);
  });

  it("returns edit state to unchanged when text is reverted", () => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    expect(reviewOf(outcome, savedCase).editState).toEqual({
      subject: "unchanged",
      body: "unchanged",
    });
  });

  it("fails closed for invalid cases and case identity mismatch", () => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    expect(reviewOf(outcome, { ...savedCase, demandedRefund: 1_400 }).savedSnapshotMatchStatus)
      .toBe("invalid_saved_case");
    expect(reviewOf(outcome, { ...savedCase, id: "another-valid-case" }).savedSnapshotMatchStatus)
      .toBe("case_identity_mismatch");
  });

  it.each([
    ["saved timestamp", (value: CareFeeComparisonCaseV1) => ({ ...value, updatedAt: "2026-08-22T12:00:00.000Z" })],
    ["resolution ledger", (value: CareFeeComparisonCaseV1) => ({
      ...value,
      resolutionLedger: { ...value.resolutionLedger, payerRoles: ["user_confirmed", "source_derived"] as const },
    })],
    ["source quote", (value: CareFeeComparisonCaseV1) => {
      const first = value.sourceRecords[0];
      const sourceQuote = `${first.sourceQuote} updated`;
      return {
        ...value,
        sourceRecords: [{
          ...first,
          sourceQuote,
          claim: { ...first.claim, provenance: { ...first.claim.provenance, sourceQuote } },
        }, value.sourceRecords[1]],
      };
    }],
  ] as const)("detects same-ID %s substitution without treating user edits as stale", (_, change) => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    const changed = change(savedCase) as CareFeeComparisonCaseV1;
    expect(reviewOf(outcome, changed, "My subject", "My body").savedSnapshotMatchStatus)
      .toBe("case_snapshot_mismatch");
  });

  it("detects changed applicability and changed NSC blockers", () => {
    const disagreement = careFeeCase("disagreement");
    const disagreementOutcome = prepare(disagreement, "explain_comparison_difference");
    const reconciliation = disagreement.reconciliation;
    if (reconciliation.state !== "disagreement") throw new Error("Expected disagreement");
    const changedApplicability: CareFeeComparisonCaseV1 = {
      ...disagreement,
      reconciliation: {
        ...reconciliation,
        applicability: {
          kind: "same_explicit_period",
          periodStart: "2026-08-01",
          periodEnd: "2026-08-31",
        },
      },
    };
    expect(reviewOf(disagreementOutcome, changedApplicability).savedSnapshotMatchStatus)
      .toBe("case_snapshot_mismatch");

    const nsc = careFeeCase("not_safely_comparable");
    const nscOutcome = prepare(nsc, "request_missing_information");
    const changedBlocker = careFeeCase("not_safely_comparable", ["missing_cadence_context"]);
    expect(reviewOf(nscOutcome, { ...changedBlocker, id: nsc.id }).savedSnapshotMatchStatus)
      .toBe("case_snapshot_mismatch");
  });

  it("detects tampered prepared output separately from a tampered trace", () => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    const outputTampered = {
      ...outcome,
      draft: { ...outcome.draft, preparedBody: `${outcome.draft.preparedBody}\nRefund this.` },
    };
    expect(reviewOf(outputTampered, savedCase).savedSnapshotMatchStatus)
      .toBe("prepared_output_mismatch");

    const traceTampered = {
      ...outcome,
      draft: {
        ...outcome.draft,
        preparedStatements: outcome.draft.preparedStatements.map((statement) =>
          statement.id === "body-purpose"
            ? { ...statement, classification: "source_grounded_statement" as const }
            : statement),
      },
    };
    expect(reviewOf(traceTampered, savedCase).savedSnapshotMatchStatus).toBe("audit_mismatch");
  });

  it("fails closed for duplicate and cross-case support references", () => {
    const savedCase = careFeeCase("agreement");
    const outcome = prepare(savedCase, "confirm_or_break_down_figure");
    const statements = outcome.draft.preparedStatements.map((statement) => {
      if (statement.id !== "body-record-1") return statement;
      const firstReference = statement.supportReferences[0];
      return {
        ...statement,
        supportReferences: firstReference
          ? [firstReference, firstReference]
          : [],
      };
    });
    const duplicate = {
      ...outcome,
      draft: { ...outcome.draft, preparedStatements: statements },
    };
    expect(reviewOf(duplicate, savedCase).savedSnapshotMatchStatus).toBe("audit_mismatch");

    const crossCaseStatements = outcome.draft.preparedStatements.map((statement) => ({
      ...statement,
      supportReferences: statement.supportReferences.map((reference) =>
        reference.partition === "source_fact"
          ? { ...reference, claimId: "claim-from-another-case" }
          : reference),
    }));
    const crossCase = {
      ...outcome,
      draft: { ...outcome.draft, preparedStatements: crossCaseStatements },
    };
    expect(reviewOf(crossCase, savedCase).savedSnapshotMatchStatus).toBe("audit_mismatch");
  });
});
