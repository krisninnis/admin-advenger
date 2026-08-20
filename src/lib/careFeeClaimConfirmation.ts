import {
  CARE_FEE_PARTY_ROLES,
  extractFinancialClaimResults,
  validateFinancialClaim,
  type CareFeePartyRole,
  type FinancialClaim,
  type FinancialClaimExtractionRejectionReason,
} from "./financialClaims";
import type { SourceDocument, SourceReviewState } from "./sourceProvenance";

export const CARE_FEE_COMPARABILITY_NOTICE =
  "This has not been checked for safe comparability.";

export type CareFeeClaimIdPair = readonly [string, string];

export type CareFeeClaimSourceView = {
  readonly sourceDocumentId: string;
  /** Display metadata only. This is not a stable provenance identity. */
  readonly sourceDocumentName: string;
  readonly sourceSegmentId?: string;
  readonly pageNumber?: number;
  readonly photoNumber?: number;
  readonly sourceQuote: string;
  readonly reviewState: SourceReviewState;
};

export type CareFeeClaimCandidate =
  | {
      readonly status: "selectable";
      readonly candidateId: string;
      readonly claim: FinancialClaim;
      readonly source: CareFeeClaimSourceView;
    }
  | {
      readonly status: "blocked";
      readonly candidateId: string;
      readonly source: CareFeeClaimSourceView;
      readonly reason: FinancialClaimExtractionRejectionReason;
    };

export type UserConfirmedCareFeeContext =
  | {
      readonly kind: "user_confirmed_context";
      readonly dimension: "same_subject" | "same_provider";
      readonly appliesToClaimIds: CareFeeClaimIdPair;
      readonly answer: "yes";
    }
  | {
      readonly kind: "user_confirmed_context";
      readonly dimension: "payer_role" | "payee_role";
      readonly appliesToClaimIds: readonly [string];
      readonly value: Exclude<CareFeePartyRole, "unknown">;
    };

export type RequiredCareFeeContext =
  | {
      readonly dimension: "same_subject" | "same_provider";
      readonly appliesToClaimIds: CareFeeClaimIdPair;
    }
  | {
      readonly dimension: "payer_role" | "payee_role";
      readonly appliesToClaimIds: readonly [string];
    };

export type ConfirmedCareFeeComparisonRequestV1 = {
  readonly kind: "care_fee_comparison_request";
  readonly version: 1;
  readonly claimIds: CareFeeClaimIdPair;
  readonly claims: readonly [FinancialClaim, FinancialClaim];
  readonly sourceDocuments: readonly SourceDocument[];
  readonly userConfirmedContext: readonly UserConfirmedCareFeeContext[];
  readonly confirmation: {
    readonly kind: "explicit_pair_confirmation";
    readonly state: "confirmed";
    readonly claimIds: CareFeeClaimIdPair;
  };
};

export type CareFeeContextValidationFailureReason =
  | "malformed_context"
  | "duplicate_context"
  | "context_claim_mismatch"
  | "known_value_override"
  | "known_value_conflict";

export type CareFeeRequestValidationFailureReason =
  | "malformed_request"
  | "unexpected_field"
  | "duplicate_claim"
  | "claim_identity_mismatch"
  | "invalid_claim"
  | "invalid_source_documents"
  | "referenced_document_mismatch"
  | "unresolved_context"
  | CareFeeContextValidationFailureReason;

export type CareFeeRequestValidation =
  | { readonly valid: true; readonly request: ConfirmedCareFeeComparisonRequestV1 }
  | { readonly valid: false; readonly reason: CareFeeRequestValidationFailureReason };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

const isStringPair = (value: unknown): value is CareFeeClaimIdPair =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((item) => typeof item === "string" && item.trim().length > 0);

const samePair = (
  first: readonly string[],
  second: readonly string[],
): boolean => first.length === second.length && first.every((id, index) => id === second[index]);

