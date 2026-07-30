# Estate Administration Reviewed Knowledge Corpus Design — v1

## 1. Document status

| Field | Value |
|---|---|
| Status | Draft architecture design awaiting human review |
| Owner | Unassigned |
| Scope | A reviewed, source-grounded knowledge layer between research dossiers and future decision logic |
| Jurisdiction implications | Every entry must declare its jurisdiction; the worked examples are limited to England and Wales |
| Approval status | Not approved for corpus population, implementation, product use or public use; the GitHub controls in section 9 are proposed and are not confirmed repository capability |
| Implementation status | Documentation only; no production behaviour, test, fixture or data record is authorised |
| Related specifications | `estate-administration-support-v1.md`, `estate-administration-research-framework-v1.md`, the death-registration and Tell Us Once dossier, the probate and Letters of Administration dossier, and `source-grounded-general-admin-analysis.md` |

This design does not approve any research claim for product use. It defines how a
claim could later move through review; it does not perform that review or create
an approved corpus.

The governing principle is:

> AI prepares. Humans decide.

The required separation is:

```text
Authoritative source
↓
Research dossier
↓
Reviewed knowledge corpus
↓
Decision engine
↓
User-facing response
```

The underlying sources may be authoritative. A research dossier and the
knowledge corpus are reviewed representations of those sources; neither is
itself legally authoritative.

Labels used in this design:

- **[Confirmed]** — capability verified in the current repository.
- **[Proposed]** — future design, not implemented or approved.
- **[Open]** — a decision still requiring human approval.

## 2. Problem statement

A long research dossier is designed for human research review. It contains
source registers, conflicts, discarded interpretations, unresolved questions,
maintenance warnings, broad context and boundaries. It is not a safe runtime
prompt or a collection of automatically approved product statements.

Moving directly from a dossier to a user-facing answer creates several risks:

- context can be lost when a sentence is extracted from a larger finding;
- a source access date can disappear while the claim continues to look current;
- legal caveats and exceptions can be omitted;
- a general proposition can be applied to facts about one estate;
- research confidence can be mistaken for confidence about an individual case;
- legislation and service guidance can be combined without preserving their
  different purposes;
- mutable fees, forms, routes, contact details and processing estimates can
  become stale;
- conflicting sources can be flattened into one answer;
- unreviewed researcher interpretation can enter production;
- the decision engine can infer entitlement, authority or liability from
  incomplete facts;
- a user-facing response can omit provenance, uncertainty or escalation.

The probate dossier demonstrates the distinction. It can record the ordinary
relationship between executors and grants of probate while also recording
priority rules, no-acting-executor cases, capacity, minority, caveats, competing
applicants and foreign-element boundaries. A single extracted sentence cannot
safely replace that structure.

The reviewed knowledge layer must therefore be a claim-control layer, not a
document retrieval shortcut. It must admit only bounded claims that have been
reviewed for evidence, legal or factual safety, wording, decision-engine use and
freshness.

## 3. Goals

**[Proposed]** The design should provide:

- source-grounded knowledge with pinpoint evidence;
- externally enforceable human approval for an exact immutable revision before
  production consumption;
- end-to-end traceability from wording back to the original source;
- jurisdiction and territorial-scope control;
- source snapshot, access, effective, release and category-specific validity
  control;
- explicit applicability conditions and missing-fact handling;
- visible uncertainty and cannot-know boundaries;
- prohibited conclusions and safe escalation;
- conflict, rejection, retirement and supersession handling;
- deterministic rejection of unapproved, stale or mismatched entries;
- structural and behavioural testability;
- small, inspectable, version-controlled records;
- portability across Estate Administration and later AdminAvenger domains;
- separation between general knowledge and case-specific user facts;
- preservation of the product boundary that AI prepares and humans decide.

## 4. Non-goals

This design is not:

- a legal-advice engine;
- an automatic legal eligibility or priority decision system;
- production implementation approval;
- automatic ingestion of an entire research dossier;
- automatic approval based on an official source or evidence tier alone;
- a live web retrieval, monitoring or scraping design;
- a replacement for qualified legal, tax, benefits, debt, property, privacy,
  accessibility or safety review;
- a detailed user-interface design;
- a personalised probate, tax, inheritance or estate calculation;
- a generic enterprise knowledge platform;
- a vector-search or semantic-retrieval proposal;
- permission to use the research dossiers as direct runtime context;
- permission to populate even the illustrative entries in section 19.

## 5. Existing repository capability

### 5.1 Capability assessment

| Existing item | Confirmed capability | Classification | Design treatment |
|---|---|---|---|
| Estate Administration research framework | Defines evidence tiers, source records, findings, claim-control fields, confidence, review states and approval gates | Reusable | Use as the governance foundation; do not replace its qualified-review gates |
| Death-registration/Tell Us Once and probate dossiers | Contain source registers, scoped findings, conflicts, safe/unsafe wording, unresolved questions and freshness risks | Reusable | Treat as evidence inputs from which humans select candidate claims; never load wholesale at runtime |
| `src/lib/sourceSupport.ts` | Checks whether a quote is present in user-provided source text after controlled normalisation | Reusable with changes | Reuse its support principle for case facts; do not mistake it for authoritative-source citation validation |
| `src/lib/generalAdminExtraction.ts` | Produces typed dates and money with verbatim source quotes and roles | Reusable | Keep for case-specific extraction; it is not a general knowledge store |
| `DecisionSourceFact` in `src/lib/decisionEngine/types.ts` | Carries a label, value and optional source quote from a submitted document | Reusable with changes | Preserve as case evidence; add a separate future knowledge provenance reference rather than overloading it |
| `OfficialRuleRecord` and `officialRules` in the HMRC engine | Small version-controlled records with ID, source title, official domain, supported rule, check date, tax-year relevance and stability | Reusable with substantial changes | Closest existing prototype, but not a sufficient approved corpus model |
| HMRC `officialRules` tests | Check record presence and basic fields; `getRulesForCode` selects records | Reusable with changes | A useful structural-test pattern; current records lack the approval and safety gates in this design |
| Decision engine classifier and modules | Deterministic document classification and `DecisionResult` production with confidence, uncertainty, cannot-know, safety and source facts | Reusable with changes | A future consumer of eligible runtime records; it must not infer missing applicability facts |
| Unknown decision module | Falls back conservatively when the document type is unclear | Reusable | Model for fail-closed behaviour when knowledge or facts are insufficient |
| `ResultViewModel` | Composes user-facing output, preserves uncertainty/cannot-know, marks dates and money cautiously and validates source support when source text is supplied | Reusable with changes | Future response boundary for knowledge citations and knowledge-use safety |
| `src/lib/safetyWording.ts` | Central forbidden-phrase and required-safety-theme checks across generated output | Reusable | Extend later with domain-specific prohibited conclusions; it cannot replace substantive review |
| Golden Letter Corpus | Synthetic fixtures test classification, facts, cannot-know wording, safety themes and forbidden output | Reusable with changes | Add synthetic knowledge-use scenarios only after implementation approval |
| Playwright corpus harness | Runs external redacted cases through the public journey and captures visible output | Not suitable for knowledge storage; reusable for later validation | It does not judge factual correctness and must remain separate from knowledge records |
| `publicScopePolicy.ts` | Deterministically blocks high-risk categories or keeps them behind controlled access | Reusable with changes | Pattern for public-scope gating; no Estate Administration category currently exists |
| Local-first architecture | React, TypeScript and Vite with no backend, database, authentication or hosted AI gateway | Reusable constraint | Prefer a small local, version-controlled corpus rather than new infrastructure |

