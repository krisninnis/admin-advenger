import { describe, expect, it } from "vitest";
import {
  ADVISER_PACK_NO_DRAFT_LINE,
  getAdviserExportFilename,
  buildAdviserExportPack,
  renderAdviserExportMarkdown,
} from "../adviserExportPack";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { buildCommunityHelperPack } from "../communityHelperPack";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import type { DecisionResult } from "../decisionEngine/types";
import { goldenLetterFixtures, runGoldenLetterFixture } from "../goldenLetters";
import { buildResultViewModel } from "../resultViewModel";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";
import { buildStrategicNextStepPlan } from "../strategicNextStep";
import { buildWorkplaceSupportPack } from "../workplaceSupportPack";

const ucSanctionText = `Universal Credit sanction decision
To: Jordan Sample
Reference: REF-EXAMPLE-SANCTION-002

We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask for a Mandatory Reconsideration if you disagree.
The letter also says hardship support may be available if you cannot cover food, heating, or rent.`;

const buildUcSanctionPack = () => {
  const decisionResult = analyseDecisionProblem(ucSanctionText);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({ decisionResult, benefitsActionPack });
  const resultViewModel = buildResultViewModel({ decisionResult, benefitsActionPack, strategicNextStepPlan });
  const adviserExportPack = buildAdviserExportPack({
    decisionResult,
    resultViewModel,
    benefitsActionPack,
    strategicNextStepPlan,
  });

  return { decisionResult, benefitsActionPack, strategicNextStepPlan, resultViewModel, adviserExportPack };
};

const workplaceForbiddenPhrases = [
  "employer broke the law",
  "you will win",
  "unfair dismissal proven",
  "discrimination proven",
  "harassment is proven",
  "valid claim",
  "invalid claim",
  "case strength",
  "success chance",
  "win chance",
  "tribunal prediction",
  "compensation owed",
  "you are owed",
  "money saved",
  "money recovered",
  "resign now",
  "refuse the meeting",
  "sign the agreement",
  "do not sign the agreement",
];

const buildWorkplaceAdviserPack = (text: string) => {
  const workplaceSupportPack = buildWorkplaceSupportPack({ text });
  const resultViewModel = buildResultViewModel({ workplaceSupportPack });
  const adviserExportPack = buildAdviserExportPack({
    resultViewModel,
    workplaceSupportPack,
  });
  const markdown = renderAdviserExportMarkdown(adviserExportPack);
  const normalised = normaliseSafetyText(markdown);

  return { workplaceSupportPack, resultViewModel, adviserExportPack, markdown, normalised };
};


const communityForbiddenPhrases = [
  "you are diagnosed",
  "this proves disability",
  "this proves neglect",
  "safeguarding issue confirmed",
  "risk score",
  "care score",
  "eligibility score",
  "they qualify",
  "council must provide",
  "needs this equipment",
  "needs this adaptation",
  "cannot live alone",
  "lacks capacity",
  "financial abuse proven",
  "money owed",
  "money saved",
  "money recovered",
  "contacted automatically",
];

const buildCommunityHelperAdviserPack = (
  text: string,
  role: Parameters<typeof buildCommunityHelperPack>[0]["role"] = "helping_someone",
) => {
  const communityHelperPack = buildCommunityHelperPack({ text, role });
  const resultViewModel = buildResultViewModel({ communityHelperPack });
  const adviserExportPack = buildAdviserExportPack({
    resultViewModel,
    communityHelperPack,
  });
  const markdown = renderAdviserExportMarkdown(adviserExportPack);
  const normalised = normaliseSafetyText(markdown);

  return { communityHelperPack, resultViewModel, adviserExportPack, markdown, normalised };
};

