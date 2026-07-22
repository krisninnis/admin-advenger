import type { ImpactEstimate, ParsedTaxCode, CodeComparisonResult } from "./types";

const UNSUPPORTED_SPECIAL_CODES = new Set(["BR", "D0", "D1", "0T", "NT", "K"]);

export function estimateImpact(
  comparison: CodeComparisonResult,
  marginalRatePercent: number | null,
  previousCode?: ParsedTaxCode,
  replacementCode?: ParsedTaxCode,
): ImpactEstimate {
  const suppressReasons: string[] = [];
  const warnings: string[] = [];

  if (comparison.differencePence === null || comparison.differencePence === 0) {
    suppressReasons.push("No calculable allowance difference between the codes.");
  }

  if (previousCode?.emergency || replacementCode?.emergency) {
    suppressReasons.push(
      "One or both codes carry an emergency marker (W1/M1/X/NONCUM). The impact estimate is unreliable until the cumulative basis is restored.",
    );
  }

  if (previousCode && UNSUPPORTED_SPECIAL_CODES.has(previousCode.special ?? "")) {
    suppressReasons.push(
      `The previous code (${previousCode.raw}) is a special code whose tax effect depends on income level and cannot be estimated from the code alone.`,
    );
  }

  if (replacementCode && UNSUPPORTED_SPECIAL_CODES.has(replacementCode.special ?? "")) {
    suppressReasons.push(
      `The replacement code (${replacementCode.raw}) is a special code whose tax effect depends on income level and cannot be estimated from the code alone.`,
    );
  }

  if (marginalRatePercent === null) {
    suppressReasons.push(
      "No marginal tax rate was supplied. An explicit rate assumption is required for an impact estimate.",
    );
  }

  if (suppressReasons.length > 0) {
    return {
      supported: false,
      annualTaxDifferencePence: null,
      monthlyAveragePence: null,
      weeklyAveragePence: null,
      marginalRatePercent,
      suppressReasons,
      warnings,
    };
  }

  const rate = marginalRatePercent! / 100;
  const annualDiffPence = Math.round(Math.abs(comparison.differencePence!) * rate);
  const monthlyAvgPence = Math.round(annualDiffPence / 12);
  const weeklyAvgPence = Math.round(annualDiffPence / 52);

  warnings.push(
    "These are estimates only. The monthly and weekly figures are averages over the year.",
  );
  warnings.push(
    "The actual next payslip may differ due to rounding, timing, or other payroll factors.",
  );
  warnings.push(
    "This estimate assumes you earn enough to pay tax at the stated marginal rate throughout the year.",
  );

  return {
    supported: true,
    annualTaxDifferencePence: annualDiffPence,
    monthlyAveragePence: monthlyAvgPence,
    weeklyAveragePence: weeklyAvgPence,
    marginalRatePercent,
    suppressReasons,
    warnings,
  };
}
