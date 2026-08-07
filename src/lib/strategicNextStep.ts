import type { AdminCase, OpportunityCard } from "../types";
import type { BenefitsActionPack } from "./benefitsActionPack";
import type { DecisionDocumentType, DecisionResult } from "./decisionEngine/types";
import { isSourceFactEvidence } from "./evidenceKind";

export type StrategicActor = {
  label: string;
  role: string;
  likelyGoal: string;
  caution?: string;
};

export type StrategicMove = {
  label: string;
  description: string;
  whyThisHelps: string;
  riskLevel: "low" | "medium" | "high";
  reversibility: "easy_to_reverse" | "hard_to_reverse" | "unknown";
  preservesOptions: boolean;
  requiresEvidence: boolean;
  requiresAdvice: boolean;
  doNotAutoSend: true;
  safeDraftPrompt?: string;
};

export type StrategicNextStepPlan = {
  title: string;
  plainEnglishSummary: string;
  actors: StrategicActor[];
  userGoal: string;
  missingInformation: string[];
  safestMove: StrategicMove;
  otherSafeMoves: StrategicMove[];
  movesToAvoid: string[];
  whenToGetAdvice: string[];
  uncertainty: string[];
  cannotKnow: string[];
  safetyNotes: string[];
};

export type BuildStrategicNextStepPlanInput = {
  decisionResult?: DecisionResult;
  benefitsActionPack?: BenefitsActionPack | null;
  opportunity?: OpportunityCard;
  adminCase?: AdminCase;
};

export const STRATEGIC_NEXT_STEP_SAFETY_NOTE =
  "AdminAvenger helps you compare safe next steps. It does not decide for you, contact anyone, or give legal, benefits, debt, or financial advice.";

