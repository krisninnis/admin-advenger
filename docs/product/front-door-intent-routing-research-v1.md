# Front-Door Intent Routing — External Research — v1

## 1. Document status

| Field | Value |
|---|---|
| Status | **Approved — narrow Front-Door Intent Routing v1 implementation slice only** |
| Type | External research record. Not a specification and not an approval |
| Approval date | 1 August 2026 |
| Approved by | Human project owner |
| Companion documents | `docs/specs/active/front-door-intent-routing-v1.md`, `docs/product/front-door-intent-routing-evaluation-v1.md` |
| Access date for all sources | 1 August 2026 |
| Primary service context | Wales |
| Legal jurisdiction where relevant | England and Wales |
| Health and social-care service context | Wales |
| Authority | None of this material carries repository authority. It informs design; it does not license behaviour |

### 1.1 Approval record and what approval means here

Approved on **1 August 2026** by the **human project owner**, on the same terms as
`docs/specs/active/front-door-intent-routing-v1.md` Section 1.1.

For a research record, approval has a narrow meaning. It means **this record is
accepted as the external basis for the narrow v1 slice.** It does **not**:

- approve the external content itself, which belongs to the organisations that
  publish it;
- make any source current beyond its access date of 1 August 2026;
- authorise displaying any contact detail, phone number or opening hours from any
  source here — directory implementation is explicitly excluded from the approved
  scope;
- reduce any prohibition in Section 5, all of which survive approval intact.

The re-check schedule in Section 4 still applies. S5 in particular is high-churn
and must be re-verified before implementation begins.

### 1.2 What this document is for

The specification previously carried its external research inline. That mixed two
different kinds of claim: what the AdminAvenger repository does, which is
verifiable by running it, and what external bodies publish, which is verifiable
only by visiting a URL on a date. This document separates the second kind so a
reviewer can audit it independently and re-check it when it goes stale.

### 1.3 Verification levels used below

| Level | Meaning |
|---|---|
| **Fetched** | The page was retrieved and read in full during this session |
| **Listed** | The title and URL were confirmed through an authoritative search index; the page body was not retrieved in full |

Nothing in this document is quoted at length. Where a source's wording matters,
a short phrase is quoted and attributed.

---

## 2. Source register

### S1 — GOV.UK Design System: Question pages

| Field | Value |
|---|---|
| Organisation | Government Digital Service (GOV.UK Design System team) |
| Page title | Question pages |
| Jurisdiction | United Kingdom |
| URL | <https://design-system.service.gov.uk/patterns/question-pages/> |
| Access date | 1 August 2026 |
| Verification | Fetched |
| Time-sensitive | Low — a stable, long-lived design pattern |

**Relevance.** This is the closest published pattern to the confirmation step in
Section 6 of the specification. The points AdminAvenger adopts:

- start by asking **one question per page**, so the person can focus on the
  question and its answer;
- make it clear **why** you are asking;
- **allow "I do not know" or "I'm not sure"** where those are valid answers;
- always provide a **back link**, so people are reassured they can change an
  earlier answer;
- **ask for a piece of information only once** in a journey;
- label the primary control **"Continue"**, left-aligned;
- test **without** a progress indicator first.

**Limitation.** Written for multi-page transactional government forms. AdminAvenger's
front door is a single page with an optional in-page confirmation step, so the
"page" concept maps to a step, not a URL. The pattern also assumes the service
already knows what it is asking for; AdminAvenger's problem is the opposite — it
is trying to work out what the person wants.

---

### S2 — GOV.UK Service Manual: Designing good questions

| Field | Value |
|---|---|
| Organisation | Government Digital Service (Design community) |
| Page title | Designing good questions |
| Jurisdiction | United Kingdom |
| URL | <https://www.gov.uk/service-manual/design/designing-good-questions> |
| Access date | 1 August 2026 |
| Page last updated | 24 June 2026 (guidance added on making questions accessible) |
| Verification | Fetched |
| Time-sensitive | Medium — updated within the last two months |

**Relevance.** This is the strongest single justification for the adaptive
*closed* questions in the specification rather than an open "tell us more" box:

- **closed questions are easier to answer than open questions** — the page notes
  this is "especially" true in government services, "where users are often afraid
  of being caught out", and that closed questions are more accessible to people
  who find reading or writing difficult;
