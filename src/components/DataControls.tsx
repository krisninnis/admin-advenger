type DataControlsProps = {
  onResetDemoData: () => void;
  onClearLocalData: () => void;
};

export function DataControls({ onResetDemoData, onClearLocalData }: DataControlsProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Data controls</h2>
          <p className="mt-1 text-sm text-slate-400">
            Local browser storage keeps your demo workspace after refresh.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResetDemoData}
            className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            Reset demo data
          </button>
          <button
            type="button"
            onClick={onClearLocalData}
            className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-400/15 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
          >
            Clear all local data
          </button>
        </div>
      </div>
    </section>
  );
}
