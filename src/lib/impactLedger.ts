import type {
  AdminCase,
  AdminFinding,
  AdminItem,
  ImpactEntry,
  ImpactEntryStatus,
  ImpactEntryType,
  MoneyImpactFrequency,
  OutcomeConfirmationType,
} from "../types";
import { deriveOpportunityCard } from "./opportunityCards";
import { getGuidedCaseMode } from "./guidedCaseMode";

export type ImpactTotals = {
  confirmedSavedRecovered: number;
  confirmedSavedRecoveredMonthly: number;
  confirmedSavedRecoveredAnnual: number;
  pendingRecovery: number;
  pendingRecoveryMonthly: number;
  pendingRecoveryAnnual: number;
  potentialSaving: number;
  potentialMonthlySaving: number;
  potentialAnnualSaving: number;
  deadlinesProtected: number;
  resolvedCases: number;
};

export type OutcomeConfirmationInput = {
  outcomeType: OutcomeConfirmationType;
  amount?: number;
  currency: "GBP" | "unknown";
  frequency: MoneyImpactFrequency;
  note: string;
  proofImageName?: string;
  proofImageDataUrl?: string;
  proofText?: string;
  confirmedAt: string;
};

const pound = String.fromCharCode(163);

const isConfirmedType = (type: ImpactEntryType) =>
  type === "confirmed_saved" ||
  type === "confirmed_recovered" ||
  type === "cost_increase_avoided";

const isPendingOrPotentialType = (type: ImpactEntryType) =>
  type === "pending_recovery" ||
  type === "under_review" ||
  type === "potential_recovery" ||
  type === "potential_saving";

export const formatMoneyImpact = (
  amount?: number,
  currency: "GBP" | "unknown" = "GBP",
  frequency: MoneyImpactFrequency = "one_off",
) => {
  if (amount === undefined) {
    return "Amount not recorded";
  }

  const symbol = currency === "GBP" ? pound : "";
  const suffix =
    frequency === "monthly" ? "/month" : frequency === "annual" ? "/year" : "";

  return `${symbol}${amount.toFixed(amount % 1 === 0 ? 0 : 2)}${suffix}`;
};

