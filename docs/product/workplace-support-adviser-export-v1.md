# Workplace Support Adviser Export v1

Status: Adviser Export integration implemented. No UI or routing changes yet.

## What was integrated

`buildAdviserExportPack()` now accepts an optional:

`workplaceSupportPack?: WorkplaceSupportPack`

When a Workplace Support Pack is supplied, the downloadable Markdown adviser
pack can include workplace preparation sections. This lets a future workplace
UI branch create a local preparation file without changing the main
decision-engine classifier.

## What was deliberately not integrated

This branch does not add:

- HomeView workplace detection
- visible workplace UI routing
- a separate workplace checker
- OCR, photo, or document intake changes
- main decision-engine classifier changes
- automatic sending, contacting, submitting, claiming, or escalating
- legal, employment, benefits, debt, or financial advice
- compensation calculation
- tribunal or ACAS form preparation
- settlement agreement value assessment
- resignation wording

Existing adviser export packs for benefits, debt, parking, consumer,
scam-like, unknown, result page, demo, and case progress flows continue to work
when no `workplaceSupportPack` is supplied.

## How workplace packs map into adviser export

The Markdown export adds a "Workplace preparation pack" section with:

- what this appears to be about
- key facts to check
- evidence to gather
- questions to ask
- what AdminAvenger cannot know
- preparation-only notes
- human support and signposting

The pack keeps the same export footer:

- AdminAvenger helps prepare. You stay in control.
- Nothing has been sent or submitted by AdminAvenger.
- This is not legal, benefits, debt, financial, or immigration advice.

Workplace exports also include:

- This is preparation only, not legal or employment advice.
- Ask ACAS, a union rep, HR, Citizens Advice, an adviser, solicitor where
  appropriate, or someone trusted if you are unsure.

## Preparation-only boundary

The workplace adviser pack is for organising information before a user talks to
someone suitable or decides what to do.

It must not:

- decide employment rights
- say whether an employer acted wrongly
- predict an outcome
- describe case quality
- say a dismissal, discrimination, harassment, or retaliation issue is proven
- calculate compensation
- tell someone to resign
- tell someone to refuse a meeting
- tell someone to use a draft without review
- contact, submit, send, or share anything automatically

## Settlement agreement handling

If the pack type is `settlement_agreement_signpost`, adviser export includes a
strong human-review warning:

Do not rely on AdminAvenger to decide what to do with a settlement agreement.
Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified
adviser.

The export does not create a draft response for settlement agreement packs. It
does not assess whether the terms are good or bad, does not value the document,
and does not say compensation is payable.

## Resignation handling

If risk warnings mention resignation, constructive dismissal, resigning,
quitting, or walking out, adviser export includes neutral wording:

Get advice before making a resignation decision.

It does not tell the user to leave, stay, resign, or refuse anything.

## Pay and wage money safety

For wage or pay packs, amounts are facts to check only.

The export does not say money is owed, saved, or recovered. It does not
calculate compensation, arrears, or entitlement. It does not add workplace pay
amounts to any money tracker.

## No UI or routing change yet

This is a data/export-layer branch only.

The app does not yet detect workplace documents in HomeView, and the main
decision-engine classifier is unchanged. A future branch can decide when to
build a `WorkplaceSupportPack` behind the existing "Check a message" front
door and pass it into ResultViewModel, Case Progress, and Adviser Export.

## Future branches

Planned follow-up branches:

- `workplace-support-ui-v1`
- `workplace-support-routing-v1`
- `workplace-support-demo-fixtures-v1`

Each future branch must preserve local-first operation, preparation-only
wording, no automatic contact or submission, no hidden money counting, and the
principle:

AdminAvenger helps prepare. You stay in control.
