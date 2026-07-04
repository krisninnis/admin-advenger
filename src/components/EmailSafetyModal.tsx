import type { EmailSafetyAssessment } from "../types";

type EmailSafetyModalProps = {
  assessment: EmailSafetyAssessment;
  onClose: () => void;
  onSaveCase?: () => void;
};

const levelStyles: Record<EmailSafetyAssessment["overallLevel"], string> = {
  lower_risk: "border-emerald-300/30 bg-emerald-300/10 text-emerald-50",
  caution: "border-amber-300/30 bg-amber-300/10 text-amber-50",
  high_risk: "border-rose-300/30 bg-rose-300/10 text-rose-50",
};

function SignalList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
        {(items.length > 0 ? items : ["None found."]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function EmailSafetyModal({
  assessment,
  onClose,
  onSaveCase,
}: EmailSafetyModalProps) {
  const donutStyle = {
    background: `conic-gradient(#10b981 0 ${assessment.safePercent}%, #f59e0b ${assessment.safePercent}% ${
      assessment.safePercent + assessment.cautionPercent
    }%, #fb7185 ${assessment.safePercent + assessment.cautionPercent}% 100%)`,
  };
  const meaningfulRisk = assessment.overallLevel !== "lower_risk";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-safety-title"
    >
      <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/50 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
              Optional check
            </p>
            <h2 id="email-safety-title" className="mt-2 text-2xl font-bold text-white">
              Email safety check
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            aria-label="Close email safety check"
          >
            Close
          </button>
        </div>

        <div className={`mt-5 rounded-lg border p-4 ${levelStyles[assessment.overallLevel]}`}>
          <p className="text-sm font-bold uppercase tracking-wider">Overall result</p>
          <p className="mt-2 text-xl font-bold">{assessment.overallLabel}</p>
          <p className="mt-2 text-sm leading-6 opacity-90">{assessment.disclaimer}</p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full" style={donutStyle}>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 text-center text-xs font-bold leading-5 text-white">
                Signal<br />mix
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              <p>Normal signals: {assessment.safePercent}%</p>
              <p>Caution signals: {assessment.cautionPercent}%</p>
              <p>Threat signals: {assessment.threatPercent}%</p>
            </div>
          </div>

          <div className="grid gap-3">
            <SignalList
              title="Risk signals found"
              items={[...assessment.riskSignals, ...assessment.cautionSignals]}
            />
            <SignalList title="Normal or lower-risk signals found" items={assessment.safeSignals} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-100">
            What to do next
          </h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">{assessment.nextAction}</p>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {meaningfulRisk && onSaveCase ? (
            <button
              type="button"
              onClick={onSaveCase}
              className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-50 transition hover:border-amber-200 hover:bg-amber-300/15 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            >
              Save safety record
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
