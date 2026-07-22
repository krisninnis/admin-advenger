import type { CodeComparisonResult, ParsedTaxCode } from "./types";
import { taxCodeToApproximatePence } from "./taxCodeParser";

export function compareCodes(
  previous: ParsedTaxCode,
  replacement: ParsedTaxCode,
  printedNewTaxFreePence: number | null,
): CodeComparisonResult {
  const warnings: string[] = [];

  const previousApproxPence = taxCodeToApproximatePence(previous);
  const newApproxPence = taxCodeToApproximatePence(replacement);

  let newExactPence = printedNewTaxFreePence;
  let newLabelledApproximate = false;

  if (newExactPence === null && newApproxPence !== null) {
    newExactPence = newApproxPence;
    newLabelledApproximate = true;
    warnings.push(
      "The exact printed tax-free amount was not found. The amount shown is estimated from the code number and is approximate.",
    );
  }

  if (previousApproxPence === null) {
    warnings.push(
      `Cannot derive an approximate tax-free amount for the previous code (${previous.raw}). Only numeric codes produce a reliable approximation.`,
    );
  }

  if (newApproxPence === null && newExactPence === null) {
    warnings.push(
      `Cannot derive a tax-free amount for the replacement code (${replacement.raw}).`,
    );
  }

  let differencePence: number | null = null;
  let isReduction: boolean | null = null;

  if (previousApproxPence !== null && newExactPence !== null) {
    differencePence = newExactPence - previousApproxPence;
    isReduction = differencePence < 0;
  }

  if (
    previousApproxPence !== null &&
    newExactPence !== null &&
    Math.abs(differencePence!) > 0
  ) {
    const direction = isReduction ? "reduction" : "increase";
    warnings.push(
      `The tax-free amount has an approximate ${direction} of £${(Math.abs(differencePence!) / 100).toFixed(2)} per year.`,
    );
  }

  return {
    previousApproxTaxFreePence: previousApproxPence,
    newExactTaxFreePence: newExactPence,
    newApproxTaxFreePence: newApproxPence,
    differencePence,
    isReduction,
    previousLabelledApproximate: previousApproxPence !== null,
    newLabelledApproximate,
    warnings,
  };
}