### 5.2 Important distinctions

**[Confirmed]** `sourceSupport.ts` proves that a quoted case fact is supported by
the user's submitted text. It does not prove that a legal paraphrase accurately
represents legislation.

**[Confirmed]** `DecisionSourceFact` is case provenance, not general-knowledge
provenance. The two should remain separate:

```text
Case fact:
"This letter names Alex as executor."
→ quote from the user's document

General knowledge:
"An executor named in a will is ordinarily the person who applies..."
→ reviewed entry linked to official sources
```

**[Confirmed]** the HMRC `OfficialRuleRecord` is the nearest existing knowledge
shape, but it lacks source URLs and pinpoints, immutable revision identity,
jurisdiction, review constraints, allowed wording, prohibited conclusions,
external approval evidence, category-specific validity, supersession,
activation and an authoring/runtime projection. Repository usage found for it
is structural/unit-test usage; it is not a general corpus gate for the decision
engine.

### 5.3 Missing capability

No repository abstraction currently provides all of:

- separate authoring and runtime knowledge representations;
- immutable claim-revision and source-snapshot identity;
- externally enforced approval tied to an exact revision;
- versioned approval profiles;
- an activation manifest pinning exact revisions;
- build-time validation and public-safe runtime projection;
- category-specific release verification and local expiry enforcement;
- conflict and supersession handling;
- jurisdiction matching;
- applicability-fact requirements;
- allowed wording paired with prohibited conclusions;
- traceability from a result through a decision rule to a dossier and source;
- deterministic rejection of stale or unapproved general knowledge.

No Estate Administration `DecisionDocumentType`, classifier route, decision
module, corpus entry, fixture or production response currently exists.

## 6. Core concepts and terminology

| Term | Definition |
|---|---|
| Authoritative source | The original legislation, government guidance, regulator material or other accepted authority that supports a proposition |
| Research dossier | A human research document that records sources, findings, conflicts, limits and unresolved questions |
| Candidate claim | A bounded proposition selected from a dossier for possible review; it is not yet product knowledge |
| Conceptual entry ID | Stable identity for one bounded proposition across revisions |
| Immutable revision | Exact, content-addressable or monotonically identified authoring revision to which reviews, approvals, activation and decision rules attach |
| `AuthoringKnowledgeEntry` | Review representation containing evidence, provenance, review constraints and internal governance metadata |
| `RuntimeKnowledgeEntry` | Minimal public-safe projection emitted at build time for an exact eligible revision |
| Approved revision | An immutable revision with externally verifiable approval evidence required by its approval profile; approval alone does not activate it |
| Activation manifest | Separately reviewed list pinning the exact approved revisions eligible for a named product consumption scope |
| Source snapshot | Immutable evidence capture or exact source revision, with access date and pinpoint, used to review one claim |
| Source reference | Structured source metadata including title, issuing authority, location, dates, jurisdiction, snapshot identity and pinpoint |
| Evidence | The shortest sufficient source passage or pinpoint that supports or limits a claim |
| Jurisdiction | The territory and legal or service scope in which an entry may be used |
| Effective date | The date from which a law, rule, fee or service condition applies, where known |
| Access date | The date on which the researcher retrieved or checked a source |
| Review date | The date on which a named reviewer completed a defined review facet |
| `validUntil` | Conservative category-specific date after which an emitted runtime record must be rejected locally; not every source safely supports one |
| Confidence | Confidence that the recorded evidence supports the bounded general claim |
| Applicability constraint | Human-reviewed boundary that the separately implemented TypeScript rule must respect; it is not executable corpus logic |
| Exception | Human-reviewed circumstance that limits or displaces the ordinary claim and must be reflected by decision-rule tests |
| Prohibited conclusion | An inference or user-facing statement that the entry must never support |
| Escalation condition | A fact pattern that moves the response outside the approved ordinary path |
| Allowed wording | Human-reviewed language that may be used or closely paraphrased within the entry's conditions |
| Approval profile | Versioned policy naming the review roles, evidence checks, freshness expectations, activation authority and re-review triggers required for a claim class |
| Decision rule | Separately approved deterministic TypeScript logic that evaluates established case facts and references an exact knowledge revision |
| Runtime eligibility | Derived `usable` or `blocked` result calculated from disposition, approval evidence, activation, jurisdiction, validity, product scope and conflicts |
| Retirement | Stored editorial decision that a revision or conceptual claim must no longer be used |
| Supersession | Explicit relationship in which a newer immutable revision or conceptual entry replaces an older one |

The corpus is a controlled representation. It must never be labelled
“authoritative knowledge” without making clear that authority belongs to the
underlying source.

## 7. Knowledge-entry model

### 7.1 Authoring representation

**[Proposed]** `AuthoringKnowledgeEntry` is the review record. It may contain:

- stable conceptual `entryId` and exact immutable `revision`;
- title, domain, topic and structured jurisdiction;
- bounded plain-English and precise internal claims;
- one immutable source snapshot for the first walking skeleton, including exact
  source metadata, access date, source revision or archive identity, pinpoint
  and shortest sufficient quotation;
- dossier finding references, qualified by dossier ID;
- effective-date information and evidence-confidence rationale;
- applicability constraints, exceptions, uncertainty, allowed wording,
  prohibited conclusions and escalation notes;
- versioned `approvalProfileId`;
- references to external approval evidence for the exact revision;
- editorial `disposition`: `draft`, `approved`, `rejected` or `retired`;
- supersession relationships and a concise semantic change reason;
- internal reviewer identities, review notes and provenance detail.

Approval references inside this record are an index for audit and validation.
They are not authority by themselves. Section 9 defines the external control
that must prove who approved the exact revision.

A shared source registry is not required for the first claim. Duplicating one
snapshot once is simpler than introducing cross-record identity prematurely.
If a second real claim needs the same source snapshot, a later design may
extract a shared immutable source record without changing runtime identity.

