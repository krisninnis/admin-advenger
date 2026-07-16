# Career CV Detail Polish v1

## Purpose

This polish pass cleans up the CV result after Career CV Polish v1.
AdminAvenger now acknowledges career documents in the main Check a message
copy and presents CV review details with less noisy extraction.

## What Changed

- Home copy now mentions bills, emails, letters, CVs, job adverts, and messages.
- Project extraction prefers real project or portfolio entries such as named
  projects, GitHub evidence, and portfolio descriptions.
- Project extraction filters out contact details, section headings, broad skills
  headings, and profile text.
- Education and training extraction prefers actual courses, modules, degree
  wording, university wording, NVQ/certification wording, Excel training, and
  GDPR course wording.
- Education and training extraction avoids broad professional-profile and
  generic technical-skills lines.
- Strength labels now use human-readable CV review language instead of
  robotic keyword wrappers.

## Safety Boundary

Career Support Pack remains preparation-only.

AdminAvenger helps prepare. You stay in control.

It does not:

- guarantee interviews or outcomes
- claim the user qualifies for a role
- score a CV
- say a CV is the best CV
- say experience is proven
- make applications or submissions for the user
- contact employers or recruiters for the user
- scrape jobs or use live job-search services

## Testing Notes

The automated tests use synthetic CV/job advert/admin text only. Real personal
CV data must not be committed as a fixture.

Tests cover:

- CV/job advert support in Home copy
- CV project filtering
- CV education/training filtering
- human-readable strength labels
- subscription/admin routing remaining unchanged
- forbidden career promise and automation wording staying absent
