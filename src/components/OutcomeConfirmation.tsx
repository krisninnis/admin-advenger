import { useEffect, useState } from "react";
import type {
  AdminCase,
  ImpactEntry,
  MoneyImpactFrequency,
  OutcomeConfirmationType,
} from "../types";
import { formatMoneyImpact } from "../lib/impactLedger";

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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("file_read_failed"));
    });
    reader.addEventListener("error", () => reject(new Error("file_read_failed")));
    reader.readAsDataURL(file);
  });

export function OutcomeConfirmation({
  adminCase,
  impactEntries,
  onConfirmOutcome,
}: OutcomeConfirmationProps) {
  const [outcomeType, setOutcomeType] = useState<OutcomeConfirmationType>("still_waiting");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<MoneyImpactFrequency>("one_off");
  const [note, setNote] = useState("");
  const [confirmedAt, setConfirmedAt] = useState(today());
  const [proofText, setProofText] = useState("");
  const [proofImageName, setProofImageName] = useState("");
  const [proofImageDataUrl, setProofImageDataUrl] = useState("");

  useEffect(() => {
    setOutcomeType("still_waiting");
    setAmount("");
    setFrequency("one_off");
    setNote("");
    setConfirmedAt(today());
    setProofText("");
    setProofImageName("");
    setProofImageDataUrl("");
  }, [adminCase.id]);

  const handleProofImage = async (file?: File) => {
    if (!file) {
      setProofImageName("");
      setProofImageDataUrl("");
      return;
    }

    setProofImageName(file.name);
    setProofImageDataUrl(await readFileAsDataUrl(file));
  };

  const handleSubmit = () => {
    const parsedAmount = amount.trim() ? Number(amount) : undefined;

    onConfirmOutcome(adminCase.id, {
      outcomeType,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
      currency: parsedAmount === undefined ? "unknown" : "GBP",
      frequency,
      note: note.trim() || proofText.trim() || "Outcome confirmed by user.",
      proofImageName: proofImageName || undefined,
      proofImageDataUrl: proofImageDataUrl || undefined,
      proofText: proofText.trim() || undefined,
      confirmedAt,
    });
  };

  const outcomeNudges = getOutcomeNudges(adminCase, impactEntries);

  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-5">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          Update outcome
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Confirmed savings are created only when you enter the outcome. AI does not confirm money
          saved or recovered.
        </p>
      </div>

      {impactEntries.length > 0 ? (
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
          Choose the closest outcome. You can edit the note and amount before confirming.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {outcomeNudges.map((nudge) => (
            <button
              key={nudge.label}
              type="button"
              onClick={() => {
                setOutcomeType(nudge.outcomeType);
                setNote(nudge.note);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
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
            onChange={(event) => setOutcomeType(event.target.value as OutcomeConfirmationType)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          >
            {outcomeOptions.map((option) => (
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

        <label className="text-sm font-semibold text-slate-200">
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="42.99"
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
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-200">
        Outcome note
        <textarea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Example: Refund received from retailer for GBP 42.99."
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
        />
      </label>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <p className="text-sm font-semibold text-slate-200">Proof evidence</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Proof is stored locally in this browser in this prototype. It is not sent anywhere and AI
          does not confirm it.
        </p>

        <label className="mt-3 block text-sm font-semibold text-slate-200">
          Proof screenshot/photo
          <input
            type="file"
            accept="image/*"
            onChange={(event) => void handleProofImage(event.target.files?.[0])}
            className="mt-2 block w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-950"
          />
        </label>

        {proofImageDataUrl ? (
          <div className="mt-3">
            <img
              src={proofImageDataUrl}
              alt="Outcome proof preview"
              className="max-h-52 w-full rounded-lg border border-white/10 object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setProofImageName("");
                setProofImageDataUrl("");
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
    </section>
  );
}
