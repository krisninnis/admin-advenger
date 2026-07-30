import { createHash } from "node:crypto";
import { findForbiddenCoreSafetyPhrases } from "../safetyWordingCore.ts";
import {
  EDITORIAL_DISPOSITIONS,
  type ActivationManifest,
  type ApprovalProfile,
  type AuthoringKnowledgeEntry,
  type AuthoringKnowledgeEntryInput,
  type EligibilityBlockCode,
  type EligibilityBlockReason,
  type EligibilityContext,
  type EmergencyRetirementResult,
  type ExplicitRollbackResult,
  type ExternalApprovalEvidence,
  type GovernedCorpusInputs,
  type ParseResult,
  type ProductScopeContext,
  type RuntimeBundleResult,
  type RuntimeEligibility,
  type RuntimeKnowledgeArtifact,
  type RuntimeKnowledgeEntry,
  type ValidationIssue,
} from "./types.ts";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const fullGitCommitPattern = /^[0-9a-f]{40}$/i;

const blockMessages: Readonly<Record<EligibilityBlockCode, string>> = {
  public_route_unavailable:
    "The product route is unavailable, so knowledge selection did not run.",
  feature_or_beta_scope_unavailable:
    "The controlled or development-only scope is not enabled.",
  product_approval_missing:
    "The product scope has not received separate product-owner approval.",
  not_approved:
    "The exact authoring revision is not externally approved.",
  rejected:
    "The authoring revision has been rejected.",
  retired:
    "The authoring revision has been retired.",
  superseded:
    "The authoring revision has been superseded.",
  approval_profile_missing:
    "The entry's versioned approval profile is missing.",
  approval_profile_invalid:
    "The entry's approval profile is structurally invalid or does not allow this scope.",
  approval_profile_non_production:
    "The selected approval profile is explicitly non-production.",
  approval_evidence_missing:
    "One or more approval roles have no externally supplied evidence.",
  approval_evidence_invalid:
    "Approval evidence does not match the exact revision, digest, profile, or required role.",
  synthetic_approval_non_production_only:
    "Synthetic approval evidence is accepted only in the isolated hidden development scope.",
  evidence_confidence_blocked:
    "The authoring entry's evidence confidence is blocked.",
  not_activated:
    "The exact revision is not pinned in the activation manifest.",
  incorrect_revision_pin:
    "The activation manifest pins a different exact revision or digest.",
  conflicting_active_revision:
    "The activation manifest contains conflicting pins for the conceptual entry and scope.",
  expired:
    "The runtime validity date has passed, so the entry fails closed locally.",
  freshness_unverifiable:
    "The required release verification or validity information is missing.",
  wrong_jurisdiction:
    "The requested jurisdiction does not match or is unavailable.",
  missing_facts:
    "The explicit decision rule is missing required case facts.",
  conflicting_facts:
    "The explicit decision rule received conflicting case facts.",
  source_snapshot_missing:
    "The immutable source snapshot is missing or incomplete.",
  consumption_scope_mismatch:
    "The entry is not approved for the requested consumption scope.",
  prohibited_safety_wording:
    "The approved user-facing wording contains a phrase prohibited by the shared safety policy.",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasIsoDateOrNull = (value: unknown): value is string | null =>
  value === null || (typeof value === "string" && isoDatePattern.test(value));

const hasValidReviewedCommit = (
  record: ExternalApprovalEvidence,
): boolean =>
  record.evidenceKind === "synthetic_test" ||
  fullGitCommitPattern.test(record.reviewedCommit);

const projectedUserFacingWording = (
  entry: AuthoringKnowledgeEntry,
): string =>
  [
    ...entry.allowedWording,
    ...entry.requiredQualifiers,
    entry.uncertaintyNote,
  ].join("\n");

const hasProhibitedUserFacingWording = (
  entry: AuthoringKnowledgeEntry,
): boolean =>
  findForbiddenCoreSafetyPhrases(projectedUserFacingWording(entry)).length > 0;

export const canonicalizeApprovalRelevantContent = (
  entry: Omit<AuthoringKnowledgeEntry, "contentDigest">,
): string =>
  JSON.stringify([
    ["canonicalSchema", "estate-administration-approval-content-v1"],
    ["entryId", entry.entryId],
    ["revision", entry.revision],
    ["exactRevision", entry.exactRevision],
    ["title", entry.title],
    ["domain", entry.domain],
    ["topic", entry.topic],
    ["jurisdiction", entry.jurisdiction],
    ["plainEnglishClaim", entry.plainEnglishClaim],
    ["preciseInternalClaim", entry.preciseInternalClaim],
    [
      "sourceSnapshot",
      [
        ["snapshotId", entry.sourceSnapshot.snapshotId],
        ["sourceId", entry.sourceSnapshot.sourceId],
        ["title", entry.sourceSnapshot.title],
        ["issuingAuthority", entry.sourceSnapshot.issuingAuthority],
        ["sourceType", entry.sourceSnapshot.sourceType],
        ["publicLocation", entry.sourceSnapshot.publicLocation],
        ["jurisdiction", entry.sourceSnapshot.jurisdiction],
        ["accessDate", entry.sourceSnapshot.accessDate],
        ["sourceRevision", entry.sourceSnapshot.sourceRevision],
        ["pinpoint", entry.sourceSnapshot.pinpoint],
        ["evidenceKind", entry.sourceSnapshot.evidenceKind],
        ["evidenceText", entry.sourceSnapshot.evidenceText],
      ],
    ],
    ["evidenceConfidence", entry.evidenceConfidence],
    ["applicabilityConstraints", [...entry.applicabilityConstraints]],
    ["exceptions", [...entry.exceptions]],
    ["uncertaintyNote", entry.uncertaintyNote],
    ["allowedWording", [...entry.allowedWording]],
    ["requiredQualifiers", [...entry.requiredQualifiers]],
    ["prohibitedConclusionClasses", [...entry.prohibitedConclusionClasses]],
    ["escalationNotes", [...entry.escalationNotes]],
    [
      "freshness",
      [
        ["category", entry.freshness.category],
        ["verifiedAt", entry.freshness.verifiedAt],
        ["validUntil", entry.freshness.validUntil],
      ],
    ],
    ["approvalProfileId", entry.approvalProfileId],
    ["disposition", entry.disposition],
    ["approvedConsumptionScope", entry.approvedConsumptionScope],
    ["supersedes", entry.supersedes],
    ["supersededBy", entry.supersededBy],
    [
      "approvalRelevantAuthoringOnly",
      [["dossierReferences", [...entry.authoringOnly.dossierReferences]]],
    ],
  ]);

export const computeAuthoringContentDigest = (
  entry: Omit<AuthoringKnowledgeEntry, "contentDigest">,
): string =>
  `sha256:${createHash("sha256")
    .update(canonicalizeApprovalRelevantContent(entry), "utf8")
    .digest("hex")}`;

export const createAuthoringKnowledgeEntry = (
  input: AuthoringKnowledgeEntryInput,
): AuthoringKnowledgeEntry => {
  const withoutDigest: Omit<AuthoringKnowledgeEntry, "contentDigest"> = {
    ...input,
    exactRevision: `${input.entryId}@${input.revision}`,
  };

  return {
    ...withoutDigest,
    contentDigest: computeAuthoringContentDigest(withoutDigest),
  };
};

export const recomputeAuthoringContentDigest = (
  entry: AuthoringKnowledgeEntry,
): AuthoringKnowledgeEntry => {
  const { contentDigest: _ignored, ...withoutDigest } = entry;
  return {
    ...withoutDigest,
    contentDigest: computeAuthoringContentDigest(withoutDigest),
  };
};

const issue = (
  code: ValidationIssue["code"],
  path: string,
  message: string,
): ValidationIssue => ({
  code,
  path,
  message,
});

export const validateAuthoringKnowledgeEntry = (
  value: unknown,
): readonly ValidationIssue[] => {
  if (!isRecord(value)) {
    return [
      issue(
        "invalid_authoring_entry",
        "$",
        "Authoring entry must be an object.",
      ),
    ];
  }

  const issues: ValidationIssue[] = [];
  const requiredStrings = [
    "entryId",
    "revision",
    "exactRevision",
    "contentDigest",
    "title",
    "plainEnglishClaim",
    "preciseInternalClaim",
    "approvalProfileId",
    "uncertaintyNote",
  ] as const;

  for (const field of requiredStrings) {
    if (!isNonEmptyString(value[field])) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          field,
          `${field} must be a non-empty string.`,
        ),
      );
    }
  }

  if (
    !EDITORIAL_DISPOSITIONS.includes(
      value.disposition as (typeof EDITORIAL_DISPOSITIONS)[number],
    )
  ) {
    issues.push(
      issue(
        "unsupported_disposition",
        "disposition",
        "Disposition must be draft, approved, rejected, or retired.",
      ),
    );
  }

  if (
    isNonEmptyString(value.entryId) &&
    isNonEmptyString(value.revision) &&
    value.exactRevision !== `${value.entryId}@${value.revision}`
  ) {
    issues.push(
      issue(
        "invalid_exact_revision",
        "exactRevision",
        "exactRevision must equal entryId@revision.",
      ),
    );
  }

  if (!isRecord(value.sourceSnapshot)) {
    issues.push(
      issue(
        "invalid_authoring_entry",
        "sourceSnapshot",
        "An immutable source snapshot is required.",
      ),
    );
  } else {
    const sourceRequired = [
      "snapshotId",
      "sourceId",
      "title",
      "issuingAuthority",
      "publicLocation",
      "accessDate",
      "sourceRevision",
      "pinpoint",
      "evidenceText",
    ] as const;
    for (const field of sourceRequired) {
      if (!isNonEmptyString(value.sourceSnapshot[field])) {
        issues.push(
          issue(
            "invalid_authoring_entry",
            `sourceSnapshot.${field}`,
            `sourceSnapshot.${field} must be a non-empty string.`,
          ),
        );
      }
    }

    if (
      !isNonEmptyString(value.sourceSnapshot.accessDate) ||
      !isoDatePattern.test(value.sourceSnapshot.accessDate)
    ) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          "sourceSnapshot.accessDate",
          "Source access date must use YYYY-MM-DD.",
        ),
      );
    }
  }

  if (!isRecord(value.freshness)) {
    issues.push(
      issue(
        "invalid_authoring_entry",
        "freshness",
        "Freshness policy is required.",
      ),
    );
  } else {
    if (!hasIsoDateOrNull(value.freshness.verifiedAt)) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          "freshness.verifiedAt",
          "verifiedAt must be null or YYYY-MM-DD.",
        ),
      );
    }
    if (!hasIsoDateOrNull(value.freshness.validUntil)) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          "freshness.validUntil",
          "validUntil must be null or YYYY-MM-DD.",
        ),
      );
    }
  }

  const requiredStringArrays = [
    "applicabilityConstraints",
    "exceptions",
    "allowedWording",
    "requiredQualifiers",
    "prohibitedConclusionClasses",
    "escalationNotes",
  ] as const;

  for (const field of requiredStringArrays) {
    const candidate = value[field];
    if (
      !Array.isArray(candidate) ||
      candidate.length === 0 ||
      !candidate.every(isNonEmptyString)
    ) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          field,
          `${field} must contain at least one non-empty string.`,
        ),
      );
    }
  }

  if (Array.isArray(value.allowedWording) && value.allowedWording.length !== 1) {
    issues.push(
      issue(
        "invalid_authoring_entry",
        "allowedWording",
        "The v1 runtime projection requires exactly one externally approved wording.",
      ),
    );
  }

  if (
    !["high", "medium", "low", "blocked"].includes(
      value.evidenceConfidence as string,
    )
  ) {
    issues.push(
      issue(
        "invalid_authoring_entry",
        "evidenceConfidence",
        "evidenceConfidence must be high, medium, low, or blocked.",
      ),
    );
  }

  if (!isRecord(value.authoringOnly)) {
    issues.push(
      issue(
        "invalid_authoring_entry",
        "authoringOnly",
        "Authoring-only provenance and review metadata are required.",
      ),
    );
  } else {
    for (const field of ["dossierReferences", "privateReviewNotes"] as const) {
      const candidate = value.authoringOnly[field];
      if (
        !Array.isArray(candidate) ||
        candidate.length === 0 ||
        !candidate.every(isNonEmptyString)
      ) {
        issues.push(
          issue(
            "invalid_authoring_entry",
            `authoringOnly.${field}`,
            `authoringOnly.${field} must contain at least one non-empty string.`,
          ),
        );
      }
    }
    if (!isNonEmptyString(value.authoringOnly.semanticChangeReason)) {
      issues.push(
        issue(
          "invalid_authoring_entry",
          "authoringOnly.semanticChangeReason",
          "authoringOnly.semanticChangeReason must be a non-empty string.",
        ),
      );
    }
  }

  if (issues.length === 0) {
    const entry = value as AuthoringKnowledgeEntry;
    if (hasProhibitedUserFacingWording(entry)) {
      issues.push(
        issue(
          "prohibited_user_facing_wording",
          "allowedWording|requiredQualifiers|uncertaintyNote",
          "Projected user-facing wording contains a phrase prohibited by src/lib/safetyWording.ts.",
        ),
      );
    }

    const { contentDigest, ...withoutDigest } = entry;
    const expectedDigest = computeAuthoringContentDigest(withoutDigest);
    if (contentDigest !== expectedDigest) {
      issues.push(
        issue(
          "revision_content_mismatch",
          "contentDigest",
          "The stored digest does not match the exact authoring content.",
        ),
      );
    }
  }

  return issues;
};

