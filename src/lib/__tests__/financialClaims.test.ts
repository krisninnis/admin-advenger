import { describe, expect, it } from "vitest";
import {
  extractFinancialClaimResults,
  normaliseClaimCadence,
  normaliseFinancialAmount,
  validateFinancialClaim,
  type FinancialClaim,
} from "../financialClaims";
import type {
  SourceDocument,
  SourceReviewState,
} from "../sourceProvenance";

const sourceDocument = (
  id: string,
  text: string,
  reviewState: SourceReviewState = "confirmed",
  overrides: Partial<SourceDocument> = {},
): SourceDocument => ({
  id,
  displayName: `${id}.pdf`,
  intakeType: "pdf",
  extractionMethod: "pdf_text",
  order: 1,
  extractedText: text,
  warnings: [],
  reviewState,
  segments: [
    {
      id: `${id}-page-1`,
      kind: "page",
      order: 1,
      pageNumber: 1,
      text,
    },
  ],
  ...overrides,
});

const trustedClaims = (documents: readonly SourceDocument[]) =>
  extractFinancialClaimResults(documents)
    .filter((result) => result.status === "trusted")
    .map((result) => result.claim);

const rejectedReasons = (documents: readonly SourceDocument[]) =>
  extractFinancialClaimResults(documents)
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

const baseDocument = sourceDocument(
  "assessment-1",
  "Resident contribution: £486 per week",
);

const baseClaim = (): FinancialClaim =>
  trustedClaims([baseDocument])[0];

describe("typed financial claim extraction", () => {
  it.each([
    [
      "Resident contribution: £486 per week",
      "resident_contribution",
      48_600,
      "weekly",
      "resident",
    ],
    [
      "Total weekly care home fee: £1,250",
      "total_care_home_fee",
      125_000,
      "weekly",
      "unknown",
    ],
    [
      "Local authority contribution: £620 weekly",
      "local_authority_contribution",
      62_000,
      "weekly",
      "local_authority",
    ],
    [
      "Local authority contribution: £2,480 four-weekly",
      "local_authority_contribution",
      248_000,
      "four_weekly",
      "local_authority",
    ],
    [
      "NHS contribution: £235 per week",
      "nhs_contribution",
      23_500,
      "weekly",
      "nhs",
    ],
    [
      "Third-party top-up: £35 per week",
      "third_party_top_up",
      3_500,
      "weekly",
      "third_party",
    ],
    [
      "One-off adjustment: £75",
      "one_off_adjustment",
      7_500,
      "one_off",
      "unknown",
    ],
    [
      "Retrospective adjustment: GBP 140",
      "retrospective_adjustment",
      14_000,
      "unknown",
      "unknown",
    ],
    [
      "Resident contribution: £486.50 monthly",
      "resident_contribution",
      48_650,
      "monthly",
      "resident",
    ],
    [
      "Resident contribution: £486",
      "resident_contribution",
      48_600,
      "unknown",
      "resident",
    ],
    [
      "Contribution: £500 per week",
      "other_unknown_amount",
      50_000,
      "weekly",
      "unknown",
    ],
  ] as const)(
    "normalises %s conservatively",
    (text, concept, amountMinor, cadence, payerRole) => {
      const [claim] = trustedClaims([sourceDocument("claim-source", text)]);

      expect(claim).toMatchObject({
        concept,
        amountMinor,
        currency: "GBP",
        cadence,
        payerRole,
        payeeRole: "unknown",
        subjectId: "unknown",
        providerId: "unknown",
      });
    },
  );

  it("keeps explicit effective, assessment, document, and period dates distinct", () => {
    const [claim] = trustedClaims([
      sourceDocument(
        "dated-claim",
        "Resident contribution: £486 per week; document date 2 May 2026; assessment date 3 May 2026; effective from 1 June 2026; period 1 June 2026 to 30 June 2026",
      ),
    ]);

    expect(claim).toMatchObject({
      documentDate: "2026-05-02",
      assessmentDate: "2026-05-03",
      effectiveDate: "2026-06-01",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
    });
  });

  it("retains unknown dates rather than interpreting an ambiguous numeric date", () => {
    const [claim] = trustedClaims([
      sourceDocument(
        "ambiguous-date",
        "Resident contribution: £486 per week effective from 03/04/2026",
      ),
    ]);

    expect(claim).not.toHaveProperty("effectiveDate");
  });

  it("uses explicit narrow payee wording without inventing payer responsibility", () => {
    const [claim] = trustedClaims([
      sourceDocument(
        "provider-fee",
        "Total care home fee payable to care provider: £1,200 per week",
      ),
    ]);

    expect(claim).toMatchObject({
      payerRole: "unknown",
      payeeRole: "care_provider",
    });
  });

  it.each([
    "Resident contribution: £486 per week; NHS contribution: £235 per week",
    "NHS contribution: £235 per week; Resident contribution: £486 per week",
    "Resident contribution: £486 per week; Resident contribution: £500 per week",
    "Resident contribution and NHS contribution: £486 per week",
  ])("rejects ambiguous concept/amount pairing in %s", (text) => {
    const results = extractFinancialClaimResults([
      sourceDocument("ambiguous-pairing", text),
    ]);

    expect(results).toEqual([
      expect.objectContaining({
        status: "rejected",
        sourceQuote: text,
        reason: "ambiguous_claim_pairing",
      }),
    ]);
    expect(results.some((result) => result.status === "trusted")).toBe(false);
  });

  it.each([
    [
      "Resident contribution: £486 per week; period from 1 June 2026",
      { periodStart: "2026-06-01" },
      "periodEnd",
    ],
    [
      "Resident contribution: £486 per week; period until 30 June 2026",
      { periodEnd: "2026-06-30" },
      "periodStart",
    ],
  ] as const)("preserves only the grounded endpoint in %s", (text, expected, absent) => {
    const [claim] = trustedClaims([sourceDocument("partial-period", text)]);

    expect(claim).toMatchObject(expected);
    expect(claim).not.toHaveProperty(absent);
  });

  it("trusts a source-grounded amount with unknown currency without inventing GBP", () => {
    const [claim] = trustedClaims([
      sourceDocument("unknown-currency", "Resident contribution: 486 per week"),
    ]);

    expect(claim).toMatchObject({
      amountMinor: 48_600,
      currency: "unknown",
      cadence: "weekly",
    });
  });
});

