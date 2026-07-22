import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";
import { recogniseAndParse } from "../hmrc/noticeParser";
import { compareCodes } from "../hmrc/codeComparator";
import { estimateImpact } from "../hmrc/impactEstimator";
import { taxCodeLabel } from "../hmrc/taxCodeParser";

export const analyseHmrcTaxCode = ({
  normalisedText,
}: DecisionModuleInput): DecisionResult => {
  const parsed = recogniseAndParse(normalisedText);
  const hasReplacement = parsed.replacementTaxCode !== null;
  const hasPrevious = parsed.previousTaxCode !== null;
  const hasCalcDifference = parsed.calculationDifferencePence !== null && parsed.calculationDifferencePence !== 0;

  const isComplete = parsed.pages.length >= 2 || (parsed.pages.length === 1 && !parsed.appearsIncomplete);

  let caseStrength: DecisionResult["caseStrength"] = "weak_or_missing_evidence";
  if (parsed.recognised && isComplete && hasReplacement) {
    caseStrength = hasCalcDifference ? "possible_ground" : "not_enough_information";
  } else if (parsed.recognised && hasReplacement) {
    caseStrength = "not_enough_information";
  } else if (parsed.recognised) {
    caseStrength = "weak_or_missing_evidence";
  }

  let strengthLabel = "Need more detail";
  if (caseStrength === "possible_ground") strengthLabel = "Check whether the calculation is correct";
  else if (caseStrength === "not_enough_information") strengthLabel = "Need more information";
  else if (caseStrength === "weak_or_missing_evidence") strengthLabel = "Need more detail";

  const comparison = hasPrevious && hasReplacement
    ? compareCodes(parsed.previousTaxCode!, parsed.replacementTaxCode!, parsed.printedTaxFreeAmountPence)
    : null;

  const impact = comparison
    ? estimateImpact(comparison, 20, parsed.previousTaxCode ?? undefined, parsed.replacementTaxCode ?? undefined)
    : null;

  const sourceFacts: DecisionResult["sourceFacts"] = [];

  if (parsed.employerOrPensionProvider) {
    sourceFacts.push({ label: "Employer or pension provider", value: parsed.employerOrPensionProvider });
  }
  if (parsed.taxYearStart && parsed.taxYearEnd) {
    sourceFacts.push({ label: "Tax year", value: `${parsed.taxYearStart} to ${parsed.taxYearEnd}` });
  }
  if (parsed.noticeDate) {
    sourceFacts.push({ label: "Notice date", value: parsed.noticeDate });
  }
  if (parsed.previousTaxCode) {
    sourceFacts.push({
      label: "Previous tax code",
      value: taxCodeLabel(parsed.previousTaxCode),
      sourceQuote: parsed.previousTaxCode.raw,
    });
  }
  if (parsed.replacementTaxCode) {
    sourceFacts.push({
      label: "Replacement tax code",
      value: taxCodeLabel(parsed.replacementTaxCode),
      sourceQuote: parsed.replacementTaxCode.raw,
    });
  }
  if (parsed.printedTaxFreeAmountPence !== null) {
    sourceFacts.push({
      label: "Printed tax-free amount",
      value: `£${(parsed.printedTaxFreeAmountPence / 100).toFixed(2)}`,
    });
  }
  if (parsed.calculatedTaxFreeAmountPence !== null) {
    sourceFacts.push({
      label: "Calculated tax-free amount",
      value: `£${(parsed.calculatedTaxFreeAmountPence / 100).toFixed(2)}`,
    });
  }
  if (parsed.calculationDifferencePence !== null && parsed.calculationDifferencePence !== 0) {
    sourceFacts.push({
      label: "Calculation difference",
      value: `£${(Math.abs(parsed.calculationDifferencePence) / 100).toFixed(2)}`,
    });
  }
  if (parsed.codeApproximateTaxFreePence !== null) {
    sourceFacts.push({
      label: "Code approximate tax-free amount",
      value: `£${(parsed.codeApproximateTaxFreePence / 100).toFixed(2)}`,
    });
  }
  for (const line of parsed.lines) {
    if (line.amountPence !== null) {
      sourceFacts.push({
        label: `${line.type === "allowance" ? "Allowance" : line.type === "deduction" ? "Deduction" : line.type === "printed_total" ? "Total" : "Line item"}: ${line.label}`,
        value: `£${(line.amountPence / 100).toFixed(2)}`,
        sourceQuote: line.raw,
      });
    }
  }
  if (comparison) {
    if (comparison.previousApproxTaxFreePence !== null) {
      sourceFacts.push({
        label: "Previous code approximate tax-free",
        value: `£${(comparison.previousApproxTaxFreePence / 100).toFixed(2)} (approximate)`,
      });
    }
    if (comparison.newExactTaxFreePence !== null) {
      sourceFacts.push({
        label: "New code tax-free amount",
        value: `£${(comparison.newExactTaxFreePence / 100).toFixed(2)}${comparison.newLabelledApproximate ? " (approximate)" : ""}`,
      });
    }
    if (comparison.differencePence !== null) {
      const direction = comparison.isReduction ? "reduction" : "increase";
      sourceFacts.push({
        label: "Approximate allowance change",
        value: `${direction} of £${(Math.abs(comparison.differencePence) / 100).toFixed(2)} per year`,
      });
    }
  }
  if (impact && impact.supported) {
    sourceFacts.push({
      label: "Estimated tax impact (20% rate)",
      value: `£${(impact.annualTaxDifferencePence! / 100).toFixed(2)} per year`,
    });
    sourceFacts.push({
      label: "Monthly average estimate",
      value: `approximately £${(impact.monthlyAveragePence! / 100).toFixed(2)} per month`,
    });
    sourceFacts.push({
      label: "Weekly average estimate",
      value: `approximately £${(impact.weeklyAveragePence! / 100).toFixed(2)} per week`,
    });
  }

  const firstCode = parsed.replacementTaxCode ?? parsed.previousTaxCode;
  const amountMentioned = parsed.printedTaxFreeAmountPence !== null
    ? `£${(parsed.printedTaxFreeAmountPence / 100).toFixed(2)}`
    : undefined;

  const whatThisLooksLike = parsed.replacementTaxCode && parsed.previousTaxCode
    ? `This appears to be an HMRC tax code notice changing your tax code from ${taxCodeLabel(parsed.previousTaxCode)} to ${taxCodeLabel(parsed.replacementTaxCode)}.`
    : parsed.replacementTaxCode
      ? `This appears to be an HMRC tax code notice setting your tax code to ${taxCodeLabel(parsed.replacementTaxCode)}.`
      : "This appears to be an HMRC tax code notice.";

  return {
    documentType: "hmrc_tax_code_notice",
    title: "HMRC tax code notice check",
    plainEnglishSummary:
      "This looks like an HMRC tax code notice. AdminAvenger can help you understand the calculation and check whether it is correct, but it cannot decide your tax code or tell you whether HMRC is right.",
    caseStrength,
    strengthLabel,
    whatThisLooksLike,
    possibleGrounds: [
      "Check whether the Personal Allowance and any expenses or benefits match your records.",
      "If the code has changed, verify that HMRC has the correct employer, pension, and income details.",
      ...(hasCalcDifference
        ? ["The printed total and the sum of the line items differ - this may be worth querying with HMRC."]
        : []),
    ],
    confidence: {
      level: parsed.confidence,
      reason:
        parsed.confidence === "high"
          ? "Multiple strong HMRC tax code signals were found in the text: sender, tax code phrase, year, or employer details."
          : parsed.confidence === "medium"
            ? "Some HMRC tax code signals were found but not all. The result should be checked against the original letter."
            : "Limited HMRC tax code signals were found. Check the letter carefully before relying on this result.",
    },
    uncertainty: [
      "AdminAvenger cannot confirm whether the tax code shown is correct for your circumstances.",
      "The correct tax code depends on your income, benefits in kind, employer details, and personal allowance - none of which can be confirmed from the notice alone.",
      ...(parsed.appearsIncomplete
        ? ["This notice appears to be incomplete - not all pages may have been provided."]
        : []),
      ...parsed.warnings,
    ],
    cannotKnow: [
      "AdminAvenger cannot tell you whether HMRC has calculated your tax code correctly.",
      "AdminAvenger cannot confirm what your correct tax code should be.",
      "AdminAvenger cannot verify whether employer or income details held by HMRC are accurate.",
      ...(impact && !impact.supported
        ? ["AdminAvenger cannot estimate the tax impact of this change because the calculation requires information not available in the notice."]
        : []),
    ],
    evidenceNeeded: [
      "The full HMRC tax code notice including all pages.",
      "Your current and previous tax codes if available.",
      "Details of any employers or pension providers.",
      "Any benefits in kind (company car, private medical insurance) if applicable.",
      "Your P60 or recent payslips showing tax deductions.",
      ...(parsed.appearsIncomplete
        ? ["Any missing pages of the notice."]
        : []),
    ],
    deadlines: [
      "Check the notice for any response deadline or action required date.",
      "If you believe the tax code is wrong, contact HMRC through the details on the letter or via your tax account.",
    ],
    risks: [
      "Do not ignore an HMRC tax code notice without checking whether action is needed.",
      "If you disagree with the tax code, use the official HMRC route rather than ignoring the notice.",
      "Do not assume a code change is correct without checking your own records.",
    ],
    nextSteps: [
      "Check the tax code on the notice against your most recent payslip or P60.",
      "If the code has changed, check whether HMRC has the correct information about your income, employer, or benefits.",
      "If you disagree, contact HMRC using the details on the letter or through your tax account.",
      "Keep a copy of the notice and any response you send.",
      ...(parsed.replacementTaxCode
        ? [`Look up what your replacement code (${taxCodeLabel(parsed.replacementTaxCode)}) means on GOV.UK.`]
        : []),
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger is not a tax adviser. It explains the notice and checks the calculation; it cannot tell you whether HMRC is right. Use official HMRC guidance or contact HMRC directly if you are unsure.",
      ...(impact && impact.supported
        ? ["The tax impact estimate is approximate. The actual effect on your payslip may differ due to timing, rounding, or other payroll factors."]
        : []),
    ],
    draftMessage: `Subject: Tax code notice query

Hello,

I received a tax code notice from HMRC and would like to check the details.

Reference: [add reference]
Tax code: ${firstCode ? taxCodeLabel(firstCode) : "[add tax code]"}
Tax year: ${parsed.taxYearStart && parsed.taxYearEnd ? `${parsed.taxYearStart} to ${parsed.taxYearEnd}` : "[add tax year]"}
${parsed.employerOrPensionProvider ? `Employer: ${parsed.employerOrPensionProvider}` : "[add employer if known]"}

Please confirm what information you used to set this tax code and whether any action is required from me.

Kind regards,`,
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
  };
};