const sourceViewFor = (
  document: SourceDocument,
  sourceSegmentId: string | undefined,
  sourceQuote: string,
  reviewState: SourceReviewState,
): CareFeeClaimSourceView => {
  const segment = sourceSegmentId
    ? document.segments.find(({ id }) => id === sourceSegmentId)
    : undefined;

  return {
    sourceDocumentId: document.id,
    sourceDocumentName: document.displayName,
    ...(sourceSegmentId ? { sourceSegmentId } : {}),
    ...(segment?.pageNumber === undefined ? {} : { pageNumber: segment.pageNumber }),
    ...(segment?.photoNumber === undefined ? {} : { photoNumber: segment.photoNumber }),
    sourceQuote,
    reviewState,
  };
};

const sourceSortKey = (
  candidate: CareFeeClaimCandidate,
  documents: readonly SourceDocument[],
): readonly [number, number, string] => {
  const document = documents.find(({ id }) => id === candidate.source.sourceDocumentId);
  const segment = candidate.source.sourceSegmentId
    ? document?.segments.find(({ id }) => id === candidate.source.sourceSegmentId)
    : undefined;
  return [document?.order ?? Number.MAX_SAFE_INTEGER, segment?.order ?? 0, candidate.candidateId];
};

const compareSortKeys = (
  first: readonly [number, number, string],
  second: readonly [number, number, string],
): number =>
  first[0] - second[0] || first[1] - second[1] || first[2].localeCompare(second[2]);

export const buildCareFeeClaimCandidates = (
  documents: readonly SourceDocument[],
): CareFeeClaimCandidate[] => {
  const candidates = extractFinancialClaimResults(documents).flatMap<CareFeeClaimCandidate>((result) => {
    if (result.status === "trusted") {
      const document = documents.find(({ id }) => id === result.claim.provenance.sourceDocumentId);
      if (!document) return [];
      return [{
        status: "selectable",
        candidateId: result.claim.id,
        claim: result.claim,
        source: sourceViewFor(
          document,
          result.claim.provenance.sourceSegmentId,
          result.claim.provenance.sourceQuote,
          result.claim.provenance.reviewState,
        ),
      }];
    }

    const document = documents.find(({ id }) => id === result.sourceDocumentId);
    if (!document) return [];
    return [{
      status: "blocked",
      candidateId: result.candidateId,
      source: sourceViewFor(
        document,
        result.sourceSegmentId,
        result.sourceQuote,
        document.reviewState,
      ),
      reason: result.reason,
    }];
  });

  return candidates.sort((first, second) =>
    compareSortKeys(sourceSortKey(first, documents), sourceSortKey(second, documents)),
  );
};

const knownConflict = (first: string, second: string): boolean =>
  first !== "unknown" && second !== "unknown" && first !== second;

const pairCanBeSuggested = (
  first: Extract<CareFeeClaimCandidate, { status: "selectable" }>,
  second: Extract<CareFeeClaimCandidate, { status: "selectable" }>,
): boolean =>
  first.claim.id !== second.claim.id &&
  first.claim.concept !== "other_unknown_amount" &&
  first.claim.concept === second.claim.concept &&
  !knownConflict(first.claim.currency, second.claim.currency) &&
  !knownConflict(first.claim.cadence, second.claim.cadence) &&
  !knownConflict(first.claim.subjectId, second.claim.subjectId) &&
  !knownConflict(first.claim.providerId, second.claim.providerId) &&
  !knownConflict(first.claim.payerRole, second.claim.payerRole) &&
  !knownConflict(first.claim.payeeRole, second.claim.payeeRole);

export type CareFeeClaimPairSuggestion = {
  readonly claimIds: CareFeeClaimIdPair;
  readonly label: "Suggested starting pair";
  readonly notice: typeof CARE_FEE_COMPARABILITY_NOTICE;
};