### 7.2 Runtime representation

**[Proposed]** `RuntimeKnowledgeEntry` is a minimal, public-safe projection. It
contains only product-required data:

| Field | Purpose |
|---|---|
| `runtimeReferenceId` | Stable runtime lookup value incorporating the exact claim revision |
| `entryId` and `revision` | Conceptual identity plus immutable revision identity |
| `approvedClaim` | Exact reviewed proposition permitted for the named use |
| `jurisdiction` | Structured runtime match value |
| `effectiveFrom` / `effectiveTo` | Legal or operational validity when applicable |
| `sourceAccessDate` and public provenance | User-safe source title, authority, location and pinpoint |
| `validUntil` | Optional conservative local expiry generated under the approval profile |
| `requiredQualifiers` | Wording that must accompany use |
| `uncertaintyNote` | What the claim cannot establish |
| `prohibitedConclusionClasses` | Safety constraints the consuming rule and output must preserve |
| `consumptionScope` | Exact separately approved engine use |

It must not contain source quotations that are unnecessary for display,
dossier links, reviewer identities, PR discussion, internal notes, private
review metadata, change deliberation or user/case data.

Production code must never import the authoring registry directly. Internal
review material must not be shipped in the browser bundle.

### 7.3 Activation manifest

**[Proposed]** A small version-controlled activation manifest pins exact
revisions conceptually as:

```text
entry-id@revision -> named consumption scope
```

The manifest, rather than a field saying `active`, determines which approved
revisions may be projected. It must:

- contain one exact revision per conceptual entry and consumption scope;
- reject two conflicting active revisions;
- exclude retired and superseded revisions;
- be changed only through the proposed protected PR process in section 9;
- require the activation authority specified by the selected approval profile;
- record a concise activation, rollback or emergency-retirement reason.

Emergency retirement removes the affected pin and requires a replacement
release. Rollback pins a previously approved, still-valid safe revision or
restores a previously generated safe runtime artifact. Neither operation may
silently reactivate an expired or superseded revision.

### 7.4 Build-time validation and projection

**[Proposed]** A deterministic build or release step validates authoring
revisions, external approval evidence, the selected approval profile, source
snapshot, activation manifest, jurisdiction and category-specific validity. It
then emits only eligible `RuntimeKnowledgeEntry` records.

The projection must fail closed when:

- the manifest does not pin the exact revision;
- required external approval evidence is missing or applies to another commit
  or content digest;
- disposition is not `approved`;
- the source snapshot, jurisdiction or validity metadata is incomplete;
- the revision is retired, superseded, expired or conflicts with another pin;
- the product route or consumption scope is not separately authorised.

No authoring record is copied wholesale. Only validated, activated and current
runtime records are emitted. The generated artifact records its build or
release date and the exact manifest revision.

### 7.5 Structured fields without a rules language

IDs, revisions, dates, editorial disposition, source type, jurisdiction,
approval-profile ID, freshness category and prohibited-conclusion class should
be controlled values. Explanations, quotations and reviewer rationale remain
text.

Applicability constraints may use stable fact names so reviewers and tests can
trace them. They are review constraints, not executable expressions. For v1
there is no generic condition DSL, evaluator or corpus-authored branching.
Deterministic TypeScript decision code owns `present`, `absent`, `unknown` and
`conflicting` fact evaluation as described in section 15.

## 8. Status lifecycle

### 8.1 Stored editorial disposition

The authoring record stores only:

```text
draft | approved | rejected | retired
```

`approved` means that external approval evidence for the exact revision has
been validated under its approval profile. It does not mean active, fresh,
applicable to a case or available on a public route.

Approval evidence, immutable revision, activation, validity and supersession
remain separate facts. `active`, `expired`, `review_due`, `superseded` and
`usable` are not stored editorial dispositions.

### 8.2 Revision and disposition changes

| Change | Rule |
|---|---|
| Edit an unsubmitted draft | The same draft revision may be corrected until any formal review attaches |
| Change after a formal review or approval attaches | Create a new immutable revision and obtain the profile-required reviews again |
| Correct evidence, wording, jurisdiction, qualifiers or safety constraints | Create a new revision; never rewrite the approved revision |
| Narrow the same conceptual proposition | Create a new revision when it remains the same independently consumable claim |
| Split or materially redefine what consumers identify as the claim | Create new conceptual entry IDs and explicitly retire or supersede the old claim |
| Legislation or guidance changes | Capture a new source snapshot, create a new revision and re-review it |
| Replace a revision with an equivalent successor | Mark the relationship explicitly and update the activation manifest through review |
| No safe replacement exists | Retire the claim and remove its activation pin |

Git history supplies valuable audit context but is not runtime identity.
Decision rules, approval evidence and activation must reference
`entryId@revision`, not only `entryId` or a mutable file path.

### 8.3 Derived runtime eligibility

Eligibility is calculated as:

```text
usable
or
blocked: [one or more explicit reasons]
```

Block reasons include:

- `not_approved`;
- `approval_evidence_invalid`;
- `not_activated`;
- `expired`;
- `wrong_jurisdiction`;
- `public_route_unavailable`;
- `feature_or_beta_scope_unavailable`;
- `missing_facts`;
- `conflicting_facts`;
- `conflicting_active_revision`;
- `superseded`;
- `retired`;
- `source_snapshot_missing`;
- `consumption_scope_mismatch`.

`review_due` is derived from the approval profile, source events, access date,
release date and any `validUntil`; it is never an authoritative stored state.
Because activation and expiry are separate inputs, a record cannot truthfully
claim to be both “active” and “current.” An expired manifest pin is simply
blocked and must not be emitted or consumed.

### 8.4 Fail-closed treatment

Any block reason rejects the revision. There is no best-effort fallback to a
draft, rejected, retired, expired or superseded revision, another conceptual
entry, or a raw dossier. Partial review does not make a partial claim usable;
authors should split a claim when only one bounded proposition can be approved.

## 9. Approval model

### 9.1 Distinct approval questions

Each exact immutable revision must answer:

1. Is the source accurately represented?
2. Is the claim legally and factually safe?
3. Are material exceptions and boundaries complete enough?
4. Is the allowed wording suitable for users?
5. Is the entry safe for decision-engine consumption?
6. Is it sufficiently current for the proposed use?

A single `approved: true` value would hide which question was answered, who
answered it and which review has expired. A populated approval field can also
be written by the same author as the claim. It is evidence to validate, not
proof of authority.

### 9.2 Proposed external enforcement

**[Confirmed]** This repository is version controlled. This design found no
repository evidence proving that CODEOWNERS, protected branches, required
reviews or knowledge-specific required CI already enforce corpus approval.

