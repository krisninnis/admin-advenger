import {
  detectDocumentFromPixels,
  type DocumentScanFileResult,
  type DocumentScannerPoint,
  type DocumentScannerQuad,
} from "./documentScanner";
import {
  computeAverageBrightness,
  computeBlurVariance,
} from "./documentImageQuality";

export const A4_PORTRAIT_ASPECT_RATIO = 1 / Math.SQRT2;
export const CAMERA_LAB_ROUTE_PATH = "/dev/camera-lab";
export const CAMERA_LAB_RESULT_FILE_NAME = "camera-lab-capture.jpg";
export const CAMERA_LAB_TELEMETRY_FILE_NAME = "admin-avenger-camera-lab-telemetry.json";

export type CameraLabReadinessState = "not_ready" | "almost_ready" | "ready";
export type CameraLabCaptureMethod = "canvas" | "image_capture" | "system_camera" | "gallery";
export type CameraLabReviewMode = "prepared" | "comparison" | "fix_edges";
export type CameraLabLifecycleEvent =
  | "successful_capture"
  | "cancel"
  | "close"
  | "route_change"
  | "unmount"
  | "capture_error";

export type CameraLabSettings = {
  preferredWidth: number;
  preferredHeight: number;
  frameRate: number;
  facingMode: "environment" | "user";
  guideScale: number;
  stabilityDurationMs: number;
  documentCoverageMin: number;
  documentCoverageMax: number;
  skewTolerance: number;
  brightnessMin: number;
  brightnessMax: number;
  glareMax: number;
  sharpnessMin: number;
  quadIoUThreshold: number;
  maxAreaDelta: number;
  captureCooldownMs: number;
  outputMaxLongEdge: number;
  outputMimeType: "image/jpeg" | "image/webp";
  outputQuality: number;
  captureMethod: CameraLabCaptureMethod;
  assistedCapture: boolean;
  reviewMode: CameraLabReviewMode;
};

export type CameraLabGuideRect = {
  width: number;
  height: number;
  left: number;
  top: number;
  scale: number;
};

export type CameraLabQualityMeasurements = {
  readyState: CameraLabReadinessState;
  allFourCornersVisible: boolean;
  documentInsideFrame: boolean;
  coverageWithinRange: boolean;
  skewAcceptable: boolean;
  brightnessAcceptable: boolean;
  glareAcceptable: boolean;
  sharpnessAcceptable: boolean;
  cameraStable: boolean;
  quadStable: boolean;
  documentCoverage: number;
  skewMetric: number;
  brightnessMetric: number;
  glareMetric: number;
  sharpnessMetric: number;
  quadIoU: number;
  quadAreaDelta: number;
  stabilityDurationMs: number;
  warnings: string[];
  quad?: DocumentScannerQuad;
};

export type CameraLabCaptureDimensions = {
  width: number;
  height: number;
};

export type CameraLabCaptureResult = {
  file: File;
  sourceDimensions: CameraLabCaptureDimensions;
  outputDimensions: CameraLabCaptureDimensions;
  method: CameraLabCaptureMethod;
  fileSizeBytes: number;
};

export type CameraLabLifecycleRecord = {
  event: CameraLabLifecycleEvent;
  timestamp: string;
  hadStream: boolean;
  stoppedTrackCount: number;
};

export type CameraLabScannerTelemetry =
  | {
      status: "ready";
      sourceDimensions?: CameraLabCaptureDimensions;
      outputDimensions?: CameraLabCaptureDimensions;
      warnings: string[];
    }
  | {
      status: "rejected";
      code?: string;
      message?: string;
      sourceDimensions?: CameraLabCaptureDimensions;
      warnings: string[];
    };

export type CameraLabTelemetryEntry = {
  timestamp: string;
  browser: {
    userAgentFamily: string;
    platform: string;
    hardwareConcurrency?: number;
  };
  requestedConstraints: unknown;
  actualSettings: unknown;
  captureStrategy: CameraLabCaptureMethod;
  captureMethod: CameraLabCaptureMethod;
  sourceDimensions: CameraLabCaptureDimensions;
  outputDimensions: CameraLabCaptureDimensions;
  fileSizeBytes: number;
  captureSharpnessMetric: number;
  documentCoverage: number;
  allFourCornersVisible: boolean;
  skewMetric: number;
  sharpnessMetric: number;
  brightnessMetric: number;
  glareMetric: number;
  quadIoU: number;
  quadAreaDelta: number;
  stabilityDurationMs: number;
  scannerResult: CameraLabScannerTelemetry;
  lifecycleEvents: CameraLabLifecycleRecord[];
  warnings: string[];
  processingDurationMs: number;
};

