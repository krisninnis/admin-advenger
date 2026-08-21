import { describe, expect, it } from "vitest";
import {
  createConfirmedCareFeeComparisonRequest,
  type UserConfirmedCareFeeContext,
} from "../careFeeClaimConfirmation";
import {
  CARE_FEE_CASE_TITLE,
  createCareFeeComparisonCase,
  findDuplicateCareFeeCase,
  validateCareFeeComparisonCase,
} from "../careFeeCase";
import { runCareFeeSafeComparison } from "../careFeeSafeComparison";
import type { FinancialClaim } from "../financialClaims";
import type { SourceDocument } from "../sourceProvenance";

const sourceDocument = (
  id: string,
  text: string,
  order: number,
): SourceDocument => ({
  id,
  displayName: `${id}.txt`,
  intakeType: "text_file",
  extractionMethod: "browser_text",
  order,
  extractedText: text,
  warnings: [],
  reviewState: "confirmed",
  segments: [{ id: `${id}-segment-1`, kind: "document", order: 1, text }],
});

const claim = (
  id: string,
  document: SourceDocument,
  amountMinor: number,
  effectiveDate: string,
): FinancialClaim => ({
  id,
  subjectId: "unknown",
  providerId: "unknown",
  concept: "resident_contribution",
  amountMinor,
  currency: "GBP",
  cadence: "weekly",
  payerRole: "resident",
  payeeRole: "care_provider",
  effectiveDate,
  provenance: {
    claimId: id,
    sourceDocumentId: document.id,
    sourceSegmentId: document.segments[0]?.id,
    sourceQuote: document.extractedText,
    reviewState: "confirmed",
  },
});

