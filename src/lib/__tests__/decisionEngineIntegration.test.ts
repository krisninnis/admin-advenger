import { describe, expect, it } from "vitest";
import type { AdminItem, SourceType } from "../../types";
import { createAdminCase } from "../caseFactory";
import { calculateImpactTotals, deriveImpactFromCase } from "../impactLedger";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";

const now = "2026-07-04T09:00:00.000Z";

const makeItem = (
  title: string,
  rawText: string,
  sourceType: SourceType = "email",
): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
});

const analyseToCases = (item: AdminItem) => {
  const findings = analyseAdminItem(item);
  const cases = findings.map((finding) => createAdminCase(finding, item));

  return { item, findings, cases };
};

const firstCase = (item: AdminItem) => {
  const result = analyseToCases(item);
  const adminCase = result.cases[0];
  const finding = result.findings[0];

  if (!adminCase || !finding) {
    throw new Error("Expected at least one case");
  }

  return { ...result, adminCase, finding };
};

describe("Decision Engine pipeline integration", () => {
  it("routes a parking charge with unclear signage through the Decision Engine without counting the amount as saved/recovered", () => {
    const text =
      "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. I think the signs were unclear.";
    const { item, finding, adminCase } = firstCase(makeItem("Parking Charge Notice", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = deriveImpactFromCase(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.category).toBe("admin_dispute");
    expect(opportunity.opportunityType).toBe("admin_dispute_check");
    expect(adminCase.decisionResult?.documentType).toBe("parking_ticket");
    expect(opportunity.potentialRecovery).toBeUndefined();
    expect(opportunity.potentialSaving).toBeUndefined();
    expect(opportunity.confirmedRecovery).toBeUndefined();
    expect(opportunity.confirmedSaving).toBeUndefined();
    expect(opportunity.moneyAtStake?.status).toBe("unknown");
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(impacts.some((entry) => entry.type === "potential_saving")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.potentialSaving).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("lets an already-approved refund keep priority over a generic consumer dispute match", () => {
    const text =
      "Refund refused initially, but a refund of £249 has now been approved and will be returned to your original payment method within 5 to 10 working days. The item was faulty. Reference RF777.";
    const { item, finding, adminCase } = firstCase(makeItem("Refund approved", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);

    expect(finding.category).toBe("refund");
    expect(finding.category).not.toBe("admin_dispute");
    expect(opportunity.opportunityType).toBe("refund_expected");
    expect(opportunity.opportunityType).not.toBe("admin_dispute_check");
    expect(adminCase.decisionResult).toBeUndefined();
    expect(opportunity.potentialRecovery?.amount).toBe(249);
  });

  it("keeps a risky email that also mentions a parking charge notice as safety-only, not an admin dispute check", () => {
    const text =
      "Sender: support@secure-parking-charge-example.com\nReply-to: randomhelpdesk@example.net\nSubject: Your Parking Charge Notice account will be locked today\n\nYour Parking Charge Notice account will be locked today. Click this link immediately to verify your bank details and avoid suspension. Failure to act now will result in permanent closure and enforcement action against your parking charge notice.";
    const { item, finding, adminCase } = firstCase(
      makeItem("Your Parking Charge Notice account will be locked today", text),
    );
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = deriveImpactFromCase(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(opportunity.opportunityType).toBe("suspicious_email_risk");
    expect(opportunity.opportunityType).not.toBe("admin_dispute_check");
    expect(adminCase.decisionResult).toBeUndefined();
    expect(impacts).toContainEqual(expect.objectContaining({ type: "no_saving" }));
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
  });

  it("routes a PIP decision letter with points through the Decision Engine without counting the amount as saved/recovered/pending", () => {
    const text =
      "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.";
    const { item, finding, adminCase } = firstCase(makeItem("PIP decision letter", text));
    const opportunity = deriveOpportunityCard(adminCase, item, finding);
    const impacts = deriveImpactFromCase(adminCase, item, finding);
    const totals = calculateImpactTotals(impacts, [adminCase]);

    expect(finding.category).toBe("admin_dispute");
    expect(opportunity.opportunityType).toBe("admin_dispute_check");
    expect(adminCase.decisionResult?.documentType).toBe("benefits_decision");
    expect(opportunity.potentialRecovery).toBeUndefined();
    expect(opportunity.potentialSaving).toBeUndefined();
    expect(opportunity.moneyAtStake?.status).toBe("unknown");
    expect(impacts.some((entry) => entry.type === "pending_recovery")).toBe(false);
    expect(impacts.some((entry) => entry.type === "potential_saving")).toBe(false);
    expect(totals.pendingRecovery).toBe(0);
    expect(totals.potentialSaving).toBe(0);
    expect(totals.confirmedSavedRecovered).toBe(0);
    // "Questions to answer" and evidence should surface through the existing
    // missing-information list rather than a new UI section.
    expect(opportunity.missingInformation.length).toBeGreaterThan(0);
  });
});
