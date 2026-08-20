import {
  validateConfirmedCareFeeComparisonRequest,
  type ConfirmedCareFeeComparisonRequestV1,
  type UserConfirmedCareFeeContext,
} from "./careFeeClaimConfirmation";
import type { ComparableApplicability } from "./financialClaimComparability";
import {
  reconcileFinancialClaims,
  type ReconciliationResult,
} from "./financialClaimReconciliation";
import type {
  CareFeePartyRole,
  ClaimCadence,
  FinancialClaim,
} from "./financialClaims";
import {
  composeSafeReconciliationResult,
  type SafeReconciliationCompositionFailure,
} from "./safeReconciliationResult";
import type { SourceDocument, SourceReviewState } from "./sourceProvenance";

export type CareFeeResolutionOrigin = "source_derived" | "user_confirmed";

export type CareFeeResolutionLedger = {
  readonly subject: readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin];
  readonly provider: readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin];
  readonly payerRoles: readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin];
  readonly payeeRoles: readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin];
};

export type CareFeeSafeComparisonSourceView = {
  readonly recordLabel: "Record 1" | "Record 2";
  readonly documentName: string;
  readonly amountText: string;
  readonly cadenceText: string;
  readonly sourceApplicabilityText: string;
  readonly sourceLocationText: string;
  readonly reviewStateText: string;
  readonly sourceQuote: string;
};

export type CareFeeConfirmedContextView = {
  readonly label: string;
  readonly value: string;
};

export type CareFeeSafeComparisonAction =
  | "change_records"
  | "back_to_documents"
  | "start_over";

export type CareFeeSafeComparisonResultViewModel = {
  readonly state: ReconciliationResult["state"];
  readonly heading: string;
  readonly summary: string;
  readonly safetyBoundary: string;
  readonly records: readonly [
    CareFeeSafeComparisonSourceView,
    CareFeeSafeComparisonSourceView,
  ];
  readonly confirmedContext: readonly CareFeeConfirmedContextView[];
  readonly resolutionLedger: CareFeeResolutionLedger;
  readonly comparison: {
    readonly stateText: string;
    readonly differenceText?: string;
    readonly applicabilityText?: string;
  };
  readonly blockingReasons: readonly string[];
  readonly allowedActions: readonly CareFeeSafeComparisonAction[];
};

export type CareFeeSafeComparisonFailureReason =
  | "invalid_request"
  | "context_resolution_failed"
  | "source_changed"
  | "provenance_mismatch"
  | "safe_result_not_composed"
  | "unsafe_formatting"
  | "unexpected_error";

export type CareFeeSafeComparisonOutcome =
  | {
      readonly status: "ready";
      readonly model: CareFeeSafeComparisonResultViewModel;
    }
  | {
      readonly status: "failed";
      readonly reason: CareFeeSafeComparisonFailureReason;
      readonly message: string;
    };

const FAILURE_MESSAGES: Readonly<Record<CareFeeSafeComparisonFailureReason, string>> = {
  invalid_request:
    "These records changed or could not be verified. Review and confirm them again.",
  context_resolution_failed:
    "The confirmed context no longer matches these records. Review the pair again.",
  source_changed:
    "A source record changed or needs review. No comparison result is shown.",
  provenance_mismatch:
    "A source record changed or needs review. No comparison result is shown.",
  safe_result_not_composed:
    "The comparison could not be safely matched to the selected records. No result is shown.",
  unsafe_formatting:
    "The amount or payment period could not be displayed safely.",
  unexpected_error:
    "AdminAvenger could not complete this comparison safely. No result has been shown.",
};

const cadenceLabels: Readonly<Record<ClaimCadence, string>> = {
  weekly: "Weekly",
  four_weekly: "Every four weeks",
  monthly: "Monthly",
  invoice_period_total: "Invoice-period total",
  one_off: "One-off",
  unknown: "Not stated in the document",
};

const roleLabels: Readonly<Record<CareFeePartyRole, string>> = {
  resident: "Resident",
  local_authority: "Local authority",
  nhs: "NHS",
  third_party: "Third party",
  care_provider: "Care provider",
  unknown: "Not stated in the document",
};

const reviewStateLabels: Readonly<Record<SourceReviewState, string>> = {
  confirmed: "Source review confirmed",
  review_required: "Source needs review",
  unavailable: "Source unavailable",
};

const allowedActions = [
  "change_records",
  "back_to_documents",
  "start_over",
] as const satisfies readonly CareFeeSafeComparisonAction[];

