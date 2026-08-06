// Front-Door Intent Routing v1, shared shape resolution.
//
// Which shape of question a piece of wording gets, and whose name to use in it.
//
// This lives in its own module for one reason: the question and the orientation
// page shown after it must agree. If each worked the shape out for itself, they
// would eventually disagree, and the person would be asked about care and then
// answered about benefits. Both read this.
//
// It is also what keeps the module graph acyclic. The route view builds the
// question and then hands off to the orientation view; the orientation view
// needs the shape but must not reach back into the route view to get it.

import type {
  FrontDoorIntentClassification,
  FrontDoorSituationSignal,
} from "./types";

/**
 * Signals that mean the wording is about care, support or a practical need.
 * Money and bereavement are handled separately because they change the question.
 */
export const CARE_SIGNALS: readonly FrontDoorSituationSignal[] = [
  "possible_person_needing_support",
  "possible_supporter",
  "possible_caring_role",
  "possible_functional_need",
  "possible_hospital_discharge",
  "possible_local_service_need",
];

export type FrontDoorConfirmationShape =
  | "bereavement"
  | "benefits"
  | "care"
  | "general";

const has = (
  classification: FrontDoorIntentClassification,
  signal: FrontDoorSituationSignal,
): boolean => classification.signals.includes(signal);

export const confirmationShapeOf = (
  classification: FrontDoorIntentClassification,
): FrontDoorConfirmationShape => {
  // Bereavement is checked first. When someone has told us a person has died,
  // asking who needs help would be the wrong question in the wrong moment.
  if (has(classification, "possible_bereavement")) return "bereavement";
  if (has(classification, "possible_money_or_benefits_need")) return "benefits";
  if (CARE_SIGNALS.some((signal) => has(classification, signal))) return "care";
  return "general";
};

/**
 * One safely direct other person, in the person's own word.
 *
 * Verbatim, always. "Dad" never becomes "father", and "MUM" stays "MUM".
 * Multiple relationships and possessive chains are deliberately unavailable:
 * shortening either could attach the person to the user inaccurately.
 */
export const frontDoorPersonLabelOf = (
  classification: FrontDoorIntentClassification,
  originalInput: string,
): string | undefined => {
  if (classification.mentionedOtherPeople.length !== 1) return undefined;

  const label = classification.mentionedOtherPeople[0]?.personLabel;
  if (!label) return undefined;

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const labelIsPossessor = new RegExp(
    `\\b${escapedLabel}['\\u2019]s\\b`,
    "i",
  ).test(originalInput);
  const labelBelongsToAnotherPossessor = new RegExp(
    `\\b(?:my|our)\\s+[\\p{L}][\\p{L}-]*['\\u2019]s\\s+${escapedLabel}\\b`,
    "iu",
  ).test(originalInput);

  return labelIsPossessor || labelBelongsToAnotherPossessor ? undefined : label;
};
