import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { buildCaseProgress } from "../caseProgress";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { extractGeneralAdmin } from "../generalAdminExtraction";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildResultViewModel, flattenResultViewModelText } from "../resultViewModel";
import { createPhotoSourceDocument } from "../sourceProvenance";

// W3 - Ordinary Message Date Role Propagation v1.
//
// One rule: preserve what a date or a time window MEANS, from extraction all the
// way to the visible result.
//
// The extractor already distinguishes an event date from a stated deadline, and
// a refund window from a response period. Downstream, every timing item was a
// label and a string, and relative periods had no route into the timing view at
// all. So a refund with "within 5 to 10 working days" reported "no actionable
// date has been gathered yet", which is not true: the source gave a usable
// window. It just is not an exact date, and the product must not pretend it is.
//
// Not in scope: warning severity, draft timing, next-step wording, result
// length. No date arithmetic - a working-day window is never turned into a
// calendar date.

const makeItem = (rawText: string, sourceDocuments?: AdminItem["sourceDocuments"]): AdminItem => ({
  id: "item-date-roles",
  title: "Pasted admin text",
  sourceType: "email",
  rawText,
  sourceDocuments,
  createdAt: "2026-08-07T09:00:00.000Z",
});

const compose = (rawText: string, sourceDocuments?: AdminItem["sourceDocuments"]) => {
  const item = makeItem(rawText, sourceDocuments);
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const adminCase = selectMostImportantCase(cases);

  if (!adminCase) {
    throw new Error("No case was created for the date-role fixture");
  }

  const finding = findings.find((candidate) => candidate.id === adminCase.findingId);
  const opportunity = deriveOpportunityCard(adminCase, item, finding);
  const resultViewModel = buildResultViewModel({
    decisionResult: adminCase.decisionResult,
    opportunity,
    adminCase,
  });
  const progress = buildCaseProgress({
    resultViewModel,
    decisionResult: adminCase.decisionResult,
  });

  return {
    adminCase,
    resultViewModel,
    classification: resultViewModel.title,
    progress,
    visibleText: flattenResultViewModelText(resultViewModel),
    keyDates: resultViewModel.keyDates,
    roleOf: (value: string) =>
      resultViewModel.keyDates.find((date) => date.value.includes(value))?.role,
    keyDateItem: progress.items.find((entry) => entry.id === "key-date"),
    foundLabels: resultViewModel.evidenceFound.map((entry) => entry.label),
  };
};

const PRICE_RISE =
  "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 September 2026. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.";

const REFUND =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.";

const PARCEL =
  "We are sorry your order ORD-77194 has not arrived. It was expected on 4 August 2026. We are investigating with the courier and will update you within 3 working days.";

// --- A: price-rise effective date ------------------------------------------

describe("W3 price-rise effective date", () => {
  it("keeps the effective date in the timing view", () => {
    const { keyDates } = compose(PRICE_RISE);

    expect(keyDates.map((date) => date.value)).toContain("1 September 2026");
  });

  it("satisfies the timing step, and says a date was found", () => {
    const { keyDateItem } = compose(PRICE_RISE);

    expect(keyDateItem?.status).toBe("complete");
    expect(keyDateItem?.description).toMatch(/date was found/i);
  });

  it("keeps the W1 price-rise facts untouched", () => {
    const { visibleText } = compose(PRICE_RISE);

    for (const fact of ["£34", "£46", "£12", "£144", "1 September 2026"]) {
      expect(visibleText).toContain(fact);
    }
  });
});

// --- B: refund processing window -------------------------------------------

