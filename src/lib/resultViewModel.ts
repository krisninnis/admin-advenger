import type { AdminCase, MoneyImpact, OpportunityCard } from "../types";
import type { BenefitsActionPack, BenefitsKeyDate, BenefitsMoneyLine } from "./benefitsActionPack";
import type { CareerSupportPack } from "./careerSupportPack";
import type { CommunityHelperPack } from "./communityHelperPack";
import type { DecisionAmountTreatment, DecisionResult, DecisionSourceFact } from "./decisionEngine/types";
import {
  FORBIDDEN_ADVERSARIAL_LANGUAGE,
  FORBIDDEN_ADVICE_CLAIMS,
  FORBIDDEN_AUTOMATION_CLAIMS,
  FORBIDDEN_COMMUNITY_HELPER_CLAIMS,
  FORBIDDEN_MONEY_CLAIMS,
  FORBIDDEN_OUTCOME_CLAIMS,
  normaliseSafetyText,
} from "./safetyWording";
import type { StrategicNextStepPlan } from "./strategicNextStep";
import type { WorkplaceSupportPack } from "./workplaceSupportPack";

export type ResultViewSource =
  | "main_result"
  | "benefits_action_pack"
  | "workplace_support_pack"
  | "community_helper_pack"
  | "career_support_pack"
  | "best_next_move"
  | "case"
  | "draft";

export type ResultSummaryView = {
  title: string;
  summary: string;
  statusLabel?: string;
  source: ResultViewSource;
};

export type ResultPrimaryActionView = {
  label: string;
  description: string;
  source: ResultViewSource;
};

export type ResultSafetyView = {
  notes: string[];
  cannotKnow: string[];
  uncertainty: string[];
  source: ResultViewSource;
};

export type ResultSectionView = {
  id: string;
  title: string;
  items: string[];
  source: ResultViewSource;
  priority: "summary" | "detail";
};

export type ResultDateView = {
  id: string;
  label: string;
  value: string;
  caution: string;
  userMustCheck: true;
  source: ResultViewSource;
  sourceQuote?: string;
};

export type ResultMoneyView = {
  id: string;
  label: string;
  amountText: string;
  treatment: DecisionAmountTreatment;
  caution: string;
  countedInMoneyTracker: false;
  source: ResultViewSource;
  sourceQuote?: string;
};

export type ResultEvidenceView = {
  id: string;
  label: string;
  value: string;
  source: ResultViewSource;
  sourceQuote?: string;
};

export type ResultDraftView = {
  title: string;
  body: string;
  source: ResultViewSource;
};

export type ResultBestNextMoveView = {
  label: string;
  description: string;
  whyThisHelps: string;
  source: "best_next_move";
};

export type ResultViewModel = {
  resultKind: "standard" | "career_support";
  title: string;
  summary: string;
  primaryStatusLabel?: string;
  summaryView: ResultSummaryView;
  primaryAction?: ResultPrimaryActionView;
  bestNextMove?: ResultBestNextMoveView;
  keyDates: ResultDateView[];
  moneyMentioned: ResultMoneyView[];
  evidenceFound: ResultEvidenceView[];
  evidenceToGather: ResultEvidenceView[];
  questionsToAnswer: string[];
  risks: string[];
  cannotKnow: string[];
  uncertainty: string[];
  safetyNotes: string[];
  safetyView: ResultSafetyView;
  draftOrChecklist?: ResultDraftView;
  sections: ResultSectionView[];
  detailSections: ResultSectionView[];
  showBenefitsActionPack: boolean;
  showStrategicNextStep: boolean;
};

export type BuildResultViewModelInput = {
  decisionResult?: DecisionResult;
  benefitsActionPack?: BenefitsActionPack | null;
  workplaceSupportPack?: WorkplaceSupportPack;
  communityHelperPack?: CommunityHelperPack;
  careerSupportPack?: CareerSupportPack;
  strategicNextStepPlan?: StrategicNextStepPlan;
  opportunity?: OpportunityCard;
  adminCase?: AdminCase;
};

