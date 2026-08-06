// Wales Supporter Needs Intake v1.
//
// This optional preparation flow is only about the person providing support.
// It records what they do, how often they do it, and how supporting somebody
// else affects their own life. It never turns the supported person's needs
// into the supporter's needs and never makes an assessment or decision.

import { ORDINARY_MESSAGE_CHECK_LABEL } from "../ordinaryMessageCheck";

export type SupporterNeedsIntakeStep =
  | "orientation"
  | "help_provided"
  | "frequency"
  | "impact"
  | "summary";

export type HelpProvidedId =
  | "washing_dressing"
  | "food_eating"
  | "medication"
  | "moving_around"
  | "shopping_household"
  | "appointments_transport"
  | "letters_forms_calls"
  | "company"
  | "nearby_for_safety"
  | "night_help"
  | "something_else"
  | "not_sure";

export type SupportFrequencyId =
  | "most_of_the_time"
  | "several_times_a_day"
  | "every_day"
  | "few_times_a_week"
  | "occasionally"
  | "varies"
  | "not_sure";

export type SupportImpactId =
  | "tired_exhausted"
  | "sleep"
  | "physical_health"
  | "mental_wellbeing"
  | "work_education"
  | "money_household_costs"
  | "less_time_for_self"
  | "difficult_to_leave"
  | "worried_about_next"
  | "harder_to_manage"
  | "something_else"
  | "not_sure";

export type SupporterIntakeOption<Id extends string> = {
  readonly id: Id;
  readonly label: string;
};

export const HELP_PROVIDED_OPTIONS: readonly SupporterIntakeOption<HelpProvidedId>[] = [
  { id: "washing_dressing", label: "Washing or dressing" },
  { id: "food_eating", label: "Preparing food or helping them eat" },
  { id: "medication", label: "Medication" },
  { id: "moving_around", label: "Moving around" },
  { id: "shopping_household", label: "Shopping or household tasks" },
  { id: "appointments_transport", label: "Appointments or transport" },
  { id: "letters_forms_calls", label: "Managing letters, forms or phone calls" },
  { id: "company", label: "Keeping them company" },
  { id: "nearby_for_safety", label: "Staying nearby so they are safe" },
  { id: "night_help", label: "Helping during the night" },
  { id: "something_else", label: "Something else" },
  { id: "not_sure", label: "I'm not sure" },
];

export const SUPPORT_FREQUENCY_OPTIONS: readonly SupporterIntakeOption<SupportFrequencyId>[] = [
  { id: "most_of_the_time", label: "Most of the time" },
  { id: "several_times_a_day", label: "Several times a day" },
  { id: "every_day", label: "Every day" },
  { id: "few_times_a_week", label: "A few times a week" },
  { id: "occasionally", label: "Occasionally" },
  { id: "varies", label: "It varies" },
  { id: "not_sure", label: "I'm not sure" },
];

export const IMPACT_OPTIONS: readonly SupporterIntakeOption<SupportImpactId>[] = [
  { id: "tired_exhausted", label: "I feel tired or exhausted" },
  { id: "sleep", label: "It affects my sleep" },
  { id: "physical_health", label: "It affects my physical health" },
  { id: "mental_wellbeing", label: "It affects my mental wellbeing" },
  { id: "work_education", label: "It affects work or education" },
  { id: "money_household_costs", label: "It affects money or household costs" },
  { id: "less_time_for_self", label: "I have less time for myself" },
  { id: "difficult_to_leave", label: "I find it difficult to leave them" },
  { id: "worried_about_next", label: "I feel worried about what will happen next" },
  { id: "harder_to_manage", label: "It is becoming harder to manage" },
  { id: "something_else", label: "Something else" },
  { id: "not_sure", label: "I'm not sure" },
];

