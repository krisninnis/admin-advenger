import { describe, expect, it } from "vitest";
import {
  attachmentCameraAcceptAttribute,
  attachmentPickerAcceptAttribute,
  classifyFileForIntake,
  classifyUploadedFile,
  DOC_UNSUPPORTED_MESSAGE,
  getAttachmentUnsupportedMessage,
  isLegacyDocFile,
  isSupportedDocxFile,
  isSupportedPdfFile,
  isSupportedTextFile,
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

  it("does not treat images or PDFs/DOCX as plain text files", () => {
    expect(isSupportedTextFile(makeFile("letter.jpg", "image/jpeg"))).toBe(false);
    expect(isSupportedTextFile(makeFile("scan.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedTextFile(makeFile("contract.docx"))).toBe(false);
  });
});

// Document File Support v1 - DOCX (not legacy .doc) and PDF are now their
// own supported classifications, read locally (see documentFileText.ts),
// never treated the same as an unrecognised binary file.
describe("isSupportedDocxFile / isSupportedPdfFile / isLegacyDocFile", () => {
  it("accepts .docx by extension or MIME type", () => {
    expect(isSupportedDocxFile(makeFile("contract.docx"))).toBe(true);
    expect(
      isSupportedDocxFile(
        makeFile(
          "contract2",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ),
    ).toBe(true);
  });

  it("never treats a plain .doc file as a supported .docx file", () => {
    expect(isSupportedDocxFile(makeFile("contract.doc"))).toBe(false);
    expect(isSupportedDocxFile(makeFile("contract.doc", "application/msword"))).toBe(false);
  });

  it("accepts .pdf by extension or MIME type", () => {
    expect(isSupportedPdfFile(makeFile("statement.pdf"))).toBe(true);
    expect(isSupportedPdfFile(makeFile("statement", "application/pdf"))).toBe(true);
  });

  it("flags only genuine legacy .doc files, never .docx", () => {
    expect(isLegacyDocFile(makeFile("contract.doc"))).toBe(true);
    expect(isLegacyDocFile(makeFile("contract.docx"))).toBe(false);
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

  it("routes DOCX to the local DOCX extractor, not the unsupported message", () => {
    expect(classifyUploadedFile(makeFile("contract.docx"))).toBe("docx_extract");
  });

  it("routes PDF to the local PDF extractor, not the unsupported message", () => {
    expect(classifyUploadedFile(makeFile("statement.pdf", "application/pdf"))).toBe("pdf_extract");
  });

  it("marks a legacy .doc file as unsupported", () => {
    expect(classifyUploadedFile(makeFile("contract.doc"))).toBe("unsupported");
  });

  it("marks an unrecognised binary file as unsupported", () => {
    expect(classifyUploadedFile(makeFile("archive.zip", "application/zip"))).toBe("unsupported");
    expect(classifyUploadedFile(makeFile("app.exe", "application/octet-stream"))).toBe("unsupported");
  });
});

describe("classifyFileForIntake", () => {
  it("accepts docx", () => {
    expect(classifyFileForIntake(makeFile("contract.docx"))).toBe("supported_docx");
  });

  it("accepts pdf", () => {
    expect(classifyFileForIntake(makeFile("statement.pdf", "application/pdf"))).toBe("supported_pdf");
  });

  it("rejects doc", () => {
    expect(classifyFileForIntake(makeFile("contract.doc"))).toBe("unsupported");
    expect(classifyFileForIntake(makeFile("contract.doc", "application/msword"))).toBe("unsupported");
  });

  it("rejects unsupported binary files", () => {
    expect(classifyFileForIntake(makeFile("archive.zip", "application/zip"))).toBe("unsupported");
    expect(classifyFileForIntake(makeFile("app.exe", "application/octet-stream"))).toBe("unsupported");
    expect(classifyFileForIntake(makeFile("no-extension-at-all"))).toBe("unsupported");
  });

  it("preserves existing image support", () => {
    expect(classifyFileForIntake(makeFile("letter.jpg", "image/jpeg"))).toBe("image");
    expect(classifyFileForIntake(makeFile("letter.png", "image/png"))).toBe("image");
    expect(classifyFileForIntake(makeFile("letter.heic", ""))).toBe("image");
  });

  it("preserves existing text-file support", () => {
    expect(classifyFileForIntake(makeFile("notes.txt"))).toBe("supported_text");
    expect(classifyFileForIntake(makeFile("notes.md"))).toBe("supported_text");
    expect(classifyFileForIntake(makeFile("notes.csv"))).toBe("supported_text");
    expect(classifyFileForIntake(makeFile("notes.json"))).toBe("supported_text");
  });
});

describe("UNSUPPORTED_FILE_MESSAGE", () => {
  it("is clear the file was only selected in this browser, never uploaded or sent anywhere", () => {
    expect(UNSUPPORTED_FILE_MESSAGE).toBe(
      "AdminAvenger cannot read this file type yet. The file was selected in this browser but has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document.",
    );
    // Must not resurrect the old "not active" / "coming later" wording, and
    // must not imply image OCR is inactive, and must never say only
    // "nothing uploaded" in a way that reads like the file vanished.
    expect(UNSUPPORTED_FILE_MESSAGE).not.toMatch(/not active/i);
    expect(UNSUPPORTED_FILE_MESSAGE).not.toMatch(/coming later/i);
    expect(UNSUPPORTED_FILE_MESSAGE.toLowerCase()).not.toBe("nothing uploaded");
  });
});

describe("DOC_UNSUPPORTED_MESSAGE", () => {
  it("gives older .doc files their own specific, honest message", () => {
    expect(DOC_UNSUPPORTED_MESSAGE).toBe(
      "Older .doc files are not supported yet. Please use .docx, copy and paste the text, or upload/take a photo of the document.",
    );
    expect(DOC_UNSUPPORTED_MESSAGE).toContain(".docx");
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

  it("the attachment picker now also accepts .docx and .pdf (Document File Support v1)", () => {
    expect(attachmentPickerAcceptAttribute).toContain(".docx");
    expect(attachmentPickerAcceptAttribute).toContain(".pdf");
  });

  it("the attachment camera control accepts images", () => {
    expect(attachmentCameraAcceptAttribute).toBe("image/*");
  });
});

describe("getAttachmentUnsupportedMessage", () => {
  it("gives a legacy .doc file its own specific, honest message", () => {
    expect(getAttachmentUnsupportedMessage(makeFile("contract.doc"))).toBe(DOC_UNSUPPORTED_MESSAGE);
  });

  it("falls back to the general unsupported-file message for anything else unreadable", () => {
    expect(getAttachmentUnsupportedMessage(makeFile("archive.zip", "application/zip"))).toBe(
      UNSUPPORTED_FILE_MESSAGE,
    );
  });

  it("never claims fake support for DOC, and never implies DOCX/PDF are unsupported", () => {
    expect(DOC_UNSUPPORTED_MESSAGE.toLowerCase()).not.toContain("we can now read");
    expect(DOC_UNSUPPORTED_MESSAGE.toLowerCase()).toContain("not supported yet");
  });
});
