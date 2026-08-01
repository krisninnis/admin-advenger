# Front-Door Intent Routing — v1

## 1. Document status

| Field | Value |
|---|---|
| Status | **Approved — narrow Front-Door Intent Routing v1 implementation slice only** |
| Version | v1 |
| Branch | `front-door-intent-routing-v1` |
| Baseline HEAD | `e40285b` |
| Owner | Unassigned |
| Date | 1 August 2026 |
| Type | Product specification. Research, repository analysis and specification only |
| Approval date | 1 August 2026 |
| Approved by | Human project owner |
| Approval record | Section 1.1 |
| Implementation status | **Authorised for the Section 1.2 slice only, and only test-first.** Nothing outside Section 1.2 is authorised |
| Estate Administration | Untouched and out of scope. Estate remains hidden, draft, blocked and unprojected |
| Primary service context | Wales |
| Legal jurisdiction where relevant | England and Wales |
| Health and social-care service context | Wales |
| Companion documents | `docs/product/front-door-intent-routing-research-v1.md` (external research), `docs/product/front-door-intent-routing-evaluation-v1.md` (90-scenario evaluation corpus) |

### 1.1 Approval record

| Field | Value |
|---|---|
| **Approval date** | **1 August 2026** |
| **Approved by** | **Human project owner** |
| Scope approved | The narrow first implementation slice in Section 1.2, and nothing else |
| Scope explicitly excluded | Section 1.3 |
| Decisions settled by this approval | Section 1.4 |
| Stop conditions | Section 1.5, in addition to Section 24.1 |
| Implementation condition | **Test-first only.** See Section 1.6 |
| Companion documents approved on the same terms | `front-door-intent-routing-research-v1.md`, `front-door-intent-routing-evaluation-v1.md` |

This approval was given by the human project owner. It is recorded here by an AI
assistant acting as scribe. **The assistant did not approve this specification and
cannot.**

Approval of the slice is **not** approval of the product direction described in
Sections 11 and 13. Those remain future work requiring their own approval.

### 1.2 Approved scope

The approved pipeline, end to end:

```
Input received
  → urgent and security preflight
  → input shape classified
  → possible situation signals recorded
  → one adaptive confirmation question
  → person confirms who help is for
  → honest orientation result
  → no automatic specialist activation
  → no case creation before confirmation
```

**The approved first production regression:**

```
"My father needs care"
  → ongoing situation recognised
  → possible care and support signals recorded
  → asks who needs help
  → urgent option available
  → user confirms
  → orientation result
  → original input preserved
```

That regression is the acceptance test for the slice. If it passes and nothing in
Section 1.3 has been built, the slice is complete.

### 1.3 Explicitly excluded from this approval

Approval of the slice does **not** imply approval — in whole or in part — of any
of the following. None may be built, referenced as authorised, or partially
enabled under cover of this approval:

- full Carer Support;
- benefits eligibility;
- local-service web search;
- charity and phone directory implementation;
- unrestricted chat;
- local semantic model integration;
- saved multi-page journeys;
- Journey Engine dependency;
- Life Graph;
- Estate Administration activation;
- automatic contacting or submission of anything, to anyone.

Sections 11 (ten-page journey shell) and 13 (governed contact directory) remain
**unapproved future direction**. They are retained so the slice is built in a
shape that can grow, not so that they can be built now.

### 1.4 Decisions settled by this approval

These are now settled and are no longer open questions. They may not be reversed
by an implementer.

| # | Decision |
|---|---|
| 1 | Mentioned people remain separate from help target |
| 2 | The help target remains `unknown` unless the user explicitly identifies who they want help for, or selects an option |
| 3 | "I don't need help, but Mum does" may use `one_other_person` |
| 4 | `self_and_other` and `multiple_other_people` require explicit wording or selection |
| 5 | Document-shaped input preserves exact `e40285b` behaviour |
| 6 | Non-document input must not receive the document fallback result |
| 7 | Security and urgency preflight run before routing |
| 8 | **AdminAvenger does not clinically select between 999, NHS 111 Wales, a hospital discharge team or a council service** |
| 9 | Primary service context is Wales |
| 10 | Legal jurisdiction where relevant is England and Wales |
| 11 | Health and social-care service context is Wales |
| 12 | No specialist journey opens in v1 |
| 13 | No case is created before confirmation |
| 14 | Estate Administration remains hidden and untouched |
| 15 | The 90-scenario corpus and all 159 existing document scenarios are release gates |

Decision 15 makes both corpora **release gates, not guidance**. A failing corpus
blocks release.

### 1.5 Stop conditions attached to this approval

Implementation must stop and return for a further decision if any of these become
true. These are in addition to Section 24.1.

- The 159-record document corpus cannot reach full parity with `e40285b`.
- Any safety, security, person-target, document-parity or Estate boundary would
  need to be weakened to make the slice work.
- Any item in Section 1.3 would need to be built, even partially.
- The confirmation step cannot be expressed as one closed question.
- The urgent page cannot avoid selecting a service on the person's behalf.
- Any of the 90 corpus scenarios cannot be satisfied without changing a decision
  in Section 1.4.

### 1.6 Implementation may begin only test-first

The approved order is fixed:

1. Encode the 90-scenario corpus and the 159-record document parity corpus as
   tests. **Both must run and fail meaningfully before any production file is
   created.**
2. Implement the classifier until the corpus passes.
3. Only then wire anything into the user interface.

Production code written before its test exists is outside this approval.

### 1.7 Note on the authoring brief

The original brief was truncated after the regression example's first line
(`my father needs care`). A subsequent correction brief supplied the typed
models, the pipeline ordering, the adaptive questions, the journey shell, the
contact-directory handoff and the v1 definition. This document reflects the
corrected brief. Section 20 lists what remains open after the 1 August 2026
approval.

### 1.8 Revision note — four corrections applied

