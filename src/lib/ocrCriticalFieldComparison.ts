import { extractGroundedAmounts } from "./currencyGrounding";
import { extractOcrKeyDetails } from "./ocrKeyDetails";

export type OcrCriticalFieldKind =
  | "date"
  | "gbp_amount"
  | "reference"
  | "sender_company";

export type OcrCriticalFieldCandidate = {
  readonly id: string;
  readonly source: string;
  readonly text: string;
  readonly confidence?: number;
  readonly provenance?: {
    readonly sourceDocumentId: string;
    readonly sourceSegmentId?: string;
  };
};

export type OcrCriticalFieldCandidateValues = Pick<
  OcrCriticalFieldCandidate,
  "id" | "source" | "confidence" | "provenance"
> & {
  readonly values: readonly string[];
};

export type OcrCriticalFieldStatus =
  | "not_found"
  | "agreement"
  | "incomplete"
  | "ambiguous"
  | "conflict";

export type OcrCriticalFieldComparison = {
  readonly field: OcrCriticalFieldKind;
  readonly status: OcrCriticalFieldStatus;
  readonly agreedValues: readonly string[];
  readonly candidates: readonly OcrCriticalFieldCandidateValues[];
};

export type OcrCriticalFieldIssueReason =
  | "missing"
  | "ambiguous_overlap"
  | "disagreement";

export type OcrCriticalFieldIssue = {
  readonly field: OcrCriticalFieldKind;
  readonly reason: OcrCriticalFieldIssueReason;
  readonly candidates: readonly OcrCriticalFieldCandidateValues[];
};

export type OcrCriticalFieldComparisonResult = {
  readonly status: "not_compared" | "agreement" | "review_required";
  readonly reviewRequired: boolean;
  readonly hasConflict: boolean;
  readonly fields: readonly OcrCriticalFieldComparison[];
  readonly issues: readonly OcrCriticalFieldIssue[];
};

const FIELD_ORDER: readonly OcrCriticalFieldKind[] = [
  "date",
  "gbp_amount",
  "reference",
  "sender_company",
];

const MONTHS = new Map<string, number>([
  ["jan", 1],
  ["january", 1],
  ["feb", 2],
  ["february", 2],
  ["mar", 3],
  ["march", 3],
  ["apr", 4],
  ["april", 4],
  ["may", 5],
  ["jun", 6],
  ["june", 6],
  ["jul", 7],
  ["july", 7],
  ["aug", 8],
  ["august", 8],
  ["sep", 9],
  ["sept", 9],
  ["september", 9],
  ["oct", 10],
  ["october", 10],
  ["nov", 11],
  ["november", 11],
  ["dec", 12],
  ["december", 12],
]);

const MONTH_SOURCE =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const WORD_DATE_PATTERN = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_SOURCE})\\s+(\\d{4})\\b`, "gi");
const MONTH_FIRST_DATE_PATTERN = new RegExp(`\\b(${MONTH_SOURCE})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "gi");
const NUMERIC_DATE_PATTERN = /\b(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/g;
const ISO_DATE_PATTERN = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

const pad = (value: number): string => String(value).padStart(2, "0");

const isValidDate = (day: number, month: number, year: number): boolean => {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= new Date(year, month, 0).getDate();
};

const normalizedDate = (day: number, month: number, year: number): string | undefined =>
  isValidDate(day, month, year) ? `${year}-${pad(month)}-${pad(day)}` : undefined;

const extractNormalizedDates = (text: string): string[] => {
  const values = new Set<string>();

  for (const match of text.matchAll(WORD_DATE_PATTERN)) {
    const month = MONTHS.get(match[2].toLowerCase());
    const value = month ? normalizedDate(Number(match[1]), month, Number(match[3])) : undefined;
    if (value) values.add(value);
  }

  for (const match of text.matchAll(MONTH_FIRST_DATE_PATTERN)) {
    const month = MONTHS.get(match[1].toLowerCase());
    const value = month ? normalizedDate(Number(match[2]), month, Number(match[3])) : undefined;
    if (value) values.add(value);
  }

  for (const match of text.matchAll(ISO_DATE_PATTERN)) {
    const value = normalizedDate(Number(match[3]), Number(match[2]), Number(match[1]));
    if (value) values.add(value);
  }

  for (const match of text.matchAll(NUMERIC_DATE_PATTERN)) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const yearText = match[3];
    const year = Number(yearText);

    if (yearText.length === 4 && day > 12) {
      const value = normalizedDate(day, month, year);
      if (value) values.add(value);
    } else if (isValidDate(day, month, yearText.length === 2 ? 2000 + year : year)) {
      // A numeric date whose day and month could be swapped is kept distinct
      // rather than silently assuming a locale. Identical ambiguous strings
      // can still agree with one another, but they cannot masquerade as an
      // unambiguous word date.
      values.add(`ambiguous:${pad(day)}/${pad(month)}/${yearText}`);
    }
  }

  return [...values].sort();
};

