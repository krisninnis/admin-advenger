import { describe, expect, it } from "vitest";
import { resolveBenefitsClaimant } from "../frontDoorIntent/benefitsClaimantResolution";
import { resolveFrontDoorRouteView } from "../frontDoorIntent/frontDoorRouteView";
import { decideFrontDoorSubmission } from "../frontDoorIntent/submissionDecision";

const route = (text: string) => resolveFrontDoorRouteView(text);

describe("benefits claimant resolution contract", () => {
  it.each([
    ["my PIP review is next month", "user", undefined],
    ["my mother's PIP review is next month", "one_other_person", "mother"],
    [
      "me and my dad both get PIP and his review is coming up",
      "one_other_person",
      "dad",
    ],
  ] as const)("returns a grounded resolved state for %s", (text, claimant, relationship) => {
    const result = resolveBenefitsClaimant(text);

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved") return;
    expect(result.claimant).toBe(claimant);
    if (relationship) {
      expect(result.claimant).toBe("one_other_person");
      if (result.claimant === "one_other_person") {
        expect(result.relationship).toBe(relationship);
      }
    }
    expect(text.toLowerCase()).toContain(result.evidence.sourceQuote.toLowerCase());
  });

  it.each([
    ["we have a PIP review coming up", "ambiguous"],
    ["her PIP is being reviewed", "ambiguous"],
    ["PIP review coming up", "unresolved"],
  ] as const)("returns %s claimant state for %s", (text, status) => {
    expect(resolveBenefitsClaimant(text).status).toBe(status);
  });

  it("records helper wording as context without representing authority", () => {
    const result = resolveBenefitsClaimant(
      "I help my brother with his benefits and he got a PIP review form",
    );

    expect(result.status).toBe("resolved");
    expect(result.helperContext).toBe(true);
    expect(result.helperEvidence).toMatch(/I help my brother/i);
    expect("authority" in result).toBe(false);
    expect("authorised" in result).toBe(false);
    expect("appointee" in result).toBe(false);
    expect("consent" in result).toBe(false);
    expect("permission" in result).toBe(false);
  });

  it("does not convert explicitly stated appointee wording into generic helper context", () => {
    const result = resolveBenefitsClaimant(
      "I am my dad's appointee and he has a PIP review",
    );

    expect(result.status).toBe("resolved");
    expect(result.helperContext).toBe(false);
    expect("authority" in result).toBe(false);
  });
});

const expectResolvedOrientation = (
  text: string,
  expectedPersonLabel?: string,
) => {
  const view = route(text);

  expect(view.kind).toBe("orientation");
  if (view.kind !== "orientation") return;
  expect(view.questionsAskedFirst).toBe(0);
  expect(view.personLabel).toBe(expectedPersonLabel);
  expect(view.specialistRouteOpened).toBe(false);
  expect(view.caseCreated).toBe(false);
  expect(view.targetConfirmed).toBe(false);
};

