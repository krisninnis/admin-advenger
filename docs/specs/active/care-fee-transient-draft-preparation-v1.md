# Care Fee Transient Draft Preparation V1

Status: Approved specification

Implementation status: Not implemented; implementation requires separate authorisation

Product principle: AI prepares. Humans decide.

## 1. Purpose

Care Fee Transient Draft Preparation V1 lets a user explicitly prepare a calm,
factual message from a validated, locally saved `CareFeeComparisonCaseV1`.

The milestone stops at editable text and a user-initiated clipboard copy. It does
not send, submit, save, chase, resolve, export, or count anything.

The capability must not silently convert a neutral Care Fee comparison into an
accusation, legal conclusion, entitlement decision, refund demand, or statement
that money is owed.

## 2. Product flow

The complete V1 flow is:

```text
Saved Care Fee case
-> explicit "Prepare a message"
-> choose an allowed purpose
-> review the facts AdminAvenger will use
-> optionally enter a recipient label
-> explicit "Prepare draft"
-> review/edit
-> copy text
-> STOP
```

No draft is created automatically when a comparison completes, when a case is
saved, or when a saved case is reopened.

## 3. Entry and lifecycle boundary

### 3.1 Saved case only

V1 starts only from a `CareFeeComparisonCaseV1` that passes the existing strict
saved-case runtime validator.

V1 must not draft directly from:

- an unsaved comparison;
- a rendered comparison view model;
- arbitrary UI text;
- a generic `AdminCase`;
- an unvalidated local-storage value.

### 3.2 Transient only

The prepared result and all user edits remain in component memory.

V1 must not:

- add a Care Fee draft to the generic `drafts` collection;
- persist a draft with the Care Fee case;
- add a new local-storage schema;
- automatically save edits;
- create revision history;
- create a case timeline event.

Refresh, navigation away from the saved case, or deletion of the saved case may
discard the transient draft. The UI must disclose this before preparation and
beside the editor.

## 4. Dedicated Care Fee path

The implementation must introduce dedicated Care Fee draft request, validation,
normalisation, generation, output, and UI boundaries.

`CareFeeComparisonCaseV1` must not be converted or adapted into `AdminCase`.

The following are not reusable as Care Fee domain or workflow contracts:

- `draftService`;
- `guidedDraftSave`;
- `messageDrafts`;
- `DraftPanel`;
- generic `AdminDraft` persistence;
- generic case drafting, chase, status, impact, outcome, or sent lifecycles.

Low-level clipboard utilities and proven presentation, focus, error, and
accessibility conventions may be reused where they do not import generic case
semantics.

No new dependency is required or permitted by this specification.

## 5. Allowed intents

```ts
type CareFeeDraftIntentV1 =
  | "confirm_or_break_down_figure"
  | "explain_comparison_difference"
  | "clarify_rate_or_period"
  | "request_missing_information";
```

The generator must use an explicit reconciliation-state by intent allowlist. It
must not choose a fallback intent.

### 5.1 Reconciliation-state by intent matrix

| Saved reconciliation state | `confirm_or_break_down_figure` | `explain_comparison_difference` | `clarify_rate_or_period` | `request_missing_information` |
|---|---|---|---|---|
| `agreement` | Allowed: neutral confirmation or breakdown only | Rejected | Allowed: ask about the exact saved rate, period, or effective date | Rejected |
| `disagreement` | Allowed: request a breakdown/review of both figures; never confirm one as correct | Allowed: explain the exact saved absolute difference and ask why the figures differ | Allowed: ask which figure applies and on what stated basis | Rejected |
| `not_safely_comparable` | Rejected | Rejected | Conditionally allowed only for a saved cadence, period, effective-date, recurring/adjustment, or missing-applicability blocker | Conditionally allowed only when at least one valid saved blocker maps to an approved request |

Any other state, intent, state/intent combination, or runtime value must fail
closed without producing partial text.

### 5.2 Agreement rules

Agreement drafting is limited to neutral clarification. It may:

- identify that both records show the same figure;
- ask the organisation to confirm the figure or its basis;
- request a breakdown;
- ask a factual question about the exact saved applicability.

