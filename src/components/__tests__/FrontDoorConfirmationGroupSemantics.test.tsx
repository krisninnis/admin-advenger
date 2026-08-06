// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FrontDoorConfirmationPanel } from "../FrontDoorConfirmationPanel";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  resolveFrontDoorRouteView,
  type FrontDoorChoiceId,
  type FrontDoorRouteView,
} from "../../lib/frontDoorIntent/frontDoorRouteView";

afterEach(cleanup);

const confirmationExamples = [
  {
    name: "care",
    text: "My father needs care.",
    question: "Who needs help?",
    choices: [
      "My father",
      "Me because I support him",
      "Both of us",
      "Something urgent is happening",
      "I'm not sure",
    ],
    choiceIds: ["other_person", "self_supporting", "both", "urgent", "unsure"],
  },
  {
    name: "benefits",
    text: "Can my father claim Attendance Allowance?",
    question: "Whose benefits are you asking about?",
    choices: ["My father's", "Mine", "Both", "I'm not sure"],
    choiceIds: ["other_person", "self", "both", "unsure"],
  },
  {
    name: "bereavement",
    text: "My husband died last week and I do not know what to do.",
    question: "What would help most?",
    choices: [
      "Understanding a letter or form",
      "Knowing what to do next",
      "Something urgent is happening",
      "I'm not sure",
    ],
    choiceIds: ["understand_document", "what_next", "urgent", "unsure"],
  },
  {
    name: "general",
    text: "hi",
    question: "What is this about?",
    choices: [
      "A letter, bill or message",
      "Care or support for someone",
      "Money or benefits",
      "Something urgent is happening",
      "I'm not sure",
    ],
    choiceIds: ["about_document", "about_care", "about_money", "urgent", "unsure"],
  },
] as const;

const confirmationView = (text: string): FrontDoorRouteView => {
  const view = resolveFrontDoorRouteView(text);
  if (view.kind !== "confirmation") {
    throw new Error(`expected a confirmation view, received ${view.kind}`);
  }
  return view;
};

const renderPanel = (
  view: FrontDoorRouteView,
  selectedChoiceId?: FrontDoorChoiceId,
) => {
  const onChoose = vi.fn();
  const onBack = vi.fn();
  const onCheckAsMessage = vi.fn();
  const rendered = render(
    <FrontDoorConfirmationPanel
      view={view}
      selectedChoiceId={selectedChoiceId}
      onChoose={onChoose}
      onBack={onBack}
      onCheckAsMessage={onCheckAsMessage}
    />,
  );

  return { ...rendered, onChoose, onBack, onCheckAsMessage };
};

const routeAfterChoice = (
  text: string,
  choiceId: FrontDoorChoiceId,
): FrontDoorRouteView => {
  const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
    type: "input_received",
    text,
  });
  const chosen = frontDoorRouteReducer(shown, {
    type: "choice_selected",
    choiceId,
  });
  if (!chosen.view) throw new Error("expected a view after choosing");
  return chosen.view;
};

describe("Front Door confirmation choice grouping", () => {
  it.each(confirmationExamples)(
    "exposes the $name choices as one native group named by the visible question",
    ({ text, question, choices }) => {
      renderPanel(confirmationView(text));

      const group = screen.getByRole("group", { name: question });
      expect(group.tagName).toBe("FIELDSET");
      expect(screen.getAllByText(question)).toHaveLength(1);
      expect(
        within(group)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(choices);
    },
  );

  it("keeps the choices as pressed-state buttons and sends the existing choice ID", async () => {
    const { onChoose } = renderPanel(confirmationView("My father needs care."));
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Who needs help?" });
    const choice = within(group).getByRole("button", { name: "Both of us" });

    expect(choice.getAttribute("aria-pressed")).toBe("false");
    await user.click(choice);
    expect(onChoose).toHaveBeenCalledWith("both");
  });

  it.each(confirmationExamples)(
    "keeps every $name choice ID and route outcome unchanged",
    async ({ text, question, choices, choiceIds }) => {
      const { onChoose } = renderPanel(confirmationView(text));
      const user = userEvent.setup();
      const group = screen.getByRole("group", { name: question });

      for (const [index, label] of choices.entries()) {
        await user.click(within(group).getByRole("button", { name: label }));
        const choiceId = choiceIds[index] as FrontDoorChoiceId;
        expect(onChoose).toHaveBeenNthCalledWith(index + 1, choiceId);
        expect(routeAfterChoice(text, choiceId).kind).toBe(
          choiceId === "urgent" ? "urgent_support" : "orientation",
        );
      }
    },
  );

  it("preserves the selected button state", () => {
    renderPanel(confirmationView("My father needs care."), "both");

    expect(
      screen.getByRole("button", { name: "Both of us" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("keeps keyboard order and Enter and Space activation unchanged", async () => {
    const { onChoose } = renderPanel(confirmationView("My father needs care."));
    const user = userEvent.setup();

    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "My father" }));
    await user.keyboard("{Enter}");
    expect(onChoose).toHaveBeenLastCalledWith("other_person");

    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Me because I support him" }),
    );
    await user.keyboard(" ");
    expect(onChoose).toHaveBeenLastCalledWith("self_supporting");
  });

  it("keeps Back after and outside the choice group", async () => {
    const { onBack } = renderPanel(confirmationView("My father needs care."));
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Who needs help?" });

    expect(within(group).queryByRole("button", { name: "Go back" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("introduces no duplicate IDs across multiple renders or rerender", () => {
    const rendered = render(
      <>
        {confirmationExamples.map(({ name, text }) => (
          <FrontDoorConfirmationPanel
            key={name}
            view={confirmationView(text)}
            onChoose={vi.fn()}
            onBack={vi.fn()}
            onCheckAsMessage={vi.fn()}
          />
        ))}
      </>,
    );

    rendered.rerender(
      <FrontDoorConfirmationPanel
        view={confirmationView("My father needs care.")}
        onChoose={vi.fn()}
        onBack={vi.fn()}
        onCheckAsMessage={vi.fn()}
      />,
    );

    const ids = Array.from(
      rendered.container.querySelectorAll("[id]"),
      (node) => node.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("routes without confirmation choices", () => {
  it("renders no choice group for document analysis", () => {
    renderPanel(resolveFrontDoorRouteView("Your father's account has been closed"));

    expect(screen.queryByRole("group")).toBeNull();
  });

  it("renders no choice group for security-shaped analysis", () => {
    renderPanel(
      resolveFrontDoorRouteView(
        "Send us the six-digit verification code you just received so we can secure your account.",
      ),
    );

    expect(screen.queryByRole("group")).toBeNull();
  });

  it("renders no choice group for urgent support", () => {
    renderPanel(resolveFrontDoorRouteView("My mum has fallen and cannot get up."));

    expect(screen.getByRole("region", { name: "Urgent support" })).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("removes the confirmation group when orientation replaces it", () => {
    const text = "My father needs care.";
    const rendered = renderPanel(confirmationView(text));
    expect(screen.getByRole("group", { name: "Who needs help?" })).toBeTruthy();

    rendered.rerender(
      <FrontDoorConfirmationPanel
        view={routeAfterChoice(text, "other_person")}
        onChoose={rendered.onChoose}
        onBack={rendered.onBack}
        onCheckAsMessage={rendered.onCheckAsMessage}
      />,
    );

    expect(screen.getByRole("region", { name: "What this may be about" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Who needs help?" })).toBeNull();
  });
});
