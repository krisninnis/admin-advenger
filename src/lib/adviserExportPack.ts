import type { BenefitsActionPack } from "./benefitsActionPack";
import type {
  DecisionConfidenceLevel,
  DecisionDocumentType,
  DecisionResult,
} from "./decisionEngine/types";
import type {
  ResultDateView,
  ResultDraftView,
  ResultEvidenceView,
  ResultMoneyView,
  ResultViewModel,
} from "./resultViewModel";
import {
  FORBIDDEN_ADVERSARIAL_LANGUAGE,
  FORBIDDEN_ADVICE_CLAIMS,
  FORBIDDEN_AUTOMATION_CLAIMS,
  FORBIDDEN_MONEY_CLAIMS,
  FORBIDDEN_OUTCOME_CLAIMS,
  normaliseSafetyText,
} from "./safetyWording";
import type { StrategicNextStepPlan } from "./strategicNextStep";
import type { WorkplaceSupportDocumentType, WorkplaceSupportPack } from "./workplaceSupportPack";

// Adviser Export Pack v1 - the print/export-friendly result for a person to
// bring to an adviser or support worker, or to keep for themselves.
//
// This module previously shipped a thinned-down version of the result that
// silently dropped several fields the decision engine already computes:
// why the document matters, AdminAvenger's own confidence in its read,
// uncertainty, a route-to-check next-steps section, and explicit draft
// handling. Per the AdminAvenger output-shape standard (Section 2 of the
// engineering standard), dropping any of those fields is a regression, not a
// simplification - so this module is now built directly from the same
// DecisionResult / ResultViewModel data every other surface uses, instead of
// re-deriving or re-summarising a smaller subset of it.

export type AdviserExportPackConfidence = {
  level: DecisionConfidenceLevel;
  // Plain-language sentence only - never the raw level word or a percentage,
  // and never framed as case strength (see decision-engine-standard.md and
  // safetyWording.ts FORBIDDEN_ADVICE_CLAIMS: "case strength").
  statement: string;
};

export type AdviserExportPackDraft = {
  included: boolean;
  title: string;
  body?: string;
  reviewWarning: string;
  noDraftLine?: string;
};

export type AdviserExportPack = {
  documentType: DecisionDocumentType | WorkplaceSupportDocumentType;
  title: string;
  whatThisAppearsToBe: string;
  whyThisMatters: string;
  confidence: AdviserExportPackConfidence;
  uncertainty: string[];
  cannotKnow: string[];
  routeToCheck: string[];
  keyDates: ResultDateView[];
  moneyMentioned: ResultMoneyView[];
  evidenceFound: ResultEvidenceView[];
  evidenceToGather: ResultEvidenceView[];
  questionsToAnswer: string[];
  risks: string[];
  draft: AdviserExportPackDraft;
  safetyNotes: string[];
  workplaceSupportPack?: WorkplaceSupportPack;
};

export type BuildAdviserExportPackInput = {
  decisionResult?: DecisionResult;
  resultViewModel: ResultViewModel;
  benefitsActionPack?: BenefitsActionPack | null;
  strategicNextStepPlan?: StrategicNextStepPlan;
  workplaceSupportPack?: WorkplaceSupportPack;
};

// --- Required safety lines (Section 6 of the fix request) -----------------
// These must always be present in every pack, regardless of which engine
// produced the underlying DecisionResult, and are not derived from engine
// output so a future engine change cannot accidentally remove them.

export const ADVISER_PACK_PREPARATION_ONLY_NOTE =
  "This pack is for preparation only. AdminAvenger does not decide, act, or advise on your behalf.";

export const ADVISER_PACK_NOTHING_SENT_NOTE = "Nothing in this pack has been sent.";

export const ADVISER_PACK_NOTHING_SUBMITTED_NOTE = "Nothing in this pack has been submitted.";

export const ADVISER_PACK_CONTROL_NOTE = "AdminAvenger helps prepare. You stay in control.";

export const ADVISER_PACK_NOT_ADVICE_NOTE =
  "This is not legal, benefits, debt, financial, or immigration advice.";

export const ADVISER_PACK_DATES_CHECK_NOTE =
  "Dates must be checked against the original letter.";

