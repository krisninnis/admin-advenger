import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import type { AdminItemFormValues } from "./components/AddAdminItem";
import type { CaseUpdateValues } from "./components/CaseActions";
import type { AppView } from "./components/Sidebar";
import { demoScenarios } from "./data/demoScenarios";
import type { DemoScenario } from "./data/demoScenarios";
import { sampleAdminItems, sampleFindings } from "./data/mockData";
import { createAdminCase, createTimelineEventForCase } from "./lib/caseFactory";
import { getDefaultChaseDate } from "./lib/chaseEngine";
import {
  createConfirmedImpactEntry,
  deriveImpactFromCase,
} from "./lib/impactLedger";
import { deriveOpportunityCard } from "./lib/opportunityCards";
import {
  clearSavedAdminAvengerState,
  loadSavedAdminAvengerState,
  saveAdminAvengerState,
} from "./lib/storage";
import { clearFeedbackEntries, clearValidationRecords } from "./lib/validationStorage";
import { analyseAdminItemWithService } from "./services/analysisService";
import { generateDraftWithService } from "./services/draftService";
import type { ServiceStatus } from "./services/analysisService";
import { AddItemView } from "./views/AddItemView";
import { CaseFileView } from "./views/CaseFileView";
import { CasesView } from "./views/CasesView";
import { DashboardView } from "./views/DashboardView";
import { HomeView } from "./views/HomeView";
import type { HomeAnalysisResult } from "./views/HomeView";
import { SettingsView } from "./views/SettingsView";
import { SavingsView } from "./views/SavingsView";
import { ValidationView } from "./views/ValidationView";
import type { StoredAdminAvengerState } from "./lib/storage";
import type {
  AdminCase,
  AdminCaseStatus,
  AdminDraft,
  AdminFinding,
  AdminItem,
  FindingStatus,
  ImpactEntry,
  SourceType,
} from "./types";
import type { OutcomeConfirmationValues } from "./components/OutcomeConfirmation";

const findingStatusByCaseStatus: Record<AdminCaseStatus, FindingStatus> = {
  new: "new",
  reviewing: "to_do",
  ready_to_act: "to_do",
  drafted: "drafted",
  sent_manually: "sent_manually",
  waiting: "waiting",
  chasing: "waiting",
  resolved: "resolved",
  ignored: "ignored",
  no_action_needed: "no_action_needed",
  evidence_saved: "no_action_needed",
};

const caseStatusLabels: Record<AdminCaseStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  ready_to_act: "Ready to act",
  drafted: "Drafted",
  sent_manually: "Sent manually",
  waiting: "Waiting",
  chasing: "Chasing",
  resolved: "Resolved",
  ignored: "Ignored",
  no_action_needed: "No action needed",
  evidence_saved: "Evidence saved",
};