const expectNoForbiddenCommunityMarkdown = (markdown: string) => {
  const normalised = normaliseSafetyText(markdown);

  for (const phrase of communityForbiddenPhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
};

const expectNoForbiddenWorkplaceMarkdown = (markdown: string) => {
  const normalised = normaliseSafetyText(markdown);

  for (const phrase of workplaceForbiddenPhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
};

describe("Adviser Export Pack v1 - UC sanction", () => {
  it("routes to the UC sanction engine", () => {
    const { decisionResult } = buildUcSanctionPack();

    expect(decisionResult.documentType).toBe("benefits_uc_sanction");
  });

  it("includes why this matters, explained cautiously and without predicting an outcome", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.whyThisMatters).not.toBe("");
    expect(adviserExportPack.whyThisMatters.toLowerCase()).toContain("payment");
    expect(findForbiddenSafetyPhrases(adviserExportPack.whyThisMatters)).toEqual([]);
  });

  it("includes confidence as a plain-language statement, not case strength", () => {
    const { adviserExportPack, decisionResult } = buildUcSanctionPack();

    expect(adviserExportPack.confidence.level).toBe(decisionResult.confidence.level);
    expect(adviserExportPack.confidence.statement).not.toBe("");
    expect(normaliseSafetyText(adviserExportPack.confidence.statement)).not.toContain("case strength");
    expect(normaliseSafetyText(adviserExportPack.confidence.statement)).not.toMatch(/^(high|medium|low)$/);
  });

  it("includes uncertainty and does not hide it in a details-only section", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.uncertainty.length).toBeGreaterThan(0);
    expect(findForbiddenSafetyPhrases(adviserExportPack.uncertainty.join(" "))).toEqual([]);
  });

  it("includes cannotKnow", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.cannotKnow.length).toBeGreaterThan(0);
  });

  it("includes a route-to-check / what may happen next section covering the known route", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const route = normaliseSafetyText(adviserExportPack.routeToCheck.join(" "));

    expect(adviserExportPack.routeToCheck.length).toBeGreaterThan(0);
    expect(route).toContain("decision date");
    expect(route).toContain("reason");
    expect(route).toContain("mandatory reconsideration");
    expect(route).toContain("hardship");
    expect(route).toContain("check this against the original letter");
    expect(findForbiddenSafetyPhrases(adviserExportPack.routeToCheck.join(" "))).toEqual([]);
  });

  it("includes the draft/checklist the engine already generates, with a review warning", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.draft.included).toBe(true);
    expect(adviserExportPack.draft.body).toBeTruthy();
    expect(adviserExportPack.draft.reviewWarning).not.toBe("");
  });

  it("always includes the required safety lines", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const notes = adviserExportPack.safetyNotes.map((note) => normaliseSafetyText(note));

    expect(notes.some((note) => note.includes("preparation only"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been sent"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been submitted"))).toBe(true);
    expect(notes.some((note) => note === "adminavenger helps prepare. you stay in control.")).toBe(true);
    expect(notes.some((note) => note.includes("not legal, benefits, debt, financial, or immigration advice"))).toBe(true);
    expect(notes.some((note) => note.includes("checked against the original letter"))).toBe(true);
    expect(notes.some((note) => note.includes("display-only"))).toBe(true);
  });

  it("contains none of the forbidden wording for this feature", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const allText = [
      adviserExportPack.whyThisMatters,
      adviserExportPack.confidence.statement,
      ...adviserExportPack.uncertainty,
      ...adviserExportPack.cannotKnow,
      ...adviserExportPack.routeToCheck,
      adviserExportPack.draft.body ?? "",
      ...adviserExportPack.safetyNotes,
    ].join(" ");
    const normalised = normaliseSafetyText(allText);

    for (const phrase of [
      "you should appeal",
      "you must appeal",
      "dwp is wrong",
      "you will win",
      "you qualify",
      "case strength",
      "valid claim",
      "invalid claim",
      "you are owed",
    ]) {
      expect(normalised).not.toContain(phrase);
    }

    expect(findForbiddenSafetyPhrases(allText)).toEqual([]);
  });

  it("renders Markdown with all required adviser pack sections", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);

    expect(markdown).toContain("# AdminAvenger adviser pack");
    expect(markdown).toContain("This pack is for preparation only");
    expect(markdown).toContain("Generated: Date not stored in this pack");
    expect(markdown).toContain("## What this appears to be");
    expect(markdown).toContain("## Why this matters");
    expect(markdown).toContain("## Confidence");
    expect(markdown).toContain("## Uncertainty");
    expect(markdown).toContain("## What may happen next / route to check");
    expect(markdown).toContain("## Key dates to check");
    expect(markdown).toContain("## Money mentioned, display-only");
    expect(markdown).toContain("## Evidence/documents to bring");
    expect(markdown).toContain("## Questions to answer");
    expect(markdown).toContain("## What AdminAvenger cannot know");
    expect(markdown).toContain("## Draft/checklist");
    expect(markdown).toContain("## Footer");
  });

  it("renders Markdown safety boundaries, cannotKnow, and uncertainty", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);
    const normalised = normaliseSafetyText(markdown);

    expect(markdown).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(markdown).toContain("AdminAvenger does not contact anyone for you.");
    expect(markdown).toContain("Nothing has been sent or submitted by AdminAvenger.");
    expect(markdown).toContain("This is not legal, benefits, debt, financial, or immigration advice.");
    expect(normalised).toContain("whether dwp will accept your reason");
    expect(normalised).toContain("good reason");
    expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
  });

  it("renders dates as check-against-original-letter and money as display-only", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);
    const normalised = normaliseSafetyText(markdown);

    expect(normalised).toContain("check against original letter");
    expect(normalised).toContain("display-only");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("you are owed");
  });

  it("uses a privacy-safe filename", () => {
    const filename = getAdviserExportFilename();

    expect(filename).toBe("adminavenger-adviser-pack.md");
    expect(filename).not.toMatch(/universal|credit|sanction|dwp|jordan|sample|ref|gbp|£|\d/iu);
  });
});

