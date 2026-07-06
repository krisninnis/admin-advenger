import type { DecisionDocumentType, DecisionResult } from "./decisionEngine/types";
import type { AdminCase, AdminFinding, AdminItem, OpportunityCard } from "../types";
import { createPreparedMessageDraft } from "./messageDrafts";
import { deriveOpportunityCard } from "./opportunityCards";

// Guided Next Step - a single clickable action shown right after a Check a
// message result, so the user always has one obvious thing to do next
// (create a draft, add evidence, answer questions, check a deadline).
//
// This is a UI/derivation layer only, in the same spirit as
// opportunityCards.ts and guidedCaseMode.ts: it reads the existing
// DecisionResult / OpportunityCard / PreparedMessageDraft fields and shapes
// them into something clickable. It never adds a new field to AdminCase,
// AdminFinding, or DecisionResult, and it never invents new copy that isn't
// grounded in what those existing fields already say.
//
// Hard rules that apply to every action produced here (adminavenger writing
// standard, Sections 4 and 5):
// - Nothing here sends, submits, or contacts anyone automatically.
// - Every draft is reviewable/editable text, never auto-sent.
// - Wording stays hedged ("please confirm", "from what is shown", "I would
//   like this looked at again") - never a guarantee or an assertion that the
//   user is right, owed money, or will win.

export type NextStepAction =
  | {
      kind: "draft_message";
      label: string;
      title: string;
      body: string;
      copyButtonLabel: string;
      safetyNote?: string;
    }
  | {
      kind: "evidence_checklist";
      label: string;
      title: string;
      evidenceNeeded: string[];
    }
  | {
      kind: "answer_questions";
      label: string;
      title: string;
      questions: string[];
    }
  | {
      kind: "deadline_checklist";
      label: string;
      title: string;
      deadlineText: string;
      checklist: string[];
    }
  | {
      kind: "official_link";
      label: string;
      title: string;
      url: string;
      warning?: string;
    }
  | {
      kind: "uncertainty_list";
      label: string;
      title: string;
      items: string[];
    }
  | {
      kind: "cannot_know_list";
      label: string;
      title: string;
      items: string[];
    };

export type GuidedNextStep = {
  primaryAction: NextStepAction;
  secondaryActions: NextStepAction[];
};

// The one safety line required on every draft/checklist panel
// (per this feature's spec - not a new rule, just this feature's surfacing of
// the standing "AdminAvenger drafts, it does not act" rule from Section 4).
export const GUIDED_NEXT_STEP_SAFETY_NOTE =
  "AdminAvenger does not send this. Review it before using it.";

const COPY_DRAFT_LABEL = "Copy draft";
const COPY_CHECKLIST_LABEL = "Copy checklist";

// Some decision-engine modules (parking, debt, consumer, bank, PIP, etc.)
// give their DecisionResult a generic safetyNotes[0] that is about legal/
// benefits advice in general (e.g. DECISION_SAFETY_NOTE), not specifically
// about AdminAvenger never sending the draft. messageDrafts.ts falls back to
// that generic note when one exists, so a draft's safetyNote is not
// guaranteed to mention "send" at all. Every draft_message action shown here
// must explicitly say AdminAvenger does not send it (Section 4 of the
// adminavenger standard), so this guarantees that wording is present without
// having to change messageDrafts.ts's existing behaviour for its other
// callers.
const ensureSendSafetyNote = (note: string): string => {
  const lowerNote = note.toLowerCase();
  const explicitlyCoversSend =
    lowerNote.includes("does not") && (lowerNote.includes("send") || lowerNote.includes("sent"));

  return explicitlyCoversSend ? note : `${GUIDED_NEXT_STEP_SAFETY_NOTE} ${note}`;
};

