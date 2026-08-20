# Care Fee Controlled Entry + Claim Confirmation V1

## 1. Status and approval

| Field | Value |
|---|---|
| Status | **Approved for the bounded implementation specified here** |
| Version | v1 |
| Human approval date | **20 August 2026** |
| Approved by | Human project owner |
| Product principle | AI prepares. Humans decide. |
| Implementation authorisation | **Granted by the human project owner on 20 August 2026 for this bounded milestone only** |
| Availability | Explicit controlled-beta entry only |
| Persistence | Session-only; no save boundary is added |

The human project owner approved the specification established by the completed
read-only review dated 20 August 2026, authorised it to be recorded at this
path, and later gave separate explicit implementation authorisation for this
bounded milestone. The AI assistant records those decisions as a scribe; it did
not approve the specification or authorise implementation.

This specification is the source of truth for the bounded milestone described
below. Production implementation may begin only after a separate explicit human
implementation authorisation.

## 2. Purpose and outcome

Create the smallest safe bridge from user-provided Care Fee records to a
transient, explicitly confirmed pair of existing `FinancialClaim` values.

```text
explicit controlled entry
-> local source records
-> source-grounded candidate claims
-> user reviews candidates
-> user confirms only permitted missing context
-> user explicitly confirms two neutral records
-> Records ready for comparison
-> STOP
```

The milestone ends at:

> Records ready for comparison.

It does not call the Care Fee comparison backend, perform reconciliation or
present a financial result.

## 3. Controlled availability and entry

V1 uses explicit controlled-beta entry only. The user must deliberately choose:

> Compare care-fee records

The workflow must not launch automatically because:

- the word "care" appears;
- one unexplained amount exists;
- the user alleges an overcharge;
- ordinary carer-support material is present;
- CHC, FNC or Benefits wording is present; or
- weak contextual evidence is present.

No contextual or keyword-triggered offer is authorised in V1. Public users for
whom controlled features are unavailable must see no Care Fee entry or change to
the ordinary Check a message journey.

## 4. Precedence

The following existing boundaries remain stronger than Care Fee entry:

1. Terms and existing public-scope availability;
2. security;
3. urgency and safeguarding;
4. document-intake validity;
5. OCR and source review; and
6. explicit Care Fee preparation.

Care Fee preparation must fail closed or return control to the existing
higher-priority boundary. It must not copy, weaken or bypass those authorities.
It must not use generic case creation to implement a preflight or a Care Fee
state.

## 5. Source-document intake

The controlled journey may accept up to three local source records through the
existing local-first intake capabilities.

- Original file bytes remain local and are not persisted by this milestone.
- `SourceDocument` identity, order, extraction method, warnings, review state and
  available segment/page/photo identity remain authoritative.
- Candidate claims retain genuine source provenance.
- Failed, unavailable, review-required, ambiguous and rejected material remains
  visible and contributes no selectable trusted claim.
- Changing, removing or replacing any source record invalidates all derived
  candidates, tentative pair state, user-confirmed context and final transient
  output.

The milestone must not parse compatibility headings from combined
`AdminItem.rawText` as document identity. It consumes the structured local
`SourceDocument` values.

## 6. Candidate-claim contract

The merged `FinancialClaim` contract is reused unchanged. This milestone may add
only a narrow presentation model equivalent to:

```ts
type CareFeeClaimSourceView = {
  readonly sourceDocumentId: string
  /** Presentation metadata only; never a stable provenance identity. */
  readonly sourceDocumentName: string
  readonly sourceSegmentId?: string
  readonly pageNumber?: number
  readonly photoNumber?: number
  readonly sourceQuote: string
  readonly reviewState: SourceReviewState
}

type CareFeeClaimCandidate =
  | {
      readonly status: "selectable"
      readonly candidateId: string
      readonly claim: FinancialClaim
      readonly source: CareFeeClaimSourceView
    }
  | {
      readonly status: "blocked"
      readonly candidateId: string
      readonly source: CareFeeClaimSourceView
      readonly reason: FinancialClaimExtractionRejectionReason
    }
```

Each candidate presentation must make available:

