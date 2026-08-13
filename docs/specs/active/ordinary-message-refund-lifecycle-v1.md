# Ordinary Message Refund Lifecycle V1

## Status

| Field | Value |
| --- | --- |
| Workstream | `ordinary-message-refund-lifecycle-v1` |
| Status | **Approved — implementation and finalisation authorised; not committed or published** |
| Approval authority | Explicit human project-owner approval dated 13 August 2026 |
| Implementation relationship | The bounded implementation and behavioural tests already exist as uncommitted working-tree changes. This specification does not claim that they are committed, merged, published, or finally validated. |
| Product principle | **AI prepares. Humans decide.** |

The human project owner has explicitly approved this specification and
authorised the existing bounded implementation for finalisation. The
specification and implementation remain uncommitted and unpublished. Staging,
committing, pushing, merging, or publication still requires separate human
authorisation.

## 1. Outcome

Interpret source-grounded refund wording accurately enough to distinguish a
refund that the source says has actually completed from one that is merely
requested, promised, approved, issued, processing, expected, refused, or
otherwise unresolved.

This is evidence interpretation only. It does not establish eligibility,
entitlement, correctness, liability, settlement timing, or a recoverable amount.
It does not take action for the user.

```text
source wording
→ deterministic refund lifecycle assessment
→ cautious completed or non-completed result
→ human remains in control
```

## 2. Problem

The existing refund lifecycle recognised only a narrow set of receipt wording,
principally `received` and `reached`. Sources that clearly used equivalent
completed wording such as `arrived`, `complete`, `credited`, or `back in your
account` could therefore remain in a non-completed journey and be offered chase
or complaint actions after the source said the refund had arrived.

The correction must not turn general positive refund language into receipt.
Completion requires affirmative source wording that establishes actual receipt,
return, credit, deposit, or an equivalent completed destination. Intention,
authorisation, initiation, progress, or an expected future arrival is not
completion.

## 3. Existing architecture

The workstream extends the existing `RefundStage` assessment. It does not create
a parallel refund model, provenance system, routing engine, or money tracker.

The existing stages remain:

```text
requested
promised
approved
issued
received
refused
possible
unknown
```

This V1 broadens only the source-grounded vocabulary that may establish
`received` and calibrates the existing completed result. It does not require
every pending phrase to receive a new or more specific stage. For acceptance,
pending and negative controls must not become `received`.

## 4. Lifecycle contract

| Source meaning | Required lifecycle treatment | Must not happen |
| --- | --- | --- |
| Explicitly received, arrived, returned, credited, deposited, or otherwise completed at the destination | `received` | Chase, complaint, pending-recovery, or automatic money counting |
| Approved, authorised, or accepted | Not `received` | Treat approval as proof of arrival |
| Issued, sent, initiated, or released without proof of destination receipt | Not `received` | Treat provider initiation as user receipt |
| Processing, queued, or scheduled | Not `received` | Treat progress as completion |
| Expected, due within a period, may take time, or on its way | Not `received` | Treat future wording as present completion |
| Refused, declined, rejected, turned down, denied, or cancelled | Not `received` unless the source expressly and unambiguously establishes a later superseding completed state | Let an adjacent positive token silently override the negative state |
| Negated receipt or arrival | Not `received` | Match the positive word inside the negated clause |
| Store credit, credit note, compensation request, or cashback possibility | Not a completed cash/card/bank refund | Treat another value form as received money |

## 5. Received/completed semantics

### 5.1 General rule

`received` is permitted only when the source affirmatively establishes completed
receipt or return. The relevant wording must appear in the supplied source text
and must not be negated, denied by a `no refund` construction, conditional,
future-facing, or part of an unresolved contradictory lifecycle statement.

The current implementation and tests support these behavioural classes:

- the refund `arrived`, `has arrived`, `has been received`, or `reached` the
  account;
- the refund is explicitly `successful` or `complete`;
- the refund has been, was, or is now `paid`, `credited`, or `deposited`;
- the provider says it paid the refund;
- the provider says it sent the refund **to the bank account**, which supplies
  an explicit completed destination rather than the generic initiation phrase
  `refund sent`;
- the refund was returned to the original payment method;
- the refund is back in the bank account or is showing in the account;
- the money has been returned, including `returned successfully`;
- the amount has been refunded, including explicitly to the card;
- a processed refund is accompanied by the explicit fact that the money is now
  in the account;
- the existing sentence-scoped `refund received` and `refund reached` forms.

Representative supported examples include:

```text
Your refund has arrived.
Refund received.
Refund successful.
Refund complete.
Your refund has been paid.
We've paid your refund.
We've sent the refund to your bank account.
The refund has reached your account.
The refund is back in your bank account.
The money has been returned.
The refund has been credited.
The refund has been returned to your original payment method.
The amount has been refunded to your card.
We've processed your refund and the money is now in your account.
Refund deposited.
Refund now showing in your account.
```

