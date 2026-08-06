// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BothPeoplePreparationPanel } from "../BothPeoplePreparationPanel";
import { CarerNeedsIntakePanel } from "../CarerNeedsIntakePanel";
import { FrontDoorConfirmationPanel } from "../FrontDoorConfirmationPanel";
import { SupporterNeedsIntakePanel } from "../SupporterNeedsIntakePanel";
import { TrustedWalesSignpostingPanel } from "../TrustedWalesSignpostingPanel";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  resolveFrontDoorRouteView,
  type FrontDoorChoiceId,
  type FrontDoorRouteView,
} from "../../lib/frontDoorIntent/frontDoorRouteView";

afterEach(cleanup);

const MINIMUM_TARGET_CLASS = "min-h-11";

const expectMinimumTarget = (element: HTMLElement) => {
  expect(element.classList.contains(MINIMUM_TARGET_CLASS)).toBe(true);
};

const expectButtonFocusRing = (element: HTMLElement) => {
  expect(element.className).toContain("focus:ring-2");
};

const expectLabelTarget = (control: HTMLElement) => {
  const label = control.closest("label");
  expect(label).toBeTruthy();
  expectMinimumTarget(label as HTMLElement);
  expect((label as HTMLElement).className).toContain("focus-within:ring-2");
};

const confirmationView = (): FrontDoorRouteView =>
  resolveFrontDoorRouteView("My father needs care.");

const orientationView = (choiceId: FrontDoorChoiceId): FrontDoorRouteView => {
  const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
    type: "input_received",
    text: "My father needs care.",
  });
  const chosen = frontDoorRouteReducer(shown, {
    type: "choice_selected",
    choiceId,
  });
  if (!chosen.view) throw new Error("expected a Front Door view");
  return chosen.view;
};

const renderFrontDoor = (view: FrontDoorRouteView) =>
  render(
    <FrontDoorConfirmationPanel
      view={view}
      onChoose={vi.fn()}
      onBack={vi.fn()}
      onCheckAsMessage={vi.fn()}
    />,
  );

const renderCarer = () =>
  render(
    <CarerNeedsIntakePanel
      personLabel="sister"
      originalInput="My sister needs help."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );

const renderSupporter = () =>
  render(
    <SupporterNeedsIntakePanel
      personLabel="neighbour"
      originalInput="I support my neighbour every day."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );

const renderBoth = () =>
  render(
    <BothPeoplePreparationPanel
      personLabel="Dad"
      originalInput="I care for Dad full-time and he needs more help now."
      onReturnToOriginalMessage={vi.fn()}
    />,
  );

