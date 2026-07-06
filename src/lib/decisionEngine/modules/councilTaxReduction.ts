import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

// Council Tax Reduction / Council Tax Support engine. Unlike PIP/UC, CTR/CTS
// is run by the local council under its own local scheme - there is no single
// national rate, so AdminAvenger can never calculate or confirm an exact
// reduction. This engine explains the process and evidence, and is explicit
// about the local-scheme cannotKnow rather than guessing a figure.
const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

const awardedPattern = /(?:reduction|support|award)[^.\n]{0,20}(?:has been|is|of)\s*(?:awarded|applied|reduced|increased)/i;
const refusedPattern = /(?:refused|rejected|not entitled|not awarded)/i;
const appealRoutePattern = /valuation tribunal/i;

export const analyseCouncilTaxReduction = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const amountMentioned = findAmount(normalisedText);
  const wasAwarded = awardedPattern.test(normalisedText);
  const wasRefused = refusedPattern.test(normalisedText);
  const mentionsAppealRoute = appealRoutePattern.test(normalisedText);

  const sourceFacts: DecisionSourceFact[] = [
    ...(amountMentioned ? [{ label: "Amount mentioned", value: amountMentioned, sourceQuote: amountMentioned }] : []),
    ...(wasAwarded ? [{ label: "Reduction/support outcome mentioned", value: "Awarded or changed" }] : []),
    ...(wasRefused ? [{ label: "Reduction/support outcome mentioned", value: "Refused" }] : []),
  ];

  return {
    documentType: "council_tax_reduction",
    title: "Council Tax Reduction / Support check",
    plainEnglishSummary:
      "This looks like a message about Council Tax Reduction (sometimes called Council Tax Support), which is means-tested help with your council tax bill run by your local council.",
    caseStrength: wasRefused ? "possible_ground" : "not_enough_information",
    strengthLabel: wasRefused ? "Possible grounds to ask for a review" : "Check your local council's scheme",
    whatThisLooksLike:
      "Council Tax Reduction/Support is run by each local council under its own local scheme, so the rules, taper rates, and maximum reduction are not the same everywhere.",
    possibleGrounds: [
      ...(wasRefused
        ? ["You can usually ask the council to reconsider a refusal or reduced award before appealing further."]
        : []),
      "Whether the amount is right depends on your council's own scheme rules, which AdminAvenger cannot look up from this text alone.",
    ],
    confidence: {
      level: wasAwarded || wasRefused ? "medium" : "low",
      reason:
        wasAwarded || wasRefused
          ? "The message describes a Council Tax Reduction/Support outcome, but the local scheme rules behind it are not known."
          : "The message mentions Council Tax Reduction/Support, but not a clear outcome or amount.",
    },
    uncertainty: [
      "Which local council scheme applies, and its specific rules, is not stated in this text.",
      ...(mentionsAppealRoute ? [] : ["Whether an appeal to the Valuation Tribunal is the right next step for this case is not clear from this text alone."]),
    ],
    cannotKnow: [
      "The exact reduction percentage or amount you should get - this depends on your council's local scheme, which AdminAvenger cannot look up.",
      "Whether the council's decision is correct under its own scheme rules.",
    ],
    evidenceNeeded: [
      "The full Council Tax Reduction/Support decision letter.",
      "Your income, savings, and household details used in the assessment.",
      "Your council's published Council Tax Reduction/Support scheme, if you can find it.",
    ],
    deadlines: [
      "Ask the council to reconsider quickly if you disagree - most councils expect this within a few weeks, but check the exact time limit on the letter.",
    ],
    risks: [
      "Do not assume a fixed national reduction rate applies - it varies by council.",
      "Missing the council's own review deadline can make a refusal harder to challenge.",
    ],
    nextSteps: [
      "Check your council's own Council Tax Reduction/Support scheme rules.",
      "Ask the council for a written explanation of how the amount was worked out.",
      "Ask the council to reconsider if you disagree, and check whether a further appeal to the Valuation Tribunal applies.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger does not give benefits or council tax advice and cannot calculate your Council Tax Reduction/Support amount.",
    ],
    amountMentioned,
    amountTreatment: amountMentioned
      ? wasAwarded
        ? "possible_refund_or_reduction"
        : "amount_mentioned_only"
      : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "What does your council's own scheme say about the maximum reduction?",
      "Has your income or household changed since the last assessment?",
      "Do you want to ask the council to reconsider?",
    ],
  };
};
