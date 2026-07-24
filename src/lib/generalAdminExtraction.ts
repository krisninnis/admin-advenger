// Source-grounded general-admin extraction layer.
//
// Pure. Given the submitted text it returns typed dates (with a role and the
// verbatim source quote), typed amounts (with a money role and quote), the
// document status, negation spans, and automatic-vs-manual payment signals.
// Nothing here invents a fact: every date and amount keeps the exact substring
// it came from, so a downstream layer can prove it against the source.

import { extractGroundedAmounts, type GroundedAmount } from "./currencyGrounding";

export type DateRole =
  | "document_date"
  | "stated_deadline"
  | "event_date"
  | "period_boundary"
  | "suggested_followup"
  | "unknown";

export type MoneyRole =
  | "amount_demanded"
  | "amount_collected_automatically"
  | "refund_total"
  | "order_subtotal"
  | "postage"
  | "line_item"
  | "recurring_charge"
  | "price_old"
  | "price_new"
  | "price_increase"
  | "total_cost"
  | "recoverable_amount"
  | "unknown";

export type DocumentStatus =
  | "pending_manual_action"
  | "completed_no_action"
  | "automatic_no_action"
  | "cancelled"
  | "upcoming_reminder"
  | "informational";

export type AmountFrequency = "one_off" | "monthly" | "annual" | "weekly";

export type ExtractedDate = {
  role: DateRole;
  value: string; // verbatim - never reformatted, so it is always source-supported
  sourceQuote: string;
  index: number;
};

export type ExtractedAmount = {
  role: MoneyRole;
  amount: number;
  sourceQuote: string;
  frequency: AmountFrequency;
  index: number;
};

export type NegationSpan = { start: number; end: number; phrase: string };

export type GeneralAdminExtraction = {
  dates: ExtractedDate[];
  amounts: ExtractedAmount[];
  status: DocumentStatus;
  negationSpans: NegationSpan[];
  automaticCollection: boolean;
  automaticCollectionQuote?: string;
};

// --- Negation -------------------------------------------------------------

