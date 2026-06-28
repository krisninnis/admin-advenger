import { useMemo, useState } from "react";
import {
  calculateImpactTotals,
  formatMoneyImpact,
} from "../lib/impactLedger";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import type { AdminCase, ImpactEntry, ImpactEntryStatus } from "../types";

type SavingsViewProps = {
  cases: AdminCase[];
  impactEntries: ImpactEntry[];
  onOpenCase: (caseId: string) => void;
};

type ImpactFilter = "all" | "potential" | "pending" | "confirmed" | "deadlines" | "rejected";

const filterOptions: Array<{ value: ImpactFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "potential", label: "Potential" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "deadlines", label: "Deadlines" },
  { value: "rejected", label: "No action / checked" },
];

const statusLabels: Record<ImpactEntryStatus, string> = {
  potential: "Potential",
  pending: "Pending",
  confirmed: "Confirmed",
  rejected: "Rejected",
  not_applicable: "Not applicable",
};

const matchesFilter = (entry: ImpactEntry, filter: ImpactFilter) => {
  if (filter === "all") {
    return entry.status !== "not_applicable";
  }

  if (filter === "deadlines") {
    return entry.type === "deadline_protected";
  }

  if (filter === "rejected") {
    return entry.status === "rejected" || entry.status === "not_applicable";
  }

  return entry.status === filter;
};

export function SavingsView({ cases, impactEntries, onOpenCase }: SavingsViewProps) {
  const [filter, setFilter] = useState<ImpactFilter>("all");
  const totals = useMemo(() => calculateImpactTotals(impactEntries, cases), [cases, impactEntries]);
  const filteredEntries = impactEntries.filter((entry) => matchesFilter(entry, filter));
  const caseById = useMemo(() => new Map(cases.map((adminCase) => [adminCase.id, adminCase])), [cases]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Savings
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Money and deadlines tracked by AdminAvenger
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Potential is what AdminAvenger spotted. Confirmed is what you told AdminAvenger you
          actually saved or recovered.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Confirmed saved/recovered", formatMoneyImpact(totals.confirmedSavedRecovered)],
          ["Pending recovery", formatMoneyImpact(totals.pendingRecovery)],
          ["Potential savings found", formatMoneyImpact(totals.potentialSaving)],
          ["Annual potential savings", formatMoneyImpact(totals.potentialAnnualSaving, "GBP", "annual")],
          ["Deadlines protected", String(totals.deadlinesProtected)],
          ["Resolved cases", String(totals.resolvedCases)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Impact history</h3>
            <p className="mt-1 text-sm text-slate-400">
              Case-level money and deadline records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                  filter === option.value
                    ? "border-emerald-300/60 bg-emerald-300/12 text-white"
                    : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {filteredEntries.map((entry) => {
              const adminCase = caseById.get(entry.caseId);
              const opportunity = adminCase ? deriveOpportunityCard(adminCase) : undefined;

              return (
                <article key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/65 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {statusLabels[entry.status]} / {opportunity?.opportunityType.replaceAll("_", " ") ?? entry.type.replaceAll("_", " ")}
                      </p>
                      <h4 className="mt-1 text-lg font-semibold text-white">{entry.title}</h4>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-200">
                      {entry.amount !== undefined
                        ? formatMoneyImpact(entry.amount, entry.currency, entry.frequency)
                        : entry.type.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{entry.evidenceNote}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {opportunity?.deadline ? (
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                        {opportunity.deadlineLabel ?? "Deadline"}: {opportunity.deadline}
                      </span>
                    ) : null}
                    {entry.proofAttached ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-xs font-bold text-emerald-100">
                        Proof attached
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                      Updated {new Date(entry.updatedAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCase(entry.caseId)}
                    className="mt-4 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    Open case
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-5 text-sm leading-6 text-slate-400">
            Upload or paste a bill, refund email, receipt, renewal notice, or complaint reply.
            AdminAvenger will start tracking money and deadlines here.
          </p>
        )}
      </section>
    </div>
  );
}
