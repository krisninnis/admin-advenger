import { AddAdminItem } from "../components/AddAdminItem";
import type { AdminItemFormValues } from "../components/AddAdminItem";
import { DemoScenarios } from "../components/DemoScenarios";
import type { DemoScenario } from "../data/demoScenarios";
import type { ServiceStatus } from "../services/analysisService";
import type { SourceType } from "../types";

type AddItemViewProps = {
  formValues: AdminItemFormValues;
  onFormValuesChange: (values: AdminItemFormValues) => void;
  onAnalyse: (title: string, sourceType: SourceType, rawText: string) => Promise<boolean>;
  scenarios: DemoScenario[];
  onLoadScenario: (scenario: DemoScenario) => void;
  onAnalyseScenario: (scenario: DemoScenario) => Promise<void>;
  analysisStatus: ServiceStatus;
  analysisError?: string;
};

export function AddItemView({
  formValues,
  onFormValuesChange,
  onAnalyse,
  scenarios,
  onLoadScenario,
  onAnalyseScenario,
  analysisStatus,
  analysisError,
}: AddItemViewProps) {
  const isAnalysing = analysisStatus === "loading";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Paste something
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          What do you need help with?
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Paste an email, message, bill, or letter. AdminAvenger will prepare a case. You decide
          what happens next. Take a screenshot later is on the roadmap; for now, paste the readable
          text.
        </p>
      </header>

      <section className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-5 shadow-xl shadow-slate-950/10">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-200">
          Next validation focus
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          Broadband/mobile price-rise letters
        </h3>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-50/80">
          Paste a provider email or price-rise notice. AdminAvenger should help work out what
          changed, what evidence is missing, and what to do next. This is not live legal or
          financial advice, and the user remains in control.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(380px,0.78fr)_minmax(0,1.22fr)]">
        <AddAdminItem
          onAnalyse={onAnalyse}
          isAnalysing={isAnalysing}
          errorMessage={analysisError}
          values={formValues}
          onValuesChange={onFormValuesChange}
        />
        <DemoScenarios
          scenarios={scenarios}
          isAnalysing={isAnalysing}
          onLoadScenario={onLoadScenario}
          onAnalyseScenario={onAnalyseScenario}
        />
      </div>
    </div>
  );
}
