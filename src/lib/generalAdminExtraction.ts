// Source-grounded general-admin extraction layer.
//
// Pure. Given the submitted text it returns typed dates (with a role and the
// verbatim source quote), typed amounts (with a money role and quote), the
// document status, negation spans, and automatic-vs-manual payment signals.
// Nothing here invents a fact: every date and amount keeps the exact substring
// it came from, so a downstream layer can prove it against the source.

import { extractGroundedAmounts, type GroundedAmount } from "./currencyGrounding";
import { extractReferenceNumber } from "./moneyParsers";
import {
  hasSensitiveInformationRequest,
  SENSITIVE_INFORMATION_WARNING,
} from "./sensitiveInformationRequest";
import type { SourceProvenance } from "./sourceProvenance";

export type DateRole =
  | "document_date"
  | "stated_deadline"
  | "event_date"
  | "context_date"
  | "period_boundary"
  | "suggested_followup"
  | "unknown";

export type DateMeaning =
  | "reply_deadline"
  | "payment_due"
  | "appointment"
  | "effective_start"
  | "statement_as_of"
  | "document_issued"
  | "period"
  | "other";

export type DateRelationship = "previous" | "replacement" | "start" | "end";
export type DatePrecision = "day_month" | "full_date";

export type ExtractedTime = {
  value: string;
  sourceQuote: string;
  index: number;
};

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
  | "balance_under_review"
  | "former_balance"
  | "amount_received"
  | "future_amount"
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
  meaning: DateMeaning;
  relationship?: DateRelationship;
  precision: DatePrecision;
  components?: { day: number; month: number; year?: number };
  value: string; // verbatim - never reformatted, so it is always source-supported
  sourceQuote: string;
  index: number;
  time?: ExtractedTime;
  provenance?: SourceProvenance;
};

export type ExtractedAmount = {
  role: MoneyRole;
  amount: number;
  sourceQuote: string;
  frequency: AmountFrequency;
  index: number;
};

export type RelativePeriodRole =
  | "refund_window"
  | "response_period"
  | "follow_up_period"
  | "unknown";

export type ExtractedRelativePeriod = {
  role: RelativePeriodRole;
  value: string;
  sourceQuote: string;
  index: number;
};

export type ExtractedReference = {
  value: string;
  sourceQuote: string;
  index: number;
};

export type NegationSpan = { start: number; end: number; phrase: string };

export type CommunicationSignalKind =
  | "importance"
  | "urgency"
  | "reply_request"
  | "action_request";

export type CommunicationSignal = {
  kind: CommunicationSignalKind;
  value: string;
  sourceQuote: string;
  start: number;
  end: number;
  negated: false;
};

export type CommunicationNegation = {
  target: "reply_request" | "action_request";
  sourceQuote: string;
  start: number;
  end: number;
  scopeEnd: number;
};

export type CommunicationAssessment = {
  signals: CommunicationSignal[];
  negations: CommunicationNegation[];
};

export type GeneralAdminExtraction = {
  dates: ExtractedDate[];
  amounts: ExtractedAmount[];
  relativePeriods: ExtractedRelativePeriod[];
  references: ExtractedReference[];
  status: DocumentStatus;
  negationSpans: NegationSpan[];
  automaticCollection: boolean;
  automaticCollectionQuote?: string;
  fallback?: StructuredGeneralAdminFallback;
};

export type GeneralAdminFallbackTopic =
  | "price_or_account_change"
  | "document_request"
  | "payment_or_balance"
  | "provider_update"
  | "date_or_deadline"
  | "decision_or_review"
  | "information_confirmation";

export type GeneralAdminFallbackStatus =
  | "new"
  | "ready_to_act"
  | "waiting"
  | "resolved"
  | "no_action_needed";

export type GeneralAdminNextStepKind =
  | "act_on_request"
  | "check_deadline"
  | "check_amount"
  | "wait_then_chase"
  | "keep_confirmation"
  | "verify_outcome";

export type StructuredGeneralAdminFallback = {
  topic: GeneralAdminFallbackTopic;
  sourceStatement: string;
  dates: ExtractedDate[];
  relativePeriods: ExtractedRelativePeriod[];
  amounts: ExtractedAmount[];
  references: ExtractedReference[];
  requestedAction?: string;
  requestedDocument?: string;
  consequence?: string;
  dependency?: string;
  /**
   * Set when the source states two things that cannot both be true (for example
   * a balance described as cancelled in one place and payable in another). This
   * is a first-class signal, not a consequence: AdminAvenger reports the
   * conflict and never picks a side.
   */
  inconsistency?: string;
  /** Source-grounded records worth having to hand before the next step. */
  evidenceToGather?: string[];
  /** True when the source asks for a code, password, PIN, or card/bank detail. */
  sensitiveInformationRequested?: boolean;
  attribution: "message" | "provider" | "authority" | "letter";
  status: GeneralAdminFallbackStatus;
  nextStepKind: GeneralAdminNextStepKind;
  nextAction: string;
  uncertaintyNote: string;
};

export type AccountOutcomeAssessment = {
  isAccountOutcome: boolean;
  accountClosed: boolean;
  closurePending: boolean;
  accountRemainsActive: boolean;
  chargesContinue: boolean;
  chargeRemoved: boolean;
  noPaymentRequired: boolean;
  paymentNotRequiredToday: boolean;
  noFurtherBills: boolean;
  noFurtherDirectDebits: boolean;
  keepConfirmation: boolean;
  conditionalDirectDebitFollowUp: boolean;
  conditionalFollowUp: boolean;
  finalDirectDebitPending: boolean;
  balanceStillPayable: boolean;
  waiverUnderReview: boolean;
  noDecisionYet: boolean;
  providerReviewPending: boolean;
  providerWillWriteAgain: boolean;
  futurePaymentPossible: boolean;
  collectionActivityPossible: boolean;
  chargeRemovalDenied: boolean;
  amountStillOwed: boolean;
  paymentRequired: boolean;
  responseRequired: boolean;
  unresolvedFinancialOutcome: boolean;
  requiredDocument?: string;
  actionDeadline?: string;
  followUpPeriod?: string;
  amount?: {
    amount: number;
    sourceQuote: string;
    context:
      | "former_balance"
      | "removed_charge"
      | "outstanding_amount"
      | "final_direct_debit"
      | "unknown";
  };
  reference?: string;
};

type AccountOutcomeAmountContext =
  NonNullable<AccountOutcomeAssessment["amount"]>["context"];

// --- Negation -------------------------------------------------------------