describe("Adviser Export Pack v1 - draft/checklist handling", () => {
  const baseDecisionResult: DecisionResult = {
    documentType: "unknown_admin_dispute",
    title: "Admin document check",
    plainEnglishSummary: "This looks like a general admin message that needs a careful check.",
    caseStrength: "not_enough_information",
    strengthLabel: "Needs more information",
    whatThisLooksLike: "A general message without enough detail to say more.",
    possibleGrounds: [],
    confidence: { level: "low", reason: "There was not enough text to be confident about the read." },
    uncertainty: ["It is unclear what this message is asking for."],
    cannotKnow: ["AdminAvenger cannot know what the sender intended beyond this text."],
    evidenceNeeded: [],
    deadlines: [],
    risks: [],
    nextSteps: [],
    safetyNotes: [],
    amountTreatment: "no_money_counted",
    sourceFacts: [],
  };

  it("shows an explicit 'no draft was included' line when the engine has no draft or next steps to build one from", () => {
    const benefitsActionPack = buildBenefitsActionPack(baseDecisionResult);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: baseDecisionResult,
      benefitsActionPack,
    });
    const resultViewModel = buildResultViewModel({
      decisionResult: baseDecisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
    });
    const adviserExportPack = buildAdviserExportPack({
      decisionResult: baseDecisionResult,
      resultViewModel,
      benefitsActionPack,
      strategicNextStepPlan,
    });

    expect(adviserExportPack.draft.included).toBe(false);
    expect(adviserExportPack.draft.noDraftLine).toBe(ADVISER_PACK_NO_DRAFT_LINE);
    expect(adviserExportPack.draft.body).toBeUndefined();
    expect(renderAdviserExportMarkdown(adviserExportPack)).toContain(ADVISER_PACK_NO_DRAFT_LINE);
  });
});

describe("Adviser Export Pack v1 - golden corpus Markdown", () => {
  const selectedFixtureIds = [
    "benefits-uc-sanction-001",
    "debt-collection-001",
    "consumer-refund-refusal-001",
    "unknown-official-letter-001",
  ];
  const selectedRuns = selectedFixtureIds.map((id) =>
    runGoldenLetterFixture(goldenLetterFixtures.find((fixture) => fixture.id === id)!),
  );

  it.each(selectedRuns)("$fixture.id renders safe adviser Markdown", (run) => {
    const markdown = renderAdviserExportMarkdown(run.adviserExportPack);

    expect(markdown).toContain("# AdminAvenger adviser pack");
    expect(markdown).toContain("## What AdminAvenger cannot know");
    expect(markdown).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(markdown).toContain("Nothing has been sent or submitted by AdminAvenger.");
    expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
    expect(normaliseSafetyText(markdown)).not.toContain("case strength");
  });
});


