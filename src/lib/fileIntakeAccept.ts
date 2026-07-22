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

// ---- Document File Support v1 ----
//
// DOCX and PDF are now read locally in the browser (see
// src/lib/documentFileText.ts for the mammoth/pdfjs-dist extraction, and
// src/lib/documentAttachmentIntake.ts for how the extracted text is combined
// into the normal check flow). Older .doc files are deliberately still not
// supported - Word's legacy binary format is much harder to parse reliably
// in the browser, so rather than guess at it, AdminAvenger tells the person
// clearly to use .docx, paste the text, or photograph the document instead.
// Random/unrecognised binary files (zip, exe, ...) are never treated as
// supported either.

export const supportedDocxExtensions = [".docx"] as const;
export const supportedPdfExtensions = [".pdf"] as const;

const docxMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const pdfMimeTypes = new Set(["application/pdf"]);

export const isSupportedDocxFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();

  // ".docx" only - a plain ".doc" extension must never match here, even if
  // it happens to share a MIME type in some browsers.
  if (fileName.endsWith(".doc") && !fileName.endsWith(".docx")) {
    return false;
  }

  return (
    supportedDocxExtensions.some((extension) => fileName.endsWith(extension)) ||
    docxMimeTypes.has(file.type.toLowerCase())
  );
};

export const isSupportedPdfFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();

  return (
    supportedPdfExtensions.some((extension) => fileName.endsWith(extension)) ||
    pdfMimeTypes.has(file.type.toLowerCase())
  );
};

// Older Word binary format (.doc) - never treated as supported. Checked by
// extension only (not MIME type) since ".doc" and ".docx" can arrive with
// overlapping/ambiguous MIME types from different browsers/OSes.
export const isLegacyDocFile = (file: File): boolean => {
  const fileName = file.name.toLowerCase();

  return fileName.endsWith(".doc") && !fileName.endsWith(".docx");
};

// Single source of truth for classifying any file chosen/dropped anywhere in
// the app (the compact upload menu, the "Upload a file" tab, and the
// "Attach document photos" area) into one of five buckets. Images are
// checked first so an image is never treated as a document; supported text
// files keep their existing behaviour unchanged.
export type FileIntakeClassification =
  | "image"
  | "supported_text"
  | "supported_docx"
  | "supported_pdf"
  | "unsupported";

export const classifyFileForIntake = (file: File): FileIntakeClassification => {
  if (isSupportedPhotoFile(file)) {
    return "image";
  }

  if (isSupportedTextFile(file)) {
    return "supported_text";
  }

  if (isLegacyDocFile(file)) {
    return "unsupported";
  }

  if (isSupportedDocxFile(file)) {
    return "supported_docx";
  }

  if (isSupportedPdfFile(file)) {
    return "supported_pdf";
  }

  return "unsupported";
};

// Where a file chosen from an upload control should go:
// - "photo_ocr": an image, handled by the same on-device photo OCR flow as
//   "Take or upload a photo" (including the "Adjust document area" step)
// - "text_file": a supported text/document file the browser can read as text
// - "docx_extract": a .docx file, read locally with the DOCX text extractor
//   in src/lib/documentFileText.ts
// - "pdf_extract": a PDF file, read locally with the PDF text extractor in
//   src/lib/documentFileText.ts
// - "unsupported": anything else (older .doc files, random binaries, ...),
//   which shows a clear "cannot read this yet" message rather than
//   pretending it can be read
export type UploadedFileRoute = "photo_ocr" | "text_file" | "docx_extract" | "pdf_extract" | "unsupported";

const routeByClassification: Record<FileIntakeClassification, UploadedFileRoute> = {
  image: "photo_ocr",
  supported_text: "text_file",
  supported_docx: "docx_extract",
  supported_pdf: "pdf_extract",
  unsupported: "unsupported",
};

// Single source of truth for routing an uploaded file, built on top of
// classifyFileForIntake above so every entry point in the app (the compact
// "+" upload menu, the "Upload a file" tab, and the "Attach document photos"
// area) agrees on what a given file is. Images are checked first so an image
// is never treated as an unreadable file - this is the fix for image uploads
// in the "Upload a file" area showing an unsupported-file message instead of
// going to photo OCR.
export const classifyUploadedFile = (file: File): UploadedFileRoute =>
  routeByClassification[classifyFileForIntake(file)];

// Shown when a file genuinely can't be read yet (e.g. an unrecognised binary
// file - see DOC_UNSUPPORTED_MESSAGE below for the older-.doc-file case).
// Deliberately does not imply image reading is off - images are routed to
// photo OCR before this is ever reached - and always makes clear the file
// was only selected in this browser, never uploaded or sent anywhere.
export const UNSUPPORTED_FILE_MESSAGE =
  "AdminAvenger cannot read this file type yet. The file was selected in this browser but has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document.";

// ---- Document Attachment Intake v1 ----
//
// Broad "choose from device" accept string for the attachment area's
// "Choose photos or files" control (see src/components/DocumentAttachmentArea.tsx
// and src/lib/documentAttachmentIntake.ts). Deliberately wider than
// quickUploadAcceptAttribute's MIME list - it also lists common phone-camera
// image extensions explicitly (HEIC/HEIF often arrive with an empty or
// non-standard MIME type from mobile file pickers) so the browser/OS file
// picker offers Photos/Gallery/Files consistently across iOS and Android.
// Includes .docx and .pdf now that both are read locally (Document File
// Support v1) - see classifyFileForIntake above.
export const attachmentPickerAcceptAttribute =
  "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.txt,.md,.csv,.json,.docx,.pdf";

// Older .doc files get their own specific, honest message rather than the
// general unsupported-file message - it points the person at the one thing
// that would actually work (re-saving/copying as .docx), not just a generic
// "not supported" shrug.
export const DOC_UNSUPPORTED_MESSAGE =
  "Older .doc files are not supported yet. Please use .docx, copy and paste the text, or upload/take a photo of the document.";

// Single source of truth for the message shown next to a rejected
// attachment. A legacy .doc file gets its own specific message; everything
// else unsupported falls back to the general UNSUPPORTED_FILE_MESSAGE above.
// Never shown for supported_docx/supported_pdf/image/supported_text - those
// are read, not rejected.
export const getAttachmentUnsupportedMessage = (file: File): string =>
  isLegacyDocFile(file) ? DOC_UNSUPPORTED_MESSAGE : UNSUPPORTED_FILE_MESSAGE;