export type CameraLabTelemetryExport = {
  version: "admin-avenger-camera-lab-v1";
  generatedAt: string;
  entries: CameraLabTelemetryEntry[];
};

type ImageCaptureLike = {
  takePhoto: () => Promise<Blob>;
};

type ImageCaptureConstructorLike = new (track: MediaStreamTrack) => ImageCaptureLike;

export const getDefaultCameraLabSettings = (): CameraLabSettings => ({
  preferredWidth: 1920,
  preferredHeight: 1080,
  frameRate: 30,
  facingMode: "environment",
  guideScale: 0.78,
  stabilityDurationMs: 700,
  documentCoverageMin: 0.34,
  documentCoverageMax: 0.9,
  skewTolerance: 0.18,
  brightnessMin: 70,
  brightnessMax: 235,
  glareMax: 0.18,
  sharpnessMin: 50,
  quadIoUThreshold: 0.85,
  maxAreaDelta: 0.15,
  captureCooldownMs: 1500,
  outputMaxLongEdge: 2400,
  outputMimeType: "image/jpeg",
  outputQuality: 0.95,
  captureMethod: "canvas",
  assistedCapture: false,
  reviewMode: "prepared",
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const createA4GuideRect = (
  frameWidth: number,
  frameHeight: number,
  scale: number,
): CameraLabGuideRect => {
  const safeWidth = Math.max(1, frameWidth);
  const safeHeight = Math.max(1, frameHeight);
  const safeScale = clamp(scale, 0.35, 0.95);
  let height = safeHeight * safeScale;
  let width = height * A4_PORTRAIT_ASPECT_RATIO;

  if (width > safeWidth * safeScale) {
    width = safeWidth * safeScale;
    height = width / A4_PORTRAIT_ASPECT_RATIO;
  }

  return {
    width,
    height,
    left: (safeWidth - width) / 2,
    top: (safeHeight - height) / 2,
    scale: safeScale,
  };
};

const getQuadPoints = (quad: DocumentScannerQuad): DocumentScannerPoint[] => [
  quad.topLeft,
  quad.topRight,
  quad.bottomRight,
  quad.bottomLeft,
];

const getDistance = (a: DocumentScannerPoint, b: DocumentScannerPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const calculateQuadAreaRatio = (
  quad: DocumentScannerQuad,
  frameWidth: number,
  frameHeight: number,
): number => {
  const points = getQuadPoints(quad);
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2 / Math.max(1, frameWidth * frameHeight);
};

type BoundingRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const getQuadBoundingRect = (quad: DocumentScannerQuad): BoundingRect => {
  const points = getQuadPoints(quad);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
};

const getRectArea = (rect: BoundingRect): number =>
  Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);

export const calculateQuadIoU = (
  currentQuad: DocumentScannerQuad | undefined,
  previousQuad: DocumentScannerQuad | undefined,
): number => {
  if (!currentQuad || !previousQuad) {
    return 0;
  }

  const currentRect = getQuadBoundingRect(currentQuad);
  const previousRect = getQuadBoundingRect(previousQuad);
  const intersection = {
    left: Math.max(currentRect.left, previousRect.left),
    top: Math.max(currentRect.top, previousRect.top),
    right: Math.min(currentRect.right, previousRect.right),
    bottom: Math.min(currentRect.bottom, previousRect.bottom),
  };
  const intersectionArea = getRectArea(intersection);
  const unionArea = getRectArea(currentRect) + getRectArea(previousRect) - intersectionArea;

  return unionArea > 0 ? intersectionArea / unionArea : 0;
};

export const calculateQuadAreaDelta = (
  currentQuad: DocumentScannerQuad | undefined,
  previousQuad: DocumentScannerQuad | undefined,
): number => {
  if (!currentQuad || !previousQuad) {
    return 1;
  }

  const currentArea = getRectArea(getQuadBoundingRect(currentQuad));
  const previousArea = getRectArea(getQuadBoundingRect(previousQuad));

  return Math.abs(currentArea - previousArea) / Math.max(currentArea, previousArea, 1);
};

export const evaluateQuadStability = (
  currentQuad: DocumentScannerQuad | undefined,
  previousQuad: DocumentScannerQuad | undefined,
  settings: Pick<CameraLabSettings, "quadIoUThreshold" | "maxAreaDelta">,
): Pick<CameraLabQualityMeasurements, "quadStable" | "quadIoU" | "quadAreaDelta"> => {
  const quadIoU = calculateQuadIoU(currentQuad, previousQuad);
  const quadAreaDelta = calculateQuadAreaDelta(currentQuad, previousQuad);

  return {
    quadStable:
      Boolean(currentQuad && previousQuad) &&
      quadIoU >= settings.quadIoUThreshold &&
      quadAreaDelta <= settings.maxAreaDelta,
    quadIoU,
    quadAreaDelta,
  };
};

export const areQuadCornersInsideFrame = (
  quad: DocumentScannerQuad | undefined,
  frameWidth: number,
  frameHeight: number,
): boolean => {
  if (!quad) {
    return false;
  }

  return getQuadPoints(quad).every(
    (point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= frameWidth &&
      point.y <= frameHeight,
  );
};

export const calculateQuadSkewMetric = (quad?: DocumentScannerQuad): number => {
  if (!quad) {
    return 1;
  }

  const topWidth = getDistance(quad.topLeft, quad.topRight);
  const bottomWidth = getDistance(quad.bottomLeft, quad.bottomRight);
  const leftHeight = getDistance(quad.topLeft, quad.bottomLeft);
  const rightHeight = getDistance(quad.topRight, quad.bottomRight);
  const widthSkew = Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth, 1);
  const heightSkew = Math.abs(leftHeight - rightHeight) / Math.max(leftHeight, rightHeight, 1);

  return Math.max(widthSkew, heightSkew);
};

export const computeGlareRatio = (pixels: Uint8ClampedArray): number => {
  const pixelCount = pixels.length / 4;

  if (pixelCount <= 0) {
    return 0;
  }

  let glarePixels = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    if (pixels[offset] >= 245 && pixels[offset + 1] >= 245 && pixels[offset + 2] >= 245) {
      glarePixels += 1;
    }
  }

  return glarePixels / pixelCount;
};

export const evaluateCameraLabReadiness = (
  metrics: Omit<CameraLabQualityMeasurements, "readyState" | "warnings">,
): CameraLabQualityMeasurements => {
  const warnings = [
    metrics.allFourCornersVisible ? undefined : "Four corners are not all visible.",
    metrics.documentInsideFrame ? undefined : "Document is not completely inside the frame.",
    metrics.coverageWithinRange ? undefined : "Document coverage is outside the configured range.",
    metrics.skewAcceptable ? undefined : "Skew is outside the configured tolerance.",
    metrics.brightnessAcceptable ? undefined : "Brightness is outside the configured range.",
    metrics.glareAcceptable ? undefined : "Glare appears excessive.",
    metrics.sharpnessAcceptable ? undefined : "Sharpness is below the configured threshold.",
    metrics.quadStable ? undefined : "Document edges are not stable yet.",
    metrics.cameraStable ? undefined : "Hold steady until the stability timer completes.",
  ].filter((warning): warning is string => Boolean(warning));
  const blockingFailures = warnings.filter(
    (warning) =>
      warning !== "Hold steady until the stability timer completes." &&
      warning !== "Document edges are not stable yet.",
  ).length;
  const readyState: CameraLabReadinessState =
    warnings.length === 0 ? "ready" : blockingFailures <= 1 ? "almost_ready" : "not_ready";

  return {
    ...metrics,
    readyState,
    warnings,
  };
};

export const analyzeCameraLabFrame = (
  pixels: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  settings: CameraLabSettings,
  stabilityDurationMs: number,
  quadStability: Pick<CameraLabQualityMeasurements, "quadStable" | "quadIoU" | "quadAreaDelta"> = {
    quadStable: true,
    quadIoU: 1,
    quadAreaDelta: 0,
  },
): CameraLabQualityMeasurements => {
  const detection = detectDocumentFromPixels(pixels, frameWidth, frameHeight);
  const quad = detection.status === "detected" ? detection.quad : undefined;
  const documentCoverage = quad ? calculateQuadAreaRatio(quad, frameWidth, frameHeight) : 0;
  const skewMetric = calculateQuadSkewMetric(quad);
  const brightnessMetric = computeAverageBrightness(pixels);
  const sharpnessMetric = computeBlurVariance(pixels, frameWidth, frameHeight);
  const glareMetric = computeGlareRatio(pixels);
  const allFourCornersVisible = areQuadCornersInsideFrame(quad, frameWidth, frameHeight);

  return evaluateCameraLabReadiness({
    allFourCornersVisible,
    documentInsideFrame: allFourCornersVisible,
    coverageWithinRange:
      documentCoverage >= settings.documentCoverageMin &&
      documentCoverage <= settings.documentCoverageMax,
    skewAcceptable: skewMetric <= settings.skewTolerance,
    brightnessAcceptable:
      brightnessMetric >= settings.brightnessMin && brightnessMetric <= settings.brightnessMax,
    glareAcceptable: glareMetric <= settings.glareMax,
    sharpnessAcceptable: sharpnessMetric >= settings.sharpnessMin,
    cameraStable: stabilityDurationMs >= settings.stabilityDurationMs,
    quadStable: quadStability.quadStable,
    documentCoverage,
    skewMetric,
    brightnessMetric,
    glareMetric,
    sharpnessMetric,
    quadIoU: quadStability.quadIoU,
    quadAreaDelta: quadStability.quadAreaDelta,
    stabilityDurationMs,
    quad,
  });
};

export const getCameraLabReadinessLabel = (state: CameraLabReadinessState): string => {
  switch (state) {
    case "ready":
      return "Ready";
    case "almost_ready":
      return "Almost ready";
    default:
      return "Not ready";
  }
};

export type CameraLabGuidanceInstruction =
  | "No document found."
  | "Keep all four corners inside."
  | "Move further away."
  | "Move closer."
  | "Hold the phone level."
  | "More light needed."
  | "Reduce glare."
  | "Hold still."
  | "Ready.";

export const selectCameraLabGuidanceInstruction = (
  measurements: CameraLabQualityMeasurements,
  settings: Pick<
    CameraLabSettings,
    "documentCoverageMin" | "documentCoverageMax" | "brightnessMin"
  >,
): CameraLabGuidanceInstruction => {
  if (!measurements.quad) {
    return "No document found.";
  }

  if (!measurements.allFourCornersVisible || !measurements.documentInsideFrame) {
    return "Keep all four corners inside.";
  }

  if (measurements.documentCoverage > settings.documentCoverageMax) {
    return "Move further away.";
  }

  if (measurements.documentCoverage < settings.documentCoverageMin) {
    return "Move closer.";
  }

  if (!measurements.skewAcceptable) {
    return "Hold the phone level.";
  }

  if (!measurements.brightnessAcceptable && measurements.brightnessMetric < settings.brightnessMin) {
    return "More light needed.";
  }

  if (!measurements.glareAcceptable) {
    return "Reduce glare.";
  }

  if (!measurements.sharpnessAcceptable || !measurements.quadStable || !measurements.cameraStable) {
    return "Hold still.";
  }

  return "Ready.";
};

export const hasCapability = (
  capabilities: MediaTrackCapabilities | undefined,
  key: string,
): boolean => {
  const value = capabilities ? (capabilities as Record<string, unknown>)[key] : undefined;

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined;
};

export const isImageCaptureAvailable = (
  globalScope: { ImageCapture?: unknown } | undefined = globalThis as { ImageCapture?: unknown },
): boolean => typeof globalScope?.ImageCapture === "function";

export const isCameraLabCaptureReady = (measurements: CameraLabQualityMeasurements): boolean =>
  Boolean(measurements.quad) &&
  measurements.allFourCornersVisible &&
  measurements.documentInsideFrame &&
  measurements.coverageWithinRange &&
  measurements.skewAcceptable &&
  measurements.sharpnessAcceptable &&
  measurements.brightnessAcceptable &&
  measurements.glareAcceptable &&
  measurements.quadStable &&
  measurements.cameraStable &&
  measurements.readyState === "ready";

export const shouldTriggerAssistedCapture = (input: {
  assistedCapture: boolean;
  measurements: CameraLabQualityMeasurements;
  isCapturing: boolean;
  captureAlreadyTriggered: boolean;
  cooldownRemainingMs: number;
}): boolean =>
  input.assistedCapture &&
  isCameraLabCaptureReady(input.measurements) &&
  !input.isCapturing &&
  !input.captureAlreadyTriggered &&
  input.cooldownRemainingMs <= 0;

export const buildCameraLabVideoConstraints = (
  settings: CameraLabSettings,
  deviceId?: string,
): MediaStreamConstraints => ({
  video: {
    facingMode: settings.facingMode,
    width: { ideal: settings.preferredWidth },
    height: { ideal: settings.preferredHeight },
    frameRate: { ideal: settings.frameRate },
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  },
});

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not capture a camera-lab frame."));
      },
      type,
      quality,
    );
  });