const GBP_SUFFIX_PATTERN = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*GBP\b/gi;

const extractNormalizedGbpAmounts = (text: string): string[] => {
  const values = new Set(
    extractGroundedAmounts(text).map(({ amount }) => amount.toFixed(2)),
  );

  for (const match of text.matchAll(GBP_SUFFIX_PATTERN)) {
    const amount = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(amount)) values.add(amount.toFixed(2));
  }

  return [...values].sort((first, second) => Number(first) - Number(second));
};

const REFERENCE_LABEL_PATTERN =
  /\b(?:account(?:\s+(?:reference|number|no\.?))?|reference|ref\.?|claim(?:\s+(?:reference|number|no\.?))?|case(?:\s+(?:reference|number|no\.?))?|notice(?:\s+(?:reference|number|no\.?))?|pcn)\b\s*(?::|#|-)?\s*/gi;
const LABELLED_REFERENCE_VALUE_PATTERN = /^([A-Z0-9]{2,14}(?:[ -][A-Z0-9]{2,14}){0,2})\b/;
const SEPARATED_REFERENCE_PATTERN = /\b[A-Z]{1,8}(?:-|\s)\d{3,14}\b/g;
const RESERVED_REFERENCE_PREFIXES = new Set([
  "GBP",
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "SEPT",
  "OCT",
  "NOV",
  "DEC",
]);

const normalizeReference = (
  value: string,
  allowDigitsOnly = false,
): string | undefined => {
  const normalized = value.toUpperCase().replace(/[\s-]+/g, "").replace(/[.,;:]+$/g, "");
  const prefix = normalized.match(/^[A-Z]+/)?.[0];

  if (prefix && RESERVED_REFERENCE_PREFIXES.has(prefix)) return undefined;
  if (/[A-Z]/.test(normalized) && /\d/.test(normalized)) return normalized;
  return allowDigitsOnly && /^\d{6,20}$/.test(normalized) ? normalized : undefined;
};

const extractNormalizedReferences = (text: string): string[] => {
  const values = new Set<string>();

  for (const detail of extractOcrKeyDetails(text).details) {
    if (detail.kind !== "reference") continue;
    const normalized = normalizeReference(detail.value, true);
    if (normalized) values.add(normalized);
  }

  for (const match of text.matchAll(SEPARATED_REFERENCE_PATTERN)) {
    const normalized = normalizeReference(match[0]);
    if (normalized) values.add(normalized);
  }

  for (const label of text.matchAll(REFERENCE_LABEL_PATTERN)) {
    const tail = text.slice((label.index ?? 0) + label[0].length);
    const value = tail.match(LABELLED_REFERENCE_VALUE_PATTERN)?.[1];
    if (!value) continue;
    const normalized = normalizeReference(value, true);
    if (normalized) values.add(normalized);
  }

  return [...values].sort();
};

const normalizeOrganisation = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(?:ltd|limited)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const extractNormalizedSenderCompanies = (text: string): string[] =>
  [...new Set(
    extractOcrKeyDetails(text).details
      .filter(({ kind }) => kind === "sender" || kind === "company")
      .map(({ value }) => normalizeOrganisation(value))
      .filter(Boolean),
  )].sort();

const extractValues = (
  candidate: OcrCriticalFieldCandidate,
  field: OcrCriticalFieldKind,
): string[] => {
  if (field === "date") return extractNormalizedDates(candidate.text);
  if (field === "gbp_amount") return extractNormalizedGbpAmounts(candidate.text);
  if (field === "reference") return extractNormalizedReferences(candidate.text);
  return extractNormalizedSenderCompanies(candidate.text);
};

const sameSet = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

const intersection = (sets: readonly (readonly string[])[]): string[] => {
  const [first, ...rest] = sets;
  return first?.filter((value) => rest.every((set) => set.includes(value))) ?? [];
};

const candidateValues = (
  candidate: OcrCriticalFieldCandidate,
  values: readonly string[],
): OcrCriticalFieldCandidateValues => ({
  id: candidate.id,
  source: candidate.source,
  ...(candidate.confidence === undefined ? {} : { confidence: candidate.confidence }),
  ...(candidate.provenance === undefined ? {} : { provenance: candidate.provenance }),
  values,
});

const compareField = (
  field: OcrCriticalFieldKind,
  candidates: readonly OcrCriticalFieldCandidate[],
): OcrCriticalFieldComparison => {
  const comparedCandidates = candidates.map((candidate) =>
    candidateValues(candidate, extractValues(candidate, field)),
  );
  const valueSets = comparedCandidates.map(({ values }) => values);
  const populatedSets = valueSets.filter((values) => values.length > 0);

  if (populatedSets.length === 0) {
    return { field, status: "not_found", agreedValues: [], candidates: comparedCandidates };
  }

  if (populatedSets.length !== valueSets.length) {
    return { field, status: "incomplete", agreedValues: [], candidates: comparedCandidates };
  }

  if (
    field === "date" &&
    valueSets.some((values) => values.some((value) => value.startsWith("ambiguous:")))
  ) {
    return {
      field,
      status: "ambiguous",
      agreedValues: intersection(valueSets),
      candidates: comparedCandidates,
    };
  }

  if (valueSets.every((values) => sameSet(values, valueSets[0]))) {
    return { field, status: "agreement", agreedValues: valueSets[0], candidates: comparedCandidates };
  }

  const sharedValues = intersection(valueSets);
  return {
    field,
    status: sharedValues.length > 0 ? "ambiguous" : "conflict",
    agreedValues: sharedValues,
    candidates: comparedCandidates,
  };
};

export const compareOcrCriticalFields = (
  candidates: readonly OcrCriticalFieldCandidate[],
): OcrCriticalFieldComparisonResult => {
  if (candidates.length < 2) {
    return {
      status: "not_compared",
      reviewRequired: false,
      hasConflict: false,
      fields: [],
      issues: [],
    };
  }

  const fields = FIELD_ORDER.map((field) => compareField(field, candidates));
  if (fields.every(({ status }) => status === "not_found")) {
    return {
      status: "not_compared",
      reviewRequired: false,
      hasConflict: false,
      fields,
      issues: [],
    };
  }
  const issues: OcrCriticalFieldIssue[] = fields.flatMap((field) => {
    const reason: OcrCriticalFieldIssueReason | undefined =
      field.status === "incomplete"
        ? "missing"
        : field.status === "ambiguous"
          ? "ambiguous_overlap"
          : field.status === "conflict"
            ? "disagreement"
            : undefined;
    return reason ? [{ field: field.field, reason, candidates: field.candidates }] : [];
  });
  const reviewRequired = issues.length > 0;

  return {
    status: reviewRequired ? "review_required" : "agreement",
    reviewRequired,
    hasConflict: issues.some(({ reason }) => reason === "disagreement"),
    fields,
    issues,
  };
};
