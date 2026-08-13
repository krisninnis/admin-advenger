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
  annualiseMonthlyAmount,
  extractEnergyAnnualCosts,
  extractMonthlyAmount,
  extractStatedAnnualAmount,
  extractTotalCostMention,
  extractTravelRecoveryDetails,
  formatAnnualImpact,
  formatCurrency,
  isEnergyPriceChangeText,
  isTravelDisruptionRecoveryText,
} from "./moneyParsers";
import { assessPaymentReminder } from "./paymentReminderAssessment";
import {
  assessAccountOutcome,
  assessRefundState,
  extractGeneralAdmin,
  type RefundStage,
} from "./generalAdminExtraction";
import { countSupportedSourceOccurrences } from "./sourceSupport";
import type { SourceDocument, SourceProvenance } from "./sourceProvenance";
import {
  assessEmailSafety,
  describeStatedPressure,
  getEmailSafetyOrdinarySignals,
  getEmailSafetyRiskBandExplanation,
  getEmailSafetyRiskBandLabel,
} from "./suspiciousEmail";
import {
  detectSensitiveInformationRequest,
  SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL,
} from "./sensitiveInformationRequest";

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

const timingProvenanceFor = (
  sourceQuote: string,
  documents: readonly SourceDocument[] | undefined,
): SourceProvenance | undefined => {
  if (!documents?.length) return undefined;

  const matches = documents.flatMap((document) =>
    document.segments
      .filter((segment) => countSupportedSourceOccurrences(sourceQuote, segment.text) === 1)
      .map((segment) => ({ document, segment })),
  );

  if (matches.length === 1) {
    const [{ document, segment }] = matches;
    return {
      sourceDocumentId: document.id,
      sourceSegmentId: segment.id,
      sourceQuote,
      extractionConfidence: document.confidence,
      reviewState: document.reviewState,
    };
  }

  // Fail closed when structured source identity is missing or ambiguous.
  return {
    sourceDocumentId: documents[0].id,
    sourceQuote,
    extractionConfidence: documents[0].confidence,
    reviewState: "review_required",
  };
};

