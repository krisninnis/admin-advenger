// Document Attachment Intake v1 (+ Document File Support v1) - lets a person
// attach one or more document photos, text files, DOCX files, or PDFs
// alongside the normal paste box, on both mobile and desktop, without
// introducing a second analysis path.
//
// This module only composes existing, already-safety-reviewed primitives:
// - file classification/routing and unsupported-file messaging from
//   fileIntakeAccept.ts
// - OCR reading and text-combining from photoOcr.ts (readTextFromImage,
//   combineOcrTexts - the same helper already used for the "Add close-up
//   photo" flow)
// - local DOCX/PDF text extraction from documentFileText.ts
// It never talks to Google Photos, iCloud/Apple Photos, or any other cloud
// photo service - file selection goes through the browser's native
// <input type="file"> picker, which is what offers Photos/Gallery/Files on
// the user's own device. Nothing here uploads a file anywhere; every file is
// read locally in this browser tab, exactly like the existing photo/file
// intake paths.
import { getAttachmentUnsupportedMessage, classifyFileForIntake } from "./fileIntakeAccept";
import { combineOcrTexts, type OcrTextPart } from "./photoOcr";

// "docx" and "pdf" are their own kinds (Document File Support v1) rather
// than being folded into "text" - they go through a different local reader
// (src/lib/documentFileText.ts, not File.text()) and get their own status
// label/messages, but otherwise flow through the same attachment list,
// combined-text builder, and "Check a message" pipeline as every other kind.
export type AttachedFileKind = "image" | "text" | "docx" | "pdf" | "unsupported";

export type AttachedFileStatus = "waiting" | "reading" | "read" | "failed";

export type AttachedFile = {
  id: string;
  file: File;
  kind: AttachedFileKind;
  status: AttachedFileStatus;
  extractedText?: string;
  confidence?: number;
  warnings: string[];
  errorMessage?: string;
};

let attachmentIdCounter = 0;

// Monotonic, collision-free within a session - no crypto dependency needed,
// and deterministic enough to unit test.
export const createAttachmentId = (): string => {
  attachmentIdCounter += 1;
  return `attachment-${attachmentIdCounter}`;
};

export const classifyAttachedFileKind = (file: File): AttachedFileKind => {
  const classification = classifyFileForIntake(file);

  if (classification === "image") {
    return "image";
  }

  if (classification === "supported_text") {
    return "text";
  }

  if (classification === "supported_docx") {
    return "docx";
  }

  if (classification === "supported_pdf") {
    return "pdf";
  }

  return "unsupported";
};

// Shown for any attached file that fails to read (OCR crash, unreadable text
// file) - deliberately calm and non-blocking, matching OCR_FAILED_MESSAGE's
// tone in photoOcr.ts, but written for the multi-file attachment list rather
// than the single-photo review screen. Always makes clear the file was only
// selected in this browser, never uploaded or sent anywhere.
export const ATTACHMENT_READ_FAILED_MESSAGE =
  "Your file was selected in this browser, but AdminAvenger could not read the text from this file. It has not uploaded or sent it anywhere. You can copy and paste the text, or upload/take a photo of the document.";

// Builds the initial record for a newly attached file. Unsupported files
// (older .doc files, random binaries, anything else the browser can't read
// as an image, text, DOCX, or PDF) are marked "failed" immediately, with the
// same honest per-type message used elsewhere in the attachment area - never
// a fake "reading" state for something that was never going to be read.
// Images, text files, DOCX, and PDF all start "waiting" and are read in
// HomeView's handleAttachmentFilesSelected.
export const createAttachedFile = (file: File, id: string = createAttachmentId()): AttachedFile => {
  const kind = classifyAttachedFileKind(file);

  if (kind === "unsupported") {
    return {
      id,
      file,
      kind,
      status: "failed",
      warnings: [],
      errorMessage: getAttachmentUnsupportedMessage(file),
    };
  }

  return {
    id,
    file,
    kind,
    status: "waiting",
    warnings: [],
  };
};

