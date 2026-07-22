# B1 Low-Confidence OCR Review State

Status: Completed

## Outcome

When a prepared photo scan has been approved and OCR extracts some text but the result is unreliable, AdminAvenger shows one honest recovery screen instead of exposing noisy OCR first.

## State Distinction

Preparation failure happens before OCR when the document cannot be prepared. It may offer "Use original photo anyway" as an explicit fallback with a warning that surrounding background may be read.

Low-confidence OCR happens after a prepared scan was approved, OCR completed, some text was extracted, and key details are deliberately hidden because the read is not reliable enough. This state must never show "Use original photo anyway" or claim document preparation failed.

## Approved Copy

Heading:

"We couldn't read this clearly enough"

Explanation:

"We found some text, but parts may be wrong or missing. We've hidden important details rather than guessing; a clearer photo will usually work better."

Key-details message:

"Key details are hidden because the photo was not clear enough."

Disclosure label:

"Review or edit the text we could read"

Disclosure help:

"This text may include mistakes or background text. Only use it if you can check it against the document."

Textarea label:

"Text to correct"

Expanded warning:

"Check this against the original document before continuing."

Privacy/control line:

"Your photo and extracted text are processed in this browser and are not uploaded to AdminAvenger. Nothing has been sent or saved to your cases."

## Action Hierarchy

1. Retake photo
2. Add a close-up
3. Upload a clearer photo
4. Review/edit extracted text, then Check corrected text
5. Cancel

## Constraints

- No prominent numeric OCR confidence in the ordinary user hierarchy.
- No automatic case save, send, upload, or money total update.
- No raw noisy text visible before deliberate disclosure.
- No fixed A4 guide or document-editing controls.
- Replacement photos must still pass through document preparation, prepared-scan review, approval, and OCR.

## Accessibility

- The state uses one H1 inside the review panel.
- A single polite live status announces that the photo was read but not clearly enough.
- The disclosure is keyboard-operable and focuses the text editor when opened.
- Actions use large touch targets and text labels; warning is not colour-only.
- Remaining checks: real-device 200% zoom, TalkBack/VoiceOver reading order, and uncoached recovery-path comprehension.

## Testing And Validation Evidence

Rendered component tests cover approved copy, action order, hidden noisy text, keyboard disclosure, focus, edited-text submission, upload-clearer routing, cancellation, and preparation-failure separation.

HomeView integration tests cover low-confidence delegation, prepared-preview wiring, corrected-text submission wiring, and stale OCR state clearing.

Full validation must pass before completion: focused tests, Journey 5 photo tests, public-scope tests, normal intake tests, `npm test`, `npm run lint`, `npm run build`, `scripts/verify.ps1`, and `git diff --check`.

## Real-Person Test Still Required

A five-minute uncoached mobile test should confirm that ordinary users notice what happened, understand that important details were withheld, choose a recovery action without reading noisy OCR first, and do not think anything has been sent or saved.

## Completion Note

- The implementation and automated validation are merged into main.
- Real-person mobile comprehension and accessibility checks remain part of the closed pilot.
- Those pilot checks are validation work, not unfinished production implementation.
