// Local, deterministic "Key details found" extraction for the OCR review
// step (see the inline photo-review section in src/views/HomeView.tsx).
//
// This never runs anywhere but this browser tab - it is plain regex/string
// matching over text that is already local (pasted, typed, or OCR'd on
// device). Nothing here uploads, sends, contacts, or submits anything, and
// nothing here counts money. It exists purely to save the user from reading
// every line of a messy OCR result by surfacing the handful of facts most
// letters share (who it's from, what it mentions, amounts, dates,
// references) - always as "found in the text", never as a verified or acted
// on fact. The user still edits the full OCR text themselves and nothing
// here changes what "Check this text" sends into the existing Check-a-message
// flow.

export type OcrKeyDetailKind =
  | "sender"
  | "company"
  | "reference"
  | "date"
  | "amount"
  | "phone"
  | "email"
  | "court_or_claim"
  | "deadline_wording"
  | "document_type_hint"
  | "risk_wording";

export type OcrKeyDetail = {
  label: string;
  value: string;
  kind: OcrKeyDetailKind;
  caution?: string;
};

export type OcrKeyDetails = {
  details: OcrKeyDetail[];
  warnings: string[];
};

// A named, ordered bucket of details for the "Key details found" card's
// grouped layout (see groupOcrKeyDetails below). Only ever built from an
// existing OcrKeyDetail[] - grouping is purely a display concern layered on
// top of the same extraction output, never a second extraction pass.
export type OcrKeyDetailGroup = {
  heading: string;
  details: OcrKeyDetail[];
};

// ---- Standing UI copy (exported so HomeView and tests share one source) ----

// Always shown on the "Key details found" card, regardless of confidence -
// this is the headline instruction, not a conditional warning.
export const OCR_KEY_DETAILS_HEADING = "Key details found";
export const OCR_KEY_DETAILS_CHECK_MESSAGE =
  "Check these details against the photo before relying on them.";

// Shown additionally on the card only when the caller knows OCR confidence
// was low or quality warnings were raised elsewhere (HomeView decides this -
// extractOcrKeyDetails only sees text, not confidence, so it cannot know this
// itself).
export const OCR_KEY_DETAILS_LOW_QUALITY_CAUTION =
  "These details may be wrong if the photo was unclear.";
export const OCR_KEY_DETAILS_HIDDEN_UNRELIABLE_MESSAGE =
  "Key details are hidden because the photo was not read clearly enough.";

// ---- Per-kind caution lines ----
//
// Every caution below is worded to avoid ever asserting an outcome: no
// "pay"/"ignore"/"valid"/"invalid"/"owed" wording, no confirmation of a
// sender's identity, no confirmation that a claim is real or that a deadline
// is legally binding. Each one only ever says a detail was *found in the
// text* and should be checked against the original.
const AMOUNT_CAUTION =
  "This is an amount mentioned in the letter, not a confirmed balance.";
const DATE_CAUTION =
  "This is a date mentioned in the letter. Check the exact date and any deadline on the original document.";
const REFERENCE_CAUTION =
  "This looks like a reference or claim number found in the letter. Check it against the original document.";
const PHONE_CAUTION =
  "This looks like a phone number found in the letter. AdminAvenger has not verified who it belongs to.";
const COURT_OR_CLAIM_CAUTION =
  "This wording appears in the letter. It does not mean a claim is one way or the other - check the original document and consider getting advice if this feels serious.";
const DEADLINE_WORDING_CAUTION =
  "This wording appears in the letter. It does not confirm an exact deadline - check the exact date and any time limit on the original document.";
const DOCUMENT_TYPE_HINT_CAUTION =
  "This wording suggests a possible document type. AdminAvenger has not confirmed what this letter is.";
const SENDER_CAUTION =
  "This name appears in the letter as a possible sender. AdminAvenger has not verified who sent this.";
const COMPANY_CAUTION =
  "This name appears in the letter as a possible company or client mentioned. AdminAvenger has not verified this.";
