import type { AdminCase, AdminDraft, AdminFinding, AdminItem, ImpactEntry } from "../types";
import { deriveImpactFromCase } from "./impactLedger";

const STORAGE_KEY = "admin-avenger-state-v1";

export type StoredAdminAvengerState = {
  adminItems: AdminItem[];
  findings: AdminFinding[];
  adminCases: AdminCase[];
  drafts: AdminDraft[];
  impactEntries: ImpactEntry[];
  selectedFindingId?: string;
  selectedCaseId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asArray = <T>(value: unknown, fallback: T[]) =>
  Array.isArray(value) ? (value as T[]) : fallback;

const asOptionalString = (value: unknown, fallback?: string) =>
  typeof value === "string" ? value : fallback;

const hasStringId = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && typeof value.id === "string";

const hydrateItems = (value: unknown, fallback: AdminItem[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminItem[];

const hydrateFindings = (value: unknown, fallback: AdminFinding[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminFinding[];

const hydrateDrafts = (value: unknown, fallback: AdminDraft[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as AdminDraft[];

const hydrateImpactEntries = (value: unknown, fallback: ImpactEntry[]) =>
  asArray<unknown>(value, fallback).filter(hasStringId) as ImpactEntry[];

const hydrateCases = (value: unknown, fallback: AdminCase[]) =>
  asArray<unknown>(value, fallback)
    .filter(hasStringId)
    .map((adminCase) => ({
      ...adminCase,
      evidence: Array.isArray(adminCase.evidence)
        ? adminCase.evidence.filter(hasStringId)
        : [],
      timeline: Array.isArray(adminCase.timeline)
        ? adminCase.timeline.filter(
            (event) => hasStringId(event) && typeof event.createdAt === "string",
          )
        : [],
    })) as AdminCase[];

const readRawState = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const loadSavedAdminAvengerState = (
  fallback: StoredAdminAvengerState,
): StoredAdminAvengerState => {
  const rawState = readRawState();

  if (!rawState) {
    return fallback;
  }

  try {
    const parsedState: unknown = JSON.parse(rawState);

    if (!isRecord(parsedState)) {
      return fallback;
    }

    const hydratedState: StoredAdminAvengerState = {
      adminItems: hydrateItems(parsedState.adminItems, fallback.adminItems),
      findings: hydrateFindings(parsedState.findings, fallback.findings),
      adminCases: hydrateCases(parsedState.adminCases, fallback.adminCases),
      drafts: hydrateDrafts(parsedState.drafts, fallback.drafts),
      impactEntries: hydrateImpactEntries(parsedState.impactEntries, []),
      selectedFindingId: asOptionalString(
        parsedState.selectedFindingId,
        fallback.selectedFindingId,
      ),
      selectedCaseId: asOptionalString(parsedState.selectedCaseId, fallback.selectedCaseId),
    };

    const hasSelectedFinding = hydratedState.findings.some(
      (finding) => finding.id === hydratedState.selectedFindingId,
    );
    const hasSelectedCase = hydratedState.adminCases.some(
      (adminCase) => adminCase.id === hydratedState.selectedCaseId,
    );

    return {
      ...hydratedState,
      impactEntries:
        hydratedState.impactEntries.length > 0
          ? hydratedState.impactEntries
          : hydratedState.adminCases.flatMap((adminCase) => {
              const item = hydratedState.adminItems.find((adminItem) => adminItem.id === adminCase.itemId);
              const finding = hydratedState.findings.find(
                (adminFinding) => adminFinding.id === adminCase.findingId,
              );
              return deriveImpactFromCase(adminCase, item, finding);
            }),
      selectedFindingId: hasSelectedFinding
        ? hydratedState.selectedFindingId
        : hydratedState.findings[0]?.id,
      selectedCaseId: hasSelectedCase ? hydratedState.selectedCaseId : hydratedState.adminCases[0]?.id,
    };
  } catch {
    return fallback;
  }
};

export const saveAdminAvengerState = (state: StoredAdminAvengerState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can fail in private browsing or when a quota is exceeded.
  }
};

export const clearSavedAdminAvengerState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures so the app stays usable.
  }
};