// Combines every successfully read attachment's text, in the order the files
// were attached, using the same combineOcrTexts helper already used for the
// "Add close-up photo" flow. Images are labelled "Document photo 1",
// "Document photo 2", ... (numbered among images only, in attachment order).
// DOCX and PDF files share their own "Document file N: filename" numbering
// (Document File Support v1) - numbered across both types together, in
// attachment order, so multiple DOCX/PDF attachments stay easy to tell apart
// even when they share a document type. Plain text files keep their existing
// unnumbered "Document file: filename" label, unchanged from before. Files
// that are still waiting/reading/failed, or that produced no usable text,
// are skipped - a single failed file never blocks the others from being
// combined.
export const buildAttachedFilesCombinedText = (files: AttachedFile[]): string => {
  let photoIndex = 0;
  let documentFileIndex = 0;
  const parts: OcrTextPart[] = [];

  for (const attached of files) {
    if (attached.status !== "read") {
      continue;
    }

    const text = attached.extractedText?.trim();

    if (!text) {
      continue;
    }

    if (attached.kind === "image") {
      photoIndex += 1;
      parts.push({ label: `Document photo ${photoIndex}`, text });
    } else if (attached.kind === "docx" || attached.kind === "pdf") {
      documentFileIndex += 1;
      parts.push({ label: `Document file ${documentFileIndex}: ${attached.file.name}`, text });
    } else {
      parts.push({ label: `Document file: ${attached.file.name}`, text });
    }
  }

  return combineOcrTexts(parts);
};

// Combines whatever the person typed in the paste box with whatever text the
// attached files produced. Never bypasses the normal check flow - this is
// still just building one plain-text string that flows into the exact same
// "Check a message" pipeline every other input path already uses.
export const combineTypedTextWithAttachments = (
  typedText: string,
  attachmentsText: string,
): string => {
  const trimmedTyped = typedText.trim();
  const trimmedAttachments = attachmentsText.trim();

  if (trimmedTyped && trimmedAttachments) {
    return combineOcrTexts([
      { label: "Typed text", text: trimmedTyped },
      { label: "Attached documents", text: trimmedAttachments },
    ]);
  }

  return trimmedTyped || trimmedAttachments;
};

export const hasReadableAttachedText = (files: AttachedFile[]): boolean =>
  files.some((attached) => attached.status === "read" && Boolean(attached.extractedText?.trim()));

// ---- User-facing copy (Document Attachment Intake v1) ----
//
// Kept as named constants (not inline JSX strings) so they can be safety- and
// content-tested the same way every other user-facing string in this project
// is - see src/lib/safetyWording.ts and
// src/views/__tests__/DocumentAttachmentIntake.test.tsx.

export const ATTACHMENT_HEADING = "Attach document photos";

export const ATTACHMENT_HELPER =
  "Choose photos, text files, Word documents (.docx), or PDFs from your device, take a new photo, or drag files here. AdminAvenger reads them locally in this browser and does not send them anywhere.";

export const ATTACHMENT_CHOOSE_BUTTON_LABEL = "Choose photos or files";

export const ATTACHMENT_CHOOSE_HELPER =
  "On phones, your browser may let you choose from Photos, Google Photos, Files, or similar apps.";

export const ATTACHMENT_TAKE_PHOTO_BUTTON_LABEL = "Take photo";

export const ATTACHMENT_TAKE_PHOTO_HELPER =
  "On supported phones, this opens the camera. You can still choose an existing photo instead.";

export const ATTACHMENT_DRAG_DROP_LABEL = "Drag document photos or text files here";

export const ATTACHMENT_DRAG_ACTIVE_LABEL = "Drop your files to attach them";

export const ATTACHMENT_LOCAL_ONLY_NOTE =
  "Files are read in this browser. AdminAvenger does not upload them or send them anywhere.";

export const ATTACHMENT_OCR_CAUTION_NOTE =
  "OCR and file text extraction can misread or miss details. Always check dates, money, names, and reference numbers against the original document.";

export const ATTACHMENT_COMBINED_TEXT_NOTE =
  "Your typed text and attached document text will be checked together.";

export const ATTACHMENT_REMOVE_BUTTON_LABEL = "Remove";

// Deliberately says "in this browser" / "locally" rather than a bare
// "Waiting"/"Read" - keeps every status honest about where the file is
// (never uploaded or sent anywhere), matching the Document File Support v1
// wording standard.
export const ATTACHMENT_STATUS_LABELS: Record<AttachedFileStatus, string> = {
  waiting: "Selected in this browser",
  reading: "Reading locally in this browser…",
  read: "Read locally in this browser",
  failed: "Failed",
};

export const ATTACHMENT_KIND_LABELS: Record<AttachedFileKind, string> = {
  image: "Photo",
  text: "Text file",
  docx: "Word document",
  pdf: "PDF",
  unsupported: "Unsupported file",
};
