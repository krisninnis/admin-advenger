import type { DemoScenario } from "../data/demoScenarios";

type DemoScenariosProps = {
  scenarios: DemoScenario[];
  isAnalysing: boolean;
  onLoadScenario: (scenario: DemoScenario) => void;
  onAnalyseScenario: (scenario: DemoScenario) => Promise<void>;
};

const formatCategories = (scenario: DemoScenario) =>
  scenario.expectedCategories.map((category) => category.replaceAll("_", " ")).join(", ");

export function DemoScenarios({
  scenarios,
  isAnalysing,
  onLoadScenario,
  onAnalyseScenario,
}: DemoScenariosProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
      <div>
        <h2 className="text-xl font-semibold text-white">Try a demo scenario</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Fake sample data for showing how AdminAvenger prepares cases. Nothing is sent or
          connected to real services.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {scenarios.map((scenario) => (
          <article key={scenario.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <div>
              <h3 className="text-base font-semibold text-white">{scenario.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{scenario.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Expected: {formatCategories(scenario)}
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onLoadScenario(scenario)}
                className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm font-bold text-slate-200 transition hover:border-emerald-300/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
              >
                Load into form
              </button>
              <button
                type="button"
                disabled={isAnalysing}
                onClick={() => onAnalyseScenario(scenario)}
                className="rounded-lg bg-emerald-400 px-3 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {isAnalysing ? "Analysing..." : "Analyse demo"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