const dedupe = (items: string[]): string[] => {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

// Button labels for the eight initially-supported categories
// (adminavenger-standard.md "Initial category support"). Anything not listed
// here that still has a safe draftMessage falls back to a generic label
// rather than being left without a button.
const draftLabelByDocumentType: Partial<Record<DecisionDocumentType, string>> = {
  benefits_decision: "Create Mandatory Reconsideration draft",
  benefits_uc_sanction: "Create UC journal message",
  benefits_uc_statement: "Create deduction breakdown request",
  benefits_uc_deductions: "Create deduction breakdown request",
  parking_ticket: "Create appeal draft",
  debt_collection: "Create debt response draft",
  bailiff_notice: "Create debt response draft",
  consumer_dispute: "Create complaint draft",
};

// The modal's own title (shown as the panel heading) is deliberately kept
// separate from both the button label above and the underlying decision
// module's generic `title` field (e.g. parking.ts's DecisionResult.title is
// "Parking notice check" - accurate for the module, but not the
// action-specific heading a user expects once they've clicked "Create appeal
// draft"). Only the categories that need a heading different from what
// draft.suggestedSubject would otherwise produce are listed here; everything
// else keeps using draft.suggestedSubject.
const draftModalTitleByDocumentType: Partial<Record<DecisionDocumentType, string>> = {
  benefits_decision: "Mandatory Reconsideration draft",
  benefits_uc_sanction: "Universal Credit sanction - request for clarification",
  benefits_uc_statement: "Universal Credit deductions - request for a breakdown",
  benefits_uc_deductions: "Universal Credit deductions - request for a breakdown",
  parking_ticket: "Parking appeal draft",
  debt_collection: "Debt response draft",
  bailiff_notice: "Debt response draft",
  consumer_dispute: "Complaint draft",
};

const ADD_MORE_INFORMATION_LABEL = "Add more information";

// Citizens Advice is already referenced in the app's own Safety Notice copy
// as a free advice service - reusing the same well-known, real, non-branded
// destination here (never inventing a URL) rather than adding a new claim.
const CITIZENS_ADVICE_URL = "https://www.citizensadvice.org.uk/";

const buildEvidenceChecklistAction = (
  title: string,
  evidenceNeeded: string[],
): NextStepAction | undefined =>
  evidenceNeeded.length > 0
    ? {
        kind: "evidence_checklist",
        label: "Add evidence",
        title: `Evidence to gather - ${title}`,
        evidenceNeeded: dedupe(evidenceNeeded),
      }
    : undefined;

const buildQuestionsAction = (
  title: string,
  questions: string[],
): NextStepAction | undefined =>
  questions.length > 0
    ? {
        kind: "answer_questions",
        label: "Answer questions",
        title: `Questions to answer - ${title}`,
        questions: dedupe(questions),
      }
    : undefined;

const buildDeadlineAction = (
  title: string,
  deadlines: string[],
): NextStepAction | undefined => {
  // Dedupe once up front so deadlineText (the headline) and checklist (the
  // full list) are always built from the exact same deduped array - this is
  // what stops the same deadline line appearing twice (once as the headline,
  // once again as the list's first entry).
  const dedupedDeadlines = dedupe(deadlines);

  return dedupedDeadlines.length > 0
    ? {
        kind: "deadline_checklist",
        label: "Check deadlines",
        title: `Deadlines - ${title}`,
        deadlineText: dedupedDeadlines[0],
        checklist: dedupedDeadlines,
      }
    : undefined;
};

// "What could change this" - uses decision.uncertainty only. Never merged
// with evidenceNeeded, questionsToAnswer, deadlines, or cannotKnow.
const buildUncertaintyAction = (
  title: string,
  uncertainty: string[],
): NextStepAction | undefined =>
  uncertainty.length > 0
    ? {
        kind: "uncertainty_list",
        label: "What could change this",
        title: `What could change this - ${title}`,
        items: dedupe(uncertainty),
      }
    : undefined;

// "What AdminAvenger cannot know" - uses decision.cannotKnow only. Never
// merged with evidenceNeeded, questionsToAnswer, deadlines, or uncertainty.
const buildCannotKnowAction = (
  title: string,
  cannotKnow: string[],
): NextStepAction | undefined =>
  cannotKnow.length > 0
    ? {
        kind: "cannot_know_list",
        label: "What AdminAvenger cannot know",
        title: `What AdminAvenger cannot know - ${title}`,
        items: dedupe(cannotKnow),
      }
    : undefined;

const buildAdviceLinkAction = (decision: DecisionResult): NextStepAction | undefined =>
  decision.caseStrength === "urgent_get_advice"
    ? {
        kind: "official_link",
        label: "Get free advice",
        title: "Citizens Advice",
        url: CITIZENS_ADVICE_URL,
        warning:
          "AdminAvenger does not contact anyone for you. This link is for your own information, if you want it.",
      }
    : undefined;

const deriveFromDecisionResult = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
  finding: AdminFinding | undefined,
  decision: DecisionResult,
  opportunity: OpportunityCard,
): GuidedNextStep => {
  const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });

  // Unknown/unclear documents: there usually isn't enough here yet for a
  // useful draft, so the honest primary action is to ask for more
  // information rather than hand the user a near-empty template.
  if (decision.documentType === "unknown_admin_dispute") {
    const questions =
      decision.questionsToAnswer && decision.questionsToAnswer.length > 0
        ? decision.questionsToAnswer
        : decision.evidenceNeeded;

    return {
      primaryAction: {
        kind: "answer_questions",
        label: ADD_MORE_INFORMATION_LABEL,
        title: decision.title,
        questions: dedupe(questions.length > 0 ? questions : ["What kind of letter, email, bill, or notice is this?"]),
      },
      secondaryActions: [
        buildEvidenceChecklistAction(decision.title, decision.evidenceNeeded),
        buildDeadlineAction(decision.title, decision.deadlines),
        buildUncertaintyAction(decision.title, decision.uncertainty),
        buildCannotKnowAction(decision.title, decision.cannotKnow),
      ].filter((action): action is NextStepAction => Boolean(action)),
    };
  }

  const label = draftLabelByDocumentType[decision.documentType] ?? "Create draft message";

  return {
    primaryAction: {
      kind: "draft_message",
      label,
      title: draftModalTitleByDocumentType[decision.documentType] ?? draft.suggestedSubject,
      body: draft.fullText,
      copyButtonLabel: COPY_DRAFT_LABEL,
      safetyNote: ensureSendSafetyNote(draft.safetyNote ?? GUIDED_NEXT_STEP_SAFETY_NOTE),
    },
    // Each secondary section is built strictly from one DecisionResult field -
    // evidenceNeeded, questionsToAnswer, deadlines, uncertainty, cannotKnow -
    // never merged together. In particular this deliberately does NOT fold in
    // draft.missingBeforeSending, which (via opportunity.missingInformation)
    // blends evidence/questions/uncertainty/cannotKnow together for the
    // simple result panel's "What to have ready" box - that blending is fine
    // for that older, simpler surface, but would silently leak
    // uncertainty/cannotKnow/questions text into "Evidence to gather" here.
    secondaryActions: [
      buildEvidenceChecklistAction(decision.title, decision.evidenceNeeded),
      buildQuestionsAction(decision.title, decision.questionsToAnswer ?? []),
      buildDeadlineAction(decision.title, decision.deadlines),
      buildUncertaintyAction(decision.title, decision.uncertainty),
      buildCannotKnowAction(decision.title, decision.cannotKnow),
      buildAdviceLinkAction(decision),
    ].filter((action): action is NextStepAction => Boolean(action)),
  };
};

