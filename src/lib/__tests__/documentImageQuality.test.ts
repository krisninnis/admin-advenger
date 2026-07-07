import { describe, expect, it } from "vitest";
import {
  BACKGROUND_CLUTTER_MESSAGE,
  DOCUMENT_QUALITY_CONTINUE_MESSAGE,
  DOCUMENT_QUALITY_GOOD_MESSAGE,
  DOCUMENT_QUALITY_TIP_MESSAGE,
  DOCUMENT_QUALITY_WARNING_MESSAGE,
  DOCUMENT_TOO_SMALL_MESSAGE,
  IMAGE_TOO_BLURRY_MESSAGE,
  LOW_CONTRAST_MESSAGE,
  LOW_RESOLUTION_MESSAGE,
  POSSIBLY_TILTED_MESSAGE,
  TOO_DARK_MESSAGE,
  assessDocumentImageQuality,
  computeAverageBrightness,
  computeBackgroundClutterRatio,
  computeBlurVariance,
  computeContrastStdDev,
  computeDocumentOccupancyRatio,
  computeQualityScore,
  computeTiltSkewEstimate,
  evaluateDocumentImageQuality,
  getBlurWarning,
  getBrightnessWarning,
  getClutterWarning,
  getContrastWarning,
  getLowResolutionWarning,
  getOccupancyWarning,
  getTiltWarning,
  getVisibleDocumentQualityWarningMessages,
  shouldEmphasizeRetake,
  type DocumentImageQualityMetrics,
  type DocumentImageQualityWarning,
} from "../documentImageQuality";

// ---- Synthetic pixel data helpers ----
// All of the pixel-metric functions under test operate on plain
// Uint8ClampedArray RGBA data (exactly what canvas getImageData returns) -
// no DOM/canvas is needed to build test fixtures for them.
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

const solidImage = (width: number, height: number, value: number) =>
  buildImage(width, height, () => [value, value, value]);

describe("computeAverageBrightness", () => {
  it("is 0 for a fully black image", () => {
    expect(computeAverageBrightness(solidImage(4, 4, 0))).toBe(0);
  });

  it("is ~255 for a fully white image", () => {
    expect(computeAverageBrightness(solidImage(4, 4, 255))).toBeCloseTo(255, 0);
  });
});

describe("computeContrastStdDev", () => {
  it("is 0 for a perfectly uniform image", () => {
    expect(computeContrastStdDev(solidImage(6, 6, 128))).toBeCloseTo(0, 10);
  });

  it("is high for a half-black, half-white image", () => {
    const image = buildImage(8, 8, (_row, col) => (col < 4 ? [0, 0, 0] : [255, 255, 255]));
    expect(computeContrastStdDev(image)).toBeGreaterThan(100);
  });
});

describe("computeBlurVariance", () => {
  it("is 0 (no edges) for a flat, uniform image", () => {
    expect(computeBlurVariance(solidImage(10, 10, 180), 10, 10)).toBe(0);
  });

  it("is high (lots of edges) for a sharp checkerboard image", () => {
    const checkerboard = buildImage(10, 10, (row, col) => {
      const value = (row + col) % 2 === 0 ? 0 : 255;
      return [value, value, value];
    });

    expect(computeBlurVariance(checkerboard, 10, 10)).toBeGreaterThan(1000);
  });
});

describe("computeDocumentOccupancyRatio", () => {
  it("is ~1 when bright document pixels fill the whole frame", () => {
    expect(computeDocumentOccupancyRatio(solidImage(10, 10, 200), 10, 10)).toBeCloseTo(1, 1);
  });

  it("is small when bright pixels only occupy a small central region", () => {
    const image = buildImage(10, 10, (row, col) =>
      row >= 4 && row < 6 && col >= 4 && col < 6 ? [200, 200, 200] : [50, 50, 50],
    );

    expect(computeDocumentOccupancyRatio(image, 10, 10)).toBeLessThan(0.1);
  });

  it("is 0 when no pixel is bright enough to count as document", () => {
    expect(computeDocumentOccupancyRatio(solidImage(10, 10, 40), 10, 10)).toBe(0);
  });
});

