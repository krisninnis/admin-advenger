# Care Fee Prepared Message Evidence Review V1

Status: implementation authorised

Investigation verdict: **GO WITH CHANGES**

## Purpose

Make an explicitly prepared Care Fee message auditable before copy or use. The review explains which parts of the immutable AdminAvenger-prepared version come from:

1. saved source records;
2. user-confirmed context;
3. deterministic AdminAvenger comparison facts;
4. user-entered recipient input; and
5. fixed AdminAvenger template wording.

It separately reports whole-field subject and body edits. It remains transient, local-only, preparation-only, and no-send. Matching a saved snapshot does not prove that a real-world record is current or correct.

## Governing principle

AI prepares. Humans decide.

The feature must not send, contact, chase, submit, export, persist a draft, alter a case, count money, recompute a comparison, or produce a refund, overcharge, entitlement, liability, legal, or policy conclusion.

## Structured statement architecture

Prepared prose must not be parsed to recover provenance. Draft preparation creates deterministic structured statement segments first and renders the prepared subject and body from those segments.

Every statement has:

- a stable statement ID;
- subject or body location;
- deterministic global order;
- an explicit deterministic separator;
- exact prepared text;
- exactly one classification; and
- zero or more exact typed support references.

Required classifications are:

- `source_grounded_statement`;
- `user_confirmed_input`;
- `derived_comparison_statement`;
- `user_entered_recipient`; and
- `adminavenger_template_wording`.

Template wording carries no fabricated evidence reference and is described as: “AdminAvenger's fixed message wording; not evidence from a record.”

Source statements resolve to exact saved record fields. Derived statements resolve only to exact saved reconciliation, applicability, difference, or blocker fields. Recipient text resolves only to the transient user-entered recipient input. No evidence value is inferred from rendered text.

The renderer must reproduce the existing approved prepared subject/body wording exactly unless this evidence boundary strictly requires a change. Identical normalized inputs produce an identical structured trace.

## Stated facts and supporting context

Aggregate audit references are not proof that every referenced fact appears in the prepared message.

Document references may support source review without becoming stated message facts. User-confirmed context used upstream to make the saved comparison safe is shown separately as:

> Used to support the saved comparison; not stated directly in this message.

Source excerpts are resolved from the valid current saved snapshot. They are not duplicated into persistent audit data and are collapsed by default.

## Evidence-review contract

`CareFeePreparedMessageEvidenceReviewV1` is a transient component-memory model containing:

- draft ID and case ID;
- template version;
- a transient internal prepared-against snapshot identity;
- saved-snapshot match status;
- immutable prepared statement records;
- exact typed statement support references;
- supporting-context references;
- whole-field edit state; and
- a preparation-only/no-send safety boundary.

The snapshot identity is never persisted, rendered, logged, exported, or included in backup data.

## Snapshot and integrity validation

Before evidence review and before AdminAvenger's Copy action, the implementation must:

- validate the current saved Care Fee case;
- verify case ID and version;
- compare all snapshot-significant saved content with the preparation snapshot;
- include ordered source snapshots, quotes, provenance, user-confirmed context, resolution ledger, reconciliation, blockers, safety boundary, and saved timestamps in that comparison;
- require every statement support reference to resolve exactly once;
- verify the structured trace against a fresh deterministic trace from the same saved snapshot and original preparation inputs;
- verify the typed aggregate audit contract; and
- verify that structured statements reproduce the immutable prepared subject and body.

The statuses are:

- `matches_saved_snapshot`;
- `invalid_saved_case`;
- `case_identity_mismatch`;
- `case_snapshot_mismatch`;
- `prepared_output_mismatch`; and
- `audit_mismatch`.

No difference, applicability, comparability, reconciliation, period, cadence, or currency is recalculated during review.

Changing the currently selected intent or recipient after preparation does not make the existing prepared draft stale. A user edit alone is not a snapshot mismatch.

## Fail-closed mismatch behaviour

On a genuine mismatch:

- preserve prepared and edited text on screen;
- remove the positive saved-snapshot match claim;
- present an accessible alert;
- disable AdminAvenger's Copy action;
- require preparation again from a valid saved case;
- never silently overwrite user edits; and
- never claim that the real-world source itself is wrong or outdated.

Required message:

> This prepared message no longer matches the saved Care Fee snapshot. Review the saved case and prepare the message again.

## User edits

V1 does not infer semantic or word-level provenance for arbitrary edits. It records only:

- subject unchanged or edited; and
- body unchanged or edited.

Reverting a field exactly to its prepared value returns it to unchanged. Evidence remains attached only to the immutable AdminAvenger-prepared version. User edits never gain source, user-confirmed, derived, recipient, or template provenance.

## User experience

The existing transient draft panel follows this order:

1. explicit Prepare draft action;
2. prepared draft;
3. saved-snapshot match status;
4. explicit Review evidence used action;
5. statement cards in prepared-message order;
6. supporting context and optional saved source excerpts;
7. separate Your edits status;
8. editable subject and body;
9. Copy text when integrity matches; and
10. stop.

