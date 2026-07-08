export type AppView =
  | "home"
  | "savings"
  | "dashboard"
  | "add_item"
  | "cases"
  | "case_file"
  | "validation"
  | "covenant"
  | "trust_safety"
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
  { view: "home", label: "Check a message", helper: "Paste a bill, email, or message" },
  { view: "cases", label: "Saved items", helper: "Come back to saved items" },
  { view: "savings", label: "Money tracker", helper: "Savings, refunds, and progress" },
];

export function Sidebar({ currentView, onNavigate, caseCount, findingCount }: SidebarProps) {
  return (
    <aside className="hidden h-full flex-col border-white/10 bg-slate-950/85 px-4 py-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:border-r lg:w-72">
      <div className="flex flex-col items-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 py-4 text-center">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 flex-none rounded-xl shadow-lg shadow-slate-950/40 ring-1 ring-white/10"
        />
        <h1 className="mt-3 text-lg font-black tracking-tight text-white">AdminAvenger</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">
          Your AI fights the boring battles for you.
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          AI remembers. AI explains. Humans decide.
        </p>
      </div>

      <nav aria-label="Primary navigation" className="mt-4 grid gap-2">
        {navItems.map((item) => {
          const isActive = item.view === currentView;

          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              aria-current={isActive ? "page" : undefined}
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

      <div className="mt-auto space-y-3 pt-4">
        <button
          type="button"
          onClick={() => onNavigate("trust_safety")}
          aria-current={currentView === "trust_safety" ? "page" : undefined}
          className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
            currentView === "trust_safety"
              ? "border-emerald-300/60 bg-emerald-300/12 text-white"
              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:text-white"
          }`}
        >
          Trust &amp; safety
        </button>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          aria-current={currentView === "settings" ? "page" : undefined}
          className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-300/40 ${
            currentView === "settings"
              ? "border-emerald-300/60 bg-emerald-300/12 text-white"
              : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:text-white"
          }`}
        >
          Settings
        </button>
        <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cases</p>
          <p className="mt-1 text-2xl font-bold text-white">{caseCount}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Found</p>
          <p className="mt-1 text-2xl font-bold text-white">{findingCount}</p>
        </div>
        </div>
      </div>
    </aside>
  );
}
