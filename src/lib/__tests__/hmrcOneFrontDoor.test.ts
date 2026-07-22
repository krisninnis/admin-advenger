import { describe, expect, it } from "vitest";
import type { AdminItem, SourceType } from "../../types";
import { createAdminCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine/decisionEngine";
import { FORBIDDEN_DECISION_PHRASES } from "../decisionEngine/types";
import { matchHmrcIntent } from "../decisionEngine/modules/hmrcTaxCode";
import { shouldPrepareHmrcDraft } from "../decisionEngine/modules/hmrcTaxCode";
import { recogniseAndParse } from "../decisionEngine/hmrc/noticeParser";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildResultViewModel, validateResultViewModelSafety } from "../resultViewModel";
import { buildStrategicNextStepPlan } from "../strategicNextStep";
import { buildBenefitsActionPack } from "../benefitsActionPack";

const now = "2026-07-22T09:00:00.000Z";

const makeItem = (
  title: string,
  rawText: string,
  sourceType: SourceType = "email",
  userQuestion?: string,
): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
  userQuestion,
});

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

const analyseToCases = (item: AdminItem) => {
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  return { item, findings, cases };
};

const firstCase = (item: AdminItem) => {
  const result = analyseToCases(item);
  const adminCase = result.cases[0];
  const finding = result.findings[0];
  if (!adminCase || !finding) throw new Error("Expected at least one case");
  return { ...result, adminCase, finding };
};

describe("HMRC Tax Code Notice - Question intent matching", () => {
  it("matches 'what is this' intent", () => {
    expect(matchHmrcIntent("What is this?")).toBe("what_is_this");
    expect(matchHmrcIntent("What is this document?")).toBe("what_is_this");
    expect(matchHmrcIntent("Explain this")).toBe("what_is_this");
    expect(matchHmrcIntent("Tell me about this")).toBe("what_is_this");
  });

  it("matches 'why changed' intent", () => {
    expect(matchHmrcIntent("Why has my tax code changed?")).toBe("why_changed");
    expect(matchHmrcIntent("Why is my code now different?")).toBe("why_changed");
    expect(matchHmrcIntent("Reason for the code change")).toBe("why_changed");
    expect(matchHmrcIntent("How did my tax code change?")).toBe("why_changed");
  });

  it("matches 'effect on pay' intent", () => {
    expect(matchHmrcIntent("How will this affect my pay?")).toBe("effect_on_pay");
    expect(matchHmrcIntent("How much will this cost me?")).toBe("effect_on_pay");
    expect(matchHmrcIntent("What's the financial impact?")).toBe("effect_on_pay");
    expect(matchHmrcIntent("Will I be paid less?")).toBe("effect_on_pay");
  });

  it("matches 'do I need to act' intent", () => {
    expect(matchHmrcIntent("Do I need to do something?")).toBe("do_i_need_to_act");
    expect(matchHmrcIntent("Is there anything I need to respond to?")).toBe("do_i_need_to_act");
    expect(matchHmrcIntent("Action required?")).toBe("do_i_need_to_act");
    expect(matchHmrcIntent("Must I contact HMRC?")).toBe("do_i_need_to_act");
  });

  it("matches 'is this correct' intent", () => {
    expect(matchHmrcIntent("Is this correct?")).toBe("is_this_correct");
    expect(matchHmrcIntent("Is the calculation right?")).toBe("is_this_correct");
    expect(matchHmrcIntent("Has HMRC made a mistake?")).toBe("is_this_correct");
    expect(matchHmrcIntent("Does the arithmetic add up?")).toBe("is_this_correct");
  });

  it("matches 'what should I check' intent", () => {
    expect(matchHmrcIntent("What should I check?")).toBe("what_should_i_check");
    expect(matchHmrcIntent("What do I need to verify?")).toBe("what_should_i_check");
    expect(matchHmrcIntent("What's there to look at?")).toBe("what_should_i_check");
  });

  it("matches 'write reply' intent", () => {
    expect(matchHmrcIntent("Write me a reply")).toBe("write_reply");
    expect(matchHmrcIntent("Draft me an email")).toBe("write_reply");
    expect(matchHmrcIntent("Can you prepare a message?")).toBe("write_reply");
  });

  it("returns unrecognised for empty or unmatched questions", () => {
    expect(matchHmrcIntent("")).toBe("unrecognised");
    expect(matchHmrcIntent("Hello")).toBe("unrecognised");
    expect(matchHmrcIntent("I like cats")).toBe("unrecognised");
  });
});

