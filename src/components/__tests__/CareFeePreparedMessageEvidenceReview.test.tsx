// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CARE_FEE_CASE_SUMMARIES,
  type CareFeeComparisonCaseV1,
} from "../../lib/careFeeCase";
import { prepareCareFeeDraft } from "../../lib/careFeeDraftPreparation";
import { createCareFeePreparedMessageEvidenceReview } from "../../lib/careFeePreparedMessageEvidenceReview";
import { CareFeePreparedMessageEvidenceReview } from "../CareFeePreparedMessageEvidenceReview";

afterEach(cleanup);

const sourceRecord = (
  recordLabel: "Record 1" | "Record 2",
  claimId: string,
  amountMinor: number,
): CareFeeComparisonCaseV1["sourceRecords"][number] => {
  const documentId = `${claimId}-document`;
  const sourceSegmentId = `${documentId}-segment`;
  const sourceQuote = `Resident contribution: GBP ${amountMinor / 100} per week`;
  return {
    recordLabel,
    claim: {
      id: claimId,
      subjectId: "unknown",
      providerId: "unknown",
      concept: "resident_contribution",
      amountMinor,
      currency: "GBP",
      cadence: "weekly",
      payerRole: "resident",
      payeeRole: "care_provider",
      effectiveDate: "2026-08-20",
      provenance: {
        claimId,
        sourceDocumentId: documentId,
        sourceSegmentId,
        sourceQuote,
        reviewState: "confirmed",
      },
    },
    document: {
      id: documentId,
      displayName: `${recordLabel.toLowerCase().replace(" ", "-")}.txt`,
      intakeType: "text_file",
      extractionMethod: "browser_text",
      order: recordLabel === "Record 1" ? 1 : 2,
      warnings: [],
      reviewState: "confirmed",
    },
    sourceLocation: { sourceSegmentId, segmentKind: "document", segmentOrder: 1 },
    sourceQuote,
    reviewState: "confirmed",
  };
};

