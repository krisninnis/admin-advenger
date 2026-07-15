import {
  ADVISER_PACK_COMMUNITY_BOUNDARY_NOTE,
  ADVISER_PACK_COMMUNITY_CONSENT_NOTE,
  ADVISER_PACK_COMMUNITY_PREPARATION_NOTE,
  ADVISER_PACK_COMMUNITY_SIGNPOSTING_NOTE,
  ADVISER_PACK_COMMUNITY_URGENT_NOTE,
  ADVISER_PACK_CONTROL_NOTE,
} from "./adviserExportPack";
import { buildCommunityHelperPack, flattenCommunityHelperPackText } from "./communityHelperPack";
import { communityHelperDemoScenarios } from "./communityHelperDemoScenarios";
import { normaliseSafetyText } from "./safetyWording";

// Community Helper Public Beta Prep v1
//
// A readonly checklist/readiness module. It does not change any runtime
// behaviour, does not build a CommunityHelperPack from live user text, and
// is not wired into HomeView, DemoTourView, the decision-engine classifier,
// or OCR/file intake. It only reads already-exported, already-shipped data
// (the 4 hardcoded demo scenarios, the pack builder, and the shared adviser
// export boundary constants) plus two raw view-source strings supplied by
// the caller (normally a test, via Vite's `?raw` import - see
// src/lib/__tests__/communityHelperPublicBetaReadiness.test.ts) and reports
// whether Community Helper still satisfies the public-beta-prep safety
// checklist. See docs/product/community-helper-public-beta-prep-v1.md.
//
// This module intentionally does NOT modify src/lib/safetyWording.ts's
// shared FORBIDDEN_* constants - those feed live text-filtering logic in
// resultViewModel.ts and adviserExportPack.ts, so changing them would risk
// silently altering generated output. Instead it defines its own, wider
// PUBLIC_BETA_PREP_FORBIDDEN_PHRASES list used only for this checklist.

export type CommunityHelperPublicBetaReadinessStatus = "pass" | "fail";

export type CommunityHelperPublicBetaReadinessCheck = {
  id: string;
  label: string;
  description: string;
  status: CommunityHelperPublicBetaReadinessStatus;
  detail: string;
};

export type CommunityHelperPublicBetaReadinessInput = {
  // Raw source of src/views/HomeView.tsx (e.g. via `import homeViewSource
  // from "../views/HomeView.tsx?raw"`).
  homeViewSource: string;
  // Raw source of src/views/DemoTourView.tsx (e.g. via `import
  // demoTourViewSource from "../views/DemoTourView.tsx?raw"`).
  demoTourViewSource: string;
};

export type CommunityHelperPublicBetaReadinessReport = {
  checks: CommunityHelperPublicBetaReadinessCheck[];
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
};

// Wider than safetyWording.ts's FORBIDDEN_COMMUNITY_HELPER_CLAIMS on
// purpose - this is a stricter, beta-readiness-only guard list, not the live
// generation filter.
export const PUBLIC_BETA_PREP_FORBIDDEN_PHRASES = [
  "risk score",
  "eligibility score",
  "safeguarding issue confirmed",
  "safeguarding confirmed",
  "capacity decision",
  "lacks capacity",
  "does not have capacity",
  "diagnosed as",
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
  "automatically contact",
  "automatically submit",
  "automatically send",
] as const;

const EXPECTED_DEMO_SCENARIO_IDS = [
  "community-demo-missed-letters",
  "community-demo-ot-visit",
  "community-demo-urgent-safeguarding",
  "community-demo-financial-concern",
] as const;

const findLocalForbiddenPhrases = (text: string): string[] => {
  const normalised = normaliseSafetyText(text);

  return PUBLIC_BETA_PREP_FORBIDDEN_PHRASES.filter((phrase) =>
    normalised.includes(normaliseSafetyText(phrase)),
  );
};

