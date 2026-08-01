# Front-Door Intent Routing — Evaluation Corpus — v1

## 1. Document status

| Field | Value |
|---|---|
| Status | **Approved — narrow Front-Door Intent Routing v1 implementation slice only** |
| Type | Evaluation corpus and expected-behaviour contract. Not an implementation and not a test file |
| Approval date | 1 August 2026 |
| Approved by | Human project owner |
| Release-gate status | **This corpus and the 159-record document corpus are release gates.** A failing corpus blocks release |
| Companion documents | `docs/specs/active/front-door-intent-routing-v1.md`, `docs/product/front-door-intent-routing-research-v1.md` |
| Scenario count | **90** |
| Provenance | **Every scenario is fully synthetic.** No real person, real message, real correspondence or private material was used |
| Primary service context | Wales |
| Legal jurisdiction where relevant | England and Wales |
| Health and social-care service context | Wales |
| Baseline for document controls | `e40285b` |

### 1.1 Approval record

Approved on **1 August 2026** by the **human project owner**, on the same terms as
`docs/specs/active/front-door-intent-routing-v1.md` Section 1.1 — for the narrow
first implementation slice only.

**Approved decision 15 makes this corpus a release gate, not guidance.** All 90
scenarios here, and all 159 records in
`src/lib/publicMessageEvaluation/corpusV1.ts`, must pass before release.

Approval does not settle the wording of any confirmation set. CQ-URGENT and
CQ-BEREAVEMENT remain draft pending the reviews in Section 10.

### 1.2 Purpose

This corpus fixes the expected behaviour of front-door intent routing **before**
any code is written, so the first implementation slice can be judged against a
contract rather than against itself. It is the intent-routing analogue of
`src/lib/publicMessageEvaluation/corpusV1.ts`.

### 1.3 Prime directive

> No help may be assigned to a person the user has not asked for help for, and no
> urgency may be buried underneath a routing question.

### 1.4 Revision note — what changed in this revision

| Change | Reason |
|---|---|
| The `self / other / both / unknown` target model was replaced | It conflated *who was mentioned* with *who help is for*. Mentioning Dad is not asking for help for Dad |
| `both` removed entirely from the scenario table | Invariant 9 previously said `both` could only be reached by explicit selection, while the table assigned it by inference. The table contradicted the invariant |
| Document parity separated from routing prohibitions | **Verified against `e40285b`: three document controls legitimately produce the strings the old invariants banned outright** (Section 7.2). The old invariants were factually wrong |
| Urgency bands replaced with source-grounded signal categories | The router previously mapped `immediate_danger → 999`. That is a clinical choice AdminAvenger must not make |
| Jurisdiction metadata corrected | Service context and legal jurisdiction are different things and were previously merged into one line |

---

## 2. Field legend

| Field | Meaning |
|---|---|
| **ID** | Stable scenario identifier |
| **Source text** | The exact synthetic input |
| **Shape** | Input shape (2.1) |
| **Signals** | Situation signals (2.2) |
| **User** | Is the user themselves mentioned in the text? `Y` / `N` |
| **Others** | Other people mentioned, in the user's own words. `—` if none |
| **Help target** | Who help is for (2.3) |
| **Urg** | Urgency signal category (2.4) |
| **CQ** | Confirmation question set (Section 3) |
| **PR** | Prohibited-route set (Section 4) |
| **PW** | Prohibited-wording set (Section 5) |
| **Msg** | May normal message analysis still be reached? |
| **Spec** | May a specialist route open in v1? |
| **Transition** | Expected terminal state for the automatic part of the flow |
| **Case** | May a case be created before confirmation? |

### 2.1 Input shapes

`DOC` document_or_message · `DQ` direct_question · `OS` ongoing_situation ·
`AR` ambiguous_request · `OR` orientation_request

### 2.2 Situation signals

`PNS` possible_person_needing_support · `SUP` possible_supporter ·
`CAR` possible_caring_role · `FUN` possible_functional_need ·
`HD` possible_hospital_discharge · `BER` possible_bereavement ·
`MON` possible_money_or_benefits_need · `LOC` possible_local_service_need ·
`URG` possible_urgent_need · `TGT?` person_target_unclear

Signals are **evidence for asking a better question**. They are never
conclusions, never labels applied to a person, and never automatic routes.

### 2.3 Help target

| Value | Meaning |
|---|---|
| `self` | The user clearly asks for help for themselves |
| `one_other` | The user clearly asks for help for one specific other person |
| `multi_other` | The user clearly asks for help for more than one other person |
| `self_and_other` | The user clearly asks for help for themselves **and** someone else |
| `unknown` | Not clearly stated |

**The governing rule.**

> Source text may identify people. The help target remains `unknown` unless the
> user **clearly asks for help for a specific person**, or **explicitly selects an
> option**.

