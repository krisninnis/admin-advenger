import { describe, expect, it } from "vitest";
import {
  ADVISER_PACK_NO_DRAFT_LINE,
  getAdviserExportFilename,
  buildAdviserExportPack,
  renderAdviserExportMarkdown,
} from "../adviserExportPack";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import type { DecisionResult } from "../decisionEngine/types";
import { goldenLetterFixtures, runGoldenLetterFixture } from "../goldenLetters";
import { buildResultViewModel } from "../resultViewModel";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../safetyWording";
import { buildStrategicNextStepPlan } from "../strategicNextStep";

const ucSanctionText = `Universal Credit sanction decision
To: Jordan Sample
Reference: REF-EXAMPLE-SANCTION-002

We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask for a Mandatory Reconsideration if you disagree.
The letter also says hardship support may be available if you cannot cover food, heating, or rent.`;

const buildUcSanctionPack = () => {
  const decisionResult = analyseDecisionProblem(ucSanctionText);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({ decisionResult, benefitsActionPack });
  const resultViewModel = buildResultViewModel({ decisionResult, benefitsActionPack, strategicNextStepPlan });
  const adviserExportPack = buildAdviserExportPack({
    decisionResult,
    resultViewModel,
    benefitsActionPack,
    strategicNextStepPlan,
  });

  return { decisionResult, benefitsActionPack, strategicNextStepPlan, resultViewModel, adviserExportPack };
};

describe("Adviser Export Pack v1 - UC sanction", () => {
  it("routes to the UC sanction engine", () => {
    const { decisionResult } = buildUcSanctionPack();

    expect(decisionResult.documentType).toBe("benefits_uc_sanction");
  });

  it("includes why this matters, explained cautiously and without predicting an outcome", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.whyThisMatters).not.toBe("");
    expect(adviserExportPack.whyThisMatters.toLowerCase()).toContain("payment");
    expect(findForbiddenSafetyPhrases(adviserExportPack.whyThisMatters)).toEqual([]);
  });

  it("includes confidence as a plain-language statement, not case strength", () => {
    const { adviserExportPack, decisionResult } = buildUcSanctionPack();

    expect(adviserExportPack.confidence.level).toBe(decisionResult.confidence.level);
    expect(adviserExportPack.confidence.statement).not.toBe("");
    expect(normaliseSafetyText(adviserExportPack.confidence.statement)).not.toContain("case strength");
    expect(normaliseSafetyText(adviserExportPack.confidence.statement)).not.toMatch(/^(high|medium|low)$/);
  });

  it("includes uncertainty and does not hide it in a details-only section", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.uncertainty.length).toBeGreaterThan(0);
    expect(findForbiddenSafetyPhrases(adviserExportPack.uncertainty.join(" "))).toEqual([]);
  });

  it("includes cannotKnow", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.cannotKnow.length).toBeGreaterThan(0);
  });

  it("includes a route-to-check / what may happen next section covering the known route", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const route = normaliseSafetyText(adviserExportPack.routeToCheck.join(" "));

    expect(adviserExportPack.routeToCheck.length).toBeGreaterThan(0);
    expect(route).toContain("decision date");
    expect(route).toContain("reason");
    expect(route).toContain("mandatory reconsideration");
    expect(route).toContain("hardship");
    expect(route).toContain("check this against the original letter");
    expect(findForbiddenSafetyPhrases(adviserExportPack.routeToCheck.join(" "))).toEqual([]);
  });

  it("includes the draft/checklist the engine already generates, with a review warning", () => {
    const { adviserExportPack } = buildUcSanctionPack();

    expect(adviserExportPack.draft.included).toBe(true);
    expect(adviserExportPack.draft.body).toBeTruthy();
    expect(adviserExportPack.draft.reviewWarning).not.toBe("");
  });

  it("always includes the required safety lines", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const notes = adviserExportPack.safetyNotes.map((note) => normaliseSafetyText(note));

    expect(notes.some((note) => note.includes("preparation only"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been sent"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been submitted"))).toBe(true);
    expect(notes.some((note) => note === "adminavenger helps prepare. you stay in control.")).toBe(true);
    expect(notes.some((note) => note.includes("not legal, benefits, debt, financial, or immigration advice"))).toBe(true);
    expect(notes.some((note) => note.includes("checked against the original letter"))).toBe(true);
    expect(notes.some((note) => note.includes("display-only"))).toBe(true);
  });

  it("contains none of the forbidden wording for this feature", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const allText = [
      adviserExportPack.whyThisMatters,
      adviserExportPack.confidence.statement,
      ...adviserExportPack.uncertainty,
      ...adviserExportPack.cannotKnow,
      ...adviserExportPack.routeToCheck,
      adviserExportPack.draft.body ?? "",
      ...adviserExportPack.safetyNotes,
    ].join(" ");
    const normalised = normaliseSafetyText(allText);

    for (const phrase of [
      "you should appeal",
      "you must appeal",
      "dwp is wrong",
      "you will win",
      "you qualify",
      "case strength",
      "valid claim",
      "invalid claim",
      "you are owed",
    ]) {
      expect(normalised).not.toContain(phrase);
    }

    expect(findForbiddenSafetyPhrases(allText)).toEqual([]);
  });

  it("renders Markdown with all required adviser pack sections", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);

    expect(markdown).toContain("# AdminAvenger adviser pack");
    expect(markdown).toContain("This pack is for preparation only");
    expect(markdown).toContain("Generated: Date not stored in this pack");
    expect(markdown).toContain("## What this appears to be");
    expect(markdown).toContain("## Why this matters");
    expect(markdown).toContain("## Confidence");
    expect(markdown).toContain("## Uncertainty");
    expect(markdown).toContain("## What may happen next / route to check");
    expect(markdown).toContain("## Key dates to check");
    expect(markdown).toContain("## Money mentioned, display-only");
    expect(markdown).toContain("## Evidence/documents to bring");
    expect(markdown).toContain("## Questions to answer");
    expect(markdown).toContain("## What AdminAvenger cannot know");
    expect(markdown).toContain("## Draft/checklist");
    expect(markdown).toContain("## Footer");
  });

  it("renders Markdown safety boundaries, cannotKnow, and uncertainty", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);
    const normalised = normaliseSafetyText(markdown);

    expect(markdown).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(markdown).toContain("AdminAvenger does not contact anyone for you.");
    expect(markdown).toContain("Nothing has been sent or submitted by AdminAvenger.");
    expect(markdown).toContain("This is not legal, benefits, debt, financial, or immigration advice.");
    expect(normalised).toContain("whether dwp will accept your reason");
    expect(normalised).toContain("good reason");
    expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
  });

  it("renders dates as check-against-original-letter and money as display-only", () => {
    const { adviserExportPack } = buildUcSanctionPack();
    const markdown = renderAdviserExportMarkdown(adviserExportPack);
    const normalised = normaliseSafetyText(markdown);

    expect(normalised).toContain("check against original letter");
    expect(normalised).toContain("display-only");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("you are owed");
  });

  it("uses a privacy-safe filename", () => {
    const filename = getAdviserExportFilename();

    expect(filename).toBe("adminavenger-adviser-pack.md");
    expect(filename).not.toMatch(/universal|credit|sanction|dwp|jordan|sample|ref|gbp|£|\d/iu);
  });
});

