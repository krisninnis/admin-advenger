import { useEffect, useRef, useState } from "react";
import {
  formatCareFeeApplicability,
  formatCareFeeMinorAmount,
  type CareFeeCaseDeleteResult,
  type CareFeeCaseSourceSnapshot,
  type CareFeeComparisonCaseV1,
} from "../lib/careFeeCase";
import type { UserConfirmedCareFeeContext } from "../lib/careFeeClaimConfirmation";
import { CareFeeDraftPreparationPanel } from "./CareFeeDraftPreparationPanel";

type CareFeeComparisonCaseViewProps = {
  readonly caseRecord: CareFeeComparisonCaseV1;
  readonly notice?: string;
  readonly onDelete: (caseId: string) => Promise<CareFeeCaseDeleteResult>;
  readonly onBackToCases: () => void;
  readonly onReturnToCareFee: () => void;
};

const cadenceLabels: Readonly<Record<string, string>> = {
  weekly: "Weekly",
  four_weekly: "Every four weeks",
  monthly: "Monthly",
  invoice_period_total: "Invoice-period total",
  one_off: "One-off",
  unknown: "Not stated",
};

const roleLabels: Readonly<Record<string, string>> = {
  resident: "Resident",
  local_authority: "Local authority",
  nhs: "NHS",
  third_party: "Third party",
  care_provider: "Care provider",
  unknown: "Not stated",
};

const sourceLocation = (record: CareFeeCaseSourceSnapshot): string => {
  if (record.sourceLocation.pageNumber !== undefined) {
    return `Page ${record.sourceLocation.pageNumber}`;
  }
  if (record.sourceLocation.photoNumber !== undefined) {
    return `Photo ${record.sourceLocation.photoNumber}`;
  }
  return record.sourceLocation.sourceSegmentId ? "Document section" : "Document passage";
};

const describeContext = (
  context: UserConfirmedCareFeeContext,
  caseRecord: CareFeeComparisonCaseV1,
): { label: string; value: string } => {
  if ("answer" in context) {
    return context.dimension === "same_subject"
      ? { label: "Subject", value: "You confirmed that both records concern the same person." }
      : { label: "Provider", value: "You confirmed that both records concern the same provider." };
  }
  const recordNumber = caseRecord.reconciliation.claimIds[1] === context.appliesToClaimIds[0]
    ? 2
    : 1;
  return {
    label: `${context.dimension === "payer_role" ? "Payer" : "Payee"} for Record ${recordNumber}`,
    value: roleLabels[context.value],
  };
};