It must not state or imply that:

- either source is correct;
- the whole account is correct;
- no other amount applies;
- nothing further is due;
- the matter is resolved.

### 5.3 Disagreement rules

Disagreement drafting may:

- identify Record 1 and Record 2 in saved claim order;
- state each exact saved source amount and shared cadence;
- state the exact saved applicability;
- state the exact saved absolute difference;
- ask why the figures differ;
- ask which figure applies and on what basis;
- ask for a neutral review or breakdown of both figures.

It must not prefer either figure, label either one correct or incorrect, infer
fault, or turn the difference into a remedy or financial outcome.

### 5.4 Not safely comparable rules

An NSC draft may only state saved blocker-grounded uncertainty and ask for the
specific clarification or information authorised by section 9.

It must not:

- include or calculate a difference;
- guess which figure applies;
- guess a missing cadence, date, period, party, provider, concept, or currency;
- imply either figure is incorrect;
- imply that missing information establishes a claim.

## 6. Prohibited conclusions and language

AdminAvenger-prepared subject and body text must never assert or imply:

- an overcharge;
- an amount owed;
- a refund due;
- that an invoice is incorrect;
- an unlawful charge or contribution;
- reimbursement entitlement;
- liability;
- a payment deadline;
- threatened legal action;
- correctness;
- fault;
- entitlement;
- money at stake;
- recovery;
- savings.

Prevention must be structural, not prompt-only. The implementation must have:

1. dedicated Care Fee types;
2. the state-specific intent allowlist in section 5.1;
3. deterministic, versioned templates;
4. exhaustive reconciliation-state handling;
5. strict runtime validation;
6. prohibited-language and prohibited-interpretation tests;
7. a final output safety guard that rejects the entire prepared result.

The final guard must also verify that:

- every formatted monetary value in prepared text is an exact approved source
  value or the exact saved absolute difference;
- the saved difference is described only as an absolute difference between the
  figures;
- no unresolved template token remains;
- no unapproved state-specific paragraph is present;
- no requested-remedy, deadline, legal, chase, status, or outcome field has
  entered generation.

The guard is defence in depth. It does not replace typed inputs, deterministic
templates, or state-specific generation.

## 7. Provenance model

The drafting boundary must preserve four distinct partitions:

1. `sourceFacts`
2. `userConfirmedFacts`
3. `derivedComparisonFacts`
4. `userEnteredDraftingInputs`

### 7.1 Source facts

Source facts may include only values read from the validated immutable source
snapshots, such as:

- record label and claim ID;
- amount in minor units and currency;
- cadence;
- care-fee concept;
- explicitly stated source period or effective date;
- source document ID and display name;
- source segment or location reference;
- exact source quote and review state.

Source evidence must not be reconstructed from rendered UI text. Exact source
quotes remain available during evidence review but must not be pasted into the
prepared correspondence automatically in V1.

### 7.2 User-confirmed facts

User-confirmed facts may include only the exact typed saved context entries:

- same subject;
- same provider;
- payer role for the specified claim;
- payee role for the specified claim.

They must always retain `user_confirmed` origin. They must not acquire source
document provenance or be described as wording from a source.

"Same provider" establishes sameness only. It does not establish the provider's
name.

### 7.3 Derived comparison facts

Derived comparison facts may include only the exact validated saved
reconciliation and its associated saved metadata:

- reconciliation state;
- ordered claim IDs;
- agreement amount;
- ordered disagreement amounts;
- disagreement `differenceMinor` with `differenceKind: "absolute"`;
- currency and cadence;
- typed applicability;
- NSC reason codes and saved blocking explanations;
- resolution ledger;
- safety boundary.

Derived facts must not receive source-document provenance or be described as
source wording.

### 7.4 User-entered drafting inputs

The only V1 user-entered drafting input outside body/subject editing is the
optional recipient label. Its origin is always:

```text
user_entered_drafting_input
```

It must not update the saved case, resolution ledger, source facts, or
user-confirmed case context.

## 8. Recipient model

