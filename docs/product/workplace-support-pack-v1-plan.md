# Workplace Support Pack v1 Plan

Status: planning only. Do not implement until reviewed.

## 1. Summary

Workplace Support Pack v1 would help users prepare for confusing workplace
letters, emails, and messages through AdminAvenger's existing front door:
Check a message.

It is for workers who need to understand what a workplace message appears to
be, collect facts, organise evidence, prepare questions, and decide what to ask
a human support route such as ACAS, a union rep, HR, Citizens Advice, an
adviser, or someone trusted.

It fits AdminAvenger because it follows the same social mission as benefits,
debt, and consumer support:

- explain what the document appears to be
- separate visible facts from uncertainty
- gather dates, references, people, policies, and evidence
- prepare calm editable notes, questions, and checklists
- keep the user in control

Workplace Support Pack v1 must be preparation-only. It must not decide
employment rights, assess tribunal prospects, calculate compensation, or tell
the user what action to take.

Standing public principle:

AdminAvenger helps prepare. You stay in control.

## 2. Scope

Safe v1 workplace categories:

- disciplinary letter or meeting invite
- grievance letter or grievance outcome
- sickness absence meeting
- capability meeting
- redundancy consultation
- pay or wage confusion
- contract change
- rota or shift change
- workplace bullying or harassment record preparation
- dismissal letter
- flexible working request, refusal, or confusion
- return-to-work meeting
- workplace investigation invite

Each category should produce a preparation pack, not an employment-law view.
The pack should help the user check the original message, preserve evidence,
write down questions, and ask the right human support route.

## 3. Non-Scope

Workplace Support Pack v1 must not:

- provide legal advice
- decide employment rights
- assess tribunal prospects
- calculate compensation
- say an employer acted unlawfully
- say a worker has proved discrimination, unfair dismissal, harassment, or any
  other claim
- tell someone to resign
- tell someone to refuse a meeting
- tell someone to attend a meeting without support
- tell someone to sign or not sign an agreement
- contact an employer, HR, ACAS, union, adviser, solicitor, or public body
  automatically
- submit claims, grievances, tribunal forms, appeals, or ACAS notifications
- present itself as ACAS, a union rep, HR, Citizens Advice, a solicitor, or an
  official guidance service

Settlement agreements are especially high risk. V1 may identify that a document
mentions a settlement agreement and show a strong "ask a qualified human before
signing" preparation warning. It must not explain whether the offer is good,
whether the user should sign, or what compensation is appropriate.

## 4. Safe Wording Rules

Allowed wording examples:

- "This appears to be about..."
- "Check the date and meeting details against the original letter."
- "You may want to ask ACAS, a union rep, HR, Citizens Advice, or someone
  trusted."
- "This is a preparation checklist, not legal advice."
- "AdminAvenger helps prepare. You stay in control."
- "Questions you could ask a human adviser or workplace representative."
- "Evidence that may be useful to gather."
- "AdminAvenger cannot know whether the employer has followed the right
  process from this message alone."

Banned wording examples:

- "Your employer broke the law."
- "You will win."
- "You are owed compensation."
- "This is unfair dismissal."
- "This proves discrimination."
- "You have a valid claim."
- "Your case is strong."
- "You should resign."
- "Submit a tribunal claim now."
- "Refuse the meeting."
- "Do not sign this."
- "The employer is wrong."
- "This is legal advice."

Implementation note: these examples should be added to the safety wording
regression suite before any user-facing workplace output ships.

## 5. Candidate Document Types

### Disciplinary invite

What it might look like:

- email or letter inviting the worker to a disciplinary meeting
- mentions allegation, meeting date, possible outcome, companion, manager, or
  investigation documents

Safe user-facing label:

- "Disciplinary meeting preparation"

Key facts to extract:

- meeting date and time
- meeting location or video link
- employer contact person
- alleged issue, quoted cautiously
- whether companion/support is mentioned
- documents or evidence the employer says it will rely on
- reply-by date if stated

Evidence to gather:

- original invite
- contract or handbook section if mentioned
- investigation notes or evidence pack if supplied
- relevant emails, messages, rota, payslips, or attendance records
- user's timeline of what happened

Questions to ask:

- "What is the meeting about in plain terms?"
- "What documents will be considered?"
- "Can I bring a companion or representative?"
- "Who should I contact if I need an adjustment or cannot attend?"

CannotKnow examples:

- whether the employer has followed a fair process
- whether the allegation is accurate
- what outcome the employer may choose
- whether the user should attend, postpone, or take another step

Safe next-step wording:

- "Check the meeting details and gather the documents mentioned. Consider
  asking ACAS, a union rep, HR, Citizens Advice, or someone trusted what to ask
  before the meeting."

### Grievance outcome

What it might look like:

- letter saying a grievance has been upheld, partly upheld, or not upheld
- mentions appeal route, outcome reasons, workplace actions, or follow-up
  meeting

Safe user-facing label:

- "Grievance outcome preparation"

Key facts to extract:

- outcome date
- appeal or review date if stated
- who made the decision
- issues considered
- actions the employer says it will take
- next step route mentioned in the letter

Evidence to gather:

- original grievance
- outcome letter
- meeting notes
- witness names or documents mentioned
- timeline of events
- any policy or handbook extracts referenced

Questions to ask:

- "What reasons did the employer give?"
- "Is there a review or appeal route in the letter?"
- "What evidence was considered?"
- "What evidence or examples do I still need to organise?"

CannotKnow examples:

- whether the outcome is lawful
- whether an appeal would change anything
- whether discrimination or harassment has been proven
- whether the employer considered all evidence

Safe next-step wording:

- "Check any review route and dates against the letter. If the issue is
  serious or unclear, consider asking ACAS, a union rep, Citizens Advice, or an
  adviser before replying."

### Sickness absence or capability meeting

What it might look like:

- invite to sickness absence review, capability meeting, occupational health
  review, return-to-work discussion, or performance capability meeting

Safe user-facing label:

- "Sickness or capability meeting preparation"

Key facts to extract:

- meeting date and time
- stated reason for meeting
- sickness period or performance concern mentioned
- occupational health or medical evidence mentioned
- possible outcomes stated by employer
- support, adjustment, or companion wording if present

Evidence to gather:

- fit notes or medical letters the user is comfortable gathering
- occupational health reports if already provided
- absence records
- return-to-work notes
- messages about adjustments, workload, or duties
- contract or policy wording if referenced

Questions to ask:

- "What is the purpose of the meeting?"
- "What information will the employer use?"
- "Can I provide medical evidence or adjustment requests?"
- "Who can I ask for support before the meeting?"

CannotKnow examples:

- whether any condition is legally protected
- whether an adjustment is required
- whether dismissal or warning will happen
- whether the employer's evidence is complete

Safe next-step wording:

- "Gather meeting details, any relevant medical or workplace documents you
  already have, and questions to ask. Consider getting advice if the issue
  could affect your job, pay, health, or safety."

### Redundancy consultation

What it might look like:

- letter inviting the worker to redundancy consultation
- mentions role at risk, selection pool, consultation dates, alternative roles,
  redundancy pay, or notice

Safe user-facing label:

- "Redundancy consultation preparation"

Key facts to extract:

- consultation date
- role or team affected
- selection criteria mentioned
- alternative roles mentioned
- redundancy pay or notice amounts mentioned
- consultation contact person

Evidence to gather:

- at-risk letter
- consultation notes
- selection criteria
- job descriptions
- alternative role details
- pay, service length, and contract information

Questions to ask:

- "What role or pool is affected?"
- "What selection criteria are being used?"
- "What alternatives have been considered?"
- "What dates and consultation steps are shown in the letter?"

CannotKnow examples:

- whether redundancy is genuine
- whether the process is fair
- whether the user should accept an alternative role
- whether any payment figure is correct

Safe next-step wording:

- "Check consultation dates and gather the documents mentioned. If your job may
  be at risk, consider asking a union rep, ACAS, Citizens Advice, HR, or an
  adviser what questions to take into consultation."

### Wage deduction or pay issue

What it might look like:

- payslip issue, deduction notice, unpaid hours query, holiday pay confusion,
  missing overtime, or payroll email

Safe user-facing label:

- "Pay issue preparation"

Key facts to extract:

- pay period
- amount mentioned
- deduction or missing payment description
- employer or payroll contact
- dates worked or holiday dates if stated
- reference, payslip, or payroll number if shown

