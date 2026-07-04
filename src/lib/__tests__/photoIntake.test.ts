import { describe, expect, it } from "vitest";
import {
  createPhotoIntakeMetadata,
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