The current `providerId` is opaque. It must never be rendered as a recipient or
organisation name.

Recipient identity must not be inferred from:

- `providerId`;
- document filename or display name;
- a `same_provider` confirmation;
- source or claim ordering;
- payer/payee role.

Without a valid optional recipient label, the exact default greeting is:

```text
Hello,
```

With a valid label, the deterministic greeting is `Hello {label},`.

The optional recipient value must have this shape:

```ts
type CareFeeDraftRecipientV1 = {
  readonly label: string;
  readonly origin: "user_entered_drafting_input";
};
```

Recipient validation must:

- require a string when the object is present;
- trim leading and trailing whitespace;
- reject a value empty after trimming;
- allow at most 80 Unicode code points;
- reject carriage returns, line feeds, tabs, and C0/C1 control characters;
- reject an origin other than `user_entered_drafting_input`;
- reject unexpected recipient fields.

The UI field is for a recipient or organisation label only. V1 must not collect,
parse, validate, save, or use email addresses, phone numbers, postal addresses,
or sending channels.

For unknown or conflicting provider information, the system must not prefill a
recipient. It may continue with `Hello,` if the request otherwise validates.

## 9. Deterministic NSC mapping

The mapping below is exhaustive for the approved V1
`ComparabilityReason` union. Generation uses the typed saved reason code and the
approved wording category. It must not derive a request by interpreting arbitrary
blocker prose.

The saved human-readable blocking explanation may be shown in the fact review.
Only the deterministic template wording defined by this mapping may enter the
AdminAvenger-prepared body.

| Saved reason | What may be stated | What may be asked | What must not be inferred |
|---|---|---|---|
| `invalid_claim` | One selected financial detail could not be validated. | Ask for a clearer record showing the figure, what it describes, and when it applies. | Which field is wrong, the correct value, or any difference. |
| `source_review_required` | A selected source detail needs checking against the original record. | Ask for a clear copy or confirmation of the stated figure and context. | That the source is false, altered, or incorrect. |
| `same_claim` | The selected entries appear to refer to the same source claim. | Ask for a separate record or figure if another comparison was intended. | That a second figure exists or differs. |
| `different_concept` | The figures appear to describe different types of charge or contribution. | Ask what each figure represents and which records should be considered together. | That the concepts are equivalent or that either amount is wrong. |
| `missing_concept_context` | One figure does not clearly state what it describes. | Ask what the figure represents and for a breakdown or supporting record. | The missing concept or how it relates to the other figure. |
| `recurring_vs_adjustment` | One figure appears recurring and the other appears to be an adjustment. | Ask for the basis and applicable period of each figure. | That the adjustment should be added, subtracted, refunded, or compared directly. |
| `retrospective_adjustment` | A retrospective adjustment cannot be directly compared with a recurring figure. | Ask which period the adjustment covers and how it relates to the recurring figure. | The arithmetic or financial effect of the adjustment. |
| `missing_adjustment_context` | There is insufficient information about an adjustment. | Ask what the adjustment is for, which period it covers, and how it was calculated. | Whether the adjustment is valid, payable, or refundable. |
| `different_subject` | The records appear to concern different people. | Ask the organisation to identify whom each record concerns and provide the matching records. | That either record belongs to the user or should be transferred. |
| `missing_subject_context` | The records do not establish that they concern the same person. | Ask for confirmation of whom each record concerns. | Identity, sameness, entitlement, or account ownership. |
| `different_provider` | The records appear to concern different providers. | Ask which provider issued or applies to each record and which records should be compared. | A recipient identity, provider error, or provider responsibility. |
| `missing_provider_context` | The records do not establish that they concern the same provider. | Ask for confirmation of the provider associated with each figure. | A provider name from an opaque ID, document name, or ordering. |
| `different_payer_role` | The records identify different payer roles. | Ask who is responsible for each recorded payment or contribution. | Liability, who ought to pay, or that one role is incorrect. |
| `missing_payer_context` | Payer information is missing or unclear. | Ask who the recorded payer is for each figure. | The payer's identity or legal/payment responsibility. |
| `different_payee_role` | The records identify different payee roles. | Ask who receives each recorded payment or contribution. | That either payee is incorrect or must return money. |
| `missing_payee_context` | Payee information is missing or unclear. | Ask who receives each figure or contribution. | The payee's identity, entitlement, or liability. |
| `different_currency` | The figures are stated in different currencies and were not directly compared. | Ask which currency applies to each figure and request matching records if appropriate. | An exchange rate, converted amount, difference, or preferred currency. |
| `missing_currency_context` | Currency information is missing or unclear. | Ask which currency applies to each figure. | A currency from symbols, locale, provider, or surrounding assumptions. |
| `different_cadence` | The figures use different stated payment periods. | Ask which cadence applies and request a breakdown for each period. | A converted rate, normalised amount, or direct difference. |
| `missing_cadence_context` | One source does not clearly state how often its amount applies. | Ask how often the amount applies and for the relevant record or breakdown. | Weekly, monthly, four-weekly, one-off, or invoice-period cadence. |
| `non_overlapping_periods` | The stated periods do not overlap. | Ask which figure applies to which period and whether a record for a common period exists. | A common period, date range, or direct difference. |
| `different_effective_dates` | The figures have different stated effective dates. | Ask which rate applies from each date and why the rate changed. | That either date is wrong, an unstated transition date, or a difference for a common date. |
| `missing_period_context` | Period or effective-date information is missing or unclear. | Ask for the period or effective date for each figure. | Any missing date, overlap, duration, or applicability. |