Naming somebody is not asking for help for them. Describing a caring role is not
asking for help for oneself. `my father needs care` mentions the father and
implies difficulty, but does not say whether the user wants help *for their
father* or help *for themselves as the person supporting him*. It is `unknown`,
and that is the whole point of the feature.

`multi_other` and `self_and_other` **never appear in the table below**. They are
reachable only as confirmation outcomes, never by inference. Their absence from
every pre-confirmation row is the contract.

### 2.4 Urgency signal categories

| Value | Meaning |
|---|---|
| `none` | No urgency wording present |
| `unclear` | Cannot tell from the text |
| `practical` | possible urgent practical support |
| `health` | possible urgent health need |
| `danger` | possible immediate danger |

**These are source-grounded signals, not a triage decision.** AdminAvenger records
what the wording suggests. It does **not** choose between 999, NHS 111 Wales, a
ward discharge team or a council service — the urgent page presents those options
and the person decides (Section 3, CQ-URGENT).

### 2.5 Values constant across the corpus

- **Spec** is `No` for all 90. v1 opens no specialist journey.
- **Case** is `No` for all 90. A case may only follow explicit confirmation.
- **Msg** is `Yes` for all 90. A route back to ordinary message checking always
  exists, including from urgent paths.

---

## 3. Confirmation question sets

### CQ-CARE

> **Who needs help?**
> - The person I mentioned
> - Me, because I support them
> - Both of us
> - Something urgent is happening
> - I'm not sure

Selecting "The person I mentioned" sets `one_other`. "Me, because I support them"
sets `self`. "Both of us" sets `self_and_other`. **These are the only ways those
values may be set.**

### CQ-BENEFITS

> **Whose benefits are you asking about?**
> - Mine
> - Someone else's
> - Both
> - I'm not sure

### CQ-UNCLEAR

> **What would help most?**
> - Understand a message
> - Work out what to do
> - Find the right service
> - I'm not sure

### CQ-URGENT — shown before any routing question

> **Is something needed right now?**
> - Someone may be in immediate danger or seriously injured
> - Someone needs urgent health advice, but it is not an emergency
> - Someone is coming out of hospital and it does not feel safe
> - Someone needs urgent practical help, such as food, heating or somewhere to stay
> - No, nothing like that
> - I'm not sure

**Draft wording. Subject to safeguarding and content review before any release.**

The urgent page then presents, as information the person chooses from:

| If | Route shown |
|---|---|
| Immediate danger or serious injury | Call **999** |
| Urgent health advice when not an immediate emergency | **NHS 111 Wales** |
| Unsafe hospital discharge | Contact the **ward or discharge team** |
| Urgent social-care safety | Contact the **relevant council service** |

The page must also state plainly that **AdminAvenger cannot assess how urgent
something is, cannot triage, and cannot contact any service.** The person calls;
AdminAvenger does not.

### CQ-BEREAVEMENT

> **What would help most right now?**
> - Understand a letter or message I've been sent
> - Work out what needs sorting out
> - Find the right service to talk to
> - I'm not sure

No option uses *claim*, *entitlement*, *benefit* or *saving*.

### CQ-NONE

Used for `DOC`. The existing document journey runs unchanged; no confirmation
step is shown.

---

## 4. Prohibited-route sets

| Set | Prohibits |
|---|---|
| **PR-CORE** | Any specialist journey opening without explicit confirmation; any case created before confirmation; any Estate Administration activation, routing, projection or mention; any silent change of help target; any bypass of the public-scope boundary or the security preflight |
| **PR-CARE** | PR-CORE, plus: assigning carer support to a person the user has not asked for help for; assigning the cared-for person's support to the user; opening a benefits route from a care statement without asking |
| **PR-BEN** | PR-CORE, plus: opening any eligibility, calculation or entitlement route; assuming the claimant is the person typing |
| **PR-BER** | PR-CORE, plus: any Estate Administration route; any probate route; any financial or benefits prompt as the first response |
| **PR-URG** | PR-CORE, plus: presenting a routing question before urgency is addressed; **choosing between 999, NHS 111 Wales, a ward team or a council service on the person's behalf**; any clinical assessment; any statement about how serious the situation is; any suggestion AdminAvenger has contacted or will contact a service |
| **PR-DOC** | PR-CORE, plus: showing the confirmation step; **altering the document result in any way, including improving it** |
| **PR-SEC** | PR-CORE, plus: intent routing taking precedence over the security preflight; any confirmation step that delays a safety result |

---

## 5. Prohibited-wording sets

