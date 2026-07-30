// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResultCaseSheet } from "../ResultCaseSheet";
import type { AdminCase, AdminItem } from "../../types";
import { demoScenarios } from "../../data/demoScenarios";
import { analyseDecisionProblem } from "../../lib/decisionEngine/decisionEngine";
import { analyseAdminItem } from "../../lib/mockAnalysis";
import { createAdminCase } from "../../lib/caseFactory";
import { deriveOpportunityCard } from "../../lib/opportunityCards";
import { buildStrategicNextStepPlan } from "../../lib/strategicNextStep";
import { buildResultViewModel, RESULT_URGENCY_COPY } from "../../lib/resultViewModel";

afterEach(cleanup);

const HMRC_NO_DATE = `HMRC
Tax Code Notice
Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd
Personal Allowance             £12,570
Total tax-free amount          £12,570
Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;

const UC_WITH_DATE = `Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Your payment this month: GBP 843.45`;

// The urgency level is supplied by AdminCase.urgency, so a lightweight cast is
// enough to exercise each level; evidence is empty so non-HMRC composition is safe.
const buildModel = (
  text: string,
  urgency?: "high" | "medium" | "low",
  question?: string,
) => {
  const decisionResult = analyseDecisionProblem(text, question);
  const adminCase = urgency
    ? ({ urgency, evidence: [] } as unknown as AdminCase)
    : undefined;
  return buildResultViewModel({ decisionResult, adminCase });
};

const renderSheet = (model: ReturnType<typeof buildModel>) =>
  render(
    <ResultCaseSheet
      model={model}
      supportingDetailsOpen={false}
      onToggleSupportingDetails={() => undefined}
    />,
  );

describe("ResultCaseSheet - your result at a glance", () => {
  it("presents each case-urgency level cautiously with the approved wording", () => {
    for (const level of ["high", "medium", "low"] as const) {
      const model = buildModel(HMRC_NO_DATE, level, "What is this?");
      expect(model.urgency.level).toBe(level);

      const { unmount } = renderSheet(model);
      expect(screen.getByText(RESULT_URGENCY_COPY[level])).toBeTruthy();
      // Every level tells the user to check, and never reassures.
      expect(RESULT_URGENCY_COPY[level].toLowerCase()).toContain("check");
      unmount();
    }
  });

  it("says urgency is not confirmed (not 'not urgent') when case urgency is unavailable", () => {
    const model = buildModel(HMRC_NO_DATE, undefined, "What is this?");
    expect(model.urgency.level).toBe("unconfirmed");

    renderSheet(model);
    expect(screen.getByText(RESULT_URGENCY_COPY.unconfirmed)).toBeTruthy();
  });

  it("never uses 'not urgent' and never claims nothing is time-sensitive", () => {
    for (const level of ["high", "medium", "low", undefined] as const) {
      const model = buildModel(UC_WITH_DATE, level);
      const line = `${model.urgency.headline} ${model.urgency.detail}`.toLowerCase();
      expect(line).not.toContain("not urgent");
      expect(line).not.toContain("nothing is time");
    }
  });

  it("derives urgency only from case urgency: a date never raises it, a missing date never lowers it", () => {
    // Low urgency with dates present stays low; the date only supplements.
    const lowWithDate = buildModel(UC_WITH_DATE, "low");
    expect(lowWithDate.keyDates.length).toBeGreaterThan(0);
    expect(lowWithDate.urgency.level).toBe("low");
    expect(lowWithDate.urgency.detail).toContain("There is a date to check");

    // High urgency with no date stays high; a missing date is never "not urgent".
    const highNoDate = buildModel(HMRC_NO_DATE, "high", "What is this?");
    expect(highNoDate.keyDates.length).toBe(0);
    expect(highNoDate.urgency.level).toBe("high");
    expect(highNoDate.urgency.detail).toBe("");
    expect(highNoDate.urgency.headline.toLowerCase()).not.toContain("not urgent");
  });

  it("renders title, direct answer and summary exactly once", () => {
    const model = buildModel(HMRC_NO_DATE, "low", "What is this?");
    const { container } = renderSheet(model);
    const html = container.innerHTML;
    const count = (needle: string) => html.split(needle).length - 1;

    expect(model.directAnswer).toBeDefined();
    expect(count(model.title)).toBe(1);
    expect(count(model.directAnswer!)).toBe(1);
    expect(count(model.summary)).toBe(1);
  });

  it("keeps routine detail behind one collapsed, keyboard-accessible disclosure", () => {
    const model = buildModel(UC_WITH_DATE, "low");
    renderSheet(model);

    const toggle = screen.getByRole("button", {
      name: "See dates, money, evidence and questions",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    const region = document.getElementById("result-routine-detail");
    expect(region).not.toBeNull();
    expect(region!.hasAttribute("hidden")).toBe(true);

    fireEvent.click(toggle);

    const openToggle = screen.getByRole("button", {
      name: "Hide dates, money, evidence and questions",
    });
    expect(openToggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.getElementById("result-routine-detail")!.hasAttribute("hidden")).toBe(false);
  });

  it("keeps safety, cannot-know and uncertainty visible without expanding the disclosure", () => {
    const model = buildModel(UC_WITH_DATE, "low");
    renderSheet(model);

    expect(screen.getByText(/Nothing has been submitted/i)).toBeTruthy();
    expect(screen.getByText("What AdminAvenger cannot know")).toBeTruthy();
    expect(screen.getByText("Uncertainty / double-check")).toBeTruthy();

    // The routine-detail disclosure is still collapsed.
    expect(document.getElementById("result-routine-detail")!.hasAttribute("hidden")).toBe(true);
  });
});

describe("ResultCaseSheet - price-rise notice regression", () => {
  const priceRiseScenario = demoScenarios.find(
    (scenario) => scenario.id === "broadband-mobile-price-rise",
  );

  if (!priceRiseScenario) {
    throw new Error("Built-in broadband/mobile price-rise scenario is missing");
  }

  const buildPriceRiseResult = () => {
    const item: AdminItem = {
      id: "item-price-rise-sample",
      title: priceRiseScenario.title,
      sourceType: priceRiseScenario.sourceType,
      rawText: priceRiseScenario.rawText,
      createdAt: "2026-07-17T10:00:00.000Z",
      analysedAt: "2026-07-17T10:00:00.000Z",
    };

    const findings = analyseAdminItem(item);
    const priceRiseFinding = findings.find((f) => f.category === "bill_increase");
    expect(priceRiseFinding).toBeDefined();

    const adminCase = createAdminCase(priceRiseFinding!, item);
    const opportunity = deriveOpportunityCard(adminCase, item, priceRiseFinding);
    const strategicPlan = buildStrategicNextStepPlan({
      opportunity,
      adminCase,
    });
    const model = buildResultViewModel({
      opportunity,
      adminCase,
      strategicNextStepPlan: strategicPlan,
    });

    return { model, adminCase, opportunity };
  };

  const renderPriceRiseResult = () => {
    const { model } = buildPriceRiseResult();
    const rendered = render(
      <ResultCaseSheet
        model={model}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );

    return { model, ...rendered };
  };

  const getSection = (container: HTMLElement, title: string) => {
    const section = Array.from(container.querySelectorAll("section")).find(
      (item) => item.querySelector("h3")?.textContent === title,
    );

    expect(section).toBeDefined();
    return section!;
  };

  const precedes = (first: Element, second: Element) =>
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

  const isCancellationSwitchingRightsTopic = (value: string) =>
    /\b(?:cancel(?:lation)?|switch(?:ing)?)\b/i.test(value) &&
    /\brights?\b/i.test(value);

  it("renders the visible labels and each core answer once in the approved order", () => {
    const { model, container } = renderPriceRiseResult();

    const header = container.querySelector("header");
    expect(header).not.toBeNull();

    const whatIsThis = within(header!).getByText("What is this?", { selector: "p" });
    const title = within(header!).getByRole("heading", { level: 2, name: model.title });
    const whatChanged = within(header!).getByText("What changed or matters?", {
      selector: "p",
    });
    const summary = within(header!).getByText(model.summary, { selector: "p" });
    const supportingHeading = screen.getByRole("heading", {
      level: 3,
      name: "Is anything urgent?",
    });

    expect(screen.getAllByText(model.title, { exact: true })).toHaveLength(1);
    expect(screen.getAllByText(model.summary, { exact: true })).toHaveLength(1);

    expect(precedes(whatIsThis, title)).toBe(true);
    if (model.directAnswer) {
      const directAnswer = within(header!).getByText(model.directAnswer, {
        selector: "p",
      });
      expect(screen.getAllByText(model.directAnswer, { exact: true })).toHaveLength(1);
      expect(precedes(title, directAnswer)).toBe(true);
      expect(precedes(directAnswer, whatChanged)).toBe(true);
    } else {
      expect(precedes(title, whatChanged)).toBe(true);
    }
    expect(precedes(whatChanged, summary)).toBe(true);
    expect(precedes(summary, supportingHeading)).toBe(true);
  });

  it("keeps the career-result header and separate layout unchanged", () => {
    const { model } = buildPriceRiseResult();
    const careerModel = {
      ...model,
      resultKind: "career_support" as const,
    };
    const { container } = render(
      <ResultCaseSheet
        model={careerModel}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(within(header!).queryByText("What is this?", { selector: "p" })).toBeNull();
    expect(
      within(header!).queryByText("What changed or matters?", { selector: "p" }),
    ).toBeNull();
    expect(within(header!).getByRole("heading", { level: 2, name: model.title })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Best next move" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "What to check first" })).toBeTruthy();
  });

  it("shows no more than three semantic ready topics and keeps the first rights wording", () => {
    const { model, container } = renderPriceRiseResult();
    const allReadyItems = [
      ...model.evidenceToGather.map((item) => item.value),
      ...model.questionsToAnswer,
    ];
    const rightsItems = allReadyItems.filter(isCancellationSwitchingRightsTopic);
    expect(rightsItems.length).toBeGreaterThan(1);

    const haveReadySection = getSection(container, "What should I have ready?");
    const compactItems = Array.from(haveReadySection.querySelectorAll("li")).map(
      (item) => item.textContent ?? "",
    );

    expect(compactItems.length).toBeLessThanOrEqual(3);
    expect(compactItems.filter(isCancellationSwitchingRightsTopic)).toEqual([
      rightsItems[0],
    ]);
    expect(
      within(haveReadySection).queryByRole("button", { name: /show more/i }),
    ).toBeNull();
  });

  it("preserves every underlying evidence and question item in expandable routine detail", () => {
    const { model } = renderPriceRiseResult();
    const toggle = screen.getByRole("button", {
      name: "See dates, money, evidence and questions",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const detail = document.getElementById("result-routine-detail");
    expect(detail).not.toBeNull();
    expect(detail!.hasAttribute("hidden")).toBe(true);

    fireEvent.click(toggle);
    expect(detail!.hasAttribute("hidden")).toBe(false);

    for (const showMore of within(detail!).queryAllByRole("button", {
      name: /show more/i,
    })) {
      fireEvent.click(showMore);
      expect(showMore.textContent).toBe("Show less");
    }

    const detailText = detail!.textContent ?? "";
    for (const item of model.evidenceToGather) {
      expect(detailText).toContain(item.value);
    }
    for (const question of model.questionsToAnswer) {
      expect(detailText).toContain(question);
    }
  });

  it("uses the existing price-rise-specific action rather than generic sender identification", () => {
    const { model, opportunity } = buildPriceRiseResult();
    expect(model.bestNextMove).toBeDefined();
    expect(model.bestNextMove!.label).toBe(opportunity.recommendedPathSteps[0]);
    expect(model.bestNextMove!.description).toBe(opportunity.nextBestAction);

    const rendered = render(
      <ResultCaseSheet
        model={model}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );
    const nextSection = getSection(rendered.container, "What should I do next?");
    const nextText = nextSection.textContent ?? "";

    expect(nextText).toMatch(/\b(?:provider|contract|price[- ]rise|options?)\b/i);
    expect(nextText).not.toMatch(/identify the sender, date, reference, and deadline/i);
  });

  it("preserves urgency wording and existing safety boundaries", () => {
    const { model } = renderPriceRiseResult();

    expect(screen.getByText(RESULT_URGENCY_COPY[model.urgency.level])).toBeTruthy();
    expect(
      screen.getByText(/^Preparation only\. Nothing has been sent\./i),
    ).toBeTruthy();
    expect(screen.getByText(/Nothing has been submitted/i)).toBeTruthy();
    expect(screen.getByText(/AdminAvenger does not contact anyone for you/i)).toBeTruthy();
    expect(screen.getByText("What AdminAvenger cannot know")).toBeTruthy();
    expect(screen.getByText("Uncertainty / double-check")).toBeTruthy();
  });
});
