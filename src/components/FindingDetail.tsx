import { describeConfidence } from "../lib/opportunityCards";
import type { AdminFinding, AdminItem, FindingStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

type FindingDetailProps = {
  finding?: AdminFinding;
  item?: AdminItem;
  onStatusChange: (findingId: string, status: FindingStatus) => void;
};

const statusOptions: Array<{ value: FindingStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "to_do", label: "To do" },
  { value: "drafted", label: "Drafted" },
  { value: "sent_manually", label: "Sent manually" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
  { value: "no_action_needed", label: "No action needed" },
  { value: "ignored", label: "Ignored" },
];

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

export function FindingDetail({ finding, item, onStatusChange }: FindingDetailProps) {
  if (!finding) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Finding detail</h2>
        <p className="mt-2 text-base leading-7 text-slate-400">
          Select a finding to see the evidence, recommended action, status controls, and original
          pasted text.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-xl shadow-slate-950/15">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {categoryLabels[finding.category]}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">{finding.title}</h2>
        </div>
        <StatusBadge status={finding.status} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadge urgency={finding.urgency} label={`${finding.urgency} urgency`} />
        <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
          {describeConfidence(finding.confidence)}
        </span>
        {finding.deadline ? (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
            Deadline {finding.deadline}
          </span>
        ) : null}
        {finding.estimatedValue ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            {finding.estimatedValue}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
          <p className="mt-2 text-base leading-7 text-slate-400">{finding.summary}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200">Why it matters</h3>
          <p className="mt-2 text-base leading-7 text-slate-400">{finding.whyItMatters}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-200">Suggested action</h3>
          <p className="mt-2 text-base leading-7 text-slate-400">{finding.suggestedAction}</p>
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="finding-status" className="text-sm font-semibold text-slate-200">
          Status controls
        </label>
        <select
          id="finding-status"
          value={finding.status}
          onChange={(event) =>
            onStatusChange(finding.id, event.target.value as FindingStatus)
          }
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
        >
          {statusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-slate-950/70 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Original pasted text</h3>
        <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-400">
          {item?.rawText ?? "No linked source item found."}
        </p>
      </div>
    </section>
  );
}
