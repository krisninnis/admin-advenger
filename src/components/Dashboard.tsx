import type { AdminCase, AdminFinding, FindingCategory } from "../types";
import { CategoryCard } from "./CategoryCard";
import { ChaseEnginePanel } from "./ChaseEnginePanel";
import { StatCard } from "./StatCard";
import { StatusTracker } from "./StatusTracker";

type DashboardProps = {
  findings: AdminFinding[];
  cases: AdminCase[];
};

const categories: Array<{
  category: FindingCategory;
  label: string;
  accent: string;
}> = [
  { category: "refund", label: "Refunds", accent: "bg-emerald-400" },
  { category: "complaint", label: "Complaints", accent: "bg-rose-400" },
  { category: "subscription", label: "Subscriptions", accent: "bg-cyan-400" },
  { category: "deadline", label: "Deadlines", accent: "bg-amber-400" },
  { category: "job_application", label: "Job applications", accent: "bg-indigo-400" },
  { category: "bill_increase", label: "Bills", accent: "bg-orange-400" },
  { category: "warranty", label: "Warranties", accent: "bg-lime-400" },
  { category: "important_reply", label: "Important replies", accent: "bg-fuchsia-400" },
];

const getEstimatedPounds = (value?: string) => {
  if (!value) {
    return 0;
  }

  const match = value.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export function Dashboard({ findings, cases }: DashboardProps) {
  const highUrgencyCount = cases.filter((adminCase) => adminCase.urgency === "high").length;
  const waitingCount = cases.filter((adminCase) => adminCase.status === "waiting").length;
  const resolvedCount = cases.filter((adminCase) => adminCase.status === "resolved").length;
  const potentialMoney = cases.reduce(
    (total, adminCase) => total + getEstimatedPounds(adminCase.valueLabel),
    0,
  );

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Open cases" value={cases.length} helper={`${findings.length} findings found`} />
        <StatCard label="High urgency cases" value={highUrgencyCount} helper="Needs attention soon" />
        <StatCard
          label="Potential case value"
          value={`£${potentialMoney.toFixed(0)}`}
          helper="Rough mock estimate"
        />
        <StatCard label="Waiting cases" value={waitingCount} helper="Already chased" />
        <StatCard label="Resolved cases" value={resolvedCount} helper="Closed wins" />
      </div>

      <ChaseEnginePanel cases={cases} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Category summary</h2>
              <p className="mt-1 text-sm text-slate-400">
                AdminAvenger groups live cases by the kind of admin battle.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard
                key={category.category}
                category={category.category}
                label={category.label}
                accent={category.accent}
                count={
                  cases.filter((adminCase) => adminCase.category === category.category).length
                }
              />
            ))}
          </div>
        </section>

        <StatusTracker cases={cases} />
      </div>
    </section>
  );
}
