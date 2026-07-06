import { useState } from "react";
import {
  canAcceptTerms,
  emptyTermsCheckboxState,
  recordTermsAcceptance,
  type TermsCheckboxState,
} from "../lib/termsAcceptance";
import {
  TERMS_GATE_CORE_MESSAGE,
  TERMS_GATE_TITLE,
  declineMessage,
  gateSections,
  legalDocumentOrder,
  legalDocuments,
  requiredCheckboxCopy,
} from "../data/legalNotices";
import type { LegalDocumentId } from "../data/legalNotices";
import { LegalDocumentViewer } from "./LegalDocumentViewer";

type TermsSafetyGateProps = {
  // "blocking" = first-run/not-yet-accepted gate; nothing else in the app is
  // reachable while this is shown. "review" = Settings > "View Terms &
  // Safety Notice again" for a user who has already accepted - read-only,
  // closable, never re-blocks the app.
  mode: "blocking" | "review";
  onAccept?: () => void;
  onClose?: () => void;
};

const checkboxFields: Array<{ key: keyof TermsCheckboxState; label: string }> = [
  { key: "understandsCanBeWrong", label: requiredCheckboxCopy.understandsCanBeWrong },
  { key: "understandsNoAutoAction", label: requiredCheckboxCopy.understandsNoAutoAction },
  { key: "understandsUserResponsible", label: requiredCheckboxCopy.understandsUserResponsible },
  { key: "agreesToTerms", label: requiredCheckboxCopy.agreesToTerms },
];

export function TermsSafetyGate({ mode, onAccept, onClose }: TermsSafetyGateProps) {
  const [checkboxState, setCheckboxState] = useState<TermsCheckboxState>(
    emptyTermsCheckboxState,
  );
  const [hasDeclined, setHasDeclined] = useState(false);
  const [activeDocument, setActiveDocument] = useState<LegalDocumentId | undefined>(undefined);

  const canAccept = canAcceptTerms(checkboxState);
  const isBlocking = mode === "blocking";

  const handleToggle = (key: keyof TermsCheckboxState) => {
    setCheckboxState((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleAccept = () => {
    if (!canAccept) {
      return;
    }

    recordTermsAcceptance();
    onAccept?.();
  };

  const handleDecline = () => {
    setHasDeclined(true);
  };

  const handleReviewAgain = () => {
    setHasDeclined(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950 px-3 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center sm:px-4 sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-safety-gate-title"
    >
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 shadow-2xl shadow-slate-950/60 sm:max-h-[calc(100dvh-4rem)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
              {isBlocking ? "Before you continue" : "Terms & Safety Notice"}
            </p>
            <h1 id="terms-safety-gate-title" className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {TERMS_GATE_TITLE}
            </h1>
          </div>
          {!isBlocking ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
            >
              Close
            </button>
          ) : null}
        </div>

        {isBlocking && hasDeclined ? (
          <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-5 text-amber-50">
            <p className="text-base font-bold">{declineMessage}</p>
            <button
              type="button"
              onClick={handleReviewAgain}
              className="mt-4 min-h-11 rounded-lg border border-amber-200/40 bg-slate-950/60 px-4 py-2.5 text-sm font-bold text-amber-50 transition hover:border-amber-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-200/40"
            >
              Review Terms &amp; Safety Notice
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {TERMS_GATE_CORE_MESSAGE}
            </p>

            <div className="mt-6 grid gap-4">
              {gateSections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border border-white/10 bg-slate-950/60 p-4"
                >
                  <h2 className="text-sm font-bold text-white">{section.heading}</h2>
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-300">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span aria-hidden className="mt-0.5 shrink-0 text-slate-500">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-white">Read the full documents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {legalDocumentOrder.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveDocument(id)}
                    className="min-h-9 rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 underline decoration-slate-500 decoration-dotted underline-offset-4 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
                  >
                    {legalDocuments[id].title}
                  </button>
                ))}
              </div>
            </div>

            {isBlocking ? (
              <div className="mt-6 rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] p-4">
                <p className="text-sm font-bold text-white">Before you continue, please confirm:</p>
                <div className="mt-3 grid gap-3">
                  {checkboxFields.map((field) => (
                    <label
                      key={field.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-950/60 p-3"
                    >
                      <input
                        type="checkbox"
                        checked={checkboxState[field.key]}
                        onChange={() => handleToggle(field.key)}
                        className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-400"
                      />
                      <span className="text-sm leading-6 text-slate-200">{field.label}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400/40"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={!canAccept}
                    className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                  >
                    Accept and continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Close
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {activeDocument ? (
        <LegalDocumentViewer
          documentId={activeDocument}
          onSelectDocument={setActiveDocument}
          onClose={() => setActiveDocument(undefined)}
        />
      ) : null}
    </div>
  );
}
