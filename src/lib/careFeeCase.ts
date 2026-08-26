import {
  validateConfirmedCareFeeComparisonRequest,
  validateUserConfirmedCareFeeContext,
  type UserConfirmedCareFeeContext,
} from "./careFeeClaimConfirmation";
import type {
  CareFeeComparisonSaveCandidateV1,
  CareFeeResolutionLedger,
  CareFeeResolutionOrigin,
} from "./careFeeSafeComparison";
import {
  COMPARABILITY_REASONS,
  type ComparableApplicability,
} from "./financialClaimComparability";
import type { ReconciliationResult } from "./financialClaimReconciliation";
import { validateFinancialClaim, type FinancialClaim } from "./financialClaims";
import type {
  SourceDocument,
  SourceDocumentIntakeType,
  SourceExtractionMethod,
  SourceReviewState,
} from "./sourceProvenance";

export const CARE_FEE_CASE_TITLE = "Care fee record comparison" as const;

export const CARE_FEE_CASE_SUMMARIES = {
  agreement:
    "The two selected source amounts were safely comparable and agreed for the recorded applicability. This does not establish that either record is correct or that nothing further is due.",
  disagreement:
    "The two selected source amounts were safely comparable and differed for the recorded applicability. This does not establish which amount is correct, whether anyone is at fault, or whether money is owed.",
  not_safely_comparable:
    "The selected source amounts could not be safely compared. The saved blockers show what was missing or unclear; no difference or financial conclusion was produced.",
} as const satisfies Readonly<Record<ReconciliationResult["state"], string>>;

export type CareFeeCaseSourceDocumentSnapshot = {
  readonly id: string;
  readonly displayName: string;
  readonly intakeType: SourceDocumentIntakeType;
  readonly extractionMethod: SourceExtractionMethod;
  readonly order: number;
  readonly warnings: readonly string[];
  readonly confidence?: number;
  readonly reviewState: SourceReviewState;
};

export type CareFeeCaseSourceLocation = {
  readonly sourceSegmentId?: string;
  readonly segmentKind?: "page" | "photo" | "document";
  readonly segmentOrder?: number;
  readonly pageNumber?: number;
  readonly photoNumber?: number;
};

export type CareFeeCaseSourceSnapshot = {
  readonly recordLabel: "Record 1" | "Record 2";
  readonly claim: FinancialClaim;
  readonly document: CareFeeCaseSourceDocumentSnapshot;
  readonly sourceLocation: CareFeeCaseSourceLocation;
  readonly sourceQuote: string;
  readonly reviewState: SourceReviewState;
  readonly extractionConfidence?: number;
};

export type CareFeeComparisonCaseV1 = {
  readonly kind: "care_fee_comparison_case";
  readonly version: 1;
  readonly id: string;
  readonly title: typeof CARE_FEE_CASE_TITLE;
  readonly summary: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly creation: { readonly kind: "explicit_user_save" };
  readonly sourceRecords: readonly [CareFeeCaseSourceSnapshot, CareFeeCaseSourceSnapshot];
  readonly userConfirmedContext: readonly UserConfirmedCareFeeContext[];
  readonly resolutionLedger: CareFeeResolutionLedger;
  readonly reconciliation: ReconciliationResult;
  readonly blockingExplanations: readonly string[];
  readonly safetyBoundary: string;
};

declare const careFeeCaseSnapshotIdentityBrand: unique symbol;

export type CareFeeCaseSnapshotIdentityV1 = string & {
  readonly [careFeeCaseSnapshotIdentityBrand]: "care_fee_case_snapshot_identity_v1";
};

export type CareFeeCaseCreationFailureReason =
  | "invalid_candidate"
  | "stale_source"
  | "missing_source_snapshot";

export type CareFeeCaseCreationOutcome =
  | { readonly status: "created"; readonly caseRecord: CareFeeComparisonCaseV1 }
  | {
      readonly status: "failed";
      readonly reason: CareFeeCaseCreationFailureReason;
      readonly message: string;
    };

