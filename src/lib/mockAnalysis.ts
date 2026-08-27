import type {
  AdminFinding,
  AdminItem,
  FindingCategory,
  FindingConfidence,
  FindingUrgency,
  SourceType,
} from "../types";
import { assessBroadbandPriceRise, isBroadbandPriceRiseScenario } from "./broadbandPriceRiseAssessment";
import { buildCareerSupportPack, type CareerSupportPack } from "./careerSupportPack";
import { assessUkTrainDelayRefund } from "./delayRepayAssessment";
import { classifyDecisionDocument } from "./decisionEngine/classifier";
import { analyseDecisionProblem } from "./decisionEngine/decisionEngine";
import {
  extractEnergyAnnualCosts,
  extractTotalCostMention,
  extractTravelRecoveryDetails,
  formatAnnualImpact,
  formatCurrency,
  isEnergyPriceChangeText,
  isTravelDisruptionRecoveryText,
  isTravelEvidenceCheckText,
} from "./moneyParsers";
import {
  assessPaymentReminder,
  buildPaymentReminderSuggestedAction,
} from "./paymentReminderAssessment";
import {
  assessPublicIntakeScope,
  type PublicScopeBoundary,
} from "./publicScopePolicy";
import {
  assessEmailSafety,
  createEmailSafetyFinding,
  shouldPrioritiseEmailSafety,
} from "./suspiciousEmail";
import {
  assessCommunicationSignals,
  assessAccountOutcome,
  assessRefundState,
  extractGeneralAdmin,
  isAppointmentReminderText,
  isBillReadyDirectDebitText,
  isDeliveryCompletedText,
  isSecurityAlertText,
  getStructuredGeneralAdminFallbackTitle,
  selectRefundTotal,
  type RefundStage,
  type StructuredGeneralAdminFallback,
} from "./generalAdminExtraction";

export type AdminAnalysisAccessMode = "public" | "controlled";

type AdminAnalysisOptions = {
  accessMode?: AdminAnalysisAccessMode;
};

type CategoryRule = {
  category: FindingCategory;
  title: string;
  strongKeywords: string[];
  weakKeywords: string[];
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  estimatedValue?: string;
};

const categoryRules: CategoryRule[] = [
  {
    category: "refund",
    title: "Possible refund follow-up",
    strongKeywords: ["refund", "failed delivery"],
    // "cancelled" alone is intentionally NOT a refund trigger. A cancelled flight or
    // order only becomes a money-back case when paired with refund/reimbursement/
    // compensation/claim wording (see isTravelEvidenceCheckText in moneyParsers).
    weakKeywords: ["returned", "missing order", "not delivered", "compensation"],
    summary: "This item suggests there may be money, compensation, or a service credit to check.",
    whyItMatters:
      "Refund and compensation windows can close quickly, so it is worth chasing while the details are fresh.",
    suggestedAction:
      "Ask the company to confirm eligibility and explain the refund or compensation claim process.",
    estimatedValue: "Possible refund",
  },
  {
    category: "subscription",
    title: "Subscription cancellation",
    strongKeywords: ["subscription", "renews", "membership", "trial"],
    weakKeywords: ["renewal", "recurring", "next payment", "billing cycle", "annual subscription", "monthly subscription"],
    summary: "This looks like a recurring payment or renewal that may need review.",
    whyItMatters:
      "Unused subscriptions quietly drain money unless they are cancelled before the next payment.",
    suggestedAction:
      "Check whether you still use it and cancel before the next billing or renewal date if not.",
    estimatedValue: "Potential monthly saving",
  },
  {
    category: "complaint",
    title: "Complaint opportunity",
    strongKeywords: ["complaint", "unhappy", "ignored", "no response", "poor service"],
    weakKeywords: ["frustrated", "disappointed", "escalate", "not acceptable", "chased twice"],
    summary: "There is enough context here to consider a structured complaint.",
    whyItMatters:
      "A clear complaint creates a record and may unlock a goodwill payment, escalation, or faster response.",
    suggestedAction:
      "Send a concise complaint with dates, what happened, the impact, and the outcome you want.",
  },
  {
    category: "deadline",
    title: "Deadline to remember",
    strongKeywords: ["deadline", "due by", "expires", "renewal date", "appointment"],
    weakKeywords: ["before", "by noon", "by close of business", "scheduled", "booking"],
    summary: "This item appears to contain a time-sensitive action or date.",
    whyItMatters: "Missing a deadline can remove options, create extra costs, or delay a useful outcome.",
    suggestedAction: "Add a reminder and complete the required action before the due date.",
  },
  {
    category: "job_application",
    title: "Job application follow-up",
    strongKeywords: ["interview", "recruiter", "application", "job", "hiring", "cv"],
    weakKeywords: ["role", "vacancy", "candidate", "shortlist", "next stage"],
    summary: "This job-related message may be ready for a polite follow-up.",
    whyItMatters: "Following up keeps the conversation warm without sounding pushy.",
    suggestedAction: "Send a short message asking whether there is an update on the hiring timeline.",
  },
  {
    category: "bill_increase",
    title: "Bill increase challenge",
    strongKeywords: ["price rise", "bill increase", "tariff increase", "rate change"],
    weakKeywords: ["new price", "monthly charge increase", "premium increase", "higher bill", "going up"],
    summary: "This item appears to mention a higher bill, tariff, or upcoming price rise.",
    whyItMatters:
      "Price rises are often negotiable if you challenge them before they take effect.",
    suggestedAction:
      "Ask the provider for a better deal or confirmation of your cancellation and switching options.",
    estimatedValue: "Possible annual cost increase",
  },
  {
    category: "warranty",
    title: "Warranty claim",
    strongKeywords: ["warranty", "guarantee", "repair", "faulty", "broken"],
    weakKeywords: ["defect", "replacement", "manufacturer", "proof of purchase", "not working"],
    summary: "This item suggests a product may be faulty or still covered by warranty.",
    whyItMatters: "A valid warranty can reduce or remove repair and replacement costs.",
    suggestedAction:
      "Collect proof of purchase and ask the seller or manufacturer to open a warranty claim.",
    estimatedValue: "Replacement or repair value",
  },
  {
    category: "important_reply",
    title: "Important reply needed",
    strongKeywords: ["urgent", "action required", "final notice", "important"],
    weakKeywords: ["reply", "respond", "response needed", "please confirm", "awaiting your response"],
    summary: "This looks like a message that deserves a direct reply or decision.",
    whyItMatters:
      "Important replies can prevent delays, missed opportunities, or avoidable escalation.",
    suggestedAction:
      "Send a clear response confirming the next step or asking for the missing detail.",
  },
];

const sourceTypeLabels: Record<SourceType, string> = {
  email: "email",
  pdf: "pdf document",
  receipt: "receipt",
  bill: "bill",
  note: "note",
  job_message: "job message",
  other: "other",
};

const highUrgencyKeywords = [
  "urgent",
  "final notice",
  "deadline",
  "expires",
  "cancelled",
  "failed",
  "overdue",
];

const mediumUrgencyKeywords = [
  "renewal",
  "renewal date",
  "increase",
  "reply",
  "application",
  "interview",
];

const containsAny = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

const findMatches = (text: string, keywords: string[]) =>
  keywords.filter((keyword) => text.includes(keyword));

const approvedRefundSignals = [
  "refund approved",
  "refund has been approved",
  "refund issued",
  "refund will be returned",
  "refund processed",
  "returned to your original payment method",
  "money back",
];

