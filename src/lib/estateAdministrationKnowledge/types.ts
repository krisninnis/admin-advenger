export const EDITORIAL_DISPOSITIONS = [
  "draft",
  "approved",
  "rejected",
  "retired",
] as const;

export type EditorialDisposition = (typeof EDITORIAL_DISPOSITIONS)[number];

export type EstateAdministrationJurisdiction = "england_and_wales";

export type ApprovalRole =
  | "evidence"
  | "domain"
  | "product_safety"
  | "accessibility"
  | "privacy"
  | "product_scope"
  | "engine_use"
  | "freshness"
  | "activation";

export type ApprovalEvidenceKind =
  | "github_pr_review"
  | "signed_approval"
  | "synthetic_test";

export const HUMAN_REVIEW_DECISIONS = [
  "approved",
  "approved_with_conditions",
  "changes_required",
  "rejected",
  "withdrawn",
] as const;

export type HumanReviewDecision = (typeof HUMAN_REVIEW_DECISIONS)[number];

export type ConsumptionScope =
  | "estate_administration_hidden_walking_skeleton"
  | "estate_administration_public";

export type SourceSnapshot = {
  snapshotId: string;
  sourceId: string;
  title: string;
  issuingAuthority: string;
  sourceType: "government_guidance" | "legislation";
  publicLocation: string;
  jurisdiction: EstateAdministrationJurisdiction;
  accessDate: string;
  sourceRevision: string;
  pinpoint: string;
  evidenceKind: "quotation" | "dossier_paraphrase";
  evidenceText: string;
};

export type AuthoringOnlyMetadata = {
  dossierReferences: readonly string[];
  privateReviewNotes: readonly string[];
  semanticChangeReason: string;
};

export type FreshnessPolicy = {
  category: "government_service_guidance" | "legislation";
  verifiedAt: string | null;
  validUntil: string | null;
};

export type AuthoringKnowledgeEntry = {
  entryId: string;
  revision: string;
  exactRevision: string;
  contentDigest: string;
  title: string;
  domain: "estate_administration";
  topic: "tell_us_once" | "probate";
  jurisdiction: EstateAdministrationJurisdiction;
  plainEnglishClaim: string;
  preciseInternalClaim: string;
  sourceSnapshot: SourceSnapshot;
  evidenceConfidence: "high" | "medium" | "low" | "blocked";
  applicabilityConstraints: readonly string[];
  exceptions: readonly string[];
  uncertaintyNote: string;
  allowedWording: readonly string[];
  requiredQualifiers: readonly string[];
  prohibitedConclusionClasses: readonly string[];
  escalationNotes: readonly string[];
  freshness: FreshnessPolicy;
  approvalProfileId: string;
  disposition: EditorialDisposition;
  approvedConsumptionScope: ConsumptionScope;
  supersedes: string | null;
  supersededBy: string | null;
  authoringOnly: AuthoringOnlyMetadata;
};

export type AuthoringKnowledgeEntryInput = Omit<
  AuthoringKnowledgeEntry,
  "exactRevision" | "contentDigest"
>;

export type ApprovalProfile = {
  profileId: string;
  version: string;
  label: string;
  nonProduction: boolean;
  requiredRoles: readonly ApprovalRole[];
  allowedEvidenceKinds: readonly ApprovalEvidenceKind[];
  allowedConsumptionScopes: readonly ConsumptionScope[];
  requiresValidUntil: boolean;
  requiresReviewEvidenceExpiry: boolean;
  reReviewTriggers: readonly string[];
};

export type ReviewRequestStatus = "draft" | "open" | "closed" | "withdrawn";

export type HumanReviewRequest = {
  requestId: string;
  entryId: string;
  exactRevision: string;
  contentDigest: string;
  approvalProfileId: string;
  intendedConsumptionScope: ConsumptionScope;
  requestedRoles: readonly ApprovalRole[];
  evidenceToReview: readonly string[];
  requestedAt: string;
  requestedByAuthorityId: string;
  reReviewReason: string | null;
  status: ReviewRequestStatus;
};

export type ReviewerEligibilityStatus =
  | "eligible"
  | "pending"
  | "ineligible"
  | "withdrawn";

