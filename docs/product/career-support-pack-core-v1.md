# Career Support Pack Core v1

## Purpose

Career Support Pack Core v1 stops CVs, resumes, cover letters, job adverts, and
application material from being treated as ordinary life-admin messages.

The goal is preparation only:

- recognise obvious career or job-search documents
- prepare review notes the user can check
- highlight strengths and evidence already visible in the text
- show possible gaps to review before applying
- suggest safer wording principles without inventing experience

AdminAvenger helps prepare. You stay in control.

## Scope

This v1 supports local deterministic preparation for:

- CVs and resumes
- cover-letter material
- job adverts and job descriptions
- application answers and supporting statements

It does not add a job board, live search, application tracking, external
employer lookup, account system, analytics, or automatic sending.

## User Safety Boundary

Career Support Pack must not say or imply:

- the user will get the job
- the user is guaranteed interviews
- the user qualifies for a role
- the CV is the best possible CV
- the document proves experience beyond what the user supplied
- the user should lie, inflate, or add untrue experience
- AdminAvenger has submitted, sent, applied, or contacted anyone

Use cautious preparation wording:

- "appears"
- "review"
- "check"
- "evidence to highlight"
- "possible gaps"
- "editable wording"
- "before using it"

## How It Works

The core helper lives in:

`src/lib/careerSupportPack.ts`

It exposes:

- `detectCareerSupportDocumentType(text)`
- `isCareerSupportDocument(text)`
- `buildCareerSupportPack({ text })`

The detector uses explicit career signals such as:

- CV
- curriculum vitae
- resume
- professional profile
- key skills
- technical skills
- projects
- portfolio
- GitHub
- professional experience
- work experience
- education and training
- references available upon request
- cover letter
- job advert
- job description
- application

## Integration

The existing `analyseAdminItem` path now checks for obvious career material
before normal admin keyword findings.

If a career document is detected, AdminAvenger returns a career preparation
finding and does not continue into subscription, bill, complaint, refund, or
generic admin-letter rules.

This keeps the single front door intact:

Check a message -> local intake -> career guard -> preparation finding -> save
flow if the user chooses.

## Data And Privacy

Career Support Pack Core v1 is local deterministic code.

It does not:

- upload text
- call an API
- scrape job sites
- search LinkedIn, Indeed, or other sites
- contact employers or recruiters
- send applications
- store account-level tracking

No real user CV is used as a fixture. Tests use synthetic career text only.

## Output Fields

The structured pack includes:

- document type
- summary
- likely target roles
- strengths to highlight
- evidence to use
- projects to highlight
- experience to frame
- education and training
- possible gaps to check
- safer rewrite suggestions
- next preparation steps
- safety notes
- confidence and reason

## Testing

The v1 tests cover:

- synthetic CV detection
- synthetic job advert detection
- CVs not producing subscription findings
- normal subscription text still producing subscription findings
- strengths, evidence, projects, and next steps
- unsafe career promises staying absent
- no network, live job-search, or job-board integration code

## Future Work

Possible future branches, still preparation-only:

- richer CV section review
- editable career result panel
- cover-letter checklist
- job advert comparison notes
- adviser/export format for employment support workers
- better OCR handling for photographed CVs

Any future work must preserve the boundary that AdminAvenger prepares, and the
human decides what to use or share.
