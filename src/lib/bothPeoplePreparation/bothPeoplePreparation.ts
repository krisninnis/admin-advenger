import {
  buildNeedsIntakeSummary,
  carerNeedsIntakeReducer,
  initialCarerNeedsIntakeState,
  needsIntakeSummaryText,
  type CarerNeedsIntakeAction,
  type CarerNeedsIntakeState,
  type NeedsIntakeSummary,
} from "../carerNeedsIntake/carerNeedsIntake";
import {
  buildSupporterNeedsIntakeSummary,
  initialSupporterNeedsIntakeState,
  supporterNeedsIntakeReducer,
  supporterNeedsIntakeSummaryText,
  type SupporterNeedsIntakeAction,
  type SupporterNeedsIntakeState,
  type SupporterNeedsIntakeSummary,
} from "../supporterNeedsIntake/supporterNeedsIntake";

export type BothPeoplePreparationStep =
  | "orientation"
  | "choose_first"
  | "supported_person_intake"
  | "supporter_intake"
  | "combined_summary";

export type BothPeopleSide = "supported_person" | "supporter";
export type BothPeopleFirstSideChoice = BothPeopleSide | "not_sure";

export const BOTH_PEOPLE_PREPARATION_COPY = {
  steps: [
    "orientation",
    "choose_first",
    "supported_person_intake",
    "supporter_intake",
    "combined_summary",
  ] as const,
  offerLabel: "Prepare both sides separately",
  chooseFirstHeading: "Which side would you like to prepare first?",
  chooseFirstOptions: [
    { id: "supported_person", label: "The other person's needs" },
    { id: "supporter", label: "How supporting them affects me" },
    { id: "not_sure", label: "I'm not sure" },
  ] as const,
  chooseFirstMissing: "Choose a side before continuing. You can choose I'm not sure.",
  continueLabel: "Continue",
  backLabel: "Back",
  returnLabel: "Return to the original message",
  summaryHeading: "Your preparation summary",
} as const;

export type BothPeoplePreparationState = {
  readonly step: BothPeoplePreparationStep;
  readonly personLabel: string;
  readonly originalInput: string;
  readonly firstSideChoice: BothPeopleFirstSideChoice | undefined;
  readonly order: readonly [BothPeopleSide, BothPeopleSide] | undefined;
  readonly chooseFirstAttempted: boolean;
  readonly supportedPerson: CarerNeedsIntakeState;
  readonly supporter: SupporterNeedsIntakeState;
  readonly caseCreated: false;
  readonly savedAutomatically: false;
  readonly specialistRouteOpened: false;
  readonly estateRouteOpened: false;
  readonly contactMade: false;
};

export type BothPeoplePreparationAction =
  | { readonly type: "continue" }
  | {
      readonly type: "choose_first_side";
      readonly side: BothPeopleFirstSideChoice;
    }
  | {
      readonly type: "supported_person_event";
      readonly event: CarerNeedsIntakeAction;
    }
  | {
      readonly type: "supporter_event";
      readonly event: SupporterNeedsIntakeAction;
    }
  | { readonly type: "back" }
  | { readonly type: "return_to_original" }
  | { readonly type: "reset_all" };

const PROHIBITIONS = {
  caseCreated: false,
  savedAutomatically: false,
  specialistRouteOpened: false,
  estateRouteOpened: false,
  contactMade: false,
} as const;

export const createBothPeoplePreparationState = (
  personLabel: string,
  originalInput: string,
): BothPeoplePreparationState => ({
  ...PROHIBITIONS,
  step: "orientation",
  personLabel,
  originalInput,
  firstSideChoice: undefined,
  order: undefined,
  chooseFirstAttempted: false,
  supportedPerson: {
    ...initialCarerNeedsIntakeState,
    personLabel,
    originalInput,
  },
  supporter: {
    ...initialSupporterNeedsIntakeState,
    personLabel,
    originalInput,
  },
});

const orderFor = (
  choice: BothPeopleFirstSideChoice,
): readonly [BothPeopleSide, BothPeopleSide] =>
  choice === "supporter"
    ? ["supporter", "supported_person"]
    : ["supported_person", "supporter"];

const stepFor = (side: BothPeopleSide): BothPeoplePreparationStep =>
  side === "supported_person" ? "supported_person_intake" : "supporter_intake";

const currentSide = (
  step: BothPeoplePreparationStep,
): BothPeopleSide | undefined => {
  if (step === "supported_person_intake") return "supported_person";
  if (step === "supporter_intake") return "supporter";
  return undefined;
};

const nestedStep = (
  state: BothPeoplePreparationState,
  side: BothPeopleSide,
): CarerNeedsIntakeState["step"] | SupporterNeedsIntakeState["step"] =>
  side === "supported_person"
    ? state.supportedPerson.step
    : state.supporter.step;

const firstQuestionStep = (side: BothPeopleSide): string =>
  side === "supported_person" ? "difficulties" : "help_provided";

const startSide = (
  state: BothPeoplePreparationState,
  side: BothPeopleSide,
): BothPeoplePreparationState => {
  if (side === "supported_person") {
    return {
      ...state,
      step: "supported_person_intake",
      supportedPerson:
        state.supportedPerson.step === "orientation"
          ? carerNeedsIntakeReducer(state.supportedPerson, { type: "continue" })
          : state.supportedPerson,
    };
  }

  return {
    ...state,
    step: "supporter_intake",
    supporter:
      state.supporter.step === "orientation"
        ? supporterNeedsIntakeReducer(state.supporter, { type: "continue" })
        : state.supporter,
  };
};

