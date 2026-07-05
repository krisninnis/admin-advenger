import type {
  DecisionCaseStrength,
  DecisionDocumentType,
  DecisionModuleInput,
  DecisionResult,
  DecisionSourceFact,
} from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

export type BenefitsDocumentType = Extract<
  DecisionDocumentType,
  | "benefits_evidence_prep"
  | "benefits_assessment_report"
  | "benefits_decision"
  | "benefits_appeal"
  | "benefits_review"
>;

const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

type ActivityDefinition = {
  label: string;
  patterns: RegExp[];
};

// The 10 PIP daily living activities. PIP is about how a condition affects
// everyday tasks, not just the diagnosis, so we only ever surface these as
// "you mentioned X - here is what the assessment looks at", never a score.
const dailyLivingActivities: ActivityDefinition[] = [
  { label: "preparing food", patterns: [/prepar\w* food/i, /\bcooking\b/i, /\bpans?\b/i, /\bhob\b/i] },
  { label: "eating and drinking", patterns: [/eating and drinking/i, /\bswallowing\b/i, /\beating\b/i] },
  {
    label: "managing medicines or treatment",
    patterns: [/managing (your )?(medicines?|treatment)/i, /\bmedication\b/i, /\bprescriptions?\b/i],
  },
  { label: "washing and bathing", patterns: [/washing and bathing/i, /\bshower(ing)?\b/i, /\bbathing\b/i] },
  { label: "using the toilet", patterns: [/using the toilet/i, /\btoilet\b/i, /\bincontinence\b/i] },
  { label: "dressing and undressing", patterns: [/dressing and undressing/i, /getting dressed/i] },
  { label: "reading", patterns: [/\breading\b/i] },
  {
    label: "communicating, talking, listening, or understanding",
    patterns: [/\bcommunicat\w*/i, /\btalking\b/i, /\blistening\b/i, /\bunderstanding\b/i],
  },
  { label: "managing money", patterns: [/managing money/i, /\bbudgeting\b/i, /paying bills/i] },
  {
    label: "mixing or socialising with other people",
    patterns: [/mixing with (other )?people/i, /\bsocialising\b/i, /social situations/i],
  },
];

// The 2 PIP mobility activities.
const mobilityActivities: ActivityDefinition[] = [
  {
    label: "planning and following journeys",
    patterns: [/planning[^.]{0,25}journey/i, /follow\w* a journey/i, /panic attacks?/i],
  },
  { label: "leaving home", patterns: [/leaving (the house|home)/i, /leave (the house|home)/i] },
  {
    label: "moving around",
    patterns: [/moving around/i, /walking distance/i, /\bwalk(ing)?\b/i, /wheelchair/i, /mobility aid/i],
  },
];

const detectActivities = (text: string, activities: ActivityDefinition[]) =>
  activities
    .filter((activity) => activity.patterns.some((pattern) => pattern.test(text)))
    .map((activity) => activity.label);

// Reliability questions the assessment considers for every activity. These are
// framed as questions for the user to think about, never as assertions about
// their case.
const reliabilityQuestions = [
  "Can you do this safely, without a real risk of harm to yourself or someone else?",
  "Can you do this repeatedly, as often as you would reasonably need to?",
  "Can you do this to an acceptable standard?",
  "Can you do this in a reasonable time, not much longer than someone without your condition?",
  "Does this apply on most days, or more than half the time?",
  "Do you need prompting, supervision, aids or appliances, or help from another person?",
];

const evidenceEngineItems = [
  "GP or consultant letters",
  "Prescription list",
  "Care plan",
  "Social worker, occupational therapist, or physiotherapist evidence",
  "A diary of bad days",
  "Real examples: falls, panic attacks, confusion, fatigue, pain, prompting, or supervision needed",
  "Hospital letters",
  "A statement from a support worker or family member",
  "Anything in an assessment report you think is wrong, missing, or contradictory",
];

const sharedQuestions = [
  "What decision date is on the letter?",
  "What points did you score for daily living?",
  "What points did you score for mobility?",
  "Which activities do you disagree with?",
  "What happens when you try this activity?",
  "How often does this happen?",
  "Do symptoms vary between good and bad days?",
  "What evidence do you already have?",
];

