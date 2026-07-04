import { useEffect, useRef, useState } from "react";
import type { PreparedMessageDraft } from "../types";

type PreparedMessagePanelProps = {
  draft: PreparedMessageDraft;
  onReset?: () => void;
};

function DetailList({ items, fallback }: { items: string[]; fallback: string }) {
  const visibleItems =
    items.length > 0
      ? Array.from(
          new Map(
            items.map((item) => [
              item
                .toLowerCase()
                .replaceAll("bank/card", "bank statement or card")
                .replaceAll("bank statement or card statement", "bank statement or card")
                .replace(/\s+/g, " ")
                .trim(),
              item,
            ]),
          ).values(),
        )
      : [fallback];

  return (
    <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PreparedMessagePanel({ draft, onReset }: PreparedMessagePanelProps) {
  const [editableText, setEditableText] = useState(draft.fullText);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimerRef = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined);
  const isSafetyChecklist = draft.messageType === "email_safety_checklist";

  useEffect(() => {
    setEditableText(draft.fullText);
    setCopyState("idle");
  }, [draft.fullText, draft.id]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableText);
      setCopyState("copied");
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  const handleReset = () => {
    setEditableText(draft.fullText);
    setCopyState("idle");
    onReset?.();
  };

  return (
    <section className="rounded-xl border border-cyan-300/25 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/25 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-cyan-300">
            {isSafetyChecklist ? "Safety checklist" : "Your prepared message"}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {isSafetyChecklist ? "Check before acting" : "Review and edit before sending"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {isSafetyChecklist
              ? "Do not reply to a risky email from here. Verify through official channels."
              : "Review and edit before sending. AdminAvenger has not sent anything."}
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
          You stay in control
        </span>
      </div>

      <p className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
        AdminAvenger has not sent this. You stay in control.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Suggested subject
            </p>
            <p className="mt-2 text-base font-semibold text-white">{draft.suggestedSubject}</p>
          </div>

          {draft.recipientHint ? (
            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Who to send it to
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{draft.recipientHint}</p>
            </div>
          ) : null}

          <label className="block text-sm font-bold uppercase tracking-wider text-slate-300">
            Message body
            <textarea
              value={editableText}
              onChange={(event) => {
                setEditableText(event.target.value);
                setCopyState("idle");
              }}
              rows={isSafetyChecklist ? 10 : 14}
              className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className="min-h-11 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              {copyState === "copied" ? "Copied" : "Copy message"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-11 rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            >
              Reset draft
            </button>
          </div>

          {copyState === "failed" ? (
            <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
              Copy did not work in this browser. Select the message text above and copy it manually.
            </p>
          ) : null}
        </div>

        <div className="grid content-start gap-4">
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
              Evidence included
            </h4>
            <DetailList items={draft.evidenceUsed} fallback="No specific evidence included yet." />
          </div>

          <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-100">
              Check before sending
            </h4>
            <DetailList
              items={draft.missingBeforeSending}
              fallback="Read through the message and remove anything that does not apply."
            />
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-100">
              Safety note
            </h4>
            <p className="mt-2 text-sm leading-6 text-cyan-50/90">{draft.safetyNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
