import type { DecisionCaseStrength, DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Work Capability Assessment / LCWRA evidence engine. Covers the health-based
// assessment used for ESA and the Universal Credit health element (LCW/
// LCWRA) - a different assessment to PIP (see benefits.ts), even though the
// stages look similar (evidence prep, assessment report, decision, Mandatory
// Reconsideration/appeal). Kept as a single document type with internal stage
// detection, per the scope of the "WCA/LCWRA evidence engine" as one engine.
const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

type Stage = "evidence_prep" | "assessment_report" | "decision" | "appeal";

const appealPatterns = [/\bappeal\b/i, /\btribunal\b/i, /\bsscs1\b/i, /\bhmcts\b/i, /mandatory reconsideration notice/i];
const decisionPatterns = [
  /found fit for work/i,
  /do not have limited capability for work/i,
  /you do not have limited capability/i,
  /\bdecision date\b/i,
  /\bwe have decided\b/i,
  /\blcwra\b.*(?:awarded|not awarded)/i,
];
const assessmentReportPatterns = [/\besa85\b/i, /assessment report/i, /functional assessment/i, /\bassessor\b/i];
const evidencePrepPatterns = [/\buc50\b/i, /\besa50\b/i, /questionnaire/i, /capability for work questionnaire/i];

const detectStage = (text: string): Stage => {
  if (appealPatterns.some((pattern) => pattern.test(text))) {
    return "appeal";
  }

  if (decisionPatterns.some((pattern) => pattern.test(text))) {
    return "decision";
  }

  if (assessmentReportPatterns.some((pattern) => pattern.test(text))) {
    return "assessment_report";
  }

  if (evidencePrepPatterns.some((pattern) => pattern.test(text))) {
    return "evidence_prep";
  }

  return "evidence_prep";
};

// A handful of physical/mental function descriptors used across the WCA and
// LCWRA activity lists. Not exhaustive - surfaced only as "you mentioned X",
// never as a score or a predicted outcome.
const descriptorActivities: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "mobilising", patterns: [/mobilis\w*/i, /walking distance/i, /wheelchair/i] },
  { label: "standing and sitting", patterns: [/standing and sitting/i, /\bstanding\b/i, /\bsitting\b/i] },
  { label: "manual dexterity", patterns: [/manual dexterity/i, /using (your )?hands/i] },
  { label: "communication", patterns: [/\bcommunicat\w*/i, /\bspeech\b/i, /understanding/i] },
  { label: "learning tasks", patterns: [/learning tasks?/i, /\blearning\b/i] },
  { label: "coping with change", patterns: [/coping with change/i] },
  {
    label: "getting about / social engagement",
    patterns: [/social engagement/i, /getting about/i, /leaving the house/i],
  },
  { label: "appropriateness of behaviour", patterns: [/appropriateness of behaviour/i, /behav\w* with other people/i] },
  { label: "substantial risk", patterns: [/substantial risk/i] },
];

const detectDescriptors = (text: string) =>
  descriptorActivities.filter((activity) => activity.patterns.some((pattern) => pattern.test(text))).map((a) => a.label);

const stageTitle: Record<Stage, string> = {
  evidence_prep: "Work Capability Assessment evidence check",
  assessment_report: "Work Capability Assessment report check",
  decision: "Work Capability Assessment decision check",
  appeal: "Work Capability Assessment appeal check",
};

const stageSummary: Record<Stage, string> = {
  evidence_prep:
    "This looks like a Work Capability Assessment form or a message about preparing evidence for ESA or the Universal Credit health element (LCW/LCWRA).",
  assessment_report:
    "This looks like a Work Capability Assessment report from the health professional who assessed you.",
  decision:
    "This looks like a Work Capability Assessment decision, about whether you have limited capability for work (LCW) or limited capability for work and work-related activity (LCWRA).",
  appeal: "This looks like an appeal or tribunal stage for a Work Capability Assessment decision.",
};

const stageCaseStrength: Record<Stage, DecisionCaseStrength> = {
  evidence_prep: "not_enough_information",
  assessment_report: "not_enough_information",
  decision: "urgent_get_advice",
  appeal: "urgent_get_advice",
};

const stageStrengthLabel: Record<Stage, string> = {
  evidence_prep: "Getting ready - organise your evidence",
  assessment_report: "Review your assessment report",
  decision: "Check your deadline - Mandatory Reconsideration",
  appeal: "Appeal stage - check your deadline",
};

const stageDeadlines: Record<Stage, string[]> = {
  evidence_prep: ["Check the form for its return date and do not miss it."],
  assessment_report: ["Check whether a decision letter has already followed this report."],
  decision: [
    "Check the decision date. You usually need to ask for a Mandatory Reconsideration within one month of the decision date.",
  ],
  appeal: ["You usually need to appeal within one month of the Mandatory Reconsideration Notice."],
};

