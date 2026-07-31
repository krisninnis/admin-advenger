# Estate Administration Knowledge Review Operations — v1

## 1. Document status

**Status: Draft — awaiting explicit human approval before implementation.**

This document is a specification for a proposed operational reporting layer. It
does not implement that layer and does not authorise production TypeScript
changes.

Approval of this specification is not approval of any knowledge entry,
reviewer, approval evidence, source wording, product wording, activation,
retirement, rollback, or public release. Each of those remains subject to its
existing, separate, explicit human-controlled repository decision.

Truth labels used in this document:

- **[Repo truth]** describes behaviour present in the repository at baseline
  `a825d44`.
- **[Proposal]** describes future work that must not begin until this
  specification receives explicit human approval.

## 2. Purpose

**[Proposal]** Add a pure, local, deterministic operations layer above the
existing Estate Administration knowledge governance engine so that human
reviewers can prepare and inspect:

1. review packets;
2. role-specific reviewer checklists;
3. approval-readiness reports;
4. approval-evidence validation reports;
5. activation candidates;
6. runtime bundle reports;
7. exact-revision comparisons; and
8. retirement and rollback preparation reports.

The layer makes existing repository evidence easier to review. It does not
become a second governance engine, a workflow database, or an approval
authority.

The product rule remains:

> **AI prepares. Humans decide.**

## 3. Central invariant

> **No automated operation may approve, activate, retire, replace, or roll back
> governed knowledge merely because machine validation passes.**

Automation may prepare, compare, validate, report, and propose.

Only explicit human-controlled repository changes may record approval evidence
or activation decisions. A successful report means only that supplied
repository inputs passed the named machine checks. It is never an independent
endorsement of the content, reviewer, evidence, or proposed action.

All operation names, result states, messages, and tests must preserve this
distinction. In particular, no result may use an unqualified `approved`,
`activated`, `retired`, or `rolled_back` status for an operation that merely
prepared a report.

## 4. Current repository truth

**[Repo truth]** The governed corpus currently includes:

- immutable authoring revisions identified by `entryId`, `revision`, and
  `exactRevision`;
- a canonical SHA-256 `contentDigest` generated from approval-relevant content
  by `computeAuthoringContentDigest`;
- authoring-entry, immutable-registry, approval-profile, external-evidence,
  human-review-workflow, and activation-manifest validation;
- versioned approval profiles with required roles, allowed evidence kinds,
  allowed consumption scopes, freshness requirements, and re-review triggers;
- external approval evidence bound to an exact revision, digest, profile,
  request, assignment, reviewer authority, role, review scope, reviewed commit,
  findings, conditions, dates, and evidence reference;
- human-review requests, reviewer eligibility, assignments, conditional
  decisions, and conflict declarations;
- fail-closed runtime eligibility with stable block codes;
- exact activation pins;
- an allowlisted runtime projection that excludes authoring-only and
  review-only metadata;
- deterministic runtime bundle generation and serialization;
- manifest-only emergency retirement preparation; and
- explicit rollback preparation restricted to an exact revision recorded as
  previously valid.

**[Repo truth]** The current real corpus is not approved or active:

- the Tell Us Once candidate is `draft`, has `evidenceConfidence: "blocked"`,
  uses a non-production approval profile, and has no external approval
  evidence;
- all 12 probate candidates are `draft`, have
  `evidenceConfidence: "blocked"`, use a non-production approval profile, and
  have no external approval evidence;
- `walkingSkeletonActivationManifest.pins` is empty;
- `walkingSkeletonGovernedInputs.humanReviewWorkflow` is empty;
- the hidden product scope is unavailable, feature-disabled, and not
  product-approved;
- Estate Administration input remains on the general product route; and
- `buildWalkingSkeletonRuntimeAsset` returns an artifact whose `entries` array
  is empty.

The proposed operations must report this truth without trying to repair,
reinterpret, or bypass it.

## 5. Problem statement

