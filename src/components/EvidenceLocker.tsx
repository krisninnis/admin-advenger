import type { EvidenceItem } from "../types";

type EvidenceLockerProps = {
  evidence: EvidenceItem[];
};

const sourceLabels: Record<EvidenceItem["source"], string> = {
  user_text: "User text",
  detected: "Detected",
  manual: "Manual",
};

export function EvidenceLocker({ evidence }: EvidenceLockerProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          Evidence Locker
        </h3>
        <p className="mt-1 text-sm text-slate-500">Clues attached to this case file.</p>
      </div>

      <div className="mt-4 grid gap-3">
        {evidence.map((item) => (
          <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-200">{item.label}</p>
              <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                {sourceLabels[item.source]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
