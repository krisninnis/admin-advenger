import type { AdminCase, MoneyImpact, OpportunityCard } from "../types";
import type { BenefitsActionPack, BenefitsKeyDate, BenefitsMoneyLine } from "./benefitsActionPack";
import type { CareerRequirementEvidenceMapItem, CareerSupportPack } from "./careerSupportPack";
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

export type ResultUrgencyLevel = "high" | "medium" | "low" | "unconfirmed";

// Presentation-only urgency view. `level` is a plain re-presentation of the
// existing AdminCase urgency already supplied to buildResultViewModel. It is
// never derived from, raised, or lowered by the presence or absence of a date;
// a date only supplements the human-readable `detail`.
export type ResultUrgencyView = {
  level: ResultUrgencyLevel;
  headline: string;
  detail: string;
  source: ResultViewSource;
};

export type ResultViewModel = {
  resultKind: "standard" | "career_support";
  title: string;
  summary: string;
  directAnswer?: string;
  primaryStatusLabel?: string;
  summaryView: ResultSummaryView;
  primaryAction?: ResultPrimaryActionView;
  bestNextMove?: ResultBestNextMoveView;
  urgency: ResultUrgencyView;
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
  careerRequirementEvidenceMap?: CareerRequirementEvidenceMapItem[];
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

// Approved final urgency wording (R2). "not urgent" is never used, and no line
// claims that nothing is time-sensitive. Every level includes a check
// instruction.
export const RESULT_URGENCY_COPY: Record<ResultUrgencyLevel, string> = {
  high: "High priority to review. Check the original document's dates and requested action promptly.",
  medium: "Review soon. AdminAvenger cannot confirm the timing, so check the dates and requested action.",
  low: "Lower priority to review. Still check the original for dates and anything you are being asked to do.",
  unconfirmed: "Urgency not confirmed. Check the original for dates and requested action.",
};

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

const fromOpportunityDeadline = (opportunity?: OpportunityCard): ResultDateView | undefined =>
  opportunity?.deadline
    ? {
        id: "opportunity-deadline-1",
        label: safeText(opportunity.deadlineLabel, "Date or deadline to check"),
        value: safeText(opportunity.deadline, "Check the original document"),
        caution: RESULT_DATE_CAUTION,
        userMustCheck: true,
        source: "main_result",
      }
    : undefined;

const formatMoneyAmountOnly = (money: MoneyImpact) => {
  const amount = money.amount === undefined ? "Check the original document" : `GBP ${money.amount.toFixed(2)}`;
  const frequency =
    money.frequency === "monthly"
      ? " / month"
      : money.frequency === "annual"
        ? " / year"
        : "";

  return `${amount}${frequency}`;
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
  amountText: safeText(formatMoneyAmountOnly(money), "Check the original document"),
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

const isPaymentReminderOpportunity = (opportunity?: OpportunityCard, adminCase?: AdminCase) =>
  /^payment reminder to check$/i.test(opportunity?.title ?? adminCase?.title ?? "");

const buildPaymentReminderBestNextMove = (
  opportunity?: OpportunityCard,
): ResultBestNextMoveView => {
  const deadlineText = opportunity?.deadline
    ? ` Contact the provider before ${opportunity.deadline} if contact is needed.`
    : "";

  return {
    label: "Check the account, amount, and payment status",
    description:
      `Check that the account reference belongs to you, whether the amount is correct, and whether it has already been paid. Use an independently verified provider channel rather than links or contact details you have not checked.${deadlineText} Keep proof of payment.`,
    whyThisHelps:
      "This keeps the payment reminder factual without deciding that the amount is valid or legally owed.",
    source: "best_next_move",
  };
};

const buildBroadbandPriceRiseBestNextMove = (
  opportunity?: OpportunityCard,
): ResultBestNextMoveView | undefined => {
  const label = opportunity?.recommendedPathSteps?.[0];
  const description = opportunity?.nextBestAction;

  if (!label || !description) {
    return undefined;
  }

  return {
    label,
    description,
    whyThisHelps: safeText(opportunity.opportunityNote, description),
    source: "best_next_move",
  };
};

const buildCareerBestNextMove = (
  careerSupportPack?: CareerSupportPack,
): ResultBestNextMoveView => {
  if (careerSupportPack?.documentType === "cv_job_advert_match") {
    return {
      label: "Compare advert requirements with truthful CV evidence",
      description:
        "Review the requirements found in the advert, then choose CV evidence that may match and can be explained accurately.",
      whyThisHelps:
        "This keeps the application preparation specific to the advert without pretending AdminAvenger can decide suitability or outcomes.",
      source: "best_next_move",
    };
  }

  return {
    label: "Choose the target role before editing the CV",
    description:
      "Pick the job type or job advert first, then tailor the strongest evidence, projects, skills, and training to that role.",
    whyThisHelps:
      "A CV is stronger when it is tailored to a specific role instead of being reviewed in isolation.",
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

const noClearCareerEvidenceFallback = "No clear CV evidence found for this requirement yet.";
const noClearCareerEvidenceText = "no clear cv evidence found";

const isNoClearCareerEvidence = (item: string): boolean =>
  item.trim().toLowerCase().startsWith(noClearCareerEvidenceText);

const normaliseCareerEvidenceKey = (item: string): string =>
  item.trim().replace(/\s+/g, " ").toLowerCase();

const buildMappedCareerEvidenceKeys = (careerSupportPack?: CareerSupportPack): Set<string> =>
  new Set(
    (careerSupportPack?.requirementEvidenceMap ?? [])
      .flatMap((item) => item.possibleEvidence)
      .filter((item) => !isNoClearCareerEvidence(item))
      .map(normaliseCareerEvidenceKey),
  );

const keepMappedCareerEvidence = (items: string[], mappedEvidenceKeys: Set<string>): string[] =>
  items.filter((item) => mappedEvidenceKeys.has(normaliseCareerEvidenceKey(item)));

const containsAnyCareerTerm = (text: string, terms: string[]): boolean => {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
};

const developerRequirementTerms = [
  "front-end",
  "frontend",
  "developer",
  "html",
  "css",
  "javascript",
  "react",
  "typescript",
  "component",
  "ui",
  "user interface",
  "bug",
  "debug",
  "fix",
  "page",
  "website",
  "app",
  "code",
  "test",
  "software",
];

const adminDataRequirementTerms = [
  "admin",
  "data",
  "privacy",
  "record",
  "records",
  "excel",
  "crm",
  "gdpr",
  "confidential",
  "confidentiality",
  "spreadsheet",
  "spreadsheets",
  "customer information",
  "compliance",
];

const adminDataEvidenceTerms = [
  "managed inboxes",
  "inboxes",
  "appointments",
  "documents",
  "data protection",
  "gdpr",
  "confidential",
  "confidentiality",
  "customer information",
  "data issues",
  "crm",
  "excel",
  "spreadsheet",
  "spreadsheets",
  "record keeping",
  "customer records",
  "technical/practical problem solving",
];

const isStandaloneYearEvidence = (item: string): boolean =>
  /^\s*\d{4}\s*(?:[–-]\s*\d{4})?\s*\.?\s*$/.test(item);

const shouldKeepCareerRequirementEvidence = (requirement: string, evidence: string): boolean => {
  if (isNoClearCareerEvidence(evidence) || isStandaloneYearEvidence(evidence)) {
    return false;
  }

  const isDeveloperRequirement = containsAnyCareerTerm(requirement, developerRequirementTerms);
  const requirementAsksForAdminData = containsAnyCareerTerm(requirement, adminDataRequirementTerms);
  const isAdminDataEvidence = containsAnyCareerTerm(evidence, adminDataEvidenceTerms);

  if (isDeveloperRequirement && !requirementAsksForAdminData && isAdminDataEvidence) {
    return false;
  }

  return true;
};

const buildFinalCareerRequirementEvidenceMap = (
  careerSupportPack?: CareerSupportPack,
): CareerRequirementEvidenceMapItem[] | undefined => {
  if (!careerSupportPack?.requirementEvidenceMap) {
    return careerSupportPack?.requirementEvidenceMap;
  }

  if (careerSupportPack.documentType !== "cv_job_advert_match") {
    return careerSupportPack.requirementEvidenceMap;
  }

  return careerSupportPack.requirementEvidenceMap.map((item) => {
    const possibleEvidence = item.possibleEvidence.filter((evidence) =>
      shouldKeepCareerRequirementEvidence(item.requirement, evidence),
    );

    return {
      ...item,
      possibleEvidence: possibleEvidence.length > 0 ? possibleEvidence : [noClearCareerEvidenceFallback],
    };
  });
};

const buildMappedCareerEvidenceKeysFromMap = (
  requirementEvidenceMap?: CareerRequirementEvidenceMapItem[],
): Set<string> =>
  new Set(
    (requirementEvidenceMap ?? [])
      .flatMap((item) => item.possibleEvidence)
      .filter((item) => !isNoClearCareerEvidence(item))
      .map(normaliseCareerEvidenceKey),
  );

const buildCareerRequirementChecklistBlocks = (
  requirementEvidenceMap?: CareerRequirementEvidenceMapItem[],
): string[] =>
  (requirementEvidenceMap ?? [])
    .map((item) => {
      const possibleEvidence = cleanStringItems(
        item.possibleEvidence.map((evidence) => `Possible CV evidence to consider: ${evidence}`),
      );
      const block = cleanStringItems([
        `Requirement to compare: ${item.requirement}`,
        ...possibleEvidence,
        `Example to prepare: ${item.exampleToPrepare}`,
        item.verificationNote,
      ]);

      return block.join("\n");
    })
    .filter(Boolean);

// Presentation-only urgency, derived solely from the existing AdminCase urgency.
// A first actionable date may supplement the explanation but never sets the level.
const buildUrgencyView = (
  adminCase: AdminCase | undefined,
  keyDates: ResultDateView[],
): ResultUrgencyView => {
  const caseUrgency = adminCase?.urgency;
  const level: ResultUrgencyLevel =
    caseUrgency === "high" || caseUrgency === "medium" || caseUrgency === "low"
      ? caseUrgency
      : "unconfirmed";
  const firstDate = keyDates[0];
  const detail = firstDate
    ? `There is a date to check: ${firstDate.label}: ${firstDate.value}.`
    : "";

  return {
    level,
    headline: RESULT_URGENCY_COPY[level],
    detail,
    source: "main_result",
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
  const isCareerSupportResult = Boolean(careerSupportPack);
  const isCareerMatchResult = careerSupportPack?.documentType === "cv_job_advert_match";
  // HMRC tax code notices get a stricter, deduplicated evidence composition
  // (see evidenceFound / evidenceToGather below). Scoped by document type so
  // every other result type keeps its existing evidence behaviour unchanged.
  const isHmrcTaxCodeResult = decisionResult?.documentType === "hmrc_tax_code_notice";
  const finalCareerRequirementEvidenceMap = buildFinalCareerRequirementEvidenceMap(careerSupportPack);
  const mappedCareerEvidenceKeys = isCareerMatchResult
    ? buildMappedCareerEvidenceKeysFromMap(finalCareerRequirementEvidenceMap)
    : buildMappedCareerEvidenceKeys(careerSupportPack);
  const finalCareerCvEvidence =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.cvEvidenceThatMayMatch ?? [], mappedCareerEvidenceKeys)
      : (careerSupportPack?.cvEvidenceThatMayMatch ?? []);
  const finalCareerStrongEvidence =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.strongEvidenceToConsider ?? [], mappedCareerEvidenceKeys)
      : (careerSupportPack?.strongEvidenceToConsider ?? []);
  const finalCareerStrengths =
    isCareerMatchResult ? [] : (careerSupportPack?.strengthsToHighlight ?? []);
  const finalCareerEvidenceToUse =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.evidenceToUse, mappedCareerEvidenceKeys)
      : (careerSupportPack?.evidenceToUse ?? []);
  const finalCareerProjects =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.projectsToHighlight, mappedCareerEvidenceKeys)
      : (careerSupportPack?.projectsToHighlight ?? []);
  const finalCareerExperience =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.experienceToFrame, mappedCareerEvidenceKeys)
      : (careerSupportPack?.experienceToFrame ?? []);
  const finalCareerEducation =
    isCareerMatchResult && careerSupportPack
      ? keepMappedCareerEvidence(careerSupportPack.educationAndTraining, mappedCareerEvidenceKeys)
      : (careerSupportPack?.educationAndTraining ?? []);
  const bestNextMove = isCareerSupportResult
    ? buildCareerBestNextMove(careerSupportPack)
    : isPaymentReminderOpportunity(opportunity, adminCase)
      ? buildPaymentReminderBestNextMove(opportunity)
      : opportunity?.opportunityType === "bill_or_price_increase"
        ? (buildBroadbandPriceRiseBestNextMove(opportunity) ??
          buildBestNextMove(strategicNextStepPlan))
        : buildBestNextMove(strategicNextStepPlan);
  const title = safeText(
    opportunity?.title ??
      benefitsActionPack?.title ??
      workplaceSupportPack?.title ??
      communityHelperPack?.title ??
      (careerSupportPack
        ? careerSupportPack.documentType === "cv_job_advert_match"
          ? "CV and job advert match notes"
          : careerSupportPack.documentType === "cv"
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
    fromOpportunityDeadline(opportunity),
  ].filter((date): date is ResultDateView => Boolean(date)));
  const urgency = buildUrgencyView(adminCase, keyDates);
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
          ...(careerSupportPack.requirementsFound ?? []).map((requirement, index) => ({
            id: `career-requirement-${index + 1}`,
            label: "Requirement found",
            value: safeText(requirement, "Check advert requirement"),
            source: "career_support_pack" as const,
          })),
          ...finalCareerCvEvidence.map((evidence, index) => ({
            id: `career-match-evidence-${index + 1}`,
            label: "CV evidence that may match",
            value: safeText(evidence, "Check CV evidence"),
            source: "career_support_pack" as const,
          })),
          ...finalCareerStrengths.map((strength, index) => ({
            id: `career-strength-${index + 1}`,
            label: "Strength to highlight",
            value: safeText(strength, "Check strength"),
            source: "career_support_pack" as const,
          })),
          ...finalCareerProjects.map((project, index) => ({
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
    // decisionResult.sourceFacts already carries the genuine parsed facts for a
    // decision-engine result. For HMRC tax code notices, adminCase.evidence
    // re-derives those same facts and additionally bundles possible grounds,
    // missing-evidence, deadlines, risks and safety notes - none of which are
    // "evidence found". Pulling it in here is what inflated the HMRC evidence
    // count, so it is skipped for that document type; all other types keep the
    // existing behaviour.
    ...(isHmrcTaxCodeResult
      ? []
      : (adminCase?.evidence.map((_, index) => fromCaseEvidence(adminCase, index)) ?? [])),
  ]);
  // For HMRC tax code notices, decisionResult.evidenceNeeded is the single
  // authoritative "still to gather" list. The opportunity card's
  // missingInformation (and the strategic plan derived from it) deliberately
  // folds in uncertainty and cannot-know statements for its own panel; those
  // must not leak into the evidence-to-gather count here. Every other document
  // type keeps the existing combined behaviour.
  const evidenceToGatherValues = cleanStringItems(
    isHmrcTaxCodeResult
      ? [...(decisionResult?.evidenceNeeded ?? [])]
      : [
          ...(benefitsActionPack?.evidenceMissing ?? []),
          ...(workplaceSupportPack?.evidenceToGather ?? []),
          ...(communityHelperPack?.evidenceToGather ?? []),
          ...(careerSupportPack?.possibleGapsToCheck ?? []),
          ...(strategicNextStepPlan?.missingInformation ?? []),
          ...(decisionResult?.evidenceNeeded ?? []),
          ...(opportunity?.missingInformation ?? []),
        ],
  );
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
    ...(isCareerSupportResult ? [] : (strategicNextStepPlan?.movesToAvoid ?? [])),
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
    ...(isCareerSupportResult ? [] : (strategicNextStepPlan?.cannotKnow ?? [])),
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
          "Review every claim before sharing with an employer or recruiter.",
          "Check dates, qualifications, project links, and role titles against your records.",
          "Tailor the CV to the job advert where appropriate.",
          "Do not imply experience or qualifications you cannot honestly explain.",
        ]
      : []),
    ...(isCareerSupportResult ? [] : (strategicNextStepPlan?.uncertainty ?? [])),
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
    ...(isCareerSupportResult ? [] : (strategicNextStepPlan?.safetyNotes ?? [])),
    ...(benefitsActionPack?.safetyNotes ?? []),
    ...(decisionResult?.safetyNotes ?? []),
  ], RESULT_NO_CONTACT_SAFETY_NOTE);
  const draftOrChecklist = buildDraftView(benefitsActionPack, decisionResult, workplaceSupportPack);
  const careerRequirementChecklistBlocks = buildCareerRequirementChecklistBlocks(finalCareerRequirementEvidenceMap);
  const careerChecklist: ResultDraftView | undefined = careerSupportPack
    ? {
        title: "Career preparation checklist",
        body: [
          ...careerRequirementChecklistBlocks,
          cleanStringItems([
            ...(careerSupportPack.requirementsFound ?? []).map((item) => `Advert requirement to review: ${item}`),
            ...finalCareerCvEvidence.map((item) => `CV evidence that may match: ${item}`),
            ...(careerSupportPack.examplesToPrepare ?? []),
            ...(careerSupportPack.claimsToVerify ?? []),
            ...careerSupportPack.nextPreparationSteps,
            ...careerSupportPack.saferRewriteSuggestions,
            "Review every claim before using or sharing it.",
          ]).join("\n"),
        ].filter(Boolean).join("\n"),
        source: "career_support_pack",
      }
    : undefined;
  const effectiveDraftOrChecklist = careerChecklist ?? draftOrChecklist;
  const sections = [
    makeSection("summary", "Summary", [summary], "main_result", "summary"),
    careerSupportPack
      ? makeSection(
          "career-requirement-evidence-map",
          "Requirement-by-requirement evidence map",
          (finalCareerRequirementEvidenceMap ?? []).map((item) => item.requirement),
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-role-clues",
          "Role/title clues found",
          careerSupportPack.roleClues ?? [],
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-requirements-found",
          "Requirements found in the advert",
          careerSupportPack.requirementsFound ?? [],
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-cv-evidence-may-match",
          "CV evidence that may match",
          finalCareerCvEvidence,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-strong-evidence-to-consider",
          "Strong evidence to consider using",
          finalCareerStrongEvidence,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-advert-wording-to-review",
          "Wording from the advert to review",
          careerSupportPack.advertWordingToReview ?? [],
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-examples-to-prepare",
          "Examples to prepare before applying",
          careerSupportPack.examplesToPrepare ?? [],
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-claims-to-verify",
          "Claims to verify before sending",
          careerSupportPack.claimsToVerify ?? [],
          "career_support_pack",
          "summary",
        )
      : undefined,
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
          finalCareerStrengths,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-evidence",
          "Evidence to use",
          finalCareerEvidenceToUse,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-projects",
          "Projects to highlight",
          finalCareerProjects,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-experience",
          "Experience to frame",
          finalCareerExperience,
          "career_support_pack",
          "summary",
        )
      : undefined,
    careerSupportPack
      ? makeSection(
          "career-education",
          "Education/training to mention",
          finalCareerEducation,
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
    directAnswer: decisionResult?.directAnswer,
    primaryStatusLabel,
    summaryView,
    primaryAction,
    bestNextMove,
    urgency,
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
    careerRequirementEvidenceMap: finalCareerRequirementEvidenceMap,
    sections,
    detailSections,
    showBenefitsActionPack: Boolean(benefitsActionPack),
    showStrategicNextStep: Boolean(strategicNextStepPlan && !isCareerSupportResult),
  };
};

export const flattenResultViewModelText = (model: ResultViewModel) =>
  [
    model.title,
    model.summary,
    model.directAnswer ?? "",
    model.primaryStatusLabel ?? "",
    model.primaryAction?.label ?? "",
    model.primaryAction?.description ?? "",
    model.bestNextMove?.label ?? "",
    model.bestNextMove?.description ?? "",
    model.bestNextMove?.whyThisHelps ?? "",
    model.urgency.headline,
    model.urgency.detail,
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
    ...(model.careerRequirementEvidenceMap ?? []).flatMap((item) => [
      item.requirement,
      ...item.possibleEvidence,
      item.exampleToPrepare,
      item.verificationNote,
    ]),
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
