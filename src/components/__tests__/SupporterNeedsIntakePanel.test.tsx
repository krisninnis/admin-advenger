// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SupporterNeedsIntakePanel } from "../SupporterNeedsIntakePanel";

afterEach(cleanup);

const OFFER = "Prepare how supporting them affects you";
const HELP = "What help do you provide?";
const FREQUENCY = "How often do you provide this help?";
const IMPACT = "How does supporting them affect you?";
const SUMMARY = "Your preparation summary";

const renderPanel = () => {
  const onReturnToOriginalMessage = vi.fn();
  const result = render(
    <SupporterNeedsIntakePanel
      personLabel="neighbour"
      originalInput="I look after my neighbour every day and I am struggling."
      onReturnToOriginalMessage={onReturnToOriginalMessage}
    />,
  );

  return { ...result, onReturnToOriginalMessage };
};

const openIntake = async () => {
  const user = userEvent.setup();
  const rendered = renderPanel();
  await user.click(screen.getByRole("button", { name: OFFER }));
  return { ...rendered, user };
};

describe("SupporterNeedsIntakePanel", () => {
  it("shows only an optional offer and never opens automatically", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: OFFER })).toBeTruthy();
    expect(screen.queryByRole("group", { name: HELP })).toBeNull();
    expect(screen.queryByText(SUMMARY)).toBeNull();
  });

  it("uses a fieldset and legend with checkboxes for help provided", async () => {
    await openIntake();

    const group = screen.getByRole("group", { name: HELP });
    expect(group.tagName).toBe("FIELDSET");
    expect(within(group).getByText(HELP).tagName).toBe("LEGEND");
    expect(
      within(group).getByRole("checkbox", {
        name: "Shopping or household tasks",
      }),
    ).toBeTruthy();
  });

  it("supports keyboard selection and does not auto-advance", async () => {
    const { user } = await openIntake();
    const checkbox = screen.getByRole("checkbox", {
      name: "Shopping or household tasks",
    });

    checkbox.focus();
    await user.keyboard(" ");

    expect((checkbox as HTMLInputElement).checked).toBe(true);
    expect(document.activeElement).toBe(checkbox);
    expect(screen.getByRole("group", { name: HELP })).toBeTruthy();
    expect(screen.queryByRole("group", { name: FREQUENCY })).toBeNull();
  });

  it("requires an explicit Continue and uses radios for frequency", async () => {
    const { user } = await openIntake();

    await user.click(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const group = screen.getByRole("group", { name: FREQUENCY });
    expect(
      within(group).getByRole("radio", { name: "Every day" }),
    ).toBeTruthy();
    await user.click(within(group).getByRole("radio", { name: "Every day" }));
    expect(document.activeElement).toBe(
      within(group).getByRole("radio", { name: "Every day" }),
    );
    expect(screen.getByRole("group", { name: FREQUENCY })).toBeTruthy();
    expect(screen.queryByRole("group", { name: IMPACT })).toBeNull();
  });

  it("moves focus to the next question context after Continue", async () => {
    const { user } = await openIntake();

    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const nextLegend = within(
      screen.getByRole("group", { name: FREQUENCY }),
    ).getByText(FREQUENCY);
    expect(nextLegend.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(nextLegend);

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Most of the time" }),
    );
  });

  it("offers I'm not sure on every question", async () => {
    const { user } = await openIntake();

    expect(screen.getByRole("checkbox", { name: "I'm not sure" })).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("radio", { name: "I'm not sure" })).toBeTruthy();
    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("checkbox", { name: "I'm not sure" })).toBeTruthy();
  });

  it("moves through impact to a separated preparation summary", async () => {
    const { user } = await openIntake();
    await user.click(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "Appointments or transport" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(
      screen.getByRole("checkbox", { name: "I feel tired or exhausted" }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "I have less time for myself" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const summary = screen.getByRole("region", { name: SUMMARY });
    expect(within(summary).getByText("Your neighbour")).toBeTruthy();
    expect(within(summary).getByText("Help you provide")).toBeTruthy();
    expect(within(summary).getByText("How often")).toBeTruthy();
    expect(within(summary).getByText("How it affects you")).toBeTruthy();
    expect(
      within(summary).getByRole("button", { name: "Copy preparation summary" }),
    ).toBeTruthy();
  });

  it("announces local guidance instead of opening an incomplete summary", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe(
      "Choose at least one option, or select ‘I’m not sure’.",
    );
    expect(screen.queryByRole("region", { name: SUMMARY })).toBeNull();
  });

  it("Back preserves answers and returns one step at a time", async () => {
    const { user } = await openIntake();
    const shopping = screen.getByRole("checkbox", {
      name: "Shopping or household tasks",
    });
    await user.click(shopping);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("group", { name: HELP })).toBeTruthy();
    expect(
      (screen.getByRole("checkbox", {
        name: "Shopping or household tasks",
      }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(document.activeElement).toBe(
      within(screen.getByRole("group", { name: HELP })).getByText(HELP),
    );
  });

  it("returns to the original message only when asked", async () => {
    const { user, onReturnToOriginalMessage } = await openIntake();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onReturnToOriginalMessage).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Return to the original message" }),
    );
    expect(onReturnToOriginalMessage).toHaveBeenCalledTimes(1);
  });

  it("renders no case, save, send, contact, referral, apply, claim, phone number or link", async () => {
    const { user } = await openIntake();
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "I'm not sure" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    for (const name of [/save/i, /case/i, /send/i, /contact/i, /referral/i, /apply/i, /claim/i]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.queryByRole("link")).toBeNull();
    expect(document.body.textContent).not.toMatch(/\b\d{3,}\b/);
  });
});
