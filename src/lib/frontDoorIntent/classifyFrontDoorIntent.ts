// Front-Door Intent Routing v1 , pure, deterministic, local classifier.
//
// Approved specification: docs/specs/active/front-door-intent-routing-v1.md
// Approved 1 August 2026 for the narrow first slice only.
//
// This function is the whole of the approved production surface for this slice.
// It answers one question: "what kind of thing did the person just submit, and
// what does it appear to contain?"
//
// It deliberately cannot:
//   - decide anything about a named person;
//   - select a service (999, NHS 111 Wales, a ward team, a council);
//   - open a journey, create a case, or confirm who help is for;
//   - produce advice or any user-visible copy.
//
// It has no network, storage, clock or randomness, does not mutate its input,
// and is conservative: where classification is uncertain it defaults to
// `document_or_message`, because a false positive there damages the journey
// that already works.

import type {
  FrontDoorEvidence,
  FrontDoorHelpTarget,
  FrontDoorInputShape,
  FrontDoorIntentClassification,
  FrontDoorSituationSignal,
  FrontDoorUrgencySignal,
  MentionedPerson,
} from "./types";

// --- Document markers -------------------------------------------------------
//
// Verified against all 159 records in publicMessageEvaluation/corpusV1.ts and
// all 16 approved document controls: every one matches at least one marker, and
// no non-document scenario in the approved corpus matches any of them.

