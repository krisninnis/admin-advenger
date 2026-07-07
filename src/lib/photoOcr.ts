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

// Below this confidence, the OCR result is treated as unreliable enough that
// callers should avoid presenting extracted key details as normal facts. The
// user can still edit the text manually and continue.
export const OCR_UNRELIABLE_CONFIDENCE_THRESHOLD = 45;

// Key details are more sensitive than the editable OCR textarea. In live
// mobile tests, OCR around ~52% could still produce plausible-looking but
// wrong facts, so the normal "Key details found" card waits for a stronger
// read unless the user has manually edited the extracted text.
export const OCR_KEY_DETAILS_CONFIDENCE_THRESHOLD = 60;

// Between LOW_CONFIDENCE_THRESHOLD and this value, OCR ran and found text,
// but real-world testing on mobile (full-page letters coming back around
// ~54% confidence with several wrong words) showed this band still needs its
// own, gentler warning - severe enough to flag, not severe enough for the
// "hard to read clearly" wording below.
const MODERATE_CONFIDENCE_THRESHOLD = 70;

// A single, calm, low-confidence warning - never a percentage or model-speak,
// per AdminAvenger's confidence/uncertainty writing standard.
export const OCR_LOW_CONFIDENCE_WARNING =
  "This photo may be hard to read clearly, so the extracted text could have more mistakes than usual.";

// Shown above the review textarea for the moderate-confidence band
// (LOW_CONFIDENCE_THRESHOLD <= confidence < MODERATE_CONFIDENCE_THRESHOLD).
// "Check this text" stays available either way - the user can always edit
// the text manually, this is just an honest heads-up.
export const OCR_MODERATE_CONFIDENCE_WARNING =
  "We could read some text, but this result may contain mistakes. A clearer photo may work better.";

// A simple, deterministic heuristic (not a language model) for OCR output
// that does not look like real text - e.g. a blurry photo turned into mostly
// symbols/noise. Checked only once there is already "enough" text to judge
// (see getOcrQualityWarnings), so it never fires alongside, or instead of,
// the short-text warning above.
const GARBLED_LETTER_RATIO_THRESHOLD = 0.4;
const GARBLED_NOISE_RATIO_THRESHOLD = 0.3;

export const OCR_GARBLED_TEXT_WARNING =
  "This text doesn't look right - the photo may be unclear. Try a clearer photo or edit the text manually.";

export const OCR_UNRELIABLE_MESSAGE = "We could not read this photo reliably.";
export const OCR_UNRELIABLE_RETAKE_MESSAGE =
  "Retake the photo closer, upload a clearer image, or paste the text manually.";
export const OCR_UNRELIABLE_EDIT_MESSAGE =
  "You can still edit the extracted text yourself before checking it.";
export const OCR_CHECK_TEXT_UNRELIABLE_WARNING =
  "Only continue if you have checked or corrected the text.";
export const OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE =
  "We could read some text, but not reliably enough to extract key details.";
export const OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE =
  "Retake the photo closer, upload a clearer image, paste the text manually, or edit the text below.";
export const OCR_BOTH_PHOTOS_ON_DEVICE_MESSAGE =
  "We read both photos on your device. Please check the combined text before continuing.";

// Pure - deliberately simple and conservative: mostly-non-letter text, or an
// unusually high share of characters that would not appear in normal prose,
// is treated as likely garbled. Ordinary short sentences, numbers, and
// punctuation found in real letters (£, dates, reference numbers) are not
// flagged.
export const isLikelyGarbledText = (text: string): boolean => {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return false;
  }

  const letterCount = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const letterRatio = letterCount / trimmed.length;

  const noiseCount = trimmed.replace(/[a-zA-Z0-9\s.,'"!?;:()£$%&/-]/g, "").length;
  const noiseRatio = noiseCount / trimmed.length;

  return letterRatio < GARBLED_LETTER_RATIO_THRESHOLD || noiseRatio > GARBLED_NOISE_RATIO_THRESHOLD;
};

export const isOcrResultUnreliable = (text: string, confidence?: number): boolean => {
  const trimmed = text.trim();

  if (typeof confidence === "number" && confidence < OCR_UNRELIABLE_CONFIDENCE_THRESHOLD) {
    return true;
  }

  if (trimmed.length < MIN_USEFUL_TEXT_LENGTH) {
    return true;
  }

  return isLikelyGarbledText(trimmed);
};

export const isOcrKeyDetailsReliable = (text: string, confidence?: number): boolean => {
  if (isOcrResultUnreliable(text, confidence)) {
    return false;
  }

  if (typeof confidence === "number" && confidence < OCR_KEY_DETAILS_CONFIDENCE_THRESHOLD) {
    return false;
  }

  return true;
};

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
  } else if (isLikelyGarbledText(text)) {
    warnings.push(OCR_GARBLED_TEXT_WARNING);
  }

  if (typeof confidence === "number" && confidence < LOW_CONFIDENCE_THRESHOLD) {
    warnings.push(OCR_LOW_CONFIDENCE_WARNING);
  } else if (typeof confidence === "number" && confidence < MODERATE_CONFIDENCE_THRESHOLD) {
    warnings.push(OCR_MODERATE_CONFIDENCE_WARNING);
  }

  return warnings;
};

// ---- OCR preprocessing (upscale small images, grayscale, light contrast) ----
//
// A simple, deterministic pass that runs before Tesseract sees the image -
// never adaptive/auto-thresholding, so it cannot make an already-clear photo
// worse in some unpredictable way. Only ever used as the input to OCR; the
// original captured/uploaded file is untouched and is what everything else
// (preview, evidence, "try another photo") continues to use.

