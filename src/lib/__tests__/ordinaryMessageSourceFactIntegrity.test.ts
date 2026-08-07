import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { assessBroadbandPriceRise } from "../broadbandPriceRiseAssessment";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { extractGeneralAdmin } from "../generalAdminExtraction";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildResultViewModel, flattenResultViewModelText } from "../resultViewModel";

// W1 - Ordinary Message Source Fact Integrity v1.
//
// Two rules, and nothing else on this branch:
//
//   never invent a source fact;
//   never drop a source fact the shared extractor already found.
//
// The audit proved three Critical failures, all with the same shape: a
// category-specific layer re-derived facts with its own local regex, or read
// only part of the structured extraction, and diverged from the extractor that
// had already got it right. These tests pin the three shapes permanently.
//
// They deliberately assert the FINAL visible text as well as the intermediate
// model, because the audit found the extractor correct and the visible result
// wrong. A helper-level assertion alone would have passed throughout.
//
// Not in scope here, and deliberately not asserted: evidence counts, question
// completion, warning calibration, result length, date-role modelling. Those
// are W2 to W4.

const makeItem = (rawText: string, title = "Pasted admin text"): AdminItem => ({
  id: "item-source-fact-integrity",
  title,
  sourceType: "email",
  rawText,
  createdAt: "2026-08-07T09:00:00.000Z",
});

/**
 * The real composition path: analyse, build the case, then build the result
 * view model the UI renders. Mirrors composeJourney in the public-message
 * evaluation harness, minus the packs that are irrelevant to fact integrity.
 */
const composeVisibleResult = (rawText: string) => {
  const item = makeItem(rawText);
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const adminCase = selectMostImportantCase(cases);

  if (!adminCase) {
    throw new Error("No case was created for the source-fact integrity fixture");
  }

  const finding = findings.find((candidate) => candidate.id === adminCase.findingId);
  const opportunity = deriveOpportunityCard(adminCase, item, finding);
  const resultViewModel = buildResultViewModel({
    decisionResult: adminCase.decisionResult,
    opportunity,
    adminCase,
  });

  return {
    adminCase,
    resultViewModel,
    visibleText: flattenResultViewModelText(resultViewModel),
    caseEvidenceText: adminCase.evidence
      .map((entry) => `${entry.label} = ${entry.value}`)
      .join("\n"),
  };
};

// --- Defect A: a price phrase must never become a provider name -------------

const PRICE_RISE_GBP =
  "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 September 2026. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.";

const PRICE_RISE_POUND =
  "Important notice: your broadband and mobile tariff will increase from £34 to £46 per month from 1 September 2026. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.";

describe("W1 provider integrity", () => {
  it("does not invent a provider from a GBP price phrase", () => {
    expect(assessBroadbandPriceRise(makeItem(PRICE_RISE_GBP)).providerName).toBeUndefined();
  });

  it("does not invent a provider from a pound-sign price phrase", () => {
    expect(assessBroadbandPriceRise(makeItem(PRICE_RISE_POUND)).providerName).toBeUndefined();
  });

  it("does not invent a provider from a bare month and year", () => {
    expect(
      assessBroadbandPriceRise(
        makeItem("Your broadband price will increase from September 2026."),
      ).providerName,
    ).toBeUndefined();
  });

  it("still reads a genuine provider named in the source", () => {
    expect(
      assessBroadbandPriceRise(
        makeItem("This notice is from Greenfield Telecom. Your price rises from £29 to £32."),
      ).providerName,
    ).toBe("Greenfield Telecom");
  });

  it("keeps the price-rise facts that were already correct", () => {
    const assessment = assessBroadbandPriceRise(makeItem(PRICE_RISE_GBP));

    expect(assessment.oldMonthlyPrice).toBe("£34");
    expect(assessment.newMonthlyPrice).toBe("£46");
    expect(assessment.monthlyIncrease).toBe("£12");
    expect(assessment.annualIncrease).toBe("£144");
    expect(assessment.effectiveDate).toBe("1 September 2026");
  });

  it("never shows a currency phrase as a provider in the visible result", () => {
    const { visibleText, caseEvidenceText } = composeVisibleResult(PRICE_RISE_GBP);

    // The exact invented value the audit captured.
    expect(caseEvidenceText).not.toContain("GBP 34 to GBP 46 per month");
    expect(visibleText).not.toContain("GBP 34 to GBP 46 per month");
    // And no provider line may pair the Provider label with a currency amount.
    expect(/Provider[^\n]*(?:GBP|£)\s*\d/.test(visibleText)).toBe(false);
  });

  it("keeps the real price-rise facts visible in the composed result", () => {
    const { visibleText } = composeVisibleResult(PRICE_RISE_GBP);

    for (const fact of ["£34", "£46", "£12", "£144", "1 September 2026"]) {
      expect(visibleText).toContain(fact);
    }
  });
});