function SavedSourceRecord({ record }: { readonly record: CareFeeCaseSourceSnapshot }) {
  return (
    <article className="min-w-0 rounded-lg border border-white/15 bg-slate-950/55 p-4">
      <h4 className="text-lg font-bold text-white">{record.recordLabel}</h4>
      <p className="mt-1 break-words font-semibold text-slate-200">{record.document.displayName}</p>
      <p className="mt-1 text-xs font-semibold text-emerald-200">
        Source review {record.reviewState.replaceAll("_", " ")} · {sourceLocation(record)}
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <div className="rounded-md bg-slate-900/70 px-3 py-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount</dt>
          <dd className="mt-1 break-words text-slate-200">
            {formatCareFeeMinorAmount(record.claim.amountMinor, record.claim.currency)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-900/70 px-3 py-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Cadence</dt>
          <dd className="mt-1 break-words text-slate-200">
            {cadenceLabels[record.claim.cadence] ?? record.claim.cadence}
          </dd>
        </div>
      </dl>
      <details className="mt-4 border-t border-white/10 pt-3">
        <summary className="min-h-11 cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-sm font-bold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Review source excerpt
        </summary>
        <blockquote className="mt-3 break-words rounded-lg bg-slate-950 p-3 text-sm leading-6 text-slate-200">
          {record.sourceQuote}
        </blockquote>
      </details>
    </article>
  );
}

export function CareFeeComparisonCaseView({
  caseRecord,
  notice,
  onDelete,
  onBackToCases,
  onReturnToCareFee,
}: CareFeeComparisonCaseViewProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prepareMessageTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteHeadingRef = useRef<HTMLHeadingElement>(null);
  const [draftPreparationCaseId, setDraftPreparationCaseId] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    headingRef.current?.focus();
  }, [caseRecord.id]);

  useEffect(() => {
    if (confirmingDelete) deleteHeadingRef.current?.focus();
  }, [confirmingDelete]);

  const cancelDelete = () => {
    setConfirmingDelete(false);
    setDeleteError("");
    deleteTriggerRef.current?.focus();
  };

  const deleteCase = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    const result = await onDelete(caseRecord.id);
    if (result.status === "failed") {
      setDeleteError(result.message);
      setDeleting(false);
    } else {
      setDraftPreparationCaseId(undefined);
    }
  };

  const closeDraftPreparation = () => {
    setDraftPreparationCaseId(undefined);
    prepareMessageTriggerRef.current?.focus();
  };

  const leaveCase = (action: () => void) => {
    setDraftPreparationCaseId(undefined);
    action();
  };

  const reconciliation = caseRecord.reconciliation;
  const savedAt = new Date(caseRecord.createdAt).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Locally saved Care Fee case
        </p>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-3xl font-bold tracking-tight text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          {caseRecord.title}
        </h2>
        <p className="mt-2 text-sm text-slate-400">Saved {savedAt}</p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">{caseRecord.summary}</p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
          This is an immutable snapshot of the explicitly saved comparison. Reopening it does not
          rerun the comparison or contact anyone.
        </p>
      </header>

      {notice ? (
        <p role="status" aria-live="polite" aria-atomic="true" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          {notice}
        </p>
      ) : null}

      <section aria-labelledby="care-fee-case-sources-heading" className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <h3 id="care-fee-case-sources-heading" className="text-xl font-bold text-white">
          From your records
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          These excerpts and details were copied from the selected source records when you saved the case.
        </p>
        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          {caseRecord.sourceRecords.map((record) => (
            <SavedSourceRecord key={record.recordLabel} record={record} />
          ))}
        </div>
      </section>

      <section aria-labelledby="care-fee-case-confirmed-heading" className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 sm:p-6">
        <h3 id="care-fee-case-confirmed-heading" className="text-xl font-bold text-cyan-50">
          You confirmed
        </h3>
        {caseRecord.userConfirmedContext.length > 0 ? (
          <dl className="mt-3 space-y-3 text-sm leading-6">
            {caseRecord.userConfirmedContext.map((context, index) => {
              const description = describeContext(context, caseRecord);
              return (
                <div key={`${context.dimension}-${index}`}>
                  <dt className="font-bold text-cyan-100">{description.label}</dt>
                  <dd className="text-cyan-50/90">{description.value}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-cyan-50/90">
            No separate user-confirmed context was used for this comparison.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-cyan-100/75">
          This context came from your confirmation, not from the source records.
        </p>
      </section>

      <section aria-labelledby="care-fee-case-comparison-heading" className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 sm:p-6">
        <h3 id="care-fee-case-comparison-heading" className="text-xl font-bold text-emerald-50">
          AdminAvenger comparison
        </h3>
        <p className="mt-2 text-sm leading-6 text-emerald-50/90">
          {reconciliation.state === "agreement"
            ? "The selected source amounts agreed for the saved applicability."
            : reconciliation.state === "disagreement"
              ? "The selected source amounts differed for the saved applicability."
              : "The selected source amounts were not safely comparable."}
        </p>
        {reconciliation.state === "disagreement" ? (
          <dl className="mt-3 rounded-lg bg-slate-950/45 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">
              Absolute comparison difference
            </dt>
            <dd className="mt-1 break-words text-lg font-bold text-white">
              {formatCareFeeMinorAmount(reconciliation.differenceMinor, reconciliation.currency)} · {cadenceLabels[reconciliation.cadence] ?? reconciliation.cadence}
            </dd>
          </dl>
        ) : null}
        {reconciliation.state !== "not_safely_comparable" ? (
          <dl className="mt-3 rounded-lg bg-slate-950/45 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-emerald-200">Applicability</dt>
            <dd className="mt-1 break-words text-sm text-white">
              {formatCareFeeApplicability(reconciliation.applicability)}
            </dd>
          </dl>
        ) : null}
        {caseRecord.blockingExplanations.length > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] p-3">
            <h4 className="font-bold text-amber-50">Blocking reasons</h4>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-amber-50/90">
              {caseRecord.blockingExplanations.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-amber-100">{caseRecord.safetyBoundary}</p>
        {reconciliation.state === "disagreement" ? (
          <p className="mt-2 text-xs leading-5 text-slate-300">
            The absolute difference is not money owed, recoverable money, money saved, or a refund.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="care-fee-case-actions-heading" className="rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:p-6">
        <h3 id="care-fee-case-actions-heading" className="text-xl font-bold text-white">Case actions</h3>
        <button
          ref={prepareMessageTriggerRef}
          type="button"
          onClick={() => setDraftPreparationCaseId(caseRecord.id)}
          aria-expanded={draftPreparationCaseId === caseRecord.id}
          aria-controls="care-fee-draft-preparation-panel"
          className="mt-4 min-h-11 w-full rounded-lg bg-violet-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 sm:w-auto"
        >
          Prepare a message
        </button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => leaveCase(onBackToCases)} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Back to saved things
          </button>
          <button type="button" onClick={() => leaveCase(onReturnToCareFee)} className="min-h-11 rounded-lg border border-cyan-300/30 px-4 py-3 font-bold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Return to Care Fee flow
          </button>
        </div>
        <button
          ref={deleteTriggerRef}
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="mt-4 min-h-11 w-full rounded-lg border border-rose-300/30 px-4 py-3 font-bold text-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 sm:w-auto"
        >
          Delete saved case
        </button>

        {confirmingDelete ? (
          <section role="region" aria-labelledby="care-fee-delete-heading" className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/[0.06] p-4">
            <h4 id="care-fee-delete-heading" ref={deleteHeadingRef} tabIndex={-1} className="font-bold text-rose-50 outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
              Delete this locally saved Care Fee case?
            </h4>
            <p className="mt-2 text-sm leading-6 text-rose-50/90">
              This removes the entire local saved snapshot, including its source excerpts,
              user-confirmed context, and comparison data. It does not affect source documents
              outside this saved snapshot.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void deleteCase()} disabled={deleting} className="min-h-11 rounded-lg bg-rose-300 px-4 py-3 font-bold text-slate-950 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-100">
                {deleting ? "Deleting locally…" : "Delete local case"}
              </button>
              <button type="button" onClick={cancelDelete} disabled={deleting} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                Cancel
              </button>
            </div>
          </section>
        ) : null}
        {deleteError ? <p role="alert" className="mt-3 text-sm font-semibold text-rose-100">{deleteError}</p> : null}
      </section>

      {draftPreparationCaseId === caseRecord.id ? (
        <CareFeeDraftPreparationPanel
          caseRecord={caseRecord}
          onClose={closeDraftPreparation}
        />
      ) : null}
    </div>
  );
}
