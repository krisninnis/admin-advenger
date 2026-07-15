import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buildAdviserExportPack, renderAdviserExportMarkdown } from "../../lib/adviserExportPack";
import { buildCommunityHelperPack, detectCommunityHelperSituationType } from "../../lib/communityHelperPack";
import { buildResultViewModel } from "../../lib/resultViewModel";
import { assessCommunityHelperPublicBetaReadiness } from "../../lib/communityHelperPublicBetaReadiness";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../../lib/safetyWording";
import { ResultCaseSheet } from "../../components/ResultCaseSheet";
import demoTourViewSource from "../DemoTourView.tsx?raw";
import homeViewSource from "../HomeView.tsx?raw";

// Community Helper Controlled Intake v1
//
// Verifies the new, explicitly opt-in manual-text intake path added to the
// existing gated Demo/tour page (DemoTourView.tsx). This is deliberately NOT
// automatic detection and NOT normal analyser/classifier integration - it
// only ever builds a CommunityHelperPack after a user pastes text and clicks
// "Prepare community support notes". See
// docs/product/community-helper-controlled-intake-v1.md.
//
// Mirrors the existing source-string-check pattern used by
// CommunityHelperHomeGated.test.tsx and communityHelperPublicBetaReadiness.ts
// (checking `?raw` source directly) plus the functional pack-building pattern
// used by DemoTourView.test.tsx, since this is the same underlying pipeline
// applied to pasted manual text instead of a hardcoded scenario.

// Forbidden phrase list for unsafe claims a Community Helper controlled
// intake result must never contain. Deliberately does NOT include the bare
// phrase "capacity decision": every shipped Community Helper adviser-export
// output includes the safe, negated disclaimer "This pack is not a
// diagnosis, safeguarding decision, capacity decision, eligibility
// decision, ..." (see adviserExportPack.ts's
// buildCommunityHelperPreparationNotes) and the boundary line "AdminAvenger
// cannot decide care needs, safeguarding, diagnosis, capacity, eligibility,
// equipment, or adaptations." A bare substring match can't tell "not a
// capacity decision" (safe disclaimer, required wording) apart from an
// actual unsafe claim, so this list only lists phrases that are unsafe
// under any phrasing. "lacks capacity" (an actual capacity claim) stays
// forbidden below; it never appears in the safe disclaimer wording.
const controlledIntakeForbiddenPhrases = [
  "risk score",
  "eligibility score",
  "safeguarding issue confirmed",
  "safeguarding confirmed",
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
];

const expectNoForbiddenControlledIntakeWording = (text: string) => {
  const normalised = normaliseSafetyText(text);

  for (const phrase of controlledIntakeForbiddenPhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(text)).toEqual([]);
};

// Extracts the handleRunControlledIntake function body from the raw source -
// the same lastIndexOf/regex-based approach communityHelperPublicBetaReadiness.ts
// uses for handleRunCommunityDemo - lets us assert on exactly what that one
// handler does, without needing to mount the whole stateful view.
const getControlledIntakeHandlerSource = () => {
  const match = demoTourViewSource.match(
    /const handleRunControlledIntake = \(\) => \{[\s\S]*?onActiveDemoScenarioChange\(undefined\);\s*\};/,
  );

  return match?.[0] ?? "";
};

// Extracts the controlled intake panel's own JSX block (the manual-text
// paste UI), from its identifying comment through to the section's own
// closing </section> - used to confirm no file, photo, or OCR control
// exists anywhere inside this specific panel.
const getControlledIntakePanelSource = () => {
  const marker = "Prepare notes from text I choose to paste";
  const markerIndex = demoTourViewSource.indexOf(marker);
  const start = markerIndex === -1 ? -1 : demoTourViewSource.lastIndexOf("<section", markerIndex);
  const end = markerIndex === -1 ? -1 : demoTourViewSource.indexOf("</section>", markerIndex);

  return start === -1 ? "" : demoTourViewSource.slice(start, end === -1 ? undefined : end);
};

const getControlledIntakeExamplesSource = () => {
  const panelSource = getControlledIntakePanelSource();
  const start = panelSource.indexOf("Try example wording");
  const end = panelSource.indexOf("Text to prepare from", start);

  return start === -1 ? "" : panelSource.slice(start, end === -1 ? undefined : end);
};

