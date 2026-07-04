import { useEffect, useMemo, useRef, useState } from "react";
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
  formatMoneyImpact,
} from "./lib/impactLedger";
import { deriveOpportunityCard } from "./lib/opportunityCards";
import { createEmailSafetyFinding } from "./lib/suspiciousEmail";
import {
  clearAllAdminAvengerLocalData,
  createAdminAvengerBackup,
  getLastStorageLoadDiagnostic,
  loadSavedAdminAvengerState,
  saveAdminAvengerState,
  subscribeToStorageSaveErrors,
} from "./lib/storage";
import {
  defaultInboxScanSettings,
  loadInboxScanSettings,
  saveInboxScanSettings,
} from "./lib/inboxScanStorage";
import type { InboxScanSettings } from "./lib/inboxScanStorage";
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
  EmailSafetyAssessment,
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
  const [storageLoadDiagnostic] = useState(() => getLastStorageLoadDiagnostic());
  const skippedInitialInvalidStorageSaveRef = useRef(false);
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
  const [storageSaveError, setStorageSaveError] = useState("");
  const [dataControlMessage, setDataControlMessage] = useState("");
  const [inboxScanSettings, setInboxScanSettings] =
    useState<InboxScanSettings>(loadInboxScanSettings);

  const selectedCase =
    adminCases.find((adminCase) => adminCase.id === selectedCaseId) ??
    adminCases.find((adminCase) => adminCase.findingId === selectedFindingId);
  const selectedItem = items.find((item) => item.id === selectedCase?.itemId);
  const selectedFinding = findings.find((finding) => finding.id === selectedCase?.findingId);
  const selectedDraft = drafts.find((draft) => draft.findingId === selectedCase?.findingId);
  const selectedDrafts = drafts.filter((draft) => draft.findingId === selectedCase?.findingId);

  const currentStoredState = (): StoredAdminAvengerState => ({
    adminItems: items,
    findings,
    adminCases,
    drafts,
    impactEntries,
    selectedFindingId,
    selectedCaseId: selectedCase?.id ?? selectedCaseId,
  });

  const sortedFindings = useMemo(
    () =>
      [...findings].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
      ),
    [findings],
  );

  useEffect(() => {
    if (
      storageLoadDiagnostic.source === "invalid" &&
      !skippedInitialInvalidStorageSaveRef.current
    ) {
      skippedInitialInvalidStorageSaveRef.current = true;
      return;
    }

    saveAdminAvengerState({
      adminItems: items,
      findings,
      adminCases,
      drafts,
      impactEntries,
      selectedFindingId,
      selectedCaseId: selectedCase?.id ?? selectedCaseId,
    });
  }, [
    adminCases,
    drafts,
    findings,
    impactEntries,
    items,
    selectedCase?.id,
    selectedCaseId,
    selectedFindingId,
    storageLoadDiagnostic.source,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.info("[AdminAvenger storage]", {
      key: storageLoadDiagnostic.key ?? "none",
      source: storageLoadDiagnostic.source,
      caseCount: storageLoadDiagnostic.caseCount,
      itemCount: storageLoadDiagnostic.itemCount,
      findingCount: storageLoadDiagnostic.findingCount,
      impactCount: storageLoadDiagnostic.impactCount,
      skippedKeys: storageLoadDiagnostic.skippedKeys,
    });
  }, [storageLoadDiagnostic]);

  useEffect(() => {
    saveInboxScanSettings(inboxScanSettings);
  }, [inboxScanSettings]);

  useEffect(() => subscribeToStorageSaveErrors(setStorageSaveError), []);

  const handleUpdateInboxScanSettings = (updates: Partial<InboxScanSettings>) => {
    setInboxScanSettings((current) => ({ ...current, ...updates }));
  };

  const handleIgnoreInboxScanItem = (sampleId: string) => {
    setInboxScanSettings((current) =>
      current.ignoredItemIds.includes(sampleId)
        ? current
        : { ...current, ignoredItemIds: [...current.ignoredItemIds, sampleId] },
    );
  };

  const handleSaveScannedItem = (
    item: AdminItem,
    scannedFindings: AdminFinding[],
    scannedCases: AdminCase[],
  ) => {
    const newImpactEntries = scannedCases.flatMap((adminCase) => {
      const finding = scannedFindings.find((current) => current.id === adminCase.findingId);
      return deriveImpactFromCase(adminCase, item, finding);
    });

    setItems((currentItems) =>
      currentItems.some((current) => current.id === item.id) ? currentItems : [item, ...currentItems],
    );
    setFindings((currentFindings) => [
      ...scannedFindings.filter(
        (finding) => !currentFindings.some((current) => current.id === finding.id),
      ),
      ...currentFindings,
    ]);
    setAdminCases((currentCases) => [
      ...scannedCases.filter((adminCase) => !currentCases.some((current) => current.id === adminCase.id)),
      ...currentCases,
    ]);
    setImpactEntries((currentEntries) => [
      ...newImpactEntries.filter((entry) => !currentEntries.some((current) => current.id === entry.id)),
      ...currentEntries,
    ]);
  };

  const handleSaveEmailSafetyCase = (
    item: AdminItem,
    assessment: EmailSafetyAssessment,
  ) => {
    const safetyFinding = createEmailSafetyFinding(item, assessment);
    const safetyCase = createAdminCase(safetyFinding, item);
    const safetyImpactEntries = deriveImpactFromCase(safetyCase, item, safetyFinding);

    setItems((currentItems) =>
      currentItems.some((currentItem) => currentItem.id === item.id)
        ? currentItems
        : [item, ...currentItems],
    );
    setFindings((currentFindings) => [safetyFinding, ...currentFindings]);
    setAdminCases((currentCases) => [safetyCase, ...currentCases]);
    setImpactEntries((currentEntries) => [
      ...safetyImpactEntries,
      ...currentEntries,
    ]);
    setSelectedFindingId(safetyFinding.id);
    setSelectedCaseId(safetyCase.id);
    setCurrentView("case_file");
  };

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
    setHomeResult(undefined);
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
      setHomeResult(undefined);
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

    const pendingEntryToPreserve =
      values.outcomeType === "still_waiting" && values.amount === undefined
        ? impactEntries.find(
            (entry) =>
              entry.caseId === caseId &&
              entry.type === "pending_recovery" &&
              entry.amount !== undefined,
          ) ??
          deriveImpactFromCase(
            changedCase,
            items.find((item) => item.id === changedCase.itemId),
            findings.find((finding) => finding.id === changedCase.findingId),
          ).find((entry) => entry.type === "pending_recovery" && entry.amount !== undefined)
        : undefined;
    const outcomeValues: OutcomeConfirmationValues = pendingEntryToPreserve
      ? {
          ...values,
          amount: pendingEntryToPreserve.amount,
          currency: pendingEntryToPreserve.currency,
          frequency: pendingEntryToPreserve.frequency,
        }
      : values;
    const entry = createConfirmedImpactEntry(changedCase, outcomeValues);
    const outcomeNote = outcomeValues.note || entry.evidenceNote;
    const updatedAt = new Date().toISOString();
    const shouldShowConfirmedAmount =
      entry.amount !== undefined &&
      ["confirmed_saved", "confirmed_recovered", "cost_increase_avoided", "deadline_protected"].includes(
        entry.type,
      );
    const timelineTitle =
      outcomeValues.outcomeType === "still_waiting"
        ? "Still waiting recorded"
        : outcomeValues.outcomeType === "rejected_unsuccessful"
          ? "Rejected outcome recorded"
          : outcomeValues.outcomeType === "not_worth_pursuing"
            ? "Not worth pursuing recorded"
            : "Outcome recorded";

    setImpactEntries((currentEntries) => [
      entry,
      ...currentEntries.filter(
        (currentEntry) =>
          currentEntry.caseId !== caseId ||
          ![
            "confirmed_saved",
            "confirmed_recovered",
            "cost_increase_avoided",
            "deadline_protected",
            "no_saving",
            "rejected",
            "pending_recovery",
            "under_review",
          ].includes(currentEntry.type),
      ),
    ]);

    setAdminCases((currentCases) =>
      currentCases.map((adminCase) =>
        adminCase.id === caseId
          ? {
              ...adminCase,
              status: outcomeValues.outcomeType === "still_waiting" ? "waiting" : "resolved",
              outcome: outcomeNote,
              updatedAt,
              timeline: [
                createTimelineEventForCase(
                  adminCase,
                  timelineTitle,
                  shouldShowConfirmedAmount
                    ? `${entry.evidenceNote} Amount: ${formatMoneyImpact(entry.amount, entry.currency, entry.frequency)}.`
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
              status: outcomeValues.outcomeType === "still_waiting" ? "waiting" : "resolved",
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
                    ? "A prepared message was created for review."
                    : `A prepared message was created for review and a suggested chase date was set for ${getDefaultChaseDate()}.`,
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
    setInboxScanSettings(defaultInboxScanSettings);
    setDataControlMessage("Demo data restored in this browser.");
    setCurrentView("home");
  };

  const handleDownloadLocalBackup = () => {
    const backup = createAdminAvengerBackup(currentStoredState());
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `admin-avenger-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    setDataControlMessage(
      "Local backup downloaded. Keep the file somewhere safe if you want a record outside this browser.",
    );
  };

  const handleClearLocalData = () => {
    const shouldClear = window.confirm(
      "Clear all local AdminAvenger data from this browser? This cannot be undone.",
    );

    if (!shouldClear) {
      return;
    }

    clearAllAdminAvengerLocalData();
    setItems([]);
    setFindings([]);
    setAdminCases([]);
    setDrafts([]);
    setImpactEntries([]);
    setSelectedFindingId(undefined);
    setSelectedCaseId(undefined);
    setInboxScanSettings(defaultInboxScanSettings);
    setHomeResult(undefined);
    setDataControlMessage("Local AdminAvenger data deleted from this browser.");
    setCurrentView("home");
  };

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      caseCount={adminCases.length}
      findingCount={findings.length}
    >
      {storageSaveError ? (
        <div className="mb-5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{storageSaveError}</p>
            <button
              type="button"
              onClick={() => setStorageSaveError("")}
              className="rounded-lg border border-rose-200/30 px-3 py-2 text-xs font-bold text-rose-50 transition hover:bg-rose-200/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {currentView === "home" ? (
        <HomeView
          result={homeResult}
          analysisStatus={analysisStatus}
          analysisError={analysisError}
          onCheck={handleHomeCheck}
          onSaveCase={(caseId) => handleSaveHomeResultCase(caseId, "case")}
          onSaveRecord={(caseId) => handleSaveHomeResultCase(caseId, "record")}
          onClearResult={handleClearHomeResult}
          inboxScanSettings={inboxScanSettings}
          onUpdateInboxScanSettings={handleUpdateInboxScanSettings}
          onIgnoreInboxScanItem={handleIgnoreInboxScanItem}
          onSaveScannedItem={handleSaveScannedItem}
          onSaveEmailSafetyCase={handleSaveEmailSafetyCase}
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
          cases={adminCases}
          item={selectedItem}
          finding={selectedFinding}
          draft={selectedDraft}
          drafts={selectedDrafts}
          impactEntries={impactEntries.filter((entry) => entry.caseId === selectedCase?.id)}
          allImpactEntries={impactEntries}
          draftStatus={draftStatus}
          draftError={draftError}
          onSwitchCase={handleOpenCase}
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
          onDownloadBackup={handleDownloadLocalBackup}
          dataControlMessage={dataControlMessage}
          onNavigate={setCurrentView}
          inboxScanSettings={inboxScanSettings}
          onUpdateInboxScanSettings={handleUpdateInboxScanSettings}
        />
      ) : null}
    </AppShell>
  );
}

export default App;
