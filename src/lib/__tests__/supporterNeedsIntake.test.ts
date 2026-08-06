import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import { deriveFrontDoorOrientationView } from "../frontDoorIntent/frontDoorOrientationView";
import {
  HELP_PROVIDED_OPTIONS,
  IMPACT_OPTIONS,
  SUPPORT_FREQUENCY_OPTIONS,
  SUPPORTER_NEEDS_INTAKE_COPY,
  buildSupporterNeedsIntakeSummary,
  initialSupporterNeedsIntakeState,
  supporterNeedsIntakeReducer,
  supporterNeedsIntakeSummaryText,
  type SupporterNeedsIntakeState,
} from "../supporterNeedsIntake/supporterNeedsIntake";

const neighbourInput =
  "I look after my neighbour every day and I am struggling.";

const stateFor = (
  overrides: Partial<SupporterNeedsIntakeState> = {},
): SupporterNeedsIntakeState => ({
  ...initialSupporterNeedsIntakeState,
  personLabel: "neighbour",
  originalInput: neighbourInput,
  ...overrides,
});

const completeState = (): SupporterNeedsIntakeState => ({
  ...stateFor(),
  step: "summary",
  helpProvided: ["shopping_household", "appointments_transport"],
  frequency: "every_day",
  impact: ["tired_exhausted", "less_time_for_self"],
});

describe("supporter intake eligibility", () => {
  const orientationFor = (text: string, choice: "other_person" | "self_supporting" | "both" | "unsure") =>
    deriveFrontDoorOrientationView(classifyFrontDoorIntent(text), choice, text);

  it("offers the intake only for a supporter-focused care orientation with an identifiable person", () => {
    expect(
      orientationFor(neighbourInput, "self_supporting")
        .aboutSupporterWithNamedPerson,
    ).toBe(true);

    expect(
      orientationFor(neighbourInput, "other_person")
        .aboutSupporterWithNamedPerson,
    ).toBe(false);
    expect(
      orientationFor(neighbourInput, "both").aboutSupporterWithNamedPerson,
    ).toBe(false);
    expect(
      orientationFor(neighbourInput, "unsure").aboutSupporterWithNamedPerson,
    ).toBe(false);
  });

  it("does not offer the intake without an identifiable other person", () => {
    const view = orientationFor(
      "I provide support every day and I am struggling.",
      "self_supporting",
    );

    expect(view.personLabel).toBeUndefined();
    expect(view.aboutSupporterWithNamedPerson).toBe(false);
  });

  it.each([
    "Can I get anything for looking after my mum?",
    "Dad died yesterday and I was his carer.",
  ])("does not offer the intake for a non-care orientation: %s", (text) => {
    expect(
      orientationFor(text, "self_supporting").aboutSupporterWithNamedPerson,
    ).toBe(false);
  });
});

