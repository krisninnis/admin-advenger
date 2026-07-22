import { describe, expect, it } from "vitest";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine";
import { FORBIDDEN_DECISION_PHRASES } from "../types";
import { parseTaxCode, taxCodeToApproximatePence, taxCodeLabel } from "../hmrc/taxCodeParser";
import { recogniseAndParse } from "../hmrc/noticeParser";
import { compareCodes } from "../hmrc/codeComparator";
import { estimateImpact } from "../hmrc/impactEstimator";
import { officialRules, getRulesForCode } from "../hmrc/officialRules";

const containsForbiddenPhrase = (text: string) => {
  const lowerText = text.toLowerCase();
  return FORBIDDEN_DECISION_PHRASES.some((phrase) => lowerText.includes(phrase));
};

const neverCountsAsMoney = (flattened: string) => {
  const lower = flattened.toLowerCase();
  expect(lower).not.toContain("confirmed saved");
  expect(lower).not.toContain("confirmed recovered");
  expect(lower).not.toMatch(/£[\d,.]+ (has been |was )?(saved|recovered)\b/);
};

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

const PAGE_1_ONLY = `HMRC
Tax Code Notice

Page 1 of 2

Tax year: 6 April 2026 to 5 April 2027

This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.

Employer: Harbour View Opticians Ltd

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542`;

const PARTIAL_TAX_CODE_NOTICE = `HMRC tax code notice. Your tax code has changed from 1257L to 1250L.`;

const P800_TEXT = `P800 tax calculation. HMRC has calculated that you overpaid tax in the 2025-26 tax year. You are owed a repayment of £215.`;

const PAYSLIP_TEXT = `Payslip for April 2026. Gross pay: £2,500. Tax paid: £416.67. National Insurance: £198. Net pay: £1,885.33.`;

const P45_TEXT = `Form P45. Employee: John Smith. Tax code: 1257L. Date leaving: 30 June 2026.`;

const P60_TEXT = `Form P60. Tax year 2025-26. Total tax paid: £4,500. Tax code: 1257L.`;

const GENERIC_HMRC_TEXT = `Dear taxpayer, your HMRC account has been updated. Please check your online account for details.`;

const BROADBAND_TEXT = `Your broadband bill has increased by £3 per month. Your new monthly price is £32.99. Your tax code 1257L has nothing to do with this.`;

const SELF_ASSESSMENT_TEXT = `Self Assessment tax return. Your SA302 calculation shows you owe £2,340 for the tax year 2025-26.`;

const UNDERPAYMENT_DEMAND_TEXT = `PAYE underpayment. You have an underpayment of tax of £540 which will be collected through your tax code.`;

