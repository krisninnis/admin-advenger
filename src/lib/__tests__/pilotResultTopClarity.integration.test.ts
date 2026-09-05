import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { buildResultViewModel, flattenResultViewModelText } from "../resultViewModel";
import { buildStrategicNextStepPlan } from "../strategicNextStep";

const NOW = new Date("2026-09-05T12:00:00.000Z");

const northbridgeNotice = ({
  contactDate = "29 July 2026",
  includeContactDate = true,
  includeEffectiveDate = true,
}: {
  contactDate?: string;
  includeContactDate?: boolean;
  includeEffectiveDate?: boolean;
} = {}) => [
  "Northbridge Broadband",
  "Service price change notice",
  "Date: 15 July 2026",
  "Account reference: NB-73104",
  `Your monthly broadband price will change from £29.00 to £32.50${includeEffectiveDate ? " from 1 August 2026" : ""}.`,
  includeContactDate
    ? `Please review your account and contact us by ${contactDate} if any details appear incorrect.`
    : undefined,
  "This notice does not say that your service has been cancelled or disconnected.",
].filter((line): line is string => Boolean(line)).join("\n");

const hmrcNotice = [
  "HMRC",
  "HM Revenue & Customs",
  "Tax Code Notice",
  "Tax year: 6 April 2026 to 5 April 2027",
  "This is to tell you your tax code.",
  "Your tax code has changed from C1263L to C1254L.",
  "Previous tax code: C1263L",
  "New code: C1254L",
].join("\n");

const composeResult = (rawText: string, title = "journey-3-service-notice.docx") => {
  const item: AdminItem = {
    id: `item-${title}`,
    title,
    sourceType: "bill",
    rawText,
    createdAt: NOW.toISOString(),
    userQuestion: "What is this?",
  };
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const adminCase = selectMostImportantCase(cases);

  if (!adminCase) throw new Error("Expected the fixture to produce an admin case");

  const finding = findings.find((candidate) => candidate.id === adminCase.findingId);
  const opportunity = deriveOpportunityCard(adminCase, item, finding);
  const benefitsActionPack = adminCase.decisionResult
    ? buildBenefitsActionPack(adminCase.decisionResult, opportunity, adminCase)
    : null;
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult: adminCase.decisionResult,
    benefitsActionPack,
    opportunity,
    adminCase,
  });
  const model = buildResultViewModel({
    decisionResult: adminCase.decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
    opportunity,
    adminCase,
    now: NOW,
  });

  return { adminCase, model, visibleText: flattenResultViewModelText(model) };
};

describe("Pilot Result Top Clarity v1 production composition", () => {
  it.each([
    ["passed", "29 July 2026", "Source-stated date has passed"],
    ["today", "5 September 2026", "Source-stated date is today"],
    ["upcoming", "6 September 2026", "Source-stated date is upcoming"],
  ] as const)("classifies a %s source-stated contact date at the top", (relationship, date, label) => {
    const { adminCase, model } = composeResult(northbridgeNotice({ contactDate: date }));

    expect(adminCase.timingFacts?.dates).toContainEqual(
      expect.objectContaining({ value: date, role: "stated_deadline" }),
    );
    expect(model.deadlineClarity).toMatchObject({ relationship, value: date });
    expect(model.primaryStatusLabel).toContain(label);
    expect(model.deadlineClarity?.explanation).toContain(
      "contacting Northbridge Broadband if any details appeared incorrect",
    );
  });

  it("fails closed when a source-stated contact date has no year", () => {
    const { model } = composeResult(northbridgeNotice({ contactDate: "29 July" }));

    expect(model.deadlineClarity).toMatchObject({
      relationship: "unknown",
      value: "29 July",
    });
    expect(model.primaryStatusLabel).toBe("Source-stated date to check: 29 July");
    expect(model.deadlineClarity?.explanation).toContain("cannot safely compare");
  });

  it.each([
    ["document date only", northbridgeNotice({ includeContactDate: false, includeEffectiveDate: false })],
    ["effective date only", northbridgeNotice({ includeContactDate: false })],
  ])("does not promote a %s into deadline urgency", (_label, notice) => {
    const { model } = composeResult(notice);

    expect(model.deadlineClarity).toBeUndefined();
    expect(model.primaryStatusLabel).toBe("Potential saving opportunity — not confirmed yet");
  });

  it("keeps HMRC tax-year period boundaries out of deadline clarity", () => {
    const { model, visibleText } = composeResult(hmrcNotice, "HMRC Tax Code Notice");

    expect(model.title).toContain("HMRC tax code notice");
    expect(model.deadlineClarity).toBeUndefined();
    expect(visibleText).toContain("Period start");
    expect(visibleText).toContain("Period end");
    expect(visibleText).not.toMatch(/source-stated date (?:has passed|is today|is upcoming)/i);
  });

  it("keeps a security warning primary when a suspicious message also states a date", () => {
    const { adminCase, model } = composeResult(
      "Urgent security alert: click this link and send your password to verify your account. Reply by 6 September 2026.",
      "Security alert",
    );

    expect(adminCase.securityPrecedence).toBe(true);
    expect(model.deadlineClarity?.relationship).toBe("upcoming");
    expect(model.primaryStatusLabel).not.toContain("Source-stated date is upcoming");
    expect(model.primaryStatusLabel).toBe(adminCase.status);
  });

  it("makes the Northbridge result source-specific without inventing a consequence", () => {
    const { adminCase, model, visibleText } = composeResult(northbridgeNotice());

    expect(model.title).toBe("Your bill looks like it is going up");
    expect(adminCase.evidence).toContainEqual(
      expect.objectContaining({ label: "Account reference", value: "NB-73104" }),
    );
    expect(model.primaryStatusLabel).toBe("Source-stated date has passed: 29 July 2026");
    expect(model.secondaryStatusLabel).toBe("Potential saving opportunity — not confirmed yet");
    expect(model.deadlineClarity?.explanation).toContain(
      "The source says this date is for contacting Northbridge Broadband if any details appeared incorrect.",
    );
    expect(model.bestNextMove?.label).not.toBe("Identify the sender, date, reference, and deadline");
    expect(model.bestNextMove?.description).toContain("Northbridge Broadband");
    expect(model.bestNextMove?.description).toContain("NB-73104");
    expect(model.bestNextMove?.description).toContain("£29");
    expect(model.bestNextMove?.description).toContain("£32.50");
    expect(model.bestNextMove?.description).toContain("1 August 2026");
    expect(model.bestNextMove?.description).toContain("29 July 2026");
    expect(visibleText).toContain("cannot tell from this date alone what missing it means");
    expect(visibleText).not.toMatch(/lost (?:your )?rights|service (?:was|has been) cancelled|service (?:was|has been) disconnected|penalty/i);
  });
});
