import { describe, expect, it } from "vitest";
import demoTourViewSource from "../../views/DemoTourView.tsx?raw";
import homeViewSource from "../../views/HomeView.tsx?raw";
import {
  buildCommunityHelperPack,
  detectCommunityHelperSituationType,
  flattenCommunityHelperPackText,
  type CommunityHelperSituationType,
} from "../communityHelperPack";
import { normaliseSafetyText } from "../safetyWording";
import {
  assessCommunityHelperPublicBetaReadiness,
  PUBLIC_BETA_PREP_FORBIDDEN_PHRASES,
} from "../communityHelperPublicBetaReadiness";

const realInput = { homeViewSource, demoTourViewSource };

// Covers the 7 internal situation-type templates not reachable through any
// shipped UI today (only the 4 demo scenarios are). None of these are
// public-beta-facing yet, but scanning them now against the wider
// public-beta-prep phrase list closes out a risk noted in
// docs/product/community-helper-public-beta-prep-v1.md before any future
// intake branch makes them reachable.
const internalOnlySituationFixtures: Array<{
  expectedType: CommunityHelperSituationType;
  text: string;
}> = [
  {
    expectedType: "difficulty_understanding_letters",
    text: "I don't understand this letter from the council, it is very confusing.",
  },
  {
    expectedType: "housing_repair_or_access_difficulty",
    text: "There is a broken boiler and the landlord has not fixed the heating repair.",
  },
  {
    expectedType: "carer_organising_letters",
    text: "I'm a carer for my mum and I am organising her letters and paperwork.",
  },
  {
    expectedType: "support_worker_meeting_notes",
    text: "Preparing notes for a support worker meeting next week, a review meeting.",
  },
  {
    expectedType: "daily_routine_admin_overwhelm",
    text: "I feel overwhelmed and can't keep up with all the letters and admin.",
  },
  {
    expectedType: "communication_difficulty",
    text: "I have difficulty reading letters and hearing on the phone, it takes longer.",
  },
  {
    expectedType: "community_helper_unknown",
    text: "Help me with all these confusing papers and appointments.",
  },
];

