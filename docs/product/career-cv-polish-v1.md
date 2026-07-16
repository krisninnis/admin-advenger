# Career CV Polish v1

## Purpose

Career CV Polish v1 makes CV results feel like CV review and career
preparation, not a reused admin-letter result.

AdminAvenger helps prepare. You stay in control.

## Problems Fixed

- CV best-next-move copy no longer asks the user to identify sender, date,
  reference, or deadline.
- CV actions no longer use email/admin wording such as "Check email safety" or
  "Create draft message".
- Project extraction is more careful about contact details, profile text, and
  headings.
- Education/training extraction is more careful about keeping education and
  training items separate from profile paragraphs.
- Career uncertainty now uses CV-specific review wording instead of generic
  reply/pay/click/submit warnings.

## Career Best Next Move

The CV result now uses:

- **Choose the target role before editing the CV**
- Pick the job type or job advert first, then tailor the strongest evidence,
  projects, skills, and training to that role.
- A CV is stronger when it is tailored to a specific role instead of being
  reviewed in isolation.

## Career Actions

The Home result uses career-specific actions:

- Save CV review
- Mark reviewed
- Ignore

This branch does not add a target-job-advert flow or application draft flow.
Those would be future features and need their own safety review.

## Extraction Rules

Projects prefer content near:

- Projects / Portfolio
- GitHub Projects
- Memephant
- AdminAvenger
- portfolio project

Projects avoid:

- phone numbers
- email addresses
- contact lines
- professional profile paragraphs
- section headings alone

Education/training prefers content near:

- Education & Training
- BSc
- Open University
- modules
- Excel Skills Training
- GDPR
- NVQ

Education/training avoids duplicating professional profile paragraphs.

## Safety Boundary

The CV result must not say or imply:

- guaranteed interviews
- the user will get the job
- the user qualifies
- an employer will like this
- this is the best CV
- experience is proven beyond the supplied text
- AdminAvenger can apply, submit, send, or contact employers automatically

## Not Added

This branch does not add:

- job scraping
- live job search
- LinkedIn or Indeed integration
- analytics
- cloud calls
- automatic sending
- automatic submitting
- employer contact
- scoring
- real personal CV fixtures

## Tests

Tests cover:

- CV best-next-move avoids sender/date/reference/deadline wording
- CV result actions avoid email and generic draft-message wording
- projects avoid phone/email/profile noise
- education avoids professional profile paragraphs
- career uncertainty avoids generic pay/click/reply admin wording
- standard admin results keep their existing date, money, action, and safety
  wording
- no unsafe career promises or automation wording appear
