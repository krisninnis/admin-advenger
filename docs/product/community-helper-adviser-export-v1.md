# Community Helper Adviser Export v1

## What was integrated

This branch connects CommunityHelperPack into the Adviser Export Pack layer.

The adviser export builder can now accept an optional communityHelperPack input and render a Community support preparation pack section in exported Markdown.

## What this export means

The export is preparation material only.

It does not mean case strength, outcome likelihood, care eligibility, safeguarding status, diagnosis, capacity status, equipment need, adaptation need, risk level, entitlement, money saved, money recovered, or money owed.

## What was deliberately not integrated

This branch does not add HomeView routing, UI entry points, automatic detection, decision-engine classifier changes, OCR changes, file intake changes, document intake changes, or public entry points.

Community helper support is still not publicly routed.

## Export sections

Community helper adviser export can include:

- what this appears to be about
- daily-life, admin, or communication impact
- key facts to check
- evidence/context to gather
- questions to ask
- consent and control notes
- what AdminAvenger cannot know
- preparation-only notes
- human support/signposting

## Safety boundaries

Community helper adviser export must not produce:

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

## Consent and control

Consent and control notes are kept visible in the export.

The export must not imply that a helper can secretly monitor someone, take over, or act without appropriate authority.

## Urgent safeguarding-like wording

Urgent safeguarding-like wording is signposting only.

If someone may be in immediate danger, the user should contact emergency services or the relevant local safeguarding service. AdminAvenger cannot decide safeguarding concerns.

## Tests

Added adviser export tests for:

- optional communityHelperPack input
- rendered community support preparation section
- OT/support visit preparation without equipment/adaptation recommendations
- urgent safeguarding-like signposting without deciding safeguarding
- financial admin concern wording without accusations or money conclusions
- consent/control notes visibility
- forbidden wording regression across community helper adviser exports
- combined safety regression coverage for ResultViewModel, CaseProgress, and AdviserExportPack

## Future branches

- community-helper-demo-ui-v1
- community-helper-home-gated-v1