const stageNextSteps: Record<Stage, string[]> = {
  evidence_prep: [
    "Go through how your condition affects work-related activities and note real examples, including bad days.",
    "Gather supporting medical evidence before you submit.",
  ],
  assessment_report: [
    "Go through the report point by point and note anything that does not match your real difficulties.",
    "Prepare calm, factual corrections ready to send if you disagree with the decision that follows.",
  ],
  decision: [
    "Ask for the decision to be looked at again (Mandatory Reconsideration) if you disagree.",
    "Focus on which descriptors were missed and give real, specific examples.",
    "Include supporting medical evidence if you have it.",
  ],
  appeal: [
    "Check whether Mandatory Reconsideration has already happened.",
    "Prepare your evidence and real examples.",
    "Consider getting help from Citizens Advice, welfare rights, or a benefits adviser.",
  ],
};

const draftByStage: Record<Stage, string> = {
  evidence_prep: `Subject: Requesting supporting evidence for my Work Capability Assessment

Hello,

I am preparing evidence for my ESA/Universal Credit Work Capability Assessment and would like to ask for a supporting letter.

Please could you describe how my condition affects my ability to carry out work-related activities, based on what you have observed or I have told you.

Thank you,`,
  assessment_report: `Assessment report correction notes:

- Activity: [name the activity/descriptor]
  What the report says: [quote or summarise it]
  What actually happens: [your real example]
  Evidence available: [GP letter / diary / support worker statement]

Repeat for each activity you disagree with. Keep this factual and calm.`,
  decision: `Subject: Request for Mandatory Reconsideration (Work Capability Assessment)

Hello,

I am writing to ask for a Mandatory Reconsideration of my Work Capability Assessment decision.

Decision date: [add decision date]

I disagree with the outcome for the following activities/descriptors:
[list each activity, what happens when you try it, and any evidence you are including]

Please look at this decision again.

Kind regards,`,
  appeal: `Appeal preparation checklist:

- Mandatory Reconsideration Notice (keep a copy)
- Form SSCS1 completed and sent to HMCTS
- Real examples for each activity you disagree with
- Supporting medical evidence
- Deadline checked: appeals are usually within one month of the Mandatory Reconsideration Notice
- Consider asking Citizens Advice, a welfare rights service, or a benefits adviser for help`,
};

export const analyseWcaLcwra = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const stage = detectStage(normalisedText);
  const amountMentioned = findAmount(normalisedText);
  const descriptorsFound = detectDescriptors(normalisedText);

  const sourceFacts: DecisionSourceFact[] = [
    ...(amountMentioned ? [{ label: "Amount mentioned", value: amountMentioned, sourceQuote: amountMentioned }] : []),
    ...descriptorsFound.map((label) => ({ label: "Activity/descriptor mentioned", value: label })),
  ];

  const possibleGrounds = [
    "The Work Capability Assessment looks at what you can and cannot safely, reliably, repeatedly, and in a reasonable time do - not just your diagnosis.",
    ...descriptorsFound.map(
      (label) =>
        `You mentioned ${label}. The assessment looks at whether you can do this safely, reliably, repeatedly, and in a reasonable time.`,
    ),
  ];

  return {
    documentType: "benefits_wca_lcwra",
    title: stageTitle[stage],
    plainEnglishSummary: stageSummary[stage],
    caseStrength: stageCaseStrength[stage],
    strengthLabel: stageStrengthLabel[stage],
    whatThisLooksLike:
      "The Work Capability Assessment decides limited capability for work (LCW) and limited capability for work-related activity (LCWRA) for ESA and the Universal Credit health element.",
    possibleGrounds,
    confidence: {
      level: descriptorsFound.length > 0 ? "high" : "medium",
      reason:
        descriptorsFound.length > 0
          ? "The message matches this stage's usual wording and names specific work-related activities."
          : "The message matches this stage's usual wording, but does not name specific activities yet.",
    },
    uncertainty:
      descriptorsFound.length > 0
        ? []
        : ["Which specific work-related activities or descriptors are affected is not clear from this text alone."],
    cannotKnow: [
      "Whether DWP will accept the evidence or award LCW/LCWRA.",
      "The exact wording of the decision letter beyond what has been pasted here.",
    ],
    evidenceNeeded: [
      "GP or consultant letters describing how your condition affects work-related activities.",
      "A diary of bad days and real examples of what happens when you try an activity.",
      "Any assessment report you think is wrong, missing, or contradictory.",
    ],
    deadlines: stageDeadlines[stage],
    risks: [
      "Do not exaggerate or invent difficulties - describe what actually happens.",
      "Missing a Mandatory Reconsideration or appeal deadline can make the decision harder to challenge.",
    ],
    nextSteps: stageNextSteps[stage],
    safetyNotes: [BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE],
    draftMessage: draftByStage[stage],
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "Which work-related activities does your condition affect the most?",
      "What happens when you try this activity?",
      "How often does this happen, and does it vary between good and bad days?",
    ],
  };
};
