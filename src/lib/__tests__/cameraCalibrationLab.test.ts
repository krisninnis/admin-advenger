import { describe, expect, it } from "vitest";
import {
  A4_PORTRAIT_ASPECT_RATIO,
  analyzeCameraLabFrame,
  buildCameraLabVideoConstraints,
  calculateQuadAreaDelta,
  calculateQuadAreaRatio,
  calculateQuadIoU,
  calculateQuadSkewMetric,
  createA4GuideRect,
  createCameraLabTelemetryEntry,
  evaluateQuadStability,
  getDefaultCameraLabSettings,
  hasCapability,
  isImageCaptureAvailable,
  selectCameraLabGuidanceInstruction,
  shouldTriggerAssistedCapture,
  type CameraLabQualityMeasurements,
} from "../cameraCalibrationLab";
import type { DocumentScannerQuad } from "../documentScanner";

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

const readyMetrics = (): Omit<CameraLabQualityMeasurements, "readyState" | "warnings"> => ({
  allFourCornersVisible: true,
  documentInsideFrame: true,
  coverageWithinRange: true,
  skewAcceptable: true,
  brightnessAcceptable: true,
  glareAcceptable: true,
  sharpnessAcceptable: true,
  cameraStable: true,
  quadStable: true,
  documentCoverage: 0.5,
  skewMetric: 0.02,
  brightnessMetric: 150,
  glareMetric: 0.01,
  sharpnessMetric: 120,
  quadIoU: 0.95,
  quadAreaDelta: 0.02,
  stabilityDurationMs: 1400,
});

const readyQuad: DocumentScannerQuad = {
  topLeft: { x: 100, y: 100 },
  topRight: { x: 900, y: 100 },
  bottomRight: { x: 900, y: 1600 },
  bottomLeft: { x: 100, y: 1600 },
};

const readyMeasurements = (overrides: Partial<CameraLabQualityMeasurements> = {}): CameraLabQualityMeasurements => ({
  ...readyMetrics(),
  readyState: "ready",
  warnings: [],
  quad: readyQuad,
  ...overrides,
});