export type ConflictDeclaration = {
  status: "none_declared" | "declared";
  details: string | null;
};

export type ReviewerEligibility = {
  eligibilityId: string;
  reviewerId: string;
  role: ApprovalRole;
  reviewerOrganisationId: string | null;
  qualificationOrAuthorityBasis: string;
  conflictDeclaration: ConflictDeclaration;
  reviewScope: string;
  permittedApprovalProfileIds: readonly string[];
  permittedConsumptionScopes: readonly ConsumptionScope[];
  validFrom: string;
  validUntil: string | null;
  status: ReviewerEligibilityStatus;
};

export type ReviewAssignmentStatus =
  | "assigned"
  | "accepted"
  | "declined"
  | "withdrawn";

export type HumanReviewAssignment = {
  assignmentId: string;
  requestId: string;
  reviewerEligibilityId: string;
  reviewerId: string;
  role: ApprovalRole;
  reviewScope: string;
  assignedAt: string;
  assignedByAuthorityId: string;
  acceptedAt: string | null;
  status: ReviewAssignmentStatus;
};

export type ReviewCondition = {
  conditionId: string;
  description: string;
  enforcement: "machine_gate" | "manual_block";
  status: "open" | "satisfied";
  satisfactionEvidenceReference: string | null;
};

export type HumanReviewWorkflowInputs = {
  requests: readonly HumanReviewRequest[];
  reviewerEligibility: readonly ReviewerEligibility[];
  assignments: readonly HumanReviewAssignment[];
};

export type ExternalApprovalEvidence = {
  evidenceId: string;
  evidenceKind: ApprovalEvidenceKind;
  entryId: string;
  exactRevision: string;
  contentDigest: string;
  approvalProfileId: string;
  role: ApprovalRole;
  decision: HumanReviewDecision;
  reviewRequestId: string;
  reviewAssignmentId: string;
  reviewerId: string;
  reviewerOrganisationId: string | null;
  reviewerQualificationOrAuthorityBasis: string;
  conflictDeclaration: ConflictDeclaration;
  reviewScope: string;
  reviewedCommit: string;
  reviewedAt: string;
  evidenceReviewed: readonly string[];
  findings: readonly string[];
  conditions: readonly ReviewCondition[];
  expiresAt: string | null;
  evidenceReference: string;
};

export type ActivationPin = {
  exactRevision: string;
  contentDigest: string;
  consumptionScope: ConsumptionScope;
  reason: string;
};

export type ActivationManifest = {
  manifestRevision: string;
  pins: readonly ActivationPin[];
};

export type ProductScopeAvailability =
  | "public"
  | "controlled_beta"
  | "development_only"
  | "unavailable_publicly";

export type ProductScopeContext = {
  availability: ProductScopeAvailability;
  featureEnabled: boolean;
  productApproved: boolean;
  jurisdictionAvailable: boolean;
};

export type FactReadiness = "met" | "missing" | "conflicting";

export type EligibilityContext = {
  asOfDate: string;
  jurisdiction: EstateAdministrationJurisdiction;
  consumptionScope: ConsumptionScope;
  productScope: ProductScopeContext;
  factReadiness: FactReadiness;
};

export type EligibilityBlockCode =
  | "public_route_unavailable"
  | "feature_or_beta_scope_unavailable"
  | "product_approval_missing"
  | "not_approved"
  | "rejected"
  | "retired"
  | "superseded"
  | "approval_profile_missing"
  | "approval_profile_invalid"
  | "approval_profile_non_production"
  | "approval_evidence_missing"
  | "approval_evidence_invalid"
  | "review_request_missing"
  | "review_assignment_missing"
  | "reviewer_ineligible"
  | "reviewer_conflict_unresolved"
  | "review_dimension_missing"
  | "review_decision_not_approving"
  | "review_conditions_unsatisfied"
  | "review_evidence_expired"
  | "synthetic_approval_non_production_only"
  | "evidence_confidence_blocked"
  | "not_activated"
  | "incorrect_revision_pin"
  | "conflicting_active_revision"
  | "expired"
  | "freshness_unverifiable"
  | "wrong_jurisdiction"
  | "missing_facts"
  | "conflicting_facts"
  | "source_snapshot_missing"
  | "consumption_scope_mismatch"
  | "prohibited_safety_wording";

