// Shared source-support normalisation.
//
// Purpose: decide whether a fact AdminAvenger presents as coming from the
// document (a date, an amount, a quoted phrase) is actually supported by the
// submitted source text. Comparison is done on a normalised copy of BOTH the
// source text and the quote, so that supported whitespace, line-ending, common
// OCR, and currency-encoding variation do not cause a genuine source fact to be
// rejected - while an unsupported (invented) fact still fails.
//
// The original quote is never mutated for display. Normalisation here is only
// ever used for the support comparison.

// Collapse the currency-encoding variants of a pound sign to a single token so
// "£100", "Â£100", "Ã‚Â£100" and "GBP 100" all compare equal. Order matters:
// the double-mojibake sequence must be collapsed before the single-mojibake one.
export const normaliseCurrencyEncodingForSupport = (value: string): string =>
  value
    .replace(/Ã‚Â£/g, "£")
    .replace(/Â£/g, "£")
    .replace(/\bGBP\b/gi, "£")
    .replace(/£\s+(?=\d)/g, "£");

// OCR and copy-paste artefacts that should not defeat a support check.
const normaliseOcrArtefacts = (value: string): string =>
  value
    .replace(/ /g, " ") // non-breaking space
    .replace(/[‘’‚‛]/g, "'") // curly single quotes
    .replace(/[“”]/g, '"') // curly double quotes
    .replace(/[–—]/g, "-") // en/em dash
    .replace(/[|]/g, "l"); // common OCR confusion, only for loose comparison

export const normaliseForSupport = (value: string): string =>
  normaliseOcrArtefacts(normaliseCurrencyEncodingForSupport(value))
    .replace(/\r\n?|\n/g, " ") // line endings -> space
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const hasLeadingNumericContinuation = (source: string, index: number): boolean => {
  const previous = source[index - 1];

  if (/\d/.test(previous ?? "")) {
    return true;
  }

  return (
    (previous === "," || previous === ".") &&
    /\d/.test(source[index - 2] ?? "")
  );
};

const hasTrailingNumericContinuation = (
  source: string,
  endIndex: number,
): boolean => {
  const next = source[endIndex];

  if (/\d/.test(next ?? "")) {
    return true;
  }

  return (
    (next === "," || next === ".") &&
    /\d/.test(source[endIndex + 1] ?? "")
  );
};

/**
 * Count exact normalised occurrences without accepting a numeric prefix or
 * suffix. The boundary rule matters for money support: `£100` must not be
 * treated as evidence for `£1000` or `£100.50` merely because it is a string
 * prefix. Non-numeric partial passages keep the existing substring behaviour.
 */
export const countSupportedSourceOccurrences = (
  quote: string | undefined,
  sourceText: string,
): number => {
  const normalisedQuote = normaliseForSupport(quote ?? "");

  if (!normalisedQuote) {
    return 0;
  }

  const normalisedSource = normaliseForSupport(sourceText);
  const quoteStartsWithDigit = /^\d/.test(normalisedQuote);
  const quoteEndsWithDigit = /\d$/.test(normalisedQuote);
  let count = 0;
  let searchFrom = 0;

  while (searchFrom <= normalisedSource.length - normalisedQuote.length) {
    const index = normalisedSource.indexOf(normalisedQuote, searchFrom);

    if (index === -1) {
      break;
    }

    const endIndex = index + normalisedQuote.length;
    const hasUnsafeBoundary =
      (quoteStartsWithDigit && hasLeadingNumericContinuation(normalisedSource, index)) ||
      (quoteEndsWithDigit && hasTrailingNumericContinuation(normalisedSource, endIndex));

    if (!hasUnsafeBoundary) {
      count += 1;
    }

    searchFrom = index + 1;
  }

  return count;
};

// Is `quote` supported by `sourceText`? Both are normalised the same way first.
// An empty or whitespace-only quote is never "supported" - callers must supply a
// real quote for a source-claimed fact.
export const isSupportedBySource = (
  quote: string | undefined,
  sourceText: string,
): boolean => countSupportedSourceOccurrences(quote, sourceText) > 0;
