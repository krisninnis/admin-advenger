import type { AdviserExportPack } from "./adviserExportPack";
import type { BenefitsActionPack } from "./benefitsActionPack";
import type { CommunityHelperPack, CommunityHelperSituationType } from "./communityHelperPack";
import { isBenefitsDocumentType } from "./benefitsActionPack";
import type { DecisionDocumentType, DecisionResult } from "./decisionEngine/types";
import type { ResultDateView, ResultViewModel } from "./resultViewModel";
import type { StrategicNextStepPlan } from "./strategicNextStep";
import type { WorkplaceSupportDocumentType, WorkplaceSupportPack } from "./workplaceSupportPack";

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
  workplaceSupportPack?: WorkplaceSupportPack;
  communityHelperPack?: CommunityHelperPack;
};

export const CASE_PROGRESS_HEADING = "Preparation progress";

export const CASE_PROGRESS_EXPLANATION =
  "This shows how complete your preparation pack is. It does not predict the outcome.";

export const CASE_PROGRESS_CONTROL_NOTE = "AdminAvenger helps prepare. You stay in control.";

// --- Document-type families ------------------------------------------------
// These families only decide which checklist wording is shown. They never
// feed into any score of how strong, valid, or likely to succeed the case is.

type CaseProgressFamily =
  | "benefits_decision"
  | "benefits_general"
  | "legal_debt"
  | "workplace"
  | "community_helper"
  | "unknown"
  | "generic";

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

