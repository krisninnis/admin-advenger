import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { renderAdviserExportMarkdown } from "../adviserExportPack";
import { createAdminCase } from "../caseFactory";
import { classifyDecisionDocument } from "../decisionEngine/classifier";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine/decisionEngine";
import { demoScenarios, standardDemoScenarios } from "../demoScenarios";
import { calculateImpactTotals, deriveImpactFromCase } from "../impactLedger";
import { createPreparedMessageDraft } from "../messageDrafts";
import { analyseAdminItem } from "../mockAnalysis";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";
import { goldenLetterFixtures, runGoldenLetterFixture } from "../goldenLetters";

const fixtureId = "benefits-uc-adviser-demo-001";
const demoTitle = "Universal Credit deductions and overpayment recovery";
const pound = "\u00c2\u00a3";

const getFixture = () => {
  const fixture = goldenLetterFixtures.find((item) => item.id === fixtureId);

  if (!fixture) {
    throw new Error(`Missing fixture ${fixtureId}`);
  }

  return fixture;
};

const getScenario = () => {
  const scenario = standardDemoScenarios.find((item) => item.title === demoTitle);

  if (!scenario) {
    throw new Error(`Missing demo scenario ${demoTitle}`);
  }

  return scenario;
};

const getRun = () => runGoldenLetterFixture(getFixture());

const factValue = (label: string) =>
  getRun().decisionResult.sourceFacts.find((fact) => fact.label === label)?.value;

const makeItem = (): AdminItem => ({
  id: "item-uc-adviser-demo",
  title: "Checked message",
  sourceType: "email",
  rawText: getFixture().inputText,
  createdAt: "2026-07-17T09:00:00.000Z",
  analysedAt: "2026-07-17T09:00:00.000Z",
});

const prohibitedUcDemoPhrases = [
  "the deduction is wrong",
  "you are entitled to",
  "dwp must refund",
  "the overpayment is invalid",
  "you will win",
  "your appeal will succeed",
  "citizens advice approves",
  "we contacted dwp",
  "money saved",
  "money recovered",
  "confirmed saving",
  "refund due",
  "compensation",
];

const expectNoProhibitedUcDemoPhrases = (text: string) => {
  const normalised = normaliseSafetyText(text);

  for (const phrase of prohibitedUcDemoPhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(text)).toEqual([]);
};