The UI must not use a wide comparison table, expose raw IDs, or include send/contact/export/chase controls.

## Accessibility and mobile

Acceptance requirements:

- keyboard-complete preparation and evidence review;
- focus moves to the evidence-review heading after explicit opening;
- polite live announcement for positive snapshot status changes;
- `role="alert"` for copy-blocking mismatches;
- semantic headings, lists, and definition lists;
- persistent subject and message labels;
- no colour-only provenance communication;
- saved-source disclosures have accurate expansion state and start collapsed;
- visible focus;
- minimum 44px interactive targets;
- long names, quotes, and prepared text wrap safely;
- bottom-navigation clearance;
- no horizontal overflow; and
- usable editing at 320px, 360px, 390px, and desktop widths.

## Privacy and locality

The feature is component-memory only. It introduces:

- no storage schema;
- no draft, audit, edit, or snapshot-token persistence;
- no network or LLM request;
- no telemetry;
- no source, recipient, draft, or edit console logging;
- no backup/export inclusion; and
- no send/contact behaviour.

## Exact implementation boundary

### Must add

- `docs/specs/active/care-fee-prepared-message-evidence-review-v1.md`
- `src/lib/careFeePreparedMessageEvidenceReview.ts`
- `src/lib/__tests__/careFeePreparedMessageEvidenceReview.test.ts`
- `src/components/CareFeePreparedMessageEvidenceReview.tsx`
- `src/components/__tests__/CareFeePreparedMessageEvidenceReview.test.tsx`

### Must change

- `src/lib/careFeeDraftPreparation.ts`
- `src/lib/__tests__/careFeeDraftPreparation.test.ts`
- `src/components/CareFeeDraftPreparationPanel.tsx`
- `src/components/__tests__/CareFeeDraftPreparationPanel.test.tsx`

### May change only with demonstrated need

- `src/components/CareFeeComparisonCaseView.tsx` and focused tests;
- `src/lib/careFeeCase.ts` only for a non-schema snapshot-comparison helper; and
- existing low-level presentation or focus helpers.

The V1 implementation uses the permitted non-schema `careFeeCase.ts` helper for a transient canonical snapshot identity. It does not alter the saved-case schema.

### Must not change

- `App.tsx` or storage;
- `CareFeeComparisonCaseV1` persistence/schema;
- Financial Claims, Comparability Gate, Reconciliation State, Safe Result, or Decision-Derived contracts;
- Controlled Entry or Claim Confirmation semantics;
- Care Fee save, reopen, or delete semantics;
- generic `AdminCase` or generic drafting/persistence;
- Impact/money logic or Chase Engine;
- sending, contact, or submission;
- export or backup;
- Benefits or ordinary Front Door; or
- protected paths and unrelated dirty work.

## Test plan

Focused domain coverage must verify:

- deterministic statement IDs/order and identical trace for identical inputs;
- trace rendering to exact prepared subject/body;
- exact Record 1 and Record 2 amount/cadence support;
- exact derived applicability, difference, state, and blocker support;
- template-only statements have no fabricated evidence;
- user-confirmed comparison inputs are distinguished from message statements;
- document references do not become stated facts;
- exact quote/provenance resolution;
- invalid, missing, duplicate, or cross-case references fail closed;
- invalid case, ID mismatch, same-ID substitution, changed quote, blocker, applicability, ledger, safety boundary, and timestamps;
- tampered prepared output, trace, and audit;
- unchanged, subject-edited, body-edited, both-edited, and reverted edit states;
- edits never gain evidence provenance; and
- no recomputation, persistence, network, send, chase, money, or outcome behaviour.

Focused component/integration coverage must verify:

- evidence appears only after explicit preparation and opening;
- focus and expansion semantics;
- snapshot-match status and all provenance labels;
- collapsed source excerpt review;
- whole-field edit status and prepared-wording limitation;
- mismatch alert, disabled Copy, and preserved edits;
- valid edited copy;
- existing reprepare confirmation;
- deletion/navigation clears transient panel state;
- existing case save/reopen/delete remains unchanged; and
- generic drafting remains unaffected.

## Browser acceptance plan

Manual/browser validation covers:

- agreement, disagreement with exact saved difference, and NSC blocker-grounded reviews;
- source excerpt, user-confirmed context, template wording, and recipient classification;
- subject/body/both/reverted edits;
- valid edited copy;
- same-ID mismatch with preserved edits and disabled Copy;
- invalid case;
- case deletion, refresh, and navigation clearing transient state;
- keyboard-only use;
- 320px, 360px, 390px, and desktop layouts;
- no horizontal overflow;
- no send/contact/export/chase controls;
- no storage/network writes;
- no console/page errors or sensitive logging; and
- generic AdminCase drafting unaffected.

## Non-goals

V1 does not add sending, contact/address lookup, email/SMS, network/LLM drafting, persistence, revision history, chase/reminders, outcomes, money-impact accounting, refund/overcharge/entitlement/liability/legal/policy conclusions, recalculation, live-source freshness checks, external verification, evidence packs/export, generic case integration, semantic edit provenance, schema changes, or fabricated/repaired evidence.
