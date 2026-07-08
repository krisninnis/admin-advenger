import { describe, expect, it } from "vitest";
import {
  attachmentCameraAcceptAttribute,
  attachmentPickerAcceptAttribute,
  classifyUploadedFile,
  getAttachmentUnsupportedMessage,
  isPdfOrWordFile,
  isSupportedTextFile,
  PDF_OR_WORD_UNSUPPORTED_MESSAGE,
  photoAcceptAttribute,
  photoCaptureAcceptAttribute,
  quickUploadAcceptAttribute,
  textFileAcceptAttribute,
  UNSUPPORTED_FILE_MESSAGE,
} from "../fileIntakeAccept";

const makeFile = (name: string, type = "") => new File(["pretend bytes"], name, { type });

describe("file intake accept attributes", () => {
  it("the photo control still accepts images", () => {
    expect(photoAcceptAttribute).toBe("image/*");
  });

  it("the file control still accepts the supported text/document types", () => {
    expect(textFileAcceptAttribute).toContain(".txt");
    expect(textFileAcceptAttribute).toContain(".md");
    expect(textFileAcceptAttribute).toContain(".csv");
    expect(textFileAcceptAttribute).toContain(".json");
  });

  it("the compact 'Add photo or file' upload option accepts both photos and documents", () => {
    expect(quickUploadAcceptAttribute).toContain(photoAcceptAttribute);
    expect(quickUploadAcceptAttribute).toContain(textFileAcceptAttribute);
  });

  it("the camera panel's 'Upload existing photo' option accepts png/jpeg/webp/heic/heif", () => {
    expect(photoCaptureAcceptAttribute).toContain("image/png");
    expect(photoCaptureAcceptAttribute).toContain("image/jpeg");
    expect(photoCaptureAcceptAttribute).toContain("image/webp");
    expect(photoCaptureAcceptAttribute).toContain("image/heic");
    expect(photoCaptureAcceptAttribute).toContain("image/heif");
  });

  it("the 'Upload a file' area offers both images and text/documents", () => {
    // The mode-card file input now uses quickUploadAcceptAttribute so an
    // image can actually be picked from the "Upload a file" area, not just
    // text files.
    expect(quickUploadAcceptAttribute).toContain("image/*");
    expect(quickUploadAcceptAttribute).toContain(".txt");
  });
});

