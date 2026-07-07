// Local, deterministic "document capture quality" checks - the pure
// pixel-analysis heart of the Document Capture Coach (see
// src/components/PhotoCapturePanel.tsx for the live camera guidance and
// capture-review screen that use this, and src/views/HomeView.tsx for how
// the same warnings are carried into the OCR review step). Nothing here
// uploads the photo, sends it anywhere, or runs any cloud OCR/ML service -
// it is plain arithmetic over pixels already decoded in this browser tab, in
// the same spirit as src/lib/photoIntake.ts's getImageQualityWarnings and
// src/lib/photoOcr.ts's getOcrQualityWarnings, but focused on the photo
// *before* OCR runs rather than the OCR result afterwards.
//
// Research note (see task brief): modern document scanners (Google ML Kit
// Document Scanner, OpenCV-style scanners) succeed largely by guiding
// *capture*, not just improving OCR after the fact - edge/contour detection,
// perspective correction, deskew, and shadow cleanup all happen before
// recognition. Real page-boundary/contour detection and perspective
// correction need OpenCV.js or an equivalent, which is too heavy to justify
// for v1 (see the TODO comments at the bottom of this file for what a v2
// could add). This module instead offers a handful of cheap, deterministic
// heuristics - brightness, contrast, a Laplacian-style blur estimate, a
// rough "does the document fill the frame" occupancy check, a rough
// background-clutter check, and a rough tilt estimate - that catch the most
// common bad-capture cases (dark room, blurry hand-held shot, page far
// away, cluttered background, tilted page) without needing real page-
// boundary detection.

export type DocumentImageQualityWarningCode =
  | "document_too_small"
  | "image_too_blurry"
  | "too_dark"
  | "low_contrast"
  | "possibly_tilted"
  | "background_clutter"
  | "low_resolution";

export type DocumentImageQualityWarning = {
  code: DocumentImageQualityWarningCode;
  message: string;
  severity: "info" | "warning" | "strong_warning";
};

export type DocumentImageQualityScore = "good" | "okay" | "poor";

export type DocumentImageQualityResult = {
  score: DocumentImageQualityScore;
  warnings: DocumentImageQualityWarning[];
};

// ---- Standing safety copy ----
// Exported so PhotoCapturePanel/HomeView and tests share one source, and so
// it can be safety-tested the same way every other user-facing string in
// this project is. Deliberately never says "guaranteed", "verified",
// "confirmed", "valid/invalid claim", "pay this", or "ignore this" - a bad
// photo is only ever described as "may be hard to read", never as a
// confirmed failure, and the user is always told they can continue anyway.
export const DOCUMENT_QUALITY_GOOD_MESSAGE = "Good photo — ready to read.";
export const DOCUMENT_QUALITY_WARNING_MESSAGE = "This photo may be hard to read.";
export const DOCUMENT_QUALITY_TIP_MESSAGE =
  "Try moving closer, using better light, or keeping the page flat.";
export const DOCUMENT_QUALITY_CONTINUE_MESSAGE =
  "You can still continue and edit the text manually.";

// ---- Per-warning copy ----
export const DOCUMENT_TOO_SMALL_MESSAGE = "The document looks small in the frame. Move closer.";
export const IMAGE_TOO_BLURRY_MESSAGE = "This photo may be blurry. Hold steady and retake.";
export const TOO_DARK_MESSAGE = "This photo may be too dark. Use better light.";
export const LOW_CONTRAST_MESSAGE =
  "This photo has low contrast, which can make the text harder to read clearly.";
export const POSSIBLY_TILTED_MESSAGE = "The page may be tilted. Try taking it straight-on.";
export const BACKGROUND_CLUTTER_MESSAGE = "There may be too much background around the letter.";
export const LOW_RESOLUTION_MESSAGE =
  "This photo looks low resolution or heavily compressed, so the text may be hard to read. Try a clearer, larger photo.";

// ---- Thresholds ----
// Kept independent from src/lib/photoIntake.ts's MIN_USEFUL_DIMENSION_PX /
// MIN_FULL_PAGE_FILE_SIZE_BYTES (which drive one separate, already-existing
// combined warning used earlier in the flow) - this module is a standalone
// capture-quality unit with its own, more granular set of checks, not a
// replacement for that one.
const MIN_DOCUMENT_LONG_EDGE_PX = 900;
const MIN_DOCUMENT_FILE_SIZE_BYTES = 150 * 1024; // 150KB
const DARK_BRIGHTNESS_THRESHOLD = 70; // 0-255 average luminance
const LOW_CONTRAST_STD_DEV_THRESHOLD = 30; // 0-255 luminance std deviation
const BLUR_VARIANCE_THRESHOLD = 60; // Laplacian-variance-style sharpness score
const MIN_DOCUMENT_OCCUPANCY_RATIO = 0.55; // likely page bounding box / frame area
const MAX_BACKGROUND_CLUTTER_RATIO = 0.35; // share of highly-saturated pixels
const MAX_TILT_SKEW_RATIO = 0.08; // normalised left/right content-edge difference

