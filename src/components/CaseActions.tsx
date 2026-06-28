import { useEffect, useState } from "react";
import { getDefaultChaseDate } from "../lib/chaseEngine";
import type { AdminCase } from "../types";

export type CaseUpdateValues = {
  title: string;
  nextAction: string;
  chaseDate?: string;
  outcome?: string;
};

type CaseActionsProps = {
  adminCase: AdminCase;
  onSaveChanges: (caseId: string, values: CaseUpdateValues) => void;
  onSetChaseDate: (caseId: string, chaseDate: string) => void;
  onMarkWaiting: (caseId: string) => void;
  onMarkChasing: (caseId: string) => void;
  onMarkChasedToday: (caseId: string) => void;
  onMarkResolved: (caseId: string, outcome?: string) => void;
  onDeleteCase: (caseId: string) => void;
};

const getInitialValues = (adminCase: AdminCase): CaseUpdateValues => ({
  title: adminCase.title,
  nextAction: adminCase.nextAction,
  chaseDate: adminCase.chaseDate ?? getDefaultChaseDate(),
  outcome: adminCase.outcome ?? "",
});

export function CaseActions({
  adminCase,
  onSaveChanges,
  onSetChaseDate,
  onMarkWaiting,
  onMarkChasing,
  onMarkChasedToday,
  onMarkResolved,
  onDeleteCase,
}: CaseActionsProps) {
  const [values, setValues] = useState<CaseUpdateValues>(() => getInitialValues(adminCase));

  useEffect(() => {
    setValues(getInitialValues(adminCase));
  }, [adminCase]);

  const updateValue = (field: keyof CaseUpdateValues, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSaveChanges(adminCase.id, {
      title: values.title.trim(),
      nextAction: values.nextAction.trim(),
      chaseDate: values.chaseDate?.trim() || undefined,
      outcome: values.outcome?.trim() || undefined,
    });
  };

  const handleMarkResolved = () => {
    onMarkResolved(adminCase.id, values.outcome?.trim() || undefined);
  };

  const handleSetChaseDate = () => {
    const chaseDate = values.chaseDate?.trim();

    if (chaseDate) {
      onSetChaseDate(adminCase.id, chaseDate);
    }
  };

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          Case actions
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Edit the human-approved plan before acting.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="case-title" className="text-sm font-semibold text-slate-200">
            Case title
          </label>
          <input
            id="case-title"
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>

        <div>
          <label htmlFor="case-next-action" className="text-sm font-semibold text-slate-200">
            Next action
          </label>
          <textarea
            id="case-next-action"
            rows={3}
            value={values.nextAction}
            onChange={(event) => updateValue("nextAction", event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>

        <div>
          <label htmlFor="case-chase-date" className="text-sm font-semibold text-slate-200">
            Chase date
          </label>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              id="case-chase-date"
              type="date"
              value={values.chaseDate ?? ""}
              onChange={(event) => updateValue("chaseDate", event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
            />
            <button
              type="button"
              onClick={handleSetChaseDate}
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2.5 text-sm font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/15 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
            >
              Set chase date
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <h4 className="text-sm font-semibold text-slate-200">Chase controls</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Prepare follow-up status without sending anything automatically.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onMarkWaiting(adminCase.id)}
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/15 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Mark waiting
            </button>
            <button
              type="button"
              onClick={() => onMarkChasing(adminCase.id)}
              className="rounded-lg border border-orange-400/40 bg-orange-400/10 px-3 py-2.5 text-sm font-bold text-orange-100 transition hover:border-orange-300 hover:bg-orange-400/15 focus:outline-none focus:ring-2 focus:ring-orange-300/40"
            >
              Mark chasing
            </button>
            <button
              type="button"
              onClick={() => onMarkChasedToday(adminCase.id)}
              className="rounded-lg border border-indigo-400/40 bg-indigo-400/10 px-3 py-2.5 text-sm font-bold text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-400/15 focus:outline-none focus:ring-2 focus:ring-indigo-300/40"
            >
              Mark chased today
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="case-outcome" className="text-sm font-semibold text-slate-200">
            Outcome note
          </label>
          <textarea
            id="case-outcome"
            rows={3}
            value={values.outcome ?? ""}
            onChange={(event) => updateValue("outcome", event.target.value)}
            placeholder="Example: Provider agreed to refund the delivery charge."
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-3 py-2.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={handleMarkResolved}
            className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
          >
            Mark resolved
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDeleteCase(adminCase.id)}
          className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-400/15 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
        >
          Delete case
        </button>
      </div>
    </section>
  );
}
