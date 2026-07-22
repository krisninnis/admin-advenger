import { describe, expect, it } from "vitest";
import {
  buildInboxScanPreviews,
  buildPreview,
  inboxScanSamples,
  type InboxScanSample,
} from "../inboxScan";

const syntheticHighRiskSample: InboxScanSample = {
  id: "synthetic-benefits-crisis",
  title: "Universal Credit sanction notice",
  sourceType: "email",
  rawText:
    "Your Universal Credit has been sanctioned. You have no money for food or heating. " +
    "Contact the DWP immediately about this decision.",
};

describe("Inbox Scan public-scope boundary regression", () => {
  it("processes a synthetic high-risk sample through the real buildPreview path and blocks it", () => {
    const preview = buildPreview(syntheticHighRiskSample);

    expect(preview.findings).toHaveLength(1);

    const finding = preview.findings[0];

    expect(finding.category).toBe("important_reply");
    expect(finding.estimatedValue).toBe("No money counted");
    expect(finding.summary).toContain("keeping it as preparation only");

    expect(preview.primaryCase.decisionResult).toBeUndefined();
    expect(preview.primaryCase.careerSupportPack).toBeUndefined();
    expect(preview.primaryCase.valueLabel).toBe("No money counted");

    const moneyTypes = new Set(["potential_saving", "potential_recovery", "pending_recovery"]);
    const hasMoneyImpact = preview.impactEntries.some((e) => moneyTypes.has(e.type));
    expect(hasMoneyImpact).toBe(false);

    expect(preview.isRisk).toBe(false);
  });

  it("does not mutate the production sample array", () => {
    const originalLength = inboxScanSamples.length;
    const originalIds = inboxScanSamples.map((s) => s.id);

    buildInboxScanPreviews();

    expect(inboxScanSamples).toHaveLength(originalLength);
    expect(inboxScanSamples.map((s) => s.id)).toEqual(originalIds);
  });

  it("still produces valid previews for every fixed production sample", () => {
    const previews = buildInboxScanPreviews();

    expect(previews).toHaveLength(inboxScanSamples.length);

    for (const preview of previews) {
      expect(preview.findings.length).toBeGreaterThan(0);
      expect(preview.cases.length).toBeGreaterThan(0);
      expect(preview.primaryCase).toBeDefined();
      expect(preview.opportunity).toBeDefined();
      expect(typeof preview.headline).toBe("string");
      expect(typeof preview.isRisk).toBe("boolean");
      expect(typeof preview.isMoney).toBe("boolean");
    }
  });
});