export const captureCameraLabCanvasFrame = async (
  video: HTMLVideoElement,
  settings: Pick<CameraLabSettings, "outputMaxLongEdge" | "outputMimeType" | "outputQuality">,
): Promise<CameraLabCaptureResult> => {
  const sourceWidth = video.videoWidth || 1920;
  const sourceHeight = video.videoHeight || 1080;
  const scale = Math.min(1, settings.outputMaxLongEdge / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not capture a camera-lab frame.");
  }

  context.drawImage(video, 0, 0, outputWidth, outputHeight);
  const blob = await canvasToBlob(canvas, settings.outputMimeType, settings.outputQuality);

  return {
    file: new File([blob], CAMERA_LAB_RESULT_FILE_NAME, { type: blob.type || settings.outputMimeType }),
    sourceDimensions: { width: sourceWidth, height: sourceHeight },
    outputDimensions: { width: outputWidth, height: outputHeight },
    method: "canvas",
    fileSizeBytes: blob.size,
  };
};

export const getImageBlobDimensions = (blob: Blob): Promise<CameraLabCaptureDimensions> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const element = new Image();
    const cleanUp = () => URL.revokeObjectURL(objectUrl);

    element.onload = () => {
      const width = element.naturalWidth;
      const height = element.naturalHeight;
      cleanUp();
      resolve({ width, height });
    };
    element.onerror = () => {
      cleanUp();
      reject(new Error("Could not inspect the captured photo dimensions."));
    };
    element.src = objectUrl;
  });

