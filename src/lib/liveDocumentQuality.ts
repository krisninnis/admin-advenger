// Lightweight, local-only live camera guidance for document capture.
//
// This module deliberately does not import Tesseract, run OCR, upload
// anything, or try to make legal/admin decisions. It samples downscaled
// pixels from the camera preview and returns one practical capture
// instruction at a time.

export type LiveDocumentQualityStatus = "poor" | "okay" | "ready";

export type LiveDocumentQualityIssue =
  | "no_document"
  | "too_far"
  | "too_close"
  | "clipped"
  | "blurred"
  | "too_dark"
  | "low_contrast"
  | "glare"
  | "tilted"
  | "background_clutter"
  | "not_enough_text"
  | "ready";

export type LiveDocumentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LiveDocumentQualityMetrics = {
  brightness: number;
  contrast: number;
  sharpness: number;
  glareRatio: number;
  documentCoverage: number;
  documentBounds?: LiveDocumentBounds;
  clippedEdgeCount: number;
  tilt: number;
  backgroundClutter: number;
  textDensity: number;
};

export type LiveDocumentQualityResult = {
  status: LiveDocumentQualityStatus;
  primaryInstruction: string;
  secondaryInstruction?: string;
  score: number;
  issues: LiveDocumentQualityIssue[];
  metrics: LiveDocumentQualityMetrics;
};

export const LIVE_DOCUMENT_QUALITY_SAMPLE_INTERVAL_MS = 850;
export const LIVE_DOCUMENT_QUALITY_SAMPLE_MAX_DIMENSION = 220;

export const LIVE_QUALITY_PLACE_DOCUMENT_IN_FRAME = "Place the letter inside the frame.";
export const LIVE_QUALITY_MOVE_CLOSER = "Move closer - the text is too small.";
export const LIVE_QUALITY_MOVE_BACK = "Move back slightly - the page is being cut off.";
export const LIVE_QUALITY_HOLD_STEADY = "Hold steady - the photo looks blurry.";
export const LIVE_QUALITY_USE_MORE_LIGHT = "Use more light - the page is too dark.";
export const LIVE_QUALITY_AVOID_GLARE =
  "Avoid glare - tilt the phone away from reflections.";
export const LIVE_QUALITY_KEEP_FLAT = "Keep the page flat and straight.";
export const LIVE_QUALITY_LOW_CONTRAST =
  "Use better light - the text and page need more contrast.";
export const LIVE_QUALITY_BACKGROUND_CLUTTER =
  "Move closer until the letter nearly fills the frame.";
export const LIVE_QUALITY_NOT_ENOUGH_TEXT =
  "Move closer until the words are easier to read.";
export const LIVE_QUALITY_READY = "Ready to scan.";

export const LIVE_QUALITY_READY_SECONDARY = "The letter is clear enough to read.";
export const LIVE_QUALITY_OKAY_SECONDARY =
  "This may work, but a closer photo will read better.";
export const LIVE_QUALITY_POOR_SECONDARY =
  "This may be hard to read. You can still take the photo, but OCR may make more mistakes.";

const PAPER_BRIGHTNESS_THRESHOLD = 150;
const TEXT_BRIGHTNESS_THRESHOLD = 95;
const DARK_BRIGHTNESS_THRESHOLD = 70;
const LOW_CONTRAST_THRESHOLD = 26;
const BLUR_SHARPNESS_THRESHOLD = 55;
const GLARE_RATIO_THRESHOLD = 0.045;
const MIN_VISIBLE_DOCUMENT_COVERAGE = 0.03;
const MIN_DOCUMENT_COVERAGE = 0.46;
const MAX_DOCUMENT_COVERAGE = 0.94;
const MIN_TEXT_DENSITY = 0.006;
const CLIPPED_EDGE_MARGIN = 0.025;
const TILT_THRESHOLD = 0.09;
const BACKGROUND_CLUTTER_THRESHOLD = 0.32;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, value));

const luminanceAt = (pixels: Uint8ClampedArray, pixelIndex: number): number => {
  const offset = pixelIndex * 4;
  return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
};