const isApprovedRefund = (text: string) =>
  containsAny(text, approvedRefundSignals) ||
  (/refund\s+of\s+(?:£|Â£|GBP\s*|\?\s*)\d+(?:,\d{3})*(?:\.\d{1,2})?/i.test(text) &&
    /approved|issued|processed|returned|will be returned/i.test(text));

/**
 * Stages that mean the provider has actually committed to a refund. Used to stop
 * a keyword read from titling a refusal as an approval.
 */
const REFUND_SUCCESS_STAGES = new Set<RefundStage>([
  "approved",
  "issued",
  "promised",
  "received",
]);

const recurringBillingSignals = [
  "/month",
  "auto-renewing",
  "auto renewing",
  "subscription",
  "until cancelled",
  "until canceled",
  "charged automatically",
  "renews",
  "recurring",
  "learn how to cancel",
];

const isRecurringSubscription = (text: string) => containsAny(text, recurringBillingSignals);

const deliveryUpdateSignals = [
  "parcel is due to arrive",
  "delivery is due",
  "due to arrive",
  "arrive tomorrow",
  "track your delivery",
  "tracking link",
  "delivery window",
];

const deliveryContextSignals = ["parcel", "delivery", "courier", "tracking"];

const deliveryProblemSignals = [
  "failed delivery",
  "missing parcel",
  "not arrived",
  "not received",
  "damaged",
  "refund",
  "claim before",
  "contact us within",
  "action required",
  "reply by",
  "respond before",
];

const isDeliveryUpdate = (text: string) => containsAny(text, deliveryUpdateSignals);

const isDeliveryProblem = (text: string) =>
  containsAny(text, deliveryContextSignals) && containsAny(text, deliveryProblemSignals);

const noActionSignals = [
  "no action required",
  "no further action",
  "balance is now £0.00",
  "balance is now ?0.00",
  "balance is now 0.00",
  "account balance is now £0.00",
  "account balance is now ?0.00",
  "payment received",
  "thank you for your payment",
  "paid in full",
];

const actionRequirementSignals = [
  "refund",
  "price rise",
  "bill increase",
  "tariff increase",
  "renews",
  "renewal",
  "cancel before",
  "claim before",
  "contact us before",
  "contact us within",
  "deadline",
  "complaint",
  "not arrived",
  "missing parcel",
  "faulty",
  "warranty",
  "action required",
];

const removeNoActionPhrases = (text: string) =>
  noActionSignals.reduce(
    (cleanedText, signal) => cleanedText.replaceAll(signal, ""),
    text,
  );

const isNoActionRecord = (text: string) =>
  containsAny(text, noActionSignals) &&
  !containsAny(removeNoActionPhrases(text), actionRequirementSignals);

const receiptSignals = [
  "receipt",
  "order confirmation",
  "proof of purchase",
  "retailer:",
  "order number",
];

const isReceiptRecord = (text: string) => containsAny(text, receiptSignals);

const getUrgency = (
  text: string,
  sourceType: SourceType,
  category: FindingCategory,
): FindingUrgency => {
  if (containsAny(text, highUrgencyKeywords)) {
    return "high";
  }

  if (containsAny(text, mediumUrgencyKeywords)) {
    return "medium";
  }

  if (category === "deadline" || category === "bill_increase") {
    return "high";
  }

  if (category === "subscription" || category === "job_application") {
    return "medium";
  }

  if (category === "warranty" || sourceType === "receipt" || sourceType === "note") {
    return "low";
  }

  return "medium";
};

const getConfidence = (strongMatches: string[], weakMatches: string[]): FindingConfidence => {
  if (strongMatches.length > 1 || (strongMatches.length > 0 && weakMatches.length > 0)) {
    return "high";
  }

  if (strongMatches.length > 0 || weakMatches.length > 0) {
    return "medium";
  }

  return "low";
};

const mapBroadbandActionConfidence = (
  actionConfidence: ReturnType<typeof assessBroadbandPriceRise>["actionConfidence"],
): FindingConfidence => {
  if (actionConfidence === "high") {
    return "high";
  }

  if (actionConfidence === "medium") {
    return "medium";
  }

  return "low";
};

const createFinding = (
  item: AdminItem,
  rule: CategoryRule,
  text: string,
): AdminFinding => {
  const strongMatches = findMatches(text, rule.strongKeywords);
  const weakMatches = findMatches(text, rule.weakKeywords);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: rule.category,
    title: rule.title,
    summary: rule.summary,
    whyItMatters: rule.whyItMatters,
    suggestedAction: rule.suggestedAction,
    estimatedValue: rule.estimatedValue,
    urgency: getUrgency(text, item.sourceType, rule.category),
    confidence: getConfidence(strongMatches, weakMatches),
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createUnknownFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: "No obvious saving or action found",
  summary:
    "AdminAvenger checked this for refunds, price rises, renewal charges, deadlines, complaint opportunities, and useful evidence. It did not find anything that clearly needs action right now.",
  whyItMatters:
    "Not every admin document needs to become a case. Some are simply records to keep or delete.",
  suggestedAction:
    "You can keep this as a record, delete it, or try another document.",
  urgency: "low",
  confidence: "low",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createCommunicationFinding = (
  item: AdminItem,
  assessment: ReturnType<typeof assessCommunicationSignals>,
): AdminFinding => {
  const replyRequest = assessment.signals.find((signal) => signal.kind === "reply_request");
  const actionRequest = assessment.signals.find((signal) => signal.kind === "action_request");
  const importance = assessment.signals.find((signal) => signal.kind === "importance");
  const urgency = assessment.signals.find((signal) => signal.kind === "urgency");

  const title = replyRequest
    ? "Important reply needed"
    : actionRequest
      ? "Action requested to check"
      : importance
        ? "Important message to check"
        : "Urgent message to check";
  const summary = replyRequest
    ? "The source asks for a reply or response. Check the wording and any stated date before preparing one."
    : actionRequest
      ? "The source asks for a non-reply action. Check exactly what it requests before deciding what to do."
      : importance
        ? "The sender marks this message as important. That does not by itself mean a reply or other action is required."
        : "The sender uses urgent wording. That does not by itself mean a reply or other action is required.";
  const suggestedAction = replyRequest
    ? "Prepare a clear response to the source request, then review it before deciding whether to use it."
    : actionRequest
      ? "Review the source request and prepare the stated action through a verified channel."
      : importance
        ? "Review what the sender marked as important and decide what, if anything, needs attention."
        : "Review the source wording and any stated date before deciding what to do.";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: replyRequest ? "important_reply" : "unknown",
    title,
    summary,
    whyItMatters:
      "Importance, urgency, reply requests and action requests have different meanings. Keeping them separate avoids rushed or unsupported correspondence.",
    suggestedAction,
    urgency: urgency ? "high" : "medium",
    confidence: "medium",
    status: replyRequest || actionRequest ? "to_do" : "new",
    createdAt: new Date().toISOString(),
  };
};

