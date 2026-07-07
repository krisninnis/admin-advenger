import { describe, expect, it } from "vitest";
import {
  OCR_SMALL_IMAGE_WARNING,
  createPhotoIntakeMetadata,
  getImageQualityWarnings,
  isSupportedPhotoFile,
  metadataContainsEmbeddedImage,
  normalizeOcrText,
} from "../photoIntake";

const makeFile = (name: string, type: string) =>
  new File(["pretend image bytes"], name, { type });

describe("photo intake safety helpers", () => {
  it("keeps only safe photo metadata and never embeds image data", () => {
    const file = makeFile("refund-letter.jpg", "image/jpeg");
    const metadata = createPhotoIntakeMetadata(file);

    expect(metadata).toEqual({
      fileName: "refund-letter.jpg",
      fileSize: file.size,
      mimeType: "image/jpeg",
    });
    expect(metadataContainsEmbeddedImage(metadata)).toBe(false);
    expect(JSON.stringify(metadata)).not.toContain("data:image");
  });

  it("accepts common phone image formats without promising OCR success", () => {
    expect(isSupportedPhotoFile(makeFile("letter.jpeg", "image/jpeg"))).toBe(true);
    expect(isSupportedPhotoFile(makeFile("receipt.png", "image/png"))).toBe(true);
    expect(isSupportedPhotoFile(makeFile("bill.webp", "image/webp"))).toBe(true);
    expect(isSupportedPhotoFile(makeFile("photo.heic", ""))).toBe(true);
    expect(isSupportedPhotoFile(makeFile("document.pdf", "application/pdf"))).toBe(false);
  });

  it("normalizes OCR text before it enters the paste analysis path", () => {
    expect(normalizeOcrText("Refund approved   \r\n\r\n\r\nReference RF12345   \n")).toBe(
      "Refund approved\n\nReference RF12345",
    );
  });
});

// ---- Image quality warnings (file size / pixel dimensions) ----
// Written after mobile testing showed a real full-page letter photo coming
// back as image/jpeg at 0.07MB (~73KB) and ~54% OCR confidence - these
// thresholds are chosen so that exact case (and cases like it) produce a
// warning before OCR even has to run.
describe("getImageQualityWarnings", () => {
  it("warns when the file is far too small for a full-page letter (the reported 0.07MB case)", () => {
    const warnings = getImageQualityWarnings({ fileSize: 0.07 * 1024 * 1024 });
    expect(warnings).toEqual([OCR_SMALL_IMAGE_WARNING]);
  });

  it("does not warn on a normal-sized full-page photo", () => {
    const warnings = getImageQualityWarnings({ fileSize: 1.2 * 1024 * 1024, width: 2000, height: 3000 });
    expect(warnings).toEqual([]);
  });

  it("warns when pixel dimensions are too low, even if the file size looks fine", () => {
    const warnings = getImageQualityWarnings({ fileSize: 400 * 1024, width: 400, height: 300 });
    expect(warnings).toEqual([OCR_SMALL_IMAGE_WARNING]);
  });

  it("does not warn on unknown dimensions (undefined is treated as 'unknown', not 'too small')", () => {
    const warnings = getImageQualityWarnings({ fileSize: 1 * 1024 * 1024 });
    expect(warnings).toEqual([]);
  });

  it("only returns one warning even when both file size and dimensions are too small", () => {
    const warnings = getImageQualityWarnings({ fileSize: 50 * 1024, width: 300, height: 200 });
    expect(warnings).toEqual([OCR_SMALL_IMAGE_WARNING]);
  });

  it("treats a zero/unknown file size as not warning by itself", () => {
    const warnings = getImageQualityWarnings({ fileSize: 0 });
    expect(warnings).toEqual([]);
  });

  it("the small-image warning copy never implies a cloud upload or send", () => {
    const forbiddenPatterns = [/\bupload(ed|ing)?\b/i, /\bsent\b/i, /\bcloud\b/i, /\bserver\b/i];
    for (const pattern of forbiddenPatterns) {
      expect(OCR_SMALL_IMAGE_WARNING).not.toMatch(pattern);
    }
  });
});
