import type { TrustedGuidanceCard } from "../data/trustedGuidanceCards";

type TrustedGuidancePanelProps = {
  cards: TrustedGuidanceCard[];
};

export function TrustedGuidancePanel({ cards }: TrustedGuidancePanelProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Useful places to check
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          AdminAvenger provides a practical checklist and links to trusted places to check. It does
          not replace legal, financial, or consumer advice.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        {cards.map((card) => (
          <article key={card.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <h3 className="text-lg font-semibold text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{card.shortSummary}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  AdminAvenger checklist
                </h4>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                  {card.safeChecklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                  Common evidence
                </h4>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                  {card.commonEvidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-6 text-amber-50/85">
              {card.caution}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {card.usefulSourceLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
