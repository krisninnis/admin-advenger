// Canonical detector for direct requests to hand over secret credentials.
//
// A message that asks the reader to send a one-time code, password, PIN, or
// card/bank credential is the single strongest scam-shaped signal AdminAvenger
// can recognise deterministically. It is kept in its own module so that the
// email safety assessor and the structured general-admin fallback share exactly
// one definition, and so the fallback can refuse to echo such a request back as
// an instruction.
//
// This never decides that a sender is fraudulent. It only recognises that the
// message asks for something that should never be shared in reply.

export type SensitiveInformationKind = "login" | "card" | "bank";

export type SensitiveInformationRequest = {
  requested: boolean;
  kinds: SensitiveInformationKind[];
  /** Verbatim source substring, so the signal stays provable against the text. */
  sourceQuote?: string;
};

// Verbs that ask the reader to hand something over. "ask for" is included so a
// protective sentence such as "we will never ask for your password" is seen and
// then correctly discarded by the negation check below.
// "text" and "email" are deliberately absent: they are common nouns as well as
// verbs, and an ordinary phrase ending in one of them would otherwise chain into
// the next line's wording. "send" already covers the intended meaning.
const REQUEST_VERB = String.raw`(?:send|share|give|provide|supply|enter|input|type|forward|reply[ \t]+to[ \t]+(?:this|the)[ \t]+(?:message|email)[ \t]+with|reply[ \t]+with|respond[ \t]+with|tell|confirm|verify|validate|update|read[ \t]+out|disclose|need|require|asks?[ \t]+(?:you[ \t]+)?for|asking[ \t]+for)`;

// A closed list of determiners, pronouns and numeric modifiers may sit between
// the verb and the credential noun ("send us the six-digit verification code").
// The list is deliberately closed: allowing arbitrary words here would let an
// ordinary sentence such as "we updated the terms and your account number
// stayed the same" look like a credential request.
const FILLER_WORD = String.raw`(?:us|me|back|over|to|for|your|our|my|their|the|a|an|this|that|these|those|same|new|full|complete|correct|updated|latest|current|recent|valid|remaining|last|first|online|internet|mobile|telephone|phone|bank|banking|account|security|personal|memorable|temporary|login|log[-\s]?in|sign[-\s]?in|one[-\s]?time|two[-\s]?factor|2fa|(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|sixteen)(?:[-\s]digit)?|digit)`;
// Only spaces and tabs may separate the parts of a request, so a match can never
// run across a line break and stitch two unrelated statements together.
const REQUEST_FILLER = String.raw`(?:[ \t]+${FILLER_WORD}){0,4}[ \t]+`;

const CREDENTIAL_NOUN = String.raw`(?:one[-\s]?time\s+(?:pass)?(?:code|word)|one[-\s]?time\s+pin|otp|passcode|verification\s+code|authentication\s+code|authorisation\s+code|authorization\s+code|security\s+code|access\s+code|confirmation\s+code|login\s+(?:code|details|credentials)|log[-\s]?in\s+(?:code|details|credentials)|sign[-\s]?in\s+(?:code|details|credentials)|password|passwords|memorable\s+(?:word|information)|pin(?:\s+(?:number|code))?|card\s+security\s+code|security\s+number|cvv|cvc|card\s+(?:number|details|digits)|payment\s+card\s+details|credit\s+card\s+details|debit\s+card\s+details|bank\s+(?:login\s+)?details|banking\s+details|bank\s+account\s+details|sort\s+code|account\s+number)`;

const SENSITIVE_REQUEST_PATTERN = new RegExp(
  String.raw`\b${REQUEST_VERB}${REQUEST_FILLER}${CREDENTIAL_NOUN}\b`,
  "gi",
);

const CARD_NOUN =
  /\b(?:card\s+(?:number|details|digits|security\s+code)|payment\s+card|credit\s+card|debit\s+card|cvv|cvc)\b/i;
const BANK_NOUN =
  /\b(?:bank\s+(?:login\s+)?details|banking\s+details|bank\s+account\s+details|sort\s+code|account\s+number)\b/i;

// The same negation window the email assessor already uses, so protective
// wording ("do not share", "we will never ask for") stays a safe negative.
const NEGATION_WINDOW = 70;
const NEGATION_PATTERN =
  /(?:\bdo not|\bdon['’]t|\bnever|\bnot to|\bwon['’]t|\bwill not|\brather than|\bno one (?:will|should)|\bnobody (?:will|should))\s+(?:\w+[-'’]?\w*\s+){0,5}$/i;

const isNegatedAt = (text: string, index: number) =>
  NEGATION_PATTERN.test(text.slice(Math.max(0, index - NEGATION_WINDOW), index));

const kindFor = (quote: string): SensitiveInformationKind =>
  CARD_NOUN.test(quote) ? "card" : BANK_NOUN.test(quote) ? "bank" : "login";

/**
 * Returns every unnegated request for a secret credential, with the verbatim
 * source quote of the first one.
 */
export const detectSensitiveInformationRequest = (
  text: string,
): SensitiveInformationRequest => {
  const kinds: SensitiveInformationKind[] = [];
  let sourceQuote: string | undefined;

  SENSITIVE_REQUEST_PATTERN.lastIndex = 0;
  for (const match of text.matchAll(SENSITIVE_REQUEST_PATTERN)) {
    const index = match.index ?? 0;
    if (isNegatedAt(text, index)) {
      continue;
    }

    const quote = match[0];
    const kind = kindFor(quote);
    if (!kinds.includes(kind)) {
      kinds.push(kind);
    }
    sourceQuote ??= quote;
  }

  return { requested: kinds.length > 0, kinds, sourceQuote };
};

export const hasSensitiveInformationRequest = (text: string) =>
  detectSensitiveInformationRequest(text).requested;

/**
 * The protective instruction shown whenever a message asks for a credential.
 * AdminAvenger never says the sender is fraudulent; it says what must not be
 * shared and where to check instead.
 */
export const SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL =
  "Sensitive information requested by message";

export const SENSITIVE_INFORMATION_WARNING =
  "Do not send or share the requested code, password, PIN, or card or bank details with anyone, including the sender. Check with the organisation first using a phone number or website you have obtained independently, not one supplied in this message.";
