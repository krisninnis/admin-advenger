import { useEffect, useRef, useState } from "react";
import {
  validateCareFeeComparisonCase,
  type CareFeeComparisonCaseV1,
} from "../lib/careFeeCase";
import type {
  CareFeeDraftDerivedFactReferenceV1,
  CareFeeDraftSourceFactReferenceV1,
  CareFeePreparedMessageStatementV1,
  CareFeePreparedStatementClassificationV1,
  CareFeePreparedStatementSupportReferenceV1,
} from "../lib/careFeeDraftPreparation";
import type { CareFeePreparedMessageEvidenceReviewV1 } from "../lib/careFeePreparedMessageEvidenceReview";

type CareFeePreparedMessageEvidenceReviewProps = {
  readonly review: CareFeePreparedMessageEvidenceReviewV1;
  readonly currentSavedCase: CareFeeComparisonCaseV1;
};

const classificationLabels: Readonly<Record<CareFeePreparedStatementClassificationV1, string>> = {
  source_grounded_statement: "Saved source record",
  user_confirmed_input: "User-confirmed input",
  derived_comparison_statement: "AdminAvenger comparison fact",
  user_entered_recipient: "User-entered recipient",
  adminavenger_template_wording: "AdminAvenger template wording",
};

const classificationExplanations: Readonly<Record<CareFeePreparedStatementClassificationV1, string>> = {
  source_grounded_statement: "Grounded in the immutable source record saved in this Care Fee case.",
  user_confirmed_input: "User-confirmed context; not source evidence.",
  derived_comparison_statement: "Taken from the exact saved comparison result; not recalculated here.",
  user_entered_recipient: "Entered for this temporary draft; not source evidence or saved-case truth.",
  adminavenger_template_wording: "AdminAvenger's fixed message wording; not evidence from a record.",
};

const sourceFieldLabels: Readonly<Record<CareFeeDraftSourceFactReferenceV1["field"], string>> = {
  document_reference: "saved document reference",
  amount_minor: "saved amount",
  cadence: "saved cadence",
};

const derivedFieldLabels: Readonly<Record<CareFeeDraftDerivedFactReferenceV1["field"], string>> = {
  state: "saved comparison state",
  amount_minor: "saved agreed amount",
  amounts_minor: "saved compared amounts",
  difference_minor: "saved absolute difference",
  difference_kind: "saved difference type",
  currency: "saved currency",
  cadence: "saved cadence",
  applicability: "saved applicability",
  reasons: "saved comparison blockers",
  blocking_explanations: "saved blocker explanations",
};

const supportReferenceLabel = (
  reference: CareFeePreparedStatementSupportReferenceV1,
): string => {
  if (reference.partition === "source_fact") {
    return `${reference.recordLabel}: ${sourceFieldLabels[reference.field]}`;
  }
  if (reference.partition === "derived_comparison_fact") {
    return derivedFieldLabels[reference.field];
  }
  if (reference.partition === "user_confirmed_fact") {
    return `user-confirmed ${reference.dimension.replaceAll("_", " ")}`;
  }
  return "temporary recipient label";
};

const userConfirmedContextText = (
  context: CareFeeComparisonCaseV1["userConfirmedContext"][number],
): string => {
  if ("answer" in context) {
    return context.dimension === "same_subject"
      ? "You confirmed that both records concern the same person."
      : "You confirmed that both records concern the same provider.";
  }
  return `You confirmed the ${context.dimension.replace("_", " ")} as ${context.value.replaceAll("_", " ")}.`;
};