describe("supporter needs intake state", () => {
  it("does not advance any unanswered question", () => {
    const helpProvided = supporterNeedsIntakeReducer(stateFor(), {
      type: "continue",
    });
    expect(
      supporterNeedsIntakeReducer(helpProvided, { type: "continue" }),
    ).toBe(helpProvided);

    const frequency = { ...helpProvided, step: "frequency" as const };
    expect(
      supporterNeedsIntakeReducer(frequency, { type: "continue" }),
    ).toBe(frequency);

    const impact = { ...helpProvided, step: "impact" as const };
    expect(supporterNeedsIntakeReducer(impact, { type: "continue" })).toBe(
      impact,
    );
  });

  it("uses the exact question order and never opens automatically", () => {
    let state = stateFor();
    expect(state.step).toBe("orientation");

    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("help_provided");
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_help",
      helpId: "not_sure",
    });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("frequency");
    state = supporterNeedsIntakeReducer(state, {
      type: "choose_frequency",
      frequencyId: "not_sure",
    });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("impact");
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_impact",
      impactId: "not_sure",
    });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    expect(state.step).toBe("summary");
  });

  it("allows multiple help types and keeps them in display order", () => {
    let state = stateFor({ step: "help_provided" });
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_help",
      helpId: "appointments_transport",
    });
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_help",
      helpId: "shopping_household",
    });

    expect(state.helpProvided).toEqual([
      "shopping_household",
      "appointments_transport",
    ]);
  });

  it("allows multiple impacts and keeps them in display order", () => {
    let state = stateFor({ step: "impact" });
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_impact",
      impactId: "less_time_for_self",
    });
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_impact",
      impactId: "tired_exhausted",
    });

    expect(state.impact).toEqual(["tired_exhausted", "less_time_for_self"]);
  });

  it("offers an unsure answer on every question", () => {
    expect(HELP_PROVIDED_OPTIONS.at(-1)?.label).toBe("I'm not sure");
    expect(SUPPORT_FREQUENCY_OPTIONS.at(-1)?.label).toBe("I'm not sure");
    expect(IMPACT_OPTIONS.at(-1)?.label).toBe("I'm not sure");
  });

  it("moves back one step at a time and preserves answers", () => {
    const state = supporterNeedsIntakeReducer(completeState(), { type: "back" });

    expect(state.step).toBe("impact");
    expect(state.helpProvided).toEqual([
      "shopping_household",
      "appointments_transport",
    ]);
    expect(state.frequency).toBe("every_day");
    expect(state.impact).toEqual(["tired_exhausted", "less_time_for_self"]);
  });

  it("updates the summary after an earlier answer is edited", () => {
    let state = supporterNeedsIntakeReducer(completeState(), { type: "back" });
    state = supporterNeedsIntakeReducer(state, { type: "back" });
    state = supporterNeedsIntakeReducer(state, { type: "back" });
    state = supporterNeedsIntakeReducer(state, {
      type: "toggle_help",
      helpId: "shopping_household",
    });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });
    state = supporterNeedsIntakeReducer(state, { type: "continue" });

    expect(buildSupporterNeedsIntakeSummary(state).helpProvided).toEqual([
      "Appointments or transport",
    ]);
  });

  it("reset clears every answer while preserving the source context", () => {
    const state = supporterNeedsIntakeReducer(completeState(), { type: "reset" });

    expect(state).toMatchObject({
      step: "orientation",
      personLabel: "neighbour",
      originalInput: neighbourInput,
      helpProvided: [],
      frequency: undefined,
      impact: [],
    });
  });

  it("returning to the original message also clears stale answers", () => {
    const state = supporterNeedsIntakeReducer(completeState(), {
      type: "return_to_original",
    });

    expect(state.step).toBe("orientation");
    expect(state.helpProvided).toEqual([]);
    expect(state.frequency).toBeUndefined();
    expect(state.impact).toEqual([]);
  });

  it("preserves the original wording and source person label", () => {
    const state = supporterNeedsIntakeReducer(stateFor(), { type: "continue" });

    expect(state.originalInput).toBe(neighbourInput);
    expect(state.personLabel).toBe("neighbour");
  });

  it("keeps all prohibited outcomes unrepresentable", () => {
    expect(completeState()).toMatchObject({
      caseCreated: false,
      savedAutomatically: false,
      specialistRouteOpened: false,
      estateRouteOpened: false,
      contactMade: false,
    });
  });
});

describe("supporter preparation summary", () => {
  it("keeps the supporter and supported person separate", () => {
    const summary = buildSupporterNeedsIntakeSummary(completeState());

    expect(summary).toMatchObject({
      heading: "Your preparation summary",
      whoHeading: "Who you support",
      who: "Your neighbour",
      helpHeading: "Help you provide",
      helpProvided: ["Shopping or household tasks", "Appointments or transport"],
      frequencyHeading: "How often",
      frequency: "Every day",
      impactHeading: "How it affects you",
      impact: ["I feel tired or exhausted", "I have less time for myself"],
    });
  });

  it("does not label the supporter as a carer when their source wording did not", () => {
    const text = supporterNeedsIntakeSummaryText(
      buildSupporterNeedsIntakeSummary(completeState()),
    );

    expect(text).not.toMatch(/\bcarer\b/i);
  });

  it("uses the exact decision boundary and Wales preparation statement", () => {
    const summary = buildSupporterNeedsIntakeSummary(completeState());

    expect(summary.limitsStatement).toBe(
      "This is a preparation summary only. AdminAvenger has not decided whether you have a formal caring role, whether you qualify for support, or what any organisation will decide.",
    );
    expect(summary.walesStatement).toBe(
      "This can help you prepare before speaking to your local council or another support service in Wales.",
    );
  });

  it("does not decide entitlement, diagnose, state rights or mention Carer's Allowance", () => {
    const text = supporterNeedsIntakeSummaryText(
      buildSupporterNeedsIntakeSummary(completeState()),
    );

    expect(text).not.toMatch(/entitled|entitlement|legal right|diagnos|depression|anxiety|burnout/i);
    expect(text).not.toContain("Carer's Allowance");
    expect(text).not.toMatch(/\bqualif(?:y|ies|ied)\b(?! for support)/i);
  });

  it("includes the limits and Wales framing in copied text", () => {
    const summary = buildSupporterNeedsIntakeSummary(completeState());
    const text = supporterNeedsIntakeSummaryText(summary);

    expect(text).toContain(summary.limitsStatement);
    expect(text).toContain(summary.walesStatement);
    expect(text).toContain("Your neighbour");
  });

  it("provides an accessible incomplete-state message for unanswered questions", () => {
    const summary = buildSupporterNeedsIntakeSummary(
      stateFor({ step: "summary" }),
    );

    expect(summary.nothingChosenStatement).toBe(
      SUPPORTER_NEEDS_INTAKE_COPY.incompleteStatement,
    );
  });
});
