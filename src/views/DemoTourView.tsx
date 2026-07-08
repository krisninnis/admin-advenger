import { useMemo, useState } from "react";
import { BenefitsActionPackPanel } from "../components/BenefitsActionPackPanel";
import { OpportunityCardPanel } from "../components/OpportunityCardPanel";
import {
  ResultCaseSheet,
  type ResultCaseSheetAction,
} from "../components/ResultCaseSheet";
import { StrategicNextStepPanel } from "../components/StrategicNextStepPanel";
import type { AppView } from "../components/Sidebar";
import {
  buildAdviserExportPack,
  getAdviserExportFilename,
  renderAdviserExportMarkdown,
} from "../lib/adviserExportPack";
import { downloadAdviserExportMarkdown } from "../lib/adviserExportDownload";
import { buildBenefitsActionPack } from "../lib/benefitsActionPack";
import { demoScenarios } from "../lib/demoScenarios";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import { buildResultViewModel } from "../lib/resultViewModel";
import { buildStrategicNextStepPlan } from "../lib/strategicNextStep";
import type { ServiceStatus } from "../services/analysisService";
import type { AdminCase, SourceType } from "../types";
import type { HomeAnalysisResult } from "./HomeView";

type DemoTourViewProps = {
  result?: HomeAnalysisResult;
  activeDemoScenarioId?: string;
  analysisStatus: ServiceStatus;
  analysisError?: string;
  onCheck: (title: string, sourceType: SourceType, rawText: string) => Promise<boolean>;
  onClearResult: () => void;
  onActiveDemoScenarioChange: (scenarioId?: string) => void;
  onNavigate: (view: AppView) => void;
};

const categoryPriority: Record<AdminCase["category"], number> = {
  bill_increase: 0,
  refund: 1,
  subscription: 2,
  warranty: 3,
  complaint: 4,
  important_reply: 5,
  deadline: 6,
  job_application: 7,
  admin_dispute: 8,
  unknown: 9,
};

