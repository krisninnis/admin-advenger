import type { DecisionResult } from "./lib/decisionEngine/types";
import type { CareerSupportPack } from "./lib/careerSupportPack";
import type {
  DocumentStatus,
  ExtractedDate,
  ExtractedRelativePeriod,
  StructuredGeneralAdminFallback,
} from "./lib/generalAdminExtraction";

export type SourceType =
  | "email"
  | "pdf"
  | "receipt"
  | "bill"
  | "note"
  | "job_message"
  | "other";

export type FindingCategory =
  | "refund"
  | "complaint"
  | "subscription"
  | "deadline"
  | "job_application"
  | "bill_increase"
  | "warranty"
  | "important_reply"
  | "admin_dispute"
  | "unknown";

export type FindingUrgency = "low" | "medium" | "high";

export type FindingConfidence = "low" | "medium" | "high";

export type MoneyImpactFrequency = "one_off" | "monthly" | "annual" | "unknown";

export type MoneyImpactStatus = "potential" | "pending" | "confirmed" | "rejected" | "unknown";

export type MoneyImpact = {
  amount?: number;
  currency: "GBP" | "unknown";
  frequency: MoneyImpactFrequency;
  label: string;
  status: MoneyImpactStatus;
};

export type FindingStatus =
  | "new"
  | "to_do"
  | "drafted"
  | "sent_manually"
  | "waiting"
  | "resolved"
  | "ignored"
  | "no_action_needed";

export type AdminCaseStatus =
  | "new"
  | "reviewing"
  | "ready_to_act"
  | "drafted"
  | "sent_manually"
  | "waiting"
  | "chasing"
  | "resolved"
  | "ignored"
  | "no_action_needed"
  | "evidence_saved";

export type AdminItem = {
  id: string;
  title: string;
  sourceType: SourceType;
  rawText: string;
  createdAt: string;
  analysedAt?: string;
  userQuestion?: string;
};

export type AdminFinding = {
  id: string;
  itemId: string;
  category: FindingCategory;
  title: string;
  summary: string;
  whyItMatters: string;
  suggestedAction: string;
  estimatedValue?: string;
  urgency: FindingUrgency;
  deadline?: string;
  // Source-grounded document status for the general-admin reads (receipts,
  // deliveries, appointments, Direct Debit bills, security alerts). Optional so
  // every existing finding remains valid without change.
  documentStatus?: DocumentStatus;
  generalAdminFallback?: StructuredGeneralAdminFallback;
  /**
   * Marks a finding that exists because the input looked security-shaped, so it
   * must outrank every ordinary finding when one message produces several.
   *
   * A scam message usually also reads as ordinary commerce: a held parcel, a fee,
   * a refund that "will follow". Those words legitimately produce refund and
   * delivery findings, and category priority used to hand selection to them,
   * discarding the security route entirely. This flag makes the precedence
   * explicit instead of leaving it to a category table where the security
   * findings sit under `unknown`.
   *
   * Only the two security finding creators set it: createEmailSafetyFinding and
   * createSecurityAlertFinding.
   */
  securityPrecedence?: true;
  confidence: FindingConfidence;
  status: FindingStatus;
  createdAt: string;
};

export type AdminDraft = {
  id: string;
  findingId: string;
  subject: string;
  body: string;
  recommendedNextStep: string;
  chaseAfterDays: number;
  createdAt: string;
};

export type PreparedMessageDraft = {
  id: string;
  messageType: string;
  suggestedSubject: string;
  recipientHint?: string;
  fullText: string;
  evidenceUsed: string[];
  missingBeforeSending: string[];
  safetyNote: string;
  createdAt: string;
};

export type OpportunityType =
  | "account_outcome_confirmation"
  | "refund_expected"
  | "travel_extra_cost_recovery"
  | "travel_evidence_check"
  | "subscription_recurring_charge"
  | "energy_price_change"
  | "money_back"
  | "save_money"
  | "deadline"
  | "evidence"
  | "delivery_update"
  | "delivery_issue"
  | "subscription_renewal"
  | "receipt_guardian"
  | "warranty_or_fault"
  | "bill_or_price_increase"
  | "suspicious_email_risk"
  | "admin_dispute_check"
  | "career_support"
  | "no_action_needed"
  | "needs_human_check"
  | "unknown";

export type OpportunityCard = {
  id: string;
  caseId: string;
  opportunityType: OpportunityType;
  title: string;
  plainEnglishSummary: string;
  moneyAtStake?: MoneyImpact;
  potentialSaving?: MoneyImpact;
  potentialRecovery?: MoneyImpact;
  confirmedSaving?: MoneyImpact;
  confirmedRecovery?: MoneyImpact;
  annualisedAmount?: MoneyImpact;
  moneyImpactRows?: MoneyImpact[];
  deadline?: string;
  deadlineLabel?: string;
  providerOrRetailer?: string;
  opportunityNote?: string;
  statusLabel?: string;
  evidenceFound: string[];
  missingInformation: string[];
  nextBestAction: string;
  recommendedPathSteps: string[];
  riskLevel: "low" | "medium" | "high";
  confidenceLabel: "low" | "medium" | "high";
  sourceCaseType: FindingCategory;
  createdAt: string;
  updatedAt: string;
};

