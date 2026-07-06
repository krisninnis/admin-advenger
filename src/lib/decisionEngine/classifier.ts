import type { DecisionDocumentType } from "./types";

const hasAny = (text: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(text));

// Broad "is this benefits-related at all" detection. Kept last in the overall
// classifier priority order (see classifyDecisionDocument below) so that a
// message which is clearly a parking/bailiff/TV Licence/bank/consumer/council
// tax reduction matter still wins even if it also happens to contain a
// generic word like "appeal" or "points". Covers the whole Benefits Recovery
// Layer (PIP, Universal Credit, WCA/LCWRA, migration, change of
// circumstances, crisis support) - Council Tax Reduction is classified
// separately further up because it is council-run, not DWP-run, and would
// otherwise collide with the "council tax" arrears pattern used for debt.
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
  /work capability assessment/i,
  /\bwca\b/i,
  /\blcwra\b/i,
  /\blcw\b/i,
  /\besa\b/i,
  /\besa50\b/i,
  /\besa85\b/i,
  /\buc50\b/i,
  /fit for work/i,
  /limited capability for work/i,
  /attendance allowance/i,
  /adult disability payment/i,
  /\badp\b/i,
  /\btribunal\b/i,
  /\bsscs1\b/i,
  /\bhmcts\b/i,
  /universal credit/i,
  /\buc\b/i,
  /migration notice/i,
  /managed migration/i,
  /move to universal credit/i,
  /moving to universal credit/i,
  /change of circumstances/i,
  /report a change/i,
  /changes you must report/i,
  /discretionary housing payment/i,
  /\bdhp\b/i,
  /local welfare assistance/i,
  /crisis grant/i,
  /welfare assistance scheme/i,
  /hardship fund/i,
  /budgeting advance/i,
  /short term benefit advance/i,
  /foodbank/i,
  /food bank/i,
  /overpayment/i,
  /third party deduction/i,
  /debt owed to dwp/i,
  /no food/i,
  /nothing to eat/i,
  /cannot afford food/i,
  /can't afford food/i,
  /no heating/i,
  /cannot heat/i,
  /can't heat/i,
  /homeless/i,
  /evicted/i,
  /eviction/i,
  /nowhere to sleep/i,
];

// Stage sub-classification, used once we already know the message is benefits-related.
// Checked most-specific/most-urgent first, matching the pattern used for
// bailiff-before-parking above.
const benefitsUcStatementPatterns = [
  /universal credit statement/i,
  /\bstatement\b/i,
  /assessment period/i,
  /what we take off/i,
  /standard allowance/i,
];

const benefitsUcSanctionPatterns = [/\bsanction/i];

const benefitsMigrationNoticePatterns = [
  /migration notice/i,
  /managed migration/i,
  /move to universal credit/i,
  /moving to universal credit/i,
  /universal credit migration/i,
  /deadline day/i,
  /(?:tax credits?|income support|jobseeker's allowance|\bjsa\b)[^.]{0,40}(?:will end|is ending|ends? on|stops?)/i,
];

const benefitsUcDeductionsPatterns = [
  /overpayment (?:decision|notice)/i,
  /recovery of (?:an )?overpayment/i,
  /overpayment recovery/i,
  /third party deduction/i,
  /budgeting advance repayment/i,
  /debt owed to (?:dwp|the department)/i,
  /we (?:are|will be) (?:recovering|taking|deducting)/i,
  /deduction[a-z]* from your universal credit/i,
];

const benefitsChangeOfCircumstancesPatterns = [
  /change of circumstances/i,
  /report a change/i,
  /changes you must report/i,
  /tell us about a change/i,
  /you must tell us if/i,
];

const benefitsCrisisSupportPatterns = [
  /crisis grant/i,
  /local welfare assistance/i,
  /discretionary housing payment/i,
  /\bdhp\b/i,
  /welfare assistance scheme/i,
  /hardship fund/i,
  /\bbudgeting advance\b/i,
  /short term benefit advance/i,
  /foodbank/i,
  /food bank/i,
  /emergency payment/i,
  /no food/i,
  /nothing to eat/i,
  /cannot afford food/i,
  /can't afford food/i,
  /no heating/i,
  /cannot heat/i,
  /can't heat/i,
  /homeless/i,
  /evicted/i,
  /eviction/i,
  /nowhere to sleep/i,
];

const benefitsWcaLcwraPatterns = [
  /work capability assessment/i,
  /\bwca\b/i,
  /\blcwra\b/i,
  /\blcw\b/i,
  /\besa\b/i,
  /\buc50\b/i,
  /\besa50\b/i,
  /\besa85\b/i,
  /fit for work/i,
  /limited capability for work/i,
];

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
  | "benefits_uc_statement"
  | "benefits_uc_sanction"
  | "benefits_uc_deductions"
  | "benefits_wca_lcwra"
  | "benefits_migration_notice"
  | "benefits_change_of_circumstances"
  | "benefits_crisis_support"
> => {
  if (hasAny(text, benefitsMigrationNoticePatterns)) {
    return "benefits_migration_notice";
  }

  if (hasAny(text, benefitsUcStatementPatterns)) {
    return "benefits_uc_statement";
  }

  if (hasAny(text, benefitsUcSanctionPatterns)) {
    return "benefits_uc_sanction";
  }

  if (hasAny(text, benefitsUcDeductionsPatterns)) {
    return "benefits_uc_deductions";
  }

  if (hasAny(text, benefitsChangeOfCircumstancesPatterns)) {
    return "benefits_change_of_circumstances";
  }

  if (hasAny(text, benefitsCrisisSupportPatterns)) {
    return "benefits_crisis_support";
  }

  if (hasAny(text, benefitsWcaLcwraPatterns)) {
    return "benefits_wca_lcwra";
  }

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

// Council Tax Reduction/Support (CTR/CTS) is run by the local council under its
// own local scheme, not DWP - a different engine to both the DWP benefits
// family and to council tax arrears/debt collection. Checked before the debt
// patterns below, because a CTR letter almost always contains the words
// "council tax" too, which would otherwise be classified as debt_collection.
const councilTaxReductionPatterns = [
  /council tax reduction/i,
  /council tax support/i,
  /\bctr\b/i,
  /\bcts\b/i,
  /second adult rebate/i,
  /council tax support scheme/i,
  /local council tax (?:support|reduction) scheme/i,
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

  if (hasAny(normalisedText, councilTaxReductionPatterns)) {
    return "council_tax_reduction";
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
