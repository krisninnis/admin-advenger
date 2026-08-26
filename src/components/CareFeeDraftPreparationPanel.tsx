import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCareFeeMinorAmount,
  validateCareFeeComparisonCase,
  type CareFeeCaseSnapshotIdentityV1,
  type CareFeeComparisonCaseV1,
} from "../lib/careFeeCase";
import {
  formatCareFeeDraftApplicability,
  getAllowedCareFeeDraftIntents,
  prepareCareFeeDraft,
  validateCareFeeDraftPreparationRequest,
  type CareFeeDraftIntentV1,
  type CareFeeDraftPreparationRequestV1,
  type CareFeeDraftSourceFactV1,
  type CareFeeDraftUserConfirmedFactV1,
  type CareFeePreparedDraftV1,
  type ValidatedCareFeeDraftPreparationContextV1,
} from "../lib/careFeeDraftPreparation";
import { createCareFeePreparedMessageEvidenceReview } from "../lib/careFeePreparedMessageEvidenceReview";
import {
  COPY_BUTTON_FAILURE_MESSAGE,
  COPY_BUTTON_SUCCESS_STATUS_MESSAGE,
  copyTextToClipboard,
  type ClipboardLike,
  type CopyResult,
} from "../lib/copyToClipboard";
import { CareFeePreparedMessageEvidenceReview } from "./CareFeePreparedMessageEvidenceReview";

type CareFeeDraftPreparationPanelProps = {
  readonly caseRecord: CareFeeComparisonCaseV1;
  readonly onClose: () => void;
  readonly clipboard?: ClipboardLike;
};

const intentDescriptions: Readonly<Record<CareFeeDraftIntentV1, string>> = {
  confirm_or_break_down_figure:
    "Ask for neutral confirmation or a breakdown without saying that either record is correct.",
  explain_comparison_difference:
    "State the exact saved absolute difference and ask why the safely comparable figures differ.",
  clarify_rate_or_period:
    "Ask which saved rate, period, or effective date applies and on what basis.",
  request_missing_information:
    "Ask only for information identified by the saved comparison blockers.",
};

const intentLabel = (
  intent: CareFeeDraftIntentV1,
  state: CareFeeComparisonCaseV1["reconciliation"]["state"],
): string => {
  if (intent === "confirm_or_break_down_figure") {
    return state === "disagreement"
      ? "Ask for a breakdown of both figures"
      : "Ask to confirm or break down the figure";
  }
  if (intent === "explain_comparison_difference") return "Ask for an explanation of the difference";
  if (intent === "clarify_rate_or_period") return "Ask which rate or period applies";
  return "Ask for missing information";
};

const cadenceLabels: Readonly<Record<string, string>> = {
  weekly: "Weekly",
  four_weekly: "Every four weeks",
  monthly: "Monthly",
  invoice_period_total: "Invoice-period total",
  one_off: "One-off",
  unknown: "Not stated",
};

const sourceFactText = (fact: CareFeeDraftSourceFactV1): string => {
  if (fact.field === "document_reference") {
    return `${fact.recordLabel}: ${fact.value}`;
  }
  if (fact.field === "amount_minor") {
    return `${fact.recordLabel} amount: ${formatCareFeeMinorAmount(fact.value, fact.currency)}`;
  }
  return `${fact.recordLabel} cadence: ${cadenceLabels[fact.value] ?? fact.value}`;
};

const userConfirmedFactText = (fact: CareFeeDraftUserConfirmedFactV1): string => {
  const context = fact.context;
  if ("answer" in context) {
    return context.dimension === "same_subject"
      ? "You confirmed that both records concern the same person."
      : "You confirmed that both records concern the same provider.";
  }
  const role = context.value.replaceAll("_", " ");
  return `You confirmed the ${context.dimension.replace("_", " ")} as ${role}.`;
};