// Analysis is done on a downscaled copy of the photo (see
// assessDocumentImageQuality below) - these heuristics only need a rough
// read of brightness/contrast/edges/occupancy, not full resolution, and
// downscaling first keeps this fast enough to run on-device against a full
// camera-resolution photo without any native/OpenCV dependency.
export const DOCUMENT_QUALITY_ANALYSIS_MAX_DIMENSION = 600;

// A photo photographed against a darker desk/background is usually
// distinguishable from the page itself by brightness alone - this threshold
// is reused by both the occupancy and tilt estimates below to mean "counts
// as part of the document".
const PAPER_BRIGHTNESS_THRESHOLD = 140;

// Cheap saturation proxy threshold (see computeBackgroundClutterRatio) - a
// plain paper document against a plain desk is mostly low-saturation
// (whites, greys, faint colours).
const SATURATION_THRESHOLD = 0.25;

// ---- Pure pixel-metric functions ----
// Each of these takes already-decoded RGBA pixel data (a Uint8ClampedArray,
// exactly what CanvasRenderingContext2D.getImageData().data returns) plus the
// image's width/height, and returns a single plain number. None of them
// touch the DOM, so all of them are directly unit-testable with small,
// synthetic pixel arrays - no jsdom/canvas needed.

const luminanceAt = (pixels: Uint8ClampedArray, pixelIndex: number): number => {
  const offset = pixelIndex * 4;
  return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
};

export const computeAverageBrightness = (pixels: Uint8ClampedArray): number => {
  const pixelCount = pixels.length / 4;

  if (pixelCount <= 0) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    total += luminanceAt(pixels, i);
  }

  return total / pixelCount;
};

export const computeContrastStdDev = (pixels: Uint8ClampedArray): number => {
  const pixelCount = pixels.length / 4;

  if (pixelCount <= 0) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    total += luminanceAt(pixels, i);
  }
  const mean = total / pixelCount;

  let squaredDifferenceTotal = 0;
  for (let i = 0; i < pixelCount; i += 1) {
    const difference = luminanceAt(pixels, i) - mean;
    squaredDifferenceTotal += difference * difference;
  }

  return Math.sqrt(squaredDifferenceTotal / pixelCount);
};

// A cheap Laplacian-style sharpness estimate: for each interior pixel,
// compares it against its four neighbours (a simple edge/second-derivative
// response), then returns the variance of those responses across the image.
// A sharp, in-focus photo has lots of strong edges and therefore high
// variance; a blurry photo's edges are smeared out, giving low variance.
// This is the same family of technique ("variance of Laplacian") commonly
// used for cheap, real-time blur detection - not a full OpenCV Laplacian
// convolution, but close enough for a "does this look sharp enough to OCR"
// signal without extra dependencies.
export const computeBlurVariance = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  if (width < 3 || height < 3) {
    return 0;
  }

  const responses: number[] = [];

  for (let row = 1; row < height - 1; row += 1) {
    for (let col = 1; col < width - 1; col += 1) {
      const center = luminanceAt(pixels, row * width + col);
      const up = luminanceAt(pixels, (row - 1) * width + col);
      const down = luminanceAt(pixels, (row + 1) * width + col);
      const left = luminanceAt(pixels, row * width + (col - 1));
      const right = luminanceAt(pixels, row * width + (col + 1));

      responses.push(4 * center - up - down - left - right);
    }
  }

  if (responses.length === 0) {
    return 0;
  }

  const mean = responses.reduce((total, value) => total + value, 0) / responses.length;
  const variance =
    responses.reduce((total, value) => total + (value - mean) ** 2, 0) / responses.length;

  return variance;
};

