import { describe, expect, it } from "vitest";
import { classifyDecisionDocument } from "../../decisionEngine/classifier.ts";
import { analyseDecisionProblem } from "../../decisionEngine/decisionEngine.ts";
import {
  deriveRuntimeEligibility,
  recomputeAuthoringContentDigest,
  validateAuthoringKnowledgeEntry,
  validateAuthoringRegistry,
} from "../governance.ts";
import { probateKnowledgeCandidates } from "../probateKnowledgeAuthoring.ts";
import {
  probateDraftApprovalProfile,
  probateDraftExternalApprovalEvidence,
} from "../probateKnowledgeGovernance.ts";
import type {
  ActivationManifest,
  ApprovalRole,
  AuthoringKnowledgeEntry,
  EligibilityContext,
  ExternalApprovalEvidence,
} from "../types.ts";
import {
  buildWalkingSkeletonRuntimeAsset,
  walkingSkeletonActivationManifest,
} from "../walkingSkeletonGovernance.ts";

const asOfDate = "2026-07-30";

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

const reviewableCandidate = (
  candidate = probateKnowledgeCandidates[0]!,
): AuthoringKnowledgeEntry =>
  recomputeAuthoringContentDigest({
    ...candidate,
    disposition: "approved",
    evidenceConfidence: "high",
    freshness: {
      ...candidate.freshness,
      validUntil: "2026-08-30",
    },
  });

const syntheticEvidenceFor = (
  candidate: AuthoringKnowledgeEntry,
  roles: readonly ApprovalRole[] = probateDraftApprovalProfile.requiredRoles,
): readonly ExternalApprovalEvidence[] =>
  roles.map((role) => ({
    evidenceId: `synthetic-probate-${role}-${candidate.exactRevision}`,
    evidenceKind: "synthetic_test",
    entryId: candidate.entryId,
    exactRevision: candidate.exactRevision,
    contentDigest: candidate.contentDigest,
    approvalProfileId: probateDraftApprovalProfile.profileId,
    role,
    decision: "approved",
    reviewRequestId: `synthetic-probate-request-${candidate.exactRevision}`,
    reviewAssignmentId: `synthetic-probate-assignment-${role}-${candidate.exactRevision}`,
    reviewerId: `synthetic-probate-reviewer:${role}`,
    reviewerOrganisationId: null,
    reviewerQualificationOrAuthorityBasis:
      "Synthetic probate fixture authority only; not a human qualification.",
    conflictDeclaration: {
      status: "none_declared",
      details: null,
    },
    reviewScope: `Synthetic probate ${role} fixture only`,
    reviewedCommit: "synthetic-probate-test-commit",
    reviewedAt: asOfDate,
    evidenceReviewed: [
      `synthetic-probate-source:${candidate.sourceSnapshot.snapshotId}`,
      `synthetic-probate-digest:${candidate.contentDigest}`,
    ],
    findings: [
      "Synthetic probate finding only; no human review or approval occurred.",
    ],
    conditions: [],
    expiresAt: "2026-08-30",
    evidenceReference: `synthetic-probate:${role}:${candidate.exactRevision}`,
  }));

const manifestFor = (
  candidate: AuthoringKnowledgeEntry,
): ActivationManifest => ({
  manifestRevision: `synthetic-probate-manifest-${candidate.exactRevision}`,
  pins: [
    {
      exactRevision: candidate.exactRevision,
      contentDigest: candidate.contentDigest,
      consumptionScope: candidate.approvedConsumptionScope,
      reason: "Synthetic probate activation-boundary fixture only",
    },
  ],
});

const blockCodes = (
  candidate: AuthoringKnowledgeEntry,
  evidence: readonly ExternalApprovalEvidence[],
  manifest: ActivationManifest,
): readonly string[] => {
  const result = deriveRuntimeEligibility(
    candidate,
    [probateDraftApprovalProfile],
    evidence,
    manifest,
    developmentContext,
  );

  return result.status === "blocked"
    ? result.reasons.map((reason) => reason.code)
    : [];
};

