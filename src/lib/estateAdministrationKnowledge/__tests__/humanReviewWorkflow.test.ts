import { describe, expect, it } from "vitest";
import {
  deriveRuntimeEligibility,
  recomputeAuthoringContentDigest,
  validateApprovalEvidenceShape,
} from "../governance.ts";
import {
  EMPTY_HUMAN_REVIEW_WORKFLOW,
  reviewDecisionCanSatisfyApproval,
  validateHumanReviewWorkflow,
} from "../humanReviewWorkflow.ts";
import type {
  ActivationManifest,
  ApprovalProfile,
  ApprovalRole,
  AuthoringKnowledgeEntry,
  EligibilityContext,
  ExternalApprovalEvidence,
  HumanReviewWorkflowInputs,
  ReviewCondition,
} from "../types.ts";
import { tellUsOnceSeparateContactAuthoringEntry } from "../walkingSkeletonAuthoring.ts";
import { walkingSkeletonApprovalProfile } from "../walkingSkeletonGovernance.ts";

const asOfDate = "2026-07-30";
const fullReviewedCommit = "a".repeat(40);

const humanReviewProfile: ApprovalProfile = {
  ...walkingSkeletonApprovalProfile,
  profileId: "synthetic-human-review-workflow-profile-v1",
  version: "synthetic-v1",
  label: "Synthetic human-review workflow fixture; never production",
  nonProduction: true,
  allowedEvidenceKinds: ["signed_approval"],
  allowedConsumptionScopes: [
    "estate_administration_hidden_walking_skeleton",
  ],
  requiresValidUntil: true,
  requiresReviewEvidenceExpiry: true,
};

const reviewableEntry = (): AuthoringKnowledgeEntry =>
  recomputeAuthoringContentDigest({
    ...tellUsOnceSeparateContactAuthoringEntry,
    disposition: "approved",
    evidenceConfidence: "high",
    approvalProfileId: humanReviewProfile.profileId,
    freshness: {
      category: "government_service_guidance",
      verifiedAt: asOfDate,
      validUntil: "2026-08-30",
    },
  });

const developmentContext: EligibilityContext = {
  asOfDate,
  jurisdiction: "england_and_wales",
  consumptionScope: "estate_administration_hidden_walking_skeleton",
  productScope: {
    availability: "development_only",
    featureEnabled: true,
    productApproved: true,
    jurisdictionAvailable: true,
  },
  factReadiness: "met",
};

const manifestFor = (entry: AuthoringKnowledgeEntry): ActivationManifest => ({
  manifestRevision: `synthetic-human-review-manifest-${entry.exactRevision}`,
  pins: [
    {
      exactRevision: entry.exactRevision,
      contentDigest: entry.contentDigest,
      consumptionScope: entry.approvedConsumptionScope,
      reason: "Synthetic activation-separation fixture only",
    },
  ],
});

const emptyManifest: ActivationManifest = {
  manifestRevision: "synthetic-human-review-empty-manifest",
  pins: [],
};

type CompleteReviewFixture = {
  entry: AuthoringKnowledgeEntry;
  workflow: HumanReviewWorkflowInputs;
  evidence: readonly ExternalApprovalEvidence[];
};