const RISK_WORDING_CAUTION =
  "This wording appears in the letter. It does not tell you what happens next - check the original document and consider getting advice if this feels serious.";

// ---- Amounts ----
// £255.00, £255, GBP 255.00 - text only, never parsed into a number and
// never fed into any savings/recovery total (see impactLedger.ts, which this
// file has no relationship to at all).
const AMOUNT_PATTERN = /£\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\bGBP\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/gi;

// ---- Dates ----
// 04/03/2026 and 6 Mar 2026 / 6 March 2026 - kept as plain found text, never
// parsed into a Date or compared against "today" (that would risk implying a
// confirmed deadline calculation this tool cannot make safely).
const NUMERIC_DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WORD_DATE_PATTERN = new RegExp(`\\b\\d{1,2}\\s+(?:${MONTH_NAMES})\\s+\\d{4}\\b`, "gi");

const parseNumericDateParts = (value: string): { day: number; month: number; year: number } | null => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    return null;
  }

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue);

  return { day, month, year };
};

const isPlausibleDateParts = (day: number, month: number, year: number): boolean => {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
};

const isPlausibleNumericDate = (value: string): boolean => {
  const parts = parseNumericDateParts(value);
  return parts ? isPlausibleDateParts(parts.day, parts.month, parts.year) : false;
};

const isPlausibleWordDate = (value: string): boolean => {
  const day = Number(value.trim().match(/^(\d{1,2})\s+/i)?.[1]);
  return Number.isInteger(day) && day >= 1 && day <= 31;
};

// ---- Phone numbers ----
// A single, deliberately simple UK-shaped pattern (leading 0, then a 2-4
// digit group, then a 5-7 digit group) - covers landline and mobile-style
// numbers like "01529 406096" without trying to be a full international
// phone-number parser.
const PHONE_PATTERN = /\b0\d{2,4}[\s-]?\d{5,7}\b/g;

// ---- Phone number dedupe / near-match clustering ----
//
// Live mobile testing on a real letter showed the same phone number three
// times over as "01529 406096", "01529 406086", and "01529 406996" - almost
// certainly one real number misread by OCR in slightly different ways each
// time it was printed, not three genuine numbers. Rather than showing every
// near-identical variant as if each were equally real, matches are grouped
// into clusters of numbers that are the same length and differ in at most
// two digit positions; only the most-seen (ties broken by first-found)
// number in each cluster becomes a detail, and the other variants are folded
// into that detail's caution text as unverified possible OCR misreads - this
// never claims the chosen number is the "correct" or "verified" one, only
// that it was the most consistently found.
const digitsOnly = (value: string) => value.replace(/\D/g, "");

const hammingDistance = (a: string, b: string): number => {
  if (a.length !== b.length) {
    return Number.POSITIVE_INFINITY;
  }
  let distance = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      distance += 1;
    }
  }
  return distance;
};

const MAX_PHONE_CLUSTER_DIGIT_DISTANCE = 2;
const MIN_PHONE_DIGIT_LENGTH = 10;
const UK_PHONE_PREFIX_PATTERN = /^0(?:1|2|3|7)\d{8,10}$|^0800\d{6,7}$/;

const isLikelyUkPhoneNumber = (value: string): boolean => {
  const digits = digitsOnly(value);

  if (digits.length < MIN_PHONE_DIGIT_LENGTH) {
    return false;
  }

  return UK_PHONE_PREFIX_PATTERN.test(digits);
};

type PhoneCluster = {
  primary: string;
  variants: string[];
};