const urgencyPriority: Record<AdminCase["urgency"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const getMostImportantCase = (cases: AdminCase[]) =>
  [...cases].sort((first, second) => {
    const urgencyDifference = urgencyPriority[first.urgency] - urgencyPriority[second.urgency];

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    return categoryPriority[first.category] - categoryPriority[second.category];
  })[0];

const tourSteps = [
  "Choose a synthetic demo letter.",
  "Run the normal check.",
  "Review the result case sheet.",
  "Check dates and money against the original letter.",
  "Download an adviser pack if useful.",
  "Clear local data from Settings if needed.",
];

export function DemoTourView({
  result,
  activeDemoScenarioId,
  analysisStatus,
  analysisError,
  onCheck,
  onClearResult,
  onActiveDemoScenarioChange,
  onNavigate,
}: DemoTourViewProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(demoScenarios[0]?.id ?? "");
  const [showSupportingDetail, setShowSupportingDetail] = useState(false);
  const selectedScenario =
    demoScenarios.find((scenario) => scenario.id === selectedScenarioId) ?? demoScenarios[0];
  const activeScenario = activeDemoScenarioId
    ? demoScenarios.find((scenario) => scenario.id === activeDemoScenarioId)
    : undefined;
  const isChecking = analysisStatus === "loading";
  const primaryCase = useMemo(
    () => (result ? getMostImportantCase(result.cases) : undefined),
    [result],
  );
  const primaryFinding = result?.findings.find((finding) => finding.id === primaryCase?.findingId);
  const primaryOpportunity = primaryCase
    ? deriveOpportunityCard(primaryCase, result?.item, primaryFinding)
    : undefined;
  const benefitsActionPack = primaryCase?.decisionResult
    ? buildBenefitsActionPack(primaryCase.decisionResult, primaryOpportunity, primaryCase)
    : null;
  const strategicNextStepPlan = primaryCase
    ? buildStrategicNextStepPlan({
        decisionResult: primaryCase.decisionResult,
        benefitsActionPack,
        opportunity: primaryOpportunity,
        adminCase: primaryCase,
      })
    : undefined;
  const resultViewModel = primaryCase
    ? buildResultViewModel({
        decisionResult: primaryCase.decisionResult,
        benefitsActionPack,
        strategicNextStepPlan,
        opportunity: primaryOpportunity,
        adminCase: primaryCase,
      })
    : undefined;
  const adviserExportPack =
    primaryCase?.decisionResult && resultViewModel
      ? buildAdviserExportPack({
          decisionResult: primaryCase.decisionResult,
          resultViewModel,
          benefitsActionPack,
          strategicNextStepPlan,
        })
      : undefined;
  const restartAction: ResultCaseSheetAction = {
    label: "Try another demo",
    onClick: () => {
      onClearResult();
      onActiveDemoScenarioChange(undefined);
      setShowSupportingDetail(false);
    },
    emphasis: "quiet",
  };

  const handleRunDemo = async () => {
    if (!selectedScenario || isChecking) {
      return;
    }

    onClearResult();
    onActiveDemoScenarioChange(undefined);
    setShowSupportingDetail(false);

    const checked = await onCheck(
      `Synthetic demo: ${selectedScenario.title}`,
      "email",
      selectedScenario.inputText.trim(),
    );

    onActiveDemoScenarioChange(checked ? selectedScenario.id : undefined);
  };

  const handleDownloadAdviserPack = () => {
    if (!adviserExportPack) {
      return;
    }

    downloadAdviserExportMarkdown(
      renderAdviserExportMarkdown(adviserExportPack),
      getAdviserExportFilename(),
    );
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-cyan-200">
          Demo / tour
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Try AdminAvenger safely with synthetic examples.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-slate-300">
          Use this tour to see how AdminAvenger works without using a real
          letter. All examples here are synthetic and come from the Golden Letter
          Corpus.
        </p>
        <p className="mt-3 max-w-4xl rounded-lg border border-white/10 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-cyan-50">
          Preparation only. Nothing is sent. Nothing is submitted. AdminAvenger
          helps prepare. You stay in control.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <h3 className="text-lg font-bold text-white">How the tour works</h3>
          <ol className="mt-4 space-y-3">
            {tourSteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-6 text-slate-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate("trust_safety")}
              className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Open Trust &amp; safety
            </button>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className="min-h-10 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Open Settings
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-900/80 p-4 sm:p-5">
          <h3 className="text-lg font-bold text-white">Choose a synthetic demo letter</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            These are not real documents. They are prop examples for safe pilot
            testing.
          </p>
          <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="tour-demo-scenario">
            Demo example
            <select
              id="tour-demo-scenario"
              value={selectedScenarioId}
              onChange={(event) => setSelectedScenarioId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            >
              {demoScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title} - {scenario.category}
                </option>
              ))}
            </select>
          </label>
          {selectedScenario ? (
            <article className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-300/25 bg-slate-950/60 px-2.5 py-1 text-xs font-bold text-cyan-100">
                  Synthetic example
                </span>
                <span className="text-sm font-bold text-white">{selectedScenario.category}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedScenario.description}
              </p>
            </article>
          ) : null}
          <button
            type="button"
            onClick={() => void handleRunDemo()}
            disabled={!selectedScenario || isChecking}
            className="mt-4 min-h-12 w-full rounded-lg border border-cyan-300 bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none sm:w-auto"
          >
            {isChecking ? "Checking demo..." : "Run demo check"}
          </button>
          {analysisError ? (
            <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm leading-6 text-rose-100">
              {analysisError}
            </p>
          ) : null}
        </div>
      </section>

      {resultViewModel && activeScenario ? (
        <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/25 bg-slate-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-100">
              Synthetic demo
            </span>
            <span className="text-sm font-semibold text-white">{activeScenario.title}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-cyan-50/85">
            This result was created from a synthetic example, not a real document.
          </p>
        </section>
      ) : null}

      {resultViewModel ? (
        <ResultCaseSheet
          model={resultViewModel}
          secondaryActions={[restartAction]}
          onDownloadAdviserPack={adviserExportPack ? handleDownloadAdviserPack : undefined}
          supportingDetailsOpen={showSupportingDetail}
          onToggleSupportingDetails={() => setShowSupportingDetail((current) => !current)}
        />
      ) : null}

      {showSupportingDetail && primaryOpportunity ? (
        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-4 sm:p-5">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Supporting detail
          </p>
          <div className="mt-4 grid gap-4">
            <OpportunityCardPanel opportunity={primaryOpportunity} />
            {strategicNextStepPlan ? <StrategicNextStepPanel plan={strategicNextStepPlan} /> : null}
            {benefitsActionPack ? <BenefitsActionPackPanel pack={benefitsActionPack} /> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