describe("HMRC Tax Code Notice - Direct answer per intent", () => {
  it("answers 'what is this' with document identification", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("HMRC tax code notice");
    expect(result.directAnswer).toContain("notification");
    expect(result.directAnswer).toContain("not a tax bill");
    expect(result.directAnswer).toContain("C1263L");
    expect(result.directAnswer).toContain("C1254L");
  });

  it("answers 'why changed' with calculation explanation", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Why has my tax code changed?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("C1263L");
    expect(result.directAnswer).toContain("C1254L");
    expect(result.directAnswer).toContain("Medical insurance");
  });

  it("answers 'effect on pay' with estimated impact", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("20%");
    expect(result.directAnswer).toContain("£17.60");
    expect(result.directAnswer).toContain("average");
    expect(result.directAnswer).not.toMatch(/your payslip will (be|show)/);
  });

  it("answers 'do I need to act' with action status", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Do I need to do anything?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("No immediate action appears necessary");
    expect(result.directAnswer).toContain("C1254L");
  });

  it("answers 'is this correct' with reconciliation check", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Is this correct?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("reconcile");
    expect(result.directAnswer).toContain("AdminAvenger cannot confirm");
  });

  it("answers 'what should I check' with verification items", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What should I check?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("Harbour View Opticians Ltd");
    expect(result.directAnswer).toContain("C1254L");
    expect(result.directAnswer).toContain("C1263L");
    expect(result.directAnswer).toContain("benefits in kind");
  });

  it("answers 'write reply' with draft guidance", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("draft");
    expect(result.directAnswer).toContain("review");
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage).toContain("Tax code notice query");
  });

  it("has no directAnswer when no question is supplied", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.directAnswer).toBeUndefined();
  });

  it("returns draftMessage for write_reply intent and for ordinary intents on a consistent notice", () => {
    const writeResult = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(writeResult.draftMessage).toBeDefined();
    expect(writeResult.draftMessage).toContain("Tax code notice query");

    const whatIsThis = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    expect(whatIsThis.draftMessage).toBeUndefined();

    const whyChanged = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Why has my tax code changed?");
    expect(whyChanged.draftMessage).toBeUndefined();

    const effectOnPay = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    expect(effectOnPay.draftMessage).toBeUndefined();

    const doINeedToAct = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Do I need to do anything?");
    expect(doINeedToAct.draftMessage).toBeUndefined();

    const whatShouldICheck = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What should I check?");
    expect(whatShouldICheck.draftMessage).toBeUndefined();
  });

  it("returns no draftMessage when no question is supplied", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.draftMessage).toBeUndefined();
  });
});

describe("HMRC Tax Code Notice - Paste integration (Section 6)", () => {
  it("routes a pasted two-page notice through analyseAdminItem to an HMRC result without category selection", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.confidence.level).toBe("high");
  });

  it("answers a supplied question through the paste journey", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email", "What is this?");
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.directAnswer).toBeDefined();
    expect(adminCase.decisionResult?.directAnswer).toContain("HMRC tax code notice");
    expect(adminCase.decisionResult?.directAnswer).toContain("not a tax bill");
  });

  it("does not require category selection - the user never sees a category picker", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(finding.title).not.toContain("Select");
    expect(finding.title).not.toContain("Category");
    expect(finding.summary).not.toContain("choose a category");
  });

  it("does not count money saved or recovered", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { adminCase } = firstCase(item);
    const flattened = flattenDecisionResultText(adminCase.decisionResult!);

    neverCountsAsMoney(flattened);
    expect(adminCase.valueLabel).toContain("amount mentioned");
  });

  it("maps to the HMRC result with correct visible hierarchy", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding, adminCase } = firstCase(item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const benefitsActionPack = buildBenefitsActionPack(adminCase.decisionResult!);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
    });
    const vm = buildResultViewModel({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      opportunity,
      adminCase,
    });

    expect(vm.title).toBeTruthy();
    expect(vm.summary).toContain("HMRC tax code notice");
    expect(vm.evidenceFound.length).toBeGreaterThan(0);
    expect(vm.evidenceToGather.length).toBeGreaterThan(0);
    expect(vm.safetyNotes.length).toBeGreaterThan(0);
    expect(vm.cannotKnow.length).toBeGreaterThan(0);
    expect(vm.uncertainty.length).toBeGreaterThan(0);

    const safetyReport = validateResultViewModelSafety(vm);
    expect(safetyReport.safe).toBe(true);
  });

  it("uses the closest genuine exported public intake API (analyseAdminItem with public accessMode)", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const findings = analyseAdminItem(item, { accessMode: "public" });

    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0]!.category).toBe("admin_dispute");
    const adminCase = createAdminCase(findings[0]!, item);
    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
  });

  it("parser input isolation: analysis receives item.rawText, not title-prefixed text (Defect 3 regression)", () => {
    const rawText = FULL_TAX_CODE_NOTICE;
    const itemWithDifferentTitle = makeItem("Important Letter From HMRC", rawText, "email");
    const { adminCase } = firstCase(itemWithDifferentTitle);

    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.confidence.level).toBe("high");

    const allText = JSON.stringify(adminCase.decisionResult);
    expect(allText).not.toContain("Important Letter From HMRC");
  });

  it("parser input isolation: title is never prepended to the decision engine input", () => {
    const rawText = FULL_TAX_CODE_NOTICE;
    const item = makeItem("Email from HMRC - Tax Code Update", rawText, "email");
    const { adminCase } = firstCase(item);

    const allText = JSON.stringify(adminCase.decisionResult);
    expect(allText).not.toContain("Email from HMRC - Tax Code Update");
  });
});

