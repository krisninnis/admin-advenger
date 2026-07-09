# Community Helper Case Progress v1

## What was integrated

This branch connects CommunityHelperPack into the Case Progress layer.

The case progress builder can now accept an optional communityHelperPack input.

## What this progress means

Progress means preparation completeness only.

It does not mean case strength, outcome likelihood, care eligibility, safeguarding status, risk level, entitlement, money saved, money recovered, or money owed.

## What was deliberately not integrated

This branch does not add HomeView routing, UI entry points, automatic detection, decision-engine classifier changes, OCR changes, file intake changes, document intake changes, or adviser export changes.

Community helper support is still not publicly routed.

## Checklist areas

Community helper progress can include preparation items for:

- original message, letter, or notes available
- community helper situation noted
- daily-life/admin impact prepared
- key facts to check prepared
- evidence/context checklist prepared
- questions prepared
- consent and control notes to review
- suitable person or professional route identified
- urgent support route reviewed, where urgent safeguarding-like wording is detected
- financial admin facts separated from assumptions, where financial admin concern wording is detected
- draft/checklist review
- adviser pack prepared
- trusted human check

## Safety boundaries

Community helper case progress must not produce:

- diagnosis
- care eligibility decisions
- safeguarding decisions
- capacity decisions
- risk scores
- equipment recommendations
- adaptation recommendations
- council obligation claims
- financial abuse conclusions
- money owed/saved/recovered claims

## Human-control boundary

AdminAvenger helps prepare. You stay in control.

Consent and control notes are treated as items to review. The progress layer must not imply that a helper can secretly monitor someone, take over, or act without appropriate authority.

## Urgent safeguarding-like boundary

Urgent safeguarding-like wording is signposting only.

If someone may be in immediate danger, the user should contact emergency services or the relevant local safeguarding service. AdminAvenger cannot decide safeguarding concerns.

## Tests

Added case progress tests for:

- optional communityHelperPack input
- missed letters/deadlines
- OT/support visit preparation
- urgent safeguarding-like signposting
- financial admin concern wording
- forbidden wording regression across community helper progress output

## Future branches

- community-helper-adviser-export-v1
- community-helper-demo-ui-v1
- community-helper-home-gated-v1
