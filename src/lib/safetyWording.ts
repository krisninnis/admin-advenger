import type { AdviserExportPack } from "./adviserExportPack";
import type { BenefitsActionPack } from "./benefitsActionPack";
import type { CommunityHelperPack } from "./communityHelperPack";
import type { DecisionResult } from "./decisionEngine/types";
import type { ResultViewModel } from "./resultViewModel";
import type { StrategicMove, StrategicNextStepPlan } from "./strategicNextStep";
import {
  CORE_FORBIDDEN_ADVERSARIAL_LANGUAGE,
  CORE_FORBIDDEN_ADVICE_CLAIMS,
  CORE_FORBIDDEN_AUTOMATION_CLAIMS,
  CORE_FORBIDDEN_COMMUNITY_HELPER_CLAIMS,
  CORE_FORBIDDEN_MONEY_CLAIMS,
  CORE_FORBIDDEN_OUTCOME_CLAIMS,
  CORE_FORBIDDEN_OVERCLAIM_PHRASES,
  findForbiddenCoreSafetyPhrases,
  normaliseCoreSafetyText,
} from "./safetyWordingCore";

export type SafetyWordingGroup =
  | "outcome_claim"
  | "advice_claim"
  | "adversarial_language"
  | "money_claim"
  | "automation_claim"
  | "overclaim_claim"
  | "community_helper_claim";

export type SafetyTheme =
  | "no_contact"
  | "human_decides"
  | "money_display_only"
  | "dates_user_must_check"
  | "cannot_know"
  | "uncertainty"
  | "get_advice_when_serious";

export type ForbiddenSafetyPhraseMatch = {
  phrase: string;
  group: SafetyWordingGroup;
  index: number;
  excerpt: string;
  context?: string;
};

export type FindForbiddenSafetyPhrasesOptions = {
  allowedPhrases?: string[];
  disabledGroups?: SafetyWordingGroup[];
  context?: string;
};

export const FORBIDDEN_OUTCOME_CLAIMS = CORE_FORBIDDEN_OUTCOME_CLAIMS;

export const FORBIDDEN_ADVICE_CLAIMS = CORE_FORBIDDEN_ADVICE_CLAIMS;

export const FORBIDDEN_ADVERSARIAL_LANGUAGE =
  CORE_FORBIDDEN_ADVERSARIAL_LANGUAGE;

export const FORBIDDEN_MONEY_CLAIMS = CORE_FORBIDDEN_MONEY_CLAIMS;

export const FORBIDDEN_AUTOMATION_CLAIMS =
  CORE_FORBIDDEN_AUTOMATION_CLAIMS;

// Document File Support v1 - technical/privacy overclaims that would make a
// stronger promise about file handling than a client-side, local-only
// prototype can actually verify (see src/lib/documentFileText.ts and
// src/lib/documentAttachmentIntake.ts for the honest wording these rule out).
export const FORBIDDEN_OVERCLAIM_PHRASES =
  CORE_FORBIDDEN_OVERCLAIM_PHRASES;

// Community Helper Pack Core v1 - claims a preparation-only community/helper
// pack must never make, since it would overstep into a diagnosis,
// safeguarding, capacity, care-eligibility, or financial-abuse decision that
// only a qualified professional or authority can make. These are
// phrase-shaped claims (matching the existing groups' discipline), not bare
// dictionary words: a bare word like "diagnosis" is deliberately excluded
// here because safe, required cannotKnow wording ("whether a diagnosis...
// applies") and existing decision-engine copy (e.g. wcaLcwra.ts: "not just
// your diagnosis") legitimately use that word without making a diagnosis
// claim - banning it outright would break required safe disclaimers
// elsewhere in the app. See docs/product/community-helper-pack-core-v1.md.
export const FORBIDDEN_COMMUNITY_HELPER_CLAIMS =
  CORE_FORBIDDEN_COMMUNITY_HELPER_CLAIMS;

export const REQUIRED_SAFETY_THEMES: Record<SafetyTheme, readonly string[]> = {
  no_contact: [
    "does not contact anyone",
    "does not contact",
    "has not sent anything",
    "not sent anything",
  ],
  human_decides: [
    "you decide",
    "review before acting",
    "review it",
    "check before acting",
  ],
  money_display_only: [
    "not counted",
    "display-only",
    "has not counted",
    "no money counted",
    "money mentioned",
  ],
  dates_user_must_check: [
    "check this date",
    "check the date",
    "check the exact date",
    "check the letter",
  ],
  cannot_know: [
    "cannot know",
    "cannot verify",
    "cannot decide",
    "cannot confirm",
  ],
  uncertainty: [
    "uncertain",
    "unclear",
    "may depend",
    "could change",
    "missing",
  ],
  get_advice_when_serious: [
    "get advice",
    "specialist advice",
    "advice if",
  ],
};

