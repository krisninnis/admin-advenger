import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCareFeeClaimCandidates,
  createConfirmedCareFeeComparisonRequest,
  type ConfirmedCareFeeComparisonRequestV1,
  type UserConfirmedCareFeeContext,
} from "../careFeeClaimConfirmation";
import { runCareFeeSafeComparison } from "../careFeeSafeComparison";
import type { FinancialClaim } from "../financialClaims";
import * as safeResultModule from "../safeReconciliationResult";
import type { SourceDocument } from "../sourceProvenance";

afterEach(() => vi.restoreAllMocks());

const sourceDocument = (
  id: string,
  sourceText: string,
  order: number,
): SourceDocument => ({
  id,
  displayName: `${id}.pdf`,
  intakeType: "pdf",
  extractionMethod: "pdf_text",
  order,
  extractedText: sourceText,
  warnings: [],
  reviewState: "confirmed",
  segments: [
    {
      id: `${id}-page-1`,
      kind: "page",
      order: 1,
      pageNumber: 1,
      text: sourceText,
    },
  ],
});

const selectableClaims = (
  documents: readonly SourceDocument[],
): readonly [FinancialClaim, FinancialClaim] => {
  const claims = buildCareFeeClaimCandidates(documents)
    .filter((candidate) => candidate.status === "selectable")
    .map((candidate) => candidate.claim);
  if (claims.length !== 2) throw new Error("Expected exactly two selectable claims.");
  return [claims[0], claims[1]];
};

const sharedContext = (
  claims: readonly [FinancialClaim, FinancialClaim],
): UserConfirmedCareFeeContext[] => [
  {
    kind: "user_confirmed_context",
    dimension: "same_subject",
    appliesToClaimIds: [claims[0].id, claims[1].id],
    answer: "yes",
  },
  {
    kind: "user_confirmed_context",
    dimension: "same_provider",
    appliesToClaimIds: [claims[0].id, claims[1].id],
    answer: "yes",
  },
];

const confirmedRequest = (
  documents: readonly [SourceDocument, SourceDocument],
  options: {
    readonly transformClaims?: (
      claims: readonly [FinancialClaim, FinancialClaim],
    ) => readonly [FinancialClaim, FinancialClaim];
    readonly extraContext?: (
      claims: readonly [FinancialClaim, FinancialClaim],
    ) => readonly UserConfirmedCareFeeContext[];
  } = {},
): ConfirmedCareFeeComparisonRequestV1 => {
  const extracted = selectableClaims(documents);
  const claims = options.transformClaims?.(extracted) ?? extracted;
  const result = createConfirmedCareFeeComparisonRequest({
    claims,
    sourceDocuments: documents,
    userConfirmedContext: [
      ...sharedContext(claims),
      ...(options.extraContext?.(claims) ?? []),
    ],
  });
  if (!result.valid) throw new Error(`Could not create request: ${result.reason}`);
  return result.request;
};

const recurringDocuments = (
  firstAmount: number,
  secondAmount: number,
  firstDate = "2026-08-20",
  secondDate = firstDate,
): readonly [SourceDocument, SourceDocument] => [
  sourceDocument(
    "record-a",
    `Resident contribution: GBP ${firstAmount} per week; effective ${firstDate}; payee: care provider`,
    1,
  ),
  sourceDocument(
    "record-b",
    `Resident contribution: GBP ${secondAmount} per week; effective ${secondDate}; payee: care provider`,
    2,
  ),
];

