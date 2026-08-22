import { describe, expect, it } from "vitest";
import {
  CARE_FEE_CASE_SUMMARIES,
  validateCareFeeComparisonCase,
  type CareFeeComparisonCaseV1,
} from "../careFeeCase";
import {
  CARE_FEE_DRAFT_INTENTS,
  CARE_FEE_NSC_DRAFT_RULES,
  formatCareFeeDraftApplicability,
  getAllowedCareFeeDraftIntents,
  prepareCareFeeDraft,
  validateCareFeeDraftPreparationRequest,
  validateCareFeePreparedTextSafety,
  type CareFeeDraftIntentV1,
  type CareFeeDraftPreparationRequestV1,
  type CareFeeDraftRecipientV1,
} from "../careFeeDraftPreparation";
import {
  COMPARABILITY_REASONS,
  type ComparabilityReason,
  type ComparableApplicability,
} from "../financialClaimComparability";
import { RECONCILIATION_REASON_EXPLANATIONS } from "../safeReconciliationResult";

const sourceRecord = (
  recordLabel: "Record 1" | "Record 2",
  claimId: string,
  documentId: string,
  amountMinor: number,
): CareFeeComparisonCaseV1["sourceRecords"][number] => {
  const sourceQuote = `Resident contribution: GBP ${amountMinor / 100} per week; effective 2026-08-20`;
  const sourceSegmentId = `${documentId}-segment-1`;
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
      displayName: `${documentId}.txt`,
      intakeType: "text_file",
      extractionMethod: "browser_text",
      order: recordLabel === "Record 1" ? 1 : 2,
      warnings: [],
      reviewState: "confirmed",
    },
    sourceLocation: {
      sourceSegmentId,
      segmentKind: "document",
      segmentOrder: 1,
    },
    sourceQuote,
    reviewState: "confirmed",
  };
};

const careFeeCase = (
  state: "agreement" | "disagreement" | "not_safely_comparable",
  reasons: readonly ComparabilityReason[] = ["missing_period_context"],
): CareFeeComparisonCaseV1 => {
  const secondAmount = state === "agreement" ? 48_600 : 50_000;
  const sourceRecords = [
    sourceRecord("Record 1", "claim-a", "record-a", 48_600),
    sourceRecord("Record 2", "claim-b", "record-b", secondAmount),
  ] as const;
  const reconciliation: CareFeeComparisonCaseV1["reconciliation"] =
    state === "agreement"
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
        : {
            state,
            claimIds: ["claim-a", "claim-b"],
            reasons: [...reasons],
          };
  return {
    kind: "care_fee_comparison_case",
    version: 1,
    id: `care-fee-case-${state}`,
    title: "Care fee record comparison",
    summary: CARE_FEE_CASE_SUMMARIES[state],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    creation: { kind: "explicit_user_save" },
    sourceRecords,
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
    reconciliation,
    blockingExplanations: state === "not_safely_comparable"
      ? reasons.map((reason) => RECONCILIATION_REASON_EXPLANATIONS[reason])
      : [],
    safetyBoundary: "This comparison does not establish what should apply.",
  };
};

const request = (
  savedCase: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
  recipient?: CareFeeDraftRecipientV1,
): CareFeeDraftPreparationRequestV1 => ({
  kind: "care_fee_draft_preparation_request",
  version: 1,
  savedCase,
  intent,
  ...(recipient ? { recipient } : {}),
});

const prepared = (
  savedCase: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
  recipient?: CareFeeDraftRecipientV1,
) => prepareCareFeeDraft(request(savedCase, intent, recipient), {
  id: "care-fee-prepared-draft-test",
  now: "2026-08-21T10:00:00.000Z",
});

