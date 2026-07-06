import { describeConfidence } from "../lib/opportunityCards";
import type { AdminFinding } from "../types";
import { StatusBadge } from "./StatusBadge";

type FindingsListProps = {
  findings: AdminFinding[];
  selectedFindingId?: string;
  onSelectFinding: (findingId: string) => void;
};

const categoryLabels: Record<AdminFinding["category"], string> = {
  refund: "Refund",
  complaint: "Complaint",
  subscription: "Subscription",
  deadline: "Deadline",
  job_application: "Job application",
  bill_increase: "Bill increase",
  warranty: "Warranty",
  important_reply: "Important reply",
  admin_dispute: "Admin/rights check",
  unknown: "Unknown",
};

export function FindingsList({
  findings,
  selectedFindingId,
  onSelectFinding,
}: FindingsListProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-xl shadow-slate-950/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">What AdminAvenger found</h2>
          <p className="mt-1 text-sm text-slate-400">Possible actions worth your attention.</p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
          {findings.length}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-1">
        {findings.map((finding) => {
          const isSelected = finding.id === selectedFindingId;

          return (
            <article
              key={finding.id}
              className={`rounded-lg border p-5 shadow-sm transition ${
                isSelected
                  ? "border-emerald-300/70 bg-emerald-300/10 shadow-emerald-950/20"
                  : "border-white/10 bg-slate-900/75"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {categoryLabels[finding.category]}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{finding.title}</h3>
                </div>
                <StatusBadge status={finding.status} />
              </div>

              <p className="mt-3 text-base leading-7 text-slate-300">{finding.summary}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge urgency={finding.urgency} label={`${finding.urgency} urgency`} />
                <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {describeConfidence(finding.confidence)}
                </span>
                {finding.estimatedValue ? (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                    {finding.estimatedValue}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => onSelectFinding(finding.id)}
                className={`mt-5 w-full rounded-lg px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                  isSelected
                    ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 hover:bg-emerald-300"
                    : "border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300 hover:bg-emerald-400/15"
                }`}
              >
                View details
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