**[Proposed]** Before any implementation or activation, use:

- CODEOWNERS or equivalent path ownership for authoring entries, approval
  profiles, the activation manifest, projection code and runtime artifacts;
- a protected default branch or equivalent protected pull-request workflow that
  prevents direct writes and dismisses stale reviews when the revision changes;
- required CI that validates schema, exact revision identity, approval-profile
  requirements, approval evidence, manifest uniqueness, supersession,
  jurisdiction, validity and authoring-to-runtime projection;
- required role-based PR reviews for the exact commit containing the immutable
  revision and, when activation changes, the exact manifest pin.

The identities and membership of these roles remain open human decisions:

| Authority | Responsibility |
|---|---|
| Evidence approval owner | Confirms source identity, exact support, jurisdiction, snapshot and pinpoint |
| Qualified legal or domain reviewer | Confirms legal/factual safety, applicability boundaries and material exceptions |
| Product-safety owner | Confirms allowed wording, prohibited conclusions, uncertainty, escalation, accessibility, privacy and emotional-safety treatment |
| Engine-use owner | Confirms the named TypeScript rule, fact requirements, negative paths, provenance propagation and tests |
| Activation authority | Approves activation, rollback, emergency removal, retirement or supersession as reflected by an exact manifest change |

The claim author must not self-certify a required independent role. A small team
may allow one suitably qualified person to hold more than one role when the
approval profile explicitly permits it, but the role, competence basis and
separation exception must be reviewable. Identity must use stable repository
accounts or another approved stable project identity, not only a display name.

### 9.3 Auditable evidence for an exact revision

Approval evidence should identify:

- `entryId@revision` and its content digest;
- the pull request and exact commit SHA reviewed;
- reviewer account, required role and review decision;
- approval-profile ID and version;
- review timestamp and any scoped conditions;
- source snapshot identity;
- for activation, the exact manifest change and consumption scope.

A GitHub approval is auditable when the protected workflow preserves the PR,
reviewer identity, review decision and exact reviewed commit, and CI verifies
that the review remains valid after subsequent changes. A separately signed
approval may be used only if its signature, signer identity, role and exact
revision digest are verifiable by required CI. Copying a PR URL, reviewer name
or `approved` value into the record is not sufficient.

No cryptographic signing service is required for the walking skeleton if
protected PR review supplies adequate audit evidence. Whether CODEOWNERS and
branch protection will be configured, and by whom, remains open.

### 9.4 Versioned approval profiles

**[Proposed]** Entries select one versioned profile instead of inventing review
requirements. Initial illustrative profiles are:

| Profile | Intended claim class | Required review emphasis |
|---|---|---|
| `stable_terminology_v1` | Bounded, relatively stable definitions | Evidence, jurisdiction, domain meaning, product wording and event-driven legal re-review |
| `mutable_service_v1` | Forms, routes, contact or service guidance | Evidence, product safety, engine use, category-specific release checks and omission when currency cannot be maintained |
| `legal_high_risk_v1` | Authority, priority, liability or other high-risk propositions | Primary authority, qualified legal/domain review, exception completeness, product safety, engine use and conservative activation |

Each profile defines required roles, evidence checks, freshness expectations,
activation authority and re-review triggers. Profile changes create a new
profile version; they do not silently alter the meaning of approvals already
attached to a revision. The first claim and its profile remain open human
decisions.

## 10. Source and evidence traceability

### 10.1 Required chain

```text
User-facing wording
→ response provenance item
→ decision-rule ID
→ runtime reference ID
→ exact `entryId@revision`
→ activation-manifest revision
→ approval profile and externally verified approval evidence
→ dossier finding/claim-control reference
→ immutable source snapshot
→ title, URL/location, source/access dates and pinpoint
→ original authoritative source
```

Each handoff must carry exact identities rather than relying on matching prose.
The authoring record may index a PR or commit plus one concise semantic change
reason. It need not embed a second full `changeHistory` that duplicates Git.
Tests and coverage manifests reference `entryId@revision`; knowledge entries do
not reference test filenames.

### 10.2 Multiple sources

- Record which source supports each part of a claim.
- Use legislation for legal propositions and service guidance for operational
  steps; do not let one silently substitute for the other.
- Where corroboration is required, record all supporting sources.
- Where sources conflict, preserve the exact conflict and interim treatment.
- A lower-tier source may explain context but must not replace missing primary
  authority for a high-risk claim.

### 10.3 Source metadata

Source titles, issuing authorities and URLs must be preserved exactly in the
authoring snapshot. Pinpoints should use section, rule, paragraph, page, heading
or form-version details. Source access dates must be visible to reviewers and
available in public-safe runtime provenance.

If a page changes:

- do not overwrite history as if the old and new page were identical;
- create a new immutable snapshot and assess affected revisions;
- retain a lawful archive or exact prior quotation where available;
- fail closed if the old evidence can no longer be verified and the claim is
  time-sensitive.

If a source is unavailable, mark its availability and block entries that lack
sufficient alternative evidence.

### 10.4 Quotations and paraphrases

- Preserve the shortest sufficient quotation where copyright and source rules
  permit.
- Mark paraphrases as paraphrases.
- Keep quotation text separate from the claim and allowed wording.
- Never silently “improve” source wording inside quotation fields.
- A reviewer must be able to see limiting text adjacent to the cited passage.

## 11. Freshness and change management

There is no safe universal expiry period. Freshness depends on claim class,
known change events, release cadence, offline limitations and proposed use.

| Freshness category | Examples | Review behaviour |
|---|---|---|
| Primary legislation | Acts and statutory provisions | Verify affecting provisions, commencement, territorial extent and amendments before the approving release; use event-driven re-review and any conservative profile policy |
| Court or procedural rules | Non-Contentious Probate Rules | Verify the exact rule revision before release; re-review on known amendment or relevant legal change |
| Government service guidance | Application steps and eligibility pages | Verify the immutable page snapshot before release; assign `validUntil` only under an approved service-guidance policy |
| Forms and checklists | PA1P, PA1A and supporting forms | Verify exact form identity and version before release; omit route detail if a safe offline validity window cannot be justified |
| Statutory and court fees | Grant, copy and caveat fees | Verify the governing order and current service source before release; use a category-specific conservative expiry or omit the amount |
| Postal addresses and contacts | Registry addresses, email, telephone and hours | Prefer official signposting over bundled detail; include only with an approved short validity policy |
| Online route eligibility | Personal or practitioner service criteria | Verify before the enabling release; do not let knowledge activation enable the route |
| Processing information | Public estimates and quarterly statistics | Store measure, population and period; never guarantee timing; omit when a bounded validity policy is not defensible |
| Stable terminology | Statutory role definitions | Verify the exact source revision before release, with event-driven and impact-based scheduled re-review |