// Pure - greedily assigns each match to the first existing cluster whose
// representative (the cluster's first-seen number) differs by at most two
// digits, otherwise starts a new cluster. Within each cluster, the number
// seen most often becomes primary (ties go to whichever was found first);
// every other distinct number found in that cluster is kept as a variant.
const clusterPhoneMatches = (rawMatches: string[]): PhoneCluster[] => {
  const clusters: {
    representativeDigits: string;
    counts: Map<string, number>;
    firstSeenOrder: Map<string, number>;
  }[] = [];

  rawMatches.forEach((rawMatch, index) => {
    const value = rawMatch.replace(/\s+/g, " ").trim();
    const digits = digitsOnly(value);

    let cluster = clusters.find(
      (existing) => hammingDistance(existing.representativeDigits, digits) <= MAX_PHONE_CLUSTER_DIGIT_DISTANCE,
    );
    if (!cluster) {
      cluster = { representativeDigits: digits, counts: new Map(), firstSeenOrder: new Map() };
      clusters.push(cluster);
    }
    cluster.counts.set(value, (cluster.counts.get(value) ?? 0) + 1);
    if (!cluster.firstSeenOrder.has(value)) {
      cluster.firstSeenOrder.set(value, index);
    }
  });

  return clusters.map((cluster) => {
    const values = Array.from(cluster.counts.keys()).sort((a, b) => {
      const countDifference = (cluster.counts.get(b) ?? 0) - (cluster.counts.get(a) ?? 0);
      if (countDifference !== 0) {
        return countDifference;
      }
      return (cluster.firstSeenOrder.get(a) ?? 0) - (cluster.firstSeenOrder.get(b) ?? 0);
    });
    const [primary, ...variants] = values;
    return { primary, variants };
  });
};

// Builds the phone caution, optionally naming near-match variants that were
// folded into this cluster - never asserting the primary number is verified,
// only that it was the most consistently found.
const buildPhoneCaution = (variants: string[]): string => {
  if (variants.length === 0) {
    return PHONE_CAUTION;
  }
  return `${PHONE_CAUTION} Similar numbers also appeared in the text and may be possible OCR misreads of this one: ${variants.join(", ")}.`;
};

// ---- Reference / claim numbers ----
// Two passes, both deliberately conservative:
// 1) a code-shaped token (6-14 chars, uppercase letters + digits, containing
//    at least one of each) found anywhere in the text - catches things like
//    "N1QZ564Y" or "VCS23217813" print on their own line under a heading.
// 2) the same code-shaped token found on a line that also contains one of the
//    reference/claim/account/notice/PCN keywords - kept only for interest
//    (case 1 already covers most real examples); used so a code sitting right
//    next to "Reference:" is never missed even if it is shorter/longer than
//    the standalone heuristic prefers.
const REFERENCE_KEYWORD_PATTERN = /\b(reference|claim\s*(?:no\.?|number)?|account(?:\s*no\.?|\s*number)?|notice\s*number|pcn)\b/i;
const CODE_TOKEN_PATTERN = /\b(?=[A-Z0-9]{6,14}\b)(?=[A-Z0-9]*[0-9])(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,14}\b/g;
const COMPANY_NUMBER_PATTERN = /\bcompany\s+(?:registration\s+)?number[:\s]*([0-9]{6,10})\b/gi;

// ---- Court / proceedings wording ----
// Exact phrases only (case-insensitive) - flagged as wording found, never
// interpreted into a legal conclusion.
const COURT_PHRASES = [
  "Civil National Business Centre",
  "CNBC",
  "claim has now been issued",
  "issue of proceedings",
  "response pack",
  "acknowledge the debt",
  "dispute the debt",
];
// Kept separate (word-boundary only) so "defend" is not matched inside an
// unrelated longer word (e.g. "defendant" does not trigger this on its own).
const COURT_WORD_PATTERNS = [/\bdefend\b/i];

// ---- Deadline-style wording (distinct from calendar dates above) ----
// Generic urgency phrasing rather than a specific date - still only ever
// "wording found", never a confirmed deadline.
const DEADLINE_WORDING_PHRASES = [
  "final notice",
  "final reminder",
  "immediate action required",
  "before further action is taken",
];
const DEADLINE_WORDING_PATTERNS = [/\bwithin\s+\d{1,3}\s+days\b/gi];