describe("computeBackgroundClutterRatio", () => {
  it("is 0 for a grayscale (low-saturation) image", () => {
    const image = buildImage(6, 6, (row) => {
      const value = row % 2 === 0 ? 60 : 200;
      return [value, value, value];
    });

    expect(computeBackgroundClutterRatio(image, 6, 6)).toBe(0);
  });

  it("is high for a highly-saturated, colourful image", () => {
    const image = buildImage(6, 6, (_row, col) => (col % 2 === 0 ? [255, 0, 0] : [0, 0, 255]));

    expect(computeBackgroundClutterRatio(image, 6, 6)).toBeGreaterThan(0.9);
  });
});

describe("computeTiltSkewEstimate", () => {
  it("is ~0 when the document starts at the same row on both sides", () => {
    const image = buildImage(30, 30, (row) => (row >= 2 ? [200, 200, 200] : [30, 30, 30]));

    expect(computeTiltSkewEstimate(image, 30, 30)).toBe(0);
  });

  it("is high when one side of the page starts much lower than the other", () => {
    const image = buildImage(30, 30, (row, col) => {
      // Left third starts at row 2, right third starts at row 20 - an
      // obviously tilted page.
      const startRow = col < 10 ? 2 : 20;
      return row >= startRow ? [200, 200, 200] : [30, 30, 30];
    });

    expect(computeTiltSkewEstimate(image, 30, 30)).toBeGreaterThan(0.3);
  });
});

// ---- Warning builders (plain numbers, no pixel data needed) ----
describe("getLowResolutionWarning", () => {
  it("warns when the longer edge is below the minimum useful dimension", () => {
    expect(getLowResolutionWarning({ width: 500, height: 600 })).toBeDefined();
  });

  it("does not warn when dimensions are large enough", () => {
    expect(getLowResolutionWarning({ width: 1200, height: 1600 })).toBeUndefined();
  });

  it("warns when the file size is very small", () => {
    expect(getLowResolutionWarning({ fileSize: 50 * 1024 })).toBeDefined();
  });

  it("does not warn when the file size is large enough", () => {
    expect(getLowResolutionWarning({ fileSize: 500 * 1024 })).toBeUndefined();
  });

  it("uses the required low-resolution copy and a strong_warning severity", () => {
    const warning = getLowResolutionWarning({ width: 100, height: 100 });
    expect(warning?.message).toBe(LOW_RESOLUTION_MESSAGE);
    expect(warning?.severity).toBe("strong_warning");
  });
});

describe("getBlurWarning", () => {
  it("warns for a low (blurry) variance score", () => {
    const warning = getBlurWarning(10);
    expect(warning?.code).toBe("image_too_blurry");
    expect(warning?.message).toBe(IMAGE_TOO_BLURRY_MESSAGE);
    expect(warning?.severity).toBe("strong_warning");
  });

  it("does not warn for a high (sharp) variance score", () => {
    expect(getBlurWarning(2000)).toBeUndefined();
  });
});

describe("getBrightnessWarning", () => {
  it("warns for a dark average brightness", () => {
    const warning = getBrightnessWarning(40);
    expect(warning?.code).toBe("too_dark");
    expect(warning?.message).toBe(TOO_DARK_MESSAGE);
  });

  it("does not warn for a bright image", () => {
    expect(getBrightnessWarning(180)).toBeUndefined();
  });
});

describe("getContrastWarning", () => {
  it("warns for a low standard deviation", () => {
    const warning = getContrastWarning(10);
    expect(warning?.code).toBe("low_contrast");
    expect(warning?.message).toBe(LOW_CONTRAST_MESSAGE);
  });

  it("does not warn for a healthy standard deviation", () => {
    expect(getContrastWarning(80)).toBeUndefined();
  });
});

