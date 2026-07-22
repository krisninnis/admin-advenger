export type DocumentScannerPoint = {
  x: number;
  y: number;
};

export type DocumentScannerQuad = {
  topLeft: DocumentScannerPoint;
  topRight: DocumentScannerPoint;
  bottomRight: DocumentScannerPoint;
  bottomLeft: DocumentScannerPoint;
};

export type DocumentScanRejectionCode =
  | "invalid_dimensions"
  | "blank_dark"
  | "blank_light"
  | "no_meaningful_content"
  | "no_document_detected"
  | "too_much_background"
  | "document_shape_unclear"
  | "scanner_unavailable";

export type DocumentScanDetectionResult =
  | {
      status: "detected";
      quad: DocumentScannerQuad;
      areaRatio: number;
      documentPixelRatio: number;
      warnings: string[];
    }
  | {
      status: "rejected";
      code: DocumentScanRejectionCode;
      message: string;
      warnings: string[];
    };

export type DocumentScanFileResult =
  | {
      status: "ready";
      sourceFile: File;
      scannedFile: File;
      sourceDimensions: { width: number; height: number };
      quad: DocumentScannerQuad;
      warnings: string[];
    }
  | {
      status: "rejected";
      sourceFile: File;
      sourceDimensions?: { width: number; height: number };
      code: DocumentScanRejectionCode;
      message: string;
      warnings: string[];
    };

export const DOCUMENT_SCAN_LOADING_MESSAGE = "Loading your photo...";
export const DOCUMENT_SCAN_DETECTING_MESSAGE = "Finding the document...";
export const DOCUMENT_SCAN_READY_MESSAGE = "Document found. Review the prepared scan.";
export const DOCUMENT_SCAN_REJECTION_MESSAGE =
  "We couldn\u2019t find a clear document in this photo.";
export const DOCUMENT_NO_DOCUMENT_MESSAGE = DOCUMENT_SCAN_REJECTION_MESSAGE;
export const DOCUMENT_TOO_MUCH_BACKGROUND_MESSAGE = DOCUMENT_SCAN_REJECTION_MESSAGE;
export const DOCUMENT_SCANNER_UNAVAILABLE_MESSAGE = DOCUMENT_SCAN_REJECTION_MESSAGE;
export const DOCUMENT_SCAN_WARNING = "Check the scan before relying on it.";

const ANALYSIS_MAX_LONG_EDGE = 720;
const OUTPUT_MAX_LONG_EDGE = 2200;
const MIN_DOCUMENT_AREA_RATIO = 0.12;
const MIN_DOCUMENT_PIXEL_RATIO = 0.025;
const MIN_MEANINGFUL_EDGE_DENSITY = 0.002;
const MIN_MEANINGFUL_STD_DEV = 6;
const MIN_DOCUMENT_FILL_RATIO = 0.42;
const MIN_SAFE_DOCUMENT_AREA_WITH_TEXTURED_BACKGROUND = 0.32;
const TEXTURED_BACKGROUND_EDGE_DENSITY = 0.012;
const TEXTURED_BACKGROUND_BRIGHT_RATIO = 0.08;
const UNCLEAR_FULL_FRAME_AREA_RATIO = 0.92;
const UNCLEAR_FULL_FRAME_EDGE_DENSITY = 0.012;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getLuminance = (red: number, green: number, blue: number): number =>
  0.299 * red + 0.587 * green + 0.114 * blue;

const getDistance = (a: DocumentScannerPoint, b: DocumentScannerPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const getQuadPoints = (quad: DocumentScannerQuad): DocumentScannerPoint[] => [
  quad.topLeft,
  quad.topRight,
  quad.bottomRight,
  quad.bottomLeft,
];

const getQuadArea = (quad: DocumentScannerQuad): number => {
  const points = getQuadPoints(quad);
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }

  return Math.abs(area) / 2;
};

