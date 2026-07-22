import { describe, expect, it } from "vitest";
import type { AdminItem, SourceType } from "../../types";
import { analyseAdminItem } from "../mockAnalysis";
import { createAdminCase } from "../caseFactory";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { buildStrategicNextStepPlan } from "../strategicNextStep";
import {
  buildResultViewModel,
  flattenResultViewModelText,
  type ResultViewModel,
} from "../resultViewModel";
import { buildCaseProgress } from "../caseProgress";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import { matchHmrcIntent } from "../decisionEngine/modules/hmrcTaxCode";

// The exact public fixture named in the brief: HMRC Tax Code Notice, tax year
// 6 April 2026 to 5 April 2027, employer Harbour View Opticians Ltd, previous
// code C1263L, replacement C1254L, Personal Allowance £12,570, flat-rate job
// expenses £60, medical insurance £88, printed tax-free amount £12,542, no
// explicit notice date, no explicit response deadline, no reference number.
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

// Same notice but with an explicit issue date, used to prove a genuine date is
// still honoured while a tax-year boundary alone is not.
const NOTICE_WITH_ISSUE_DATE = `HMRC
Tax Code Notice
Issue date: 12 May 2026
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570`;

const PARKING_NOTICE = `Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. Contravention in car park.`;

// Strict, documented evidence bound for a single HMRC Tax Code Notice.
// The short fixture yields eight genuine found facts (employer, tax year,
// previous and replacement codes, and the four calculation entries) and four
// genuinely missing items. Assertions sit comfortably inside a small ceiling
// so the public result can never again show anything close to "30 found" or
// "11 to gather".
const MAX_EVIDENCE_FOUND = 12;
const MAX_EVIDENCE_TO_GATHER = 6;

const now = "2026-07-22T09:00:00.000Z";

const makeItem = (rawText: string, userQuestion?: string, sourceType: SourceType = "email"): AdminItem => ({
  id: "item-hmrc-public",
  title: "Tax Code Notice",
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
  userQuestion,
});

// Build the ResultViewModel + preparation progress exactly the way HomeView
// does for the public "Check a message" journey, so these assertions exercise
// the real runtime mapping rather than an isolated unit.
const buildPublicJourney = (rawText: string, userQuestion?: string) => {
  const item = makeItem(rawText, userQuestion);
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const primaryCase = createAdminCase(findings[0]!, item);
  const opportunity = deriveOpportunityCard(primaryCase, item, findings[0]);
  const benefitsActionPack = primaryCase.decisionResult
    ? buildBenefitsActionPack(primaryCase.decisionResult, opportunity, primaryCase)
    : null;
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult: primaryCase.decisionResult,
    benefitsActionPack,
    opportunity,
    adminCase: primaryCase,
  });
  const vm = buildResultViewModel({
    decisionResult: primaryCase.decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
    opportunity,
    adminCase: primaryCase,
    careerSupportPack: primaryCase.careerSupportPack,
  });
  const caseProgress = buildCaseProgress({
    resultViewModel: vm,
    decisionResult: primaryCase.decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  return { item, primaryCase, opportunity, strategicNextStepPlan, vm, caseProgress };
};

const foundLabels = (vm: ResultViewModel) => vm.evidenceFound.map((entry) => entry.label);
const gatherValues = (vm: ResultViewModel) => vm.evidenceToGather.map((entry) => entry.value);

describe("HMRC public result - Defect 1: the direct answer survives the journey", () => {
  it("maps both 'What is this?' and the suggested 'What does this mean?' to what_is_this", () => {
    expect(matchHmrcIntent("What is this?")).toBe("what_is_this");
    expect(matchHmrcIntent("What does this mean?")).toBe("what_is_this");
    expect(matchHmrcIntent("What does it mean?")).toBe("what_is_this");
    expect(matchHmrcIntent("What does this letter mean?")).toBe("what_is_this");
  });

  it("renders a safe direct answer through the public view model for 'What is this?'", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(vm.directAnswer).toBeDefined();
    expect(vm.directAnswer).toContain("HMRC tax code notice");
    expect(vm.directAnswer).toContain("not a tax bill");
    expect(vm.directAnswer).toContain("C1263L");
    expect(vm.directAnswer).toContain("C1254L");
    // never claims the code is correct, never predicts an exact payslip effect
    expect(vm.directAnswer!.toLowerCase()).not.toMatch(/\bis correct\b/);
    expect(vm.directAnswer!.toLowerCase()).not.toMatch(/your payslip will/);
  });

  it("produces the identical safe direct answer for the suggested 'What does this mean?'", () => {
    const whatIsThis = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?").vm.directAnswer;
    const whatDoesThisMean = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What does this mean?").vm.directAnswer;

    expect(whatDoesThisMean).toBeDefined();
    expect(whatDoesThisMean).toBe(whatIsThis);
  });

  it("never auto-creates a draft for the what_is_this direct answer", () => {
    const { vm, primaryCase } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(primaryCase.decisionResult?.draftMessage).toBeUndefined();
    expect(vm.draftOrChecklist).toBeUndefined();
  });

  it("renders title, then direct answer, then generic summary in order", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What does this mean?");

    expect(vm.title).toBeTruthy();
    expect(vm.directAnswer).toBeTruthy();
    expect(vm.summary).toBeTruthy();
    // The renderer places title -> directAnswer -> summary; the view model must
    // supply all three so nothing collapses to undefined.
    expect(vm.summary).not.toBe(vm.directAnswer);
  });
});