| # | Correction | Why it was needed |
|---|---|---|
| 1 | **Mentioned people separated from confirmed help target.** The `self / other / both / unknown` model is replaced by a mentioned-people list plus a five-value help target | The old model conflated *who was mentioned* with *who help is for*. Mentioning Dad is not asking for help for Dad. `both` was also assigned by inference in the corpus while the invariant said it could only come from selection — the table contradicted the contract |
| 2 | **Non-document routing prohibitions separated from document parity.** | **Verified against `e40285b`: three document controls legitimately produce the exact phrases the old invariants banned outright** (Section 17.6). An implementation built against the old invariants would have had to change document behaviour to pass — the opposite of what routing work may do |
| 3 | **Urgent-support wording tightened.** The router no longer maps an urgency band to a service | The old model mapped `immediate_danger → 999`. That is a clinical choice AdminAvenger must not make |
| 4 | **Jurisdiction metadata corrected.** Service context and legal jurisdiction are now stated separately | They are different things and were previously merged into one line |

---

## 2. Outcome

When the v1 slice is complete:

- A person can type a plain-English sentence about their situation into the
  front door and AdminAvenger recognises that it is **not a document**.
- AdminAvenger says what it *thinks* is happening, and asks **one closed
  question** appropriate to that shape of situation.
- The person chooses. Nothing is routed, activated or saved until they do.
- Where a journey does not exist, AdminAvenger says so honestly and offers what
  it can actually do.
- The document journey is unchanged. A pasted letter, an uploaded file and a
  photographed notice behave exactly as they do at `e40285b` — including where
  that behaviour is imperfect.
- **"No obvious saving or action found"** and **"Identify the sender, date,
  reference, and deadline"** never appear in response to a sentence about a
  person's life. They remain permitted in document results where the `e40285b`
  baseline produces them.

---

## 3. The verified problem

Verified against the live pipeline at `e40285b` by running each string through
`analyseAdminItem` → `createAdminCase` → `selectMostImportantCase` →
`deriveOpportunityCard` → `buildResultViewModel` → `deriveGuidedNextStep`.

| Input | Public scope | Result title | Best next move |
|---|---|---|---|
| `my father needs care` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `my dad needs care and I don't know where to start` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `my mum died last week` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `I think I'm being underpaid at work` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `I can't afford my energy bill` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `I need help with a parking ticket` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `my benefits have stopped` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `I've been sacked` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `I want to complain about my broadband` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `help` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `what can you do?` | allowed | No obvious saving or action found | Identify the sender, date, reference, and deadline |
| `my landlord wants to evict me` | **blocked** (`housing_or_crisis`) | Specialist support may be needed | Identify the sender, date, reference, and deadline |

**Eleven of twelve** ordinary help-seeking sentences reach the terminal
"nothing here" result. The twelfth is caught only because the public-scope gate
recognises the word *landlord*, and it still ends with the same next step.

Two failures are worth naming individually:

- `my mum died last week` → **"No obvious saving or action found."**
- `my father needs care` → the product asks the person to **identify the sender**
  of a sentence they wrote about their own father.

### 3.1 Why the architecture produces this

- `src/views/HomeView.tsx` sets `sourceTitle = "Pasted admin text"` before
  anything is analysed. Every submission is framed as a document.
- `src/lib/submissionHandoff.ts` is 34 lines that trim and reject empty text.
  There is no classification step between the button and document analysis.
- `src/lib/mockAnalysis.ts` `analyseAdminItem` runs document-shaped detectors and
  terminates at `createUnknownFinding`, whose summary lists what it checked for:
  *refunds, price rises, renewal charges, deadlines, complaint opportunities,
  useful evidence*. Every one is a property of a document.
- `userQuestion` is plumbed end to end (`HomeView` → `submitAcceptedText` →
  `App.runAnalysis` → `analyseAdminItem` → `analyseDecisionProblem`) but is
  consumed meaningfully by one module,
  `src/lib/decisionEngine/modules/hmrcTaxCode.ts`. The wiring for intent exists;
  the product does not use it.

The front door is a document pipeline with an optional question attached.

---

## 4. Typed input-shape model

Separates **what kind of thing was submitted** from **what the situation
contains**. These are different questions and were previously conflated.

| Shape | Meaning | Example |
|---|---|---|
| `document_or_message` | A letter, bill, email, notice, statement or form | `This is your final bill for £43.17…` |
| `direct_question` | A question about admin, with no document attached | `Can Dad claim Attendance Allowance?` |
| `ongoing_situation` | A description of circumstances or a need | `my father needs care` |
| `ambiguous_request` | Too short or too unclear to shape confidently | `help with mum`, `care` |
| `orientation_request` | A question about the product itself | `what can you do?` |

`document_or_message` is the **default**. The classifier leaves the default only
on positive evidence. A false positive here damages the journey that already
works, so the safe failure is always "treat it as a document".

**Mixed input rule.** Where a submission contains both a document and a sentence
about the situation, the shape is `document_or_message`. The document journey
runs and the situational sentence is preserved as `userQuestion`.

---

## 5. Situation-signal model

Signals are **evidence for asking a better question**. They are never
conclusions, never labels applied to a person, and never automatic routes.

| Signal | Recognises |
|---|---|
| `possible_person_needing_support` | Someone other than, or including, the person typing may need support |
| `possible_supporter` | The person typing may be helping someone |
| `possible_caring_role` | The person typing describes an ongoing caring role |
| `possible_functional_need` | Difficulty with a daily activity is described |
| `possible_hospital_discharge` | A hospital discharge is happening or imminent |
| `possible_bereavement` | Someone has died |
| `possible_money_or_benefits_need` | Money, benefits or affordability is raised |
| `possible_local_service_need` | A local service may be relevant |
| `possible_urgent_need` | Wording suggests something may be needed now |
| `person_target_unclear` | Who the enquiry is about cannot be determined |

### 5.1 Rules

1. Every signal name begins `possible_` except `person_target_unclear`. This is
   deliberate: the vocabulary itself must not permit a conclusion.
2. A signal **may never be displayed to the person as a statement about them**.
   AdminAvenger may say "It sounds like you may be supporting someone" as an
   introduction to a question. It may never say "You are a carer".
3. Signals may order and select the confirmation question. They may not select a
   journey.
4. Multiple signals may fire. Signals are not exclusive.
5. Signals carry the verbatim substring that triggered them, so the evidence is
   always provable against the person's own words.

---

## 6. People and help-target model

