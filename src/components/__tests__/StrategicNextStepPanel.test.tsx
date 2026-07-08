import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STRATEGIC_NEXT_STEP_SAFETY_NOTE, type StrategicNextStepPlan } from "../../lib/strategicNextStep";
import { StrategicNextStepPanel } from "../StrategicNextStepPanel";

const plan: StrategicNextStepPlan = {
  title: "Best next move",
  plainEnglishSummary: "This appears to be a Universal Credit statement.",
  actors: [
    {
      label: "You",
      role: "Person deciding what happens next",
      likelyGoal: "Understand the message and keep useful options open.",
    },
    {
      label: "DWP or benefits office",
      role: "Organisation handling the benefits process",
      likelyGoal: "Apply its process and request evidence when needed.",
    },
  ],
  userGoal: "Understand why the payment changed.",
  missingInformation: ["Assessment period", "Deduction reason"],
  safestMove: {
    label: "Ask for a deduction breakdown",
    description: "Ask for a breakdown if any deduction is unclear.",
    whyThisHelps: "It asks for information before claiming the payment is wrong.",
    riskLevel: "low",
    reversibility: "easy_to_reverse",
    preservesOptions: true,
    requiresEvidence: true,
    requiresAdvice: false,
    doNotAutoSend: true,
  },
  otherSafeMoves: [
    {
      label: "Compare with the previous statement",
      description: "Check what changed since last month.",
      whyThisHelps: "It helps spot whether the issue is new or ongoing.",
      riskLevel: "low",
      reversibility: "easy_to_reverse",
      preservesOptions: true,
      requiresEvidence: true,
      requiresAdvice: false,
      doNotAutoSend: true,
    },
  ],
  movesToAvoid: ["Do not count money mentioned in the document as saved or recovered."],
  whenToGetAdvice: ["Get advice if the letter affects essentials."],
  uncertainty: ["The full statement may contain more detail."],
  cannotKnow: ["AdminAvenger cannot know whether the sender has other information."],
  safetyNotes: [STRATEGIC_NEXT_STEP_SAFETY_NOTE],
};

describe("StrategicNextStepPanel", () => {
  it("renders the required plain-English planner sections", () => {
    const html = renderToStaticMarkup(<StrategicNextStepPanel plan={plan} />);

    expect(html).toContain("Best next move");
    expect(html).toContain("What is going on");
    expect(html).toContain("Who is involved");
    expect(html).toContain("Your safest move");
    expect(html).toContain("Why this is safer");
    expect(html).toContain("Other safe options");
    expect(html).toContain("What not to rush");
    expect(html).toContain("What to check first");
    expect(html).toContain("When to get advice");
    expect(html).toContain("What AdminAvenger cannot know");
    expect(html).toContain(STRATEGIC_NEXT_STEP_SAFETY_NOTE);
  });

  it("does not expose internal strategy jargon in the UI", () => {
    const html = renderToStaticMarkup(<StrategicNextStepPanel plan={plan} />).toLowerCase();

    expect(html).not.toContain("game theory");
    expect(html).not.toContain("opponent");
    expect(html).not.toContain("payoff");
  });
});