describe("Estate Administration probate knowledge candidates", () => {
  it("creates the expected atomic England and Wales candidate inventory", () => {
    expect(
      probateKnowledgeCandidates.map((candidate) => candidate.entryId),
    ).toEqual([
      "ea-ew-probate-meaning-001",
      "ea-ew-probate-grant-types-001",
      "ea-ew-probate-personal-representative-term-001",
      "ea-ew-probate-executor-ordinary-applicant-001",
      "ea-ew-probate-no-will-ordinary-applicant-001",
      "ea-ew-probate-grant-need-institution-rules-001",
      "ea-ew-probate-joint-assets-caution-001",
      "ea-ew-probate-preapplication-sequence-001",
      "ea-ew-probate-preparation-information-001",
      "ea-ew-probate-application-routes-001",
      "ea-ew-probate-no-acting-executor-001",
      "ea-ew-probate-grant-starts-administration-001",
    ]);
    expect(
      new Set(
        probateKnowledgeCandidates.map((candidate) => candidate.entryId),
      ).size,
    ).toBe(probateKnowledgeCandidates.length);
  });

  it("keeps every checked-in candidate draft, blocked, hidden, unreviewed, and unactivated", () => {
    for (const candidate of probateKnowledgeCandidates) {
      expect(candidate).toMatchObject({
        revision: "r1",
        exactRevision: `${candidate.entryId}@r1`,
        topic: "probate",
        jurisdiction: "england_and_wales",
        disposition: "draft",
        evidenceConfidence: "blocked",
        approvalProfileId: probateDraftApprovalProfile.profileId,
        approvedConsumptionScope:
          "estate_administration_hidden_walking_skeleton",
        freshness: {
          verifiedAt: asOfDate,
          validUntil: null,
        },
      });
      expect(validateAuthoringKnowledgeEntry(candidate)).toEqual([]);
    }

    expect(probateDraftApprovalProfile.nonProduction).toBe(true);
    expect(probateDraftExternalApprovalEvidence).toEqual([]);
    expect(walkingSkeletonActivationManifest.pins).toEqual([]);
  });

  it("generates stable exact canonical digests for every candidate", () => {
    const firstPass = Object.fromEntries(
      probateKnowledgeCandidates.map((candidate) => [
        candidate.exactRevision,
        candidate.contentDigest,
      ]),
    );
    const secondPass = Object.fromEntries(
      probateKnowledgeCandidates.map((candidate) => [
        candidate.exactRevision,
        recomputeAuthoringContentDigest({
          ...candidate,
          applicabilityConstraints: [...candidate.applicabilityConstraints],
          exceptions: [...candidate.exceptions],
          allowedWording: [...candidate.allowedWording],
        }).contentDigest,
      ]),
    );

    expect(secondPass).toEqual(firstPass);
    expect(firstPass).toEqual({
      "ea-ew-probate-meaning-001@r1":
        "sha256:976294408b3f0a19acfe1ffbb3fbc5e96d08ed55199419face860c446042f4e3",
      "ea-ew-probate-grant-types-001@r1":
        "sha256:3807bba92bc2ae4469ba4eca4a5a65aa85f1108f451ee53855b2360291935c97",
      "ea-ew-probate-personal-representative-term-001@r1":
        "sha256:ee0d6fcef9fc9d5a63b3ee9f9c56488ed97ccaffbbfa0e5b7144d600ec74c8eb",
      "ea-ew-probate-executor-ordinary-applicant-001@r1":
        "sha256:4ab5a57944347302ebf4991703279143745431e1ad74a17622457c1a753ea5d5",
      "ea-ew-probate-no-will-ordinary-applicant-001@r1":
        "sha256:09617e690b8fea3e108da4d9e98555ee72e8372d17e1ec6a4352de5c4599d39e",
      "ea-ew-probate-grant-need-institution-rules-001@r1":
        "sha256:d50519f14769bce902aa5c938f7d4d9c297d4407c672ff07713151c0bff3c941",
      "ea-ew-probate-joint-assets-caution-001@r1":
        "sha256:aabae81e02a3f7622f5084a7c8ea33422d762e4b2499c425d0e0ab99ad1bc857",
      "ea-ew-probate-preapplication-sequence-001@r1":
        "sha256:26a6016b365619ff088cfd5c31b7cddfb6931e2db57b0994a2568e49bd65fa3a",
      "ea-ew-probate-preparation-information-001@r1":
        "sha256:71ce87519b1396c50628d70e83a3079f7b5e606d0ca62d0693b84e21664a429c",
      "ea-ew-probate-application-routes-001@r1":
        "sha256:42c1a70a417d506bb7dcaf14d0cb3991ffc114cd5ef357d1108a30ceb1cbe734",
      "ea-ew-probate-no-acting-executor-001@r1":
        "sha256:6c3148cf7ed8d9fb5127508bb1d84b0b8aee7c01095d24bf86704229c11cc4e2",
      "ea-ew-probate-grant-starts-administration-001@r1":
        "sha256:7e3006872ac814df254c614fc94ad8e1ab3b31b8240ba0688496bd7f3170d16e",
    });
    expect(
      Object.values(firstPass).every((digest) =>
        /^sha256:[0-9a-f]{64}$/.test(digest),
      ),
    ).toBe(true);
  });

  it("rejects duplicate and conflicting exact revisions", () => {
    const candidate = probateKnowledgeCandidates[0]!;
    const changed = recomputeAuthoringContentDigest({
      ...candidate,
      preciseInternalClaim: `${candidate.preciseInternalClaim} Changed.`,
    });

    expect(
      validateAuthoringRegistry([
        ...probateKnowledgeCandidates,
        candidate,
      ]).map((issue) => issue.code),
    ).toContain("duplicate_exact_revision");
    expect(
      validateAuthoringRegistry([
        ...probateKnowledgeCandidates,
        changed,
      ]).map((issue) => issue.code),
    ).toContain("immutable_revision_conflict");
  });

  it("blocks every real candidate despite an in-memory exact activation pin", () => {
    for (const candidate of probateKnowledgeCandidates) {
      expect(blockCodes(candidate, [], manifestFor(candidate))).toEqual(
        expect.arrayContaining([
          "not_approved",
          "approval_evidence_missing",
          "review_dimension_missing",
          "evidence_confidence_blocked",
        ]),
      );
    }
  });

  it("keeps an in-memory reviewed fixture unavailable without a pin", () => {
    const candidate = reviewableCandidate();

    expect(
      blockCodes(
        candidate,
        syntheticEvidenceFor(candidate),
        walkingSkeletonActivationManifest,
      ),
    ).toEqual(["not_activated"]);
  });

  it("does not let a pin override missing, non-approving, or expired reviews", () => {
    const candidate = reviewableCandidate();
    const evidence = syntheticEvidenceFor(candidate);
    const missingPrivacy = evidence.filter(
      (record) => record.role !== "privacy",
    );
    const rejected = evidence.map((record) =>
      record.role === "domain"
        ? { ...record, decision: "rejected" as const }
        : record,
    );
    const expired = evidence.map((record) =>
      record.role === "freshness"
        ? { ...record, expiresAt: "2026-07-29" }
        : record,
    );

    expect(blockCodes(candidate, missingPrivacy, manifestFor(candidate))).toEqual(
      expect.arrayContaining([
        "approval_evidence_missing",
        "review_dimension_missing",
      ]),
    );
    expect(blockCodes(candidate, rejected, manifestFor(candidate))).toContain(
      "review_decision_not_approving",
    );
    expect(blockCodes(candidate, expired, manifestFor(candidate))).toContain(
      "review_evidence_expired",
    );
  });

  it("invalidates prior evidence when source, wording, or revision changes", () => {
    const original = reviewableCandidate();
    const evidence = syntheticEvidenceFor(original);
    const sourceChanged = recomputeAuthoringContentDigest({
      ...original,
      sourceSnapshot: {
        ...original.sourceSnapshot,
        sourceRevision: "synthetic-changed-source-revision",
      },
    });
    const wordingChanged = recomputeAuthoringContentDigest({
      ...original,
      allowedWording: [`${original.allowedWording[0]} Changed.`],
    });
    const nextRevision = recomputeAuthoringContentDigest({
      ...original,
      revision: "r2",
      exactRevision: `${original.entryId}@r2`,
    });

    expect(
      blockCodes(sourceChanged, evidence, manifestFor(sourceChanged)),
    ).toContain("approval_evidence_invalid");
    expect(
      blockCodes(wordingChanged, evidence, manifestFor(wordingChanged)),
    ).toContain("approval_evidence_invalid");
    expect(
      blockCodes(nextRevision, evidence, manifestFor(nextRevision)),
    ).toEqual(
      expect.arrayContaining([
        "approval_evidence_missing",
        "review_dimension_missing",
      ]),
    );
  });

  it("rejects prohibited personalised entitlement wording", () => {
    const unsafe = recomputeAuthoringContentDigest({
      ...probateKnowledgeCandidates[0]!,
      allowedWording: ["You are entitled to apply for probate."],
    });

    expect(
      validateAuthoringKnowledgeEntry(unsafe).map((issue) => issue.code),
    ).toContain("prohibited_user_facing_wording");
  });

  it("keeps probate input on the general route and the runtime bundle empty", () => {
    const input =
      "Do I need probate, and can I apply for letters of administration?";
    const runtimeAsset = buildWalkingSkeletonRuntimeAsset(asOfDate);

    expect(classifyDecisionDocument(input)).toBe("unknown_admin_dispute");
    expect(analyseDecisionProblem(input).documentType).toBe(
      "unknown_admin_dispute",
    );
    expect(runtimeAsset.validationIssues).toEqual([]);
    expect(runtimeAsset.bundle.loaderInvoked).toBe(false);
    expect(runtimeAsset.bundle.artifact.entries).toEqual([]);
    expect(runtimeAsset.serializedArtifact).toContain('"entries": []');
  });

  it("keeps sensitive estate details out of candidate wording", () => {
    const candidateText = probateKnowledgeCandidates
      .flatMap((candidate) => [
        candidate.plainEnglishClaim,
        ...candidate.allowedWording,
      ])
      .join(" ");

    expect(candidateText).not.toMatch(
      /account number|National Insurance number|tax reference|bank detail|full asset schedule/i,
    );
    expect(
      probateKnowledgeCandidates
        .find(
          (candidate) =>
            candidate.entryId ===
            "ea-ew-probate-preparation-information-001",
        )
        ?.requiredQualifiers.join(" "),
    ).toContain("You do not need to provide");
  });
});
