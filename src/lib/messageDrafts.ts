import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  OpportunityCard,
  PreparedMessageDraft,
} from "../types";
import {
  annualiseMonthlyAmount,
  extractEnergyAnnualCosts,
  extractMonthlyAmount,
  extractReferenceNumber,
  extractTravelRecoveryDetails,
  formatCurrency,
  parseMoneyAmount,
} from "./moneyParsers";
import { deriveOpportunityCard } from "./opportunityCards";

type PrepareMessageInput = {
  adminCase: AdminCase;
  item?: AdminItem;
  finding?: AdminFinding;
  opportunity?: OpportunityCard;
};

const currencyPattern =/(?:GBP\s*|\u00a3\s*|\?\s*)(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;

const compact = (items: Array<string | undefined>) =>
  items.filter((item): item is string => Boolean(item?.trim()));

const normaliseChecklistItem = (item: string) =>
  item
    .toLowerCase()
    .replace(/bank\/card|bank statement or card statement|card statement or bank statement/g, "bank card")
    .replace(/flight change\/cancellation|flight change or cancellation/g, "flight change cancellation")
    .replace(/standalone hotel receipt|hotel receipt/g, "hotel receipt")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const uniqueChecklistItems = (items: string[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normaliseChecklistItem(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const joinMessage = (parts: string[]) => parts.filter(Boolean).join("\n\n");

const evidenceValue = (adminCase: AdminCase, labelPattern: RegExp) =>
  adminCase.evidence.find((evidence) => labelPattern.test(evidence.label))?.value;

const rawTextFor = (adminCase: AdminCase, item?: AdminItem) =>
  `${item?.title ?? ""}\n${item?.rawText ?? ""}\n${adminCase.evidence
    .map((evidence) => `${evidence.label}: ${evidence.value}`)
    .join("\n")}`;

const formatMaybeMoney = (value?: number) =>
  value === undefined ? undefined : formatCurrency(value);

const firstCurrency = (text: string) => {
  const match = text.match(currencyPattern);
  return match ? formatCurrency(parseMoneyAmount(match[1])) : undefined;
};

const makeDraft = (
  adminCase: AdminCase,
  messageType: string,
  suggestedSubject: string,
  recipientHint: string | undefined,
  fullText: string,
  evidenceUsed: string[],
  missingBeforeSending: string[],
  safetyNote: string,
): PreparedMessageDraft => ({
  id: `prepared-message-${adminCase.id}-${messageType}`,
  messageType,
  suggestedSubject,
  recipientHint,
  fullText,
  evidenceUsed: uniqueChecklistItems(evidenceUsed),
  missingBeforeSending: uniqueChecklistItems(missingBeforeSending),
  safetyNote,
  createdAt: new Date().toISOString(),
});

const createTravelRecoveryMessage = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
  opportunity: OpportunityCard,
) => {
  const text = rawTextFor(adminCase, item);
  const travel = extractTravelRecoveryDetails(text);
  const reference =
    travel.bookingReference ?? evidenceValue(adminCase, /booking reference/i);
  const amount =
    formatMaybeMoney(travel.recoveryAmount) ??
    (opportunity.potentialRecovery?.amount !== undefined
      ? formatMaybeMoney(opportunity.potentialRecovery.amount)
      : undefined);
  const proofRequest =
    travel.proofRequested ?? evidenceValue(adminCase, /proof requested/i);
  const hasLoveholidaysScheduleProof =
    /loveholidays/i.test(text) &&
    /payment schedule|added to (?:my|the) payment|instalment|installment/i.test(text);
  const hasHotelNight =
    /extra (?:hotel )?night|additional hotel night|hotel night cost|hotel cost/i.test(text);
  const subject = reference
    ? `${hasHotelNight ? "Reimbursement request for additional hotel night" : "Travel disruption extra cost review"} - booking reference ${reference}`
    : hasHotelNight
      ? "Reimbursement request for additional hotel night"
      : "Travel disruption extra cost review";
  const evidenceUsed = compact([
    reference ? `Booking reference: ${reference}` : undefined,
    amount ? `Additional cost: ${amount}` : undefined,
    travel.airline ? `Airline: ${travel.airline}` : undefined,
    travel.travelCompany ? `Travel company: ${travel.travelCompany}` : undefined,
    proofRequest,
    ...travel.proofAvailable,
  ]);
  const missingBeforeSending = compact([
    "Bank/card statement showing payment",
    "Flight change or cancellation notice if available",
    "Booking confirmation",
    hasHotelNight ? "Any standalone hotel receipt if available" : undefined,
    ...travel.missingProof,
  ]);
  const fullText = joinMessage([
    "Hello,",
    hasHotelNight
      ? "I'm contacting you about an additional hotel night cost linked to my flight change/cancellation."
      : "I'm contacting you about an extra travel disruption cost linked to my flight change/cancellation.",
    compact([
      reference ? `Booking reference: ${reference}` : undefined,
      amount ? `Additional cost: ${amount}` : undefined,
    ]).join("\n"),
    compact([
      proofRequest
        ? "I understand you asked for proof of payment. I can provide a bank/card statement showing the payment."
        : "I can provide proof of payment if needed.",
      hasLoveholidaysScheduleProof ||
      travel.proofAvailable.some((proof) => /loveholidays|payment schedule/i.test(proof))
        ? `I also have confirmation from loveholidays that ${amount ?? "the amount"} was added to my payment schedule.`
        : undefined,
    ]).join(" "),
    "Please confirm whether this is enough to review the reimbursement request, or whether you need any further evidence.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "travel_recovery",
    subject,
    travel.suggestedRecipient ?? travel.airline ?? "The airline or travel provider handling the disruption",
    fullText,
    evidenceUsed,
    missingBeforeSending,
    "AdminAvenger has not sent this. This is a request for review, not a claim that reimbursement is assured.",
  );
};

const createTravelEvidenceCheckMessage = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
) => {
  const text = rawTextFor(adminCase, item);
  const reference = extractReferenceNumber(text) ?? evidenceValue(adminCase, /booking reference/i);
  // Deliberately no amount: this message asks what evidence is needed.
  // It must not request money back or quote a total holiday/trip cost.
  const fullText = joinMessage([
    "Hello,",
    "My flight was cancelled and I would like to check what evidence you need before I make any claim.",
    reference ? `Booking reference: ${reference}` : "",
    "Please confirm what evidence or documents you require (for example the cancellation notice, booking confirmation, or proof of any extra costs), and how I should send them to you.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "travel_evidence_check",
    reference
      ? `Cancelled flight - what evidence do you need? Booking reference ${reference}`
      : "Cancelled flight - what evidence do you need?",
    "The airline that cancelled the flight",
    fullText,
    compact([
      "Flight cancellation mentioned",
      reference ? `Booking reference: ${reference}` : undefined,
    ]),
    [
      "Confirm the airline name and contact route",
      "Add the booking reference if available",
      "Do not add an amount until a recoverable cost is confirmed",
    ],
    "AdminAvenger has not sent this. This message only asks what evidence is needed. It does not claim any money back.",
  );
};

const createRefundMessage = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
  opportunity: OpportunityCard,
) => {
  const text = rawTextFor(adminCase, item);
  const amount =
    opportunity.potentialRecovery?.amount !== undefined
      ? formatCurrency(opportunity.potentialRecovery.amount)
      : firstCurrency(text);
  const reference =
    evidenceValue(adminCase, /^reference$/i) ?? extractReferenceNumber(text);
  const refundWindow =
    evidenceValue(adminCase, /refund window|expected refund window/i) ??
    text.match(/(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i)?.[0];
  const fullText = joinMessage([
    "Hello,",
    `I'm following up on my approved refund${amount ? ` of ${amount}` : ""}.`,
    reference ? `Reference: ${reference}` : "",
    refundWindow
      ? `The refund was due to return to my original payment method ${refundWindow.replace(/^within\s+/i, "within ")}. Please can you confirm whether it has been processed and when it should arrive?`
      : "Please can you confirm whether it has been processed and when it should arrive?",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "refund_chase",
    "Refund follow-up",
    "The retailer, provider, or refund support team",
    fullText,
    compact([
      amount ? `Refund amount: ${amount}` : undefined,
      reference ? `Reference: ${reference}` : undefined,
      refundWindow ? `Refund window: ${refundWindow}` : undefined,
      "Refund approved but not confirmed received yet",
    ]),
    compact([
      "Check bank/card first",
      "Confirm the stated refund window has passed",
      reference ? undefined : "Add a reference number if available",
    ]),
    "AdminAvenger has not sent this. Do not mark the money recovered until you can see it has arrived.",
  );
};

const createSubscriptionMessage = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
  opportunity: OpportunityCard,
) => {
  const text = rawTextFor(adminCase, item);
  const monthlyAmount = extractMonthlyAmount(text) ?? opportunity.potentialSaving?.amount;
  const annualAmount = annualiseMonthlyAmount(monthlyAmount) ?? opportunity.annualisedAmount?.amount;
  const itemName = text.match(/item:\s*([^\n]+)/i)?.[1]?.trim();
  const provider = opportunity.providerOrRetailer;
  const fullText = joinMessage([
    "Hello,",
    "I'm reviewing my subscription and would like to confirm how to manage or cancel it before the next billing date.",
    compact([
      itemName ? `Subscription: ${itemName}` : undefined,
      provider ? `Provider/platform: ${provider}` : undefined,
      monthlyAmount !== undefined ? `Current charge: ${formatCurrency(monthlyAmount)}/month` : undefined,
      annualAmount !== undefined ? `Annual impact if unchanged: ${formatCurrency(annualAmount)}/year` : undefined,
    ]).join("\n"),
    "Please confirm the correct way to manage or cancel this subscription.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "subscription_review",
    "Subscription cancellation/review request",
    provider ?? "The subscription provider or account support team",
    fullText,
    compact([
      itemName ? `Subscription: ${itemName}` : undefined,
      monthlyAmount !== undefined ? `Monthly charge: ${formatCurrency(monthlyAmount)}/month` : undefined,
      annualAmount !== undefined ? `Annual impact if unchanged: ${formatCurrency(annualAmount)}/year` : undefined,
      evidenceValue(adminCase, /renewal|auto-renew/i),
    ]),
    [
      "Confirm you really want to cancel or review the subscription",
      "Use the official provider account page where possible",
      "Check the next billing date if available",
    ],
    "AdminAvenger has not cancelled anything. This message only asks how to manage or cancel the subscription.",
  );
};

const createBroadbandPriceRiseMessage = (adminCase: AdminCase) => {
  const assessment = adminCase.broadbandPriceRiseAssessment;
  const fullText = joinMessage([
    "Hello,",
    "I have received notice of an upcoming broadband/mobile price increase and would like to understand my options before it takes effect.",
    compact([
      assessment?.oldMonthlyPrice ? `Current monthly price: ${assessment.oldMonthlyPrice}` : undefined,
      assessment?.newMonthlyPrice ? `New monthly price: ${assessment.newMonthlyPrice}` : undefined,
      assessment?.monthlyIncrease ? `Monthly increase: ${assessment.monthlyIncrease}` : undefined,
      assessment?.annualIncrease ? `Annual impact if unchanged: ${assessment.annualIncrease}/year` : undefined,
      assessment?.effectiveDate ? `Effective date: ${assessment.effectiveDate}` : undefined,
    ]).join("\n"),
    "Please confirm what options are available before the increase takes effect, including whether a better deal, discount, alternative package, switch, or cancellation route is available for my account.",
    (assessment?.providerWordingFound ?? assessment?.rightsConfirmed ?? []).length > 0
      ? "The notice appears to include wording about leaving or changing plan. Please confirm what this means for my account before I decide what to do."
      : "Please also confirm whether any cancellation or switching rights apply to my account.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "broadband_mobile_price_rise",
    "Question about price increase",
    assessment?.providerName ?? "The broadband or mobile provider",
    fullText,
    compact([
      assessment?.providerName ? `Provider: ${assessment.providerName}` : undefined,
      assessment?.oldMonthlyPrice ? `Old price: ${assessment.oldMonthlyPrice}` : undefined,
      assessment?.newMonthlyPrice ? `New price: ${assessment.newMonthlyPrice}` : undefined,
      assessment?.monthlyIncrease ? `Monthly increase: ${assessment.monthlyIncrease}` : undefined,
      assessment?.annualIncrease ? `Annual impact: ${assessment.annualIncrease}/year` : undefined,
      ...(assessment?.providerWordingFound ?? []),
    ]),
    [
      "Check provider name and account details",
      "Check contract start or renewal date",
      "Do not assume cancellation rights apply until the provider confirms account-specific options",
    ],
    "AdminAvenger has not decided your rights. This message asks the provider to explain options before you act.",
  );
};

const createEnergyPriceMessage = (adminCase: AdminCase, item?: AdminItem) => {
  const energy = extractEnergyAnnualCosts(rawTextFor(adminCase, item));
  const providerLine = energy.provider ? `Provider: ${energy.provider}` : undefined;
  const startLine = energy.startDate
    ? `I received a notice that my energy prices are changing from ${energy.startDate}.`
    : "I received a notice that my energy prices are changing.";
  const totalIncreaseLine =
    energy.totalAnnualIncrease !== undefined
      ? `The notice shows a total estimated annual increase of ${formatCurrency(energy.totalAnnualIncrease)}/year.`
      : undefined;
  const fullText = joinMessage([
    "Hello,",
    startLine,
    compact([
      providerLine,
      energy.electricityIncrease !== undefined ? `Electricity annual increase: ${formatCurrency(energy.electricityIncrease)}/year` : undefined,
      energy.gasIncrease !== undefined ? `Gas annual increase: ${formatCurrency(energy.gasIncrease)}/year` : undefined,
      totalIncreaseLine,
    ]).join("\n"),
    "Please can you confirm whether there is a better available tariff, fixed deal, discount, support option, or retention offer for my account?",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "energy_price_change",
    "Request to review upcoming energy price change",
    energy.provider ?? "The energy provider",
    fullText,
    compact([
      energy.provider ? `Provider: ${energy.provider}` : undefined,
      energy.startDate ? `New prices start: ${energy.startDate}` : undefined,
      energy.electricityIncrease !== undefined ? `Electricity increase: ${formatCurrency(energy.electricityIncrease)}/year` : undefined,
      energy.gasIncrease !== undefined ? `Gas increase: ${formatCurrency(energy.gasIncrease)}/year` : undefined,
      energy.totalAnnualIncrease !== undefined ? `Total increase: ${formatCurrency(energy.totalAnnualIncrease)}/year` : undefined,
    ]),
    [
      "Check current tariff name",
      "Check whether direct debit or payment plan changes are needed",
      "Decide whether to compare tariffs or ask for support options",
    ],
    "AdminAvenger has not confirmed a saving. This message asks the provider to explain the change and options.",
  );
};

const createDeliveryMessage = (adminCase: AdminCase, item?: AdminItem) => {
  const text = rawTextFor(adminCase, item);
  const reference = extractReferenceNumber(text) ?? evidenceValue(adminCase, /reference|tracking|order/i);
  const fullText = joinMessage([
    "Hello,",
    "I'm following up about a delivery issue and would like an update on the next step.",
    reference ? `Reference/tracking: ${reference}` : "",
    "Please confirm the current delivery status and what I should do if the parcel is still missing or delayed.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "delivery_chase",
    "Delivery follow-up",
    "The retailer, sender, or courier support team",
    fullText,
    compact([
      reference ? `Reference/tracking: ${reference}` : undefined,
      ...adminCase.evidence.map((evidence) => `${evidence.label}: ${evidence.value}`).slice(0, 4),
    ]),
    ["Check tracking/order reference", "Check whether the stated delivery window has passed"],
    "AdminAvenger has not contacted the sender or courier. This is only a prepared follow-up.",
  );
};

const createEmailSafetyChecklist = (adminCase: AdminCase, opportunity: OpportunityCard) => {
  const fullText = joinMessage([
    "Safety checklist:",
    "- Do not click links in the email.",
    "- Do not open attachments from the email.",
    "- Do not reply with payment, login, card, bank, or one-time code details.",
    "- Open the provider's official website or app directly instead.",
    "- Contact the provider using a trusted number or website if unsure.",
    "- Report or delete the email only after you have decided it is suspicious.",
    "Personal note: I should verify this through the official website or app instead of using links in the email.",
  ]);

  return makeDraft(
    adminCase,
    "email_safety_checklist",
    "Safety checklist",
    undefined,
    fullText,
    opportunity.evidenceFound,
    ["Do not use links in the message", "Verify through the official app/site"],
    "AdminAvenger cannot prove whether this is a scam or safe. It highlights risk signals.",
  );
};

const createAdminDisputeMessage = (adminCase: AdminCase, opportunity: OpportunityCard) => {
  const decision = adminCase.decisionResult;
  const fullText =
    decision?.draftMessage ??
    joinMessage([
      "Hello,",
      "I am asking you to review this notice or letter.",
      "Please confirm what evidence you need and the next step.",
      "Kind regards,",
    ]);

  return makeDraft(
    adminCase,
    "admin_dispute_check",
    decision?.title ?? "Admin dispute review request",
    undefined,
    fullText,
    opportunity.evidenceFound,
    opportunity.missingInformation,
    decision?.safetyNotes[0] ??
      "AdminAvenger has not sent this. This is a draft for you to review, edit, and send yourself.",
  );
};

// Universal Credit sanction notices never come with module-authored draft
// wording (see decisionEngine/modules/ucSanction.ts - it has evidenceNeeded
// and questionsToAnswer, but no draftMessage), so this builds a UC-journal
// style message from the same sourceFacts/evidenceNeeded/questionsToAnswer
// the rest of the app already shows, rather than the generic
// "review this notice or letter" fallback above. Kept hedged throughout:
// "from what is shown", "please confirm", "I would like this looked at
// again" - never an assertion that the sanction was wrong.
const createUcSanctionJournalMessage = (adminCase: AdminCase) => {
  const decision = adminCase.decisionResult;
  const sanctionStartDate = decision?.sourceFacts.find(
    (fact) => fact.label === "Sanction start date",
  )?.value;
  const fullText = joinMessage([
    "Hello,",
    "I am asking for clarification about my Universal Credit sanction.",
    sanctionStartDate
      ? `From what is shown, the sanction starts on ${sanctionStartDate}.`
      : "From what is shown, I have received a sanction decision.",
    "Please confirm the exact reason given for the sanction and the decision date.",
    "I would like this looked at again if a Mandatory Reconsideration applies, and I am asking for clarification about hardship support if I am struggling to cover food, heating, or rent while the sanction applies.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "uc_sanction_journal_message",
    "Universal Credit sanction - request for clarification",
    "Universal Credit journal (or DWP Universal Credit helpline)",
    fullText,
    compact([
      sanctionStartDate ? `Sanction start date: ${sanctionStartDate}` : undefined,
      ...(decision?.sourceFacts.map((fact) => `${fact.label}: ${fact.value}`) ?? []),
    ]),
    decision?.evidenceNeeded ?? [],
    decision?.safetyNotes[0] ??
      "AdminAvenger has not sent this. This message only asks for clarification. It does not dispute the sanction for you.",
  );
};

// Same reasoning as above for UC statements/deductions - ucStatement.ts and
// ucDeductions.ts both have rich sourceFacts (advance repayment, overpayment
// recovery, deduction rate) but no draftMessage. "Please provide a
// breakdown" mirrors the project's preferred safety wording exactly.
const createUcDeductionBreakdownMessage = (adminCase: AdminCase) => {
  const decision = adminCase.decisionResult;
  const deductionFacts = (decision?.sourceFacts ?? []).filter((fact) =>
    /advance repayment|overpayment recovery|third party deduction|deduction rate|overpayment amount/i.test(
      fact.label,
    ),
  );
  const fullText = joinMessage([
    "Hello,",
    "I am asking for clarification about deductions shown on my Universal Credit statement.",
    deductionFacts.length > 0
      ? `From what is shown: ${deductionFacts
          .map((fact) => `${fact.label.toLowerCase()} ${fact.value}`)
          .join(", ")}.`
      : "From what is shown, one or more deductions have been applied to my payment.",
    "Please provide a breakdown of each deduction, including what it is for, the total amount still owed, and the rate being taken each month.",
    "If the deductions are causing hardship, please also confirm what support or a lower deduction rate may be available.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "uc_deduction_breakdown_request",
    "Universal Credit deductions - request for a breakdown",
    "Universal Credit journal (or DWP Universal Credit helpline)",
    fullText,
    compact(deductionFacts.map((fact) => `${fact.label}: ${fact.value}`)),
    decision?.evidenceNeeded ?? [],
    decision?.safetyNotes[0] ??
      "AdminAvenger has not sent this. This message only asks for a breakdown. It does not dispute the deduction for you.",
  );
};

const createGenericMessage = (adminCase: AdminCase, opportunity: OpportunityCard) => {
  const fullText = joinMessage([
    "Hello,",
    "I'm following up on the message below and would like to confirm the current status and any action needed from me.",
    "Please let me know the next step and whether you need any further information.",
    "Kind regards,",
  ]);

  return makeDraft(
    adminCase,
    "generic_important_reply",
    "Follow-up",
    "The relevant provider or support team",
    fullText,
    opportunity.evidenceFound,
    opportunity.missingInformation.length > 0
      ? opportunity.missingInformation
      : ["Check the original message and remove anything that does not apply"],
    "AdminAvenger has not sent this. Keep the wording neutral and check the evidence before copying.",
  );
};

export const createPreparedMessageDraft = ({
  adminCase,
  item,
  finding,
  opportunity = deriveOpportunityCard(adminCase, item, finding),
}: PrepareMessageInput): PreparedMessageDraft => {
  if (opportunity.opportunityType === "suspicious_email_risk") {
    return createEmailSafetyChecklist(adminCase, opportunity);
  }

  if (opportunity.opportunityType === "travel_evidence_check") {
    return createTravelEvidenceCheckMessage(adminCase, item);
  }

  if (opportunity.opportunityType === "travel_extra_cost_recovery") {
    return createTravelRecoveryMessage(adminCase, item, opportunity);
  }

  if (opportunity.opportunityType === "refund_expected" || opportunity.opportunityType === "money_back") {
    return createRefundMessage(adminCase, item, opportunity);
  }

  if (
    opportunity.opportunityType === "subscription_recurring_charge" ||
    opportunity.opportunityType === "subscription_renewal"
  ) {
    return createSubscriptionMessage(adminCase, item, opportunity);
  }

  if (adminCase.broadbandPriceRiseAssessment || opportunity.opportunityType === "bill_or_price_increase") {
    return createBroadbandPriceRiseMessage(adminCase);
  }

  if (opportunity.opportunityType === "energy_price_change") {
    return createEnergyPriceMessage(adminCase, item);
  }

  if (opportunity.opportunityType === "delivery_issue") {
    return createDeliveryMessage(adminCase, item);
  }

  if (opportunity.opportunityType === "admin_dispute_check") {
    const documentType = adminCase.decisionResult?.documentType;

    if (documentType === "benefits_uc_sanction") {
      return createUcSanctionJournalMessage(adminCase);
    }

    if (documentType === "benefits_uc_statement" || documentType === "benefits_uc_deductions") {
      return createUcDeductionBreakdownMessage(adminCase);
    }

    return createAdminDisputeMessage(adminCase, opportunity);
  }

  return createGenericMessage(adminCase, opportunity);
};