const pointInQuad = (point: DocumentScannerPoint, quad: DocumentScannerQuad): boolean => {
  const polygon = getQuadPoints(quad);
  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index, index += 1
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const measureDocumentScene = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  quad: DocumentScannerQuad,
  threshold: number,
): {
  documentFillRatio: number;
  outsideBrightRatio: number;
  outsideEdgeDensity: number;
  touchesFrame: boolean;
} => {
  let insidePixelCount = 0;
  let insideBrightCount = 0;
  let outsidePixelCount = 0;
  let outsideBrightCount = 0;
  let outsideEdgeCount = 0;
  let outsideEdgeComparisons = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const offset = (row * width + col) * 4;
      const luminance = getLuminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      const inside = pointInQuad({ x: col, y: row }, quad);

      if (inside) {
        insidePixelCount += 1;
        if (luminance >= threshold) {
          insideBrightCount += 1;
        }
      } else {
        outsidePixelCount += 1;
        if (luminance >= threshold) {
          outsideBrightCount += 1;
        }
      }

      if (col + 1 < width) {
        const rightOffset = offset + 4;
        const right = getLuminance(
          pixels[rightOffset],
          pixels[rightOffset + 1],
          pixels[rightOffset + 2],
        );

        if (!pointInQuad({ x: col + 0.5, y: row }, quad)) {
          outsideEdgeComparisons += 1;
          if (Math.abs(luminance - right) > 32) {
            outsideEdgeCount += 1;
          }
        }
      }

      if (row + 1 < height) {
        const belowOffset = offset + width * 4;
        const below = getLuminance(
          pixels[belowOffset],
          pixels[belowOffset + 1],
          pixels[belowOffset + 2],
        );

        if (!pointInQuad({ x: col, y: row + 0.5 }, quad)) {
          outsideEdgeComparisons += 1;
          if (Math.abs(luminance - below) > 32) {
            outsideEdgeCount += 1;
          }
        }
      }
    }
  }

  const points = getQuadPoints(quad);
  const touchesFrame = points.some(
    (point) =>
      point.x <= 1 ||
      point.y <= 1 ||
      point.x >= width - 2 ||
      point.y >= height - 2,
  );

  return {
    documentFillRatio: insideBrightCount / Math.max(1, insidePixelCount),
    outsideBrightRatio: outsideBrightCount / Math.max(1, outsidePixelCount),
    outsideEdgeDensity: outsideEdgeCount / Math.max(1, outsideEdgeComparisons),
    touchesFrame,
  };
};

export const orderCornerPoints = (
  points: DocumentScannerPoint[],
): DocumentScannerQuad => {
  if (points.length !== 4) {
    throw new Error("Exactly four points are required.");
  }

  const finitePoints = points.map((point) => ({
    x: Number.isFinite(point.x) ? point.x : 0,
    y: Number.isFinite(point.y) ? point.y : 0,
  }));

  const bySum = [...finitePoints].sort((a, b) => a.x + a.y - (b.x + b.y));
  const byDifference = [...finitePoints].sort((a, b) => a.x - a.y - (b.x - b.y));

  return {
    topLeft: bySum[0],
    topRight: byDifference[3],
    bottomRight: bySum[3],
    bottomLeft: byDifference[0],
  };
};