export type EmailSafetyRiskBand =
  | "lower_risk_verify"
  | "verify_before_acting"
  | "high_risk_signals";

export type EmailSafetyAssessment = {
  isEmailLike: boolean;
  riskBand: EmailSafetyRiskBand;
  riskBandLabel:
    | "Looks lower risk, but still verify"
    | "Caution - verify before acting"
    | "High-risk signals found";
  riskBandExplanation: string;
  riskSignals: string[];
  cautionSignals: string[];
  ordinarySignals: string[];
  senderAddress?: string;
  replyToAddress?: string;
  senderDomain?: string;
  replyToDomain?: string;
  replyToMismatch: boolean;
  cannotKnow: string[];
  nextAction: string;
  disclaimer: string;
};

export type ImpactEntryType =
  | "potential_saving"
  | "potential_recovery"
  | "pending_recovery"
  | "under_review"
  | "confirmed_saved"
  | "confirmed_recovered"
  | "cost_increase_avoided"
  | "deadline_protected"
  | "no_saving"
  | "rejected";

export type ImpactEntryStatus =
  | "potential"
  | "pending"
  | "reviewing"
  | "confirmed"
  | "rejected"
  | "not_applicable";

export type ImpactEntry = {
  id: string;
  caseId: string;
  title: string;
  type: ImpactEntryType;
  amount?: number;
  currency: "GBP" | "unknown";
  frequency: MoneyImpactFrequency;
  status: ImpactEntryStatus;
  evidenceNote: string;
  proofAttached: boolean;
  proofImageName?: string;
  proofImageDataUrl?: string;
  proofText?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OutcomeConfirmationType =
  | "got_money_back"
  | "reduced_bill"
  | "cancelled_before_charge"
  | "avoided_price_rise"
  | "protected_deadline"
  | "resolved_no_money"
  | "not_worth_pursuing"
  | "rejected_unsuccessful"
  | "still_waiting";

export type DelayRepayAssessment = {
  workflow: "uk_train_delay_refund";
  isTrainDelayScenario: boolean;
  extracted: {
    operator?: string;
    journey?: string;
    travelDate?: string;
    delayDuration?: string;
    ticketReference?: string;
  };
  evidenceFound: Array<{
    label: string;
    value: string;
  }>;
  evidenceMissing: string[];
  unknownInformation: string[];
  confidenceScore: number;
  confidenceExplanation: string;
  ruleCaveat: string;
  recommendedNextStep: string;
};

export type BroadbandPriceRiseAssessment = {
  providerName?: string;
  serviceType?: "broadband" | "mobile" | "broadband_and_mobile" | "unknown";
  oldMonthlyPrice?: string;
  newMonthlyPrice?: string;
  monthlyIncrease?: string;
  annualIncrease?: string;
  effectiveDate?: string;
  responseDeadline?: string;
  contractDate?: string;
  contractDateType?: "start" | "renewal" | "unknown";
  contractDateConfidence?: "low" | "medium" | "high";
  contractDateRegime?: "missing" | "newer_or_renewed" | "older" | "unknown";
  contractTimingExplanation: string;
  contractStartOrRenewalDate?: string;
  contractClues: string[];
  optionsMentioned: string[];
  providerWordingFound: string[];
  rightsConfirmed: string[];
  rightsNeedChecking: string[];
  rightsClues: string[];
  evidenceFound: string[];
  evidenceMissing: string[];
  unknowns: string[];
  confidence: number;
  documentMatchConfidence: "low" | "medium" | "high";
  actionConfidence: "needs_more_info" | "low" | "medium" | "high";
  draftSafetyConfidence?: "needs_review" | "low" | "medium" | "high";
  confidenceExplanation: string;
  documentMatchExplanation: string;
  actionConfidenceExplanation: string;
  caveat: string;
};

export type DelayRepayExtractedFacts = {
  operator?: string;
  journey?: string;
  travelDate?: string;
  delayDuration?: string;
  ticketReference?: string;
};

export type DelayRepayExtractionResult = {
  extracted: DelayRepayExtractedFacts;
  missingFields: Array<keyof DelayRepayExtractedFacts>;
  extractionConfidence: "low" | "medium" | "high";
  extractionConfidenceScore: number;
  source: "local_mock" | "server_ai_placeholder";
};

export type AiDocumentType =
  | "broadband_price_rise"
  | "subscription_renewal"
  | "delivery_issue"
  | "warranty_issue"
  | "train_delay"
  | "travel_disruption"
  | "bill_or_price_increase"
  | "deadline_or_important_reply"
  | "unknown";

export type AiServiceType =
  | "broadband"
  | "mobile"
  | "broadband_and_mobile"
  | "tv_subscription"
  | "energy"
  | "travel"
  | "retail"
  | "unknown";

export type AiConfidenceLevel = "low" | "medium" | "high";

export type AiExtractedAmount = {
  label: string;
  value: number | null;
  currency: "GBP" | "unknown";
  frequency: "one_off" | "monthly" | "annual" | "unknown";
  sourceQuote: string;
};

export type AiExtractedDate = {
  label: string;
  value: string | null;
  sourceQuote: string;
};

export type AiExtractedReference = {
  label: string;
  value: string;
  sourceQuote: string;
};

export type AiExtractionResult = {
  documentType: AiDocumentType;
  summary: string;
  providerName: string | null;
  serviceType: AiServiceType | null;
  amounts: AiExtractedAmount[];
  dates: AiExtractedDate[];
  referenceNumbers: AiExtractedReference[];
  contractClues: string[];
  optionsMentioned: string[];
  rightsConfirmed: string[];
  rightsNeedChecking: string[];
  deadlines: AiExtractedDate[];
  evidenceQuotes: string[];
  missingInformation: string[];
  confidence: {
    documentType: AiConfidenceLevel;
    factExtraction: AiConfidenceLevel;
    actionability: AiConfidenceLevel;
  };
  warnings: string[];
};

export type ValidationTestRecord = {
  id: string;
  testerLabel: string;
  scenarioUsed: string;
  completedFlow: boolean;
  understoodAssessment: boolean;
  understoodConfidence: boolean;
  trustedDraft: boolean;
  knewNextStep: boolean;
  caredAboutProblem: boolean;
  wouldUseOnMobile: boolean;
  hesitation: string;
  blocker: string;
  notes: string;
  createdAt: string;
};

export type FeedbackFeatureRequest =
  | "better_train_refund_flow"
  | "screenshots_photos"
  | "subscriptions"
  | "bill_increases"
  | "warranties"
  | "job_follow_ups"
  | "other";

export type FeedbackEntry = {
  id: string;
  tryingToDo: string;
  confusedBy: string;
  usefulChange: string;
  nextFeature: FeedbackFeatureRequest;
  notes: string;
  createdAt: string;
};

// What a row in a case's evidence list actually is.
//
// "Evidence found" used to hold four different things at once - facts read from
// the source, arithmetic derived from those facts, placeholders for information
// that is absent, and caveats or provenance - and the progress widget reported
// the raw length as the number of pieces of evidence found. Only a source fact
// may be counted as found.
//
// `source` already carried most of this signal, so `kind` is optional: when it
// is absent the meaning is derived from `source` (see resolveEvidenceKind).
// Existing templates therefore keep working unchanged, and only the rows whose
// `source` marker disagrees with their meaning need to say so explicitly.
export type EvidenceKind = "source_fact" | "derived" | "missing" | "informational";

export type EvidenceItem = {
  id: string;
  caseId: string;
  label: string;
  value: string;
  source: "user_text" | "detected" | "manual";
  kind?: EvidenceKind;
};

export type CaseTimelineEvent = {
  id: string;
  caseId: string;
  title: string;
  description: string;
  createdAt: string;
};

export type AdminCase = {
  id: string;
  findingId: string;
  itemId: string;
  title: string;
  category: FindingCategory;
  summary: string;
  valueLabel?: string;
  urgency: FindingUrgency;
  confidence: FindingConfidence;
  status: AdminCaseStatus;
  nextAction: string;
  chaseDate?: string;
  outcome?: string;
  delayRepayAssessment?: DelayRepayAssessment;
  broadbandPriceRiseAssessment?: BroadbandPriceRiseAssessment;
  emailSafetyAssessment?: EmailSafetyAssessment;
  decisionResult?: DecisionResult;
  careerSupportPack?: CareerSupportPack;
  /** Carried from the finding. See AdminFinding.securityPrecedence. */
  securityPrecedence?: true;
  generalAdminFallback?: StructuredGeneralAdminFallback;
  /**
   * Timing facts exactly as the shared extractor found them, so the result and
   * progress layers can tell an event date from a stated deadline, and a refund
   * window from a response period.
   *
   * Downstream layers used to receive a label and a string, and relative periods
   * had no route into the timing view at all, so a usable window read as "no
   * date gathered". The extractor's own types are reused rather than a parallel
   * date model, and the field is optional so every existing case stays valid.
   *
   * Never converted into a calendar date: a working-day window stays a window.
   */
  timingFacts?: {
    readonly dates: readonly ExtractedDate[];
    readonly relativePeriods: readonly ExtractedRelativePeriod[];
  };
  createdAt: string;
  updatedAt: string;
  evidence: EvidenceItem[];
  timeline: CaseTimelineEvent[];
};
