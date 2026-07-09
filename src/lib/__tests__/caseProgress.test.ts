import { describe, expect, it } from "vitest";
import { buildAdviserExportPack } from "../adviserExportPack";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import {
  buildCaseProgress,
  flattenCaseProgressText,
  type CaseProgressSummary,
} from "../caseProgress";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import { buildResultViewModel } from "../resultViewModel";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";
import { buildStrategicNextStepPlan } from "../strategicNextStep";

const PIP_DECISION_TEXT = `Personal Independence Payment decision
To: Jordan Sample
Reference: REF-EXAMPLE-PIP-004

We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.
The letter mentions daily living and mobility activities.`;

const UC_SANCTION_TEXT = `Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask for a Mandatory Reconsideration if you disagree.
The letter also says hardship support may be available if you cannot cover food, heating, or rent.`;

const PARKING_TEXT = `Parking Charge Notice
To: Jordan Sample
Reference: REF-EXAMPLE-PCN-012

This PCN asks for GBP 100, reduced to GBP 60 if paid within 14 days.
The signs were unclear and the app payment failed.
The notice says POPLA is mentioned on the appeal page.`;

const DEBT_TEXT = `Debt collector letter
To: Alex Example
Reference: REF-EXAMPLE-DEBT-011

Outstanding balance: GBP 480.00.
The account has been passed to collections by Example Credit Services.
Please reply by 31 July 2026 with your reference and any payment plan evidence.
Ask for a clear breakdown if you do not recognise the amount.`;

const SUSPICIOUS_TEXT = `Sender: support@secure-bank-login-example.com
Reply-to: randomhelpdesk@example.net
Subject: Your account will be locked today

Hello Alex Example,
Your account will be locked today. Click this link immediately to verify your bank details and avoid suspension.
Failure to act now may close online access.`;

const UNKNOWN_TEXT = `Official update
To: Jordan Sample
Reference: REF-EXAMPLE-GEN-016

Please see the attached update.
We will write again if more information is needed.
This page does not show the sender, amount, decision, or action requested.`;

const buildArtifacts = (text: string) => {
  const decisionResult = analyseDecisionProblem(text);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({ decisionResult, benefitsActionPack });
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

  return { decisionResult, benefitsActionPack, strategicNextStepPlan, resultViewModel, adviserExportPack };
};

const FORBIDDEN_SUBSTRINGS = [
  "win chance",
  "success score",
  "success likelihood",
  "case strength",
  "appeal strength",
  "legal strength",
  "entitlement score",
  "you will win",
  "you qualify",
  "dwp is wrong",
  "money saved",
  "money recovered",
  "you are owed",
  "valid claim",
  "invalid claim",
  "sent automatically",
  "submitted automatically",
  "game theory",
];

const expectNoForbiddenWording = (summary: CaseProgressSummary) => {
  const text = normaliseSafetyText(flattenCaseProgressText(summary));

  for (const phrase of FORBIDDEN_SUBSTRINGS) {
    expect(text).not.toContain(phrase);
  }

  expect(findForbiddenSafetyPhrases(flattenCaseProgressText(summary))).toEqual([]);
};

