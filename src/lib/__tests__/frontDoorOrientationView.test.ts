import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import {
  deriveFrontDoorOrientationView,
  type FrontDoorOrientationView,
} from "../frontDoorIntent/frontDoorOrientationView";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  resolveFrontDoorRouteView,
  type FrontDoorChoiceId,
  type FrontDoorRouteView,
} from "../frontDoorIntent/frontDoorRouteView";
import { findForbiddenSafetyPhrases } from "../safetyWording";

// Front-Door Orientation Result v1.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md,
// Section 15, reached through the Section 10.3 transition
// `person_target_confirmed` to `orientation_selected`.
//
// This is the one page shown immediately after the person answers the
// confirmation question. It is not a result about a document, it is an
// orientation: what this may be about, one useful next step, a short list of
// what to gather, and a plain statement of what AdminAvenger cannot decide.
//
// Every word lives in a pure module so it can be asserted here rather than
// inspected in a browser. The tests below are written against the seven
// required examples A to G.

const orientationFor = (
  text: string,
  choiceId: FrontDoorChoiceId,
): FrontDoorOrientationView =>
  deriveFrontDoorOrientationView(classifyFrontDoorIntent(text), choiceId, text);

/** Every line the person can read on the page, as one string. */
const spokenText = (view: FrontDoorOrientationView): string =>
  [
    view.heading,
    view.interpretation,
    view.nextStepHeading,
    view.nextStep,
    view.gatherHeading,
    ...view.gather,
    view.cannotDecideHeading,
    ...view.cannotDecide,
    view.cannotContactStatement,
    view.backLabel,
    view.ordinaryCheckLabel,
  ].join("\n");

/**
 * What the page says about this person's situation.
 *
 * Deliberately excludes the constant limits block, which says AdminAvenger
 * cannot decide who qualifies for support. That sentence is required and must
 * not be mistaken for the page raising a money question of its own.
 */
const bodyText = (view: FrontDoorOrientationView): string =>
  [view.interpretation, view.nextStep, ...view.gather].join("\n");

const asConfirmation = (view: FrontDoorRouteView) => {
  if (view.kind !== "confirmation") {
    throw new Error(`expected a confirmation view, received ${view.kind}`);
  }
  return view;
};

/** The choices the person is actually offered for this wording. */
const choiceIdsFor = (text: string): readonly FrontDoorChoiceId[] =>
  asConfirmation(resolveFrontDoorRouteView(text)).choices.map(
    (choice) => choice.id,
  );

const EXAMPLES = {
  A: "My sister needs help.",
  B: "I look after my neighbour every day and I am struggling.",
  C: "Mum gets PIP and I help every day.",
  D: "Help with my brother.",
  E: "Can my father claim Attendance Allowance?",
  F: "My father died yesterday.",
} as const;

