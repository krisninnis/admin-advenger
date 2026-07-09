# Workplace Support Home Gated v1

Status: implemented as an explicit HomeView beta gate.

## What was added

HomeView now includes a small option:

Workplace support beta

When the user actively selects this option and checks typed/uploaded text,
AdminAvenger builds the existing workplace preparation stack:

- `WorkplaceSupportPack`
- `ResultViewModel`
- `CaseProgress`
- `AdviserExportPack`

The result renders through the existing `ResultCaseSheet`, including
preparation progress and the local adviser export download action.

## Why explicit user selection is safer than auto-routing

Workplace messages can affect work, pay, health, relationships, and future
decisions. This branch does not silently infer workplace support from text.

The user must choose the beta path before AdminAvenger uses workplace support.
This keeps the normal Check a message flow unchanged and avoids presenting
employment preparation output as if the main classifier had decided it.

## What was deliberately not added

This branch does not add:

- automatic workplace detection
- workplace routing in the main decision-engine classifier
- a separate workplace checker page
- OCR, photo, camera, or file-intake changes
- legal or employment advice
- outcome prediction
- tribunal prediction
- compensation calculations
- automatic employer, ACAS, union, HR, adviser, solicitor, or Citizens Advice contact
- automatic messages, submissions, claims, or forms
- workplace pay amounts in saved/recovered totals

## Preparation-only safety wording

Workplace beta results keep these boundaries visible:

- This is preparation only, not legal or employment advice.
- AdminAvenger helps prepare. You stay in control.
- Ask ACAS, a union rep, HR, Citizens Advice, an adviser, solicitor where
  appropriate, or someone trusted if you are unsure.

The result is for organising facts, questions, evidence, and a checklist. It is
not advice and does not decide what the user should do.

## Settlement agreement boundary

When the workplace pack is `settlement_agreement_signpost`, HomeView shows a
strong human-review warning.

The result must not:

- generate a response draft
- say whether to sign or not sign
- assess whether the deal is good or bad
- say compensation is owed
- replace qualified human review

The adviser export preserves the same boundary.

## Resignation boundary

If workplace risk warnings mention resignation, constructive dismissal,
resigning, quitting, or walking out, the result includes:

Get advice before making a resignation decision.

AdminAvenger must not tell the user to resign or not resign.

## Pay and wage money safety

For wage or pay issues, amounts are facts to check only.

AdminAvenger must not:

- say money is owed
- say money has been saved or recovered
- calculate compensation, arrears, or entitlement
- add workplace pay amounts to savings or recovery totals

## No decision-engine classifier change

The existing decision-engine classifier is unchanged in this branch. Workplace
beta builds the workplace pack only after the user explicitly selects the beta
option.

Existing benefits, debt, parking, consumer, scam-like, unknown, and normal admin
flows continue through the normal Check a message path by default.

## No OCR or intake change

This branch does not change OCR, photo capture, camera intake, document
attachments, or file parsing. It only changes how HomeView handles already
available typed/uploaded text when the workplace beta option is selected.

## Future branches

Possible follow-up branches:

- `workplace-support-routing-v1`
- `workplace-support-copy-polish-v1`
- `workplace-support-adviser-review-v1`

Any future routing branch must be reviewed carefully before workplace support
becomes automatic.
