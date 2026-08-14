import {
  validateSourceProvenance,
  type SourceDocument,
  type SourceProvenance,
  type SourceProvenanceFailureReason,
  type SourceReviewState,
} from "./sourceProvenance";

export const CARE_FEE_CONCEPTS = [
  "total_care_home_fee",
  "resident_contribution",
  "local_authority_contribution",
  "nhs_contribution",
  "third_party_top_up",
  "one_off_adjustment",
  "retrospective_adjustment",
  "other_unknown_amount",
] as const;

export type CareFeeConcept = (typeof CARE_FEE_CONCEPTS)[number];

export const CLAIM_CADENCES = [
  "weekly",
  "four_weekly",
  "monthly",
  "invoice_period_total",
  "one_off",
  "unknown",
] as const;

export type ClaimCadence = (typeof CLAIM_CADENCES)[number];

export const CARE_FEE_PARTY_ROLES = [
  "resident",
  "local_authority",
  "nhs",
  "third_party",
  "care_provider",
  "unknown",
] as const;

export type CareFeePartyRole = (typeof CARE_FEE_PARTY_ROLES)[number];
export type ClaimCurrency = "GBP" | "unknown";

export type FinancialClaimProvenance = SourceProvenance & {
  readonly claimId: string;
};

/**
 * A source-grounded decision input. This is not evidence presentation and does
 * not say that the amount is correct, payable, lawful, current, or owed.
 */
export type FinancialClaim = {
  readonly id: string;
  readonly subjectId: string | "unknown";
  readonly providerId: string | "unknown";
  readonly concept: CareFeeConcept;
  readonly amountMinor: number;
  readonly currency: ClaimCurrency;
  readonly cadence: ClaimCadence;
  readonly payerRole: CareFeePartyRole;
  readonly payeeRole: CareFeePartyRole;
  readonly documentDate?: string;
  readonly assessmentDate?: string;
  readonly effectiveDate?: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly provenance: FinancialClaimProvenance;
};

export type FinancialAmountRejectionReason =
  | "malformed_amount"
  | "negative_amount"
  | "excess_decimal_precision"
  | "unsupported_currency"
  | "ambiguous_currency"
  | "amount_out_of_range";

export type FinancialAmountNormalisation =
  | {
      readonly status: "normalised";
      readonly amountMinor: number;
      readonly currency: ClaimCurrency;
    }
  | {
      readonly status: "rejected";
      readonly reason: FinancialAmountRejectionReason;
    };

const POUND_TOKEN_SOURCE = String.raw`(?:Ãƒâ€šÃ‚Â£|Ã‚Â£|Â£|£|GBP)`;
const poundTokenPattern = new RegExp(POUND_TOKEN_SOURCE, "gi");
const unsupportedCurrencyPattern = /(?:\b(?:USD|EUR|CAD|AUD)\b|[$€])/i;

/** Parse an isolated source amount using string arithmetic, never pounds floats. */
export const normaliseFinancialAmount = (
  sourceValue: string,
): FinancialAmountNormalisation => {
  const value = sourceValue.trim();

  if (unsupportedCurrencyPattern.test(value)) {
    return { status: "rejected", reason: "unsupported_currency" };
  }

  const currencyTokens = value.match(poundTokenPattern) ?? [];
  if (currencyTokens.length > 1) {
    return { status: "rejected", reason: "ambiguous_currency" };
  }

  if (
    /^\s*-/.test(value) ||
    new RegExp(`${POUND_TOKEN_SOURCE}\\s*-`, "i").test(value)
  ) {
    return { status: "rejected", reason: "negative_amount" };
  }

  if (/\.\d{3,}\s*$/.test(value)) {
    return { status: "rejected", reason: "excess_decimal_precision" };
  }

  const match = value.match(
    new RegExp(`^(?:${POUND_TOKEN_SOURCE}\\s*)?(\\d+(?:,\\d{3})*)(?:\\.(\\d{1,2}))?$`, "i"),
  );

  if (!match) {
    return { status: "rejected", reason: "malformed_amount" };
  }

  const pounds = BigInt(match[1].replace(/,/g, ""));
  const pence = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const amountMinor = pounds * 100n + pence;

  if (amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { status: "rejected", reason: "amount_out_of_range" };
  }

  return {
    status: "normalised",
    amountMinor: Number(amountMinor),
    currency: currencyTokens.length === 1 ? "GBP" : "unknown",
  };
};