describe("Universal Credit adviser demo scenario", () => {
  it("is available through the active synthetic Demo Tour source", () => {
    const fixture = getFixture();
    const scenario = getScenario();

    expect(scenario.fixtureId).toBe(fixtureId);
    expect(scenario.title).toBe(demoTitle);
    expect(scenario.synthetic).toBe(true);
    expect(scenario.demoKind).toBe("standard");
    expect(scenario.inputText).toBe(fixture.inputText);
    expect(demoScenarios).toContain(scenario);
    expect(scenario.description).toContain("fictional Universal Credit statement");
    expect(scenario.description).toContain("uncertainty");
    expect(scenario.inputText).toContain("Fictional demo scenario");
    expect(scenario.inputText).toContain("not an official DWP template");
  });

  it("routes primarily as a Universal Credit benefits statement, not another domain", () => {
    const fixture = getFixture();
    const classification = classifyDecisionDocument(fixture.inputText);
    const result = analyseDecisionProblem(fixture.inputText);

    expect(classification).toBe("benefits_uc_statement");
    expect(result.documentType).toBe("benefits_uc_statement");
    expect(result.documentType).not.toBe("debt_collection");
    expect(result.documentType).not.toBe("bailiff_notice");
    expect(result.documentType).not.toBe("bank_complaint");
    expect(result.documentType).not.toBe("council_tax_reduction");
    expect(result.documentType).not.toBe("unknown_admin_dispute");
    expect(flattenDecisionResultText(result).toLowerCase()).not.toContain("suspicious email");
  });

  it("retains source-backed UC payment, deduction and missing-context facts", () => {
    const result = getRun().decisionResult;

    expect(factValue("Fictional scenario label")).toContain("Universal Credit payment statement");
    expect(factValue("Claimant shown")).toBe("Jordan Example");
    expect(factValue("Reference shown")).toBe("REF-EXAMPLE-UC-DEMO-2048");
    expect(factValue("Assessment period")).toBe("14 May 2026 to 13 June 2026");
    expect(factValue("Payment date")).toBe("20 June 2026");
    expect(factValue("Standard allowance")).toBe(`${pound}400.14`);
    expect(factValue("Housing element")).toBe(`${pound}525.00`);
    expect(factValue("Total before deductions")).toBe(`${pound}925.14`);
    expect(factValue("Advance repayment")).toBe(`${pound}35.00`);
    expect(factValue("Overpayment recovery")).toBe(`${pound}42.50`);
    expect(factValue("Total deductions")).toBe(`${pound}77.50`);
    expect(factValue("Payment this month")).toBe(`${pound}847.64`);
    expect(factValue("Overpayment detail not explained")).toContain("does not explain");
    expect(result.amountMentioned).toBe(`${pound}847.64`);
    expect(result.amountTreatment).toBe("amount_mentioned_only");
  });

  it("turns unclear overpayment context into visible preparation, uncertainty and cannotKnow", () => {
    const run = getRun();
    const combinedText = normaliseSafetyText(run.outputText);

    expect(run.resultViewModel.uncertainty.join(" ")).toContain("does not explain");
    expect(run.resultViewModel.evidenceToGather.some((item) =>
      item.value.toLowerCase().includes("overpayment period and calculation"),
    )).toBe(true);
    expect(run.resultViewModel.questionsToAnswer).toContain(
      "What earlier payment or period does the overpayment recovery relate to?",
    );
    expect(combinedText).toContain("whether the overpayment exists");
    expect(combinedText).toContain("what amount you should receive");
    expect(combinedText).toContain("mandatory reconsideration");
  });

  it("keeps every UC amount display-only and out of the Savings/Impact Ledger", () => {
    const run = getRun();
    const item = makeItem();
    const findings = analyseAdminItem(item);
    const finding = findings.find((candidate) => candidate.category === "admin_dispute");

    if (!finding) {
      throw new Error("Expected UC adviser demo to produce an admin dispute finding");
    }

    const adminCase = createAdminCase(finding, item);
    const impactEntries = deriveImpactFromCase(adminCase, item, finding);
    const totals = calculateImpactTotals(impactEntries, [adminCase]);

    expect(run.resultViewModel.moneyMentioned.length).toBeGreaterThanOrEqual(6);
    expect(run.resultViewModel.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(run.resultViewModel.moneyMentioned.map((line) => line.amountText)).toEqual(
      expect.arrayContaining([
        `${pound}400.14`,
        `${pound}525.00`,
        `${pound}77.50`,
        `${pound}847.64`,
      ]),
    );
    expect(impactEntries).toContainEqual(
      expect.objectContaining({
        type: "no_saving",
        status: "not_applicable",
        amount: undefined,
      }),
    );
    expect(totals.confirmedSavedRecovered).toBe(0);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.potentialSaving).toBe(0);
    expectNoProhibitedUcDemoPhrases(run.outputText);
  });

  it("produces a cautious editable UC journal message after saving to a case", () => {
    const item = makeItem();
    const findings = analyseAdminItem(item);
    const finding = findings.find((candidate) => candidate.category === "admin_dispute");

    if (!finding) {
      throw new Error("Expected UC adviser demo to produce an admin dispute finding");
    }

    const adminCase = createAdminCase(finding, item);
    const draft = createPreparedMessageDraft({ adminCase, item, finding });
    const normalisedDraft = normaliseSafetyText(draft.fullText);

    expect(draft.messageType).toBe("uc_deduction_breakdown_request");
    expect(draft.recipientHint).toContain("Universal Credit journal");
    expect(normalisedDraft).toContain("what any overpayment relates to");
    expect(normalisedDraft).toContain("period covered");
    expect(normalisedDraft).toContain("how it was calculated");
    expect(normalisedDraft).toContain("supporting documents");
    expect(normalisedDraft).toContain("breakdown of each deduction");
    expect(normaliseSafetyText(draft.safetyNote)).toContain("adminavenger has not sent this");
    expectNoProhibitedUcDemoPhrases(draft.fullText);
  });

  it("renders an adviser-ready export with dates, amounts, uncertainty and preparation-only wording", () => {
    const run = getRun();
    const markdown = renderAdviserExportMarkdown(run.adviserExportPack);
    const normalised = normaliseSafetyText(markdown);

    expect(markdown).toContain("Fictional demo scenario");
    expect(markdown).toContain("14 May 2026 to 13 June 2026");
    expect(markdown).toContain("20 June 2026");
    expect(markdown).toContain(`${pound}35.00`);
    expect(markdown).toContain(`${pound}42.50`);
    expect(markdown).toContain(`${pound}77.50`);
    expect(markdown).toContain(`${pound}847.64`);
    expect(normalised).toContain("does not explain");
    expect(normalised).toContain("what earlier payment or period");
    expect(normalised).toContain("preparation only");
    expect(normalised).toContain("display-only");
    expect(normalised).toContain("nothing has been sent or submitted");
    expectNoProhibitedUcDemoPhrases(markdown);
  });

  it("is deterministic across repeated analysis", () => {
    const fixture = getFixture();
    const first = analyseDecisionProblem(fixture.inputText);
    const second = analyseDecisionProblem(fixture.inputText);

    expect(first.documentType).toBe(second.documentType);
    expect(first.sourceFacts).toEqual(second.sourceFacts);
    expect(first.amountMentioned).toBe(second.amountMentioned);
    expect(first.amountTreatment).toBe(second.amountTreatment);
    expect(first.uncertainty).toEqual(second.uncertainty);
  });
});