export const SUPPORTER_NEEDS_INTAKE_COPY = {
  offerLabel: "Prepare how supporting them affects you",
  helpHeading: "What help do you provide?",
  helpInstruction:
    "Choose the things you regularly help with. You can choose more than one.",
  frequencyHeading: "How often do you provide this help?",
  impactHeading: "How does supporting them affect you?",
  impactInstruction:
    "Choose the things that are most difficult for you. You can choose more than one.",
  summaryHeading: "Your preparation summary",
  continueLabel: "Continue",
  backLabel: "Back",
  returnLabel: ORDINARY_MESSAGE_CHECK_LABEL,
  incompleteStatement:
    "Some questions were left blank. That is fine, and you can go back and add to this at any time.",
} as const;

export type SupporterNeedsIntakeState = {
  readonly step: SupporterNeedsIntakeStep;
  readonly personLabel: string | undefined;
  readonly originalInput: string;
  readonly helpProvided: readonly HelpProvidedId[];
  readonly frequency: SupportFrequencyId | undefined;
  readonly impact: readonly SupportImpactId[];
  readonly caseCreated: false;
  readonly savedAutomatically: false;
  readonly specialistRouteOpened: false;
  readonly estateRouteOpened: false;
  readonly contactMade: false;
};

export type SupporterNeedsIntakeAction =
  | { readonly type: "continue" }
  | { readonly type: "toggle_help"; readonly helpId: HelpProvidedId }
  | { readonly type: "choose_frequency"; readonly frequencyId: SupportFrequencyId }
  | { readonly type: "toggle_impact"; readonly impactId: SupportImpactId }
  | { readonly type: "back" }
  | { readonly type: "return_to_original" }
  | { readonly type: "reset" };

const PROHIBITIONS = {
  caseCreated: false,
  savedAutomatically: false,
  specialistRouteOpened: false,
  estateRouteOpened: false,
  contactMade: false,
} as const;

export const initialSupporterNeedsIntakeState: SupporterNeedsIntakeState = {
  ...PROHIBITIONS,
  step: "orientation",
  personLabel: undefined,
  originalInput: "",
  helpProvided: [],
  frequency: undefined,
  impact: [],
};

const STEP_ORDER: readonly SupporterNeedsIntakeStep[] = [
  "orientation",
  "help_provided",
  "frequency",
  "impact",
  "summary",
];

const stepAfter = (step: SupporterNeedsIntakeStep): SupporterNeedsIntakeStep =>
  STEP_ORDER[Math.min(STEP_ORDER.indexOf(step) + 1, STEP_ORDER.length - 1)];

const stepBefore = (step: SupporterNeedsIntakeStep): SupporterNeedsIntakeStep =>
  STEP_ORDER[Math.max(STEP_ORDER.indexOf(step) - 1, 0)];

export const canContinueSupporterNeedsIntake = (
  state: SupporterNeedsIntakeState,
): boolean => {
  if (state.step === "help_provided") return state.helpProvided.length > 0;
  if (state.step === "frequency") return state.frequency !== undefined;
  if (state.step === "impact") return state.impact.length > 0;
  return true;
};

const selectedInDisplayOrder = <Id extends string>(
  options: readonly SupporterIntakeOption<Id>[],
  selected: readonly Id[],
): readonly Id[] =>
  options.filter((option) => selected.includes(option.id)).map((option) => option.id);

const toggleInDisplayOrder = <Id extends string>(
  options: readonly SupporterIntakeOption<Id>[],
  selected: readonly Id[],
  id: Id,
): readonly Id[] =>
  selectedInDisplayOrder(
    options,
    selected.includes(id)
      ? selected.filter((selectedId) => selectedId !== id)
      : [...selected, id],
  );

const resetAnswers = (
  state: SupporterNeedsIntakeState,
): SupporterNeedsIntakeState => ({
  ...initialSupporterNeedsIntakeState,
  personLabel: state.personLabel,
  originalInput: state.originalInput,
});

