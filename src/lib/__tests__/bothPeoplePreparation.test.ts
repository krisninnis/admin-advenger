import { describe, expect, it } from "vitest";
import {
  BOTH_PEOPLE_PREPARATION_COPY,
  bothPeoplePreparationReducer,
  bothPeoplePreparationSummaryText,
  buildBothPeoplePreparationSummary,
  createBothPeoplePreparationState,
  type BothPeoplePreparationAction,
  type BothPeoplePreparationState,
} from "../bothPeoplePreparation/bothPeoplePreparation";

const INPUT = "I care for Dad full-time and he needs more help now.";

const run = (
  state: BothPeoplePreparationState,
  ...actions: readonly BothPeoplePreparationAction[]
): BothPeoplePreparationState => actions.reduce(bothPeoplePreparationReducer, state);

const started = () =>
  run(
    createBothPeoplePreparationState("Dad", INPUT),
    { type: "continue" },
    { type: "choose_first_side", side: "supported_person" },
    { type: "continue" },
  );

const startedWithSupporterFirst = () =>
  run(
    createBothPeoplePreparationState("Dad", INPUT),
    { type: "continue" },
    { type: "choose_first_side", side: "supporter" },
    { type: "continue" },
  );

const completeSupportedPerson = (state: BothPeoplePreparationState) =>
  run(
    state,
    {
      type: "supported_person_event",
      event: { type: "toggle_difficulty", difficultyId: "washing_or_dressing" },
    },
    { type: "supported_person_event", event: { type: "continue" } },
    {
      type: "supported_person_event",
      event: { type: "choose_change", changeId: "more_difficult" },
    },
    { type: "supported_person_event", event: { type: "continue" } },
    {
      type: "supported_person_event",
      event: { type: "choose_frequency", frequencyId: "every_day" },
    },
    { type: "supported_person_event", event: { type: "continue" } },
  );

const completeSupporter = (state: BothPeoplePreparationState) =>
  run(
    state,
    {
      type: "supporter_event",
      event: { type: "toggle_help", helpId: "shopping_household" },
    },
    { type: "supporter_event", event: { type: "continue" } },
    {
      type: "supporter_event",
      event: { type: "choose_frequency", frequencyId: "few_times_a_week" },
    },
    { type: "supporter_event", event: { type: "continue" } },
    {
      type: "supporter_event",
      event: { type: "toggle_impact", impactId: "harder_to_manage" },
    },
    { type: "supporter_event", event: { type: "continue" } },
  );

describe("both-people high-level state", () => {
  it("uses exactly the five approved high-level states", () => {
    expect(BOTH_PEOPLE_PREPARATION_COPY.steps).toEqual([
      "orientation",
      "choose_first",
      "supported_person_intake",
      "supporter_intake",
      "combined_summary",
    ]);
  });

  it("starts closed and preserves the source wording and person label", () => {
    const state = createBothPeoplePreparationState("Dad", INPUT);

    expect(state).toMatchObject({
      step: "orientation",
      personLabel: "Dad",
      originalInput: INPUT,
      firstSideChoice: undefined,
      order: undefined,
    });
    expect(state.supportedPerson.originalInput).toBe(INPUT);
    expect(state.supporter.originalInput).toBe(INPUT);
  });

  it("requires a choose-first selection before Continue can open an intake", () => {
    const state = run(createBothPeoplePreparationState("Dad", INPUT), {
      type: "continue",
    });
    const unchanged = run(state, { type: "continue" });

    expect(unchanged.step).toBe("choose_first");
    expect(unchanged.chooseFirstAttempted).toBe(true);
  });

  it.each([
    ["supported_person", "supported_person_intake"],
    ["supporter", "supporter_intake"],
  ] as const)("can prepare %s first", (side, expectedStep) => {
    const state = run(
      createBothPeoplePreparationState("Dad", INPUT),
      { type: "continue" },
      { type: "choose_first_side", side },
      { type: "continue" },
    );

    expect(state.step).toBe(expectedStep);
    expect(state.order?.[0]).toBe(side);
  });

  it("uses a stable neutral order for I'm not sure", () => {
    const state = run(
      createBothPeoplePreparationState("Dad", INPUT),
      { type: "continue" },
      { type: "choose_first_side", side: "not_sure" },
      { type: "continue" },
    );

    expect(state.firstSideChoice).toBe("not_sure");
    expect(state.order).toEqual(["supported_person", "supporter"]);
    expect(state.step).toBe("supported_person_intake");
  });
});