const moveAfterCompletedSide = (
  state: BothPeoplePreparationState,
  side: BothPeopleSide,
): BothPeoplePreparationState => {
  const order = state.order;
  if (!order) return state;
  if (side === order[0]) return startSide(state, order[1]);
  return { ...state, step: "combined_summary" };
};

const applySupportedPersonEvent = (
  state: BothPeoplePreparationState,
  event: CarerNeedsIntakeAction,
): BothPeoplePreparationState => {
  const supportedPerson = carerNeedsIntakeReducer(state.supportedPerson, event);
  const updated = { ...state, supportedPerson };

  return state.step === "supported_person_intake" &&
    event.type === "continue" &&
    supportedPerson.step === "summary"
    ? moveAfterCompletedSide(updated, "supported_person")
    : updated;
};

const applySupporterEvent = (
  state: BothPeoplePreparationState,
  event: SupporterNeedsIntakeAction,
): BothPeoplePreparationState => {
  const supporter = supporterNeedsIntakeReducer(state.supporter, event);
  const updated = { ...state, supporter };

  return state.step === "supporter_intake" &&
    event.type === "continue" &&
    supporter.step === "summary"
    ? moveAfterCompletedSide(updated, "supporter")
    : updated;
};

const goBack = (state: BothPeoplePreparationState): BothPeoplePreparationState => {
  if (state.step === "orientation") return state;
  if (state.step === "choose_first") {
    return { ...state, step: "orientation", chooseFirstAttempted: false };
  }

  if (state.step === "combined_summary") {
    const secondSide = state.order?.[1];
    return secondSide ? { ...state, step: stepFor(secondSide) } : state;
  }

  const side = currentSide(state.step);
  const order = state.order;
  if (!side || !order) return state;

  if (nestedStep(state, side) === firstQuestionStep(side)) {
    return side === order[0]
      ? { ...state, step: "choose_first" }
      : { ...state, step: stepFor(order[0]) };
  }

  return side === "supported_person"
    ? applySupportedPersonEvent(state, { type: "back" })
    : applySupporterEvent(state, { type: "back" });
};

export const bothPeoplePreparationReducer = (
  state: BothPeoplePreparationState,
  action: BothPeoplePreparationAction,
): BothPeoplePreparationState => {
  switch (action.type) {
    case "continue":
      if (state.step === "orientation") {
        return { ...state, step: "choose_first" };
      }
      if (state.step === "choose_first") {
        if (!state.firstSideChoice) {
          return { ...state, chooseFirstAttempted: true };
        }
        const order = orderFor(state.firstSideChoice);
        return startSide({ ...state, order, chooseFirstAttempted: false }, order[0]);
      }
      if (state.step === "supported_person_intake" && state.supportedPerson.step === "summary") {
        return moveAfterCompletedSide(state, "supported_person");
      }
      if (state.step === "supporter_intake" && state.supporter.step === "summary") {
        return moveAfterCompletedSide(state, "supporter");
      }
      return state;

    case "choose_first_side":
      return state.step === "choose_first"
        ? {
            ...state,
            firstSideChoice: action.side,
            chooseFirstAttempted: false,
          }
        : state;

    case "supported_person_event":
      return applySupportedPersonEvent(state, action.event);

    case "supporter_event":
      return applySupporterEvent(state, action.event);

    case "back":
      return goBack(state);

    case "return_to_original":
    case "reset_all":
      return createBothPeoplePreparationState(state.personLabel, state.originalInput);

    default:
      return state;
  }
};

export type BothPeoplePreparationSummary = {
  readonly heading: string;
  readonly supportedPersonHeading: string;
  readonly supporterHeading: string;
  readonly supportedPerson: NeedsIntakeSummary;
  readonly supporter: SupporterNeedsIntakeSummary;
  readonly separationStatement: string;
  readonly decisionStatement: string;
  readonly walesStatement: string;
};

const SEPARATION_STATEMENT =
  "These are two separate preparation summaries. AdminAvenger has not merged them into one assessment or decided what support either person should receive.";
const DECISION_STATEMENT =
  "AdminAvenger has not decided whether anyone has a formal caring role, whether anyone qualifies for support, or what any organisation will decide.";
const WALES_STATEMENT =
  "This can help you prepare before speaking to your local council or another support service in Wales.";

export const buildBothPeoplePreparationSummary = (
  state: BothPeoplePreparationState,
): BothPeoplePreparationSummary => ({
  heading: BOTH_PEOPLE_PREPARATION_COPY.summaryHeading,
  supportedPersonHeading: `Support needed by ${state.personLabel}`,
  supporterHeading: `How supporting ${state.personLabel} affects you`,
  supportedPerson: buildNeedsIntakeSummary(state.supportedPerson),
  supporter: buildSupporterNeedsIntakeSummary(state.supporter),
  separationStatement: SEPARATION_STATEMENT,
  decisionStatement: DECISION_STATEMENT,
  walesStatement: WALES_STATEMENT,
});

export const bothPeoplePreparationSummaryText = (
  summary: BothPeoplePreparationSummary,
): string =>
  [
    summary.heading,
    "",
    summary.supportedPersonHeading,
    needsIntakeSummaryText(summary.supportedPerson),
    "",
    summary.supporterHeading,
    supporterNeedsIntakeSummaryText(summary.supporter),
    "",
    summary.separationStatement,
    summary.decisionStatement,
    summary.walesStatement,
  ].join("\n");
