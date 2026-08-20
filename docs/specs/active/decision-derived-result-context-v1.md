# Decision-Derived Result Context V1

## Status

Approved for the bounded shared-infrastructure finalisation described in the
human project owner instruction dated 20 August 2026.

## Purpose

Carry deterministic decision-derived facts into Result View Model presentation
while keeping them structurally distinct from facts grounded directly in source
evidence.

```text
Source evidence -> DecisionSourceFact --------> source-backed Result evidence
Deterministic decision -> DecisionDerivedFact -> decision-derived Result context
```

The governing invariant is: source evidence and decision-derived evidence must
remain structurally distinguishable. A derived fact must never masquerade as
something stated directly in a source document.

## Source fact invariant

- A source fact represents information grounded directly in source evidence.
- It may carry the exact source quote and a stable source trace.
- A source trace identifies the exact claim and source document and may identify
  the exact segment, page, or photo.
- A source document display name is presentation metadata only. It is not a
  stable provenance identity and must not be used as one.
- Source facts must not carry decision-derived input identities, deterministic
  decision context, or inherited decision applicability.

## Derived fact invariant

- A decision-derived fact is explicitly typed as decision-derived.
- It must not carry a fabricated source quote, document identity, segment
  identity, page, or photo.
- It retains the exact ordered input claim IDs used by the deterministic
  decision. IDs are not invented, repaired, reordered, or deduplicated.
- It retains the relevant typed deterministic decision output.
- It may carry typed applicability inherited from the decision chain. A fact
  derived from financial reconciliation must carry the exact Phase 4
  applicability that authorised that decision.

## Traceability and runtime safety

The shared Result View Model mapping boundary validates source and derived
context before presentation. It omits unsafe context rather than guessing or
repairing it.

- Empty or malformed stable IDs are rejected.
- A two-claim decision rejects duplicate input claim IDs because distinct claims
  are required.
- Missing decision-derived input IDs or deterministic decision context are
  rejected.
- Malformed trace IDs and contradictory source/derived metadata are rejected.
- No missing document, segment, claim, or decision identity is fabricated.
- Valid IDs, traces, ordered inputs, decision output, and applicability pass
  through unchanged.

## Phase 4 applicability handoff

For a fact derived from `ReconciliationResult`, the shared contract carries the
exact `ComparableApplicability` supplied by Phase 4.

- `same_explicit_period` preserves the exact invoice period.
- `overlapping_explicit_periods` preserves the exact approved recurring shared
  interval.
- `same_effective_date` preserves the exact approved effective date.
- Input reversal must not mutate inherited applicability.
- Result View Model presentation must not calculate an intersection, infer dates
  from source order, or widen or narrow an interval.

## No reconstruction

Presentation layers must not recompute applicability, financial differences,
provenance, or decision results. They may validate and faithfully map the
already-produced context only.

## Provenance-aware presentation

Result evidence is discriminated as source-backed, decision-derived, contextual,
or missing. Source-backed evidence may contain a source quote, stable trace, and
document display metadata. Decision-derived evidence may contain ordered input
claim IDs, typed decision context, and inherited applicability, but cannot
contain source provenance.

Deduplication may collapse truly identical evidence but must preserve evidence
whose source trace, ordered input claim IDs, evidence kind, decision context, or
applicability differs. Ordering remains deterministic and input order remains
meaningful.

## Compatibility

Existing merged `DecisionResult` producers may continue to omit `derivedFacts`
and may continue to provide source facts without an explicit source marker. The
shared mapping boundary treats those existing entries as source facts while
requiring every new decision-derived fact to use the explicit derived contract.

## Non-goals

This workstream does not:

- add Safe Result V1;
- add care-fee routing or UI;
- infer liability, correctness, entitlement, debt, credit, or overcharge;
- create actions;
- save, contact, submit, or chase;
- count money as saved or recovered;
- alter ordinary-message behaviour;
- recalculate Phase 4 decisions or applicability.

## Verification

Use dedicated shared-layer tests for type/runtime separation, trace validation,
ordered input IDs, provenance-aware deduplication, deterministic ordering,
exact applicability handoff, and compatibility with existing producers. Then
run relevant Result View Model, decision-engine, Phase 4, full-suite, lint,
build, and whitespace validation. Safe Result checks are compatibility signals
only until that separate milestone is authorised.
