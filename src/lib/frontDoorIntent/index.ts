// Front-Door Intent Routing v1 — public surface.
//
// Approved 1 August 2026 for the narrow first slice only. This barrel exports
// the classifier, its types and the approved evaluation corpus. It deliberately
// exports nothing that could route, confirm, activate or create a case: those
// belong to later, separately approved slices.

export { classifyFrontDoorIntent } from "./classifyFrontDoorIntent";
export {
  FRONT_DOOR_INTENT_CORPUS_VERSION,
  FRONT_DOOR_INTENT_DOCUMENT_CONTROL_IDS,
  FRONT_DOOR_INTENT_EXPECTED_SCENARIO_COUNT,
  FRONT_DOOR_INTENT_HUMAN_REVIEW_IDS,
  frontDoorIntentCorpusV1,
} from "./corpusV1";
export type {
  FrontDoorEvidence,
  FrontDoorHelpTarget,
  FrontDoorInputShape,
  FrontDoorIntentClassification,
  FrontDoorIntentScenario,
  FrontDoorSituationSignal,
  FrontDoorUrgencySignal,
  MentionedPerson,
} from "./types";
