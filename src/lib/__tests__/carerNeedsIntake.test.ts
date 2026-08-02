import { describe, expect, it } from "vitest";
import {
  CHANGE_OPTIONS,
  DIFFICULTY_OPTIONS,
  FREQUENCY_OPTIONS,
  buildNeedsIntakeSummary,
  carerNeedsIntakeReducer,
  initialCarerNeedsIntakeState,
  needsIntakeSummaryText,
  type CarerNeedsIntakeAction,
  type CarerNeedsIntakeState,
} from "../carerNeedsIntake/carerNeedsIntake";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import { deriveFrontDoorOrientationView } from "../frontDoorIntent/frontDoorOrientationView";
import { resolveFrontDoorRouteView } from "../frontDoorIntent/frontDoorRouteView";
import { findForbiddenSafetyPhrases } from "../safetyWording";

// Wales-first Carer Support Needs Intake v1.
//
// One optional flow, offered only after somebody has reached an orientation
// result about help for one other person. It collects three things and shows
// them back. It does not assess, decide, save, contact or refer, and this file
// exists to keep it that way.
//
// The regression case throughout is the sister example, which is the same
// wording the Front Door slice was built against.

const SISTER = "My sister needs help.";

const orientationFor = (text: string, choiceId: Parameters<typeof deriveFrontDoorOrientationView>[1]) =>
  deriveFrontDoorOrientationView(classifyFrontDoorIntent(text), choiceId, text);

const start = (personLabel: string | undefined = "sister"): CarerNeedsIntakeState => ({
  ...initialCarerNeedsIntakeState,
  personLabel,
  originalInput: SISTER,
});

/** Passing undefined to `start` would take the default, so this is explicit. */
const startWithoutLabel = (): CarerNeedsIntakeState => ({
  ...initialCarerNeedsIntakeState,
  personLabel: undefined,
  originalInput: SISTER,
});

/**
 * Everything the summary says about this person's situation.
 *
 * Deliberately excludes the approved limits statement, which has to contain
 * "assessed" and "eligibility" in order to say that AdminAvenger has done
 * neither. Banning those words from the whole page would ban the sentence that
 * makes the page honest.
 */
const summaryContent = (summary: ReturnType<typeof buildNeedsIntakeSummary>): string =>
  [
    summary.heading,
    summary.aboutLine,
    summary.difficultiesHeading,
    ...summary.difficulties,
    summary.changeHeading,
    summary.change ?? "",
    summary.frequencyHeading,
    summary.frequency ?? "",
    summary.nothingChosenStatement ?? "",
    summary.walesStatement,
  ].join("\n");

const run = (
  state: CarerNeedsIntakeState,
  ...actions: readonly CarerNeedsIntakeAction[]
): CarerNeedsIntakeState => actions.reduce(carerNeedsIntakeReducer, state);

const FIRST_DIFFICULTY = DIFFICULTY_OPTIONS[0].id;
const SECOND_DIFFICULTY = DIFFICULTY_OPTIONS[1].id;

