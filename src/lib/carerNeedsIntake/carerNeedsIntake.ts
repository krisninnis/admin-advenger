// Wales-first Carer Support Needs Intake v1.
//
// One optional flow, offered only after somebody has reached an orientation
// result about help for one other person. It asks three questions and shows the
// answers back as a short preparation summary.
//
// What it is for: somebody about to speak to a council, an adviser, a health
// professional or a support service, who knows the situation perfectly well but
// has never had to describe it in the order somebody else needs to hear it.
// Writing it down in advance is the whole of the benefit.
//
// What it is not: an assessment. It does not score, weigh, rank or total
// anything. Three difficulties chosen instead of one means three difficulties
// were chosen, and nothing more. "Every day" is a description of a week, not a
// threshold that has been crossed. The moment frequency becomes a number that
// decides something, this stops being preparation and starts being a judgement
// AdminAvenger is not entitled to make, about a person it has never met.
//
// So the prohibitions are carried on the state itself and typed as the literal
// `false`: no case, no automatic save, no specialist journey, no Estate route,
// no contact with anyone. They are unrepresentable rather than merely tested.
//
// Wales-first, and only Wales. Under the Social Services and Well-being (Wales)
// Act 2014 an unpaid carer has rights of their own, separate from the rights of
// the person they care for. This module does not mention that Act, does not
// state those rights, and does not tell anybody they have them, because saying
// so would be legal advice. It says one thing about Wales: that writing this
// down may help before speaking to a local council or another support service
// there. The statute is why the two people are kept separate. It is not
// something to quote at somebody.

/** The one flow, one step at a time. */
export type CarerNeedsIntakeStep =
  | "orientation"
  | "difficulties"
  | "change"
  | "frequency"
  | "summary";

export type DifficultyId =
  | "washing_or_dressing"
  | "bed_or_chair"
  | "food"
  | "toilet"
  | "medication"
  | "moving_indoors"
  | "leaving_home"
  | "remembering"
  | "staying_safe"
  | "something_else"
  | "not_sure";

export type ChangeId =
  | "new"
  | "more_difficult"
  | "about_the_same"
  | "day_to_day"
  | "not_sure";

export type FrequencyId =
  | "most_of_the_time"
  | "several_times_a_day"
  | "every_day"
  | "few_times_a_week"
  | "occasionally"
  | "varies"
  | "not_sure";

export type IntakeOption<Id extends string> = {
  readonly id: Id;
  readonly label: string;
};

/**
 * Day-to-day difficulties, in plain English.
 *
 * Every one of these describes a thing that happens in a day, not a condition
 * and not a person. "Getting in or out of bed or a chair" is something anybody
 * can picture and answer. "Reduced mobility" is a category somebody else has
 * put a person into, and it is not this product's to apply.
 */
export const DIFFICULTY_OPTIONS: readonly IntakeOption<DifficultyId>[] = [
  { id: "washing_or_dressing", label: "Washing or dressing" },
  { id: "bed_or_chair", label: "Getting in or out of bed or a chair" },
  { id: "food", label: "Preparing or eating food" },
  { id: "toilet", label: "Using the toilet" },
  { id: "medication", label: "Taking medication safely" },
  { id: "moving_indoors", label: "Moving around indoors" },
  { id: "leaving_home", label: "Getting out of the home" },
  { id: "remembering", label: "Remembering or understanding things" },
  { id: "staying_safe", label: "Staying safe without someone nearby" },
  { id: "something_else", label: "Something else" },
  { id: "not_sure", label: "I'm not sure" },
];

export const CHANGE_OPTIONS: readonly IntakeOption<ChangeId>[] = [
  { id: "new", label: "This is new" },
  { id: "more_difficult", label: "It has become more difficult" },
  { id: "about_the_same", label: "It has stayed about the same" },
  { id: "day_to_day", label: "It changes from day to day" },
  { id: "not_sure", label: "I'm not sure" },
];

export const FREQUENCY_OPTIONS: readonly IntakeOption<FrequencyId>[] = [
  { id: "most_of_the_time", label: "Most of the time" },
  { id: "several_times_a_day", label: "Several times a day" },
  { id: "every_day", label: "Every day" },
  { id: "few_times_a_week", label: "A few times a week" },
  { id: "occasionally", label: "Occasionally" },
  { id: "varies", label: "It varies" },
  { id: "not_sure", label: "I'm not sure" },
];