const getControlledIntakeResultBannerSource = () => {
  const marker = "Public beta result prepared";
  const markerIndex = demoTourViewSource.indexOf(marker);
  const start = markerIndex === -1 ? -1 : demoTourViewSource.lastIndexOf("<section", markerIndex);
  const end = markerIndex === -1 ? -1 : demoTourViewSource.indexOf("</section>", markerIndex);

  return start === -1 ? "" : demoTourViewSource.slice(start, end === -1 ? undefined : end);
};

const getControlledIntakeFeedbackPanelSource = () => {
  const marker = "Help improve this beta";
  const markerIndex = demoTourViewSource.indexOf(marker);
  const start = markerIndex === -1 ? -1 : demoTourViewSource.lastIndexOf("<section", markerIndex);
  const end = markerIndex === -1 ? -1 : demoTourViewSource.indexOf("</section>", markerIndex);

  return start === -1 ? "" : demoTourViewSource.slice(start, end === -1 ? undefined : end);
};

const getControlledIntakeFeedbackSaveHandlerSource = () => {
  const match = demoTourViewSource.match(
    /const handleSaveControlledIntakeFeedback = \(\) => \{[\s\S]*?setControlledIntakeFeedbackSaved\(true\);\s*\};/,
  );

  return match?.[0] ?? "";
};

const getControlledIntakeFeedbackClearHandlerSource = () => {
  const match = demoTourViewSource.match(
    /const handleClearControlledIntakeFeedback = \(\) => \{[\s\S]*?setControlledIntakeFeedbackSaved\(false\);\s*\};/,
  );

  return match?.[0] ?? "";
};

const getHomeCommunityHelperCardSource = () => {
  const marker = "Community Helper Home Gated v1";
  const markerIndex = homeViewSource.lastIndexOf(marker);
  const end = markerIndex === -1 ? -1 : homeViewSource.indexOf("</section>", markerIndex);

  return markerIndex === -1 ? "" : homeViewSource.slice(markerIndex, end === -1 ? undefined : end);
};

const buildControlledIntakeResult = (
  text: string,
  role: "for_myself" | "helping_someone" | "supporting_people_at_work" = "helping_someone",
) => {
  const communityHelperPack = buildCommunityHelperPack({ text, role });
  const resultViewModel = buildResultViewModel({ communityHelperPack });
  const adviserExportPack = buildAdviserExportPack({ resultViewModel, communityHelperPack });
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
    communityHelperPack,
    resultViewModel,
    adviserExportPack,
    html,
    markdown,
    normalised: normaliseSafetyText(`${html}\n${markdown}`),
  };
};

