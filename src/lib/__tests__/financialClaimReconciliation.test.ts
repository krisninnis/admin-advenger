import { describe, expect, it } from "vitest";
import { compareFinancialClaims } from "../financialClaimComparability";
import { reconcileFinancialClaims } from "../financialClaimReconciliation";
import type { FinancialClaim } from "../financialClaims";
import type { SourceDocument, SourceReviewState } from "../sourceProvenance";

type Fixture = {
  readonly claim: FinancialClaim;
  readonly document: SourceDocument;
};

const fixture = (
  id: string,
  overrides: Partial<FinancialClaim> = {},
  reviewState: SourceReviewState = "confirmed",
): Fixture => {
  const sourceQuote = [
    `Claim ${id}`,
    `subject ${overrides.subjectId ?? "resident-1"}`,
    `provider ${overrides.providerId ?? "care-home-1"}`,
    `amount ${overrides.amountMinor ?? 48_600}`,
  ].join("; ");
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
    segments: [
      {
        id: segmentId,
        kind: "page",
        order: 1,
        pageNumber: 1,
        text: sourceQuote,
      },
    ],
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
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
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

const reconcile = (first: Fixture, second: Fixture) =>
  reconcileFinancialClaims(first.claim, second.claim, [first.document, second.document]);

describe("agreement", () => {
  it("records agreement for equal comparable amounts from distinct sources", () => {
    const first = fixture("assessment", { amountMinor: 48_600 });
    const second = fixture("invoice", { amountMinor: 48_600 });

    expect(reconcile(first, second)).toEqual({
      state: "agreement",
      claimIds: ["assessment", "invoice"],
      amountMinor: 48_600,
      currency: "GBP",
      cadence: "weekly",
      applicability: {
        kind: "same_explicit_period",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    });
    expect(first.document.id).not.toBe(second.document.id);
  });

  it.each([0, 1, 48_650, Number.MAX_SAFE_INTEGER])(
    "supports equal valid integer-pence amount %s",
    (amountMinor) => {
      expect(
        reconcile(
          fixture("a", { amountMinor }),
          fixture("b", { amountMinor }),
        ),
      ).toMatchObject({ state: "agreement", amountMinor });
    },
  );

  it("does not turn self-comparison into agreement", () => {
    const same = fixture("same");
    const result = reconcile(same, same);

    expect(result).toEqual({
      state: "not_safely_comparable",
      claimIds: ["same", "same"],
      reasons: ["same_claim"],
    });
    expect(result).not.toHaveProperty("amountMinor");
  });
});

describe("disagreement and integer-pence arithmetic", () => {
  it("returns the absolute difference for unequal comparable claims", () => {
    expect(
      reconcile(
        fixture("assessment", { amountMinor: 48_600 }),
        fixture("invoice", { amountMinor: 52_100 }),
      ),
    ).toEqual({
      state: "disagreement",
      claimIds: ["assessment", "invoice"],
      amountsMinor: [48_600, 52_100],
      differenceMinor: 3_500,
      differenceKind: "absolute",
      currency: "GBP",
      cadence: "weekly",
      applicability: {
        kind: "same_explicit_period",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    });
  });

  it.each([
    [10, 30, 20],
    [100_000, 99_999, 1],
    [0, 1, 1],
    [0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ] as const)(
    "calculates %s versus %s as exactly %s pence",
    (firstAmount, secondAmount, differenceMinor) => {
      expect(
        reconcile(
          fixture("a", { amountMinor: firstAmount }),
          fixture("b", { amountMinor: secondAmount }),
        ),
      ).toMatchObject({
        state: "disagreement",
        differenceMinor,
        differenceKind: "absolute",
      });
    },
  );

  it("has no hidden directionality", () => {
    const first = fixture("a", { amountMinor: 48_600 });
    const second = fixture("b", { amountMinor: 52_100 });
    const forward = reconcile(first, second);
    const reverse = reconcile(second, first);

    expect(forward).toMatchObject({
      state: "disagreement",
      amountsMinor: [48_600, 52_100],
      differenceMinor: 3_500,
    });
    expect(reverse).toMatchObject({
      state: "disagreement",
      amountsMinor: [52_100, 48_600],
      differenceMinor: 3_500,
    });
    expect(forward.claimIds).toEqual(["a", "b"]);
    expect(reverse.claimIds).toEqual(["b", "a"]);
  });
});

describe("applicability propagation", () => {
  it("preserves exact invoice-total applicability for agreement", () => {
    const result = reconcile(
      fixture("invoice-a", { cadence: "invoice_period_total", amountMinor: 50_000 }),
      fixture("invoice-b", { cadence: "invoice_period_total", amountMinor: 50_000 }),
    );

    expect(result).toMatchObject({
      state: "agreement",
      cadence: "invoice_period_total",
      applicability: {
        kind: "same_explicit_period",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    });
  });

  it("preserves exact invoice-total applicability for disagreement", () => {
    const result = reconcile(
      fixture("invoice-a", { cadence: "invoice_period_total", amountMinor: 50_000 }),
      fixture("invoice-b", { cadence: "invoice_period_total", amountMinor: 53_500 }),
    );

    expect(result).toMatchObject({
      state: "disagreement",
      amountsMinor: [50_000, 53_500],
      differenceMinor: 3_500,
      cadence: "invoice_period_total",
      applicability: {
        kind: "same_explicit_period",
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      },
    });
  });

  it("propagates the exact Phase 3 intersection for approved recurring overlap", () => {
    const result = reconcile(
      fixture("a", {
        amountMinor: 48_600,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      }),
      fixture("b", {
        amountMinor: 52_100,
        periodStart: "2026-01-15",
        periodEnd: "2026-02-14",
      }),
    );

    expect(result).toMatchObject({
      state: "disagreement",
      applicability: {
        kind: "overlapping_explicit_periods",
        periodStart: "2026-01-15",
        periodEnd: "2026-01-31",
      },
    });
  });

  it("preserves the same shared recurring intersection for reversed inputs", () => {
    const first = fixture("a", {
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    });
    const second = fixture("b", {
      periodStart: "2026-01-15",
      periodEnd: "2026-02-14",
    });
    const expectedApplicability = {
      kind: "overlapping_explicit_periods",
      periodStart: "2026-01-15",
      periodEnd: "2026-01-31",
    } as const;

    expect(reconcile(first, second)).toMatchObject({
      state: "agreement",
      claimIds: ["a", "b"],
      applicability: expectedApplicability,
    });
    expect(reconcile(second, first)).toMatchObject({
      state: "agreement",
      claimIds: ["b", "a"],
      applicability: expectedApplicability,
    });
  });
});

describe("non-comparable propagation", () => {
  it.each([
    [
      "different concept",
      { concept: "resident_contribution" as const },
      { concept: "total_care_home_fee" as const },
      "different_concept",
    ],
    [
      "unknown currency",
      {},
      { currency: "unknown" as const },
      "missing_currency_context",
    ],
    [
      "different cadence",
      { cadence: "weekly" as const },
      { cadence: "monthly" as const },
      "different_cadence",
    ],
    [
      "different subject",
      { subjectId: "resident-a" },
      { subjectId: "resident-b" },
      "different_subject",
    ],
    [
      "different provider",
      { providerId: "home-a" },
      { providerId: "home-b" },
      "different_provider",
    ],
    [
      "missing identity",
      { subjectId: "resident-a" },
      { subjectId: "unknown" },
      "missing_subject_context",
    ],
    [
      "non-overlapping periods",
      { periodStart: "2026-01-01", periodEnd: "2026-01-31" },
      { periodStart: "2026-06-01", periodEnd: "2026-06-30" },
      "non_overlapping_periods",
    ],
    [
      "different effective dates",
      {
        periodStart: undefined,
        periodEnd: undefined,
        effectiveDate: "2026-01-01",
      },
      {
        periodStart: undefined,
        periodEnd: undefined,
        effectiveDate: "2026-06-01",
      },
      "different_effective_dates",
    ],
    [
      "missing period",
      { periodStart: undefined, periodEnd: undefined },
      { periodStart: undefined, periodEnd: undefined },
      "missing_period_context",
    ],
    [
      "recurring versus adjustment",
      {},
      {
        concept: "one_off_adjustment" as const,
        cadence: "one_off" as const,
        payerRole: "unknown" as const,
      },
      "recurring_vs_adjustment",
    ],
  ] as const)(
    "propagates %s without arithmetic",
    (_label, firstOverrides, secondOverrides, expectedReason) => {
      const first = fixture("a", firstOverrides);
      const second = fixture("b", secondOverrides);
      const comparison = compareFinancialClaims(
        first.claim,
        second.claim,
        [first.document, second.document],
      );
      const result = reconcile(first, second);

      expect(comparison.status).toBe("not_safely_comparable");
      expect(result).toEqual({
        state: "not_safely_comparable",
        claimIds: comparison.claimIds,
        reasons:
          comparison.status === "not_safely_comparable" ? comparison.reasons : [],
      });
      expect(result.state === "not_safely_comparable" ? result.reasons : [])
        .toContain(expectedReason);
      expect(result).not.toHaveProperty("amountMinor");
      expect(result).not.toHaveProperty("amountsMinor");
      expect(result).not.toHaveProperty("differenceMinor");
    },
  );

  it("propagates source review failure", () => {
    const first = fixture("a");
    const second = fixture("b", {}, "review_required");

    expect(reconcile(first, second)).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["source_review_required"],
    });
  });

  it.each([
    [
      "overlapping non-identical invoice periods",
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountMinor: 48_600 },
      { periodStart: "2026-01-15", periodEnd: "2026-02-14", amountMinor: 52_100 },
    ],
    [
      "a contained non-identical invoice period",
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountMinor: 48_600 },
      { periodStart: "2026-01-10", periodEnd: "2026-01-20", amountMinor: 52_100 },
    ],
    [
      "equal amounts over unsafe invoice periods",
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountMinor: 50_000 },
      { periodStart: "2026-01-15", periodEnd: "2026-02-14", amountMinor: 50_000 },
    ],
  ] as const)("blocks %s without arithmetic", (_label, firstPeriod, secondPeriod) => {
    const result = reconcile(
      fixture("invoice-a", { cadence: "invoice_period_total", ...firstPeriod }),
      fixture("invoice-b", { cadence: "invoice_period_total", ...secondPeriod }),
    );

    expect(result).toEqual({
      state: "not_safely_comparable",
      claimIds: ["invoice-a", "invoice-b"],
      reasons: ["missing_period_context"],
    });
    expect(result).not.toHaveProperty("amountMinor");
    expect(result).not.toHaveProperty("differenceMinor");
    expect(result).not.toHaveProperty("applicability");
  });

  it.each([
    ["start-only period", { periodStart: "2026-01-01", periodEnd: undefined }],
    ["end-only period", { periodStart: undefined, periodEnd: "2026-01-31" }],
  ] as const)("fails closed for a %s", (_label, partialPeriod) => {
    expect(
      reconcile(
        fixture("a", partialPeriod),
        fixture("b"),
      ),
    ).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["missing_period_context"],
    });
  });

  it("preserves a payer-role mismatch", () => {
    expect(
      reconcile(
        fixture("a", { payerRole: "resident" }),
        fixture("b", { payerRole: "local_authority" }),
      ),
    ).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["different_payer_role"],
    });
  });

  it("preserves a payee-role mismatch", () => {
    expect(
      reconcile(
        fixture("a", { payeeRole: "care_provider" }),
        fixture("b", { payeeRole: "local_authority" }),
      ),
    ).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["different_payee_role"],
    });
  });

  it("fails closed when provenance is missing", () => {
    const first = fixture("a");
    const second = fixture("b");
    const missingProvenance = {
      ...first.claim,
      provenance: undefined,
    } as unknown as FinancialClaim;

    expect(
      reconcileFinancialClaims(missingProvenance, second.claim, [
        first.document,
        second.document,
      ]),
    ).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["invalid_claim"],
    });
  });

  it("fails closed when claim and provenance IDs differ", () => {
    const first = fixture("a");
    const second = fixture("b");
    const mismatched: Fixture = {
      ...first,
      claim: {
        ...first.claim,
        provenance: {
          ...first.claim.provenance,
          claimId: "substituted-claim",
        },
      },
    };

    expect(reconcile(mismatched, second)).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["invalid_claim"],
    });
  });

  it("fails closed for unavailable source evidence", () => {
    expect(reconcile(fixture("a", {}, "unavailable"), fixture("b"))).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["source_review_required"],
    });
  });

  it("fails closed for ambiguous repeated source support", () => {
    const first = fixture("a");
    const second = fixture("b");
    const repeatedText = `${first.claim.provenance.sourceQuote}\n${first.claim.provenance.sourceQuote}`;
    const ambiguous: Fixture = {
      ...first,
      document: {
        ...first.document,
        extractedText: repeatedText,
        segments: [{ ...first.document.segments[0], text: repeatedText }],
      },
    };

    expect(reconcile(ambiguous, second)).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["source_review_required"],
    });
  });

  it("fails closed for a malformed non-object runtime claim", () => {
    const second = fixture("b");

    expect(
      reconcileFinancialClaims(
        null as unknown as FinancialClaim,
        second.claim,
        [second.document],
      ),
    ).toEqual({
      state: "not_safely_comparable",
      claimIds: ["invalid", "b"],
      reasons: ["invalid_claim"],
    });
  });

  it("propagates invalid claim failure", () => {
    const result = reconcile(
      fixture("a"),
      fixture("b", { amountMinor: -1 }),
    );

    expect(result).toEqual({
      state: "not_safely_comparable",
      claimIds: ["a", "b"],
      reasons: ["invalid_claim"],
    });
  });

  it("preserves a stable multi-reason result exactly", () => {
    const first = fixture("a");
    const second = fixture("b", {
      concept: "total_care_home_fee",
      subjectId: "resident-b",
      providerId: "home-b",
      cadence: "monthly",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
    const documents = [first.document, second.document];
    const comparison = compareFinancialClaims(first.claim, second.claim, documents);
    const result = reconcileFinancialClaims(first.claim, second.claim, documents);

    expect(comparison.status).toBe("not_safely_comparable");
    expect(comparison).toMatchObject({
      reasons: [
        "different_concept",
        "different_subject",
        "different_provider",
        "different_cadence",
        "non_overlapping_periods",
      ],
    });
    expect(result).toEqual({
      state: "not_safely_comparable",
      claimIds: comparison.claimIds,
      reasons:
        comparison.status === "not_safely_comparable" ? comparison.reasons : [],
    });
  });
});

