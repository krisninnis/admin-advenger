# Career Match Source Split v1

## Purpose

Career Job Advert Match v1 correctly recognised combined CV and job advert
inputs, but some extraction still read the whole combined text for both sides.
That meant advert requirements could appear as CV projects, education, or strong
evidence.

This branch separates the source text before extraction.

## Source Split

When AdminAvenger detects a combined CV and job advert match, it deterministically
splits the input into:

- CV-side text
- job-advert-side text

The split uses visible section markers such as CV, resume, professional profile,
key skills, projects, professional experience, education and training, job
advert, job description, about the role, responsibilities, requirements,
desirable skills, and how to apply.

## Extraction Rules

Advert-side text is used for:

- role/title clues found
- requirements found in the advert
- wording from the advert to review

CV-side text is used for:

- CV evidence that may match
- strong evidence to consider using
- projects to highlight
- experience to frame
- education/training to mention

## Role Title Clues

Role/title extraction now prefers title-like lines near the advert header and
filters weak headings such as job advert, about the role, responsibilities,
requirements, desirable skills, and how to apply.

## Safety Boundary

This remains preparation-only.

AdminAvenger helps prepare. You stay in control.

This branch does not add scraping, live job search, cloud calls, APIs,
analytics, applications, submissions, employer contact, ranking, percentages, or
guarantee claims.

No real personal CV data is used as a fixture.

## Tests

Tests cover:

- advert requirements not leaking into CV projects
- advert requirements not leaking into education/training
- advert intro paragraphs not leaking into CV evidence
- actual role title extraction ahead of weak headings
- CV-only and job-advert-only regressions
- normal subscription/admin regression
- no unsafe promise, ranking, percentage, or automation wording
- no network/live-job-search integration code
