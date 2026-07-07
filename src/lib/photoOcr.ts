// Local, on-device OCR for the "Take or upload a photo" flow (see
// src/components/PhotoCapturePanel.tsx and the inline photo-review section in
// src/views/HomeView.tsx). Tesseract.js runs entirely inside this browser tab
// - nothing here uploads the photo, sends it to a server, or contacts any
// external OCR/cloud service. The result is always handed back as editable
// text that the user must review before AdminAvenger uses it (see
// OCR_ON_DEVICE_MESSAGE below), matching the same "human always decides" rule
// as every other input path (paste, file upload, camera capture).
import * as Tesseract from "tesseract.js";
import { normalizeOcrText } from "./photoIntake";

export type OcrProgress = {
  status: string;
  progress: number;
};

export type OcrResult = {
  text: string;
  confidence?: number;
  warnings: string[];
};

// Shown once OCR has produced text, above the editable review box. Never
// implies the photo left the browser, was uploaded, or was sent anywhere.
export const OCR_ON_DEVICE_MESSAGE =
  "We read this photo on your device. Please check the text before continuing.";

// Honest about OCR's real-world failure modes - shown next to the editable
// review box so nobody assumes the extracted text is automatically correct.
export const OCR_MISTAKES_MESSAGE =
  "OCR can make mistakes, especially with blurry photos, small print, folds, shadows, handwriting, or poor lighting.";

// Shown when OCR ran but found very little usable text. Still lets the user
// edit/paste text manually rather than blocking them.
export const OCR_LOW_TEXT_MESSAGE =
  "We could not read much text from this photo. Try a clearer photo or paste the text manually.";

// Shown when OCR could not run at all (Tesseract threw/crashed).
export const OCR_FAILED_MESSAGE =
  "We could not read this photo. You can try another photo or paste the text manually.";

// Shown while Tesseract is working. Callers may append a percentage derived
// from OcrProgress.progress if they have one.
export const OCR_READING_STATUS_MESSAGE = "Reading photo…";

// Two more standing privacy lines used alongside OCR_ON_DEVICE_MESSAGE, kept
// here (not just inline in UI copy) so they can be safety-tested the same way
// the camera-flow copy in src/lib/photoCapture.ts is.
export const OCR_RUNS_ON_DEVICE_MESSAGE = "OCR runs on your device.";
export const OCR_REVIEW_BEFORE_CHECKING_MESSAGE = "Review the extracted text before checking it.";

// Below this many non-whitespace characters, OCR is treated as having found
// "very little" text - flagged via a warning, but never used to block the
// user from continuing (they can still edit/paste manually).
const MIN_USEFUL_TEXT_LENGTH = 8;

// Below this confidence (Tesseract's 0-100 scale), add a soft warning.
// Per the spec this must never by itself block the user - see
// getOcrQualityWarnings.
const LOW_CONFIDENCE_THRESHOLD = 40;

// A single, calm, low-confidence warning - never a percentage or model-speak,
// per AdminAvenger's confidence/uncertainty writing standard.
export const OCR_LOW_CONFIDENCE_WARNING =
  "This photo may be hard to read clearly, so the extracted text could have more mistakes than usual.";

// Thrown (not returned) when Tesseract itself fails to run, so callers can
// tell "ran but found little/nothing" (an OcrResult with warnings) apart from
// "could not run at all" (a thrown error), while still only ever showing the
// user the same calm, safe OCR_FAILED_MESSAGE either way. Never crashes the
// app - callers are expected to catch this.
export class OcrReadError extends Error {
  constructor(message: string = OCR_FAILED_MESSAGE) {
    super(message);
    this.name = "OcrReadError";
  }
}

// Pure helper (no Tesseract dependency) so warning logic can be unit tested
// against any text/confidence combination without mocking OCR itself.
export const getOcrQualityWarnings = (text: string, confidence?: number): string[] => {
  const warnings: string[] = [];

  if (text.trim().length < MIN_USEFUL_TEXT_LENGTH) {
    warnings.push(OCR_LOW_TEXT_MESSAGE);
  }

  if (typeof confidence === "number" && confidence < LOW_CONFIDENCE_THRESHOLD) {
    warnings.push(OCR_LOW_CONFIDENCE_WARNING);
  }

  return warnings;
};

// Reads text from a photo entirely inside this browser tab via Tesseract.js.
// Never blocks on low confidence or short text (see getOcrQualityWarnings) -
// callers decide what, if anything, to do with warnings. Only a genuine
// Tesseract failure throws (OcrReadError); callers should catch it and show
// OCR_FAILED_MESSAGE without crashing the app.
export const readTextFromImage = async (
  image: File | Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> => {
  try {
    const result = await Tesseract.recognize(image, "eng", {
      logger: (message) => {
        onProgress?.({
          status: message.status,
          progress: Math.max(0, Math.min(1, message.progress ?? 0)),
        });
      },
    });

    const text = normalizeOcrText(result.data.text ?? "");
    const confidence =
      typeof result.data.confidence === "number" ? result.data.confidence : undefined;

    return {
      text,
      confidence,
      warnings: getOcrQualityWarnings(text, confidence),
    };
  } catch {
    throw new OcrReadError();
  }
};