export const captureCameraLabImageCapturePhoto = async (
  track: MediaStreamTrack,
  imageCaptureConstructor: ImageCaptureConstructorLike | undefined =
    (globalThis as { ImageCapture?: ImageCaptureConstructorLike }).ImageCapture,
): Promise<CameraLabCaptureResult> => {
  if (!imageCaptureConstructor) {
    throw new Error("ImageCapture.takePhoto() is not available in this browser.");
  }

  const settings = track.getSettings();
  const imageCapture = new imageCaptureConstructor(track);
  const blob = await imageCapture.takePhoto();
  const outputDimensions = await getImageBlobDimensions(blob);

  return {
    file: new File([blob], CAMERA_LAB_RESULT_FILE_NAME, { type: blob.type || "image/jpeg" }),
    sourceDimensions: {
      width: settings.width ?? outputDimensions.width,
      height: settings.height ?? outputDimensions.height,
    },
    outputDimensions,
    method: "image_capture",
    fileSizeBytes: blob.size,
  };
};

export const createCameraLabFileCaptureResult = async (
  file: File,
  method: Extract<CameraLabCaptureMethod, "system_camera" | "gallery">,
  inspectDimensions: (blob: Blob) => Promise<CameraLabCaptureDimensions> = getImageBlobDimensions,
): Promise<CameraLabCaptureResult> => {
  const dimensions = await inspectDimensions(file);

  return {
    file,
    sourceDimensions: dimensions,
    outputDimensions: dimensions,
    method,
    fileSizeBytes: file.size,
  };
};