describe("W3 refund processing window", () => {
  it("extracts the window with a refund-window role", () => {
    expect(
      extractGeneralAdmin(REFUND).relativePeriods.map((period) => period.role),
    ).toContain("refund_window");
  });

  it("carries that role into the timing view", () => {
    const { roleOf } = compose(REFUND);

    expect(roleOf("5 to 10 working days")).toBe("refund_window");
  });

  it("satisfies the timing step without claiming an exact date exists", () => {
    const { keyDateItem } = compose(REFUND);

    expect(keyDateItem?.status).toBe("complete");
    expect(keyDateItem?.description).toMatch(/window|period/i);
    expect(keyDateItem?.description).not.toMatch(/no actionable date/i);
    expect(keyDateItem?.description).not.toMatch(/a date was found/i);
  });

  it("invents no arrival date and performs no working-day arithmetic", () => {
    const { keyDates, visibleText } = compose(REFUND);

    // Nothing may present a calendar date the source never stated.
    for (const date of keyDates) {
      expect(date.value).not.toMatch(
        /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/,
      );
    }
    expect(visibleText).not.toMatch(/arrives? on|will arrive on|expected on \d/i);
  });

  it("keeps the W1 and W2 refund state correct", () => {
    const { visibleText, foundLabels } = compose(REFUND);

    expect(visibleText).toContain("£68.40");
    expect(visibleText).toContain("RF-20481");
    expect(visibleText).toMatch(/not confirmed received|pending/i);
    expect([...foundLabels].sort()).toEqual([
      "Expected refund window",
      "Reference",
      "Refund amount",
      "Refund status",
    ]);
  });
});

// --- C: expected date and response period, side by side --------------------

describe("W3 missing-parcel timing", () => {
  it("extracts the expected date and the update period with distinct roles", () => {
    const extraction = extractGeneralAdmin(PARCEL);

    expect(extraction.dates.map((date) => [date.role, date.value])).toEqual([
      ["event_date", "4 August 2026"],
    ]);
    expect(extraction.relativePeriods.map((period) => period.role)).toContain(
      "response_period",
    );
  });

  it("carries both roles into the timing view, at the same time", () => {
    const { roleOf, keyDates } = compose(PARCEL);

    expect(roleOf("4 August 2026")).toBe("event_date");
    expect(roleOf("3 working days")).toBe("response_period");
    expect(keyDates.length).toBeGreaterThanOrEqual(2);
  });

  it("does not collapse the two into one value or one label", () => {
    const { keyDates } = compose(PARCEL);

    const expected = keyDates.filter((date) => date.value.includes("4 August 2026"));
    const period = keyDates.filter((date) => date.value.includes("3 working days"));

    expect(expected).toHaveLength(1);
    expect(period).toHaveLength(1);
    expect(expected[0]?.label).not.toBe(period[0]?.label);
    expect(expected[0]?.value).not.toBe(period[0]?.value);
  });

  it("recognises that useful timing exists", () => {
    const { keyDateItem } = compose(PARCEL);

    expect(keyDateItem?.status).toBe("complete");
  });

  it("keeps the W1 and W2 parcel state correct", () => {
    const { visibleText, foundLabels } = compose(PARCEL);

    expect(visibleText).toContain("ORD-77194");
    expect(visibleText).toContain("4 August 2026");
    expect(visibleText).toMatch(/3 working days/i);
    expect(visibleText).not.toMatch(/£\s*\d/);
    expect(visibleText).not.toMatch(/permanently lost|declared lost|confirmed lost/i);
    expect([...foundLabels].sort()).toEqual([
      "Date shown in the message",
      "Expected response period",
      "Reference",
    ]);
  });
});

// --- Negative: W3 must not overreach ---------------------------------------

describe("W3 does not invent timing", () => {
  it("gains no timing from a message with no date or window", () => {
    const { keyDates, keyDateItem } = compose(
      "Thank you for your message. There is nothing you need to do.",
    );

    expect(keyDates).toHaveLength(0);
    expect(keyDateItem?.status).toBe("missing");
  });

  it("treats vague timing as no timing", () => {
    for (const message of [
      "We will send your refund soon.",
      "Your query is being handled and we will respond in due course.",
    ]) {
      const extraction = extractGeneralAdmin(message);
      expect(extraction.dates).toHaveLength(0);
      expect(extraction.relativePeriods).toHaveLength(0);

      const { keyDates } = compose(message);
      expect(keyDates.filter((date) => /soon|due course/i.test(date.value))).toHaveLength(0);
    }
  });

  it("never labels a processing window as a deadline", () => {
    const { keyDates } = compose(REFUND);
    const window = keyDates.find((date) => date.value.includes("5 to 10 working days"));

    expect(window?.role).not.toBe("stated_deadline");
    expect(window?.label).not.toMatch(/deadline/i);
  });

  it("does not let a response period overwrite an expected event date", () => {
    const { roleOf } = compose(PARCEL);

    expect(roleOf("4 August 2026")).toBe("event_date");
    expect(roleOf("4 August 2026")).not.toBe("response_period");
  });

  it("orders multiple timing facts deterministically", () => {
    const first = compose(PARCEL).keyDates.map((date) => `${date.label}:${date.value}`);
    const second = compose(PARCEL).keyDates.map((date) => `${date.label}:${date.value}`);

    expect(first).toEqual(second);
    // Source order: the expected date is stated before the update period.
    expect(first.findIndex((entry) => entry.includes("4 August 2026"))).toBeLessThan(
      first.findIndex((entry) => entry.includes("3 working days")),
    );
  });
});