const DOCUMENT_MARKERS: readonly { name: string; pattern: RegExp }[] = [
  // Addressed to the reader about the reader's own affairs.
  { name: "second_person", pattern: /\byour\b|\byou (can|may|must|should|will|are|have|need to|do not|just received)\b/i },
  { name: "currency", pattern: /£/ },
  { name: "reference_code", pattern: /\b[A-Z]{2,}[-/]?\d/ },
  { name: "full_date", pattern: /\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/i },
  { name: "supplied_link", pattern: /\blink\b|https?:\/\//i },
  // OCR-style or pasted multi-line layout.
  { name: "line_break", pattern: /\n/ },
  // The sender speaking as an organisation. Deliberately narrow: "we have
  // nowhere to stay tonight" is a person in trouble, not a provider.
  { name: "organisation_voice", pattern: /\bwe (have received|have recorded|have closed|have cancelled|have refused|will never|will respond|will contact|will write|will refund|are unable|can confirm|cannot)\b|\bour (records|team|letter|reference|website|app|service|bank details|telephone)\b/i },
  { name: "organisation_subject", pattern: /\bthe (provider|supplier|landlord|employer|council|company|team|letter|notice|form|service|account|job offer|cancellation|decision)\b/i },
  { name: "document_noun", pattern: /\b(letter|notice|invoice|statement|receipt|bill|tariff|direct debit|subscription|renewal|reconsideration|award|decision letter)\b/i },
  { name: "billing_noun", pattern: /\b(bill|tariff|invoice|statement|direct debit|account|payment|reference|refund|charge|balance|subscription|renewal|deposit|rent|parcel|delivery|appointment|complaint|deadline)\b/i },
  { name: "organisation_imperative", pattern: /\b(please [a-z]+|return the|do not (reply|resign|cancel|share|use)|thank you for|information only)\b/i },
  { name: "passive_notice", pattern: /\b(has been (applied|closed|cancelled|issued|approved|received|arranged|discharged)|is (accepted|confirmed|conditional|cancelled|closed))\b/i },
];

// --- Orientation ------------------------------------------------------------

const ORIENTATION_PATTERN =
  /\bwhat can you do\b|\bis this app\b|\bwhat does this (app|do)\b|\bhow does this work\b|\bwhat do you do\b/i;

// --- Question shapes --------------------------------------------------------

const QUESTION_OPENER =
  /^(can|could|do|does|did|should|shall|would|will|what|which|how|is|are|am|has|have)\b/i;
const NEED_HELP_WITH_THING =
  /^i (need|want) (help|advice)\b/i;
const BENEFIT_FOR_PERSON =
  /^[a-z' ]*\b(allowance|allowence|payment|credit|pip|dla|esa|uc)\b[a-z' ]*\bfor (my|our)\b/i;

// --- Ambiguous --------------------------------------------------------------

const AMBIGUOUS_OPENER = /^help with\b/i;
const AMBIGUOUS_DONT_KNOW = /^i (don'?t|do not) know what to do$/i;

// --- People -----------------------------------------------------------------

const RELATIONSHIP_WORDS = [
  "father", "farther", "dad", "mother", "mum", "mam", "sister", "brother",
  "partner", "husband", "wife", "spouse", "son", "daughter", "child", "aunt",
  "uncle", "grandmother", "grandfather", "grandma", "grandad", "granddad",
  "nan", "nana", "gran", "friend", "neighbour", "neighbor",
] as const;

/**
 * Common misspellings, mapped only for recognition. The label shown back to the
 * person always stays the verbatim source word.
 */
const MISSPELLING_NORMALISATION: readonly (readonly [RegExp, string])[] = [
  [/\bfarther\b/gi, "father"],
  [/\bcair\b/gi, "care"],
  [/\batendance\b/gi, "attendance"],
  [/\ballowence\b/gi, "allowance"],
  [/\bcant\b/gi, "can't"],
];

/** Recognition-only view of the text. Never shown, never returned. */
const normaliseForRecognition = (text: string): string =>
  MISSPELLING_NORMALISATION.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  );

const RELATIONSHIP_PATTERN = new RegExp(
  `\\b(${RELATIONSHIP_WORDS.join("|")})\\b`,
  "gi",
);

/** The user speaking about themselves. */
const FIRST_PERSON_SINGULAR = /\b(i|i'm|i've|i'll|my|me|mine)\b/i;

/**
 * First-person plural. In a document this is the *sender* ("We have received
 * your request"), not the person who pasted it, so it only counts outside a
 * document.
 */
const FIRST_PERSON_PLURAL = /\b(we|our|us)\b/i;

/**
 * A possessive attached to another person, such as "my father" or "our nan".
 *
 * Canonical rule: `mentionedUser` is true only when the user is explicitly part
 * of the situation as an actor, recipient, supporter or affected person. Naming
 * a relative does not put the user in the situation: "my father needs care" is a
 * statement about the father. So these phrases are removed before looking for
 * the user, and only a first-person reference that survives counts.
 */
const POSSESSIVE_RELATIONSHIP = new RegExp(
  `\\b(my|our)\\s+(${RELATIONSHIP_WORDS.join("|")})\\b`,
  "gi",
);

/**
 * Mail-client and device signatures, such as "Sent from my iPhone".
 *
 * These are appended by software, not written by the person, so they must not
 * make the user look like a participant in their own situation.
 *
 * The patterns are anchored to the whole signature phrase, never to "my" alone.
 * "my iPhone helps me track Mum's medication" is a real sentence about the user
 * and is deliberately left intact.
 */
const MESSAGE_SIGNATURE_PHRASES: readonly RegExp[] = [
  /\bsent from my (iphone|ipad|phone|android|mobile|samsung|galaxy|device)\b/gi,
  /\bget outlook for (ios|android)\b/gi,
];

/**
 * Analysis-only copy with signatures removed.
 *
 * Used solely to decide `mentionedUser`. Document detection, security
 * detection, signals, shape, urgency and help target all read the original
 * text, so this cannot change any of them. The source is never modified.
 */
const withoutMessageSignatures = (text: string): string =>
  MESSAGE_SIGNATURE_PHRASES.reduce(
    (value, pattern) => value.replace(pattern, " "),
    text,
  );

/**
 * Does the user place themselves in the situation?
 *
 * In a document, first-person plural is the sender ("We have received your
 * request"), not the person who pasted it, so plural only counts outside one.
 */
const userIsInTheSituation = (text: string, isDocument: boolean): boolean => {
  const withoutSignature = withoutMessageSignatures(text);
  const withoutRelatives = withoutSignature.replace(POSSESSIVE_RELATIONSHIP, " ");
  return (
    FIRST_PERSON_SINGULAR.test(withoutRelatives) ||
    (!isDocument && FIRST_PERSON_PLURAL.test(withoutRelatives))
  );
};

/** Bare "I" as a clause subject, used to detect the user's own involvement. */
const FIRST_PERSON_CLAUSE = /\bi\b/i;

// --- Situation vocabulary ---------------------------------------------------

const NEED_CONTEXT =
  /\b(need|needs|needed|help|helps|helping|support|supporting|struggl|cope|coping|coping|difficult|manage|managing|looking after|look after|care|caring|carer|assessment)\b/i;

const CARING_ROLE =
  /\b(i (look after|care for|help|support|do everything for)|i'?m (my |his |her |their )?[a-z']*'?s? ?carer|i'?ve been looking after|caring for|was (his|her|their) carer|i cared for|carer'?s allowance|i help (with|my|him|her|them)|help (my|him|her|them) (every day|daily)|looking after my)\b/i;

/** The user is carrying an ongoing load, which is itself a caring-role signal. */
const CARING_LOAD = /\b(i'?m exhausted|i can'?t cope|i cannot cope|additional needs)\b/i;

/**
 * The user describing their own involvement. Deliberately narrower than "the
 * word help appears": "my sister needs help" is a statement about the sister,
 * not evidence that the user is supporting anyone.
 */
const SUPPORTER_INVOLVEMENT =
  /\b(i'?m exhausted|i don'?t know what to do|i panicked|i cannot cope|i can'?t cope|i help|i look after|i care for|i support|i do everything|needs? help with|i was (his|her|their) carer|i cared for|partly for me)\b/i;

const FUNCTIONAL_NEED =
  /\b(cannot|can'?t) (wash|cook|manage|get|dress|walk|climb)\b|\b(needs care|needs looking after|struggling to manage|is struggling|not coping|dementia|incontinent|forgets|confused about|unsteady|keeps falling|falling|fell|additional needs|do everything for|manage (his|her|their) bills|manage forms|no bed downstairs|house isn'?t ready|house is not ready)\b/i;

const HOSPITAL_DISCHARGE =
  /\b(coming home from hospital|in hospital|discharge|discharged|sending [a-z]+ home)\b/i;

const BEREAVEMENT =
  /\b(died|passed away|she'?s gone|he'?s gone|when [a-z]+ died|bereavement)\b/i;

const MONEY_OR_BENEFITS =
  /\b(attendance allowance|pip|personal independence|carer'?s allowance|pension credit|council tax|benefits?|claim|qualify|entitled|bills|can i get anything|no food in the house|heating is off|tariff|energy bill|manage forms or money|manage money)\b/i;

const LOCAL_SERVICE =
  /\b(nowhere to stay|no food|heating is off|food bank|somewhere to stay)\b/i;

// --- Urgency ----------------------------------------------------------------
//
// Source-grounded signals only. These record what the wording suggests. They do
// not grade severity and they never select a service.

const IMMEDIATE_DANGER =
  /\b(has fallen and (can'?t|cannot) get up|going to hurt (himself|herself|themselves)|being threatened)\b/i;

const URGENT_HEALTH =
  /\b(run out of (his|her|their) [a-z]* ?medication|no essential medication|out of medication)\b/i;

const URGENT_PRACTICAL =
  /\b(nowhere to stay tonight|no food in the house|heating is off|sending [a-z]+ home tonight|no bed downstairs)\b/i;

/**
 * Wording that suggests something may be needed now. This is the
 * `possible_urgent_need` situation signal, which is not the same thing as the
 * urgency band: being exhausted or awaiting a discharge is unclear urgency
 * without being a possible urgent need.
 */
const URGENT_NEED_WORDING =
  /\b(keeps falling|falling over|cannot cope|can'?t cope|has fallen|run out of|nowhere to stay|no food in the house|heating is off|hurt (himself|herself|themselves)|being threatened|sending [a-z]+ home tonight)\b/i;

const UNCLEAR_URGENCY =
  /\b(keeps falling|falling over|cannot cope|can'?t cope|cant cope|confused about (his|her|their)? ?medication|forgets whether|exhausted|coming home from hospital|talking about discharge|house isn'?t ready)\b/i;

// --- Helpers ----------------------------------------------------------------

const addEvidence = (
  list: FrontDoorEvidence[],
  signal: FrontDoorEvidence["signal"],
  text: string,
  pattern: RegExp,
): void => {
  const match = text.match(pattern);
  if (match?.[0]) {
    list.push({ signal, sourceQuote: match[0] });
  }
};

const documentResult = (
  people: readonly MentionedPerson[],
  signals: readonly FrontDoorSituationSignal[],
  evidence: readonly FrontDoorEvidence[],
  mentionedUser = false,
): FrontDoorIntentClassification => ({
  inputShape: "document_or_message",
  signals,
  // In a document, first-person *plural* is the sender ("We have received your
  // request"), not the person who pasted it. Only first-person singular means
  // the user has spoken about themselves.
  mentionedUser,
  mentionedOtherPeople: people,
  helpTarget: "unknown",
  targetConfirmed: false,
  urgency: "none_detected",
  evidence,
  documentAnalysisSelected: true,
  specialistRouteOpened: false,
  caseCreated: false,
});

const findPeople = (text: string): MentionedPerson[] => {
  const seen = new Set<string>();
  const people: MentionedPerson[] = [];
  RELATIONSHIP_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(RELATIONSHIP_PATTERN)) {
    const label = match[0];
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Recorded in the user's own words. "Dad" is never normalised to "father".
    people.push({ personLabel: label, relationship: label });
  }
  return people;
};

// --- Entry point ------------------------------------------------------------

/**
 * Classify a front-door submission.
 *
 * Pure, deterministic and synchronous. Same input, same output, always.
 */
export const classifyFrontDoorIntent = (
  rawText: string,
): FrontDoorIntentClassification => {
  const text = typeof rawText === "string" ? rawText : "";
  const trimmed = text.trim();
  const evidence: FrontDoorEvidence[] = [];

  if (!trimmed) {
    return documentResult([], [], []);
  }

  // Recognition-only view. The returned labels and evidence always come from
  // the original text; this copy exists so a misspelling does not silently
  // become a wrong confident route.
  const seen = normaliseForRecognition(trimmed);
  const people = findPeople(trimmed);

  // 1. Orientation questions are about the product. Checked first so
  //    "what can you do?" is not read as a document merely because it says
  //    "you".
  if (ORIENTATION_PATTERN.test(seen)) {
    return {
      inputShape: "orientation_request",
      signals: [],
      mentionedUser: userIsInTheSituation(seen, false),
      mentionedOtherPeople: [],
      helpTarget: "unknown",
      targetConfirmed: false,
      urgency: "none_detected",
      evidence,
      documentAnalysisSelected: false,
      specialistRouteOpened: false,
      caseCreated: false,
    };
  }

  // 2. Default to document. A document that also contains a situational
  //    sentence is still a document.
  const isDocument = DOCUMENT_MARKERS.some((marker) => marker.pattern.test(trimmed));

  // --- Situation signals ---------------------------------------------------
  const signals = new Set<FrontDoorSituationSignal>();

  const hasCaringRole = CARING_ROLE.test(seen) || (people.length > 0 && CARING_LOAD.test(seen));
  const hasFunctionalNeed = FUNCTIONAL_NEED.test(seen);
  const hasBereavement = BEREAVEMENT.test(seen);
  const hasDischarge = HOSPITAL_DISCHARGE.test(seen);
  const hasMoney = MONEY_OR_BENEFITS.test(seen);
  const hasLocalService = LOCAL_SERVICE.test(seen);
  const hasNeedContext = NEED_CONTEXT.test(seen);
  const userInvolved = SUPPORTER_INVOLVEMENT.test(seen);
  const explicitlyResolved = /\b(fine now|she'?s fine|he'?s fine|they'?re fine)\b/i.test(seen);

  // --- Urgency -------------------------------------------------------------
  // Source-grounded signals only. Never a severity, never a service.
  let urgency: FrontDoorUrgencySignal = "none_detected";
  if (!isDocument) {
    if (IMMEDIATE_DANGER.test(seen)) {
      urgency = "possible_immediate_danger";
      addEvidence(evidence, urgency, trimmed, IMMEDIATE_DANGER);
    } else if (URGENT_HEALTH.test(seen)) {
      urgency = "possible_urgent_health_need";
      addEvidence(evidence, urgency, trimmed, URGENT_HEALTH);
    } else if (URGENT_PRACTICAL.test(seen)) {
      urgency = "possible_urgent_practical_support";
      addEvidence(evidence, urgency, trimmed, URGENT_PRACTICAL);
    } else if (UNCLEAR_URGENCY.test(seen) && !explicitlyResolved) {
      urgency = "unclear_urgency";
      addEvidence(evidence, urgency, trimmed, UNCLEAR_URGENCY);
    }
  }
  const strongUrgency =
    urgency === "possible_immediate_danger" ||
    urgency === "possible_urgent_health_need" ||
    urgency === "possible_urgent_practical_support";

  // A document may still carry the user's own sentence alongside it. Signals
  // are read only from that added voice: an organisation writing about "your
  // mum's care home invoice" is not the user describing a caring situation.
  const userSpoke = userIsInTheSituation(trimmed, isDocument);
  const allowSignals = !isDocument || userSpoke;
  if (allowSignals) {
    // A person is only "possibly needing support" when they are named AND the
    // text says something is happening to them.
    const personHasContext =
      hasNeedContext ||
      hasFunctionalNeed ||
      hasMoney ||
      hasDischarge ||
      hasBereavement ||
      strongUrgency ||
      /\bit'?s for (a|my|our)\b/i.test(seen);
    // Bereavement shifts the focus to the person left behind. Where the user
    // also describes their own role or uncertainty, the deceased is no longer
    // the person the question is about.
    const bereavementCentresOnUser =
      hasBereavement && (FIRST_PERSON_CLAUSE.test(seen) || hasCaringRole);

    if (people.length > 0 && personHasContext && !bereavementCentresOnUser) {
      signals.add("possible_person_needing_support");
      addEvidence(evidence, "possible_person_needing_support", trimmed, RELATIONSHIP_PATTERN);
    }
    const supporterEvident = hasBereavement
      ? userInvolved
      : hasCaringRole || (userInvolved && (people.length > 0 || /\bfor me\b/i.test(seen)));
    if (supporterEvident) {
      signals.add("possible_supporter");
      addEvidence(evidence, "possible_supporter", trimmed, SUPPORTER_INVOLVEMENT);
    }
    if (hasCaringRole) {
      signals.add("possible_caring_role");
      addEvidence(evidence, "possible_caring_role", trimmed, CARING_ROLE);
    }
    if (hasFunctionalNeed) {
      signals.add("possible_functional_need");
      addEvidence(evidence, "possible_functional_need", trimmed, FUNCTIONAL_NEED);
    }
    if (hasDischarge) {
      signals.add("possible_hospital_discharge");
      addEvidence(evidence, "possible_hospital_discharge", trimmed, HOSPITAL_DISCHARGE);
    }
    if (hasBereavement) {
      signals.add("possible_bereavement");
      addEvidence(evidence, "possible_bereavement", trimmed, BEREAVEMENT);
    }
    if (hasMoney) {
      signals.add("possible_money_or_benefits_need");
      addEvidence(evidence, "possible_money_or_benefits_need", trimmed, MONEY_OR_BENEFITS);
    }
    if (hasLocalService) {
      signals.add("possible_local_service_need");
      addEvidence(evidence, "possible_local_service_need", trimmed, LOCAL_SERVICE);
    }
    if (!isDocument && URGENT_NEED_WORDING.test(seen)) {
      signals.add("possible_urgent_need");
      addEvidence(evidence, "possible_urgent_need", trimmed, URGENT_NEED_WORDING);
    }
  }

  if (isDocument) {
    // A document may carry the user's own sentence alongside it ("Your father's
    // account has been closed. I look after him..."). Signals are read only
    // from that added voice: an organisation writing about "your mum's care
    // home invoice" is not the user telling us about a caring situation.
    return documentResult(people, userSpoke ? [...signals] : [], evidence, userSpoke);
  }

  // --- Shape ---------------------------------------------------------------
  const words = trimmed.split(/\s+/).filter(Boolean);
  const isAmbiguous =
    words.length <= 2 ||
    AMBIGUOUS_OPENER.test(seen) ||
    AMBIGUOUS_DONT_KNOW.test(seen);

  const isQuestion =
    !isAmbiguous &&
    (trimmed.includes("?") ||
      QUESTION_OPENER.test(seen) ||
      NEED_HELP_WITH_THING.test(seen) ||
      BENEFIT_FOR_PERSON.test(seen));

  const inputShape: FrontDoorInputShape = isAmbiguous
    ? "ambiguous_request"
    : isQuestion
      ? "direct_question"
      : "ongoing_situation";

  if (isAmbiguous && urgency === "none_detected") {
    // Minimal input tells us nothing about urgency. Recording "none detected"
    // would assert something we cannot support.
    urgency = "unclear_urgency";
  }

  // --- Help target ---------------------------------------------------------
  //
  // Approved decision 2: naming somebody is not asking for help for them, and
  // describing a caring role is not asking for help for oneself.
  //
  // Approved decision 4: `multiple_other_people` and `self_and_other` are
  // unreachable here by construction. Only an explicit human selection may set
  // them, and this function never performs one.
  const asksForSelf =
    /\b(am i entitled|can i (get|claim)|i need help|can someone get back to me)\b/i.test(seen) ||
    /\bmy carer'?s allowance\b/i.test(seen);
  const asksAboutNamedPerson = new RegExp(
    `\\b(can|could|does|do|should|will) (my |our )?(${RELATIONSHIP_WORDS.join("|")}) (claim|qualify|get|apply)\\b`,
    "i",
  ).test(seen);
  const asksForOneOther =
    asksAboutNamedPerson ||
    /\bi (don'?t|do not) need help\b/i.test(seen) ||
    /\bit'?s for (a|my|our)\b/i.test(seen) ||
    BENEFIT_FOR_PERSON.test(seen) ||
    (strongUrgency && people.length === 1);

  let helpTarget: FrontDoorHelpTarget = "unknown";
  if (asksForSelf && !asksForOneOther) {
    helpTarget = "self";
  } else if (asksForOneOther && people.length >= 1) {
    helpTarget = "one_other_person";
  }

  // `person_target_unclear` marks genuine ambiguity about who the question is
  // about. It is not a synonym for "target not yet stated": an urgent message
  // naming one person, a settled bereavement, and an explicitly resolved
  // situation are all unambiguous.
  const carriesAdminContent =
    people.length > 0 || hasNeedContext || hasMoney || hasFunctionalNeed || userInvolved;
  const bereavementIsSettled =
    hasBereavement && !/\b(don'?t know|do not know|not sure)\b/i.test(seen);
  if (
    helpTarget === "unknown" &&
    !strongUrgency &&
    !bereavementIsSettled &&
    !explicitlyResolved &&
    carriesAdminContent
  ) {
    signals.add("person_target_unclear");
  }

  return {
    inputShape,
    signals: [...signals],
    mentionedUser: userIsInTheSituation(seen, false),
    mentionedOtherPeople: people,
    helpTarget,
    targetConfirmed: false,
    urgency,
    evidence,
    documentAnalysisSelected: false,
    specialistRouteOpened: false,
    caseCreated: false,
  };
};
