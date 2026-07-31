import type {
  AdminCaseStatus,
  ImpactEntryType,
  OpportunityType,
} from "../../types";
import type { NextStepAction } from "../guidedNextSteps";

export const PUBLIC_MESSAGE_CORPUS_VERSION = "public-message-v1" as const;

export type PublicMessageCategory =
  | "bills_accounts_services"
  | "refunds_purchases"
  | "complaints_disputes"
  | "benefits_public_administration"
  | "employment_income"
  | "housing_utilities"
  | "bereavement_general"
  | "security_scams"
  | "neutral_low_action";

export type PublicMessageRisk = "low" | "medium" | "high";

export type PublicMessageAmountClassification =
  | "display_only"
  | "amount_requested"
  | "balance_under_review"
  | "former_balance"
  | "refund_promised"
  | "refund_issued"
  | "refund_received"
  | "store_credit"
  | "recurring_charge"
  | "automatic_collection"
  | "unknown";

export type PublicMessageSourceFacts = {
  dates?: readonly string[];
  relativePeriods?: readonly string[];
  amounts?: readonly {
    value: number;
    currency: "GBP";
    role: string;
  }[];
  references?: readonly string[];
  dependencies?: readonly string[];
  statusIndicators?: readonly string[];
};

export type PublicMessageRouteOutcome =
  | "general_public_flow"
  | "public_scope_boundary"
  | "security_primary";

export type PublicMessageAssertion =
  | { type: "title_concept"; alternatives: readonly string[] }
  | { type: "status"; allowed: readonly AdminCaseStatus[] }
  | { type: "opportunity"; allowed: readonly OpportunityType[] }
  | { type: "next_step"; allowed: readonly NextStepAction["kind"][] }
  | { type: "visible_concept"; alternatives: readonly string[] }
  | { type: "prohibited_concept"; value: string }
  | { type: "source_date"; value: string }
  | { type: "source_period"; value: string }
  | { type: "source_reference"; value: string }
  | { type: "source_amount"; value: number; classification: PublicMessageAmountClassification }
  | { type: "dependency"; value: string }
  | { type: "support_route"; kind: "official" | "independent" };

export type PublicMessageExpectedBehaviour = {
  primaryMeaning: string;
  titleConcepts?: readonly (string | readonly string[])[];
  routeOutcome?: PublicMessageRouteOutcome;
  allowedStatuses?: readonly AdminCaseStatus[];
  opportunityTypes?: readonly OpportunityType[];
  requiredVisibleConcepts: readonly (string | readonly string[])[];
  prohibitedVisibleConcepts: readonly string[];
  expectedDates?: readonly string[];
  expectedRelativePeriods?: readonly string[];
  expectedReferences?: readonly string[];
  amount?: {
    value: number;
    classification: PublicMessageAmountClassification;
    countedInMoneyTracker: false;
  };
  amounts?: readonly {
    value: number;
    classification: PublicMessageAmountClassification;
    sourceRole: string;
    countedInMoneyTracker: false;
  }[];
  nextStepKinds?: readonly NextStepAction["kind"][];
  allowedImpactTypes?: readonly ImpactEntryType[];
  suggestOfficialVerification?: boolean;
  suggestIndependentSupport?: boolean;
  assertions?: readonly PublicMessageAssertion[];
};

export type PublicMessageScenario = {
  id: string;
  corpusVersion: typeof PUBLIC_MESSAGE_CORPUS_VERSION;
  category: PublicMessageCategory;
  subcategory: string;
  message: string;
  userQuestion?: string;
  risk: PublicMessageRisk;
  sourceFacts: PublicMessageSourceFacts;
  expected: PublicMessageExpectedBehaviour;
  rationale: string;
  provenance: {
    kind: "synthetic_pattern" | "exact_synthetic_regression" | "metamorphic_variant";
    sourcePattern: string;
  };
  browserRepresentative?: boolean;
  metamorphicGroup?: string;
};

export type PublicMessageFailureKind =
  | "schema"
  | "manifest"
  | "synthetic_hygiene"
  | "routing"
  | "precedence"
  | "fact_missing"
  | "fact_invented"
  | "qualifier_loss"
  | "status"
  | "composition"
  | "reconstruction"
  | "money_safety"
  | "next_step"
  | "safety";

export type PublicMessageEvaluationFailure = {
  scenarioId: string;
  category: PublicMessageCategory;
  kind: PublicMessageFailureKind;
  message: string;
  expected?: string;
  actual?: string;
};

export type PublicMessageEvaluationReport = {
  corpusVersion: typeof PUBLIC_MESSAGE_CORPUS_VERSION;
  total: number;
  passed: number;
  failed: number;
  failures: PublicMessageEvaluationFailure[];
  totalsByCategory: Record<PublicMessageCategory, number>;
  totalsByRisk: Record<PublicMessageRisk, number>;
};
