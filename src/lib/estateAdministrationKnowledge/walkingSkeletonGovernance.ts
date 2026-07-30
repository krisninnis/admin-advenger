import {
  buildRuntimeKnowledgeBundle,
  serializeRuntimeKnowledgeArtifact,
  validateGovernedCorpusInputs,
} from "./governance.ts";
import type {
  ActivationManifest,
  ApprovalProfile,
  EligibilityContext,
  ExternalApprovalEvidence,
  GovernedCorpusInputs,
  RuntimeBundleResult,
  ValidationIssue,
} from "./types.ts";
import { EMPTY_HUMAN_REVIEW_WORKFLOW } from "./humanReviewWorkflow.ts";
import { probateKnowledgeCandidates } from "./probateKnowledgeAuthoring.ts";
import {
  probateDraftApprovalProfile,
  probateDraftExternalApprovalEvidence,
} from "./probateKnowledgeGovernance.ts";
import { tellUsOnceSeparateContactAuthoringEntry } from "./walkingSkeletonAuthoring.ts";

export const walkingSkeletonApprovalProfile: ApprovalProfile = {
  profileId: "estate_administration_walking_skeleton_non_production_v1",
  version: "v1",
  label: "Synthetic/non-production Estate Administration walking skeleton",
  nonProduction: true,
  requiredRoles: [
    "evidence",
    "domain",
    "product_safety",
    "accessibility",
    "privacy",
    "product_scope",
    "engine_use",
    "freshness",
    "activation",
  ],
  allowedEvidenceKinds: ["github_pr_review", "signed_approval", "synthetic_test"],
  allowedConsumptionScopes: [
    "estate_administration_hidden_walking_skeleton",
  ],
  requiresValidUntil: true,
  requiresReviewEvidenceExpiry: true,
  reReviewTriggers: [
    "GOV.UK Tell Us Once page change",
    "Tell Us Once organisation-list change",
    "jurisdiction change",
    "claim wording or qualifier change",
  ],
};

// Approval evidence is supplied independently of the authoring entry. It is
// intentionally empty: this repository change does not invent a reviewer or
// claim that the candidate has been approved.
export const walkingSkeletonExternalApprovalEvidence: readonly ExternalApprovalEvidence[] =
  [];

// The real candidate is intentionally unpinned. Tests use synthetic manifests
// to prove exact pinning without treating this task as activation authority.
export const walkingSkeletonActivationManifest: ActivationManifest = {
  manifestRevision: "ea-hidden-manifest-v1-empty",
  pins: [],
};

export const walkingSkeletonGovernedInputs: GovernedCorpusInputs = {
  entries: [
    tellUsOnceSeparateContactAuthoringEntry,
    ...probateKnowledgeCandidates,
  ],
  profiles: [walkingSkeletonApprovalProfile, probateDraftApprovalProfile],
  approvalEvidence: [
    ...walkingSkeletonExternalApprovalEvidence,
    ...probateDraftExternalApprovalEvidence,
  ],
  humanReviewWorkflow: EMPTY_HUMAN_REVIEW_WORKFLOW,
  activationManifest: walkingSkeletonActivationManifest,
};

export const hiddenUnavailableScopeContext = (
  asOfDate: string,
): EligibilityContext => ({
  asOfDate,
  jurisdiction: "england_and_wales",
  consumptionScope: "estate_administration_hidden_walking_skeleton",
  productScope: {
    availability: "unavailable_publicly",
    featureEnabled: false,
    productApproved: false,
    jurisdictionAvailable: true,
  },
  factReadiness: "met",
});

export type WalkingSkeletonBuildAsset = {
  bundle: RuntimeBundleResult;
  validationIssues: readonly ValidationIssue[];
  serializedArtifact: string;
};

export const buildWalkingSkeletonRuntimeAsset = (
  buildDate: string,
): WalkingSkeletonBuildAsset => {
  const validationIssues = validateGovernedCorpusInputs(
    walkingSkeletonGovernedInputs,
  );

  const bundle = buildRuntimeKnowledgeBundle(
    buildDate,
    hiddenUnavailableScopeContext(buildDate),
    walkingSkeletonActivationManifest.manifestRevision,
    () => walkingSkeletonGovernedInputs,
  );

  return {
    bundle,
    validationIssues,
    serializedArtifact: serializeRuntimeKnowledgeArtifact(bundle.artifact),
  };
};
