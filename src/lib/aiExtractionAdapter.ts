import type { AiExtractedAmount, AiExtractedDate, AiExtractionResult } from "../types";

const formatAmount = (amount: AiExtractedAmount) => {
  if (amount.value === null) {
    return undefined;
  }

  const currency = amount.currency === "GBP" ? "£" : "";
  const frequency =
    amount.frequency === "monthly"
      ? " per month"
      : amount.frequency === "annual"
        ? " per year"
        : "";

  return `${currency}${amount.value}${frequency}`;
};

const findAmount = (amounts: AiExtractedAmount[], patterns: RegExp[]) =>
  amounts.find((amount) =>
    patterns.some((pattern) => pattern.test(`${amount.label} ${amount.sourceQuote}`)),
  );

const findDate = (dates: AiExtractedDate[], patterns: RegExp[]) =>
  dates.find((date) =>
    patterns.some((pattern) => pattern.test(`${date.label} ${date.sourceQuote}`)),
  );

const asLine = (label: string, value?: string | null) => (value ? `${label}: ${value}` : undefined);

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const hasRecurringBillingSignals = (text = "") =>
  /\/month|per month|monthly|auto-renewing|auto renewing|subscription|until cancelled|until canceled|charged automatically|renews|recurring|learn how to cancel/i.test(
    text,
  );

const hasAiClassificationConflict = (extraction: AiExtractionResult, sourceText?: string) =>
  Boolean(
    sourceText &&
      hasRecurringBillingSignals(sourceText) &&
      (extraction.documentType === "train_delay" ||
        extraction.documentType === "travel_disruption" ||
        extraction.serviceType === "travel"),
  );

const isDateSourceSupported = (date: AiExtractedDate, sourceText?: string) => {
  if (!sourceText) {
    return false;
  }

  const normalizedSource = normalize(sourceText);
  const normalizedQuote = normalize(date.sourceQuote);
  const normalizedValue = normalize(date.value ?? "");

  if (normalizedValue) {
    return normalizedSource.includes(normalizedValue);
  }

  return Boolean(normalizedQuote && normalizedSource.includes(normalizedQuote));
};

export const buildAdminTextFromAiExtraction = (
  extraction: AiExtractionResult,
  fallbackText?: string,
) => {
  const sourceSupportedDates = extraction.dates.filter((date) =>
    isDateSourceSupported(date, fallbackText),
  );
  const sourceSupportedDeadlines = extraction.deadlines.filter((date) =>
    isDateSourceSupported(date, fallbackText),
  );
  const currentAmount = findAmount(extraction.amounts, [
    /current/i,
    /old/i,
    /existing/i,
    /was/i,
  ]);
  const newAmount = findAmount(extraction.amounts, [
    /new/i,
    /increase/i,
    /future/i,
    /will/i,
    /rise/i,
  ]);
  const effectiveDate =
    findDate(sourceSupportedDates, [/effective/i, /from/i, /increase/i, /takes effect/i]) ??
    sourceSupportedDeadlines[0];
  const contractStartDate = findDate(sourceSupportedDates, [/contract start/i, /started/i, /joined/i, /agreement began/i]);
  const contractRenewalDate = findDate(sourceSupportedDates, [/renewal/i, /renewed/i]);
  const responseDeadline = sourceSupportedDeadlines[0];
  const currentAmountText = currentAmount ? formatAmount(currentAmount) : undefined;
  const newAmountText = newAmount ? formatAmount(newAmount) : undefined;
  const priceRiseSentence =
    currentAmountText && newAmountText
      ? `Your ${extraction.serviceType ?? "service"} tariff will increase from ${currentAmountText} to ${newAmountText}${effectiveDate?.value ? ` from ${effectiveDate.value}` : ""}.`
      : undefined;
  const classificationConflict = hasAiClassificationConflict(extraction, fallbackText);
  const lines = [
    "AI extracted admin facts for deterministic AdminAvenger checking.",
    classificationConflict
      ? "AI warning: Local model classification conflicted with recurring billing signals, so deterministic rules should take priority."
      : undefined,
    asLine("Provider", extraction.providerName),
    asLine("Service type", extraction.serviceType?.replaceAll("_", " ") ?? undefined),
    priceRiseSentence,
    currentAmountText ? `Current monthly price: ${currentAmountText}` : undefined,
    newAmountText ? `New monthly price: ${newAmountText}` : undefined,
    effectiveDate?.value ? `Effective date: ${effectiveDate.value}` : undefined,
    contractStartDate?.value ? `Contract started on ${contractStartDate.value}` : undefined,
    contractRenewalDate?.value ? `Contract renewed on ${contractRenewalDate.value}` : undefined,
    responseDeadline?.value ? `Please respond before ${responseDeadline.value}` : undefined,
    extraction.contractClues.length > 0
      ? `Contract clues: ${extraction.contractClues.join(", ")}`
      : undefined,
    extraction.optionsMentioned.length > 0
      ? `Options mentioned: ${extraction.optionsMentioned.join(", ")}`
      : undefined,
    extraction.rightsConfirmed.length > 0
      ? `Provider wording found: ${extraction.rightsConfirmed.join(", ")}`
      : undefined,
    extraction.rightsNeedChecking.length > 0
      ? `Please confirm whether cancellation rights apply: ${extraction.rightsNeedChecking.join(", ")}`
      : undefined,
    extraction.evidenceQuotes.length > 0
      ? `Evidence quotes: ${extraction.evidenceQuotes.join(" | ")}`
      : undefined,
    extraction.missingInformation.length > 0
      ? `Missing information: ${extraction.missingInformation.join(", ")}`
      : undefined,
    extraction.warnings.length > 0 ? `AI warnings: ${extraction.warnings.join(", ")}` : undefined,
    fallbackText ? `Original pasted text for reference: ${fallbackText}` : undefined,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
};
