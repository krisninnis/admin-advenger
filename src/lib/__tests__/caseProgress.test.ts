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
import { buildCommunityHelperPack } from "../communityHelperPack";
import { buildWorkplaceSupportPack } from "../workplaceSupportPack";

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

const DISCIPLINARY_TEXT = `Example Works HR
Reference: REF-EXAMPLE-WORK-001

You are invited to a disciplinary meeting on 14 September 2026 about an allegation of misconduct.
The meeting will be chaired by Morgan Sample. You may bring a workplace companion.
Please review the investigation notes before the meeting.`;

const PAY_TEXT = `Example Works Payroll
Reference: REF-EXAMPLE-WORK-006

Your payslip shows a deduction of GBP 75.00 for the September pay period.
Please contact payroll if you have questions about wages, overtime, or holiday pay.`;

const SETTLEMENT_TEXT = `Example Works HR
Reference: REF-EXAMPLE-WORK-012

The attached settlement agreement is sent without prejudice.
It mentions a COT3 route and asks Alex Example to reply by 30 September 2026.`;

const RESIGNATION_TEXT = `Example Works message
Reference: REF-EXAMPLE-WORK-013

I am thinking about resignation after a contract change and may resign or quit next week.
I want to organise questions before I speak to someone trusted.`;

const BULLYING_TEXT = `Example workplace notes
Reference: REF-EXAMPLE-WORK-009

I want to prepare a record of bullying and harassment incidents in the team chat.
There were messages on 4 September 2026 and a witness called Jordan Sample.`;

const UNKNOWN_WORKPLACE_TEXT = `Example Works message
Reference: REF-EXAMPLE-WORK-011

Please read the attached workplace update and bring any questions to your manager.
The message is short and does not explain the process.`;

const COMMUNITY_MISSED_LETTERS_TEXT =
  "My uncle missed several letters and missed the deadline for an appointment.";

const COMMUNITY_OT_TEXT =
  "We need to prepare notes for an occupational therapist visit because Mum struggles with letters, daily routine, stairs, bathing, and explaining what happens at home.";

const COMMUNITY_URGENT_TEXT =
  "I am worried someone may be in immediate danger at home and there are concerns about abuse and neglect.";

const COMMUNITY_FINANCIAL_TEXT =
  "My friend is vulnerable and confused about bank card use, bills, missing payments, and someone else controlling money.";

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

const buildWorkplaceArtifacts = (text: string) => {
  const workplaceSupportPack = buildWorkplaceSupportPack({ text });
  const resultViewModel = buildResultViewModel({ workplaceSupportPack });
  const summary = buildCaseProgress({ resultViewModel, workplaceSupportPack });
  const flatText = flattenCaseProgressText(summary);
  const normalised = normaliseSafetyText(flatText);

  return { workplaceSupportPack, resultViewModel, summary, flatText, normalised };
};


