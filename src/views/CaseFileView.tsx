import { CasePanel } from "../components/CasePanel";
import { EmailSafetyModal } from "../components/EmailSafetyModal";
import { EvidencePackExport } from "../components/EvidencePackExport";
import { GuidedRecoveryPanel } from "../components/GuidedRecoveryPanel";
import { TrustedGuidancePanel } from "../components/TrustedGuidancePanel";
import type { CaseUpdateValues } from "../components/CaseActions";
import type { OutcomeConfirmationValues } from "../components/OutcomeConfirmation";
import { formatMoneyImpact } from "../lib/impactLedger";
import { createPreparedMessageDraft } from "../lib/messageDrafts";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import { getTrustedGuidanceForOpportunity } from "../lib/trustedGuidanceMatcher";
import { useEffect, useMemo, useState } from "react";
import type { ServiceStatus } from "../services/analysisService";
import type {
  AdminCase,
  AdminCaseStatus,
  AdminDraft,
  AdminFinding,
  AdminItem,
  ImpactEntry,
  MoneyImpact,
} from "../types";

type CaseFileViewProps = {
  adminCase?: AdminCase;
  cases: AdminCase[];
  item?: AdminItem;
  finding?: AdminFinding;
  draft?: AdminDraft;
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
  allImpactEntries: ImpactEntry[];
  draftStatus: ServiceStatus;
  draftError?: string;
  onSwitchCase: (caseId: string) => void;
  onStatusChange: (caseId: string, status: AdminCaseStatus) => void;
  onSaveChanges: (caseId: string, values: CaseUpdateValues) => void;
  onSetChaseDate: (caseId: string, chaseDate: string) => void;
  onMarkWaiting: (caseId: string) => void;
  onMarkChasing: (caseId: string) => void;
  onMarkChasedToday: (caseId: string) => void;
  onMarkResolved: (caseId: string, outcome?: string) => void;
  onDeleteCase: (caseId: string) => void;
  onConfirmOutcome: (caseId: string, values: OutcomeConfirmationValues) => void;
  onGenerateDraft: (adminCase: AdminCase) => Promise<void>;
};

const opportunityTypeLabels: Record<string, string> = {
  refund_expected: "Refund approved",
  travel_extra_cost_recovery: "Possible money recovery found",
  travel_evidence_check: "Travel evidence check",
  subscription_recurring_charge: "Subscription cancellation",
  subscription_renewal: "Subscription",
  energy_price_change: "Energy price change",
  bill_or_price_increase: "Broadband price-rise review",
  money_back: "Money back",
  delivery_issue: "Delivery issue",
  delivery_update: "Delivery update",
  receipt_guardian: "Proof saved",
  suspicious_email_risk: "Email safety",
  admin_dispute_check: "Admin/rights check",
  career_support: "Career preparation",
  no_action_needed: "No action needed",
};

const formatCategory = (category: AdminCase["category"]) => category.replaceAll("_", " ");

const getCaseTime = (adminCase: AdminCase) =>
  new Date(adminCase.updatedAt || adminCase.createdAt).getTime();

const formatSwitcherMoney = (money?: MoneyImpact) => {
  if (!money || money.amount === undefined) {
    return undefined;
  }

  return formatMoneyImpact(money.amount, money.currency, money.frequency);
};

const getSwitcherMoneyLabel = (adminCase: AdminCase, allImpactEntries: ImpactEntry[]) => {
  const ledgerEntry = allImpactEntries.find(
    (entry) => entry.caseId === adminCase.id && entry.amount !== undefined,
  );

  if (ledgerEntry?.amount !== undefined) {
    return formatMoneyImpact(ledgerEntry.amount, ledgerEntry.currency, ledgerEntry.frequency);
  }

  const opportunity = deriveOpportunityCard(adminCase);

  return (
    formatSwitcherMoney(opportunity.moneyImpactRows?.find((row) => row.amount !== undefined)) ??
    formatSwitcherMoney(opportunity.potentialRecovery) ??
    formatSwitcherMoney(opportunity.potentialSaving) ??
    formatSwitcherMoney(opportunity.annualisedAmount) ??
    formatSwitcherMoney(opportunity.moneyAtStake) ??
    formatSwitcherMoney(opportunity.confirmedRecovery) ??
    formatSwitcherMoney(opportunity.confirmedSaving)
  );
};

const getSwitcherReference = (adminCase: AdminCase) => {
  const referenceEvidence = adminCase.evidence.find((item) =>
    /reference|booking|order|claim|account/i.test(`${item.label} ${item.value}`),
  );

  if (referenceEvidence?.value) {
    return referenceEvidence.value;
  }

  const text = [
    adminCase.title,
    adminCase.summary,
    adminCase.nextAction,
    adminCase.evidence.map((item) => item.value).join(" "),
  ].join(" ");

  return text.match(/\b[A-Z0-9]{5,14}\b/)?.[0];
};

const getCaseSwitcherLabel = (adminCase: AdminCase, allImpactEntries: ImpactEntry[]) => {
  const opportunity = deriveOpportunityCard(adminCase);
  const label =
    opportunityTypeLabels[opportunity.opportunityType] ??
    opportunity.title ??
    formatCategory(adminCase.category);
  const moneyLabel = getSwitcherMoneyLabel(adminCase, allImpactEntries);
  const referenceOrContext =
    getSwitcherReference(adminCase) ??
    adminCase.emailSafetyAssessment?.overallLabel ??
    adminCase.valueLabel;

  return [label, moneyLabel, referenceOrContext].filter(Boolean).join(" - ");
};

