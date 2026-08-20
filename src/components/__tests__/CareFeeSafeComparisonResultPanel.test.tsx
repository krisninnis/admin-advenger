// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CareFeeSafeComparisonResultViewModel } from "../../lib/careFeeSafeComparison";
import { CareFeeSafeComparisonResultPanel } from "../CareFeeSafeComparisonResultPanel";

afterEach(cleanup);

const baseModel: CareFeeSafeComparisonResultViewModel = {
  state: "agreement",
  heading: "These safely comparable amounts agree.",
  summary: "The selected source figures agree for the stated comparison.",
  safetyBoundary: "This comparison does not establish what should apply.",
  records: [
    {
      recordLabel: "Record 1",
      documentName: "record-a.pdf",
      amountText: "GBP 486.00",
      cadenceText: "Weekly",
      sourceApplicabilityText: "Effective 2026-08-20",
      sourceLocationText: "Page 1",
      reviewStateText: "Source review confirmed",
      sourceQuote: "Resident contribution: GBP 486 per week",
    },
    {
      recordLabel: "Record 2",
      documentName: "record-b.pdf",
      amountText: "GBP 486.00",
      cadenceText: "Weekly",
      sourceApplicabilityText: "Effective 2026-08-20",
      sourceLocationText: "Page 2",
      reviewStateText: "Source review confirmed",
      sourceQuote: "Weekly resident contribution is GBP 486",
    },
  ],
  confirmedContext: [
    {
      label: "Subject",
      value: "You confirmed that both records concern the same person.",
    },
  ],
  resolutionLedger: {
    subject: ["user_confirmed", "user_confirmed"],
    provider: ["source_derived", "source_derived"],
    payerRoles: ["source_derived", "source_derived"],
    payeeRoles: ["source_derived", "source_derived"],
  },
  comparison: {
    stateText: "The selected source amounts are safely comparable and agree.",
    applicabilityText: "Same effective date: 2026-08-20",
  },
  blockingReasons: [],
  allowedActions: ["change_records", "back_to_documents", "start_over"],
};

const renderPanel = (model: CareFeeSafeComparisonResultViewModel = baseModel) => {
  const actions = {
    onChangeRecords: vi.fn(),
    onBackToDocuments: vi.fn(),
    onStartOver: vi.fn(),
  };
  render(<CareFeeSafeComparisonResultPanel model={model} {...actions} />);
  return actions;
};

describe("CareFeeSafeComparisonResultPanel", () => {
  it("renders agreement with separate source, user and derived semantic regions", async () => {
    renderPanel();

    const heading = screen.getByRole("heading", {
      name: "These safely comparable amounts agree.",
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("heading", { name: "From your records" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "You confirmed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AdminAvenger comparison" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "What to check next" })).toBeTruthy();
    expect(screen.getByText("record-a.pdf")).toBeTruthy();
    expect(screen.getByText("You confirmed that both records concern the same person.")).toBeTruthy();
  });

  it("keeps source passages collapsed and exposes aria-expanded", async () => {
    const user = userEvent.setup();
    renderPanel();

    const disclosure = screen.getByRole("button", {
      name: "Show source passage for Record 1",
    });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Resident contribution: GBP 486 per week")).toBeNull();

    await user.click(disclosure);
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Resident contribution: GBP 486 per week")).toBeTruthy();
  });

  it("renders disagreement with the supplied absolute difference and applicability", () => {
    renderPanel({
      ...baseModel,
      state: "disagreement",
      heading: "These safely comparable amounts differ.",
      comparison: {
        stateText: "The selected source amounts are safely comparable and differ.",
        differenceText: "£14.00 per week",
        applicabilityText: "Same effective date: 2026-08-20",
      },
    });

    expect(screen.getByRole("heading", { name: "These safely comparable amounts differ." })).toBeTruthy();
    expect(screen.getByText("Absolute difference")).toBeTruthy();
    expect(screen.getByText("£14.00 per week")).toBeTruthy();
    expect(screen.getByText("Same effective date: 2026-08-20")).toBeTruthy();
  });

  it("renders not safely comparable without a difference or applicability conclusion", () => {
    renderPanel({
      ...baseModel,
      state: "not_safely_comparable",
      heading: "These figures are not safely comparable.",
      comparison: {
        stateText: "No financial relationship has been established.",
      },
      blockingReasons: [
        "These figures use different payment periods, so they cannot be compared directly.",
      ],
    });

    expect(screen.getByRole("heading", { name: "These figures are not safely comparable." })).toBeTruthy();
    expect(screen.getByText(/different payment periods/)).toBeTruthy();
    expect(screen.queryByText("Absolute difference")).toBeNull();
    expect(screen.queryByText("Applicability")).toBeNull();
    expect(document.body.textContent).not.toContain("different_cadence");
  });

  it("offers only the permitted actions and invokes their callbacks", async () => {
    const user = userEvent.setup();
    const actions = renderPanel();
    const nextRegion = screen.getByRole("heading", { name: "What to check next" }).parentElement;
    if (!nextRegion) throw new Error("Missing next-check region.");

    await user.click(within(nextRegion).getByRole("button", { name: "Change records" }));
    await user.click(within(nextRegion).getByRole("button", { name: "Back to documents" }));
    await user.click(within(nextRegion).getByRole("button", { name: "Start over" }));

    expect(actions.onChangeRecords).toHaveBeenCalledTimes(1);
    expect(actions.onBackToDocuments).toHaveBeenCalledTimes(1);
    expect(actions.onStartOver).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /save|draft|chase|contact|submit|export/i })).toBeNull();
  });

  it("does not expose internal IDs, raw reason codes or prohibited conclusions", () => {
    renderPanel();
    const visible = document.body.textContent ?? "";

    expect(visible).not.toMatch(/financial-claim:|care-fee-session-|different_cadence/);
    expect(visible).not.toMatch(
      /is correct|is liable|is entitled|overcharge|underpayment|refund is due|reimbursement is due/i,
    );
  });
});