export const validateDocumentQuad = (
  quad: DocumentScannerQuad,
  width: number,
  height: number,
): { valid: boolean; reason?: string } => {
  if (!(width > 0) || !(height > 0)) {
    return { valid: false, reason: "invalid_dimensions" };
  }

  const points = getQuadPoints(quad);
  const withinBounds = points.every(
    (point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= -1 &&
      point.y >= -1 &&
      point.x <= width + 1 &&
      point.y <= height + 1,
  );

  if (!withinBounds) {
    return { valid: false, reason: "out_of_bounds" };
  }

  const areaRatio = getQuadArea(quad) / (width * height);
  if (areaRatio < MIN_DOCUMENT_AREA_RATIO || areaRatio > 1.05) {
    return { valid: false, reason: "implausible_area" };
  }

  const shortestSide = Math.min(
    getDistance(quad.topLeft, quad.topRight),
    getDistance(quad.topRight, quad.bottomRight),
    getDistance(quad.bottomRight, quad.bottomLeft),
    getDistance(quad.bottomLeft, quad.topLeft),
  );

  if (shortestSide < Math.min(width, height) * 0.16) {
    return { valid: false, reason: "too_small" };
  }

  return { valid: true };
};

export const getPerspectiveOutputSize = (
  quad: DocumentScannerQuad,
): { width: number; height: number } => {
  const topWidth = getDistance(quad.topLeft, quad.topRight);
  const bottomWidth = getDistance(quad.bottomLeft, quad.bottomRight);
  const leftHeight = getDistance(quad.topLeft, quad.bottomLeft);
  const rightHeight = getDistance(quad.topRight, quad.bottomRight);
  const rawWidth = Math.max(topWidth, bottomWidth, 1);
  const rawHeight = Math.max(leftHeight, rightHeight, 1);
  const scale = Math.min(1, OUTPUT_MAX_LONG_EDGE / Math.max(rawWidth, rawHeight));

  return {
    width: Math.max(1, Math.round(rawWidth * scale)),
    height: Math.max(1, Math.round(rawHeight * scale)),
  };
};

const buildRejection = (
  code: DocumentScanRejectionCode,
  options: {
    message?: string;
    warnings?: string[];
  } = {},
): Extract<DocumentScanDetectionResult, { status: "rejected" }> => ({
  status: "rejected",
  code,
  message: options.message ?? DOCUMENT_SCAN_REJECTION_MESSAGE,
  warnings: options.warnings ?? [],
});

export const detectDocumentFromPixels = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): DocumentScanDetectionResult => {
  if (
    !(width > 0) ||
    !(height > 0) ||
    pixels.length < width * height * 4
  ) {
    return buildRejection("invalid_dimensions", {
      message: DOCUMENT_SCAN_REJECTION_MESSAGE,
    });
  }

  const pixelCount = width * height;
  let luminanceSum = 0;
  let luminanceSquaredSum = 0;
  let edgeCount = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const offset = (row * width + col) * 4;
      const luminance = getLuminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      luminanceSum += luminance;
      luminanceSquaredSum += luminance * luminance;

      if (col + 1 < width) {
        const rightOffset = offset + 4;
        const right = getLuminance(
          pixels[rightOffset],
          pixels[rightOffset + 1],
          pixels[rightOffset + 2],
        );
        if (Math.abs(luminance - right) > 32) {
          edgeCount += 1;
        }
      }

      if (row + 1 < height) {
        const belowOffset = offset + width * 4;
        const below = getLuminance(
          pixels[belowOffset],
          pixels[belowOffset + 1],
          pixels[belowOffset + 2],
        );
        if (Math.abs(luminance - below) > 32) {
          edgeCount += 1;
        }
      }
    }
  }

  const mean = luminanceSum / pixelCount;
  const variance = luminanceSquaredSum / pixelCount - mean * mean;
  const standardDeviation = Math.sqrt(Math.max(0, variance));
  const edgeDensity = edgeCount / Math.max(1, pixelCount * 2);

  if (mean < 30 && standardDeviation < 8 && edgeDensity < MIN_MEANINGFUL_EDGE_DENSITY) {
    return buildRejection("blank_dark");
  }

  if (mean > 245 && standardDeviation < 8 && edgeDensity < MIN_MEANINGFUL_EDGE_DENSITY) {
    return buildRejection("blank_light");
  }

  if (
    standardDeviation < MIN_MEANINGFUL_STD_DEV &&
    edgeDensity < MIN_MEANINGFUL_EDGE_DENSITY
  ) {
    return buildRejection("no_meaningful_content");
  }

  const threshold = clamp(mean + Math.max(18, standardDeviation * 0.35), 95, 235);
  const candidatePoints: DocumentScannerPoint[] = [];
  let documentPixelCount = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const offset = (row * width + col) * 4;
      const luminance = getLuminance(pixels[offset], pixels[offset + 1], pixels[offset + 2]);

      if (luminance >= threshold) {
        documentPixelCount += 1;
        candidatePoints.push({ x: col, y: row });
      }
    }
  }

  const documentPixelRatio = documentPixelCount / pixelCount;
  if (candidatePoints.length === 0) {
    return buildRejection("no_document_detected");
  }

  let topLeft = candidatePoints[0];
  let topRight = candidatePoints[0];
  let bottomRight = candidatePoints[0];
  let bottomLeft = candidatePoints[0];

  for (const point of candidatePoints) {
    if (point.x + point.y < topLeft.x + topLeft.y) {
      topLeft = point;
    }
    if (point.x - point.y > topRight.x - topRight.y) {
      topRight = point;
    }
    if (point.x + point.y > bottomRight.x + bottomRight.y) {
      bottomRight = point;
    }
    if (point.x - point.y < bottomLeft.x - bottomLeft.y) {
      bottomLeft = point;
    }
  }

  const quad = orderCornerPoints([topLeft, topRight, bottomRight, bottomLeft]);
  const areaRatio = getQuadArea(quad) / (width * height);

  if (
    areaRatio < MIN_DOCUMENT_AREA_RATIO ||
    documentPixelRatio < MIN_DOCUMENT_PIXEL_RATIO
  ) {
    return buildRejection("too_much_background");
  }

  if (areaRatio > 0.98 && documentPixelRatio > 0.94 && edgeDensity < 0.008) {
    return buildRejection("no_document_detected");
  }

  const scene = measureDocumentScene(pixels, width, height, quad, threshold);

  if (scene.documentFillRatio < MIN_DOCUMENT_FILL_RATIO) {
    return buildRejection("document_shape_unclear");
  }

  if (
    areaRatio < MIN_SAFE_DOCUMENT_AREA_WITH_TEXTURED_BACKGROUND &&
    scene.outsideBrightRatio > TEXTURED_BACKGROUND_BRIGHT_RATIO &&
    scene.outsideEdgeDensity > TEXTURED_BACKGROUND_EDGE_DENSITY
  ) {
    return buildRejection("too_much_background");
  }

  if (
    areaRatio > UNCLEAR_FULL_FRAME_AREA_RATIO &&
    scene.touchesFrame &&
    edgeDensity > UNCLEAR_FULL_FRAME_EDGE_DENSITY
  ) {
    return buildRejection("no_document_detected");
  }

  const validation = validateDocumentQuad(quad, width, height);
  if (!validation.valid) {
    return buildRejection("document_shape_unclear");
  }

  return {
    status: "detected",
    quad,
    areaRatio,
    documentPixelRatio,
    warnings: [],
  };
};

const loadImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const element = new Image();
    const cleanUp = () => URL.revokeObjectURL(objectUrl);

    element.onload = () => {
      cleanUp();
      resolve(element);
    };
    element.onerror = () => {
      cleanUp();
      reject(new Error("Could not load this photo in the browser."));
    };
    element.src = objectUrl;
  });

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.95,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not prepare the document scan."));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });

const getAnalysisCanvas = (image: HTMLImageElement): HTMLCanvasElement => {
  const scale = Math.min(
    1,
    ANALYSIS_MAX_LONG_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Could not inspect this photo in the browser.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const scaleQuad = (quad: DocumentScannerQuad, scaleX: number, scaleY: number): DocumentScannerQuad => ({
  topLeft: { x: quad.topLeft.x * scaleX, y: quad.topLeft.y * scaleY },
  topRight: { x: quad.topRight.x * scaleX, y: quad.topRight.y * scaleY },
  bottomRight: { x: quad.bottomRight.x * scaleX, y: quad.bottomRight.y * scaleY },
  bottomLeft: { x: quad.bottomLeft.x * scaleX, y: quad.bottomLeft.y * scaleY },
});

const createScannedDocumentFile = (blob: Blob, sourceName: string): File => {
  const baseName = sourceName.replace(/\.[^.]+$/, "") || "document";
  return new File([blob], `scan-${baseName}.jpg`, { type: blob.type || "image/jpeg" });
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

const enhanceForOcr = (imageData: ImageData): void => {
  let min = 255;
  let max = 0;

  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const value = getLuminance(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
    );
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const range = Math.max(32, max - min);

  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const value = getLuminance(
      imageData.data[offset],
      imageData.data[offset + 1],
      imageData.data[offset + 2],
    );
    const stretched = clamp(Math.round(((value - min) / range) * 255), 0, 255);
    imageData.data[offset] = stretched;
    imageData.data[offset + 1] = stretched;
    imageData.data[offset + 2] = stretched;
    imageData.data[offset + 3] = 255;
  }
};

const renderCorrectedDocumentBlob = async (
  image: HTMLImageElement,
  quad: DocumentScannerQuad,
): Promise<Blob> => {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = image.naturalWidth;
  sourceCanvas.height = image.naturalHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) {
    throw new Error("Could not read the document photo.");
  }

  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);
  const sourceImage = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const outputSize = getPerspectiveOutputSize(quad);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputSize.width;
  outputCanvas.height = outputSize.height;
  const outputContext = outputCanvas.getContext("2d", { willReadFrequently: true });

  if (!outputContext) {
    throw new Error("Could not prepare the document scan.");
  }

  const outputImage = outputContext.createImageData(outputCanvas.width, outputCanvas.height);

  for (let row = 0; row < outputCanvas.height; row += 1) {
    const v = outputCanvas.height === 1 ? 0 : row / (outputCanvas.height - 1);
    for (let col = 0; col < outputCanvas.width; col += 1) {
      const u = outputCanvas.width === 1 ? 0 : col / (outputCanvas.width - 1);
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
      const offset = (row * outputCanvas.width + col) * 4;
      outputImage.data[offset] = red;
      outputImage.data[offset + 1] = green;
      outputImage.data[offset + 2] = blue;
      outputImage.data[offset + 3] = 255;
    }
  }

  enhanceForOcr(outputImage);
  outputContext.putImageData(outputImage, 0, 0);
  return canvasToBlob(outputCanvas, "image/jpeg", 0.95);
};