const getSaturationAt = (pixels: Uint8ClampedArray, pixelIndex: number): number => {
  const offset = pixelIndex * 4;
  const red = pixels[offset];
  const green = pixels[offset + 1];
  const blue = pixels[offset + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max === 0 ? 0 : (max - min) / max;
};

const getContrast = (luminanceValues: number[], brightness: number): number => {
  if (luminanceValues.length === 0) {
    return 0;
  }

  const variance =
    luminanceValues.reduce((total, value) => total + (value - brightness) ** 2, 0) /
    luminanceValues.length;

  return Math.sqrt(variance);
};

const getSharpness = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  if (width < 3 || height < 3) {
    return 0;
  }

  let responseTotal = 0;
  let responseSquaredTotal = 0;
  let count = 0;

  for (let row = 1; row < height - 1; row += 1) {
    for (let col = 1; col < width - 1; col += 1) {
      const center = luminanceAt(pixels, row * width + col);
      const up = luminanceAt(pixels, (row - 1) * width + col);
      const down = luminanceAt(pixels, (row + 1) * width + col);
      const left = luminanceAt(pixels, row * width + (col - 1));
      const right = luminanceAt(pixels, row * width + (col + 1));
      const response = 4 * center - up - down - left - right;

      responseTotal += response;
      responseSquaredTotal += response * response;
      count += 1;
    }
  }

  if (count === 0) {
    return 0;
  }

  const mean = responseTotal / count;
  return responseSquaredTotal / count - mean * mean;
};

const getDocumentBounds = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): { bounds?: LiveDocumentBounds; brightPixelRatio: number; clippedEdgeCount: number } => {
  let minRow = height;
  let maxRow = -1;
  let minCol = width;
  let maxCol = -1;
  let brightPixelCount = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const pixelIndex = row * width + col;
      const luminance = luminanceAt(pixels, pixelIndex);

      if (luminance >= PAPER_BRIGHTNESS_THRESHOLD) {
        brightPixelCount += 1;
        if (row < minRow) minRow = row;
        if (row > maxRow) maxRow = row;
        if (col < minCol) minCol = col;
        if (col > maxCol) maxCol = col;
      }
    }
  }

  const frameArea = width * height;
  const brightPixelRatio = frameArea > 0 ? brightPixelCount / frameArea : 0;

  if (maxRow < minRow || maxCol < minCol) {
    return { brightPixelRatio, clippedEdgeCount: 0 };
  }

  const bounds = {
    x: minCol / width,
    y: minRow / height,
    width: (maxCol - minCol + 1) / width,
    height: (maxRow - minRow + 1) / height,
  };

  const clippedEdgeCount = [
    bounds.x <= CLIPPED_EDGE_MARGIN,
    bounds.y <= CLIPPED_EDGE_MARGIN,
    bounds.x + bounds.width >= 1 - CLIPPED_EDGE_MARGIN,
    bounds.y + bounds.height >= 1 - CLIPPED_EDGE_MARGIN,
  ].filter(Boolean).length;

  return { bounds, brightPixelRatio, clippedEdgeCount };
};

const getTextDensity = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  bounds?: LiveDocumentBounds,
): number => {
  if (!bounds) {
    return 0;
  }

  const minCol = Math.max(0, Math.floor(bounds.x * width));
  const maxCol = Math.min(width - 1, Math.ceil((bounds.x + bounds.width) * width));
  const minRow = Math.max(0, Math.floor(bounds.y * height));
  const maxRow = Math.min(height - 1, Math.ceil((bounds.y + bounds.height) * height));
  let darkPixelCount = 0;
  let documentPixelCount = 0;

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const pixelIndex = row * width + col;
      const luminance = luminanceAt(pixels, pixelIndex);

      documentPixelCount += 1;
      if (luminance <= TEXT_BRIGHTNESS_THRESHOLD) {
        darkPixelCount += 1;
      }
    }
  }

  return documentPixelCount > 0 ? darkPixelCount / documentPixelCount : 0;
};

