import { beforeEach, describe, expect, it, vi } from "vitest";

const recognizeMock = vi.fn();

vi.mock("tesseract.js", () => ({
  recognize: (...args: unknown[]) => recognizeMock(...args),
}));

import {
  OCR_FAILED_MESSAGE,
  OCR_LOW_CONFIDENCE_WARNING,
  OCR_LOW_TEXT_MESSAGE,
  OCR_MISTAKES_MESSAGE,
  OCR_ON_DEVICE_MESSAGE,
  OCR_READING_STATUS_MESSAGE,
  OCR_REVIEW_BEFORE_CHECKING_MESSAGE,
  OCR_RUNS_ON_DEVICE_MESSAGE,
  OcrReadError,
  getOcrQualityWarnings,
  readTextFromImage,
} from "../photoOcr";

const fakeImage = new Blob(["pretend jpeg bytes"], { type: "image/jpeg" });

beforeEach(() => {
  recognizeMock.mockReset();
});

// ---- readTextFromImage: happy path ----
describe("readTextFromImage", () => {
  it("returns the extracted, normalised text from a mocked Tesseract result", async () => {
    recognizeMock.mockResolvedValue({
      data: { text: "  Hello from the photo.  \r\n\r\n\r\n", confidence: 92 },
    });

    const result = await readTextFromImage(fakeImage);

    expect(result.text).toBe("Hello from the photo.");
    expect(result.confidence).toBe(92);
    expect(result.warnings).toEqual([]);
  });

  it("passes the image and language straight through to Tesseract.recognize", async () => {
    recognizeMock.mockResolvedValue({ data: { text: "Some text here", confidence: 80 } });

    await readTextFromImage(fakeImage);

    expect(recognizeMock).toHaveBeenCalledTimes(1);
    const [image, language] = recognizeMock.mock.calls[0];
    expect(image).toBe(fakeImage);
    expect(language).toBe("eng");
  });

  // ---- Progress mapping ----
  it("maps Tesseract logger messages to a safe 0-1 progress value", async () => {
    const progressUpdates: Array<{ status: string; progress: number }> = [];

    recognizeMock.mockImplementation(async (_image, _lang, options) => {
      options.logger({ status: "recognizing text", progress: 0.42 });
      return { data: { text: "Readable text", confidence: 88 } };
    });

    await readTextFromImage(fakeImage, (progress) => progressUpdates.push(progress));

    expect(progressUpdates).toEqual([{ status: "recognizing text", progress: 0.42 }]);
  });

  it("clamps out-of-range or missing progress values into 0-1 instead of passing them through raw", async () => {
    const progressUpdates: Array<{ status: string; progress: number }> = [];

    recognizeMock.mockImplementation(async (_image, _lang, options) => {
      options.logger({ status: "loading", progress: -5 });
      options.logger({ status: "recognizing text", progress: 5 });
      options.logger({ status: "unknown stage", progress: undefined });
      return { data: { text: "Readable text", confidence: 88 } };
    });

    await readTextFromImage(fakeImage, (progress) => progressUpdates.push(progress));

    expect(progressUpdates).toEqual([
      { status: "loading", progress: 0 },
      { status: "recognizing text", progress: 1 },
      { status: "unknown stage", progress: 0 },
    ]);
  });

  it("works with no onProgress callback provided", async () => {
    recognizeMock.mockImplementation(async (_image, _lang, options) => {
      options.logger({ status: "recognizing text", progress: 0.5 });
      return { data: { text: "Readable text", confidence: 88 } };
    });

    await expect(readTextFromImage(fakeImage)).resolves.toMatchObject({ text: "Readable text" });
  });

  // ---- Short-text warning ----
  it("warns when very little text was found, but still returns the (short) text rather than blocking", async () => {
    recognizeMock.mockResolvedValue({ data: { text: "Hi", confidence: 90 } });

    const result = await readTextFromImage(fakeImage);

    expect(result.text).toBe("Hi");
    expect(result.warnings).toContain(OCR_LOW_TEXT_MESSAGE);
  });

  it("does not warn about short text once enough text has been found", async () => {
    recognizeMock.mockResolvedValue({
      data: { text: "This is a perfectly readable sentence.", confidence: 90 },
    });

    const result = await readTextFromImage(fakeImage);

    expect(result.warnings).not.toContain(OCR_LOW_TEXT_MESSAGE);
  });

  // ---- Low-confidence warning ----
  it("warns (without blocking) when Tesseract reports low confidence", async () => {
    recognizeMock.mockResolvedValue({
      data: { text: "This text was hard for OCR to read clearly.", confidence: 12 },
    });

    const result = await readTextFromImage(fakeImage);

    expect(result.text.length).toBeGreaterThan(0);
    expect(result.warnings).toContain(OCR_LOW_CONFIDENCE_WARNING);
  });

  it("does not treat confidence as missing/undefined as low confidence", async () => {
    recognizeMock.mockResolvedValue({
      data: { text: "This text has no confidence value at all from this engine." },
    });

    const result = await readTextFromImage(fakeImage);

    expect(result.confidence).toBeUndefined();
    expect(result.warnings).not.toContain(OCR_LOW_CONFIDENCE_WARNING);
  });

  // ---- Failure handling ----
  it("throws a safe, handled OcrReadError (rather than crashing) when Tesseract itself fails", async () => {
    recognizeMock.mockRejectedValue(new Error("worker crashed"));

    await expect(readTextFromImage(fakeImage)).rejects.toBeInstanceOf(OcrReadError);
    await expect(readTextFromImage(fakeImage)).rejects.toThrow(OCR_FAILED_MESSAGE);
  });
});

