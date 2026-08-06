import { useReducer } from "react";
import { CopyButton } from "./CopyButton";
import { TrustedWalesSignpostingPanel } from "./TrustedWalesSignpostingPanel";
import {
  type CarePathChoiceType,
  useCarePathIncompleteGuidance,
} from "./useCarePathIncompleteGuidance";
import { useCarePathStepFocus } from "./useCarePathStepFocus";
import {
  CHANGE_OPTIONS,
  DIFFICULTY_OPTIONS,
  FREQUENCY_OPTIONS,
  NEEDS_INTAKE_COPY,
  buildNeedsIntakeSummary,
  canContinueCarerNeedsIntake,
  carerNeedsIntakeReducer,
  initialCarerNeedsIntakeState,
  needsIntakeSummaryText,
  type CarerNeedsIntakeState,
  type ChangeId,
  type DifficultyId,
  type FrequencyId,
  type IntakeOption,
} from "../lib/carerNeedsIntake/carerNeedsIntake";

// Wales-first Carer Support Needs Intake v1, rendering.
//
// Every word and every transition is decided in
// src/lib/carerNeedsIntake/carerNeedsIntake.ts and asserted there. This file
// renders one step at a time and holds no rule of its own.
//
// The accessibility shape is the point, not decoration. One question per step,
// a real fieldset and legend around each group, checkboxes where several
// answers are allowed and radios where one is, an explicit Continue, and no
// auto-advance when an option is chosen. Somebody describing a person they
// love, on a phone, in a hurry, must be able to change their mind without the
// page moving underneath them.