describe("resolved benefits claimants bypass redundant clarification", () => {
  it.each([
    ["my PIP review is next month", undefined],
    ["my mum has a PIP assessment next week", "mum"],
    ["my mum's PIP review is next month", "mum"],
    ["my father has a PIP review", "father"],
    ["my dad's PIP", "dad"],
    ["my wife has a PIP review", "wife"],
    ["my wife's PIP", "wife"],
    ["my daughter's PIP review is next month", "daughter"],
    ["my son gets PIP and his review is next month", "son"],
    ["my brother got a PIP review form", "brother"],
    ["my partner's PIP", "partner"],
    ["I help my brother with his benefits and he got a PIP review form", "brother"],
    ["me and my dad both get PIP and his review is coming up", "dad"],
    ["me and my wife both get PIP and my review is next month", undefined],
  ] as const)("resolves %s", (text, label) => {
    expectResolvedOrientation(text, label);
  });

  it("keeps a self-owned review focused on the user even when another claimant is mentioned", () => {
    const view = route("me and my wife both get PIP and my review is next month");

    expect(view.kind).toBe("orientation");
    if (view.kind !== "orientation") return;
    expect(view.interpretation).toMatch(/you may be trying/i);
    expect(view.interpretation).not.toMatch(/your wife could ask about/i);
  });

  it("keeps helper context separate from authority", () => {
    const view = route(
      "I help my brother with his benefits and he got a PIP review form",
    );

    expect(view.kind).toBe("orientation");
    if (view.kind !== "orientation") return;
    const visible = [
      view.interpretation,
      view.nextStep,
      ...view.gather,
      ...view.cannotDecide,
    ].join(" ");
    expect(visible).not.toMatch(
      /appointee|attorney|authorised|legal authority|consent|permission/i,
    );
  });

  it.each([
    ["my mother's PIP review", "mother"],
    ["my father's PIP assessment", "father"],
    ["my husband's PIP form", "husband"],
    ["my daughter's PIP review", "daughter"],
    ["my son gets PIP and his review is coming up", "son"],
    ["my brother's PIP", "brother"],
    ["my partner's PIP award", "partner"],
    ["I do my mum's paperwork and she has a PIP review", "mum"],
  ] as const)("keeps the grounded relationship for %s", (text, relationship) => {
    const result = resolveBenefitsClaimant(text);

    expect(result.status).toBe("resolved");
    if (result.status !== "resolved" || result.claimant !== "one_other_person") return;
    expect(result.relationship).toBe(relationship);
  });
});

describe("ambiguous or unresolved claimants still clarify", () => {
  it.each([
    "PIP review coming up",
    "got a PIP letter",
    "there is a PIP assessment next week",
    "we have a PIP review coming up",
    "someone has a PIP review",
    "her PIP is being reviewed",
    "his PIP is being reviewed",
    "me and my wife both get PIP and we have reviews coming up",
    "my mum and my sister both get PIP and her review is coming up",
    "my dad and my brother both get PIP and his review is coming up",
  ])("keeps the claimant question for %s", (text) => {
    const view = route(text);

    expect(view.kind).toBe("confirmation");
    if (view.kind !== "confirmation") return;
    expect(view.question).toBe("Whose benefits are you asking about?");
  });
});

describe("claimant resolution does not change stronger boundaries", () => {
  it.each([
    "my wife got a letter saying her PIP is being reviewed",
    "my husband got a letter saying his PIP is being reviewed",
    "my mum got a letter saying her PIP is being reviewed",
  ])("keeps document-shaped public-scope input on document analysis: %s", (text) => {
    expect(route(text).kind).toBe("document_analysis");
  });

  it.each([
    "my mum gets PIP and someone emailed asking for her bank password",
    "my dad's PIP message says click this link and enter your password",
    "my PIP review email asks for my card PIN",
  ])("does not let claimant resolution bypass the existing security boundary: %s", (text) => {
    expect(route(text).kind).not.toBe("orientation");
  });

  it.each([
    "my dad has a work review",
    "my mum has a blue badge review",
    "my broadband review is next month",
    "my sister has a review",
  ])("does not invent a benefits orientation for unrelated wording: %s", (text) => {
    expect(route(text).kind).not.toBe("orientation");
  });

  it.each([
    "my mum has a blue badge review and gets PIP",
    "my dad gets PIP and my review at work is next month",
  ])("does not auto-resolve incidental PIP background around another event: %s", (text) => {
    expect(route(text).kind).not.toBe("orientation");
  });

  it.each([
    "my father gets PIP but this letter is about council tax",
    "my wife mentioned PIP but this message is about our energy bill",
  ])("does not use an incidental PIP mention as the event subject: %s", (text) => {
    expect(route(text).kind).toBe("document_analysis");
  });
});

describe("submission decision carries resolved orientations to the existing UI", () => {
  it("interrupts with the zero-question orientation rather than document analysis", () => {
    const decision = decideFrontDoorSubmission({
      acceptedText: "my PIP review is next month",
      sourceTitle: "Pasted admin text",
      sourceType: "email",
    });

    expect(decision.kind).toBe("front_door_route");
    if (decision.kind !== "front_door_route") return;
    expect(decision.view.kind).toBe("orientation");
    expect(decision.view.questionsAskedFirst).toBe(0);
  });
});