const normalizeOptionalText = (value?: string) => {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const emptyAdminItemForm: AdminItemFormValues = {
  title: "",
  sourceType: "email",
  rawText: "",
};

const buildInitialCases = () =>
  sampleFindings.map((finding) => {
    const item = sampleAdminItems.find((adminItem) => adminItem.id === finding.itemId);
    return createAdminCase(finding, item ?? sampleAdminItems[0]);
  });

const createDemoState = (): StoredAdminAvengerState => {
  const adminCases = buildInitialCases();

  return {
    adminItems: sampleAdminItems,
    findings: sampleFindings,
    adminCases,
    drafts: [],
    impactEntries: adminCases.flatMap((adminCase) => {
      const item = sampleAdminItems.find((adminItem) => adminItem.id === adminCase.itemId);
      const finding = sampleFindings.find((adminFinding) => adminFinding.id === adminCase.findingId);
      return deriveImpactFromCase(adminCase, item, finding);
    }),
    selectedFindingId: sampleFindings[0]?.id,
    selectedCaseId: adminCases[0]?.id,
  };
};

function App() {
  const [initialState] = useState(() => loadSavedAdminAvengerState(createDemoState()));
  const [items, setItems] = useState<AdminItem[]>(initialState.adminItems);
  const [findings, setFindings] = useState<AdminFinding[]>(initialState.findings);
  const [adminCases, setAdminCases] = useState<AdminCase[]>(initialState.adminCases);
  const [drafts, setDrafts] = useState<AdminDraft[]>(initialState.drafts);
  const [impactEntries, setImpactEntries] = useState<ImpactEntry[]>(initialState.impactEntries);
  const [selectedFindingId, setSelectedFindingId] = useState(initialState.selectedFindingId);
  const [selectedCaseId, setSelectedCaseId] = useState(initialState.selectedCaseId);
  const [analysisStatus, setAnalysisStatus] = useState<ServiceStatus>("idle");
  const [analysisError, setAnalysisError] = useState<string>();
  const [draftStatus, setDraftStatus] = useState<ServiceStatus>("idle");
  const [draftError, setDraftError] = useState<string>();
  const [adminItemForm, setAdminItemForm] = useState<AdminItemFormValues>(emptyAdminItemForm);
  const [homeResult, setHomeResult] = useState<HomeAnalysisResult>();
  const [currentView, setCurrentView] = useState<AppView>("home");

  const selectedCase =
    adminCases.find((adminCase) => adminCase.id === selectedCaseId) ??
    adminCases.find((adminCase) => adminCase.findingId === selectedFindingId);
  const selectedItem = items.find((item) => item.id === selectedCase?.itemId);
  const selectedFinding = findings.find((finding) => finding.id === selectedCase?.findingId);
  const selectedDraft = drafts.find((draft) => draft.findingId === selectedCase?.findingId);
  const selectedDrafts = drafts.filter((draft) => draft.findingId === selectedCase?.findingId);

  const sortedFindings = useMemo(
    () =>
      [...findings].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      ),
    [findings],
  );

  useEffect(() => {
    saveAdminAvengerState({
      adminItems: items,
      findings,
      adminCases,
      drafts,
      impactEntries,
      selectedFindingId,
      selectedCaseId: selectedCase?.id ?? selectedCaseId,
    });
  }, [adminCases, drafts, findings, impactEntries, items, selectedCase?.id, selectedCaseId, selectedFindingId]);

  const handleSelectFinding = (findingId: string) => {
    const relatedCase = adminCases.find((adminCase) => adminCase.findingId === findingId);

    setSelectedFindingId(findingId);
    setSelectedCaseId(relatedCase?.id);
  };

  const handleOpenFinding = (findingId: string) => {
    handleSelectFinding(findingId);
    setCurrentView("case_file");
  };

  const handleOpenCase = (caseId: string) => {
    const relatedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!relatedCase) {
      return;
    }

    setSelectedCaseId(relatedCase.id);
    setSelectedFindingId(relatedCase.findingId);
    setCurrentView("case_file");
  };

  const runAnalysis = async (
    title: string,
    sourceType: SourceType,
    rawText: string,
    openCaseFile: boolean,
  ): Promise<HomeAnalysisResult | undefined> => {
    const now = new Date().toISOString();
    const item: AdminItem = {
      id: `item-${crypto.randomUUID()}`,
      title,
      sourceType,
      rawText,
      createdAt: now,
      analysedAt: now,
    };
    setAnalysisStatus("loading");
    setAnalysisError(undefined);

    const analysisResult = await analyseAdminItemWithService(item);

    if (analysisResult.status === "error") {
      setAnalysisStatus("error");
      setAnalysisError(analysisResult.error.message);
      return undefined;
    }

    const analysedFindings = analysisResult.findings;
    const newCases = analysedFindings.map((finding) => createAdminCase(finding, item));
    const newImpactEntries = newCases.flatMap((adminCase) => {
      const finding = analysedFindings.find((adminFinding) => adminFinding.id === adminCase.findingId);
      return deriveImpactFromCase(adminCase, item, finding);
    });
    const result = {
      item,
      findings: analysedFindings,
      cases: newCases,
    };

    if (openCaseFile) {
      setItems((currentItems) => [item, ...currentItems]);
      setFindings((currentFindings) => [...analysedFindings, ...currentFindings]);
      setAdminCases((currentCases) => [...newCases, ...currentCases]);
      setImpactEntries((currentEntries) => [...newImpactEntries, ...currentEntries]);
      setSelectedFindingId(analysedFindings[0].id);
      setSelectedCaseId(newCases[0].id);
    }

    setHomeResult(result);
    if (openCaseFile) {
      setCurrentView("case_file");
    }
    setAnalysisStatus("success");
    return result;
  };

  const handleAnalyse = async (
    title: string,
    sourceType: SourceType,
    rawText: string,
  ): Promise<boolean> => {
    const result = await runAnalysis(title, sourceType, rawText, true);
    return Boolean(result);
  };

  const handleHomeCheck = async (
    title: string,
    sourceType: SourceType,
    rawText: string,
  ): Promise<boolean> => {
    const result = await runAnalysis(title, sourceType, rawText, false);
    return Boolean(result);
  };

  const handleSaveHomeResultCase = (caseId: string, saveMode: "case" | "record" = "case") => {
    const existingCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (existingCase) {
      handleOpenCase(caseId);
      return;
    }

    const resultCase = homeResult?.cases.find((adminCase) => adminCase.id === caseId);

    if (!homeResult || !resultCase) {
      return;
    }

    const casesToSave = homeResult.cases.map((adminCase) => {
      if (saveMode === "case") {
        return adminCase;
      }

      const finding = homeResult.findings.find(
        (adminFinding) => adminFinding.id === adminCase.findingId,
      );
      const opportunity = deriveOpportunityCard(adminCase, homeResult.item, finding);

      return {
        ...adminCase,
        status:
          opportunity.opportunityType === "receipt_guardian"
            ? "evidence_saved"
            : "no_action_needed",
        updatedAt: new Date().toISOString(),
        timeline: [
          createTimelineEventForCase(
            adminCase,
            "Record saved",
            opportunity.opportunityType === "receipt_guardian"
              ? "User saved this as evidence/proof of purchase."
              : "User saved this as a checked no-action record.",
          ),
          ...adminCase.timeline,
        ],
      } satisfies AdminCase;
    });
    const newImpactEntries = casesToSave.flatMap((adminCase) => {
      const finding = homeResult.findings.find((adminFinding) => adminFinding.id === adminCase.findingId);
      return saveMode === "record"
        ? deriveImpactFromCase(adminCase, homeResult.item, finding).filter(
            (entry) => entry.type === "no_saving",
          )
        : deriveImpactFromCase(adminCase, homeResult.item, finding);
    });

    setItems((currentItems) =>
      currentItems.some((item) => item.id === homeResult.item.id)
        ? currentItems
        : [homeResult.item, ...currentItems],
    );
    setFindings((currentFindings) => [
      ...homeResult.findings
        .map((finding) =>
          saveMode === "record" ? { ...finding, status: "no_action_needed" as const } : finding,
        )
        .filter(
          (finding) => !currentFindings.some((currentFinding) => currentFinding.id === finding.id),
        ),
      ...currentFindings,
    ]);
    setAdminCases((currentCases) => [
      ...casesToSave.filter(
        (adminCase) => !currentCases.some((currentCase) => currentCase.id === adminCase.id),
      ),
      ...currentCases,
    ]);
    setImpactEntries((currentEntries) => [
      ...newImpactEntries.filter(
        (entry) => !currentEntries.some((currentEntry) => currentEntry.id === entry.id),
      ),
      ...currentEntries,
    ]);
    setSelectedFindingId(resultCase.findingId);
    setSelectedCaseId(resultCase.id);
    setCurrentView("case_file");
  };

  const handleClearHomeResult = () => {
    setHomeResult(undefined);
    setAnalysisError(undefined);
  };

  const handleLoadDemoScenario = (scenario: DemoScenario) => {
    setAdminItemForm({
      title: scenario.title,
      sourceType: scenario.sourceType,
      rawText: scenario.rawText,
    });
    setAnalysisError(undefined);
  };

  const handleAnalyseDemoScenario = async (scenario: DemoScenario) => {
    setAdminItemForm({
      title: scenario.title,
      sourceType: scenario.sourceType,
      rawText: scenario.rawText,
    });

    await handleAnalyse(scenario.title, scenario.sourceType, scenario.rawText);
  };

  const handleCaseStatusChange = (caseId: string, status: AdminCaseStatus) => {
    const updatedAt = new Date().toISOString();
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) => {
        if (adminCase.id !== caseId) {
          return adminCase;
        }

        const suggestedChaseDate =
          status === "sent_manually" && !adminCase.chaseDate
            ? getDefaultChaseDate()
            : adminCase.chaseDate;

        return {
          ...adminCase,
          status,
          chaseDate: suggestedChaseDate,
          updatedAt,
          timeline: [
            createTimelineEventForCase(
              adminCase,
              "Status changed",
              suggestedChaseDate !== adminCase.chaseDate
                ? `Case moved to ${caseStatusLabels[status]}. Suggested chase date: ${suggestedChaseDate}.`
                : `Case moved to ${caseStatusLabels[status]}.`,
            ),
            ...adminCase.timeline,
          ],
        };
      }),
    );

    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? {
              ...finding,
              status: findingStatusByCaseStatus[status],
              deadline:
                status === "sent_manually" && !changedCase.chaseDate
                  ? getDefaultChaseDate()
                  : finding.deadline,
            }
          : finding,
      ),
    );
  };

  const handleSetChaseDate = (caseId: string, chaseDate: string) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase || changedCase.chaseDate === chaseDate) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              chaseDate,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Chase date set",
                  `Next chase date set to ${chaseDate}.`,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId ? { ...finding, deadline: chaseDate } : finding,
      ),
    );
  };

  const handleMarkCaseWaiting = (caseId: string) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const chaseDate = changedCase.chaseDate ?? getDefaultChaseDate();
    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: "waiting",
              chaseDate,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Marked waiting",
                  `Case is waiting for a response. Chase date: ${chaseDate}.`,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? { ...finding, status: "waiting", deadline: chaseDate }
          : finding,
      ),
    );
  };

  const handleMarkCaseChasing = (caseId: string) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const chaseDate = changedCase.chaseDate ?? getDefaultChaseDate();
    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: "chasing",
              chaseDate,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Marked chasing",
                  `Case is actively being chased. Chase date: ${chaseDate}.`,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? { ...finding, status: "waiting", deadline: chaseDate }
          : finding,
      ),
    );
  };

  const handleMarkChasedToday = (caseId: string) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const nextChaseDate = getDefaultChaseDate();
    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: "waiting",
              chaseDate: nextChaseDate,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Chased today",
                  `User marked this as chased today. Next suggested chase date: ${nextChaseDate}.`,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? { ...finding, status: "waiting", deadline: nextChaseDate }
          : finding,
      ),
    );
  };

  const handleSaveCaseChanges = (caseId: string, values: CaseUpdateValues) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const nextValues = {
      title: values.title || changedCase.title,
      nextAction: values.nextAction || changedCase.nextAction,
      chaseDate: normalizeOptionalText(values.chaseDate),
      outcome: normalizeOptionalText(values.outcome),
    };
    const changedFields = [
      nextValues.title !== changedCase.title ? "title" : undefined,
      nextValues.nextAction !== changedCase.nextAction ? "next action" : undefined,
      nextValues.chaseDate !== changedCase.chaseDate ? "chase date" : undefined,
      nextValues.outcome !== changedCase.outcome ? "outcome note" : undefined,
    ].filter(Boolean);

    if (changedFields.length === 0) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              ...nextValues,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Case updated",
                  `Updated ${changedFields.join(", ")}.`,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );

    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? {
              ...finding,
              title: nextValues.title,
              suggestedAction: nextValues.nextAction,
              deadline: nextValues.chaseDate,
            }
          : finding,
      ),
    );
  };

  const handleMarkCaseResolved = (caseId: string, outcome?: string) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const nextOutcome = normalizeOptionalText(outcome) ?? changedCase.outcome;
    const updatedAt = new Date().toISOString();

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: "resolved",
              outcome: nextOutcome,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Case resolved",
                  nextOutcome
                    ? `Marked resolved. Outcome: ${nextOutcome}`
                    : "Marked resolved by the user.",
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );

    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId ? { ...finding, status: "resolved" } : finding,
      ),
    );
  };

  const handleConfirmOutcome = (caseId: string, values: OutcomeConfirmationValues) => {
    const changedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!changedCase) {
      return;
    }

    const entry = createConfirmedImpactEntry(changedCase, values);
    const outcomeNote = values.note || entry.evidenceNote;
    const updatedAt = new Date().toISOString();

    setImpactEntries((currentEntries) => [
      entry,
      ...currentEntries.filter(
        (currentEntry) =>
          currentEntry.caseId !== caseId ||
          !["confirmed_saved", "confirmed_recovered", "cost_increase_avoided", "deadline_protected", "no_saving", "rejected"].includes(currentEntry.type),
      ),
    ]);

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: values.outcomeType === "still_waiting" ? "waiting" : "resolved",
              outcome: outcomeNote,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  "Outcome confirmed",
                  entry.amount !== undefined
                    ? `${entry.evidenceNote} Amount: ${entry.amount}.`
                    : entry.evidenceNote,
                ),
                ...adminCase.timeline,
              ],
            }
          : adminCase,
      ),
    );

    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === changedCase.findingId
          ? {
              ...finding,
              status: values.outcomeType === "still_waiting" ? "waiting" : "resolved",
            }
          : finding,
      ),
    );
  };

  const handleDeleteCase = (caseId: string) => {
    const deletedCase = adminCases.find((adminCase) => adminCase.id === caseId);

    if (!deletedCase) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${deletedCase.title}"? This removes the case, its draft, and the linked finding from this browser.`,
    );

    if (!shouldDelete) {
      return;
    }

    const remainingCases = adminCases.filter((adminCase) => adminCase.id !== caseId);
    const nextSelectedCase = remainingCases[0];

    setAdminCases(remainingCases);
    setImpactEntries((currentEntries) =>
      currentEntries.filter((entry) => entry.caseId !== deletedCase.id),
    );
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.findingId !== deletedCase.findingId),
    );
    setFindings((currentFindings) =>
      currentFindings.filter((finding) => finding.id !== deletedCase.findingId),
    );
    setSelectedCaseId(nextSelectedCase?.id);
    setSelectedFindingId(nextSelectedCase?.findingId);
  };

  const handleGenerateDraft = async (adminCase: AdminCase) => {
    setDraftStatus("loading");
    setDraftError(undefined);

    const draftResult = await generateDraftWithService(adminCase);

    if (draftResult.status === "error") {
      setDraftStatus("error");
      setDraftError(draftResult.error.message);
      return;
    }

    const { draft } = draftResult;
    const updatedAt = new Date().toISOString();

    setDrafts((currentDrafts) => [
      draft,
      ...currentDrafts.filter((currentDraft) => currentDraft.findingId !== adminCase.findingId),
    ]);
    setAdminCases((currentCases) =>
      currentCases.map((currentCase) =>
        currentCase.id === adminCase.id
          ? {
              ...currentCase,
              status: "drafted",
              chaseDate: currentCase.chaseDate ?? getDefaultChaseDate(),
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  currentCase,
                  "Draft generated",
                  currentCase.chaseDate
                    ? "A mock draft was created and attached to this case."
                    : `A mock draft was created and a suggested chase date was set for ${getDefaultChaseDate()}.`,
                ),
                ...currentCase.timeline,
              ],
            }
          : currentCase,
      ),
    );
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === adminCase.findingId
          ? { ...finding, status: "drafted", deadline: finding.deadline ?? getDefaultChaseDate() }
          : finding,
      ),
    );
    setDraftStatus("success");
  };

  const handleResetDemoData = () => {
    const demoState = createDemoState();

    setItems(demoState.adminItems);
    setFindings(demoState.findings);
    setAdminCases(demoState.adminCases);
    setDrafts(demoState.drafts);
    setImpactEntries(demoState.impactEntries);
    setSelectedFindingId(demoState.selectedFindingId);
    setSelectedCaseId(demoState.selectedCaseId);
    setHomeResult(undefined);
    setCurrentView("home");
  };

  const handleClearLocalData = () => {
    const shouldClear = window.confirm(
      "Clear all local AdminAvenger data from this browser? This cannot be undone.",
    );

    if (!shouldClear) {
      return;
    }

    clearSavedAdminAvengerState();
    clearValidationRecords();
    clearFeedbackEntries();
    setItems([]);
    setFindings([]);
    setAdminCases([]);
    setDrafts([]);
    setImpactEntries([]);
    setSelectedFindingId(undefined);
    setSelectedCaseId(undefined);
    setHomeResult(undefined);
    setCurrentView("home");
  };

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      caseCount={adminCases.length}
      findingCount={findings.length}
    >
      {currentView === "home" ? (
        <HomeView
          result={homeResult}
          analysisStatus={analysisStatus}
          analysisError={analysisError}
          onCheck={handleHomeCheck}
          onSaveCase={(caseId) => handleSaveHomeResultCase(caseId, "case")}
          onSaveRecord={(caseId) => handleSaveHomeResultCase(caseId, "record")}
          onClearResult={handleClearHomeResult}
        />
      ) : null}

      {currentView === "savings" ? (
        <SavingsView
          cases={adminCases}
          impactEntries={impactEntries}
          onOpenCase={handleOpenCase}
        />
      ) : null}

      {currentView === "dashboard" ? (
        <DashboardView
          findings={findings}
          cases={adminCases}
          onNavigate={setCurrentView}
          onOpenCase={handleOpenCase}
        />
      ) : null}

      {currentView === "add_item" ? (
        <AddItemView
          formValues={adminItemForm}
          onFormValuesChange={setAdminItemForm}
          onAnalyse={handleAnalyse}
          scenarios={demoScenarios}
          onLoadScenario={handleLoadDemoScenario}
          onAnalyseScenario={handleAnalyseDemoScenario}
          analysisStatus={analysisStatus}
          analysisError={analysisError}
        />
      ) : null}

      {currentView === "cases" ? (
        <CasesView
          findings={sortedFindings}
          cases={adminCases}
          selectedFindingId={selectedFindingId}
          selectedCaseId={selectedCase?.id}
          impactEntries={impactEntries}
          onOpenFinding={handleOpenFinding}
          onOpenCase={handleOpenCase}
        />
      ) : null}

      {currentView === "case_file" ? (
        <CaseFileView
          adminCase={selectedCase}
          item={selectedItem}
          finding={selectedFinding}
          draft={selectedDraft}
          drafts={selectedDrafts}
          impactEntries={impactEntries.filter((entry) => entry.caseId === selectedCase?.id)}
          draftStatus={draftStatus}
          draftError={draftError}
          onStatusChange={handleCaseStatusChange}
          onSaveChanges={handleSaveCaseChanges}
          onSetChaseDate={handleSetChaseDate}
          onMarkWaiting={handleMarkCaseWaiting}
          onMarkChasing={handleMarkCaseChasing}
          onMarkChasedToday={handleMarkChasedToday}
          onMarkResolved={handleMarkCaseResolved}
          onDeleteCase={handleDeleteCase}
          onConfirmOutcome={handleConfirmOutcome}
          onGenerateDraft={handleGenerateDraft}
        />
      ) : null}

      {currentView === "validation" ? <ValidationView /> : null}

      {currentView === "settings" ? (
        <SettingsView
          onResetDemoData={handleResetDemoData}
          onClearLocalData={handleClearLocalData}
        />
      ) : null}
    </AppShell>
  );
}

export default App;