type CarerNeedsIntakePanelProps = {
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
  focusTargetRef,
  guidance,
  guidanceId,
}: {
  legend: string;
  instruction?: string;
  options: readonly IntakeOption<Id>[];
  type: "checkbox" | "radio";
  name: string;
  isSelected: (id: Id) => boolean;
  onSelect: (id: Id) => void;
  focusTargetRef: (element: HTMLElement | null) => void;
  guidance: string | undefined;
  guidanceId: string;
}) {
  return (
    <fieldset
      className="border-0 p-0"
      aria-describedby={guidance ? guidanceId : undefined}
    >
      <legend
        ref={focusTargetRef}
        tabIndex={-1}
        data-care-path-focus-target="true"
        className={legendClass}
      >
        {legend}
      </legend>
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
      {guidance ? (
        <p
          id={guidanceId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-sm leading-6 text-amber-100"
        >
          {guidance}
        </p>
      ) : null}
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
        {NEEDS_INTAKE_COPY.continueLabel}
      </button>
      <button type="button" onClick={onBack} className={quietButtonClass}>
        {NEEDS_INTAKE_COPY.backLabel}
      </button>
    </div>
  );
}

function SummaryList({ heading, items }: { heading: string; items: readonly string[] }) {
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

export function CarerNeedsIntakePanel({
  personLabel,
  originalInput,
  onReturnToOriginalMessage,
}: CarerNeedsIntakePanelProps) {
  const [state, dispatch] = useReducer(
    carerNeedsIntakeReducer,
    { personLabel, originalInput },
    (seed): CarerNeedsIntakeState => ({
      ...initialCarerNeedsIntakeState,
      personLabel: seed.personLabel,
      originalInput: seed.originalInput,
    }),
  );
  const { focusTargetRef, focusCurrentStep } = useCarePathStepFocus(state.step);
  const { guidance, guidanceId, showGuidance, clearGuidance } =
    useCarePathIncompleteGuidance(state.step);

  const goBack = () => {
    clearGuidance();
    dispatch({ type: "back" });
  };
  const goOn = (choiceType?: CarePathChoiceType) => {
    if (choiceType && !canContinueCarerNeedsIntake(state)) {
      showGuidance(choiceType);
      focusCurrentStep();
      return;
    }
    clearGuidance();
    dispatch({ type: "continue" });
  };
  const select = (action: Parameters<typeof dispatch>[0]) => {
    clearGuidance();
    dispatch(action);
  };

  const returnToOriginal = () => {
    // The answers are cleared before leaving, so a half-finished picture of
    // somebody's day cannot reattach itself to a different situation later.
    dispatch({ type: "return_to_original" });
    onReturnToOriginalMessage();
  };

  if (state.step === "orientation") {
    return (
      <div className="mt-4">
        <button type="button" onClick={() => goOn()} className={primaryButtonClass}>
          {NEEDS_INTAKE_COPY.offerLabel}
        </button>
      </div>
    );
  }

  if (state.step === "difficulties") {
    return (
      <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.difficultiesHeading}>
        <ChoiceGroup
          legend={NEEDS_INTAKE_COPY.difficultiesHeading}
          instruction={NEEDS_INTAKE_COPY.difficultiesInstruction}
          options={DIFFICULTY_OPTIONS}
          type="checkbox"
          name="carer-needs-difficulty"
          isSelected={(id: DifficultyId) => state.difficulties.includes(id)}
          onSelect={(difficultyId: DifficultyId) =>
            select({ type: "toggle_difficulty", difficultyId })
          }
          focusTargetRef={focusTargetRef}
          guidance={guidance}
          guidanceId={guidanceId}
        />
        <StepButtons onBack={goBack} onContinue={() => goOn("checkbox")} />
      </section>
    );
  }

  if (state.step === "change") {
    return (
      <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.changeHeading}>
        <ChoiceGroup
          legend={NEEDS_INTAKE_COPY.changeHeading}
          options={CHANGE_OPTIONS}
          type="radio"
          name="carer-needs-change"
          isSelected={(id: ChangeId) => state.change === id}
          onSelect={(changeId: ChangeId) =>
            select({ type: "choose_change", changeId })
          }
          focusTargetRef={focusTargetRef}
          guidance={guidance}
          guidanceId={guidanceId}
        />
        <StepButtons onBack={goBack} onContinue={() => goOn("radio")} />
      </section>
    );
  }

  if (state.step === "frequency") {
    return (
      <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.frequencyHeading}>
        <ChoiceGroup
          legend={NEEDS_INTAKE_COPY.frequencyHeading}
          options={FREQUENCY_OPTIONS}
          type="radio"
          name="carer-needs-frequency"
          isSelected={(id: FrequencyId) => state.frequency === id}
          onSelect={(frequencyId: FrequencyId) =>
            select({ type: "choose_frequency", frequencyId })
          }
          focusTargetRef={focusTargetRef}
          guidance={guidance}
          guidanceId={guidanceId}
        />
        <StepButtons onBack={goBack} onContinue={() => goOn("radio")} />
      </section>
    );
  }

  const summary = buildNeedsIntakeSummary(state);

  return (
    <section className={sectionClass} aria-label={summary.heading}>
      <h3
        ref={focusTargetRef}
        tabIndex={-1}
        data-care-path-focus-target="true"
        className={legendClass}
      >
        {summary.heading}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-200">{summary.aboutLine}</p>

      <SummaryList heading={summary.difficultiesHeading} items={summary.difficulties} />
      <SummaryList
        heading={summary.changeHeading}
        items={summary.change ? [summary.change] : []}
      />
      <SummaryList
        heading={summary.frequencyHeading}
        items={summary.frequency ? [summary.frequency] : []}
      />

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

      <p className="mt-4 text-sm leading-6 text-slate-300">{summary.limitsStatement}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{summary.walesStatement}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={goBack} className={quietButtonClass}>
          {NEEDS_INTAKE_COPY.backLabel}
        </button>
        <button type="button" onClick={returnToOriginal} className={quietButtonClass}>
          {NEEDS_INTAKE_COPY.returnLabel}
        </button>
        <CopyButton
          getText={() => needsIntakeSummaryText(summary)}
          label="preparation summary"
          className={quietButtonClass}
        />
      </div>

      {summary.nothingChosenStatement ? null : <TrustedWalesSignpostingPanel />}
    </section>
  );
}
