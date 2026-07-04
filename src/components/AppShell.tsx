import { Sidebar } from "./Sidebar";
import type { AppView } from "./Sidebar";
import type { ReactNode } from "react";

const mobileNavItems: Array<{
  view: AppView;
  label: string;
}> = [
  { view: "home", label: "Check" },
  { view: "cases", label: "Saved" },
  { view: "savings", label: "Money" },
];

type AppShellProps = {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  caseCount: number;
  findingCount: number;
  children: ReactNode;
};

export function AppShell({
  currentView,
  onNavigate,
  caseCount,
  findingCount,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_30rem),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.78))]">
        <div className="md:flex">
          <Sidebar
            currentView={currentView}
            onNavigate={onNavigate}
            caseCount={caseCount}
            findingCount={findingCount}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between px-4 pt-4 md:hidden">
              <span className="flex items-center gap-2">
                <img
                  src="/icons/icon-192.png"
                  alt="AdminAvenger"
                  width={28}
                  height={28}
                  className="h-7 w-7 flex-none rounded-lg ring-1 ring-white/10"
                />
                <span className="text-sm font-black tracking-tight text-white">
                  AdminAvenger
                </span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate("settings")}
                aria-current={currentView === "settings" ? "page" : undefined}
                className="min-h-11 rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
              >
                Settings
              </button>
            </div>
            <div className="mx-auto max-w-[1920px] px-4 pb-32 pt-5 sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </div>
        </div>
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 px-2 pt-2 shadow-2xl shadow-slate-950/70 backdrop-blur md:hidden"
        >
          <div className="grid grid-cols-3 gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            {mobileNavItems.map((item) => {
              const isActive =
                item.view === currentView ||
                (item.view === "cases" && currentView === "case_file");
              const badge = item.view === "cases" && caseCount > 0 ? caseCount : undefined;

              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => onNavigate(item.view)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center rounded-lg px-2 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                    isActive
                      ? "bg-emerald-300/14 text-emerald-100"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span
                    className={`mb-1 h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-300" : "bg-slate-700"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                  {badge ? (
                    <span className="absolute right-3 top-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-slate-950">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