// ---- Parking wording ----
const PARKING_SPECIFIC_PHRASES = ["Parking Charge Notice", "PCN"];
const PARKING_GENERIC_PHRASE = "parking";

// ---- Known companies (kind: company) ----
const KNOWN_COMPANY_PHRASES = ["Vehicle Control Services"];

// ---- Known senders (kind: sender) ----
// This is an explicit allowlist - a match against one of these exact phrases
// is always shown, regardless of length or casing, because each one is a
// specific, curated, low-ambiguity name rather than a generic pattern that
// could coincidentally match OCR noise. Short official abbreviations like
// "DWP" only belong here if they are added deliberately, not because a
// generic pattern happened to match them.
const KNOWN_SENDER_PHRASES = ["ELMS Legal", "DWP", "Universal Credit", "HMRC"];
// Title Case phrase ending in "Legal" (e.g. "ELMS Legal", "Acme Legal") -
// generic fallback for legal-firm-shaped senders not in the known list above.
const LEGAL_FIRM_PATTERN = /\b(?:[A-Z][a-zA-Z&]*\s){0,2}[A-Z][a-zA-Z&]*\sLegal\b/g;
// "<Place> Council" / "<Place> Borough Council" etc.
const COUNCIL_PATTERN = /\b[A-Z][a-zA-Z]+(?:\s(?:City|Borough|District|County))?\sCouncil\b/g;
// Generic "<Name> Ltd/Energy/Water/Bank" shaped company patterns, alongside
// the dedicated "Legal" and "Council" patterns above - covers common company
// suffixes the letter's sender or a related company might use.
const COMPANY_SUFFIX_PATTERN =
  /\b(?:[A-Z][a-zA-Z&]*\s){0,2}[A-Z][a-zA-Z&]*\s(?:Ltd|Energy|Water|Bank)\b/g;
const ENERGY_SUPPLIER_PHRASES = [
  "British Gas",
  "EDF Energy",
  "E.ON Next",
  "E.ON",
  "Octopus Energy",
  "Scottish Power",
  "OVO Energy",
  "Shell Energy",
  "Utilita",
  "Bulb Energy",
  "SSE",
];

// ---- Safety filter for generic (non-allowlisted) sender candidates ----
//
// Live mobile testing surfaced "Sender: sse" on a real letter - a stray
// lowercase "sse" fragment in OCR noise matched the "SSE" energy-supplier
// phrase above case-insensitively and got surfaced verbatim as if it were a
// confirmed sender name. A real sender printed on a letterhead is a
// capitalised name of reasonable length; a 2-3 character, all-lowercase
// fragment is far more likely to be OCR noise that happened to match a known
// phrase or pattern. This filter only ever applies to the *generic* passes
// below (legal-firm pattern, council pattern, energy-supplier list, company
// suffix pattern) - the explicit KNOWN_SENDER_PHRASES allowlist above is
// always trusted as-is, which is exactly how "DWP" and "HMRC" keep showing
// despite being short.
const MIN_GENERIC_SENDER_LENGTH = 4;

const isSafeGenericSenderCandidate = (value: string): boolean => {
  const trimmed = value.trim();

  if (trimmed.length < MIN_GENERIC_SENDER_LENGTH) {
    return false;
  }

  // Reject a match with no uppercase letter at all - a genuine printed
  // sender name is essentially always capitalised, so an all-lowercase
  // match is far more likely to be a coincidental OCR-noise fragment.
  if (!/[A-Z]/.test(trimmed)) {
    return false;
  }

  return true;
};

