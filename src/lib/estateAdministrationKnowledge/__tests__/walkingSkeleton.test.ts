import { describe, expect, it } from "vitest";
import {
  buildRuntimeKnowledgeBundle,
  createExplicitRollbackManifest,
  deriveRuntimeEligibility,
  parseAuthoringKnowledgeEntry,
  projectRuntimeKnowledgeEntry,
  recomputeAuthoringContentDigest,
  retireRevisionFromManifest,
  serializeRuntimeKnowledgeArtifact,
  validateActivationManifest,
  validateApprovalEvidenceShape,
  validateAuthoringRegistry,
  validateImmutableReplacement,
} from "../governance.ts";
import {
  prepareTellUsOnceSeparateContactNote,
  TELL_US_ONCE_SEPARATE_CONTACT_RULE_REVISION,
} from "../hiddenDecisionRule.ts";
import type {
  ActivationManifest,
  ApprovalRole,
  AuthoringKnowledgeEntry,
  EligibilityContext,
  ExternalApprovalEvidence,
} from "../types.ts";
import { tellUsOnceSeparateContactAuthoringEntry } from "../walkingSkeletonAuthoring.ts";
import {
  buildWalkingSkeletonRuntimeAsset,
  walkingSkeletonActivationManifest,
  walkingSkeletonApprovalProfile,
  walkingSkeletonExternalApprovalEvidence,
} from "../walkingSkeletonGovernance.ts";

const asOfDate = "2026-07-29";

const developmentContext = (
  overrides: Partial<EligibilityContext> = {},
): EligibilityContext => ({
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
  ...overrides,
});

const approvedEntry = (
  overrides: Partial<AuthoringKnowledgeEntry> = {},
): AuthoringKnowledgeEntry => {
  const revision =
    overrides.revision ?? tellUsOnceSeparateContactAuthoringEntry.revision;
  const entryId =
    overrides.entryId ?? tellUsOnceSeparateContactAuthoringEntry.entryId;

  return recomputeAuthoringContentDigest({
    ...tellUsOnceSeparateContactAuthoringEntry,
    disposition: "approved",
    evidenceConfidence: "high",
    freshness: {
      category: "government_service_guidance",
      verifiedAt: "2026-07-29",
      validUntil: "2026-08-29",
    },
    ...overrides,
    entryId,
    revision,
    exactRevision: `${entryId}@${revision}`,
  });
};

const syntheticEvidenceFor = (
  entry: AuthoringKnowledgeEntry,
  roles: readonly ApprovalRole[] = walkingSkeletonApprovalProfile.requiredRoles,
): readonly ExternalApprovalEvidence[] =>
  roles.map((role) => ({
    evidenceId: `synthetic-${role}-${entry.exactRevision}`,
    evidenceKind: "synthetic_test",
    exactRevision: entry.exactRevision,
    contentDigest: entry.contentDigest,
    approvalProfileId: walkingSkeletonApprovalProfile.profileId,
    role,
    decision: "approved",
    reviewerId: `synthetic-test-role:${role}`,
    reviewedCommit: "synthetic-test-commit",
    reviewedAt: asOfDate,
    evidenceReference: `synthetic-test:${role}:${entry.exactRevision}`,
  }));

const manifestFor = (
  entry: AuthoringKnowledgeEntry,
  exactRevision = entry.exactRevision,
  contentDigest = entry.contentDigest,
): ActivationManifest => ({
  manifestRevision: `synthetic-manifest-for-${exactRevision}`,
  pins: [
    {
      exactRevision,
      contentDigest,
      consumptionScope: entry.approvedConsumptionScope,
      reason: "Synthetic exact-revision activation proof",
    },
  ],
});

const eligibleInputs = (entry = approvedEntry()) => ({
  entry,
  evidence: syntheticEvidenceFor(entry),
  manifest: manifestFor(entry),
  context: developmentContext(),
});

const codesFor = (
  entry: AuthoringKnowledgeEntry,
  evidence: readonly ExternalApprovalEvidence[],
  manifest: ActivationManifest,
  context = developmentContext(),
): readonly string[] => {
  const result = deriveRuntimeEligibility(
    entry,
    [walkingSkeletonApprovalProfile],
    evidence,
    manifest,
    context,
  );
  return result.status === "blocked"
    ? result.reasons.map((reason) => reason.code)
    : [];
};

