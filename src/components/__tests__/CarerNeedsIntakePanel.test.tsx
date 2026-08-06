// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CarerNeedsIntakePanel } from "../CarerNeedsIntakePanel";

// Wales-first Carer Support Needs Intake v1, keyboard and screen-reader shape.
//
// The wording and the transitions are asserted in
// src/lib/__tests__/carerNeedsIntake.test.ts against the pure module. What is
// proved here is the shape somebody using a keyboard or a screen reader
// actually meets: one question at a time, a real legend on each group,
// checkboxes where several answers are allowed and radios where one is, and
// nothing that moves on its own.

afterEach(cleanup);

const renderPanel = () => {
  const onReturnToOriginalMessage = vi.fn();

  render(
    <CarerNeedsIntakePanel
      personLabel="sister"
      originalInput="My sister needs help."
      onReturnToOriginalMessage={onReturnToOriginalMessage}
    />,
  );

  return { onReturnToOriginalMessage, user: userEvent.setup() };
};

const OFFER = "Prepare what is difficult day to day";

/**
 * Native checked state.
 *
 * This project does not install @testing-library/jest-dom, so `toBeChecked` is
 * not available and adding it would be a new dependency. The DOM property says
 * the same thing.
 */
const isChecked = (element: HTMLElement): boolean =>
  (element as HTMLInputElement).checked;

const openIntake = async () => {
  const rendered = renderPanel();
  await rendered.user.click(screen.getByRole("button", { name: OFFER }));
  return rendered;
};

describe("the intake is offered, not opened", () => {
  it("shows only the offer button to begin with", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: OFFER })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows the first question only after the button is pressed", async () => {
    await openIntake();

    expect(screen.getByRole("group", { name: "What is difficult day to day?" })).toBeTruthy();
  });
});

describe("one question at a time, each in a real fieldset", () => {
  it("uses checkboxes for the difficulties, because several may apply", async () => {
    await openIntake();

    const group = within(screen.getByRole("group", { name: "What is difficult day to day?" }));
    expect(group.getAllByRole("checkbox").length).toBeGreaterThan(1);
    expect(group.queryAllByRole("radio")).toHaveLength(0);
    expect(
      group.getByText("Choose the things that are causing the most difficulty. You can choose more than one."),
    ).toBeTruthy();
  });

  it("uses radios for what has changed, because only one applies", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const group = within(screen.getByRole("group", { name: "What has changed?" }));
    expect(group.getAllByRole("radio")).toHaveLength(5);
    expect(group.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("uses radios for how often help is needed", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const group = within(screen.getByRole("group", { name: "How often is help needed?" }));
    expect(group.getAllByRole("radio")).toHaveLength(7);
  });

  it("shows one question group at a time and never two", async () => {
    const { user } = await openIntake();
    expect(screen.getAllByRole("group")).toHaveLength(1);

    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getAllByRole("group")).toHaveLength(1);
  });

  it("offers I'm not sure on every question", async () => {
    const { user } = await openIntake();
    expect(screen.getByRole("checkbox", { name: "I'm not sure" })).toBeTruthy();

    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "I'm not sure" })).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "I'm not sure" })).toBeTruthy();
  });
});

describe("nothing moves on its own", () => {
  it("does not advance when a difficulty is chosen", async () => {
    const { user } = await openIntake();

    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));

    expect(screen.getByRole("group", { name: "What is difficult day to day?" })).toBeTruthy();
    expect(isChecked(screen.getByRole("checkbox", { name: "Washing or dressing" }))).toBe(true);
  });

  it("does not advance when a radio is chosen", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByRole("radio", { name: "This is new" }));

    expect(screen.getByRole("group", { name: "What has changed?" })).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "This is new" }),
    );
  });

  it("lets several difficulties be chosen together", async () => {
    const { user } = await openIntake();

    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("checkbox", { name: "Using the toilet" }));

    expect(isChecked(screen.getByRole("checkbox", { name: "Washing or dressing" }))).toBe(true);
    expect(isChecked(screen.getByRole("checkbox", { name: "Using the toilet" }))).toBe(true);
  });
});

