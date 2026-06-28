import type { BroadbandPriceRiseAssessment } from "../types";

type BroadbandPriceRiseAssessmentPanelProps = {
  assessment: BroadbandPriceRiseAssessment;
};

const confidenceLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
  needs_more_info: "Needs more info",
  needs_review: "Needs review",
};

function AssessmentList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "found" | "missing" | "unknown";
}) {
  const toneStyles = {
    found: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    missing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    unknown: "border-sky-400/20 bg-sky-400/10 text-sky-100",
  };

  return (
    <div className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
      <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm leading-6">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6">{emptyText}</p>
      )}
    </div>
  );
}

export function BroadbandPriceRiseAssessmentPanel({
  assessment,
}: BroadbandPriceRiseAssessmentPanelProps) {
  const documentMatchConfidence = assessment.documentMatchConfidence ?? "medium";
  const actionConfidence = assessment.actionConfidence ?? "needs_more_info";
  const draftSafetyConfidence = assessment.draftSafetyConfidence ?? "needs_review";
  const evidenceFound = assessment.evidenceFound ?? [];
  const evidenceMissing = assessment.evidenceMissing ?? [];
  const optionsMentioned = assessment.optionsMentioned ?? [];
  const providerWordingFound = assessment.providerWordingFound ?? assessment.rightsConfirmed ?? [];
  const rightsConfirmed = assessment.rightsConfirmed ?? [];
  const rightsNeedChecking = assessment.rightsNeedChecking ?? [
    "Cancellation/switching rights need checking",
  ];
  const contractDate = assessment.contractDate ?? assessment.contractStartOrRenewalDate;
  const contractTimingExplanation =
    assessment.contractTimingExplanation ??
    "Contract start or renewal date is needed. This affects which price-rise terms may apply and whether the increase was shown clearly when you signed or renewed.";
  const missingCriticalEvidence = [
    assessment.providerName ? undefined : "Provider: Not found yet",
    contractDate ? undefined : "Contract start/renewal date: Needed",
    rightsConfirmed.length > 0
      ? undefined
      : "Cancellation/switching rights: Need checking",
  ].filter((item): item is string => Boolean(item));
  const whatNotToAssume = [
    ...rightsNeedChecking,
    providerWordingFound.length > 0
      ? "Provider wording is evidence to check with the provider, not a final legal decision from AdminAvenger."
      : "Do not assume cancellation rights apply just because options are mentioned.",
    assessment.caveat ?? "AdminAvenger prepares questions and evidence only. You decide what to do next.",
  ];

  return (
    <section className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.07] p-5 shadow-lg shadow-cyan-950/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Money Back Avenger
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-white">
            Broadband/mobile price-rise check
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            A focused check for broadband and mobile price-rise notices. It prepares the evidence
            and negotiation path; you decide what to do next.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-cyan-400/25 bg-slate-950/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
            Document match
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {confidenceLabels[documentMatchConfidence]}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {assessment.documentMatchExplanation ?? assessment.confidenceExplanation}
          </p>
        </div>
        <div className="rounded-lg border border-amber-400/25 bg-slate-950/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
            Action confidence
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {confidenceLabels[actionConfidence]}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {assessment.actionConfidenceExplanation ?? assessment.confidenceExplanation}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Draft safety
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {confidenceLabels[draftSafetyConfidence]}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The draft can ask questions, but it should not claim rights or eligibility.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Potential cost increase
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {assessment.monthlyIncrease ? `${assessment.monthlyIncrease}/month more` : "Unknown"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Annual if unchanged
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {assessment.annualIncrease ? `${assessment.annualIncrease}/year` : "Unknown"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Effective date
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {assessment.effectiveDate ?? "Unknown"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Contract date
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            {contractDate ?? "Needed"}
          </p>
          {assessment.contractDateRegime ? (
            <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
              {assessment.contractDateRegime.replaceAll("_", " ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-400/10 p-4">
        <p className="text-sm font-bold uppercase tracking-wider text-sky-100">
          Contract timing explanation
        </p>
        <p className="mt-2 text-sm leading-6 text-sky-100/85">
          {contractTimingExplanation}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <AssessmentList
          title="What AdminAvenger is confident about"
          items={[
            `Document match: ${confidenceLabels[documentMatchConfidence]}`,
            ...evidenceFound,
          ]}
          emptyText="No price-rise evidence was extracted."
          tone="found"
        />
        <AssessmentList
          title="What still needs checking"
          items={evidenceMissing}
          emptyText="No obvious evidence gaps were detected."
          tone="missing"
        />
        <AssessmentList
          title="Detected evidence"
          items={evidenceFound}
          emptyText="No evidence recorded yet."
          tone="found"
        />
        <AssessmentList
          title="Options mentioned"
          items={optionsMentioned}
          emptyText="No options wording was found."
          tone="found"
        />
        <AssessmentList
          title="Provider wording found"
          items={providerWordingFound}
          emptyText="No clear provider wording about leaving without charge was found."
          tone="found"
        />
        <AssessmentList
          title="Rights needing checking"
          items={rightsNeedChecking}
          emptyText="No rights-checking wording was found."
          tone="missing"
        />
        <AssessmentList
          title="Missing critical evidence"
          items={missingCriticalEvidence}
          emptyText="No critical evidence gaps detected."
          tone="missing"
        />
        <AssessmentList
          title="What not to assume"
          items={whatNotToAssume}
          emptyText="No caveats recorded."
          tone="unknown"
        />
      </div>
    </section>
  );
}