- **a series of simple questions can be easier than one complex question**;
- **let people answer "I'm not sure" or "I do not know"** where valid;
- **descriptive option labels beat bare Yes/No.** The register-to-vote team
  replaced a single "Yes" with "Yes, I spend time living at two homes" and
  "Yes, I'm a student with home and term-time addresses", and the question
  became much easier to answer;
- separate differently-phrased options with an **"or"**;
- keep help text short — people are unlikely to read more than three lines.

**Limitation.** Addresses question wording, not intent detection. It offers no
guidance on deciding *which* question to ask, which is the harder half of the
AdminAvenger problem.

---

### S3 — GOV.WALES: Carers' rights

| Field | Value |
|---|---|
| Organisation | Welsh Government |
| Page title | Carers' rights |
| Service context | Wales |
| Legal jurisdiction | England and Wales (the Act itself applies to Wales) |
| URL | <https://www.gov.wales/carers-rights> |
| Access date | 1 August 2026 |
| Verification | Fetched |
| Time-sensitive | Medium — statutory framing is stable; contact routes and publications change |

**Relevance.** This is the legal basis for the **person-target model**. Under the
Social Services and Well-being (Wales) Act 2014, an unpaid carer has rights *of
their own*, separate from the rights of the person they care for — including the
right to information, advice and assistance, the right to be offered a carer's
needs assessment, and the right to have their well-being promoted. The page
directs people to their local authority, Carers Wales and Carers Trust Wales.

The product consequence is direct: **a carer and the person they care for are two
people with two separate sets of entitlements.** A product that silently collapses
them into one "user" will attach the wrong support to the wrong person. This is
why `Mum gets PIP and I help with shopping` must be clarified and never inferred.

**Limitation.** Wales only. The equivalent framework in England is the Care Act
2014 and differs in detail. AdminAvenger must not generalise Welsh rights to
other UK nations. The page is a signposting hub rather than a service, and its
substantive content sits in linked PDFs that were not retrieved.

---

### S4 — Carers Wales (Carers UK): Help and advice

| Field | Value |
|---|---|
| Organisation | Carers UK, operating as Carers Wales (registered charity 246329) |
| Page title | Help and advice |
| Service context | Wales (part of a UK charity with nation-specific content) |
| URL | <https://www.carersuk.org/wales/help-and-advice/> |
| Access date | 1 August 2026 |
| Verification | Fetched |
| Time-sensitive | Medium — charity information architecture changes without notice |

**Relevance.** An independently designed intake taxonomy for exactly the domain
the regression case falls into. Its top-level categories are: financial support;
practical support; helpline and other support; health and wellbeing; work and
career; guides and tools; technology and equipment; support where you live.

Two structural details matter more than the taxonomy itself:

1. **"Carer's assessment" and "Needs assessment" are two separate pages** under
   practical support. An organisation whose entire purpose is supporting carers
   still keeps the carer's assessment and the cared-for person's assessment
   distinct. This is independent corroboration of the person-target model.
2. **"Coming out of hospital" is a named top-level intake category.** This
   supports treating `possible_hospital_discharge` as a first-class situation
   signal rather than a sub-case of care.

The site also runs a "support where you live" local directory, which is a working
example of the governed contact model in Section 10 of the specification.

**Limitation.** A charity's own information architecture, not a standard. It
reflects Carers Wales's service model and funding, not a neutral view of the
domain. Nothing here is a legal statement.

---

### S5 — NHS 111 Wales

| Field | Value |
|---|---|
| Organisation | NHS Wales |
| Page title | NHS 111 Wales — Homepage |
| Health service context | Wales |
| URL | <https://111.wales.nhs.uk/> |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | **High** — service availability and contact routes change |

**Relevance.** Defines the escalation vocabulary for the urgency model. NHS 111
Wales is for **urgent healthcare that is not an emergency**, free, 24 hours a
day. **999** is for life-threatening emergencies — the health-board pages
retrieved alongside it list breathing difficulties, suspected heart attack, heavy
blood loss, serious injury, severe burns and loss of consciousness.

The product consequence is a hard boundary: AdminAvenger **recognises urgency
wording and hands off**. It never triages clinically, never decides how urgent
something is, and never substitutes itself for 111 or 999.

