import { describe, expect, it } from "vitest";
import { buildAdviserExportPack } from "../adviserExportPack";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { buildCaseProgress, flattenCaseProgressText } from "../caseProgress";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import { buildResultViewModel } from "../resultViewModel";
import {
  assertNoForbiddenSafetyPhrases,
  collectTextFromAdviserExportPack,
  collectTextFromBenefitsActionPack,
  collectTextFromDecisionResult,
  collectTextFromResultViewModel,
  collectTextFromStrategicNextStepPlan,
  findForbiddenSafetyPhrases,
  hasSafetyTheme,
  normaliseSafetyText,
} from "../safetyWording";
import { buildStrategicNextStepPlan } from "../strategicNextStep";
import type { DecisionDocumentType, DecisionResult } from "../decisionEngine/types";
import { buildWorkplaceSupportPack } from "../workplaceSupportPack";

type SafetyFixture = {
  name: string;
  text: string;
  expectedType: DecisionDocumentType;
};

const fixtures = [
  {
    name: "UC statement",
    expectedType: "benefits_uc_statement",
    text: `Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Standard allowance: GBP 393.45
Housing: GBP 500.00
Advance repayment: GBP 50.00
Your payment this month: GBP 843.45`,
  },
  {
    name: "UC sanction",
    expectedType: "benefits_uc_sanction",
    text: `Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask for a Mandatory Reconsideration.
Hardship support is mentioned.`,
  },
  {
    name: "PIP decision refusal",
    expectedType: "benefits_decision",
    text: `Personal Independence Payment decision
We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.`,
  },
  {
    name: "PIP evidence claim form",
    expectedType: "benefits_evidence_prep",
    text: `PIP2 How your disability affects you form.
Please return the form by 12 August 2026.
I need help with preparing food, washing and bathing, and planning journeys.
I have GP letters and a prescription list.`,
  },
  {
    name: "UC deductions",
    expectedType: "benefits_uc_deductions",
    text: `Universal Credit overpayment decision.
We will be recovering an overpayment from your Universal Credit.
Overpayment recovery: GBP 35.00.
Debt owed to DWP reference OP123.`,
  },
  {
    name: "Council Tax Reduction",
    expectedType: "council_tax_reduction",
    text: `Council Tax Reduction decision.
Your local council tax support scheme has changed.
Decision date: 9 July 2026.
Please check the income details we used.`,
  },
  {
    name: "Crisis support",
    expectedType: "benefits_crisis_support",
    text: `Local welfare assistance crisis grant request.
I cannot afford food or heating this week.
The council hardship fund asks for tenancy and income evidence.`,
  },
  {
    name: "Debt collection",
    expectedType: "debt_collection",
    text: `Debt collector letter.
Outstanding balance GBP 480.00.
The account has been passed to collections.
Please reply by 31 July 2026 with your reference and any payment plan evidence.`,
  },
  {
    name: "Parking legal-looking debt",
    expectedType: "parking_ticket",
    text: `Parking Charge Notice PCN.
Amount GBP 100, reduced to GBP 60 if paid within 14 days.
The signs were unclear and the app payment failed.
POPLA is mentioned on the notice.`,
  },
  {
    name: "Consumer dispute",
    expectedType: "consumer_dispute",
    text: `Refund refused for a faulty item.
The product is not fit for purpose and the retailer ignored my request for repair or replacement.
Order reference ABC123.`,
  },
  {
    name: "Scam-like suspicious message",
    expectedType: "unknown_admin_dispute",
    text: `Sender: support@secure-bank-login-example.com
Reply-to: randomhelpdesk@example.net
Subject: Your account will be locked today

Your account will be locked today. Click this link immediately to verify your bank details and avoid suspension.`,
  },
  {
    name: "Unknown fallback",
    expectedType: "unknown_admin_dispute",
    text: `Please see the attached update.
We will write again if more information is needed.
Reference: GEN123.`,
  },
] as const satisfies readonly SafetyFixture[];