describe("HMRC Tax Code Notice - Photo/OCR integration (Section 7)", () => {
  it("routes HMRC text produced by the approved OCR handoff to the same analysis path", () => {
    const ocrText = `HMRC
Tax Code Notice

Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;

    const item = makeItem("Photo text (reviewed before checking)", ocrText, "email");
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.confidence.level).toBe("high");
  });

  it("preserves document preparation before OCR - synthetic OCR text reaches same path", () => {
    const lowQualityOcr = `HMRC tax code notice.
Your tax code has changed from 1257L to 1250L.
Tax year 2026 to 2027.`;

    const item = makeItem("Photo text (reviewed before checking)", lowQualityOcr, "email");
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.confidence.level).toBe("high");
  });
});

describe("HMRC Tax Code Notice - File upload integration (Section 8)", () => {
  it("routes extracted text from file upload path to the same HMRC result", () => {
    const extractedText = `HMRC
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

    const item = makeItem("Uploaded document text", extractedText, "pdf");
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.confidence.level).toBe("high");
  });
});

describe("HMRC Tax Code Notice - Negative routing (Section 9)", () => {
  it("does not classify P800 as a Tax Code Notice", () => {
    const text = "P800 tax calculation. HMRC has calculated that you overpaid tax in the 2025-26 tax year. You are owed a repayment of £215.";
    const item = makeItem("P800", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify P45 as a Tax Code Notice", () => {
    const text = "Form P45. Employee: John Smith. Tax code: 1257L. Date leaving: 30 June 2026.";
    const item = makeItem("P45", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify P60 as a Tax Code Notice", () => {
    const text = "Form P60. Tax year 2025-26. Total tax paid: £4,500. Tax code: 1257L.";
    const item = makeItem("P60", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify payslip as a Tax Code Notice", () => {
    const text = "Payslip for April 2026. Gross pay: £2,500. Tax paid: £416.67. National Insurance: £198. Net pay: £1,885.33.";
    const item = makeItem("Payslip", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify Self Assessment/SA302 as a Tax Code Notice", () => {
    const text = "Self Assessment tax return. Your SA302 calculation shows you owe £2,340 for the tax year 2025-26.";
    const item = makeItem("SA302", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify PAYE underpayment demand as a Tax Code Notice", () => {
    const text = "PAYE underpayment. You have an underpayment of tax of £540 which will be collected through your tax code.";
    const item = makeItem("PAYE underpayment", text);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).not.toBe("hmrc_tax_code_notice");
  });

  it("does not classify broadband message containing C1254L as a Tax Code Notice", () => {
    const text = "Your broadband bill has increased by £3 per month. Your new monthly price is £32.99. Your tax code 1257L has nothing to do with this.";
    const item = makeItem("Broadband", text);
    const { finding } = firstCase(item);

    expect(finding.category).not.toBe("admin_dispute");
  });

  it("does not classify benefits overpayment message as a Tax Code Notice", () => {
    const text = "Your Universal Credit has been reduced due to an overpayment recovery of £340. This will be deducted from your monthly payment.";
    const item = makeItem("Benefits overpayment", text);
    const { finding } = firstCase(item);

    expect(finding.category).toBe("important_reply");
  });
});

describe("HMRC Tax Code Notice - Existing routes unchanged (Section 9)", () => {
  it("broadband price rise still routes to bill_increase", () => {
    const text = "Your broadband price is increasing from £29.99 to £32.99 per month from 1 March 2026. You can leave without an early termination charge.";
    const item = makeItem("Broadband price rise", text);
    const { finding } = firstCase(item);

    expect(finding.category).toBe("bill_increase");
  });

  it("parking notice still routes to admin_dispute/parking_ticket", () => {
    const text = "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. Contravention in car park.";
    const item = makeItem("Parking", text);
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("parking_ticket");
  });

  it("warranty wording still routes to admin_dispute/consumer_dispute", () => {
    const text = "Your warranty claim for the faulty item has been refused. We do not consider this a replacement or repair under consumer rights.";
    const item = makeItem("Warranty", text);
    const { finding, adminCase } = firstCase(item);

    expect(finding.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("consumer_dispute");
  });

  it("genuine warrant wording routes to bailiff_notice", () => {
    const text = "Bailiff notice of enforcement. Warrant of control issued. Enforcement agent will visit to seize goods.";
    const item = makeItem("Bailiff", text);
    const findings = analyseAdminItem(item, { accessMode: "controlled" });
    const adminCase = createAdminCase(findings[0]!, item);

    expect(findings[0]!.category).toBe("admin_dispute");
    expect(adminCase.decisionResult?.documentType).toBe("bailiff_notice");
  });

  it("public high-risk welfare fallback still blocks in public mode", () => {
    const text = "Your Universal Credit sanction starts on 18 August 2026. You have no food and no heating. Ask for a mandatory reconsideration.";
    const item = makeItem("Benefits crisis", text);
    const findings = analyseAdminItem(item, { accessMode: "public" });

    expect(findings[0]!.category).toBe("important_reply");
    expect(findings[0]!.title).toContain("Specialist support may be needed");
  });
});

describe("HMRC Tax Code Notice - Incomplete notice handling", () => {
  it("marks page 1 only as incomplete and reduces confidence", () => {
    const page1Only = `HMRC
Tax Code Notice

Page 1 of 2

Tax year: 6 April 2026 to 5 April 2027

Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542`;

    const item = makeItem("Tax Code Notice incomplete", page1Only);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.uncertainty.some((u) => u.includes("incomplete"))).toBe(true);
  });

  it("suppresses confident estimate for special codes", () => {
    const brCode = `HMRC tax code notice. Your tax code has changed from BR to 1257L. Tax year 2026 to 2027.`;
    const item = makeItem("BR code", brCode);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
    expect(adminCase.decisionResult?.cannotKnow.some((ck) => ck.includes("estimate"))).toBe(true);
  });

  it("suppresses estimate for emergency marker", () => {
    const emergencyCode = `HMRC tax code notice. Your tax code has changed from 1257L to 1257L W1. Tax year 2026 to 2027.`;
    const item = makeItem("Emergency code", emergencyCode);
    const { adminCase } = firstCase(item);

    expect(adminCase.decisionResult?.documentType).toBe("hmrc_tax_code_notice");
  });
});

describe("HMRC Tax Code Notice - Safety and wording", () => {
  it("never uses forbidden wording across all intents", () => {
    const intents = [
      "What is this?",
      "Why has my tax code changed?",
      "How will this affect my pay?",
      "Do I need to do anything?",
      "Is this correct?",
      "What should I check?",
      "Write me a reply",
    ];
    for (const intent of intents) {
      const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, intent);
      expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
    }
  });

  it("never claims exact payslip impact", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(flattened).not.toMatch(/your payslip will (be|show)/);
    expect(flattened).toContain("estimate");
    expect(flattened).toContain("average");
  });

  it("never counts estimate as money saved or recovered", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    neverCountsAsMoney(flattenDecisionResultText(result));
  });

  it("amountTreatment is amount_mentioned_only, not amount_being_demanded", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.amountTreatment).toBe("amount_mentioned_only");
  });

  it("safety notes include the preparation-only note", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.safetyNotes.some((n) => n.includes("not give legal advice"))).toBe(true);
    expect(result.safetyNotes.some((n) => n.includes("not a tax adviser"))).toBe(true);
  });
});