export type EligibilityBlockReason = {
  code: EligibilityBlockCode;
  message: string;
};

export type RuntimeEligibility =
  | {
      status: "usable";
      reasons: readonly [];
    }
  | {
      status: "blocked";
      reasons: readonly EligibilityBlockReason[];
    };

export type PublicRuntimeProvenance = {
  sourceTitle: string;
  issuingAuthority: string;
  publicLocation: string;
  pinpoint: string;
};

export type RuntimeKnowledgeEntry = {
  runtimeReferenceId: string;
  entryId: string;
  revision: string;
  approvedClaim: string;
  jurisdiction: EstateAdministrationJurisdiction;
  sourceAccessDate: string;
  publicProvenance: PublicRuntimeProvenance;
  validUntil: string | null;
  requiredQualifiers: readonly string[];
  uncertaintyNote: string;
  prohibitedConclusionClasses: readonly string[];
  consumptionScope: ConsumptionScope;
};

export type ValidationIssueCode =
  | "invalid_authoring_entry"
  | "unsupported_disposition"
  | "invalid_exact_revision"
  | "revision_content_mismatch"
  | "duplicate_exact_revision"
  | "immutable_revision_conflict"
  | "invalid_approval_profile"
  | "invalid_approval_evidence"
  | "invalid_review_request"
  | "invalid_reviewer_eligibility"
  | "invalid_review_assignment"
  | "invalid_review_workflow_binding"
  | "invalid_activation_manifest"
  | "conflicting_active_revision"
  | "prohibited_user_facing_wording";

export type ValidationIssue = {
  code: ValidationIssueCode;
  path: string;
  message: string;
};

export type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      issues: readonly ValidationIssue[];
    };

export type RuntimeKnowledgeArtifact = {
  schemaVersion: "estate-administration-runtime-v1";
  buildDate: string;
  manifestRevision: string;
  entries: readonly RuntimeKnowledgeEntry[];
  offlineCapabilities: {
    remoteRevocation: false;
    sourceChangeDetectionAfterBuild: false;
  };
};

export type RuntimeBundleResult = {
  artifact: RuntimeKnowledgeArtifact;
  eligibilityByRevision: Readonly<Record<string, RuntimeEligibility>>;
  loaderInvoked: boolean;
};

export type GovernedCorpusInputs = {
  entries: readonly AuthoringKnowledgeEntry[];
  profiles: readonly ApprovalProfile[];
  approvalEvidence: readonly ExternalApprovalEvidence[];
  humanReviewWorkflow?: HumanReviewWorkflowInputs;
  activationManifest: ActivationManifest;
};

export type ExplicitRollbackResult =
  | {
      ok: true;
      manifest: ActivationManifest;
    }
  | {
      ok: false;
      reason: "rollback_target_not_previously_valid";
      message: string;
    };

export type EmergencyRetirementResult = {
  manifest: ActivationManifest;
  removed: boolean;
  remoteRevocationPerformed: false;
  message: string;
};

export type ReviewOperationsIssueCode =
  | "exact_revision_not_found"
  | "exact_revision_ambiguous"
  | "conceptual_entry_mismatch"
  | "approval_profile_missing"
  | "approval_profile_invalid"
  | "required_review_role_missing"
  | "review_request_missing"
  | "review_request_ambiguous"
  | "review_request_mismatch"
  | "review_assignment_missing"
  | "reviewer_authority_missing"
  | "reviewer_conflict_unresolved"
  | "approval_evidence_invalid"
  | "duplicate_approval_evidence"
  | "competing_approval_evidence"
  | "authoring_input_invalid"
  | "review_workflow_invalid"
  | "comparison_input_invalid"
  | "activation_manifest_invalid"
  | "activation_conflict"
  | "retirement_target_not_pinned"
  | "rollback_target_not_previously_valid";

export type ReviewOperationsIssue = {
  code: ReviewOperationsIssueCode;
  message: string;
  path: string;
};