const fail = (
  reason: CareFeeSafeComparisonFailureReason,
): Extract<CareFeeSafeComparisonOutcome, { status: "failed" }> => ({
  status: "failed",
  reason,
  message: FAILURE_MESSAGES[reason],
});

const sameStringArray = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

const sameSourceDocuments = (first: SourceDocument, second: SourceDocument): boolean =>
  first.id === second.id &&
  first.displayName === second.displayName &&
  first.intakeType === second.intakeType &&
  first.extractionMethod === second.extractionMethod &&
  first.order === second.order &&
  first.extractedText === second.extractedText &&
  first.confidence === second.confidence &&
  first.reviewState === second.reviewState &&
  sameStringArray(first.warnings, second.warnings) &&
  first.segments.length === second.segments.length &&
  first.segments.every((segment, index) => {
    const candidate = second.segments[index];
    return candidate !== undefined &&
      segment.id === candidate.id &&
      segment.kind === candidate.kind &&
      segment.order === candidate.order &&
      segment.text === candidate.text &&
      segment.pageNumber === candidate.pageNumber &&
      segment.photoNumber === candidate.photoNumber;
  });

const requestSourcesAreCurrent = (
  request: ConfirmedCareFeeComparisonRequestV1,
  currentDocuments: readonly SourceDocument[],
): boolean =>
  request.sourceDocuments.every((requestDocument) => {
    const matches = currentDocuments.filter(({ id }) => id === requestDocument.id);
    return matches.length === 1 && sameSourceDocuments(requestDocument, matches[0]);
  });

const confirmedPairContext = (
  context: readonly UserConfirmedCareFeeContext[],
  dimension: "same_subject" | "same_provider",
): UserConfirmedCareFeeContext | undefined =>
  context.find((item) => item.dimension === dimension);

const confirmedRole = (
  context: readonly UserConfirmedCareFeeContext[],
  dimension: "payer_role" | "payee_role",
  claimId: string,
): Exclude<CareFeePartyRole, "unknown"> | undefined => {
  const match = context.find(
    (item) => item.dimension === dimension && item.appliesToClaimIds[0] === claimId,
  );
  return match && "value" in match ? match.value : undefined;
};

let comparisonAttemptSequence = 0;

const opaqueAttemptKey = (): string => {
  comparisonAttemptSequence += 1;
  return `care-fee-session-${Date.now()}-${comparisonAttemptSequence}`;
};

type ResolvedDimension<T> = {
  readonly values: readonly [T, T];
  readonly origins: readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin];
};

const resolveSharedIdentity = (
  first: string,
  second: string,
  confirmed: UserConfirmedCareFeeContext | undefined,
  opaqueValue: string,
): ResolvedDimension<string> | undefined => {
  const firstKnown = first !== "unknown";
  const secondKnown = second !== "unknown";

  if (firstKnown && secondKnown) {
    return first === second
      ? {
          values: [first, second],
          origins: ["source_derived", "source_derived"],
        }
      : undefined;
  }

  if (!confirmed || !("answer" in confirmed) || confirmed.answer !== "yes") {
    return undefined;
  }

  const resolvedValue = firstKnown ? first : secondKnown ? second : opaqueValue;
  return {
    values: [resolvedValue, resolvedValue],
    origins: [
      firstKnown ? "source_derived" : "user_confirmed",
      secondKnown ? "source_derived" : "user_confirmed",
    ],
  };
};

const resolveRole = (
  claim: FinancialClaim,
  field: "payerRole" | "payeeRole",
  context: readonly UserConfirmedCareFeeContext[],
): { readonly value: CareFeePartyRole; readonly origin: CareFeeResolutionOrigin } | undefined => {
  const current = claim[field];
  if (current !== "unknown") return { value: current, origin: "source_derived" };

  const confirmed = confirmedRole(
    context,
    field === "payerRole" ? "payer_role" : "payee_role",
    claim.id,
  );
  return confirmed ? { value: confirmed, origin: "user_confirmed" } : undefined;
};