export const normaliseClaimCadence = (sourceText: string): ClaimCadence => {
  const matched = new Set<ClaimCadence>();
  const fourWeeklyPattern = /\b(?:four[-\s]?weekly|every\s+four\s+weeks?|per\s+four\s+weeks?|4[-\s]?weekly)\b/gi;
  const withoutFourWeekly = sourceText.replace(fourWeeklyPattern, " ");

  if (/\b(?:per\s+week|weekly|\/\s*week)\b/i.test(withoutFourWeekly)) {
    matched.add("weekly");
  }
  if (fourWeeklyPattern.test(sourceText)) {
    matched.add("four_weekly");
  }
  if (/\b(?:per\s+month|monthly|\/\s*month)\b/i.test(sourceText)) {
    matched.add("monthly");
  }
  if (/\b(?:invoice\s+period\s+total|total\s+for\s+the\s+invoice\s+period|invoice\s+total)\b/i.test(sourceText)) {
    matched.add("invoice_period_total");
  }
  if (/\b(?:one[-\s]?off|single\s+charge)\b/i.test(sourceText)) {
    matched.add("one_off");
  }

  return matched.size === 1 ? [...matched][0] : "unknown";
};

const conceptsOf = (sourceText: string): CareFeeConcept[] => {
  const matched = new Set<CareFeeConcept>();

  if (/\bthird[-\s]?party\s+(?:top[-\s]?up|contribution)\b/i.test(sourceText)) {
    matched.add("third_party_top_up");
  }
  if (/\b(?:local\s+authority|council)\s+contribution\b/i.test(sourceText)) {
    matched.add("local_authority_contribution");
  }
  if (/\bNHS\s+contribution\b/i.test(sourceText)) {
    matched.add("nhs_contribution");
  }
  if (/\bresident(?:'s)?\s+contribution\b/i.test(sourceText)) {
    matched.add("resident_contribution");
  }
  if (/\b(?:total\s+(?:weekly\s+)?care[-\s]?home\s+fee|care[-\s]?home\s+fee\s+total)\b/i.test(sourceText)) {
    matched.add("total_care_home_fee");
  }
  if (/\bone[-\s]?off\s+adjustment\b/i.test(sourceText)) {
    matched.add("one_off_adjustment");
  }
  if (/\bretrospective\s+adjustment\b/i.test(sourceText)) {
    matched.add("retrospective_adjustment");
  }

  if (matched.size > 0) {
    return [...matched];
  }

  return /\b(?:contribution|financial\s+amount|amount|fee|charge|adjustment)\b/i.test(sourceText)
    ? ["other_unknown_amount"]
    : [];
};

const payerRoleForConcept = (concept: CareFeeConcept): CareFeePartyRole => {
  switch (concept) {
    case "resident_contribution":
      return "resident";
    case "local_authority_contribution":
      return "local_authority";
    case "nhs_contribution":
      return "nhs";
    case "third_party_top_up":
      return "third_party";
    default:
      return "unknown";
  }
};

const explicitRoleAfter = (
  sourceText: string,
  prefix: RegExp,
): CareFeePartyRole | undefined => {
  const suffix = sourceText.match(prefix)?.[1]?.toLowerCase();
  if (!suffix) return undefined;
  if (/^resident\b/.test(suffix)) return "resident";
  if (/^(?:local authority|council)\b/.test(suffix)) return "local_authority";
  if (/^nhs\b/.test(suffix)) return "nhs";
  if (/^third party\b/.test(suffix)) return "third_party";
  if (/^(?:care provider|care home)\b/.test(suffix)) return "care_provider";
  return undefined;
};

const payerRoleOf = (
  sourceText: string,
  concept: CareFeeConcept,
): CareFeePartyRole =>
  explicitRoleAfter(
    sourceText,
    /\b(?:paid\s+by|payer\s*:)\s*((?:local authority|council|resident|nhs|third party|care provider|care home)\b)/i,
  ) ?? payerRoleForConcept(concept);

const payeeRoleOf = (sourceText: string): CareFeePartyRole =>
  explicitRoleAfter(
    sourceText,
    /\b(?:payable\s+to|paid\s+to|payee\s*:)\s*((?:local authority|council|resident|nhs|third party|care provider|care home)\b)/i,
  ) ?? "unknown";

const MONTHS: Readonly<Record<string, number>> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const isoDateOf = (year: number, month: number, day: number): string | undefined => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const normaliseSourceDate = (sourceDate: string): string | undefined => {
  const value = sourceDate.trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isoDateOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const named = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    return month === undefined
      ? undefined
      : isoDateOf(Number(named[3]), month, Number(named[1]));
  }

  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    if (day <= 12 && month <= 12) return undefined;
    return isoDateOf(Number(slash[3]), month, day);
  }

  return undefined;
};