const getBackgroundClutter = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  bounds?: LiveDocumentBounds,
): number => {
  let clutteredCount = 0;
  let backgroundCount = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const inDocument =
        bounds &&
        col >= bounds.x * width &&
        col <= (bounds.x + bounds.width) * width &&
        row >= bounds.y * height &&
        row <= (bounds.y + bounds.height) * height;

      if (inDocument) {
        continue;
      }

      backgroundCount += 1;
      if (getSaturationAt(pixels, row * width + col) > 0.28) {
        clutteredCount += 1;
      }
    }
  }

  return backgroundCount > 0 ? clutteredCount / backgroundCount : 0;
};

const getTiltEstimate = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number => {
  if (width < 3 || height <= 0) {
    return 0;
  }

  const thirdWidth = Math.max(1, Math.floor(width / 3));

  const findTopContentRow = (colStart: number, colEnd: number): number | undefined => {
    for (let row = 0; row < height; row += 1) {
      for (let col = colStart; col < colEnd; col += 1) {
        if (luminanceAt(pixels, row * width + col) >= PAPER_BRIGHTNESS_THRESHOLD) {
          return row;
        }
      }
    }
    return undefined;
  };

  const leftTop = findTopContentRow(0, thirdWidth);
  const rightTop = findTopContentRow(width - thirdWidth, width);

  if (leftTop === undefined || rightTop === undefined) {
    return 0;
  }

  return Math.abs(leftTop - rightTop) / height;
};

export const measureLiveDocumentQuality = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): LiveDocumentQualityMetrics => {
  const pixelCount = width * height;
  const luminanceValues: number[] = [];
  let brightnessTotal = 0;
  let glarePixelCount = 0;

  for (let i = 0; i < pixelCount; i += 1) {
    const luminance = luminanceAt(pixels, i);
    luminanceValues.push(luminance);
    brightnessTotal += luminance;
    if (luminance >= 252) {
      glarePixelCount += 1;
    }
  }

  const brightness = pixelCount > 0 ? brightnessTotal / pixelCount : 0;
  const document = getDocumentBounds(pixels, width, height);
  const bounds = document.bounds;
  const boundingArea = bounds ? bounds.width * bounds.height : 0;
  const documentCoverage = bounds
    ? Math.min(boundingArea, document.brightPixelRatio * 1.35)
    : 0;

  return {
    brightness,
    contrast: getContrast(luminanceValues, brightness),
    sharpness: getSharpness(pixels, width, height),
    glareRatio: pixelCount > 0 ? glarePixelCount / pixelCount : 0,
    documentCoverage,
    documentBounds: bounds,
    clippedEdgeCount: document.clippedEdgeCount,
    tilt: getTiltEstimate(pixels, width, height),
    backgroundClutter: getBackgroundClutter(pixels, width, height, bounds),
    textDensity: getTextDensity(pixels, width, height, bounds),
  };
};

const issueCopy: Record<LiveDocumentQualityIssue, string> = {
  no_document: LIVE_QUALITY_PLACE_DOCUMENT_IN_FRAME,
  too_far: LIVE_QUALITY_MOVE_CLOSER,
  too_close: LIVE_QUALITY_MOVE_BACK,
  clipped: LIVE_QUALITY_MOVE_BACK,
  blurred: LIVE_QUALITY_HOLD_STEADY,
  too_dark: LIVE_QUALITY_USE_MORE_LIGHT,
  low_contrast: LIVE_QUALITY_LOW_CONTRAST,
  glare: LIVE_QUALITY_AVOID_GLARE,
  tilted: LIVE_QUALITY_KEEP_FLAT,
  background_clutter: LIVE_QUALITY_BACKGROUND_CLUTTER,
  not_enough_text: LIVE_QUALITY_NOT_ENOUGH_TEXT,
  ready: LIVE_QUALITY_READY,
};

const getStatus = (issues: LiveDocumentQualityIssue[]): LiveDocumentQualityStatus => {
  if (issues.includes("ready")) {
    return "ready";
  }

  if (
    issues.some((issue) =>
      ["no_document", "clipped", "too_close", "too_far", "blurred", "too_dark", "glare"].includes(
        issue,
      ),
    )
  ) {
    return "poor";
  }

  return "okay";
};

