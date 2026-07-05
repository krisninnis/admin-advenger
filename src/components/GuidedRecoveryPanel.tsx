import { OutcomeConfirmation } from "./OutcomeConfirmation";
import { PreparedMessagePanel } from "./PreparedMessagePanel";
import { getGuidedCaseMode, type GuidedCaseMode } from "../lib/guidedCaseMode";
import { formatMoneyImpact } from "../lib/opportunityCards";
import type { OutcomeConfirmationValues } from "./OutcomeConfirmation";
import type { ReactNode } from "react";
import type {
  AdminCase,
  ImpactEntry,
  MoneyImpact,
  OpportunityCard,
  PreparedMessageDraft,
} from "../types";

type GuidedRecoveryPanelProps = {
  adminCase: AdminCase;
  opportunity: OpportunityCard;
  preparedMessage?: PreparedMessageDraft;
  impactEntries: ImpactEntry[];
  showPreparedMessage: boolean;
  hasGeneratedDraft?: boolean;
  isPreparingMessage?: boolean;
  prepareMessageError?: string;
  onPrepareMessage: () => void | Promise<void>;
  onShowEmailSafety: () => void;
  onConfirmOutcome: (caseId: string, values: OutcomeConfirmationValues) => void;
};

type GuidedStepProps = {
  number: number;
  title: string;
  children: ReactNode;
};

const noMessageTypes = new Set([
  "no_action_needed",
  "delivery_update",
  "receipt_guardian",
]);

const getDisplayTitle = (opportunity: OpportunityCard) =>
  opportunity.opportunityType === "no_action_needed"
    ? "No obvious action found"
    : opportunity.title;

const getMoneyRows = (opportunity: OpportunityCard) =>
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

const getMessageActionLabel = () => "Prepare my message";

const hasUnconfirmedMoney = (moneyRows: MoneyImpact[]) =>
  moneyRows.some((money) => money.status === "pending" || money.status === "potential");

const getUnconfirmedMoneyNote = (
  adminCase: AdminCase,
  opportunity: OpportunityCard,
  guidedMode: GuidedCaseMode,
) => {
  if (guidedMode === "saving_or_review") {
    return opportunity.opportunityType === "subscription_recurring_charge" ||
      opportunity.opportunityType === "subscription_renewal"
      ? "This is a subscription to review, not money already saved. Only mark a saving once you have actually cancelled, reduced the cost, or changed plan."
      : "This is a price change to review, not money already saved. Only mark a saving once you have actually reduced the cost or changed plan.";
  }

  if (guidedMode === "safety") {
    return "Verify risky emails through the official website or app. No savings or recovery are counted here.";
  }

  if (guidedMode === "record") {
    return "This can be saved as a record. No savings or recovery are counted.";
  }

  return adminCase.category === "refund" || opportunity.opportunityType === "refund_expected"
    ? "A refund being approved is not the same as money received. Only mark it received once you can see it."
    : "Possible recovery is not assured. Only mark money as received once you can see it.";
};

const getGuidedStatusLabel = (opportunity: OpportunityCard, guidedMode: GuidedCaseMode) => {
  if (guidedMode === "saving_or_review") {
    if (
      opportunity.opportunityType === "subscription_recurring_charge" ||
      opportunity.opportunityType === "subscription_renewal"
    ) {
      return "Subscription to review - not a confirmed saving";
    }

    return "Price change to review - not a confirmed saving";
  }

  if (guidedMode === "safety") {
    return "Risk warning - verify before acting";
  }

  if (guidedMode === "record") {
    return "Record only - no savings counted";
  }

  return opportunity.statusLabel;
};

const getOutcomeStepTitle = (guidedMode: GuidedCaseMode) =>
  guidedMode === "saving_or_review"
    ? "What happened after checking?"
    : guidedMode === "safety" || guidedMode === "record"
      ? "What did you decide?"
      : "What happened next?";