function DerivedFactReview({ context }: {
  readonly context: ValidatedCareFeeDraftPreparationContextV1;
}) {
  const facts = context.derivedComparisonFacts;
  if (facts.state === "agreement") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-emerald-50/90">
        <li>The safely comparable source amounts agreed.</li>
        <li>{formatCareFeeMinorAmount(facts.amountMinor, facts.currency)} · {cadenceLabels[facts.cadence]}</li>
        <li>{formatCareFeeDraftApplicability(facts.applicability)}</li>
      </ul>
    );
  }
  if (facts.state === "disagreement") {
    return (
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-emerald-50/90">
        <li>The safely comparable source amounts differed.</li>
        <li>
          Absolute difference: {formatCareFeeMinorAmount(facts.differenceMinor, facts.currency)} · {cadenceLabels[facts.cadence]}
        </li>
        <li>{formatCareFeeDraftApplicability(facts.applicability)}</li>
      </ul>
    );
  }
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-50/90">
      <li>The selected records could not be safely compared.</li>
      {facts.blockingExplanations.map((explanation) => (
        <li key={explanation}>{explanation}</li>
      ))}
    </ul>
  );
}

const requestFor = (
  caseRecord: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
  recipientLabel: string,
): CareFeeDraftPreparationRequestV1 => ({
  kind: "care_fee_draft_preparation_request",
  version: 1,
  savedCase: caseRecord,
  intent,
  ...(recipientLabel.length > 0
    ? {
        recipient: {
          label: recipientLabel,
          origin: "user_entered_drafting_input",
        },
      }
    : {}),
});

