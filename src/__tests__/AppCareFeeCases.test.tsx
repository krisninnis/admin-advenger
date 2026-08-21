// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CareFeeComparisonCaseV1 } from "../lib/careFeeCase";

const { saveAdminAvengerStateMock, testState, saveCandidate, sourceDocuments } = vi.hoisted(() => {
  const documents = [1, 2].map((order) => ({
    id: `source-${order}`,
    displayName: `source-${order}.txt`,
    intakeType: "text_file",
    extractionMethod: "browser_text",
    order,
    extractedText: "Resident contribution: GBP 486 per week; effective 2026-08-20",
    warnings: [],
    reviewState: "confirmed",
    segments: [{
      id: `source-${order}-segment`,
      kind: "document",
      order: 1,
      text: "Resident contribution: GBP 486 per week; effective 2026-08-20",
    }],
  }));
  const claims = documents.map((document, index) => ({
    id: `source-claim-${index + 1}`,
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
      claimId: `source-claim-${index + 1}`,
      sourceDocumentId: document.id,
      sourceSegmentId: document.segments[0].id,
      sourceQuote: document.extractedText,
      reviewState: "confirmed",
    },
  }));
  const context = [
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
  return {
    saveAdminAvengerStateMock: vi.fn(),
    testState: { initialCareFeeCases: [] as CareFeeComparisonCaseV1[] },
    sourceDocuments: documents,
    saveCandidate: {
      kind: "care_fee_comparison_save_candidate",
      version: 1,
      request: {
        kind: "care_fee_comparison_request",
        version: 1,
        claimIds: [claims[0].id, claims[1].id],
        claims,
        sourceDocuments: documents,
        userConfirmedContext: context,
        confirmation: {
          kind: "explicit_pair_confirmation",
          state: "confirmed",
          claimIds: [claims[0].id, claims[1].id],
        },
      },
      resolutionLedger: {
        subject: ["user_confirmed", "user_confirmed"],
        provider: ["user_confirmed", "user_confirmed"],
        payerRoles: ["source_derived", "source_derived"],
        payeeRoles: ["source_derived", "source_derived"],
      },
      reconciliation: {
        state: "agreement",
        claimIds: [claims[0].id, claims[1].id],
        amountMinor: 48_600,
        currency: "GBP",
        cadence: "weekly",
        applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
      },
      blockingExplanations: [],
      safetyBoundary: "This comparison does not establish what should apply.",
    },
  };
});

const caseRecord = {
  kind: "care_fee_comparison_case",
  version: 1,
  id: "care-fee-case-app",
  title: "Care fee record comparison",
  summary: "A neutral saved comparison.",
  createdAt: "2026-08-20T12:00:00.000Z",
  updatedAt: "2026-08-20T12:00:00.000Z",
  reconciliation: { state: "agreement" },
  sourceRecords: [
    { document: { displayName: "record-a.txt" } },
    { document: { displayName: "record-b.txt" } },
  ],
} as unknown as CareFeeComparisonCaseV1;

vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
vi.mock("../lib/documentFileText", () => ({ extractDocxText: vi.fn(), extractPdfText: vi.fn() }));
vi.mock("../lib/termsAcceptance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/termsAcceptance")>()),
  hasAcceptedCurrentTerms: () => true,
}));
vi.mock("../lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/storage")>()),
  loadSavedAdminAvengerState: () => ({
    adminItems: [],
    findings: [],
    adminCases: [],
    drafts: [],
    impactEntries: [],
    careFeeCases: [...testState.initialCareFeeCases],
    selectedCaseId: testState.initialCareFeeCases[0]?.id,
  }),
  getLastStorageLoadDiagnostic: () => ({
    source: "invalid",
    caseCount: 0,
    itemCount: 0,
    findingCount: 0,
    impactCount: 0,
    skippedKeys: [],
  }),
  saveAdminAvengerState: saveAdminAvengerStateMock,
  subscribeToStorageSaveErrors: () => () => undefined,
}));
vi.mock("../components/CareFeeComparisonCaseView", () => ({
  CareFeeComparisonCaseView: ({
    caseRecord: selected,
    onDelete,
  }: {
    caseRecord: CareFeeComparisonCaseV1;
    onDelete: (id: string) => Promise<unknown>;
  }) => (
    <section>
      <h2>{selected.title}</h2>
      <button type="button" onClick={() => void onDelete(selected.id)}>
        Confirm test deletion
      </button>
    </section>
  ),
}));
vi.mock("../views/HomeView", () => ({
  HomeView: ({ onSaveCareFeeCase }: { onSaveCareFeeCase: (candidate: unknown, documents: unknown[]) => Promise<unknown> }) => (
    <button type="button" onClick={() => void onSaveCareFeeCase(saveCandidate, sourceDocuments)}>
      Trigger Care Fee save
    </button>
  ),
}));

