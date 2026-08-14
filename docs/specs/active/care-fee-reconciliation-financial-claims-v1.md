# Care Fee Reconciliation Financial Claims V1

## Status

Approved for the bounded Phase 2 implementation described in the human project
owner instruction dated 13 August 2026.

## Outcome

Turn validated `SourceDocument` evidence into deterministic, typed,
normalised `FinancialClaim` records. Every trusted claim must retain valid,
unambiguous provenance through the existing Phase 1 source layer.

```text
SourceDocument + validated provenance
-> FinancialClaim
-> STOP
```

## Contract

- Use the exact concepts, cadence values, party roles, and provenance rules in
  `care-fee-reconciliation-wales-v1.md` sections 6-8.
- Represent money as non-negative integer pence with `GBP` or `unknown`
  currency. Reject malformed, negative, unsupported, or ambiguous currency
  input.
- Populate cadence, dates, periods, payer, and payee only from explicit source
  wording. Unknown values remain unknown or absent.
- Validate runtime claim shapes and provenance before trust. Source material in
  `review_required` or `unavailable` state cannot produce a trusted claim.
- Preserve distinct claim identity across documents and source passages.
- Compose the existing `SourceDocument`, `SourceProvenance`, source-support, and
  `EvidenceItem` architecture. Do not replace or duplicate the evidence layer.

## Boundaries

This phase adds no comparison, reconciliation, difference arithmetic,
changed-over-time logic, Wales-policy reasoning, user interface, findings,
drafts, cases, routes, actions, persistence, or money-impact behaviour.

Knowledge may explain a source-grounded claim in a later approved phase. It may
never create, repair, or replace one.

## Verification

Use test-first focused coverage for claim types, money, currency, cadence,
dates, roles, provenance, OCR review state, runtime validation, and identity.
Then run provenance and intake regressions, the full suite, lint, build, and
`git diff --check`.
