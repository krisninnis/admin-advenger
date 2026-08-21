# Care Fee Optional Case V1

## 1. Status and approval

| Field | Value |
|---|---|
| Status | **Approved for bounded implementation** |
| Version | v1 |
| Approval date | **20 August 2026** |
| Approved by | Human project owner |
| Product principle | AI prepares. Humans decide. |
| Production implementation authorisation | **Not yet granted** |
| Availability | Existing explicit controlled-beta Care Fee journey only |
| Persistence | Explicitly confirmed local browser persistence only |

The human project owner approved this specification after the completed
read-only Care Fee Optional Case + Preparation review. This document records
that human decision. It does not itself authorise production implementation.
Production implementation requires separate explicit human authorisation.

## 2. Purpose and completion point

Allow a person who has completed a safe Care Fee comparison to explicitly save
that comparison as a local Care Fee case.

```text
Completed safe comparison
→ user chooses Save this comparison as a case
→ explicit local-save confirmation
→ atomic local persistence
→ dedicated read-only Care Fee case view
→ STOP
```

The bounded milestone adds optional local case saving only. It does not add
drafting, evidence-pack preparation or export, chasing, outcomes, external
contact, submission, or money accounting.

Successful future implementation means:

- **Care Fee controlled-beta journey supports explanation + optional local
  case:** YES.
- **Full Care Fee product:** NO.

Drafting, evidence export, evidence additions or recomparison, chase, outcomes,
money handling, and broader release remain separately governed work.

## 3. Explicit human confirmation boundary

Completing a comparison must never create or persist a case automatically.
Agreement, disagreement, and `not_safely_comparable` must all pass through the
same two-step gate.

The first deliberate action is:

> Save this comparison as a case

That action must open a second confirmation equivalent to:

> Save a local Care Fee case?
>
> This will save the two selected record excerpts, their source details, the
> context you confirmed, and this comparison result in this browser.
>
> It will not contact anyone, prepare or send a message, start a chase, or count
> money as saved or recovered.

The confirmation actions are:

- **Save local case**; and
- **Cancel**.

No comparison state, inferred urgency, amount, or perceived discrepancy may
bypass or preselect this confirmation.

## 4. Dedicated case contract

Do not reuse or coerce the generic `AdminCase` or `createAdminCase` path.
Introduce an additive, structurally separate, versioned contract equivalent to:

```ts
type CareFeeComparisonCaseV1 = {
  readonly kind: "care_fee_comparison_case"
  readonly version: 1
  readonly id: string
  readonly title: "Care fee record comparison"
  readonly summary: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly creation: {
    readonly kind: "explicit_user_save"
  }
  readonly sourceRecords: readonly [
    CareFeeCaseSourceSnapshot,
    CareFeeCaseSourceSnapshot,
  ]
  readonly userConfirmedContext: readonly UserConfirmedCareFeeContext[]
  readonly resolutionLedger: CareFeeResolutionLedger
  readonly reconciliation: ReconciliationResult
  readonly blockingExplanations: readonly string[]
  readonly safetyBoundary: string
}
```

The precise internal names may vary, but the version, explicit-save origin,
three-way provenance, exact typed reconciliation, timestamps, and immutable
snapshot semantics are mandatory.

The case must not require a synthetic generic finding, generic evidence array,
generic opportunity, urgency, chase date, money impact, or draft state.

## 5. Immutable source snapshots

Persist one immutable source snapshot for Record 1 and one for Record 2 in the
original confirmed order. Each snapshot must preserve, where available:

- the neutral Record 1 or Record 2 label;
- original `FinancialClaim` identity and typed fields;
- source document ID;
- source segment ID;
- document display name;
- page or photo location;
- exact source quote;
- source review state;
- extraction confidence; and
- original source provenance.

The saved snapshots are copies taken at the explicit save boundary, not live
references to transient attachment state. Removing transient attachments later
must not alter an already saved case.

Do not persist:

- comparison-only adapted claims;
- opaque comparison subject or provider keys;
- opaque comparison-attempt identifiers as real-world identity;
- browser `File` objects;
- original binary file bytes;
- full document text when the validated excerpt is sufficient;
- transient disclosure, focus, progress, or modal state; or
- internal errors or stack details.

## 6. Three-way provenance model

The case contract and dedicated case view must preserve three structurally
separate categories.

### 6.1 From your records

Contains only original source claims, exact quotations, locations, review state,
and genuine provenance. It must use the original confirmed claims, never the
comparison-only adapted claims.

### 6.2 You confirmed

