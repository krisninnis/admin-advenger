import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildAdviserExportPack, renderAdviserExportMarkdown } from "../../lib/adviserExportPack";
import { buildResultViewModel } from "../../lib/resultViewModel";
import demoTourViewSource from "../DemoTourView.tsx?raw";
import { demoScenarios, workplaceDemoScenarios } from "../../lib/demoScenarios";
import { goldenLetterFixtures } from "../../lib/goldenLetters";
import { buildWorkplaceSupportPack } from "../../lib/workplaceSupportPack";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../../lib/safetyWording";
import { ResultCaseSheet } from "../../components/ResultCaseSheet";

const forbiddenWorkplacePhrases = [
  "employer broke the law",
  "you will win",
  "unfair dismissal proven",
  "discrimination proven",
  "valid claim",
  "invalid claim",
  "case strength",
  "success chance",
  "win chance",
  "tribunal prediction",
  "compensation owed",
  "you are owed",
  "money saved",
  "money recovered",
  "resign now",
  "refuse the meeting",
  "sign the agreement",
  "do not sign the agreement",
];

const renderWorkplaceDemoCaseSheet = (scenarioId: string) => {
  const scenario = workplaceDemoScenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Missing workplace demo ${scenarioId}`);
  }

  const workplaceSupportPack = buildWorkplaceSupportPack({
    text: scenario.inputText,
  });
  const resultViewModel = buildResultViewModel({ workplaceSupportPack });
  const adviserExportPack = buildAdviserExportPack({
    resultViewModel,
    workplaceSupportPack,
  });
  const html = renderToStaticMarkup(
    <ResultCaseSheet
      model={resultViewModel}
      adviserExportPack={adviserExportPack}
      workplaceSupportPack={workplaceSupportPack}
      onDownloadAdviserPack={() => undefined}
      supportingDetailsOpen={false}
      onToggleSupportingDetails={() => undefined}
    />,
  );
  const markdown = renderAdviserExportMarkdown(adviserExportPack);

  return {
    scenario,
    workplaceSupportPack,
    resultViewModel,
    adviserExportPack,
    html,
    markdown,
    normalised: normaliseSafetyText(`${html}\n${markdown}`),
  };
};

const expectNoForbiddenWorkplaceWording = (text: string) => {
  const normalised = normaliseSafetyText(text);

  for (const phrase of forbiddenWorkplacePhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(text)).toEqual([]);
};

describe("DemoTourView", () => {
  it("explains the synthetic demo journey", () => {
    expect(demoTourViewSource).toContain("Demo / tour");
    expect(demoTourViewSource).toContain(
      "Try AdminAvenger safely with synthetic examples.",
    );
    expect(demoTourViewSource).toContain("Choose a synthetic demo letter.");
    expect(demoTourViewSource).toContain("Run the normal check.");
    expect(demoTourViewSource).toContain("Review the result case sheet.");
    expect(demoTourViewSource).toContain("Download an adviser pack if useful.");
    expect(demoTourViewSource).toContain("Clear local data from Settings if needed.");
  });

  it("renders result-sheet and adviser export wiring for demo results", () => {
    expect(demoTourViewSource).toContain("<ResultCaseSheet");
    expect(demoTourViewSource).toContain("buildResultViewModel");
    expect(demoTourViewSource).toContain("buildAdviserExportPack");
    expect(demoTourViewSource).toContain("downloadAdviserExportMarkdown");
  });

  it("renders workplace support demo copy and options", () => {
    expect(demoTourViewSource).toContain("Try a workplace support demo");
    expect(demoTourViewSource).toContain(
      "These are synthetic examples. AdminAvenger helps prepare questions",
    );
    expect(demoTourViewSource).toContain("buildWorkplaceSupportPack");
    expect(demoTourViewSource).toContain("handleRunWorkplaceDemo");
    expect(workplaceDemoScenarios.map((scenario) => scenario.title)).toEqual(
      expect.arrayContaining([
        "Workplace: disciplinary meeting invite",
        "Workplace: pay or wage confusion",
        "Workplace: sickness or capability meeting",
        "Workplace: redundancy consultation",
        "Workplace: settlement agreement warning",
        "Workplace: unclear workplace message",
      ]),
    );
  });

  it("keeps curated scenarios available from Golden Letter Corpus fixtures", () => {
    const fixtureIds = new Set(goldenLetterFixtures.map((fixture) => fixture.id));

    expect(demoScenarios.length).toBeGreaterThanOrEqual(8);
    for (const scenario of demoScenarios) {
      expect(fixtureIds.has(scenario.fixtureId)).toBe(true);
      expect(scenario.synthetic).toBe(true);
    }
  });

  it("does not introduce forbidden safety wording in visible tour copy", () => {
    const visibleTourCopy = [
      "Demo / tour",
      "Try AdminAvenger safely with synthetic examples.",
      "Use this tour to see how AdminAvenger works without using a real letter.",
      "All examples here are synthetic and come from the Golden Letter Corpus.",
      "Preparation only. Nothing is sent. Nothing is submitted. AdminAvenger helps prepare. You stay in control.",
      "Check dates and money against the original letter.",
      "This result was created from a synthetic example, not a real document.",
      ...demoScenarios.flatMap((scenario) => [
        scenario.title,
        scenario.category,
        scenario.description,
      ]),
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleTourCopy)).toEqual([]);
  });

  it("selecting a disciplinary workplace demo renders workplace preparation safely", () => {
    const { html, markdown, normalised } = renderWorkplaceDemoCaseSheet("demo-workplace-disciplinary");

    expect(html).toContain("Disciplinary meeting preparation");
    expect(html).toContain("Workplace preparation only");
    expect(html).toContain("Preparation progress");
    expect(html).toContain("Download adviser pack");
    expect(markdown).toContain("## Workplace preparation pack");
    expect(normalised).toContain("this is preparation only, not legal or employment advice");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control");
    expect(normalised).toContain("acas");
    expectNoForbiddenWorkplaceWording(`${html}\n${markdown}`);
  });

  it("settlement agreement demo renders human-review warning and no signing advice", () => {
    const { html, markdown, adviserExportPack, normalised } =
      renderWorkplaceDemoCaseSheet("demo-workplace-settlement");

    expect(adviserExportPack.draft.included).toBe(false);
    expect(html).toContain("Settlement agreement preparation warning");
    expect(normalised).toContain("do not rely on adminavenger to decide what to do with a settlement agreement");
    expect(markdown).toContain("No draft was included in this pack.");
    expect(normalised).not.toContain("good deal");
    expect(normalised).not.toContain("bad deal");
    expect(normalised).not.toContain("sign the agreement");
    expect(normalised).not.toContain("do not sign the agreement");
    expectNoForbiddenWorkplaceWording(`${html}\n${markdown}`);
  });
});
