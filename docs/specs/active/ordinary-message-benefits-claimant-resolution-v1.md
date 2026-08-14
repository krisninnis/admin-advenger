# Ordinary Message Benefits Claimant Resolution V1

Status: Approved implementation brief supplied by the human project owner on
12 August 2026.

## Outcome

For benefits-shaped ordinary messages, deterministically resolve the claimant
only when the user's exact wording grounds the subject of the benefit, review,
assessment, form, letter or award.

- `resolved`: the event subject is the user or one explicitly named person;
- `ambiguous`: the wording identifies multiple or pronoun-only possibilities;
- `unresolved`: the wording does not establish a claimant.

A resolved claimant bypasses only the redundant claimant question and reaches
the existing preparation-only orientation. It does not confirm a help target,
open specialist benefits functionality or bypass document/public-scope policy.
Ambiguous and unresolved claimant wording keeps the existing closed question.

Relationship grounding establishes neither appointee status nor legal or
formal authority. Helper wording may be recorded only as context.

## Boundaries

- Security and urgency precedence remain first.
- Document-shaped PIP wording keeps existing document/public-scope behaviour.
- No benefits policy, eligibility, amounts, appeal rights or external research.
- No change to money handling, refund lifecycle or urgency evidence.
- No new dependency, storage, network call, telemetry or automatic action.

## Verification

Test first across explicit self, relationship, local-pronoun, helper,
multi-beneficiary, ambiguous, unrelated-domain, document and security cases.
Then verify the same boundary through the live browser and run the relevant
front-door, public-scope, security and urgency regressions plus full repository
validation.
