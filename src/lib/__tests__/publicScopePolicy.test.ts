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
});