describe("safety boundaries", () => {
  it("keeps agreement stable under input reversal", () => {
    const first = fixture("a", { amountMinor: 48_600 });
    const second = fixture("b", { amountMinor: 48_600 });

    expect(reconcile(first, second)).toMatchObject({
      state: "agreement",
      claimIds: ["a", "b"],
      amountMinor: 48_600,
    });
    expect(reconcile(second, first)).toMatchObject({
      state: "agreement",
      claimIds: ["b", "a"],
      amountMinor: 48_600,
    });
  });

  it("never turns equal lookalike amounts into agreement", () => {
    const cases = [
      [
        fixture("concept-a", { amountMinor: 50_000 }),
        fixture("concept-b", {
          amountMinor: 50_000,
          concept: "total_care_home_fee",
        }),
      ],
      [
        fixture("cadence-a", { amountMinor: 50_000, cadence: "monthly" }),
        fixture("cadence-b", { amountMinor: 50_000, cadence: "four_weekly" }),
      ],
      [
        fixture("subject-a", { amountMinor: 50_000, subjectId: "resident-a" }),
        fixture("subject-b", { amountMinor: 50_000, subjectId: "resident-b" }),
      ],
    ] as const;

    for (const [first, second] of cases) {
      const result = reconcile(first, second);
      expect(result.state).toBe("not_safely_comparable");
      expect(result).not.toHaveProperty("differenceMinor");
    }
  });

  it("does not turn different effective dates into changed-over-time", () => {
    const result = reconcile(
      fixture("a", { effectiveDate: "2026-01-01" }),
      fixture("b", { effectiveDate: "2026-06-01" }),
    );

    expect(result.state).toBe("not_safely_comparable");
    expect(result).not.toHaveProperty("earlierClaimId");
    expect(result).not.toHaveProperty("laterClaimId");
  });

  it("retains only claim identity, typed arithmetic, and comparison reasons", () => {
    const result = reconcile(
      fixture("a", { amountMinor: 48_600 }),
      fixture("b", { amountMinor: 52_100 }),
    );

    expect(result).not.toHaveProperty("summary");
    expect(result).not.toHaveProperty("finding");
    expect(result).not.toHaveProperty("amountOwed");
    expect(result).not.toHaveProperty("overcharge");
    expect(result).not.toHaveProperty("legalConclusion");
  });
});
