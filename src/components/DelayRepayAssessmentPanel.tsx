import type { DelayRepayAssessment } from "../types";

type DelayRepayAssessmentPanelProps = {
  assessment: DelayRepayAssessment;
};

function AssessmentList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "found" | "missing" | "unknown";
}) {
  const toneStyles = {
    found: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    missing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    unknown: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  };

  return (
    <div className={`rounded-lg border p-3 ${toneStyles[tone]}`}>
      <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm leading-6">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6">{emptyText}</p>
      )}
    </div>
  );
}

export function DelayRepayAssessmentPanel({ assessment }: DelayRepayAssessmentPanelProps) {
  const foundEvidence = assessment.evidenceFound.map(
    (evidence) => `${evidence.label}: ${evidence.value}`,
  );

  return (
    <section className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.07] p-5 shadow-lg shadow-emerald-950/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Special workflow
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
            Refund Avenger: Train Delay Check
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            A train-specific check for UK Delay Repay style claims. It prepares the evidence and
            next step; you still decide whether to claim.
          </p>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-bold text-emerald-100">
          {assessment.confidenceScore}% confidence
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
        <p className="text-sm font-semibold text-slate-200">
          What this confidence score means
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {assessment.confidenceExplanation}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3 2xl:grid-cols-1">
        <AssessmentList
          title="Evidence found"
          items={foundEvidence}
          emptyText="No train delay evidence was extracted."
          tone="found"
        />
        <AssessmentList
          title="Evidence missing"
          items={assessment.evidenceMissing}
          emptyText="No required evidence gaps were detected, but the operator policy still needs checking."
          tone="missing"
        />
        <AssessmentList
          title="Unknown information"
          items={assessment.unknownInformation}
          emptyText="No unknowns recorded."
          tone="unknown"
        />
      </div>

      <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
        <p className="text-sm font-semibold text-amber-100">Operator rule caveat</p>
        <p className="mt-2 text-sm leading-6 text-amber-100/80">{assessment.ruleCaveat}</p>
      </div>
    </section>
  );
}
