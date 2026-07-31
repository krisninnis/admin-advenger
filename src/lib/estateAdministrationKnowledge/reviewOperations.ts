import {
  assessApprovalEvidenceRecord,
  buildRuntimeKnowledgeBundle,
  computeAuthoringContentDigest,
  createExplicitRollbackManifest,
  deriveRuntimeEligibility,
  retireRevisionFromManifest,
  validateActivationManifest,
  validateApprovalEvidenceShape,
  validateApprovalProfiles,
  validateAuthoringKnowledgeEntry,
  validateGovernedCorpusInputs,
} from "./governance.ts";
import {
  assessHumanReviewFoundation,
  EMPTY_HUMAN_REVIEW_WORKFLOW,
  validateHumanReviewWorkflow,
} from "./humanReviewWorkflow.ts";
import type {
  ActivationCandidateReport,
  ActivationManifest,
  ActivationPin,
  ApprovalEvidenceValidationReport,
  ApprovalProfile,
  ApprovalReadinessReport,
  ApprovalRole,
  AuthoringKnowledgeEntry,
  ConsumptionScope,
  EligibilityBlockCode,
  EligibilityContext,
  EvidenceRecordOperationalReport,
  ExternalApprovalEvidence,
  GovernedCorpusInputs,
  KnowledgeReviewPacketResult,
  ReviewDimensionChecklist,
  ReviewerChecklistResult,
  ReviewOperationsIssue,
  RevisionComparisonReport,
  RevisionFieldChange,
  RollbackPreparationReport,
  RuntimeBundleBlockReasonOccurrence,
  RuntimeBundleReport,
  RuntimeEligibility,
  RetirementPreparationReport,
  ValidationIssue,
} from "./types.ts";

const OFFLINE_REVOCATION_LIMITATION =
  "An already-downloaded offline bundle cannot be remotely revoked.";

const operationIssue = (
  code: ReviewOperationsIssue["code"],
  path: string,
  message: string,
): ReviewOperationsIssue => ({ code, path, message });

