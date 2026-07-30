# R2 — Pilot Result At A Glance v1

Status: Approved — 23 July 2026

## Purpose

Reshape the top of the public standard result into one coherent
"Your result at a glance" composition so an ordinary pilot user can answer five
orientation questions within a few seconds:

1. What is this?
2. Is anything urgent?
3. What changed or matters?
4. What should I do next?
5. What should I have ready?

This is presentation and composition work. It reuses data the `ResultViewModel`
and its inputs already compute, reduces repetition, and adds progressive
disclosure. The only new data is a small presentation-only urgency view derived
from the `AdminCase.urgency` value that `buildResultViewModel` already receives.
Classification, extraction, routing, safety wording, money handling, dates,
evidence, drafts, persistence, exports, and `submitAcceptedText` are unchanged.

## Revision Note

This draft applies the review decisions on the earlier draft: urgency comes from
the existing case-urgency signal (not from a date's mere existence); the top is
reshaped rather than given a duplicate five-row block; "Best next move" folds
into the next action; "What to check first" is retired; the summary is "what
matters"; routine detail sits behind one collapsed disclosure while safety,
cannot-know, and uncertainty stay visible.

## Current-State Evidence

The public standard result is rendered by
`src/components/ResultCaseSheet.tsx`. `src/views/HomeView.tsx` builds the model
with `buildResultViewModel(...)` (around line 594) and renders
`<ResultCaseSheet model={resultViewModel} ... />` (around line 2339). The top of
the result today, in DOM order, is:

1. Header (emerald panel): eyebrow "What AdminAvenger found", `title` (`h2`),
   `directAnswer` (cyan box, when present), `summary`, an optional
   `primaryStatusLabel` pill, and the fixed "Preparation only. Nothing has been
   sent..." safety note.
2. A two-column grid: "Best next move" (`model.bestNextMove`) and "What to check
   first" (`checkFirstItems`).
3. A "Next action" panel (the action buttons).
4. A six-panel detail grid: "Dates to check" (`keyDates`), "Money mentioned"
   (`moneyMentioned`), "Evidence / documents to bring" (`evidenceFound` +
   `evidenceToGather`), "Questions to answer" (`questionsToAnswer`), "What
   AdminAvenger cannot know" (`cannotKnow`), and "Uncertainty / double-check"
   (`uncertainty` + `risks`).
5. "Draft/checklist", optional "Adviser export action", the Case Progress card,
   and a "Show supporting detail" toggle.

Two problems drive this work.

- The five questions are answerable but scattered. "Is anything urgent?" and
  "What should I have ready?" are not labelled at all.
- "What to check first" (`checkFirstItems`) repeats the first one or two
  `keyDates` and `moneyMentioned` entries and any reference facts, which then
  appear again in the "Dates to check", "Money mentioned", and "Evidence /
  documents to bring" panels. The same facts are shown twice.

Relevant data already available:

- `ResultViewModel` (`src/lib/resultViewModel.ts`, lines 98–123) exposes
  `title`, `summary`, `directAnswer`, `primaryStatusLabel`, `bestNextMove`,
  `keyDates`, `moneyMentioned`, `evidenceFound`, `evidenceToGather`,
  `questionsToAnswer`, `risks`, `cannotKnow`, `uncertainty`, `safetyNotes`,
  `draftOrChecklist`, `sections`, and flags. It has no urgency field.
- `BuildResultViewModelInput` already receives `adminCase?: AdminCase`, and
  `AdminCase.urgency` is a `"high" | "medium" | "low"` value set from
  `finding.urgency` in `createAdminCase`. This value is available to
  `buildResultViewModel` today but is never surfaced in the result view.

Existing tests pin the top: `src/components/__tests__/ResultCaseSheet.test.tsx`
asserts the header eyebrow, that `directAnswer` renders in the header and only
when present, and the DOM order `title` < `directAnswer` < `summary` < "Best
next move" / "What to check first" (lines 344–467).
`src/views/__tests__/HomeViewHmrcPublicJourney.test.tsx` asserts the rendered
order plus safety. `safetyWordingRegression` scans the flattened model for
forbidden wording. These stay green, with label/behaviour updates where a
heading name changes.

## User Problem

An ordinary pilot user, under mild stress, cannot orient quickly. They must read
the header, then scan "Best next move", then "What to check first" (which repeats
facts), then up to six detail panels. "Is this urgent?" and "what do I need to
have ready?" are never directly answered. Repetition adds length without meaning.
The result reads like a report to study rather than an answer to glance at.

## Proposed Visible Hierarchy

The invariant `title` → `directAnswer` → `summary` → supporting information is
preserved. The top is reshaped into one coherent "Your result at a glance"
composition. Nothing that already appears (title, directAnswer, summary) is
repeated in a second block; the composition arranges existing elements and adds
only the missing labelled answers around them.

In DOM order, the reshaped standard result is:

1. "Your result at a glance" heading region containing, in order:
   - **What is this?** — the existing `title` (`h2`), immediately followed by the
     existing `directAnswer` (rendered once, only when present).
   - **What changed or matters?** — the existing `summary` (used as-is; no money
     amount or evidence item is promoted above it).
   - **Is anything urgent?** — the bounded urgency view (below), optionally
     supplemented by the first actionable date when one exists.
   - **What should I do next?** — the next action: `bestNextMove.label` and
     `bestNextMove.description` (the standalone "Best next move" panel is folded
     in here), together with the existing action buttons. If retained,
     `bestNextMove.whyThisHelps` sits behind a small disclosure.
   - **What should I have ready?** — `evidenceToGather`, then `questionsToAnswer`,
     with an honest fallback.
2. The fixed "Preparation only. Nothing has been sent..." safety note — visible,
   outside any disclosure.
3. "What AdminAvenger cannot know" (`cannotKnow`) and "Uncertainty /
   double-check" (`uncertainty` + `risks`) — visible, outside any disclosure.
4. One clearly labelled disclosure: **"See dates, money, evidence and
   questions"**, collapsed by default, wrapping the routine detail panels
   ("Dates to check", "Money mentioned", "Evidence / documents to bring",
   "Questions to answer").
5. "Draft/checklist", optional "Adviser export action", the Case Progress card,
   and the existing "Show supporting detail" toggle — unchanged.

The "What to check first" panel is retired; its content is represented by the
at-a-glance answers and the routine detail disclosure.

Career results (`model.resultKind === "career_support"`) keep their current
dedicated layout unchanged; this reshape applies to the standard result branch
only. Benefits-family, broadband, consumer, suspicious-email, and unknown
fallback results flow through the standard branch and gain the same framing with
no change to their data.

## Mapping — Five Questions To Existing Safe Data

Every answer reuses existing elements. The header title/directAnswer/summary are
arranged in place, not duplicated.

| Question | Source (existing) | Presentation | Notes |
|---|---|---|---|
| 1. What is this? | `title`, then `directAnswer` | The existing `h2` title followed by the existing directAnswer box, each once | No second copy of either string anywhere in the result. |
| 2. Is anything urgent? | new `urgency` view derived from `adminCase.urgency`; first actionable `keyDates` entry as optional supplement | A cautious urgency line; when a date exists, "There is a date to check: {label}: {value}" is appended | The date supplements the explanation; it never sets or raises urgency by itself. |
| 3. What changed or matters? | `summary` | The existing summary, used as-is | No money amount or evidence item is automatically promoted above the summary. |
| 4. What should I do next? | `bestNextMove.label` + `bestNextMove.description`; existing action buttons | The next-action region; `whyThisHelps` behind a small disclosure if retained | Replaces the standalone "Best next move" panel. |
| 5. What should I have ready? | `evidenceToGather`, then `questionsToAnswer` | "Have ready: {items}" with honest fallback | Reuses the already-normalised evidence-to-gather list; no new evidence generated. |

## Urgency Handling

A small presentation-only urgency view is added to the `ResultViewModel`,
derived only from `adminCase.urgency` (the value already passed to
`buildResultViewModel`). Shape, illustratively:

```ts
type ResultUrgencyView = {
  level: "high" | "medium" | "low" | "unconfirmed";
  headline: string; // cautious plain English; never the words "not urgent"
  detail: string;   // explanation; may reference the first actionable date
  source: ResultViewSource;
};
```

Rules:

- `level` comes solely from `adminCase.urgency`. It is never raised, lowered, or
  set by the presence or absence of a date.
- When `adminCase` or its urgency is unavailable, `level` is `"unconfirmed"` and
  the copy says urgency was not confirmed and tells the user to check the dates
  and any requested actions on the original.
- High, medium, and low are all phrased cautiously and always include a check
  instruction, never a flat "not urgent" and never reassurance that nothing is
  time-sensitive.

Approved level wording (final):

- high: "High priority to review. Check the original document's dates and requested action promptly."
- medium: "Review soon. AdminAvenger cannot confirm the timing, so check the dates and requested action."
- low: "Lower priority to review. Still check the original for dates and anything you are being asked to do."
- unconfirmed (urgency unavailable): "Urgency not confirmed. Check the original for dates and requested action."
- A visible date, taken from the first actionable `keyDates` entry, may be
  appended to `detail` as a supplement ("There is a date to check: ..."). Its
  absence must not produce "not urgent"; instead the detail notes that no
  specific date was found and to check the original.
- The urgency view introduces no new extraction and no new classification; it is
  a plain-language presentation of an existing computed value.

## Fallback Behaviour When Information Is Absent

Each answer degrades to an honest, non-inventive statement:

- Question 1: `title` is always present (fallback "Admin document check"); the
  directAnswer box is simply omitted when absent, as today.
- Question 2: covered by the urgency rules above. Missing dates never become
  "not urgent"; missing case urgency becomes "unconfirmed" with a check
  instruction.
- Question 3: `summary` always has a value (fallback summary copy exists). It is
  never replaced by a promoted money or evidence line.
- Question 4: when `bestNextMove` is absent, reuse the current in-component
  fallback ("Check the sender, date, reference, and requested action before
  deciding what to do.").
- Question 5: when `evidenceToGather` and `questionsToAnswer` are both empty —
  "Nothing extra needs gathering right now. Keep the original safe." No invented
  evidence request.

No fallback introduces a date, deadline, amount, entitlement, outcome, or
urgency the model did not already contain.

## Progressive-Disclosure Rules

- Always visible, never behind disclosure: the at-a-glance composition (title,
  directAnswer, summary, urgency, next action, have-ready), the "Preparation
  only" safety note, "What AdminAvenger cannot know", and "Uncertainty /
  double-check".
- Behind one clearly labelled disclosure, collapsed by default and consistently
  (same default on every breakpoint and device): the routine detail panels
  "Dates to check", "Money mentioned", "Evidence / documents to bring", and
  "Questions to answer", under the control labelled "See dates, money, evidence
  and questions".
- The disclosure is a real `<button type="button">` with `aria-expanded` and
  `aria-controls`, keyboard operable, with the existing visible focus ring and a
  44px minimum target.
- The existing per-panel "Show more (n)" limits and the existing "Show
  supporting detail" toggle are retained inside/after this structure.
- `bestNextMove.whyThisHelps`, if retained, sits behind a separate small
  disclosure within the next-action region; the next step itself (label and
  description) stays visible.

## Accessibility And Responsive Requirements

- One logical heading order. "Your result at a glance" and each labelled answer
  read sensibly to a screen reader in DOM order; the urgency, next-action, and
  have-ready labels use text, not colour alone.
- The detail disclosure and the "why this helps" disclosure are real buttons
  with `aria-expanded`/`aria-controls`, fully keyboard operable, and reveal
  content that is itself keyboard reachable.
- Colour is never the only urgency signal; do not introduce a red "urgent" state
  that depends on colour, and do not colour a low/medium result as "safe".
- Contrast meets the existing dark-theme baseline.
- Responsive: the composition is single-column and full width on mobile with no
  horizontal scroll; long values wrap and are not truncated in a way that hides a
  date or amount. The collapsed-by-default rule is identical on mobile and
  desktop.
- The check input, question field, and submit behaviour are untouched.

## Affected Files

Implementation (a later, separately approved task) is expected to touch only:

- `src/lib/resultViewModel.ts` — the smallest necessary change: add a
  presentation-only `urgency` view derived from `adminCase.urgency` (and the
  first actionable `keyDates` entry as an optional supplement), plus the
  `ResultUrgencyView` type. No change to extraction, classification, dates,
  money, evidence, or safety computation.
- `src/components/ResultCaseSheet.tsx` — reshape the standard-result top into the
  "Your result at a glance" composition, fold in "Best next move", retire "What
  to check first", and wrap the routine detail panels in one collapsed
  disclosure. Career branch untouched.
- `src/components/__tests__/ResultCaseSheet.test.tsx` — update order/label
  assertions and add the strengthened behavioural assertions below.
- `src/views/__tests__/HomeViewHmrcPublicJourney.test.tsx` — update any heading
  reference and assert the at-a-glance answers render safely for the HMRC
  fixture.
- Possibly `src/lib/__tests__/resultViewModel.test.ts` and
  `src/lib/__tests__/resultPageClarity.test.ts` — assertions for the urgency
  view and the clarity contract.

No change to `HomeView.tsx`, routing, persistence, exports, or any
decision-engine or pack module.

## Behavioural Test Matrix

Tests are behavioural (render and assert visible outcomes). Each important result
family is checked for the five answers and for safety.

| Result family | Urgency source/level | Urgency + date behaviour | What matters | Have ready | Safety must hold |
|---|---|---|---|---|---|
| HMRC Tax Code Notice | case urgency, cautious | no invented deadline; date (if any) supplements only | `summary` unchanged | evidence-to-gather items | order preserved; no money-saved; no exact-payslip; no auto-draft |
| Broadband/mobile price-rise | case urgency, cautious | effective/response date supplements if present | `summary` | contract/date evidence | no confirmed-saving claim |
| Consumer refund/delivery/faulty | case urgency, cautious | date supplements if present | `summary` | proof/records | demanded/possible money not counted as saved |
| Suspicious-email safety | case urgency (often high), cautious | no date alarm; supplement only | `summary` | what to verify | safety override wording intact |
| Benefits-family | case urgency, cautious | date supplements if present | `summary` | evidence/questions | entitlement/outcome never claimed |
| Career support | n/a (career branch unchanged) | n/a | n/a | n/a | career layout and claims hygiene unchanged |
| Unknown fallback | often unconfirmed/low, cautious | "no specific date found; check the original" | `summary` | "nothing extra to gather" fallback | no invented facts |

## Forbidden Changes

- No change to classification, extraction, routing, `submitAcceptedText`,
  persistence, exports, drafts, or money handling.
- No new decision engine, category selector, separate public checker, modal,
  extra required step, dependency, backend, or telemetry.
- No automatic action, send, submit, or contact.
- Urgency is never inferred from a date's existence, and a missing date is never
  rendered as "not urgent". The words "not urgent" are not used.
- The summary is "what matters"; do not automatically promote a money amount or
  evidence item above it.
- Do not duplicate `title`, `directAnswer`, or `summary`; each appears once.
- Do not reorder `title` → `directAnswer` → `summary`.
- Do not hide the "Preparation only" safety note, cannot-know, or uncertainty
  behind disclosure.
- Do not modify the career result layout or any specialist pack's data.
- Do not weaken existing safety, order, or HMRC-journey tests to fit the new
  layout; update them to the new headings while keeping their guarantees.
- Do not touch `docs/research/` or `opencode.jsonc`.

## Acceptance Criteria

1. The standard result presents one "Your result at a glance" composition
   answering the five questions, arranging existing title/directAnswer/summary in
   place plus urgency, next action, and have-ready.
2. `title`, `directAnswer`, and `summary` each appear exactly once in the result
   DOM (no duplicate five-row echo).
3. The DOM order `title` → `directAnswer` → `summary` → supporting information
   holds.
4. Urgency `level` is derived only from `adminCase.urgency`; a date present in
   `keyDates` never causes a result to be labelled urgent, and no date is
   described as urgent merely because it exists.
5. When no date is present, the result never says "not urgent"; the urgency line
   still reflects the case-urgency level (or "unconfirmed") and instructs the
   user to check dates and requested actions.
6. When case urgency is unavailable, the urgency line says it was not confirmed
   and points the user to the dates and requested actions.
7. High, medium, and low urgency are each presented cautiously, with a check
   instruction and without reassurance that nothing is time-sensitive.
8. "What to check first" is retired and the standalone "Best next move" panel is
   folded into the next-action region.
9. Routine detail (dates, money, evidence, questions) sits behind one
   consistently collapsed, clearly labelled, keyboard-operable disclosure with
   `aria-expanded`; expanding it reveals the detail and the content is keyboard
   reachable.
10. The "Preparation only" safety note, "What AdminAvenger cannot know", and
    "Uncertainty / double-check" remain visible without expanding anything.
11. `validateResultViewModelSafety` remains safe for all covered families; no new
    forbidden wording appears.
12. Only the files listed in Affected Files change; `docs/research/` and
    `opencode.jsonc` remain untracked and untouched; full repository verification
    passes.

## Verification And Manual Visual-Check Plan

Automated (later implementation task):

```powershell
npm test
npm run lint
npm run build
git diff --check
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Run the focused suites first: `ResultCaseSheet`, `resultViewModel`,
`resultPageClarity`, `HomeViewHmrcPublicJourney`, `safetyWordingRegression`, and
the career and benefits result tests.

Manual visual check (real rendering):

- Desktop Chrome and a narrow mobile width, across the five pilot fixtures
  (HMRC Tax Code Notice, broadband/mobile price-rise, consumer refund/delivery,
  ordinary bill/admin message, unknown official letter fallback).
- Confirm the five answers read within a few seconds; the urgency line is calm,
  reflects the case-urgency level, and only mentions a date as a supplement; no
  fact is shown twice at the top; the detail disclosure is collapsed by default,
  toggles by keyboard and pointer, and safety, cannot-know, and uncertainty are
  visible without expanding anything.
- Confirm a low-urgency result never reads as "not urgent" and a result with no
  date never reads as "not urgent".
- Confirm the career result is visually unchanged.

## Risks And Non-Goals

Risks:

- Case urgency is heuristic and can be wrong (for example a phishing email marked
  high on a keyword). Mitigation: it is presented cautiously, never as a
  confirmed fact, always with a check instruction, and never as reassurance.
- Collapsing detail could hide safety information. Mitigation: safety,
  cannot-know, and uncertainty stay outside the disclosure; only routine detail
  collapses.
- Users could read a supplementary date as the reason for urgency. Mitigation:
  the date is clearly a "date to check" supplement and the urgency level is
  stated independently.

Non-goals:

- No new urgency, priority, or scoring engine; the urgency view only re-presents
  an existing value.
- No new extraction, classification, or routing.
- No change to what data is computed — only how existing safe data is arranged,
  labelled, and disclosed.
- No whole-result redesign; only the top orientation composition, one folded
  panel, one retired panel, and one detail disclosure.
- No money, entitlement, outcome, or advice claims of any kind.

## Resolved Decisions (from review)

- Urgency source is the existing `AdminCase.urgency`, presented cautiously; a
  date only supplements. Missing dates never mean "not urgent"; missing urgency
  means "unconfirmed".
- The top is reshaped, not given a duplicate five-row block.
- "Best next move" folds into the next action; "why this helps" may sit behind a
  small disclosure.
- "What to check first" is retired.
- The summary is "what matters"; money/evidence are not promoted above it.
- Routine detail sits behind one "See dates, money, evidence and questions"
  disclosure, collapsed by default consistently; safety, cannot-know, and
  uncertainty stay visible.
- Affected files may include the smallest `resultViewModel.ts` urgency-view
  change plus `ResultCaseSheet.tsx` and behavioural tests.

## Open Points — All Resolved

- Urgency wording per level is final (see Urgency Handling): high, medium, low,
  and unavailable/unconfirmed use the approved sentences; "not urgent" is never
  used and the result never claims nothing is time-sensitive.
- `bestNextMove.whyThisHelps` is retained behind a small, keyboard-accessible
  "Why this helps" disclosure inside the next-action area when it exists.
- Final labels: the overall heading is "Your result at a glance" and the
  routine-detail control is "See dates, money, evidence and questions".