const isNoClearOpportunity = (opportunity: OpportunityCard) =>
  opportunity.opportunityType === "unknown" || opportunity.opportunityType === "needs_human_check";

const deriveFromOpportunity = (
  adminCase: AdminCase,
  item: AdminItem | undefined,
  finding: AdminFinding | undefined,
  opportunity: OpportunityCard,
): GuidedNextStep => {
  // No clear category was found for this input at all - same honest "ask for
  // more information" fallback as the unknown decision-engine case above.
  if (isNoClearOpportunity(opportunity)) {
    const questions =
      opportunity.missingInformation.length > 0
        ? opportunity.missingInformation
        : [
            "What is this document about?",
            "Is there a company/sender name, date, amount, or deadline you can add?",
          ];

    return {
      primaryAction: {
        kind: "answer_questions",
        label: ADD_MORE_INFORMATION_LABEL,
        title: opportunity.title,
        questions: dedupe(questions),
      },
      secondaryActions: [],
    };
  }

  const draft = createPreparedMessageDraft({ adminCase, item, finding, opportunity });
  const label =
    opportunity.opportunityType === "travel_extra_cost_recovery" ||
    opportunity.opportunityType === "travel_evidence_check"
      ? "Create payment breakdown request"
      : opportunity.opportunityType === "refund_expected" || opportunity.opportunityType === "money_back"
        ? "Create complaint draft"
        : opportunity.opportunityType === "suspicious_email_risk"
          ? "View safety checklist"
          : "Create draft message";
  const copyButtonLabel =
    opportunity.opportunityType === "suspicious_email_risk" ? COPY_CHECKLIST_LABEL : COPY_DRAFT_LABEL;

  return {
    primaryAction: {
      kind: "draft_message",
      label,
      title: draft.suggestedSubject,
      body: draft.fullText,
      copyButtonLabel,
      safetyNote: ensureSendSafetyNote(draft.safetyNote ?? GUIDED_NEXT_STEP_SAFETY_NOTE),
    },
    secondaryActions: [
      buildEvidenceChecklistAction(opportunity.title, [
        ...draft.missingBeforeSending,
        ...opportunity.missingInformation,
      ]),
      opportunity.deadline
        ? buildDeadlineAction(opportunity.title, [
            opportunity.deadlineLabel
              ? `${opportunity.deadlineLabel}: ${opportunity.deadline}`
              : opportunity.deadline,
          ])
        : undefined,
    ].filter((action): action is NextStepAction => Boolean(action)),
  };
};

// The single entry point the UI calls after a Check a message result -
// mirrors deriveOpportunityCard's shape (adminCase, item?, finding?) so it
// slots into the existing pipeline without a new calling convention.
export const deriveGuidedNextStep = (
  adminCase: AdminCase,
  item?: AdminItem,
  finding?: AdminFinding,
): GuidedNextStep => {
  const opportunity = deriveOpportunityCard(adminCase, item, finding);

  if (adminCase.decisionResult) {
    return deriveFromDecisionResult(adminCase, item, finding, adminCase.decisionResult, opportunity);
  }

  return deriveFromOpportunity(adminCase, item, finding, opportunity);
};