describe("getOccupancyWarning", () => {
  it("warns when the document occupies too little of the frame", () => {
    const warning = getOccupancyWarning(0.1);
    expect(warning?.code).toBe("document_too_small");
    expect(warning?.message).toBe(DOCUMENT_TOO_SMALL_MESSAGE);
  });

  it("does not warn when the document fills most of the frame", () => {
    expect(getOccupancyWarning(0.8)).toBeUndefined();
  });
});

describe("getClutterWarning", () => {
  it("warns when too much of the frame is highly saturated", () => {
    const warning = getClutterWarning(0.6);
    expect(warning?.code).toBe("background_clutter");
    expect(warning?.message).toBe(BACKGROUND_CLUTTER_MESSAGE);
    expect(warning?.severity).toBe("info");
  });

  it("does not warn when the frame is mostly neutral", () => {
    expect(getClutterWarning(0.05)).toBeUndefined();
  });
});

describe("getTiltWarning", () => {
  it("warns for a large left/right skew", () => {
    const warning = getTiltWarning(0.5);
    expect(warning?.code).toBe("possibly_tilted");
    expect(warning?.message).toBe(POSSIBLY_TILTED_MESSAGE);
  });

  it("does not warn for a negligible skew", () => {
    expect(getTiltWarning(0.01)).toBeUndefined();
  });
});

describe("computeQualityScore", () => {
  it("is 'good' when there are no warnings", () => {
    expect(computeQualityScore([])).toBe("good");
  });

  it("is 'good' when only an info-level warning is present", () => {
    const warnings: DocumentImageQualityWarning[] = [
      { code: "background_clutter", message: BACKGROUND_CLUTTER_MESSAGE, severity: "info" },
    ];
    expect(computeQualityScore(warnings)).toBe("good");
  });

  it("is 'okay' when a (non-strong) warning is present", () => {
    const warnings: DocumentImageQualityWarning[] = [
      { code: "too_dark", message: TOO_DARK_MESSAGE, severity: "warning" },
    ];
    expect(computeQualityScore(warnings)).toBe("okay");
  });

  it("is 'poor' when a strong_warning is present", () => {
    const warnings: DocumentImageQualityWarning[] = [
      { code: "image_too_blurry", message: IMAGE_TOO_BLURRY_MESSAGE, severity: "strong_warning" },
      { code: "too_dark", message: TOO_DARK_MESSAGE, severity: "warning" },
    ];
    expect(computeQualityScore(warnings)).toBe("poor");
  });
});

// ---- evaluateDocumentImageQuality (pure, metrics-in / result-out) ----
const GOOD_METRICS: DocumentImageQualityMetrics = {
  width: 1600,
  height: 2000,
  fileSize: 900 * 1024,
  averageBrightness: 190,
  contrastStdDev: 70,
  blurVariance: 2000,
  occupancyRatio: 0.8,
  clutterRatio: 0.05,
  tiltSkewEstimate: 0,
};

describe("evaluateDocumentImageQuality", () => {
  it("a low-resolution photo produces a low_resolution warning and a poor score", () => {
    const result = evaluateDocumentImageQuality({ ...GOOD_METRICS, width: 400, height: 500 });

    expect(result.warnings.some((warning) => warning.code === "low_resolution")).toBe(true);
    expect(result.score).toBe("poor");
  });

  it("a very small file size produces a low_resolution warning", () => {
    const result = evaluateDocumentImageQuality({ ...GOOD_METRICS, fileSize: 40 * 1024 });

    expect(result.warnings.some((warning) => warning.code === "low_resolution")).toBe(true);
  });

  it("a dark image produces a too_dark warning", () => {
    const result = evaluateDocumentImageQuality({ ...GOOD_METRICS, averageBrightness: 30 });

    expect(result.warnings.some((warning) => warning.code === "too_dark")).toBe(true);
    expect(result.score).not.toBe("good");
  });

  it("a low-contrast image produces a low_contrast warning", () => {
    const result = evaluateDocumentImageQuality({ ...GOOD_METRICS, contrastStdDev: 8 });

    expect(result.warnings.some((warning) => warning.code === "low_contrast")).toBe(true);
  });

  it("a blurry image produces an image_too_blurry warning and a poor score", () => {
    const result = evaluateDocumentImageQuality({ ...GOOD_METRICS, blurVariance: 5 });

    expect(result.warnings.some((warning) => warning.code === "image_too_blurry")).toBe(true);
    expect(result.score).toBe("poor");
  });

  it("a good photo's metrics return a good or okay score, never poor", () => {
    const result = evaluateDocumentImageQuality(GOOD_METRICS);

    expect(["good", "okay"]).toContain(result.score);
    expect(result.warnings.some((warning) => warning.severity === "strong_warning")).toBe(false);
  });
});

