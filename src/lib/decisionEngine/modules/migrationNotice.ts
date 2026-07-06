import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Migration Notice engine. A Migration Notice tells someone on an existing
// "legacy" benefit (tax credits, income-based JSA/ESA, Income Support,
// Housing Benefit) that they must claim Universal Credit by a fixed deadline
// day, or their old benefit stops with no automatic replacement. This is
// treated as urgent by default because missing the deadline day can leave
// someone with no income while a new claim is processed.
const moneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const findAmount = (text: string) => {
  const match = text.match(moneyPattern);
  return match ? `£${match[1]}` : undefined;
};

const deadlineDayPattern =
  /(?:deadline day|claim universal credit by|you must claim by|apply by)[^.\n]{0,10}?(\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/i;
const legacyBenefitPattern =
  /(tax credits?|working tax credit|child tax credit|income support|income-based jobseeker's allowance|income-related employment and support allowance|housing benefit|\bjsa\b|\besa\b)/i;

export const analyseMigrationNotice = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const sourceFacts: DecisionSourceFact[] = [];
  const uncertainty: string[] = [];

  const deadlineMatch = normalisedText.match(deadlineDayPattern);
  if (deadlineMatch) {
    sourceFacts.push({ label: "Deadline day mentioned", value: deadlineMatch[1], sourceQuote: deadlineMatch[0].trim() });
  } else {
    uncertainty.push("The exact deadline day for claiming Universal Credit is not clear from this text alone.");
  }

  const legacyBenefitMatch = normalisedText.match(legacyBenefitPattern);
  if (legacyBenefitMatch) {
    sourceFacts.push({ label: "Existing benefit mentioned", value: legacyBenefitMatch[1] });
  } else {
    uncertainty.push("Which of your existing benefits will end is not named clearly in this text.");
  }

  const amountMentioned = findAmount(normalisedText);
  if (amountMentioned) {
    sourceFacts.push({ label: "Amount mentioned", value: amountMentioned, sourceQuote: amountMentioned });
  }

  return {
    documentType: "benefits_migration_notice",
    title: "Universal Credit migration notice check",
    plainEnglishSummary:
      "This looks like a Migration Notice telling you to claim Universal Credit by a fixed deadline day, because an existing benefit is ending.",
    caseStrength: "urgent_get_advice",
    strengthLabel: "Urgent - check the deadline day",
    whatThisLooksLike:
      "A Migration Notice is a formal letter moving someone from an existing benefit (such as tax credits, income-based JSA/ESA, Income Support, or Housing Benefit) onto Universal Credit. Missing the deadline day can stop the old benefit with no automatic Universal Credit payment in its place.",
    possibleGrounds: [
      "You may be able to ask for the deadline to be extended if you have a good reason and ask before it passes.",
      "Transitional protection may apply if your Universal Credit amount would otherwise be lower - this depends on rules AdminAvenger cannot calculate from this text alone.",
    ],
    confidence: {
      level: deadlineMatch && legacyBenefitMatch ? "high" : deadlineMatch || legacyBenefitMatch ? "medium" : "low",
      reason:
        deadlineMatch && legacyBenefitMatch
          ? "The text names both the deadline day and the existing benefit that is ending."
          : "The text matches Migration Notice wording, but not all details were found.",
    },
    uncertainty,
    cannotKnow: [
      "Whether you will be financially better or worse off under Universal Credit.",
      "Your exact Universal Credit entitlement amount.",
      "Whether transitional protection would apply to your circumstances.",
    ],
    evidenceNeeded: [
      "The full Migration Notice, including the exact deadline day.",
      "Details of your current income, savings, and capital.",
      "Your current housing costs and household members.",
      "Any health condition or caring responsibility that could affect your Universal Credit claim.",
    ],
    deadlines: [
      deadlineMatch
        ? `Check the exact deadline day shown (around ${deadlineMatch[1]}) - claiming after this can stop your old benefit with no automatic replacement.`
        : "Check the exact deadline day on the notice - missing it can stop your old benefit with no automatic replacement.",
    ],
    risks: [
      "Missing the deadline day can stop your current benefit with no automatic Universal Credit payment in its place.",
      "Universal Credit is usually paid monthly in arrears and the first payment can take around five weeks - budget ahead if possible.",
      "Once you claim Universal Credit, you cannot go back to the old benefit even if Universal Credit pays less, other than in limited circumstances.",
    ],
    nextSteps: [
      "Check the exact deadline day on the notice.",
      "Gather income, savings, housing cost, and health evidence before you claim.",
      "Consider getting advice about transitional protection before you claim, especially if your income, savings, or capital have changed.",
      "Claim before the deadline day unless you have arranged an extension.",
    ],
    safetyNotes: [
      BENEFITS_SAFETY_NOTE,
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot tell you whether you will be better or worse off under Universal Credit, or whether transitional protection applies to you.",
    ],
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "What is the deadline day shown on the notice?",
      "Which benefits are ending?",
      "Do you have savings or capital over £16,000?",
      "Has your income changed since your last award?",
    ],
  };
};
