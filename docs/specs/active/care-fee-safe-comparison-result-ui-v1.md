# Care Fee Safe Comparison Result UI V1

## 1. Status and approval

| Field | Value |
|---|---|
| Status | **Approved specification; implementation authorisation not yet granted** |
| Version | v1 |
| Human approval date | **20 August 2026** |
| Approved by | Human project owner |
| Product principle | AI prepares. Humans decide. |
| Implementation authorisation | **Not granted by this specification-only task** |
| Availability | Existing explicit controlled-beta Care Fee journey only |
| Persistence | Session-only; no save boundary is added |

The human project owner accepted the completed read-only specification and
integration review, approved the contract recorded here, and authorised creation
of this standalone specification. The AI assistant records that human decision
as a scribe; it did not approve the specification or authorise implementation.

This specification is the source of truth for the bounded milestone described
below. Production implementation may begin only after separate explicit human
implementation authorisation.

## 2. Purpose and completion point

Take an explicitly confirmed, session-only
`ConfirmedCareFeeComparisonRequestV1` through the already-merged deterministic
Care Fee backend and present a safe, transient, explanation-only result.

```text
ConfirmedCareFeeComparisonRequestV1
-> narrow context-resolution adapter
-> reconcileFinancialClaims(...)
-> composeSafeReconciliationResult(...)
-> dedicated Care Fee presentation model
-> dedicated Care Fee result component
-> explanation only
-> STOP
```

The only permitted backend result states are:

- `agreement`;
- `disagreement`; and
- `not_safely_comparable`.

This milestone does not create a case, save a comparison, or initiate any
downstream action.

## 3. Explicit comparison boundary

Reaching:

> Records ready for comparison

must not execute the backend. The user must make a separate, deliberate choice
equivalent to:

> Compare these records

Before that action, the confirmed request remains transient and no comparison
result exists. The action must be keyboard accessible and must not imply that
the app will save, submit, contact, or decide anything for the user.

## 4. Existing backend ownership

The following existing backend contracts remain authoritative and unchanged:

- `financialClaims.ts`;
- `financialClaimComparability.ts`;
- `financialClaimReconciliation.ts`;
- `safeReconciliationResult.ts`;
- `decisionEngine/types.ts`; and
- `resultViewModel.ts`.

`reconcileFinancialClaims(...)` already owns the call to
`compareFinancialClaims(...)`. The new coordinator must not call the comparator
separately or duplicate its rules.

The UI and its presentation adapter must never independently recompute:

- comparability;
- agreement or disagreement;
- `differenceMinor` or any displayed difference; or
- applicability.

Backend output is authoritative. Any failure to preserve or safely present that
output must fail closed.

## 5. Confirmed-request validation

The exact `ConfirmedCareFeeComparisonRequestV1` produced by the controlled-entry
milestone is the input boundary. It must be validated again when the user starts
comparison.

The request must be rejected if it is malformed, stale, substituted, no longer
matches the active documents, or no longer satisfies the controlled-entry
confirmation contract. Validation must happen before context resolution or any
result presentation.

The original confirmed order is authoritative:

- the first selected claim remains Record 1; and
- the second selected claim remains Record 2.

No sorting by amount, date, document order, or perceived authority is permitted.

## 6. Narrow context-resolution boundary

A narrow, comparison-only resolution boundary may resolve only the context
already authorised by Care Fee Controlled Entry + Claim Confirmation V1:

- same subject;
- same provider;
- Record 1 payer role;
- Record 2 payer role;
- Record 1 payee role; and
- Record 2 payee role.

Resolution must obey all of these rules:

1. Known source values remain unchanged.
2. Known source conflicts remain conflicts and cannot be repaired.
3. Unknown context may be filled only by the corresponding explicit user
   confirmation.
4. A confirmation for one claim or dimension cannot resolve another.
5. Source-derived and user-confirmed values remain semantically distinguishable.
6. Backend comparability remains authoritative after resolution.
7. Confirmation does not establish legal authority, correctness, liability, or
   entitlement.

User confirmation can never supply, replace, repair, convert, or infer:

- amount;
- currency;
- cadence;
- financial concept;
- dates or periods;
- applicability; or
- provenance.

## 7. Comparison-only adapted claims

The adapter may construct ephemeral comparison-only claim values when needed to
pass authorised resolved dimensions to the unchanged backend.

Those adapted values:

- exist only for the current comparison attempt;
- must not mutate the original `FinancialClaim` objects;
- must not be returned or presented as original or extracted source claims;
- must not feed the **From your records** presentation region;
- must preserve genuine source provenance without alteration; and
- must retain an explicit resolution ledger using semantics equivalent to
  `source_derived` and `user_confirmed`.

The adapter must never fabricate or modify:

- `sourceQuote`;
- document identity;
- segment identity;
- page or photo identity;
- review state; or
- source-derived person, provider, payer, or payee identity.

Where confirmed same-subject or same-provider equivalence must be represented
internally, the adapter may assign both comparison-only claims an opaque,
session-only comparison key. Such a key is not an extracted real-world identity,
must not be persisted, and must never appear in the UI, logs, telemetry, or source
evidence.

## 8. Resolution-origin contract

The implementation must retain information equivalent to:

```ts
type CareFeeResolutionOrigin = "source_derived" | "user_confirmed"

type ResolvedCareFeeComparisonDimension<T> = {
  readonly value: T
  readonly recordOrigins: readonly [
    CareFeeResolutionOrigin,
    CareFeeResolutionOrigin,
  ]
}
```

The exact internal type name may vary, but the distinction and per-record origin
must not be lost. The public presentation model must not expose comparison-only
identity keys or adapted claims.

## 9. Deterministic execution sequence

After the explicit **Compare these records** action, the coordinator must:

1. remove any previous result;
2. validate the confirmed request against the current session documents;
3. resolve only authorised unknown context through the narrow adapter;
4. call `reconcileFinancialClaims(...)` once using the comparison-only claims and
   the request's current source documents;
5. pass the exact reconciliation output, comparison-only claims, and current
   documents to `composeSafeReconciliationResult(...)`;
6. stop without a financial conclusion if Safe Result returns `not_composed`;
7. build a dedicated Care Fee presentation model using the successful Safe
   Result, original confirmed request, and resolution ledger; and
8. publish the new result only after every preceding step succeeds.

Any identifiers and timestamp required by the existing Safe Result composition
contract must be opaque and session-only. The existing composer may produce a
transient internal finding-shaped result value, but this milestone must not
create, persist, expose, or begin the lifecycle of a user-visible product finding
or `AdminCase`.

## 10. Safe Result authority

Safe Result is the required boundary for user-facing comparison conclusions.

- Agreement or disagreement comes from the backend.
- An absolute difference comes only from the backend's `differenceMinor`.
- `differenceMinor` must never be recalculated by the adapter, presentation
  model, or component.
- Exact backend applicability must pass through unchanged.
- `not_safely_comparable` is a successful safe outcome, not an internal error.
- `not_composed` is an internal fail-closed condition and must not produce a
  partial result.

Formatting an authorised backend amount for display is presentation work;
performing arithmetic, cadence conversion, currency conversion, period
reconstruction, or applicability inference is not.

## 11. Dedicated presentation model and component

Introduce a narrow Care Fee-specific presentation model and a dedicated Care
Fee result component.

Do not use `ResultCaseSheet` for this milestone. Its case, progress, next-step,
draft/checklist, and money semantics exceed this contract, and it does not
preserve the required Care Fee evidence presentation boundary.

The dedicated component must receive already formatted presentation data. It
must not receive or expose raw claim IDs, document IDs, opaque comparison keys,
backend reason codes, or comparison-only adapted claims.

The model must preserve:

- the exact backend state;
- original Record 1 / Record 2 order;
- original source-record presentation;
- separately identified user-confirmed context;
- backend-provided difference where permitted;
- exact backend applicability;
- user-safe blocking explanations; and
- only the actions permitted by this specification.

## 12. Visual and semantic regions

The result must use four distinct semantic regions in a logical reading order.

### 12.1 From your records

This region contains original source evidence only. It may show:

- Record 1 and Record 2;
- document display name;
- source amount and cadence;
- source-derived applicability where relevant;
- source page, photo, segment, or other location where available;
- source review state; and
- an expandable exact source quote.

The region must be built from the original confirmed request and current source
documents, never from comparison-only adapted claims.

### 12.2 You confirmed

This region contains session-only user-confirmed context only. It must clearly
identify that the information came from the user and not from a source record.

It must never receive a source badge, document attribution, source location, or
source quote.

### 12.3 AdminAvenger comparison

This region contains backend-derived comparison context. It may show:

- agreement or disagreement;
- the backend absolute difference for disagreement only; and
- exact inherited applicability.

It must identify the content as an AdminAvenger comparison and must never attach
fake source provenance.

### 12.4 What to check next

This region contains deterministic blocking explanations for
`not_safely_comparable` and the minimal review or change actions permitted by
this milestone.

## 13. Agreement presentation

Use neutral wording equivalent to:

> These safely comparable amounts agree.

Show:

- Record 1;
- Record 2;
- both source amounts and cadences;
- exact backend applicability;
- original source evidence;
- separately identified user-confirmed context where used; and
- a neutral AdminAvenger-derived explanation.

Agreement must not imply:

- either record is correct or authoritative;
- entitlement or liability;
- legality or approval;
- reimbursement or refund;
- that no refund is due; or
- any wider conclusion outside the exact applicability.

## 14. Disagreement presentation

Use neutral wording equivalent to:

> These safely comparable amounts differ.

Show:

- Record 1 and Record 2 in original confirmed order;
- both source amounts and cadences;
- the backend absolute difference;
- exact backend applicability;
- original source evidence;
- separately identified user-confirmed context where used; and
- an AdminAvenger comparison label.

Disagreement must not infer:

- chronology or old/new ordering;
- which amount is correct or authoritative;
- fault;
- who owes whom;
- overcharge or underpayment;
- refund or reimbursement; or
- any wider conclusion outside the exact applicability.

## 15. Not-safely-comparable presentation

Use repository terminology equivalent to:

> These figures are not safely comparable.

Show:

- both selected original source records;
- deterministic plain-English blocking reasons;
- available validated source facts; and
- what the user may review or change.

This state must never:

- show or calculate a financial difference;
- infer equality;
- convert currency or cadence;
- guess dates or periods;
- reconstruct applicability; or
- make a substantive financial conclusion.

## 16. Blocking-reason contract

The existing Safe Result reconciliation-reason explanations are the authoritative
semantic source. The presentation boundary must map every received reason to
deterministic user-safe text and must preserve backend reason order where that
order is defined.

Ordinary users must not see raw reason codes. Messages may explain:

- what could not be safely established;
- which source or confirmation the user may review;
- whether a different pair may be selected; and
- that the app has stopped without a financial conclusion.

Messages must not introduce financial advice, legal advice, correctness,
liability, entitlement, overcharge, or reimbursement conclusions. The component
renders mapped messages and must not contain its own comparability rules.

## 17. Allowed actions after a result

The result may provide only:

- **Change records**;
- **Choose a different pair**;
- **Review source evidence**;
- **Back to documents**; and
- **Start over**.

An action may be omitted when it would duplicate an existing accessible control,
but no broader action may be substituted.

The result must not offer:

- Save as case;
- Draft a letter;
- Chase;
- Contact organisation;
- Submit;
- Export evidence;
- Record an outcome; or
- Mark money recovered or saved.

## 18. Transient lifecycle and invalidation

The confirmed request, resolution data, comparison-only claims, backend output,
and presentation result remain in memory for the active session only.

Any material input change must immediately remove the old result and prevent it
from being displayed against changed evidence. Invalidation is required for:

- Record 1 change;
- Record 2 change;
- confirmed subject or provider context change;
- confirmed payer or payee context change for either record;
- document addition;
- document removal;
- document replacement;
- OCR or source review-state change;
- **Change records**;
- flow exit;
- **Start over**;
- substituted or stale runtime data; and
- every new comparison attempt.

The previous result must be cleared before a new attempt starts. A replacement
may be published only after complete safe composition and presentation mapping
succeed. A page refresh naturally clears all milestone state.

