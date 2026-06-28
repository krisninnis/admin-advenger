import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  MoneyImpact,
  MoneyImpactFrequency,
  OpportunityCard,
  OpportunityType,
} from "../types";

const pound = String.fromCharCode(163);
const moneyPattern = /(?:GBP\s*|\u00a3\s*|\?\s*)?(\d+(?:\.\d{1,2})?)/i;
const currencyMoneyPattern = /(?:GBP\s*|\u00a3\s*|Â£\s*|\?\s*)(\d+(?:\.\d{1,2})?)/i;
const refundWindowPattern =
  /(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i;
const refundReferencePattern = /(?:reference|ref)\s*:?\s*([A-Z]{1,5}\d{3,}[A-Z0-9-]*)/i;

const toAmount = (value?: string) => {
  const match = value?.match(moneyPattern);
  return match ? Number(match[1]) : undefined;
};

const findFirstAmount = (text = "") => toAmount(text.match(currencyMoneyPattern)?.[0]);

const moneyImpact = (
  label: string,
  amount: number | undefined,
  frequency: MoneyImpactFrequency,
  status: MoneyImpact["status"],
): MoneyImpact => ({
  amount,
  currency: amount === undefined ? "unknown" : "GBP",
  frequency,
  label,
  status,
});

export const formatMoneyImpact = (impact?: MoneyImpact) => {
  if (!impact) {
    return "No money impact recorded";
  }

  const amount = impact.amount === undefined ? "Amount not found" : `${pound}${impact.amount.toFixed(impact.amount % 1 === 0 ? 0 : 2)}`;
  const frequency =
    impact.frequency === "monthly"
      ? "/month"
      : impact.frequency === "annual"
        ? "/year"
        : "";

  return `${impact.label}: ${amount}${frequency}`;
};

const getRiskLevel = (adminCase: AdminCase): OpportunityCard["riskLevel"] => {
  if (adminCase.urgency === "high") {
    return "high";
  }

  if (adminCase.status === "waiting" || adminCase.status === "chasing") {
    return "medium";
  }

  return "low";
};

const getOpportunityType = (adminCase: AdminCase, item?: AdminItem): OpportunityType => {
  const text = `${item?.title ?? ""} ${item?.rawText ?? ""}`.toLowerCase();

  if (adminCase.broadbandPriceRiseAssessment) {
    return "bill_or_price_increase";
  }

  if (/proof of purchase found/i.test(adminCase.title)) {
    return "receipt_guardian";
  }

  if (/delivery update|no action needed/i.test(adminCase.title)) {
    return "delivery_update";
  }

  if (/parcel|delivery|courier|tracking/.test(text) && /not arrived|missing|failed|damaged|not received/.test(text)) {
    return "delivery_issue";
  }

  if (/receipt|order confirmation|proof of purchase|retailer:|order number/.test(text)) {
    return "receipt_guardian";
  }

  if (/no obvious saving or action found/i.test(adminCase.title)) {
    return "no_action_needed";
  }

  if (adminCase.category === "refund" || /^refund approved$/i.test(adminCase.title)) {
    return "money_back";
  }

  if (adminCase.category === "subscription") {
    return "subscription_renewal";
  }

  if (adminCase.category === "warranty") {
    return "warranty_or_fault";
  }

  if (adminCase.category === "deadline" || adminCase.category === "important_reply") {
    return "deadline";
  }

  if (adminCase.category === "unknown") {
    return "needs_human_check";
  }

  return "unknown";
};

const getEvidenceValue = (adminCase: AdminCase, labelPattern: RegExp) =>
  adminCase.evidence.find((evidence) => labelPattern.test(evidence.label))?.value;

const getRefundEvidence = (adminCase: AdminCase, item?: AdminItem) => {
  const text = `${item?.title ?? ""}\n${item?.rawText ?? ""}`;
  const amount = findFirstAmount(text);
  const formattedAmount = amount === undefined ? undefined : `${pound}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
  const refundWindow =
    getEvidenceValue(adminCase, /refund window|expected refund window/i) ??
    text.match(refundWindowPattern)?.[0];
  const reference =
    getEvidenceValue(adminCase, /^reference$/i) ??
    text.match(refundReferencePattern)?.[1];

  return {
    amount,
    formattedAmount,
    refundWindow,
    reference,
  };
};

const getReceiptEvidence = (item?: AdminItem) => {
  const text = `${item?.title ?? ""}\n${item?.rawText ?? ""}`;
  const amount = findFirstAmount(text);
  const retailer = text.match(/retailer:\s*([^\n.]+)/i)?.[1]?.trim();
  const reference = text.match(/(?:order number|reference)\s*:?\s*([A-Z0-9-]+)/i)?.[1]?.trim();

  return {
    amount,
    retailer,
    evidence: [
      amount !== undefined ? `Paid: ${pound}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}` : undefined,
      retailer ? `Retailer: ${retailer}` : undefined,
      reference ? `Reference: ${reference}` : undefined,
    ].filter((item): item is string => Boolean(item)),
  };
};

export const deriveOpportunityCard = (
  adminCase: AdminCase,
  item?: AdminItem,
  finding?: AdminFinding,
): OpportunityCard => {
  const opportunityType = getOpportunityType(adminCase, item);
  const text = `${item?.title ?? ""}\n${item?.rawText ?? ""}`;
  const createdAt = adminCase.createdAt;
  const updatedAt = adminCase.updatedAt;
  const baseEvidence = adminCase.evidence.slice(0, 6).map((evidence) => `${evidence.label}: ${evidence.value}`);
  const missingEvidence = adminCase.evidence
    .filter((evidence) => /missing|needed|not found/i.test(`${evidence.label} ${evidence.value}`))
    .map((evidence) => `${evidence.label}: ${evidence.value}`);

  if (adminCase.broadbandPriceRiseAssessment) {
    const assessment = adminCase.broadbandPriceRiseAssessment;
    const monthlyAmount = toAmount(assessment.monthlyIncrease);
    const annualAmount = toAmount(assessment.annualIncrease);
    const deadline = assessment.responseDeadline ?? assessment.effectiveDate ?? adminCase.chaseDate;

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Your bill looks like it is going up",
      plainEnglishSummary: assessment.providerWordingFound?.length
        ? `Provider wording found: the message appears to mention leaving without an early termination charge${assessment.responseDeadline ? ` before ${assessment.responseDeadline}` : ""}. AdminAvenger has not decided your rights.`
        : adminCase.summary,
      moneyAtStake: moneyImpact("Cost increase found", monthlyAmount, "monthly", "potential"),
      annualisedAmount: moneyImpact("Annual impact if unchanged", annualAmount, "annual", "potential"),
      deadline,
      deadlineLabel: assessment.responseDeadline ? "Contact-before deadline" : "Price rise takes effect",
      providerOrRetailer: assessment.providerName,
      opportunityNote:
        "You may be able to reduce, switch, cancel, or negotiate before the increase, depending on provider terms and contract details.",
      statusLabel: "Potential saving opportunity — not confirmed yet",
      evidenceFound: [
        assessment.oldMonthlyPrice ? `Old price: ${assessment.oldMonthlyPrice}` : undefined,
        assessment.newMonthlyPrice ? `New price: ${assessment.newMonthlyPrice}` : undefined,
        assessment.effectiveDate ? `Effective date: ${assessment.effectiveDate}` : undefined,
        ...(assessment.providerWordingFound ?? []),
      ].filter((item): item is string => Boolean(item)),
      missingInformation: assessment.evidenceMissing,
      nextBestAction: adminCase.nextAction,
      recommendedPathSteps: [
        "Check provider name and account details.",
        "Check contract start or renewal date.",
        "Ask what options are available before acting.",
        "Only mark savings confirmed if you actually reduce the bill or avoid the rise.",
      ],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "receipt_guardian") {
    const receipt = getReceiptEvidence(item);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Proof of purchase found",
      plainEnglishSummary:
        "This looks useful as evidence for a return, warranty, refund, or complaint later. It is not a saving by itself.",
      moneyAtStake: moneyImpact("Receipt value", receipt.amount, "one_off", "unknown"),
      providerOrRetailer: receipt.retailer,
      evidenceFound: receipt.evidence.length > 0 ? receipt.evidence : baseEvidence,
      missingInformation: receipt.evidence.length > 0 ? [] : ["Retailer, amount, or order reference may need checking"],
      nextBestAction: "Save this proof and open a case later if the item is faulty, missing, or needs returning.",
      recommendedPathSteps: ["Keep the order reference.", "Keep proof of payment.", "Attach photos if the item later becomes faulty."],
      riskLevel: "low",
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "delivery_update") {
    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Delivery update - no action needed yet",
      plainEnglishSummary: "No obvious action is required unless the parcel does not arrive.",
      evidenceFound: baseEvidence,
      missingInformation: [],
      nextBestAction: adminCase.nextAction,
      recommendedPathSteps: ["Keep the tracking details.", "Only contact the sender or courier if the parcel does not arrive."],
      riskLevel: "low",
      confidenceLabel: "medium",
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "no_action_needed") {
    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "No obvious saving or action found",
      plainEnglishSummary:
        "AdminAvenger checked this for refunds, price rises, renewal charges, deadlines, complaint opportunities, and useful evidence. It did not find anything that clearly needs action right now.",
      evidenceFound: baseEvidence,
      missingInformation: [],
      nextBestAction: "You can keep this as a record, delete it, or try another document.",
      recommendedPathSteps: [
        "Keep it only if you want a record.",
        "Delete it if it is not useful.",
        "Try another document if you expected a refund, deadline, renewal, or complaint issue.",
      ],
      riskLevel: "low",
      confidenceLabel: "low",
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "delivery_issue") {
    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Delivery issue to chase",
      plainEnglishSummary: "This looks like a delivery issue that may need a response or missing parcel follow-up.",
      deadline: adminCase.chaseDate,
      deadlineLabel: "Suggested chase/action date",
      evidenceFound: baseEvidence,
      missingInformation: missingEvidence,
      nextBestAction: adminCase.nextAction,
      recommendedPathSteps: ["Keep tracking evidence.", "Contact the sender or courier within the stated window.", "Do not invent a money amount unless one is stated."],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  const amount = findFirstAmount(text);
  const isRefund = opportunityType === "money_back";
  const isSubscription = opportunityType === "subscription_renewal";
  const isWarranty = opportunityType === "warranty_or_fault";

  if (isRefund && /^refund approved$/i.test(adminCase.title)) {
    const refund = getRefundEvidence(adminCase, item);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Refund approved",
      plainEnglishSummary:
        "A refund has been approved and should be returned to the original payment method.",
      potentialRecovery: moneyImpact("Pending recovery", refund.amount, "one_off", "pending"),
      deadline: adminCase.chaseDate,
      deadlineLabel: "Suggested chase date",
      statusLabel: "Pending recovery - not confirmed yet",
      evidenceFound: [
        refund.formattedAmount ? `Refund amount: ${refund.formattedAmount}` : undefined,
        refund.refundWindow ? `Refund window: ${refund.refundWindow}` : undefined,
        refund.reference ? `Reference: ${refund.reference}` : undefined,
      ].filter((item): item is string => Boolean(item)),
      missingInformation: [
        "Provider/retailer name if not found",
        "Payment method details if not found",
        "Exact refund arrival date if not found",
      ],
      nextBestAction:
        "Check your original payment method. Chase the provider if the refund has not arrived after 10 working days.",
      recommendedPathSteps: [
        "Check the original payment method.",
        "Keep the refund reference.",
        "Chase only if the refund has not arrived after the expected window.",
        "Only mark recovered when you can see the money has arrived.",
      ],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  return {
    id: `opportunity-${adminCase.id}`,
    caseId: adminCase.id,
    opportunityType,
    title: isRefund
      ? "Money back to chase"
      : isSubscription
        ? "Subscription renewal to review"
        : isWarranty
          ? "Warranty or faulty goods issue"
          : adminCase.title,
    plainEnglishSummary: adminCase.summary,
    potentialRecovery: isRefund ? moneyImpact("Pending recovery", amount, "one_off", "pending") : undefined,
    potentialSaving: isSubscription ? moneyImpact("Potential saving opportunity", amount, "one_off", "potential") : undefined,
    moneyAtStake: amount !== undefined ? moneyImpact("Money mentioned", amount, "one_off", "potential") : undefined,
    deadline: finding?.deadline ?? adminCase.chaseDate,
    deadlineLabel: isRefund ? "Chase if not received by" : "Deadline or chase date",
    evidenceFound: baseEvidence,
    missingInformation: missingEvidence,
    nextBestAction: adminCase.nextAction,
    recommendedPathSteps: [
      "Check the evidence before acting.",
      "Generate or edit the draft message if useful.",
      "Update the outcome only after the result is confirmed by you.",
    ],
    riskLevel: getRiskLevel(adminCase),
    confidenceLabel: adminCase.confidence,
    sourceCaseType: adminCase.category,
    createdAt,
    updatedAt,
  };
};
