// Front-Door Intent Routing v1, UI wiring slice.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md
//
// This module turns a classification into the one thing the front door should
// show next. It is pure, synchronous and free of React so that every word the
// person reads can be asserted in a test.
//
// It can express exactly three outcomes: continue to the existing document
// journey, show urgent support, or ask one adaptive confirmation question. It
// cannot create a case, open a specialist journey, confirm a help target or
// activate the Estate route. Those four prohibitions are typed as the literal
// `false`, so they are unrepresentable rather than merely tested.

import { classifyFrontDoorIntent } from "./classifyFrontDoorIntent";
import { isSecurityShapedInput } from "./securityShapedInput";
import type {
  FrontDoorInputSnapshot,
  FrontDoorSubmissionSource,
} from "./submissionSource";
import type {
  FrontDoorIntentClassification,
  FrontDoorSituationSignal,
} from "./types";

/** The identity of a confirmation choice. Labels are copy; these are stable. */
export type FrontDoorChoiceId =
  | "other_person"
  | "self_supporting"
  | "self"
  | "both"
  | "urgent"
  | "unsure"
  | "understand_document"
  | "what_next"
  | "about_document"
  | "about_care"
  | "about_money";

export type FrontDoorConfirmationChoice = {
  readonly id: FrontDoorChoiceId;
  readonly label: string;
};

/**
 * Fields common to every view.
 *
 * `backAvailable` and `ordinaryCheckAvailable` are typed `true` because the
 * approved slice requires both exits to exist on every screen: nobody may be
 * trapped in a question they cannot answer.
 */
type FrontDoorRouteCommon = {
  readonly originalInput: string;
  readonly backAvailable: true;
  readonly ordinaryCheckAvailable: true;
  readonly targetConfirmed: false;
  readonly specialistRouteOpened: false;
  readonly caseCreated: false;
  readonly estateRouteOpened: false;
  /** How many questions the person must answer before seeing anything useful. */
  readonly questionsAskedFirst: number;
};

export type FrontDoorRouteView =
  | (FrontDoorRouteCommon & {
      readonly kind: "document_analysis";
      readonly questionsAskedFirst: 0;
    })
  | (FrontDoorRouteCommon & {
      readonly kind: "urgent_support";
      readonly heading: string;
      readonly limitsStatement: string;
      readonly chooseInstruction: string;
      readonly contactOptions: readonly string[];
      /** Always undefined: AdminAvenger presents the options and never picks. */
      readonly selectedContactOption: undefined;
      readonly questionsAskedFirst: 0;
    })
  | (FrontDoorRouteCommon & {
      readonly kind: "confirmation";
      readonly heading: string;
      readonly question: string;
      readonly choices: readonly FrontDoorConfirmationChoice[];
      readonly questionsAskedFirst: 1;
    });

const COMMON = {
  backAvailable: true,
  ordinaryCheckAvailable: true,
  targetConfirmed: false,
  specialistRouteOpened: false,
  caseCreated: false,
  estateRouteOpened: false,
} as const;

/**
 * Signals that mean the wording is about care, support or a practical need.
 * Money and bereavement are handled separately because they change the question.
 */
const CARE_SIGNALS: readonly FrontDoorSituationSignal[] = [
  "possible_person_needing_support",
  "possible_supporter",
  "possible_caring_role",
  "possible_functional_need",
  "possible_hospital_discharge",
  "possible_local_service_need",
];

/**
 * Pronouns are only ever taken from the relationship word the person used. An
 * unrecognised or ungendered word gives "them", which reads correctly and is
 * the safe default. AdminAvenger never infers a gender from a name.
 */
const RELATIONSHIP_PRONOUN: Readonly<Record<string, string>> = {
  father: "him",
  dad: "him",
  daddy: "him",
  grandad: "him",
  granddad: "him",
  grandfather: "him",
  husband: "him",
  brother: "him",
  son: "him",
  uncle: "him",
  mother: "her",
  mum: "her",
  mam: "her",
  mummy: "her",
  nan: "her",
  nana: "her",
  grandmother: "her",
  grandma: "her",
  wife: "her",
  sister: "her",
  daughter: "her",
  aunt: "her",
  auntie: "her",
};

const pronounFor = (label: string): string =>
  RELATIONSHIP_PRONOUN[label.trim().toLowerCase()] ?? "them";

/** "father" becomes "father's"; a label already ending in s takes a bare apostrophe. */
const possessive = (label: string): string =>
  /s$/i.test(label) ? `${label}'` : `${label}'s`;

const has = (
  classification: FrontDoorIntentClassification,
  signal: FrontDoorSituationSignal,
): boolean => classification.signals.includes(signal);