`clarify_rate_or_period` is allowed for NSC only for these reason codes:

- `recurring_vs_adjustment`;
- `retrospective_adjustment`;
- `missing_adjustment_context`;
- `different_cadence`;
- `missing_cadence_context`;
- `non_overlapping_periods`;
- `different_effective_dates`;
- `missing_period_context`.

`request_missing_information` may use any reason in the table, but only the
corresponding approved request. Multiple reasons may produce a concise combined
request in saved reason order, with duplicate questions removed by an explicit
deterministic mapping rather than free-text synthesis.

If an NSC case has no reasons, contains an unknown reason, has malformed reasons,
or lacks the blocker information required by the saved-case validator, draft
preparation must fail closed.

## 10. Difference handling

For disagreement, the only permitted interpretation is:

```text
absolute difference between the two safely comparable figures
```

The generator must consume `differenceMinor` and `differenceKind: "absolute"`
directly from the validated saved reconciliation. It must not subtract, convert,
normalise, annualise, round, or otherwise recalculate the difference.

The two source figures must remain in the same order as `claimIds` and
`amountsMinor`.

Safe body concept:

> I have two records showing different figures for the same stated applicability.
> Record 1 shows [exact amount and cadence], and Record 2 shows [exact amount and
> cadence]. The absolute difference between the figures is [exact saved
> difference]. Please explain why they differ and confirm which figure applies
> and the basis for it.

The prepared body must not call the difference an amount owed, refund,
overcharge, loss, recovery, saving, or money at stake.

## 11. Applicability handling

The generator must consume the exact saved typed applicability. It supports only:

| Kind | Deterministic wording concept |
|---|---|
| `same_explicit_period` | `for the stated period from {periodStart} to {periodEnd}` |
| `overlapping_explicit_periods` | `for the overlapping stated period from {periodStart} to {periodEnd}` |
| `same_effective_date` | `with the same stated effective date of {effectiveDate}` |

It must not:

- infer missing dates;
- reconstruct applicability from source prose or UI text;
- widen or narrow a period;
- calculate an overlap;
- replace a saved date with a document date;
- re-run comparability or reconciliation.

Date presentation may apply one deterministic display formatter to the exact
saved ISO date value. Formatting must not alter its calendar date or semantic
meaning.

## 12. Request contract

```ts
type CareFeeDraftPreparationRequestV1 = {
  readonly kind: "care_fee_draft_preparation_request";
  readonly version: 1;
  readonly savedCase: CareFeeComparisonCaseV1;
  readonly intent: CareFeeDraftIntentV1;
  readonly recipient?: CareFeeDraftRecipientV1;
};
```