describe("A4 camera calibration lab pure helpers", () => {
  it("uses the true portrait A4 aspect ratio for the guide", () => {
    const guide = createA4GuideRect(1200, 1600, 0.8);

    expect(A4_PORTRAIT_ASPECT_RATIO).toBeCloseTo(1 / Math.sqrt(2), 8);
    expect(guide.width / guide.height).toBeCloseTo(1 / Math.sqrt(2), 5);
    expect(guide.left).toBeGreaterThanOrEqual(0);
    expect(guide.top).toBeGreaterThanOrEqual(0);
  });

  it("calculates document coverage and skew from a quadrilateral", () => {
    const quad: DocumentScannerQuad = {
      topLeft: { x: 20, y: 20 },
      topRight: { x: 80, y: 20 },
      bottomRight: { x: 80, y: 160 },
      bottomLeft: { x: 20, y: 160 },
    };

    expect(calculateQuadAreaRatio(quad, 100, 200)).toBeCloseTo(0.42, 2);
    expect(calculateQuadSkewMetric(quad)).toBe(0);
  });

  it("calculates quad stability from IoU and area delta", () => {
    const shiftedQuad: DocumentScannerQuad = {
      topLeft: { x: 108, y: 106 },
      topRight: { x: 908, y: 106 },
      bottomRight: { x: 908, y: 1606 },
      bottomLeft: { x: 108, y: 1606 },
    };
    const enlargedQuad: DocumentScannerQuad = {
      topLeft: { x: 50, y: 50 },
      topRight: { x: 950, y: 50 },
      bottomRight: { x: 950, y: 1700 },
      bottomLeft: { x: 50, y: 1700 },
    };
    const settings = getDefaultCameraLabSettings();

    expect(calculateQuadIoU(shiftedQuad, readyQuad)).toBeGreaterThan(0.85);
    expect(calculateQuadAreaDelta(shiftedQuad, readyQuad)).toBeLessThan(0.15);
    expect(evaluateQuadStability(shiftedQuad, readyQuad, settings).quadStable).toBe(true);
    expect(evaluateQuadStability(enlargedQuad, readyQuad, settings).quadStable).toBe(false);
  });

  it("reports Ready only after all quality checks and stability pass", () => {
    const pixels = buildImage(120, 180, (row, col) =>
      row >= 18 && row <= 164 && col >= 28 && col <= 92
        ? [(row + col) % 8 === 0 ? 210 : 244, 244, 242]
        : [38, 44, 52],
    );
    const settings = {
      ...getDefaultCameraLabSettings(),
      documentCoverageMin: 0.2,
      documentCoverageMax: 0.8,
      sharpnessMin: 1,
      stabilityDurationMs: 1000,
    };

    const unstable = analyzeCameraLabFrame(pixels, 120, 180, settings, 400);
    const stable = analyzeCameraLabFrame(pixels, 120, 180, settings, 1200);

    expect(unstable.readyState).toBe("almost_ready");
    expect(unstable.cameraStable).toBe(false);
    expect(stable.readyState).toBe("ready");
    expect(stable.allFourCornersVisible).toBe(true);
  });

  it("selects the highest-priority one-instruction guidance", () => {
    const settings = getDefaultCameraLabSettings();

    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ quad: undefined }), settings)).toBe(
      "No document found.",
    );
    expect(
      selectCameraLabGuidanceInstruction(
        readyMeasurements({ allFourCornersVisible: false, documentInsideFrame: false }),
        settings,
      ),
    ).toBe("Keep all four corners inside.");
    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ documentCoverage: 0.95 }), settings)).toBe(
      "Move further away.",
    );
    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ documentCoverage: 0.1 }), settings)).toBe(
      "Move closer.",
    );
    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ skewAcceptable: false }), settings)).toBe(
      "Hold the phone level.",
    );
    expect(
      selectCameraLabGuidanceInstruction(
        readyMeasurements({ brightnessAcceptable: false, brightnessMetric: 30 }),
        settings,
      ),
    ).toBe("More light needed.");
    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ glareAcceptable: false }), settings)).toBe(
      "Reduce glare.",
    );
    expect(selectCameraLabGuidanceInstruction(readyMeasurements({ quadStable: false }), settings)).toBe(
      "Hold still.",
    );
    expect(selectCameraLabGuidanceInstruction(readyMeasurements(), settings)).toBe("Ready.");
  });

  it("keeps assisted capture gated by readiness, sustained stability, cooldown and duplicate prevention", () => {
    const measurements = readyMeasurements();

    expect(
      shouldTriggerAssistedCapture({
        assistedCapture: true,
        measurements,
        isCapturing: false,
        captureAlreadyTriggered: false,
        cooldownRemainingMs: 0,
      }),
    ).toBe(true);
    expect(
      shouldTriggerAssistedCapture({
        assistedCapture: true,
        measurements: readyMeasurements({ cameraStable: false, readyState: "almost_ready" }),
        isCapturing: false,
        captureAlreadyTriggered: false,
        cooldownRemainingMs: 0,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAssistedCapture({
        assistedCapture: true,
        measurements,
        isCapturing: true,
        captureAlreadyTriggered: false,
        cooldownRemainingMs: 0,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAssistedCapture({
        assistedCapture: true,
        measurements,
        isCapturing: false,
        captureAlreadyTriggered: true,
        cooldownRemainingMs: 0,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAssistedCapture({
        assistedCapture: true,
        measurements,
        isCapturing: false,
        captureAlreadyTriggered: false,
        cooldownRemainingMs: 500,
      }),
    ).toBe(false);
  });

  it("checks camera capabilities before enabling experimental controls", () => {
    expect(hasCapability(undefined, "zoom")).toBe(false);
    expect(hasCapability({} as MediaTrackCapabilities, "torch")).toBe(false);
    expect(
      hasCapability(
        {
          zoom: { min: 1, max: 4, step: 0.1 },
          focusMode: ["continuous"],
          torch: true,
        } as MediaTrackCapabilities,
        "zoom",
      ),
    ).toBe(true);
  });

  it("detects ImageCapture availability from the browser surface", () => {
    expect(isImageCaptureAvailable({ ImageCapture: undefined })).toBe(false);
    expect(isImageCaptureAvailable({ ImageCapture: class FakeImageCapture {} })).toBe(true);
  });

  it("builds ideal camera constraints without changing the normal Journey 5 defaults", () => {
    expect(buildCameraLabVideoConstraints(getDefaultCameraLabSettings())).toEqual({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
    });
  });

  it("keeps research-backed auto-capture defaults scoped to the lab", () => {
    const settings = getDefaultCameraLabSettings();

    expect(settings.quadIoUThreshold).toBe(0.85);
    expect(settings.maxAreaDelta).toBe(0.15);
    expect(settings.stabilityDurationMs).toBe(700);
  });

  it("telemetry omits image pixels, document names, paths, and raw File objects", () => {
    const sourceFile = new File(["private pixels"], "real-bank-letter.jpg", { type: "image/jpeg" });
    const scannedFile = new File(["prepared private pixels"], "scan-real-bank-letter.jpg", {
      type: "image/jpeg",
    });
    const entry = createCameraLabTelemetryEntry({
      timestamp: "2026-07-18T12:00:00.000Z",
      browser: {
        userAgentFamily: "Chrome synthetic",
        platform: "Win32",
        hardwareConcurrency: 4,
      },
      requestedConstraints: {
        video: true,
        localPath: "C:\\Users\\example\\secret-photo.jpg",
        token: "abc",
        apiKey: "sk-test-secret",
      },
      actualSettings: {
        width: 1920,
        height: 1080,
        username: "private-user",
        documentName: "benefit-letter.png",
      },
      captureMethod: "canvas",
      sourceDimensions: { width: 1920, height: 1080 },
      outputDimensions: { width: 1920, height: 1080 },
      fileSizeBytes: 12345,
      captureSharpnessMetric: 88,
      measurements: {
        ...readyMetrics(),
        readyState: "ready",
        warnings: [],
      },
      scannerResult: {
        status: "ready",
        sourceFile,
        scannedFile,
        sourceDimensions: { width: 1920, height: 1080 },
        quad: {
          topLeft: { x: 100, y: 100 },
          topRight: { x: 900, y: 100 },
          bottomRight: { x: 900, y: 1600 },
          bottomLeft: { x: 100, y: 1600 },
        },
        warnings: [],
      },
      lifecycleEvents: [
        {
          event: "successful_capture",
          timestamp: "2026-07-18T12:00:01.000Z",
          hadStream: true,
          stoppedTrackCount: 1,
        },
      ],
      processingDurationMs: 250,
    });
    const json = JSON.stringify(entry);

    expect(json).not.toContain("private pixels");
    expect(json).not.toContain("real-bank-letter");
    expect(json).not.toContain("C:\\Users");
    expect(json).not.toContain("abc");
    expect(json).not.toContain("sk-test-secret");
    expect(json).not.toContain("private-user");
    expect(json).not.toContain("benefit-letter");
    expect(json).not.toContain("sourceFile");
    expect(json).not.toContain("scannedFile");
    expect(json).toContain("successful_capture");
    expect(json).toContain("captureSharpnessMetric");
  });
});
