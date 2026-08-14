// Ordinary Message Benefits Claimant Resolution V1.
//
// This module answers one deliberately narrow question: whose benefit-related
// administrative event is the source text about? It does not decide who wants
// help, whether the user may act for somebody else, or whether any benefits
// route is available. Those remain separate decisions.

import { classifyFrontDoorIntent } from "./classifyFrontDoorIntent";
import type { MentionedPerson } from "./types";

export type BenefitsClaimantEvidence = {
  /** Exact text that established, or made ambiguous, the event subject. */
  readonly sourceQuote: string;
};

type BenefitsClaimantContext = {
  /** Helper wording is context only and never establishes formal authority. */
  readonly helperContext: boolean;
  readonly helperEvidence?: string;
};

export type BenefitsClaimantResolution =
  | (BenefitsClaimantContext & {
      readonly status: "resolved";
      readonly claimant: "user";
      readonly subject: "user";
      readonly evidence: BenefitsClaimantEvidence;
    })
  | (BenefitsClaimantContext & {
      readonly status: "resolved";
      readonly claimant: "one_other_person";
      /** Verbatim relationship word from the source. */
      readonly subject: string;
      /** Verbatim relationship word from the source. */
      readonly relationship: string;
      readonly evidence: BenefitsClaimantEvidence;
    })
  | (BenefitsClaimantContext & {
      readonly status: "ambiguous";
      readonly evidence?: BenefitsClaimantEvidence;
    })
  | (BenefitsClaimantContext & {
      readonly status: "unresolved";
      readonly evidence?: BenefitsClaimantEvidence;
    });

const BENEFIT_TERM = String.raw`(?:pip|personal\s+independence\s+payment|benefits?)`;
const EVENT_TERM = String.raw`(?:review|assessment|form|letter|award|claim)`;

const BENEFIT_LANGUAGE = new RegExp(String.raw`\b${BENEFIT_TERM}\b`, "i");
const SELF_OWNERSHIP = new RegExp(
  String.raw`\bmy\s+(?:${BENEFIT_TERM}|${EVENT_TERM})\b|\bi\s+(?:have|got|receive|get)\s+(?:a\s+)?${BENEFIT_TERM}\b`,
  "i",
);
const PRONOUN_EVENT = new RegExp(
  String.raw`\b(his|her)\s+(?:${BENEFIT_TERM}|${EVENT_TERM})\b|\b(he|she)\s+(?:has|had|got|gets|is\s+having)\s+(?:a\s+)?(?:${BENEFIT_TERM}\s*)?(?:${EVENT_TERM})?\b`,
  "gi",
);
const PLURAL_OR_UNKNOWN_SUBJECT = new RegExp(
  String.raw`\b(?:we|our|someone|somebody)\b[^.!?\n]{0,40}\b(?:${BENEFIT_TERM}|${EVENT_TERM})\b`,
  "i",
);
const PLURAL_EVENT_SUBJECT = new RegExp(
  String.raw`\bwe\s+(?:have|got|get|are\s+having)\s+(?:${BENEFIT_TERM}\s*)?(?:${EVENT_TERM})s?\b`,
  "i",
);
const UNGROUNDED_PRONOUN = new RegExp(
  String.raw`\b(?:his|her|he|she)\b[^.!?\n]{0,30}\b(?:${BENEFIT_TERM}|${EVENT_TERM})\b`,
  "i",
);
const HELPER_WORDING =
  /\bi\s+help\b[^.!?\n]{0,60}|\bi\s+(?:look\s+after|deal\s+with|do)\b[^.!?\n]{0,50}\b(?:paperwork|forms?|letters?|benefits?|him|her|them|my\s+\w+)\b/i;
const SENSITIVE_OR_LINK_CONTEXT =
  /\b(?:password|passcode|pin|card\s+details|bank\s+details|bank\s+password|login\s+details|security\s+code|verification\s+code|click\s+(?:this|the)\s+link|enter\s+your)\b/i;
const INCIDENTAL_OTHER_SUBJECT =
  /\b(?:but|however)\b[^.!?\n]{0,50}\b(?:this|the\s+(?:letter|message|notice))\b[^.!?\n]{0,30}\babout\b[^.!?\n]{0,40}\b(?:council\s+tax|energy\s+bill|broadband|mobile\s+bill|work\s+review|blue\s+badge|insurance|subscription)\b/i;
const UNRELATED_EVENT_CONTEXT =
  /\b(?:blue\s+badge\s+review|review\s+at\s+work|work\s+review|broadband\s+review|energy\s+review|insurance\s+review)\b/i;

const MALE_RELATIONSHIPS = new Set([
  "father",
  "farther",
  "dad",
  "brother",
  "husband",
  "son",
  "uncle",
  "grandfather",
  "grandad",
  "granddad",
]);

const FEMALE_RELATIONSHIPS = new Set([
  "mother",
  "mum",
  "mam",
  "sister",
  "wife",
  "daughter",
  "aunt",
  "grandmother",
  "grandma",
  "nan",
  "nana",
  "gran",
]);

const helperContextOf = (text: string): BenefitsClaimantContext => {
  const helper = text.match(HELPER_WORDING)?.[0];
  return helper
    ? { helperContext: true, helperEvidence: helper }
    : { helperContext: false };
};

const escaped = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const genderOf = (person: MentionedPerson): "male" | "female" | "unknown" => {
  const relationship = (person.relationship ?? person.personLabel).toLowerCase();
  if (MALE_RELATIONSHIPS.has(relationship)) return "male";
  if (FEMALE_RELATIONSHIPS.has(relationship)) return "female";
  return "unknown";
};

