// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BothPeoplePreparationPanel } from "../BothPeoplePreparationPanel";
import { CarerNeedsIntakePanel } from "../CarerNeedsIntakePanel";
import { SupporterNeedsIntakePanel } from "../SupporterNeedsIntakePanel";

afterEach(cleanup);

const CHECKBOX_GUIDANCE =
  "Choose at least one option, or select ‘I’m not sure’.";
const RADIO_GUIDANCE = "Choose one option, or select ‘I’m not sure’.";

const expectAssociatedGuidance = (groupName: string, message: string) => {
  const group = screen.getByRole("group", { name: groupName });
  const status = screen.getByRole("status");
  const describedBy = group.getAttribute("aria-describedby")?.split(" ") ?? [];

  expect(status.textContent).toBe(message);
  expect(status.id).not.toBe("");
  expect(describedBy).toContain(status.id);
  expect(document.activeElement).toBe(within(group).getByText(groupName));
};

const renderCarer = async () => {
  const user = userEvent.setup();
  render(
    <CarerNeedsIntakePanel
      personLabel="sister"
      originalInput="My sister needs help."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );
  await user.click(
    screen.getByRole("button", {
      name: "Prepare what is difficult day to day",
    }),
  );
  return user;
};

const renderSupporter = async () => {
  const user = userEvent.setup();
  render(
    <SupporterNeedsIntakePanel
      personLabel="neighbour"
      originalInput="I support my neighbour every day."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );
  await user.click(
    screen.getByRole("button", {
      name: "Prepare how supporting them affects you",
    }),
  );
  return user;
};

const renderBoth = async () => {
  const user = userEvent.setup();
  render(
    <BothPeoplePreparationPanel
      personLabel="Dad"
      originalInput="I care for Dad full-time and he needs more help now."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Prepare both sides separately" }),
  );
  return user;
};

const continueStep = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Continue" }));
};

const completeSupportedPerson = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(
    screen.getByRole("checkbox", { name: "Washing or dressing" }),
  );
  await continueStep(user);
  await user.click(
    screen.getByRole("radio", { name: "It has become more difficult" }),
  );
  await continueStep(user);
  await user.click(screen.getByRole("radio", { name: "Every day" }));
  await continueStep(user);
};

const completeSupporter = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(
    screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
  );
  await continueStep(user);
  await user.click(
    screen.getByRole("radio", { name: "A few times a week" }),
  );
  await continueStep(user);
  await user.click(
    screen.getByRole("checkbox", { name: "It is becoming harder to manage" }),
  );
  await continueStep(user);
};

describe("supported-person incomplete guidance", () => {
  it("keeps a blank checkbox step visible with associated announced guidance", async () => {
    const user = await renderCarer();

    await continueStep(user);

    expectAssociatedGuidance(
      "What is difficult day to day?",
      CHECKBOX_GUIDANCE,
    );
  });

  it("clears checkbox guidance on selection and accepts I'm not sure", async () => {
    const user = await renderCarer();
    await continueStep(user);

    const notSure = screen.getByRole("checkbox", { name: "I'm not sure" });
    await user.click(notSure);

    expect(screen.queryByRole("status")).toBeNull();
    expect(document.activeElement).toBe(notSure);
    await continueStep(user);
    expect(screen.getByRole("group", { name: "What has changed?" })).toBeTruthy();
  });

  it("restores checkbox guidance after every option is unselected", async () => {
    const user = await renderCarer();
    const option = screen.getByRole("checkbox", { name: "Washing or dressing" });
    await user.click(option);
    await user.click(option);

    await continueStep(user);

    expectAssociatedGuidance(
      "What is difficult day to day?",
      CHECKBOX_GUIDANCE,
    );
  });

  it("keeps a blank radio step visible and clears its guidance on selection", async () => {
    const user = await renderCarer();
    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    await continueStep(user);
    await continueStep(user);

    expectAssociatedGuidance("What has changed?", RADIO_GUIDANCE);

    const choice = screen.getByRole("radio", { name: "This is new" });
    await user.click(choice);
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.activeElement).toBe(choice);
  });

  it("clears stale guidance on Back and does not restore it on return", async () => {
    const user = await renderCarer();
    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    await continueStep(user);
    await continueStep(user);
    expect(screen.getByRole("status")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("status")).toBeNull();

    await continueStep(user);
    expect(screen.getByRole("group", { name: "What has changed?" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps signposting separate from incomplete guidance", async () => {
    const user = await renderCarer();
    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "This is new" }));
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await continueStep(user);

    expect(screen.queryByRole("status")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Find trusted support in Wales" }),
    );
    expect(screen.queryByText(CHECKBOX_GUIDANCE)).toBeNull();
    expect(screen.queryByText(RADIO_GUIDANCE)).toBeNull();
  });
});