The model that prevents the most damaging failure available to this feature:
**attaching help to a person the user never asked for help for.**

The previous version used a single `self / other_person / both / unknown` value.
That conflated two different questions — *who is mentioned* and *who is help
for* — and made `both` reachable by inference. They are now separate.

```
PeopleModel = {
  mentionedUser:        boolean       // is the user themselves mentioned?
  mentionedOtherPeople: Array<{
    personLabel:   string             // the user's own words: "Dad", "my neighbour"
    relationship?: string             // only where the user stated it
  }>                                  // zero, one or many

  helpTarget:      "self"
                 | "one_other_person"
                 | "multiple_other_people"
                 | "self_and_other"
                 | "unknown"

  targetConfirmed: boolean            // true ONLY after explicit human selection
}
```

### 6.1 The governing rule

> Source text may identify people. **The help target remains `unknown` unless the
> user clearly asks for help for a specific person, or explicitly selects an
> option.**

Naming somebody is not asking for help for them. Describing a caring role is not
asking for help for oneself. `my father needs care` mentions the father and
implies difficulty, but does not say whether the user wants help *for their
father* or help *for themselves as the person supporting him*.

### 6.2 Field rules

- **`mentionedUser`** is true only when the user is explicitly part of the
  situation as an **actor, recipient, supporter or affected person**. A
  possessive relationship phrase alone — "my father", "my nan" — names somebody
  else and does not put the user in the situation. In a document, first-person
  plural is the sender, not the user.
- **`mentionedOtherPeople`** is an observation about the text and may be
  recorded freely, because recording who was named asserts nothing about them.
- **`personLabel`** and **`relationship`** are kept **in the user's own words**.
  AdminAvenger does not normalise "Dad" to "father", and does not infer age,
  condition, capacity or household.
- **`helpTarget`** starts `unknown` and stays there unless the rule in 6.1 is
  satisfied.
- **`multiple_other_people`** and **`self_and_other`** are **only ever set by
  explicit selection.** No text, however clear, may set them. Two people being
  named is not two people needing help.
- **`targetConfirmed`** is `false` until the person selects an option. **No
  recommendation, route or case may depend on an unconfirmed help target.**

### 6.3 Worked examples

| Input | `mentionedUser` | `mentionedOtherPeople` | `helpTarget` | Why |
|---|---|---|---|---|
| `my father needs care` | **`false`** | `[{ father }]` | **`unknown`** | Names the father and implies difficulty. A possessive relationship phrase does not put the user in the situation, and it says nothing about who help is for |
| `Can Dad claim Attendance Allowance?` | `false` | `[{ Dad }]` | **`one_other_person`** | A direct question about Dad's claim. A clear request about one named person — and **no evidence at all** that the user is a carer |
| `I care for Dad full-time` | `true` | `[{ Dad }]` | **`unknown`** | States who the user *is*, not who they want help *for*. A full-time carer may want support for themselves, for Dad, or for both |
| `am I entitled to Carer's Allowance` | `true` | `[]` | **`self`** | An unambiguous first-person request |
| `I look after my mum and my dad` | `true` | `[{ mum }, { dad }]` | **`unknown`** | Two people named. Neither asked about. `multiple_other_people` requires selection |
| `I don't need help but my mum does` | `true` | `[{ mum }]` | **`one_other_person`** | The user explicitly rules themselves out and names who does need help |
| `Mum gets PIP and I help with shopping` | `true` | `[{ Mum }]` | **`unknown`** | **Two people, two positions, one sentence, and no request for either** |

### 6.4 The `Mum gets PIP and I help with shopping` rule

This input names a benefit received by one person and support provided by
another, and asks for help for neither. All of the following are defects:

1. inferring the enquiry is about Mum's PIP;
2. inferring the user is a carer and routing them to carer support;
3. inferring `self_and_other` and presenting a combined result.

The correct behaviour is to ask **CQ-BENEFITS** (Section 9.2), whose "Both"
option exists precisely so the user can say so themselves.

> **`multiple_other_people` and `self_and_other` may only be reached by explicit
> selection. They may never be inferred from text.**

### 6.4 External corroboration

Under the Social Services and Well-being (Wales) Act 2014, an unpaid carer has
rights of their own — including the right to be offered a carer's needs
assessment — separate from the rights of the person they care for
(research S3). Carers Wales, whose entire purpose is supporting carers, still
keeps "Carer's assessment" and "Needs assessment" as two separate pages
(research S4). Two people, two positions. The product must reflect that.

---

## 7. Urgency signal model

The previous version mapped a band to a service — `immediate_danger → 999`. That
is a clinical choice, and AdminAvenger must not make it. **The classifier now
emits source-grounded signal categories, and the urgent page presents the
options.**

| Signal | Meaning | Example wording |
|---|---|---|
| `none_detected` | No urgency wording present | `my father needs care` |
| `unclear_urgency` | Cannot tell from the text | `help`, `I cannot cope`, `Mum keeps falling` |
| `possible_urgent_practical_support` | Food, heating, somewhere to stay, an unsafe discharge | `no food in the house and the heating is off` |
| `possible_urgent_health_need` | A health need that may be urgent but not an emergency | `dad has run out of his heart medication` |
| `possible_immediate_danger` | Wording suggesting immediate danger or serious injury | `mum has fallen and can't get up` |

Every value except `none_detected` is a **possibility recorded from wording**. A
signal is not a finding, not a severity, and not a service.

### 7.1 Ordering rule

> **Urgency is assessed before input-shape classification, and resolved before
> any routing question is shown.**

Routine benefits or care discovery must never appear ahead of an unresolved
urgency signal.

### 7.2 The hand-off boundary — AdminAvenger does not choose the service

When an urgency signal is present, the urgent page **presents these options and
the person chooses**:

| Situation | Route shown |
|---|---|
| Immediate danger or serious injury | Call **999** |
| Urgent health advice when it is not an immediate emergency | **NHS 111 Wales** |
| Unsafe hospital discharge | Contact the **ward or discharge team** |
| Urgent social-care safety | Contact the **relevant council service** |

The page must also state plainly:

> AdminAvenger cannot assess how urgent something is, cannot triage, and cannot
> contact any service for you.