const completeReviewFixture = (): CompleteReviewFixture => {
  const entry = reviewableEntry();
  const requestId = `synthetic-request-${entry.exactRevision}`;
  const evidenceToReview = [
    `source-snapshot:${entry.sourceSnapshot.snapshotId}`,
    `canonical-digest:${entry.contentDigest}`,
    "synthetic-test-safety-boundaries",
  ];
  const reviewerEligibility = humanReviewProfile.requiredRoles.map((role) => ({
    eligibilityId: `synthetic-eligibility-${role}`,
    reviewerId: `synthetic-reviewer:${role}`,
    role,
    reviewerOrganisationId: null,
    qualificationOrAuthorityBasis: `Synthetic ${role} authority fixture; not a real qualification`,
    conflictDeclaration: {
      status: "none_declared" as const,
      details: null,
    },
    reviewScope: `Synthetic ${role} review of ${entry.exactRevision}`,
    permittedApprovalProfileIds: [humanReviewProfile.profileId],
    permittedConsumptionScopes: [entry.approvedConsumptionScope],
    validFrom: "2026-07-01",
    validUntil: "2026-08-30",
    status: "eligible" as const,
  }));
  const assignments = humanReviewProfile.requiredRoles.map((role) => ({
    assignmentId: `synthetic-assignment-${role}`,
    requestId,
    reviewerEligibilityId: `synthetic-eligibility-${role}`,
    reviewerId: `synthetic-reviewer:${role}`,
    role,
    reviewScope: `Synthetic ${role} review of ${entry.exactRevision}`,
    assignedAt: "2026-07-29",
    assignedByAuthorityId: "synthetic-assignment-authority",
    acceptedAt: "2026-07-29",
    status: "accepted" as const,
  }));
  const workflow: HumanReviewWorkflowInputs = {
    requests: [
      {
        requestId,
        entryId: entry.entryId,
        exactRevision: entry.exactRevision,
        contentDigest: entry.contentDigest,
        approvalProfileId: humanReviewProfile.profileId,
        intendedConsumptionScope: entry.approvedConsumptionScope,
        requestedRoles: humanReviewProfile.requiredRoles,
        evidenceToReview,
        requestedAt: "2026-07-29",
        requestedByAuthorityId: "synthetic-request-authority",
        reReviewReason: null,
        status: "open",
      },
    ],
    reviewerEligibility,
    assignments,
  };
  const evidence: readonly ExternalApprovalEvidence[] =
    humanReviewProfile.requiredRoles.map((role) => ({
      evidenceId: `synthetic-human-record-${role}`,
      evidenceKind: "signed_approval",
      entryId: entry.entryId,
      exactRevision: entry.exactRevision,
      contentDigest: entry.contentDigest,
      approvalProfileId: humanReviewProfile.profileId,
      role,
      decision: "approved",
      reviewRequestId: requestId,
      reviewAssignmentId: `synthetic-assignment-${role}`,
      reviewerId: `synthetic-reviewer:${role}`,
      reviewerOrganisationId: null,
      reviewerQualificationOrAuthorityBasis: `Synthetic ${role} authority fixture; not a real qualification`,
      conflictDeclaration: {
        status: "none_declared",
        details: null,
      },
      reviewScope: `Synthetic ${role} review of ${entry.exactRevision}`,
      reviewedCommit: fullReviewedCommit,
      reviewedAt: asOfDate,
      evidenceReviewed: evidenceToReview,
      findings: [
        `Synthetic ${role} finding for workflow validation only; no human review occurred.`,
      ],
      conditions: [],
      expiresAt: "2026-08-30",
      evidenceReference: `synthetic-signed-record:${role}:${entry.exactRevision}`,
    }));

  return { entry, workflow, evidence };
};

const replaceRoleEvidence = (
  evidence: readonly ExternalApprovalEvidence[],
  role: ApprovalRole,
  update: Partial<ExternalApprovalEvidence>,
): readonly ExternalApprovalEvidence[] =>
  evidence.map((record) =>
    record.role === role ? { ...record, ...update } : record,
  );

const blockCodes = (
  fixture: CompleteReviewFixture,
  overrides: {
    evidence?: readonly ExternalApprovalEvidence[];
    workflow?: HumanReviewWorkflowInputs;
    manifest?: ActivationManifest;
    context?: EligibilityContext;
  } = {},
): readonly string[] => {
  const result = deriveRuntimeEligibility(
    fixture.entry,
    [humanReviewProfile],
    overrides.evidence ?? fixture.evidence,
    overrides.manifest ?? manifestFor(fixture.entry),
    overrides.context ?? developmentContext,
    overrides.workflow ?? fixture.workflow,
  );

  return result.status === "blocked"
    ? result.reasons.map((reason) => reason.code)
    : [];
};

