import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import {
  OCR_EXTRACTED_TEXT_DISCLOSURE_HELP,
  OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
  OCR_UNRELIABLE_REVIEW_MESSAGE,
} from "../../lib/photoOcr";

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

describe("HomeView photo OCR review", () => {
  it("collapses noisy low-confidence OCR text behind one editable disclosure", () => {
    expect(OCR_UNRELIABLE_REVIEW_MESSAGE).toContain("not reliably enough");
    expect(OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL).toBe("Paste or edit the extracted text");
    expect(OCR_EXTRACTED_TEXT_DISCLOSURE_HELP).toContain("background text");

    const unreliableBlock = sliceBetween(
      homeViewSource,
      "isOcrReviewUnreliable ? (",
      "!isOcrReviewUnreliable && ocrWarnings.length > 0",
    );

    expect(unreliableBlock).toContain("OCR_UNRELIABLE_REVIEW_MESSAGE");
    expect(unreliableBlock).not.toContain("OCR_UNRELIABLE_RETAKE_MESSAGE");
    expect(unreliableBlock).not.toContain("OCR_UNRELIABLE_EDIT_MESSAGE");
    expect(unreliableBlock).not.toContain("ocrWarnings.map");

    const disclosureBlock = sliceBetween(
      homeViewSource,
      "<details",
      "OCR_REVIEW_BEFORE_CHECKING_MESSAGE",
    );

    expect(disclosureBlock).toContain("<details");
    expect(disclosureBlock).toContain("OCR_EXTRACTED_TEXT_DISCLOSURE_HELP");
    expect(disclosureBlock).toContain("value={ocrText}");
  });
});
