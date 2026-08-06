// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CarerNeedsIntakePanel } from "../CarerNeedsIntakePanel";
import { SupporterNeedsIntakePanel } from "../SupporterNeedsIntakePanel";
import { BothPeoplePreparationPanel } from "../BothPeoplePreparationPanel";

afterEach(cleanup);

const OFFER = "Find trusted support in Wales";
const ORGANISATIONS = [
  "Welsh Government",
  "Carers UK, including Carers Wales",
  "Carers Trust",
] as const;

const openDirectory = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: OFFER }));
  const region = within(screen.getByRole("region", { name: "Trusted places to try next" }));
  return ORGANISATIONS.map((name) => region.getByRole("heading", { name }).textContent);
};

describe("supported-person summary integration", () => {
  const renderPanel = () => {
    render(
      <CarerNeedsIntakePanel
        personLabel="sister"
        originalInput="My sister needs help."
        onReturnToOriginalMessage={vi.fn()}
      />,
    );
    return userEvent.setup();
  };

  it("shows no signposting before completion or for a blank question", async () => {
    const user = renderPanel();
    expect(screen.queryByRole("button", { name: OFFER })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Prepare what is difficult day to day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("status").textContent).toBe(
      "Choose at least one option, or select ‘I’m not sure’.",
    );
    expect(screen.queryByRole("button", { name: OFFER })).toBeNull();
  });

  it("opens the shared directory after a complete summary and preserves answers", async () => {
    const user = renderPanel();
    await user.click(screen.getByRole("button", { name: "Prepare what is difficult day to day" }));
    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "This is new" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await openDirectory(user)).toEqual(ORGANISATIONS);
    await user.click(screen.getByRole("button", { name: "Close trusted support" }));
    expect(screen.getByText("Washing or dressing")).toBeTruthy();
    expect(screen.getByText("This is new")).toBeTruthy();
    expect(screen.getByText("Every day")).toBeTruthy();
  });
});

describe("supporter summary integration", () => {
  it("opens the same directory only after a complete supporter summary", async () => {
    render(
      <SupporterNeedsIntakePanel
        personLabel="neighbour"
        originalInput="I support my neighbour."
        onReturnToOriginalMessage={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: OFFER })).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Prepare how supporting them affects you" }),
    );
    await user.click(screen.getByRole("checkbox", { name: "Shopping or household tasks" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "I have less time for myself" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await openDirectory(user)).toEqual(ORGANISATIONS);
    await user.click(screen.getByRole("button", { name: "Close trusted support" }));
    expect(screen.getByText("Shopping or household tasks")).toBeTruthy();
    expect(screen.getByText("I have less time for myself")).toBeTruthy();
  });
});

describe("both-people combined-summary integration", () => {
  it("opens the same directory only after both summaries are complete", async () => {
    render(
      <BothPeoplePreparationPanel
        personLabel="Dad"
        originalInput="I care for Dad full-time and he needs more help now."
        onReturnToOriginalMessage={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    expect(screen.queryByRole("button", { name: OFFER })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Prepare both sides separately" }));
    await user.click(screen.getByRole("radio", { name: "The other person's needs" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "Washing or dressing" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "This is new" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "Shopping or household tasks" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("radio", { name: "A few times a week" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("checkbox", { name: "It is becoming harder to manage" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await openDirectory(user)).toEqual(ORGANISATIONS);
    await user.click(screen.getByRole("button", { name: "Close trusted support" }));
    expect(screen.getByText("Every day")).toBeTruthy();
    expect(screen.getByText("A few times a week")).toBeTruthy();
  });
});