function GuidedStep({ number, title, children }: GuidedStepProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-900/88 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/12 text-sm font-black text-emerald-100">
          {number}
        </span>
        <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Checklist({
  title,
  items,
  fallback,
  tone,
}: {
  title: string;
  items: string[];
  fallback: string;
  tone: "found" | "needed" | "risk";
}) {
  const visibleItems = items.length > 0 ? items.slice(0, 8) : [fallback];
  const toneClasses = {
    found: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-50",
    needed: "border-amber-300/25 bg-amber-300/[0.07] text-amber-50",
    risk: "border-rose-300/25 bg-rose-300/[0.07] text-rose-50",
  };

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <h4 className="text-sm font-bold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {visibleItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-current opacity-80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SafetyChecklist({ onShowEmailSafety }: { onShowEmailSafety: () => void }) {
  return (
    <div className="rounded-lg border border-rose-300/25 bg-rose-300/[0.07] p-4">
      <p className="text-sm leading-6 text-rose-50">
        Do not prepare a reply to a risky sender. Verify through the official website or app.
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-rose-50/90">
        {[
          "Do not click links.",
          "Do not open attachments.",
          "Do not reply with payment, login, card, bank, or one-time code details.",
          "Open the provider's official website or app directly.",
          "Use trusted contact details if you need to check the message.",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-200" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onShowEmailSafety}
        className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
      >
        Check email safety
      </button>
    </div>
  );
}

export function GuidedRecoveryPanel({
  adminCase,
  opportunity,
  preparedMessage,
  impactEntries,
  showPreparedMessage,
  hasGeneratedDraft = false,
  isPreparingMessage = false,
  prepareMessageError,
  onPrepareMessage,
  onShowEmailSafety,
  onConfirmOutcome,
}: GuidedRecoveryPanelProps) {
  const moneyRows = getMoneyRows(opportunity);
  const guidedMode = getGuidedCaseMode(adminCase, opportunity);
  const isSafetyCase = guidedMode === "safety";
  const statusLabel = getGuidedStatusLabel(opportunity, guidedMode);
  const canPrepareMessage = guidedMode !== "safety" && !noMessageTypes.has(opportunity.opportunityType);
  const shouldShowPreparedMessage = Boolean(
    preparedMessage && (showPreparedMessage || hasGeneratedDraft),
  );
  const showNoMoneyLine =
    moneyRows.length === 0 &&
    (isSafetyCase ||
      opportunity.opportunityType === "no_action_needed" ||
      opportunity.opportunityType === "delivery_update" ||
      opportunity.opportunityType === "receipt_guardian" ||
      opportunity.opportunityType === "admin_dispute_check");

  return (
    <div className="space-y-4">
      <GuidedStep number={1} title="What AdminAvenger found">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)]">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {getDisplayTitle(opportunity)}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              {opportunity.plainEnglishSummary}
            </p>
            <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] p-4">
              <p className="text-sm font-bold text-cyan-100">What to do next</p>
              <p className="mt-2 text-sm leading-6 text-cyan-50/90">
                {opportunity.nextBestAction}
              </p>
            </div>
            {hasUnconfirmedMoney(moneyRows) ? (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {getUnconfirmedMoneyNote(adminCase, opportunity, guidedMode)}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-bold text-slate-200">Money involved</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              {moneyRows.length > 0 ? (
                moneyRows.map((money) => (
                  <p key={`${money.label}-${money.frequency}-${money.amount}`}>
                    {formatMoneyImpact(money)}
                  </p>
                ))
              ) : (
                <p>{showNoMoneyLine ? "No savings or recovery counted." : "No amount found yet."}</p>
              )}
            </div>
            {statusLabel ? (
              <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">
                {statusLabel}
              </p>
            ) : null}
          </div>
        </div>
      </GuidedStep>

      <GuidedStep number={2} title="What to have ready">
        <div className="grid gap-4 md:grid-cols-2">
          <Checklist
            title={isSafetyCase ? "Risk signs found" : "Already found"}
            items={opportunity.evidenceFound}
            fallback={isSafetyCase ? "No specific risk signs listed yet." : "No clear proof found yet."}
            tone={isSafetyCase ? "risk" : "found"}
          />
          <Checklist
            title="What to have ready"
            items={opportunity.missingInformation}
            fallback={
              isSafetyCase
                ? "Verify through the official website or app before acting."
                : "No obvious missing proof found. Check the message before acting."
            }
            tone="needed"
          />
        </div>
      </GuidedStep>

      <GuidedStep number={3} title={isSafetyCase ? "Safety check" : "Your message"}>
        {isSafetyCase ? (
          <SafetyChecklist onShowEmailSafety={onShowEmailSafety} />
        ) : shouldShowPreparedMessage && preparedMessage ? (
          <PreparedMessagePanel draft={preparedMessage} />
        ) : canPrepareMessage ? (
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm leading-6 text-slate-300">
              AdminAvenger can prepare wording for you to review, edit, copy, and send manually.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              AdminAvenger has not sent this. You stay in control.
            </p>
            <button
              type="button"
              onClick={onPrepareMessage}
              disabled={isPreparingMessage}
              className="mt-4 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-slate-950 sm:w-auto"
            >
              {isPreparingMessage ? "Preparing..." : getMessageActionLabel()}
            </button>
            {prepareMessageError ? (
              <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                {prepareMessageError}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm leading-6 text-slate-300">
              No message is needed right now. You can keep this as a record or open all details if
              you want to inspect the case.
            </p>
          </div>
        )}
      </GuidedStep>

      <GuidedStep number={4} title={getOutcomeStepTitle(guidedMode)}>
        <OutcomeConfirmation
          adminCase={adminCase}
          impactEntries={impactEntries}
          mode="guided"
          guidedCaseMode={guidedMode}
          onConfirmOutcome={onConfirmOutcome}
        />
      </GuidedStep>
    </div>
  );
}
