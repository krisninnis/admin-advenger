// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CareFeeComparisonCaseV1 } from "../../lib/careFeeCase";
import { CareFeeComparisonCaseView } from "../CareFeeComparisonCaseView";

afterEach(cleanup);

const caseRecord: CareFeeComparisonCaseV1 = {
  kind: "care_fee_comparison_case",
  version: 1,
  id: "care-fee-case-1",
  title: "Care fee record comparison",
  summary:
    "The two selected source amounts were safely comparable and differed for the recorded applicability. This does not establish which amount is correct, whether anyone is at fault, or whether money is owed.",
  createdAt: "2026-08-20T12:00:00.000Z",
  updatedAt: "2026-08-20T12:00:00.000Z",
  creation: { kind: "explicit_user_save" },
  sourceRecords: [
    {
      recordLabel: "Record 1",
      claim: {
        id: "claim-a",
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
          claimId: "claim-a",
          sourceDocumentId: "record-a",
          sourceSegmentId: "record-a-segment-1",
          sourceQuote: "Resident contribution: GBP 486 per week",
          reviewState: "confirmed",
        },
      },
      document: {
        id: "record-a",
        displayName: "record-a.txt",
        intakeType: "text_file",
        extractionMethod: "browser_text",
        order: 1,
        warnings: [],
        reviewState: "confirmed",
      },
      sourceLocation: { sourceSegmentId: "record-a-segment-1" },
      sourceQuote: "Resident contribution: GBP 486 per week",
      reviewState: "confirmed",
    },
    {
      recordLabel: "Record 2",
      claim: {
        id: "claim-b",
        subjectId: "unknown",
        providerId: "unknown",
        concept: "resident_contribution",
        amountMinor: 50_000,
        currency: "GBP",
        cadence: "weekly",
        payerRole: "resident",
        payeeRole: "care_provider",
        effectiveDate: "2026-08-20",
        provenance: {
          claimId: "claim-b",
          sourceDocumentId: "record-b",
          sourceSegmentId: "record-b-segment-1",
          sourceQuote: "Resident contribution: GBP 500 per week",
          reviewState: "confirmed",
        },
      },
      document: {
        id: "record-b",
        displayName: "record-b.txt",
        intakeType: "text_file",
        extractionMethod: "browser_text",
        order: 2,
        warnings: [],
        reviewState: "confirmed",
      },
      sourceLocation: { sourceSegmentId: "record-b-segment-1" },
      sourceQuote: "Resident contribution: GBP 500 per week",
      reviewState: "confirmed",
    },
  ],
  userConfirmedContext: [
    {
      kind: "user_confirmed_context",
      dimension: "same_subject",
      appliesToClaimIds: ["claim-a", "claim-b"],
      answer: "yes",
    },
  ],
  resolutionLedger: {
    subject: ["user_confirmed", "user_confirmed"],
    provider: ["source_derived", "source_derived"],
    payerRoles: ["source_derived", "source_derived"],
    payeeRoles: ["source_derived", "source_derived"],
  },
  reconciliation: {
    state: "disagreement",
    claimIds: ["claim-a", "claim-b"],
    amountsMinor: [48_600, 50_000],
    differenceMinor: 1_400,
    differenceKind: "absolute",
    currency: "GBP",
    cadence: "weekly",
    applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
  },
  blockingExplanations: [],
  safetyBoundary: "This comparison does not establish what should apply.",
};

describe("CareFeeComparisonCaseView", () => {
  it("renders a read-only three-way provenance view without generic actions", async () => {
    render(
      <CareFeeComparisonCaseView
        caseRecord={caseRecord}
        notice="Care Fee case saved locally."
        onDelete={vi.fn()}
        onBackToCases={vi.fn()}
        onReturnToCareFee={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Care fee record comparison" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("heading", { name: "From your records" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "You confirmed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AdminAvenger comparison" })).toBeTruthy();
    expect(screen.getByText("Absolute comparison difference")).toBeTruthy();
    expect(screen.getByText(/14\.00/)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("saved locally");
    expect(
      screen.queryByRole("button", { name: /draft|chase|export|outcome|money|send|contact/i }),
    ).toBeNull();
  });

  it.each(["agreement", "not_safely_comparable"] as const)(
    "renders a neutral %s snapshot without inventing a financial difference",
    (state) => {
      const variant: CareFeeComparisonCaseV1 = {
        ...caseRecord,
        reconciliation: state === "agreement"
          ? {
              state,
              claimIds: ["claim-a", "claim-b"],
              amountMinor: 48_600,
              currency: "GBP",
              cadence: "weekly",
              applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
            }
          : {
              state,
              claimIds: ["claim-a", "claim-b"],
              reasons: ["different_effective_dates"],
            },
        blockingExplanations: state === "not_safely_comparable"
          ? ["The records apply on different stated dates."]
          : [],
      };
      render(
        <CareFeeComparisonCaseView
          caseRecord={variant}
          onDelete={vi.fn()}
          onBackToCases={vi.fn()}
          onReturnToCareFee={vi.fn()}
        />,
      );

      expect(screen.queryByText("Absolute comparison difference")).toBeNull();
      if (state === "not_safely_comparable") {
        expect(screen.getByRole("heading", { name: "Blocking reasons" })).toBeTruthy();
        expect(screen.getByText("The records apply on different stated dates.")).toBeTruthy();
      } else {
        expect(screen.getByText("Same effective date: 2026-08-20")).toBeTruthy();
      }
    },
  );

  it("requires explicit confirmation before deletion and reports failure", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue({
      status: "failed",
      message: "The locally saved case could not be deleted.",
    });
    render(
      <CareFeeComparisonCaseView
        caseRecord={caseRecord}
        onDelete={onDelete}
        onBackToCases={vi.fn()}
        onReturnToCareFee={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete saved case" }));
    const region = screen.getByRole("region", { name: "Delete this locally saved Care Fee case?" });
    expect(within(region).getByText(/entire local saved snapshot/)).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(within(region).getByRole("button", { name: "Delete local case" }));
    expect(onDelete).toHaveBeenCalledWith(caseRecord.id);
    expect((await screen.findByRole("alert")).textContent).toContain("could not be deleted");
  });

  it("cancels deletion without removing the case and restores trigger focus", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <CareFeeComparisonCaseView
        caseRecord={caseRecord}
        onDelete={onDelete}
        onBackToCases={vi.fn()}
        onReturnToCareFee={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Delete saved case" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });
});