describe("HMRC public result - Defect 2: evidence counts are strict and clean", () => {
  it("stays far below the old 30 found / 11 to gather", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(vm.evidenceFound.length).toBeLessThanOrEqual(MAX_EVIDENCE_FOUND);
    expect(vm.evidenceToGather.length).toBeLessThanOrEqual(MAX_EVIDENCE_TO_GATHER);
    expect(vm.evidenceFound.length).toBeGreaterThan(0);
    // Concretely: eight genuine facts, four genuine gaps.
    expect(vm.evidenceFound.length).toBe(8);
    expect(vm.evidenceToGather.length).toBe(4);
  });

  it("counts only meaningful found facts (employer, tax year, both codes, four calculation entries)", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const labels = foundLabels(vm);

    expect(labels).toContain("Employer or pension provider");
    expect(labels).toContain("Tax year");
    expect(labels).toContain("Previous tax code");
    expect(labels).toContain("Replacement tax code");
    expect(labels).toContain("Allowance: Personal Allowance");
    expect(labels).toContain("Allowance: Flat-rate job expenses");
    expect(labels).toContain("Deduction: Medical insurance");
    expect(labels).toContain("Total: Total tax-free amount");
  });

  it("never counts grounds, missing items, deadlines, risks, safety notes or the source title as found evidence", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const labels = foundLabels(vm);

    for (const banned of ["Possible ground", "Risk", "Safety note", "Deadline/urgency", "Source"]) {
      expect(labels).not.toContain(banned);
    }
    expect(labels.some((label) => /^missing:/i.test(label))).toBe(false);
  });

  it("does not re-request facts already found (employer, tax year, previous or replacement code)", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const toGather = gatherValues(vm).join(" \n ").toLowerCase();

    expect(toGather).not.toContain("employer");
    expect(toGather).not.toContain("previous tax code");
    expect(toGather).not.toContain("replacement tax code");
    expect(toGather).not.toContain("current and previous tax codes");
    expect(toGather).not.toContain("tax year");
  });

  it("does not leak uncertainty or cannot-know statements into the evidence-to-gather list", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(gatherValues(vm).some((value) => /adminavenger cannot/i.test(value))).toBe(false);
  });

  it("keeps genuinely missing evidence (records/payslips and an explicit issue date)", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const toGather = gatherValues(vm).join(" \n ").toLowerCase();

    expect(toGather).toContain("payslip");
    expect(toGather).toContain("notice or issue date");
  });

  it("the preparation-progress evidence line reflects the strict counts, not 30/11", () => {
    const { caseProgress } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const evidenceItem = caseProgress.items.find((item) => item.id === "evidence-gathered");

    expect(evidenceItem?.description).toContain("8 pieces of evidence found so far");
    expect(evidenceItem?.description).toContain("4 more to gather");
    expect(evidenceItem?.description).not.toContain("30 pieces");
    expect(evidenceItem?.description).not.toContain("11 more");
  });
});