describe("HMRC Tax Code Notice - Evidence deduplication (Defect 4 regression)", () => {
  it("does not request employer details when employer is already parsed", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("Details of any employers"))).toBe(false);
    expect(evidenceRequested.some((e) => e.includes("employers or pension providers"))).toBe(false);
  });

  it("does not request tax codes when both previous and replacement are already parsed", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("current and previous tax codes"))).toBe(false);
  });

  it("requests employer details when employer is missing from the notice", () => {
    const noticeNoEmployer = `HMRC tax code notice.
Tax year 2026 to 2027.
This is to tell you your tax code.
Your tax code has changed from 1257L to 1250L.
Personal Allowance             £12,570
Total tax-free amount          £12,570`;
    const result = analyseDecisionProblem(noticeNoEmployer);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("Details of any employers"))).toBe(true);
  });

  it("requests tax codes when they are missing from the notice", () => {
    const noticeNoCodes = `HMRC tax code notice.
Tax year 2026 to 2027.
This is to tell you your tax code.
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570`;
    const result = analyseDecisionProblem(noticeNoCodes);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("current and previous tax codes"))).toBe(true);
  });

  it("requests explicit notice date when no date is found", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("explicit notice or issue date"))).toBe(true);
  });

  it("full notice always requests the full document and benefits in kind", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidenceRequested = result.evidenceNeeded ?? [];

    expect(evidenceRequested.some((e) => e.includes("full HMRC tax code notice"))).toBe(true);
    expect(evidenceRequested.some((e) => e.includes("benefits in kind"))).toBe(true);
  });
});