Evidence to gather:

- payslips
- rota or timesheets
- contract pay rate if available
- messages approving hours or holiday
- bank payment records
- payroll emails

Questions to ask:

- "What pay period does this cover?"
- "What amount is shown and what is it said to relate to?"
- "Who can explain the calculation?"
- "What documents can I compare with the payslip?"

CannotKnow examples:

- whether the amount is correct
- whether money is owed
- whether the deduction is allowed
- whether a legal claim exists

Safe next-step wording:

- "Gather payslips, rota or timesheet evidence, and payroll messages. Ask
  payroll or HR for a clear breakdown, or ask ACAS, a union rep, Citizens
  Advice, or an adviser if the issue is serious."

Money safety:

- amounts are display-only
- no compensation or arrears are calculated
- no money is counted as saved or recovered

### Contract change

What it might look like:

- proposed change to hours, pay, place of work, duties, benefits, working
  pattern, notice period, or contract terms

Safe user-facing label:

- "Contract change preparation"

Key facts to extract:

- proposed change
- date the change may start
- response date if stated
- person or department to contact
- reason given for the change
- whether consultation or agreement is mentioned

Evidence to gather:

- current contract
- proposed change letter
- previous rota or pay records
- emails about the change
- notes of meetings
- personal impact notes

Questions to ask:

- "What exactly is changing?"
- "When is the change said to start?"
- "What happens if I have questions or concerns?"
- "Who can explain the proposed change?"

CannotKnow examples:

- whether the change is lawful
- whether the user should agree or refuse
- whether the employer has consulted enough
- whether there are wider employment rights involved

Safe next-step wording:

- "Compare the proposed change with your existing contract and write down the
  questions you want to ask before agreeing to anything."

### Dismissal letter

What it might look like:

- letter saying employment has ended, notice has been given, or dismissal has
  been confirmed
- may mention reason, date, appeal route, final pay, notice pay, or return of
  property

Safe user-facing label:

- "Dismissal letter preparation"

Key facts to extract:

- dismissal date
- reason stated by employer
- appeal or review date if stated
- final pay or notice pay mentioned
- contact person
- documents or evidence referenced

Evidence to gather:

- dismissal letter
- contract
- payslips and final pay information
- prior warnings or meeting invites
- meeting notes
- emails or messages about the decision

Questions to ask:

- "What reason does the letter give?"
- "Is there an appeal or review route?"
- "What dates does the letter mention?"
- "What final pay or notice information is shown?"

CannotKnow examples:

- whether the dismissal was lawful
- whether the user has a claim
- whether an appeal or tribunal would agree
- whether compensation is payable
- whether the user should appeal, claim, or accept the decision

Safe next-step wording:

- "This may be serious. Check the dates and any review route in the letter, and
  consider asking ACAS, a union rep, Citizens Advice, a solicitor, or an adviser
  before replying."

### Bullying or harassment record preparation

What it might look like:

- user-provided notes, messages, screenshots, or diary entries about workplace
  incidents

Safe user-facing label:

- "Workplace incident record preparation"

Key facts to extract:

- incident dates
- people involved
- location or channel
- what was said or done, preserving source wording carefully
- witnesses mentioned
- any report already made

Evidence to gather:

- screenshots
- emails or chat messages
- diary notes
- witness names
- rota or location records
- prior reports to manager, HR, union, or adviser

Questions to ask:

- "What happened, when, and who was there?"
- "What evidence exists outside memory?"
- "Has it already been reported?"
- "Who can help you decide a safe next step?"

CannotKnow examples:

- whether bullying, harassment, discrimination, or retaliation is proven
- whether the employer has legal responsibility
- whether reporting could create risk for the user
- whether the user's safety or health needs extra support

Safe next-step wording:

- "Write a clear timeline and gather evidence. If there is risk of retaliation,
  coercion, discrimination, or harm, consider speaking to a trusted person,
  union rep, ACAS, Citizens Advice, or an adviser before taking action."

### Workplace investigation invite

What it might look like:

- invitation to investigation meeting as subject, witness, or complainant
- mentions investigator, allegations, evidence, confidentiality, or companion

Safe user-facing label:

- "Workplace investigation preparation"

Key facts to extract:

- investigation meeting date
- role in the investigation if stated
- investigator name
- topic or allegation
- documents requested
- companion/support wording if present

Evidence to gather:

- invite
- investigation terms or policy if included
- relevant emails, screenshots, rota, or notes
- timeline of events
- questions for investigator or adviser

Questions to ask:

- "Am I being asked as a witness, complainant, or subject?"
- "What is the meeting about?"
- "What documents should I bring?"
- "Can I bring someone with me?"

CannotKnow examples:

- whether the investigation process is fair
- whether the employer has all evidence
- what outcome may follow
- what the user should say in the meeting

Safe next-step wording:

- "Check your role in the investigation and gather the documents mentioned.
  Consider asking ACAS, a union rep, HR, Citizens Advice, or someone trusted
  what questions to prepare."

### Flexible working

What it might look like:

- request outcome, refusal, meeting invite, or proposed alternative working
  pattern

Safe user-facing label:

- "Flexible working preparation"

Key facts to extract:

- request date
- outcome or meeting date
- working pattern requested
- reason or business ground given, if present
- alternative proposed arrangement
- response route if stated

Evidence to gather:

- original request
- employer response
- rota or childcare/caring pattern notes if relevant and safe to include
- contract or policy references
- previous informal agreements

Questions to ask:

- "What working pattern was requested?"
- "What reason or alternative did the employer give?"
- "Is there a meeting or review route in the message?"

CannotKnow examples:

- whether the refusal is lawful
- whether the employer considered the request properly
- whether another pattern would be accepted

Safe next-step wording:

- "Check the dates, reasons, and any review route in the letter. Prepare
  questions before replying or discussing it."

### Return-to-work meeting

What it might look like:

- invitation after sickness absence, injury, bereavement, stress, disability, or
  other absence

Safe user-facing label:

- "Return-to-work meeting preparation"

Key facts to extract:

- meeting date and time
- absence period mentioned
- contact person
- documents requested
- adjustment or support wording if present

Evidence to gather:

- return-to-work invite
- fit note or medical note if already available and the user chooses to use it
- absence record
- questions about duties, phased return, or support

Questions to ask:

- "What is the meeting for?"
- "What support or adjustments do I want to ask about?"
- "What documents have I been asked to bring?"

CannotKnow examples:

- whether the employer must offer a particular adjustment
- whether medical evidence is enough
- whether the user should disclose private health information

Safe next-step wording:

- "Prepare the facts you are comfortable sharing and write down questions about
  support, duties, and next steps."

## 6. Evidence Checklist Model

Workplace Support Pack v1 should use checklist language similar to the existing
Case Progress Tracker. It should show preparation completeness only.

Candidate checklist items:

- original letter or message available
- date, time, and location checked
- employer contact details checked
- role in the process checked, if shown
- policy, contract, or handbook reference found, if available
- timeline written down
- examples recorded
- payslips, rota, messages, or screenshots gathered, if relevant
- questions prepared
- draft or checklist reviewed
- ACAS, union rep, HR, Citizens Advice, adviser, or trusted person checked if
  needed

This checklist must not be a score for case quality, legal position, tribunal
prospects, or compensation. It only describes what preparation information is
present or still missing.

## 7. Draft and Checklist Boundaries

Allowed v1 draft/checklist outputs:

- questions to ask HR
- questions to ask ACAS
- notes for a union rep or adviser
- request for clarification
- meeting preparation notes
- timeline summary
- evidence checklist
- calm message asking for documents mentioned in a meeting invite
- note asking who to contact about a practical meeting issue

Drafts should be editable, cautious, and non-accusatory. They should include
the standing boundary that AdminAvenger has not sent anything and the user must
review before using.

Not allowed in v1:

- tribunal claim text
- legal threat letters
- resignation letters
- settlement agreement advice
- accusation-heavy letters
- letters saying "you broke the law"
- compensation demand letters
- texts telling the employer its process is unlawful
- texts refusing to attend a meeting
- texts accepting or rejecting an agreement

Settlement agreement output should be limited to a preparation warning and
questions to ask a qualified human adviser.

## 8. CannotKnow Examples

Workplace Support Pack v1 should keep cannotKnow visible by default.

Examples:

- whether the employer acted lawfully
- whether a claim exists
- whether a tribunal would agree with either side
- whether compensation is owed
- whether the user should attend, resign, sign, appeal, or make a claim
- whether the employer's evidence is complete
- whether internal policy has been followed
- whether a deadline has legal effect
- whether medical or disability evidence is sufficient
- whether reporting something could create retaliation or safety risk
- whether the message includes every relevant document

## 9. Risk Register

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| User treats output as legal advice | Workplace issues can affect income, health, immigration, and housing stability | Repeat "preparation checklist, not legal advice"; signpost ACAS, union, HR, Citizens Advice, adviser, or solicitor where serious |
| User misses a deadline | Employment-related routes can have important time limits | Extract dates as "dates to check"; always say check against original letter; do not claim a deadline is confirmed |
| User copies unsafe draft | A harsh message could escalate the situation | Allow only calm clarification, questions, timeline, and adviser-note drafts; block legal threat and accusation-heavy drafts |
| Domestic abuse, coercion, or workplace retaliation risk | Some workplace messages may be linked to wider safety risks | Include "consider speaking to someone trusted before acting" when retaliation, coercion, or harassment is indicated |
| Discrimination or harassment sensitivity | Incorrect wording could imply proof or underplay harm | Preserve source wording, show cannotKnow, avoid proof language, signpost to ACAS/union/adviser routes |
| Settlement agreement danger | Users may need independent advice before signing | Hard-warning category; no value assessment, no sign/don't-sign guidance, no draft accepting or rejecting |
| Constructive dismissal or resignation risk | Telling someone to resign could cause serious harm | Never draft resignation letters or advise resignation; signpost to human advice |
| Mental health or sickness sensitivity | Users may be vulnerable or disclose private medical details | Encourage careful sharing, evidence organisation, and human support; avoid medical/legal conclusions |
| Undocumented worker or immigration overlap | Employment messages may connect to immigration or right-to-work issues | Do not advise on immigration; signpost specialist advice when right-to-work or immigration is mentioned |
| Vulnerable user misunderstands confidence | Confidence in reading the document could be mistaken for confidence in outcome | Label confidence as document-read confidence only; keep cannotKnow visible |
| Employer monitoring or device privacy | Some workers may use employer devices or accounts | Remind user they control what they paste, save, download, or share; avoid automatic contact or upload |
| Pay issue interpreted as money owed | Payroll amounts can be complex | Show amounts as display-only; no automatic saving/recovery or compensation calculation |

## 10. Golden Letter Fixture Plan

All fixtures must be synthetic. Do not use real worker letters, real employer
names, or private workplace data.

### Disciplinary invite

Expected safe behaviour:

- route to workplace support preparation
- extract meeting date, allegation wording, contact person, companion wording
- show evidence checklist and questions
- cannotKnow whether process is fair or allegation is accurate
- no legal conclusion or outcome prediction

### Grievance outcome

Expected safe behaviour:

- identify grievance outcome preparation
- extract outcome date, review route if stated, reasons given
- ask user to check review dates and evidence considered
- cannotKnow whether outcome is lawful or complete

### Sickness absence meeting

Expected safe behaviour:

- identify sickness/capability meeting preparation
- extract meeting date, absence period, documents requested
- signpost human support if job, pay, health, or safety may be affected
- no medical, disability, or legal conclusion

### Redundancy consultation

Expected safe behaviour:

- identify redundancy consultation preparation
- extract consultation date, role at risk, selection criteria, alternative roles
- show questions to ask
- no prediction about redundancy outcome or payment correctness

### Wage deduction issue

Expected safe behaviour:

- identify pay issue preparation
- extract pay period, amount mentioned, payroll contact
- show payslip/rota/timesheet evidence checklist
- money display-only and not counted
- no "owed" wording

### Contract change

Expected safe behaviour:

- identify contract change preparation
- extract proposed change, start date, reply date, contact person
- suggest comparing against current contract and preparing questions
- no advice to agree or refuse

### Dismissal letter

Expected safe behaviour:

- identify dismissal letter preparation
- extract dismissal date, reason stated, review route, final pay mention
- strong signpost to ACAS, union, Citizens Advice, solicitor, or adviser
- cannotKnow whether dismissal was lawful or whether a claim exists

### Bullying or harassment record prep

Expected safe behaviour:

- identify incident record preparation
- extract dates, people, channel/location, witness names if present
- preserve source wording carefully
- signpost trusted person/adviser if retaliation or safety risk may exist
- no proof language

### Vague workplace message

Expected safe behaviour:

- conservative fallback
- ask user to check sender, date, what is being asked, and who to contact
- no workplace-law assumptions

### High-risk settlement agreement mention

Expected safe behaviour:

- identify settlement agreement warning path
- show preparation-only warning to ask qualified human advice before signing
- no valuation, no sign/don't-sign guidance, no compensation calculation
- no draft accepting or rejecting

## 11. Implementation Steps

Future implementation should be split into small branches:

1. Workplace support data model
   - define workplace document family types and preparation pack shape
   - keep it separate from legal outcome assessment

2. Classifier/router extension
   - add workplace signals behind Check a message
   - no user-facing category picker
   - route uncertain cases conservatively

3. Workplace Support Pack builder
   - build preparation-only facts, evidence, questions, cannotKnow, and draft
     prompts from the existing DecisionResult pipeline

4. ResultViewModel integration
   - map workplace pack outputs into the composed result page
   - keep dates user-check-required and money display-only

5. CaseProgress integration
   - add workplace preparation checklist family
   - no case quality or legal-position scoring

6. Adviser export integration
   - include workplace preparation sections in local Markdown adviser packs
   - preserve no-send/no-submit/not-advice footer lines

7. Safety wording regression tests
   - add workplace forbidden phrases and required safety themes
   - scan generated output, not source-letter quotes

8. Golden corpus fixtures
   - add synthetic workplace fixtures listed above
   - assert safe routing, cannotKnow, no outcome prediction, no money counting

9. UI rendering
   - use the existing Result Page v2 case sheet
   - do not create a separate workplace checker or page

10. Docs update
   - document shipped scope, non-scope, safety boundaries, and examples after
     implementation is reviewed

## 12. Tests Needed

Before v1 ships, add tests for:

- safe routing from Check a message
- forbidden wording absent
- cannotKnow visible
- uncertainty visible
- no outcome prediction
- no legal advice wording
- no "employer broke law" wording
- no compensation owed wording
- no tribunal prediction
- settlement agreement hard warning
- resignation danger warning
- evidence checklist safety
- adviser, ACAS, union, HR, Citizens Advice, or trusted-person signposting
- dates marked as user-must-check
- money display-only and not counted
- no automatic contact, sending, or submission wording
- graceful fallback for vague workplace messages
- OCR-low-confidence workplace inputs preserving caution
- rendered ResultViewModel safety
- Adviser Export Pack workplace Markdown safety
- Golden Letter Corpus coverage for every v1 candidate type

## 13. Stop/Go Criteria

Workplace Support Pack v1 is safe to build only when:

- this plan has been reviewed
- safety wording suite is updated for workplace risks
- golden fixtures are synthetic and contain no real workplace data
- generated output contains no legal advice wording
- generated output contains no outcome predictions
- generated output contains no compensation calculation
- settlement agreement cases show a strong human-advice warning
- resignation-related cases never advise resignation
- high-risk harassment, discrimination, health, and retaliation situations
  signpost to human advice
- adviser/export wording has been reviewed internally
- UI remains preparation-only
- Check a message remains the only front door
- money is display-only and never counted automatically
- dates always say to check the original message

Do not build if any v1 output implies that AdminAvenger has decided rights,
verified employer conduct, contacted anyone, submitted anything, calculated
compensation, or confirmed a route/deadline.

## 14. Recommendation

Build Workplace Support Pack v1 only after this plan is reviewed.

Start with lower-risk preparation and checklist outputs:

- disciplinary invite preparation
- workplace investigation invite preparation
- return-to-work meeting preparation
- pay issue evidence gathering
- contract change question preparation

Delay higher-risk areas until safety wording and fixtures are proven:

- dismissal letters
- discrimination or harassment conclusions
- settlement agreement handling
- resignation-related messages
- tribunal or ACAS early conciliation wording beyond signposting

Keep ACAS, union rep, HR, Citizens Advice, adviser, solicitor, or trusted-person
signposting visible where stakes are serious. Workplace Support Pack v1 should
make the user calmer and more prepared, not more certain than the evidence
allows.
