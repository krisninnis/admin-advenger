export type DecisionDocumentType =
  | "parking_ticket"
  | "debt_collection"
  | "bailiff_notice"
  | "tv_licence"
  | "bank_complaint"
  | "consumer_dispute"
  | "benefits_evidence_prep"
  | "benefits_assessment_report"
  | "benefits_decision"
  | "benefits_appeal"
  | "benefits_review"
  // Benefits Recovery Layer - hidden engines behind Check a message. The user
  // never sees these names; the classifier picks silently (classifier.ts) and
  // every result still flows through the same DecisionResult shape, pipeline,
  // UI, and safety rules as every other document type (see
  // decision-engine-standard.md Section 1).
  | "benefits_uc_statement"
  | "benefits_uc_sanction"
  | "benefits_uc_deductions"
  | "benefits_wca_lcwra"
  | "benefits_migration_notice"
  | "benefits_change_of_circumstances"
  | "council_tax_reduction"
  | "benefits_crisis_support"
  | "hmrc_tax_code_notice"
  | "unknown_admin_dispute";

export type DecisionCaseStrength =
  | "stronger_possible_ground"
  | "possible_ground"
  | "weak_or_missing_evidence"
  | "not_enough_information"
  | "urgent_get_advice";

export type DecisionAmountTreatment =
  | "amount_being_demanded"
  | "amount_mentioned_only"
  | "possible_refund_or_reduction"
  | "no_money_counted";

export type DecisionSourceFact = {
  label: string;
  value: string;
  sourceQuote?: string;
};

export type DecisionConfidenceLevel = "low" | "medium" | "high";

// Answers "how sure is AdminAvenger that it has read this document correctly?" -
// this is about AdminAvenger's own classification/read, never about the
// strength of the user's case (see caseStrength/strengthLabel for that) and
// never rendered to the user as the literal word "high"/"medium"/"low" or a
// percentage - the renderer translates `reason` into plain language.
export type DecisionConfidence = {
  level: DecisionConfidenceLevel;
  reason: string;
};

export type DecisionResult = {
  documentType: DecisionDocumentType;
  title: string;
  plainEnglishSummary: string;
  caseStrength: DecisionCaseStrength;
  strengthLabel: string;
  whatThisLooksLike: string;
  possibleGrounds: string[];

  // Required on every module - never optional, never inferred by the
  // renderer. `confidence` is AdminAvenger's own read of the document.
  // `uncertainty` is what's missing or could change the advice. `cannotKnow`
  // is the honest edge of what this tool can conclude from the document
  // alone. An empty array is a legitimate answer; omitting the field is not.
  confidence: DecisionConfidence;
  uncertainty: string[];
  cannotKnow: string[];

  evidenceNeeded: string[];
  deadlines: string[];
  risks: string[];
  nextSteps: string[];
  safetyNotes: string[];
  draftMessage?: string;
  directAnswer?: string;
  amountMentioned?: string;
  amountTreatment: DecisionAmountTreatment;
  sourceFacts: DecisionSourceFact[];
  // Optional "Questions to answer" section. Only benefits-family results set this
  // today; other modules simply omit it and the UI folds it into the
  // missing-information list.
  questionsToAnswer?: string[];
};

export type DecisionModuleInput = {
  text: string;
  normalisedText: string;
  userQuestion?: string;
};

export type DecisionModule = {
  documentType: DecisionDocumentType;
  detect: (input: DecisionModuleInput) => boolean;
  analyse: (input: DecisionModuleInput) => DecisionResult;
};

export const DECISION_SAFETY_NOTE =
  "AdminAvenger does not give legal advice. It explains the notice, checks common challenge grounds, shows what evidence may help, and prepares wording for you to review.";

export const FORBIDDEN_DECISION_PHRASES = [
  "you will win",
  "guaranteed",
  "definitely unlawful",
  "ignore this",
  "you do not owe this",
  "you definitely qualify",
  "dwp is definitely wrong",
  "you should score",
] as const;

export const BENEFITS_SAFETY_NOTE =
  "AdminAvenger does not give benefits advice or guarantee an award. It helps you understand the stage, organise evidence, prepare questions, and draft wording to review.";
