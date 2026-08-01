// Front-Door Intent Routing v1, UI wiring slice.
//
// What was actually submitted, and what the front door must remember about it.
//
// Two small record types live here so that both the route state and the
// submission decision can share them without either importing the other.
//
// `FrontDoorSubmissionSource` is the thing being checked. It carries the source
// title and source type alongside the text, because the person who asks to have
// their words checked as an ordinary message must reach analysis with the same
// title and type they would have had if the front door had never intervened.
// Flattening every route back to "Pasted admin text" would quietly relabel a
// photo, an attachment or an uploaded file.
//
// `FrontDoorInputSnapshot` is what the input area looked like at the moment the
// route was decided. It exists so a route can be recognised as stale. A question
// asked about wording the person has since edited, cleared or replaced is worse
// than no question at all.

import type { SourceType } from "../../types";

export type FrontDoorSubmissionSource = {
  /** Exactly what was accepted, unmodified. */
  readonly acceptedText: string;
  readonly sourceTitle: string;
  readonly sourceType: SourceType;
};

/** Which of the three input areas the text came from. */
export type FrontDoorInputMode = "paste" | "image" | "file";

export type FrontDoorInputSnapshot = {
  readonly inputMode: FrontDoorInputMode;
  /** The typed or loaded text, before attachments are combined into it. */
  readonly rawText: string;
  /** The combined text of every attachment that has finished reading. */
  readonly attachmentsText: string;
};

export const frontDoorInputSnapshotsMatch = (
  a: FrontDoorInputSnapshot,
  b: FrontDoorInputSnapshot,
): boolean =>
  a.inputMode === b.inputMode &&
  a.rawText === b.rawText &&
  a.attachmentsText === b.attachmentsText;
