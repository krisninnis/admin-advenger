// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareFeeClaimConfirmationPanel } from "../CareFeeClaimConfirmationPanel";
import type { SourceDocument, SourceReviewState } from "../../lib/sourceProvenance";

afterEach(cleanup);

const sourceDocument = (
  id: string,
  amount: number,
  order: number,
  reviewState: SourceReviewState = "confirmed",
): SourceDocument => {
  const text = `Resident contribution: GBP ${amount} per week`;
  return {
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
  };
};

const documents = [
  sourceDocument("record-a", 486, 1),
  sourceDocument("record-b", 500, 2),
  sourceDocument("record-c", 510, 3),
];

const answerMissingContext = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("radio", { name: "Yes, they concern the same person" }));
  await user.click(screen.getByRole("radio", { name: "Yes, they concern the same provider" }));
  const payeeGroups = screen.getAllByRole("group", { name: /Who receives the payment in Record/ });
  for (const group of payeeGroups) {
    await user.click(within(group).getByRole("radio", { name: "Care provider" }));
  }
  await user.click(screen.getByRole("button", { name: "Review these records" }));
};

describe("CareFeeClaimConfirmationPanel", () => {
  it("shows candidates, an unverified suggestion, alternatives and blocked records", () => {
    render(
      <CareFeeClaimConfirmationPanel
        sourceDocuments={[...documents, sourceDocument("needs-review", 520, 4, "review_required")]}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Choose two care-fee records" })).toBeTruthy();
    expect(screen.getByText("Suggested starting pair")).toBeTruthy();
    expect(screen.getByText("This has not been checked for safe comparability.")).toBeTruthy();
    expect(screen.getAllByRole("checkbox", { name: /Select record from/ })).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Records that need review" })).toBeTruthy();
    expect(screen.getByText("needs-review.pdf")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /needs-review.pdf/ })).toBeNull();
  });

  it("keeps supporting passages collapsed with document identity visible", async () => {
    const user = userEvent.setup();
    render(<CareFeeClaimConfirmationPanel sourceDocuments={documents.slice(0, 2)} onExit={vi.fn()} />);

    const disclosure = screen.getByRole("button", {
      name: "Show supporting passage for record-a.pdf",
    });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("record-a.pdf")).toBeTruthy();
    expect(screen.queryByText("Resident contribution: GBP 486 per week")).toBeNull();

    await user.click(disclosure);
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Resident contribution: GBP 486 per week")).toBeTruthy();
  });

  it("requires explicit selection, separate context and explicit ordered confirmation", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(
      <CareFeeClaimConfirmationPanel
        sourceDocuments={documents.slice(0, 2)}
        onExit={vi.fn()}
        onReady={onReady}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: /Select record from/ }).every((item) => !(item as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Use suggested pair" }));
    await user.click(screen.getByRole("button", { name: "Continue with these records" }));

    expect(screen.getByRole("heading", { name: "Confirm missing context" })).toBeTruthy();
    await answerMissingContext(user);

    expect(screen.getByRole("heading", { name: "Review Record 1 and Record 2" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Record 1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Record 2" })).toBeTruthy();
    expect(onReady).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm these two records" }));

    expect(screen.getByRole("heading", { name: "Records ready for comparison" })).toBeTruthy();
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0][0].claimIds).toEqual([
      "financial-claim:record-a:record-a-page-1:1",
      "financial-claim:record-b:record-b-page-1:1",
    ]);
    expect(screen.queryByText(/agreement|disagreement|difference|overcharge/i)).toBeNull();
  });

  it("supports alternative selection, Back state and focus transitions", async () => {
    const user = userEvent.setup();
    render(<CareFeeClaimConfirmationPanel sourceDocuments={documents} onExit={vi.fn()} />);

    const choices = screen.getAllByRole("checkbox", { name: /Select record from/ });
    await user.click(choices[0]);
    await user.click(choices[2]);
    await user.click(screen.getByRole("button", { name: "Continue with these records" }));

    const contextHeading = screen.getByRole("heading", { name: "Confirm missing context" });
    await waitFor(() => expect(document.activeElement).toBe(contextHeading));
    await user.click(screen.getByRole("button", { name: "Back to record choices" }));
    expect((choices[0] as HTMLInputElement).checked).toBe(true);
    expect((choices[2] as HTMLInputElement).checked).toBe(true);
  });

  it("clears tentative selection and context when source documents are replaced", async () => {
    const user = userEvent.setup();
    const onInvalidated = vi.fn();
    const { rerender } = render(
      <CareFeeClaimConfirmationPanel
        sourceDocuments={documents.slice(0, 2)}
        onExit={vi.fn()}
        onInvalidated={onInvalidated}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Use suggested pair" }));
    expect(
      screen.getAllByRole("checkbox", { name: /Select record from/ }).every(
        (item) => (item as HTMLInputElement).checked,
      ),
    ).toBe(true);
    onInvalidated.mockClear();

    rerender(
      <CareFeeClaimConfirmationPanel
        sourceDocuments={[documents[0], sourceDocument("replacement", 530, 2)]}
        onExit={vi.fn()}
        onInvalidated={onInvalidated}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("checkbox", { name: /Select record from/ }).every(
          (item) => !(item as HTMLInputElement).checked,
        ),
      ).toBe(true);
    });
    expect(screen.getByText("replacement.pdf")).toBeTruthy();
    expect(onInvalidated).toHaveBeenCalledTimes(1);
  });
});