describe("composition of the existing intake reducers", () => {
  it("does not advance a blank nested supported-person question", () => {
    const state = started();
    const unchanged = run(state, {
      type: "supported_person_event",
      event: { type: "continue" },
    });

    expect(unchanged.step).toBe("supported_person_intake");
    expect(unchanged.supportedPerson.step).toBe("difficulties");
  });

  it("does not advance a blank nested supporter question", () => {
    const state = startedWithSupporterFirst();
    const unchanged = run(state, {
      type: "supporter_event",
      event: { type: "continue" },
    });

    expect(unchanged.step).toBe("supporter_intake");
    expect(unchanged.supporter.step).toBe("help_provided");
  });

  it("delegates supported-person answers to the existing state shape", () => {
    const state = run(started(), {
      type: "supported_person_event",
      event: { type: "toggle_difficulty", difficultyId: "washing_or_dressing" },
    });

    expect(state.supportedPerson.difficulties).toEqual(["washing_or_dressing"]);
    expect(state.supporter.helpProvided).toEqual([]);
  });

  it("moves from the first completed intake to the other intake", () => {
    const state = completeSupportedPerson(started());

    expect(state.supportedPerson.step).toBe("summary");
    expect(state.step).toBe("supporter_intake");
    expect(state.supporter.step).toBe("help_provided");
  });

  it("Back from the second intake returns to the completed first side", () => {
    let state = completeSupportedPerson(started());
    state = run(state, { type: "back" });

    expect(state.step).toBe("supported_person_intake");
    expect(state.supportedPerson.step).toBe("summary");
    expect(state.supportedPerson.difficulties).toEqual(["washing_or_dressing"]);

    state = run(state, { type: "continue" });
    expect(state.step).toBe("supporter_intake");
    expect(state.supporter.step).toBe("help_provided");
  });

  it("reaches the combined summary only after both sides are complete", () => {
    const state = completeSupporter(completeSupportedPerson(started()));

    expect(state.step).toBe("combined_summary");
    expect(state.supportedPerson.step).toBe("summary");
    expect(state.supporter.step).toBe("summary");
  });

  it("can complete the full sequence with the supporter side first", () => {
    const state = completeSupportedPerson(
      completeSupporter(startedWithSupporterFirst()),
    );

    expect(state.step).toBe("combined_summary");
    expect(state.order).toEqual(["supporter", "supported_person"]);
    expect(state.supportedPerson.step).toBe("summary");
    expect(state.supporter.step).toBe("summary");
  });

  it("keeps the two frequency answers independent", () => {
    const state = completeSupporter(completeSupportedPerson(started()));

    expect(state.supportedPerson.frequency).toBe("every_day");
    expect(state.supporter.frequency).toBe("few_times_a_week");
  });

  it("preserves answers when Back moves through the logical sequence", () => {
    let state = completeSupporter(completeSupportedPerson(started()));
    state = run(state, { type: "back" });

    expect(state.step).toBe("supporter_intake");
    expect(state.supporter.step).toBe("summary");
    expect(state.supportedPerson.difficulties).toEqual(["washing_or_dressing"]);
    expect(state.supporter.impact).toEqual(["harder_to_manage"]);
  });

  it("can reset one side without changing the other side", () => {
    const complete = completeSupporter(completeSupportedPerson(started()));
    const state = run(complete, {
      type: "supported_person_event",
      event: { type: "reset" },
    });

    expect(state.supportedPerson.difficulties).toEqual([]);
    expect(state.supportedPerson.frequency).toBeUndefined();
    expect(state.supporter.helpProvided).toEqual(["shopping_household"]);
    expect(state.supporter.frequency).toBe("few_times_a_week");
  });

  it("can edit the supported-person frequency without changing supporter answers", () => {
    let state = completeSupporter(completeSupportedPerson(started()));
    state = run(
      state,
      { type: "supported_person_event", event: { type: "back" } },
      {
        type: "supported_person_event",
        event: { type: "choose_frequency", frequencyId: "occasionally" },
      },
      { type: "supported_person_event", event: { type: "continue" } },
    );

    expect(state.supportedPerson.frequency).toBe("occasionally");
    expect(state.supporter.frequency).toBe("few_times_a_week");
    expect(state.supporter.impact).toEqual(["harder_to_manage"]);
  });

  it("can edit the supporter impact without changing supported-person answers", () => {
    let state = completeSupporter(completeSupportedPerson(started()));
    state = run(
      state,
      { type: "supporter_event", event: { type: "back" } },
      {
        type: "supporter_event",
        event: { type: "toggle_impact", impactId: "harder_to_manage" },
      },
      {
        type: "supporter_event",
        event: { type: "toggle_impact", impactId: "sleep" },
      },
      { type: "supporter_event", event: { type: "continue" } },
    );

    expect(state.supporter.impact).toEqual(["sleep"]);
    expect(state.supportedPerson.difficulties).toEqual(["washing_or_dressing"]);
    expect(state.supportedPerson.frequency).toBe("every_day");
  });

  it("reset_all clears both sides and their chosen order", () => {
    const state = run(
      completeSupporter(completeSupportedPerson(started())),
      { type: "reset_all" },
    );

    expect(state.step).toBe("orientation");
    expect(state.order).toBeUndefined();
    expect(state.supportedPerson.difficulties).toEqual([]);
    expect(state.supporter.helpProvided).toEqual([]);
  });

  it("return_to_original clears both sides", () => {
    const state = run(
      completeSupporter(completeSupportedPerson(started())),
      { type: "return_to_original" },
    );

    expect(state.step).toBe("orientation");
    expect(state.supportedPerson.difficulties).toEqual([]);
    expect(state.supporter.impact).toEqual([]);
  });
});

