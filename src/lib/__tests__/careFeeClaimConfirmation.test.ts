import { describe, expect, it } from "vitest";
import {
  CARE_FEE_COMPARABILITY_NOTICE,
  buildCareFeeClaimCandidates,
  createConfirmedCareFeeComparisonRequest,
  getRequiredCareFeeContext,
  suggestCareFeeClaimPair,
  validateConfirmedCareFeeComparisonRequest,
  validateUserConfirmedCareFeeContext,
  type UserConfirmedCareFeeContext,
} from "../careFeeClaimConfirmation";
import { extractFinancialClaimResults, type FinancialClaim } from "../financialClaims";
import type { SourceDocument, SourceReviewState } from "../sourceProvenance";

const sourceDocument = (
  id: string,
  text: string,
  order: number,
  reviewState: SourceReviewState = "confirmed",
): SourceDocument => ({
  id,
  displayName: `${id}.pdf`,
  intakeType: "pdf",
  extractionMethod: "pdf_text",
  order,
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
});

const documents = [
  sourceDocument("record-a", "Resident contribution: GBP 486 per week", 1),
  sourceDocument("record-b", "Resident contribution: GBP 500 per week", 2),
  sourceDocument("record-c", "Resident contribution: GBP 510 per week", 3),
] as const;

const claimsFrom = (sourceDocuments: readonly SourceDocument[]): FinancialClaim[] =>
  extractFinancialClaimResults(sourceDocuments)
    .filter((result) => result.status === "trusted")
    .map((result) => result.claim);

const requiredContext = (
  first: FinancialClaim,
  second: FinancialClaim,
): UserConfirmedCareFeeContext[] => [
  {
    kind: "user_confirmed_context",
    dimension: "same_subject",
    appliesToClaimIds: [first.id, second.id],
    answer: "yes",
  },
  {
    kind: "user_confirmed_context",
    dimension: "same_provider",
    appliesToClaimIds: [first.id, second.id],
    answer: "yes",
  },
  {
    kind: "user_confirmed_context",
    dimension: "payee_role",
    appliesToClaimIds: [first.id],
    value: "care_provider",
  },
  {
    kind: "user_confirmed_context",
    dimension: "payee_role",
    appliesToClaimIds: [second.id],
    value: "care_provider",
  },
];

describe("Care Fee claim candidates", () => {
  it("keeps trusted and blocked candidates visible with exact source identity", () => {
    const reviewDocument = sourceDocument(
      "record-review",
      "Resident contribution: GBP 525 per week",
      2,
      "review_required",
    );
    const candidates = buildCareFeeClaimCandidates([documents[0], reviewDocument]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      status: "selectable",
      source: {
        sourceDocumentId: "record-a",
        sourceDocumentName: "record-a.pdf",
        sourceSegmentId: "record-a-page-1",
        pageNumber: 1,
        reviewState: "confirmed",
        sourceQuote: "Resident contribution: GBP 486 per week",
      },
    });
    expect(candidates[1]).toMatchObject({
      status: "blocked",
      source: {
        sourceDocumentId: "record-review",
        sourceDocumentName: "record-review.pdf",
        reviewState: "review_required",
      },
      reason: "review_required",
    });
  });

  it("suggests a deterministic cross-document starting pair without claiming comparability", () => {
    const candidates = buildCareFeeClaimCandidates(documents);
    const suggestion = suggestCareFeeClaimPair(candidates);

    expect(suggestion).toEqual({
      claimIds: [
        "financial-claim:record-a:record-a-page-1:1",
        "financial-claim:record-b:record-b-page-1:1",
      ],
      label: "Suggested starting pair",
      notice: CARE_FEE_COMPARABILITY_NOTICE,
    });
    expect(CARE_FEE_COMPARABILITY_NOTICE).toBe(
      "This has not been checked for safe comparability.",
    );
  });

  it("does not suggest unknown concepts or pairs with known conflicts", () => {
    const [first, second] = claimsFrom(documents.slice(0, 2));
    const knownFirst = {
      ...first,
      subjectId: "first-subject",
    } satisfies FinancialClaim;
    const conflicting = {
      ...second,
      subjectId: "different-subject",
    } satisfies FinancialClaim;
    const unknownConceptDocument = sourceDocument(
      "unknown-concept",
      "Charge: GBP 500 per week",
      3,
    );

    const candidates = [
      {
        status: "selectable" as const,
        candidateId: knownFirst.id,
        claim: knownFirst,
        source: buildCareFeeClaimCandidates([documents[0]])[0].source,
      },
      {
        status: "selectable" as const,
        candidateId: conflicting.id,
        claim: conflicting,
        source: buildCareFeeClaimCandidates([documents[1]])[0].source,
      },
      ...buildCareFeeClaimCandidates([unknownConceptDocument]),
    ];

    expect(suggestCareFeeClaimPair(candidates)).toBeUndefined();
    expect(first.subjectId).toBe("unknown");
  });
});