**[Repo truth]** The governance engine can determine whether exact repository
inputs are structurally valid and runtime-eligible, but it is intentionally not
a reviewer interface. A human currently has to inspect authoring, profiles,
workflow records, evidence, activation state, and runtime results separately.
That makes omission and transcription errors more likely during a real review.

**[Proposal]** Provide one additive composition layer that presents those
existing inputs and outputs coherently. The layer should answer operational
questions such as:

- What exact content and source evidence is under review?
- Which review dimensions are required, and which remain open?
- Does recorded evidence bind the exact revision, digest, profile, scope,
  workflow, reviewer, and reviewed commit?
- Which existing machine gates block a human activation decision?
- What did the runtime builder evaluate, block, skip, or project?
- What changed between two immutable revisions?
- What would a separately authorised retirement or rollback repository edit do
  to the next build?

The layer must not answer whether a legal or substantive claim is correct. That
judgment belongs to qualified human reviewers.

## 6. Scope

**[Proposal]** v1 covers pure functions operating only on explicit,
caller-supplied repository values:

- `AuthoringKnowledgeEntry`;
- `ApprovalProfile`;
- `ExternalApprovalEvidence`;
- `HumanReviewWorkflowInputs`;
- `ActivationManifest`;
- `EligibilityContext`;
- `RuntimeBundleResult`;
- the build date and manifest revision supplied by the caller; and
- an explicit set of previously valid exact revisions for rollback reporting.

Each operation returns an immutable report value. It performs no file I/O,
network I/O, environment lookup, clock read, repository mutation, or hidden
data loading. Dates used for validation are explicit inputs.

The operations covered are:

1. review packet preparation;
2. role-specific checklist preparation;
3. approval-readiness reporting;
4. approval-evidence validation reporting;
5. activation-candidate preparation;
6. runtime bundle reporting;
7. revision comparison; and
8. retirement and rollback preparation reporting.

## 7. Non-goals

This work must not:

- approve any knowledge revision or claim qualified review occurred;
- invent reviewers, signatures, authority bases, conflicts, findings,
  conditions, evidence references, or approval evidence;
- add, edit, or persist a review request, assignment, eligibility record,
  evidence record, profile, or activation pin;
- activate, retire, replace, or roll back knowledge automatically;
- expose Estate Administration publicly or add a UI, classifier, specialist
  route, decision-engine branch, or product-scope change;
- change probate or Tell Us Once authoring wording, source snapshots, digests,
  dispositions, confidence, or freshness;
- create a second approval system or reimplement governance decisions;
- read or index protected research, private evaluation material, credentials,
  tokens, secrets, environment files, `docs/research/`, or `opencode.jsonc`;
- add cloud storage, telemetry, upload paths, external APIs, or network access;
- add a production dependency; or
- place authoring-only or review-only metadata in a runtime artifact.

## 8. Proposed operational modules

**[Proposal]** The default implementation should add one module:

```text
src/lib/estateAdministrationKnowledge/reviewOperations.ts
```

It may define or import additive report types such as:

```text
KnowledgeReviewPacket
ReviewDimensionChecklist
ApprovalReadinessReport
EvidenceValidationReport
ActivationCandidateReport
RuntimeBundleReport
RevisionComparisonReport
RetirementPreparationReport
RollbackPreparationReport
```

These are reporting structures only. They confer no approval authority.

The module should expose narrowly named pure operations:

```text
prepareKnowledgeReviewPacket
prepareReviewDimensionChecklists
reportApprovalReadiness
reportApprovalEvidenceValidation
prepareActivationCandidateReport
reportRuntimeBundle
compareKnowledgeRevisions
prepareRetirementReport
prepareRollbackReport
```

The operations must compose the existing functions in `governance.ts` and
`humanReviewWorkflow.ts`, including as applicable:

- `validateAuthoringKnowledgeEntry`;
- `validateAuthoringRegistry`;
- `validateApprovalProfiles`;
- `validateApprovalEvidenceShape`;
- `validateHumanReviewWorkflow`;
- `validateActivationManifest`;
- `validateGovernedCorpusInputs`;
- `assessHumanReviewEvidence`;
- `reviewDecisionCanSatisfyApproval`;
- `deriveRuntimeEligibility`;
- `buildRuntimeKnowledgeBundle`;
- `retireRevisionFromManifest`; and
- `createExplicitRollbackManifest`.