export type ResultViewModelSafetyReport = {
  forbiddenPhrases: string[];
  adversarialPhrases: string[];
  hasForbiddenWording: boolean;
  hasAdversarialLanguage: boolean;
  cannotKnowPresent: boolean;
  uncertaintyPresent: boolean;
  datesUserCheckRequired: boolean;
  moneyDisplayOnly: boolean;
  noContactSafetyNotePresent: boolean;
  safe: boolean;
};

export const RESULT_NO_CONTACT_SAFETY_NOTE =
  "AdminAvenger does not contact anyone for you. You decide what happens next.";

export const RESULT_DATE_CAUTION =
  "Check this date against the original letter or message before acting.";

export const RESULT_MONEY_CAUTION =
  "This is money mentioned in the document. AdminAvenger has not counted it as saved, recovered, or owed.";

export const RESULT_FORBIDDEN_PHRASES = [
  ...FORBIDDEN_OUTCOME_CLAIMS,
  ...FORBIDDEN_ADVICE_CLAIMS,
  ...FORBIDDEN_ADVERSARIAL_LANGUAGE,
  ...FORBIDDEN_MONEY_CLAIMS,
  ...FORBIDDEN_AUTOMATION_CLAIMS,
  ...FORBIDDEN_COMMUNITY_HELPER_CLAIMS,
] as const;

export const RESULT_ADVERSARIAL_PHRASES = FORBIDDEN_ADVERSARIAL_LANGUAGE;

const fallbackTitle = "Admin document check";
const fallbackSummary =
  "AdminAvenger found an admin message that needs a careful check before you decide what to do.";
const fallbackCannotKnow =
  "AdminAvenger cannot verify anything outside the text, image, or file you provided.";
const fallbackUncertainty =
  "Some details may be missing, unclear, or need checking against the original document.";

const moneyImpactsFor = (opportunity?: OpportunityCard): MoneyImpact[] =>
  opportunity?.moneyImpactRows && opportunity.moneyImpactRows.length > 0
    ? opportunity.moneyImpactRows
    : [
        opportunity?.moneyAtStake,
        opportunity?.potentialSaving,
        opportunity?.potentialRecovery,
        opportunity?.confirmedSaving,
        opportunity?.confirmedRecovery,
        opportunity?.annualisedAmount,
      ].filter((item): item is MoneyImpact => Boolean(item));

export const normaliseResultText = normaliseSafetyText;

const hasAnyPhrase = (value: string, phrases: readonly string[]) => {
  const key = normaliseResultText(value);

  return phrases.some((phrase) => key.includes(phrase));
};

const isSafeResultText = (value: string) => !hasAnyPhrase(value, RESULT_FORBIDDEN_PHRASES);

const safeText = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();

  if (!trimmed || !isSafeResultText(trimmed)) {
    return fallback;
  }

  return trimmed;
};

const cleanStringItems = (items: Array<string | undefined>, fallback?: string) => {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const item of items) {
    const trimmed = item?.trim();

    if (!trimmed || !isSafeResultText(trimmed)) {
      continue;
    }

    const key = normaliseResultText(trimmed);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    cleaned.push(trimmed);
  }

  if (cleaned.length === 0 && fallback) {
    cleaned.push(fallback);
  }

  return cleaned;
};

export const dedupeResultItems = <Item>(
  items: Item[],
  getText: (item: Item) => string,
) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normaliseResultText(getText(item));

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const makeSection = (
  id: string,
  title: string,
  items: string[],
  source: ResultViewSource,
  priority: ResultSectionView["priority"],
): ResultSectionView | undefined =>
  items.length > 0
    ? {
        id,
        title,
        items,
        source,
        priority,
      }
    : undefined;

const getDateFacts = (sourceFacts: DecisionSourceFact[]) =>
  sourceFacts.filter((fact) => /date|deadline|period|appointment|review|due|until/i.test(fact.label));

const fromBenefitsDate = (date: BenefitsKeyDate): ResultDateView => ({
  id: date.id,
  label: safeText(date.label, "Date to check"),
  value: safeText(date.value, "Check the original document"),
  caution: date.caution,
  userMustCheck: true,
  source: "benefits_action_pack",
  sourceQuote: date.sourceQuote,
});

