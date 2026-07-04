import { trustedGuidanceCards } from "../data/trustedGuidanceCards";
import type { TrustedGuidanceCard } from "../data/trustedGuidanceCards";
import type { OpportunityCard } from "../types";

export const getTrustedGuidanceForOpportunity = (
  opportunity?: OpportunityCard,
): TrustedGuidanceCard[] => {
  if (!opportunity) {
    return [];
  }

  const directMatches = trustedGuidanceCards.filter(
    (card) => card.caseType === opportunity.opportunityType,
  );

  if (directMatches.length > 0) {
    return directMatches;
  }

  if (opportunity.opportunityType === "warranty_or_fault") {
    return trustedGuidanceCards.filter((card) => card.caseType === "receipt_guardian");
  }

  if (opportunity.opportunityType === "refund_expected") {
    return trustedGuidanceCards.filter((card) => card.caseType === "money_back");
  }

  if (opportunity.opportunityType === "subscription_recurring_charge") {
    return trustedGuidanceCards.filter((card) => card.caseType === "subscription_renewal");
  }

  if (opportunity.opportunityType === "travel_extra_cost_recovery") {
    return trustedGuidanceCards.filter((card) => card.caseType === "travel_extra_cost_recovery");
  }

  if (opportunity.opportunityType === "delivery_update") {
    return [];
  }

  return trustedGuidanceCards.filter((card) => card.caseType === "money_back").slice(0, 1);
};