| Set | Must never appear |
|---|---|
| **PW-ROUTE** | In any **non-DOC** result: "No obvious saving or action found"; "Identify the sender, date, reference, and deadline". Also, in any result: any claim that AdminAvenger has verified, decided, contacted anyone or acted |
| **PW-CARE** | PW-ROUTE, plus: "you are a carer"; "you are their carer"; "you are entitled to"; "they need care"; "they lack capacity"; any statement about a named person's health, capacity or needs |
| **PW-BEN** | PW-ROUTE, plus: "you can claim"; "you are eligible"; "you will get"; "they qualify"; any amount presented as receivable |
| **PW-BER** | PW-ROUTE, plus: "saving"; "recovered"; "claim"; "entitlement"; "opportunity"; anything congratulatory or transactional |
| **PW-URG** | PW-ROUTE, plus: "this is an emergency"; "this is not an emergency"; "you should call an ambulance"; "call 999" as an instruction rather than an option; any wording that grades the danger; any wording implying AdminAvenger has assessed the situation |
| **PW-SEC** | PW-ROUTE, plus: "this is a scam"; "this is safe"; any instruction that repeats a credential request as an action |
| **PW-DOC** | Only the second clause of PW-ROUTE applies. **The two banned phrases are permitted in DOC results** where the `e40285b` baseline produces them (Section 7.2) |

---

## 6. Scenario families

### Family A — the canonical regression and close relatives

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A01 | `my father needs care` | OS | PNS, FUN, TGT? | Y | father | **unknown** | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A02 | `my sister needs help` | OS | PNS, TGT? | Y | sister | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A03 | `my mother needs looking after` | OS | PNS, FUN, TGT? | Y | mother | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A04 | `my brother needs help with a form` | OS | PNS, SUP, TGT? | Y | brother | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A05 | `my partner is struggling to manage at home` | OS | PNS, FUN, TGT? | Y | partner | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A06 | `my grandmother is not coping on her own` | OS | PNS, FUN, TGT? | Y | grandmother | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A07 | `my aunt has dementia and lives alone` | OS | PNS, FUN, TGT? | Y | aunt | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A08 | `my uncle can't manage his bills any more` | OS | PNS, FUN, MON, TGT? | Y | uncle | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A09 | `my son has additional needs and I'm exhausted` | OS | PNS, CAR, SUP, FUN, TGT? | Y | son | unknown | unclear | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| A10 | `my daughter needs support at home` | OS | PNS, TGT? | Y | daughter | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |

**A01.** The permanent regression case. `my father needs care` mentions the father
and implies difficulty. It does not say whether help is wanted *for him* or *for
the person typing*. `unknown` is the honest value and the reason the question
exists.

**A09.** Previously `both`. The user mentions themselves ("I'm exhausted") and
their son, but asks for help for neither. `unknown`, with both people recorded.

---

### Family B — caring-role wording

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B01 | `I look after my neighbour` | OS | CAR, SUP, PNS, TGT? | Y | neighbour | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B02 | `I care for Dad full-time` | OS | CAR, SUP, PNS, TGT? | Y | Dad | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B03 | `I'm my wife's carer` | OS | CAR, SUP, PNS, TGT? | Y | wife | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B04 | `I've been looking after my nan for three years` | OS | CAR, SUP, PNS, TGT? | Y | nan | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B05 | `I do everything for my husband now` | OS | CAR, SUP, PNS, FUN, TGT? | Y | husband | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B06 | `I wouldn't call myself a carer but I help my friend every day` | OS | CAR, SUP, PNS, TGT? | Y | friend | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| B07 | `I cannot cope with caring for my wife` | OS | CAR, SUP, PNS, URG, TGT? | Y | wife | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| B08 | `I look after my mum and my dad` | OS | CAR, SUP, PNS, TGT? | Y | mum, dad | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |

**B02.** Previously `self`. Stating a caring role says who the user *is*, not who
they want help *for*. A full-time carer may want support for themselves, for the
person they care for, or for both. `unknown` until they say.

**B08.** Two other people recorded. Help target still `unknown` — `multi_other`
is reachable only by selection.

---

### Family C — functional-needs wording

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | `my husband cannot wash himself` | OS | PNS, FUN, TGT? | Y | husband | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| C02 | `Mum keeps falling` | OS | PNS, FUN, URG, TGT? | N | Mum | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| C03 | `Dad can't manage the stairs any more` | OS | PNS, FUN, TGT? | N | Dad | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| C04 | `mum is getting confused about her medication` | OS | PNS, FUN, TGT? | N | mum | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| C05 | `my wife can't cook for herself now` | OS | PNS, FUN, TGT? | Y | wife | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| C06 | `my father is incontinent and I don't know what to do` | OS | PNS, FUN, SUP, TGT? | Y | father | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| C07 | `my mother forgets whether she has eaten` | OS | PNS, FUN, TGT? | N | mother | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |

**C02.** *Keeps falling* is repeated-event wording, not a report of someone
currently on the floor. `unclear`, so the urgency question is asked. AdminAvenger
must not decide that falls are or are not serious. Contrast F01.

---

