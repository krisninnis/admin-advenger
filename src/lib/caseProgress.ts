import type { AdviserExportPack } from "./adviserExportPack";
import type { BenefitsActionPack } from "./benefitsActionPack";
import { isBenefitsDocumentType } from "./benefitsActionPack";
import type { DecisionDocumentType, DecisionResult } from "./decisionEngine/types";
import type { ResultViewModel } from "./resultViewModel";
import type { StrategicNextStepPlan } from "./strategicNextStep";

// Case Progress Tracker v1
//
// This module builds a "preparation progress" summary from data AdminAvenger
// already has. It is deliberately NOT:
// - a win chance
// - a success score
// - an appeal strength score
// - a case strength score
// - a legal strength score
// - an entitlement score
// - a benefits calculator
// - a debt advice engine
// - a parking ticket validity checker
//
// percentComplete only ever means "how much of the preparation pack looks
// gathered", never outcome likelihood, advice confidence, case strength, or
// money recovered/saved/owed. See docs/product/case-progress-tracker-v1.md.

export type CaseProgressItemStatus = "missing" | "partial" | "complete" | "not_needed";

export type CaseProgressItemSource = "result" | "user" | "system";

export type CaseProgressItem = {
  id: string;
  label: string;
  description: string;
  status: CaseProgressItemStatus;
  source: CaseProgressItemSource;
  safetyNote?: string;
};

export type CaseProgressSummary = {
  totalRelevant: number;
  completeCount: number;
  partialCount: number;
  missingCount: number;
  percentComplete: number;
  label: string;
  items: CaseProgressItem[];
};

export type BuildCaseProgressInput = {
  resultViewModel: ResultViewModel;
  decisionResult?: DecisionResult;
  adviserExportPack?: AdviserExportPack;
  benefitsActionPack?: BenefitsActionPack | null;
  strategicNextStepPlan?: StrategicNextStepPlan;
};

export const CASE_PROGRESS_HEADING = "Preparation progress";

export const CASE_PROGRESS_EXPLANATION =
  "This shows how complete your preparation pack is. It does not predict the outcome.";

export const CASE_PROGRESS_CONTROL_NOTE = "AdminAvenger helps prepare. You stay in control.";

// --- Document-type families ------------------------------------------------
// These families only decide which checklist wording is shown. They never
// feed into any score of how strong, valid, or likely to succeed the case is.

type CaseProgressFamily = "benefits_decision" | "benefits_general" | "legal_debt" | "unknown" | "generic";

const PIP_DECISION_STYLE_TYPES = new Set<DecisionDocumentType>([
  "benefits_decision",
  "benefits_appeal",
  "benefits_assessment_report",
  "benefits_review",
]);

const LEGAL_DEBT_TYPES = new Set<DecisionDocumentType>([
  "parking_ticket",
  "debt_collection",
  "bailiff_notice",
  "tv_licence",
  "bank_complaint",
  "consumer_dispute",
]);

const detectFamily = (decisionResult?: DecisionResult): CaseProgressFamily => {
  if (!decisionResult) {
    return "generic";
  }

  const { documentType } = decisionResult;

  if (PIP_DECISION_STYLE_TYPES.has(documentType)) {
    return "benefits_decision";
  }

  if (isBenefitsDocumentType(documentType)) {
    return "benefits_general";
  }

  if (LEGAL_DEBT_TYPES.has(documentType)) {
    return "legal_debt";
  }

  if (documentType === "unknown_admin_dispute") {
    return "unknown";
  }

  return "generic";
};

// --- Small helpers ----------------------------------------------------------

const hasItems = (list: unknown[] | undefined) => Boolean(list && list.length > 0);

const referenceLikePattern = /reference|ref|claim|case number|account|provider|letter date/i;
const senderLikePattern = /sender|from|domain|email|reply-to|reply to/i;

const buildItem = (
  id: string,
  label: string,
  description: string,
  status: CaseProgressItemStatus,
  source: CaseProgressItemSource = "result",
  safetyNote?: string,
): CaseProgressItem => ({ id, label, description, status, source, safetyNote });

// --- Shared checklist items --------------------------------------------------
// Reused across families so the same underlying signal is always described
// the same, safe way.

const buildOriginalSourceItem = (label = "Original letter or message added"): CaseProgressItem =>
  buildItem(
    "original-source",
    label,
    "AdminAvenger has the text, photo, or document you shared to build this result.",
    "complete",
    "system",
  );

const buildKeyDateItem = (
  resultViewModel: ResultViewModel,
  label = "Key date checked",
): CaseProgressItem => {
  const hasDates = hasItems(resultViewModel.keyDates);

  return buildItem(
    "key-date",
    label,
    hasDates
      ? "A date was found in this result. Check it against the original letter before relying on it."
      : "No date has been gathered yet. Look for a decision date, deadline, or reply-by date on the original letter.",
    hasDates ? "complete" : "missing",
    "result",
    "Check this date against the original letter.",
  );
};

