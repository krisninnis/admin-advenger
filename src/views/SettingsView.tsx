import { DataControls } from "../components/DataControls";

type SettingsViewProps = {
  onResetDemoData: () => void;
  onClearLocalData: () => void;
};

export function SettingsView({ onResetDemoData, onClearLocalData }: SettingsViewProps) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Settings / Data
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Local data controls</h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          This prototype stores cases, drafts, validation notes, feedback, and selected case state
          in this browser only.
        </p>
      </header>

      <DataControls onResetDemoData={onResetDemoData} onClearLocalData={onClearLocalData} />

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
        <h3 className="text-xl font-semibold text-white">Privacy note</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          No account, database, provider integration, autonomous agent, or action-sending workflow
          is connected. Optional local Ollama testing only contacts an AI engine running on this
          device. Clearing local data removes the saved prototype workspace, validation notes, and
          feedback from this browser. Export anything useful before clearing data you want to keep.
        </p>
      </section>
    </div>
  );
}
