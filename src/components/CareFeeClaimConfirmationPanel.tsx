import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARE_FEE_COMPARABILITY_NOTICE,
  buildCareFeeClaimCandidates,
  createConfirmedCareFeeComparisonRequest,
  getRequiredCareFeeContext,
  suggestCareFeeClaimPair,
  type CareFeeClaimCandidate,
  type ConfirmedCareFeeComparisonRequestV1,
  type RequiredCareFeeContext,
  type UserConfirmedCareFeeContext,
} from "../lib/careFeeClaimConfirmation";
import type { CareFeePartyRole, FinancialClaim } from "../lib/financialClaims";
import type { SourceDocument } from "../lib/sourceProvenance";

type CareFeeClaimConfirmationPanelProps = {
  sourceDocuments: readonly SourceDocument[];
  onExit: () => void;
  onReady?: (request: ConfirmedCareFeeComparisonRequestV1) => void;
  showExit?: boolean;
};

type FlowStep = "candidates" | "context" | "review" | "ready";

const selectableCandidate = (
  candidate: CareFeeClaimCandidate,
): candidate is Extract<CareFeeClaimCandidate, { status: "selectable" }> =>
  candidate.status === "selectable";

const blockedReasonLabels: Readonly<Record<string, string>> = {
  review_required: "Review this source before selecting it.",
  source_unavailable: "The source is not available for selection.",
  ambiguous_quote: "The supporting passage is ambiguous.",
  quote_not_found: "The supporting passage could not be verified.",
  empty_quote: "No supporting passage was available.",
  ambiguous_claim_pairing: "The passage contains an ambiguous amount or care-fee concept.",
  malformed_amount: "The amount could not be read safely.",
  malformed_claim: "The record could not be represented as a valid claim.",
};

const conceptLabels: Readonly<Record<FinancialClaim["concept"], string>> = {
  total_care_home_fee: "Total care-home fee",
  resident_contribution: "Resident contribution",
  local_authority_contribution: "Local authority contribution",
  nhs_contribution: "NHS contribution",
  third_party_top_up: "Third-party top-up",
  one_off_adjustment: "One-off adjustment",
  retrospective_adjustment: "Retrospective adjustment",
  other_unknown_amount: "Other or unclear amount",
};

const cadenceLabels: Readonly<Record<FinancialClaim["cadence"], string>> = {
  weekly: "Weekly",
  four_weekly: "Every four weeks",
  monthly: "Monthly",
  invoice_period_total: "Invoice-period total",
  one_off: "One-off",
  unknown: "Not stated in the document",
};

const roleLabels: Readonly<Record<CareFeePartyRole, string>> = {
  resident: "Resident",
  local_authority: "Local authority",
  nhs: "NHS",
  third_party: "Third party",
  care_provider: "Care provider",
  unknown: "Not stated in the document",
};

const confirmedRoles = [
  "resident",
  "local_authority",
  "nhs",
  "third_party",
  "care_provider",
] as const satisfies readonly Exclude<CareFeePartyRole, "unknown">[];

const reviewStateLabel = (candidate: CareFeeClaimCandidate): string => {
  if (candidate.status === "blocked") return "Blocked — not selectable";
  return candidate.source.reviewState === "confirmed"
    ? "Source review confirmed"
    : "Source needs review — not selectable";
};

const amountLabel = (claim: FinancialClaim): string => {
  const amount = (claim.amountMinor / 100).toFixed(2);
  return claim.currency === "GBP" ? `GBP ${amount}` : `${amount} — currency not stated`;
};

const applicabilityLabel = (claim: FinancialClaim): string => {
  if (claim.periodStart || claim.periodEnd) {
    return `${claim.periodStart ?? "start not stated"} to ${claim.periodEnd ?? "end not stated"}`;
  }
  if (claim.effectiveDate) return `Effective ${claim.effectiveDate}`;
  if (claim.assessmentDate) return `Assessment ${claim.assessmentDate}`;
  if (claim.documentDate) return `Document dated ${claim.documentDate}`;
  return "Not stated in the document";
};

const identityLabel = (value: string): string =>
  value === "unknown" ? "Not stated in the document" : value;

const sourceLocationLabel = (candidate: CareFeeClaimCandidate): string => {
  if (candidate.source.pageNumber !== undefined) return `Page ${candidate.source.pageNumber}`;
  if (candidate.source.photoNumber !== undefined) return `Photo ${candidate.source.photoNumber}`;
  if (candidate.source.sourceSegmentId) return `Source section ${candidate.source.sourceSegmentId}`;
  return "Document passage";
};