The reporting layer may organise, group, and label those results. It must not
copy their rules into parallel predicates or replace their block codes with
friendlier but less precise conclusions.

No operation may persist the proposal value returned by an existing manifest
helper. Persistence remains an explicit, separately reviewed repository edit.

## 9. Review packet

**[Proposal]** `KnowledgeReviewPacket` represents one exact authoring revision.
The caller must select the entry by `exactRevision`; an entry-ID-only lookup is
insufficient and must fail closed if zero or multiple exact matches exist.

Where present in explicit inputs, the packet must contain:

- entry ID, revision, exact revision, content digest, title, topic,
  jurisdiction, disposition, evidence confidence, approved consumption scope,
  supersession state, and freshness policy;
- approval profile identity, version, non-production flag, required roles,
  allowed evidence kinds, allowed scopes, expiry requirements, and re-review
  triggers;
- source snapshot ID, source ID, title, issuing authority, type, public
  location, jurisdiction, access date, source revision, pinpoint, evidence kind,
  and source evidence text;
- plain-English claim, precise internal claim, allowed wording, required
  qualifiers, applicability constraints, exceptions, uncertainty,
  prohibited-conclusion classes, and escalation notes;
- authoring provenance, including dossier references, private review notes, and
  semantic change reason already present in the supplied entry;
- matching review request, reviewer-eligibility, assignment, and external
  evidence records;
- current manifest revision and matching or conflicting pins;
- a per-role evidence summary;
- open conditions; and
- existing validation issues and eligibility block reasons.

The report schema and rendered order must separate four labelled sections:

1. `authoringContent`;
2. `externalApprovalEvidence`;
3. `activationState`; and
4. `derivedOperationalReporting`.

No value may move between those sections to make the packet look more
complete. Derived observations are not source evidence. Authoring fields are
not approval evidence. Approval evidence is not activation.

The packet may contain sensitive reviewer and internal authoring metadata and
is therefore an internal, local review object. It must never be passed to
`projectRuntimeKnowledgeEntry`, serialized into
`RuntimeKnowledgeArtifact`, logged through telemetry, or exposed in the public
product.

## 10. Reviewer checklists

**[Proposal]** `prepareReviewDimensionChecklists` derives one checklist from
each role in the selected `ApprovalProfile.requiredRoles`, preserving profile
order and role identity. The currently configured roles are:

- evidence;
- domain;
- product safety;
- accessibility;
- privacy;
- product scope;
- engine use;
- freshness; and
- activation.

Every `ReviewDimensionChecklist` must identify:

- the entry ID, exact revision, digest, profile ID, intended consumption scope,
  and role;
- the source and authoring fields relevant to that role;
- the evidence references the review request says must be reviewed;
- the review request and assignment state, if supplied;
- reviewer eligibility and conflict-declaration fields, if supplied;
- the profile's expiry and re-review requirements;
- open conditions and existing block reasons relevant to that role; and
- a prompt for findings, decision, conditions, expiry, and evidence reference.

Checklist prompts must preserve the distinct review concerns:

- **evidence:** source identity, snapshot, pinpoint, evidence text, and
  claim-to-source traceability;
- **domain:** jurisdiction, substantive boundaries, exceptions, uncertainty,
  and prohibited conclusions;
- **product safety:** non-advice wording, human control, escalation, and unsafe
  inference boundaries;
- **accessibility:** clarity, readability, cognitive load, and understandable
  qualifiers;
- **privacy:** data minimisation, protected material, reviewer metadata, and
  runtime-field separation;
- **product scope:** intended scope, excluded scope, and public availability;
- **engine use:** exact rule inputs, fact-readiness requirements, and absence
  of inferred personalised decisions;
- **freshness:** verified date, validity date, re-review triggers, and source
  change risk; and