const resolveComparisonClaims = (
  request: ConfirmedCareFeeComparisonRequestV1,
):
  | {
      readonly claims: readonly [FinancialClaim, FinancialClaim];
      readonly ledger: CareFeeResolutionLedger;
    }
  | undefined => {
  const [first, second] = request.claims;
  const attemptKey = opaqueAttemptKey();
  const subject = resolveSharedIdentity(
    first.subjectId,
    second.subjectId,
    confirmedPairContext(request.userConfirmedContext, "same_subject"),
    `${attemptKey}-subject`,
  );
  const provider = resolveSharedIdentity(
    first.providerId,
    second.providerId,
    confirmedPairContext(request.userConfirmedContext, "same_provider"),
    `${attemptKey}-provider`,
  );
  const firstPayer = resolveRole(first, "payerRole", request.userConfirmedContext);
  const secondPayer = resolveRole(second, "payerRole", request.userConfirmedContext);
  const firstPayee = resolveRole(first, "payeeRole", request.userConfirmedContext);
  const secondPayee = resolveRole(second, "payeeRole", request.userConfirmedContext);

  if (!subject || !provider || !firstPayer || !secondPayer || !firstPayee || !secondPayee) {
    return undefined;
  }

  return {
    claims: [
      {
        ...first,
        subjectId: subject.values[0],
        providerId: provider.values[0],
        payerRole: firstPayer.value,
        payeeRole: firstPayee.value,
        provenance: first.provenance,
      },
      {
        ...second,
        subjectId: subject.values[1],
        providerId: provider.values[1],
        payerRole: secondPayer.value,
        payeeRole: secondPayee.value,
        provenance: second.provenance,
      },
    ],
    ledger: {
      subject: subject.origins,
      provider: provider.origins,
      payerRoles: [firstPayer.origin, secondPayer.origin],
      payeeRoles: [firstPayee.origin, secondPayee.origin],
    },
  };
};

