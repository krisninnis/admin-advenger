import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

export const analyseUnknownAdminDispute = (
  _input: DecisionModuleInput,
): DecisionResult => ({
  documentType: "unknown_admin_dispute",
  title: "Admin message check",
  plainEnglishSummary:
    "I cannot tell clearly what kind of admin problem this is from the text provided.",
  caseStrength: "not_enough_information",
  strengthLabel: "Not enough information",
  whatThisLooksLike:
    "This may still be worth checking, but AdminAvenger needs more of the letter, email, bill, or notice to give a useful result.",
  possibleGrounds: [
    "No clear challenge ground was found from this text alone.",
  ],
  evidenceNeeded: [
    "Full letter, email, bill, or notice.",
    "Date, sender/company, reference number, and amount if there is one.",
    "What you think is wrong or unfair.",
    "Any deadline or action requested.",
  ],
  deadlines: ["Check the original message for any deadline before waiting."],
  risks: [
    "Do not ignore urgent, court, bailiff, debt, or payment wording.",
    "Do not click links or share bank/login details if the message seems suspicious.",
  ],
  nextSteps: [
    "Paste more of the message if safe.",
    "Remove passwords, account numbers, or private details before pasting.",
    "Use an official website or trusted contact route if the message feels risky.",
  ],
  safetyNotes: [DECISION_SAFETY_NOTE],
  amountTreatment: "no_money_counted",
  sourceFacts: [],
});
