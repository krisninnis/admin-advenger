import { useEffect, useState } from "react";
import {
  GUIDED_NEXT_STEP_SAFETY_NOTE,
  type GuidedNextStep,
  type NextStepAction,
} from "../lib/guidedNextSteps";
import {
  getGuidedDraftToSave,
  type GuidedDraftToSave,
} from "../lib/guidedDraftSave";

type GuidedNextStepPanelProps = {
  guidedNextStep: GuidedNextStep;
  onClose: () => void;
  // Only shown if the caller passes it - the existing save flow already
  // decides whether a case can be saved (HomeView only ever wires this in
  // when saving makes sense for the current result).
  onSaveToCase?: (draft?: GuidedDraftToSave) => void;
  saveToCaseLabel?: string;
};

function ChecklistSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-100">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-50/90">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden className="mt-0.5 shrink-0 text-amber-200/70">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionsSection({ title, questions }: { title: string; questions: string[] }) {
  return (
    <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-100">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-cyan-50/90">
        {questions.map((question) => (
          <li key={question} className="flex gap-2">
            <span aria-hidden className="mt-0.5 shrink-0 text-cyan-200/70">
              ?
            </span>
            <span>{question}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeadlineSection({ action }: { action: Extract<NextStepAction, { kind: "deadline_checklist" }> }) {
  // Render either the single headline deadline OR the full (already-deduped)
  // list - never both. Showing deadlineText as a standalone paragraph AND
  // then repeating it as the checklist's first bullet is what caused the
  // same deadline line to appear twice for cases with more than one deadline.
  return (
    <div className="rounded-lg border border-rose-300/25 bg-rose-300/[0.07] p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-100">{action.title}</h3>
      {action.checklist.length > 1 ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-rose-50/90">
          {action.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-semibold text-rose-50">{action.deadlineText}</p>
      )}
    </div>
  );
}

// "What could change this" - decision.uncertainty only.
function UncertaintySection({ action }: { action: Extract<NextStepAction, { kind: "uncertainty_list" }> }) {
  return (
    <div className="rounded-lg border border-sky-300/25 bg-sky-300/[0.07] p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-sky-100">{action.title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-sky-50/90">
        {action.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// "What AdminAvenger cannot know" - decision.cannotKnow only.
function CannotKnowSection({ action }: { action: Extract<NextStepAction, { kind: "cannot_know_list" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{action.title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
        {action.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function OfficialLinkSection({ action }: { action: Extract<NextStepAction, { kind: "official_link" }> }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{action.title}</h3>
      {/* Shown as a clickable label (e.g. "Citizens Advice"), not the raw URL -
          the destination is still available via href/title for anyone who
          wants to check it, but the visible text stays human-readable. */}
      <a
        href={action.url}
        target="_blank"
        rel="noreferrer"
        title={action.url}
        className="mt-2 inline-block text-sm font-bold text-emerald-300 underline decoration-emerald-500/50 underline-offset-4 hover:text-emerald-200"
      >
        {action.title}
      </a>
      {action.warning ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{action.warning}</p>
      ) : null}
    </div>
  );
}

// Renders whichever of the six non-draft action kinds is passed in. Draft
// actions are handled separately by the panel itself (they need editable
// state + a copy button), so this only ever receives the other six kinds.
function SecondaryActionSection({ action }: { action: NextStepAction }) {
  if (action.kind === "evidence_checklist") {
    return <ChecklistSection title={action.title} items={action.evidenceNeeded} />;
  }

  if (action.kind === "answer_questions") {
    return <QuestionsSection title={action.title} questions={action.questions} />;
  }

  if (action.kind === "deadline_checklist") {
    return <DeadlineSection action={action} />;
  }

  if (action.kind === "uncertainty_list") {
    return <UncertaintySection action={action} />;
  }

  if (action.kind === "cannot_know_list") {
    return <CannotKnowSection action={action} />;
  }

  if (action.kind === "official_link") {
    return <OfficialLinkSection action={action} />;
  }

  return null;
}

export function GuidedNextStepPanel({
  guidedNextStep,
  onClose,
  onSaveToCase,
  saveToCaseLabel = "Save to case",
}: GuidedNextStepPanelProps) {
  const { primaryAction, secondaryActions } = guidedNextStep;
  const isDraftPrimary = primaryAction.kind === "draft_message";
  const [draftText, setDraftText] = useState(
    isDraftPrimary ? primaryAction.body : "",
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (isDraftPrimary) {
      setDraftText(primaryAction.body);
    }
  }, [isDraftPrimary, primaryAction]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/85 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guided-next-step-title"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/50 sm:max-h-[calc(100dvh-3rem)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              Guided next step
            </p>
            <h2 id="guided-next-step-title" className="mt-2 text-xl font-bold text-white sm:text-2xl">
              {primaryAction.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            aria-label="Close guided next step"
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          {isDraftPrimary ? (
            <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
              <label htmlFor="guided-next-step-draft" className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                Draft message
              </label>
              <p className="mt-1 text-xs leading-5 text-emerald-50/70">
                Edit this before you copy or send it yourself.
              </p>
              <textarea
                id="guided-next-step-draft"
                value={draftText}
                onChange={(event) => {
                  setDraftText(event.target.value);
                  setCopyStatus("idle");
                }}
                rows={10}
                className="mt-3 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="min-h-11 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {primaryAction.copyButtonLabel}
                </button>
                {copyStatus === "copied" ? (
                  <span role="status" className="text-xs font-bold text-emerald-200">
                    Copied. Nothing has been sent.
                  </span>
                ) : null}
                {copyStatus === "error" ? (
                  <span role="status" className="text-xs font-bold text-amber-200">
                    Could not copy automatically. Select the text above and copy it manually.
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <SecondaryActionSection action={primaryAction} />
          )}

          {secondaryActions.map((action) => (
            <SecondaryActionSection key={`${action.kind}-${action.title}`} action={action} />
          ))}
        </div>

        <p className="mt-5 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-200">
          {(isDraftPrimary && primaryAction.safetyNote) || GUIDED_NEXT_STEP_SAFETY_NOTE}
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {onSaveToCase ? (
            <button
              type="button"
              onClick={() => onSaveToCase(getGuidedDraftToSave(primaryAction, draftText))}
              className="min-h-11 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              {saveToCaseLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
