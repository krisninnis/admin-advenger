# Career Job Advert Match v1

## Purpose

Career Job Advert Match v1 lets AdminAvenger recognise when pasted or uploaded
career material contains both CV evidence and job-advert requirements.

The output is preparation-only. It helps the user compare what the advert asks
for with evidence from the CV, then decide what to review before applying.

AdminAvenger helps prepare. You stay in control.

## What It Shows

- role or title clues found
- requirements found in the job advert
- CV evidence that may match those requirements
- strong evidence to consider using
- wording from the advert to review
- examples to prepare before applying
- claims to verify before sending
- next preparation steps

## Safety Boundary

This is not a suitability decision and not recruitment advice.

The feature must use careful wording such as:

- may match
- evidence to consider using
- possible gaps to check
- review before sending
- tailor only where accurate

It must not:

- rank the user against the advert
- use percentages
- claim suitability
- promise recruitment outcomes
- predict employer response
- apply, submit, send, or contact employers for the user

## Technical Fit

The v1 implementation extends `src/lib/careerSupportPack.ts` instead of adding a
new user-facing checker. It still routes through Check a message, mock analysis,
AdminFinding, AdminCase, ResultViewModel, and ResultCaseSheet.

No scraping, live job search, cloud calls, APIs, analytics, accounts, or employer
contact were added.

## Test Coverage

Tests use synthetic CV and advert text only.

They cover:

- CV plus advert detection
- CV-only regression
- job-advert-only regression
- normal subscription/admin regression
- requirements and CV evidence extraction
- rendered result sections
- absence of unsafe promise, ranking, percentage, or automation wording
- absence of network/live-job-search integration code
