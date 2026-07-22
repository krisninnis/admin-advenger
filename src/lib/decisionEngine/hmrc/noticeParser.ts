import type {
  ParsedHmrcTaxCodeNotice,
  RecognitionEvidence,
  AllowanceDeductionLine,
  HmrcNoticePage,
  ParsedTaxCode,
} from "./types";
import { parseTaxCode, taxCodeToApproximatePence } from "./taxCodeParser";

const HMRC_SENDER_PATTERNS = [
  /\bhmrc\b/i,
  /hm revenue/i,
  /hm revenue & customs/i,
  /hm revenue and customs/i,
  /her majesty'?s revenue/i,
];

const TAX_CODE_NOTICE_PHRASES = [
  /tax code notice/i,
  /coding notice/i,
  /\btell you your tax code\b/i,
  /\bthis is to tell you\b.*\btax code\b/i,
  /how we (?:worked|work) out your tax code/i,
  /your tax code for (?:the )?tax year/i,
  /paye coding notice/i,
];

const PERSONAL_ALLOWANCE_PATTERNS = [
  /personal allowance/i,
  /tax-free (?:amount|income)/i,
];

const TAX_YEAR_PATTERNS = [
  /(\d{1,2})\s*(?:April|apr)\w*\s*(\d{4})\s*(?:to|-)\s*(\d{1,2})\s*(?:April|apr)\w*\s*(\d{4})/i,
  /tax year\s*(\d{4})\s*[-–]\s*(\d{4})/i,
  /(\d{4})\s*[-–/]\s*(\d{4})\s*tax year/i,
];

const EMPLOYER_PATTERNS = [
  /(?:employer|pension provider|payroll reference)[:\s]+(.+?)(?:\n|$)/i,
  /(?:your employer is|employer name)[:\s]+(.+?)(?:\n|$)/i,
];

const P800_PATTERNS = [
  /\bp800\b/i,
  /tax calculation/i,
  /tax calculation for/i,
  /overpayment refund/i,
  /you overpaid/i,
];

const P45_PATTERNS = [/form\s+p45\b/i, /\bp45\b/i];
const P60_PATTERNS = [/form\s+p60\b/i, /\bp60\b/i];
const PAYSPLIT_PATTERNS = [/gross pay/i, /net pay/i, /tax paid/i, /national insurance/i];
const SA_PATTERNS = [/self assessment/i, /self-assessment/i, /\bsa\d+\b/i, /tax return/i];
const UNDERPAYMENT_DEMAND_PATTERNS = [
  /paye underpayment/i,
  /underpayment of tax/i,
  /tax underpayment/i,
  /coding adjustment/i,
  /in-year adjustment/i,
];
const TAX_DEMAND_PATTERNS = [
  /tax demand/i,
  /enforcement/i,
  /amount you owe/i,
  /must pay/i,
  /payment due/i,
];

const LINE_ITEM_PATTERNS = [
  /^(.+?)\s{2,}(£[\d,]+(?:\.\d{1,2})?)\s*$/,
  /^(.+?)\s+(£[\d,]+(?:\.\d{1,2})?)\s*$/,
  /^(.+?)\s{2,}$/,
  /^(.+)$/,
];

const ALLOWANCE_KEYWORDS = [
  /personal allowance/i,
  /allowance/i,
  /expenses/i,
  /uniform/i,
  /professional fees/i,
  /travel/i,
  /flat rate/i,
];

const DEDUCTION_KEYWORDS = [
  /insurance/i,
  /benefit in kind/i,
  /company car/i,
  /medical/i,
  /loan/i,
  /underpayment/i,
];

