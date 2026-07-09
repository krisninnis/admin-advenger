# Case Progress Tracker v1

## Why this exists

By the time a result reaches Result Page v2, AdminAvenger has usually gathered
several kinds of preparation information: dates, money mentioned, evidence,
questions, a draft or checklist, and sometimes an Adviser Export Pack.

Users told us it was hard to tell, at a glance, how "ready" their preparation
pack actually was. The Case Progress Tracker answers one narrow question:

**How much of the preparation pack looks gathered so far?**

It does this with a small checklist and a percentage, both built entirely from
data AdminAvenger already has.

## Preparation completeness only

`percentComplete` in `CaseProgressSummary` means one thing and one thing only:
how many of the relevant preparation checklist items currently look complete.

It never means:

- win chance
- success likelihood
- outcome prediction
- advice confidence
- how strong the user's case, claim, or appeal is
- how likely a decision is to be overturned
- money recovered, saved, or owed

## What it is not

The tracker is explicitly **not**:

- a win chance
- a success score
- an appeal strength score
- a case strength score
- a legal strength score
- an entitlement score
- a benefits calculator
- a debt advice engine
- a parking ticket validity checker

It does not decide whether the user's position is good or bad. It only
reflects whether preparation materials (dates, evidence, drafts, adviser
packs) look present or missing.

## Safe wording rules

Approved language, used throughout `src/lib/caseProgress.ts` and
`src/components/CaseProgressCard.tsx`:

- preparation progress
- pack completeness
- evidence checklist
- information gathered
- ready to ask for help
- steps still to check

