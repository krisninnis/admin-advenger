import { describe, expect, it } from "vitest";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../../lib/safetyWording";
import homeViewSource from "../HomeView.tsx?raw";

// Community Helper Home Gated v1
//
// HomeView is a large, stateful view with many required handlers/services,
// so - like the existing WorkplaceSupportHomeGated.test.tsx - these tests
// check the rendered source directly (via the `?raw` import already used
// elsewhere in this suite) rather than mounting the whole component. This
// mirrors the established pattern for verifying gated Home entries without
// needing to mock the entire analysis/OCR/inbox-scan/AI-provider stack.

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

describe("HomeView gated community helper beta", () => {
  it("renders an explicit Community support prep beta/demo entry with preparation-only helper copy", () => {
    expect(homeViewSource).toContain("Controlled public beta");
    expect(homeViewSource).toContain("Community support prep");
    expect(homeViewSource).toContain(
      "For carers, support workers, family helpers, or trusted people preparing",
    );
    expect(homeViewSource).toContain(
      "Preparation only. AdminAvenger helps prepare. You stay in control.",
    );
    expect(homeViewSource).toContain("Open controlled beta");
    expect(homeViewSource).toContain("It does not analyse the message above");
  });

  it("only navigates to the existing Demo/tour community helper section - it does not build a pack itself", () => {
    expect(homeViewSource).toContain("onOpenCommunityHelperDemo");
    expect(homeViewSource).toContain("onClick={onOpenCommunityHelperDemo}");
    // HomeView must never construct a CommunityHelperPack, build one from
    // pasted text, or import the builder - only DemoTourView.tsx (an
    // already-shipped, separately gated surface) does that.
    expect(homeViewSource).not.toContain("buildCommunityHelperPack");
    expect(homeViewSource).not.toContain("CommunityHelperPack");
    expect(homeViewSource).not.toContain("communityHelperPack");
  });

  it("keeps the default Check a message path unchanged and does not call the classifier from the new entry", () => {
    // The normal intake path is untouched: the same onCheck call and
    // pasted-text fallback still exist, unaffected by the new gated entry.
    expect(homeViewSource).toContain("buildCheckSourceTitle(rawText, attachedFiles)");
    expect(homeViewSource).toContain("onCheck(checkSourceTitle, \"email\", textToCheck)");
    // The community helper button never appears inside the primary
    // paste/photo/file picker or the "What does this mean?" check flow -
    // it is a separate section rendered after the main check output.
    expect(homeViewSource).not.toContain("analyseDecisionProblem");
  });

  it("is positioned after the primary check flow, not as the default/main route", () => {
    const primaryCtaIndex = homeViewSource.indexOf("What does this mean?");
    const communityEntryIndex = homeViewSource.indexOf("Community support prep");
    const inputPickerIndex = homeViewSource.indexOf('"Paste text", "Fastest way to check something"');

    expect(primaryCtaIndex).toBeGreaterThan(-1);
    expect(communityEntryIndex).toBeGreaterThan(-1);
    expect(inputPickerIndex).toBeGreaterThan(-1);
    // The community helper entry appears later in the rendered tree than
    // both the main input-method picker and the primary check button, so it
    // is visually and structurally secondary rather than the default route.
    expect(communityEntryIndex).toBeGreaterThan(inputPickerIndex);
    expect(communityEntryIndex).toBeGreaterThan(primaryCtaIndex);
  });

  it("does not add any OCR or file-intake handling for the community helper entry", () => {
    expect(homeViewSource).toContain("onOpenCommunityHelperDemo");
    expect(homeViewSource).not.toContain("buildCommunityHelperPack");
    expect(homeViewSource).not.toContain("detectCommunityHelperSituationType");
    expect(homeViewSource).not.toContain("communityHelperPack");
  });

  it("does not include forbidden community helper claims in the new gated entry", () => {
    const cardStart = homeViewSource.indexOf("Community Helper Home Gated v1");
    const cardEnd = homeViewSource.indexOf("</section>", cardStart);
    const cardSection = homeViewSource.slice(cardStart, cardEnd);
    const normalised = normaliseSafetyText(cardSection);

    expect(cardStart).toBeGreaterThan(-1);

    for (const phrase of forbiddenCommunityHelperPhrases) {
      expect(normalised).not.toContain(normaliseSafetyText(phrase));
    }

    expect(findForbiddenSafetyPhrases(cardSection)).toEqual([]);
  });

  it("does not introduce auto-send, auto-submit, or auto-contact wording", () => {
    const cardStart = homeViewSource.indexOf("Community Helper Home Gated v1");
    const cardEnd = homeViewSource.indexOf("</section>", cardStart);
    const cardSection = homeViewSource.slice(cardStart, cardEnd);

    expect(cardSection).not.toMatch(/auto-?send/i);
    expect(cardSection).not.toMatch(/auto-?submit/i);
    expect(cardSection).not.toMatch(/auto-?contact/i);
  });
});