const fromDecisionDate = (fact: DecisionSourceFact, index: number): ResultDateView => ({
  id: `decision-date-${index + 1}`,
  label: safeText(fact.label, "Date to check"),
  value: safeText(fact.value, "Check the original document"),
  caution: RESULT_DATE_CAUTION,
  userMustCheck: true,
  source: "main_result",
  sourceQuote: fact.sourceQuote,
});

const fromDeadline = (deadline: string, index: number): ResultDateView => ({
  id: `deadline-${index + 1}`,
  label: "Date or deadline to check",
  value: safeText(deadline, "Check the original document"),
  caution: RESULT_DATE_CAUTION,
  userMustCheck: true,
  source: "main_result",
});

const formatMoneyImpact = (money: MoneyImpact) => {
  const amount = money.amount === undefined ? "" : `: GBP ${money.amount.toFixed(2)}`;
  const frequency =
    money.frequency === "monthly"
      ? " / month"
      : money.frequency === "annual"
        ? " / year"
        : "";

  return `${money.label}${amount}${frequency}`;
};

const fromBenefitsMoneyLine = (line: BenefitsMoneyLine): ResultMoneyView => ({
  id: line.id,
  label: safeText(line.label, "Money mentioned"),
  amountText: safeText(line.amountText, "Check the original document"),
  treatment: line.treatment,
  caution: `${line.caution} Not counted in savings, recovered money, or the money tracker.`,
  countedInMoneyTracker: false,
  source: "benefits_action_pack",
  sourceQuote: line.sourceQuote,
});

const fromOpportunityMoney = (money: MoneyImpact, index: number): ResultMoneyView => ({
  id: `opportunity-money-${index + 1}`,
  label: safeText(money.label, "Money mentioned"),
  amountText: safeText(formatMoneyImpact(money), "Check the original document"),
  treatment:
    money.status === "potential"
      ? "possible_refund_or_reduction"
      : money.status === "pending"
        ? "amount_mentioned_only"
        : "no_money_counted",
  caution: RESULT_MONEY_CAUTION,
  countedInMoneyTracker: false,
  source: "main_result",
});

const fromSourceFactEvidence = (fact: DecisionSourceFact, index: number): ResultEvidenceView => ({
  id: `source-fact-${index + 1}`,
  label: safeText(fact.label, "Evidence found"),
  value: safeText(fact.value, "Check the original document"),
  source: "main_result",
  sourceQuote: fact.sourceQuote,
});

const fromCaseEvidence = (adminCase: AdminCase, index: number): ResultEvidenceView => ({
  id: `case-evidence-${index + 1}`,
  label: safeText(adminCase.evidence[index]?.label, "Case evidence"),
  value: safeText(adminCase.evidence[index]?.value, "Check the case file"),
  source: "case",
});

const fromMissingEvidence = (value: string, index: number, source: ResultViewSource): ResultEvidenceView => ({
  id: `${source}-missing-${index + 1}`,
  label: "To gather",
  value,
  source,
});

const dedupeEvidence = (items: ResultEvidenceView[]) =>
  dedupeResultItems(
    items.filter((item) => isSafeResultText(`${item.label} ${item.value}`)),
    (item) => `${item.label}:${item.value}`,
  );

const dedupeDates = (dates: ResultDateView[]) =>
  dedupeResultItems(
    dates.filter((date) => isSafeResultText(`${date.label} ${date.value}`)),
    (date) => `${date.label}:${date.value}`,
  );

const dedupeMoney = (money: ResultMoneyView[]) =>
  dedupeResultItems(
    money.filter((line) => isSafeResultText(`${line.label} ${line.amountText}`)),
    (line) => `${line.label}:${line.amountText}`,
  );

const buildBestNextMove = (
  strategicNextStepPlan: StrategicNextStepPlan | undefined,
): ResultBestNextMoveView | undefined => {
  if (!strategicNextStepPlan) {
    return undefined;
  }

  return {
    label: safeText(strategicNextStepPlan.safestMove.label, "Check the document before acting"),
    description: safeText(
      strategicNextStepPlan.safestMove.description,
      "Check the sender, date, reference, and what the message asks you to do.",
    ),
    whyThisHelps: safeText(
      strategicNextStepPlan.safestMove.whyThisHelps,
      "This keeps you in control while you check the facts.",
    ),
    source: "best_next_move",
  };
};

