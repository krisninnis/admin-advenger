# Tell Us Once separate-contact candidate — approval readiness v1

## Status and boundary

This is a review packet for one hidden Estate Administration knowledge
candidate. It is not approval evidence, does not record qualified review, and
does not authorise activation, product routing, or user-interface exposure.

The checked-in candidate remains:

| Field | Value |
|---|---|
| Candidate ID | `ea-ew-tell-us-once-separate-contact-001` |
| Exact revision | `ea-ew-tell-us-once-separate-contact-001@r1` |
| Editorial disposition | `draft` |
| Evidence confidence | `blocked` |
| Jurisdiction | England and Wales |
| Topic | Tell Us Once separate-contact boundary |
| Current approval profile | `estate_administration_walking_skeleton_non_production_v1` |
| Approved consumption scope field | `estate_administration_hidden_walking_skeleton` |
| External approval evidence | None |
| Activation pin | None |
| Production approval profile | None |

The `r1` identifier is retained because no formal review or approval evidence
has attached to this draft. The corpus rules permit an unsubmitted draft to be
corrected before review. Any governed-content change after review begins must
create a new immutable revision and be reviewed again.

## Intended use and excluded scope

The candidate's intended future use is a calm, plain-English preparation prompt
when a separately approved product rule has established an England and Wales
Tell Us Once separate-contact question. It may explain only that the snapshotted
GOV.UK guidance identifies organisations that need separate contact and suggest
checking the current official list and the organisation's own process.

It must not determine that Tell Us Once was used, that any organisation was or
was not notified, that a particular account exists, or that a particular
organisation must be contacted in an individual estate.

Excluded from this candidate are:

- death-registration deadlines, eligibility, documents, appointments, medical
  examiner and coroner processes;
- Tell Us Once access, the 28-day service period, information collection,
  privacy, consent, and recipient-selection mechanics;
- probate, grants, executors, administrators, legal authority, wills,
  inheritance tax, beneficiaries, estate distribution, debts, ownership,
  property sales, account closure, and completion;
- building societies, telecom providers, subscriptions, digital accounts,
  solicitors, funeral directors, and every other unlisted organisation category;
- forms, workflows, timelines, calculators, document generation, autonomous
  action, and complete bereavement support.

## Source inventory

### Governed source snapshot

| Field | Value |
|---|---|
| Snapshot ID | `tuo-01-accessed-2026-07-27` |
| Source ID | `TUO-01` |
| Title | What to do after someone dies: Tell Us Once |
| Issuing authority | GOV.UK |
| Public location | `https://www.gov.uk/after-a-death/organisations-you-need-to-contact-and-tell-us-once` |
| Source type | Government guidance |
| Access date | 27 July 2026 |
| Source revision | `dossier-access-snapshot-2026-07-27` |
| Evidence kind | Dossier paraphrase |
| Governed pinpoint | Dossier findings VF-33 to VF-36 and claim-control section 13 |

### Governed research record

The source snapshot is represented in
`docs/specs/active/estate-administration-research-death-registration-tell-us-once-england-wales-v1.md`.
The candidate relies only on:

- section 5, source record `TUO-01`;
- section 7, finding `VF-33` for the explicit separate-contact categories;
- section 8 for the bounded meaning of Tell Us Once;
- section 9 for the distinction between verified source facts, conditional
  treatment, proposals, unresolved claims, and prohibited conclusions;
- section 13 for the proposed, explicitly unapproved separate-contact wording;
- section 14 for claims that must not enter the product;
- section 17 for safe and unsafe separate-action wording;
- sections 18, 21, and 22 for uncertainty, source currency, and review gates.

`TUO-02` appears in the wider dossier, but it is not a source snapshot for this
candidate and is not required to support the narrowed `VF-33` proposition.
Using it for additional wording would require a governed revision.

## Claim-to-source and claim-type mapping