function StatementCard({ statement }: { readonly statement: CareFeePreparedMessageStatementV1 }) {
  return (
    <li className="min-w-0 rounded-lg border border-white/15 bg-slate-950/55 p-4">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="font-bold text-white">
          {statement.location === "subject" ? "Subject" : "Message"}
        </p>
        <p className="text-xs font-bold uppercase tracking-wide text-cyan-100">
          {classificationLabels[statement.classification]}
        </p>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
        {statement.text}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {classificationExplanations[statement.classification]}
      </p>
      {statement.supportReferences.length > 0 ? (
        <dl className="mt-3 text-xs leading-5 text-slate-300">
          <div>
            <dt className="font-bold text-slate-100">Exact saved support</dt>
            <dd>
              <ul className="mt-1 list-disc pl-5">
                {statement.supportReferences.map((reference, index) => (
                  <li key={`${statement.id}-support-${index}`}>
                    {supportReferenceLabel(reference)}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      ) : null}
    </li>
  );
}

export function CareFeePreparedMessageEvidenceReview({
  review,
  currentSavedCase,
}: CareFeePreparedMessageEvidenceReviewProps) {
  const [open, setOpen] = useState(false);
  const [openSourceRecords, setOpenSourceRecords] = useState<readonly string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const caseValidation = validateCareFeeComparisonCase(currentSavedCase);
  const matchesSnapshot = review.savedSnapshotMatchStatus === "matches_saved_snapshot";

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  const toggleSourceRecord = (recordLabel: string, nextOpen: boolean) => {
    setOpenSourceRecords((current) => nextOpen
      ? [...new Set([...current, recordLabel])]
      : current.filter((label) => label !== recordLabel));
  };

  return (
    <section aria-labelledby="care-fee-evidence-summary-heading" className="mt-5 min-w-0 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
      <h5 id="care-fee-evidence-summary-heading" className="font-bold text-cyan-50">
        Prepared-message evidence
      </h5>
      {matchesSnapshot ? (
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 text-sm font-semibold text-emerald-100">
          Matches the saved Care Fee snapshot used to prepare this message.
        </p>
      ) : (
        <p role="alert" className="mt-2 rounded-lg border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm font-semibold leading-6 text-rose-100">
          This prepared message no longer matches the saved Care Fee snapshot. Review the saved case and prepare the message again.
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-400">
        This integrity check compares with the saved snapshot. It does not prove that a real-world record is current or correct.
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="care-fee-prepared-message-evidence-details"
        onClick={() => setOpen((current) => !current)}
        className="mt-3 min-h-11 rounded-lg border border-cyan-200/30 px-4 py-3 font-bold text-cyan-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
      >
        {open ? "Hide evidence review" : "Review evidence used"}
      </button>

      {open ? (
        <div id="care-fee-prepared-message-evidence-details" className="mt-5 min-w-0">
          <h6
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Evidence used in the prepared wording
          </h6>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Statements appear in prepared-message order. This review applies only to the original AdminAvenger-prepared wording, not to your edits.
          </p>

          <ol aria-label="Prepared message statements" className="mt-4 space-y-3">
            {review.preparedStatements.map((statement) => (
              <StatementCard key={statement.id} statement={statement} />
            ))}
          </ol>

          <section aria-labelledby="care-fee-supporting-context-heading" className="mt-5 rounded-lg border border-white/15 p-4">
            <h6 id="care-fee-supporting-context-heading" className="font-bold text-white">
              Supporting comparison context
            </h6>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
              User-confirmed input
            </p>
            <p className="mt-2 text-sm leading-6 text-cyan-50">
              Used to support the saved comparison; not stated directly in this message.
            </p>
            {matchesSnapshot && caseValidation.valid && review.supportingContextReferences.userConfirmedReferences.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-300">
                {review.supportingContextReferences.userConfirmedReferences.map((reference) => {
                  const context = caseValidation.caseRecord.userConfirmedContext[reference.contextIndex];
                  return context ? (
                    <li key={`${reference.contextIndex}-${reference.dimension}`}>
                      {userConfirmedContextText(context)}
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Supporting context is unavailable unless this message matches a valid saved snapshot.
              </p>
            )}
          </section>

          {matchesSnapshot && caseValidation.valid ? (
            <section aria-labelledby="care-fee-source-excerpts-heading" className="mt-5">
              <h6 id="care-fee-source-excerpts-heading" className="font-bold text-white">
                Saved source excerpts
              </h6>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Document names support review but are not automatically stated in the prepared message.
              </p>
              <div className="mt-3 space-y-3">
                {caseValidation.caseRecord.sourceRecords.map((record) => {
                  const sourceOpen = openSourceRecords.includes(record.recordLabel);
                  return (
                    <details
                      key={record.recordLabel}
                      open={sourceOpen}
                      onToggle={(event) => toggleSourceRecord(
                        record.recordLabel,
                        event.currentTarget.open,
                      )}
                      className="rounded-lg border border-white/15 bg-slate-950/45 p-3"
                    >
                      <summary
                        aria-expanded={sourceOpen}
                        className="min-h-11 cursor-pointer rounded-lg px-2 py-2 font-bold text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                      >
                        Review {record.recordLabel} saved source excerpt
                      </summary>
                      <p className="mt-3 break-words text-sm font-semibold text-slate-200">
                        {record.document.displayName}
                      </p>
                      <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-cyan-200/50 pl-3 text-sm leading-6 text-slate-300">
                        {record.sourceQuote}
                      </blockquote>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="care-fee-user-edits-heading" className="mt-5 rounded-lg border border-violet-300/20 bg-violet-300/[0.04] p-4">
            <h6 id="care-fee-user-edits-heading" className="font-bold text-violet-50">
              Your edits
            </h6>
            <dl className="mt-3 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
              <div>
                <dt className="font-bold text-white">Subject</dt>
                <dd className="capitalize">{review.editState.subject}</dd>
              </div>
              <div>
                <dt className="font-bold text-white">Message</dt>
                <dd className="capitalize">{review.editState.body}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              User-edited text does not gain source, user-confirmed, or derived provenance.
            </p>
          </section>
        </div>
      ) : null}
    </section>
  );
}