const buildCommunityHelperArtifacts = (
  text: string,
  role?: Parameters<typeof buildCommunityHelperPack>[0]["role"],
) => {
  const communityHelperPack = buildCommunityHelperPack({ text, role });
  const resultViewModel = buildResultViewModel({ communityHelperPack });
  const summary = buildCaseProgress({ resultViewModel, communityHelperPack });
  const flatText = flattenCaseProgressText(summary);
  const normalised = normaliseSafetyText(flatText);

  return { communityHelperPack, resultViewModel, summary, flatText, normalised };
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
  "win chance",
  "success chance",
  "employer broke the law",
  "unfair dismissal proven",
  "discrimination proven",
  "harassment is proven",
  "compensation owed",
  "tribunal prediction",
  "you should resign",
  "refuse the meeting",
  "sign the agreement",
  "do not sign the agreement",
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

  it("accepts an optional workplaceSupportPack input", () => {
    const { workplaceSupportPack, summary, normalised } = buildWorkplaceArtifacts(DISCIPLINARY_TEXT);

    expect(workplaceSupportPack.documentType).toBe("disciplinary_invite");
    expect(summary.items.map((item) => item.id)).toContain("workplace-evidence-checklist");
    expect(normalised).toContain("workplace");
    expect(normalised).toContain("preparation");
    expectNoForbiddenWording(summary);
  });

  it("disciplinary invite creates workplace preparation items safely", () => {
    const { summary, normalised } = buildWorkplaceArtifacts(DISCIPLINARY_TEXT);
    const ids = summary.items.map((item) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "original-source",
        "workplace-date-time-location",
        "workplace-questions-prepared",
        "workplace-meeting-details",
        "workplace-meeting-reason",
        "workplace-support-option",
      ]),
    );
    expect(normalised).toContain("check against the original letter/message");
    expect(normalised).toContain("questions prepared");
    expectNoForbiddenWording(summary);
  });

  it("pay or wage issue treats money as something to check only", () => {
    const { workplaceSupportPack, summary, normalised } = buildWorkplaceArtifacts(PAY_TEXT);

    expect(workplaceSupportPack.documentType).toBe("wage_deduction_or_pay_issue");
    expect(summary.items.map((item) => item.id)).toContain("workplace-pay-evidence");
    expect(normalised).toContain("any amount is only something to check");
    expect(normalised).toContain("amounts are display-only");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("money recovered");
    expect(normalised).not.toContain("you are owed");
    expectNoForbiddenWording(summary);
  });

  it("settlement agreement pack creates human-review items without signing advice", () => {
    const { workplaceSupportPack, summary, normalised } = buildWorkplaceArtifacts(SETTLEMENT_TEXT);

    expect(workplaceSupportPack.documentType).toBe("settlement_agreement_signpost");
    expect(summary.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["workplace-human-advice-route", "workplace-reviewed-with-adviser"]),
    );
    expect(normalised).toContain(
      normaliseSafetyText(
        "Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser before relying on any next step.",
      ),
    );
    expect(normalised).toContain("document reviewed with a suitable human adviser");
    expect(normalised).not.toContain("sign the agreement");
    expect(normalised).not.toContain("do not sign");
    expect(normalised).not.toContain("compensation owed");
    expectNoForbiddenWording(summary);
  });

  it("resignation warning creates a neutral human-advice item", () => {
    const { summary, normalised } = buildWorkplaceArtifacts(RESIGNATION_TEXT);

    expect(summary.items.map((item) => item.id)).toContain("workplace-resignation-human-advice");
    expect(normalised).toContain("get advice before making a resignation decision");
    expect(normalised).not.toContain("you should resign");
    expect(normalised).not.toContain("you should not resign");
    expect(normalised).not.toContain("resign now");
    expectNoForbiddenWording(summary);
  });

  it("bullying or harassment prep avoids proof language", () => {
    const { workplaceSupportPack, summary, normalised } = buildWorkplaceArtifacts(BULLYING_TEXT);

    expect(workplaceSupportPack.documentType).toBe("bullying_or_harassment_record_prep");
    expect(summary.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["workplace-incident-timeline", "workplace-incident-evidence"]),
    );
    expect(normalised).toContain("timeline");
    expect(normalised).not.toContain("discrimination proven");
    expect(normalised).not.toContain("harassment is proven");
    expectNoForbiddenWording(summary);
  });

  it("unknown workplace pack stays conservative", () => {
    const { workplaceSupportPack, summary, normalised } = buildWorkplaceArtifacts(UNKNOWN_WORKPLACE_TEXT);

    expect(workplaceSupportPack.documentType).toBe("workplace_unknown");
    expect(summary.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "original-source",
        "workplace-date-time-location",
        "workplace-contact-details",
        "workplace-evidence-checklist",
        "workplace-questions-prepared",
        "trusted-check",
      ]),
    );
    expect(normalised).toContain("someone trusted");
    expectNoForbiddenWording(summary);
  });

  it("has no forbidden workplace wording across workplace progress outputs", () => {
    const workplaceTexts = [
      DISCIPLINARY_TEXT,
      PAY_TEXT,
      SETTLEMENT_TEXT,
      RESIGNATION_TEXT,
      BULLYING_TEXT,
      UNKNOWN_WORKPLACE_TEXT,
    ];

    for (const text of workplaceTexts) {
      const { summary } = buildWorkplaceArtifacts(text);

      expectNoForbiddenWording(summary);
    }
  });


  it("accepts an optional communityHelperPack input", () => {
    const { communityHelperPack, summary, normalised } = buildCommunityHelperArtifacts(
      COMMUNITY_MISSED_LETTERS_TEXT,
      "helping_someone",
    );
    const ids = summary.items.map((item) => item.id);

    expect(communityHelperPack.situationType).toBe("missed_letters_or_deadlines");
    expect(ids).toEqual(
      expect.arrayContaining([
        "community-helper-situation-type",
        "community-helper-daily-impact",
        "community-helper-key-facts",
        "community-helper-evidence-context",
        "community-helper-questions-prepared",
        "community-helper-consent-control",
        "community-helper-support-route",
      ]),
    );
    expect(normalised).toContain("community helper");
    expect(normalised).toContain("preparation");
    expect(normalised).toContain("does not predict the outcome");
    expectNoForbiddenWording(summary);
  });

  it("community helper missed letters progress stays preparation-only", () => {
    const { summary, normalised } = buildCommunityHelperArtifacts(COMMUNITY_MISSED_LETTERS_TEXT, "helping_someone");

    expect(summary.label).toMatch(/of \d+ preparation steps complete|no preparation steps apply yet/i);
    expect(normalised).toContain("evidence/context checklist prepared");
    expect(normalised).toContain("questions prepared");
    expect(normalised).not.toContain("eligibility score");
    expect(normalised).not.toContain("risk score");
    expectNoForbiddenWording(summary);
  });

  it("OT or support visit progress does not recommend equipment or adaptations", () => {
    const { communityHelperPack, summary, normalised } = buildCommunityHelperArtifacts(
      COMMUNITY_OT_TEXT,
      "helping_someone",
    );

    expect(communityHelperPack.situationType).toBe("ot_or_support_visit_preparation");
    expect(summary.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "community-helper-key-facts",
        "community-helper-evidence-context",
        "community-helper-questions-prepared",
      ]),
    );
    expect(normalised).not.toContain("needs this equipment");
    expect(normalised).not.toContain("needs this adaptation");
    expect(normalised).not.toContain("council must provide");
    expectNoForbiddenWording(summary);
  });

  it("urgent safeguarding-like progress signposts without deciding safeguarding", () => {
    const { communityHelperPack, summary, normalised } = buildCommunityHelperArtifacts(
      COMMUNITY_URGENT_TEXT,
      "helping_someone",
    );

    expect(communityHelperPack.situationType).toBe("urgent_safeguarding_like_signpost");
    expect(summary.items.map((item) => item.id)).toContain("community-helper-urgent-route");
    expect(normalised).toContain("emergency services");
    expect(normalised).toContain("adminavenger cannot decide safeguarding concerns");
    expect(normalised).not.toContain("safeguarding issue confirmed");
    expect(normalised).not.toContain("risk score");
    expectNoForbiddenWording(summary);
  });

  it("financial admin concern progress stays factual and non-accusatory", () => {
    const { communityHelperPack, summary, normalised } = buildCommunityHelperArtifacts(
      COMMUNITY_FINANCIAL_TEXT,
      "helping_someone",
    );

    expect(communityHelperPack.situationType).toBe("vulnerability_financial_admin_concern");
    expect(summary.items.map((item) => item.id)).toContain("community-helper-financial-facts");
    expect(normalised).toContain("financial admin facts separated from assumptions");
    expect(normalised).not.toContain("financial abuse proven");
    expect(normalised).not.toContain("money owed");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("money recovered");
    expectNoForbiddenWording(summary);
  });

  it("has no forbidden community helper wording across community progress outputs", () => {
    const communityFixtures = [
      COMMUNITY_MISSED_LETTERS_TEXT,
      COMMUNITY_OT_TEXT,
      COMMUNITY_URGENT_TEXT,
      COMMUNITY_FINANCIAL_TEXT,
    ];

    for (const text of communityFixtures) {
      const { summary } = buildCommunityHelperArtifacts(text, "helping_someone");

      expectNoForbiddenWording(summary);
      expect(findForbiddenSafetyPhrases(flattenCaseProgressText(summary))).toEqual([]);
    }
  });

  it("keeps existing non-workplace progress unchanged when no workplaceSupportPack is supplied", () => {
    const artifacts = buildArtifacts(DEBT_TEXT);
    const summary = buildCaseProgress(artifacts);

    expect(summary.items.map((item) => item.id)).toEqual([
      "original-source",
      "key-date",
      "money-reference",
      "evidence-gathered",
      "draft-reviewed",
      "adviser-pack",
      "trusted-check",
    ]);
    expect(summary.items.some((item) => item.id.startsWith("workplace-"))).toBe(false);
    expectNoForbiddenWording(summary);
  });
});
