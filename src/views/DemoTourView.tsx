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
import {
  buildCommunityHelperPack,
  type CommunityHelperPack,
  type CommunityHelperRole,
} from "../lib/communityHelperPack";
import { communityHelperDemoScenarios, type CommunityHelperDemoScenario } from "../lib/communityHelperDemoScenarios";
import {
  demoScenarios,
  standardDemoScenarios,
  workplaceDemoScenarios,
  type DemoScenario,
} from "../lib/demoScenarios";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import { buildResultViewModel, type ResultViewModel } from "../lib/resultViewModel";
import { buildStrategicNextStepPlan } from "../lib/strategicNextStep";
import {
  buildWorkplaceSupportPack,
  type WorkplaceSupportPack,
} from "../lib/workplaceSupportPack";
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

type WorkplaceDemoResult = {
  scenarioId: string;
  workplaceSupportPack: WorkplaceSupportPack;
  resultViewModel: ResultViewModel;
  adviserExportPack: ReturnType<typeof buildAdviserExportPack>;
};

// Community Helper Demo UI v1 - gated, demo-only. Mirrors WorkplaceDemoResult
// exactly: built directly from a hardcoded synthetic scenario, never from the
// classifier, and never reachable outside this Demo/tour surface. See
// docs/product/community-helper-demo-ui-v1.md.
type CommunityDemoResult = {
  scenarioId: string;
  communityHelperPack: CommunityHelperPack;
  resultViewModel: ResultViewModel;
  adviserExportPack: ReturnType<typeof buildAdviserExportPack>;
};

// Community Helper Controlled Intake v1 - a second, separate, and
// explicitly opt-in way to prepare a Community Helper pack: from text a
// person chooses to type or paste themselves, instead of a fixed synthetic
// scenario. Still reachable only through this same gated Demo/tour
// community area (never from HomeView's normal "Check a message" flow),
// still manual text only (no file, photo, camera, or OCR control anywhere
// in this panel), and still only ever builds a pack when the person
// explicitly clicks "Prepare community support notes" - never
// automatically and never on every keystroke. See
// docs/product/community-helper-controlled-intake-v1.md.
type ControlledIntakeResult = {
  communityHelperPack: CommunityHelperPack;
  resultViewModel: ResultViewModel;
  adviserExportPack: ReturnType<typeof buildAdviserExportPack>;
};

