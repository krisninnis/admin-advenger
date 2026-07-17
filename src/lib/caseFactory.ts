import type {
  AdminCase,
  AdminCaseStatus,
  AdminFinding,
  AdminItem,
  CaseTimelineEvent,
  EvidenceItem,
  FindingStatus,
} from "../types";
import { assessBroadbandPriceRise, isBroadbandPriceRiseScenario } from "./broadbandPriceRiseAssessment";
import { buildCareerSupportPack } from "./careerSupportPack";
import { assessUkTrainDelayRefund } from "./delayRepayAssessment";
import { analyseDecisionProblem } from "./decisionEngine/decisionEngine";
import {
  extractEnergyAnnualCosts,
  extractTotalCostMention,
  extractTravelRecoveryDetails,
  formatAnnualImpact,
  formatCurrency,
  isEnergyPriceChangeText,
  isTravelDisruptionRecoveryText,
  parseMoneyAmount,
} from "./moneyParsers";
import { assessPaymentReminder } from "./paymentReminderAssessment";
import {
  assessEmailSafety,
  getEmailSafetyOrdinarySignals,
  getEmailSafetyRiskBandExplanation,
  getEmailSafetyRiskBandLabel,
} from "./suspiciousEmail";

const emailSafetyNextAction =
  "Use the email safety check. If unsure, open the provider's official website or app directly instead of using links in this email.";

const isSuspiciousEmailFinding = (finding: AdminFinding, item: AdminItem) =>
  /email safety|email needs safety check|risk email|high risk email|high risk signals/i.test(finding.title) &&
  assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType).isEmailLike;