const toSummary = (state = start()) =>
  run(
    state,
    { type: "continue" },
    { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
    { type: "toggle_difficulty", difficultyId: SECOND_DIFFICULTY },
    { type: "continue" },
    { type: "choose_change", changeId: "more_difficult" },
    { type: "continue" },
    { type: "choose_frequency", frequencyId: "every_day" },
    { type: "continue" },
  );

// --- 1 and 2: the intake is offered, never opened -----------------------------

describe("1, 2: the intake is reached only after orientation, and never opens itself", () => {
  it("is not offered by the confirmation question", () => {
    const confirmation = resolveFrontDoorRouteView(SISTER);
    expect(confirmation.kind).toBe("confirmation");
    expect("aboutOneOtherPerson" in confirmation).toBe(false);
  });

  it("is offered by the sister orientation, which is about one other person", () => {
    const view = orientationFor(SISTER, "other_person");
    expect(view.aboutOneOtherPerson).toBe(true);
    expect(view.personLabel).toBe("sister");
  });

  it("starts in the orientation state, with no question showing", () => {
    expect(initialCarerNeedsIntakeState.step).toBe("orientation");
    expect(initialCarerNeedsIntakeState.difficulties).toEqual([]);
    expect(initialCarerNeedsIntakeState.change).toBeUndefined();
    expect(initialCarerNeedsIntakeState.frequency).toBeUndefined();
  });

  it("does nothing at all until the person continues", () => {
    const untouched = run(start(), { type: "back" }, { type: "return_to_original" });
    expect(untouched.step).toBe("orientation");
  });
});

// --- Scope: who is offered this at all ---------------------------------------

describe("scope: only help for one other person", () => {
  it.each([
    { name: "the supporter's own side", choiceId: "self_supporting" as const },
    { name: "both people", choiceId: "both" as const },
    { name: "not sure", choiceId: "unsure" as const },
  ])("does not offer the intake for $name", ({ choiceId }) => {
    expect(orientationFor(SISTER, choiceId).aboutOneOtherPerson).toBe(false);
  });

  it.each([
    { name: "benefits", text: "Can my father claim Attendance Allowance?", choiceId: "other_person" as const },
    { name: "bereavement", text: "My father died yesterday.", choiceId: "what_next" as const },
  ])("does not offer the intake for a $name orientation", ({ text, choiceId }) => {
    expect(orientationFor(text, choiceId).aboutOneOtherPerson).toBe(false);
  });
});

// --- 3: question order --------------------------------------------------------

describe("3: the order is difficulties, change, frequency, summary", () => {
  it("advances one step at a time", () => {
    let state = start();
    expect(state.step).toBe("orientation");

    state = carerNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("difficulties");

    state = carerNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("change");

    state = carerNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("frequency");

    state = carerNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("summary");
  });

  it("stops at the summary rather than running past it", () => {
    const state = run(toSummary(), { type: "continue" }, { type: "continue" });
    expect(state.step).toBe("summary");
  });

  it("ignores an answer aimed at a step that is not showing", () => {
    const state = carerNeedsIntakeReducer(start(), {
      type: "choose_frequency",
      frequencyId: "every_day",
    });
    expect(state.frequency).toBeUndefined();
    expect(state.step).toBe("orientation");
  });
});

// --- 4 and 5: choices ---------------------------------------------------------

describe("4: several difficulties can be chosen", () => {
  it("keeps every selection", () => {
    const state = run(
      start(),
      { type: "continue" },
      { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
      { type: "toggle_difficulty", difficultyId: SECOND_DIFFICULTY },
    );
    expect(state.difficulties).toEqual([FIRST_DIFFICULTY, SECOND_DIFFICULTY]);
  });

  it("toggles a selection off again without disturbing the others", () => {
    const state = run(
      start(),
      { type: "continue" },
      { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
      { type: "toggle_difficulty", difficultyId: SECOND_DIFFICULTY },
      { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
    );
    expect(state.difficulties).toEqual([SECOND_DIFFICULTY]);
  });

  it("keeps the approved order rather than the order they were clicked", () => {
    const state = run(
      start(),
      { type: "continue" },
      { type: "toggle_difficulty", difficultyId: SECOND_DIFFICULTY },
      { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
    );
    expect(state.difficulties).toEqual([FIRST_DIFFICULTY, SECOND_DIFFICULTY]);
  });
});

describe("5: I'm not sure is available on every question", () => {
  it.each([
    { name: "difficulties", options: DIFFICULTY_OPTIONS },
    { name: "change", options: CHANGE_OPTIONS },
    { name: "frequency", options: FREQUENCY_OPTIONS },
  ])("offers it on $name", ({ options }) => {
    expect(options.some((option) => option.label === "I'm not sure")).toBe(true);
  });

  it("uses the approved headings and instruction", () => {
    const summary = buildNeedsIntakeSummary(toSummary());
    expect(summary.heading).toBe("Your preparation summary");
  });
});

// --- 6 and 7: back and editing ------------------------------------------------

describe("6: back goes one step at a time and keeps earlier answers", () => {
  it("returns through frequency, change and difficulties in turn", () => {
    let state = toSummary();

    state = carerNeedsIntakeReducer(state, { type: "back" });
    expect(state.step).toBe("frequency");
    state = carerNeedsIntakeReducer(state, { type: "back" });
    expect(state.step).toBe("change");
    state = carerNeedsIntakeReducer(state, { type: "back" });
    expect(state.step).toBe("difficulties");
    state = carerNeedsIntakeReducer(state, { type: "back" });
    expect(state.step).toBe("orientation");
  });

  it("keeps every answer on the way back", () => {
    const state = run(toSummary(), { type: "back" }, { type: "back" }, { type: "back" });

    expect(state.difficulties).toEqual([FIRST_DIFFICULTY, SECOND_DIFFICULTY]);
    expect(state.change).toBe("more_difficult");
    expect(state.frequency).toBe("every_day");
  });

  it("keeps the original wording and the person label throughout", () => {
    const state = run(toSummary(), { type: "back" }, { type: "back" });
    expect(state.originalInput).toBe(SISTER);
    expect(state.personLabel).toBe("sister");
  });
});

describe("7: changing an earlier answer updates the summary", () => {
  it("reflects a changed difficulty", () => {
    const before = buildNeedsIntakeSummary(toSummary());
    const after = buildNeedsIntakeSummary(
      run(
        toSummary(),
        { type: "back" },
        { type: "back" },
        { type: "back" },
        { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
        { type: "continue" },
        { type: "continue" },
        { type: "continue" },
      ),
    );

    expect(before.difficulties).toHaveLength(2);
    expect(after.difficulties).toHaveLength(1);
    expect(after.difficulties).not.toEqual(before.difficulties);
  });

  it("reflects a changed frequency", () => {
    const after = buildNeedsIntakeSummary(
      run(
        toSummary(),
        { type: "back" },
        { type: "choose_frequency", frequencyId: "occasionally" },
        { type: "continue" },
      ),
    );

    expect(after.frequency).toBe("Occasionally");
  });
});

describe("no stale answer survives a reset", () => {
  it("clears every answer and returns to the start", () => {
    const state = carerNeedsIntakeReducer(toSummary(), { type: "reset" });

    expect(state.step).toBe("orientation");
    expect(state.difficulties).toEqual([]);
    expect(state.change).toBeUndefined();
    expect(state.frequency).toBeUndefined();
  });

  it("keeps the person label and wording, which did not change", () => {
    const state = carerNeedsIntakeReducer(toSummary(), { type: "reset" });
    expect(state.personLabel).toBe("sister");
    expect(state.originalInput).toBe(SISTER);
  });
});

// --- 8 and 9: the summary -----------------------------------------------------

describe("8: the summary keeps the person label from the source", () => {
  it("uses the person's own word", () => {
    expect(buildNeedsIntakeSummary(toSummary()).personLabel).toBe("sister");
  });

  it("says who it is about without inventing a label when none was given", () => {
    const summary = buildNeedsIntakeSummary(toSummary(startWithoutLabel()));
    expect(summary.personLabel).toBeUndefined();
    expect(summary.aboutLine).not.toMatch(/undefined/);
    expect(summary.aboutLine).toMatch(/the person you mentioned/i);
  });

  it("shows the chosen answers back in plain words", () => {
    const summary = buildNeedsIntakeSummary(toSummary());
    expect(summary.difficulties).toEqual([
      DIFFICULTY_OPTIONS[0].label,
      DIFFICULTY_OPTIONS[1].label,
    ]);
    expect(summary.change).toBe("It has become more difficult");
    expect(summary.frequency).toBe("Every day");
  });

  it("says plainly when a question was left unanswered", () => {
    const summary = buildNeedsIntakeSummary(
      run(start(), { type: "continue" }, { type: "continue" }, { type: "continue" }, { type: "continue" }),
    );
    expect(summary.difficulties).toEqual([]);
    expect(summary.change).toBeUndefined();
    expect(summary.frequency).toBeUndefined();
    expect(summary.nothingChosenStatement).toBeTruthy();
  });
});

describe("9, 14: the summary decides nothing and points nowhere", () => {
  const spoken = () => needsIntakeSummaryText(buildNeedsIntakeSummary(toSummary()));

  it("carries the approved limits statement", () => {
    expect(buildNeedsIntakeSummary(toSummary()).limitsStatement).toBe(
      "This is a preparation summary only. AdminAvenger has not assessed needs, eligibility or what any organisation will decide.",
    );
  });

  it("states no entitlement, diagnosis, legal right or assessment outcome", () => {
    const content = summaryContent(buildNeedsIntakeSummary(toSummary()));

    for (const forbidden of [
      /\bentitled?\b/i,
      /\bqualif/i,
      /\beligib/i,
      /\bdiagnos/i,
      /\bdisabled\b/i,
      /\bdisability\b/i,
      /\blegal right\b/i,
      /\bhas a right\b/i,
      /\bmust provide\b/i,
      /\bassessment\b/i,
      /\bAct 2014\b/i,
      /\bcarer\b/i,
    ]) {
      expect(content, String(forbidden)).not.toMatch(forbidden);
    }
  });

  it("still carries the honest sentence, which names what it has not done", () => {
    // The ban above is on the answer content only. The limits statement has to
    // say "assessed" and "eligibility" in order to say AdminAvenger has done
    // neither, so it must not be quietly dropped to satisfy that ban.
    const summary = buildNeedsIntakeSummary(toSummary());
    expect(summary.limitsStatement).toMatch(/\bassessed\b/i);
    expect(summary.limitsStatement).toMatch(/\beligibility\b/i);
    expect(needsIntakeSummaryText(summary)).toContain(summary.limitsStatement);
  });

  it("shows no phone number and no link", () => {
    const text = spoken();
    expect(text).not.toMatch(/https?:\/\//i);
    expect(text).not.toMatch(/www\./i);
    expect(text).not.toMatch(/\b0\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/);
    expect(text).not.toMatch(/\b(999|111|101)\b/);
  });

  it("passes the existing forbidden safety wording checks", () => {
    expect(findForbiddenSafetyPhrases(spoken())).toEqual([]);
  });

  it("frames Wales as preparation, never as a duty owed", () => {
    const wales = buildNeedsIntakeSummary(toSummary()).walesStatement;
    expect(wales).toBe(
      "This can help you prepare before speaking to your local council or another support service in Wales.",
    );
    expect(wales).not.toMatch(/\bmust\b|\bwill provide\b|\bhas to\b/i);
  });
});

// --- 10 to 13: nothing happens ------------------------------------------------

describe("10, 11, 12, 13: the intake creates, saves, opens and activates nothing", () => {
  const everyStep = (): readonly CarerNeedsIntakeState[] => {
    const states: CarerNeedsIntakeState[] = [start()];
    let state = start();
    for (const action of [
      { type: "continue" },
      { type: "toggle_difficulty", difficultyId: FIRST_DIFFICULTY },
      { type: "continue" },
      { type: "choose_change", changeId: "not_sure" },
      { type: "continue" },
      { type: "choose_frequency", frequencyId: "varies" },
      { type: "continue" },
    ] as const satisfies readonly CarerNeedsIntakeAction[]) {
      state = carerNeedsIntakeReducer(state, action);
      states.push(state);
    }
    return states;
  };

  it("holds the prohibitions in every state", () => {
    for (const state of everyStep()) {
      expect(state.caseCreated).toBe(false);
      expect(state.savedAutomatically).toBe(false);
      expect(state.specialistRouteOpened).toBe(false);
      expect(state.estateRouteOpened).toBe(false);
      expect(state.contactMade).toBe(false);
    }
  });

  it("never mentions an Estate journey anywhere in the summary", () => {
    const text = needsIntakeSummaryText(buildNeedsIntakeSummary(toSummary()));
    expect(text).not.toMatch(/\bestate\b/i);
    expect(text).not.toMatch(/\bprobate\b/i);
  });

  it("offers no save, download, send or contact wording", () => {
    const text = needsIntakeSummaryText(buildNeedsIntakeSummary(toSummary()));
    expect(text).not.toMatch(/\bsave\b|\bsaved\b/i);
    expect(text).not.toMatch(/\bdownload\b/i);
    expect(text).not.toMatch(/\bsend\b|\bsubmit\b/i);
    expect(text).not.toMatch(/\bcontact\b/i);
  });
});

// --- Options themselves -------------------------------------------------------

describe("the option sets stay plain, and free of diagnosis", () => {
  const everyLabel = [
    ...DIFFICULTY_OPTIONS,
    ...CHANGE_OPTIONS,
    ...FREQUENCY_OPTIONS,
  ].map((option) => option.label);

  it("uses no diagnosis or condition terms", () => {
    for (const label of everyLabel) {
      expect(label, label).not.toMatch(
        /\bdementia\b|\bstroke\b|\bfrail\b|\bdisabled\b|\bdisability\b|\bcondition\b|\bimpair/i,
      );
    }
  });

  it("carries the approved day-to-day difficulties", () => {
    const labels = DIFFICULTY_OPTIONS.map((option) => option.label);
    expect(labels).toContain("Washing or dressing");
    expect(labels).toContain("Getting in or out of bed or a chair");
    expect(labels).toContain("Taking medication safely");
    expect(labels).toContain("Staying safe without someone nearby");
    expect(labels).toContain("Something else");
    expect(labels).toContain("I'm not sure");
  });

  it("keeps every option id unique within its set", () => {
    for (const options of [DIFFICULTY_OPTIONS, CHANGE_OPTIONS, FREQUENCY_OPTIONS]) {
      const ids = options.map((option) => option.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("the reducer is deterministic", () => {
  it("returns identical state for identical actions", () => {
    expect(toSummary()).toEqual(toSummary());
  });
});