A category-specific policy may combine:

- immutable source snapshot or exact source revision;
- source access and verification dates;
- build or release date;
- known change triggers;
- optional conservative `validUntil`;
- required re-review roles;
- local rejection after expiry;
- omission where safe currency cannot be maintained.

Verification occurs before build or release. A deployed local bundle may compare
its record with `validUntil` using local time, but it cannot re-access GOV.UK or
detect a source change immediately before display. A source change after release
is invisible to a purely offline bundle until a newly verified release or a
separately approved connected-update mechanism exists. This design does not
propose such a mechanism.

Passing a calendar date is not the only stale condition at build time. A known
source withdrawal, conflict, legal change or jurisdiction change blocks the
revision even before `validUntil`. Conversely, a future `validUntil` is not
evidence that no source change has occurred; it is a conservative offline
mitigation.

### 11.1 Emergency retirement and deployed-bundle limits

If an activated revision is found to be wrong or unsafe:

1. remove its exact pin from the activation manifest through the fastest
   authorised protected review path;
2. block projection and new releases immediately;
3. publish a replacement release, or roll back to a previously approved,
   still-valid runtime artifact when that is safer;
4. supersede or retire the authoring revision with the reason and affected
   release references;
5. provide product messaging appropriate to the risk where users may still
   hold an old release.

A purely offline already-deployed browser bundle cannot be remotely revoked or
made aware of the manifest change. This architecture must not pretend otherwise.
Conservative expiry, omission of highly mutable details, visible source/access
dates and prompt replacement releases reduce that risk but do not eliminate it.
No backend revocation or connected update mechanism is authorised by this
design.

## 12. Confidence and uncertainty

Three confidence questions must remain separate:

1. **Evidence confidence:** how strongly the sources support the bounded general
   claim.
2. **Applicability confidence:** whether the established facts of this user's
   case meet the entry's conditions.
3. **Freshness confidence:** whether operational information remains current.

Only evidence confidence belongs in the knowledge entry as a research
assessment. Applicability is evaluated from case facts and may remain unknown.
Freshness is a consumption gate, not a reassuring label.

High evidence confidence does not authorise:

- deciding that a person is an executor or administrator;
- deciding that a grant is required;
- ranking competing applicants;
- calculating tax or inheritance;
- determining will validity;
- predicting an application outcome.

If applicability is unknown, the product may explain the general rule with its
conditions, prepare a question or escalate. It must not convert high research
confidence into a personalised conclusion.

## 13. Applicability, exceptions and escalation

For v1, every item in this section is an authoring and review constraint. These
fields document what separately authored deterministic TypeScript code and its
tests must respect. They are not executable predicates, do not select branches
and do not authorise a generic rules interpreter.

### 13.1 Ordinary path representation

An entry should identify:

- facts that must be present;
- facts that must be absent;
- facts that may remain unknown for a general explanation;
- exceptions that displace the ordinary route;
- questions that can safely obtain missing information;
- the response when information remains missing.

The separately approved decision rule should be able to return
`outside_approved_path` without diagnosing the correct legal path.

### 13.2 Estate Administration exception classes

Authoring constraints and decision-rule tests must require ordinary-path use to
stop for:

- disputed, missing, damaged or competing wills;
- capacity issues;
- applicants under 18;
- attorney or trust-corporation cases;
- foreign estates, domicile, resealing or foreign wills;
- potentially insolvent estates or disputed debts;
- competing or same-degree applicants;
- caveats, warnings and contentious probate;
- tax calculations, liability or excepted-estate uncertainty;
- previous grants, revocation, double probate or de bonis non;
- unclear jurisdiction;
- missing facts about ownership or an institution's requirements.

These triggers do not prove that a dispute, incapacity or insolvency exists.
They identify that the approved ordinary explanation is insufficient and that
specialist help or a different reviewed path may be needed.

### 13.3 Conflicting facts

Case facts can disagree: a user may say there is no will while a letter refers
to one, or two documents may name different executors. The engine must preserve
both sourced statements, mark the conflict and stop the ordinary-path rule. It
must not select the “more likely” fact without an authorised deterministic rule
and evidence.

## 14. Allowed wording and prohibited conclusions

Safe entries need both fields because a true general statement can still support
an unsafe personalised inference.

### 14.1 Repository-supported examples

| Allowed general wording | Prohibited conclusion |
|---|---|
| “An executor named in a will is ordinarily the person who applies for a grant of probate.” | “You are legally entitled to apply for probate.” |
| “Letters of Administration ordinarily relate to an administrator where there is no will.” | “You are the administrator because you are the closest relative.” |
| “Some estates may not need a grant, and organisations can have their own evidence requirements.” | “This estate is small, so probate is not needed.” |
| “The £5,000 figure is a court-fee threshold, not a universal probate threshold.” | “The bank must release funds because the estate is under £5,000.” |
| “The public guide accessed for the research gave an estimate, while statistics described different populations.” | “Probate takes 12 weeks.” |
| “A grant enables estate administration to proceed.” | “The grant means the estate is finished.” |

Allowed wording should specify required qualifiers, jurisdiction and date
labels. Prohibited conclusions should use stable classes as well as examples:
`legal_authority`, `grant_required`, `applicant_priority`, `will_validity`,
`tax_liability`, `inheritance_entitlement`, `debt_validity`,
`estate_solvency`, `guaranteed_timing` and `outcome_prediction`.

Safety phrase scanning can catch known wording. It cannot prove that a novel
sentence is substantively safe.

## 15. Relationship to the decision engine

### 15.1 Conceptual contract

**[Proposed]** A future deterministic TypeScript decision rule may read only a
validated `RuntimeKnowledgeEntry`, including:

- runtime reference ID and exact immutable `entryId@revision`;
- approved claim;
- jurisdiction;
- required qualifiers;
- prohibited-conclusion classes;
- uncertainty note;
- public-safe source/provenance references;
- effective dates and optional `validUntil`;
- named consumption scope.

It must not read:

- the authoring registry;
- raw research dossiers as prompts;
- draft, rejected, retired, expired or unactivated revisions;
- reviewer discussion as user guidance;
- unrelated entries retrieved by semantic similarity;
- user data stored in the general corpus;
- an evidence-confidence label as a case conclusion.

Applicability conditions, exceptions and escalation notes remain reviewer
constraints. The TypeScript rule owns deterministic fact evaluation and must be
reviewed and tested against those constraints. The corpus is not a second rules
engine, and v1 authorises no generic condition DSL.

### 15.2 Missing facts and uncertainty

Required case facts should use explicit values such as `present`, `absent`,
`unknown` and `conflicting`, each linked to user-provided evidence where
applicable. Unknown or conflicting facts propagate to the response and may
trigger a question or escalation.

