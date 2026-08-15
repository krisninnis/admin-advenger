import {
  validateFinancialClaim,
  type CareFeeConcept,
  type CareFeePartyRole,
  type ClaimCadence,
  type ClaimCurrency,
  type FinancialClaim,
  type FinancialClaimValidationFailureReason,
} from "./financialClaims";
import type { SourceDocument } from "./sourceProvenance";

export const COMPARABILITY_REASONS = [
  "invalid_claim",
  "source_review_required",
  "same_claim",
  "different_concept",
  "missing_concept_context",
  "recurring_vs_adjustment",
  "retrospective_adjustment",
  "missing_adjustment_context",
  "different_subject",
  "missing_subject_context",
  "different_provider",
  "missing_provider_context",
  "different_payer_role",
  "missing_payer_context",
  "different_payee_role",
  "missing_payee_context",
  "different_currency",
  "missing_currency_context",
  "different_cadence",
  "missing_cadence_context",
  "non_overlapping_periods",
  "different_effective_dates",
  "missing_period_context",
] as const;

export type ComparabilityReason = (typeof COMPARABILITY_REASONS)[number];

export type ComparableApplicability =
  | {
      readonly kind: "same_explicit_period";
      readonly periodStart: string;
      readonly periodEnd: string;
    }
  | {
      readonly kind: "overlapping_explicit_periods";
      readonly periodStart: string;
      readonly periodEnd: string;
    }
  | {
      readonly kind: "same_effective_date";
      readonly effectiveDate: string;
    };

export type ComparableDimensions = {
  readonly concept: Exclude<CareFeeConcept, "other_unknown_amount">;
  readonly subjectId: string;
  readonly providerId: string;
  readonly payerRole: Exclude<CareFeePartyRole, "unknown">;
  readonly payeeRole: Exclude<CareFeePartyRole, "unknown">;
  readonly currency: Exclude<ClaimCurrency, "unknown">;
  readonly cadence: Exclude<ClaimCadence, "unknown">;
  readonly applicability: ComparableApplicability;
};

export type ComparabilityResult =
  | {
      readonly status: "comparable";
      readonly claimIds: readonly [string, string];
      readonly dimensions: ComparableDimensions;
    }
  | {
      readonly status: "not_safely_comparable";
      readonly claimIds: readonly [string, string];
      readonly reasons: readonly ComparabilityReason[];
    };

const SOURCE_REVIEW_FAILURES = new Set<FinancialClaimValidationFailureReason>([
  "unknown_document",
  "unknown_segment",
  "empty_quote",
  "quote_not_found",
  "ambiguous_quote",
  "review_required",
  "source_unavailable",
]);

const trustReasonOf = (
  reason: FinancialClaimValidationFailureReason,
): ComparabilityReason =>
  SOURCE_REVIEW_FAILURES.has(reason) ? "source_review_required" : "invalid_claim";

const pushOnce = (
  reasons: ComparabilityReason[],
  reason: ComparabilityReason,
): void => {
  if (!reasons.includes(reason)) reasons.push(reason);
};

const isAdjustment = (concept: CareFeeConcept): boolean =>
  concept === "one_off_adjustment" || concept === "retrospective_adjustment";

const recurringRateCadences = new Set<ClaimCadence>([
  "weekly",
  "four_weekly",
  "monthly",
]);

const compareKnownIdentity = (
  first: string,
  second: string,
  missingReason: ComparabilityReason,
  differentReason: ComparabilityReason,
  reasons: ComparabilityReason[],
): void => {
  if (first === "unknown" || second === "unknown") {
    pushOnce(reasons, missingReason);
  } else if (first !== second) {
    pushOnce(reasons, differentReason);
  }
};

const compareKnownValue = <Value extends string>(
  first: Value,
  second: Value,
  missingValue: Value,
  missingReason: ComparabilityReason,
  differentReason: ComparabilityReason,
  reasons: ComparabilityReason[],
): void => {
  if (first === missingValue || second === missingValue) {
    pushOnce(reasons, missingReason);
  } else if (first !== second) {
    pushOnce(reasons, differentReason);
  }
};

type ApplicabilityCheck =
  | { readonly compatible: true; readonly applicability: ComparableApplicability }
  | { readonly compatible: false; readonly reason: ComparabilityReason };

const applicabilityOf = (
  first: FinancialClaim,
  second: FinancialClaim,
): ApplicabilityCheck => {
  const firstComplete = Boolean(first.periodStart && first.periodEnd);
  const secondComplete = Boolean(second.periodStart && second.periodEnd);
  const firstHasAnyPeriod = Boolean(first.periodStart || first.periodEnd);
  const secondHasAnyPeriod = Boolean(second.periodStart || second.periodEnd);

  if (firstComplete && secondComplete) {
    const same =
      first.periodStart === second.periodStart && first.periodEnd === second.periodEnd;
    if (same) {
      return {
        compatible: true,
        applicability: {
          kind: "same_explicit_period",
          periodStart: first.periodStart!,
          periodEnd: first.periodEnd!,
        },
      };
    }

    const overlaps =
      first.periodStart! <= second.periodEnd! &&
      second.periodStart! <= first.periodEnd!;
    if (!overlaps) {
      return { compatible: false, reason: "non_overlapping_periods" };
    }

    if (
      first.cadence !== second.cadence ||
      !recurringRateCadences.has(first.cadence)
    ) {
      return { compatible: false, reason: "missing_period_context" };
    }

    return {
      compatible: true,
      applicability: {
        kind: "overlapping_explicit_periods",
        periodStart:
          first.periodStart! >= second.periodStart!
            ? first.periodStart!
            : second.periodStart!,
        periodEnd:
          first.periodEnd! <= second.periodEnd!
            ? first.periodEnd!
            : second.periodEnd!,
      },
    };
  }

  if (firstHasAnyPeriod || secondHasAnyPeriod) {
    return { compatible: false, reason: "missing_period_context" };
  }

  if (first.effectiveDate && second.effectiveDate) {
    return first.effectiveDate === second.effectiveDate
      ? {
          compatible: true,
          applicability: {
            kind: "same_effective_date",
            effectiveDate: first.effectiveDate,
          },
        }
      : { compatible: false, reason: "different_effective_dates" };
  }

  return { compatible: false, reason: "missing_period_context" };
};