This request contains only:

- the saved case to validate;
- an allowed intent;
- an optional recipient label with fixed origin.

At the untrusted runtime boundary, the request is accepted as `unknown` and must
pass strict validation before it is treated as this type.

Validation must:

- require exact top-level keys for the recipient-present or recipient-absent
  shape;
- require the exact kind and version;
- run the existing strict `CareFeeComparisonCaseV1` validator;
- reject an invalid, unsupported, or deleted case;
- require an exact allowed intent string;
- apply the matrix in section 5.1;
- validate recipient shape and value using section 8;
- reject unexpected nested recipient fields;
- validate the state-specific reconciliation shape;
- validate exact source fact availability and claim ordering;
- validate NSC reasons against section 9;
- reject any money-remedy, requested-outcome, chase, status, send, resolved, or
  legal-conclusion field;
- fail closed on any exception.

No partial or best-effort request is allowed.

## 13. Normalized validated context

Only a normalized validated context may reach deterministic generation:

```ts
type ValidatedCareFeeDraftPreparationContextV1 = {
  readonly kind: "validated_care_fee_draft_preparation_context";
  readonly version: 1;
  readonly caseId: string;
  readonly intent: CareFeeDraftIntentV1;
  readonly sourceFacts: readonly CareFeeDraftSourceFactV1[];
  readonly userConfirmedFacts: readonly CareFeeDraftUserConfirmedFactV1[];
  readonly derivedComparisonFacts: CareFeeDraftDerivedComparisonFactsV1;
  readonly recipient?: CareFeeDraftRecipientV1;
};
```

The normalizer must derive all four partitions from the validated saved case and
the validated optional recipient. It must not accept caller-supplied fact arrays
or rendered prose.

Each fact must carry a typed field identifier, its exact typed value, and enough
stable reference information to establish its saved-case origin. The generator
must select facts through an exhaustive intent template, not by concatenating all
available facts.

## 14. Typed audit references

The V1 audit reference model must distinguish at least:

```ts
type CareFeeDraftSourceFactReferenceV1 = {
  readonly partition: "source_fact";
  readonly recordLabel: "Record 1" | "Record 2";
  readonly claimId: string;
  readonly field: CareFeeDraftSourceFieldV1;
  readonly sourceDocumentId: string;
  readonly sourceSegmentId?: string;
};

type CareFeeDraftUserConfirmedFactReferenceV1 = {
  readonly partition: "user_confirmed_fact";
  readonly contextIndex: number;
  readonly dimension: UserConfirmedCareFeeContext["dimension"];
  readonly appliesToClaimIds: readonly string[];
};

type CareFeeDraftDerivedFactReferenceV1 = {
  readonly partition: "derived_comparison_fact";
  readonly field: CareFeeDraftDerivedFieldV1;
  readonly claimIds: readonly [string, string];
};

type CareFeeDraftUserEnteredInputReferenceV1 = {
  readonly partition: "user_entered_drafting_input";
  readonly field: "recipient_label";
};
```

Reference unions must enumerate the permitted source and derived fields. They
must not accept arbitrary labels or flattened evidence strings.

The audit answers "Why did this draft say that?" for AdminAvenger-prepared text
only. It is not evidence that later user edits are source-grounded.

## 15. Prepared draft contract

```ts
type CareFeePreparedDraftV1 = {
  readonly kind: "care_fee_prepared_draft";
  readonly version: 1;
  readonly id: string;
  readonly caseId: string;
  readonly intent: CareFeeDraftIntentV1;
  readonly recipient?: CareFeeDraftRecipientV1;
  readonly preparedSubject: string;
  readonly preparedBody: string;
  readonly createdAt: string;
  readonly audit: {
    readonly templateVersion: 1;
    readonly sourceFactReferences: readonly CareFeeDraftSourceFactReferenceV1[];
    readonly userConfirmedFactReferences: readonly CareFeeDraftUserConfirmedFactReferenceV1[];
    readonly derivedFactReferences: readonly CareFeeDraftDerivedFactReferenceV1[];
    readonly userEnteredInputReferences: readonly CareFeeDraftUserEnteredInputReferenceV1[];
  };
  readonly safetyBoundary: "preparation_only_no_send_no_claim_conclusion";
};
```