**Draft wording throughout Sections 7 and 9. Subject to safeguarding and content
review before any release.** This is not designer-reviewable copy.

Prohibited in every case: selecting between the four routes on the person's
behalf; any clinical assessment; any statement grading how serious the situation
is; "this is an emergency" or "this is not an emergency"; "call 999" phrased as
an instruction rather than an option; any suggestion that AdminAvenger has
contacted or will contact anyone.

A route back to ordinary message checking always remains available, including
from the urgent page.

### 7.3 Over-escalation is a defect

The word *urgent* is not urgency. `URGENT: your account requires attention`,
`I need help urgently with this form`, `an emergency tariff change` and
`mum fell last year but she's fine now` are all `none_detected`. Over-escalation
teaches people to dismiss the urgency question, which is the one question that
must keep working.

---

## 8. Pipeline ordering

### 8.1 The single unambiguous order

```
1. Input received
        ↓
2. Urgent / security preflight
        ↓
3. Input-shape classification
        ↓
4. Document analysis   OR   route suggestion
        ↓
5. User confirmation
        ↓
6. Specialist journey  OR  orientation result
```

### 8.2 What each stage guarantees

| Stage | Guarantee |
|---|---|
| **2. Preflight** | Security assessment (`shouldPrioritiseEmailSafety`) and urgency assessment both run here, before anything else. **A scam cannot bypass security, and urgent practical safety cannot be buried underneath a route-confirmation question** |
| **3. Classification** | Deterministic, local, defaults to `document_or_message` |
| **4a. Document analysis** | `document_or_message` enters the existing pipeline unchanged. **No confirmation step is shown** |
| **4b. Route suggestion** | A suggestion only. `route_suggested` is not a resolved state and never becomes one without stage 5 |
| **5. Confirmation** | Explicit human selection. **No case may be created and no journey activated before this point** |
| **6. Destination** | Only a journey that exists and is publicly available, or the orientation result |

### 8.3 Controls that remain authoritative

- `assessPublicIntakeScope` in `src/lib/publicScopePolicy.ts` remains the
  authority on public availability. **Intent routing must never be a way around
  it.** A situation statement mentioning eviction, safeguarding, benefits or
  crisis still hits the existing boundary and still produces the existing
  specialist-support result.
- `shouldPrioritiseEmailSafety` in `src/lib/suspiciousEmail.ts` remains the
  authority on security precedence.
- `TermsSafetyGate` remains unchanged.
- **No hidden journey is activated by any path in this specification.** Estate
  Administration in particular remains hidden, draft, blocked and unprojected.
- Nothing displayed by any routing or orientation result may be counted as money
  saved or recovered.

---

## 9. Adaptive confirmation questions

A single generic option set for every situation is wrong: it asks a bereaved
person the same question as someone querying a parking ticket. Confirmation
questions adapt to the detected shape and signals.

All sets follow research S1 and S2: **one closed question, descriptive labels, an
explicit "I'm not sure", a back link, a "Continue" button, and no free-text box.**

### 9.1 Care-shaped input

> **Who needs help?**
> - The person I mentioned
> - Me, because I support them
> - Both of us
> - Something urgent is happening
> - I'm not sure

Selecting "The person I mentioned" sets `one_other_person`; "Me, because I
support them" sets `self`; "Both of us" sets `self_and_other`. **These selections
are the only way those values may be set.**

### 9.2 Benefits-shaped input

> **Whose benefits are you asking about?**
> - Mine
> - Someone else's
> - Both
> - I'm not sure

### 9.3 Unclear input

> **What would help most?**
> - Understand a message
> - Work out what to do
> - Find the right service
> - I'm not sure

### 9.4 Urgency confirmation (shown before any routing question)

> **Is something needed right now?**
> - Someone may be in immediate danger or seriously injured
> - Someone needs urgent health advice, but it is not an emergency
> - Someone is coming out of hospital and it does not feel safe
> - Someone needs urgent practical help, such as food, heating or somewhere to stay
> - No, nothing like that
> - I'm not sure

The options describe **situations**, not services. The person's selection reveals
which of the four routes in Section 7.2 is relevant — AdminAvenger does not
decide it for them. "I'm not sure" shows all four with an explanation of when
each is used.

### 9.5 Bereavement-shaped input

> **What would help most right now?**
> - Understand a letter or message I've been sent
> - Work out what needs sorting out
> - Find the right service to talk to
> - I'm not sure

No option in this set uses *claim*, *entitlement*, *benefit* or *saving*. The end
of a caring role is offered as "work out what needs sorting out", never as a
financial prompt.

### 9.6 Rules for every set

1. **A route back to ordinary message checking is always preserved.** Every set
   either contains an "understand a message" option or reaches one within a
   single step.
2. **"I'm not sure" is mandatory** and must always lead somewhere useful — never
   to a dead end and never to a repeat of the same question.
3. **Back** returns to the front door with the person's text intact. The text is
   never re-requested.
4. The question is asked **once** in v1. Confirming does not lead to a second
   question.
5. AdminAvenger states what it *thinks*: "It sounds like…", never "You need…".
6. No option label may assert entitlement, legal position, medical fact or
   capacity.

---

## 10. State model

### 10.1 States

| State | Meaning |
|---|---|
| `idle` | Front door ready, nothing submitted |
| `input_received` | Text captured, nothing assessed |
| `safety_preflight` | Security and urgency assessment running |
| `input_classified` | Shape, signals, mentioned people, help target and urgency signal determined |
| `route_suggested` | A suggestion has been formed. **Not a resolved state** |
| `awaiting_confirmation` | A confirmation question is displayed |
| `urgency_confirmation` | The urgency question is displayed |
| `urgent_support` | Urgent or emergency signposting shown; routing halted |
| `person_target_confirmed` | The person has explicitly stated who the help is for |
| `message_analysis_selected` | The existing document journey has been entered |
| `orientation_selected` | The orientation result is shown |
| `specialist_route_confirmed` | A specialist journey has been explicitly confirmed. **Unreachable in v1** |
| `cancelled` | The person backed out; text preserved, nothing routed |

### 10.2 Events

