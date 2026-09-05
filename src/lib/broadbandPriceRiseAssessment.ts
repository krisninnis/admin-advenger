import type { AdminItem, BroadbandPriceRiseAssessment } from "../types";

const moneyAmountPattern = String.raw`(?:GBP\s*|\u00a3\s*|\?\s*)?(\d+(?:\.\d{1,2})?)`;

const datePattern = String.raw`(\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})`;
// Only numbers explicitly marked as money count as prices. Dates, reference
// numbers, and other bare digits are never invented into a price.
const currencyPrice = String.raw`(?:GBP\s*|\u00a3\s*|Â£\s*)\s*(\d+(?:\.\d{1,2})?)`;
const contractRegimeCutoff = Date.UTC(2025, 0, 17);

const monthIndexes: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const normaliseSpaces = (value?: string) => value?.replace(/\s+/g, " ").trim();

const formatMoney = (amount: number) =>
  `£${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;

const formatMoneyValue = (amount: number) =>
  `${String.fromCharCode(163)}${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;
void formatMoney;

const getFirstMatch = (text: string, pattern: RegExp) =>
  normaliseSpaces(text.match(pattern)?.[1]);

const getAllMatches = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map((match) => normaliseSpaces(match[0])).filter(Boolean) as string[];

const unique = (items: string[]) => [...new Set(items)];

const extractPricePair = (text: string) => {
  // Explicit old->new pair: "from £34 to £46 per month", "from GBP 34 to GBP 46".
  // Both amounts are stated as prices, so this is a source-grounded pair.
  const pairMatch = text.match(
    new RegExp(`from\\s+${currencyPrice}\\s+(?:per month\\s+)?(?:to|up to)\\s+${currencyPrice}`, "i"),
  );

  if (pairMatch) {
    return {
      oldPrice: Number(pairMatch[1]),
      newPrice: Number(pairMatch[2]),
    };
  }

  // Explicit increase-by with a stated new total: "increase by £3.00 to £33.00".
  // The old price is a correct derivation (new - increase) because both the
  // increment and the new total are grounded by the source.
  const byToMatch = text.match(
    new RegExp(`by\\s+${currencyPrice}\\s+(?:to|up to)\\s+${currencyPrice}`, "i"),
  );

  if (byToMatch) {
    const increase = Number(byToMatch[1]);
    const newPrice = Number(byToMatch[2]);
    return newPrice > increase
      ? { oldPrice: newPrice - increase, newPrice }
      : { oldPrice: undefined, newPrice };
  }

  // Either side alone, only when it is explicitly marked as money and placed in
  // an unambiguous price phrase. A missing other side is never invented.
  const oldMatch = text.match(
    new RegExp(
      `(?:current|old|previous)\\b[^.!?\\n]{0,25}?\\b(?:price|tariff|bill|rate)\\b[^.!?\\n]{0,12}?${currencyPrice}(?!\\s*(?:to|up to)\\s*${currencyPrice})`,
      "i",
    ),
  );
  const hadOld = oldMatch ? Number(oldMatch[1]) : undefined;

  const newMatch = text.match(
    new RegExp(
      `(?:(?:will|would|shall)\\s+(?:rise|increase|go up|rise up)\\s+to|\\b(?:rises|increases|goes up|go up)\\s+to|new\\s+(?:monthly\\s+)?(?:price|tariff)\\s+(?:is|will\\s+be)\\s+|increase\\s+to)\\s*${currencyPrice}`,
      "i",
    ),
  );
  const hadNew = newMatch ? Number(newMatch[1]) : undefined;

  return {
    oldPrice: hadOld !== undefined && Number.isFinite(hadOld) ? hadOld : undefined,
    newPrice: hadNew !== undefined && Number.isFinite(hadNew) ? hadNew : undefined,
  };
};

const cleanProviderName = (value?: string) =>
  normaliseSpaces(value)?.replace(/[.,:;]+$/, "").trim();

// A provider name is never a price, a period or a date. The explicit-provider
// pattern below alternates on "from", so "increase from GBP 34 to GBP 46 per
// month from 1 September 2026" used to capture the price phrase: "GBP" begins
// with a capital letter, and the character class allows digits and spaces. The
// pound-sign spelling escaped it only by accident, because "£" is not A-Z.
//
// Inventing a provider is worse than reporting none, so anything that looks
// like money, a period or a date is rejected outright.
const looksLikeMoneyPeriodOrDate = (value: string): boolean =>
  /(?:^|\s)(?:GBP|USD|EUR)\s*\d/i.test(value) ||
  /[£$€]\s*\d/.test(value) ||
  /\bper\s+(?:month|year|annum|quarter|week)\b/i.test(value) ||
  /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(
    value,
  ) ||
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(
    value,
  );

const isPlausibleProviderHeading = (value?: string) => {
  const cleaned = cleanProviderName(value);

  if (!cleaned || cleaned.length < 2 || cleaned.length > 60) {
    return false;
  }

  if (looksLikeMoneyPeriodOrDate(cleaned)) {
    return false;
  }

  if (
    /\.(?:docx?|pdf|txt|md|csv|json|jpe?g|png)$/i.test(cleaned) ||
    /^---/.test(cleaned) ||
    /^(?:document|attachment|file)\b/i.test(cleaned) ||
    /^(?:service\s+)?price\s+change\s+notice$/i.test(cleaned) ||
    /^(?:date|account reference|reference|telephone|phone|your monthly|please|this notice)\b/i.test(cleaned)
  ) {
    return false;
  }

  return /^[A-Z0-9][A-Za-z0-9&.'’ -]{1,59}$/.test(cleaned);
};

const extractProviderName = (text: string) => {
  const explicitProvider = getFirstMatch(
    text,
    /(?:your provider is|provider(?:\s+is)?|with|from)\s*:?\s+([A-Z][A-Za-z0-9&.'’ -]{1,60}?)(?=[.,:\n]|\s+(?:will|has|is)\b|$)/,
  );

  // A rejected candidate must not stop the heading route from finding a real
  // provider further down, so this falls through rather than returning early.
  if (explicitProvider) {
    const cleaned = cleanProviderName(explicitProvider);

    if (cleaned && !looksLikeMoneyPeriodOrDate(cleaned)) {
      return cleaned;
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => normaliseSpaces(line))
    .filter((line): line is string => Boolean(line));

  const noticeHeadingIndex = lines.findIndex((line) =>
    /^(?:service\s+)?price\s+change\s+notice$/i.test(line),
  );

  if (noticeHeadingIndex > 0) {
    const headingCandidate = lines[noticeHeadingIndex - 1];

    if (isPlausibleProviderHeading(headingCandidate)) {
      return cleanProviderName(headingCandidate);
    }
  }

  return undefined;
};

const extractEffectiveDate = (text: string) =>
  getFirstMatch(
    text,
    new RegExp(`(?:from|starting|starts|effective from|takes effect on|change date is)\\s+${datePattern}`, "i"),
  );

const extractResponseDeadline = (text: string) =>
  getFirstMatch(
    text,
    new RegExp(`(?:before|by|respond by|contact us before|contact us by)\\s+${datePattern}`, "i"),
  );

const extractResponseDeadlinePurpose = (
  text: string,
  responseDeadline?: string,
): BroadbandPriceRiseAssessment["responseDeadlinePurpose"] => {
  if (!responseDeadline) return undefined;

  const conditionalContact = text.match(new RegExp(
    `contact us\\s+(?:before|by)\\s+${datePattern}\\s+if\\s+(?:any\\s+)?details\\s+(?:appear|are|look)\\s+incorrect\\b`,
    "i",
  ));

  return normaliseSpaces(conditionalContact?.[1]) === responseDeadline
    ? "contact_provider_if_details_incorrect"
    : undefined;
};

const parseDetectedDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashMatch) {
    const year =
      slashMatch[3].length === 2 ? Number(`20${slashMatch[3]}`) : Number(slashMatch[3]);
    return Date.UTC(year, Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  }

  const wordMatch = value.match(/^(\d{1,2})\s+([A-Z][a-z]+)(?:\s+(\d{4}))?$/);

  if (wordMatch) {
    const monthIndex = monthIndexes[wordMatch[2].toLowerCase()];

    if (monthIndex === undefined || !wordMatch[3]) {
      return undefined;
    }

    return Date.UTC(Number(wordMatch[3]), monthIndex, Number(wordMatch[1]));
  }

  return undefined;
};

const extractContractDate = (text: string) => {
  const contractDateMatch = text.match(
    new RegExp(
      `(contract started on|contract start date|contract renewed on|renewed on|signed on|joined on|from your renewal on|your agreement began|your plan started(?: on)?)\\s*:?\\s*${datePattern}`,
      "i",
    ),
  );

  if (!contractDateMatch) {
    return {
      contractDate: undefined,
      contractDateType: undefined,
      contractDateConfidence: undefined,
      parsedContractDate: undefined,
    };
  }

  const clue = contractDateMatch[1].toLowerCase();
  const contractDate = normaliseSpaces(contractDateMatch[2]);
  const contractDateType: BroadbandPriceRiseAssessment["contractDateType"] =
    clue.includes("renew") ? "renewal" : clue ? "start" : "unknown";

  return {
    contractDate,
    contractDateType,
    contractDateConfidence: "high" as const,
    parsedContractDate: parseDetectedDate(contractDate),
  };
};

const getContractTimingDetails = (contractDate?: string, parsedContractDate?: number) => {
  if (!contractDate) {
    return {
      contractDateRegime: "missing" as const,
      contractTimingExplanation:
        "Contract start or renewal date is needed. This affects which price-rise terms may apply and whether the increase was shown clearly when you signed or renewed.",
    };
  }

  if (parsedContractDate === undefined) {
    return {
      contractDateRegime: "unknown" as const,
      contractTimingExplanation:
        "Contract date was found, but AdminAvenger could not compare it reliably. Check whether the contract was signed or renewed before or after 17 January 2025.",
    };
  }

  if (parsedContractDate >= contractRegimeCutoff) {
    return {
      contractDateRegime: "newer_or_renewed" as const,
      contractTimingExplanation:
        "This appears to be a newer or renewed contract. Check whether the new monthly price and increase date were clearly shown in pounds and pence when you signed or renewed.",
    };
  }

  return {
    contractDateRegime: "older" as const,
    contractTimingExplanation:
      "This appears to be an older contract. Check the original terms for any price-rise clause, including inflation-linked or percentage-based wording.",
  };
};

const getServiceType = (text: string): BroadbandPriceRiseAssessment["serviceType"] => {
  const lowerText = text.toLowerCase();
  const hasBroadband = /\bbroadband\b/.test(lowerText);
  const hasMobile = /\bmobile\b/.test(lowerText);

  if (hasBroadband && hasMobile) {
    return "broadband_and_mobile";
  }

  if (hasBroadband) {
    return "broadband";
  }

  if (hasMobile) {
    return "mobile";
  }

  return "unknown";
};

const getContractClues = (text: string) =>
  unique(
    getAllMatches(
      text,
      /\b(?:contract|minimum term|package|plan|tariff|monthly price|billing period|account|renewal|agreement|signed|joined)\b/gi,
    ),
  );

const getOptionsMentioned = (text: string) =>
  unique(
    getAllMatches(
      text,
      /\b(?:switch plan|switch package|change package|discuss your package|contact us|alternative package|better deal|retention offer|available options|review your options)\b/gi,
    ),
  );

const getRightsConfirmed = (text: string) =>
  unique(
    getAllMatches(
      text,
      /\b(?:you can cancel|you may cancel|you may leave|you can leave|right to cancel|cancel without penalty|cancel without charge|leave without penalty|leave penalty-free|leave your contract without paying an early termination charge|exit without early termination fees?|switch without charge|without exit fee|no exit fee|penalty-free cancellation)\b/gi,
    ).filter((match) => !/whether|confirm if|confirm whether|check whether/i.test(match)),
  );

const getRightsNeedChecking = (text: string, optionsMentioned: string[], rightsConfirmed: string[]) => {
  const checks: string[] = [];

  if (
    /\b(?:confirm whether|whether|check whether)\s+(?:any\s+)?(?:cancellation|switching|leaving)\s+rights?\s+apply\b/i.test(
      text,
    ) ||
    /\b(?:cancellation|switching|leaving)\s+rights?\s+(?:need|needs|should be)\s+(?:checking|checked|confirmed)\b/i.test(
      text,
    )
  ) {
    checks.push("Cancellation/switching rights need checking");
  }

  if (optionsMentioned.length > 0 && rightsConfirmed.length === 0) {
    checks.push("Options are mentioned, but cancellation or switching rights are not confirmed");
  }

  if (/\b(?:exit fee|early termination charge|minimum term)\b/i.test(text) && rightsConfirmed.length === 0) {
    checks.push("Exit fees or minimum-term wording need checking");
  }

  return unique(checks);
};

export const isBroadbandPriceRiseScenario = (item: AdminItem) => {
  const text = `${item.title}\n${item.rawText}`;
  const lowerText = text.toLowerCase();
  const hasServiceSignal = /\b(broadband|mobile|tariff|package|plan)\b/.test(lowerText);
  const hasIncreaseSignal =
    /\b(tariff|price|bill|monthly price)\s+(?:will\s+)?(?:increase|rise|go up)\b/.test(lowerText) ||
    /\b(price rise|tariff increase|bill increase|rate change|going up)\b/.test(lowerText) ||
    new RegExp(`from\\s+${moneyAmountPattern}\\s+(?:per month\\s+)?(?:to|up to)\\s+${moneyAmountPattern}`, "i").test(text);

  return hasServiceSignal && hasIncreaseSignal;
};

export const assessBroadbandPriceRise = (item: AdminItem): BroadbandPriceRiseAssessment => {
  const text = `${item.title}\n${item.rawText}`;
  const { oldPrice, newPrice } = extractPricePair(text);
  const monthlyIncrease =
    oldPrice !== undefined && newPrice !== undefined ? newPrice - oldPrice : undefined;
  const annualIncrease = monthlyIncrease !== undefined ? monthlyIncrease * 12 : undefined;
  const providerName = extractProviderName(text);
  const serviceType = getServiceType(text);
  const effectiveDate = extractEffectiveDate(text);
  const responseDeadline = extractResponseDeadline(text);
  const responseDeadlinePurpose = extractResponseDeadlinePurpose(text, responseDeadline);
  const {
    contractDate,
    contractDateType,
    contractDateConfidence,
    parsedContractDate,
  } = extractContractDate(text);
  const { contractDateRegime, contractTimingExplanation } = getContractTimingDetails(
    contractDate,
    parsedContractDate,
  );
  const contractStartOrRenewalDate = contractDate;
  const contractClues = getContractClues(text);
  const optionsMentioned = getOptionsMentioned(text);
  const rightsConfirmed = getRightsConfirmed(text);
  const providerWordingFound = rightsConfirmed.map(
    (wording) => `Provider wording appears to say: ${wording}`,
  );
  const rightsNeedChecking = getRightsNeedChecking(text, optionsMentioned, rightsConfirmed);
  const rightsClues = unique([...optionsMentioned, ...rightsConfirmed, ...rightsNeedChecking]);
  const oldMonthlyPrice = oldPrice !== undefined ? formatMoneyValue(oldPrice) : undefined;
  const newMonthlyPrice = newPrice !== undefined ? formatMoneyValue(newPrice) : undefined;
  const formattedMonthlyIncrease =
    monthlyIncrease !== undefined ? formatMoneyValue(monthlyIncrease) : undefined;
  const formattedAnnualIncrease =
    annualIncrease !== undefined ? formatMoneyValue(annualIncrease) : undefined;
  const scenarioDetected = isBroadbandPriceRiseScenario(item);

  const evidenceFound = [
    scenarioDetected ? "Document appears to be a broadband/mobile price-rise notice" : undefined,
    providerName ? `Provider: ${providerName}` : undefined,
    serviceType && serviceType !== "unknown" ? `Service type: ${serviceType.replaceAll("_", " ")}` : undefined,
    oldMonthlyPrice ? `Current monthly price: ${oldMonthlyPrice}` : undefined,
    newMonthlyPrice ? `New monthly price: ${newMonthlyPrice}` : undefined,
    formattedMonthlyIncrease ? `Potential cost increase: ${formattedMonthlyIncrease}/month more` : undefined,
    formattedAnnualIncrease ? `Annual increase if unchanged: ${formattedAnnualIncrease}/year` : undefined,
    effectiveDate ? `Effective date: ${effectiveDate}` : undefined,
    responseDeadline ? `Deadline clue: ${responseDeadline}` : undefined,
    contractDate ? `Contract start/renewal date: ${contractDate}` : undefined,
    contractDate ? `Contract timing: ${contractTimingExplanation}` : undefined,
    optionsMentioned.length > 0 ? `Options mentioned: ${optionsMentioned.join(", ")}` : undefined,
    providerWordingFound.length > 0 ? `Provider wording found: ${rightsConfirmed.join(", ")}` : undefined,
  ].filter((item): item is string => Boolean(item));

  const evidenceMissing = [
    !providerName ? "Provider name missing" : undefined,
    !contractDate ? "Contract start or renewal date missing" : undefined,
    !effectiveDate ? "Effective date missing" : undefined,
    !oldMonthlyPrice ? "Current monthly price missing" : undefined,
    !newMonthlyPrice ? "New monthly price missing" : undefined,
    rightsConfirmed.length === 0 ? "Cancellation/switching rights not confirmed" : undefined,
    ...rightsNeedChecking,
  ].filter((item): item is string => Boolean(item));

  const unknowns = [
    "Whether cancellation or switching rights actually apply to this account.",
    "Whether the provider has a better retention offer or alternative package available.",
    "Whether the increase wording matches the provider's current contract terms.",
  ];

  const documentMatchConfidence: BroadbandPriceRiseAssessment["documentMatchConfidence"] =
    scenarioDetected && (oldMonthlyPrice || newMonthlyPrice || effectiveDate)
      ? "high"
      : scenarioDetected
        ? "medium"
        : "low";
  const hasCriticalGaps = !providerName || !contractDate || rightsConfirmed.length === 0;
  const actionConfidence: BroadbandPriceRiseAssessment["actionConfidence"] = hasCriticalGaps
    ? "needs_more_info"
    : effectiveDate && formattedMonthlyIncrease
      ? "medium"
      : "low";
  const draftSafetyConfidence: BroadbandPriceRiseAssessment["draftSafetyConfidence"] =
    formattedMonthlyIncrease && effectiveDate ? "medium" : "needs_review";
  const confidence =
    actionConfidence === "medium"
      ? 65
      : actionConfidence === "low"
        ? 45
        : 35;
  const documentMatchExplanation =
    documentMatchConfidence === "high"
      ? "The text contains service and price-rise signals, so it strongly looks like a broadband/mobile price-rise notice."
      : "The text has some broadband/mobile price-rise signals, but the document type is not fully clear.";
  const actionConfidenceExplanation =
    actionConfidence === "needs_more_info" && rightsConfirmed.length > 0
      ? "AdminAvenger found provider wording about leaving or switching, but provider name, contract start/renewal date, and account-specific details still need checking before acting."
      : actionConfidence === "needs_more_info"
        ? "AdminAvenger can prepare questions, but provider name, contract start/renewal date, and whether cancellation or switching rights actually apply must be checked before acting."
      : "The main facts are present, but provider terms still need human checking before any decision.";
  const confidenceExplanation = `${documentMatchExplanation} ${actionConfidenceExplanation}`;

  return {
    providerName,
    serviceType,
    oldMonthlyPrice,
    newMonthlyPrice,
    monthlyIncrease: formattedMonthlyIncrease,
    annualIncrease: formattedAnnualIncrease,
    effectiveDate,
    responseDeadline,
    responseDeadlinePurpose,
    contractDate,
    contractDateType,
    contractDateConfidence,
    contractDateRegime,
    contractTimingExplanation,
    contractStartOrRenewalDate,
    contractClues,
    optionsMentioned,
    providerWordingFound,
    rightsConfirmed,
    rightsNeedChecking,
    rightsClues,
    evidenceFound,
    evidenceMissing,
    unknowns,
    confidence,
    documentMatchConfidence,
    actionConfidence,
    draftSafetyConfidence,
    confidenceExplanation,
    documentMatchExplanation,
    actionConfidenceExplanation,
    caveat:
      "This assessment prepares questions and evidence only. It does not decide whether you can cancel, switch, or challenge the increase.",
  };
};