### Family D — direct benefits questions

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D01 | `Can Dad claim Attendance Allowance?` | DQ | MON, PNS | N | Dad | **one_other** | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| D02 | `My dad gets Attendance Allowance` | OS | MON, PNS, TGT? | N | dad | unknown | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| D03 | `Mum gets PIP and I help with shopping` | OS | MON, PNS, CAR, SUP, **TGT?** | Y | Mum | **unknown** | none | CQ-BENEFITS | PR-BEN, PR-CARE | PW-BEN, PW-CARE | Yes | No | awaiting_confirmation | No |
| D04 | `am I entitled to Carer's Allowance` | DQ | MON, CAR, SUP | Y | — | **self** | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| D05 | `can I get anything for looking after my mum` | DQ | MON, CAR, SUP, PNS | Y | mum | **self** | none | CQ-BENEFITS | PR-BEN, PR-CARE | PW-BEN, PW-CARE | Yes | No | awaiting_confirmation | No |
| D06 | `does my nan qualify for pension credit` | DQ | MON, PNS | N | nan | **one_other** | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| D07 | `should we be paying full council tax if mum has dementia` | DQ | MON, PNS, FUN, TGT? | Y | mum | unknown | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| D08 | `what benefits can we claim` | DQ | MON, TGT? | Y | — | unknown | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |

**D01.** The user is not mentioned at all (`User = N`) and asks a direct question
about Dad's claim. This is a clear request for help for one specific person, so
`one_other` is correct. It remains **no evidence whatsoever** that the user is a
carer, and no carer route may open from it (PR-BEN).

**D03 — the flagged case.** Mum receives PIP; the user provides support. Two
people, two positions, one sentence, and **no request for help for either**.
`unknown` with `TGT?`. All of these are defects:

1. inferring the enquiry is about Mum's PIP;
2. inferring the user is a carer and routing them to carer support;
3. inferring `self_and_other` and presenting a combined result.

The correct behaviour is CQ-BENEFITS, whose "Both" option lets the user say so.
This scenario is the strongest single test of the help-target model.

**D04, D05.** "am I entitled", "can I get" are unambiguous first-person requests.
`self`. D05 mentions mum, but the request is plainly about what the user can get.

**D07.** "we" is unresolved — a couple, a household, or a family acting for mum.
`unknown`.

---

### Family E — bereavement and end of caring role

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E01 | `my mum died last week` | OS | BER, PNS | Y | mum | unknown | none | CQ-BEREAVEMENT | PR-BER | PW-BER | Yes | No | awaiting_confirmation | No |
| E02 | `Dad died yesterday and I was his carer` | OS | BER, CAR, SUP | Y | Dad | unknown | none | CQ-BEREAVEMENT | PR-BER, PR-CARE | PW-BER, PW-CARE | Yes | No | awaiting_confirmation | No |
| E03 | `my husband passed away and I don't know what to sort out` | OS | BER, TGT? | Y | husband | unknown | none | CQ-BEREAVEMENT | PR-BER | PW-BER | Yes | No | awaiting_confirmation | No |
| E04 | `I cared for my wife for eleven years and she's gone` | OS | BER, CAR, SUP | Y | wife | unknown | none | CQ-BEREAVEMENT | PR-BER, PR-CARE | PW-BER, PW-CARE | Yes | No | awaiting_confirmation | No |
| E05 | `my Carer's Allowance stopped when mum died` | OS | BER, MON, CAR | Y | mum | **self** | none | CQ-BEREAVEMENT | PR-BER, PR-BEN | PW-BER, PW-BEN | Yes | No | awaiting_confirmation | No |
| E06 | `my grandad died and there are letters coming for him` | OS | BER, PNS | Y | grandad | unknown | none | CQ-BEREAVEMENT | PR-BER | PW-BER | Yes | No | awaiting_confirmation | No |

**E01.** The second permanent regression case. Must reach a bereavement-shaped
confirmation containing no financial language, and **must not mention, activate
or route to Estate Administration** (PR-BER).

**E05.** The user raised their own allowance, so `self` is correct. Money may be
discussed, but the response stays bereavement-shaped and no amount may be
presented as receivable.

**E06.** Post-death correspondence is what AdminAvenger is genuinely good at. The
first option — "Understand a letter or message I've been sent" — is an honest and
useful route.

---

### Family F — urgency signals present

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F01 | `mum has fallen and can't get up` | OS | URG, PNS, FUN | N | mum | one_other | **danger** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F02 | `dad has run out of his heart medication` | OS | URG, PNS | N | dad | one_other | **health** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F03 | `we have nowhere to stay tonight` | OS | URG, LOC | Y | — | unknown | **practical** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F04 | `there is no food in the house and the heating is off` | OS | URG, MON, LOC | N | — | unknown | **practical** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F05 | `they are sending mum home tonight and there is no bed downstairs` | OS | URG, HD, PNS, FUN | N | mum | one_other | **practical** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F06 | `I think my brother is going to hurt himself` | OS | URG, PNS | Y | brother | one_other | **danger** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |
| F07 | `my neighbour is being threatened by someone for money` | OS | URG, PNS | Y | neighbour | one_other | **danger** | CQ-URGENT | PR-URG | PW-URG | Yes | No | urgent_support | No |

