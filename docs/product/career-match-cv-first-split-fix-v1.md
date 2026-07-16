# Career Match CV-First Split Fix v1

## Purpose

Career Match Evidence Map v1 works only if CV text and job-advert text stay
separate. This fix handles the common paste order:

1. CV
2. JOB ADVERT

The splitter now treats the explicit `JOB ADVERT` marker as the boundary. Lines
before it remain CV-side evidence. Lines from it onward become advert-side
requirements.

## What Changed

- CV-first combined inputs split at the explicit job-advert marker.
- Job-advert-first combined inputs still split at the explicit CV marker.
- Generic headings such as `Responsibilities` or `Requirements` are no longer
  allowed to steal the boundary when an explicit CV/job-advert marker exists.
- Role clues and requirements come from advert-side text.
- Possible evidence comes from CV-side text.

## Safety Boundary

This remains preparation-only career support.

AdminAvenger helps prepare. You stay in control.

The app does not:

- score the match
- say the user is suitable or qualified
- promise interviews or outcomes
- make applications for the user
- send anything automatically
- contact employers or recruiters
- scrape job sites
- call cloud or external APIs

## Regression Coverage

Tests use synthetic CV and advert text only. They check that:

- CV-side project and skills lines do not become advert requirements
- CV-side work-history role titles do not become role clues
- the actual advert role title is found
- advert requirements map to CV-side evidence
- no scoring, guarantee, auto-apply, auto-send, or employer-contact wording is
  introduced