- **activation:** exact revision/digest pin, manifest conflict, runtime gates,
  and product-owner decision boundary.

Rendering, exporting, viewing, or marking a checklist complete does not create
`ExternalApprovalEvidence`. A reviewer decision exists only when a human
explicitly adds a valid evidence record through a separately reviewed
repository change.

## 11. Approval readiness

### 11.1 Readiness states and checks

**[Proposal]** `ApprovalReadinessReport` uses these states:

```text
not_ready
ready_for_human_decision
recorded_approval_complete
```

The meanings are deliberately narrow:

- `not_ready`: the exact review target or supplied review machinery is
  structurally invalid, ambiguous, mismatched, expired, conflicted, or missing
  a prerequisite needed to conduct or record the configured review.
- `ready_for_human_decision`: the exact revision, packet, profile, requested
  roles, workflow bindings, and review prompts are sufficiently identified for
  humans to review, but the configured repository does not yet contain a
  complete set of valid approving evidence.
- `recorded_approval_complete`: every role configured by the selected profile
  has repository evidence that satisfies the existing machine gates as of the
  caller-supplied date.

`recorded_approval_complete` means only that configured repository evidence
satisfies the machine gates. It is not independent endorsement of the content,
reviewer, evidence, wording, or proposed product use, and it does not activate
the entry.

The report must fail closed and provide stable, inspectable reasons for:

- missing or invalid approval profile;
- missing, duplicate, or incomplete required roles;
- exact-revision mismatch;
- content-digest mismatch;
- approval-profile-ID mismatch;
- consumption-scope mismatch;
- invalid or missing reviewed commit;
- missing or mismatched reviewer identity;
- missing or mismatched reviewer qualification or authority basis;
- a declared or unresolved conflict;
- incomplete `evidenceReviewed`;
- missing findings;
- a non-approving review decision;
- invalid conditional-approval conditions;
- any open, manual-block, or unevidenced condition;
- missing or invalid condition-satisfaction evidence;
- required evidence expiry missing or passed;
- missing, draft, withdrawn, or mismatched review request;
- missing, unaccepted, or mismatched assignment;
- ineligible, expired, or out-of-scope reviewer eligibility; and
- invalid workflow linkage.

The report must retain the underlying `ValidationIssue` and
`EligibilityBlockCode` values. It may add display labels, but those labels
cannot suppress, merge away, or reinterpret a failure.

The real Tell Us Once and probate inputs must report as not ready under the
current empty workflow and evidence state. Reporting must not alter their
authoring disposition or confidence.

### 11.2 Approval-evidence validation reporting

**[Proposal]** `EvidenceValidationReport` validates only supplied repository
records and explains their relationship to the selected exact revision. It must
include:

- shape-validation issues from `validateApprovalEvidenceShape`;
- workflow issues from `validateHumanReviewWorkflow`;
- the selected entry, profile, role, request, assignment, eligibility, scope,
  date, and reviewed-commit bindings;
- the `assessHumanReviewEvidence` result for each applicable non-synthetic
  record;
- decision and condition status from
  `reviewDecisionCanSatisfyApproval`;
- missing required roles;
- duplicate or competing records for a role;
- evidence expiry and reviewer-eligibility expiry; and
- all resulting validation issues and block codes without deduplication that
  would conceal which record caused them.

Evidence not matching the selected exact revision remains visible as
`not_applicable` or mismatched evidence; it must never be floated forward to a
new revision. Digest, profile, role, scope, request, assignment, reviewer, and
commit bindings must be compared exactly.

`synthetic_test` evidence must remain isolated to the existing explicitly
non-production, hidden development context. A report must label it synthetic
and must not render it as a human signature, reviewer identity, or production
approval.

## 12. Activation candidate preparation

**[Proposal]** `ActivationCandidateReport` prepares a proposal for a human to
inspect. It must never mutate or write an `ActivationManifest`.

The operation requires:

- one exact authoring revision;
- its exact content digest;
- an explicit requested consumption scope;
- an explicit proposed reason;
- the current manifest and manifest revision;
- explicit governed inputs and eligibility context; and
- an explicit proposed new manifest revision, if the caller wants one shown.

The report must include:

- target entry ID and exact revision;
- target content digest;
- requested consumption scope;
- proposed reason;
- current and proposed manifest revisions;
- current pins for the conceptual entry and scope;
- conflicting active-revision information;
- the inert proposed pin;
- validation issues;
- every governance block reason; and
- a state of either `blocked` or
  `ready_for_human_manifest_decision`.

To avoid duplicating eligibility logic, the future implementation should build
an in-memory candidate manifest from explicit inputs and call the existing
manifest validation and runtime-eligibility functions. The candidate manifest
is report data only and must not be returned through a writer, saved, staged, or
substituted for the repository manifest.

The report must remain `blocked` when any of the following is true:

- the entry is `draft`, `rejected`, `retired`, or superseded;
- evidence confidence is `blocked`;
- the profile is missing, invalid, non-production for the requested production
  use, or does not allow the scope;
- required approval evidence is missing, invalid, expired, synthetic outside
  the isolated non-production context, or non-approving;
- required review roles or valid workflow bindings are missing;
- a review condition is open, manual-only, or lacks satisfaction evidence;
- source, jurisdiction, freshness, fact-readiness, product-scope, or safety
  wording gates fail;
- the requested scope differs from the entry's approved scope;
- the digest or exact revision does not match;
- the current manifest already contains a different pin for the same conceptual
  entry and scope; or
- manifest validation reports a pin conflict.

`ready_for_human_manifest_decision` still grants no activation authority. A
human must separately decide whether to make and review the repository manifest
change.

## 13. Runtime bundle reporting

**[Proposal]** `RuntimeBundleReport` wraps, but does not modify, the result of
`buildRuntimeKnowledgeBundle` and the validation result for the exact supplied
`GovernedCorpusInputs`.

It must expose:

- total authoring entries supplied;
- count and exact revisions of entries actually evaluated;
- count and runtime references of usable/projected entries;
- count and exact revisions of blocked entries;
- entries not evaluated because product-scope precedence prevented loader
  invocation;
- block reasons grouped by their existing `EligibilityBlockCode`;
- the full, unmodified `eligibilityByRevision` result;
- projected runtime references;
- requested and emitted manifest revisions;
- build date;
- `loaderInvoked`;
- `offlineCapabilities.remoteRevocation`;
- `offlineCapabilities.sourceChangeDetectionAfterBuild`; and
- all governed-input validation issues.

When scope precedence returns only the special `scope` eligibility result, the
report must preserve that result as a scope block. It must not fabricate
per-entry eligibility reasons. Entries may be listed as `not_evaluated` with
the scope reason shown separately.

Every underlying block reason must remain available. Grouping is an additional
index, not a replacement, and must not change messages, priority, or meaning.
Runtime artifact contents must remain the existing allowlisted projection.

The current real runtime report must show no projected entries and preserve the
artifact's exact `entries: []` result.

## 14. Revision comparison

**[Proposal]** `RevisionComparisonReport` compares two explicitly supplied,
immutable revisions of the same conceptual entry. It must reject an ambiguous
lookup or different `entryId` values.

The report must identify old and new exact revisions and digests, then report
field-level changes to:

- every source snapshot field, including source revision, evidence text, access
  date, and pinpoint;
- plain-English claim and precise internal claim;
- allowed wording;
- required qualifiers;
- applicability constraints;
- exceptions;
- uncertainty;
- prohibited-conclusion classes;
- escalation notes;
- freshness policy;
- approved consumption scope;
- approval profile;
- evidence confidence;
- disposition; and
- supersession links.

Array comparison must be deterministic and must identify additions, removals,
and ordering changes. Text values must be compared exactly; the operation must
not normalise away punctuation or wording changes that affect the digest.

The report may state `reReviewRequired: true` when approval-relevant content or
a configured profile re-review trigger has changed. It must not judge whether
the change is legally, factually, or substantively correct. It must not carry
old evidence to the new digest or revision.