**Family F contract.** Urgency is assessed before shape routing; no routing
question is shown until it is resolved.

**The signal is not the service.** `danger` does not mean "call 999". It means the
wording suggests possible immediate danger. The urgent page shows all four routes
and the person chooses. Choosing on their behalf would be triage, which
AdminAvenger must not do (PR-URG).

**F02** carries `health`, not `danger`: running out of medication is a possible
urgent health need, and NHS 111 Wales exists for exactly that. But AdminAvenger
does not say so as an instruction — it presents the option.

**F05** is an unsafe discharge. Both `HD` and `URG` fire; urgency wins the
ordering contest. This is the scenario proving urgency must sit above shape
classification.

**F06, F07** also reach the existing public-scope safeguarding boundary. Intent
routing must not bypass it (PR-CORE).

---

### Family G — weak wording that must not be over-escalated

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G01 | `I need help urgently with this form` | DQ | — | Y | — | self | **none** | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| G02 | `URGENT: your account requires attention` | DOC | — | N | — | unknown | **none** | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| G03 | `can someone get back to me as soon as possible` | DQ | — | Y | — | self | **none** | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| G04 | `mum fell last year but she's fine now` | OS | PNS, FUN | N | mum | unknown | **none** | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| G05 | `dad is a bit unsteady on his feet` | OS | PNS, FUN, TGT? | N | dad | unknown | **none** | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| G06 | `this is an emergency tariff change on my energy bill` | DOC | MON | Y | — | unknown | **none** | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |

**Family G contract.** The word *urgent* is not urgency. Over-escalation is a
defect of equal severity to under-escalation: it teaches people to dismiss the
urgency question, which is the one question that must keep working.

**G02 and G06 use PW-DOC, not PW-ROUTE.** Both legitimately produce a banned
phrase at `e40285b` — see Section 7.2. That is document behaviour and must not be
changed by this work.

---

### Family H — hospital discharge

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| H01 | `Dad is coming home from hospital tomorrow` | OS | HD, PNS, TGT? | N | Dad | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| H02 | `mum is in hospital and they're talking about discharge` | OS | HD, PNS, TGT? | N | mum | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| H03 | `they want to discharge my wife but the house isn't ready` | OS | HD, PNS, FUN, TGT? | Y | wife | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| H04 | `my father was discharged last month and is struggling` | OS | HD, PNS, FUN, TGT? | Y | father | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |

**Family H contract.** Discharge is time-bounded but not an emergency. The
urgency question is asked because AdminAvenger cannot tell whether arrangements
are in place — but "No, nothing like that" leads straight on without friction.
The urgent page's ward-or-discharge-team option exists precisely for H03.

**H04** is past discharge with ongoing difficulty. No longer time-bounded.

---

### Family I — ambiguous, minimal and orientation input

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| I01 | `help with mum` | AR | PNS, TGT? | N | mum | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I02 | `care` | AR | TGT? | N | — | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I03 | `I don't know what to do` | AR | TGT? | Y | — | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I04 | `help` | AR | TGT? | N | — | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I05 | `benefits` | AR | MON, TGT? | N | — | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I06 | `mum` | AR | TGT? | N | mum | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I07 | `hi` | AR | — | N | — | unknown | unclear | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | awaiting_confirmation | No |
| I08 | `what can you do?` | OR | — | N | — | unknown | none | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | orientation_selected | No |
| I09 | `is this app any good for care stuff` | OR | — | N | — | unknown | none | CQ-UNCLEAR | PR-CORE | PW-ROUTE | Yes | No | orientation_selected | No |

**Family I contract.** Minimal input is `unclear` urgency, not `none`. Someone who
types only `help` may be in serious trouble or may be browsing. `unclear` is
honest; recording `none` would assert something we cannot support. It does not on
its own trigger the urgency question.

**I08, I09.** Orientation requests go straight to the orientation result. Asking
"what would help most?" of someone who just asked what the product does would be
circular.

---

