import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

const hasAny = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

// Matches "signage", "unclear signs", or "signs were unclear" (either word order).
const signageUnclearPattern = /signage|sign[a-z]*[^.]{0,25}unclear|unclear[^.]{0,25}sign/i;

export const analyseParkingTicket = ({
  normalisedText,
}: DecisionModuleInput): DecisionResult => {
  const amountMentioned = findAmount(normalisedText);

  const hasReason = hasAny(normalisedText, [
    signageUnclearPattern,
    /paid/i,
    /payment/i,
    /wrong vehicle/i,
    /wrong registration/i,
    /wrong location/i,
    /wrong date/i,
    /machine/i,
    /app problem/i,
    /blue badge/i,
    /disability/i,
    /emergency/i,
    /permit/i,
    /grace period/i,
  ]);

  const possibleGrounds: string[] = [];

  if (signageUnclearPattern.test(normalisedText)) {
    possibleGrounds.push("Signs may not have been clear or easy to see.");
  }

  if (/paid|payment/i.test(normalisedText)) {
    possibleGrounds.push(
      "You may be able to show that parking was paid for or attempted.",
    );
  }

  if (
    /wrong vehicle|wrong registration|wrong location|wrong date/i.test(
      normalisedText,
    )
  ) {
    possibleGrounds.push("There may be a wrong detail on the notice.");
  }

  if (/machine|app problem/i.test(normalisedText)) {
    possibleGrounds.push(
      "There may have been a payment machine or app problem.",
    );
  }

  if (/blue badge|disability/i.test(normalisedText)) {
    possibleGrounds.push(
      "There may be disability or Blue Badge evidence to explain.",
    );
  }

  if (/emergency|medical/i.test(normalisedText)) {
    possibleGrounds.push("There may have been an emergency or medical reason.");
  }

  if (/permit/i.test(normalisedText)) {
    possibleGrounds.push("There may be permit or session evidence to provide.");
  }

  if (possibleGrounds.length === 0 && hasReason) {
    possibleGrounds.push(
      "You have mentioned a possible reason to challenge, but the evidence will matter.",
    );
  }

  const deadlines: string[] = [];

  if (/14 days/i.test(normalisedText)) {
    deadlines.push(
      "The notice mentions 14 days. Check whether this is a discount or appeal deadline.",
    );
  }

  if (/28 days/i.test(normalisedText)) {
    deadlines.push(
      "The notice mentions 28 days. Check the exact deadline before waiting.",
    );
  }

  if (/popla/i.test(normalisedText)) {
    deadlines.push(
      "POPLA is mentioned. Check the appeal route and any deadline on the notice.",
    );
  }

  if (/ias/i.test(normalisedText)) {
    deadlines.push(
      "IAS is mentioned. Check the appeal route and any deadline on the notice.",
    );
  }

  const caseStrength = hasReason
    ? "possible_ground"
    : "weak_or_missing_evidence";
  const strengthLabel = hasReason ? "Possible grounds" : "Needs more proof";

  return {
    documentType: "parking_ticket",
    title: "Parking notice check",
    plainEnglishSummary: hasReason
      ? "This looks like a parking ticket or parking charge where you may have grounds to challenge it, but the proof matters."
      : "This looks like a parking ticket or parking charge, but I cannot see a clear challenge reason from this text alone.",
    caseStrength,
    strengthLabel,
    whatThisLooksLike:
      "This appears to be a parking notice, PCN, or private parking charge. The amount is treated as money being demanded, not money saved or recovered.",
    possibleGrounds:
      possibleGrounds.length > 0
        ? possibleGrounds
        : ["I cannot see a strong challenge ground yet from this text alone."],
    evidenceNeeded: [
      "Photo of the notice.",
      "Photos of signs at the car park or street.",
      "Payment proof, app receipt, ticket, permit, or booking evidence if available.",
      "Vehicle registration, location, date, and reference number.",
      "Any medical, emergency, disability, or Blue Badge evidence if relevant.",
    ],
    deadlines:
      deadlines.length > 0
        ? deadlines
        : [
            "Check the notice for any 14-day, 28-day, discount, appeal, or payment deadline.",
          ],
    risks: [
      "Do not ignore a parking notice without checking the deadline and appeal route.",
      "Challenging may affect whether a reduced payment amount remains available.",
      "Private parking and council parking notices can have different appeal routes.",
    ],
    nextSteps: [
      "Check whether this is a council PCN or a private parking charge.",
      "Gather the proof before writing the challenge.",
      "Use the appeal or challenge route shown on the notice.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot tell you that an appeal will succeed. It helps you organise possible grounds and evidence.",
    ],
    draftMessage: `Subject: Parking notice review request

Hello,

I am asking you to review this parking notice.

Notice/reference: [add reference]
Vehicle registration: [add registration]
Date/location: [add date/location]

I believe the notice may be wrong because:
[brief reason]

Evidence I can provide:
[photos/payment proof/permit/appointment proof]

Please review the notice and confirm what evidence you need. If you reject this challenge, please explain the reason and the next appeal route.

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