export const ADVISER_PACK_MONEY_DISPLAY_ONLY_NOTE =
  "Money shown here is display-only. AdminAvenger has not checked whether it is correct or owed.";

export const ADVISER_PACK_DRAFT_REVIEW_WARNING =
  "Read this draft, edit it as needed, and decide for yourself whether to use it. AdminAvenger has not sent or submitted it.";

export const ADVISER_PACK_NO_DRAFT_LINE = "No draft was included in this pack.";

export const ADVISER_PACK_ROUTE_CHECK_LETTER_LINE =
  "Check this against the original letter before you decide what to do next.";

export const ADVISER_PACK_FILENAME = "adminavenger-adviser-pack.md";

export const ADVISER_PACK_GENERATED_LINE =
  "Generated: Date not stored in this pack. This Markdown is created locally from the current result.";

export const ADVISER_PACK_WORKPLACE_PREPARATION_NOTE =
  "This is preparation only, not legal or employment advice.";

export const ADVISER_PACK_WORKPLACE_SIGNPOSTING_NOTE =
  "Ask ACAS, a union rep, HR, Citizens Advice, an adviser, solicitor where appropriate, or someone trusted if you are unsure.";

export const ADVISER_PACK_SETTLEMENT_REVIEW_NOTE =
  "Do not rely on AdminAvenger to decide what to do with a settlement agreement. Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser.";

export const ADVISER_PACK_RESIGNATION_REVIEW_NOTE =
  "Get advice before making a resignation decision.";

const REQUIRED_ADVISER_PACK_SAFETY_NOTES = [
  ADVISER_PACK_PREPARATION_ONLY_NOTE,
  ADVISER_PACK_NOTHING_SENT_NOTE,
  ADVISER_PACK_NOTHING_SUBMITTED_NOTE,
  ADVISER_PACK_CONTROL_NOTE,
  ADVISER_PACK_NOT_ADVICE_NOTE,
  ADVISER_PACK_DATES_CHECK_NOTE,
  ADVISER_PACK_MONEY_DISPLAY_ONLY_NOTE,
] as const;

// --- Cautious, document-type-specific "why this matters" wording ----------
// Never predicts an outcome. Only explains the real-world stake so the
// reader understands why the letter is worth checking promptly.

const WHY_THIS_MATTERS_OVERRIDES: Partial<Record<DecisionDocumentType, string>> = {
  benefits_uc_sanction:
    "This letter is about a Universal Credit sanction. A sanction can reduce or stop your payment for a period, so it may affect money you rely on and is worth checking quickly against the letter.",
  benefits_uc_deductions:
    "This letter is about a deduction or overpayment being taken from Universal Credit. It may reduce the money you receive, so it is worth checking quickly against the letter.",
  benefits_crisis_support:
    "This is about crisis or hardship support. It may affect whether you can cover food, heating, or rent this week, so it is worth checking quickly.",
};

const forbiddenPhrases = [
  ...FORBIDDEN_OUTCOME_CLAIMS,
  ...FORBIDDEN_ADVICE_CLAIMS,
  ...FORBIDDEN_ADVERSARIAL_LANGUAGE,
  ...FORBIDDEN_MONEY_CLAIMS,
  ...FORBIDDEN_AUTOMATION_CLAIMS,
] as const;

const isSafeText = (value: string) => {
  const normalised = normaliseSafetyText(value);

  return !forbiddenPhrases.some((phrase) => normalised.includes(phrase));
};

const safeText = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();

  if (!trimmed || !isSafeText(trimmed)) {
    return fallback;
  }

  return trimmed;
};

const normaliseKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const uniqueSafe = (items: Array<string | undefined>) => {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of items) {
    const trimmed = item?.trim();

    if (!trimmed || !isSafeText(trimmed)) {
      continue;
    }

    const key = normaliseKey(trimmed);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleaned.push(trimmed);
  }

  return cleaned;
};

const buildWhyThisMatters = (decisionResult: DecisionResult): string => {
  const override = WHY_THIS_MATTERS_OVERRIDES[decisionResult.documentType];

  if (override) {
    return override;
  }

  const base = safeText(
    decisionResult.whatThisLooksLike || decisionResult.plainEnglishSummary,
    "This document is worth checking carefully before you decide what to do.",
  );
  const stake = decisionResult.risks.find((risk) => isSafeText(risk));

  return stake ? `${base} This may matter because: ${stake}` : base;
};

