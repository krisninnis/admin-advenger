// Front-Door Intent Routing v1 — typed model.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md
// Approved corpus:        docs/product/front-door-intent-routing-evaluation-v1.md
//
// This module contains types only. It describes what the classifier may say
// about a submission. It deliberately cannot describe a decision, a route, a
// service, a case, or advice.

/** What kind of thing was submitted. `document_or_message` is the safe default. */
export type FrontDoorInputShape =
  | "document_or_message"
  | "direct_question"
  | "ongoing_situation"
  | "ambiguous_request"
  | "orientation_request";

/**
 * What the situation may contain. Every name begins `possible_` except
 * `person_target_unclear`, deliberately: the vocabulary itself must not be able
 * to express a conclusion about a person.
 *
 * A signal is evidence for asking a better question. It is never a finding,
 * never a label applied to a person, and never an automatic route.
 */
export type FrontDoorSituationSignal =
  | "possible_person_needing_support"
  | "possible_supporter"
  | "possible_caring_role"
  | "possible_functional_need"
  | "possible_hospital_discharge"
  | "possible_bereavement"
  | "possible_money_or_benefits_need"
  | "possible_local_service_need"
  | "possible_urgent_need"
  | "person_target_unclear";

/**
 * Who help is for.
 *
 * Approved decision 2: this stays `unknown` unless the user explicitly
 * identifies who they want help for, or selects an option.
 *
 * Approved decision 4: `self_and_other` and `multiple_other_people` require
 * explicit wording or selection. Naming two people is not asking for help for
 * two people.
 */
export type FrontDoorHelpTarget =
  | "self"
  | "one_other_person"
  | "multiple_other_people"
  | "self_and_other"
  | "unknown";

/**
 * Urgency as a source-grounded signal, never a clinical conclusion.
 *
 * Approved decision 8: AdminAvenger does not select between 999, NHS 111 Wales,
 * a hospital discharge team or a council service. These values record what the
 * wording suggests; a later step presents the options and the person chooses.
 */
export type FrontDoorUrgencySignal =
  | "none_detected"
  | "unclear_urgency"
  | "possible_urgent_practical_support"
  | "possible_urgent_health_need"
  | "possible_immediate_danger";

/** A person other than the user, recorded in the user's own words. */
export type MentionedPerson = {
  /** Verbatim from the source. Never normalised: "Dad" does not become "father". */
  readonly personLabel: string;
  /** Only where the user stated it, again in their own words. */
  readonly relationship?: string;
};

/** A signal tied to the verbatim substring that produced it. */
export type FrontDoorEvidence = {
  readonly signal: FrontDoorSituationSignal | FrontDoorUrgencySignal | "input_shape";
  /** Verbatim substring of the source. Never rewritten or paraphrased. */
  readonly sourceQuote: string;
};

/**
 * The complete output of automatic classification.
 *
 * Three fields are typed as the literal `false` rather than `boolean`. That is
 * intentional: it makes the approved prohibitions unrepresentable rather than
 * merely tested.
 *
 * - `targetConfirmed` — only an explicit human selection may set this.
 * - `specialistRouteOpened` — approved decision 12: no specialist journey in v1.
 * - `caseCreated` — approved decision 13: no case before confirmation.
 */
export type FrontDoorIntentClassification = {
  readonly inputShape: FrontDoorInputShape;
  readonly signals: readonly FrontDoorSituationSignal[];
  readonly mentionedUser: boolean;
  readonly mentionedOtherPeople: readonly MentionedPerson[];
  readonly helpTarget: FrontDoorHelpTarget;
  readonly targetConfirmed: false;
  readonly urgency: FrontDoorUrgencySignal;
  readonly evidence: readonly FrontDoorEvidence[];
  /** True only for `document_or_message`: the existing document journey runs. */
  readonly documentAnalysisSelected: boolean;
  readonly specialistRouteOpened: false;
  readonly caseCreated: false;
};

/** One approved corpus record. */
export type FrontDoorIntentScenario = {
  readonly id: string;
  readonly text: string;
  readonly expected: {
    readonly inputShape: FrontDoorInputShape;
    readonly signals: readonly FrontDoorSituationSignal[];
    readonly mentionedUser: boolean;
    readonly mentionedOtherPeople: readonly MentionedPerson[];
    readonly helpTarget: FrontDoorHelpTarget;
    readonly urgency: FrontDoorUrgencySignal;
  };
};
