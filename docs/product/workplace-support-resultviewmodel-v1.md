# Workplace Support ResultViewModel v1

Status: ResultViewModel integration implemented. No UI or routing changes yet.

## What was integrated

`ResultViewModel` now accepts an optional:

`workplaceSupportPack?: WorkplaceSupportPack`

This lets a future workplace UI branch pass a pack from
`src/lib/workplaceSupportPack.ts` into the composed result layer without
changing the main decision-engine classifier or the Home view routing.

The integration maps workplace pack content into existing ResultViewModel
surfaces:

- title and summary
- status label
- sections
- evidence to gather
- questions to answer
- risks
- uncertainty
- what AdminAvenger cannot know
- safety notes
- optional preparation checklist

## What was deliberately not integrated

This branch does not add:

- HomeView workplace detection
- UI rendering changes
- new navigation
- OCR, photo, or document intake changes
- main decision-engine classifier changes
- Case Progress workplace family
- Adviser Export workplace sections
- automatic sending, contacting, or submitting
- legal or employment advice
- claim, tribunal, resignation, or settlement-action workflows

Existing benefits, debt, parking, consumer, suspicious-message, unknown, demo,
adviser export, and case progress flows should behave the same when no
`workplaceSupportPack` is supplied.

## How workplace packs map into ResultViewModel

When a workplace pack is supplied:

- `title` uses the pack title when no higher-priority opportunity or benefits
  title exists
- `summary` uses the pack summary when no higher-priority summary exists
- `primaryStatusLabel` becomes "Workplace preparation only"
- `evidenceToGather` includes workplace evidence items with source
  `workplace_support_pack`
- `questionsToAnswer` includes workplace questions
- `risks` includes workplace risk warnings
- `cannotKnow` includes workplace cannotKnow items
- `uncertainty` includes a workplace-specific uncertainty line
- `safetyNotes` include preparation-only, no-contact/no-submit, and signposting
  boundaries
- `sections` include workplace preparation, key facts, questions, and
  signposting sections
- `detailSections` include workplace preparation-only notes

The headings use safe preparation language:

- Workplace preparation
- What this appears to be about
- Key facts to check
- Evidence to gather
- Questions to ask
- What AdminAvenger cannot know
- Preparation-only notes
- Ask someone suitable

## Safety wording boundaries

Workplace ResultViewModel output must keep these lines or equivalent wording
visible:

- "This is preparation only, not legal or employment advice."
- "AdminAvenger helps prepare. You stay in control."
- "Ask ACAS, a union rep, HR, Citizens Advice, an adviser, or someone trusted
  if you are unsure."

It must not include:

- legal or employment advice
- employer-broke-the-law wording
- outcome prediction
- claim-quality wording
- win or success wording
- valid/invalid claim wording
- compensation owed wording
- tribunal prediction
- instructions to resign
- instructions to refuse a meeting
- instructions to sign or not sign an agreement
- automatic contact, sending, or submission wording

## Settlement agreement handling

If the pack type is `settlement_agreement_signpost`, ResultViewModel preserves
the hard human-review signposting from the Workplace Support Pack.

It does not create a draft response for settlement agreement packs.

It does not assess the terms, say whether to sign, say whether not to sign, or
mention compensation as owed.

## Resignation handling

If the pack includes a resignation risk warning, ResultViewModel preserves that
warning in `risks`.

It does not tell the user to resign or stay. It keeps the wording neutral and
signposts ACAS, a union rep, Citizens Advice, an adviser, or someone trusted.

## No UI or routing change yet

This is a composition-layer branch only.

The existing app does not yet detect workplace documents at HomeView level, and
the main decision-engine classifier is unchanged. A future UI/routing branch can
decide when to build and pass `workplaceSupportPack` into ResultViewModel.

## Tests added

`src/lib/__tests__/resultViewModel.test.ts` now covers:

- optional `workplaceSupportPack` input
- disciplinary invite mapping
- wage/pay issue money safety
- settlement agreement hard signposting
- no settlement draft response
- resignation warning neutrality
- unknown workplace fallback
- no forbidden workplace wording
- unchanged non-workplace behavior when no pack is supplied

`src/lib/__tests__/safetyWordingRegression.test.ts` now scans workplace
ResultViewModel output through the generated-output safety helpers.

## Future branches

Planned follow-up branches:

- `workplace-support-case-progress-v1`
- `workplace-support-adviser-export-v1`
- `workplace-support-ui-v1`

Each should preserve Check a message as the only front door and keep all
workplace output preparation-only.