const buildWorkplaceWhyThisMatters = (workplaceSupportPack: WorkplaceSupportPack): string =>
  safeText(
    `${workplaceSupportPack.summary} It may matter because workplace messages can affect work, pay, health, safety, or next steps, so the details should be checked against the original letter/message before deciding what to do.`,
    "This workplace message is worth checking carefully before you decide what to do.",
  );

// Translates AdminAvenger's own read-confidence into a plain sentence. Never
// shows the raw level word or a percentage, and never rendered as case
// strength - `confidence` is about how sure AdminAvenger is of its
// classification, not an assessment of the user's case.
const buildConfidence = (decisionResult: DecisionResult): AdviserExportPackConfidence => {
  const { level, reason } = decisionResult.confidence;
  const levelOpening =
    level === "high"
      ? "This looks fairly clear-cut."
      : level === "medium"
        ? "This looks reasonably clear, but not fully certain."
        : "This is less clear from what was provided, so treat this read with extra care.";
  const safeReason = safeText(reason, "Check the details against the original letter.");

  return {
    level,
    statement: `${levelOpening} ${safeReason}`.trim(),
  };
};

const buildWorkplaceConfidence = (workplaceSupportPack: WorkplaceSupportPack): AdviserExportPackConfidence => ({
  level: workplaceSupportPack.documentType === "workplace_unknown" ? "low" : "medium",
  statement:
    workplaceSupportPack.documentType === "workplace_unknown"
      ? "This is less clear from what was provided, so treat this workplace preparation read with extra care."
      : "This appears to be a workplace preparation pack, but the original message and full context still need checking.",
});

const buildRouteToCheck = (
  decisionResult: DecisionResult | undefined,
  resultViewModel: ResultViewModel,
  workplaceSupportPack?: WorkplaceSupportPack,
): string[] => {
  if (workplaceSupportPack?.documentType === "settlement_agreement_signpost") {
    return uniqueSafe([
      ADVISER_PACK_SETTLEMENT_REVIEW_NOTE,
      "Use this pack only to gather questions and documents for a qualified human review.",
      ADVISER_PACK_ROUTE_CHECK_LETTER_LINE,
    ]);
  }

  const items = uniqueSafe([
    ...(workplaceSupportPack?.safeNextSteps ?? []),
    ...(decisionResult?.nextSteps ?? []),
    resultViewModel.bestNextMove?.description,
  ]);

  return uniqueSafe([...items, ADVISER_PACK_ROUTE_CHECK_LETTER_LINE]);
};

const buildDraft = (resultViewModel: ResultViewModel): AdviserExportPackDraft => {
  const draftView: ResultDraftView | undefined = resultViewModel.draftOrChecklist;
  const body = draftView ? safeText(draftView.body, "") : "";

  if (!draftView || !body) {
    return {
      included: false,
      title: "Draft",
      reviewWarning: ADVISER_PACK_DRAFT_REVIEW_WARNING,
      noDraftLine: ADVISER_PACK_NO_DRAFT_LINE,
    };
  }

  return {
    included: true,
    title: draftView.title,
    body,
    reviewWarning: ADVISER_PACK_DRAFT_REVIEW_WARNING,
  };
};

const hasResignationRisk = (workplaceSupportPack: WorkplaceSupportPack) =>
  workplaceSupportPack.riskWarnings.some((warning) =>
    /resignation|constructive dismissal|resign|quitting|walking out/i.test(warning),
  );

const buildWorkplaceSafetyNotes = (workplaceSupportPack?: WorkplaceSupportPack) => {
  if (!workplaceSupportPack) {
    return [];
  }

  return uniqueSafe([
    ADVISER_PACK_WORKPLACE_PREPARATION_NOTE,
    ADVISER_PACK_CONTROL_NOTE,
    ADVISER_PACK_WORKPLACE_SIGNPOSTING_NOTE,
    workplaceSupportPack.documentType === "settlement_agreement_signpost"
      ? ADVISER_PACK_SETTLEMENT_REVIEW_NOTE
      : undefined,
    hasResignationRisk(workplaceSupportPack) ? ADVISER_PACK_RESIGNATION_REVIEW_NOTE : undefined,
    workplaceSupportPack.documentType === "wage_deduction_or_pay_issue"
      ? "Pay or wage amounts in this pack are facts to check only. They are not counted as saved or recovered."
      : undefined,
  ]);
};

