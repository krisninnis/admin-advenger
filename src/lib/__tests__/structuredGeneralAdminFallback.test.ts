import { describe, expect, it } from "vitest";
import type { AdminCaseStatus } from "../../types";
import { extractGeneralAdmin, type GeneralAdminFallbackTopic, type MoneyRole } from "../generalAdminExtraction";
import { publicMessageCorpusV1 } from "../publicMessageEvaluation/corpusV1";
import {
  reconstructPublicMessageJourney,
  runPublicMessageScenario,
} from "../publicMessageEvaluation/runEvaluation";

type CaseSpec = {
  category: string;
  subcategory: string;
  topic: GeneralAdminFallbackTopic;
  status: AdminCaseStatus;
  date?: string;
  period?: string;
  amounts?: Array<[number, MoneyRole]>;
  references?: string[];
  dependency?: RegExp;
  action: RegExp;
};

const cases: CaseSpec[] = [
  { category: "bills_accounts_services", subcategory: "price_rise", topic: "price_or_account_change", status: "new", date: "1 September 2026", amounts: [[28, "price_old"], [31, "price_new"]], references: ["PRICE-310"], action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "closure_conditional_documents", topic: "document_request", status: "ready_to_act", date: "19 August 2026", references: ["DOC-190"], action: /provide the requested identity document/i },
  { category: "bills_accounts_services", subcategory: "disputed_balance", topic: "payment_or_balance", status: "waiting", amounts: [[315, "balance_under_review"]], dependency: /paused while we review/i, action: /wait for the stated outcome/i },
  { category: "bills_accounts_services", subcategory: "waiver_requested", topic: "payment_or_balance", status: "waiting", amounts: [[82, "balance_under_review"]], dependency: /no decision/i, action: /wait for the stated outcome/i },
  { category: "bills_accounts_services", subcategory: "waiver_refused", topic: "payment_or_balance", status: "ready_to_act", amounts: [[51, "amount_demanded"]], dependency: /remains due/i, action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "final_direct_debit", topic: "payment_or_balance", status: "new", date: "3 September 2026", amounts: [[29.5, "amount_collected_automatically"]], action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "collection_warning", topic: "payment_or_balance", status: "ready_to_act", date: "10 August 2026", amounts: [[160, "amount_demanded"]], dependency: /unless/i, action: /stated consequence/i },
  { category: "bills_accounts_services", subcategory: "duplicate_charge", topic: "payment_or_balance", status: "new", date: "4 July 2026", amounts: [[17.99, "unknown"]], action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "payment_plan", topic: "payment_or_balance", status: "new", date: "5 September 2026", period: "six months", amounts: [[25, "recurring_charge"]], action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "service_suspension", topic: "payment_or_balance", status: "ready_to_act", date: "22 August 2026", dependency: /if the overdue bill remains unpaid/i, action: /stated consequence/i },
  { category: "benefits_public_administration", subcategory: "fit_note", topic: "document_request", status: "ready_to_act", dependency: /if your health condition continues/i, action: /provide the requested current fit note/i },
  { category: "benefits_public_administration", subcategory: "change_of_circumstances", topic: "provider_update", status: "ready_to_act", action: /report relevant changes/i },
  { category: "benefits_public_administration", subcategory: "inheritance_capital_prompt", topic: "provider_update", status: "ready_to_act", action: /official account asks whether/i },
  { category: "employment_income", subcategory: "payslip_discrepancy", topic: "payment_or_balance", status: "ready_to_act", action: /ask payroll to check/i },
  { category: "employment_income", subcategory: "redundancy_consultation", topic: "decision_or_review", status: "ready_to_act", date: "26 August 2026", action: /invited to a redundancy consultation/i },
  { category: "housing_utilities", subcategory: "energy_debt", topic: "payment_or_balance", status: "waiting", amounts: [[375, "amount_demanded"]], dependency: /not yet agreed/i, action: /wait for the stated outcome/i },
  { category: "housing_utilities", subcategory: "broadband_cancellation", topic: "price_or_account_change", status: "waiting", date: "4 September 2026", dependency: /final bill will follow/i, action: /wait for the stated outcome/i },
  { category: "bereavement_general", subcategory: "evidence_requested", topic: "document_request", status: "ready_to_act", date: "23 August 2026", references: ["BRV-E12"], action: /provide the requested final statement/i },
  { category: "bereavement_general", subcategory: "provider_notified", topic: "decision_or_review", status: "waiting", references: ["BRV-001"], dependency: /review has started/i, action: /wait for the stated outcome/i },
  { category: "neutral_low_action", subcategory: "payment_received", topic: "information_confirmation", status: "no_action_needed", amounts: [[52, "amount_received"]], action: /keep this confirmation/i },
  { category: "neutral_low_action", subcategory: "delivery_update", topic: "information_confirmation", status: "no_action_needed", action: /keep this confirmation/i },
  { category: "neutral_low_action", subcategory: "thank_you", topic: "information_confirmation", status: "no_action_needed", action: /keep this confirmation/i },
  { category: "bereavement_general", subcategory: "not_due_today_future", topic: "payment_or_balance", status: "waiting", amounts: [[58.9, "future_amount"]], dependency: /may become payable after review/i, action: /wait for the stated outcome/i },
  { category: "bills_accounts_services", subcategory: "several_amounts", topic: "payment_or_balance", status: "new", amounts: [[120, "former_balance"], [45, "balance_under_review"], [15, "amount_received"]], action: /compare the stated amount/i },
  { category: "bills_accounts_services", subcategory: "contradictory_wording", topic: "payment_or_balance", status: "ready_to_act", action: /ask the provider to clarify/i },
  { category: "bills_accounts_services", subcategory: "ocr_formatting", topic: "payment_or_balance", status: "waiting", amounts: [[62, "balance_under_review"]], references: ["OCR-62-A"], dependency: /under review/i, action: /wait for the stated outcome/i },
  { category: "bills_accounts_services", subcategory: "reference_formats", topic: "provider_update", status: "ready_to_act", references: ["AB-10482", "Q7/2026/19", "CASE99-X"], action: /keep references/i },
];