**Limitation.** Wales-specific. NHS 111 operates differently in England,
Scotland and Northern Ireland. Because this is high-churn operational
information, any contact detail derived from it must carry a `lastChecked` date
and a freshness class under the Section 10 contact model.

---

### S6 — NHS Wales: Six Goals for Urgent and Emergency Care, Goal 5

| Field | Value |
|---|---|
| Organisation | NHS Wales Performance and Improvement |
| Page title | Goal 5: Optimal hospital care and discharge practice |
| Health service context | Wales |
| URL | <https://performanceandimprovement.nhs.wales/functions/six-goals-uec/goal-5/> |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | Medium — programme documentation |

**Relevance.** Supports `possible_hospital_discharge` as its own signal with its
own timing pressure. Discharge planning begins at admission; the consultant
decides when a person is clinically ready to leave; people generally recover
better at home or in community-based care than by remaining in hospital.

The product consequence is that `Dad is coming home from hospital tomorrow` is a
**time-bounded practical situation**, not a document and not a routine care
enquiry. It sits between routine and urgent — which is why it carries
`unclear_urgency` rather than being forced into either — and why the urgent page
carries a distinct "contact the ward or discharge team" route alongside 999 and
NHS 111 Wales.

**Limitation.** Written for NHS delivery organisations, not for the public. It
describes system goals, not an individual's entitlements, and confers none.

---

### S7 — W3C: Web Content Accessibility Guidelines (WCAG) 2.2

| Field | Value |
|---|---|
| Organisation | World Wide Web Consortium (W3C), Accessibility Guidelines Working Group |
| Page title | Web Content Accessibility Guidelines (WCAG) 2.2 |
| Jurisdiction | International |
| URL | <https://www.w3.org/TR/WCAG22/> |
| Status | W3C Recommendation |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | Low — a stable Recommendation |

**Relevance.** The confirmation step introduces a new interactive decision point
in the most important journey in the product, so it inherits the full
accessibility obligation: labels and legends as headings, keyboard operability,
visible focus, and no reliance on colour or pointer gestures. WCAG 2.2 adds nine
success criteria beyond 2.1, aimed at people with visual, physical and cognitive
disabilities.

**Limitation.** WCAG sets a floor, not a ceiling. Passing every success criterion
would not by itself make a bereavement or urgent-care path humane, which is why
the specification also requires a manual read-aloud check.

---

### S8 — W3C WAI: Cognitive Accessibility

| Field | Value |
|---|---|
| Organisation | W3C Web Accessibility Initiative |
| Page title | Cognitive Accessibility at W3C |
| Jurisdiction | International |
| URL | <https://www.w3.org/WAI/cognitive/> |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | Low |

**Relevance.** The people most likely to type `my father needs care` are often
under acute stress, sleep-deprived, bereaved or managing their own condition.
Cognitive load is therefore a primary design constraint, not a refinement. This
supports: one question at a time; short, concrete option labels; no jargon; no
unexplained product names; and an always-present "I'm not sure".

**Limitation.** A programme hub rather than a testable checklist. Its guidance is
directional and cannot be asserted as a pass or fail in a test.

---

### S9 — Nielsen Norman Group: Progressive Disclosure

| Field | Value |
|---|---|
| Organisation | Nielsen Norman Group |
| Page title | Progressive Disclosure (Jakob Nielsen, 2006) |
| Jurisdiction | Not jurisdictional — general interaction-design literature |
| URL | <https://www.nngroup.com/articles/progressive-disclosure/> |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | Low — long-standing, frequently cited |

**Relevance.** The design rationale for showing **no more than three priority
contacts** with an expand-to-see-more control, and for the ten-page future
journey revealing one decision at a time rather than presenting a full plan at
once. Deferring advanced or secondary material reduces the burden on the majority
while keeping it reachable.

**Limitation.** Commercial UX literature, not a standard, and not specific to
public services or to people in distress. It is supporting rationale only; where
it conflicts with S1, S2 or S7, those take precedence.

---

### S10 — Citizens Advice: When you get advice

| Field | Value |
|---|---|
| Organisation | Citizens Advice (national charity and network of local charities) |
| Page title | When you get advice |
| Service context | England and Wales |
| Legal jurisdiction | England and Wales |
| URL | <https://www.citizensadvice.org.uk/about-us/information/when-you-get-advice/> |
| Related | <https://www.citizensadvice.org.uk/about-us/contact-us/> |
| Access date | 1 August 2026 |
| Verification | Listed |
| Time-sensitive | Medium |

