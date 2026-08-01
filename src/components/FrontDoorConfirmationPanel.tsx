import type {
  FrontDoorChoiceId,
  FrontDoorRouteView,
} from "../lib/frontDoorIntent/frontDoorRouteView";

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
}: {
  onBack: () => void;
  onCheckAsMessage: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={onBack} className={quietButtonClass}>
        Go back
      </button>
      <button type="button" onClick={onCheckAsMessage} className={quietButtonClass}>
        Just check this as a message
      </button>
    </div>
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
      <p className="mt-2 text-sm leading-6 text-slate-200">{view.question}</p>
      <div className="mt-3 flex flex-col gap-2">
        {view.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChoose(choice.id)}
            aria-pressed={selectedChoiceId === choice.id}
            className={
              selectedChoiceId === choice.id ? selectedButtonClass : primaryButtonClass
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
      <OriginalInput text={view.originalInput} />
      <Exits onBack={onBack} onCheckAsMessage={onCheckAsMessage} />
    </section>
  );
}