export const supporterNeedsIntakeReducer = (
  state: SupporterNeedsIntakeState,
  action: SupporterNeedsIntakeAction,
): SupporterNeedsIntakeState => {
  switch (action.type) {
    case "continue":
      return canContinueSupporterNeedsIntake(state)
        ? { ...state, step: stepAfter(state.step) }
        : state;
    case "back":
      return { ...state, step: stepBefore(state.step) };
    case "toggle_help":
      if (state.step !== "help_provided") return state;
      return {
        ...state,
        helpProvided: toggleInDisplayOrder(
          HELP_PROVIDED_OPTIONS,
          state.helpProvided,
          action.helpId,
        ),
      };
    case "choose_frequency":
      if (state.step !== "frequency") return state;
      return { ...state, frequency: action.frequencyId };
    case "toggle_impact":
      if (state.step !== "impact") return state;
      return {
        ...state,
        impact: toggleInDisplayOrder(
          IMPACT_OPTIONS,
          state.impact,
          action.impactId,
        ),
      };
    case "return_to_original":
    case "reset":
      return resetAnswers(state);
    default:
      return state;
  }
};

export type SupporterNeedsIntakeSummary = {
  readonly heading: string;
  readonly whoHeading: string;
  readonly who: string;
  readonly helpHeading: string;
  readonly helpProvided: readonly string[];
  readonly frequencyHeading: string;
  readonly frequency: string | undefined;
  readonly impactHeading: string;
  readonly impact: readonly string[];
  readonly nothingChosenStatement: string | undefined;
  readonly limitsStatement: string;
  readonly walesStatement: string;
};

const LIMITS_STATEMENT =
  "This is a preparation summary only. AdminAvenger has not decided whether you have a formal caring role, whether you qualify for support, or what any organisation will decide.";

const WALES_STATEMENT =
  "This can help you prepare before speaking to your local council or another support service in Wales.";

const labelFor = <Id extends string>(
  options: readonly SupporterIntakeOption<Id>[],
  id: Id | undefined,
): string | undefined => options.find((option) => option.id === id)?.label;

const labelsFor = <Id extends string>(
  options: readonly SupporterIntakeOption<Id>[],
  ids: readonly Id[],
): readonly string[] =>
  ids
    .map((id) => labelFor(options, id))
    .filter((label): label is string => label !== undefined);

export const buildSupporterNeedsIntakeSummary = (
  state: SupporterNeedsIntakeState,
): SupporterNeedsIntakeSummary => {
  const helpProvided = labelsFor(HELP_PROVIDED_OPTIONS, state.helpProvided);
  const frequency = labelFor(SUPPORT_FREQUENCY_OPTIONS, state.frequency);
  const impact = labelsFor(IMPACT_OPTIONS, state.impact);
  const incomplete =
    helpProvided.length === 0 || frequency === undefined || impact.length === 0;

  return {
    heading: SUPPORTER_NEEDS_INTAKE_COPY.summaryHeading,
    whoHeading: "Who you support",
    who: state.personLabel
      ? `Your ${state.personLabel}`
      : "The person you support",
    helpHeading: "Help you provide",
    helpProvided,
    frequencyHeading: "How often",
    frequency,
    impactHeading: "How it affects you",
    impact,
    nothingChosenStatement: incomplete
      ? SUPPORTER_NEEDS_INTAKE_COPY.incompleteStatement
      : undefined,
    limitsStatement: LIMITS_STATEMENT,
    walesStatement: WALES_STATEMENT,
  };
};

const addList = (lines: string[], heading: string, items: readonly string[]) => {
  lines.push(`${heading}:`);
  if (items.length === 0) {
    lines.push("Not chosen yet");
  } else {
    lines.push(...items);
  }
};

export const supporterNeedsIntakeSummaryText = (
  summary: SupporterNeedsIntakeSummary,
): string => {
  const lines = [
    summary.heading,
    "",
    summary.whoHeading,
    summary.who,
    "",
  ];

  addList(lines, summary.helpHeading, summary.helpProvided);
  lines.push(
    "",
    `${summary.frequencyHeading}: ${summary.frequency ?? "Not chosen yet"}`,
    "",
  );
  addList(lines, summary.impactHeading, summary.impact);
  lines.push("", summary.limitsStatement, "", summary.walesStatement);

  return lines.join("\n");
};
