import type { FormEvent } from "react";
import type { SourceType } from "../types";

export type AdminItemFormValues = {
  title: string;
  sourceType: SourceType;
  rawText: string;
};

type AddAdminItemProps = {
  onAnalyse: (title: string, sourceType: SourceType, rawText: string) => Promise<boolean>;
  isAnalysing: boolean;
  errorMessage?: string;
  values: AdminItemFormValues;
  onValuesChange: (values: AdminItemFormValues) => void;
};

const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "email", label: "Email" },
  { value: "pdf", label: "PDF" },
  { value: "receipt", label: "Receipt" },
  { value: "bill", label: "Bill" },
  { value: "note", label: "Note" },
  { value: "job_message", label: "Job message" },
  { value: "other", label: "Other" },
];

const emptyValues: AdminItemFormValues = {
  title: "",
  sourceType: "email",
  rawText: "",
};

export function AddAdminItem({
  onAnalyse,
  isAnalysing,
  errorMessage,
  values,
  onValuesChange,
}: AddAdminItemProps) {
  const canSubmit =
    values.title.trim().length > 0 && values.rawText.trim().length > 0 && !isAnalysing;

  const updateValue = <Field extends keyof AdminItemFormValues>(
    field: Field,
    value: AdminItemFormValues[Field],
  ) => {
    onValuesChange({
      ...values,
      [field]: value,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const wasAnalysed = await onAnalyse(
      values.title.trim(),
      values.sourceType,
      values.rawText.trim(),
    );

    if (wasAnalysed) {
      onValuesChange(emptyValues);
    }
  };

  return (
    <section className="rounded-lg border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          Paste an email, message, bill, or letter
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          Tell AdminAvenger what this is, then paste the text you want prepared into a case.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="item-title" className="text-sm font-medium text-slate-300">
            What should we call this?
          </label>
          <input
            id="item-title"
            value={values.title}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder="Example: Delayed train from York to London"
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>

        <div>
          <label htmlFor="source-type" className="text-sm font-medium text-slate-300">
            Where did it come from?
          </label>
          <select
            id="source-type"
            value={values.sourceType}
            onChange={(event) => updateValue("sourceType", event.target.value as SourceType)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          >
            {sourceTypes.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="raw-text" className="text-sm font-medium text-slate-300">
            Paste the text
          </label>
          <textarea
            id="raw-text"
            value={values.rawText}
            onChange={(event) => updateValue("rawText", event.target.value)}
            rows={8}
            placeholder="Paste the full email, message, bill, receipt, or letter text here..."
            className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-emerald-400 px-5 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          {isAnalysing ? "Preparing case..." : "Prepare my case"}
        </button>

        {errorMessage ? (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}
