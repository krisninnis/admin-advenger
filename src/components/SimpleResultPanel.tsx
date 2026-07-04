import { formatMoneyImpact } from "../lib/opportunityCards";
import type { MoneyImpact, OpportunityCard } from "../types";
import type { ReactNode } from "react";

export type SimpleResultAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  emphasis?: "primary" | "secondary" | "quiet";
};

type SimpleResultPanelProps = {
  opportunity: OpportunityCard;
  primaryAction?: SimpleResultAction;
  secondaryActions?: SimpleResultAction[];
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
  details?: ReactNode;
  note?: string;
  compact?: boolean;
};

const moneyRowsFor = (opportunity: OpportunityCard) =>
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

const needsNoMoneyLine = (opportunity: OpportunityCard) =>
  [
    "suspicious_email_risk",
    "no_action_needed",
    "delivery_update",
    "receipt_guardian",
  ].includes(opportunity.opportunityType);

const getDisplayTitle = (opportunity: OpportunityCard) =>
  opportunity.opportunityType === "no_action_needed"
    ? "No obvious action found"
    : opportunity.title;

const actionClasses: Record<NonNullable<SimpleResultAction["emphasis"]>, string> = {
  primary:
    "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30 hover:bg-emerald-300 focus:ring-emerald-200 focus:ring-offset-slate-950",
  secondary:
    "border border-cyan-400/40 bg-cyan-400/10 text-cyan-50 hover:border-cyan-300 hover:bg-cyan-400/15 focus:ring-cyan-300/40",
  quiet:
    "border border-white/10 bg-slate-950 text-slate-200 hover:border-white/20 hover:text-white focus:ring-emerald-300/40",
};

function ActionButton({ action, wide = false }: { action: SimpleResultAction; wide?: boolean }) {
  const emphasis = action.emphasis ?? "quiet";

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={`rounded-lg px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        wide ? "w-full" : ""
      } ${actionClasses[emphasis]}`}
    >
      {action.label}
    </button>
  );
}

function PlainList({ items, fallback }: { items: string[]; fallback: string }) {
  const visibleItems = items.length > 0 ? items.slice(0, 7) : [fallback];

  return (
    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function SimpleResultPanel({
  opportunity,
  primaryAction,
  secondaryActions = [],
  detailsOpen = false,
  onToggleDetails,
  details,
  note,
  compact = false,
}: SimpleResultPanelProps) {
  const moneyRows = moneyRowsFor(opportunity);
  const showNoMoneyLine = moneyRows.length === 0 && needsNoMoneyLine(opportunity);
  const hasDetails = Boolean(details && onToggleDetails);

  return (
    <section className="rounded-xl border border-emerald-300/25 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/25 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">
            What AdminAvenger found
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {getDisplayTitle(opportunity)}
          </h3>
          <p className="mt-3 text-base leading-7 text-slate-300">
            {opportunity.plainEnglishSummary}
          </p>
        </div>
        {opportunity.statusLabel ? (
          <span className="w-fit rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-bold text-slate-200">
            {opportunity.statusLabel}
          </span>
        ) : null}
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Money involved
          </h4>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
            {moneyRows.length > 0 ? (
              moneyRows.map((money) => (
                <p key={`${money.label}-${money.frequency}`}>{formatMoneyImpact(money)}</p>
              ))
            ) : (
              <p>{showNoMoneyLine ? "No savings or recovery counted." : "No amount found yet."}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            Your proof
          </h4>
          <PlainList
            items={opportunity.evidenceFound}
            fallback="No clear proof found yet."
          />
        </div>

        <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.07] p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-100">
            What to have ready
          </h4>
          <PlainList
            items={opportunity.missingInformation}
            fallback="No obvious missing information found. Check before acting."
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] p-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-100">
          Best next step
        </h4>
        <p className="mt-2 text-base leading-7 text-cyan-50/90">
          {opportunity.nextBestAction}
        </p>
      </div>

      {note ? <p className="mt-4 text-sm leading-6 text-slate-500">{note}</p> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        {primaryAction ? <ActionButton action={primaryAction} wide /> : <div />}
        {secondaryActions.length > 0 || hasDetails ? (
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {secondaryActions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
            {hasDetails ? (
              <ActionButton
                action={{
                  label: detailsOpen ? "Hide details" : "Show details",
                  onClick: () => onToggleDetails?.(),
                  emphasis: "quiet",
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {detailsOpen && details ? <div className="mt-5">{details}</div> : null}
    </section>
  );
}