The engine must distinguish:

- **explanation** — presenting a bounded general rule and conditions;
- **determination** — deciding that the rule resolves the user's rights or
  status.

The reviewed corpus may support explanation. A determination requires separate
explicit product authority and may remain permanently prohibited.

### 15.3 Public-scope precedence

> Knowledge availability never authorises a product route or public scope.

Public or controlled-beta scope gating must occur before knowledge selection.
An activated Estate Administration revision does not make Estate Administration
publicly available. The corpus layer must not override:

- `publicScopePolicy` or its future equivalent;
- controlled-beta restrictions;
- feature flags;
- jurisdiction availability;
- product approval status.

If the route is unavailable, the knowledge selector is not invoked. This order
must be represented in the consuming architecture and proved by tests before
any future implementation is approved.

### 15.4 Citations and blocking

When an entry contributes wording, its runtime reference, exact revision and
public-safe source references should travel with the generated result into the
`ResultViewModel`. The response layer must be able to expose provenance without
reconstructing it from text.

The knowledge loader or selection boundary must reject:

- a revision absent from the exact activation manifest;
- invalid external approval evidence;
- rejected, retired, superseded or expired revisions;
- jurisdiction mismatch;
- public route, beta, feature or product-scope mismatch;
- missing runtime provenance;
- missing or conflicting required facts in the decision rule;
- unresolved blocking conflict.

## 16. Relationship to user-facing responses

When corpus knowledge is used, the response must include or make available:

- a calm plain-English explanation;
- the applicable jurisdiction;
- conditions that matter;
- uncertainty and what AdminAvenger cannot know;
- source/provenance information, source access date and applicable validity
  date;
- practical preparation, not an autonomous action;
- checks the person should make against their documents and official route;
- escalation where the ordinary path is not approved or facts conflict;
- a reminder that AdminAvenger has not made the legal, tax or entitlement
  decision.

The response should keep source voices separate:

- “Your letter says…” for user-document facts;
- “Official guidance checked on [date] says…” for mutable general guidance;
- “AdminAvenger suggests checking…” for product-prepared questions;
- “A specialist may need to advise…” for escalation.

No response should claim that the corpus is authoritative or that a reviewer has
approved the user's individual case.

## 17. Privacy and data separation

The general knowledge corpus must contain no user document, deceased-person
record, family relationship, case reference, account number, address, free-text
case note or generated draft.

Keep these stores conceptually separate:

| Data class | Location/boundary |
|---|---|
| Authoring knowledge | Version-controlled review records containing public-source evidence plus internal approval/provenance metadata; never imported by production |
| Runtime knowledge | Generated allowlisted records containing only approved public-safe claims, provenance and constraints |
| Case-specific extracted facts | Local case/session structures linked to the user's submitted document |
| User decisions | Local user-controlled case/workspace state |
| Generated drafts | User-editable local preparation, never part of general knowledge |
| Evaluation fixtures | Synthetic committed fixtures only; external private evaluation material remains outside the repository |

Source excerpts should be the shortest sufficient public-source evidence.
Review notes must not contain real case material. Any illustrative case facts
must be synthetic and clearly marked.

Redaction and data-minimisation checks should reject personal data in corpus
records and committed fixtures. The corpus must not become a route for training
on user content or retaining deleted case data.

## 18. Evaluation and testing requirements

No tests are created by this task. Before implementation is approved, the
design should have tests for:

### 18.1 Structural and governance validation

- unique conceptual entry IDs and immutable revision identities;
- required fields and controlled values;
- valid ISO dates and date ordering;
- immutable source snapshots resolve;
- dossier references resolve to permitted public project documents;
- external PR or signed evidence satisfies the selected approval profile for the
  exact revision;
- the activation manifest pins no conflicting revisions;
- only eligible revisions project into runtime records;
- the runtime artifact excludes internal notes and reviewer metadata;
- supersession links are consistent and acyclic;
- no personal data or prohibited fixture paths.

### 18.2 Consumption rejection

- draft, rejected, retired and merely approved-but-unactivated revisions are
  rejected;
- derived review-due, superseded, expired and conflicting revisions are rejected;
- jurisdiction mismatch rejects use;
- unavailable public or controlled-beta scope prevents knowledge selection;
- missing applicability facts in the TypeScript rule preserve `unknown`;
- conflicting facts trigger escalation;
- missing source snapshot or external approval evidence rejects the revision;
- an expired offline runtime record rejects locally without pretending to have
  checked the live source.

### 18.3 Output safety

- prohibited conclusions never appear;
- required qualifiers remain visible;
- cannot-know and uncertainty propagate;
- citations trace from response through runtime reference and exact revision to
  the source snapshot;
- a source quote from a user document is not confused with general guidance;
- mutable facts display date/freshness wording;
- no automatic action, outcome or money-saved claim.

### 18.4 Estate Administration scenarios

Synthetic scenarios should cover:

- an ordinary named-executor explanation without entitlement determination;
- no will, with relationship facts missing;
- multiple or competing applicants;
- a disputed or missing will;
- capacity or minority indicators;
- a bank with an institution-specific grant requirement;
- an estate with jointly held and sole assets;
- a stale probate fee entry;
- route/form version change;
- caveat or contentious wording;
- foreign or unclear jurisdiction;
- potential estate insolvency;
- conflicting documents;
- ordinary wording that mentions “estate” but is not bereavement administration.

The Golden Letter Corpus patterns are reusable, but future knowledge tests need
additional assertions for derived eligibility, jurisdiction, freshness,
decision-rule fact handling and citation traceability. Tests and any coverage
manifest reference knowledge revisions; authoring entries do not reference test
filenames.

## 19. Worked examples

The following examples are **illustrative design records only**. They are
unapproved, are not corpus population, and must not be consumed by a product.
They paraphrase boundaries already recorded in the probate dossier. None is
selected as the walking-skeleton claim, assigned an immutable approved revision
or activated by this design.

### 19.1 Illustrative stable terminology entry — unapproved

| Field | Illustrative value |
|---|---|
| Entry ID | `ea-ew-probate-term-personal-representative-001` |
| Editorial disposition | `draft` — illustrative, not approved |
| Claim | “Personal representative” is an umbrella term that includes an executor or administrator for the time being |
| Jurisdiction | England and Wales |
| Dossier/source references | Probate dossier section 5; `P-14` |
| Applicability | Terminology explanation only; does not identify the user's role |
| Exception/uncertainty | A document or self-description does not establish legal status |
| Allowed wording | “Personal representative is a general label for an executor or administrator.” |
| Prohibited conclusion | “You are the personal representative.” |
| Freshness | Primary-legislation category; recheck affecting provisions and review gates |

