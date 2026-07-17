import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  MoneyImpact,
  MoneyImpactFrequency,
  OpportunityCard,
  OpportunityType,
} from "../types";
import { buildCareerSupportPack } from "./careerSupportPack";
import {
  annualiseMonthlyAmount,
  extractEnergyAnnualCosts,
  extractMonthlyAmount,
  extractRecoverableAmount,
  extractReferenceNumber,
  extractRefundWindow,
  extractTotalCostMention,
  extractTravelRecoveryDetails,
  formatCurrency,
  isEnergyPriceChangeText,
  isTravelDisruptionRecoveryText,
  isTravelEvidenceCheckText,
  parseMoneyAmount,
} from "./moneyParsers";
import {
  assessEmailSafety,
  getEmailSafetyRiskBand,
  getEmailSafetyRiskBandExplanation,
  getEmailSafetyRiskBandLabel,
} from "./suspiciousEmail";

const pound = String.fromCharCode(163);
const moneyPattern = /(?:GBP\s*|\u00a3\s*|\?\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const currencyMoneyPattern = /(?:GBP\s*|\u00a3\s*|Â£\s*|\?\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
const refundWindowPattern =
  /(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i;
const refundReferencePattern = /(?:reference|ref)\s*:?\s*([A-Z]{1,5}\d{3,}[A-Z0-9-]*)/i;
const recurringSubscriptionPattern =
  /\/month|auto-renewing|auto renewing|subscription|until cancelled|until canceled|charged automatically|renews|recurring|learn how to cancel/i;

const toAmount = (value?: string) => {
  const match = value?.match(moneyPattern);
  return match ? parseMoneyAmount(match[1]) : undefined;
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

  const amount = impact.amount === undefined ? "Amount not found" : formatCurrency(impact.amount);
  const frequency =
    impact.frequency === "monthly"
      ? "/month"
      : impact.frequency === "annual"
        ? "/year"
        : "";

  return `${impact.label}: ${amount}${frequency}`;
};

// Translates a raw low/medium/high confidence level into a short plain-English
// phrase for display. The raw word itself must never reach the user
// (decision-engine-standard.md Section 7) - this is the single place that
// phrasing lives so every surface (Check a message, Cases, Inbox Scan) stays
// consistent.
export const describeConfidence = (level: "low" | "medium" | "high"): string => {
  switch (level) {
    case "high":
      return "Clear match";
    case "medium":
      return "Reasonable match - worth checking";
    case "low":
    default:
      return "Rough guess - check carefully";
  }
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

  if (
    adminCase.emailSafetyAssessment ||
    /email safety|email needs safety check|risk email|high risk email|high risk signals/i.test(adminCase.title)
  ) {
    return "suspicious_email_risk";
  }

  if (adminCase.broadbandPriceRiseAssessment) {
    return "bill_or_price_increase";
  }

  if (adminCase.decisionResult) {
    return "admin_dispute_check";
  }

  if (
    adminCase.careerSupportPack ||
    /cv preparation|career support|cover letter|job advert preparation|application answer/i.test(adminCase.title)
  ) {
    return "career_support";
  }

  if (
    adminCase.category === "bill_increase" &&
    (/energy prices are changing/i.test(adminCase.title) || isEnergyPriceChangeText(text))
  ) {
    return "energy_price_change";
  }

  if (/travel evidence check/i.test(adminCase.title) || isTravelEvidenceCheckText(text)) {
    return "travel_evidence_check";
  }

  if (/travel recovery|possible money recovery found/i.test(adminCase.title) || isTravelDisruptionRecoveryText(text)) {
    return "travel_extra_cost_recovery";
  }

  if (adminCase.category === "subscription" || recurringSubscriptionPattern.test(text)) {
    return recurringSubscriptionPattern.test(text)
      ? "subscription_recurring_charge"
      : "subscription_renewal";
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
    return /^refund approved$/i.test(adminCase.title) ? "refund_expected" : "money_back";
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
  const formattedAmount = amount === undefined ? undefined : formatCurrency(amount);
  const refundWindow =
    getEvidenceValue(adminCase, /refund window|expected refund window/i) ??
    extractRefundWindow(text) ??
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
      amount !== undefined ? `Paid: ${formatCurrency(amount)}` : undefined,
      retailer ? `Retailer: ${retailer}` : undefined,
      reference ? `Reference: ${reference}` : undefined,
    ].filter((item): item is string => Boolean(item)),
  };
};

const getSubscriptionEvidence = (adminCase: AdminCase, item?: AdminItem) => {
  const text = `${item?.title ?? ""}\n${item?.rawText ?? ""}`;
  const monthlyAmount = extractMonthlyAmount(text);
  const annualAmount = annualiseMonthlyAmount(monthlyAmount);
  const autoRenewStatus =
    getEvidenceValue(adminCase, /renewal\/auto-renew status/i) ??
    text.match(/auto-renewing|auto renewing|charged automatically until cancelled|charged automatically until canceled|until cancelled|until canceled|renews|recurring/i)?.[0];
  const cancellationClue =
    getEvidenceValue(adminCase, /cancellation clue/i) ??
    text.match(/learn how to cancel|cancel(?:led|ed|lation)?/i)?.[0];

  return {
    monthlyAmount,
    annualAmount,
    autoRenewStatus,
    cancellationClue,
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

  if (adminCase.decisionResult) {
    const decision = adminCase.decisionResult;
    const amountLabel =
      decision.amountTreatment === "amount_being_demanded"
        ? "Amount being demanded"
        : decision.amountTreatment === "amount_mentioned_only"
          ? "Amount mentioned"
          : decision.amountTreatment === "possible_refund_or_reduction"
            ? "Possible reduction (not confirmed)"
            : undefined;
    const decisionAmount = decision.amountMentioned ? toAmount(decision.amountMentioned) : undefined;

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: decision.title,
      // Confidence is folded into the summary in plain language, never as the raw
      // "high"/"medium"/"low" word or a percentage (decision-engine-standard.md
      // Section 7) - `confidence.reason` is already written in plain English by
      // the module itself.
      plainEnglishSummary: `${decision.plainEnglishSummary} ${decision.whatThisLooksLike} ${decision.confidence.reason}`.trim(),
      // Amounts here are only ever "amount being demanded"/"amount mentioned"/
      // "possible reduction" - never a confirmed saving or pending recovery.
      // Status "unknown" keeps that safe framing.
      moneyAtStake:
        amountLabel && decisionAmount !== undefined
          ? moneyImpact(amountLabel, decisionAmount, "one_off", "unknown")
          : undefined,
      opportunityNote: decision.safetyNotes[0],
      statusLabel: decision.strengthLabel,
      evidenceFound: [
        ...decision.sourceFacts.map((fact) => `${fact.label}: ${fact.value}`),
        ...decision.possibleGrounds,
      ],
      // Fold "Questions to answer" and "What could change this" (uncertainty +
      // cannotKnow) into the missing-information list (What to have ready)
      // rather than adding a new UI section - this stays behind the single
      // Check a message result card (decision-engine-standard.md Section 7
      // explicitly allows combining uncertainty + cannotKnow for readability).
      missingInformation: [
        ...decision.evidenceNeeded,
        ...decision.deadlines,
        ...(decision.questionsToAnswer ?? []),
        ...decision.uncertainty,
        ...decision.cannotKnow,
      ],
      nextBestAction:
        decision.nextSteps[0] ?? "Gather the evidence and check the deadline before acting.",
      recommendedPathSteps: decision.nextSteps,
      riskLevel: decision.caseStrength === "urgent_get_advice" ? "high" : getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "suspicious_email_risk") {
    const suspicious = adminCase.emailSafetyAssessment ?? assessEmailSafety(text);
    const riskBand = getEmailSafetyRiskBand(suspicious);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Email needs safety check",
      plainEnglishSummary: `${getEmailSafetyRiskBandLabel(suspicious)}. ${getEmailSafetyRiskBandExplanation(suspicious)}`,
      opportunityNote:
        "AdminAvenger does not count this as a saving or recovery. It is a detected-signal warning so you can verify before acting.",
      statusLabel: getEmailSafetyRiskBandLabel(suspicious),
      evidenceFound: [
        ...suspicious.riskSignals,
        ...suspicious.cautionSignals,
        suspicious.senderAddress ? `Sender: ${suspicious.senderAddress}` : undefined,
        suspicious.replyToAddress ? `Reply-to: ${suspicious.replyToAddress}` : undefined,
      ].filter((entry): entry is string => Boolean(entry)),
      missingInformation: [
        ...(suspicious.cannotKnow ?? []),
        "Whether you were expecting this message",
        "Whether the sender address matches an independently checked contact route",
      ],
      nextBestAction: suspicious.nextAction,
      recommendedPathSteps: [
        "Do not click links or open attachments from the email.",
        "Check the sender address and reply-to address.",
        "Open the provider's official website or app directly and check your account there.",
        "Never share passwords, card details, or one-time codes.",
        "Report or delete the email only after you have decided.",
      ],
      riskLevel:
        riskBand === "high_risk_signals"
          ? "high"
          : riskBand === "verify_before_acting"
            ? "medium"
            : "low",
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (opportunityType === "career_support") {
    const careerSupportPack =
      adminCase.careerSupportPack ?? buildCareerSupportPack({ text });
    const isCv = careerSupportPack.documentType === "cv";
    const isMatch = careerSupportPack.documentType === "cv_job_advert_match";

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: isMatch ? "CV and job advert match notes" : isCv ? "CV preparation notes" : adminCase.title,
      plainEnglishSummary: careerSupportPack.summary,
      opportunityNote:
        "Preparation only. AdminAvenger helps prepare. You stay in control.",
      statusLabel: "Career preparation only - review before using",
      evidenceFound: [
        ...careerSupportPack.likelyTargetRoles.map((role) => `Target role: ${role}`),
        ...(careerSupportPack.requirementsFound ?? []).slice(0, 4),
        ...(careerSupportPack.cvEvidenceThatMayMatch ?? []).slice(0, 4),
        ...careerSupportPack.strengthsToHighlight.slice(0, 4),
        ...careerSupportPack.projectsToHighlight.slice(0, 3),
      ],
      missingInformation: careerSupportPack.possibleGapsToCheck,
      nextBestAction:
        careerSupportPack.nextPreparationSteps[0] ??
        "Review the career preparation notes before using or sharing anything.",
      recommendedPathSteps: careerSupportPack.nextPreparationSteps,
      riskLevel: "low",
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

  if (opportunityType === "travel_evidence_check") {
    const totalCost = extractTotalCostMention(text);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Travel evidence check",
      plainEnglishSummary:
        "This looks like a flight cancellation where the airline needs to confirm what evidence is required before any claim. No clear recoverable amount was found, so nothing is counted as money back.",
      moneyAtStake: totalCost
        ? moneyImpact("Total holiday cost mentioned (not a recoverable amount)", totalCost.amount, "one_off", "unknown")
        : undefined,
      opportunityNote:
        "A total holiday, trip, or order cost is evidence only. It is not treated as money to recover.",
      statusLabel: "Evidence check - no recovery counted",
      evidenceFound: [
        "Flight cancellation mentioned",
        totalCost ? `Total holiday cost mentioned: ${formatCurrency(totalCost.amount)}` : undefined,
        "No clear recoverable amount found",
      ].filter((entry): entry is string => Boolean(entry)),
      missingInformation: [
        "What evidence the airline requires",
        "Whether any recoverable cost exists (extra hotel night, reimbursement, compensation, claim amount)",
        "Booking reference if available",
      ],
      nextBestAction: "Ask the airline what evidence they need before making a claim.",
      recommendedPathSteps: [
        "Ask the airline what evidence they need before making a claim.",
        "Keep the cancellation notice and booking details as evidence.",
        "Only add an amount once a clear recoverable cost is confirmed.",
      ],
      riskLevel: "low",
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  const amount = findFirstAmount(text);
  const recoverableAmount = extractRecoverableAmount(text);
  const isRefund = opportunityType === "money_back";
  const isSubscription =
    opportunityType === "subscription_renewal" ||
    opportunityType === "subscription_recurring_charge";
  const isWarranty = opportunityType === "warranty_or_fault";
  const isRefundExpected = opportunityType === "refund_expected";
  const isEnergyPriceChange = opportunityType === "energy_price_change";
  const isTravelRecovery = opportunityType === "travel_extra_cost_recovery";

  if (isTravelRecovery) {
    const travel = extractTravelRecoveryDetails(text);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Possible money recovery found",
      plainEnglishSummary:
        "This looks like a travel disruption where an extra hotel night may have created a recoverable cost. AdminAvenger found the amount, booking reference, company replies, and missing proof needed before asking for repayment.",
      potentialRecovery: moneyImpact("Potential recovery", travel.recoveryAmount, "one_off", "potential"),
      moneyImpactRows: [
        moneyImpact("Potential recovery", travel.recoveryAmount, "one_off", "potential"),
      ],
      providerOrRetailer: travel.suggestedRecipient,
      opportunityNote:
        "AdminAvenger can prepare the message. You review and approve before anything is sent.",
      statusLabel: "Potential recovery - not confirmed yet",
      evidenceFound: [
        travel.extraCostDescription,
        travel.recoveryAmount !== undefined
          ? `Potential recovery amount: ${formatCurrency(travel.recoveryAmount)}`
          : "Amount needs checking",
        travel.bookingReference ? `Booking reference: ${travel.bookingReference}` : undefined,
        travel.airline ? `Airline: ${travel.airline}` : undefined,
        travel.travelCompany ? `Travel company: ${travel.travelCompany}` : undefined,
        travel.proofRequested,
        ...travel.proofAvailable,
      ].filter((item): item is string => Boolean(item)),
      missingInformation: travel.missingProof,
      nextBestAction:
        "Gather the proof of payment, loveholidays confirmation, booking reference, and any flight-change evidence. Then send Air Mauritius a concise reimbursement request for the extra hotel night. Ask them to confirm if anything else is needed.",
      recommendedPathSteps: [
        "Check the evidence before acting.",
        "Attach proof of payment if available.",
        "Prepare a concise reimbursement message.",
        "Review and approve the message before anything is sent.",
      ],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (isEnergyPriceChange) {
    const energy = extractEnergyAnnualCosts(text);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Energy prices are changing",
      plainEnglishSummary:
        "This looks like an energy price-change notice with annual cost estimates. It is a checking opportunity, not a confirmed saving.",
      annualisedAmount: moneyImpact(
        "Total annual increase",
        energy.totalAnnualIncrease,
        "annual",
        "potential",
      ),
      moneyImpactRows: [
        moneyImpact("Electricity increase", energy.electricityIncrease, "annual", "potential"),
        moneyImpact("Gas increase", energy.gasIncrease, "annual", "potential"),
        moneyImpact("Total annual increase", energy.totalAnnualIncrease, "annual", "potential"),
      ],
      deadline: energy.startDate,
      deadlineLabel: "New prices start",
      providerOrRetailer: energy.provider,
      statusLabel: "Potential saving/checking opportunity - not confirmed yet",
      evidenceFound: [
        energy.provider ? `Provider: ${energy.provider}` : undefined,
        energy.startDate ? `New prices start: ${energy.startDate}` : undefined,
        energy.electricityOldAnnual !== undefined
          ? `Electricity old annual cost: ${formatCurrency(energy.electricityOldAnnual)}`
          : undefined,
        energy.electricityNewAnnual !== undefined
          ? `Electricity new annual cost: ${formatCurrency(energy.electricityNewAnnual)}`
          : undefined,
        energy.electricityIncrease !== undefined
          ? `Electricity increase: ${formatCurrency(energy.electricityIncrease)}/year`
          : undefined,
        energy.gasOldAnnual !== undefined
          ? `Gas old annual cost: ${formatCurrency(energy.gasOldAnnual)}`
          : undefined,
        energy.gasNewAnnual !== undefined
          ? `Gas new annual cost: ${formatCurrency(energy.gasNewAnnual)}`
          : undefined,
        energy.gasIncrease !== undefined
          ? `Gas increase: ${formatCurrency(energy.gasIncrease)}/year`
          : undefined,
        energy.previousAnnualEstimate !== undefined
          ? `Previous annual estimate: ${formatCurrency(energy.previousAnnualEstimate)}/year`
          : undefined,
        energy.newAnnualEstimate !== undefined
          ? `New annual estimate: ${formatCurrency(energy.newAnnualEstimate)}/year`
          : undefined,
        energy.noActionWording ? `"${energy.noActionWording}" wording` : undefined,
      ].filter((item): item is string => Boolean(item)),
      missingInformation: [
        "Current tariff name if not found",
        "Whether a cheaper fixed tariff/switch/support option is suitable",
        "User preference: stay, switch, compare, ask support",
      ],
      nextBestAction:
        "Review whether a cheaper tariff, fixed deal, supplier switch, or support option is worth checking. Keep this as evidence of the new annual estimate.",
      recommendedPathSteps: [
        "Check old annual estimate.",
        "Check new annual estimate.",
        "Check tariff name and unit rates if available.",
        "Compare whether a fixed deal, supplier switch, or support option is worth considering.",
      ],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if (isSubscription) {
    const subscription = getSubscriptionEvidence(adminCase, item);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Auto-renewing subscription found",
      plainEnglishSummary:
        "This looks like an auto-renewing or recurring subscription payment that may keep charging until cancelled.",
      potentialSaving: moneyImpact(
        "Monthly charge",
        subscription.monthlyAmount,
        "monthly",
        "potential",
      ),
      annualisedAmount: moneyImpact(
        "Annual impact if unchanged",
        subscription.annualAmount,
        "annual",
        "potential",
      ),
      moneyImpactRows: [
        moneyImpact("Monthly charge", subscription.monthlyAmount, "monthly", "potential"),
        moneyImpact("Annual impact if unchanged", subscription.annualAmount, "annual", "potential"),
      ],
      providerOrRetailer: /google play/i.test(text) ? "Google Play / Google Commerce Limited" : undefined,
      statusLabel: "Potential saving opportunity - not confirmed yet",
      evidenceFound: [
        text.match(/item:\s*([^\n]+)/i)?.[1] ? `Item: ${text.match(/item:\s*([^\n]+)/i)?.[1]?.trim()}` : undefined,
        /google play|google commerce limited/i.test(text)
          ? "Platform/provider: Google Play / Google Commerce Limited"
          : undefined,
        extractReferenceNumber(text) ? `Order number: ${extractReferenceNumber(text)}` : undefined,
        text.match(/order date:\s*([^\n]+)/i)?.[1]
          ? `Order date: ${text.match(/order date:\s*([^\n]+)/i)?.[1]?.trim()}`
          : undefined,
        subscription.monthlyAmount !== undefined
          ? `Monthly amount: ${pound}${subscription.monthlyAmount.toFixed(subscription.monthlyAmount % 1 === 0 ? 0 : 2)}`
          : undefined,
        subscription.annualAmount !== undefined
          ? `Estimated annual cost: ${pound}${subscription.annualAmount.toFixed(subscription.annualAmount % 1 === 0 ? 0 : 2)}/year`
          : undefined,
        subscription.autoRenewStatus ? `Renewal/auto-renew status: ${subscription.autoRenewStatus}` : undefined,
        subscription.cancellationClue ? `Cancellation clue: ${subscription.cancellationClue}` : undefined,
      ].filter((item): item is string => Boolean(item)),
      missingInformation: [
        "Whether user still wants the subscription",
        "Next billing date if not found",
      ],
      nextBestAction:
        "Review whether you still need this subscription. If not, use Manage subscriptions or Learn how to cancel before the next billing date.",
      recommendedPathSteps: [
        "Check whether you still use the subscription.",
        "Check the next charge or renewal date.",
        "Use the provider cancellation instructions if you do not want it to renew.",
        "Only mark savings confirmed if you actually cancel or reduce the cost.",
      ],
      riskLevel: getRiskLevel(adminCase),
      confidenceLabel: adminCase.confidence,
      sourceCaseType: adminCase.category,
      createdAt,
      updatedAt,
    };
  }

  if ((isRefund || isRefundExpected) && /^refund approved$/i.test(adminCase.title)) {
    const refund = getRefundEvidence(adminCase, item);

    return {
      id: `opportunity-${adminCase.id}`,
      caseId: adminCase.id,
      opportunityType,
      title: "Refund approved",
      plainEnglishSummary:
        "A refund has been approved and should be returned to the original payment method.",
      potentialRecovery: moneyImpact("Pending recovery", refund.amount, "one_off", "pending"),
      moneyImpactRows: [
        moneyImpact("Pending recovery", refund.amount, "one_off", "pending"),
      ],
      deadline: adminCase.chaseDate,
      deadlineLabel: "Suggested chase date",
      statusLabel: "Pending recovery - not confirmed yet",
      evidenceFound: [
        refund.formattedAmount ? `Refund amount: ${refund.formattedAmount}` : undefined,
        refund.refundWindow ? `Refund window: ${refund.refundWindow.replace(/^within\s+/i, "")}` : undefined,
        refund.reference ? `Reference: ${refund.reference}` : undefined,
      ].filter((item): item is string => Boolean(item)),
      missingInformation: [
        "Provider/retailer name if not found",
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
    // Only clearly recoverable amounts (refund/reimbursement/compensation/claim wording)
    // may become pending recovery. Total trip/booking/order costs never do.
    potentialRecovery: isRefund ? moneyImpact("Pending recovery", recoverableAmount, "one_off", "pending") : undefined,
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