describe("buildCaseProgress", () => {
  it("builds a progress summary from ResultViewModel-only input", () => {
    const { resultViewModel } = buildArtifacts(UC_SANCTION_TEXT);
    const summary = buildCaseProgress({ resultViewModel });

    expect(summary.items.length).toBeGreaterThan(0);
    expect(summary.totalRelevant).toBeGreaterThan(0);
    expect(typeof summary.percentComplete).toBe("number");
  });

  it("calculates percentComplete correctly from complete vs relevant items", () => {
    const { resultViewModel, decisionResult, benefitsActionPack, strategicNextStepPlan, adviserExportPack } =
      buildArtifacts(UC_SANCTION_TEXT);
    const summary = buildCaseProgress({
      resultViewModel,
      decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
      adviserExportPack,
    });

    const expectedPercent = Math.round((summary.completeCount / summary.totalRelevant) * 100);

    expect(summary.percentComplete).toBe(expectedPercent);
    expect(summary.completeCount + summary.partialCount + summary.missingCount).toBeLessThanOrEqual(
      summary.items.length,
    );
    expect(
      summary.items.filter((item) => item.status !== "not_needed").length,
    ).toBe(summary.totalRelevant);
  });

  it("uses preparation-completeness language in the progress label", () => {
    const { resultViewModel } = buildArtifacts(DEBT_TEXT);
    const summary = buildCaseProgress({ resultViewModel });

    expect(summary.label).toMatch(/of \d+ preparation steps complete|no preparation steps apply yet/i);
  });

  it("never uses success/outcome/case-strength wording anywhere in the summary", () => {
    const fixtures = [PIP_DECISION_TEXT, UC_SANCTION_TEXT, PARKING_TEXT, DEBT_TEXT, SUSPICIOUS_TEXT, UNKNOWN_TEXT];

    for (const text of fixtures) {
      const artifacts = buildArtifacts(text);
      const summary = buildCaseProgress(artifacts);

      expectNoForbiddenWording(summary);
    }
  });

  it("PIP decision / Mandatory Reconsideration style result includes evidence and preparation items", () => {
    const artifacts = buildArtifacts(PIP_DECISION_TEXT);
    const summary = buildCaseProgress(artifacts);
    const ids = summary.items.map((item) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "original-source",
        "key-date",
        "decision-letter",
        "activities-identified",
        "real-examples",
        "evidence-gathered",
        "draft-reviewed",
        "trusted-check",
      ]),
    );
  });

  it("keeps the unknown/fallback checklist conservative", () => {
    const artifacts = buildArtifacts(UNKNOWN_TEXT);
    const summary = buildCaseProgress(artifacts);
    const ids = summary.items.map((item) => item.id);

    expect(artifacts.decisionResult.documentType).toBe("unknown_admin_dispute");
    expect(ids).toEqual(
      expect.arrayContaining(["original-source", "sender-checked", "do-not-rush-acknowledged", "trusted-check"]),
    );
    expectNoForbiddenWording(summary);
  });

  it("keeps the suspicious-message checklist conservative", () => {
    const artifacts = buildArtifacts(SUSPICIOUS_TEXT);
    const summary = buildCaseProgress(artifacts);

    expect(artifacts.decisionResult.documentType).toBe("unknown_admin_dispute");
    expectNoForbiddenWording(summary);

    const text = normaliseSafetyText(flattenCaseProgressText(summary));
    expect(text).toContain("sender");
  });

  it("never counts money mentioned as saved, recovered, or owed", () => {
    const artifacts = buildArtifacts(PARKING_TEXT);
    const summary = buildCaseProgress(artifacts);
    const moneyItem = summary.items.find((item) => item.id === "money-reference");

    expect(moneyItem).toBeDefined();

    const text = normaliseSafetyText(flattenCaseProgressText(summary));
    expect(text).not.toContain("money saved");
    expect(text).not.toContain("money recovered");
    expect(text).not.toContain("you are owed");
    expect(text).not.toContain("amount owed to you");
  });

  it("has no forbidden safety wording across every family", () => {
    const fixtures = [PIP_DECISION_TEXT, UC_SANCTION_TEXT, PARKING_TEXT, DEBT_TEXT, SUSPICIOUS_TEXT, UNKNOWN_TEXT];

    for (const text of fixtures) {
      const artifacts = buildArtifacts(text);
      const summary = buildCaseProgress(artifacts);

      expect(findForbiddenSafetyPhrases(flattenCaseProgressText(summary))).toEqual([]);
    }
  });

  it("marks status text for every item and never relies on an empty status", () => {
    const artifacts = buildArtifacts(PARKING_TEXT);
    const summary = buildCaseProgress(artifacts);

    for (const item of summary.items) {
      expect(["missing", "partial", "complete", "not_needed"]).toContain(item.status);
      expect(item.label.trim()).not.toBe("");
      expect(item.description.trim()).not.toBe("");
    }
  });
});
