import { describe, expect, it } from "vitest";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { buildCareerSupportPack } from "../careerSupportPack";
import { createAdminCase } from "../caseFactory";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import type { DecisionDocumentType, DecisionResult } from "../decisionEngine/types";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import {
  RESULT_FORBIDDEN_PHRASES,
  buildResultViewModel,
  flattenResultViewModelText,
  normaliseResultText,
  validateResultViewModelSafety,
} from "../resultViewModel";
import { buildStrategicNextStepPlan, type StrategicNextStepPlan } from "../strategicNextStep";
import { buildWorkplaceSupportPack } from "../workplaceSupportPack";
import type { AdminItem } from "../../types";

const makeDecision = (
  documentType: DecisionDocumentType,
  overrides: Partial<DecisionResult> = {},
): DecisionResult => ({
  documentType,
  title: "Benefits letter check",
  plainEnglishSummary: "This appears to be a benefits-related letter that needs checking.",
  caseStrength: "not_enough_information",
  strengthLabel: "Check the letter and evidence",
  whatThisLooksLike: "This appears to be about a benefits process.",
  possibleGrounds: ["The letter mentions a step that may need checking."],
  confidence: {
    level: "medium",
    reason: "The wording matches a benefits letter, but the original letter still needs checking.",
  },
  uncertainty: ["The exact stage may depend on wording elsewhere in the letter."],
  cannotKnow: ["Whether the organisation has all evidence it needs."],
  evidenceNeeded: ["Full letter", "Any supporting evidence mentioned in the letter"],
  deadlines: ["Respond by 12 August 2026 if the letter says this applies."],
  risks: ["Missing a date could make the next step harder."],
  nextSteps: ["Check the date and gather the evidence named in the letter."],
  safetyNotes: ["AdminAvenger helps organise the letter. You decide what happens next."],
  amountMentioned: undefined,
  amountTreatment: "no_money_counted",
  sourceFacts: [
    {
      label: "Letter date",
      value: "12 July 2026",
      sourceQuote: "12 July 2026",
    },
  ],
  questionsToAnswer: ["What date is printed on the letter?"],
  ...overrides,
});

const buildModelForDecision = (decisionResult: DecisionResult) => {
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult,
    benefitsActionPack,
  });

  return buildResultViewModel({
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
};

const expectUniqueText = (items: string[]) => {
  const keys = items.map(normaliseResultText);

  expect(new Set(keys).size).toBe(keys.length);
};

const extractChecklistRequirementBlock = (checklist: string, requirement: string) => {
  const blockStart = `Requirement to compare: ${requirement}`;
  const startIndex = checklist.indexOf(blockStart);

  expect(startIndex).toBeGreaterThanOrEqual(0);

  const nextRequirementIndex = checklist.indexOf("\nRequirement to compare:", startIndex + blockStart.length);

  return checklist
    .slice(startIndex, nextRequirementIndex === -1 ? undefined : nextRequirementIndex)
    .toLowerCase();
};

const expectNoWorkplaceForbiddenWording = (text: string) => {
  const normalised = normaliseResultText(text);

  for (const phrase of [
    "employer broke the law",
    "you will win",
    "unfair dismissal proven",
    "discrimination proven",
    "valid claim",
    "invalid claim",
    "case strength",
    "success chance",
    "win chance",
    "tribunal prediction",
    "compensation owed",
    "you are owed",
    "resign now",
    "refuse the meeting",
    "sign the agreement",
    "do not sign the agreement",
  ]) {
    expect(normalised).not.toContain(normaliseResultText(phrase));
  }
};

const makeAdminItem = (title: string, rawText: string, sourceType: AdminItem["sourceType"] = "bill"): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: "2026-07-17T10:00:00.000Z",
  analysedAt: "2026-07-17T10:00:00.000Z",
});