export const parseAuthoringKnowledgeEntry = (
  value: unknown,
): ParseResult<AuthoringKnowledgeEntry> => {
  const issues = validateAuthoringKnowledgeEntry(value);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: value as AuthoringKnowledgeEntry };
};

export const validateImmutableReplacement = (
  existing: AuthoringKnowledgeEntry,
  candidate: AuthoringKnowledgeEntry,
): readonly ValidationIssue[] => {
  if (
    existing.exactRevision === candidate.exactRevision &&
    existing.contentDigest !== candidate.contentDigest
  ) {
    return [
      issue(
        "immutable_revision_conflict",
        candidate.exactRevision,
        "Changed content cannot replace an existing exact revision.",
      ),
    ];
  }

  return [];
};

export const validateAuthoringRegistry = (
  entries: readonly AuthoringKnowledgeEntry[],
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, AuthoringKnowledgeEntry>();

  for (const entry of entries) {
    issues.push(...validateAuthoringKnowledgeEntry(entry));
    const existing = seen.get(entry.exactRevision);
    if (!existing) {
      seen.set(entry.exactRevision, entry);
      continue;
    }

    if (existing.contentDigest === entry.contentDigest) {
      issues.push(
        issue(
          "duplicate_exact_revision",
          entry.exactRevision,
          "The same exact revision appears more than once.",
        ),
      );
    } else {
      issues.push(...validateImmutableReplacement(existing, entry));
    }
  }

  return issues;
};

