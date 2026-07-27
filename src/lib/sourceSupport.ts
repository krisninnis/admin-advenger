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
    .replace(/\bGBP\b/gi, "£");

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

// Is `quote` supported by `sourceText`? Both are normalised the same way first.
// An empty or whitespace-only quote is never "supported" - callers must supply a
// real quote for a source-claimed fact.
export const isSupportedBySource = (
  quote: string | undefined,
  sourceText: string,
): boolean => {
  const normalisedQuote = normaliseForSupport(quote ?? "");

  if (!normalisedQuote) {
    return false;
  }

  return normaliseForSupport(sourceText).includes(normalisedQuote);
};