export const suggestCareFeeClaimPair = (
  candidates: readonly CareFeeClaimCandidate[],
): CareFeeClaimPairSuggestion | undefined => {
  const selectable = candidates.filter(
    (candidate): candidate is Extract<CareFeeClaimCandidate, { status: "selectable" }> =>
      candidate.status === "selectable",
  );
  const possible: Array<{
    first: Extract<CareFeeClaimCandidate, { status: "selectable" }>;
    second: Extract<CareFeeClaimCandidate, { status: "selectable" }>;
    firstIndex: number;
    secondIndex: number;
    crossDocument: boolean;
  }> = [];

  for (let firstIndex = 0; firstIndex < selectable.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < selectable.length; secondIndex += 1) {
      const first = selectable[firstIndex];
      const second = selectable[secondIndex];
      if (!pairCanBeSuggested(first, second)) continue;
      possible.push({
        first,
        second,
        firstIndex,
        secondIndex,
        crossDocument: first.source.sourceDocumentId !== second.source.sourceDocumentId,
      });
    }
  }

  possible.sort((first, second) => {
    if (first.crossDocument !== second.crossDocument) return first.crossDocument ? -1 : 1;
    return first.firstIndex - second.firstIndex ||
      first.secondIndex - second.secondIndex ||
      first.first.candidateId.localeCompare(second.first.candidateId) ||
      first.second.candidateId.localeCompare(second.second.candidateId);
  });

  const selected = possible[0];
  return selected
    ? {
        claimIds: [selected.first.claim.id, selected.second.claim.id],
        label: "Suggested starting pair",
        notice: CARE_FEE_COMPARABILITY_NOTICE,
      }
    : undefined;
};

const contextKey = (context: UserConfirmedCareFeeContext): string =>
  `${context.dimension}:${context.appliesToClaimIds.join("|")}`;

const claimRoleField = (dimension: "payer_role" | "payee_role"): "payerRole" | "payeeRole" =>
  dimension === "payer_role" ? "payerRole" : "payeeRole";

const validConfirmedRoles = new Set<string>(
  CARE_FEE_PARTY_ROLES.filter((role) => role !== "unknown"),
);

export const validateUserConfirmedCareFeeContext = (
  value: unknown,
  claims: readonly [FinancialClaim, FinancialClaim],
):
  | { readonly valid: true; readonly context: readonly UserConfirmedCareFeeContext[] }
  | { readonly valid: false; readonly reason: CareFeeContextValidationFailureReason } => {
  if (!Array.isArray(value)) return { valid: false, reason: "malformed_context" };
  const pairIds: CareFeeClaimIdPair = [claims[0].id, claims[1].id];
  const parsed: UserConfirmedCareFeeContext[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!isRecord(item) || item.kind !== "user_confirmed_context") {
      return { valid: false, reason: "malformed_context" };
    }

    if (item.dimension === "same_subject" || item.dimension === "same_provider") {
      if (
        !hasExactKeys(item, ["kind", "dimension", "appliesToClaimIds", "answer"]) ||
        item.answer !== "yes" ||
        !isStringPair(item.appliesToClaimIds) ||
        !samePair(item.appliesToClaimIds, pairIds)
      ) {
        return {
          valid: false,
          reason: isStringPair(item.appliesToClaimIds)
            ? "context_claim_mismatch"
            : "malformed_context",
        };
      }

      const field = item.dimension === "same_subject" ? "subjectId" : "providerId";
      const first = claims[0][field];
      const second = claims[1][field];
      if (knownConflict(first, second)) return { valid: false, reason: "known_value_conflict" };
      if (first !== "unknown" && second !== "unknown") {
        return { valid: false, reason: "known_value_override" };
      }

      const context = item as UserConfirmedCareFeeContext;
      const key = contextKey(context);
      if (seen.has(key)) return { valid: false, reason: "duplicate_context" };
      seen.add(key);
      parsed.push(context);
      continue;
    }

    if (item.dimension === "payer_role" || item.dimension === "payee_role") {
      const appliesToClaimIds = item.appliesToClaimIds;
      if (
        !hasExactKeys(item, ["kind", "dimension", "appliesToClaimIds", "value"]) ||
        !Array.isArray(appliesToClaimIds) ||
        appliesToClaimIds.length !== 1 ||
        typeof appliesToClaimIds[0] !== "string" ||
        !validConfirmedRoles.has(item.value as string)
      ) {
        return { valid: false, reason: "malformed_context" };
      }
      const claim = claims.find(({ id }) => id === appliesToClaimIds[0]);
      if (!claim) return { valid: false, reason: "context_claim_mismatch" };
      if (claim[claimRoleField(item.dimension)] !== "unknown") {
        return { valid: false, reason: "known_value_override" };
      }

      const context = item as UserConfirmedCareFeeContext;
      const key = contextKey(context);
      if (seen.has(key)) return { valid: false, reason: "duplicate_context" };
      seen.add(key);
      parsed.push(context);
      continue;
    }

    return { valid: false, reason: "malformed_context" };
  }

  return { valid: true, context: parsed };
};