### 19.2 Illustrative mutable fee entry — unapproved

| Field | Illustrative value |
|---|---|
| Entry ID | `ea-ew-probate-fee-grant-2026-07-001` |
| Editorial disposition | `draft` — illustrative, not approved |
| Claim | As at the dossier's research date, the statutory grant application fee recorded for an assessed estate value over £5,000 was £526, subject to the cited order and exceptions |
| Jurisdiction | England and Wales |
| Dossier/source references | Probate dossier sections 12 and 24; `P-05`, `P-15`, `P-16`, with stale conflict `P-36` |
| Effective date recorded | 13 July 2026 |
| Applicability | Court application fee only; estate value and exemptions must be established separately |
| Allowed wording | Must include date, conditions and official-source provenance |
| Prohibited conclusions | No universal probate threshold; no Help with Fees eligibility decision; no professional-fee estimate |
| Freshness | Fee category; verify before build/release, use an approved conservative `validUntil` or omit the amount; an offline bundle cannot reverify at display time |
| Escalation | Conflicting current official pages or inability to verify the governing order |

### 19.3 Illustrative fact-sensitive ordinary-route entry — unapproved

| Field | Illustrative value |
|---|---|
| Entry ID | `ea-ew-probate-executor-ordinary-applicant-001` |
| Editorial disposition | `draft` — illustrative, not approved |
| Claim | An executor named in a will is ordinarily the person who applies for a grant of probate |
| Jurisdiction | England and Wales |
| Dossier/source references | Probate dossier sections 6 and 8; `P-02`, `P-07`, with exception framework in `P-11` |
| Required facts | Will appears to name the person; jurisdiction established; no known exception trigger |
| Unknown treatment | Explain the ordinary distinction without saying it applies to the person |
| Allowed wording | “An executor named in a will is ordinarily the person who applies for a grant of probate.” |
| Prohibited conclusion | “You are legally entitled to apply for probate.” |
| Escalation | Disputed/missing will, no acting executor, capacity, minority, attorney, competing applicant, caveat, foreign element or previous grant |
| Confidence boundary | Strong evidence for the general distinction does not establish the individual's authority |

## 20. Minimum viable first implementation

This section describes a possible later slice; it does not authorise it.

### 20.1 Build first

The smallest future walking skeleton contains only:

1. one human-reviewed candidate claim;
2. one immutable source snapshot;
3. one jurisdiction;
4. one versioned approval profile;
5. one exact immutable `entryId@revision`;
6. one activation-manifest pin to that exact revision;
7. one validated authoring-to-runtime projection;
8. one explicit deterministic TypeScript decision rule referencing that exact
   revision;
9. one ordinary synthetic fixture;
10. several rejection fixtures covering missing approval, missing activation,
    expiry, scope/jurisdiction mismatch, missing facts and prohibited output;
11. no UI expansion unless separately specified and authorised.

The walking skeleton does not require a shared source registry. Extract one only
if a second real approved claim demonstrates genuine source reuse. It does not
require a general corpus platform or corpus population beyond the single claim.

### 20.2 Wait

Do not initially build:

- a database;
- a shared source registry without demonstrated reuse;
- an editorial workflow application;
- automatic dossier parsing;
- LLM-generated claims;
- embeddings or vector search;
- general-purpose retrieval;
- a generic rule language;
- a broad cross-domain ontology;
- live web fetching;
- automatic source monitoring;
- a user-facing citation browser;
- corpus population beyond the single reviewed proof;
- any route, feature, public-scope or UI expansion.

The first implementation should prove that unsafe records are rejected more
reliably than safe records are retrieved.

## 21. Options considered

| Option | Safety and traceability | Inspectability/testability | Cost and fit | Decision |
|---|---|---|---|---|
| Markdown-only approved claims | Human-readable but weakly structured; status and freshness can be missed | Easy to review, difficult to validate deterministically | Low cost but unsafe as direct runtime data | Keep dossiers and review notes in Markdown; do not use as sole runtime corpus |
| Typed JSON records | Separates data from code and is portable; needs explicit runtime/schema validation | Diffable and testable with a validator | Moderate small-project cost | Viable later if non-developer editorial tooling becomes necessary |
| TypeScript authoring records plus generated runtime projection | Compile-time controlled authoring shape with a browser-safe emitted contract; natural fit with Vite/TypeScript | Inspectable, diffable and testable, with a required projection boundary | Lowest proportionate cost now if limited to one claim | Recommended for the walking skeleton |
| Relational database | Can model history and workflow but adds backend, migration, authentication and operational complexity | Queryable but less inspectable in ordinary code review | Disproportionate to the current local-first app | Defer |
| Vector database/retrieval | Poor deterministic control over jurisdiction, status, exceptions and freshness | Harder to prove why an entry was selected | High complexity and new infrastructure | Reject for current stage |
| Raw-dossier prompting | Retains context but cannot guarantee approved claim selection or stale/unsafe exclusion | Opaque and difficult to test | Superficially cheap, high safety cost | Reject |

## 22. Recommended design

**[Proposed]** Prove the architecture with one version-controlled TypeScript
authoring entry and one generated runtime record:

- an `AuthoringKnowledgeEntry` containing one immutable source snapshot and
  review-only material;
- a `RuntimeKnowledgeEntry` containing only the exact approved claim revision
  and public-safe runtime constraints;
- a versioned approval profile whose requirements are enforced through proposed
  CODEOWNERS or equivalent ownership, protected PR review and required CI;
- an activation manifest pinning the exact approved revision;
- build-time fail-closed validation and projection;
- category-specific release verification and optional conservative local
  expiry, never a promise of live display-time verification;
- public/product scope gating before corpus selection;
- one deterministic TypeScript decision rule referencing the exact revision,
  with no generic condition DSL;
- synthetic ordinary and rejection fixtures based on current Golden Letter and
  safety-regression patterns;
- provenance carried to `ResultViewModel`;
- no shared source registry until reuse is demonstrated;
- no database, network, vector search or automatic ingestion.

Treat the current HMRC `OfficialRuleRecord` as a prototype whose migration or
retirement remains an open decision. Do not require migration for the
walking skeleton and do not silently create a second production standard.

Keep case facts (`DecisionSourceFact`, typed extracted dates/money and user
documents) separate from general knowledge. The engine combines them only
through an explicit decision rule and never writes case facts back into the
corpus.

This is proportionate only if the GitHub controls are actually configured and
the slice remains one claim. Record fields and ordinary code review alone are
not approval authority.

## 23. Migration path

Migration from the dossiers should be selective:

1. **Select one bounded candidate.** A human chooses one finding with a clear
   product need; do not ingest a section or whole dossier.
