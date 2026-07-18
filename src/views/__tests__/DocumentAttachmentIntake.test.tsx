import { describe, expect, it } from "vitest";
import addAdminItemSource from "../../components/AddAdminItem.tsx?raw";
import sidebarSource from "../../components/Sidebar.tsx?raw";
import addItemViewSource from "../AddItemView.tsx?raw";
import homeViewSource from "../HomeView.tsx?raw";
import documentAttachmentAreaSource from "../../components/DocumentAttachmentArea.tsx?raw";
import {
  ATTACHMENT_CHOOSE_BUTTON_LABEL,
  ATTACHMENT_COMBINED_TEXT_NOTE,
  ATTACHMENT_DRAG_DROP_LABEL,
  ATTACHMENT_HEADING,
  ATTACHMENT_HELPER,
  ATTACHMENT_LOCAL_ONLY_NOTE,
  ATTACHMENT_OCR_CAUTION_NOTE,
  ATTACHMENT_READ_FAILED_MESSAGE,
  VISIBLE_INPUT_DROP_HELPER,
  VISIBLE_INPUT_DROP_LABEL,
} from "../../lib/documentAttachmentIntake";
import {
  attachmentPickerAcceptAttribute,
  DOC_UNSUPPORTED_MESSAGE,
  UNSUPPORTED_FILE_MESSAGE,
} from "../../lib/fileIntakeAccept";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";