const TOTAL_KEYWORDS = [/total/i, /tax-free amount/i, /net allowance/i];

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function findAmount(text: string): number | null {
  const match = text.match(/£([\d,]+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const cleaned = match[1]!.replace(/,/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.round(num * 100);
}

function classifyLine(label: string): "allowance" | "deduction" | "printed_total" | "unknown" {
  if (hasAny(label, TOTAL_KEYWORDS)) return "printed_total";
  if (hasAny(label, DEDUCTION_KEYWORDS)) return "deduction";
  if (hasAny(label, ALLOWANCE_KEYWORDS)) return "allowance";
  return "unknown";
}

function extractPages(text: string): HmrcNoticePage[] {
  const pages: HmrcNoticePage[] = [];
  const pageMatches = [...text.matchAll(/page\s+(\d+)/gi)];

  if (pageMatches.length === 0) {
    pages.push({ pageNumber: 1, rawText: text });
    return pages;
  }

  const sections = text.split(/(?=page\s+\d+)/i);
  for (const section of sections) {
    const match = section.match(/page\s+(\d+)/i);
    if (match) {
      pages.push({
        pageNumber: parseInt(match[1]!, 10),
        rawText: section,
      });
    }
  }

  return pages.length > 0 ? pages : [{ pageNumber: 1, rawText: text }];
}

function extractTotalPageCount(text: string): number | null {
  const match = text.match(/page\s+\d+\s+of\s+(\d+)/i);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

function extractTaxYear(text: string): { start: string | null; end: string | null } {
  for (const pattern of TAX_YEAR_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match.length === 5) {
        return {
          start: `${match[1]} April ${match[3]}`,
          end: `${match[3]} April ${match[5]}`,
        };
      }
      if (match.length === 3) {
        return { start: `6 April ${match[1]}`, end: `5 April ${match[2]}` };
      }
    }
  }
  return { start: null, end: null };
}

function extractNoticeDate(text: string): string | null {
  const patterns = [
    /(?:date|dated)[:\s]+(\d{1,2}[\s/-]\w+[\s/-]\d{2,4})/i,
    /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\w*\s+\d{4})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return null;
}

function extractEmployer(text: string): string | null {
  for (const pattern of EMPLOYER_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractLines(text: string): AllowanceDeductionLine[] {
  const lines: AllowanceDeductionLine[] = [];
  const linePatterns = LINE_ITEM_PATTERNS;

  for (const rawLine of text.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    for (const pattern of linePatterns) {
      const match = trimmed.match(pattern);
      if (match?.[1]) {
        const label = match[1].trim();
        const amountPence = match?.[2] ? findAmount(match[2]) : null;
        lines.push({
          raw: trimmed,
          label,
          amountPence,
          type: classifyLine(label),
          parseErrors: [],
        });
        break;
      }
    }
  }

  return lines;
}

function extractPrintedTaxFreeAmount(text: string): number | null {
  const patterns = [
    /(?:total\s+)?tax-free amount\s+£([\d,]+(?:\.\d{1,2})?)/i,
    /your tax-free amount\s+(?:is\s+)?£([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1]!.replace(/,/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) return Math.round(num * 100);
    }
  }
  return null;
}

function extractPreviousAndReplacement(text: string): {
  previous: ParsedTaxCode | null;
  replacement: ParsedTaxCode | null;
} {
  const patterns = [
    /(?:from|changing from|was)\s+([A-Z0-9]{1,6})\s+(?:to|now|new code)\s+([A-Z0-9]{1,6})/i,
    /(?:old|previous) code[:\s]+([A-Z0-9]{1,6})/i,
    /(?:new|replacement) code[:\s]+([A-Z0-9]{1,6})/i,
    /your tax code (?:has )?changed from\s+([A-Z0-9]{1,6})\s+to\s+([A-Z0-9]{1,6})/i,
  ];

  let previous: ParsedTaxCode | null = null;
  let replacement: ParsedTaxCode | null = null;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2]) {
        previous = parseTaxCode(match[1]!);
        replacement = parseTaxCode(match[2]!);
        return { previous, replacement };
      }
    }
  }

  const oldPattern = /(?:old|previous) code[:\s]+([A-Z0-9]{1,6})/i;
  const newPattern = /(?:new|replacement) code[:\s]+([A-Z0-9]{1,6})/i;
  const oldMatch = text.match(oldPattern);
  const newMatch = text.match(newPattern);

  if (oldMatch?.[1]) previous = parseTaxCode(oldMatch[1]);
  if (newMatch?.[1]) replacement = parseTaxCode(newMatch[1]);

  return { previous, replacement };
}

