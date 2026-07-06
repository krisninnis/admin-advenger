import { classifyDecisionDocument, normaliseDecisionText } from "./classifier";
import { analyseBankComplaint } from "./modules/bank";
import type { BenefitsDocumentType } from "./modules/benefits";
import { analyseBenefitsProblem } from "./modules/benefits";
import { analyseChangeOfCircumstances } from "./modules/changeOfCircumstances";
import { analyseCouncilTaxReduction } from "./modules/councilTaxReduction";
import { analyseCrisisSupport } from "./modules/crisisSupport";
import { analyseDebtOrBailiff } from "./modules/debt";
import { analyseConsumerDispute } from "./modules/consumer";
import { analyseMigrationNotice } from "./modules/migrationNotice";
import { analyseParkingTicket } from "./modules/parking";
import { analyseTvLicence } from "./modules/tvLicence";
import { analyseUcDeductions } from "./modules/ucDeductions";
import { analyseUcSanction } from "./modules/ucSanction";
import { analyseUcStatement } from "./modules/ucStatement";
import { analyseUnknownAdminDispute } from "./modules/unknown";
import { analyseWcaLcwra } from "./modules/wcaLcwra";
import type { DecisionResult } from "./types";

// Flattens every user-facing string on a DecisionResult into one lowercase-able
// block of text, so guardrail tests can check the whole result for forbidden
// wording in one pass instead of checking each field by hand. Includes
// confidence/uncertainty/cannotKnow too, since those are just as much
// user-facing text as everything else and must obey the same safety wording
// rules (decision-engine-standard.md Section 5).
export const flattenDecisionResultText = (result: DecisionResult): string =>
  [
    result.title,
    result.plainEnglishSummary,
    result.strengthLabel,
    result.whatThisLooksLike,
    ...result.possibleGrounds,
    result.confidence.reason,
    ...result.uncertainty,
    ...result.cannotKnow,
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

    case "council_tax_reduction":
      return analyseCouncilTaxReduction(input);

    case "benefits_evidence_prep":
    case "benefits_assessment_report":
    case "benefits_decision":
    case "benefits_appeal":
    case "benefits_review":
      return analyseBenefitsProblem(input, documentType as BenefitsDocumentType);

    case "benefits_uc_statement":
      return analyseUcStatement(input);

    case "benefits_uc_sanction":
      return analyseUcSanction(input);

    case "benefits_uc_deductions":
      return analyseUcDeductions(input);

    case "benefits_wca_lcwra":
      return analyseWcaLcwra(input);

    case "benefits_migration_notice":
      return analyseMigrationNotice(input);

    case "benefits_change_of_circumstances":
      return analyseChangeOfCircumstances(input);

    case "benefits_crisis_support":
      return analyseCrisisSupport(input);

    case "unknown_admin_dispute":
    default:
      return analyseUnknownAdminDispute(input);
  }
};
