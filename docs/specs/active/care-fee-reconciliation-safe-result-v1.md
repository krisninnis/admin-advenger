# Care Fee Reconciliation Safe Result V1

## Status

- Status: Approved for Phase 5 only
- Workstream: `care-fee-reconciliation-safe-result-v1`
- Product principle: AI prepares. Humans decide.
- Approval source: human project-owner instruction for Phase 5

## Objective

Translate the existing deterministic `ReconciliationResult` into the existing
AdminAvenger finding and Result View Model architecture without strengthening
what the evidence pipeline established.

## Input boundary

The composer consumes a Phase-4 `ReconciliationResult`, its referenced
`FinancialClaim` records, and their `SourceDocument` records. It may resolve
claim and source identity for presentation. It must not extract, compare,
reconcile, recalculate, repair OCR, infer chronology, convert cadence, or invent
missing context.

For every successful Phase-4 result, the composer consumes
`reconciliation.applicability` exactly as supplied. It must preserve that value
unchanged and must not recompute it, infer dates, intersect periods again, or
widen or narrow the approved interval. It may only verify that the supplied
claims do not contradict the inherited applicability; inconsistency fails
closed rather than triggering reconstruction.

## Output boundary

The output uses an existing `AdminFinding` and `ResultViewModel`. Existing
source-fact and result-evidence records may receive the smallest optional trace
metadata required to preserve:

```text
displayed source fact -> claim -> source document -> segment/page/photo -> quote
```

Decision-derived reconciliation facts remain visibly separate from source facts
and keep the exact ordered Phase-4 input claim IDs and applicability. They carry
no source quote, trace, document, segment, page, or photo identity. Safe Result
V1 owns `care_fee_reconciliation` as its sole `DecisionDocumentType` addition.
No case, draft, persistence, chase, money-tracker entry, or automatic action is
created.

## State semantics

- Agreement includes one neutral decision-derived fact saying only that the two
  safely comparable values agree. It uses `kind: "decision_derived"`, the exact
  ordered Phase-4 claim-ID pair, decision context
  `{ kind: "financial_reconciliation", state: "agreement" }`, and the exact
  Phase-4 applicability. It does not establish correctness, approval,
  entitlement, liability, legality, reimbursement, an amount owed, or that the
  amount should apply or was properly applied.
- Disagreement shows both source values in neutral claim order and the absolute
  Phase-4 difference. Its difference fact uses `kind: "decision_derived"`, the
  exact ordered Phase-4 claim-ID pair, decision context
  `{ kind: "financial_reconciliation", state: "disagreement",
  differenceKind: "absolute" }`, and the exact Phase-4 applicability. It does
  not introduce direction, chronology, fault, correctness, liability,
  reimbursement, overcharge, underpayment, or money owed.
- Not safely comparable shows deterministic plain-English explanations for the
  Phase-3 reasons and no amount arithmetic or agreement/disagreement derived
  fact.

## Presentation rules

- Format the existing integer-pence values as GBP without performing new
  financial calculations.
- Show only the cadence supplied by the deterministic result.
- Revalidate referenced claims and source provenance with the existing Phase-2
  and source-support validators. Missing, malformed, review-required,
  unavailable, unsupported, ambiguous, mismatched, or inconsistent inputs fail
  closed without replacement provenance.
- Verify successful-result claim identity, amount, currency, cadence, comparable
  dimensions, and applicability consistency without rerunning comparison or
  reconciliation.
- Use deterministic templates; no LLM composition.
- Keep `amountTreatment` as `no_money_counted`.
- Because `AdminFinding.suggestedAction` is required, use only the neutral
  preparation text `Check the original documents.` in this phase.

## Explicit non-goals

No full Care Fee Check UI, routes, intake changes, Wales knowledge, eligibility,
legal or contractual conclusions, overcharge conclusions, cases, drafts,
complaints, appeals, chase, persistence, outcomes, savings, recovered money,
cadence conversion, or changed-over-time inference.

## Verification

Write behavioural tests first for agreement, disagreement, every stable
comparability reason, source review, self-comparison, provenance traceability,
Phase-4 arithmetic authority, and prohibited language. Then run focused tests,
Phase 1-4/result regressions, the full serialized suite, lint, build, and
`git diff --check`.
