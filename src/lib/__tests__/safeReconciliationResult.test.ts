import { describe, expect, it } from "vitest";
import type {
  DecisionDerivedFact,
  DecisionDocumentType,
  DecisionResult,
} from "../decisionEngine/types";
import {
  COMPARABILITY_REASONS,
  type ComparabilityReason,
  type ComparableApplicability,
} from "../financialClaimComparability";
import type { ReconciliationResult } from "../financialClaimReconciliation";
import type { FinancialClaim } from "../financialClaims";
import { buildResultViewModel } from "../resultViewModel";
import {
  composeSafeReconciliationResult,
  RECONCILIATION_REASON_EXPLANATIONS,
} from "../safeReconciliationResult";
import type { SourceDocument, SourceReviewState } from "../sourceProvenance";

type Fixture = {
  readonly claim: FinancialClaim;
  readonly document: SourceDocument;
};

const SAME_PERIOD = {
  kind: "same_explicit_period",
  periodStart: "2026-01-01",
  periodEnd: "2026-01-31",
} as const satisfies ComparableApplicability;

const OVERLAP = {
  kind: "overlapping_explicit_periods",
  periodStart: "2026-01-15",
  periodEnd: "2026-01-31",
} as const satisfies ComparableApplicability;

const fixture = (
  id: string,
  overrides: Partial<FinancialClaim> = {},
  reviewState: SourceReviewState = "confirmed",
): Fixture => {
  const sourceQuote = `Resident contribution stated as ${overrides.amountMinor ?? 48_600} pence for claim ${id}.`;
  const segmentId = `${id}-page-1`;
  const document: SourceDocument = {
    id: `${id}-document`,
    displayName: `${id}.pdf`,
    intakeType: "pdf",
    extractionMethod: "pdf_text",
    order: 1,
    extractedText: sourceQuote,
    warnings: [],
    reviewState,
    segments: [{ id: segmentId, kind: "page", order: 1, pageNumber: 2, text: sourceQuote }],
  };
  const claim: FinancialClaim = {
    id,
    subjectId: "resident-1",
    providerId: "care-home-1",
    concept: "resident_contribution",
    amountMinor: 48_600,
    currency: "GBP",
    cadence: "weekly",
    payerRole: "resident",
    payeeRole: "care_provider",
    periodStart: SAME_PERIOD.periodStart,
    periodEnd: SAME_PERIOD.periodEnd,
    ...overrides,
    provenance: {
      claimId: id,
      sourceDocumentId: document.id,
      sourceSegmentId: segmentId,
      sourceQuote,
      reviewState,
      ...overrides.provenance,
    },
  };

  return { claim, document };
};

type ComposeOverrides = {
  readonly claims?: readonly FinancialClaim[];
  readonly documents?: readonly SourceDocument[];
};

const compose = (
  reconciliation: ReconciliationResult,
  fixtures: readonly Fixture[] = [],
  overrides: ComposeOverrides = {},
) =>
  composeSafeReconciliationResult({
    findingId: "finding-1",
    itemId: "item-1",
    createdAt: "2026-08-13T10:00:00.000Z",
    reconciliation,
    claims: overrides.claims ?? fixtures.map(({ claim }) => claim),
    documents: overrides.documents ?? fixtures.map(({ document }) => document),
  });

const composed = (result: ReturnType<typeof compose>) => {
  expect(result.status).toBe("composed");
  if (result.status !== "composed") throw new Error(`Expected composed result, received ${result.reason}`);
  return result;
};

const visibleText = (result: ReturnType<typeof composed>) =>
  [
    result.finding.title,
    result.finding.summary,
    result.finding.whyItMatters,
    result.finding.suggestedAction,
    result.resultViewModel.title,
    result.resultViewModel.summary,
    ...result.resultViewModel.evidenceFound.flatMap((item) => [item.label, item.value]),
    ...result.resultViewModel.evidenceContext.flatMap((item) => [item.label, item.value]),
    ...result.resultViewModel.uncertainty,
    ...result.resultViewModel.cannotKnow,
    ...result.resultViewModel.safetyNotes,
  ].join(" ");

const weeklyAgreement = (
  claimIds: readonly [string, string] = ["a", "b"],
  applicability: ComparableApplicability = SAME_PERIOD,
): ReconciliationResult => ({
  state: "agreement",
  claimIds,
  amountMinor: 48_600,
  currency: "GBP",
  cadence: "weekly",
  applicability,
});