const detectFamily = (
  decisionResult?: DecisionResult,
  workplaceSupportPack?: WorkplaceSupportPack,
  communityHelperPack?: CommunityHelperPack,
): CaseProgressFamily => {
  if (workplaceSupportPack) {
    return "workplace";
  }

  if (communityHelperPack) {
    return "community_helper";
  }

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

// A tax-year boundary (e.g. "6 April 2026 to 5 April 2027") is a source fact,
// not an actionable key date, so it must not complete this step. Only a genuine
// notice/issue date or a response/action deadline counts. Unrelated document
// types never surface a tax-year boundary in keyDates, so their behaviour is
// unchanged by this filter.
const isTaxYearBoundaryDate = (date: ResultDateView): boolean =>
  /\btax year\b/i.test(date.label) ||
  /\b\d{1,2}\s+\w+\s+\d{4}\s+to\s+\d{1,2}\s+\w+\s+\d{4}\b/i.test(date.value);

const buildKeyDateItem = (
  resultViewModel: ResultViewModel,
  label = "Key date checked",
): CaseProgressItem => {
  const hasActionableDate = resultViewModel.keyDates.some(
    (date) => !isTaxYearBoundaryDate(date),
  );

  return buildItem(
    "key-date",
    label,
    hasActionableDate
      ? "A date was found in this result. Check it against the original letter before relying on it."
      : "No actionable date has been gathered yet. Look for a decision date, deadline, or reply-by date on the original letter. A tax-year period on its own is not a deadline.",
    hasActionableDate ? "complete" : "missing",
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

// --- Workplace helpers ------------------------------------------------------

const workplaceHumanReviewRoute =
  "Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser before relying on any next step.";

const workplaceSignpostNote =
  "Ask ACAS, a union rep, HR, Citizens Advice, an adviser, solicitor where appropriate, or someone trusted if you are unsure.";

const workplaceMeetingTypes = new Set<WorkplaceSupportDocumentType>([
  "disciplinary_invite",
  "workplace_investigation_invite",
  "capability_meeting",
  "sickness_absence_meeting",
]);

const workplaceDismissalOrRedundancyTypes = new Set<WorkplaceSupportDocumentType>([
  "dismissal_letter",
  "redundancy_consultation",
]);

const textFromWorkplacePack = (pack: WorkplaceSupportPack) =>
  [
    pack.title,
    pack.summary,
    ...pack.keyFactsToCheck,
    ...pack.evidenceToGather,
    ...pack.questionsToAsk,
    ...pack.cannotKnow,
    ...pack.riskWarnings,
    ...pack.signposting,
  ].join("\n");

const workplacePackHas = (pack: WorkplaceSupportPack, pattern: RegExp) =>
  pattern.test(textFromWorkplacePack(pack));

const hasResignationRisk = (pack: WorkplaceSupportPack) =>
  pack.riskWarnings.some((warning) => /resignation|constructive dismissal|resign|quitting/i.test(warning));

const buildWorkplaceDateItem = (pack: WorkplaceSupportPack): CaseProgressItem => {
  const hasDateTimeOrLocation = workplacePackHas(pack, /date|time|location|meeting/i);

  return buildItem(
    "workplace-date-time-location",
    "Date, time, or location checked",
    hasDateTimeOrLocation
      ? "A date, time, location, or meeting detail is listed for checking. Check it against the original workplace letter or message."
      : "No date, time, or location has been prepared yet. Check the original workplace letter or message.",
    hasDateTimeOrLocation ? "partial" : "missing",
    "result",
    "Check against the original letter/message before relying on it.",
  );
};

const buildWorkplaceContactItem = (pack: WorkplaceSupportPack): CaseProgressItem => {
  const hasContact = workplacePackHas(pack, /employer|hr|manager|payroll|contact|acas|union|adviser|citizens advice/i);

  return buildItem(
    "workplace-contact-details",
    "Employer, HR, or contact details checked",
    hasContact
      ? "A workplace contact or support route is listed for checking against the original message."
      : "No workplace contact detail has been prepared yet. Check the original message for who to contact.",
    hasContact ? "partial" : "missing",
    "result",
    "Check contact details against the original workplace letter/message.",
  );
};

const buildWorkplacePolicyItem = (pack: WorkplaceSupportPack): CaseProgressItem => {
  const hasPolicyReference = workplacePackHas(pack, /policy|contract|handbook|written terms/i);

  return buildItem(
    "workplace-policy-reference",
    "Policy, contract, or handbook reference checked",
    hasPolicyReference
      ? "A policy, contract, handbook, or written-terms item is listed for checking if it is available."
      : "No policy, contract, or handbook reference is listed for this workplace pack.",
    hasPolicyReference ? "partial" : "not_needed",
    "result",
  );
};

const buildWorkplaceEvidenceChecklistItem = (pack: WorkplaceSupportPack): CaseProgressItem =>
  buildItem(
    "workplace-evidence-checklist",
    "Workplace evidence checklist prepared",
    pack.evidenceToGather.length > 0
      ? `${pack.evidenceToGather.length} evidence item${pack.evidenceToGather.length === 1 ? "" : "s"} listed to gather or check.`
      : "No workplace evidence checklist has been prepared yet.",
    pack.evidenceToGather.length > 0 ? "complete" : "missing",
    "result",
    "This is an evidence checklist, not an outcome prediction.",
  );

const buildWorkplaceQuestionsItem = (pack: WorkplaceSupportPack): CaseProgressItem =>
  buildItem(
    "workplace-questions-prepared",
    "Questions prepared for HR, ACAS, union, or adviser",
    pack.questionsToAsk.length > 0
      ? `${pack.questionsToAsk.length} question${pack.questionsToAsk.length === 1 ? "" : "s"} prepared for review.`
      : "No questions have been prepared yet.",
    pack.questionsToAsk.length > 0 ? "complete" : "missing",
    "result",
    workplaceSignpostNote,
  );

const buildWorkplaceTimelineItem = (pack: WorkplaceSupportPack): CaseProgressItem => {
  const timelineRelevant = workplacePackHas(pack, /timeline|events|incident|what happened|examples/i);

  return buildItem(
    "workplace-timeline",
    "Timeline written down",
    timelineRelevant
      ? "A timeline or examples are listed as preparation. Write them down in date order before relying on them."
      : "Write down what happened in date order if it helps someone understand the workplace issue.",
    timelineRelevant ? "partial" : "missing",
    "user",
  );
};

const buildWorkplaceSupportOptionItem = (): CaseProgressItem =>
  buildItem(
    "workplace-support-option",
    "Support or advice option checked",
    workplaceSignpostNote,
    "missing",
    "user",
    "AdminAvenger helps prepare. You stay in control.",
  );

const buildWorkplaceMeetingDetailsItems = (pack: WorkplaceSupportPack): CaseProgressItem[] => [
  buildItem(
    "workplace-meeting-details",
    "Meeting details checked",
    "Meeting date, time, place, attendees, or contact details are preparation items to check against the original message.",
    workplacePackHas(pack, /meeting|date|time|location|attend/i) ? "partial" : "missing",
    "result",
    "Check against the original letter/message.",
  ),
  buildItem(
    "workplace-meeting-reason",
    "Reason for meeting noted",
    "The reason, issue, allegation, absence, capability, or investigation topic should be noted in the user's own words.",
    workplacePackHas(pack, /reason|issue|allegation|absence|capability|investigation|purpose|performance/i)
      ? "partial"
      : "missing",
    "result",
  ),
  buildWorkplaceSupportOptionItem(),
];

const buildWorkplacePayItems = (): CaseProgressItem[] => [
  buildItem(
    "workplace-pay-evidence",
    "Payslips, rota, hours, and messages gathered",
    "Payslips, rota, hours, bank payment records, and messages are useful evidence to gather. Any amount is only something to check against records.",
    "partial",
    "result",
    "Amounts are display-only and are not counted as saved or recovered.",
  ),
];

const buildWorkplaceHumanAdviceItem = (): CaseProgressItem =>
  buildItem(
    "workplace-human-advice-route",
    "Human advice route identified",
    workplaceHumanReviewRoute,
    "complete",
    "result",
    "This is preparation only and does not predict the outcome.",
  );

const buildWorkplaceIncidentItems = (): CaseProgressItem[] => [
  buildItem(
    "workplace-incident-timeline",
    "Timeline and examples written down",
    "Write a clear timeline and record examples from messages, screenshots, notes, or memory.",
    "missing",
    "user",
    "This does not prove what happened. It helps organise information to discuss safely.",
  ),
  buildItem(
    "workplace-incident-evidence",
    "Messages, screenshots, or notes gathered",
    "Gather messages, screenshots, notes, witness names, or location details if they exist and are safe to keep.",
    "partial",
    "result",
  ),
  buildWorkplaceSupportOptionItem(),
];

const buildSettlementAgreementItems = (
  input: BuildCaseProgressInput,
  pack: WorkplaceSupportPack,
): CaseProgressItem[] => [
  buildOriginalSourceItem("Original workplace letter or message available"),
  buildWorkplaceDateItem(pack),
  buildWorkplaceContactItem(pack),
  buildWorkplaceQuestionsItem(pack),
  buildWorkplaceHumanAdviceItem(),
  buildItem(
    "workplace-reviewed-with-adviser",
    "Document reviewed with a suitable human adviser",
    "Mark this complete only after a suitable human adviser has reviewed the document with you.",
    "missing",
    "user",
    "AdminAvenger cannot review this for you.",
  ),
  buildAdviserPackItem(input.adviserExportPack),
];

const buildWorkplaceItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel, workplaceSupportPack } = input;

  if (!workplaceSupportPack) {
    return buildGenericItems(input);
  }

  if (workplaceSupportPack.documentType === "settlement_agreement_signpost") {
    const settlementItems = buildSettlementAgreementItems(input, workplaceSupportPack);

    return hasResignationRisk(workplaceSupportPack)
      ? [
          ...settlementItems,
          buildItem(
            "workplace-resignation-human-advice",
            "Human advice before resignation decision",
            "Get advice before making a resignation decision.",
            "missing",
            "user",
            "AdminAvenger does not tell you whether to leave or stay in work.",
          ),
        ]
      : settlementItems;
  }

  const items: CaseProgressItem[] = [
    buildOriginalSourceItem("Original workplace letter or message available"),
    buildWorkplaceDateItem(workplaceSupportPack),
    buildWorkplaceContactItem(workplaceSupportPack),
    buildWorkplacePolicyItem(workplaceSupportPack),
    buildWorkplaceEvidenceChecklistItem(workplaceSupportPack),
    buildWorkplaceTimelineItem(workplaceSupportPack),
    buildWorkplaceQuestionsItem(workplaceSupportPack),
  ];

  if (workplaceMeetingTypes.has(workplaceSupportPack.documentType)) {
    items.push(...buildWorkplaceMeetingDetailsItems(workplaceSupportPack));
  }

  if (workplaceSupportPack.documentType === "wage_deduction_or_pay_issue") {
    items.push(...buildWorkplacePayItems());
  }

  if (workplaceDismissalOrRedundancyTypes.has(workplaceSupportPack.documentType)) {
    items.push(buildWorkplaceHumanAdviceItem());
  }

  if (workplaceSupportPack.documentType === "bullying_or_harassment_record_prep") {
    items.push(...buildWorkplaceIncidentItems());
  }

  if (hasResignationRisk(workplaceSupportPack)) {
    items.push(
      buildItem(
        "workplace-resignation-human-advice",
        "Human advice before resignation decision",
        "Get advice before making a resignation decision.",
        "missing",
        "user",
        "AdminAvenger does not tell you whether to leave or stay in work.",
      ),
    );
  }

  items.push(
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem(workplaceSignpostNote),
  );

  return items;
};


const communityHelperSignpostNote =
  "Ask a support worker, OT, housing officer, adviser, GP or clinician, social worker, safeguarding professional if urgent, or another trusted person if you are unsure.";

const communityHelperUrgentTypes = new Set<CommunityHelperSituationType>([
  "urgent_safeguarding_like_signpost",
]);

const communityHelperFinancialConcernTypes = new Set<CommunityHelperSituationType>([
  "vulnerability_financial_admin_concern",
]);

const buildCommunityHelperSituationItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-situation-type",
    "Community helper situation noted",
    `Community helper pack type: ${pack.title}. This only controls checklist wording and is not an assessment.`,
    "complete",
    "result",
    "This is preparation only, not a professional assessment.",
  );