`preparedSubject` and `preparedBody` are the immutable output of deterministic
generation. They must not be overwritten when the user edits the displayed
subject or body.

The prepared contract must not contain:

- `chaseAfterDays`;
- requested refund;
- money impact;
- remedy;
- case status;
- send state;
- resolved state;
- legal conclusion;
- contact channel.

## 16. Template and tone rules

V1 has one fixed tone:

- calm;
- factual;
- neutral;
- concise;
- non-accusatory;
- plain English.

V1 must not offer tone variants.

Each deterministic template contains:

1. subject;
2. greeting;
3. why the user is writing;
4. the minimal approved facts;
5. the state-appropriate clarification, review, breakdown, or information
   request;
6. a request for a response;
7. a neutral sign-off.

Subject and body are required. Recipient label and user name are optional. The
template must not invent an account number, reference, recipient, signatory, or
contact detail.

Source quotes are available for review but are not automatically included in
the subject or body. Quote insertion is not a V1 option.

## 17. Editing model

Users may edit the subject and body freely after preparation.

Component state must keep:

- immutable `preparedSubject`;
- immutable `preparedBody`;
- editable `editedSubject`;
- editable `editedBody`;
- whether the editable values differ from the prepared values.

The typed audit trail explains only `preparedSubject` and `preparedBody`.
User-edited text remains user-authored and must not retrospectively become a
source fact, user-confirmed case fact, or AdminAvenger-derived fact.

Changing an intent or recipient does not silently rewrite a prepared draft.

- If no user edits exist, an explicit `Prepare draft` may replace the transient
  result.
- Repeating the same unchanged request retains the existing transient prepared
  result rather than creating a duplicate.
- If edits exist, re-preparation requires an explicit confirmation that the
  edits will be discarded.
- V1 creates no revisions.

## 18. Copy lifecycle

V1 permits copy-to-clipboard only. It must not provide TXT download or another
export format.

Copy uses the current editable subject and body, not the immutable prepared copy.
It occurs only after an explicit user click.

The exact successful-copy announcement is:

```text
Copied to your clipboard. Nothing has been sent.
```

The announcement must be exposed through a polite live region.

On copy failure:

- show an accessible alert;
- keep the editable subject and body unchanged;
- keep the text selectable for manual copying;
- do not navigate, clear, save, send, or log the text.

The editor must display explicit `Nothing has been sent` wording independently
of the success announcement.

## 19. Send and contact boundary

The following are explicitly out of scope:

- send button;
- email API;
- SMS;
- web-form submission;
- browser automation;
- address lookup;
- automatic contact;
- chase date;
- timeline sent state;
- external recipient resolution.

Preparing, editing, or copying a draft must not mutate case status or create any
external action.

## 20. Privacy

The implementation must provide:

- component-memory-only prepared and edited state;
- no draft or edit content in localStorage;
- no network request;
- no telemetry containing draft, recipient, case, quote, or edited content;
- no sensitive console logging;
- no backup or export;
- refresh/navigation discard behavior;
- clear clipboard disclosure;
- a warning that user edits may add sensitive information.

The implementation must not log raw validation inputs or generated text when a
failure occurs.

## 21. Failure, idempotency, and stale-case behavior

| Condition | Required behavior |
|---|---|
| Invalid saved case | Do not show a draft; show an accessible error and preserve the case-view navigation choices. |
| Malformed request | Reject the complete request; do not generate partial text. |
| Unexpected field | Reject the complete request. |
| Unsupported state/intent | Reject without fallback or coercion. |
| Missing required source fact | Reject without substituting rendered text or another record. |
| NSC without valid blockers | Reject without inventing a clarification request. |
| Unknown provider | Use the generic greeting; do not infer a label. |
| Conflicting provider | Do not prefill or infer a recipient; a generic greeting remains available if the selected intent otherwise validates. |
| Copy failure | Preserve selectable edits and announce the failure. |
| Repeated unchanged preparation | Retain the existing transient result; create no duplicate or revision. |
| Reprepare after edits | Require explicit discard confirmation. |
| Saved case deleted while open | Unmount and discard the linked transient draft and return to the existing cases flow. |
| Refresh/navigation | Discard transient prepared and edited state as disclosed. |
| Unexpected exception | Fail closed, log no sensitive content, and create no side effect. |