Filenames alone are not sufficient evidence that a document or request remains
unchanged.

## 19. Fail-closed error UX

Internal failure must never leave a previous or partial financial conclusion
visible. The implementation must remove any old result before showing one of the
following messages or approved equivalent wording.

| Failure | User-safe message |
|---|---|
| Invalid, stale, or substituted request | These records changed or could not be verified. Review and confirm them again. |
| Context-resolution failure or contradiction | The confirmed context no longer matches these records. Review the pair again. |
| Missing or changed source; provenance mismatch | A source record changed or needs review. No comparison result is shown. |
| Safe Result returns `not_composed` | The comparison could not be safely matched to the selected records. No result is shown. |
| Unsafe amount or cadence formatting | The amount or payment period could not be displayed safely. |
| Unexpected internal failure | AdminAvenger could not complete this comparison safely. No result has been shown. |

`not_safely_comparable` must use the valid result presentation in section 15,
not this internal-error treatment.

## 20. Accessibility and responsive layout

The implementation must meet all of these acceptance criteria:

- focus moves to the result heading after a comparison completes;
- an appropriate live region announces the result state;
- source, user-confirmed, comparison, and next-check content use semantic
  headings and regions;
- warnings and state distinctions are not colour-only;
- expandable source passages expose correct `aria-expanded` state;
- amount, currency, cadence, and period content is understandable in linear
  reading order;
- the complete journey is keyboard operable;
- focus is always visible;
- the mobile layout stacks without relying on a wide comparison table;
- no horizontal overflow occurs;
- 320 px, 360 px, and 390 px viewports are supported;
- desktop layout is supported; and
- bottom-navigation clearance is preserved.

## 21. Security and privacy

All processing introduced by this milestone remains local and transient. The
milestone must introduce no:

- automatic persistence;
- hidden upload or network call;
- source evidence, quotation, or sensitive identifier logging;
- sensitive telemetry;
- unnecessary claim or document identifiers in the UI;
- automatic case or user-visible finding creation; or
- downstream action.

No new dependency should be required. Opaque session-only identifiers required
by an unchanged internal composition contract must not become persistent product
identities or leave the local transient boundary.

## 22. Expected implementation boundary

### 22.1 Must add

- `docs/specs/active/care-fee-safe-comparison-result-ui-v1.md`;
- `src/lib/careFeeSafeComparison.ts`;
- `src/lib/__tests__/careFeeSafeComparison.test.ts`;
- `src/components/CareFeeSafeComparisonResultPanel.tsx`;
- `src/components/__tests__/CareFeeSafeComparisonResultPanel.test.tsx`; and
- `src/views/__tests__/HomeViewCareFeeSafeComparisonResult.test.tsx`.

The specification itself is added by the specification-only task. All
production and test additions require later implementation authorisation.

### 22.2 Must change during later implementation

- `src/components/CareFeeClaimConfirmationPanel.tsx`;
- its focused test;
- `src/views/HomeView.tsx`; and
- its focused Care Fee integration test.

The confirmation boundary must enable the parent integration to hold the
confirmed request and invalidate any result when confirmation becomes stale.
The parent integration owns the explicit compare action and transient result
lifecycle.

### 22.3 May change only with demonstrated need

- `src/lib/careFeeClaimConfirmation.ts`;
- its tests; and
- shared CSS for a proven focus or responsive-layout defect.

### 22.4 Must not change

- `src/lib/financialClaims.ts`;
- `src/lib/financialClaimComparability.ts`;
- `src/lib/financialClaimReconciliation.ts`;
- `src/lib/safeReconciliationResult.ts`;
- `src/lib/decisionEngine/types.ts`;
- `src/lib/resultViewModel.ts`;
- `src/components/ResultCaseSheet.tsx`;
- generic case, save, draft, chase, export, or money systems;
- Benefits behavior;
- Wales or public-scope behavior; or
- protected paths and materials.

## 23. Focused validation contract

### 23.1 Adapter and domain tests

Cover:

- agreement;
- disagreement;
- `not_safely_comparable`;
- authorised user-confirmed context resolution;
- known source conflict cannot be repaired;
- stale or substituted claims are rejected;
- original claims and provenance remain unchanged;
- no provenance laundering;
- exact applicability is preserved;
- `differenceMinor` is passed through rather than recomputed;
- reconciliation owns comparability; and
- no case, persistence, network, or downstream action occurs.

### 23.2 Component tests

Cover:

- agreement wording;
- disagreement wording;
- not-safely-comparable wording;
- source, user-confirmed, and derived separation;
- backend absolute-difference label;
- exact applicability;
- deterministic plain-English blocking messages;
- no raw reason codes, comparison keys, or internal IDs;
- no prohibited correctness, liability, entitlement, overcharge, refund, or
  reimbursement language;
- source-disclosure accessibility; and
- only permitted actions.

### 23.3 HomeView and lifecycle tests

Cover:

- reaching **Records ready for comparison** does not execute the backend;
- explicit **Compare these records** execution;
- result focus and announcement;
- pair change invalidation;
- context change invalidation;
- document addition, removal, and replacement invalidation;
- OCR/review-state invalidation;
- start over and exit;
- a new attempt clears the previous result first;
- every internal failure removes previous or partial results;
- no persistence across refresh; and
- no generic case or finding lifecycle begins.

## 24. Regression and build validation

Later implementation validation must include:

- complete Care Fee backend regressions;
- Controlled Entry + Claim Confirmation regressions;
- Front Door regressions;
- ordinary analysis regressions;
- Wales care-support regressions;
- security and public-scope regressions;
- proof that no generic case is created;
- the full serialized test suite;
- lint;
- production build; and
- `git diff --check`.

Any existing unrelated failure must be distinguished from a regression caused
by this milestone and reported without weakening the validation requirement.

## 25. Browser and manual validation

Later browser/manual validation must cover:

1. Agreement.
2. Disagreement.
3. Not safely comparable.
4. Recurring overlap.
5. Exact invoice period.
6. Invoice-period mismatch.
7. User-confirmed same subject/provider safely enables the backend gate.
8. A known source conflict remains blocked.
9. Review-required evidence cannot reach a result.
10. Changing the pair removes the old result.
11. Removing a document removes the old result.
12. No automatic case, save, draft, chase, contact, submission, or export.
13. Keyboard-only completion.
14. 320 px viewport.
15. 360 px viewport.
16. 390 px viewport.
17. Desktop layout.
18. No console errors.
19. No source evidence or sensitive identifiers in console output or telemetry.
20. No stale result after any material change or internal failure.

## 26. Completion boundary

If the later implementation passes all focused, regression, build, browser,
accessibility, safety, and privacy validation:

| Question | Answer |
|---|---|
| Care Fee comparison journey usable end-to-end for controlled-beta explanation only | **YES** |
| Full Care Fee product complete | **NO** |

The next planned product milestone remains:

> CARE FEE OPTIONAL CASE + PREPARATION V1

Wider release still requires appropriate accessibility, domain/safety, privacy,
and controlled-release review.

## 27. Non-goals and explicit prohibitions

This milestone must not introduce or perform:

- persistence;
- case creation;
- a user-visible or persisted finding lifecycle;
- drafts;
- chasing;
- contact with an organisation or person;
- submission;
- evidence export;
- outcome recording;
- recovered-money counting;
- money-saved counting;
- correctness conclusions;
- liability conclusions;
- entitlement conclusions;
- overcharge or underpayment conclusions;
- refund or reimbursement conclusions;
- policy interpretation;
- legal advice;
- fabricated provenance;
- currency or cadence conversion;
- date, period, or applicability reconstruction; or
- expansion beyond the existing controlled-beta Care Fee entry boundary.

The presence of an internal transient finding-shaped value produced by the
unchanged Safe Result composer does not authorise case/finding creation,
persistence, user-facing finding controls, or any later product workflow.

## 28. Human-control invariant

AdminAvenger prepares a bounded explanation from the two records the user chose.
The user decides whether to review different records or take any later action.

The milestone must never describe its comparison as a decision about what is
owed, correct, lawful, recoverable, or actionable.