describe("HMRC public result - Defect 3: a tax-year boundary must not complete the key-date step", () => {
  it("does not surface the tax-year boundary as a key date", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(vm.keyDates).toHaveLength(0);
    expect(
      vm.keyDates.some((date) => `${date.label} ${date.value}`.includes("6 April 2026 to 5 April 2027")),
    ).toBe(false);
  });

  it("leaves 'Key date checked' not complete for the fixture", () => {
    const { caseProgress } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");
    const keyDate = caseProgress.items.find((item) => item.id === "key-date");

    expect(keyDate).toBeDefined();
    expect(keyDate!.status).not.toBe("complete");
    expect(keyDate!.status).toBe("missing");
  });

  it("does not complete the key-date step when only a tax-year boundary is present", () => {
    const craftedVm = {
      keyDates: [
        {
          id: "d1",
          label: "Tax year",
          value: "6 April 2026 to 5 April 2027",
          caution: "",
          userMustCheck: true as const,
          source: "main_result" as const,
        },
      ],
      moneyMentioned: [],
      evidenceFound: [],
      evidenceToGather: [],
      questionsToAnswer: [],
      risks: [],
      uncertainty: [],
      cannotKnow: [],
      draftOrChecklist: undefined,
    } as unknown as ResultViewModel;

    const progress = buildCaseProgress({ resultViewModel: craftedVm });
    const keyDate = progress.items.find((item) => item.id === "key-date");

    expect(keyDate!.status).not.toBe("complete");
  });

  it("still completes the key-date step for an explicit issue date", () => {
    const { vm, caseProgress } = buildPublicJourney(NOTICE_WITH_ISSUE_DATE, "What is this?");
    const keyDate = caseProgress.items.find((item) => item.id === "key-date");

    expect(vm.keyDates.some((date) => date.value.includes("12 May 2026"))).toBe(true);
    expect(keyDate!.status).toBe("complete");
  });
});

describe("HMRC public result - Defect 4: instructions are not rendered as dates", () => {
  it("emits no instruction strings as deadlines for the fixture", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(result.deadlines).toEqual([]);
    expect(
      result.deadlines.some((deadline) => /contact hmrc|response deadline|action required/i.test(deadline)),
    ).toBe(false);
  });

  it("produces no notice-date or response-deadline cards in the view model", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(vm.keyDates).toHaveLength(0);
  });

  it("keeps the contact-HMRC guidance in the next step and not in the dates panel", () => {
    const result = analyseDecisionProblem(FULL_TAX_CODE_NOTICE, "What is this?");

    expect(result.nextSteps.some((step) => /contact hmrc/i.test(step))).toBe(true);
    expect(result.deadlines.some((deadline) => /contact hmrc/i.test(deadline))).toBe(false);
    // guidance to look for a deadline belongs in the HMRC next step
    expect(result.nextSteps.some((step) => /response deadline|date you need to act/i.test(step))).toBe(true);
  });
});

describe("HMRC public result - overall safety", () => {
  it("contains no 'undefined', money-saved, or exact-payslip claims", () => {
    const { vm } = buildPublicJourney(FULL_TAX_CODE_NOTICE, "What does this mean?");
    const flattened = flattenResultViewModelText(vm);

    expect(flattened).not.toContain("undefined");
    expect(flattened.toLowerCase()).not.toMatch(/£[\d,.]+ (?:has been |was )?(?:saved|recovered)\b/);
    expect(flattened.toLowerCase()).not.toContain("confirmed saved");
    expect(flattened.toLowerCase()).not.toMatch(/your payslip will (be|show)/);
  });
});

describe("HMRC public result - unrelated document types stay unchanged", () => {
  it("a parking notice still composes evidence from the case (adminCase.evidence path intact)", () => {
    const { vm, primaryCase } = buildPublicJourney(PARKING_NOTICE, "What is this?");

    expect(primaryCase.decisionResult?.documentType).toBe("parking_ticket");
    // For non-HMRC decision results, evidenceFound still draws on adminCase.evidence,
    // so it contains more than just the parsed sourceFacts.
    const sourceFactCount = primaryCase.decisionResult?.sourceFacts.length ?? 0;
    expect(vm.evidenceFound.length).toBeGreaterThan(sourceFactCount);
  });
});