/**
 * Revalidate and compare typed dimensions only. Amount values are intentionally
 * never read: equality, ordering, subtraction, and reconciliation belong to a
 * later approved layer.
 */
export const compareFinancialClaims = (
  firstValue: unknown,
  secondValue: unknown,
  documents: readonly SourceDocument[],
): ComparabilityResult => {
  const firstValidation = validateFinancialClaim(firstValue, documents);
  const secondValidation = validateFinancialClaim(secondValue, documents);
  const inputClaimIds: readonly [string, string] = [
    typeof firstValue === "object" && firstValue !== null && "id" in firstValue &&
      typeof firstValue.id === "string"
      ? firstValue.id
      : "invalid",
    typeof secondValue === "object" && secondValue !== null && "id" in secondValue &&
      typeof secondValue.id === "string"
      ? secondValue.id
      : "invalid",
  ];

  if (!firstValidation.valid || !secondValidation.valid) {
    const reasons: ComparabilityReason[] = [];
    if (!firstValidation.valid) {
      pushOnce(reasons, trustReasonOf(firstValidation.reason));
    }
    if (!secondValidation.valid) {
      pushOnce(reasons, trustReasonOf(secondValidation.reason));
    }
    return {
      status: "not_safely_comparable",
      claimIds: inputClaimIds,
      reasons,
    };
  }

  const first = firstValidation.claim;
  const second = secondValidation.claim;
  const claimIds: readonly [string, string] = [first.id, second.id];
  const reasons: ComparabilityReason[] = [];

  if (first.id === second.id) {
    pushOnce(reasons, "same_claim");
  }

  if (first.concept === "other_unknown_amount" || second.concept === "other_unknown_amount") {
    pushOnce(reasons, "missing_concept_context");
  } else if (first.concept !== second.concept) {
    pushOnce(reasons, "different_concept");
  }

  const firstAdjustment = isAdjustment(first.concept);
  const secondAdjustment = isAdjustment(second.concept);
  if (firstAdjustment !== secondAdjustment) {
    pushOnce(reasons, "recurring_vs_adjustment");
  }
  if (
    first.concept === "retrospective_adjustment" ||
    second.concept === "retrospective_adjustment"
  ) {
    pushOnce(reasons, "retrospective_adjustment");
  } else if (firstAdjustment && secondAdjustment) {
    pushOnce(reasons, "missing_adjustment_context");
  }

  compareKnownIdentity(
    first.subjectId,
    second.subjectId,
    "missing_subject_context",
    "different_subject",
    reasons,
  );
  compareKnownIdentity(
    first.providerId,
    second.providerId,
    "missing_provider_context",
    "different_provider",
    reasons,
  );
  compareKnownValue(
    first.payerRole,
    second.payerRole,
    "unknown",
    "missing_payer_context",
    "different_payer_role",
    reasons,
  );
  compareKnownValue(
    first.payeeRole,
    second.payeeRole,
    "unknown",
    "missing_payee_context",
    "different_payee_role",
    reasons,
  );
  compareKnownValue(
    first.currency,
    second.currency,
    "unknown",
    "missing_currency_context",
    "different_currency",
    reasons,
  );
  compareKnownValue(
    first.cadence,
    second.cadence,
    "unknown",
    "missing_cadence_context",
    "different_cadence",
    reasons,
  );

  if (
    first.effectiveDate &&
    second.effectiveDate &&
    first.effectiveDate !== second.effectiveDate
  ) {
    pushOnce(reasons, "different_effective_dates");
  }

  const applicability = applicabilityOf(first, second);
  const comparableApplicability = applicability.compatible
    ? applicability.applicability
    : undefined;
  if (!applicability.compatible) {
    pushOnce(reasons, applicability.reason);
  }

  if (reasons.length > 0 || !comparableApplicability) {
    return { status: "not_safely_comparable", claimIds, reasons };
  }

  return {
    status: "comparable",
    claimIds,
    dimensions: {
      concept: first.concept as ComparableDimensions["concept"],
      subjectId: first.subjectId,
      providerId: first.providerId,
      payerRole: first.payerRole as ComparableDimensions["payerRole"],
      payeeRole: first.payeeRole as ComparableDimensions["payeeRole"],
      currency: first.currency as ComparableDimensions["currency"],
      cadence: first.cadence as ComparableDimensions["cadence"],
      applicability: comparableApplicability,
    },
  };
};