// ---- Debt collection / enforcement wording (kind: risk_wording) ----
const RISK_WORDING_PHRASES = [
  "debt collection",
  "debt collector",
  "enforcement agent",
  "enforcement agency",
  "bailiff",
  "recovery agent",
  "instructed to recover",
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Finds every case-insensitive occurrence of `phrase` in `text`, returning the
// text as it was actually written in the source (preserving original
// casing), so the card always shows exactly what the letter said. Spaces in
// `phrase` match any run of whitespace in `text` (including a line break),
// because OCR output routinely wraps a multi-word phrase like "Civil
// National Business Centre" across two lines - the phrase is still the same
// wording, so it should still be found. The matched value's whitespace is
// collapsed to single spaces so a wrapped match still displays as one tidy
// line on the card.
const findPhraseOccurrences = (text: string, phrase: string): string[] => {
  const pattern = new RegExp(escapeRegExp(phrase).replace(/ /g, "\\s+"), "gi");
  return Array.from(text.matchAll(pattern)).map((match) => match[0].replace(/\s+/g, " ").trim());
};

const findPatternOccurrences = (text: string, pattern: RegExp): string[] => {
  const withGlobal = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  return Array.from(text.matchAll(withGlobal)).map((match) => match[0]);
};

// Pure - the whole extraction is a sequence of independent, additive regex
// passes over the same input text. No pass depends on another pass's
// result, so a change to one rule cannot silently break a different rule.
export const extractOcrKeyDetails = (text: string): OcrKeyDetails => {
  const details: OcrKeyDetail[] = [];
  const warnings: string[] = [];

  if (!text || !text.trim()) {
    return { details, warnings };
  }

  const addDetail = (
    label: string,
    value: string,
    kind: OcrKeyDetailKind,
    caution: string,
  ) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }
    const alreadyPresent = details.some(
      (existing) => existing.kind === kind && existing.value.toLowerCase() === trimmedValue.toLowerCase(),
    );
    if (!alreadyPresent) {
      details.push({ label, value: trimmedValue, kind, caution });
    }
  };

  // Amounts
  for (const match of findPatternOccurrences(text, AMOUNT_PATTERN)) {
    addDetail("Amount mentioned", match.replace(/\s+/g, " ").trim(), "amount", AMOUNT_CAUTION);
  }

  // Dates
  for (const match of findPatternOccurrences(text, NUMERIC_DATE_PATTERN)) {
    if (isPlausibleNumericDate(match)) {
      addDetail("Date mentioned", match, "date", DATE_CAUTION);
    }
  }
  for (const match of findPatternOccurrences(text, WORD_DATE_PATTERN)) {
    if (isPlausibleWordDate(match)) {
      addDetail("Date mentioned", match, "date", DATE_CAUTION);
    }
  }

  // Phone numbers - clustered first so identical numbers collapse and
  // near-match OCR variants (e.g. "01529 406096" / "01529 406086" /
  // "01529 406996") fold into a single detail rather than showing as three
  // separate, equally-confident phone numbers.
  const rawPhoneMatches = findPatternOccurrences(text, PHONE_PATTERN).filter(isLikelyUkPhoneNumber);
  for (const cluster of clusterPhoneMatches(rawPhoneMatches)) {
    addDetail("Phone number found", cluster.primary, "phone", buildPhoneCaution(cluster.variants));
  }

  // Reference / claim numbers - standalone code-shaped tokens anywhere...
  for (const match of findPatternOccurrences(text, CODE_TOKEN_PATTERN)) {
    addDetail("Reference found", match, "reference", REFERENCE_CAUTION);
  }
  for (const match of text.matchAll(COMPANY_NUMBER_PATTERN)) {
    const companyNumber = match[1];
    if (companyNumber) {
      addDetail("Reference found", companyNumber, "reference", REFERENCE_CAUTION);
    }
  }
  // ...plus a keyword-adjacent pass over each line, in case a valid code
  // shorter/longer than the standalone heuristic sits right next to a label.
  for (const line of text.split("\n")) {
    if (REFERENCE_KEYWORD_PATTERN.test(line)) {
      for (const match of findPatternOccurrences(line, CODE_TOKEN_PATTERN)) {
        addDetail("Reference found", match, "reference", REFERENCE_CAUTION);
      }
    }
  }

  // Court / proceedings wording
  for (const phrase of COURT_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Proceedings wording found", match, "court_or_claim", COURT_OR_CLAIM_CAUTION);
    }
  }
  for (const pattern of COURT_WORD_PATTERNS) {
    for (const match of findPatternOccurrences(text, pattern)) {
      addDetail("Proceedings wording found", match, "court_or_claim", COURT_OR_CLAIM_CAUTION);
    }
  }

  // Deadline-style wording (separate from calendar dates)
  for (const phrase of DEADLINE_WORDING_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Deadline-style wording found", match, "deadline_wording", DEADLINE_WORDING_CAUTION);
    }
  }
  for (const pattern of DEADLINE_WORDING_PATTERNS) {
    for (const match of findPatternOccurrences(text, pattern)) {
      addDetail("Deadline-style wording found", match, "deadline_wording", DEADLINE_WORDING_CAUTION);
    }
  }

  // Parking wording (specific first, so the generic "parking" mention is
  // only added when nothing more specific was already found)
  let foundSpecificParkingWording = false;
  for (const phrase of PARKING_SPECIFIC_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Possible document type", match, "document_type_hint", DOCUMENT_TYPE_HINT_CAUTION);
      foundSpecificParkingWording = true;
    }
  }
  if (!foundSpecificParkingWording) {
    const genericMatches = findPhraseOccurrences(text, PARKING_GENERIC_PHRASE);
    if (genericMatches.length > 0) {
      addDetail(
        "Possible document type",
        "Parking-related wording found",
        "document_type_hint",
        DOCUMENT_TYPE_HINT_CAUTION,
      );
    }
  }

  // Companies (known client/company names distinct from the letter's sender)
  // - a curated allowlist, so no length/case filter applies here either.
  for (const phrase of KNOWN_COMPANY_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Sender/company found", match, "company", COMPANY_CAUTION);
    }
  }

  // Senders - the known-phrase allowlist is always trusted; every other,
  // more generic pattern below is filtered through isSafeGenericSenderCandidate
  // so a short or all-lowercase coincidental match (e.g. a stray "sse"
  // fragment) is not surfaced as if it were a real sender.
  for (const phrase of KNOWN_SENDER_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Sender/company found", match, "sender", SENDER_CAUTION);
    }
  }
  for (const match of findPatternOccurrences(text, LEGAL_FIRM_PATTERN)) {
    if (isSafeGenericSenderCandidate(match)) {
      addDetail("Sender/company found", match, "sender", SENDER_CAUTION);
    }
  }
  for (const match of findPatternOccurrences(text, COUNCIL_PATTERN)) {
    if (isSafeGenericSenderCandidate(match)) {
      addDetail("Sender/company found", match, "sender", SENDER_CAUTION);
    }
  }
  for (const match of findPatternOccurrences(text, COMPANY_SUFFIX_PATTERN)) {
    if (isSafeGenericSenderCandidate(match)) {
      addDetail("Sender/company found", match, "sender", SENDER_CAUTION);
    }
  }
  for (const phrase of ENERGY_SUPPLIER_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      if (isSafeGenericSenderCandidate(match)) {
        addDetail("Sender/company found", match, "sender", SENDER_CAUTION);
      }
    }
  }

  // Debt collection / enforcement wording
  for (const phrase of RISK_WORDING_PHRASES) {
    for (const match of findPhraseOccurrences(text, phrase)) {
      addDetail("Risk wording found", match, "risk_wording", RISK_WORDING_CAUTION);
    }
  }

  return { details, warnings };
};