const getScore = (issues: LiveDocumentQualityIssue[]): number => {
  if (issues.includes("ready")) {
    return 95;
  }

  const penaltyByIssue: Partial<Record<LiveDocumentQualityIssue, number>> = {
    no_document: 70,
    clipped: 45,
    too_close: 45,
    too_far: 35,
    blurred: 30,
    too_dark: 25,
    glare: 22,
    low_contrast: 15,
    tilted: 12,
    background_clutter: 10,
    not_enough_text: 12,
  };
  const penalty = issues.reduce((total, issue) => total + (penaltyByIssue[issue] ?? 0), 0);

  return Math.round(clamp(100 - penalty, 0, 100));
};

export const evaluateLiveDocumentQuality = (
  metrics: LiveDocumentQualityMetrics,
): LiveDocumentQualityResult => {
  const issues: LiveDocumentQualityIssue[] = [];

  if (!metrics.documentBounds || metrics.documentCoverage < MIN_VISIBLE_DOCUMENT_COVERAGE) {
    issues.push("no_document");
  } else {
    if (metrics.clippedEdgeCount > 0) {
      issues.push("clipped");
    }
    if (metrics.documentCoverage > MAX_DOCUMENT_COVERAGE) {
      issues.push("too_close");
    }
    if (metrics.documentCoverage < MIN_DOCUMENT_COVERAGE) {
      issues.push("too_far");
    }
  }

  if (metrics.sharpness < BLUR_SHARPNESS_THRESHOLD) {
    issues.push("blurred");
  }
  if (metrics.brightness < DARK_BRIGHTNESS_THRESHOLD) {
    issues.push("too_dark");
  }
  if (metrics.glareRatio > GLARE_RATIO_THRESHOLD) {
    issues.push("glare");
  }
  if (metrics.contrast < LOW_CONTRAST_THRESHOLD) {
    issues.push("low_contrast");
  }
  if (metrics.tilt > TILT_THRESHOLD) {
    issues.push("tilted");
  }
  if (metrics.backgroundClutter > BACKGROUND_CLUTTER_THRESHOLD) {
    issues.push("background_clutter");
  }
  if (metrics.documentBounds && metrics.textDensity < MIN_TEXT_DENSITY) {
    issues.push("not_enough_text");
  }

  if (issues.length === 0) {
    issues.push("ready");
  }

  const status = getStatus(issues);
  return {
    status,
    primaryInstruction: issueCopy[issues[0]],
    secondaryInstruction:
      status === "ready"
        ? LIVE_QUALITY_READY_SECONDARY
        : status === "poor"
          ? LIVE_QUALITY_POOR_SECONDARY
          : LIVE_QUALITY_OKAY_SECONDARY,
    score: getScore(issues),
    issues,
    metrics,
  };
};

export const analyseLiveDocumentPixels = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): LiveDocumentQualityResult => evaluateLiveDocumentQuality(measureLiveDocumentQuality(pixels, width, height));

export const getLiveDocumentQualitySampleSize = (
  width: number,
  height: number,
  maxDimension: number = LIVE_DOCUMENT_QUALITY_SAMPLE_MAX_DIMENSION,
): { width: number; height: number } => {
  if (!(width > 0) || !(height > 0)) {
    return { width: 1, height: 1 };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

export const analyseLiveVideoFrame = (
  video: HTMLVideoElement,
): LiveDocumentQualityResult | undefined => {
  if (!video.videoWidth || !video.videoHeight) {
    return undefined;
  }

  const sampleSize = getLiveDocumentQualitySampleSize(video.videoWidth, video.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize.width;
  canvas.height = sampleSize.height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return undefined;
  }

  context.drawImage(video, 0, 0, sampleSize.width, sampleSize.height);
  const pixels = context.getImageData(0, 0, sampleSize.width, sampleSize.height).data;

  return analyseLiveDocumentPixels(pixels, sampleSize.width, sampleSize.height);
};
