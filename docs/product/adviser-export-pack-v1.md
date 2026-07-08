# Adviser Export Pack v1

## Why this exists

AdminAvenger helps people turn confusing letters into a calmer, safer preparation record. Some users will want to take that record to a support worker, advice service, trusted family member, or their own paper file.

The Adviser Export Pack gives them one Markdown file with the important preparation information in a readable order.

It is preparation support only. It is not a new decision engine and it does not replace legal, benefits, debt, financial, immigration, housing, employment, or medical advice.

## Who it is for

The pack is for:

- a user who wants to print or save the result
- a user who wants to show a trusted person what the letter appears to be about
- a support worker or adviser who needs a short preparation summary
- future Helper Mode workflows where someone assists the user with permission

## What it includes

The v1 Markdown pack includes:

- what the document appears to be
- why it may matter
- AdminAvenger's confidence in the document read
- uncertainty
- what may happen next or which route needs checking
- key dates to check
- money mentioned as display-only
- evidence already seen
- documents or evidence to bring
- questions to answer
- what AdminAvenger cannot know
- draft or checklist content when one exists
- preparation-only, no-send, no-submit, and not-advice footer lines

## What it must not include

The pack must not include:

- outcome prediction
- entitlement wording
- case strength wording
- legal, benefits, debt, financial, immigration, housing, employment, or medical advice
- claims that a user should pay, not pay, appeal, cancel, submit, or ignore
- claims that money has been saved, recovered, or is owed
- auto-send, auto-submit, upload, sharing API, email, or cloud wording
- a privacy-revealing filename

## Preparation-only boundary

The pack must always explain:

- AdminAvenger helps prepare; the user stays in control
- nothing has been sent or submitted by AdminAvenger
- the pack is not legal, benefits, debt, financial, or immigration advice
- dates must be checked against the original letter
- money is display-only and not counted

## Local-only and download-only behaviour

The v1 button creates a local Markdown download in the browser. It does not upload the pack, share it, email it, call an API, or send it anywhere.

The user decides whether to save, print, delete, or show the file to someone they trust.

## Filename privacy rules

The filename is always:

`adminavenger-adviser-pack.md`

The filename must not contain:

- user name
- document type
- benefit type
- debt type
- reference number
- organisation name
- money amount
- case outcome

## Safety wording rules

The rendered Markdown must pass the same forbidden wording checks as the main result surfaces.

It must avoid wording such as:

- "you will win"
- "you qualify"
- "DWP is wrong"
- "you are owed"
- "money saved"
- "game theory"
- "sent automatically"

If source-letter wording contains risky phrases, the pack should still frame AdminAvenger's own output cautiously and preserve the decision boundary.

## How it uses ResultViewModel

The pack is derived from the existing decision result and ResultViewModel. It does not re-classify documents or create new facts.

ResultViewModel provides the composed title, summary, key dates, money lines, evidence, questions, uncertainty, cannotKnow, and draft/checklist display content.

The Adviser Export Pack builder adds export-specific framing and required safety lines.

## How it uses the Golden Letter Corpus

The Golden Letter Corpus runs synthetic prop letters through the decision engine, Benefits Action Pack, Strategic Next Step, ResultViewModel, and Adviser Export Pack.

This means the export format is tested across benefits, debt/legal-looking, consumer, suspicious-message, unknown, OCR-edge, and hostile-input fixtures without using real user letters.

Real user letters, photos, OCR outputs, benefit letters, debt letters, parking claims, or legal documents must never be committed as corpus fixtures.

## Future improvements

- print stylesheet
- PDF export
- redaction preview
- adviser-reviewed format
- Helper Mode integration
- export/import backup
