import {
  createCareFeeCaseSnapshotIdentity,
  validateCareFeeComparisonCase,
  type CareFeeCaseSnapshotIdentityV1,
  type CareFeeComparisonCaseV1,
} from "./careFeeCase";
import {
  buildCareFeePreparedMessageStatements,
  createCareFeeDraftAudit,
  renderCareFeePreparedMessageStatements,
  validateCareFeeDraftPreparationRequest,
  type CareFeeDraftSourceFactReferenceV1,
  type CareFeeDraftUserConfirmedFactReferenceV1,
  type CareFeePreparedDraftV1,
  type CareFeePreparedMessageStatementV1,
  type CareFeePreparedStatementSupportReferenceV1,
  type ValidatedCareFeeDraftPreparationContextV1,
} from "./careFeeDraftPreparation";

export const CARE_FEE_PREPARED_MESSAGE_SNAPSHOT_STATUSES = [
  "matches_saved_snapshot",
  "invalid_saved_case",
  "case_identity_mismatch",
  "case_snapshot_mismatch",
  "prepared_output_mismatch",
  "audit_mismatch",
] as const;

export type CareFeePreparedMessageSnapshotStatusV1 =
  (typeof CARE_FEE_PREPARED_MESSAGE_SNAPSHOT_STATUSES)[number];

export type CareFeePreparedMessageEditStateV1 = {
  readonly subject: "unchanged" | "edited";
  readonly body: "unchanged" | "edited";
};

export type CareFeePreparedMessageEvidenceReviewV1 = {
  readonly kind: "care_fee_prepared_message_evidence_review";
  readonly version: 1;
  readonly draftId: string;
  readonly caseId: string;
  readonly templateVersion: 1;
  /** Transient internal value. Never persist, render, log, or export. */
  readonly preparedAgainstSnapshotIdentity: CareFeeCaseSnapshotIdentityV1;
  readonly savedSnapshotMatchStatus: CareFeePreparedMessageSnapshotStatusV1;
  readonly preparedStatements: readonly CareFeePreparedMessageStatementV1[];
  readonly statementSupportReferences: readonly CareFeePreparedStatementSupportReferenceV1[];
  readonly supportingContextReferences: {
    readonly sourceDocumentReferences: readonly CareFeeDraftSourceFactReferenceV1[];
    readonly userConfirmedReferences: readonly CareFeeDraftUserConfirmedFactReferenceV1[];
  };
  readonly editState: CareFeePreparedMessageEditStateV1;
  readonly safetyBoundary: "prepared_version_evidence_review_only_no_send";
};

export type CreateCareFeePreparedMessageEvidenceReviewRequestV1 = {
  readonly currentSavedCase: unknown;
  readonly preparedDraft: CareFeePreparedDraftV1;
  readonly preparedContext: ValidatedCareFeeDraftPreparationContextV1;
  readonly preparedAgainstSnapshotIdentity: CareFeeCaseSnapshotIdentityV1;
  readonly editedSubject: string;
  readonly editedBody: string;
};

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalValue(record[key])]),
  );
};

const sameValue = (first: unknown, second: unknown): boolean =>
  JSON.stringify(canonicalValue(first)) === JSON.stringify(canonicalValue(second));

const cloneSupportReference = (
  reference: CareFeePreparedStatementSupportReferenceV1,
): CareFeePreparedStatementSupportReferenceV1 => {
  if (reference.partition === "user_confirmed_fact") {
    return { ...reference, appliesToClaimIds: [...reference.appliesToClaimIds] };
  }
  if (reference.partition === "derived_comparison_fact") {
    return { ...reference, claimIds: [...reference.claimIds] };
  }
  return { ...reference };
};

const cloneStatements = (
  statements: readonly CareFeePreparedMessageStatementV1[],
): readonly CareFeePreparedMessageStatementV1[] => statements.map((statement) => ({
  ...statement,
  supportReferences: statement.supportReferences.map(cloneSupportReference),
}));

