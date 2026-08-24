import { describe, expect, it } from "vitest";
import {
  SCANNER_V2_ENGINE_STATUS,
  applyDocumentEnhancement,
  clampDocumentPoint,
  getDefaultDocumentQuad,
  getFullImageQuad,
  updateDocumentQuadPoint,
} from "../documentScannerV2";

describe("documentScannerV2", () => {
  it("keeps the engine status explicitly provisional", () => {
    expect(SCANNER_V2_ENGINE_STATUS).toBe("PROVISIONAL PENDING REAL-DEVICE ACCEPTANCE");
  });

  it("creates a safe inset manual crop when auto-detection is unavailable", () => {
    expect(getDefaultDocumentQuad(1000, 2000)).toEqual({
      topLeft: { x: 60, y: 120 },
      topRight: { x: 940, y: 120 },
      bottomRight: { x: 940, y: 1880 },
      bottomLeft: { x: 60, y: 1880 },
    });
  });

  it("creates a full-image crop without inventing out-of-bounds pixels", () => {
    expect(getFullImageQuad(100, 200)).toEqual({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 99, y: 0 },
      bottomRight: { x: 99, y: 199 },
      bottomLeft: { x: 0, y: 199 },
    });
  });

  it("clamps dragged crop handles to the source image", () => {
    expect(clampDocumentPoint({ x: -10, y: 500 }, 300, 400)).toEqual({ x: 0, y: 399 });
  });

  it("updates only the selected crop corner", () => {
    const quad = getFullImageQuad(100, 200);
    const updated = updateDocumentQuadPoint(
      quad,
      "topLeft",
      { x: 12, y: 34 },
      100,
      200,
    );
    expect(updated.topLeft).toEqual({ x: 12, y: 34 });
    expect(updated.bottomRight).toEqual(quad.bottomRight);
  });

  it("leaves pixels unchanged in original mode", () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255, 220, 210, 200, 255]);
    const imageData = { data: pixels, width: 2, height: 1 } as ImageData;
    const before = Array.from(pixels);
    applyDocumentEnhancement(imageData, "original");
    expect(Array.from(pixels)).toEqual(before);
  });

  it("produces neutral grayscale channels", () => {
    const pixels = new Uint8ClampedArray([30, 80, 140, 255, 220, 180, 100, 255]);
    const imageData = { data: pixels, width: 2, height: 1 } as ImageData;
    applyDocumentEnhancement(imageData, "grayscale");
    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[4]).toBe(pixels[5]);
    expect(pixels[5]).toBe(pixels[6]);
  });

  it("uses only black and white output in black-and-white mode", () => {
    const pixels = new Uint8ClampedArray([20, 20, 20, 255, 230, 230, 230, 255]);
    const imageData = { data: pixels, width: 2, height: 1 } as ImageData;
    applyDocumentEnhancement(imageData, "black_and_white");
    expect(new Set([pixels[0], pixels[4]])).toEqual(new Set([0, 255]));
  });
});