const formatMinorUnits = (amountMinor: number): string | undefined => {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return undefined;
  const digits = String(amountMinor).padStart(3, "0");
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${whole}.${digits.slice(-2)}`;
};

const formatSourceAmount = (claim: FinancialClaim): string | undefined => {
  const amount = formatMinorUnits(claim.amountMinor);
  if (!amount) return undefined;
  return claim.currency === "GBP"
    ? `GBP ${amount}`
    : `${amount} — currency not stated`;
};

const formatSourceApplicability = (claim: FinancialClaim): string => {
  if (claim.periodStart || claim.periodEnd) {
    return `${claim.periodStart ?? "start not stated"} to ${claim.periodEnd ?? "end not stated"}`;
  }
  if (claim.effectiveDate) return `Effective ${claim.effectiveDate}`;
  if (claim.assessmentDate) return `Assessment ${claim.assessmentDate}`;
  if (claim.documentDate) return `Document dated ${claim.documentDate}`;
  return "Not stated in the document";
};

const formatBackendApplicability = (applicability: ComparableApplicability): string => {
  if (applicability.kind === "same_effective_date") {
    return `Same effective date: ${applicability.effectiveDate}`;
  }
  if (applicability.kind === "same_explicit_period") {
    return `Same stated period: ${applicability.periodStart} to ${applicability.periodEnd}`;
  }
  return `Overlapping stated period: ${applicability.periodStart} to ${applicability.periodEnd}`;
};

const sourceLocation = (claim: FinancialClaim, document: SourceDocument): string => {
  const segment = claim.provenance.sourceSegmentId
    ? document.segments.find(({ id }) => id === claim.provenance.sourceSegmentId)
    : undefined;
  if (segment?.pageNumber !== undefined) return `Page ${segment.pageNumber}`;
  if (segment?.photoNumber !== undefined) return `Photo ${segment.photoNumber}`;
  if (segment) return "Document section";
  return "Document passage";
};

const buildSourceView = (
  claim: FinancialClaim,
  recordIndex: 0 | 1,
  documents: readonly SourceDocument[],
): CareFeeSafeComparisonSourceView | undefined => {
  const document = documents.find(({ id }) => id === claim.provenance.sourceDocumentId);
  const amountText = formatSourceAmount(claim);
  if (!document || !amountText || document.displayName.trim().length === 0) return undefined;

  return {
    recordLabel: recordIndex === 0 ? "Record 1" : "Record 2",
    documentName: document.displayName,
    amountText,
    cadenceText: cadenceLabels[claim.cadence],
    sourceApplicabilityText: formatSourceApplicability(claim),
    sourceLocationText: sourceLocation(claim, document),
    reviewStateText: reviewStateLabels[claim.provenance.reviewState],
    sourceQuote: claim.provenance.sourceQuote,
  };
};

const contextViews = (
  request: ConfirmedCareFeeComparisonRequestV1,
): readonly CareFeeConfirmedContextView[] =>
  request.userConfirmedContext.map((context) => {
    if ("answer" in context) {
      return context.dimension === "same_subject"
        ? { label: "Subject", value: "You confirmed that both records concern the same person." }
        : { label: "Provider", value: "You confirmed that both records concern the same provider." };
    }

    const recordNumber = request.claimIds[1] === context.appliesToClaimIds[0] ? 2 : 1;
    return {
      label: `${context.dimension === "payer_role" ? "Payer" : "Payee"} for Record ${recordNumber}`,
      value: roleLabels[context.value],
    };
  });

const compositionFailureReason = (
  failure: SafeReconciliationCompositionFailure,
): CareFeeSafeComparisonFailureReason => {
  if (failure.reason === "unsafe_amount_or_cadence") return "unsafe_formatting";
  if (
    failure.reason === "invalid_provenance" ||
    failure.reason === "provenance_claim_id_mismatch" ||
    failure.reason === "missing_source_document" ||
    failure.reason === "ambiguous_source_document" ||
    failure.reason === "missing_source_segment" ||
    failure.reason === "malformed_source_trace" ||
    failure.reason === "source_validation_failed"
  ) {
    return "provenance_mismatch";
  }
  return "safe_result_not_composed";
};

const stateHeading = (state: ReconciliationResult["state"]): string => {
  if (state === "agreement") return "These safely comparable amounts agree.";
  if (state === "disagreement") return "These safely comparable amounts differ.";
  return "These figures are not safely comparable.";
};

const stateText = (state: ReconciliationResult["state"]): string => {
  if (state === "agreement") {
    return "The selected source amounts are safely comparable and agree for the applicability shown.";
  }
  if (state === "disagreement") {
    return "The selected source amounts are safely comparable and differ for the applicability shown.";
  }
  return "No financial relationship has been established between the selected source claims.";
};

const derivedComparisonValue = (
  reconciliation: ReconciliationResult,
  evidenceContext: readonly {
    readonly kind?: string;
    readonly label: string;
    readonly value: string;
  }[],
): string | undefined =>
  reconciliation.state === "disagreement"
    ? evidenceContext.find(
        (entry) => entry.kind === "decision_derived" && entry.label === "Absolute difference",
      )?.value
    : undefined;

export const runCareFeeSafeComparison = (
  value: unknown,
  currentSourceDocuments: readonly SourceDocument[],
): CareFeeSafeComparisonOutcome => {
  try {
    const validation = validateConfirmedCareFeeComparisonRequest(value);
    if (!validation.valid) return fail("invalid_request");
    const request = validation.request;

    if (!requestSourcesAreCurrent(request, currentSourceDocuments)) {
      return fail("source_changed");
    }

    const resolved = resolveComparisonClaims(request);
    if (!resolved) return fail("context_resolution_failed");

    const reconciliation = reconcileFinancialClaims(
      resolved.claims[0],
      resolved.claims[1],
      currentSourceDocuments,
    );
    const attemptKey = opaqueAttemptKey();
    const composition = composeSafeReconciliationResult({
      findingId: `${attemptKey}-finding`,
      itemId: `${attemptKey}-item`,
      createdAt: new Date().toISOString(),
      reconciliation,
      claims: resolved.claims,
      documents: currentSourceDocuments,
    });
    if (composition.status === "not_composed") {
      return fail(compositionFailureReason(composition));
    }

    const firstSource = buildSourceView(request.claims[0], 0, currentSourceDocuments);
    const secondSource = buildSourceView(request.claims[1], 1, currentSourceDocuments);
    if (!firstSource || !secondSource) return fail("unsafe_formatting");

    const differenceText = derivedComparisonValue(
      reconciliation,
      composition.resultViewModel.evidenceContext,
    );
    if (reconciliation.state === "disagreement" && !differenceText) {
      return fail("unsafe_formatting");
    }

    return {
      status: "ready",
      model: {
        state: reconciliation.state,
        heading: stateHeading(reconciliation.state),
        summary: composition.resultViewModel.summary,
        safetyBoundary:
          composition.resultViewModel.cannotKnow[0] ??
          "This comparison does not establish what should apply or what anyone should do next.",
        records: [firstSource, secondSource],
        confirmedContext: contextViews(request),
        resolutionLedger: resolved.ledger,
        comparison: {
          stateText: stateText(reconciliation.state),
          ...(differenceText ? { differenceText } : {}),
          ...(reconciliation.state === "not_safely_comparable"
            ? {}
            : { applicabilityText: formatBackendApplicability(reconciliation.applicability) }),
        },
        blockingReasons:
          reconciliation.state === "not_safely_comparable"
            ? composition.resultViewModel.uncertainty
            : [],
        allowedActions,
      },
    };
  } catch {
    return fail("unexpected_error");
  }
};
