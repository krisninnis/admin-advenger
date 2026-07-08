import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BenefitsActionPackPanel } from "../BenefitsActionPackPanel";
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
  questionsToAnswer: [{ id: "question-1", question: "Do you recognise this deduction?" }],
  uncertainty: ["The exact assessment period needs checking."],
  cannotKnow: ["Whether all account entries are visible."],
  nextSafeStep: "Check the statement and gather evidence.",
  draftOrChecklist: "- Check the date\n- Check deductions",
  safetyNotes: ["You decide what happens next."],
};

describe("BenefitsActionPackPanel", () => {
  it("renders every required Benefits Action Pack section", () => {
    const html = renderToStaticMarkup(<BenefitsActionPackPanel pack={pack} />);

    expect(html).toContain("What this appears to be");
    expect(html).toContain("What matters");
    expect(html).toContain("Possible dates to check");
    expect(html).toContain("Money mentioned");
    expect(html).toContain("Evidence found");
    expect(html).toContain("Evidence missing");
    expect(html).toContain("Questions to answer");
    expect(html).toContain("Uncertainty");
    expect(html).toContain("What AdminAvenger cannot know");
    expect(html).toContain("Next safe step");
    expect(html).toContain("Draft/checklist if available");
    expect(html).toContain("Not counted in savings, recovered money, or the money tracker.");
    expect(html).toContain("Check this date on your letter.");
  });
});
