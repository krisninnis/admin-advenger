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
import { assessUkTrainDelayRefund } from "./delayRepayAssessment";

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

const moneyPattern = /(?:\u00a3|Â£|GBP\s*|\?\s*)\d+(?:\.\d{1,2})?/i;
const refundWindowPattern =
  /(?:within\s+)?\d+\s*(?:to|-)\s*\d+\s+working days|within\s+\d+\s+working days/i;
const refundReferencePattern = /(?:reference|ref)\s*:?\s*([A-Z]{1,5}\d{3,}[A-Z0-9-]*)/i;

const isApprovedRefundFinding = (finding: AdminFinding, item: AdminItem) =>
  finding.category === "refund" &&
  (/^refund approved$/i.test(finding.title) ||
    /refund (?:has been )?approved|refund will be returned|returned to your original payment method|refund processed|refund issued/i.test(
      `${item.title} ${item.rawText}`,
    ));

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

  const lowerText = text.toLowerCase();
  const money = getEvidenceValue(text, /(?:£|GBP\s?)\d+(?:\.\d{2})?/i, "Amount not stated");
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
      createEvidence(caseId, "Missing: Payment method details", "Not found yet", "manual"),
      createEvidence(caseId, "Missing: Exact refund arrival date", "Not found yet", "manual"),
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
    return [
      createEvidence(caseId, "Monthly amount", money === "Amount not stated" ? "Monthly cost not stated" : money),
      createEvidence(
        caseId,
        "Renewal clue",
        getEvidenceValue(text, /subscription|renews|renewal|monthly|annual|membership|trial/i, "Recurring payment wording found"),
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
  const chaseDate =
    finding.deadline ??
    addDays(new Date(now), isApprovedRefundCase ? 14 : finding.urgency === "high" ? 3 : 7);
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
          : finding.title,
    category: finding.category,
    summary: isBroadbandPriceRiseCase
      ? broadbandPriceRiseSummary
      : isDelayRepayCase
        ? "AdminAvenger found a possible UK train delay refund case. This is not an eligibility decision: missing evidence and the operator's current Delay Repay policy still need checking."
        : isApprovedRefundCase
          ? "A refund has been approved and should be returned to the original payment method."
        : finding.summary,
    valueLabel: isBroadbandPriceRiseCase
      ? broadbandPriceRiseAssessment.annualIncrease
        ? `${broadbandPriceRiseAssessment.annualIncrease}/year if unchanged`
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
        : finding.suggestedAction,
    chaseDate,
    broadbandPriceRiseAssessment: isBroadbandPriceRiseCase
      ? broadbandPriceRiseAssessment
      : undefined,
    delayRepayAssessment: isDelayRepayCase ? delayRepayAssessment : undefined,
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
