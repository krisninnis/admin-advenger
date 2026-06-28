import { useEffect, useMemo, useState } from "react";
import {
  clearFeedbackEntries,
  clearValidationRecords,
  downloadMarkdown,
  exportFeedbackEntriesToMarkdown,
  exportValidationRecordsToMarkdown,
  loadFeedbackEntries,
  loadValidationRecords,
  saveFeedbackEntries,
  saveValidationRecords,
} from "../lib/validationStorage";
import type { FeedbackEntry, FeedbackFeatureRequest, ValidationTestRecord } from "../types";

const emptyValidationForm = {
  testerLabel: "",
  scenarioUsed: "Broadband/mobile price-rise letter",
  completedFlow: false,
  understoodAssessment: false,
  understoodConfidence: false,
  trustedDraft: false,
  knewNextStep: false,
  caredAboutProblem: false,
  wouldUseOnMobile: false,
  hesitation: "",
  blocker: "",
  notes: "",
};

const emptyFeedbackForm = {
  tryingToDo: "",
  confusedBy: "",
  usefulChange: "",
  nextFeature: "better_train_refund_flow" as FeedbackFeatureRequest,
  notes: "",
};

const featureOptions: Array<{ value: FeedbackFeatureRequest; label: string }> = [
  { value: "better_train_refund_flow", label: "Better train refund flow" },
  { value: "screenshots_photos", label: "Screenshots/photos" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "bill_increases", label: "Bill increases" },
  { value: "warranties", label: "Warranties" },
  { value: "job_follow_ups", label: "Job follow-ups" },
  { value: "other", label: "Other" },
];

const validationScenarioOptions = [
  "Broadband/mobile price-rise letter",
  "Subscription renewal",
  "Missing delivery / faulty goods",
  "Train delay refund",
];