export type CareFeeCaseSaveResult =
  | { readonly status: "saved" | "duplicate"; readonly caseId: string }
  | { readonly status: "failed"; readonly message: string };

export type CareFeeCaseDeleteResult =
  | { readonly status: "deleted" }
  | { readonly status: "failed"; readonly message: string };

export type CareFeeCaseValidationFailureReason =
  | "malformed_case"
  | "unexpected_field"
  | "invalid_source_snapshot"
  | "invalid_context"
  | "invalid_resolution_ledger"
  | "invalid_reconciliation";

export type CareFeeCaseValidation =
  | { readonly valid: true; readonly caseRecord: CareFeeComparisonCaseV1 }
  | { readonly valid: false; readonly reason: CareFeeCaseValidationFailureReason };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
};

const nonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validIsoTimestamp = (value: unknown): value is string =>
  nonEmptyString(value) && !Number.isNaN(Date.parse(value));

const sameStringArray = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((value, index) => value === second[index]);

const sameSourceDocument = (first: SourceDocument, second: SourceDocument): boolean =>
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

const candidateSourcesAreCurrent = (
  candidate: CareFeeComparisonSaveCandidateV1,
  current: readonly SourceDocument[],
): boolean =>
  candidate.request.sourceDocuments.every((document) => {
    const matches = current.filter(({ id }) => id === document.id);
    return matches.length === 1 && sameSourceDocument(document, matches[0]);
  });

const validOriginPair = (value: unknown): value is readonly [CareFeeResolutionOrigin, CareFeeResolutionOrigin] =>
  Array.isArray(value) &&
  value.length === 2 &&
  value.every((origin) => origin === "source_derived" || origin === "user_confirmed");

const validResolutionLedger = (value: unknown): value is CareFeeResolutionLedger =>
  isRecord(value) &&
  hasExactKeys(value, ["subject", "provider", "payerRoles", "payeeRoles"]) &&
  validOriginPair(value.subject) &&
  validOriginPair(value.provider) &&
  validOriginPair(value.payerRoles) &&
  validOriginPair(value.payeeRoles);

const validClaimIds = (value: unknown, expected: readonly [string, string]): boolean =>
  Array.isArray(value) &&
  value.length === 2 &&
  value[0] === expected[0] &&
  value[1] === expected[1] &&
  expected[0] !== expected[1];

const isComparableApplicability = (value: unknown): value is ComparableApplicability => {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "same_effective_date") {
    return hasExactKeys(value, ["kind", "effectiveDate"]) && nonEmptyString(value.effectiveDate);
  }
  if (value.kind === "same_explicit_period" || value.kind === "overlapping_explicit_periods") {
    return hasExactKeys(value, ["kind", "periodStart", "periodEnd"]) &&
      nonEmptyString(value.periodStart) &&
      nonEmptyString(value.periodEnd) &&
      value.periodStart <= value.periodEnd;
  }
  return false;
};

const comparabilityReasonSet = new Set<string>(COMPARABILITY_REASONS);

