import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Universal Credit sanction + hardship engine. A sanction is a temporary
// reduction (sometimes to nil) of the standard allowance, usually because DWP
// decided a work-related requirement was missed without good reason. This
// module never asserts whether the sanction itself was right or wrong - it
// explains the Mandatory Reconsideration route, the hardship support option,
// and what evidence would matter.
const genericMoneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const sanctionStartPattern = /sanction (?:starts?|started|begins?|will start)\s*(?:on)?\s*([^.\n]+)/i;
const mandatoryReconsiderationPattern = /mandatory reconsideration/i;
const hardshipPattern = /hardship/i;
const goodReasonPattern = /good reason/i;

export const analyseUcSanction = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const sourceFacts: DecisionSourceFact[] = [];
  const uncertainty: string[] = [];

  const startDateMatch = normalisedText.match(sanctionStartPattern);
  if (startDateMatch) {
    sourceFacts.push({
      label: "Sanction start date",
      value: startDateMatch[1].trim(),
      sourceQuote: startDateMatch[0].trim(),
    });
  } else {
    uncertainty.push("The exact sanction start date was not found in this text.");
  }

  const mentionsMandatoryReconsideration = mandatoryReconsiderationPattern.test(normalisedText);
  const mentionsHardship = hardshipPattern.test(normalisedText);
  const mentionsGoodReason = goodReasonPattern.test(normalisedText);

  if (!mentionsGoodReason) {
    uncertainty.push("Whether you had a 'good reason' for missing the requirement is not stated in this text.");
  }

  const possibleGrounds = [
    "You can ask for a Mandatory Reconsideration of the sanction decision if you disagree with it or had a good reason for missing the requirement.",
    "Hardship support may be available if you cannot pay for food, heating, or rent while the sanction applies.",
    ...(mentionsMandatoryReconsideration
      ? ["The notice already mentions Mandatory Reconsideration, so check the deadline shown."]
      : []),
  ];

  const amountMatch = normalisedText.match(genericMoneyPattern);
  const amountMentioned = amountMatch ? `£${amountMatch[1]}` : undefined;

  return {
    documentType: "benefits_uc_sanction",
    title: "Universal Credit sanction check",
    plainEnglishSummary:
      "This looks like a notice about a Universal Credit sanction - a temporary reduction in your payment, usually because DWP decided a work-related requirement was not met.",
    caseStrength: "urgent_get_advice",
    strengthLabel: "Sanction - check the deadline and hardship options",
    whatThisLooksLike:
      "Sanction notices explain why DWP reduced your payment, from what date, and your right to ask for a Mandatory Reconsideration if you disagree.",
    possibleGrounds,
    confidence: {
      level: startDateMatch ? "high" : "medium",
      reason: startDateMatch
        ? "The notice states a clear sanction start date and matches standard sanction notice wording."
        : "The notice matches standard sanction wording, but no clear start date was found in this text.",
    },
    uncertainty,
    cannotKnow: [
      "Whether DWP will accept your reason for missing the requirement as a 'good reason'.",
      "Whether a hardship payment application will be approved for your circumstances.",
      "The exact length of the sanction beyond what is stated in this text.",
    ],
    evidenceNeeded: [
      "The full sanction decision letter or notice, including the reason given.",
      "Proof of any good reason for missing the requirement (medical evidence, travel disruption, caring responsibility, appointment letters).",
      "Your Universal Credit journal messages or call logs around the missed requirement.",
    ],
    deadlines: [
      "You usually need to ask for a Mandatory Reconsideration within one month of the sanction decision - check the exact date on the letter, not just the sanction start date.",
    ],
    risks: [
      "A sanction can reduce or stop your standard allowance for days, weeks, or longer depending on the type.",
      "Missing the Mandatory Reconsideration deadline can make the decision harder to challenge.",
      "Hardship payments do not always cover the full amount lost and may need to be repaid depending on your circumstances.",
    ],
    nextSteps: [
      "Check the reason DWP gave for the sanction and the exact decision date.",
      "Gather evidence of any good reason you had for missing the requirement.",
      "Ask for a Mandatory Reconsideration if you disagree with the decision.",
      mentionsHardship
        ? "The notice mentions hardship support - consider asking DWP about this if you cannot cover food, heating, or rent."
        : "If you cannot pay for food, heating, or rent while the sanction applies, ask DWP about hardship support.",
    ],
    safetyNotes: [BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE],
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "What reason did DWP give for the sanction?",
      "Did you have a good reason for missing the requirement?",
      "What is the exact decision date on the letter (not just the sanction start date)?",
    ],
  };
};
