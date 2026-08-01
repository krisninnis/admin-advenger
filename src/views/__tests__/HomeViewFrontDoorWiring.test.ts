import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";

// Front-Door Intent Routing v1, UI wiring slice.
//
// These assertions are about shape rather than behaviour, and they exist for
// one reason: the defect they guard against is a missing call, not a wrong
// answer. A handler that quietly reaches analysis on its own produces a
// perfectly normal-looking result, so no output assertion anywhere would catch
// it. What has to be true is that there is exactly one route to analysis and
// every handler takes it.
//
// The behaviour these paths produce is asserted in
// src/lib/__tests__/frontDoorSubmissionDecision.test.ts and
// src/views/__tests__/HomeViewFrontDoorSubmissionPaths.test.tsx.

const occurrences = (source: string, needle: string): number =>
  source.split(needle).length - 1;

const functionBody = (source: string, declaration: string): string => {
  const start = source.indexOf(declaration);
  expect(start, `could not find ${declaration}`).toBeGreaterThanOrEqual(0);

  // Every handler in HomeView is a top-level arrow constant, so the next
  // occurrence of a newline followed by two spaces and "};" ends it.
  const end = source.indexOf("\n  };", start);
  expect(end, `could not find the end of ${declaration}`).toBeGreaterThan(start);

  return source.slice(start, end);
};

describe("there is one way into analysis", () => {
  it("hands off to analysis from the two post-decision runners and nowhere else", () => {
    // submitAcceptedText is the hand-off into the existing analysis journey.
    // Two call sites live in runOllamaExtraction (success and fallback) and one
    // in runOrdinaryMessageCheck. A fourth would mean a handler had found its
    // own way past the front door.
    expect(occurrences(homeViewSource, "submitAcceptedText({")).toBe(3);
  });

  it("calls the two runners only from the shared submission function", () => {
    const shared = functionBody(homeViewSource, "const submitFrontDoorSource = async (");

    // One call site each. The declarations read `const runOllamaExtraction =`
    // and so are not counted here.
    expect(occurrences(homeViewSource, "runOllamaExtraction(")).toBe(1);
    expect(occurrences(homeViewSource, "runOrdinaryMessageCheck(")).toBe(1);
    expect(shared).toContain("await runOllamaExtraction(decision.source)");
    expect(shared).toContain("await runOrdinaryMessageCheck(decision.source)");
  });

  it("decides before it acts, so no setting can skip the decision", () => {
    const shared = functionBody(homeViewSource, "const submitFrontDoorSource = async (");
    const decisionAt = shared.indexOf("const decision =");
    const ollamaAt = shared.indexOf("isLocalOllamaMode");

    expect(decisionAt).toBeGreaterThanOrEqual(0);
    expect(ollamaAt).toBeGreaterThan(decisionAt);
  });
});

describe("every submission path goes through the shared function", () => {
  it.each([
    { name: "the check button", declaration: "const handleCheck = async () => {" },
    {
      name: "reviewed photo text",
      declaration: "const handleCheckOcrText = async (reviewedText = ocrText) => {",
    },
    {
      name: "the ordinary message override",
      declaration: "const handleFrontDoorCheckAsMessage = async () => {",
    },
  ])("$name submits through submitFrontDoorSource", ({ declaration }) => {
    const body = functionBody(homeViewSource, declaration);

    expect(body).toContain("submitFrontDoorSource(");
    expect(body).not.toContain("submitAcceptedText(");
    expect(body).not.toContain("runOllamaExtraction(");
    expect(body).not.toContain("isLocalOllamaMode");
  });
});

describe("the classifier is not duplicated across handlers", () => {
  it("leaves classification to the decision helper", () => {
    expect(homeViewSource).not.toContain("classifyFrontDoorIntent");
    expect(homeViewSource).not.toContain("deriveFrontDoorRouteView");
    expect(homeViewSource).toContain("decideFrontDoorSubmission");
    expect(homeViewSource).toContain("ordinaryDocumentSubmission");
  });
});

describe("source metadata survives the ordinary message override", () => {
  it("submits the stored source rather than a fixed title", () => {
    const body = functionBody(
      homeViewSource,
      "const handleFrontDoorCheckAsMessage = async () => {",
    );

    expect(body).toContain("frontDoorRoute.source");
    expect(body).not.toContain('"Pasted admin text"');
    expect(body).toContain("skipFrontDoor: true");
  });
});

describe("a stale route cannot survive a change of input", () => {
  it("invalidates the route whenever the input it was decided from changes", () => {
    expect(homeViewSource).toContain("frontDoorInputSnapshotsMatch");
    expect(homeViewSource).toContain('dispatchFrontDoorRoute({ type: "source_changed" })');
    // The snapshot covers the input mode, the typed or loaded text, and the
    // combined attachment text, which is every way the source input can change.
    expect(homeViewSource).toContain("inputMode: selectedInput");
    expect(homeViewSource).toContain("attachmentsText: attachmentCombinedText");
  });
});
