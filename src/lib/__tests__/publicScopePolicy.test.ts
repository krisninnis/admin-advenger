import { describe, expect, it } from "vitest";
import type { AppView } from "../../components/Sidebar";
import type { AdminItem } from "../../types";
import {
  assessPublicIntakeScope,
  canAccessAppView,
  getPublicViewAvailability,
  isControlledFeatureEnabled,
} from "../publicScopePolicy";

const makeItem = (title: string, rawText: string): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType: "email",
  rawText,
  createdAt: "2026-07-20T09:00:00.000Z",
  analysedAt: "2026-07-20T09:00:00.000Z",
});

describe("public MVP scope policy", () => {
  it.each<AppView>(["home", "cases", "case_file", "savings", "trust_safety", "settings", "covenant"])(
    "keeps %s public",
    (view) => {
      expect(getPublicViewAvailability(view)).toBe("public");
      expect(canAccessAppView(view, {})).toBe(true);
    },
  );

  it("keeps controlled beta routes closed unless the explicit public flag is exactly true", () => {
    expect(getPublicViewAvailability("demo_tour")).toBe("controlled_beta");
    expect(canAccessAppView("demo_tour", {})).toBe(false);
    expect(canAccessAppView("demo_tour", { VITE_ENABLE_CONTROLLED_BETAS: "false" })).toBe(false);
    expect(canAccessAppView("demo_tour", { VITE_ENABLE_CONTROLLED_BETAS: "yes" })).toBe(false);
    expect(canAccessAppView("demo_tour", { VITE_ENABLE_CONTROLLED_BETAS: "true" })).toBe(true);
    expect(isControlledFeatureEnabled({ VITE_ENABLE_CONTROLLED_BETAS: "true" })).toBe(true);
  });

  it.each<AppView>(["dashboard", "add_item", "validation"])(
    "keeps %s development-only",
    (view) => {
      expect(getPublicViewAvailability(view)).toBe("development_only");
      expect(canAccessAppView(view, {})).toBe(false);
      expect(canAccessAppView(view, { DEV: false })).toBe(false);
      expect(canAccessAppView(view, { DEV: true })).toBe(true);
    },
  );

  it("blocks benefits and preserves a directly visible date", () => {
    const result = assessPublicIntakeScope(
      makeItem(
        "Universal Credit decision",
        "Your Universal Credit sanction starts on 18 August 2026. You can ask for a mandatory reconsideration.",
      ),
    );

    expect(result).toMatchObject({
      status: "blocked",
      availability: "controlled_beta",
      reason: "benefits",
      decisionDocumentType: "benefits_uc_sanction",
      dateMentioned: "18 August 2026",
    });
  });

  it("blocks debt, crisis, safeguarding, workplace, career, and internal-demo wording", () => {
    expect(
      assessPublicIntakeScope(makeItem("Bailiff notice", "A bailiff may visit about council tax arrears.")),
    ).toMatchObject({ status: "blocked", reason: "debt_enforcement" });
    expect(
      assessPublicIntakeScope(makeItem("Housing notice", "The landlord sent a section 21 eviction notice.")),
    ).toMatchObject({ status: "blocked", reason: "housing_or_crisis" });
    expect(
      assessPublicIntakeScope(makeItem("Safety concern", "This mentions safeguarding and possible financial abuse.")),
    ).toMatchObject({ status: "blocked", reason: "safeguarding" });
    expect(
      assessPublicIntakeScope(makeItem("Work message", "A disciplinary meeting with my employer is booked.")),
    ).toMatchObject({ status: "blocked", reason: "workplace_support" });
    expect(
      assessPublicIntakeScope(makeItem("CV", "Please compare this CV with a job advert.")),
    ).toMatchObject({ status: "blocked", reason: "career_support" });
    expect(
      assessPublicIntakeScope(makeItem("Internal demo", "Open the adviser pack validation dashboard.")),
    ).toMatchObject({ status: "blocked", reason: "adviser_or_internal" });
  });

  it("allows ordinary public admin text through the normal checker", () => {
    expect(
      assessPublicIntakeScope(
        makeItem("Subscription renewal", "Your streaming subscription renews next month at GBP 9.99."),
      ),
    ).toEqual({ status: "allowed" });
  });

  it.each([
    "Your broadband price is increasing to GBP 32 per month. Your account currently has no outstanding balance.",
    "There is no outstanding balance.",
    "Your account has no outstanding balance.",
    "You do not have an outstanding balance.",
    "The outstanding balance is GBP 0.",
    "Zero outstanding balance.",
    "Your previous outstanding balance has been paid.",
    "There is no balance left to pay.",
    "The account is fully paid.",
    "The outstanding amount has been cleared.",
  ])("does not block negated or zero outstanding balance from public intake: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Admin", text))).toEqual({ status: "allowed" });
  });

  it.each([
    "You have an outstanding balance of GBP 240.",
    "The outstanding balance must be paid by Friday.",
    "Your account remains overdue with an outstanding balance.",
    "We may begin debt recovery if the outstanding balance is not paid.",
    "An enforcement agent may attend regarding the outstanding balance.",
  ])("blocks genuine outstanding balance from public intake: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Debt", text))).toMatchObject({
      status: "blocked",
      reason: "debt_enforcement",
    });
  });

  it.each([
    "We can repair the faulty item under warranty.",
    "Your warranty expires next month.",
    "This is covered by the manufacturer's warranty.",
    "The complaint was unwarranted.",
    "A refund may be warranted after inspection.",
  ])("allows ordinary warranty wording through public intake: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Warranty", text))).toEqual({ status: "allowed" });
  });

  it.each([
    "A warrant of control has been issued.",
    "Enforcement agents may attend under a court warrant.",
    "The bailiff says they have a warrant.",
    "A court warrant was issued for enforcement.",
  ])("blocks genuine warrant/enforcement wording: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Warrant", text))).toMatchObject({
      status: "blocked",
      reason: "debt_enforcement",
    });
  });

  it.each([
    "My benefits have stopped and I cannot buy food or heat the home.",
    "I have no money for food until next week.",
    "There is no food in the house and I cannot afford electricity.",
    "I cannot afford to put the heating on.",
    "We have no heating and cannot keep the children warm.",
    "My Universal Credit stopped and I cannot pay for food.",
    "I have been evicted and have nowhere to stay tonight.",
    "The enforcement agent is coming tomorrow and I have no money for essentials.",
  ])("blocks essential hardship context from public intake: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Hardship", text))).toMatchObject({
      status: "blocked",
      reason: "housing_or_crisis",
    });
  });

  it.each([
    "The gas has been disconnected and I cannot keep the house warm.",
    "I have nothing left for food after paying the bill.",
    "The electricity has been cut off and we cannot keep warm.",
    "After paying the rent I have no money left for food.",
    "I have spent everything on the bill and cannot afford essentials.",
    "The power is disconnected and there is no way to heat the house.",
    "There is nothing left to buy food until next week.",
  ])("blocks compound essential hardship phrases from public intake: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Hardship", text))).toMatchObject({
      status: "blocked",
      reason: "housing_or_crisis",
    });
  });

  it.each([
    "The restaurant served cold food.",
    "The oven is not heating the food.",
    "The engineer will repair the home heating system.",
    "This food delivery arrived late.",
    "The main benefit is cheaper heating controls.",
    "The router may heat up during use.",
    "Customer support can help with your boiler warranty.",
    "The gas engineer disconnected the cooker for repair.",
    "The electricity will be disconnected briefly during maintenance.",
    "This blanket will keep the house warm.",
    "The restaurant bill included food.",
    "Nothing was left inside the food-delivery box.",
    "The customer paid the bill after buying food.",
    "The router feels warm after being connected.",
  ])("allows benign food/heating/support wording without hardship context: %s", (text) => {
    expect(assessPublicIntakeScope(makeItem("Benign", text))).toEqual({ status: "allowed" });
  });
});