const highStakesTypes = new Set<DecisionDocumentType>([
  "parking_ticket",
  "debt_collection",
  "bailiff_notice",
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

const benefitsTypes = new Set<DecisionDocumentType>([
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

const normaliseKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const unique = (items: Array<string | undefined>) => {
  const seen = new Set<string>();

  return items.filter((item): item is string => {
    const key = normaliseKey(item ?? "");

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const move = (
  label: string,
  description: string,
  whyThisHelps: string,
  options: Partial<Omit<StrategicMove, "label" | "description" | "whyThisHelps" | "doNotAutoSend">> = {},
): StrategicMove => ({
  label,
  description,
  whyThisHelps,
  riskLevel: options.riskLevel ?? "low",
  reversibility: options.reversibility ?? "easy_to_reverse",
  preservesOptions: options.preservesOptions ?? true,
  requiresEvidence: options.requiresEvidence ?? true,
  requiresAdvice: options.requiresAdvice ?? false,
  doNotAutoSend: true,
  safeDraftPrompt: options.safeDraftPrompt,
});

const getBaseActors = (
  documentType: DecisionDocumentType | undefined,
  opportunity?: OpportunityCard,
): StrategicActor[] => {
  const user: StrategicActor = {
    label: "You",
    role: "Person deciding what happens next",
    likelyGoal: "Understand the message, avoid rushed action, and keep useful options open.",
  };

  if (!documentType && !opportunity) {
    return [
      user,
      {
        label: "Sender",
        role: "Organisation or person who sent the message",
        likelyGoal: "Get a response, information, payment, evidence, or confirmation.",
        caution: "Check who sent it before replying or clicking anything.",
      },
    ];
  }

  if (documentType && benefitsTypes.has(documentType)) {
    const sender =
      documentType === "council_tax_reduction" || documentType === "benefits_crisis_support"
        ? "Council or support scheme"
        : "DWP or benefits office";

    return [
      user,
      {
        label: sender,
        role: "Organisation handling the benefit, support, or council tax process",
        likelyGoal: "Apply its process, request evidence, explain a decision, or update a payment.",
        caution: "Their process may have dates or evidence rules that need checking on the letter.",
      },
    ];
  }

  if (documentType === "parking_ticket") {
    return [
      user,
      {
        label: "Parking company or representative",
        role: "Sender of the parking notice or follow-up letter",
        likelyGoal: "Get information, payment, or a response about the notice.",
        caution: "The safest response depends on the exact stage shown on the document.",
      },
    ];
  }

  if (documentType === "debt_collection" || documentType === "bailiff_notice") {
    return [
      user,
      {
        label: "Creditor, collector, or enforcement sender",
        role: "Organisation asking about money or enforcement",
        likelyGoal: "Get payment, information, or contact from you.",
        caution: "Debt or enforcement letters can have serious consequences, so check the stage first.",
      },
    ];
  }

  if (documentType === "consumer_dispute" || opportunity?.opportunityType === "delivery_issue") {
    return [
      user,
      {
        label: "Company or retailer",
        role: "Organisation connected with the purchase, service, or complaint",
        likelyGoal: "Resolve the issue using the evidence and policy it recognises.",
      },
    ];
  }

  return [
    user,
    {
      label: "Sender",
      role: "Organisation or person who sent the message",
      likelyGoal: "Get a response, information, payment, evidence, or confirmation.",
      caution: "Check the sender, date, reference, and what they are asking before acting.",
    },
  ];
};

const getDefaultOtherSafeMoves = (): StrategicMove[] => [
  move(
    "Save the case and evidence",
    "Keep the message, references, dates, screenshots, and any useful proof together.",
    "It makes later checking easier without committing you to any action.",
  ),
  move(
    "Prepare wording, then review it",
    "Use a draft or checklist only as something to edit before you decide whether to send it yourself.",
    "A prepared draft reduces stress while keeping you in control.",
    { safeDraftPrompt: "Draft a calm request for clarification using only the facts in the document." },
  ),
];

// "Do not rely on OCR without checking the original letter." used to live here,
// which meant every result carried it, including text the person had pasted
// straight into the box. OCR advice belongs to journeys where OCR actually ran,
// and those already carry their own cautions from the photo and attachment
// pipelines (see photoOcr, photoIntake, ocrKeyDetails and
// documentAttachmentIntake). Nothing is lost by removing it from the shared set.
const genericMovesToAvoid = [
  "Do not send an angry message.",
  "Do not submit a form automatically.",
  "Do not count money mentioned in the document as saved or recovered.",
];

/**
 * How strongly a message needs to be warned about, decided from evidence rather
 * than from its category.
 *
 * Every result used to receive the same six lines, so an approved refund was
 * warned exactly as sternly as a credential-harvesting email. That is not a
 * calibration problem at the edges: it means the strong wording carried no
 * information at all.
 */
export type StrategicCautionLevel = "routine" | "elevated" | "security";

const ROUTINE_MOVES_TO_AVOID = [
  // Kept for every message: proportionate, and it is the one instruction that
  // protects a person who does not yet know what they are looking at.
  "Do not reply, pay, click, or submit anything before checking what the document is.",
  // Required by the money-safety posture whenever an amount is on screen.
  "Do not count money mentioned in the document as saved or recovered.",
];

const ELEVATED_MOVES_TO_AVOID = [
  "Do not reply, pay, click, or submit anything before checking what the document is.",
  "Do not assume a scary-looking message is correct or safe.",
  ...genericMovesToAvoid,
];

export const strategicCautionLevelFor = ({
  decisionResult,
  benefitsActionPack,
  opportunity,
  adminCase,
}: BuildStrategicNextStepPlanInput): StrategicCautionLevel => {
  // Security is evidence-led: the email-safety read found signals, or the
  // message was routed as a suspicious-email risk.
  const emailSafety = adminCase?.emailSafetyAssessment;

  if (
    opportunity?.opportunityType === "suspicious_email_risk" ||
    (emailSafety && emailSafety.riskBand !== "lower_risk_verify") ||
    (emailSafety?.riskSignals.length ?? 0) > 0
  ) {
    return "security";
  }

  // Elevated is for a stated demand for money, a document family the product
  // already treats as high stakes, or a message the analysis layer read as one
  // that asks the person to reply or act by a date. That last signal is what
  // carries possession notices, payment reminders and appointment letters, none
  // of which reach a typed plan.
  //
  // `urgency` is deliberately not used. A price rise is marked high urgency and
  // is not a dangerous message, so urgency would keep exactly the wrong things
  // loud.
  const documentType = decisionResult?.documentType ?? benefitsActionPack?.documentType;

  if (
    decisionResult?.amountTreatment === "amount_being_demanded" ||
    (documentType ? highStakesTypes.has(documentType) : false) ||
    adminCase?.category === "important_reply"
  ) {
    return "elevated";
  }

  return "routine";
};

const genericAdviceTriggers = [
  "Get advice if the letter mentions court, enforcement, eviction, sanctions, stopped payments, or an urgent deadline.",
  "Get advice if you are unsure what the document is asking you to do.",
];

const getPlanForDocumentType = (
  documentType: DecisionDocumentType | undefined,
  // Only the untyped default plan is calibrated. Every typed branch below is a
  // high-stakes family that keeps its existing wording, so this change cannot
  // quietly soften benefits, debt, HMRC or enforcement guidance.
  cautionLevel: StrategicCautionLevel = "elevated",
  known: { everythingIdentified: boolean } = { everythingIdentified: false },
): Pick<StrategicNextStepPlan, "userGoal" | "safestMove" | "otherSafeMoves" | "movesToAvoid" | "whenToGetAdvice"> => {
  if (documentType === "benefits_uc_statement") {
    return {
      userGoal: "Understand why the payment changed and what deductions or entries need checking.",
      safestMove: move(
        "Ask for a deduction breakdown",
        "If any deduction is unclear, ask for a breakdown and compare it with your full statement and previous month.",
        "It asks for information before claiming the payment is wrong.",
      ),
      otherSafeMoves: [
        move(
          "Compare with the previous statement",
          "Check the assessment period, payment amount, housing element, deductions, and any change from last month.",
          "A side-by-side check can show whether the issue is a new deduction, changed element, or missing information.",
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not assume the statement is wrong without checking the full statement and previous month.",
        "Do not count a payment or deduction as saved or recovered.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if a deduction leaves you unable to afford essentials.",
        "Get advice if the statement says your payment is stopped, suspended, or reduced and you do not understand why.",
      ],
    };
  }

  if (documentType === "benefits_uc_sanction") {
    return {
      userGoal: "Understand the sanction reason, dates, and evidence before deciding how to respond.",
      safestMove: move(
        "Check the decision date, reason, and evidence",
        "Find the exact decision date, the reason given for the sanction, and any evidence of a good reason.",
        "A challenge or journal message is stronger when it refers to the actual reason and evidence.",
        { riskLevel: "medium" },
      ),
      otherSafeMoves: [
        move(
          "List what happened in date order",
          "Write a short timeline of the appointment, contact, illness, caring issue, transport problem, or other relevant event.",
          "A timeline helps separate facts from memory and keeps the response specific.",
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not send an angry message.",
        "Do not assume the sanction will be changed.",
        "Do not rely on memory alone if evidence exists.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the sanction affects food, heating, rent, or other essentials.",
        "Get advice if the review deadline is unclear or may already have passed.",
      ],
    };
  }

  if (documentType === "benefits_uc_deductions") {
    return {
      userGoal: "Understand the reason for the deduction or overpayment recovery before deciding what to query.",
      safestMove: move(
        "Ask for the reason and calculation",
        "Ask for a written breakdown of what the deduction is for, how it was calculated, and how long it will continue.",
        "It gathers facts before disputing the amount or agreeing it is right.",
      ),
      otherSafeMoves: [
        move(
          "Check hardship or rate options",
          "If the deduction causes immediate difficulty, check whether a lower repayment rate or support option is mentioned.",
          "This keeps the focus on practical next steps without deciding whether the amount is correct.",
          { requiresAdvice: true },
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not treat the amount as confirmed saved or recovered.",
        "Do not assume the deduction is wrong without checking the breakdown.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if deductions mean you cannot afford essentials.",
        "Get advice if the letter mentions overpayment, recovery, or a missed deadline.",
      ],
    };
  }

  if (
    documentType === "benefits_decision" ||
    documentType === "benefits_appeal" ||
    documentType === "benefits_assessment_report"
  ) {
    return {
      userGoal: "Turn the decision or report into specific points, activities, dates, and evidence to check.",
      safestMove: move(
        "Check the decision date, points, and activities",
        "List the activities or points you disagree with, then match each one to examples and evidence.",
        "It turns the decision into specific issues and evidence instead of a vague disagreement.",
        { riskLevel: "medium" },
      ),
      otherSafeMoves: [
        move(
          "Write examples before drafting",
          "Prepare short real-life examples for each activity before writing anything.",
          "Examples are easier to review and edit than broad statements.",
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not say only that you should get PIP without explaining activities, examples, and evidence.",
        "Do not assume a review or appeal will change the outcome.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the deadline is unclear, close, or may have passed.",
        "Get advice if health, disability, appeal, or tribunal evidence feels difficult to organise.",
      ],
    };
  }

  if (documentType === "benefits_evidence_prep" || documentType === "benefits_review") {
    return {
      userGoal: "Understand what evidence is being requested and prepare it without rushing.",
      safestMove: move(
        "Make an evidence checklist",
        "List what the letter asks for, what you already have, and what is still missing.",
        "It reduces the chance of missing a document while avoiding claims about what the evidence proves.",
      ),
      otherSafeMoves: getDefaultOtherSafeMoves(),
      movesToAvoid: [
        "Do not send incomplete evidence without checking what the letter asks for.",
        "Do not assume evidence is enough just because it exists.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the letter says payments could stop or be suspended.",
        "Get advice if you cannot get the evidence by the stated date.",
      ],
    };
  }

  if (
    documentType === "benefits_wca_lcwra" ||
    documentType === "benefits_migration_notice" ||
    documentType === "benefits_change_of_circumstances" ||
    documentType === "council_tax_reduction" ||
    documentType === "benefits_crisis_support"
  ) {
    return {
      userGoal: "Understand the stage, dates, and evidence before deciding what to do.",
      safestMove: move(
        "Check what the letter is asking for",
        "Identify the date, reference, evidence requested, and the exact action the letter asks you to take.",
        "It keeps the next step tied to the source document instead of assumptions.",
        { riskLevel: documentType === "benefits_crisis_support" ? "high" : "medium" },
      ),
      otherSafeMoves: getDefaultOtherSafeMoves(),
      movesToAvoid: [
        "Do not assume the rules are the same everywhere.",
        "Do not miss a date because it looks like routine admin.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the letter affects rent, food, heating, health, disability, or a benefit deadline.",
        "Get advice if a local council scheme or crisis support route is unclear.",
      ],
    };
  }

  if (documentType === "parking_ticket" || documentType === "debt_collection" || documentType === "bailiff_notice") {
    return {
      userGoal: "Work out the stage of the letter before deciding whether or how to respond.",
      safestMove: move(
        "Identify the exact stage",
        "Work out whether this is an early notice, debt letter, letter before claim, enforcement notice, or court claim.",
        "The safest response depends on the stage.",
        { riskLevel: "high", requiresAdvice: true },
      ),
      otherSafeMoves: [
        move(
          "Collect dates, references, and previous letters",
          "Put the reference number, issue date, response date, and earlier documents together.",
          "It helps an adviser or your own review understand the sequence.",
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not ignore court-looking documents.",
        "Do not admit responsibility or pay automatically just because the letter sounds threatening.",
        "Do not send a rushed response before checking the stage.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the document mentions court, judgment, enforcement, bailiffs, or a response pack.",
        "Get advice if you are unsure whether a deadline applies.",
      ],
    };
  }

  if (documentType === "consumer_dispute") {
    return {
      userGoal: "Organise what happened and what outcome you want before writing to the company.",
      safestMove: move(
        "Build a short evidence timeline",
        "List what you bought, what went wrong, dates, order references, photos, and previous replies.",
        "A clear timeline helps you ask for a practical next step without overclaiming.",
      ),
      otherSafeMoves: getDefaultOtherSafeMoves(),
      movesToAvoid: [
        "Do not exaggerate facts or demand an outcome without evidence.",
        "Do not send a message while angry if a calmer draft would be clearer.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the amount is large or the company threatens court action.",
        "Get advice if safety, health, or essential services are involved.",
      ],
    };
  }

  if (documentType === "hmrc_tax_code_notice") {
    return {
      userGoal: "Check the tax code notice is correct for your circumstances before assuming it is right or wrong.",
      safestMove: move(
        "Check employer, codes, and allowances on the notice",
        "Compare the employer or pension provider name, the previous and replacement codes, Personal Allowance, expenses, and benefits entries against your own records and payslip.",
        "It focuses on the details the notice actually lists rather than guessing what HMRC may have done.",
      ),
      otherSafeMoves: [
        move(
          "Check for an explicit issue date or reference number",
          "Look for a dated, sent, or issued date and any reference number on the notice. If neither is present, note that the date is unknown.",
          "An explicit date matters if you need to challenge or query the notice later.",
        ),
        ...getDefaultOtherSafeMoves(),
      ],
      movesToAvoid: [
        "Do not assume the tax code is correct or incorrect without checking your own records.",
        "Do not count any amount in the notice as money saved or recovered.",
        ...genericMovesToAvoid,
      ],
      whenToGetAdvice: [
        "Get advice if the code change is large and you are unsure why.",
        "Get advice if your employer or pension provider details are wrong and the notice does not explain the change.",
      ],
    };
  }

  return {
    userGoal: "Identify what the message is asking for before acting.",
    // Telling somebody to go and find a reference AdminAvenger has already read
    // makes it look as though nothing was understood. When the key facts are in
    // hand, the safest move is to check them rather than hunt for them.
    safestMove: known.everythingIdentified
      ? move(
          "Check the details already found against the original",
          "Compare the reference, dates, and amounts shown here with the message you received, then decide whether anything needs doing.",
          "It confirms AdminAvenger read the message correctly before you rely on it.",
        )
      : move(
          "Identify the sender, date, reference, and deadline",
          "Find who sent it, when, any reference number, what they want, and whether a date is mentioned.",
          "It avoids a rushed response and helps you decide whether this needs action, saving, or advice.",
        ),
    otherSafeMoves: getDefaultOtherSafeMoves(),
    movesToAvoid:
      cautionLevel === "routine" ? ROUTINE_MOVES_TO_AVOID : ELEVATED_MOVES_TO_AVOID,
    whenToGetAdvice: genericAdviceTriggers,
  };
};

/**
 * What the product already knows, read from the structures W1 to W3 put on the
 * case. Nothing here parses the person's text again.
 *
 * The labels matched below are the ones AdminAvenger's own templates emit, not
 * wording from the source, so this is a contract with earlier layers rather than
 * a guess about English. Timing comes from W3's roles, which need no matching at
 * all.
 */
const REFERENCE_EVIDENCE_LABELS = new Set(["Reference", "Booking reference", "Account reference"]);
const SENDER_EVIDENCE_LABELS = new Set([
  "Provider",
  "Sender/provider clue",
  "Airline involved",
  "Travel company involved",
  "Employer or recruiter clue",
]);

type KnownFacts = {
  reference: boolean;
  sender: boolean;
  date: boolean;
  period: boolean;
};

const knownFactsOf = (adminCase?: AdminCase): KnownFacts => {
  const sourceFacts = (adminCase?.evidence ?? []).filter(isSourceFactEvidence);

  return {
    reference: sourceFacts.some((entry) => REFERENCE_EVIDENCE_LABELS.has(entry.label)),
    sender: sourceFacts.some((entry) => SENDER_EVIDENCE_LABELS.has(entry.label)),
    date: (adminCase?.timingFacts?.dates.length ?? 0) > 0,
    period: (adminCase?.timingFacts?.relativePeriods.length ?? 0) > 0,
  };
};

/**
 * The old fallback asked for the sender, date, reference, requested action and
 * deadline in one sentence, whatever the product already had. A delivery message
 * whose reference, expected date and update window had all been read correctly
 * was still told to go and find them.
 *
 * This asks only for what is genuinely absent, and says nothing at all when
 * everything it would have asked for is already known.
 */
const unresolvedFactRequests = (known: KnownFacts): string[] => {
  const requests: string[] = [];

  if (!known.sender) {
    requests.push("Who sent this, if the message does not name the organisation.");
  }

  if (!known.reference) {
    requests.push("Any reference or account number shown on the original.");
  }

  if (!known.date && !known.period) {
    requests.push("Any date or time limit shown on the original.");
  }

  return requests;
};

export const buildStrategicNextStepPlan = ({
  decisionResult,
  benefitsActionPack,
  opportunity,
  adminCase,
}: BuildStrategicNextStepPlanInput): StrategicNextStepPlan => {
  const documentType = decisionResult?.documentType ?? benefitsActionPack?.documentType;
  const cautionLevel = strategicCautionLevelFor({
    decisionResult,
    benefitsActionPack,
    opportunity,
    adminCase,
  });
  const known = knownFactsOf(adminCase);
  const typedPlan = getPlanForDocumentType(documentType, cautionLevel, {
    everythingIdentified: known.reference && (known.date || known.period),
  });
  const title = "Best next move";
  const isHighStakes = documentType ? highStakesTypes.has(documentType) : false;
  const missingInformation = unique([
    ...(benefitsActionPack?.evidenceMissing ?? []),
    ...(benefitsActionPack?.questionsToAnswer.map((question) => question.question) ?? []),
    ...(decisionResult?.evidenceNeeded ?? []),
    ...(decisionResult?.questionsToAnswer ?? []),
    ...(opportunity?.missingInformation ?? []),
  ]).slice(0, 8);
  const uncertainty = unique([
    ...(benefitsActionPack?.uncertainty ?? []),
    ...(decisionResult?.uncertainty ?? []),
  ]);
  const cannotKnow = unique([
    ...(benefitsActionPack?.cannotKnow ?? []),
    ...(decisionResult?.cannotKnow ?? []),
    isHighStakes ? "AdminAvenger cannot decide your rights, entitlement, liability, or outcome." : undefined,
  ]);
  const safetyNotes = unique([
    STRATEGIC_NEXT_STEP_SAFETY_NOTE,
    ...(benefitsActionPack?.safetyNotes ?? []),
    ...(decisionResult?.safetyNotes ?? []),
  ]);

  return {
    title,
    plainEnglishSummary:
      decisionResult?.plainEnglishSummary ??
      benefitsActionPack?.summary ??
      opportunity?.plainEnglishSummary ??
      adminCase?.summary ??
      "This needs a careful check before you decide what to do next.",
    actors: getBaseActors(documentType, opportunity),
    userGoal: typedPlan.userGoal,
    missingInformation:
      missingInformation.length > 0 ? missingInformation : unresolvedFactRequests(known),
    safestMove: typedPlan.safestMove,
    otherSafeMoves: typedPlan.otherSafeMoves,
    movesToAvoid: unique(typedPlan.movesToAvoid).slice(0, 8),
    whenToGetAdvice: unique([...typedPlan.whenToGetAdvice, ...genericAdviceTriggers]).slice(0, 6),
    uncertainty:
      uncertainty.length > 0
        ? uncertainty
        : ["Some details may be missing if the message was cropped, incomplete, or hard to read."],
    cannotKnow:
      cannotKnow.length > 0
        ? cannotKnow
        : ["AdminAvenger cannot know whether the sender has other information outside this message."],
    safetyNotes,
  };
};