const continueWithNotSure = async (
  user: ReturnType<typeof userEvent.setup>,
  role: "checkbox" | "radio",
) => {
  await user.click(screen.getByRole(role, { name: "I'm not sure" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
};

const reachCarerSummary = async () => {
  const user = userEvent.setup();
  renderCarer();
  await user.click(
    screen.getByRole("button", {
      name: "Prepare what is difficult day to day",
    }),
  );
  await continueWithNotSure(user, "checkbox");
  await continueWithNotSure(user, "radio");
  await continueWithNotSure(user, "radio");
  return user;
};

const reachSupporterSummary = async () => {
  const user = userEvent.setup();
  renderSupporter();
  await user.click(
    screen.getByRole("button", {
      name: "Prepare how supporting them affects you",
    }),
  );
  await continueWithNotSure(user, "checkbox");
  await continueWithNotSure(user, "radio");
  await continueWithNotSure(user, "checkbox");
  return user;
};

const reachBothSummary = async () => {
  const user = userEvent.setup();
  renderBoth();
  await user.click(
    screen.getByRole("button", { name: "Prepare both sides separately" }),
  );
  await user.click(
    screen.getByRole("radio", { name: "The other person's needs" }),
  );
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await continueWithNotSure(user, "checkbox");
  await continueWithNotSure(user, "radio");
  await continueWithNotSure(user, "radio");
  await continueWithNotSure(user, "checkbox");
  await continueWithNotSure(user, "radio");
  await continueWithNotSure(user, "checkbox");
  return user;
};

describe("Wales care-path 44 px target contract", () => {
  it("keeps every Front Door choice in order as a named pressed button with the minimum target", () => {
    renderFrontDoor(confirmationView());
    const group = screen.getByRole("group", { name: "Who needs help?" });
    const choices = within(group).getAllByRole("button");

    expect(choices.map((choice) => choice.textContent)).toEqual([
      "My father",
      "Me because I support him",
      "Both of us",
      "Something urgent is happening",
      "I'm not sure",
    ]);
    for (const choice of choices) {
      expect(choice.getAttribute("aria-pressed")).toBe("false");
      expectMinimumTarget(choice);
      expectButtonFocusRing(choice);
    }
  });

  it("keeps confirmation and orientation exits secondary, named and at the minimum target", () => {
    const rendered = renderFrontDoor(confirmationView());
    for (const name of ["Go back", "Just check this as a message"]) {
      const button = screen.getByRole("button", { name });
      expectMinimumTarget(button);
      expectButtonFocusRing(button);
      expect(button.className).toContain("bg-transparent");
    }

    rendered.rerender(
      <FrontDoorConfirmationPanel
        view={orientationView("other_person")}
        onChoose={vi.fn()}
        onBack={vi.fn()}
        onCheckAsMessage={vi.fn()}
      />,
    );
    for (const name of ["Back", "Just check this as a message"]) {
      const button = screen.getByRole("button", { name });
      expectMinimumTarget(button);
      expectButtonFocusRing(button);
      expect(button.className).toContain("bg-transparent");
    }
  });

  it("keeps primary and selected Front Door choice styling distinct", () => {
    const rendered = render(
      <FrontDoorConfirmationPanel
        view={confirmationView()}
        selectedChoiceId="both"
        onChoose={vi.fn()}
        onBack={vi.fn()}
        onCheckAsMessage={vi.fn()}
      />,
    );
    const selected = screen.getByRole("button", { name: "Both of us" });
    const unselected = screen.getByRole("button", { name: "My father" });

    expectMinimumTarget(selected);
    expectMinimumTarget(unselected);
    expect(selected.className).not.toBe(unselected.className);
    expect(selected.className).toContain("bg-cyan-300/10");
    expect(unselected.className).toContain("bg-slate-950");
    rendered.unmount();
  });

  it("keeps supported-person rows, Continue and Back at the minimum target", async () => {
    const user = userEvent.setup();
    renderCarer();
    const offer = screen.getByRole("button", {
      name: "Prepare what is difficult day to day",
    });
    expectMinimumTarget(offer);
    await user.click(offer);

    expectLabelTarget(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    const continueButton = screen.getByRole("button", { name: "Continue" });
    const backButton = screen.getByRole("button", { name: "Back" });
    expectMinimumTarget(continueButton);
    expectMinimumTarget(backButton);
    expect(continueButton.className).toContain("bg-cyan-300");
    expect(backButton.className).toContain("bg-transparent");

    await continueWithNotSure(user, "checkbox");
    expectLabelTarget(screen.getByRole("radio", { name: "This is new" }));
  });

  it("keeps the supported-person summary exits and Copy at the minimum target", async () => {
    await reachCarerSummary();
    const summary = within(
      screen.getByRole("region", { name: "Your preparation summary" }),
    );
    for (const name of [
      "Back",
      "Just check this as a message",
      "Copy preparation summary",
    ]) {
      const button = summary.getByRole("button", { name });
      expectMinimumTarget(button);
      expectButtonFocusRing(button);
    }
  });

  it("keeps supporter rows, navigation, summary exit and Copy at the minimum target", async () => {
    const user = userEvent.setup();
    renderSupporter();
    await user.click(
      screen.getByRole("button", {
        name: "Prepare how supporting them affects you",
      }),
    );
    expectLabelTarget(
      screen.getByRole("checkbox", { name: "Shopping or household tasks" }),
    );
    expectMinimumTarget(screen.getByRole("button", { name: "Continue" }));
    expectMinimumTarget(screen.getByRole("button", { name: "Back" }));
    cleanup();

    await reachSupporterSummary();
    const summary = within(
      screen.getByRole("region", { name: "Your preparation summary" }),
    );
    for (const name of [
      "Back",
      "Just check this as a message",
      "Copy preparation summary",
    ]) {
      expectMinimumTarget(summary.getByRole("button", { name }));
    }
  });

  it("keeps both-people choose-first and nested controls at the minimum target", async () => {
    const user = userEvent.setup();
    renderBoth();
    await user.click(
      screen.getByRole("button", { name: "Prepare both sides separately" }),
    );
    expectLabelTarget(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    expectMinimumTarget(screen.getByRole("button", { name: "Continue" }));
    expectMinimumTarget(screen.getByRole("button", { name: "Back" }));

    await user.click(
      screen.getByRole("radio", { name: "The other person's needs" }),
    );
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expectLabelTarget(
      screen.getByRole("checkbox", { name: "Washing or dressing" }),
    );
    expectMinimumTarget(screen.getByRole("button", { name: "Continue" }));
    expectMinimumTarget(screen.getByRole("button", { name: "Back" }));
  });

  it("keeps the both-people summary exits and Copy at the minimum target", async () => {
    await reachBothSummary();
    const summary = within(
      screen.getByRole("region", { name: "Your preparation summary" }),
    );
    for (const name of [
      "Back",
      "Just check this as a message",
      "Copy both summaries",
    ]) {
      expectMinimumTarget(summary.getByRole("button", { name }));
    }
  });

  it("keeps signposting disclosure, website, telephone and close targets accessible", async () => {
    const user = userEvent.setup();
    render(<TrustedWalesSignpostingPanel today="2026-08-06" />);
    const disclosure = screen.getByRole("button", {
      name: "Find trusted support in Wales",
    });
    expectMinimumTarget(disclosure);
    expectButtonFocusRing(disclosure);
    await user.click(disclosure);

    const websites = screen.getAllByRole("link", {
      name: /Open official website for .+, leaves AdminAvenger/,
    });
    const phones = screen.getAllByRole("link", { name: /^Call / });
    expect(websites).toHaveLength(3);
    expect(phones).toHaveLength(2);
    for (const link of [...websites, ...phones]) {
      expectMinimumTarget(link);
      expectButtonFocusRing(link);
    }
    const close = screen.getByRole("button", { name: "Close trusted support" });
    expectMinimumTarget(close);
    expectButtonFocusRing(close);
  });
});
