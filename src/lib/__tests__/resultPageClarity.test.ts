import { describe, expect, it } from "vitest";
import homeViewSource from "../../views/HomeView.tsx?raw";

describe("Home result page clarity", () => {
  it("renders the composed case sheet before supporting engine detail", () => {
    const caseSheetIndex = homeViewSource.indexOf("<ResultCaseSheet");
    const supportingDetailIndex = homeViewSource.indexOf("Supporting detail");
    const bestNextMoveIndex = homeViewSource.indexOf("<StrategicNextStepPanel");
    const benefitsPackIndex = homeViewSource.indexOf("<BenefitsActionPackPanel");

    expect(caseSheetIndex).toBeGreaterThan(-1);
    expect(supportingDetailIndex).toBeGreaterThan(caseSheetIndex);
    expect(bestNextMoveIndex).toBeGreaterThan(supportingDetailIndex);
    expect(benefitsPackIndex).toBeGreaterThan(bestNextMoveIndex);
    expect(homeViewSource).toContain("showDetailed && primaryOpportunity");
  });
});