const buildArtifacts = (fixture: SafetyFixture) => {
  const decisionResult = analyseDecisionProblem(fixture.text);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult,
    benefitsActionPack,
  });
  const resultViewModel = buildResultViewModel({
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const adviserExportPack = buildAdviserExportPack({
    decisionResult,
    resultViewModel,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const decisionText = collectTextFromDecisionResult(decisionResult);
  const benefitsText = benefitsActionPack ? collectTextFromBenefitsActionPack(benefitsActionPack) : "";
  const strategicText = collectTextFromStrategicNextStepPlan(strategicNextStepPlan);
  const resultViewText = collectTextFromResultViewModel(resultViewModel);
  const adviserPackText = collectTextFromAdviserExportPack(adviserExportPack);
  const combinedText = [
    decisionText,
    benefitsText,
    strategicText,
    resultViewText,
    adviserPackText,
  ].join("\n");

  return {
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
    resultViewModel,
    adviserExportPack,
    decisionText,
    benefitsText,
    strategicText,
    resultViewText,
    adviserPackText,
    combinedText,
  };
};

const expectNoForbiddenOutput = (text: string, context: string) => {
  const matches = findForbiddenSafetyPhrases(text, { context });

  expect(matches).toEqual([]);
};

const expectDecisionBoundaries = (decisionResult: DecisionResult, text: string) => {
  expect(decisionResult.cannotKnow.length).toBeGreaterThan(0);
  expect(normaliseSafetyText(text)).toContain("cannot");

  if (decisionResult.uncertainty.length > 0) {
    expect(normaliseSafetyText(text)).toMatch(/unclear|uncertain|missing|may depend|not clear/);
  }
};

describe("safety wording helpers", () => {
  it("detects grouped forbidden phrases", () => {
    const matches = findForbiddenSafetyPhrases(
      "You will win. We contacted them. This is game theory and money saved.",
      { context: "direct helper test" },
    );

    expect(matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ phrase: "you will win", group: "outcome_claim" }),
        expect.objectContaining({ phrase: "we contacted", group: "automation_claim" }),
        expect.objectContaining({ phrase: "game theory", group: "adversarial_language" }),
        expect.objectContaining({ phrase: "money saved", group: "money_claim" }),
      ]),
    );
  });

  it("throws for an intentionally unsafe direct helper call", () => {
    expect(() =>
      assertNoForbiddenSafetyPhrases("You should appeal and you will win.", "unsafe direct helper test"),
    ).toThrow(/Forbidden safety wording found/);
  });

  it("ignores cautious preparation wording", () => {
    const cautiousText =
      "This appears to need checking. AdminAvenger does not contact anyone for you. You decide what happens next. Get advice if urgent or unclear.";

    expect(findForbiddenSafetyPhrases(cautiousText)).toEqual([]);
    expect(hasSafetyTheme(cautiousText, "no_contact")).toBe(true);
    expect(hasSafetyTheme(cautiousText, "human_decides")).toBe(true);
    expect(hasSafetyTheme(cautiousText, "get_advice_when_serious")).toBe(true);
  });
});