export function CareFeeDraftPreparationPanel({
  caseRecord,
  onClose,
  clipboard,
}: CareFeeDraftPreparationPanelProps) {
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const preparedHeadingRef = useRef<HTMLHeadingElement>(null);
  const prepareButtonRef = useRef<HTMLButtonElement>(null);
  const replaceHeadingRef = useRef<HTMLHeadingElement>(null);
  const [intent, setIntent] = useState<CareFeeDraftIntentV1 | "">("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [preparedDraft, setPreparedDraft] = useState<CareFeePreparedDraftV1>();
  const [preparedContext, setPreparedContext] = useState<ValidatedCareFeeDraftPreparationContextV1>();
  const [preparedAgainstSnapshotIdentity, setPreparedAgainstSnapshotIdentity] =
    useState<CareFeeCaseSnapshotIdentityV1>();
  const [preparedInputKey, setPreparedInputKey] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [preparationError, setPreparationError] = useState("");
  const [confirmingReprepare, setConfirmingReprepare] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | CopyResult>("idle");

  const caseValidation = useMemo(
    () => validateCareFeeComparisonCase(caseRecord),
    [caseRecord],
  );
  const allowedIntents = useMemo(
    () => getAllowedCareFeeDraftIntents(caseRecord),
    [caseRecord],
  );
  const preview = useMemo(() => {
    if (!intent) return undefined;
    return validateCareFeeDraftPreparationRequest(requestFor(caseRecord, intent, ""));
  }, [caseRecord, intent]);

  const hasEdits = Boolean(
    preparedDraft &&
    (editedSubject !== preparedDraft.preparedSubject || editedBody !== preparedDraft.preparedBody),
  );
  const currentInputKey = intent ? JSON.stringify([intent, recipientLabel.trim()]) : "";
  const inputsChanged = Boolean(preparedDraft && currentInputKey !== preparedInputKey);
  const evidenceReview = useMemo(() =>
    preparedDraft && preparedContext && preparedAgainstSnapshotIdentity
      ? createCareFeePreparedMessageEvidenceReview({
          currentSavedCase: caseRecord,
          preparedDraft,
          preparedContext,
          preparedAgainstSnapshotIdentity,
          editedSubject,
          editedBody,
        })
      : undefined,
  [
    caseRecord,
    editedBody,
    editedSubject,
    preparedAgainstSnapshotIdentity,
    preparedContext,
    preparedDraft,
  ]);

  useEffect(() => {
    panelHeadingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (preparedDraft) preparedHeadingRef.current?.focus();
  }, [preparedDraft]);

  useEffect(() => {
    if (confirmingReprepare) replaceHeadingRef.current?.focus();
  }, [confirmingReprepare]);

  const prepareNow = () => {
    if (!intent) return;
    const inputKey = JSON.stringify([intent, recipientLabel.trim()]);
    if (preparedDraft && preparedInputKey === inputKey && !hasEdits &&
        evidenceReview?.savedSnapshotMatchStatus === "matches_saved_snapshot") {
      preparedHeadingRef.current?.focus();
      return;
    }
    const outcome = prepareCareFeeDraft(requestFor(caseRecord, intent, recipientLabel));
    if (outcome.status === "failed") {
      setPreparationError(outcome.message);
      setConfirmingReprepare(false);
      return;
    }
    setPreparedDraft(outcome.draft);
    setPreparedContext(outcome.context);
    setPreparedAgainstSnapshotIdentity(outcome.preparedAgainstSnapshotIdentity);
    setPreparedInputKey(inputKey);
    setEditedSubject(outcome.draft.preparedSubject);
    setEditedBody(outcome.draft.preparedBody);
    setPreparationError("");
    setConfirmingReprepare(false);
    setCopyStatus("idle");
  };

  const startPreparation = () => {
    setPreparationError("");
    if (preparedDraft && hasEdits) {
      setConfirmingReprepare(true);
      return;
    }
    prepareNow();
  };

  const cancelReprepare = () => {
    setConfirmingReprepare(false);
    prepareButtonRef.current?.focus();
  };

  const copyEditedDraft = async () => {
    if (!preparedDraft || !preparedContext || !preparedAgainstSnapshotIdentity) return;
    const currentReview = createCareFeePreparedMessageEvidenceReview({
      currentSavedCase: caseRecord,
      preparedDraft,
      preparedContext,
      preparedAgainstSnapshotIdentity,
      editedSubject,
      editedBody,
    });
    if (currentReview.savedSnapshotMatchStatus !== "matches_saved_snapshot") return;
    const result = await copyTextToClipboard(`${editedSubject}\n\n${editedBody}`, clipboard);
    setCopyStatus(result);
  };

  if (!caseValidation.valid && !preparedDraft) {
    return (
      <section id="care-fee-draft-preparation-panel" aria-labelledby="care-fee-draft-preparation-heading" className="rounded-xl border border-rose-300/30 bg-rose-300/[0.06] p-4 sm:p-6">
        <h3
          id="care-fee-draft-preparation-heading"
          ref={panelHeadingRef}
          tabIndex={-1}
          className="text-xl font-bold text-rose-50 outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
        >
          Prepare a message
        </h3>
        <p role="alert" className="mt-3 text-sm font-semibold text-rose-100">
          This saved Care Fee case could not be verified. No draft was prepared.
        </p>
        <button type="button" onClick={onClose} className="mt-4 min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
          Return to saved case
        </button>
      </section>
    );
  }

  return (
    <section
      id="care-fee-draft-preparation-panel"
      aria-labelledby="care-fee-draft-preparation-heading"
      className="min-w-0 rounded-xl border border-violet-300/25 bg-violet-300/[0.06] p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-widest text-violet-200">
            Preparation only
          </p>
          <h3
            id="care-fee-draft-preparation-heading"
            ref={panelHeadingRef}
            tabIndex={-1}
            className="mt-1 text-2xl font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
          >
            Prepare a message
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
        >
          Return to saved case
        </button>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-violet-50/90">
        AdminAvenger can prepare neutral wording from this saved comparison. You choose the
        purpose, review the facts, and decide whether to use or change the text.
      </p>
      <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.06] p-3 text-sm leading-6 text-amber-50">
        <p>The draft is temporary. Refreshing, navigating away, or closing this panel discards it.</p>
        <p className="mt-1">Copying places the text on your device clipboard. User edits may add sensitive information.</p>
        <p className="mt-1 font-bold">Nothing has been sent.</p>
      </div>

      <fieldset className="mt-6 min-w-0">
        <legend className="text-lg font-bold text-white">What should the message ask for?</legend>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
          {allowedIntents.map((candidate) => (
            <label key={candidate} className="flex min-h-11 min-w-0 cursor-pointer gap-3 rounded-lg border border-white/15 bg-slate-950/55 p-3 focus-within:ring-2 focus-within:ring-violet-200">
              <input
                type="radio"
                name="care-fee-draft-intent"
                value={candidate}
                checked={intent === candidate}
                onChange={() => {
                  setIntent(candidate);
                  setPreparationError("");
                }}
                className="mt-1 h-5 w-5 shrink-0 accent-violet-300"
              />
              <span className="min-w-0">
                <span className="block font-bold text-white">
                  {intentLabel(candidate, caseRecord.reconciliation.state)}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-300">
                  {intentDescriptions[candidate]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {intent && preview?.valid ? (
        <div className="mt-6 space-y-4" aria-label="Facts AdminAvenger will use">
          <h4 className="text-lg font-bold text-white">Review the facts AdminAvenger will use</h4>

          <section aria-labelledby="care-fee-draft-source-facts" className="rounded-lg border border-white/15 bg-slate-950/55 p-4">
            <h5 id="care-fee-draft-source-facts" className="font-bold uppercase tracking-wide text-slate-100">
              From your records
            </h5>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-200">
              {preview.context.sourceFacts.map((fact) => (
                <li key={`${fact.recordLabel}-${fact.field}`}>{sourceFactText(fact)}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="care-fee-draft-confirmed-facts" className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.05] p-4">
            <h5 id="care-fee-draft-confirmed-facts" className="font-bold uppercase tracking-wide text-cyan-50">
              You confirmed
            </h5>
            {preview.context.userConfirmedFacts.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-cyan-50/90">
                {preview.context.userConfirmedFacts.map((fact) => (
                  <li key={`${fact.context.dimension}-${fact.contextIndex}`}>
                    {userConfirmedFactText(fact)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                No separate user-confirmed context will be stated as a source fact.
              </p>
            )}
          </section>

          <section aria-labelledby="care-fee-draft-derived-facts" className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
            <h5 id="care-fee-draft-derived-facts" className="font-bold uppercase tracking-wide text-emerald-50">
              AdminAvenger comparison
            </h5>
            <DerivedFactReview context={preview.context} />
          </section>

          <section aria-labelledby="care-fee-draft-user-input" className="rounded-lg border border-violet-300/20 bg-violet-300/[0.05] p-4">
            <h5 id="care-fee-draft-user-input" className="font-bold uppercase tracking-wide text-violet-50">
              Drafting input
            </h5>
            <label htmlFor="care-fee-draft-recipient" className="mt-3 block text-sm font-bold text-violet-50">
              Recipient or organisation label (optional)
            </label>
            <input
              id="care-fee-draft-recipient"
              type="text"
              value={recipientLabel}
              maxLength={160}
              onChange={(event) => {
                setRecipientLabel(event.target.value);
                setPreparationError("");
              }}
              aria-describedby="care-fee-draft-recipient-help"
              className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
            />
            <p id="care-fee-draft-recipient-help" className="mt-2 text-xs leading-5 text-violet-50/75">
              Enter a name only. This is user-entered drafting input, not source evidence or saved-case truth. If left blank, the greeting is Hello,
            </p>
          </section>
        </div>
      ) : null}

      {intent ? (
        <button
          ref={prepareButtonRef}
          type="button"
          onClick={startPreparation}
          className="mt-6 min-h-11 w-full rounded-lg bg-violet-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 sm:w-auto"
        >
          Prepare draft
        </button>
      ) : null}

      {inputsChanged ? (
        <p role="status" className="mt-3 text-sm leading-6 text-amber-100">
          Your prepared draft has not changed. Choose Prepare draft to use the new purpose or recipient label.
        </p>
      ) : null}

      {confirmingReprepare ? (
        <section role="region" aria-labelledby="care-fee-draft-replace-heading" className="mt-5 rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-4">
          <h4
            id="care-fee-draft-replace-heading"
            ref={replaceHeadingRef}
            tabIndex={-1}
            className="font-bold text-amber-50 outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
          >
            Replace your edits with a newly prepared draft?
          </h4>
          <p className="mt-2 text-sm leading-6 text-amber-50/90">
            Re-preparing will discard your current subject and body edits. Nothing will be sent.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={prepareNow} className="min-h-11 rounded-lg bg-amber-300 px-4 py-3 font-bold text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100">
              Replace my edits
            </button>
            <button type="button" onClick={cancelReprepare} className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-200">
              Keep my edits
            </button>
          </div>
        </section>
      ) : null}

      {preparationError ? (
        <p role="alert" className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-100">
          {preparationError}
        </p>
      ) : null}

      {preparedDraft ? (
        <section aria-labelledby="care-fee-prepared-draft-heading" className="mt-6 min-w-0 rounded-xl border border-emerald-300/25 bg-slate-950/65 p-4 sm:p-5">
          <h4
            id="care-fee-prepared-draft-heading"
            ref={preparedHeadingRef}
            tabIndex={-1}
            className="text-xl font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            Review and edit your prepared draft
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            AdminAvenger prepared the starting text. Any changes you make are your wording and do not change the saved facts or audit references.
          </p>
          <p id="care-fee-draft-no-send" className="mt-2 text-sm font-bold text-amber-100">
            Nothing has been sent.
          </p>

          {evidenceReview ? (
            <CareFeePreparedMessageEvidenceReview
              review={evidenceReview}
              currentSavedCase={caseRecord}
            />
          ) : null}

          <label htmlFor="care-fee-draft-subject" className="mt-5 block text-sm font-bold text-white">
            Subject
          </label>
          <input
            id="care-fee-draft-subject"
            type="text"
            value={editedSubject}
            onChange={(event) => {
              setEditedSubject(event.target.value);
              setCopyStatus("idle");
            }}
            aria-describedby="care-fee-draft-no-send"
            className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          />

          <label htmlFor="care-fee-draft-body" className="mt-4 block text-sm font-bold text-white">
            Message
          </label>
          <textarea
            id="care-fee-draft-body"
            value={editedBody}
            onChange={(event) => {
              setEditedBody(event.target.value);
              setCopyStatus("idle");
            }}
            aria-describedby="care-fee-draft-no-send care-fee-draft-sensitive-edit"
            rows={14}
            className="mt-2 w-full min-w-0 resize-y rounded-lg border border-white/20 bg-slate-900 px-3 py-3 text-sm leading-6 text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          />
          <p id="care-fee-draft-sensitive-edit" className="mt-2 text-xs leading-5 text-slate-400">
            Your edits may add sensitive information. This draft remains temporary and local to this page.
          </p>
          {hasEdits ? (
            <p className="mt-2 text-xs font-semibold text-cyan-100">
              Edited by you. The audit references still explain only the original prepared wording.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void copyEditedDraft()}
            disabled={evidenceReview?.savedSnapshotMatchStatus !== "matches_saved_snapshot"}
            className="mt-5 min-h-11 w-full rounded-lg bg-emerald-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100 sm:w-auto"
          >
            Copy text
          </button>
          {copyStatus === "copied" ? (
            <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm font-semibold text-emerald-100">
              {COPY_BUTTON_SUCCESS_STATUS_MESSAGE}
            </p>
          ) : null}
          {copyStatus === "error" ? (
            <p role="alert" className="mt-3 text-sm font-semibold text-rose-100">
              {COPY_BUTTON_FAILURE_MESSAGE} Your text is still available above.
            </p>
          ) : null}

        </section>
      ) : null}
    </section>
  );
}
