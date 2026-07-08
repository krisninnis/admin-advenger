// Document Attachment Intake v1 - lets a person attach one or more document
// photos (or supported text files) alongside the normal paste box, on both
// mobile and desktop, without introducing a second analysis path.
//
// This module only composes existing, already-safety-reviewed primitives:
// - file classification/routing and unsupported-file messaging from
//   fileIntakeAccept.ts
// - OCR reading and text-combining from photoOcr.ts (readTextFromImage,
//   combineOcrTexts - the same helper already used for the "Add close-up
//   photo" flow)
// It never talks to Google Photos, iCloud/Apple Photos, or any other cloud
// photo service - file selection goes through the browser's native
// <input type="file"> picker, which is what offers Photos/Gallery/Files on
// the user's own device. Nothing here uploads a file anywhere; every file is
// read locally in this browser tab, exactly like the existing photo/file
// intake paths.
import { getAttachmentUnsupportedMessage, classifyUploadedFile } from "./fileIntakeAccept";
import { combineOcrTexts, type OcrTextPart } from "./photoOcr";

export type AttachedFileKind = "image" | "text" | "unsupported";

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
  const route = classifyUploadedFile(file);

  if (route === "photo_ocr") {
    return "image";
  }

  if (route === "text_file") {
    return "text";
  }

  return "unsupported";
};

// Shown for any attached file that fails to read (OCR crash, unreadable text
// file) - deliberately calm and non-blocking, matching OCR_FAILED_MESSAGE's
// tone in photoOcr.ts, but written for the multi-file attachment list rather
// than the single-photo review screen.
export const ATTACHMENT_READ_FAILED_MESSAGE =
  "AdminAvenger could not read this file. You can remove it and try again, or paste the text manually.";

// Builds the initial record for a newly attached file. Unsupported files
// (PDF/DOCX, anything else the browser can't read as an image or text) are
// marked "failed" immediately, with the same honest per-type message used
// elsewhere in the attachment area - never a fake "reading" state for
// something that was never going to be read.
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
// "Document photo 2", ... (numbered among images only, in attachment order);
// text files are labelled by filename so it's clear which document each
// section came from. Files that are still waiting/reading/failed, or that
// produced no usable text, are skipped - a single failed file never blocks
// the others from being combined.
export const buildAttachedFilesCombinedText = (files: AttachedFile[]): string => {
  let photoIndex = 0;
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
  "Choose photos from your device, take a new photo, or drag files here. AdminAvenger reads them locally in this browser and does not send them anywhere.";

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
  "OCR can misread unclear photos. Always check dates, money, and reference numbers against the original document.";

export const ATTACHMENT_COMBINED_TEXT_NOTE =
  "Your typed text and attached document text will be checked together.";

export const ATTACHMENT_REMOVE_BUTTON_LABEL = "Remove";

export const ATTACHMENT_STATUS_LABELS: Record<AttachedFileStatus, string> = {
  waiting: "Waiting",
  reading: "Reading…",
  read: "Read",
  failed: "Failed",
};

export const ATTACHMENT_KIND_LABELS: Record<AttachedFileKind, string> = {
  image: "Photo",
  text: "Text file",
  unsupported: "Unsupported file",
};