export type EvidenceRoleSummary = {
  role: ApprovalRole;
  evidenceIds: readonly string[];
  satisfyingEvidenceIds: readonly string[];
  openConditionIds: readonly string[];
};

export type KnowledgeReviewPacket = {
  authority: "operational_report_only";
  authoringContent: {
    entry: AuthoringKnowledgeEntry;
    canonicalContentDigest: string;
    digestMatchesCanonicalContent: boolean;
    approvalProfile: ApprovalProfile | null;
  };
  externalApprovalEvidence: {
    records: readonly ExternalApprovalEvidence[];
    requests: readonly HumanReviewRequest[];
    reviewerEligibility: readonly ReviewerEligibility[];
    assignments: readonly HumanReviewAssignment[];
    evidenceSummary: readonly EvidenceRoleSummary[];
    openConditions: readonly ReviewCondition[];
  };
  activationState: {
    manifestRevision: string;
    matchingPins: readonly ActivationPin[];
    conflictingPins: readonly ActivationPin[];
  };
  derivedOperationalReporting: {
    requiredReviewerRoles: readonly ApprovalRole[];
    validationIssues: readonly ValidationIssue[];
    runtimeEligibility: RuntimeEligibility;
  };
};

export type KnowledgeReviewPacketResult =
  | {
      status: "prepared";
      packet: KnowledgeReviewPacket;
    }
  | {
      status: "blocked";
      issues: readonly ReviewOperationsIssue[];
      packet?: KnowledgeReviewPacket;
    };

export type ReviewDimensionChecklist = {
  authority: "human_review_prompt_only";
  createsApprovalEvidence: false;
  entryId: string;
  exactRevision: string;
  contentDigest: string;
  approvalProfileId: string;
  intendedConsumptionScope: ConsumptionScope;
  role: ApprovalRole;
  reviewRequestIds: readonly string[];
  assignmentIds: readonly string[];
  reviewerEligibilityIds: readonly string[];
  evidenceReferencesToReview: readonly string[];
  openConditionIds: readonly string[];
  currentBlockCodes: readonly EligibilityBlockCode[];
  reviewMaterials: readonly {
    field: string;
    value: unknown;
  }[];
  requiresValidUntil: boolean;
  requiresReviewEvidenceExpiry: boolean;
  reReviewTriggers: readonly string[];
  prompts: readonly string[];
};

export type ReviewerChecklistResult =
  | {
      status: "prepared";
      checklists: readonly ReviewDimensionChecklist[];
      validationIssues: readonly ValidationIssue[];
    }
  | {
      status: "blocked";
      issues: readonly ReviewOperationsIssue[];
      checklists?: readonly ReviewDimensionChecklist[];
      validationIssues: readonly ValidationIssue[];
    };

export type EvidenceRecordOperationalReport = {
  evidenceId: string;
  role: ApprovalRole;
  synthetic: boolean;
  validity: "valid" | "invalid" | "not_applicable";
  mismatches: readonly string[];
  shapeIssues: readonly ValidationIssue[];
  blockCodes: readonly EligibilityBlockCode[];
  explanations: readonly string[];
  openConditions: readonly ReviewCondition[];
  expired: boolean;
  record: ExternalApprovalEvidence;
};

export type ApprovalEvidenceValidationReport = {
  status: "complete" | "blocked";
  authority: "machine_validation_report_only";
  exactRevision: string;
  validRecords: readonly EvidenceRecordOperationalReport[];
  invalidRecords: readonly EvidenceRecordOperationalReport[];
  records: readonly EvidenceRecordOperationalReport[];
  missingRequiredRoles: readonly ApprovalRole[];
  duplicateEvidenceRoles: readonly ApprovalRole[];
  competingEvidenceRoles: readonly ApprovalRole[];
  expiredEvidenceIds: readonly string[];
  openConditions: readonly ReviewCondition[];
  blockingIssueCodes: readonly EligibilityBlockCode[];
  validationIssues: readonly ValidationIssue[];
  operationIssues: readonly ReviewOperationsIssue[];
};

export type ApprovalReadinessState =
  | "not_ready"
  | "ready_for_human_decision"
  | "recorded_approval_complete";