describe("runCareFeeSafeComparison", () => {
  it("composes an agreement without exposing comparison-only identities", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents);

    const outcome = runCareFeeSafeComparison(request, documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.state).toBe("agreement");
    expect(outcome.model.heading).toBe("These safely comparable amounts agree.");
    expect(outcome.model.comparison.applicabilityText).toBe(
      "Same effective date: 2026-08-20",
    );
    expect(JSON.stringify(outcome.model)).not.toContain("care-fee-session-");
  });

  it("uses the Safe Result absolute difference for disagreement", () => {
    const documents = recurringDocuments(486, 500);
    const request = confirmedRequest(documents);

    const outcome = runCareFeeSafeComparison(request, documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.state).toBe("disagreement");
    expect(outcome.model.heading).toBe("These safely comparable amounts differ.");
    expect(outcome.model.comparison.differenceText).toContain("14.00");
    expect(outcome.model).not.toHaveProperty("differenceMinor");
  });

  it("returns not safely comparable with authoritative plain-English reasons", () => {
    const documents = recurringDocuments(486, 500, "2026-08-20", "2026-09-01");
    const request = confirmedRequest(documents);

    const outcome = runCareFeeSafeComparison(request, documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.state).toBe("not_safely_comparable");
    expect(outcome.model.heading).toBe("These figures are not safely comparable.");
    expect(outcome.model.comparison.differenceText).toBeUndefined();
    expect(outcome.model.comparison.applicabilityText).toBeUndefined();
    expect(outcome.model.blockingReasons).toContain(
      "These figures have different effective dates, so this comparison does not establish that they apply at the same time.",
    );
  });

  it("preserves recurring overlap applicability from the backend", () => {
    const documents = [
      sourceDocument(
        "record-a",
        "Resident contribution: GBP 486 per week; period from 2026-08-01 to 2026-08-31; payee: care provider",
        1,
      ),
      sourceDocument(
        "record-b",
        "Resident contribution: GBP 500 per week; period from 2026-08-15 to 2026-09-15; payee: care provider",
        2,
      ),
    ] as const;
    const outcome = runCareFeeSafeComparison(confirmedRequest(documents), documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.comparison.applicabilityText).toBe(
      "Overlapping stated period: 2026-08-15 to 2026-08-31",
    );
  });

  it("preserves exact invoice applicability from the backend", () => {
    const documents = [
      sourceDocument(
        "invoice-a",
        "Resident contribution: GBP 486 invoice period total; invoice period from 2026-08-01 to 2026-08-31; payee: care provider",
        1,
      ),
      sourceDocument(
        "invoice-b",
        "Resident contribution: GBP 486 invoice period total; invoice period from 2026-08-01 to 2026-08-31; payee: care provider",
        2,
      ),
    ] as const;
    const outcome = runCareFeeSafeComparison(confirmedRequest(documents), documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.comparison.applicabilityText).toBe(
      "Same stated period: 2026-08-01 to 2026-08-31",
    );
  });

  it("records user-confirmed same subject and provider separately from source evidence", () => {
    const documents = recurringDocuments(486, 486);
    const outcome = runCareFeeSafeComparison(confirmedRequest(documents), documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.resolutionLedger.subject).toEqual([
      "user_confirmed",
      "user_confirmed",
    ]);
    expect(outcome.model.resolutionLedger.provider).toEqual([
      "user_confirmed",
      "user_confirmed",
    ]);
    expect(outcome.model.confirmedContext.map(({ label }) => label)).toEqual([
      "Subject",
      "Provider",
    ]);
    expect(outcome.model.records[0].sourceQuote).not.toContain("same person");
  });

  it("resolves claim-scoped payer and payee confirmations without provenance laundering", () => {
    const documents = [
      sourceDocument("record-a", "Total care home fee: GBP 486 per week; effective 2026-08-20", 1),
      sourceDocument("record-b", "Total care home fee: GBP 486 per week; effective 2026-08-20", 2),
    ] as const;
    const request = confirmedRequest(documents, {
      extraContext: (claims) => claims.flatMap((claim) => [
        {
          kind: "user_confirmed_context" as const,
          dimension: "payer_role" as const,
          appliesToClaimIds: [claim.id] as const,
          value: "resident" as const,
        },
        {
          kind: "user_confirmed_context" as const,
          dimension: "payee_role" as const,
          appliesToClaimIds: [claim.id] as const,
          value: "care_provider" as const,
        },
      ]),
    });
    const originalProvenance = request.claims.map(({ provenance }) => provenance);

    const outcome = runCareFeeSafeComparison(request, documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.resolutionLedger.payerRoles).toEqual([
      "user_confirmed",
      "user_confirmed",
    ]);
    expect(outcome.model.resolutionLedger.payeeRoles).toEqual([
      "user_confirmed",
      "user_confirmed",
    ]);
    expect(request.claims.map(({ provenance }) => provenance)).toEqual(originalProvenance);
  });

  it("does not repair known source role conflicts", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents, {
      transformClaims: ([first, second]) => [
        first,
        { ...second, payerRole: "local_authority" },
      ],
    });

    const outcome = runCareFeeSafeComparison(request, documents);

    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.state).toBe("not_safely_comparable");
    expect(outcome.model.blockingReasons).toContain(
      "These figures identify different payer roles, so they have not been compared.",
    );
  });

  it("rejects a stale or substituted claim", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents);
    const substituted = {
      ...request,
      claims: [{ ...request.claims[0], id: "substituted-claim" }, request.claims[1]],
    };

    expect(runCareFeeSafeComparison(substituted, documents)).toEqual({
      status: "failed",
      reason: "invalid_request",
      message: "These records changed or could not be verified. Review and confirm them again.",
    });
  });

  it("rejects changed source documents and preserves original claims and provenance", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents);
    const before = JSON.stringify(request.claims);
    const changedDocuments = [
      { ...documents[0], displayName: "replacement.pdf" },
      documents[1],
    ];

    const outcome = runCareFeeSafeComparison(request, changedDocuments);

    expect(outcome.status).toBe("failed");
    expect(outcome).toMatchObject({ reason: "source_changed" });
    expect(JSON.stringify(request.claims)).toBe(before);
  });

  it("fails closed when Safe Result cannot compose", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents);
    vi.spyOn(safeResultModule, "composeSafeReconciliationResult").mockReturnValueOnce({
      status: "not_composed",
      reason: "inconsistent_claim_set",
    });

    expect(runCareFeeSafeComparison(request, documents)).toMatchObject({
      status: "failed",
      reason: "safe_result_not_composed",
    });
  });

  it("fails closed when Safe Result reports unsafe formatting", () => {
    const documents = recurringDocuments(486, 486);
    const request = confirmedRequest(documents);
    vi.spyOn(safeResultModule, "composeSafeReconciliationResult").mockReturnValueOnce({
      status: "not_composed",
      reason: "unsafe_amount_or_cadence",
    });

    expect(runCareFeeSafeComparison(request, documents)).toMatchObject({
      status: "failed",
      reason: "unsafe_formatting",
    });
  });

  it("catches unexpected runtime errors and exposes no action or persistence fields", () => {
    const documents = recurringDocuments(486, 486);
    const malformed = new Proxy({}, { ownKeys: () => { throw new Error("runtime failure"); } });
    expect(runCareFeeSafeComparison(malformed, documents)).toMatchObject({
      status: "failed",
      reason: "unexpected_error",
    });

    const outcome = runCareFeeSafeComparison(confirmedRequest(documents), documents);
    expect(outcome.status).toBe("ready");
    if (outcome.status !== "ready") return;
    expect(outcome.model.allowedActions).toEqual([
      "change_records",
      "back_to_documents",
      "start_over",
    ]);
    expect(JSON.stringify(outcome.model)).not.toMatch(
      /adminCase|save|draft|chase|contact|submit|export|outcome|moneyRecovered/i,
    );
  });
});
