# Care Fee Reconciliation Comparability Gate V1

## Status

Approved for the bounded Phase 3 implementation described in the human project
owner instruction dated 13 August 2026.

## Outcome

Determine with pure typed logic whether two validated, source-grounded
`FinancialClaim` records may be directly compared without unsupported
assumptions.

```text
SourceDocument + validated provenance
-> FinancialClaim
-> Comparability Gate
-> comparable / not_safely_comparable
-> STOP
```

## Contract

- Revalidate both runtime claim values and provenance against the supplied
  `SourceDocument` records. Invalid or review-blocked input fails closed.
- Return exact input claim IDs and either compatible typed dimensions or a
  stable ordered set of deterministic blocking reason codes.
- Require the same known concept, subject, provider, payer role, payee role,
  currency, cadence, and compatible explicit applicability.
- `other_unknown_amount` and unknown identity, role, currency, cadence, or
  applicability block comparison.
- Exact complete periods are compatible. Non-identical overlapping complete
  periods are compatible only for the explicit recurring-rate cadences
  `weekly`, `four_weekly`, and `monthly`, and the comparable result must retain
  the exact shared intersection. `invoice_period_total` claims require exactly
  identical periods; totals are never allocated, prorated, normalised, or
  converted. Non-overlapping, partial, or missing periods block comparison.
  Equal explicit effective dates may establish shared applicability when
  neither claim has a period; different effective dates do not permit direct
  comparison here.
- Do not use document dates, assessment dates, filenames, or upload order as
  applicability.
- Amount equality and amount size have no effect on comparability.

## Boundaries

This phase performs no equality result, difference arithmetic, reconciliation
state, chronological conclusion, current/superseded selection, Wales-policy
reasoning, user-facing explanation, finding, draft, case, route, persistence,
action, or money-impact behaviour.

## Verification

Write the typed truth table first and prove the missing-module red state. Then
run focused comparability tests, Phase 2 claim and source-provenance regressions,
the full serialized suite, lint, build, and whitespace validation.