const savedCase = (): CareFeeComparisonCaseV1 => ({
  kind: "care_fee_comparison_case",
  version: 1,
  id: "care-fee-evidence-component",
  title: "Care fee record comparison",
  summary: CARE_FEE_CASE_SUMMARIES.disagreement,
  createdAt: "2026-08-20T12:00:00.000Z",
  updatedAt: "2026-08-20T12:00:00.000Z",
  creation: { kind: "explicit_user_save" },
  sourceRecords: [
    sourceRecord("Record 1", "claim-a", 48_600),
    sourceRecord("Record 2", "claim-b", 50_000),
  ],
  userConfirmedContext: [
    {
      kind: "user_confirmed_context",
      dimension: "same_subject",
      appliesToClaimIds: ["claim-a", "claim-b"],
      answer: "yes",
    },
    {
      kind: "user_confirmed_context",
      dimension: "same_provider",
      appliesToClaimIds: ["claim-a", "claim-b"],
      answer: "yes",
    },
  ],
  resolutionLedger: {
    subject: ["user_confirmed", "user_confirmed"],
    provider: ["user_confirmed", "user_confirmed"],
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
});

const preparedReview = (
  currentSavedCase: CareFeeComparisonCaseV1,
  editedSubject?: string,
  editedBody?: string,
) => {
  const outcome = prepareCareFeeDraft({
    kind: "care_fee_draft_preparation_request",
    version: 1,
    savedCase: savedCase(),
    intent: "explain_comparison_difference",
    recipient: { label: "Care Accounts", origin: "user_entered_drafting_input" },
  }, { id: "component-review-draft", now: "2026-08-21T10:00:00.000Z" });
  if (outcome.status !== "prepared") throw new Error(outcome.message);
  return {
    currentSavedCase,
    review: createCareFeePreparedMessageEvidenceReview({
      currentSavedCase,
      preparedDraft: outcome.draft,
      preparedContext: outcome.context,
      preparedAgainstSnapshotIdentity: outcome.preparedAgainstSnapshotIdentity,
      editedSubject: editedSubject ?? outcome.draft.preparedSubject,
      editedBody: editedBody ?? outcome.draft.preparedBody,
    }),
  };
};

describe("CareFeePreparedMessageEvidenceReview", () => {
  it("opens explicitly, moves focus, and presents statements in prepared order", async () => {
    const user = userEvent.setup();
    const props = preparedReview(savedCase());
    render(<CareFeePreparedMessageEvidenceReview {...props} />);

    expect(screen.getByText("Matches the saved Care Fee snapshot used to prepare this message.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Evidence used in the prepared wording" })).toBeNull();
    const openButton = screen.getByRole("button", { name: "Review evidence used" });
    expect(openButton.getAttribute("aria-expanded")).toBe("false");
    await user.click(openButton);

    const heading = screen.getByRole("heading", { name: "Evidence used in the prepared wording" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByRole("button", { name: "Hide evidence review" }).getAttribute("aria-expanded"))
      .toBe("true");
    const list = screen.getByRole("list", { name: "Prepared message statements" });
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(8);
    expect(screen.getAllByText("Saved source record")).toHaveLength(2);
    expect(screen.getAllByText("AdminAvenger comparison fact").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("User-entered recipient")).toBeTruthy();
    expect(screen.getAllByText("AdminAvenger template wording").length).toBeGreaterThan(0);
  });

  it("distinguishes supporting user context and fixed template wording from evidence", async () => {
    const user = userEvent.setup();
    render(<CareFeePreparedMessageEvidenceReview {...preparedReview(savedCase())} />);
    await user.click(screen.getByRole("button", { name: "Review evidence used" }));

    expect(screen.getByText(
      "Used to support the saved comparison; not stated directly in this message.",
    )).toBeTruthy();
    expect(screen.getByText("You confirmed that both records concern the same person.")).toBeTruthy();
    expect(screen.getByText("You confirmed that both records concern the same provider.")).toBeTruthy();
    expect(screen.getAllByText(
      "AdminAvenger's fixed message wording; not evidence from a record.",
    ).length).toBeGreaterThan(0);
    expect(screen.getByText(/applies only to the original AdminAvenger-prepared wording/)).toBeTruthy();
  });

  it("keeps saved source excerpts collapsed by default with accurate expansion state", async () => {
    const user = userEvent.setup();
    render(<CareFeePreparedMessageEvidenceReview {...preparedReview(savedCase())} />);
    await user.click(screen.getByRole("button", { name: "Review evidence used" }));

    const summary = screen.getByText("Review Record 1 saved source excerpt");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    await user.click(summary);
    await waitFor(() => expect(details?.open).toBe(true));
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("record-1.txt")).toBeTruthy();
    expect(screen.getByText("Resident contribution: GBP 486 per week")).toBeTruthy();
  });

  it("reports whole-field user edits without changing prepared evidence", async () => {
    const user = userEvent.setup();
    render(
      <CareFeePreparedMessageEvidenceReview
        {...preparedReview(savedCase(), "Edited subject", "Edited body")}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Review evidence used" }));
    const edits = screen.getByRole("heading", { name: "Your edits" }).closest("section");
    if (!edits) throw new Error("Expected edits region");
    expect(within(edits).getByText("Subject").nextElementSibling?.textContent).toBe("edited");
    expect(within(edits).getByText("Message").nextElementSibling?.textContent).toBe("edited");
    expect(within(edits).getByText(/does not gain source/)).toBeTruthy();
  });

  it("removes the positive claim and raises an alert for a same-ID snapshot mismatch", () => {
    const current = savedCase();
    const mismatch = { ...current, updatedAt: "2026-08-22T12:00:00.000Z" };
    render(<CareFeePreparedMessageEvidenceReview {...preparedReview(mismatch)} />);

    expect(screen.queryByText(/Matches the saved Care Fee snapshot used/)).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "no longer matches the saved Care Fee snapshot",
    );
    expect(screen.getByText(/does not prove that a real-world record is current or correct/i)).toBeTruthy();
  });
});
