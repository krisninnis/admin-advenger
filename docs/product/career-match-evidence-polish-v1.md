# Career Match Evidence Polish v1

## Purpose

Career match output should be easy to trust. Earlier versions kept CV and
advert text separate, but some output was still too broad:

- advert intro paragraphs could appear as requirements
- helper text could appear as evidence
- section headings or bare role titles could appear as evidence
- developer adverts could show unrelated admin/data evidence
- data/admin adverts could show unrelated web-development evidence

This branch keeps the existing CV plus job-advert match flow, but makes the
evidence selection more conservative and role-aware.

AdminAvenger helps prepare. You stay in control.

## Behaviour

For CV plus job-advert match results:

- requirements prefer actionable lines under responsibilities, requirements,
  essential skills, desirable skills, or required skills
- broad `About the role` prose stays review wording, not a primary evidence-map
  requirement
- helper/template fallback text is removed from evidence lists
- bare section headings and standalone role titles are removed from evidence
- developer adverts prioritise web, UI, GitHub, React, TypeScript, testing,
  accessibility, responsive design, and component evidence
- data/admin adverts prioritise Excel, CRM, records, documentation, GDPR, data
  checks, and process notes
- weak CVs keep clear gap wording instead of inventing technical proof
- claim-hygiene warnings still move risky claims into verification notes

## Safety Boundary

This remains preparation-only career support.

The feature does not:

- score the match
- rank the person
- say the person is suitable
- promise interviews or outcomes
- send anything
- make applications for the user
- contact employers or recruiters
- scrape job sites
- call cloud or external APIs

## Test Coverage

Tests use synthetic CV and advert text only. They cover:

- strong front-end CV plus front-end advert
- strong data/admin CV plus data/admin advert
- data/admin CV plus front-end advert
- weak CV plus front-end advert
- overclaiming CV claim hygiene
- CV-only, job-advert-only, and normal admin/subscription regressions
- absence of scoring-style output, outcome promises, app-sent messages, and
  employer-contact wording