const sourceReferenceResolutionCount = (
  reference: CareFeeDraftSourceFactReferenceV1,
  caseRecord: CareFeeComparisonCaseV1,
): number => caseRecord.sourceRecords.filter((record) =>
  record.recordLabel === reference.recordLabel &&
  record.claim.id === reference.claimId &&
  record.document.id === reference.sourceDocumentId &&
  record.sourceLocation.sourceSegmentId === reference.sourceSegmentId &&
  (reference.field !== "amount_minor" || Number.isSafeInteger(record.claim.amountMinor)) &&
  (reference.field !== "cadence" || typeof record.claim.cadence === "string") &&
  (reference.field !== "document_reference" || record.document.displayName.length > 0)).length;

const userConfirmedReferenceResolutionCount = (
  reference: CareFeeDraftUserConfirmedFactReferenceV1,
  caseRecord: CareFeeComparisonCaseV1,
): number => caseRecord.userConfirmedContext.filter((context, index) =>
  index === reference.contextIndex &&
  context.dimension === reference.dimension &&
  sameValue(context.appliesToClaimIds, reference.appliesToClaimIds)).length;

const derivedReferenceResolves = (
  reference: Extract<CareFeePreparedStatementSupportReferenceV1, {
    readonly partition: "derived_comparison_fact";
  }>,
  caseRecord: CareFeeComparisonCaseV1,
): boolean => {
  const reconciliation = caseRecord.reconciliation;
  if (!sameValue(reconciliation.claimIds, reference.claimIds)) return false;
  if (reference.field === "state") return true;
  if (reconciliation.state === "agreement") {
    return ["amount_minor", "currency", "cadence", "applicability"].includes(reference.field);
  }
  if (reconciliation.state === "disagreement") {
    return [
      "amounts_minor",
      "difference_minor",
      "difference_kind",
      "currency",
      "cadence",
      "applicability",
    ].includes(reference.field);
  }
  return ["reasons", "blocking_explanations"].includes(reference.field);
};

const supportReferenceResolutionCount = (
  reference: CareFeePreparedStatementSupportReferenceV1,
  caseRecord: CareFeeComparisonCaseV1,
  preparedDraft: CareFeePreparedDraftV1,
): number => {
  if (reference.partition === "source_fact") {
    return sourceReferenceResolutionCount(reference, caseRecord);
  }
  if (reference.partition === "user_confirmed_fact") {
    return userConfirmedReferenceResolutionCount(reference, caseRecord);
  }
  if (reference.partition === "derived_comparison_fact") {
    return derivedReferenceResolves(reference, caseRecord) ? 1 : 0;
  }
  return preparedDraft.recipient?.origin === "user_entered_drafting_input" ? 1 : 0;
};

const statementReferencesAreValid = (
  statement: CareFeePreparedMessageStatementV1,
  caseRecord: CareFeeComparisonCaseV1,
  preparedDraft: CareFeePreparedDraftV1,
): boolean => {
  const partitions = statement.supportReferences.map(({ partition }) => partition);
  if (statement.classification === "adminavenger_template_wording") {
    return partitions.length === 0;
  }
  if (statement.classification === "source_grounded_statement") {
    if (partitions.length === 0 || partitions.some((partition) => partition !== "source_fact")) {
      return false;
    }
  } else if (statement.classification === "user_confirmed_input") {
    if (partitions.length === 0 || partitions.some((partition) => partition !== "user_confirmed_fact")) {
      return false;
    }
  } else if (statement.classification === "derived_comparison_statement") {
    if (partitions.length === 0 || partitions.some((partition) => partition !== "derived_comparison_fact")) {
      return false;
    }
  } else if (statement.classification === "user_entered_recipient") {
    if (partitions.length !== 1 || partitions[0] !== "user_entered_drafting_input") return false;
  } else {
    return false;
  }
  return statement.supportReferences.every(
    (reference) => supportReferenceResolutionCount(reference, caseRecord, preparedDraft) === 1,
  );
};