export const validateApprovalProfiles = (
  profiles: readonly ApprovalProfile[],
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const profile of profiles) {
    if (
      !isNonEmptyString(profile.profileId) ||
      !isNonEmptyString(profile.version) ||
      profile.requiredRoles.length === 0 ||
      profile.allowedEvidenceKinds.length === 0 ||
      profile.allowedConsumptionScopes.length === 0
    ) {
      issues.push(
        issue(
          "invalid_approval_profile",
          profile.profileId || "approvalProfile",
          "Approval profile must define identity, required roles, evidence kinds, and scopes.",
        ),
      );
    }

    if (seen.has(profile.profileId)) {
      issues.push(
        issue(
          "invalid_approval_profile",
          profile.profileId,
          "Approval profile IDs must be unique.",
        ),
      );
    }
    seen.add(profile.profileId);

    if (new Set(profile.requiredRoles).size !== profile.requiredRoles.length) {
      issues.push(
        issue(
          "invalid_approval_profile",
          profile.profileId,
          "Required approval roles must not contain duplicates.",
        ),
      );
    }

    if (
      !profile.nonProduction &&
      profile.allowedEvidenceKinds.includes("synthetic_test")
    ) {
      issues.push(
        issue(
          "invalid_approval_profile",
          profile.profileId,
          "Synthetic approval evidence is permitted only by an explicitly non-production profile.",
        ),
      );
    }
  }

  return issues;
};

