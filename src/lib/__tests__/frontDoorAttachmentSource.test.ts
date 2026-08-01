import { describe, expect, it } from "vitest";
import {
  buildAttachedFilesCombinedText,
  type AttachedFile,
} from "../documentAttachmentIntake";
import {
  decideFrontDoorSubmission,
  ordinaryDocumentSubmission,
} from "../frontDoorIntent/submissionDecision";
import type { FrontDoorSubmissionSource } from "../frontDoorIntent/submissionSource";

// Front-Door Intent Routing v1, UI wiring slice.
//
// What happens to a submission that did not come from the paste box.
//
// This lives in its own file rather than beside the other decision tests
// because it needs the attachment intake module, and that pulls the OCR stack
// in with it. Keeping the heavier import here leaves the main decision suite
// light.
//
// Two separate things are proved. First, an attachment arrives wrapped in a
// section heading, which is multi-line layout, and multi-line layout is one of
// the existing document markers. So an attachment stays on the document
// journey. That rule is asserted here so it cannot be quietly softened to make
// some other test pass. Second, whatever route a submission takes, the source
// title and type it arrived with survive the decision instead of being
// flattened back to "Pasted admin text".

const PLAIN_CARE_WORDING = "My father needs care.";
const ATTACHMENT_NAME = "note-from-mum.txt";

const source = (
  acceptedText: string,
  sourceTitle: string,
  sourceType: FrontDoorSubmissionSource["sourceType"] = "email",
): FrontDoorSubmissionSource => ({ acceptedText, sourceTitle, sourceType });

// Built with the real helper, so the heading these tests rely on is the one the
// product actually produces rather than a guess about its shape. Only `name` is
// read from the file, so a plain stand-in is enough and no File constructor is
// needed outside a browser environment.
const attachedTextFile = {
  id: "attachment-1",
  file: { name: ATTACHMENT_NAME } as File,
  kind: "text",
  status: "read",
  warnings: [],
  extractedText: PLAIN_CARE_WORDING,
} as AttachedFile;

const combinedAttachmentText = buildAttachedFilesCombinedText([attachedTextFile]);

describe("attachment text arrives document-shaped", () => {
  it("carries a heading naming the file, above the text itself", () => {
    expect(combinedAttachmentText).toContain(ATTACHMENT_NAME);
    expect(combinedAttachmentText).toContain(PLAIN_CARE_WORDING);
    expect(combinedAttachmentText).toContain("\n");
  });

  it("stays on the document journey, because document detection is not softened", () => {
    const decision = decideFrontDoorSubmission(
      source(combinedAttachmentText, ATTACHMENT_NAME),
    );

    expect(decision.kind).toBe("document_analysis");
  });

  it("keeps the attachment-derived title on the way to analysis", () => {
    const decision = decideFrontDoorSubmission(
      source(combinedAttachmentText, ATTACHMENT_NAME),
    );

    expect(decision.source.sourceTitle).toBe(ATTACHMENT_NAME);
    expect(decision.source.sourceTitle).not.toBe("Pasted admin text");
    expect(decision.source.acceptedText).toBe(combinedAttachmentText);
  });
});

describe("a care statement carrying a source title of its own", () => {
  // The same sentence, without the heading. This is the shape reviewed photo
  // text has, and it is the case that must reach the question rather than
  // analysis.
  const careFromAnotherSource = source(PLAIN_CARE_WORDING, ATTACHMENT_NAME);

  it("is held back for the question", () => {
    expect(decideFrontDoorSubmission(careFromAnotherSource).kind).toBe(
      "front_door_route",
    );
  });

  it("keeps its source title and type on the route", () => {
    const decision = decideFrontDoorSubmission(careFromAnotherSource);

    expect(decision.source.sourceTitle).toBe(ATTACHMENT_NAME);
    expect(decision.source.sourceTitle).not.toBe("Pasted admin text");
    expect(decision.source.sourceType).toBe("email");
    expect(decision.source.acceptedText).toBe(PLAIN_CARE_WORDING);
  });

  it("submits those same values when the person asks to check it as a message", () => {
    const decision = ordinaryDocumentSubmission(careFromAnotherSource);

    expect(decision.kind).toBe("document_analysis");
    expect(decision.source).toEqual(careFromAnotherSource);
    expect(decision.source.sourceTitle).toBe(ATTACHMENT_NAME);
    expect(decision.source.sourceType).toBe("email");
    expect(decision.source.acceptedText).toBe(PLAIN_CARE_WORDING);
  });

  it("does not depend on the title to decide the route", () => {
    // The same wording under the default title takes the same route. The title
    // is carried, never consulted.
    expect(
      decideFrontDoorSubmission(source(PLAIN_CARE_WORDING, "Pasted admin text")).kind,
    ).toBe("front_door_route");
  });
});
