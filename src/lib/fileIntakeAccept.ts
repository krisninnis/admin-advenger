// Shared `accept` attribute strings for the photo/file intake controls.
// Centralised here so the compact "Add photo or file" control and the
// larger mode-card file inputs always agree on what they accept, and so
// the values can be unit tested without mounting any React components.

import { isSupportedPhotoFile } from "./photoIntake";

export const photoAcceptAttribute = "image/*";

export const textFileAcceptAttribute =
  ".txt,.md,.csv,.json,.pdf,.doc,.docx,text/plain,text/markdown,text/csv,application/json";

// Used by the compact "Upload file" quick action, which accepts either a
// photo or a document and routes to the right handler based on the file it
// receives.
export const quickUploadAcceptAttribute = `${photoAcceptAttribute},${textFileAcceptAttribute}`;

// Used by the "Upload existing photo" option inside the camera capture panel
// (src/components/PhotoCapturePanel.tsx). Deliberately narrower than the
// generic photoAcceptAttribute ("image/*") so the file picker only offers
// formats AdminAvenger can actually try to read, including the HEIC/HEIF
// formats modern phone cameras commonly save photos as.
export const photoCaptureAcceptAttribute = "image/png,image/jpeg,image/webp,image/heic,image/heif";

// The text/document file types the in-browser reader can actually load as
// text right now. Kept here (rather than inline in HomeView) so the routing
// decision below and the UI stay in agreement and can be unit tested.
export const supportedTextFileExtensions = [".txt", ".md", ".csv", ".json"] as const;

export const isSupportedTextFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();

  return supportedTextFileExtensions.some((extension) => fileName.endsWith(extension));
};

// Where a file chosen from an upload control should go:
// - "photo_ocr": an image, handled by the same on-device photo OCR flow as
//   "Take or upload a photo" (including the "Adjust document area" step)
// - "text_file": a supported text/document file the browser can read as text
// - "unsupported": anything else (e.g. PDF/DOCX), which shows the
//   "not supported yet" message rather than pretending it can be read
export type UploadedFileRoute = "photo_ocr" | "text_file" | "unsupported";

// Single source of truth for routing an uploaded file. Images are checked
// first so an image is never treated as an unreadable file - this is the fix
// for image uploads in the "Upload a file" area showing an unsupported-file
// message instead of going to photo OCR.
export const classifyUploadedFile = (file: File): UploadedFileRoute => {
  if (isSupportedPhotoFile(file)) {
    return "photo_ocr";
  }

  if (isSupportedTextFile(file)) {
    return "text_file";
  }

  return "unsupported";
};

// Shown when a file genuinely can't be read yet (e.g. PDF/DOCX). Deliberately
// does not imply image reading is off - images are routed to photo OCR before
// this is ever reached - and points the user at what does work today.
export const UNSUPPORTED_FILE_MESSAGE =
  "This file type is not supported yet. For images, upload JPG/PNG. For documents, copy and paste the text for now.";

// ---- Document Attachment Intake v1 ----
//
// Broad "choose from device" accept string for the attachment area's
// "Choose photos or files" control (see src/components/DocumentAttachmentArea.tsx
// and src/lib/documentAttachmentIntake.ts). Deliberately wider than
// quickUploadAcceptAttribute's MIME list - it also lists common phone-camera
// image extensions explicitly (HEIC/HEIF often arrive with an empty or
// non-standard MIME type from mobile file pickers) so the browser/OS file
// picker offers Photos/Gallery/Files consistently across iOS and Android.
export const attachmentPickerAcceptAttribute =
  "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.txt,.md,.csv,.json";

// Accept string for the attachment area's "Take photo" control. Kept as its
// own named constant (identical value to photoAcceptAttribute today) so the
// two controls can be tuned independently later without one silently
// affecting the other.
export const attachmentCameraAcceptAttribute = "image/*";

const pdfOrWordExtensions = [".pdf", ".doc", ".docx"];
const pdfOrWordMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const isPdfOrWordFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();

  return (
    pdfOrWordMimeTypes.has(file.type.toLowerCase()) ||
    pdfOrWordExtensions.some((extension) => fileName.endsWith(extension))
  );
};

// A more specific, honest message for the single most common "not supported
// yet" case in the attachment area (PDF/Word documents) - never implies fake
// support, and always points at what already works (paste, or photograph the
// document).
export const PDF_OR_WORD_UNSUPPORTED_MESSAGE =
  "PDF and Word documents are not supported yet. You can copy and paste the text, or upload/take a photo of the document.";

// Single source of truth for the message shown next to a rejected attachment.
// PDF/Word gets its own specific, honest message; everything else falls back
// to the general UNSUPPORTED_FILE_MESSAGE above.
export const getAttachmentUnsupportedMessage = (file: File): string =>
  isPdfOrWordFile(file) ? PDF_OR_WORD_UNSUPPORTED_MESSAGE : UNSUPPORTED_FILE_MESSAGE;