- source document and display name;
- page, photo or segment where available;
- amount and currency;
- cadence;
- financial concept;
- period or effective date where present;
- subject and provider state;
- payer and payee state;
- exact supporting quote; and
- source review or rejection status.

A blocked candidate remains visible with a deterministic plain-English reason,
but it is never selectable. Ambiguous and rejected candidates must not silently
disappear. Unknown values remain unknown and are never displayed as zero.

## 7. Source facts and user-confirmed context

Source-derived facts and user-confirmed context must remain structurally
separate.

```text
FinancialClaim + SourceProvenance    -> From the document
UserConfirmedCareFeeContext          -> You confirmed
```

The implementation must not:

- fabricate a source quote;
- fabricate document, segment, page or photo identity;
- alter a source review state to represent user confirmation;
- clone a `FinancialClaim` and silently replace unknown source fields;
- present a document display name as stable provenance identity; or
- allow user confirmation to repair unsupported or contradictory source
  evidence.

The interface must visibly distinguish "From the document" from "You
confirmed" wherever both are shown.

## 8. User-confirmed context contract

V1 may introduce a narrow session-only contract equivalent to:

```ts
type CareFeeClaimIdPair = readonly [string, string]

type UserConfirmedCareFeeContext =
  | {
      readonly kind: "user_confirmed_context"
      readonly dimension: "same_subject" | "same_provider"
      readonly appliesToClaimIds: CareFeeClaimIdPair
      readonly answer: "yes"
    }
  | {
      readonly kind: "user_confirmed_context"
      readonly dimension: "payer_role" | "payee_role"
      readonly appliesToClaimIds: readonly [string]
      readonly value: Exclude<CareFeePartyRole, "unknown">
    }
```

The contract may record only:

- that the selected claims concern the same subject;
- that the selected claims concern the same provider;
- the payer role for a specific selected claim; and
- the payee role for a specific selected claim.

Rules:

- Every confirmation applies only to its specified selected claim or pair.
- Known source-derived values cannot be overwritten.
- A known source conflict cannot be repaired through confirmation.
- Empty, malformed, duplicate, contradictory or out-of-scope confirmation
  fails closed.
- "No", "not sure" or a declined answer produces no accepted contextual
  assertion and cannot produce a final request while required context remains
  unresolved.
- Relationship wording such as "my mother", "my husband" or "I help them" does
  not establish formal authority, identity equivalence or a party role.
- Amount, currency, cadence, concept, dates and periods remain source facts.
  They cannot be supplied, repaired or overridden through this context.
- User-confirmed context is transient and must not be saved, logged, exported or
  converted into source provenance by this milestone.

## 9. Deterministic pair suggestion

The app may suggest a starting pair. A suggestion narrows plausible choices; it
does not establish comparability and does not select the final pair.

The suggestion algorithm must:

1. consider selectable, distinct claims only;
2. exclude `other_unknown_amount`;
3. require the same explicit financial concept;
4. exclude known currency, cadence, subject, provider, payer or payee conflicts;
5. treat unknown values as unknown rather than matches;
6. prefer claims from different source documents;
7. avoid ranking by amount equality, amount size, upload recency or the user's
   allegation;
8. avoid calculating period overlap or recreating Phase 3 comparability;
9. use a stable tie-break based on source-document order, source-segment order
   and claim ID; and
10. leave every other selectable pair available as an alternative.

The suggested pair must be labelled "Suggested starting pair" and state clearly
that it has not been checked for safe comparability. Only the later existing
backend gate may establish comparability.

## 10. Claim-confirmation journey

The intended journey is:

```text
Attach records
-> review all candidate cards
-> choose a tentative pair
-> answer only necessary missing-context questions
-> review Record 1 and Record 2
-> explicitly select Confirm these two records
-> show Records ready for comparison
-> STOP
```

The tentative pair is not the final pair. The final pair exists only after the
explicit "Confirm these two records" action.

Candidate presentation requirements:

- document identity and review status remain visible when a supporting passage
  is collapsed;
