import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import {
  deriveFrontDoorRouteView,
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
} from "../frontDoorIntent/frontDoorRouteView";
import type { FrontDoorRouteView } from "../frontDoorIntent/frontDoorRouteView";

// Front-Door Intent Routing v1, UI wiring slice.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md
//
// Every user-facing decision in this slice lives in a pure module so it can be
// asserted directly: the heading, the question, the choices, the urgent wording
// and the state transitions. The React component is a renderer over this view
// model and holds no routing decision of its own.
//
// The eight approved journeys are numbered J1 to J8 below.

const viewFor = (text: string) =>
  deriveFrontDoorRouteView(classifyFrontDoorIntent(text), text);

// These narrow the view and throw when the kind is wrong. A silent `return`
// would let a routing regression pass every assertion in the block below it.
const asConfirmation = (view: FrontDoorRouteView) => {
  if (view.kind !== "confirmation") {
    throw new Error(`expected a confirmation view, received ${view.kind}`);
  }
  return view;
};

const asUrgent = (view: FrontDoorRouteView) => {
  if (view.kind !== "urgent_support") {
    throw new Error(`expected an urgent support view, received ${view.kind}`);
  }
  return view;
};

const asDocument = (view: FrontDoorRouteView) => {
  if (view.kind !== "document_analysis") {
    throw new Error(`expected document analysis, received ${view.kind}`);
  }
  return view;
};

const labelsOf = (view: FrontDoorRouteView): readonly string[] =>
  asConfirmation(view).choices.map((choice) => choice.label);

describe("J1: a plain care sentence asks who needs help", () => {
  const text = "My father needs care.";

  it("does not send the sentence to document analysis", () => {
    expect(viewFor(text).kind).toBe("confirmation");
  });

  it("uses the approved care heading and question", () => {
    const view = asConfirmation(viewFor(text));
    expect(view.heading).toBe("This may be about care and support");
    expect(view.question).toBe("Who needs help?");
  });

  it("offers the five approved choices in the approved order", () => {
    expect(labelsOf(viewFor(text))).toEqual([
      "My father",
      "Me because I support him",
      "Both of us",
      "Something urgent is happening",
      "I'm not sure",
    ]);
  });

  it("keeps the original wording visible and unaltered", () => {
    expect(viewFor(text).originalInput).toBe(text);
  });
});

describe("J2: an ambiguous request still asks a clarifying question", () => {
  const text = "Help with my brother.";

  it("shows a confirmation step rather than a result", () => {
    expect(viewFor(text).kind).toBe("confirmation");
  });

  it("names the brother in the user's own words", () => {
    const labels = labelsOf(viewFor(text));
    expect(labels[0]).toBe("My brother");
    expect(labels[1]).toBe("Me because I support him");
  });

  it("still offers a way out for someone who cannot answer", () => {
    expect(labelsOf(viewFor(text))).toContain("I'm not sure");
  });
});

describe("J3: a benefits question asks whose benefits", () => {
  const text = "Can my father claim Attendance Allowance?";

  it("uses the benefits question, not the care question", () => {
    const view = asConfirmation(viewFor(text));
    expect(view.question).toBe("Whose benefits are you asking about?");
    expect(view.heading).toBe("This may be about benefits");
  });

  it("offers the four approved possessive choices in the approved order", () => {
    expect(labelsOf(viewFor(text))).toEqual([
      "My father's",
      "Mine",
      "Both",
      "I'm not sure",
    ]);
  });

  it("does not answer the benefits question itself", () => {
    const view = asConfirmation(viewFor(text));
    const spoken = [view.heading, view.question, ...labelsOf(view)].join(" ");
    expect(spoken).not.toMatch(/Attendance Allowance/i);
    expect(spoken).not.toMatch(/\byou (can|should|are entitled|qualify)\b/i);
  });
});

describe("J4: an urgent discharge is handled before care routing", () => {
  const text =
    "The hospital says my mother is being discharged tomorrow and I cannot cope.";

  it("shows urgent support rather than a clarifying question", () => {
    expect(viewFor(text).kind).toBe("urgent_support");
  });

  it("states plainly what AdminAvenger cannot do", () => {
    const view = asUrgent(viewFor(text));
    expect(view.limitsStatement).toMatch(/cannot/i);
    expect(view.limitsStatement).toMatch(/assess/i);
    expect(view.limitsStatement).toMatch(/(triage|how urgent)/i);
    expect(view.limitsStatement).toMatch(/contact/i);
  });

  it("presents the contact options without choosing one", () => {
    const view = asUrgent(viewFor(text));
    expect(view.contactOptions.length).toBeGreaterThan(1);
    expect(view.selectedContactOption).toBeUndefined();
  });

  it("never tells the person which service to use", () => {
    const view = asUrgent(viewFor(text));
    const spoken = [view.heading, view.limitsStatement, view.chooseInstruction].join(" ");
    expect(spoken).not.toMatch(/\b(call 999|ring 999|you should call|we have contacted|phone 111)\b/i);
  });
});

describe("J5: a fall is answered immediately, not behind a form", () => {
  const text = "My mum has fallen and cannot get up.";

  it("shows urgent support first", () => {
    expect(viewFor(text).kind).toBe("urgent_support");
  });

  it("asks no questions before showing help", () => {
    const view = asUrgent(viewFor(text));
    expect(view.questionsAskedFirst).toBe(0);
  });

  it("offers the human contact options straight away", () => {
    const view = asUrgent(viewFor(text));
    expect(view.contactOptions.length).toBeGreaterThan(1);
  });
});

