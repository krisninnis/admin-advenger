import type { AdminFinding } from "../types";
import type {
  DecisionDerivedFact,
  DecisionResult,
  DecisionSourceFact,
  DecisionSourceTrace,
} from "./decisionEngine/types";
import type { ComparabilityReason, ComparableApplicability } from "./financialClaimComparability";
import type { ReconciliationResult } from "./financialClaimReconciliation";
import {
  validateFinancialClaim,
  type CareFeeConcept,
  type ClaimCadence,
  type FinancialClaim,
  type FinancialClaimValidationFailureReason,
} from "./financialClaims";
import { buildResultViewModel, type ResultViewModel } from "./resultViewModel";
import type { SourceDocument } from "./sourceProvenance";

export const RECONCILIATION_REASON_EXPLANATIONS: Readonly<Record<ComparabilityReason, string>> = {
  invalid_claim: "One of the financial details could not be validated, so these figures have not been compared.",
  source_review_required:
    "One of the source details needs checking against the original document before these figures can be compared.",
  same_claim: "The same source claim cannot be compared with itself.",
  different_concept: "These figures appear to describe different types of charge or contribution.",
  missing_concept_context: "There is not enough information about what one of the figures describes.",
  recurring_vs_adjustment: "One figure is recurring and the other is an adjustment, so they cannot be compared directly.",
  retrospective_adjustment: "A retrospective adjustment cannot be compared directly with a recurring figure.",
  missing_adjustment_context: "There is not enough information about the adjustment to compare these figures safely.",
  different_subject: "These figures appear to relate to different people.",
  missing_subject_context: "There is not enough information to confirm that these figures relate to the same person.",
  different_provider: "These figures appear to relate to different providers.",
  missing_provider_context: "There is not enough information to confirm that these figures relate to the same provider.",
  different_payer_role: "These figures identify different payer roles, so they have not been compared.",
  missing_payer_context: "There is not enough payer information to compare these figures safely.",
  different_payee_role: "These figures identify different payee roles, so they have not been compared.",
  missing_payee_context: "There is not enough payee information to compare these figures safely.",
  different_currency: "These figures use different currencies, so they cannot be compared directly.",
  missing_currency_context: "There is not enough currency information to compare these figures safely.",
  different_cadence: "These figures use different payment periods, so they cannot be compared directly.",
  missing_cadence_context: "One source does not clearly state how often the amount applies.",
  non_overlapping_periods: "These figures cover different periods, so they have not been compared directly.",
  different_effective_dates:
    "These figures have different effective dates, so this comparison does not establish that they apply at the same time.",
  missing_period_context: "There is not enough period information to compare these figures safely.",
};

const conceptLabels: Readonly<Record<CareFeeConcept, string>> = {
  total_care_home_fee: "total care-home fee",
  resident_contribution: "resident-contribution",
  local_authority_contribution: "local-authority-contribution",
  nhs_contribution: "NHS-contribution",
  third_party_top_up: "third-party-contribution",
  one_off_adjustment: "one-off adjustment",
  retrospective_adjustment: "retrospective adjustment",
  other_unknown_amount: "source amount",
};

const cadenceLabels: Readonly<Record<ClaimCadence, string | undefined>> = {
  weekly: "per week",
  four_weekly: "every four weeks",
  monthly: "per month",
  invoice_period_total: "for the stated invoice period",
  one_off: "one-off",
  unknown: undefined,
};

const formatMinorGbp = (amountMinor: number): string | undefined => {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return undefined;

  const digits = String(amountMinor).padStart(3, "0");
  const pounds = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `£${pounds}.${digits.slice(-2)}`;
};

const formatAmountWithCadence = (
  amountMinor: number,
  cadence: ClaimCadence,
): string | undefined => {
  const amount = formatMinorGbp(amountMinor);
  const cadenceLabel = cadenceLabels[cadence];
  return amount && cadenceLabel ? `${amount} ${cadenceLabel}` : undefined;
};

type ResolvedClaim = {
  claim: FinancialClaim;
  trace: DecisionSourceTrace;
  sourceQuote: string;
};

type ResolveFailure =
  | FinancialClaimValidationFailureReason
  | "missing_claim"
  | "duplicate_claim"
  | "missing_source_document"
  | "ambiguous_source_document"
  | "missing_source_segment"
  | "malformed_source_trace"
  | "source_validation_failed";

type ConsistencyFailure =
  | "inconsistent_claim_set"
  | "inconsistent_claim_identity"
  | "inconsistent_claim_amount"
  | "inconsistent_claim_currency"
  | "inconsistent_claim_cadence"
  | "inconsistent_claim_dimensions"
  | "inconsistent_applicability";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isExactIdentifier = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) return false;

  return !Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
};

const isPositiveInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;

const isValidSourceTrace = (trace: DecisionSourceTrace): boolean =>
  isExactIdentifier(trace.claimId) &&
  isExactIdentifier(trace.sourceDocumentId) &&
  typeof trace.sourceDocumentName === "string" &&
  trace.sourceDocumentName.trim().length > 0 &&
  (trace.sourceSegmentId === undefined || isExactIdentifier(trace.sourceSegmentId)) &&
  (trace.pageNumber === undefined || isPositiveInteger(trace.pageNumber)) &&
  (trace.photoNumber === undefined || isPositiveInteger(trace.photoNumber));

const validationFailureOf = (
  reason: FinancialClaimValidationFailureReason,
): ResolveFailure => {
  if (reason === "unknown_document") return "missing_source_document";
  if (reason === "unknown_segment") return "missing_source_segment";
  return reason;
};

const validateClaims = (
  claims: readonly FinancialClaim[],
  documents: readonly SourceDocument[],
): readonly FinancialClaim[] | ResolveFailure => {
  const validated: FinancialClaim[] = [];

  for (const claim of claims) {
    try {
      const validation = validateFinancialClaim(claim, documents);
      if (!validation.valid) return validationFailureOf(validation.reason);
      validated.push(validation.claim);
    } catch {
      return "source_validation_failed";
    }
  }

  return validated;
};

const resolveClaim = (
  claimId: string,
  claims: readonly FinancialClaim[],
  documents: readonly SourceDocument[],
): ResolvedClaim | ResolveFailure => {
  const matchingClaims = claims.filter((candidate) => candidate.id === claimId);
  if (matchingClaims.length === 0) return "missing_claim";
  if (matchingClaims.length !== 1) return "duplicate_claim";
  const claim = matchingClaims[0];

  const matchingDocuments = documents.filter(
    (candidate) => isRecord(candidate) && candidate.id === claim.provenance.sourceDocumentId,
  );
  if (matchingDocuments.length === 0) return "missing_source_document";
  if (matchingDocuments.length !== 1) return "ambiguous_source_document";
  const document = matchingDocuments[0];

  const matchingSegments = claim.provenance.sourceSegmentId
    ? document.segments.filter((candidate) => candidate.id === claim.provenance.sourceSegmentId)
    : [];
  if (claim.provenance.sourceSegmentId && matchingSegments.length !== 1) {
    return "missing_source_segment";
  }
  const segment = matchingSegments[0];

  const trace: DecisionSourceTrace = {
    claimId: claim.id,
    sourceDocumentId: document.id,
    sourceDocumentName: document.displayName,
    ...(segment
      ? {
          sourceSegmentId: segment.id,
          ...(segment.pageNumber === undefined ? {} : { pageNumber: segment.pageNumber }),
          ...(segment.photoNumber === undefined ? {} : { photoNumber: segment.photoNumber }),
        }
      : {}),
  };
  if (!isValidSourceTrace(trace)) return "malformed_source_trace";

  return {
    claim,
    sourceQuote: claim.provenance.sourceQuote,
    trace,
  };
};

const recurringCadences = new Set<ClaimCadence>(["weekly", "four_weekly", "monthly"]);

const applicabilityMatchesClaims = (
  applicability: ComparableApplicability,
  first: FinancialClaim,
  second: FinancialClaim,
): boolean => {
  if (applicability.kind === "same_effective_date") {
    const hasAnyExplicitPeriod = Boolean(
      first.periodStart || first.periodEnd || second.periodStart || second.periodEnd,
    );
    return !hasAnyExplicitPeriod &&
      first.effectiveDate === applicability.effectiveDate &&
      second.effectiveDate === applicability.effectiveDate;
  }

  if (!first.periodStart || !first.periodEnd || !second.periodStart || !second.periodEnd) {
    return false;
  }

  if (applicability.kind === "same_explicit_period") {
    return first.periodStart === applicability.periodStart &&
      second.periodStart === applicability.periodStart &&
      first.periodEnd === applicability.periodEnd &&
      second.periodEnd === applicability.periodEnd;
  }

  const periodsAreDifferent = first.periodStart !== second.periodStart || first.periodEnd !== second.periodEnd;
  const startComesFromAClaim = applicability.periodStart === first.periodStart ||
    applicability.periodStart === second.periodStart;
  const endComesFromAClaim = applicability.periodEnd === first.periodEnd ||
    applicability.periodEnd === second.periodEnd;
  const intervalIsContainedByBoth = first.periodStart <= applicability.periodStart &&
    second.periodStart <= applicability.periodStart &&
    first.periodEnd >= applicability.periodEnd &&
    second.periodEnd >= applicability.periodEnd;

  return periodsAreDifferent &&
    recurringCadences.has(first.cadence) &&
    startComesFromAClaim &&
    endComesFromAClaim &&
    intervalIsContainedByBoth;
};

