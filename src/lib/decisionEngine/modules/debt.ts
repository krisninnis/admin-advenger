import type {
  DecisionDocumentType,
  DecisionModuleInput,
  DecisionResult,
} from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

export const analyseDebtOrBailiff = (
  { normalisedText }: DecisionModuleInput,
  documentType: Extract<
    DecisionDocumentType,
    "debt_collection" | "bailiff_notice"
  >,
): DecisionResult => {
  const isBailiff = documentType === "bailiff_notice";
  const amountMentioned = findAmount(normalisedText);

  return {
    documentType,
    title: isBailiff
      ? "Bailiff or enforcement notice check"
      : "Debt letter check",
    plainEnglishSummary: isBailiff
      ? "This looks like a bailiff or enforcement notice. This may be urgent, so do not ignore it."
      : "This looks like a debt collection letter. Check the creditor, reference, amount, and deadline before responding.",
    caseStrength: isBailiff ? "urgent_get_advice" : "possible_ground",
    strengthLabel: isBailiff ? "Urgent — get advice" : "Check the debt",
    whatThisLooksLike: isBailiff
      ? "This appears to involve bailiffs, enforcement, court, or formal recovery action."
      : "This appears to be about a debt, arrears, or money being chased by a company or collector.",
    possibleGrounds: [
      "The amount, creditor, or reference may need checking.",
      "You may need proof of what the debt is for and how the amount was calculated.",
      "If you already paid, have an arrangement, or dispute the account, gather that evidence.",
    ],
    evidenceNeeded: [
      "Original bill, agreement, account statement, or demand letter.",
      "Creditor name and reference number.",
      "Breakdown of the amount, fees, and dates.",
      "Proof of payments or payment plan if available.",
      "Any letters from court, council, creditor, or enforcement company.",
    ],
    deadlines: [
      isBailiff
        ? "Check any enforcement deadline immediately. Get free debt advice quickly if bailiffs, court, warrant, or seizure is mentioned."
        : "Check the reply/payment deadline before waiting.",
    ],
    risks: [
      "Do not ignore court, bailiff, enforcement, or council tax letters.",
      "Do not assume the debt is wrong without checking the paperwork.",
      "Do not share bank details with anyone unless you are sure you are using an official route.",
    ],
    nextSteps: [
      "Check who the original creditor is.",
      "Ask for a clear breakdown if the amount is unclear.",
      isBailiff
        ? "Contact free debt advice urgently if you are unsure what to do."
        : "Respond through a trusted contact route if you need more information.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot tell you whether you do or do not owe the debt. It helps you check the notice and prepare questions.",
    ],
    draftMessage: `Subject: Request for debt details and evidence

Hello,

I am contacting you about the letter I received.

Reference: [add reference]
Account/creditor: [add creditor if known]

Please provide a clear breakdown of the amount claimed, including the original creditor, dates, fees, and any payments already recorded.

I am reviewing the information and need this evidence before I can respond properly.

Kind regards,`,
    amountMentioned,
    amountTreatment: amountMentioned
      ? "amount_being_demanded"
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
    ],
  };
};
