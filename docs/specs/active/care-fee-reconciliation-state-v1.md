# Care Fee Reconciliation State V1

## Status

Approved for the bounded Phase 4 implementation described in the human project
owner instruction dated 13 August 2026.

## Outcome

Compose two Phase 2 `FinancialClaim` records through the Phase 3 comparability
gate and produce only the deterministic state and arithmetic that the gate
permits.

```text
SourceDocument + validated provenance
-> FinancialClaim
-> Comparability Gate
-> Reconciliation State
-> STOP
```

## Contract

- Phase 4 must call the Phase 3 gate. It must not accept a caller assertion that
  claims are comparable or implement a fallback comparison.
- Propagate `not_safely_comparable`, claim IDs, and Phase 3 reason codes without
  arithmetic or semantic remapping.
- Two distinct comparable claims with equal integer-pence amounts produce
  `agreement` and the shared source amount.
- Two distinct comparable claims with unequal integer-pence amounts produce
  `disagreement`, the input-order source amounts, and their absolute integer-
  pence difference.
- Retain claim IDs, currency, cadence, and the exact Phase 3
  `ComparableApplicability` that authorised the arithmetic. Phase 4 inherits
  applicability unchanged and must not recalculate, reinterpret, widen, or
  narrow it. Exact invoice-total periods therefore remain exact, while approved
  recurring overlap retains the shared interval established by Phase 3.
  Claim IDs remain the route back to claim provenance and source documents.
- Phase 5 may consume the retained applicability but must not reconstruct it
  from claims, dates, document order, or any other context.
- Amount direction, currentness, chronology, correctness, liability, money owed,
  and overcharge are not established.

## State ownership

Phase 4 owns `agreement` and `disagreement`. Phase 3 owns all trust,
comparability, identity, role, cadence, currency, adjustment, and applicability
failures. Phase 4 exposes those failures as `not_safely_comparable` with the
original ordered reason codes.

`changed_over_time` is deferred because different effective dates and
non-overlapping periods do not pass the current comparability gate. No later
layer may weaken that gate implicitly.

## Boundaries

This phase adds no policy or knowledge, user-facing copy, finding, evidence
presentation, result-view composition, draft, case, chase, persistence, action,
legal/eligibility conclusion, amount owed, refund, or money-impact behaviour.

## Verification

Write reconciliation truth-table tests first and prove the missing-module red
state. Then run Phase 3, Phase 2, provenance/source-support, full serialized,
lint, build, and whitespace validation.