const buildCommunityHelperDailyImpactItem = (pack: CommunityHelperPack): CaseProgressItem => {
  const count = pack.dailyLifeImpact.length + pack.adminBarriers.length + pack.communicationBarriers.length;

  return buildItem(
    "community-helper-daily-impact",
    "Daily-life/admin impact prepared",
    count > 0
      ? `${count} daily-life, admin, or communication point${count === 1 ? "" : "s"} listed for review.`
      : "No daily-life, admin, or communication impact has been prepared yet.",
    count > 0 ? "complete" : "missing",
    "result",
    "This organises information only. It does not assess care needs.",
  );
};

const buildCommunityHelperKeyFactsItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-key-facts",
    "Key facts to check prepared",
    pack.keyFactsToCheck.length > 0
      ? `${pack.keyFactsToCheck.length} key fact${pack.keyFactsToCheck.length === 1 ? "" : "s"} listed to check against documents or memory.`
      : "No key facts have been prepared yet.",
    pack.keyFactsToCheck.length > 0 ? "complete" : "missing",
    "result",
    "Check facts against the original letters, notes, or documents.",
  );

const buildCommunityHelperEvidenceChecklistItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-evidence-context",
    "Evidence/context checklist prepared",
    pack.evidenceToGather.length > 0
      ? `${pack.evidenceToGather.length} evidence or context item${pack.evidenceToGather.length === 1 ? "" : "s"} listed to gather or check.`
      : "No evidence or context checklist has been prepared yet.",
    pack.evidenceToGather.length > 0 ? "complete" : "missing",
    "result",
    "This is a checklist only. It does not prove what happened.",
  );

const buildCommunityHelperQuestionsItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-questions-prepared",
    "Questions prepared",
    pack.questionsToAsk.length > 0
      ? `${pack.questionsToAsk.length} question${pack.questionsToAsk.length === 1 ? "" : "s"} prepared for review.`
      : "No questions have been prepared yet.",
    pack.questionsToAsk.length > 0 ? "complete" : "missing",
    "result",
    "Questions are preparation material. You decide whether to use or share them.",
  );

const buildCommunityHelperConsentControlItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-consent-control",
    "Consent and control notes to review",
    pack.consentAndControlNotes.length > 0
      ? "Consent and control notes are prepared. Review them before anything is saved, shared, or discussed with someone else."
      : "No consent and control notes have been prepared yet.",
    pack.consentAndControlNotes.length > 0 ? "partial" : "missing",
    "user",
    "Keep the person involved where possible. AdminAvenger does not give authority to act for someone.",
  );

const buildCommunityHelperSupportRouteItem = (pack: CommunityHelperPack): CaseProgressItem =>
  buildItem(
    "community-helper-support-route",
    "Suitable person or professional route identified",
    pack.signposting.length > 0 ? communityHelperSignpostNote : "No suitable person or professional route has been identified yet.",
    pack.signposting.length > 0 ? "partial" : "missing",
    "user",
    "Ask a suitable human if the situation is serious, urgent, unclear, or affects safety, money, housing, health, or care.",
  );

