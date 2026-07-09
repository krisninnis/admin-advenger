# Workplace Support Case Progress v1

Status: Case Progress integration implemented. No UI or routing changes yet.

## What was integrated

`buildCaseProgress()` now accepts an optional:

`workplaceSupportPack?: WorkplaceSupportPack`

When a Workplace Support Pack is supplied, Case Progress builds a workplace
preparation checklist from the pack. This is only a preparation-progress view:
it shows which information, evidence checklist items, questions, and human
review steps are prepared or still missing.

## What was deliberately not integrated

This branch does not add:

- HomeView workplace detection
- visible workplace UI routing
- a separate workplace checker
- OCR, photo, or document intake changes
- main decision-engine classifier changes
- adviser export workplace sections
- workplace drafts beyond existing safe preparation checklist behaviour
- automatic sending, contacting, submitting, claiming, or escalating
- legal, employment, benefits, debt, or financial advice

Existing benefits, debt, parking, consumer, scam-like, unknown, adviser export,
result page, and demo flows continue to use their existing progress families
when no `workplaceSupportPack` is provided.

## How workplace packs map into preparation progress

Workplace packs can create checklist items such as:

- original workplace letter or message available
- date, time, or location checked against the original
- employer, HR, or contact details checked
- policy, contract, handbook, or written-terms reference checked if available
- workplace evidence checklist prepared
- timeline written down
- questions prepared for HR, ACAS, a union rep, Citizens Advice, an adviser, or
  someone trusted
- draft or checklist reviewed if a safe checklist exists
- adviser pack prepared if supplied
- trusted person or adviser checked this

Meeting-style documents can also add:

- meeting details checked
- reason for meeting noted
- support or advice option checked

Pay or wage issue documents can add:

- payslips, rota, hours, bank payment records, and messages gathered

Bullying or harassment record-preparation documents can add:

- timeline and examples written down
- messages, screenshots, or notes gathered
- support or advice option checked

## Preparation completeness only

The progress percentage only means preparation completeness.

It does not mean:

- chance of winning
- case quality
- appeal quality
- employment-law position
- tribunal prediction
- whether an employer has acted wrongly
- whether any dismissal, discrimination, harassment, or retaliation is proven
- whether compensation or wages are payable

The standing line remains:

AdminAvenger helps prepare. You stay in control.

## Settlement agreement handling

If a pack is `settlement_agreement_signpost`, Case Progress uses a deliberately
limited checklist.

It includes:

- original document available
- dates and contact details to check
- questions prepared
- human review route identified
- document reviewed with a suitable human adviser, marked missing by default
- adviser pack prepared if supplied

The human review item says:

Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser
before relying on any next step.

Case Progress does not assess the agreement, value the terms, encourage a
signature, reject a signature, or create a draft response for this route.

## Resignation handling

If workplace risk warnings mention resignation, constructive dismissal,
resigning, or quitting, Case Progress adds a neutral preparation item:

Get advice before making a resignation decision.

It does not tell the user to leave, stay, resign, or refuse anything.

## Pay and wage money safety

Pay and wage packs can mention amounts, payslips, deductions, rota entries,
hours, or messages. Case Progress treats those as information to check only.

It does not count money as saved or recovered. It does not say money is owed.
It does not calculate compensation, arrears, or entitlement.

## No UI or routing change yet

This is a data-layer branch only.

The existing app does not yet detect workplace documents at HomeView level, and
the main decision-engine classifier is unchanged. A later branch can decide
when to build a `WorkplaceSupportPack` and pass it into ResultViewModel and
Case Progress behind the existing "Check a message" front door.

## Future branches

Planned follow-up branches:

- `workplace-support-adviser-export-v1`
- `workplace-support-ui-v1`
- `workplace-support-routing-v1`

Each future branch must preserve local-first operation, preparation-only
wording, no automatic contact or submission, and the principle:

AdminAvenger helps prepare. You stay in control.