const statusOf = (
  request: CreateCareFeePreparedMessageEvidenceReviewRequestV1,
): CareFeePreparedMessageSnapshotStatusV1 => {
  const caseValidation = validateCareFeeComparisonCase(request.currentSavedCase);
  if (!caseValidation.valid) return "invalid_saved_case";
  const caseRecord = caseValidation.caseRecord;
  if (caseRecord.id !== request.preparedDraft.caseId ||
      caseRecord.id !== request.preparedContext.caseId ||
      request.preparedDraft.version !== 1) {
    return "case_identity_mismatch";
  }
  if (createCareFeeCaseSnapshotIdentity(caseRecord) !== request.preparedAgainstSnapshotIdentity) {
    return "case_snapshot_mismatch";
  }

  if (!Array.isArray(request.preparedDraft.preparedStatements)) {
    return "prepared_output_mismatch";
  }
  const rendered = renderCareFeePreparedMessageStatements(request.preparedDraft.preparedStatements);
  if (!rendered || rendered.subject !== request.preparedDraft.preparedSubject ||
      rendered.body !== request.preparedDraft.preparedBody) {
    return "prepared_output_mismatch";
  }

  const validation = validateCareFeeDraftPreparationRequest({
    kind: "care_fee_draft_preparation_request",
    version: 1,
    savedCase: caseRecord,
    intent: request.preparedDraft.intent,
    ...(request.preparedDraft.recipient
      ? { recipient: request.preparedDraft.recipient }
      : {}),
  });
  if (!validation.valid) return "audit_mismatch";
  const expectedStatements = buildCareFeePreparedMessageStatements(validation.context);
  if (!expectedStatements ||
      !sameValue(validation.context, request.preparedContext) ||
      !sameValue(expectedStatements, request.preparedDraft.preparedStatements) ||
      !sameValue(createCareFeeDraftAudit(validation.context), request.preparedDraft.audit) ||
      request.preparedDraft.safetyBoundary !== "preparation_only_no_send_no_claim_conclusion" ||
      !request.preparedDraft.preparedStatements.every((statement) =>
        statementReferencesAreValid(statement, caseRecord, request.preparedDraft))) {
    return "audit_mismatch";
  }
  return "matches_saved_snapshot";
};

export const createCareFeePreparedMessageEvidenceReview = (
  request: CreateCareFeePreparedMessageEvidenceReviewRequestV1,
): CareFeePreparedMessageEvidenceReviewV1 => {
  const preparedStatements = Array.isArray(request.preparedDraft.preparedStatements)
    ? cloneStatements(request.preparedDraft.preparedStatements)
    : [];
  return {
    kind: "care_fee_prepared_message_evidence_review",
    version: 1,
    draftId: request.preparedDraft.id,
    caseId: request.preparedDraft.caseId,
    templateVersion: request.preparedDraft.audit.templateVersion,
    preparedAgainstSnapshotIdentity: request.preparedAgainstSnapshotIdentity,
    savedSnapshotMatchStatus: statusOf(request),
    preparedStatements,
    statementSupportReferences: preparedStatements.flatMap((statement) =>
      statement.supportReferences.map(cloneSupportReference)),
    supportingContextReferences: {
      sourceDocumentReferences: request.preparedDraft.audit.sourceFactReferences
        .filter((reference) => reference.field === "document_reference")
        .map((reference) => ({ ...reference })),
      userConfirmedReferences: request.preparedDraft.audit.userConfirmedFactReferences
        .map((reference) => ({
          ...reference,
          appliesToClaimIds: [...reference.appliesToClaimIds],
        })),
    },
    editState: {
      subject: request.editedSubject === request.preparedDraft.preparedSubject ? "unchanged" : "edited",
      body: request.editedBody === request.preparedDraft.preparedBody ? "unchanged" : "edited",
    },
    safetyBoundary: "prepared_version_evidence_review_only_no_send",
  };
};