- suggested and alternative pairs expose the same material claim details;
- blocked candidates appear separately and cannot be selected;
- only required context questions are asked; and
- the journey never uses agreement, disagreement, difference, correctness,
  liability, entitlement, overcharge or reimbursement language.

## 11. Neutral ordering

The selected values are labelled only:

- Record 1
- Record 2

Order is stable presentation and backend input identity. It must not imply:

- old or new;
- correct or incorrect;
- charged or expected;
- council or user;
- earlier or later; or
- preferred or challenged.

The exact ordered claim IDs pass through unchanged. Source-document order may be
used for deterministic presentation, but it must never be treated as chronology,
currentness or applicability.

## 12. Transient output

The milestone may produce a validated session-only contract equivalent to:

```ts
type ConfirmedCareFeeComparisonRequestV1 = {
  readonly kind: "care_fee_comparison_request"
  readonly version: 1
  readonly claimIds: CareFeeClaimIdPair
  readonly claims: readonly [FinancialClaim, FinancialClaim]
  readonly sourceDocuments: readonly SourceDocument[]
  readonly userConfirmedContext: readonly UserConfirmedCareFeeContext[]
  readonly confirmation: {
    readonly kind: "explicit_pair_confirmation"
    readonly state: "confirmed"
    readonly claimIds: CareFeeClaimIdPair
  }
}
```

Runtime validation must:

- accept an object with the exact approved fields only;
- require exactly two distinct claims;
- require `claimIds`, `claims` and confirmation identity to agree in exact order;
- revalidate both runtime `FinancialClaim` values and their genuine provenance;
- include only the unique `SourceDocument` values referenced by the two claims;
- require every context assertion to apply only to an included claim or the
  exact included pair;
- reject context that contradicts known source-derived values;
- reject unresolved required subject, provider, payer or payee context;
- reject malformed, duplicate or substituted claim/document identity;
- reject outcome-like or arithmetic fields; and
- return an explicit validation failure without guessing or repair.

Validation must not call comparison, perform arithmetic, perform reconciliation
or produce a financial conclusion. The object is discarded when the user exits,
changes source documents or ends the browser session.

## 13. Failure states

Every failure remains visible and fails closed.

| State | Required behaviour |
|---|---|
| One usable claim | Show it and all blocked candidates; request another record; produce no request |
| No usable claims | Show source-document states and rejection reasons; produce no request |
| Malformed claim | Show a blocked candidate; do not repair it |
| OCR review required | Preserve document identity and passage; disable selection; retain the existing review route |
| Unsupported or ambiguous quote | Show the provenance failure; do not replace the quote or source |
| Unknown subject or provider | Require explicit permitted pair-scoped confirmation |
| Unknown payer or payee | Require exact permitted claim-scoped role confirmation |
| Missing applicability | Preserve it as missing; do not invite the user to invent a date or period |
| Multiple plausible candidates | Show each candidate separately; make no automatic final choice |
| Duplicate claim | Exclude the pair and reject any transient request containing it |
| User declines or is unsure | Produce no request; preserve a safe route back to candidate review |
| User changes documents | Clear every stale candidate, pair, context and output state atomically |
| Known contradictory context | Make the pair unavailable; user confirmation cannot override source facts |

No fallback may guess a missing value merely to make a pair valid.

## 14. Accessibility contract

The implementation must satisfy all of the following:

- one major decision per screen;
- a keyboard-complete journey;
- semantic fieldsets and visible legends for grouped choices;
- focus moves to the new heading or legend after each transition;
- all interactive targets are at least 44 by 44 CSS pixels;
- selected, blocked, review-required and rejected states are not conveyed by
  colour alone;
- supporting-passage controls expose `aria-expanded`;
- document identity and review status remain visible outside collapsed content;
- status changes use appropriate accessible announcements;
- visible focus indicators remain present;
- no horizontal overflow;
- existing mobile-navigation focus/scroll clearance remains effective;
- manual acceptance at 320px, 360px and 390px widths; and
- changing documents clears stale confirmation state for keyboard and assistive
  technology users as well as visually.

## 15. Approved implementation boundary

After separate implementation authorisation, the bounded milestone is expected
to add or change only:

- `docs/specs/active/care-fee-controlled-entry-claim-confirmation-v1.md`;
- `src/lib/careFeeClaimConfirmation.ts`;
- `src/lib/__tests__/careFeeClaimConfirmation.test.ts`;
- `src/components/CareFeeClaimConfirmationPanel.tsx`;
- `src/components/__tests__/CareFeeClaimConfirmationPanel.test.tsx`;
- `src/views/HomeView.tsx`; and
- `src/views/__tests__/HomeViewCareFeeControlledEntry.test.tsx`.

Only focused evidence may justify changes to:

- `src/components/DocumentAttachmentArea.tsx` and its focused tests, for
  care-specific maximum-count or helper presentation;
- `src/lib/publicScopePolicy.ts`, for a narrow additive feature-specific
  availability helper that preserves existing behaviour; or
- `src/index.css`, for a demonstrated mobile or focus defect.

No other production boundary is approved.

## 16. Protected existing behaviour

This milestone must not modify:

- `src/lib/financialClaims.ts`;
- `src/lib/financialClaimComparability.ts`;
- `src/lib/financialClaimReconciliation.ts`;
- `src/lib/safeReconciliationResult.ts`;
- `src/lib/decisionEngine/types.ts`;
- `src/lib/resultViewModel.ts`;
- generic case creation;
- Benefits behaviour;
- drafts, chasing, export or money-counting systems; or
- ordinary message, Wales care-support or other background product journeys
  except for the explicitly controlled entry surface authorised here.

These areas require a later, separately approved milestone if any change proves
necessary.

## 17. Explicit non-goals

This milestone does not:

- call the Care Fee comparison backend;
- display agreement or disagreement;
- calculate or display a difference;
- perform reconciliation;
- create an `AdminFinding` or `ResultViewModel`;
- create or persist an `AdminCase`;
- save source records, a request or a result;
- create a draft;
- start or schedule a chase;
- contact anyone;
- submit anything;
- export evidence;
- record an outcome;
- count money as saved, recovered or owed;
- add contextual or automatic triggering;
- interpret law, policy, eligibility, entitlement, liability or correctness;
- infer overcharge or reimbursement; or
- represent user confirmation as source provenance.

## 18. Test-first verification contract

Implementation must begin with focused failing tests for:

- controlled feature unavailable and available states;
- explicit entry and safe exit;
- weak care wording and one document not auto-launching the journey;
- security, urgency, safeguarding, public-scope, intake and OCR precedence;
- the three-record maximum;
- source candidate presentation and exact passage identity;
- review-required, rejected, ambiguous and failed candidates remaining visible;
- unknown subject/provider and claim-scoped payer/payee confirmation;
- user context never entering source provenance;
- source-known conflicts resisting user override;
- deterministic suggestions, alternatives and stable tie-breaking;
- explicit final pair confirmation and exact ordered claim IDs;
- duplicate, malformed, contradictory and out-of-scope confirmation rejection;
- document changes clearing stale state;
- exact transient-object validation;
- no backend comparison, arithmetic, reconciliation or financial result;
- no case, save, draft, chase, export, contact, outcome or money side effect;
- keyboard and focus behaviour;
- disclosure semantics and non-colour status; and
- mobile behaviour at the approved widths.

Focused tests must be followed by the existing front-door, document-intake, OCR,
Wales care-path, Financial Claim and provenance regressions, then the full
serialized suite, lint, build and `git diff --check`.

## 19. Stop conditions

Implementation must stop and return for a further human decision if:

- the existing `FinancialClaim` contract cannot remain unchanged;
- user-confirmed context cannot remain structurally separate from source
  provenance;
- any protected backend or generic case path would need modification;
- security, urgency, safeguarding, public-scope, document-intake or OCR-review
  precedence would need weakening;
- the transient output would need comparison or result fields;
- a contextual or automatic trigger would be required;
- any data would need persistence, transmission or export;
- the journey cannot stop at "Records ready for comparison"; or
- any production or test file outside the approved boundary would need change.

The next separately approved milestone may define how a validated transient
request reaches the completed backend while retaining source-versus-user context
separation. This specification does not authorise that adapter or call.