describe("HMRC Tax Code Notice - Recognition", () => {
  it("recognises a genuine Tax Code Notice with strong combined evidence", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);

    expect(result.documentType).toBe("hmrc_tax_code_notice");
    expect(result.confidence.level).toBe("high");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises a partial Tax Code Notice with fewer signals", () => {
    const result = analyseDecisionProblem(PARTIAL_TAX_CODE_NOTICE);

    expect(result.documentType).toBe("hmrc_tax_code_notice");
    expect(result.confidence.level).toBe("medium");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not classify a P800 as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(P800_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not classify a payslip as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(PAYSLIP_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not classify a P45 as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(P45_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not classify a P60 as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(P60_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not classify a generic HMRC letter as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(GENERIC_HMRC_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify broadband text containing a code-like string as a Tax Code Notice", () => {
    const result = analyseDecisionProblem(BROADBAND_TEXT);

    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });
});

describe("HMRC Tax Code Notice - Document Separation", () => {
  it("does not recognise Self Assessment/SA302 as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(SELF_ASSESSMENT_TEXT);

    expect(parsed.documentSubType).toBe("self_assessment");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(SELF_ASSESSMENT_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not automatically label a PAYE underpayment demand as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(UNDERPAYMENT_DEMAND_TEXT);

    expect(parsed.documentSubType).toBe("paye_underpayment");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(UNDERPAYMENT_DEMAND_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises P800 as p800_calculation, not as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(P800_TEXT);

    expect(parsed.documentSubType).toBe("p800_calculation");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(P800_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises payslip as payslip, not as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(PAYSLIP_TEXT);

    expect(parsed.documentSubType).toBe("payslip");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(PAYSLIP_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises P45 as p45, not as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(P45_TEXT);

    expect(parsed.documentSubType).toBe("p45");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(P45_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises P60 as p60, not as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(P60_TEXT);

    expect(parsed.documentSubType).toBe("p60");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(P60_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("recognises a generic HMRC letter as generic_hmrc_letter, not as a Tax Code Notice", () => {
    const parsed = recogniseAndParse(GENERIC_HMRC_TEXT);

    expect(parsed.documentSubType).toBe("generic_hmrc_letter");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(GENERIC_HMRC_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("does not recognise broadband text containing a code-like string as a Tax Code Notice at parser level", () => {
    const parsed = recogniseAndParse(BROADBAND_TEXT);

    expect(parsed.documentSubType).not.toBe("tax_code_notice");
    expect(parsed.recognised).toBe(false);

    const result = analyseDecisionProblem(BROADBAND_TEXT);
    expect(result.documentType).not.toBe("hmrc_tax_code_notice");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });
});

describe("HMRC Tax Code Notice - Code Parser", () => {
  it("parses 1257L", () => {
    const code = parseTaxCode("1257L");
    expect(code.valid).toBe(true);
    expect(code.prefix).toBeNull();
    expect(code.number).toBe(1257);
    expect(code.suffix).toBe("L");
    expect(code.isKCode).toBe(false);
    expect(code.isCumulative).toBe(true);
  });

  it("parses C1254L", () => {
    const code = parseTaxCode("C1254L");
    expect(code.valid).toBe(true);
    expect(code.prefix).toBe("C");
    expect(code.number).toBe(1254);
    expect(code.suffix).toBe("L");
  });

  it("parses S1257L", () => {
    const code = parseTaxCode("S1257L");
    expect(code.valid).toBe(true);
    expect(code.prefix).toBe("S");
    expect(code.number).toBe(1257);
    expect(code.suffix).toBe("L");
  });

  it("parses M code", () => {
    const code = parseTaxCode("1257M");
    expect(code.valid).toBe(true);
    expect(code.number).toBe(1257);
    expect(code.suffix).toBe("M");
  });

  it("parses N code", () => {
    const code = parseTaxCode("1257N");
    expect(code.valid).toBe(true);
    expect(code.number).toBe(1257);
    expect(code.suffix).toBe("N");
  });

  it("parses T code", () => {
    const code = parseTaxCode("1257T");
    expect(code.valid).toBe(true);
    expect(code.number).toBe(1257);
    expect(code.suffix).toBe("T");
  });

  it("parses 0T", () => {
    const code = parseTaxCode("0T");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("0T");
    expect(code.isCumulative).toBe(true);
  });

  it("parses K code", () => {
    const code = parseTaxCode("K475");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("K");
    expect(code.isKCode).toBe(true);
    expect(code.number).toBe(475);
  });

  it("parses BR", () => {
    const code = parseTaxCode("BR");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("BR");
    expect(code.isCumulative).toBe(true);
  });

  it("parses D0", () => {
    const code = parseTaxCode("D0");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("D0");
  });

  it("parses D1", () => {
    const code = parseTaxCode("D1");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("D1");
  });

  it("parses NT", () => {
    const code = parseTaxCode("NT");
    expect(code.valid).toBe(true);
    expect(code.special).toBe("NT");
  });

  it("parses W1 emergency marker", () => {
    const code = parseTaxCode("1257L", "W1");
    expect(code.valid).toBe(true);
    expect(code.emergency).toBe("W1");
    expect(code.isCumulative).toBe(false);
  });

  it("parses M1 emergency marker", () => {
    const code = parseTaxCode("1257L", "M1");
    expect(code.valid).toBe(true);
    expect(code.emergency).toBe("M1");
    expect(code.isCumulative).toBe(false);
  });

  it("parses X emergency marker", () => {
    const code = parseTaxCode("1257L", "X");
    expect(code.valid).toBe(true);
    expect(code.emergency).toBe("X");
    expect(code.isCumulative).toBe(false);
  });

  it("parses NONCUM marker", () => {
    const code = parseTaxCode("1257L", "NONCUM");
    expect(code.valid).toBe(true);
    expect(code.emergency).toBe("NONCUM");
    expect(code.isCumulative).toBe(false);
  });

  it("rejects malformed and OCR-confused codes", () => {
    const code1 = parseTaxCode("125?L");
    expect(code1.valid).toBe(false);
    expect(code1.parseErrors.length).toBeGreaterThan(0);

    const code2 = parseTaxCode("");
    expect(code2.valid).toBe(false);

    const code3 = parseTaxCode("G1257L");
    expect(code3.prefix).toBeNull();
    expect(code3.number).toBe(1257);
  });

  it("approximates tax-free amount for numeric codes", () => {
    const code = parseTaxCode("1257L");
    expect(taxCodeToApproximatePence(code)).toBe(1257000);
  });

  it("returns null approximation for special codes", () => {
    expect(taxCodeToApproximatePence(parseTaxCode("BR"))).toBeNull();
    expect(taxCodeToApproximatePence(parseTaxCode("D0"))).toBeNull();
    expect(taxCodeToApproximatePence(parseTaxCode("K475"))).toBeNull();
  });

  it("labels codes correctly", () => {
    expect(taxCodeLabel(parseTaxCode("1257L"))).toBe("1257L");
    expect(taxCodeLabel(parseTaxCode("C1254L"))).toBe("C1254L");
    expect(taxCodeLabel(parseTaxCode("BR"))).toBe("BR");
    expect(taxCodeLabel(parseTaxCode("K475"))).toBe("K475");
  });
});

describe("HMRC Tax Code Notice - Calculation", () => {
  it("extracts allowances and deductions from a full notice", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);

    expect(parsed.recognised).toBe(true);
    expect(parsed.lines.length).toBeGreaterThan(0);

    const allowances = parsed.lines.filter((l) => l.type === "allowance");
    const deductions = parsed.lines.filter((l) => l.type === "deduction");
    const totals = parsed.lines.filter((l) => l.type === "printed_total");

    expect(allowances.length).toBeGreaterThanOrEqual(1);
    expect(deductions.length).toBeGreaterThanOrEqual(1);
    expect(totals.length).toBeGreaterThanOrEqual(1);
  });

  it("reconciles the calculation exactly", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);

    expect(parsed.printedTaxFreeAmountPence).toBe(1254200);
    expect(parsed.calculatedTaxFreeAmountPence).toBe(1254200);
    expect(parsed.calculationDifferencePence).toBe(0);
  });

  it("explains code rounding versus printed amount", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);

    expect(parsed.codeApproximateTaxFreePence).toBe(1254000);
    expect(parsed.assumptions.some((a) => a.includes("rounded"))).toBe(true);
  });

  it("handles missing amount without treating as zero", () => {
    const text = `HMRC tax code notice.
Personal Allowance             £12,570
Flat-rate job expenses
Medical insurance                 £88
Total tax-free amount          £12,482`;
    const parsed = recogniseAndParse(text);

    const missingAmountLine = parsed.lines.find(
      (l) => l.label.includes("Flat-rate") && l.amountPence === null,
    );
    expect(missingAmountLine).toBeDefined();
    expect(parsed.warnings.some((w) => w.includes("Could not read the amount"))).toBe(true);
  });

  it("retains unknown lines rather than dropping them", () => {
    const text = `HMRC tax code notice.
Personal Allowance             £12,570
Some unfamiliar deduction       £50
Total tax-free amount          £12,520`;
    const parsed = recogniseAndParse(text);

    const unknownLine = parsed.lines.find((l) => l.type === "unknown");
    expect(unknownLine).toBeDefined();
  });

  it("uses integer pence arithmetic", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    expect(parsed.printedTaxFreeAmountPence).toBe(Math.round(parsed.printedTaxFreeAmountPence!));
    expect(parsed.calculatedTaxFreeAmountPence).toBe(Math.round(parsed.calculatedTaxFreeAmountPence!));
  });
});

describe("HMRC Tax Code Notice - Comparison and Estimate", () => {
  it("compares C1263L to C1254L correctly", () => {
    const prev = parseTaxCode("C1263L");
    const repl = parseTaxCode("C1254L");
    const comparison = compareCodes(prev, repl, 1254200);

    expect(comparison.previousApproxTaxFreePence).toBe(1263000);
    expect(comparison.newExactTaxFreePence).toBe(1254200);
    expect(comparison.differencePence).toBe(-8800);
    expect(comparison.isReduction).toBe(true);
    expect(comparison.newLabelledApproximate).toBe(false);
  });

  it("estimates impact at explicit 20% rate", () => {
    const prev = parseTaxCode("C1263L");
    const repl = parseTaxCode("C1254L");
    const comparison = compareCodes(prev, repl, 1254200);
    const impact = estimateImpact(comparison, 20, prev, repl);

    expect(impact.supported).toBe(true);
    expect(impact.annualTaxDifferencePence).toBe(1760);
    expect(impact.monthlyAveragePence).toBe(147);
    expect(impact.weeklyAveragePence).toBe(34);
  });

  it("labels monthly and weekly as averages", () => {
    const prev = parseTaxCode("C1263L");
    const repl = parseTaxCode("C1254L");
    const comparison = compareCodes(prev, repl, 1254200);
    const impact = estimateImpact(comparison, 20, prev, repl);

    expect(impact.warnings.some((w) => w.includes("average"))).toBe(true);
  });

  it("suppresses estimate for unsupported special codes", () => {
    const prev = parseTaxCode("BR");
    const repl = parseTaxCode("1257L");
    const comparison = compareCodes(prev, repl, 1257000);
    const impact = estimateImpact(comparison, 20, prev, repl);

    expect(impact.supported).toBe(false);
    expect(impact.suppressReasons.some((r) => r.includes("special code"))).toBe(true);
  });

  it("suppresses estimate when no marginal rate is supplied", () => {
    const prev = parseTaxCode("C1263L");
    const repl = parseTaxCode("C1254L");
    const comparison = compareCodes(prev, repl, 1254200);
    const impact = estimateImpact(comparison, null, prev, repl);

    expect(impact.supported).toBe(false);
    expect(impact.suppressReasons.some((r) => r.includes("marginal tax rate"))).toBe(true);
  });

  it("never counts the estimate as money saved or recovered", () => {
    const prev = parseTaxCode("C1263L");
    const repl = parseTaxCode("C1254L");
    const comparison = compareCodes(prev, repl, 1254200);
    const impact = estimateImpact(comparison, 20, prev, repl);

    const impactText = JSON.stringify(impact).toLowerCase();
    expect(impactText).not.toContain("saved");
    expect(impactText).not.toContain("recovered");
  });
});

describe("HMRC Tax Code Notice - Completeness", () => {
  it("detects both pages are present", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);

    expect(parsed.appearsIncomplete).toBe(false);
    expect(parsed.pages.length).toBe(2);
  });

  it("detects page 1 only as incomplete", () => {
    const parsed = recogniseAndParse(PAGE_1_ONLY);

    expect(parsed.appearsIncomplete).toBe(true);
    expect(parsed.warnings.some((w) => w.includes("incomplete"))).toBe(true);
  });

  it("detects duplicate pages", () => {
    const text = FULL_TAX_CODE_NOTICE + "\n\n" + FULL_TAX_CODE_NOTICE;
    const parsed = recogniseAndParse(text);

    expect(parsed.duplicatePageDetected).toBe(true);
  });
});

describe("HMRC Tax Code Notice - Official Rules", () => {
  it("includes rules for all major code types", () => {
    expect(officialRules.length).toBeGreaterThanOrEqual(15);
  });

  it("every rule has required fields", () => {
    for (const rule of officialRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.sourceTitle).toBeTruthy();
      expect(rule.officialDomain).toContain("gov.uk");
      expect(rule.ruleSupported).toBeTruthy();
      expect(rule.dateChecked).toBeTruthy();
      expect(rule.taxYearRelevance).toBeTruthy();
      expect(["stable", "annually_variable"]).toContain(rule.stability);
    }
  });

  it("looks up rules for a specific code", () => {
    const rules = getRulesForCode("1257L");
    expect(rules.some((r) => r.id === "l-code")).toBe(true);
  });

  it("looks up rules for S prefix", () => {
    const rules = getRulesForCode("S1257L");
    expect(rules.some((r) => r.id === "s-prefix")).toBe(true);
  });
});

describe("HMRC Tax Code Notice - Module integration", () => {
  it("produces a full DecisionResult with source facts for a complete notice", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);

    expect(result.documentType).toBe("hmrc_tax_code_notice");
    expect(result.sourceFacts.length).toBeGreaterThan(0);
    expect(result.sourceFacts.some((f) => f.label.includes("Employer"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Tax year"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Previous tax code"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Replacement tax code"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Printed tax-free amount"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Approximate allowance change"))).toBe(true);
    expect(result.sourceFacts.some((f) => f.label.includes("Estimated tax impact"))).toBe(true);
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    neverCountsAsMoney(flattenDecisionResultText(result));
  });

  it("does not claim exact payslip impact", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(flattened).not.toMatch(/your payslip will (be|show)/);
    expect(flattened).toContain("estimate");
  });

  it("never uses forbidden wording", () => {
    const texts = [
      FULL_TAX_CODE_NOTICE,
      PAGE_1_ONLY,
      PARTIAL_TAX_CODE_NOTICE,
      BROADBAND_TEXT,
    ];
    for (const text of texts) {
      const result = analyseDecisionProblem(text);
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    }
  });
});