`submit` · `preflight_complete` · `classify_complete` · `suggest_route` ·
`answer_urgency` · `answer_confirmation` · `select_message_analysis` ·
`select_orientation` · `confirm_target` · `back` · `dismiss`

### 10.3 Allowed transitions

| From | Event | To | Guard |
|---|---|---|---|
| `idle` | `submit` | `input_received` | Text is non-empty after trim |
| `input_received` | `preflight_complete` | `safety_preflight` | — |
| `safety_preflight` | — | `message_analysis_selected` | Security signal takes precedence |
| `safety_preflight` | — | `urgency_confirmation` | Urgency is `prompt`, `urgent` or `danger` |
| `safety_preflight` | `classify_complete` | `input_classified` | No security precedence; urgency resolved or `none`/`unclear` |
| `input_classified` | — | `message_analysis_selected` | Shape is `document_or_message` |
| `input_classified` | `suggest_route` | `route_suggested` | Shape is not `document_or_message` |
| `route_suggested` | — | `awaiting_confirmation` | Always. **`route_suggested` cannot terminate** |
| `awaiting_confirmation` | `answer_confirmation` | `person_target_confirmed` | A person-target option was selected |
| `awaiting_confirmation` | `select_message_analysis` | `message_analysis_selected` | — |
| `awaiting_confirmation` | `select_orientation` | `orientation_selected` | Includes "I'm not sure" |
| `awaiting_confirmation` | `back` | `cancelled` | Text preserved |
| `awaiting_confirmation` | — | `urgency_confirmation` | "Something urgent is happening" selected |
| `urgency_confirmation` | `answer_urgency` | `urgent_support` | Danger or today-need selected |
| `urgency_confirmation` | `answer_urgency` | `input_classified` | "No, nothing like that" selected |
| `urgency_confirmation` | `back` | `cancelled` | Text preserved |
| `urgent_support` | `select_message_analysis` | `message_analysis_selected` | The route back always exists |
| `person_target_confirmed` | `select_orientation` | `orientation_selected` | The only v1 destination |
| `person_target_confirmed` | `confirm_target` | `specialist_route_confirmed` | **Unreachable in v1.** Requires an available journey and explicit confirmation |
| `cancelled` | `submit` | `input_received` | — |

### 10.4 Invalid transitions — must be unrepresentable

| # | Prohibited |
|---|---|
| **X1** | Any state → `specialist_route_confirmed` without passing through explicit confirmation |
| **X2** | Any state → case creation before `person_target_confirmed` or `message_analysis_selected` |
| **X3** | `safety_preflight` → `input_classified` while urgency is `prompt`, `urgent` or `danger` and unresolved |
| **X4** | Any silent change of `helpTarget` after `person_target_confirmed` |
| **X5** | `route_suggested` treated as a resolved or terminal state |
| **X6** | Any state → any Estate Administration route |
| **X7** | `input_classified` reached before `safety_preflight` completes |
| **X8** | `awaiting_confirmation` shown while a security result is pending |
| **X9** | `targetConfirmed = true` set by anything other than an explicit human selection |
| **X9a** | `helpTarget` set to any value other than `unknown`, `self` or `one_other_person` without an explicit human selection |
| **X10** | `multiple_other_people` or `self_and_other` assigned by inference rather than selection |
| **X11** | Any change to a document-analysis result produced by routing work, including an improvement |
| **X12** | AdminAvenger selecting between 999, NHS 111 Wales, a ward or discharge team, or a council service |

---

## 11. Future journey shell — **not in scope for v1**

Documented so v1 is built in a shape that can grow. **Approving v1 does not
approve any of this.** Only page 1, in its narrowest form, is in scope.

| Page | Purpose | v1 |
|---|---|---|
| 1 | Tell us what is happening | **In scope, narrowest form only** |
| 2 | Who needs help? | Out of scope — but the person-target model is designed for it |
| 3 | Is anything urgent? | Out of scope as a page; the urgency question exists as a step |
| 4 | What is becoming difficult? | Out of scope |
| 5 | What support already exists? | Out of scope |
| 6 | What matters most today? | Out of scope |
| 7 | Your first three actions | Out of scope |
| 8 | Trusted contacts | Out of scope — see Section 13 |
| 9 | Prepare the next action | Out of scope |
| 10 | Saved plan and progress | Out of scope |

**The v1 implementation stops after the smallest route-confirmation and
orientation slice.** Any pull request that implements pages 4 to 10 is out of
scope by definition and should be rejected on that ground alone.

---

## 12. Definition of v1

The first production slice proves exactly this, and nothing more:

```
"my father needs care"
  → recognised as an ongoing situation
  → possible care / support signals recorded
  → asks "Who needs help?"
  → the person confirms
  → an urgent option is available
  → orientation result
  → no automatic specialist activation
```

### 12.1 v1 must not build

- full Carer Support;
- benefits eligibility or calculation;
- a local directory;
- a phone contact database;
- any Journey Engine dependency;
- unrestricted chat.

### 12.2 v1 must not change

- the four front-door input modes;
- any document-journey behaviour;
- public-scope availability;
- security precedence;
- Estate Administration in any respect;
- line endings, production code outside the named files, or any existing test
  beyond additions.

---

## 13. Verified-contact-directory handoff — **future, not in scope for v1**

When contacts are eventually shown, they must come from a governed record. No
contact detail may be displayed until this model exists and is populated by
approved process.

### 13.1 Contact record

| Field | Purpose |
|---|---|
| `organisation` | Name as the organisation publishes it |
| `type` | `official` · `charity` · `health` · `advice` · `local_service` |
| `purpose` | What this contact is for, in plain English |
| `intendedAudience` | Who it is for — carer, cared-for person, either |
| `jurisdiction` | Wales, England and Wales, UK |
| `councilArea` | Where the service is council-specific |
| `website` | Verified URL |
| `phone` | Verified number |
| `openingHours` | Only where verified; otherwise absent |
| `source` | Where the detail was obtained |
| `lastChecked` | Date the detail was last verified |
| `freshnessClass` | How quickly this detail goes stale |
| `referralRequirement` | Whether a referral or permission is needed |
| `availabilityWarning` | Known limits — waiting lists, restricted hours, area limits |

### 13.2 "Less is more" presentation

