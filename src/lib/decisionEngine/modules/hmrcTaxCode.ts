import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";
import type { ParsedHmrcTaxCodeNotice, CodeComparisonResult, ImpactEstimate } from "../hmrc/types";
import { recogniseAndParse } from "../hmrc/noticeParser";
import { compareCodes } from "../hmrc/codeComparator";
import { estimateImpact } from "../hmrc/impactEstimator";
import { taxCodeLabel } from "../hmrc/taxCodeParser";

type HmrcIntent =
  | "what_is_this"
  | "why_changed"
  | "effect_on_pay"
  | "do_i_need_to_act"
  | "is_this_correct"
  | "what_should_i_check"
  | "write_reply"
  | "unrecognised";

const INTENT_PATTERNS: Array<{ intent: HmrcIntent; patterns: RegExp[] }> = [
  {
    intent: "what_is_this",
    patterns: [
      /what (?:is|are) (?:this|it|this document|this letter|this notice)/i,
      /what(?:'s| is) going on/i,
      /explain (?:this|it|what)/i,
      /tell me about (?:this|it)/i,
      // "What does this mean?" is the application's own suggested wording, so it
      // and its close variants ("what does this letter mean", "what do these
      // mean") must resolve to the same safe explanation intent as "What is
      // this?".
      /what (?:does|do) (?:this|it|these|that|the)\b[^?]*\bmean\b/i,
    ],
  },
  {
    intent: "why_changed",
    patterns: [
      /why (?:has|did|have|was) (?:my|the|this) (?:tax code|code) (?:changed|change|different|updated)/i,
      /why (?:is|was) (?:my|the|this) (?:tax code|code) (?:now|different|changed)/i,
      /reason for (?:the|this|my) (?:code|tax code) (?:change|changed|difference)/i,
      /how (?:did|has|was) (?:my|the|this) (?:tax code|code) (?:change|changed|ended up)/i,
    ],
  },
  {
    intent: "effect_on_pay",
    patterns: [
      /how (?:will|would|does|do) (?:this|it|the change|the code) (?:affect|impact|change|influence) (?:my|the)?\s*(?:pay|wage|salary|earnings|take.home)/i,
      /how much (?:will|would|does|do) (?:this|it|the change) (?:cost|affect|change)/i,
      /what(?:'s| is) the (?:financial|money|tax|pay) (?:impact|effect|difference|change)/i,
      /will (?:I|my pay|my wage|my salary) (?:be |get )?(?:paid less|paid more|change|go down|go up|decrease|increase)/i,
      /effect on pay/i,
    ],
  },
  {
    intent: "do_i_need_to_act",
    patterns: [
      /do (?:I|we) (?:need to |have to |got to )?(?:do something|act|respond|reply|reply|contact|call|phone|email|write|send)/i,
      /is (?:there )?(?:anything )?(?:I |we )?(?:need to |must |should |have to )?(?:do|act|respond|reply|send|contact)/i,
      /do (?:I|we) (?:need|have|got) to (?:do anything|take action|respond|reply|contact|check)/i,
      /action (?:required|needed|necessary)/i,
      /must (?:I|we) (?:do something|act|respond|reply|contact)/i,
      /must (?:I|we) (?:contact|call|phone|email|write|reply|respond)/i,
    ],
  },
  {
    intent: "is_this_correct",
    patterns: [
      /is (?:this|it|the tax code|the code|the calculation|the amount|the number|the figure) (?:correct|right|accurate|valid|wrong|incorrect)/i,
      /is (?:this|it) (?:an? )?(?:error|mistake|wrong|incorrect)/i,
      /has HMRC (?:made a|got an|got the) (?:mistake|error|wrong)/i,
      /does (?:this|it|the calculation|the math|the maths|the arithmetic) (?:add up|match|look right|look correct|work out|reconcile|balance)/i,
      /is (?:the )?(?:arithmetic|calculation|maths|math) (?:correct|right|accurate|wrong)/i,
    ],
  },
  {
    intent: "what_should_i_check",
    patterns: [
      /what (?:should|can|do) (?:I|we) (?:check|look at|verify|confirm|double.check|review|compare)/i,
      /what (?:do|should) (?:I|we) (?:need to|have to|got to) (?:check|verify|confirm|look at)/i,
      /what(?:'s| is) there (?:to |for me to )?(?:check|verify|confirm|look at)/i,
    ],
  },
  {
    intent: "write_reply",
    patterns: [
      /write (?:me )?(?:a |an )?(?:reply|response|email|letter|message|text)/i,
      /draft (?:me )?(?:a |an )?(?:reply|response|email|letter|message|text)/i,
      /can you (?:write|draft|prepare|compose) (?:a |an |me a |me an )?(?:reply|response|email|letter|message)/i,
      /prepare (?:a |an )?(?:reply|response|email|letter|message)/i,
    ],
  },
];

const DISPUTE_SIGNAL_PATTERNS: RegExp[] = [
  /this (?:employer|company|pension|provider) (?:is|has|got) (?:wrong|incorrect|mistaken)/i,
  /the (?:medical insurance|car|benefit|expense|deduction) (?:is|has|got) (?:wrong|incorrect|mistaken)/i,
  /i dispute (?:this|the|my) (?:code|tax code|calculation|amount)/i,
  /hmrc (?:has|have|got) (?:the|a) wrong/i,
  /hmrc (?:is|are) (?:wrong|incorrect|mistaken)/i,
  /this (?:notice|letter|code|calculation) (?:is|has|got) (?:wrong|incorrect|mistaken|an error)/i,
  /the (?:code|calculation|amount|figure|number) (?:is|has|got) (?:wrong|incorrect|mistaken)/i,
  /i think (?:hmrc|this) (?:is|has|got) (?:wrong|incorrect|made a mistake)/i,
];

export const shouldPrepareHmrcDraft = ({
  intent,
  hasCalcDifference,
  userQuestion,
}: {
  intent: string;
  hasCalcDifference: boolean;
  userQuestion?: string;
}): boolean => {
  if (intent === "write_reply") return true;
  if (hasCalcDifference) return true;
  if (!userQuestion) return false;
  return DISPUTE_SIGNAL_PATTERNS.some((pattern) => pattern.test(userQuestion));
};

export const matchHmrcIntent = (question: string): HmrcIntent => {
  const trimmed = question.trim();
  if (!trimmed) return "unrecognised";
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(trimmed))) return intent;
  }
  return "unrecognised";
};

