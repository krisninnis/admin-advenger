// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrontDoorConfirmationPanel } from "../FrontDoorConfirmationPanel";
import { classifyFrontDoorIntent } from "../../lib/frontDoorIntent/classifyFrontDoorIntent";
import { deriveFrontDoorOrientationView } from "../../lib/frontDoorIntent/frontDoorOrientationView";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  type FrontDoorChoiceId,
  type FrontDoorRouteView,
} from "../../lib/frontDoorIntent/frontDoorRouteView";

// Front-Door Orientation Result v1, rendering.
//
// The wording itself is asserted in
// src/lib/__tests__/frontDoorOrientationView.test.ts against the pure module
// that decides it. What is proved here is that the page actually reaches the
// screen, that both exits are wired, and that nothing extra appears beside it.

afterEach(cleanup);

const CARE_SENTENCE = "My sister needs help.";

const orientationView = (
  text: string,
  choiceId: FrontDoorChoiceId,
): FrontDoorRouteView => ({
  ...deriveFrontDoorOrientationView(classifyFrontDoorIntent(text), choiceId, text),
  questionsAskedFirst: 1,
});

const renderPanel = (view: FrontDoorRouteView) => {
  const onChoose = vi.fn();
  const onBack = vi.fn();
  const onCheckAsMessage = vi.fn();

  render(
    <FrontDoorConfirmationPanel
      view={view}
      onChoose={onChoose}
      onBack={onBack}
      onCheckAsMessage={onCheckAsMessage}
    />,
  );

  return { onChoose, onBack, onCheckAsMessage };
};

const panel = () =>
  within(screen.getByRole("region", { name: "What this may be about" }));

describe("the orientation page reaches the screen", () => {
  it("shows the four approved sections in order", () => {
    renderPanel(orientationView(CARE_SENTENCE, "other_person"));

    const headings = screen
      .getAllByRole("heading")
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      "What this may be about",
      "A useful next step",
      "What to gather",
      "What AdminAvenger cannot decide",
    ]);
  });

  it("shows the interpretation, the next step and the limits", () => {
    const view = orientationView(CARE_SENTENCE, "other_person");
    renderPanel(view);

    if (view.kind !== "orientation") throw new Error("expected an orientation view");

    expect(panel().getByText(view.interpretation)).toBeTruthy();
    expect(panel().getByText(view.nextStep)).toBeTruthy();
    expect(panel().getByText(view.cannotContactStatement)).toBeTruthy();
    for (const item of view.gather) {
      expect(panel().getByText(item)).toBeTruthy();
    }
  });

  it("keeps the person's original wording on the page", () => {
    renderPanel(orientationView(CARE_SENTENCE, "other_person"));

    expect(panel().getByText(CARE_SENTENCE)).toBeTruthy();
  });
});

describe("the orientation page offers exactly two buttons", () => {
  it("offers Back and Return to original message, and nothing else", () => {
    renderPanel(orientationView(CARE_SENTENCE, "other_person"));

    const labels = screen.getAllByRole("button").map((button) => button.textContent);
    expect(labels).toEqual(["Back", "Return to original message"]);
  });

  it("wires Back to going back", async () => {
    const { onBack } = renderPanel(orientationView(CARE_SENTENCE, "other_person"));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("wires Return to original message to ordinary message checking", async () => {
    const { onCheckAsMessage } = renderPanel(
      orientationView(CARE_SENTENCE, "other_person"),
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Return to original message" }));

    expect(onCheckAsMessage).toHaveBeenCalledTimes(1);
  });
});

describe("the orientation page shows nothing it is not allowed to show", () => {
  it("offers no choices, no saving and no specialist route", () => {
    const { onChoose } = renderPanel(orientationView(CARE_SENTENCE, "other_person"));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.queryByText(/\bsave\b/i)).toBeNull();
    expect(screen.queryByText(/\bcarer support\b/i)).toBeNull();
    expect(screen.queryByText(/\bestate\b/i)).toBeNull();
    expect(screen.queryByText(/\bprobate\b/i)).toBeNull();
  });

  it("does not show a document result", () => {
    renderPanel(orientationView(CARE_SENTENCE, "other_person"));

    expect(screen.queryByText(/No obvious saving or action found/i)).toBeNull();
    expect(
      screen.queryByText(/Identify the sender, date, reference, and deadline/i),
    ).toBeNull();
  });
});

describe("the urgent page is untouched by this slice", () => {
  it("still renders its own region with the four contact options", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: CARE_SENTENCE,
    });
    const urgent = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "urgent",
    });

    if (!urgent.view) throw new Error("expected a view");
    renderPanel(urgent.view);

    const region = within(screen.getByRole("region", { name: "Urgent support" }));
    expect(region.getByText("If someone needs help right now")).toBeTruthy();
    expect(region.getByText(/999, for an emergency/)).toBeTruthy();
    expect(screen.queryByRole("region", { name: "What this may be about" })).toBeNull();
  });
});