export const validateApprovalEvidenceShape = (
  evidence: readonly ExternalApprovalEvidence[],
): readonly ValidationIssue[] =>
  evidence.flatMap((record) => {
    const requiredValues = [
      record.evidenceId,
      record.exactRevision,
      record.contentDigest,
      record.approvalProfileId,
      record.reviewerId,
      record.reviewedCommit,
      record.reviewedAt,
      record.evidenceReference,
    ];

    if (
      requiredValues.every(isNonEmptyString) &&
      isoDatePattern.test(record.reviewedAt) &&
      hasValidReviewedCommit(record)
    ) {
      return [];
    }

    return [
      issue(
        "invalid_approval_evidence",
        record.evidenceId || "approvalEvidence",
        "Approval evidence must identify the reviewer role, exact revision, digest, commit, date, and external reference.",
      ),
    ];
  });

export const validateActivationManifest = (
  manifest: ActivationManifest,
): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const seenScope = new Set<string>();

  if (!isNonEmptyString(manifest.manifestRevision)) {
    issues.push(
      issue(
        "invalid_activation_manifest",
        "manifestRevision",
        "Activation manifest revision is required.",
      ),
    );
  }

  for (const pin of manifest.pins) {
    if (
      !isNonEmptyString(pin.exactRevision) ||
      !isNonEmptyString(pin.contentDigest) ||
      !isNonEmptyString(pin.reason)
    ) {
      issues.push(
        issue(
          "invalid_activation_manifest",
          pin.exactRevision || "activationPin",
          "Every activation pin requires an exact revision, digest, scope, and reason.",
        ),
      );
      continue;
    }

    const entryId = pin.exactRevision.split("@")[0];
    const scopeKey = `${entryId}::${pin.consumptionScope}`;
    if (seenScope.has(scopeKey)) {
      issues.push(
        issue(
          "conflicting_active_revision",
          scopeKey,
          "Only one exact revision may be pinned per conceptual entry and scope.",
        ),
      );
    }
    seenScope.add(scopeKey);
  }

  return issues;
};