export const getRequiredCareFeeContext = (
  claims: readonly [FinancialClaim, FinancialClaim],
  context: readonly UserConfirmedCareFeeContext[],
): RequiredCareFeeContext[] => {
  const existing = new Set(context.map(contextKey));
  const pairIds: CareFeeClaimIdPair = [claims[0].id, claims[1].id];
  const required: RequiredCareFeeContext[] = [];

  if (
    (claims[0].subjectId === "unknown" || claims[1].subjectId === "unknown") &&
    !existing.has(`same_subject:${pairIds.join("|")}`)
  ) {
    required.push({ dimension: "same_subject", appliesToClaimIds: pairIds });
  }
  if (
    (claims[0].providerId === "unknown" || claims[1].providerId === "unknown") &&
    !existing.has(`same_provider:${pairIds.join("|")}`)
  ) {
    required.push({ dimension: "same_provider", appliesToClaimIds: pairIds });
  }

  for (const claim of claims) {
    if (claim.payerRole === "unknown" && !existing.has(`payer_role:${claim.id}`)) {
      required.push({ dimension: "payer_role", appliesToClaimIds: [claim.id] });
    }
    if (claim.payeeRole === "unknown" && !existing.has(`payee_role:${claim.id}`)) {
      required.push({ dimension: "payee_role", appliesToClaimIds: [claim.id] });
    }
  }

  return required;
};

const hasKnownIdentityConflict = (
  claims: readonly [FinancialClaim, FinancialClaim],
): boolean =>
  knownConflict(claims[0].subjectId, claims[1].subjectId) ||
  knownConflict(claims[0].providerId, claims[1].providerId);

const referencedDocumentsInClaimOrder = (
  claims: readonly [FinancialClaim, FinancialClaim],
  documents: readonly SourceDocument[],
): SourceDocument[] | undefined => {
  const ids = [...new Set(claims.map((claim) => claim.provenance.sourceDocumentId))];
  const referenced = ids.map((id) => documents.find((document) => document.id === id));
  return referenced.some((document) => document === undefined)
    ? undefined
    : referenced as SourceDocument[];
};

export const createConfirmedCareFeeComparisonRequest = ({
  claims,
  sourceDocuments,
  userConfirmedContext,
}: {
  readonly claims: readonly [FinancialClaim, FinancialClaim];
  readonly sourceDocuments: readonly SourceDocument[];
  readonly userConfirmedContext: readonly UserConfirmedCareFeeContext[];
}): CareFeeRequestValidation => {
  if (claims[0].id === claims[1].id) return { valid: false, reason: "duplicate_claim" };
  if (hasKnownIdentityConflict(claims)) return { valid: false, reason: "known_value_conflict" };

  for (const claim of claims) {
    if (!validateFinancialClaim(claim, sourceDocuments).valid) {
      return { valid: false, reason: "invalid_claim" };
    }
  }

  const contextValidation = validateUserConfirmedCareFeeContext(userConfirmedContext, claims);
  if (!contextValidation.valid) return contextValidation;
  if (getRequiredCareFeeContext(claims, contextValidation.context).length > 0) {
    return { valid: false, reason: "unresolved_context" };
  }

  const referenced = referencedDocumentsInClaimOrder(claims, sourceDocuments);
  if (!referenced) return { valid: false, reason: "referenced_document_mismatch" };
  const claimIds: CareFeeClaimIdPair = [claims[0].id, claims[1].id];
  const request: ConfirmedCareFeeComparisonRequestV1 = {
    kind: "care_fee_comparison_request",
    version: 1,
    claimIds,
    claims,
    sourceDocuments: referenced,
    userConfirmedContext: contextValidation.context,
    confirmation: {
      kind: "explicit_pair_confirmation",
      state: "confirmed",
      claimIds,
    },
  };

  return validateConfirmedCareFeeComparisonRequest(request);
};