describe("Community Helper Public Beta Prep v1 readiness", () => {
  it("passes every readiness check against the real, currently-shipped source", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const failing = report.checks.filter((check) => check.status === "fail");

    expect(failing).toEqual([]);
    expect(report.allPassed).toBe(true);
    expect(report.passedCount).toBe(report.totalCount);
    expect(report.totalCount).toBe(10);
  });

  it("includes controlled public beta wording on the gated Home card", () => {
    expect(homeViewSource).toContain("Controlled public beta");
    expect(homeViewSource).toContain("Open controlled beta");
    expect(homeViewSource).toContain("It does not analyse the message above");
  });

  it("keeps Community Helper secondary/gated from Home", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const check = report.checks.find((item) => item.id === "home_gated_secondary");

    expect(check?.status).toBe("pass");
  });

  it("confirms HomeView still does not build a community helper pack", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const classifierCheck = report.checks.find((item) => item.id === "home_no_classifier_wiring");
    const importCheck = report.checks.find((item) => item.id === "home_no_builder_import");

    expect(classifierCheck?.status).toBe("pass");
    expect(importCheck?.status).toBe("pass");
    expect(homeViewSource).not.toContain("buildCommunityHelperPack");
    expect(homeViewSource).not.toContain("CommunityHelperPack");
  });

  it("confirms DemoTourView demo scenarios are synthetic/hardcoded", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const check = report.checks.find((item) => item.id === "demo_scenarios_synthetic");

    expect(check?.status).toBe("pass");
    expect(demoTourViewSource).toContain("buildCommunityHelperPack");
    expect(demoTourViewSource).toContain("communityHelperDemoScenarios.map");
  });

  it("confirms no OCR/file intake path can trigger the community helper demo", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const check = report.checks.find((item) => item.id === "no_ocr_auto_trigger");

    expect(check?.status).toBe("pass");
  });

  it("confirms the urgent safeguarding-like and financial admin concern scenarios stay within boundaries", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const urgentCheck = report.checks.find((item) => item.id === "urgent_signposting_only");
    const financialCheck = report.checks.find((item) => item.id === "financial_concern_factual");

    expect(urgentCheck?.status).toBe("pass");
    expect(financialCheck?.status).toBe("pass");
  });

  it("finds no forbidden phrases in public-beta-facing artifacts", () => {
    const report = assessCommunityHelperPublicBetaReadiness(realInput);
    const check = report.checks.find((item) => item.id === "no_forbidden_phrases");

    expect(check?.status).toBe("pass");
    expect(check?.detail).toBe("No forbidden phrases found.");
  });

  it("checks the full expanded forbidden-phrase list, including phrases not in the shared safetyWording constants", () => {
    // "safeguarding confirmed" (without "issue"), "capacity decision", and the
    // broader "council must" are deliberately wider than
    // safetyWording.ts's FORBIDDEN_COMMUNITY_HELPER_CLAIMS.
    expect(PUBLIC_BETA_PREP_FORBIDDEN_PHRASES).toEqual(
      expect.arrayContaining([
        "risk score",
        "eligibility score",
        "safeguarding issue confirmed",
        "safeguarding confirmed",
        "capacity decision",
        "lacks capacity",
        "needs this equipment",
        "needs this adaptation",
        "council must",
        "financial abuse proven",
        "money owed",
        "money saved",
        "money recovered",
        "you qualify",
        "you will win",
        "case strength",
        "contacted automatically",
        "submitted automatically",
        "sent automatically",
      ]),
    );
  });

  it("fails the relevant check when a synthetic HomeView source wires in the community helper pack", () => {
    const unsafeInput = {
      homeViewSource: `${homeViewSource}\nimport { buildCommunityHelperPack } from "../lib/communityHelperPack";`,
      demoTourViewSource,
    };
    const report = assessCommunityHelperPublicBetaReadiness(unsafeInput);
    const classifierCheck = report.checks.find((item) => item.id === "home_no_classifier_wiring");
    const surfaceCheck = report.checks.find((item) => item.id === "demo_tour_only_surface");

    expect(classifierCheck?.status).toBe("fail");
    expect(surfaceCheck?.status).toBe("fail");
    expect(report.allPassed).toBe(false);
  });

  it("fails the relevant check when the gated Home entry is missing", () => {
    const unsafeInput = {
      homeViewSource: homeViewSource.replace("Community support prep", "Something else"),
      demoTourViewSource,
    };
    const report = assessCommunityHelperPublicBetaReadiness(unsafeInput);
    const check = report.checks.find((item) => item.id === "home_gated_secondary");

    expect(check?.status).toBe("fail");
    expect(report.allPassed).toBe(false);
  });

  it("fails the forbidden-phrase check on synthetic unsafe source text", () => {
    // Injected inside the gated card's own section (between the
    // "Community Helper Home Gated v1" marker comment and its closing
    // </section>), so extractSection actually picks it up the same way it
    // would pick up a real regression.
    const unsafeInput = {
      homeViewSource: homeViewSource.replace(
        "Open controlled beta",
        "Open controlled beta (risk score, you qualify)",
      ),
      demoTourViewSource,
    };
    const report = assessCommunityHelperPublicBetaReadiness(unsafeInput);
    const check = report.checks.find((item) => item.id === "no_forbidden_phrases");

    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain("risk score");
  });

  it.each(internalOnlySituationFixtures)(
    "internal-only template $expectedType has no wider public-beta-prep forbidden phrases",
    ({ expectedType, text }) => {
      const detected = detectCommunityHelperSituationType(text);
      const pack = buildCommunityHelperPack({ text, role: "helping_someone" });
      const flattened = normaliseSafetyText(flattenCommunityHelperPackText(pack));
      const forbidden = PUBLIC_BETA_PREP_FORBIDDEN_PHRASES.filter((phrase) =>
        flattened.includes(normaliseSafetyText(phrase)),
      );

      expect(detected).toBe(expectedType);
      expect(forbidden).toEqual([]);
    },
  );
});