describe("J6: bereavement gets a bereavement-shaped step and no Estate route", () => {
  const text = "My husband died last week and I do not know what to do.";

  it("shows a confirmation step", () => {
    expect(viewFor(text).kind).toBe("confirmation");
  });

  it("uses bereavement-shaped wording", () => {
    const view = asConfirmation(viewFor(text));
    expect(view.heading).toBe("This may be about what happens after someone dies");
  });

  it("does not open or name an Estate journey", () => {
    const view = viewFor(text);
    expect(view.estateRouteOpened).toBe(false);
    const confirmation = asConfirmation(view);
    const spoken = [
      confirmation.heading,
      confirmation.question,
      ...labelsOf(view),
    ].join(" ");
    expect(spoken).not.toMatch(/\b(estate|probate|administration of the estate)\b/i);
  });

  it("does not ask who needs help about the person who died", () => {
    const view = asConfirmation(viewFor(text));
    expect(view.question).not.toBe("Who needs help?");
  });
});

describe("J7: the document controls keep the existing journey", () => {
  it.each([
    { id: "L01", text: "Your father's account has been closed" },
    {
      id: "L02",
      text: "We have received your application and will write to you within 10 working days.",
    },
  ])("sends $id to document analysis unchanged", ({ text }) => {
    const view = viewFor(text);
    expect(view.kind).toBe("document_analysis");
  });

  it("asks a document no questions at all", () => {
    const view = asDocument(viewFor("Your father's account has been closed"));
    expect(view.questionsAskedFirst).toBe(0);
  });
});

describe("J8: the security control stays on the security route", () => {
  const text =
    "Send us the six-digit verification code you just received so we can secure your account.";

  it("continues through document analysis so security preflight still runs", () => {
    expect(viewFor(text).kind).toBe("document_analysis");
  });

  it("never diverts a security message into a care confirmation", () => {
    const view = viewFor(text);
    expect(view.kind).not.toBe("confirmation");
  });
});

describe("prohibitions hold for every view", () => {
  const inputs = [
    "My father needs care.",
    "Help with my brother.",
    "Can my father claim Attendance Allowance?",
    "The hospital says my mother is being discharged tomorrow and I cannot cope.",
    "My mum has fallen and cannot get up.",
    "My husband died last week and I do not know what to do.",
    "Your father's account has been closed",
    "Send us the six-digit verification code you just received so we can secure your account.",
  ];

  it.each(inputs.map((text) => ({ text })))("creates no case for %j", ({ text }) => {
    const view = viewFor(text);
    expect(view.caseCreated).toBe(false);
    expect(view.specialistRouteOpened).toBe(false);
    expect(view.targetConfirmed).toBe(false);
    expect(view.estateRouteOpened).toBe(false);
  });

  it.each(inputs.map((text) => ({ text })))("preserves the input for %j", ({ text }) => {
    expect(viewFor(text).originalInput).toBe(text);
  });

  it("always offers ordinary message checking and a way back", () => {
    for (const text of inputs) {
      const view = viewFor(text);
      expect(view.ordinaryCheckAvailable, text).toBe(true);
      expect(view.backAvailable, text).toBe(true);
    }
  });
});

describe("state model", () => {
  it("starts with nothing classified and nothing shown", () => {
    expect(initialFrontDoorRouteState.view).toBeUndefined();
    expect(initialFrontDoorRouteState.originalInput).toBe("");
    expect(initialFrontDoorRouteState.selectedChoiceId).toBeUndefined();
  });

  it("classifies on input and keeps the original text", () => {
    const next = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    expect(next.view?.kind).toBe("confirmation");
    expect(next.originalInput).toBe("My father needs care.");
  });

  it("records a selection without opening anything", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    const chosen = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "other_person",
    });
    expect(chosen.selectedChoiceId).toBe("other_person");
    expect(chosen.view?.caseCreated).toBe(false);
    expect(chosen.view?.specialistRouteOpened).toBe(false);
    expect(chosen.view?.targetConfirmed).toBe(false);
  });

  it("moves to urgent support when the person says something urgent is happening", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    const urgent = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "urgent",
    });
    expect(urgent.view?.kind).toBe("urgent_support");
  });

  it("goes back to the confirmation step and clears the selection", () => {
    let state = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    state = frontDoorRouteReducer(state, { type: "choice_selected", choiceId: "urgent" });
    state = frontDoorRouteReducer(state, { type: "go_back" });
    expect(state.view?.kind).toBe("confirmation");
    expect(state.selectedChoiceId).toBeUndefined();
    expect(state.originalInput).toBe("My father needs care.");
  });

  it("hands over to ordinary message checking on request", () => {
    let state = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    state = frontDoorRouteReducer(state, { type: "ordinary_check_requested" });
    expect(state.ordinaryCheckRequested).toBe(true);
    expect(state.view).toBeUndefined();
    expect(state.originalInput).toBe("My father needs care.");
  });

  it("clears everything when dismissed", () => {
    let state = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "My father needs care.",
    });
    state = frontDoorRouteReducer(state, { type: "dismissed" });
    expect(state).toEqual(initialFrontDoorRouteState);
  });

  it("does not intercept a document at all", () => {
    const next = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: "Your father's account has been closed",
    });
    expect(next.view?.kind).toBe("document_analysis");
  });
});
