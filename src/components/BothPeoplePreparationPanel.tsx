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
  canContinueCarerNeedsIntake,
  type ChangeId,
  type DifficultyId,
  type FrequencyId,
  type IntakeOption,
} from "../lib/carerNeedsIntake/carerNeedsIntake";
import {
  BOTH_PEOPLE_PREPARATION_COPY,
  bothPeoplePreparationReducer,
  bothPeoplePreparationSummaryText,
  buildBothPeoplePreparationSummary,
  createBothPeoplePreparationState,
  type BothPeopleFirstSideChoice,
} from "../lib/bothPeoplePreparation/bothPeoplePreparation";
import {
  HELP_PROVIDED_OPTIONS,
  IMPACT_OPTIONS,
  SUPPORT_FREQUENCY_OPTIONS,
  SUPPORTER_NEEDS_INTAKE_COPY,
  canContinueSupporterNeedsIntake,
  type HelpProvidedId,
  type SupportFrequencyId,
  type SupportImpactId,
  type SupporterIntakeOption,
} from "../lib/supporterNeedsIntake/supporterNeedsIntake";

type BothPeoplePreparationPanelProps = {
  personLabel: string;
  originalInput: string;
  onReturnToOriginalMessage: () => void;
};

type Option<Id extends string> = IntakeOption<Id> | SupporterIntakeOption<Id>;

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
  options: readonly Option<Id>[];
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
        {BOTH_PEOPLE_PREPARATION_COPY.continueLabel}
      </button>
      <button type="button" onClick={onBack} className={quietButtonClass}>
        {BOTH_PEOPLE_PREPARATION_COPY.backLabel}
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