describe("supporter incomplete guidance", () => {
  it("guards the blank help-provided checkbox step", async () => {
    const user = await renderSupporter();
    await continueStep(user);

    expectAssociatedGuidance("What help do you provide?", CHECKBOX_GUIDANCE);
  });

  it("guards the blank frequency radio step", async () => {
    const user = await renderSupporter();
    await user.click(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    await continueStep(user);
    await continueStep(user);

    expectAssociatedGuidance(
      "How often do you provide this help?",
      RADIO_GUIDANCE,
    );
  });

  it("guards the blank impact checkbox step without disturbing earlier answers", async () => {
    const user = await renderSupporter();
    await user.click(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await continueStep(user);
    await continueStep(user);

    expectAssociatedGuidance(
      "How does supporting them affect you?",
      CHECKBOX_GUIDANCE,
    );

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(
      (screen.getByRole("radio", { name: "Every day" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });
});

describe("both-people incomplete guidance", () => {
  it("guards choose-first with associated single-choice guidance", async () => {
    const user = await renderBoth();

    await continueStep(user);

    expectAssociatedGuidance(
      "Which side would you like to prepare first?",
      RADIO_GUIDANCE,
    );
  });

  it("keeps supported-person guidance scoped to that nested intake", async () => {
    const user = await renderBoth();
    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await continueStep(user);
    await continueStep(user);

    expectAssociatedGuidance(
      "What is difficult day to day?",
      CHECKBOX_GUIDANCE,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps supporter guidance scoped to that nested intake", async () => {
    const user = await renderBoth();
    await user.click(
      screen.getByRole("radio", { name: "How supporting them affects me" }),
    );
    await continueStep(user);
    await continueStep(user);

    expectAssociatedGuidance("What help do you provide?", CHECKBOX_GUIDANCE);
  });

  it("does not leak guidance into the second intake or combined summary", async () => {
    const user = await renderBoth();
    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await continueStep(user);
    await continueStep(user);
    expect(screen.getByRole("status")).toBeTruthy();

    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    await continueStep(user);
    await user.click(
      screen.getByRole("radio", { name: "It has become more difficult" }),
    );
    await continueStep(user);
    await user.click(screen.getByRole("radio", { name: "Every day" }));
    await continueStep(user);

    expect(screen.getByRole("group", { name: "What help do you provide?" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    await completeSupporter(user);
    expect(screen.getByRole("heading", { name: "Your preparation summary" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not resurrect nested guidance after Back", async () => {
    const user = await renderBoth();
    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await continueStep(user);
    await user.click(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    await continueStep(user);
    await continueStep(user);
    expect(screen.getByRole("status")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.queryByRole("status")).toBeNull();
    await continueStep(user);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("can complete both sides after an earlier blank attempt", async () => {
    const user = await renderBoth();
    await continueStep(user);
    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await continueStep(user);
    await completeSupportedPerson(user);
    await completeSupporter(user);

    expect(screen.getByRole("heading", { name: "Your preparation summary" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
