import type { EmailSafetyAssessment } from "../types";
import {
  getEmailSafetyOrdinarySignals,
  getEmailSafetyRiskBand,
  getEmailSafetyRiskBandExplanation,
  getEmailSafetyRiskBandLabel,
} from "../lib/suspiciousEmail";

type EmailSafetyModalProps = {
  assessment: EmailSafetyAssessment;
  onClose: () => void;
  onSaveCase?: () => void;
};

const levelStyles: Record<ReturnType<typeof getEmailSafetyRiskBand>, string> = {
  lower_risk_verify: "border-emerald-300/30 bg-emerald-300/10 text-emerald-50",
  verify_before_acting: "border-amber-300/30 bg-amber-300/10 text-amber-50",
  high_risk_signals: "border-rose-300/30 bg-rose-300/10 text-rose-50",
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
  const riskBand = getEmailSafetyRiskBand(assessment);
  const meaningfulRisk = riskBand !== "lower_risk_verify";
  const ordinarySignals = getEmailSafetyOrdinarySignals(assessment);
  const cannotKnow = assessment.cannotKnow ?? [
    "AdminAvenger cannot confirm who sent the message.",
    "AdminAvenger cannot confirm whether links, payment details, or account warnings should be trusted.",
    "AdminAvenger cannot determine whether this is a scam.",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-safety-title"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6">
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
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            aria-label="Close email safety check"
          >
            Close
          </button>
        </div>

        <div className={`mt-5 rounded-lg border p-4 ${levelStyles[riskBand]}`}>
          <p className="text-sm font-bold uppercase tracking-wider">Overall result</p>
          <p className="mt-2 text-xl font-bold">{getEmailSafetyRiskBandLabel(assessment)}</p>
          <p className="mt-2 text-sm leading-6 opacity-90">
            {getEmailSafetyRiskBandExplanation(assessment)}
          </p>
          <p className="mt-2 text-sm leading-6 opacity-90">{assessment.disclaimer}</p>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              What this means
            </h3>
            <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              <p>
                AdminAvenger compares recognised warning signs with ordinary-looking details.
                It does not decide whether the message actually came from the organisation.
              </p>
              <p>
                Use contact details from an official website, trusted account, statement, or
                another independent source before acting.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            <SignalList
              title="Risk signals found"
              items={[...assessment.riskSignals, ...assessment.cautionSignals]}
            />
            <SignalList title="Ordinary or inconclusive details found" items={ordinarySignals} />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/60 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            What AdminAvenger cannot confirm
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {cannotKnow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-100">
            What to do next
          </h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">{assessment.nextAction}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap sm:justify-end">
          {meaningfulRisk && onSaveCase ? (
            <button
              type="button"
              onClick={onSaveCase}
              className="min-h-11 rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-50 transition hover:border-amber-200 hover:bg-amber-300/15 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            >
              Save safety record
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