const consistencyFailureOf = (
  reconciliation: Extract<ReconciliationResult, { state: "agreement" | "disagreement" }>,
  first: FinancialClaim,
  second: FinancialClaim,
  suppliedClaimCount: number,
): ConsistencyFailure | undefined => {
  if (suppliedClaimCount !== 2) return "inconsistent_claim_set";
  if (
    reconciliation.claimIds[0] === reconciliation.claimIds[1] ||
    first.id !== reconciliation.claimIds[0] ||
    second.id !== reconciliation.claimIds[1]
  ) {
    return "inconsistent_claim_identity";
  }

  const amounts = reconciliation.state === "agreement"
    ? [reconciliation.amountMinor, reconciliation.amountMinor] as const
    : reconciliation.amountsMinor;
  if (first.amountMinor !== amounts[0] || second.amountMinor !== amounts[1]) {
    return "inconsistent_claim_amount";
  }
  if (
    first.currency !== reconciliation.currency ||
    second.currency !== reconciliation.currency ||
    reconciliation.currency !== "GBP"
  ) {
    return "inconsistent_claim_currency";
  }
  if (
    first.cadence !== reconciliation.cadence ||
    second.cadence !== reconciliation.cadence
  ) {
    return "inconsistent_claim_cadence";
  }
  if (
    first.concept === "other_unknown_amount" ||
    first.concept !== second.concept ||
    first.subjectId === "unknown" ||
    first.subjectId !== second.subjectId ||
    first.providerId === "unknown" ||
    first.providerId !== second.providerId ||
    first.payerRole === "unknown" ||
    first.payerRole !== second.payerRole ||
    first.payeeRole === "unknown" ||
    first.payeeRole !== second.payeeRole
  ) {
    return "inconsistent_claim_dimensions";
  }
  if (!applicabilityMatchesClaims(reconciliation.applicability, first, second)) {
    return "inconsistent_applicability";
  }

  return undefined;
};

type ComparablePresentation = {
  title: string;
  summary: string;
  boundary: string;
  sourceFacts: DecisionSourceFact[];
  derivedFacts: DecisionDerivedFact[];
};

const buildComparablePresentation = (
  reconciliation: Extract<ReconciliationResult, { state: "agreement" | "disagreement" }>,
  claims: readonly FinancialClaim[],
  documents: readonly SourceDocument[],
): ComparablePresentation | ResolveFailure | ConsistencyFailure | "unsafe_amount_or_cadence" => {
  const validatedClaims = validateClaims(claims, documents);
  if (typeof validatedClaims === "string") return validatedClaims;

  const first = resolveClaim(reconciliation.claimIds[0], validatedClaims, documents);
  if (typeof first === "string") return first;
  const second = resolveClaim(reconciliation.claimIds[1], validatedClaims, documents);
  if (typeof second === "string") return second;

  const consistencyFailure = consistencyFailureOf(
    reconciliation,
    first.claim,
    second.claim,
    validatedClaims.length,
  );
  if (consistencyFailure) return consistencyFailure;

  const concept = conceptLabels[first.claim.concept];
  const amounts = reconciliation.state === "agreement"
    ? [reconciliation.amountMinor, reconciliation.amountMinor] as const
    : reconciliation.amountsMinor;
  const firstValue = formatAmountWithCadence(amounts[0], reconciliation.cadence);
  const secondValue = formatAmountWithCadence(amounts[1], reconciliation.cadence);
  if (!firstValue || !secondValue) return "unsafe_amount_or_cadence";

  const sourceFacts: DecisionSourceFact[] = [
    {
      kind: "source",
      label: `Source 1 ${concept}`,
      value: firstValue,
      sourceQuote: first.sourceQuote,
      trace: first.trace,
    },
    {
      kind: "source",
      label: `Source 2 ${concept}`,
      value: secondValue,
      sourceQuote: second.sourceQuote,
      trace: second.trace,
    },
  ];

  if (reconciliation.state === "agreement") {
    return {
      title: "Comparable source figures agree",
      summary: `These two safely comparable source amounts agree on the ${concept} figure: ${firstValue}.`,
      boundary:
        "The figures agree with each other. The supplied documents do not establish whether this figure should apply or was properly applied.",
      sourceFacts,
      derivedFacts: [
        {
          kind: "decision_derived",
          label: "Comparison result",
          value: "These two safely comparable amounts agree.",
          inputClaimIds: reconciliation.claimIds,
          decisionContext: {
            kind: "financial_reconciliation",
            state: "agreement",
          },
          applicability: reconciliation.applicability,
        },
      ],
    };
  }

  const difference = formatAmountWithCadence(reconciliation.differenceMinor, reconciliation.cadence);
  if (!difference) return "unsafe_amount_or_cadence";

  return {
    title: "Comparable source figures differ",
    summary: `These two comparable source documents state different ${concept} figures.`,
    boundary:
      "AdminAvenger cannot determine from these documents alone why the figures differ or whether either figure should apply.",
    sourceFacts,
    derivedFacts: [
      {
        kind: "decision_derived",
        label: "Absolute difference",
        value: difference,
        inputClaimIds: reconciliation.claimIds,
        decisionContext: {
          kind: "financial_reconciliation",
          state: "disagreement",
          differenceKind: "absolute",
        },
        applicability: reconciliation.applicability,
      },
    ],
  };
};

