// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResultCaseSheet } from "../ResultCaseSheet";
import type { AdminCase } from "../../types";
import { analyseDecisionProblem } from "../../lib/decisionEngine/decisionEngine";
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