const unique = <T>(values: readonly T[]): readonly T[] => [
  ...new Set(values),
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validationIssue = (
  code: ValidationIssue["code"],
  path: string,
  message: string,
): ValidationIssue => ({ code, path, message });

const safelyValidate = (
  validator: () => readonly ValidationIssue[],
  fallbackCode: ValidationIssue["code"],
  path: string,
  message: string,
): readonly ValidationIssue[] => {
  try {
    return validator();
  } catch {
    return [validationIssue(fallbackCode, path, message)];
  }
};

const safeEntries = (
  entries: readonly AuthoringKnowledgeEntry[],
): readonly AuthoringKnowledgeEntry[] =>
  Array.isArray(entries)
    ? entries.filter(isRecord) as unknown as readonly AuthoringKnowledgeEntry[]
    : [];

const safeProfiles = (
  profiles: readonly ApprovalProfile[],
): readonly ApprovalProfile[] =>
  Array.isArray(profiles)
    ? profiles.filter(isRecord) as unknown as readonly ApprovalProfile[]
    : [];

const safeEvidence = (
  evidence: readonly ExternalApprovalEvidence[],
): readonly ExternalApprovalEvidence[] =>
  Array.isArray(evidence)
    ? evidence.filter(isRecord) as unknown as readonly ExternalApprovalEvidence[]
    : [];

const safeWorkflow = (
  workflow: GovernedCorpusInputs["humanReviewWorkflow"],
) => {
  if (!isRecord(workflow)) {
    return EMPTY_HUMAN_REVIEW_WORKFLOW;
  }

  return {
    requests: Array.isArray(workflow.requests)
      ? workflow.requests.filter(isRecord)
      : [],
    reviewerEligibility: Array.isArray(workflow.reviewerEligibility)
      ? workflow.reviewerEligibility.filter(isRecord)
      : [],
    assignments: Array.isArray(workflow.assignments)
      ? workflow.assignments.filter(isRecord)
      : [],
  } as unknown as NonNullable<GovernedCorpusInputs["humanReviewWorkflow"]>;
};

const safeManifest = (
  manifest: ActivationManifest,
): {
  manifest: ActivationManifest;
  validationIssues: readonly ValidationIssue[];
} => {
  if (
    isRecord(manifest) &&
    typeof manifest.manifestRevision === "string" &&
    Array.isArray(manifest.pins)
  ) {
    return {
      manifest,
      validationIssues: validateActivationManifest(manifest),
    };
  }

  return {
    manifest: {
      manifestRevision:
        isRecord(manifest) && typeof manifest.manifestRevision === "string"
          ? manifest.manifestRevision
          : "",
      pins:
        isRecord(manifest) && Array.isArray(manifest.pins)
          ? (manifest.pins.filter(isRecord) as unknown as ActivationPin[])
          : [],
    },
    validationIssues: [
      validationIssue(
        "invalid_activation_manifest",
        "activationManifest",
        "Activation manifest must define a manifest revision and pins array.",
      ),
    ],
  };
};

const blockedEligibility = (): RuntimeEligibility => ({
  status: "blocked",
  reasons: [],
});

const selectExactRevision = (
  entries: readonly AuthoringKnowledgeEntry[],
  exactRevision: string,
):
  | { entry: AuthoringKnowledgeEntry; issues: readonly [] }
  | { entry: null; issues: readonly ReviewOperationsIssue[] } => {
  const matches = safeEntries(entries).filter(
    (entry) => entry.exactRevision === exactRevision,
  );
  if (matches.length === 0) {
    return {
      entry: null,
      issues: [
        operationIssue(
          "exact_revision_not_found",
          exactRevision,
          `No authoring entry matches exact revision ${exactRevision}.`,
        ),
      ],
    };
  }
  if (matches.length > 1) {
    return {
      entry: null,
      issues: [
        operationIssue(
          "exact_revision_ambiguous",
          exactRevision,
          `More than one authoring entry matches exact revision ${exactRevision}.`,
        ),
      ],
    };
  }

  return { entry: matches[0]!, issues: [] };
};

const selectApprovalProfile = (
  entry: AuthoringKnowledgeEntry,
  profiles: readonly ApprovalProfile[],
): {
  profile: ApprovalProfile | null;
  issues: readonly ReviewOperationsIssue[];
} => {
  const matches = safeProfiles(profiles).filter(
    (profile) => profile.profileId === entry.approvalProfileId,
  );
  if (matches.length === 0) {
    return {
      profile: null,
      issues: [
        operationIssue(
          "approval_profile_missing",
          entry.approvalProfileId,
          `Approval profile ${entry.approvalProfileId} is missing.`,
        ),
      ],
    };
  }

  const profileIssues = safelyValidate(
    () => validateApprovalProfiles(matches),
    "invalid_approval_profile",
    entry.approvalProfileId,
    "The selected approval profile is malformed.",
  );
  if (matches.length > 1 || profileIssues.length > 0) {
    return {
      profile: matches[0] ?? null,
      issues: [
        operationIssue(
          "approval_profile_invalid",
          entry.approvalProfileId,
          `Approval profile ${entry.approvalProfileId} is ambiguous or invalid.`,
        ),
      ],
    };
  }

  return { profile: matches[0]!, issues: [] };
};

const exactRevisionEvidence = (
  entry: AuthoringKnowledgeEntry,
  evidence: readonly ExternalApprovalEvidence[],
): readonly ExternalApprovalEvidence[] =>
  safeEvidence(evidence).filter(
    (record) =>
      record.entryId === entry.entryId &&
      record.exactRevision === entry.exactRevision,
  );

const conceptualEntryEvidence = (
  entry: AuthoringKnowledgeEntry,
  evidence: readonly ExternalApprovalEvidence[],
): readonly ExternalApprovalEvidence[] =>
  safeEvidence(evidence).filter(
    (record) =>
      record.entryId === entry.entryId ||
      record.exactRevision === entry.exactRevision,
  );

const conceptualPins = (
  entry: AuthoringKnowledgeEntry,
  manifest: ActivationManifest,
  consumptionScope: ConsumptionScope,
): readonly ActivationPin[] =>
  (Array.isArray(manifest.pins) ? manifest.pins : []).filter(
    (pin) =>
      pin.exactRevision.split("@")[0] === entry.entryId &&
      pin.consumptionScope === consumptionScope,
  );

const canonicalDigestFor = (entry: AuthoringKnowledgeEntry): string => {
  const { contentDigest: _storedDigest, ...withoutDigest } = entry;
  return computeAuthoringContentDigest(withoutDigest);
};

const checklistPrompts: Readonly<Record<ApprovalRole, readonly string[]>> = {
  evidence: [
    "Verify the source identity, immutable snapshot, pinpoint, evidence text, and claim-to-source traceability.",
    "Record findings and evidence reviewed without inferring unsupported claims.",
  ],
  domain: [
    "Review jurisdiction, substantive boundaries, exceptions, uncertainty, and prohibited conclusions.",
    "Decide only within the reviewer's recorded qualification and authority.",
  ],
  product_safety: [
    "Check non-advice wording, human control, escalation, and unsafe inference boundaries.",
    "Confirm the wording preserves AI prepares. Humans decide.",
  ],
  accessibility: [
    "Check clarity, readability, cognitive load, and understandable qualifiers.",
  ],
  privacy: [
    "Check data minimisation and separation of reviewer and authoring metadata from runtime projection.",
  ],
  product_scope: [
    "Check intended consumption scope, excluded scope, and public availability boundaries.",
  ],
  engine_use: [
    "Check explicit fact inputs, fact-readiness requirements, and absence of personalised inferred decisions.",
  ],
  freshness: [
    "Check verified date, validity date, source-change risk, and configured re-review triggers.",
  ],
  activation: [
    "Check the exact revision, digest, scope, current manifest, pin conflicts, and separate product-owner decision boundary.",
  ],
};

const checklistReviewMaterials = (
  role: ApprovalRole,
  entry: AuthoringKnowledgeEntry,
): readonly { field: string; value: unknown }[] => {
  const common = [
    { field: "entryId", value: entry.entryId },
    { field: "exactRevision", value: entry.exactRevision },
    { field: "contentDigest", value: entry.contentDigest },
  ];
  const byRole: Readonly<
    Record<ApprovalRole, readonly { field: string; value: unknown }[]>
  > = {
    evidence: [
      { field: "sourceSnapshot", value: entry.sourceSnapshot },
      { field: "plainEnglishClaim", value: entry.plainEnglishClaim },
      { field: "preciseInternalClaim", value: entry.preciseInternalClaim },
    ],
    domain: [
      { field: "jurisdiction", value: entry.jurisdiction },
      {
        field: "applicabilityConstraints",
        value: entry.applicabilityConstraints,
      },
      { field: "exceptions", value: entry.exceptions },
      { field: "uncertaintyNote", value: entry.uncertaintyNote },
      {
        field: "prohibitedConclusionClasses",
        value: entry.prohibitedConclusionClasses,
      },
    ],
    product_safety: [
      { field: "allowedWording", value: entry.allowedWording },
      { field: "requiredQualifiers", value: entry.requiredQualifiers },
      { field: "escalationNotes", value: entry.escalationNotes },
      { field: "uncertaintyNote", value: entry.uncertaintyNote },
    ],
    accessibility: [
      { field: "allowedWording", value: entry.allowedWording },
      { field: "requiredQualifiers", value: entry.requiredQualifiers },
      { field: "uncertaintyNote", value: entry.uncertaintyNote },
    ],
    privacy: [
      { field: "authoringOnly", value: entry.authoringOnly },
      { field: "sourceSnapshot", value: entry.sourceSnapshot },
    ],
    product_scope: [
      {
        field: "approvedConsumptionScope",
        value: entry.approvedConsumptionScope,
      },
      { field: "topic", value: entry.topic },
      { field: "jurisdiction", value: entry.jurisdiction },
    ],
    engine_use: [
      { field: "preciseInternalClaim", value: entry.preciseInternalClaim },
      {
        field: "applicabilityConstraints",
        value: entry.applicabilityConstraints,
      },
      {
        field: "prohibitedConclusionClasses",
        value: entry.prohibitedConclusionClasses,
      },
    ],
    freshness: [
      { field: "freshness", value: entry.freshness },
      { field: "sourceSnapshot", value: entry.sourceSnapshot },
    ],
    activation: [
      { field: "disposition", value: entry.disposition },
      { field: "evidenceConfidence", value: entry.evidenceConfidence },
      {
        field: "approvedConsumptionScope",
        value: entry.approvedConsumptionScope,
      },
      { field: "approvalProfileId", value: entry.approvalProfileId },
    ],
  };

  return [...common, ...byRole[role]];
};

export const validateApprovalEvidenceForOperations = ({
  exactRevision,
  inputs,
  context,
}: {
  exactRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): ApprovalEvidenceValidationReport => {
  const selected = selectExactRevision(inputs.entries, exactRevision);
  if (!selected.entry) {
    return {
      status: "blocked",
      authority: "machine_validation_report_only",
      exactRevision,
      validRecords: [],
      invalidRecords: [],
      records: [],
      missingRequiredRoles: [],
      duplicateEvidenceRoles: [],
      competingEvidenceRoles: [],
      expiredEvidenceIds: [],
      openConditions: [],
      blockingIssueCodes: [],
      validationIssues: [],
      operationIssues: selected.issues,
    };
  }

  const entry = selected.entry;
  const profileSelection = selectApprovalProfile(entry, inputs.profiles);
  const profile = profileSelection.profile;
  const workflow = safeWorkflow(inputs.humanReviewWorkflow);
  const evidence = conceptualEntryEvidence(entry, inputs.approvalEvidence);
  const authoringIssues = safelyValidate(
    () => validateAuthoringKnowledgeEntry(entry),
    "invalid_authoring_entry",
    exactRevision,
    "The selected authoring entry is malformed.",
  );
  const profileValidationIssues = safelyValidate(
    () =>
      validateApprovalProfiles(
        safeProfiles(inputs.profiles).filter(
          (candidate) =>
            candidate.profileId === entry.approvalProfileId,
        ),
      ),
    "invalid_approval_profile",
    entry.approvalProfileId,
    "The selected approval profile is malformed.",
  );
  const workflowIssues = safelyValidate(
    () =>
      validateHumanReviewWorkflow(
        workflow,
        safeEvidence(inputs.approvalEvidence),
      ),
    "invalid_review_request",
    "humanReviewWorkflow",
    "The supplied human-review workflow is malformed.",
  );
  const reports: EvidenceRecordOperationalReport[] = evidence.map((record) => {
    const shapeIssues = safelyValidate(
      () => validateApprovalEvidenceShape([record]),
      "invalid_approval_evidence",
      record.evidenceId || "approvalEvidence",
      "The approval-evidence record is malformed.",
    );
    const mismatches: string[] = [];
    if (record.entryId !== entry.entryId) {
      mismatches.push("entry_id_mismatch");
    }
    if (record.exactRevision !== entry.exactRevision) {
      mismatches.push("exact_revision_mismatch");
    }
    if (record.contentDigest !== entry.contentDigest) {
      mismatches.push("content_digest_mismatch");
    }
    if (profile && record.approvalProfileId !== profile.profileId) {
      mismatches.push("approval_profile_mismatch");
    }
    if (profile && !profile.requiredRoles.includes(record.role)) {
      mismatches.push("role_not_required");
    }
    if (profile && !profile.allowedEvidenceKinds.includes(record.evidenceKind)) {
      mismatches.push("evidence_kind_not_allowed");
    }

    const blockCodes: EligibilityBlockCode[] = [];
    if (shapeIssues.length > 0 || mismatches.length > 0 || !profile) {
      blockCodes.push("approval_evidence_invalid");
    }

    if (profile) {
      try {
        blockCodes.push(
          ...assessApprovalEvidenceRecord(
            entry,
            profile,
            record,
            record.role,
            context,
            workflow,
          ).blockCodes,
        );
      } catch {
        blockCodes.push("approval_evidence_invalid");
      }
    }

    const uniqueBlockCodes = unique(blockCodes);
    const applicable =
      record.entryId === entry.entryId ||
      record.exactRevision === entry.exactRevision;
    const validity =
      !applicable
        ? "not_applicable"
        : shapeIssues.length === 0 &&
            mismatches.length === 0 &&
            uniqueBlockCodes.length === 0
          ? "valid"
          : "invalid";
    const openConditions = (Array.isArray(record.conditions)
      ? record.conditions
      : []
    ).filter(
      (condition) =>
        condition.status === "open" ||
        condition.enforcement !== "machine_gate" ||
        condition.satisfactionEvidenceReference === null,
    );
    const expired =
      record.expiresAt !== null && context.asOfDate > record.expiresAt;
    const explanations = [
      ...shapeIssues.map((candidate) => candidate.message),
      ...mismatches.map(
        (mismatch) =>
          `The evidence record has an exact binding mismatch: ${mismatch}.`,
      ),
      ...uniqueBlockCodes.map(
        (code) => `Existing governance blocks this record with ${code}.`,
      ),
    ];

    return {
      evidenceId: record.evidenceId,
      role: record.role,
      synthetic: record.evidenceKind === "synthetic_test",
      validity,
      mismatches,
      shapeIssues,
      blockCodes: uniqueBlockCodes,
      explanations,
      openConditions,
      expired,
      record,
    };
  });

  const validRecords = reports.filter((report) => report.validity === "valid");
  const invalidRecords = reports.filter(
    (report) => report.validity === "invalid",
  );
  const missingRequiredRoles = profile
    ? profile.requiredRoles.filter(
        (role) =>
          !validRecords.some((record) => record.record.role === role),
      )
    : [];
  const duplicateEvidenceRoles: ApprovalRole[] = [];
  const competingEvidenceRoles: ApprovalRole[] = [];
  if (profile) {
    for (const role of profile.requiredRoles) {
      const roleRecords = evidence.filter(
        (record) =>
          record.role === role &&
          record.entryId === entry.entryId &&
          record.exactRevision === entry.exactRevision,
      );
      if (roleRecords.length <= 1) {
        continue;
      }

      const decisions = new Set(
        roleRecords.map((record) => record.decision),
      );
      if (decisions.size > 1) {
        competingEvidenceRoles.push(role);
      } else {
        duplicateEvidenceRoles.push(role);
      }
    }
  }
  const duplicateIssues: ReviewOperationsIssue[] = [
    ...duplicateEvidenceRoles.map((role) =>
      operationIssue(
        "duplicate_approval_evidence",
        `${exactRevision}.${role}`,
        `Required role ${role} has more than one equivalent approval-evidence record; no record was selected silently.`,
      ),
    ),
    ...competingEvidenceRoles.map((role) =>
      operationIssue(
        "competing_approval_evidence",
        `${exactRevision}.${role}`,
        `Required role ${role} has competing approval-evidence decisions; no record was selected silently.`,
      ),
    ),
  ];
  const blockingIssueCodes = unique([
    ...invalidRecords.flatMap((record) => record.blockCodes),
    ...(duplicateIssues.length > 0
      ? (["approval_evidence_invalid"] as const)
      : []),
    ...(missingRequiredRoles.length > 0
      ? ([
          "approval_evidence_missing",
          "review_dimension_missing",
        ] as const)
      : []),
  ]);
  const validationIssues = [
    ...authoringIssues,
    ...profileValidationIssues,
    ...safelyValidate(
      () => validateApprovalEvidenceShape(evidence),
      "invalid_approval_evidence",
      exactRevision,
      "The supplied approval-evidence collection is malformed.",
    ),
    ...workflowIssues,
  ];
  const operationIssues = [
    ...profileSelection.issues,
    ...(authoringIssues.length > 0
      ? [
          operationIssue(
            "authoring_input_invalid",
            exactRevision,
            "The selected authoring entry is invalid.",
          ),
        ]
      : []),
    ...(workflowIssues.length > 0
      ? [
          operationIssue(
            "review_workflow_invalid",
            exactRevision,
            "The supplied human-review workflow is invalid.",
          ),
        ]
      : []),
    ...duplicateIssues,
  ];

  return {
    status:
      profile &&
      operationIssues.length === 0 &&
      invalidRecords.length === 0 &&
      missingRequiredRoles.length === 0 &&
      validationIssues.length === 0
        ? "complete"
        : "blocked",
    authority: "machine_validation_report_only",
    exactRevision,
    validRecords,
    invalidRecords,
    records: reports,
    missingRequiredRoles,
    duplicateEvidenceRoles,
    competingEvidenceRoles,
    expiredEvidenceIds: reports
      .filter((report) => report.expired)
      .map((report) => report.evidenceId),
    openConditions: reports.flatMap((report) => report.openConditions),
    blockingIssueCodes,
    validationIssues,
    operationIssues,
  };
};

export const buildKnowledgeReviewPacket = ({
  exactRevision,
  inputs,
  context,
}: {
  exactRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): KnowledgeReviewPacketResult => {
  const selected = selectExactRevision(inputs.entries, exactRevision);
  if (!selected.entry) {
    return { status: "blocked", issues: selected.issues };
  }

  const entry = selected.entry;
  const profileSelection = selectApprovalProfile(entry, inputs.profiles);
  const profile = profileSelection.profile;
  const workflow = safeWorkflow(inputs.humanReviewWorkflow);
  const records = exactRevisionEvidence(entry, inputs.approvalEvidence);
  const requestIds = new Set(
    workflow.requests
      .filter((request) => request.exactRevision === exactRevision)
      .map((request) => request.requestId),
  );
  const requests = workflow.requests.filter((request) =>
    requestIds.has(request.requestId),
  );
  const assignments = workflow.assignments.filter((assignment) =>
    requestIds.has(assignment.requestId),
  );
  const eligibilityIds = new Set(
    assignments.map((assignment) => assignment.reviewerEligibilityId),
  );
  const reviewerEligibility = workflow.reviewerEligibility.filter(
    (eligibility) => eligibilityIds.has(eligibility.eligibilityId),
  );
  const evidenceReport = validateApprovalEvidenceForOperations({
    exactRevision,
    inputs,
    context,
  });
  const roles =
    profile?.requiredRoles ??
    unique(records.map((record) => record.role));
  const manifestResult = safeManifest(inputs.activationManifest);
  const pins = conceptualPins(
    entry,
    manifestResult.manifest,
    entry.approvedConsumptionScope,
  );
  const validationIssues = [
    ...safelyValidate(
      () => validateAuthoringKnowledgeEntry(entry),
      "invalid_authoring_entry",
      exactRevision,
      "The selected authoring entry is malformed.",
    ),
    ...safelyValidate(
      () => validateApprovalProfiles(safeProfiles(inputs.profiles)),
      "invalid_approval_profile",
      "profiles",
      "The approval-profile collection is malformed.",
    ),
    ...safelyValidate(
      () => validateApprovalEvidenceShape(safeEvidence(inputs.approvalEvidence)),
      "invalid_approval_evidence",
      "approvalEvidence",
      "The approval-evidence collection is malformed.",
    ),
    ...safelyValidate(
      () =>
        validateHumanReviewWorkflow(
          workflow,
          safeEvidence(inputs.approvalEvidence),
        ),
      "invalid_review_request",
      "humanReviewWorkflow",
      "The human-review workflow is malformed.",
    ),
    ...manifestResult.validationIssues,
  ];
  const issues: ReviewOperationsIssue[] = [
    ...profileSelection.issues,
    ...(validationIssues.some(
      (candidate) =>
        candidate.code === "invalid_authoring_entry" ||
        candidate.code === "invalid_exact_revision" ||
        candidate.code === "revision_content_mismatch",
    )
      ? [
          operationIssue(
            "authoring_input_invalid",
            exactRevision,
            "The selected authoring entry is invalid.",
          ),
        ]
      : []),
    ...(validationIssues.some((candidate) =>
      candidate.path.includes("review"),
    )
      ? [
          operationIssue(
            "review_workflow_invalid",
            exactRevision,
            "The supplied human-review workflow is invalid.",
          ),
        ]
      : []),
    ...evidenceReport.operationIssues.filter(
      (candidate) =>
        candidate.code === "duplicate_approval_evidence" ||
        candidate.code === "competing_approval_evidence",
    ),
    ...(manifestResult.validationIssues.length > 0
      ? [
          operationIssue(
            "activation_manifest_invalid",
            "activationManifest",
            "The supplied activation manifest is invalid.",
          ),
        ]
      : []),
  ];

  try {
    const canonicalContentDigest = canonicalDigestFor(entry);
    const packet = {
      authority: "operational_report_only",
      authoringContent: {
        entry,
        canonicalContentDigest,
        digestMatchesCanonicalContent:
          canonicalContentDigest === entry.contentDigest,
        approvalProfile: profile,
      },
      externalApprovalEvidence: {
        records,
        requests,
        reviewerEligibility,
        assignments,
        evidenceSummary: roles.map((role) => {
          const roleRecords = records.filter(
            (record) => record.role === role,
          );
          return {
            role,
            evidenceIds: roleRecords.map((record) => record.evidenceId),
            satisfyingEvidenceIds: evidenceReport.validRecords
              .filter((record) => record.role === role)
              .map((record) => record.evidenceId),
            openConditionIds: roleRecords.flatMap((record) =>
              record.conditions
                .filter((condition) => condition.status === "open")
                .map((condition) => condition.conditionId),
            ),
          };
        }),
        openConditions: records.flatMap((record) =>
          record.conditions.filter(
            (condition) => condition.status === "open",
          ),
        ),
      },
      activationState: {
        manifestRevision: manifestResult.manifest.manifestRevision,
        matchingPins: pins.filter(
          (pin) =>
            pin.exactRevision === entry.exactRevision &&
            pin.contentDigest === entry.contentDigest,
        ),
        conflictingPins: pins.filter(
          (pin) =>
            pin.exactRevision !== entry.exactRevision ||
            pin.contentDigest !== entry.contentDigest,
        ),
      },
      derivedOperationalReporting: {
        requiredReviewerRoles: profile?.requiredRoles ?? [],
        validationIssues,
        runtimeEligibility: deriveRuntimeEligibility(
          entry,
          safeProfiles(inputs.profiles),
          safeEvidence(inputs.approvalEvidence),
          manifestResult.manifest,
          context,
          workflow,
        ),
      },
    } satisfies NonNullable<
      Extract<KnowledgeReviewPacketResult, { status: "prepared" }>["packet"]
    >;

    return issues.length > 0 || validationIssues.length > 0
      ? { status: "blocked", issues, packet }
      : { status: "prepared", packet };
  } catch {
    return {
      status: "blocked",
      issues: unique([
        ...issues,
        operationIssue(
          "authoring_input_invalid",
          exactRevision,
          "The malformed authoring entry could not be rendered safely.",
        ),
      ]),
    };
  }
};

export const buildReviewerChecklists = ({
  exactRevision,
  inputs,
  context,
}: {
  exactRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): ReviewerChecklistResult => {
  const selected = selectExactRevision(inputs.entries, exactRevision);
  if (!selected.entry) {
    return {
      status: "blocked",
      issues: selected.issues,
      validationIssues: [],
    };
  }

  const entry = selected.entry;
  const profileSelection = selectApprovalProfile(entry, inputs.profiles);
  if (!profileSelection.profile) {
    return {
      status: "blocked",
      issues: profileSelection.issues,
      validationIssues: safelyValidate(
        () => validateAuthoringKnowledgeEntry(entry),
        "invalid_authoring_entry",
        exactRevision,
        "The selected authoring entry is malformed.",
      ),
    };
  }

  const profile = profileSelection.profile;
  const workflow = safeWorkflow(inputs.humanReviewWorkflow);
  const requests = workflow.requests.filter(
    (request) => request.exactRevision === entry.exactRevision,
  );
  const requestIds = new Set(requests.map((request) => request.requestId));
  const evidence = exactRevisionEvidence(entry, inputs.approvalEvidence);
  const evidenceReport = validateApprovalEvidenceForOperations({
    exactRevision,
    inputs,
    context,
  });
  let runtimeEligibility = blockedEligibility();
  try {
    runtimeEligibility = deriveRuntimeEligibility(
      entry,
      safeProfiles(inputs.profiles),
      safeEvidence(inputs.approvalEvidence),
      safeManifest(inputs.activationManifest).manifest,
      context,
      workflow,
    );
  } catch {
    // Canonical validation issues below retain the malformed-input reason.
  }
  const validationIssues = [
    ...safelyValidate(
      () => validateAuthoringKnowledgeEntry(entry),
      "invalid_authoring_entry",
      exactRevision,
      "The selected authoring entry is malformed.",
    ),
    ...safelyValidate(
      () =>
        validateApprovalProfiles(
          safeProfiles(inputs.profiles).filter(
            (candidate) =>
              candidate.profileId === entry.approvalProfileId,
          ),
        ),
      "invalid_approval_profile",
      entry.approvalProfileId,
      "The selected approval profile is malformed.",
    ),
    ...safelyValidate(
      () =>
        validateHumanReviewWorkflow(
          workflow,
          safeEvidence(inputs.approvalEvidence),
        ),
      "invalid_review_request",
      "humanReviewWorkflow",
      "The supplied human-review workflow is malformed.",
    ),
  ];
  let foundationIssues: readonly ReviewOperationsIssue[] = [];
  try {
    foundationIssues = reviewFoundationIssues(
      entry,
      profile,
      { ...inputs, humanReviewWorkflow: workflow },
      context,
    );
  } catch {
    foundationIssues = [
      operationIssue(
        "review_workflow_invalid",
        exactRevision,
        "The supplied human-review workflow is malformed.",
      ),
    ];
  }

  const checklists: ReviewDimensionChecklist[] = profile.requiredRoles.map(
    (role) => {
      const assignments = workflow.assignments.filter(
        (assignment) =>
          assignment.role === role && requestIds.has(assignment.requestId),
      );
      const eligibilityIds = new Set(
        assignments.map((assignment) => assignment.reviewerEligibilityId),
      );
      const roleEvidence = evidence.filter((record) => record.role === role);
      const blockCodes: EligibilityBlockCode[] = [];
      blockCodes.push(
        ...evidenceReport.records
          .filter((record) => record.role === role)
          .flatMap((record) => record.blockCodes),
      );
      if (evidenceReport.missingRequiredRoles.includes(role)) {
        blockCodes.push(
          "approval_evidence_missing",
          "review_dimension_missing",
        );
      }
      if (
        evidenceReport.duplicateEvidenceRoles.includes(role) ||
        evidenceReport.competingEvidenceRoles.includes(role)
      ) {
        blockCodes.push("approval_evidence_invalid");
      }
      const runtimeRoleCodes: Readonly<
        Partial<Record<ApprovalRole, readonly EligibilityBlockCode[]>>
      > = {
        evidence: ["source_snapshot_missing"],
        domain: ["wrong_jurisdiction"],
        product_safety: ["prohibited_safety_wording"],
        product_scope: [
          "public_route_unavailable",
          "feature_or_beta_scope_unavailable",
          "product_approval_missing",
          "wrong_jurisdiction",
          "consumption_scope_mismatch",
          "approval_profile_non_production",
          "approval_profile_invalid",
        ],
        engine_use: ["missing_facts", "conflicting_facts"],
        freshness: [
          "freshness_unverifiable",
          "expired",
          "review_evidence_expired",
        ],
        activation: [
          "not_approved",
          "rejected",
          "retired",
          "superseded",
          "evidence_confidence_blocked",
          "not_activated",
          "incorrect_revision_pin",
          "conflicting_active_revision",
        ],
      };
      const relevantRuntimeCodes = new Set(runtimeRoleCodes[role] ?? []);
      if (runtimeEligibility.status === "blocked") {
        blockCodes.push(
          ...runtimeEligibility.reasons
            .map((reason) => reason.code)
            .filter((code) => relevantRuntimeCodes.has(code)),
        );
      }

      return {
        authority: "human_review_prompt_only",
        createsApprovalEvidence: false,
        entryId: entry.entryId,
        exactRevision: entry.exactRevision,
        contentDigest: entry.contentDigest,
        approvalProfileId: profile.profileId,
        intendedConsumptionScope: entry.approvedConsumptionScope,
        role,
        reviewRequestIds: requests.map((request) => request.requestId),
        assignmentIds: assignments.map(
          (assignment) => assignment.assignmentId,
        ),
        reviewerEligibilityIds: workflow.reviewerEligibility
          .filter((eligibility) =>
            eligibilityIds.has(eligibility.eligibilityId),
          )
          .map((eligibility) => eligibility.eligibilityId),
        evidenceReferencesToReview: unique(
          requests.flatMap((request) => request.evidenceToReview),
        ),
        openConditionIds: roleEvidence.flatMap((record) =>
          record.conditions
            .filter((condition) => condition.status === "open")
            .map((condition) => condition.conditionId),
        ),
        currentBlockCodes: unique(blockCodes),
        reviewMaterials: checklistReviewMaterials(role, entry),
        requiresValidUntil: profile.requiresValidUntil,
        requiresReviewEvidenceExpiry:
          profile.requiresReviewEvidenceExpiry,
        reReviewTriggers: profile.reReviewTriggers,
        prompts: checklistPrompts[role],
      };
    },
  );

  const issues = unique([
    ...profileSelection.issues,
    ...foundationIssues,
    ...evidenceReport.operationIssues,
    ...(validationIssues.some(
      (candidate) => candidate.code === "invalid_authoring_entry",
    )
      ? [
          operationIssue(
            "authoring_input_invalid",
            exactRevision,
            "The selected authoring entry is invalid.",
          ),
        ]
      : []),
    ...(validationIssues.some(
      (candidate) =>
        candidate.code.startsWith("invalid_review") ||
        candidate.code.startsWith("duplicate_review"),
    )
      ? [
          operationIssue(
            "review_workflow_invalid",
            exactRevision,
            "The supplied human-review workflow is invalid.",
          ),
        ]
      : []),
  ]);
  const blocked =
    issues.length > 0 ||
    validationIssues.length > 0 ||
    evidenceReport.status === "blocked";

  return blocked
    ? { status: "blocked", issues, checklists, validationIssues }
    : { status: "prepared", checklists, validationIssues };
};

const reviewFoundationIssues = (
  entry: AuthoringKnowledgeEntry,
  profile: ApprovalProfile,
  inputs: GovernedCorpusInputs,
  context: EligibilityContext,
): readonly ReviewOperationsIssue[] => {
  const workflow =
    inputs.humanReviewWorkflow ?? EMPTY_HUMAN_REVIEW_WORKFLOW;
  const issues: ReviewOperationsIssue[] = [];
  const requests = workflow.requests.filter(
    (request) => request.exactRevision === entry.exactRevision,
  );
  if (requests.length === 0) {
    return [
      operationIssue(
        "review_request_missing",
        entry.exactRevision,
        "No human-review request is bound to the exact revision.",
      ),
    ];
  }
  if (requests.length > 1) {
    return [
      operationIssue(
        "review_request_ambiguous",
        entry.exactRevision,
        "More than one human-review request is bound to the exact revision.",
      ),
    ];
  }

  const request = requests[0]!;
  if (
    request.entryId !== entry.entryId ||
    request.contentDigest !== entry.contentDigest ||
    request.approvalProfileId !== profile.profileId ||
    request.intendedConsumptionScope !== entry.approvedConsumptionScope ||
    request.intendedConsumptionScope !== context.consumptionScope ||
    request.status === "draft" ||
    request.status === "withdrawn"
  ) {
    issues.push(
      operationIssue(
        "review_request_mismatch",
        request.requestId,
        "The review request does not match the exact revision, digest, profile, scope, or usable workflow state.",
      ),
    );
  }

  for (const role of profile.requiredRoles) {
    const foundation = assessHumanReviewFoundation(
      entry,
      profile,
      role,
      context.asOfDate,
      workflow,
    );
    for (const code of foundation.blockCodes) {
      const mapped =
        code === "review_request_missing"
          ? operationIssue(
              request.requestedRoles.includes(role)
                ? "review_request_mismatch"
                : "required_review_role_missing",
              `${request.requestId}.${role}`,
              `The canonical review foundation rejects the request binding for required role ${role}.`,
            )
          : code === "review_assignment_missing"
            ? operationIssue(
                "review_assignment_missing",
                `${request.requestId}.${role}`,
                `The canonical review foundation rejects the assignment for required role ${role}.`,
              )
            : code === "reviewer_conflict_unresolved"
              ? operationIssue(
                  "reviewer_conflict_unresolved",
                  `${request.requestId}.${role}`,
                  `The canonical review foundation reports a declared or unresolved conflict for required role ${role}.`,
                )
              : operationIssue(
                  "reviewer_authority_missing",
                  `${request.requestId}.${role}`,
                  `The canonical review foundation rejects reviewer eligibility or authority for required role ${role}.`,
                );
      issues.push(mapped);
    }
  }

  return issues;
};

export const assessApprovalReadiness = ({
  exactRevision,
  inputs,
  context,
}: {
  exactRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): ApprovalReadinessReport => {
  const evidenceReport = validateApprovalEvidenceForOperations({
    exactRevision,
    inputs,
    context,
  });
  const selected = selectExactRevision(inputs.entries, exactRevision);
  if (!selected.entry) {
    return {
      state: "not_ready",
      authority: "machine_gate_report_only",
      exactRevision,
      issues: selected.issues,
      validationIssues: [],
      evidenceReport,
    };
  }

  const entry = selected.entry;
  const profileSelection = selectApprovalProfile(entry, inputs.profiles);
  const workflow =
    inputs.humanReviewWorkflow ?? EMPTY_HUMAN_REVIEW_WORKFLOW;
  const validationIssues = [
    ...validateAuthoringKnowledgeEntry(entry),
    ...validateApprovalProfiles(
      profileSelection.profile ? [profileSelection.profile] : [],
    ),
    ...validateHumanReviewWorkflow(workflow, inputs.approvalEvidence),
    ...validateApprovalEvidenceShape(
      conceptualEntryEvidence(entry, inputs.approvalEvidence),
    ),
  ];
  const foundationIssues = profileSelection.profile
    ? reviewFoundationIssues(
        entry,
        profileSelection.profile,
        inputs,
        context,
      )
    : [];
  const issues = [
    ...profileSelection.issues,
    ...foundationIssues,
    ...(evidenceReport.invalidRecords.length > 0
      ? [
          operationIssue(
            "approval_evidence_invalid",
            exactRevision,
            "One or more supplied approval-evidence records are invalid, mismatched, expired, conflicted, conditional, or non-approving.",
          ),
        ]
      : []),
  ];
  const state =
    issues.length > 0 || validationIssues.length > 0
      ? "not_ready"
      : evidenceReport.status === "complete"
        ? "recorded_approval_complete"
        : "ready_for_human_decision";

  return {
    state,
    authority: "machine_gate_report_only",
    exactRevision,
    issues,
    validationIssues,
    evidenceReport,
  };
};

export const prepareActivationCandidate = ({
  exactRevision,
  requestedConsumptionScope,
  proposedReason,
  proposedManifestRevision,
  inputs,
  context,
}: {
  exactRevision: string;
  requestedConsumptionScope: ConsumptionScope;
  proposedReason: string;
  proposedManifestRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): ActivationCandidateReport => {
  const selected = selectExactRevision(inputs.entries, exactRevision);
  if (!selected.entry) {
    return {
      state: "blocked",
      authority: "manual_manifest_decision_required",
      exactRevision,
      contentDigest: null,
      requestedConsumptionScope,
      proposedReason,
      currentManifestRevision: inputs.activationManifest.manifestRevision,
      proposedManifestRevision,
      proposedPin: null,
      activeRevisionConflicts: [],
      currentEligibility: blockedEligibility(),
      candidateEligibility: blockedEligibility(),
      blockingReasons: [],
      validationIssues: validateActivationManifest(
        inputs.activationManifest,
      ),
      operationIssues: selected.issues,
    };
  }

  const entry = selected.entry;
  const candidateContext: EligibilityContext = {
    ...context,
    consumptionScope: requestedConsumptionScope,
  };
  const proposedPin: ActivationPin = {
    exactRevision: entry.exactRevision,
    contentDigest: entry.contentDigest,
    consumptionScope: requestedConsumptionScope,
    reason: proposedReason,
  };
  const currentConceptualPins = conceptualPins(
    entry,
    inputs.activationManifest,
    requestedConsumptionScope,
  );
  const exactPinAlreadyPresent = currentConceptualPins.some(
    (pin) =>
      pin.exactRevision === proposedPin.exactRevision &&
      pin.contentDigest === proposedPin.contentDigest,
  );
  const activeRevisionConflicts = currentConceptualPins.filter(
    (pin) =>
      pin.exactRevision !== proposedPin.exactRevision ||
      pin.contentDigest !== proposedPin.contentDigest,
  );
  const candidateManifest: ActivationManifest = {
    manifestRevision: proposedManifestRevision,
    pins: exactPinAlreadyPresent
      ? [...inputs.activationManifest.pins]
      : [...inputs.activationManifest.pins, proposedPin],
  };
  const workflow =
    inputs.humanReviewWorkflow ?? EMPTY_HUMAN_REVIEW_WORKFLOW;
  const currentEligibility = deriveRuntimeEligibility(
    entry,
    inputs.profiles,
    inputs.approvalEvidence,
    inputs.activationManifest,
    candidateContext,
    workflow,
  );
  const candidateEligibility = deriveRuntimeEligibility(
    entry,
    inputs.profiles,
    inputs.approvalEvidence,
    candidateManifest,
    candidateContext,
    workflow,
  );
  const validationIssues = validateGovernedCorpusInputs({
    ...inputs,
    activationManifest: candidateManifest,
  });
  const operationIssues =
    activeRevisionConflicts.length > 0
      ? [
          operationIssue(
            "activation_conflict",
            entry.entryId,
            "A different exact revision is already pinned for this conceptual entry and scope.",
          ),
        ]
      : [];
  const blockingReasons =
    candidateEligibility.status === "blocked"
      ? candidateEligibility.reasons
      : [];

  return {
    state:
      candidateEligibility.status === "usable" &&
      validationIssues.length === 0 &&
      operationIssues.length === 0
        ? "ready_for_human_manifest_decision"
        : "blocked",
    authority: "manual_manifest_decision_required",
    exactRevision,
    contentDigest: entry.contentDigest,
    requestedConsumptionScope,
    proposedReason,
    currentManifestRevision: inputs.activationManifest.manifestRevision,
    proposedManifestRevision,
    proposedPin,
    activeRevisionConflicts,
    currentEligibility,
    candidateEligibility,
    blockingReasons,
    validationIssues,
    operationIssues,
  };
};

export const buildRuntimeBundleReport = ({
  buildDate,
  requestedManifestRevision,
  inputs,
  context,
}: {
  buildDate: string;
  requestedManifestRevision: string;
  inputs: GovernedCorpusInputs;
  context: EligibilityContext;
}): RuntimeBundleReport => {
  const bundle = buildRuntimeKnowledgeBundle(
    buildDate,
    context,
    requestedManifestRevision,
    () => inputs,
  );
  const evaluatedEntries = Object.entries(
    bundle.eligibilityByRevision,
  ).filter(([exactRevision]) => exactRevision !== "scope");
  const blockedEntries = evaluatedEntries.flatMap(
    ([exactRevision, eligibility]) =>
      eligibility.status === "blocked"
        ? [{ exactRevision, reasons: eligibility.reasons }]
        : [],
  );
  const blockReasonGroups: Partial<
    Record<
      EligibilityBlockCode,
      RuntimeBundleBlockReasonOccurrence[]
    >
  > = {};
  for (const blocked of blockedEntries) {
    for (const reason of blocked.reasons) {
      const current = blockReasonGroups[reason.code] ?? [];
      current.push({
        exactRevision: blocked.exactRevision,
        message: reason.message,
      });
      blockReasonGroups[reason.code] = current;
    }
  }
  const scopeEligibility = bundle.eligibilityByRevision.scope;
  const scopeBlockReasons =
    scopeEligibility?.status === "blocked"
      ? scopeEligibility.reasons
      : [];
  for (const reason of scopeBlockReasons) {
    const current = blockReasonGroups[reason.code] ?? [];
    current.push({ exactRevision: "scope", message: reason.message });
    blockReasonGroups[reason.code] = current;
  }

  return {
    authority: "runtime_reporting_only",
    totalAuthoringEntries: inputs.entries.length,
    evaluatedExactRevisions: evaluatedEntries.map(
      ([exactRevision]) => exactRevision,
    ),
    usableEntries: evaluatedEntries.flatMap(
      ([exactRevision, eligibility]) =>
        eligibility.status === "usable" ? [exactRevision] : [],
    ),
    blockedEntries,
    notEvaluatedExactRevisions: bundle.loaderInvoked
      ? []
      : inputs.entries.map((entry) => entry.exactRevision),
    blockReasonsByCode: blockReasonGroups,
    scopeBlockReasons,
    projectedRuntimeReferences: bundle.artifact.entries.map(
      (entry) => entry.runtimeReferenceId,
    ),
    requestedManifestRevision,
    emittedManifestRevision: bundle.artifact.manifestRevision,
    buildDate,
    loaderInvoked: bundle.loaderInvoked,
    offlineCapabilities: bundle.artifact.offlineCapabilities,
    validationIssues: validateGovernedCorpusInputs(inputs),
    bundle,
  };
};

const comparisonFields = (
  entry: AuthoringKnowledgeEntry,
): Readonly<Record<string, unknown>> => ({
  revision: entry.revision,
  exactRevision: entry.exactRevision,
  title: entry.title,
  topic: entry.topic,
  jurisdiction: entry.jurisdiction,
  plainEnglishClaim: entry.plainEnglishClaim,
  preciseInternalClaim: entry.preciseInternalClaim,
  "sourceSnapshot.snapshotId": entry.sourceSnapshot.snapshotId,
  "sourceSnapshot.sourceId": entry.sourceSnapshot.sourceId,
  "sourceSnapshot.title": entry.sourceSnapshot.title,
  "sourceSnapshot.issuingAuthority": entry.sourceSnapshot.issuingAuthority,
  "sourceSnapshot.sourceType": entry.sourceSnapshot.sourceType,
  "sourceSnapshot.publicLocation": entry.sourceSnapshot.publicLocation,
  "sourceSnapshot.jurisdiction": entry.sourceSnapshot.jurisdiction,
  "sourceSnapshot.accessDate": entry.sourceSnapshot.accessDate,
  "sourceSnapshot.sourceRevision": entry.sourceSnapshot.sourceRevision,
  "sourceSnapshot.pinpoint": entry.sourceSnapshot.pinpoint,
  "sourceSnapshot.evidenceKind": entry.sourceSnapshot.evidenceKind,
  "sourceSnapshot.evidenceText": entry.sourceSnapshot.evidenceText,
  evidenceConfidence: entry.evidenceConfidence,
  applicabilityConstraints: entry.applicabilityConstraints,
  exceptions: entry.exceptions,
  uncertaintyNote: entry.uncertaintyNote,
  allowedWording: entry.allowedWording,
  requiredQualifiers: entry.requiredQualifiers,
  prohibitedConclusionClasses: entry.prohibitedConclusionClasses,
  escalationNotes: entry.escalationNotes,
  freshness: entry.freshness,
  approvalProfileId: entry.approvalProfileId,
  disposition: entry.disposition,
  approvedConsumptionScope: entry.approvedConsumptionScope,
  supersedes: entry.supersedes,
  supersededBy: entry.supersededBy,
});

const valuesEqual = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

type ReReviewChangeCategory =
  | "source"
  | "jurisdiction"
  | "wording"
  | "exceptions"
  | "prohibited_conclusions"
  | "uncertainty"
  | "escalation"
  | "freshness"
  | "scope"
  | "profile"
  | "confidence"
  | "disposition";

const configuredTriggerCategories: Readonly<
  Record<string, readonly ReReviewChangeCategory[]>
> = {
  "gov.uk tell us once page change": ["source"],
  "tell us once organisation-list change": ["source"],
  "gov.uk applying for probate guide change": ["source"],
  "hmcts probate form or service-route change": ["source"],
  "administration of estates act 1925 affecting provision": ["source"],
  "non-contentious probate rules amendment": ["source"],
  "jurisdiction change": ["jurisdiction"],
  "england and wales jurisdiction or terminology change": [
    "jurisdiction",
    "wording",
  ],
  "claim wording or qualifier change": ["wording"],
  "claim wording, qualifier, exception, or prohibited-conclusion change": [
    "wording",
    "exceptions",
    "prohibited_conclusions",
  ],
  "exception-only change": ["exceptions"],
  "prohibited conclusion change": ["prohibited_conclusions"],
  "uncertainty change": ["uncertainty"],
  "escalation change": ["escalation"],
  "freshness change": ["freshness"],
  "scope change": ["scope"],
  "approval profile change": ["profile"],
  "confidence change": ["confidence"],
  "disposition change": ["disposition"],
};

const changedCategories = (
  changedFields: ReadonlySet<string>,
): ReadonlySet<ReReviewChangeCategory> => {
  const categories = new Set<ReReviewChangeCategory>();
  if ([...changedFields].some((field) => field.startsWith("sourceSnapshot."))) {
    categories.add("source");
  }
  const fieldCategories: Readonly<
    Record<string, ReReviewChangeCategory>
  > = {
    jurisdiction: "jurisdiction",
    plainEnglishClaim: "wording",
    preciseInternalClaim: "wording",
    allowedWording: "wording",
    requiredQualifiers: "wording",
    exceptions: "exceptions",
    prohibitedConclusionClasses: "prohibited_conclusions",
    uncertaintyNote: "uncertainty",
    escalationNotes: "escalation",
    freshness: "freshness",
    approvedConsumptionScope: "scope",
    topic: "scope",
    approvalProfileId: "profile",
    evidenceConfidence: "confidence",
    disposition: "disposition",
  };
  for (const [field, category] of Object.entries(fieldCategories)) {
    if (changedFields.has(field)) {
      categories.add(category);
    }
  }
  if (changedFields.has("sourceSnapshot.jurisdiction")) {
    categories.add("jurisdiction");
  }
  return categories;
};

const triggerApplies = (
  trigger: string,
  changedFields: ReadonlySet<string>,
): boolean => {
  const categories =
    configuredTriggerCategories[trigger.trim().toLowerCase()] ?? [];
  const changes = changedCategories(changedFields);
  return categories.some((category) => changes.has(category));
};

export const compareKnowledgeRevisions = ({
  previousRevision,
  currentRevision,
  approvalProfile,
}: {
  previousRevision: AuthoringKnowledgeEntry;
  currentRevision: AuthoringKnowledgeEntry;
  approvalProfile?: ApprovalProfile;
}): RevisionComparisonReport => {
  const validationIssues = [
    ...safelyValidate(
      () => validateAuthoringKnowledgeEntry(previousRevision),
      "invalid_authoring_entry",
      "previousRevision",
      "The previous authoring revision is malformed.",
    ),
    ...safelyValidate(
      () => validateAuthoringKnowledgeEntry(currentRevision),
      "invalid_authoring_entry",
      "currentRevision",
      "The current authoring revision is malformed.",
    ),
    ...(approvalProfile
      ? safelyValidate(
          () => validateApprovalProfiles([approvalProfile]),
          "invalid_approval_profile",
          "approvalProfile",
          "The comparison approval profile is malformed.",
        )
      : []),
  ];
  if (validationIssues.length > 0) {
    return {
      status: "blocked",
      issues: [
        operationIssue(
          "comparison_input_invalid",
          "revisionComparison",
          "Revision comparison requires structurally valid immutable revisions and profile input.",
        ),
      ],
      validationIssues,
    };
  }

  if (previousRevision.entryId !== currentRevision.entryId) {
    return {
      status: "blocked",
      issues: [
        operationIssue(
          "conceptual_entry_mismatch",
          `${previousRevision.entryId}|${currentRevision.entryId}`,
          "Revision comparison requires two exact revisions of the same conceptual entry.",
        ),
      ],
      validationIssues: [],
    };
  }

  const previousFields = comparisonFields(previousRevision);
  const currentFields = comparisonFields(currentRevision);
  const changes: RevisionFieldChange[] = Object.keys(previousFields).flatMap(
    (field) =>
      valuesEqual(previousFields[field], currentFields[field])
        ? []
        : [
            {
              field,
              before: previousFields[field],
              after: currentFields[field],
            },
          ],
  );
  const changedFields = changes.map((change) => change.field);
  const changedFieldSet = new Set(changedFields);
  const configuredReReviewTriggers =
    approvalProfile?.reReviewTriggers ?? [];

  return {
    status: "compared",
    authority: "comparison_report_only",
    entryId: previousRevision.entryId,
    previousExactRevision: previousRevision.exactRevision,
    currentExactRevision: currentRevision.exactRevision,
    previousContentDigest: previousRevision.contentDigest,
    currentContentDigest: currentRevision.contentDigest,
    changes,
    changedFields,
    reReviewRequired:
      previousRevision.contentDigest !== currentRevision.contentDigest ||
      changes.length > 0,
    configuredReReviewTriggers,
    applicableReReviewTriggers: configuredReReviewTriggers.filter((trigger) =>
      triggerApplies(trigger, changedFieldSet),
    ),
  };
};

export const prepareRetirementReport = ({
  manifest,
  exactRevision,
  proposedManifestRevision,
}: {
  manifest: ActivationManifest;
  exactRevision: string;
  proposedManifestRevision: string;
}): RetirementPreparationReport => {
  const manifestResult = safeManifest(manifest);
  const proposal = retireRevisionFromManifest(
    manifestResult.manifest,
    exactRevision,
    proposedManifestRevision,
  );
  const pinsRemoved = manifestResult.manifest.pins.filter(
    (pin) => pin.exactRevision === exactRevision,
  );
  const validationIssues = [
    ...manifestResult.validationIssues,
    ...validateActivationManifest(proposal.manifest),
  ];
  const issues = [
    ...(manifestResult.validationIssues.length > 0
      ? [
          operationIssue(
            "activation_manifest_invalid",
            "activationManifest",
            "The supplied activation manifest is invalid.",
          ),
        ]
      : []),
    ...(pinsRemoved.length === 0
      ? [
          operationIssue(
            "retirement_target_not_pinned",
            exactRevision,
            "The exact revision is not pinned in the supplied manifest.",
          ),
        ]
      : []),
  ];

  return {
    state:
      issues.length === 0 && validationIssues.length === 0
        ? "proposal_prepared"
        : "blocked",
    authority: "manual_manifest_decision_required",
    exactRevision,
    currentManifestRevision: manifestResult.manifest.manifestRevision,
    proposedManifestRevision,
    pinsRemoved,
    pinsRetained: proposal.manifest.pins,
    proposedManifest: proposal.manifest,
    expectedNextBuildEffect: proposal.message,
    offlineLimitation: proposal.message,
    validationIssues,
    issues,
  };
};

export const prepareRollbackReport = ({
  manifest,
  entries,
  targetExactRevision,
  consumptionScope,
  previouslyValidExactRevisions,
  proposedManifestRevision,
}: {
  manifest: ActivationManifest;
  entries: readonly AuthoringKnowledgeEntry[];
  targetExactRevision: string;
  consumptionScope: ConsumptionScope;
  previouslyValidExactRevisions: ReadonlySet<string>;
  proposedManifestRevision: string;
}): RollbackPreparationReport => {
  const manifestResult = safeManifest(manifest);
  const selected = selectExactRevision(entries, targetExactRevision);
  if (!selected.entry) {
    return {
      state: "blocked",
      authority: "manual_manifest_decision_required",
      targetExactRevision,
      targetPreviouslyValid: false,
      currentManifestRevision: manifestResult.manifest.manifestRevision,
      proposedManifestRevision,
      pinsRemovedOrReplaced: [],
      proposedManifest: null,
      expectedNextBuildEffect:
        "No rollback proposal was prepared because the target is missing or ambiguous.",
      offlineLimitation: OFFLINE_REVOCATION_LIMITATION,
      validationIssues: manifestResult.validationIssues,
      issues: [
        ...selected.issues,
        ...(manifestResult.validationIssues.length > 0
          ? [
              operationIssue(
                "activation_manifest_invalid",
                "activationManifest",
                "The supplied activation manifest is invalid.",
              ),
            ]
          : []),
      ],
    };
  }

  const target = selected.entry;
  const targetPreviouslyValid = previouslyValidExactRevisions.has(
    target.exactRevision,
  );
  const proposal = createExplicitRollbackManifest(
    manifestResult.manifest,
    target,
    consumptionScope,
    previouslyValidExactRevisions,
    proposedManifestRevision,
  );
  const pinsRemovedOrReplaced = conceptualPins(
    target,
    manifestResult.manifest,
    consumptionScope,
  );
  if (!proposal.ok) {
    return {
      state: "blocked",
      authority: "manual_manifest_decision_required",
      targetExactRevision,
      targetPreviouslyValid,
      currentManifestRevision: manifestResult.manifest.manifestRevision,
      proposedManifestRevision,
      pinsRemovedOrReplaced,
      proposedManifest: null,
      expectedNextBuildEffect: proposal.message,
      offlineLimitation: OFFLINE_REVOCATION_LIMITATION,
      validationIssues: manifestResult.validationIssues,
      issues: [
        ...(manifestResult.validationIssues.length > 0
          ? [
              operationIssue(
                "activation_manifest_invalid",
                "activationManifest",
                "The supplied activation manifest is invalid.",
              ),
            ]
          : []),
        operationIssue(
          "rollback_target_not_previously_valid",
          targetExactRevision,
          proposal.message,
        ),
      ],
    };
  }

  const validationIssues = [
    ...manifestResult.validationIssues,
    ...validateActivationManifest(proposal.manifest),
  ];
  return {
    state:
      validationIssues.length === 0 ? "proposal_prepared" : "blocked",
    authority: "manual_manifest_decision_required",
    targetExactRevision,
    targetPreviouslyValid,
    currentManifestRevision: manifestResult.manifest.manifestRevision,
    proposedManifestRevision,
    pinsRemovedOrReplaced,
    proposedManifest: proposal.manifest,
    expectedNextBuildEffect: `The next build can explicitly project ${targetExactRevision} if every current governance gate still passes.`,
    offlineLimitation: OFFLINE_REVOCATION_LIMITATION,
    validationIssues,
    issues:
      manifestResult.validationIssues.length > 0
        ? [
            operationIssue(
              "activation_manifest_invalid",
              "activationManifest",
              "The supplied activation manifest is invalid.",
            ),
          ]
        : [],
  };
};