**Relevance.** The single most important external norm for the contact-directory
handoff: **Citizens Advice asks permission before making any referral, and only
refers when permission has been given.** An organisation whose core business is
signposting treats onward referral as requiring explicit consent.

AdminAvenger's principle — AI prepares, humans decide — is therefore not merely a
product preference; it matches how the established advice sector actually
behaves. This directly supports the `referralRequirement` field in the contact
model and the rule that AdminAvenger never contacts anyone on a person's behalf.

Citizens Advice also offers local-office lookup by postcode or town across
England and Wales, which is the closest analogue to the council-area field in the
governed contact model.

**Limitation.** Describes a charity's own service policy, not a legal duty on
third parties. Service availability, helpline numbers and the Help to Claim
service change over time and must be re-checked before any contact detail is
shown.

---

## 3. What the research changed in the design

| Finding | Source | Change made to the specification |
|---|---|---|
| Closed questions beat open questions, especially where people fear being caught out | S2 | Confirmation step uses closed questions with descriptive labels, never a free-text box |
| Descriptive labels beat Yes/No | S2 | Adaptive option sets name the actual people and outcomes ("Me because I support them"), not "Yes"/"No" |
| Allow "I'm not sure" | S1, S2 | "I'm not sure" is mandatory in every confirmation set and must always lead somewhere useful |
| One question at a time; back link; never re-ask | S1 | One question per step; Back preserves the person's text |
| A carer has rights separate from the cared-for person | S3 | Mentioned-people list kept separate from a five-value help target |
| Carer's assessment and needs assessment are separate even within a carers' charity | S4 | Help target stays `unknown` unless the user clearly asks; `Mum gets PIP and I help with shopping` requires clarification |
| "Coming out of hospital" is a distinct intake category | S4, S6 | `possible_hospital_discharge` is its own situation signal |
| 111 is urgent-not-emergency; 999 is life-threatening | S5 | Five source-grounded urgency **signal categories**. **AdminAvenger records the signal and presents all four routes; it never selects between 999, NHS 111 Wales, a ward team and a council service** |
| Discharge is time-bounded but not an emergency | S6 | `unclear_urgency` covers imminent discharge; the urgent page carries a distinct ward-or-discharge-team route |
| Cognitive load is a primary constraint for this audience | S7, S8 | Short options, no jargon, no unexplained product names |
| Defer secondary material | S9 | No more than three priority contacts, expandable |
| Referral requires permission | S10 | No silent routing; `referralRequirement` field; AdminAvenger never contacts anyone |

---

## 4. Gaps and re-check schedule

| Gap | Consequence | Action |
|---|---|---|
| No user research with unpaid carers has been carried out | Every wording choice is an informed guess | Required before the confirmation copy is treated as settled |
| No Welsh-language review | Wales has statutory Welsh-language duties this document does not address | Required before any Wales-facing release |
| Sources S5, S6, S8, S9, S10 were listed but not fetched in full | Their detail is not independently verified here | Fetch and re-verify before any contact detail is displayed |
| England (Care Act 2014), Scotland and Northern Ireland frameworks not researched | Welsh service context must not be generalised, even though the legal jurisdiction for much of this work is England and Wales | Required before any non-Wales release |
| No source establishes how to *detect* intent, only how to *ask* about it | Detection design rests on repository evidence alone | Accepted; detection is deterministic, conservative and defaults to document |

**Re-check before implementation begins:** S5 (high churn). **Re-check every six
months or before any release that displays a contact detail:** S3, S4, S5, S6,
S10.

---

## 5. Prohibitions carried into the specification

Nothing in this research authorises AdminAvenger to:

- assess clinical urgency, triage, or act as an alternative to 999 or NHS 111 Wales;
- choose on a person's behalf between 999, NHS 111 Wales, a ward or discharge team, and a council service;
- state that a person is or is not a carer;
- state that anyone is or is not entitled to any benefit or service;
- assert legal rights under the Social Services and Well-being (Wales) Act 2014
  or any other statute;
- make a referral, contact any organisation, or imply that it has;
- display a contact detail that has not been verified and dated;
- generalise Welsh arrangements to England, Scotland or Northern Ireland.
