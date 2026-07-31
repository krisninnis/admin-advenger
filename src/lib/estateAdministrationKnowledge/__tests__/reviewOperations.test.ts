import { describe, expect, it } from "vitest";
import { classifyDecisionDocument } from "../../decisionEngine/classifier.ts";
import {
  projectRuntimeKnowledgeEntry,
  recomputeAuthoringContentDigest,
} from "../governance.ts";
import {
  assessApprovalReadiness,
  buildKnowledgeReviewPacket,
  buildReviewerChecklists,
  buildRuntimeBundleReport,
  compareKnowledgeRevisions,
  prepareActivationCandidate,
  prepareRetirementReport,
  prepareRollbackReport,
  validateApprovalEvidenceForOperations,
} from "../reviewOperations.ts";
import type {
  ActivationManifest,
  ApprovalProfile,
  ApprovalRole,
  AuthoringKnowledgeEntry,
  EligibilityContext,
  ExternalApprovalEvidence,
  GovernedCorpusInputs,
  HumanReviewWorkflowInputs,
  ReviewCondition,
} from "../types.ts";
import { tellUsOnceSeparateContactAuthoringEntry } from "../walkingSkeletonAuthoring.ts";
import {
  buildWalkingSkeletonRuntimeAsset,
  hiddenUnavailableScopeContext,
  walkingSkeletonActivationManifest,
  walkingSkeletonGovernedInputs,
} from "../walkingSkeletonGovernance.ts";
import { probateKnowledgeCandidates } from "../probateKnowledgeAuthoring.ts";

const asOfDate = "2026-07-30";
const reviewedCommit = "b".repeat(40);

const reviewProfile: ApprovalProfile = {
  profileId: "synthetic-review-operations-profile-v1",
  version: "synthetic-v1",
  label: "Synthetic review operations profile; never production",
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
  allowedEvidenceKinds: ["signed_approval"],
  allowedConsumptionScopes: [
    "estate_administration_hidden_walking_skeleton",
  ],
  requiresValidUntil: true,
  requiresReviewEvidenceExpiry: true,
  reReviewTriggers: [
    "GOV.UK Tell Us Once page change",
    "jurisdiction change",
    "claim wording or qualifier change",
  ],
};

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

const emptyManifest: ActivationManifest = {
  manifestRevision: "synthetic-review-operations-empty-manifest",
  pins: [],
};

type Fixture = {
  entry: AuthoringKnowledgeEntry;
  inputs: GovernedCorpusInputs;
  workflow: HumanReviewWorkflowInputs;
  evidence: readonly ExternalApprovalEvidence[];
};

const buildFixture = (
  entryOverrides: Partial<AuthoringKnowledgeEntry> = {},
): Fixture => {
  const entry = recomputeAuthoringContentDigest({
    ...tellUsOnceSeparateContactAuthoringEntry,
    disposition: "approved",
    evidenceConfidence: "high",
    approvalProfileId: reviewProfile.profileId,
    freshness: {
      category: "government_service_guidance",
      verifiedAt: asOfDate,
      validUntil: "2026-08-30",
    },
    ...entryOverrides,
  });
  const requestId = `synthetic-operations-request:${entry.exactRevision}`;
  const evidenceToReview = [
    `source-snapshot:${entry.sourceSnapshot.snapshotId}`,
    `canonical-digest:${entry.contentDigest}`,
    "synthetic-safety-boundaries",
  ];
  const reviewerEligibility = reviewProfile.requiredRoles.map((role) => ({
    eligibilityId: `synthetic-operations-eligibility:${role}`,
    reviewerId: `synthetic-operations-reviewer:${role}`,
    role,
    reviewerOrganisationId: null,
    qualificationOrAuthorityBasis:
      `Synthetic ${role} authority fixture; not a real qualification`,
    conflictDeclaration: {
      status: "none_declared" as const,
      details: null,
    },
    reviewScope: `Synthetic ${role} scope for ${entry.exactRevision}`,
    permittedApprovalProfileIds: [reviewProfile.profileId],
    permittedConsumptionScopes: [entry.approvedConsumptionScope],
    validFrom: "2026-07-01",
    validUntil: "2026-08-30",
    status: "eligible" as const,
  }));
  const assignments = reviewProfile.requiredRoles.map((role) => ({
    assignmentId: `synthetic-operations-assignment:${role}`,
    requestId,
    reviewerEligibilityId: `synthetic-operations-eligibility:${role}`,
    reviewerId: `synthetic-operations-reviewer:${role}`,
    role,
    reviewScope: `Synthetic ${role} scope for ${entry.exactRevision}`,
    assignedAt: "2026-07-29",
    assignedByAuthorityId: "synthetic-operations-assignment-authority",
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
        approvalProfileId: reviewProfile.profileId,
        intendedConsumptionScope: entry.approvedConsumptionScope,
        requestedRoles: reviewProfile.requiredRoles,
        evidenceToReview,
        requestedAt: "2026-07-29",
        requestedByAuthorityId: "synthetic-operations-request-authority",
        reReviewReason: null,
        status: "open",
      },
    ],
    reviewerEligibility,
    assignments,
  };
  const evidence: readonly ExternalApprovalEvidence[] =
    reviewProfile.requiredRoles.map((role) => ({
      evidenceId: `synthetic-operations-evidence:${role}`,
      evidenceKind: "signed_approval",
      entryId: entry.entryId,
      exactRevision: entry.exactRevision,
      contentDigest: entry.contentDigest,
      approvalProfileId: reviewProfile.profileId,
      role,
      decision: "approved",
      reviewRequestId: requestId,
      reviewAssignmentId: `synthetic-operations-assignment:${role}`,
      reviewerId: `synthetic-operations-reviewer:${role}`,
      reviewerOrganisationId: null,
      reviewerQualificationOrAuthorityBasis:
        `Synthetic ${role} authority fixture; not a real qualification`,
      conflictDeclaration: {
        status: "none_declared",
        details: null,
      },
      reviewScope: `Synthetic ${role} scope for ${entry.exactRevision}`,
      reviewedCommit,
      reviewedAt: asOfDate,
      evidenceReviewed: evidenceToReview,
      findings: [
        `Synthetic ${role} finding for test validation only; no human review occurred.`,
      ],
      conditions: [],
      expiresAt: "2026-08-30",
      evidenceReference: `synthetic-operations-reference:${role}`,
    }));

  return {
    entry,
    workflow,
    evidence,
    inputs: {
      entries: [entry],
      profiles: [reviewProfile],
      approvalEvidence: evidence,
      humanReviewWorkflow: workflow,
      activationManifest: emptyManifest,
    },
  };
};