const sliceBetween = (source: string, startNeedle: string, endNeedle: string): string => {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

describe("Document Attachment Intake v1 - HomeView wiring", () => {
  it("renders the attachment area beside the paste box, without replacing it", () => {
    expect(homeViewSource).toContain("DocumentAttachmentArea");
    expect(homeViewSource).toContain("paste-message");
    expect(homeViewSource).toContain("VISIBLE_INPUT_DROP_LABEL");
  });

  it("acknowledges CV and job-advert documents in the main Home copy", () => {
    expect(homeViewSource).toContain("Paste a bill, email, letter, CV, job advert, or message.");
    expect(homeViewSource).toContain("Paste the email, bill, letter, CV, job advert, or message here...");
    expect(sidebarSource).toContain("Paste a bill, email, letter, CV, job advert, or message");
    expect(addAdminItemSource).toContain("Paste an email, message, bill, letter, CV, or job advert");
    expect(addAdminItemSource).toContain(
      "Paste the full email, message, bill, receipt, letter, CV, or job advert text here...",
    );
    expect(addItemViewSource).toContain("Paste an email, message, bill, letter, CV, or job advert.");
  });

  it("keeps the existing photo/file tabs and demo copy working alongside the new area", () => {
    expect(homeViewSource).toContain("Take or upload a photo");
    expect(homeViewSource).toContain("Upload a file");
  });

  it("routes image-tab photo uploads through the shared scanner/review panel, not direct OCR", () => {
    expect(homeViewSource).not.toContain("handleImageUpload");
    expect(homeViewSource).not.toContain('capture={selectedInput === "image"');
    expect(homeViewSource).toContain("photoCaptureAcceptAttribute");
    expect(homeViewSource).toContain("setPendingPhotoFile(file)");
    expect(homeViewSource).toContain("setShowPhotoCapturePanel(true)");
  });

  it("combines typed text with attached document text through the normal check flow", () => {
    expect(homeViewSource).toContain("combineTypedTextWithAttachments");
    expect(homeViewSource).toContain("attachmentCombinedText");
    // The combined text is handed to the same onCheck(...) call every other
    // input path uses - never a second/parallel analysis function.
    expect(homeViewSource).toContain("buildCheckSourceTitle(rawText, attachedFiles)");
    expect(homeViewSource).toContain("onCheck(checkSourceTitle, \"email\", textToCheck)");
  });

  it("queues attached images into the shared scan confirmation workflow, never direct OCR", () => {
    expect(homeViewSource).toContain("pendingAttachmentImageIds");
    expect(homeViewSource).toContain("activeAttachmentImageId");
    expect(homeViewSource).toContain('setPhotoCaptureIntent("attachment")');
    expect(homeViewSource).toContain("setPendingPhotoFile(nextAttachment.file)");
    expect(homeViewSource).toContain("PhotoCapturePanel");
    expect(homeViewSource).toContain("initialPhotoFile={pendingPhotoFile}");
    expect(homeViewSource).not.toContain("readAttachmentImageForOcr");
    expect(homeViewSource).not.toContain('import("../lib/documentScanner")');
    expect(homeViewSource).not.toContain("readTextFromImage(scanResult.scannedFile)");
    expect(homeViewSource).not.toContain("readTextFromImage(entry.file)");
    expect(homeViewSource).not.toContain("readTextFromImage(file)");
    expect(homeViewSource).not.toContain("scanResult.canUseFullPhoto");
    expect(homeViewSource).not.toContain("PHOTO_FULL_PHOTO_WARNING");
  });

  it("runs attachment OCR only after the shared panel returns a prepared scan", () => {
    const confirmedBlock = sliceBetween(
      homeViewSource,
      "const handleConfirmedAttachmentPhotos = async",
      "// \"Check this text\"",
    );

    expect(confirmedBlock).toContain("const reviewedPhoto = photos[0]");
    expect(confirmedBlock).toContain("!reviewedPhoto?.isDocumentScan");
    expect(confirmedBlock).toContain("await readPhotoForOcr(reviewedPhoto, 0, 1)");
    expect(confirmedBlock).not.toContain("scanDocumentFile");
    expect(confirmedBlock).not.toContain("readTextFromImage(file)");
    expect(confirmedBlock).not.toContain("readTextFromImage(entry.file)");
  });

  it("does not OCR or mark a failed result when an attached-image scan is rejected with No", () => {
    const rejectBlock = sliceBetween(
      homeViewSource,
      "const handleRejectAttachmentImageReview = () =>",
      "const handleCancelAttachmentImageReviewQueue = () =>",
    );

    expect(rejectBlock).toContain("finishAttachmentImageReview(attachmentId)");
    expect(rejectBlock).not.toContain("readPhotoForOcr");
    expect(rejectBlock).not.toContain("readTextFromImage");
    expect(rejectBlock).not.toContain('status: "failed"');
    expect(rejectBlock).not.toContain("ATTACHMENT_READ_FAILED_MESSAGE");
  });

  it("does not OCR rejected or uncertain document detection for attached images", () => {
    expect(homeViewSource).not.toContain("scanDocumentFile(file)");
    expect(homeViewSource).not.toContain("scanResult.status");
    expect(homeViewSource).not.toContain("scanResult.scannedFile");
    expect(homeViewSource).not.toContain("scanResult.message");
    expect(homeViewSource).not.toContain("scanResult.warnings");
  });

  it("reviews multiple attached images sequentially, one active panel at a time", () => {
    const queueEffect = sliceBetween(
      homeViewSource,
      "useEffect(() => {\n    if (\n      showPhotoCapturePanel",
      "const clearInput = () =>",
    );
    const selectionBlock = sliceBetween(
      homeViewSource,
      "const handleAttachmentFilesSelected = async",
      "const handleRemoveAttachedFile =",
    );

    expect(selectionBlock).toContain("const queuedImageIds = newEntries");
    expect(selectionBlock).toContain("setPendingAttachmentImageIds((current) => [...current, ...queuedImageIds])");
    expect(selectionBlock).toContain('entry.kind === "image"');
    expect(queueEffect).toContain("showPhotoCapturePanel");
    expect(queueEffect).toContain("activeAttachmentImageId");
    expect(queueEffect).toContain("pendingAttachmentImageIds[0]");
    expect(queueEffect).toContain("setActiveAttachmentImageId(nextAttachment.id)");
  });

  it("rejecting one queued image advances without clearing the remaining image queue", () => {
    const finishBlock = sliceBetween(
      homeViewSource,
      "const finishAttachmentImageReview = (attachmentId: string) =>",
      "const handleRejectAttachmentImageReview = () =>",
    );
    const rejectBlock = sliceBetween(
      homeViewSource,
      "const handleRejectAttachmentImageReview = () =>",
      "const handleCancelAttachmentImageReviewQueue = () =>",
    );

    expect(finishBlock).toContain("current.filter((queuedAttachmentId) => queuedAttachmentId !== attachmentId)");
    expect(rejectBlock).toContain("finishAttachmentImageReview(attachmentId)");
    expect(rejectBlock).not.toContain("setPendingAttachmentImageIds([])");
  });

  it("keeps full cancel separate from rejecting one queued image", () => {
    const cancelBlock = sliceBetween(
      homeViewSource,
      "const handleCancelAttachmentImageReviewQueue = () =>",
      "const handleCapturedPhotos = async",
    );

    expect(cancelBlock).toContain("setPendingAttachmentImageIds([])");
    expect(homeViewSource).toContain("onCancel=");
    expect(homeViewSource).toContain("onTryAgain=");
  });

  it("keeps the shared attachment confirmation free of manual crop or full-photo fallback", () => {
    expect(homeViewSource).not.toContain("Use full photo");
    expect(homeViewSource).not.toContain("Adjust manually");
    expect(homeViewSource).not.toContain("Read this area");
    expect(homeViewSource).not.toContain("manual_adjust");
    expect(homeViewSource).not.toContain("canUseFullPhoto");
  });

  it("carries the existing OCR low-confidence warnings through to each attached file", () => {
    // readTextFromImage already computes these warnings (see getOcrQualityWarnings
    // in photoOcr.ts) - the attachment flow reuses result.warnings rather than
    // inventing a second warning path.
    expect(homeViewSource).toContain("warnings: result.warnings");
  });

  it("keeps a single failed attachment from stopping the others or crashing the flow", () => {
    expect(homeViewSource).toContain("status: \"failed\"");
    expect(homeViewSource).toContain("catch");
  });

  // Document File Support v1
  it("reads DOCX/PDF attachments through the local extractors, never a second parallel reader", () => {
    expect(homeViewSource).toContain("extractDocxText");
    expect(homeViewSource).toContain("extractPdfText");
    expect(homeViewSource).toContain('from "../lib/documentFileText"');
  });

  it("routes a DOCX/PDF chosen from the compact upload menu into the same attachment pipeline", () => {
    expect(homeViewSource).toContain("docx_extract");
    expect(homeViewSource).toContain("pdf_extract");
    expect(homeViewSource).toContain("handleAttachmentFilesSelected([file])");
  });

  it("routes dropped files through the same local attachment pipeline, including DOCX", () => {
    expect(homeViewSource).toContain("getFilesFromDroppedDataTransfer(event.dataTransfer)");
    expect(homeViewSource).toContain("handleAttachmentFilesSelected(droppedFiles)");
    expect(homeViewSource).toContain("extractDocxText(entry.file)");
  });

  it("makes the visible paste input area a DOCX-capable drop target", () => {
    expect(homeViewSource).toContain("VISIBLE_INPUT_DROP_LABEL");
    expect(homeViewSource).toContain("VISIBLE_INPUT_DROP_HELPER");
    expect(homeViewSource).toContain("handleAttachmentDrop(event)");
    expect(homeViewSource).toContain("handleAttachmentDragOver()");
    expect(homeViewSource).toContain("handleAttachmentDragLeave()");
    expect(homeViewSource).toContain("paste-message");
  });

  it("keeps typing/paste behaviour unchanged while adding the visible drop target", () => {
    expect(homeViewSource).toContain("value={rawText}");
    expect(homeViewSource).toContain("onChange={(event) => setRawText(event.target.value)}");
    expect(homeViewSource).toContain('"Pasted admin text"');
    expect(homeViewSource).toContain("onCheck(checkSourceTitle, \"email\", textToCheck)");
  });

  it("reveals the attachment area from file mode so dropped DOCX files show status", () => {
    expect(homeViewSource).toContain('"Choose or drop a file"');
    expect(homeViewSource).toContain("into the attachment area below");
    expect(homeViewSource).toContain('selectedInput === "file" ? (');
    expect(homeViewSource).toContain("showCombinedTextNote={showAttachmentCombinedTextNote}");
  });
});

describe("Document Attachment Intake v1 - DocumentAttachmentArea structure", () => {
  it("renders the required headings/buttons via the shared copy constants", () => {
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_HEADING");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_CHOOSE_BUTTON_LABEL");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_DRAG_DROP_LABEL");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_LOCAL_ONLY_NOTE");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_OCR_CAUTION_NOTE");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_COMBINED_TEXT_NOTE");
  });

  it("offers a native file picker that accepts image types, supported text types, DOCX, and PDF", () => {
    expect(documentAttachmentAreaSource).toContain('type="file"');
    expect(documentAttachmentAreaSource).toContain("attachmentPickerAcceptAttribute");
    expect(documentAttachmentAreaSource).toContain("multiple");
    // The file picker accept string itself must include .docx and .pdf so
    // the OS/browser file dialog actually offers them.
    expect(attachmentPickerAcceptAttribute).toContain(".docx");
    expect(attachmentPickerAcceptAttribute).toContain(".pdf");
  });

  it("does not expose a second native camera capture input beside the main photo panel", () => {
    expect(documentAttachmentAreaSource).not.toContain('capture="environment"');
    expect(documentAttachmentAreaSource).not.toContain("attachmentCameraAcceptAttribute");
    expect(homeViewSource).toContain("PhotoCapturePanel");
  });

  it("prevents the browser's default drag/drop navigation on dragover and drop", () => {
    expect(documentAttachmentAreaSource).toContain("onDragOver");
    expect(documentAttachmentAreaSource).toContain("onDrop");
    const preventDefaultCount = (documentAttachmentAreaSource.match(/event\.preventDefault\(\)/g) ?? []).length;
    expect(preventDefaultCount).toBeGreaterThanOrEqual(2);
  });

  it("shows a visible drag-over state and keyboard/file-input fallback", () => {
    expect(documentAttachmentAreaSource).toContain("isDraggingOver");
    // The file input labels give a keyboard-operable path independent of drag/drop.
    expect(documentAttachmentAreaSource).toContain("<label");
  });

  it("lets a file be removed from the list, and shows per-file status/warnings", () => {
    expect(documentAttachmentAreaSource).toContain("onRemoveFile");
    expect(documentAttachmentAreaSource).toContain("ATTACHMENT_STATUS_LABELS");
    expect(documentAttachmentAreaSource).toContain("attached.warnings.map");
  });

  it("gives every input and button an accessible label", () => {
    expect(documentAttachmentAreaSource).toContain("aria-label={ATTACHMENT_CHOOSE_BUTTON_LABEL}");
    expect(documentAttachmentAreaSource).toMatch(/aria-label=\{`\$\{ATTACHMENT_REMOVE_BUTTON_LABEL\}/);
  });
});

describe("Document Attachment Intake v1 - supported/unsupported file messaging", () => {
  it("the broad picker accept string covers phone-camera image formats, supported text types, DOCX, and PDF", () => {
    expect(attachmentPickerAcceptAttribute).toContain("image/*");
    expect(attachmentPickerAcceptAttribute).toContain(".heic");
    expect(attachmentPickerAcceptAttribute).toContain(".heif");
    expect(attachmentPickerAcceptAttribute).toContain(".txt");
    expect(attachmentPickerAcceptAttribute).toContain(".csv");
    expect(attachmentPickerAcceptAttribute).toContain(".json");
    expect(attachmentPickerAcceptAttribute).toContain(".docx");
    expect(attachmentPickerAcceptAttribute).toContain(".pdf");
  });

  it("tells the user unrecognised files cannot be read yet, without saying only 'nothing uploaded'", () => {
    expect(UNSUPPORTED_FILE_MESSAGE).toContain("selected in this browser");
    expect(UNSUPPORTED_FILE_MESSAGE).toContain("has not been uploaded or sent anywhere");
    expect(UNSUPPORTED_FILE_MESSAGE).toContain("copy and paste the text");
    expect(UNSUPPORTED_FILE_MESSAGE).toContain("photo of the document");
    expect(UNSUPPORTED_FILE_MESSAGE.trim().toLowerCase()).not.toBe("nothing uploaded");
  });

  it("gives older .doc files their own clear, honest message pointing at .docx", () => {
    expect(DOC_UNSUPPORTED_MESSAGE).toContain("Older .doc files are not supported yet");
    expect(DOC_UNSUPPORTED_MESSAGE).toContain(".docx");
    expect(DOC_UNSUPPORTED_MESSAGE).toContain("copy and paste the text");
    expect(DOC_UNSUPPORTED_MESSAGE).toContain("photo of the document");
  });

  it("gives a clear, local-only message when reading a selected DOCX/PDF fails", () => {
    expect(ATTACHMENT_READ_FAILED_MESSAGE).toContain("selected in this browser");
    expect(ATTACHMENT_READ_FAILED_MESSAGE).toContain("has not uploaded or sent it anywhere");
    expect(ATTACHMENT_READ_FAILED_MESSAGE.trim().toLowerCase()).not.toBe("nothing uploaded");
  });
});

describe("Document Attachment Intake v1 - required visible copy", () => {
  it("matches the required attachment-area copy exactly", () => {
    expect(ATTACHMENT_HEADING).toBe("Attach document photos");
    expect(ATTACHMENT_CHOOSE_BUTTON_LABEL).toBe("Choose photos or files");
    expect(ATTACHMENT_DRAG_DROP_LABEL).toBe("Drag document photos, text files, Word documents, or PDFs here");
    expect(ATTACHMENT_LOCAL_ONLY_NOTE).toBe(
      "Files are read in this browser. AdminAvenger does not upload them or send them anywhere.",
    );
    expect(ATTACHMENT_OCR_CAUTION_NOTE).toBe(
      "OCR and file text extraction can misread or miss details. Always check dates, money, names, and reference numbers against the original document.",
    );
    expect(ATTACHMENT_COMBINED_TEXT_NOTE).toBe(
      "Your typed text and attached document text will be checked together.",
    );
    expect(VISIBLE_INPUT_DROP_LABEL).toBe("Paste text or drop a document here");
    expect(VISIBLE_INPUT_DROP_HELPER).toBe("DOCX, PDF, TXT, images - read locally in your browser.");
  });

  it("mentions DOCX/PDF support directly in the attachment area's own copy", () => {
    expect(ATTACHMENT_HELPER.toLowerCase()).toContain("docx");
    expect(ATTACHMENT_HELPER.toLowerCase()).toContain("pdf");
  });

  it("contains no forbidden safety wording anywhere in the attachment UI copy or source", () => {
    const visibleCopy = [
      ATTACHMENT_HEADING,
      ATTACHMENT_HELPER,
      ATTACHMENT_CHOOSE_BUTTON_LABEL,
      ATTACHMENT_DRAG_DROP_LABEL,
      ATTACHMENT_LOCAL_ONLY_NOTE,
      ATTACHMENT_OCR_CAUTION_NOTE,
      ATTACHMENT_COMBINED_TEXT_NOTE,
      ATTACHMENT_READ_FAILED_MESSAGE,
      VISIBLE_INPUT_DROP_LABEL,
      VISIBLE_INPUT_DROP_HELPER,
      UNSUPPORTED_FILE_MESSAGE,
      DOC_UNSUPPORTED_MESSAGE,
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleCopy)).toEqual([]);
    expect(visibleCopy.toLowerCase()).not.toContain("secure wipe");
    expect(visibleCopy.toLowerCase()).not.toContain("bank-level security");
    expect(visibleCopy.toLowerCase()).not.toContain("guaranteed");
    expect(visibleCopy.toLowerCase()).not.toContain("gdpr compliant");
    expect(visibleCopy.toLowerCase()).not.toContain("cloud processed");
    expect(visibleCopy.toLowerCase()).not.toContain("secure upload");
    expect(visibleCopy.toLowerCase()).not.toContain("every pdf");
  });
});
