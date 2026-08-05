import { useReducer } from "react";
import { CopyButton } from "./CopyButton";
import {
  HELP_PROVIDED_OPTIONS,
  IMPACT_OPTIONS,
  SUPPORT_FREQUENCY_OPTIONS,
  SUPPORTER_NEEDS_INTAKE_COPY,
  buildSupporterNeedsIntakeSummary,
  initialSupporterNeedsIntakeState,
  supporterNeedsIntakeReducer,
  supporterNeedsIntakeSummaryText,
  type HelpProvidedId,
  type SupportFrequencyId,
  type SupportImpactId,
  type SupporterIntakeOption,
  type SupporterNeedsIntakeState,
} from "../lib/supporterNeedsIntake/supporterNeedsIntake";

type SupporterNeedsIntakePanelProps = {
  personLabel: string | undefined;
  originalInput: string;
  onReturnToOriginalMessage: () => void;
};

const optionRowClass =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-slate-200 transition hover:border-white/25 focus-within:ring-2 focus-within:ring-cyan-300/50";

const inputClass =
  "mt-1 h-5 w-5 flex-none accent-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60";

const primaryButtonClass =
  "min-h-11 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950";

const quietButtonClass =
  "min-h-11 rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40";

const sectionClass =
  "mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5";

const legendClass = "text-lg font-bold text-white";

function ChoiceGroup<Id extends string>({
  legend,
  instruction,
  options,
  type,
  name,
  isSelected,
  onSelect,
}: {
  legend: string;
  instruction?: string;
  options: readonly SupporterIntakeOption<Id>[];
  type: "checkbox" | "radio";
  name: string;
  isSelected: (id: Id) => boolean;
  onSelect: (id: Id) => void;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className={legendClass}>{legend}</legend>
      {instruction ? (
        <p className="mt-2 text-sm leading-6 text-slate-300">{instruction}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {options.map((option) => (
          <label key={option.id} className={optionRowClass}>
            <input
              type={type}
              name={name}
              value={option.id}
              checked={isSelected(option.id)}
              onChange={() => onSelect(option.id)}
              className={inputClass}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StepButtons({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onContinue} className={primaryButtonClass}>
        {SUPPORTER_NEEDS_INTAKE_COPY.continueLabel}
      </button>
      <button type="button" onClick={onBack} className={quietButtonClass}>
        {SUPPORTER_NEEDS_INTAKE_COPY.backLabel}
      </button>
    </div>
  );
}

function SummaryList({
  heading,
  items,
}: {
  heading: string;
  items: readonly string[];
}) {
  return (
    <>
      <h4 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
        {heading}
      </h4>
      {items.length === 0 ? (
        <p className="mt-1 text-sm leading-6 text-slate-400">Not chosen yet</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item} className="text-sm leading-6 text-slate-200">
              {item}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function SupporterNeedsIntakePanel({
  personLabel,
  originalInput,
  onReturnToOriginalMessage,
}: SupporterNeedsIntakePanelProps) {
  const [state, dispatch] = useReducer(
    supporterNeedsIntakeReducer,
    { personLabel, originalInput },
    (seed): SupporterNeedsIntakeState => ({
      ...initialSupporterNeedsIntakeState,
      personLabel: seed.personLabel,
      originalInput: seed.originalInput,
    }),
  );

  const goBack = () => dispatch({ type: "back" });
  const goOn = () => dispatch({ type: "continue" });
  const returnToOriginal = () => {
    dispatch({ type: "return_to_original" });
    onReturnToOriginalMessage();
  };

  if (state.step === "orientation") {
    return (
      <div className="mt-4">
        <button type="button" onClick={goOn} className={primaryButtonClass}>
          {SUPPORTER_NEEDS_INTAKE_COPY.offerLabel}
        </button>
      </div>
    );
  }

  if (state.step === "help_provided") {
    return (
      <section
        className={sectionClass}
        aria-label={SUPPORTER_NEEDS_INTAKE_COPY.helpHeading}
      >
        <ChoiceGroup
          legend={SUPPORTER_NEEDS_INTAKE_COPY.helpHeading}
          instruction={SUPPORTER_NEEDS_INTAKE_COPY.helpInstruction}
          options={HELP_PROVIDED_OPTIONS}
          type="checkbox"
          name="supporter-needs-help"
          isSelected={(id: HelpProvidedId) => state.helpProvided.includes(id)}
          onSelect={(helpId: HelpProvidedId) =>
            dispatch({ type: "toggle_help", helpId })
          }
        />
        <StepButtons onBack={goBack} onContinue={goOn} />
      </section>
    );
  }

  if (state.step === "frequency") {
    return (
      <section
        className={sectionClass}
        aria-label={SUPPORTER_NEEDS_INTAKE_COPY.frequencyHeading}
      >
        <ChoiceGroup
          legend={SUPPORTER_NEEDS_INTAKE_COPY.frequencyHeading}
          options={SUPPORT_FREQUENCY_OPTIONS}
          type="radio"
          name="supporter-needs-frequency"
          isSelected={(id: SupportFrequencyId) => state.frequency === id}
          onSelect={(frequencyId: SupportFrequencyId) =>
            dispatch({ type: "choose_frequency", frequencyId })
          }
        />
        <StepButtons onBack={goBack} onContinue={goOn} />
      </section>
    );
  }

  if (state.step === "impact") {
    return (
      <section
        className={sectionClass}
        aria-label={SUPPORTER_NEEDS_INTAKE_COPY.impactHeading}
      >
        <ChoiceGroup
          legend={SUPPORTER_NEEDS_INTAKE_COPY.impactHeading}
          instruction={SUPPORTER_NEEDS_INTAKE_COPY.impactInstruction}
          options={IMPACT_OPTIONS}
          type="checkbox"
          name="supporter-needs-impact"
          isSelected={(id: SupportImpactId) => state.impact.includes(id)}
          onSelect={(impactId: SupportImpactId) =>
            dispatch({ type: "toggle_impact", impactId })
          }
        />
        <StepButtons onBack={goBack} onContinue={goOn} />
      </section>
    );
  }

  const summary = buildSupporterNeedsIntakeSummary(state);

  return (
    <section className={sectionClass} aria-label={summary.heading}>
      <h3 className={legendClass}>{summary.heading}</h3>

      <h4 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
        {summary.whoHeading}
      </h4>
      <p className="mt-1 text-sm leading-6 text-slate-200">{summary.who}</p>

      <SummaryList heading={summary.helpHeading} items={summary.helpProvided} />
      <SummaryList
        heading={summary.frequencyHeading}
        items={summary.frequency ? [summary.frequency] : []}
      />
      <SummaryList heading={summary.impactHeading} items={summary.impact} />

      {summary.nothingChosenStatement ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-sm leading-6 text-amber-100"
        >
          {summary.nothingChosenStatement}
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-300">
        {summary.limitsStatement}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {summary.walesStatement}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={goBack} className={quietButtonClass}>
          {SUPPORTER_NEEDS_INTAKE_COPY.backLabel}
        </button>
        <button type="button" onClick={returnToOriginal} className={quietButtonClass}>
          {SUPPORTER_NEEDS_INTAKE_COPY.returnLabel}
        </button>
        <CopyButton
          getText={() => supporterNeedsIntakeSummaryText(summary)}
          label="preparation summary"
          className={quietButtonClass}
        />
      </div>
    </section>
  );
}
