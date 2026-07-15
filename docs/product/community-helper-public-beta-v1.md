# Community Helper Public Beta v1

## What changed

Community Helper is now presented as a controlled public beta inside the
existing gated Demo/tour surface.

The Home card now says "Controlled public beta" and continues to act only as a
secondary navigation entry. It opens the Demo/tour page; it does not analyse
the main Home message, and it does not connect Community Helper to the normal
Check a message analyser.

The controlled intake panel now makes its status clearer:

- Public beta
- Manual text only
- Preparation only
- Nothing is sent, saved, or shared automatically
- AdminAvenger helps prepare. You stay in control.
- This is not legal, care, medical, benefits, or safeguarding advice.
- If urgent or someone may be unsafe, contact an appropriate person or service
  directly.

## Controlled public beta scope

This beta is intentionally narrow. It lets a user type or paste text into the
controlled intake textarea on the Demo/tour page and then explicitly click:

Prepare community support notes

Only then does AdminAvenger build the existing Community Helper preparation
pack locally in the browser.

## Manual text only

The controlled intake panel has one input path:

- a manual textarea

It does not have:

- file upload
- photo upload
- camera capture
- OCR
- drag and drop document intake
- document parsing

The example chips are synthetic starter wording. Clicking a chip only fills the
textarea. It does not prepare a result.

## Explicit user action

Community Helper output is only prepared after the user explicitly clicks the
prepare button. Typing, pasting, choosing an example chip, opening the page, or
navigating from Home does not build a pack.

## No auto-detection

Community Helper is not automatically detected from pasted Home text. HomeView
does not import or call `buildCommunityHelperPack`, and it does not route the
normal analyser into Community Helper.

## No OCR, file, or photo intake

This branch does not connect Community Helper to OCR, file upload, photo
capture, camera capture, document attachment, PDF parsing, DOCX parsing, or
any other intake path.

## Safety boundaries

Community Helper remains preparation-only. It must not give or imply:

- legal advice
- benefits advice
- care advice
- medical advice
- safeguarding advice
- diagnosis
- capacity decisions
- care eligibility decisions
- safeguarding decisions
- risk scores
- eligibility scores
- equipment or adaptation recommendations
- council obligation claims
- financial-abuse conclusions
- money owed, saved, or recovered claims
- qualification or outcome guarantees
- case strength

It must not send, submit, contact, save, share, or upload anything
automatically.

## Unresolved risks before any broader launch

- Real pasted text can be messy, ambiguous, or mixed across several issues.
- Users may still confuse preparation with advice, especially in urgent or
  safeguarding-like situations.
- The role selector is self-reported and cannot be verified.
- Controlled intake results are not persisted as a formal record.
- The textarea still accepts long free text without a dedicated length limit.
- Wider public launch would need real-world usability review, especially for
  safeguarding-like wording and financial admin concerns.

## Suggested next branch

Recommended follow-up:

- `community-helper-public-beta-hardening-v1`

Alternative:

- `community-helper-usage-feedback-v1`

Either branch should keep the current model: controlled, gated, manual,
local-first, and preparation-only.