const DATE_SOURCE = String.raw`(?:\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})`;

const dateAfter = (sourceText: string, labelSource: string): string | undefined => {
  const raw = sourceText.match(
    new RegExp(`\\b(?:${labelSource})\\s*:?\\s*(${DATE_SOURCE})`, "i"),
  )?.[1];
  return raw ? normaliseSourceDate(raw) : undefined;
};

const datesOf = (sourceText: string): Pick<
  FinancialClaim,
  "documentDate" | "assessmentDate" | "effectiveDate" | "periodStart" | "periodEnd"
> => {
  const documentDate = dateAfter(sourceText, "document date|date issued|issued(?: on)?");
  const assessmentDate = dateAfter(sourceText, "assessment date|assessed(?: on)?");
  const effectiveDate = dateAfter(sourceText, "effective(?: from| date)?");
  const period = sourceText.match(
    new RegExp(`\\b(?:invoice\\s+period|fee\\s+period|period)\\s*(?:from|:)?\\s*(${DATE_SOURCE})\\s*(?:to|until|[-–—])\\s*(${DATE_SOURCE})`, "i"),
  );
  const periodStart = period?.[1]
    ? normaliseSourceDate(period[1])
    : dateAfter(
        sourceText,
        "(?:invoice\\s+period|fee\\s+period|period)\\s+(?:start|from)",
      );
  const periodEnd = period?.[2]
    ? normaliseSourceDate(period[2])
    : dateAfter(
        sourceText,
        "(?:invoice\\s+period|fee\\s+period|period)\\s+(?:end|to|until)",
      );

  return {
    ...(documentDate ? { documentDate } : {}),
    ...(assessmentDate ? { assessmentDate } : {}),
    ...(effectiveDate ? { effectiveDate } : {}),
    ...(periodStart ? { periodStart } : {}),
    ...(periodEnd ? { periodEnd } : {}),
  };
};

export type FinancialClaimValidationFailureReason =
  | "malformed_claim"
  | "invalid_claim_id"
  | "invalid_subject_id"
  | "invalid_provider_id"
  | "invalid_concept"
  | "invalid_amount"
  | "invalid_currency"
  | "invalid_cadence"
  | "invalid_party_role"
  | "invalid_date"
  | "invalid_period"
  | "invalid_provenance"
  | "provenance_claim_id_mismatch"
  | SourceProvenanceFailureReason;

export type FinancialClaimValidation =
  | { readonly valid: true; readonly claim: FinancialClaim }
  | { readonly valid: false; readonly reason: FinancialClaimValidationFailureReason };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const conceptSet = new Set<string>(CARE_FEE_CONCEPTS);
const cadenceSet = new Set<string>(CLAIM_CADENCES);
const roleSet = new Set<string>(CARE_FEE_PARTY_ROLES);
const currencySet = new Set<string>(["GBP", "unknown"]);
const reviewStateSet = new Set<SourceReviewState>([
  "confirmed",
  "review_required",
  "unavailable",
]);

const isValidIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return Boolean(
    match &&
    isoDateOf(Number(match[1]), Number(match[2]), Number(match[3])) === value,
  );
};

const invalidOptionalDate = (value: unknown): boolean =>
  value !== undefined && !isValidIsoDate(value);