const makeEntry = (
  adminCase: AdminCase,
  type: ImpactEntryType,
  status: ImpactEntryStatus,
  evidenceNote: string,
  amount?: number,
  frequency: MoneyImpactFrequency = "one_off",
): ImpactEntry => {
  const now = new Date().toISOString();

  return {
    id: `impact-${adminCase.id}-${type}`,
    caseId: adminCase.id,
    title: adminCase.title,
    type,
    amount,
    currency: amount === undefined ? "unknown" : "GBP",
    frequency,
    status,
    evidenceNote,
    proofAttached: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const deriveImpactFromCase = (
  adminCase: AdminCase,
  item?: AdminItem,
  finding?: AdminFinding,
): ImpactEntry[] => {
  const card = deriveOpportunityCard(adminCase, item, finding);

  if (card.opportunityType === "bill_or_price_increase" || card.opportunityType === "energy_price_change") {
    const amount = card.annualisedAmount?.amount ?? card.potentialSaving?.amount;
    const frequency = card.annualisedAmount?.amount !== undefined ? "annual" : "monthly";

    return [
      makeEntry(
        adminCase,
        "potential_saving",
        "potential",
        card.opportunityType === "energy_price_change"
          ? "Energy annual cost increase found. User has not confirmed any saving yet."
          : "Potential saving/cost increase found. User has not confirmed any saving yet.",
        amount,
        frequency,
      ),
    ];
  }

  if (
    card.opportunityType === "money_back" ||
    card.opportunityType === "refund_expected" ||
    card.opportunityType === "travel_extra_cost_recovery"
  ) {
    return [
      makeEntry(
        adminCase,
        "pending_recovery",
        "pending",
        card.opportunityType === "travel_extra_cost_recovery"
          ? "Possible travel extra-cost recovery found. User has not confirmed receipt yet."
          : "Refund or recovery appears to be pending. User has not confirmed receipt yet.",
        card.potentialRecovery?.amount ?? card.moneyAtStake?.amount,
        "one_off",
      ),
    ];
  }

  if (
    card.opportunityType === "subscription_renewal" ||
    card.opportunityType === "subscription_recurring_charge"
  ) {
    return [
      makeEntry(
        adminCase,
        "potential_saving",
        "potential",
        "Recurring subscription charge could be avoided if cancelled before charging.",
        card.annualisedAmount?.amount ?? card.potentialSaving?.amount ?? card.moneyAtStake?.amount,
        card.annualisedAmount?.amount !== undefined ? "annual" : "monthly",
      ),
    ];
  }

  if (card.opportunityType === "deadline") {
    return [
      makeEntry(adminCase, "deadline_protected", "potential", "Deadline found and tracked."),
    ];
  }

  if (card.opportunityType === "suspicious_email_risk") {
    return [
      makeEntry(
        adminCase,
        "no_saving",
        "not_applicable",
        "Risky email found. This is a risk warning and evidence only. No money saving is counted.",
      ),
    ];
  }

  if (
    card.opportunityType === "delivery_update" ||
    card.opportunityType === "receipt_guardian" ||
    card.opportunityType === "no_action_needed"
  ) {
    return [
      makeEntry(
        adminCase,
        "no_saving",
        "not_applicable",
        card.opportunityType === "receipt_guardian"
          ? "Receipt evidence found. This is not counted as money saved."
          : card.opportunityType === "delivery_update"
            ? "Delivery update found. No saving or action is counted."
            : "Checked: no obvious saving or action found. This is not counted as money saved.",
      ),
    ];
  }

  if (card.opportunityType === "admin_dispute_check") {
    return [
      makeEntry(
        adminCase,
        "no_saving",
        "not_applicable",
        "Admin/rights notice checked. Any amount mentioned is not counted as money saved or recovered.",
      ),
    ];
  }

  return [];
};

export const getCaseImpactEntries = (entries: ImpactEntry[], caseId: string) =>
  entries.filter((entry) => entry.caseId === caseId);

export const upsertImpactEntry = (entries: ImpactEntry[], entry: ImpactEntry) => [
  entry,
  ...entries.filter((currentEntry) => currentEntry.id !== entry.id),
];

export const updateImpactEntry = (
  entries: ImpactEntry[],
  entryId: string,
  updates: Partial<ImpactEntry>,
) =>
  entries.map((entry) =>
    entry.id === entryId ? { ...entry, ...updates, updatedAt: new Date().toISOString() } : entry,
  );

export const deleteImpactEntry = (entries: ImpactEntry[], entryId: string) =>
  entries.filter((entry) => entry.id !== entryId);

export const createConfirmedImpactEntry = (
  adminCase: AdminCase,
  input: OutcomeConfirmationInput,
): ImpactEntry => {
  const now = new Date().toISOString();
  const typeByOutcome: Record<OutcomeConfirmationType, ImpactEntryType> = {
    got_money_back: "confirmed_recovered",
    reduced_bill: "confirmed_saved",
    cancelled_before_charge: "confirmed_saved",
    avoided_price_rise: "cost_increase_avoided",
    protected_deadline: "deadline_protected",
    resolved_no_money: "no_saving",
    not_worth_pursuing: "no_saving",
    rejected_unsuccessful: "rejected",
    still_waiting: "pending_recovery",
  };
  // "Still waiting" only means pending recovery for money-back / refund style cases.
  // For saving_or_review (subscriptions, energy, broadband/mobile price rises), safety,
  // and record modes, a "Still reviewing"/"Still checking" outcome is a review-in-progress,
  // not money pending recovery, so it must not be counted or labelled as pending recovery.
  const guidedMode = getGuidedCaseMode(adminCase, deriveOpportunityCard(adminCase));
  const type: ImpactEntryType =
    input.outcomeType === "still_waiting" && guidedMode !== "recovery"
      ? "under_review"
      : typeByOutcome[input.outcomeType];
  const status: ImpactEntryStatus =
    type === "rejected"
      ? "rejected"
      : type === "under_review"
        ? "reviewing"
        : type === "pending_recovery"
          ? "pending"
          : type === "no_saving"
            ? "not_applicable"
            : "confirmed";
  const fallbackNoteByOutcome: Record<OutcomeConfirmationType, string> = {
    got_money_back: "Money received.",
    reduced_bill: "Bill reduced.",
    cancelled_before_charge: "Cancelled before the next charge.",
    avoided_price_rise: "Price rise avoided.",
    protected_deadline: "Deadline protected.",
    resolved_no_money: "Resolved without money saved or recovered.",
    not_worth_pursuing: "Not worth pursuing. No confirmed money added.",
    rejected_unsuccessful: "Rejected. No confirmed money added.",
    still_waiting: "Still waiting. Money has not been confirmed received.",
  };

  return {
    id: `impact-${adminCase.id}-confirmed-${crypto.randomUUID()}`,
    caseId: adminCase.id,
    title: adminCase.title,
    type,
    amount: input.amount,
    currency: input.amount === undefined ? "unknown" : input.currency,
    frequency: input.frequency,
    status,
    evidenceNote: input.note || fallbackNoteByOutcome[input.outcomeType],
    proofAttached: Boolean(input.proofImageName || input.proofText),
    proofImageName: input.proofImageName,
    proofImageDataUrl: input.proofImageDataUrl,
    proofText: input.proofText,
    confirmedAt: input.confirmedAt,
    createdAt: now,
    updatedAt: now,
  };
};

export const calculateImpactTotals = (
  entries: ImpactEntry[],
  cases: AdminCase[] = [],
): ImpactTotals => {
  const confirmedCaseIds = new Set(entries.filter((entry) => isConfirmedType(entry.type)).map((entry) => entry.caseId));
  const usableEntries = entries.filter(
    (entry) => !(confirmedCaseIds.has(entry.caseId) && isPendingOrPotentialType(entry.type)),
  );

  return {
    confirmedSavedRecovered: usableEntries
      .filter((entry) => isConfirmedType(entry.type) && !["monthly", "annual"].includes(entry.frequency))
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    confirmedSavedRecoveredMonthly: usableEntries
      .filter((entry) => isConfirmedType(entry.type) && entry.frequency === "monthly")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    confirmedSavedRecoveredAnnual: usableEntries
      .filter((entry) => isConfirmedType(entry.type) && entry.frequency === "annual")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    pendingRecovery: usableEntries
      .filter((entry) => entry.type === "pending_recovery" && !["monthly", "annual"].includes(entry.frequency))
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    pendingRecoveryMonthly: usableEntries
      .filter((entry) => entry.type === "pending_recovery" && entry.frequency === "monthly")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    pendingRecoveryAnnual: usableEntries
      .filter((entry) => entry.type === "pending_recovery" && entry.frequency === "annual")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    potentialSaving: usableEntries
      .filter((entry) => entry.type === "potential_saving" && !["monthly", "annual"].includes(entry.frequency))
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    potentialMonthlySaving: usableEntries
      .filter((entry) => entry.type === "potential_saving" && entry.frequency === "monthly")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    potentialAnnualSaving: usableEntries
      .filter((entry) => entry.type === "potential_saving" && entry.frequency === "annual")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    deadlinesProtected: usableEntries.filter(
      (entry) => entry.type === "deadline_protected" && entry.status !== "rejected",
    ).length,
    resolvedCases: cases.filter((adminCase) => adminCase.status === "resolved").length,
  };
};