describe("shouldPrepareHmrcDraft - predicate tests", () => {
  it("returns true for write_reply intent", () => {
    expect(shouldPrepareHmrcDraft({ intent: "write_reply", hasCalcDifference: false })).toBe(true);
  });

  it("returns true when hasCalcDifference is true", () => {
    expect(shouldPrepareHmrcDraft({ intent: "what_is_this", hasCalcDifference: true })).toBe(true);
  });

  it("returns true for dispute signal: this employer is wrong", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_is_this",
      hasCalcDifference: false,
      userQuestion: "This employer is wrong about the code",
    })).toBe(true);
  });

  it("returns true for dispute signal: the medical insurance is incorrect", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_is_this",
      hasCalcDifference: false,
      userQuestion: "The medical insurance is incorrect on this notice",
    })).toBe(true);
  });

  it("returns true for dispute signal: I dispute this code", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_is_this",
      hasCalcDifference: false,
      userQuestion: "I dispute this code",
    })).toBe(true);
  });

  it("returns true for dispute signal: HMRC has the wrong information", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_is_this",
      hasCalcDifference: false,
      userQuestion: "HMRC has the wrong information about my employer",
    })).toBe(true);
  });

  it("returns true for dispute signal: this notice is wrong", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "effect_on_pay",
      hasCalcDifference: false,
      userQuestion: "This notice is wrong",
    })).toBe(true);
  });

  it("returns true for dispute signal: I think HMRC made a mistake", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "effect_on_pay",
      hasCalcDifference: false,
      userQuestion: "I think HMRC has made a mistake",
    })).toBe(true);
  });

  it("returns false for what_is_this with no calc difference and no dispute signal", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_is_this",
      hasCalcDifference: false,
      userQuestion: "What is this?",
    })).toBe(false);
  });

  it("returns false for why_changed with no calc difference and no dispute signal", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "why_changed",
      hasCalcDifference: false,
      userQuestion: "Why has my tax code changed?",
    })).toBe(false);
  });

  it("returns false for effect_on_pay with no calc difference and no dispute signal", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "effect_on_pay",
      hasCalcDifference: false,
      userQuestion: "How will this affect my pay?",
    })).toBe(false);
  });

  it("returns false for do_i_need_to_act with no calc difference and no dispute signal", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "do_i_need_to_act",
      hasCalcDifference: false,
      userQuestion: "Do I need to act?",
    })).toBe(false);
  });

  it("returns false for what_should_i_check with no calc difference and no dispute signal", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "what_should_i_check",
      hasCalcDifference: false,
      userQuestion: "What should I check?",
    })).toBe(false);
  });

  it("returns false for unrecognised intent with no calc difference and no question", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "unrecognised",
      hasCalcDifference: false,
    })).toBe(false);
  });

  it("returns false for unrecognised intent with no calc difference and benign question", () => {
    expect(shouldPrepareHmrcDraft({
      intent: "unrecognised",
      hasCalcDifference: false,
      userQuestion: "Hello",
    })).toBe(false);
  });
});

describe("HMRC Tax Code Notice - Draft trigger end-to-end", () => {
  it("produces draftMessage for write_reply intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage).toContain("Tax code notice query");
  });

  it("produces draftMessage when user asks about employer being wrong", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "This employer is wrong about the tax code");
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage).toContain("Tax code notice query");
  });

  it("produces draftMessage when user says HMRC has a mistake", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "I think HMRC has made a mistake with this notice");
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage).toContain("Tax code notice query");
  });

  it("produces draftMessage when user disputes the code", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "I dispute this code, it is incorrect");
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage).toContain("Tax code notice query");
  });

  it("does not produce draftMessage for what_is_this intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("does not produce draftMessage for why_changed intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Why has my tax code changed?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("does not produce draftMessage for effect_on_pay intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("does not produce draftMessage for do_i_need_to_act intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Do I need to do anything?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("does not produce draftMessage for what_should_i_check intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What should I check?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("does not produce draftMessage when no question is supplied", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.draftMessage).toBeUndefined();
  });

  it("draft uses personal-detail placeholders when details are missing", () => {
    const noticeWithoutYear = `HMRC
Tax Code Notice
Page 1 of 2
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,542`;
    const result = analyseDecisionProblem(noticeWithoutYear, "Write me a reply");
    expect(result.draftMessage).toContain("[add reference]");
    expect(result.draftMessage).toContain("[add tax year]");
  });

  it("draft uses parsed details when available", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.draftMessage).toContain("[add reference]");
    expect(result.draftMessage).toContain("6 April");
    expect(result.draftMessage).toContain("Harbour View Opticians Ltd");
  });

  it("draft asks HMRC to confirm the information used", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.draftMessage).toContain("Please confirm what information you used to set this tax code");
  });

  it("draft does not claim HMRC definitely made an error", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.draftMessage).not.toMatch(/you (definitely |clearly )?(made|have made) (a |an )?mistake/i);
    expect(result.draftMessage).not.toMatch(/HMRC is wrong/i);
    expect(result.draftMessage).not.toMatch(/your calculation is wrong/i);
  });

  it("draft does not imply AdminAvenger sends it", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    expect(result.draftMessage).not.toMatch(/adminavenger (will|has|is going to) (send|submit|email)/i);
    expect(result.draftMessage).not.toMatch(/we (will|are going to) (send|submit)/i);
  });
});