## 22. Accessibility and responsive acceptance

The future UI must satisfy all of the following:

- intent selection uses a native `fieldset`, `legend`, and radio inputs;
- the complete journey is keyboard operable;
- recipient, subject, and body controls have persistent programmatic labels;
- the editable body uses an accessible textarea;
- successful preparation moves focus to the prepared-draft heading;
- copy success uses a polite live region;
- generation, validation, and copy failures use an accessible alert;
- visible keyboard focus is retained;
- every actionable control is at least 44 by 44 CSS pixels;
- source, user-confirmed, and derived fact-review groups are separate semantic
  regions with headings;
- state, validation, and provenance are not communicated by colour alone;
- controls and editable text do not overflow horizontally at 320px;
- the complete journey is manually validated at 320px, 360px, 390px, and a
  representative desktop width;
- `Nothing has been sent` is visible and programmatically associated with the
  draft/copy area.

## 23. Exact future implementation boundary

### MUST ADD

- `src/lib/careFeeDraftPreparation.ts`: dedicated contracts, strict validation,
  fact normalization, deterministic templates, audit references, and final
  safety guard.
- `src/lib/__tests__/careFeeDraftPreparation.test.ts`: domain and contract tests.
- `src/components/CareFeeDraftPreparationPanel.tsx`: explicit intent, fact review,
  optional recipient, preparation, editing, and copy UI.
- `src/components/__tests__/CareFeeDraftPreparationPanel.test.tsx`: focused
  interaction and accessibility tests.

### MUST CHANGE

- `src/components/CareFeeComparisonCaseView.tsx`: add the explicit saved-case
  `Prepare a message` entry and host transient state without changing case
  lifecycle semantics.
- `src/components/__tests__/CareFeeComparisonCaseView.test.tsx`: cover entry,
  isolation, focus, deletion, and transient behavior.
- Existing Care Fee integration tests only where required to exercise the full
  saved-case path.

### MAY CHANGE

- low-level clipboard helper usage;
- shared presentational classes;
- test utilities;
- `src/__tests__/AppCareFeeCases.test.tsx` only if required for an integration
  assertion, without adding draft state to `App`.

### MUST NOT CHANGE

- `FinancialClaim` contracts;
- financial-claim extraction;
- comparability;
- reconciliation;
- Safe Result;
- Decision-Derived contracts;
- `CareFeeComparisonCaseV1` persistence schema;
- `AdminCase`;
- generic draft services, types, UI contracts, or persistence;
- impact or money logic;
- Chase Engine;
- sending or contact;
- evidence export;
- Benefits;
- ordinary Front Door;
- Care Fee save, reopen, or delete semantics.

## 24. Future automated test plan

Future implementation validation must include:

### 24.1 Entry and state matrix

- explicit `Prepare a message` entry from a validated saved case;
- no automatic draft after comparison, save, or reopen;
- every allowed state/intent pair succeeds;
- every rejected state/intent pair fails closed;
- no fallback intent.

### 24.2 Agreement, disagreement, and NSC safety

- agreement wording remains neutral and does not claim correctness or closure;
- disagreement uses exact claim order and exact saved amounts;
- disagreement uses exact saved absolute difference without recalculation;
- disagreement never describes the difference as owed, refund, overcharge,
  loss, recovery, savings, or money at stake;
- every NSC reason maps to its exact approved request category;
- NSC multi-reason output preserves reason order and deterministically removes
  duplicate questions;
- NSC never includes a difference;
- NSC with missing, malformed, or unknown reasons fails closed.

### 24.3 Recipient and provenance

