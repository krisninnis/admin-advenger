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
