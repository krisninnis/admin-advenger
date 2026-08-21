// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfirmedCareFeeComparisonRequest } from "../careFeeClaimConfirmation";
import { createCareFeeComparisonCase } from "../careFeeCase";
import { runCareFeeSafeComparison } from "../careFeeSafeComparison";
import type { FinancialClaim } from "../financialClaims";
import type { SourceDocument } from "../sourceProvenance";
import {
  ADMIN_AVENGER_STORAGE_KEY,
  loadSavedAdminAvengerState,
  saveAdminAvengerState,
  type StoredAdminAvengerState,
} from "../storage";

const emptyState = (): StoredAdminAvengerState => ({
  adminItems: [],
  findings: [],
  adminCases: [],
  drafts: [],
  impactEntries: [],
});

const buildSavedCase = () => {
  const documents = [1, 2].map((order): SourceDocument => ({
    id: `record-${order}`,
    displayName: `record-${order}.txt`,
    intakeType: "text_file",
    extractionMethod: "browser_text",
    order,
    extractedText: "Resident contribution: GBP 486 per week; effective 2026-08-20",
    warnings: [],
    reviewState: "confirmed",
    segments: [{
      id: `record-${order}-segment-1`,
      kind: "document",
      order: 1,
      text: "Resident contribution: GBP 486 per week; effective 2026-08-20",
    }],
  })) as [SourceDocument, SourceDocument];
  const claims = documents.map((document, index): FinancialClaim => ({
    id: `claim-${index + 1}`,
    subjectId: "unknown",
    providerId: "unknown",
    concept: "resident_contribution",
    amountMinor: 48_600,
    currency: "GBP",
    cadence: "weekly",
    payerRole: "resident",
    payeeRole: "care_provider",
    effectiveDate: "2026-08-20",
    provenance: {
      claimId: `claim-${index + 1}`,
      sourceDocumentId: document.id,
      sourceSegmentId: document.segments[0]?.id,
      sourceQuote: document.extractedText,
      reviewState: "confirmed",
    },
  })) as [FinancialClaim, FinancialClaim];
  const request = createConfirmedCareFeeComparisonRequest({
    claims,
    sourceDocuments: documents,
    userConfirmedContext: [
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
    ],
  });
  if (!request.valid) throw new Error(request.reason);
  const comparison = runCareFeeSafeComparison(request.request, documents);
  if (comparison.status !== "ready") throw new Error(comparison.reason);
  const creation = createCareFeeComparisonCase({
    candidate: comparison.saveCandidate,
    currentSourceDocuments: documents,
    id: "care-fee-case-storage",
    now: "2026-08-20T12:00:00.000Z",
  });
  if (creation.status !== "created") throw new Error(creation.reason);
  return creation.caseRecord;
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("Care Fee case local persistence", () => {
  it("migrates older saved state additively with an empty standalone case list", () => {
    window.localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, JSON.stringify(emptyState()));
    expect(loadSavedAdminAvengerState(emptyState()).careFeeCases).toEqual([]);
  });

  it("round-trips valid cases and preserves their selected route", () => {
    const caseRecord = buildSavedCase();
    expect(saveAdminAvengerState({
      ...emptyState(),
      careFeeCases: [caseRecord],
      selectedCaseId: caseRecord.id,
    })).toEqual({ ok: true });

    const loaded = loadSavedAdminAvengerState(emptyState());
    expect(loaded.careFeeCases).toEqual([caseRecord]);
    expect(loaded.selectedCaseId).toBe(caseRecord.id);
  });

  it("filters malformed Care Fee records without discarding valid saved state", () => {
    const caseRecord = buildSavedCase();
    window.localStorage.setItem(ADMIN_AVENGER_STORAGE_KEY, JSON.stringify({
      ...emptyState(),
      careFeeCases: [caseRecord, { kind: "care_fee_comparison_case", version: 1, id: "bad" }],
    }));

    expect(loadSavedAdminAvengerState(emptyState()).careFeeCases).toEqual([caseRecord]);
  });

  it("reports a failed write so callers can keep UI state unchanged", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const result = saveAdminAvengerState({
      ...emptyState(),
      careFeeCases: [buildSavedCase()],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("could not save changes");
  });
});