export function recogniseAndParse(text: string): ParsedHmrcTaxCodeNotice {
  const recognitionEvidence: RecognitionEvidence = {
    hasHmrcSender: hasAny(text, HMRC_SENDER_PATTERNS),
    hasTaxCodeNoticePhrase: hasAny(text, TAX_CODE_NOTICE_PHRASES),
    hasTellYouTaxCodePhrase: /tell you your tax code/i.test(text),
    hasHowWeWorkedOutPhrase: /how we (?:worked|work) out your tax code/i.test(text),
    hasTaxYearDates: TAX_YEAR_PATTERNS.some((p) => p.test(text)),
    hasPersonalAllowance: hasAny(text, PERSONAL_ALLOWANCE_PATTERNS),
    hasTaxFreeAmount: /tax-free amount/i.test(text),
    hasCodeReplacement: /changed from\s+[A-Z0-9]+\s+to\s+[A-Z0-9]+/i.test(text),
    hasEmployerOrPensionProvider: extractEmployer(text) !== null,
    evidenceCount: 0,
  };
  recognitionEvidence.evidenceCount = Object.values(recognitionEvidence).filter(
    (v) => v === true,
  ).length;

  const pages = extractPages(text);
  const hasP800 = hasAny(text, P800_PATTERNS);
  const hasP45 = hasAny(text, P45_PATTERNS);
  const hasP60 = hasAny(text, P60_PATTERNS);
  const hasPayslip = hasAny(text, PAYSPLIT_PATTERNS);
  const hasSA = hasAny(text, SA_PATTERNS);
  const hasUnderpaymentDemand = hasAny(text, UNDERPAYMENT_DEMAND_PATTERNS);
  const hasTaxDemand = hasAny(text, TAX_DEMAND_PATTERNS);

  let documentSubType: ParsedHmrcTaxCodeNotice["documentSubType"] = "unrecognised";

  if (hasP800) documentSubType = "p800_calculation";
  else if (hasP45) documentSubType = "p45";
  else if (hasP60) documentSubType = "p60";
  else if (hasPayslip) documentSubType = "payslip";
  else if (hasSA) documentSubType = "self_assessment";
  else if (hasUnderpaymentDemand) documentSubType = "paye_underpayment";
  else if (hasTaxDemand) documentSubType = "tax_demand_or_enforcement";
  else if (recognitionEvidence.hasTaxCodeNoticePhrase) documentSubType = "tax_code_notice";
  else if (recognitionEvidence.evidenceCount >= 3) documentSubType = "tax_code_notice";
  else if (recognitionEvidence.hasHmrcSender && recognitionEvidence.hasTaxFreeAmount)
    documentSubType = "tax_code_notice";
  else if (recognitionEvidence.hasHmrcSender) documentSubType = "generic_hmrc_letter";

  const recognised = documentSubType === "tax_code_notice";

  let confidence: "high" | "medium" | "low" = "low";
  if (recognitionEvidence.evidenceCount >= 4) confidence = "high";
  else if (recognitionEvidence.evidenceCount >= 2) confidence = "medium";

  const taxYear = extractTaxYear(text);
  const noticeDate = extractNoticeDate(text);
  const employer = extractEmployer(text);
  const { previous, replacement } = extractPreviousAndReplacement(text);
  const lines = extractLines(text);
  const printedTaxFreeAmount = extractPrintedTaxFreeAmount(text);

  let calculatedTaxFreeAmount: number | null = null;
  let warnings: string[] = [];
  let assumptions: string[] = [];

  const allowances = lines
    .filter((l) => l.type === "allowance" && l.amountPence !== null)
    .reduce((sum, l) => sum + l.amountPence!, 0);

  const deductions = lines
    .filter((l) => l.type === "deduction" && l.amountPence !== null)
    .reduce((sum, l) => sum + l.amountPence!, 0);

  if (lines.some((l) => l.type === "allowance" || l.type === "deduction")) {
    calculatedTaxFreeAmount = allowances - deductions;
  }

  let calculationDifference: number | null = null;
  if (printedTaxFreeAmount !== null && calculatedTaxFreeAmount !== null) {
    calculationDifference = printedTaxFreeAmount - calculatedTaxFreeAmount;
    if (Math.abs(calculationDifference) > 0) {
      warnings.push(
        `The calculated total (£${(calculatedTaxFreeAmount / 100).toFixed(2)}) differs from the printed total (£${(printedTaxFreeAmount / 100).toFixed(2)}) by £${(Math.abs(calculationDifference) / 100).toFixed(2)}.`,
      );
    }
  }

  const codeApproximatePence = replacement
    ? taxCodeToApproximatePence(replacement)
    : previous
      ? taxCodeToApproximatePence(previous)
      : null;

  if (codeApproximatePence !== null && printedTaxFreeAmount !== null) {
    const diff = Math.abs(codeApproximatePence - printedTaxFreeAmount);
    if (diff > 0) {
      assumptions.push(
        `The code represents approximately £${(codeApproximatePence / 100).toFixed(0)} while the printed amount is £${(printedTaxFreeAmount / 100).toFixed(2)}. The code number is rounded to the nearest £10.`,
      );
    }
  }

  const duplicatePageDetected =
    pages.length > 1 &&
    pages.some((p, i) =>
      pages.some((q, j) => i !== j && p.pageNumber === q.pageNumber),
    );

  const lastPageNum = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) : 1;
  const totalCount = extractTotalPageCount(text);
  const effectivePageCount = totalCount ?? lastPageNum;
  const appearsIncomplete = effectivePageCount > 1 && pages.length < effectivePageCount;

  if (appearsIncomplete) {
    warnings.push(
      `This notice appears incomplete: it should have ${effectivePageCount} pages but only ${pages.length} page(s) were provided.`,
    );
  }

  if (pages.length === 0) {
    warnings.push("No page information was found in the text.");
  }

  const unknownLines = lines.filter((l) => l.type === "unknown");
  if (unknownLines.length > 0) {
    for (const line of unknownLines) {
      warnings.push(`Unrecognised line item: "${line.label}" - please check this manually.`);
    }
  }

  const missingAmountLines = lines.filter(
    (l) => (l.type === "allowance" || l.type === "deduction") && l.amountPence === null,
  );
  if (missingAmountLines.length > 0) {
    for (const line of missingAmountLines) {
      warnings.push(`Could not read the amount for "${line.label}". Do not treat this as zero.`);
    }
  }

  return {
    recognised,
    documentSubType,
    confidence,
    recognitionEvidence,
    pages,
    appearsIncomplete,
    duplicatePageDetected,
    taxYearStart: taxYear.start,
    taxYearEnd: taxYear.end,
    noticeDate,
    employerOrPensionProvider: employer,
    previousTaxCode: previous,
    replacementTaxCode: replacement,
    lines,
    printedTaxFreeAmountPence: printedTaxFreeAmount,
    calculatedTaxFreeAmountPence: calculatedTaxFreeAmount,
    calculationDifferencePence: calculationDifference,
    codeApproximateTaxFreePence: codeApproximatePence,
    warnings,
    assumptions,
  };
}
