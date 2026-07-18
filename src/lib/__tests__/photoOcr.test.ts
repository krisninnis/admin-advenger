import { beforeEach, describe, expect, it, vi } from "vitest";
import photoOcrSource from "../photoOcr.ts?raw";
import localOcrServiceSource from "../../services/localOcrService.ts?raw";

const recognizeMock = vi.fn();

vi.mock("tesseract.js", () => ({
  recognize: (...args: unknown[]) => recognizeMock(...args),
}));

import {
  OCR_FAILED_MESSAGE,
  OCR_ADD_CLOSE_UP_SUGGESTION,
  OCR_COMBINED_PHOTOS_ON_DEVICE_MESSAGE,
  OCR_EXTRA_PHOTO_LABEL,
  OCR_MAIN_PHOTO_LABEL,
  OCR_GARBLED_TEXT_WARNING,
  OCR_LOW_CONFIDENCE_WARNING,
  OCR_LOW_TEXT_MESSAGE,
  OCR_MISTAKES_MESSAGE,
  OCR_MODERATE_CONFIDENCE_WARNING,
  OCR_ON_DEVICE_MESSAGE,
  OCR_PREPROCESS_MAX_UPSCALE_FACTOR,
  OCR_PREPROCESS_TARGET_MIN_DIMENSION,
  OCR_READING_STATUS_MESSAGE,
  OCR_REVIEW_BEFORE_CHECKING_MESSAGE,
  OCR_RUNS_ON_DEVICE_MESSAGE,
  OCR_CHECK_TEXT_UNRELIABLE_WARNING,
  OCR_KEY_DETAILS_CONFIDENCE_THRESHOLD,
  OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
  OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE,
  OCR_UNRELIABLE_CONFIDENCE_THRESHOLD,
  OCR_UNRELIABLE_EDIT_MESSAGE,
  OCR_UNRELIABLE_MESSAGE,
  OCR_UNRELIABLE_RETAKE_MESSAGE,
  OcrReadError,
  appendExtraPhotoText,
  applyGrayscaleContrast,
  combineOcrTexts,
  formatOcrSectionWarning,
  getNextCloseUpPhotoLabel,
  getOcrPreprocessPlan,
  getOcrPreprocessScale,
  getOcrQualityWarnings,
  isLikelyGarbledText,
  isOcrKeyDetailsReliable,
  isOcrResultUnreliable,
  preprocessImageForOcr,
  shouldSuggestCloseUpPhoto,
  readTextFromImage,
} from "../photoOcr";

const fakeImage = new Blob(["pretend jpeg bytes"], { type: "image/jpeg" });

beforeEach(() => {
  recognizeMock.mockReset();
});