describe("Adviser Export Pack v1 - draft/checklist handling", () => {
  const baseDecisionResult: DecisionResult = {
    documentType: "unknown_admin_dispute",
    title: "Admin document check",
    plainEnglishSummary: "This looks like a general admin message that needs a careful check.",
    caseStrength: "not_enough_information",
    strengthLabel: "Needs more information",
    whatThisLooksLike: "A general message without enough detail to say more.",
    possibleGrounds: [],
    confidence: { level: "low", reason: "There was not enough text to be confident about the read." },
    uncertainty: ["It is unclear what this message is asking for."],
    cannotKnow: ["AdminAvenger cannot know what the sender intended beyond this text."],
    evidenceNeeded: [],
    deadlines: [],
    risks: [],
    nextSteps: [],
    safetyNotes: [],
    amountTreatment: "no_money_counted",
    sourceFacts: [],
  };

  it("shows an explicit 'no draft was included' line when the engine has no draft or next steps to build one from", () => {
    const benefitsActionPack = buildBenefitsActionPack(baseDecisionResult);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult: baseDecisionResult,
      benefitsActionPack,
    });
    const resultViewModel = buildResultViewModel({
      decisionResult: baseDecisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
    });
    const adviserExportPack = buildAdviserExportPack({
      decisionResult: baseDecisionResult,
      resultViewModel,
      benefitsActionPack,
      strategicNextStepPlan,
    });

    expect(adviserExportPack.draft.included).toBe(false);
    expect(adviserExportPack.draft.noDraftLine).toBe(ADVISER_PACK_NO_DRAFT_LINE);
    expect(adviserExportPack.draft.body).toBeUndefined();
    expect(renderAdviserExportMarkdown(adviserExportPack)).toContain(ADVISER_PACK_NO_DRAFT_LINE);
  });
});

describe("Adviser Export Pack v1 - golden corpus Markdown", () => {
  const selectedFixtureIds = [
    "benefits-uc-sanction-001",
    "debt-collection-001",
    "consumer-refund-refusal-001",
    "unknown-official-letter-001",
  ];
  const selectedRuns = selectedFixtureIds.map((id) =>
    runGoldenLetterFixture(goldenLetterFixtures.find((fixture) => fixture.id === id)!),
  );

  it.each(selectedRuns)("$fixture.id renders safe adviser Markdown", (run) => {
    const markdown = renderAdviserExportMarkdown(run.adviserExportPack);

    expect(markdown).toContain("# AdminAvenger adviser pack");
    expect(markdown).toContain("## What AdminAvenger cannot know");
    expect(markdown).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(markdown).toContain("Nothing has been sent or submitted by AdminAvenger.");
    expect(findForbiddenSafetyPhrases(markdown)).toEqual([]);
    expect(normaliseSafetyText(markdown)).not.toContain("case strength");
  });
});
