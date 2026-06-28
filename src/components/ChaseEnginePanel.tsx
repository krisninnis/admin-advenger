import { getChaseSummary } from "../lib/chaseEngine";
import type { AdminCase } from "../types";

type ChaseEnginePanelProps = {
  cases: AdminCase[];
};

type ChaseListProps = {
  title: string;
  cases: AdminCase[];
  emptyText: string;
};

function ChaseList({ title, cases, emptyText }: ChaseListProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h3>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300">
          {cases.length}
        </span>
      </div>

      {cases.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {cases.slice(0, 3).map((adminCase) => (
            <li key={adminCase.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-sm font-semibold text-slate-200">{adminCase.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {adminCase.chaseDate ? `Chase ${adminCase.chaseDate}` : "No chase date set"}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-500">{emptyText}</p>
      )}
    </article>
  );
}

export function ChaseEnginePanel({ cases }: ChaseEnginePanelProps) {
  const chaseSummary = getChaseSummary(cases);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
      <div>
        <h2 className="text-xl font-semibold text-white">Chase Engine</h2>
        <p className="mt-1 text-sm text-slate-400">
          AdminAvenger prepares the follow-up list. You decide what to chase.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ChaseList
          title="Due today"
          cases={chaseSummary.dueToday}
          emptyText="Nothing needs chasing today."
        />
        <ChaseList
          title="Overdue"
          cases={chaseSummary.overdue}
          emptyText="No overdue chase dates."
        />
        <ChaseList
          title="Upcoming"
          cases={chaseSummary.upcoming}
          emptyText="No upcoming chase dates yet."
        />
        <ChaseList
          title="Waiting without date"
          cases={chaseSummary.waitingWithoutChaseDate}
          emptyText="Every waiting case has a chase date."
        />
      </div>
    </section>
  );
}