export const buildAdviserExportPack = ({
  decisionResult,
  resultViewModel,
  benefitsActionPack,
  strategicNextStepPlan,
  workplaceSupportPack,
}: BuildAdviserExportPackInput): AdviserExportPack => ({
  documentType: decisionResult?.documentType ?? workplaceSupportPack?.documentType ?? "unknown_admin_dispute",
  title: resultViewModel.title,
  whatThisAppearsToBe: resultViewModel.summary,
  whyThisMatters: decisionResult
    ? buildWhyThisMatters(decisionResult)
    : workplaceSupportPack
      ? buildWorkplaceWhyThisMatters(workplaceSupportPack)
      : "This document is worth checking carefully before you decide what to do.",
  confidence: decisionResult
    ? buildConfidence(decisionResult)
    : workplaceSupportPack
      ? buildWorkplaceConfidence(workplaceSupportPack)
      : {
          level: "low",
          statement: "This is less clear from what was provided, so treat this read with extra care.",
        },
  // Reused directly from ResultViewModel/DecisionResult rather than
  // re-derived, so this section can never silently drop items the engine
  // already produced.
  uncertainty: resultViewModel.uncertainty,
  cannotKnow: resultViewModel.cannotKnow,
  routeToCheck: buildRouteToCheck(decisionResult, resultViewModel, workplaceSupportPack),
  keyDates: resultViewModel.keyDates,
  moneyMentioned: resultViewModel.moneyMentioned,
  evidenceFound: resultViewModel.evidenceFound,
  evidenceToGather: resultViewModel.evidenceToGather,
  questionsToAnswer: resultViewModel.questionsToAnswer,
  risks: resultViewModel.risks,
  draft: buildDraft(resultViewModel),
  safetyNotes: uniqueSafe([
    ...REQUIRED_ADVISER_PACK_SAFETY_NOTES,
    ...resultViewModel.safetyNotes,
    ...(benefitsActionPack?.safetyNotes ?? []),
    ...(strategicNextStepPlan?.safetyNotes ?? []),
    ...buildWorkplaceSafetyNotes(workplaceSupportPack),
  ]),
  workplaceSupportPack,
});

// Flattens every user-facing string on an AdviserExportPack into one block of
// text, mirroring flattenResultViewModelText / flattenDecisionResultText, so
// safety-wording regression tests and the golden corpus can scan this output
// the same way they scan every other surface.
export const flattenAdviserExportPackText = (pack: AdviserExportPack): string =>
  [
    pack.title,
    pack.whatThisAppearsToBe,
    pack.whyThisMatters,
    pack.confidence.statement,
    ...pack.uncertainty,
    ...pack.cannotKnow,
    ...pack.routeToCheck,
    ...pack.keyDates.map((date) => `${date.label} ${date.value} ${date.caution}`),
    ...pack.moneyMentioned.map((line) => `${line.label} ${line.amountText} ${line.caution}`),
    ...pack.evidenceFound.map((item) => `${item.label} ${item.value}`),
    ...pack.evidenceToGather.map((item) => `${item.label} ${item.value}`),
    ...pack.questionsToAnswer,
    ...pack.risks,
    pack.draft.title,
    pack.draft.body ?? "",
    pack.draft.noDraftLine ?? "",
    pack.draft.reviewWarning,
    ...pack.safetyNotes,
    pack.workplaceSupportPack?.title ?? "",
    pack.workplaceSupportPack?.summary ?? "",
    ...(pack.workplaceSupportPack?.keyFactsToCheck ?? []),
    ...(pack.workplaceSupportPack?.evidenceToGather ?? []),
    ...(pack.workplaceSupportPack?.questionsToAsk ?? []),
    ...(pack.workplaceSupportPack?.cannotKnow ?? []),
    ...(pack.workplaceSupportPack?.riskWarnings ?? []),
    ...(pack.workplaceSupportPack?.signposting ?? []),
    pack.workplaceSupportPack ? ADVISER_PACK_WORKPLACE_PREPARATION_NOTE : "",
    pack.workplaceSupportPack ? ADVISER_PACK_WORKPLACE_SIGNPOSTING_NOTE : "",
    pack.workplaceSupportPack?.documentType === "settlement_agreement_signpost"
      ? ADVISER_PACK_SETTLEMENT_REVIEW_NOTE
      : "",
    pack.workplaceSupportPack && hasResignationRisk(pack.workplaceSupportPack)
      ? ADVISER_PACK_RESIGNATION_REVIEW_NOTE
      : "",
  ].join("\n");