describe("generated safety wording regression", () => {
  it.each(fixtures)("$name generated output has no forbidden safety wording", (fixture) => {
    const artifacts = buildArtifacts(fixture);

    expect(artifacts.decisionResult.documentType).toBe(fixture.expectedType);
    expectNoForbiddenOutput(artifacts.combinedText, fixture.name);
  });

  it.each(fixtures)("$name keeps cannotKnow and uncertainty boundaries accessible", (fixture) => {
    const artifacts = buildArtifacts(fixture);

    expectDecisionBoundaries(artifacts.decisionResult, artifacts.combinedText);
    expect(artifacts.resultViewModel.cannotKnow.length).toBeGreaterThan(0);
    expect(artifacts.resultViewModel.uncertainty.length).toBeGreaterThan(0);
  });

  it("Benefits Action Pack output keeps money display-only and dates user-check-required", () => {
    const benefitsFixtures = fixtures.filter((fixture) =>
      fixture.expectedType.startsWith("benefits") || fixture.expectedType === "council_tax_reduction",
    );

    for (const fixture of benefitsFixtures) {
      const artifacts = buildArtifacts(fixture);

      expect(artifacts.benefitsActionPack).not.toBeNull();
      expectNoForbiddenOutput(artifacts.benefitsText, `${fixture.name} benefits pack`);
      expect(hasSafetyTheme(artifacts.benefitsText, "no_contact")).toBe(true);

      if (!artifacts.benefitsActionPack) {
        throw new Error(`Expected benefits action pack for ${fixture.name}`);
      }

      expect(artifacts.benefitsActionPack.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
      expect(artifacts.benefitsActionPack.possibleDatesToCheck.every((date) => date.userMustCheck === true)).toBe(true);
      expect(artifacts.benefitsActionPack.possibleDatesToCheck.every((date) => normaliseSafetyText(date.caution).includes("check"))).toBe(true);

      if (artifacts.benefitsActionPack.moneyMentioned.length > 0) {
        expect(hasSafetyTheme(artifacts.benefitsText, "money_display_only")).toBe(true);
      }
    }
  });

  it.each(fixtures)("Best next move for $name avoids adversarial and automation language", (fixture) => {
    const artifacts = buildArtifacts(fixture);

    expectNoForbiddenOutput(artifacts.strategicText, `${fixture.name} strategic plan`);
    expect(hasSafetyTheme(artifacts.strategicText, "no_contact")).toBe(true);
    expect(artifacts.strategicText.toLowerCase()).not.toContain("game theory");
    expect(artifacts.strategicText.toLowerCase()).not.toContain("opponent");
    expect(artifacts.strategicText.toLowerCase()).not.toContain("submitted automatically");
  });

  it.each(fixtures)("ResultViewModel for $name keeps safety invariants", (fixture) => {
    const artifacts = buildArtifacts(fixture);

    expectNoForbiddenOutput(artifacts.resultViewText, `${fixture.name} result view model`);
    expect(artifacts.resultViewModel.cannotKnow.length).toBeGreaterThan(0);
    expect(artifacts.resultViewModel.uncertainty.length).toBeGreaterThan(0);
    expect(artifacts.resultViewModel.keyDates.every((date) => date.userMustCheck === true)).toBe(true);
    expect(artifacts.resultViewModel.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(hasSafetyTheme(artifacts.resultViewText, "no_contact")).toBe(true);
  });

  it.each(fixtures)("Adviser Export Pack for $name keeps safety invariants and drops nothing", (fixture) => {
    const artifacts = buildArtifacts(fixture);
    const pack = artifacts.adviserExportPack;

    expectNoForbiddenOutput(artifacts.adviserPackText, `${fixture.name} adviser export pack`);
    expect(pack.whyThisMatters).not.toBe("");
    expect(pack.confidence.statement).not.toBe("");
    expect(pack.uncertainty.length).toBeGreaterThan(0);
    expect(pack.cannotKnow.length).toBeGreaterThan(0);
    expect(pack.routeToCheck.length).toBeGreaterThan(0);
    expect(
      pack.draft.included ? Boolean(pack.draft.body) : pack.draft.noDraftLine === "No draft was included in this pack.",
    ).toBe(true);
    expect(normaliseSafetyText(artifacts.adviserPackText)).not.toContain("case strength");
    expect(hasSafetyTheme(artifacts.adviserPackText, "no_contact")).toBe(true);
  });

  it("debt and parking outputs do not use unsafe debt or legal claims", () => {
    const debtAndParking = fixtures.filter((fixture) =>
      fixture.expectedType === "debt_collection" || fixture.expectedType === "parking_ticket",
    );

    for (const fixture of debtAndParking) {
      const artifacts = buildArtifacts(fixture);
      const text = normaliseSafetyText(artifacts.combinedText);

      expect(text).not.toContain("you do not owe this");
      expect(text).not.toContain("this debt is unenforceable");
      expect(text).not.toContain("ignore it");
      expect(text).not.toContain("pay now");
      expect(text).toContain("check");
      expect(hasSafetyTheme(text, "get_advice_when_serious")).toBe(true);
    }
  });

  it("scam-like and unknown fallback output remains conservative", () => {
    for (const fixture of fixtures.filter((item) => item.expectedType === "unknown_admin_dispute")) {
      const artifacts = buildArtifacts(fixture);
      const text = normaliseSafetyText(artifacts.combinedText);

      expectNoForbiddenOutput(text, fixture.name);
      expect(text).toContain("check");
      expect(text).toContain("sender");
      expect(text).not.toContain("reply automatically");
      expect(text).not.toContain("safe to click");
      expect(text).not.toContain("click immediately");
    }
  });

  it("snapshot phrase contracts stay green", () => {
    const pipDecision = buildArtifacts(fixtures.find((fixture) => fixture.name === "PIP decision refusal")!);
    const ucSanction = buildArtifacts(fixtures.find((fixture) => fixture.name === "UC sanction")!);
    const parking = buildArtifacts(fixtures.find((fixture) => fixture.name === "Parking legal-looking debt")!);
    const ucStatement = buildArtifacts(fixtures.find((fixture) => fixture.name === "UC statement")!);

    expect(normaliseSafetyText(pipDecision.combinedText)).not.toContain("you qualify");
    expect(normaliseSafetyText(ucSanction.combinedText)).not.toContain("dwp is wrong");
    expect(normaliseSafetyText(parking.combinedText)).not.toContain("you do not owe this");
    expect(normaliseSafetyText(ucStatement.strategicText)).not.toContain("game theory");
    expect(normaliseSafetyText(ucStatement.benefitsText)).not.toContain("money saved");
  });

  it("Workplace Support Pack ResultViewModel output keeps preparation-only boundaries", () => {
    const workplaceTexts = [
      `Example Works HR
Reference: REF-EXAMPLE-WORK-SAFE-001

You are invited to a disciplinary meeting on 14 September 2026 about an allegation of misconduct.
You may bring a workplace companion and should review the investigation notes.`,
      `Example Works Payroll
Reference: REF-EXAMPLE-WORK-SAFE-002

Your payslip shows a deduction of GBP 75.00 for the September pay period.
Please contact payroll if you have questions about wages or holiday pay.`,
      `Example Works HR
Reference: REF-EXAMPLE-WORK-SAFE-003

The attached settlement agreement is sent without prejudice.
It mentions a COT3 route and asks Alex Example to reply by 30 September 2026.`,
    ];

    for (const text of workplaceTexts) {
      const workplaceSupportPack = buildWorkplaceSupportPack({ text });
      const resultViewModel = buildResultViewModel({ workplaceSupportPack });
      const caseProgress = buildCaseProgress({ resultViewModel, workplaceSupportPack });
      const adviserExportPack = buildAdviserExportPack({
        resultViewModel,
        workplaceSupportPack,
      });
      const resultViewText = collectTextFromResultViewModel(resultViewModel);
      const caseProgressText = flattenCaseProgressText(caseProgress);
      const adviserPackText = collectTextFromAdviserExportPack(adviserExportPack);
      const normalised = normaliseSafetyText(resultViewText);
      const progressNormalised = normaliseSafetyText(caseProgressText);
      const adviserNormalised = normaliseSafetyText(adviserPackText);

      expectNoForbiddenOutput(resultViewText, `workplace ${workplaceSupportPack.documentType}`);
      expectNoForbiddenOutput(caseProgressText, `workplace case progress ${workplaceSupportPack.documentType}`);
      expectNoForbiddenOutput(adviserPackText, `workplace adviser export ${workplaceSupportPack.documentType}`);
      expect(hasSafetyTheme(resultViewText, "no_contact")).toBe(true);
      expect(hasSafetyTheme(resultViewText, "human_decides")).toBe(true);
      expect(hasSafetyTheme(resultViewText, "cannot_know")).toBe(true);
      expect(normalised).toContain("preparation");
      expect(progressNormalised).toContain("preparation");
      expect(progressNormalised).toContain("does not predict the outcome");
      expect(normalised).toContain("not legal or employment advice");
      expect(normalised).toContain("acas");
      expect(progressNormalised).toContain("acas");
      expect(adviserNormalised).toContain("preparation");
      expect(adviserNormalised).toContain("acas");
      expect(adviserNormalised).toContain("adminavenger helps prepare. you stay in control");
      expect(normalised).not.toContain("compensation owed");
      expect(normalised).not.toContain("tribunal prediction");
      expect(normalised).not.toContain("employer broke the law");
      expect(progressNormalised).not.toContain("compensation owed");
      expect(progressNormalised).not.toContain("tribunal prediction");
      expect(progressNormalised).not.toContain("employer broke the law");
      expect(adviserNormalised).not.toContain("compensation owed");
      expect(adviserNormalised).not.toContain("tribunal prediction");
      expect(adviserNormalised).not.toContain("employer broke the law");
    }
  });
});
