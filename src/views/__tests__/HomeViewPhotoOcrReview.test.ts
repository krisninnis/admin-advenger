import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import {
  OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
  OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
  OCR_UNRELIABLE_MESSAGE,
  OCR_UNRELIABLE_REVIEW_MESSAGE,
} from "../../lib/photoOcr";
import {
  LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE,
  LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT,
} from "../../components/LowConfidenceOcrReviewPanel";

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

describe("HomeView photo OCR review", () => {
  it("delegates low-confidence OCR review to the focused recovery panel", () => {
    expect(OCR_UNRELIABLE_MESSAGE).toBe("We couldn't read this clearly enough");
    expect(OCR_UNRELIABLE_REVIEW_MESSAGE).toBe(
      "We found some text, but parts may be wrong or missing. We've hidden important details rather than guessing; a clearer photo will usually work better.",
    );
    expect(OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE).toBe(
      "Key details are hidden because the photo was not clear enough.",
    );
    expect(OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL).toBe(
      "Review or edit the text we could read",
    );
    expect(LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT).toBe(
      "Photo read, but not clearly enough. Important details are hidden until you retake, add a close-up, or review the text.",
    );
    expect(LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE).toBe(
      "Your photo and extracted text are processed in this browser and are not uploaded to AdminAvenger. Nothing has been sent or saved to your cases.",
    );

    const successBlock = sliceBetween(
      homeViewSource,
      'selectedInput === "image" && ocrStatus === "success" && isOcrReviewUnreliable',
      'selectedInput === "image" && ocrStatus === "success" && !isOcrReviewUnreliable',
    );

    expect(successBlock).toContain("LowConfidenceOcrReviewPanel");
    expect(successBlock).toContain("previewUrl={imagePreviewUrl}");
    expect(successBlock).toContain("onRetake={handleRetakePhoto}");
    expect(successBlock).toContain("onAddCloseUp={handleAddCloseUpPhoto}");
    expect(successBlock).toContain("onUploadClearer={handleUploadClearerPhoto}");
    expect(successBlock).toContain("onCheckCorrectedText={(text) => void handleCheckOcrText(text)}");
    expect(successBlock).not.toContain("OCR confidence");
    expect(successBlock).not.toContain("Use original photo anyway");
  });

  it("clears stale OCR state before retake, upload replacement, or cancellation", () => {
    const resetBlock = sliceBetween(
      homeViewSource,
      "const resetPhotoOcrReview = () =>",
      "const getLowestOcrConfidence",
    );

    expect(resetBlock).toContain('setOcrText("")');
    expect(resetBlock).toContain('setOcrOriginalText("")');
    expect(resetBlock).toContain("setOcrConfidence(undefined)");
    expect(resetBlock).toContain("setOcrWarnings([])");
    expect(resetBlock).toContain("setOcrSectionWarnings([])");

    const uploadBlock = sliceBetween(
      homeViewSource,
      "const handleUploadClearerPhoto = (file: File) =>",
      "// \"Cancel\"",
    );

    expect(uploadBlock).toContain("resetPhotoOcrReview()");
    expect(uploadBlock).toContain("setPendingPhotoFile(file)");
    expect(uploadBlock).toContain('setPhotoCaptureIntent("replace")');
    expect(uploadBlock).toContain("setShowPhotoCapturePanel(true)");
  });
});
