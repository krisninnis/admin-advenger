import { CasePanel } from "../components/CasePanel";
import type { CaseUpdateValues } from "../components/CaseActions";
import type { OutcomeConfirmationValues } from "../components/OutcomeConfirmation";
import type { ServiceStatus } from "../services/analysisService";
import type { AdminCase, AdminCaseStatus, AdminDraft, AdminFinding, AdminItem, ImpactEntry } from "../types";

type CaseFileViewProps = {
  adminCase?: AdminCase;
  item?: AdminItem;
  finding?: AdminFinding;
  draft?: AdminDraft;
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
  draftStatus: ServiceStatus;
  draftError?: string;
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

export function CaseFileView({
  adminCase,
  item,
  finding,
  draft,
  drafts,
  impactEntries,
  draftStatus,
  draftError,
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
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Case File</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Evidence, draft, timeline, decision
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-slate-400">
          AdminAvenger prepares the case pack. You review the evidence and decide what happens next.
        </p>
      </header>

      <div>
        <CasePanel
          adminCase={adminCase}
          item={item}
          finding={finding}
          draft={draft}
          drafts={drafts}
          impactEntries={impactEntries}
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
    </div>
  );
}