This is a bounded behavioural class, not permission to treat any occurrence of
`paid`, `sent`, `processed`, `returned`, or another positive word as a refund.
The wording, its refund context, its destination context where required, and its
negation state all matter.

### 5.2 Completed result

When `received` is established, the existing composed result must:

- use the completed title `Refund confirmed as received`;
- use a calm evidence-checklist action rather than a complaint draft;
- preserve an extracted amount and reference when present;
- remove pending-recovery and chase copy;
- offer no complaint or chase draft for the completed state;
- tell the user that they may keep the confirmation and check their own bank or
  card statement if they want independent confirmation;
- take no automatic action.

## 6. Pending and incomplete controls

The following tested classes must not become `received` without separate,
explicit completion wording:

```text
approved
authorised
accepted
initiated
requested
processing / being processed
sent
on its way
should arrive
within a stated future period
expected
may take a stated period
released
scheduled
queued
money is on its way
```

`Refund has been sent` is an initiation statement and remains non-completed.
It is intentionally different from the currently supported completed source
construction `We've sent the refund to your bank account`, which identifies the
completed destination.

An approved refund with a live stated window may retain the existing deadline
checklist. A source that says the window has passed and the refund has not
arrived may retain the existing escalation or draft path. This specification
does not redesign those journeys.

## 7. Negation, refusal, and conflicting states

### 7.1 Negation

The existing sentence-scoped negation architecture remains authoritative.
Positive tokens inside constructions such as these must not establish receipt:

```text
The refund has not reached my account.
I have not received the refund.
The refund never arrived.
No refund has been approved.
```

The implementation must continue to guard both verbal negation (`not`, `never`,
`no longer`) and the determiner form `no refund`. Completion patterns must not
bypass those guards.

### 7.2 Negative lifecycle wording

The current parser maps explicit `refused`, `declined`, `rejected`, and `turned
down` refund wording to the existing `refused` stage when no valid later positive
state supersedes it. The current behavioural controls additionally require
`denied` and `cancelled` refund wording not to produce a completed result; this
V1 does not claim that those words have their own typed stage.

A source may describe a real reversal, for example an initial refusal followed
by an expressly current approval. A later state may supersede the earlier state
only when the source itself makes that transition unambiguous. Unresolved or
adjacent contradictory positive and negative wording must fail safe and must not
be strengthened into receipt merely because a completion token is present.

This workstream does not introduce a new generic temporal or contradiction
engine. Exact-boundary validation must confirm the supported mixed-state
behaviour and report any gap rather than silently expanding the implementation.

## 8. Alternative value forms

The currently tested non-cash or adjacent controls are:

```text
credit note
store credit
compensation request under review
cashback possibility
```

They must not produce `Refund confirmed as received` or be treated as proof of a
cash, card, or bank refund. A payment receipt, chargeback review, subscription,
price rise, partial refund under review, or other neighbouring money statement
must likewise not be promoted to completed refund receipt.

This V1 does not create a general taxonomy for vouchers, account credit,
compensation, chargebacks, or other value forms. Those forms remain governed by
their existing architecture and may only affect refund completion if the source
independently contains a supported, unambiguous completed-refund statement.

## 9. Source grounding and evidence integrity

Every completed conclusion must be derived from wording actually present in the
source text.

- Do not infer receipt from positive tone, provider confidence, elapsed time, a
  reference number, or an amount.
- Do not turn a pending or negated phrase into affirmative evidence.
- Do not fabricate a receipt or completion quote.
- Preserve the extracted amount and reference without treating either as proof
  of receipt.
- Reuse the existing extraction, source-support, and result-composition
  architecture. Do not add parallel provenance.
- If the source does not establish completion, preserve the appropriate
  non-completed state or uncertainty.

## 10. Money-recovery and human-control contract

Lifecycle completion and financial tracking remain separate:

```text
source says refund received
→ lifecycle may be `received`
≠ money automatically counted as recovered
```

For the completed result:

- every displayed refund amount remains `countedInMoneyTracker: false`;
- the treatment remains `no_money_counted`;
- no `pending_recovery` impact entry is created for money already described as
  received;
- no saved-so-far, recovered-total, entitlement, liability, or amount-due claim
  is created;
- confirming money remains a separate explicit human action;
- AdminAvenger does not contact, chase, send, save, submit, claim, or apply for
  anything.

## 11. Security and routing precedence

Existing higher-priority risky-message and security handling remains
authoritative. Refund wording must not bypass or weaken it.

A message that combines completed-refund wording with a suspicious link,
passcode request, unsafe payment request, or another existing security trigger
must retain the safety/security result and safety-checklist action. This
workstream does not change routing precedence.

Non-refund payment confirmations and neighbouring ordinary-message journeys must
remain unchanged.

## 12. Acceptance matrix