const replaceRoleEvidence = (
  evidence: readonly ExternalApprovalEvidence[],
  role: ApprovalRole,
  update: Partial<ExternalApprovalEvidence>,
): readonly ExternalApprovalEvidence[] =>
  evidence.map((record) =>
    record.role === role ? { ...record, ...update } : record,
  );

const withEvidence = (
  fixture: Fixture,
  evidence: readonly ExternalApprovalEvidence[],
): GovernedCorpusInputs => ({
  ...fixture.inputs,
  approvalEvidence: evidence,
});

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
  return Object.freeze(value);
};

describe("Estate Administration knowledge review operations", () => {
  it("builds an exact-revision packet with four distinct operational sections", () => {
    const fixture = buildFixture();
    const result = buildKnowledgeReviewPacket({
      exactRevision: fixture.entry.exactRevision,
      inputs: fixture.inputs,
      context: developmentContext,
    });

    expect(result.status).toBe("prepared");
    if (result.status !== "prepared") {
      return;
    }

    expect(result.packet.authority).toBe("operational_report_only");
    expect(Object.keys(result.packet)).toEqual([
      "authority",
      "authoringContent",
      "externalApprovalEvidence",
      "activationState",
      "derivedOperationalReporting",
    ]);
    expect(result.packet.authoringContent.entry).toEqual(fixture.entry);
    expect(result.packet.authoringContent.canonicalContentDigest).toBe(
      fixture.entry.contentDigest,
    );
    expect(result.packet.externalApprovalEvidence.records).toEqual(
      fixture.evidence,
    );
    expect(result.packet.activationState.manifestRevision).toBe(
      emptyManifest.manifestRevision,
    );
    expect(
      result.packet.derivedOperationalReporting.runtimeEligibility,
    ).toMatchObject({
      status: "blocked",
      reasons: [expect.objectContaining({ code: "not_activated" })],
    });
  });

  it("fails closed when an exact revision is missing or ambiguous", () => {
    const fixture = buildFixture();
    const missing = buildKnowledgeReviewPacket({
      exactRevision: "ea-ew-missing@r1",
      inputs: fixture.inputs,
      context: developmentContext,
    });
    const ambiguous = buildKnowledgeReviewPacket({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        entries: [fixture.entry, fixture.entry],
      },
      context: developmentContext,
    });

    expect(missing).toMatchObject({
      status: "blocked",
      issues: [expect.objectContaining({ code: "exact_revision_not_found" })],
    });
    expect(ambiguous).toMatchObject({
      status: "blocked",
      issues: [expect.objectContaining({ code: "exact_revision_ambiguous" })],
    });
  });

  it("builds one non-authoritative checklist for every configured role", () => {
    const fixture = buildFixture();
    const evidenceBefore = JSON.stringify(fixture.inputs.approvalEvidence);
    const result = buildReviewerChecklists({
      exactRevision: fixture.entry.exactRevision,
      inputs: fixture.inputs,
      context: developmentContext,
    });

    expect(result.status).toBe("prepared");
    if (result.status !== "prepared") {
      return;
    }

    expect(result.checklists.map((checklist) => checklist.role)).toEqual(
      reviewProfile.requiredRoles,
    );
    expect(
      result.checklists.every(
        (checklist) =>
          checklist.authority === "human_review_prompt_only" &&
          checklist.createsApprovalEvidence === false &&
          checklist.reviewMaterials.length > 0 &&
          checklist.prompts.length > 0,
      ),
    ).toBe(true);
    expect(
      result.checklists
        .find((checklist) => checklist.role === "evidence")
        ?.reviewMaterials.map((material) => material.field),
    ).toContain("sourceSnapshot");
    expect(JSON.stringify(fixture.inputs.approvalEvidence)).toBe(evidenceBefore);
  });

  it("distinguishes human-decision readiness from complete recorded evidence", () => {
    const fixture = buildFixture();
    const awaitingDecision = assessApprovalReadiness({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, []),
      context: developmentContext,
    });
    const complete = assessApprovalReadiness({
      exactRevision: fixture.entry.exactRevision,
      inputs: fixture.inputs,
      context: developmentContext,
    });

    expect(awaitingDecision.state).toBe("ready_for_human_decision");
    expect(awaitingDecision.evidenceReport.missingRequiredRoles).toEqual(
      reviewProfile.requiredRoles,
    );
    expect(complete.state).toBe("recorded_approval_complete");
    expect(complete.authority).toBe("machine_gate_report_only");
  });

  it("reports not_ready for missing configured roles or request bindings", () => {
    const fixture = buildFixture();
    const [request] = fixture.workflow.requests;
    const workflow: HumanReviewWorkflowInputs = {
      ...fixture.workflow,
      requests: [
        {
          ...request!,
          requestedRoles: request!.requestedRoles.filter(
            (role) => role !== "privacy",
          ),
        },
      ],
    };
    const report = assessApprovalReadiness({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        humanReviewWorkflow: workflow,
      },
      context: developmentContext,
    });

    expect(report.state).toBe("not_ready");
    expect(report.issues.map((issue) => issue.code)).toContain(
      "required_review_role_missing",
    );
  });

  it.each([
    ["exact revision", { exactRevision: "ea-ew-other@r9" }],
    ["digest", { contentDigest: "sha256:mismatch" }],
    ["profile", { approvalProfileId: "synthetic-other-profile" }],
  ] as const)("blocks readiness on a %s mismatch", (_label, update) => {
    const fixture = buildFixture();
    const evidence = replaceRoleEvidence(fixture.evidence, "domain", update);
    const report = assessApprovalReadiness({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, evidence),
      context: developmentContext,
    });

    expect(report.state).toBe("not_ready");
    expect(
      report.evidenceReport.invalidRecords.find(
        (record) => record.role === "domain",
      )?.mismatches,
    ).not.toEqual([]);
  });

  it("blocks scope, authority, conflict, reviewed-evidence, and findings failures", () => {
    const fixture = buildFixture();
    const [request] = fixture.workflow.requests;
    const invalidEligibility = fixture.workflow.reviewerEligibility.map(
      (eligibility) =>
        eligibility.role === "domain"
          ? {
              ...eligibility,
              qualificationOrAuthorityBasis: "",
              conflictDeclaration: {
                status: "declared" as const,
                details: "Synthetic unresolved conflict",
              },
            }
          : eligibility,
    );
    const invalidEvidence = replaceRoleEvidence(fixture.evidence, "domain", {
      reviewerQualificationOrAuthorityBasis: "",
      conflictDeclaration: {
        status: "declared",
        details: "Synthetic unresolved conflict",
      },
      evidenceReviewed: [],
      findings: [],
    });
    const report = assessApprovalReadiness({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        approvalEvidence: invalidEvidence,
        humanReviewWorkflow: {
          ...fixture.workflow,
          requests: [
            {
              ...request!,
              intendedConsumptionScope: "estate_administration_public",
            },
          ],
          reviewerEligibility: invalidEligibility,
        },
      },
      context: developmentContext,
    });

    expect(report.state).toBe("not_ready");
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "review_request_mismatch",
        "reviewer_authority_missing",
        "reviewer_conflict_unresolved",
      ]),
    );
    expect(report.evidenceReport.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "approval_evidence_invalid",
        "reviewer_conflict_unresolved",
      ]),
    );
  });

  it("reports expired and non-approving evidence without suppressing governance codes", () => {
    const fixture = buildFixture();
    const evidence = replaceRoleEvidence(fixture.evidence, "freshness", {
      decision: "changes_required",
      expiresAt: "2026-07-29",
    });
    const report = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, evidence),
      context: developmentContext,
    });

    expect(report.status).toBe("blocked");
    expect(report.expiredEvidenceIds).toContain(
      "synthetic-operations-evidence:freshness",
    );
    expect(report.blockingIssueCodes).toEqual(
      expect.arrayContaining([
        "review_decision_not_approving",
        "review_evidence_expired",
      ]),
    );
    expect(report.invalidRecords[0]?.explanations.length).toBeGreaterThan(0);
  });

  it("blocks open conditions and accepts explicit satisfied machine-gated conditions", () => {
    const fixture = buildFixture();
    const openCondition: ReviewCondition = {
      conditionId: "synthetic-condition",
      description: "Synthetic condition for test validation only",
      enforcement: "machine_gate",
      status: "open",
      satisfactionEvidenceReference: null,
    };
    const satisfiedCondition: ReviewCondition = {
      ...openCondition,
      status: "satisfied",
      satisfactionEvidenceReference: "synthetic-condition-evidence",
    };
    const open = replaceRoleEvidence(fixture.evidence, "domain", {
      decision: "approved_with_conditions",
      conditions: [openCondition],
    });
    const satisfied = replaceRoleEvidence(fixture.evidence, "domain", {
      decision: "approved_with_conditions",
      conditions: [satisfiedCondition],
    });

    expect(
      assessApprovalReadiness({
        exactRevision: fixture.entry.exactRevision,
        inputs: withEvidence(fixture, open),
        context: developmentContext,
      }).state,
    ).toBe("not_ready");
    expect(
      assessApprovalReadiness({
        exactRevision: fixture.entry.exactRevision,
        inputs: withEvidence(fixture, satisfied),
        context: developmentContext,
      }).state,
    ).toBe("recorded_approval_complete");
  });

  it.each(["rejected", "changes_required", "withdrawn"] as const)(
    "keeps a %s decision blocked",
    (decision) => {
      const fixture = buildFixture();
      const evidence = replaceRoleEvidence(fixture.evidence, "domain", {
        decision,
      });

      expect(
        assessApprovalReadiness({
          exactRevision: fixture.entry.exactRevision,
          inputs: withEvidence(fixture, evidence),
          context: developmentContext,
        }).state,
      ).toBe("not_ready");
    },
  );

  it("keeps synthetic evidence visibly isolated from real-corpus records", () => {
    const fixture = buildFixture();
    const syntheticProfile: ApprovalProfile = {
      ...reviewProfile,
      allowedEvidenceKinds: ["signed_approval", "synthetic_test"],
    };
    const synthetic = replaceRoleEvidence(fixture.evidence, "domain", {
      evidenceKind: "synthetic_test",
      reviewedCommit: "synthetic-test-commit",
    });
    const report = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...withEvidence(fixture, synthetic),
        profiles: [syntheticProfile],
      },
      context: developmentContext,
    });
    const publicReport = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...withEvidence(fixture, synthetic),
        profiles: [syntheticProfile],
      },
      context: {
        ...developmentContext,
        productScope: {
          ...developmentContext.productScope,
          availability: "public",
        },
      },
    });

    expect(
      report.records.find((record) => record.role === "domain")?.synthetic,
    ).toBe(true);
    expect(publicReport.blockingIssueCodes).toContain(
      "synthetic_approval_non_production_only",
    );
    expect(walkingSkeletonGovernedInputs.approvalEvidence).toEqual([]);
  });

  it("prepares activation only after all non-activation gates pass", () => {
    const complete = buildFixture();
    const draft = buildFixture({ disposition: "draft" });
    const blockedConfidence = buildFixture({
      evidenceConfidence: "blocked",
    });

    const ready = prepareActivationCandidate({
      exactRevision: complete.entry.exactRevision,
      requestedConsumptionScope: complete.entry.approvedConsumptionScope,
      proposedReason: "Synthetic manual-consideration fixture",
      proposedManifestRevision: "synthetic-proposed-manifest",
      inputs: complete.inputs,
      context: developmentContext,
    });
    const draftReport = prepareActivationCandidate({
      exactRevision: draft.entry.exactRevision,
      requestedConsumptionScope: draft.entry.approvedConsumptionScope,
      proposedReason: "Synthetic draft-block fixture",
      proposedManifestRevision: "synthetic-proposed-manifest",
      inputs: draft.inputs,
      context: developmentContext,
    });
    const confidenceReport = prepareActivationCandidate({
      exactRevision: blockedConfidence.entry.exactRevision,
      requestedConsumptionScope:
        blockedConfidence.entry.approvedConsumptionScope,
      proposedReason: "Synthetic confidence-block fixture",
      proposedManifestRevision: "synthetic-proposed-manifest",
      inputs: blockedConfidence.inputs,
      context: developmentContext,
    });

    expect(ready.state).toBe("ready_for_human_manifest_decision");
    expect(ready.currentEligibility).toMatchObject({
      status: "blocked",
      reasons: [expect.objectContaining({ code: "not_activated" })],
    });
    expect(ready.candidateEligibility).toEqual({
      status: "usable",
      reasons: [],
    });
    expect(draftReport.blockingReasons.map((reason) => reason.code)).toContain(
      "not_approved",
    );
    expect(
      confidenceReport.blockingReasons.map((reason) => reason.code),
    ).toContain("evidence_confidence_blocked");
    expect(complete.inputs.activationManifest.pins).toEqual([]);
  });

  it("reports conflicting active revisions without replacing them", () => {
    const fixture = buildFixture();
    const conflictingManifest: ActivationManifest = {
      manifestRevision: "synthetic-conflicting-current-manifest",
      pins: [
        {
          exactRevision: `${fixture.entry.entryId}@r0`,
          contentDigest: "sha256:synthetic-prior-digest",
          consumptionScope: fixture.entry.approvedConsumptionScope,
          reason: "Synthetic existing pin",
        },
      ],
    };
    const report = prepareActivationCandidate({
      exactRevision: fixture.entry.exactRevision,
      requestedConsumptionScope: fixture.entry.approvedConsumptionScope,
      proposedReason: "Synthetic conflict fixture",
      proposedManifestRevision: "synthetic-proposed-manifest",
      inputs: {
        ...fixture.inputs,
        activationManifest: conflictingManifest,
      },
      context: developmentContext,
    });

    expect(report.state).toBe("blocked");
    expect(report.activeRevisionConflicts).toHaveLength(1);
    expect(report.blockingReasons.map((reason) => reason.code)).toContain(
      "conflicting_active_revision",
    );
    expect(conflictingManifest.pins).toHaveLength(1);
  });

  it("preserves every eligibility reason in runtime reporting", () => {
    const fixture = buildFixture({
      disposition: "draft",
      evidenceConfidence: "blocked",
      freshness: {
        category: "government_service_guidance",
        verifiedAt: null,
        validUntil: null,
      },
    });
    const report = buildRuntimeBundleReport({
      buildDate: asOfDate,
      requestedManifestRevision: emptyManifest.manifestRevision,
      inputs: fixture.inputs,
      context: developmentContext,
    });
    const underlying =
      report.bundle.eligibilityByRevision[fixture.entry.exactRevision];

    expect(report.loaderInvoked).toBe(true);
    expect(underlying?.status).toBe("blocked");
    expect(
      underlying?.status === "blocked"
        ? underlying.reasons.map((reason) => reason.code)
        : [],
    ).toEqual(
      expect.arrayContaining([
        "not_approved",
        "evidence_confidence_blocked",
        "freshness_unverifiable",
        "not_activated",
      ]),
    );
    expect(Object.keys(report.blockReasonsByCode)).toEqual(
      expect.arrayContaining([
        "not_approved",
        "evidence_confidence_blocked",
        "freshness_unverifiable",
        "not_activated",
      ]),
    );
    if (underlying?.status === "blocked") {
      for (const reason of underlying.reasons) {
        expect(report.blockReasonsByCode[reason.code]).toContainEqual({
          exactRevision: fixture.entry.exactRevision,
          message: reason.message,
        });
      }
    }
  });

  it("reports a scope-blocked loader as not evaluated without inventing entry reasons", () => {
    const fixture = buildFixture();
    const report = buildRuntimeBundleReport({
      buildDate: asOfDate,
      requestedManifestRevision: emptyManifest.manifestRevision,
      inputs: fixture.inputs,
      context: hiddenUnavailableScopeContext(asOfDate),
    });

    expect(report.loaderInvoked).toBe(false);
    expect(report.evaluatedExactRevisions).toEqual([]);
    expect(report.notEvaluatedExactRevisions).toEqual([
      fixture.entry.exactRevision,
    ]);
    expect(report.scopeBlockReasons.map((reason) => reason.code)).toEqual([
      "public_route_unavailable",
    ]);
    expect(report.blockedEntries).toEqual([]);
  });

  it("never projects operational or reviewer metadata into runtime artifacts", () => {
    const fixture = buildFixture();
    const manifest: ActivationManifest = {
      manifestRevision: "synthetic-runtime-report-manifest",
      pins: [
        {
          exactRevision: fixture.entry.exactRevision,
          contentDigest: fixture.entry.contentDigest,
          consumptionScope: fixture.entry.approvedConsumptionScope,
          reason: "Synthetic runtime projection fixture",
        },
      ],
    };
    const report = buildRuntimeBundleReport({
      buildDate: asOfDate,
      requestedManifestRevision: manifest.manifestRevision,
      inputs: {
        ...fixture.inputs,
        activationManifest: manifest,
      },
      context: developmentContext,
    });
    const serialized = JSON.stringify(report.bundle.artifact);

    expect(report.projectedRuntimeReferences).toEqual([
      fixture.entry.exactRevision,
    ]);
    for (const forbidden of [
      "synthetic-operations-reviewer",
      "qualificationOrAuthorityBasis",
      "findings",
      "conflictDeclaration",
      "evidenceReference",
      "privateReviewNotes",
      "dossierReferences",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(projectRuntimeKnowledgeEntry(fixture.entry)).not.toHaveProperty(
      "authoringOnly",
    );
  });

  it("compares exact revisions and identifies source and wording re-review triggers", () => {
    const fixture = buildFixture();
    const changed = recomputeAuthoringContentDigest({
      ...fixture.entry,
      revision: "r2",
      exactRevision: `${fixture.entry.entryId}@r2`,
      sourceSnapshot: {
        ...fixture.entry.sourceSnapshot,
        sourceRevision: "synthetic-source-r2",
        evidenceText: `${fixture.entry.sourceSnapshot.evidenceText} Synthetic change.`,
      },
      allowedWording: [`${fixture.entry.allowedWording[0]} Synthetic change.`],
      requiredQualifiers: [
        ...fixture.entry.requiredQualifiers,
        "Synthetic qualifier change.",
      ],
    });
    const report = compareKnowledgeRevisions({
      previousRevision: fixture.entry,
      currentRevision: changed,
      approvalProfile: reviewProfile,
    });

    expect(report.status).toBe("compared");
    if (report.status !== "compared") {
      return;
    }
    expect(report.changedFields).toEqual(
      expect.arrayContaining([
        "sourceSnapshot.sourceRevision",
        "sourceSnapshot.evidenceText",
        "allowedWording",
        "requiredQualifiers",
      ]),
    );
    expect(report.reReviewRequired).toBe(true);
    expect(report.applicableReReviewTriggers).toEqual(
      expect.arrayContaining([
        "GOV.UK Tell Us Once page change",
        "claim wording or qualifier change",
      ]),
    );
  });

  it("rejects comparison across different conceptual entries", () => {
    const fixture = buildFixture();
    const other = recomputeAuthoringContentDigest({
      ...fixture.entry,
      entryId: "ea-ew-synthetic-other-001",
      exactRevision: "ea-ew-synthetic-other-001@r1",
    });

    expect(
      compareKnowledgeRevisions({
        previousRevision: fixture.entry,
        currentRevision: other,
        approvalProfile: reviewProfile,
      }),
    ).toMatchObject({
      status: "blocked",
      issues: [
        expect.objectContaining({ code: "conceptual_entry_mismatch" }),
      ],
    });
  });

  it("prepares retirement without mutating the manifest and preserves the offline warning", () => {
    const fixture = buildFixture();
    const manifest: ActivationManifest = {
      manifestRevision: "synthetic-current-manifest",
      pins: [
        {
          exactRevision: fixture.entry.exactRevision,
          contentDigest: fixture.entry.contentDigest,
          consumptionScope: fixture.entry.approvedConsumptionScope,
          reason: "Synthetic current pin",
        },
      ],
    };
    const before = JSON.stringify(manifest);
    const report = prepareRetirementReport({
      manifest,
      exactRevision: fixture.entry.exactRevision,
      proposedManifestRevision: "synthetic-after-retirement",
    });

    expect(report.state).toBe("proposal_prepared");
    expect(report.pinsRemoved).toHaveLength(1);
    expect(report.offlineLimitation).toContain("cannot be remotely revoked");
    expect(JSON.stringify(manifest)).toBe(before);
  });

  it("rejects rollback targets not previously valid and prepares an inert valid proposal", () => {
    const fixture = buildFixture();
    const invalid = prepareRollbackReport({
      manifest: emptyManifest,
      entries: [fixture.entry],
      targetExactRevision: fixture.entry.exactRevision,
      consumptionScope: fixture.entry.approvedConsumptionScope,
      previouslyValidExactRevisions: new Set(),
      proposedManifestRevision: "synthetic-invalid-rollback",
    });
    const valid = prepareRollbackReport({
      manifest: emptyManifest,
      entries: [fixture.entry],
      targetExactRevision: fixture.entry.exactRevision,
      consumptionScope: fixture.entry.approvedConsumptionScope,
      previouslyValidExactRevisions: new Set([fixture.entry.exactRevision]),
      proposedManifestRevision: "synthetic-valid-rollback",
    });

    expect(invalid).toMatchObject({
      state: "blocked",
      targetPreviouslyValid: false,
      issues: [
        expect.objectContaining({
          code: "rollback_target_not_previously_valid",
        }),
      ],
    });
    expect(valid.state).toBe("proposal_prepared");
    expect(valid.targetPreviouslyValid).toBe(true);
    expect(valid.proposedManifest?.pins[0]?.exactRevision).toBe(
      fixture.entry.exactRevision,
    );
    expect(valid.offlineLimitation).toContain("cannot be remotely revoked");
    expect(emptyManifest.pins).toEqual([]);
  });

  it("keeps every operation deterministic and leaves deep-frozen inputs unchanged", () => {
    const fixture = buildFixture();
    const frozenInputs = deepFreeze(
      structuredClone(fixture.inputs) as GovernedCorpusInputs,
    );
    const frozenContext = deepFreeze(
      structuredClone(developmentContext) as EligibilityContext,
    );
    const frozenEntry = frozenInputs.entries[0]!;
    const nextEntry = deepFreeze(
      recomputeAuthoringContentDigest({
        ...structuredClone(frozenEntry),
        revision: "r-deterministic",
        exactRevision: `${frozenEntry.entryId}@r-deterministic`,
        uncertaintyNote: "Synthetic deterministic comparison change.",
      }),
    );
    const frozenManifest = deepFreeze<ActivationManifest>({
      manifestRevision: "synthetic-deterministic-manifest",
      pins: [
        {
          exactRevision: frozenEntry.exactRevision,
          contentDigest: frozenEntry.contentDigest,
          consumptionScope: frozenEntry.approvedConsumptionScope,
          reason: "Synthetic deterministic pin",
        },
      ],
    });
    const before = JSON.stringify({
      frozenInputs,
      frozenContext,
      frozenEntry,
      nextEntry,
      frozenManifest,
    });
    const runEveryOperation = () => [
      buildKnowledgeReviewPacket({
        exactRevision: frozenEntry.exactRevision,
        inputs: frozenInputs,
        context: frozenContext,
      }),
      buildReviewerChecklists({
        exactRevision: frozenEntry.exactRevision,
        inputs: frozenInputs,
        context: frozenContext,
      }),
      assessApprovalReadiness({
        exactRevision: frozenEntry.exactRevision,
        inputs: frozenInputs,
        context: frozenContext,
      }),
      validateApprovalEvidenceForOperations({
        exactRevision: frozenEntry.exactRevision,
        inputs: frozenInputs,
        context: frozenContext,
      }),
      prepareActivationCandidate({
        exactRevision: frozenEntry.exactRevision,
        requestedConsumptionScope: frozenEntry.approvedConsumptionScope,
        proposedReason: "Synthetic deterministic activation proposal",
        proposedManifestRevision: "synthetic-deterministic-activation",
        inputs: frozenInputs,
        context: frozenContext,
      }),
      buildRuntimeBundleReport({
        buildDate: asOfDate,
        requestedManifestRevision:
          frozenInputs.activationManifest.manifestRevision,
        inputs: frozenInputs,
        context: frozenContext,
      }),
      compareKnowledgeRevisions({
        previousRevision: frozenEntry,
        currentRevision: nextEntry,
        approvalProfile: frozenInputs.profiles[0],
      }),
      prepareRetirementReport({
        manifest: frozenManifest,
        exactRevision: frozenEntry.exactRevision,
        proposedManifestRevision: "synthetic-deterministic-retirement",
      }),
      prepareRollbackReport({
        manifest: frozenManifest,
        entries: frozenInputs.entries,
        targetExactRevision: frozenEntry.exactRevision,
        consumptionScope: frozenEntry.approvedConsumptionScope,
        previouslyValidExactRevisions: new Set([
          frozenEntry.exactRevision,
        ]),
        proposedManifestRevision: "synthetic-deterministic-rollback",
      }),
    ];

    expect(JSON.stringify(runEveryOperation())).toBe(
      JSON.stringify(runEveryOperation()),
    );
    expect(
      JSON.stringify({
        frozenInputs,
        frozenContext,
        frozenEntry,
        nextEntry,
        frozenManifest,
      }),
    ).toBe(before);
  });

  it("keeps the real corpus blocked, unprojected, and on the general route", () => {
    const tellUsOnceReadiness = assessApprovalReadiness({
      exactRevision: tellUsOnceSeparateContactAuthoringEntry.exactRevision,
      inputs: walkingSkeletonGovernedInputs,
      context: hiddenUnavailableScopeContext(asOfDate),
    });
    const runtimeReport = buildRuntimeBundleReport({
      buildDate: asOfDate,
      requestedManifestRevision:
        walkingSkeletonActivationManifest.manifestRevision,
      inputs: walkingSkeletonGovernedInputs,
      context: hiddenUnavailableScopeContext(asOfDate),
    });
    const runtimeAsset = buildWalkingSkeletonRuntimeAsset(asOfDate);

    expect(tellUsOnceSeparateContactAuthoringEntry.disposition).toBe("draft");
    expect(tellUsOnceSeparateContactAuthoringEntry.evidenceConfidence).toBe(
      "blocked",
    );
    expect(tellUsOnceReadiness.state).toBe("not_ready");
    expect(
      probateKnowledgeCandidates.every(
        (candidate) =>
          candidate.disposition === "draft" &&
          candidate.evidenceConfidence === "blocked",
      ),
    ).toBe(true);
    expect(walkingSkeletonGovernedInputs.approvalEvidence).toEqual([]);
    expect(walkingSkeletonActivationManifest.pins).toEqual([]);
    expect(runtimeReport.totalAuthoringEntries).toBe(13);
    expect(runtimeReport.usableEntries).toEqual([]);
    expect(runtimeReport.bundle.artifact.entries).toEqual([]);
    expect(runtimeAsset.bundle.artifact.entries).toEqual([]);
    expect(classifyDecisionDocument("Do I need probate?")).toBe(
      "unknown_admin_dispute",
    );
  });

  it("fails a review packet closed while retaining useful sections for malformed governed inputs", () => {
    const fixture = buildFixture();
    const invalidEntry = {
      ...fixture.entry,
      title: "",
    };
    const invalidProfile = {
      ...reviewProfile,
      requiredRoles: [],
    };
    const result = buildKnowledgeReviewPacket({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        entries: [invalidEntry],
        profiles: [invalidProfile],
        humanReviewWorkflow: {
          ...fixture.workflow,
          requests: [
            fixture.workflow.requests[0]!,
            fixture.workflow.requests[0]!,
          ],
        },
      },
      context: developmentContext,
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      return;
    }

    expect(result.packet?.authoringContent.entry).toEqual(invalidEntry);
    expect(
      result.packet?.derivedOperationalReporting.validationIssues.map(
        (issue) => issue.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        "invalid_authoring_entry",
        "invalid_approval_profile",
        "invalid_review_request",
      ]),
    );
  });

  it("surfaces canonical expiry, reviewer conflict, and workflow blockers in role checklists", () => {
    const fixture = buildFixture();
    const conflictedEligibility = fixture.workflow.reviewerEligibility.map(
      (eligibility) =>
        eligibility.role === "domain"
          ? {
              ...eligibility,
              conflictDeclaration: {
                status: "declared" as const,
                details: "Synthetic unresolved conflict.",
              },
            }
          : eligibility,
    );
    const expiredEvidence = replaceRoleEvidence(
      fixture.evidence,
      "freshness",
      { expiresAt: "2026-07-29" },
    );
    const result = buildReviewerChecklists({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        approvalEvidence: expiredEvidence,
        humanReviewWorkflow: {
          ...fixture.workflow,
          reviewerEligibility: conflictedEligibility,
        },
      },
      context: developmentContext,
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      return;
    }

    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "domain")
        ?.currentBlockCodes,
    ).toContain("reviewer_conflict_unresolved");
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "freshness")
        ?.currentBlockCodes,
    ).toContain("review_evidence_expired");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "reviewer_conflict_unresolved",
    );
  });

  it("surfaces blocked confidence, scope, and synthetic-evidence restrictions in checklists", () => {
    const fixture = buildFixture({ evidenceConfidence: "blocked" });
    const syntheticEvidence = replaceRoleEvidence(
      fixture.evidence,
      "evidence",
      { evidenceKind: "synthetic_test" },
    );
    const publicContext: EligibilityContext = {
      ...developmentContext,
      consumptionScope: "estate_administration_public",
      productScope: {
        availability: "public",
        featureEnabled: true,
        productApproved: true,
        jurisdictionAvailable: true,
      },
    };
    const result = buildReviewerChecklists({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, syntheticEvidence),
      context: publicContext,
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      return;
    }
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "activation")
        ?.currentBlockCodes,
    ).toContain("evidence_confidence_blocked");
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "product_scope")
        ?.currentBlockCodes,
    ).toEqual(
      expect.arrayContaining([
        "consumption_scope_mismatch",
        "approval_profile_non_production",
      ]),
    );
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "evidence")
        ?.currentBlockCodes,
    ).toContain("synthetic_approval_non_production_only");
  });

  it("blocks duplicate equivalent and competing approval evidence explicitly", () => {
    const fixture = buildFixture();
    const evidenceRecord = fixture.evidence.find(
      (record) => record.role === "domain",
    )!;
    const equivalentDuplicate = {
      ...evidenceRecord,
      evidenceId: "synthetic-operations-evidence:domain:duplicate",
    };
    const duplicateReport = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, [
        ...fixture.evidence,
        equivalentDuplicate,
      ]),
      context: developmentContext,
    });
    const competingReport = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: withEvidence(fixture, [
        ...fixture.evidence,
        {
          ...equivalentDuplicate,
          evidenceId: "synthetic-operations-evidence:domain:competing",
          decision: "rejected",
        },
      ]),
      context: developmentContext,
    });

    expect(duplicateReport.status).toBe("blocked");
    expect(duplicateReport.duplicateEvidenceRoles).toEqual(["domain"]);
    expect(duplicateReport.competingEvidenceRoles).toEqual([]);
    expect(duplicateReport.operationIssues.map((issue) => issue.code)).toContain(
      "duplicate_approval_evidence",
    );
    expect(competingReport.status).toBe("blocked");
    expect(competingReport.competingEvidenceRoles).toEqual(["domain"]);
    expect(competingReport.operationIssues.map((issue) => issue.code)).toContain(
      "competing_approval_evidence",
    );
  });

  it("never reports evidence complete when the selected profile is duplicate or invalid", () => {
    const fixture = buildFixture();
    const report = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        profiles: [reviewProfile, reviewProfile],
      },
      context: developmentContext,
    });

    expect(report.status).toBe("blocked");
    expect(report.operationIssues.map((issue) => issue.code)).toContain(
      "approval_profile_invalid",
    );
    expect(report.validationIssues.map((issue) => issue.code)).toContain(
      "invalid_approval_profile",
    );
  });

  it("never reports evidence complete for malformed required profile data", () => {
    const fixture = buildFixture();
    const report = validateApprovalEvidenceForOperations({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        profiles: [
          {
            ...reviewProfile,
            requiredRoles: [],
          },
        ],
      },
      context: developmentContext,
    });

    expect(report.status).toBe("blocked");
    expect(report.operationIssues.map((issue) => issue.code)).toContain(
      "approval_profile_invalid",
    );
    expect(report.validationIssues.map((issue) => issue.code)).toContain(
      "invalid_approval_profile",
    );
  });

  it("surfaces reviewer ineligibility and invalid workflow bindings in checklist blocker codes", () => {
    const fixture = buildFixture();
    const reviewerEligibility = fixture.workflow.reviewerEligibility.map(
      (eligibility) =>
        eligibility.role === "privacy"
          ? { ...eligibility, status: "ineligible" as const }
          : eligibility,
    );
    const evidence = replaceRoleEvidence(fixture.evidence, "engine_use", {
      reviewAssignmentId: "synthetic-missing-assignment",
    });
    const result = buildReviewerChecklists({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        approvalEvidence: evidence,
        humanReviewWorkflow: {
          ...fixture.workflow,
          reviewerEligibility,
        },
      },
      context: developmentContext,
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      return;
    }
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "privacy")
        ?.currentBlockCodes,
    ).toContain("reviewer_ineligible");
    expect(
      result.checklists
        ?.find((checklist) => checklist.role === "engine_use")
        ?.currentBlockCodes,
    ).toContain("review_assignment_missing");
  });

  it("fails malformed authoring checklists closed while retaining review material", () => {
    const fixture = buildFixture();
    const malformedEntry = {
      ...fixture.entry,
      title: "",
    };
    const result = buildReviewerChecklists({
      exactRevision: fixture.entry.exactRevision,
      inputs: {
        ...fixture.inputs,
        entries: [malformedEntry],
      },
      context: developmentContext,
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      return;
    }
    expect(result.issues.map((issue) => issue.code)).toContain(
      "authoring_input_invalid",
    );
    expect(result.validationIssues.map((issue) => issue.code)).toContain(
      "invalid_authoring_entry",
    );
    expect(result.checklists).toHaveLength(reviewProfile.requiredRoles.length);
  });

  it("maps every governed field category to configured re-review triggers", () => {
    const fixture = buildFixture();
    const triggerProfile: ApprovalProfile = {
      ...reviewProfile,
      reReviewTriggers: [
        "GOV.UK Applying for probate guide change",
        "exception-only change",
        "prohibited conclusion change",
        "uncertainty change",
        "escalation change",
        "freshness change",
        "scope change",
        "approval profile change",
        "confidence change",
        "disposition change",
      ],
    };
    const changed = recomputeAuthoringContentDigest({
      ...fixture.entry,
      revision: "r-trigger-coverage",
      exactRevision: `${fixture.entry.entryId}@r-trigger-coverage`,
      sourceSnapshot: {
        ...fixture.entry.sourceSnapshot,
        sourceRevision: "synthetic-source-trigger-coverage",
      },
      exceptions: ["Changed exception."],
      prohibitedConclusionClasses: ["changed_prohibited_conclusion"],
      uncertaintyNote: "Changed uncertainty.",
      escalationNotes: ["Changed escalation."],
      freshness: {
        ...fixture.entry.freshness,
        validUntil: "2026-09-30",
      },
      approvedConsumptionScope: "estate_administration_public",
      approvalProfileId: "changed-profile",
      evidenceConfidence: "medium",
      disposition: "retired",
    });
    const report = compareKnowledgeRevisions({
      previousRevision: fixture.entry,
      currentRevision: changed,
      approvalProfile: triggerProfile,
    });

    expect(report.status).toBe("compared");
    if (report.status !== "compared") {
      return;
    }
    expect(report.applicableReReviewTriggers).toEqual(
      triggerProfile.reReviewTriggers,
    );
  });

  it("returns blocked reports instead of throwing for malformed comparison, retirement, and rollback inputs", () => {
    const fixture = buildFixture();
    const malformedRevision = {
      ...fixture.entry,
      sourceSnapshot: null,
    } as unknown as AuthoringKnowledgeEntry;
    const malformedManifest = {
      manifestRevision: "",
      pins: null,
    } as unknown as ActivationManifest;

    expect(() =>
      compareKnowledgeRevisions({
        previousRevision: fixture.entry,
        currentRevision: malformedRevision,
        approvalProfile: reviewProfile,
      }),
    ).not.toThrow();
    expect(
      compareKnowledgeRevisions({
        previousRevision: fixture.entry,
        currentRevision: malformedRevision,
        approvalProfile: reviewProfile,
      }),
    ).toMatchObject({
      status: "blocked",
      validationIssues: [
        expect.objectContaining({ code: "invalid_authoring_entry" }),
      ],
    });
    expect(() =>
      prepareRetirementReport({
        manifest: malformedManifest,
        exactRevision: fixture.entry.exactRevision,
        proposedManifestRevision: "synthetic-malformed-retirement",
      }),
    ).not.toThrow();
    expect(
      prepareRetirementReport({
        manifest: malformedManifest,
        exactRevision: fixture.entry.exactRevision,
        proposedManifestRevision: "synthetic-malformed-retirement",
      }).state,
    ).toBe("blocked");
    expect(() =>
      prepareRollbackReport({
        manifest: malformedManifest,
        entries: [null] as unknown as readonly AuthoringKnowledgeEntry[],
        targetExactRevision: fixture.entry.exactRevision,
        consumptionScope: fixture.entry.approvedConsumptionScope,
        previouslyValidExactRevisions: new Set(),
        proposedManifestRevision: "synthetic-malformed-rollback",
      }),
    ).not.toThrow();
  });
});