const communityHelperControlledIntakeRoleOptions: Array<{
  value: CommunityHelperRole;
  label: string;
}> = [
  { value: "for_myself", label: "For myself" },
  { value: "helping_someone", label: "Helping someone else" },
  { value: "supporting_people_at_work", label: "Supporting people through my work" },
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
  const [selectedScenarioId, setSelectedScenarioId] = useState(standardDemoScenarios[0]?.id ?? "");
  const [workplaceDemoResult, setWorkplaceDemoResult] = useState<WorkplaceDemoResult>();
  const [communityDemoResult, setCommunityDemoResult] = useState<CommunityDemoResult>();
  const [controlledIntakeText, setControlledIntakeText] = useState("");
  const [controlledIntakeRole, setControlledIntakeRole] = useState<CommunityHelperRole>("helping_someone");
  const [controlledIntakeResult, setControlledIntakeResult] = useState<ControlledIntakeResult>();
  const [showSupportingDetail, setShowSupportingDetail] = useState(false);
  const selectedScenario =
    standardDemoScenarios.find((scenario) => scenario.id === selectedScenarioId) ??
    standardDemoScenarios[0];
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
  const standardResultViewModel = primaryCase
    ? buildResultViewModel({
        decisionResult: primaryCase.decisionResult,
        benefitsActionPack,
        strategicNextStepPlan,
        opportunity: primaryOpportunity,
        adminCase: primaryCase,
      })
    : undefined;
  const standardAdviserExportPack =
    primaryCase?.decisionResult && standardResultViewModel
      ? buildAdviserExportPack({
          decisionResult: primaryCase.decisionResult,
          resultViewModel: standardResultViewModel,
          benefitsActionPack,
          strategicNextStepPlan,
        })
      : undefined;
  const workplaceSupportPack = workplaceDemoResult?.workplaceSupportPack;
  const communityHelperPack =
    communityDemoResult?.communityHelperPack ?? controlledIntakeResult?.communityHelperPack;
  const activeCommunityScenario = communityDemoResult
    ? communityHelperDemoScenarios.find((scenario) => scenario.id === communityDemoResult.scenarioId)
    : undefined;
  // Community Helper Controlled Intake v1 - true only once the user has
  // explicitly clicked "Prepare community support notes" and no synthetic
  // demo scenario result is currently showing. Used only to choose result
  // banner wording ("Controlled beta" vs "Synthetic demo") - it never
  // changes which builders run or what data is shown.
  const isControlledIntakeResultActive = Boolean(controlledIntakeResult) && !communityDemoResult;
  const resultViewModel =
    workplaceDemoResult?.resultViewModel ??
    communityDemoResult?.resultViewModel ??
    controlledIntakeResult?.resultViewModel ??
    standardResultViewModel;
  const adviserExportPack =
    workplaceDemoResult?.adviserExportPack ??
    communityDemoResult?.adviserExportPack ??
    controlledIntakeResult?.adviserExportPack ??
    standardAdviserExportPack;
  const restartAction: ResultCaseSheetAction = {
    label: "Try another demo",
    onClick: () => {
      onClearResult();
      setWorkplaceDemoResult(undefined);
      setCommunityDemoResult(undefined);
      setControlledIntakeResult(undefined);
      setControlledIntakeText("");
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
    setWorkplaceDemoResult(undefined);
    setCommunityDemoResult(undefined);
    onActiveDemoScenarioChange(undefined);
    setShowSupportingDetail(false);

    const checked = await onCheck(
      `Synthetic demo: ${selectedScenario.title}`,
      "email",
      selectedScenario.inputText.trim(),
    );

    onActiveDemoScenarioChange(checked ? selectedScenario.id : undefined);
  };

  const handleRunWorkplaceDemo = (scenario: DemoScenario) => {
    if (isChecking) {
      return;
    }

    onClearResult();
    setCommunityDemoResult(undefined);
    setShowSupportingDetail(false);

    const workplaceSupportPack = buildWorkplaceSupportPack({
      text: scenario.inputText.trim(),
    });
    const resultViewModel = buildResultViewModel({ workplaceSupportPack });
    const adviserExportPack = buildAdviserExportPack({
      resultViewModel,
      workplaceSupportPack,
    });

    setWorkplaceDemoResult({
      scenarioId: scenario.id,
      workplaceSupportPack,
      resultViewModel,
      adviserExportPack,
    });
    onActiveDemoScenarioChange(scenario.id);
  };

  // Community Helper Demo UI v1 - gated demo path only. Builds directly from
  // a hardcoded synthetic scenario the same way handleRunWorkplaceDemo does:
  // never touches the classifier, HomeView, or OCR/file intake. See
  // docs/product/community-helper-demo-ui-v1.md.
  const handleRunCommunityDemo = (scenario: CommunityHelperDemoScenario) => {
    if (isChecking) {
      return;
    }

    onClearResult();
    setWorkplaceDemoResult(undefined);
    setShowSupportingDetail(false);

    const communityHelperPack = buildCommunityHelperPack({
      text: scenario.inputText.trim(),
      role: scenario.role,
    });
    const resultViewModel = buildResultViewModel({ communityHelperPack });
    const adviserExportPack = buildAdviserExportPack({
      resultViewModel,
      communityHelperPack,
    });

    setCommunityDemoResult({
      scenarioId: scenario.id,
      communityHelperPack,
      resultViewModel,
      adviserExportPack,
    });
    onActiveDemoScenarioChange(scenario.id);
  };

  // Community Helper Controlled Intake v1 - the only place in this file
  // that builds a Community Helper pack from text the user has typed or
  // pasted themselves, rather than a fixed synthetic scenario. Only ever
  // runs when the user explicitly clicks "Prepare community support notes"
  // below - never on every keystroke, never automatically on page load or
  // navigation. Exactly mirrors handleRunCommunityDemo's own pipeline
  // (buildCommunityHelperPack -> buildResultViewModel ->
  // buildAdviserExportPack): nothing in this function calls
  // analyseAdminItem, touches the decision-engine classifier, or reads
  // OCR, a photo, or an uploaded/attached file - the only input is the
  // plain text already sitting in the controlledIntakeText state below.
  const handleRunControlledIntake = () => {
    const text = controlledIntakeText.trim();

    if (!text || isChecking) {
      return;
    }

    onClearResult();
    setWorkplaceDemoResult(undefined);
    setCommunityDemoResult(undefined);
    setShowSupportingDetail(false);

    const communityHelperPack = buildCommunityHelperPack({
      text,
      role: controlledIntakeRole,
    });
    const resultViewModel = buildResultViewModel({ communityHelperPack });
    const adviserExportPack = buildAdviserExportPack({
      resultViewModel,
      communityHelperPack,
    });

    setControlledIntakeResult({ communityHelperPack, resultViewModel, adviserExportPack });
    onActiveDemoScenarioChange(undefined);
  };

  // "Clear" - resets the pasted text and, if a controlled intake result is
  // currently showing, clears that result too. Never clears a synthetic
  // demo or workplace demo result - each entry point only ever clears its
  // own state.
  const handleClearControlledIntake = () => {
    setControlledIntakeText("");
    setControlledIntakeResult(undefined);

    if (isControlledIntakeResultActive) {
      onClearResult();
      setShowSupportingDetail(false);
    }
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

      <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Try a workplace support demo
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              These are synthetic examples. AdminAvenger helps prepare questions
              and evidence. It does not give legal or employment advice.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/25 bg-slate-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100">
            Synthetic demo
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workplaceDemoScenarios.map((scenario) => (
            <article
              key={scenario.id}
              className="rounded-lg border border-white/10 bg-slate-950/45 p-4"
            >
              <p className="text-sm font-bold text-white">{scenario.title}</p>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">
                {scenario.description}
              </p>
              <button
                type="button"
                onClick={() => handleRunWorkplaceDemo(scenario)}
                disabled={isChecking}
                className="mt-3 min-h-10 rounded-lg border border-emerald-300 bg-emerald-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-400"
              >
                Try this workplace demo
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.06] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Try a community support demo
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              These are synthetic examples for carers, support workers, OTs,
              housing officers, and other trusted helpers. AdminAvenger helps
              prepare a summary and questions. It does not assess care needs,
              safeguarding, diagnosis, capacity, eligibility, equipment, or
              adaptations.
            </p>
          </div>
          <span className="rounded-full border border-violet-300/25 bg-slate-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-100">
            Gated demo only
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {communityHelperDemoScenarios.map((scenario) => (
            <article
              key={scenario.id}
              className="rounded-lg border border-white/10 bg-slate-950/45 p-4"
            >
              <p className="text-sm font-bold text-white">{scenario.title}</p>
              <p className="mt-2 min-h-20 text-sm leading-6 text-slate-400">
                {scenario.description}
              </p>
              <button
                type="button"
                onClick={() => handleRunCommunityDemo(scenario)}
                disabled={isChecking}
                className="mt-3 min-h-10 rounded-lg border border-violet-300 bg-violet-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-400"
              >
                Try this community demo
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.05] p-4 sm:p-5">
        {/*
          Community Helper Controlled Intake v1 - a second, separate, and
          explicitly opt-in way to prepare a Community Helper pack: from
          text a person chooses to type or paste themselves, not a fixed
          synthetic scenario. Still reachable only through this same gated
          Demo/tour community area (never from HomeView's normal "Check a
          message" flow), still manual text only (no file, photo, camera,
          or OCR control anywhere in this panel), and still only ever runs
          when the person explicitly clicks "Prepare community support
          notes" below.
        */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">
              Prepare notes from text I choose to paste
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              Community support preparation. Manual text only - there is no photo, file, or document upload here.
            </p>
          </div>
          <span className="rounded-full border border-violet-300/25 bg-slate-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-100">
            Controlled beta
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-violet-50/90">
          <p>Preparation only. AdminAvenger helps prepare. You stay in control.</p>
          <p className="mt-2">This is not legal, care, medical, benefits, or safeguarding advice.</p>
          <p className="mt-2">
            AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity, eligibility, equipment, or adaptations.
          </p>
          <p className="mt-2 text-amber-100">If urgent or someone may be unsafe, contact an appropriate person or service directly.</p>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-slate-200">Who is this for?</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {communityHelperControlledIntakeRoleOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-slate-200"
              >
                <input
                  type="radio"
                  name="controlled-intake-role"
                  value={option.value}
                  checked={controlledIntakeRole === option.value}
                  onChange={() => setControlledIntakeRole(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-semibold text-slate-200" htmlFor="controlled-intake-text">
          Text to prepare from
          <textarea
            id="controlled-intake-text"
            value={controlledIntakeText}
            onChange={(event) => setControlledIntakeText(event.target.value)}
            rows={6}
            placeholder="Paste or type text here. Nothing is sent, saved, or shared until you choose to."
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-300/20"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRunControlledIntake}
            disabled={!controlledIntakeText.trim() || isChecking}
            className="min-h-11 rounded-lg border border-violet-300 bg-violet-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-700 disabled:text-slate-400"
          >
            Prepare community support notes
          </button>
          <button
            type="button"
            onClick={handleClearControlledIntake}
            className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-300/40"
          >
            Clear
          </button>
        </div>
      </section>

      {resultViewModel && communityHelperPack ? (
        <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.07] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-300/25 bg-slate-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-100">
              {isControlledIntakeResultActive ? "Controlled beta" : "Synthetic demo"}
            </span>
            <span className="text-sm font-semibold text-white">
              {isControlledIntakeResultActive ? "Prepared from text you pasted" : activeCommunityScenario?.title}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-violet-50/85">
            {isControlledIntakeResultActive
              ? "This result was prepared from text you chose to paste, in this browser only. Nothing has been sent, saved, or shared."
              : "This result was created from a synthetic example, not a real person or document."}
          </p>
          <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-violet-50">
            <p>Community support preparation. This is preparation only, not a professional assessment.</p>
            <p>
              AdminAvenger cannot decide care needs, safeguarding, diagnosis,
              capacity, eligibility, equipment, or adaptations.
            </p>
            <p>AdminAvenger helps prepare. You stay in control.</p>
            <p>
              Ask a support worker, OT, housing officer, adviser, GP or
              clinician, social worker, safeguarding professional if urgent,
              or another trusted person if you are unsure.
            </p>
            {communityHelperPack.situationType === "urgent_safeguarding_like_signpost" ? (
              <p className="mt-2 text-amber-100">
                If someone may be in immediate danger, contact emergency
                services or the relevant local safeguarding service.
                AdminAvenger cannot decide safeguarding concerns.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

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
          {workplaceSupportPack ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/45 p-3 text-sm leading-6 text-cyan-50">
              <p>This is preparation only, not legal or employment advice.</p>
              <p>AdminAvenger helps prepare. You stay in control.</p>
              <p>
                Ask ACAS, a union rep, HR, Citizens Advice, an adviser,
                solicitor where appropriate, or someone trusted if you are
                unsure.
              </p>
              {workplaceSupportPack.documentType === "settlement_agreement_signpost" ? (
                <p className="mt-2 text-amber-100">
                  Do not rely on AdminAvenger to decide what to do with a
                  settlement agreement. Ask ACAS, a union rep, solicitor,
                  Citizens Advice, or another qualified adviser.
                </p>
              ) : null}
              {workplaceSupportPack.riskWarnings.some((warning) =>
                /resignation|constructive dismissal|resign|quitting|walking out/i.test(warning),
              ) ? (
                <p className="mt-2 text-amber-100">
                  Get advice before making a resignation decision.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {resultViewModel ? (
        <ResultCaseSheet
          model={resultViewModel}
          decisionResult={primaryCase?.decisionResult}
          benefitsActionPack={benefitsActionPack}
          strategicNextStepPlan={strategicNextStepPlan}
          adviserExportPack={adviserExportPack}
          workplaceSupportPack={workplaceSupportPack}
          communityHelperPack={communityHelperPack}
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

      {showSupportingDetail && workplaceSupportPack ? (
        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-4 sm:p-5">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Workplace supporting detail
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-bold text-white">Key facts to check</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {workplaceSupportPack.keyFactsToCheck.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Human support</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {workplaceSupportPack.signposting.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {showSupportingDetail && communityHelperPack ? (
        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-4 sm:p-5">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Community support supporting detail
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-bold text-white">
                Daily-life, admin, or communication impact
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {[
                  ...communityHelperPack.dailyLifeImpact,
                  ...communityHelperPack.adminBarriers,
                  ...communityHelperPack.communicationBarriers,
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Key facts to check</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.keyFactsToCheck.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Evidence/context to gather</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.evidenceToGather.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Questions to ask</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.questionsToAsk.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Consent and control notes</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.consentAndControlNotes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">What AdminAvenger cannot know</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.cannotKnow.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Human support / signposting</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                {communityHelperPack.signposting.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