/** Headings and instructions, kept here so they can be asserted. */
export const NEEDS_INTAKE_COPY = {
  offerLabel: "Prepare what is difficult day to day",
  difficultiesHeading: "What is difficult day to day?",
  difficultiesInstruction:
    "Choose the things that are causing the most difficulty. You can choose more than one.",
  changeHeading: "What has changed?",
  frequencyHeading: "How often is help needed?",
  summaryHeading: "Your preparation summary",
  continueLabel: "Continue",
  backLabel: "Back",
  returnLabel: "Return to the original message",
} as const;

export type CarerNeedsIntakeState = {
  readonly step: CarerNeedsIntakeStep;
  /** The person's own word for who this is about, where the source gave one. */
  readonly personLabel: string | undefined;
  /** What was originally typed, preserved unaltered. */
  readonly originalInput: string;
  readonly difficulties: readonly DifficultyId[];
  readonly change: ChangeId | undefined;
  readonly frequency: FrequencyId | undefined;
  /** Typed as the literal `false`, so the prohibitions cannot be represented. */
  readonly caseCreated: false;
  readonly savedAutomatically: false;
  readonly specialistRouteOpened: false;
  readonly estateRouteOpened: false;
  readonly contactMade: false;
};

export type CarerNeedsIntakeAction =
  | { readonly type: "continue" }
  | { readonly type: "toggle_difficulty"; readonly difficultyId: DifficultyId }
  | { readonly type: "choose_change"; readonly changeId: ChangeId }
  | { readonly type: "choose_frequency"; readonly frequencyId: FrequencyId }
  | { readonly type: "back" }
  | { readonly type: "return_to_original" }
  /** The situation behind this intake changed, so the answers are stale. */
  | { readonly type: "reset" };

const PROHIBITIONS = {
  caseCreated: false,
  savedAutomatically: false,
  specialistRouteOpened: false,
  estateRouteOpened: false,
  contactMade: false,
} as const;

export const initialCarerNeedsIntakeState: CarerNeedsIntakeState = {
  ...PROHIBITIONS,
  step: "orientation",
  personLabel: undefined,
  originalInput: "",
  difficulties: [],
  change: undefined,
  frequency: undefined,
};

/** The order, stated once. Forward and back both read it. */
const STEP_ORDER: readonly CarerNeedsIntakeStep[] = [
  "orientation",
  "difficulties",
  "change",
  "frequency",
  "summary",
];

const stepAfter = (step: CarerNeedsIntakeStep): CarerNeedsIntakeStep =>
  STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)];

const stepBefore = (step: CarerNeedsIntakeStep): CarerNeedsIntakeStep =>
  STEP_ORDER[Math.max(STEP_ORDER.indexOf(step) - 1, 0)];

export const canContinueCarerNeedsIntake = (
  state: CarerNeedsIntakeState,
): boolean => {
  if (state.step === "difficulties") return state.difficulties.length > 0;
  if (state.step === "change") return state.change !== undefined;
  if (state.step === "frequency") return state.frequency !== undefined;
  return true;
};

/**
 * Selected difficulties, always in the order they are shown on screen.
 *
 * Not the order they were clicked. The summary a person reads out to somebody
 * else should match the list they just worked down, or they will lose their
 * place in it.
 */
const inDisplayOrder = (
  selected: readonly DifficultyId[],
): readonly DifficultyId[] =>
  DIFFICULTY_OPTIONS.filter((option) => selected.includes(option.id)).map(
    (option) => option.id,
  );

