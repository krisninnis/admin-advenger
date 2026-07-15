# Community Helper Usage Feedback v1

## Purpose

Community Helper Public Beta users may need a simple way to note whether the prepared output was useful. This v1 adds a small feedback panel after a controlled-intake result so beta testers can capture lightweight feedback while staying inside AdminAvenger's local-first safety model.

## Product boundary

This is not analytics. It is not account tracking. It is not cloud feedback collection. It is not behaviour scoring.

The panel is shown only after a Community Helper controlled-intake result. It is not shown for the normal Home analyser, synthetic demo results, OCR/photo/file intake, or other decision-engine paths.

## What the panel asks

- Was this useful?
- What was unclear or missing?
- What would make the output easier to use next time?

The user can save a local confirmation or clear the local feedback draft.

## Local-only behaviour

Feedback is held in React state for the current browser session. It is not written to localStorage, not uploaded, not sent, not submitted, and not shared automatically.

The panel states:

- "This feedback stays on this device unless you choose to copy or share it."
- "It is not analytics, and AdminAvenger does not send it anywhere."

## Safety wording

The feedback panel keeps the same Community Helper public beta boundaries visible:

- Preparation only.
- Manual text only.
- AdminAvenger helps prepare. You stay in control.
- Nothing is sent, saved, or shared automatically.
- Not legal, care, medical, benefits, or safeguarding advice.

## Scope exclusions

This v1 must not add:

- analytics SDKs
- network requests
- cloud or API calls
- account or user tracking
- auto-send, auto-submit, or auto-contact behaviour
- classifier or decisionEngine integration
- OCR, file, photo, camera, capture, or document-intake integration
- automatic Community Helper detection
- advice, outcome, risk, eligibility, or case-strength scoring

## Tests

Regression tests cover:

- the feedback panel appears only after a controlled Community Helper result
- the panel is absent from pre-result/manual intake behaviour
- save and clear feedback only update local UI state
- no network, storage, classifier, decisionEngine, OCR, file, photo, or document-intake references are added
- safety boundary wording remains visible
