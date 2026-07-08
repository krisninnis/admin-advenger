# Result View Model v1

Status: implemented as a pure composition layer.

## Why This Exists

The result page had become panel-driven. The main result, Benefits Action Pack,
and Best Next Move panels each decided what to show, in what order, and how to
word safety-adjacent sections. That made repetition easy and safety drift hard
to spot.

`ResultViewModel` creates one canonical view of the result before rendering.
It does not replace the existing panels yet. It gives HomeView and future Result
Page v2 one source for the sections, ordering, deduped content, and safety
invariants.

## What It Solves

- One result order instead of each panel inventing its own hierarchy.
- One dedupe pass for evidence, questions, risks, uncertainty, and cannotKnow.
- One place to keep date and money safety visible.
- One future handoff point for a simpler result page.
- A testable boundary against forbidden advice, outcome, and adversarial wording.

## What The Composer Owns

The composer owns display shape only:

- title and plain-English summary
- primary status label
- best next move summary
- possible dates to check
- money mentioned
- evidence found
- evidence to gather
- questions to answer
- risks
- uncertainty
- what AdminAvenger cannot know
- safety notes
- draft/checklist display text when already provided upstream
- section order for the result page

The intended result order is:

1. Summary
2. Best next move
3. Key dates / money
4. Evidence to gather
5. Questions
6. Draft/checklist
7. Safety / cannotKnow
8. Detail sections

## What It Must Never Own

The composer must not:

- classify documents
- decide case type
- change benefits, debt, parking, consumer, OCR, or scam logic
- generate new facts
- create cases, findings, drafts, timeline events, or money records
- count savings, recovery, debt, entitlement, or benefit amounts
- send, submit, contact, cancel, appeal, claim, or pay anything
- turn cautious output into advice
- hide high-stakes uncertainty or cannotKnow content

## Safety Invariants

The composed result must:

- keep cannotKnow present
- keep uncertainty present when upstream data has it, with a conservative fallback
- keep every date as user-check-required
- keep benefits money display-only and outside the money tracker
- never count benefits or debt money as saved, recovered, or owed
- keep “AdminAvenger does not contact anyone for you” or equivalent visible
- avoid forbidden wording such as “you will win”, “you qualify”, “you are
  entitled”, “DWP is wrong”, “this is unlawful”, “valid claim”, “invalid claim”,
  or “guaranteed”
- avoid adversarial language such as “beat DWP”, “opponent”, “exploit”,
  “force them”, “pressure them”, or “game theory”

These invariants live in `src/lib/resultViewModel.ts` and are covered by
`src/lib/__tests__/resultViewModel.test.ts`.

## Dedupe Rules

Dedupe is deliberately simple:

- trim text
- collapse whitespace
- compare case-insensitively
- preserve the first useful phrasing
- remove unsafe duplicated variants
- never remove all safety notes
- never remove all cannotKnow
- never remove all uncertainty
- never remove date caution or money caution

This is a presentation cleanup, not a semantic merge. If two items mean similar
things but use genuinely different wording, they may both remain until a future
content pass safely groups them.

## Future Result Page V2

Future v2 can render directly from `ResultViewModel` instead of stacking the
current panels. The target is one composed case sheet:

- verdict header
- one Best Next Move card
- canonical dates and money blocks
- short evidence and question sections
- disclosures for risks, full evidence, uncertainty, and draft/checklist
- always-visible safety and cannotKnow access

The current implementation only integrates lightly with HomeView so behaviour
stays stable while the structure becomes testable.

## Migration Notes For Panels

- `SimpleResultPanel` can continue to receive an `OpportunityCard`, but HomeView
  can adapt the composed title, summary, evidence, missing information, and next
  move into that prop.
- `BenefitsActionPackPanel` remains the richer benefits detail surface for now.
- `StrategicNextStepPanel` remains the richer planning detail surface for now.
- New panels should prefer `ResultViewModel` inputs instead of re-deriving
  evidence, questions, risks, cannotKnow, dates, or money independently.

The principle stays unchanged:

AI remembers. AI explains. Humans decide.