export const measureCameraLabFileSharpness = async (
  file: File,
  maxLongEdge = 720,
): Promise<number> => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not inspect capture sharpness."));
      image.src = objectUrl;
    });

    const sourceWidth = image.naturalWidth || 1;
    const sourceHeight = image.naturalHeight || 1;
    const scale = Math.min(1, maxLongEdge / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not inspect capture sharpness.");
    }

    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;

    return computeBlurVariance(pixels, width, height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const summarizeScannerResultForTelemetry = (
  result: DocumentScanFileResult,
): CameraLabScannerTelemetry => {
  if (result.status === "ready") {
    return {
      status: "ready",
      sourceDimensions: result.sourceDimensions,
      outputDimensions: {
        width: result.quad ? Math.round(result.quad.topRight.x - result.quad.topLeft.x) : 0,
        height: result.quad ? Math.round(result.quad.bottomLeft.y - result.quad.topLeft.y) : 0,
      },
      warnings: result.warnings,
    };
  }

  return {
    status: "rejected",
    code: result.code,
    message: result.message,
    sourceDimensions: result.sourceDimensions,
    warnings: result.warnings,
  };
};

const prohibitedTelemetryKeys = new Set([
  "image",
  "imageData",
  "pixels",
  "bytes",
  "rawBytes",
  "ocrText",
  "text",
  "file",
  "fileName",
  "filename",
  "documentName",
  "name",
  "path",
  "localPath",
  "userName",
  "username",
  "sourceFile",
  "scannedFile",
  "token",
  "secret",
  "apiKey",
  "api-key",
]);

const prohibitedStringPattern =
  /([A-Z]:\\|\/Users\/|\\Users\\|AppData|x-vercel-protection-bypass|BEGIN PRIVATE|PRIVATE KEY|secret|token)/i;

export const sanitizeCameraLabTelemetryValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return prohibitedStringPattern.test(value) ? "[redacted]" : value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeCameraLabTelemetryValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !prohibitedTelemetryKeys.has(key))
        .map(([key, nestedValue]) => [key, sanitizeCameraLabTelemetryValue(nestedValue)]),
    );
  }

  return value;
};

