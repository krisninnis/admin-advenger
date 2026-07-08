import type { AdminCase, OpportunityCard } from "../types";
import type {
  DecisionAmountTreatment,
  DecisionDocumentType,
  DecisionResult,
  DecisionSourceFact,
} from "./decisionEngine/types";

export type BenefitsKeyDate = {
  id: string;
  label: string;
  value: string;
  sourceQuote?: string;
  userMustCheck: true;
  caution: string;
};

export type BenefitsMoneyLine = {
  id: string;
  label: string;
  amountText: string;
  sourceQuote?: string;
  treatment: DecisionAmountTreatment;
  countedInMoneyTracker: false;
  caution: string;
};

export type BenefitsEvidenceItem = {
  id: string;
  label: string;
  value: string;
  source: "detected" | "case_file";
  sourceQuote?: string;
};

export type BenefitsMissingQuestion = {
  id: string;
  question: string;
};

export type BenefitsActionPack = {
  id: string;
  title: string;
  documentType: DecisionDocumentType;
  documentStage: string;
  summary: string;
  whatMatters: string[];
  possibleDatesToCheck: BenefitsKeyDate[];
  moneyMentioned: BenefitsMoneyLine[];
  evidenceFound: BenefitsEvidenceItem[];
  evidenceMissing: string[];
  questionsToAnswer: BenefitsMissingQuestion[];
  uncertainty: string[];
  cannotKnow: string[];
  nextSafeStep: string;
  draftOrChecklist?: string;
  safetyNotes: string[];
};

type BenefitsDocumentType = Extract<
  DecisionDocumentType,
  | "benefits_evidence_prep"
  | "benefits_assessment_report"
  | "benefits_decision"
  | "benefits_appeal"
  | "benefits_review"
  | "benefits_uc_statement"
  | "benefits_uc_sanction"
  | "benefits_uc_deductions"
  | "benefits_wca_lcwra"
  | "benefits_migration_notice"
  | "benefits_change_of_circumstances"
  | "council_tax_reduction"
  | "benefits_crisis_support"
>;

export const BENEFITS_MONEY_CAUTION =
  "This is money mentioned in the letter. AdminAvenger has not checked whether it is correct.";

export const BENEFITS_DATE_CAUTION =
  "Check this date on your letter. This may matter, but AdminAvenger cannot confirm the deadline.";

const benefitsDocumentTypes = new Set<BenefitsDocumentType>([
  "benefits_evidence_prep",
  "benefits_assessment_report",
  "benefits_decision",
  "benefits_appeal",
  "benefits_review",
  "benefits_uc_statement",
  "benefits_uc_sanction",
  "benefits_uc_deductions",
  "benefits_wca_lcwra",
  "benefits_migration_notice",
  "benefits_change_of_circumstances",
  "council_tax_reduction",
  "benefits_crisis_support",
]);

const stageByDocumentType: Record<BenefitsDocumentType, string> = {
  benefits_evidence_prep:
    "This appears to be about preparing benefits evidence. Check the letter to confirm the exact form, request, or appointment.",
  benefits_assessment_report:
    "This appears to be about an assessment report. Check the letter to confirm whether it is only a report or part of a decision process.",
  benefits_decision:
    "This appears to be about a benefits decision. You may be at the stage where you check the decision date, reasons, and review options.",
  benefits_appeal:
    "This appears to be about an appeal or tribunal stage. Check the letter to confirm the exact appeal route and date.",
  benefits_review:
    "This appears to be about a benefits review. Check the letter to confirm what evidence or questions are being requested.",
  benefits_uc_statement:
    "This appears to be about a Universal Credit statement. Check the statement to confirm the assessment period, payment, and deductions.",
  benefits_uc_sanction:
    "This appears to be about a Universal Credit sanction. Check the letter to confirm the dates, reason, and review options.",
  benefits_uc_deductions:
    "This appears to be about Universal Credit deductions or overpayment recovery. Check the statement or letter to confirm the reason and amount.",
  benefits_wca_lcwra:
    "This appears to be about Work Capability Assessment or LCWRA. Check the letter to confirm the exact stage and what is being asked.",
  benefits_migration_notice:
    "This appears to be about moving from legacy benefits to Universal Credit. Check the letter to confirm the date and action requested.",
  benefits_change_of_circumstances:
    "This appears to be about a benefits change of circumstances. Check the letter to confirm what changed and what evidence is requested.",
  council_tax_reduction:
    "This appears to be about Council Tax Reduction or Council Tax Support. Check the letter to confirm your council's wording and review route.",
  benefits_crisis_support:
    "This appears to be about crisis or local welfare support. Check the message to confirm who runs the scheme and what evidence is requested.",
};

const moneyPattern =
  /(?:(?:GBP\s*)|(?:(?:\u00a3|\u00c2\u00a3)\s*))\d+(?:,\d{3})*(?:\.\d{1,2})?/gi;
const dateLabelPattern = /date|deadline|period|start|end|until|due|appointment|review/i;
const dateValuePattern =
  /\b\d{1,2}(?:\/\d{1,2}\/\d{2,4}|\s+[A-Za-z]+\s+\d{4})\b|\b[A-Za-z]+\s+\d{4}\b|\b\d{1,2}\s+[A-Za-z]+\b|assessment period/i;

export const isBenefitsDocumentType = (
  documentType: DecisionDocumentType,
): documentType is BenefitsDocumentType => benefitsDocumentTypes.has(documentType as BenefitsDocumentType);

const normaliseKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const unique = (items: string[]) => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normaliseKey(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const firstMoneyValue = (value: string) => value.match(moneyPattern)?.[0]?.trim();

const addMoneyLine = (
  lines: BenefitsMoneyLine[],
  seen: Set<string>,
  label: string,
  amountText: string | undefined,
  treatment: DecisionAmountTreatment,
  sourceQuote?: string,
) => {
  if (!amountText) {
    return;
  }

  const key = normaliseKey(`${label}:${amountText}`);

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  lines.push({
    id: `money-${lines.length + 1}`,
    label,
    amountText,
    sourceQuote,
    treatment,
    countedInMoneyTracker: false,
    caution: BENEFITS_MONEY_CAUTION,
  });
};

const buildMoneyLines = (decisionResult: DecisionResult): BenefitsMoneyLine[] => {
  const lines: BenefitsMoneyLine[] = [];
  const seen = new Set<string>();

  for (const fact of decisionResult.sourceFacts) {
    addMoneyLine(
      lines,
      seen,
      fact.label,
      firstMoneyValue(fact.value),
      decisionResult.amountTreatment,
      fact.sourceQuote,
    );
  }

  const amountAlreadyFound =
    decisionResult.amountMentioned &&
    lines.some((line) => normaliseKey(line.amountText) === normaliseKey(decisionResult.amountMentioned ?? ""));

  if (!amountAlreadyFound) {
    addMoneyLine(
      lines,
      seen,
      "Money mentioned",
      decisionResult.amountMentioned,
      decisionResult.amountTreatment,
    );
  }

  return lines;
};

const addKeyDate = (
  dates: BenefitsKeyDate[],
  seen: Set<string>,
  label: string,
  value: string,
  sourceQuote?: string,
) => {
  const key = normaliseKey(`${label}:${value}`);

  if (!key || seen.has(key)) {
    return;
  }

  seen.add(key);
  dates.push({
    id: `date-${dates.length + 1}`,
    label,
    value,
    sourceQuote,
    userMustCheck: true,
    caution: BENEFITS_DATE_CAUTION,
  });
};

const buildKeyDates = (decisionResult: DecisionResult): BenefitsKeyDate[] => {
  const dates: BenefitsKeyDate[] = [];
  const seen = new Set<string>();

  for (const fact of decisionResult.sourceFacts) {
    if (dateLabelPattern.test(fact.label) || dateValuePattern.test(fact.value)) {
      addKeyDate(dates, seen, fact.label, fact.value, fact.sourceQuote);
    }
  }

  for (const deadline of decisionResult.deadlines) {
    addKeyDate(dates, seen, "Possible date or deadline to check", deadline);
  }

  return dates;
};

const buildEvidenceItems = (
  sourceFacts: DecisionSourceFact[],
  adminCase?: AdminCase,
): BenefitsEvidenceItem[] => {
  const items: BenefitsEvidenceItem[] = [];
  const seen = new Set<string>();

  for (const fact of sourceFacts) {
    const key = normaliseKey(`${fact.label}:${fact.value}`);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push({
      id: `evidence-${items.length + 1}`,
      label: fact.label,
      value: fact.value,
      source: "detected",
      sourceQuote: fact.sourceQuote,
    });
  }

  for (const evidence of adminCase?.evidence ?? []) {
    const key = normaliseKey(`${evidence.label}:${evidence.value}`);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push({
      id: `evidence-${items.length + 1}`,
      label: evidence.label,
      value: evidence.value,
      source: "case_file",
    });
  }

  return items;
};

const buildDraftOrChecklist = (decisionResult: DecisionResult) => {
  if (decisionResult.draftMessage) {
    return decisionResult.draftMessage;
  }

  if (decisionResult.nextSteps.length === 0) {
    return undefined;
  }

  return decisionResult.nextSteps.map((step) => `- ${step}`).join("\n");
};

export const buildBenefitsActionPack = (
  decisionResult: DecisionResult,
  opportunity?: OpportunityCard,
  adminCase?: AdminCase,
): BenefitsActionPack | null => {
  if (!isBenefitsDocumentType(decisionResult.documentType)) {
    return null;
  }

  const questionsToAnswer = unique(decisionResult.questionsToAnswer ?? []).map((question, index) => ({
    id: `question-${index + 1}`,
    question,
  }));
  const whatMatters = unique([
    decisionResult.whatThisLooksLike,
    ...decisionResult.possibleGrounds,
    opportunity?.opportunityNote ?? "",
  ]);

  return {
    id: `benefits-action-pack-${adminCase?.id ?? decisionResult.documentType}`,
    title: decisionResult.title,
    documentType: decisionResult.documentType,
    documentStage: stageByDocumentType[decisionResult.documentType],
    summary: decisionResult.plainEnglishSummary,
    whatMatters,
    possibleDatesToCheck: buildKeyDates(decisionResult),
    moneyMentioned: buildMoneyLines(decisionResult),
    evidenceFound: buildEvidenceItems(decisionResult.sourceFacts, adminCase),
    evidenceMissing: unique(decisionResult.evidenceNeeded),
    questionsToAnswer,
    uncertainty: unique(decisionResult.uncertainty),
    cannotKnow: unique(decisionResult.cannotKnow),
    nextSafeStep:
      decisionResult.nextSteps[0] ??
      opportunity?.nextBestAction ??
      "Check the letter, keep the evidence together, and decide what you want to do next.",
    draftOrChecklist: buildDraftOrChecklist(decisionResult),
    safetyNotes: unique(decisionResult.safetyNotes),
  };
};
