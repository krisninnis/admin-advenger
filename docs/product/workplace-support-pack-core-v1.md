# Workplace Support Pack Core v1

Status: core data/model/builder layer implemented. No UI yet.

## What was implemented

Workplace Support Pack Core v1 adds a deterministic, local-only builder:

`src/lib/workplaceSupportPack.ts`

It accepts user-provided text and returns a preparation-only
`WorkplaceSupportPack` with:

- workplace document type
- plain title and summary
- key facts to check
- evidence to gather
- questions to ask
- what AdminAvenger cannot know
- safe next steps
- draft/checklist boundary notes
- risk warnings
- signposting
- preparation-only warning

The builder does not call a network service, does not use cloud AI, and does
not change the main decision-engine router.

## What was deliberately not implemented

This branch does not add:

- UI rendering
- ResultViewModel integration
- Case Progress integration
- Adviser Export integration
- main decision-engine routing changes
- claims, tribunal, ACAS, employer, HR, or union submission flows
- email or message sending
- legal or employment advice
- outcome prediction
- compensation calculation
- route/deadline confirmation

Workplace fixtures added to the shared Golden Letter Corpus remain routed as
conservative `unknown_admin_dispute` outputs until a later routing branch is
planned and reviewed.

## Safe document types

The core builder supports:

- disciplinary invite
- grievance outcome
- sickness absence meeting
- capability meeting
- redundancy consultation
- wage deduction or pay issue
- contract or rota change
- dismissal letter
- bullying or harassment record preparation
- workplace investigation invite
- settlement agreement signposting
- unknown workplace issue

These are preparation labels only. They do not decide employment rights or
legal routes.

## Settlement agreement boundary

If the text mentions settlement agreement, compromise agreement,
without-prejudice wording, or COT3, the builder returns:

`settlement_agreement_signpost`

The pack does not draft a response and does not assess the terms. It tells the
user not to rely on AdminAvenger for signing decisions and signposts ACAS, a
union rep, solicitor, Citizens Advice, or another qualified adviser.

## Resignation boundary

If the text mentions resignation, constructive dismissal, resigning, walking
out, or quitting, the builder adds a risk warning that resignation decisions can
have serious consequences.

It does not tell the user whether to resign or stay in work.

## Draft and checklist boundaries

Allowed in this core layer:

- questions to ask HR
- questions to ask ACAS
- questions to ask a union rep or adviser
- meeting preparation notes
- timeline summary prompts
- neutral request-for-clarification style preparation

Not allowed:

- tribunal paperwork
- legal threat letters
- resignation wording
- compensation demand letters
- accusation-heavy letters
- letters saying the employer broke the law
- instructions to attend, refuse, sign, or submit

## No legal advice or outcome prediction

Every pack keeps the same boundary:

AdminAvenger helps prepare. You stay in control.

The builder must not:

- provide legal advice
- provide employment law advice
- say the employer acted unlawfully
- say unfair dismissal or discrimination is proven
- say a claim is valid or invalid
- score the case
- predict tribunal outcomes
- say compensation is payable
- tell the user to resign
- tell the user not to attend a meeting
- tell the user to sign or not sign an agreement
- contact anyone automatically
- submit anything automatically

## Tests added

`src/lib/__tests__/workplaceSupportPack.test.ts` covers:

- disciplinary invite pack
- grievance outcome pack
- sickness/capability packs
- redundancy consultation pack
- wage deduction/pay issue pack
- contract/rota change pack
- dismissal letter pack
- bullying/harassment record pack
- investigation invite pack
- unknown workplace fallback
- settlement agreement hard signposting
- resignation risk warning
- forbidden wording absence
- no outcome prediction
- no case-quality wording
- no compensation-owed wording
- no tribunal-claim drafting

`src/lib/goldenLetters.ts` now includes synthetic workplace fixtures for future
routing and result-surface coverage. In this core branch they intentionally
remain conservative in the existing decision-engine path.

## Future branches

Planned follow-up branches:

- `workplace-support-resultviewmodel-v1`
- `workplace-support-case-progress-v1`
- `workplace-support-adviser-export-v1`
- `workplace-support-ui-v1`

Each should keep Check a message as the only front door and preserve
preparation-only wording.