// --- Defect B: an extracted refund reference must survive -------------------

const REFUND_APPROVED =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.";

const REFUND_APPROVED_COLON =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Reference: RF-20481.";

describe("W1 refund reference integrity", () => {
  it("extracts a reference written as 'reference is RF-20481'", () => {
    expect(extractGeneralAdmin(REFUND_APPROVED).references.map((item) => item.value)).toContain(
      "RF-20481",
    );
  });

  it("carries that reference into the case evidence", () => {
    expect(composeVisibleResult(REFUND_APPROVED).caseEvidenceText).toContain("RF-20481");
  });

  it("shows that reference in the visible result", () => {
    expect(composeVisibleResult(REFUND_APPROVED).visibleText).toContain("RF-20481");
  });

  it("still shows a reference written with a colon", () => {
    expect(composeVisibleResult(REFUND_APPROVED_COLON).visibleText).toContain("RF-20481");
  });

  it("keeps the other refund facts, and does not claim the money arrived", () => {
    const { visibleText } = composeVisibleResult(REFUND_APPROVED);

    expect(visibleText).toContain("£68.40");
    expect(visibleText).toMatch(/5 to 10 working days/i);
    expect(visibleText).toMatch(/not confirmed received|pending/i);
    expect(visibleText).not.toMatch(/refund (?:has )?(?:arrived|been received)/i);
  });

  it("does not invent a reference when the source has none", () => {
    const { visibleText } = composeVisibleResult(
      "Your refund of £68.40 has been approved. It will be paid within 5 to 10 working days.",
    );

    expect(visibleText).not.toContain("RF-20481");
    expect(visibleText).not.toMatch(/Reference\s*=\s*[A-Z]{2,}[-/]?\d/);
  });
});

// --- Defect C: an extracted expected date must survive ----------------------

const MISSING_PARCEL =
  "We are sorry your order ORD-77194 has not arrived. It was expected on 4 August 2026. We are investigating with the courier and will update you within 3 working days.";

describe("W1 missing-parcel date integrity", () => {
  it("extracts the order reference, the expected date and the update period", () => {
    const extraction = extractGeneralAdmin(MISSING_PARCEL);

    expect(extraction.references.map((item) => item.value)).toContain("ORD-77194");
    expect(extraction.dates.map((item) => item.value)).toContain("4 August 2026");
    expect(extraction.relativePeriods.map((item) => item.value)).toEqual(
      expect.arrayContaining([expect.stringMatching(/3 working days/i)]),
    );
  });

  it("carries all three facts into the case evidence", () => {
    const { caseEvidenceText } = composeVisibleResult(MISSING_PARCEL);

    expect(caseEvidenceText).toContain("ORD-77194");
    expect(caseEvidenceText).toContain("4 August 2026");
    expect(caseEvidenceText).toMatch(/3 working days/i);
  });

  it("shows all three facts in the visible result, as separate facts", () => {
    const { visibleText } = composeVisibleResult(MISSING_PARCEL);

    expect(visibleText).toContain("ORD-77194");
    expect(visibleText).toContain("4 August 2026");
    expect(visibleText).toMatch(/3 working days/i);
  });

  it("invents no money and does not declare the parcel permanently lost", () => {
    const { visibleText } = composeVisibleResult(MISSING_PARCEL);

    expect(visibleText).not.toMatch(/£\s*\d/);
    expect(visibleText).not.toMatch(/permanently lost|declared lost|confirmed lost/i);
  });

  it("does not invent a date when the source has none", () => {
    const { visibleText } = composeVisibleResult(
      "We are sorry your order ORD-77194 has not arrived. We are investigating with the courier.",
    );

    expect(visibleText).not.toContain("4 August 2026");
  });
});
