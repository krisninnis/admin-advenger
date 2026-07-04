type InboxScanPromptCardProps = {
  onPreview: () => void;
  onSkip: () => void;
};

export function InboxScanPromptCard({ onPreview, onSkip }: InboxScanPromptCardProps) {
  return (
    <section className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">
            Optional · prototype preview
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">
            Want AdminAvenger to check your inbox later?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            AdminAvenger will eventually be able to scan recent emails for refunds, subscriptions,
            price rises, deadlines, risky emails, and possible money recovery. You stay in control.
            Nothing is sent, deleted, or changed without approval.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Preview inbox scan
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        >
          Skip for now
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Prototype preview only — no email account is connected yet.
      </p>
    </section>
  );
}
