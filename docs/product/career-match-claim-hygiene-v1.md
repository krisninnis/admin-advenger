# Career Match Claim Hygiene v1

## Purpose

Career match output should help a user compare a CV with a job advert without
amplifying inflated or unsupported CV wording.

This branch adds a cautious claim-hygiene layer for CV and job-advert match
results. It keeps possible evidence useful, but moves risky or unsupported
claims into verification notes.

AdminAvenger helps prepare. You stay in control.

## What It Handles

The hygiene layer looks for CV-side wording that sounds inflated, unsupported,
or difficult to evidence, including:

- certainty or market-leading claims
- advanced-skill claims without supporting examples
- broad project claims without links, screenshots, repo evidence, or scoped
  contribution detail
- financial-performance or trading automation claims

## Output Behaviour

For CV/job-advert match results:

- requirement evidence uses advert requirements and CV-side evidence only
- raw inflated claims are not shown as normal possible evidence
- unsupported project claims are not shown as strong evidence
- cautious notes are added to `claimsToVerify` and possible gaps
- normal project, education, GitHub, spreadsheet, admin, and experience evidence
  still appears when it is concrete enough

## Safety Boundary

This is preparation-only career support.

The feature does not:

- score the match
- rank the user
- say the user is suitable
- promise interviews or outcomes
- send anything
- make applications for the user
- contact employers or recruiters
- scrape job sites
- call cloud or external APIs

## Test Coverage

Tests use synthetic CV and advert text only. They check that:

- risky CV-side claims do not appear as possible evidence
- unsupported project claims do not appear as strong evidence
- verification notes are added for claims that need checking
- normal strong CV evidence still works
- weak CV evidence stays cautious
- CV-only, job-advert-only, and normal admin flows remain unchanged
- no scraping, cloud, API, scoring, or automatic action path is added