// Rough "does the document fill the frame" estimate: finds the bounding box
// of pixels brighter than a fixed paper-like threshold (a real letter photo
// is usually a bright page against a comparatively darker background/desk),
// then returns that bounding box's area as a share of the whole frame. This
// is intentionally not real page/contour detection (see the v2 TODOs at the
// bottom of this file) - it is a cheap proxy that works for the common case
// of a pale document photographed against a darker surface.
export const computeDocumentOccupancyRatio = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  if (width <= 0 || height <= 0) {
    return 0;
  }

  let minRow = height;
  let maxRow = -1;
  let minCol = width;
  let maxCol = -1;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (luminanceAt(pixels, row * width + col) >= PAPER_BRIGHTNESS_THRESHOLD) {
        if (row < minRow) minRow = row;
        if (row > maxRow) maxRow = row;
        if (col < minCol) minCol = col;
        if (col > maxCol) maxCol = col;
      }
    }
  }

  if (maxRow < minRow || maxCol < minCol) {
    return 0;
  }

  const boundingBoxArea = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  return boundingBoxArea / (width * height);
};

// Rough background-clutter estimate: a plain paper document against a plain
// desk is mostly low-saturation (whites, greys, faint colours); a cluttered
// background (patterned surfaces, other colourful objects) usually raises
// the share of highly-saturated pixels in the frame. Saturation here is the
// cheap (max channel - min channel) / max channel proxy, not full HSL
// conversion - good enough to distinguish "mostly neutral" from "colourful"
// without extra cost.
export const computeBackgroundClutterRatio = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  const pixelCount = width * height;

  if (pixelCount <= 0) {
    return 0;
  }

  let clutteredCount = 0;

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (saturation > SATURATION_THRESHOLD) {
      clutteredCount += 1;
    }
  }

  return clutteredCount / pixelCount;
};

// Rough tilt estimate: finds where the bright/document content begins
// (top-down) in the left third of the frame versus the right third, and
// returns how far apart those two points are, normalised by image height. A
// document photographed straight-on starts at roughly the same row on both
// sides; a tilted page starts noticeably higher on one side than the other.
// This is a cheap proxy for skew, not real perspective/rotation detection
// (see the v2 TODOs below) - it only looks for "is one side of the page
// higher than the other", which is enough to catch an obviously tilted shot
// without needing edge/contour analysis.
export const computeTiltSkewEstimate = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  if (width < 3 || height <= 0) {
    return 0;
  }

  const thirdWidth = Math.max(1, Math.floor(width / 3));

  const findTopmostContentRow = (colStart: number, colEnd: number): number | undefined => {
    for (let row = 0; row < height; row += 1) {
      for (let col = colStart; col < colEnd; col += 1) {
        if (luminanceAt(pixels, row * width + col) >= PAPER_BRIGHTNESS_THRESHOLD) {
          return row;
        }
      }
    }
    return undefined;
  };

  const leftTop = findTopmostContentRow(0, thirdWidth);
  const rightTop = findTopmostContentRow(width - thirdWidth, width);

  if (leftTop === undefined || rightTop === undefined) {
    // No clear document content found on one or both sides - not enough
    // signal to estimate tilt, so say nothing rather than risk a false
    // "possibly tilted" warning.
    return 0;
  }

  return Math.abs(leftTop - rightTop) / height;
};

// ---- Warning builders ----
// Each takes a single already-computed measurement and decides whether it
// crosses the (fixed, documented) threshold above into a warning. Kept
// separate from the metric functions above so a threshold can be tuned
// without touching the pixel math, and so each check can be unit tested in
// isolation with a plain number rather than a constructed image.

export const getLowResolutionWarning = (input: {
  width?: number;
  height?: number;
  fileSize?: number;
}): DocumentImageQualityWarning | undefined => {
  const tooSmallDimensions =
    typeof input.width === "number" &&
    typeof input.height === "number" &&
    Math.max(input.width, input.height) < MIN_DOCUMENT_LONG_EDGE_PX;
  const tooSmallFile =
    typeof input.fileSize === "number" &&
    input.fileSize > 0 &&
    input.fileSize < MIN_DOCUMENT_FILE_SIZE_BYTES;

  if (!tooSmallDimensions && !tooSmallFile) {
    return undefined;
  }

  return { code: "low_resolution", message: LOW_RESOLUTION_MESSAGE, severity: "strong_warning" };
};

export const getBlurWarning = (blurVariance: number): DocumentImageQualityWarning | undefined =>
  blurVariance < BLUR_VARIANCE_THRESHOLD
    ? { code: "image_too_blurry", message: IMAGE_TOO_BLURRY_MESSAGE, severity: "strong_warning" }
    : undefined;