const NEGATION_PATTERNS: RegExp[] = [
  /(?:please\s+)?do(?:\s+not|n['’]t)\s+reply/gi,
  /no[-\s]?reply/gi,
  /no\s+action\s+(?:is\s+)?(?:required|needed)/gi,
  /no\s+further\s+action/gi,
  /you\s+do(?:\s+not|n['’]t)\s+need\s+to\s+do\s+anything/gi,
  /you\s+do(?:\s+not|n['’]t)\s+need\s+to\s+(?:pay|take\s+any\s+action)/gi,
  /no\s+(?:manual\s+)?payment\s+(?:is\s+)?(?:required|needed)/gi,
  /nothing\s+(?:more\s+)?to\s+pay/gi,
];

export const findNegationSpans = (text: string): NegationSpan[] => {
  const spans: NegationSpan[] = [];

  for (const pattern of NEGATION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const afterPhrase = start + match[0].length;
      const terminator = text.slice(afterPhrase).search(/[.!?\n]/);
      const end =
        terminator === -1
          ? Math.min(text.length, afterPhrase + 100)
          : afterPhrase + terminator + 1;
      spans.push({ start, end, phrase: match[0] });
    }
  }

  return spans.sort((first, second) => first.start - second.start);
};

export const isIndexNegated = (index: number, spans: NegationSpan[]): boolean =>
  spans.some((span) => index >= span.start && index <= span.end);

// --- Automatic vs manual --------------------------------------------------

const AUTOMATIC_PATTERNS: RegExp[] = [
  /direct debit/i,
  /we['’]?ll\s+(?:collect|take)\b/i,
  /we\s+will\s+(?:collect|take)\b/i,
  /(?:collected|taken)\s+automatically/i,
  /automatic(?:ally)?\s+(?:collect|collection|payment)/i,
  /paid\s+by\s+direct\s+debit/i,
  /continuous\s+payment\s+authority/i,
];

export const detectAutomaticCollection = (
  text: string,
): { isAutomatic: boolean; quote?: string } => {
  for (const pattern of AUTOMATIC_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { isAutomatic: true, quote: match[0] };
    }
  }

  return { isAutomatic: false };
};

// --- Dates ----------------------------------------------------------------

const MONTH = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*`;
const DATE_SOURCE = String.raw`\d{1,2}\s+${MONTH}\s+\d{4}|${MONTH}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}`;
const datePattern = new RegExp(`(?:${DATE_SOURCE})`, "gi");
const rangeConnector = /\b(?:to|until|through|and)\b|[-–—]/i;

const DEADLINE_CUE =
  /(?:pay|paid|respond|reply|return|renew|cancel|contact us|reply|responses?)\s+(?:by|before|on or before)\s*$|due\s+by\s*$|deadline[^.]*$|by\s+$|\bbefore\s+$/i;
const EVENT_CUE =
  /(?:appointment|scheduled|booking|collected on|collection date|collect(?:ed|ion)?[^.]*on|effective\s+(?:from|on|date)|takes\s+effect|starts?\s+on|due\s+to\s+arrive|arriv[a-z]*[^.]*(?:on|by)?|on)\s*$/i;
const DOCUMENT_CUE = /(?:date|issued|statement date|dated|invoice date)\s*:?\s*$/i;

const looksLikePeriodBoundary = (text: string, index: number, raw: string): boolean => {
  const before = text.slice(Math.max(0, index - 12), index);
  const after = text.slice(index + raw.length, index + raw.length + 14);
  if (/tax year|billing period|period\s*:?\s*$/i.test(text.slice(Math.max(0, index - 24), index))) {
    return true;
  }
  // A date immediately followed by a range connector and another date, or
  // immediately preceded by one, is part of a period boundary.
  return (
    (rangeConnector.test(after) && datePattern.test(after)) ||
    (rangeConnector.test(before) && new RegExp(`${DATE_SOURCE}\\s*$`, "i").test(text.slice(Math.max(0, index - 30), index)))
  );
};

const roleForDate = (
  text: string,
  index: number,
  raw: string,
  negationSpans: NegationSpan[],
  automatic: boolean,
): DateRole => {
  if (looksLikePeriodBoundary(text, index, raw)) {
    return "period_boundary";
  }

  const before = text.slice(Math.max(0, index - 32), index).toLowerCase();

  if (EVENT_CUE.test(before)) {
    return "event_date";
  }

  if (DEADLINE_CUE.test(before) && !isIndexNegated(index, negationSpans) && !automatic) {
    return "stated_deadline";
  }

  if (DOCUMENT_CUE.test(before)) {
    return "document_date";
  }

  return "unknown";
};

export const extractDates = (
  text: string,
  negationSpans: NegationSpan[] = findNegationSpans(text),
  automatic: boolean = detectAutomaticCollection(text).isAutomatic,
): ExtractedDate[] => {
  const dates: ExtractedDate[] = [];

  for (const match of text.matchAll(datePattern)) {
    const raw = match[0];
    const index = match.index ?? 0;
    dates.push({
      role: roleForDate(text, index, raw, negationSpans, automatic),
      value: raw,
      sourceQuote: raw,
      index,
    });
  }

  return dates;
};

// --- Amounts --------------------------------------------------------------

const REFUND_CUE = /refund|refunded|money back|reimburs/i;
const REFUND_TOTAL_CUE = /refund\s+total|total\s+refund|refund\s+of|refund\s+amount|amount\s+refunded|total\s+amount\s+refunded/i;
const SUBTOTAL_CUE = /subtotal|item\s+total|item\s+price|order\s+total(?!\s+refund)|goods\s+total/i;
const POSTAGE_CUE = /postage|shipping|delivery\s+charge|p&p|postage\s+and\s+packing/i;
const DEMAND_CUE = /amount\s+due|balance\s+due|total\s+due|please\s+pay|payment\s+due|amount\s+payable|unpaid\s+balance|amount\s+to\s+pay/i;
const RECURRING_CUE = /per\s+month|\/month|monthly|renew|subscription|recurring/i;

const frequencyFor = (grounded: GroundedAmount): AmountFrequency =>
  grounded.perPeriod ?? "one_off";

// The label window for an amount is the text immediately before it, but never
// reaching back past the previous amount - so a label like "Postage" attached to
// an earlier amount cannot leak onto a later "Refund total".
const roleForAmount = (
  labelWindow: string,
  grounded: GroundedAmount,
  automatic: boolean,
): MoneyRole => {
  const window = labelWindow.toLowerCase();

  if (REFUND_TOTAL_CUE.test(window)) {
    return "refund_total";
  }

  if (POSTAGE_CUE.test(window)) {
    return "postage";
  }

  if (SUBTOTAL_CUE.test(window)) {
    return "order_subtotal";
  }

  if (REFUND_CUE.test(window)) {
    return "refund_total";
  }

  if (DEMAND_CUE.test(window)) {
    return automatic ? "amount_collected_automatically" : "amount_demanded";
  }

  if (grounded.perPeriod || RECURRING_CUE.test(window)) {
    return "recurring_charge";
  }

  return "unknown";
};

export const extractAmounts = (
  text: string,
  automatic: boolean = detectAutomaticCollection(text).isAutomatic,
): ExtractedAmount[] => {
  const grounded = extractGroundedAmounts(text);
  const amounts: ExtractedAmount[] = [];
  let previousEnd = 0;

  for (const entry of grounded) {
    const windowStart = Math.max(previousEnd, entry.index - 34);
    const labelWindow = text.slice(windowStart, entry.index + entry.raw.length + 6);
    amounts.push({
      role: roleForAmount(labelWindow, entry, automatic),
      amount: entry.amount,
      sourceQuote: entry.raw,
      frequency: frequencyFor(entry),
      index: entry.index,
    });
    previousEnd = entry.index + entry.raw.length;
  }

  return amounts;
};

// The refund figure that should be treated as recoverable: a refund-total-cued
// amount if present, otherwise - only when there is a single grounded amount in
// the whole text - that single amount. Postage and subtotals never win.
export const selectRefundTotal = (text: string): ExtractedAmount | undefined => {
  const refundTotals = extractAmounts(text).filter((entry) => entry.role === "refund_total");

  if (refundTotals.length === 1) {
    return refundTotals[0];
  }

  if (refundTotals.length > 1) {
    const explicit = refundTotals.find((entry) =>
      REFUND_TOTAL_CUE.test(text.slice(Math.max(0, entry.index - 34), entry.index)),
    );
    return explicit ?? refundTotals[refundTotals.length - 1];
  }

  const grounded = extractGroundedAmounts(text);
  if (grounded.length === 1) {
    return {
      role: "refund_total",
      amount: grounded[0].amount,
      sourceQuote: grounded[0].raw,
      frequency: frequencyFor(grounded[0]),
      index: grounded[0].index,
    };
  }

  return undefined;
};

// --- Document status ------------------------------------------------------

const DELIVERY_CONTEXT = /parcel|delivery|delivered|courier|package|order/i;
const DELIVERY_DONE = /\b(?:delivered|left\s+in\s+a\s+safe\s+place|left\s+with\s+(?:your\s+)?neighbour|left\s+in\s+your\s+(?:porch|safe\s+place)|handed\s+to)\b/i;
const DELIVERY_PROBLEM = /not\s+(?:arrived|delivered|received)|missing|failed\s+delivery|could\s+not\s+deliver|delivery\s+failed/i;
const RECEIPT_DONE = /payment\s+received|thank\s+you\s+for\s+your\s+payment|paid\s+in\s+full|\breceipt\b|order\s+confirmation|proof\s+of\s+purchase/i;
const OUTSTANDING = /unpaid|amount\s+due|balance\s+due|please\s+pay|overdue|payment\s+required/i;
const SECURITY = /sign[-\s]?in|log[-\s]?in\b|login|security\s+alert|unusual\s+activity|new\s+sign\s*in|verify\s+it\s+was\s+you|password\s+(?:was|reset|change)/i;
const APPOINTMENT = /appointment|dental|dentist|\bgp\b|optician|clinic|hygienist|check[-\s]?up/i;
const APPOINTMENT_CHANGED = /cancel(?:led|ed)?|rebook|reschedul/i;

export const detectDocumentStatus = (
  text: string,
  automatic: boolean = detectAutomaticCollection(text).isAutomatic,
): DocumentStatus => {
  if (automatic) {
    return "automatic_no_action";
  }

  if (DELIVERY_CONTEXT.test(text) && DELIVERY_DONE.test(text) && !DELIVERY_PROBLEM.test(text)) {
    return "completed_no_action";
  }

  if (RECEIPT_DONE.test(text) && !OUTSTANDING.test(text)) {
    return "completed_no_action";
  }

  if (APPOINTMENT.test(text) && APPOINTMENT_CHANGED.test(text)) {
    return "cancelled";
  }

  if (APPOINTMENT.test(text)) {
    return "upcoming_reminder";
  }

  if (SECURITY.test(text) && !OUTSTANDING.test(text) && !REFUND_CUE.test(text)) {
    return "informational";
  }

  return "pending_manual_action";
};

// --- First-class read predicates -----------------------------------------

export const isSecurityAlertText = (text: string): boolean =>
  SECURITY.test(text) && !OUTSTANDING.test(text) && !REFUND_CUE.test(text) && !DELIVERY_CONTEXT.test(text);

const BILL_READY = /bill\s+is\s+ready|your\s+(?:latest\s+)?bill\s+is\s+ready|new\s+bill|statement\s+is\s+ready|bill\s+ready\s+to\s+view|your\s+bill\s+for/i;
const PRICE_INCREASE = /price\s+(?:rise|increase)|going\s+up|tariff\s+increase|bill\s+increase|rate\s+change|will\s+increase/i;

export const isBillReadyDirectDebitText = (text: string): boolean => {
  const automatic = detectAutomaticCollection(text).isAutomatic;
  const hasBillContext = BILL_READY.test(text) || /\bbill\b/i.test(text);
  return automatic && hasBillContext && !PRICE_INCREASE.test(text);
};

export const isDeliveryCompletedText = (text: string): boolean =>
  DELIVERY_CONTEXT.test(text) && DELIVERY_DONE.test(text) && !DELIVERY_PROBLEM.test(text);

const APPOINTMENT_REMINDER_CUE =
  /appointment\s+reminder|reminder\s+(?:that|of|for)|your\s+appointment\s+(?:is|will\s+be)|appointment\s+(?:is|has\s+been)\s+(?:booked|scheduled)|(?:booked|scheduled)\s+for|please\s+attend|due\s+to\s+attend|see\s+you\s+(?:on|at)/i;

export const isAppointmentReminderText = (text: string): boolean =>
  APPOINTMENT.test(text) &&
  APPOINTMENT_REMINDER_CUE.test(text) &&
  !APPOINTMENT_CHANGED.test(text);

const REFUND_CONFIRMED =
  /refund\s+(?:has\s+been\s+)?approved|refund\s+approved|refund\s+issued|refund\s+processed|refund\s+will\s+be\s+returned|returned\s+to\s+your\s+original\s+payment\s+method|your\s+refund\s+of/i;

export const isRefundConfirmationText = (text: string): boolean =>
  REFUND_CONFIRMED.test(text);

// Single entry point returning the whole extraction.
export const extractGeneralAdmin = (text: string): GeneralAdminExtraction => {
  const negationSpans = findNegationSpans(text);
  const { isAutomatic, quote } = detectAutomaticCollection(text);

  return {
    dates: extractDates(text, negationSpans, isAutomatic),
    amounts: extractAmounts(text, isAutomatic),
    status: detectDocumentStatus(text, isAutomatic),
    negationSpans,
    automaticCollection: isAutomatic,
    automaticCollectionQuote: quote,
  };
};