- absent recipient produces exactly `Hello,`;
- valid recipient is marked `user_entered_drafting_input`;
- invalid length, blank, newline, tab, control character, wrong origin, and
  unexpected recipient fields fail validation;
- unknown and conflicting provider information is never inferred;
- opaque subject/provider IDs never appear in prepared text;
- source, user-confirmed, derived, and user-entered partitions remain distinct;
- exact typed audit references explain every AdminAvenger-prepared fact;
- source facts are not reconstructed from rendered text;
- user-confirmed and derived facts never acquire source provenance.

### 24.4 Contracts and generation

- request kind, version, exact keys, and saved-case validation;
- malformed runtime input and unexpected-field rejection;
- exact typed amount, currency, cadence, applicability, and claim ordering;
- no date, period, overlap, amount, or difference recalculation;
- deterministic output for the same validated context and template version;
- no unresolved template tokens;
- final prohibited-language and structural guard;
- no generic `AdminCase`, `AdminDraft`, draft-service, chase, status, impact,
  outcome, or send contract enters the path.

### 24.5 Editing, copy, privacy, and lifecycle

- prepared text remains immutable while edited text changes;
- audit remains scoped to prepared text;
- user edits are not reclassified as source or derived;
- unchanged repeated preparation creates no duplicate;
- reprepare after editing requires explicit confirmation;
- copy uses current edited subject/body;
- exact copy success announcement;
- copy failure preserves selectable text;
- no draft persistence or local-storage write;
- no send, contact, chase, status, timeline, or money-impact mutation;
- refresh, navigation, and case deletion discard transient draft state;
- no sensitive logging, telemetry, or network request.

### 24.6 Accessibility, responsive, and regressions

- native fieldset/radio semantics;
- keyboard-complete flow and visible focus;
- persistent labels and accessible textarea;
- focus transfer after preparation;
- live copy success and alert failures;
- 44px controls;
- semantic provenance regions and no colour-only state;
- no horizontal overflow at 320px;
- responsive component tests where meaningful;
- existing Care Fee case save, reopen, and delete regressions;
- existing generic AdminCase drafting remains unchanged and isolated.

## 25. Browser acceptance plan

The implementation milestone must manually or automatically validate at least:

1. Agreement does not draft automatically.
2. Agreement prepares neutral clarification.
3. Disagreement prepares an explanation of the exact saved difference.
4. NSC prepares a blocker-grounded missing-information request.
5. Unknown provider uses the generic greeting.
6. Conflicting provider is not inferred.
7. The user edits subject and body.
8. Copy uses edited text and announces that nothing was sent.
9. Refresh discards the transient draft.
10. The journey is keyboard-complete.
11. The journey works at 320px.
12. The journey works at 360px.
13. The journey works at 390px.
14. The journey works at desktop width.
15. No send button exists.
16. No contact or network request occurs.
17. No money impact is created or counted.
18. No prohibited wording appears.
19. No console errors occur.
20. No sensitive content is logged.

## 26. Non-goals

V1 does not include:

- drafting from an unsaved comparison;
- LLM or network generation;
- selectable tone;
- automatic source-quote insertion;
- saved drafts or revisions;
- generic draft integration;
- download or export;
- evidence packs;
- sending or contact;
- recipient address/channel management;
- reminders or chasing;
- case status or outcome changes;
- money impact, recovery, savings, or amount-at-stake tracking;
- refund, overcharge, liability, entitlement, legal, or policy conclusions;
- changes to existing Care Fee source, confirmation, comparison, safe-result, or
  saved-case contracts.

## 27. Completion boundary

This milestone is complete only when a user can explicitly prepare, review, edit,
and copy a safe transient message from a validated saved Care Fee case, with all
state, provenance, privacy, accessibility, and isolation requirements above
validated.

Completion would mean the controlled-beta Care Fee journey supports:

- explanation;
- optional explicit local case save;
- optional explicit safe transient draft preparation.

It would not make AdminAvenger a full Care Fee product and would not authorise any
later persistence, contact, chase, outcome, money, legal, or policy milestone.