export const carerNeedsIntakeReducer = (
  state: CarerNeedsIntakeState,
  action: CarerNeedsIntakeAction,
): CarerNeedsIntakeState => {
  switch (action.type) {
    case "continue":
      return canContinueCarerNeedsIntake(state)
        ? { ...state, step: stepAfter(state.step) }
        : state;

    case "back":
      return { ...state, step: stepBefore(state.step) };

    // An answer only counts while its own question is showing. Nothing else can
    // reach in and set one.
    case "toggle_difficulty": {
      if (state.step !== "difficulties") return state;
      const alreadyChosen = state.difficulties.includes(action.difficultyId);
      const next = alreadyChosen
        ? state.difficulties.filter((id) => id !== action.difficultyId)
        : [...state.difficulties, action.difficultyId];
      return { ...state, difficulties: inDisplayOrder(next) };
    }

    case "choose_change":
      if (state.step !== "change") return state;
      return { ...state, change: action.changeId };

    case "choose_frequency":
      if (state.step !== "frequency") return state;
      return { ...state, frequency: action.frequencyId };

    // Leaving for the original message ends the intake. The answers go with it,
    // because a half-finished picture of somebody's day is not something to keep
    // lying around waiting to be reattached to a different situation.
    case "return_to_original":
    case "reset":
      return {
        ...initialCarerNeedsIntakeState,
        personLabel: state.personLabel,
        originalInput: state.originalInput,
      };

    default:
      return state;
  }
};

// --- Summary -----------------------------------------------------------------

export type NeedsIntakeSummary = {
  readonly heading: string;
  readonly personLabel: string | undefined;
  /** "What your sister finds difficult", or a neutral line when unnamed. */
  readonly aboutLine: string;
  readonly difficultiesHeading: string;
  readonly difficulties: readonly string[];
  readonly changeHeading: string;
  readonly change: string | undefined;
  readonly frequencyHeading: string;
  readonly frequency: string | undefined;
  /** Present only where a question was left unanswered. */
  readonly nothingChosenStatement: string | undefined;
  readonly limitsStatement: string;
  readonly walesStatement: string;
};

const LIMITS_STATEMENT =
  "This is a preparation summary only. AdminAvenger has not assessed needs, eligibility or what any organisation will decide.";

// Wales, framed as preparation. Never as a duty owed, a right held, or a
// decision somebody else has already made.
const WALES_STATEMENT =
  "This can help you prepare before speaking to your local council or another support service in Wales.";

const NOTHING_CHOSEN_STATEMENT =
  "Some questions were left blank. That is fine, and you can go back and add to this at any time.";

const labelFor = <Id extends string>(
  options: readonly IntakeOption<Id>[],
  id: Id | undefined,
): string | undefined => options.find((option) => option.id === id)?.label;

export const buildNeedsIntakeSummary = (
  state: CarerNeedsIntakeState,
): NeedsIntakeSummary => {
  const difficulties = state.difficulties
    .map((id) => labelFor(DIFFICULTY_OPTIONS, id))
    .filter((label): label is string => Boolean(label));
  const change = labelFor(CHANGE_OPTIONS, state.change);
  const frequency = labelFor(FREQUENCY_OPTIONS, state.frequency);
  const anythingMissing =
    difficulties.length === 0 || change === undefined || frequency === undefined;

  return {
    heading: NEEDS_INTAKE_COPY.summaryHeading,
    personLabel: state.personLabel,
    aboutLine: state.personLabel
      ? `What your ${state.personLabel} finds difficult day to day`
      : "What the person you mentioned finds difficult day to day",
    difficultiesHeading: "Difficult day to day",
    difficulties,
    changeHeading: "What has changed",
    change,
    frequencyHeading: "How often help is needed",
    frequency,
    nothingChosenStatement: anythingMissing ? NOTHING_CHOSEN_STATEMENT : undefined,
    limitsStatement: LIMITS_STATEMENT,
    walesStatement: WALES_STATEMENT,
  };
};

/**
 * The summary as plain text, for the person to take away.
 *
 * The limits travel with it. A summary pasted into an email without them is a
 * list of somebody's difficulties with an implied verdict attached, and the
 * verdict is the part AdminAvenger did not make.
 */
export const needsIntakeSummaryText = (summary: NeedsIntakeSummary): string => {
  const lines: string[] = [summary.heading, "", summary.aboutLine, ""];

  lines.push(`${summary.difficultiesHeading}:`);
  if (summary.difficulties.length === 0) {
    lines.push("Not chosen yet");
  } else {
    for (const difficulty of summary.difficulties) lines.push(difficulty);
  }

  lines.push("", `${summary.changeHeading}: ${summary.change ?? "Not chosen yet"}`);
  lines.push(`${summary.frequencyHeading}: ${summary.frequency ?? "Not chosen yet"}`);
  lines.push("", summary.limitsStatement);

  return lines.join("\n");
};