export const validateGovernedCorpusInputs = (
  inputs: GovernedCorpusInputs,
): readonly ValidationIssue[] => [
  ...validateAuthoringRegistry(inputs.entries),
  ...validateApprovalProfiles(inputs.profiles),
  ...validateApprovalEvidenceShape(inputs.approvalEvidence),
  ...validateActivationManifest(inputs.activationManifest),
];

const block = (code: EligibilityBlockCode): EligibilityBlockReason => ({
  code,
  message: blockMessages[code],
});

export const assessProductScopePrecedence = (
  scope: ProductScopeContext,
): readonly EligibilityBlockReason[] => {
  if (scope.availability === "unavailable_publicly") {
    return [block("public_route_unavailable")];
  }

  if (
    (scope.availability === "controlled_beta" ||
      scope.availability === "development_only") &&
    !scope.featureEnabled
  ) {
    return [block("feature_or_beta_scope_unavailable")];
  }

  if (!scope.productApproved) {
    return [block("product_approval_missing")];
  }

  if (!scope.jurisdictionAvailable) {
    return [block("wrong_jurisdiction")];
  }

  return [];
};

const uniqueReasons = (
  reasons: readonly EligibilityBlockReason[],
): readonly EligibilityBlockReason[] => {
  const seen = new Set<EligibilityBlockCode>();
  return reasons.filter((reason) => {
    if (seen.has(reason.code)) {
      return false;
    }
    seen.add(reason.code);
    return true;
  });
};

