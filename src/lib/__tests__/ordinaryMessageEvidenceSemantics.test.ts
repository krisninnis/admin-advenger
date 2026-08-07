import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { buildCaseProgress } from "../caseProgress";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildResultViewModel, flattenResultViewModelText } from "../resultViewModel";

// W2 - Ordinary Message Evidence & Completeness Semantics v1.
//
// Two rules, and nothing else on this branch:
//
//   only count evidence that actually exists;
//   only mark questions complete when they were actually answered.
//
// The audit found "Evidence found" acting as a dumping ground: source facts,
// arithmetic derived from them, missing-information placeholders, caveats and
// the provenance row all landed in one array, and the progress widget then
// reported the raw length as "19 pieces of evidence found so far". Separately,
// an empty questions list was read as "all questions answered", so a result
// could say the provider was unknown and the questions were complete in the
// same breath.
//
// These tests assert the four buckets by meaning, not by English label
// matching, and they assert the honest count for all three audit scenarios.

const makeItem = (rawText: string): AdminItem => ({
  id: "item-evidence-semantics",
  title: "Pasted admin text",
  sourceType: "email",
  rawText,
  createdAt: "2026-08-07T09:00:00.000Z",
});

const compose = (rawText: string) => {
  const item = makeItem(rawText);
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const adminCase = selectMostImportantCase(cases);

  if (!adminCase) {
    throw new Error("No case was created for the evidence-semantics fixture");
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
    progress,
    visibleText: flattenResultViewModelText(resultViewModel),
    foundLabels: resultViewModel.evidenceFound.map((entry) => entry.label),
    foundText: resultViewModel.evidenceFound
      .map((entry) => `${entry.label} = ${entry.value}`)
      .join("\n"),
    gatherText: resultViewModel.evidenceToGather
      .map((entry) => `${entry.label} = ${entry.value}`)
      .join("\n"),
    questionsItem: progress.items.find((entry) => entry.id === "questions-answered"),
    evidenceItem: progress.items.find((entry) => entry.id === "evidence-gathered"),
  };
};

const PRICE_RISE =
  "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 September 2026. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.";

const REFUND =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.";

const PARCEL =
  "We are sorry your order ORD-77194 has not arrived. It was expected on 4 August 2026. We are investigating with the courier and will update you within 3 working days.";

/**
 * Nothing in "Evidence found" may be a placeholder for something absent. This
 * is asserted structurally rather than by label text: a found fact must not
 * announce its own absence.
 */
const expectNoAbsenceMarkers = (foundText: string) => {
  expect(foundText).not.toMatch(/not found yet/i);
  expect(foundText).not.toMatch(/\bneeds? user confirmation\b/i);
  expect(foundText).not.toMatch(/^\s*Missing/im);
  expect(foundText).not.toMatch(/=\s*missing\s*$/im);
  expect(foundText).not.toMatch(/=\s*Needed\s*$/im);
};

describe("W2 price-rise evidence semantics", () => {
  it("counts only the facts actually present in the source", () => {
    const { foundLabels } = compose(PRICE_RISE);

    expect([...foundLabels].sort()).toEqual([
      "Current monthly price",
      "Effective date",
      "New monthly price",
      "Options mentioned",
    ]);
  });

  it("keeps the derived figures visible without counting them as found evidence", () => {
    const { foundText, visibleText } = compose(PRICE_RISE);

    expect(visibleText).toContain("£12");
    expect(visibleText).toContain("£144");
    expect(foundText).not.toContain("£12");
    expect(foundText).not.toContain("£144");
  });

  it("does not present absent provider or contract details as found evidence", () => {
    const { foundText } = compose(PRICE_RISE);

    expectNoAbsenceMarkers(foundText);
    expect(foundText).not.toContain("Provider");
    expect(foundText).not.toContain("Contract");
  });

  it("does not let caveats or the provenance row inflate the count", () => {
    const { foundLabels } = compose(PRICE_RISE);

    expect(foundLabels).not.toContain("Caveat");
    expect(foundLabels).not.toContain("Source");
    expect(foundLabels).not.toContain("Contract timing explanation");
  });

  it("still lists the missing information, as something to gather", () => {
    const { gatherText } = compose(PRICE_RISE);

    expect(gatherText).toMatch(/provider name missing/i);
    expect(gatherText).toMatch(/contract start or renewal date/i);
  });

  it("reports the honest evidence count in the progress widget", () => {
    const { evidenceItem } = compose(PRICE_RISE);

    expect(evidenceItem?.description).toContain("4 pieces of evidence found");
  });

  it("does not claim the questions are answered when none were generated", () => {
    const { resultViewModel, questionsItem } = compose(PRICE_RISE);

    expect(resultViewModel.questionsToAnswer).toEqual([]);
    expect(questionsItem?.status).not.toBe("complete");
    expect(questionsItem?.description).not.toMatch(/no outstanding questions/i);
  });
});

describe("W2 refund evidence semantics", () => {
  it("counts each source-supported fact once", () => {
    const { foundLabels } = compose(REFUND);

    expect([...foundLabels].sort()).toEqual([
      "Expected refund window",
      "Reference",
      "Refund amount",
      "Refund status",
    ]);
  });

  it("does not count the absent arrival date as found evidence", () => {
    const { foundText, gatherText } = compose(REFUND);

    expectNoAbsenceMarkers(foundText);
    expect(gatherText).toMatch(/exact refund arrival date/i);
  });

  it("treats the working-day window as a found fact, not a gap", () => {
    const { foundText, gatherText } = compose(REFUND);

    expect(foundText).toMatch(/5 to 10 working days/i);
    expect(gatherText).not.toMatch(/5 to 10 working days/i);
  });

  it("does not claim the questions are answered when none were generated", () => {
    const { questionsItem } = compose(REFUND);

    expect(questionsItem?.status).not.toBe("complete");
  });
});