export function CaseFileView({
  adminCase,
  cases,
  item,
  finding,
  draft,
  drafts,
  impactEntries,
  allImpactEntries,
  draftStatus,
  draftError,
  onSwitchCase,
  onStatusChange,
  onSaveChanges,
  onSetChaseDate,
  onMarkWaiting,
  onMarkChasing,
  onMarkChasedToday,
  onMarkResolved,
  onDeleteCase,
  onConfirmOutcome,
  onGenerateDraft,
}: CaseFileViewProps) {
  const [showEmailSafety, setShowEmailSafety] = useState(false);
  const [showPreparedMessage, setShowPreparedMessage] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const sortedCases = useMemo(
    () => cases.slice().sort((leftCase, rightCase) => getCaseTime(rightCase) - getCaseTime(leftCase)),
    [cases],
  );

  useEffect(() => {
    setShowEmailSafety(false);
    setShowPreparedMessage(false);
    setShowFullDetails(false);
  }, [adminCase?.id]);

  const opportunity = adminCase ? deriveOpportunityCard(adminCase, item, finding) : undefined;
  const guidanceCards = opportunity ? getTrustedGuidanceForOpportunity(opportunity) : [];
  const caseImpactEntries = adminCase
    ? impactEntries.filter((entry) => entry.caseId === adminCase.id)
    : [];
  const preparedMessage =
    adminCase && opportunity
      ? createPreparedMessageDraft({ adminCase, item, finding, opportunity })
      : undefined;
  const handlePrepareMessage = () => {
    if (!adminCase) {
      return;
    }

    setShowPreparedMessage(true);

    if (!draft && draftStatus !== "loading") {
      void onGenerateDraft(adminCase);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Admin helper</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {adminCase?.title ?? "Choose something to continue"}
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          Follow the steps: what was found, what to have ready, the message to prepare, and what
          happened next.
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-slate-950/10 sm:p-5">
        <label htmlFor="case-switcher" className="text-sm font-bold text-slate-200">
          Switch case
        </label>
        <select
          id="case-switcher"
          value={adminCase?.id ?? ""}
          onChange={(event) => {
            if (event.target.value) {
              onSwitchCase(event.target.value);
            }
          }}
          disabled={sortedCases.length === 0}
          aria-label="Switch case"
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-base font-semibold text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20 disabled:cursor-not-allowed disabled:text-slate-500 sm:text-sm"
        >
          {sortedCases.length === 0 ? (
            <option value="">No saved cases yet</option>
          ) : adminCase ? null : (
            <option value="">Choose a saved case</option>
          )}
          {sortedCases.map((caseOption) => (
            <option key={caseOption.id} value={caseOption.id}>
              {getCaseSwitcherLabel(caseOption, allImpactEntries)}
            </option>
          ))}
        </select>
      </section>

      {adminCase && opportunity ? (
        <GuidedRecoveryPanel
          adminCase={adminCase}
          opportunity={opportunity}
          preparedMessage={preparedMessage}
          impactEntries={caseImpactEntries}
          showPreparedMessage={showPreparedMessage}
          hasGeneratedDraft={Boolean(draft)}
          isPreparingMessage={draftStatus === "loading"}
          prepareMessageError={draftError}
          onPrepareMessage={handlePrepareMessage}
          onShowEmailSafety={() => setShowEmailSafety(true)}
          onConfirmOutcome={onConfirmOutcome}
        />
      ) : null}

      {showEmailSafety && adminCase?.emailSafetyAssessment ? (
        <EmailSafetyModal
          assessment={adminCase.emailSafetyAssessment}
          onClose={() => setShowEmailSafety(false)}
        />
      ) : null}

      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-slate-950/10 sm:p-5">
        {adminCase ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">All the details (optional)</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Open the deeper case view for the original text, export, guidance, timeline, chase
                controls, and technical details.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullDetails((current) => !current)}
              className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40"
              aria-expanded={showFullDetails}
            >
              {showFullDetails ? "Hide all details" : "Show all details"}
            </button>
          </div>
        ) : null}

        {showFullDetails || !adminCase ? (
          <div className={adminCase ? "mt-5 grid gap-5" : undefined}>
            {adminCase && opportunity ? (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
                <EvidencePackExport
                  adminCase={adminCase}
                  item={item}
                  finding={finding}
                  drafts={drafts}
                  impactEntries={impactEntries}
                  opportunity={opportunity}
                  guidanceCards={guidanceCards}
                />
                <TrustedGuidancePanel cards={guidanceCards} />
              </div>
            ) : null}
            <CasePanel
              adminCase={adminCase}
              item={item}
              finding={finding}
              draft={draft}
              hideLegacyDraftPanel={showPreparedMessage && Boolean(preparedMessage)}
              variant="advanced"
              drafts={drafts}
              impactEntries={caseImpactEntries}
              onStatusChange={onStatusChange}
              onSaveChanges={onSaveChanges}
              onSetChaseDate={onSetChaseDate}
              onMarkWaiting={onMarkWaiting}
              onMarkChasing={onMarkChasing}
              onMarkChasedToday={onMarkChasedToday}
              onMarkResolved={onMarkResolved}
              onDeleteCase={onDeleteCase}
              onConfirmOutcome={onConfirmOutcome}
              onGenerateDraft={onGenerateDraft}
              isGeneratingDraft={draftStatus === "loading"}
              draftError={draftError}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