const genericAdminStrategicPlan: StrategicNextStepPlan = {
  title: "Best next move",
  plainEnglishSummary: "This needs a careful check before deciding what to do next.",
  actors: [],
  userGoal: "Identify what the message is asking for before acting.",
  missingInformation: ["Sender, date, reference, requested action, and any deadline shown on the document."],
  safestMove: {
    label: "Identify the sender, date, reference, and deadline",
    description: "Find who sent it, when, any reference number, what they want, and whether a date is mentioned.",
    whyThisHelps: "It avoids a rushed response and helps you decide whether this needs action.",
    riskLevel: "low",
    reversibility: "easy_to_reverse",
    preservesOptions: true,
    requiresEvidence: true,
    requiresAdvice: false,
    doNotAutoSend: true,
  },
  otherSafeMoves: [],
  movesToAvoid: ["Do not reply, pay, click, or submit anything before checking what the document is."],
  whenToGetAdvice: [],
  uncertainty: ["Some details may be missing if the message was cropped, incomplete, or hard to read."],
  cannotKnow: ["AdminAvenger cannot know whether the sender has other information outside this message."],
  safetyNotes: ["AdminAvenger helps you compare safe next steps."],
};

describe("ResultViewModel", () => {
  it("builds a conservative view model for a UC sanction result", () => {
    const decision = analyseDecisionProblem(`Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask us to look at this decision again.`);
    const model = buildModelForDecision(decision);

    expect(decision.documentType).toBe("benefits_uc_sanction");
    expect(model.title).toBe("Universal Credit sanction check");
    expect(model.keyDates.some((date) => date.value.includes("10 July 2026"))).toBe(true);
    expect(model.bestNextMove?.label.toLowerCase()).toContain("decision date");
    expect(model.cannotKnow.length).toBeGreaterThan(0);
    expect(model.uncertainty.length).toBeGreaterThan(0);
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("builds a UC statement model with display-only money lines", () => {
    const decision = analyseDecisionProblem(`Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Standard allowance: GBP 393.45
Housing: GBP 500.00
Advance repayment: GBP 50.00
Your payment this month: GBP 843.45`);
    const model = buildModelForDecision(decision);

    expect(decision.documentType).toBe("benefits_uc_statement");
    expect(model.showBenefitsActionPack).toBe(true);
    expect(model.moneyMentioned.length).toBeGreaterThan(0);
    expect(model.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(model.moneyMentioned.every((line) => normaliseResultText(line.caution).includes("not counted"))).toBe(true);
    expect(validateResultViewModelSafety(model).moneyDisplayOnly).toBe(true);
  });

  it("builds a PIP decision model with the decision date and safe next move", () => {
    const decision = analyseDecisionProblem(`Personal Independence Payment decision
We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.`);
    const model = buildModelForDecision(decision);
    const flattened = flattenResultViewModelText(model).toLowerCase();

    expect(decision.documentType).toBe("benefits_decision");
    expect(model.keyDates.some((date) => date.value.includes("4 July 2026"))).toBe(true);
    expect(model.bestNextMove?.label.toLowerCase()).toContain("decision date");
    expect(flattened).toContain("activities");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("includes Best next move data when a strategic plan is present", () => {
    const decision = makeDecision("benefits_uc_sanction");
    const model = buildModelForDecision(decision);

    expect(model.showStrategicNextStep).toBe(true);
    expect(model.bestNextMove).toBeDefined();
    expect(model.sections.map((section) => section.id)).toContain("best-next-move");
    expect(model.primaryAction?.source).toBe("best_next_move");
  });

  it("includes Benefits Action Pack dates, money, evidence, and questions when present", () => {
    const decision = makeDecision("benefits_uc_statement", {
      amountMentioned: "GBP 813.45",
      amountTreatment: "amount_mentioned_only",
      sourceFacts: [
        { label: "Payment date", value: "7 July 2026" },
        { label: "Payment this month", value: "GBP 813.45" },
        { label: "Deduction", value: "Advance repayment" },
      ],
      questionsToAnswer: ["Which deduction has changed?"],
    });
    const model = buildModelForDecision(decision);

    expect(model.keyDates.some((date) => date.value === "7 July 2026")).toBe(true);
    expect(model.moneyMentioned.some((line) => line.amountText === "GBP 813.45")).toBe(true);
    expect(model.evidenceFound.some((item) => item.value === "Advance repayment")).toBe(true);
    expect(model.questionsToAnswer).toContain("Which deduction has changed?");
  });

  it("surfaces payment reminder dates and display-only requested money", () => {
    const item = makeAdminItem(
      "Payment reminder",
      [
        "Greenfield Water Services",
        "Payment reminder",
        "Date: 14 July 2026",
        "Account reference: GW-48291",
        "Our records show an unpaid balance of \u00a384.60.",
        "Payment was due on 10 July 2026.",
        "Please pay the balance or contact us by 24 July 2026.",
        "If you have already paid, send us proof of payment so we can update the account.",
      ].join("\n"),
    );
    const [finding] = analyseAdminItem(item);

    if (!finding) {
      throw new Error("Expected a payment reminder finding");
    }

    const adminCase = createAdminCase(finding, item);
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const model = buildResultViewModel({ adminCase, opportunity });

    expect(model.title).toBe("Payment reminder to check");
    expect(model.summary).toContain("payment reminder");
    expect(model.keyDates.some((date) => date.value.includes("24 July 2026"))).toBe(true);
    expect(model.moneyMentioned.some((line) => line.amountText === "GBP 84.60")).toBe(true);
    expect(model.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);
    expect(model.moneyMentioned.every((line) => normaliseResultText(line.caution).includes("not counted"))).toBe(true);
    const requestedAmountLine = model.moneyMentioned.find((line) => line.label === "Amount being requested");

    expect(requestedAmountLine).toBeDefined();
    expect(`${requestedAmountLine?.label}: ${requestedAmountLine?.amountText}`).toBe("Amount being requested: GBP 84.60");
    expect(`${requestedAmountLine?.label}: ${requestedAmountLine?.amountText}`).not.toBe(
      "Amount being requested: Amount being requested: GBP 84.60",
    );
    expect(model.bestNextMove?.label).toBe("Check the account, amount, and payment status");
    expect(model.bestNextMove?.description).toContain("account reference belongs to you");
    expect(model.bestNextMove?.description).toContain("whether the amount is correct");
    expect(model.bestNextMove?.description).toContain("whether it has already been paid");
    expect(model.bestNextMove?.description).toContain("independently verified provider channel");
    expect(model.bestNextMove?.description).toContain("24 July 2026");
    expect(model.bestNextMove?.label).not.toBe("Identify the sender, date, reference, and deadline");
    expect(model.evidenceFound).toContainEqual(
      expect.objectContaining({ label: "Account reference", value: "GW-48291" }),
    );
  });

  it("dedupes repeated evidence, questions, risks, cannotKnow, and uncertainty", () => {
    const decision = makeDecision("benefits_uc_sanction", {
      evidenceNeeded: ["Full letter", " full   letter ", "Decision date"],
      questionsToAnswer: ["What date is printed?", " what   date is printed? "],
      risks: ["Missing a date could make the next step harder.", " missing a date could make the next step harder. "],
      cannotKnow: ["Whether the organisation has all evidence it needs.", "whether the organisation has all evidence it needs."],
      uncertainty: ["The exact stage may depend on the full letter.", " the exact stage may depend on the full letter. "],
    });
    const model = buildModelForDecision(decision);

    expectUniqueText(model.evidenceToGather.map((item) => item.value));
    expectUniqueText(model.questionsToAnswer);
    expectUniqueText(model.risks);
    expectUniqueText(model.cannotKnow);
    expectUniqueText(model.uncertainty);
  });

  it("keeps cannotKnow and uncertainty present after dedupe", () => {
    const model = buildModelForDecision(
      makeDecision("benefits_migration_notice", {
        cannotKnow: ["Whether this is the latest letter sent to you.", "Whether this is the latest letter sent to you."],
        uncertainty: ["The exact migration date needs checking.", "The exact migration date needs checking."],
      }),
    );

    expect(model.cannotKnow).toContain("Whether this is the latest letter sent to you.");
    expect(model.uncertainty).toContain("The exact migration date needs checking.");
    expect(validateResultViewModelSafety(model).cannotKnowPresent).toBe(true);
    expect(validateResultViewModelSafety(model).uncertaintyPresent).toBe(true);
  });

  it("marks every date as user-check-required", () => {
    const model = buildModelForDecision(makeDecision("benefits_uc_statement"));

    expect(model.keyDates.length).toBeGreaterThan(0);
    expect(model.keyDates.every((date) => date.userMustCheck === true)).toBe(true);
    expect(model.keyDates.every((date) => normaliseResultText(date.caution).includes("check"))).toBe(true);
    expect(validateResultViewModelSafety(model).datesUserCheckRequired).toBe(true);
  });

  it("does not include forbidden or adversarial wording", () => {
    const model = buildModelForDecision(makeDecision("benefits_uc_deductions"));
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const safety = validateResultViewModelSafety(model);

    for (const phrase of RESULT_FORBIDDEN_PHRASES) {
      expect(flattened).not.toContain(phrase);
    }

    expect(safety.hasForbiddenWording).toBe(false);
    expect(safety.hasAdversarialLanguage).toBe(false);
  });

  it("does not use game framing or unsafe DWP outcome claims", () => {
    const model = buildModelForDecision(makeDecision("benefits_decision"));
    const flattened = flattenResultViewModelText(model).toLowerCase();

    expect(flattened).not.toContain("game theory");
    expect(flattened).not.toContain("dwp is wrong");
    expect(flattened).not.toContain("you will win");
    expect(flattened).not.toContain("you qualify");
  });

  it("preserves the no-contact safety note", () => {
    const model = buildModelForDecision(makeDecision("benefits_crisis_support"));
    const safety = validateResultViewModelSafety(model);

    expect(model.safetyNotes.some((note) => note.includes("does not contact anyone"))).toBe(true);
    expect(safety.noContactSafetyNotePresent).toBe(true);
  });

  it("builds a career-specific view model for CV preparation notes", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Seeking an entry-level front-end developer role.
Technical Skills
React, TypeScript, GitHub
Projects
Portfolio website and accessibility checklist app.
Work Experience
Volunteer experience supporting admin updates.
Education & Training
Web development course, 2026`,
    });
    const model = buildResultViewModel({
      careerSupportPack,
      strategicNextStepPlan: genericAdminStrategicPlan,
    });
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const bestNextMoveText = [
      model.bestNextMove?.label,
      model.bestNextMove?.description,
      model.bestNextMove?.whyThisHelps,
    ].join(" ").toLowerCase();
    const uncertaintyText = model.uncertainty.join(" ").toLowerCase();

    expect(careerSupportPack.documentType).toBe("cv");
    expect(model.resultKind).toBe("career_support");
    expect(model.title).toBe("CV preparation notes");
    expect(model.primaryStatusLabel).toBe("Career preparation only - review before using");
    expect(model.bestNextMove?.label).toBe("Choose the target role before editing the CV");
    expect(model.bestNextMove?.description).toContain("Pick the job type or job advert first");
    expect(model.bestNextMove?.whyThisHelps).toContain("tailored to a specific role");
    expect(bestNextMoveText).not.toContain("sender");
    expect(bestNextMoveText).not.toContain("reference");
    expect(bestNextMoveText).not.toContain("deadline");
    expect(model.keyDates).toEqual([]);
    expect(model.moneyMentioned).toEqual([]);
    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([
        "career-target-roles",
        "career-strengths",
        "career-evidence",
        "career-projects",
        "career-experience",
        "career-education",
        "career-gaps",
        "career-safer-rewrites",
        "career-next-steps",
      ]),
    );
    expect(flattened).toContain("strengths to highlight");
    expect(flattened).toContain("projects to highlight");
    expect(flattened).toContain("react and typescript project work");
    expect(flattened).not.toContain("evidence around");
    expect(flattened).not.toContain("money mentioned");
    expect(flattened).not.toContain("check these details against the original letter");
    expect(uncertaintyText).not.toContain("reply");
    expect(uncertaintyText).not.toContain("pay");
    expect(uncertaintyText).not.toContain("click");
    expect(uncertaintyText).not.toContain("submit anything");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("builds a match-preparation view model for a CV plus job advert", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Front-end developer with React and TypeScript experience.
Technical Skills
React, TypeScript, accessibility, GitHub
Projects
AdminAvenger - local-first document preparation prototype.
Work Experience
Supported customer service teams.
Education & Training
Web development bootcamp, 2025

Job advert: Front End Developer
About the role
We are looking for a candidate who can build user interfaces and maintain components.
Requirements
Essential skills: React, TypeScript, accessibility, and customer-facing communication.
Desirable skills: Portfolio or GitHub examples.`,
    });
    const model = buildResultViewModel({ careerSupportPack });
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const cvEvidenceSection = model.sections.find((section) => section.id === "career-cv-evidence-may-match");
    const cvEvidenceText = cvEvidenceSection?.items.join("\n").toLowerCase() ?? "";
    const evidenceMapText = model.careerRequirementEvidenceMap
      ?.flatMap((item) => [item.requirement, ...item.possibleEvidence, item.exampleToPrepare, item.verificationNote])
      .join("\n")
      .toLowerCase() ?? "";

    expect(careerSupportPack.documentType).toBe("cv_job_advert_match");
    expect(model.title).toBe("CV and job advert match notes");
    expect(model.bestNextMove?.label).toBe("Compare advert requirements with truthful CV evidence");
    expect(model.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining([
        "career-role-clues",
        "career-requirement-evidence-map",
        "career-requirements-found",
        "career-cv-evidence-may-match",
        "career-strong-evidence-to-consider",
        "career-advert-wording-to-review",
        "career-examples-to-prepare",
        "career-claims-to-verify",
      ]),
    );
    expect(flattened).toContain("requirements found in the advert");
    expect(flattened).toContain("cv evidence that may match");
    expect(flattened).toContain("requirement-by-requirement evidence map");
    expect(evidenceMapText).toContain("adminavenger");
    expect(evidenceMapText).toContain("check before using");
    expect(cvEvidenceText).not.toContain("we are looking for a candidate who can build user interfaces");
    expect(flattened).not.toContain("match score");
    expect(flattened).not.toContain("percentage match");
    expect(flattened).not.toContain("you are qualified");
    expect(flattened).not.toContain("apply automatically");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("guards final career match output from leaking admin evidence into front-end requirements", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Data-focused administrator with strong Excel, record keeping and office admin experience.

Key Skills
Managed inboxes, appointments and documents.
CRM updates and customer records.
Microsoft Excel formulas and spreadsheets.
GDPR and confidentiality.

Work Experience
2024
Managed inboxes, appointments and documents.
Maintained confidential customer information.
Reported recurring data issues to managers.

Education and Training
Data Protection and GDPR Training

JOB ADVERT
Junior Front-End Developer
Responsibilities
Build user interfaces using HTML, CSS, JavaScript and React.
Work with TypeScript components and reusable UI patterns.
Help fix bugs and improve existing pages.`,
    });
    const model = buildResultViewModel({ careerSupportPack });
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const evidenceFor = (requirement: string) =>
      model.careerRequirementEvidenceMap?.find((item) =>
        item.requirement.toLowerCase().includes(requirement),
      )?.possibleEvidence.join("\n").toLowerCase() ?? "";

    expect(careerSupportPack.documentType).toBe("cv_job_advert_match");
    expect(evidenceFor("build user interfaces")).toContain("no clear cv evidence found");
    expect(evidenceFor("typescript components")).toContain("no clear cv evidence found");
    expect(evidenceFor("fix bugs")).toContain("no clear cv evidence found");

    for (const forbidden of [
      "managed inboxes, appointments and documents",
      "reported recurring data issues to managers",
      "data protection and gdpr training",
      "maintained confidential customer information",
      "crm updates and customer records",
      "microsoft excel formulas",
      "spreadsheets",
      "gdpr and confidentiality",
      "record keeping",
      "technical/practical problem solving",
    ]) {
      expect(flattened).not.toContain(forbidden);
    }
    expect(flattened).not.toMatch(/(^|\n)2024($|\n)/);
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("keeps data and admin CV evidence for a data operations advert", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Data-focused administrator with Excel, CRM and careful records experience.

Key Skills
CRM updates and customer records.
Microsoft Excel formulas and spreadsheets.
GDPR and confidentiality.

Work Experience
Maintained confidential customer information.
Reported recurring data issues to managers.

Education and Training
Data Protection and GDPR Training

JOB ADVERT
Data Operations Specialist
Requirements
Maintain accurate CRM records.
Use Excel spreadsheets to review data quality.
Handle confidential customer data carefully.
Report recurring data issues to managers.`,
    });
    const model = buildResultViewModel({ careerSupportPack });
    const flattened = flattenResultViewModelText(model).toLowerCase();

    expect(careerSupportPack.documentType).toBe("cv_job_advert_match");
    expect(flattened).toContain("crm updates and customer records");
    expect(flattened).toContain("microsoft excel formulas");
    expect(flattened).toContain("data protection and gdpr training");
    expect(flattened).toContain("reported recurring data issues to managers");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("keeps SaaS support issue-documentation evidence in the final checklist", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional Profile
Front-end developer with customer support experience.

Technical Skills
React, TypeScript, HTML, CSS, JavaScript, GitHub

Projects
TaskFlow Dashboard
Built a React and TypeScript dashboard for tracking customer requests.
Used GitHub to document setup steps.

Work Experience
Customer Support Assistant
Helped customers understand products and resolve simple issues.
Explained steps clearly to customers and colleagues.
Kept notes of recurring problems and shared them with the team.

JOB ADVERT
SaaS Support Specialist

Responsibilities
Help customers understand product settings and resolve simple issues.
Reproduce simple issues and document what happened.
Basic digital understanding.`,
    });
    const model = buildResultViewModel({ careerSupportPack });
    const customerHelp = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("help customers understand"),
    );
    const issueDocumentation = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("reproduce simple issues"),
    );
    const digital = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("basic digital understanding"),
    );
    const issueEvidence = issueDocumentation?.possibleEvidence.join("\n").toLowerCase() ?? "";
    const digitalEvidence = digital?.possibleEvidence.join("\n").toLowerCase() ?? "";
    const issueChecklistBlock = extractChecklistRequirementBlock(
      model.draftOrChecklist?.body ?? "",
      "Reproduce simple issues and document what happened.",
    );
    const digitalChecklistBlock = extractChecklistRequirementBlock(
      model.draftOrChecklist?.body ?? "",
      "Basic digital understanding.",
    );

    expect(customerHelp?.exampleToPrepare.toLowerCase()).toContain("helping a customer understand");
    expect(customerHelp?.exampleToPrepare.toLowerCase()).not.toContain("reproducing an issue");
    expect(issueDocumentation?.possibleEvidence[0].toLowerCase()).toContain("kept notes of recurring problems");
    expect(issueEvidence.indexOf("kept notes of recurring problems")).toBeLessThan(
      issueEvidence.indexOf("react and typescript"),
    );
    expect(issueDocumentation?.exampleToPrepare.toLowerCase()).toContain(
      "reproducing an issue, recording the steps and outcome",
    );
    expect(issueChecklistBlock).toContain(
      "possible cv evidence to consider: kept notes of recurring problems and shared them with the team.",
    );
    expect(issueChecklistBlock).toContain("reproducing an issue, recording the steps and outcome");
    expect(issueChecklistBlock.indexOf("kept notes of recurring problems")).toBeLessThan(
      issueChecklistBlock.indexOf("react and typescript"),
    );
    expect(digital?.possibleEvidence[0].toLowerCase()).toContain("react");
    expect(digitalEvidence).toContain("built a react and typescript dashboard");
    expect(digitalEvidence).toContain("react, typescript, html, css, javascript, github");
    expect(digitalEvidence).toContain("used github to document setup steps");
    expect(digitalEvidence).not.toContain("no clear cv evidence found");
    expect(digitalChecklistBlock).toContain(
      "possible cv evidence to consider: react, typescript, html, css, javascript, github",
    );
    expect(digitalChecklistBlock).toContain(
      "possible cv evidence to consider: taskflow dashboard - built a react and typescript dashboard for tracking customer requests.",
    );
    expect(digitalChecklistBlock).toContain("possible cv evidence to consider: used github to document setup steps.");
    expect(digitalChecklistBlock).not.toContain("html, css, javascript, or python skills mentioned in the cv");
    expect(digitalChecklistBlock).not.toContain("react and typescript project work mentioned in the cv");
    expect(digitalChecklistBlock).not.toContain("github or portfolio evidence mentioned in the cv");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("keeps SaaS support privacy and digital evidence specific in final output", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional Profile
Career changer with admin, family support and basic web project experience.

Key Skills
Learning new software tools.
Appointment and inbox management.
GDPR and customer records.

Projects
Personal Portfolio Website
Built a simple HTML and CSS portfolio page.
GitHub portfolio in progress.

Work Experience
Family Support Role
Helped families understand appointment letters and next steps.
Explained steps clearly to people who were unsure what to do.
Kept notes of recurring problems and shared them with the team.
Appointment and inbox management.
Maintained confidential customer records.

Education and Training
GDPR Essentials Course

JOB ADVERT
SaaS Customer Support Assistant

Responsibilities
Respond to support tickets and onboarding questions.
Reproduce simple issues and document what happened.
Follow privacy processes when updating customer records.
Show basic digital or web understanding.`,
    });
    const model = buildResultViewModel({ careerSupportPack });
    const flattened = flattenResultViewModelText(model).toLowerCase();
    const privacy = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("privacy processes"),
    );
    const digital = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("digital or web understanding"),
    );
    const issueDocumentation = model.careerRequirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("reproduce simple issues"),
    );
    const digitalEvidence = digital?.possibleEvidence.join("\n").toLowerCase() ?? "";
    const privacyChecklistBlock = extractChecklistRequirementBlock(
      model.draftOrChecklist?.body ?? "",
      "Follow privacy processes when updating customer records.",
    );
    const digitalChecklistBlock = extractChecklistRequirementBlock(
      model.draftOrChecklist?.body ?? "",
      "Show basic digital or web understanding.",
    );

    expect(privacy?.possibleEvidence[0].toLowerCase()).toContain("gdpr and customer records");
    expect(privacy?.possibleEvidence.join(" ").toLowerCase()).toContain("confidential customer records");
    expect(privacy?.possibleEvidence.join(" ").toLowerCase()).toContain("gdpr essentials course");
    expect(privacy?.possibleEvidence.join(" ").toLowerCase()).not.toContain("learning new software tools");
    expect(privacy?.exampleToPrepare.toLowerCase()).toContain("privacy or confidentiality");
    expect(privacy?.exampleToPrepare.toLowerCase()).toContain("customer records");
    expect(privacy?.exampleToPrepare.toLowerCase()).not.toContain("technical issue");
    expect(privacy?.exampleToPrepare.toLowerCase()).not.toContain("platform step");
    expect(privacy?.exampleToPrepare.toLowerCase()).not.toContain("reproduce an issue");
    expect(privacyChecklistBlock).toContain(
      "prepare a short example of following a privacy or confidentiality process when updating or handling customer records",
    );
    expect(privacyChecklistBlock).not.toContain("technical issue");
    expect(privacyChecklistBlock).not.toContain("platform step");
    expect(privacyChecklistBlock).not.toContain("reproduce an issue");
    expect(digital?.possibleEvidence[0].toLowerCase()).toContain("html");
    expect(digitalEvidence).toContain("built a simple html and css portfolio page");
    expect(digitalEvidence).toContain("github portfolio in progress");
    expect(digitalChecklistBlock).toContain(
      "possible cv evidence to consider: personal portfolio website - built a simple html and css portfolio page.",
    );
    expect(digitalChecklistBlock).not.toContain(
      "\npossible cv evidence to consider: built a simple html and css portfolio page.",
    );
    if (flattened.includes("github or portfolio evidence mentioned in the cv")) {
      expect(flattened.indexOf("built a simple html and css portfolio page")).toBeLessThan(
        flattened.indexOf("github or portfolio evidence mentioned in the cv"),
      );
    }
    expect(digitalEvidence).not.toContain("appointment and inbox management");
    expect(issueDocumentation?.possibleEvidence[0].toLowerCase()).toContain("kept notes of recurring problems");
    expect(flattened).not.toMatch(/(^|\n)family support role($|\n)/);
    expect(flattened).not.toMatch(/(^|\n)personal portfolio website($|\n)/);
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("still produces a useful conservative fallback for unknown admin documents", () => {
    const decision = makeDecision("unknown_admin_dispute", {
      title: "",
      plainEnglishSummary: "",
      uncertainty: [],
      cannotKnow: [],
      sourceFacts: [],
      deadlines: [],
      evidenceNeeded: [],
      questionsToAnswer: [],
      risks: [],
    });
    const model = buildResultViewModel({ decisionResult: decision });

    expect(model.title).toBe("Admin document check");
    expect(model.summary).toContain("careful check");
    expect(model.cannotKnow).toContain(
      "AdminAvenger cannot verify anything outside the text, image, or file you provided.",
    );
    expect(model.uncertainty).toContain(
      "Some details may be missing, unclear, or need checking against the original document.",
    );
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });

  it("accepts an optional workplaceSupportPack without requiring other inputs", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works HR
Reference: REF-EXAMPLE-WORK-001

You are invited to a disciplinary meeting on 14 September 2026 about an allegation of misconduct.
You may bring a workplace companion and should review the investigation notes.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);
    const normalised = normaliseResultText(flattened);

    expect(model.title).toBe("Disciplinary meeting preparation");
    expect(model.summaryView.source).toBe("workplace_support_pack");
    expect(model.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining([
        "Workplace preparation",
        "What this appears to be about",
        "Key facts to check",
        "Questions to ask",
        "Ask someone suitable",
      ]),
    );
    expect(normalised).toContain("this is preparation only, not legal or employment advice");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control");
    expect(normalised).toContain("acas");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("maps a disciplinary invite pack to preparation sections safely", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works HR
Reference: REF-EXAMPLE-WORK-002

You are invited to a disciplinary hearing on 20 September 2026.
Please bring any relevant documents and contact HR if you need clarification.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);

    expect(model.evidenceToGather.some((item) => item.source === "workplace_support_pack")).toBe(true);
    expect(model.questionsToAnswer.length).toBeGreaterThan(0);
    expect(model.draftOrChecklist?.title).toBe("Workplace preparation checklist");
    expect(flattened).toContain("Question to ask:");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("keeps wage and pay issue amounts out of owed-money wording", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works Payroll
Reference: REF-EXAMPLE-WORK-003

Your payslip shows a deduction of GBP 75.00 for the September pay period.
Please contact payroll if you have questions about wages or holiday pay.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);
    const normalised = normaliseResultText(flattened);

    expect(model.title).toBe("Pay issue preparation");
    expect(normalised).toContain("display-only");
    expect(normalised).toContain("not counted as a saving or recovery");
    expect(model.moneyMentioned).toEqual([]);
    expect(normalised).not.toContain("money is owed");
    expect(normalised).not.toContain("you are owed");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("keeps settlement agreement signposting without a draft response or deal assessment", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works HR
Reference: REF-EXAMPLE-WORK-004

The attached settlement agreement is sent without prejudice.
It mentions a COT3 route and asks Alex Example to reply by 30 September 2026.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);
    const normalised = normaliseResultText(flattened);

    expect(workplaceSupportPack.documentType).toBe("settlement_agreement_signpost");
    expect(model.draftOrChecklist).toBeUndefined();
    expect(normalised).toContain("do not rely on adminavenger for a signing decision");
    expect(normalised).toContain("qualified adviser");
    expect(normalised).not.toContain("good deal");
    expect(normalised).not.toContain("bad deal");
    expect(normalised).not.toContain("do not sign");
    expect(normalised).not.toContain("compensation owed");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("preserves resignation warning neutrally and signposts human support", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works message
Reference: REF-EXAMPLE-WORK-005

I am thinking about resignation after a contract change and may resign or quit next week.
I want to organise questions before I speak to someone trusted.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);
    const normalised = normaliseResultText(flattened);

    expect(normalised).toContain("resignation decisions can have serious consequences");
    expect(normalised).toContain("acas");
    expect(normalised).not.toContain("you should resign");
    expect(normalised).not.toContain("you should not resign");
    expect(normalised).not.toContain("resign now");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("keeps unknown workplace pack conservative", () => {
    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: `Example Works message
Reference: REF-EXAMPLE-WORK-006

Please read the attached workplace update and bring any questions to your manager.
The message is short and does not explain the process.`,
    });
    const model = buildResultViewModel({ workplaceSupportPack });
    const flattened = flattenResultViewModelText(model);
    const normalised = normaliseResultText(flattened);

    expect(workplaceSupportPack.documentType).toBe("workplace_unknown");
    expect(model.title).toBe("Workplace admin preparation");
    expect(normalised).toContain("not clear");
    expect(normalised).toContain("check the sender, date, reference");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
    expectNoWorkplaceForbiddenWording(flattened);
  });

  it("keeps existing non-workplace flows unchanged when no workplaceSupportPack is provided", () => {
    const decision = makeDecision("benefits_uc_statement");
    const model = buildModelForDecision(decision);
    const flattened = flattenResultViewModelText(model);

    expect(model.sections.map((section) => section.id)).not.toContain("workplace-preparation");
    expect(model.summaryView.source).not.toBe("workplace_support_pack");
    expect(flattened).not.toContain("Workplace preparation");
    expect(validateResultViewModelSafety(model).safe).toBe(true);
  });
});
