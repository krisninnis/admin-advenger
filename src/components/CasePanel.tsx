import type { AdminCase, AdminCaseStatus, AdminDraft, AdminFinding, AdminItem, ImpactEntry } from "../types";
import { BroadbandPriceRiseAssessmentPanel } from "./BroadbandPriceRiseAssessmentPanel";
import { CaseActions } from "./CaseActions";
import { CaseTimeline } from "./CaseTimeline";
import { DelayRepayAssessmentPanel } from "./DelayRepayAssessmentPanel";
import { DraftPanel } from "./DraftPanel";
import { EvidenceLocker } from "./EvidenceLocker";
import { EvidencePackExport } from "./EvidencePackExport";
import { OpportunityCardPanel } from "./OpportunityCardPanel";
import { OutcomeConfirmation } from "./OutcomeConfirmation";
import { StatusBadge } from "./StatusBadge";
import { TrustedGuidancePanel } from "./TrustedGuidancePanel";
import type { CaseUpdateValues } from "./CaseActions";
import type { OutcomeConfirmationValues } from "./OutcomeConfirmation";
import { deriveOpportunityCard } from "../lib/opportunityCards";
import { getTrustedGuidanceForOpportunity } from "../lib/trustedGuidanceMatcher";

type CasePanelProps = {
  adminCase?: AdminCase;
  item?: AdminItem;
  finding?: AdminFinding;
  draft?: AdminDraft;
  hideLegacyDraftPanel?: boolean;
  variant?: "full" | "advanced";
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
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
  isGeneratingDraft: boolean;
  draftError?: string;
};

const caseStatusOptions: Array<{ value: AdminCaseStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "ready_to_act", label: "Ready to act" },
  { value: "drafted", label: "Drafted" },
  { value: "sent_manually", label: "Sent manually" },
  { value: "waiting", label: "Waiting" },
  { value: "chasing", label: "Chasing" },
  { value: "resolved", label: "Resolved" },
  { value: "no_action_needed", label: "No action needed" },
  { value: "evidence_saved", label: "Evidence saved" },
  { value: "ignored", label: "Ignored" },
];

const categoryLabels: Record<AdminCase["category"], string> = {
  refund: "Refund",
  complaint: "Complaint",
  subscription: "Subscription",
  deadline: "Deadline",
  job_application: "Job application",
  bill_increase: "Bill increase",
  warranty: "Warranty",
  important_reply: "Important reply",
  admin_dispute: "Admin/rights check",
  unknown: "Unknown",
};

const opportunityTypeLabels: Record<string, string> = {
  refund_expected: "Refund",
  travel_extra_cost_recovery: "Travel recovery",
  travel_evidence_check: "Travel evidence check",
  subscription_recurring_charge: "Subscription",
  subscription_renewal: "Subscription",
  suspicious_email_risk: "Email safety",
  admin_dispute_check: "Admin/rights check",
  career_support: "Career preparation",
};

const caseTypeLabel = (adminCase: AdminCase, opportunityType: string) =>
  opportunityTypeLabels[opportunityType] ?? categoryLabels[adminCase.category];

export function CasePanel({
  adminCase,
  item,
  finding,
  draft,
  hideLegacyDraftPanel = false,
  variant = "full",
  drafts,
  impactEntries,
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
  isGeneratingDraft,
  draftError,
}: CasePanelProps) {
  if (!adminCase) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Admin Case</h2>
        <p className="mt-2 text-base leading-7 text-slate-400">
          Select a finding to open its case file, evidence locker, battle log, and draft workspace.
        </p>
      </section>
    );
  }

  const opportunity = deriveOpportunityCard(adminCase, item, finding);
  const guidanceCards = getTrustedGuidanceForOpportunity(opportunity);
  const showGuidedSections = variant !== "advanced";

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-slate-950/15 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-5">
        <div className="max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Admin Case</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">
            {adminCase.title}
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            {caseTypeLabel(adminCase, opportunity.opportunityType)}
          </p>
        </div>
        <StatusBadge status={adminCase.status} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <StatusBadge urgency={adminCase.urgency} label={`${adminCase.urgency} urgency`} />
        <span className="rounded-full border border-white/10 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-300">
          {adminCase.confidence} confidence
        </span>
        {adminCase.valueLabel ? (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            {adminCase.valueLabel}
          </span>
        ) : null}
        {adminCase.chaseDate ? (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
            Chase {adminCase.chaseDate}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
        <div className="grid content-start gap-5">
          <OpportunityCardPanel opportunity={opportunity} />

          <section className="rounded-lg border border-white/10 bg-slate-950/60 p-5">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Case summary
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{adminCase.summary}</p>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Next action
              </h3>
              <p className="mt-3 text-base leading-7 text-slate-400">{adminCase.nextAction}</p>
            </div>

            {adminCase.outcome ? (
              <div className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-100">
                  Outcome
                </h3>
                <p className="mt-2 text-base leading-7 text-emerald-50/85">{adminCase.outcome}</p>
              </div>
            ) : null}

            <div className="mt-5">
              <label htmlFor="case-status" className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Case status
              </label>
              <select
                id="case-status"
                value={adminCase.status}
                onChange={(event) =>
                  onStatusChange(adminCase.id, event.target.value as AdminCaseStatus)
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
              >
                {caseStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <CaseActions
            adminCase={adminCase}
            onSaveChanges={onSaveChanges}
            onSetChaseDate={onSetChaseDate}
            onMarkWaiting={onMarkWaiting}
            onMarkChasing={onMarkChasing}
            onMarkChasedToday={onMarkChasedToday}
            onMarkResolved={onMarkResolved}
            onDeleteCase={onDeleteCase}
          />

          {showGuidedSections ? (
            <OutcomeConfirmation
              adminCase={adminCase}
              impactEntries={impactEntries}
              onConfirmOutcome={onConfirmOutcome}
            />
          ) : null}

          {adminCase.delayRepayAssessment ? (
            <DelayRepayAssessmentPanel assessment={adminCase.delayRepayAssessment} />
          ) : null}

          {adminCase.broadbandPriceRiseAssessment ? (
            <BroadbandPriceRiseAssessmentPanel
              assessment={adminCase.broadbandPriceRiseAssessment}
            />
          ) : null}
        </div>

        <div className="grid content-start gap-5">
          {showGuidedSections ? (
            <>
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
            </>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-1">
            <EvidenceLocker evidence={adminCase.evidence} />
            <CaseTimeline events={adminCase.timeline} />
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Original pasted text
            </h3>
            <p className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-400">
              {item?.rawText ?? "No linked source item found."}
            </p>
          </div>

          {!hideLegacyDraftPanel ? (
            <DraftPanel
              adminCase={adminCase}
              draft={draft}
              onGenerateDraft={onGenerateDraft}
              isGeneratingDraft={isGeneratingDraft}
              errorMessage={draftError}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