describe("integer money and cadence normalisation", () => {
  it.each([
    ["£0", { status: "normalised", amountMinor: 0, currency: "GBP" }],
    ["£521", { status: "normalised", amountMinor: 52_100, currency: "GBP" }],
    ["£521.50", { status: "normalised", amountMinor: 52_150, currency: "GBP" }],
    ["GBP 486", { status: "normalised", amountMinor: 48_600, currency: "GBP" }],
    ["486", { status: "normalised", amountMinor: 48_600, currency: "unknown" }],
  ] as const)("normalises %s without floating-point pounds", (value, expected) => {
    expect(normaliseFinancialAmount(value)).toEqual(expected);
  });

  it.each([
    ["£12.345", "excess_decimal_precision"],
    ["£1,00", "malformed_amount"],
    ["-£100", "negative_amount"],
    ["USD 100", "unsupported_currency"],
    ["$100", "unsupported_currency"],
    ["GBP £100", "ambiguous_currency"],
    ["£90071992547410", "amount_out_of_range"],
  ] as const)("rejects unsafe amount %s", (value, reason) => {
    expect(normaliseFinancialAmount(value)).toEqual({ status: "rejected", reason });
  });

  it.each([
    ["£500 per week", "weekly"],
    ["£2,000 every four weeks", "four_weekly"],
    ["£2,100 monthly", "monthly"],
    ["invoice period total £1,200", "invoice_period_total"],
    ["one-off charge £75", "one_off"],
    ["£500", "unknown"],
    ["£500 weekly or monthly", "unknown"],
  ] as const)("normalises cadence in %s to %s", (value, expected) => {
    expect(normaliseClaimCadence(value)).toBe(expected);
  });

  it("does not convert between cadence values", () => {
    expect(normaliseClaimCadence("£1,944 per four weeks (£1,944 monthly)"))
      .toBe("unknown");
  });

  it("does not mistake the word four-weekly for a weekly cadence", () => {
    expect(normaliseClaimCadence("£1,944 four-weekly")).toBe("four_weekly");
  });
});