- **No more than three priority contacts** shown initially.
- An **expand** control reveals more.
- **Official and charity contacts are visually distinguished**, so a person can
  tell a statutory body from a charity.
- **No unverified web links. No search results. No generated URLs.**
- **No implied availability.** Absent opening hours are shown as unknown, never
  as "open".
- A contact with a stale `lastChecked` is either not shown, or shown with its
  date visible.

### 13.3 Referral norm

Citizens Advice asks permission before making any referral and only refers when
permission has been given (research S10). AdminAvenger goes further: it **never
makes a referral and never contacts anyone**. It shows a verified contact and the
person decides.

---

## 14. Scope and non-goals

### 14.1 In scope for v1

1. A deterministic, local front-door intent classifier producing shape, signals,
   mentioned people, help target and urgency signal.
2. The urgency and security preflight ordering in Section 8.
3. Adaptive confirmation questions (Section 9) for care, benefits, unclear,
   urgency and bereavement shapes.
4. The orientation result (Section 15).
5. The state model in Section 10, with invalid transitions unrepresentable.
6. Tests against the 90-scenario evaluation corpus and the 159-record document
   corpus.

### 14.2 Non-goals

- No new specialist journeys. v1 routes to what exists or says so honestly.
- No change to the four input modes.
- No change to document-journey behaviour.
- No LLM, no cloud, no network, no telemetry. Deterministic and local, matching
  every existing engine in `src/lib/decisionEngine/` and
  `src/lib/generalAdminExtraction.ts`.
- No silent routing.
- No free-text conversation.
- No Estate Administration change.
- No change to public-scope availability.
- No advice. Recognising that someone mentioned care or bereavement is not
  advising them and must never be presented as such.
- No classification of photo, OCR or file text in v1 (Section 19, A4).

---

## 15. The orientation result

For intents with no journey behind them, AdminAvenger must be honest and useful,
not apologetic and empty. It states:

- what it understood, in the person's own words, **attributed as an
  interpretation and not a finding**;
- what it **can** do today — read and explain a letter, bill, message or notice;
  find dates, amounts, references and deadlines; prepare questions to ask;
- what it **cannot** do — decide entitlement, liability, legality, capacity or
  outcome; contact anyone; give advice;
- what would help — "if you have a letter or message about this, paste or
  photograph it and I can go through it with you";
- where to get proper help, using existing signposting.

It must never be titled "No obvious saving or action found" and must never carry
the next step "Identify the sender, date, reference, and deadline".

---

## 16. Constraints

| Constraint | Requirement |
|---|---|
| Local-first | Classification runs in the browser. No network call, no upload, no telemetry |
| Deterministic | Same input, same output, always. No model, no randomness, no clock dependence |
| Non-regressive | `document_or_message` behaviour identical to `e40285b` |
| Human control | AdminAvenger proposes; the person confirms |
| Honest availability | Never offer a gated or non-existent journey. Respect `PublicAvailability` |
| No advice | Recognising a life area is not advising on it |
| No conclusions | No entitlement, legal, medical or capacity conclusion about anyone |
| Accessibility | One question at a time; keyboard reachable; labels and legends as headings; visible focus; WCAG 2.2 |
| Cognitive load | Short concrete options; no jargon; no unexplained product names |
| Plain English | Appropriate reading age; the person's own words preserved |
| Privacy | The person's sentence and any relationship or person label stay in session memory. Never stored, logged or transmitted by the router |
| Estate | No Estate activation, routing, projection or UI availability change |
| Jurisdiction | Welsh framing must not be generalised to England, Scotland or Northern Ireland |

---

## 17. Acceptance criteria

### 17.1 Regression

- **AC1** None of the twelve Section 3 inputs produces the title "No obvious
  saving or action found".
- **AC2** None produces the next step "Identify the sender, date, reference, and
  deadline".
- **AC3** `my father needs care` classifies `ongoing_situation` with target
  `unknown` and reaches the care confirmation question.
- **AC4** `my mum died last week` classifies `ongoing_situation` with
  `possible_bereavement`, reaches the bereavement confirmation set, and does not
  mention, activate or route to Estate Administration.
- **AC5** `my landlord wants to evict me` still hits the `housing_or_crisis`
  public-scope boundary and still produces the existing specialist-support
  result.

### 17.2 Person target

- **AC6** `Can Dad claim Attendance Allowance?` yields `mentionedUser = false`,
  one mentioned other (`Dad`), `helpTarget = one_other_person`, and opens no
  carer route.
- **AC7** `I care for Dad full-time` yields `mentionedUser = true`, one mentioned
  other (`Dad`) and **`helpTarget = unknown`**, and still shows the care
  confirmation question. Stating a role is not asking for help.
- **AC8** `Mum gets PIP and I help with shopping` yields `mentionedUser = true`,
  one mentioned other (`Mum`), **`helpTarget = unknown`** with
  `person_target_unclear`, and reaches the benefits confirmation question. No
  combined result is presented.
- **AC9** `targetConfirmed` is `false` in every automatic path and becomes `true`
  only on explicit selection.
- **AC9a** **`multiple_other_people` and `self_and_other` never appear in any
  automatic path**, for any of the 90 corpus scenarios.
- **AC9b** `I look after my mum and my dad` records two mentioned others and
  still yields `helpTarget = unknown`.

### 17.3 Urgency

- **AC10** `mum has fallen and can't get up` yields
  `possible_immediate_danger` and reaches the urgent page without a routing
  question first.
- **AC10a** `dad has run out of his heart medication` yields
  `possible_urgent_health_need`, not `possible_immediate_danger`.
- **AC10b** `there is no food in the house and the heating is off` yields
  `possible_urgent_practical_support`.
- **AC11** `Dad is coming home from hospital tomorrow` yields
  `unclear_urgency`.
- **AC12** `URGENT: your account requires attention`, `I need help urgently with
  this form` and `mum fell last year but she's fine now` all yield
  `none_detected`.
- **AC13** No output states how serious a situation is, or that it is or is not
  an emergency.
- **AC13a** **The urgent page presents all four routes and selects none.** No
  output routes the person to 999, NHS 111 Wales, a ward or discharge team, or a
  council service as AdminAvenger's choice.
