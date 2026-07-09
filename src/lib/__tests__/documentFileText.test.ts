import { beforeEach, describe, expect, it, vi } from "vitest";

const extractRawTextMock = vi.fn();
const getDocumentMock = vi.fn();

vi.mock("mammoth", () => ({
  extractRawText: (...args: unknown[]) => extractRawTextMock(...args),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
}));

import {
  DOCX_NO_TEXT_MESSAGE,
  DOCX_READ_FAILED_MESSAGE,
  extractDocxText,
  extractPdfText,
  PDF_NO_SELECTABLE_TEXT_MESSAGE,
  PDF_READ_FAILED_MESSAGE,
} from "../documentFileText";

const makeFile = (name: string, contents = "pretend bytes", type = "") =>
  new File([contents], name, { type });

beforeEach(() => {
  extractRawTextMock.mockReset();
  getDocumentMock.mockReset();
});

// ---- DOCX ----

describe("extractDocxText", () => {
  it("DOCX extraction success path can be mocked and returns the extracted text", async () => {
    extractRawTextMock.mockResolvedValue({ value: "  Hello from the document.  ", messages: [] });

    const result = await extractDocxText(makeFile("letter.docx"));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.text).toBe("Hello from the document.");
      expect(result.warnings).toEqual([]);
    }
  });

  it("carries mammoth conversion messages through as plain-text warnings", async () => {
    extractRawTextMock.mockResolvedValue({
      value: "Some text",
      messages: [{ type: "warning", message: "Unrecognised paragraph style" }],
    });

    const result = await extractDocxText(makeFile("letter.docx"));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.warnings).toEqual(["Unrecognised paragraph style"]);
    }
  });

  it("returns a safe no-text result (not a crash) for a document with no usable text", async () => {
    extractRawTextMock.mockResolvedValue({ value: "   ", messages: [] });

    const result = await extractDocxText(makeFile("empty.docx"));

    expect(result).toEqual({ status: "no_text", message: DOCX_NO_TEXT_MESSAGE });
  });

  it("DOCX extraction failure returns a safe failure result, never throws", async () => {
    extractRawTextMock.mockRejectedValue(new Error("corrupt zip"));

    const result = await extractDocxText(makeFile("broken.docx"));

    expect(result).toEqual({ status: "failed", message: DOCX_READ_FAILED_MESSAGE });
  });

  it("the failure message makes clear the file was never uploaded or sent anywhere", () => {
    expect(DOCX_READ_FAILED_MESSAGE).toContain("has not been uploaded or sent anywhere");
  });

  it("reads the file's own bytes only - no upload/network assumptions", async () => {
    extractRawTextMock.mockResolvedValue({ value: "Text", messages: [] });

    await extractDocxText(makeFile("letter.docx"));

    expect(extractRawTextMock).toHaveBeenCalledTimes(1);
    const [input] = extractRawTextMock.mock.calls[0] as [Record<string, unknown>];
    expect(input).toHaveProperty("arrayBuffer");
    expect(input).not.toHaveProperty("url");
    expect(input).not.toHaveProperty("path");
  });
});

// ---- PDF ----

type FakePdfPage = { str: string };

const makeFakePdfDocument = (pageTexts: string[]) => ({
  numPages: pageTexts.length,
  getPage: vi.fn((pageNumber: number) =>
    Promise.resolve({
      getTextContent: () =>
        Promise.resolve({
          items: pageTexts[pageNumber - 1]
            .split(" ")
            .filter((word) => word.length > 0)
            .map((str): FakePdfPage => ({ str })),
        }),
    }),
  ),
});

describe("extractPdfText", () => {
  it("PDF extraction success path can be mocked and joins text across pages in order", async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve(makeFakePdfDocument(["Page one text", "Page two text"])),
    });

    const result = await extractPdfText(makeFile("letter.pdf"));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.text).toContain("Page one text");
      expect(result.text).toContain("Page two text");
      expect(result.text.indexOf("Page one")).toBeLessThan(result.text.indexOf("Page two"));
    }
  });

  it("PDF no selectable text returns the safe scanned/no-text message", async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve(makeFakePdfDocument(["", ""])),
    });

    const result = await extractPdfText(makeFile("scanned.pdf"));

    expect(result).toEqual({ status: "no_text", message: PDF_NO_SELECTABLE_TEXT_MESSAGE });
  });

  it("never pretends a scanned PDF was read", () => {
    expect(PDF_NO_SELECTABLE_TEXT_MESSAGE).toContain("could not find selectable text");
    expect(PDF_NO_SELECTABLE_TEXT_MESSAGE.toLowerCase()).not.toContain("we read every pdf");
  });

  it("PDF extraction failure (corrupt or encrypted PDF) returns a safe failure result, never throws", async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.reject(new Error("PasswordException")) });

    const result = await extractPdfText(makeFile("encrypted.pdf"));

    expect(result).toEqual({ status: "failed", message: PDF_READ_FAILED_MESSAGE });
  });

  it("also fails safely when getPage/getTextContent itself throws mid-document", async () => {
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn(() => Promise.reject(new Error("bad page"))),
      }),
    });

    const result = await extractPdfText(makeFile("broken.pdf"));

    expect(result).toEqual({ status: "failed", message: PDF_READ_FAILED_MESSAGE });
  });

  it("reads the file's own bytes only - no upload/network assumptions", async () => {
    getDocumentMock.mockReturnValue({ promise: Promise.resolve(makeFakePdfDocument(["Some text"])) });

    await extractPdfText(makeFile("letter.pdf"));

    expect(getDocumentMock).toHaveBeenCalledTimes(1);
    const [options] = getDocumentMock.mock.calls[0] as [Record<string, unknown>];
    expect(options).toHaveProperty("data");
    expect(options).not.toHaveProperty("url");
  });
});