| Candidate content | Type | Support and treatment |
|---|---|---|
| GOV.UK identifies banks, mortgage providers, insurance providers, utilities, landlords or housing associations, and most personal or workplace pension schemes for separate contact | Government service description | `TUO-01`; dossier `VF-33`; section 13 separate-contact row; section 17 separate-actions row |
| The candidate is limited to England and Wales | Jurisdiction limitation | Dossier status and scope; `TUO-01` source record is used only within the dossier's England and Wales scope |
| The wording is not a legal requirement | Legal-requirement distinction | The source is classified as Tier 2 government service guidance, not legislation; a qualified reviewer must confirm the final wording preserves that distinction |
| Use only after jurisdiction and current service coverage are established | Conditional advice / rule constraint | Authoring applicability constraint; not a claim about an individual case |
| Check the current official list before deciding what to do | Practical suggestion | Product-prepared check prompted by the dossier's `TUO-01` update trigger; not represented as source-stated legal advice |
| Check the organisation's current bereavement process | Practical suggestion | Product-prepared check; it does not assert what any provider requires |
| Coverage depends on the deceased person's records and circumstances | Conditional government service description | `TUO-01`; dossier findings `VF-29` to `VF-32` and safe wording in section 17 |
| The entry cannot establish use, notification status, accounts, or provider requirements in an individual estate | Uncertainty / cannot-know boundary | Follows from the absence of case facts and the dossier's prohibition on inferring notification, completion, account closure, or estate authority |
| The source list and organisation processes may change | Freshness warning | `TUO-01` update is a dossier and approval-profile review trigger; this warning does not claim a change has occurred |

No material candidate claim is based only on general knowledge. The former
phrase “other private organisations” has been removed because the dossier does
not establish that open-ended category. The unlisted categories in the excluded
scope remain unsupported for this candidate.

## Known uncertainties and high-risk statements

Known blockers:

- the GOV.UK page has not been rechecked for an approval decision;
- `verifiedAt` and `validUntil` are unset;
- the dossier itself remains unapproved for product use;
- no qualified domain, product-safety, engine-use, freshness, or activation
  review has been supplied;
- no production approval profile exists;
- no public or controlled product scope is approved;
- the candidate cannot know the facts of an individual estate.

The following statements are high-risk and must be rejected:

- Tell Us Once contacts every organisation or completes all notifications;
- Tell Us Once contacts an unlisted organisation category;
- a Tell Us Once reference, death registration, or notification establishes
  legal authority, identity, entitlement, ownership, or estate status;
- notification resolves tax, benefits, pensions, accounts, debts, probate, or
  estate administration;
- a named organisation must be contacted in the user's individual case;
- the user is an executor, administrator, personal representative, beneficiary,
  or person legally entitled to act;
- the candidate gives a legal deadline, legal requirement, guaranteed outcome,
  or complete workflow.

## Expiry and review considerations

The source is mutable government service guidance. The existing non-production
profile requires a `validUntil` value and lists a GOV.UK page change, a Tell Us
Once organisation-list change, jurisdiction change, and any claim wording or
qualifier change as re-review triggers.

A real production profile must be separately designed and approved. It must
define a conservative verification date, expiry period, source-recheck
procedure, reviewer roles, permitted product scope, and response to a changed
or unavailable source. An offline bundle cannot detect source changes or revoke
itself remotely, so expiry must continue to fail closed using local time.

## Required reviewer qualifications

The current governance model separates six roles. Real reviewers or authorised
owners must be identified outside the authoring entry:

| Role | Required competence for this candidate |
|---|---|
| Evidence | Able to inspect the current official GOV.UK page and verify the exact source snapshot, categories, date, jurisdiction treatment, and dossier mapping |
| Domain | Competent to review England and Wales death-registration/Tell Us Once service boundaries and identify any legal or operational overstatement |
| Product safety | Able to review high-stakes, bereavement-sensitive wording, uncertainty, accessibility, and the human-control boundary |
| Engine use | Able to verify that any future deterministic rule uses only the runtime projection, matches only the approved facts and jurisdiction, and preserves qualifiers and prohibited conclusions |
| Freshness | Authorised to choose and enforce verification and expiry dates for mutable government guidance |
| Activation | Authorised to approve a named product scope and, separately, an exact activation-manifest pin |

The same person may fill multiple roles only if a future production approval
profile explicitly permits it. Repository fields cannot appoint or certify a
reviewer.

## Integrity record