const cleanMarkdownText = (value: string | undefined, fallback: string) =>
  safeText(value, fallback).replace(/\r\n/g, "\n").trim();

const cleanMarkdownLine = (value: string | undefined, fallback: string) =>
  cleanMarkdownText(value, fallback).replace(/\s+/g, " ");

const renderList = (items: string[], fallback: string) =>
  items.length > 0
    ? items.map((item) => `- ${cleanMarkdownLine(item, fallback)}`).join("\n")
    : `- ${fallback}`;

const renderSection = (title: string, body: string) => `## ${title}\n\n${body}`;

const renderDateLine = (date: ResultDateView) =>
  [
    `${cleanMarkdownLine(date.label, "Date to check")}: ${cleanMarkdownLine(date.value, "Check the original letter")}.`,
    "Check against original letter.",
    cleanMarkdownLine(date.caution, ADVISER_PACK_DATES_CHECK_NOTE),
  ].join(" ");

const renderMoneyLine = (line: ResultMoneyView) =>
  [
    `${cleanMarkdownLine(line.label, "Money mentioned")}: ${cleanMarkdownLine(line.amountText, "Check the original letter")}.`,
    "Display-only.",
    "Not counted as a saving or recovery.",
    cleanMarkdownLine(line.caution, ADVISER_PACK_MONEY_DISPLAY_ONLY_NOTE),
  ].join(" ");

const renderEvidenceLine = (item: ResultEvidenceView) =>
  `${cleanMarkdownLine(item.label, "Evidence")}: ${cleanMarkdownLine(item.value, "Check the original letter")}`;

const buildWorkplacePreparationNotes = (pack: WorkplaceSupportPack) =>
  uniqueSafe([
    ADVISER_PACK_WORKPLACE_PREPARATION_NOTE,
    ADVISER_PACK_CONTROL_NOTE,
    "Use this pack for questions, meeting preparation notes, evidence lists, timeline prompts, and calm clarification only.",
    "This pack is not for tribunal paperwork, legal threat letters, resignation wording, payment demands, or accusation-heavy messages.",
    pack.documentType === "wage_deduction_or_pay_issue"
      ? "Pay or wage amounts are facts to check only. They are not counted as saved or recovered."
      : undefined,
    pack.documentType === "settlement_agreement_signpost"
      ? ADVISER_PACK_SETTLEMENT_REVIEW_NOTE
      : undefined,
    hasResignationRisk(pack) ? ADVISER_PACK_RESIGNATION_REVIEW_NOTE : undefined,
  ]);

const renderWorkplaceSection = (pack: WorkplaceSupportPack | undefined) => {
  if (!pack) {
    return undefined;
  }

  const humanSupport = uniqueSafe([
    ADVISER_PACK_WORKPLACE_SIGNPOSTING_NOTE,
    ...pack.signposting,
    pack.documentType === "settlement_agreement_signpost"
      ? ADVISER_PACK_SETTLEMENT_REVIEW_NOTE
      : undefined,
    hasResignationRisk(pack) ? ADVISER_PACK_RESIGNATION_REVIEW_NOTE : undefined,
  ]);

  return renderSection(
    "Workplace preparation pack",
    [
      "### What this appears to be about",
      cleanMarkdownText(pack.title, "Workplace preparation pack"),
      "",
      cleanMarkdownText(pack.summary, "This appears to be workplace-related preparation."),
      "",
      "### Key facts to check",
      renderList(pack.keyFactsToCheck, "No key facts were listed in this workplace pack."),
      "",
      "### Evidence to gather",
      renderList(pack.evidenceToGather, "No workplace evidence items were listed in this pack."),
      "",
      "### Questions to ask",
      renderList(pack.questionsToAsk, "No workplace questions were listed in this pack."),
      "",
      "### What AdminAvenger cannot know",
      renderList(pack.cannotKnow, "No workplace cannot-know items were listed in this pack."),
      "",
      "### Preparation-only notes",
      renderList(buildWorkplacePreparationNotes(pack), ADVISER_PACK_WORKPLACE_PREPARATION_NOTE),
      "",
      "### Human support/signposting",
      renderList(humanSupport, ADVISER_PACK_WORKPLACE_SIGNPOSTING_NOTE),
    ].join("\n"),
  );
};

