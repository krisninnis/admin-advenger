import type { AdminItem } from "../types";
import { extractReferenceNumber } from "./moneyParsers";
import { classifyDeadlineRelationship } from "./resultTopClarity";

export type PaymentReminderAssessment = {
  isPaymentReminder: boolean;
  sender?: string;
  letterDate?: string;
  accountReference?: string;
  amountDue?: string;
  paymentDueDate?: string;
  responseDeadline?: string;
  requestedAction?: string;
  alternativeEvidenceAction?: string;
  collectionActivityPossible: boolean;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthLookup: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const monthDatePattern = String.raw`\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}`;
const slashDatePattern = String.raw`\d{1,2}\/\d{1,2}\/\d{4}`;
const isoDatePattern = String.raw`\d{4}-\d{2}-\d{2}`;
const datePattern = String.raw`(${monthDatePattern}|${slashDatePattern}|${isoDatePattern})`;
const amountPattern = /(?:\u00a3|GBP\s*)\d+(?:,\d{3})*(?:\.\d{1,2})?/i;

const normaliseWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const formatDateParts = (day: number, monthIndex: number, year: number) =>
  `${day} ${monthNames[monthIndex]} ${year}`;

export const normalisePaymentReminderDate = (value?: string) => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (iso) {
    return formatDateParts(Number(iso[3]), Number(iso[2]) - 1, Number(iso[1]));
  }

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slash) {
    return formatDateParts(Number(slash[1]), Number(slash[2]) - 1, Number(slash[3]));
  }

  const month = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  if (month) {
    const monthIndex = monthLookup[month[2].toLowerCase()];

    if (monthIndex !== undefined) {
      return formatDateParts(Number(month[1]), monthIndex, Number(month[3]));
    }
  }

  return trimmed;
};

const firstMatch = (text: string, pattern: RegExp) => text.match(pattern)?.[1];

const findDateAfter = (text: string, prefixes: string[]) => {
  for (const prefix of prefixes) {
    const match = text.match(new RegExp(`${prefix}\\s+${datePattern}`, "i"))?.[1];
    const normalised = normalisePaymentReminderDate(match);

    if (normalised) {
      return normalised;
    }
  }

  return undefined;
};

const extractAmountDue = (text: string) => {
  const explicitAmount = firstMatch(
    text,
    new RegExp(
      String.raw`(?:unpaid balance of|amount due:?\s*|balance due:?\s*|payment required:?\s*|please pay(?: the balance)?(?: of)?\s*)(${amountPattern.source})`,
      "i",
    ),
  );

  return explicitAmount ?? text.match(amountPattern)?.[0];
};

const extractAccountReference = (text: string) =>
  firstMatch(
    text,
    /\b(?:account reference|account ref|account number)\b\s*:?\s*([A-Z0-9][A-Z0-9-]{2,})\b/i,
  ) ?? extractReferenceNumber(text);

const attachmentMarkerPattern = /^---\s*Document file(?:\s+\d+)?:\s*.+---$/i;

const stripAttachmentMarkers = (text: string) =>
  text.replace(/---\s*Document file(?:\s+\d+)?:\s*[^\r\n]*---/gi, "\n");

const isPlausibleSenderCandidate = (value: string) => {
  const candidate = normaliseWhitespace(value);

  if (!candidate || candidate.length > 80 || !/[A-Za-z]/.test(candidate)) {
    return false;
  }

  if (
    /^(payment reminder|date|account reference|account ref|reference|ref|our records|payment was due|please pay|if you have already paid|telephone|tel|phone)\b/i.test(candidate) ||
    /\bpayment reminder\b/i.test(candidate) ||
    attachmentMarkerPattern.test(candidate) ||
    amountPattern.test(candidate) ||
    new RegExp(datePattern, "i").test(candidate) ||
    /\b[A-Z]{1,5}-?\d{3,}\b/i.test(candidate) ||
    /\b\d{3,}\s*\d{3,}\s*\d{3,}\b/.test(candidate) ||
    /\.(?:pdf|docx?|txt|png|jpe?g)\b/i.test(candidate) ||
    /[:@]/.test(candidate)
  ) {
    return false;
  }

  return true;
};

const extractSender = (item: AdminItem) => {
  const cleanedText = stripAttachmentMarkers(item.rawText);
  const lines = cleanedText
    .split(/\r?\n/)
    .map(normaliseWhitespace)
    .filter(Boolean);
  const firstContentLine = lines.find(isPlausibleSenderCandidate);

  if (firstContentLine) {
    return firstContentLine;
  }

  const paymentReminderIndex = cleanedText.search(/\bpayment reminder\b/i);

  if (paymentReminderIndex <= 0) {
    return undefined;
  }

  const beforePaymentReminder = cleanedText.slice(0, paymentReminderIndex);
  const flattenedCandidate = beforePaymentReminder
    .split(/\r?\n/)
    .map(normaliseWhitespace)
    .filter(Boolean)
    .at(-1);

  return flattenedCandidate && isPlausibleSenderCandidate(flattenedCandidate)
    ? flattenedCandidate
    : undefined;
};

const hasAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const negativePatterns = [
  /\bthank you for your payment\b/i,
  /\bpayment received\b/i,
  /\bpaid in full\b/i,
  /\bbalance is now\s*(?:\u00a3|GBP\s*)?0(?:\.00)?\b/i,
  /\baccount balance is now\s*(?:\u00a3|GBP\s*)?0(?:\.00)?\b/i,
  /\breceipt\b/i,
  /\border confirmation\b/i,
  /\brefund (?:approved|issued|processed|will be returned|has been approved)\b/i,
  /\bsubscription\b/i,
  /\bauto-renew/i,
];

