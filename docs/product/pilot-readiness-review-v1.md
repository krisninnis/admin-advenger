# Pilot Readiness Review v1

## Current Product Status

AdminAvenger is ready for careful pilot testing with synthetic examples and
small, guided sessions.

Current strengths:

- one front door: Check a message
- local text, file, photo, and OCR intake
- deterministic decision-engine routing
- Result Page v2 composed case sheet
- Benefits Action Pack and Strategic Next Step outputs behind the result
- Adviser Export Pack as a local Markdown download
- Trust & Safety page
- Free-Forever Covenant page
- Settings page with Local Data Control
- Golden Letter Corpus with synthetic fixtures
- Demo / tour page using safe synthetic examples

The pilot posture is preparation-only:

AdminAvenger helps prepare. You stay in control.

## What Is Ready For Pilot Testing

Ready to show:

- checking pasted synthetic letters
- checking uploaded text and local photo/OCR flows with caution
- explaining what a document appears to be
- showing dates to check against the original letter
- showing money as display-only
- showing what AdminAvenger cannot know
- showing uncertainty and missing evidence
- preparing editable drafts or checklists where available
- downloading a local adviser pack
- clearing local AdminAvenger data from Settings
- explaining Trust & Safety boundaries

## What Is Not Ready

Do not present these as live:

- account sync
- real inbox connection
- remote adviser sharing
- organisation workflows
- analytics or telemetry
- cloud backup
- automatic sending
- automatic submission
- PDF export
- adviser-reviewed output formats
- broad public promotion

## Safe Demo Path

Recommended demo path:

1. Open Demo / tour.
2. Select the Universal Credit sanction or PIP decision synthetic example.
3. Run the demo check.
4. Review Result Page v2.
5. Point out date and money safety wording.
6. Point out the What AdminAvenger cannot know section.
7. Download the adviser pack.
8. Open Trust & Safety.
9. Open Settings and show Local Data Control.
10. Clear local AdminAvenger data if the pilot session needs a clean finish.

## No-Real-Letter-First Rule

Start every pilot with Demo / tour.

Do not ask a tester to paste, upload, photograph, or screenshot a real personal
letter before they have seen the synthetic demo and understood the boundaries.

If a tester chooses to use a real document later, remind them:

- they can remove passwords or account numbers first
- OCR and extracted dates may be wrong
- money is display-only
- nothing is sent
- nothing is submitted
- they decide what happens

## How To Use Demo / Tour

Demo / tour is a dedicated page in the sidebar.

It uses curated synthetic examples from the Golden Letter Corpus. The demo
result is labelled:

Synthetic demo

The label explains that the result came from a synthetic example, not a real
document.

The demo page runs the normal local check path and renders the same Result Page
v2 case sheet. It does not upload data, store demo usage remotely, send
anything, or submit anything.

## How To Show Trust & Safety

In a pilot session, show Trust & Safety after the first demo result.

Point out:

- what stays local in this version
- adviser packs download to the user's device
- dates must be checked against the original document
- money is display-only
- AdminAvenger does not contact anyone
- AdminAvenger does not replace specialist advice

## How To Show Local Data Control

Open Settings and show Local Data Control.

Explain:

- it lists known AdminAvenger browser data
- clearing data affects this browser on this device
- downloaded adviser packs and backups are files controlled by the user
- clearing local data does not contact anyone or cancel anything

## How To Show Adviser Export Pack

After running a demo:

1. Use Download adviser pack from the result case sheet.
2. Explain that it creates a Markdown file.
3. Explain that AdminAvenger does not upload or send the file.
4. Open or describe the file as a preparation pack for the user to review.
5. Remind the tester that the user chooses who sees it.

## Pilot Test Script

Use these questions with support workers, advisers, carers, and early testers:

- Does the result make sense?
- Is anything too strong or risky?
- Would this help someone explain their situation faster?
- Is anything missing before you could use this with someone?
- Is the adviser pack useful?
- Is the Trust & Safety wording clear?
- Would the user know nothing has been sent or submitted?
- Would you trust the local data control explanation?
- What would stop you using this?

## Adviser And Support-Worker Feedback

Ask for plain feedback, not sensitive case details.

Useful prompts:

- Which section would you read first?
- Which section would you remove or shorten?
- Did the result make uncertainty clear enough?
- Did the result make dates and money cautious enough?
- Did the adviser pack include the right level of detail?
- Would this reduce time spent untangling a first conversation?
- Where would you want signposting to specialist help?

Do not collect real names, references, screenshots, photos, or document text as
part of informal pilot feedback.

## Risk Register

| Risk | Current mitigation | Future mitigation |
| --- | --- | --- |
| User thinks the app gives advice | Trust & Safety, preparation-only wording, cannotKnow, cautious copy | Adviser-reviewed high-stakes copy and clearer in-result advice boundary |
| User thinks the app sent something | Result Page v2 says nothing is sent or submitted | Stronger post-draft review screen and repeated no-send cues |
| User trusts OCR or date extraction too much | OCR confidence warnings and date check wording | Source-highlight review and OCR confidence explainer |
| User misreads display-only money as payable or recoverable | Money wording says display-only and not counted | More visual separation between mentioned amounts and user-confirmed outcomes |
| User uploads sensitive real data during demo | Demo / tour uses synthetic examples and no-real-letter-first guidance | Dedicated screenshot-safe demo mode |
| Adviser pack contains too much sensitive detail | Local Markdown only and user-controlled sharing | Redaction preview before download |
| UI feels overwhelming | Result Page v2 composes engine outputs into one case sheet | Mobile usability testing and plain-English readability review |
| Support worker needs organisation workflow later | Current pilot focuses on individual preparation only | Future helper mode with explicit consent and privacy boundaries |

## Stop/Go Checklist

Use this before wider public promotion.

Go only if:

- Demo / tour works without real documents
- Trust & Safety is easy to find
- Settings clearly shows Local Data Control
- adviser pack download works locally
- date warnings are visible
- money display-only wording is visible
- cannotKnow is visible
- no demo output implies advice, entitlement, automatic action, or outcome certainty
- support workers understand that nothing is sent or submitted

Stop and fix if:

- a tester thinks AdminAvenger has decided the answer for them
- a tester thinks AdminAvenger contacted an organisation
- a tester thinks a date has been verified by the app
- a tester thinks a money amount has been checked as correct
- a tester cannot find how to clear local data
- a tester feels pressured or frightened by the copy
- the adviser pack feels too sensitive to download without redaction

## Remaining Risks Before Wider Public Promotion

- OCR may still misread unclear photos
- high-stakes letters can still require specialist advice
- users may paste more sensitive information than needed
- advisers may need organisational workflows that are not built yet
- Markdown adviser packs may need redaction support
- mobile sessions may need more usability testing
- public copy must keep explaining that AdminAvenger prepares rather than acts

## Pilot Boundary

Pilot testing should measure whether AdminAvenger helps people understand,
organise, and prepare more safely.

It should not measure whether AdminAvenger can replace an adviser, decide a
person's rights, contact an organisation, or file something for the user.