Contains only typed `UserConfirmedCareFeeContext` values. These values must be
identified as user-confirmed context and must not receive a source quotation,
document badge, source location, or fabricated source provenance.

### 6.3 AdminAvenger comparison

Contains the exact typed `ReconciliationResult`, including as applicable:

- `agreement`;
- `disagreement`;
- `not_safely_comparable`;
- exact inherited applicability;
- the backend absolute difference; and
- ordered backend blocking reasons.

Derived comparison content must not receive fabricated source provenance. The
source/user resolution ledger must retain the per-record distinction between
`source_derived` and `user_confirmed` values.

These categories must not be flattened into generic `EvidenceItem[]`.

## 7. Typed transient save candidate

The Care Fee Safe Comparison adapter may be extended additively to return a
typed, transient save candidate alongside its presentation model.

The candidate must:

- retain the exact typed `ReconciliationResult` produced by the existing
  backend;
- retain original ordered claim and source identity needed to build the saved
  snapshots;
- retain the typed user-confirmed context and source/user resolution ledger;
- remain transient until explicit save confirmation;
- contain no comparison-only adapted claim as source truth; and
- contain no opaque comparison identity presented or persisted as a real-world
  identity.

Typed applicability, amounts, difference, cadence, currency, or reason codes
must never be reconstructed by parsing formatted UI strings. Existing Financial
Claim, comparability, reconciliation, Safe Result, and Decision-Derived
contracts remain authoritative and unchanged.

## 8. Deterministic title and summaries

Every state uses the neutral title:

> Care fee record comparison

Agreement uses wording equivalent to:

> The two selected source amounts were safely comparable and agreed for the
> recorded applicability. This does not establish that either record is correct
> or that nothing further is due.

Disagreement uses wording equivalent to:

> The two selected source amounts were safely comparable and differed for the
> recorded applicability. This does not establish which amount is correct,
> whether anyone is at fault, or whether money is owed.

`not_safely_comparable` uses wording equivalent to:

> The selected source amounts could not be safely compared. The saved blockers
> show what was missing or unclear; no difference or financial conclusion was
> produced.

Titles and summaries must not introduce overcharge, incorrect invoice, refund,
debt, liability, entitlement, fault, chronology, approval, or authority.

## 9. Agreement behaviour

Agreement may be saved for record-keeping only after explicit confirmation.
It does not establish:

- correctness or authority;
- approval;
- that there is nothing to do;
- absence of liability; or
- absence of entitlement.

The saved case retains the exact applicability boundary and the original source
records that support the limited agreement result.

## 10. Disagreement behaviour

A saved disagreement may retain:

- the two ordered source amounts;
- the backend absolute difference;
- exact inherited applicability;
- original source evidence; and
- separately typed user-confirmed context.

It must not infer overcharge, debt, refund, reimbursement, fault, chronology,
currentness, or which amount is correct.

## 11. Not-safely-comparable behaviour

A `not_safely_comparable` result may be saved as a neutral local case. It must:

- retain both ordered source records;
- retain all backend blockers and their user-safe explanations;
- contain no financial difference;
- contain no money impact; and
- emphasise missing, unclear, or incompatible evidence without guessing.

A future gather-more-evidence workflow is outside this milestone.

## 12. Money-impact prohibition

This milestone must create no:

- `ImpactEntry`;
- potential saving;
- recovered amount;
- refund amount;
- amount at stake;
- value label;
- confirmed financial outcome; or
- contribution to any savings or recovery total.

A disagreement difference is an absolute comparison difference only. It is not
money owed, recoverable money, money saved, or a refund. Where valid, it may
appear only inside the dedicated AdminAvenger comparison region and must be
labelled **Absolute comparison difference**.

## 13. Local persistence and storage compatibility

Persistence is local to the existing browser workspace only. Add a dedicated
collection equivalent to:

```ts
careFeeCases: CareFeeComparisonCaseV1[]
```

The collection must be additive. Existing saved workspaces that omit it must
hydrate safely to an empty collection. Existing validation and sanitisation
must not be weakened.

A case must:

- be created only after the second explicit confirmation;
- be persisted atomically;
- be stored as an immutable snapshot;
- remain readable if transient attachments are later removed;
- reopen without rerunning extraction, comparability, or reconciliation;
- show its saved timestamp and snapshot boundary; and
- delete atomically with all source, user-context, and comparison content.

Running a new comparison must not silently update or replace an earlier saved
case.

## 14. Atomic save boundary

Immediately before persistence, revalidate:

- the confirmed comparison request;
- current source documents;
- source provenance;
- ordered claim identity; and
- the typed save candidate.

The complete next persisted workspace must be built before writing. The local
workspace write must succeed before React state, selection, or navigation is
changed.

If the request or candidate is stale, malformed, invalidated, substituted, or
incomplete:

- save nothing;
- leave the comparison result visible; and
- show a safe accessible error.

If localStorage fails:

- create no in-memory-only case;
- leave the comparison result visible; and
- report that the case could not be saved locally.

No partial case may be exposed or silently retained.

## 15. Duplicate and idempotency rules

Repeated clicks and repeated save attempts must not create duplicate cases.
Determine equality from canonical meaningful content, including:

- ordered claim identity;
- source document and segment provenance;
- exact source excerpts;
- typed user-confirmed context;
- source/user resolution ledger; and
- exact typed reconciliation result.

Do not deduplicate using opaque comparison-only identity.

The confirmation action must be disabled while a save is in progress. If the
same comparison is already saved, select or open the existing case and announce:

> This comparison is already saved.

## 16. Dedicated read-only case view

The saved case must open in a dedicated Care Fee case view showing:

- neutral title;
- saved date and immutable snapshot explanation;
- neutral state-specific summary;
- **From your records**;
- **You confirmed**;
- **AdminAvenger comparison**;
- blocking reasons where applicable; and
- the existing safety boundary.

The view must not expose generic:

- draft preparation;
- chase controls or dates;
- outcome controls;
- money controls;
- status editing;
- generic evidence-pack controls; or
- generic case evidence semantics.

## 17. Case-list integration

Saved Care Fee cases may appear alongside ordinary cases through a shared,
presentation-only case-list model. The list must clearly identify them as Care
Fee record comparisons and preserve the neutral title and state wording.

`CareFeeComparisonCaseV1` must not be coerced into `AdminCase`, and generic case
creation, opportunity, impact, drafting, outcome, export, or chase derivation
must not run for it.

## 18. Allowed post-save actions

After saving, the milestone may allow only:

- Review saved case;
- Review source excerpts;
- Review user-confirmed context;
- Review comparison and blockers;
- Delete saved case;
- Return to the Care Fee flow; and
- Start a separate comparison.

It must not offer draft, send, contact, chase, outcome, export, money counting,
or silent saved-case mutation.

## 19. Explicit deletion

Deleting a Care Fee case requires clear human confirmation. The confirmation
must identify that the locally saved case and all of its source excerpts,
user-confirmed context, and comparison data will be removed from this browser.

On confirmation, deletion must be atomic and remove the entire
`CareFeeComparisonCaseV1` snapshot. It must leave no orphan source, context,
resolution-ledger, or comparison data. Cancellation must leave the case
unchanged.

## 20. Drafting, export, chase, outcome, and contact non-goals

Drafting is explicitly out of scope. Generic draft generation must not be
activated. A later separately governed **Care Fee Draft Preparation V1** may
support neutral clarification requests only.

Evidence-pack preparation and export are explicitly out of scope. The generic
case exporter must not be reused. A later dedicated Care Fee export requires
its own specification and explicit export confirmation.

The Chase Engine is entirely out of scope. Do not create a chase date, set a
waiting or chasing state, or modify `chaseEngine.ts`.

Outcome recording, external contact, submission, sending, remote processing,
and money accounting are also out of scope.

## 21. Privacy and local-data contract

The confirmation must explain that the selected excerpts, source details,
user-confirmed context, and comparison result will be stored locally in this
browser.

Persist only the necessary validated excerpts and metadata. This milestone must
introduce no:

- logging of case content or sensitive identifiers;
- telemetry;
- hidden upload;
- network transfer; or
- new remote processing.

Browser localStorage is not encrypted and is not isolated from other people who
use the same browser profile. User-facing local-data wording must make the
local-browser boundary understandable without claiming stronger protection.

Existing **Clear local data** behaviour must remove the additive Care Fee case
collection. Existing whole-workspace backup behaviour may include saved Care Fee
cases because it exports local workspace data, but this milestone adds no
dedicated Care Fee export.

## 22. Accessibility and responsive behaviour

The future implementation must satisfy all of the following:

- save, cancel, open, review, and delete are keyboard complete;
- interactive targets are at least 44 by 44 CSS pixels;
- focus moves to the save-confirmation heading;
- Cancel restores focus to the original save trigger;
- save success is announced through a polite, atomic status message;
- save failure is announced as an alert;
- successful save/open moves focus to the saved-case heading;
- source, user-confirmed, and derived regions use semantic headings and remain
  understandable in linear reading order;
