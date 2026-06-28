import type {
  AdminFinding,
  AdminItem,
  FindingCategory,
  FindingConfidence,
  FindingUrgency,
  SourceType,
} from "../types";
import { assessBroadbandPriceRise, isBroadbandPriceRiseScenario } from "./broadbandPriceRiseAssessment";
import { assessUkTrainDelayRefund } from "./delayRepayAssessment";

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
    strongKeywords: ["refund", "compensation", "failed delivery", "cancelled"],
    weakKeywords: ["delayed", "delay", "returned", "missing order", "not delivered"],
    summary: "This item suggests you may be owed money, compensation, or a service credit.",
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

const currencyAmountPattern = /(?:\u00a3|Â£|GBP\s*|\?\s*)\d+(?:\.\d{1,2})?/i;

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
  (/refund\s+of\s+(?:\u00a3|Â£|GBP\s*|\?\s*)\d+(?:\.\d{1,2})?/i.test(text) &&
    /approved|issued|processed|returned|will be returned/i.test(text));

const recurringBillingSignals = [
  "/month",
  "per month",
  "monthly",
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
  if (strongMatches.length > 0) {
    return "high";
  }

  if (weakMatches.length > 0) {
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

const createApprovedRefundFinding = (item: AdminItem): AdminFinding => ({
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
  estimatedValue: `${item.title} ${item.rawText}`.match(currencyAmountPattern)?.[0] ?? "Pending recovery",
  urgency: "medium",
  confidence: "high",
  status: "new",
  createdAt: new Date().toISOString(),
});

const createSubscriptionFinding = (item: AdminItem): AdminFinding => ({
  id: `finding-${crypto.randomUUID()}`,
  itemId: item.id,
  category: "subscription",
  title: "Subscription renewal to review",
  summary:
    "This looks like an auto-renewing or recurring subscription payment that may keep charging until cancelled.",
  whyItMatters:
    "Recurring subscriptions can become ongoing costs if you no longer use them.",
  suggestedAction:
    "Check whether you still use this subscription and review how to cancel before the next charge if not.",
  estimatedValue: "Potential recurring cost",
  urgency: "medium",
  confidence: "high",
  status: "new",
  createdAt: new Date().toISOString(),
});

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

export const analyseAdminItem = (item: AdminItem): AdminFinding[] => {
  const text = `${item.title} ${item.rawText} ${sourceTypeLabels[item.sourceType]}`.toLowerCase();
  const approvedRefundFinding = isApprovedRefund(text) ? createApprovedRefundFinding(item) : undefined;
  const subscriptionFinding = isRecurringSubscription(text) ? createSubscriptionFinding(item) : undefined;
  const noActionFinding = isNoActionRecord(text) ? createUnknownFinding(item) : undefined;
  const receiptFinding =
    !noActionFinding && !subscriptionFinding && isReceiptRecord(text) ? createReceiptFinding(item) : undefined;
  const deliveryIssueFinding = isDeliveryProblem(text)
    ? createDeliveryIssueFinding(item, text)
    : undefined;
  const deliveryUpdateFinding =
    !deliveryIssueFinding && isDeliveryUpdate(text) ? createDeliveryUpdateFinding(item) : undefined;
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

  const findings = categoryRules
    .filter((rule) => {
      if (noActionFinding || receiptFinding || subscriptionFinding) {
        return false;
      }

      if (approvedRefundFinding) {
        return false;
      }

      if (deliveryIssueFinding || deliveryUpdateFinding) {
        return false;
      }

      if (trainDelayFinding && rule.category === "refund") {
        return false;
      }

      if (broadbandPriceRiseFinding && (rule.category === "bill_increase" || rule.category === "subscription")) {
        return false;
      }

      return containsAny(text, rule.strongKeywords) || containsAny(text, rule.weakKeywords);
    })
    .map((rule) => createFinding(item, rule, text));
  const priorityFindings = [
    approvedRefundFinding,
    subscriptionFinding,
    noActionFinding,
    receiptFinding,
    deliveryUpdateFinding,
    deliveryIssueFinding,
    broadbandPriceRiseFinding,
    trainDelayFinding,
  ].filter((finding): finding is AdminFinding => Boolean(finding));
  const allFindings = [...priorityFindings, ...findings];

  return allFindings.length > 0 ? allFindings : [createUnknownFinding(item)];
};
