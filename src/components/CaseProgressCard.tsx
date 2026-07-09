import type { CaseProgressItem, CaseProgressItemStatus, CaseProgressSummary } from "../lib/caseProgress";
import { CASE_PROGRESS_CONTROL_NOTE, CASE_PROGRESS_EXPLANATION, CASE_PROGRESS_HEADING } from "../lib/caseProgress";

// Case Progress Tracker v1 - UI
//
// This card shows preparation completeness only. It is not a win chance, a
// success score, a case-strength score, or an entitlement score. Keep the
// tone calm, and never rely on colour alone to communicate status - every
// status also has a plain-text label.

type CaseProgressCardProps = {
  summary: CaseProgressSummary;
};

const STATUS_LABEL: Record<CaseProgressItemStatus, string> = {
  complete: "Complete",
  partial: "In progress",
  missing: "Not started",
  not_needed: "Not needed",
};

const STATUS_BADGE_CLASSES: Record<CaseProgressItemStatus, string> = {
  complete: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  partial: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  missing: "border-white/15 bg-slate-950/60 text-slate-300",
  not_needed: "border-white/10 bg-white/5 text-slate-400",
};

function ChecklistItem({ item }: { item: CaseProgressItem }) {
  return (
    <li className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-semibold text-white">{item.label}</p>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASSES[item.status]}`}
        >
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
      {item.safetyNote ? (
        <p className="mt-1 text-xs leading-5 text-amber-100/90">{item.safetyNote}</p>
      ) : null}
    </li>
  );
}

export function CaseProgressCard({ summary }: CaseProgressCardProps) {
  const progressValueText = `${summary.percentComplete}% complete. ${summary.label}.`;

  return (
    <section
      aria-label={CASE_PROGRESS_HEADING}
      className="rounded-lg border border-white/10 bg-slate-950/55 p-4 sm:p-5"
    >
      <h3 className="text-base font-bold text-white">{CASE_PROGRESS_HEADING}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{CASE_PROGRESS_EXPLANATION}</p>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-100">{summary.label}</p>
        <div
          role="progressbar"
          aria-valuenow={summary.percentComplete}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={progressValueText}
          className="mt-2 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900"
        >
          <div
            className="h-full rounded-full bg-emerald-300/80"
            style={{ width: `${Math.min(100, Math.max(0, summary.percentComplete))}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{progressValueText}</p>
      </div>

      <ul className="mt-4 space-y-3">
        {summary.items.map((item) => (
          <ChecklistItem key={item.id} item={item} />
        ))}
      </ul>

      <p className="mt-4 text-xs leading-5 text-slate-500">{CASE_PROGRESS_CONTROL_NOTE}</p>
    </section>
  );
}
