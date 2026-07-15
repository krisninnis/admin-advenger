# Pilot Readiness Checklist v1

## Purpose

Use this checklist before inviting 3-5 real pilot users to try AdminAvenger.

This is a safety and comprehension gate, not a feature expansion plan. The pilot should confirm whether people understand what AdminAvenger does, what it does not do, and whether the preparation-only boundaries feel clear.

## Product Promise

Confirm these two principles are visible and understood:

- AdminAvenger helps prepare. You stay in control.
- AI prepares. Humans decide.

Pilot explanation:

AdminAvenger helps users understand what a message, letter, bill, or screenshot appears to be, gather key details, prepare editable drafts or checklists, and organise follow-up. It does not decide for the user, send anything for the user, submit anything for the user, or guarantee outcomes.

## Safety Checklist

Before inviting pilot users, verify that public-facing pilot flows do not contain or imply:

- legal, benefits, care, medical, safeguarding, debt, housing, employment, or financial advice
- "you qualify"
- "you will win"
- "case strength"
- automatic eligibility, risk, or outcome scoring
- money saved, money recovered, or money owed totals unless explicitly confirmed by the user in the relevant safe flow
- capacity decisions
- diagnosis decisions
- equipment decisions
- adaptation decisions
- council obligation decisions
- safeguarding confirmation
- advice to ignore, pay, not pay, click, reply, submit, or escalate without user judgement

Required safety wording to check:

- preparation only
- not legal, benefits, care, medical, or safeguarding advice
- nothing is sent automatically
- nothing is submitted automatically
- nothing contacts anyone automatically
- check dates, amounts, and facts against the original source
- ask an appropriate person or service directly if urgent or someone may be unsafe

## Privacy And Local-First Checklist

Before pilot use, manually verify:

- local-first language is visible on Home, Trust/Safety, Settings, and relevant beta surfaces
- users are told that nothing is sent automatically
- local data controls are available in Settings
- clear local data flow explains that it only clears AdminAvenger data in this browser on this device
- adviser export is a local download only
- no hidden cloud processing is implied
- no analytics, account tracking, automatic upload, or background sharing is described
- photo/OCR flows keep caution wording around local reading, OCR quality, and manual review

## Pilot Flows To Test

Run these flows before inviting real testers:

- normal admin input through Check a message
- Benefits/Admin result page with uncertainty and cannot-know sections visible
- Community Helper controlled intake
- Community Helper example chips
- Community Helper local feedback panel
- Workplace Support demo/result
- adviser export download
- case progress tracker
- copy actions for drafts/checklists
- Settings local data view
- clear local data flow
- Trust & Safety page

For each flow, check:

- the user is not asked to choose a hidden engine or category
- the output explains what the document appears to be
- uncertainty remains visible
- dates and money are framed as things to check, not confirmed facts unless source/user confirmation supports that
- drafts and checklists are editable/preparation-only
- no message is sent or submitted by AdminAvenger

## Community Helper Pilot Checks

Controlled intake must remain:

- manually opened from the gated public beta route
- manual text only
- explicit: example chips only fill the textarea
- explicit: typing does not build a result
- explicit: the prepare button is the only result trigger
- disconnected from normal Home analyser routing
- disconnected from classifier, decisionEngine, OCR, file upload, photo capture, and document intake

Community Helper output must not decide:

- care needs
- safeguarding
- diagnosis
- capacity
- eligibility
- equipment
- adaptations
- financial abuse
- council duties

## Workplace Support Pilot Checks

Workplace Support output must remain preparation-only:

- not legal advice
- not employment advice
- no outcome prediction
- no case strength scoring
- no instruction to resign, sign, refuse, accuse, or escalate
- signposting to ACAS, union, HR, Citizens Advice, solicitor, or another trusted/advice source where appropriate

## Benefits/Admin Pilot Checks

Benefits and admin outputs must:

- explain what the letter appears to be
- show uncertainty and what AdminAvenger cannot know
- show dates as dates to check against the original letter
- show money as display-only unless the user later records an official outcome
- avoid entitlement language such as "you qualify"
- avoid claims that DWP, council, landlord, creditor, employer, provider, or court is definitely wrong
- encourage specialist advice where stakes are serious

## Adviser Export Checks

Before pilot use, download an adviser pack and confirm:

- Markdown file downloads locally
- filename does not include private user details
- pack says it is for preparation only
- pack says AdminAvenger has not sent or submitted anything
- pack includes uncertainty and cannot-know information
- dates say they must be checked against the original letter
- money is display-only
- no outcome prediction or entitlement claim appears

## Manual Tester Script

Use this script with each pilot tester.

Opening questions:

- What do you think this tool does?
- What do you think it does not do?
- Does it feel like it is deciding something for you, or preparing something for you?

After the tester checks a synthetic example:

- What do you think the result means?
- What would you do next?
- What would you copy or share with someone else?
- What would you avoid copying or sharing?
- Did any wording feel like legal, benefits, care, medical, safeguarding, debt, housing, employment, or financial advice?
- Did any wording make you think AdminAvenger had contacted someone, submitted something, or sent something?
- What confused you?
- What did you trust?
- What did you not trust?
- What would make this easier to use?

If using Community Helper:

- Did the example chips feel like examples rather than automatic detection?
- Did you understand that you had to click the prepare button?
- Did the local feedback panel feel clearly local and optional?

Close:

- Would you feel comfortable using this with a synthetic example?
- Would you feel comfortable using this with a real letter after removing sensitive details?
- What would you need to know before trusting it with a real document?

## Stop Criteria

Stop the pilot or pause rollout if any tester reasonably believes:

- AdminAvenger makes decisions for them
- AdminAvenger gives legal, benefits, care, medical, safeguarding, debt, housing, employment, or financial advice
- AdminAvenger sends messages automatically
- AdminAvenger submits forms or claims automatically
- AdminAvenger contacts organisations automatically
- AdminAvenger confirms eligibility, capacity, diagnosis, safeguarding, equipment, adaptations, or council duties
- AdminAvenger confirms money saved, recovered, or owed without user-confirmed official outcome evidence
- AdminAvenger hides uncertainty or cannot-know information
- AdminAvenger encourages unsafe action without review

## Go Criteria

Proceed with a small pilot only if testers understand:

- AdminAvenger helps prepare. You stay in control.
- AI prepares. Humans decide.
- outputs are preparation, not advice
- drafts/checklists must be reviewed before use
- dates, money, and facts must be checked against the original source
- nothing is sent, submitted, shared, or contacted automatically
- local data controls exist and are understandable

## Manual Pre-Pilot Checklist

Before inviting testers, complete:

- [ ] Run full automated tests.
- [ ] Run lint.
- [ ] Run build.
- [ ] Open production alias and confirm current deploy is the intended commit.
- [ ] Open Home and confirm the main promise and local/privacy wording are clear.
- [ ] Run one normal admin synthetic example.
- [ ] Run one benefits/admin synthetic example.
- [ ] Run one Workplace Support synthetic example.
- [ ] Run Community Helper controlled intake with typed text.
- [ ] Click each Community Helper example chip and confirm it only fills the textarea.
- [ ] Prepare Community Helper notes and confirm the local feedback panel appears.
- [ ] Save and clear feedback; confirm nothing is sent or uploaded.
- [ ] Download adviser export.
- [ ] Copy one prepared draft/checklist.
- [ ] Open case progress tracker.
- [ ] Open Settings and local data controls.
- [ ] Clear local data on a test browser profile.
- [ ] Ask at least one internal reviewer to read the result page for advice-like wording.

## Next Branch Suggestions

- `pilot-test-script-v1`
- `onboarding-copy-polish-v1`

## Decision

Do not invite real pilot users until the stop/go criteria have been reviewed with at least one internal reviewer and the manual pre-pilot checklist has been completed.