describe("user-confirmed context", () => {
  it("requires only unresolved identity and role context and leaves provenance unchanged", () => {
    const [first, second] = claimsFrom(documents.slice(0, 2));
    const before = JSON.stringify([first.provenance, second.provenance]);

    expect(getRequiredCareFeeContext([first, second], [])).toEqual([
      { dimension: "same_subject", appliesToClaimIds: [first.id, second.id] },
      { dimension: "same_provider", appliesToClaimIds: [first.id, second.id] },
      { dimension: "payee_role", appliesToClaimIds: [first.id] },
      { dimension: "payee_role", appliesToClaimIds: [second.id] },
    ]);
    expect(JSON.stringify([first.provenance, second.provenance])).toBe(before);
  });

  it("rejects malformed, duplicate, out-of-scope and known-field context", () => {
    const [first, second] = claimsFrom(documents.slice(0, 2));
    const contexts = requiredContext(first, second);

    expect(
      validateUserConfirmedCareFeeContext([...contexts, contexts[0]], [first, second]),
    ).toMatchObject({ valid: false, reason: "duplicate_context" });
    expect(
      validateUserConfirmedCareFeeContext(
        [{ ...contexts[2], appliesToClaimIds: ["another-claim"] }],
        [first, second],
      ),
    ).toMatchObject({ valid: false, reason: "context_claim_mismatch" });
    expect(
      validateUserConfirmedCareFeeContext(
        [
          {
            kind: "user_confirmed_context",
            dimension: "payer_role",
            appliesToClaimIds: [first.id],
            value: "nhs",
          },
        ],
        [first, second],
      ),
    ).toMatchObject({ valid: false, reason: "known_value_override" });
  });
});

describe("transient confirmed request", () => {
  it("preserves ordered claims, unique referenced documents and separate context", () => {
    const [first, second] = claimsFrom(documents.slice(0, 2));
    const context = requiredContext(second, first);
    const result = createConfirmedCareFeeComparisonRequest({
      claims: [second, first],
      sourceDocuments: documents.slice(0, 2),
      userConfirmedContext: context,
    });

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.request.claimIds).toEqual([second.id, first.id]);
    expect(result.request.claims).toEqual([second, first]);
    expect(result.request.sourceDocuments.map(({ id }) => id)).toEqual([
      "record-b",
      "record-a",
    ]);
    expect(result.request.userConfirmedContext).not.toBe(
      result.request.claims[0].provenance,
    );
    expect(result.request).not.toHaveProperty("difference");
    expect(result.request).not.toHaveProperty("result");
    expect(result.request).not.toHaveProperty("comparison");
  });

  it("fails closed for duplicate claims, unresolved context and extra outcome fields", () => {
    const [first, second] = claimsFrom(documents.slice(0, 2));

    expect(
      createConfirmedCareFeeComparisonRequest({
        claims: [first, first],
        sourceDocuments: [documents[0]],
        userConfirmedContext: [],
      }),
    ).toMatchObject({ valid: false, reason: "duplicate_claim" });
    expect(
      createConfirmedCareFeeComparisonRequest({
        claims: [first, second],
        sourceDocuments: documents.slice(0, 2),
        userConfirmedContext: [],
      }),
    ).toMatchObject({ valid: false, reason: "unresolved_context" });

    const valid = createConfirmedCareFeeComparisonRequest({
      claims: [first, second],
      sourceDocuments: documents.slice(0, 2),
      userConfirmedContext: requiredContext(first, second),
    });
    expect(valid.valid).toBe(true);
    if (!valid.valid) return;

    expect(
      validateConfirmedCareFeeComparisonRequest({
        ...valid.request,
        difference: 1400,
      }),
    ).toMatchObject({ valid: false, reason: "unexpected_field" });
  });
});