describe("Estate Administration human-review workflow", () => {
  it("validates a complete, explicitly synthetic workflow fixture", () => {
    const fixture = completeReviewFixture();

    expect(
      validateHumanReviewWorkflow(fixture.workflow, fixture.evidence),
    ).toEqual([]);
    expect(validateApprovalEvidenceShape(fixture.evidence)).toEqual([]);
    expect(
      new Set(fixture.evidence.map((record) => record.reviewerId)).size,
    ).toBe(humanReviewProfile.requiredRoles.length);
    expect(
      fixture.evidence.every((record) =>
        record.reviewerId.startsWith("synthetic-reviewer:"),
      ),
    ).toBe(true);
  });

  it("keeps a fully reviewed exact revision unavailable without activation", () => {
    const fixture = completeReviewFixture();

    expect(blockCodes(fixture, { manifest: emptyManifest })).toEqual([
      "not_activated",
    ]);
  });

  it("blocks an activation pin when a required review dimension is missing", () => {
    const fixture = completeReviewFixture();
    const withoutPrivacy = fixture.evidence.filter(
      (record) => record.role !== "privacy",
    );

    expect(blockCodes(fixture, { evidence: withoutPrivacy })).toEqual(
      expect.arrayContaining([
        "approval_evidence_missing",
        "review_dimension_missing",
      ]),
    );
  });

  it.each([
    {
      label: "digest",
      role: "evidence" as const,
      update: { contentDigest: "sha256:mismatched" },
      expected: "approval_evidence_invalid",
    },
    {
      label: "profile",
      role: "domain" as const,
      update: { approvalProfileId: "synthetic-wrong-profile" },
      expected: "approval_evidence_invalid",
    },
    {
      label: "reviewer authority",
      role: "product_safety" as const,
      update: {
        reviewerQualificationOrAuthorityBasis:
          "Synthetic mismatched authority basis",
      },
      expected: "reviewer_ineligible",
    },
    {
      label: "expiry",
      role: "freshness" as const,
      update: { expiresAt: "2026-07-29" },
      expected: "review_evidence_expired",
    },
    {
      label: "required expiry",
      role: "freshness" as const,
      update: { expiresAt: null },
      expected: "review_evidence_expired",
    },
  ])("blocks mismatched $label binding", ({ role, update, expected }) => {
    const fixture = completeReviewFixture();

    expect(
      blockCodes(fixture, {
        evidence: replaceRoleEvidence(fixture.evidence, role, update),
      }),
    ).toContain(expected);
  });

  it("blocks evidence that floats to a different revision or role", () => {
    const fixture = completeReviewFixture();
    const wrongRevision = replaceRoleEvidence(fixture.evidence, "evidence", {
      exactRevision: `${fixture.entry.entryId}@r2`,
    });
    const wrongRole = replaceRoleEvidence(fixture.evidence, "privacy", {
      role: "product_safety",
    });

    expect(blockCodes(fixture, { evidence: wrongRevision })).toContain(
      "review_dimension_missing",
    );
    expect(blockCodes(fixture, { evidence: wrongRole })).toContain(
      "review_dimension_missing",
    );
  });

  it("blocks a request whose revision binding or evidence set does not match", () => {
    const fixture = completeReviewFixture();
    const [request] = fixture.workflow.requests;
    const mismatchedWorkflow: HumanReviewWorkflowInputs = {
      ...fixture.workflow,
      requests: [
        {
          ...request!,
          contentDigest: "sha256:mismatched-request",
        },
      ],
    };

    expect(
      blockCodes(fixture, { workflow: mismatchedWorkflow }),
    ).toContain("review_request_missing");
  });

  it("blocks missing or unaccepted assignments", () => {
    const fixture = completeReviewFixture();
    const withoutAssignments: HumanReviewWorkflowInputs = {
      ...fixture.workflow,
      assignments: [],
    };
    const unaccepted: HumanReviewWorkflowInputs = {
      ...fixture.workflow,
      assignments: fixture.workflow.assignments.map((assignment) =>
        assignment.role === "accessibility"
          ? {
              ...assignment,
              status: "assigned" as const,
              acceptedAt: null,
            }
          : assignment,
      ),
    };

    expect(
      blockCodes(fixture, { workflow: withoutAssignments }),
    ).toContain("review_assignment_missing");
    expect(blockCodes(fixture, { workflow: unaccepted })).toContain(
      "review_assignment_missing",
    );
  });

  it("blocks an ineligible reviewer or declared conflict", () => {
    const fixture = completeReviewFixture();
    const ineligible: HumanReviewWorkflowInputs = {
      ...fixture.workflow,
      reviewerEligibility: fixture.workflow.reviewerEligibility.map(
        (eligibility) =>
          eligibility.role === "domain"
            ? { ...eligibility, status: "ineligible" as const }
            : eligibility,
      ),
    };
    const conflictedEvidence = replaceRoleEvidence(
      fixture.evidence,
      "privacy",
      {
        conflictDeclaration: {
          status: "declared",
          details: "Synthetic conflict fixture only.",
        },
      },
    );

    expect(blockCodes(fixture, { workflow: ineligible })).toContain(
      "reviewer_ineligible",
    );
    expect(
      blockCodes(fixture, { evidence: conflictedEvidence }),
    ).toContain("reviewer_conflict_unresolved");
  });

  it.each(["changes_required", "rejected", "withdrawn"] as const)(
    "blocks the %s review outcome",
    (decision) => {
      const fixture = completeReviewFixture();
      const evidence = replaceRoleEvidence(fixture.evidence, "product_scope", {
        decision,
      });

      expect(blockCodes(fixture, { evidence })).toContain(
        "review_decision_not_approving",
      );
    },
  );

  it("blocks conditional approval until every condition is machine-gated and evidenced", () => {
    const fixture = completeReviewFixture();
    const openCondition: ReviewCondition = {
      conditionId: "synthetic-condition",
      description: "Synthetic condition; no production meaning.",
      enforcement: "machine_gate",
      status: "open",
      satisfactionEvidenceReference: null,
    };
    const manualCondition: ReviewCondition = {
      ...openCondition,
      enforcement: "manual_block",
      status: "satisfied",
      satisfactionEvidenceReference: "synthetic-condition-evidence",
    };
    const satisfiedCondition: ReviewCondition = {
      ...openCondition,
      status: "satisfied",
      satisfactionEvidenceReference: "synthetic-condition-evidence",
    };

    const openEvidence = replaceRoleEvidence(
      fixture.evidence,
      "product_safety",
      {
        decision: "approved_with_conditions",
        conditions: [openCondition],
      },
    );
    const manualEvidence = replaceRoleEvidence(
      fixture.evidence,
      "product_safety",
      {
        decision: "approved_with_conditions",
        conditions: [manualCondition],
      },
    );
    const satisfiedEvidence = replaceRoleEvidence(
      fixture.evidence,
      "product_safety",
      {
        decision: "approved_with_conditions",
        conditions: [satisfiedCondition],
      },
    );

    expect(blockCodes(fixture, { evidence: openEvidence })).toContain(
      "review_conditions_unsatisfied",
    );
    expect(blockCodes(fixture, { evidence: manualEvidence })).toContain(
      "review_conditions_unsatisfied",
    );
    expect(blockCodes(fixture, { evidence: satisfiedEvidence })).toEqual([]);
    expect(
      reviewDecisionCanSatisfyApproval(
        satisfiedEvidence.find(
          (record) => record.role === "product_safety",
        )!,
      ),
    ).toBe(true);
  });

  it("does not let source revalidation or documentation text satisfy human review", () => {
    const sourceRevalidated = reviewableEntry();
    const documentationOnly = recomputeAuthoringContentDigest({
      ...sourceRevalidated,
      authoringOnly: {
        ...sourceRevalidated.authoringOnly,
        privateReviewNotes: [
          "Synthetic documentation says approved; this is not evidence.",
        ],
      },
    });

    const sourceOnlyResult = deriveRuntimeEligibility(
      sourceRevalidated,
      [humanReviewProfile],
      [],
      manifestFor(sourceRevalidated),
      developmentContext,
      EMPTY_HUMAN_REVIEW_WORKFLOW,
    );
    const documentationOnlyResult = deriveRuntimeEligibility(
      documentationOnly,
      [humanReviewProfile],
      [],
      manifestFor(documentationOnly),
      developmentContext,
      EMPTY_HUMAN_REVIEW_WORKFLOW,
    );

    for (const result of [sourceOnlyResult, documentationOnlyResult]) {
      expect(result.status).toBe("blocked");
      if (result.status === "blocked") {
        expect(result.reasons.map((reason) => reason.code)).toEqual(
          expect.arrayContaining([
            "approval_evidence_missing",
            "review_dimension_missing",
          ]),
        );
      }
    }
  });
});
