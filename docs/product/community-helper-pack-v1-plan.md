# Community Helper Pack v1 Plan

Status: planning only. Do not implement until reviewed.

## 1. Summary

Community Helper Pack v1 would help people prepare a clear support pack from
confusing admin, letters, screenshots, notes, and appointments. It is for:

- people preparing notes for themselves
- family members or trusted helpers supporting someone else
- carers helping organise admin
- support workers preparing for a meeting
- occupational therapists, housing officers, advisers, or community workers who
  need a faster picture of daily-life impact

The pack would help capture how admin problems affect daily life so a human
support worker, occupational therapist, housing officer, social worker, adviser,
or trusted person can understand the situation faster.

It fits AdminAvenger because it uses the existing "Check a message" front door
and the same preparation-first structure:

- explain what the input appears to be about
- preserve visible facts and source wording
- gather dates, references, documents, and examples
- show what is missing or uncertain
- prepare questions and notes for a human helper
- keep the user in control

Community Helper Pack v1 must be preparation-only. It must not replace a
professional assessment, clinical judgement, safeguarding process, care
assessment, housing decision, benefits advice, or social work decision.

Standing public principle:

AdminAvenger helps prepare. You stay in control.

## 2. Scope

Safe preparation areas:

- daily-life impact notes
- admin barriers
- communication barriers
- missed letters or deadlines
- appointment preparation
- housing and support context
- care and support context
- routines, memory, planning, and organisation barriers
- evidence gathering
- questions for a support worker, OT, housing officer, adviser, or trusted
  person
- trusted helper notes, where consent and user control are clear

The v1 pack should help the user describe what is happening and what to ask
about. It should not decide what support, equipment, adaptations, care, or
professional intervention is required.

## 3. Non-Scope

Community Helper Pack v1 must not:

- diagnose
- assess care needs
- decide eligibility
- recommend equipment
- recommend adaptations
- make safeguarding decisions
- judge whether someone is safe or unsafe
- decide whether someone can live independently
- decide whether someone has capacity for a decision
- replace professional assessment
- replace a GP, clinician, OT, social worker, benefits adviser, housing
  officer, safeguarding professional, or support worker
- contact services automatically
- submit forms automatically
- create official reports
- claim that a council, provider, landlord, or service must act

High-stakes situations such as safeguarding, coercion, neglect, capacity,
medical risk, housing safety, and financial abuse must be handled as human
signposting and preparation only.

## 4. Safe Wording Rules

Allowed wording examples:

- "This appears to describe difficulty with..."
- "You may want to write down how this affects daily routines."
- "Ask a support worker, OT, housing officer, adviser, or someone trusted."
- "This is preparation only, not an assessment."
- "AdminAvenger helps prepare. You stay in control."
- "Evidence or examples that may help a human understand the situation."
- "Questions to ask a professional or trusted helper."
- "AdminAvenger cannot know what support is appropriate from this alone."

Banned wording examples:

- "This person needs an OT assessment."
- "The council must provide support."
- "This proves they are unsafe."
- "They qualify for care."
- "They need this equipment."
- "This is neglect."
- "This is a safeguarding issue."
- "They cannot live alone."
- "They are entitled to adaptations."
- "This proves disability."
- "This is medical advice."
- "This is a care assessment."
- "This is a risk score."

Implementation note: before any user-facing helper pack ships, these banned
phrases and related variants should be added to the safety wording regression
suite. Tests should scan generated output, not private source text pasted by a
user.

## 5. User Roles and Front Door Model

Future role language:

- For myself
- Helping someone
- Supporting people at work

These labels should affect tone and consent prompts, not routing complexity for
the user. The product must still keep one front door: Check a message.

### For myself

Tone:

- direct, reassuring, plain English
- focus on helping the person explain what is hard and what they want a human to
  understand

Consent:

- the user is preparing their own notes
- remind them they control what they save, download, share, or delete

### Helping someone

Tone:

- careful and consent-aware
- avoid speaking over the person
- encourage involving the person where possible

Consent expectations:

- ask whether the person is happy for the helper to prepare notes
- avoid hidden surveillance
- avoid storing sensitive details without permission
- avoid using the app to pressure, monitor, or control someone
- encourage checking wording with the person before sharing

### Supporting people at work

Tone:

- professional, concise, and boundaries-first
- avoid assuming a role or authority the user does not have

Consent expectations:

- follow the user's organisation rules
- avoid adding unnecessary sensitive details
- use the output as preparation notes, not an assessment or official record
- involve the person where appropriate and safe

Across all roles, the user remains in control. AdminAvenger must not contact
anyone, submit anything, or hide where information came from.

## 6. Candidate Support Situations

### Missed benefit or appointment letters due to memory or routine issues

What the input might look like:

- several benefit letters, appointment reminders, missed call notes, or user
  notes saying letters are being missed or opened late

Safe user-facing label:

- "Missed letters and appointment preparation"

Key facts to extract:

- dates on letters
- appointment dates
- missed reply dates if visible
- organisation names
- reference numbers
- what the user says makes letters hard to manage

Evidence/context to gather:

- original letters
- appointment notes
- envelope dates if available
- examples of missed or late-opened letters
- current system for reminders, if any
- trusted helper contact, if the person chooses to include it

Questions to ask:

- "Which letters are most urgent to check first?"
- "What makes opening or responding to letters difficult?"
- "Who can help check dates or reminders?"
- "Is there a safe way to keep important letters together?"

CannotKnow examples:

- whether a benefit deadline is legally final
- whether support is available
- whether memory issues have a medical cause
- whether an organisation will accept a late response

Safe next-step wording:

- "Check the dates against the original letters and write down what makes
  letters hard to manage. Ask a support worker, adviser, or trusted person what
  to prioritise."

### Difficulty understanding official letters

What the input might look like:

- council, NHS, benefits, housing, debt, or service letters the person finds
  hard to understand

Safe user-facing label:

- "Official letter understanding preparation"

Key facts to extract:

- sender
- date
- reference number
- what the letter appears to ask for
- dates or appointments
- any documents requested

Evidence/context to gather:

- original letter
- previous related letters
- screenshots or envelopes if helpful
- notes on which parts are confusing
- questions the person wants answered

Questions to ask:

- "What does this letter seem to be asking for?"
- "Which words or sections are confusing?"
- "Is there a date, appointment, or form mentioned?"
- "Who could help explain this safely?"

CannotKnow examples:

- whether the letter is complete
- whether the sender has made a correct decision
- whether a deadline has legal effect
- whether the user should respond in a specific way

Safe next-step wording:

- "Use this as a plain-English preparation note. Check important dates against
  the original letter and ask someone trusted if the message affects money,
  housing, health, or safety."

### Housing repair or access difficulty

What the input might look like:

- messages about repairs, damp, access, broken fixtures, missed appointments,
  stairs, lifts, locks, heating, or entry problems

Safe user-facing label:

- "Housing repair or access preparation"

Key facts to extract:

- landlord, council, housing association, or repair contact
- repair or access issue described
- dates reported
- appointment dates
- reference numbers
- impact described by the person

Evidence/context to gather:

- repair reports
- photos, where safe and relevant
- appointment records
- messages to/from landlord or repair team
- notes on daily-life impact
- accessibility or mobility context the person chooses to share

Questions to ask:

- "When was the issue first reported?"
- "What repair or access problem is shown?"
- "How is this affecting daily routines?"
- "What reference numbers or appointments exist?"

CannotKnow examples:

- whether the home is legally unsafe
- whether the landlord or council must do a specific repair
- whether an adaptation is required
- whether the person can live independently

Safe next-step wording:

- "Gather repair dates, messages, photos if useful, and daily-life impact notes.
  Ask a housing officer, adviser, support worker, or trusted person what to ask
  next."

### Preparing for OT or support worker visit

What the input might look like:

- appointment letter, user notes about daily routines, housing access issues, or
  a checklist for a home visit

Safe user-facing label:

- "Support visit preparation"

Key facts to extract:

- appointment date and location
- professional or service name
- purpose of visit if stated
- daily tasks the person wants to discuss
- home or routine barriers mentioned

Evidence/context to gather:

- appointment letter
- notes on morning/evening routine
- examples of tasks that are difficult
- photos or room notes if the person wants to use them
- questions for the visitor

Questions to ask:

- "What would you like the visitor to understand first?"
- "Which daily tasks are hardest?"
- "What happens on a bad day?"
- "What questions do you want to ask?"

CannotKnow examples:

- whether equipment is appropriate
- whether adaptations are appropriate
- whether the person is eligible for support
- what a professional assessment would conclude

Safe next-step wording:

- "Write down examples of daily-life impact and questions for the visit. A
  professional can decide what assessment or support is appropriate."

### Carer helping someone organise letters

What the input might look like:

- a carer uploads several letters or writes that someone is overwhelmed by
  letters, appointments, bills, or forms

Safe user-facing label:

- "Helper letter organisation preparation"

Key facts to extract:

- who the letters are from
- dates and deadlines to check
- reference numbers
- forms or appointments mentioned
- what the helper says they are helping with

Evidence/context to gather:

- letters sorted by sender/date
- list of urgent-looking dates
- questions for the person
- person's preferences about help and sharing
- trusted contacts if the person wants them recorded

Questions to ask:

- "Is the person happy for you to help with this?"
- "Which letters do they want help understanding?"
- "Are there dates or appointments to check first?"
- "What should not be shared without permission?"

CannotKnow examples:

- whether the person consents to every use of the notes
- whether the helper has authority to act
- whether the person has capacity for a specific decision
- whether the situation needs professional involvement

Safe next-step wording:

- "Check consent and preferences first. Sort dates and questions, then review
  the notes with the person before sharing them."

### Support worker preparing notes for a meeting

What the input might look like:

- notes from a support worker about housing, benefits, care, health, debt, or
  admin problems before a meeting

Safe user-facing label:

- "Meeting notes preparation"

Key facts to extract:

- meeting date
- people or organisations involved
- main admin issues
- dates, references, and documents mentioned
- questions to take to the meeting

Evidence/context to gather:

- original letters
- consent or preferences record, where relevant
- timeline
- examples of daily-life impact
- documents the person wants to bring

Questions to ask:

- "What does the person want help with?"
- "What are the most important dates or documents?"
- "What should be checked before the meeting?"
- "What does the person not want shared?"

CannotKnow examples:

- whether the notes are complete
- whether all consent requirements have been met
- what a professional should decide
- whether a safeguarding route is required

Safe next-step wording:

- "Use this as preparation notes only. Check consent, source documents, and the
  person's preferences before sharing."

### Daily routine or admin overwhelm

What the input might look like:

- user writes that they cannot keep up with letters, forms, appointments,
  passwords, bills, or calls

Safe user-facing label:

- "Daily admin overwhelm preparation"

Key facts to extract:

- admin tasks mentioned
- routines affected
- deadlines or appointments mentioned
- services involved
- what the user says is hardest

Evidence/context to gather:

- list of current admin tasks
- dates to check
- letters/forms to bring
- examples of what gets missed
- what has helped before, if the user chooses to include it

Questions to ask:

- "What part of the admin is hardest?"
- "What gets missed most often?"
- "What would you like a helper to understand?"
- "Is there one task that needs checking first?"

CannotKnow examples:

- why admin feels difficult
- whether there is a medical or disability-related reason
- what support is appropriate
- whether any service will offer support

Safe next-step wording:

- "Write down the admin tasks, dates, and examples of what becomes difficult.
  Share the notes with someone trusted if you want help making a plan."

### Communication difficulties

What the input might look like:

- notes saying phone calls, letters, forms, apps, language, hearing, speech,
  reading, or anxiety make communication difficult

Safe user-facing label:

- "Communication support preparation"

Key facts to extract:

- communication barrier described
- organisations involved
- preferred contact method if stated
- appointments, forms, or letters affected
- examples of missed or misunderstood messages

Evidence/context to gather:

- letters/messages involved
- examples of confusing wording
- preferred communication notes
- support person contact, if the person wants it included

Questions to ask:

- "What communication method works best?"
- "Which messages are hard to understand or respond to?"
- "What would you like a support worker or adviser to know?"

CannotKnow examples:

- whether a specific communication support must be provided
- whether a diagnosis or disability applies
- whether the organisation has met its duties
- whether a professional assessment would agree

Safe next-step wording:

- "Write down what communication method helps and which messages are difficult.
  Ask a support worker, adviser, or trusted person how to explain this clearly."

### Vulnerability or financial admin concerns

What the input might look like:

- user or helper describes unpaid bills, confusing debts, someone else handling
  money, pressure to share money, missing statements, or concern about financial
  admin

Safe user-facing label:

- "Financial admin concern preparation"

Key facts to extract:

- organisations mentioned
- dates and amounts shown
- who is involved, if stated
- what the concern appears to be
- whether pressure, confusion, or missing information is described

Evidence/context to gather:

- letters, bills, or statements
- timeline of events
- screenshots or messages, where safe
- trusted contacts or adviser details, if the person chooses
- questions for a debt, benefits, housing, or safeguarding professional

Questions to ask:

- "Who is involved in the admin?"
- "What money or documents are mentioned?"
- "Is anyone feeling pressured or unable to say no?"
- "Who could check this safely?"

CannotKnow examples:

- whether financial abuse is happening
- whether money is owed
- whether someone has authority to manage money
- whether a safeguarding referral is required

Safe next-step wording:

- "Keep the evidence together and speak to a trusted person or appropriate
  professional if there is pressure, coercion, missing money, or serious worry.
  AdminAvenger cannot decide what is happening."

### Urgent safeguarding-like wording requiring human signposting

What the input might look like:

- message mentioning immediate danger, abuse, neglect, self-neglect, coercion,
  unsafe home, threats, exploitation, or someone unable to get basic needs met

Safe user-facing label:

- "Urgent human support preparation"

Key facts to extract:

- what the message says is happening
- who may be involved
- dates, locations, and services mentioned
- whether immediate danger is described
- whether a professional or emergency service is already involved

Evidence/context to gather:

- source message or notes
- contact details for known support services
- timeline
- immediate practical concerns
- who already knows, if anyone

Questions to ask:

- "Is anyone in immediate danger right now?"
- "Who is already involved?"
- "Who can you contact safely?"
- "What facts need to be shared with a human professional?"

CannotKnow examples:

- whether this is a safeguarding issue
- whether emergency action is required
- whether a referral should be made
- whether the person is safe
- whether abuse, neglect, or coercion is occurring

Safe next-step wording:

- "If someone may be in immediate danger, use appropriate emergency or local
  safeguarding routes. AdminAvenger can help organise notes, but it cannot make
  safeguarding decisions."

## 7. Pack Structure

Community Helper Pack v1 should produce a compact preparation pack with these
sections:

1. What this appears to be about
2. Who is involved
3. What the person needs help understanding
4. Daily-life impact
5. Admin or routine barriers
6. Communication barriers
7. Home, access, or appointment barriers if mentioned
8. Important dates or deadlines to check
9. Documents or evidence to bring
10. Questions to ask
11. What AdminAvenger cannot know
12. Preparation-only warning
13. Trusted helper notes

The pack should use short, editable notes. It should distinguish:

- facts found in the user's input
- user-provided impact notes
- questions still to answer
- things a professional or trusted helper must check

## 8. Optional Questions

Safe optional prompts:

- "What happened?"
- "When did this start?"
- "What part of the admin is hardest?"
- "How does this affect daily routines?"
- "Has anyone else seen this problem?"
- "Is there a letter, appointment, deadline, or reference number?"
- "What would you like a support worker or adviser to understand?"
- "Is the person happy for you to help with this?"
- "What should not be shared without permission?"
- "Who already knows about this?"
- "What would make the next appointment easier?"

Avoid medical diagnosis questions such as:

- "What condition does this prove?"
- "What diagnosis do they have?"
- "What equipment do they need?"
- "What care package should they receive?"
- "Are they safe to live alone?"

## 9. Evidence Checklist Model

Safe checklist items:

- original letter or message available
- date or deadline checked
- appointment details checked
- reference numbers checked
- timeline written down
- examples of daily-life impact written down
- relevant letters, photos, or notes gathered
- questions prepared
- person's consent or preferences recorded where relevant
- trusted person, support worker, OT, housing officer, adviser, or social worker
  checked if needed

This checklist is not:

- a risk score
- a care score
- an eligibility score
- a safeguarding decision
- a professional assessment
- a measure of need

It only shows what preparation information is present or still missing.

## 10. Draft and Checklist Boundaries

Allowed v1 outputs:

- meeting preparation notes
- questions for an OT, support worker, housing officer, adviser, or trusted
  person
- daily-life impact summary
- admin barrier summary
- communication barrier summary
- timeline summary
- helper notes
- document checklist
- plain-English summary of what the input appears to describe

Not allowed in v1:

- medical diagnosis statements
- equipment recommendation letters
- formal care assessment conclusions
- safeguarding reports
- legal threats
- benefit entitlement arguments
- "council must provide" demands
- letters claiming eligibility
- letters claiming negligence
- letters claiming a person is unsafe
- letters saying a person cannot live alone
- letters telling a service what it must provide

