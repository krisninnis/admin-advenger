import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildAdviserExportPack } from "../../lib/adviserExportPack";
import { buildBenefitsActionPack } from "../../lib/benefitsActionPack";
import { buildCaseProgress } from "../../lib/caseProgress";
import { analyseDecisionProblem } from "../../lib/decisionEngine/decisionEngine";
import { buildResultViewModel } from "../../lib/resultViewModel";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";
import { buildStrategicNextStepPlan } from "../../lib/strategicNextStep";
import { CaseProgressCard } from "../CaseProgressCard";

const renderCard = (text: string) => {
  const decisionResult = analyseDecisionProblem(text);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({ decisionResult, benefitsActionPack });
  const resultViewModel = buildResultViewModel({
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const adviserExportPack = buildAdviserExportPack({
    decisionResult,
    resultViewModel,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const summary = buildCaseProgress({
    resultViewModel,
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
    adviserExportPack,
  });
  const html = renderToStaticMarkup(<CaseProgressCard summary={summary} />);

  return { summary, html };
};

const FORBIDDEN_WORDS = [
  "win",
  "chance",
  "success",
  "strength",
  "valid claim",
  "invalid claim",
  "owed",
  "saved",
  "recovered",
];

describe("CaseProgressCard", () => {
  it('renders the "Preparation progress" heading', () => {
    const { html } = renderCard(`Universal Credit statement
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    expect(html).toContain("Preparation progress");
  });

  it('renders the "does not predict the outcome" explanation', () => {
    const { html } = renderCard(`Debt collector letter
Outstanding balance: GBP 480.00.
Please reply by 31 July 2026 with your reference.`);

    expect(html).toContain("does not predict the outcome");
  });

  it("renders the progress count text", () => {
    const { html, summary } = renderCard(`Personal Independence Payment decision
We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.`);

    expect(html).toContain(summary.label);
    expect(html).toMatch(/of \d+ preparation steps complete/);
  });

  it("renders checklist items", () => {
    const { html, summary } = renderCard(`Parking Charge Notice
This PCN asks for GBP 100, reduced to GBP 60 if paid within 14 days.
The notice says POPLA is mentioned on the appeal page.`);

    expect(summary.items.length).toBeGreaterThan(0);

    for (const item of summary.items) {
      expect(html).toContain(item.label);
    }
  });

  it("renders missing/partial/complete statuses as visible text labels", () => {
    const { html, summary } = renderCard(`Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.`);

    const statuses = new Set(summary.items.map((item) => item.status));

    if (statuses.has("complete")) {
      expect(html).toContain("Complete");
    }

    if (statuses.has("partial")) {
      expect(html).toContain("In progress");
    }

    if (statuses.has("missing")) {
      expect(html).toContain("Not started");
    }

    if (statuses.has("not_needed")) {
      expect(html).toContain("Not needed");
    }
  });

  it("exposes progress value as readable text, not colour alone", () => {
    const { html } = renderCard(`Official update
Please see the attached update. We will write again if more information is needed.`);

    expect(html).toContain("role=\"progressbar\"");
    expect(html).toMatch(/aria-valuetext="\d+% complete\./);
  });

  it("contains no forbidden wording", () => {
    const fixtures = [
      `Universal Credit statement\nPayment date: 7 July 2026\nYour payment this month: GBP 843.45`,
      `Personal Independence Payment decision\nWe have looked at your claim and decided you are not entitled to PIP.\nThe date of this decision is 4 July 2026.`,
      `Debt collector letter\nOutstanding balance: GBP 480.00.\nPlease reply by 31 July 2026 with your reference.`,
      `Parking Charge Notice\nThis PCN asks for GBP 100, reduced to GBP 60 if paid within 14 days.`,
      `Sender: support@secure-bank-login-example.com\nYour account will be locked today. Click this link immediately.`,
      `Official update\nPlease see the attached update. We will write again if more information is needed.`,
    ];

    for (const text of fixtures) {
      const { html } = renderCard(text);

      expect(findForbiddenSafetyPhrases(html)).toEqual([]);

      const lower = html.toLowerCase();
      for (const word of FORBIDDEN_WORDS) {
        expect(lower).not.toContain(word);
      }
    }
  });
});