const forbiddenGroups: Record<SafetyWordingGroup, readonly string[]> = {
  outcome_claim: FORBIDDEN_OUTCOME_CLAIMS,
  advice_claim: FORBIDDEN_ADVICE_CLAIMS,
  adversarial_language: FORBIDDEN_ADVERSARIAL_LANGUAGE,
  money_claim: FORBIDDEN_MONEY_CLAIMS,
  automation_claim: FORBIDDEN_AUTOMATION_CLAIMS,
  overclaim_claim: FORBIDDEN_OVERCLAIM_PHRASES,
  community_helper_claim: FORBIDDEN_COMMUNITY_HELPER_CLAIMS,
};

export const ALL_FORBIDDEN_SAFETY_PHRASES = Object.values(forbiddenGroups).flat();

export const normaliseSafetyText = normaliseCoreSafetyText;

export const findForbiddenSafetyPhrases = (
  text: string,
  options: FindForbiddenSafetyPhrasesOptions = {},
): ForbiddenSafetyPhraseMatch[] =>
  findForbiddenCoreSafetyPhrases(text, options);

export const assertNoForbiddenSafetyPhrases = (
  text: string,
  context: string,
  options: Omit<FindForbiddenSafetyPhrasesOptions, "context"> = {},
) => {
  const matches = findForbiddenSafetyPhrases(text, { ...options, context });

  if (matches.length > 0) {
    const details = matches
      .map((match) => `${match.context ?? context}: ${match.group} "${match.phrase}" in "${match.excerpt}"`)
      .join("\n");

    throw new Error(`Forbidden safety wording found:\n${details}`);
  }
};

export const hasSafetyTheme = (text: string, theme: SafetyTheme) => {
  const normalisedText = normaliseSafetyText(text);

  return REQUIRED_SAFETY_THEMES[theme].some((phrase) =>
    normalisedText.includes(normaliseSafetyText(phrase)),
  );
};

const joinText = (items: Array<string | undefined | null>) =>
  items
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .join("\n");

const collectStrategicMoveText = (move: StrategicMove) =>
  joinText([
    move.label,
    move.description,
    move.whyThisHelps,
    move.safeDraftPrompt,
    move.doNotAutoSend ? "AdminAvenger has not sent anything. You decide whether to use this step." : undefined,
  ]);

export const collectTextFromDecisionResult = (
  result: DecisionResult,
  options: { includeSourceFacts?: boolean } = {},
) =>
  joinText([
    result.title,
    result.plainEnglishSummary,
    result.strengthLabel,
    result.whatThisLooksLike,
    ...result.possibleGrounds,
    result.confidence.reason,
    ...result.uncertainty,
    ...result.cannotKnow,
    ...result.evidenceNeeded,
    ...result.deadlines,
    ...result.risks,
    ...result.nextSteps,
    ...result.safetyNotes,
    result.draftMessage,
    result.amountMentioned,
    ...(options.includeSourceFacts
      ? result.sourceFacts.map((fact) => `${fact.label} ${fact.value}`)
      : result.sourceFacts.map((fact) => fact.label)),
    ...(result.questionsToAnswer ?? []),
  ]);

export const collectTextFromBenefitsActionPack = (pack: BenefitsActionPack) =>
  joinText([
    pack.title,
    pack.documentStage,
    pack.summary,
    ...pack.whatMatters,
    ...pack.possibleDatesToCheck.map(
      (date) => `${date.label} ${date.value} ${date.caution} Check the letter before acting.`,
    ),
    ...pack.moneyMentioned.map(
      (line) =>
        `${line.label} ${line.amountText} ${line.caution} Not counted in savings, recovered money, or the money tracker.`,
    ),
    ...pack.evidenceFound.map((item) => `${item.label} ${item.value}`),
    ...pack.evidenceMissing,
    ...pack.risks,
    ...pack.questionsToAnswer.map((question) => question.question),
    ...pack.uncertainty,
    ...pack.cannotKnow,
    pack.nextSafeStep,
    pack.draftOrChecklist,
    ...pack.safetyNotes,
    "AdminAvenger does not contact anyone for you. You decide what happens next.",
  ]);