const resolvePronounAntecedent = (
  text: string,
  people: readonly MentionedPerson[],
): { person: MentionedPerson; sourceQuote: string } | undefined => {
  PRONOUN_EVENT.lastIndex = 0;
  const matches = [...text.matchAll(PRONOUN_EVENT)];
  const event = matches.at(-1);
  if (!event?.[0]) return undefined;

  const pronoun = (event[1] ?? event[2] ?? "").toLowerCase();
  const gender = pronoun === "his" || pronoun === "he" ? "male" : "female";
  const eventIndex = event.index ?? text.length;
  const candidates = people.filter((person) => {
    if (genderOf(person) !== gender) return false;
    const mention = new RegExp(String.raw`\b${escaped(person.personLabel)}\b`, "i").exec(text);
    return mention !== null && (mention.index ?? 0) < eventIndex;
  });

  return candidates.length === 1
    ? { person: candidates[0]!, sourceQuote: event[0] }
    : undefined;
};

const directRelationshipEvidence = (
  text: string,
  person: MentionedPerson,
): string | undefined => {
  const label = escaped(person.personLabel);
  const pattern = new RegExp(
    String.raw`\b(?:my\s+)?${label}(?:['\u2019]s)?\b[^.!?\n]{0,55}\b(?:${BENEFIT_TERM}|${EVENT_TERM})\b`,
    "i",
  );
  return text.match(pattern)?.[0];
};

/**
 * Resolve the subject of a benefits-shaped administrative event.
 *
 * The optional classification avoids doing the same deterministic work twice
 * in the front-door pipeline. It changes no result: callers receive the same
 * answer whether they pass it or not.
 */
export const resolveBenefitsClaimant = (
  sourceText: string,
  classification = classifyFrontDoorIntent(sourceText),
): BenefitsClaimantResolution => {
  const text = typeof sourceText === "string" ? sourceText.trim() : "";
  const context = helperContextOf(text);

  if (!text || !BENEFIT_LANGUAGE.test(text)) {
    return { ...context, status: "unresolved" };
  }

  // Claimant resolution must never become a way around security precedence or
  // let an incidental benefits mention take over a different document topic.
  const unsafeOrIncidental =
    text.match(SENSITIVE_OR_LINK_CONTEXT)?.[0] ??
    text.match(INCIDENTAL_OTHER_SUBJECT)?.[0] ??
    text.match(UNRELATED_EVENT_CONTEXT)?.[0];
  if (unsafeOrIncidental) {
    return {
      ...context,
      status: "ambiguous",
      evidence: { sourceQuote: unsafeOrIncidental },
    };
  }

  const self = text.match(SELF_OWNERSHIP)?.[0];
  if (self) {
    return {
      ...context,
      status: "resolved",
      claimant: "user",
      subject: "user",
      evidence: { sourceQuote: self },
    };
  }

  const pluralEvent = text.match(PLURAL_EVENT_SUBJECT)?.[0];
  if (pluralEvent) {
    return {
      ...context,
      status: "ambiguous",
      evidence: { sourceQuote: pluralEvent },
    };
  }

  // "Mum gets PIP and I help every day" describes two positions but no
  // administrative event. It remains a useful claimant question. The resolved
  // helper cases below contain an explicit review, assessment, form, letter,
  // award or claim tied to the other person.
  if (
    context.helperContext &&
    !new RegExp(String.raw`\b${EVENT_TERM}\b`, "i").test(text)
  ) {
    return { ...context, status: "ambiguous" };
  }

  const pronoun = resolvePronounAntecedent(
    text,
    classification.mentionedOtherPeople,
  );
  if (pronoun) {
    const relationship = pronoun.person.relationship ?? pronoun.person.personLabel;
    return {
      ...context,
      status: "resolved",
      claimant: "one_other_person",
      subject: pronoun.person.personLabel,
      relationship,
      evidence: { sourceQuote: pronoun.sourceQuote },
    };
  }

  if (classification.mentionedOtherPeople.length === 1) {
    const person = classification.mentionedOtherPeople[0]!;
    const relationshipEvidence = directRelationshipEvidence(text, person);
    if (relationshipEvidence) {
      const relationship = person.relationship ?? person.personLabel;
      return {
        ...context,
        status: "resolved",
        claimant: "one_other_person",
        subject: person.personLabel,
        relationship,
        evidence: { sourceQuote: relationshipEvidence },
      };
    }
  }

  const ambiguous =
    text.match(PLURAL_OR_UNKNOWN_SUBJECT)?.[0] ??
    text.match(UNGROUNDED_PRONOUN)?.[0];
  if (ambiguous || classification.mentionedOtherPeople.length > 1) {
    return {
      ...context,
      status: "ambiguous",
      ...(ambiguous ? { evidence: { sourceQuote: ambiguous } } : {}),
    };
  }

  return { ...context, status: "unresolved" };
};

/**
 * A short claimant-less phrase such as "got a PIP letter" is document-shaped
 * only because it contains the noun "letter". It does not contain enough
 * source detail to analyse safely, so the existing claimant question remains
 * useful. Real letters and resolved relationship letters keep document policy.
 */
export const isBareBenefitsClaimantPrompt = (sourceText: string): boolean => {
  const text = sourceText.trim();
  if (!BENEFIT_LANGUAGE.test(text)) return false;
  if (!new RegExp(String.raw`\b(?:letter|form)\b`, "i").test(text)) return false;
  if (text.split(/\s+/).length > 12) return false;
  if (/\b(?:but|however)\b/i.test(text)) return false;

  return !/\b(?:your|please|must|deadline|reference|account|decision)\b|https?:\/\/|\n|\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i.test(
    text,
  );
};
