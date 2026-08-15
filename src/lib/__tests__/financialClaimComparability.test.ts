import { describe, expect, it } from "vitest";
import {
  compareFinancialClaims,
  type ComparabilityReason,
} from "../financialClaimComparability";
import {
  extractFinancialClaimResults,
  type FinancialClaim,
} from "../financialClaims";
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

const compare = (first: Fixture, second: Fixture) =>
  compareFinancialClaims(first.claim, second.claim, [first.document, second.document]);

const reasons = (first: Fixture, second: Fixture): readonly ComparabilityReason[] => {
  const result = compare(first, second);
  expect(result.status).toBe("not_safely_comparable");
  return result.status === "not_safely_comparable" ? result.reasons : [];
};

describe("comparable controls", () => {
  it("permits the same typed dimensions and exact period", () => {
    const result = compare(fixture("a"), fixture("b"));

    expect(result).toEqual({
      status: "comparable",
      claimIds: ["a", "b"],
      dimensions: {
        concept: "resident_contribution",
        subjectId: "resident-1",
        providerId: "care-home-1",
        payerRole: "resident",
        payeeRole: "care_provider",
        currency: "GBP",
        cadence: "weekly",
        applicability: {
          kind: "same_explicit_period",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
        },
      },
    });
  });

  it.each([48_600, 52_100])(
    "does not use amount %s to decide comparability",
    (amountMinor) => {
      const result = compare(
        fixture("a", { amountMinor: 48_600 }),
        fixture("b", { amountMinor }),
      );

      expect(result.status).toBe("comparable");
      expect(result).not.toHaveProperty("differenceMinor");
      expect(result).not.toHaveProperty("amountsEqual");
      expect(result).not.toHaveProperty("reconciliationState");
    },
  );

  it("permits distinct documents when every required dimension matches", () => {
    const first = fixture("assessment");
    const second = fixture("invoice");
    const result = compare(first, second);

    expect(first.document.id).not.toBe(second.document.id);
    expect(result.status).toBe("comparable");
  });

  it("permits provably overlapping explicit periods", () => {
    const result = compare(
      fixture("a", { periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
      fixture("b", { periodStart: "2026-01-15", periodEnd: "2026-02-14" }),
    );

    expect(result).toMatchObject({
      status: "comparable",
      dimensions: {
        applicability: {
          kind: "overlapping_explicit_periods",
          periodStart: "2026-01-15",
          periodEnd: "2026-01-31",
        },
      },
    });
  });

  it("preserves the same recurring-rate intersection for reversed inputs", () => {
    const first = fixture("a", {
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    });
    const second = fixture("b", {
      periodStart: "2026-01-15",
      periodEnd: "2026-02-14",
    });

    const forward = compare(first, second);
    const reverse = compare(second, first);

    expect(forward).toMatchObject({
      status: "comparable",
      claimIds: ["a", "b"],
      dimensions: {
        applicability: {
          kind: "overlapping_explicit_periods",
          periodStart: "2026-01-15",
          periodEnd: "2026-01-31",
        },
      },
    });
    expect(reverse).toMatchObject({
      status: "comparable",
      claimIds: ["b", "a"],
      dimensions: {
        applicability: {
          kind: "overlapping_explicit_periods",
          periodStart: "2026-01-15",
          periodEnd: "2026-01-31",
        },
      },
    });
  });

  it("permits matching explicit effective dates when neither claim has a period", () => {
    const result = compare(
      fixture("a", {
        periodStart: undefined,
        periodEnd: undefined,
        effectiveDate: "2026-01-01",
      }),
      fixture("b", {
        periodStart: undefined,
        periodEnd: undefined,
        effectiveDate: "2026-01-01",
      }),
    );

    expect(result).toMatchObject({
      status: "comparable",
      dimensions: {
        applicability: {
          kind: "same_effective_date",
          effectiveDate: "2026-01-01",
        },
      },
    });
  });

  it("permits invoice-period totals only for exactly matching periods", () => {
    const result = compare(
      fixture("a", { cadence: "invoice_period_total" }),
      fixture("b", { cadence: "invoice_period_total" }),
    );

    expect(result).toMatchObject({
      status: "comparable",
      dimensions: {
        cadence: "invoice_period_total",
        applicability: {
          kind: "same_explicit_period",
          periodStart: "2026-01-01",
          periodEnd: "2026-01-31",
        },
      },
    });
  });
});

describe("known incompatibilities", () => {
  it("does not compare a claim with itself", () => {
    const claim = fixture("same-claim");

    expect(reasons(claim, claim)).toEqual(["same_claim"]);
  });

  it.each([
    ["total_care_home_fee", "resident_contribution"],
    ["resident_contribution", "local_authority_contribution"],
    ["nhs_contribution", "third_party_top_up"],
  ] as const)("blocks concept mismatch %s vs %s", (firstConcept, secondConcept) => {
    expect(
      reasons(
        fixture("a", { concept: firstConcept }),
        fixture("b", { concept: secondConcept }),
      ),
    ).toContain("different_concept");
  });

  it("blocks an unknown financial concept even when both values use it", () => {
    expect(
      reasons(
        fixture("a", { concept: "other_unknown_amount" }),
        fixture("b", { concept: "other_unknown_amount" }),
      ),
    ).toContain("missing_concept_context");
  });

  it("accepts GBP only when both claims state it", () => {
    expect(compare(fixture("a"), fixture("b")).status).toBe("comparable");
    expect(
      reasons(fixture("a"), fixture("b", { currency: "unknown" })),
    ).toContain("missing_currency_context");
  });

  it("rejects an unrepresentable runtime currency as an invalid claim", () => {
    expect(
      reasons(
        fixture("a"),
        fixture("b", { currency: "USD" as FinancialClaim["currency"] }),
      ),
    ).toEqual(["invalid_claim"]);
  });

  it.each([
    ["weekly", "weekly", true],
    ["monthly", "monthly", true],
    ["four_weekly", "four_weekly", true],
    ["weekly", "monthly", false],
    ["four_weekly", "monthly", false],
  ] as const)("checks cadence %s vs %s", (firstCadence, secondCadence, expected) => {
    const result = compare(
      fixture("a", { cadence: firstCadence }),
      fixture("b", { cadence: secondCadence }),
    );

    expect(result.status === "comparable").toBe(expected);
    if (!expected && result.status === "not_safely_comparable") {
      expect(result.reasons).toContain("different_cadence");
    }
  });

  it("blocks a missing cadence without guessing from the other claim", () => {
    expect(
      reasons(fixture("a"), fixture("b", { cadence: "unknown" })),
    ).toContain("missing_cadence_context");
  });

  it("separates a recurring contribution from a one-off adjustment", () => {
    const resultReasons = reasons(
      fixture("a"),
      fixture("b", {
        concept: "one_off_adjustment",
        cadence: "one_off",
        payerRole: "unknown",
      }),
    );

    expect(resultReasons).toContain("recurring_vs_adjustment");
  });

  it("does not directly compare a retrospective adjustment with a recurring claim", () => {
    const resultReasons = reasons(
      fixture("a"),
      fixture("b", {
        concept: "retrospective_adjustment",
        cadence: "one_off",
        payerRole: "unknown",
      }),
    );

    expect(resultReasons).toContain("retrospective_adjustment");
    expect(resultReasons).toContain("recurring_vs_adjustment");
  });
});

describe("identity and role context", () => {
  it("accepts the same known subject and provider", () => {
    expect(compare(fixture("a"), fixture("b")).status).toBe("comparable");
  });

  it.each([
    ["resident-1", "resident-2", "different_subject"],
    ["resident-1", "unknown", "missing_subject_context"],
    ["unknown", "unknown", "missing_subject_context"],
  ] as const)("checks subject %s vs %s", (firstSubject, secondSubject, reason) => {
    expect(
      reasons(
        fixture("a", { subjectId: firstSubject }),
        fixture("b", { subjectId: secondSubject }),
      ),
    ).toContain(reason);
  });

  it.each([
    ["care-home-1", "care-home-2", "different_provider"],
    ["care-home-1", "unknown", "missing_provider_context"],
    ["unknown", "unknown", "missing_provider_context"],
  ] as const)("checks provider %s vs %s", (firstProvider, secondProvider, reason) => {
    expect(
      reasons(
        fixture("a", { providerId: firstProvider }),
        fixture("b", { providerId: secondProvider }),
      ),
    ).toContain(reason);
  });

  it("blocks conflicting payer roles", () => {
    expect(
      reasons(
        fixture("a", { payerRole: "resident" }),
        fixture("b", { payerRole: "local_authority" }),
      ),
    ).toContain("different_payer_role");
  });

  it("blocks known versus unknown payer role", () => {
    expect(
      reasons(fixture("a"), fixture("b", { payerRole: "unknown" })),
    ).toContain("missing_payer_context");
  });

  it("blocks conflicting payee roles", () => {
    expect(
      reasons(
        fixture("a", { payeeRole: "care_provider" }),
        fixture("b", { payeeRole: "local_authority" }),
      ),
    ).toContain("different_payee_role");
  });

  it("blocks known versus unknown payee role", () => {
    expect(
      reasons(fixture("a"), fixture("b", { payeeRole: "unknown" })),
    ).toContain("missing_payee_context");
  });
});

describe("period applicability", () => {
  it.each([
    [
      "overlapping periods",
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountMinor: 48_600 },
      { periodStart: "2026-03-15", periodEnd: "2026-04-15", amountMinor: 52_100 },
    ],
    [
      "a contained period",
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountMinor: 48_600 },
      { periodStart: "2026-03-01", periodEnd: "2026-03-15", amountMinor: 52_100 },
    ],
    [
      "the same amount over different periods",
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountMinor: 48_600 },
      { periodStart: "2026-03-15", periodEnd: "2026-04-15", amountMinor: 48_600 },
    ],
  ] as const)("blocks invoice-period totals with %s", (_label, firstPeriod, secondPeriod) => {
    expect(
      reasons(
        fixture("a", { cadence: "invoice_period_total", ...firstPeriod }),
        fixture("b", { cadence: "invoice_period_total", ...secondPeriod }),
      ),
    ).toEqual(["missing_period_context"]);
  });

  it("blocks non-overlapping periods even when amount and concept match", () => {
    expect(
      reasons(
        fixture("a", { periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
        fixture("b", { periodStart: "2026-06-01", periodEnd: "2026-06-30" }),
      ),
    ).toContain("non_overlapping_periods");
  });

  it.each([
    ["one period missing", undefined, undefined, "2026-01-01", "2026-01-31"],
    ["both periods missing", undefined, undefined, undefined, undefined],
    ["partial first period", "2026-01-01", undefined, "2026-01-01", "2026-01-31"],
    ["partial end-only period", undefined, "2026-01-31", "2026-01-01", "2026-01-31"],
  ] as const)(
    "blocks %s",
    (_label, firstStart, firstEnd, secondStart, secondEnd) => {
      expect(
        reasons(
          fixture("a", { periodStart: firstStart, periodEnd: firstEnd }),
          fixture("b", { periodStart: secondStart, periodEnd: secondEnd }),
        ),
      ).toContain("missing_period_context");
    },
  );

  it("blocks different effective dates without an explicit shared period", () => {
    expect(
      reasons(
        fixture("a", {
          periodStart: undefined,
          periodEnd: undefined,
          effectiveDate: "2026-01-01",
        }),
        fixture("b", {
          periodStart: undefined,
          periodEnd: undefined,
          effectiveDate: "2026-06-01",
        }),
      ),
    ).toContain("different_effective_dates");
  });

  it("blocks different effective dates even when the period fields match", () => {
    expect(
      reasons(
        fixture("a", { effectiveDate: "2026-01-01" }),
        fixture("b", { effectiveDate: "2026-06-01" }),
      ),
    ).toContain("different_effective_dates");
  });

  it("treats adjacent complete recurring periods as non-overlapping", () => {
    expect(
      reasons(
        fixture("a", { periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
        fixture("b", { periodStart: "2026-02-01", periodEnd: "2026-02-28" }),
      ),
    ).toContain("non_overlapping_periods");
  });

  it("does not use document or assessment dates as applicability", () => {
    expect(
      reasons(
        fixture("a", {
          periodStart: undefined,
          periodEnd: undefined,
          documentDate: "2026-01-01",
          assessmentDate: "2026-01-01",
        }),
        fixture("b", {
          periodStart: undefined,
          periodEnd: undefined,
          documentDate: "2026-01-01",
          assessmentDate: "2026-01-01",
        }),
      ),
    ).toContain("missing_period_context");
  });
});

describe("trust boundary", () => {
  it("rejects malformed runtime claim data before dimension checks", () => {
    const first = fixture("a");
    const second = fixture("b", {
      amountMinor: -1,
      concept: "total_care_home_fee",
    });

    expect(reasons(first, second)).toEqual(["invalid_claim"]);
  });

  it("rejects broken provenance before dimension checks", () => {
    const first = fixture("a");
    const second = fixture("b");
    const broken: Fixture = {
      ...second,
      claim: {
        ...second.claim,
        provenance: {
          ...second.claim.provenance,
          sourceDocumentId: "missing-document",
        },
      },
    };

    expect(reasons(first, broken)).toEqual(["source_review_required"]);
  });

  it("rejects review-required source material", () => {
    const first = fixture("a");
    const second = fixture("b", {}, "review_required");

    expect(reasons(first, second)).toEqual(["source_review_required"]);
  });

  it("rejects unavailable source material", () => {
    const first = fixture("a");
    const second = fixture("b", {}, "unavailable");

    expect(reasons(first, second)).toEqual(["source_review_required"]);
  });

  it("rejects ambiguous repeated source support", () => {
    const first = fixture("a");
    const second = fixture("b");
    const repeatedText = `${second.claim.provenance.sourceQuote}\n${second.claim.provenance.sourceQuote}`;
    const repeated: Fixture = {
      ...second,
      document: {
        ...second.document,
        extractedText: repeatedText,
        segments: [{ ...second.document.segments[0], text: repeatedText }],
      },
    };

    expect(reasons(first, repeated)).toEqual(["source_review_required"]);
  });

  it("does not accept a Phase 2 ambiguous-pairing rejection as a claim", () => {
    const sourceText =
      "Resident contribution: £486 per week; NHS contribution: £235 per week";
    const document: SourceDocument = {
      id: "ambiguous-document",
      displayName: "ambiguous.pdf",
      intakeType: "pdf",
      extractionMethod: "pdf_text",
      order: 1,
      extractedText: sourceText,
      warnings: [],
      reviewState: "confirmed",
      segments: [
        {
          id: "ambiguous-page-1",
          kind: "page",
          order: 1,
          pageNumber: 1,
          text: sourceText,
        },
      ],
    };
    const [rejection] = extractFinancialClaimResults([document]);
    const trusted = fixture("trusted");

    expect(rejection).toMatchObject({
      status: "rejected",
      reason: "ambiguous_claim_pairing",
    });
    expect(
      compareFinancialClaims(rejection, trusted.claim, [document, trusted.document]),
    ).toEqual({
      status: "not_safely_comparable",
      claimIds: ["invalid", "trusted"],
      reasons: ["invalid_claim"],
    });
  });

  it("rejects a reversed explicit period as an invalid claim", () => {
    expect(
      reasons(
        fixture("a"),
        fixture("b", { periodStart: "2026-02-01", periodEnd: "2026-01-01" }),
      ),
    ).toEqual(["invalid_claim"]);
  });
});

describe("deterministic reasons and symmetry", () => {
  it("keeps comparable dimensions stable while preserving input claim order", () => {
    const first = fixture("a");
    const second = fixture("b");
    const forward = compare(first, second);
    const reverse = compare(second, first);

    expect(forward).toMatchObject({ status: "comparable", claimIds: ["a", "b"] });
    expect(reverse).toMatchObject({ status: "comparable", claimIds: ["b", "a"] });
    expect(
      forward.status === "comparable" ? forward.dimensions : undefined,
    ).toEqual(reverse.status === "comparable" ? reverse.dimensions : undefined);
  });

  it("returns all independently known blockers in stable evaluation order", () => {
    expect(
      reasons(
        fixture("a"),
        fixture("b", {
          concept: "total_care_home_fee",
          subjectId: "resident-2",
          providerId: "care-home-2",
          payerRole: "local_authority",
          payeeRole: "local_authority",
          currency: "unknown",
          cadence: "monthly",
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
        }),
      ),
    ).toEqual([
      "different_concept",
      "different_subject",
      "different_provider",
      "different_payer_role",
      "different_payee_role",
      "missing_currency_context",
      "different_cadence",
      "non_overlapping_periods",
    ]);
  });

  it.each([
    [
      fixture("subject-a", { subjectId: "resident-1" }),
      fixture("subject-b", { subjectId: "resident-2" }),
    ],
    [
      fixture("cadence-a", { cadence: "weekly" }),
      fixture("cadence-b", { cadence: "monthly" }),
    ],
    [
      fixture("period-a", { periodStart: "2026-01-01", periodEnd: "2026-01-31" }),
      fixture("period-b", { periodStart: "2026-06-01", periodEnd: "2026-06-30" }),
    ],
  ])("is symmetric for representative failures", (first, second) => {
    const forward = compare(first, second);
    const reverse = compare(second, first);

    expect(forward.status).toBe(reverse.status);
    expect(
      forward.status === "not_safely_comparable" ? forward.reasons : [],
    ).toEqual(
      reverse.status === "not_safely_comparable" ? reverse.reasons : [],
    );
  });
});

describe("adversarial lookalikes", () => {
  it.each([
    [
      "same amount, different concepts",
      { amountMinor: 50_000, concept: "resident_contribution" as const },
      { amountMinor: 50_000, concept: "total_care_home_fee" as const },
      "different_concept",
    ],
    [
      "mathematically related weekly and four-weekly amounts",
      { amountMinor: 48_600, cadence: "weekly" as const },
      { amountMinor: 194_400, cadence: "four_weekly" as const },
      "different_cadence",
    ],
    [
      "same amount, monthly and four-weekly",
      { amountMinor: 50_000, cadence: "monthly" as const },
      { amountMinor: 50_000, cadence: "four_weekly" as const },
      "different_cadence",
    ],
    [
      "same amount, different residents",
      { amountMinor: 50_000, subjectId: "resident-a" },
      { amountMinor: 50_000, subjectId: "resident-b" },
      "different_subject",
    ],
    [
      "same amount, different providers",
      { amountMinor: 50_000, providerId: "care-home-a" },
      { amountMinor: 50_000, providerId: "care-home-b" },
      "different_provider",
    ],
  ] as const)("blocks %s", (_label, firstOverrides, secondOverrides, reason) => {
    expect(
      reasons(
        fixture("lookalike-a", firstOverrides),
        fixture("lookalike-b", secondOverrides),
      ),
    ).toContain(reason);
  });
});
