import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

export const analyseBankComplaint = ({
  normalisedText,
}: DecisionModuleInput): DecisionResult => {
  const amountMentioned = findAmount(normalisedText);
  const mentionsFinalResponse = /final response|deadlock/i.test(normalisedText);
  const mentionsOmbudsman = /financial ombudsman|ombudsman/i.test(
    normalisedText,
  );

  return {
    documentType: "bank_complaint",
    title: "Bank complaint check",
    plainEnglishSummary:
      "This looks like a bank or finance complaint. AdminAvenger can help organise the issue, evidence, and next step.",
    caseStrength:
      mentionsFinalResponse || mentionsOmbudsman
        ? "possible_ground"
        : "not_enough_information",
    strengthLabel:
      mentionsFinalResponse || mentionsOmbudsman
        ? "Complaint route visible"
        : "Need more information",
    whatThisLooksLike:
      "This appears to involve a bank complaint, final response, chargeback, fee, account issue, or ombudsman route.",
    possibleGrounds: [
      "You may be able to ask for a written explanation and evidence.",
      "If a final response or deadlock letter is present, there may be an escalation route to check.",
      "If a fee, closure, refund refusal, or marker is disputed, dates and written proof matter.",
    ],
    evidenceNeeded: [
      "Bank letter or final response.",
      "Complaint reference.",
      "Timeline of what happened.",
      "Statements, screenshots, chargeback evidence, or transaction proof.",
      "Any previous complaint emails or messages.",
    ],
    deadlines: [
      mentionsFinalResponse || mentionsOmbudsman
        ? "The letter may include an escalation deadline. Check it before waiting."
        : "Check whether the bank has given a complaint response deadline.",
    ],
    risks: [
      "Do not assume an escalation route is available unless the letter or official guidance supports it.",
      "Keep all evidence and dates.",
      "Do not share login details or one-time codes.",
    ],
    nextSteps: [
      "Ask for a written explanation if the decision is unclear.",
      "Keep a timeline and evidence pack.",
      "If a final response is present, check the official escalation route and deadline.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot promise that a bank complaint or escalation will succeed; the outcome is not decided by this tool.",
    ],
    draftMessage: `Subject: Complaint review request

Hello,

I am asking you to review this complaint/decision.

Reference: [add reference]
Account/product: [add account or product if safe]
Date of decision: [add date]

Please provide a clear explanation of the decision and the evidence used. If this is your final response, please confirm the next escalation route and any deadline.

Kind regards,`,
    amountMentioned,
    amountTreatment: amountMentioned
      ? "amount_mentioned_only"
      : "no_money_counted",
    sourceFacts: [
      ...(amountMentioned
        ? [
            {
              label: "Amount mentioned",
              value: amountMentioned,
              sourceQuote: amountMentioned,
            },
          ]
        : []),
      ...(mentionsFinalResponse
        ? [{ label: "Final response/deadlock mentioned", value: "Yes" }]
        : []),
    ],
  };
};