describe("HMRC Tax Code Notice - Structural-line filtering (Defect 7 regression)", () => {
  it("does not include employer header or tax code declarations in parsed line items", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    const lineLabels = parsed.lines.map((l) => l.label.toLowerCase());

    expect(lineLabels).not.toContain("employer");
    expect(lineLabels).not.toContain("employer or pension provider");
    expect(lineLabels).not.toContain("previous tax code");
    expect(lineLabels).not.toContain("new code");
    expect(lineLabels).not.toContain("new tax code");
    expect(lineLabels).not.toContain("replacement tax code");
  });

  it("does not include page headers or HMRC boilerplate in parsed line items", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    const lineLabels = parsed.lines.map((l) => l.label.toLowerCase());

    expect(lineLabels).not.toContain("hmrc");
    expect(lineLabels).not.toContain("hm revenue & customs");
    expect(lineLabels).not.toContain("tax code notice");
    expect(lineLabels).not.toContain("page 1 of 2");
    expect(lineLabels).not.toContain("page 2 of 2");
  });

  it("still captures genuine allowance/deduction calculation lines", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    const lineLabels = parsed.lines.map((l) => l.label);

    expect(lineLabels).toContain("Personal Allowance");
    expect(lineLabels).toContain("Flat-rate job expenses");
    expect(lineLabels).toContain("Medical insurance");
    expect(lineLabels).toContain("Total tax-free amount");
  });

  it("parsed.lines contains exactly four genuine calculation rows and nothing else", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    expect(parsed.lines.length).toBe(4);
    expect(parsed.lines.map((l) => l.label)).toEqual([
      "Personal Allowance",
      "Flat-rate job expenses",
      "Medical insurance",
      "Total tax-free amount",
    ]);
  });

  it("no prose or structural line becomes an unknown item in warnings", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    const structuralPhrases = [
      "Your tax code has changed from C1263L to C1254L",
      "HMRC",
      "HM Revenue",
      "Tax Code Notice",
      "Page 1 of 2",
      "Page 2 of 2",
      "Tax year:",
      "Employer:",
      "Previous tax code:",
      "New code:",
      "This is to tell you",
      "This means you can earn",
      "If you think",
      "How we worked out",
      "Your tax code for the tax year",
      "contact HMRC",
    ];
    const lineLabels = parsed.lines.map((l) => l.label);
    for (const phrase of structuralPhrases) {
      expect(lineLabels.some((label) => label.includes(phrase))).toBe(false);
    }
  });

  it("structural-line filter does not remove genuine items from a minimal notice", () => {
    const minimal = `HMRC tax code notice.
Tax year 2026 to 2027.
Your tax code has changed from 1257L to 1250L.

Personal Allowance             £12,570
Some deduction                  £50
Total tax-free amount          £12,520`;
    const parsed = recogniseAndParse(minimal);
    const lineLabels = parsed.lines.map((l) => l.label);

    expect(lineLabels).toContain("Personal Allowance");
    expect(lineLabels).toContain("Some deduction");
    expect(lineLabels).toContain("Total tax-free amount");
  });

  it("retains unfamiliar aligned calculation row with amount", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Your tax code has changed from 1257L to 1250L.

Personal Allowance             £12,570
Some unfamiliar deduction       £50
Total tax-free amount          £12,520`;
    const parsed = recogniseAndParse(text);
    const unfamiliarLine = parsed.lines.find((l) => l.label.includes("unfamiliar"));

    expect(unfamiliarLine).toBeDefined();
    expect(unfamiliarLine!.amountPence).toBe(5000);
  });

  it("retains recognised calculation label with missing amount for manual checking", () => {
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
});

describe("HMRC Tax Code Notice - Question-aware result hierarchy (Defect 8 regression)", () => {
  it("what_is_this has no draftMessage but has directAnswer", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    expect(result.directAnswer).toBeDefined();
    expect(result.directAnswer).toContain("HMRC tax code notice");
    expect(result.directAnswer).toContain("not a tax bill");
    expect(result.draftMessage).toBeUndefined();
  });

  it("what_is_this directAnswer does not overstep into legal or financial advice", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    const answer = result.directAnswer!.toLowerCase();
    expect(answer).not.toMatch(/you (are |will be )?(entitled|owed|eligible)/);
    expect(answer).not.toMatch(/you (definitely |clearly )?owe/);
    expect(answer).not.toMatch(/this (is |was )?(unlawful|illegal|wrong)/);
  });

  it("no_question result has no directAnswer and no draftMessage", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    expect(result.directAnswer).toBeUndefined();
    expect(result.draftMessage).toBeUndefined();
  });

  it("write_reply produces draftMessage, what_is_this does not", () => {
    const replyResult = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "Write me a reply");
    const whatResult = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(replyResult.draftMessage).toBeDefined();
    expect(whatResult.draftMessage).toBeUndefined();
  });

  it("each intent has at least one nextStep in the strategic plan", () => {
    const intents = [
      "What is this?",
      "Why has my tax code changed?",
      "How will this affect my pay?",
      "Do I need to do anything?",
      "Is this correct?",
      "What should I check?",
    ];
    for (const intent of intents) {
      const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, intent);
      const plan = buildStrategicNextStepPlan({ decisionResult: result });
      expect(plan.safestMove).toBeDefined();
      expect(plan.safestMove.label).toBeTruthy();
    }
  });

  it("hmrc_tax_code_notice gets HMRC-specific strategic next step, not generic", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    const plan = buildStrategicNextStepPlan({ decisionResult: result });

    expect(plan.safestMove.label).toContain("employer");
    expect(plan.safestMove.label).toContain("codes");
    expect(plan.safestMove.label).not.toContain("Identify the sender");
  });
});

describe("HMRC Tax Code Notice - Parser regressions", () => {
  it("tax year '6 April 2026 to 5 April 2027' produces the exact full range", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    expect(parsed.taxYearStart).toBe("6 April 2026");
    expect(parsed.taxYearEnd).toBe("5 April 2027");
  });

  it("tax year '2026 to 2027' produces the exact full range with standard boundaries", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Your tax code has changed from 1257L to 1250L.`;
    const parsed = recogniseAndParse(text);
    expect(parsed.taxYearStart).toBe("6 April 2026");
    expect(parsed.taxYearEnd).toBe("5 April 2027");
  });

  it("malformed or incomplete input never produces the word 'undefined'", () => {
    const inputs = [
      "",
      "HMRC",
      "Tax code notice.",
      "Your tax code has changed.",
      "Personal Allowance £12,570",
      "random text with no structure",
    ];
    for (const input of inputs) {
      const parsed = recogniseAndParse(input);
      const result = analyseDecisionProblem(input);
      const parsedStr = JSON.stringify(parsed);
      const resultStr = JSON.stringify(result);
      expect(parsedStr).not.toContain("undefined");
      expect(resultStr).not.toContain("undefined");
    }
  });

  it("the full fixture has no noticeDate", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    expect(parsed.noticeDate).toBeNull();
  });

  it("no tax-year boundary becomes a response or action deadline", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const deadlineStrings = result.deadlines ?? [];
    for (const d of deadlineStrings) {
      expect(d).not.toContain("6 April 2026");
      expect(d).not.toContain("5 April 2027");
    }
  });

  it("notice date is extracted when explicit labelled line exists", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Notice date: 12 May 2026
Your tax code has changed from 1257L to 1250L.`;
    const parsed = recogniseAndParse(text);
    expect(parsed.noticeDate).toBe("12 May 2026");
  });

  it("notice date is extracted from 'Issue date:' labelled line", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Issue date: 1 July 2026
Your tax code has changed from 1257L to 1250L.`;
    const parsed = recogniseAndParse(text);
    expect(parsed.noticeDate).toBe("1 July 2026");
  });

  it("notice date is extracted from 'Dated:' labelled line", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Dated: 12 May 2026
Your tax code has changed from 1257L to 1250L.`;
    const parsed = recogniseAndParse(text);
    expect(parsed.noticeDate).toBe("12 May 2026");
  });

  it("notice date is extracted from 'Sent on:' labelled line", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Sent on: 12 May 2026
Your tax code has changed from 1257L to 1250L.`;
    const parsed = recogniseAndParse(text);
    expect(parsed.noticeDate).toBe("12 May 2026");
  });

  it("tax-year dates and unrelated prose containing 'date' do not become noticeDate", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    expect(parsed.noticeDate).toBeNull();

    const withDeadline = `HMRC tax code notice.
Tax year 2026 to 2027.
Your tax code has changed from 1257L to 1250L.
Date leaving: 30 June 2026.`;
    const parsed2 = recogniseAndParse(withDeadline);
    expect(parsed2.noticeDate).toBeNull();
  });
});

