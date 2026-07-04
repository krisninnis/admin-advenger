import { useEffect, useState } from "react";
import type {
  AdminCase,
  ImpactEntry,
  MoneyImpactFrequency,
  OutcomeConfirmationType,
} from "../types";
import type { GuidedCaseMode } from "../lib/guidedCaseMode";
import { formatMoneyImpact } from "../lib/impactLedger";
import { deriveOpportunityCard } from "../lib/opportunityCards";

export type OutcomeConfirmationValues = {
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

type OutcomeConfirmationProps = {
  adminCase: AdminCase;
  impactEntries: ImpactEntry[];
  mode?: "standard" | "guided";
  guidedCaseMode?: GuidedCaseMode;
  onConfirmOutcome: (caseId: string, values: OutcomeConfirmationValues) => void;
};

const outcomeOptions: Array<{ value: OutcomeConfirmationType; label: string }> = [
  { value: "got_money_back", label: "I got money back" },
  { value: "reduced_bill", label: "I reduced my bill" },
  { value: "cancelled_before_charge", label: "I cancelled before being charged" },
  { value: "avoided_price_rise", label: "I avoided a price rise" },
  { value: "protected_deadline", label: "I protected a deadline" },
  { value: "resolved_no_money", label: "Issue resolved but no money saved" },
  { value: "not_worth_pursuing", label: "Not worth pursuing" },
  { value: "rejected_unsuccessful", label: "Rejected / unsuccessful" },
  { value: "still_waiting", label: "Still waiting" },
];

type OutcomeNudge = {
  label: string;
  outcomeType: OutcomeConfirmationType;
  note: string;
};

const recoveryOutcomeNudges: OutcomeNudge[] = [
  { label: "Money came back", outcomeType: "got_money_back", note: "Money was received back." },
  { label: "Still waiting", outcomeType: "still_waiting", note: "Still waiting. Money has not been confirmed received." },
  { label: "Rejected", outcomeType: "rejected_unsuccessful", note: "Rejected. No confirmed money added." },
  { label: "Not worth pursuing", outcomeType: "not_worth_pursuing", note: "User decided this is not worth pursuing right now." },
];

const priceReviewOutcomeNudges: OutcomeNudge[] = [
  { label: "Reduced cost", outcomeType: "reduced_bill", note: "Cost was reduced after checking." },
  { label: "Still checking", outcomeType: "still_waiting", note: "Still checking options. No confirmed saving added." },
  { label: "No better option", outcomeType: "resolved_no_money", note: "Checked options, but no better option was found." },
  { label: "Not worth changing", outcomeType: "not_worth_pursuing", note: "User decided this is not worth changing right now." },
];

const subscriptionReviewOutcomeNudges: OutcomeNudge[] = [
  { label: "Cancelled/reduced cost", outcomeType: "reduced_bill", note: "Subscription was cancelled, reduced, or changed after review." },
  { label: "Still reviewing", outcomeType: "still_waiting", note: "Still reviewing the subscription. No confirmed saving added." },
  { label: "Keeping it", outcomeType: "resolved_no_money", note: "User reviewed the subscription and decided to keep it." },
  { label: "Not worth changing", outcomeType: "not_worth_pursuing", note: "User decided this is not worth changing right now." },
];

const safetyOutcomeNudges: OutcomeNudge[] = [
  { label: "Verified through official route", outcomeType: "resolved_no_money", note: "Verified through an official website, app, or trusted contact route." },
  { label: "Still checking", outcomeType: "still_waiting", note: "Still checking through official channels. No action taken from the message." },
  { label: "Reported/ignored", outcomeType: "rejected_unsuccessful", note: "Message was reported, ignored, or not acted on." },
  { label: "Not relevant", outcomeType: "not_worth_pursuing", note: "User decided this is not relevant." },
];

const recordOutcomeNudges: OutcomeNudge[] = [
  { label: "Saved for records", outcomeType: "resolved_no_money", note: "Saved for records only. No action or saving confirmed." },
  { label: "Still checking", outcomeType: "still_waiting", note: "Still checking this record. No action or saving confirmed." },
  { label: "No action needed", outcomeType: "not_worth_pursuing", note: "Checked and no action is needed." },
  { label: "Not relevant", outcomeType: "rejected_unsuccessful", note: "Marked not relevant. No action or saving confirmed." },
];

const isSubscriptionReview = (adminCase: AdminCase) => {
  const opportunity = deriveOpportunityCard(adminCase);

  return (
    adminCase.category === "subscription" ||
    opportunity.opportunityType === "subscription_recurring_charge" ||
    opportunity.opportunityType === "subscription_renewal"
  );
};

const getGuidedOutcomeNudges = (
  adminCase: AdminCase,
  guidedCaseMode: GuidedCaseMode,
): OutcomeNudge[] => {
  if (guidedCaseMode === "saving_or_review") {
    return isSubscriptionReview(adminCase)
      ? subscriptionReviewOutcomeNudges
      : priceReviewOutcomeNudges;
  }

  if (guidedCaseMode === "safety") {
    return safetyOutcomeNudges;
  }

  if (guidedCaseMode === "record") {
    return recordOutcomeNudges;
  }

  return recoveryOutcomeNudges;
};

const getOutcomeNudges = (adminCase: AdminCase, impactEntries: ImpactEntry[]): OutcomeNudge[] => {
  const hasPendingRecovery = impactEntries.some((entry) => entry.type === "pending_recovery");
  const hasPotentialSaving = impactEntries.some((entry) => entry.type === "potential_saving");
  const hasDeadline = impactEntries.some((entry) => entry.type === "deadline_protected");

  if (hasPendingRecovery || adminCase.category === "refund") {
    return [
      { label: "Money came back", outcomeType: "got_money_back", note: "Money was received back after following up." },
      { label: "Still waiting", outcomeType: "still_waiting", note: "Still waiting for the provider or retailer to respond." },
      { label: "Not worth pursuing", outcomeType: "not_worth_pursuing", note: "User decided this is not worth pursuing right now." },
      { label: "Rejected", outcomeType: "rejected_unsuccessful", note: "The provider or retailer rejected the request." },
    ];
  }

  if (hasPotentialSaving || adminCase.category === "bill_increase" || adminCase.category === "subscription") {
    return [
      { label: "Bill reduced", outcomeType: "reduced_bill", note: "Bill or package cost was reduced." },
      { label: "Price rise avoided", outcomeType: "avoided_price_rise", note: "The price rise was avoided or a better package was agreed." },
      { label: "Cancelled before charge", outcomeType: "cancelled_before_charge", note: "Subscription or renewal was cancelled before the charge." },
      { label: "Still waiting", outcomeType: "still_waiting", note: "Still waiting for the provider to respond." },
    ];
  }

  if (hasDeadline || adminCase.category === "deadline") {
    return [
      { label: "Deadline handled", outcomeType: "protected_deadline", note: "The deadline was noted or handled before it passed." },
      { label: "No money saved", outcomeType: "resolved_no_money", note: "The issue was resolved, but no money was saved or recovered." },
      { label: "Still waiting", outcomeType: "still_waiting", note: "Still waiting for the next update." },
    ];
  }

  return [
    { label: "Resolved, no money", outcomeType: "resolved_no_money", note: "The issue was resolved, but no money was saved or recovered." },
    { label: "Not worth pursuing", outcomeType: "not_worth_pursuing", note: "User decided this is not worth pursuing right now." },
    { label: "Still waiting", outcomeType: "still_waiting", note: "Still waiting for the provider, retailer, or other party to respond." },
  ];
};

const today = () => new Date().toISOString().slice(0, 10);

const moneyOutcomeTypes = new Set<OutcomeConfirmationType>([
  "got_money_back",
  "reduced_bill",
  "cancelled_before_charge",
  "avoided_price_rise",
]);

const getDefaultAmount = (impactEntries: ImpactEntry[]) =>
  impactEntries.find(
    (entry) =>
      entry.amount !== undefined &&
      ["pending_recovery", "potential_recovery", "potential_saving"].includes(entry.type),
  )?.amount;

const formatAmountInput = (amount?: number) =>
  amount === undefined ? "" : amount.toFixed(amount % 1 === 0 ? 0 : 2);

const getOutcomeFallbackNote = (
  outcomeType: OutcomeConfirmationType,
  guidedCaseMode: GuidedCaseMode = "recovery",
  adminCase?: AdminCase,
) => {
  if (guidedCaseMode === "saving_or_review") {
    const subscription = adminCase ? isSubscriptionReview(adminCase) : false;

    if (outcomeType === "still_waiting") {
      return subscription
        ? "Still reviewing the subscription. No confirmed saving added."
        : "Still checking options. No confirmed saving added.";
    }

    if (outcomeType === "resolved_no_money") {
      return subscription
        ? "Keeping the subscription. No confirmed saving added."
        : "No better option found. No confirmed saving added.";
    }

    if (outcomeType === "not_worth_pursuing") {
      return "Not worth changing. No confirmed saving added.";
    }
  }

  if (guidedCaseMode === "safety") {
    if (outcomeType === "still_waiting") {
      return "Still checking through official channels. No action taken from the message.";
    }

    if (outcomeType === "resolved_no_money") {
      return "Verified through official channels. No money counted.";
    }

    return "Safety outcome recorded. No money counted.";
  }

  if (guidedCaseMode === "record") {
    if (outcomeType === "still_waiting") {
      return "Still checking this record. No action or saving confirmed.";
    }

    return "Record outcome saved. No money counted.";
  }

  if (outcomeType === "still_waiting") {
    return "Still waiting. Money has not been confirmed received.";
  }

  if (outcomeType === "rejected_unsuccessful") {
    return "Rejected. No confirmed money added.";
  }

  if (outcomeType === "not_worth_pursuing") {
    return "Not worth pursuing. No confirmed money added.";
  }

  if (outcomeType === "resolved_no_money") {
    return "Resolved without money saved or recovered.";
  }

  return "Outcome recorded by the user.";
};

const getOutcomePlaceholder = (adminCase: AdminCase) => {
  const opportunity = deriveOpportunityCard(adminCase);

  if (opportunity.opportunityType === "travel_extra_cost_recovery") {
    return "Example: Still waiting for Air Mauritius to review the extra hotel night reimbursement request.";
  }

  if (
    opportunity.opportunityType === "subscription_recurring_charge" ||
    opportunity.opportunityType === "subscription_renewal" ||
    adminCase.category === "subscription"
  ) {
    return "Example: Subscription cancelled before the next billing date.";
  }

  if (opportunity.opportunityType === "suspicious_email_risk") {
    return "Example: Verified through official website/app. Did not click links in the email.";
  }

  if (
    opportunity.opportunityType === "no_action_needed" ||
    opportunity.opportunityType === "delivery_update" ||
    opportunity.opportunityType === "receipt_guardian"
  ) {
    return "Example: Checked and saved for records only.";
  }

  if (
    opportunity.opportunityType === "refund_expected" ||
    opportunity.opportunityType === "money_back" ||
    adminCase.category === "refund"
  ) {
    return "Example: Refund received from retailer for GBP 42.99.";
  }

  return "Example: Outcome recorded after checking the case.";
};

const getOutcomeFeedback = (
  outcomeType: OutcomeConfirmationType,
  guidedCaseMode: GuidedCaseMode,
  adminCase: AdminCase,
  amount?: number,
  currency: "GBP" | "unknown" = "unknown",
  frequency: MoneyImpactFrequency = "one_off",
) => {
  if (guidedCaseMode === "saving_or_review") {
    const subscription = isSubscriptionReview(adminCase);

    if (outcomeType === "reduced_bill") {
      const amountText =
        amount !== undefined ? ` by ${formatMoneyImpact(amount, currency, frequency)}` : "";
      return subscription
        ? `Subscription change recorded. Confirmed saving updated${amountText}.`
        : `Reduced cost recorded. Confirmed saving updated${amountText}.`;
    }

    if (outcomeType === "still_waiting") {
      return subscription
        ? "Still reviewing recorded. No money has been marked as saved."
        : "Still checking recorded. No money has been marked as saved.";
    }

    if (outcomeType === "resolved_no_money") {
      return subscription
        ? "Keeping it recorded. No confirmed money added."
        : "No better option recorded. No confirmed money added.";
    }

    if (outcomeType === "not_worth_pursuing") {
      return "Not worth changing recorded. No confirmed money added.";
    }
  }

  if (guidedCaseMode === "safety") {
    if (outcomeType === "still_waiting") {
      return "Still checking recorded. No money has been counted.";
    }

    if (outcomeType === "resolved_no_money") {
      return "Official-route check recorded. No money has been counted.";
    }

    if (outcomeType === "rejected_unsuccessful") {
      return "Reported or ignored recorded. No money has been counted.";
    }

    return "Safety decision recorded. No money has been counted.";
  }

  if (guidedCaseMode === "record") {
    if (outcomeType === "still_waiting") {
      return "Still checking recorded. No money has been counted.";
    }

    if (outcomeType === "resolved_no_money") {
      return "Saved for records. No money has been counted.";
    }

    return "Record decision saved. No money has been counted.";
  }

  if (outcomeType === "still_waiting") {
    return "Still waiting recorded. No money has been marked as recovered.";
  }

  if (outcomeType === "got_money_back") {
    const amountText =
      amount !== undefined ? ` by ${formatMoneyImpact(amount, currency, frequency)}` : "";
    return `Money received recorded. Confirmed recovered updated${amountText}.`;
  }

  if (outcomeType === "rejected_unsuccessful") {
    return "Rejected outcome recorded. No confirmed money added.";
  }

  if (outcomeType === "not_worth_pursuing") {
    return "Case marked not worth pursuing. No confirmed money added.";
  }

  if (outcomeType === "resolved_no_money") {
    return "Outcome recorded. No confirmed money added.";
  }

  return "Outcome recorded. AdminAvenger updated the case.";
};

export function OutcomeConfirmation({
  adminCase,
  impactEntries,
  mode = "standard",
  guidedCaseMode = "recovery",
  onConfirmOutcome,
}: OutcomeConfirmationProps) {
  const [outcomeType, setOutcomeType] = useState<OutcomeConfirmationType>("still_waiting");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<MoneyImpactFrequency>("one_off");
  const [note, setNote] = useState("");
  const [confirmedAt, setConfirmedAt] = useState(today());
  const [proofText, setProofText] = useState("");
  const [proofImageName, setProofImageName] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  useEffect(() => {
    setOutcomeType("still_waiting");
    setAmount("");
    setFrequency("one_off");
    setNote("");
    setConfirmedAt(today());
    setProofText("");
    setProofImageName("");
    setConfirmationMessage("");
  }, [adminCase.id]);

  const setOutcome = (nextOutcomeType: OutcomeConfirmationType, nextNote?: string) => {
    setOutcomeType(nextOutcomeType);

    if (nextNote !== undefined) {
      setNote(nextNote);
    }

    if (!moneyOutcomeTypes.has(nextOutcomeType)) {
      setAmount("");
      return;
    }

    setAmount("");
  };

  const handleProofImage = (file?: File) => {
    if (!file) {
      setProofImageName("");
      return;
    }

    setProofImageName(file.name);
  };

  const handleSubmit = () => {
    const outcomeAllowsMoney = moneyOutcomeTypes.has(outcomeType);
    const parsedAmount = outcomeAllowsMoney && amount.trim() ? Number(amount) : undefined;
    const requiresExplicitGuidedAmount = mode === "guided" && outcomeAllowsMoney;

    if (requiresExplicitGuidedAmount && !Number.isFinite(parsedAmount)) {
      setConfirmationMessage(
        guidedCaseMode === "saving_or_review"
          ? "Enter the amount you actually saved first. No money has been marked as saved."
          : "Enter the amount you can confirm first. No money has been marked as recovered.",
      );
      return;
    }

    onConfirmOutcome(adminCase.id, {
      outcomeType,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
      currency: parsedAmount === undefined ? "unknown" : "GBP",
      frequency,
      note: note.trim() || proofText.trim() || getOutcomeFallbackNote(outcomeType, guidedCaseMode, adminCase),
      proofImageName: proofImageName || undefined,
      proofImageDataUrl: undefined,
      proofText: proofText.trim() || undefined,
      confirmedAt,
    });
    setConfirmationMessage(
      getOutcomeFeedback(
        outcomeType,
        guidedCaseMode,
        adminCase,
        Number.isFinite(parsedAmount) ? parsedAmount : undefined,
        parsedAmount === undefined ? "unknown" : "GBP",
        frequency,
      ),
    );
  };

  const isGuided = mode === "guided";
  const outcomeNudges = isGuided
    ? getGuidedOutcomeNudges(adminCase, guidedCaseMode)
    : getOutcomeNudges(adminCase, impactEntries);
  const visibleOutcomeOptions = isGuided
    ? outcomeNudges.map((nudge) => ({
        value: nudge.outcomeType,
        label: nudge.label,
      }))
    : outcomeOptions;
  const showMoneyFields = !isGuided || moneyOutcomeTypes.has(outcomeType);
  const guidedIntro =
    guidedCaseMode === "saving_or_review"
      ? "Only mark a saving once you have actually reduced the cost, cancelled, or changed plan."
      : guidedCaseMode === "safety"
        ? "Record what you decided after checking safely. No money is counted here."
        : guidedCaseMode === "record"
          ? "Record what you decided. No money is counted for this item."
          : "Only mark money as received once you can see it. Possible recovery is not assured.";

  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          {isGuided ? "Choose the result" : "Update outcome"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {isGuided
            ? guidedIntro
            : "Confirmed savings are created only when you enter the outcome. AI does not confirm money saved or recovered."}
        </p>
      </div>

      {!isGuided && impactEntries.length > 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Current impact records
          </p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
            {impactEntries.map((entry) => (
              <li key={entry.id}>
                {entry.evidenceNote} {entry.amount !== undefined ? `(${formatMoneyImpact(entry.amount, entry.currency, entry.frequency)})` : ""}
                {entry.proofAttached ? " - proof attached" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/55 p-3">
        <p className="text-sm font-semibold text-slate-200">What happened?</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Choose the closest outcome. You can edit the note{showMoneyFields ? " and amount" : ""} before confirming.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {outcomeNudges.map((nudge) => (
            <button
              key={nudge.label}
              type="button"
              onClick={() => {
                setOutcome(nudge.outcomeType, nudge.note);
              }}
              className="min-h-11 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
            >
              {nudge.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-200">
          Outcome
          <select
            value={outcomeType}
            onChange={(event) => setOutcome(event.target.value as OutcomeConfirmationType)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          >
            {visibleOutcomeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-200">
          Date
          <input
            type="date"
            value={confirmedAt}
            onChange={(event) => setConfirmedAt(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </label>

        {showMoneyFields ? (
          <>
            <label className="text-sm font-semibold text-slate-200">
              Amount
              <input
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                }}
                placeholder={
                  getDefaultAmount(impactEntries) !== undefined
                    ? `e.g. ${formatAmountInput(getDefaultAmount(impactEntries))}`
                    : "Optional amount"
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-200">
              Frequency
              <select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as MoneyImpactFrequency)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                <option value="one_off">One-off</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
          </>
        ) : null}
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-200">
        Outcome note
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={getOutcomePlaceholder(adminCase)}
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
        />
      </label>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <p className="text-sm font-semibold text-slate-200">Proof evidence</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Photo proof is not fully stored in this prototype. Keep the original file somewhere safe.
          AdminAvenger stores the filename only and does not send it anywhere.
        </p>

        <label className="mt-3 block text-sm font-semibold text-slate-200">
          Proof screenshot/photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => handleProofImage(event.target.files?.[0])}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-950"
          />
        </label>

        {proofImageName ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
            <p className="text-sm text-slate-300">
              Proof image selected: {proofImageName}. AdminAvenger stores the filename only in this
              browser prototype, not the full image.
            </p>
            <button
              type="button"
              onClick={() => {
                setProofImageName("");
              }}
              className="mt-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200"
            >
              Remove proof image
            </button>
          </div>
        ) : null}

        <label className="mt-3 block text-sm font-semibold text-slate-200">
          Proof text
          <textarea
            rows={3}
            value={proofText}
            onChange={(event) => setProofText(event.target.value)}
            placeholder="Paste confirmation wording if useful."
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        Confirm outcome
      </button>

      {confirmationMessage ? (
        <p className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/12 px-4 py-3 text-sm font-semibold leading-6 text-emerald-50">
          {confirmationMessage}
        </p>
      ) : null}
    </section>
  );
}