// ---- getOcrQualityWarnings (pure helper) ----
describe("getOcrQualityWarnings", () => {
  it("returns no warnings for confident, non-trivial text", () => {
    expect(getOcrQualityWarnings("A normal amount of readable text.", 95)).toEqual([]);
  });

  it("returns the short-text warning for very short text", () => {
    expect(getOcrQualityWarnings("Hi", 95)).toEqual([OCR_LOW_TEXT_MESSAGE]);
  });

  it("returns the low-confidence warning when confidence is low, even with plenty of text", () => {
    expect(getOcrQualityWarnings("Plenty of text was found here, just not confidently.", 10)).toEqual([
      OCR_LOW_CONFIDENCE_WARNING,
    ]);
  });

  it("can return both warnings together", () => {
    expect(getOcrQualityWarnings("Hi", 10)).toEqual([OCR_LOW_TEXT_MESSAGE, OCR_LOW_CONFIDENCE_WARNING]);
  });

  it("does not warn on low confidence when confidence is undefined (unknown, not low)", () => {
    expect(getOcrQualityWarnings("Plenty of text was found here.", undefined)).toEqual([]);
  });
});

// ---- Safety / local-first / plain-English copy ----
describe("OCR copy never implies cloud upload, sending, storage, or a guaranteed read", () => {
  const allMessages = [
    OCR_ON_DEVICE_MESSAGE,
    OCR_MISTAKES_MESSAGE,
    OCR_LOW_TEXT_MESSAGE,
    OCR_FAILED_MESSAGE,
    OCR_READING_STATUS_MESSAGE,
    OCR_RUNS_ON_DEVICE_MESSAGE,
    OCR_REVIEW_BEFORE_CHECKING_MESSAGE,
    OCR_LOW_CONFIDENCE_WARNING,
  ];

  const forbiddenPatterns = [
    /\bupload(ed|ing)?\b/i,
    /\bsent to (a |the )?server\b/i,
    /\bsends?\b/i,
    /\bstored permanently\b/i,
    /\bguaranteed?\b/i,
    /\bdefinitely correct\b/i,
    /\bcloud\b/i,
    /\bcontact(ed|ing)?\b/i,
    /\bsubmit(ted|ting)?\b/i,
  ];

  it("no OCR copy string contains forbidden cloud/upload/send/store/guarantee wording", () => {
    for (const message of allMessages) {
      for (const pattern of forbiddenPatterns) {
        expect(message).not.toMatch(pattern);
      }
    }
  });

  it("states the exact required on-device/privacy copy", () => {
    expect(OCR_ON_DEVICE_MESSAGE).toBe(
      "We read this photo on your device. Please check the text before continuing.",
    );
    expect(OCR_MISTAKES_MESSAGE).toBe(
      "OCR can make mistakes, especially with blurry photos, small print, folds, shadows, handwriting, or poor lighting.",
    );
    expect(OCR_RUNS_ON_DEVICE_MESSAGE).toBe("OCR runs on your device.");
    expect(OCR_REVIEW_BEFORE_CHECKING_MESSAGE).toBe("Review the extracted text before checking it.");
  });

  it("states the exact required low-text and failure copy", () => {
    expect(OCR_LOW_TEXT_MESSAGE).toBe(
      "We could not read much text from this photo. Try a clearer photo or paste the text manually.",
    );
    expect(OCR_FAILED_MESSAGE).toBe(
      "We could not read this photo. You can try another photo or paste the text manually.",
    );
  });
});
