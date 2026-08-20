import { useEffect, useRef, useState } from "react";
import type {
  CareFeeSafeComparisonAction,
  CareFeeSafeComparisonResultViewModel,
  CareFeeSafeComparisonSourceView,
} from "../lib/careFeeSafeComparison";

type CareFeeSafeComparisonResultPanelProps = {
  readonly model: CareFeeSafeComparisonResultViewModel;
  readonly onChangeRecords: () => void;
  readonly onBackToDocuments: () => void;
  readonly onStartOver: () => void;
};

const actionIsAllowed = (
  actions: readonly CareFeeSafeComparisonAction[],
  action: CareFeeSafeComparisonAction,
): boolean => actions.includes(action);

function SourcePassage({
  record,
  index,
}: {
  readonly record: CareFeeSafeComparisonSourceView;
  readonly index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const passageId = `care-fee-result-source-passage-${index + 1}`;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <button
        type="button"
        aria-controls={passageId}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-left text-sm font-bold text-cyan-100 transition hover:border-cyan-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        {expanded ? "Hide" : "Show"} source passage for {record.recordLabel}
      </button>
      {expanded ? (
        <blockquote
          id={passageId}
          className="mt-3 break-words rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm leading-6 text-slate-200"
        >
          {record.sourceQuote}
        </blockquote>
      ) : null}
    </div>
  );
}

function SourceRecordCard({
  record,
  index,
}: {
  readonly record: CareFeeSafeComparisonSourceView;
  readonly index: number;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-white/15 bg-slate-950/55 p-4">
      <h4 className="text-lg font-bold text-white">{record.recordLabel}</h4>
      <p className="mt-1 break-words font-semibold text-slate-200">{record.documentName}</p>
      <p className="mt-1 text-xs font-semibold text-emerald-200">
        {record.reviewStateText} · {record.sourceLocationText}
      </p>
      <dl className="mt-4 grid min-w-0 gap-2 text-sm">
        {[
          ["Amount", record.amountText],
          ["Cadence", record.cadenceText],
          ["Source applicability", record.sourceApplicabilityText],
        ].map(([term, detail]) => (
          <div key={term} className="min-w-0 rounded-md bg-slate-900/70 px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{term}</dt>
            <dd className="mt-1 break-words text-slate-200">{detail}</dd>
          </div>
        ))}
      </dl>
      <SourcePassage record={record} index={index} />
    </article>
  );
}

export function CareFeeSafeComparisonResultPanel({
  model,
  onChangeRecords,
  onBackToDocuments,
  onStartOver,
}: CareFeeSafeComparisonResultPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [model]);

  return (
    <section
      aria-labelledby="care-fee-safe-result-heading"
      className="min-w-0 rounded-lg border border-emerald-300/25 bg-slate-900/90 p-4 shadow-xl shadow-slate-950/20 sm:p-6"
    >
      <div role="status" aria-live="polite" aria-atomic="true">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Explanation only
        </p>
        <h2
          id="care-fee-safe-result-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 break-words text-2xl font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          {model.heading}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">{model.summary}</p>
      </div>

      <section aria-labelledby="care-fee-result-source-heading" className="mt-6 min-w-0">
        <h3 id="care-fee-result-source-heading" className="text-xl font-bold text-white">
          From your records
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          These details come from the original selected source passages.
        </p>
        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          {model.records.map((record, index) => (
            <SourceRecordCard key={record.recordLabel} record={record} index={index} />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="care-fee-result-confirmed-heading"
        className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4"
      >
        <h3 id="care-fee-result-confirmed-heading" className="text-xl font-bold text-cyan-50">
          You confirmed
        </h3>
        {model.confirmedContext.length > 0 ? (
          <dl className="mt-3 space-y-3 text-sm leading-6">
            {model.confirmedContext.map((context, index) => (
              <div key={`${context.label}-${index}`}>
                <dt className="font-bold text-cyan-100">{context.label}</dt>
                <dd className="text-cyan-50/90">{context.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">
            No separate user-confirmed context was used for this comparison.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-cyan-100/75">
          These session-only confirmations are separate from the source records.
        </p>
      </section>

      <section
        aria-labelledby="care-fee-result-comparison-heading"
        className="mt-6 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-4"
      >
        <h3 id="care-fee-result-comparison-heading" className="text-xl font-bold text-emerald-50">
          AdminAvenger comparison
        </h3>
        <p className="mt-2 text-sm leading-6 text-emerald-50/90">
          {model.comparison.stateText}
        </p>
        {model.comparison.differenceText ? (
          <dl className="mt-3 rounded-lg bg-slate-950/45 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">
              Absolute difference
            </dt>
            <dd className="mt-1 break-words text-lg font-bold text-white">
              {model.comparison.differenceText}
            </dd>
          </dl>
        ) : null}
        {model.comparison.applicabilityText ? (
          <dl className="mt-3 rounded-lg bg-slate-950/45 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">
              Applicability
            </dt>
            <dd className="mt-1 break-words text-sm text-white">
              {model.comparison.applicabilityText}
            </dd>
          </dl>
        ) : null}
      </section>

      <section
        aria-labelledby="care-fee-result-next-heading"
        className="mt-6 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] p-4"
      >
        <h3 id="care-fee-result-next-heading" className="text-xl font-bold text-amber-50">
          What to check next
        </h3>
        {model.blockingReasons.length > 0 ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-50/90">
            {model.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        ) : null}
        <p className="mt-3 text-sm leading-6 text-amber-50/90">
          {model.safetyBoundary}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {actionIsAllowed(model.allowedActions, "change_records") ? (
            <button
              type="button"
              onClick={onChangeRecords}
              className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Change records
            </button>
          ) : null}
          {actionIsAllowed(model.allowedActions, "back_to_documents") ? (
            <button
              type="button"
              onClick={onBackToDocuments}
              className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Back to documents
            </button>
          ) : null}
          {actionIsAllowed(model.allowedActions, "start_over") ? (
            <button
              type="button"
              onClick={onStartOver}
              className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 sm:col-span-2"
            >
              Start over
            </button>
          ) : null}
        </div>
      </section>
    </section>
  );
}
