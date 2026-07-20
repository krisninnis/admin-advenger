// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE,
  LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT,
  LowConfidenceOcrReviewPanel,
} from "../LowConfidenceOcrReviewPanel";
import {
  OCR_CHECK_TEXT_UNRELIABLE_WARNING,
  OCR_EXTRACTED_TEXT_DISCLOSURE_HELP,
  OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
  OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE,
  OCR_UNRELIABLE_MESSAGE,
  OCR_UNRELIABLE_REVIEW_MESSAGE,
} from "../../lib/photoOcr";

afterEach(() => {
  cleanup();
});

const noisyOcrText = "Our Refermce: ZX-17\n££ @@@ unreadable background words";

const renderPanel = (overrides: Partial<Parameters<typeof LowConfidenceOcrReviewPanel>[0]> = {}) => {
  const props = {
    previewUrl: "blob:prepared-scan",
    extractedText: noisyOcrText,
    onRetake: vi.fn(),
    onAddCloseUp: vi.fn(),
    onUploadClearer: vi.fn(),
    onCheckCorrectedText: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };

  const result = render(<LowConfidenceOcrReviewPanel {...props} />);

  return { ...result, props };
};

describe("LowConfidenceOcrReviewPanel", () => {
  it("renders the approved low-confidence OCR hierarchy without preparation-failure actions", () => {
    renderPanel();

    expect(screen.getByRole("heading", { level: 1, name: OCR_UNRELIABLE_MESSAGE })).toBeTruthy();
    expect(screen.getAllByText(OCR_UNRELIABLE_REVIEW_MESSAGE)).toHaveLength(1);
    expect(screen.getAllByText(OCR_KEY_DETAILS_NOT_RELIABLE_MESSAGE)).toHaveLength(1);
    expect(screen.getByAltText("Prepared document preview used for text reading")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retake photo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a close-up" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload a clearer photo" })).toBeTruthy();
    expect(screen.getByText(LOW_CONFIDENCE_OCR_PRIVACY_MESSAGE)).toBeTruthy();
    expect(screen.getByText(LOW_CONFIDENCE_OCR_STATUS_ANNOUNCEMENT)).toBeTruthy();
    expect(screen.queryByText("Use original photo anyway")).toBeNull();
    expect(screen.queryByText("We couldn't find a clear document in this photo")).toBeNull();
    expect(screen.queryByText(/OCR confidence/i)).toBeNull();
  });

  it("keeps noisy extracted text collapsed until the user opens the editor", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByDisplayValue(noisyOcrText)).toBeNull();

    const disclosureButton = screen.getByRole("button", {
      name: OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
    });

    expect(disclosureButton.getAttribute("aria-expanded")).toBe("false");

    await user.click(disclosureButton);

    expect(disclosureButton.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(OCR_EXTRACTED_TEXT_DISCLOSURE_HELP)).toBeTruthy();
    expect(screen.getByText(OCR_CHECK_TEXT_UNRELIABLE_WARNING)).toBeTruthy();
    const editor = screen.getByLabelText("Text to correct") as HTMLTextAreaElement;
    expect(editor).toBe(document.activeElement);
    expect(editor.value).toBe(noisyOcrText);
  });

  it("opens the disclosure with the keyboard and submits only edited text", async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    const disclosureButton = screen.getByRole("button", {
      name: OCR_EXTRACTED_TEXT_DISCLOSURE_LABEL,
    });
    disclosureButton.focus();
    expect(document.activeElement).toBe(disclosureButton);

    await user.keyboard("{Enter}");
    const editor = screen.getByLabelText("Text to correct");
    expect(document.activeElement).toBe(editor);
    expect(props.onCheckCorrectedText).not.toHaveBeenCalled();

    await user.clear(editor);
    await user.type(editor, "Corrected council letter text with the reference checked.");
    await user.click(screen.getByRole("button", { name: "Check corrected text" }));

    expect(props.onCheckCorrectedText).toHaveBeenCalledWith(
      "Corrected council letter text with the reference checked.",
    );
    expect(props.onCheckCorrectedText).not.toHaveBeenCalledWith(noisyOcrText);
  });

  it("routes recovery actions without saving or checking automatically", async () => {
    const user = userEvent.setup();
    const { container, props } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Retake photo" }));
    await user.click(screen.getByRole("button", { name: "Add a close-up" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    const clearerPhoto = new File(["clearer"], "clearer-photo.jpg", { type: "image/jpeg" });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).toBeTruthy();
    await user.upload(fileInput as HTMLInputElement, clearerPhoto);

    await waitFor(() => {
      expect(props.onRetake).toHaveBeenCalledTimes(1);
      expect(props.onAddCloseUp).toHaveBeenCalledTimes(1);
      expect(props.onCancel).toHaveBeenCalledTimes(1);
      expect(props.onUploadClearer).toHaveBeenCalledWith(clearerPhoto);
    });
    expect(props.onCheckCorrectedText).not.toHaveBeenCalled();
  });

  it("omits the preview image when no reliable preview URL is available", () => {
    renderPanel({ previewUrl: "" });

    expect(screen.queryByAltText("Prepared document preview used for text reading")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: OCR_UNRELIABLE_MESSAGE })).toBeTruthy();
  });
});
