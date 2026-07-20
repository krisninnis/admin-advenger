import type { AppView } from "../components/Sidebar";
import type { AdminItem } from "../types";
import {
  classifyDecisionDocument,
  hasEssentialHardshipContext,
} from "./decisionEngine/classifier";
import type { DecisionDocumentType } from "./decisionEngine/types";

export type PublicAvailability =
  | "public"
  | "controlled_beta"
  | "development_only"
  | "unavailable_publicly";

export type PublicScopeBoundaryReason =
  | "benefits"
  | "council_tax_support"
  | "debt_enforcement"
  | "housing_or_crisis"
  | "safeguarding"
  | "workplace_support"
  | "career_support"
  | "adviser_or_internal";

export type PublicScopeBoundary =
  | {
      status: "allowed";
    }
  | {
      status: "blocked";
      availability: "controlled_beta" | "unavailable_publicly";
      reason: PublicScopeBoundaryReason;
      decisionDocumentType?: DecisionDocumentType;
      dateMentioned?: string;
    };

type PublicRuntimeEnv = Partial<{
  DEV: boolean;
  VITE_ENABLE_CONTROLLED_BETAS: string;
}>;

const highRiskDecisionTypes = new Set<DecisionDocumentType>([
  "debt_collection",
  "bailiff_notice",
  "benefits_evidence_prep",
  "benefits_assessment_report",
  "benefits_decision",
  "benefits_appeal",
  "benefits_review",
  "benefits_uc_statement",
  "benefits_uc_sanction",
  "benefits_uc_deductions",
  "benefits_wca_lcwra",
  "benefits_migration_notice",
  "benefits_change_of_circumstances",
  "council_tax_reduction",
  "benefits_crisis_support",
]);

const publicViews = new Set<AppView>([
  "home",
  "savings",
  "cases",
  "case_file",
  "trust_safety",
  "settings",
  "covenant",
]);

const controlledBetaViews = new Set<AppView>(["demo_tour"]);
const developmentOnlyViews = new Set<AppView>(["dashboard", "add_item", "validation"]);

const datePattern =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i;

const safeguardingPattern =
  /\b(?:safeguarding|at risk|harm|abuse|neglect|coercive|coercion|threatened|unsafe|financial abuse|exploitation)\b/i;

const housingOrCrisisPattern =
  /\b(?:homeless|homelessness|eviction|section 21|section 8|notice seeking possession|possession order|landlord|cannot heat|can't heat|no food|food bank|emergency support|crisis support)\b/i;

const workplacePattern =
  /\b(?:disciplinary|grievance|employment tribunal|settlement agreement|constructive dismissal|unfair dismissal|discrimination at work|acas|workplace|employer|resign|resignation|dismissal)\b/i;

const careerPattern =
  /\b(?:curriculum vitae|\bcv\b|cover letter|job advert|job application|hiring manager|personal statement|interview answer|candidate profile)\b/i;

const adviserOrInternalPattern =
  /\b(?:adviser export|adviser pack|validation dashboard|internal demo|founder tool|controlled beta|community helper|support worker|caseworker)\b/i;

const reasonForDecisionType = (
  documentType: DecisionDocumentType,
): PublicScopeBoundaryReason => {
  if (documentType === "council_tax_reduction") {
    return "council_tax_support";
  }

  if (documentType === "debt_collection" || documentType === "bailiff_notice") {
    return "debt_enforcement";
  }

  if (documentType === "benefits_crisis_support") {
    return "housing_or_crisis";
  }

  return "benefits";
};

export const getPublicViewAvailability = (view: AppView): PublicAvailability => {
  if (publicViews.has(view)) {
    return "public";
  }

  if (controlledBetaViews.has(view)) {
    return "controlled_beta";
  }

  if (developmentOnlyViews.has(view)) {
    return "development_only";
  }

  return "unavailable_publicly";
};

export const isControlledFeatureEnabled = (env: PublicRuntimeEnv = {}): boolean =>
  env.VITE_ENABLE_CONTROLLED_BETAS === "true";

export const canAccessAppView = (
  view: AppView,
  env: PublicRuntimeEnv = {},
): boolean => {
  const availability = getPublicViewAvailability(view);

  if (availability === "public") {
    return true;
  }

  if (availability === "controlled_beta") {
    return isControlledFeatureEnabled(env);
  }

  return availability === "development_only" && env.DEV === true;
};

export const getBlockedViewMessage = (view: AppView): string => {
  const availability = getPublicViewAvailability(view);

  if (availability === "controlled_beta") {
    return "That area is in controlled testing and is not available from the public Check a message flow.";
  }

  if (availability === "development_only") {
    return "That testing area is not available here. Return to Check a message.";
  }

  return "That area is not available from the public Check a message flow.";
};

export const assessPublicIntakeScope = (item: AdminItem): PublicScopeBoundary => {
  const text = `${item.title}\n${item.rawText}`;
  const decisionDocumentType = classifyDecisionDocument(text);
  const dateMentioned = text.match(datePattern)?.[0];

  if (safeguardingPattern.test(text)) {
    return {
      status: "blocked",
      availability: "unavailable_publicly",
      reason: "safeguarding",
      decisionDocumentType,
      dateMentioned,
    };
  }

  if (housingOrCrisisPattern.test(text) || hasEssentialHardshipContext(text)) {
    return {
      status: "blocked",
      availability: "unavailable_publicly",
      reason: "housing_or_crisis",
      decisionDocumentType,
      dateMentioned,
    };
  }

  if (highRiskDecisionTypes.has(decisionDocumentType)) {
    return {
      status: "blocked",
      availability: "controlled_beta",
      reason: reasonForDecisionType(decisionDocumentType),
      decisionDocumentType,
      dateMentioned,
    };
  }

  if (workplacePattern.test(text)) {
    return {
      status: "blocked",
      availability: "controlled_beta",
      reason: "workplace_support",
      decisionDocumentType,
      dateMentioned,
    };
  }

  if (careerPattern.test(text)) {
    return {
      status: "blocked",
      availability: "controlled_beta",
      reason: "career_support",
      decisionDocumentType,
      dateMentioned,
    };
  }

  if (adviserOrInternalPattern.test(text)) {
    return {
      status: "blocked",
      availability: "controlled_beta",
      reason: "adviser_or_internal",
      decisionDocumentType,
      dateMentioned,
    };
  }

  return { status: "allowed" };
};
