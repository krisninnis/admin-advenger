import { useMemo, useState } from "react";
import { createSafeMarkdownFilename, exportCaseToMarkdown } from "../lib/exportCase";
import type { TrustedGuidanceCard } from "../data/trustedGuidanceCards";
import type { AdminCase, AdminDraft, AdminFinding, AdminItem, ImpactEntry, OpportunityCard } from "../types";

type EvidencePackExportProps = {
  adminCase: AdminCase;
  item?: AdminItem;
  finding?: AdminFinding;
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
  opportunity?: OpportunityCard;
  guidanceCards: TrustedGuidanceCard[];
};

type ExportStatus = "idle" | "copied" | "downloaded" | "copy_failed";

export function EvidencePackExport({
  adminCase,
  item,
  finding,
  drafts,
  impactEntries,
  opportunity,
  guidanceCards,
}: EvidencePackExportProps) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const markdown = useMemo(
    () => exportCaseToMarkdown({ adminCase, item, finding, drafts, impactEntries, opportunity, guidanceCards }),
    [adminCase, drafts, finding, guidanceCards, impactEntries, item, opportunity],
  );

  const resetStatusSoon = () => {
    window.setTimeout(() => setStatus("idle"), 1800);
  };

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      setStatus("copy_failed");
      resetStatusSoon();
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      setStatus("copied");
      resetStatusSoon();
    } catch {
      setStatus("copy_failed");
      resetStatusSoon();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = createSafeMarkdownFilename(adminCase.title);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setStatus("downloaded");
    resetStatusSoon();
  };

  const statusMessage =
    status === "copied"
      ? "Evidence pack copied."
      : status === "downloaded"
        ? "Markdown file downloaded."
        : status === "copy_failed"
          ? "Copy failed. Try downloading the Markdown file instead."
          : undefined;

  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-200">
          Export evidence pack
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Copy or download a Markdown pack for your own records.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-400/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
        >
          Copy evidence pack
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Download .md
        </button>
      </div>

      {statusMessage ? (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