const COMMUNICATION_NEGATION_PATTERNS: ReadonlyArray<{
  target: CommunicationNegation["target"];
  pattern: RegExp;
}> = [
  {
    target: "reply_request",
    pattern:
      /\b(?:(?:please|you)\s+)?do(?:\s+not|n['’]t)\s+(?:need\s+to\s+)?(?:reply|respond)\b/gi,
  },
  {
    target: "reply_request",
    pattern: /\bno[-\s]?reply\b(?:\s+(?:is\s+)?(?:needed|required))?/gi,
  },
  {
    target: "reply_request",
    pattern: /\bno\s+response\s+(?:is\s+)?(?:needed|required)\b/gi,
  },
  {
    target: "action_request",
    pattern: /\bno\s+action\s+(?:is\s+)?(?:required|needed)\b/gi,
  },
  {
    target: "action_request",
    pattern: /\bno\s+further\s+action\b/gi,
  },
  {
    target: "action_request",
    pattern: /\byou\s+do(?:\s+not|n['’]t)\s+need\s+to\s+do\s+anything\b/gi,
  },
  {
    target: "action_request",
    pattern: /\byou\s+do(?:\s+not|n['’]t)\s+need\s+to\s+take\s+any\s+action\b/gi,
  },
];

const OTHER_NEGATION_PATTERNS: RegExp[] = [
  /you\s+do(?:\s+not|n['’]t)\s+need\s+to\s+pay/gi,
  /no\s+(?:manual\s+)?payment\s+(?:is\s+)?(?:required|needed)/gi,
  /nothing\s+(?:more\s+)?to\s+pay/gi,
];

const findNegationScopeEnd = (text: string, afterPhrase: number): number => {
  const remaining = text.slice(afterPhrase);
  const boundary = remaining.search(/[.!?;\n]|(?:,\s*)?\b(?:but|however|although|yet)\b/i);

  return boundary === -1
    ? Math.min(text.length, afterPhrase + 100)
    : afterPhrase + boundary;
};

export const findCommunicationNegations = (text: string): CommunicationNegation[] => {
  const negations: CommunicationNegation[] = [];

  for (const { target, pattern } of COMMUNICATION_NEGATION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      negations.push({
        target,
        sourceQuote: match[0],
        start,
        end,
        scopeEnd: findNegationScopeEnd(text, end),
      });
    }
  }

  return negations.sort((first, second) => first.start - second.start);
};

const isCommunicationIndexNegated = (
  index: number,
  target: CommunicationNegation["target"],
  negations: readonly CommunicationNegation[],
): boolean =>
  negations.some(
    (negation) =>
      negation.target === target && index >= negation.start && index <= negation.scopeEnd,
  );

const COMMUNICATION_SIGNAL_PATTERNS: ReadonlyArray<{
  kind: CommunicationSignalKind;
  target?: CommunicationNegation["target"];
  pattern: RegExp;
}> = [
  { kind: "importance", pattern: /\bimportant(?:\s+notice)?\b/gi },
  { kind: "urgency", pattern: /\b(?:urgent|final\s+notice)\b/gi },
  {
    kind: "reply_request",
    target: "reply_request",
    pattern: /\bresponse\s+(?:is\s+)?(?:required|needed)\b/gi,
  },
  {
    kind: "reply_request",
    target: "reply_request",
    pattern: /\bawaiting\s+(?:your\s+)?response\b/gi,
  },
  {
    kind: "reply_request",
    target: "reply_request",
    pattern: /\b(?:reply|respond)\b/gi,
  },
  {
    kind: "action_request",
    target: "action_request",
    pattern: /\baction\s+(?:is\s+)?required\b/gi,
  },
  {
    kind: "action_request",
    target: "action_request",
    pattern: /\bplease\s+(?:confirm|upload|pay)\b/gi,
  },
];

export const assessCommunicationSignals = (text: string): CommunicationAssessment => {
  const negations = findCommunicationNegations(text);
  const signals: CommunicationSignal[] = [];

  for (const { kind, target, pattern } of COMMUNICATION_SIGNAL_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (target && isCommunicationIndexNegated(start, target, negations)) continue;

      const value = match[0];
      signals.push({
        kind,
        value,
        sourceQuote: value,
        start,
        end: start + value.length,
        negated: false,
      });
    }
  }

  return {
    signals: signals.sort((first, second) => first.start - second.start),
    negations,
  };
};

export const findNegationSpans = (text: string): NegationSpan[] => {
  const spans: NegationSpan[] = findCommunicationNegations(text).map((negation) => ({
    start: negation.start,
    end: negation.scopeEnd,
    phrase: negation.sourceQuote,
  }));

  for (const pattern of OTHER_NEGATION_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const afterPhrase = start + match[0].length;
      const end = findNegationScopeEnd(text, afterPhrase);
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
const DATE_SOURCE = String.raw`\d{1,2}\s+${MONTH}\s+\d{4}|${MONTH}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+${MONTH}|${MONTH}\s+\d{1,2}`;
const datePattern = new RegExp(`(?:${DATE_SOURCE})`, "gi");
const rangeConnector = /\b(?:to|until|through|and)\b|[-–—]/i;

const DEADLINE_CUE =
  /(?:pay|paid|respond|reply|return|renew|cancel|contact us|reply|responses?)\s+(?:by|before|on or before)\s*$|due\s+by\s*$|deadline[^.]*$|by\s+$|\bbefore\s+$/i;
const EVENT_CUE =
  /(?:appointment|scheduled|booking|collected on|collection date|collect(?:ed|ion)?[^.]*on|effective\s+(?:from|on|date)|takes\s+effect|starts?\s+on|due\s+to\s+arrive|arriv[a-z]*[^.]*(?:on|by)?|from|on)\s*$/i;
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

const semanticForDate = (
  text: string,
  index: number,
  raw: string,
  negationSpans: NegationSpan[],
  automatic: boolean,
): Pick<ExtractedDate, "role" | "meaning" | "relationship"> => {
  const before = text.slice(Math.max(0, index - 80), index).toLowerCase();
  const clauseStart = Math.max(0, text.lastIndexOf(".", index) + 1, text.lastIndexOf("\n", index) + 1);
  const clauseEndMatch = text.slice(index).search(/[.!?\n]/);
  const clauseEnd = clauseEndMatch === -1 ? text.length : index + clauseEndMatch;
  const clause = text.slice(clauseStart, clauseEnd).toLowerCase();
  if (/\bappointment\b[^.\n]*\bmoved\s+from\b/.test(clause)) {
    const relationship = /\bto\s*$/.test(before) ? "replacement" : "previous";
    return { role: "event_date", meaning: "appointment", relationship };
  }
  if (/\bcontract\b[^.\n]*\bruns?\s+from\b/.test(clause) || looksLikePeriodBoundary(text, index, raw)) {
    const relationship = /\b(?:to|until|through)\s*$/.test(before) ? "end" : "start";
    return { role: "period_boundary", meaning: "period", relationship };
  }
  if (/\b(?:statement|letter|notice|invoice)\s+(?:date|dated|issued)\s*:?\s*$/.test(before) || DOCUMENT_CUE.test(before)) {
    return { role: "document_date", meaning: "document_issued" };
  }
  if (/\b(?:balance|amount|total)\b[^.\n]{0,40}\bas\s+of\s*$/.test(before)) {
    return { role: "context_date", meaning: "statement_as_of" };
  }
  if (/\b(?:pay|payment)\b[^.\n]{0,45}\b(?:due\s+(?:on|by)|by)\s*$/.test(before)) {
    return { role: "stated_deadline", meaning: "payment_due" };
  }
  if (/\b(?:reply|respond|response)\b[^.\n]{0,35}\b(?:by|before|on or before)\s*$/.test(before) && !isIndexNegated(index, negationSpans)) {
    return { role: "stated_deadline", meaning: "reply_deadline" };
  }
  if (/\bappointment\b/.test(clause)) {
    return { role: "event_date", meaning: "appointment" };
  }
  if (/\b(?:tariff|price|change|broadband|contract)\b/.test(clause) && /\b(?:from|on|starts?\s+on|takes?\s+effect\s+from)\s*$/.test(before)) {
    return { role: "event_date", meaning: "effective_start" };
  }
  if (/\b(?:due\s+to\s+arrive|arriv\w*[^.\n]*(?:on|by))\s*$/.test(before)) {
    return { role: "event_date", meaning: "other" };
  }
  if (EVENT_CUE.test(before)) return { role: "event_date", meaning: "other" };
  if (DEADLINE_CUE.test(before) && !isIndexNegated(index, negationSpans) && !automatic) {
    return { role: "stated_deadline", meaning: "other" };
  }
  return { role: "unknown", meaning: "other" };
};

const monthNumber = (value: string): number | undefined => {
  const names = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const index = names.findIndex((name) => value.toLowerCase().startsWith(name));
  return index === -1 ? undefined : index + 1;
};

const dateDetails = (raw: string): Pick<ExtractedDate, "precision" | "components"> => {
  const dayMonth = raw.match(/^(\d{1,2})\s+([a-z]+)/i);
  const monthDay = raw.match(/^([a-z]+)\s+(\d{1,2})/i);
  const year = raw.match(/\b(\d{4})\b/)?.[1];
  const day = Number(dayMonth?.[1] ?? monthDay?.[2]);
  const month = monthNumber(dayMonth?.[2] ?? monthDay?.[1] ?? "");
  return {
    precision: year || /^\d{4}-|\/\d{2,4}$/.test(raw) ? "full_date" : "day_month",
    ...(day && month ? { components: { day, month, ...(year ? { year: Number(year) } : {}) } } : {}),
  };
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
    const semantic = semanticForDate(text, index, raw, negationSpans, automatic);
    const trailing = text.slice(index + raw.length);
    const timeMatch = semantic.meaning === "appointment" ? trailing.match(/^\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)\b)/i) : undefined;
    dates.push({
      ...semantic,
      ...dateDetails(raw),
      value: raw,
      sourceQuote: raw,
      index,
      ...(timeMatch ? { time: { value: timeMatch[1], sourceQuote: timeMatch[1], index: index + raw.length + (timeMatch.index ?? 0) + timeMatch[0].indexOf(timeMatch[1]) } } : {}),
    });
  }

  return dates;
};

// --- Amounts --------------------------------------------------------------

const REFUND_CUE = /refund|refunded|money back|reimburs/i;
const REFUND_TOTAL_CUE = /refund\s+total|total\s+refund|refund\s+of|refund\s+amount|amount\s+refunded|total\s+amount\s+refunded/i;
const SUBTOTAL_CUE = /subtotal|item\s+total|item\s+price|order\s+total(?!\s+refund)|goods\s+total/i;
const POSTAGE_CUE = /postage|shipping|delivery\s+charge|p&p|postage\s+and\s+packing/i;
const DEMAND_CUE = /amount\s+due|balance\s+due|total\s+due|please\s+pay|payment\s+due|amount\s+payable|unpaid\s+balance|amount\s+to\s+pay|\bpay\s+(?:GBP\s*|\u00a3\s*|\?\s*)?\d/i;
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

  if (/former\s+balance|was\s+cancelled|was\s+removed/.test(window)) {
    return "former_balance";
  }

  if (/under\s+review|disput(?:e|ed)|not\s+(?:yet\s+)?confirmed|no\s+decision/.test(window)) {
    return "balance_under_review";
  }

  if (/payment\s+(?:is\s+)?recorded|payment\s+received|received\s+your\s+(?:[\u00a3\d.,]+\s+)?payment|reached\s+your\s+account/.test(window)) {
    return "amount_received";
  }

  if (/(?:may|could|might)\s+become\s+payable/.test(window)) {
    return "future_amount";
  }

  if (automatic && /direct\s+debit|collect(?:ed|ion)/.test(window)) {
    return "amount_collected_automatically";
  }

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

  if (DEMAND_CUE.test(window) || /remains?\s+(?:payable|due)|(?:is|are)\s+paid\s+by|\b(?:debt|arrears)\b/.test(window)) {
    return automatic ? "amount_collected_automatically" : "amount_demanded";
  }

  if (grounded.perPeriod || RECURRING_CUE.test(window) || /each\s+(?:month|week|year)|instalments?/.test(window)) {
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
    const sentenceStart = Math.max(text.lastIndexOf(".", entry.index - 1) + 1, text.lastIndexOf("\n", entry.index - 1) + 1);
    const nextPeriod = text.indexOf(".", entry.index + entry.raw.length);
    const nextNewline = text.indexOf("\n", entry.index + entry.raw.length);
    const sentenceEndCandidates = [nextPeriod, nextNewline].filter((value) => value >= 0);
    const sentenceEnd = sentenceEndCandidates.length > 0 ? Math.min(...sentenceEndCandidates) : text.length;
    const windowStart = Math.max(previousEnd, sentenceStart, entry.index - 80);
    const labelWindow = text.slice(windowStart, Math.min(sentenceEnd, entry.index + entry.raw.length + 80));
    const sentenceWindow = text.slice(sentenceStart, sentenceEnd);
    const priceChange = sentenceWindow.match(/(?:rise|increase|change)[^.\n]*from\s+(?:GBP\s*|\u00a3\s*)?\d+(?:\.\d+)?\s+to\s+(?:GBP\s*|\u00a3\s*)?\d+(?:\.\d+)?/i);
    const priceAmounts = priceChange ? extractGroundedAmounts(priceChange[0]) : [];
    const priceRole = priceAmounts.length >= 2
      ? entry.amount === priceAmounts[0].amount
        ? "price_old"
        : entry.amount === priceAmounts[1].amount
          ? "price_new"
          : undefined
      : undefined;
    const baseRole = priceRole ?? roleForAmount(labelWindow, entry, automatic);
    const followingContext = text.slice(sentenceStart, Math.min(text.length, sentenceEnd + 100));
    const contextualRole = baseRole === "unknown"
      ? /\b(?:under\s+review|no\s+decision|not\s+yet\s+confirmed)\b/i.test(followingContext)
        ? "balance_under_review"
        : /\bbalance\s+remains?\s+(?:due|payable)\b/i.test(followingContext)
          ? "amount_demanded"
          : baseRole
      : baseRole;
    amounts.push({
      role: contextualRole,
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
  /appointment\s+reminder|reminder\s+(?:that|of|for)|your\s+appointment\s+(?:is|will\s+be)|appointment\s+(?:is|has\s+been)\s+(?:booked|scheduled)|\bappointment\s+on\b|(?:booked|scheduled)\s+for|please\s+attend|due\s+to\s+attend|see\s+you\s+(?:on|at)/i;

export const isAppointmentReminderText = (text: string): boolean =>
  APPOINTMENT.test(text) &&
  APPOINTMENT_REMINDER_CUE.test(text) &&
  !APPOINTMENT_CHANGED.test(text);

const REFUND_CONFIRMED =
  /refund\s+(?:has\s+been\s+)?approved|refund\s+approved|refund\s+issued|refund\s+processed|refund\s+will\s+be\s+returned|returned\s+to\s+your\s+original\s+payment\s+method|your\s+refund\s+of/i;

export const isRefundConfirmationText = (text: string): boolean =>
  REFUND_CONFIRMED.test(text);

const NUMBER_WORD = String.raw`(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)`;
const RELATIVE_PERIOD_PATTERN = new RegExp(
  String.raw`\b(?:within\s+)?(?:\d+|${NUMBER_WORD})(?:\s*(?:to|-)\s*(?:\d+|${NUMBER_WORD}))?\s+(?:working\s+|calendar\s+)?(?:days?|weeks?|months?)\b`,
  "gi",
);

export const extractRelativePeriods = (text: string): ExtractedRelativePeriod[] =>
  [...text.matchAll(RELATIVE_PERIOD_PATTERN)].map((match) => {
    const index = match.index ?? 0;
    const context = text.slice(Math.max(0, index - 70), Math.min(text.length, index + match[0].length + 70));
    const role: RelativePeriodRole = /\brefund|original payment method\b/i.test(context)
      ? "refund_window"
      : /\bfollow up|heard from|contact us again\b/i.test(context)
        ? "follow_up_period"
        : /\brespond|response|update|decision\b/i.test(context)
          ? "response_period"
          : "unknown";
    return { role, value: match[0], sourceQuote: match[0], index };
  });

export const extractReferences = (text: string): ExtractedReference[] => {
  const values = new Map<string, ExtractedReference>();
  const canonicalValue = extractReferenceNumber(text);
  if (canonicalValue) {
    const index = text.toLowerCase().indexOf(canonicalValue.toLowerCase());
    values.set(canonicalValue.toLowerCase(), {
      value: canonicalValue,
      sourceQuote: canonicalValue,
      index: Math.max(0, index),
    });
  }

  for (const match of text.matchAll(/\b(?:reference|ref|under)\b\s*(?::|#|-)?\s*([A-Z][A-Z0-9.-]*\d[A-Z0-9.-]*)\b/g)) {
    const value = match[1].replace(/[.]+$/g, "");
    values.set(value.toLowerCase(), {
      value,
      sourceQuote: value,
      index: (match.index ?? 0) + match[0].indexOf(match[1]),
    });
  }

  for (const match of text.matchAll(/\b(?=[A-Z0-9/-]{4,}\b)(?=[A-Z0-9/-]*[A-Z])(?=[A-Z0-9/-]*\d)[A-Z0-9]+(?:[-/][A-Z0-9]+)+\b/g)) {
    const value = match[0];
    values.set(value.toLowerCase(), {
      value,
      sourceQuote: value,
      index: match.index ?? 0,
    });
  }

  return [...values.values()].sort((first, second) => first.index - second.index);
};

export type RefundStage =
  | "requested"
  | "promised"
  | "approved"
  | "issued"
  | "received"
  | "refused"
  | "possible"
  | "unknown";

export type RefundStateAssessment = {
  isRefund: boolean;
  stage: RefundStage;
  /**
   * True only when the source states, as something that has already happened,
   * that the refund has failed or its window has gone. Conditional provider
   * wording such as "if it has not arrived by then, contact us" is not a present
   * failure, so it does not set this.
   */
  failureAsserted: boolean;
  amount?: ExtractedAmount;
  relativePeriod?: ExtractedRelativePeriod;
  reference?: ExtractedReference;
};

// Stay inside one sentence, but do not mistake a decimal point for the end of
// one. The old gap matcher was `[^.\n]*`, so "£39 has been approved" matched and
// "£68.40 has been approved" did not: the refund stage depended on whether the
// amount had pence. A sentence-ending period is followed by whitespace or the end
// of the text; a decimal point is followed by a digit.
const SAME_SENTENCE = String.raw`(?:[^.\n]|\.(?=\d)){0,160}`;

const sameSentence = (...parts: readonly string[]) =>
  new RegExp(parts.join(SAME_SENTENCE), "i");

// The gap matcher also happily crossed a negation, so "Your refund has not been
// approved." reported `approved`. Each affirmative rung is therefore guarded: up
// to three words may sit between the negator and the state word, which covers
// "has not been approved" and "has not yet been approved" without reaching into
// the next clause.
const negated = (state: string) =>
  new RegExp(String.raw`\b(?:not|never|no longer)\b(?:\s+\w+){0,3}\s+\b${state}\b`, "i");

// `not`, `never` and `no longer` are adverbs sitting before the verb, which is
// what the rule above catches. A refusal can also be written with `no` as a
// determiner governing the noun: "No refund has been approved", "no refund will
// be issued", "There will be no refund issued". That reported an approval, which
// rendered as "Refund approved" and told the person to keep an approval that did
// not exist.
//
// The guard is scoped to one sentence and only permits known refund modifiers or
// a source-shaped money token between the determiner and `refund`. That keeps the
// noun binding intact for "No GBP 68.40 refund" without turning this into a free
// text gap, so an unrelated "No delay occurred." cannot suppress a genuine
// approval in a neighbouring sentence.
const NO_REFUND_GAP_TOKEN = String.raw`(?:further|additional|partial|full|(?:(?:GBP|\u00a3)\s*)?\d+(?:,\d{3})*(?:\.\d{1,2})?|GBP|\u00a3)`;
const NO_REFUND_DETERMINER = new RegExp(
  String.raw`\bno(?:\s+${NO_REFUND_GAP_TOKEN}){0,3}\s+refund\b`,
  "i",
);

const sentencesOf = (text: string): string[] => text.split(/(?<=[.;!?])\s+|\n+/);

const refundDeniedByDeterminer = (text: string, state: RegExp): boolean =>
  sentencesOf(text).some(
    (sentence) => NO_REFUND_DETERMINER.test(sentence) && state.test(sentence),
  );

// Receipt can be stated without the literal words "received" or "reached".
// These patterns only cover affirmative, already-completed wording. Future or
// pending forms such as "will be returned", "has been sent", "processing" and
// "on its way" deliberately do not match.
const REFUND_COMPLETION_PATTERNS = [
  /\brefund\s+(?:has|have|had)\s+(?:now\s+)?arrived\b/i,
  /\brefund\s+(?:now\s+)?arrived\b/i,
  /\brefund\s+(?:(?:is|was|has\s+been)\s+)?(?:now\s+)?(?:successful|complete)\b/i,
  /\brefund\s+(?:(?:has\s+been|was|is\s+now)\s+)?(?:paid|credited|deposited)\b/i,
  /\b(?:we(?:'ve|\s+have)?|the\s+(?:provider|retailer|company))\s+paid\b[^.\n]{0,100}\brefund\b/i,
  /\bwe(?:'ve|\s+have)?\s+sent\b[^.\n]{0,80}\brefund\b[^.\n]{0,80}\bto\s+(?:your|the)\s+(?:bank\s+)?account\b/i,
  /\brefund\b[^.\n]{0,100}\b(?:has\s+been|was)\s+returned\s+to\s+(?:your|the)\s+original\s+payment\s+method\b/i,
  /\brefund\s+(?:(?:is|was|has\s+been)\s+)?(?:now\s+)?back\s+in\s+(?:your|the)\s+(?:bank\s+)?account\b/i,
  /\b(?:the\s+)?money\s+(?:(?:has\s+been|was|is\s+now)\s+)?returned(?:\s+successfully)?\b/i,
  /\b(?:the\s+)?(?:amount|\d+(?:,\d{3})*(?:\.\d{1,2})?)\s+(?:has\s+been|was)\s+refunded(?:\s+to\s+(?:your|the)\s+card)?\b/i,
  /\brefund\b[^.\n]{0,120}\bmoney\s+(?:is|was)\s+now\s+in\s+(?:your|the)\s+(?:bank\s+)?account\b/i,
  /\brefund\s+(?:is\s+)?(?:now\s+)?showing\s+in\s+(?:your|the)\s+(?:bank\s+)?account\b/i,
] as const;

const hasCompletedRefundWording = (text: string): boolean =>
  sentencesOf(text).some(
    (sentence) =>
      !NO_REFUND_DETERMINER.test(sentence) &&
      REFUND_COMPLETION_PATTERNS.some((pattern) => pattern.test(sentence)),
  );

const REFUSAL_WORDS = String.raw`(?:refused|declined|rejected|turned\s+down)`;

/**
 * Conditional markers. A provider writing "If it has not arrived by then,
 * contact us" is describing what to do later, not reporting a failure now, and
 * treating that as present failure promoted a complaint draft over a refund the
 * provider had just approved.
 *
 * This is clause-level and deliberately shallow: a failure phrase is treated as
 * conditional when a conditional marker appears earlier in the same sentence. It
 * is not a sentence parser, and it errs towards "not yet failed", which is the
 * safer direction for escalation.
 */
const CONDITIONAL_MARKER =
  /\b(?:if|unless|should|in\s+case|provided\s+that|in\s+the\s+event)\b/i;

const FAILURE_ASSERTION =
  /\b(?:window|period|deadline)\s+(?:has|have)\s+(?:now\s+)?(?:passed|expired)\b|\b(?:has|have)\s+(?:now\s+)?passed\b|\b(?:not|never)\s+(?:yet\s+)?(?:been\s+)?(?:paid|received|arrived|refunded)\b|\b(?:refund|payment)\s+failed\b|\bfailed\s+to\s+(?:arrive|pay)\b|\boverdue\b|\bstill\s+waiting\b/gi;

const assertsPresentFailure = (text: string): boolean =>
  sentencesOf(text)
    .some((sentence) => {
      for (const match of sentence.matchAll(FAILURE_ASSERTION)) {
        if (!CONDITIONAL_MARKER.test(sentence.slice(0, match.index ?? 0))) {
          return true;
        }
      }

      return false;
    });

export const assessRefundState = (text: string): RefundStateAssessment => {
  // Explicit refusal is checked before the affirmative ladder so that a refused
  // or declined request can never be read as an earlier, more positive stage.
  const refused =
    sameSentence(String.raw`\brefund\b`, String.raw`\b${REFUSAL_WORDS}\b`).test(text) ||
    sameSentence(String.raw`\b${REFUSAL_WORDS}\b`, String.raw`\brefund\b`).test(text);

  const received =
    hasCompletedRefundWording(text) ||
    (!negated("received").test(text) &&
      !negated("reached").test(text) &&
      !refundDeniedByDeterminer(text, /\b(?:received|reached)\b/i) &&
      (sameSentence(String.raw`\brefund\b`, String.raw`\b(?:reached|received)\b`).test(text) ||
        sameSentence(
          String.raw`\bconfirm(?:ing|ed)?\b`,
          String.raw`\brefund\b`,
          String.raw`\breached\b`,
        ).test(text)));

  const issued =
    !negated("issued").test(text) &&
    !refundDeniedByDeterminer(text, /\bissued\b/i) &&
    sameSentence(String.raw`\brefund\b`, String.raw`\bissued\b`).test(text);

  const approved =
    !negated("approved").test(text) &&
    !refundDeniedByDeterminer(text, /\bapproved\b/i) &&
    (sameSentence(String.raw`\brefund\b`, String.raw`\bapproved\b`).test(text) ||
      sameSentence(String.raw`\bapproved\b`, String.raw`\brefund\b`).test(text));

  const promised =
    !refundDeniedByDeterminer(text, /\bwill\s+be\s+(?:returned|paid|sent)\b/i) &&
    (/\b(?:we|provider|retailer)\s+will\s+refund\b/i.test(text) ||
      sameSentence(
        String.raw`\brefund\b`,
        String.raw`\bwill\s+be\s+(?:returned|paid|sent)\b`,
      ).test(text));

  // Affirmative states are checked before refusal, because a message can carry
  // both: "Refund refused initially, but a refund of £249 has now been approved"
  // describes a decision that was reversed, and the current state is the
  // approval. Refusal is only the answer when nothing positive is asserted.
  //
  // This ordering is only safe because negation is now handled explicitly: the
  // `not/never/no longer` guard and the determiner-`no` guard both run inside the
  // affirmative checks, so a plain refusal cannot reach them.
  const stage: RefundStage = received
    ? "received"
    : issued
      ? "issued"
      : approved
        ? "approved"
        : promised
          ? "promised"
          : refused
            ? "refused"
            : /\b(?:may|might|could)\s+refund\b/i.test(text)
              ? "possible"
              : /\brefund request\b/i.test(text) ||
                  sameSentence(String.raw`\brequest(?:ed)?\b`, String.raw`\brefund\b`).test(text)
                ? "requested"
                : "unknown";
  const relativePeriods = extractRelativePeriods(text);
  return {
    isRefund: REFUND_CUE.test(text) || received,
    stage,
    failureAsserted: assertsPresentFailure(text),
    amount: selectRefundTotal(text),
    relativePeriod: relativePeriods.find((period) => period.role === "refund_window"),
    reference: extractReferences(text)[0],
  };
};

// --- Generic provider account outcomes ------------------------------------
//
// This is deliberately about explicit provider outcomes, not bereavement or
// Estate Administration. A message only qualifies when it confirms an account
// closure and/or a charge removal. Bereavement wording on its own can never
// activate this read.

const ACCOUNT_CLOSED_PATTERNS = [
  /\b(?:we|the\s+provider|the\s+company)\s+(?:have|has)\s+(?:now\s+)?closed\s+(?:your|the|this)\s+account\b/i,
  /\b(?:your|the|this)\s+account\s+(?:has\s+been|was|is)\s+(?:now\s+)?closed\b/i,
  /\baccount\s+closure\s+(?:has\s+been\s+)?(?:confirmed|completed)\b/i,
];

const ACCOUNT_CLOSURE_PENDING =
  /\b(?:once|when|after)\b[^.\n]{0,100}\b(?:receive|received|send|sent|provide|provided)\b[^.\n]{0,80}\b(?:close|closure)\b[^.\n]{0,35}\baccount\b|\bwill\s+be\s+able\s+to\s+close\s+(?:your|the|this)\s+account\b/i;
const ACCOUNT_REMAINS_ACTIVE =
  /\b(?:until\s+then[^.\n]{0,60})?(?:your|the|this)?\s*account\s+(?:still\s+)?remains?\s+active\b/i;
const CHARGES_CONTINUE =
  /\b(?:monthly|routine|regular)?\s*charges?\s+(?:will|may)\s+continue\b/i;

// Stay inside one sentence while allowing a decimal point inside a money
// amount such as £126.40.
const ACCOUNT_CLAUSE_SOURCE = String.raw`(?:[^.\n]|\.(?=\d))`;

const CHARGE_REMOVED_PATTERNS = [
  new RegExp(
    String.raw`\b(?:we|our\s+${ACCOUNT_CLAUSE_SOURCE}{0,30}?\s+team|the\s+provider|the\s+company)\s+(?:has|have)\s+agreed\s+to\s+(?:remove|waive|write\s+off|cancel)\b${ACCOUNT_CLAUSE_SOURCE}{0,80}\b(?:charge|balance|amount)\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(?:we|the\s+provider|the\s+company)\s+(?:have|has)\s+(?:removed|waived|written\s+off|cancelled)\b${ACCOUNT_CLAUSE_SOURCE}{0,60}\b(?:charge|balance|amount)\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(?:charge|balance|amount)\b${ACCOUNT_CLAUSE_SOURCE}{0,45}\b(?:has\s+been|was|is\s+now)\s+(?:removed|waived|written\s+off|cancelled)\b`,
    "i",
  ),
  new RegExp(
    String.raw`\b(?:removed|waived|written\s+off|cancelled)\b${ACCOUNT_CLAUSE_SOURCE}{0,55}\b(?:outstanding\s+|final\s+)?(?:charge|balance|amount)\b`,
    "i",
  ),
];

const NO_PAYMENT_REQUIRED =
  /\b(?:you\s+do(?:\s+not|n['’]t)\s+need\s+to\s+(?:make\s+(?:a\s+)?payment|pay)|no\s+(?:further\s+|manual\s+)?payment\s+(?:is\s+)?(?:required|needed)|nothing\s+(?:more\s+)?to\s+pay)\b/i;
const NO_FURTHER_BILLS =
  /\b(?:no\s+further\s+bills?(?:\s+or\s+direct\s+debits?)?\s+(?:will|should)\s+be\s+(?:issued|sent)|you\s+will\s+not\s+receive\s+(?:any\s+)?further\s+bills?)\b/i;
const NO_FURTHER_DIRECT_DEBITS =
  /\bno\s+further\s+(?:bills?\s+or\s+)?direct\s+debits?\s+(?:will|should)\s+be\s+(?:issued|collected|taken)\b|\bno\s+further\s+direct\s+debits?\b/i;
const KEEP_CONFIRMATION =
  /\b(?:please\s+)?keep\s+(?:this|the)\s+(?:email|message|letter|confirmation)\b[^.\n]{0,45}\b(?:records?|evidence|files?)\b/i;
const CONDITIONAL_DIRECT_DEBIT =
  /\bif\b[^.\n]{0,55}\bdirect\s+debit\b[^.\n]{0,55}\b(?:collected|taken)\b[^.\n]{0,80}\b(?:contact|tell|query|quote)\b/i;
const FINAL_DIRECT_DEBIT_PENDING = new RegExp(
  String.raw`\b(?:one|a|the)\s+final\s+direct\s+debit\b${ACCOUNT_CLAUSE_SOURCE}{0,80}\b(?:may|will|could|is\s+due\s+to)\b${ACCOUNT_CLAUSE_SOURCE}{0,35}\b(?:be\s+)?(?:collected|taken)\b`,
  "i",
);
const BALANCE_STILL_PAYABLE = new RegExp(
  String.raw`\b(?:balance|charge|amount)\b${ACCOUNT_CLAUSE_SOURCE}{0,55}\b(?:remains?|is|will\s+be)\s+(?:still\s+)?(?:payable|due|to\s+be\s+paid)\b|\bplease\s+(?:make\s+)?(?:a\s+)?payment\b|\bplease\s+pay\b`,
  "i",
);
const WAIVER_UNDER_REVIEW = new RegExp(
  String.raw`\b(?:request|decision|review)\b${ACCOUNT_CLAUSE_SOURCE}{0,90}\b(?:waiv(?:e|er)|remove|write\s+off|cancel|refund)\b${ACCOUNT_CLAUSE_SOURCE}{0,90}\b(?:still\s+)?(?:under\s+review|pending|not\s+yet\s+decided)\b|\b(?:waiv(?:e|er)|remove|write\s+off|cancel|refund)\b${ACCOUNT_CLAUSE_SOURCE}{0,90}\b(?:still\s+)?(?:under\s+review|pending|not\s+yet\s+decided)\b`,
  "i",
);
const WAIVER_REQUEST = new RegExp(
  String.raw`\brequest\b${ACCOUNT_CLAUSE_SOURCE}{0,90}\b(?:balance|charge|amount)\b${ACCOUNT_CLAUSE_SOURCE}{0,60}\b(?:be\s+)?(?:waived|removed|written\s+off|cancelled|refunded)\b|\brequest\b${ACCOUNT_CLAUSE_SOURCE}{0,90}\b(?:waiv(?:e|er)|remov|write\s+off|cancel|refund)\b`,
  "i",
);
const REVIEW_STILL_PENDING =
  /\b(?:still\s+reviewing|review\s+(?:is\s+)?(?:still\s+)?(?:pending|underway)|(?:still\s+)?under\s+review)\b/i;
const NO_DECISION_YET =
  /\b(?:has|have)\s+not\s+yet\s+made\s+(?:a|the)\s+decision\b|\bno\s+decision\s+(?:has\s+been\s+made\s+)?yet\b|\bdecision\b[^.\n]{0,45}\bnot\s+yet\b/i;
const PROVIDER_REVIEW_PENDING =
  /\b(?:after|until)\b[^.\n]{0,80}\breview\s+(?:is\s+)?completed\b|\breview\s+(?:is\s+)?(?:pending|underway)\b|\bstill\s+reviewing\b/i;
const PROVIDER_WILL_WRITE_AGAIN =
  /\b(?:we|the\s+provider|the\s+team)\s+will\s+(?:write\s+(?:to\s+you\s+)?again|contact\s+you\s+again)\b/i;
const FUTURE_PAYMENT_POSSIBLE =
  /\b(?:may|might|could)\s+become\s+payable\b|\b(?:may|might|could)\b[^.\n]{0,45}\b(?:payable|payment\s+due)\b[^.\n]{0,25}\b(?:later|after\s+review)\b/i;
const PAYMENT_NOT_REQUIRED_TODAY =
  /\byou\s+do(?:\s+not|n['â€™]t)\s+need\s+to\s+pay\b[^.\n]{0,45}\btoday\b|\bno\s+payment\s+(?:is\s+)?required\b[^.\n]{0,25}\btoday\b/i;
const COLLECTION_ACTIVITY_POSSIBLE =
  /\b(?:may|might|could)\s+be\s+referred\b[^.\n]{0,60}\bcollection\s+activity\b|\bfurther\s+collection\s+activity\b/i;
const REQUIRED_DOCUMENT =
  /\b(?:death\s+certificate|document)\b/i;
const REQUIRED_DOCUMENT_ACTION =
  /\b(?:receive|send|provide)\b[^.\n]{0,65}\b(?:death\s+certificate|document)\b|\b(?:death\s+certificate|document)\b[^.\n]{0,65}\b(?:required|needed|must\s+be\s+sent)\b/i;
const FOLLOW_UP_PERIOD =
  /\bwithin\s+\d+\s+(?:calendar\s+|working\s+)?days?\b/i;
const CONDITIONAL_FOLLOW_UP =
  /\bunless\b[^.\n]{0,120}\b(?:heard|response|reply|contact)\b[^.\n]{0,80}\bwithin\s+\d+\s+(?:calendar\s+|working\s+)?days?\b/i;
const CHARGE_REMOVAL_DENIED = new RegExp(
  String.raw`\b(?:cannot|can['’]?t|unable\s+to|will\s+not|won['’]?t|declined\s+to|have\s+not\s+agreed\s+to|has\s+not\s+agreed\s+to)\s+(?:remove|waive|write\s+off|cancel|refund)\b${ACCOUNT_CLAUSE_SOURCE}{0,80}\b(?:charge|balance|amount)?\b`,
  "i",
);
const AMOUNT_STILL_OWED = new RegExp(
  String.raw`\byou\s+(?:still\s+)?owe\b|\b(?:balance|charge|amount)\b${ACCOUNT_CLAUSE_SOURCE}{0,55}\b(?:remains?\s+outstanding|is\s+still\s+outstanding|remains?\s+payable|is\s+due)\b|\boutstanding\s+(?:final\s+)?balance\b`,
  "i",
);
const PAYMENT_REQUIRED = new RegExp(
  String.raw`\byou\s+(?:still\s+)?owe\b|\bpayment\s+(?:is\s+)?required\b|\bplease\s+pay\b|\bpay\s+by\b|\bdue\s+by\b|\b(?:final\s+)?(?:balance|charge|amount)\b${ACCOUNT_CLAUSE_SOURCE}{0,55}\bremains?\s+(?:payable|due)\b|\bfinal\s+(?:bill|payment)\b`,
  "i",
);
const NO_RESPONSE_REQUIRED =
  /\bno\s+(?:further\s+)?(?:response|reply|contact)\s+(?:is\s+)?required\b/i;
const RESPONSE_REQUIRED =
  /\b(?:response|reply|contact)\s+(?:is\s+)?required\b|\b(?:respond|reply|contact\s+us)\s+by\b/i;

const matchesAny = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

const amountContextFor = (
  text: string,
  entry: GroundedAmount,
  chargeRemoved: boolean,
  finalDirectDebitPending: boolean,
  unresolvedFinancialOutcome: boolean,
): AccountOutcomeAmountContext => {
  const before = text.slice(Math.max(0, entry.index - 55), entry.index);
  const after = text.slice(entry.index + entry.raw.length, entry.index + entry.raw.length + 45);
  const nearby = `${before} ${after}`;

  if (/\b(?:outstanding\s+|remaining\s+|final\s+)?balance\b/i.test(nearby)) {
    return "former_balance";
  }

  if (finalDirectDebitPending && /\bfinal\s+direct\s+debit\b/i.test(nearby)) {
    return "final_direct_debit";
  }

  if (
    unresolvedFinancialOutcome &&
    /\b(?:charge|balance|amount|owe|payable|due)\b/i.test(nearby)
  ) {
    return "outstanding_amount";
  }

  if (chargeRemoved && /\b(?:charge|waiv|remov|written\s+off)\b/i.test(nearby)) {
    return "removed_charge";
  }

  return "unknown";
};

export const assessAccountOutcome = (text: string): AccountOutcomeAssessment => {
  const accountClosed = matchesAny(text, ACCOUNT_CLOSED_PATTERNS);
  const closurePending = ACCOUNT_CLOSURE_PENDING.test(text);
  const accountRemainsActive = ACCOUNT_REMAINS_ACTIVE.test(text);
  const chargesContinue = CHARGES_CONTINUE.test(text);
  const chargeRemoved = matchesAny(text, CHARGE_REMOVED_PATTERNS);
  const paymentNotRequiredToday = PAYMENT_NOT_REQUIRED_TODAY.test(text);
  const futurePaymentPossible = FUTURE_PAYMENT_POSSIBLE.test(text);
  const noPaymentRequired =
    NO_PAYMENT_REQUIRED.test(text) &&
    !paymentNotRequiredToday &&
    !futurePaymentPossible;
  const textWithoutNoPaymentRequired = text.replace(
    noPaymentRequired
      ? new RegExp(NO_PAYMENT_REQUIRED.source, "gi")
      : /$^/g,
    " ",
  );
  const textWithoutNoResponseRequired = text.replace(
    new RegExp(NO_RESPONSE_REQUIRED.source, "gi"),
    " ",
  );
  const finalDirectDebitPending = FINAL_DIRECT_DEBIT_PENDING.test(text);
  const noDecisionYet = NO_DECISION_YET.test(text);
  const providerReviewPending = PROVIDER_REVIEW_PENDING.test(text);
  const waiverUnderReview =
    WAIVER_UNDER_REVIEW.test(text) ||
    (WAIVER_REQUEST.test(text) && (REVIEW_STILL_PENDING.test(text) || noDecisionYet));
  const providerWillWriteAgain = PROVIDER_WILL_WRITE_AGAIN.test(text);
  const collectionActivityPossible = COLLECTION_ACTIVITY_POSSIBLE.test(text);
  const chargeRemovalDenied = CHARGE_REMOVAL_DENIED.test(text);
  const amountStillOwed = AMOUNT_STILL_OWED.test(text);
  const paymentRequired = PAYMENT_REQUIRED.test(textWithoutNoPaymentRequired);
  const responseRequired = RESPONSE_REQUIRED.test(textWithoutNoResponseRequired);
  const balanceStillPayable =
    BALANCE_STILL_PAYABLE.test(text) ||
    chargeRemovalDenied ||
    paymentRequired ||
    (amountStillOwed && !(chargeRemoved && noPaymentRequired));
  const unresolvedFinancialOutcome =
    balanceStillPayable ||
    waiverUnderReview ||
    finalDirectDebitPending ||
    futurePaymentPossible;
  const dates = extractDates(text);
  const requiredDocument =
    REQUIRED_DOCUMENT_ACTION.test(text) && REQUIRED_DOCUMENT.test(text)
      ? /\bdeath\s+certificate\b/i.test(text)
        ? "death certificate"
        : "document"
      : undefined;
  const actionDeadline = dates.find((date) => date.role === "stated_deadline")?.value;
  const followUpPeriod = text.match(FOLLOW_UP_PERIOD)?.[0];
  const conditionalFollowUp = CONDITIONAL_FOLLOW_UP.test(text);
  const actionablePendingClosure =
    closurePending &&
    Boolean(accountRemainsActive || chargesContinue || requiredDocument || actionDeadline);
  const amounts = extractGroundedAmounts(text);
  const contextualAmounts = amounts.map((entry) => ({
    entry,
    context: amountContextFor(
      text,
      entry,
      chargeRemoved,
      finalDirectDebitPending,
      unresolvedFinancialOutcome,
    ),
  }));
  const selectedAmount =
    contextualAmounts.find(({ context }) => context === "former_balance") ??
    contextualAmounts.find(({ context }) => context === "removed_charge") ??
    contextualAmounts.find(({ context }) => context === "final_direct_debit") ??
    contextualAmounts[0];

  return {
    isAccountOutcome: accountClosed || chargeRemoved || actionablePendingClosure,
    accountClosed,
    closurePending,
    accountRemainsActive,
    chargesContinue,
    chargeRemoved,
    noPaymentRequired,
    paymentNotRequiredToday,
    noFurtherBills: NO_FURTHER_BILLS.test(text),
    noFurtherDirectDebits: NO_FURTHER_DIRECT_DEBITS.test(text),
    keepConfirmation: KEEP_CONFIRMATION.test(text),
    conditionalDirectDebitFollowUp: CONDITIONAL_DIRECT_DEBIT.test(text),
    conditionalFollowUp,
    finalDirectDebitPending,
    balanceStillPayable,
    waiverUnderReview,
    noDecisionYet,
    providerReviewPending,
    providerWillWriteAgain,
    futurePaymentPossible,
    collectionActivityPossible,
    chargeRemovalDenied,
    amountStillOwed,
    paymentRequired,
    responseRequired,
    unresolvedFinancialOutcome,
    requiredDocument,
    actionDeadline,
    followUpPeriod,
    amount: selectedAmount
      ? {
          amount: selectedAmount.entry.amount,
          sourceQuote: selectedAmount.entry.raw,
          context: selectedAmount.context,
        }
      : undefined,
    reference: extractReferenceNumber(text),
  };
};

// Single entry point returning the whole extraction.
export const extractGeneralAdmin = (text: string): GeneralAdminExtraction => {
  const negationSpans = findNegationSpans(text);
  const { isAutomatic, quote } = detectAutomaticCollection(text);

  const extraction: GeneralAdminExtraction = {
    dates: extractDates(text, negationSpans, isAutomatic),
    amounts: extractAmounts(text, isAutomatic),
    relativePeriods: extractRelativePeriods(text),
    references: extractReferences(text),
    status: detectDocumentStatus(text, isAutomatic),
    negationSpans,
    automaticCollection: isAutomatic,
    automaticCollectionQuote: quote,
  };

  return {
    ...extraction,
    fallback: buildStructuredGeneralAdminFallback(text, extraction),
  };
};

const normaliseSourceStatement = (text: string) => text.trim().replace(/[ \t]+/g, " ");

const firstMatchingStatement = (text: string, pattern: RegExp): string | undefined =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .find((part) => pattern.test(part));

const requestedDocumentFrom = (text: string): string | undefined => {
  const match = text.match(/\b(?:send|provide|upload|return|include|asks?\s+for|requests?)\b[^.\n]{0,80}?\b((?:current\s+)?fit\s+note|death\s+certificate|identity\s+document|tenancy\s+and\s+earnings\s+evidence|rent\s+evidence|household\s+income\s+evidence|right-to-work\s+evidence|final\s+statement|invoice\s+and\s+photographs|invoice|photographs?|meter\s+reading|document|evidence|form)\b/i);
  return match?.[1];
};

const requestedActionFrom = (text: string): string | undefined =>
  firstMatchingStatement(
    text,
    /^(?:please\s+)?(?:send|provide|upload|return|include|reply|respond|contact|report|tell|ask|answer|check|review|complete|accept|keep|gather|pay|close)\b|\basks?\s+(?:you\s+)?(?:for|to|whether)\b|\byou\s+(?:are\s+)?invited\b/i,
  );

// A promise to look at something is an open dependency: the sender has taken
// the matter on and owes an outcome. "Payroll will review the calculation" and
// "the team is checking your figures" are the same shape.
const PROMISED_REVIEW =
  /\b(?:will|going\s+to|shall)\s+(?:now\s+|then\s+|shortly\s+)?(?:review|re-?check|check|recalculate|recalculate|look\s+into|look\s+at|investigate|reconsider|reassess|verify)\b|\b(?:is|are|being)\s+(?:being\s+)?(?:reviewed|rechecked|checked|recalculated|investigated|reassessed)\b|\bwill\s+be\s+(?:reviewed|rechecked|checked|recalculated|investigated|reassessed)\b/i;

export const detectPromisedReview = (text: string): string | undefined =>
  firstMatchingStatement(text, PROMISED_REVIEW);

// A promised review only becomes an open dependency when the sender is
// responding to something the person raised. A one-sided notice that mentions a
// future review ("improvement will be reviewed on 30 September") keeps its
// existing reading, because nothing is owed back to the person yet.
const ACKNOWLEDGED_ENQUIRY =
  /\b(?:acknowledges?|acknowledged|received\s+your|thank\s+you\s+for\s+your|we\s+have\s+your|you\s+(?:asked|raised|reported|queried|questioned))\b/i;

const acknowledgedReviewFrom = (text: string): string | undefined =>
  ACKNOWLEDGED_ENQUIRY.test(text) ? detectPromisedReview(text) : undefined;

// A collection that *might* still happen is unresolved. A collection that is
// simply scheduled ("will be collected on 3 September") is not: that is a known
// event and keeps its existing treatment.
const POSSIBLE_COLLECTION =
  /\b(?:final\s+)?(?:direct\s+debit|standing\s+order|payment|charge|instal?ment|collection|premium|subscription)\b[^.\n]{0,40}?\b(?:may|might|could)\b[^.\n]{0,25}?\b(?:still\s+)?(?:be\s+)?(?:collected|taken|debited|charged|processed|claimed)\b|\b(?:may|might|could)\b[^.\n]{0,25}?\b(?:still\s+)?(?:collect|take|debit|charge|process)\b[^.\n]{0,40}?\b(?:final\s+)?(?:direct\s+debit|standing\s+order|payment|charge|instal?ment|premium)\b/i;

export const detectPossibleCollection = (text: string): string | undefined =>
  firstMatchingStatement(text, POSSIBLE_COLLECTION);

// "Cancelled, however one final payment may still be taken" is two facts, and
// the second one is the one that costs money. A contrast connective followed by
// an unresolved clause is therefore an open dependency in its own right.
const CONTRAST_CONNECTIVE = /\b(?:however|but|although|though|even\s+so|that\s+said|nevertheless|yet)\b/i;
const UNRESOLVED_CLAUSE =
  /\b(?:may|might|could|still|not\s+yet|remains?|pending|outstanding|to\s+follow|will\s+follow|awaiting|unless|until)\b/i;

export const detectUnresolvedContrast = (text: string): string | undefined =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .find((part) => {
      const connective = part.match(CONTRAST_CONNECTIVE);
      if (!connective) return false;
      const after = part.slice((connective.index ?? 0) + connective[0].length);
      return UNRESOLVED_CLAUSE.test(after);
    });

// Internal contradiction. Either the source says so itself, or it asserts that
// money is settled in one place and outstanding in another.
const EXPLICIT_INCONSISTENCY =
  /\b(?:contradict(?:s|ed|ory|ion)?|inconsistent|inconsistency|conflicting|conflicts?\s+with|does\s+not\s+match|do\s+not\s+match|says\s+one\s+thing)\b/i;
const SETTLED_CLAIM =
  /\b(?:balance|amount|charge|debt|fee|invoice|bill)\b[^.\n]{0,40}\b(?:is|was|has\s+been|have\s+been)\s+(?:cancelled|canceled|written\s+off|waived|removed|cleared|settled)\b|\bno\s+(?:payment|further\s+payment)\s+is\s+(?:required|due|owed)\b|\bnothing\s+(?:more\s+)?to\s+pay\b/i;
const OUTSTANDING_CLAIM =
  /\b(?:still\s+(?:be\s+)?(?:payable|owed|due|outstanding)|remains?\s+(?:due|payable|outstanding|owed)|(?:may|might|could)\s+(?:still\s+)?be\s+payable|amount\s+(?:is\s+)?still\s+due|(?:still\s+)?(?:shows?|shown|listed|recorded)\b[^.\n]{0,30}\b(?:outstanding|unpaid))\b/i;

export const detectInternalInconsistency = (text: string): string | undefined => {
  const statements = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const explicit = statements.find((part) => EXPLICIT_INCONSISTENCY.test(part));
  if (explicit) return explicit;

  const settled = statements.find((part) => SETTLED_CLAIM.test(part));
  const outstanding = statements.find((part) => OUTSTANDING_CLAIM.test(part));
  if (!settled || !outstanding) return undefined;

  return settled === outstanding ? settled : `${settled} ${outstanding}`;
};

const dependencyFrom = (text: string): string | undefined =>
  firstMatchingStatement(
    text,
    /\b(?:under\s+review|reviewing|review\s+has\s+started|awaiting|pending|no\s+(?:new\s+)?decision|not\s+yet|remains?\s+(?:active|open|due|payable)|will\s+(?:respond|write|follow)|will\s+[^.\n]{0,80}\bwithin\b|until|unless|once|while|(?:may|might|could)\s+become\s+payable|(?:may|might|could|will)\s+[^.\n]{0,50}after\s+review|if\b|charges?\s+continue|final\s+bill\s+will\s+follow)/i,
  ) ??
  // Shared handling: an uncertain future collection, an unresolved contrast, or
  // a promised review are all open dependencies. They are only consulted when
  // the established wording above finds nothing, so existing reads are unchanged.
  detectPossibleCollection(text) ??
  detectUnresolvedContrast(text) ??
  acknowledgedReviewFrom(text);

const consequenceFrom = (text: string): string | undefined =>
  firstMatchingStatement(
    text,
    /\b(?:may|might|could|will)\b[^.\n]{0,70}\b(?:suspend|suspended|collection|payable|continue|follow|reduce|close|end)|\bcharges?\s+continue|\baccount\s+remains?\s+active/i,
  );

// Records the person is likely to need, taken only from nouns the source itself
// mentions. Nothing is suggested that the message did not raise.
const EVIDENCE_NOUNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\bpayslips?\b/i, label: "the payslip the message refers to" },
  { pattern: /\bholiday\s+(?:pay|entitlement|record)\b/i, label: "your holiday record or entitlement statement" },
  { pattern: /\bcalculations?\b/i, label: "the calculation the message refers to" },
  { pattern: /\btimesheets?\b|\btime\s+record\b/i, label: "your time or attendance record" },
  { pattern: /\bstatements?\b/i, label: "the account statement" },
  { pattern: /\binvoices?\b/i, label: "the invoice" },
  { pattern: /\bcontracts?\b/i, label: "your contract or terms" },
  { pattern: /\bmeter\s+readings?\b/i, label: "a current meter reading" },
  { pattern: /\bdirect\s+debit\b/i, label: "the Direct Debit entry on your bank statement" },
];

const evidenceToGatherFrom = (text: string): string[] =>
  EVIDENCE_NOUNS.filter((entry) => entry.pattern.test(text)).map((entry) => entry.label);

const attributionFrom = (text: string): StructuredGeneralAdminFallback["attribution"] =>
  /\b(?:authority|department|council|official account|universal credit|benefit)\b/i.test(text)
    ? "authority"
    : /\bletter\b/i.test(text)
      ? "letter"
      : /\b(?:provider|supplier|landlord|employer|payroll|retailer|we\b|our\b)\b/i.test(text)
        ? "provider"
        : "message";

const topicFrom = (
  text: string,
  requestedDocument: string | undefined,
  requestedAction: string | undefined,
  extraction: GeneralAdminExtraction,
): GeneralAdminFallbackTopic => {
  if (requestedDocument) return "document_request";
  if (/\b(?:price|tariff|rent)\b[^.\n]{0,40}\b(?:rise|increase|change)|\bcancellation|service\s+transfer/i.test(text)) return "price_or_account_change";
  if (/\b(?:balance|charge|bill|debt|arrears|payable|payment plan|direct debit|collection|payslip)\b/i.test(text) || extraction.amounts.length > 0) return "payment_or_balance";
  if (/\b(?:review|decision|dispute|complaint|investigat|consultation|warning)\b/i.test(text)) return "decision_or_review";
  if (requestedAction) return "provider_update";
  if (extraction.dates.length > 0 || extraction.relativePeriods.length > 0) return "date_or_deadline";
  return "information_confirmation";
};

const titleForTopic: Record<GeneralAdminFallbackTopic, string> = {
  price_or_account_change: "Price or account change to check",
  document_request: "Document request to act on",
  payment_or_balance: "Payment or balance issue to review",
  provider_update: "Provider update with an open next step",
  date_or_deadline: "Date or deadline to keep",
  decision_or_review: "Decision or review update",
  information_confirmation: "Information-only confirmation",
};

export const getStructuredGeneralAdminFallbackTitle = (topic: GeneralAdminFallbackTopic): string =>
  titleForTopic[topic];

export const buildStructuredGeneralAdminFallback = (
  text: string,
  suppliedExtraction?: GeneralAdminExtraction,
): StructuredGeneralAdminFallback | undefined => {
  const sourceStatement = normaliseSourceStatement(text);
  if (!sourceStatement) return undefined;

  const extraction = suppliedExtraction ?? (() => {
    const negationSpans = findNegationSpans(text);
    const automatic = detectAutomaticCollection(text);
    return {
      dates: extractDates(text, negationSpans, automatic.isAutomatic),
      amounts: extractAmounts(text, automatic.isAutomatic),
      relativePeriods: extractRelativePeriods(text),
      references: extractReferences(text),
      status: detectDocumentStatus(text, automatic.isAutomatic),
      negationSpans,
      automaticCollection: automatic.isAutomatic,
      automaticCollectionQuote: automatic.quote,
    };
  })();
  // Hard guard. If the source asks for a code, password, PIN, or card/bank
  // credential, the fallback must never lift that instruction out and hand it
  // back as something to do. Security precedence normally routes these messages
  // elsewhere; this is the last line of defence if it does not.
  const sensitiveInformationRequested = hasSensitiveInformationRequest(text);
  const requestedDocument = sensitiveInformationRequested ? undefined : requestedDocumentFrom(text);
  const requestedAction = sensitiveInformationRequested ? undefined : requestedActionFrom(text);
  const dependency = dependencyFrom(text);
  const inconsistency = detectInternalInconsistency(text);
  const rawConsequence = consequenceFrom(text);
  // A contradiction is not a consequence. When the same wording produced both,
  // the inconsistency signal keeps it and the consequence slot is left empty.
  const consequence =
    inconsistency && rawConsequence && inconsistency.includes(rawConsequence)
      ? undefined
      : rawConsequence;
  const promisedReview = acknowledgedReviewFrom(text);
  const possibleCollection = detectPossibleCollection(text);
  const evidenceToGather = evidenceToGatherFrom(text);
  const communicationAssessment = assessCommunicationSignals(text);
  const explicitNoAction =
    communicationAssessment.negations.length > 0 &&
    !communicationAssessment.signals.some(
      (signal) => signal.kind === "reply_request" || signal.kind === "action_request",
    );
  const completed = /\b(?:is\s+complete|has\s+been\s+(?:completed|closed)|is\s+operating\s+normally|payment\s+received|received\s+your\s+[^.\n]*payment|added\s+it\s+to\s+the\s+record)\b/i.test(text);
  const clearAction = Boolean(
    requestedDocument ||
    requestedAction ||
    extraction.dates.some((date) => date.role === "stated_deadline") ||
    (extraction.amounts.some((amount) => amount.role === "amount_demanded") && /remains?\s+(?:due|payable)/i.test(text)) ||
    (consequence && /\b(?:if|unless)\b/i.test(consequence)),
  );
  const waiting = Boolean(dependency) && !clearAction;
  const useful =
    extraction.dates.length > 0 ||
    extraction.amounts.length > 0 ||
    extraction.relativePeriods.length > 0 ||
    extraction.references.length > 0 ||
    Boolean(
      requestedAction ||
        requestedDocument ||
        dependency ||
        consequence ||
        inconsistency ||
        explicitNoAction ||
        completed ||
        sensitiveInformationRequested,
    );
  if (!useful) return undefined;

  let topic = topicFrom(text, requestedDocument, requestedAction, extraction);
  const provisionalStatus: GeneralAdminFallbackStatus = explicitNoAction && !dependency
    ? "no_action_needed"
    : clearAction
      ? "ready_to_act"
      : waiting
        ? "waiting"
        : completed && !dependency
          ? "resolved"
          : "new";
  // A message that contradicts itself is never settled, whatever else it says.
  const status: GeneralAdminFallbackStatus =
    inconsistency && (provisionalStatus === "resolved" || provisionalStatus === "no_action_needed")
      ? "ready_to_act"
      : provisionalStatus;
  if (status === "no_action_needed" || status === "resolved") {
    topic = "information_confirmation";
  }
  const nextStepKind: GeneralAdminNextStepKind = sensitiveInformationRequested
    ? "verify_outcome"
    : status === "no_action_needed" || status === "resolved"
    ? "keep_confirmation"
    : requestedDocument || requestedAction
      ? "act_on_request"
      : extraction.dates.length > 0
        ? "check_deadline"
        : extraction.amounts.length > 0
          ? "check_amount"
          : waiting
            ? "wait_then_chase"
            : "verify_outcome";
  const namedPeriod = extraction.relativePeriods[0]?.value;
  const namedDate = extraction.dates.find((date) => date.role === "stated_deadline")?.value ?? extraction.dates[0]?.value;
  const nextAction = sensitiveInformationRequested
    ? SENSITIVE_INFORMATION_WARNING
    : inconsistency
    ? "The message contains contradictory statements, so the position is unresolved. Ask the provider to clarify in writing through a verified channel, and keep both statements until they answer."
    : status === "no_action_needed" || status === "resolved"
    ? "Keep this confirmation with the account record. No further action is indicated unless the source details change."
    : requestedDocument
      ? `Check the source and provide the requested ${requestedDocument}${namedDate ? ` by ${namedDate}` : ""} through a verified channel.`
      : requestedAction
        ? `Follow the source request through a verified channel: ${requestedAction}`
        : consequence && clearAction
          ? `Check the source account details and the stated consequence through a verified channel before ${namedDate ?? "acting"}.`
        : possibleCollection && waiting
          ? "Keep this update and wait for the stated outcome; watch the account for the collection the source says may still be taken, and check through a verified channel if it is taken unexpectedly."
        : promisedReview && waiting
          ? `Keep this acknowledgement and wait for the stated outcome${namedPeriod ? ` for ${namedPeriod}` : ""}; chase through a verified channel if the promised response does not arrive.`
        : waiting
          ? `Keep the update and wait for the stated outcome${namedPeriod ? ` for ${namedPeriod}` : ""}; chase through a verified channel if it does not arrive.`
          : extraction.amounts.length > 0
            ? "Compare the stated amount with the original account record and ask the organisation to clarify any difference through a verified channel."
            : namedDate
              ? `Check the source details and keep ${namedDate} in view.`
              : "Check the source statement and verify any next step with the organisation through an independently verified channel.";

  return {
    topic,
    sourceStatement,
    dates: extraction.dates,
    relativePeriods: extraction.relativePeriods,
    amounts: extraction.amounts,
    references: extraction.references,
    requestedAction,
    requestedDocument,
    consequence,
    dependency,
    inconsistency,
    evidenceToGather: evidenceToGather.length > 0 ? evidenceToGather : undefined,
    sensitiveInformationRequested: sensitiveInformationRequested || undefined,
    attribution: attributionFrom(text),
    status,
    nextStepKind,
    nextAction,
    uncertaintyNote: inconsistency
      ? "AdminAvenger is preserving what the source says. The message states two things that cannot both be true, and AdminAvenger cannot decide which is correct, or decide entitlement, liability, legality, or the eventual outcome."
      : "AdminAvenger is preserving what the source says. It has not independently verified the sender's statement or decided entitlement, liability, legality, or the eventual outcome.",
  };
};
