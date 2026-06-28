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

  if (opportunity.opportunityType === "delivery_update") {
    return [];
  }

  return trustedGuidanceCards.filter((card) => card.caseType === "money_back").slice(0, 1);
};