All drafts must remain editable and must say AdminAvenger has not sent
anything. The user or helper must review wording before using or sharing.

## 11. CannotKnow Examples

Community Helper Pack v1 should keep cannotKnow visible by default.

Examples:

- whether someone has a diagnosis
- whether someone is eligible for support
- whether equipment or adaptations are appropriate
- whether a safeguarding referral is required
- whether someone can live independently
- whether a professional assessment would agree
- whether the council, housing provider, employer, NHS service, or other body
  must act
- whether a person has capacity for a specific decision
- whether a carer or helper has authority to act
- whether a person has consented to every use of the notes
- whether financial abuse, neglect, coercion, or exploitation is occurring
- whether the notes include every important fact

## 12. Risk Register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Helper uses app without consent | The pack may include sensitive personal details | Ask whether the person is happy for the helper to prepare notes; encourage review with the person where possible |
| App output treated as assessment | Users may mistake a neat pack for a professional decision | Repeat "preparation only, not an assessment"; avoid scores and recommendations |
| Safeguarding issue missed | Serious harm could be underplayed | Use cautious human signposting when danger, coercion, neglect, exploitation, or immediate risk is mentioned |
| Safeguarding issue overclaimed | Incorrectly labelling a situation can cause harm | Never say something is a safeguarding issue; say AdminAvenger cannot decide and human routes may be needed |
| Medical or care advice confusion | Users may assume the app can decide support needs | Ban diagnosis, care eligibility, equipment, and adaptation recommendations |
| Support worker over-relies on output | Professional judgement could be displaced | Make the pack source-based and preparation-only; include cannotKnow and review prompts |
| Vulnerable person feels controlled | A helper might use notes to pressure someone | Add consent and preference prompts; discourage hidden surveillance or sharing without permission |
| Private family conflict | Family helpers may disagree or act without authority | Keep tone neutral; ask what the person wants shared and who is trusted |
| Financial abuse or coercion risk | Money-admin concerns can involve control or exploitation | Signpost to trusted human/professional routes; do not decide abuse or authority |
| Housing, care, and benefits overlap | Multiple high-stakes systems may be involved | Keep each issue as preparation notes and signpost relevant human support |
| User misunderstands preparation progress as eligibility score | A complete pack may be mistaken for proof of need | Say checklist completeness is not eligibility, risk, care, or support scoring |
| Sensitive data stored locally without awareness | Helper notes may contain health, care, housing, or money details | Keep local-first privacy copy visible; remind users they control save, download, share, and delete |
| Capacity or consent misunderstood | Capacity is decision-specific and cannot be inferred from a note | Never assess capacity; ask helpers to follow appropriate human/professional routes |

## 13. Golden Demo Fixture Plan

All fixtures must be synthetic. Do not use real care notes, support records,
medical letters, safeguarding records, housing files, benefit letters, or family
messages.

### Carer helping with missed benefit letters

Expected safe behaviour:

- identify missed letters/admin preparation
- extract dates and sender/reference details
- ask about consent and priorities
- no benefits entitlement advice

### Person overwhelmed by housing repair letters

Expected safe behaviour:

- identify housing repair/access preparation
- extract repair issue, dates, reference numbers, appointment details
- ask for daily-life impact examples
- no claim that the home is unsafe or that the provider must act

### OT visit preparation

Expected safe behaviour:

- identify support visit preparation
- extract appointment date and daily tasks mentioned
- prepare questions for the visit
- no equipment, adaptation, or eligibility recommendation

### Support worker preparing meeting notes

Expected safe behaviour:

- identify meeting notes preparation
- structure people involved, issues, dates, documents, and questions
- include consent/preference reminder
- no professional assessment conclusion

### Communication difficulty with official letters

Expected safe behaviour:

- identify communication support preparation
- extract sender, dates, what appears to be requested
- ask about preferred communication
- no diagnosis or legal duty conclusion

### Daily routine/admin overwhelm

Expected safe behaviour:

- identify daily admin overwhelm preparation
- extract tasks, routines affected, and dates to check
- prepare a short support note
- no medical or care conclusion

### Vulnerable adult financial admin concern

Expected safe behaviour:

- identify financial admin concern preparation
- extract organisations, dates, amounts, people involved if shown
- include coercion/pressure signposting if indicated
- no decision that abuse has occurred and no money counting

### Urgent safeguarding-like message

