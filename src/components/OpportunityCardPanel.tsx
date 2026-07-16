import { formatMoneyImpact } from "../lib/opportunityCards";
import type { MoneyImpact, OpportunityCard } from "../types";

type OpportunityCardPanelProps = {
  opportunity?: OpportunityCard;
  onOpenCase?: (caseId: string) => void;
};

const readable = (value: string) => value.replaceAll("_", " ");

const plainOpportunityLabel: Record<string, string> = {
  refund_expected: "Money expected",
  travel_extra_cost_recovery: "Possible recovery",
  travel_evidence_check: "Evidence check",
  subscription_recurring_charge: "Recurring charge",
  energy_price_change: "Price change",
  money_back: "Money back",
  bill_or_price_increase: "Price increase",
  subscription_renewal: "Subscription",
  receipt_guardian: "Proof found",
  delivery_issue: "Delivery issue",
  delivery_update: "Update",
  suspicious_email_risk: "Email safety",
  admin_dispute_check: "Admin/rights check",
  career_support: "Career prep",
  no_action_needed: "No action found",
};

export function OpportunityCardPanel({ opportunity, onOpenCase }: OpportunityCardPanelProps) {
  if (!opportunity) {
    return null;
  }

  const moneyItems =
    opportunity.moneyImpactRows && opportunity.moneyImpactRows.length > 0
      ? opportunity.moneyImpactRows
      : [
          opportunity.moneyAtStake,
          opportunity.potentialSaving,
          opportunity.potentialRecovery,
          opportunity.confirmedSaving,
          opportunity.confirmedRecovery,
          opportunity.annualisedAmount,
        ].filter((item): item is MoneyImpact => Boolean(item));
  const isCareerSupport = opportunity.opportunityType === "career_support";

  return (
    <section className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.08] p-5 shadow-xl shadow-emerald-950/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            Opportunity card
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">{opportunity.title}</h3>
          <p className="mt-2 max-w-3xl text-base leading-7 text-emerald-50/85">
            {opportunity.plainEnglishSummary}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-bold capitalize text-slate-200">
          {plainOpportunityLabel[opportunity.opportunityType] ?? readable(opportunity.opportunityType)}
        </span>
      </div>

      {isCareerSupport ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Preparation focus
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              No savings or recovery counted. This is a CV review aid.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Evidence to review
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Strengths, projects, training, dates, and links from the CV text.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Status
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              {opportunity.statusLabel ?? "Career preparation only"}
            </p>
          </div>
        </div>
      ) : (
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Money / impact
          </p>
          <div className="mt-2 space-y-1 text-sm leading-6 text-slate-200">
            {moneyItems.length > 0 ? (
              moneyItems.map((money) => <p key={`${money.label}-${money.frequency}`}>{formatMoneyImpact(money)}</p>)
            ) : (
              <p>No savings or recovery counted yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Deadline
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {opportunity.deadline
              ? `${opportunity.deadlineLabel ?? "Deadline"}: ${opportunity.deadline}`
              : "No deadline found yet."}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Status
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {opportunity.confirmedRecovery || opportunity.confirmedSaving
              ? "Confirmed by you"
              : opportunity.statusLabel
                ? opportunity.statusLabel
                : opportunity.potentialRecovery
                  ? "Waiting to come back"
                  : opportunity.potentialSaving || opportunity.annualisedAmount
                    ? "Potential saving opportunity — not confirmed yet"
                    : "No money impact counted"}
          </p>
        </div>
      </div>
      )}

      {opportunity.opportunityNote ? (
        <div className="mt-4 rounded-lg border border-emerald-300/20 bg-slate-950/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            Opportunity
          </p>
          <p className="mt-2 text-sm leading-6 text-emerald-50/85">{opportunity.opportunityNote}</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-emerald-300/20 bg-slate-950/50 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
            Evidence found
          </h4>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-emerald-50/85">
            {(opportunity.evidenceFound.length > 0 ? opportunity.evidenceFound : ["No evidence recorded yet."]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-300/25 bg-slate-950/50 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-amber-100">
            Still missing
          </h4>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50/85">
            {(opportunity.missingInformation.length > 0
              ? opportunity.missingInformation
              : ["No obvious missing information found. Check before acting."]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-cyan-300/20 bg-slate-950/50 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-100">
            Next best action
          </h4>
          <p className="mt-2 text-sm leading-6 text-cyan-50/85">{opportunity.nextBestAction}</p>
        </div>
      </div>

      {onOpenCase ? (
        <button
          type="button"
          onClick={() => onOpenCase(opportunity.caseId)}
          className="mt-5 rounded-lg border border-emerald-300/50 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-50 transition hover:bg-emerald-300/15 focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
        >
          Save / View case details
        </button>
      ) : null}
    </section>
  );
}