// Aim for at least this many pixels on the image's longer edge before
// running OCR - below this, individual letters in normal print become too
// few pixels wide for Tesseract to resolve reliably.
export const OCR_PREPROCESS_TARGET_MIN_DIMENSION = 1600;

// Never upscale by more than this factor. A very small or very blurry photo
// stretched much further than this just turns into larger blur, not more
// readable text - so past this factor we leave the image as-is rather than
// pretend to improve it.
export const OCR_PREPROCESS_MAX_UPSCALE_FACTOR = 2;

// Pure - decides the scale factor to apply before OCR, given the image's
// natural pixel dimensions. Never downscales (Tesseract already handles
// large photos fine, and downscaling a genuinely large photo would only lose
// detail) and never upscales past OCR_PREPROCESS_MAX_UPSCALE_FACTOR.
export const getOcrPreprocessScale = (width: number, height: number): number => {
  if (!(width > 0) || !(height > 0)) {
    return 1;
  }

  const longEdge = Math.max(width, height);

  if (longEdge >= OCR_PREPROCESS_TARGET_MIN_DIMENSION) {
    return 1;
  }

  const neededScale = OCR_PREPROCESS_TARGET_MIN_DIMENSION / longEdge;
  return Math.min(neededScale, OCR_PREPROCESS_MAX_UPSCALE_FACTOR);
};

// A light, fixed contrast boost - safe enough to help faint print without
// blowing out highlights or crushing shadows on a well-lit photo.
const CONTRAST_FACTOR = 1.15;

// Pure - mutates RGBA pixel data in place: converts each pixel to grayscale,
// then applies the fixed contrast boost above. No adaptive thresholding by
// design (see the module comment) - deterministic and simple, so the same
// photo always preprocesses the same way.
export const applyGrayscaleContrast = (pixels: Uint8ClampedArray): void => {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    const contrasted = Math.min(255, Math.max(0, (gray - 128) * CONTRAST_FACTOR + 128));
    pixels[i] = contrasted;
    pixels[i + 1] = contrasted;
    pixels[i + 2] = contrasted;
  }
};

// Draws the image to a canvas (upscaling small images per
// getOcrPreprocessScale), converts it to grayscale, and applies the contrast
// boost above, resolving a new (lossless PNG) Blob for Tesseract to read.
// Touches the DOM (Image/canvas), so - like capturePhotoFromVideoElement in
// photoCapture.ts - this is exercised manually in the browser rather than
// unit tested directly; getOcrPreprocessScale and applyGrayscaleContrast (the
// pure math it uses) are unit tested. Preprocessing is a best-effort quality
// improvement, not a requirement: readTextFromImage below falls back to the
// original image if this fails for any reason (unsupported format, no canvas
// support, decode failure), so it can never turn a working OCR read into a
// broken one.
export const preprocessImageForOcr = (image: File | Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(image);
    const element = new Image();

    const cleanUp = () => URL.revokeObjectURL(objectUrl);

    element.onload = () => {
      try {
        const scale = getOcrPreprocessScale(element.naturalWidth, element.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(element.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(element.naturalHeight * scale));
        const context = canvas.getContext("2d");

        if (!context) {
          cleanUp();
          reject(new Error("Could not prepare this photo for reading."));
          return;
        }

        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        applyGrayscaleContrast(imageData.data);
        context.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          cleanUp();
          if (!blob) {
            reject(new Error("Could not prepare this photo for reading."));
            return;
          }
          resolve(blob);
        }, "image/png");
      } catch (error) {
        cleanUp();
        reject(error instanceof Error ? error : new Error("Could not prepare this photo for reading."));
      }
    };

    element.onerror = () => {
      cleanUp();
      reject(new Error("Could not prepare this photo for reading."));
    };

    element.src = objectUrl;
  });

export type OcrTextPart = string | { label: string; text: string };

const formatOcrTextPart = (part: OcrTextPart): string => {
  if (typeof part === "string") {
    return part.trim();
  }

  const text = part.text.trim();
  const label = part.label.trim();

  if (!text) {
    return "";
  }

  return label ? `--- ${label} ---\n${text}` : text;
};

export const combineOcrTexts = (parts: OcrTextPart[]): string => {
  const hasLabelledParts = parts.some((part) => typeof part !== "string");
  const formattedParts = parts
    .map(formatOcrTextPart)
    .filter((text) => text.length > 0);

  return formattedParts.join(hasLabelledParts ? "\n\n" : "\n\n---\n\n");
};

export const formatOcrSectionWarning = (label: string, warning: string): string =>
  `${label}: ${warning}`;

// Reads text from a photo entirely inside this browser tab via Tesseract.js.
// Never blocks on low confidence or short text (see getOcrQualityWarnings) -
// callers decide what, if anything, to do with warnings. Only a genuine
// Tesseract failure throws (OcrReadError); callers should catch it and show
// OCR_FAILED_MESSAGE without crashing the app.
export const readTextFromImage = async (
  image: File | Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> => {
  // Best-effort preprocessing (upscale/grayscale/contrast) - never lets a
  // preprocessing failure (unsupported environment/format, no canvas
  // support) block OCR. In this project's non-jsdom test environment,
  // preprocessImageForOcr always rejects (no document/Image/URL.createObjectURL),
  // so tests exercise this same fallback path and OCR still runs on the
  // original image, exactly as before this change.
  let sourceForOcr: File | Blob = image;
  try {
    sourceForOcr = await preprocessImageForOcr(image);
  } catch {
    sourceForOcr = image;
  }

  try {
    const result = await Tesseract.recognize(sourceForOcr, "eng", {
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
