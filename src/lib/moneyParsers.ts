const pound = String.fromCharCode(163);

export type CurrencyAmount = {
  raw: string;
  amount: number;
};

export type EnergyPriceChangeDetails = {
  provider?: string;
  startDate?: string;
  electricityOldAnnual?: number;
  electricityNewAnnual?: number;
  electricityIncrease?: number;
  gasOldAnnual?: number;
  gasNewAnnual?: number;
  gasIncrease?: number;
  previousAnnualEstimate?: number;
  newAnnualEstimate?: number;
  totalAnnualIncrease?: number;
  noActionWording?: string;
};

export type TravelRecoveryDetails = {
  recoveryAmount?: number;
  bookingReference?: string;
  airline?: string;
  travelCompany?: string;
  suggestedRecipient?: string;
  proofRequested?: string;
  proofAvailable: string[];
  missingProof: string[];
  extraCostDescription?: string;
};

// Matches plain and comma-thousand amounts: 42.99, 1200, 1,200, 12,500.50
export const moneyValueSource = String.raw`\d+(?:,\d{3})*(?:\.\d{1,2})?`;
export const currencyPrefixSource = String.raw`(?:GBP\s*|£\s*|Â£\s*|\?\s*)`;

export const parseMoneyAmount = (value: string) =>
  Number(value.replace(/[^0-9.]/g, ""));

const currencyAmountPattern = new RegExp(`${currencyPrefixSource}(${moneyValueSource})`, "gi");
const monthlyAmountPattern = new RegExp(
  `${currencyPrefixSource}(${moneyValueSource})\\s*(?:\\/month|per month|monthly)?`,
  "i",
);

