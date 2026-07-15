# Community Helper Controlled Intake v1

## What this is

A second, separate way to produce a Community Helper preparation pack inside
the existing gated Demo/tour page (`src/views/DemoTourView.tsx`), alongside
the four hardcoded synthetic demo scenarios already shipped there
(`handleRunCommunityDemo`). Where the existing demo only ever runs against
four fixed example letters, Controlled Intake v1 lets a person paste or type
their own text and choose "Prepare community support notes" to run the same
underlying pipeline against it.

This is a deliberately small, gated, explicit step - not a rollout of
Community Helper into the normal "Check a message" flow, not automatic
detection, and not a new document/file/photo intake surface.

## Product principle

**AdminAvenger helps prepare. You stay in control.**

Every surface this feature touches restates that plainly: nothing is sent,
saved, or shared until the person chooses to; nothing is decided on their
behalf; and every result is explicitly labelled as preparation only.

## Controlled manual intake only

The only input is a `<textarea>`. There is no file picker, no photo/camera
control, no drag-and-drop, and no OCR anywhere in this panel:

- The textarea's `onChange` handler only ever calls `setControlledIntakeText`
  - it never itself builds a pack or runs a check.
- A pack is only ever built inside `handleRunControlledIntake`, and only
  after the person explicitly clicks "Prepare community support notes".
- Typing, pasting, or leaving the textarea idle never triggers anything.

## Explicit user choice only

Reaching this panel takes three deliberate steps, none of them automatic:

1. From the normal Home screen, choose the small, secondary "Community
   support prep" beta/demo card (already gated behind `onOpenCommunityHelperDemo`
   - see the Community Helper Home Gated work this sits on top of).
2. Land on the Demo/tour page and scroll to "Try a community support demo".
3. Use the new "Prepare notes from text I choose to paste" panel immediately
   below the existing scenario grid, choose a role, paste or type text, and
   click "Prepare community support notes".

There is no route into this panel from HomeView's normal "Check a message"
flow, from inbox scanning, from the standard demo scenarios, or from the
workplace demo. `src/views/HomeView.tsx` is completely untouched by this
feature - it still only calls `onOpenCommunityHelperDemo()` to hand off to
the Demo/tour page, exactly as before.

## No normal classifier / autodetection

`handleRunControlledIntake` calls exactly the same three functions
`handleRunCommunityDemo` already calls, in the same order:

```
buildCommunityHelperPack -> buildResultViewModel -> buildAdviserExportPack
```

It never calls `analyseDecisionProblem`, `analyseAdminItem`, or anything
from the decision-engine classifier. Community Helper detection
(`detectCommunityHelperSituationType`) is deterministic, keyword-based
pattern matching local to `src/lib/communityHelperPack.ts` - the same
engine the synthetic demo scenarios already use. Pasting text into this
panel never feeds into, and is never fed by, the normal admin-letter
classifier.

## No OCR / file / photo intake

This panel has no file input, no `accept`/`capture` attributes, no camera
control, and does not import or reference `readTextFromImage`,
`extractPdfText`, `extractDocxText`, `PhotoCapturePanel`, or
`DocumentAttachmentArea`. The only way text reaches
`handleRunControlledIntake` is through the `controlledIntakeText` state set
by the textarea's `onChange`.

## No advice / outcome claims

Every result is built from the same safe, deterministic templates the
synthetic demo already uses, and carries the same boundary wording:

- "This is preparation only, not a professional assessment."
- "AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity,
  eligibility, equipment, or adaptations."
- "AdminAvenger helps prepare. You stay in control."
- Urgent, safeguarding-like text produces signposting only (no daily-life
  impact, admin barriers, key facts, evidence, or questions) - see
  `urgent_safeguarding_like_signpost` in `communityHelperPack.ts`.
- Financial admin concerns are recorded as facts to check, never as a
  finding of wrongdoing - "financial abuse proven", "money owed", "money
  saved", and "money recovered" never appear in this pack's output.

The result banner is clearly labelled "Community support preparation" and
"Controlled beta" - visibly distinct from the "Synthetic demo" label used
for the four hardcoded scenarios, so a reader always knows whether a result
came from a fixed example or from their own pasted text.

