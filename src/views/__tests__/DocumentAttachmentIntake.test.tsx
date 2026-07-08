import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import documentAttachmentAreaSource from "../../components/DocumentAttachmentArea.tsx?raw";
import {
  ATTACHMENT_CHOOSE_BUTTON_LABEL,
  ATTACHMENT_COMBINED_TEXT_NOTE,
  ATTACHMENT_DRAG_DROP_LABEL,
  ATTACHMENT_HEADING,
  ATTACHMENT_LOCAL_ONLY_NOTE,
  ATTACHMENT_OCR_CAUTION_NOTE,
  ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL,
} from "../../lib/documentAttachmentIntake";
import {
  attachmentCameraAcceptAttribute,
  attachmentPickerAcceptAttribute,
  PDF_OR_WORD_UNSUPPORTED_MESSAGE,
} from "../../lib/fileIntakeAccept";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

describe("Document Attachment Intake v1 - HomeView wiring", () => {
  it("renders the attachment area beside the paste box, without replacing it", () => {
    expect(homeViewSource).toContain("DocumentAttachmentArea");
    expect(homeViewSource).toContain("paste-message");
    expect(homeViewSource).toContain("Paste your message");
  });

  it("keeps the existing photo/file tabs and demo copy working alongside the new area", () => {
    expect(homeViewSource).toContain("Take or upload a photo");
    expect(homeViewSource).toContain("Upload a file");
  });

  it("combines typed text with attached document text through the normal check flow", () => {
    expect(homeViewSource).toContain("combineTypedTextWithAttachments");
    expect(homeViewSource).toContain("attachmentCombinedText");
    // The combined text is handed to the same onCheck(...) call every other
    // input path uses - never a second/parallel analysis function.
    expect(homeViewSource).toContain('onCheck("Pasted admin text", "email", textToCheck)');
  });

  it("reuses the existing on-device OCR path for attached images, never a new one", () => {
    expect(homeViewSource).toContain("readTextFromImage(entry.file)");
  });

  it("carries the existing OCR low-confidence warnings through to each attached file", () => {
    // readTextFromImage already computes these warnings (see getOcrQualityWarnings
    // in photoOcr.ts) - the attachment flow reuses result.warnings rather than
    // inventing a second warning path.
    expect(homeViewSource).toContain("warnings: result.warnings");
  });

  it("keeps a single failed attachment from stopping the others or crashing the flow", () => {
    expect(homeViewSource).toContain("status: \"failed\"");
    expect(homeViewSource).toContain("catch");
  });
});