- **AC13b** Every urgent page states that AdminAvenger cannot assess, triage or
  contact services.

### 17.4 Non-regression

- **AC14** All 159 records in `src/lib/publicMessageEvaluation/corpusV1.ts`
  classify `document_or_message` with unchanged composed results.
- **AC15** The existing suite passes unchanged: 87 files, 2,029 tests.
- **AC16** `Send us the six-digit verification code…` and
  `Verify your account using this link within two hours…` still take the security
  route, with no confirmation step shown first.
- **AC17** `We will never ask you to share your verification code` remains a safe
  negative.
- **AC18** No file under `src/lib/estateAdministrationKnowledge/**` changes.

### 17.5 Behaviour

- **AC19** The confirmation step is never shown for `document_or_message`.
- **AC20** Every confirmation set contains "I'm not sure", and it always reaches
  a useful result.
- **AC21** Back returns to the front door with the text intact and never
  re-requests it.
- **AC22** No case is created and no specialist journey opens in any automatic
  path.
- **AC23** All seventeen corpus invariants in the evaluation document hold,
  respecting the DOC / non-DOC split.

### 17.6 Document parity — the separated contract

Routing prohibitions and document parity are **different obligations** and were
previously merged. They are now separate:

| | Non-document inputs | Document inputs |
|---|---|---|
| "No obvious saving or action found" | **Prohibited** | **Permitted where the `e40285b` baseline produces it** |
| "Identify the sender, date, reference, and deadline" | **Prohibited** | **Permitted where the `e40285b` baseline produces it** |
| Expected result | A confirmation step or orientation result | **Byte-identical to `e40285b`** |

- **AC24** Every document control in the evaluation corpus matches its recorded
  `e40285b` baseline exactly — title, status, opportunity type, best next move
  and next-step kind.
- **AC25** **Routing work must not silently fix, improve or otherwise alter
  document-analysis output.** A document result that looks poor stays as it is
  until changed by separate, specified work.

**Why this matters — verified evidence.** Three document controls legitimately
produce the phrases the earlier version of this specification banned outright:

| Control | Baseline title | Baseline best next move |
|---|---|---|
| `Your PIP appointment is on 14 August 2026` | This needs a careful human review | **Identify the sender, date, reference, and deadline** |
| `URGENT: your account requires attention` | Important reply needed | **Identify the sender, date, reference, and deadline** |
| `this is an emergency tariff change on my energy bill` | **No obvious saving or action found** | **Identify the sender, date, reference, and deadline** |

An implementation built against the old, global prohibition would have had to
change document behaviour in order to pass — the exact outcome AC25 forbids.
Whether those three baselines serve the person well is a real question, and a
separate piece of work. This specification must not answer it.

---

## 18. Failure cases

| Case | Required behaviour |
|---|---|
| Empty or whitespace-only input | Unchanged: `submitAcceptedText` returns false |
| Very short input (`hi`, `care`) | `ambiguous_request`, urgency `unclear` → unclear confirmation set |
| Document **and** a situational sentence | `document_or_message` wins; sentence preserved as `userQuestion` |
| Low classifier confidence | Default to `document_or_message` |
| Person dismisses the confirmation step | `cancelled`; falls through to the existing document journey |
| Photo or file input | Classifier does not run on OCR or extracted file text in v1 |
| Non-English or heavily misspelled input | `ambiguous_request`. Never a confident wrong route |
| Confirmed intent whose journey is gated | Say so honestly; offer the orientation result. Never open a gated journey |
| Urgency signal in a scam message | Security preflight wins; safety result shown first |
| Two people named with no clear target | `unknown` with `person_target_unclear`; ask |

---

## 19. Assumptions requiring confirmation

| # | Assumption | Cheap to correct? |
|---|---|---|
| A1 | `my father needs care` is the canonical regression case, and the fix is recognition plus confirmation — not building a care journey | Yes — Section 14.2 |
| A2 | The five input shapes and ten situation signals are the right first cut | Yes — Sections 4, 5 |
| A3 | Confirmation is a single closed question, not a multi-step wizard | Yes — Section 9 |
| A4 | v1 classifies pasted text only; photo/OCR and file text deferred | Yes — Section 18 |
| A5 | v1 routes only to journeys that already exist | Yes — Section 12 |
| A6 | The confirmation step is a new in-page step in `HomeView`, not a new route | Yes — Section 8 |

---

## 20. Decisions — settled and still open

### 20.1 Settled by the 1 August 2026 approval

| Was | Now settled as |
|---|---|
| **D1** Approve or reject this specification | **Approved** for the Section 1.2 slice only, on 1 August 2026, by the human project owner |
| **D3** Should `I care for Dad full-time` default to `self` or remain `unknown`? | **`unknown`.** Settled by approved decision 2: the help target stays `unknown` unless the user explicitly identifies who they want help for, or selects an option. Stating a caring role is not identifying a help target |
| **D7 (partly)** Should `relationship` and `personLabel` be retained? | **Retained, and kept separate from the help target.** Settled by approved decision 1. The retention *period* remains open — see 20.2 |
| **D9 (partly)** Does the ten-page journey shell reflect the intended direction? | **Not decided, and not needed.** Saved multi-page journeys are explicitly excluded (Section 1.3). The shell stays as unapproved future direction |
| **D10 (partly)** Who owns and governs the contact directory? | **Not needed for v1.** Directory implementation is explicitly excluded (Section 1.3). Ownership must be settled before any contact detail is displayed |

### 20.2 Still open — required before the stated milestone

None of these blocks the Section 1.2 slice. Each blocks something later, and each
is named so it cannot be quietly skipped.

