import {
  type ApprovalProfile,
  type ApprovalRole,
  type AuthoringKnowledgeEntry,
  type EligibilityBlockCode,
  type ExternalApprovalEvidence,
  type HumanReviewWorkflowInputs,
  type ReviewCondition,
  type ValidationIssue,
} from "./types.ts";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasOnlyNonEmptyStrings = (values: readonly string[]): boolean =>
  values.length > 0 && values.every(isNonEmptyString);

const issue = (
  code: ValidationIssue["code"],
  path: string,
  message: string,
): ValidationIssue => ({ code, path, message });

export const EMPTY_HUMAN_REVIEW_WORKFLOW: HumanReviewWorkflowInputs = {
  requests: [],
  reviewerEligibility: [],
  assignments: [],
};

const conditionsAreExplicitlySatisfied = (
  conditions: readonly ReviewCondition[],
): boolean =>
  conditions.length > 0 &&
  conditions.every(
    (condition) =>
      isNonEmptyString(condition.conditionId) &&
      isNonEmptyString(condition.description) &&
      condition.enforcement === "machine_gate" &&
      condition.status === "satisfied" &&
      isNonEmptyString(condition.satisfactionEvidenceReference),
  );

export const reviewDecisionCanSatisfyApproval = (
  evidence: ExternalApprovalEvidence,
): boolean => {
  if (evidence.decision === "approved") {
    return evidence.conditions.length === 0;
  }

  if (evidence.decision === "approved_with_conditions") {
    return conditionsAreExplicitlySatisfied(evidence.conditions);
  }

  return false;
};

export const validateHumanReviewWorkflow = (
  workflow: HumanReviewWorkflowInputs,
  evidence: readonly ExternalApprovalEvidence[],
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const requestIds = new Set<string>();
  const eligibilityIds = new Set<string>();
  const assignmentIds = new Set<string>();

  for (const request of workflow.requests) {
    const exactRevisionParts = request.exactRevision.split("@");
    const valid =
      isNonEmptyString(request.requestId) &&
      isNonEmptyString(request.entryId) &&
      isNonEmptyString(request.exactRevision) &&
      exactRevisionParts.length === 2 &&
      exactRevisionParts[0] === request.entryId &&
      isNonEmptyString(exactRevisionParts[1]) &&
      isNonEmptyString(request.contentDigest) &&
      isNonEmptyString(request.approvalProfileId) &&
      request.requestedRoles.length > 0 &&
      new Set(request.requestedRoles).size === request.requestedRoles.length &&
      hasOnlyNonEmptyStrings(request.evidenceToReview) &&
      isoDatePattern.test(request.requestedAt) &&
      isNonEmptyString(request.requestedByAuthorityId);

    if (!valid || requestIds.has(request.requestId)) {
      issues.push(
        issue(
          "invalid_review_request",
          request.requestId || "reviewRequest",
          "A review request must uniquely bind an entry, exact revision, digest, profile, scope, roles, evidence set, requester authority, and date.",
        ),
      );
    }
    requestIds.add(request.requestId);
  }

  for (const eligibility of workflow.reviewerEligibility) {
    const conflictIsValid =
      (eligibility.conflictDeclaration.status === "none_declared" &&
        eligibility.conflictDeclaration.details === null) ||
      (eligibility.conflictDeclaration.status === "declared" &&
        isNonEmptyString(eligibility.conflictDeclaration.details));
    const datesAreValid =
      isoDatePattern.test(eligibility.validFrom) &&
      (eligibility.validUntil === null ||
        (isoDatePattern.test(eligibility.validUntil) &&
          eligibility.validUntil >= eligibility.validFrom));
    const valid =
      isNonEmptyString(eligibility.eligibilityId) &&
      isNonEmptyString(eligibility.reviewerId) &&
      isNonEmptyString(eligibility.qualificationOrAuthorityBasis) &&
      conflictIsValid &&
      isNonEmptyString(eligibility.reviewScope) &&
      hasOnlyNonEmptyStrings(eligibility.permittedApprovalProfileIds) &&
      eligibility.permittedConsumptionScopes.length > 0 &&
      datesAreValid;

    if (!valid || eligibilityIds.has(eligibility.eligibilityId)) {
      issues.push(
        issue(
          "invalid_reviewer_eligibility",
          eligibility.eligibilityId || "reviewerEligibility",
          "Reviewer eligibility must uniquely record a stable identifier, role, authority basis, conflicts, scope, permitted profiles/scopes, validity, and status.",
        ),
      );
    }
    eligibilityIds.add(eligibility.eligibilityId);
  }

  for (const assignment of workflow.assignments) {
    const acceptanceIsValid =
      assignment.status !== "accepted" ||
      (assignment.acceptedAt !== null &&
        isoDatePattern.test(assignment.acceptedAt));
    const valid =
      isNonEmptyString(assignment.assignmentId) &&
      isNonEmptyString(assignment.requestId) &&
      isNonEmptyString(assignment.reviewerEligibilityId) &&
      isNonEmptyString(assignment.reviewerId) &&
      isNonEmptyString(assignment.reviewScope) &&
      isoDatePattern.test(assignment.assignedAt) &&
      isNonEmptyString(assignment.assignedByAuthorityId) &&
      acceptanceIsValid;

    if (!valid || assignmentIds.has(assignment.assignmentId)) {
      issues.push(
        issue(
          "invalid_review_assignment",
          assignment.assignmentId || "reviewAssignment",
          "A review assignment must uniquely bind a request, eligible reviewer, role, scope, assigning authority, dates, and acceptance status.",
        ),
      );
    }
    assignmentIds.add(assignment.assignmentId);
  }

  for (const record of evidence) {
    if (record.evidenceKind === "synthetic_test") {
      continue;
    }

    const request = workflow.requests.find(
      (candidate) => candidate.requestId === record.reviewRequestId,
    );
    const assignment = workflow.assignments.find(
      (candidate) => candidate.assignmentId === record.reviewAssignmentId,
    );
    const eligibility = assignment
      ? workflow.reviewerEligibility.find(
          (candidate) =>
            candidate.eligibilityId === assignment.reviewerEligibilityId,
        )
      : undefined;

    if (!request || !assignment || !eligibility) {
      issues.push(
        issue(
          "invalid_review_workflow_binding",
          record.evidenceId,
          "Non-synthetic review evidence must resolve to one review request, accepted assignment, and reviewer-eligibility record.",
        ),
      );
    }
  }

  return issues;
};

