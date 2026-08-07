import { describe, expect, it } from "vitest";
import { extractMonthlyAmount, extractStatedAnnualAmount } from "../moneyParsers";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";
import { validateResultViewModelSafety } from "../resultViewModel";

// Pre-pilot scenario verification, subscription cadence.
//
// The built-in "Subscription renewal" example says:
//
//   "Your annual subscription renews on 12 July for GBP 79.99."
//
// extractMonthlyAmount treats any amount as monthly whenever the word
// "subscription" appears, because the "/month" suffix in its fallback pattern is
// optional. The amount was then multiplied by twelve, so an annual £79.99
// subscription was presented as "£79.99 / month" and "£959.88 / year".
//
// That is an invented figure twelve times the real cost, on an example a pilot
// user can reach with one click. AdminAvenger may show a deterministic
// calculation, but only when the cadence it multiplies is the cadence the source
// actually stated.

const run = (id: string, message: string, sourceType = "email") =>
  runPublicMessageScenario({ id, message, sourceType } as unknown as PublicMessageScenario);

const BUILT_IN_ANNUAL =
  "Your annual subscription renews on 12 July for GBP 79.99. Cancel before 10 July to avoid being charged.";

const FIXED_PERIOD_CASES = [
  ["hyphenated 12-month price", "The 12-month subscription price is GBP 79.99."],
  ["unhyphenated 12 month cost", "The 12 month subscription costs GBP 79.99."],
  ["amount for 12 months", "Your subscription is GBP 79.99 for 12 months."],
  ["annual price", "The annual subscription price is GBP 79.99."],
  ["yearly price", "The yearly subscription price is GBP 79.99."],
  ["renewal every 12 months", "Your subscription renews every 12 months at GBP 79.99."],
  ["amount covering 12 months", "GBP 79.99 covers the next 12 months."],
] as const;

const MONTHLY_CASES = [
  ["monthly price", "The monthly subscription price is GBP 79.99."],
  ["per-month cost", "Your subscription costs GBP 79.99 per month."],
  ["charge every month", "GBP 79.99 will be charged every month."],
] as const;

const ANNUAL_CASES = [
  ["annual price", "The annual subscription price is GBP 79.99."],
  ["per-year cost", "Your subscription costs GBP 79.99 per year."],
  ["annual charge", "GBP 79.99 will be charged annually."],
] as const;

describe("an amount is only monthly when the source says so", () => {
  it.each([
    ["an annual subscription", "Your annual subscription renews on 12 July for GBP 79.99."],
    ["a yearly subscription", "Your yearly subscription renews for GBP 79.99."],
    ["a per-year subscription", "Your subscription renews for GBP 79.99 per year."],
    ["a subscription charged a year", "Your subscription costs GBP 79.99 a year."],
  ])("does not read %s as a monthly amount", (_name, message) => {
    expect(extractMonthlyAmount(message)).toBeUndefined();
  });

  it.each([
    ["an explicit per-month amount", "Your subscription renews for GBP 9.99 per month.", 9.99],
    ["a slash-month amount", "Your subscription is GBP 9.99/month.", 9.99],
    ["a monthly wording amount", "Your monthly subscription is GBP 9.99.", 9.99],
  ])("still reads %s", (_name, message, expected) => {
    expect(extractMonthlyAmount(message)).toBe(expected);
  });
});

