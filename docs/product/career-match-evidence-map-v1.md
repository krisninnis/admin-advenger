# Career Match Evidence Map v1

## Purpose

Career Job Advert Match already detects combined CV and job advert inputs and
keeps the CV side separate from the advert side. This branch makes the output
more useful by mapping each advert requirement to possible CV evidence.

The map is preparation-only. It does not rank the user, decide suitability, or
predict an outcome.

AdminAvenger helps prepare. You stay in control.

## What The Map Shows

Each map item contains:

- requirement from the advert
- possible CV evidence to consider
- one example to prepare before applying
- a check-before-using note

## How It Works

The map is deterministic and local.

It uses:

- advert-side text for requirements
- CV-side text for possible evidence
- practical categories such as records/admin/data, Excel/spreadsheets, IT and
  software support, web development, communication, GDPR/privacy, organisation,
  problem solving, new systems, projects/portfolio, and education/computing

No score, percentage, ranking, scraping, cloud call, API call, or employer
contact is added.

## Safety Boundary

Use careful wording:

- possible CV evidence to consider
- may support this requirement
- prepare an example
- check before using
- tailor only where accurate

Do not claim suitability, promise outcomes, or imply automatic action.

## Test Coverage

Tests cover:

- requirement-by-requirement evidence map generation
- spreadsheet/data requirements mapping to CV-side Excel/data/admin evidence
- IT/web requirements mapping to computing, project, GitHub, and web evidence
- GDPR/privacy requirements using only CV-side GDPR/privacy evidence when present
- advert wording not leaking into CV evidence
- CV-only, job-advert-only, and subscription/admin regressions
- absence of unsafe ranking, outcome, percentage, or automation wording
- absence of network/live-job-search integration code