// ---- Grouped card layout ----
//
// The "Key details found" card used to render every detail as one long flat
// list, which live mobile testing showed was hard to scan on a small screen.
// This groups the same details into named sections instead - purely a
// display re-shaping of extractOcrKeyDetails' output, so it stays a pure
// function of an existing detail list rather than a second extraction pass.
// Only groups that actually have at least one detail are returned, in a
// fixed, sensible reading order (money and dates first, sender/company and
// risk wording last).
const OCR_KEY_DETAIL_GROUP_ORDER: { heading: string; kinds: OcrKeyDetailKind[] }[] = [
  { heading: "Money mentioned", kinds: ["amount"] },
  { heading: "Dates mentioned", kinds: ["date"] },
  { heading: "References / claim numbers", kinds: ["reference"] },
  { heading: "Court or proceedings wording", kinds: ["court_or_claim", "deadline_wording"] },
  { heading: "Document hints", kinds: ["document_type_hint"] },
  { heading: "Contacts", kinds: ["phone", "email"] },
  { heading: "Sender / companies", kinds: ["sender", "company"] },
  { heading: "Risk wording", kinds: ["risk_wording"] },
];

export const groupOcrKeyDetails = (details: OcrKeyDetail[]): OcrKeyDetailGroup[] =>
  OCR_KEY_DETAIL_GROUP_ORDER.map(({ heading, kinds }) => ({
    heading,
    details: details.filter((detail) => kinds.includes(detail.kind)),
  })).filter((group) => group.details.length > 0);

