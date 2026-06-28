import { Sidebar } from "./Sidebar";
import type { AppView } from "./Sidebar";
import type { ReactNode } from "react";

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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_30rem),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.78))]">
        <div className="lg:flex">
          <Sidebar
            currentView={currentView}
            onNavigate={onNavigate}
            caseCount={caseCount}
            findingCount={findingCount}
          />
          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1920px] px-5 py-6 lg:px-8 lg:py-8">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