describe("provenance and OCR trust boundary", () => {
  it("requires the claim and provenance IDs to agree", () => {
    const claim = baseClaim();
    expect(
      validateFinancialClaim(
        { ...claim, provenance: { ...claim.provenance, claimId: "another-claim" } },
        [baseDocument],
      ),
    ).toEqual({ valid: false, reason: "provenance_claim_id_mismatch" });
  });

  it.each([
    ["unknown document", { sourceDocumentId: "missing" }, "unknown_document"],
    ["unknown segment", { sourceSegmentId: "missing" }, "unknown_segment"],
    ["absent quote", { sourceQuote: "Not in source" }, "quote_not_found"],
    ["empty quote", { sourceQuote: "" }, "empty_quote"],
  ] as const)("fails closed for an %s", (_label, provenance, reason) => {
    const claim = baseClaim();
    expect(
      validateFinancialClaim(
        { ...claim, provenance: { ...claim.provenance, ...provenance } },
        [baseDocument],
      ),
    ).toEqual({ valid: false, reason });
  });

  it("fails closed for ambiguous support", () => {
    const repeated = sourceDocument(
      "repeated",
      "Resident contribution: £486 per week\nResident contribution: £486 per week",
    );
    const claim = {
      ...baseClaim(),
      id: "repeated-claim",
      provenance: {
        ...baseClaim().provenance,
        claimId: "repeated-claim",
        sourceDocumentId: repeated.id,
        sourceSegmentId: repeated.segments[0].id,
        sourceQuote: "Resident contribution: £486 per week",
      },
    };

    expect(validateFinancialClaim(claim, [repeated])).toEqual({
      valid: false,
      reason: "ambiguous_quote",
    });
  });

  it.each([
    ["review_required", "review_required"],
    ["unavailable", "source_unavailable"],
  ] as const)("does not trust a %s source", (reviewState, reason) => {
    const source = sourceDocument("ocr-source", "Resident contribution: £4860", reviewState);
    expect(trustedClaims([source])).toEqual([]);
    expect(rejectedReasons([source])).toContain(reason);
  });

  it("allows confirmed source text while retaining source warnings by reference", () => {
    const source = sourceDocument(
      "confirmed-source",
      "Resident contribution: £486 per week",
      "confirmed",
      { warnings: ["Check the original document."] },
    );
    const [claim] = trustedClaims([source]);

    expect(claim.provenance.sourceDocumentId).toBe(source.id);
    expect(source.warnings).toEqual(["Check the original document."]);
  });

  it("does not accept £100 as support for £1000", () => {
    const source = sourceDocument("larger", "Resident contribution: £1000 per week");
    const claim = {
      ...baseClaim(),
      id: "shorter-claim",
      amountMinor: 10_000,
      provenance: {
        ...baseClaim().provenance,
        claimId: "shorter-claim",
        sourceDocumentId: source.id,
        sourceSegmentId: source.segments[0].id,
        sourceQuote: "Resident contribution: £100",
      },
    };

    expect(validateFinancialClaim(claim, [source])).toEqual({
      valid: false,
      reason: "quote_not_found",
    });
  });
});

describe("runtime validation and identity", () => {
  it.each([
    ["empty ID", { id: "" }, "invalid_claim_id"],
    ["unknown concept", { concept: "weekly_bill" }, "invalid_concept"],
    ["fractional pence", { amountMinor: 48_600.5 }, "invalid_amount"],
    ["negative pence", { amountMinor: -1 }, "invalid_amount"],
    ["unknown currency value", { currency: "USD" }, "invalid_currency"],
    ["unknown cadence value", { cadence: "annual" }, "invalid_cadence"],
    ["unknown payer role", { payerRole: "council" }, "invalid_party_role"],
    ["invalid ISO date", { effectiveDate: "2026-02-30" }, "invalid_date"],
    [
      "reversed explicit period",
      { periodStart: "2026-02-01", periodEnd: "2026-01-01" },
      "invalid_period",
    ],
    ["non-object", null, "malformed_claim"],
  ] as const)("rejects malformed runtime data: %s", (_label, change, reason) => {
    const claim = baseClaim();
    const value = change === null ? null : { ...claim, ...change };
    expect(validateFinancialClaim(value, [baseDocument])).toEqual({
      valid: false,
      reason,
    });
  });

  it("keeps identical amounts from different documents distinct", () => {
    const first = sourceDocument("first", "Resident contribution: £486 per week");
    const second = sourceDocument("second", "Resident contribution: £486 per week");
    const [firstClaim, secondClaim] = trustedClaims([first, second]);

    expect(firstClaim.id).not.toBe(secondClaim.id);
    expect(firstClaim.provenance.sourceDocumentId).toBe("first");
    expect(secondClaim.provenance.sourceDocumentId).toBe("second");
  });

  it("keeps two source passages in one document distinct", () => {
    const source = sourceDocument(
      "two-passages",
      "Resident contribution: £486 per week\nNHS contribution: £235 per week",
    );
    const claims = trustedClaims([source]);

    expect(claims).toHaveLength(2);
    expect(new Set(claims.map(({ id }) => id)).size).toBe(2);
  });

  it("derives the same stable claim IDs when the same source is extracted again", () => {
    const source = sourceDocument(
      "stable-source",
      "Resident contribution: £486 per week\nNHS contribution: £235 per week",
    );

    const firstIds = trustedClaims([source]).map(({ id }) => id);
    const secondIds = trustedClaims([source]).map(({ id }) => id);

    expect(secondIds).toEqual(firstIds);
  });

  it("does not infer dates from attachment order", () => {
    const earlierUpload = sourceDocument(
      "upload-1",
      "Resident contribution: £486 per week",
      "confirmed",
      { order: 2 },
    );
    const [claim] = trustedClaims([earlierUpload]);

    expect(claim).not.toHaveProperty("documentDate");
    expect(claim).not.toHaveProperty("assessmentDate");
    expect(claim).not.toHaveProperty("effectiveDate");
    expect(claim).not.toHaveProperty("periodStart");
    expect(claim).not.toHaveProperty("periodEnd");
  });
});