const validReconciliation = (
  value: unknown,
  claims: readonly [FinancialClaim, FinancialClaim],
): value is ReconciliationResult => {
  if (!isRecord(value) || !validClaimIds(value.claimIds, [claims[0].id, claims[1].id])) {
    return false;
  }

  if (value.state === "agreement") {
    return hasExactKeys(value, ["state", "claimIds", "amountMinor", "currency", "cadence", "applicability"]) &&
      value.amountMinor === claims[0].amountMinor &&
      value.amountMinor === claims[1].amountMinor &&
      value.currency === "GBP" &&
      value.cadence === claims[0].cadence &&
      value.cadence === claims[1].cadence &&
      isComparableApplicability(value.applicability);
  }

  if (value.state === "disagreement") {
    const expectedDifference = Math.abs(claims[0].amountMinor - claims[1].amountMinor);
    return hasExactKeys(value, [
      "state",
      "claimIds",
      "amountsMinor",
      "differenceMinor",
      "differenceKind",
      "currency",
      "cadence",
      "applicability",
    ]) &&
      Array.isArray(value.amountsMinor) &&
      value.amountsMinor.length === 2 &&
      value.amountsMinor[0] === claims[0].amountMinor &&
      value.amountsMinor[1] === claims[1].amountMinor &&
      value.differenceMinor === expectedDifference &&
      value.differenceKind === "absolute" &&
      value.currency === "GBP" &&
      value.cadence === claims[0].cadence &&
      value.cadence === claims[1].cadence &&
      isComparableApplicability(value.applicability);
  }

  return value.state === "not_safely_comparable" &&
    hasExactKeys(value, ["state", "claimIds", "reasons"]) &&
    Array.isArray(value.reasons) &&
    value.reasons.length > 0 &&
    value.reasons.every((reason) => comparabilityReasonSet.has(reason as string));
};

const sourceSnapshotFor = (
  claim: FinancialClaim,
  recordIndex: 0 | 1,
  documents: readonly SourceDocument[],
): CareFeeCaseSourceSnapshot | undefined => {
  const document = documents.find(({ id }) => id === claim.provenance.sourceDocumentId);
  if (!document) return undefined;
  const segment = claim.provenance.sourceSegmentId
    ? document.segments.find(({ id }) => id === claim.provenance.sourceSegmentId)
    : undefined;
  if (claim.provenance.sourceSegmentId && !segment) return undefined;

  return {
    recordLabel: recordIndex === 0 ? "Record 1" : "Record 2",
    claim: {
      ...claim,
      provenance: { ...claim.provenance },
    },
    document: {
      id: document.id,
      displayName: document.displayName,
      intakeType: document.intakeType,
      extractionMethod: document.extractionMethod,
      order: document.order,
      warnings: [...document.warnings],
      ...(document.confidence === undefined ? {} : { confidence: document.confidence }),
      reviewState: document.reviewState,
    },
    sourceLocation: {
      ...(segment
        ? {
            sourceSegmentId: segment.id,
            segmentKind: segment.kind,
            segmentOrder: segment.order,
            ...(segment.pageNumber === undefined ? {} : { pageNumber: segment.pageNumber }),
            ...(segment.photoNumber === undefined ? {} : { photoNumber: segment.photoNumber }),
          }
        : {}),
    },
    sourceQuote: claim.provenance.sourceQuote,
    reviewState: claim.provenance.reviewState,
    ...(claim.provenance.extractionConfidence === undefined
      ? {}
      : { extractionConfidence: claim.provenance.extractionConfidence }),
  };
};

const validCandidate = (value: unknown): value is CareFeeComparisonSaveCandidateV1 => {
  if (!isRecord(value) || !hasExactKeys(value, [
    "kind",
    "version",
    "request",
    "resolutionLedger",
    "reconciliation",
    "blockingExplanations",
    "safetyBoundary",
  ])) return false;
  if (value.kind !== "care_fee_comparison_save_candidate" || value.version !== 1) return false;
  const requestValidation = validateConfirmedCareFeeComparisonRequest(value.request);
  if (!requestValidation.valid || !validResolutionLedger(value.resolutionLedger)) return false;
  if (!validReconciliation(value.reconciliation, requestValidation.request.claims)) return false;
  if (!Array.isArray(value.blockingExplanations) ||
      !value.blockingExplanations.every(nonEmptyString) ||
      !nonEmptyString(value.safetyBoundary)) return false;
  return value.reconciliation.state === "not_safely_comparable"
    ? value.blockingExplanations.length > 0
    : value.blockingExplanations.length === 0;
};

