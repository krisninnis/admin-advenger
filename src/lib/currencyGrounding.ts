// Guarded currency extraction.
//
// £, GBP, Â£ (single mojibake) and Ã‚Â£ (double mojibake) are all read as pounds.
// A bare "?" immediately followed by digits is a *degraded* pound sign ONLY when
// a nearby monetary label or another strong currency context supports it. An
// ordinary question mark followed by a number ("question 3?", "?4 remaining") is
// never parsed as money.
//
// Every returned amount keeps the raw matched substring (preserved verbatim for
// display and source-support checks) and its index in the ORIGINAL text so
// callers can reason about surrounding context (role, negation).

export type CurrencyToken = "pound" | "gbp" | "degraded_pound";

export type GroundedAmount = {
  raw: string; // exact matched substring from the original text
  amount: number; // numeric value
  index: number; // start offset in the original text
  currencyToken: CurrencyToken;
  perPeriod?: "monthly" | "annual" | "weekly";
};

const AMOUNT_SOURCE = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;

// Strong, unambiguous currency prefixes. Ordered so the double-mojibake sequence
// is tried before the single-mojibake one.
const STRONG_PREFIX_SOURCE = String.raw`(?:Ã‚Â£|Â£|£|GBP)`;

const strongPattern = new RegExp(
  String.raw`(${STRONG_PREFIX_SOURCE})\s*(${AMOUNT_SOURCE})`,
  "gi",
);

// A "?" that may be a degraded pound sign.
const degradedPattern = new RegExp(String.raw`\?\s*(${AMOUNT_SOURCE})`, "g");

// Words that establish a monetary context near a degraded "?".
const MONETARY_LABEL =
  /(amount|balance|total|subtotal|refund(?:ed)?|postage|shipping|delivery charge|due|pay(?:ment|able)?|price|charge[ds]?|cost|fee|bill|paid|collect(?:ed|ion)?|direct debit|pounds?|sterling|gbp|£)/i;

const PER_PERIOD_AFTER = /^\s*(?:\/|per\s+)(month|year|annum|week|mo|yr|wk)\b/i;

const perPeriodFrom = (suffix: string): GroundedAmount["perPeriod"] => {
  const match = suffix.match(PER_PERIOD_AFTER);

  if (!match) {
    return undefined;
  }

  const unit = match[1].toLowerCase();

  if (unit.startsWith("month") || unit === "mo") {
    return "monthly";
  }

  if (unit.startsWith("year") || unit === "annum" || unit === "yr") {
    return "annual";
  }

  return "weekly";
};

export const parseAmount = (raw: string): number =>
  Number(raw.replace(/[^0-9.]/g, ""));

const strongToken = (prefix: string): CurrencyToken =>
  /gbp/i.test(prefix) ? "gbp" : "pound";

// A degraded "?" is only currency when a monetary label sits close before it, a
// strong currency symbol is close before it, or a per-period suffix follows.
const degradedIsSupported = (
  text: string,
  matchIndex: number,
  suffixAfterAmount: string,
): boolean => {
  const windowBefore = text.slice(Math.max(0, matchIndex - 40), matchIndex);

  if (MONETARY_LABEL.test(windowBefore)) {
    return true;
  }

  if (perPeriodFrom(suffixAfterAmount)) {
    return true;
  }

  return false;
};

export const extractGroundedAmounts = (text: string): GroundedAmount[] => {
  const results: GroundedAmount[] = [];

  for (const match of text.matchAll(strongPattern)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const suffix = text.slice(index + raw.length, index + raw.length + 12);

    results.push({
      raw,
      amount: parseAmount(match[2]),
      index,
      currencyToken: strongToken(match[1]),
      perPeriod: perPeriodFrom(suffix),
    });
  }

  for (const match of text.matchAll(degradedPattern)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const suffix = text.slice(index + raw.length, index + raw.length + 12);

    if (!degradedIsSupported(text, index, suffix)) {
      continue; // ordinary question mark before a number - not money
    }

    results.push({
      raw,
      amount: parseAmount(match[1]),
      index,
      currencyToken: "degraded_pound",
      perPeriod: perPeriodFrom(suffix),
    });
  }

  return results
    .filter((entry) => Number.isFinite(entry.amount))
    .sort((first, second) => first.index - second.index);
};

// The single most likely "headline" amount: the first grounded amount in reading
// order. Callers that need a role-aware choice (refund total vs subtotal) should
// use the general-admin extraction layer instead.
export const firstGroundedAmount = (text: string): GroundedAmount | undefined =>
  extractGroundedAmounts(text)[0];