const moneyPattern = /(?:£|Â£|GBP\s*|\?\s*)\d+(?:,\d{3})*(?:\.\d{1,2})?/i;
const refundWindowPattern =
  /(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i;

const formatPounds = (value: number) => formatCurrency(value);

// The keyword half of this read has no sense of negation: "No refund has been
// approved for £68.40." satisfied it, and the case was retitled "Refund
// approved" even though the finding said otherwise. The shared refund state is
// negation-aware, so it decides whether an approval exists at all.
const REFUND_SUCCESS_STAGES = new Set<RefundStage>([
  "approved",
  "issued",
  "promised",
  "received",
]);

const isApprovedRefundFinding = (finding: AdminFinding, item: AdminItem) =>
  finding.category === "refund" &&
  REFUND_SUCCESS_STAGES.has(assessRefundState(`${item.title}\n${item.rawText}`).stage) &&
  (/^refund approved$/i.test(finding.title) ||
    /refund (?:has been )?approved|refund will be returned|returned to your original payment method|refund processed|refund issued/i.test(
      `${item.title} ${item.rawText}`,
    ));

const isPromisedRefundFinding = (finding: AdminFinding, item: AdminItem) =>
  finding.category === "refund" &&
  /^refund promised$/i.test(finding.title) &&
  assessRefundState(`${item.title}\n${item.rawText}`).stage === "promised";

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

const isAccountOutcomeFinding = (finding: AdminFinding, item: AdminItem) =>
  /^(?:account closure confirmed|account closed - balance needs checking|account closure needs a document|charge removal confirmed)$/i.test(
    finding.title,
  ) && assessAccountOutcome(`${item.title}\n${item.rawText}`).isAccountOutcome;

const createEvidence = (
  caseId: string,
  label: string,
  value: string,
  source: EvidenceItem["source"] = "detected",
  // `source` is provenance, so it cannot say whether a row is a fact, a
  // calculation, a gap or a caveat. resolveEvidenceKind defaults "detected" to a
  // source fact and everything else to visible-but-uncounted context; rows that
  // disagree say so here. Derived arithmetic and genuine gaps both need it: a
  // gap must be tagged "missing" to become something to gather, because an
  // untagged row is deliberately never turned into a task.
  kind?: EvidenceItem["kind"],
): EvidenceItem => ({
  id: `evidence-${crypto.randomUUID()}`,
  caseId,
  label,
  value,
  source,
  ...(kind ? { kind } : {}),
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

  if (finding.generalAdminFallback) {
    const fallback = finding.generalAdminFallback;
    const amountLabels: Record<(typeof fallback.amounts)[number]["role"], string> = {
      amount_demanded: "Amount requested by the source",
      amount_collected_automatically: "Automatic collection amount",
      refund_total: "Refund amount mentioned",
      order_subtotal: "Order subtotal mentioned",
      postage: "Postage amount mentioned",
      line_item: "Line-item amount mentioned",
      recurring_charge: "Recurring charge mentioned",
      price_old: "Old price",
      price_new: "New price",
      price_increase: "Price increase mentioned",
      total_cost: "Total cost mentioned",
      recoverable_amount: "Possible recovery mentioned",
      balance_under_review: "Balance under review",
      former_balance: "Former balance",
      amount_received: "Payment recorded as received by the source",
      future_amount: "Possible future amount",
      unknown: "Amount mentioned - check its role",
    };

    return [
      createEvidence(caseId, "Source statement", fallback.sourceStatement, "user_text"),
      ...fallback.dates.map((date) =>
        createEvidence(caseId, `Source date - ${date.role.replaceAll("_", " ")}`, date.sourceQuote, "detected"),
      ),
      ...fallback.relativePeriods.map((period) =>
        createEvidence(caseId, `Source period - ${period.role.replaceAll("_", " ")}`, period.sourceQuote, "detected"),
      ),
      ...fallback.amounts.map((amount) =>
        createEvidence(caseId, amountLabels[amount.role], amount.sourceQuote, "detected"),
      ),
      ...fallback.references.map((reference) =>
        createEvidence(caseId, "Reference", reference.sourceQuote, "detected"),
      ),
      ...(fallback.requestedDocument
        ? [createEvidence(caseId, "Requested document", fallback.requestedDocument, "detected")]
        : []),
      ...(fallback.requestedAction
        ? [createEvidence(caseId, "Requested action", fallback.requestedAction, "detected")]
        : []),
      ...(fallback.inconsistency
        ? [
            createEvidence(
              caseId,
              "Contradictory statements in the message",
              fallback.inconsistency,
              "detected",
            ),
          ]
        : []),
      ...(fallback.dependency
        ? [createEvidence(caseId, "Open dependency", fallback.dependency, "detected")]
        : []),
      ...(fallback.consequence
        ? [createEvidence(caseId, "Consequence stated by source", fallback.consequence, "detected")]
        : []),
      ...(fallback.evidenceToGather ?? []).map((record) =>
        createEvidence(caseId, "Record worth having to hand", record, "manual", "missing"),
      ),
      createEvidence(
        caseId,
        "Safety boundary",
        fallback.uncertaintyNote,
        "manual",
      ),
    ];
  }

  if (isSuspiciousEmailFinding(finding, item)) {
    const suspicious = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);
    const extraction = extractGeneralAdmin(`${item.title}\n${item.rawText}`);
    const demandedAmount = extraction.amounts.find((amount) => amount.role === "amount_demanded");
    // What the message asked for stays visible as a quoted source fact. The
    // recommended action refuses it; the fact is never restated as a step.
    const credentialRequest = detectSensitiveInformationRequest(
      `${item.title}\n${item.rawText}`,
    );
    const statedPressure = describeStatedPressure(item.rawText);

    return [
      createEvidence(caseId, "Overall result", getEmailSafetyRiskBandLabel(suspicious), "detected"),
      createEvidence(caseId, "Band explanation", getEmailSafetyRiskBandExplanation(suspicious), "detected"),
      ...(credentialRequest.sourceQuote
        ? [
            createEvidence(
              caseId,
              SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL,
              credentialRequest.sourceQuote,
              "detected",
            ),
          ]
        : []),
      // The message's own threat and time limit stay visible, quoted and
      // attributed, so the pressure can be judged rather than obeyed.
      ...(statedPressure.threatQuote
        ? [
            createEvidence(
              caseId,
              "Consequence stated by message",
              statedPressure.threatQuote,
              "detected",
            ),
          ]
        : []),
      ...(statedPressure.urgencyQuote
        ? [
            createEvidence(
              caseId,
              "Time limit stated by message",
              statedPressure.urgencyQuote,
              "detected",
            ),
          ]
        : []),
      ...suspicious.riskSignals.map((signal) =>
        createEvidence(caseId, "Risk signal", signal, "detected"),
      ),
      ...suspicious.cautionSignals.map((signal) =>
        createEvidence(caseId, "Caution signal", signal, "detected"),
      ),
      ...getEmailSafetyOrdinarySignals(suspicious).map((signal) =>
        createEvidence(caseId, "Ordinary or inconclusive detail", signal, "detected"),
      ),
      ...(demandedAmount
        ? [
            createEvidence(
              caseId,
              "Amount requested by message",
              demandedAmount.sourceQuote,
              "detected",
            ),
          ]
        : []),
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
      ...(paymentReminder.collectionActivityPossible
        ? [
            createEvidence(
              caseId,
              "Collection warning",
              "The provider says further collection activity may follow",
            ),
          ]
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

  if (isAccountOutcomeFinding(finding, item)) {
    const outcome = assessAccountOutcome(`${item.title}\n${item.rawText}`);
    const amountText = outcome.amount?.sourceQuote;

    return [
      ...(outcome.accountClosed
        ? [
            createEvidence(
              caseId,
              "Account status",
              "The provider says the account has been closed",
            ),
          ]
        : []),
      ...(outcome.closurePending
        ? [
            createEvidence(
              caseId,
              "Account status",
              "The provider says the account closure has not been completed",
            ),
          ]
        : []),
      ...(outcome.accountRemainsActive
        ? [
            createEvidence(
              caseId,
              "Account status",
              "The provider says the account remains active",
            ),
          ]
        : []),
      ...(outcome.chargesContinue
        ? [
            createEvidence(
              caseId,
              "Charge status",
              "The provider says monthly charges will continue",
            ),
          ]
        : []),
      ...(outcome.chargeRemoved
        ? [
            createEvidence(
              caseId,
              "Charge outcome",
              `The provider says the${amountText ? ` ${amountText}` : ""} charge has been removed`,
            ),
          ]
        : []),
      ...(outcome.balanceStillPayable
        ? [
            createEvidence(
              caseId,
              "Balance status",
              `The provider says the${amountText ? ` ${amountText}` : ""} final balance remains payable`,
            ),
          ]
        : []),
      ...(outcome.waiverUnderReview
        ? [
            createEvidence(
              caseId,
              "Charge review status",
              "The provider says the request to remove the charge is still under review",
            ),
          ]
        : []),
      ...(outcome.noDecisionYet
        ? [
            createEvidence(
              caseId,
              "Charge review status",
              "The provider says no waiver decision has been made yet",
            ),
          ]
        : []),
      ...(outcome.paymentNotRequiredToday
        ? [
            createEvidence(
              caseId,
              "Payment request",
              "The provider says payment is not requested today",
            ),
          ]
        : []),
      ...(outcome.futurePaymentPossible
        ? [
            createEvidence(
              caseId,
              "Future payment status",
              "The provider says the balance may become payable after review",
            ),
          ]
        : []),
      ...(outcome.providerReviewPending
        ? [
            createEvidence(
              caseId,
              "Provider review status",
              "The provider says its review is still pending",
            ),
          ]
        : []),
      ...(outcome.providerWillWriteAgain
        ? [
            createEvidence(
              caseId,
              "Promised response",
              "The provider says it will write again with its decision",
            ),
          ]
        : []),
      ...(outcome.chargeRemovalDenied
        ? [
            createEvidence(
              caseId,
              "Charge outcome",
              "The provider says the charge has not been removed",
            ),
          ]
        : []),
      ...(outcome.noPaymentRequired
        ? [
            createEvidence(
              caseId,
              "Payment request",
              "The provider says no payment is required",
            ),
          ]
        : []),
      ...(outcome.noFurtherBills
        ? [
            createEvidence(
              caseId,
              "Future bills",
              "The provider says no further bills should be issued",
            ),
          ]
        : []),
      ...(outcome.noFurtherDirectDebits
        ? [
            createEvidence(
              caseId,
              "Future Direct Debits",
              "The provider says no further Direct Debits should be issued or collected",
            ),
          ]
        : []),
      ...(outcome.requiredDocument
        ? [
            createEvidence(
              caseId,
              "Required document",
              `${outcome.requiredDocument}${outcome.actionDeadline ? ` by ${outcome.actionDeadline}` : ""}`,
            ),
          ]
        : []),
      ...(outcome.conditionalFollowUp && outcome.followUpPeriod
        ? [
            createEvidence(
              caseId,
              "Conditional follow-up",
              `Follow up if no response arrives ${outcome.followUpPeriod}`,
            ),
          ]
        : []),
      ...(outcome.collectionActivityPossible
        ? [
            createEvidence(
              caseId,
              "Collection warning",
              "The provider says further collection activity may follow",
            ),
          ]
        : []),
      ...(outcome.keepConfirmation
        ? [
            createEvidence(
              caseId,
              "Record keeping",
              "The message says to keep this confirmation for the records",
            ),
          ]
        : []),
      ...(outcome.conditionalDirectDebitFollowUp
        ? [
            createEvidence(
              caseId,
              "Conditional follow-up",
              "The message says to contact the provider only if a later Direct Debit is collected",
            ),
          ]
        : []),
      ...(outcome.finalDirectDebitPending
        ? [
            createEvidence(
              caseId,
              "Final Direct Debit",
              "The provider says one final Direct Debit may still be collected",
            ),
          ]
        : []),
      ...(outcome.reference
        ? [createEvidence(caseId, "Reference", outcome.reference)]
        : []),
      createEvidence(
        caseId,
        "Provider-statement boundary",
        "This records what the provider says. AdminAvenger has not independently verified the account or payment position.",
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
              "detected",
              // The regime can itself be "missing", which is an absence rather
              // than a fact read from the notice.
              broadbandPriceRiseAssessment.contractDateRegime === "missing"
                ? "missing"
                : "source_fact",
            ),
          ]
        : []),
      createEvidence(
        caseId,
        "Contract timing explanation",
        broadbandPriceRiseAssessment.contractTimingExplanation,
        broadbandPriceRiseAssessment.contractDate ? "detected" : "manual",
        "informational",
      ),
      ...(broadbandPriceRiseAssessment.oldMonthlyPrice
        ? [createEvidence(caseId, "Current monthly price", broadbandPriceRiseAssessment.oldMonthlyPrice)]
        : []),
      ...(broadbandPriceRiseAssessment.newMonthlyPrice
        ? [createEvidence(caseId, "New monthly price", broadbandPriceRiseAssessment.newMonthlyPrice)]
        : []),
      // Arithmetic on the two source prices, not a third fact found in the
      // notice. It stays visible as money mentioned; it must not be counted as
      // separately found evidence.
      ...(broadbandPriceRiseAssessment.monthlyIncrease
        ? [
            createEvidence(
              caseId,
              "Potential cost increase",
              `${broadbandPriceRiseAssessment.monthlyIncrease}/month more`,
              "detected",
              "derived",
            ),
          ]
        : []),
      ...(broadbandPriceRiseAssessment.annualIncrease
        ? [
            createEvidence(
              caseId,
              "Annual increase if unchanged",
              `${broadbandPriceRiseAssessment.annualIncrease}/year if unchanged`,
              "detected",
              "derived",
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
              "missing",
            ),
          ]),
      ...broadbandPriceRiseAssessment.rightsNeedChecking.map((rightsCheck) =>
        createEvidence(caseId, "Rights need checking", rightsCheck, "manual", "missing"),
      ),
      ...broadbandPriceRiseAssessment.evidenceMissing.map((missingEvidence) =>
        createEvidence(caseId, "Missing critical evidence", missingEvidence, "manual", "missing"),
      ),
      createEvidence(
        caseId,
        "Caveat",
        broadbandPriceRiseAssessment.caveat,
        "manual",
        "informational",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "refund" && delayRepayAssessment.isTrainDelayScenario) {
    return [
      ...delayRepayAssessment.evidenceFound.map((evidence) =>
        createEvidence(caseId, evidence.label, evidence.value),
      ),
      ...delayRepayAssessment.evidenceMissing.map((missingEvidence) =>
        createEvidence(caseId, `Missing: ${missingEvidence}`, "Needs user confirmation", "manual", "missing"),
      ),
      createEvidence(
        caseId,
        "Rule caveat",
        delayRepayAssessment.ruleCaveat,
        "manual",
        "informational",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "admin_dispute") {
    const decision = analyseDecisionProblem(item.rawText);

    return [
      ...decision.sourceFacts.map((fact) => createEvidence(caseId, fact.label, fact.value, "detected")),
      ...decision.possibleGrounds.map((ground) => createEvidence(caseId, "Possible ground", ground, "detected")),
      ...decision.evidenceNeeded.map((need) =>
        createEvidence(caseId, `Missing: ${need}`, "Needed before acting", "manual", "missing"),
      ),
      ...decision.deadlines.map((deadline) =>
        createEvidence(caseId, "Deadline/urgency", deadline, "manual", "informational"),
      ),
      ...decision.risks.map((risk) =>
        createEvidence(caseId, "Risk", risk, "manual", "informational"),
      ),
      createEvidence(
        caseId,
        "Safety note",
        decision.safetyNotes[0] ?? "",
        "manual",
        "informational",
      ),
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

  if (isPromisedRefundFinding(finding, item)) {
    const refund = assessRefundState(text);
    return [
      ...(refund.amount
        ? [createEvidence(caseId, "Refund amount", refund.amount.sourceQuote)]
        : []),
      ...(refund.relativePeriod
        ? [createEvidence(caseId, "Promised refund window", refund.relativePeriod.value)]
        : []),
      ...(refund.reference
        ? [createEvidence(caseId, "Reference", refund.reference.value)]
        : []),
      createEvidence(
        caseId,
        "Refund status",
        "Promised by the provider, but not confirmed received",
        "detected",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (isApprovedRefundFinding(finding, item)) {
    const refundAmount = matchFirst(text, moneyPattern);
    const refundWindow = matchFirst(text, refundWindowPattern);
    // The shared extractor already finds references, including hyphenated forms
    // such as RF-20481 and wording like "your reference is RF-20481". A local
    // pattern here used to re-derive the same fact and silently lose it, so this
    // consumes the structured extraction instead of parsing the text again.
    const references = extractGeneralAdmin(text).references;

    return [
      ...(refundAmount ? [createEvidence(caseId, "Refund amount", refundAmount)] : []),
      ...(refundWindow ? [createEvidence(caseId, "Expected refund window", refundWindow)] : []),
      ...references.map((reference) =>
        createEvidence(caseId, "Reference", reference.value),
      ),
      createEvidence(
        caseId,
        "Refund status",
        "Approved, but not confirmed received yet",
        "detected",
      ),
      createEvidence(caseId, "Missing: Provider/retailer name", "Not found yet", "manual", "missing"),
      createEvidence(caseId, "Missing: Exact refund arrival date", "Not found yet", "manual", "missing"),
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
      createEvidence(caseId, "Recoverable amount", "No clear recoverable amount found", "manual", "missing"),
      createEvidence(
        caseId,
        "Missing: What evidence the airline requires",
        "Ask the airline before making a claim",
        "manual",
        "missing",
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
        : [createEvidence(caseId, "Recovery amount", "Amount needs checking", "manual", "missing")]),
      ...(travel.bookingReference ? [createEvidence(caseId, "Booking reference", travel.bookingReference)] : []),
      ...(travel.airline ? [createEvidence(caseId, "Airline involved", travel.airline)] : []),
      ...(travel.travelCompany ? [createEvidence(caseId, "Travel company involved", travel.travelCompany)] : []),
      ...(travel.proofRequested ? [createEvidence(caseId, "Proof requested", travel.proofRequested)] : []),
      ...dedupeNormalised(travel.proofAvailable).map((proof) => createEvidence(caseId, "Proof available", proof)),
      ...(travel.suggestedRecipient ? [createEvidence(caseId, "Suggested recipient", travel.suggestedRecipient)] : []),
      ...dedupeNormalised(travel.missingProof).map((missing) =>
        createEvidence(caseId, `Missing proof: ${missing}`, "Needed before sending", "manual", "missing"),
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "complaint") {
    const extraction = extractGeneralAdmin(text);
    const complaintOpen = /\bcomplaint\b[^.\n]*\b(?:remains? open|under investigation)\b/i.test(text);
    return [
      ...(complaintOpen
        ? [createEvidence(caseId, "Complaint status", "The complaint remains open")]
        : []),
      ...extraction.references.map((reference) =>
        createEvidence(caseId, "Reference", reference.value),
      ),
      // This template read references and relative periods but never the dates
      // the same extraction had already found, so an explicit date such as
      // "expected on 4 August 2026" disappeared from the result. The date and
      // the response period stay separate facts: a date the sender gave is not
      // the same thing as a window they promised to reply within.
      ...extraction.dates.map((date) =>
        createEvidence(caseId, "Date shown in the message", date.value),
      ),
      ...extraction.relativePeriods.map((period) =>
        createEvidence(caseId, "Expected response period", period.value),
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (
    finding.category === "important_reply" &&
    /^(?:Universal Credit appointment|Disciplinary hearing invitation|Possession notice)/i.test(finding.title)
  ) {
    const extraction = extractGeneralAdmin(text);
    const sourceDate = extraction.dates[0]?.value;
    const isUc = /^Universal Credit appointment/i.test(finding.title);
    const isDisciplinary = /^Disciplinary hearing invitation/i.test(finding.title);
    return [
      createEvidence(
        caseId,
        "Message type",
        isUc
          ? "Universal Credit appointment or claim action"
          : isDisciplinary
            ? "Disciplinary hearing invitation - no outcome stated"
            : "Possession notice wording - eviction is not confirmed",
      ),
      ...(sourceDate
        ? [createEvidence(caseId, isUc ? "Appointment date" : "Date stated", sourceDate)]
        : []),
      createEvidence(
        caseId,
        "Preparation needed",
        isUc
          ? "Review the official journal or appointment details and prepare what the message asks you to bring"
          : isDisciplinary
            ? "Review the invitation and allegations, and gather the attached evidence and relevant records"
            : "Check the notice urgently and seek independent housing advice",
      ),
      createEvidence(
        caseId,
        "Decision boundary",
        isUc
          ? "AdminAvenger cannot decide benefit entitlement or whether a requirement has been met"
          : isDisciplinary
            ? "AdminAvenger cannot decide whether the employer's action is lawful"
            : "The source says court action may follow; AdminAvenger cannot confirm eviction or the notice's legal effect",
        "manual",
      ),
      createEvidence(caseId, "Source", item.title, "user_text"),
    ];
  }

  if (finding.category === "refund") {
    const refundState = assessRefundState(text);

    // A refund the source says has arrived is a completed record, so the evidence
    // is the amount, the reference and the stated outcome. The generic template
    // below carries neither amount nor reference, which meant a confirmed refund
    // lost its reference on the way to the result.
    if (refundState.stage === "received") {
      return [
        ...(refundState.amount
          ? [createEvidence(caseId, "Refund amount", refundState.amount.sourceQuote)]
          : []),
        ...refundState.reference
          ? [createEvidence(caseId, "Reference", refundState.reference.value)]
          : [],
        createEvidence(caseId, "Refund status", "The message says the refund reached the account"),
        createEvidence(caseId, "Source", item.title, "user_text"),
      ];
    }

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
    // A source that states a yearly cadence must not have its amount treated as
    // monthly and multiplied by twelve. "Your annual subscription renews for
    // £79.99" produced an estimated annual cost of £959.88, which the source
    // never said and which is twelve times the real figure.
    const monthlyValue = extractMonthlyAmount(text);
    const statedAnnualValue = monthlyValue === undefined
      ? extractStatedAnnualAmount(text)
      : undefined;
    const annualValue = annualiseMonthlyAmount(monthlyValue) ?? statedAnnualValue;
    const statesAnnual = statedAnnualValue !== undefined;
    const autoRenewStatus = getEvidenceValue(
      text,
      /auto-renewing|auto renewing|charged automatically until cancelled|charged automatically until canceled|until cancelled|until canceled|renews|recurring/i,
      "Recurring or auto-renewal wording found",
    );

    return [
      createEvidence(
        caseId,
        "Monthly amount",
        monthlyValue === undefined
          ? "Monthly cost not stated"
          : formatPounds(monthlyValue),
      ),
      ...(annualValue !== undefined
        ? [
            createEvidence(
              caseId,
              statesAnnual ? "Annual amount" : "Estimated annual cost",
              `${formatPounds(annualValue)}/year`,
              "detected",
              // A stated yearly figure is a source fact; a x12 estimate is not.
              statesAnnual ? "source_fact" : "derived",
            ),
          ]
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
        createEvidence(caseId, "Gap to check", gap, "manual", "missing"),
      ),
      createEvidence(caseId, "Preparation boundary", "Preparation only. The user reviews and decides what to use.", "manual"),
    ];
  }

  return [
    createEvidence(caseId, "Source", item.title, "user_text"),
    createEvidence(caseId, "Review clue", "No exact evidence detected; review the pasted text manually.", "manual"),
  ];
};

const categoryPriority: Record<AdminCase["category"], number> = {
  bill_increase: 0,
  refund: 1,
  subscription: 2,
  warranty: 3,
  complaint: 4,
  important_reply: 5,
  deadline: 6,
  job_application: 7,
  admin_dispute: 8,
  unknown: 9,
};

const urgencyPriority: Record<AdminCase["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// Security precedence sorts ahead of urgency and category.
//
// One message often produces several findings. A held-parcel scam that demands a
// fee reads as ordinary commerce too, so refund and delivery rules fire on the
// same text and produce their own findings, legitimately. Selection then decided
// between them on urgency and then category, and both security findings carry
// `category: "unknown"`, which is last of ten in categoryPriority. So appending
// something as harmless as "or it will be returned." was enough to hand the
// result to a refund case: the security route, its warnings and its safety
// checklist were discarded, and the demanded fee was rendered as money the
// person might receive.
//
// This is a tier rather than another category number, because the rule is not
// "security is a slightly more important category" but "security is not allowed
// to lose". Urgency cannot express it either: W4 established that an ordinary
// price rise is legitimately high urgency, so promoting on urgency would promote
// the wrong things.
const securityPrecedenceRank = (adminCase: AdminCase) =>
  adminCase.securityPrecedence ? 0 : 1;

export const selectMostImportantCase = (cases: AdminCase[]) =>
  [...cases].sort((first, second) => {
    const securityDifference =
      securityPrecedenceRank(first) - securityPrecedenceRank(second);

    if (securityDifference !== 0) {
      return securityDifference;
    }

    const urgencyDifference =
      urgencyPriority[first.urgency] - urgencyPriority[second.urgency];

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    return categoryPriority[first.category] - categoryPriority[second.category];
  })[0];

export const createAdminCase = (finding: AdminFinding, item: AdminItem): AdminCase => {
  const now = new Date().toISOString();
  const caseId = `case-${finding.id}`;
  const delayRepayAssessment = assessUkTrainDelayRefund(item);
  const isDelayRepayCase = finding.category === "refund" && delayRepayAssessment.isTrainDelayScenario;
  const isApprovedRefundCase = isApprovedRefundFinding(finding, item);
  const isPromisedRefundCase = isPromisedRefundFinding(finding, item);
  const isTravelRecoveryCase = isTravelRecoveryFinding(finding, item);
  const isEnergyPriceChangeCase = isEnergyPriceChangeFinding(finding, item);
  const isEmailSafetyCase = isSuspiciousEmailFinding(finding, item);
  const careerSupportPack = buildCareerSupportPack({ text: `${item.title}\n${item.rawText}` });
  const isCareerSupportCase = isCareerSupportFinding(finding, item);
  const isDecisionEngineCase = finding.category === "admin_dispute";
  const decisionResult = isDecisionEngineCase
    ? analyseDecisionProblem(item.rawText, item.userQuestion)
    : undefined;
  const travelRecovery = extractTravelRecoveryDetails(`${item.title}\n${item.rawText}`);
  const energyPriceChange = extractEnergyAnnualCosts(`${item.title}\n${item.rawText}`);
  const emailSafetyAssessment = assessEmailSafety(`${item.title}\n${item.rawText}`, item.sourceType);
  const chaseDate =
    finding.deadline ??
    addDays(
      new Date(now),
      isApprovedRefundCase || isPromisedRefundCase || isTravelRecoveryCase
        ? 14
        : finding.urgency === "high"
          ? 3
          : 7,
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
        : isPromisedRefundCase
          ? "Refund promised"
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
        : isPromisedRefundCase
          ? "The provider has promised a refund, but the money has not been confirmed received."
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
        : isPromisedRefundCase
          ? finding.suggestedAction
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
    generalAdminFallback: finding.generalAdminFallback,
    securityPrecedence: finding.securityPrecedence,
    // W1's principle applied to timing: consume the shared extraction rather
    // than letting each layer re-derive dates from raw text. Roles travel with
    // the values, so the result and progress layers can tell an event date from
    // a response period.
    timingFacts: (() => {
      const timing = extractGeneralAdmin(`${item.title}\n${item.rawText}`);

      return timing.dates.length > 0 || timing.relativePeriods.length > 0
        ? {
            dates: timing.dates.map((date) => ({
              ...date,
              provenance: timingProvenanceFor(date.sourceQuote, item.sourceDocuments),
            })),
            relativePeriods: timing.relativePeriods,
          }
        : undefined;
    })(),
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