export const scanDocumentFile = async (file: File): Promise<DocumentScanFileResult> => {
  try {
    const image = await loadImageElement(file);
    const sourceDimensions = { width: image.naturalWidth, height: image.naturalHeight };
    const analysisCanvas = getAnalysisCanvas(image);
    const context = analysisCanvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Could not inspect this photo in the browser.");
    }

    const imageData = context.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const detection = detectDocumentFromPixels(
      imageData.data,
      analysisCanvas.width,
      analysisCanvas.height,
    );

    if (detection.status === "rejected") {
      return {
        status: "rejected",
        sourceFile: file,
        sourceDimensions,
        code: detection.code,
        message: detection.message,
        warnings: detection.warnings,
      };
    }

    const quad = scaleQuad(
      detection.quad,
      image.naturalWidth / analysisCanvas.width,
      image.naturalHeight / analysisCanvas.height,
    );
    const blob = await renderCorrectedDocumentBlob(image, quad);

    return {
      status: "ready",
      sourceFile: file,
      scannedFile: createScannedDocumentFile(blob, file.name),
      sourceDimensions,
      quad,
      warnings: detection.warnings,
    };
  } catch {
    return {
      status: "rejected",
      sourceFile: file,
      code: "scanner_unavailable",
      message: DOCUMENT_SCANNER_UNAVAILABLE_MESSAGE,
      warnings: [],
    };
  }
};