function SourcePassage({ candidate }: { candidate: CareFeeClaimCandidate }) {
  const [expanded, setExpanded] = useState(false);
  const label = `${expanded ? "Hide" : "Show"} supporting passage for ${candidate.source.sourceDocumentName}`;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="min-h-11 rounded-lg border border-white/15 px-3 py-2 text-left text-sm font-bold text-cyan-100 transition hover:border-cyan-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        {label}
      </button>
      {expanded ? (
        <blockquote className="mt-3 rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm leading-6 text-slate-200">
          {candidate.source.sourceQuote}
        </blockquote>
      ) : null}
    </div>
  );
}

function ClaimFacts({ claim }: { claim: FinancialClaim }) {
  return (
    <dl className="mt-3 grid min-w-0 gap-2 text-sm sm:grid-cols-2">
      {[
        ["Amount", amountLabel(claim)],
        ["Cadence", cadenceLabels[claim.cadence]],
        ["Concept", conceptLabels[claim.concept]],
        ["Applicability", applicabilityLabel(claim)],
        ["Subject", identityLabel(claim.subjectId)],
        ["Provider", identityLabel(claim.providerId)],
        ["Payer", roleLabels[claim.payerRole]],
        ["Payee", roleLabels[claim.payeeRole]],
      ].map(([term, detail]) => (
        <div key={term} className="min-w-0 rounded-md bg-slate-950/45 px-3 py-2">
          <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{term}</dt>
          <dd className="mt-1 break-words text-slate-200">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function CandidateCard({
  candidate,
  selected,
  selectionDisabled,
  onToggle,
}: {
  candidate: Extract<CareFeeClaimCandidate, { status: "selectable" }>;
  selected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-white/15 bg-slate-950/55 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={selectionDisabled}
          onChange={onToggle}
          aria-label={`Select record from ${candidate.source.sourceDocumentName}`}
          className="h-11 w-11 flex-none accent-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        />
        <div className="min-w-0">
          <p className="break-words font-bold text-white">{candidate.source.sourceDocumentName}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-200">
            {reviewStateLabel(candidate)} · {sourceLocationLabel(candidate)}
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            From the document
          </p>
        </div>
      </div>
      <ClaimFacts claim={candidate.claim} />
      <SourcePassage candidate={candidate} />
    </article>
  );
}

function BlockedCandidateCard({
  candidate,
}: {
  candidate: Extract<CareFeeClaimCandidate, { status: "blocked" }>;
}) {
  return (
    <article className="min-w-0 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-4">
      <p className="break-words font-bold text-white">{candidate.source.sourceDocumentName}</p>
      <p className="mt-1 text-xs font-semibold text-amber-100">
        {reviewStateLabel(candidate)} · {sourceLocationLabel(candidate)}
      </p>
      <p className="mt-3 text-sm leading-6 text-amber-50/90">
        {blockedReasonLabels[candidate.reason] ?? "This record cannot be selected safely."}
      </p>
      <SourcePassage candidate={candidate} />
    </article>
  );
}

const sourceSetKey = (documents: readonly SourceDocument[]): string =>
  JSON.stringify(
    documents.map((document) => ({
      id: document.id,
      order: document.order,
      reviewState: document.reviewState,
      extractedText: document.extractedText,
      segments: document.segments.map(({ id, order, text }) => ({ id, order, text })),
    })),
  );

const pairHasKnownIdentityConflict = (
  claims: readonly [FinancialClaim, FinancialClaim],
): boolean =>
  (claims[0].subjectId !== "unknown" &&
    claims[1].subjectId !== "unknown" &&
    claims[0].subjectId !== claims[1].subjectId) ||
  (claims[0].providerId !== "unknown" &&
    claims[1].providerId !== "unknown" &&
    claims[0].providerId !== claims[1].providerId);

const confirmedContextLabel = (
  context: UserConfirmedCareFeeContext,
  recordNumberFor: (claimId: string) => number,
): string => {
  if ("answer" in context) {
    return context.dimension === "same_subject"
      ? "Both records concern the same person."
      : "Both records concern the same provider.";
  }
  return `${context.dimension === "payer_role" ? "Payer" : "Payee"} for Record ${recordNumberFor(context.appliesToClaimIds[0])}: ${roleLabels[context.value]}.`;
};

export function CareFeeClaimConfirmationPanel({
  sourceDocuments,
  onExit,
  onReady,
  showExit = true,
}: CareFeeClaimConfirmationPanelProps) {
  const [step, setStep] = useState<FlowStep>("candidates");
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [contextAnswers, setContextAnswers] = useState<Record<string, string>>({});
  const [confirmedContext, setConfirmedContext] = useState<UserConfirmedCareFeeContext[]>([]);
  const [request, setRequest] = useState<ConfirmedCareFeeComparisonRequestV1>();
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const documentsKey = sourceSetKey(sourceDocuments);
  const candidates = useMemo(
    () => buildCareFeeClaimCandidates(sourceDocuments),
    [sourceDocuments],
  );
  const selectable = candidates.filter(selectableCandidate);
  const blocked = candidates.filter(
    (candidate): candidate is Extract<CareFeeClaimCandidate, { status: "blocked" }> =>
      candidate.status === "blocked",
  );
  const suggestion = suggestCareFeeClaimPair(candidates);
  const selectedCandidates = selectedClaimIds
    .map((id) => selectable.find((candidate) => candidate.claim.id === id))
    .filter(
      (candidate): candidate is Extract<CareFeeClaimCandidate, { status: "selectable" }> =>
        candidate !== undefined,
    );
  const selectedClaims = selectedCandidates.length === 2
    ? [selectedCandidates[0].claim, selectedCandidates[1].claim] as const
    : undefined;
  const contextQuestions = selectedClaims
    ? getRequiredCareFeeContext(selectedClaims, [])
    : [];

  useEffect(() => {
    setStep("candidates");
    setSelectedClaimIds([]);
    setContextAnswers({});
    setConfirmedContext([]);
    setRequest(undefined);
    setError("");
  }, [documentsKey]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, documentsKey]);

  const toggleCandidate = (id: string) => {
    setError("");
    setConfirmedContext([]);
    setContextAnswers({});
    setSelectedClaimIds((current) =>
      current.includes(id)
        ? current.filter((claimId) => claimId !== id)
        : current.length < 2
          ? [...current, id]
          : current,
    );
  };

  const continueFromCandidates = () => {
    if (!selectedClaims) {
      setError("Choose exactly two records before continuing.");
      return;
    }
    if (pairHasKnownIdentityConflict(selectedClaims)) {
      setError("These records contain conflicting known identity details. Choose a different pair.");
      return;
    }
    setError("");
    setStep(contextQuestions.length > 0 ? "context" : "review");
  };

  const buildContextFromAnswers = (
    questions: readonly RequiredCareFeeContext[],
  ): UserConfirmedCareFeeContext[] | undefined => {
    const context: UserConfirmedCareFeeContext[] = [];
    for (const question of questions) {
      const key = `${question.dimension}:${question.appliesToClaimIds.join("|")}`;
      const answer = contextAnswers[key];
      if (question.dimension === "same_subject" || question.dimension === "same_provider") {
        if (answer !== "yes") return undefined;
        context.push({
          kind: "user_confirmed_context",
          dimension: question.dimension,
          appliesToClaimIds: question.appliesToClaimIds,
          answer: "yes",
        });
      } else {
        if (!confirmedRoles.includes(answer as (typeof confirmedRoles)[number])) return undefined;
        context.push({
          kind: "user_confirmed_context",
          dimension: question.dimension,
          appliesToClaimIds: [question.appliesToClaimIds[0]],
          value: answer as Exclude<CareFeePartyRole, "unknown">,
        });
      }
    }
    return context;
  };

  const reviewContext = () => {
    const context = buildContextFromAnswers(contextQuestions);
    if (!context) {
      setError("Required context is still unknown. Choose Yes only when you know, and identify each missing role.");
      return;
    }
    setConfirmedContext(context);
    setError("");
    setStep("review");
  };

  const confirmPair = () => {
    if (!selectedClaims) {
      setError("The selected records are no longer available. Return to record choices.");
      return;
    }
    const result = createConfirmedCareFeeComparisonRequest({
      claims: selectedClaims,
      sourceDocuments,
      userConfirmedContext: confirmedContext,
    });
    if (!result.valid) {
      setError("These records cannot be prepared safely. Return to the record choices and review the source details.");
      return;
    }
    setRequest(result.request);
    setError("");
    setStep("ready");
    onReady?.(result.request);
  };

  const contextKeyFor = (question: RequiredCareFeeContext): string =>
    `${question.dimension}:${question.appliesToClaimIds.join("|")}`;

  const recordNumberFor = (claimId: string): number =>
    selectedClaims?.findIndex(({ id }) => id === claimId) === 1 ? 2 : 1;

  return (
    <section aria-labelledby="care-fee-flow-heading" className="min-w-0 rounded-lg border border-white/10 bg-slate-900/85 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Controlled preparation</p>
          <h2
            id="care-fee-flow-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 break-words text-2xl font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            {step === "candidates"
              ? "Choose two care-fee records"
              : step === "context"
                ? "Confirm missing context"
                : step === "review"
                  ? "Review Record 1 and Record 2"
                  : "Records ready for comparison"}
          </h2>
        </div>
        {showExit ? (
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Exit care-fee preparation
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-50">
          {error}
        </p>
      ) : null}

      {step === "candidates" ? (
        <div className="mt-5 min-w-0">
          <p className="text-sm leading-6 text-slate-300">
            Review every source card, then choose two tentative records. No final pair is chosen automatically.
          </p>

          {suggestion ? (
            <aside className="mt-4 rounded-lg border border-cyan-300/30 bg-cyan-300/[0.07] p-4">
              <p className="font-bold text-cyan-50">{suggestion.label}</p>
              <p className="mt-1 text-sm leading-6 text-cyan-100/90">{CARE_FEE_COMPARABILITY_NOTICE}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedClaimIds([...suggestion.claimIds]);
                  setConfirmedContext([]);
                  setContextAnswers({});
                  setError("");
                }}
                className="mt-3 min-h-11 rounded-lg border border-cyan-200/30 px-4 py-2 text-sm font-bold text-cyan-50 transition hover:border-cyan-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                Use suggested pair
              </button>
            </aside>
          ) : null}

          {selectable.length > 0 ? (
            <fieldset className="mt-5 min-w-0">
              <legend className="text-lg font-bold text-white">Available record candidates</legend>
              <p className="mt-1 text-sm text-slate-400">Alternatives remain available. Choose exactly two.</p>
              <div className="mt-4 grid min-w-0 gap-4">
                {selectable.map((candidate) => (
                  <CandidateCard
                    key={candidate.candidateId}
                    candidate={candidate}
                    selected={selectedClaimIds.includes(candidate.claim.id)}
                    selectionDisabled={
                      selectedClaimIds.length >= 2 && !selectedClaimIds.includes(candidate.claim.id)
                    }
                    onToggle={() => toggleCandidate(candidate.claim.id)}
                  />
                ))}
              </div>
            </fieldset>
          ) : (
            <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
              No selectable claims were found. Review the source states below or attach another record.
            </p>
          )}

          {selectable.length === 1 ? (
            <p role="status" aria-live="polite" className="mt-4 text-sm leading-6 text-amber-100">
              One usable claim is available. Attach another record before continuing.
            </p>
          ) : null}

          {blocked.length > 0 ? (
            <section aria-labelledby="blocked-care-fee-candidates" className="mt-6 min-w-0">
              <h3 id="blocked-care-fee-candidates" className="text-lg font-bold text-white">
                Records that need review
              </h3>
              <div className="mt-3 grid min-w-0 gap-4">
                {blocked.map((candidate) => (
                  <BlockedCandidateCard key={candidate.candidateId} candidate={candidate} />
                ))}
              </div>
            </section>
          ) : null}

          {sourceDocuments.length > 0 && candidates.length === 0 ? (
            <ul className="mt-5 space-y-2" aria-label="Source document states">
              {sourceDocuments.map((document) => (
                <li key={document.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200">
                  <span className="font-bold text-white">{document.displayName}</span>
                  <span className="block text-slate-400">Source state: {document.reviewState.replace("_", " ")}</span>
                  {document.warnings.map((warning) => (
                    <span key={warning} className="block text-amber-100">{warning}</span>
                  ))}
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={continueFromCandidates}
            disabled={selectedClaimIds.length !== 2}
            className="mt-6 min-h-11 w-full rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Continue with these records
          </button>
        </div>
      ) : null}

      {step === "context" && selectedClaims ? (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-300">
            These answers are session-only and stay separate from the document source. Choose No or not sure whenever you cannot confirm something.
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-200">You confirmed</p>
          <div className="mt-4 space-y-5">
            {contextQuestions.map((question) => {
              const key = contextKeyFor(question);
              if (question.dimension === "same_subject" || question.dimension === "same_provider") {
                const subject = question.dimension === "same_subject";
                const legend = subject
                  ? "Do both records concern the same person?"
                  : "Do both records concern the same provider?";
                const yesLabel = subject
                  ? "Yes, they concern the same person"
                  : "Yes, they concern the same provider";
                return (
                  <fieldset key={key} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                    <legend className="px-1 font-bold text-white">{legend}</legend>
                    <div className="mt-3 grid gap-2">
                      {[
                        ["yes", yesLabel],
                        ["unsure", "No or not sure"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-emerald-300">
                          <input
                            type="radio"
                            name={key}
                            value={value}
                            checked={contextAnswers[key] === value}
                            onChange={() => setContextAnswers((current) => ({ ...current, [key]: value }))}
                            className="h-5 w-5 accent-emerald-400"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              }

              const recordNumber = recordNumberFor(question.appliesToClaimIds[0]);
              const payer = question.dimension === "payer_role";
              const legend = `${payer ? "Who makes" : "Who receives"} the payment in Record ${recordNumber}?`;
              return (
                <fieldset key={key} className="rounded-lg border border-white/10 bg-slate-950/50 p-4">
                  <legend className="px-1 font-bold text-white">{legend}</legend>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {confirmedRoles.map((role) => (
                      <label key={role} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-emerald-300">
                        <input
                          type="radio"
                          name={key}
                          value={role}
                          checked={contextAnswers[key] === role}
                          onChange={() => setContextAnswers((current) => ({ ...current, [key]: role }))}
                          className="h-5 w-5 accent-emerald-400"
                        />
                        {roleLabels[role]}
                      </label>
                    ))}
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 focus-within:ring-2 focus-within:ring-emerald-300">
                      <input
                        type="radio"
                        name={key}
                        value="unsure"
                        checked={contextAnswers[key] === "unsure"}
                        onChange={() => setContextAnswers((current) => ({ ...current, [key]: "unsure" }))}
                        className="h-5 w-5 accent-emerald-400"
                      />
                      Not sure
                    </label>
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setStep("candidates")} className="min-h-11 rounded-lg border border-white/15 px-4 py-3 font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
              Back to record choices
            </button>
            <button type="button" onClick={reviewContext} className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              Review these records
            </button>
          </div>
        </div>
      ) : null}

      {step === "review" && selectedClaims ? (
        <div className="mt-5">
          <p className="text-sm leading-6 text-slate-300">
            Check the ordered records below. Record 1 and Record 2 are neutral labels only.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            {selectedCandidates.map((candidate, index) => (
              <article key={candidate.claim.id} className="min-w-0 rounded-lg border border-white/15 bg-slate-950/55 p-4">
                <h3 className="text-xl font-bold text-white">Record {index + 1}</h3>
                <p className="mt-2 break-words font-semibold text-slate-200">{candidate.source.sourceDocumentName}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">From the document</p>
                <ClaimFacts claim={candidate.claim} />
              </article>
            ))}
          </div>
          {confirmedContext.length > 0 ? (
            <section aria-labelledby="confirmed-care-fee-context" className="mt-5 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
              <h3 id="confirmed-care-fee-context" className="font-bold text-emerald-50">You confirmed</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-emerald-50/90">
                {confirmedContext.map((context) => (
                  <li key={`${context.dimension}:${context.appliesToClaimIds.join("|")}`}>
                    {confirmedContextLabel(context, recordNumberFor)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setStep(contextQuestions.length > 0 ? "context" : "candidates")} className="min-h-11 rounded-lg border border-white/15 px-4 py-3 font-bold text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
              Back
            </button>
            <button type="button" onClick={confirmPair} className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              Confirm these two records
            </button>
          </div>
        </div>
      ) : null}

      {step === "ready" && request ? (
        <div role="status" aria-live="polite" className="mt-5 rounded-lg border border-emerald-300/30 bg-emerald-300/[0.08] p-4">
          <p className="text-sm leading-6 text-emerald-50">
            The two records and your separate confirmations are prepared for this browser session.
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-100/80">
            No further action has been taken.
          </p>
        </div>
      ) : null}
    </section>
  );
}