const getCommonHesitations = (records: ValidationTestRecord[]) => {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    const hesitation = record.hesitation.trim();

    if (!hesitation) {
      return;
    }

    counts.set(hesitation, (counts.get(hesitation) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 3);
};

export function ValidationView() {
  const [validationRecords, setValidationRecords] = useState<ValidationTestRecord[]>(() =>
    loadValidationRecords(),
  );
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(() =>
    loadFeedbackEntries(),
  );
  const [validationForm, setValidationForm] = useState(emptyValidationForm);
  const [feedbackForm, setFeedbackForm] = useState(emptyFeedbackForm);

  useEffect(() => {
    saveValidationRecords(validationRecords);
  }, [validationRecords]);

  useEffect(() => {
    saveFeedbackEntries(feedbackEntries);
  }, [feedbackEntries]);

  const completedFlows = validationRecords.filter((record) => record.completedFlow).length;
  const confusedFlows = validationRecords.filter(
    (record) =>
      !record.completedFlow ||
      !record.understoodAssessment ||
      !record.understoodConfidence ||
      !record.knewNextStep,
  ).length;
  const commonHesitations = useMemo(
    () => getCommonHesitations(validationRecords),
    [validationRecords],
  );

  const updateValidationForm = (
    field: keyof typeof emptyValidationForm,
    value: string | boolean,
  ) => {
    setValidationForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateFeedbackForm = (field: keyof typeof emptyFeedbackForm, value: string) => {
    setFeedbackForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSaveValidation = () => {
    const record: ValidationTestRecord = {
      id: `validation-${crypto.randomUUID()}`,
      ...validationForm,
      testerLabel: validationForm.testerLabel.trim() || `Tester ${validationRecords.length + 1}`,
      scenarioUsed: validationForm.scenarioUsed.trim(),
      hesitation: validationForm.hesitation.trim(),
      blocker: validationForm.blocker.trim(),
      notes: validationForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setValidationRecords((currentRecords) => [record, ...currentRecords]);
    setValidationForm(emptyValidationForm);
  };

  const handleSaveFeedback = () => {
    const entry: FeedbackEntry = {
      id: `feedback-${crypto.randomUUID()}`,
      tryingToDo: feedbackForm.tryingToDo.trim(),
      confusedBy: feedbackForm.confusedBy.trim(),
      usefulChange: feedbackForm.usefulChange.trim(),
      nextFeature: feedbackForm.nextFeature,
      notes: feedbackForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setFeedbackEntries((currentEntries) => [entry, ...currentEntries]);
    setFeedbackForm(emptyFeedbackForm);
  };

  const handleClearValidation = () => {
    if (!window.confirm("Clear all validation notes from this browser?")) {
      return;
    }

    clearValidationRecords();
    setValidationRecords([]);
  };

  const handleClearFeedback = () => {
    if (!window.confirm("Clear all feedback entries from this browser?")) {
      return;
    }

    clearFeedbackEntries();
    setFeedbackEntries([]);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
          Validation
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Test Refund Avenger with real people
        </h2>
          <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Use this local worksheet to test which Money Back Avenger workflow people actually care
          about, starting with broadband/mobile price-rise letters. Nothing is sent anywhere.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <p className="text-sm text-slate-400">Tests recorded</p>
          <p className="mt-2 text-3xl font-bold text-white">{validationRecords.length}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <p className="text-sm text-slate-400">Completed flows</p>
          <p className="mt-2 text-3xl font-bold text-emerald-200">{completedFlows}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <p className="text-sm text-slate-400">Failed or confused</p>
          <p className="mt-2 text-3xl font-bold text-amber-200">{confusedFlows}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <p className="text-sm text-slate-400">Feedback entries</p>
          <p className="mt-2 text-3xl font-bold text-white">{feedbackEntries.length}</p>
        </article>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">10-person checklist</h3>
            <p className="mt-1 text-sm text-slate-400">
              Aim for ten real people using realistic money-back examples.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, index) => {
              const record = validationRecords[index];
              const isCompleted = Boolean(record?.completedFlow);

              return (
                <span
                  key={index}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    record
                      ? isCompleted
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                        : "border-amber-400/40 bg-amber-400/10 text-amber-100"
                      : "border-white/10 bg-slate-950/70 text-slate-500"
                  }`}
                >
                  Tester {index + 1}
                </span>
              );
            })}
          </div>
        </div>

        {commonHesitations.length > 0 ? (
          <div className="mt-5 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-100">
              Common hesitation notes
            </h4>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100/85">
              {commonHesitations.map(([hesitation, count]) => (
                <li key={hesitation}>
                  {hesitation} ({count})
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-4 text-sm text-slate-400">
            No hesitation patterns yet. Record a few tests and the recurring notes will appear here.
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
        <section className="rounded-lg border border-white/10 bg-slate-900/85 p-5 shadow-xl shadow-slate-950/20">
          <h3 className="text-xl font-semibold text-white">Record a test</h3>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold text-slate-300">
              Tester label
              <input
                value={validationForm.testerLabel}
                onChange={(event) => updateValidationForm("testerLabel", event.target.value)}
                placeholder="Tester 1"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Scenario used
              <select
                value={validationForm.scenarioUsed}
                onChange={(event) => updateValidationForm("scenarioUsed", event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                {validationScenarioOptions.map((scenario) => (
                  <option key={scenario} value={scenario}>
                    {scenario}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["completedFlow", "Completed the flow"],
                ["understoodAssessment", "Understood assessment"],
                ["understoodConfidence", "Understood confidence"],
                ["trustedDraft", "Trusted the draft"],
                ["knewNextStep", "Knew next step"],
                ["caredAboutProblem", "They actually cared about this problem"],
                ["wouldUseOnMobile", "Would use this on mobile"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(validationForm[field as keyof typeof emptyValidationForm])}
                    onChange={(event) =>
                      updateValidationForm(
                        field as keyof typeof emptyValidationForm,
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-emerald-400"
                  />
                  {label}
                </label>
              ))}
            </div>

            <label className="text-sm font-semibold text-slate-300">
              Where did they hesitate?
              <textarea
                rows={3}
                value={validationForm.hesitation}
                onChange={(event) => updateValidationForm("hesitation", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              What nearly stopped them?
              <textarea
                rows={3}
                value={validationForm.blocker}
                onChange={(event) => updateValidationForm("blocker", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Notes
              <textarea
                rows={4}
                value={validationForm.notes}
                onChange={(event) => updateValidationForm("notes", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveValidation}
              className="rounded-lg bg-emerald-400 px-5 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Save test notes
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-slate-950/10">
          <h3 className="text-xl font-semibold text-white">What should we improve next?</h3>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold text-slate-300">
              What were you trying to do?
              <textarea
                rows={3}
                value={feedbackForm.tryingToDo}
                onChange={(event) => updateFeedbackForm("tryingToDo", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              What confused you?
              <textarea
                rows={3}
                value={feedbackForm.confusedBy}
                onChange={(event) => updateFeedbackForm("confusedBy", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              What would make this more useful?
              <textarea
                rows={3}
                value={feedbackForm.usefulChange}
                onChange={(event) => updateFeedbackForm("usefulChange", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Which feature would you want next?
              <select
                value={feedbackForm.nextFeature}
                onChange={(event) =>
                  updateFeedbackForm("nextFeature", event.target.value as FeedbackFeatureRequest)
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                {featureOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-300">
              Free text notes
              <textarea
                rows={4}
                value={feedbackForm.notes}
                onChange={(event) => updateFeedbackForm("notes", event.target.value)}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base leading-7 text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveFeedback}
              className="rounded-lg bg-emerald-400 px-5 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Save feedback
            </button>
          </div>
        </section>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h3 className="text-lg font-semibold text-white">Validation exports</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                downloadMarkdown(
                  "refund-avenger-validation-notes.md",
                  exportValidationRecordsToMarkdown(validationRecords),
                )
              }
              className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Export validation notes
            </button>
            <button
              type="button"
              onClick={handleClearValidation}
              className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-400/15 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
            >
              Clear validation notes
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <h3 className="text-lg font-semibold text-white">Feedback exports</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                downloadMarkdown(
                  "admin-avenger-feedback.md",
                  exportFeedbackEntriesToMarkdown(feedbackEntries),
                )
              }
              className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Export feedback
            </button>
            <button
              type="button"
              onClick={handleClearFeedback}
              className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition hover:border-rose-300 hover:bg-rose-400/15 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
            >
              Clear feedback
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