const buildDecisionResult = (
  title: string,
  summary: string,
  boundary: string,
  uncertainty: string[],
  sourceFacts: DecisionSourceFact[],
  derivedFacts: DecisionDerivedFact[],
): DecisionResult => ({
  documentType: "care_fee_reconciliation",
  title,
  plainEnglishSummary: summary,
  caseStrength: "not_enough_information",
  strengthLabel: "Document comparison only",
  whatThisLooksLike: summary,
  possibleGrounds: [],
  confidence: {
    level: "high",
    reason: "This wording follows the supplied deterministic reconciliation state and source references.",
  },
  uncertainty,
  cannotKnow: [boundary],
  evidenceNeeded: [],
  deadlines: [],
  risks: [],
  nextSteps: [],
  safetyNotes: [
    "This result describes only what the supplied documents and deterministic comparison establish.",
    "No amount shown here is counted as saved, recovered, payable, or due.",
  ],
  amountTreatment: "no_money_counted",
  sourceFacts,
  derivedFacts,
});

export type SafeReconciliationComposition = {
  readonly status: "composed";
  readonly finding: AdminFinding;
  readonly resultViewModel: ResultViewModel;
};

export type SafeReconciliationCompositionFailure = {
  readonly status: "not_composed";
  readonly reason: ResolveFailure | ConsistencyFailure | "unsafe_amount_or_cadence";
};

export type ComposeSafeReconciliationResultInput = {
  readonly findingId: string;
  readonly itemId: string;
  readonly createdAt: string;
  readonly reconciliation: ReconciliationResult;
  readonly claims: readonly FinancialClaim[];
  readonly documents: readonly SourceDocument[];
};

export const composeSafeReconciliationResult = ({
  findingId,
  itemId,
  createdAt,
  reconciliation,
  claims,
  documents,
}: ComposeSafeReconciliationResultInput): SafeReconciliationComposition | SafeReconciliationCompositionFailure => {
  let title: string;
  let summary: string;
  let boundary: string;
  let uncertainty: string[];
  let sourceFacts: DecisionSourceFact[] = [];
  let derivedFacts: DecisionDerivedFact[] = [];

  if (reconciliation.state === "not_safely_comparable") {
    uncertainty = reconciliation.reasons.map((reason) => RECONCILIATION_REASON_EXPLANATIONS[reason]);
    title = "These figures are not safely comparable";
    summary = uncertainty.join(" ");
    boundary = "AdminAvenger cannot establish a financial relationship between these claims from this comparison.";
  } else {
    const presentation = buildComparablePresentation(reconciliation, claims, documents);
    if (typeof presentation === "string") return { status: "not_composed", reason: presentation };
    ({ title, summary, boundary, sourceFacts, derivedFacts } = presentation);
    uncertainty = [boundary];
  }

  const decisionResult = buildDecisionResult(
    title,
    summary,
    boundary,
    uncertainty,
    sourceFacts,
    derivedFacts,
  );
  const finding: AdminFinding = {
    id: findingId,
    itemId,
    category: "admin_dispute",
    title,
    summary,
    whyItMatters: boundary,
    suggestedAction: "Check the original documents.",
    urgency: "low",
    confidence: "high",
    status: "new",
    createdAt,
  };

  return {
    status: "composed",
    finding,
    resultViewModel: buildResultViewModel({ decisionResult }),
  };
};