export const validateFinancialClaim = (
  value: unknown,
  documents: readonly SourceDocument[],
): FinancialClaimValidation => {
  if (!isRecord(value)) return { valid: false, reason: "malformed_claim" };
  if (!isNonEmptyString(value.id)) return { valid: false, reason: "invalid_claim_id" };
  if (!isNonEmptyString(value.subjectId)) return { valid: false, reason: "invalid_subject_id" };
  if (!isNonEmptyString(value.providerId)) return { valid: false, reason: "invalid_provider_id" };
  if (!conceptSet.has(value.concept as string)) return { valid: false, reason: "invalid_concept" };
  if (
    typeof value.amountMinor !== "number" ||
    !Number.isSafeInteger(value.amountMinor) ||
    value.amountMinor < 0
  ) {
    return { valid: false, reason: "invalid_amount" };
  }
  if (!currencySet.has(value.currency as string)) return { valid: false, reason: "invalid_currency" };
  if (!cadenceSet.has(value.cadence as string)) return { valid: false, reason: "invalid_cadence" };
  if (!roleSet.has(value.payerRole as string) || !roleSet.has(value.payeeRole as string)) {
    return { valid: false, reason: "invalid_party_role" };
  }
  if (
    invalidOptionalDate(value.documentDate) ||
    invalidOptionalDate(value.assessmentDate) ||
    invalidOptionalDate(value.effectiveDate) ||
    invalidOptionalDate(value.periodStart) ||
    invalidOptionalDate(value.periodEnd)
  ) {
    return { valid: false, reason: "invalid_date" };
  }
  if (
    typeof value.periodStart === "string" &&
    typeof value.periodEnd === "string" &&
    value.periodStart > value.periodEnd
  ) {
    return { valid: false, reason: "invalid_period" };
  }

  if (!isRecord(value.provenance)) {
    return { valid: false, reason: "invalid_provenance" };
  }

  const provenance = value.provenance;
  if (
    !isNonEmptyString(provenance.claimId) ||
    !isNonEmptyString(provenance.sourceDocumentId) ||
    (provenance.sourceSegmentId !== undefined && !isNonEmptyString(provenance.sourceSegmentId)) ||
    typeof provenance.sourceQuote !== "string" ||
    !reviewStateSet.has(provenance.reviewState as SourceReviewState) ||
    (provenance.extractionConfidence !== undefined &&
      (typeof provenance.extractionConfidence !== "number" ||
        !Number.isFinite(provenance.extractionConfidence) ||
        provenance.extractionConfidence < 0 ||
        provenance.extractionConfidence > 100))
  ) {
    return { valid: false, reason: "invalid_provenance" };
  }

  if (value.id !== provenance.claimId) {
    return { valid: false, reason: "provenance_claim_id_mismatch" };
  }

  const sourceValidation = validateSourceProvenance(
    provenance as FinancialClaimProvenance,
    documents,
  );
  if (!sourceValidation.supported) {
    return { valid: false, reason: sourceValidation.reason };
  }

  return { valid: true, claim: value as FinancialClaim };
};

export type FinancialClaimExtractionRejectionReason =
  | "ambiguous_claim_pairing"
  | FinancialAmountRejectionReason
  | FinancialClaimValidationFailureReason;

export type FinancialClaimExtractionResult =
  | { readonly status: "trusted"; readonly claim: FinancialClaim }
  | {
      readonly status: "rejected";
      readonly candidateId: string;
      readonly sourceDocumentId: string;
      readonly sourceSegmentId?: string;
      readonly sourceQuote: string;
      readonly reason: FinancialClaimExtractionRejectionReason;
    };

const SUPPORTED_AMOUNT_TOKEN_SOURCE = String.raw`-?\s*(?:${POUND_TOKEN_SOURCE})\s*-?\s*\d[\d,]*(?:\.\d+)?`;
const UNSUPPORTED_AMOUNT_TOKEN_SOURCE = String.raw`(?:\b(?:USD|EUR|CAD|AUD)\b\s*|[$€]\s*)\d[\d,]*(?:\.\d+)?`;
const BARE_AMOUNT_AFTER_LABEL_SOURCE = String.raw`\b(?:contribution|fee|charge|adjustment|amount)\b\s*:\s*(-?\d+(?:,\d{3})*(?:\.\d+)?)(?=\s*(?:$|;|,|per\b|weekly\b|four[-\s]?weekly\b|monthly\b|every\s+four\s+weeks?\b|invoice\s+period\s+total\b|one[-\s]?off\b))`;

const amountCandidateCountOf = (sourceText: string): number =>
  (sourceText.match(new RegExp(SUPPORTED_AMOUNT_TOKEN_SOURCE, "gi")) ?? []).length +
  (sourceText.match(new RegExp(UNSUPPORTED_AMOUNT_TOKEN_SOURCE, "gi")) ?? []).length +
  (sourceText.match(new RegExp(BARE_AMOUNT_AFTER_LABEL_SOURCE, "gi")) ?? []).length;

