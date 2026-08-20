// @vitest-environment jsdom

import { vi } from "vitest";

const { runCareFeeSafeComparisonMock } = vi.hoisted(() => ({
  runCareFeeSafeComparisonMock: vi.fn(),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

vi.mock("../../lib/documentFileText", () => ({
  extractDocxText: vi.fn(),
  extractPdfText: vi.fn(),
}));

vi.mock("../../lib/careFeeSafeComparison", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/careFeeSafeComparison")>()),
  runCareFeeSafeComparison: runCareFeeSafeComparisonMock,
}));

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CareFeeSafeComparisonResultViewModel } from "../../lib/careFeeSafeComparison";
import { HomeView } from "../HomeView";

const defaultInboxScanSettings = {
  startupPromptDismissed: true,
  showStartupPrompt: false,
  previewEnabled: false,
  showEmailSafetyCheckButton: false,
  notifySavings: false,
  notifySuspicious: false,
  notificationMethod: "in_app" as const,
  ignoredItemIds: [],
  betaInterestFutureAlerts: false,
  betaAlertsNote: "",
};

const comparisonModel = (
  state: CareFeeSafeComparisonResultViewModel["state"],
): CareFeeSafeComparisonResultViewModel => ({
  state,
  heading:
    state === "agreement"
      ? "These safely comparable amounts agree."
      : state === "disagreement"
        ? "These safely comparable amounts differ."
        : "These figures are not safely comparable.",
  summary: "A local, transient comparison of the selected records.",
  safetyBoundary: "This comparison does not establish what should apply.",
  records: [
    {
      recordLabel: "Record 1",
      documentName: "record-a.txt",
      amountText: "GBP 486.00",
      cadenceText: "Weekly",
      sourceApplicabilityText: "Effective 2026-08-20",
      sourceLocationText: "Document section",
      reviewStateText: "Source review confirmed",
      sourceQuote: "Resident contribution: GBP 486 per week",
    },
    {
      recordLabel: "Record 2",
      documentName: "record-b.txt",
      amountText: state === "agreement" ? "GBP 486.00" : "GBP 500.00",
      cadenceText: "Weekly",
      sourceApplicabilityText: "Effective 2026-08-20",
      sourceLocationText: "Document section",
      reviewStateText: "Source review confirmed",
      sourceQuote: "Resident contribution: GBP 500 per week",
    },
  ],
  confirmedContext: [
    { label: "Subject", value: "You confirmed that both records concern the same person." },
    { label: "Provider", value: "You confirmed that both records concern the same provider." },
  ],
  resolutionLedger: {
    subject: ["user_confirmed", "user_confirmed"],
    provider: ["user_confirmed", "user_confirmed"],
    payerRoles: ["source_derived", "source_derived"],
    payeeRoles: ["source_derived", "source_derived"],
  },
  comparison: {
    stateText:
      state === "not_safely_comparable"
        ? "No financial relationship has been established."
        : "The selected source amounts were safely compared.",
    ...(state === "disagreement" ? { differenceText: "£14.00 per week" } : {}),
    ...(state === "not_safely_comparable"
      ? {}
      : { applicabilityText: "Same effective date: 2026-08-20" }),
  },
  blockingReasons:
    state === "not_safely_comparable"
      ? ["These figures use different payment periods, so they cannot be compared directly."]
      : [],
  allowedActions: ["change_records", "back_to_documents", "start_over"],
});

const renderHomeView = () => {
  const props = {
    onCheck: vi.fn().mockResolvedValue(true),
    onSaveCase: vi.fn(),
    onSaveRecord: vi.fn(),
    onClearResult: vi.fn(),
    onUpdateInboxScanSettings: vi.fn(),
    onIgnoreInboxScanItem: vi.fn(),
    onSaveScannedItem: vi.fn(),
    onSaveEmailSafetyCase: vi.fn(),
  };
  render(
    <HomeView
      analysisStatus="idle"
      inboxScanSettings={defaultInboxScanSettings}
      {...props}
    />,
  );
  return props;
};

const attachAndConfirmPair = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Compare care-fee records" }));
  const files = [
    new File(
      ["Resident contribution: GBP 486 per week; effective 2026-08-20; payee: care provider"],
      "record-a.txt",
      { type: "text/plain" },
    ),
    new File(
      ["Resident contribution: GBP 500 per week; effective 2026-08-20; payee: care provider"],
      "record-b.txt",
      { type: "text/plain" },
    ),
  ];
  await user.upload(screen.getByLabelText("Choose photos or files"), files);
  await screen.findByText("record-a.txt");
  await user.click(screen.getByRole("button", { name: "Review record candidates" }));
  await user.click(screen.getByRole("button", { name: "Use suggested pair" }));
  await user.click(screen.getByRole("button", { name: "Continue with these records" }));
  await user.click(screen.getByRole("radio", { name: "Yes, they concern the same person" }));
  await user.click(screen.getByRole("radio", { name: "Yes, they concern the same provider" }));
  await user.click(screen.getByRole("button", { name: "Review these records" }));
  await user.click(screen.getByRole("button", { name: "Confirm these two records" }));
  await screen.findByRole("heading", { name: "Records ready for comparison" });
};