### Family J — spelling, OCR formatting and multiple people

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J01 | `my farther needs cair` | OS | PNS, FUN, TGT? | Y | father | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| J02 | `mum keeps falling over i cant cope` | OS | PNS, FUN, URG, CAR, SUP, TGT? | Y | mum | unknown | unclear | CQ-URGENT → CQ-CARE | PR-URG, PR-CARE | PW-URG, PW-CARE | Yes | No | urgency_confirmation | No |
| J03 | `atendance allowence for my dad` | DQ | MON, PNS | Y | dad | one_other | none | CQ-BENEFITS | PR-BEN | PW-BEN | Yes | No | awaiting_confirmation | No |
| J04 | `MUM AND DAD BOTH NEED HELP` | OS | PNS, TGT? | N | mum, dad | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| J05 | `I care for my wife and my mother` | OS | CAR, SUP, PNS, TGT? | Y | wife, mother | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| J06 | `CARE NEEDS ASSESSMENT\n\nREF: CNA-4471\nDATE: 12 AUGUST 2026\n\nAn assessment has been arranged.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| J07 | `my mum needs help — sent from my iPhone` | OS | PNS, TGT? | Y | mum | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |

**J04.** The word BOTH appears in the source. It still does not set the help
target: "both need help" describes two people's circumstances, not a request.
`unknown`, two others recorded.

**J05.** Previously `both`. Two cared-for people and a stated caring role, but no
request. `unknown` with both people recorded.

**J06 — critical negative control.** An OCR-shaped block containing CARE, a
reference and a date is a **document**. Existing journey, no confirmation step.
The scenario most likely to break if the classifier over-fires on care
vocabulary.

---

### Family K — contradictory and mixed input

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| K01 | `I don't need help but my mum does` | OS | PNS, TGT? | Y | mum | **one_other** | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| K02 | `I'm fine, it's for a friend` | OS | PNS, TGT? | Y | friend | **one_other** | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| K03 | `it's not for me, well partly for me` | OS | TGT?, SUP | Y | — | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| K04 | `dad is fine now but last week he fell and I panicked` | OS | PNS, FUN, SUP | Y | dad | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| K05 | `my mother is independent but cannot manage forms or money` | OS | PNS, FUN, MON, TGT? | Y | mother | unknown | none | CQ-CARE | PR-CARE | PW-CARE | Yes | No | awaiting_confirmation | No |
| K06 | `Your father's account has been closed. I look after him and I don't understand this.` | DOC | PNS, CAR, SUP | Y | father | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |

**K01, K02.** These *are* clear requests for help for a specific other person —
the user explicitly rules themselves out. `one_other` is correct and is the only
place in the corpus where a care-shaped input reaches a non-`unknown` target
before confirmation.

**K03.** Self-contradictory. `unknown`; the "Both of us" option lets the user
resolve it.

**K04.** Previously `both`. Explicit resolution ("fine now") plus a past emotional
reaction. No request. `unknown`.

**K06 — the mixed-input rule.** A document plus a situational sentence is a
**document**. The document journey runs and the sentence is preserved as
`userQuestion`. Document wins, always.

---

### Family L — document controls

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L01 | `Your father's account has been closed` | DOC | — | N | father | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L02 | `Please send your mother's death certificate` | DOC | — | N | mother | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L03 | `Your PIP appointment is on 14 August 2026` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L04 | `This is your final bill for £43.17, due on 28 August 2026. Reference FINAL-4317.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L05 | `From 1 September 2026 your monthly service price will rise from £28 to £31.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L06 | `One final Direct Debit of £29.50 will be collected on 3 September 2026.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L07 | `We have received your carer's assessment request. A social worker will contact you within 10 working days.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |
| L08 | `Thank you for notifying us of the death. The account review has started. Reference BRV-001.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC | PW-DOC | Yes | No | message_analysis_selected | No |

**Family L contract.** All are documents. No confirmation step, and behaviour
**byte-identical to `e40285b`** — see the recorded baselines in Section 7.2. L02,
L07 and L08 carry the strongest possible care and bereavement vocabulary while
remaining ordinary correspondence, making them the sharpest test of
default-to-document.

**Corpus-wide extension.** All 159 records in
`src/lib/publicMessageEvaluation/corpusV1.ts` are Family L members by reference.

---

### Family M — security controls

| ID | Source text | Shape | Signals | User | Others | Help target | Urg | CQ | PR | PW | Msg | Spec | Transition | Case |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M01 | `We will never ask you to share your verification code` | DOC | — | N | — | unknown | none | CQ-NONE | PR-DOC, PR-SEC | PW-SEC | Yes | No | message_analysis_selected | No |
| M02 | `Send us the six-digit verification code you just received so we can secure your account.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-SEC | PW-SEC | Yes | No | safety_preflight → message_analysis_selected (security result) | No |
| M03 | `Verify your account using this link within two hours or access will be suspended.` | DOC | — | N | — | unknown | none | CQ-NONE | PR-SEC | PW-SEC | Yes | No | safety_preflight → message_analysis_selected (security result) | No |
| M04 | `Your mum's care home invoice is overdue. Pay £480 today using this link or she will be removed.` | DOC | — | N | mum | unknown | none | CQ-NONE | PR-SEC | PW-SEC | Yes | No | safety_preflight → message_analysis_selected (security result) | No |