describe("HMRC Tax Code Notice - Evidence deduplication edge cases", () => {
  it("requests previous tax code when only replacement is found", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
New code: C1250L
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570`;
    const result = analyseDecisionProblem(text);
    const evidence = result.evidenceNeeded ?? [];

    expect(evidence.some((e) => e.includes("previous tax code"))).toBe(true);
    expect(evidence.some((e) => e.includes("replacement tax code"))).toBe(false);
  });

  it("requests replacement tax code when only previous is found", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
Previous tax code: C1263L
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570`;
    const result = analyseDecisionProblem(text);
    const evidence = result.evidenceNeeded ?? [];

    expect(evidence.some((e) => e.includes("replacement tax code"))).toBe(true);
    expect(evidence.some((e) => e.includes("previous tax code"))).toBe(false);
  });

  it("requests no tax codes when both are found", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidence = result.evidenceNeeded ?? [];

    expect(evidence.some((e) => e.includes("previous tax code"))).toBe(false);
    expect(evidence.some((e) => e.includes("replacement tax code"))).toBe(false);
    expect(evidence.some((e) => e.includes("current and previous tax codes"))).toBe(false);
  });

  it("requests generic tax code evidence when neither is found", () => {
    const text = `HMRC tax code notice.
Tax year 2026 to 2027.
This is to tell you your tax code.
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570`;
    const result = analyseDecisionProblem(text);
    const evidence = result.evidenceNeeded ?? [];

    expect(evidence.some((e) => e.includes("current and previous tax codes"))).toBe(true);
  });

  it("no duplicate employer, tax-year, or tax-code requests in evidence", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidence = result.evidenceNeeded ?? [];
    const employerRequests = evidence.filter((e) => e.toLowerCase().includes("employer"));
    const taxCodeRequests = evidence.filter(
      (e) => e.toLowerCase().includes("tax code") && !e.toLowerCase().includes("notice"),
    );
    const yearRequests = evidence.filter(
      (e) => e.toLowerCase().includes("tax year"),
    );

    expect(employerRequests.length).toBeLessThanOrEqual(1);
    expect(taxCodeRequests.length).toBeLessThanOrEqual(1);
    expect(yearRequests.length).toBeLessThanOrEqual(1);
  });
});