const buildDirectAnswer = (
  intent: HmrcIntent,
  parsed: ParsedHmrcTaxCodeNotice,
  _comparison: CodeComparisonResult | null,
  impact: ImpactEstimate | null,
): string | undefined => {
  const prevLabel = parsed.previousTaxCode ? taxCodeLabel(parsed.previousTaxCode) : null;
  const replLabel = parsed.replacementTaxCode ? taxCodeLabel(parsed.replacementTaxCode) : null;

  switch (intent) {
    case "what_is_this":
      if (prevLabel && replLabel) {
        return `This appears to be an HMRC tax code notice changing your tax code from ${prevLabel} to ${replLabel}. It is a notification, not a tax bill.`;
      }
      if (replLabel) {
        return `This appears to be an HMRC tax code notice setting your tax code to ${replLabel}. It is a notification, not a tax bill.`;
      }
      return "This appears to be an HMRC tax code notice. It is a notification about your tax code, not a tax bill.";

    case "why_changed": {
      const deductionLines = parsed.lines.filter((l) => l.type === "deduction" && l.amountPence !== null);

      if (deductionLines.length > 0 && prevLabel && replLabel) {
        const deductionText = deductionLines.map((l) => l.label).join(" and ");
        return `The tax code changed from ${prevLabel} to ${replLabel}. The notice lists ${deductionText} as items reducing your tax-free amount. Check with your employer or pension provider whether these details are correct.`;
      }
      if (prevLabel && replLabel) {
        return `The tax code changed from ${prevLabel} to ${replLabel}. The notice should explain which allowances or deductions changed, but AdminAvenger cannot tell you why HMRC made this change. Check the details on the notice against your own records.`;
      }
      return "The notice should explain the reason for the tax code, but AdminAvenger cannot tell you why HMRC set this code. Check the details on the notice against your own records.";
    }

    case "effect_on_pay": {
      if (impact && impact.supported && impact.annualTaxDifferencePence !== null) {
        const annualPounds = (impact.annualTaxDifferencePence / 100).toFixed(2);
        const monthlyPounds = impact.monthlyAveragePence !== null
          ? `approximately £${(impact.monthlyAveragePence / 100).toFixed(2)} per month`
          : "not available";
        return `Under an illustrative 20% tax rate assumption, the estimated annual tax difference is £${annualPounds}. The monthly equivalent of ${monthlyPounds} is an average, not a certain next-payslip change. The actual effect on your payslip may differ due to timing, rounding, or other payroll factors.`;
      }
      if (impact && !impact.supported) {
        return "AdminAvenger cannot estimate the effect on your pay from this notice alone. The tax impact depends on your income level, tax band, and other factors not shown here. Check your next payslip or ask your employer.";
      }
      if (prevLabel && replLabel) {
        return `The tax code is changing from ${prevLabel} to ${replLabel}. AdminAvenger cannot estimate the exact effect on your pay from this notice alone. Check your next payslip or ask your employer.`;
      }
      return "AdminAvenger cannot estimate the effect on your pay from this notice alone. Check your next payslip or ask your employer.";
    }

    case "do_i_need_to_act": {
      if (parsed.appearsIncomplete) {
        return "This notice appears to be incomplete. You should check whether all pages were provided. If you are missing pages, contact HMRC or your employer to get the full notice.";
      }
      if (parsed.documentSubType !== "tax_code_notice") {
        return "AdminAvenger could not fully read this notice. Keep the original and check whether any action is required by comparing it against your payslip or contacting HMRC.";
      }
      if (prevLabel && replLabel) {
        return `No immediate action appears necessary from the notice alone. However, you should check that the new code (${replLabel}) matches your most recent payslip and that HMRC has the correct details about your income, employer, and benefits.`;
      }
      return "No immediate action appears necessary from the notice alone. Check that the code matches your most recent payslip and that HMRC has correct details.";
    }

    case "is_this_correct": {
      const hasCalcDifference = parsed.calculationDifferencePence !== null && parsed.calculationDifferencePence !== 0;
      if (hasCalcDifference) {
        const diffPounds = (Math.abs(parsed.calculationDifferencePence!) / 100).toFixed(2);
        return `The printed total and the sum of the line items differ by £${diffPounds}. This may be worth checking with HMRC. AdminAvenger cannot confirm whether the calculation is correct because it depends on personal details not shown in the notice.`;
      }
      if (parsed.calculatedTaxFreeAmountPence !== null && parsed.printedTaxFreeAmountPence !== null) {
        return "The printed calculation appears to reconcile - the sum of the line items matches the printed total. However, AdminAvenger cannot confirm whether the amounts themselves are correct for your circumstances. Check whether the employer, pension provider, and benefit details match your records.";
      }
      return "AdminAvenger can check the arithmetic on the notice, but it cannot confirm whether the amounts are correct for your circumstances. Check the employer, pension provider, and benefit details against your records.";
    }

    case "what_should_i_check": {
      const items: string[] = [];
      if (parsed.employerOrPensionProvider) {
        items.push(`whether the employer or pension provider (${parsed.employerOrPensionProvider}) is correct`);
      } else {
        items.push("the employer or pension provider name");
      }
      if (parsed.replacementTaxCode) {
        items.push(`whether the replacement code (${taxCodeLabel(parsed.replacementTaxCode)}) matches your payslip`);
      }
      if (parsed.previousTaxCode) {
        items.push(`whether the previous code (${taxCodeLabel(parsed.previousTaxCode)}) was correct`);
      }
      items.push("whether any benefits in kind (company car, private medical insurance) are accurate");
      items.push("whether any job expenses listed are correct");
      if (parsed.appearsIncomplete) {
        items.push("whether all pages of the notice were provided");
      }
      return `Check: ${items.join("; ")}.`;
    }

    case "write_reply":
      return "AdminAvenger has prepared a draft query for you to review. Edit it before sending - do not send it as-is. Check the reference, tax code, and employer details are correct.";

    default:
      return undefined;
  }
};

