import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_CHOOSE_BUTTON_LABEL,
  ATTACHMENT_COMBINED_TEXT_NOTE,
  ATTACHMENT_DRAG_DROP_LABEL,
  ATTACHMENT_HEADING,
  ATTACHMENT_LOCAL_ONLY_NOTE,
  ATTACHMENT_OCR_CAUTION_NOTE,
  ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL,
  buildAttachedFilesCombinedText,
  classifyAttachedFileKind,
  combineTypedTextWithAttachments,
  createAttachedFile,
  hasReadableAttachedText,
  type AttachedFile,
} from "../documentAttachmentIntake";
import { findForbiddenSafetyPhrases } from "../safetyWording";

const makeFile = (name: string, type = "", contents = "pretend bytes") => new File([contents], name, { type });

describe("classifyAttachedFileKind", () => {
  it("classifies images as image", () => {
    expect(classifyAttachedFileKind(makeFile("letter.jpg", "image/jpeg"))).toBe("image");
    expect(classifyAttachedFileKind(makeFile("letter.png", "image/png"))).toBe("image");
    expect(classifyAttachedFileKind(makeFile("letter.heic", ""))).toBe("image");
  });

  it("classifies supported text files as text", () => {
    expect(classifyAttachedFileKind(makeFile("notes.txt"))).toBe("text");
    expect(classifyAttachedFileKind(makeFile("notes.csv"))).toBe("text");
    expect(classifyAttachedFileKind(makeFile("notes.json"))).toBe("text");
  });

  it("classifies PDF/DOCX as unsupported", () => {
    expect(classifyAttachedFileKind(makeFile("statement.pdf", "application/pdf"))).toBe("unsupported");
    expect(classifyAttachedFileKind(makeFile("contract.docx"))).toBe("unsupported");
  });
});

describe("createAttachedFile", () => {
  it("marks a supported image as waiting", () => {
    const attached = createAttachedFile(makeFile("letter.jpg", "image/jpeg"), "id-1");

    expect(attached.kind).toBe("image");
    expect(attached.status).toBe("waiting");
    expect(attached.errorMessage).toBeUndefined();
  });

  it("marks an unsupported file as failed immediately, with the PDF/Word message", () => {
    const attached = createAttachedFile(makeFile("statement.pdf", "application/pdf"), "id-2");

    expect(attached.kind).toBe("unsupported");
    expect(attached.status).toBe("failed");
    expect(attached.errorMessage).toBe(
      "PDF and Word documents are not supported yet. You can copy and paste the text, or upload/take a photo of the document.",
    );
  });

  it("gives every attached file a unique id when none is provided", () => {
    const first = createAttachedFile(makeFile("a.txt"));
    const second = createAttachedFile(makeFile("b.txt"));

    expect(first.id).not.toBe(second.id);
  });
});

describe("buildAttachedFilesCombinedText", () => {
  const readImage = (name: string, text: string): AttachedFile => ({
    id: name,
    file: makeFile(name, "image/jpeg"),
    kind: "image",
    status: "read",
    extractedText: text,
    warnings: [],
  });

  const readText = (name: string, text: string): AttachedFile => ({
    id: name,
    file: makeFile(name, "text/plain"),
    kind: "text",
    status: "read",
    extractedText: text,
    warnings: [],
  });

  it("combines multiple read image files with numbered Document photo separators, in order", () => {
    const combined = buildAttachedFilesCombinedText([
      readImage("a.jpg", "First page text"),
      readImage("b.jpg", "Second page text"),
    ]);

    expect(combined).toContain("--- Document photo 1 ---");
    expect(combined).toContain("First page text");
    expect(combined).toContain("--- Document photo 2 ---");
    expect(combined).toContain("Second page text");
    expect(combined.indexOf("Document photo 1")).toBeLessThan(combined.indexOf("Document photo 2"));
  });

  it("labels a text file by its filename", () => {
    const combined = buildAttachedFilesCombinedText([readText("notes.txt", "Some notes")]);

    expect(combined).toContain("Document file: notes.txt");
    expect(combined).toContain("Some notes");
  });

  it("skips files that are still waiting, reading, or failed", () => {
    const files: AttachedFile[] = [
      { id: "1", file: makeFile("a.jpg", "image/jpeg"), kind: "image", status: "waiting", warnings: [] },
      { id: "2", file: makeFile("b.jpg", "image/jpeg"), kind: "image", status: "reading", warnings: [] },
      {
        id: "3",
        file: makeFile("c.jpg", "image/jpeg"),
        kind: "image",
        status: "failed",
        warnings: [],
        errorMessage: "could not read",
      },
      readImage("d.jpg", "The one that worked"),
    ];

    const combined = buildAttachedFilesCombinedText(files);

    expect(combined).toContain("The one that worked");
    expect(combined).toContain("Document photo 1");
    expect(combined).not.toContain("Document photo 2");
  });

  it("returns an empty string when nothing has been read yet", () => {
    expect(buildAttachedFilesCombinedText([])).toBe("");
  });
});