Expected safe behaviour:

- identify urgent human support preparation
- show human signposting
- state AdminAvenger cannot decide safeguarding or immediate safety
- no risk score

### Vague "help me with everything" input

Expected safe behaviour:

- conservative fallback
- ask what happened, what is hardest, dates/references, and who can help
- no assumptions about care needs, diagnosis, or eligibility

### Consent-sensitive helper input

Expected safe behaviour:

- ask whether the person is happy for the helper to prepare notes
- discourage hidden monitoring or sharing without permission
- preserve user control and local-first boundary

## 14. Implementation Steps

Future implementation should be split into small branches:

1. Community helper data model
   - define preparation pack sections, role labels, evidence items, and
     cannotKnow fields

2. Optional role/front-door model
   - design "For myself / Helping someone / Supporting people at work" as
     optional tone and consent context behind Check a message
   - do not add a separate checker without separate product review

3. Classifier/router extension
   - add community-helper signals behind the existing decision pipeline
   - route vague or high-risk inputs conservatively

4. Community Helper Pack builder
   - derive daily-life impact notes, admin barriers, questions, evidence, and
     trusted-helper notes from existing inputs

5. ResultViewModel integration
   - show a composed result without stacking duplicate panels
   - keep cannotKnow and preparation boundaries visible

6. CaseProgress integration
   - add preparation checklist family
   - no risk, care, or eligibility scoring

7. Adviser export integration
   - include helper pack sections in local Markdown adviser packs
   - preserve no-send/no-submit/not-assessment footer lines

8. Safety wording regression tests
   - add banned helper, care, medical, safeguarding, and eligibility wording
   - scan generated output across rendered surfaces

9. Golden corpus fixtures
   - add synthetic fixtures listed above
   - assert safe routing, no diagnosis, no eligibility decision, no safeguarding
     decision, and visible human signposting

10. UI rendering
   - use Result Page v2 and the existing one-front-door intake
   - keep mobile output short and preparation-focused

11. Docs update
   - document shipped scope, safety boundaries, and fixture coverage after
     implementation review

## 15. Tests Needed

Before v1 ships, add tests for:

- safe routing
- forbidden wording absent
- cannotKnow visible
- uncertainty visible
- no diagnosis
- no equipment recommendation
- no care eligibility decision
- no safeguarding decision
- no council obligation claim
- no risk score
- consent-sensitive helper wording
- human signposting
- evidence checklist safety
- no professional assessment wording
- no automatic contact, sending, or submission
- dates marked as user-must-check
- money display-only and not counted
- high-risk safeguarding-like inputs route to human signposting
- vague helper inputs degrade gracefully
- rendered ResultViewModel safety
- Adviser Export Pack helper Markdown safety
- Golden Letter Corpus coverage for every v1 candidate situation

## 16. Stop/Go Criteria

Community Helper Pack v1 is safe to build only when:

- this plan has been reviewed
- safety wording suite is updated
- golden fixtures are synthetic and contain no real care, medical, housing,
  support, or family data
- generated output contains no diagnosis wording
- generated output contains no care eligibility wording
- generated output contains no safeguarding decision wording
- generated output contains no equipment recommendation wording
- generated output contains no council obligation claim
- generated output contains no risk score
- human signposting is visible
- helper consent wording is visible
- local-first privacy copy remains visible
- UI remains preparation-only
- Check a message remains the only front door
- money is display-only and never counted automatically
- dates always say to check the original message

Do not build if any v1 output implies that AdminAvenger has assessed needs,
diagnosed a condition, decided support eligibility, made a safeguarding
decision, contacted a service, submitted a form, recommended equipment, or
confirmed that an organisation must act.

## 17. Recommendation

Build Community Helper Pack v1 only after this plan is reviewed.

Start with lower-risk daily-life and admin preparation notes:

- difficulty understanding official letters
- daily routine/admin overwhelm
- appointment preparation
- carer/helper letter organisation with consent prompts
- support worker meeting notes

Delay higher-risk features:

- safeguarding-like outputs beyond human signposting
- care eligibility or care-needs language
- capacity-related workflows
- equipment or adaptation recommendations
- formal care, housing, medical, or safeguarding report generation

Keep support worker, OT, housing officer, adviser, social worker, and trusted
person signposting visible. Keep "For myself / Helping someone / Supporting
people at work" as future front-door language, not immediate implementation
unless separately planned.
