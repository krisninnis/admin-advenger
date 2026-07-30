import type {
  ApprovalProfile,
  ExternalApprovalEvidence,
} from "./types.ts";
import { PROBATE_DRAFT_APPROVAL_PROFILE_ID } from "./probateKnowledgeAuthoring.ts";

export const probateDraftApprovalProfile: ApprovalProfile = {
  profileId: PROBATE_DRAFT_APPROVAL_PROFILE_ID,
  version: "v1",
  label: "Non-production England and Wales probate candidate review profile",
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
    "GOV.UK Applying for probate guide change",
    "HMCTS probate form or service-route change",
    "Administration of Estates Act 1925 affecting provision",
    "Non-Contentious Probate Rules amendment",
    "England and Wales jurisdiction or terminology change",
    "claim wording, qualifier, exception, or prohibited-conclusion change",
  ],
};

// Real review evidence remains external and empty. Synthetic fixtures exist
// only in tests and do not represent human review or approval.
export const probateDraftExternalApprovalEvidence: readonly ExternalApprovalEvidence[] =
  [];