## Safety boundaries: reused, not reinvented

Nothing in this feature introduces a new builder, a new safety-wording list,
or a new rendering path. It only adds a second call site for the pipeline
the synthetic community demo already exercises:

- `buildCommunityHelperPack` (`src/lib/communityHelperPack.ts`) - unchanged.
- `buildResultViewModel` (`src/lib/resultViewModel.ts`) - unchanged.
- `buildAdviserExportPack` / `renderAdviserExportMarkdown`
  (`src/lib/adviserExportPack.ts`) - unchanged.
- `buildCaseProgress`, exercised automatically via `ResultCaseSheet`
  (`src/components/ResultCaseSheet.tsx`) - unchanged.
- `findForbiddenSafetyPhrases` / `normaliseSafetyText`
  (`src/lib/safetyWording.ts`) - unchanged, and used directly in this
  feature's own test file as an extra safety check on top of the
  feature-specific forbidden-phrase list.

`src/lib/communityHelperPublicBetaReadiness.ts` is also unchanged. Its
existing scan of the "Try a community support demo" section still covers
exactly the same text it always has, since the new panel is added as its
own section immediately after that one closes, not nested inside it.

## Unresolved risks before broader public launch

- **Real, messy pasted text is untested at scale.** The keyword-based
  detection in `communityHelperPack.ts` was tuned against a small set of
  synthetic examples. Real free-text input (typos, mixed topics, very long
  or very short pastes) may land in `community_helper_unknown` more often,
  or occasionally match the wrong situation type.
- **The role selector is self-reported and unverified.** "For myself",
  "Helping someone else", and "Supporting people through my work" only
  change which consent/control notes are shown - they cannot be checked,
  and someone could select the wrong one, intentionally or not.
- **No saved or persisted record.** A controlled intake result exists only
  in this browser tab's state; refreshing or navigating away loses it
  (matching the "nothing is saved" boundary wording, but worth flagging as
  a real usability limitation for a beta user).
- **No length or rate limiting.** The textarea accepts arbitrarily long
  pasted text with no client-side cap, and the button has no cooldown or
  rate limit beyond the existing `isChecking` guard.
- **Single UI surface, growing.** This is now the third piece of UI added
  to the same gated Demo/tour community section (scenario grid, controlled
  intake panel, result banner). If more controlled-intake-style features are
  added here, this page may need its own dedicated route rather than living
  entirely inside `DemoTourView.tsx`.

## Testing summary

`src/views/__tests__/CommunityHelperControlledIntake.test.tsx` covers:

- The panel and its required wording exist on the gated Demo/tour page.
- The panel is reachable only after the existing community section and
  scenario grid, and HomeView is untouched (no reference to the new state,
  handler, or builder anywhere in `HomeView.tsx`).
- HomeView's own normal "Check a message" flow is unchanged.
- The controlled intake handler itself never references the decision-engine
  classifier (`analyseDecisionProblem`, `analyseAdminItem`, `decisionEngine`,
  `classifier`), checked on the handler's own extracted source, not the
  whole file - the file's explanatory comments legitimately mention those
  names while explaining they are never called.
- The handler never references OCR, photo, or attached-file intake.
- The panel itself has no file/photo/OCR control.
- The textarea only ever updates text state on change; the pack is only
  built from the explicit button click.
- `communityHelperPublicBetaReadiness.ts` still reports 10/10 against the
  real, current source.
- Ordinary pasted text produces a full preparation pack with the required
  boundary wording.
- Urgent, safeguarding-like pasted text stays signposting-only.
- A pasted financial admin concern stays factual, with no financial-abuse,
  money-owed, money-saved, or money-recovered claims.
- The result is labelled "Controlled beta", distinct from "Synthetic demo".
- No auto-send/submit/contact wording appears anywhere in the panel.
- No OCR/file/photo/document intake module is referenced anywhere in
  `DemoTourView.tsx`.

## Possible next branch

- `community-helper-controlled-intake-polish-v1` - address the unresolved
  risks above (length/rate limits, wider real-text testing) without
  changing the safety boundaries.
- `community-helper-public-beta-v1` - if controlled intake proves stable,
  consider a wider rollout plan, still gated and still gathering only
  explicit, in-browser, non-persisted input.
