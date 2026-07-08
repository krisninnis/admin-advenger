import { describe, expect, it } from "vitest";
import homeViewSource from "../../views/HomeView.tsx?raw";

describe("Home result page clarity", () => {
  it("renders Best next move after the main result and before the Benefits Action Pack", () => {
    const mainResultIndex = homeViewSource.indexOf("<SimpleResultPanel");
    const bestNextMoveIndex = homeViewSource.indexOf("<StrategicNextStepPanel");
    const benefitsPackIndex = homeViewSource.indexOf("<BenefitsActionPackPanel");

    expect(mainResultIndex).toBeGreaterThan(-1);
    expect(bestNextMoveIndex).toBeGreaterThan(mainResultIndex);
    expect(benefitsPackIndex).toBeGreaterThan(bestNextMoveIndex);
  });
});