export const getBrightnessWarning = (
  averageBrightness: number,
): DocumentImageQualityWarning | undefined =>
  averageBrightness < DARK_BRIGHTNESS_THRESHOLD
    ? { code: "too_dark", message: TOO_DARK_MESSAGE, severity: "warning" }
    : undefined;

export const getContrastWarning = (
  contrastStdDev: number,
): DocumentImageQualityWarning | undefined =>
  contrastStdDev < LOW_CONTRAST_STD_DEV_THRESHOLD
    ? { code: "low_contrast", message: LOW_CONTRAST_MESSAGE, severity: "warning" }
    : undefined;

export const getOccupancyWarning = (
  occupancyRatio: number,
): DocumentImageQualityWarning | undefined =>
  occupancyRatio < MIN_DOCUMENT_OCCUPANCY_RATIO
    ? { code: "document_too_small", message: DOCUMENT_TOO_SMALL_MESSAGE, severity: "strong_warning" }
    : undefined;

export const getClutterWarning = (
  clutterRatio: number,
): DocumentImageQualityWarning | undefined =>
  clutterRatio > MAX_BACKGROUND_CLUTTER_RATIO
    ? { code: "background_clutter", message: BACKGROUND_CLUTTER_MESSAGE, severity: "info" }
    : undefined;

export const getTiltWarning = (skewEstimate: number): DocumentImageQualityWarning | undefined =>
  skewEstimate > MAX_TILT_SKEW_RATIO
    ? { code: "possibly_tilted", message: POSSIBLY_TILTED_MESSAGE, severity: "warning" }
    : undefined;

// Highest severity present wins: any strong_warning makes the photo "poor"
// (retake strongly suggested), any (non-strong) warning makes it "okay"
// (usable, but flagged), otherwise "good". A lone "info" warning (background
// clutter on an otherwise fine photo) does not by itself drag the score down
// from "good" - see getVisibleDocumentQualityWarningMessages below for how
// that interacts with what is actually shown.
//
// This never blocks anything - score only changes what is *said*, never
// whether "Use this photo" is available (see PhotoCapturePanel.tsx, where
// that button is always rendered regardless of this result).
export const computeQualityScore = (
  warnings: DocumentImageQualityWarning[],
): DocumentImageQualityScore => {
  if (warnings.some((warning) => warning.severity === "strong_warning")) {
    return "poor";
  }
  if (warnings.some((warning) => warning.severity === "warning")) {
    return "okay";
  }
  return "good";
};

// Only surface warning bullets when the photo is not already scored "good" -
// an isolated info-level warning (e.g. background clutter) on an otherwise
// good photo should not make the capture-review screen look alarming when
// the headline message is already the reassuring "Good photo" one.
export const getVisibleDocumentQualityWarningMessages = (
  result: DocumentImageQualityResult,
): string[] => (result.score === "good" ? [] : result.warnings.map((warning) => warning.message));

// Whether the Retake button should be visually emphasised (e.g. styled more
// prominently than "Use this photo"). Purely a styling decision - it never
// hides or disables "Use this photo" itself, which stays available and
// enabled regardless of this result (see PhotoCapturePanel.tsx).
export const shouldEmphasizeRetake = (score: DocumentImageQualityScore): boolean =>
  score === "poor";

export type DocumentImageQualityMetrics = {
  width?: number;
  height?: number;
  fileSize?: number;
  averageBrightness: number;
  contrastStdDev: number;
  blurVariance: number;
  occupancyRatio: number;
  clutterRatio: number;
  tiltSkewEstimate: number;
};

// Pure - the actual decision logic, fully unit-testable with plain numbers
// (no canvas/Image/File needed). assessDocumentImageQuality below is the
// thin, DOM-touching wrapper that decodes a real photo into these numbers.
export const evaluateDocumentImageQuality = (
  metrics: DocumentImageQualityMetrics,
): DocumentImageQualityResult => {
  // Order matters for the review UI: if the page is too far away, "move
  // closer" is the most useful instruction and should appear before tilt or
  // background warnings from the same poor capture.
  const warnings = [
    getOccupancyWarning(metrics.occupancyRatio),
    getBlurWarning(metrics.blurVariance),
    getBrightnessWarning(metrics.averageBrightness),
    getContrastWarning(metrics.contrastStdDev),
    getTiltWarning(metrics.tiltSkewEstimate),
    getClutterWarning(metrics.clutterRatio),
    getLowResolutionWarning({
      width: metrics.width,
      height: metrics.height,
      fileSize: metrics.fileSize,
    }),
  ].filter((warning): warning is DocumentImageQualityWarning => Boolean(warning));

  return { score: computeQualityScore(warnings), warnings };
};