const createStructuredGeneralAdminFallbackFinding = (
  item: AdminItem,
  fallback: StructuredGeneralAdminFallback,
): AdminFinding => {
  const attribution = fallback.attribution === "authority"
    ? "The authority says"
    : fallback.attribution === "provider"
      ? "The provider says"
      : fallback.attribution === "letter"
        ? "The letter says"
        : "The message says";
  const details = [
    `${attribution}: ${fallback.sourceStatement}`,
    fallback.inconsistency
      ? `The message contains contradictory statements and the position is unresolved: ${fallback.inconsistency} AdminAvenger cannot decide which statement is correct.`
      : undefined,
    fallback.dependency ? `Open dependency: ${fallback.dependency}` : undefined,
    fallback.consequence ? `Stated consequence: ${fallback.consequence}` : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const findingStatus: AdminFinding["status"] = fallback.status === "ready_to_act"
    ? "to_do"
    : fallback.status;

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: getStructuredGeneralAdminFallbackTitle(fallback.topic),
    summary: details.join(" "),
    whyItMatters:
      "Useful facts should stay visible even when AdminAvenger cannot safely assign a specialist category or decide the underlying outcome.",
    suggestedAction: fallback.nextAction,
    urgency: fallback.consequence ||
      fallback.inconsistency ||
      fallback.dates.some((date) => date.role === "stated_deadline")
      ? "high"
      : fallback.status === "ready_to_act" || fallback.status === "waiting"
        ? "medium"
        : "low",
    deadline: fallback.dates.find((date) => date.role === "stated_deadline")?.value,
    confidence: "medium",
    status: findingStatus,
    generalAdminFallback: fallback,
    createdAt: new Date().toISOString(),
  };
};

const createDeliveryUpdateFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: "Delivery update - no action needed yet",
  summary:
    "This looks like a delivery update. No obvious action is required unless the parcel does not arrive.",
  whyItMatters:
    "Delivery windows are useful to keep, but they are not the same as a deadline or urgent reply.",
  suggestedAction:
    "Keep the tracking details and only contact the sender or courier if the parcel does not arrive.",
  urgency: "low",
  confidence: "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});

const isAppointmentTask = (text: string) =>
  /\b(appointment|dentist|doctor|gp|optician|clinic)\b/.test(text) &&
  /\b(cancelled|canceled|rebook|reschedule|book another|asked me to rebook|moved\s+from)\b/.test(text) &&
  !/\b(deadline|due by|expires|respond before|reply before|before \d{1,2}|by \d{1,2})\b/.test(text);

const appointmentSourceInstruction = (
  text: string,
  pattern: RegExp,
): string | undefined =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .find((part) => pattern.test(part));