describe("ordinary-message-date-role-extraction-v1 composition", () => {
  it.each([
    ["my broadband goes from Â£34 to Â£46 on 1 September", [["Effective or start date", "1 September"]], "partial"],
    ["from 1 September your monthly price will be Â£46", [["Effective or start date", "1 September"]], "partial"],
    ["please pay Â£500 by 20 August", [["Payment due date", "20 August"]], "partial"],
    ["your balance is Â£500 as of 20 August", [["Balance as-of date", "20 August"]], "not_needed"],
    ["your new tariff starts on 20 August", [["Effective or start date", "20 August"]], "partial"],
    ["your appointment is on 20 August at 2pm", [["Appointment date", "20 August"]], "partial"],
    ["please reply by 20 August", [["Reply deadline", "20 August"]], "partial"],
    ["this change takes effect from 20 August", [["Effective or start date", "20 August"]], "partial"],
    ["statement dated 20 August - payment is due on 5 September", [["Document date", "20 August"], ["Payment due date", "5 September"]], "partial"],
    ["your payment is due on 5 September", [["Payment due date", "5 September"]], "partial"],
    ["your appointment has moved from 20 August to 27 August", [["Previous appointment date", "20 August"], ["Replacement appointment date", "27 August"]], "partial"],
    ["your price changes on 1 September but you do not need to reply", [["Effective or start date", "1 September"]], "partial"],
    ["letter dated 20 August, please reply by 5 September", [["Document date", "20 August"], ["Reply deadline", "5 September"]], "partial"],
    ["your contract runs from 1 September to 31 August 2027", [["Period start", "1 September"], ["Period end", "31 August 2027"]], "not_needed"],
  ])("keeps every meaningful timing fact visible for: %s", (text, expected, progressStatus) => {
    const { keyDates, keyDateItem, visibleText } = compose(text);

    expect(keyDates.map(({ label, value }) => [label, value])).toEqual(expected);
    expect(keyDateItem?.status).toBe(progressStatus);
    if (text.includes("2pm")) expect(visibleText).toContain("2pm");
    if (text.includes("do not need to reply")) {
      expect(visibleText).not.toMatch(/reply urgency|urgent reply|reply required/i);
    }
  });

  it("keeps full trusted actionable timing complete", () => {
    expect(compose("please reply by 20 August 2027").keyDateItem?.status).toBe("complete");
  });

  it.each([
    "appointment on 20 August",
    "balance as of 20 August",
    "letter dated 20 August",
    "your tariff starts on 20 August",
    "your parcel is due to arrive on 20 August",
  ])("does not label a non-payment date as a payment deadline: %s", (text) => {
    expect(compose(text).keyDates.map((date) => date.label)).not.toContain("Payment due date");
  });

  it("distinguishes a payment due date from parcel arrival", () => {
    expect(compose("your payment is due on 20 August").keyDates[0]?.label).toBe("Payment due date");
    expect(compose("your parcel is due to arrive on 20 August").keyDates[0]?.label).toBe("Event date");
  });

  it("does not classify a bare appointment date as a deadline", () => {
    expect(compose("appointment on 20 August").classification).toBe("Appointment reminder");
  });

  it("keeps review-required OCR timing out of trusted key dates and leaves progress partial", () => {
    const text = "please reply by 20 August";
    const source = createPhotoSourceDocument({
      id: "review-photo",
      displayName: "Letter photo",
      intakeType: "photo",
      order: 1,
      text,
      confidence: 62,
      warnings: ["Check the OCR text"],
      reviewState: "review_required",
    });
    const { keyDates, keyDateItem } = compose(text, [source]);

    expect(keyDates).toEqual([]);
    expect(keyDateItem?.status).toBe("partial");
  });
});
