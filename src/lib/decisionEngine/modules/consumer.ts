import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

export const analyseConsumerDispute = ({
  normalisedText,
}: DecisionModuleInput): DecisionResult => {
  const amountMentioned = findAmount(normalisedText);
  const mentionsFault =
    /faulty|not fit for purpose|broken|repair|replacement/i.test(
      normalisedText,
    );
  const mentionsRefund = /refund refused|refund rejected|refused refund/i.test(
    normalisedText,
  );
  const mentionsDelivery = /missing parcel|not delivered|delivery/i.test(
    normalisedText,
  );

  return {
    documentType: "consumer_dispute",
    title: "Consumer dispute check",
    plainEnglishSummary:
      "This looks like a consumer problem with a purchase, delivery, repair, replacement, refund, warranty, or complaint.",
    caseStrength:
      mentionsFault || mentionsRefund || mentionsDelivery
        ? "possible_ground"
        : "not_enough_information",
    strengthLabel:
      mentionsFault || mentionsRefund || mentionsDelivery
        ? "Possible grounds"
        : "Need more information",
    whatThisLooksLike:
      "This appears to involve a product, service, delivery, refund, warranty, or complaint issue.",
    possibleGrounds: [
      ...(mentionsFault
        ? [
            "There may be an issue with the item being faulty or not as expected.",
          ]
        : []),
      ...(mentionsRefund
        ? ["The refund refusal may need a written explanation and evidence."]
        : []),
      ...(mentionsDelivery
        ? [
            "Delivery evidence may be important if the item was missing or not received.",
          ]
        : []),
      "The strength depends on dates, proof of purchase, what was promised, and what went wrong.",
    ],
    evidenceNeeded: [
      "Receipt, order confirmation, invoice, or payment proof.",
      "Photos or videos of the fault or problem if relevant.",
      "Delivery tracking and messages from the seller.",
      "Dates: purchase, delivery, complaint, repair, refund refusal.",
      "Any warranty or product-support wording.",
    ],
    deadlines: [
      "Check any return, warranty, repair, delivery, or complaint deadline before waiting.",
    ],
    risks: [
      "Do not assume a refund is certain.",
      "Keep communication in writing where possible.",
      "Avoid sending unnecessary bank/card details by email.",
    ],
    nextSteps: [
      "Ask the seller/company for a written explanation.",
      "Send the key evidence and ask for the outcome you want reviewed.",
      "Keep a copy of the response and any reference number.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot promise a refund, repair, replacement, or complaint outcome.",
    ],
    draftMessage: `Subject: Request to review purchase issue

Hello,

I am asking you to review this issue.

Order/reference: [add reference]
Purchase date: [add date]
Issue: [briefly describe the problem]

Please confirm what evidence you need and review whether a refund, repair, replacement, or other resolution is available.

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
    ],
  };
};
