import { useMemo, useState } from "react";
import { FindingsList } from "../components/FindingsList";
import { StatusBadge } from "../components/StatusBadge";
import { formatMoneyImpact } from "../lib/impactLedger";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import type { AdminCase, AdminFinding, AdminCaseStatus, FindingCategory, ImpactEntry } from "../types";

type CasesViewProps = {
  findings: AdminFinding[];
  cases: AdminCase[];
  selectedFindingId?: string;
  selectedCaseId?: string;
  impactEntries: ImpactEntry[];
  onOpenFinding: (findingId: string) => void;
  onOpenCase: (caseId: string) => void;
};

const statusOptions: Array<{ value: "all" | AdminCaseStatus; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "ready_to_act", label: "Ready to act" },
  { value: "drafted", label: "Drafted" },
  { value: "sent_manually", label: "Sent manually" },
  { value: "waiting", label: "Waiting" },
  { value: "chasing", label: "Chasing" },
  { value: "resolved", label: "Resolved" },
  { value: "no_action_needed", label: "No action needed" },
  { value: "evidence_saved", label: "Evidence saved" },
  { value: "ignored", label: "Ignored" },
];

type CaseQuickFilter =
  | "all"
  | "pending"
  | "chase_due"
  | "potential_saving"
  | "pending_recovery"
  | "confirmed_saved"
  | "no_action"
  | "resolved";

const quickFilters: Array<{ value: CaseQuickFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "chase_due", label: "Chase due" },
  { value: "potential_saving", label: "Potential saving" },
  { value: "pending_recovery", label: "Pending recovery" },
  { value: "confirmed_saved", label: "Confirmed saved" },
  { value: "no_action", label: "No action needed" },
  { value: "resolved", label: "Resolved" },
];

const categoryOptions: Array<{ value: "all" | FindingCategory; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "refund", label: "Refund" },
  { value: "complaint", label: "Complaint" },
  { value: "subscription", label: "Subscription" },
  { value: "deadline", label: "Deadline" },
  { value: "job_application", label: "Job application" },
  { value: "bill_increase", label: "Bill increase" },
  { value: "warranty", label: "Warranty" },
  { value: "important_reply", label: "Important reply" },
  { value: "unknown", label: "Unknown" },
];

const formatCategory = (category: FindingCategory) => category.replaceAll("_", " ");

const hasImpact = (entries: ImpactEntry[], caseId: string, predicate: (entry: ImpactEntry) => boolean) =>
  entries.some((entry) => entry.caseId === caseId && predicate(entry));

const matchesQuickFilter = (
  adminCase: AdminCase,
  quickFilter: CaseQuickFilter,
  impactEntries: ImpactEntry[],
) => {
  const today = new Date().toISOString().slice(0, 10);

  if (quickFilter === "all") {
    return true;
  }

  if (quickFilter === "pending") {
    return ["new", "reviewing", "ready_to_act", "drafted", "sent_manually", "waiting", "chasing"].includes(
      adminCase.status,
    );
  }

  if (quickFilter === "chase_due") {
    const chaseDate = adminCase.chaseDate;

    if (!chaseDate) {
      return false;
    }

    return chaseDate <= today && ["waiting", "chasing", "sent_manually"].includes(adminCase.status);
  }

  if (quickFilter === "potential_saving") {
    return hasImpact(
      impactEntries,
      adminCase.id,
      (entry) => entry.type === "potential_saving" && entry.status === "potential",
    );
  }

  if (quickFilter === "pending_recovery") {
    return hasImpact(
      impactEntries,
      adminCase.id,
      (entry) => entry.type === "pending_recovery" && entry.status === "pending",
    );
  }

  if (quickFilter === "confirmed_saved") {
    return hasImpact(impactEntries, adminCase.id, (entry) => entry.status === "confirmed");
  }

  if (quickFilter === "no_action") {
    return (
      adminCase.status === "no_action_needed" ||
      adminCase.status === "evidence_saved" ||
      hasImpact(impactEntries, adminCase.id, (entry) => entry.type === "no_saving")
    );
  }

  return adminCase.status === "resolved";
};

export function CasesView({
  findings,
  cases,
  selectedFindingId,
  selectedCaseId,
  impactEntries,
  onOpenFinding,
  onOpenCase,
}: CasesViewProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | AdminCaseStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | FindingCategory>("all");
  const [quickFilter, setQuickFilter] = useState<CaseQuickFilter>("all");

  const filteredCases = useMemo(
    () =>
      cases.filter((adminCase) => {
        const matchesStatus = statusFilter === "all" || adminCase.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || adminCase.category === categoryFilter;
        const matchesQuick = matchesQuickFilter(adminCase, quickFilter, impactEntries);
        return matchesStatus && matchesCategory && matchesQuick;
      }),
    [cases, categoryFilter, impactEntries, quickFilter, statusFilter],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Cases</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Discovery list and case queue
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-400">
          Possible actions stay visible as the discovery layer. Cases are the workbench for
          evidence, drafts, chase dates, and outcomes.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <FindingsList
          findings={findings}
          selectedFindingId={selectedFindingId}
          onSelectFinding={onOpenFinding}
        />

        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-slate-950/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Case queue</h3>
              <p className="mt-1 text-sm text-slate-400">
                Filter cases by progress, money impact, chase date, or category.
              </p>
            </div>
            <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
              {filteredCases.length} shown
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickFilters.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setQuickFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  quickFilter === option.value
                    ? "border-emerald-300/60 bg-emerald-300/12 text-white"
                    : "border-white/10 bg-slate-950 text-slate-300 hover:border-white/20"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-300">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | AdminCaseStatus)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-300">
              Category
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as "all" | FindingCategory)
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredCases.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {filteredCases.map((adminCase) => {
                const isSelected = adminCase.id === selectedCaseId;

                return (
                  <article
                    key={adminCase.id}
                    className={`rounded-lg border p-5 transition ${
                      isSelected
                        ? "border-emerald-300/70 bg-emerald-300/10"
                        : "border-white/10 bg-slate-900/75"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {formatCategory(adminCase.category)}
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-white">{adminCase.title}</h4>
                      </div>
                      <StatusBadge status={adminCase.status} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{adminCase.summary}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(() => {
                        const opportunity = deriveOpportunityCard(adminCase);
                        const caseImpact = impactEntries.filter((entry) => entry.caseId === adminCase.id);
                        const primaryImpact = caseImpact[0];

                        return (
                          <>
                            <span className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-bold capitalize text-cyan-100">
                              {opportunity.opportunityType.replaceAll("_", " ")}
                            </span>
                            <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100">
                              {primaryImpact?.amount !== undefined
                                ? formatMoneyImpact(primaryImpact.amount, primaryImpact.currency, primaryImpact.frequency)
                                : primaryImpact?.status ?? "No money impact"}
                            </span>
                            {opportunity.deadline ? (
                              <span className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100">
                                {opportunity.deadlineLabel ?? "Deadline"}: {opportunity.deadline}
                              </span>
                            ) : null}
                            {caseImpact.some((entry) => entry.proofAttached) ? (
                              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-200">
                                Proof attached
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge urgency={adminCase.urgency} label={`${adminCase.urgency} urgency`} />
                      <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {adminCase.confidence} confidence
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCase(adminCase.id)}
                      className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/25 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
                    >
                      Open case file
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-5 text-sm leading-6 text-slate-400">
              No cases match those filters. Change the filters or paste something new.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
