import { describe, expect, it } from "vitest";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../../lib/safetyWording";
import homeViewSource from "../HomeView.tsx?raw";

const removedCommunityHelperPhrases = [
  "Controlled public beta",
  "Community support prep",
  "For carers, support workers, family helpers",
  "Open controlled beta",
  "It does not analyse the message above",
  "onOpenCommunityHelperDemo",
];

const forbiddenCommunityHelperPhrases = [
  "risk score",
  "eligibility score",
  "safeguarding issue confirmed",
  "needs this equipment",
  "needs this adaptation",
  "financial abuse proven",
  "money owed",
  "money saved",
  "money recovered",
  "contacted automatically",
];

describe("HomeView public community helper gating", () => {
  it("does not promote or link the Community Helper beta from public Home", () => {
    for (const phrase of removedCommunityHelperPhrases) {
      expect(homeViewSource).not.toContain(phrase);
    }
  });

  it("does not build a community helper pack from Home intake", () => {
    expect(homeViewSource).not.toContain("buildCommunityHelperPack");
    expect(homeViewSource).not.toContain("CommunityHelperPack");
    expect(homeViewSource).not.toContain("communityHelperPack");
    expect(homeViewSource).not.toContain("detectCommunityHelperSituationType");
  });

  it("keeps the default Check a message path on the normal check flow", () => {
    expect(homeViewSource).toContain("buildCheckSourceTitle(rawText, attachedFiles)");
    expect(homeViewSource).toContain("submitAcceptedText({");
    expect(homeViewSource).toContain("acceptedText: textToCheck");
    expect(homeViewSource).not.toContain("analyseDecisionProblem");
  });

  it("does not include forbidden community helper claims in Home", () => {
    const normalised = normaliseSafetyText(homeViewSource);

    for (const phrase of forbiddenCommunityHelperPhrases) {
      expect(normalised).not.toContain(normaliseSafetyText(phrase));
    }

    expect(findForbiddenSafetyPhrases(homeViewSource)).toEqual([]);
  });

  it("does not introduce auto-send, auto-submit, or auto-contact wording", () => {
    expect(homeViewSource).not.toMatch(/auto-?send/i);
    expect(homeViewSource).not.toMatch(/auto-?submit/i);
    expect(homeViewSource).not.toMatch(/auto-?contact/i);
  });
});