## 15. Retirement and rollback

**[Proposal]** Retirement and rollback operations prepare reports using the
existing manifest helpers. They do not persist a manifest.

`RetirementPreparationReport` must call
`retireRevisionFromManifest` with explicit inputs and show:

- affected exact revision;
- current and proposed manifest revision;
- pins removed and pins retained;
- whether the target was present;
- the proposed manifest as inert report data;
- the expected next-build effect; and
- the exact limitation that an already-downloaded offline bundle cannot be
  remotely revoked.

`RollbackPreparationReport` must call
`createExplicitRollbackManifest` with:

- an explicitly named target exact revision;
- an explicit target consumption scope;
- the current manifest;
- an explicit set of previously valid exact revisions; and
- an explicit proposed manifest revision.

It must show:

- whether the target was previously valid;
- the target revision and digest;
- current, removed, retained, and proposed replacement pins;
- the helper's success or
  `rollback_target_not_previously_valid` rejection;
- expected next-build effect; and
- the offline-revocation limitation.

An invalid rollback target must be rejected, not downgraded to a warning.
Neither report may claim that retirement or rollback has occurred. A separately
authorised human-controlled repository change and subsequent build are required.

## 16. Fail-closed requirements

**[Proposal]** All operations must:

- require exact revision selection and reject ambiguity;
- preserve exact digest, profile, scope, role, workflow, reviewer, evidence,
  commit, condition, date, and manifest bindings;
- preserve all existing validation issues and eligibility block reasons;
- return a blocked or not-ready result on missing, malformed, conflicting, or
  expired inputs;
- never infer missing reviewer facts or use authoring notes as evidence;
- never treat machine success as human endorsement;
- never mutate caller-supplied arrays or objects;
- never read an implicit current date, manifest, repository state, or file;
- produce byte-for-byte stable report data for equal explicit inputs;
- keep synthetic evidence non-production and clearly labelled;
- keep report-only data out of runtime projection; and
- throw or return an explicit invalid-input report rather than silently
  dropping a required check.

The implementation must not weaken a rule in `governance.ts` or
`humanReviewWorkflow.ts` to make an operational report ready.

## 17. Privacy and security

**[Proposal]** The operations are local and deterministic:

- no network, external API, cloud storage, telemetry, analytics, or upload;
- no new production dependency;
- no environment-variable or credential access;
- no read of `docs/research/`, `opencode.jsonc`, `.env` files, credentials,
  tokens, secrets, or private evaluation corpora;
- no implicit filesystem or Git access from the operations module;
- no reviewer details or internal evidence in public logs or runtime artifacts;
- no source text beyond the explicit supplied `SourceSnapshot`;
- no mutation or persistence of reports, evidence, or manifests; and
- no silent user or repository action.

Reviewer identity, organisation, qualification, conflicts, findings, and
evidence references are internal review data. Callers must treat review packets
and evidence reports as sensitive local data even when the underlying source
URL is public.

Runtime allowlisting remains owned by `projectRuntimeKnowledgeEntry`. The
operations layer must not extend `RuntimeKnowledgeEntry` or
`RuntimeKnowledgeArtifact` with authoring, reviewer, workflow, digest, profile,
activation-reason, source-evidence-text, or operational-report fields.

## 18. Expected files

**[Proposal]** The expected future implementation footprint is:

```text
src/lib/estateAdministrationKnowledge/reviewOperations.ts
src/lib/estateAdministrationKnowledge/types.ts
src/lib/estateAdministrationKnowledge/__tests__/reviewOperations.test.ts
```

`reviewOperations.ts` should contain composition and reporting only.
`types.ts` may receive additive operational report types. Tests must use
synthetic in-repository fixtures only.

Any future change to the following files requires explicit, file-specific
justification in the approved implementation task:

```text
src/lib/estateAdministrationKnowledge/governance.ts
src/lib/estateAdministrationKnowledge/humanReviewWorkflow.ts
src/lib/estateAdministrationKnowledge/walkingSkeletonGovernance.ts
src/lib/estateAdministrationKnowledge/probateKnowledgeAuthoring.ts
src/lib/estateAdministrationKnowledge/probateKnowledgeGovernance.ts
```

No change to those files is assumed by this specification. A need to change a
governance rule is a stop condition requiring renewed human approval, not an
implementation convenience.

## 19. Behaviour intentionally unchanged

This specification preserves the following repository behaviour:

- probate candidates remain draft;
- the Tell Us Once candidate remains draft;
- evidence confidence remains blocked;
- external approval evidence remains empty;
- the human-review workflow remains empty;
- both approval profiles remain non-production;
- the activation manifest remains empty;
- the hidden product scope remains unavailable;
- no Estate Administration UI, classifier, decision-engine use, or production
  route becomes available;
- general AdminAvenger routing remains unchanged;
- runtime projection remains allowlisted;
- the real runtime artifact remains empty;
- downloaded offline bundles still cannot be remotely revoked or learn about
  later source changes;
- source snapshots, claims, wording, qualifiers, digests, and freshness remain
  unchanged; and
- no automated operation takes a decision on behalf of a human.

## 20. Tests

**[Proposal]** Future implementation tests must use synthetic in-repository
fixtures only and must never claim real human approval. At minimum, they must
prove:

1. A review packet faithfully represents one exact revision and keeps
   authoring, evidence, activation, and derived reporting separate.
2. Authoring-only and review-only data never enters runtime projection.
3. Missing review roles block readiness.
4. Digest mismatch blocks readiness.
5. Revision mismatch blocks readiness.
6. Profile mismatch blocks readiness.
7. Expired evidence blocks readiness.
8. Open, manual, or unevidenced conditions block readiness.
9. Explicitly satisfied machine-gated conditions can pass the configured
   evidence gates.
10. Synthetic evidence remains isolated to the existing non-production hidden
    development context and is never presented as real human approval.
11. Draft entries cannot produce ready activation proposals.
12. Evidence-confidence-blocked entries cannot produce ready activation
    proposals.
13. Conflicting active revisions are reported and block a ready proposal.
14. Runtime reporting preserves every underlying block reason and the complete
    `eligibilityByRevision` result.
15. Revision comparison detects source snapshot, evidence text, wording,
    qualifier, applicability, exception, uncertainty, prohibited conclusion,
    escalation, freshness, scope, profile, confidence, and disposition changes.
16. Retirement reporting preserves the offline-revocation warning and does not
    mutate the supplied manifest.
17. Invalid rollback targets are rejected with
    `rollback_target_not_previously_valid`.
18. Every real probate candidate remains draft, blocked, unreviewed,
    unactivated, and unprojected.
19. The real runtime artifact still contains `entries: []`.

Additional tests should prove:

- checklists cover every configured role exactly once;
- completing or rendering a checklist creates no evidence;
- evidence reports retain record-specific validation failures;
- equal explicit inputs produce equal reports;
- operations do not mutate supplied entries, profiles, evidence, workflow, or
  manifests;
- unavailable product scope is reported as a scope block without fabricating
  per-entry reasons;
- activation, retirement, and rollback reports return inert proposals only;
- reviewer and authoring-only fields are absent from serialized runtime
  artifacts; and
- Estate Administration UI and routing remain unavailable.

## 21. Acceptance criteria

This specification is ready for an implementation-approval decision only when:

- all 25 required sections are present;
- the central invariant appears exactly and governs every operation;
- all eight requested operations have explicit inputs, outputs, and authority
  boundaries;
- report types are described as operational structures with no approval
  authority;
- the review packet separates authoring, evidence, activation, and derived
  reporting;
- checklist generation covers every configured role without manufacturing
  evidence;
- readiness states and fail-closed checks are unambiguous;
- activation preparation cannot write a manifest and blocks every named gate;
- runtime reporting preserves every existing reason and artifact boundary;
- revision comparison reports changes without judging correctness;
- retirement and rollback reports preserve explicit human control and the
  offline limitation;
