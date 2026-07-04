import { useMemo, useState } from "react";
import {
  buildInboxScanPreviews,
  formatInboxScanPotential,
  summariseInboxScan,
} from "../lib/inboxScan";
import type { InboxScanPreview as InboxScanPreviewItem } from "../lib/inboxScan";
import type { AdminCase, AdminFinding, AdminItem } from "../types";
import { OpportunityCardPanel } from "./OpportunityCardPanel";

type InboxScanPreviewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ignoredItemIds: string[];
  onIgnore: (sampleId: string) => void;
  onSaveItem: (item: AdminItem, findings: AdminFinding[], cases: AdminCase[]) => void;
};

export function InboxScanPreview({
  open,
  onOpenChange,
  ignoredItemIds,
  onIgnore,
  onSaveItem,
}: InboxScanPreviewProps) {
  // Built once per mount. Previews are preview-only and not saved until the
  // user explicitly clicks "Save case".
  const [previews] = useState(() => buildInboxScanPreviews());
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [reviewingIds, setReviewingIds] = useState<string[]>([]);

  const visiblePreviews = useMemo(
    () => previews.filter((preview) => !ignoredItemIds.includes(preview.sampleId)),
    [previews, ignoredItemIds],
  );
  const summary = useMemo(() => summariseInboxScan(visiblePreviews), [visiblePreviews]);

  const handleSave = (preview: InboxScanPreviewItem) => {
    onSaveItem(preview.item, preview.findings, preview.cases);
    setSavedIds((current) => (current.includes(preview.sampleId) ? current : [...current, preview.sampleId]));
  };

  const toggleReview = (sampleId: string) => {
    setReviewingIds((current) =>
      current.includes(sampleId)
        ? current.filter((id) => id !== sampleId)
        : [...current, sampleId],
    );
  };

  return (
    <section className="rounded-lg border border-white/10 bg-slate-900/85 p-4 shadow-xl shadow-slate-950/20 sm:p-5">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold uppercase tracking-widest text-cyan-200">
            Review inbox scan preview
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-400">
            Inbox scan preview uses sample emails only. No Gmail, Outlook, or email account is
            connected.
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-bold text-cyan-100">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
            <p className="text-sm font-bold text-white">
              AdminAvenger found {summary.total} {summary.total === 1 ? "thing" : "things"} worth
              checking.
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
              <li>
                {summary.moneyCount} money {summary.moneyCount === 1 ? "opportunity" : "opportunities"}
              </li>
              <li>
                {summary.riskCount} risky {summary.riskCount === 1 ? "email" : "emails"}
              </li>
              <li>
                {formatInboxScanPotential(summary.totalPotential)} possible yearly impact/recovery
                found — not confirmed
              </li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Nothing here is saved or counted in Money yet. Possible is not the same as confirmed.
              Save only if you want AdminAvenger to track it.
            </p>
          </div>

          {visiblePreviews.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 bg-slate-950/45 p-4 text-sm leading-6 text-slate-400">
              No preview items left. You ignored them all for now.
            </p>
          ) : (
            <div className="grid gap-3">
              {visiblePreviews.map((preview) => {
                const isSaved = savedIds.includes(preview.sampleId);
                const isReviewing = reviewingIds.includes(preview.sampleId);
                const opportunity = preview.opportunity;
                const moneyLabel = preview.isRisk
                  ? "No money — risk warning only"
                  : (opportunity.statusLabel ?? "Potential — not confirmed yet");
                const confidenceLabel = preview.isRisk
                  ? `${opportunity.riskLevel} risk`
                  : `${opportunity.confidenceLabel} confidence`;
                const whyItMatters =
                  opportunity.opportunityNote ??
                  preview.primaryFinding?.whyItMatters ??
                  "Worth a quick check before anything is acted on.";

                return (
                  <article
                    key={preview.sampleId}
                    className={`rounded-lg border p-4 ${
                      preview.isRisk
                        ? "border-rose-400/30 bg-rose-400/[0.06]"
                        : "border-white/10 bg-slate-950/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <h4 className="text-base font-bold text-white">{preview.headline}</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-300">
                          {opportunity.plainEnglishSummary}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${
                          preview.isRisk
                            ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
                            : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                        }`}
                      >
                        {preview.isRisk ? "Risk" : "Money"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-200">
                        {moneyLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 capitalize text-slate-200">
                        {confidenceLabel}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      <span className="font-semibold text-slate-300">Why it matters: </span>
                      {whyItMatters}
                    </p>

                    {isReviewing ? (
                      <div className="mt-4">
                        <OpportunityCardPanel opportunity={opportunity} />
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleReview(preview.sampleId)}
                        className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                      >
                        {isReviewing ? "Hide details" : "Review"}
                      </button>
                      {isSaved ? (
                        <span className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-4 py-2.5 text-sm font-bold text-emerald-100">
                          Saved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSave(preview)}
                          className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950"
                        >
                          Save this check
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onIgnore(preview.sampleId)}
                        className="rounded-lg border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                      >
                        Ignore
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