describe("Care Fee transient draft preparation domain", () => {
  it("accepts only the exact versioned request shape and a valid saved case", () => {
    const savedCase = careFeeCase("agreement");
    expect(validateCareFeeComparisonCase(savedCase).valid).toBe(true);
    expect(validateCareFeeDraftPreparationRequest(request(
      savedCase,
      "confirm_or_break_down_figure",
    )).valid).toBe(true);

    expect(validateCareFeeDraftPreparationRequest({
      ...request(savedCase, "confirm_or_break_down_figure"),
      chaseAfterDays: 7,
    })).toMatchObject({ valid: false, reason: "unexpected_field" });
    expect(validateCareFeeDraftPreparationRequest({
      ...request(savedCase, "confirm_or_break_down_figure"),
      savedCase: { ...savedCase, impact: { amount: 1_400 } },
    })).toMatchObject({ valid: false, reason: "invalid_saved_case" });
    expect(validateCareFeeDraftPreparationRequest({
      ...request(savedCase, "confirm_or_break_down_figure"),
      version: 2,
    })).toMatchObject({ valid: false, reason: "malformed_request" });
    expect(validateCareFeeDraftPreparationRequest({
      ...request(savedCase, "confirm_or_break_down_figure"),
      intent: "demand_refund",
    })).toMatchObject({ valid: false, reason: "unsupported_intent" });
  });

  it.each([
    ["agreement", "confirm_or_break_down_figure"],
    ["agreement", "clarify_rate_or_period"],
    ["disagreement", "confirm_or_break_down_figure"],
    ["disagreement", "explain_comparison_difference"],
    ["disagreement", "clarify_rate_or_period"],
    ["not_safely_comparable", "request_missing_information"],
    ["not_safely_comparable", "clarify_rate_or_period"],
  ] as const)("allows %s with %s", (state, intent) => {
    expect(prepared(careFeeCase(state), intent).status).toBe("prepared");
  });

  it.each([
    ["agreement", "explain_comparison_difference"],
    ["agreement", "request_missing_information"],
    ["disagreement", "request_missing_information"],
    ["not_safely_comparable", "confirm_or_break_down_figure"],
    ["not_safely_comparable", "explain_comparison_difference"],
  ] as const)("rejects %s with %s without a fallback", (state, intent) => {
    expect(prepared(careFeeCase(state), intent)).toMatchObject({
      status: "failed",
      reason: "unsupported_state_intent",
    });
  });

  it("allows NSC rate/period clarification only for the approved reason subset", () => {
    expect(prepared(
      careFeeCase("not_safely_comparable", ["different_cadence"]),
      "clarify_rate_or_period",
    ).status).toBe("prepared");
    expect(prepared(
      careFeeCase("not_safely_comparable", ["different_provider"]),
      "clarify_rate_or_period",
    )).toMatchObject({ status: "failed", reason: "unsupported_state_intent" });

    const mixed = prepared(
      careFeeCase("not_safely_comparable", ["different_provider", "missing_period_context"]),
      "clarify_rate_or_period",
    );
    expect(mixed.status).toBe("prepared");
    if (mixed.status !== "prepared" ||
        mixed.context.derivedComparisonFacts.state !== "not_safely_comparable") return;
    expect(mixed.context.derivedComparisonFacts.reasons).toEqual(["missing_period_context"]);
    expect(mixed.draft.preparedBody).not.toContain("different providers");
    expect(mixed.draft.preparedBody).toContain("period or effective date");
  });

  it("implements every current NSC reason with deterministic bounded wording", () => {
    expect(Object.keys(CARE_FEE_NSC_DRAFT_RULES)).toEqual([...COMPARABILITY_REASONS]);

    for (const reason of COMPARABILITY_REASONS) {
      const outcome = prepared(
        careFeeCase("not_safely_comparable", [reason]),
        "request_missing_information",
      );
      expect(outcome.status, reason).toBe("prepared");
      if (outcome.status !== "prepared") continue;
      const rule = CARE_FEE_NSC_DRAFT_RULES[reason];
      expect(outcome.draft.preparedBody).toContain(rule.statement);
      expect(outcome.draft.preparedBody).toContain(rule.request);
      expect(outcome.draft.preparedBody).not.toContain(rule.forbiddenInference);
      expect(outcome.draft.preparedBody).not.toMatch(/absolute difference|GBP\s+\d/i);
    }
  });

  it("fails closed for absent, unknown, duplicate, malformed, or inconsistent NSC blockers", () => {
    const valid = careFeeCase("not_safely_comparable", ["missing_period_context"]);
    expect(validateCareFeeDraftPreparationRequest(request(
      { ...valid, blockingExplanations: ["Different arbitrary wording"] },
      "request_missing_information",
    ))).toMatchObject({ valid: false, reason: "invalid_nsc_blockers" });

    const duplicate = careFeeCase("not_safely_comparable", [
      "missing_period_context",
      "missing_period_context",
    ]);
    expect(validateCareFeeDraftPreparationRequest(request(
      duplicate,
      "request_missing_information",
    ))).toMatchObject({ valid: false, reason: "invalid_nsc_blockers" });

    const empty = {
      ...valid,
      reconciliation: { state: "not_safely_comparable", claimIds: ["claim-a", "claim-b"], reasons: [] },
      blockingExplanations: [],
    };
    expect(validateCareFeeDraftPreparationRequest(request(
      empty as unknown as CareFeeComparisonCaseV1,
      "request_missing_information",
    ))).toMatchObject({ valid: false, reason: "invalid_saved_case" });

    const unknown = {
      ...valid,
      reconciliation: {
        state: "not_safely_comparable",
        claimIds: ["claim-a", "claim-b"],
        reasons: ["new_unknown_reason"],
      },
    };
    expect(validateCareFeeDraftPreparationRequest(request(
      unknown as unknown as CareFeeComparisonCaseV1,
      "request_missing_information",
    ))).toMatchObject({ valid: false, reason: "invalid_saved_case" });
  });

  it.each([
    [{ label: "   ", origin: "user_entered_drafting_input" }, "blank"],
    [{ label: "Line\nBreak", origin: "user_entered_drafting_input" }, "newline"],
    [{ label: "Tabbed\tName", origin: "user_entered_drafting_input" }, "tab"],
    [{ label: `Control${String.fromCharCode(0)}Name`, origin: "user_entered_drafting_input" }, "control"],
    [{ label: "x".repeat(81), origin: "user_entered_drafting_input" }, "length"],
    [{ label: "Council", origin: "source_derived" }, "origin"],
    [{ label: "Council", origin: "user_entered_drafting_input", email: "test@example.test" }, "unexpected"],
  ])("rejects invalid recipient input: %s", (recipient, _description) => {
    expect(validateCareFeeDraftPreparationRequest({
      ...request(careFeeCase("agreement"), "confirm_or_break_down_figure"),
      recipient,
    })).toMatchObject({ valid: false, reason: "invalid_recipient" });
  });

  it("trims a valid Unicode recipient label and never infers opaque or document identities", () => {
    const savedCase = careFeeCase("agreement");
    const opaqueCase: CareFeeComparisonCaseV1 = {
      ...savedCase,
      sourceRecords: savedCase.sourceRecords.map((record) => ({
        ...record,
        claim: {
          ...record.claim,
          subjectId: "opaque-subject-key",
          providerId: "opaque-provider-key",
        },
      })) as unknown as CareFeeComparisonCaseV1["sourceRecords"],
      userConfirmedContext: [],
      resolutionLedger: {
        subject: ["source_derived", "source_derived"],
        provider: ["source_derived", "source_derived"],
        payerRoles: ["source_derived", "source_derived"],
        payeeRoles: ["source_derived", "source_derived"],
      },
    };
    const outcome = prepared(
      opaqueCase,
      "confirm_or_break_down_figure",
      { label: "  Care Team 😀  ", origin: "user_entered_drafting_input" },
    );
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    expect(outcome.draft.recipient?.label).toBe("Care Team 😀");
    expect(outcome.draft.preparedBody).toContain("Hello Care Team 😀,");
    expect(outcome.draft.preparedBody).not.toContain("opaque-provider-key");
    expect(outcome.draft.preparedBody).not.toContain("record-a.txt");
    expect(outcome.draft.preparedBody).not.toContain("Resident contribution:");
  });

  it("uses a generic greeting when no recipient is supplied", () => {
    const outcome = prepared(careFeeCase("agreement"), "clarify_rate_or_period");
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    expect(outcome.draft.preparedBody.startsWith("Hello,\n")).toBe(true);
    expect(outcome.draft.recipient).toBeUndefined();
  });

  it.each([
    ["same_explicit_period", { kind: "same_explicit_period", periodStart: "2026-08-01", periodEnd: "2026-08-31" }, "for the stated period from 2026-08-01 to 2026-08-31"],
    ["overlapping_explicit_periods", { kind: "overlapping_explicit_periods", periodStart: "2026-08-10", periodEnd: "2026-08-20" }, "for the overlapping stated period from 2026-08-10 to 2026-08-20"],
    ["same_effective_date", { kind: "same_effective_date", effectiveDate: "2026-08-20" }, "with the same stated effective date of 2026-08-20"],
  ] as const)("uses exact saved %s applicability", (_kind, applicability, wording) => {
    const savedCase = careFeeCase("disagreement");
    const variant: CareFeeComparisonCaseV1 = {
      ...savedCase,
      reconciliation: { ...savedCase.reconciliation, applicability } as CareFeeComparisonCaseV1["reconciliation"],
    };
    const outcome = prepared(variant, "explain_comparison_difference");
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    expect(formatCareFeeDraftApplicability(applicability as ComparableApplicability)).toBe(wording);
    expect(outcome.draft.preparedBody).toContain(wording);
  });

  it("preserves source order and the exact saved disagreement values and absolute difference", () => {
    const outcome = prepared(careFeeCase("disagreement"), "explain_comparison_difference");
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    const body = outcome.draft.preparedBody;
    expect(body.indexOf("Record 1 shows GBP 486.00 per week")).toBeLessThan(
      body.indexOf("Record 2 shows GBP 500.00 per week"),
    );
    expect(body).toContain(
      "The absolute difference between the two safely comparable figures is GBP 14.00 per week.",
    );
    expect(body).not.toMatch(/owed|overcharg|refund|reimburse|fault|correct|wrong/i);
  });

  it("keeps the four fact origins separate and emits exact typed audit references", () => {
    const outcome = prepared(
      careFeeCase("disagreement"),
      "explain_comparison_difference",
      { label: "Care Accounts", origin: "user_entered_drafting_input" },
    );
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    expect(new Set(outcome.context.sourceFacts.map(({ partition }) => partition))).toEqual(
      new Set(["source_fact"]),
    );
    expect(new Set(outcome.context.userConfirmedFacts.map(({ partition }) => partition))).toEqual(
      new Set(["user_confirmed_fact"]),
    );
    expect(outcome.context.derivedComparisonFacts.partition).toBe("derived_comparison_fact");
    expect(outcome.context.recipient?.origin).toBe("user_entered_drafting_input");
    expect(outcome.draft.audit).toMatchObject({
      templateVersion: 1,
      userEnteredInputReferences: [{
        partition: "user_entered_drafting_input",
        field: "recipient_label",
      }],
    });
    expect(outcome.draft.audit.sourceFactReferences.every(
      (fact) => fact.partition === "source_fact" && Boolean(fact.sourceDocumentId),
    )).toBe(true);
    expect(outcome.draft.audit.userConfirmedFactReferences.every(
      (fact) => fact.partition === "user_confirmed_fact",
    )).toBe(true);
    expect(outcome.draft.audit.derivedFactReferences.map(({ field }) => field)).toEqual([
      "state",
      "amounts_minor",
      "difference_minor",
      "difference_kind",
      "currency",
      "cadence",
      "applicability",
    ]);
  });

  it("is deterministic apart from explicitly variable ID and time metadata", () => {
    const savedCase = careFeeCase("disagreement");
    const first = prepareCareFeeDraft(request(savedCase, "clarify_rate_or_period"), {
      id: "draft-one",
      now: "2026-08-21T10:00:00.000Z",
    });
    const second = prepareCareFeeDraft(request(savedCase, "clarify_rate_or_period"), {
      id: "draft-two",
      now: "2026-08-22T10:00:00.000Z",
    });
    expect(first.status).toBe("prepared");
    expect(second.status).toBe("prepared");
    if (first.status !== "prepared" || second.status !== "prepared") return;
    expect(first.draft.preparedSubject).toBe(second.draft.preparedSubject);
    expect(first.draft.preparedBody).toBe(second.draft.preparedBody);
    expect(first.draft.audit).toEqual(second.draft.audit);
  });

  it("rejects prohibited assertions while allowing neutral payment-period wording", () => {
    const validation = validateCareFeeDraftPreparationRequest(request(
      careFeeCase("agreement"),
      "clarify_rate_or_period",
    ));
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;
    expect(validateCareFeePreparedTextSafety({
      subject: "Request for clarification",
      body: "Hello,\n\nPlease explain which payment period applies.",
    }, validation.context)).toEqual({ safe: true });

    for (const phrase of [
      "You overcharged me.",
      "You owe me this amount.",
      "The amount owed is clear.",
      "A refund is due.",
      "Please refund me.",
      "Please reimburse this.",
      "This is unlawful.",
      "You are liable.",
      "I am entitled to compensation.",
      "The invoice is incorrect.",
      "This figure is wrong.",
      "This is an overpayment.",
      "You must pay within seven days.",
      "I will take legal action.",
      "This is money recovered.",
      "I expect recovery.",
      "These are savings.",
    ]) {
      expect(validateCareFeePreparedTextSafety({
        subject: "Request for clarification",
        body: phrase,
      }, validation.context), phrase).toMatchObject({
        safe: false,
        reason: "prohibited_language",
      });
    }
    expect(validateCareFeePreparedTextSafety({
      subject: "Request for clarification",
      body: "The figure is GBP 999.00.",
    }, validation.context)).toEqual({ safe: false, reason: "unsupported_money" });
    expect(validateCareFeePreparedTextSafety({
      subject: "Request for {purpose}",
      body: "Hello,",
    }, validation.context)).toEqual({ safe: false, reason: "unresolved_template" });
  });

  it("produces no generic draft, remedy, money-impact, chase, status, or send fields", () => {
    const outcome = prepared(careFeeCase("agreement"), "confirm_or_break_down_figure");
    expect(outcome.status).toBe("prepared");
    if (outcome.status !== "prepared") return;
    expect(outcome.draft).toMatchObject({
      kind: "care_fee_prepared_draft",
      version: 1,
      safetyBoundary: "preparation_only_no_send_no_claim_conclusion",
    });
    const serialized = JSON.stringify(outcome.draft);
    for (const field of [
      "chaseAfterDays",
      "requestedRefund",
      "moneyImpact",
      "remedy",
      "caseStatus",
      "sendState",
      "resolvedState",
      "legalConclusion",
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it("exposes only the approved state-specific intent lists", () => {
    expect(getAllowedCareFeeDraftIntents(careFeeCase("agreement"))).toEqual([
      "confirm_or_break_down_figure",
      "clarify_rate_or_period",
    ]);
    expect(getAllowedCareFeeDraftIntents(careFeeCase("disagreement"))).toEqual([
      "confirm_or_break_down_figure",
      "explain_comparison_difference",
      "clarify_rate_or_period",
    ]);
    expect(getAllowedCareFeeDraftIntents(careFeeCase("not_safely_comparable"))).toEqual([
      "clarify_rate_or_period",
      "request_missing_information",
    ]);
    expect(CARE_FEE_DRAFT_INTENTS).toHaveLength(4);
  });
});