- privacy, protected-path, and local-only boundaries are explicit;
- expected files are additive and existing governance files require
  justification to change;
- future tests cover all required cases using synthetic fixtures only; and
- current real corpus and runtime behaviour are explicitly unchanged.

Acceptance of these criteria approves only the quality of the specification.
It does not approve implementation.

## 22. Validation plan

### Specification-only validation

For this document-only task:

```powershell
git diff --check
git status --short
git diff -- docs/specs/active/estate-administration-knowledge-review-operations-v1.md
```

No implementation test, lint, or build run is required because no TypeScript,
runtime, dependency, or configuration file changes.

### Future implementation validation

After separate implementation approval, run:

```powershell
npm run test -- src/lib/estateAdministrationKnowledge/__tests__/reviewOperations.test.ts
npm run test -- src/lib/estateAdministrationKnowledge/__tests__/
npm run test
npm run lint
npm run build
git diff --check
git status --short
```

The implementation report must also show that the real runtime artifact still
contains `entries: []` and that no Estate Administration UI or route is
available.

## 23. Rollback

This specification adds one Markdown file and changes no runtime behaviour. If
the proposal is rejected, an explicitly authorised repository change may remove
or supersede this document.

A future implementation should remain additive. Its code rollback is removal
of the operations module, additive report types, and synthetic tests. Because
the operations must never persist evidence or manifests, removing them must not
require changing knowledge entries, approval evidence, activation pins, or
runtime artifacts.

Rollback of operational code is not rollback of governed knowledge. Any
knowledge rollback remains subject to the existing explicit rollback mechanism
and a separate human-controlled repository decision.

## 24. Risks

- **Report mistaken for approval.** Strong non-authority labels and narrow state
  names are required in types, renderers, tests, and documentation.
- **Duplicated governance drifts.** Operations must compose existing validators
  and eligibility functions rather than reproduce their predicates.
- **Block reasons are hidden by summaries.** Reports must retain complete raw
  issues and reasons alongside any grouping.
- **A proposal is accidentally persisted.** Operations must have no writer,
  filesystem access, Git access, or side effect; manifest values are inert
  report data.
- **Stale sources or evidence look current.** Explicit as-of dates, source
  revisions, validity dates, expiry checks, and re-review triggers must remain
  visible.
- **Old evidence floats to changed content.** Exact revision, digest, profile,
  role, scope, workflow, and reviewed-commit matching must remain strict.
- **Synthetic evidence looks real.** Synthetic fixtures must remain test-only,
  non-production, and visibly synthetic.
- **Reviewer data leaks.** Review packets and evidence reports contain internal
  identity and conflict data and must not enter runtime output or telemetry.
- **Scope precedence is misreported.** A skipped loader must be shown as not
  evaluated, not converted into fabricated per-entry eligibility.
- **Offline retirement is overstated.** Every retirement and rollback report
  must repeat that downloaded bundles cannot be remotely revoked.
- **Operational convenience weakens safety.** Any proposed change to an
  existing governance rule is a stop condition requiring renewed approval.

## 25. Explicit approval gate

Implementation must not start until a human explicitly approves this
specification for implementation in a separate repository-controlled decision.

That approval permits only the additive operational reporting layer and tests
described here. It does not approve:

- any Estate Administration knowledge entry or revision;
- any reviewer, reviewer authority, signature, conflict declaration, finding,
  condition, or approval evidence;
- any source snapshot, claim, qualifier, exception, uncertainty statement,
  prohibited conclusion, escalation note, or user-facing wording;
- any production approval profile or consumption scope;
- any activation, retirement, replacement, or rollback manifest change;
- any Estate Administration UI, classifier, engine, routing, product-scope, or
  public release change; or
- any access to protected paths or private evaluation material.

After implementation, recording real approval evidence and changing an
activation manifest remain separate human-controlled repository changes with
their own review. Machine validation may report that those records satisfy
configured gates, but it may never make or substitute for the human decision.