const approvalReasons = (
  entry: AuthoringKnowledgeEntry,
  profile: ApprovalProfile | undefined,
  evidence: readonly ExternalApprovalEvidence[],
  context: EligibilityContext,
): readonly EligibilityBlockReason[] => {
  if (!profile) {
    return [block("approval_profile_missing")];
  }

  const reasons: EligibilityBlockReason[] = [];
  if (!profile.allowedConsumptionScopes.includes(context.consumptionScope)) {
    reasons.push(block("approval_profile_invalid"));
  }
  const isolatedSyntheticContext =
    context.productScope.availability === "development_only" &&
    context.consumptionScope ===
      "estate_administration_hidden_walking_skeleton";
  if (profile.nonProduction && !isolatedSyntheticContext) {
    reasons.push(block("approval_profile_non_production"));
  }

  for (const role of profile.requiredRoles) {
    const roleEvidence = evidence.filter(
      (record) =>
        record.role === role &&
        record.exactRevision === entry.exactRevision,
    );

    if (roleEvidence.length === 0) {
      reasons.push(block("approval_evidence_missing"));
      continue;
    }

    const validEvidence = roleEvidence.some(
      (record) =>
        record.decision === "approved" &&
        record.contentDigest === entry.contentDigest &&
        record.approvalProfileId === profile.profileId &&
        profile.allowedEvidenceKinds.includes(record.evidenceKind) &&
        (record.evidenceKind !== "synthetic_test" ||
          (profile.nonProduction && isolatedSyntheticContext)) &&
        isNonEmptyString(record.reviewerId) &&
        hasValidReviewedCommit(record) &&
        isNonEmptyString(record.evidenceReference) &&
        isoDatePattern.test(record.reviewedAt),
    );

    if (!validEvidence) {
      if (
        roleEvidence.some(
          (record) => record.evidenceKind === "synthetic_test",
        ) &&
        !isolatedSyntheticContext
      ) {
        reasons.push(block("synthetic_approval_non_production_only"));
      } else {
        reasons.push(block("approval_evidence_invalid"));
      }
    }
  }

  return reasons;
};

const activationReasons = (
  entry: AuthoringKnowledgeEntry,
  manifest: ActivationManifest,
  context: EligibilityContext,
): readonly EligibilityBlockReason[] => {
  const conceptualPins = manifest.pins.filter(
    (pin) =>
      pin.exactRevision.split("@")[0] === entry.entryId &&
      pin.consumptionScope === context.consumptionScope,
  );

  if (conceptualPins.length === 0) {
    return [block("not_activated")];
  }

  if (conceptualPins.length > 1) {
    return [block("conflicting_active_revision")];
  }

  const [pin] = conceptualPins;
  if (
    pin.exactRevision !== entry.exactRevision ||
    pin.contentDigest !== entry.contentDigest
  ) {
    return [block("incorrect_revision_pin")];
  }

  return [];
};

