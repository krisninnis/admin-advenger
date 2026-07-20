import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SCAN_REJECTION_MESSAGE,
  DOCUMENT_NO_DOCUMENT_MESSAGE,
  detectDocumentFromPixels,
  getPerspectiveOutputSize,
  orderCornerPoints,
  validateDocumentQuad,
  type DocumentScannerPoint,
} from "../documentScanner";

const buildImage = (
  width: number,
  height: number,
  colorAt: (row: number, col: number) => [number, number, number],
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const [r, g, b] = colorAt(row, col);
      const offset = (row * width + col) * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
};

const pointInPolygon = (point: DocumentScannerPoint, polygon: DocumentScannerPoint[]) => {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
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

const expectCleanRejection = (result: ReturnType<typeof detectDocumentFromPixels>) => {
  expect(result).toEqual(
    expect.objectContaining({
      status: "rejected",
      message: DOCUMENT_SCAN_REJECTION_MESSAGE,
    }),
  );
  expect(result).not.toHaveProperty("canUseFullPhoto");
  expect(result).not.toHaveProperty("canAdjustManually");
  expect(result).not.toHaveProperty("suggestedCropRect");
};

const isSyntheticTextStroke = (row: number, col: number): boolean => {
  const lineRow = row % 18;
  const lineCol = col % 52;

  return lineRow >= 4 && lineRow <= 6 && lineCol >= 6 && lineCol <= 42;
};

describe("document scanner detection", () => {
  it("detects a clear portrait document on a contrasting background", () => {
    const image = buildImage(120, 180, (row, col) =>
      row >= 18 && row <= 164 && col >= 28 && col <= 92
        ? [240, 240, 238]
        : [38, 44, 52],
    );

    const result = detectDocumentFromPixels(image, 120, 180);

    expect(result.status).toBe("detected");
    if (result.status !== "detected") {
      throw new Error("Expected document detection");
    }

    expect(result.areaRatio).toBeGreaterThan(0.35);
    expect(result.warnings).toEqual([]);
    expect(getPerspectiveOutputSize(result.quad).width / getPerspectiveOutputSize(result.quad).height).toBeCloseTo(0.44, 1);
  });

  it("orders the four corners of a tilted document and validates the quadrilateral", () => {
    const polygon: DocumentScannerPoint[] = [
      { x: 34, y: 18 },
      { x: 96, y: 30 },
      { x: 84, y: 158 },
      { x: 22, y: 142 },
    ];
    const image = buildImage(120, 180, (row, col) =>
      pointInPolygon({ x: col, y: row }, polygon) ? [242, 242, 240] : [35, 40, 48],
    );

    const result = detectDocumentFromPixels(image, 120, 180);

    expect(result.status).toBe("detected");
    if (result.status !== "detected") {
      throw new Error("Expected tilted document detection");
    }

    expect(result.quad.topLeft.x).toBeLessThan(result.quad.topRight.x);
    expect(result.quad.bottomLeft.y).toBeGreaterThan(result.quad.topLeft.y);
    expect(validateDocumentQuad(result.quad, 120, 180).valid).toBe(true);
    expect(getPerspectiveOutputSize(result.quad).height).toBeGreaterThan(getPerspectiveOutputSize(result.quad).width);
  });

  it("rejects a blank black image before OCR", () => {
    const image = buildImage(80, 80, () => [2, 2, 2]);
    const result = detectDocumentFromPixels(image, 80, 80);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        code: "blank_dark",
        message: DOCUMENT_NO_DOCUMENT_MESSAGE,
      }),
    );
    expectCleanRejection(result);
  });

  it("rejects a covered-camera image before OCR", () => {
    const image = buildImage(80, 80, (row, col) => {
      const sensorNoise = (row + col) % 3;
      return [3 + sensorNoise, 3 + sensorNoise, 3 + sensorNoise];
    });
    const result = detectDocumentFromPixels(image, 80, 80);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        code: "blank_dark",
      }),
    );
    expectCleanRejection(result);
  });

  it("rejects a blank white image before OCR", () => {
    const image = buildImage(80, 80, () => [252, 252, 252]);
    const result = detectDocumentFromPixels(image, 80, 80);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        code: "blank_light",
      }),
    );
    expectCleanRejection(result);
  });

  it("does not silently treat a tiny page with too much background as a successful scan", () => {
    const image = buildImage(160, 220, (row, col) =>
      row >= 92 && row <= 128 && col >= 68 && col <= 92
        ? [240, 240, 238]
        : [30, 60, 92],
    );

    const result = detectDocumentFromPixels(image, 160, 220);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        code: "too_much_background",
      }),
    );
    expectCleanRejection(result);
  });

  it("rejects a small synthetic letter on a printed background instead of sending background text to OCR", () => {
    const image = buildImage(220, 300, (row, col) => {
      const insideLetter = row >= 96 && row <= 210 && col >= 78 && col <= 142;

      if (insideLetter) {
        const fakeLetterLine = row % 17 >= 7 && row % 17 <= 8 && col >= 88 && col <= 132;
        return fakeLetterLine ? [70, 70, 70] : [248, 248, 245];
      }

      return isSyntheticTextStroke(row, col) ? [38, 40, 42] : [238, 236, 228];
    });

    const result = detectDocumentFromPixels(image, 220, 300);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
      }),
    );
    expectCleanRejection(result);
  });

  it("does not count a cluttered synthetic newspaper background as a document", () => {
    const image = buildImage(180, 240, (row, col) =>
      isSyntheticTextStroke(row, col) || (row % 38 === 12 && col > 20 && col < 160)
        ? [35, 36, 38]
        : [239, 237, 230],
    );

    const result = detectDocumentFromPixels(image, 180, 240);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
      }),
    );
    expectCleanRejection(result);
  });

  it("rejects invalid dimensions instead of entering OCR", () => {
    const result = detectDocumentFromPixels(new Uint8ClampedArray(), 0, 20);

    expect(result).toEqual(
      expect.objectContaining({
        status: "rejected",
        code: "invalid_dimensions",
      }),
    );
    expectCleanRejection(result);
  });

  it("orders arbitrary corner points by top-left/top-right/bottom-left/bottom-right", () => {
    expect(
      orderCornerPoints([
        { x: 80, y: 140 },
        { x: 20, y: 20 },
        { x: 90, y: 30 },
        { x: 25, y: 150 },
      ]),
    ).toEqual({
      topLeft: { x: 20, y: 20 },
      topRight: { x: 90, y: 30 },
      bottomRight: { x: 80, y: 140 },
      bottomLeft: { x: 25, y: 150 },
    });
  });
});
