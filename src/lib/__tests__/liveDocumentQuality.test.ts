import { describe, expect, it } from "vitest";
import {
  LIVE_DOCUMENT_QUALITY_SAMPLE_INTERVAL_MS,
  LIVE_DOCUMENT_QUALITY_SAMPLE_MAX_DIMENSION,
  LIVE_QUALITY_AVOID_GLARE,
  LIVE_QUALITY_HOLD_STEADY,
  LIVE_QUALITY_KEEP_FLAT,
  LIVE_QUALITY_LOW_CONTRAST,
  LIVE_QUALITY_MOVE_BACK,
  LIVE_QUALITY_MOVE_CLOSER,
  LIVE_QUALITY_PLACE_DOCUMENT_IN_FRAME,
  LIVE_QUALITY_READY,
  LIVE_QUALITY_READY_SECONDARY,
  LIVE_QUALITY_USE_MORE_LIGHT,
  analyseLiveDocumentPixels,
  evaluateLiveDocumentQuality,
  getLiveDocumentQualitySampleSize,
  measureLiveDocumentQuality,
  type LiveDocumentQualityMetrics,
} from "../liveDocumentQuality";

const buildImage = (
  width: number,
  height: number,
  colorAt: (row: number, col: number) => [number, number, number],
): Uint8ClampedArray => {
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const [red, green, blue] = colorAt(row, col);
      const offset = (row * width + col) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }

  return pixels;
};

const GOOD_METRICS: LiveDocumentQualityMetrics = {
  brightness: 170,
  contrast: 62,
  sharpness: 900,
  glareRatio: 0,
  documentCoverage: 0.72,
  documentBounds: { x: 0.14, y: 0.08, width: 0.72, height: 0.84 },
  clippedEdgeCount: 0,
  tilt: 0.01,
  backgroundClutter: 0.04,
  textDensity: 0.04,
};

describe("evaluateLiveDocumentQuality", () => {
  it("returns ready for good document metrics", () => {
    const result = evaluateLiveDocumentQuality(GOOD_METRICS);

    expect(result.status).toBe("ready");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_READY);
    expect(result.secondaryInstruction).toBe(LIVE_QUALITY_READY_SECONDARY);
    expect(result.issues).toEqual(["ready"]);
  });

  it("returns no_document first when the page is not visible", () => {
    const result = evaluateLiveDocumentQuality({
      ...GOOD_METRICS,
      documentBounds: undefined,
      documentCoverage: 0,
      brightness: 40,
    });

    expect(result.status).toBe("poor");
    expect(result.issues[0]).toBe("no_document");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_PLACE_DOCUMENT_IN_FRAME);
  });

  it("returns clipped before too_far, blur, dark, or glare issues", () => {
    const result = evaluateLiveDocumentQuality({
      ...GOOD_METRICS,
      documentBounds: { x: 0, y: 0.05, width: 0.45, height: 0.8 },
      clippedEdgeCount: 1,
      documentCoverage: 0.3,
      sharpness: 10,
      brightness: 30,
      glareRatio: 0.1,
    });

    expect(result.issues[0]).toBe("clipped");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_MOVE_BACK);
  });

  it("returns too_far when the document is small in the frame", () => {
    const result = evaluateLiveDocumentQuality({
      ...GOOD_METRICS,
      documentCoverage: 0.25,
      documentBounds: { x: 0.35, y: 0.3, width: 0.3, height: 0.45 },
    });

    expect(result.status).toBe("poor");
    expect(result.issues[0]).toBe("too_far");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_MOVE_CLOSER);
  });

  it("returns blurred when sharpness is low", () => {
    const result = evaluateLiveDocumentQuality({ ...GOOD_METRICS, sharpness: 12 });

    expect(result.status).toBe("poor");
    expect(result.issues[0]).toBe("blurred");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_HOLD_STEADY);
  });

  it("returns too_dark for dark document metrics", () => {
    const result = evaluateLiveDocumentQuality({ ...GOOD_METRICS, brightness: 42 });

    expect(result.status).toBe("poor");
    expect(result.issues[0]).toBe("too_dark");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_USE_MORE_LIGHT);
  });

  it("returns glare for an overexposed patch", () => {
    const result = evaluateLiveDocumentQuality({ ...GOOD_METRICS, glareRatio: 0.08 });

    expect(result.status).toBe("poor");
    expect(result.issues[0]).toBe("glare");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_AVOID_GLARE);
  });

  it("returns low_contrast as an okay-quality issue", () => {
    const result = evaluateLiveDocumentQuality({ ...GOOD_METRICS, contrast: 10 });

    expect(result.status).toBe("okay");
    expect(result.issues[0]).toBe("low_contrast");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_LOW_CONTRAST);
  });

  it("returns tilted after higher-priority quality issues", () => {
    const result = evaluateLiveDocumentQuality({ ...GOOD_METRICS, tilt: 0.18 });

    expect(result.status).toBe("okay");
    expect(result.issues[0]).toBe("tilted");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_KEEP_FLAT);
  });

  it("is deterministic for identical metrics", () => {
    const first = evaluateLiveDocumentQuality({ ...GOOD_METRICS, documentCoverage: 0.22 });
    const second = evaluateLiveDocumentQuality({ ...GOOD_METRICS, documentCoverage: 0.22 });

    expect(second).toEqual(first);
  });
});

