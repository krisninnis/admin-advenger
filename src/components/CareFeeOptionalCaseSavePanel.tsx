import { useEffect, useRef, useState } from "react";
import type { CareFeeCaseSaveResult } from "../lib/careFeeCase";

type CareFeeOptionalCaseSavePanelProps = {
  readonly onSave: () => Promise<CareFeeCaseSaveResult>;
};

type SaveState = "idle" | "saving" | "saved" | "duplicate" | "failed";

export function CareFeeOptionalCaseSavePanel({ onSave }: CareFeeOptionalCaseSavePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const saveInProgressRef = useRef(false);

  useEffect(() => {
    if (confirming) confirmationHeadingRef.current?.focus();
  }, [confirming]);

  const openConfirmation = () => {
    setMessage("");
    setSaveState("idle");
    setConfirming(true);
  };

  const cancel = () => {
    setConfirming(false);
    setMessage("");
    setSaveState("idle");
    triggerRef.current?.focus();
  };

  const save = async () => {
    if (saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setSaveState("saving");
    setMessage("");

    try {
      const result = await onSave();
      if (result.status === "failed") {
        setSaveState("failed");
        setMessage(result.message);
      } else if (result.status === "saved") {
        setSaveState("saved");
        setMessage("Care Fee case saved locally.");
        setConfirming(false);
      } else {
        setSaveState("duplicate");
        setMessage("This comparison is already saved.");
        setConfirming(false);
      }
    } catch {
      setSaveState("failed");
      setMessage("The case could not be saved locally. Nothing was saved.");
    } finally {
      saveInProgressRef.current = false;
    }
  };

  return (
    <section
      aria-labelledby="care-fee-optional-case-heading"
      className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 sm:p-5"
    >
      <h3 id="care-fee-optional-case-heading" className="text-xl font-bold text-cyan-50">
        Keep this comparison locally
      </h3>
      <p className="mt-2 text-sm leading-6 text-cyan-50/85">
        Saving is optional. Nothing is saved merely because the comparison completed.
      </p>

      <button
        ref={triggerRef}
        type="button"
        onClick={openConfirmation}
        disabled={saveState === "saving" || saveState === "saved" || saveState === "duplicate"}
        className="mt-4 min-h-11 w-full rounded-lg bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        Save this comparison as a case
      </button>

      {confirming ? (
        <div
          role="region"
          aria-labelledby="care-fee-save-confirmation-heading"
          className="mt-5 rounded-lg border border-white/15 bg-slate-950/70 p-4"
        >
          <h4
            id="care-fee-save-confirmation-heading"
            ref={confirmationHeadingRef}
            tabIndex={-1}
            className="text-lg font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Save a local Care Fee case?
          </h4>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            This will save the two selected record excerpts, their source details, the context you
            confirmed, and this comparison result in this browser.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-300">
            <li>It will not contact anyone.</li>
            <li>It will not prepare or send a message.</li>
            <li>It will not start a chase.</li>
            <li>It will not count money as saved or recovered.</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-amber-100/90">
            Saved locally in this browser. Browser localStorage is not encrypted, and other users
            of the same browser profile may be able to access it. Clear local data removes saved
            Care Fee cases.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saveState === "saving"}
              className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-wait disabled:opacity-60"
            >
              {saveState === "saving" ? "Saving locally…" : "Save local case"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saveState === "saving"}
              className="min-h-11 rounded-lg border border-white/20 px-4 py-3 font-bold text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          role={saveState === "failed" ? "alert" : "status"}
          aria-live={saveState === "failed" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
            saveState === "failed"
              ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
