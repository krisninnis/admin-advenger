import { CarerNeedsIntakePanel } from "./CarerNeedsIntakePanel";
import { SupporterNeedsIntakePanel } from "./SupporterNeedsIntakePanel";
import { BothPeoplePreparationPanel } from "./BothPeoplePreparationPanel";
import type {
  FrontDoorChoiceId,
  FrontDoorRouteView,
} from "../lib/frontDoorIntent/frontDoorRouteView";
import { ORDINARY_MESSAGE_CHECK_LABEL } from "../lib/ordinaryMessageCheck";

// Front-Door Intent Routing v1, UI wiring slice.
//
// This component renders a FrontDoorRouteView and nothing else. Every heading,
// question, choice and piece of urgent wording is decided in the pure module
// `src/lib/frontDoorIntent/frontDoorRouteView.ts` and asserted there. Keeping
// the decision out of the component is deliberate: the copy that a worried
// person reads should not live somewhere it cannot be tested.
//
// The component never creates a case, opens a specialist journey or confirms a
// help target. It has no way to: it only calls the handlers it is given.

type FrontDoorConfirmationPanelProps = {
  view: FrontDoorRouteView;
  selectedChoiceId?: FrontDoorChoiceId;
  onChoose: (choiceId: FrontDoorChoiceId) => void;
  onBack: () => void;
  onCheckAsMessage: () => void;
};

const primaryButtonClass =
  "rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-left text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40";

const selectedButtonClass =
  "rounded-lg border border-cyan-300/60 bg-cyan-300/10 px-4 py-2.5 text-left text-sm font-bold text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-300/40";

const quietButtonClass =
  "rounded-lg border border-white/10 bg-transparent px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40";

function OriginalInput({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/60 p-3">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        What you wrote
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function Exits({
  onBack,
  onCheckAsMessage,
  backLabel = "Go back",
  ordinaryCheckLabel = ORDINARY_MESSAGE_CHECK_LABEL,
}: {
  onBack: () => void;
  onCheckAsMessage: () => void;
  backLabel?: string;
  ordinaryCheckLabel?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={onBack} className={quietButtonClass}>
        {backLabel}
      </button>
      <button type="button" onClick={onCheckAsMessage} className={quietButtonClass}>
        {ordinaryCheckLabel}
      </button>
    </div>
  );
}

/**
 * The orientation page, shown after the one question is answered.
 *
 * Four parts and two buttons. Every word comes from
 * `src/lib/frontDoorIntent/frontDoorOrientationView.ts` and is asserted there,
 * so this renders and decides nothing.
 */
function Orientation({
  view,
  onBack,
  onCheckAsMessage,
}: {
  view: Extract<FrontDoorRouteView, { kind: "orientation" }>;
  onBack: () => void;
  onCheckAsMessage: () => void;
}) {
  return (
    <section
      className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5"
      aria-label="What this may be about"
    >
      <h3 className="text-lg font-bold text-white">{view.heading}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-200">{view.interpretation}</p>

      <h4 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
        {view.nextStepHeading}
      </h4>
      <p className="mt-1 text-sm leading-6 text-slate-200">{view.nextStep}</p>

      <h4 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
        {view.gatherHeading}
      </h4>
      <ul className="mt-1 flex flex-col gap-1">
        {view.gather.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-200">
            {item}
          </li>
        ))}
      </ul>

      <h4 className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-400">
        {view.cannotDecideHeading}
      </h4>
      <ul className="mt-1 flex flex-col gap-1">
        {view.cannotDecide.map((item) => (
          <li key={item} className="text-sm leading-6 text-slate-300">
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {view.cannotContactStatement}
      </p>

      <OriginalInput text={view.originalInput} />

      {/*
        The optional needs intake, offered only where this page is about help
        for one other person. It is never opened automatically: the person has
        to press the button. Keyed on the wording so a different situation
        cannot inherit answers about a previous one.
      */}
      {view.aboutOneOtherPerson ? (
        <CarerNeedsIntakePanel
          key={view.originalInput}
          personLabel={view.personLabel}
          originalInput={view.originalInput}
          onReturnToOriginalMessage={onCheckAsMessage}
        />
      ) : null}

      {view.aboutSupporterWithNamedPerson ? (
        <SupporterNeedsIntakePanel
          key={view.originalInput}
          personLabel={view.personLabel}
          originalInput={view.originalInput}
          onReturnToOriginalMessage={onCheckAsMessage}
        />
      ) : null}

      {view.aboutBothPeopleWithNamedPerson && view.personLabel ? (
        <BothPeoplePreparationPanel
          key={view.originalInput}
          personLabel={view.personLabel}
          originalInput={view.originalInput}
          onReturnToOriginalMessage={onCheckAsMessage}
        />
      ) : null}

      <Exits
        onBack={onBack}
        onCheckAsMessage={onCheckAsMessage}
        backLabel={view.backLabel}
        ordinaryCheckLabel={view.ordinaryCheckLabel}
      />
    </section>
  );
}

export function FrontDoorConfirmationPanel({
  view,
  selectedChoiceId,
  onChoose,
  onBack,
  onCheckAsMessage,
}: FrontDoorConfirmationPanelProps) {
  // Document-shaped input is never shown this panel: it continues through the
  // existing analysis journey untouched.
  if (view.kind === "document_analysis") {
    return null;
  }

  if (view.kind === "orientation") {
    return (
      <Orientation
        view={view}
        onBack={onBack}
        onCheckAsMessage={onCheckAsMessage}
      />
    );
  }

  if (view.kind === "urgent_support") {
    return (
      <section
        className="rounded-lg border border-amber-300/30 bg-amber-300/[0.06] p-4 sm:p-5"
        aria-label="Urgent support"
      >
        <h3 className="text-lg font-bold text-white">{view.heading}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-200">{view.limitsStatement}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{view.chooseInstruction}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {view.contactOptions.map((option) => (
            <li
              key={option}
              className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm leading-6 text-slate-200"
            >
              {option}
            </li>
          ))}
        </ul>
        <OriginalInput text={view.originalInput} />
        <Exits onBack={onBack} onCheckAsMessage={onCheckAsMessage} />
      </section>
    );
  }

  return (
    <section
      className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5"
      aria-label="One quick question"
    >
      <h3 className="text-lg font-bold text-white">{view.heading}</h3>
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mt-2 text-sm leading-6 text-slate-200">
          {view.question}
        </legend>
        <div className="mt-3 flex flex-col gap-2">
          {view.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => onChoose(choice.id)}
              aria-pressed={selectedChoiceId === choice.id}
              className={
                selectedChoiceId === choice.id
                  ? selectedButtonClass
                  : primaryButtonClass
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
      </fieldset>
      <OriginalInput text={view.originalInput} />
      <Exits onBack={onBack} onCheckAsMessage={onCheckAsMessage} />
    </section>
  );
}