const amountTokenOf = (sourceText: string): string | undefined => {
  const ambiguousPrefix = sourceText.match(
    new RegExp(`(?:${POUND_TOKEN_SOURCE})\\s+(?:${POUND_TOKEN_SOURCE})\\s*\\d[\\d,.]*`, "i"),
  )?.[0];
  if (ambiguousPrefix) return ambiguousPrefix;

  const unsupported = sourceText.match(/(?:\b(?:USD|EUR|CAD|AUD)\b\s*|[$€]\s*)\d[\d,.]*/i)?.[0];
  if (unsupported) return unsupported;

  const supported = sourceText.match(
    new RegExp(SUPPORTED_AMOUNT_TOKEN_SOURCE, "i"),
  )?.[0];
  if (supported) return supported.trim();

  return sourceText.match(new RegExp(BARE_AMOUNT_AFTER_LABEL_SOURCE, "i"))?.[1];
};

const passageId = (
  documentId: string,
  segmentId: string | undefined,
  passageOrder: number,
): string =>
  `financial-claim:${encodeURIComponent(documentId)}:${encodeURIComponent(segmentId ?? "document")}:${passageOrder}`;

const rejectedResult = (
  candidateId: string,
  document: SourceDocument,
  sourceSegmentId: string | undefined,
  sourceQuote: string,
  reason: FinancialClaimExtractionRejectionReason,
): FinancialClaimExtractionResult => ({
  status: "rejected",
  candidateId,
  sourceDocumentId: document.id,
  ...(sourceSegmentId ? { sourceSegmentId } : {}),
  sourceQuote,
  reason,
});

const passagesOf = (document: SourceDocument) => {
  const sources = document.segments.length > 0
    ? document.segments.map((segment) => ({ id: segment.id, text: segment.text }))
    : [{ id: undefined, text: document.extractedText }];

  return sources.flatMap((source) =>
    source.text
      .split(/\r?\n/)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text) => ({ sourceSegmentId: source.id, text })),
  );
};

/**
 * Narrow deterministic extraction for representative care-fee claim wording.
 * Results retain rejected candidates so review or malformed input never
 * disappears into a trusted-only array.
 */
export const extractFinancialClaimResults = (
  documents: readonly SourceDocument[],
): FinancialClaimExtractionResult[] => {
  const results: FinancialClaimExtractionResult[] = [];

  for (const document of documents) {
    const passages = passagesOf(document);

    passages.forEach(({ sourceSegmentId, text }, passageIndex) => {
      const concepts = conceptsOf(text);
      const amountCandidateCount = amountCandidateCountOf(text);
      const amountToken = amountTokenOf(text);
      if (concepts.length === 0 || amountCandidateCount === 0 || !amountToken) return;

      const id = passageId(document.id, sourceSegmentId, passageIndex + 1);
      if (concepts.length !== 1 || amountCandidateCount !== 1) {
        results.push(
          rejectedResult(
            id,
            document,
            sourceSegmentId,
            text,
            "ambiguous_claim_pairing",
          ),
        );
        return;
      }

      const concept = concepts[0];
      const amount = normaliseFinancialAmount(amountToken);
      if (amount.status === "rejected") {
        results.push(
          rejectedResult(id, document, sourceSegmentId, text, amount.reason),
        );
        return;
      }

      const claim: FinancialClaim = {
        id,
        subjectId: "unknown",
        providerId: "unknown",
        concept,
        amountMinor: amount.amountMinor,
        currency: amount.currency,
        cadence: normaliseClaimCadence(text),
        payerRole: payerRoleOf(text, concept),
        payeeRole: payeeRoleOf(text),
        ...datesOf(text),
        provenance: {
          claimId: id,
          sourceDocumentId: document.id,
          ...(sourceSegmentId ? { sourceSegmentId } : {}),
          sourceQuote: text,
          ...(document.confidence === undefined
            ? {}
            : { extractionConfidence: document.confidence }),
          reviewState: document.reviewState,
        },
      };

      const validation = validateFinancialClaim(claim, documents);
      results.push(
        validation.valid
          ? { status: "trusted", claim: validation.claim }
          : rejectedResult(id, document, sourceSegmentId, text, validation.reason),
      );
    });
  }

  return results;
};
