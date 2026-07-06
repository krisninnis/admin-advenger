import type { DecisionAmountTreatment, DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Universal Credit statement checker. Reads a UC payment statement/breakdown
// and explains the assessment period, allowances, and any deductions -
// without ever counting a deduction as a saving or an entitlement as
// recovered money (decision-engine-standard.md Section 4).
const genericMoneyPattern = /(?:£|GBP\s?)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const assessmentPeriodPattern =
  /assessment period:?\s*([^\n]+?)(?=\s+standard allowance|\s+housing:?|\s+total before|\s+what we take off|\s+advance repayment|\s+overpayment recovery|\s+(?:your\s+)?payment this month|\s+deductions:?|$)/i;

const standardAllowancePattern = /standard allowance:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const housingPattern = /housing:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const totalBeforeDeductionsPattern = /total before deductions:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const advanceRepaymentPattern = /advance repayment:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const overpaymentRecoveryPattern = /overpayment recovery:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const thirdPartyDeductionPattern = /third party deduction[a-z]*:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const paymentThisMonthPattern = /(?:your\s+)?payment this month:?\s*(£\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const deductionsSectionPattern = /what we take off|deductions:/i;

export const analyseUcStatement = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const sourceFacts: DecisionSourceFact[] = [];
  const uncertainty: string[] = [];

  const assessmentPeriodMatch = normalisedText.match(assessmentPeriodPattern);
  if (assessmentPeriodMatch) {
    sourceFacts.push({
      label: "Assessment period",
      value: assessmentPeriodMatch[1].trim(),
      sourceQuote: assessmentPeriodMatch[0].trim(),
    });
  } else {
    uncertainty.push("Exact dates of the assessment period are not confirmed.");
  }

  const standardAllowanceMatch = normalisedText.match(standardAllowancePattern);
  if (standardAllowanceMatch) {
    sourceFacts.push({ label: "Standard allowance", value: standardAllowanceMatch[1] });
  }

  const housingMatch = normalisedText.match(housingPattern);
  if (housingMatch) {
    sourceFacts.push({ label: "Housing element", value: housingMatch[1] });
  }

  const totalBeforeMatch = normalisedText.match(totalBeforeDeductionsPattern);
  if (totalBeforeMatch) {
    sourceFacts.push({ label: "Total before deductions", value: totalBeforeMatch[1] });
  }

  const hasDeductionsSection = deductionsSectionPattern.test(normalisedText);
  const advanceMatch = normalisedText.match(advanceRepaymentPattern);
  const overpaymentMatch = normalisedText.match(overpaymentRecoveryPattern);
  const thirdPartyMatch = normalisedText.match(thirdPartyDeductionPattern);

  if (advanceMatch) {
    sourceFacts.push({ label: "Advance repayment", value: advanceMatch[1], sourceQuote: advanceMatch[0].trim() });
  }

  if (overpaymentMatch) {
    sourceFacts.push({
      label: "Overpayment recovery",
      value: overpaymentMatch[1],
      sourceQuote: overpaymentMatch[0].trim(),
    });
  }

  if (thirdPartyMatch) {
    sourceFacts.push({ label: "Third party deduction", value: thirdPartyMatch[1], sourceQuote: thirdPartyMatch[0].trim() });
  }

  const hasAnyDeduction = Boolean(advanceMatch || overpaymentMatch || thirdPartyMatch || hasDeductionsSection);

  if (hasDeductionsSection) {
    sourceFacts.push({ label: "Deductions section found", value: "Yes", sourceQuote: "What we take off" });
  }

  const paymentThisMonthMatch = normalisedText.match(paymentThisMonthPattern);
  let amountMentioned: string | undefined;

  if (paymentThisMonthMatch) {
    amountMentioned = paymentThisMonthMatch[1];
    sourceFacts.push({ label: "Payment this month", value: amountMentioned, sourceQuote: paymentThisMonthMatch[0].trim() });
  } else {
    const fallbackMoney = normalisedText.match(genericMoneyPattern);
    if (fallbackMoney) {
      amountMentioned = `£${fallbackMoney[1]}`;
      sourceFacts.push({ label: "Amount mentioned", value: amountMentioned });
    }
  }

  const hasFullLayout = Boolean(assessmentPeriodMatch && (standardAllowanceMatch || paymentThisMonthMatch));
  const amountTreatment: DecisionAmountTreatment = amountMentioned ? "amount_mentioned_only" : "no_money_counted";

  return {
    documentType: "benefits_uc_statement",
    title: "Universal Credit statement check",
    plainEnglishSummary:
      "This looks like a Universal Credit statement or payment breakdown showing your assessment period, allowances, and any deductions.",
    caseStrength: hasAnyDeduction ? "possible_ground" : "not_enough_information",
    strengthLabel: hasAnyDeduction ? "Check the deductions and payment" : "Check the statement details",
    whatThisLooksLike:
      "Universal Credit statements show an assessment period, standard allowance and any extra elements (such as housing), then list anything taken off before the payment is made. The amount shown is treated as money mentioned only, never a saving or recovery.",
    possibleGrounds: [
      ...(hasAnyDeduction
        ? [
            "Deductions were applied to your payment this month. Check whether each one is expected and correctly calculated.",
          ]
        : []),
      "Compare this statement to your last one to see whether anything changed.",
    ],
    confidence: {
      level: hasFullLayout ? "high" : hasAnyDeduction || assessmentPeriodMatch ? "medium" : "low",
      reason: hasFullLayout
        ? "The text matches the standard Universal Credit statement layout, including the assessment period and payment figures."
        : "Some parts of the standard Universal Credit statement layout were found, but not all of it.",
    },
    uncertainty,
    cannotKnow: [
      "Whether each deduction rate is correct, or is being taken at the maximum rate DWP allows.",
      "Your full Universal Credit calculation before these deductions were applied.",
      "Whether anything on this statement has changed since a later assessment period.",
    ],
    evidenceNeeded: [
      "The full Universal Credit statement (PDF or screenshot), not just an extract.",
      "Your previous statement, to compare deductions and amounts.",
      "Any letter that explains a deduction (advance, overpayment, or third-party deduction).",
    ],
    deadlines: [
      "If something looks wrong, raise it through your Universal Credit journal as soon as possible.",
    ],
    risks: [
      "A deduction that looks wrong will keep reducing your payment until it is queried and changed.",
      "Missing a change in your statement can mean an error continues for months before it is noticed.",
    ],
    nextSteps: [
      "Check the assessment period dates and figures against your own records.",
      "Ask DWP for a breakdown of any deduction you do not recognise or understand.",
      "If the deductions are causing hardship, you can ask DWP about a lower deduction rate or hardship support.",
    ],
    safetyNotes: [BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE],
    amountMentioned,
    amountTreatment,
    sourceFacts,
    questionsToAnswer: [
      "Does the assessment period match the one you expected?",
      "Are all the deduction figures ones you recognise?",
      "Has anything changed since your last statement?",
    ],
  };
};
