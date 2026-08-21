// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CareFeeComparisonCaseV1 } from "../../lib/careFeeCase";
import { CasesView } from "../CasesView";

afterEach(cleanup);

const careFeeCase = {
  id: "care-fee-case-1",
  title: "Care fee record comparison",
  summary:
    "The two selected source amounts were safely comparable and differed for the recorded applicability.",
  createdAt: "2026-08-20T12:00:00.000Z",
  updatedAt: "2026-08-20T12:00:00.000Z",
  reconciliation: { state: "disagreement" },
  sourceRecords: [
    { document: { displayName: "council-assessment.txt" } },
    { document: { displayName: "provider-invoice.txt" } },
  ],
} as unknown as CareFeeComparisonCaseV1;

describe("CasesView Care Fee cases", () => {
  it("lists the standalone case neutrally and opens it through its own route", async () => {
    const user = userEvent.setup();
    const onOpenCareFeeCase = vi.fn();
    render(
      <CasesView
        findings={[]}
        cases={[]}
        careFeeCases={[careFeeCase]}
        impactEntries={[]}
        selectedCaseId={careFeeCase.id}
        onOpenFinding={vi.fn()}
        onOpenCase={vi.fn()}
        onOpenCareFeeCase={onOpenCareFeeCase}
      />,
    );

    const card = screen.getByRole("heading", { name: "Care fee record comparison" }).closest("article");
    if (!card) throw new Error("Expected Care Fee case card");
    const content = within(card);
    expect(content.getByText("Care Fee comparison")).toBeTruthy();
    expect(content.getByText("Saved locally")).toBeTruthy();
    expect(content.getByText(/council-assessment\.txt and provider-invoice\.txt/)).toBeTruthy();
    expect(content.queryByText(/urgency|confidence|chase|money impact/i)).toBeNull();

    await user.click(content.getByRole("button", { name: "Review saved comparison" }));
    expect(onOpenCareFeeCase).toHaveBeenCalledWith(careFeeCase.id);
  });

  it("searches source snapshot names without converting the record to a generic case", async () => {
    const user = userEvent.setup();
    render(
      <CasesView
        findings={[]}
        cases={[]}
        careFeeCases={[careFeeCase]}
        impactEntries={[]}
        onOpenFinding={vi.fn()}
        onOpenCase={vi.fn()}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "provider-invoice");
    expect(screen.getByRole("heading", { name: "Care fee record comparison" })).toBeTruthy();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "unrelated");
    expect(screen.queryByRole("heading", { name: "Care fee record comparison" })).toBeNull();
  });
});
