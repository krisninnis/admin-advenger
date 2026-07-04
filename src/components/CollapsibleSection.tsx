import { useState, type ReactNode } from "react";

type CollapsibleSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: string;
  badgeTone?: "cyan" | "emerald" | "amber" | "slate";
  defaultOpen?: boolean;
  children: ReactNode;
};

const badgeToneClasses: Record<NonNullable<CollapsibleSectionProps["badgeTone"]>, string> = {
  cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  emerald: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  slate: "border-white/15 bg-white/[0.04] text-slate-200",
};

export function CollapsibleSection({
  eyebrow,
  title,
  description,
  badge,
  badgeTone = "slate",
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] shadow-xl shadow-slate-950/10">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 rounded-lg p-5 text-left focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
      >
        <span className="min-w-0">
          {eyebrow ? (
            <span className="block text-xs font-bold uppercase tracking-widest text-emerald-300">
              {eyebrow}
            </span>
          ) : null}
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold text-white">{title}</span>
            {badge ? (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeToneClasses[badgeTone]}`}
              >
                {badge}
              </span>
            ) : null}
          </span>
          {description ? (
            <span className="mt-2 block max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className={`mt-1 shrink-0 rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-bold text-slate-300 transition ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </section>
  );
}
