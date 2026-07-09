// Document File Support v1 - local, in-browser text extraction for DOCX and
// PDF files. This is a sibling to src/lib/photoOcr.ts: both read a file the
// person has already selected/dropped, entirely inside this browser tab, and
// hand back plain text for the person to review before anything is checked.
// Nothing here uploads a file, sends its bytes anywhere, or talks to any
// server/cloud API - mammoth and pdfjs-dist both run the parsing locally,
// the same way Tesseract.js already runs OCR locally.
//
// DOCX extraction uses mammoth (extractRawText) - plain text only, no
// formatting is preserved and none of it is needed for the "Check a message"
// pipeline downstream.
//
// PDF extraction uses pdfjs-dist to read selectable text per page. It
// deliberately does not attempt OCR on scanned/image-only PDFs - if no
// selectable text is found, that is reported as its own honest state
// (PDF_NO_SELECTABLE_TEXT_MESSAGE) rather than pretending the PDF was read.
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// Vite-specific asset import (see vite/client ambient types in
// tsconfig.app.json) - resolves to a URL for the worker script pdfjs-dist
// needs to run PDF parsing off the main thread. Never fetched from a
// network CDN; this is the copy already bundled inside pdfjs-dist itself.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type DocumentFileReadResult =
  | { status: "success"; text: string; warnings: string[] }
  | { status: "no_text"; message: string }
  | { status: "failed"; message: string };

// Shown when DOCX or PDF extraction throws/crashes - a genuine failure to
// read the file, not just "no text found". Always makes clear the file was
// never uploaded or sent anywhere, and always points at the two things that
// still work: paste the text, or photograph the document.
export const DOCX_READ_FAILED_MESSAGE =
  "AdminAvenger could not read text from this file. The file has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document.";

export const PDF_READ_FAILED_MESSAGE =
  "AdminAvenger could not read text from this file. The file has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document.";

// Shown when a DOCX file was read successfully but contained no usable text
// (e.g. an empty document). Distinct from a genuine failure - extraction ran
// fine, there was just nothing to extract.
export const DOCX_NO_TEXT_MESSAGE =
  "AdminAvenger could not find any text in this document. You can copy and paste the text, or upload/take a photo of the document.";

// Shown when a PDF has no selectable text - almost always a scanned/
// image-only PDF. Never implies scanned PDFs are supported; points at the
// one thing that already works for those (photographing the page).
export const PDF_NO_SELECTABLE_TEXT_MESSAGE =
  "AdminAvenger could not find selectable text in this PDF. You can upload/take a photo of the document page instead.";

// Reads a .docx file's plain text locally via mammoth. Never preserves
// formatting (headings, bold, tables, ...) - only plain text is needed
// downstream. Any conversion warnings mammoth reports (e.g. an unrecognised
// style) are carried through as soft warnings, exactly like OCR's own
// warnings - they never block the person from continuing.
export const extractDocxText = async (file: File): Promise<DocumentFileReadResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result.value ?? "").trim();
    const warnings = (result.messages ?? [])
      .map((message) => message.message)
      .filter((message): message is string => Boolean(message));

    if (!text) {
      return { status: "no_text", message: DOCX_NO_TEXT_MESSAGE };
    }

    return { status: "success", text, warnings };
  } catch {
    return { status: "failed", message: DOCX_READ_FAILED_MESSAGE };
  }
};

type PdfTextContentItem = { str?: string };

// Reads a PDF's selectable text locally via pdfjs-dist, page by page. Pages
// are joined in order with a blank line between them. Handles the three
// realistic failure/limitation cases gracefully rather than crashing:
// - No selectable text anywhere (typically a scanned/image-only PDF): a
//   distinct "no_text" result, never treated as a normal failure.
// - Encrypted/password-protected PDFs: pdfjs throws when it cannot open the
//   document without a password, which is caught below and reported as a
//   "failed" result with the same honest, local-only message as any other
//   read failure.
// - Any other parsing failure (corrupt file, unsupported PDF feature): also
//   caught and reported as "failed", never left to crash the app.
export const extractPdfText = async (file: File): Promise<DocumentFileReadResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;

    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      // Sequential by design - pages must stay in order, and PDF parsing is
      // not meaningfully faster run in parallel for the page counts this
      // app expects to see (letters, bills, notices).
      // eslint-disable-next-line no-await-in-loop
      const page = await pdfDocument.getPage(pageNumber);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      const pageText = (content.items as PdfTextContentItem[])
        .map((item) => item.str ?? "")
        .join(" ")
        .trim();

      pageTexts.push(pageText);
    }

    const text = pageTexts.filter((pageText) => pageText.length > 0).join("\n\n").trim();

    if (!text) {
      return { status: "no_text", message: PDF_NO_SELECTABLE_TEXT_MESSAGE };
    }

    return { status: "success", text, warnings: [] };
  } catch {
    return { status: "failed", message: PDF_READ_FAILED_MESSAGE };
  }
};
