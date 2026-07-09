import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildAdviserExportPack, renderAdviserExportMarkdown } from "../../lib/adviserExportPack";
import { buildCommunityHelperPack, detectCommunityHelperSituationType } from "../../lib/communityHelperPack";
import { communityHelperDemoScenarios } from "../../lib/communityHelperDemoScenarios";
import { buildResultViewModel } from "../../lib/resultViewModel";
import demoTourViewSource from "../DemoTourView.tsx?raw";
import homeViewSource from "../HomeView.tsx?raw";
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
];

const forbiddenAutomationPhrases = [
  "sent automatically",
  "submitted automatically",
  "automatic submission",
  "we contacted",
  "we applied for you",
  "we appealed for you",
  "we challenged for you",
  "claim submitted",
  "contacted automatically",
];

const renderCommunityDemoCaseSheet = (scenarioId: string) => {
  const scenario = communityHelperDemoScenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new Error(`Missing community helper demo ${scenarioId}`);
  }

  const communityHelperPack = buildCommunityHelperPack({
    text: scenario.inputText,
    role: scenario.role,
  });
  const resultViewModel = buildResultViewModel({ communityHelperPack });
  const adviserExportPack = buildAdviserExportPack({
    resultViewModel,
    communityHelperPack,
  });
  const html = renderToStaticMarkup(
    <ResultCaseSheet
      model={resultViewModel}
      adviserExportPack={adviserExportPack}
      communityHelperPack={communityHelperPack}
      onDownloadAdviserPack={() => undefined}
      supportingDetailsOpen={false}
      onToggleSupportingDetails={() => undefined}
    />,
  );
  const markdown = renderAdviserExportMarkdown(adviserExportPack);

  return {
    scenario,
    communityHelperPack,
    resultViewModel,
    adviserExportPack,
    html,
    markdown,
    normalised: normaliseSafetyText(`${html}\n${markdown}`),
  };
};

const expectNoForbiddenCommunityHelperWording = (text: string) => {
  const normalised = normaliseSafetyText(text);

  for (const phrase of [...forbiddenCommunityHelperPhrases, ...forbiddenAutomationPhrases]) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(text)).toEqual([]);
};

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

  it("does not introduce forbidden safety wording in visible community helper demo copy", () => {
    const visibleCommunityCopy = [
      "Try a community support demo",
      "AdminAvenger helps prepare a summary and questions.",
      "This is preparation only, not a professional assessment.",
      "AdminAvenger helps prepare. You stay in control.",
      "This result was created from a synthetic example, not a real person or document.",
      ...communityHelperDemoScenarios.flatMap((scenario) => [scenario.title, scenario.description]),
    ].join("\n");

    expect(findForbiddenSafetyPhrases(visibleCommunityCopy)).toEqual([]);
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

  describe("Community Helper Demo UI v1", () => {
    it("renders community support demo copy, gating, and wiring", () => {
      expect(demoTourViewSource).toContain("Try a community support demo");
      expect(demoTourViewSource).toContain("Gated demo only");
      expect(demoTourViewSource).toContain("buildCommunityHelperPack");
      expect(demoTourViewSource).toContain("handleRunCommunityDemo");
      expect(demoTourViewSource).toContain(
        "AdminAvenger cannot decide care needs, safeguarding, diagnosis,",
      );
    });

    it("provides exactly the 4 required demo scenarios, each selectable/renderable", () => {
      expect(communityHelperDemoScenarios).toHaveLength(4);
      expect(communityHelperDemoScenarios.map((scenario) => scenario.title)).toEqual([
        "Missed letters or deadlines",
        "OT or support visit preparation",
        "Urgent safeguarding-like signposting",
        "Possible financial admin concern",
      ]);

      for (const scenario of communityHelperDemoScenarios) {
        expect(demoTourViewSource).toContain("communityHelperDemoScenarios.map");
        const { html } = renderCommunityDemoCaseSheet(scenario.id);
        expect(html).toContain("Preparation progress");
      }
    });

    it("covers all 4 community helper situation types via the detector", () => {
      const situationTypes = communityHelperDemoScenarios.map((scenario) =>
        detectCommunityHelperSituationType(scenario.inputText),
      );

      expect(situationTypes).toEqual([
        "missed_letters_or_deadlines",
        "ot_or_support_visit_preparation",
        "urgent_safeguarding_like_signpost",
        "vulnerability_financial_admin_concern",
      ]);
    });

    it("every community helper demo scenario renders required preparation-only wording safely", () => {
      for (const scenario of communityHelperDemoScenarios) {
        const { html, markdown, normalised } = renderCommunityDemoCaseSheet(scenario.id);

        expect(normalised).toContain("this is preparation only, not a professional assessment");
        expect(normalised).toContain("adminavenger helps prepare. you stay in control");
        expect(markdown).toContain("## Community support preparation pack");
        expect(html).toContain("Preparation progress");
        expectNoForbiddenCommunityHelperWording(`${html}\n${markdown}`);
      }
    });

    it("urgent safeguarding-like scenario signposts without deciding safeguarding", () => {
      const { normalised } = renderCommunityDemoCaseSheet("community-demo-urgent-safeguarding");

      expect(normalised).toContain("if someone may be in immediate danger");
      expect(normalised).toContain("adminavenger cannot decide safeguarding concerns");
      expect(normalised).not.toContain("safeguarding issue confirmed");
    });

    it("financial admin concern scenario stays factual and does not count money", () => {
      const { normalised } = renderCommunityDemoCaseSheet("community-demo-financial-concern");

      expect(normalised).not.toContain("financial abuse proven");
      expect(normalised).not.toContain("money owed");
      expect(normalised).not.toContain("money saved");
      expect(normalised).not.toContain("money recovered");
    });

    it("does not wire the community helper pack into HomeView or public routing", () => {
      expect(homeViewSource).not.toContain("communityHelperPack");
      expect(homeViewSource).not.toContain("buildCommunityHelperPack");
      expect(homeViewSource).not.toContain("CommunityHelperPack");
    });

    it("does not introduce auto-send, auto-submit, or auto-contact wording", () => {
      for (const scenario of communityHelperDemoScenarios) {
        const { html, markdown } = renderCommunityDemoCaseSheet(scenario.id);
        const combined = normaliseSafetyText(`${html}\n${markdown}`);

        for (const phrase of forbiddenAutomationPhrases) {
          expect(combined).not.toContain(normaliseSafetyText(phrase));
        }
      }

      expect(demoTourViewSource).not.toMatch(/auto-?send/i);
      expect(demoTourViewSource).not.toMatch(/auto-?submit/i);
      expect(demoTourViewSource).not.toMatch(/auto-?contact/i);
    });
  });
});
