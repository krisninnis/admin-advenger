# Community Helper ResultViewModel v1

## What was integrated

This branch connects CommunityHelperPack into the composed ResultViewModel layer.

The result composer can now accept an optional communityHelperPack input.

When supplied, the result model can include safe community-support preparation sections.

## What was deliberately not integrated

This branch does not add HomeView routing, UI entry points, automatic detection, decision-engine classifier changes, OCR changes, file intake changes, document intake changes, adviser export changes, or case progress changes.

Community helper support is still not publicly routed.

## ResultViewModel mapping

Community helper pack fields are mapped into preparation sections such as:

- Community support preparation
- What this appears to be about
- Daily-life impact
- Admin and routine barriers
- Communication barriers
- Key facts to check
- Evidence/context to gather
- Questions to ask
- Consent and control notes
- Ask someone suitable
- Preparation-only notes

## Preparation-only boundary

Community helper result output must remain preparation-only.

Required boundary:

- AdminAvenger helps prepare. You stay in control.
- This is preparation only, not a professional assessment.
- AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity, eligibility, equipment, or adaptations.

## Consent and helper-control boundary

When the pack is about helping someone else, consent and control notes must remain visible.

Safe boundaries:

- check the person is happy for help where possible
- keep the person involved where possible
- do not monitor someone secretly
- preserve the person's preferences and control

The result model must not imply that a helper can take over, act secretly, or decide capacity.

## Urgent safeguarding-like boundary

Urgent safeguarding-like wording is preserved as signposting only.

AdminAvenger must not decide safeguarding concerns, prove neglect, confirm abuse, or score risk.

## Financial admin concern boundary

Financial admin concern outputs must stay factual.

The result model must not say financial abuse proven, money owed, money saved, or money recovered.

Money and documents are treated as facts to check with a suitable trusted person or professional.

## No diagnosis / no eligibility / no risk score rule

The ResultViewModel integration must not produce diagnosis, care eligibility decisions, risk scores, safeguarding decisions, capacity decisions, equipment recommendations, adaptation recommendations, or council obligation claims.

## Tests

Added dedicated tests for community helper ResultViewModel mapping, including missed letters/deadlines, housing repair/access support, OT/support visit preparation, urgent safeguarding-like signposting, financial admin concerns, consent/control notes, unknown conservative fallback, and safety wording checks.

## Future branches

- community-helper-case-progress-v1
- community-helper-adviser-export-v1
- community-helper-demo-ui-v1
- community-helper-home-gated-v1