export const deriveRuntimeEligibility = (
  entry: AuthoringKnowledgeEntry,
  profiles: readonly ApprovalProfile[],
  evidence: readonly ExternalApprovalEvidence[],
  manifest: ActivationManifest,
  context: EligibilityContext,
): RuntimeEligibility => {
  const scopeReasons = assessProductScopePrecedence(context.productScope);
  if (scopeReasons.length > 0) {
    return { status: "blocked", reasons: scopeReasons };
  }

  const reasons: EligibilityBlockReason[] = [];

  if (entry.disposition === "draft") {
    reasons.push(block("not_approved"));
  } else if (entry.disposition === "rejected") {
    reasons.push(block("rejected"));
  } else if (entry.disposition === "retired") {
    reasons.push(block("retired"));
  }

  if (entry.supersededBy !== null) {
    reasons.push(block("superseded"));
  }

  if (entry.evidenceConfidence === "blocked") {
    reasons.push(block("evidence_confidence_blocked"));
  }

  if (hasProhibitedUserFacingWording(entry)) {
    reasons.push(block("prohibited_safety_wording"));
  }

  const sourceSnapshotMissing =
    !isRecord(entry.sourceSnapshot) ||
    !isNonEmptyString(entry.sourceSnapshot.snapshotId) ||
    !isNonEmptyString(entry.sourceSnapshot.evidenceText);
  if (sourceSnapshotMissing) {
    reasons.push(block("source_snapshot_missing"));
  }

  if (
    entry.jurisdiction !== context.jurisdiction ||
    (!sourceSnapshotMissing &&
      entry.sourceSnapshot.jurisdiction !== context.jurisdiction)
  ) {
    reasons.push(block("wrong_jurisdiction"));
  }

  if (entry.approvedConsumptionScope !== context.consumptionScope) {
    reasons.push(block("consumption_scope_mismatch"));
  }

  const profile = profiles.find(
    (candidate) => candidate.profileId === entry.approvalProfileId,
  );
  reasons.push(...approvalReasons(entry, profile, evidence, context));
  reasons.push(...activationReasons(entry, manifest, context));

  if (entry.freshness.verifiedAt === null) {
    reasons.push(block("freshness_unverifiable"));
  }
  if (profile?.requiresValidUntil && entry.freshness.validUntil === null) {
    reasons.push(block("freshness_unverifiable"));
  }
  if (
    entry.freshness.validUntil !== null &&
    context.asOfDate > entry.freshness.validUntil
  ) {
    reasons.push(block("expired"));
  }

  if (context.factReadiness === "missing") {
    reasons.push(block("missing_facts"));
  } else if (context.factReadiness === "conflicting") {
    reasons.push(block("conflicting_facts"));
  }

  const deduplicated = uniqueReasons(reasons);
  if (deduplicated.length > 0) {
    return { status: "blocked", reasons: deduplicated };
  }

  return { status: "usable", reasons: [] };
};

export const projectRuntimeKnowledgeEntry = (
  entry: AuthoringKnowledgeEntry,
): RuntimeKnowledgeEntry => {
  const approvedClaim = entry.allowedWording[0];
  if (!isNonEmptyString(approvedClaim)) {
    throw new Error(
      "Runtime projection requires exactly one externally approved allowedWording value.",
    );
  }
  if (hasProhibitedUserFacingWording(entry)) {
    throw new Error(
      "Runtime projection blocked wording prohibited by src/lib/safetyWording.ts.",
    );
  }

  return {
    runtimeReferenceId: entry.exactRevision,
    entryId: entry.entryId,
    revision: entry.revision,
    approvedClaim,
    jurisdiction: entry.jurisdiction,
    sourceAccessDate: entry.sourceSnapshot.accessDate,
    publicProvenance: {
      sourceTitle: entry.sourceSnapshot.title,
      issuingAuthority: entry.sourceSnapshot.issuingAuthority,
      publicLocation: entry.sourceSnapshot.publicLocation,
      pinpoint: entry.sourceSnapshot.pinpoint,
    },
    validUntil: entry.freshness.validUntil,
    requiredQualifiers: [...entry.requiredQualifiers],
    uncertaintyNote: entry.uncertaintyNote,
    prohibitedConclusionClasses: [...entry.prohibitedConclusionClasses],
    consumptionScope: entry.approvedConsumptionScope,
  };
};