export const createCameraLabTelemetryEntry = (input: {
  timestamp: string;
  browser: CameraLabTelemetryEntry["browser"];
  requestedConstraints: unknown;
  actualSettings: unknown;
  captureMethod: CameraLabCaptureMethod;
  sourceDimensions: CameraLabCaptureDimensions;
  outputDimensions: CameraLabCaptureDimensions;
  fileSizeBytes: number;
  captureSharpnessMetric: number;
  measurements: CameraLabQualityMeasurements;
  scannerResult: DocumentScanFileResult;
  lifecycleEvents: CameraLabLifecycleRecord[];
  processingDurationMs: number;
}): CameraLabTelemetryEntry =>
  sanitizeCameraLabTelemetryValue({
    timestamp: input.timestamp,
    browser: input.browser,
    requestedConstraints: input.requestedConstraints,
    actualSettings: input.actualSettings,
    captureStrategy: input.captureMethod,
    captureMethod: input.captureMethod,
    sourceDimensions: input.sourceDimensions,
    outputDimensions: input.outputDimensions,
    fileSizeBytes: input.fileSizeBytes,
    captureSharpnessMetric: input.captureSharpnessMetric,
    documentCoverage: input.measurements.documentCoverage,
    allFourCornersVisible: input.measurements.allFourCornersVisible,
    skewMetric: input.measurements.skewMetric,
    sharpnessMetric: input.measurements.sharpnessMetric,
    brightnessMetric: input.measurements.brightnessMetric,
    glareMetric: input.measurements.glareMetric,
    quadIoU: input.measurements.quadIoU,
    quadAreaDelta: input.measurements.quadAreaDelta,
    stabilityDurationMs: input.measurements.stabilityDurationMs,
    scannerResult: summarizeScannerResultForTelemetry(input.scannerResult),
    lifecycleEvents: input.lifecycleEvents,
    warnings: input.measurements.warnings,
    processingDurationMs: input.processingDurationMs,
  }) as CameraLabTelemetryEntry;

export const createCameraLabTelemetryExport = (
  entries: CameraLabTelemetryEntry[],
  generatedAt: string,
): CameraLabTelemetryExport => ({
  version: "admin-avenger-camera-lab-v1",
  generatedAt,
  entries: entries.map((entry) => sanitizeCameraLabTelemetryValue(entry) as CameraLabTelemetryEntry),
});
