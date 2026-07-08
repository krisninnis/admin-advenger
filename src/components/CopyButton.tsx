import { useEffect, useRef, useState } from "react";
import {
  copyTextToClipboard,
  getCopyButtonLabel,
  getCopyButtonStatusMessage,
  type ClipboardLike,
  type CopyButtonStatus,
} from "../lib/copyToClipboard";

// Copy Actions v1 - a reusable "Copy" button for draft/checklist text the
// user already sees on screen. This never sends, uploads, or submits
// anything - it only writes the given text to the user's own clipboard so
// they can paste it wherever they choose. AdminAvenger helps prepare. You
// stay in control.

type CopyButtonProps = {
  // A function rather than a plain string, so the exact text copied is only
  // computed at click time - always the current, visible draft/checklist
  // text for the section this button sits in, never anything hidden or
  // stale.
  getText: () => string;
  // What this button is copying, for the accessible name, e.g.
  // "draft reply" or "evidence checklist". Falls back to a generic label.
  label?: string;
  className?: string;
  // Injectable for tests only - defaults to the real browser clipboard.
  clipboard?: ClipboardLike;
};

export function CopyButton({ getText, label, className, clipboard }: CopyButtonProps) {
  const [status, setStatus] = useState<CopyButtonStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    },
    [],
  );

  const handleCopy = async () => {
    const text = getText();
    const result = await copyTextToClipboard(text, clipboard);

    setStatus(result);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    if (result === "copied") {
      resetTimerRef.current = setTimeout(() => setStatus("idle"), 1800);
    }
  };

  const accessibleName = label ? `Copy ${label}` : "Copy";

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        aria-label={accessibleName}
        className={
          className ??
          "min-h-9 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-emerald-300/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
        }
      >
        {getCopyButtonLabel(status)}
      </button>
      {status !== "idle" ? (
        <span
          role="status"
          className={
            status === "copied"
              ? "text-xs font-semibold text-emerald-200"
              : "text-xs font-semibold text-amber-200"
          }
        >
          {getCopyButtonStatusMessage(status)}
        </span>
      ) : null}
    </span>
  );
}
