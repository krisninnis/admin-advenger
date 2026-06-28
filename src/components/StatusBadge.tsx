import type { AdminCaseStatus, FindingStatus, FindingUrgency } from "../types";

type StatusBadgeProps = {
  status?: FindingStatus | AdminCaseStatus;
  urgency?: FindingUrgency;
  label?: string;
};

const statusStyles: Record<FindingStatus | AdminCaseStatus, string> = {
  new: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  to_do: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  reviewing: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  ready_to_act: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  drafted: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  sent_manually: "border-indigo-400/30 bg-indigo-400/10 text-indigo-200",
  waiting: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  chasing: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  resolved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  ignored: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  no_action_needed: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  evidence_saved: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
};

const urgencyStyles: Record<FindingUrgency, string> = {
  low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  high: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

const readable = (value: string) => value.replaceAll("_", " ");

export function StatusBadge({ status, urgency, label }: StatusBadgeProps) {
  const style = status ? statusStyles[status] : urgency ? urgencyStyles[urgency] : "";
  const text = label ?? (status ? readable(status) : urgency ? readable(urgency) : "");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${style}`}
    >
      {text}
    </span>
  );
}