describe("Document Attachment Intake v1 - DocumentAttachmentArea structure", () => {
  it("renders the required headings/buttons via the shared copy constants", () => {
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_HEADING");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_CHOOSE_BUTTON_LABEL");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_DRAG_DROP_LABEL");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_LOCAL_ONLY_NOTE");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_OCR_CAUTION_NOTE");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_COMBINED_TEXT_NOTE");
  });

  it("offers a native file picker that accepts image types and supported text types", () => {
    expect(documentAttachmentAreaSource).toContain('type="file"');
    expect(documentAttachmentAreaSource).toContain("attachmentPickerAcceptAttribute");
    expect(documentAttachmentAreaSource).toContain("multiple");
  });

  it("offers a camera-oriented input where supported, without hiding the normal picker", () => {
    expect(documentAttachmentAreaSource).toContain('capture="environment"');
    expect(documentAttachmentAreaSource).toContain("attachmentCameraAcceptAttribute");
  });

  it("prevents the browser's default drag/drop navigation on dragover and drop", () => {
    expect(documentAttachmentAreaSource).toContain("onDragOver");
    expect(documentAttachmentAreaSource).toContain("onDrop");
    const preventDefaultCount = (documentAttachmentAreaSource.match(/event\.preventDefault\(\)/g) ?? []).length;
    expect(preventDefaultCount).toBeGreaterThanOrEqual(2);
  });

  it("shows a visible drag-over state and keyboard/file-input fallback", () => {
    expect(documentAttachmentAreaSource).toContain("isDraggingOver");
    // The file input labels give a keyboard-operable path independent of drag/drop.
    expect(documentAttachmentAreaSource).toContain("<label");
  });

  it("lets a file be removed from the list, and shows per-file status/warnings", () => {
    expect(documentAttachmentAreaSource).toContain("onRemoveFile");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_STATUS_LABELS");
    expect(documentAttachmentAreaSource).toContain("attached.warnings.map");
  });

  it("gives every input and button an accessible label", () => {
    expect(documentAttachmentAreaSource).toContain("aria-label={ATTACHMENT_CHOOSE_BUTTON_LABEL}");
    expect(documentAttachmentAreaSource).toContain("aria-label={ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL}");
    expect(documentAttachmentAreaSource).toMatch(/aria-label=\{`\$\{ATTACHMENT_REMOVE_BUTTON_LABEL\}/);
  });
});

describe("Document Attachment Intake v1 - supported/unsupported file messaging", () => {
  it("the broad picker accept string covers phone-camera image formats and supported text types", () => {
    expect(attachmentPickerAcceptAttribute).toContain("image/*");
    expect(attachmentPickerAcceptAttribute).toContain(".heic");
    expect(attachmentPickerAcceptAttribute).toContain(".heif");
    expect(attachmentPickerAcceptAttribute).toContain(".txt");
    expect(attachmentPickerAcceptAttribute).toContain(".csv");
    expect(attachmentPickerAcceptAttribute).toContain(".json");
  });

  it("the camera control accepts images", () => {
    expect(attachmentCameraAcceptAttribute).toBe("image/*");
  });

  it("tells the user PDF/Word documents are not supported yet, without faking support", () => {
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE).toContain("PDF and Word documents are not supported yet");
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE).toContain("copy and paste the text");
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE).toContain("photo of the document");
  });
});

describe("Document Attachment Intake v1 - required visible copy", () => {
  it("matches the required attachment-area copy exactly", () => {
    expect(ATTACHMENT_HEADING).toBe("Attach document photos");
    expect(ATTACHMENT_CHOOSE_BUTTON_LABEL).toBe("Choose photos or files");
    expect(ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL).toBe("Take photo");
    expect(ATTACHMENT_DRAG_DROP_LABEL).toBe("Drag document photos or text files here");
    expect(ATTACHMENT_LOCAL_ONLY_NOTE).toBe(
      "Files are read in this browser. AdminAvenger does not upload them or send them anywhere.",
    );
    expect(ATTACHMENT_OCR_CAUTION_NOTE).toBe(
      "OCR can misread unclear photos. Always check dates, money, and reference numbers against the original document.",
    );
    expect(ATTACHMENT_COMBINED_TEXT_NOTE).toBe(
      "Your typed text and attached document text will be checked together.",
    );
  });

  it("contains no forbidden safety wording anywhere in the attachment UI copy or source", () => {
    const visibleCopy = [
      ATTACHMENT_HEADING,
      ATTACHMENT_CHOOSE_BUTTON_LABEL,
      ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL,
      ATTACHMENT_DRAG_DROP_LABEL,
      ATTACHMENT_LOCAL_ONLY_NOTE,
      ATTACHMENT_OCR_CAUTION_NOTE,
      ATTACHMENT_COMBINED_TEXT_NOTE,
      PDF_OR_WORD_UNSUPPORTED_MESSAGE,
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleCopy)).toEqual([]);
    expect(visibleCopy.toLowerCase()).not.toContain("secure wipe");
    expect(visibleCopy.toLowerCase()).not.toContain("bank-level security");
    expect(visibleCopy.toLowerCase()).not.toContain("guaranteed");
    expect(visibleCopy.toLowerCase()).not.toContain("gdpr compliant");
  });
});