const buildMoneyOrReferenceItem = (
  resultViewModel: ResultViewModel,
  label = "Money or reference checked",
): CaseProgressItem => {
  const hasMoney = hasItems(resultViewModel.moneyMentioned);
  const hasReference = resultViewModel.evidenceFound.some((evidenceItem) =>
    referenceLikePattern.test(`${evidenceItem.label} ${evidenceItem.value}`),
  );
  const found = hasMoney || hasReference;

  return buildItem(
    "money-reference",
    label,
    found
      ? "A reference number or amount was found in this result. Check it against the original letter."
      : "No reference number or amount has been gathered yet.",
    found ? "complete" : "missing",
    "result",
    "Amounts shown are for preparation only. AdminAvenger has not checked or totalled this figure.",
  );
};

const buildEvidenceItem = (resultViewModel: ResultViewModel): CaseProgressItem => {
  const found = resultViewModel.evidenceFound.length;
  const stillToGather = resultViewModel.evidenceToGather.length;

  if (found === 0 && stillToGather === 0) {
    return buildItem(
      "evidence-gathered",
      "Evidence or documents gathered",
      "No evidence has been gathered yet. Keep any letters, screenshots, or documents together.",
      "missing",
    );
  }

  const status: CaseProgressItemStatus = found > 0 && stillToGather === 0 ? "complete" : "partial";

  return buildItem(
    "evidence-gathered",
    "Evidence or documents gathered",
    stillToGather > 0
      ? `${found} piece${found === 1 ? "" : "s"} of evidence found so far. ${stillToGather} more to gather.`
      : `${found} piece${found === 1 ? "" : "s"} of evidence found so far.`,
    status,
  );
};

const buildQuestionsItem = (resultViewModel: ResultViewModel): CaseProgressItem => {
  const outstanding = resultViewModel.questionsToAnswer.length;

  return buildItem(
    "questions-answered",
    "Questions answered",
    outstanding > 0
      ? `${outstanding} question${outstanding === 1 ? "" : "s"} still to answer before this pack is ready.`
      : "No outstanding questions were listed in this result.",
    outstanding > 0 ? "missing" : "complete",
  );
};

const buildDraftReviewedItem = (resultViewModel: ResultViewModel): CaseProgressItem => {
  const hasDraft = Boolean(resultViewModel.draftOrChecklist);

  return buildItem(
    "draft-reviewed",
    "Draft or checklist reviewed",
    hasDraft
      ? "A draft or checklist has been prepared. Read it and edit it before you use it."
      : "No draft or checklist was prepared for this result.",
    hasDraft ? "partial" : "not_needed",
    "result",
    "Editable preparation. Review before using or sharing.",
  );
};

const buildAdviserPackItem = (adviserExportPack?: AdviserExportPack): CaseProgressItem =>
  buildItem(
    "adviser-pack",
    "Adviser pack prepared",
    adviserExportPack
      ? "An adviser pack has been prepared. You can download it to share with someone you trust."
      : "No adviser pack has been prepared yet. You can create one from this result whenever you are ready.",
    adviserExportPack ? "complete" : "missing",
    "user",
  );

const buildTrustedCheckItem = (description: string): CaseProgressItem =>
  buildItem(
    "trusted-check",
    "Someone trusted or an adviser checked this",
    description,
    "missing",
    "user",
    "AdminAvenger cannot check this for you. Ask someone you trust if you are unsure.",
  );

// --- Family-specific checklists ---------------------------------------------

const buildPipDecisionItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel, benefitsActionPack } = input;
  const hasActivities = hasItems(benefitsActionPack?.whatMatters);
  const hasExamples = resultViewModel.evidenceFound.length > 0;

  return [
    buildOriginalSourceItem(),
    buildKeyDateItem(resultViewModel, "Decision date checked"),
    buildItem(
      "decision-letter",
      "Decision letter available",
      resultViewModel.evidenceFound.length > 0
        ? "Details from the decision letter have been read into this result."
        : "Add the full decision letter so more of it can be gathered here.",
      resultViewModel.evidenceFound.length > 0 ? "complete" : "missing",
    ),
    buildItem(
      "activities-identified",
      "Activities or points identified",
      hasActivities
        ? "Activities or points from the decision have been identified in this result."
        : "List the activities or points you want to look at more closely.",
      hasActivities ? "complete" : "missing",
    ),
    buildItem(
      "real-examples",
      "Real examples added",
      hasExamples
        ? "Some real-life examples or evidence have been gathered."
        : "Add real-life examples for each activity before preparing a draft.",
      hasExamples ? "partial" : "missing",
    ),
    buildEvidenceItem(resultViewModel),
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem(
      "Ask a support worker or adviser to check activities, examples, and evidence before you send anything.",
    ),
  ];
};

const buildBenefitsGeneralItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel } = input;

  return [
    buildOriginalSourceItem(),
    buildKeyDateItem(resultViewModel),
    buildMoneyOrReferenceItem(resultViewModel),
    buildEvidenceItem(resultViewModel),
    buildQuestionsItem(resultViewModel),
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem(
      "Ask a support worker or adviser to check this if it affects money you rely on, such as rent, food, or heating.",
    ),
  ];
};

const buildLegalDebtItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel } = input;

  return [
    buildOriginalSourceItem(),
    buildKeyDateItem(resultViewModel, "Deadline or date checked"),
    buildMoneyOrReferenceItem(resultViewModel, "Reference or amount checked"),
    buildEvidenceItem(resultViewModel),
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem(
      "Ask an adviser or someone you trust to check this before you reply, especially if court or enforcement is mentioned.",
    ),
  ];
};

const buildUnknownItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel } = input;
  const senderChecked = resultViewModel.evidenceFound.some((evidenceItem) =>
    senderLikePattern.test(`${evidenceItem.label} ${evidenceItem.value}`),
  );
  const hasDoNotRushWarning =
    hasItems(resultViewModel.risks) || hasItems(resultViewModel.uncertainty) || hasItems(resultViewModel.cannotKnow);

  return [
    buildOriginalSourceItem("Original message added"),
    buildItem(
      "sender-checked",
      "Sender or source checked",
      senderChecked
        ? "Sender or source details were found in this result. Check them carefully before you act."
        : "No sender or source details have been gathered yet. Check who this message is really from.",
      senderChecked ? "complete" : "missing",
    ),
    buildItem(
      "do-not-rush-acknowledged",
      "Do-not-rush warning acknowledged",
      hasDoNotRushWarning
        ? "This result includes a caution not to rush. Read it before you click, reply, or pay anything."
        : "No specific caution was generated for this result.",
      hasDoNotRushWarning ? "complete" : "not_needed",
    ),
    buildTrustedCheckItem(
      "Ask someone you trust before clicking any links, replying, or paying anything.",
    ),
  ];
};

const buildGenericItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel } = input;

  return [
    buildOriginalSourceItem(),
    buildKeyDateItem(resultViewModel),
    buildMoneyOrReferenceItem(resultViewModel),
    buildEvidenceItem(resultViewModel),
    buildQuestionsItem(resultViewModel),
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem("Ask someone you trust, a support worker, or an adviser to check this before you act."),
  ];
};

const familyBuilders: Record<CaseProgressFamily, (input: BuildCaseProgressInput) => CaseProgressItem[]> = {
  benefits_decision: buildPipDecisionItems,
  benefits_general: buildBenefitsGeneralItems,
  legal_debt: buildLegalDebtItems,
  unknown: buildUnknownItems,
  generic: buildGenericItems,
};

// --- Public API --------------------------------------------------------------

export const buildCaseProgress = (input: BuildCaseProgressInput): CaseProgressSummary => {
  const family = detectFamily(input.decisionResult);
  const items = familyBuilders[family](input);

  const completeCount = items.filter((entry) => entry.status === "complete").length;
  const partialCount = items.filter((entry) => entry.status === "partial").length;
  const missingCount = items.filter((entry) => entry.status === "missing").length;
  const totalRelevant = items.filter((entry) => entry.status !== "not_needed").length;
  const percentComplete = totalRelevant > 0 ? Math.round((completeCount / totalRelevant) * 100) : 0;
  const label =
    totalRelevant > 0
      ? `${completeCount} of ${totalRelevant} preparation steps complete`
      : "No preparation steps apply yet";

  return {
    totalRelevant,
    completeCount,
    partialCount,
    missingCount,
    percentComplete,
    label,
    items,
  };
};

// Flattens every user-facing string on a CaseProgressSummary into one block of
// text, mirroring flattenResultViewModelText / flattenAdviserExportPackText,
// so the safety-wording regression suite and golden corpus can scan this
// output the same way they scan every other surface.
export const flattenCaseProgressText = (summary: CaseProgressSummary): string =>
  [
    CASE_PROGRESS_HEADING,
    CASE_PROGRESS_EXPLANATION,
    CASE_PROGRESS_CONTROL_NOTE,
    summary.label,
    ...summary.items.flatMap((entry) => [entry.label, entry.description, entry.safetyNote ?? ""]),
  ].join("\n");
