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
