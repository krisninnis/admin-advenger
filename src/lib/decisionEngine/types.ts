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

export type DecisionResult = {
  documentType: DecisionDocumentType;
  title: string;
  plainEnglishSummary: string;
  caseStrength: DecisionCaseStrength;
  strengthLabel: string;
  whatThisLooksLike: string;
  possibleGrounds: string[];
  evidenceNeeded: string[];
  deadlines: string[];
  risks: string[];
  nextSteps: string[];
  safetyNotes: string[];
  draftMessage?: string;
  amountMentioned?: string;
  amountTreatment: DecisionAmountTreatment;
  sourceFacts: DecisionSourceFact[];
  // Optional "Questions to answer" section. Only benefits/PIP results set this today;
  // other modules simply omit it and the UI folds it into the missing-information list.
  questionsToAnswer?: string[];
};

export type DecisionModuleInput = {
  text: string;
  normalisedText: string;
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