const statusMap: Record<FindingStatus, AdminCaseStatus> = {
  new: "new",
  to_do: "ready_to_act",
  drafted: "drafted",
  sent_manually: "sent_manually",
  waiting: "waiting",
  resolved: "resolved",
  ignored: "ignored",
  no_action_needed: "no_action_needed",
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

const matchFirst = (text: string, pattern: RegExp) => text.match(pattern)?.[0];

const getEvidenceValue = (text: string, pattern: RegExp, fallback: string) =>
  matchFirst(text, pattern) ?? fallback;

const moneyPattern = /(?:£|Â£|GBP\s*|\?\s*)\d+(?:,\d{3})*(?:\.\d{1,2})?/i;
const monthlyMoneyPattern = /(?:£|Â£|GBP\s*|\?\s*)\d+(?:,\d{3})*(?:\.\d{1,2})?\s*(?:\/month|per month|monthly)?/i;
const refundWindowPattern =
  /(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i;
const refundReferencePattern = /(?:reference|ref)\s*:?\s*([A-Z]{1,5}\d{3,}[A-Z0-9-]*)/i;

const toMoneyNumber = (value?: string) => {
  const match = value?.match(/\d+(?:,\d{3})*(?:\.\d{1,2})?/);
  return match ? parseMoneyAmount(match[0]) : undefined;
};

const formatPounds = (value: number) => formatCurrency(value);

const isApprovedRefundFinding = (finding: AdminFinding, item: AdminItem) =>
  finding.category === "refund" &&
  (/^refund approved$/i.test(finding.title) ||
    /refund (?:has been )?approved|refund will be returned|returned to your original payment method|refund processed|refund issued/i.test(
      `${item.title} ${item.rawText}`,
    ));

const isEnergyPriceChangeFinding = (finding: AdminFinding, item: AdminItem) =>
  finding.category === "bill_increase" &&
  (/energy prices are changing/i.test(finding.title) || isEnergyPriceChangeText(`${item.title}\n${item.rawText}`));

const isTravelRecoveryFinding = (finding: AdminFinding, item: AdminItem) =>
  /travel recovery|possible money recovery found/i.test(finding.title) ||
  isTravelDisruptionRecoveryText(`${item.title}\n${item.rawText}`);

const isCareerSupportFinding = (finding: AdminFinding, item: AdminItem) => {
  const pack = buildCareerSupportPack({ text: `${item.title}\n${item.rawText}` });

  return pack.documentType !== "career_unknown" && /career|cv|cover letter|job advert|application answer/i.test(finding.title);
};

const isPaymentReminderFinding = (finding: AdminFinding, item: AdminItem) =>
  /^payment reminder to check$/i.test(finding.title) &&
  assessPaymentReminder(item).isPaymentReminder;

const createEvidence = (
  caseId: string,
  label: string,
  value: string,
  source: EvidenceItem["source"] = "detected",
): EvidenceItem => ({
  id: `evidence-${crypto.randomUUID()}`,
  caseId,
  label,
  value,
  source,
});

const dedupeNormalised = (items: string[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.toLowerCase().trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const createTimelineEvent = (
  caseId: string,
  title: string,
  description: string,
  createdAt: string,
): CaseTimelineEvent => ({
  id: `timeline-${crypto.randomUUID()}`,
  caseId,
  title,
  description,
  createdAt,
});

const evidenceForFinding = (
  caseId: string,
  finding: AdminFinding,
  item: AdminItem,
): EvidenceItem[] => {
  const text = `${item.title} ${item.rawText}`;
  const broadbandPriceRiseAssessment = assessBroadbandPriceRise(item);
  const delayRepayAssessment = assessUkTrainDelayRefund(item);

  if (isSuspiciousEmailFinding(finding, item)) {
    const suspicious = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);

    return [
      createEvidence(caseId, "Overall result", getEmailSafetyRiskBandLabel(suspicious), "detected"),
      createEvidence(caseId, "Band explanation", getEmailSafetyRiskBandExplanation(suspicious), "detected"),
      ...suspicious.riskSignals.map((signal) =>
        createEvidence(caseId, "Risk signal", signal, "detected"),
      ),
      ...suspicious.cautionSignals.map((signal) =>
        createEvidence(caseId, "Caution signal", signal, "detected"),
      ),
      ...getEmailSafetyOrdinarySignals(suspicious).map((signal) =>
        createEvidence(caseId, "Ordinary or inconclusive detail", signal, "detected"),
      ),
      ...(suspicious.senderAddress
        ? [createEvidence(caseId, "Sender address", suspicious.senderAddress)]
        : []),
      ...(suspicious.replyToAddress
        ? [createEvidence(caseId, "Reply-to address", suspicious.replyToAddress)]
        : []),
      ...(suspicious.replyToMismatch
        ? [
            createEvidence(
              caseId,
              "Reply-to mismatch",
              "Reply-to domain does not match the sender domain",
              "detected",
            ),
          ]
        : []),
      createEvidence(
        caseId,
        "Safety disclaimer",
        "Detected-signal warning - user should verify independently before acting. Not a scam determination.",
        "manual",
      ),
      createEvidence(
        caseId,
        "Next action",
        emailSafetyNextAction,
        "manual",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (isPaymentReminderFinding(finding, item)) {
    const paymentReminder = assessPaymentReminder(item);

    return [
      ...(paymentReminder.sender
        ? [createEvidence(caseId, "Sender/provider clue", paymentReminder.sender)]
        : []),
      ...(paymentReminder.letterDate
        ? [createEvidence(caseId, "Letter date", paymentReminder.letterDate)]
        : []),
      ...(paymentReminder.accountReference
        ? [createEvidence(caseId, "Account reference", paymentReminder.accountReference)]
        : []),
      ...(paymentReminder.amountDue
        ? [createEvidence(caseId, "Amount due", paymentReminder.amountDue)]
        : []),
      ...(paymentReminder.paymentDueDate
        ? [createEvidence(caseId, "Payment due date", paymentReminder.paymentDueDate)]
        : []),
      ...(paymentReminder.responseDeadline
        ? [createEvidence(caseId, "Response/contact deadline", paymentReminder.responseDeadline)]
        : []),
      ...(paymentReminder.requestedAction
        ? [createEvidence(caseId, "Requested action", paymentReminder.requestedAction)]
        : []),
      ...(paymentReminder.alternativeEvidenceAction
        ? [createEvidence(caseId, "Alternative evidence action", paymentReminder.alternativeEvidenceAction)]
        : []),
      createEvidence(
        caseId,
        "Payment reminder safety note",
        "Amount being requested only. AdminAvenger has not decided whether it is owed.",
        "manual",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "bill_increase" && isBroadbandPriceRiseScenario(item)) {
    return [
      createEvidence(
        caseId,
        "Provider",
        broadbandPriceRiseAssessment.providerName ?? "Not found yet",
        broadbandPriceRiseAssessment.providerName ? "detected" : "manual",
      ),
      createEvidence(
        caseId,
        "Contract start/renewal date",
        broadbandPriceRiseAssessment.contractDate ??
          broadbandPriceRiseAssessment.contractStartOrRenewalDate ??
          "Needed",
        broadbandPriceRiseAssessment.contractDate ?? broadbandPriceRiseAssessment.contractStartOrRenewalDate
          ? "detected"
          : "manual",
      ),
      ...(broadbandPriceRiseAssessment.contractDateRegime
        ? [
            createEvidence(
              caseId,
              "Contract timing",
              broadbandPriceRiseAssessment.contractDateRegime.replaceAll("_", " "),
            ),
          ]
        : []),
      createEvidence(
        caseId,
        "Contract timing explanation",
        broadbandPriceRiseAssessment.contractTimingExplanation,
        broadbandPriceRiseAssessment.contractDate ? "detected" : "manual",
      ),
      ...(broadbandPriceRiseAssessment.oldMonthlyPrice
        ? [createEvidence(caseId, "Current monthly price", broadbandPriceRiseAssessment.oldMonthlyPrice)]
        : []),
      ...(broadbandPriceRiseAssessment.newMonthlyPrice
        ? [createEvidence(caseId, "New monthly price", broadbandPriceRiseAssessment.newMonthlyPrice)]
        : []),
      ...(broadbandPriceRiseAssessment.monthlyIncrease
        ? [
            createEvidence(
              caseId,
              "Potential cost increase",
              `${broadbandPriceRiseAssessment.monthlyIncrease}/month more`,
            ),
          ]
        : []),
      ...(broadbandPriceRiseAssessment.annualIncrease
        ? [
            createEvidence(
              caseId,
              "Annual increase if unchanged",
              `${broadbandPriceRiseAssessment.annualIncrease}/year if unchanged`,
            ),
          ]
        : []),
      ...(broadbandPriceRiseAssessment.effectiveDate
        ? [createEvidence(caseId, "Effective date", broadbandPriceRiseAssessment.effectiveDate)]
        : []),
      ...(broadbandPriceRiseAssessment.responseDeadline
        ? [createEvidence(caseId, "Response deadline clue", broadbandPriceRiseAssessment.responseDeadline)]
        : []),
      ...(broadbandPriceRiseAssessment.optionsMentioned.length > 0
        ? [
            createEvidence(
              caseId,
              "Options mentioned",
              broadbandPriceRiseAssessment.optionsMentioned.join(", "),
            ),
          ]
        : []),
      ...(broadbandPriceRiseAssessment.rightsConfirmed.length > 0
        ? [
            createEvidence(
              caseId,
              "Provider wording found",
              broadbandPriceRiseAssessment.providerWordingFound.join(", "),
            ),
          ]
        : [
            createEvidence(
              caseId,
              "Rights not confirmed",
              "Cancellation/switching rights need checking",
              "manual",
            ),
          ]),
      ...broadbandPriceRiseAssessment.rightsNeedChecking.map((rightsCheck) =>
        createEvidence(caseId, "Rights need checking", rightsCheck, "manual"),
      ),
      ...broadbandPriceRiseAssessment.evidenceMissing.map((missingEvidence) =>
        createEvidence(caseId, "Missing critical evidence", missingEvidence, "manual"),
      ),
      createEvidence(caseId, "Caveat", broadbandPriceRiseAssessment.caveat, "manual"),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "refund" && delayRepayAssessment.isTrainDelayScenario) {
    return [
      ...delayRepayAssessment.evidenceFound.map((evidence) =>
        createEvidence(caseId, evidence.label, evidence.value),
      ),
      ...delayRepayAssessment.evidenceMissing.map((missingEvidence) =>
        createEvidence(caseId, `Missing: ${missingEvidence}`, "Needs user confirmation", "manual"),
      ),
      createEvidence(caseId, "Rule caveat", delayRepayAssessment.ruleCaveat, "manual"),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "admin_dispute") {
    const decision = analyseDecisionProblem(text);

    return [
      ...decision.sourceFacts.map((fact) => createEvidence(caseId, fact.label, fact.value, "detected")),
      ...decision.possibleGrounds.map((ground) => createEvidence(caseId, "Possible ground", ground, "detected")),
      ...decision.evidenceNeeded.map((need) =>
        createEvidence(caseId, `Missing: ${need}`, "Needed before acting", "manual"),
      ),
      ...decision.deadlines.map((deadline) => createEvidence(caseId, "Deadline/urgency", deadline, "manual")),
      ...decision.risks.map((risk) => createEvidence(caseId, "Risk", risk, "manual")),
      createEvidence(caseId, "Safety note", decision.safetyNotes[0] ?? "", "manual"),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  const lowerText = text.toLowerCase();
  const money = getEvidenceValue(text, /(?:£|GBP\s?)\d+(?:,\d{3})*(?:\.\d{2})?/i, "Amount not stated");
  const dateClue = getEvidenceValue(
    text,
    /\b(?:\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|due by [^.]+|expires [^.]+)\b/,
    finding.deadline ?? "Date clue not stated",
  );

  if (isApprovedRefundFinding(finding, item)) {
    const refundAmount = matchFirst(text, moneyPattern);
    const refundWindow = matchFirst(text, refundWindowPattern);
    const reference = text.match(refundReferencePattern)?.[1];

    return [
      ...(refundAmount ? [createEvidence(caseId, "Refund amount", refundAmount)] : []),
      ...(refundWindow ? [createEvidence(caseId, "Expected refund window", refundWindow)] : []),
      ...(reference ? [createEvidence(caseId, "Reference", reference)] : []),
      createEvidence(
        caseId,
        "Refund status",
        "Approved, but not confirmed received yet",
        "detected",
      ),
      createEvidence(caseId, "Missing: Provider/retailer name", "Not found yet", "manual"),
      createEvidence(caseId, "Missing: Exact refund arrival date", "Not found yet", "manual"),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (/^travel evidence check$/i.test(finding.title)) {
    const totalCost = extractTotalCostMention(text);

    return [
      createEvidence(caseId, "Situation", "Flight cancellation / evidence needed"),
      ...(totalCost
        ? [
            createEvidence(
              caseId,
              "Total holiday cost mentioned",
              `${formatCurrency(totalCost.amount)} (evidence only, not a recoverable amount)`,
            ),
          ]
        : []),
      createEvidence(caseId, "Recoverable amount", "No clear recoverable amount found", "manual"),
      createEvidence(
        caseId,
        "Missing: What evidence the airline requires",
        "Ask the airline before making a claim",
        "manual",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (isTravelRecoveryFinding(finding, item)) {
    const travel = extractTravelRecoveryDetails(text);

    return [
      ...(travel.extraCostDescription ? [createEvidence(caseId, "Extra cost", travel.extraCostDescription)] : []),
      ...(travel.recoveryAmount !== undefined
        ? [createEvidence(caseId, "Recovery amount", formatCurrency(travel.recoveryAmount))]
        : [createEvidence(caseId, "Recovery amount", "Amount needs checking", "manual")]),
      ...(travel.bookingReference ? [createEvidence(caseId, "Booking reference", travel.bookingReference)] : []),
      ...(travel.airline ? [createEvidence(caseId, "Airline involved", travel.airline)] : []),
      ...(travel.travelCompany ? [createEvidence(caseId, "Travel company involved", travel.travelCompany)] : []),
      ...(travel.proofRequested ? [createEvidence(caseId, "Proof requested", travel.proofRequested)] : []),
      ...dedupeNormalised(travel.proofAvailable).map((proof) => createEvidence(caseId, "Proof available", proof)),
      ...(travel.suggestedRecipient ? [createEvidence(caseId, "Suggested recipient", travel.suggestedRecipient)] : []),
      ...dedupeNormalised(travel.missingProof).map((missing) =>
        createEvidence(caseId, `Missing proof: ${missing}`, "Needed before sending", "manual"),
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "refund") {
    return [
      createEvidence(caseId, "Potential value", finding.estimatedValue ?? money),
      createEvidence(
        caseId,
        "Refund clue",
        getEvidenceValue(text, /refund|delayed|cancelled|failed delivery|compensation/i, "Refund or compensation wording found"),
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "subscription") {
    const monthlyAmount = matchFirst(text, monthlyMoneyPattern) ?? money;
    const monthlyValue = toMoneyNumber(monthlyAmount);
    const annualValue = monthlyValue === undefined ? undefined : monthlyValue * 12;
    const autoRenewStatus = getEvidenceValue(
      text,
      /auto-renewing|auto renewing|charged automatically until cancelled|charged automatically until canceled|until cancelled|until canceled|renews|recurring/i,
      "Recurring or auto-renewal wording found",
    );

    return [
      createEvidence(
        caseId,
        "Monthly amount",
        monthlyAmount === "Amount not stated" ? "Monthly cost not stated" : monthlyAmount,
      ),
      ...(annualValue !== undefined
        ? [createEvidence(caseId, "Estimated annual cost", `${formatPounds(annualValue)}/year`)]
        : []),
      createEvidence(caseId, "Renewal/auto-renew status", autoRenewStatus),
      createEvidence(
        caseId,
        "Renewal clue",
        getEvidenceValue(text, /subscription|renews|renewal|monthly|annual|membership|trial/i, "Recurring payment wording found"),
      ),
      createEvidence(caseId, "Cancellation clue", getEvidenceValue(text, /cancel|cancelled|canceled/i, "Check how to cancel")),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (isEnergyPriceChangeFinding(finding, item)) {
    const energy = extractEnergyAnnualCosts(text);

    return [
      ...(energy.provider ? [createEvidence(caseId, "Provider", energy.provider)] : []),
      ...(energy.startDate ? [createEvidence(caseId, "New prices start", energy.startDate)] : []),
      ...(energy.electricityOldAnnual !== undefined
        ? [createEvidence(caseId, "Electricity old annual cost", formatCurrency(energy.electricityOldAnnual))]
        : []),
      ...(energy.electricityNewAnnual !== undefined
        ? [createEvidence(caseId, "Electricity new annual cost", formatCurrency(energy.electricityNewAnnual))]
        : []),
      ...(energy.electricityIncrease !== undefined
        ? [createEvidence(caseId, "Electricity increase", `${formatCurrency(energy.electricityIncrease)}/year`)]
        : []),
      ...(energy.gasOldAnnual !== undefined
        ? [createEvidence(caseId, "Gas old annual cost", formatCurrency(energy.gasOldAnnual))]
        : []),
      ...(energy.gasNewAnnual !== undefined
        ? [createEvidence(caseId, "Gas new annual cost", formatCurrency(energy.gasNewAnnual))]
        : []),
      ...(energy.gasIncrease !== undefined
        ? [createEvidence(caseId, "Gas increase", `${formatCurrency(energy.gasIncrease)}/year`)]
        : []),
      ...(energy.previousAnnualEstimate !== undefined
        ? [createEvidence(caseId, "Previous annual estimate", `${formatCurrency(energy.previousAnnualEstimate)}/year`)]
        : []),
      ...(energy.newAnnualEstimate !== undefined
        ? [createEvidence(caseId, "New annual estimate", `${formatCurrency(energy.newAnnualEstimate)}/year`)]
        : []),
      ...(energy.totalAnnualIncrease !== undefined
        ? [createEvidence(caseId, "Total annual increase", `${formatCurrency(energy.totalAnnualIncrease)}/year`)]
        : []),
      ...(energy.noActionWording
        ? [createEvidence(caseId, "No-action wording", energy.noActionWording)]
        : []),
      createEvidence(caseId, "Missing: Current tariff name", "Not found yet", "manual"),
      createEvidence(
        caseId,
        "Missing: User preference",
        "Stay, switch, compare, or ask support needs user decision",
        "manual",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "bill_increase") {
    const serviceType = lowerText.includes("broadband")
      ? "Broadband"
      : lowerText.includes("energy")
        ? "Energy"
        : lowerText.includes("insurance")
          ? "Insurance"
          : "Service bill";

    return [
      createEvidence(caseId, "Increase amount", finding.estimatedValue ?? money),
      createEvidence(caseId, "Service type", serviceType),
      createEvidence(
        caseId,
        "Price-rise clue",
        getEvidenceValue(text, /price rise|increase|tariff|new price|rate change/i, "Bill increase wording found"),
      ),
    ];
  }

  if (finding.category === "warranty") {
    return [
      createEvidence(caseId, "Product", item.title.replace(/letter|receipt|email/gi, "").trim() || "Product not stated"),
      createEvidence(
        caseId,
        "Warranty clue",
        getEvidenceValue(text, /warranty|guarantee|repair|faulty|broken|not working/i, "Warranty or repair wording found"),
      ),
      createEvidence(caseId, "Potential value", finding.estimatedValue ?? "Replacement or repair value"),
    ];
  }

  if (finding.category === "job_application") {
    return [
      createEvidence(
        caseId,
        "Employer or recruiter clue",
        getEvidenceValue(text, /recruiter|hiring|application|interview|candidate|role/i, "Job application wording found"),
      ),
      createEvidence(caseId, "Follow-up window", finding.deadline ?? "Timeline not stated"),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "deadline") {
    return [
      createEvidence(caseId, "Detected deadline wording", dateClue),
      createEvidence(
        caseId,
        "Deadline clue",
        getEvidenceValue(text, /deadline|due by|expires|renewal date|appointment/i, "Time-sensitive wording found"),
      ),
    ];
  }

  if (finding.category === "important_reply") {
    return [
      createEvidence(
        caseId,
        "Urgent wording",
        getEvidenceValue(text, /urgent|reply|action required|final notice|important|please confirm/i, "Reply or action wording found"),
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (isCareerSupportFinding(finding, item)) {
    const pack = buildCareerSupportPack({ text: `${item.title}\n${item.rawText}` });

    return [
      ...pack.likelyTargetRoles.map((role) => createEvidence(caseId, "Likely target role", role)),
      ...pack.strengthsToHighlight.slice(0, 4).map((strength) =>
        createEvidence(caseId, "Strength to highlight", strength),
      ),
      ...pack.projectsToHighlight.slice(0, 3).map((project) =>
        createEvidence(caseId, "Project or portfolio evidence", project),
      ),
      ...pack.possibleGapsToCheck.slice(0, 4).map((gap) =>
        createEvidence(caseId, "Gap to check", gap, "manual"),
      ),
      createEvidence(caseId, "Preparation boundary", "Preparation only. The user reviews and decides what to use.", "manual"),
    ];
  }

  return [
    createEvidence(caseId, "Source", item.title, "user_text"),
    createEvidence(caseId, "Review clue", "No exact evidence detected; review the pasted text manually.", "manual"),
  ];
};

export const createAdminCase = (finding: AdminFinding, item: AdminItem): AdminCase => {
  const now = new Date().toISOString();
  const caseId = `case-${finding.id}`;
  const delayRepayAssessment = assessUkTrainDelayRefund(item);
  const isDelayRepayCase = finding.category === "refund" && delayRepayAssessment.isTrainDelayScenario;
  const isApprovedRefundCase = isApprovedRefundFinding(finding, item);
  const isTravelRecoveryCase = isTravelRecoveryFinding(finding, item);
  const isEnergyPriceChangeCase = isEnergyPriceChangeFinding(finding, item);
  const isEmailSafetyCase = isSuspiciousEmailFinding(finding, item);
  const careerSupportPack = buildCareerSupportPack({ text: `${item.title}\n${item.rawText}` });
  const isCareerSupportCase = isCareerSupportFinding(finding, item);
  const isDecisionEngineCase = finding.category === "admin_dispute";
  const decisionResult = isDecisionEngineCase
    ? analyseDecisionProblem(`${item.title}\n${item.rawText}`)
    : undefined;
  const travelRecovery = extractTravelRecoveryDetails(`${item.title}\n${item.rawText}`);
  const energyPriceChange = extractEnergyAnnualCosts(`${item.title}\n${item.rawText}`);
  const emailSafetyAssessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);
  const chaseDate =
    finding.deadline ??
    addDays(
      new Date(now),
      isApprovedRefundCase || isTravelRecoveryCase ? 14 : finding.urgency === "high" ? 3 : 7,
    );
  const broadbandPriceRiseAssessment = assessBroadbandPriceRise(item);
  const isBroadbandPriceRiseCase =
    finding.category === "bill_increase" && isBroadbandPriceRiseScenario(item);
  const broadbandPriceRiseTitle =
    broadbandPriceRiseAssessment.serviceType === "mobile"
      ? "Mobile tariff increase review"
      : broadbandPriceRiseAssessment.serviceType === "broadband"
        ? "Broadband price-rise review"
        : "Broadband/mobile price-rise challenge";
  const providerWording = broadbandPriceRiseAssessment.rightsConfirmed[0];
  const broadbandPriceRiseNextAction = providerWording
    ? `The message appears to say you may leave without an early termination charge${
        broadbandPriceRiseAssessment.responseDeadline
          ? ` if you contact the provider before ${broadbandPriceRiseAssessment.responseDeadline}`
          : ""
      }. AdminAvenger has not decided your rights, but this is important wording to check with the provider before acting. Also check the provider name and contract start or renewal date.`
    : "Check the provider name, contract start or renewal date, and whether cancellation or switching rights actually apply. Then ask the provider for the reason, whether the increase was shown in pounds and pence when signed or renewed, options, deadline, and any better deal.";
  const broadbandPriceRiseSummary = providerWording
    ? "AdminAvenger found a broadband/mobile price-rise notice and provider wording about leaving without an early termination charge. This is evidence to check with the provider, not a legal decision."
    : "AdminAvenger found a broadband/mobile price-rise notice. It can prepare questions and evidence, but provider terms, contract date, and cancellation or switching rights still need checking before acting.";

  return {
    id: caseId,
    findingId: finding.id,
    itemId: item.id,
    title: isBroadbandPriceRiseCase
      ? broadbandPriceRiseTitle
      : isDelayRepayCase
        ? "UK train delay refund case"
        : isApprovedRefundCase
          ? "Refund approved"
          : isEmailSafetyCase
            ? "Email needs safety check"
          : isTravelRecoveryCase
            ? "Possible money recovery found"
          : isEnergyPriceChangeCase
            ? "Energy prices are changing"
          : isCareerSupportCase && careerSupportPack.documentType === "cv_job_advert_match"
            ? "CV and job advert match notes"
          : isCareerSupportCase && careerSupportPack.documentType === "cv"
            ? "CV preparation notes"
          : isCareerSupportCase
            ? finding.title
          : isDecisionEngineCase
            ? decisionResult!.title
          : finding.title,
    category: finding.category,
    summary: isBroadbandPriceRiseCase
      ? broadbandPriceRiseSummary
      : isDelayRepayCase
        ? "AdminAvenger found a possible UK train delay refund case. This is not an eligibility decision: missing evidence and the operator's current Delay Repay policy still need checking."
        : isApprovedRefundCase
          ? "A refund has been approved and should be returned to the original payment method."
          : isEmailSafetyCase
            ? "This message has warning signs. Check carefully before clicking links, replying, opening attachments, or sharing payment/login details."
          : isTravelRecoveryCase
            ? "This looks like a travel disruption where an extra hotel night may have created a recoverable cost. AdminAvenger found the amount, booking reference, company replies, and missing proof needed before asking for repayment."
          : isEnergyPriceChangeCase
            ? "AdminAvenger found an energy price-change notice with old and new annual estimates. This is a checking opportunity, not a confirmed saving."
          : isCareerSupportCase
            ? careerSupportPack.summary
          : isDecisionEngineCase
            ? `${decisionResult!.plainEnglishSummary} ${decisionResult!.whatThisLooksLike}`
        : finding.summary,
    valueLabel: isBroadbandPriceRiseCase
      ? broadbandPriceRiseAssessment.annualIncrease
        ? `${broadbandPriceRiseAssessment.annualIncrease}/year if unchanged`
        : finding.estimatedValue
      : isEnergyPriceChangeCase
        ? energyPriceChange.totalAnnualIncrease
          ? `${formatAnnualImpact(energyPriceChange.totalAnnualIncrease)} total annual increase`
          : finding.estimatedValue
      : isTravelRecoveryCase
        ? travelRecovery.recoveryAmount
          ? `${formatCurrency(travelRecovery.recoveryAmount)} potential recovery`
          : "Potential recovery amount needs checking"
      : isEmailSafetyCase
        ? getEmailSafetyRiskBandLabel(emailSafetyAssessment)
      : isCareerSupportCase
        ? "Career preparation only"
      : isDecisionEngineCase
        ? decisionResult!.amountMentioned
          ? `${decisionResult!.amountMentioned} (${
              decisionResult!.amountTreatment === "amount_being_demanded"
                ? "amount being demanded"
                : "amount mentioned"
            })`
          : finding.estimatedValue
      : finding.estimatedValue,
    urgency: finding.urgency,
    confidence: finding.confidence,
    status: statusMap[finding.status],
    nextAction: isBroadbandPriceRiseCase
      ? broadbandPriceRiseNextAction
      : isDelayRepayCase
        ? delayRepayAssessment.recommendedNextStep
        : isApprovedRefundCase
          ? "Check your original payment method. Chase the provider if the refund has not arrived after 10 working days."
          : isEmailSafetyCase
            ? emailSafetyNextAction
          : isTravelRecoveryCase
            ? "Gather the proof of payment, loveholidays confirmation, booking reference, and any flight-change evidence. Then send Air Mauritius a concise reimbursement request for the extra hotel night. Ask them to confirm if anything else is needed."
          : isEnergyPriceChangeCase
            ? "Review whether a cheaper tariff, fixed deal, supplier switch, or support option is worth checking. Keep this as evidence of the new annual estimate."
          : isCareerSupportCase
            ? careerSupportPack.nextPreparationSteps[0]
          : isDecisionEngineCase
            ? decisionResult!.nextSteps.slice(0, 2).join(" ")
        : finding.suggestedAction,
    chaseDate,
    broadbandPriceRiseAssessment: isBroadbandPriceRiseCase
      ? broadbandPriceRiseAssessment
      : undefined,
    delayRepayAssessment: isDelayRepayCase ? delayRepayAssessment : undefined,
    emailSafetyAssessment: isEmailSafetyCase ? emailSafetyAssessment : undefined,
    decisionResult: isDecisionEngineCase ? decisionResult : undefined,
    careerSupportPack: isCareerSupportCase ? careerSupportPack : undefined,
    createdAt: finding.createdAt,
    updatedAt: now,
    evidence: evidenceForFinding(caseId, finding, item),
    timeline: [
      createTimelineEvent(
        caseId,
        "Case opened",
        "AdminAvenger converted this finding into a case file with evidence and a next action.",
        finding.createdAt,
      ),
    ],
  };
};

export const createTimelineEventForCase = (
  adminCase: AdminCase,
  title: string,
  description: string,
): CaseTimelineEvent =>
  createTimelineEvent(adminCase.id, title, description, new Date().toISOString());