export type ApprovalReadinessReport = {
  state: ApprovalReadinessState;
  authority: "machine_gate_report_only";
  exactRevision: string;
  issues: readonly ReviewOperationsIssue[];
  validationIssues: readonly ValidationIssue[];
  evidenceReport: ApprovalEvidenceValidationReport;
};

export type ActivationCandidateReport = {
  state: "blocked" | "ready_for_human_manifest_decision";
  authority: "manual_manifest_decision_required";
  exactRevision: string;
  contentDigest: string | null;
  requestedConsumptionScope: ConsumptionScope;
  proposedReason: string;
  currentManifestRevision: string;
  proposedManifestRevision: string;
  proposedPin: ActivationPin | null;
  activeRevisionConflicts: readonly ActivationPin[];
  currentEligibility: RuntimeEligibility;
  candidateEligibility: RuntimeEligibility;
  blockingReasons: readonly EligibilityBlockReason[];
  validationIssues: readonly ValidationIssue[];
  operationIssues: readonly ReviewOperationsIssue[];
};

export type RuntimeBundleBlockedEntry = {
  exactRevision: string;
  reasons: readonly EligibilityBlockReason[];
};

export type RuntimeBundleBlockReasonOccurrence = {
  exactRevision: string;
  message: string;
};

export type RuntimeBundleReport = {
  authority: "runtime_reporting_only";
  totalAuthoringEntries: number;
  evaluatedExactRevisions: readonly string[];
  usableEntries: readonly string[];
  blockedEntries: readonly RuntimeBundleBlockedEntry[];
  notEvaluatedExactRevisions: readonly string[];
  blockReasonsByCode: Readonly<
    Partial<
      Record<
        EligibilityBlockCode,
        readonly RuntimeBundleBlockReasonOccurrence[]
      >
    >
  >;
  scopeBlockReasons: readonly EligibilityBlockReason[];
  projectedRuntimeReferences: readonly string[];
  requestedManifestRevision: string;
  emittedManifestRevision: string;
  buildDate: string;
  loaderInvoked: boolean;
  offlineCapabilities: RuntimeKnowledgeArtifact["offlineCapabilities"];
  validationIssues: readonly ValidationIssue[];
  bundle: RuntimeBundleResult;
};

export type RevisionFieldChange = {
  field: string;
  before: unknown;
  after: unknown;
};

export type RevisionComparisonReport =
  | {
      status: "compared";
      authority: "comparison_report_only";
      entryId: string;
      previousExactRevision: string;
      currentExactRevision: string;
      previousContentDigest: string;
      currentContentDigest: string;
      changes: readonly RevisionFieldChange[];
      changedFields: readonly string[];
      reReviewRequired: boolean;
      configuredReReviewTriggers: readonly string[];
      applicableReReviewTriggers: readonly string[];
    }
  | {
      status: "blocked";
      issues: readonly ReviewOperationsIssue[];
      validationIssues: readonly ValidationIssue[];
    };

export type RetirementPreparationReport = {
  state: "blocked" | "proposal_prepared";
  authority: "manual_manifest_decision_required";
  exactRevision: string;
  currentManifestRevision: string;
  proposedManifestRevision: string;
  pinsRemoved: readonly ActivationPin[];
  pinsRetained: readonly ActivationPin[];
  proposedManifest: ActivationManifest;
  expectedNextBuildEffect: string;
  offlineLimitation: string;
  validationIssues: readonly ValidationIssue[];
  issues: readonly ReviewOperationsIssue[];
};

export type RollbackPreparationReport = {
  state: "blocked" | "proposal_prepared";
  authority: "manual_manifest_decision_required";
  targetExactRevision: string;
  targetPreviouslyValid: boolean;
  currentManifestRevision: string;
  proposedManifestRevision: string;
  pinsRemovedOrReplaced: readonly ActivationPin[];
  proposedManifest: ActivationManifest | null;
  expectedNextBuildEffect: string;
  offlineLimitation: string;
  validationIssues: readonly ValidationIssue[];
  issues: readonly ReviewOperationsIssue[];
};