describe("Estate Administration knowledge walking skeleton", () => {
  describe("authoring and immutable revision integrity", () => {
    it("parses the one real authoring entry", () => {
      const parsed = parseAuthoringKnowledgeEntry(
        tellUsOnceSeparateContactAuthoringEntry,
      );

      expect(parsed.ok).toBe(true);
      expect(tellUsOnceSeparateContactAuthoringEntry.disposition).toBe("draft");
      expect(
        tellUsOnceSeparateContactAuthoringEntry.authoringOnly.privateReviewNotes,
      ).toContain("No qualified legal or domain review has been supplied.");
    });

    it("keeps entryId@revision exact and stable", () => {
      expect(tellUsOnceSeparateContactAuthoringEntry.exactRevision).toBe(
        "ea-ew-tell-us-once-separate-contact-001@r1",
      );
      expect(TELL_US_ONCE_SEPARATE_CONTACT_RULE_REVISION).toBe(
        tellUsOnceSeparateContactAuthoringEntry.exactRevision,
      );
    });

    it("rejects duplicate exact revisions", () => {
      const issues = validateAuthoringRegistry([
        tellUsOnceSeparateContactAuthoringEntry,
        tellUsOnceSeparateContactAuthoringEntry,
      ]);

      expect(issues.map((candidate) => candidate.code)).toContain(
        "duplicate_exact_revision",
      );
    });

    it("rejects changed content replacing an existing exact revision", () => {
      const original = approvedEntry();
      const changed = approvedEntry({
        preciseInternalClaim: `${original.preciseInternalClaim} Changed.`,
      });

      expect(changed.exactRevision).toBe(original.exactRevision);
      expect(changed.contentDigest).not.toBe(original.contentDigest);
      expect(
        validateImmutableReplacement(original, changed).map(
          (candidate) => candidate.code,
        ),
      ).toContain("immutable_revision_conflict");
      expect(
        codesFor(changed, syntheticEvidenceFor(original), manifestFor(original)),
      ).toContain("approval_evidence_invalid");
    });

    it("uses deterministic SHA-256 over identical approval-relevant content", () => {
      const first = approvedEntry();
      const identical = recomputeAuthoringContentDigest({
        ...first,
        applicabilityConstraints: [...first.applicabilityConstraints],
        exceptions: [...first.exceptions],
        allowedWording: [...first.allowedWording],
      });

      expect(first.contentDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(identical.contentDigest).toBe(first.contentDigest);
    });

    it("binds exact revision and approved wording to the digest and approval evidence", () => {
      const original = approvedEntry();
      const revisedIdentity = approvedEntry({ revision: "r2" });
      const revisedWording = approvedEntry({
        allowedWording: [
          `${original.allowedWording[0]} Review the current official list.`,
        ],
      });

      expect(revisedIdentity.exactRevision).not.toBe(original.exactRevision);
      expect(revisedIdentity.contentDigest).not.toBe(original.contentDigest);
      expect(revisedWording.contentDigest).not.toBe(original.contentDigest);
      expect(
        codesFor(
          revisedWording,
          syntheticEvidenceFor(original),
          manifestFor(revisedWording),
        ),
      ).toContain("approval_evidence_invalid");
    });

    it("excludes non-approval review notes and change rationale from the digest", () => {
      const original = approvedEntry();
      const reviewMetadataOnly = recomputeAuthoringContentDigest({
        ...original,
        authoringOnly: {
          ...original.authoringOnly,
          privateReviewNotes: ["A changed private workflow note."],
          semanticChangeReason: "A changed authoring workflow rationale.",
        },
      });

      expect(reviewMetadataOnly.contentDigest).toBe(original.contentDigest);
    });

    it("rejects unsupported stored dispositions", () => {
      const parsed = parseAuthoringKnowledgeEntry({
        ...tellUsOnceSeparateContactAuthoringEntry,
        disposition: "active",
      });

      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.issues.map((candidate) => candidate.code)).toContain(
          "unsupported_disposition",
        );
      }
    });
  });

  describe("external approval enforcement", () => {
    it("does not let approved-looking authoring fields self-certify approval", () => {
      const entry = approvedEntry();

      expect(
        codesFor(entry, [], walkingSkeletonActivationManifest),
      ).toContain("approval_evidence_missing");
    });

    it("blocks invalid external approval evidence", () => {
      const entry = approvedEntry();
      const invalid = syntheticEvidenceFor(entry).map((record, index) =>
        index === 0 ? { ...record, contentDigest: "wrong-digest" } : record,
      );

      expect(codesFor(entry, invalid, manifestFor(entry))).toContain(
        "approval_evidence_invalid",
      );
    });

    it("requires real external evidence to identify a full reviewed commit", () => {
      const entry = approvedEntry();
      const [synthetic] = syntheticEvidenceFor(entry);
      const invalidGithubEvidence: ExternalApprovalEvidence = {
        ...synthetic,
        evidenceKind: "github_pr_review",
        reviewedCommit: "short-sha",
        evidenceReference: "github-pr:synthetic-only",
      };

      expect(
        validateApprovalEvidenceShape([invalidGithubEvidence]).map(
          (candidate) => candidate.code,
        ),
      ).toContain("invalid_approval_evidence");
    });

    it("enforces every role in the selected approval profile", () => {
      const entry = approvedEntry();
      const withoutDomainReview = syntheticEvidenceFor(entry).filter(
        (record) => record.role !== "domain",
      );

      expect(codesFor(entry, withoutDomainReview, manifestFor(entry))).toContain(
        "approval_evidence_missing",
      );
    });

    it("uses explicitly synthetic reviewer roles without inventing a person", () => {
      const entry = approvedEntry();
      const evidence = syntheticEvidenceFor(entry);

      expect(evidence.every((record) => record.evidenceKind === "synthetic_test")).toBe(
        true,
      );
      expect(
        evidence.every((record) =>
          record.reviewerId.startsWith("synthetic-test-role:"),
        ),
      ).toBe(true);
    });

    it.each([
      [
        "public",
        "estate_administration_public",
      ],
      [
        "controlled_beta",
        "estate_administration_hidden_walking_skeleton",
      ],
      [
        "controlled_beta",
        "estate_administration_public",
      ],
      [
        "development_only",
        "estate_administration_public",
      ],
    ] as const)(
      "blocks synthetic approval in %s availability for %s",
      (availability, consumptionScope) => {
        const entry = approvedEntry({
          approvedConsumptionScope: consumptionScope,
        });
        const context = developmentContext({
          consumptionScope,
          productScope: {
            availability,
            featureEnabled: true,
            productApproved: true,
            jurisdictionAvailable: true,
          },
        });

        expect(
          codesFor(
            entry,
            syntheticEvidenceFor(entry),
            manifestFor(entry),
            context,
          ),
        ).toContain("synthetic_approval_non_production_only");
      },
    );

    it("accepts synthetic approval only in the isolated hidden development context", () => {
      const { entry, evidence, manifest, context } = eligibleInputs();

      expect(
        deriveRuntimeEligibility(
          entry,
          [walkingSkeletonApprovalProfile],
          evidence,
          manifest,
          context,
        ),
      ).toEqual({ status: "usable", reasons: [] });
    });
  });

  describe("exact activation", () => {
    it("blocks an approved but unpinned revision", () => {
      const entry = approvedEntry();

      expect(
        codesFor(entry, syntheticEvidenceFor(entry), {
          manifestRevision: "synthetic-empty-manifest",
          pins: [],
        }),
      ).toContain("not_activated");
    });

    it("blocks an incorrect exact revision pin", () => {
      const entry = approvedEntry();

      expect(
        codesFor(
          entry,
          syntheticEvidenceFor(entry),
          manifestFor(
            entry,
            `${entry.entryId}@r2`,
            entry.contentDigest,
          ),
        ),
      ).toContain("incorrect_revision_pin");
    });

    it("does not activate a newer revision automatically", () => {
      const r1 = approvedEntry();
      const r2 = approvedEntry({
        revision: "r2",
        preciseInternalClaim: `${r1.preciseInternalClaim} Revised.`,
      });

      expect(
        codesFor(r2, syntheticEvidenceFor(r2), manifestFor(r1)),
      ).toContain("incorrect_revision_pin");
    });

    it("rejects conflicting pins for one conceptual entry and scope", () => {
      const entry = approvedEntry();
      const conflicting: ActivationManifest = {
        manifestRevision: "synthetic-conflict",
        pins: [
          ...manifestFor(entry).pins,
          ...manifestFor(
            entry,
            `${entry.entryId}@r2`,
            "synthetic-r2-digest",
          ).pins,
        ],
      };

      expect(
        validateActivationManifest(conflicting).map(
          (candidate) => candidate.code,
        ),
      ).toContain("conflicting_active_revision");
      expect(
        codesFor(entry, syntheticEvidenceFor(entry), conflicting),
      ).toContain("conflicting_active_revision");
    });

    it("projects only the exact eligible revision", () => {
      const { entry, evidence, manifest, context } = eligibleInputs();
      const result = buildRuntimeKnowledgeBundle(
        asOfDate,
        context,
        manifest.manifestRevision,
        () => ({
          entries: [entry],
          profiles: [walkingSkeletonApprovalProfile],
          approvalEvidence: evidence,
          activationManifest: manifest,
        }),
      );

      expect(result.artifact.entries).toHaveLength(1);
      expect(result.artifact.entries[0]?.runtimeReferenceId).toBe(
        entry.exactRevision,
      );
    });
  });

  describe("public-scope precedence and hidden safety", () => {
    it("does not load governed knowledge when the public route is unavailable", () => {
      let loaderInvoked = false;
      const result = buildRuntimeKnowledgeBundle(
        asOfDate,
        {
          ...developmentContext(),
          productScope: {
            availability: "unavailable_publicly",
            featureEnabled: false,
            productApproved: false,
            jurisdictionAvailable: true,
          },
        },
        "synthetic-manifest",
        () => {
          loaderInvoked = true;
          throw new Error("Scope precedence failed");
        },
      );

      expect(loaderInvoked).toBe(false);
      expect(result.loaderInvoked).toBe(false);
      expect(result.artifact.entries).toEqual([]);
      expect(result.eligibilityByRevision.scope).toMatchObject({
        status: "blocked",
        reasons: [{ code: "public_route_unavailable" }],
      });
    });

    it("keeps the real entry out of the emitted runtime asset", () => {
      const result = buildWalkingSkeletonRuntimeAsset(asOfDate);

      expect(result.validationIssues).toEqual([]);
      expect(result.bundle.artifact.entries).toEqual([]);
      expect(result.serializedArtifact).not.toContain(
        tellUsOnceSeparateContactAuthoringEntry.preciseInternalClaim,
      );
    });

    it("does not allow the non-production profile into a public scope", () => {
      const entry = approvedEntry({
        approvedConsumptionScope: "estate_administration_public",
      });
      const publicContext = developmentContext({
        consumptionScope: "estate_administration_public",
        productScope: {
          availability: "public",
          featureEnabled: true,
          productApproved: true,
          jurisdictionAvailable: true,
        },
      });

      expect(
        codesFor(
          entry,
          syntheticEvidenceFor(entry),
          manifestFor(entry),
          publicContext,
        ),
      ).toEqual(
        expect.arrayContaining([
          "approval_profile_invalid",
          "approval_profile_non_production",
        ]),
      );
    });

    it.each([
      ["draft", "not_approved"],
      ["rejected", "rejected"],
      ["retired", "retired"],
    ] as const)("blocks %s entries", (disposition, expectedCode) => {
      const entry = approvedEntry({ disposition });

      expect(
        codesFor(entry, syntheticEvidenceFor(entry), manifestFor(entry)),
      ).toContain(expectedCode);
    });

    it("uses stable scope block codes before entry governance", () => {
      const entry = approvedEntry();
      const featureBlocked = developmentContext({
        productScope: {
          availability: "development_only",
          featureEnabled: false,
          productApproved: true,
          jurisdictionAvailable: true,
        },
      });
      const productBlocked = developmentContext({
        productScope: {
          availability: "public",
          featureEnabled: true,
          productApproved: false,
          jurisdictionAvailable: true,
        },
      });
      const jurisdictionBlocked = developmentContext({
        productScope: {
          availability: "development_only",
          featureEnabled: true,
          productApproved: true,
          jurisdictionAvailable: false,
        },
      });

      expect(
        codesFor(
          entry,
          syntheticEvidenceFor(entry),
          manifestFor(entry),
          featureBlocked,
        ),
      ).toEqual(["feature_or_beta_scope_unavailable"]);
      expect(
        codesFor(
          entry,
          syntheticEvidenceFor(entry),
          manifestFor(entry),
          productBlocked,
        ),
      ).toEqual(["product_approval_missing"]);
      expect(
        codesFor(
          entry,
          syntheticEvidenceFor(entry),
          manifestFor(entry),
          jurisdictionBlocked,
        ),
      ).toEqual(["wrong_jurisdiction"]);
    });

    it("blocks missing profiles, supersession, missing sources, scope mismatch, and incomplete facts", () => {
      const entry = approvedEntry();
      const evidence = syntheticEvidenceFor(entry);
      const manifest = manifestFor(entry);
      const noProfile = deriveRuntimeEligibility(
        entry,
        [],
        evidence,
        manifest,
        developmentContext(),
      );
      const superseded = approvedEntry({
        supersededBy: `${entry.entryId}@r2`,
      });
      const missingSource = {
        ...entry,
        sourceSnapshot: null,
      } as unknown as AuthoringKnowledgeEntry;
      const wrongScope = approvedEntry({
        approvedConsumptionScope: "estate_administration_public",
      });

      expect(noProfile).toMatchObject({
        status: "blocked",
        reasons: expect.arrayContaining([
          expect.objectContaining({ code: "approval_profile_missing" }),
        ]),
      });
      expect(
        codesFor(
          superseded,
          syntheticEvidenceFor(superseded),
          manifestFor(superseded),
        ),
      ).toContain("superseded");
      expect(codesFor(missingSource, evidence, manifest)).toContain(
        "source_snapshot_missing",
      );
      expect(
        codesFor(
          wrongScope,
          syntheticEvidenceFor(wrongScope),
          manifestFor(wrongScope),
        ),
      ).toContain("consumption_scope_mismatch");
      expect(
        codesFor(
          entry,
          evidence,
          manifest,
          developmentContext({ factReadiness: "missing" }),
        ),
      ).toContain("missing_facts");
      expect(
        codesFor(
          entry,
          evidence,
          manifest,
          developmentContext({ factReadiness: "conflicting" }),
        ),
      ).toContain("conflicting_facts");
    });
  });

  describe("freshness and offline limits", () => {
    it("allows a current internal entry when every other gate passes", () => {
      const { entry, evidence, manifest, context } = eligibleInputs();

      expect(
        deriveRuntimeEligibility(
          entry,
          [walkingSkeletonApprovalProfile],
          evidence,
          manifest,
          context,
        ),
      ).toEqual({ status: "usable", reasons: [] });
    });

    it("fails closed after validUntil", () => {
      const entry = approvedEntry({
        freshness: {
          category: "government_service_guidance",
          verifiedAt: "2026-07-01",
          validUntil: "2026-07-28",
        },
      });

      expect(
        codesFor(entry, syntheticEvidenceFor(entry), manifestFor(entry)),
      ).toContain("expired");
    });

    it("fails closed when required freshness cannot be established", () => {
      const entry = approvedEntry({
        freshness: {
          category: "government_service_guidance",
          verifiedAt: null,
          validUntil: null,
        },
      });

      expect(
        codesFor(entry, syntheticEvidenceFor(entry), manifestFor(entry)),
      ).toContain("freshness_unverifiable");
    });

    it("treats blocked evidence confidence as a hard gate despite approval and activation", () => {
      const entry = approvedEntry({ evidenceConfidence: "blocked" });

      expect(
        codesFor(entry, syntheticEvidenceFor(entry), manifestFor(entry)),
      ).toContain("evidence_confidence_blocked");
    });

    it.each(["high", "medium", "low"] as const)(
      "allows %s evidence confidence only when every other gate passes",
      (evidenceConfidence) => {
        const entry = approvedEntry({ evidenceConfidence });

        expect(
          deriveRuntimeEligibility(
            entry,
            [walkingSkeletonApprovalProfile],
            syntheticEvidenceFor(entry),
            manifestFor(entry),
            developmentContext(),
          ),
        ).toEqual({ status: "usable", reasons: [] });
        expect(codesFor(entry, [], manifestFor(entry))).toContain(
          "approval_evidence_missing",
        );
      },
    );

    it("records that offline bundles cannot detect or revoke later changes", () => {
      const { entry, evidence, manifest, context } = eligibleInputs();
      const result = buildRuntimeKnowledgeBundle(
        asOfDate,
        context,
        manifest.manifestRevision,
        () => ({
          entries: [entry],
          profiles: [walkingSkeletonApprovalProfile],
          approvalEvidence: evidence,
          activationManifest: manifest,
        }),
      );

      expect(result.artifact.offlineCapabilities).toEqual({
        remoteRevocation: false,
        sourceChangeDetectionAfterBuild: false,
      });
    });
  });

  describe("browser-safe deterministic projection", () => {
    it("allowlists runtime fields and excludes authoring/governance data", () => {
      const entry = approvedEntry();
      const runtime = projectRuntimeKnowledgeEntry(entry);
      const serialized = JSON.stringify(runtime);

      expect(Object.keys(runtime).sort()).toEqual(
        [
          "approvedClaim",
          "consumptionScope",
          "entryId",
          "jurisdiction",
          "prohibitedConclusionClasses",
          "publicProvenance",
          "requiredQualifiers",
          "revision",
          "runtimeReferenceId",
          "sourceAccessDate",
          "uncertaintyNote",
          "validUntil",
        ].sort(),
      );
      expect(serialized).not.toContain("authoringOnly");
      expect(serialized).not.toContain("privateReviewNotes");
      expect(serialized).not.toContain("approvalProfileId");
      expect(serialized).not.toContain("reviewerId");
      expect(serialized).not.toContain("dossierReferences");
      expect(serialized).not.toContain("evidenceText");
      expect(serialized).not.toContain("plainEnglishClaim");
      expect(serialized).not.toContain("preciseInternalClaim");
      expect(serialized).not.toContain("applicabilityConstraints");
      expect(serialized).not.toContain("exceptions");
      expect(serialized).not.toContain("escalationNotes");
      expect(runtime.prohibitedConclusionClasses).toEqual(
        entry.prohibitedConclusionClasses,
      );
    });

    it("projects externally approved allowedWording, never the internal claim", () => {
      const entry = approvedEntry({
        preciseInternalClaim:
          "Internal reviewer proposition that must never be user-facing.",
      });
      const runtime = projectRuntimeKnowledgeEntry(entry);

      expect(runtime.approvedClaim).toBe(entry.allowedWording[0]);
      expect(JSON.stringify(runtime)).not.toContain(
        entry.preciseInternalClaim,
      );
    });

    it("keeps user-facing output stable when internal wording alone changes", () => {
      const original = approvedEntry();
      const internalChange = approvedEntry({
        preciseInternalClaim: `${original.preciseInternalClaim} Internal clarification.`,
      });

      expect(internalChange.contentDigest).not.toBe(original.contentDigest);
      expect(projectRuntimeKnowledgeEntry(internalChange).approvedClaim).toBe(
        projectRuntimeKnowledgeEntry(original).approvedClaim,
      );
    });

    it.each([
      "applicabilityConstraints",
      "exceptions",
      "allowedWording",
      "escalationNotes",
      "prohibitedConclusionClasses",
    ] as const)("validates the %s governance field", (field) => {
      const entry = approvedEntry({ [field]: [] });
      const parsed = parseAuthoringKnowledgeEntry(entry);

      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: field }),
          ]),
        );
      }
    });

    it("fails closed when approved user-facing wording violates the shared safety policy", () => {
      const entry = approvedEntry({
        allowedWording: ["You are entitled to this outcome."],
      });
      const parsed = parseAuthoringKnowledgeEntry(entry);

      expect(parsed.ok).toBe(false);
      if (!parsed.ok) {
        expect(parsed.issues.map((candidate) => candidate.code)).toContain(
          "prohibited_user_facing_wording",
        );
      }
      expect(
        codesFor(entry, syntheticEvidenceFor(entry), manifestFor(entry)),
      ).toContain("prohibited_safety_wording");
      expect(() => projectRuntimeKnowledgeEntry(entry)).toThrow(
        "Runtime projection blocked wording prohibited",
      );
    });

    it("produces deterministic projection and serialization for fixed inputs", () => {
      const { entry, evidence, manifest, context } = eligibleInputs();
      const build = () =>
        buildRuntimeKnowledgeBundle(
          asOfDate,
          context,
          manifest.manifestRevision,
          () => ({
            entries: [entry],
            profiles: [walkingSkeletonApprovalProfile],
            approvalEvidence: evidence,
            activationManifest: manifest,
          }),
        ).artifact;

      expect(serializeRuntimeKnowledgeArtifact(build())).toBe(
        serializeRuntimeKnowledgeArtifact(build()),
      );
    });
  });

  describe("retirement, rollback, and exact hidden rule", () => {
    it("excludes an emergency-retired revision from the next manifest without remote-revocation claims", () => {
      const entry = approvedEntry();
      const retirement = retireRevisionFromManifest(
        manifestFor(entry),
        entry.exactRevision,
        "synthetic-manifest-after-retirement",
      );

      expect(retirement.removed).toBe(true);
      expect(retirement.manifest.pins).toEqual([]);
      expect(retirement.remoteRevocationPerformed).toBe(false);
      expect(retirement.message).toContain("cannot be remotely revoked");
      expect(
        codesFor(entry, syntheticEvidenceFor(entry), retirement.manifest),
      ).toContain("not_activated");
    });

    it("requires an explicitly named previously valid revision for rollback", () => {
      const entry = approvedEntry();
      const refused = createExplicitRollbackManifest(
        manifestFor(entry),
        entry,
        "estate_administration_hidden_walking_skeleton",
        new Set(),
        "synthetic-refused-rollback",
      );

      expect(refused).toMatchObject({
        ok: false,
        reason: "rollback_target_not_previously_valid",
      });

      const accepted = createExplicitRollbackManifest(
        { manifestRevision: "synthetic-current", pins: [] },
        entry,
        "estate_administration_hidden_walking_skeleton",
        new Set([entry.exactRevision]),
        "synthetic-explicit-rollback",
      );

      expect(accepted.ok).toBe(true);
      if (accepted.ok) {
        expect(accepted.manifest.pins).toHaveLength(1);
        expect(accepted.manifest.pins[0]?.exactRevision).toBe(
          entry.exactRevision,
        );
      }
    });

    it("runs the hidden rule only for its exact projected revision and explicit fact", () => {
      const entry = approvedEntry();
      const runtime = projectRuntimeKnowledgeEntry(entry);

      expect(
        prepareTellUsOnceSeparateContactNote(runtime, {
          separateContactPreparationRequested: true,
        }),
      ).toMatchObject({
        status: "prepared",
        runtimeReferenceId: entry.exactRevision,
      });
      expect(
        prepareTellUsOnceSeparateContactNote(
          { ...runtime, runtimeReferenceId: `${entry.entryId}@r2` },
          { separateContactPreparationRequested: true },
        ),
      ).toEqual({
        status: "blocked",
        reason: "knowledge_revision_mismatch",
      });
      expect(
        prepareTellUsOnceSeparateContactNote(runtime, {
          separateContactPreparationRequested: false,
        }),
      ).toEqual({ status: "blocked", reason: "missing_facts" });
    });
  });

  it("keeps the real governance inputs empty and non-production", () => {
    expect(walkingSkeletonApprovalProfile.nonProduction).toBe(true);
    expect(walkingSkeletonExternalApprovalEvidence).toEqual([]);
    expect(walkingSkeletonActivationManifest.pins).toEqual([]);
  });
});