// ---- getVisibleDocumentQualityWarningMessages ----
describe("getVisibleDocumentQualityWarningMessages", () => {
  it("hides warnings when the overall score is still 'good'", () => {
    const messages = getVisibleDocumentQualityWarningMessages({
      score: "good",
      warnings: [{ code: "background_clutter", message: BACKGROUND_CLUTTER_MESSAGE, severity: "info" }],
    });

    expect(messages).toEqual([]);
  });

  it("surfaces warning messages when the score is 'okay' or 'poor'", () => {
    const messages = getVisibleDocumentQualityWarningMessages({
      score: "okay",
      warnings: [{ code: "too_dark", message: TOO_DARK_MESSAGE, severity: "warning" }],
    });

    expect(messages).toEqual([TOO_DARK_MESSAGE]);
  });
});

describe("shouldEmphasizeRetake", () => {
  it("is true only for a poor score", () => {
    expect(shouldEmphasizeRetake("poor")).toBe(true);
    expect(shouldEmphasizeRetake("okay")).toBe(false);
    expect(shouldEmphasizeRetake("good")).toBe(false);
  });
});

// ---- Safety wording ----
describe("documentImageQuality safety wording", () => {
  const allMessages = [
    DOCUMENT_QUALITY_GOOD_MESSAGE,
    DOCUMENT_QUALITY_WARNING_MESSAGE,
    DOCUMENT_QUALITY_TIP_MESSAGE,
    DOCUMENT_QUALITY_CONTINUE_MESSAGE,
    DOCUMENT_TOO_SMALL_MESSAGE,
    IMAGE_TOO_BLURRY_MESSAGE,
    TOO_DARK_MESSAGE,
    LOW_CONTRAST_MESSAGE,
    POSSIBLY_TILTED_MESSAGE,
    BACKGROUND_CLUTTER_MESSAGE,
    LOW_RESOLUTION_MESSAGE,
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

  it("never uses forbidden advice/certainty wording", () => {
    for (const message of allMessages) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("always reassures the user they can continue and edit manually", () => {
    expect(DOCUMENT_QUALITY_CONTINUE_MESSAGE).toBe(
      "You can still continue and edit the text manually.",
    );
  });

  it("states the exact required good/warning headline copy", () => {
    expect(DOCUMENT_QUALITY_GOOD_MESSAGE).toBe("Good photo — ready to read.");
    expect(DOCUMENT_QUALITY_WARNING_MESSAGE).toBe("This photo may be hard to read.");
  });
});

// ---- assessDocumentImageQuality (DOM-touching wrapper) ----
// This project's tests run without jsdom (see photoCapture.test.ts /
// photoOcr.test.ts for the same note), so Image/canvas/URL.createObjectURL
// are not available here - assessDocumentImageQuality's internal decode
// step will fail, exercising exactly the "never block, never falsely
// reassure" fallback path documented on the function itself.
describe("assessDocumentImageQuality (fallback when the photo cannot be decoded)", () => {
  it("resolves a neutral, warning-free result rather than throwing or blocking", async () => {
    const fakeFile = new Blob(["not a real image"], { type: "image/jpeg" });

    await expect(assessDocumentImageQuality(fakeFile)).resolves.toEqual({
      score: "okay",
      warnings: [],
    });
  });
});
