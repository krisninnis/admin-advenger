import { Dashboard } from "../components/Dashboard";
import { StatusBadge } from "../components/StatusBadge";
import type { AppView } from "../components/Sidebar";
import type { AdminCase, AdminFinding } from "../types";

type DashboardViewProps = {
  findings: AdminFinding[];
  cases: AdminCase[];
  onNavigate: (view: AppView) => void;
  onOpenCase: (caseId: string) => void;
};

export function DashboardView({ findings, cases, onNavigate, onOpenCase }: DashboardViewProps) {
  const recentCases = [...cases]
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Dashboard</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Your admin command centre</h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-slate-400">
            A calm overview of what AdminAvenger has prepared, what needs chasing, and what is
            already closed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("add_item")}
          className="rounded-lg bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Paste something
        </button>
      </header>

      <Dashboard findings={findings} cases={cases} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Recent cases</h3>
              <p className="mt-1 text-sm text-slate-400">Pick up the newest admin loops.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("cases")}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-300/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              View all
            </button>
          </div>

          {recentCases.length > 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {recentCases.map((adminCase) => (
                <article key={adminCase.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-white">{adminCase.title}</h4>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                        {adminCase.summary}
                      </p>
                    </div>
                    <StatusBadge status={adminCase.status} />
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCase(adminCase.id)}
                    className="mt-4 w-full rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2.5 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                  >
                    Open case file
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-5 text-sm leading-6 text-slate-400">
              No cases yet. Paste something or analyse a demo scenario to create your first case file.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
          <h3 className="text-xl font-semibold text-white">Quick actions</h3>
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => onNavigate("add_item")}
              className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Paste something new
            </button>
            <button
              type="button"
              onClick={() => onNavigate("cases")}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Review cases
            </button>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Manage local data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