type StageContent = {
  title: string;
  plainEnglishSummary: string;
  whatThisLooksLike: string;
  caseStrength: DecisionCaseStrength;
  strengthLabel: string;
  whatMattersMost: string[];
  evidenceNeeded: string[];
  deadlines: string[];
  risks: string[];
  nextSteps: string[];
  stageQuestions: string[];
  draftMessage: string;
};

const evidenceRequestDraft = `Subject: Requesting supporting evidence for my PIP claim

Hello,

I am preparing evidence for my PIP claim/review and would like to ask for a supporting letter.

Please could you include:
- How my condition affects [name the activity/activities], based on what you have observed or I have told you.
- Whether I need help, prompting, supervision, or aids for daily living or mobility tasks.
- Any relevant diagnoses, treatment, or appointments.

I am not asking you to state an outcome or entitlement - just to describe what you know about my day-to-day difficulties.

Thank you,`;

const mandatoryReconsiderationDraft = `Subject: Request for Mandatory Reconsideration

Hello,

I am writing to ask for a Mandatory Reconsideration of my PIP decision.

Decision date: [add decision date]
Reference/National Insurance number: [add if safe to include]

I disagree with the points awarded for the following activities:
[list each activity, what happens when you try it, and any evidence you are including]

Please look at this decision again, taking into account the examples and evidence above.

Kind regards,`;

const appealPreparationChecklist = `Appeal preparation checklist:

- Mandatory Reconsideration Notice (keep a copy)
- Form SSCS1 completed and sent to HMCTS, with a copy of the Mandatory Reconsideration Notice attached
- Real examples for each activity you disagree with: what happens, how often, and whether you need prompting, supervision, aids, or help
- Supporting evidence: GP/consultant letters, care plan, diary of bad days, support worker or family statement
- Deadline checked: appeals are usually within one month of the Mandatory Reconsideration Notice
- Consider asking Citizens Advice, a welfare rights service, or a benefits adviser for help`;

const assessmentReportCorrectionNotes = `Assessment report correction notes:

- Activity: [name the activity]
  What the report says: [quote or summarise it]
  What actually happens: [your real example]
  Evidence available: [GP letter / diary / support worker statement, etc.]

Repeat for each activity you disagree with. Keep this factual and calm - describe what happens, not an argument.`;