beforeEach(() => {
  vi.stubEnv("VITE_ENABLE_CONTROLLED_BETAS", "true");
  runCareFeeSafeComparisonMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("HomeView Care Fee safe comparison result", () => {
  it("requires the explicit Compare these records action and then focuses agreement", async () => {
    const user = userEvent.setup();
    const props = renderHomeView();
    await attachAndConfirmPair(user);

    expect(runCareFeeSafeComparisonMock).not.toHaveBeenCalled();
    expect(screen.getByText(/No comparison has run yet/)).toBeTruthy();
    runCareFeeSafeComparisonMock.mockReturnValue({
      status: "ready",
      model: comparisonModel("agreement"),
    });

    await user.click(screen.getByRole("button", { name: "Compare these records" }));

    const heading = screen.getByRole("heading", {
      name: "These safely comparable amounts agree.",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(runCareFeeSafeComparisonMock).toHaveBeenCalledTimes(1);
    expect(props.onCheck).not.toHaveBeenCalled();
    expect(props.onSaveCase).not.toHaveBeenCalled();
    expect(props.onSaveRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["disagreement", "These safely comparable amounts differ."],
    ["not_safely_comparable", "These figures are not safely comparable."],
  ] as const)("renders the %s result returned by the adapter", async (state, heading) => {
    const user = userEvent.setup();
    renderHomeView();
    await attachAndConfirmPair(user);
    runCareFeeSafeComparisonMock.mockReturnValue({
      status: "ready",
      model: comparisonModel(state),
    });

    await user.click(screen.getByRole("button", { name: "Compare these records" }));

    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    if (state === "not_safely_comparable") {
      expect(screen.queryByText("Absolute difference")).toBeNull();
    }
  });

  it("invalidates a result before changing the pair or returning to documents", async () => {
    const user = userEvent.setup();
    renderHomeView();
    await attachAndConfirmPair(user);
    runCareFeeSafeComparisonMock.mockReturnValue({
      status: "ready",
      model: comparisonModel("disagreement"),
    });
    await user.click(screen.getByRole("button", { name: "Compare these records" }));

    await user.click(screen.getByRole("button", { name: "Change records" }));
    expect(screen.queryByRole("heading", { name: "These safely comparable amounts differ." })).toBeNull();
    expect(screen.getByRole("heading", { name: "Choose two care-fee records" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Use suggested pair" }));
    await user.click(screen.getByRole("button", { name: "Continue with these records" }));
    await user.click(screen.getByRole("radio", { name: "Yes, they concern the same person" }));
    expect(screen.queryByRole("heading", { name: "These safely comparable amounts differ." })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Change attached records" }));
    expect(screen.getByRole("button", { name: "Remove record-a.txt" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Remove record-a.txt" }));
    expect(screen.queryByText("record-a.txt")).toBeNull();
    await user.upload(
      screen.getByLabelText("Choose photos or files"),
      new File(
        ["Resident contribution: GBP 510 per week; effective 2026-08-20; payee: care provider"],
        "replacement.txt",
        { type: "text/plain" },
      ),
    );
    await screen.findByText("replacement.txt");
    expect(screen.queryByRole("heading", { name: /safely comparable amounts/ })).toBeNull();
  });

  it("shows a fail-closed message without leaving a stale result", async () => {
    const user = userEvent.setup();
    renderHomeView();
    await attachAndConfirmPair(user);
    runCareFeeSafeComparisonMock.mockReturnValue({
      status: "failed",
      reason: "safe_result_not_composed",
      message: "The comparison could not be safely matched to the selected records. No result is shown.",
    });

    await user.click(screen.getByRole("button", { name: "Compare these records" }));

    expect(screen.getByRole("alert").textContent).toContain("No result is shown");
    expect(screen.queryByRole("heading", { name: /safely comparable amounts/ })).toBeNull();
    expect(screen.queryByText("Absolute difference")).toBeNull();
  });

  it("starts over locally and exposes no case, save, draft, chase, contact or export action", async () => {
    const user = userEvent.setup();
    const props = renderHomeView();
    await attachAndConfirmPair(user);
    runCareFeeSafeComparisonMock.mockReturnValue({
      status: "ready",
      model: comparisonModel("agreement"),
    });
    await user.click(screen.getByRole("button", { name: "Compare these records" }));

    expect(screen.queryByRole("button", { name: /save|draft|chase|contact|submit|export/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Start over" }));

    expect(screen.getByRole("heading", { name: "Prepare care-fee records" })).toBeTruthy();
    expect(screen.queryByText("record-a.txt")).toBeNull();
    expect(screen.queryByRole("heading", { name: "These safely comparable amounts agree." })).toBeNull();
    expect(props.onSaveCase).not.toHaveBeenCalled();
    expect(props.onSaveRecord).not.toHaveBeenCalled();
  });
});