| Class | Representative input | Required assertion |
| --- | --- | --- |
| Direct receipt | `Refund received.` | Stage is `received`; completed result |
| Arrival | `Your refund has arrived.` | Stage is `received`; no chase or draft |
| Completed state | `Refund successful.` / `Refund complete.` | Stage is `received` |
| Account destination | `The refund is back in your bank account.` | Stage is `received` |
| Original payment method | `The refund has been returned to your original payment method.` | Stage is `received` |
| Amount/card completion | `£68.40 has been refunded.` / `The amount has been refunded to your card.` | Stage is `received`; exact pence preserved |
| Completed processing | `We've processed your refund and the money is now in your account.` | Stage is `received` because destination completion is explicit |
| Pending approval | `Refund approved.` / `Refund authorised.` | Not `received` |
| Pending progress | `Refund processing.` / `Refund scheduled.` / `Refund queued.` | Not `received` |
| Generic initiation | `Refund has been sent.` / `Refund released today.` | Not `received` |
| Future arrival | `Refund is on its way.` / `Refund expected within 10 working days.` | Not `received` |
| Negated receipt | `I have not received the refund.` / `The refund never arrived.` | Not `received`; existing chase semantics may remain |
| Refused/rejected | `We refused the refund.` / `The refund was rejected.` | Not `received`; existing refused semantics remain |
| Denied/cancelled | `Your refund was denied.` / `Your refund was cancelled.` | Not `received`; no claim of a new typed stage |
| Determiner negation | `No refund has been approved.` | Not `received` and not affirmative approval |
| Alternative value | `A credit note has been added.` / `Store credit is available.` | No completed cash-refund result |
| Compensation/cashback | `Compensation is under review.` / `Cashback may be available.` | No completed cash-refund result |
| Non-refund payment | `Your payment has been received.` | Existing non-refund journey unchanged |
| Security precedence | Completed refund plus passcode, suspicious-link, or unsafe-payment wording | Existing security result and safety checklist win |
| Money safety | Completed refund with amount/reference | Amount/reference preserved; no money counted or pending-recovery entry |
| Human control | Any completed result | No automatic contact, send, save, submit, claim, or financial update |

The existing behavioural test file is the primary acceptance surface. A later
boundary review may add a missing assertion only through a separately authorised
test-first change; specification finalisation itself does not modify tests.

## 13. Expected implementation boundary

The currently evidenced implementation boundary is:

```text
src/lib/generalAdminExtraction.ts
src/lib/__tests__/refundReceivedAction.test.ts
```

`generalAdminExtraction.ts` is historically shared, so this list is not blanket
permission to stage the file in the future. The exact commit-boundary review must
reinspect its then-current diff and confirm that every included hunk belongs to
this specification. The current remaining diff is refund-only and does not
require hunk-level staging.

No other currently dirty production, test, specification, product, audit, or
protected path belongs to this workstream.

## 14. Required validation before publication

The implementation already exists, so publication does not require a ceremonial
new red-test cycle. It does require validation of the exact approved boundary:

```text
explicit human approval of this specification
→ exact commit-boundary review
→ focused refund lifecycle and received-action tests
→ adjacent ordinary-message refund and extraction regressions
→ security-precedence regressions
→ money-safety and impact-ledger regressions
→ full serialized test suite
→ lint
→ build
→ git diff --check
→ publication review
```

A narrow browser check is warranted because the contract changes the composed
result a person sees. It should verify only:

1. a clearly completed refund shows the completed title, calm checklist, amount
   and reference, and no complaint/chase action;
2. an approved or sent-but-not-received refund does not show the completed
   result;
3. a negated receipt does not show the completed result;
4. a mixed security/refund message remains on the existing security path;
5. no completed scenario presents money as automatically recovered.

A broad browser matrix is not required for this bounded wording change unless
focused or adjacent validation reveals a wider regression.

## 15. Explicit non-goals

This specification does not authorise:

- refund eligibility, entitlement, consumer-rights, contractual, regulatory, or
  legal conclusions;
- chargeback logic or dispute-resolution workflows;
- statutory, merchant, bank, card-network, or payment-settlement timing rules;
- provider-specific refund rules;
- automatic chase scheduling, complaints, drafts, contact, sending, saving, or
  submission;
- automatic recovered-money or savings tracking;
- generic money-role semantics or entitlement calculations;
- a generic compensation, voucher, store-credit, account-credit, cashback, or
  credit-note taxonomy;
- public-scope urgency evidence changes;
- benefits claimant resolution;
- ordinary-message date-role changes;
- source-provenance foundation changes;
- Care Fee financial claims, comparability, reconciliation, or result work;
- UI redesign;
- product, strategy, roadmap, research, or audit documentation changes;
- new dependencies, persistence, network calls, cloud processing, telemetry, or
  uploads.

## 16. Approval record

1. **Specification approved:** the human project owner explicitly approved this
   specification on 13 August 2026.
2. **Implementation and finalisation authorised:** the approval covers the
   existing bounded, uncommitted implementation and its exact-boundary
   finalisation. It does not claim that the work has been committed, published,
   deployed, or merged.
3. **Publication still separate:** staging, committing, pushing, merging,
   deploying, or publishing requires later explicit human authorisation.
