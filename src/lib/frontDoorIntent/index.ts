// Front-Door Intent Routing v1, public surface.
//
// Approved 1 August 2026. The first slice exported only the classifier, its
// types and the approved evaluation corpus, and said in this comment that it
// deliberately exported nothing that could route. The UI wiring slice widened
// that: `decideFrontDoorSubmission` is a routing decision, and it is exported
// here so the one place that decision is made is also the one place it is
// published from.
//
// What that decision can do is deliberately narrow. It can say only that a
// submission continues to the existing document journey, or that one screen is
// shown first. It reads the security boundary before it classifies anything,
// so security-shaped wording cannot be diverted into a care, benefits,
// bereavement or general question.
//
// What it still cannot do is unchanged from the first slice, and these remain
// unrepresentable rather than merely untested, because the view model types
// them as the literal `false`: nothing here confirms who help is for, opens a
// specialist journey, activates the Estate route, or creates a case. Those
// belong to later, separately approved slices.
//
// Production code imports these modules directly by path. This barrel is the
// documented surface, not the only way in, so adding an export here widens what
// the slice claims to offer and should be a deliberate choice each time.

export { classifyFrontDoorIntent } from "./classifyFrontDoorIntent";
export { isSecurityShapedInput } from "./securityShapedInput";
export {
  decideFrontDoorSubmission,
  ordinaryDocumentSubmission,
} from "./submissionDecision";
export type {
  FrontDoorInterruptingView,
  FrontDoorSubmissionDecision,
} from "./submissionDecision";
export { frontDoorInputSnapshotsMatch } from "./submissionSource";
export type {
  FrontDoorInputMode,
  FrontDoorInputSnapshot,
  FrontDoorSubmissionSource,
} from "./submissionSource";
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