const extractSection = (source: string, startMarker: string, endMarker: string): string => {
  // Use the LAST occurrence of startMarker, not the first. HomeView.tsx
  // legitimately mentions "Community Helper Home Gated v1" twice: once in
  // a prop-type doc comment near the top of the file (documenting the
  // onOpenCommunityHelperDemo prop), and once in the JSX comment that
  // immediately precedes the actual rendered <section> card near the
  // bottom of the file. Taking the first occurrence would anchor `start`
  // at the doc comment and then grab whatever unrelated <section> happens
  // to close next in the file - silently scanning the wrong content and
  // missing the real card entirely. The JSX comment directly above the
  // rendered section is always the occurrence closest to (i.e. last
  // before) that section's own markup, so lastIndexOf reliably finds the
  // real card even if an earlier doc comment repeats the same marker text.
  const start = source.lastIndexOf(startMarker);

  if (start === -1) {
    return "";
  }

  const end = source.indexOf(endMarker, start);

  return end === -1 ? source.slice(start) : source.slice(start, end + endMarker.length);
};

const demoPacks = communityHelperDemoScenarios.map((scenario) => ({
  scenario,
  pack: buildCommunityHelperPack({ text: scenario.inputText, role: scenario.role }),
}));

const flattenedDemoPacksText = demoPacks
  .map(({ pack }) => flattenCommunityHelperPackText(pack))
  .join("\n");

const sharedBoundaryConstantsText = [
  ADVISER_PACK_COMMUNITY_PREPARATION_NOTE,
  ADVISER_PACK_COMMUNITY_BOUNDARY_NOTE,
  ADVISER_PACK_COMMUNITY_SIGNPOSTING_NOTE,
  ADVISER_PACK_COMMUNITY_CONSENT_NOTE,
  ADVISER_PACK_COMMUNITY_URGENT_NOTE,
  ADVISER_PACK_CONTROL_NOTE,
].join("\n");