describe("OCR runtime loading", () => {
  it("keeps heavy OCR runtime code out of the initial bundle by using dynamic imports", () => {
    expect(photoOcrSource).not.toMatch(/import\s+.*\s+from\s+["']tesseract\.js["']/);
    expect(localOcrServiceSource).not.toMatch(/import\s+.*\s+from\s+["']tesseract\.js["']/);
    expect(photoOcrSource).toContain('import("tesseract.js")');
    expect(localOcrServiceSource).toContain('import("tesseract.js")');
  });
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

// ---- Low-confidence guard used by the OCR review UI ----
describe("isOcrResultUnreliable", () => {
  it("marks OCR below the reliability threshold as unreliable", () => {
    expect(isOcrResultUnreliable("This looks like enough text to review.", 30)).toBe(true);
    expect(OCR_UNRELIABLE_CONFIDENCE_THRESHOLD).toBe(45);
  });

  it("marks very short or garbled text as unreliable even without a confidence value", () => {
    expect(isOcrResultUnreliable("Hi", undefined)).toBe(true);
    expect(isOcrResultUnreliable("]{-_~^%#@!*()[[}}}~~^^%%##]]", undefined)).toBe(true);
  });

  it("does not mark readable, confident OCR as unreliable", () => {
    expect(isOcrResultUnreliable("Your refund of Â£42.99 has been approved.", 88)).toBe(false);
  });

  it("provides the exact low-confidence OCR review copy", () => {
    expect(OCR_UNRELIABLE_MESSAGE).toBe("We could not read this photo reliably.");
    expect(OCR_UNRELIABLE_RETAKE_MESSAGE).toBe(
      "Retake the photo closer, upload a clearer image, or paste the text manually.",
    );
    expect(OCR_UNRELIABLE_EDIT_MESSAGE).toBe(
      "You can still edit the extracted text yourself before checking it.",
    );
    expect(OCR_CHECK_TEXT_UNRELIABLE_WARNING).toBe(
      "Only continue if you have checked or corrected the text.",
    );
  });
});

describe("isOcrKeyDetailsReliable", () => {
  it("hides normal key details at moderate/poor confidence like 52%", () => {
    expect(isOcrKeyDetailsReliable("This OCR text is long enough but still uncertain.", 52)).toBe(false);
    expect(OCR_KEY_DETAILS_CONFIDENCE_THRESHOLD).toBe(60);
  });

  it("allows normal key details at 60% confidence or above", () => {
    expect(isOcrKeyDetailsReliable("Your refund of Â£42.99 has been approved.", 60)).toBe(true);
    expect(isOcrKeyDetailsReliable("Your refund of Â£42.99 has been approved.", 82)).toBe(true);
  });

  it("provides the exact moderate-confidence key-details copy", () => {
    expect(OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE).toBe(
      "We could read some text, but not reliably enough to extract key details.",
    );
    expect(OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE).toBe(
      "Retake the photo closer, upload a clearer image, paste the text manually, or edit the text below.",
    );
  });
});

// ---- Moderate-confidence warning (the ~54% real-world case) ----
describe("moderate OCR confidence warning", () => {
  it("warns with the required copy when confidence is in the moderate band (e.g. the reported ~54%)", () => {
    const result = getOcrQualityWarnings("A reasonably long sentence of extracted text.", 54);
    expect(result).toEqual([OCR_MODERATE_CONFIDENCE_WARNING]);
  });

  it("uses the severe warning, not the moderate one, below the low-confidence threshold", () => {
    const result = getOcrQualityWarnings("A reasonably long sentence of extracted text.", 30);
    expect(result).toEqual([OCR_LOW_CONFIDENCE_WARNING]);
  });

  it("warns via readTextFromImage end-to-end for a moderate-confidence result", async () => {
    recognizeMock.mockResolvedValue({
      data: { text: "This is a normal length sentence of extracted letter text.", confidence: 54 },
    });

    const result = await readTextFromImage(fakeImage);

    expect(result.warnings).toContain(OCR_MODERATE_CONFIDENCE_WARNING);
  });
});

// ---- Garbled-text warning ----
describe("isLikelyGarbledText / garbled-text warning", () => {
  it("does not flag ordinary prose, even with numbers, dates, and currency", () => {
    expect(isLikelyGarbledText("Your payment of £58.20 was due on 12 August 2026.")).toBe(false);
  });

  it("flags text that is mostly symbols/noise rather than letters", () => {
    expect(isLikelyGarbledText("]{-_~^%#@!*()[[}}}~~^^%%##]]")).toBe(true);
  });

  it("getOcrQualityWarnings returns the garbled-text warning for noisy but non-trivial-length text", () => {
    const warnings = getOcrQualityWarnings("]{-_~^%#@!*()[[}}}~~^^%%##]] more noise here too!!", 95);
    expect(warnings).toContain(OCR_GARBLED_TEXT_WARNING);
  });

  it("prefers the short-text warning over the garbled warning for very short text", () => {
    const warnings = getOcrQualityWarnings("]#@!", 95);
    expect(warnings).toEqual([OCR_LOW_TEXT_MESSAGE]);
  });
});

// ---- OCR preprocessing (pure helpers) ----
describe("getOcrPreprocessScale", () => {
  it("does not upscale an image already at or above the target dimension", () => {
    expect(getOcrPreprocessScale(2000, 3000)).toBe(1);
    expect(getOcrPreprocessScale(OCR_PREPROCESS_TARGET_MIN_DIMENSION, 500)).toBe(1);
    expect(getOcrPreprocessPlan(2000, 3000)).toMatchObject({
      shouldPreprocess: false,
      outputWidth: 2000,
      outputHeight: 3000,
      reason: "already_high_resolution",
    });
  });

  it("upscales a small image up to the target long edge", () => {
    const scale = getOcrPreprocessScale(800, 600);
    expect(scale).toBeCloseTo(OCR_PREPROCESS_TARGET_MIN_DIMENSION / 800);
    expect(getOcrPreprocessPlan(800, 600)).toMatchObject({
      shouldPreprocess: true,
      outputWidth: 1600,
      outputHeight: 1200,
      reason: "upscaled_for_ocr",
    });
  });

  it("never upscales past the max upscale factor, even for a tiny image", () => {
    const scale = getOcrPreprocessScale(100, 50);
    expect(scale).toBe(OCR_PREPROCESS_MAX_UPSCALE_FACTOR);
  });

  it("treats zero/negative/missing dimensions as 'do not scale' rather than dividing by zero", () => {
    expect(getOcrPreprocessScale(0, 0)).toBe(1);
    expect(getOcrPreprocessScale(-10, 500)).toBe(1);
    expect(getOcrPreprocessPlan(0, 0)).toMatchObject({
      shouldPreprocess: false,
      outputWidth: 0,
      outputHeight: 0,
      reason: "invalid_dimensions",
    });
  });
});

describe("preprocessImageForOcr dimensions", () => {
  const withFakeImageDom = async (
    dimensions: { width: number; height: number },
    run: (fakeCanvas: {
      width: number;
      height: number;
      drawImage: ReturnType<typeof vi.fn>;
      getImageData: ReturnType<typeof vi.fn>;
      putImageData: ReturnType<typeof vi.fn>;
    }) => Promise<void>,
  ) => {
    const drawImage = vi.fn();
    const getImageData = vi.fn(() => ({ data: new Uint8ClampedArray([120, 140, 160, 255]) }));
    const putImageData = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage,
        getImageData,
        putImageData,
      }),
      toBlob: (callback: (blob: Blob | null) => void, type: string) => {
        callback(new Blob(["preprocessed"], { type }));
      },
    };

    class FakeImage {
      naturalWidth = dimensions.width;
      naturalHeight = dimensions.height;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onload?.();
      }
    }

    vi.stubGlobal("document", {
      createElement: () => fakeCanvas,
    });
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:fake-photo"),
      revokeObjectURL: vi.fn(),
    });

    try {
      await run({
        get width() {
          return fakeCanvas.width;
        },
        get height() {
          return fakeCanvas.height;
        },
        drawImage,
        getImageData,
        putImageData,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  };

  it("preserves high source dimensions and passes readable images through without canvas re-export", async () => {
    await withFakeImageDom({ width: 2048, height: 1366 }, async (fakeCanvas) => {
      const source = new Blob(["large readable photo"], { type: "image/jpeg" });
      const prepared = await preprocessImageForOcr(source);

      expect(prepared.image).toBe(source);
      expect(prepared.debug).toMatchObject({
        sourceWidth: 2048,
        sourceHeight: 1366,
        ocrWidth: 2048,
        ocrHeight: 1366,
        sourceMimeType: "image/jpeg",
        ocrMimeType: "image/jpeg",
        preprocessScale: 1,
        usedPreprocessedImage: false,
        preprocessReason: "already_high_resolution",
      });
      expect(fakeCanvas.drawImage).not.toHaveBeenCalled();
    });
  });

  it("upscales only small images before OCR and records OCR dimensions", async () => {
    await withFakeImageDom({ width: 800, height: 600 }, async (fakeCanvas) => {
      const source = new Blob(["small photo"], { type: "image/jpeg" });
      const prepared = await preprocessImageForOcr(source);

      expect(prepared.image).not.toBe(source);
      expect(prepared.image.type).toBe("image/png");
      expect(prepared.debug).toMatchObject({
        sourceWidth: 800,
        sourceHeight: 600,
        ocrWidth: 1600,
        ocrHeight: 1200,
        preprocessScale: 2,
        usedPreprocessedImage: true,
        preprocessReason: "upscaled_for_ocr",
      });
      expect(fakeCanvas.width).toBe(1600);
      expect(fakeCanvas.height).toBe(1200);
      expect(fakeCanvas.drawImage).toHaveBeenCalledOnce();
    });
  });

  it("passes the original high-resolution blob to Tesseract and returns text-free debug info", async () => {
    await withFakeImageDom({ width: 2048, height: 1366 }, async () => {
      const source = new Blob(["large readable photo"], { type: "image/jpeg" });
      recognizeMock.mockResolvedValue({
        data: { text: "Readable letter text", confidence: 91 },
      });

      const result = await readTextFromImage(source);

      expect(recognizeMock).toHaveBeenCalledTimes(1);
      expect(recognizeMock.mock.calls[0][0]).toBe(source);
      expect(result.debug).toMatchObject({
        sourceWidth: 2048,
        sourceHeight: 1366,
        ocrWidth: 2048,
        ocrHeight: 1366,
        usedPreprocessedImage: false,
      });
      expect(JSON.stringify(result.debug)).not.toContain("Readable letter text");
    });
  });
});

describe("applyGrayscaleContrast", () => {
  it("converts a colour pixel to an equal-channel (grayscale) pixel", () => {
    const pixels = new Uint8ClampedArray([200, 50, 10, 255]);
    applyGrayscaleContrast(pixels);

    expect(pixels[0]).toBe(pixels[1]);
    expect(pixels[1]).toBe(pixels[2]);
    expect(pixels[3]).toBe(255); // alpha untouched
  });

  it("pushes mid-tones apart from each other (contrast boost), not just averaging to grey", () => {
    const lightPixels = new Uint8ClampedArray([220, 220, 220, 255]);
    const darkPixels = new Uint8ClampedArray([40, 40, 40, 255]);
    applyGrayscaleContrast(lightPixels);
    applyGrayscaleContrast(darkPixels);

    // A light pixel should get lighter (or stay clamped at 255) and a dark
    // pixel should get darker (or stay clamped at 0) relative to the
    // original mid-grey (128) - i.e. contrast increases, it does not flatten.
    expect(lightPixels[0]).toBeGreaterThanOrEqual(220);
    expect(darkPixels[0]).toBeLessThanOrEqual(40);
  });

  it("stays within valid 0-255 pixel bounds (Uint8ClampedArray also enforces this)", () => {
    const pixels = new Uint8ClampedArray([255, 255, 255, 255]);
    applyGrayscaleContrast(pixels);
    expect(pixels[0]).toBeLessThanOrEqual(255);
    expect(pixels[0]).toBeGreaterThanOrEqual(0);
  });
});

// ---- Preprocessing fallback (no DOM in this test environment) ----
describe("readTextFromImage falls back gracefully when preprocessing cannot run", () => {
  it("still passes the original image through to Tesseract when preprocessing is unavailable", async () => {
    // This project's tests run without jsdom, so preprocessImageForOcr always
    // rejects here (no document/Image/URL.createObjectURL) - this pins down
    // that readTextFromImage falls back to the original image rather than
    // failing the whole OCR read.
    recognizeMock.mockResolvedValue({ data: { text: "Some text here", confidence: 80 } });

    await readTextFromImage(fakeImage);

    const [image] = recognizeMock.mock.calls[0];
    expect(image).toBe(fakeImage);
  });
});

// ---- Multi-photo planning helper ----
describe("combineOcrTexts", () => {
  it("joins multiple photos' extracted text with a clear separator", () => {
    expect(combineOcrTexts(["First photo text.", "Second photo text."])).toBe(
      "First photo text.\n\n---\n\nSecond photo text.",
    );
  });

  it("combines labelled photo sections in the order they were added", () => {
    expect(
      combineOcrTexts([
        { label: OCR_MAIN_PHOTO_LABEL, text: "Main text." },
        { label: OCR_EXTRA_PHOTO_LABEL, text: "Close-up text." },
      ]),
    ).toBe("--- Main photo ---\nMain text.\n\n--- Close-up photo ---\nClose-up text.");
  });

  it("can append another labelled photo after already-reviewed text", () => {
    expect(
      combineOcrTexts([
        "Already reviewed text.",
        { label: OCR_EXTRA_PHOTO_LABEL, text: "Extra page text." },
      ]),
    ).toBe("Already reviewed text.\n\n--- Close-up photo ---\nExtra page text.");
  });

  it("formats low-confidence section warnings with the simple photo label", () => {
    expect(formatOcrSectionWarning(OCR_EXTRA_PHOTO_LABEL, OCR_LOW_CONFIDENCE_WARNING)).toBe(
      `Close-up photo: ${OCR_LOW_CONFIDENCE_WARNING}`,
    );
  });

  it("trims each piece of text and drops empty entries", () => {
    expect(combineOcrTexts(["  First.  ", "", "   ", "Second."])).toBe("First.\n\n---\n\nSecond.");
  });

  it("returns an empty string for no usable text", () => {
    expect(combineOcrTexts(["", "   "])).toBe("");
  });

  it("returns the single text unchanged when there is only one photo", () => {
    expect(combineOcrTexts(["Only photo text."])).toBe("Only photo text.");
  });

  it("states the exact combined-photo local OCR copy", () => {
    expect(OCR_COMBINED_PHOTOS_ON_DEVICE_MESSAGE).toBe(
      "We read your photos on your device. Please check the combined text before continuing.",
    );
  });
});

// ---- Optional "Add close-up photo" append flow ----
describe("appendExtraPhotoText", () => {
  it("labels the existing text as Main photo and the new text as Close-up photo", () => {
    expect(appendExtraPhotoText("Existing letter text.", "Close-up text.")).toBe(
      "--- Main photo ---\nExisting letter text.\n\n--- Close-up photo ---\nClose-up text.",
    );
  });

  it("uses only simple labels - never forced photo sequence or top/bottom-half wording", () => {
    const combined = appendExtraPhotoText("Existing letter text.", "Close-up text.");

    expect(combined).not.toMatch(/Photo \d+:/);
    expect(combined).not.toMatch(new RegExp("top\\s+half", "i"));
    expect(combined).not.toMatch(new RegExp("bottom\\s+half", "i"));
  });

  it("does not re-wrap the main text when appending a second close-up photo", () => {
    const afterFirst = appendExtraPhotoText("Existing letter text.", "First close-up.");
    const afterSecond = appendExtraPhotoText(afterFirst, "Second close-up.");

    expect(afterSecond).toBe(
      "--- Main photo ---\nExisting letter text.\n\n--- Close-up photo ---\nFirst close-up.\n\n--- Close-up photo 2 ---\nSecond close-up.",
    );
    expect(afterSecond.match(/--- Main photo ---/g)).toHaveLength(1);
  });

  it("returns just the extra section when there is no existing text", () => {
    expect(appendExtraPhotoText("", "Close-up text.")).toBe(
      "--- Close-up photo ---\nClose-up text.",
    );
  });

  it("uses the first close-up label first, then numbers later optional close-ups", () => {
    expect(getNextCloseUpPhotoLabel("Existing letter text.")).toBe("Close-up photo");
    expect(
      getNextCloseUpPhotoLabel(
        "--- Main photo ---\nExisting letter text.\n\n--- Close-up photo ---\nFirst close-up.",
      ),
    ).toBe("Close-up photo 2");
  });
});

// ---- Smart close-up suggestion: only pushed when the read was weak ----
describe("shouldSuggestCloseUpPhoto", () => {
  const goodText =
    "Parking Charge Notice. Amount due £255.00. Reference VCS23217813. Reply by 19/03/2026.";

  it("does not push a close-up for a good single-photo read (like the live 78% test)", () => {
    expect(shouldSuggestCloseUpPhoto(goodText, 78)).toBe(false);
    expect(shouldSuggestCloseUpPhoto(goodText, 70)).toBe(false);
  });

  it("suggests a close-up or retake for moderate/poor confidence reads", () => {
    expect(shouldSuggestCloseUpPhoto(goodText, 59)).toBe(true);
    expect(shouldSuggestCloseUpPhoto(goodText, 45)).toBe(true);
    expect(shouldSuggestCloseUpPhoto(goodText, 20)).toBe(true);
  });

  it("suggests a close-up when the text itself looks unreliable, whatever the confidence", () => {
    expect(shouldSuggestCloseUpPhoto("~~ %% @@ ## ~~ %% @@ ##", 90)).toBe(true);
    expect(shouldSuggestCloseUpPhoto("ab", 90)).toBe(true);
  });

  it("states the exact suggestion copy in plain language", () => {
    expect(OCR_ADD_CLOSE_UP_SUGGESTION).toBe(
      "Retake the photo or add a close-up of the hard-to-read section.",
    );
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
    OCR_COMBINED_PHOTOS_ON_DEVICE_MESSAGE,
    OCR_ADD_CLOSE_UP_SUGGESTION,
    OCR_LOW_CONFIDENCE_WARNING,
    OCR_MODERATE_CONFIDENCE_WARNING,
    OCR_GARBLED_TEXT_WARNING,
    OCR_UNRELIABLE_MESSAGE,
    OCR_UNRELIABLE_RETAKE_MESSAGE,
    OCR_UNRELIABLE_EDIT_MESSAGE,
    OCR_CHECK_TEXT_UNRELIABLE_WARNING,
    OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
    OCR_KEY_DETAILS_REVIEW_OPTIONS_MESSAGE,
  ];

  const forbiddenPatterns = [
    /\bupload(?:ed|ing)?\s+(?:to|onto)\b/i,
    /\bupload(?:ed|ing)?.*\b(?:server|cloud)\b/i,
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