export function BothPeoplePreparationPanel({
  personLabel,
  originalInput,
  onReturnToOriginalMessage,
}: BothPeoplePreparationPanelProps) {
  const [state, dispatch] = useReducer(
    bothPeoplePreparationReducer,
    { personLabel, originalInput },
    (seed) => createBothPeoplePreparationState(seed.personLabel, seed.originalInput),
  );
  const focusStepKey =
    state.step === "supported_person_intake"
      ? `${state.step}:${state.supportedPerson.step}`
      : state.step === "supporter_intake"
        ? `${state.step}:${state.supporter.step}`
        : state.step;
  const { focusTargetRef, focusCurrentStep } =
    useCarePathStepFocus(focusStepKey);
  const { guidance, guidanceId, showGuidance, clearGuidance } =
    useCarePathIncompleteGuidance(focusStepKey);

  const goBack = () => {
    clearGuidance();
    dispatch({ type: "back" });
  };
  const select = (action: Parameters<typeof dispatch>[0]) => {
    clearGuidance();
    dispatch(action);
  };
  const continueQuestion = (
    choiceType: CarePathChoiceType,
    canContinue: boolean,
    action: Parameters<typeof dispatch>[0],
  ) => {
    if (!canContinue) {
      showGuidance(choiceType);
      focusCurrentStep();
      dispatch(action);
      return;
    }
    clearGuidance();
    dispatch(action);
  };

  if (state.step === "orientation") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => dispatch({ type: "continue" })}
          className={primaryButtonClass}
        >
          {BOTH_PEOPLE_PREPARATION_COPY.offerLabel}
        </button>
      </div>
    );
  }

  if (state.step === "choose_first") {
    return (
      <section className={sectionClass} aria-label={BOTH_PEOPLE_PREPARATION_COPY.chooseFirstHeading}>
        <ChoiceGroup
          legend={BOTH_PEOPLE_PREPARATION_COPY.chooseFirstHeading}
          options={BOTH_PEOPLE_PREPARATION_COPY.chooseFirstOptions}
          type="radio"
          name="both-people-first-side"
          isSelected={(id: BothPeopleFirstSideChoice) => state.firstSideChoice === id}
          onSelect={(side: BothPeopleFirstSideChoice) =>
            select({ type: "choose_first_side", side })
          }
          focusTargetRef={focusTargetRef}
          guidance={guidance}
          guidanceId={guidanceId}
        />
        <StepButtons
          onBack={goBack}
          onContinue={() =>
            continueQuestion(
              "radio",
              state.firstSideChoice !== undefined,
              { type: "continue" },
            )
          }
        />
      </section>
    );
  }

  if (state.step === "supported_person_intake") {
    const nested = state.supportedPerson;
    const nestedContinue = (choiceType: CarePathChoiceType) =>
      continueQuestion(
        choiceType,
        canContinueCarerNeedsIntake(nested),
        { type: "supported_person_event", event: { type: "continue" } },
      );

    if (nested.step === "difficulties") {
      return (
        <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.difficultiesHeading}>
          <ChoiceGroup
            legend={NEEDS_INTAKE_COPY.difficultiesHeading}
            instruction={NEEDS_INTAKE_COPY.difficultiesInstruction}
            options={DIFFICULTY_OPTIONS}
            type="checkbox"
            name="both-supported-difficulty"
            isSelected={(id: DifficultyId) => nested.difficulties.includes(id)}
            onSelect={(difficultyId: DifficultyId) =>
              select({
                type: "supported_person_event",
                event: { type: "toggle_difficulty", difficultyId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("checkbox")} />
        </section>
      );
    }

    if (nested.step === "change") {
      return (
        <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.changeHeading}>
          <ChoiceGroup
            legend={NEEDS_INTAKE_COPY.changeHeading}
            options={CHANGE_OPTIONS}
            type="radio"
            name="both-supported-change"
            isSelected={(id: ChangeId) => nested.change === id}
            onSelect={(changeId: ChangeId) =>
              select({
                type: "supported_person_event",
                event: { type: "choose_change", changeId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("radio")} />
        </section>
      );
    }

    if (nested.step === "frequency") {
      return (
        <section className={sectionClass} aria-label={NEEDS_INTAKE_COPY.frequencyHeading}>
          <ChoiceGroup
            legend={NEEDS_INTAKE_COPY.frequencyHeading}
            options={FREQUENCY_OPTIONS}
            type="radio"
            name="both-supported-frequency"
            isSelected={(id: FrequencyId) => nested.frequency === id}
            onSelect={(frequencyId: FrequencyId) =>
              select({
                type: "supported_person_event",
                event: { type: "choose_frequency", frequencyId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("radio")} />
        </section>
      );
    }
  }

  if (state.step === "supporter_intake") {
    const nested = state.supporter;
    const nestedContinue = (choiceType: CarePathChoiceType) =>
      continueQuestion(
        choiceType,
        canContinueSupporterNeedsIntake(nested),
        { type: "supporter_event", event: { type: "continue" } },
      );

    if (nested.step === "help_provided") {
      return (
        <section className={sectionClass} aria-label={SUPPORTER_NEEDS_INTAKE_COPY.helpHeading}>
          <ChoiceGroup
            legend={SUPPORTER_NEEDS_INTAKE_COPY.helpHeading}
            instruction={SUPPORTER_NEEDS_INTAKE_COPY.helpInstruction}
            options={HELP_PROVIDED_OPTIONS}
            type="checkbox"
            name="both-supporter-help"
            isSelected={(id: HelpProvidedId) => nested.helpProvided.includes(id)}
            onSelect={(helpId: HelpProvidedId) =>
              select({
                type: "supporter_event",
                event: { type: "toggle_help", helpId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("checkbox")} />
        </section>
      );
    }

    if (nested.step === "frequency") {
      return (
        <section className={sectionClass} aria-label={SUPPORTER_NEEDS_INTAKE_COPY.frequencyHeading}>
          <ChoiceGroup
            legend={SUPPORTER_NEEDS_INTAKE_COPY.frequencyHeading}
            options={SUPPORT_FREQUENCY_OPTIONS}
            type="radio"
            name="both-supporter-frequency"
            isSelected={(id: SupportFrequencyId) => nested.frequency === id}
            onSelect={(frequencyId: SupportFrequencyId) =>
              select({
                type: "supporter_event",
                event: { type: "choose_frequency", frequencyId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("radio")} />
        </section>
      );
    }

    if (nested.step === "impact") {
      return (
        <section className={sectionClass} aria-label={SUPPORTER_NEEDS_INTAKE_COPY.impactHeading}>
          <ChoiceGroup
            legend={SUPPORTER_NEEDS_INTAKE_COPY.impactHeading}
            instruction={SUPPORTER_NEEDS_INTAKE_COPY.impactInstruction}
            options={IMPACT_OPTIONS}
            type="checkbox"
            name="both-supporter-impact"
            isSelected={(id: SupportImpactId) => nested.impact.includes(id)}
            onSelect={(impactId: SupportImpactId) =>
              select({
                type: "supporter_event",
                event: { type: "toggle_impact", impactId },
              })
            }
            focusTargetRef={focusTargetRef}
            guidance={guidance}
            guidanceId={guidanceId}
          />
          <StepButtons onBack={goBack} onContinue={() => nestedContinue("checkbox")} />
        </section>
      );
    }
  }

  if (state.step !== "combined_summary") {
    return (
      <section className={sectionClass} aria-label="Completed preparation side">
        <h3
          ref={focusTargetRef}
          tabIndex={-1}
          data-care-path-focus-target="true"
          className={legendClass}
        >
          This side is prepared
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Continue to the other side, or go back to review these answers.
        </p>
        <StepButtons
          onBack={goBack}
          onContinue={() => dispatch({ type: "continue" })}
        />
      </section>
    );
  }

  const summary = buildBothPeoplePreparationSummary(state);
  const supported = summary.supportedPerson;
  const supporter = summary.supporter;
  const returnToOriginal = () => {
    dispatch({ type: "return_to_original" });
    onReturnToOriginalMessage();
  };

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

      <section className="mt-4 border-t border-white/10 pt-4" aria-labelledby="both-supported-heading">
        <h4 id="both-supported-heading" className="text-base font-bold text-white">
          {summary.supportedPersonHeading}
        </h4>
        <SummaryList heading={supported.difficultiesHeading} items={supported.difficulties} />
        <SummaryList heading={supported.changeHeading} items={supported.change ? [supported.change] : []} />
        <SummaryList heading={supported.frequencyHeading} items={supported.frequency ? [supported.frequency] : []} />
      </section>

      <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="both-supporter-heading">
        <h4 id="both-supporter-heading" className="text-base font-bold text-white">
          {summary.supporterHeading}
        </h4>
        <SummaryList heading={supporter.helpHeading} items={supporter.helpProvided} />
        <SummaryList heading={supporter.frequencyHeading} items={supporter.frequency ? [supporter.frequency] : []} />
        <SummaryList heading={supporter.impactHeading} items={supporter.impact} />
      </section>

      {supported.nothingChosenStatement || supporter.nothingChosenStatement ? (
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-4 text-sm leading-6 text-amber-100"
        >
          Some questions were left blank. That is fine, and you can go back and add to this at any time.
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-slate-300">{summary.separationStatement}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{summary.decisionStatement}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{summary.walesStatement}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={goBack} className={quietButtonClass}>
          {BOTH_PEOPLE_PREPARATION_COPY.backLabel}
        </button>
        <button type="button" onClick={returnToOriginal} className={quietButtonClass}>
          {BOTH_PEOPLE_PREPARATION_COPY.returnLabel}
        </button>
        <CopyButton
          getText={() => bothPeoplePreparationSummaryText(summary)}
          label="both summaries"
          className={quietButtonClass}
        />
      </div>

      {supported.nothingChosenStatement || supporter.nothingChosenStatement ? null : (
        <TrustedWalesSignpostingPanel />
      )}
    </section>
  );
}
