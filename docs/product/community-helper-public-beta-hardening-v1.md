# Community Helper Public Beta Hardening v1

## Purpose

This hardening pass protects the shipped Community Helper Public Beta without expanding its product scope.

Community Helper remains a controlled, manual-text preparation surface for carers, family helpers, support workers, and trusted people who need help turning messy notes into safer preparation notes. It is not part of the normal Home analyser route.

## Safety model preserved

- Preparation only.
- Manual text only.
- AdminAvenger helps prepare. You stay in control.
- Nothing is sent, saved, or shared automatically.
- Not legal, care, medical, benefits, or safeguarding advice.
- If urgent or someone may be unsafe, contact an appropriate person or service directly.

## Scope boundaries

This hardening pass must not add:

- automatic Community Helper detection
- HomeView normal analyser routing
- classifier or decisionEngine integration
- OCR, file, photo, camera, capture, or document-intake integration
- cloud or API calls
- auto-send, auto-submit, or auto-contact behaviour
- hidden processing
- eligibility, risk, or case-strength scoring
- money saved, recovered, owed, or counted totals
- safeguarding, capacity, diagnosis, care, equipment, adaptation, or council-obligation decisions

## Hardening coverage

The readiness checker and regression tests scan public-beta-facing surfaces for forbidden wording:

- Home gated card
- controlled intake panel
- controlled result banner
- readiness report wording
- demo scenario outputs
- shared adviser export boundary constants

The forbidden wording includes scoring language, outcome guarantees, automatic-action claims, money-counting claims, safeguarding/capacity/diagnosis claims, and equipment/adaptation/council-obligation decisions.

## Controlled intake behaviour

The controlled intake remains explicit:

- example chips only fill the textarea
- typing only updates local textarea state
- the prepare button is the only build trigger
- no file, photo, camera, OCR, or document controls appear in the controlled intake panel
- the handler builds a Community Helper pack only from text the user chose to paste

## Unsafe-topic edge cases

Hardening tests cover:

- urgent safeguarding-like wording staying signposting-only
- financial admin concerns staying factual and non-accusatory
- capacity, diagnosis, equipment, and adaptation wording remaining uncertainty/cannot-know material rather than decisions

## Remaining risks

The beta is still a preparation tool, not advice. It may help organise notes, but it cannot know the full situation, verify facts, decide professional duties, or replace direct contact with appropriate people or services when someone may be unsafe.

Future branches should continue to treat Community Helper as a controlled, opt-in surface unless a separate product decision explicitly changes that scope.