const cloneContext = (
  context: readonly UserConfirmedCareFeeContext[],
): readonly UserConfirmedCareFeeContext[] =>
  context.map((item) => ({ ...item, appliesToClaimIds: [...item.appliesToClaimIds] })) as
    readonly UserConfirmedCareFeeContext[];

export const createCareFeeComparisonCase = ({
  candidate,
  currentSourceDocuments,
  id = `care-fee-case-${crypto.randomUUID()}`,
  now = new Date().toISOString(),
}: {
  readonly candidate: unknown;
  readonly currentSourceDocuments: readonly SourceDocument[];
  readonly id?: string;
  readonly now?: string;
}): CareFeeCaseCreationOutcome => {
  if (!validCandidate(candidate) || !nonEmptyString(id) || !validIsoTimestamp(now)) {
    return {
      status: "failed",
      reason: "invalid_candidate",
      message: "This comparison could not be verified for saving. Review and compare the records again.",
    };
  }
  if (!candidateSourcesAreCurrent(candidate, currentSourceDocuments)) {
    return {
      status: "failed",
      reason: "stale_source",
      message: "These records changed or could not be verified. Review and compare them again.",
    };
  }

  const first = sourceSnapshotFor(candidate.request.claims[0], 0, currentSourceDocuments);
  const second = sourceSnapshotFor(candidate.request.claims[1], 1, currentSourceDocuments);
  if (!first || !second) {
    return {
      status: "failed",
      reason: "missing_source_snapshot",
      message: "The selected source excerpts could not be preserved safely. Nothing was saved.",
    };
  }

  return {
    status: "created",
    caseRecord: {
      kind: "care_fee_comparison_case",
      version: 1,
      id,
      title: CARE_FEE_CASE_TITLE,
      summary: CARE_FEE_CASE_SUMMARIES[candidate.reconciliation.state],
      createdAt: now,
      updatedAt: now,
      creation: { kind: "explicit_user_save" },
      sourceRecords: [first, second],
      userConfirmedContext: cloneContext(candidate.request.userConfirmedContext),
      resolutionLedger: {
        subject: [...candidate.resolutionLedger.subject],
        provider: [...candidate.resolutionLedger.provider],
        payerRoles: [...candidate.resolutionLedger.payerRoles],
        payeeRoles: [...candidate.resolutionLedger.payeeRoles],
      },
      reconciliation: structuredClone(candidate.reconciliation),
      blockingExplanations: [...candidate.blockingExplanations],
      safetyBoundary: candidate.safetyBoundary,
    },
  };
};

const snapshotDocument = (snapshot: CareFeeCaseSourceSnapshot): SourceDocument => {
  const segmentId = snapshot.sourceLocation.sourceSegmentId;
  return {
    ...snapshot.document,
    extractedText: snapshot.sourceQuote,
    segments: segmentId
      ? [{
          id: segmentId,
          kind: snapshot.sourceLocation.segmentKind ?? "document",
          order: snapshot.sourceLocation.segmentOrder ?? 1,
          text: snapshot.sourceQuote,
          ...(snapshot.sourceLocation.pageNumber === undefined
            ? {}
            : { pageNumber: snapshot.sourceLocation.pageNumber }),
          ...(snapshot.sourceLocation.photoNumber === undefined
            ? {}
            : { photoNumber: snapshot.sourceLocation.photoNumber }),
        }]
      : [{
          id: `${snapshot.document.id}-saved-excerpt`,
          kind: "document",
          order: 1,
          text: snapshot.sourceQuote,
        }],
  };
};