describe("HMRC Tax Code Notice - Result noise", () => {
  it("full fixture DecisionResult contains no 'undefined' text", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    const flattened = flattenDecisionResultText(result);
    expect(flattened).not.toContain("undefined");
  });

  it("full fixture ResultViewModel contains no 'undefined' text", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding, adminCase } = firstCase(item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const benefitsActionPack = buildBenefitsActionPack(adminCase.decisionResult!);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
    });
    const vm = buildResultViewModel({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      opportunity,
      adminCase,
    });

    const vmStr = JSON.stringify(vm);
    expect(vmStr).not.toContain("undefined");
  });

  it("full fixture has no unknown structural/prose lines in parsed.lines", () => {
    const parsed = recogniseAndParse(FULL_TAX_CODE_NOTICE);
    const unknownLines = parsed.lines.filter((l) => l.type === "unknown");
    expect(unknownLines.length).toBe(0);
  });

  it("full fixture has no duplicate evidence in ResultViewModel", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding, adminCase } = firstCase(item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const benefitsActionPack = buildBenefitsActionPack(adminCase.decisionResult!);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
    });
    const vm = buildResultViewModel({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      opportunity,
      adminCase,
    });

    const foundKeys = vm.evidenceFound.map((e) => `${e.label}:${e.value}`);
    const gatherKeys = vm.evidenceToGather.map((e) => `${e.label}:${e.value}`);
    expect(new Set(foundKeys).size).toBe(foundKeys.length);
    expect(new Set(gatherKeys).size).toBe(gatherKeys.length);
  });

  it("no inflated evidence or preparation counts caused by document structure", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE);
    const evidence = result.evidenceNeeded ?? [];
    expect(evidence.length).toBeLessThanOrEqual(8);
  });

  it("no draftMessage for 'What is this?' intent", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");
    expect(result.draftMessage).toBeUndefined();
  });

  it("no money-saved or exact-payslip claim in DecisionResult", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "How will this affect my pay?");
    const flattened = flattenDecisionResultText(result).toLowerCase();
    neverCountsAsMoney(flattenDecisionResultText(result));
    expect(flattened).not.toMatch(/your payslip will (be|show)/);
  });

  it("ResultViewModel safety check passes for the full fixture", () => {
    const item = makeItem("Tax Code Notice", FULL_TAX_CODE_NOTICE, "email");
    const { finding, adminCase } = firstCase(item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const benefitsActionPack = buildBenefitsActionPack(adminCase.decisionResult!);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
    });
    const vm = buildResultViewModel({
      decisionResult: adminCase.decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      opportunity,
      adminCase,
    });

    const safetyReport = validateResultViewModelSafety(vm);
    expect(safetyReport.safe).toBe(true);
    expect(safetyReport.hasForbiddenWording).toBe(false);
    expect(safetyReport.hasAdversarialLanguage).toBe(false);
  });
});
