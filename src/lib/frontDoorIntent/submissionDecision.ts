// Front-Door Intent Routing v1, UI wiring slice.
//
// One decision, made in one place, for every way text can be submitted.
//
// The paste box, pasted text combined with attachments, reviewed photo text, a
// loaded text file and the "check this as a message" exit all funnel through
// this module. Before it existed, three of those paths made their own routing
// choice, and two of them made no choice at all: local extraction and reviewed
// photo text went straight to analysis, so "My father needs care" could reach
// document extraction purely because a setting was switched on.
//
// This module is pure and synchronous. It cannot analyse, extract, save,
// create a case, open a specialist journey or contact anything. It only says
// which of two things the caller should do next.

import {
  resolveFrontDoorRouteView,
  type FrontDoorRouteView,
} from "./frontDoorRouteView";
import type { FrontDoorSubmissionSource } from "./submissionSource";

/** A view that has something to show. Document analysis is not one of these. */
export type FrontDoorInterruptingView = Extract<
  FrontDoorRouteView,
  { kind: "urgent_support" } | { kind: "confirmation" } | { kind: "orientation" }
>;

export type FrontDoorSubmissionDecision =
  | {
      /** Continue into the existing analysis journey, unchanged. */
      readonly kind: "document_analysis";
      readonly source: FrontDoorSubmissionSource;
    }
  | {
      /** Hold the submission back and show one screen first. */
      readonly kind: "front_door_route";
      readonly source: FrontDoorSubmissionSource;
      readonly view: FrontDoorInterruptingView;
    };

/**
 * Decide what should happen to an accepted submission.
 *
 * The order is fixed and is the whole point of this function:
 * accepted input, then the security and urgency preflight boundary, then
 * front-door classification, then either a confirmation or urgent screen for
 * non-document input, or the existing document journey. Local extraction and
 * ordinary document analysis both sit after this decision, never before it.
 */
export const decideFrontDoorSubmission = (
  source: FrontDoorSubmissionSource,
): FrontDoorSubmissionDecision => {
  const view = resolveFrontDoorRouteView(source.acceptedText);

  if (view.kind === "document_analysis") {
    return { kind: "document_analysis", source };
  }

  return { kind: "front_door_route", source, view };
};

/**
 * The decision for someone who has already seen a front-door screen and asked
 * for their words to be checked as an ordinary message anyway.
 *
 * It skips the question, not the safety work: the submission still travels the
 * same analysis journey as every other document, so the security preflight
 * inside it runs exactly as before.
 */
export const ordinaryDocumentSubmission = (
  source: FrontDoorSubmissionSource,
): FrontDoorSubmissionDecision => ({ kind: "document_analysis", source });