/**
 * Urgency comes either from an urgency signal strong enough to name, or from
 * `possible_urgent_need` in the wording. `unclear_urgency` on its own is not
 * enough: that is a reason to ask a question, not to interrupt with one.
 */
const needsUrgentSupport = (
  classification: FrontDoorIntentClassification,
): boolean =>
  classification.urgency === "possible_immediate_danger" ||
  classification.urgency === "possible_urgent_health_need" ||
  classification.urgency === "possible_urgent_practical_support" ||
  has(classification, "possible_urgent_need");

const documentAnalysisView = (originalInput: string): FrontDoorRouteView => ({
  ...COMMON,
  kind: "document_analysis",
  originalInput,
  questionsAskedFirst: 0,
});

const urgentSupportView = (originalInput: string): FrontDoorRouteView => ({
  ...COMMON,
  kind: "urgent_support",
  originalInput,
  heading: "If someone needs help right now",
  // Approved decision 8. AdminAvenger must not select between these, and must
  // say so plainly rather than implying it has checked anything.
  limitsStatement:
    "AdminAvenger cannot assess a medical situation, decide how urgent it is, or contact any service for you.",
  chooseInstruction: "You know the situation. These are the people who can help.",
  contactOptions: [
    "999, for an emergency",
    "NHS 111 Wales, for urgent health advice",
    "The hospital discharge team, if a discharge is being arranged",
    "Your council's social services, for care and practical support",
  ],
  selectedContactOption: undefined,
  questionsAskedFirst: 0,
});

const personLabelOf = (
  classification: FrontDoorIntentClassification,
): string | undefined => {
  const first = classification.mentionedOtherPeople[0];
  // Verbatim, always. "Dad" never becomes "father", and "MUM" stays "MUM".
  return first ? first.personLabel : undefined;
};

const careChoices = (
  label: string | undefined,
): readonly FrontDoorConfirmationChoice[] => [
  { id: "other_person", label: label ? `My ${label}` : "Someone else" },
  {
    id: "self_supporting",
    label: label
      ? `Me because I support ${pronounFor(label)}`
      : "Me because I support them",
  },
  { id: "both", label: "Both of us" },
  { id: "urgent", label: "Something urgent is happening" },
  { id: "unsure", label: "I'm not sure" },
];

const benefitsChoices = (
  label: string | undefined,
): readonly FrontDoorConfirmationChoice[] => [
  {
    id: "other_person",
    label: label ? `My ${possessive(label)}` : "Someone else's",
  },
  { id: "self", label: "Mine" },
  { id: "both", label: "Both" },
  { id: "unsure", label: "I'm not sure" },
];

const bereavementChoices: readonly FrontDoorConfirmationChoice[] = [
  { id: "understand_document", label: "Understanding a letter or form" },
  { id: "what_next", label: "Knowing what to do next" },
  { id: "urgent", label: "Something urgent is happening" },
  { id: "unsure", label: "I'm not sure" },
];

const generalChoices: readonly FrontDoorConfirmationChoice[] = [
  { id: "about_document", label: "A letter, bill or message" },
  { id: "about_care", label: "Care or support for someone" },
  { id: "about_money", label: "Money or benefits" },
  { id: "urgent", label: "Something urgent is happening" },
  { id: "unsure", label: "I'm not sure" },
];

const confirmationView = (
  classification: FrontDoorIntentClassification,
  originalInput: string,
): FrontDoorRouteView => {
  const label = personLabelOf(classification);
  const base = { ...COMMON, kind: "confirmation", originalInput, questionsAskedFirst: 1 } as const;

  // Bereavement is checked first. When someone has told us a person has died,
  // asking who needs help would be the wrong question in the wrong moment.
  if (has(classification, "possible_bereavement")) {
    return {
      ...base,
      heading: "This may be about what happens after someone dies",
      question: "What would help most?",
      choices: bereavementChoices,
    };
  }

  if (has(classification, "possible_money_or_benefits_need")) {
    return {
      ...base,
      heading: "This may be about benefits",
      question: "Whose benefits are you asking about?",
      choices: benefitsChoices(label),
    };
  }

  if (CARE_SIGNALS.some((signal) => has(classification, signal))) {
    return {
      ...base,
      heading: "This may be about care and support",
      question: "Who needs help?",
      choices: careChoices(label),
    };
  }

  return {
    ...base,
    heading: "Let us check what this is about",
    question: "What is this about?",
    choices: generalChoices,
  };
};

/**
 * The single routing decision of this slice.
 *
 * Document-shaped input is returned untouched so the existing analysis journey,
 * including the security preflight, runs exactly as it did before.
 */
export const deriveFrontDoorRouteView = (
  classification: FrontDoorIntentClassification,
  originalInput: string,
): FrontDoorRouteView => {
  if (classification.documentAnalysisSelected) {
    return documentAnalysisView(originalInput);
  }

  if (needsUrgentSupport(classification)) {
    return urgentSupportView(originalInput);
  }

  return confirmationView(classification, originalInput);
};