const emptyArtifact = (
  buildDate: string,
  manifestRevision: string,
): RuntimeKnowledgeArtifact => ({
  schemaVersion: "estate-administration-runtime-v1",
  buildDate,
  manifestRevision,
  entries: [],
  offlineCapabilities: {
    remoteRevocation: false,
    sourceChangeDetectionAfterBuild: false,
  },
});

export const buildRuntimeKnowledgeBundle = (
  buildDate: string,
  context: EligibilityContext,
  manifestRevision: string,
  loadGovernedCorpus: () => GovernedCorpusInputs,
): RuntimeBundleResult => {
  const scopeReasons = assessProductScopePrecedence(context.productScope);
  if (scopeReasons.length > 0) {
    return {
      artifact: emptyArtifact(buildDate, manifestRevision),
      eligibilityByRevision: {
        scope: { status: "blocked", reasons: scopeReasons },
      },
      loaderInvoked: false,
    };
  }

  const inputs = loadGovernedCorpus();
  const eligibilityByRevision: Record<string, RuntimeEligibility> = {};
  const entries: RuntimeKnowledgeEntry[] = [];

  for (const entry of inputs.entries) {
    const eligibility = deriveRuntimeEligibility(
      entry,
      inputs.profiles,
      inputs.approvalEvidence,
      inputs.activationManifest,
      context,
    );
    eligibilityByRevision[entry.exactRevision] = eligibility;
    if (eligibility.status === "usable") {
      entries.push(projectRuntimeKnowledgeEntry(entry));
    }
  }

  entries.sort((left, right) =>
    left.runtimeReferenceId.localeCompare(right.runtimeReferenceId),
  );

  return {
    artifact: {
      ...emptyArtifact(buildDate, inputs.activationManifest.manifestRevision),
      entries,
    },
    eligibilityByRevision,
    loaderInvoked: true,
  };
};

export const serializeRuntimeKnowledgeArtifact = (
  artifact: RuntimeKnowledgeArtifact,
): string => `${JSON.stringify(artifact, null, 2)}\n`;

export const retireRevisionFromManifest = (
  manifest: ActivationManifest,
  exactRevision: string,
  newManifestRevision: string,
): EmergencyRetirementResult => {
  const pins = manifest.pins.filter(
    (pin) => pin.exactRevision !== exactRevision,
  );
  const removed = pins.length !== manifest.pins.length;

  return {
    manifest: {
      manifestRevision: newManifestRevision,
      pins,
    },
    removed,
    remoteRevocationPerformed: false,
    message:
      "The next bundle can exclude the retired revision. An already-downloaded offline bundle cannot be remotely revoked.",
  };
};

export const createExplicitRollbackManifest = (
  manifest: ActivationManifest,
  targetEntry: AuthoringKnowledgeEntry,
  consumptionScope: AuthoringKnowledgeEntry["approvedConsumptionScope"],
  previouslyValidExactRevisions: ReadonlySet<string>,
  newManifestRevision: string,
): ExplicitRollbackResult => {
  if (!previouslyValidExactRevisions.has(targetEntry.exactRevision)) {
    return {
      ok: false,
      reason: "rollback_target_not_previously_valid",
      message:
        "Rollback requires an explicitly named exact revision that was previously validated as usable.",
    };
  }

  const retainedPins = manifest.pins.filter(
    (pin) =>
      !(
        pin.exactRevision.split("@")[0] === targetEntry.entryId &&
        pin.consumptionScope === consumptionScope
      ),
  );

  return {
    ok: true,
    manifest: {
      manifestRevision: newManifestRevision,
      pins: [
        ...retainedPins,
        {
          exactRevision: targetEntry.exactRevision,
          contentDigest: targetEntry.contentDigest,
          consumptionScope,
          reason: `Explicit rollback to ${targetEntry.exactRevision}`,
        },
      ],
    },
  };
};