import App from "../App";

beforeEach(() => {
  saveAdminAvengerStateMock.mockReset();
  saveAdminAvengerStateMock.mockReturnValue({ ok: true });
  testState.initialCareFeeCases = [caseRecord];
});

afterEach(cleanup);

const openSavedCareFeeCase = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getAllByRole("button", { name: /Saved items|Saved/ })[0]);
  await user.click(screen.getByRole("button", { name: "Review saved comparison" }));
  expect(screen.getByRole("heading", { name: "Care fee record comparison" })).toBeTruthy();
};

describe("App Care Fee case integration", () => {
  it("reopens a standalone saved snapshot and atomically deletes the whole record", async () => {
    const user = userEvent.setup();
    render(<App />);
    await openSavedCareFeeCase(user);
    await user.click(screen.getByRole("button", { name: "Confirm test deletion" }));

    await waitFor(() => expect(saveAdminAvengerStateMock).toHaveBeenCalledTimes(1));
    expect(saveAdminAvengerStateMock.mock.calls[0]?.[0]).toMatchObject({
      careFeeCases: [],
      adminCases: [],
      drafts: [],
      impactEntries: [],
    });
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Care fee record comparison" })).toBeNull(),
    );
    expect(screen.getByRole("status").textContent).toContain("deleted from this browser");
  });

  it("keeps the saved case selected when the atomic delete write fails", async () => {
    const user = userEvent.setup();
    saveAdminAvengerStateMock.mockReturnValue({
      ok: false,
      message: "AdminAvenger could not save changes in this browser.",
      error: new DOMException("Quota exceeded", "QuotaExceededError"),
    });
    render(<App />);
    await openSavedCareFeeCase(user);
    await user.click(screen.getByRole("button", { name: "Confirm test deletion" }));

    await waitFor(() => expect(saveAdminAvengerStateMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { name: "Care fee record comparison" })).toBeTruthy();
  });

  it("persists a complete next workspace once before exposing a newly saved case", async () => {
    const user = userEvent.setup();
    testState.initialCareFeeCases = [];
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Trigger Care Fee save" }));

    await waitFor(() => expect(saveAdminAvengerStateMock).toHaveBeenCalledTimes(1));
    const nextState = saveAdminAvengerStateMock.mock.calls[0]?.[0];
    expect(nextState.careFeeCases).toHaveLength(1);
    expect(nextState.adminCases).toEqual([]);
    expect(nextState.drafts).toEqual([]);
    expect(nextState.impactEntries).toEqual([]);
    expect(await screen.findByRole("heading", { name: "Care fee record comparison" })).toBeTruthy();
  });

  it("creates no in-memory-only case when the atomic save write fails", async () => {
    const user = userEvent.setup();
    testState.initialCareFeeCases = [];
    saveAdminAvengerStateMock.mockReturnValue({
      ok: false,
      message: "AdminAvenger could not save changes in this browser.",
      error: new DOMException("Quota exceeded", "QuotaExceededError"),
    });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Trigger Care Fee save" }));

    await waitFor(() => expect(saveAdminAvengerStateMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Trigger Care Fee save" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Care fee record comparison" })).toBeNull();
  });
});
