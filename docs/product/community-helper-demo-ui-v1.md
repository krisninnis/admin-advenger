# Community Helper Demo UI v1

Status: Demo / tour integration implemented. No HomeView routing yet.

## What was added

Community Helper Demo UI v1 exposes the existing Community Helper Pack stack
through the Demo / tour page only.

The Demo / tour page now includes a section:

Try a community support demo

The section uses 4 hardcoded, synthetic demo scenarios and builds:

- `CommunityHelperPack`
- `ResultViewModel`
- `CaseProgress`
- `AdviserExportPack`

The result renders through the existing `ResultCaseSheet`, so users see the
same composed case sheet, preparation progress card, draft/checklist area, and
adviser export action used elsewhere. `ResultCaseSheet` was extended with an
optional `communityHelperPack` prop (mirroring the existing
`workplaceSupportPack` prop) so the preparation-progress checklist reflects
the community helper family instead of falling back to a generic checklist.

A dedicated "Community support supporting detail" panel (shown behind the
existing "Show supporting detail" toggle) displays the fields that
`ResultCaseSheet`'s own sections do not already surface directly: daily-life,
admin, and communication impact; key facts to check; evidence/context to
gather; questions to ask; consent and control notes; what AdminAvenger cannot
know; and human support/signposting.

## Why Demo / tour only

Community helper situations can touch care, housing, communication
difficulty, and possible safeguarding or financial-abuse concerns. The
community helper pack stack is exposed only with synthetic examples, behind a
clearly labelled "Gated demo only" badge, so the product can be reviewed
safely before any public routing is added.

This branch proves the UI composition without telling the main app to
classify real pasted messages as community helper situations automatically.

## What was deliberately not added

This branch does not add:

- HomeView community helper detection or routing
- automatic community helper routing from pasted real messages
- OCR, photo, or file-intake changes
- main decision-engine classifier changes
- a separate community helper checker or category picker
- auto-send, auto-submit, or auto-contact wording or behaviour
- diagnosis, safeguarding, capacity, or care/benefits eligibility decisions
- equipment or adaptation recommendations
- any new advice or outcome language

## Community helper demo scenario list

The Demo / tour page includes exactly 4 hardcoded scenarios
(`src/lib/communityHelperDemoScenarios.ts`):

- Missed letters or deadlines
- OT or support visit preparation
- Urgent safeguarding-like signposting
- Possible financial admin concern

All examples are synthetic and deliberately avoid naming a real person, place,
or organisation. They are not part of the Golden Letter Corpus fixture list
used by the main and workplace demos - they are hardcoded input text used only
to exercise the community helper pack pipeline in this gated demo.

## Preparation-only safety wording

The community helper demo result keeps these lines visible:

- Synthetic demo / Gated demo only
- This is preparation only, not a professional assessment.
- AdminAvenger cannot decide care needs, safeguarding, diagnosis, capacity,
  eligibility, equipment, or adaptations.
- AdminAvenger helps prepare. You stay in control.
- Ask a support worker, OT, housing officer, adviser, GP or clinician, social
  worker, safeguarding professional if urgent, or another trusted person if
  you are unsure.

The result does not say a diagnosis is confirmed, that someone is or is not
eligible for care or benefits, that equipment or an adaptation is needed, that
safeguarding or financial abuse is confirmed, or that money is owed, saved, or
recovered.

## Urgent safeguarding-like boundary

The urgent safeguarding-like demo shows a signposting-only warning:

If someone may be in immediate danger, contact emergency services or the
relevant local safeguarding service. AdminAvenger cannot decide safeguarding
concerns.

It does not assess risk, assign a risk score, confirm a safeguarding issue, or
tell the user what to do beyond pointing them to the right people to contact.

## Financial admin concern boundary

The financial admin concern demo keeps wording factual and non-accusatory. It
records what has been observed (missing payments, someone else controlling
money) without concluding that financial abuse has occurred, and without
counting any amount as owed, saved, or recovered.

## No HomeView routing yet

The main "Check a message" flow is unchanged. Real pasted messages are not
routed to Community Helper Pack automatically in this branch.

## No decision-engine classifier change

Community helper demos deliberately bypass the public classifier and build
the community helper pack stack directly inside the Demo / tour view, from
hardcoded scenario text only.

## Future branches

Planned follow-up branch:

- `community-helper-home-gated-v1`

Any future public routing branch must keep Check a message as the only front
door, preserve local-first operation, keep community helper output
preparation-only, keep a human deciding every next step, and maintain:

AdminAvenger helps prepare. You stay in control.
