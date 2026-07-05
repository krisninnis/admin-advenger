import { classifyDecisionDocument, normaliseDecisionText } from "./classifier";
import { analyseBankComplaint } from "./modules/bank";
import type { BenefitsDocumentType } from "./modules/benefits";
import { analyseBenefitsProblem } from "./modules/benefits";
import { analyseDebtOrBailiff } from "./modules/debt";
import { analyseConsumerDispute } from "./modules/consumer";
import { analyseParkingTicket } from "./modules/parking";
import { analyseTvLicence } from "./modules/tvLicence";
import { analyseUnknownAdminDispute } from "./modules/unknown";
import type { DecisionResult } from "./types";

// Flattens every user-facing string on a DecisionResult into one lowercase-able
// block of text, so guardrail tests can check the whole result for forbidden
// wording in one pass instead of checking each field by hand.
export const flattenDecisionResultText = (result: DecisionResult): string =>
  [
    result.title,
    result.plainEnglishSummary,
    result.strengthLabel,
    result.whatThisLooksLike,
    ...result.possibleGrounds,
    ...result.evidenceNeeded,
    ...result.deadlines,
    ...result.risks,
    ...result.nextSteps,
    ...result.safetyNotes,
    result.draftMessage ?? "",
    result.amountMentioned ?? "",
    ...result.sourceFacts.map((fact) => `${fact.label} ${fact.value} ${fact.sourceQuote ?? ""}`),
    ...(result.questionsToAnswer ?? []),
  ].join(" \n ");

export const analyseDecisionProblem = (text: string): DecisionResult => {
  const normalisedText = normaliseDecisionText(text);
  const documentType = classifyDecisionDocument(normalisedText);
  const input = { text, normalisedText };

  switch (documentType) {
    case "parking_ticket":
      return analyseParkingTicket(input);

    case "bailiff_notice":
    case "debt_collection":
      return analyseDebtOrBailiff(input, documentType);

    case "tv_licence":
      return analyseTvLicence(input);

    case "bank_complaint":
      return analyseBankComplaint(input);

    case "consumer_dispute":
      return analyseConsumerDispute(input);

    case "benefits_evidence_prep":
    case "benefits_assessment_report":
    case "benefits_decision":
    case "benefits_appeal":
    case "benefits_review":
      return analyseBenefitsProblem(input, documentType as BenefitsDocumentType);

    case "unknown_admin_dispute":
    default:
      return analyseUnknownAdminDispute(input);
  }
};
