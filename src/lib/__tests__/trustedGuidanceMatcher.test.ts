import { describe, expect, it } from "vitest";
import type { OpportunityCard, OpportunityType } from "../../types";
import { getTrustedGuidanceForOpportunity } from "../trustedGuidanceMatcher";

const makeOpportunity = (opportunityType: OpportunityType): OpportunityCard => ({
  id: `opp-${opportunityType}`,
  caseId: "case-1",
  opportunityType,
  title: "Test opportunity",
  plainEnglishSummary: "Test summary",
  evidenceFound: [],
  missingInformation: [],
  nextBestAction: "Review before acting.",
  recommendedPathSteps: [],
  riskLevel: "low",
  confidenceLabel: "medium",
  sourceCaseType: "deadline",
  createdAt: "2026-07-17T10:00:00.000Z",
  updatedAt: "2026-07-17T10:00:00.000Z",
});

describe("getTrustedGuidanceForOpportunity", () => {
  it("does not attach refund guidance to payment-reminder style deadline opportunities", () => {
    const guidance = getTrustedGuidanceForOpportunity({
      ...makeOpportunity("deadline"),
      title: "Payment reminder to check",
    });

    expect(guidance.map((card) => card.title)).not.toContain("Refund or recovery checklist");
    expect(guidance).toEqual([]);
  });

  it("does not silently fall back to money_back for unmatched opportunities", () => {
    expect(getTrustedGuidanceForOpportunity(makeOpportunity("unknown"))).toEqual([]);
  });

  it("still maps genuine refund expected opportunities to refund guidance", () => {
    expect(getTrustedGuidanceForOpportunity(makeOpportunity("refund_expected"))).toContainEqual(
      expect.objectContaining({ title: "Refund or recovery checklist" }),
    );
  });

  it("keeps direct matches and existing aliases", () => {
    expect(getTrustedGuidanceForOpportunity(makeOpportunity("delivery_issue"))).toContainEqual(
      expect.objectContaining({ title: "Missing delivery checklist" }),
    );
    expect(getTrustedGuidanceForOpportunity(makeOpportunity("warranty_or_fault"))).toContainEqual(
      expect.objectContaining({ title: "Receipt and proof checklist" }),
    );
    expect(getTrustedGuidanceForOpportunity(makeOpportunity("subscription_recurring_charge"))).toContainEqual(
      expect.objectContaining({ title: "Subscription renewal checklist" }),
    );
  });
});
