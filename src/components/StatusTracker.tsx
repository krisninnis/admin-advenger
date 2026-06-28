import type { AdminCase, AdminCaseStatus } from "../types";

type StatusTrackerProps = {
  cases: AdminCase[];
};

const statuses: AdminCaseStatus[] = [
  "new",
  "reviewing",
  "ready_to_act",
  "drafted",
  "sent_manually",
  "waiting",
  "chasing",
  "resolved",
  "no_action_needed",
  "evidence_saved",
  "ignored",
];

const statusLabels: Record<AdminCaseStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  ready_to_act: "Ready",
  drafted: "Drafted",
  sent_manually: "Sent",
  waiting: "Waiting",
  chasing: "Chasing",
  resolved: "Resolved",
  no_action_needed: "No action",
  evidence_saved: "Evidence",
  ignored: "Ignored",
};

export function StatusTracker({ cases }: StatusTrackerProps) {
  const total = Math.max(cases.length, 1);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Case tracker</h2>
          <p className="mt-1 text-sm text-slate-400">Where each admin battle stands.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {statuses.map((status) => {
          const count = cases.filter((adminCase) => adminCase.status === status).length;
          const width = `${Math.max((count / total) * 100, count > 0 ? 8 : 0)}%`;

          return (
            <div key={status}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-300">{statusLabels[status]}</span>
                <span className="text-slate-500">{count}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-emerald-400" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