Forbidden language (checked by the safety wording regression suite and the
Case Progress Tracker's own tests):

- win chance
- success likelihood / success score
- case strength / appeal strength / legal strength
- you will win
- DWP is wrong
- you qualify
- money owed / money saved / you are owed
- valid claim / invalid claim
- sent automatically / submitted automatically

Every checklist item's `label`, `description`, and `safetyNote` are plain
sentences reviewed against this list. `flattenCaseProgressText()` exists so
the safety wording regression suite and the golden corpus can scan generated
Case Progress output exactly the way they scan every other surface.

## Example checklist items

Generic items used across most document types:

- original letter/message added
- key date checked
- money or reference checked
- evidence/documents gathered
- questions answered
- draft or checklist reviewed
- adviser pack prepared
- someone trusted or an adviser checked this

PIP decision / Mandatory Reconsideration style results additionally check:

- decision date checked
- decision letter available
- activities or points identified
- real examples added

Parking, debt, and other legal-looking letters use:

- deadline or date checked
- reference or amount checked

Unknown or scam-like messages use a deliberately shorter, more conservative
list:

- original message added
- sender or source checked
- do-not-rush warning acknowledged (only when the result actually produced
  one)
- someone trusted or an adviser checked this

## Statuses

Each `CaseProgressItem` has one of four statuses, always shown as text, never
colour-only:

- `complete` - AdminAvenger found or prepared this
- `partial` - something was prepared but still needs the user's own review
  (for example, a draft exists but has not been marked reviewed)
- `missing` - nothing has been gathered for this yet
- `not_needed` - this step does not apply to this result (excluded from the
  `totalRelevant` denominator)

`percentComplete` is `round(completeCount / totalRelevant * 100)`, where
`totalRelevant` excludes `not_needed` items. The progress label follows the
same wording as the UI mock: `"3 of 7 preparation steps complete"`.

## Date and money safety

Dates and money mentioned by the tracker are display-only, exactly like the
rest of Result Page v2:

- date items always carry the caution "Check this date against the original
  letter."
- money/reference items never claim an amount is owed, saved, or recovered -
  they only report whether a reference or figure has been gathered, with a
  caution that AdminAvenger has not checked or totalled the figure

## Do not add

Per the AdminAvenger engineering standard and this feature's scope, the Case
Progress Tracker deliberately does **not** add:

- new decision-engine behaviour
- new OCR/photo behaviour
- new routing/classification logic
- cloud sync
- accounts
- analytics
- auto-send or auto-submit behaviour
- PDF export
- legal, benefits, debt, or employment advice

## How it uses ResultViewModel

`buildCaseProgress()` (in `src/lib/caseProgress.ts`) is built from data that
already exists:

- `resultViewModel` (required) - key dates, money mentioned, evidence found /
  to gather, questions to answer, draft/checklist
- `decisionResult` (optional) - only used to pick which checklist wording
  applies (PIP-decision-style vs. parking/debt-style vs. unknown-style vs.
  generic), never to compute a strength or outcome value
- `benefitsActionPack` (optional) - used only to check whether
  `whatMatters` (activities/grounds) has been identified
- `adviserExportPack` (optional) - used only to check whether an adviser
  pack has been prepared
- `strategicNextStepPlan` (optional) - accepted for future use, not currently
  read

No new facts are invented and no re-classification happens. If only
`resultViewModel` is supplied (no `decisionResult`), the tracker falls back to
a conservative generic checklist.

## How it relates to Adviser Export

The "Adviser pack prepared" checklist item is `complete` when an
`AdviserExportPack` was supplied to `buildCaseProgress()`, and `missing`
otherwise. The tracker does not know whether the user actually downloaded the
file - only whether one has been prepared during this session.

## UI placement

`CaseProgressCard` renders inside `ResultCaseSheet`, directly below the
"Draft/checklist" and "Adviser export action" row and above the "Show
supporting detail" toggle. It sits with the preparation material, not above
the main answer, so it supports the result rather than competing with it.

The card always shows, in this order:

1. Heading: "Preparation progress"
2. Explanation: "This shows how complete your preparation pack is. It does
   not predict the outcome."
3. Progress count text, e.g. "3 of 7 preparation steps complete"
4. A progress bar with `role="progressbar"` and a full text alternative
   (`aria-valuetext`) so the percentage is always readable, not just visual
5. The checklist, with each item's status shown as text
6. The standing note: "AdminAvenger helps prepare. You stay in control."

## Accessibility

- The progress bar exposes `aria-valuenow`, `aria-valuemin`, `aria-valuemax`,
  and a full-sentence `aria-valuetext` (e.g. "37% complete. 3 of 8
  preparation steps complete.")
- Every checklist status has a plain-text label ("Complete", "In progress",
  "Not started", "Not needed") - colour is never the only signal
- Checklist items render as a normal list with visible text, not icons alone

## Tests

- `src/lib/__tests__/caseProgress.test.ts` - builds summaries, checks
  `percentComplete` math, checks preparation-only wording, checks the PIP/MR,
  parking/debt, and unknown-fallback checklists, and asserts no forbidden
  wording appears anywhere in the flattened output
- `src/components/__tests__/CaseProgressCard.test.tsx` - renders the heading,
  the "does not predict the outcome" explanation, the progress count text,
  the checklist items, and the accessible status labels; asserts no forbidden
  wording
- `src/components/__tests__/ResultCaseSheet.test.tsx` - confirms the composed
  result page renders "Preparation progress" for a normal result, a PIP
  decision/MR-style result, and the unknown fallback, with no forbidden
  wording
- `src/lib/__tests__/goldenLetterCorpus.test.ts` - smoke-tests
  `buildCaseProgress()` against eight golden fixtures (UC sanction, PIP
  decision, UC deductions, parking/legal-looking debt, debt collection,
  consumer dispute, suspicious message, unknown fallback), asserting safe,
  preparation-only output for each

## Future improvements

- per-case storage, so progress persists across sessions instead of being
  recomputed each time
- manual checklist editing, so users can mark their own items complete
- support worker notes attached to individual checklist items
- adviser-reviewed checklist templates per document family
- including preparation progress in the Adviser Export Pack itself
- an accessible chart/pie-style visual option alongside the linear bar
- user-controlled completion toggles, so "draft reviewed" and "someone
  trusted checked this" can reflect the user's own confirmation rather than
  only what AdminAvenger can detect
