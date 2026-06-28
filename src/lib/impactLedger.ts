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

export type ImpactTotals = {
  confirmedSavedRecovered: number;
  pendingRecovery: number;
  potentialSaving: number;
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

  if (card.opportunityType === "bill_or_price_increase") {
    const amount = card.annualisedAmount?.amount ?? card.potentialSaving?.amount;
    const frequency = card.annualisedAmount?.amount !== undefined ? "annual" : "monthly";

    return [
      makeEntry(
        adminCase,
        "potential_saving",
        "potential",
        "Potential saving/cost increase found. User has not confirmed any saving yet.",
        amount,
        frequency,
      ),
    ];
  }

  if (card.opportunityType === "money_back") {
    return [
      makeEntry(
        adminCase,
        "pending_recovery",
        "pending",
        "Refund or recovery appears to be pending. User has not confirmed receipt yet.",
        card.potentialRecovery?.amount ?? card.moneyAtStake?.amount,
        "one_off",
      ),
    ];
  }

  if (card.opportunityType === "subscription_renewal") {
    return [
      makeEntry(
        adminCase,
        "potential_saving",
        "potential",
        "Subscription renewal could be avoided if cancelled before charging.",
        card.potentialSaving?.amount ?? card.moneyAtStake?.amount,
        "one_off",
      ),
    ];
  }

  if (card.opportunityType === "deadline") {
    return [
      makeEntry(adminCase, "deadline_protected", "potential", "Deadline found and tracked."),
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
  const type = typeByOutcome[input.outcomeType];
  const status: ImpactEntryStatus =
    type === "rejected"
      ? "rejected"
      : type === "pending_recovery"
        ? "pending"
        : type === "no_saving"
          ? "not_applicable"
          : "confirmed";

  return {
    id: `impact-${adminCase.id}-confirmed-${crypto.randomUUID()}`,
    caseId: adminCase.id,
    title: adminCase.title,
    type,
    amount: input.amount,
    currency: input.amount === undefined ? "unknown" : input.currency,
    frequency: input.frequency,
    status,
    evidenceNote: input.note || "Outcome confirmed by user.",
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
      .filter((entry) => isConfirmedType(entry.type))
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    pendingRecovery: usableEntries
      .filter((entry) => entry.type === "pending_recovery")
      .reduce((total, entry) => total + (entry.amount ?? 0), 0),
    potentialSaving: usableEntries
      .filter((entry) => entry.type === "potential_saving" && entry.frequency !== "annual")
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