describe("the combined summary", () => {
  const summary = () =>
    buildBothPeoplePreparationSummary(
      completeSupporter(completeSupportedPerson(started())),
    );

  it("keeps the two summaries in separately labelled sections", () => {
    const result = summary();

    expect(result.heading).toBe("Your preparation summary");
    expect(result.supportedPersonHeading).toBe("Support needed by Dad");
    expect(result.supporterHeading).toBe("How supporting Dad affects you");
    expect(result.supportedPerson.difficulties).toEqual(["Washing or dressing"]);
    expect(result.supporter.impact).toEqual(["It is becoming harder to manage"]);
  });

  it("uses the three exact decision-boundary statements", () => {
    const result = summary();

    expect(result.separationStatement).toBe(
      "These are two separate preparation summaries. AdminAvenger has not merged them into one assessment or decided what support either person should receive.",
    );
    expect(result.decisionStatement).toBe(
      "AdminAvenger has not decided whether anyone has a formal caring role, whether anyone qualifies for support, or what any organisation will decide.",
    );
    expect(result.walesStatement).toBe(
      "This can help you prepare before speaking to your local council or another support service in Wales.",
    );
  });

  it("copies both sections and all three boundaries together", () => {
    const result = summary();
    const text = bothPeoplePreparationSummaryText(result);

    expect(text).toContain(result.supportedPersonHeading);
    expect(text).toContain(result.supporterHeading);
    expect(text).toContain(result.separationStatement);
    expect(text).toContain(result.decisionStatement);
    expect(text).toContain(result.walesStatement);
  });

  it("does not diagnose, state legal rights or conclude Carer's Allowance", () => {
    const text = bothPeoplePreparationSummaryText(summary());

    expect(text).not.toMatch(/diagnos|legal right|entitled|entitlement/i);
    expect(text).not.toContain("Carer's Allowance");
  });

  it("represents every prohibited side effect as literal false", () => {
    const state = completeSupporter(completeSupportedPerson(started()));

    expect(state).toMatchObject({
      caseCreated: false,
      savedAutomatically: false,
      contactMade: false,
      specialistRouteOpened: false,
      estateRouteOpened: false,
    });
  });
});
