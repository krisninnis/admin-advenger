import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { createAdminCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";

const makeItem = (title: string, rawText: string): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType: "email",
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
});