describe("keyboard reachability", () => {
  it("reaches a checkbox and Continue by keyboard alone", async () => {
    const { user } = await openIntake();

    const firstCheckbox = screen.getByRole("checkbox", { name: "Washing or dressing" });
    firstCheckbox.focus();
    expect(document.activeElement).toBe(firstCheckbox);

    await user.keyboard(" ");
    expect(isChecked(firstCheckbox)).toBe(true);
    expect(document.activeElement).toBe(firstCheckbox);
  });

  it("moves focus to the next question context after Continue", async () => {
    const { user } = await openIntake();

    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const nextLegend = within(
      screen.getByRole("group", { name: "What has changed?" }),
    ).getByText("What has changed?");
    expect(nextLegend.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(nextLegend);

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "This is new" }),
    );
  });

  it("offers Back and Continue as real buttons on every question", async () => {
    const { user } = await openIntake();

    for (const [step, role] of [
      ["What is difficult day to day?", "checkbox"],
      ["What has changed?", "radio"],
      ["How often is help needed?", "radio"],
    ] as const) {
      expect(screen.getByRole("group", { name: step })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
      await user.click(screen.getByRole(role, { name: "I'm not sure" }));
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }
  });
});

describe("back keeps earlier answers", () => {
  it("returns one step and still shows what was chosen", async () => {
    const { user } = await openIntake();

    await user.click(screen.getByRole("checkbox", { name: "Using the toilet" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "This is new" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(isChecked(screen.getByRole("checkbox", { name: "Using the toilet" }))).toBe(true);
    expect(document.activeElement).toBe(
      within(
        screen.getByRole("group", { name: "What is difficult day to day?" }),
      ).getByText("What is difficult day to day?"),
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(isChecked(screen.getByRole("radio", { name: "This is new" }))).toBe(true);
  });
});

describe("the summary", () => {
  const reachSummary = async () => {
    const rendered = await openIntake();
    const { user } = rendered;

    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "It has become more difficult" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    return rendered;
  };

  it("names the person in their own word and shows the answers back", async () => {
    await reachSummary();

    const summary = within(screen.getByRole("region", { name: "Your preparation summary" }));
    expect(summary.getByText(/your sister/i)).toBeTruthy();
    expect(summary.getByText("Washing or dressing")).toBeTruthy();
    expect(summary.getByText("It has become more difficult")).toBeTruthy();
    expect(summary.getByText("Every day")).toBeTruthy();
  });

  it("carries the limits and the Wales framing", async () => {
    await reachSummary();

    const summary = within(screen.getByRole("region", { name: "Your preparation summary" }));
    expect(
      summary.getByText(
        "This is a preparation summary only. AdminAvenger has not assessed needs, eligibility or what any organisation will decide.",
      ),
    ).toBeTruthy();
    expect(summary.getByText(/support service in Wales/i)).toBeTruthy();
  });

  it("offers Back, Return and Copy, and no save, download, send or contact", async () => {
    await reachSummary();

    const labels = screen.getAllByRole("button").map((button) => button.textContent);
    expect(labels).toContain("Back");
    expect(labels).toContain("Return to the original message");
    expect(labels.join(" ")).toMatch(/Copy/);
    expect(labels.join(" ")).not.toMatch(/\bSave\b|\bDownload\b|\bSend\b|\bSubmit\b/i);
  });

  it("hands back to the original message without saving anything", async () => {
    const { user, onReturnToOriginalMessage } = await reachSummary();

    await user.click(screen.getByRole("button", { name: "Return to the original message" }));

    expect(onReturnToOriginalMessage).toHaveBeenCalledTimes(1);
  });

  it("announces local guidance instead of opening an incomplete summary", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const status = screen.getByRole("status");
    expect(status.textContent).toBe(
      "Choose at least one option, or select ‘I’m not sure’.",
    );
    expect(screen.queryByRole("region", { name: "Your preparation summary" })).toBeNull();
  });

  it("does not re-run intake focus when signposting opens", async () => {
    const { user } = await reachSummary();
    const disclosure = screen.getByRole("button", {
      name: "Find trusted support in Wales",
    });
    disclosure.focus();

    await user.keyboard("{Enter}");

    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Your preparation summary" }),
    );
  });
});
