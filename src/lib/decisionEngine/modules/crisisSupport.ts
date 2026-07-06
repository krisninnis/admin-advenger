import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Crisis help / local welfare signposting engine. Pure signposting - it does
// not assess grounds or predict an outcome, so possibleGrounds stays mostly
// empty (decision-engine-standard.md Section 3: fine to leave empty for a
// category where "grounds" doesn't really apply). It never invents a helpline
// number, a scheme name that may not exist locally, or a guaranteed amount.
const urgentCrisisPattern =
  /(?:no food|nothing to eat|cannot afford food|can't afford food|no heating|cannot heat|can't heat|no gas or electric|homeless|being evicted|eviction|unsafe|nowhere to sleep)/i;

const schemeMentions: Array<{ label: string; pattern: RegExp }> = [
  { label: "Discretionary Housing Payment (DHP)", pattern: /discretionary housing payment|\bdhp\b/i },
  { label: "Local welfare assistance / crisis grant", pattern: /local welfare assistance|crisis grant|welfare assistance scheme/i },
  { label: "Hardship fund", pattern: /hardship fund/i },
  { label: "Budgeting advance", pattern: /\bbudgeting advance\b/i },
  { label: "Short-term benefit advance", pattern: /short term benefit advance/i },
  { label: "Foodbank referral", pattern: /foodbank|food bank/i },
];

export const analyseCrisisSupport = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const isUrgent = urgentCrisisPattern.test(normalisedText);
  const schemesFound = schemeMentions.filter((entry) => entry.pattern.test(normalisedText));

  const sourceFacts: DecisionSourceFact[] = schemesFound.map((entry) => ({
    label: "Scheme mentioned",
    value: entry.label,
  }));

  return {
    documentType: "benefits_crisis_support",
    title: "Crisis help / local welfare support check",
    plainEnglishSummary: isUrgent
      ? "This looks like an urgent situation - not being able to cover food, heating, or housing right now. There may be local and national help available today."
      : "This looks like a question about emergency or short-term help, such as a Discretionary Housing Payment, local welfare assistance, a budgeting advance, or a foodbank referral.",
    caseStrength: isUrgent ? "urgent_get_advice" : "not_enough_information",
    strengthLabel: isUrgent ? "Urgent - get help today" : "Signposting - check what may be available",
    whatThisLooksLike:
      "Several different kinds of short-term help exist: a Discretionary Housing Payment (help with rent shortfalls), local welfare assistance or a crisis grant (council-run, varies by area), a budgeting advance or short-term benefit advance (repayable, from DWP), and foodbank referrals for immediate food needs.",
    possibleGrounds: [],
    confidence: {
      level: schemesFound.length > 0 ? "medium" : "low",
      reason:
        schemesFound.length > 0
          ? "The message names a specific scheme that AdminAvenger recognises."
          : "The message describes a possible crisis or hardship situation, but does not name a specific scheme.",
    },
    uncertainty: [
      "Whether a specific scheme is available in your local area is not something AdminAvenger can check from this text alone.",
    ],
    cannotKnow: [
      "Whether you will be eligible for any of these schemes.",
      "How much, if anything, you might receive.",
      "Which schemes your specific local council currently runs.",
    ],
    evidenceNeeded: [
      "Proof of your current income and outgoings (rent, bills, essential costs).",
      "Any letter or evidence showing the shortfall (rent statement, benefit decision, eviction notice).",
      "Whether you have already asked your council or DWP about this.",
    ],
    deadlines: isUrgent
      ? ["If you have no food, heating, or safe housing today, contact your council's welfare team or a local support service as soon as possible - do not wait."]
      : ["Ask sooner rather than later - crisis and hardship funds are often limited and can run out."],
    risks: [
      "Budgeting advances and short-term benefit advances are usually repayable and are deducted from future payments.",
      "Local welfare assistance and crisis grants vary a lot by council and may have limited funding.",
    ],
    nextSteps: [
      "If this is urgent (no food, heating, or safe housing), contact your local council's welfare assistance team or a local support service today.",
      "Ask your council what local welfare assistance or crisis grant schemes it currently runs.",
      "Ask DWP about a Discretionary Housing Payment (for rent shortfalls), or a budgeting advance/short-term benefit advance if you need a repayable advance.",
      "Citizens Advice can help you find the right local scheme if you are not sure where to start.",
    ],
    safetyNotes: [
      BENEFITS_SAFETY_NOTE,
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot apply for support on your behalf, and cannot guarantee any payment or amount. It only explains what kinds of help may exist and where to ask.",
    ],
    amountTreatment: "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "What is the most urgent cost you are struggling with right now (food, heating, rent)?",
      "Have you already contacted your council or DWP about this?",
      "Do you have any evidence of the shortfall (rent statement, bills, benefit decision)?",
    ],
  };
};