const stageContentByType: Record<BenefitsDocumentType, StageContent> = {
  benefits_evidence_prep: {
    title: "PIP claim form check",
    plainEnglishSummary:
      "This looks like a PIP claim form, or a message about preparing your PIP evidence.",
    whatThisLooksLike:
      "PIP claim forms (such as the PIP2, 'How your disability affects you') ask how your condition affects daily living and mobility tasks, not just your diagnosis.",
    caseStrength: "not_enough_information",
    strengthLabel: "Getting ready - organise your evidence",
    whatMattersMost: [
      "PIP is about how your condition affects everyday tasks and mobility, not just the diagnosis.",
      "Real examples of what happens when you try an activity matter more than naming a condition.",
    ],
    evidenceNeeded: ["Your own real-life examples for each activity that is affected."],
    deadlines: ["Check the claim form for its return date and do not miss it."],
    risks: [
      "Do not exaggerate or invent difficulties - describe what actually happens.",
      "Missing the form deadline can delay or end a claim.",
    ],
    nextSteps: [
      "Go through each daily living and mobility activity and note what actually happens, including on bad days.",
      "Gather supporting evidence before you submit.",
      "Consider asking someone who knows your day-to-day difficulties to help describe them.",
    ],
    stageQuestions: ["Which activities does your condition affect the most?"],
    draftMessage: evidenceRequestDraft,
  },
  benefits_assessment_report: {
    title: "PIP assessment report check",
    plainEnglishSummary:
      "This looks like a PIP assessment report from the health professional who assessed you.",
    whatThisLooksLike:
      "Assessment reports (often called PA4) record the assessor's observations and functional history, then link them to activities and descriptors.",
    caseStrength: "not_enough_information",
    strengthLabel: "Review your assessment report",
    whatMattersMost: [
      "Compare the report's statements against your real day-to-day difficulties.",
      "Look for inaccuracies, missing evidence, contradictions, or activities that were not properly considered.",
    ],
    evidenceNeeded: [
      "A copy of the full assessment report.",
      "Notes on anything in the report that does not match what you said or what actually happens.",
    ],
    deadlines: ["Check whether a decision letter or deadline has already followed this report."],
    risks: [
      "Do not assume the report is final until you see the actual decision letter.",
      "Keep corrections calm and factual rather than argumentative.",
    ],
    nextSteps: [
      "Go through the report activity by activity.",
      "Note specific inaccuracies, contradictions, or missing points with real examples.",
      "Prepare calm, factual corrections ready to send if you disagree with the decision that follows.",
    ],
    stageQuestions: ["Which parts of the report do not match your real day-to-day difficulties?"],
    draftMessage: assessmentReportCorrectionNotes,
  },
  benefits_decision: {
    title: "PIP decision check",
    plainEnglishSummary:
      "This looks like a PIP decision letter, at the decision or Mandatory Reconsideration stage.",
    whatThisLooksLike:
      "This appears to show a PIP decision, points for daily living and/or mobility, and your Mandatory Reconsideration rights.",
    caseStrength: "urgent_get_advice",
    strengthLabel: "Check your deadline - Mandatory Reconsideration",
    whatMattersMost: [
      "Focus on which activities or descriptors you disagree with, not just the total points.",
      "Real examples of what happens when you try each activity matter more than the diagnosis itself.",
    ],
    evidenceNeeded: [
      "The full decision letter, including the decision date.",
      "Which activities and descriptors you disagree with and why.",
      "Evidence for each disputed activity if available.",
    ],
    deadlines: [
      "Check the decision date. You usually need to ask for a Mandatory Reconsideration within one month of the decision date.",
      "If you are not sure, check the letter or contact DWP to confirm the exact deadline.",
    ],
    risks: [
      "Do not miss the one-month window without checking whether a late request is possible.",
      "Keep a copy of everything you send.",
    ],
    nextSteps: [
      "Ask for the decision to be looked at again (Mandatory Reconsideration) if you disagree.",
      "Focus on which activities/descriptors were missed and give real, specific examples.",
      "Include supporting evidence if you have it.",
      "Keep a copy of everything sent.",
    ],
    stageQuestions: [],
    draftMessage: mandatoryReconsiderationDraft,
  },
  benefits_appeal: {
    title: "PIP appeal/tribunal check",
    plainEnglishSummary: "This looks like an appeal or tribunal stage, after Mandatory Reconsideration.",
    whatThisLooksLike:
      "This appears to involve an appeal to the tribunal (HMCTS), a Mandatory Reconsideration Notice, form SSCS1, a hearing, or a submission/bundle.",
    caseStrength: "urgent_get_advice",
    strengthLabel: "Appeal stage - check your deadline",
    whatMattersMost: [
      "Check whether Mandatory Reconsideration has already happened - you usually need a Mandatory Reconsideration Notice before you can appeal.",
      "Real, specific examples for each disputed activity matter more at this stage than the total points.",
    ],
    evidenceNeeded: [
      "A copy of the Mandatory Reconsideration Notice.",
      "Form SSCS1 if you have not sent it yet.",
      "Evidence and examples for each activity you disagree with.",
      "Any medical, care, or support evidence you can add.",
    ],
    deadlines: [
      "You usually need to appeal within one month of the Mandatory Reconsideration Notice.",
      "Check the exact deadline on your notice.",
    ],
    risks: [
      "Do not miss the tribunal deadline.",
      "Consider getting help from Citizens Advice, a welfare rights service, or a benefits adviser - appeals can be complex.",
    ],
    nextSteps: [
      "Check whether Mandatory Reconsideration has already happened.",
      "Prepare your evidence and real examples.",
      "Consider getting help from Citizens Advice, welfare rights, or a benefits adviser.",
      "Do not miss tribunal deadlines.",
    ],
    stageQuestions: [],
    draftMessage: appealPreparationChecklist,
  },
  benefits_review: {
    title: "PIP award review check",
    plainEnglishSummary: "This looks like a PIP award review form, often called AR1.",
    whatThisLooksLike:
      "Award review forms ask how your condition and daily living/mobility difficulties look now, similar to the original claim form.",
    caseStrength: "not_enough_information",
    strengthLabel: "Award review - organise your evidence",
    whatMattersMost: [
      "The review looks at how your condition affects you now, not just your original award.",
      "Real, current examples for each activity matter, including anything that has changed since your last award.",
    ],
    evidenceNeeded: [
      "Current GP/consultant letters or evidence if your condition has changed.",
      "Your own current, real-life examples for each activity.",
      "Anything that shows what has changed since your last decision, if relevant.",
    ],
    deadlines: ["Check the review form for its return date and do not miss it."],
    risks: [
      "Do not assume your existing award will continue automatically.",
      "Do not exaggerate or invent difficulties - describe what actually happens now.",
    ],
    nextSteps: [
      "Go through each daily living and mobility activity and describe your current difficulties.",
      "Gather up-to-date supporting evidence.",
      "Return the form by its deadline.",
    ],
    stageQuestions: ["What has changed since your last PIP decision, if anything?"],
    draftMessage: evidenceRequestDraft,
  },
};

