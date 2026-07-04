type DataControlsProps = {
  onResetDemoData: () => void;
  onClearLocalData: () => void;
  onDownloadBackup: () => void;
  statusMessage?: string;
};

export function DataControls({
  onResetDemoData,
  onClearLocalData,
  onDownloadBackup,
  statusMessage,
}: DataControlsProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
      <div className="flex flex-col gap-4">
        <div className="grid w-full gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onDownloadBackup}
            className="min-h-11 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/15 focus:outline-none focus:ring-2 focus:ring-cyan-200/40"
          >
            Download local backup
          </button>
          <button
            type="button"
            onClick={onResetDemoData}
            className="min-h-11 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            Reset demo data
          </button>
          <button
            type="button"
            onClick={onClearLocalData}
            className="min-h-11 rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-400/15 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
          >
            Clear all local data
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-50">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
