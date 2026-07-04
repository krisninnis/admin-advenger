import type { AdminCase, OpportunityCard, OpportunityType } from "../types";

export type GuidedCaseMode = "recovery" | "saving_or_review" | "safety" | "record";

const recoveryTypes = new Set<OpportunityType>([
  "refund_expected",
  "money_back",
  "travel_extra_cost_recovery",
  "delivery_issue",
  "warranty_or_fault",
]);

const savingOrReviewTypes = new Set<OpportunityType>([
  "subscription_recurring_charge",
  "subscription_renewal",
  "bill_or_price_increase",
  "energy_price_change",
  "save_money",
]);

const recordTypes = new Set<OpportunityType>([
  "no_action_needed",
  "delivery_update",
  "receipt_guardian",
]);

export const getGuidedCaseMode = (
  adminCase: AdminCase,
  opportunity: Pick<OpportunityCard, "opportunityType">,
): GuidedCaseMode => {
  if (opportunity.opportunityType === "suspicious_email_risk" || adminCase.emailSafetyAssessment) {
    return "safety";
  }

  if (savingOrReviewTypes.has(opportunity.opportunityType)) {
    return "saving_or_review";
  }

  if (recordTypes.has(opportunity.opportunityType)) {
    return "record";
  }

  if (recoveryTypes.has(opportunity.opportunityType) || adminCase.category === "refund") {
    return "recovery";
  }

  if (adminCase.category === "subscription" || adminCase.category === "bill_increase") {
    return "saving_or_review";
  }

  if (adminCase.category === "unknown") {
    return "record";
  }

  return "recovery";
};
