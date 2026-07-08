import type { AdminCase, AdminDraft } from "../types";
import { CopyButton } from "./CopyButton";

type DraftPanelProps = {
  adminCase?: AdminCase;
  draft?: AdminDraft;
  onGenerateDraft: (adminCase: AdminCase) => Promise<void>;
  isGeneratingDraft: boolean;
  errorMessage?: string;
};

export function DraftPanel({
  adminCase,
  draft,
  onGenerateDraft,
  isGeneratingDraft,
  errorMessage,
}: DraftPanelProps) {
  if (!adminCase) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Case draft</h2>
        <p className="mt-2 text-base leading-7 text-slate-400">
          Pick a case to generate a ready-to-edit reply or chase message.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
            Message
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            AdminAvenger can prepare the message. You review and approve before anything is sent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onGenerateDraft(adminCase)}
          disabled={isGeneratingDraft}
          className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          {isGeneratingDraft ? "Preparing..." : "Prepare message"}
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          {errorMessage}
        </p>
      ) : null}

      {draft ? (
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Subject
            </p>
            <p className="mt-1 rounded-lg border border-white/10 bg-slate-950/70 p-3 text-base text-slate-200">
              {draft.subject}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Body</p>
            <p className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm leading-6 text-slate-300">
              {draft.body}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Next step
              </p>
              <p className="mt-1 text-sm text-slate-300">{draft.recommendedNextStep}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Chase after
              </p>
              <p className="mt-1 text-sm text-slate-300">{draft.chaseAfterDays} days</p>
            </div>
          </div>

          <CopyButton
            label="message"
            className="min-h-9 rounded-lg border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            getText={() => `Subject: ${draft.subject}\n\n${draft.body}`}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/70 p-4">
          <p className="text-sm leading-6 text-slate-400">
            No message prepared yet. Use the button above to create editable wording for this case.
          </p>
        </div>
      )}
    </section>
  );
}