describe("W2 missing-parcel evidence semantics", () => {
  it("counts each found fact once and excludes the provenance row", () => {
    const { foundLabels } = compose(PARCEL);

    expect([...foundLabels].sort()).toEqual([
      "Date shown in the message",
      "Expected response period",
      "Reference",
    ]);
  });

  it("does not describe already-known facts as missing", () => {
    const { gatherText } = compose(PARCEL);

    expect(gatherText).not.toContain("ORD-77194");
    expect(gatherText).not.toContain("4 August 2026");
  });

  it("does not claim the questions are answered when none were generated", () => {
    const { questionsItem } = compose(PARCEL);

    expect(questionsItem?.status).not.toBe("complete");
  });
});

// --- Blast radius: provenance is not meaning --------------------------------
//
// `EvidenceItem.source` records where a row came from, not what it is. "manual"
// covers genuine gaps AND safety boundaries, provider statements, disclaimers,
// decision boundaries and suggested next actions. Defaulting it to "missing"
// turned all of those into things the person was told to go and gather, which
// is a worse defect than the count inflation. The default is therefore
// fail-safe: untagged rows stay visible as context and never become tasks.
//
// These fixtures cover every affected category found in the producer inventory.

const NEVER_A_TASK = [
  // Safety boundaries and disclaimers.
  /AdminAvenger has not decided whether it is owed/i,
  /Detected-signal warning/i,
  /has not independently verified/i,
  /is preserving what the source says/i,
  /cannot decide benefit entitlement/i,
  /Preparation only\. The user reviews and decides/i,
  // Suggested actions.
  /Use the email safety check/i,
  /review the pasted text manually/i,
];

describe("W2 informational rows never become tasks to gather", () => {
  it.each([
    [
      "payment reminder",
      "Payment reminder: your account balance of £84.20 is outstanding. Please pay by 20 August 2026 to avoid further collection activity.",
    ],
    [
      "suspicious email",
      "URGENT: Your account will be suspended. Verify your details immediately at secure-login.example/verify or your access will be lost. Reply with your password now.",
    ],
    [
      "account outcome",
      "We have now closed your account and applied a final credit of £15.00. Your reference is AC-4471.",
    ],
    [
      "appointment notice",
      "You have a Universal Credit appointment on 12 August 2026 at 10:00. Please bring your bank statements and payslips.",
    ],
    [
      "possession notice",
      "Notice seeking possession of your property. You must respond by 15 August 2026.",
    ],
    [
      "energy price change",
      "Your energy prices change on 1 October 2026. Electricity rises from £600 to £700 a year and gas from £400 to £450 a year.",
    ],
    ["no clear signal", "Thanks for getting in touch. We will be in contact again soon."],
  ])("keeps boundaries and actions out of the gather list for %s", (_name, message) => {
    const { gatherText } = compose(message);

    for (const pattern of NEVER_A_TASK) {
      expect(gatherText).not.toMatch(pattern);
    }
  });

  it("still surfaces genuine gaps as things to gather", () => {
    // A gap tagged "missing" must reach the gather list, or the fail-safe
    // default would have silently swallowed real missing information.
    expect(compose(PRICE_RISE).gatherText).toMatch(/cancellation.switching rights/i);
  });

  it("keeps boundaries and disclaimers visible as context rather than dropping them", () => {
    const { visibleText } = compose(
      "Payment reminder: your account balance of £84.20 is outstanding. Please pay by 20 August 2026 to avoid further collection activity.",
    );

    expect(visibleText).toMatch(/has not decided whether it is owed/i);
  });

  it("does not let an informational row be counted as a found fact", () => {
    const { foundText } = compose(
      "We have now closed your account and applied a final credit of £15.00. Your reference is AC-4471.",
    );

    expect(foundText).not.toMatch(/has not independently verified/i);
  });
});

// --- W1 must not regress ----------------------------------------------------

describe("W2 keeps W1 source-fact integrity", () => {
  it("keeps every price-rise fact visible and invents no provider", () => {
    const { visibleText } = compose(PRICE_RISE);

    for (const fact of ["£34", "£46", "£12", "£144", "1 September 2026"]) {
      expect(visibleText).toContain(fact);
    }
    expect(/Provider[^\n]*(?:GBP|£)\s*\d/.test(visibleText)).toBe(false);
  });

  it("keeps every refund fact visible and does not claim arrival", () => {
    const { visibleText } = compose(REFUND);

    expect(visibleText).toContain("£68.40");
    expect(visibleText).toMatch(/5 to 10 working days/i);
    expect(visibleText).toContain("RF-20481");
    expect(visibleText).toMatch(/not confirmed received|pending/i);
  });

  it("keeps every parcel fact visible, invents no money and declares no loss", () => {
    const { visibleText } = compose(PARCEL);

    expect(visibleText).toContain("ORD-77194");
    expect(visibleText).toContain("4 August 2026");
    expect(visibleText).toMatch(/3 working days/i);
    expect(visibleText).not.toMatch(/£\s*\d/);
    expect(visibleText).not.toMatch(/permanently lost|declared lost|confirmed lost/i);
  });
});