export const validateConfirmedCareFeeComparisonRequest = (
  value: unknown,
): CareFeeRequestValidation => {
  if (!isRecord(value)) return { valid: false, reason: "malformed_request" };
  if (
    !hasExactKeys(value, [
      "kind",
      "version",
      "claimIds",
      "claims",
      "sourceDocuments",
      "userConfirmedContext",
      "confirmation",
    ])
  ) {
    return { valid: false, reason: "unexpected_field" };
  }
  if (
    value.kind !== "care_fee_comparison_request" ||
    value.version !== 1 ||
    !isStringPair(value.claimIds) ||
    !Array.isArray(value.claims) ||
    value.claims.length !== 2 ||
    !Array.isArray(value.sourceDocuments) ||
    value.sourceDocuments.length === 0 ||
    !Array.isArray(value.userConfirmedContext) ||
    !isRecord(value.confirmation)
  ) {
    return { valid: false, reason: "malformed_request" };
  }
  if (
    !hasExactKeys(value.confirmation, ["kind", "state", "claimIds"]) ||
    value.confirmation.kind !== "explicit_pair_confirmation" ||
    value.confirmation.state !== "confirmed" ||
    !isStringPair(value.confirmation.claimIds)
  ) {
    return { valid: false, reason: "malformed_request" };
  }

  const claims = value.claims as unknown as readonly [FinancialClaim, FinancialClaim];
  const claimIds = value.claimIds;
  if (claimIds[0] === claimIds[1] || claims[0] === claims[1]) {
    return { valid: false, reason: "duplicate_claim" };
  }
  if (
    !isRecord(claims[0]) ||
    !isRecord(claims[1]) ||
    claims[0].id !== claimIds[0] ||
    claims[1].id !== claimIds[1] ||
    !samePair(value.confirmation.claimIds, claimIds)
  ) {
    return { valid: false, reason: "claim_identity_mismatch" };
  }

  const documents = value.sourceDocuments as unknown as readonly SourceDocument[];
  if (
    documents.some((document) => !isRecord(document) || typeof document.id !== "string") ||
    new Set(documents.map(({ id }) => id)).size !== documents.length
  ) {
    return { valid: false, reason: "invalid_source_documents" };
  }
  for (const claim of claims) {
    if (!validateFinancialClaim(claim, documents).valid) {
      return { valid: false, reason: "invalid_claim" };
    }
  }

  const referenced = referencedDocumentsInClaimOrder(claims, documents);
  if (
    !referenced ||
    referenced.length !== documents.length ||
    referenced.some((document, index) => document.id !== documents[index].id)
  ) {
    return { valid: false, reason: "referenced_document_mismatch" };
  }
  if (hasKnownIdentityConflict(claims)) return { valid: false, reason: "known_value_conflict" };

  const contextValidation = validateUserConfirmedCareFeeContext(
    value.userConfirmedContext,
    claims,
  );
  if (!contextValidation.valid) return contextValidation;
  if (getRequiredCareFeeContext(claims, contextValidation.context).length > 0) {
    return { valid: false, reason: "unresolved_context" };
  }

  return {
    valid: true,
    request: value as unknown as ConfirmedCareFeeComparisonRequestV1,
  };
};