2. **Choose one jurisdiction and approval profile.** Both require explicit human
   approval.
3. **Capture one immutable source snapshot.** Preserve exact metadata, access
   date, revision/archive identity, shortest sufficient evidence, pinpoint,
   limitations and conflicts.
4. **Create one authoring revision.** Assign a stable conceptual ID and exact
   immutable revision, then record review constraints and semantic change
   reason.
5. **Obtain external reviews.** Evidence, qualified domain/legal, product-safety
   and engine-use approvals attach to the exact revision through the protected
   workflow required by the profile.
6. **Implement the separately authorised projection and rule.** The runtime
   record excludes review-only data; the TypeScript rule references the exact
   revision and owns fact evaluation.
7. **Add one ordinary and several rejection fixtures.** Tests reference the
   revision, not the reverse.
8. **Activate separately.** The activation authority reviews one exact manifest
   pin only after implementation, product scope and release are independently
   authorised.
9. **Verify before release.** Recheck the source under the category-specific
   policy and emit only an eligible runtime record.
10. **Maintain or retire.** A change creates a new snapshot and revision.
    Emergency removal changes the manifest and requires a replacement release.

The 998-line probate dossier should yield only the small number of claims needed
for an approved product slice. It should not be converted line by line.

## 24. Open questions

**[Open]**

1. Who is the qualified legal or domain reviewer, and what evidence establishes
   their role?
2. Who owns evidence approval?
3. Who owns product-safety approval?
4. Who owns engine-use approval?
5. Who is authorised to activate, roll back, retire or supersede a revision?
6. Which single candidate claim should be used for the walking skeleton?
7. Which versioned approval profile applies to that claim?
8. What category-specific review policy applies to mutable facts?
9. Should citations always be visible, available on request, or more prominent
   for high-risk claims?
10. Which jurisdiction is selected for the first claim, and how is it
    established without unnecessary personal data?
11. How should local expiry behave in an already deployed offline bundle,
    including clock uncertainty and user messaging?
12. Should the HMRC prototype be migrated, retained temporarily or retired, and
    at what later gate?
13. Will CODEOWNERS or equivalent ownership and branch protection be
    configured, when, and by whom?
14. Which stable identity scheme and evidence format should required CI accept
    for reviewers and approvals?
15. Can any legal proposition safely be activated before the full ordinary-path
    exception set has qualified review?
16. What release process proves that the runtime artifact contains only the
    intended exact manifest revisions?

## 25. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Stale guidance | Category-specific pre-release verification, conservative optional `validUntil`, local expiry rejection and omission of details that cannot be kept safely current |
| Source drift | Immutable source snapshots, new revisions, impact review and preserved pinpoints; acknowledge that deployed offline bundles cannot detect later drift |
| Missing exceptions | Required reviewed exception list, qualified review and negative fixtures |
| AI overgeneralisation | Deterministic entry IDs, prohibited conclusions, explicit required facts and no raw-dossier prompting |
| Duplicated or conflicting entries | Stable conceptual IDs, immutable revisions, one exact manifest pin and explicit supersession |
| Approval self-certification | Protected PR review, required role ownership and CI verification against the exact revision |
| Approval bottleneck | Versioned profiles, one bounded claim and explicit role-combination policy for a small team |
| Excessive complexity | One authoring entry, one source snapshot and one runtime projection; no shared registry or general platform yet |
| Authoring metadata shipped to users | Build-time allowlisted projection; production must never import the authoring registry |
| Corpus/engine coupling | Exact runtime revision contract; TypeScript owns fact evaluation and the corpus defines no rules DSL |
| False confidence | Separate evidence, applicability and freshness confidence |
| Jurisdiction leakage | Structured jurisdiction matching and fail-closed mismatch |
| Source quotation mistaken for product advice | Separate evidence, internal claim and allowed-wording fields |
| User facts entering the corpus | Strict data separation, synthetic fixtures and privacy validation |
| Review identity ambiguity | Stable repository identity, role ownership, exact-commit review evidence and required CI |
| Users reading preparation as legal advice | Required uncertainty, cannot-know, provenance and escalation wording |
| Unsafe claim discovered after release | Remove the manifest pin, publish a replacement or roll back to a still-valid safe artifact; disclose that an old purely offline bundle cannot be remotely revoked |
| Knowledge bypasses product gating | Require route, beta, feature, jurisdiction and product approval checks before knowledge selection |
| Existing HMRC prototype becoming a parallel model | Keep migration or retirement an explicit later decision; do not make it a walking-skeleton dependency |

## 26. Acceptance criteria

This design is complete when:

- [x] Research, reviewed knowledge, decision logic and UI are separated.
- [x] Existing reusable repository capability is identified with limitations.
- [x] Missing capability and duplication risk are explicit.
- [x] Authoring and minimal runtime representations are explicitly separated.
- [x] Production is prohibited from importing authoring records directly.
- [x] Approval profiles and proposed external GitHub enforcement are defined;
  record fields are not treated as self-certifying authority.
- [x] Stored editorial disposition is limited to draft, approved, rejected and
  retired; runtime eligibility and review-due are derived.
- [x] An activation manifest pins exact immutable revisions.
- [x] Source traceability, conflicts and changed sources are covered.
- [x] Freshness varies by claim class, uses pre-release verification and does
  not promise display-time live re-verification in an offline bundle.
- [x] Evidence, applicability and freshness confidence are separated.
- [x] Applicability, exceptions, escalation and prohibited conclusions are
  review constraints, not a generic executable rules language.
- [x] A future decision-engine contract is defined without production code.
- [x] Public/product scope gating explicitly precedes knowledge selection.
- [x] User-response and privacy boundaries are defined.
- [x] Evaluation requirements include ordinary and difficult Estate
  Administration cases.
- [x] Three illustrative, explicitly unapproved examples are included.
- [x] The minimum future slice is one walking-skeleton claim.
- [x] Emergency retirement, rollback and offline revocation limits are explicit.
- [x] No production implementation, test, fixture or corpus entry is created.

## 27. Explicit downstream restrictions

This specification does not authorise:

- corpus population;
- treating an illustrative example as an entry;
- legal-specialist or other qualified approval;
- approval-profile, activation-manifest, CODEOWNERS, branch-protection or CI
  configuration;
- production code;
- schemas or validators;
- decision rules;
- classifier changes;
- fixtures or tests;
- user-interface changes;
- feature activation or public availability;
- storage or routing changes;
- database or vector-search infrastructure;
- automated ingestion or extraction from dossiers;
- live retrieval or network access;
- deployment or public claims;
- a roadmap change;
- use of either Estate Administration research dossier as direct runtime
  context.

Any such work requires a separate approved specification and explicit
implementation authority. Until then, the current product behaviour remains
unchanged.