- state and provenance distinctions do not rely on colour alone;
- visible focus is retained throughout;
- controls prevent accidental double submission;
- the mobile layout stacks without a wide comparison table;
- no horizontal overflow occurs at 320 px, 360 px, or 390 px; and
- desktop and bottom-navigation clearance remain supported.

## 23. Failure stop conditions

Implementation must stop and return for another human decision rather than
broadening scope if:

- source, user-confirmed, and derived context cannot remain structurally
  separate;
- typed reconciliation would need reconstruction from formatted UI strings;
- generic `AdminCase` or `createAdminCase` would be required;
- generic draft, chase, export, money, or outcome paths would be required;
- persistence cannot be atomic;
- deletion cannot remove the complete snapshot; or
- any remote transmission becomes necessary.

## 24. Approved implementation boundary

This specification approves the following bounded implementation boundary, but
production implementation still requires separate explicit authorisation.

### 24.1 Must add

- `src/lib/careFeeCase.ts`;
- focused Care Fee case domain and storage tests;
- `src/components/CareFeeOptionalCaseSavePanel.tsx`;
- `src/components/CareFeeComparisonCaseView.tsx`;
- focused component tests; and
- focused Home, App, storage, case-list, and reopen/delete integration tests.

### 24.2 Must change during later implementation

- `src/lib/careFeeSafeComparison.ts`, additively for a typed transient save
  candidate only;
- `src/views/HomeView.tsx`, for a sibling optional-save gate;
- `src/App.tsx`, for atomic save, selection, open, and delete handling;
- `src/lib/storage.ts`, for additive `careFeeCases` hydration and sanitisation;
- Cases-list integration; and
- local-data wording only where needed for the explicit disclosure.

### 24.3 May change only with demonstrated need

- shared case-list presentation types;
- shared CSS for a proven focus or responsive-layout defect; and
- backup-summary copy.

### 24.4 Must not change

- `src/lib/financialClaims.ts`;
- `src/lib/financialClaimComparability.ts`;
- `src/lib/financialClaimReconciliation.ts`;
- `src/lib/safeReconciliationResult.ts`;
- Decision-Derived contracts;
- ordinary Front Door behaviour;
- Benefits behaviour;
- generic money-impact logic;
- `src/lib/chaseEngine.ts`;
- generic draft generation;
- generic case export;
- contact or submission behaviour;
- remote or network behaviour; or
- protected material.

## 25. Future test contract

Implementation must begin with focused failing tests and cover:

- no automatic case creation;
- explicit two-step save;
- Cancel creates no case;
- agreement save;
- disagreement save;
- `not_safely_comparable` save;
- source/user/derived structural separation;
- exact typed applicability and difference retention;
- no difference for `not_safely_comparable`;
- no impact entries or savings totals;
- no draft, chase, contact, export, or outcome;
- double-click protection;
- duplicate-save idempotency;
- stale or invalidated comparison rejection;
- malformed save candidate rejection;
- missing or changed provenance rejection;
- atomic localStorage failure;
- old workspace hydration without `careFeeCases`;
- refresh and reopen without recomparison;
- complete confirmed deletion;
- keyboard, focus, live-region, and mobile behaviour; and
- no sensitive logging.

Focused tests must be followed by the existing Care Fee controlled-entry and
Safe Comparison regressions, storage/local-data tests, case-list regressions,
the full serialized suite, lint, build, and `git diff --check`.

## 26. Future browser and manual validation contract

The later implementation must validate:

1. Agreement → decline save.
2. Agreement → save neutral case.
3. Disagreement → save.
4. `not_safely_comparable` → save.
5. Change records before save.
6. Double-click Save.
7. Refresh and reopen.
8. Delete and refresh.
9. Keyboard-only completion.
10. 320 px viewport.
11. 360 px viewport.
12. 390 px viewport.
13. Desktop viewport.
14. No automatic draft, chase, contact, or export.
15. No money counted.
16. No console errors.
17. No sensitive logging.

Manual validation must also confirm focus restoration after Cancel, focus on the
saved-case heading after success, complete deletion after refresh, and clear
linear presentation of source, user-confirmed, and derived content.

## 27. Authorisation boundary

This specification is approved for the bounded implementation described above.
No production implementation has started, and this specification-creation task
does not authorise production or test changes.

The human project owner must separately authorise implementation before any
production file or test is modified for Care Fee Optional Case V1.