The existing canonical digest system generated the following integrity values
for the checked-in draft:

| Field | Value |
|---|---|
| Digest schema | `estate-administration-approval-content-v1` |
| Exact revision | `ea-ew-tell-us-once-separate-contact-001@r1` |
| Content digest | `sha256:9521036b1d96aeca3e0da30e3c5a3aaea3663cbd82de7bffd6df7938d230f2ec` |
| Generator | `computeAuthoringContentDigest` via `createAuthoringKnowledgeEntry` |
| Canonical form | `canonicalizeApprovalRelevantContent` |

The digest covers the identity, claims, source snapshot, confidence,
constraints, exceptions, uncertainty, allowed wording, qualifiers, prohibited
conclusions, escalation, freshness, approval/profile fields, supersession, and
dossier references. It excludes the resulting digest and the private workflow
notes/change rationale.

Reviewers must regenerate the digest from the existing canonical function.
They must not transcribe or substitute a digest. Any change to governed content
invalidates approval evidence for the previous digest. The focused tests verify
determinism and mutation sensitivity.

## Approval checklist

Every box must remain unchecked until completed by a real authorised reviewer:

- [ ] Reopen `TUO-01` and confirm its issuing authority, URL, current wording,
  jurisdiction boundaries, separate-contact categories, and update status.
- [ ] Confirm the source snapshot and shortest-sufficient evidence accurately
  represent `TUO-01`.
- [ ] Confirm every row in the claim mapping and reject any unsupported
  extension.
- [ ] Confirm the wording distinguishes government service guidance from a
  legal requirement and practical suggestions from source facts.
- [ ] Confirm the England and Wales limitation and all uncertainty wording.
- [ ] Confirm prohibited conclusions and high-risk statements are complete.
- [ ] Complete domain, product-safety, accessibility, emotional-safety, and
  privacy/data-minimisation review appropriate to the intended use.
- [ ] Approve a production profile with exact roles, evidence kinds, scope,
  freshness, and re-review triggers.
- [ ] Freeze the governed content and regenerate its canonical digest.
- [ ] Record external approval evidence for every required role against the
  exact revision, digest, full reviewed commit, reviewer identity, decision,
  date, and durable evidence reference.
- [ ] Validate the evidence independently through the existing governance
  checks.

Completing this checklist would prepare an approval decision. It would not
itself approve product scope or activation.

## Rejection checklist

Reject the candidate or require a new revision if:

- [ ] `TUO-01` is unavailable, materially changed, superseded, or inconsistent
  with the snapshot;
- [ ] any listed category, jurisdiction statement, or qualification cannot be
  verified;
- [ ] wording implies legal authority, legal requirement, universal coverage,
  case-specific notification, provider requirements, resolution, or completion;
- [ ] an unsupported organisation category is added;
- [ ] uncertainty, qualifiers, provenance, or freshness limits are removed or
  weakened;
- [ ] governed content changes without a new digest and renewed review;
- [ ] required reviewer competence, independence, or durable evidence is absent;
- [ ] production scope, routing, or UI exposure is proposed before separate
  approval and activation authority.

## Steps still required before approval and activation

1. Real reviewers complete the source, domain, wording, safety, accessibility,
   privacy, and freshness checks above.
2. Humans approve a versioned production approval profile; the current
   synthetic/non-production profile cannot be reused.
3. Freeze the proposed governed content in a reviewable commit and generate the
   exact digest with the existing canonical function.
4. Obtain durable external approval evidence for every profile-required role,
   tied to the exact revision, digest, and full reviewed commit.
5. Add and validate that evidence without changing the reviewed governed
   content. If content changes, create the required revision and repeat review.
6. Only after valid evidence exists may a separate change set the editorial
   disposition and production scope consistently with the approved profile.
7. Run the governance validator and prove the exact revision remains blocked
   unless every independent approval and freshness gate passes.
8. In a later, separately authorised activation task, approve product scope and
   routing before knowledge selection, add one exact manifest pin, and verify
   the projected runtime entry and user-facing qualifiers.

Until every applicable step is complete, the candidate must remain hidden and
the runtime artifact must continue to contain `entries: []`.
