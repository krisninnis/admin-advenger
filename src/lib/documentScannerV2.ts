import {
  detectDocumentFromPixels,
  getPerspectiveOutputSize,
  validateDocumentQuad,
  type DocumentScanDetectionResult,
  type DocumentScannerPoint,
  type DocumentScannerQuad,
} from "./documentScanner";

export type DocumentEnhancementMode = "original" | "clean" | "grayscale" | "black_and_white";

export type DocumentScannerV2Preparation = {
  sourceFile: File;
  sourceDimensions: { width: number; height: number };
  quad: DocumentScannerQuad;
  detectedQuad?: DocumentScannerQuad;
  detection: DocumentScanDetectionResult;
  warnings: string[];
};

export type DocumentScannerEngine = {
  readonly id: string;
  readonly status: "provisional_pending_device_acceptance";
  detectPixels: (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
  ) => DocumentScanDetectionResult;
  prepare: (file: File) => Promise<DocumentScannerV2Preparation>;
  render: (
    file: File,
    quad: DocumentScannerQuad,
    mode: DocumentEnhancementMode,
  ) => Promise<File>;
};

export const SCANNER_V2_ENGINE_STATUS = "PROVISIONAL PENDING REAL-DEVICE ACCEPTANCE";
export const SCANNER_V2_MANUAL_FALLBACK_WARNING =
  "AdminAvenger could not find every page edge. Check the corners or use the full image before continuing.";

const ANALYSIS_MAX_LONG_EDGE = 720;
const OUTPUT_MAX_LONG_EDGE = 2200;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getLuminance = (red: number, green: number, blue: number): number =>
  0.299 * red + 0.587 * green + 0.114 * blue;

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.95,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not prepare the document scan."));
      },
      type,
      quality,
    );
  });

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("Could not load this photo in the browser."));
    };
    image.src = objectUrl;
  });

export const getDefaultDocumentQuad = (
  width: number,
  height: number,
  insetRatio = 0.06,
): DocumentScannerQuad => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const insetX = safeWidth * clamp(insetRatio, 0, 0.35);
  const insetY = safeHeight * clamp(insetRatio, 0, 0.35);

  return {
    topLeft: { x: insetX, y: insetY },
    topRight: { x: safeWidth - insetX, y: insetY },
    bottomRight: { x: safeWidth - insetX, y: safeHeight - insetY },
    bottomLeft: { x: insetX, y: safeHeight - insetY },
  };
};

export const getFullImageQuad = (width: number, height: number): DocumentScannerQuad => ({
  topLeft: { x: 0, y: 0 },
  topRight: { x: Math.max(1, width) - 1, y: 0 },
  bottomRight: { x: Math.max(1, width) - 1, y: Math.max(1, height) - 1 },
  bottomLeft: { x: 0, y: Math.max(1, height) - 1 },
});

export const clampDocumentPoint = (
  point: DocumentScannerPoint,
  width: number,
  height: number,
): DocumentScannerPoint => ({
  x: clamp(point.x, 0, Math.max(0, width - 1)),
  y: clamp(point.y, 0, Math.max(0, height - 1)),
});

export const updateDocumentQuadPoint = (
  quad: DocumentScannerQuad,
  key: keyof DocumentScannerQuad,
  point: DocumentScannerPoint,
  width: number,
  height: number,
): DocumentScannerQuad => ({
  ...quad,
  [key]: clampDocumentPoint(point, width, height),
});

const scaleQuad = (
  quad: DocumentScannerQuad,
  scaleX: number,
  scaleY: number,
): DocumentScannerQuad => ({
  topLeft: { x: quad.topLeft.x * scaleX, y: quad.topLeft.y * scaleY },
  topRight: { x: quad.topRight.x * scaleX, y: quad.topRight.y * scaleY },
  bottomRight: { x: quad.bottomRight.x * scaleX, y: quad.bottomRight.y * scaleY },
  bottomLeft: { x: quad.bottomLeft.x * scaleX, y: quad.bottomLeft.y * scaleY },
});

export const applyDocumentEnhancement = (
  imageData: ImageData,
  mode: DocumentEnhancementMode,
): void => {
  if (mode === "original") {
    return;
  }

  let min = 255;
  let max = 0;
  let luminanceTotal = 0;
  const pixelCount = Math.max(1, imageData.data.length / 4);

  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const luminance = getLuminance(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
    );
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
    luminanceTotal += luminance;
  }

  const range = Math.max(48, max - min);
  const threshold = luminanceTotal / pixelCount;

  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const red = imageData.data[offset];
    const green = imageData.data[offset + 1];
    const blue = imageData.data[offset + 2];
    const luminance = getLuminance(red, green, blue);

    if (mode === "clean") {
      const normalized = clamp((luminance - min) / range, 0, 1);
      const gain = 0.88 + normalized * 0.24;
      imageData.data[offset] = clamp(Math.round((red - 128) * 1.08 + 128 * gain), 0, 255);
      imageData.data[offset + 1] = clamp(
        Math.round((green - 128) * 1.08 + 128 * gain),
        0,
        255,
      );
      imageData.data[offset + 2] = clamp(
        Math.round((blue - 128) * 1.08 + 128 * gain),
        0,
        255,
      );
    } else if (mode === "grayscale") {
      const value = clamp(Math.round(((luminance - min) / range) * 255), 0, 255);
      imageData.data[offset] = value;
      imageData.data[offset + 1] = value;
      imageData.data[offset + 2] = value;
    } else {
      const value = luminance >= threshold ? 255 : 0;
      imageData.data[offset] = value;
      imageData.data[offset + 1] = value;
      imageData.data[offset + 2] = value;
    }

    imageData.data[offset + 3] = 255;
  }
};

const sampleSourcePixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number] => {
  const sourceX = clamp(Math.round(x), 0, width - 1);
  const sourceY = clamp(Math.round(y), 0, height - 1);
  const offset = (sourceY * width + sourceX) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
};

const createScannedDocumentFile = (
  blob: Blob,
  sourceName: string,
  mode: DocumentEnhancementMode,
): File => {
  const baseName = sourceName.replace(/\.[^.]+$/, "") || "document";
  return new File([blob], `scan-${mode}-${baseName}.jpg`, {
    type: blob.type || "image/jpeg",
  });
};

const renderPerspectiveDocument = async (
  image: HTMLImageElement,
  quad: DocumentScannerQuad,
  mode: DocumentEnhancementMode,
): Promise<Blob> => {
  const validation = validateDocumentQuad(quad, image.naturalWidth, image.naturalHeight);
  if (!validation.valid) {
    throw new Error("The selected crop is not a valid document shape.");
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) {
    throw new Error("Could not read this document photo.");
  }
  sourceContext.drawImage(image, 0, 0);
  const sourceImage = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  const requestedSize = getPerspectiveOutputSize(quad);
  const outputScale = Math.min(
    1,
    OUTPUT_MAX_LONG_EDGE / Math.max(requestedSize.width, requestedSize.height),
  );
  const outputWidth = Math.max(1, Math.round(requestedSize.width * outputScale));
  const outputHeight = Math.max(1, Math.round(requestedSize.height * outputScale));
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });
  if (!outputContext) {
    throw new Error("Could not prepare the document scan.");
  }
  const outputImage = outputContext.createImageData(outputWidth, outputHeight);

  for (let row = 0; row < outputHeight; row += 1) {
    const v = outputHeight === 1 ? 0 : row / (outputHeight - 1);
    for (let col = 0; col < outputWidth; col += 1) {
      const u = outputWidth === 1 ? 0 : col / (outputWidth - 1);
      const topX = quad.topLeft.x + (quad.topRight.x - quad.topLeft.x) * u;
      const topY = quad.topLeft.y + (quad.topRight.y - quad.topLeft.y) * u;
      const bottomX = quad.bottomLeft.x + (quad.bottomRight.x - quad.bottomLeft.x) * u;
      const bottomY = quad.bottomLeft.y + (quad.bottomRight.y - quad.bottomLeft.y) * u;
      const sourceX = topX + (bottomX - topX) * v;
      const sourceY = topY + (bottomY - topY) * v;
      const [red, green, blue] = sampleSourcePixel(
        sourceImage.data,
        sourceImage.width,
        sourceImage.height,
        sourceX,
        sourceY,
      );
      const offset = (row * outputWidth + col) * 4;
      outputImage.data[offset] = red;
      outputImage.data[offset + 1] = green;
      outputImage.data[offset + 2] = blue;
      outputImage.data[offset + 3] = 255;
    }
  }

  applyDocumentEnhancement(outputImage, mode);
  outputContext.putImageData(outputImage, 0, 0);
  return canvasToBlob(outputCanvas, "image/jpeg", 0.95);
};

const prepareWithCurrentEngine = async (file: File): Promise<DocumentScannerV2Preparation> => {
  const image = await loadImageElement(file);
  const sourceDimensions = { width: image.naturalWidth, height: image.naturalHeight };
  const analysisScale = Math.min(
    1,
    ANALYSIS_MAX_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const analysisCanvas = document.createElement("canvas");
  analysisCanvas.width = Math.max(1, Math.round(image.naturalWidth * analysisScale));
  analysisCanvas.height = Math.max(1, Math.round(image.naturalHeight * analysisScale));
  const context = analysisCanvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not inspect this photo in the browser.");
  }
  context.drawImage(image, 0, 0, analysisCanvas.width, analysisCanvas.height);
  const imageData = context.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
  const detection = detectDocumentFromPixels(
    imageData.data,
    analysisCanvas.width,
    analysisCanvas.height,
  );

  if (detection.status === "detected") {
    const detectedQuad = scaleQuad(
      detection.quad,
      image.naturalWidth / analysisCanvas.width,
      image.naturalHeight / analysisCanvas.height,
    );
    return {
      sourceFile: file,
      sourceDimensions,
      quad: detectedQuad,
      detectedQuad,
      detection,
      warnings: detection.warnings,
    };
  }

  return {
    sourceFile: file,
    sourceDimensions,
    quad: getDefaultDocumentQuad(image.naturalWidth, image.naturalHeight),
    detection,
    warnings: [SCANNER_V2_MANUAL_FALLBACK_WARNING],
  };
};

export const currentDocumentScannerEngine: DocumentScannerEngine = {
  id: "adminavenger-current-v2-provisional",
  status: "provisional_pending_device_acceptance",
  detectPixels: detectDocumentFromPixels,
  prepare: prepareWithCurrentEngine,
  render: async (file, quad, mode) => {
    const image = await loadImageElement(file);
    const blob = await renderPerspectiveDocument(image, quad, mode);
    return createScannedDocumentFile(blob, file.name, mode);
  },
};

export const getDocumentScannerEngine = async (): Promise<DocumentScannerEngine> =>
  currentDocumentScannerEngine;