describe("isSupportedTextFile", () => {
  it("accepts the text/document types the browser can read as text", () => {
    expect(isSupportedTextFile(makeFile("notes.txt"))).toBe(true);
    expect(isSupportedTextFile(makeFile("readme.md"))).toBe(true);
    expect(isSupportedTextFile(makeFile("export.csv"))).toBe(true);
    expect(isSupportedTextFile(makeFile("data.json"))).toBe(true);
  });

  it("does not treat images or PDFs/DOCX as text files", () => {
    expect(isSupportedTextFile(makeFile("letter.jpg", "image/jpeg"))).toBe(false);
    expect(isSupportedTextFile(makeFile("scan.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedTextFile(makeFile("contract.docx"))).toBe(false);
  });
});

// Routing decision used by the "Upload a file" area and the compact "+"
// upload menu (see handleUploadedFileSelection in src/views/HomeView.tsx).
describe("classifyUploadedFile", () => {
  it("routes a JPG uploaded through file upload to the photo OCR flow", () => {
    expect(classifyUploadedFile(makeFile("parking-notice.jpg", "image/jpeg"))).toBe("photo_ocr");
    expect(classifyUploadedFile(makeFile("parking-notice.jpeg", "image/jpeg"))).toBe("photo_ocr");
  });

  it("routes a PNG uploaded through file upload to the photo OCR flow", () => {
    expect(classifyUploadedFile(makeFile("bill.png", "image/png"))).toBe("photo_ocr");
  });

  it("routes other phone image formats (webp/heic/heif) to the photo OCR flow", () => {
    expect(classifyUploadedFile(makeFile("receipt.webp", "image/webp"))).toBe("photo_ocr");
    // HEIC/HEIF often arrive with an empty MIME type, so extension still wins.
    expect(classifyUploadedFile(makeFile("photo.heic", ""))).toBe("photo_ocr");
    expect(classifyUploadedFile(makeFile("photo.heif", ""))).toBe("photo_ocr");
  });

  it("never routes an image to the unsupported-file message", () => {
    // This is the core of the fix: an image must not fall through to the
    // "not supported yet" copy shown for files the app cannot read.
    for (const image of [
      makeFile("a.jpg", "image/jpeg"),
      makeFile("b.png", "image/png"),
      makeFile("c.webp", "image/webp"),
      makeFile("d.heic", ""),
    ]) {
      expect(classifyUploadedFile(image)).not.toBe("unsupported");
    }
  });

  it("keeps TXT/MD/CSV/JSON on the existing text-file flow", () => {
    expect(classifyUploadedFile(makeFile("notes.txt"))).toBe("text_file");
    expect(classifyUploadedFile(makeFile("readme.md"))).toBe("text_file");
    expect(classifyUploadedFile(makeFile("export.csv"))).toBe("text_file");
    expect(classifyUploadedFile(makeFile("data.json"))).toBe("text_file");
  });

  it("marks PDF/DOCX as unsupported for now", () => {
    expect(classifyUploadedFile(makeFile("statement.pdf", "application/pdf"))).toBe("unsupported");
    expect(classifyUploadedFile(makeFile("contract.docx"))).toBe("unsupported");
  });
});

describe("UNSUPPORTED_FILE_MESSAGE", () => {
  it("points the user at images and pasting, without implying image reading is off", () => {
    expect(UNSUPPORTED_FILE_MESSAGE).toBe(
      "This file type is not supported yet. For images, upload JPG/PNG. For documents, copy and paste the text for now.",
    );
    // Must not resurrect the old "not active in this mode" / "coming later"
    // wording, and must not imply image OCR is inactive.
    expect(UNSUPPORTED_FILE_MESSAGE).not.toMatch(/not active/i);
    expect(UNSUPPORTED_FILE_MESSAGE).not.toMatch(/coming later/i);
  });
});

// Document Attachment Intake v1 - the attachment area's "Choose photos or
// files" control uses a broader accept string than quickUploadAcceptAttribute
// so mobile file pickers reliably offer Photos/Gallery/Files.
describe("attachment picker accept attributes", () => {
  it("the attachment picker accepts common phone-camera image formats and supported text types", () => {
    expect(attachmentPickerAcceptAttribute).toContain("image/*");
    expect(attachmentPickerAcceptAttribute).toContain(".jpg");
    expect(attachmentPickerAcceptAttribute).toContain(".jpeg");
    expect(attachmentPickerAcceptAttribute).toContain(".png");
    expect(attachmentPickerAcceptAttribute).toContain(".webp");
    expect(attachmentPickerAcceptAttribute).toContain(".heic");
    expect(attachmentPickerAcceptAttribute).toContain(".heif");
    expect(attachmentPickerAcceptAttribute).toContain(".txt");
    expect(attachmentPickerAcceptAttribute).toContain(".md");
    expect(attachmentPickerAcceptAttribute).toContain(".csv");
    expect(attachmentPickerAcceptAttribute).toContain(".json");
  });

  it("the attachment camera control accepts images", () => {
    expect(attachmentCameraAcceptAttribute).toBe("image/*");
  });
});

describe("PDF/Word attachment handling", () => {
  const makeFile = (name: string, type = "") => new File(["pretend bytes"], name, { type });

  it("recognises PDF and Word documents by extension or MIME type", () => {
    expect(isPdfOrWordFile(makeFile("statement.pdf", "application/pdf"))).toBe(true);
    expect(isPdfOrWordFile(makeFile("contract.doc"))).toBe(true);
    expect(isPdfOrWordFile(makeFile("contract.docx"))).toBe(true);
    expect(
      isPdfOrWordFile(
        makeFile(
          "contract2",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ),
    ).toBe(true);
    expect(isPdfOrWordFile(makeFile("letter.jpg", "image/jpeg"))).toBe(false);
    expect(isPdfOrWordFile(makeFile("notes.txt"))).toBe(false);
  });

  it("gives PDF/Word files a specific, honest not-supported-yet message", () => {
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE).toBe(
      "PDF and Word documents are not supported yet. You can copy and paste the text, or upload/take a photo of the document.",
    );
    expect(getAttachmentUnsupportedMessage(makeFile("statement.pdf", "application/pdf"))).toBe(
      PDF_OR_WORD_UNSUPPORTED_MESSAGE,
    );
    expect(getAttachmentUnsupportedMessage(makeFile("contract.docx"))).toBe(
      PDF_OR_WORD_UNSUPPORTED_MESSAGE,
    );
  });

  it("falls back to the general unsupported-file message for anything else", () => {
    expect(getAttachmentUnsupportedMessage(makeFile("archive.zip", "application/zip"))).toBe(
      UNSUPPORTED_FILE_MESSAGE,
    );
  });

  it("never fakes PDF/DOCX support", () => {
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE.toLowerCase()).not.toContain("we can now read");
    expect(PDF_OR_WORD_UNSUPPORTED_MESSAGE.toLowerCase()).toContain("not supported yet");
  });
});