const findScenario = (category: string, subcategory: string) => {
  const scenario = publicMessageCorpusV1.find(
    (candidate) => candidate.category === category && candidate.subcategory === subcategory,
  );
  if (!scenario) throw new Error(`Missing scenario ${category}/${subcategory}`);
  return scenario;
};

describe("structured general-admin fallback", () => {
  it.each(cases)("preserves $category/$subcategory across fresh and reconstructed composition", (spec) => {
    const scenario = findScenario(spec.category, spec.subcategory);
    const fresh = runPublicMessageScenario(scenario);
    const reconstructed = reconstructPublicMessageJourney(fresh, scenario.id);

    for (const journey of [fresh, reconstructed]) {
      const fallback = journey.adminCase.generalAdminFallback;
      expect(fallback).toBeDefined();
      expect(fallback?.topic).toBe(spec.topic);
      expect(journey.adminCase.category).toBe("unknown");
      expect(journey.adminCase.status).toBe(spec.status);
      expect(journey.opportunity.opportunityType).toBe(
        spec.status === "no_action_needed" ? "no_action_needed" : "needs_human_check",
      );
      expect(journey.resultViewModel.title).not.toMatch(/No obvious saving or action found/i);
      expect(journey.opportunity.nextBestAction).toMatch(spec.action);
      expect(journey.opportunity.nextBestAction).not.toMatch(/identify the sender, date, reference and deadline/i);
      expect(journey.guidedNextStep.primaryAction.kind).toBe("evidence_checklist");
      expect(journey.resultViewModel.moneyMentioned.every((money) => !money.countedInMoneyTracker)).toBe(true);
      expect(journey.impactEntries.every((entry) => !["confirmed_saved", "confirmed_recovered"].includes(entry.type))).toBe(true);

      if (spec.date) expect(fallback?.dates.map((date) => date.value)).toContain(spec.date);
      if (spec.period) expect(fallback?.relativePeriods.map((period) => period.value)).toContain(spec.period);
      for (const [amount, role] of spec.amounts ?? []) {
        expect(fallback?.amounts).toContainEqual(expect.objectContaining({ amount, role }));
      }
      for (const reference of spec.references ?? []) {
        expect(fallback?.references.map((item) => item.value)).toContain(reference);
      }
      if (spec.dependency) expect(fallback?.dependency).toMatch(spec.dependency);
    }
  });

  it("preserves 'within five working days' canonically while public housing scope stays authoritative", () => {
    const scenario = findScenario("housing_utilities", "repair_request");
    const extraction = extractGeneralAdmin(scenario.message);
    const journey = runPublicMessageScenario(scenario);

    expect(extraction.relativePeriods).toContainEqual(
      expect.objectContaining({ value: "within five working days", sourceQuote: "within five working days" }),
    );
    expect(extraction.fallback?.dependency).toMatch(/within five working days/i);
    expect(journey.finding?.title).toBe("Specialist support may be needed");
    expect(journey.adminCase.generalAdminFallback).toBeUndefined();
  });
});
