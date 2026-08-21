// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareFeeOptionalCaseSavePanel } from "../CareFeeOptionalCaseSavePanel";

afterEach(cleanup);

describe("CareFeeOptionalCaseSavePanel", () => {
  it("requires a second explicit confirmation and returns focus on cancel", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<CareFeeOptionalCaseSavePanel onSave={onSave} />);

    const trigger = screen.getByRole("button", { name: "Save this comparison as a case" });
    await user.click(trigger);
    const heading = screen.getByRole("heading", { name: "Save a local Care Fee case?" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByText(/two selected record excerpts/)).toBeTruthy();
    expect(screen.getByText(/localStorage is not encrypted/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("blocks double submit and announces success", async () => {
    const user = userEvent.setup();
    let finish: ((value: { status: "saved"; caseId: string }) => void) | undefined;
    const onSave = vi.fn(
      () => new Promise<{ status: "saved"; caseId: string }>((resolve) => { finish = resolve; }),
    );
    render(<CareFeeOptionalCaseSavePanel onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save this comparison as a case" }));
    const confirm = screen.getByRole("button", { name: "Save local case" });
    await user.dblClick(confirm);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    finish?.({ status: "saved", caseId: "care-fee-case-1" });
    expect((await screen.findByRole("status")).textContent).toContain("Care Fee case saved locally.");
  });

  it.each([
    [{ status: "duplicate", caseId: "existing" } as const, "This comparison is already saved."],
    [{ status: "failed", message: "The case could not be saved locally." } as const, "The case could not be saved locally."],
  ])("announces the save outcome", async (result, message) => {
    const user = userEvent.setup();
    render(<CareFeeOptionalCaseSavePanel onSave={vi.fn().mockResolvedValue(result)} />);
    await user.click(screen.getByRole("button", { name: "Save this comparison as a case" }));
    await user.click(screen.getByRole("button", { name: "Save local case" }));

    const region = result.status === "failed"
      ? await screen.findByRole("alert")
      : await screen.findByRole("status");
    expect(region.textContent).toContain(message);
  });
});