describe("12-month subscription cadence", () => {
  it.each(FIXED_PERIOD_CASES)("keeps a %s annual or fixed-period amount", (_name, message) => {
    const journey = run(`subscription-fixed-${_name}`, message);

    expect(extractMonthlyAmount(message)).toBeUndefined();
    expect(extractStatedAnnualAmount(message)).toBe(79.99);
    expect(journey.visibleText).not.toContain("959.88");
    expect(
      journey.resultViewModel.moneyMentioned.some(
        (line) => /79\.99/.test(line.amountText) && /monthly|\/\s*month/i.test(`${line.label} ${line.amountText}`),
      ),
    ).toBe(false);
    expect(
      journey.resultViewModel.moneyMentioned.some(
        (line) => /79\.99/.test(line.amountText) && /annual|year/i.test(`${line.label} ${line.amountText}`),
      ),
    ).toBe(true);

    const report = validateResultViewModelSafety(journey.resultViewModel, {
      sourceText: `${journey.item.title}\n${journey.item.rawText}`,
    });
    expect(report.moneySourceSupported).toBe(true);
  });

  it.each(MONTHLY_CASES)("keeps a %s monthly", (_name, message) => {
    const journey = run(`subscription-monthly-${_name}`, message);

    expect(extractMonthlyAmount(message)).toBe(79.99);
    expect(
      journey.resultViewModel.moneyMentioned.some(
        (line) => /79\.99/.test(line.amountText) && /monthly|\/\s*month/i.test(`${line.label} ${line.amountText}`),
      ),
    ).toBe(true);
  });

  it.each(ANNUAL_CASES)("keeps an %s annual", (_name, message) => {
    const journey = run(`subscription-annual-${_name}`, message);

    expect(extractMonthlyAmount(message)).toBeUndefined();
    expect(extractStatedAnnualAmount(message)).toBe(79.99);
    expect(
      journey.resultViewModel.moneyMentioned.some(
        (line) => /79\.99/.test(line.amountText) && /annual|year/i.test(`${line.label} ${line.amountText}`),
      ),
    ).toBe(true);
    expect(journey.visibleText).not.toContain("959.88");
  });

  it.each([
    ["Your plan lasts 12 months. The monthly charge is GBP 79.99.", 79.99],
    ["The contract lasts 12 months. Your monthly price is GBP 34.", 34],
  ])("does not let contract duration override an explicit monthly amount", (message, expected) => {
    const journey = run(`subscription-explicit-monthly-${expected}`, message);

    expect(extractMonthlyAmount(message)).toBe(expected);
    expect(
      journey.resultViewModel.moneyMentioned.some(
        (line) => line.amountText.includes(expected.toFixed(2)) && /monthly|\/\s*month/i.test(`${line.label} ${line.amountText}`),
      ),
    ).toBe(true);
  });
});

describe("the built-in annual subscription example", () => {
  it("never presents a twelve-times annualisation of an annual price", () => {
    const journey = run("subscription-annual", BUILT_IN_ANNUAL);

    expect(journey.visibleText).not.toContain("959.88");
    for (const line of journey.resultViewModel.moneyMentioned) {
      expect(line.amountText).not.toContain("959.88");
    }
  });

  it("does not describe an annual price as a monthly charge", () => {
    const journey = run("subscription-monthly-label", BUILT_IN_ANNUAL);

    for (const line of journey.resultViewModel.moneyMentioned) {
      if (/79\.99/.test(line.amountText)) {
        expect(line.amountText).not.toMatch(/\/\s*month/i);
        expect(line.label).not.toMatch(/monthly/i);
      }
    }
  });

  it("keeps every money figure supported by the source", () => {
    const journey = run("subscription-safety", BUILT_IN_ANNUAL);
    const report = validateResultViewModelSafety(journey.resultViewModel, {
      sourceText: `${journey.item.title}\n${journey.item.rawText}`,
    });

    expect(report.moneySourceSupported).toBe(true);
  });

  it("keeps the stated amount and the renewal wording", () => {
    const journey = run("subscription-facts", BUILT_IN_ANNUAL);

    expect(journey.visibleText).toContain("79.99");
    expect(journey.visibleText).toMatch(/renew/i);
    expect(journey.visibleText).toMatch(/cancel/i);
  });

  it("shows no monthly charge row when the source states a yearly price", () => {
    const journey = run("subscription-no-monthly-row", BUILT_IN_ANNUAL);

    expect(
      journey.resultViewModel.moneyMentioned.some((line) => /monthly|\/ ?month/i.test(
        `${line.label} ${line.amountText}`,
      )),
    ).toBe(false);
  });

  // Year-less dates are not extracted at all, so "Cancel before 10 July" never
  // reaches the result. Inferring a year would risk inventing a date, so this is
  // recorded as a finding for a later, policy-led slice rather than guessed here.
  // What must hold now is that no date is invented in its place.
  it("invents no date when the source omits the year", () => {
    const journey = run("subscription-no-year", BUILT_IN_ANNUAL);

    expect(journey.resultViewModel.keyDates).toHaveLength(0);
    expect(journey.visibleText).not.toMatch(/\b\d{1,2}\s+July\s+20\d{2}\b/);
  });

  it("does surface both dates when the source gives years", () => {
    const journey = run(
      "subscription-with-years",
      "Your annual subscription renews on 12 July 2026 for GBP 79.99. Cancel before 10 July 2026 to avoid being charged.",
    );
    const roles = journey.resultViewModel.keyDates.map((date) => date.role);

    expect(journey.visibleText).toContain("12 July 2026");
    expect(journey.visibleText).toContain("10 July 2026");
    expect(roles).toContain("event_date");
    expect(roles).toContain("stated_deadline");
  });
});

describe("a genuinely monthly subscription still annualises", () => {
  it("multiplies a stated monthly amount", () => {
    const journey = run(
      "subscription-real-monthly",
      "Your subscription renews for GBP 9.99 per month until cancelled.",
    );

    expect(journey.visibleText).toContain("119.88");
  });
});