const getGeneratedLine = (pack: AdviserExportPack) => {
  const maybeGeneratedAt = (pack as AdviserExportPack & { generatedAt?: unknown }).generatedAt;

  return typeof maybeGeneratedAt === "string" && maybeGeneratedAt.trim()
    ? `Generated: ${maybeGeneratedAt.trim()}`
    : ADVISER_PACK_GENERATED_LINE;
};

export const getAdviserExportFilename = () => ADVISER_PACK_FILENAME;

export const renderAdviserExportMarkdown = (pack: AdviserExportPack): string => {
  const evidenceSections = [
    "### Evidence already seen",
    renderList(pack.evidenceFound.map(renderEvidenceLine), "No evidence was listed in this section."),
    "### Documents or evidence to bring",
    renderList(
      pack.evidenceToGather.map(renderEvidenceLine),
      "No extra documents were listed in this section.",
    ),
  ].join("\n\n");
  const draftSection = pack.draft.included && pack.draft.body
    ? [
        `### ${cleanMarkdownLine(pack.draft.title, "Draft/checklist")}`,
        cleanMarkdownText(pack.draft.reviewWarning, ADVISER_PACK_DRAFT_REVIEW_WARNING),
        "```text",
        cleanMarkdownText(pack.draft.body, ""),
        "```",
      ].join("\n\n")
    : [
        ADVISER_PACK_NO_DRAFT_LINE,
        cleanMarkdownText(pack.draft.reviewWarning, ADVISER_PACK_DRAFT_REVIEW_WARNING),
      ].join("\n\n");
  const sections = [
    "# AdminAvenger adviser pack",
    ADVISER_PACK_PREPARATION_ONLY_NOTE,
    getGeneratedLine(pack),
    renderSection("What this appears to be", cleanMarkdownText(pack.whatThisAppearsToBe, "Check the original letter.")),
    renderSection("Why this matters", cleanMarkdownText(pack.whyThisMatters, "Check the original letter before deciding what to do.")),
    renderSection("Confidence", cleanMarkdownText(pack.confidence.statement, "Check this result against the original letter.")),
    renderSection("Uncertainty", renderList(pack.uncertainty, "No uncertainty was listed in this pack.")),
    renderSection("What may happen next / route to check", renderList(pack.routeToCheck, ADVISER_PACK_ROUTE_CHECK_LETTER_LINE)),
    renderWorkplaceSection(pack.workplaceSupportPack),
    renderSection("Key dates to check", renderList(pack.keyDates.map(renderDateLine), "No key dates were listed in this pack.")),
    renderSection("Money mentioned, display-only", renderList(pack.moneyMentioned.map(renderMoneyLine), "No money was listed in this pack.")),
    renderSection("Evidence/documents to bring", evidenceSections),
    renderSection("Questions to answer", renderList(pack.questionsToAnswer, "No questions were listed in this pack.")),
    renderSection("What AdminAvenger cannot know", renderList(pack.cannotKnow, "No cannot-know items were listed in this pack.")),
    renderSection("Draft/checklist", draftSection),
    [
      "## Footer",
      "",
      ADVISER_PACK_CONTROL_NOTE,
      "AdminAvenger does not contact anyone for you.",
      "Nothing has been sent or submitted by AdminAvenger.",
      ADVISER_PACK_NOT_ADVICE_NOTE,
    ].join("\n"),
  ].filter((section): section is string => Boolean(section));

  return `${sections.join("\n\n")}\n`;
};