describe("Community Helper Controlled Intake v1", () => {
  it("adds an explicit, clearly-labelled controlled intake entry on the gated Demo/tour page", () => {
    expect(demoTourViewSource).toContain("Prepare notes from text I choose to paste");
    expect(demoTourViewSource).toContain("Public beta");
    expect(demoTourViewSource).toContain("Controlled public beta. Manual text only.");
    expect(demoTourViewSource).toContain("Manual text only");
    expect(demoTourViewSource).toContain("Community support prep");
    expect(demoTourViewSource).toContain("Preparation only");
    expect(demoTourViewSource).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(demoTourViewSource).toContain("Manual text only. Nothing is sent, saved, or shared automatically.");
    expect(demoTourViewSource).toContain(
      "This is not legal, care, medical, benefits, or safeguarding advice.",
    );
    expect(demoTourViewSource).toContain(
      "If urgent or someone may be unsafe, contact an appropriate person or service directly.",
    );
    expect(demoTourViewSource).toContain("Prepare community support notes");
    expect(demoTourViewSource).toContain("handleRunControlledIntake");
  });

  it("adds starter example chips that only fill the manual textarea", () => {
    const examplesSource = getControlledIntakeExamplesSource();

    expect(examplesSource).toContain("Try example wording");
    expect(demoTourViewSource).toContain("Missed letters/deadlines");
    expect(demoTourViewSource).toContain("Support visit notes");
    expect(demoTourViewSource).toContain("Money/admin concern");
    expect(examplesSource).toContain("communityHelperControlledIntakeExamples.map");
    expect(examplesSource).toContain("setControlledIntakeText(example.text)");
    expect(examplesSource).not.toContain("handleRunControlledIntake");
    expect(examplesSource).not.toContain("buildCommunityHelperPack");
    expect(examplesSource).not.toContain("setControlledIntakeResult");
    expect(examplesSource).not.toContain("onClearResult");
  });

  it("is only reachable through the existing gated Community Helper Demo/tour route, not from HomeView", () => {
    // HomeView still only ever navigates to the Demo/tour page - it never
    // gains its own copy of the manual intake UI, state, or handler.
    expect(homeViewSource).not.toContain("Prepare community support notes");
    expect(homeViewSource).not.toContain("controlledIntakeText");
    expect(homeViewSource).not.toContain("handleRunControlledIntake");
    expect(homeViewSource).not.toContain("buildCommunityHelperPack");
    expect(homeViewSource).not.toContain("CommunityHelperPack");
    expect(homeViewSource).not.toContain("communityHelperPack");
    expect(homeViewSource).toContain("onOpenCommunityHelperDemo");

    // The controlled intake panel lives after the existing "Try a community
    // support demo" scenario grid - both are reached only via Demo/tour,
    // never HomeView.
    const communitySectionIndex = demoTourViewSource.indexOf("Try a community support demo");
    const scenarioGridIndex = demoTourViewSource.indexOf("communityHelperDemoScenarios.map");
    const controlledIntakeIndex = demoTourViewSource.indexOf("Prepare notes from text I choose to paste");

    expect(communitySectionIndex).toBeGreaterThan(-1);
    expect(scenarioGridIndex).toBeGreaterThan(-1);
    expect(controlledIntakeIndex).toBeGreaterThan(communitySectionIndex);
    expect(controlledIntakeIndex).toBeGreaterThan(scenarioGridIndex);
  });

  it("keeps HomeView's normal 'What does this mean?' check flow completely unchanged", () => {
    expect(homeViewSource).toContain('onCheck("Pasted admin text", "email", textToCheck)');
    expect(homeViewSource).not.toContain("analyseDecisionProblem");
  });

  it("does not add community helper detection to the decision-engine classifier", () => {
    // Scoped to the controlled intake handler itself, not the whole file:
    // DemoTourView.tsx's own explanatory comment above this handler
    // legitimately says "...nothing in this function calls analyseAdminItem,
    // touches the decision-engine classifier..." - a safe, negated mention,
    // not a real reference. A whole-file `not.toContain("analyseDecisionProblem")`
    // would fail on that safe comment, so the handler-body check below is
    // what actually proves the safety property.
    const handlerSource = getControlledIntakeHandlerSource();

    expect(handlerSource.length).toBeGreaterThan(0);
    expect(handlerSource).not.toMatch(/analyseDecisionProblem|analyseAdminItem|decisionEngine|classifier/i);
  });

  it("does not let OCR, photo, file, or document intake trigger the controlled intake handler", () => {
    const handlerSource = getControlledIntakeHandlerSource();

    expect(handlerSource).not.toMatch(/readTextFromImage|extractPdfText|extractDocxText|\bocr\b|attachedFiles|photo/i);
    expect(handlerSource).toContain("controlledIntakeText");
    expect(handlerSource).toContain("buildCommunityHelperPack");
  });

  it("the controlled intake panel itself has no file, photo, camera, or OCR control - manual text only", () => {
    const panelSource = getControlledIntakePanelSource();

    expect(panelSource.length).toBeGreaterThan(0);
    expect(panelSource).not.toMatch(/type="file"|accept=|capture=|<input\s+type="file"/i);
    expect(panelSource).not.toMatch(
      /readTextFromImage|extractPdfText|extractDocxText|PhotoCapturePanel|DocumentAttachmentArea|onDrop|getFilesFromDroppedDataTransfer|drag/i,
    );
    expect(panelSource).toContain("<textarea");
  });

  it("only builds a pack when the user explicitly clicks 'Prepare community support notes' - never on every keystroke", () => {
    // The textarea's onChange only ever updates the text state; it must
    // never itself call the pack builder or the check handler.
    const textareaMatch = demoTourViewSource.match(
      /<textarea[\s\S]*?onChange=\{([\s\S]*?)\}\s*\n/,
    );

    expect(textareaMatch?.[1] ?? "").toContain("setControlledIntakeText");
    expect(textareaMatch?.[1] ?? "").not.toContain("buildCommunityHelperPack");
    expect(demoTourViewSource).toContain("onClick={handleRunControlledIntake}");
    expect(getControlledIntakeExamplesSource()).not.toContain("onClick={handleRunControlledIntake}");
  });

  it("public beta readiness still passes 10/10 against the real, currently-shipped source", () => {
    const report = assessCommunityHelperPublicBetaReadiness({ homeViewSource, demoTourViewSource });

    expect(report.allPassed).toBe(true);
    expect(report.totalCount).toBe(10);
    expect(report.passedCount).toBe(10);
  });

  it("keeps public beta surfaces free of unsafe claims and automatic-action wording", () => {
    const report = assessCommunityHelperPublicBetaReadiness({ homeViewSource, demoTourViewSource });
    const surfaces = [
      ["Home gated card", getHomeCommunityHelperCardSource()],
      ["Controlled intake panel", getControlledIntakePanelSource()],
      ["Controlled result banner", getControlledIntakeResultBannerSource()],
      [
        "Readiness report wording",
        report.checks
          .map((check) => [check.label, check.description, check.detail].join("\n"))
          .join("\n"),
      ],
    ] as const;

    for (const [label, source] of surfaces) {
      expect(source, label).not.toHaveLength(0);
      expectNoForbiddenControlledIntakeWording(source);
    }
  });

  it("shows the feedback panel only after a controlled Community Helper result", () => {
    const feedbackPanelSource = getControlledIntakeFeedbackPanelSource();
    const resultBannerIndex = demoTourViewSource.indexOf("Public beta result prepared");
    const feedbackIndex = demoTourViewSource.indexOf("Help improve this beta");

    expect(feedbackPanelSource).toContain("Help improve this beta");
    expect(feedbackPanelSource).toContain("This feedback stays on this device");
    expect(feedbackPanelSource).toContain("Was this useful?");
    expect(feedbackPanelSource).toContain("What was unclear or missing?");
    expect(feedbackPanelSource).toContain("Save feedback locally");
    expect(feedbackPanelSource).toContain("Clear feedback");
    expect(demoTourViewSource).toContain("{isControlledIntakeResultActive ? (");
    expect(feedbackIndex).toBeGreaterThan(resultBannerIndex);
  });

  it("keeps feedback local-only with no analytics, network, API, or storage call", () => {
    const feedbackPanelSource = getControlledIntakeFeedbackPanelSource();
    const saveHandlerSource = getControlledIntakeFeedbackSaveHandlerSource();
    const clearHandlerSource = getControlledIntakeFeedbackClearHandlerSource();
    const feedbackSource = [feedbackPanelSource, saveHandlerSource, clearHandlerSource].join("\n");

    expect(feedbackPanelSource).toContain("It is not analytics");
    expect(feedbackPanelSource).toContain("AdminAvenger does not send it anywhere");
    expect(saveHandlerSource).toContain("setControlledIntakeFeedbackSaved(true)");
    expect(clearHandlerSource).toContain("setControlledIntakeFeedbackUsefulness(undefined)");
    expect(clearHandlerSource).toContain('setControlledIntakeFeedbackText("")');
    expect(clearHandlerSource).toContain("setControlledIntakeFeedbackSaved(false)");
    expect(feedbackSource).not.toMatch(
      /fetch|XMLHttpRequest|sendBeacon|navigator\.sendBeacon|localStorage|sessionStorage|\/api/i,
    );
  });

  it("feedback choices and typing only update local feedback UI state", () => {
    const feedbackPanelSource = getControlledIntakeFeedbackPanelSource();

    expect(feedbackPanelSource).toContain("setControlledIntakeFeedbackUsefulness");
    expect(feedbackPanelSource).toContain("setControlledIntakeFeedbackText");
    expect(feedbackPanelSource).toContain("setControlledIntakeFeedbackSaved(false)");
    expect(feedbackPanelSource).not.toContain("handleRunControlledIntake");
    expect(feedbackPanelSource).not.toContain("buildCommunityHelperPack");
    expect(feedbackPanelSource).not.toContain("onClearResult");
    expect(feedbackPanelSource).not.toMatch(/analyseDecisionProblem|analyseAdminItem|decisionEngine|classifier/i);
  });

  it("keeps safety boundary wording visible in the feedback panel", () => {
    const feedbackPanelSource = getControlledIntakeFeedbackPanelSource();

    expect(feedbackPanelSource).toContain("Preparation only");
    expect(feedbackPanelSource).toContain("Manual text only");
    expect(feedbackPanelSource).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(feedbackPanelSource).toContain("Nothing is sent, saved, or shared automatically.");
    expect(feedbackPanelSource).toContain("Not legal, care, medical, benefits, or safeguarding advice.");
    expectNoForbiddenControlledIntakeWording(feedbackPanelSource);
  });

  it("builds a Community Helper output from ordinary pasted manual text, with preparation-only boundary wording", () => {
    const { html, markdown, normalised } = buildControlledIntakeResult(
      "I'm helping my mum sort through some letters. She missed a reply-by date on one of them and I'm not sure what to do next.",
    );

    expect(html).toContain("Preparation progress");
    expect(markdown).toContain("## Community support preparation pack");
    expect(normalised).toContain("this is preparation only, not a professional assessment");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control");
    expectNoForbiddenControlledIntakeWording(`${html}\n${markdown}`);
  });

  it("keeps urgent safeguarding-like pasted text signposting-only, never deciding safeguarding", () => {
    const inputText =
      "I'm really worried the person I support may be in immediate danger at home. There have been signs of possible abuse and neglect and I don't know what to do.";
    const { communityHelperPack, normalised } = buildControlledIntakeResult(inputText);

    expect(detectCommunityHelperSituationType(inputText)).toBe("urgent_safeguarding_like_signpost");
    expect(communityHelperPack.situationType).toBe("urgent_safeguarding_like_signpost");
    expect(communityHelperPack.dailyLifeImpact).toEqual([]);
    expect(communityHelperPack.adminBarriers).toEqual([]);
    expect(communityHelperPack.keyFactsToCheck).toEqual([]);
    expect(communityHelperPack.evidenceToGather).toEqual([]);
    expect(communityHelperPack.questionsToAsk).toEqual([]);
    expect(normalised).toContain("if someone may be in immediate danger");
    expect(normalised).toContain("adminavenger cannot decide safeguarding concerns");
    expectNoForbiddenControlledIntakeWording(normalised);
  });

  it("keeps a pasted financial admin concern factual and non-accusatory, never counting money", () => {
    const { communityHelperPack, normalised } = buildControlledIntakeResult(
      "I think someone else has been taking my dad's bank card and controlling his money, but I'm not sure exactly what has happened yet.",
    );

    expect(communityHelperPack.situationType).toBe("vulnerability_financial_admin_concern");
    expect(normalised).not.toContain("financial abuse proven");
    expect(normalised).not.toContain("money owed");
    expect(normalised).not.toContain("money saved");
    expect(normalised).not.toContain("money recovered");
    expectNoForbiddenControlledIntakeWording(normalised);
  });

  it("keeps capacity, diagnosis, equipment, and adaptation wording as uncertainty - never a decision", () => {
    const { communityHelperPack, normalised } = buildControlledIntakeResult(
      "I'm helping someone with letters after a diagnosis. I am worried they might not understand the paperwork and there is talk about equipment or adaptations, but no professional has explained what has been decided.",
    );
    const cannotKnowText = normaliseSafetyText(communityHelperPack.cannotKnow.join("\n"));

    expect(cannotKnowText).toContain("diagnosis");
    expect(cannotKnowText).toContain("equipment");
    expect(cannotKnowText).toContain("adaptation");
    expect(normalised).toContain("cannot decide care needs");
    expect(normalised).not.toContain("lacks capacity");
    expect(normalised).not.toContain("does not have capacity");
    expect(normalised).not.toContain("diagnosed as");
    expect(normalised).not.toContain("needs this equipment");
    expect(normalised).not.toContain("needs this adaptation");
    expectNoForbiddenControlledIntakeWording(normalised);
  });

  it("labels a controlled-intake result as 'Public beta', distinct from the 'Synthetic demo' scenario label", () => {
    expect(demoTourViewSource).toContain("isControlledIntakeResultActive");
    expect(demoTourViewSource).toContain('"Public beta" : "Synthetic demo"');
    expect(demoTourViewSource).toContain("Prepared from text you pasted");
    expect(demoTourViewSource).toContain(
      "Public beta result prepared from text you chose to paste, in this browser only. Manual text only. Nothing has been sent, saved, or shared.",
    );
  });

  it("never introduces auto-send, auto-submit, or auto-contact wording anywhere in the controlled intake panel", () => {
    const panelSource = getControlledIntakePanelSource();

    expect(panelSource).not.toMatch(/auto-?send/i);
    expect(panelSource).not.toMatch(/auto-?submit/i);
    expect(panelSource).not.toMatch(/auto-?contact/i);
    expect(demoTourViewSource).not.toContain("cloud");
  });

  it("does not touch OCR/file/photo/document intake modules or components anywhere in DemoTourView.tsx", () => {
    expect(demoTourViewSource).not.toMatch(
      /readTextFromImage|extractPdfText|extractDocxText|PhotoCapturePanel|DocumentAttachmentArea|photoOcr|photoCapture|documentAttachmentIntake|documentFileText|getFilesFromDroppedDataTransfer/,
    );
  });
});
