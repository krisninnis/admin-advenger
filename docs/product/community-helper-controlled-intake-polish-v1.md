# Community Helper Controlled Intake Polish v1

## What changed

This polish pass improves the existing Community Helper Controlled Intake panel
inside the gated Demo/tour page. It does not change routing, classifiers,
decision engines, OCR, file intake, photo intake, or the Community Helper
safety model.

The panel now has:

- clearer plain-English copy explaining that the user can paste a short message,
  notes, or a summary
- a stronger local-control reminder
- three small "Try example wording" chips
- clearer helper text explaining that examples only fill the text box
- a small privacy reminder below the textarea
- slightly roomier spacing and a more readable panel layout

## Example chips

The three starter examples are:

- Missed letters/deadlines
- Support visit notes
- Money/admin concern

Clicking a chip only calls `setControlledIntakeText(example.text)`.

It does not:

- build a Community Helper pack
- run `handleRunControlledIntake`
- call the normal analyser
- call the decision engine
- call OCR, file, photo, or document intake
- save, send, submit, share, or contact anyone

The user must still click "Prepare community support notes" before a result is
prepared.

## Safety wording kept visible

The panel continues to show:

- Preparation only.
- AdminAvenger helps prepare. You stay in control.
- Manual text only.
- Nothing is sent, saved, or shared automatically.
- This is not legal, care, medical, benefits, or safeguarding advice.
- If urgent or someone may be unsafe, contact an appropriate person or service
  directly.

## Boundaries unchanged

This branch deliberately does not add:

- normal HomeView analyser routing
- automatic Community Helper detection
- classifier or decision-engine integration
- OCR, file, photo, camera, or document intake
- cloud calls
- hidden processing
- automatic sending, submitting, contacting, saving, or sharing
- legal, care, medical, benefits, safeguarding, capacity, diagnosis,
  eligibility, equipment, adaptation, council-obligation, or financial-abuse
  advice

## Tests

`src/views/__tests__/CommunityHelperControlledIntake.test.tsx` now also checks:

- the example chips are present
- the chips only fill the textarea
- the chips do not build a result
- the prepare button remains the only build trigger
- the panel still has no file/photo/camera/OCR controls
- HomeView, classifier, decision engine, OCR, file, photo, and document intake
  paths remain untouched

## Follow-up risks

This is still a controlled beta surface. The examples are synthetic helpers,
not a broad public intake pattern. Wider rollout would need separate review,
especially around confusing real-world text, safeguarding-like wording, and
how users understand the difference between preparation and advice.
