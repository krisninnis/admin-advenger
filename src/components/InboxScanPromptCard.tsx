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
            Optional · sample preview
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">
            Try the inbox scan preview
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Inbox scan preview uses sample emails only. No Gmail, Outlook, or email account is
            connected. It shows how AdminAvenger would spot refunds, subscriptions, price rises,
            deadlines, risky emails, and possible money recovery. Real inbox connection is not part
            of this private beta yet — for now you can paste emails manually or try the sample
            preview.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Try sample preview
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
        Sample preview only. No Gmail, Outlook, or email account is connected. Nothing is sent,
        deleted, or changed.
      </p>
    </section>
  );
}
