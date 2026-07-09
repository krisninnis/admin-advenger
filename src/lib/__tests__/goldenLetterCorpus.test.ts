import { describe, expect, it } from "vitest";
import { buildCaseProgress, flattenCaseProgressText } from "../caseProgress";
import {
  assertExpectedTerms,
  assertGoldenSafety,
  buildGoldenCorpusScorecard,
  goldenLetterFixtures,
  normaliseGoldenText,
  runGoldenLetterFixture,
} from "../goldenLetters";
import { findForbiddenSafetyPhrases, hasSafetyTheme, normaliseSafetyText } from "../safetyWording";

const requiredFixtureIds = [
  "benefits-uc-statement-001",
  "benefits-uc-sanction-001",
  "benefits-uc-deductions-001",
  "benefits-pip-refusal-001",
  "benefits-pip-evidence-001",
  "benefits-wca-lcwra-001",
  "benefits-migration-notice-001",
  "benefits-council-tax-reduction-001",
  "benefits-change-circumstances-001",
  "benefits-crisis-support-001",
  "debt-collection-001",
  "parking-legal-looking-001",
  "letter-before-claim-debt-001",
  "consumer-refund-refusal-001",
  "suspicious-message-001",
  "unknown-official-letter-001",
] as const;

const runs = goldenLetterFixtures.map(runGoldenLetterFixture);

