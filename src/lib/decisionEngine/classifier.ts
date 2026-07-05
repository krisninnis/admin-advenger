import type { DecisionDocumentType } from "./types";

const hasAny = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

// Broad "is this benefits/PIP related at all" detection. Kept last in the overall
// classifier priority order (see classifyDecisionDocument below) so that a message
// which is clearly a parking/bailiff/TV Licence/bank/consumer matter still wins even
// if it also happens to contain a generic word like "appeal" or "points".
const benefitsPatterns = [
  /\bpip\b/i,
  /personal independence payment/i,
  /dwp decision letter/i,
  /\bdwp\b/i,
  /mandatory reconsideration/i,
  /\bmr notice\b/i,
  /assessment report/i,
  /\bpa4\b/i,
  /\bpip2\b/i,
  /\bar1\b/i,
  /award review/i,
  /daily living/i,
  /\bdescriptors?\b/i,
  /health assessment/i,
  /\buc health\b/i,
  /\bwca\b/i,
  /\blcwra\b/i,
  /\blcw\b/i,
  /\besa\b/i,
  /attendance allowance/i,
  /adult disability payment/i,
  /\badp\b/i,
  /\btribunal\b/i,
  /\bsscs1\b/i,
  /\bhmcts\b/i,
];

// Stage sub-classification, used once we already know the message is benefits-related.
// Checked most-specific/most-urgent first, matching the pattern used for
// bailiff-before-parking above.
const benefitsAppealPatterns = [
  /\bappeal\b/i,
  /\btribunal\b/i,
  /\bsscs1\b/i,
  /\bhmcts\b/i,
  /mandatory reconsideration notice/i,
  /\bhearing\b/i,
  /\bbundle\b/i,
  /\bsubmission\b/i,
];

const benefitsAssessmentReportPatterns = [
  /\bpa4\b/i,
  /assessment report/i,
  /\bassessor\b/i,
  /informal observations?/i,
  /functional history/i,
];

const benefitsReviewPatterns = [/\bar1\b/i, /award review/i, /review form/i];

const benefitsDecisionPatterns = [
  /we have decided/i,
  /you scored/i,
  /\b0 points\b/i,
  /\bdecision date\b/i,
  /\bmandatory reconsideration\b/i,
  /\bone month\b/i,
];

export const detectBenefitsDocumentType = (
  text: string,
): Extract<
  DecisionDocumentType,
  | "benefits_appeal"
  | "benefits_assessment_report"
  | "benefits_review"
  | "benefits_decision"
  | "benefits_evidence_prep"
> => {
  if (hasAny(text, benefitsAppealPatterns)) {
    return "benefits_appeal";
  }

  if (hasAny(text, benefitsAssessmentReportPatterns)) {
    return "benefits_assessment_report";
  }

  if (hasAny(text, benefitsReviewPatterns)) {
    return "benefits_review";
  }

  if (hasAny(text, benefitsDecisionPatterns)) {
    return "benefits_decision";
  }

  return "benefits_evidence_prep";
};

const parkingPatterns = [
  /\bpcn\b/i,
  /penalty charge notice/i,
  /parking charge notice/i,
  /private parking/i,
  /notice to keeper/i,
  /\bpopla\b/i,
  /\bias\b/i,
  /parking operator/i,
  /contravention/i,
];

const bailiffPatterns = [
  /bailiff/i,
  /enforcement agent/i,
  /notice of enforcement/i,
  /warrant/i,
  /liability order/i,
  /\bccj\b/i,
  /high court enforcement/i,
  /seizure/i,
];

const debtPatterns = [
  /debt collector/i,
  /collection agency/i,
  /arrears/i,
  /default notice/i,
  /outstanding balance/i,
  /water rates/i,
  /council tax/i,
  /passed to collections/i,
];

const tvLicencePatterns = [
  /tv licence/i,
  /tv licensing/i,
  /bbc iplayer/i,
  /live tv/i,
  /no licence needed/i,
  /enforcement visit/i,
];

const bankPatterns = [
  /financial ombudsman/i,
  /final response/i,
  /deadlock letter/i,
  /chargeback/i,
  /unfair fee/i,
  /bank charge/i,
  /account closed/i,
  /default marker/i,
];

const consumerPatterns = [
  /refund refused/i,
  /faulty item/i,
  /not fit for purpose/i,
  /replacement/i,
  /repair/i,
  /missing parcel/i,
  /not delivered/i,
  /warranty/i,
  /product support/i,
  /consumer rights/i,
];

export const normaliseDecisionText = (text: string) =>
  text.trim().replace(/\s+/g, " ");

export const classifyDecisionDocument = (
  text: string,
): DecisionDocumentType => {
  const normalisedText = normaliseDecisionText(text);

  if (!normalisedText) {
    return "unknown_admin_dispute";
  }

  if (hasAny(normalisedText, bailiffPatterns)) {
    return "bailiff_notice";
  }

  if (hasAny(normalisedText, parkingPatterns)) {
    return "parking_ticket";
  }

  if (hasAny(normalisedText, tvLicencePatterns)) {
    return "tv_licence";
  }

  if (hasAny(normalisedText, bankPatterns)) {
    return "bank_complaint";
  }

  if (hasAny(normalisedText, debtPatterns)) {
    return "debt_collection";
  }

  if (hasAny(normalisedText, consumerPatterns)) {
    return "consumer_dispute";
  }

  if (hasAny(normalisedText, benefitsPatterns)) {
    return detectBenefitsDocumentType(normalisedText);
  }

  return "unknown_admin_dispute";
};