describe("measureLiveDocumentQuality", () => {
  it("detects a good synthetic document with visible text as ready", () => {
    const image = buildImage(80, 120, (row, col) => {
      const insidePage = row >= 8 && row < 112 && col >= 14 && col < 66;
      const onTextLine = insidePage && row % 12 >= 4 && row % 12 <= 5 && col >= 22 && col < 58;

      if (onTextLine) {
        return [35, 35, 35];
      }

      return insidePage ? [238, 238, 238] : [55, 58, 62];
    });

    const result = analyseLiveDocumentPixels(image, 80, 120);

    expect(result.status).toBe("ready");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_READY);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("detects a far-away bright page with large background as too_far", () => {
    const image = buildImage(100, 140, (row, col) =>
      row >= 55 && row < 90 && col >= 38 && col < 62 ? [235, 235, 235] : [25, 70, 50],
    );
    const result = analyseLiveDocumentPixels(image, 100, 140);

    expect(result.issues[0]).toBe("too_far");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_MOVE_CLOSER);
    expect(result.issues).toContain("background_clutter");
  });

  it("detects glare from an overexposed white patch", () => {
    const image = buildImage(80, 120, (row, col) => {
      const insidePage = row >= 10 && row < 110 && col >= 16 && col < 64;
      const glarePatch = row >= 20 && row < 42 && col >= 34 && col < 58;
      const textLine = insidePage && row % 14 >= 6 && row % 14 <= 7 && col >= 22 && col < 56;

      if (glarePatch) return [255, 255, 255];
      if (textLine) return [35, 35, 35];
      return insidePage ? [232, 232, 232] : [50, 50, 50];
    });

    const result = analyseLiveDocumentPixels(image, 80, 120);

    expect(result.issues).toContain("glare");
    expect(result.primaryInstruction).toBe(LIVE_QUALITY_AVOID_GLARE);
  });

  it("surfaces the measured metrics for debugging without storing the image", () => {
    const image = buildImage(20, 20, () => [200, 200, 200]);
    const metrics = measureLiveDocumentQuality(image, 20, 20);

    expect(metrics.brightness).toBeGreaterThan(190);
    expect(metrics.documentCoverage).toBeGreaterThan(0.9);
  });
});

describe("live camera performance safeguards", () => {
  it("keeps live preview analysis throttled to the requested range", () => {
    expect(LIVE_DOCUMENT_QUALITY_SAMPLE_INTERVAL_MS).toBeGreaterThanOrEqual(700);
    expect(LIVE_DOCUMENT_QUALITY_SAMPLE_INTERVAL_MS).toBeLessThanOrEqual(1000);
  });

  it("downscales live preview frames before analysis", () => {
    const size = getLiveDocumentQualitySampleSize(1920, 1080);

    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(
      LIVE_DOCUMENT_QUALITY_SAMPLE_MAX_DIMENSION,
    );
    expect(size.width).toBeGreaterThan(size.height);
  });

  it("uses safe wording without advice or certainty", () => {
    const allMessages = [
      LIVE_QUALITY_PLACE_DOCUMENT_IN_FRAME,
      LIVE_QUALITY_MOVE_CLOSER,
      LIVE_QUALITY_MOVE_BACK,
      LIVE_QUALITY_HOLD_STEADY,
      LIVE_QUALITY_USE_MORE_LIGHT,
      LIVE_QUALITY_AVOID_GLARE,
      LIVE_QUALITY_KEEP_FLAT,
      LIVE_QUALITY_READY,
      LIVE_QUALITY_READY_SECONDARY,
    ];
    const forbiddenPatterns = [
      /\bguaranteed?\b/i,
      /\bverified\b/i,
      /\bconfirmed\b/i,
      /\bvalid claim\b/i,
      /\binvalid claim\b/i,
      /\bpay this\b/i,
      /\bignore this\b/i,
    ];

    for (const message of allMessages) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });
});