// ---- DOM-touching wrapper ----
// Decodes the photo onto a small analysis canvas (downscaled - see
// DOCUMENT_QUALITY_ANALYSIS_MAX_DIMENSION above), computes the pixel metrics
// above, and evaluates them. Like getImageDimensions in photoIntake.ts and
// preprocessImageForOcr in photoOcr.ts, this touches the DOM (Image/canvas),
// so it is exercised manually in the browser rather than unit tested
// directly - evaluateDocumentImageQuality and the individual compute*/get*
// functions above (the actual decision logic) are unit tested instead.
// Never throws: if the photo cannot be decoded/analysed for any reason, this
// resolves a neutral "okay, no warnings" result rather than blocking the
// capture flow or falsely claiming the photo is "good".
export async function assessDocumentImageQuality(
  image: File | Blob,
): Promise<DocumentImageQualityResult> {
  try {
    const fileSize = "size" in image ? image.size : undefined;

    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(image);
      const element = new Image();

      const cleanUp = () => URL.revokeObjectURL(objectUrl);

      element.onload = () => {
        cleanUp();
        resolve({ width: element.naturalWidth, height: element.naturalHeight });
      };
      element.onerror = () => {
        cleanUp();
        reject(new Error("Could not decode this photo for quality checks."));
      };
      element.src = objectUrl;
    });

    const scale = Math.min(
      1,
      DOCUMENT_QUALITY_ANALYSIS_MAX_DIMENSION / Math.max(dimensions.width, dimensions.height),
    );
    const analysisWidth = Math.max(1, Math.round(dimensions.width * scale));
    const analysisHeight = Math.max(1, Math.round(dimensions.height * scale));

    const pixels = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(image);
      const element = new Image();

      element.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = analysisWidth;
          canvas.height = analysisHeight;
          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Could not prepare this photo for quality checks."));
            return;
          }

          context.drawImage(element, 0, 0, analysisWidth, analysisHeight);
          resolve(context.getImageData(0, 0, analysisWidth, analysisHeight).data);
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Could not read this photo's pixels."));
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      element.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not decode this photo for quality checks."));
      };
      element.src = objectUrl;
    });

    const metrics: DocumentImageQualityMetrics = {
      width: dimensions.width,
      height: dimensions.height,
      fileSize,
      averageBrightness: computeAverageBrightness(pixels),
      contrastStdDev: computeContrastStdDev(pixels),
      blurVariance: computeBlurVariance(pixels, analysisWidth, analysisHeight),
      occupancyRatio: computeDocumentOccupancyRatio(pixels, analysisWidth, analysisHeight),
      clutterRatio: computeBackgroundClutterRatio(pixels, analysisWidth, analysisHeight),
      tiltSkewEstimate: computeTiltSkewEstimate(pixels, analysisWidth, analysisHeight),
    };

    return evaluateDocumentImageQuality(metrics);
  } catch {
    // Never block or falsely reassure - a neutral, warning-free "okay" is
    // the safest fallback if analysis itself fails for any reason (e.g. an
    // unsupported image format, or - as in this project's non-jsdom test
    // environment - no Image/canvas support at all).
    return { score: "okay", warnings: [] };
  }
}

// ---- v2 planning (not built here - see task brief) ----
//
// TODO(v2 - auto-crop): detect the document's actual page boundary (not just
// the rough brightness-bounding-box used by computeDocumentOccupancyRatio
// above) and auto-crop to it before OCR. Needs real contour/edge detection.
//
// TODO(v2 - deskew/perspective correction): once a real page boundary is
// found, apply a perspective transform to flatten a photo taken at an angle,
// rather than just warning about tilt (computeTiltSkewEstimate above only
// detects tilt, it does not correct it).
//
// TODO(v2 - multi-photo top/bottom mode): for a letter too long to fit
// legibly in one frame, support taking a "top half" and "bottom half" photo
// and combining the OCR text (see combineOcrTexts in photoOcr.ts, which
// already exists for this) with capture guidance telling the user which
// half they are on.
//
// TODO(v2 - optional OpenCV.js contour detection): if the above heuristics
// prove insufficient in practice, a small, lazily-loaded OpenCV.js build
// could provide real contour/perspective detection - deliberately not added
// in v1 because of its bundle-size/startup-cost, and because the local-first
// bar for adding a new dependency is "small and safe", which a full
// OpenCV.js build is not.