describe("Adviser Export Pack v1 - community helper support", () => {
  const missedLettersText =
    "My uncle missed several letters and missed the deadline for an appointment.";

  const otText =
    "We need to prepare notes for an occupational therapist visit because Mum struggles with letters, daily routine, stairs, bathing, and explaining what happens at home.";

  const urgentText =
    "I am worried someone may be in immediate danger at home and there are concerns about abuse and neglect.";

  const financialText =
    "My friend is vulnerable and confused about bank card use, bills, missing payments, and someone else controlling money.";

  it("accepts optional communityHelperPack input", () => {
    const { communityHelperPack, adviserExportPack, markdown, normalised } =
      buildCommunityHelperAdviserPack(missedLettersText);

    expect(communityHelperPack.situationType).toBe("missed_letters_or_deadlines");
    expect(adviserExportPack.documentType).toBe("missed_letters_or_deadlines");
    expect(adviserExportPack.communityHelperPack).toBe(communityHelperPack);
    expect(markdown).toContain("## Community support preparation pack");
    expect(normalised).toContain("community support preparation pack");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control.");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("renders community helper preparation sections safely", () => {
    const { markdown, normalised } = buildCommunityHelperAdviserPack(missedLettersText);

    expect(markdown).toContain("### What this appears to be about");
    expect(markdown).toContain("### Daily-life, admin, or communication impact");
    expect(markdown).toContain("### Key facts to check");
    expect(markdown).toContain("### Evidence/context to gather");
    expect(markdown).toContain("### Questions to ask");
    expect(markdown).toContain("### Consent and control notes");
    expect(markdown).toContain("### Human support/signposting");
    expect(normalised).toContain("this is preparation only, not a professional assessment");
    expect(normalised).toContain("adminavenger cannot decide care needs");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("OT or support visit export does not recommend equipment or adaptations", () => {
    const { communityHelperPack, markdown, normalised } = buildCommunityHelperAdviserPack(otText);

    expect(communityHelperPack.situationType).toBe("ot_or_support_visit_preparation");
    expect(normalised).toContain("occupational therapist");
    expect(normalised).not.toContain("needs this equipment");
    expect(normalised).not.toContain("needs this adaptation");
    expect(normalised).not.toContain("council must provide");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("urgent safeguarding-like export signposts without deciding safeguarding", () => {
    const { communityHelperPack, markdown, normalised } = buildCommunityHelperAdviserPack(urgentText);

    expect(communityHelperPack.situationType).toBe("urgent_safeguarding_like_signpost");
    expect(normalised).toContain("emergency services");
    expect(normalised).toContain("adminavenger cannot decide safeguarding concerns");
    expect(normalised).not.toContain("safeguarding issue confirmed");
    expect(normalised).not.toContain("risk score");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("financial admin concern export stays factual and non-accusatory", () => {
    const { communityHelperPack, markdown, normalised } = buildCommunityHelperAdviserPack(financialText);

    expect(communityHelperPack.situationType).toBe("vulnerability_financial_admin_concern");
    expect(normalised).toContain("financial admin concerns should be written as observed facts");
    expect(normalised).not.toContain("financial abuse proven");
    expect(normalised).not.toContain("money owed");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("money recovered");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("keeps consent and control notes visible", () => {
    const { markdown, normalised } = buildCommunityHelperAdviserPack(missedLettersText);

    expect(markdown).toContain("### Consent and control notes");
    expect(normalised).toContain("keep the person involved");
    expect(normalised).toContain("does not give authority to act for someone");
    expectNoForbiddenCommunityMarkdown(markdown);
  });

  it("has no forbidden community helper wording across community adviser exports", () => {
    for (const text of [missedLettersText, otText, urgentText, financialText]) {
      const { markdown } = buildCommunityHelperAdviserPack(text);

      expectNoForbiddenCommunityMarkdown(markdown);
    }
  });

  it("keeps existing non-community adviser export unchanged when no communityHelperPack is supplied", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.communityHelperPack).toBeUndefined();
    expect(renderAdviserExportMarkdown(adviserExportPack)).not.toContain("## Community support preparation pack");
    expect(adviserExportPack.documentType).toBe("benefits_uc_sanction");
  });
});

describe("Adviser Export Pack v1 - workplace support", () => {
  const disciplinaryText = `Example Works HR
Reference: REF-EXAMPLE-WORK-001

You are invited to a disciplinary meeting on 14 September 2026 about an allegation of misconduct.
The meeting will be chaired by Morgan Sample. You may bring a workplace companion.
Please review the investigation notes before the meeting.`;

  const payText = `Example Works Payroll
Reference: REF-EXAMPLE-WORK-006

Your payslip shows a deduction of GBP 75.00 for the September pay period.
Please contact payroll if you have questions about wages, overtime, or holiday pay.`;

  const settlementText = `Example Works HR
Reference: REF-EXAMPLE-WORK-012

The attached settlement agreement is sent without prejudice.
It mentions a COT3 route and asks Alex Example to reply by 30 September 2026.`;

  const resignationText = `Example Works message
Reference: REF-EXAMPLE-WORK-013

I am thinking about resignation after a contract change and may resign or quit next week.
I want to organise questions before I speak to someone trusted.`;

  const bullyingText = `Example workplace notes
Reference: REF-EXAMPLE-WORK-009

I want to prepare a record of bullying and harassment incidents in the team chat.
There were messages on 4 September 2026 and a witness called Jordan Sample.`;

  const unknownWorkplaceText = `Example Works message
Reference: REF-EXAMPLE-WORK-011

Please read the attached workplace update and bring any questions to your manager.
The message is short and does not explain the process.`;

  it("accepts optional workplaceSupportPack input", () => {
    const { adviserExportPack, workplaceSupportPack, markdown } = buildWorkplaceAdviserPack(disciplinaryText);

    expect(workplaceSupportPack.documentType).toBe("disciplinary_invite");
    expect(adviserExportPack.documentType).toBe("disciplinary_invite");
    expect(adviserExportPack.workplaceSupportPack).toBe(workplaceSupportPack);
    expect(markdown).toContain("## Workplace preparation pack");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("disciplinary invite export includes workplace preparation sections safely", () => {
    const { markdown, normalised } = buildWorkplaceAdviserPack(disciplinaryText);

    expect(markdown).toContain("### What this appears to be about");
    expect(markdown).toContain("### Key facts to check");
    expect(markdown).toContain("### Evidence to gather");
    expect(markdown).toContain("### Questions to ask");
    expect(markdown).toContain("### Human support/signposting");
    expect(normalised).toContain("this is preparation only, not legal or employment advice");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control.");
    expect(normalised).toContain("acas");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("wage or pay export does not say money is owed, saved, or recovered", () => {
    const { workplaceSupportPack, markdown, normalised } = buildWorkplaceAdviserPack(payText);

    expect(workplaceSupportPack.documentType).toBe("wage_deduction_or_pay_issue");
    expect(normalised).toContain("pay or wage amounts are facts to check only");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("money recovered");
    expect(normalised).not.toContain("you are owed");
    expect(normalised).not.toContain("compensation owed");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("settlement agreement export includes human-review warning and no signing advice", () => {
    const { workplaceSupportPack, adviserExportPack, markdown, normalised } =
      buildWorkplaceAdviserPack(settlementText);

    expect(workplaceSupportPack.documentType).toBe("settlement_agreement_signpost");
    expect(adviserExportPack.draft.included).toBe(false);
    expect(markdown).toContain(ADVISER_PACK_NO_DRAFT_LINE);
    expect(normalised).toContain("do not rely on adminavenger to decide what to do with a settlement agreement");
    expect(normalised).toContain("qualified adviser");
    expect(normalised).not.toContain("good deal");
    expect(normalised).not.toContain("bad deal");
    expect(normalised).not.toContain("sign the agreement");
    expect(normalised).not.toContain("do not sign the agreement");
    expect(normalised).not.toContain("compensation owed");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("resignation warning remains neutral and signposted", () => {
    const { markdown, normalised } = buildWorkplaceAdviserPack(resignationText);

    expect(normalised).toContain("get advice before making a resignation decision");
    expect(normalised).not.toContain("you should resign");
    expect(normalised).not.toContain("you should not resign");
    expect(normalised).not.toContain("resign now");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("bullying or harassment prep does not say discrimination or harassment is proven", () => {
    const { workplaceSupportPack, markdown, normalised } = buildWorkplaceAdviserPack(bullyingText);

    expect(workplaceSupportPack.documentType).toBe("bullying_or_harassment_record_prep");
    expect(normalised).toContain("timeline");
    expect(normalised).toContain("screenshots");
    expect(normalised).not.toContain("discrimination proven");
    expect(normalised).not.toContain("harassment is proven");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("unknown workplace pack remains conservative", () => {
    const { workplaceSupportPack, markdown, normalised } = buildWorkplaceAdviserPack(unknownWorkplaceText);

    expect(workplaceSupportPack.documentType).toBe("workplace_unknown");
    expect(normalised).toContain("workplace admin preparation");
    expect(normalised).toContain("not clear");
    expect(normalised).toContain("someone trusted");
    expectNoForbiddenWorkplaceMarkdown(markdown);
  });

  it("has no forbidden workplace wording across workplace adviser exports", () => {
    for (const text of [
      disciplinaryText,
      payText,
      settlementText,
      resignationText,
      bullyingText,
      unknownWorkplaceText,
    ]) {
      const { markdown } = buildWorkplaceAdviserPack(text);

      expectNoForbiddenWorkplaceMarkdown(markdown);
    }
  });

  it("keeps existing non-workplace adviser export unchanged when no workplaceSupportPack is supplied", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.workplaceSupportPack).toBeUndefined();
    expect(renderAdviserExportMarkdown(adviserExportPack)).not.toContain("## Workplace preparation pack");
    expect(adviserExportPack.documentType).toBe("benefits_uc_sanction");
  });
});