const validSnapshot = (
  value: unknown,
  expectedLabel: "Record 1" | "Record 2",
): value is CareFeeCaseSourceSnapshot => {
  if (!isRecord(value) || value.recordLabel !== expectedLabel ||
      !isRecord(value.document) || !isRecord(value.sourceLocation) ||
      !hasExactKeys(value, [
        "recordLabel",
        "claim",
        "document",
        "sourceLocation",
        "sourceQuote",
        "reviewState",
        ...(value.extractionConfidence === undefined ? [] : ["extractionConfidence"]),
      ]) ||
      !nonEmptyString(value.sourceQuote) ||
      !["confirmed", "review_required", "unavailable"].includes(value.reviewState as string)) {
    return false;
  }
  const document = value.document;
  if (!hasExactKeys(document, [
        "id",
        "displayName",
        "intakeType",
        "extractionMethod",
        "order",
        "warnings",
        ...(document.confidence === undefined ? [] : ["confidence"]),
        "reviewState",
      ]) ||
      !nonEmptyString(document.id) || !nonEmptyString(document.displayName) ||
      !nonEmptyString(document.intakeType) || !nonEmptyString(document.extractionMethod) ||
      !Number.isSafeInteger(document.order) || !Array.isArray(document.warnings) ||
      !document.warnings.every((warning) => typeof warning === "string") ||
      (document.confidence !== undefined &&
        (typeof document.confidence !== "number" ||
          document.confidence < 0 || document.confidence > 1)) ||
      !["confirmed", "review_required", "unavailable"].includes(document.reviewState as string)) {
    return false;
  }
  const sourceLocation = value.sourceLocation;
  const allowedLocationKeys = new Set([
    "sourceSegmentId",
    "segmentKind",
    "segmentOrder",
    "pageNumber",
    "photoNumber",
  ]);
  if (Object.keys(sourceLocation).some((key) => !allowedLocationKeys.has(key)) ||
      (sourceLocation.sourceSegmentId !== undefined && !nonEmptyString(sourceLocation.sourceSegmentId)) ||
      (sourceLocation.segmentKind !== undefined &&
        !["page", "photo", "document"].includes(sourceLocation.segmentKind as string)) ||
      (sourceLocation.segmentOrder !== undefined && !Number.isSafeInteger(sourceLocation.segmentOrder)) ||
      (sourceLocation.pageNumber !== undefined && !Number.isSafeInteger(sourceLocation.pageNumber)) ||
      (sourceLocation.photoNumber !== undefined && !Number.isSafeInteger(sourceLocation.photoNumber)) ||
      (value.extractionConfidence !== undefined &&
        (typeof value.extractionConfidence !== "number" ||
          value.extractionConfidence < 0 || value.extractionConfidence > 1))) {
    return false;
  }
  const snapshot = value as unknown as CareFeeCaseSourceSnapshot;
  if (snapshot.claim.provenance.sourceQuote !== snapshot.sourceQuote ||
      snapshot.claim.provenance.reviewState !== snapshot.reviewState ||
      snapshot.claim.provenance.extractionConfidence !== snapshot.extractionConfidence ||
      snapshot.claim.provenance.sourceDocumentId !== snapshot.document.id ||
      snapshot.claim.provenance.sourceSegmentId !== snapshot.sourceLocation.sourceSegmentId) {
    return false;
  }
  return validateFinancialClaim(snapshot.claim, [snapshotDocument(snapshot)]).valid;
};

