# Workplace Support UI v1

Status: Demo / tour integration implemented. No HomeView routing yet.

## What was added

Workplace Support UI v1 exposes the existing Workplace Support Pack stack
through the Demo / tour page only.

The Demo / tour page now includes a section:

Try a workplace support demo

The section uses synthetic Golden Letter Corpus workplace fixtures and builds:

- `WorkplaceSupportPack`
- `ResultViewModel`
- `CaseProgress`
- `AdviserExportPack`

The result renders through the existing `ResultCaseSheet`, so users see the
same composed case sheet, preparation progress card, draft/checklist area, and
adviser export action used elsewhere.

## Why Demo / tour only

Workplace messages can affect income, health, job security, and legal routes.
The workplace pack stack is currently exposed only with synthetic examples so
the product can be reviewed safely before any public routing is added.

This branch proves the UI composition without telling the main app to classify
real pasted workplace messages automatically.

## What was deliberately not added

This branch does not add:

- HomeView workplace detection
- automatic workplace routing from pasted real messages
- OCR, photo, or file-intake changes
- main decision-engine classifier changes
- a separate workplace checker or category picker
- auto-send, auto-submit, employer contact, ACAS contact, or claim submission
- legal or employment advice
- compensation calculation
- settlement agreement assessment
- resignation wording

## Workplace demo scenario list

The Demo / tour page includes:

- Workplace: disciplinary meeting invite
- Workplace: pay or wage confusion
- Workplace: sickness or capability meeting
- Workplace: redundancy consultation
- Workplace: settlement agreement warning
- Workplace: unclear workplace message

All examples are synthetic. They use example names and references from the
Golden Letter Corpus, not real user letters.

## Preparation-only safety wording

The workplace demo result keeps these lines visible:

- Synthetic demo
- This is preparation only, not legal or employment advice.
- AdminAvenger helps prepare. You stay in control.
- Ask ACAS, a union rep, HR, Citizens Advice, an adviser, solicitor where
  appropriate, or someone trusted if you are unsure.

The result does not say the user has a claim, will win, is owed money, or that
an employer has acted wrongly.

## Settlement agreement boundary

The settlement agreement demo shows a human-review warning:

Do not rely on AdminAvenger to decide what to do with a settlement agreement.
Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified
adviser.

It does not generate a draft response. It does not assess whether the agreement
is good or bad. It does not say whether to accept or reject anything and does
not say compensation is payable.

## Resignation boundary

If a workplace demo includes resignation-related risk wording, the UI stays
neutral:

Get advice before making a resignation decision.

It does not tell the user to resign, stay, refuse a meeting, or take a formal
step.

## No HomeView routing yet

The main "Check a message" flow is unchanged. Real pasted workplace messages
are not routed to Workplace Support Pack automatically in this branch.

## No decision-engine classifier change

The Golden Letter Corpus workplace fixtures still remain conservative in the
existing decision-engine path. Workplace demos deliberately bypass the public
classifier and build the workplace pack stack directly inside the Demo / tour
view.

## Future branches

Planned follow-up branches:

- `workplace-support-routing-v1`
- `workplace-support-home-gated-v1`
- `workplace-support-copy-polish-v1`

Any future public routing branch must keep Check a message as the only front
door, preserve local-first operation, keep workplace output preparation-only,
and maintain:

AdminAvenger helps prepare. You stay in control.
