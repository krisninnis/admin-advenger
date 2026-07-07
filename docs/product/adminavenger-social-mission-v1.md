# AdminAvenger Social Mission v1

## Purpose

AdminAvenger exists to reduce the burden of confusing life admin.

People receive letters, bills, emails, screenshots, receipts, benefit notices,
job messages, debt warnings, energy updates, refund notices, and scam-like
messages at moments when they are busy, anxious, tired, or under pressure.
Many of those messages are written for organisations rather than humans.

AdminAvenger should help a person slow the situation down, understand what the
message appears to be, preserve the evidence, see what may matter, and prepare
the next human-approved step.

The core principle is:

**AI remembers. AI explains. Humans decide.**

## Who It Is For

AdminAvenger is for ordinary people dealing with ordinary admin friction:

- people who miss refunds because forms are annoying
- people who forget subscriptions or renewals
- people who receive confusing provider letters
- people who need to chase a reply but do not know what to say
- people who need to collect evidence before speaking to an organisation
- people who feel overwhelmed by official-looking letters
- people who are unsure whether a message is safe to engage with

It should be especially careful for people under stress, with limited time,
low confidence, low literacy, disability, language barriers, low digital
confidence, caring responsibilities, unstable housing, low income, or previous
bad experiences with institutions.

## What AdminAvenger Should Do

AdminAvenger should:

- read and organise user-provided text, photos, screenshots, and files locally
  where possible
- explain what a document appears to be in plain English
- separate facts found in the document from assumptions
- show evidence found and evidence missing
- show uncertainty and what the app cannot know
- prepare editable drafts, checklists, timelines, and evidence packs
- help users remember follow-ups and chase dates
- warn when a photo, OCR result, or extraction is unreliable
- make it easy to stop, review, edit, delete, or ignore a case
- keep the user in control of every action

AdminAvenger should make people feel more capable, not more dependent.

## What AdminAvenger Must Not Do

AdminAvenger must not:

- give legal, financial, debt, benefits, medical, housing, or employment advice
- claim that a user is entitled to money, benefits, housing, a job, or a legal
  outcome
- guarantee deadlines, eligibility, rights, outcomes, refunds, compensation, or
  savings
- tell users to pay, not pay, ignore, refuse, appeal, submit, claim, or cancel
  without human review and appropriate advice boundaries
- send messages, submit claims, contact organisations, cancel services, or make
  commitments automatically
- count money as saved or recovered unless the user confirms an official outcome
- pressure users with fear, shame, scarcity, urgency, or gamified win language
- pretend OCR, AI extraction, or deterministic rules are certain
- hide uncertainty in Simple Mode
- replace advice charities, regulated professionals, public bodies, or trusted
  human support

## Why This Is Not A Generic Chatbot

A generic chatbot is a blank box. It may sound confident even when the user has
not provided enough evidence, and it may lose the thread across documents,
drafts, evidence, dates, and outcomes.

AdminAvenger should be different because it is structured around life-admin
workflows:

- one front door: Check a message
- deterministic classification and assessment where possible
- evidence-first case files
- explicit missing information
- cautious confidence and cannot-know fields
- editable drafts only
- local-first storage
- human confirmation before any action or money impact
- timeline and chase support
- no automatic sending or submission

The product advantage is not that it sounds clever. The advantage is that it
keeps the user oriented and safe.

## Product Tone

AdminAvenger should sound calm, practical, and on the user's side.

Use:

- "appears"
- "may"
- "check"
- "from what is shown"
- "this could matter because"
- "evidence that would help"
- "you decide what happens"

Avoid:

- "you are entitled"
- "you will win"
- "guaranteed"
- "definitely unlawful"
- "confirmed deadline" unless the source clearly states it
- "ignore this"
- "do not pay"
- "pay this"
- "claim now"
- "automatic savings"
- "we recovered"

The app can be encouraging, but it should never make serious admin feel like a
game.

## High-Stakes Areas

The following areas require extra caution:

- benefits
- debt
- bailiffs and enforcement
- housing, rent, eviction, and homelessness
- council tax
- employment disputes
- health or disability evidence
- HMRC
- immigration
- court or tribunal documents
- scams and suspicious messages

For these areas, AdminAvenger should focus on:

- what the document appears to be
- what evidence is visible
- what information is missing
- what deadlines or dates the document itself mentions
- what questions the user may need to answer
- what a careful next step might be
- when to seek specialist advice

It should not provide regulated advice or imply that it has checked current law
unless the relevant rule has been verified and the copy still preserves the
human decision boundary.

## Money And Impact Ethics

AdminAvenger may show money mentioned in a document.

AdminAvenger must not automatically count:

- demanded amounts
- disputed amounts
- possible entitlement
- possible compensation
- benefit amounts
- debt balances
- rent arrears
- council tax balances
- price rises
- refunds not yet received

Only user-confirmed outcomes should count as saved or recovered.

Pending recovery should remain pending until the user confirms money came back.

No-action or record-only results must not inflate savings, recovery, or success
metrics.

## Local-First Trust

The trust promise is simple:

- user text and saved cases stay local unless a future mode clearly says
  otherwise
- photos and OCR should run on the device where possible
- unsupported reading modes must say so plainly
- extraction failures should degrade gracefully
- users can edit OCR or extracted text before checking
- users can clear local data

If future cloud extraction, sync, or account features are added, they must be
explicit opt-in paths with clear privacy copy. They must not weaken the default
local-first posture.

## Simple Mode Must Not Hide Safety

Simple Mode is useful only if it reduces clutter without hiding risk.

Simple views may simplify:

- layout
- wording
- order of sections
- progressive disclosure

Simple views must not hide:

- missing evidence
- uncertain OCR
- confidence level
- cannot-know statements
- high-risk email warnings
- deadline caveats
- money counting boundaries
- advice boundaries

## Success Criteria

AdminAvenger succeeds when a user can say:

- "I understand what this seems to be."
- "I know what information is missing."
- "I know what I might do next."
- "I have a draft I can edit."
- "I know the app has not acted for me."
- "I feel less overwhelmed."

It fails if a user believes:

- the app has decided their legal rights
- the app has confirmed entitlement
- the app has contacted an organisation
- the app has guaranteed money or deadlines
- the app has verified a scam as safe
- the app has counted money without their confirmation

## Build Priority

Prefer narrow, trustworthy verticals over broad, shallow coverage.

Build order should favour:

1. workflows with clear user pain
2. workflows where evidence can be shown plainly
3. workflows where deterministic rules can stay cautious
4. workflows that prepare rather than decide
5. workflows that are easy to test with real letters

Do not build a generic assessment engine when one concrete workflow would teach
more.

## Working Rule

Every future feature should pass this test:

**Does this help a person understand, remember, prepare, or safely decide - without pretending AdminAvenger can act or advise for them?**

If not, do not build it yet.