export type HumanReviewAssessment = {
  satisfied: boolean;
  blockCodes: readonly EligibilityBlockCode[];
};

export const assessHumanReviewEvidence = (
  record: ExternalApprovalEvidence,
  entry: AuthoringKnowledgeEntry,
  profile: ApprovalProfile,
  role: ApprovalRole,
  asOfDate: string,
  workflow: HumanReviewWorkflowInputs,
): HumanReviewAssessment => {
  const codes: EligibilityBlockCode[] = [];

  if (
    record.entryId !== entry.entryId ||
    record.exactRevision !== entry.exactRevision ||
    record.contentDigest !== entry.contentDigest ||
    record.approvalProfileId !== profile.profileId ||
    record.role !== role
  ) {
    codes.push("approval_evidence_invalid");
  }

  if (!reviewDecisionCanSatisfyApproval(record)) {
    if (record.decision === "approved_with_conditions") {
      codes.push("review_conditions_unsatisfied");
    } else {
      codes.push("review_decision_not_approving");
    }
  }

  if (
    (profile.requiresReviewEvidenceExpiry && record.expiresAt === null) ||
    (record.expiresAt !== null && asOfDate > record.expiresAt)
  ) {
    codes.push("review_evidence_expired");
  }

  const request = workflow.requests.find(
    (candidate) => candidate.requestId === record.reviewRequestId,
  );
  if (
    !request ||
    request.status === "draft" ||
    request.status === "withdrawn" ||
    request.entryId !== entry.entryId ||
    request.exactRevision !== entry.exactRevision ||
    request.contentDigest !== entry.contentDigest ||
    request.approvalProfileId !== profile.profileId ||
    request.intendedConsumptionScope !== entry.approvedConsumptionScope ||
    !request.requestedRoles.includes(role) ||
    !request.evidenceToReview.every((reference) =>
      record.evidenceReviewed.includes(reference),
    )
  ) {
    codes.push("review_request_missing");
  }

  const assignment = workflow.assignments.find(
    (candidate) => candidate.assignmentId === record.reviewAssignmentId,
  );
  if (
    !assignment ||
    assignment.status !== "accepted" ||
    assignment.requestId !== record.reviewRequestId ||
    assignment.reviewerId !== record.reviewerId ||
    assignment.role !== role ||
    assignment.reviewScope !== record.reviewScope ||
    assignment.acceptedAt === null ||
    assignment.assignedAt > record.reviewedAt ||
    assignment.acceptedAt > record.reviewedAt
  ) {
    codes.push("review_assignment_missing");
  }

  const eligibility = assignment
    ? workflow.reviewerEligibility.find(
        (candidate) =>
          candidate.eligibilityId === assignment.reviewerEligibilityId,
      )
    : undefined;
  if (
    !eligibility ||
    eligibility.status !== "eligible" ||
    eligibility.reviewerId !== record.reviewerId ||
    eligibility.role !== role ||
    eligibility.reviewerOrganisationId !== record.reviewerOrganisationId ||
    eligibility.qualificationOrAuthorityBasis !==
      record.reviewerQualificationOrAuthorityBasis ||
    eligibility.reviewScope !== record.reviewScope ||
    !eligibility.permittedApprovalProfileIds.includes(profile.profileId) ||
    !eligibility.permittedConsumptionScopes.includes(
      entry.approvedConsumptionScope,
    ) ||
    eligibility.validFrom > record.reviewedAt ||
    (eligibility.validUntil !== null &&
      (record.reviewedAt > eligibility.validUntil ||
        asOfDate > eligibility.validUntil))
  ) {
    codes.push("reviewer_ineligible");
  }

  if (
    record.conflictDeclaration.status !== "none_declared" ||
    record.conflictDeclaration.details !== null ||
    eligibility?.conflictDeclaration.status !== "none_declared" ||
    eligibility.conflictDeclaration.details !== null
  ) {
    codes.push("reviewer_conflict_unresolved");
  }

  const uniqueCodes = [...new Set(codes)];
  return {
    satisfied: uniqueCodes.length === 0,
    blockCodes: uniqueCodes,
  };
};
