import { describe, expect, it } from "vitest";
import {
  buildWorkplaceSupportPack,
  flattenWorkplaceSupportPackText,
  type WorkplaceSupportDocumentType,
} from "../workplaceSupportPack";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";

const examples: Array<{
  name: string;
  expectedType: WorkplaceSupportDocumentType;
  text: string;
  expectedText: string[];
}> = [
  {
    name: "disciplinary invite",
    expectedType: "disciplinary_invite",
    expectedText: ["Disciplinary meeting preparation", "companion", "documents"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-001

You are invited to a disciplinary meeting on 14 September 2026 about an allegation of misconduct.
The meeting will be chaired by Morgan Sample. You may bring a workplace companion.
Please review the investigation notes before the meeting.`,
  },
  {
    name: "grievance outcome",
    expectedType: "grievance_outcome",
    expectedText: ["Grievance outcome preparation", "review route", "evidence"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-002

Your grievance outcome is attached. The decision is dated 18 September 2026.
The letter explains the issues considered and says you may request a review within seven days.`,
  },
  {
    name: "sickness absence meeting",
    expectedType: "sickness_absence_meeting",
    expectedText: ["Sickness absence meeting preparation", "occupational health", "health"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-003

You are invited to a sickness absence review meeting on 20 September 2026.
The manager would like to discuss your fit notes, occupational health report, and return to work support.`,
  },
  {
    name: "capability meeting",
    expectedType: "capability_meeting",
    expectedText: ["Capability or performance meeting preparation", "performance", "support"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-004

You are invited to a capability meeting about performance improvement plan actions.
Please bring any training records and examples of support requested.`,
  },
  {
    name: "redundancy consultation",
    expectedType: "redundancy_consultation",
    expectedText: ["Redundancy consultation preparation", "selection criteria", "consultation"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-005

Your role is at risk of redundancy. A consultation meeting is scheduled for 22 September 2026.
The letter mentions the selection pool, alternative roles, and consultation questions.`,
  },
  {
    name: "wage deduction or pay issue",
    expectedType: "wage_deduction_or_pay_issue",
    expectedText: ["Pay issue preparation", "payslip", "display-only"],
    text: `Example Works Payroll
Reference: REF-EXAMPLE-WORK-006

Your payslip shows a deduction of GBP 75.00 for the September pay period.
Please contact payroll if you have questions about wages, overtime, or holiday pay.`,
  },
  {
    name: "contract or rota change",
    expectedType: "contract_or_rota_change",
    expectedText: ["Contract or rota change preparation", "working pattern", "current contract"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-007

We are proposing a contract change to your hours and rota from 1 October 2026.
Your shift pattern may move to evenings. Please send questions to HR.`,
  },
  {
    name: "dismissal letter",
    expectedType: "dismissal_letter",
    expectedText: ["Dismissal letter preparation", "review route", "human advice"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-008

This dismissal letter confirms your employment has ended on 25 September 2026.
The letter mentions final pay, notice pay, and a review route.`,
  },
  {
    name: "bullying or harassment record prep",
    expectedType: "bullying_or_harassment_record_prep",
    expectedText: ["Workplace incident record preparation", "timeline", "trusted person"],
    text: `Example workplace notes
Reference: REF-EXAMPLE-WORK-009

I want to prepare a record of bullying and harassment incidents in the team chat.
There were messages on 4 September 2026 and a witness called Jordan Sample.`,
  },
  {
    name: "workplace investigation invite",
    expectedType: "workplace_investigation_invite",
    expectedText: ["Workplace investigation preparation", "witness", "documents"],
    text: `Example Works HR
Reference: REF-EXAMPLE-WORK-010

You are invited to an investigation meeting on 28 September 2026 as a witness.
The investigator will ask about the rota change and documents listed in the invite.`,
  },
  {
    name: "unknown workplace issue",
    expectedType: "workplace_unknown",
    expectedText: ["Workplace admin preparation", "not clear", "original message"],
    text: `Example Works message
Reference: REF-EXAMPLE-WORK-011

Please read the attached workplace update and bring any questions to your manager.
The message is short and does not explain the process.`,
  },
];

const forbiddenSubstrings = [
  "employer broke the law",
  "you will win",
  "unfair dismissal proven",
  "discrimination proven",
  "valid claim",
  "invalid claim",
  "case strength",
  "success chance",
  "tribunal prediction",
  "compensation owed",
  "you are owed",
  "submit a tribunal claim",
  "legal threat",
  "we contacted",
  "submitted automatically",
];

const expectSafePack = (text: string) => {
  const pack = buildWorkplaceSupportPack({ text });
  const flatText = flattenWorkplaceSupportPackText(pack);
  const normalised = normaliseSafetyText(flatText);

  expect(findForbiddenSafetyPhrases(flatText)).toEqual([]);
  expect(normalised).toContain("preparation");
  expect(normalised).toContain("adminavenger has not contacted anyone");
  expect(pack.cannotKnow.length).toBeGreaterThan(0);
  expect(pack.signposting.join(" ")).toMatch(/ACAS|union|HR|Citizens Advice|adviser|trusted/i);

  for (const forbidden of forbiddenSubstrings) {
    expect(normalised).not.toContain(normaliseSafetyText(forbidden));
  }

  return { pack, flatText, normalised };
};

describe("buildWorkplaceSupportPack", () => {
  it.each(examples)("builds $name pack safely", ({ expectedType, text, expectedText }) => {
    const { pack, normalised } = expectSafePack(text);

    expect(pack.documentType).toBe(expectedType);

    for (const expected of expectedText) {
      expect(normalised).toContain(normaliseSafetyText(expected));
    }
  });

  it("settlement agreement mention triggers hard signposting without a response draft", () => {
    const { pack, normalised } = expectSafePack(`Example Works HR
Reference: REF-EXAMPLE-WORK-012

The attached settlement agreement is sent without prejudice.
It mentions a COT3 route and asks Alex Example to reply by 30 September 2026.`);

    expect(pack.documentType).toBe("settlement_agreement_signpost");
    expect(normalised).toContain("do not rely on adminavenger for a signing decision");
    expect(normalised).toContain("qualified adviser");
    expect(normalised).not.toContain("good deal");
    expect(normalised).not.toContain("bad deal");
    expect(normalised).not.toContain("do not sign");
    expect(normalised).not.toContain("accept the offer");
    expect(normalised).not.toContain("reject the offer");
  });

  it("resignation mention triggers a risk warning without advice", () => {
    const { pack, normalised } = expectSafePack(`Example Works message
Reference: REF-EXAMPLE-WORK-013

I am thinking about resignation after a contract change and may resign or quit next week.
I want to organise questions before I speak to someone trusted.`);

    expect(pack.riskWarnings.join(" ")).toContain("Resignation decisions can have serious consequences");
    expect(normalised).not.toContain("you should resign");
    expect(normalised).not.toContain("you should not resign");
    expect(normalised).not.toContain("resign now");
  });

  it("keeps draft and checklist boundaries preparation-only", () => {
    const { pack, normalised } = expectSafePack(examples[0].text);

    expect(pack.draftBoundaryNotes.join(" ")).toContain("meeting preparation notes");
    expect(normalised).toContain("review and edit");
    expect(normalised).not.toContain("tribunal claim text");
    expect(normalised).not.toContain("resignation letter");
    expect(normalised).not.toContain("compensation demand");
  });
});