| # | Open decision | Blocks |
|---|---|---|
| **O1** | **Final safeguarding review of the urgent copy.** Sections 7.2 and 9.4 are draft wording. They require review by someone with safeguarding responsibility — **not a designer, and not an AI assistant** | Any release that can show the urgent page |
| **O2** | **Bereavement-service review** of the CQ-BEREAVEMENT wording (Section 9.5), by someone with bereavement-service experience | Any release that can show the bereavement confirmation set |
| **O3** | **Welsh-language release requirement.** Is a Welsh version of every confirmation set required before any Wales-facing release? Wales has statutory Welsh-language duties this specification does not address | Any Wales-facing release |
| **O4** | **User research with unpaid carers.** Is it required before the confirmation copy is treated as settled? All current wording is an informed guess | Treating any confirmation copy as final |
| **O5** | **Future local semantic interpreter.** If deterministic classification proves insufficient, does a local semantic model become acceptable? It is explicitly excluded from v1 (Section 1.3) | Any move beyond deterministic classification |
| **O6** | **Full Carer Support content and knowledge approval.** What content, from what sources, under what governance? Nothing is approved today | Any Carer Support journey |
| **O7** | Is `unclear_urgency` right for minimal input such as `help`, or should it be `none_detected`? | Tuning; affects how often the urgency question appears |
| **O8** | Should the urgency question appear for `unclear_urgency`, or only for the three `possible_*` signals? | Tuning; trades friction against safety |
| **O9** | How long may `relationship` and `personLabel` be retained? Session-only is proposed and is the safe default until decided | Any persistence of person labels |
| **O10** | Should a **separate** specification address document-analysis quality, given L03, G02 and G06 (Section 17.6)? **This specification must not** | Improving those three results |

O1 and O2 are the two that would cause real harm if skipped. They are not
stylistic reviews.

---

## 21. Testing requirements

### 21.1 New focused tests

`src/lib/__tests__/frontDoorIntentRouting.test.ts`

- All 90 evaluation-corpus scenarios: shape, signals, target, relationship,
  urgency and selected confirmation set.
- Determinism: repeated calls return identical output.
- Confirmation contract: options present, "I'm not sure" present, back preserves
  text.
- Orientation result: prohibited titles absent, a "cannot" statement present, no
  money counted.
- State model: every invalid transition in Section 10.4 is unrepresentable.

### 21.2 Corpus non-regression

`src/lib/__tests__/frontDoorIntentCorpusNonRegression.test.ts`

- All 159 `corpusV1` records classify `document_or_message`.
- Composed result parity against the current pipeline for every record.

### 21.3 Adjacent regression suites

`publicMessageAdversarialEvaluation` · `structuredGeneralAdminFallback` ·
`c1ProductDefectCorrections` · `accountOutcomeConfirmation` ·
`publicScopePolicy` · `publicScopeAnalysis` · `emailSafetyRiskBands` ·
`adminAvengerSafety` · `safetyWordingRegression` · `resultViewModel` ·
`guidedNextSteps` · `caseProgress` · `HomeViewQuestionField` ·
`submissionHandoff` · `goldenLetterCorpus`

### 21.4 Manual and accessibility checks

- Keyboard-only pass: front door → confirmation → result → back.
- Screen-reader pass: the question is announced once as the heading.
- Visible focus on every option and on Continue.
- **Read the bereavement, care and urgency paths aloud.** If any line would be
  painful to hear after a death or during a crisis, it is wrong regardless of
  what the tests say.

---

## 22. Implementation tasks

1. Add `src/lib/frontDoorIntent.ts` — pure, deterministic, returning shape,
   signals, the `PeopleModel` (mentioned people plus help target), the urgency
   signal and verbatim evidence.
2. Encode the 90-scenario corpus and add focused tests **before** any UI work.
3. Add the corpus non-regression test and confirm 159/159 classify
   `document_or_message` **before** any UI change.
4. Add the confirmation step component with adaptive sets (Section 9).
5. Wire the preflight and classifier into `HomeView` ahead of
   `submitAcceptedText`, preserving the existing path exactly.
6. Add the orientation result, reusing `src/lib/safetyWording.ts` rather than
   inventing copy.
7. Run focused, adjacent and full validation.
8. Record completion evidence in Section 25.

Tasks 1–3 must be complete and green before task 5. The corpus non-regression
test is the gate that protects the working document journey.

---

## 23. Validation commands

```powershell
npm test -- src/lib/__tests__/frontDoorIntentRouting.test.ts
npm test -- src/lib/__tests__/frontDoorIntentCorpusNonRegression.test.ts
npm test
npm run lint
npm run build
git diff --check
```

---

## 24. Risks and stop conditions

| Risk | Severity | Mitigation |
|---|---|---|
| A real document classified as a situation | **High** | Default to document; corpus non-regression gate before UI wiring (AC14) |
| Help attached to a person the user never asked about | **High** | Help-target model; `multiple_other_people` and `self_and_other` never inferred (AC8, AC9a, X10) |
| Urgency buried under a routing question | **High** | Preflight ordering (Section 8); AC10; X3 |
| AdminAvenger choosing a service clinically | **High** | Signal categories, not bands; urgent page presents four routes (AC13a, X12) |
| Routing work silently altering document output | **High** | INV-6, INV-7 and recorded baselines in the evaluation corpus (X11) |
| Intent routing bypassing the public-scope gate | **High** | Section 8.3; AC5 |
| Scam displacing security | **High** | Preflight ordering; AC16; X8 |
| Orientation result reading as advice | **High** | Reuse `safetyWording.ts`; read-aloud check |
| Bereavement path feeling transactional | **High** | Bereavement set excludes financial language; AC4; read-aloud check |
| Over-escalating weak urgency | Medium | AC12; Family G of the corpus |
| Scope creep into the ten-page journey | Medium | Section 11 explicitly out of scope; task ordering |
| Working-tree line endings obscuring the diff | Low | Known CRLF artefact; content identical to `e40285b` |

### 24.1 Stop conditions

Stop and re-specify if any becomes true:

- the corpus non-regression test cannot reach 159/159 `document_or_message`;
- routing requires changing `assessPublicIntakeScope` or
  `shouldPrioritiseEmailSafety` behaviour;
- a journey would need to be built to make an intent useful;
- Estate Administration would need to change;
- confirmation cannot be expressed as one closed question;
- any invalid transition in Section 10.4 turns out to be representable.

---

## 25. Completion evidence

To be recorded during implementation: focused and full validation results; the
twelve-input regression table re-run; the 90-scenario corpus results;
screenshots of each confirmation set; keyboard and screen-reader notes; and any
behaviour intentionally left unchanged.

---

## 26. Decisions made during implementation

Add dated notes here as choices are made.