describe("the page has the four required parts and nothing else", () => {
  it("uses the approved headings", () => {
    const view = orientationFor(EXAMPLES.A, "other_person");

    expect(view.heading).toBe("What this may be about");
    expect(view.nextStepHeading).toBe("A useful next step");
    expect(view.gatherHeading).toBe("What to gather");
    expect(view.cannotDecideHeading).toBe("What AdminAvenger cannot decide");
  });

  it("offers one next step, not a list of them", () => {
    const view = orientationFor(EXAMPLES.A, "other_person");

    expect(view.nextStep.length).toBeGreaterThan(0);
    expect(view.nextStep).not.toContain("\n");
  });

  it("keeps what to gather to three bullets at most", () => {
    for (const [name, text] of Object.entries(EXAMPLES)) {
      for (const choiceId of choiceIdsFor(text)) {
        if (choiceId === "urgent") continue;
        const view = orientationFor(text, choiceId);
        expect(view.gather.length, `${name} / ${choiceId}`).toBeGreaterThan(0);
        expect(view.gather.length, `${name} / ${choiceId}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("offers exactly the two approved buttons", () => {
    const view = orientationFor(EXAMPLES.A, "other_person");

    expect(view.backLabel).toBe("Back");
    expect(view.ordinaryCheckLabel).toBe("Return to original message");
    expect(view.backAvailable).toBe(true);
    expect(view.ordinaryCheckAvailable).toBe(true);
  });

  it("keeps the original wording, unaltered", () => {
    for (const text of Object.values(EXAMPLES)) {
      expect(orientationFor(text, "unsure").originalInput).toBe(text);
    }
  });
});

describe("A: a sister who needs help", () => {
  const view = () => orientationFor(EXAMPLES.A, "other_person");

  it("puts the focus on the sister, in the person's own word", () => {
    expect(view().interpretation).toContain("sister");
  });

  it("does not label the person who typed it a carer", () => {
    expect(spokenText(view())).not.toMatch(/\bcarer\b/i);
  });

  it("says what this may be about, never what it is", () => {
    expect(view().interpretation).toMatch(/\bmay be\b|\bsounds like\b/i);
    expect(view().interpretation).not.toMatch(/\bthis is definitely\b|\byou are entitled\b/i);
  });
});

describe("B: someone supporting a neighbour every day", () => {
  const view = () => orientationFor(EXAMPLES.B, "self_supporting");

  it("puts the focus on the person who typed it", () => {
    expect(view().interpretation).toMatch(/\byou\b|\byourself\b/i);
  });

  it("does not say they qualify for anything", () => {
    const spoken = spokenText(view());
    expect(spoken).not.toMatch(/\byou qualify\b|\byou are entitled\b|\byou can claim\b/i);
  });

  it("still does not call them a carer", () => {
    expect(spokenText(view())).not.toMatch(/\bcarer\b/i);
  });
});

describe("C: Mum gets PIP and the person helps every day", () => {
  const view = () => orientationFor(EXAMPLES.C, "both");

  it("reaches the benefits question, so the choice is a benefits choice", () => {
    expect(choiceIdsFor(EXAMPLES.C)).toContain("both");
  });

  it("keeps the two people separate rather than merging them", () => {
    const interpretation = view().interpretation;
    expect(interpretation).toMatch(/\bseparate\b|\bseparately\b/i);
    expect(interpretation).not.toMatch(/\btogether\b|\bcombined\b|\bone plan\b|\bboth of you (are|need)\b/i);
  });

  it("names Mum in the person's own word and also names the person themselves", () => {
    const interpretation = view().interpretation;
    expect(interpretation).toContain("Mum");
    expect(interpretation).toMatch(/\byou\b/i);
  });

  // The defect this guards against: the page used to describe the person who
  // typed it as having a money question, purely because they support somebody
  // who receives a benefit. The source says nothing of the kind.
  it("does not turn the supporter's side into a money or benefits question", () => {
    const body = bodyText(view());

    for (const forbidden of [
      /\bmoney\b/i,
      /\bbenefits?\b/i,
      /\bpayments?\b/i,
      /\bclaim\b/i,
      /\ballowance\b/i,
      /\bPIP\b/,
      /\bentitled?\b/i,
      /\bqualif/i,
      /\breceives?\b/i,
      /\breceiving\b/i,
    ]) {
      expect(body, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it("still states the limits, which do mention qualifying", () => {
    // The ban above is on the body only. The limits block must keep saying that
    // AdminAvenger cannot decide who qualifies, otherwise the previous
    // assertion could be satisfied by deleting the honest part of the page.
    expect(view().cannotDecide.join(" ")).toMatch(/\bqualifies\b/i);
  });

  it("does not treat the benefit Mum already receives as evidence of anything else", () => {
    const spoken = spokenText(view());
    expect(spoken).not.toMatch(/\bbecause (she|he|they|your Mum) (gets|receives|is on)\b/i);
    expect(spoken).not.toMatch(/\balso (get|claim|apply)\b/i);
    expect(spoken).not.toMatch(/\bwill get\b|\bwill receive\b|\bshould apply\b/i);
  });

  it("describes Mum's side as support, difficulty and change", () => {
    const view_ = view();
    expect(view_.interpretation).toMatch(/what support your Mum may need/i);
    expect(view_.gather.join(" ")).toMatch(/\bfinds difficult\b/i);
    expect(view_.gather.join(" ")).toMatch(/\bchanged\b/i);
  });

  it("describes the supporter's side as what they do and what it costs them", () => {
    const gathered = view().gather.join(" ");
    expect(gathered).toMatch(/what you do to help/i);
    expect(gathered).toMatch(/\bhealth\b/i);
    expect(gathered).toMatch(/\bwork\b/i);
    expect(gathered).toMatch(/daily life/i);
  });

  it("omits neither person from what to gather", () => {
    const gather = view().gather;
    expect(gather.some((item) => /Mum/.test(item)), "Mum is missing").toBe(true);
    expect(
      gather.some((item) => /\byou\b|\byour own\b/i.test(item)),
      "the person who typed it is missing",
    ).toBe(true);
  });

  it("still does not call the person who typed it a carer", () => {
    expect(spokenText(view())).not.toMatch(/\bcarer\b/i);
  });
});

describe("D: help with my brother, and the person is not sure", () => {
  const view = () => orientationFor(EXAMPLES.D, "unsure");

  it("does not guess what the situation is", () => {
    const interpretation = view().interpretation;
    expect(interpretation).toMatch(/\bnot sure\b/i);
    expect(interpretation).not.toMatch(/\bthis is definitely\b|\bthis means\b|\byou need to\b/i);
  });

  it("suggests gathering more information instead", () => {
    const spoken = spokenText(view()).toLowerCase();
    expect(spoken).toMatch(/write down|what has changed|what has been happening/);
  });
});

describe("E: can my father claim Attendance Allowance", () => {
  const view = () => orientationFor(EXAMPLES.E, "other_person");

  it("does not answer the eligibility question", () => {
    const spoken = spokenText(view());
    expect(spoken).not.toMatch(/\bcan claim\b|\bcannot claim\b|\bis eligible\b|\bis not eligible\b/i);
    expect(spoken).not.toMatch(/\byes\b,|\bno\b,/i);
  });

  it("does not repeat the benefit name back as a finding", () => {
    expect(view().interpretation).not.toMatch(/Attendance Allowance/i);
  });

  it("suggests gathering information instead", () => {
    expect(view().gather.length).toBeGreaterThan(0);
  });
});

describe("F: a father who died yesterday", () => {
  const bereavementChoices = () =>
    choiceIdsFor(EXAMPLES.F).filter((choiceId) => choiceId !== "urgent");

  it("reaches the bereavement question", () => {
    expect(bereavementChoices()).toContain("what_next");
    expect(bereavementChoices()).toContain("understand_document");
  });

  it("acknowledges the death calmly, without instruction", () => {
    const view = orientationFor(EXAMPLES.F, "what_next");
    expect(view.interpretation).toMatch(/\bdied\b/i);
    expect(view.interpretation).not.toMatch(/\byou must\b|\byou need to\b|\bas soon as possible\b/i);
  });

  it("never mentions or opens Estate Administration", () => {
    for (const choiceId of bereavementChoices()) {
      const spoken = spokenText(orientationFor(EXAMPLES.F, choiceId));
      expect(spoken, choiceId).not.toMatch(/\bestate\b/i);
      expect(spoken, choiceId).not.toMatch(/\bprobate\b/i);
      expect(spoken, choiceId).not.toMatch(/\bletters of administration\b/i);
      expect(spoken, choiceId).not.toMatch(/\btell us once\b/i);
    }
  });

  it("stays short, rather than becoming bereavement guidance", () => {
    for (const choiceId of bereavementChoices()) {
      const view = orientationFor(EXAMPLES.F, choiceId);
      expect(view.interpretation.length, choiceId).toBeLessThanOrEqual(200);
      expect(view.nextStep.length, choiceId).toBeLessThanOrEqual(200);
      expect(view.gather.length, choiceId).toBeLessThanOrEqual(3);
    }
  });
});

describe("G: the urgent choice does not reach orientation at all", () => {
  it("keeps showing the existing urgent page", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: EXAMPLES.A,
    });
    const urgent = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "urgent",
    });

    expect(urgent.view?.kind).toBe("urgent_support");
  });

  it("leaves the urgent wording exactly as it was", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: EXAMPLES.A,
    });
    const urgent = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "urgent",
    });

    if (urgent.view?.kind !== "urgent_support") {
      throw new Error("expected the urgent support view");
    }

    expect(urgent.view.heading).toBe("If someone needs help right now");
    expect(urgent.view.selectedContactOption).toBeUndefined();
    expect(urgent.view.contactOptions).toHaveLength(4);
  });
});

describe("every non-urgent choice reaches an orientation page", () => {
  it("produces one for each choice on each example", () => {
    for (const [name, text] of Object.entries(EXAMPLES)) {
      for (const choiceId of choiceIdsFor(text)) {
        if (choiceId === "urgent") continue;

        const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
          type: "input_received",
          text,
        });
        const chosen = frontDoorRouteReducer(shown, {
          type: "choice_selected",
          choiceId,
        });

        expect(chosen.view?.kind, `${name} / ${choiceId}`).toBe("orientation");
      }
    }
  });
});

describe("Back returns to the question with the wording intact", () => {
  it("goes back to the confirmation step, not to an empty front door", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: EXAMPLES.A,
    });
    const chosen = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "other_person",
    });
    const back = frontDoorRouteReducer(chosen, { type: "go_back" });

    expect(back.view?.kind).toBe("confirmation");
    expect(back.originalInput).toBe(EXAMPLES.A);
    expect(back.selectedChoiceId).toBeUndefined();
  });

  it("keeps the source metadata so the ordinary check still works", () => {
    const shown = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: EXAMPLES.A,
      sourceTitle: "Photo text (reviewed before checking)",
      sourceType: "email",
    });
    const chosen = frontDoorRouteReducer(shown, {
      type: "choice_selected",
      choiceId: "other_person",
    });

    expect(chosen.source?.sourceTitle).toBe("Photo text (reviewed before checking)");
    expect(chosen.source?.acceptedText).toBe(EXAMPLES.A);

    const back = frontDoorRouteReducer(chosen, { type: "go_back" });
    expect(back.source?.sourceTitle).toBe("Photo text (reviewed before checking)");
  });
});

describe("the page states what AdminAvenger cannot decide", () => {
  it("says it cannot decide who qualifies, what is legal, or what a body will decide", () => {
    const cannot = orientationFor(EXAMPLES.A, "other_person").cannotDecide.join(" ").toLowerCase();

    expect(cannot).toContain("qualif");
    expect(cannot).toContain("legal");
    expect(cannot).toMatch(/council|organisation/);
  });

  it("says plainly that it cannot contact anyone", () => {
    const view = orientationFor(EXAMPLES.A, "other_person");
    expect(view.cannotContactStatement).toMatch(/cannot contact/i);
  });

  it("carries the same limits on every example and choice", () => {
    for (const text of Object.values(EXAMPLES)) {
      for (const choiceId of choiceIdsFor(text)) {
        if (choiceId === "urgent") continue;
        const view = orientationFor(text, choiceId);
        expect(view.cannotDecide.length).toBeGreaterThanOrEqual(3);
        expect(view.cannotContactStatement).toMatch(/cannot contact/i);
      }
    }
  });
});

describe("the page never becomes a document result", () => {
  const everyView = (): FrontDoorOrientationView[] => {
    const views: FrontDoorOrientationView[] = [];
    for (const text of Object.values(EXAMPLES)) {
      for (const choiceId of choiceIdsFor(text)) {
        if (choiceId === "urgent") continue;
        views.push(orientationFor(text, choiceId));
      }
    }
    return views;
  };

  it("never uses the two phrases the specification forbids here", () => {
    for (const view of everyView()) {
      const spoken = spokenText(view);
      expect(spoken).not.toMatch(/No obvious saving or action found/i);
      expect(spoken).not.toMatch(/Identify the sender, date, reference, and deadline/i);
    }
  });

  it("shows no money, no timeline, no score and no saved case", () => {
    for (const view of everyView()) {
      const spoken = spokenText(view);
      expect(spoken).not.toMatch(/£|\bGBP\b/);
      expect(spoken).not.toMatch(/\bsaved\b|\bsave this\b/i);
      expect(spoken).not.toMatch(/\bevidence pack\b|\badviser pack\b/i);
      expect(spoken).not.toMatch(/\bpreparation score\b|\bscore\b/i);
      expect(spoken).not.toMatch(/\bdeadline\b|\btimeline\b/i);
    }
  });

  it("passes the existing forbidden safety wording checks", () => {
    for (const view of everyView()) {
      expect(findForbiddenSafetyPhrases(spokenText(view))).toEqual([]);
    }
  });

  it("creates nothing and opens nothing", () => {
    for (const view of everyView()) {
      expect(view.caseCreated).toBe(false);
      expect(view.specialistRouteOpened).toBe(false);
      expect(view.targetConfirmed).toBe(false);
      expect(view.estateRouteOpened).toBe(false);
    }
  });
});

describe("the orientation view is deterministic", () => {
  it("returns identical output for identical input", () => {
    for (const text of Object.values(EXAMPLES)) {
      expect(orientationFor(text, "unsure")).toEqual(orientationFor(text, "unsure"));
    }
  });
});
