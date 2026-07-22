import { describe, expect, it, vi } from "vitest";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import { submitAcceptedText, type SubmissionCheckFn } from "../submissionHandoff";

const FULL_TAX_CODE_NOTICE = `HMRC
HM Revenue & Customs

Tax Code Notice

Page 1 of 2

Tax year: 6 April 2026 to 5 April 2027

This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.

Employer: Harbour View Opticians Ltd

Previous tax code: C1263L
New code: C1254L

How we worked out your tax code:

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2

Your tax code for the tax year 2026 to 2027 is C1254L.
This means you can earn £12,542 before you start paying tax.

If you think this tax code is wrong, contact HMRC.`;

const makeMockOnCheck = () => vi.fn<SubmissionCheckFn>().mockResolvedValue(true);

describe("submitAcceptedText", () => {
  it("calls onCheck with the correct arguments", async () => {
    const onCheck = makeMockOnCheck();
    const result = await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "Hello world",
      userQuestion: "What is this?",
      onCheck,
    });

    expect(result).toBe(true);
    expect(onCheck).toHaveBeenCalledWith("Pasted admin text", "email", "Hello world", "What is this?");
  });

  it("does not call onCheck when acceptedText is empty", async () => {
    const onCheck = makeMockOnCheck();
    const result = await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "   ",
      userQuestion: "What is this?",
      onCheck,
    });

    expect(result).toBe(false);
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("trims the userQuestion but preserves acceptedText as-is", async () => {
    const onCheck = makeMockOnCheck();
    await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "Original text",
      userQuestion: "  Is this correct?  ",
      onCheck,
    });

    expect(onCheck).toHaveBeenCalledWith("Pasted admin text", "email", "Original text", "Is this correct?");
  });

  it("passes undefined for userQuestion when it is empty after trim", async () => {
    const onCheck = makeMockOnCheck();
    await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "Original text",
      userQuestion: "   ",
      onCheck,
    });

    expect(onCheck).toHaveBeenCalledWith("Pasted admin text", "email", "Original text", undefined);
  });

  it("preserves the original acceptedText without trimming it", async () => {
    const onCheck = makeMockOnCheck();
    const textWithWhitespace = "  Hello world  ";
    await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: textWithWhitespace,
      onCheck,
    });

    expect(onCheck).toHaveBeenCalledWith("Pasted admin text", "email", textWithWhitespace, undefined);
  });
});

describe("submitAcceptedText - HMRC handoff equivalence", () => {
  const HMRC_PASTE_TEXT = FULL_TAX_CODE_NOTICE;
  const HMRC_OCR_TEXT = `HMRC
Tax Code Notice

Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;
  const HMRC_FILE_TEXT = `HMRC
HM Revenue & Customs
Tax Code Notice

Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;

  it("paste, OCR, and file text all call the same callback contract", async () => {
    const onCheck = makeMockOnCheck();

    await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: HMRC_PASTE_TEXT,
      onCheck,
    });

    await submitAcceptedText({
      sourceTitle: "Photo text (reviewed before checking)",
      sourceType: "email",
      acceptedText: HMRC_OCR_TEXT,
      onCheck,
    });

    await submitAcceptedText({
      sourceTitle: "Uploaded document text",
      sourceType: "pdf",
      acceptedText: HMRC_FILE_TEXT,
      onCheck,
    });

    expect(onCheck).toHaveBeenCalledTimes(3);
    expect(onCheck.mock.calls[0]![0]).toBe("Pasted admin text");
    expect(onCheck.mock.calls[1]![0]).toBe("Photo text (reviewed before checking)");
    expect(onCheck.mock.calls[2]![0]).toBe("Uploaded document text");
  });

  it("equivalent HMRC text produces the same HMRC document type via analyseDecisionProblem", () => {
    const pasteResult = analyseDecisionProblem(HMRC_PASTE_TEXT);
    const ocrResult = analyseDecisionProblem(HMRC_OCR_TEXT);
    const fileResult = analyseDecisionProblem(HMRC_FILE_TEXT);

    expect(pasteResult.documentType).toBe("hmrc_tax_code_notice");
    expect(ocrResult.documentType).toBe("hmrc_tax_code_notice");
    expect(fileResult.documentType).toBe("hmrc_tax_code_notice");
  });

  it("equivalent HMRC text with question produces the same direct answer", () => {
    const question = "What is this?";
    const pasteResult = analyseDecisionProblem(HMRC_PASTE_TEXT, question);
    const ocrResult = analyseDecisionProblem(HMRC_OCR_TEXT, question);
    const fileResult = analyseDecisionProblem(HMRC_FILE_TEXT, question);

    expect(pasteResult.directAnswer).toBeDefined();
    expect(ocrResult.directAnswer).toBeDefined();
    expect(fileResult.directAnswer).toBeDefined();
    expect(pasteResult.directAnswer).toContain("HMRC tax code notice");
    expect(ocrResult.directAnswer).toContain("HMRC tax code notice");
    expect(fileResult.directAnswer).toContain("HMRC tax code notice");
  });

  it("the question survives each handoff to the analysis engine", async () => {
    const onCheck = makeMockOnCheck();
    const question = "Is this correct?";

    await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: HMRC_PASTE_TEXT,
      userQuestion: question,
      onCheck,
    });

    await submitAcceptedText({
      sourceTitle: "Photo text (reviewed before checking)",
      sourceType: "email",
      acceptedText: HMRC_OCR_TEXT,
      userQuestion: question,
      onCheck,
    });

    await submitAcceptedText({
      sourceTitle: "Uploaded document text",
      sourceType: "pdf",
      acceptedText: HMRC_FILE_TEXT,
      userQuestion: question,
      onCheck,
    });

    for (const call of onCheck.mock.calls) {
      expect(call[3]).toBe(question);
    }
  });

  it("empty text does not call analysis", async () => {
    const onCheck = makeMockOnCheck();

    const result = await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "",
      onCheck,
    });

    expect(result).toBe(false);
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("whitespace-only text does not call analysis", async () => {
    const onCheck = makeMockOnCheck();

    const result = await submitAcceptedText({
      sourceTitle: "Pasted admin text",
      sourceType: "email",
      acceptedText: "   \n\t  ",
      onCheck,
    });

    expect(result).toBe(false);
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("failed file extraction does not submit empty text", async () => {
    const onCheck = makeMockOnCheck();
    const failedText = "";

    const result = await submitAcceptedText({
      sourceTitle: "Uploaded document text",
      sourceType: "pdf",
      acceptedText: failedText,
      onCheck,
    });

    expect(result).toBe(false);
    expect(onCheck).not.toHaveBeenCalled();
  });

  it("low-confidence OCR text still goes through the handoff when provided", async () => {
    const onCheck = makeMockOnCheck();
    const lowConfidenceText = "HMRC tax code notice. Code 1257L.";

    const result = await submitAcceptedText({
      sourceTitle: "Photo text (reviewed before checking)",
      sourceType: "email",
      acceptedText: lowConfidenceText,
      onCheck,
    });

    expect(result).toBe(true);
    expect(onCheck).toHaveBeenCalledWith("Photo text (reviewed before checking)", "email", lowConfidenceText, undefined);
  });
});