const readyComparison = (
  secondAmountMinor = 48_600,
  secondDate = "2026-08-20",
) => {
  const documents = [
    sourceDocument(
      "record-a",
      "Resident contribution: GBP 486 per week; effective 2026-08-20; payee: care provider",
      1,
    ),
    sourceDocument(
      "record-b",
      `Resident contribution: GBP ${secondAmountMinor / 100} per week; effective ${secondDate}; payee: care provider`,
      2,
    ),
  ] as const;
  const claims = [
    claim("claim-a", documents[0], 48_600, "2026-08-20"),
    claim("claim-b", documents[1], secondAmountMinor, secondDate),
  ] as const;
  const userConfirmedContext: readonly UserConfirmedCareFeeContext[] = [
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
  const request = createConfirmedCareFeeComparisonRequest({
    claims,
    sourceDocuments: documents,
    userConfirmedContext,
  });
  if (!request.valid) throw new Error(request.reason);
  const outcome = runCareFeeSafeComparison(request.request, documents);
  if (outcome.status !== "ready") throw new Error(outcome.reason);
  return { documents, outcome };
};

describe("Care Fee optional case domain", () => {
  it.each([
    ["agreement", 48_600, "2026-08-20"],
    ["disagreement", 50_000, "2026-08-20"],
    ["not_safely_comparable", 50_000, "2026-09-01"],
  ] as const)("creates a neutral immutable %s snapshot", (state, amount, date) => {
    const { documents, outcome } = readyComparison(amount, date);
    expect(outcome.saveCandidate.reconciliation.state).toBe(state);

    const creation = createCareFeeComparisonCase({
      candidate: outcome.saveCandidate,
      currentSourceDocuments: documents,
      id: "care-fee-case-1",
      now: "2026-08-20T12:00:00.000Z",
    });

    expect(creation.status).toBe("created");
    if (creation.status !== "created") return;
    expect(creation.caseRecord.title).toBe(CARE_FEE_CASE_TITLE);
    expect(creation.caseRecord.reconciliation).toEqual(outcome.saveCandidate.reconciliation);
    expect(creation.caseRecord.sourceRecords.map(({ recordLabel }) => recordLabel)).toEqual([
      "Record 1",
      "Record 2",
    ]);
    expect(creation.caseRecord.userConfirmedContext).toEqual(
      outcome.saveCandidate.request.userConfirmedContext,
    );
    expect(JSON.stringify(creation.caseRecord)).not.toContain("extractedText");
    expect(JSON.stringify(creation.caseRecord)).not.toContain("care-fee-session-");
  });

  it("retains the backend absolute difference only for disagreement", () => {
    const disagreement = readyComparison(50_000);
    const disagreementCase = createCareFeeComparisonCase({
      candidate: disagreement.outcome.saveCandidate,
      currentSourceDocuments: disagreement.documents,
      id: "case-disagreement",
      now: "2026-08-20T12:00:00.000Z",
    });
    expect(disagreementCase.status).toBe("created");
    if (disagreementCase.status !== "created") return;
    expect(disagreementCase.caseRecord.reconciliation).toMatchObject({
      state: "disagreement",
      differenceMinor: 1_400,
      differenceKind: "absolute",
    });

    const nsc = readyComparison(50_000, "2026-09-01");
    const nscCase = createCareFeeComparisonCase({
      candidate: nsc.outcome.saveCandidate,
      currentSourceDocuments: nsc.documents,
      id: "case-nsc",
      now: "2026-08-20T12:00:00.000Z",
    });
    expect(nscCase.status).toBe("created");
    if (nscCase.status !== "created") return;
    expect(nscCase.caseRecord.reconciliation.state).toBe("not_safely_comparable");
    expect(nscCase.caseRecord.reconciliation).not.toHaveProperty("differenceMinor");
  });

  it("fails closed when current source provenance has changed", () => {
    const { documents, outcome } = readyComparison();
    const changed = [{ ...documents[0], displayName: "replacement.txt" }, documents[1]];

    expect(
      createCareFeeComparisonCase({
        candidate: outcome.saveCandidate,
        currentSourceDocuments: changed,
      }),
    ).toEqual({
      status: "failed",
      reason: "stale_source",
      message: "These records changed or could not be verified. Review and compare them again.",
    });
  });

  it("validates stored cases and rejects malformed or expanded data", () => {
    const { documents, outcome } = readyComparison();
    const creation = createCareFeeComparisonCase({
      candidate: outcome.saveCandidate,
      currentSourceDocuments: documents,
      id: "care-fee-case-valid",
      now: "2026-08-20T12:00:00.000Z",
    });
    if (creation.status !== "created") throw new Error(creation.reason);

    expect(validateCareFeeComparisonCase(creation.caseRecord)).toEqual({
      valid: true,
      caseRecord: creation.caseRecord,
    });
    expect(
      validateCareFeeComparisonCase({
        ...creation.caseRecord,
        impactEntries: [{ amount: 1_400 }],
      }),
    ).toEqual({ valid: false, reason: "unexpected_field" });
    expect(
      validateCareFeeComparisonCase({
        ...creation.caseRecord,
        reconciliation: { state: "disagreement", differenceMinor: 1_400 },
      }),
    ).toEqual({ valid: false, reason: "invalid_reconciliation" });
    expect(
      validateCareFeeComparisonCase({
        ...creation.caseRecord,
        sourceRecords: [
          {
            ...creation.caseRecord.sourceRecords[0],
            document: {
              ...creation.caseRecord.sourceRecords[0].document,
              extractedText: "A full source document must not enter the saved snapshot.",
            },
          },
          creation.caseRecord.sourceRecords[1],
        ],
      }),
    ).toEqual({ valid: false, reason: "invalid_source_snapshot" });
  });

  it("deduplicates canonical saved content rather than case IDs or timestamps", () => {
    const { documents, outcome } = readyComparison(50_000);
    const first = createCareFeeComparisonCase({
      candidate: outcome.saveCandidate,
      currentSourceDocuments: documents,
      id: "case-first",
      now: "2026-08-20T12:00:00.000Z",
    });
    const repeated = createCareFeeComparisonCase({
      candidate: outcome.saveCandidate,
      currentSourceDocuments: documents,
      id: "case-second",
      now: "2026-08-21T12:00:00.000Z",
    });
    if (first.status !== "created" || repeated.status !== "created") {
      throw new Error("Expected valid cases");
    }

    expect(findDuplicateCareFeeCase([first.caseRecord], repeated.caseRecord)?.id).toBe(
      "case-first",
    );
  });
});