const scotlandAdpPattern = /adult disability payment|\badp\b/i;

export const analyseBenefitsProblem = (
  { normalisedText }: DecisionModuleInput,
  documentType: BenefitsDocumentType,
): DecisionResult => {
  const amountMentioned = findAmount(normalisedText);
  const mentionsScotlandAdp = scotlandAdpPattern.test(normalisedText);
  const dailyLivingFound = detectActivities(normalisedText, dailyLivingActivities);
  const mobilityFound = detectActivities(normalisedText, mobilityActivities);
  const stage = stageContentByType[documentType];

  const scotlandNote = mentionsScotlandAdp
    ? "This looks like it may be about Adult Disability Payment (ADP) in Scotland, not Personal Independence Payment (PIP). Scotland uses Adult Disability Payment, run by Social Security Scotland, instead of PIP. The general steps here (check the stage, organise evidence, note deadlines) can still help, but check Social Security Scotland's own guidance for ADP-specific rules."
    : undefined;

  const activityGrounds = [
    ...dailyLivingFound.map(
      (label) =>
        `You mentioned ${label} (a daily living activity). The assessment looks at whether you can do this safely, repeatedly, to an acceptable standard, and in a reasonable time, on most days.`,
    ),
    ...mobilityFound.map(
      (label) =>
        `You mentioned ${label} (a mobility activity). The assessment looks at whether you can do this safely, repeatedly, to an acceptable standard, and in a reasonable time, on most days.`,
    ),
  ];

  const sourceFacts: DecisionSourceFact[] = [
    ...(amountMentioned
      ? [{ label: "Amount mentioned", value: amountMentioned, sourceQuote: amountMentioned }]
      : []),
    ...dailyLivingFound.map((label) => ({ label: "Daily living activity mentioned", value: label })),
    ...mobilityFound.map((label) => ({ label: "Mobility activity mentioned", value: label })),
    ...(mentionsScotlandAdp ? [{ label: "Scotland ADP mentioned", value: "Yes" }] : []),
  ];

  return {
    documentType,
    title: stage.title,
    plainEnglishSummary: stage.plainEnglishSummary,
    caseStrength: stage.caseStrength,
    strengthLabel: stage.strengthLabel,
    whatThisLooksLike: stage.whatThisLooksLike,
    possibleGrounds: [...stage.whatMattersMost, ...activityGrounds],
    evidenceNeeded: [...stage.evidenceNeeded, ...evidenceEngineItems],
    deadlines: stage.deadlines,
    risks: stage.risks,
    nextSteps: stage.nextSteps,
    safetyNotes: [
      BENEFITS_SAFETY_NOTE,
      DECISION_SAFETY_NOTE,
      ...(scotlandNote ? [scotlandNote] : []),
    ],
    draftMessage: stage.draftMessage,
    amountMentioned,
    // Benefit amounts are never a saving, recovery, or confirmed money - only ever
    // "amount mentioned" until a separate outcome is manually recorded later.
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      ...stage.stageQuestions,
      ...sharedQuestions,
      ...reliabilityQuestions,
    ],
  };
};