export const analyseHmrcTaxCode = ({
  text,
  userQuestion,
}: DecisionModuleInput): DecisionResult => {
  const parsed = recogniseAndParse(text);
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
  // Only genuine facts parsed from the notice belong in sourceFacts, because
  // this list becomes the user-facing "evidence found" list. Derived/computed
  // values - the reconciled total, the code approximation, the previous/
  // replacement comparison, and the illustrative tax-impact estimate - are
  // AdminAvenger's own working, not evidence found in the document. Listing
  // them here is what inflated the evidence count with one figure repeated
  // under several slightly different labels. They still inform the direct
  // answer and impact wording via `comparison`/`impact` directly, so nothing
  // user-visible is lost. The printed total is only added when it is not
  // already present as a "Total" calculation line, to avoid the same figure
  // appearing twice.
  const hasPrintedTotalLine = parsed.lines.some((l) => l.type === "printed_total");
  if (parsed.printedTaxFreeAmountPence !== null && !hasPrintedTotalLine) {
    sourceFacts.push({
      label: "Printed tax-free amount",
      value: `£${(parsed.printedTaxFreeAmountPence / 100).toFixed(2)}`,
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

  const firstCode = parsed.replacementTaxCode ?? parsed.previousTaxCode;
  const amountMentioned = parsed.printedTaxFreeAmountPence !== null
    ? `£${(parsed.printedTaxFreeAmountPence / 100).toFixed(2)}`
    : undefined;

  const whatThisLooksLike = parsed.replacementTaxCode && parsed.previousTaxCode
    ? `This appears to be an HMRC tax code notice changing your tax code from ${taxCodeLabel(parsed.previousTaxCode)} to ${taxCodeLabel(parsed.replacementTaxCode)}.`
    : parsed.replacementTaxCode
      ? `This appears to be an HMRC tax code notice setting your tax code to ${taxCodeLabel(parsed.replacementTaxCode)}.`
      : "This appears to be an HMRC tax code notice.";

  const intent = userQuestion ? matchHmrcIntent(userQuestion) : "unrecognised";
  const directAnswer = buildDirectAnswer(intent, parsed, comparison, impact);
  const includeDraft = shouldPrepareHmrcDraft({
    intent,
    hasCalcDifference,
    userQuestion,
  });

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
      ...(!parsed.previousTaxCode && !parsed.replacementTaxCode
        ? ["Your current and previous tax codes if available."]
        : []),
      ...(!parsed.previousTaxCode && parsed.replacementTaxCode
        ? ["Your previous tax code if available."]
        : []),
      ...(!parsed.replacementTaxCode && parsed.previousTaxCode
        ? ["Your replacement tax code if available."]
        : []),
      ...(!parsed.employerOrPensionProvider
        ? ["Details of any employers or pension providers."]
        : []),
      "Any benefits in kind (company car, private medical insurance) if applicable.",
      "Your P60 or recent payslips showing tax deductions.",
      ...(!parsed.noticeDate
        ? ["An explicit notice or issue date from the original letter, if available."]
        : []),
      ...(parsed.appearsIncomplete
        ? ["Any missing pages of the notice."]
        : []),
    ],
    // Only genuine extracted dates belong here, because this list renders as
    // date/deadline cards. A tax-year boundary is a source fact, not an
    // actionable deadline, and this notice type carries no explicit response
    // or action deadline that the parser extracts - so this stays empty rather
    // than turning guidance instructions into fake "date" cards (Defect 4).
    // Any genuine issue date surfaces through sourceFacts -> key dates. The
    // prompt to look for a deadline lives in nextSteps, and contacting HMRC
    // lives in nextSteps/risks, so neither is duplicated into the dates panel.
    deadlines: [],
    risks: [
      "Do not ignore an HMRC tax code notice without checking whether action is needed.",
      "If you disagree with the tax code, use the official HMRC route rather than ignoring the notice.",
      "Do not assume a code change is correct without checking your own records.",
    ],
    nextSteps: [
      "Check the tax code on the notice against your most recent payslip or P60.",
      "Check the original notice itself for any response deadline or date you need to act by, as none was found automatically.",
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
    directAnswer: directAnswer,
    draftMessage: includeDraft
      ? `Subject: Tax code notice query

Hello,

I received a tax code notice from HMRC and would like to check the details.

Reference: [add reference]
Tax code: ${firstCode ? taxCodeLabel(firstCode) : "[add tax code]"}
Tax year: ${parsed.taxYearStart && parsed.taxYearEnd ? `${parsed.taxYearStart} to ${parsed.taxYearEnd}` : "[add tax year]"}
${parsed.employerOrPensionProvider ? `Employer: ${parsed.employerOrPensionProvider}` : "[add employer if known]"}

Please confirm what information you used to set this tax code and whether any action is required from me.

Kind regards,`
      : undefined,
    amountMentioned,
    amountTreatment: amountMentioned ? "amount_mentioned_only" : "no_money_counted",
    sourceFacts,
  };
};