export const collectTextFromStrategicNextStepPlan = (plan: StrategicNextStepPlan) =>
  joinText([
    plan.title,
    plan.plainEnglishSummary,
    ...plan.actors.flatMap((actor) => [
      actor.label,
      actor.role,
      actor.likelyGoal,
      actor.caution,
    ]),
    plan.userGoal,
    ...plan.missingInformation,
    collectStrategicMoveText(plan.safestMove),
    ...plan.otherSafeMoves.map(collectStrategicMoveText),
    ...plan.movesToAvoid,
    ...plan.whenToGetAdvice,
    ...plan.uncertainty,
    ...plan.cannotKnow,
    ...plan.safetyNotes,
  ]);

export const collectTextFromAdviserExportPack = (pack: AdviserExportPack) =>
  joinText([
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
    pack.draft.body,
    pack.draft.noDraftLine,
    pack.draft.reviewWarning,
    ...pack.safetyNotes,
    pack.workplaceSupportPack?.title,
    pack.workplaceSupportPack?.summary,
    ...(pack.workplaceSupportPack?.keyFactsToCheck ?? []),
    ...(pack.workplaceSupportPack?.evidenceToGather ?? []),
    ...(pack.workplaceSupportPack?.questionsToAsk ?? []),
    ...(pack.workplaceSupportPack?.cannotKnow ?? []),
    ...(pack.workplaceSupportPack?.riskWarnings ?? []),
    ...(pack.workplaceSupportPack?.signposting ?? []),
    pack.communityHelperPack?.title,
    pack.communityHelperPack?.summary,
    ...(pack.communityHelperPack?.dailyLifeImpact ?? []),
    ...(pack.communityHelperPack?.adminBarriers ?? []),
    ...(pack.communityHelperPack?.communicationBarriers ?? []),
    ...(pack.communityHelperPack?.keyFactsToCheck ?? []),
    ...(pack.communityHelperPack?.evidenceToGather ?? []),
    ...(pack.communityHelperPack?.questionsToAsk ?? []),
    ...(pack.communityHelperPack?.cannotKnow ?? []),
    ...(pack.communityHelperPack?.safeNextSteps ?? []),
    ...(pack.communityHelperPack?.preparationOnlyNotes ?? []),
    ...(pack.communityHelperPack?.consentAndControlNotes ?? []),
    ...(pack.communityHelperPack?.riskWarnings ?? []),
    ...(pack.communityHelperPack?.signposting ?? []),
  ]);

// Community Helper Pack - scans every user-facing field of a generated pack.
 // The adviser export collector also includes communityHelperPack fields so
 // combined-artifact regression tests cover the exported Markdown path.
export const collectTextFromCommunityHelperPack = (pack: CommunityHelperPack) =>
  joinText([
    pack.title,
    pack.summary,
    ...pack.dailyLifeImpact,
    ...pack.adminBarriers,
    ...pack.communicationBarriers,
    ...pack.keyFactsToCheck,
    ...pack.evidenceToGather,
    ...pack.questionsToAsk,
    ...pack.cannotKnow,
    ...pack.safeNextSteps,
    ...pack.preparationOnlyNotes,
    ...pack.consentAndControlNotes,
    ...pack.riskWarnings,
    ...pack.signposting,
  ]);

export const collectTextFromResultViewModel = (viewModel: ResultViewModel) =>
  joinText([
    viewModel.title,
    viewModel.summary,
    viewModel.primaryStatusLabel,
    viewModel.summaryView.title,
    viewModel.summaryView.summary,
    viewModel.summaryView.statusLabel,
    viewModel.primaryAction?.label,
    viewModel.primaryAction?.description,
    viewModel.bestNextMove?.label,
    viewModel.bestNextMove?.description,
    viewModel.bestNextMove?.whyThisHelps,
    ...viewModel.keyDates.map((date) => `${date.label} ${date.value} ${date.caution}`),
    ...viewModel.moneyMentioned.map((line) => `${line.label} ${line.amountText} ${line.caution}`),
    ...viewModel.evidenceFound.map((item) => `${item.label} ${item.value}`),
    ...viewModel.evidenceToGather.map((item) => `${item.label} ${item.value}`),
    ...viewModel.questionsToAnswer,
    ...viewModel.risks,
    ...viewModel.cannotKnow,
    ...viewModel.uncertainty,
    ...viewModel.safetyNotes,
    ...viewModel.safetyView.notes,
    ...viewModel.safetyView.cannotKnow,
    ...viewModel.safetyView.uncertainty,
    viewModel.draftOrChecklist?.title,
    viewModel.draftOrChecklist?.body,
    ...viewModel.sections.flatMap((section) => [section.title, ...section.items]),
    ...viewModel.detailSections.flatMap((section) => [section.title, ...section.items]),
  ]);