export const assessCommunityHelperPublicBetaReadiness = (
  input: CommunityHelperPublicBetaReadinessInput,
): CommunityHelperPublicBetaReadinessReport => {
  const { homeViewSource, demoTourViewSource } = input;
  const checks: CommunityHelperPublicBetaReadinessCheck[] = [];

  // 1. Remains secondary/gated from Home.
  const homeHasGatedEntry =
    homeViewSource.includes("Controlled public beta") &&
    homeViewSource.includes("Community support prep") &&
    homeViewSource.includes("Open controlled beta");

  checks.push({
    id: "home_gated_secondary",
    label: "Community Helper remains secondary/gated from Home",
    description:
      "HomeView shows a small, clearly labelled beta/demo entry rather than making Community Helper the default intake.",
    status: homeHasGatedEntry ? "pass" : "fail",
    detail: homeHasGatedEntry
      ? "Gated 'Community support prep' controlled public beta card found on HomeView."
      : "Gated Community Helper card not found on HomeView.",
  });

  // 2. Not wired into the normal classifier / HomeView never references the pack.
  const homeHasNoPackWiring =
    !homeViewSource.includes("buildCommunityHelperPack") &&
    !homeViewSource.includes("CommunityHelperPack") &&
    !homeViewSource.includes("communityHelperPack");

  checks.push({
    id: "home_no_classifier_wiring",
    label: "Community Helper is not wired into the normal classifier",
    description:
      "HomeView does not import, reference, or build a CommunityHelperPack from pasted/uploaded text.",
    status: homeHasNoPackWiring ? "pass" : "fail",
    detail: homeHasNoPackWiring
      ? "No CommunityHelperPack reference found in HomeView."
      : "HomeView references CommunityHelperPack - review before public beta.",
  });

  // 3. HomeView does not import buildCommunityHelperPack.
  const homeHasNoBuilderImport =
    !homeViewSource.includes('"../lib/communityHelperPack"') &&
    !homeViewSource.includes("'../lib/communityHelperPack'");

  checks.push({
    id: "home_no_builder_import",
    label: "HomeView does not import buildCommunityHelperPack",
    description:
      "No import statement pulling in the community helper pack builder module exists in HomeView.",
    status: homeHasNoBuilderImport ? "pass" : "fail",
    detail: homeHasNoBuilderImport
      ? "No import of ../lib/communityHelperPack found in HomeView."
      : "HomeView imports the community helper pack module - review before public beta.",
  });

  // 4. DemoTourView remains the only UI surface that builds community helper packs.
  const demoTourBuildsPack = demoTourViewSource.includes("buildCommunityHelperPack");
  const onlyDemoTourBuilds = demoTourBuildsPack && homeHasNoPackWiring;

  checks.push({
    id: "demo_tour_only_surface",
    label: "DemoTourView remains the only UI surface that builds community helper demo packs",
    description: "buildCommunityHelperPack is called from DemoTourView.tsx only, not from HomeView.tsx.",
    status: onlyDemoTourBuilds ? "pass" : "fail",
    detail: onlyDemoTourBuilds
      ? "DemoTourView builds community helper packs; HomeView does not."
      : "Expected DemoTourView to build community helper packs and HomeView not to.",
  });

  // 5. No OCR/file intake path triggers Community Helper automatically.
  const communityHandlerMatch = demoTourViewSource.match(
    /const handleRunCommunityDemo[\s\S]*?onActiveDemoScenarioChange\(scenario\.id\);\s*\};/,
  );
  const communityHandlerSource = communityHandlerMatch?.[0] ?? "";
  const noOcrTrigger =
    communityHandlerSource.length > 0 &&
    !/readTextFromImage|extractPdfText|extractDocxText|\bocr\b|attachedFiles|photo/i.test(communityHandlerSource) &&
    communityHandlerSource.includes("scenario.inputText");

  checks.push({
    id: "no_ocr_auto_trigger",
    label: "No OCR/file intake path triggers Community Helper automatically",
    description:
      "The community helper demo handler builds its pack only from a fixed scenario.inputText string, never from OCR, photo, or attached-file state.",
    status: noOcrTrigger ? "pass" : "fail",
    detail: noOcrTrigger
      ? "handleRunCommunityDemo builds only from scenario.inputText, with no OCR/file-intake reference."
      : "Could not confirm the community demo handler is isolated from OCR/file intake - review DemoTourView.tsx.",
  });

  // 6. Demo scenarios remain synthetic/hardcoded.
  const scenarioIds = communityHelperDemoScenarios.map((scenario) => scenario.id);
  const scenariosMatchExpected =
    communityHelperDemoScenarios.length === 4 &&
    EXPECTED_DEMO_SCENARIO_IDS.every((id) => scenarioIds.includes(id)) &&
    demoTourViewSource.includes("communityHelperDemoScenarios.map");

  checks.push({
    id: "demo_scenarios_synthetic",
    label: "Demo scenarios remain synthetic/hardcoded",
    description:
      "Exactly the 4 known, hardcoded demo scenarios exist and are rendered from the static list, not from live user text.",
    status: scenariosMatchExpected ? "pass" : "fail",
    detail: scenariosMatchExpected
      ? `${communityHelperDemoScenarios.length} hardcoded scenarios found: ${scenarioIds.join(", ")}.`
      : `Expected exactly 4 hardcoded scenarios (${EXPECTED_DEMO_SCENARIO_IDS.join(", ")}), found: ${scenarioIds.join(", ")}.`,
  });

  // 7. Boundary wording exists.
  const boundaryText = normaliseSafetyText(
    [flattenedDemoPacksText, sharedBoundaryConstantsText, homeViewSource, demoTourViewSource].join("\n"),
  );
  const hasPreparationOnly = boundaryText.includes("preparation only");
  const hasControlLine = boundaryText.includes("adminavenger helps prepare. you stay in control");
  const hasNotAdviceEquivalent =
    boundaryText.includes("not a professional assessment") ||
    boundaryText.includes("cannot decide care needs") ||
    boundaryText.includes("not an assessment, diagnosis, safeguarding decision");
  const hasSuitablePersonLine = boundaryText.includes("another trusted person");
  const boundaryWordingPresent =
    hasPreparationOnly && hasControlLine && hasNotAdviceEquivalent && hasSuitablePersonLine;

  checks.push({
    id: "boundary_wording_present",
    label: "Boundary wording exists across public-beta-facing surfaces",
    description:
      "Preparation-only, control, not-a-professional-assessment, and get-help-from-a-suitable-person wording are all present.",
    status: boundaryWordingPresent ? "pass" : "fail",
    detail: boundaryWordingPresent
      ? "All 4 boundary wording themes found."
      : `Missing: ${[
          !hasPreparationOnly && "preparation only",
          !hasControlLine && "AdminAvenger helps prepare. You stay in control.",
          !hasNotAdviceEquivalent && "not-a-professional-assessment equivalent",
          !hasSuitablePersonLine && "trusted person / suitable professional signposting",
        ]
          .filter(Boolean)
          .join(", ")}.`,
  });

  // 8. Urgent safeguarding-like scenario is signposting only.
  const urgentScenario = demoPacks.find(
    ({ scenario }) => scenario.id === "community-demo-urgent-safeguarding",
  );
  const urgentIsSignpostingOnly = Boolean(
    urgentScenario &&
      urgentScenario.pack.situationType === "urgent_safeguarding_like_signpost" &&
      urgentScenario.pack.dailyLifeImpact.length === 0 &&
      urgentScenario.pack.adminBarriers.length === 0 &&
      urgentScenario.pack.keyFactsToCheck.length === 0 &&
      urgentScenario.pack.evidenceToGather.length === 0 &&
      urgentScenario.pack.questionsToAsk.length === 0 &&
      findLocalForbiddenPhrases(flattenCommunityHelperPackText(urgentScenario.pack)).length === 0,
  );

  checks.push({
    id: "urgent_signposting_only",
    label: "Urgent safeguarding-like scenario is signposting only",
    description:
      "The urgent safeguarding-like demo produces no daily-life/admin analysis - only cannot-know, safe next steps, and signposting.",
    status: urgentIsSignpostingOnly ? "pass" : "fail",
    detail: urgentIsSignpostingOnly
      ? "Urgent scenario pack contains signposting only, with no forbidden phrases."
      : "Urgent scenario pack did not match the expected signposting-only shape - review before public beta.",
  });

  // 9. Financial admin concern scenario stays factual and non-accusatory.
  const financialScenario = demoPacks.find(
    ({ scenario }) => scenario.id === "community-demo-financial-concern",
  );
  const financialIsFactual = Boolean(
    financialScenario &&
      financialScenario.pack.situationType === "vulnerability_financial_admin_concern" &&
      findLocalForbiddenPhrases(flattenCommunityHelperPackText(financialScenario.pack)).length === 0,
  );

  checks.push({
    id: "financial_concern_factual",
    label: "Financial admin concern scenario stays factual and non-accusatory",
    description:
      "The financial admin concern demo records only observed facts and questions, with no financial-abuse or money-owed/saved/recovered claims.",
    status: financialIsFactual ? "pass" : "fail",
    detail: financialIsFactual
      ? "Financial concern pack contains no forbidden phrases."
      : "Financial concern pack did not match the expected factual shape - review before public beta.",
  });

  // 10. No forbidden phrases in public-beta-facing artifacts.
  const artifactsToScan = [
    {
      label: "HomeView gated card",
      text: extractSection(homeViewSource, "Community Helper Home Gated v1", "</section>"),
    },
    {
      label: "DemoTourView community section",
      text: extractSection(demoTourViewSource, "Try a community support demo", "</section>"),
    },
    {
      label: "DemoTourView controlled intake panel",
      text: extractSection(demoTourViewSource, "Prepare notes from text I choose to paste", "</section>"),
    },
    {
      label: "DemoTourView controlled result banner",
      text: extractSection(demoTourViewSource, "Public beta result prepared", "</section>"),
    },
    ...demoPacks.map(({ scenario, pack }) => ({
      label: `Demo scenario: ${scenario.title}`,
      text: flattenCommunityHelperPackText(pack),
    })),
    { label: "Shared adviser export boundary constants", text: sharedBoundaryConstantsText },
    {
      label: "Readiness report wording",
      text: checks
        .map((check) => [check.label, check.description, check.detail].join("\n"))
        .join("\n"),
    },
  ];
  const forbiddenMatches = artifactsToScan.flatMap(({ label, text }) =>
    findLocalForbiddenPhrases(text).map((phrase) => `${label}: "${phrase}"`),
  );

  checks.push({
    id: "no_forbidden_phrases",
    label: "No forbidden phrases appear in Community Helper public-beta-facing artifacts",
    description:
      "Scans the HomeView gated card, DemoTourView community section, controlled intake panel, controlled result banner, all 4 demo scenario outputs, readiness wording, and shared adviser-export boundary constants against the expanded public-beta forbidden-phrase list.",
    status: forbiddenMatches.length === 0 ? "pass" : "fail",
    detail:
      forbiddenMatches.length === 0
        ? "No forbidden phrases found."
        : `Forbidden phrases found: ${forbiddenMatches.join("; ")}.`,
  });

  const passedCount = checks.filter((check) => check.status === "pass").length;

  return {
    checks,
    allPassed: passedCount === checks.length,
    passedCount,
    totalCount: checks.length,
  };
};
