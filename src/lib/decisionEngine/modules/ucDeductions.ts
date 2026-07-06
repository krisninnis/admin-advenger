import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Universal Credit deductions/overpayment engine. Handles a standalone
// overpayment decision or deduction notice (not a full monthly statement -
// see ucStatement.ts for that). Money safety: an overpayment is money DWP
// says is owed back, never a saving to the user, and a possible dispute is
// never treated as money already reduced or recovered.
const genericMoneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const overpaymentAmountPattern = /overpayment (?:of|totalling)?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const deductionRatePattern = /(£\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:per|a|\/)\s*(?:month|week)/i;
const causePattern = /(?:overpayment|debt) (?:arose|happened|occurred|was caused)[^.\n]*/i;

export const analyseUcDeductions = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const sourceFacts: DecisionSourceFact[] = [];
  const uncertainty: string[] = [];

  const overpaymentAmountMatch = normalisedText.match(overpaymentAmountPattern);
  if (overpaymentAmountMatch) {
    sourceFacts.push({ label: "Overpayment amount mentioned", value: overpaymentAmountMatch[1] });
  } else {
    uncertainty.push("The total overpayment or deduction amount is not clearly stated in this text.");
  }

  const deductionRateMatch = normalisedText.match(deductionRatePattern);
  if (deductionRateMatch) {
    sourceFacts.push({ label: "Deduction rate mentioned", value: deductionRateMatch[0] });
  }

  const causeMatch = normalisedText.match(causePattern);
  if (causeMatch) {
    sourceFacts.push({ label: "Reason given", value: causeMatch[0].trim() });
  } else {
    uncertainty.push("The reason DWP gives for the overpayment is not clear from this text alone.");
  }

  const disputesAmount = /(?:dispute|disagree|do not think|don't think|wrong)/i.test(normalisedText);

  const amountMatch = overpaymentAmountMatch ?? normalisedText.match(genericMoneyPattern);
  const amountMentioned = amountMatch ? (amountMatch[1].startsWith("£") ? amountMatch[1] : `£${amountMatch[1]}`) : undefined;

  return {
    documentType: "benefits_uc_deductions",
    title: "Universal Credit deduction/overpayment check",
    plainEnglishSummary:
      "This looks like a notice about a Universal Credit overpayment or a deduction being taken from your payment.",
    caseStrength: disputesAmount ? "possible_ground" : "not_enough_information",
    strengthLabel: disputesAmount ? "Possible grounds to query the overpayment" : "Check the notice details",
    whatThisLooksLike:
      "Overpayment and deduction notices explain why DWP say money is owed back, how much, and the rate being taken from your Universal Credit. The amount here is money DWP say is owed, never a saving to you.",
    possibleGrounds: [
      "You may be able to dispute the overpayment if you think the amount, the reason, or your responsibility for it is wrong.",
      "You can ask DWP for a lower deduction rate if the repayments are causing hardship.",
      ...(disputesAmount
        ? ["You have indicated you disagree with this - gather evidence and dates before responding."]
        : []),
    ],
    confidence: {
      level: overpaymentAmountMatch && causeMatch ? "high" : overpaymentAmountMatch || causeMatch ? "medium" : "low",
      reason:
        overpaymentAmountMatch && causeMatch
          ? "The notice states both an overpayment amount and the reason given."
          : "Some parts of a standard overpayment/deduction notice were found, but not all of it.",
    },
    uncertainty,
    cannotKnow: [
      "Whether the overpayment decision itself was correct.",
      "Whether the deduction rate is DWP's standard rate or a higher rate that could be reduced.",
      "Whether you are responsible for the overpayment or whether it was a DWP error.",
    ],
    evidenceNeeded: [
      "The full overpayment decision letter or deduction notice.",
      "Your own records of income, hours, or circumstances during the period in question.",
      "Any previous correspondence about the same overpayment.",
    ],
    deadlines: [
      "Check the letter for a Mandatory Reconsideration or appeal deadline if you want to dispute the overpayment decision itself.",
    ],
    risks: [
      "Deductions are not a fine you can ignore - unpaid amounts usually continue to be recovered from future payments.",
      "Do not assume the overpayment is wrong without checking the decision letter and your own records first.",
    ],
    nextSteps: [
      "Check the reason DWP gives for the overpayment and the amount.",
      "Ask for a written breakdown if the calculation is unclear.",
      "Consider asking for a Mandatory Reconsideration if you disagree with the overpayment decision itself, not just the rate.",
      "Ask about a lower deduction rate if the repayments are causing hardship.",
    ],
    safetyNotes: [BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE],
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "Do you agree with the reason given for the overpayment?",
      "Is the deduction rate causing hardship?",
      "Do you have records from the period the overpayment covers?",
    ],
  };
};