const likelyNiNumberPattern =
  /\b(?!QQ|XX)[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/i;
const likelyUkPhonePattern = /\b(?:\+44\s?7\d{3}|0(?:1|2|3|7|800)\d)\s?\d{3}\s?\d{3,4}\b/;
const realFixturePathPattern = /manual-test-fixtures|downloads\\|\.jpg|\.png|\.heic/i;
const disallowedRealReferencePattern = /\bN1QZ564Y\b|\bVCS23217813\b|\b09160334\b/;

describe("golden letter corpus integrity", () => {
  it("contains unique, complete synthetic fixtures", () => {
    expect(goldenLetterFixtures.length).toBeGreaterThanOrEqual(15);

    const ids = goldenLetterFixtures.map((fixture) => fixture.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const fixture of goldenLetterFixtures) {
      expect(fixture.id).toMatch(/^[a-z0-9-]+$/);
      expect(fixture.title).not.toBe("");
      expect(fixture.category).not.toBe("");
      expect(fixture.inputText.length).toBeGreaterThan(80);
      expect(fixture.expectedDocumentType).not.toBe("");
      expect(fixture.expectedKeyTerms.length).toBeGreaterThan(0);
      expect(fixture.expectedSafetyThemes.length).toBeGreaterThan(0);
      expect(fixture.expectedCannotKnowThemes.length).toBeGreaterThan(0);
      expect(fixture.expectedForbiddenAbsent.length).toBeGreaterThan(0);
      expect(fixture.notes).not.toBe("");
    }
  });

  it("covers every required fixture type", () => {
    const ids = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    for (const requiredId of requiredFixtureIds) {
      expect(ids.has(requiredId)).toBe(true);
    }
  });

  it("does not contain obvious real personal data or manual OCR fixture paths", () => {
    for (const fixture of goldenLetterFixtures) {
      expect(fixture.inputText).not.toMatch(likelyNiNumberPattern);
      expect(fixture.inputText).not.toMatch(likelyUkPhonePattern);
      expect(fixture.inputText).not.toMatch(realFixturePathPattern);
      expect(fixture.inputText).not.toMatch(disallowedRealReferencePattern);
      expect(fixture.inputText).toMatch(/Example|Sample|REF-EXAMPLE/);
    }
  });

  it("covers the required document categories and engine outputs", () => {
    const categories = new Set(goldenLetterFixtures.map((fixture) => fixture.category));
    const expectedTypes = new Set(goldenLetterFixtures.map((fixture) => fixture.expectedDocumentType));

    expect(categories).toEqual(
      expect.objectContaining({
        has: expect.any(Function),
      }),
    );
    expect(categories.has("benefits")).toBe(true);
    expect(categories.has("debt_legal")).toBe(true);
    expect(categories.has("consumer")).toBe(true);
    expect(categories.has("workplace")).toBe(true);
    // Community Helper Pack Core v1 - synthetic fixtures added; still run
    // through the unmodified main classifier, same as "workplace" above.
    expect(categories.has("community_helper")).toBe(true);
    expect(categories.has("suspicious_message")).toBe(true);
    expect(categories.has("unknown")).toBe(true);
    expect(expectedTypes.has("benefits_uc_statement")).toBe(true);
    expect(expectedTypes.has("benefits_uc_sanction")).toBe(true);
    expect(expectedTypes.has("benefits_uc_deductions")).toBe(true);
    expect(expectedTypes.has("benefits_decision")).toBe(true);
    expect(expectedTypes.has("benefits_evidence_prep")).toBe(true);
    expect(expectedTypes.has("benefits_wca_lcwra")).toBe(true);
    expect(expectedTypes.has("benefits_migration_notice")).toBe(true);
    expect(expectedTypes.has("council_tax_reduction")).toBe(true);
    expect(expectedTypes.has("benefits_change_of_circumstances")).toBe(true);
    expect(expectedTypes.has("benefits_crisis_support")).toBe(true);
    expect(expectedTypes.has("debt_collection")).toBe(true);
    expect(expectedTypes.has("parking_ticket")).toBe(true);
    expect(expectedTypes.has("consumer_dispute")).toBe(true);
    expect(expectedTypes.has("unknown_admin_dispute")).toBe(true);
  });
});

describe("golden letter corpus classification and routing", () => {
  it.each(runs)("$fixture.id routes to $fixture.expectedDocumentType", (run) => {
    expect(run.decisionResult.documentType).toBe(run.fixture.expectedDocumentType);
  });

  it("routes unknown and scam-like fixtures conservatively", () => {
    const suspicious = runs.find((run) => run.fixture.id === "suspicious-message-001");
    const unknown = runs.find((run) => run.fixture.id === "unknown-official-letter-001");

    expect(suspicious?.decisionResult.documentType).toBe("unknown_admin_dispute");
    expect(unknown?.decisionResult.documentType).toBe("unknown_admin_dispute");
    expect(normaliseSafetyText(suspicious?.outputText ?? "")).toContain("sender");
    expect(normaliseSafetyText(suspicious?.outputText ?? "")).not.toContain("safe to click");
  });

  it("does not route parking or debt fixtures as benefits", () => {
    const legalRuns = runs.filter((run) => run.fixture.category === "debt_legal");

    for (const run of legalRuns) {
      expect(run.decisionResult.documentType.startsWith("benefits")).toBe(false);
      expect(run.decisionResult.documentType).not.toBe("council_tax_reduction");
    }
  });

  it("does not route benefits fixtures as consumer disputes", () => {
    const benefitsRuns = runs.filter((run) => run.fixture.category === "benefits");

    for (const run of benefitsRuns) {
      expect(run.decisionResult.documentType).not.toBe("consumer_dispute");
    }
  });
});

describe("golden letter corpus extraction and facts", () => {
  it.each(runs)("$fixture.id includes expected key terms, dates, and money mentions", (run) => {
    assertExpectedTerms(run);
  });

  it("keeps benefits and debt money display-only in composed output", () => {
    const moneyRuns = runs.filter((run) => run.fixture.expectedMoneyMentions.length > 0);

    for (const run of moneyRuns) {
      expect(run.resultViewModel.moneyMentioned.every((line) => line.countedInMoneyTracker === false)).toBe(true);

      if (
        run.fixture.category === "benefits" ||
        run.fixture.category === "debt_legal" ||
        run.fixture.category === "consumer"
      ) {
        expect(
          run.resultViewModel.moneyMentioned.every((line) =>
            normaliseGoldenText(line.caution).includes("not counted"),
          ),
        ).toBe(true);
      }
    }
  });

  it("keeps expected dates as user-check-required where dates are extracted", () => {
    const runsWithDates = runs.filter((run) => run.fixture.expectedDates.length > 0);

    for (const run of runsWithDates) {
      expect(run.resultViewModel.keyDates.length).toBeGreaterThan(0);
      expect(run.resultViewModel.keyDates.every((date) => date.userMustCheck === true)).toBe(true);
      expect(run.resultViewModel.keyDates.every((date) => normaliseGoldenText(date.caution).includes("check"))).toBe(true);
    }
  });
});

describe("golden letter corpus safety", () => {
  it.each(runs)("$fixture.id has no forbidden generated safety wording", (run) => {
    expect(() => assertGoldenSafety(run)).not.toThrow();

    const output = normaliseGoldenText(run.outputText);
    for (const forbidden of run.fixture.expectedForbiddenAbsent) {
      expect(output).not.toContain(normaliseGoldenText(forbidden));
    }
  });

  it.each(runs)("$fixture.id keeps expected safety themes accessible", (run) => {
    for (const theme of run.fixture.expectedSafetyThemes) {
      expect(hasSafetyTheme(run.outputText, theme)).toBe(true);
    }
  });

  it.each(runs)("$fixture.id keeps cannot-know themes accessible", (run) => {
    const cannotKnowText = normaliseGoldenText(run.resultViewModel.cannotKnow.join(" "));

    for (const theme of run.fixture.expectedCannotKnowThemes) {
      expect(cannotKnowText).toContain(normaliseGoldenText(theme));
    }
  });
});

describe("golden letter corpus ResultViewModel integration", () => {
  it.each(runs)("$fixture.id builds a safe ResultViewModel", (run) => {
    expect(run.resultViewModel.title).not.toBe("");
    expect(run.resultViewModel.summary).not.toBe("");
    expect(run.resultViewModel.cannotKnow.length).toBeGreaterThan(0);
    expect(run.resultViewModel.uncertainty.length).toBeGreaterThan(0);
    expect(run.resultViewModel.safetyNotes.some((note) => normaliseGoldenText(note).includes("does not contact anyone"))).toBe(true);
  });

  it("creates Benefits Action Packs only for benefits-family fixtures", () => {
    for (const run of runs) {
      const expectsBenefitsPack =
        run.decisionResult.documentType.startsWith("benefits") ||
        run.decisionResult.documentType === "council_tax_reduction";

      expect(Boolean(run.benefitsActionPack)).toBe(expectsBenefitsPack);
    }
  });

  it("builds a green corpus scorecard", () => {
    const scorecard = buildGoldenCorpusScorecard(runs);

    expect(scorecard.totalFixtures).toBe(goldenLetterFixtures.length);
    expect(scorecard.passedFixtures).toBe(goldenLetterFixtures.length);
    expect(scorecard.failedFixtures).toEqual([]);
    expect(scorecard.safetyFailures).toEqual([]);
    expect(scorecard.categoriesCovered).toEqual(
      expect.arrayContaining([
        "benefits",
        "debt_legal",
        "consumer",
        "suspicious_message",
        "unknown",
        "ocr_edge",
        "hostile_input",
      ]),
    );
    expect(scorecard.highStakesFixtures).toBeGreaterThanOrEqual(14);
    expect(scorecard.fixturesWithDates).toBeGreaterThanOrEqual(7);
    expect(scorecard.fixturesWithMoney).toBeGreaterThanOrEqual(8);
  });
});

describe("golden letter corpus Adviser Export Pack integration", () => {
  it.each(runs)("$fixture.id builds an Adviser Export Pack that keeps cannotKnow and uncertainty", (run) => {
    expect(run.adviserExportPack.whyThisMatters).not.toBe("");
    expect(run.adviserExportPack.confidence.statement).not.toBe("");
    expect(run.adviserExportPack.cannotKnow).toEqual(run.resultViewModel.cannotKnow);
    expect(run.adviserExportPack.uncertainty).toEqual(run.resultViewModel.uncertainty);
    expect(run.adviserExportPack.cannotKnow.length).toBeGreaterThan(0);
    expect(run.adviserExportPack.uncertainty.length).toBeGreaterThan(0);
    expect(run.adviserExportPack.routeToCheck.length).toBeGreaterThan(0);
  });

  it.each(runs)("$fixture.id Adviser Export Pack has no forbidden generated safety wording", (run) => {
    const output = normaliseGoldenText(run.outputText);

    for (const forbidden of run.fixture.expectedForbiddenAbsent) {
      expect(output).not.toContain(normaliseGoldenText(forbidden));
    }

    expect(output).not.toContain("case strength");
  });

  it.each(runs)("$fixture.id Adviser Export Pack always includes the required safety lines", (run) => {
    const notes = run.adviserExportPack.safetyNotes.map((note) => normaliseGoldenText(note));

    expect(notes.some((note) => note.includes("preparation only"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been sent"))).toBe(true);
    expect(notes.some((note) => note.includes("nothing in this pack has been submitted"))).toBe(true);
    expect(notes.some((note) => note.includes("you stay in control"))).toBe(true);
    expect(notes.some((note) => note.includes("not legal, benefits, debt, financial, or immigration advice"))).toBe(true);
    expect(notes.some((note) => note.includes("checked against the original letter"))).toBe(true);
    expect(notes.some((note) => note.includes("display-only"))).toBe(true);
  });

  it.each(runs)("$fixture.id Adviser Export Pack handles the draft/checklist section explicitly", (run) => {
    const draft = run.adviserExportPack.draft;

    if (draft.included) {
      expect(draft.body).toBeTruthy();
    } else {
      expect(draft.noDraftLine).toBe("No draft was included in this pack.");
    }
  });
});

describe("golden letter corpus Case Progress Tracker smoke coverage", () => {
  const caseProgressFixtureIds = [
    "benefits-uc-sanction-001", // UC sanction
    "benefits-pip-refusal-001", // PIP decision
    "benefits-uc-deductions-001", // UC deductions
    "parking-legal-looking-001", // parking / legal-looking debt
    "debt-collection-001", // debt collection
    "consumer-refund-refusal-001", // consumer dispute
    "suspicious-message-001", // suspicious message
    "unknown-official-letter-001", // unknown fallback
  ] as const;

  it.each(caseProgressFixtureIds)("%s builds a safe, preparation-only Case Progress summary", (fixtureId) => {
    const fixture = goldenLetterFixtures.find((item) => item.id === fixtureId);

    if (!fixture) {
      throw new Error(`Missing golden fixture ${fixtureId}`);
    }

    const run = runGoldenLetterFixture(fixture);
    const summary = buildCaseProgress({
      resultViewModel: run.resultViewModel,
      decisionResult: run.decisionResult,
      benefitsActionPack: run.benefitsActionPack,
      strategicNextStepPlan: run.strategicNextStepPlan,
      adviserExportPack: run.adviserExportPack,
    });
    const text = flattenCaseProgressText(summary);

    // No forbidden safety wording anywhere in the generated checklist.
    expect(findForbiddenSafetyPhrases(text)).toEqual([]);

    // Preparation completeness only - never outcome likelihood, case
    // strength, or money recovered/saved/owed.
    expect(summary.percentComplete).toBeGreaterThanOrEqual(0);
    expect(summary.percentComplete).toBeLessThanOrEqual(100);
    expect(summary.label).toMatch(/of \d+ preparation steps complete|no preparation steps apply yet/i);

    const normalised = normaliseSafetyText(text);
    for (const forbidden of [
      "win chance",
      "success score",
      "case strength",
      "appeal strength",
      "legal strength",
      "entitlement score",
      "you qualify",
      "money saved",
      "money recovered",
      "you are owed",
    ]) {
      expect(normalised).not.toContain(forbidden);
    }
  });
});