/**
 * The true processing order, stated once.
 *
 * 1. Empty input is nothing to route.
 * 2. Security-shaped input goes to the existing analysis journey, so the
 *    security preflight inside it runs and warns the person. This step is
 *    first, and it is checked directly rather than relied upon as a side effect
 *    of the classifier reading scam wording as a document.
 * 3. Front-door classification decides between the document journey, urgent
 *    support and one confirmation question. Urgency is handled inside
 *    `deriveFrontDoorRouteView` above, ahead of every confirmation question.
 *
 * Everything after step 2 is therefore known not to be security shaped, which
 * is what makes "security cannot be diverted into care, benefits, bereavement
 * or general clarification" a property of the code rather than a hope about the
 * wording of the current corpus.
 */
export const resolveFrontDoorRouteView = (
  originalInput: string,
): FrontDoorRouteView => {
  if (!originalInput.trim()) {
    return documentAnalysisView(originalInput);
  }

  if (isSecurityShapedInput(originalInput)) {
    return documentAnalysisView(originalInput);
  }

  return deriveFrontDoorRouteView(
    classifyFrontDoorIntent(originalInput),
    originalInput,
  );
};

export type FrontDoorRouteState = {
  readonly originalInput: string;
  /**
   * The original accepted text together with its source title and source type.
   * Kept so that "just check this as a message" submits what was actually
   * accepted, rather than relabelling every route as pasted text.
   */
  readonly source: FrontDoorSubmissionSource | undefined;
  /**
   * What the input area looked like when this route was decided. A route whose
   * snapshot no longer matches the input area is stale and must not be shown.
   */
  readonly snapshot: FrontDoorInputSnapshot | undefined;
  readonly view: FrontDoorRouteView | undefined;
  readonly selectedChoiceId: FrontDoorChoiceId | undefined;
  /** True once the person has asked for ordinary message checking instead. */
  readonly ordinaryCheckRequested: boolean;
};

export type FrontDoorRouteAction =
  | {
      readonly type: "input_received";
      readonly text: string;
      /** Defaults preserve the original paste-box behaviour for older callers. */
      readonly sourceTitle?: string;
      readonly sourceType?: FrontDoorSubmissionSource["sourceType"];
      readonly snapshot?: FrontDoorInputSnapshot;
    }
  | { readonly type: "choice_selected"; readonly choiceId: FrontDoorChoiceId }
  | { readonly type: "go_back" }
  | { readonly type: "ordinary_check_requested" }
  /** The input the route was decided from has changed, so the route is stale. */
  | { readonly type: "source_changed" }
  | { readonly type: "dismissed" };

export const initialFrontDoorRouteState: FrontDoorRouteState = {
  originalInput: "",
  source: undefined,
  snapshot: undefined,
  view: undefined,
  selectedChoiceId: undefined,
  ordinaryCheckRequested: false,
};

export const frontDoorRouteReducer = (
  state: FrontDoorRouteState,
  action: FrontDoorRouteAction,
): FrontDoorRouteState => {
  switch (action.type) {
    case "input_received": {
      const text = action.text;
      return {
        originalInput: text,
        source: {
          acceptedText: text,
          sourceTitle: action.sourceTitle ?? "Pasted admin text",
          sourceType: action.sourceType ?? "email",
        },
        snapshot: action.snapshot,
        view: resolveFrontDoorRouteView(text),
        selectedChoiceId: undefined,
        ordinaryCheckRequested: false,
      };
    }

    case "choice_selected": {
      if (!state.view) return state;
      // The only choice that changes the screen in this slice is the urgent one.
      // Every other choice is recorded and nothing is opened, because confirming
      // a help target belongs to a later, separately approved slice.
      const view =
        action.choiceId === "urgent"
          ? urgentSupportView(state.originalInput)
          : state.view;
      return { ...state, view, selectedChoiceId: action.choiceId };
    }

    case "go_back": {
      // Back from a selection returns to the question. Back from the question
      // itself leaves front-door routing entirely.
      if (!state.selectedChoiceId) return initialFrontDoorRouteState;
      // Back re-derives from the text this route was decided from, which is
      // untouched by going back. The person returns to the same question about
      // the same words.
      return {
        ...state,
        view: resolveFrontDoorRouteView(state.originalInput),
        selectedChoiceId: undefined,
      };
    }

    case "ordinary_check_requested":
      return {
        ...state,
        view: undefined,
        selectedChoiceId: undefined,
        ordinaryCheckRequested: true,
      };

    case "source_changed":
    case "dismissed":
      return initialFrontDoorRouteState;

    default:
      return state;
  }
};