const buildCommunityHelperUrgentItem = (): CaseProgressItem =>
  buildItem(
    "community-helper-urgent-route",
    "Urgent support route reviewed",
    "If someone may be in immediate danger, contact emergency services or the relevant local safeguarding service. AdminAvenger cannot decide safeguarding concerns.",
    "missing",
    "user",
    "This is not a safeguarding decision.",
  );

const buildCommunityHelperFinancialFactsItem = (): CaseProgressItem =>
  buildItem(
    "community-helper-financial-facts",
    "Financial admin facts separated from assumptions",
    "Write down only what has been observed, dates, letters, messages, and account records if appropriate. This does not decide wrongdoing or missing money.",
    "partial",
    "user",
    "Keep this factual and ask a suitable trusted person or professional if you are unsure.",
  );

const buildCommunityHelperItems = (input: BuildCaseProgressInput): CaseProgressItem[] => {
  const { resultViewModel, communityHelperPack } = input;

  if (!communityHelperPack) {
    return buildGenericItems(input);
  }

  const items: CaseProgressItem[] = [
    buildOriginalSourceItem("Original message, letter, or notes available"),
    buildCommunityHelperSituationItem(communityHelperPack),
    buildCommunityHelperDailyImpactItem(communityHelperPack),
    buildCommunityHelperKeyFactsItem(communityHelperPack),
    buildCommunityHelperEvidenceChecklistItem(communityHelperPack),
    buildCommunityHelperQuestionsItem(communityHelperPack),
    buildCommunityHelperConsentControlItem(communityHelperPack),
    buildCommunityHelperSupportRouteItem(communityHelperPack),
  ];

  if (communityHelperUrgentTypes.has(communityHelperPack.situationType)) {
    items.push(buildCommunityHelperUrgentItem());
  }

  if (communityHelperFinancialConcernTypes.has(communityHelperPack.situationType)) {
    items.push(buildCommunityHelperFinancialFactsItem());
  }

  items.push(
    buildDraftReviewedItem(resultViewModel),
    buildAdviserPackItem(input.adviserExportPack),
    buildTrustedCheckItem(communityHelperSignpostNote),
  );

  return items;
};

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
  workplace: buildWorkplaceItems,
  community_helper: buildCommunityHelperItems,
  unknown: buildUnknownItems,
  generic: buildGenericItems,
};

// --- Public API --------------------------------------------------------------

export const buildCaseProgress = (input: BuildCaseProgressInput): CaseProgressSummary => {
  const family = detectFamily(input.decisionResult, input.workplaceSupportPack, input.communityHelperPack);
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