const makeDecision = (derivedFacts: DecisionDerivedFact[]): DecisionResult => ({
  documentType: "care_fee_reconciliation",
  title: "Care fee comparison",
  plainEnglishSummary: "Two source values were compared.",
  caseStrength: "not_enough_information",
  strengthLabel: "Document comparison only",
  whatThisLooksLike: "A deterministic comparison.",
  possibleGrounds: [],
  confidence: { level: "high", reason: "The result came from a deterministic comparison." },
  uncertainty: [],
  cannotKnow: ["Whether either amount should apply."],
  evidenceNeeded: [],
  deadlines: [],
  risks: [],
  nextSteps: [],
  safetyNotes: [],
  amountTreatment: "no_money_counted",
  sourceFacts: [],
  derivedFacts,
});

describe("safe reconciliation result composition", () => {
  it("owns the Care Fee reconciliation document type as the Phase-5 addition", () => {
    const documentType: DecisionDocumentType = "care_fee_reconciliation";
    expect(documentType).toBe("care_fee_reconciliation");
  });

  it("presents invoice-period agreement with exact decision context and applicability", () => {
    const first = fixture("assessment", { amountMinor: 48_600, cadence: "invoice_period_total" });
    const second = fixture("invoice", { amountMinor: 48_600, cadence: "invoice_period_total" });
    const applicability = { ...SAME_PERIOD };
    const result = composed(compose({
      state: "agreement",
      claimIds: [first.claim.id, second.claim.id],
      amountMinor: 48_600,
      currency: "GBP",
      cadence: "invoice_period_total",
      applicability,
    }, [first, second]));
    const derived = result.resultViewModel.evidenceContext[0];
    const text = visibleText(result).toLowerCase();

    expect(result.finding.category).toBe("admin_dispute");
    expect(result.finding.urgency).toBe("low");
    expect(result.resultViewModel.evidenceFound).toHaveLength(2);
    expect(result.resultViewModel.evidenceContext).toHaveLength(1);
    expect(derived).toMatchObject({
      kind: "decision_derived",
      label: "Comparison result",
      value: "These two safely comparable amounts agree.",
      inputClaimIds: ["assessment", "invoice"],
      decisionContext: { kind: "financial_reconciliation", state: "agreement" },
      applicability,
    });
    expect(derived.applicability).toBe(applicability);
    expect(derived).not.toHaveProperty("sourceQuote");
    expect(derived).not.toHaveProperty("trace");
    expect(text).toContain("agree with each other");
    expect(text).not.toMatch(/\bcorrect\b|\bapproved?\b|\bentitled\b|\bliability\b|\bowed\b|overcharg|refund|reimburse|\billegal\b|\bunlawful\b/);
  });

  it("preserves recurring shared applicability for agreement without reconstruction", () => {
    const first = fixture("a", { periodStart: "2026-01-01", periodEnd: "2026-01-31" });
    const second = fixture("b", { periodStart: "2026-01-15", periodEnd: "2026-02-15" });
    const applicability = { ...OVERLAP };
    const result = composed(compose(weeklyAgreement(["a", "b"], applicability), [first, second]));

    expect(result.resultViewModel.evidenceContext[0]).toMatchObject({
      inputClaimIds: ["a", "b"],
      decisionContext: { kind: "financial_reconciliation", state: "agreement" },
      applicability,
    });
    expect(result.resultViewModel.evidenceContext[0].applicability).toBe(applicability);
  });

  it("presents invoice-period disagreement with the Phase-4 absolute difference", () => {
    const first = fixture("assessment", { amountMinor: 48_600, cadence: "invoice_period_total" });
    const second = fixture("invoice", { amountMinor: 52_100, cadence: "invoice_period_total" });
    const applicability = { ...SAME_PERIOD };
    const result = composed(compose({
      state: "disagreement",
      claimIds: [first.claim.id, second.claim.id],
      amountsMinor: [48_600, 52_100],
      differenceMinor: 3_500,
      differenceKind: "absolute",
      currency: "GBP",
      cadence: "invoice_period_total",
      applicability,
    }, [first, second]));
    const derived = result.resultViewModel.evidenceContext[0];
    const text = visibleText(result).toLowerCase();

    expect(result.resultViewModel.evidenceFound.map(({ value }) => value)).toEqual([
      "£486.00 for the stated invoice period",
      "£521.00 for the stated invoice period",
    ]);
    expect(derived).toMatchObject({
      kind: "decision_derived",
      label: "Absolute difference",
      value: "£35.00 for the stated invoice period",
      inputClaimIds: ["assessment", "invoice"],
      decisionContext: {
        kind: "financial_reconciliation",
        state: "disagreement",
        differenceKind: "absolute",
      },
      applicability,
    });
    expect(derived.applicability).toBe(applicability);
    expect(derived).not.toHaveProperty("sourceQuote");
    expect(derived).not.toHaveProperty("trace");
    expect(text).toContain("cannot determine");
    expect(text).not.toMatch(/overcharg|underpay|\bowed\b|refund due|reimburse|liability|increased|decreased|new amount|old amount/);
  });

  it("preserves reversed Phase-4 input order and recurring shared applicability", () => {
    const assessment = fixture("assessment", {
      amountMinor: 48_600,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    });
    const invoice = fixture("invoice", {
      amountMinor: 52_100,
      periodStart: "2026-01-15",
      periodEnd: "2026-02-15",
    });
    const applicability = { ...OVERLAP };
    const result = composed(compose({
      state: "disagreement",
      claimIds: ["invoice", "assessment"],
      amountsMinor: [52_100, 48_600],
      differenceMinor: 3_500,
      differenceKind: "absolute",
      currency: "GBP",
      cadence: "weekly",
      applicability,
    }, [assessment, invoice]));

    expect(result.resultViewModel.evidenceFound.map(({ value }) => value)).toEqual([
      "£521.00 per week",
      "£486.00 per week",
    ]);
    expect(result.resultViewModel.evidenceContext[0]).toMatchObject({
      inputClaimIds: ["invoice", "assessment"],
      decisionContext: {
        kind: "financial_reconciliation",
        state: "disagreement",
        differenceKind: "absolute",
      },
      applicability,
    });
    expect(result.resultViewModel.evidenceContext[0].applicability).toBe(applicability);
  });

  it("does not independently recalculate a Phase-4 difference", () => {
    const first = fixture("a", { amountMinor: 48_600 });
    const second = fixture("b", { amountMinor: 52_100 });
    const result = composed(compose({
      state: "disagreement",
      claimIds: ["a", "b"],
      amountsMinor: [48_600, 52_100],
      differenceMinor: 1_234,
      differenceKind: "absolute",
      currency: "GBP",
      cadence: "weekly",
      applicability: SAME_PERIOD,
    }, [first, second]));

    expect(result.resultViewModel.evidenceContext[0]?.value).toBe("£12.34 per week");
  });

  it("preserves genuine source claim, document, segment, page, and quote identity", () => {
    const first = fixture("assessment", { amountMinor: 48_600 });
    const second = fixture("invoice", { amountMinor: 52_100 });
    const result = composed(compose({
      state: "disagreement",
      claimIds: ["assessment", "invoice"],
      amountsMinor: [48_600, 52_100],
      differenceMinor: 3_500,
      differenceKind: "absolute",
      currency: "GBP",
      cadence: "weekly",
      applicability: SAME_PERIOD,
    }, [first, second]));

    expect(result.resultViewModel.evidenceFound[0]).toMatchObject({
      kind: "source",
      sourceQuote: first.claim.provenance.sourceQuote,
      trace: {
        claimId: "assessment",
        sourceDocumentId: first.document.id,
        sourceDocumentName: first.document.displayName,
        sourceSegmentId: first.claim.provenance.sourceSegmentId,
        pageNumber: 2,
      },
    });
  });

  it("fails closed for a missing claim", () => {
    expect(compose(weeklyAgreement(["missing-a", "missing-b"]))).toEqual({
      status: "not_composed",
      reason: "missing_claim",
    });
  });

  it("fails closed for a missing document or required segment", () => {
    const first = fixture("a");
    const second = fixture("b");

    expect(compose(weeklyAgreement(), [first, second], {
      documents: [second.document],
    })).toEqual({ status: "not_composed", reason: "missing_source_document" });

    expect(compose(weeklyAgreement(), [first, second], {
      documents: [{ ...first.document, segments: [] }, second.document],
    })).toEqual({ status: "not_composed", reason: "missing_source_segment" });
  });

  it("fails closed for malformed provenance and claim-ID mismatch", () => {
    const first = fixture("a");
    const second = fixture("b");
    const malformed = { ...first.claim, provenance: undefined } as unknown as FinancialClaim;
    const mismatched = {
      ...first.claim,
      provenance: { ...first.claim.provenance, claimId: "different-claim" },
    };

    expect(compose(weeklyAgreement(), [first, second], {
      claims: [malformed, second.claim],
    })).toEqual({ status: "not_composed", reason: "invalid_provenance" });
    expect(compose(weeklyAgreement(), [first, second], {
      claims: [mismatched, second.claim],
    })).toEqual({ status: "not_composed", reason: "provenance_claim_id_mismatch" });
  });

  it("fails closed for a malformed runtime claim object", () => {
    const first = fixture("a");
    const second = fixture("b");

    expect(compose(weeklyAgreement(), [first, second], {
      claims: [null as unknown as FinancialClaim, second.claim],
    })).toEqual({ status: "not_composed", reason: "malformed_claim" });
  });

  it.each([
    ["review_required", "review_required"],
    ["unavailable", "source_unavailable"],
  ] as const)("fails closed for %s source evidence", (reviewState, expectedReason) => {
    const first = fixture("a", {}, reviewState);
    const second = fixture("b");

    expect(compose(weeklyAgreement(), [first, second])).toEqual({
      status: "not_composed",
      reason: expectedReason,
    });
  });

  it("fails closed for unsupported or ambiguous quote support without fabricating provenance", () => {
    const first = fixture("a");
    const second = fixture("b");
    const unsupported = {
      ...first.claim,
      provenance: { ...first.claim.provenance, sourceQuote: "This quote is not in the source." },
    };
    const ambiguousDocument = {
      ...first.document,
      segments: [{
        ...first.document.segments[0],
        text: `${first.claim.provenance.sourceQuote}\n${first.claim.provenance.sourceQuote}`,
      }],
    };

    expect(compose(weeklyAgreement(), [first, second], {
      claims: [unsupported, second.claim],
    })).toEqual({ status: "not_composed", reason: "quote_not_found" });
    const ambiguous = compose(weeklyAgreement(), [first, second], {
      documents: [ambiguousDocument, second.document],
    });
    expect(ambiguous).toEqual({ status: "not_composed", reason: "ambiguous_quote" });
    expect(ambiguous).not.toHaveProperty("finding");
    expect(ambiguous).not.toHaveProperty("resultViewModel");
  });

  it("fails closed when validated provenance would produce a malformed source trace", () => {
    const first = fixture("a");
    const second = fixture("b");

    expect(compose(weeklyAgreement(), [first, second], {
      documents: [{ ...first.document, displayName: "" }, second.document],
    })).toEqual({ status: "not_composed", reason: "malformed_source_trace" });
    expect(compose(weeklyAgreement(), [first, second], {
      documents: [
        { ...first.document, displayName: 42 } as unknown as SourceDocument,
        second.document,
      ],
    })).toEqual({ status: "not_composed", reason: "malformed_source_trace" });
  });

  it.each([
    [
      "amount",
      (first: Fixture, second: Fixture) => compose(weeklyAgreement(), [first, second], {
        claims: [{ ...first.claim, amountMinor: 49_000 }, second.claim],
      }),
      "inconsistent_claim_amount",
    ],
    [
      "currency",
      (first: Fixture, second: Fixture) => compose(weeklyAgreement(), [first, second], {
        claims: [{ ...first.claim, currency: "unknown" }, second.claim],
      }),
      "inconsistent_claim_currency",
    ],
    [
      "cadence",
      (first: Fixture, second: Fixture) => compose(weeklyAgreement(), [first, second], {
        claims: [{ ...first.claim, cadence: "monthly" }, second.claim],
      }),
      "inconsistent_claim_cadence",
    ],
  ] as const)("fails closed when a supplied claim contradicts Phase 4 %s", (_field, act, reason) => {
    const first = fixture("a");
    const second = fixture("b");
    expect(act(first, second)).toEqual({ status: "not_composed", reason });
  });

  it("fails closed for wrong, duplicate, extra, or substituted claim identity", () => {
    const first = fixture("a");
    const second = fixture("b");
    const extra = fixture("c");
    const duplicate = { ...second.claim, id: "a", provenance: { ...second.claim.provenance, claimId: "a" } };
    const substituted = { ...second.claim, providerId: "different-care-home" };

    expect(compose(weeklyAgreement(["a", "missing"]), [first, second])).toEqual({
      status: "not_composed",
      reason: "missing_claim",
    });
    expect(compose(weeklyAgreement(), [first, second], {
      claims: [first.claim, duplicate],
    })).toEqual({ status: "not_composed", reason: "duplicate_claim" });
    expect(compose(weeklyAgreement(), [first, second, extra])).toEqual({
      status: "not_composed",
      reason: "inconsistent_claim_set",
    });
    expect(compose(weeklyAgreement(), [first, second], {
      claims: [first.claim, substituted],
    })).toEqual({ status: "not_composed", reason: "inconsistent_claim_dimensions" });
  });

  it("fails closed for equal unsafe lookalikes and contradictory applicability", () => {
    const first = fixture("a");
    const differentProvider = fixture("b", { providerId: "different-care-home" });
    const second = fixture("b");
    const contradictoryApplicability = {
      kind: "same_explicit_period",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
    } as const;

    expect(compose(weeklyAgreement(), [first, differentProvider])).toEqual({
      status: "not_composed",
      reason: "inconsistent_claim_dimensions",
    });
    expect(compose(weeklyAgreement(["a", "b"], contradictoryApplicability), [first, second])).toEqual({
      status: "not_composed",
      reason: "inconsistent_applicability",
    });
  });

  it.each([
    ["different_concept", "different types of charge or contribution"],
    ["different_cadence", "different payment periods"],
    ["different_subject", "different people"],
    ["different_provider", "different providers"],
    ["non_overlapping_periods", "cover different periods"],
    ["different_effective_dates", "different effective dates"],
    ["missing_period_context", "not enough period information"],
    ["source_review_required", "checking against the original document"],
    ["same_claim", "same source claim cannot be compared with itself"],
  ] as const)("explains %s without source facts, arithmetic, or enum wording", (reason, expected) => {
    const result = composed(compose({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: [reason],
    }));
    const text = visibleText(result).toLowerCase();

    expect(text).toContain(expected);
    expect(text).not.toContain(reason);
    expect(result.resultViewModel.evidenceFound).toEqual([]);
    expect(result.resultViewModel.evidenceContext).toEqual([]);
    expect(text).not.toMatch(/£|difference:\s*£|discrepancy|overcharg|underpay|refund due/);
  });

  it("preserves stable Phase-3 reason order and has an explanation for every reason", () => {
    expect(Object.keys(RECONCILIATION_REASON_EXPLANATIONS).sort()).toEqual([...COMPARABILITY_REASONS].sort());
    const reasons = ["different_currency", "different_cadence", "missing_period_context"] as const;
    const result = composed(compose({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons,
    }));

    expect(result.resultViewModel.uncertainty).toEqual(
      reasons.map((reason) => RECONCILIATION_REASON_EXPLANATIONS[reason]),
    );
    expect(result.resultViewModel.evidenceContext).toEqual([]);
  });

  it("keeps malformed reconciliation-derived context out of the Result View Model", () => {
    const malformed = {
      kind: "decision_derived",
      label: "Unsafe agreement",
      value: "Omitted",
      inputClaimIds: ["a", "b"],
      decisionContext: {
        kind: "financial_reconciliation",
        state: "agreement",
        differenceKind: "absolute",
      },
      applicability: SAME_PERIOD,
    } as unknown as DecisionDerivedFact;

    expect(buildResultViewModel({ decisionResult: makeDecision([malformed]) }).evidenceContext).toEqual([]);
  });

  it("keeps all generated production strings inside the language and chronology boundary", () => {
    const prohibited = /overcharged|undercharged|\bowed\b|\bentitled\b|\billegal\b|\bunlawful\b|\bwrong\b|\bmistake\b|refund due|reimbursement due|compensation|\bstole\b|\bfraud\b|increased|decreased|new amount|old amount|\blatest\b|\bcurrent\b|superseded|replaced/i;
    const first = fixture("a", { amountMinor: 48_600 });
    const second = fixture("b", { amountMinor: 52_100 });
    const outputs = [
      composed(compose(weeklyAgreement(), [first, { ...second, claim: { ...second.claim, amountMinor: 48_600 } }])),
      composed(compose({
        state: "disagreement",
        claimIds: ["a", "b"],
        amountsMinor: [48_600, 52_100],
        differenceMinor: 3_500,
        differenceKind: "absolute",
        currency: "GBP",
        cadence: "weekly",
        applicability: SAME_PERIOD,
      }, [first, second])),
      ...COMPARABILITY_REASONS.map((reason: ComparabilityReason) => composed(compose({
        state: "not_safely_comparable",
        claimIds: ["a", "b"],
        reasons: [reason],
      }))),
    ];

    for (const output of outputs) expect(visibleText(output)).not.toMatch(prohibited);
  });
});