const buildDraftView = (
  benefitsActionPack: BenefitsActionPack | null | undefined,
  decisionResult: DecisionResult | undefined,
  workplaceSupportPack: WorkplaceSupportPack | undefined,
): ResultDraftView | undefined => {
  const body = safeText(benefitsActionPack?.draftOrChecklist ?? decisionResult?.draftMessage, "");

  if (!body) {
    if (!workplaceSupportPack || workplaceSupportPack.documentType === "settlement_agreement_signpost") {
      return undefined;
    }

    const checklist = cleanStringItems([
      "Workplace preparation checklist.",
      ...workplaceSupportPack.safeNextSteps,
      ...workplaceSupportPack.questionsToAsk.map((question) => `Question to ask: ${question}`),
      ...workplaceSupportPack.draftBoundaryNotes,
    ]).join("\n");

    return {
      title: "Workplace preparation checklist",
      body: checklist,
      source: "workplace_support_pack",
    };
  }

  return {
    title: benefitsActionPack?.draftOrChecklist ? "Draft/checklist" : "Draft message",
    body,
    source: "draft",
  };
};

export const buildResultViewModel = ({
  decisionResult,
  benefitsActionPack,
  workplaceSupportPack,
  communityHelperPack,
  careerSupportPack,
  strategicNextStepPlan,
  opportunity,
  adminCase,
}: BuildResultViewModelInput): ResultViewModel => {
  const bestNextMove = buildBestNextMove(strategicNextStepPlan);
  const isCareerSupportResult = Boolean(careerSupportPack);
  const title = safeText(
    opportunity?.title ??
      benefitsActionPack?.title ??
      workplaceSupportPack?.title ??
      communityHelperPack?.title ??
      (careerSupportPack
        ? careerSupportPack.documentType === "cv"
          ? "CV preparation notes"
          : careerSupportPack.documentType === "job_advert"
            ? "Job advert preparation notes"
            : "Career preparation notes"
        : undefined) ??
      decisionResult?.title ??
      adminCase?.title,
    fallbackTitle,
  );
  const summary = safeText(
    opportunity?.plainEnglishSummary ??
      benefitsActionPack?.summary ??
      workplaceSupportPack?.summary ??
      communityHelperPack?.summary ??
      careerSupportPack?.summary ??
      strategicNextStepPlan?.plainEnglishSummary ??
      decisionResult?.plainEnglishSummary ??
      adminCase?.summary,
    fallbackSummary,
  );
  const primaryStatusLabel = safeText(
    opportunity?.statusLabel ??
      (workplaceSupportPack ? "Workplace preparation only" : undefined) ??
      (communityHelperPack ? "Community support preparation only" : undefined) ??
      (careerSupportPack ? "Career preparation only - review before using" : undefined) ??
      decisionResult?.strengthLabel ??
      adminCase?.status,
    "Review before acting",
  );
  const primaryAction = bestNextMove
    ? {
        label: bestNextMove.label,
        description: bestNextMove.description,
        source: bestNextMove.source,
      }
    : undefined;
  const keyDates = dedupeDates([
    ...(benefitsActionPack?.possibleDatesToCheck.map(fromBenefitsDate) ?? []),
    ...getDateFacts(decisionResult?.sourceFacts ?? []).map(fromDecisionDate),
    ...(decisionResult?.deadlines.map(fromDeadline) ?? []),
  ]);
  const moneyMentioned = dedupeMoney([
    ...(benefitsActionPack?.moneyMentioned.map(fromBenefitsMoneyLine) ?? []),
    ...moneyImpactsFor(opportunity).map(fromOpportunityMoney),
  ]);
  const evidenceFound = dedupeEvidence([
    ...(careerSupportPack
      ? [
          ...careerSupportPack.likelyTargetRoles.map((role, index) => ({
            id: `career-role-${index + 1}`,
            label: "Likely target role",
            value: safeText(role, "Check target role"),
            source: "career_support_pack" as const,
          })),
          ...careerSupportPack.strengthsToHighlight.map((strength, index) => ({
            id: `career-strength-${index + 1}`,
            label: "Strength to highlight",
            value: safeText(strength, "Check strength"),
            source: "career_support_pack" as const,
          })),
          ...careerSupportPack.projectsToHighlight.map((project, index) => ({
            id: `career-project-${index + 1}`,
            label: "Project or portfolio evidence",
            value: safeText(project, "Check project evidence"),
            source: "career_support_pack" as const,
          })),
        ]
      : []),
    ...(benefitsActionPack?.evidenceFound.map((item) => ({
      id: item.id,
      label: safeText(item.label, "Evidence found"),
      value: safeText(item.value, "Check the original document"),
      source: "benefits_action_pack" as const,
      sourceQuote: item.sourceQuote,
    })) ?? []),
    ...(decisionResult?.sourceFacts.map(fromSourceFactEvidence) ?? []),
    ...(adminCase?.evidence.map((_, index) => fromCaseEvidence(adminCase, index)) ?? []),
  ]);
  const evidenceToGatherValues = cleanStringItems([
    ...(benefitsActionPack?.evidenceMissing ?? []),
    ...(workplaceSupportPack?.evidenceToGather ?? []),
    ...(communityHelperPack?.evidenceToGather ?? []),
    ...(careerSupportPack?.possibleGapsToCheck ?? []),
    ...(strategicNextStepPlan?.missingInformation ?? []),
    ...(decisionResult?.evidenceNeeded ?? []),
    ...(opportunity?.missingInformation ?? []),
  ]);
  const evidenceToGather = dedupeEvidence(
    evidenceToGatherValues.map((value, index) =>
      fromMissingEvidence(
        value,
        index,
        benefitsActionPack?.evidenceMissing.includes(value)
          ? "benefits_action_pack"
          : workplaceSupportPack?.evidenceToGather.includes(value)
            ? "workplace_support_pack"
            : communityHelperPack?.evidenceToGather.includes(value)
              ? "community_helper_pack"
              : careerSupportPack?.possibleGapsToCheck.includes(value)
                ? "career_support_pack"
              : "main_result",
      ),
    ),
  );
  const questionsToAnswer = cleanStringItems([
    ...(benefitsActionPack?.questionsToAnswer.map((question) => question.question) ?? []),
    ...(workplaceSupportPack?.questionsToAsk ?? []),
    ...(communityHelperPack?.questionsToAsk ?? []),
    ...(careerSupportPack?.possibleGapsToCheck ?? []),
    ...(decisionResult?.questionsToAnswer ?? []),
  ]);
  const risks = cleanStringItems([
    ...(benefitsActionPack?.risks ?? []),
    ...(workplaceSupportPack?.riskWarnings ?? []),
    ...(communityHelperPack?.riskWarnings ?? []),
    ...(decisionResult?.risks ?? []),
    ...(strategicNextStepPlan?.movesToAvoid ?? []),
  ]);
  const cannotKnow = cleanStringItems([
    ...(benefitsActionPack?.cannotKnow ?? []),
    ...(workplaceSupportPack?.cannotKnow ?? []),
    ...(communityHelperPack?.cannotKnow ?? []),
    ...(careerSupportPack
      ? [
          "AdminAvenger cannot know how an employer or recruiter will assess this material.",
          "AdminAvenger cannot verify experience, qualifications, dates, references, or portfolio links outside the text provided.",
        ]
      : []),
    ...(strategicNextStepPlan?.cannotKnow ?? []),
    ...(decisionResult?.cannotKnow ?? []),
  ], fallbackCannotKnow);
  const uncertainty = cleanStringItems([
    ...(benefitsActionPack?.uncertainty ?? []),
    ...(workplaceSupportPack
      ? [
          "Workplace information may depend on the full message, policies, contract, history, and advice from a suitable person.",
        ]
      : []),
    ...(communityHelperPack
      ? [
          "Community helper information may depend on the full situation, other documents, and advice from a suitable professional or trusted person.",
        ]
      : []),
    ...(careerSupportPack
      ? [
          "Career material may need tailoring to a specific job advert, employer, or application form.",
          "Some claims may need checking against the user's real experience, dates, projects, and training records.",
        ]
      : []),
    ...(strategicNextStepPlan?.uncertainty ?? []),
    ...(decisionResult?.uncertainty ?? []),
  ], fallbackUncertainty);
  const safetyNotes = cleanStringItems([
    RESULT_NO_CONTACT_SAFETY_NOTE,
    workplaceSupportPack ? "This is preparation only, not legal or employment advice." : undefined,
    workplaceSupportPack ? "AdminAvenger helps prepare. You stay in control." : undefined,
    workplaceSupportPack?.preparationOnlyWarning,
    ...(workplaceSupportPack?.signposting ?? []),
    communityHelperPack ? "This is preparation only, not a professional assessment." : undefined,
    communityHelperPack
      ? "AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity, eligibility, equipment, or adaptations."
      : undefined,
    communityHelperPack ? "AdminAvenger helps prepare. You stay in control." : undefined,
    ...(communityHelperPack?.preparationOnlyNotes ?? []),
    ...(communityHelperPack?.consentAndControlNotes ?? []),
    ...(communityHelperPack?.signposting ?? []),
    ...(careerSupportPack?.safetyNotes ?? []),
    ...(strategicNextStepPlan?.safetyNotes ?? []),
    ...(benefitsActionPack?.safetyNotes ?? []),
    ...(decisionResult?.safetyNotes ?? []),
  ], RESULT_NO_CONTACT_SAFETY_NOTE);
  const draftOrChecklist = buildDraftView(benefitsActionPack, decisionResult, workplaceSupportPack);
  const careerChecklist: ResultDraftView | undefined = careerSupportPack
    ? {
        title: "Career preparation checklist",
        body: cleanStringItems([
          ...careerSupportPack.nextPreparationSteps,
          ...careerSupportPack.saferRewriteSuggestions,
          "Review every claim before using or sharing it.",
        ]).join("\n"),
        source: "career_support_pack",
      }
    : undefined;
  const effectiveDraftOrChecklist = careerChecklist ?? draftOrChecklist;
  const sections = [
    makeSection("summary", "Summary", [summary], "main_result", "summary"),
    careerSupportPack
      ? makeSection(
          "career-target-roles",
          "Likely target roles",
          careerSupportPack.likelyTargetRoles,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-strengths",
          "Strengths to highlight",
          careerSupportPack.strengthsToHighlight,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-evidence",
          "Evidence to use",
          careerSupportPack.evidenceToUse,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-projects",
          "Projects to highlight",
          careerSupportPack.projectsToHighlight,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-experience",
          "Experience to frame",
          careerSupportPack.experienceToFrame,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-education",
          "Education/training to mention",
          careerSupportPack.educationAndTraining,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-gaps",
          "Possible gaps to check",
          careerSupportPack.possibleGapsToCheck,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-safer-rewrites",
          "Safer rewrite suggestions",
          careerSupportPack.saferRewriteSuggestions,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-next-steps",
          "Next preparation steps",
          careerSupportPack.nextPreparationSteps,
          "career_support_pack",
          "summary",
        )
      : undefined,
    workplaceSupportPack
      ? makeSection(
          "workplace-preparation",
          "Workplace preparation",
          [
            "This is preparation only, not legal or employment advice.",
            "AdminAvenger helps prepare. You stay in control.",
            ...workplaceSupportPack.safeNextSteps,
          ],
          "workplace_support_pack",
          "summary",
        )
      : undefined,
    workplaceSupportPack
      ? makeSection(
          "workplace-what-this-appears-to-be-about",
          "What this appears to be about",
          [workplaceSupportPack.summary],
          "workplace_support_pack",
          "summary",
        )
      : undefined,
    workplaceSupportPack
      ? makeSection(
          "workplace-key-facts-to-check",
          "Key facts to check",
          workplaceSupportPack.keyFactsToCheck,
          "workplace_support_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-preparation",
          "Community support preparation",
          [
            "This is preparation only, not a professional assessment.",
            "AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity, eligibility, equipment, or adaptations.",
            "AdminAvenger helps prepare. You stay in control.",
            ...communityHelperPack.safeNextSteps,
          ],
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-what-this-appears-to-be-about",
          "What this appears to be about",
          [communityHelperPack.summary],
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-daily-life-impact",
          "Daily-life impact",
          communityHelperPack.dailyLifeImpact,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-admin-barriers",
          "Admin and routine barriers",
          communityHelperPack.adminBarriers,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-communication-barriers",
          "Communication barriers",
          communityHelperPack.communicationBarriers,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-key-facts-to-check",
          "Key facts to check",
          communityHelperPack.keyFactsToCheck,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    bestNextMove
      ? makeSection(
          "best-next-move",
          "Best next move",
          [bestNextMove.label, bestNextMove.description, bestNextMove.whyThisHelps],
          "best_next_move",
          "summary",
        )
      : undefined,
    makeSection(
      "key-dates",
      "Key dates to check",
      keyDates.map((date) => `${date.label}: ${date.value}. ${date.caution}`),
      keyDates[0]?.source ?? "main_result",
      "summary",
    ),
    makeSection(
      "money-mentioned",
      "Money mentioned",
      moneyMentioned.map((line) => `${line.label}: ${line.amountText}. ${line.caution}`),
      moneyMentioned[0]?.source ?? "main_result",
      "summary",
    ),
    makeSection(
      "evidence-to-gather",
      "Evidence to gather",
      evidenceToGather.map((item) => item.value),
      evidenceToGather[0]?.source ?? "main_result",
      "summary",
    ),
    communityHelperPack
      ? makeSection(
          "community-helper-evidence-to-gather",
          "Evidence/context to gather",
          communityHelperPack.evidenceToGather,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    makeSection("questions", "Questions to answer", questionsToAnswer, "benefits_action_pack", "summary"),
    workplaceSupportPack
      ? makeSection(
          "workplace-questions-to-ask",
          "Questions to ask",
          workplaceSupportPack.questionsToAsk,
          "workplace_support_pack",
          "summary",
        )
      : undefined,
    workplaceSupportPack
      ? makeSection(
          "workplace-ask-someone-suitable",
          "Ask someone suitable",
          workplaceSupportPack.signposting,
          "workplace_support_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-questions-to-ask",
          "Questions to ask",
          communityHelperPack.questionsToAsk,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-consent-and-control-notes",
          "Consent and control notes",
          communityHelperPack.consentAndControlNotes,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-ask-someone-suitable",
          "Ask someone suitable",
          communityHelperPack.signposting,
          "community_helper_pack",
          "summary",
        )
      : undefined,
    effectiveDraftOrChecklist
      ? makeSection(
          "draft-or-checklist",
          effectiveDraftOrChecklist.title,
          [effectiveDraftOrChecklist.body],
          effectiveDraftOrChecklist.source,
          "summary",
        )
      : undefined,
    makeSection("safety", "Safety notes", safetyNotes, "main_result", "summary"),
  ].filter((section): section is ResultSectionView => Boolean(section));
  const detailSections = [
    makeSection("evidence-found", "Evidence found", evidenceFound.map((item) => `${item.label}: ${item.value}`), "main_result", "detail"),
    makeSection("risks", "Risks to be aware of", risks, "main_result", "detail"),
    makeSection("cannot-know", "What AdminAvenger cannot know", cannotKnow, "main_result", "detail"),
    makeSection("uncertainty", "Uncertainty", uncertainty, "main_result", "detail"),
    workplaceSupportPack
      ? makeSection(
          "workplace-preparation-only-notes",
          "Preparation-only notes",
          workplaceSupportPack.draftBoundaryNotes,
          "workplace_support_pack",
          "detail",
        )
      : undefined,
    communityHelperPack
      ? makeSection(
          "community-helper-preparation-only-notes",
          "Preparation-only notes",
          communityHelperPack.preparationOnlyNotes,
          "community_helper_pack",
          "detail",
        )
      : undefined,
  ].filter((section): section is ResultSectionView => Boolean(section));
  const summaryView: ResultSummaryView = {
    title,
    summary,
    statusLabel: primaryStatusLabel,
    source: opportunity
      ? "main_result"
      : benefitsActionPack
        ? "benefits_action_pack"
        : workplaceSupportPack
          ? "workplace_support_pack"
          : communityHelperPack
            ? "community_helper_pack"
            : careerSupportPack
              ? "career_support_pack"
            : "case",
  };
  const safetyView: ResultSafetyView = {
    notes: safetyNotes,
    cannotKnow,
    uncertainty,
    source: "main_result",
  };

  return {
    resultKind: isCareerSupportResult ? "career_support" : "standard",
    title,
    summary,
    primaryStatusLabel,
    summaryView,
    primaryAction,
    bestNextMove,
    keyDates,
    moneyMentioned,
    evidenceFound,
    evidenceToGather,
    questionsToAnswer,
    risks,
    cannotKnow,
    uncertainty,
    safetyNotes,
    safetyView,
    draftOrChecklist: effectiveDraftOrChecklist,
    sections,
    detailSections,
    showBenefitsActionPack: Boolean(benefitsActionPack),
    showStrategicNextStep: Boolean(strategicNextStepPlan),
  };
};

export const flattenResultViewModelText = (model: ResultViewModel) =>
  [
    model.title,
    model.summary,
    model.primaryStatusLabel ?? "",
    model.primaryAction?.label ?? "",
    model.primaryAction?.description ?? "",
    model.bestNextMove?.label ?? "",
    model.bestNextMove?.description ?? "",
    model.bestNextMove?.whyThisHelps ?? "",
    ...model.keyDates.map((date) => `${date.label} ${date.value} ${date.caution} ${date.sourceQuote ?? ""}`),
    ...model.moneyMentioned.map((line) => `${line.label} ${line.amountText} ${line.caution} ${line.sourceQuote ?? ""}`),
    ...model.evidenceFound.map((item) => `${item.label} ${item.value} ${item.sourceQuote ?? ""}`),
    ...model.evidenceToGather.map((item) => `${item.label} ${item.value}`),
    ...model.questionsToAnswer,
    ...model.risks,
    ...model.cannotKnow,
    ...model.uncertainty,
    ...model.safetyNotes,
    model.draftOrChecklist?.title ?? "",
    model.draftOrChecklist?.body ?? "",
    ...model.sections.flatMap((section) => [section.title, ...section.items]),
    ...model.detailSections.flatMap((section) => [section.title, ...section.items]),
  ].join("\n");

export const validateResultViewModelSafety = (model: ResultViewModel): ResultViewModelSafetyReport => {
  const text = flattenResultViewModelText(model);
  const forbiddenPhrases = RESULT_FORBIDDEN_PHRASES.filter((phrase) =>
    hasAnyPhrase(text, [phrase]),
  );
  const adversarialPhrases = RESULT_ADVERSARIAL_PHRASES.filter((phrase) =>
    hasAnyPhrase(text, [phrase]),
  );
  const datesUserCheckRequired = model.keyDates.every(
    (date) => date.userMustCheck === true && normaliseResultText(date.caution).includes("check"),
  );
  const moneyDisplayOnly = model.moneyMentioned.every(
    (line) => line.countedInMoneyTracker === false && normaliseResultText(line.caution).includes("not counted"),
  );
  const cannotKnowPresent = model.cannotKnow.length > 0;
  const uncertaintyPresent = model.uncertainty.length > 0;
  const noContactSafetyNotePresent = model.safetyNotes.some((note) =>
    normaliseResultText(note).includes("does not contact anyone"),
  );
  const hasForbiddenWording = forbiddenPhrases.length > 0;
  const hasAdversarialLanguage = adversarialPhrases.length > 0;

  return {
    forbiddenPhrases,
    adversarialPhrases,
    hasForbiddenWording,
    hasAdversarialLanguage,
    cannotKnowPresent,
    uncertaintyPresent,
    datesUserCheckRequired,
    moneyDisplayOnly,
    noContactSafetyNotePresent,
    safe:
      !hasForbiddenWording &&
      !hasAdversarialLanguage &&
      cannotKnowPresent &&
      uncertaintyPresent &&
      datesUserCheckRequired &&
      moneyDisplayOnly &&
      noContactSafetyNotePresent,
  };
};
