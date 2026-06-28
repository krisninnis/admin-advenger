export type AppView =
  | "home"
  | "savings"
  | "dashboard"
  | "add_item"
  | "cases"
  | "case_file"
  | "validation"
  | "settings";

type SidebarProps = {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  caseCount: number;
  findingCount: number;
};

const navItems: Array<{
  view: AppView;
  label: string;
  helper: string;
}> = [
  { view: "home", label: "Home", helper: "Check something" },
  { view: "savings", label: "Savings", helper: "Money tracked" },
  { view: "cases", label: "Cases", helper: "Saved details" },
  { view: "validation", label: "Validation", helper: "Test with people" },
  { view: "settings", label: "Settings", helper: "Local data" },
  { view: "dashboard", label: "Dashboard", helper: "Advanced" },
];

export function Sidebar({ currentView, onNavigate, caseCount, findingCount }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col border-b border-white/10 bg-slate-950/85 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-4">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          AdminAvenger
        </p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-white lg:text-2xl">
          Your AI fights the boring battles for you.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          AI remembers. AI explains. Humans decide.
        </p>
      </div>

      <nav aria-label="Primary navigation" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {navItems.map((item) => {
          const isActive = item.view === currentView;

          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`rounded-lg border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
                isActive
                  ? "border-emerald-300/60 bg-emerald-300/12 text-white shadow-lg shadow-emerald-950/20"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span className="block text-sm font-bold">{item.label}</span>
              <span className="mt-1 hidden text-xs text-slate-500 sm:block">{item.helper}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 grid grid-cols-2 gap-2 lg:mt-auto">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cases</p>
          <p className="mt-1 text-2xl font-bold text-white">{caseCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Found</p>
          <p className="mt-1 text-2xl font-bold text-white">{findingCount}</p>
        </div>
      </div>
    </aside>
  );
}