export type OcrKeyDetailVisibilityOptions = {
  isOcrUnreliable: boolean;
  hasUserEditedText: boolean;
};

export const getVisibleOcrKeyDetails = (
  details: OcrKeyDetail[],
  { isOcrUnreliable, hasUserEditedText }: OcrKeyDetailVisibilityOptions,
): OcrKeyDetail[] => {
  if (isOcrUnreliable && !hasUserEditedText) {
    return [];
  }

  return details;
};

// ---- OCR text cleanup (conservative, line-based) ----
//
// Only ever removes a line if it looks like barcode/QR/logo noise AND does
// not contain anything protected (money, dates, reference/claim/court
// wording, a phone number). When in doubt, the line stays - this is meant to
// tidy the review textarea, not to silently delete something a user might
// need. Deterministic: the same text always cleans the same way, no
// AI/model involved.
const PROTECTED_LINE_PATTERN = new RegExp(
  [
    "£",
    "\\d{1,2}/\\d{1,2}/\\d{2,4}",
    `\\b\\d{1,2}\\s+(?:${MONTH_NAMES})\\s+\\d{4}\\b`,
    "reference",
    "claim",
    "account",
    "notice",
    "\\bpcn\\b",
    "court",
    "council",
    "legal",
    "proceedings",
    "tribunal",
    "\\bhmrc\\b",
    "\\bdwp\\b",
    "ombudsman",
    "\\b0\\d{2,4}[\\s-]?\\d{5,7}\\b",
  ].join("|"),
  "i",
);

// A line is only ever treated as likely gibberish (barcode/QR misreads,
// stray logo fragments) if it is short-to-medium length and either mostly
// symbols, or one long unspaced token with very few real letters in it -
// both patterns are common Tesseract output for a scanned barcode, and both
// are unlikely to ever appear in a genuine sentence, name, or address line.
const isLikelyGibberishLine = (line: string): boolean => {
  const trimmed = line.trim();

  if (trimmed.length === 0 || trimmed.length > 60) {
    return false;
  }

  const alnumCount = (trimmed.match(/[a-zA-Z0-9]/g) ?? []).length;
  const symbolRatio = (trimmed.length - alnumCount) / trimmed.length;
  const letterCount = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  const letterRatio = letterCount / trimmed.length;
  const hasNoSpaces = !/\s/.test(trimmed);

  const isSymbolHeavy = symbolRatio > 0.4;
  const isLongUnspacedLowLetterToken = hasNoSpaces && trimmed.length > 12 && letterRatio < 0.2;

  return isSymbolHeavy || isLongUnspacedLowLetterToken;
};

export const cleanOcrTextForReview = (text: string): string => {
  if (!text) {
    return text;
  }

  const cleanedLines = text
    .split("\n")
    .filter((line) => PROTECTED_LINE_PATTERN.test(line) || !isLikelyGibberishLine(line))
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd());

  return cleanedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};