export const validateCareFeeComparisonCase = (value: unknown): CareFeeCaseValidation => {
  if (!isRecord(value)) return { valid: false, reason: "malformed_case" };
  if (!hasExactKeys(value, [
    "kind",
    "version",
    "id",
    "title",
    "summary",
    "createdAt",
    "updatedAt",
    "creation",
    "sourceRecords",
    "userConfirmedContext",
    "resolutionLedger",
    "reconciliation",
    "blockingExplanations",
    "safetyBoundary",
  ])) return { valid: false, reason: "unexpected_field" };
  if (value.kind !== "care_fee_comparison_case" || value.version !== 1 ||
      !nonEmptyString(value.id) || value.title !== CARE_FEE_CASE_TITLE ||
      !validIsoTimestamp(value.createdAt) || !validIsoTimestamp(value.updatedAt) ||
      !isRecord(value.creation) || !hasExactKeys(value.creation, ["kind"]) ||
      value.creation.kind !== "explicit_user_save" ||
      !Array.isArray(value.sourceRecords) || value.sourceRecords.length !== 2) {
    return { valid: false, reason: "malformed_case" };
  }
  if (!validSnapshot(value.sourceRecords[0], "Record 1") ||
      !validSnapshot(value.sourceRecords[1], "Record 2")) {
    return { valid: false, reason: "invalid_source_snapshot" };
  }
  const claims = [value.sourceRecords[0].claim, value.sourceRecords[1].claim] as const;
  const context = validateUserConfirmedCareFeeContext(value.userConfirmedContext, claims);
  if (!context.valid) return { valid: false, reason: "invalid_context" };
  if (!validResolutionLedger(value.resolutionLedger)) {
    return { valid: false, reason: "invalid_resolution_ledger" };
  }
  if (!validReconciliation(value.reconciliation, claims) ||
      value.summary !== CARE_FEE_CASE_SUMMARIES[value.reconciliation.state] ||
      !Array.isArray(value.blockingExplanations) ||
      !value.blockingExplanations.every(nonEmptyString) ||
      !nonEmptyString(value.safetyBoundary) ||
      (value.reconciliation.state === "not_safely_comparable"
        ? value.blockingExplanations.length === 0
        : value.blockingExplanations.length !== 0)) {
    return { valid: false, reason: "invalid_reconciliation" };
  }
  return { valid: true, caseRecord: value as unknown as CareFeeComparisonCaseV1 };
};

const canonicalSnapshotValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalSnapshotValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalSnapshotValue(value[key])]),
  );
};

/**
 * Creates a transient identity for the complete immutable saved-case snapshot.
 * The returned value must stay in component memory and must not be persisted or logged.
 */
export const createCareFeeCaseSnapshotIdentity = (
  caseRecord: CareFeeComparisonCaseV1,
): CareFeeCaseSnapshotIdentityV1 =>
  JSON.stringify(canonicalSnapshotValue(caseRecord)) as CareFeeCaseSnapshotIdentityV1;

const canonicalContext = (context: readonly UserConfirmedCareFeeContext[]) =>
  [...context].sort((first, second) =>
    JSON.stringify(first).localeCompare(JSON.stringify(second)),
  );

const canonicalCaseContent = (caseRecord: CareFeeComparisonCaseV1): string =>
  JSON.stringify({
    sourceRecords: caseRecord.sourceRecords,
    userConfirmedContext: canonicalContext(caseRecord.userConfirmedContext),
    resolutionLedger: caseRecord.resolutionLedger,
    reconciliation: caseRecord.reconciliation,
    blockingExplanations: caseRecord.blockingExplanations,
    safetyBoundary: caseRecord.safetyBoundary,
  });

export const findDuplicateCareFeeCase = (
  cases: readonly CareFeeComparisonCaseV1[],
  candidate: CareFeeComparisonCaseV1,
): CareFeeComparisonCaseV1 | undefined => {
  const key = canonicalCaseContent(candidate);
  return cases.find((caseRecord) => canonicalCaseContent(caseRecord) === key);
};

export const hydrateCareFeeComparisonCases = (value: unknown): CareFeeComparisonCaseV1[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const validation = validateCareFeeComparisonCase(item);
        return validation.valid ? [validation.caseRecord] : [];
      })
    : [];

export const formatCareFeeMinorAmount = (amountMinor: number, currency = "GBP"): string => {
  const amount = (amountMinor / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "GBP" ? `GBP ${amount}` : `${amount} ${currency}`;
};

export const formatCareFeeApplicability = (value: ComparableApplicability): string => {
  if (value.kind === "same_effective_date") return `Same effective date: ${value.effectiveDate}`;
  if (value.kind === "same_explicit_period") {
    return `Same stated period: ${value.periodStart} to ${value.periodEnd}`;
  }
  return `Overlapping stated period: ${value.periodStart} to ${value.periodEnd}`;
};