**Family M contract.** The security preflight runs before shape classification and
cannot be displaced. No confirmation step may precede a safety result, and no
intent signal may weaken or delay one. **Security precedence is not reduced by
anything in this document.**

**M01** is a protective message and must remain a safe negative — the existing
negation handling in `src/lib/sensitiveInformationRequest.ts` covers it.

**M04 — the hardest case in the corpus.** Care vocabulary, money pressure, a
supplied link and a threat in one message. A **scam-shaped document**. Neither the
care signal nor a confirmation question may appear before the safety result. If
intent routing ever displaces security here, the feature is unsafe and must not
ship.

---

## 7. Baselines and invariants

### 7.1 Help-target distribution

| Value | Count | Scenarios |
|---|---:|---|
| `unknown` | **75** | every scenario except those listed below |
| `one_other` | **10** | D01, D06, F01, F02, F05, F06, F07, J03, K01, K02 |
| `self` | **5** | D04, D05, E05, G01, G03 |
| `multi_other` | **0** | reachable only by explicit selection |
| `self_and_other` | **0** | reachable only by explicit selection |
| | **90** | |

Five of the ten `one_other` values sit in Family F, where the person in danger is
unmistakably named. Only D01, D06, J03, K01 and K02 reach `one_other` in a
non-urgent context, and each is an explicit request about a named person.

### 7.2 Recorded `e40285b` baselines for the document controls

Captured by running each control through `analyseAdminItem` → `createAdminCase` →
`selectMostImportantCase` → `deriveOpportunityCard` → `buildResultViewModel` →
`deriveGuidedNextStep` at `e40285b`.

| ID | Baseline title | Status | Opportunity | Baseline best next move | Next-step kind |
|---|---|---|---|---|---|
| L01 | Information-only confirmation | resolved | no_action_needed | Keep the source confirmation | evidence_checklist |
| L02 | Document request to act on | ready_to_act | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| **L03** | This needs a careful human review | new | deadline | **Identify the sender, date, reference, and deadline** | draft_message |
| L04 | Payment or balance issue to review | new | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| L05 | Price or account change to check | new | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| L06 | Payment or balance issue to review | new | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| L07 | Date or deadline to keep | waiting | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| L08 | Decision or review update | waiting | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| J06 | Date or deadline to keep | new | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| K06 | Information-only confirmation | resolved | no_action_needed | Keep the source confirmation | evidence_checklist |
| **G02** | Important reply needed | new | deadline | **Identify the sender, date, reference, and deadline** | draft_message |
| **G06** | **No obvious saving or action found** | new | no_action_needed | **Identify the sender, date, reference, and deadline** | draft_message |
| M01 | Provider update with an open next step | ready_to_act | needs_human_check | Follow the source-grounded next step | evidence_checklist |
| M02 | Email needs safety check | new | suspicious_email_risk | Do not share the requested code, password, PIN, or card or bank details | draft_message |
| M03 | Email needs safety check | new | suspicious_email_risk | Avoid making the requested payment or using the message's link | draft_message |
| M04 | Email needs safety check | new | suspicious_email_risk | Avoid making the requested payment or using the message's link | draft_message |

**Why this table matters.** Three document controls — **L03, G02 and G06** —
legitimately produce the exact phrases the earlier version of this corpus banned
outright. An implementation built against those old invariants would have had to
change document behaviour to pass, which is precisely what routing work must not
do. Whether those three baselines are *good* results is a separate question, and
not one this feature may answer.

### 7.3 Corpus-wide invariants

| # | Invariant | Applies to |
|---|---|---|
| **INV-1** | Never produces "No obvious saving or action found" | **non-DOC only** |
| **INV-2** | Never produces "Identify the sender, date, reference, and deadline" | **non-DOC only** |
| **INV-3** | `Spec` is `No` for all 90. No specialist journey opens automatically | all |
| **INV-4** | `Case` is `No` for all 90. No case is created before explicit confirmation | all |
| **INV-5** | `Msg` is `Yes` for all 90. A route back to message checking always exists | all |
| **INV-6** | **DOC results match the recorded `e40285b` baseline exactly** — title, status, opportunity type, best next move and next-step kind | DOC only |
| **INV-7** | **Routing work must not silently fix, improve or otherwise alter document-analysis output.** A DOC result that looks wrong stays wrong until changed by a separate, specified piece of work | DOC only |
| **INV-8** | Every confirmation set contains "I'm not sure", and it always leads somewhere useful | non-DOC |
| **INV-9** | `multi_other` and `self_and_other` never appear before confirmation, and `one_other` / `self` appear only where the user clearly asked | all |
| **INV-10** | No scenario mentions, activates or routes to Estate Administration | all |
| **INV-11** | Where an urgency signal is `practical`, `health` or `danger`, the urgency question precedes every routing question | non-DOC |
| **INV-12** | **AdminAvenger never selects between 999, NHS 111 Wales, a ward or discharge team, or a council service.** The urgent page presents them; the person chooses | non-DOC |
| **INV-13** | Every urgent page states that AdminAvenger cannot assess, triage or contact services | non-DOC |
| **INV-14** | No output states that a named person is a carer, lacks capacity, is entitled to anything, or is in danger | all |
| **INV-15** | The security preflight precedes shape classification in every scenario | all |
| **INV-16** | Classification is deterministic: identical input yields identical output | all |
| **INV-17** | No output counts money as saved, recovered or receivable | all |

