# Pilot Demo Flow v1

## Why This Exists

AdminAvenger needs a safe way for advisers, support workers, carers, and early
testers to try the product without uploading, photographing, or pasting a real
personal letter.

Pilot Demo Flow v1 provides synthetic examples that run through the same front
door as normal use:

Check a message

The purpose is to show how AdminAvenger helps prepare. The user stays in
control.

## Who It Is For

The demo flow is for:

- advisers and support workers evaluating the product
- carers helping someone understand the app
- early testers who do not want to use real sensitive documents
- product demos where screenshots may be shared
- internal regression checks against known synthetic cases

It is not a separate checker, a new engine, or a real case workflow.

## Why Synthetic Examples Are Used

Every demo must use synthetic prop-letter text only.

Synthetic examples help testers see realistic output while avoiding:

- real names
- real addresses
- real National Insurance numbers
- real benefit references
- real debt references
- real council or DWP letters
- real OCR outputs from private documents
- copied official wording

No real user letters, screenshots, photos, OCR outputs, or manually supplied
private examples should be added to the demo flow.

## How It Uses The Golden Letter Corpus

Demo scenarios are curated from the Golden Letter Corpus in
`src/lib/goldenLetters.ts`.

The demo helper references fixture IDs and uses the fixture text as the single
source of truth. This avoids maintaining a second set of fake letters that could
drift away from the safety regression suite.

The initial curated set covers:

- Universal Credit statement
- Universal Credit sanction
- PIP decision
- UC deductions
- parking/legal-looking letter
- debt collection letter
- consumer refund refusal
- suspicious message
- unclear letter

## What It Must Not Include

The demo flow must not include:

- real letters
- real screenshots
- real photos
- real addresses
- real claim, court, account, or benefit references
- copied government, creditor, council, court, provider, or charity wording
- analytics
- telemetry
- cloud sharing
- automatic adviser sharing
- automatic saving beyond the normal local app behavior
- automatic sending or submission

## No Analytics Or Telemetry

Demo usage must stay local.

AdminAvenger must not record which demo was used, send usage events, upload demo
content, or collect pilot analytics in this flow.

Future adviser feedback should avoid sensitive data by design and should be
explicitly separate from the demo checker.

## Demo Result Labels

When a demo creates a result, the result area must show:

Synthetic demo

It must also explain that the result came from a synthetic example, not a real
document.

The UI must not imply the user has a real benefits, debt, parking, consumer, or
scam case just because they clicked a demo.

## Safety Boundaries

Demo results still need the same boundaries as real checks:

- preparation only
- nothing has been sent
- nothing has been submitted
- AdminAvenger does not contact anyone for the user
- dates must be checked against the original document
- money is display-only
- what AdminAvenger cannot know remains visible
- adviser export stays local and user-controlled

The demo flow must not add claims about entitlement, outcomes, how strong a
case is, automatic action, or automatic money counting.

## How It Helps Pilots

The demo flow lets a pilot tester quickly see:

- what the front door feels like
- how a result case sheet is structured
- how uncertainty is shown
- how dates and money are treated cautiously
- how an adviser pack can be downloaded locally
- how suspicious or unclear messages degrade conservatively

This supports safe product conversations without asking anyone to disclose
private information just to understand the app.

## Future Improvements

- guided pilot script
- demo-only landing page
- adviser feedback form without sensitive data
- screenshot-safe demo mode
- printable test script
- demo scenario scorecards