describe("hasReadableAttachedText", () => {
  it("is true once at least one file has read text", () => {
    expect(
      hasReadableAttachedText([
        {
          id: "1",
          file: makeFile("a.jpg", "image/jpeg"),
          kind: "image",
          status: "read",
          extractedText: "hello",
          warnings: [],
        },
      ]),
    ).toBe(true);
  });

  it("is false when nothing has finished reading", () => {
    expect(
      hasReadableAttachedText([
        { id: "1", file: makeFile("a.jpg", "image/jpeg"), kind: "image", status: "reading", warnings: [] },
      ]),
    ).toBe(false);
  });
});

describe("combineTypedTextWithAttachments", () => {
  it("returns only the typed text when there is no attachment text", () => {
    expect(combineTypedTextWithAttachments("Hello there", "")).toBe("Hello there");
  });

  it("returns only the attachment text when nothing was typed", () => {
    expect(combineTypedTextWithAttachments("   ", "Attachment text")).toBe("Attachment text");
  });

  it("combines both, labelled, when both are present", () => {
    const combined = combineTypedTextWithAttachments("Typed part", "Attached part");

    expect(combined).toContain("Typed text");
    expect(combined).toContain("Typed part");
    expect(combined).toContain("Attached documents");
    expect(combined).toContain("Attached part");
  });
});

describe("Document Attachment Intake v1 copy", () => {
  it("includes all of the required visible copy", () => {
    expect(ATTACHMENT_HEADING).toBe("Attach document photos");
    expect(ATTACHMENT_CHOOSE_BUTTON_LABEL).toBe("Choose photos or files");
    expect(ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL).toBe("Take photo");
    expect(ATTACHMENT_DRAG_DROP_LABEL).toBe("Drag document photos or text files here");
    expect(ATTACHMENT_LOCAL_ONLY_NOTE).toContain("does not upload them");
    expect(ATTACHMENT_OCR_CAUTION_NOTE.toLowerCase()).toContain("check");
    expect(ATTACHMENT_COMBINED_TEXT_NOTE).toContain("checked together");
  });

  it("never overclaims about security, privacy, or OCR accuracy", () => {
    const allCopy = [
      ATTACHMENT_HEADING,
      ATTACHMENT_CHOOSE_BUTTON_LABEL,
      ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL,
      ATTACHMENT_DRAG_DROP_LABEL,
      ATTACHMENT_LOCAL_ONLY_NOTE,
      ATTACHMENT_OCR_CAUTION_NOTE,
      ATTACHMENT_COMBINED_TEXT_NOTE,
    ].join(" ");
    const lowerCopy = allCopy.toLowerCase();

    expect(lowerCopy).not.toContain("secure wipe");
    expect(lowerCopy).not.toContain("bank-level security");
    expect(lowerCopy).not.toContain("permanently deleted everywhere");
    expect(lowerCopy).not.toContain("guaranteed");
    expect(lowerCopy).not.toContain("gdpr compliant");
    expect(findForbiddenSafetyPhrases(allCopy)).toEqual([]);
  });
});