const demandSignalPatterns = [
  /\bfinal notice\b/i,
  /\bpayment reminder\b/i,
  /\bunpaid balance\b/i,
  /\bamount due\b/i,
  /\bbalance due\b/i,
  /\bpayment required\b/i,
  /\bpayment was due\b/i,
  /\bplease pay\b/i,
  /\bpay by\b/i,
  /\bpayment is received by\b/i,
  /\bcollection activity\b/i,
  /\bcontact us by\b/i,
  /\bproof of payment\b/i,
  /\baccount reference\b/i,
];

const requiredActionFrom = (assessment: PaymentReminderAssessment) => {
  if (assessment.responseDeadline) {
    return `The source asks for payment or contact by ${assessment.responseDeadline}.`;
  }

  if (assessment.paymentDueDate) {
    return `The source states a payment due date of ${assessment.paymentDueDate}.`;
  }

  return "Check the payment request before acting.";
};

export const assessPaymentReminder = (item: AdminItem): PaymentReminderAssessment => {
  const text = `${item.title}\n${item.rawText}`;
  const amountDue = extractAmountDue(text);
  const accountReference = extractAccountReference(text);
  const responseDeadline = findDateAfter(text, [
    "unless payment is received by",
    "contact us by",
    "respond by",
    "reply by",
    "pay by",
    "please pay(?: the balance)?(?: or contact us)? by",
  ]);
  const paymentDueDate = findDateAfter(text, [
    "payment was due on",
    "payment due date:?",
    "payment due",
    "due on",
  ]);
  const letterDate = normalisePaymentReminderDate(firstMatch(text, new RegExp(String.raw`\bdate:\s*${datePattern}`, "i")));
  const signalCount = demandSignalPatterns.filter((pattern) => pattern.test(text)).length;
  const hasDemandContext = hasAny(text, [
    /\bunpaid balance\b/i,
    /\bamount due\b/i,
    /\bbalance due\b/i,
    /\bpayment required\b/i,
    /\bpayment was due\b/i,
    /\bplease pay\b/i,
    /\bpay by\b/i,
    /\bpayment is received by\b/i,
  ]);
  const isPaymentReminder =
    Boolean(amountDue) &&
    hasDemandContext &&
    signalCount >= 3 &&
    !hasAny(text, negativePatterns);
  const assessment: PaymentReminderAssessment = {
    isPaymentReminder,
    sender: extractSender(item),
    letterDate,
    accountReference,
    amountDue,
    paymentDueDate,
    responseDeadline,
    collectionActivityPossible: /\b(?:further\s+)?collection\s+activity\b/i.test(text),
    alternativeEvidenceAction: /proof of payment/i.test(text)
      ? "If already paid, send proof of payment so the account can be updated."
      : undefined,
  };

  return {
    ...assessment,
    requestedAction: isPaymentReminder ? requiredActionFrom(assessment) : undefined,
  };
};

export const buildPaymentReminderSuggestedAction = (
  assessment: PaymentReminderAssessment,
  now: Date = new Date(),
) => {
  const referencePart = assessment.accountReference
    ? `the account reference ${assessment.accountReference} and `
    : "";
  const amountPart = assessment.amountDue ? `${assessment.amountDue} is` : "the amount is";
  const responseRelationship = assessment.responseDeadline
    ? classifyDeadlineRelationship(assessment.responseDeadline, now)
    : undefined;
  const paymentRelationship = assessment.paymentDueDate
    ? classifyDeadlineRelationship(assessment.paymentDueDate, now)
    : undefined;

  if (responseRelationship === "passed") {
    const paymentContext = paymentRelationship === "passed" && assessment.paymentDueDate
      ? ` The source-stated payment due date (${assessment.paymentDueDate}) and later pay-or-contact date (${assessment.responseDeadline}) have both passed.`
      : ` The source-stated pay-or-contact date (${assessment.responseDeadline}) has passed.`;

    return `Check ${referencePart}whether ${amountPart} correct, whether it has already been paid, and whether this has already been resolved.${paymentContext} Verify the current account status through an independently verified provider channel before deciding what to do. Keep proof of payment or contact.`;
  }

  if (responseRelationship === "today") {
    return `Check ${referencePart}whether ${amountPart} correct or already paid. The source-stated pay-or-contact date is today (${assessment.responseDeadline}). Verify the source and current account status before deciding whether any action is needed. Keep proof of payment or contact.`;
  }

  if (responseRelationship === "upcoming") {
    return `Check ${referencePart}whether ${amountPart} correct or already paid. If action is still needed, the source states a pay-or-contact date of ${assessment.responseDeadline}. Use a verified provider channel and keep proof of payment or contact.`;
  }

  if (assessment.responseDeadline) {
    return `Check ${referencePart}whether ${amountPart} correct or already paid. The source states a pay-or-contact date of ${assessment.responseDeadline}, but AdminAvenger cannot safely compare it with today's date. Check the original notice and current account status before deciding what to do. Keep proof of payment or contact.`;
  }

  if (paymentRelationship === "passed" && assessment.paymentDueDate) {
    return `Check ${referencePart}whether ${amountPart} correct, whether it has already been paid, and whether this has already been resolved. The source-stated payment due date (${assessment.paymentDueDate}) has passed. Verify the current account status through an independently verified provider channel before deciding what to do. Keep proof of payment or contact.`;
  }

  return `Check ${referencePart}whether ${amountPart} correct or already paid. If needed, use a verified provider channel to pay, dispute, or query the balance. Keep proof of payment or contact.`;
};
