import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { createAdminCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";

const makeItem = (
  title: string,
  rawText: string,
  sourceType: AdminItem["sourceType"] = "email",
): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: "2026-07-20T09:00:00.000Z",
  analysedAt: "2026-07-20T09:00:00.000Z",
});

const publicCaseFor = (item: AdminItem) => {
  const [finding] = analyseAdminItem(item, { accessMode: "public" });
  const adminCase = createAdminCase(finding, item);

  return { finding, adminCase };
};

describe("public MVP analysis boundary", () => {
  it("does not silently run a benefits specialist workflow from public intake", () => {
    const { finding, adminCase } = publicCaseFor(
      makeItem(
        "Universal Credit decision",
        "Your Universal Credit sanction starts on 18 August 2026. Ask for a mandatory reconsideration if you disagree.",
      ),
    );

    expect(finding.title).toBe("This needs a careful human review");
    expect(finding.estimatedValue).toBe("No money counted");
    expect(finding.deadline).toBe("18 August 2026");
    expect(adminCase.decisionResult).toBeUndefined();
    expect(adminCase.careerSupportPack).toBeUndefined();
    expect(adminCase.valueLabel).toBe("No money counted");
    expect(adminCase.summary).toContain("not opening a specialist beta automatically");
  });

  it("does not silently run debt, crisis, safeguarding, workplace, or career engines from public intake", () => {
    const inputs = [
      makeItem("Debt letter", "A debt collector says bailiff enforcement may start."),
      makeItem("Housing crisis", "The landlord sent an eviction notice and I cannot heat the home."),
      makeItem("Safeguarding", "The note mentions safeguarding and possible financial abuse."),
      makeItem("Workplace", "This is a disciplinary meeting letter from my employer."),
      makeItem("Career", "Please review this CV against a job advert."),
    ];

    for (const item of inputs) {
      const { finding, adminCase } = publicCaseFor(item);

      expect(finding.category).toBe("important_reply");
      expect(finding.estimatedValue).toBe("No money counted");
      expect(adminCase.decisionResult).toBeUndefined();
      expect(adminCase.careerSupportPack).toBeUndefined();
      expect(adminCase.nextAction).toContain("Keep the original message");
    }
  });

  it("keeps controlled analysis available for preserved specialist tests and modules", () => {
    const benefitsItem = makeItem(
      "PIP decision",
      "Your Personal Independence Payment decision says no daily living points were awarded.",
    );
    const careerItem = makeItem("CV", "CV for a product designer with a portfolio and skills section.");

    const [benefitsFinding] = analyseAdminItem(benefitsItem, { accessMode: "controlled" });
    const benefitsCase = createAdminCase(benefitsFinding, benefitsItem);
    const [careerFinding] = analyseAdminItem(careerItem, { accessMode: "controlled" });
    const careerCase = createAdminCase(careerFinding, careerItem);

    expect(benefitsCase.decisionResult?.documentType.startsWith("benefits")).toBe(true);
    expect(careerCase.careerSupportPack?.documentType).toBe("cv");
  });

  it("does not block broadband or mobile price-rise checks in public intake", () => {
    const { finding, adminCase } = publicCaseFor(
      makeItem(
        "Mobile price rise",
        "Your mobile tariff will increase from GBP 20 to GBP 24 per month on 1 September 2026.",
      ),
    );

    expect(finding.category).toBe("bill_increase");
    expect(adminCase.broadbandPriceRiseAssessment).toBeDefined();
    expect(adminCase.decisionResult).toBeUndefined();
  });

  it("keeps ordinary low-risk fallback working", () => {
    const { finding, adminCase } = publicCaseFor(
      makeItem("Unclear message", "Hello, just checking whether you saw my earlier note."),
    );

    expect(finding.category).not.toBe("admin_dispute");
    expect(adminCase.decisionResult).toBeUndefined();
  });

  it.each([
    ["Pasted text", "email"],
    ["Loaded file text", "pdf"],
    ["Photo text (reviewed before checking)", "email"],
  ] as const)("routes %s through the corrected public hardship boundary", (title, sourceType) => {
    const { finding, adminCase } = publicCaseFor(
      makeItem(
        title,
        "My benefits have stopped and I cannot buy food or heat the home.",
        sourceType,
      ),
    );

    expect(finding.title).toBe("Specialist support may be needed");
    expect(finding.category).toBe("important_reply");
    expect(finding.estimatedValue).toBe("No money counted");
    expect(finding.summary).toContain("keeping it as preparation only");
    expect(finding.summary).toContain("not deciding what action to take");
    expect(adminCase.decisionResult).toBeUndefined();
    expect(adminCase.valueLabel).toBe("No money counted");
    expect(adminCase.nextAction).toContain("Keep the original message");
  });

  it("keeps public fallback closed and safe for warrant enforcement wording", () => {
    const { finding, adminCase } = publicCaseFor(
      makeItem(
        "Court warrant",
        "A court warrant was issued for enforcement on 21 August 2026. The bailiff says they may attend.",
      ),
    );

    expect(finding.title).toBe("This needs a careful human review");
    expect(finding.deadline).toBe("21 August 2026");
    expect(finding.estimatedValue).toBe("No money counted");
    expect(finding.summary).toContain("not opening a specialist beta automatically");
    expect(finding.suggestedAction).toContain("Keep the original message");
    expect(finding.suggestedAction).toContain("21 August 2026");
    expect(finding.whyItMatters).toContain("will not decide rights");
    expect(adminCase.decisionResult).toBeUndefined();
    expect(adminCase.valueLabel).toBe("No money counted");
    expect(adminCase.nextAction).toContain("Keep the original message");
    expect(adminCase.summary).toContain("not opening a specialist beta automatically");
  });

  it("keeps warranty and broadband support wording available in public intake", () => {
    const warranty = publicCaseFor(
      makeItem("Warranty", "Customer support can help with your boiler warranty."),
    );
    const broadband = publicCaseFor(
      makeItem(
        "Broadband price rise",
        "The main benefit of this home broadband support package is cheaper heating controls. Your broadband price will increase from GBP 28 to GBP 31 on 1 September 2026.",
        "bill",
      ),
    );

    expect(warranty.finding.title).not.toBe("This needs a careful human review");
    expect(warranty.adminCase.decisionResult?.documentType).toBe("consumer_dispute");
    expect(warranty.adminCase.valueLabel).not.toBe("Money saved");
    expect(broadband.finding.category).toBe("bill_increase");
    expect(broadband.adminCase.broadbandPriceRiseAssessment).toBeDefined();
    expect(broadband.adminCase.decisionResult).toBeUndefined();
  });
});
