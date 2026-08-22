// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CARE_FEE_CASE_SUMMARIES,
  type CareFeeComparisonCaseV1,
} from "../../lib/careFeeCase";
import { RECONCILIATION_REASON_EXPLANATIONS } from "../../lib/safeReconciliationResult";
import { CareFeeDraftPreparationPanel } from "../CareFeeDraftPreparationPanel";

afterEach(cleanup);

const record = (
  recordLabel: "Record 1" | "Record 2",
  claimId: string,
  amountMinor: number,
): CareFeeComparisonCaseV1["sourceRecords"][number] => {
  const documentId = `${claimId}-document`;
  const segmentId = `${documentId}-segment`;
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
        sourceSegmentId: segmentId,
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
    sourceLocation: {
      sourceSegmentId: segmentId,
      segmentKind: "document",
      segmentOrder: 1,
    },
    sourceQuote,
    reviewState: "confirmed",
  };
};

const caseRecord = (
  state: "agreement" | "disagreement" | "not_safely_comparable",
): CareFeeComparisonCaseV1 => {
  const secondAmount = state === "agreement" ? 48_600 : 50_000;
  const reasons = ["missing_period_context"] as const;
  return {
    kind: "care_fee_comparison_case",
    version: 1,
    id: `care-fee-panel-${state}`,
    title: "Care fee record comparison",
    summary: CARE_FEE_CASE_SUMMARIES[state],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    creation: { kind: "explicit_user_save" },
    sourceRecords: [
      record("Record 1", "claim-a", 48_600),
      record("Record 2", "claim-b", secondAmount),
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
    reconciliation: state === "agreement"
      ? {
          state,
          claimIds: ["claim-a", "claim-b"],
          amountMinor: 48_600,
          currency: "GBP",
          cadence: "weekly",
          applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
        }
      : state === "disagreement"
        ? {
            state,
            claimIds: ["claim-a", "claim-b"],
            amountsMinor: [48_600, 50_000],
            differenceMinor: 1_400,
            differenceKind: "absolute",
            currency: "GBP",
            cadence: "weekly",
            applicability: { kind: "same_effective_date", effectiveDate: "2026-08-20" },
          }
        : { state, claimIds: ["claim-a", "claim-b"], reasons },
    blockingExplanations: state === "not_safely_comparable"
      ? reasons.map((reason) => RECONCILIATION_REASON_EXPLANATIONS[reason])
      : [],
    safetyBoundary: "This comparison does not establish what should apply.",
  };
};

describe("CareFeeDraftPreparationPanel", () => {
  it("requires explicit keyboard-operable intent and preparation actions before showing a draft", async () => {
    const user = userEvent.setup();
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("disagreement")}
        onClose={vi.fn()}
      />,
    );

    const heading = screen.getByRole("heading", { name: "Prepare a message" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByRole("heading", { name: "Review and edit your prepared draft" })).toBeNull();
    const intentGroup = screen.getByRole("group", { name: "What should the message ask for?" });
    const explanation = within(intentGroup).getByRole("radio", {
      name: /Ask for an explanation of the difference/,
    });
    explanation.focus();
    await user.keyboard("[Space]");
    expect((explanation as HTMLInputElement).checked).toBe(true);

    expect(screen.getByRole("heading", { name: "Review the facts AdminAvenger will use" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "From your records" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "You confirmed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AdminAvenger comparison" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Drafting input" })).toBeTruthy();
    expect(screen.getByText("Record 1 amount: GBP 486.00")).toBeTruthy();
    expect(screen.getByText(/Absolute difference: GBP 14\.00/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Review and edit your prepared draft" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Prepare draft" }));
    const preparedHeading = screen.getByRole("heading", { name: "Review and edit your prepared draft" });
    await waitFor(() => expect(document.activeElement).toBe(preparedHeading));
    expect(screen.getAllByText("Nothing has been sent.")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /send|email|contact/i })).toBeNull();
  });

  it("prepares an agreement clarification with optional user-entered recipient and editable fields", async () => {
    const user = userEvent.setup();
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("agreement")}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /confirm or break down the figure/i }));
    await user.type(screen.getByLabelText("Recipient or organisation label (optional)"), "Care Accounts");
    await user.click(screen.getByRole("button", { name: "Prepare draft" }));

    const subject = screen.getByLabelText("Subject") as HTMLInputElement;
    const body = screen.getByLabelText("Message") as HTMLTextAreaElement;
    expect(subject.value).toBe("Request for a care fee figure breakdown");
    expect(body.value).toContain("Hello Care Accounts,");
    expect(body.value).toContain("The two safely comparable figures agree");
    expect(body.value).not.toMatch(/correct|settled|refund|owed|liab/i);

    await user.clear(subject);
    await user.type(subject, "My own subject");
    await user.clear(body);
    await user.type(body, "My own message");
    expect(screen.getByText(/Edited by you/)).toBeTruthy();
    expect(screen.getByText(/audit references still explain only the original/)).toBeTruthy();
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it("does not silently overwrite edits when re-preparing and restores focus on cancel", async () => {
    const user = userEvent.setup();
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("disagreement")}
        onClose={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /explanation of the difference/i }));
    const prepareButton = screen.getByRole("button", { name: "Prepare draft" });
    await user.click(prepareButton);
    const body = screen.getByLabelText("Message") as HTMLTextAreaElement;
    await user.clear(body);
    await user.type(body, "My carefully edited message");
    await user.click(screen.getByRole("radio", { name: /which rate or period applies/i }));
    await user.click(prepareButton);

    const confirmation = screen.getByRole("region", {
      name: "Replace your edits with a newly prepared draft?",
    });
    expect(body.value).toBe("My carefully edited message");
    await user.click(within(confirmation).getByRole("button", { name: "Keep my edits" }));
    expect(body.value).toBe("My carefully edited message");
    expect(document.activeElement).toBe(prepareButton);

    await user.click(prepareButton);
    await user.click(screen.getByRole("button", { name: "Replace my edits" }));
    await waitFor(() => expect(body.value).not.toBe("My carefully edited message"));
    expect((screen.getByLabelText("Subject") as HTMLInputElement).value).toContain("clarify");

    await user.click(prepareButton);
    expect(screen.queryByRole("region", {
      name: "Replace your edits with a newly prepared draft?",
    })).toBeNull();
  });

  it("offers only blocker-grounded NSC intents and prepares no amount or difference", async () => {
    const user = userEvent.setup();
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("not_safely_comparable")}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("radio", { name: /break down the figure/i })).toBeNull();
    expect(screen.queryByRole("radio", { name: /explanation of the difference/i })).toBeNull();
    await user.click(screen.getByRole("radio", { name: /Ask for missing information/ }));
    expect(screen.getByText(RECONCILIATION_REASON_EXPLANATIONS.missing_period_context)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Prepare draft" }));
    const body = (screen.getByLabelText("Message") as HTMLTextAreaElement).value;
    expect(body).toContain("could not be safely compared");
    expect(body).toContain("Please provide the period or effective date for each figure.");
    expect(body).not.toMatch(/absolute difference|GBP\s+\d|refund|owed/i);
  });

  it("copies the current edited subject and body and announces that nothing was sent", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("agreement")}
        onClose={vi.fn()}
        clipboard={{ writeText }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /confirm or break down the figure/i }));
    await user.click(screen.getByRole("button", { name: "Prepare draft" }));
    const subject = screen.getByLabelText("Subject");
    const body = screen.getByLabelText("Message");
    await user.clear(subject);
    await user.type(subject, "Edited subject");
    await user.clear(body);
    await user.type(body, "Edited body");
    await user.click(screen.getByRole("button", { name: "Copy text" }));

    expect(writeText).toHaveBeenCalledWith("Edited subject\n\nEdited body");
    expect(screen.getByRole("status").textContent).toBe(
      "Copied to your clipboard. Nothing has been sent.",
    );
  });

  it("preserves selectable edited text and raises an alert when copy fails", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("agreement")}
        onClose={vi.fn()}
        clipboard={{ writeText }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: /which rate or period applies/i }));
    await user.click(screen.getByRole("button", { name: "Prepare draft" }));
    const body = screen.getByLabelText("Message") as HTMLTextAreaElement;
    const preserved = body.value;
    await user.click(screen.getByRole("button", { name: "Copy text" }));

    expect(screen.getByRole("alert").textContent).toContain("Select and copy the text manually");
    expect(body.value).toBe(preserved);
  });

  it("fails closed with an accessible return option for an invalid saved case", async () => {
    const invalidCase = {
      ...caseRecord("agreement"),
      requestedRefund: 1_400,
    } as unknown as CareFeeComparisonCaseV1;
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CareFeeDraftPreparationPanel caseRecord={invalidCase} onClose={onClose} />);

    expect(screen.getByRole("alert").textContent).toContain("could not be verified");
    expect(screen.queryByRole("radio")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Return to saved case" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("discloses transient, clipboard, sensitive-edit, and no-send boundaries", () => {
    render(
      <CareFeeDraftPreparationPanel
        caseRecord={caseRecord("agreement")}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/draft is temporary/i)).toBeTruthy();
    expect(screen.getByText(/device clipboard/i)).toBeTruthy();
    expect(screen.getByText(/user edits may add sensitive information/i)).toBeTruthy();
    expect(screen.getByText("Nothing has been sent.")).toBeTruthy();
  });
});
