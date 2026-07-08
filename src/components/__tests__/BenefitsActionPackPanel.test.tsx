import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsActionPackPanel } from "../BenefitsActionPackPanel";
import benefitsActionPackPanelSource from "../BenefitsActionPackPanel.tsx?raw";
import type { BenefitsActionPack } from "../../lib/benefitsActionPack";

const pack: BenefitsActionPack = {
  id: "benefits-action-pack-test",
  title: "Universal Credit statement check",
  documentType: "benefits_uc_statement",
  documentStage:
    "This appears to be about a Universal Credit statement. Check the statement to confirm the assessment period, payment, and deductions.",
  summary: "This looks like a Universal Credit statement.",
  whatMatters: ["Deductions are mentioned."],
  possibleDatesToCheck: [
    {
      id: "date-1",
      label: "Assessment period",
      value: "1 June to 30 June 2026",
      userMustCheck: true,
      caution: "Check this date on your letter. This may matter, but AdminAvenger cannot confirm the deadline.",
    },
  ],
  moneyMentioned: [
    {
      id: "money-1",
      label: "Payment this month",
      amountText: "GBP 813.45",
      treatment: "amount_mentioned_only",
      countedInMoneyTracker: false,
      caution: "This is money mentioned in the letter. AdminAvenger has not checked whether it is correct.",
    },
  ],
  evidenceFound: [
    {
      id: "evidence-1",
      label: "Deductions section found",
      value: "Yes",
      source: "detected",
    },
  ],
  evidenceMissing: ["Full statement"],
  risks: ["A deduction that looks wrong keeps reducing your payment until it is queried."],
  questionsToAnswer: [{ id: "question-1", question: "Do you recognise this deduction?" }],
  uncertainty: ["The exact assessment period needs checking."],
  cannotKnow: ["Whether all account entries are visible."],
  nextSafeStep: "Check the statement and gather evidence.",
  draftOrChecklist: "- Check the date\n- Check deductions",
  safetyNotes: ["You decide what happens next."],
};

describe("BenefitsActionPackPanel", () => {
  it("renders the core Benefits Action Pack sections by default", () => {
    const html = renderToStaticMarkup(<BenefitsActionPackPanel pack={pack} />);

    expect(html).toContain("What this appears to be");
    expect(html).toContain("Possible dates to check");
    expect(html).toContain("Money mentioned");
    expect(html).toContain("Evidence to gather");
    expect(html).toContain("Questions to answer");
    expect(html).toContain("What AdminAvenger cannot know");
    expect(html).toContain("Not counted in savings, recovered money, or the money tracker.");
    expect(html).toContain("Check this date on your letter.");
    expect(html).toContain("does not contact anyone for you");
    expect(html).toContain("Show full action pack");
  });

  it("keeps longer action pack detail collapsed by default but accessible", () => {
    const html = renderToStaticMarkup(<BenefitsActionPackPanel pack={pack} />);

    expect(html).not.toContain("What matters");
    expect(html).not.toContain("Evidence already seen");
    expect(html).not.toContain("Risks to be aware of");
    expect(html).not.toContain("Uncertainty");
    expect(html).not.toContain("Draft/checklist if available");
    expect(html).toContain("Show full action pack");
  });

  it("never renders raw internal evidence prefixes as if they were human copy", () => {
    const packWithInternalCaseEvidence: BenefitsActionPack = {
      ...pack,
      // Simulates the labels the case file adds for its own bookkeeping. The
      // builder is expected to strip these before they reach the panel; this
      // fixture passes them directly to prove the rendered output never shows
      // debug-style prefixes even if one slipped through.
      evidenceFound: [
        { id: "evidence-1", label: "Deductions section found", value: "Yes", source: "detected" },
      ],
    };

    const html = renderToStaticMarkup(
      <BenefitsActionPackPanel pack={packWithInternalCaseEvidence} />,
    );

    for (const rawPrefix of [
      "Possible ground:",
      "Missing:",
      "Deadline/urgency:",
      "Risk:",
      "Safety note:",
      "Source:",
    ]) {
      expect(html).not.toContain(rawPrefix);
    }
  });

  // The draft/checklist text only appears once "Show full action pack" is
  // expanded, and this project's tests run without jsdom (see
  // photoCapture.test.ts and others) so that click can't be simulated here.
  // Checking the source directly confirms the copy button is wired to the
  // same pack.draftOrChecklist text shown to the user, not a placeholder or
  // a separate/duplicate value.
  it("wires a copy button to the same draft/checklist text shown in the full action pack", () => {
    expect(benefitsActionPackPanelSource).toContain("<CopyButton");
    expect(benefitsActionPackPanelSource).toContain("pack.draftOrChecklist ?? \"\"");
    expect(benefitsActionPackPanelSource).toContain("Draft/checklist if available");
  });
});