const createAppointmentTaskFinding = (item: AdminItem): AdminFinding => {
  const moved = /\bappointment\b[^.\n]*\bmoved\s+from\b/i.test(item.rawText);
  const arrivalInstruction = appointmentSourceInstruction(
    item.rawText,
    /\bplease\s+arrive\b[^.\n]*\bearly\b/i,
  );
  const conditionalReply = appointmentSourceInstruction(
    item.rawText,
    /\bdo(?:\s+not|n['’]t)\s+need\s+to\s+(?:reply|respond)\b[^.\n]*\bunless\b|\b(?:reply|respond)\b[^.\n]*\bunless\b/i,
  );
  const sourceInstructions = [arrivalInstruction, conditionalReply]
    .filter((entry): entry is string => Boolean(entry))
    .map((entry) => `The source also says: ${entry}`);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: moved ? "Appointment date changed" : "Appointment to rebook",
    summary: [
      moved
        ? "This message states that an appointment has moved to a replacement date."
        : "This looks like an appointment or booking that needs rearranging.",
      ...sourceInstructions,
    ].join(" "),
    whyItMatters:
      "Rebooking keeps the admin loop closed, but this is not a refund or money-back case.",
    suggestedAction: moved
      ? [
          "Check the previous and replacement appointment dates.",
          arrivalInstruction ? `Keep this source instruction in view: ${arrivalInstruction}` : undefined,
          conditionalReply ? `Follow the source's reply condition: ${conditionalReply}` : "Keep the confirmation.",
        ]
          .filter((entry): entry is string => Boolean(entry))
          .join(" ")
      : "Rebook the appointment and save the confirmation.",
    urgency: "low",
    confidence: "medium",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createDeliveryIssueFinding = (item: AdminItem, text: string): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "complaint",
  title: "Delivery issue to chase",
  summary:
    "This looks like a delivery issue rather than a normal tracking update. The text suggests the parcel may be missing, late, or needs a response.",
  whyItMatters:
    "Delivery issue windows can be short, so it is worth keeping the tracking details and contacting the sender or courier within the stated timeframe.",
  suggestedAction: containsAny(text, ["contact us within", "reply by", "respond before", "claim before"])
    ? "Contact the sender or courier within the stated timeframe and keep the tracking details."
    : "Check the tracking details, then contact the sender or courier if the parcel is still missing.",
  urgency: containsAny(text, ["within 48 hours", "action required", "final notice"]) ? "high" : "medium",
  confidence: "high",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createApprovedRefundFinding = (item: AdminItem): AdminFinding => {
  // Role-aware amount: the refund total must win over an order subtotal, postage,
  // or a line item. selectRefundTotal returns undefined rather than guessing when
  // no clearly-refundable amount is present.
  const refundTotal = selectRefundTotal(`${item.title}\n${item.rawText}`);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "refund",
    title: "Refund approved",
    summary:
      "A refund has been approved and should be returned to the original payment method.",
    whyItMatters:
      "Approved refunds can still need checking because the money is not recovered until it reaches your account.",
    suggestedAction:
      "Check your original payment method. Chase the provider if the refund has not arrived after 10 working days.",
    estimatedValue: refundTotal ? refundTotal.sourceQuote : "Pending recovery",
    urgency: "medium",
    documentStatus: "informational",
    confidence: "high",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createSubscriptionFinding = (item: AdminItem): AdminFinding => {
  // Preserve the renewal amount, billing frequency, renewal/next-charge date, and
  // cancellation wording where the source contains them, instead of discarding
  // them behind fixed generic copy.
  const extraction = extractGeneralAdmin(`${item.title}\n${item.rawText}`);
  const recurring =
    extraction.amounts.find((amount) => amount.role === "recurring_charge") ??
    extraction.amounts[0];
  const frequencyWord =
    recurring?.frequency === "annual"
      ? "per year"
      : recurring?.frequency === "weekly"
        ? "per week"
        : recurring?.frequency === "monthly"
          ? "per month"
          : undefined;
  const amountText = recurring
    ? `${recurring.sourceQuote}${frequencyWord ? ` ${frequencyWord}` : ""}`
    : undefined;
  const renewalDate = extraction.dates.find(
    (date) => date.role === "event_date" || date.role === "stated_deadline",
  );
  const cancellationWording =
    /(?:learn how to cancel|how to cancel|cancel anytime|cancel before[^.]*|until cancelled|until canceled|manage your subscription)/i.exec(
      `${item.title} ${item.rawText}`,
    )?.[0];

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "subscription",
    title: "Subscription renewal to review",
    summary:
      `This looks like an auto-renewing or recurring subscription${amountText ? ` of ${amountText}` : ""} that may keep charging until cancelled.${renewalDate ? ` The next charge or renewal date appears to be ${renewalDate.value}.` : ""}`,
    whyItMatters:
      "Recurring subscriptions can become ongoing costs if you no longer use them.",
    suggestedAction:
      `Check whether you still use this subscription${renewalDate ? ` and decide before ${renewalDate.value}` : ""}.${cancellationWording ? ` The message mentions how to cancel ("${cancellationWording.trim()}").` : ""} Cancel before the next charge if you no longer want it.`,
    estimatedValue: "Potential recurring cost",
    urgency: "medium",
    documentStatus: "upcoming_reminder",
    confidence: "high",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const careerDocumentTitles: Record<CareerSupportPack["documentType"], string> = {
  cv: "CV preparation notes",
  cv_job_advert_match: "CV and job advert match notes",
  cover_letter: "Cover letter review notes prepared",
  job_advert: "Job advert preparation notes",
  application_answer: "Application answer review notes prepared",
  career_unknown: "Career material needs review",
};

const createCareerSupportFinding = (
  item: AdminItem,
  pack: CareerSupportPack,
): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: careerDocumentTitles[pack.documentType],
  summary: pack.summary,
  whyItMatters:
    pack.documentType === "cv"
      ? "This appears to be a CV or career profile, so AdminAvenger is preparing review notes about strengths, evidence, gaps, and next steps before applying."
      : pack.documentType === "cv_job_advert_match"
        ? "This appears to contain both CV evidence and job-advert requirements, so AdminAvenger is preparing notes to compare them without ranking or deciding suitability."
      : "This looks like career or job-search material, so AdminAvenger is treating it as preparation work rather than a bill, subscription, complaint, or admin letter.",
  suggestedAction:
    pack.nextPreparationSteps[0] ??
    "Review the career support notes, check the evidence, and edit any wording before using it.",
  urgency: pack.documentType === "job_advert" || pack.documentType === "cv_job_advert_match" ? "medium" : "low",
  confidence: pack.confidence.level,
  status: "new",
  createdAt: new Date().toISOString(),
});

const createTravelRecoveryFinding = (item: AdminItem): AdminFinding => {
  const travel = extractTravelRecoveryDetails(`${item.title}\n${item.rawText}`);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: "Travel recovery to review",
    summary:
      "This looks like a travel disruption where an extra cost may need evidence before asking for repayment.",
    whyItMatters:
      "Travel disruption costs can be messy. A clear evidence pack helps the user ask the right company for a decision without claiming certainty.",
    suggestedAction:
      "Gather the proof of payment, company replies, booking reference, and any flight-change evidence. Then prepare a concise reimbursement request for the extra cost.",
    estimatedValue: travel.recoveryAmount
      ? `${formatCurrency(travel.recoveryAmount)} potential recovery`
      : "Potential recovery amount needs checking",
    urgency: "medium",
    confidence: travel.recoveryAmount !== undefined ? "medium" : "low",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createTravelEvidenceCheckFinding = (item: AdminItem): AdminFinding => {
  const totalCost = extractTotalCostMention(`${item.title}\n${item.rawText}`);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: "Travel evidence check",
    summary:
      "This looks like a flight cancellation where evidence needs checking before any claim. No clear recoverable amount was found, so nothing is counted as money back.",
    whyItMatters:
      "Knowing what evidence the airline requires before making a claim avoids wasted time and rejected requests. A total holiday or trip cost is not the same as a recoverable amount.",
    suggestedAction: "Ask the airline what evidence they need before making a claim.",
    estimatedValue: totalCost
      ? `Amount needs checking - ${formatCurrency(totalCost.amount)} total cost mentioned, not a recoverable amount`
      : "No clear recoverable amount found",
    urgency: "medium",
    confidence: "medium",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createEnergyPriceChangeFinding = (item: AdminItem): AdminFinding => {
  const energy = extractEnergyAnnualCosts(`${item.title}\n${item.rawText}`);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "bill_increase",
    title: "Energy prices are changing",
    summary:
      "This looks like an energy price-change notice with old and new annual cost estimates.",
    whyItMatters:
      "Energy price changes can affect annual household costs, but this is a checking opportunity rather than a confirmed saving.",
    suggestedAction:
      "Review whether a cheaper tariff, fixed deal, supplier switch, or support option is worth checking. Keep this as evidence of the new annual estimate.",
    estimatedValue: energy.totalAnnualIncrease
      ? `${formatAnnualImpact(energy.totalAnnualIncrease)} annual increase`
      : "Potential annual cost change",
    urgency: "medium",
    confidence: "high",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createReceiptFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: "Proof of purchase found",
  summary:
    "This looks like receipt or order evidence. It may be useful later for a return, warranty, refund, or complaint, but it is not money saved by itself.",
  whyItMatters:
    "Receipts and order references are useful evidence if something goes wrong later.",
  suggestedAction:
    "Save this as a record if you want proof of purchase. Open a new case later if the item is faulty, missing, or needs returning.",
  urgency: "low",
  confidence: "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createPaymentReminderFinding = (item: AdminItem): AdminFinding => {
  const assessment = assessPaymentReminder(item);
  const amountText = assessment.amountDue ? ` ${assessment.amountDue}` : "";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "important_reply",
    title: "Payment reminder to check",
    summary:
      `This looks like a payment reminder asking the user to check an amount${amountText}. AdminAvenger has not decided whether the money is owed.${assessment.collectionActivityPossible ? " The provider says further collection activity may follow if the payment or dispute is not addressed by the stated date." : ""}`,
    whyItMatters:
      "Payment reminders can have dates and account references worth checking, but the user should verify the provider and whether the amount is correct or already paid before acting.",
    suggestedAction: buildPaymentReminderSuggestedAction(assessment),
    estimatedValue: assessment.amountDue
      ? `${assessment.amountDue} amount being requested - not counted as saved or recovered`
      : "Amount being requested - not counted as saved or recovered",
    urgency: assessment.responseDeadline || assessment.paymentDueDate ? "high" : "medium",
    deadline: assessment.responseDeadline ?? assessment.paymentDueDate,
    confidence: "medium",
    status: assessment.collectionActivityPossible ? "to_do" : "new",
    createdAt: new Date().toISOString(),
  };
};

// The Decision Engine only takes over for text that clearly matches one of its
// supported rights/dispute document types (parking, bailiff, debt, TV Licence,
// bank complaint, consumer dispute). It never guesses on plain/ambiguous text -
// that keeps the existing refund/subscription/energy/safety flows in charge
// wherever they already apply.
const isDecisionEngineDocument = (text: string) =>
  classifyDecisionDocument(text) !== "unknown_admin_dispute";

const decisionUrgencyMap: Record<
  ReturnType<typeof analyseDecisionProblem>["caseStrength"],
  FindingUrgency
> = {
  urgent_get_advice: "high",
  stronger_possible_ground: "medium",
  possible_ground: "medium",
  weak_or_missing_evidence: "low",
  not_enough_information: "low",
};

const decisionConfidenceMap: Record<
  ReturnType<typeof analyseDecisionProblem>["caseStrength"],
  FindingConfidence
> = {
  urgent_get_advice: "high",
  stronger_possible_ground: "high",
  possible_ground: "medium",
  weak_or_missing_evidence: "low",
  not_enough_information: "low",
};

const createDecisionEngineFinding = (item: AdminItem, text: string): AdminFinding => {
  const decision = analyseDecisionProblem(text, item.userQuestion);

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "admin_dispute",
    title: decision.title,
    summary: decision.plainEnglishSummary,
    whyItMatters: decision.whatThisLooksLike,
    suggestedAction: decision.nextSteps[0] ?? "Review the notice and gather evidence before acting.",
    estimatedValue: decision.amountMentioned,
    urgency: decisionUrgencyMap[decision.caseStrength],
    confidence: decisionConfidenceMap[decision.caseStrength],
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createPublicScopeBoundaryFinding = (
  item: AdminItem,
  boundary: Extract<PublicScopeBoundary, { status: "blocked" }>,
): AdminFinding => {
  const text = `${item.title}\n${item.rawText}`;
  const isUcAppointment =
    /\buniversal credit\b/i.test(text) && /\b(?:appointment|jobcentre|journal)\b/i.test(text);
  const isDisciplinaryInvitation =
    /\bdisciplinary\b/i.test(text) && /\b(?:hearing|invitation|invited)\b/i.test(text);
  const isPossessionNotice =
    /\b(?:notice seeking possession|possession notice|possession order)\b/i.test(text);

  const title = isUcAppointment
    ? "Universal Credit appointment to prepare for"
    : isDisciplinaryInvitation
      ? "Disciplinary hearing invitation to prepare for"
      : isPossessionNotice
        ? "Possession notice needs urgent checking"
        : boundary.availability === "controlled_beta"
          ? "This needs a careful human review"
          : "Specialist support may be needed";
  const summary = isUcAppointment
    ? "The message describes a Universal Credit appointment or claim action. AdminAvenger can help you prepare and preserve the stated date, but it cannot decide entitlement or whether a requirement has been met."
    : isDisciplinaryInvitation
      ? "The message is an invitation to a disciplinary hearing, not an outcome. Review the invitation and attached evidence, and gather relevant records before deciding what to do. AdminAvenger cannot decide whether the employer's action is lawful."
      : isPossessionNotice
        ? "The source uses possession wording and says court action may follow after the stated date. This does not mean eviction is certain. Check the notice urgently and seek independent housing advice."
        : boundary.availability === "controlled_beta"
          ? "This looks outside the public Check a message scope. AdminAvenger is keeping it as preparation only and is not opening a specialist beta automatically."
          : "This may involve urgent, safeguarding, housing, crisis, or another specialist area. AdminAvenger is keeping it as preparation only and is not deciding what action to take.";
  const suggestedAction = isUcAppointment
    ? `Review the Universal Credit journal or appointment details${boundary.dateMentioned ? ` for ${boundary.dateMentioned}` : ""}, prepare what the message asks you to bring, and attend or use the official account if you need to query it.`
    : isDisciplinaryInvitation
      ? `Review the disciplinary invitation and allegations${boundary.dateMentioned ? ` before ${boundary.dateMentioned}` : ""}. Gather the attached evidence and relevant records, and consider suitable independent workplace support.`
      : isPossessionNotice
        ? `Check the possession notice and stated date${boundary.dateMentioned ? ` (${boundary.dateMentioned})` : ""} urgently. Keep the source document and seek independent housing advice; AdminAvenger cannot confirm the notice's legal effect.`
        : boundary.dateMentioned
          ? `Keep the original message and note the date mentioned: ${boundary.dateMentioned}. Review the source wording carefully before deciding what to do next.`
          : "Keep the original message, review the source wording carefully, and decide who should look at it next.";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "important_reply",
    title,
    summary,
    whyItMatters:
      "Some topics need a qualified person, trusted helper, or the original organisation to check the details. AdminAvenger can help keep track of the wording, but it will not decide rights, entitlement, eligibility, debt, housing, employment, or safety issues from this message.",
    suggestedAction,
    estimatedValue: "No money counted",
    urgency: boundary.reason === "safeguarding" || boundary.reason === "housing_or_crisis" ? "high" : "medium",
    deadline: boundary.dateMentioned,
    confidence: "medium",
    status: isUcAppointment || isDisciplinaryInvitation || isPossessionNotice ? "to_do" : "new",
    createdAt: new Date().toISOString(),
  };
};

const createSecurityAlertFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: "Security alert to check",
  summary:
    "This looks like a security alert about a sign-in or account activity. There is no money or payment involved.",
  whyItMatters:
    "Security alerts are worth checking, but they can also be faked. It is safest to check your account directly rather than through links in the message.",
  suggestedAction:
    "If it was not you, use the provider's official app or website (not links in this message) to check activity and change your password. If the message says do not reply, there is no need to reply.",
  urgency: "medium",
  documentStatus: "informational",
  securityPrecedence: true,
  confidence: "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createDeliveryCompletedFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "unknown",
  title: "Delivery completed - no action needed",
  summary:
    "This looks like a delivery that has already been completed. No action is needed unless the item was not actually received.",
  whyItMatters:
    "A completed delivery is a record to keep. It is only worth acting on if the item is missing despite being marked as delivered.",
  suggestedAction:
    "Keep this as a record. If it says the parcel was left in a safe place and you cannot find it, contact the sender or courier.",
  urgency: "low",
  documentStatus: "completed_no_action",
  confidence: "medium",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createAppointmentReminderFinding = (item: AdminItem): AdminFinding => {
  const extraction = extractGeneralAdmin(`${item.title}\n${item.rawText}`);
  const eventDate =
    extraction.dates.find((date) => date.role === "event_date") ?? extraction.dates[0];
  const dateText = eventDate ? ` on ${eventDate.value}` : "";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: "Appointment reminder",
    summary:
      `This looks like a reminder of an upcoming appointment${dateText}. It is a date to note, not a deadline to act on.`,
    whyItMatters:
      "An appointment reminder is useful to add to your calendar. It is not a bill, a deadline, or a booking that needs rearranging.",
    suggestedAction:
      "Add the appointment to your calendar. Only follow the practice's cancellation notice if you cannot attend.",
    urgency: "low",
    documentStatus: "upcoming_reminder",
    confidence: "medium",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createBillReadyDirectDebitFinding = (item: AdminItem): AdminFinding => {
  const extraction = extractGeneralAdmin(`${item.title}\n${item.rawText}`);
  const collected =
    extraction.amounts.find((amount) => amount.role === "amount_collected_automatically") ??
    extraction.amounts[0];
  const collectionDate = extraction.dates.find((date) => date.role === "event_date");
  const amountText = collected ? ` of ${collected.sourceQuote}` : "";
  const dateText = collectionDate ? ` on ${collectionDate.value}` : "";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title: "Bill ready - collected by Direct Debit",
    summary:
      `This looks like a bill notification${amountText}. It appears it will be collected automatically by Direct Debit${dateText}, so no manual payment is needed. It is worth checking the amount and date look right.`,
    whyItMatters:
      "A Direct Debit bill is usually collected automatically. You do not need to make a manual payment unless you want to query the amount or cancel the Direct Debit.",
    suggestedAction:
      "Check the amount and collection date look right. Only act if you want to query the amount or cancel the Direct Debit.",
    estimatedValue: collected
      ? `${collected.sourceQuote} to be collected automatically - not a manual payment`
      : "Amount to be collected automatically - not a manual payment",
    urgency: "low",
    documentStatus: "automatic_no_action",
    confidence: "medium",
    status: "new",
    createdAt: new Date().toISOString(),
  };
};

const createPromisedRefundFinding = (item: AdminItem): AdminFinding => {
  const refund = assessRefundState(`${item.title}\n${item.rawText}`);
  const window = refund.relativePeriod?.value;
  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "refund",
    title: "Refund promised",
    summary: `The provider says it will refund the stated amount${window ? ` ${window}` : ""}. Receipt has not been confirmed.`,
    whyItMatters:
      "A promised refund remains pending until it reaches the original payment method.",
    suggestedAction: window
      ? `Monitor the original payment method for ${window.replace(/^within\s+/i, "")}. Chase through a verified provider channel only if the refund has not arrived after that period.`
      : "Monitor the original payment method and chase through a verified provider channel if the promised refund does not arrive.",
    estimatedValue: refund.amount?.sourceQuote ?? "Pending recovery",
    urgency: "medium",
    documentStatus: "informational",
    confidence: "high",
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
};

const createAccountOutcomeFinding = (item: AdminItem): AdminFinding => {
  const assessment = assessAccountOutcome(`${item.title}\n${item.rawText}`);
  const amountText = assessment.amount?.sourceQuote;
  const title = assessment.closurePending
    ? "Account closure needs a document"
    : assessment.unresolvedFinancialOutcome
      ? "Account closed - balance needs checking"
    : assessment.accountClosed
      ? "Account closure confirmed"
      : "Charge removal confirmed";
  const summaryParts = [
    assessment.accountClosed
      ? "The provider says the account has been closed."
      : undefined,
    assessment.closurePending
      ? "The provider says the account cannot be closed until the stated requirement is completed."
      : undefined,
    assessment.accountRemainsActive
      ? "The provider says the account remains active."
      : undefined,
    assessment.chargesContinue
      ? "The provider says monthly charges will continue until then."
      : undefined,
    assessment.chargeRemoved
      ? `The provider says the${amountText ? ` ${amountText}` : ""} charge has been removed.`
      : undefined,
    assessment.noPaymentRequired
      ? "The provider says no payment is required."
      : undefined,
    assessment.noFurtherBills
      ? "The provider says no further bills should be issued."
      : undefined,
    assessment.noFurtherDirectDebits
      ? "The provider says no further Direct Debits should be issued or collected."
      : undefined,
    assessment.finalDirectDebitPending
      ? "The provider says one final Direct Debit may still be collected."
      : undefined,
    assessment.waiverUnderReview
      ? "The provider says the request to remove the charge is still under review."
      : undefined,
    assessment.waiverUnderReview
      ? "The message does not confirm that the balance is cancelled or payable now."
      : undefined,
    assessment.noDecisionYet
      ? "The provider says no decision has been made yet."
      : undefined,
    assessment.paymentNotRequiredToday
      ? "The provider says payment is not requested today."
      : undefined,
    assessment.futurePaymentPossible
      ? "The provider says the balance may become payable after its review."
      : undefined,
    assessment.providerReviewPending && !assessment.waiverUnderReview
      ? "The provider says its review is pending."
      : undefined,
    assessment.providerWillWriteAgain
      ? "The provider says it will write again with its decision."
      : undefined,
    assessment.requiredDocument
      ? `The provider says the ${assessment.requiredDocument} is required${assessment.actionDeadline ? ` by ${assessment.actionDeadline}` : ""}.`
      : undefined,
    assessment.collectionActivityPossible
      ? "The provider says the balance may be referred for further collection activity."
      : undefined,
    assessment.conditionalFollowUp && assessment.followUpPeriod
      ? `The provider says to follow up if no response arrives ${assessment.followUpPeriod}.`
      : undefined,
    assessment.chargeRemovalDenied
      ? "The provider says the charge has not been removed."
      : undefined,
    assessment.amountStillOwed &&
    !assessment.chargeRemovalDenied &&
    !(assessment.chargeRemoved && assessment.noPaymentRequired)
      ? "The provider says an amount may still be owed."
      : undefined,
  ].filter((part): part is string => Boolean(part));
  const status: AdminFinding["status"] = assessment.balanceStillPayable
    ? "to_do"
    : assessment.closurePending || assessment.requiredDocument
      ? "to_do"
    : assessment.finalDirectDebitPending ||
        assessment.waiverUnderReview ||
        assessment.futurePaymentPossible ||
        assessment.providerReviewPending ||
        assessment.providerWillWriteAgain
      ? "waiting"
      : assessment.responseRequired
        ? "to_do"
      : "resolved";

  return {
    id: `finding-${crypto.randomUUID()}`,
    itemId: item.id,
    category: "unknown",
    title,
    summary: summaryParts.join(" "),
    whyItMatters:
      "This is a provider confirmation to keep and check against the original message. AdminAvenger has not independently verified the account or payment position.",
    suggestedAction: assessment.closurePending || assessment.requiredDocument
      ? `Send the ${assessment.requiredDocument ?? "required document"}${assessment.actionDeadline ? ` by ${assessment.actionDeadline}` : ""} through a verified provider channel, then keep proof and reference${assessment.reference ? ` ${assessment.reference}` : ""}. The account is not yet closed.`
      : assessment.balanceStillPayable
      ? `Keep the closure confirmation and check the provider's stated balance and reference${assessment.reference ? ` ${assessment.reference}` : ""} through a verified channel before deciding what to do.`
      : assessment.waiverUnderReview
        ? `Keep the closure confirmation and wait for the provider's separate charge decision${assessment.reference ? `, keeping reference ${assessment.reference} with the record` : ""}.${assessment.conditionalFollowUp && assessment.followUpPeriod ? ` Follow up through a verified channel if no response arrives ${assessment.followUpPeriod}.` : ""} Do not treat the charge as removed unless the provider confirms that outcome.`
      : assessment.futurePaymentPossible || assessment.providerReviewPending
        ? "Keep the closure confirmation and wait for the provider's promised decision. The balance is not requested today, but do not treat it as waived because the message says it may become payable after review."
      : assessment.finalDirectDebitPending
        ? `Keep the confirmation and check the relevant bank account for the stated final Direct Debit${assessment.reference ? `, keeping reference ${assessment.reference} with the record` : ""}.`
        : assessment.responseRequired
          ? `Keep the closure confirmation and separately check the response the message says is required${assessment.reference ? `, using reference ${assessment.reference}` : ""}. Use a verified provider channel before acting.`
        : `Keep this confirmation with the relevant records and check the relevant bank account. ${
            assessment.conditionalDirectDebitFollowUp
              ? `Contact the provider through a verified channel only if a later Direct Debit is collected${assessment.reference ? `; quote reference ${assessment.reference}` : ""}.`
              : "Only contact the provider if the account outcome does not match what happens next."
          }`,
    estimatedValue: amountText
      ? `${amountText} mentioned by the provider - not counted as saved or recovered`
      : undefined,
    urgency:
      assessment.collectionActivityPossible || assessment.actionDeadline
        ? "high"
        : assessment.balanceStillPayable || assessment.responseRequired || assessment.closurePending
          ? "medium"
        : "low",
    deadline: assessment.actionDeadline,
    documentStatus: assessment.balanceStillPayable || assessment.responseRequired || assessment.closurePending
      ? "pending_manual_action"
      : assessment.finalDirectDebitPending
        ? "informational"
        : "completed_no_action",
    confidence:
      Number(assessment.accountClosed) +
        Number(assessment.chargeRemoved) +
        Number(assessment.noPaymentRequired) +
        Number(assessment.noFurtherBills) >=
      3
        ? "high"
        : "medium",
    status,
    createdAt: new Date().toISOString(),
  };
};

export const analyseAdminItem = (
  item: AdminItem,
  options: AdminAnalysisOptions = {},
): AdminFinding[] => {
  const text = `${item.title} ${item.rawText} ${sourceTypeLabels[item.sourceType]}`.toLowerCase();
  const generalAdminText = `${item.title}\n${item.rawText}`;
  const communicationAssessment = assessCommunicationSignals(item.rawText);
  const accountOutcomeAssessment = assessAccountOutcome(generalAdminText);
  // Direct security signals must be assessed before topical public-scope
  // gating. A scam message can mention debt, employment, housing, or benefits
  // precisely to create pressure; those words must not hide the safer
  // independently-verified-channel result.
  const emailSafetyAssessment = assessEmailSafety(
    `${item.title}\n${item.rawText}`,
    item.sourceType,
  );
  const highRiskEmailFinding = shouldPrioritiseEmailSafety(
    `${item.title}\n${item.rawText}`,
    emailSafetyAssessment,
  )
    ? createEmailSafetyFinding(item, emailSafetyAssessment)
    : undefined;

  if (
    options.accessMode === "public" &&
    !highRiskEmailFinding &&
    !isBroadbandPriceRiseScenario(item) &&
    !accountOutcomeAssessment.isAccountOutcome
  ) {
    const publicScopeBoundary = assessPublicIntakeScope(item);

    if (publicScopeBoundary.status === "blocked") {
      return [createPublicScopeBoundaryFinding(item, publicScopeBoundary)];
    }
  }

  const careerSupportPack = buildCareerSupportPack({
    text: `${item.title}\n${item.rawText}`,
  });
  const careerSupportFinding =
    !highRiskEmailFinding && careerSupportPack.documentType !== "career_unknown"
      ? createCareerSupportFinding(item, careerSupportPack)
      : undefined;

  if (careerSupportFinding) {
    return [careerSupportFinding];
  }

  // Source-grounded, status-aware general-admin reads. These sit above the
  // generic keyword rules (and, for the automatic/completed cases, above the
  // manual specialists) so a completed, automatic, or informational document is
  // never re-framed as a manual action.
  const accountOutcomeFinding =
    !highRiskEmailFinding && accountOutcomeAssessment.isAccountOutcome
      ? createAccountOutcomeFinding(item)
      : undefined;
  const structuredGeneralAdminFallback = extractGeneralAdmin(item.rawText).fallback;
  // A source-grounded document request is more specific than historical broad
  // keyword categories such as "application" or "delay". Keep it below the
  // dedicated security/specialist reads, but above generic keyword fallbacks.
  const structuredDocumentRequestFinding =
    !accountOutcomeFinding &&
    structuredGeneralAdminFallback?.topic === "document_request" &&
    structuredGeneralAdminFallback.requestedDocument
      ? createStructuredGeneralAdminFallbackFinding(item, structuredGeneralAdminFallback)
      : undefined;
  const securityAlertFinding =
    !highRiskEmailFinding && isSecurityAlertText(item.rawText)
      ? createSecurityAlertFinding(item)
      : undefined;
  const deliveryCompletedFinding = isDeliveryCompletedText(text)
    ? createDeliveryCompletedFinding(item)
    : undefined;
  const billReadyDirectDebitFinding = isBillReadyDirectDebitText(generalAdminText)
    ? createBillReadyDirectDebitFinding(item)
    : undefined;
  const appointmentReminderFinding =
    isAppointmentReminderText(item.rawText) && !isAppointmentTask(text)
      ? createAppointmentReminderFinding(item)
      : undefined;

  const refundState = assessRefundState(generalAdminText);
  const promisedRefundFinding =
    !highRiskEmailFinding && refundState.stage === "promised"
      ? createPromisedRefundFinding(item)
      : undefined;
  // isApprovedRefund is a keyword read with no sense of negation, so "No refund
  // has been approved for £68.40." satisfied it and the result was titled "Refund
  // approved". The shared refund state is negation-aware, so it decides whether
  // there is an approval to describe at all; the keyword read still decides
  // whether this is the right kind of refund finding.
  const approvedRefundFinding =
    !promisedRefundFinding &&
    isApprovedRefund(text) &&
    REFUND_SUCCESS_STAGES.has(refundState.stage)
      ? createApprovedRefundFinding(item)
      : undefined;
  const travelRecoveryFinding = isTravelDisruptionRecoveryText(`${item.title}\n${item.rawText}`)
    ? createTravelRecoveryFinding(item)
    : undefined;
  const travelEvidenceCheckFinding =
    !promisedRefundFinding &&
    !approvedRefundFinding &&
    !travelRecoveryFinding &&
    isTravelEvidenceCheckText(`${item.title}\n${item.rawText}`)
      ? createTravelEvidenceCheckFinding(item)
      : undefined;
  const subscriptionFinding = isRecurringSubscription(text) ? createSubscriptionFinding(item) : undefined;
  const energyPriceChangeFinding = isEnergyPriceChangeText(`${item.title}\n${item.rawText}`)
    ? createEnergyPriceChangeFinding(item)
    : undefined;
  const noActionFinding =
    !accountOutcomeFinding && isNoActionRecord(text)
      ? createUnknownFinding(item)
      : undefined;
  const paymentReminderAssessment = assessPaymentReminder(item);
  const paymentReminderFinding =
    !promisedRefundFinding &&
    !approvedRefundFinding &&
    !subscriptionFinding &&
    !noActionFinding &&
    !billReadyDirectDebitFinding &&
    paymentReminderAssessment.isPaymentReminder
      ? createPaymentReminderFinding(item)
      : undefined;
  const receiptFinding =
    !paymentReminderFinding &&
    !noActionFinding &&
    !travelRecoveryFinding &&
    !subscriptionFinding &&
    isReceiptRecord(text)
      ? createReceiptFinding(item)
      : undefined;
  const deliveryIssueFinding =
    !deliveryCompletedFinding && isDeliveryProblem(text)
      ? createDeliveryIssueFinding(item, text)
      : undefined;
  const deliveryUpdateFinding =
    !deliveryCompletedFinding && !deliveryIssueFinding && isDeliveryUpdate(text)
      ? createDeliveryUpdateFinding(item)
      : undefined;
  const appointmentTaskFinding = isAppointmentTask(text)
    ? createAppointmentTaskFinding(item)
    : undefined;
  const broadbandPriceRiseAssessment = assessBroadbandPriceRise(item);
  const hasProviderWording = broadbandPriceRiseAssessment.rightsConfirmed.length > 0;
  const broadbandPriceRiseFinding: AdminFinding | undefined = isBroadbandPriceRiseScenario(item)
    ? {
        id: `finding-${crypto.randomUUID()}`,
        itemId: item.id,
        category: "bill_increase",
        title:
          broadbandPriceRiseAssessment.serviceType === "mobile"
            ? "Mobile tariff increase review"
            : broadbandPriceRiseAssessment.serviceType === "broadband"
              ? "Broadband price-rise review"
              : "Broadband/mobile price-rise challenge",
        summary:
          hasProviderWording
            ? "This looks like a broadband or mobile price-rise notice. AdminAvenger found pricing evidence and provider wording about leaving without an early termination charge, but this still needs checking with the provider before acting."
            : "This looks like a broadband or mobile price-rise notice. AdminAvenger found pricing or tariff evidence, but provider terms and switching or cancellation rights still need checking.",
        whyItMatters:
          "Broadband and mobile increases can add up over a year, and a clear challenge may unlock a better deal, package switch, or cancellation route.",
        suggestedAction:
          hasProviderWording
            ? `Check the provider wording and contact the provider${
                broadbandPriceRiseAssessment.responseDeadline
                  ? ` before ${broadbandPriceRiseAssessment.responseDeadline}`
                  : ""
              } to confirm your account-specific options before acting.`
            : "Check the provider terms and whether cancellation or switching rights apply, then contact the provider to negotiate, switch plan, or challenge the increase.",
        estimatedValue: broadbandPriceRiseAssessment.annualIncrease
          ? `${broadbandPriceRiseAssessment.annualIncrease}/year if unchanged`
          : "Potential cost increase",
        urgency: broadbandPriceRiseAssessment.effectiveDate ? "high" : "medium",
        confidence: mapBroadbandActionConfidence(broadbandPriceRiseAssessment.actionConfidence),
        status: "new",
        createdAt: new Date().toISOString(),
      }
    : undefined;
  const delayRepayAssessment = assessUkTrainDelayRefund(item);
  const trainDelayFinding: AdminFinding | undefined = delayRepayAssessment.isTrainDelayScenario
    ? {
        id: `finding-${crypto.randomUUID()}`,
        itemId: item.id,
        category: "refund",
        title: "UK train delay refund check",
        summary:
          "This looks like a UK train delay refund situation. AdminAvenger found train-delay evidence, but it will not claim eligibility until missing details and the operator's current rules are checked.",
        whyItMatters:
          "Delay Repay claims can be time-sensitive, and missing ticket or journey evidence can stop a claim from being accepted.",
        suggestedAction: delayRepayAssessment.recommendedNextStep,
        estimatedValue: "Possible Delay Repay compensation",
        urgency: delayRepayAssessment.evidenceMissing.length > 0 ? "medium" : "high",
        confidence:
          delayRepayAssessment.confidenceScore >= 80
            ? "high"
            : delayRepayAssessment.confidenceScore >= 55
              ? "medium"
              : "low",
        status: "new",
        createdAt: new Date().toISOString(),
      }
    : undefined;

  // Decision Engine only ever runs after every other dedicated flow above has had a
  // chance to claim the message. This keeps refund/subscription/energy/safety/travel/
  // broadband/train-delay flows fully in charge wherever they already work well, and
  // lets Decision Engine catch parking/debt/bailiff/TV Licence/bank/consumer dispute
  // style messages that nothing else here already handles better.
  const decisionEngineFinding =
    !highRiskEmailFinding &&
    !securityAlertFinding &&
    !deliveryCompletedFinding &&
    !billReadyDirectDebitFinding &&
    !appointmentReminderFinding &&
    !promisedRefundFinding &&
    !approvedRefundFinding &&
    !travelRecoveryFinding &&
    !travelEvidenceCheckFinding &&
    !subscriptionFinding &&
    !energyPriceChangeFinding &&
    !noActionFinding &&
    !paymentReminderFinding &&
    !receiptFinding &&
    !deliveryIssueFinding &&
    !deliveryUpdateFinding &&
    !appointmentTaskFinding &&
    !broadbandPriceRiseFinding &&
    !trainDelayFinding &&
    !structuredDocumentRequestFinding &&
    structuredGeneralAdminFallback?.status !== "no_action_needed" &&
    !(accountOutcomeFinding &&
      !accountOutcomeAssessment.unresolvedFinancialOutcome &&
      !accountOutcomeAssessment.closurePending) &&
    isDecisionEngineDocument(item.rawText)
      ? createDecisionEngineFinding(item, item.rawText)
      : undefined;
  const communicationFinding =
    !highRiskEmailFinding &&
    !securityAlertFinding &&
    !deliveryCompletedFinding &&
    !billReadyDirectDebitFinding &&
    !appointmentReminderFinding &&
    !promisedRefundFinding &&
    !approvedRefundFinding &&
    !travelRecoveryFinding &&
    !travelEvidenceCheckFinding &&
    !subscriptionFinding &&
    !energyPriceChangeFinding &&
    !noActionFinding &&
    !paymentReminderFinding &&
    !receiptFinding &&
    !deliveryIssueFinding &&
    !deliveryUpdateFinding &&
    !appointmentTaskFinding &&
    !broadbandPriceRiseFinding &&
    !trainDelayFinding &&
    !structuredDocumentRequestFinding &&
    !accountOutcomeFinding &&
    !decisionEngineFinding &&
    communicationAssessment.signals.length > 0
      ? createCommunicationFinding(item, communicationAssessment)
      : undefined;

  const findings = categoryRules
    .filter((rule) => {
      if (
        noActionFinding ||
        receiptFinding ||
        subscriptionFinding ||
        energyPriceChangeFinding ||
        travelRecoveryFinding ||
        travelEvidenceCheckFinding ||
        paymentReminderFinding ||
        appointmentTaskFinding ||
        securityAlertFinding ||
        deliveryCompletedFinding ||
        billReadyDirectDebitFinding ||
        appointmentReminderFinding ||
        structuredDocumentRequestFinding
      ) {
        return false;
      }

      // Communication meaning is decided once by the shared source-grounded
      // assessment. The historical keyword rule conflated Important, urgent,
      // reply and action wording, so it is no longer a second authority.
      if (rule.category === "important_reply") {
        return false;
      }

      if (
        rule.category === "complaint" &&
        communicationAssessment.negations.some(
          (negation) => negation.target === "reply_request",
        ) &&
        !containsAny(
          text,
          [...rule.strongKeywords, ...rule.weakKeywords].filter(
            (keyword) => keyword !== "no response",
          ),
        )
      ) {
        return false;
      }

      if (promisedRefundFinding || approvedRefundFinding) {
        return false;
      }

      if (deliveryIssueFinding || deliveryUpdateFinding) {
        return false;
      }

      if (decisionEngineFinding) {
        return false;
      }

      if (
        highRiskEmailFinding &&
        rule.category === "deadline"
      ) {
        return false;
      }

      if (trainDelayFinding && rule.category === "refund") {
        return false;
      }

      if (
        (broadbandPriceRiseFinding || energyPriceChangeFinding) &&
        (rule.category === "bill_increase" || rule.category === "subscription" || rule.category === "deadline")
      ) {
        return false;
      }

      return containsAny(text, rule.strongKeywords) || containsAny(text, rule.weakKeywords);
    })
    .map((rule) => createFinding(item, rule, text));
  const priorityFindings = [
    highRiskEmailFinding,
    securityAlertFinding,
    promisedRefundFinding,
    approvedRefundFinding,
    travelRecoveryFinding,
    travelEvidenceCheckFinding,
    subscriptionFinding,
    energyPriceChangeFinding,
    billReadyDirectDebitFinding,
    noActionFinding,
    paymentReminderFinding,
    receiptFinding,
    deliveryCompletedFinding,
    deliveryUpdateFinding,
    deliveryIssueFinding,
    appointmentReminderFinding,
    appointmentTaskFinding,
    broadbandPriceRiseFinding,
    trainDelayFinding,
    structuredDocumentRequestFinding,
    communicationFinding,
    decisionEngineFinding,
  ].filter((finding): finding is AdminFinding => Boolean(finding));
  const allFindings = [
    ...priorityFindings,
    ...findings,
    ...(accountOutcomeFinding ? [accountOutcomeFinding] : []),
  ];
  const strongerFindings = allFindings.filter((finding) => finding !== noActionFinding);

  if (strongerFindings.length > 0) {
    return strongerFindings;
  }

  if (structuredGeneralAdminFallback) {
    return [createStructuredGeneralAdminFallbackFinding(item, structuredGeneralAdminFallback)];
  }

  return noActionFinding ? [noActionFinding] : [createUnknownFinding(item)];
};