**INV-1 and INV-2 previously applied to all scenarios.** Section 7.2 shows that
was wrong. Restricting them to non-DOC is the correction.

---

## 8. Coverage summary

| Required coverage | Scenarios | Count |
|---|---|---|
| Relationship variations | A01–A10, B01–B08, C01–C07, E01–E06, J04, J05, K01, K02 | 12 distinct relationships |
| Caring-role variations | B01–B08, D05, E02, E04, J02, J05 | 13 |
| Functional-needs wording | C01–C07, A05–A08, K05, H03 | 13 |
| Direct benefits questions | D01–D08, J03 | 9 |
| Life-situation descriptions | A01–A10, B01–B08 | 18 |
| Bereavement / end of caring role | E01–E06 | 6 |
| Hospital discharge | H01–H04, F05 | 5 |
| Urgency signals present | F01–F07 | 7 |
| Weak-urgent wording | G01–G06 | 6 |
| Ambiguous one/two-word input | I01–I07 | 7 |
| Orientation requests | I08, I09 | 2 |
| Spelling mistakes | J01, J02, J03 | 3 |
| OCR-style formatting | J06, J04 | 2 |
| Multiple people mentioned | J04, J05, B08, D08 | 4 |
| Contradictory input | K01–K06 | 6 |
| Document controls | L01–L08, J06, K06, G02, G06 | 12 (+159 by reference) |
| Security controls | M01–M04 | 4 |
| **Total scenarios** | | **90** |

Relationships: father, mother, sister, brother, partner, spouse (husband, wife),
child (son, daughter), aunt, uncle, grandparent (grandmother, nan, grandad),
friend, neighbour.

---

## 9. How this corpus should be used

1. Encode Section 6 as a data table, in the manner of `corpusV1.ts`.
2. Assert shape, signals, mentioned people, help target and urgency signal for
   every scenario.
3. Assert every invariant in Section 7.3, respecting the DOC / non-DOC split.
4. Assert the recorded baselines in Section 7.2 for the document controls.
5. Run the 159-record document corpus as an extension of Family L.
6. Treat **A01, D03, E01, F01, F02, J06, K06, L03 and M04** as the scenarios
   requiring human review before release. They are where a wrong answer causes
   real harm rather than mild annoyance.

---

## 10. Decisions — settled and still open

### 10.1 Settled by the 1 August 2026 approval

| Was | Now settled as |
|---|---|
| **Q2** Are K01 and K02 clear enough for `one_other`? | **Yes.** Approved decision 3: "I don't need help, but Mum does" may use `one_other_person`. K01 and K02 stand as written |
| **Q7 (partly)** Should a separate specification address document-analysis quality? | **Not here.** Approved decisions 5 and 6 fix document behaviour to `e40285b` exactly. Whether separate work is commissioned remains open — spec O10 |
| Help-target model | Settled by approved decisions 1, 2 and 4. `multiple_other_people` and `self_and_other` require explicit wording or selection and appear zero times in this corpus |
| Urgency handling | Settled by approved decisions 7 and 8. Preflight runs before routing, and AdminAvenger never selects between 999, NHS 111 Wales, a discharge team and a council service |
| Jurisdiction | Settled by approved decisions 9, 10 and 11 |

### 10.2 Still open

| # | Open question | Blocks | Spec ref |
|---|---|---|---|
| **Q1** | Is `unclear` right for minimal input such as `help`, or should it be `none`? | Tuning only | O7 |
| **Q3** | **Is the CQ-URGENT wording safe? It requires safeguarding review before any release — not designer review, and not AI review.** | Any release showing the urgent page | O1 |
| **Q3b** | **Is the CQ-BEREAVEMENT wording acceptable?** Requires bereavement-service review | Any release showing the bereavement set | O2 |
| **Q4** | Should the urgency question appear for `unclear`, or only for `practical`, `health` and `danger`? | Tuning only | O8 |
| **Q5** | Are Welsh-language versions of every confirmation set required before release? | Any Wales-facing release | O3 |
| **Q6** | Should relationship labels be retained, and for how long? Session-only is the safe default | Any persistence | O9 |
| **Q8** | Is user research with unpaid carers required before the confirmation copy is final? | Treating copy as settled | O4 |

Q3 and Q3b are the two that would cause real harm if skipped.