export const formatCurrency = (amount: number) =>
  `${pound}${amount.toLocaleString("en-GB", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export const formatAnnualImpact = (amount?: number) =>
  amount === undefined ? undefined : `${formatCurrency(amount)}/year`;

export const extractCurrencyAmounts = (text: string): CurrencyAmount[] =>
  [...text.matchAll(currencyAmountPattern)]
    .map((match) => ({
      raw: match[0].trim(),
      amount: parseMoneyAmount(match[1]),
    }))
    .filter((match) => Number.isFinite(match.amount));

export const extractMonthlyAmount = (text: string) => {
  const monthlyMatch =
    text.match(
      new RegExp(`${currencyPrefixSource}(${moneyValueSource})\\s*(?:\\/month|per month|monthly)`, "i"),
    ) ??
    (/(?:subscription|monthly|recurring|auto-renewing|auto renewing)/i.test(text)
      ? text.match(monthlyAmountPattern)
      : undefined);

  return monthlyMatch ? parseMoneyAmount(monthlyMatch[1]) : undefined;
};

export const annualiseMonthlyAmount = (amount?: number) =>
  amount === undefined ? undefined : Number((amount * 12).toFixed(2));

export const extractReferenceNumber = (text: string) =>
  text
    .match(/\b(?:airline booking reference|booking reference|complaint reference|case reference|order number|reference|ref)\b\s*(?::|#|-)?\s*([A-Z0-9][A-Z0-9.-]{3,})\b/i)?.[1]
    ?.replace(/[.]+$/g, "");

export const extractRefundWindow = (text: string) =>
  text
    .match(/(?:within\s+)?(\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days)/i)?.[0]
    ?.replace(/^within\s+/i, "");

const amountAfterLabel = (text: string, label: string) =>
  text.match(new RegExp(`${label}:\\s*${currencyPrefixSource}(${moneyValueSource})`, "i"))?.[1];

const parseSectionAmount = (section: string, label: string) => {
  const value = amountAfterLabel(section, label);
  return value ? parseMoneyAmount(value) : undefined;
};

const sectionBetween = (text: string, start: RegExp, end?: RegExp) => {
  const startMatch = text.match(start);

  if (!startMatch || startMatch.index === undefined) {
    return "";
  }

  const sliced = text.slice(startMatch.index);
  const endMatch = end ? sliced.slice(startMatch[0].length).match(end) : undefined;

  if (!endMatch || endMatch.index === undefined) {
    return sliced;
  }

  return sliced.slice(0, startMatch[0].length + endMatch.index);
};

export const extractExplicitEnergyDifferences = (text: string) => {
  const differenceSection = sectionBetween(text, /price difference\s*:/i);

  return {
    electricityIncrease: parseSectionAmount(differenceSection, "Electricity"),
    gasIncrease: parseSectionAmount(differenceSection, "Gas"),
  };
};

export const extractEnergyAnnualCosts = (text: string): EnergyPriceChangeDetails => {
  const oldSection = sectionBetween(
    text,
    /estimated annual costs until/i,
    /estimated annual costs from|price difference/i,
  );
  const newSection = sectionBetween(
    text,
    /estimated annual costs from/i,
    /price difference/i,
  );
  const explicitDifferences = extractExplicitEnergyDifferences(text);
  const electricityOldAnnual = parseSectionAmount(oldSection, "Electricity");
  const gasOldAnnual = parseSectionAmount(oldSection, "Gas");
  const electricityNewAnnual = parseSectionAmount(newSection, "Electricity");
  const gasNewAnnual = parseSectionAmount(newSection, "Gas");
  const electricityIncrease =
    explicitDifferences.electricityIncrease ??
    (electricityOldAnnual !== undefined && electricityNewAnnual !== undefined
      ? Number((electricityNewAnnual - electricityOldAnnual).toFixed(2))
      : undefined);
  const gasIncrease =
    explicitDifferences.gasIncrease ??
    (gasOldAnnual !== undefined && gasNewAnnual !== undefined
      ? Number((gasNewAnnual - gasOldAnnual).toFixed(2))
      : undefined);
  const previousAnnualEstimate =
    electricityOldAnnual !== undefined && gasOldAnnual !== undefined
      ? Number((electricityOldAnnual + gasOldAnnual).toFixed(2))
      : undefined;
  const newAnnualEstimate =
    electricityNewAnnual !== undefined && gasNewAnnual !== undefined
      ? Number((electricityNewAnnual + gasNewAnnual).toFixed(2))
      : undefined;
  const totalAnnualIncrease =
    electricityIncrease !== undefined || gasIncrease !== undefined
      ? Number(((electricityIncrease ?? 0) + (gasIncrease ?? 0)).toFixed(2))
      : newAnnualEstimate !== undefined && previousAnnualEstimate !== undefined
        ? Number((newAnnualEstimate - previousAnnualEstimate).toFixed(2))
        : undefined;

  return {
    provider: text.match(/\bE\.?ON Next\b/i)?.[0],
    startDate: text.match(/(?:from|on)\s+(\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?)/)?.[1],
    electricityOldAnnual,
    electricityNewAnnual,
    electricityIncrease,
    gasOldAnnual,
    gasNewAnnual,
    gasIncrease,
    previousAnnualEstimate,
    newAnnualEstimate,
    totalAnnualIncrease,
    noActionWording: text.match(/you don't need to do anything|you do not need to do anything/i)?.[0],
  };
};

export const isEnergyPriceChangeText = (text: string) =>
  /energy|electricity|gas|ofgem|price cap|e\.?on/i.test(text) &&
  (/estimated annual costs|price difference|electricity:\s*(?:GBP\s*|£|Â£|\?)/i.test(text) ||
    /gas:\s*(?:GBP\s*|£|Â£|\?)/i.test(text));

export const isSourceSupportedDate = (dateValue: string, sourceText: string) =>
  sourceText.toLowerCase().includes(dateValue.toLowerCase());

const travelSignals = [
  "flight cancelled",
  "flight cancellation",
  "schedule change",
  "airline changed flight",
  "extra night",
  "extra hotel night",
  "hotel cost",
  "additional costs",
  "incurred additional costs",
  "proof of payment",
  "bank statement",
  "compensation",
  "reimbursement",
  "travel insurance",
  "caa",
  "airline booking reference",
  "booking reference",
  "air mauritius",
  "loveholidays",
];

export const isTravelDisruptionRecoveryText = (text: string) => {
  const normalized = text.toLowerCase();
  const signalCount = travelSignals.filter((signal) => normalized.includes(signal)).length;
  const hasTravelParty = /air mauritius|airline|flight|loveholidays|travel insurance|caa/i.test(text);
  const hasExtraCost = /extra night|extra hotel|hotel cost|additional costs|incurred additional costs|reimbursement|compensation|potential recovery amount/i.test(text);

  return signalCount >= 3 && hasTravelParty && hasExtraCost;
};

export const extractTravelRecoveryDetails = (text: string): TravelRecoveryDetails => {
  const potentialRecoveryMatch =
    text.match(new RegExp(`potential recovery amount:\\s*${currencyPrefixSource}(${moneyValueSource})`, "i")) ??
    text.match(new RegExp(`extra amount was\\s*${currencyPrefixSource}(${moneyValueSource})`, "i")) ??
    text.match(
      new RegExp(`extra hotel night cost\\s*(?:of|was|:)?\\s*${currencyPrefixSource}(${moneyValueSource})`, "i"),
    );
  const airline = text.match(/Air Mauritius/i)?.[0];
  const travelCompany = text.match(/loveholidays/i)?.[0];
  const airMauritiusAskedForProof = /Air Mauritius[^.]*bank statement|bank statement[^.]*Air Mauritius|asked me to provide a bank statement/i.test(text);
  const proofAvailable = [
    /schedule change email/i.test(text) ? "loveholidays schedule change email" : undefined,
    /confirmation of\s*(?:GBP\s*|£|Â£|\?)/i.test(text) || /added to my existing payment schedule/i.test(text)
      ? "loveholidays confirmation of amount added to payment schedule"
      : undefined,
    /request for bank statement|provide a bank statement/i.test(text)
      ? "Air Mauritius request for bank statement proof of payment"
      : undefined,
    /screenshots|booking confirmation pdf/i.test(text)
      ? "screenshots / booking confirmation PDF may be available"
      : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    recoveryAmount: potentialRecoveryMatch ? parseMoneyAmount(potentialRecoveryMatch[1]) : undefined,
    bookingReference: extractReferenceNumber(text),
    airline,
    travelCompany,
    suggestedRecipient: airMauritiusAskedForProof ? airline ?? "Air Mauritius" : travelCompany ?? airline,
    proofRequested: airMauritiusAskedForProof
      ? "Air Mauritius asked for bank statement proof of payment"
      : /proof of payment/i.test(text)
        ? "Proof of payment requested"
        : undefined,
    proofAvailable,
    missingProof: [
      "Bank statement or card statement showing payment",
      "Any standalone hotel receipt if available",
      "Flight change/cancellation notice if available",
      "Exact date of disruption if not found",
      "Passenger names should be checked before sending",
      "Whether the airline has already paid or rejected the claim",
    ],
    extraCostDescription: /extra (?:night|hotel night)/i.test(text)
      ? "Extra hotel night mentioned"
      : "Additional travel cost mentioned",
  };
};

// --- Total-cost vs recoverable-amount context guards ---

// Phrases that describe the total price of a trip/booking/order. Amounts in these
// contexts are evidence only and must never be treated as recoverable money.
export const totalCostPhrasePattern =
  /total\s+(?:holiday|trip|booking|order|package|basket)\s+cost|(?:holiday|trip|booking|order|package)\s+(?:cost|total)|total\s+cost\s+of\s+(?:the\s+|my\s+|our\s+)?(?:holiday|trip|booking|order|package)|order\s+total|booking\s+total|total\s+(?:paid|price)/i;

// Wording that clearly refers to money the user may actually get back.
export const recoverableTravelSignalPattern =
  /extra\s+hotel|extra\s+night|additional\s+(?:hotel\s+)?cost|reimburs\w*|compensat\w*|claim\s+amount|refund\s+(?:approved|issued|processed|of)|amount\s+to\s+be\s+refunded|money\s+owed|payout|delay\s+repay/i;

const splitSentences = (text: string) => text.split(/(?<=[.!?\n])\s*/);

const firstAmountIn = (sentence: string): CurrencyAmount | undefined => {
  const match = sentence.match(new RegExp(`${currencyPrefixSource}(${moneyValueSource})`, "i"));
  return match ? { raw: match[0].trim(), amount: parseMoneyAmount(match[1]) } : undefined;
};

// Amount mentioned alongside a total-cost phrase (evidence only, not recovery).
export const extractTotalCostMention = (text: string): CurrencyAmount | undefined => {
  for (const sentence of splitSentences(text)) {
    if (totalCostPhrasePattern.test(sentence)) {
      const amount = firstAmountIn(sentence);

      if (amount) {
        return amount;
      }
    }
  }

  return undefined;
};

// An amount only counts as recoverable if its own sentence contains clear
// recoverable wording and is not a total trip/booking/order cost.
export const extractRecoverableAmount = (text: string): number | undefined => {
  for (const sentence of splitSentences(text)) {
    if (recoverableTravelSignalPattern.test(sentence) && !totalCostPhrasePattern.test(sentence)) {
      const amount = firstAmountIn(sentence);

      if (amount) {
        return amount.amount;
      }
    }
  }

  return undefined;
};

// Generic cancelled travel with no clear recoverable amount: this is an
// evidence/admin check, not a refund or money-back case.
export const isTravelEvidenceCheckText = (text: string) =>
  /flight|airline|air\s+travel/i.test(text) &&
  /cancell?ed|cancellation/i.test(text) &&
  !recoverableTravelSignalPattern.test(text) &&
  !/refund/i.test(text);
