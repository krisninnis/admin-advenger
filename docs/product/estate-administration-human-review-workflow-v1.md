# Estate Administration human-review workflow — v1

## Status

This document describes the first implemented, fail-closed human-review
workflow for Estate Administration knowledge candidates. It does not approve a
candidate, appoint a reviewer, establish a production approval profile, or
authorise activation.

The Tell Us Once candidate remains `draft`, evidence confidence remains
`blocked`, and the checked-in human-review workflow, external evidence list, and
activation manifest are empty.

## Existing governance reused

The workflow extends the existing corpus path:

```text
AuthoringKnowledgeEntry
→ canonical content digest
→ versioned ApprovalProfile
→ external approval evidence
→ derived runtime eligibility
→ separate ActivationManifest pin
→ allowlisted RuntimeKnowledgeEntry
```

It does not create a second approval state or treat a document, checkbox, source
recheck, or file path as evidence. `ExternalApprovalEvidence` remains the
evidence consumed by the existing eligibility gate. The workflow adds the
request, reviewer-eligibility, and assignment records that evidence must resolve
to.

## Missing capabilities addressed

Before this workflow, the repository could validate exact revision, digest,
profile, role, commit, date, external reference, and activation. It did not
model:

- a review request or its evidence set;
- reviewer eligibility, authority basis, conflicts, scope, or validity;
- an accepted role assignment;
- accessibility, privacy, or product-scope review as distinct dimensions;
- findings, conditions, or review-evidence expiry;
- decisions other than unconditional approval or changes requested;
- whether conditional approval was enforceably satisfied;
- cross-record validation from evidence back to the request, assignment, and
  reviewer eligibility.

Those capabilities now feed the same fail-closed runtime eligibility result.

## Design ambiguities and chosen boundaries

| Ambiguity | v1 decision |
|---|---|
| Can one person satisfy several dimensions? | Not assumed. Each dimension needs a separate eligibility record, assignment, and evidence record. A future production profile may explicitly permit role combination, but this workflow does not infer it. |
| Must a reviewer organisation be recorded? | No. `reviewerOrganisationId` may be `null`; unnecessary personal or organisational data is not required. |
| What counts as reviewer identity? | A stable approved identifier, preferably a repository, organisational, or pseudonymous project identifier—not merely a display name. |
| How are conflicts handled? | A declaration is mandatory. Any declared or unresolved conflict blocks the evidence by default. |
| Can conditional approval count? | Only when every condition is a `machine_gate`, marked `satisfied`, and has a satisfaction-evidence reference. An open condition or `manual_block` always blocks. |
| Does source revalidation count as human review? | No. `verifiedAt`, source snapshots, and documentation cannot satisfy a required review dimension. |
| Does approval activate the entry? | No. Product scope must pass before knowledge selection and the exact digest still needs a separate manifest pin and activation authority. |
| How long does review evidence last? | The selected profile decides whether evidence expiry is mandatory. The current non-production profile requires it; missing or elapsed expiry blocks. |

## Human-review lifecycle

1. **Prepare the candidate.** Freeze one exact `entryId@revision`, canonical
   digest, source snapshot, intended scope, and approval-profile ID.
2. **Create a review request.** The request binds those values, lists every
   required dimension, identifies the evidence set, records a stable requesting
   authority, and is moved from `draft` to `open`.
3. **Establish reviewer eligibility.** For one dimension, record a stable
   reviewer identifier, optional organisation, qualification or authority
   basis, conflict declaration, review scope, permitted profiles/scopes, valid
   dates, and eligibility status.
4. **Assign the review.** Bind the request, eligibility record, reviewer,
   dimension, and scope. Only an explicitly `accepted` assignment can support
   evidence.
5. **Perform and capture the review.** Record the exact evidence reviewed,
   findings, decision, conditions, review date, reviewed commit, durable
   external reference, and review-evidence expiry.
6. **Validate bindings.** The evidence must match the exact entry, revision,
   digest, profile, role, request, assignment, reviewer authority, scope, and
   dates.
7. **Evaluate every dimension.** Partial review remains blocked. One valid
   evidence record is required for every dimension named by the profile.
8. **Apply the editorial decision separately.** Review evidence alone does not
   rewrite `disposition`; an approved revision still requires the existing
   controlled authoring change.
9. **Re-review after change or expiry.** An approval-relevant content change
   requires a new immutable revision once formal review has attached. Expired
   evidence fails closed.
10. **Activate separately.** Only after product-scope approval and complete,
    current evidence may a separately authorised change add one exact
    activation pin. Approval without a pin is unavailable; a pin without
    approval is blocked.

## Required review dimensions

The implemented `ApprovalRole` dimensions are:

| Dimension | Question answered |
|---|---|
| `evidence` | Does the source snapshot and cited evidence accurately support the bounded claim? |
| `domain` | Is the factual/domain interpretation, jurisdiction, applicability, and exception treatment safe? |
| `product_safety` | Are wording, uncertainty, prohibited conclusions, escalation, and emotional-safety boundaries suitable? |
| `accessibility` | Is the intended wording and presentation understandable and accessible for the proposed use? |
| `privacy` | Is the candidate and proposed use data-minimised and free of unsafe collection, retention, or disclosure implications? |
| `product_scope` | Is this exact claim permitted for the named consumption scope, without broadening the product? |
| `engine_use` | Does the deterministic consuming rule preserve facts, qualifiers, provenance, negative paths, and safety constraints? |
| `freshness` | Are verification, expiry, source-change response, and re-review triggers adequate? |
| `activation` | Does an authorised person approve the separate exact manifest change and named scope? |

Evidence/domain accuracy uses two dimensions because source representation and
domain interpretation are distinct questions. Accessibility and privacy are not
silently bundled into product safety.

## Structured records

### `HumanReviewRequest`

Required bindings include:

- request ID and status;
- entry ID, exact revision, and canonical digest;
- approval-profile ID and intended consumption scope;
- every requested review role;
- the complete evidence-reference set;
- request date and stable requesting-authority ID;
- re-review reason when applicable.

`draft` and `withdrawn` requests cannot support approval evidence.

### `ReviewerEligibility`

Reviewer eligibility records:

- a stable eligibility and reviewer ID;
- one explicit review role;
- optional organisation ID;
- qualification or authority basis;
- explicit conflict declaration;
- bounded review scope;
- permitted profile IDs and consumption scopes;
- validity dates and eligibility status.

The model does not require names, email addresses, signatures, or other
unnecessary personal data. Identity-verification evidence remains in the
approved external review system rather than the browser-safe runtime artifact.

### `HumanReviewAssignment`

An assignment binds one request and one reviewer-eligibility record to one role
and review scope. It records the assigning authority, assignment date,
acceptance date, and status. `assigned`, `declined`, and `withdrawn` do not
satisfy the evidence gate.

### `ExternalApprovalEvidence`

The existing evidence record now also binds:

- exact entry ID, revision, digest, profile, and role;
- review request and assignment IDs;
- stable reviewer and optional organisation IDs;
- the qualification or authority basis used for eligibility;
- conflict declaration and review scope;
- exact reviewed commit and durable external reference;
- review date, evidence reviewed, findings, and conditions;
- review-evidence expiry date where required.

Missing or mismatched bindings fail closed. Evidence remains authoring/release
governance data and is never projected into the browser-safe runtime entry.

## Decision outcomes

| Outcome | Can satisfy a review dimension? |
|---|---|
| `approved` | Yes, only with no attached conditions and every other binding valid |
| `approved_with_conditions` | Only when every condition is machine-gated, explicitly satisfied, and linked to satisfaction evidence |
| `changes_required` | No |
| `rejected` | No |
| `withdrawn` | No |

An `approved_with_conditions` label is never converted silently into ordinary
approval. A manual condition deliberately remains an activation block because
the model cannot enforce its substantive meaning.

## Machine-readable block reasons

The existing eligibility result can now include:

- `review_request_missing`;
- `review_assignment_missing`;
- `reviewer_ineligible`;
- `reviewer_conflict_unresolved`;
- `review_dimension_missing`;
- `review_decision_not_approving`;
- `review_conditions_unsatisfied`;
- `review_evidence_expired`;
- the existing `approval_evidence_missing` and
  `approval_evidence_invalid` reasons.

These are additive. Any reason blocks runtime projection.

## Revision, digest, and re-review

Review evidence binds to the exact canonical digest generated by
`computeAuthoringContentDigest`; a reviewer or template must not supply a
substitute digest. The request and every evidence record must agree on the
entry, exact revision, digest, and profile.

Before formal review attaches, an unsubmitted draft may be corrected under the
existing lifecycle rule. Once review attaches, changing a claim, source,
jurisdiction, wording, qualifier, exception, prohibited conclusion, freshness
policy, profile, scope, or other digest-bound content requires a new immutable
revision and renewed review. Evidence for an older revision cannot float to its
successor.

Profile-required review evidence also expires independently of the entry's
`validUntil`. Either expiry can block the revision. A source recheck updates
freshness metadata; it does not create reviewer eligibility, an assignment, a
review decision, or approval evidence.

## Approval and activation remain separate

```text
complete valid human review
does not imply
activation

activation pin
does not repair
missing, invalid, conditional, rejected, or expired review
```

The existing order remains:

1. product/public scope gating;
2. authoring and source checks;
3. approval profile and human-review evidence;
4. exact activation-manifest pin;
5. freshness, jurisdiction, fact, and safety checks;
6. runtime projection only when no block reason remains.

## How a real reviewer completes a review

1. Receive a request for one exact role and confirm the entry, revision, digest,
   profile, scope, source snapshot, evidence set, and reviewed commit.
2. Have an authorised owner record eligibility without unnecessary personal
   data, including qualification/authority basis and conflicts.
3. Accept an assignment whose role and scope match that eligibility.
4. Inspect every requested evidence reference and the adjacent limitations.
5. Record concise findings, including unresolved issues and reasons for any
   condition, change request, rejection, or withdrawal.
6. Choose exactly one decision outcome.
7. For conditional approval, use only a defined machine gate; otherwise record
   `changes_required`.
8. Set the required evidence-expiry or re-review date under the profile.
9. Preserve the durable external review/signature reference and exact commit.
10. Run structural, workflow-binding, eligibility, and runtime rejection tests.

Human review is not complete merely because a template exists or fields are
filled. The external identity, authority, decision, and reference must be
independently verifiable by the future protected workflow.

## Blank review-record template

> This template is deliberately blank. Blank, example, sample, draft,
> unverified, or merely checked-in records are not approval evidence.

```yaml
review_request:
  request_id: <required>
  status: draft
  entry_id: <required>
  exact_revision: <required>
  canonical_digest: <generated by existing function>
  approval_profile_id: <required>
  intended_consumption_scope: <required>
  requested_roles: []
  evidence_to_review: []
  requested_at: <YYYY-MM-DD>
  requested_by_authority_id: <stable approved identifier>
  re_review_reason: null

reviewer_eligibility:
  eligibility_id: <required>
  status: pending
  reviewer_id: <stable approved or pseudonymous identifier>
  role: <one required dimension>
  reviewer_organisation_id: null
  qualification_or_authority_basis: <required>
  conflict_declaration:
    status: <none_declared or declared>
    details: null
  review_scope: <required>
  permitted_approval_profile_ids: []
  permitted_consumption_scopes: []
  valid_from: <YYYY-MM-DD>
  valid_until: null

review_assignment:
  assignment_id: <required>
  status: assigned
  request_id: <required>
  reviewer_eligibility_id: <required>
  reviewer_id: <same stable identifier>
  role: <same required dimension>
  review_scope: <same bounded scope>
  assigned_at: <YYYY-MM-DD>
  assigned_by_authority_id: <stable approved identifier>
  accepted_at: null

external_approval_evidence:
  evidence_id: <required>
  evidence_kind: <github_pr_review or signed_approval>
  entry_id: <exact request binding>
  exact_revision: <exact request binding>
  content_digest: <exact generated digest>
  approval_profile_id: <exact request binding>
  role: <exact assignment role>
  decision: <approved, approved_with_conditions, changes_required, rejected, or withdrawn>
  review_request_id: <required>
  review_assignment_id: <required>
  reviewer_id: <stable approved identifier>
  reviewer_organisation_id: null
  reviewer_qualification_or_authority_basis: <must match eligibility>
  conflict_declaration:
    status: <none_declared or declared>
    details: null
  review_scope: <must match assignment>
  reviewed_commit: <full commit SHA>
  reviewed_at: <YYYY-MM-DD>
  evidence_reviewed: []
  findings: []
  conditions: []
  expires_at: <YYYY-MM-DD or null only when profile permits>
  evidence_reference: <durable externally verifiable reference>
```

Do not copy this template into `walkingSkeletonExternalApprovalEvidence` until
real authorised review has occurred and the records pass independent
verification.

## Tell Us Once remains blocked

For `ea-ew-tell-us-once-separate-contact-001@r1`:

- disposition is `draft`;
- evidence confidence is `blocked`;
- there is no production approval profile;
- there are no checked-in review requests, reviewer-eligibility records,
  assignments, or external approval records;
- `validUntil` is unset;
- the activation manifest has no pins;
- the build-only runtime artifact has `entries: []`;
- matching user input remains on the general AdminAvenger route.

The tests use only unmistakably synthetic, non-production records to prove
positive and negative workflow behavior. They do not represent a real person,
qualification, organisation, review, decision, signature, or approval.

## Probate candidates remain blocked

The England and Wales probate candidate pack uses the same workflow and a
separate profile explicitly marked non-production. Every candidate remains
`draft` with blocked evidence confidence, unset `validUntil`, no real workflow
records or approval evidence, and no activation pin. The blank template above
does not approve any probate proposition. See
`estate-administration-probate-approval-readiness-v1.md` for its inventory,
sources, exclusions, and unresolved review requirements.
