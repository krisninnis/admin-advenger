# Estate Administration Research Framework — v1

## Document status

**Status: Draft — Research Planning Framework.**

This document is a plan for future authoritative research. It is **not
research**, does not validate any process or wording, and contains no
implementation approval.

It is explicit that:

- no external research was performed to create this framework;
- no source named or described here has yet been located, read, assessed, or
  approved for Estate Administration;
- candidate authorities are research targets, not endorsements or evidence;
- no date, deadline, threshold, eligibility condition, legal effect, required
  document, organisation workflow, or signposting destination in this framework
  may be treated as verified;
- Estate Administration remains unimplemented and non-public;
- the current roadmap milestone is unchanged;
- research completion would not by itself approve product implementation,
  controlled testing, a pilot, public routing, or public claims;
- the product boundary remains **AI prepares. Humans decide.**

This framework supports
`docs/specs/active/estate-administration-support-v1.md`. Where it conflicts with
`AGENTS.md`, `THE_COVENANT.md`, project governance, or an approved
specification, those sources take precedence and this framework must be
corrected.

---

## 1. Scope

### 1.1 Purpose

This framework defines:

- what future researchers must investigate;
- why each topic matters to product safety;
- which evidence is acceptable for which type of claim;
- how jurisdiction, dates, conflicts, uncertainty, and source changes must be
  recorded;
- what a completed research output must contain;
- what AdminAvenger must say it cannot know;
- what claims remain forbidden even if authoritative material exists;
- which reviews and approvals are required before research may influence a
  product specification.

### 1.2 In scope

- Practical administration after a death.
- England and Wales, Scotland, and Northern Ireland as separate research units.
- Government, court, regulator, professional, charity, and organisation-specific
  material relevant to the research areas in §15.
- Source-backed terminology, process descriptions, evidence requests, timing
  language, escalation triggers, and signposting.
- Accessibility, emotional safety, privacy, data minimisation, and safe
  presentation of source-grounded information.
- Research governance: evidence hierarchy, source register, conflict log,
  confidence, review, expiry, and approval.

### 1.3 Out of scope

- Performing the research.
- Answering any question in the research backlog.
- Interpreting legislation, case law, wills, policies, or individual documents.
- Giving legal, tax, financial, benefits, debt, housing, employment, medical, or
  regulated advice.
- Designing or implementing production code, schemas, routes, components,
  services, tests, fixtures, classifiers, or prompts.
- Naming a service as suitable for a user before its scope, jurisdiction,
  accessibility, independence, and currency have been verified.
- Deciding that any later product output is safe merely because it cites a
  source.
- Changing the current roadmap or public scope.

### 1.4 Research principles

1. **Source before claim.**
2. **Jurisdiction before generalisation.**
3. **Exact wording before summary.**
4. **Primary authority before commentary.**
5. **Current source before remembered practice.**
6. **Conflict recorded, not concealed.**
7. **Uncertainty visible, not averaged away.**
8. **Organisation policy is not legislation.**
9. **General guidance is not an individual decision.**
10. **Research informs a later specification; it never silently becomes product
    behaviour.**

## 2. Jurisdiction assumptions

### 2.1 Starting assumptions for the research plan

These are planning constraints, not substantive legal findings:

- “UK estate administration” must not be researched or written as one uniform
  process.
- England and Wales, Scotland, and Northern Ireland require separate source
  registers, terminology checks, workflow maps, claim matrices, and reviews.
- The research must not assume that the user’s current location identifies the
  relevant jurisdiction.
- The research must distinguish, where authoritative sources require it, the
  place of death, usual residence, domicile, property location, asset location,
  organisation location, and court or registration system involved.
- Cross-border and overseas elements are escalation topics unless a later
  approved research scope explicitly covers them.
- Crown Dependencies and overseas territories are excluded unless separately
  commissioned.
- A source that applies in one jurisdiction must never be copied into another
  jurisdiction’s output without separate authority.

### 2.2 Required jurisdiction record

Every research question and source record must state:

- jurisdiction: England and Wales, Scotland, Northern Ireland, UK-wide
  administrative service, cross-border, or unknown;
- territorial scope stated by the source;
- legal/process scope: registration, court process, tax, benefits, regulator,
  organisation policy, or other;
- relevant location facts, if the source says they matter;
- excluded locations or circumstances;
- whether the wording is legally specific or only service guidance;
- effective/publication/last-updated date;
- whether transitional or historical rules may apply;
- whether professional review is required before product use.

### 2.3 Jurisdiction safety rules

- Never infer jurisdiction from an address fragment, organisation name, dialect,
  postcode, or document template alone.
- Never substitute a “UK” label for an unknown or mixed territorial scope.
- Never translate one jurisdiction’s legal term into another as if they were
  equivalent.
- Never merge sources across jurisdictions to fill gaps.
- If jurisdiction is unknown, the research output must provide only neutral
  preparation language and a question for the user or adviser.
- If a workflow may cross jurisdictions, stop the ordinary workflow and define a
  specialist-review trigger.

## 3. Evidence hierarchy

### 3.1 Tiers

| Tier | Evidence class | Suitable use | Limitations |
|---|---|---|---|
| **Tier 1** | Official legislation, statutory instruments, court/procedure rules, and authoritative court materials | Establish the text and formal basis of a legal requirement, power, status, deadline, or definition | May require interpretation; amendments, commencement, territorial extent, exceptions, and case law must be checked. It is not self-executing product advice. |
| **Tier 2** | Government, court service, tax authority, benefits authority, registration authority, land registry, and other official public guidance | Explain current official processes, forms, service routes, and public-facing terminology | Guidance may simplify the law, omit exceptions, differ by jurisdiction, or lag behind legislation. |
| **Tier 3** | Statutory regulators, ombudsman schemes, official adjudication bodies, and supervisory authorities | Verify regulated-firm duties, complaint routes, service standards, consumer protections, and escalation boundaries | Regulator guidance may apply only to regulated firms, products, complaints, or periods. Ombudsman decisions may not establish a general rule. |
| **Tier 4** | Recognised professional bodies, accredited practice guidance, professional standards, and technical manuals | Understand professional practice, risk signals, terminology, and when specialist help is appropriate | May represent member practice rather than law; access may be restricted; conflicts of interest and date must be assessed. |
| **Tier 5** | Established specialist charities, public-interest organisations, and adviser networks with transparent editorial standards | Test plain language, lived-context gaps, emotional safety, accessibility, and practical signposting | Must not override higher-tier legal/process authority; service scope, funding, jurisdiction, and referral suitability require checking. |
| **Tier 6** | Independent commentary, textbooks, practitioner articles, provider help pages outside their own workflow, media, forums, and user reports | Discover questions, terminology, failure modes, and leads for higher-tier verification | Not sufficient evidence for product claims, deadlines, eligibility, legal effects, or required actions. |

### 3.2 Evidence sufficiency by claim type

- **Legal requirement, legal authority, statutory deadline, tax liability, debt
  priority, entitlement, ownership, or court effect:** Tier 1 plus relevant Tier
  2 operational guidance and qualified review. Product conclusions may still be
  forbidden.
- **Government or court service workflow:** current Tier 2 source, checked
  against Tier 1 where the wording implies a legal consequence.
- **Regulated organisation duty or complaint route:** Tier 1 or Tier 3 as
  appropriate, plus the organisation’s current policy where the product
  describes its practical route.
- **Organisation-specific evidence or contact workflow:** the organisation’s own
  current official material, with regulator/government context where relevant.
  One organisation’s policy must not be generalised to another.
- **Professional-risk trigger:** Tier 4 corroborated by Tier 1–3 where it implies
  a legal or regulated consequence.
- **Plain-language, emotional-safety, or accessibility recommendation:** relevant
  standards and authoritative guidance, supplemented—not replaced—by Tier 5 and
  user research.
- **Discovery only:** Tier 6 may create a backlog question but cannot close it.

### 3.3 Conflict-handling protocol

When sources conflict:

1. Record both sources, their exact wording, issuer, tier, jurisdiction, scope,
   date, and version.
2. Check whether the apparent conflict is explained by different jurisdictions,
   dates, legal statuses, user circumstances, service channels, or definitions.
3. Check for amendment, withdrawal, archived guidance, transitional rules, or a
   source that cites another source out of context.
4. Prefer the higher-authority source only for the proposition it is competent
   to establish. A statute may govern the law while current official service
   guidance governs how a form is submitted.
5. Do not resolve a conflict by combining the most convenient parts of both.
6. Do not use recency alone to override hierarchy, or hierarchy alone to ignore a
   newer amendment or operational change.
7. Escalate unresolved Tier 1–3 conflicts to an appropriately qualified reviewer
   and the responsible product/safety owner.
8. Mark the claim **blocked — conflict unresolved**. The product implication is
   omission, cannot-know wording, or specialist signposting—not a guessed answer.
9. Record the resolution, reviewer, reasoning, approval date, and next-review
   trigger.

### 3.4 Corroboration rules

- Multiple pages repeating the same upstream wording count as one authority, not
  independent corroboration.
- Search snippets, generated summaries, cached fragments, and quoted material
  without a locatable original are not evidence.
- A professional or charity page that cites official guidance should lead the
  researcher back to the official source.
- Screenshots may preserve a reviewed version but do not replace the source
  record, retrieval date, and accessible text.
- Absence of a statement is not evidence that a requirement or exception does
  not exist.

## 4. Official sources

### 4.1 Candidate source families

Future researchers must build jurisdiction-specific registers for:

- legislation and statutory instruments;
- official court and tribunal rules, forms, practice directions, and guidance;
- death-registration authorities and local registration services;
- central and devolved government bereavement services;
- tax authority guidance, manuals, forms, and notices;
- benefits authority guidance, decision-maker material, forms, and service
  instructions where publicly authoritative;
- land registration authorities;
- official insolvency and court services;
- local authorities and official local-government guidance;
- statutory regulators and ombudsman/adjudication schemes;
- information-rights and data-protection authorities;
- organisation-owned bereavement policies for the organisation-specific
  workflow only.

Names in §15 are **candidate authorities to verify**, not validated source lists.

### 4.2 Official-source acceptance checklist

- [ ] The issuer and official status are unambiguous.
- [ ] The primary page/document, not a search result or secondary quotation, was
      reviewed.
- [ ] Jurisdiction and territorial extent are recorded.
- [ ] Publication, effective, amendment, and last-updated dates are recorded
      where available.
- [ ] The exact section, paragraph, form note, or page is recorded.
- [ ] The shortest sufficient exact wording is preserved.
- [ ] Definitions and referenced documents were followed where necessary.
- [ ] Exceptions, exclusions, thresholds, and transitional provisions were
      checked.
- [ ] Accessibility and alternative formats were noted.
- [ ] The source owner and change-monitoring method are recorded.
- [ ] A reviewer has confirmed that the summary does not overstate the source.

### 4.3 Official-source limitations

Official does not automatically mean:

- legally complete;
- applicable to every jurisdiction or user;
- current;
- easy to interpret;
- free from operational inconsistency;
- suitable as user-facing copy;
- sufficient to support an individual conclusion;
- permission for AdminAvenger to advise or decide.

## 5. Professional bodies

### 5.1 Research purpose

Professional guidance may help identify:

- terms of art and jurisdiction-specific language;
- circumstances requiring a solicitor, tax professional, regulated adviser,
  insolvency practitioner, conveyancer, accountant, pensions specialist, or
  other qualified person;
- recognised practice risks and document-handling expectations;
- boundaries between administration and professional advice;
- safe questions a user may prepare;
- competence, accreditation, complaints, and referral considerations.

### 5.2 Candidate professional-source classes

The future source register may consider, subject to verification:

- legal professional regulators and representative bodies for each
  jurisdiction;
- accountancy and tax professional bodies;
- probate or estate-administration practitioner bodies;
- insolvency professional and regulatory bodies;
- conveyancing and property professional bodies;
- pensions professional and trustee bodies;
- funeral-sector standards or regulatory bodies;
- banking, insurance, utility, and telecom industry bodies for practice context;
- accessibility, bereavement, and trauma-informed design experts.

### 5.3 Professional-guidance acceptance checklist

- [ ] The body’s regulatory, representative, accreditation, or commercial role
      is stated.
- [ ] Membership scope and jurisdiction are recorded.
- [ ] The guidance date and intended professional audience are recorded.
- [ ] Any public-facing summary is checked against higher-tier authority.
- [ ] Conflicts of interest, commercial referral, or member-service bias are
      noted.
- [ ] The material is not presented as law unless Tier 1 supports that claim.
- [ ] A professional recommendation is phrased as a type of help to consider,
      not a guaranteed need or outcome.

## 6. High-risk claims

### 6.1 Claim classes

Use two controls:

- **Evidence-gated:** research may support cautious general information, subject
  to jurisdiction, review, source-grounding, and product approval.
- **Product-forbidden conclusion:** AdminAvenger must not decide the matter for
  an individual even if authoritative material exists. Research may support
  cannot-know wording, questions, evidence organisation, and signposting only.

### 6.2 Comprehensive high-risk checklist

#### Legal process and status

- [ ] Whether probate, confirmation, a grant, court order, bond, notice, or
      application is required.
- [ ] Which grant or procedure applies.
- [ ] Whether an application is valid, complete, late, accepted, refused, or
      likely to succeed.
- [ ] Whether the estate is legally administered, wound up, distributed,
      solvent, insolvent, excepted, simple, complex, taxable, or non-taxable.
- [ ] Whether a document is legally effective, enforceable, authentic, revoked,
      superseded, or sufficient.
- [ ] Whether a court, registrar, tax authority, creditor, beneficiary, or
      organisation is correct.

These are product-forbidden individual conclusions.

#### Authority and capacity

- [ ] Who may register a death, notify an organisation, apply for a grant, access
      an account, handle property, instruct a professional, or distribute assets.
- [ ] Whether the user is an executor, administrator, personal representative,
      next of kin, beneficiary, trustee, attorney, nominee, or authorised helper.
- [ ] Whether a power of attorney, nomination, mandate, joint authority, or other
      authority continues or ends after death.
- [ ] Whether an organisation must accept particular evidence of authority.
- [ ] Whether a person has mental capacity or can give valid consent.

AdminAvenger may preserve user/source wording but must not confer authority.

#### Wills, beneficiaries, inheritance, and ownership

- [ ] Whether a will or codicil is valid, latest, properly executed, revoked,
      altered, lost, or applicable.
- [ ] How a clause should be interpreted.
- [ ] Who inherits, in what share, under a will or intestacy.
- [ ] Whether someone is a beneficiary, dependant, claimant, or excluded person.
- [ ] Whether a gift, nomination, trust, survivorship arrangement, or joint asset
      passes inside or outside the estate.
- [ ] Who owns money, property, digital assets, personal possessions, insurance
      proceeds, pension benefits, or jointly held assets.
- [ ] Whether distribution, sale, transfer, disclaimer, variation, or payment is
      lawful, prudent, required, or safe.

These remain product-forbidden conclusions.

#### Tax and money

- [ ] Whether tax is due, not due, paid, overpaid, underpaid, reportable, or
      settled.
- [ ] Any inheritance-tax, income-tax, capital-gains-tax, trust-tax, estate-tax,
      interest, penalty, allowance, exemption, relief, threshold, valuation, or
      domicile conclusion.
- [ ] Whether a return, account, form, valuation, payment, or clearance is
      required.
- [ ] Which valuation method or date applies.
- [ ] Whether money may be distributed or retained.
- [ ] Whether an amount is saved, recovered, owed, inherited, available, or safe
      to spend.
- [ ] Currency conversion, apportionment, gross/net, interest, or tax
      calculations used as advice.

AdminAvenger must never calculate or decide individual tax liability.

#### Benefits and public support

- [ ] Eligibility or entitlement for any benefit, payment, reduction, exemption,
      grant, allowance, or funeral-cost support.
- [ ] Whether inheritance, capital, income, a trust, a gift, spending, or estate
      administration changes entitlement.
- [ ] Whether, when, how, or to whom a user must report for an individual case.
- [ ] Whether an overpayment, underpayment, fraud issue, deprivation rule, or
      penalty applies.
- [ ] Expected amount, award length, backdating, interaction, or outcome.

These are product-forbidden individual conclusions.

#### Debts, liabilities, and insolvency

- [ ] Whether a debt is valid, enforceable, secured, priority, joint, personal,
      estate-owned, statute-barred, disputed, payable, or written off.
- [ ] Whether the user is personally liable.
- [ ] Whether a creditor may contact, freeze, recover, repossess, set off, or
      enforce.
- [ ] Whether the estate is insolvent or how creditors should be paid.
- [ ] Whether any payment, admission, distribution, or contact could prejudice a
      position.
- [ ] Which debt or expense has priority.

These require specialist handling; AdminAvenger does not decide them.

#### Deadlines and urgency

- [ ] Any statutory, court, tax, benefits, registration, creditor, complaint,
      policy, contractual, or service deadline.
- [ ] Whether a period starts from death, registration, notification, issue,
      receipt, knowledge, grant, or another event.
- [ ] Whether weekends, holidays, extensions, discretion, late applications, or
      transitional rules alter a period.
- [ ] Whether a source date is a deadline, target, estimate, service standard,
      guidance period, or suggested follow-up.
- [ ] Consequences of missing a date.
- [ ] Claims of emergency, immediacy, priority, or “must act now”.

No deadline may appear without exact source support and approved authoritative
context; AdminAvenger-generated chase dates are never source deadlines.

#### Organisation workflow and evidence

- [ ] That an organisation must be notified.
- [ ] That a named route, form, certificate, grant, original, certified copy,
      identity document, translation, or fee is required.
- [ ] That one notification reaches another organisation.
- [ ] That an account will be frozen, released, transferred, closed, written off,
      refunded, or paid.
- [ ] That a process is available online, by phone, by post, in person, or to a
      helper.
- [ ] That an organisation has received, acknowledged, accepted, rejected, or
      completed something.
- [ ] That an organisation’s policy is universal, legally required, or unchanged.

Organisation-specific claims require the organisation’s current official
material and must stay organisation-specific.

#### Outcome, completion, and prediction

- [ ] Guaranteed acceptance, timing, payment, refund, inheritance, closure, or
      response.
- [ ] Probability, case strength, success score, readiness score, or likely legal
      outcome.
- [ ] “Estate complete”, “probate complete”, “tax settled”, “all debts resolved”,
      “beneficiaries paid”, or equivalent.
- [ ] That no other asset, liability, beneficiary, authority issue, document, or
      task exists.
- [ ] That a practical checklist proves legal compliance.

These are always forbidden as AdminAvenger conclusions.

#### Jurisdiction and professional help

- [ ] Which jurisdiction governs.
- [ ] Whether a matter is cross-border.
- [ ] That a particular professional is required, suitable, independent,
      regulated for the task, affordable, available, or likely to help.
- [ ] That a named charity, service, regulator, ombudsman, court, or adviser will
      accept the matter.
- [ ] That legal aid, insurance, union, employer, or charity funding is available.

Research may support cautious signposting only after service-scope validation.

#### Privacy, security, and identity

- [ ] That the user is entitled to disclose, upload, copy, retain, share, or
      destroy another person’s information.
- [ ] That a document, contact route, email, website, or caller is genuine.
- [ ] That identity checks are sufficient or legally required.
- [ ] That a deceased person has or lacks a particular privacy/data right.
- [ ] That retaining data for a chosen period is legally required or safe.
- [ ] That downloaded/exported material is secure after leaving AdminAvenger.

Research must not create a pretext for collecting unnecessary sensitive data.

#### Automated action

- [ ] That AdminAvenger contacted, notified, applied, submitted, sent, paid,
      closed, transferred, reported, archived, or completed anything.
- [ ] That an AI classification or extracted fact authorises an action.
- [ ] That silence or inactivity is consent.

These claims remain forbidden regardless of evidence. Human confirmation does
not authorise AdminAvenger to perform an unimplemented or unapproved external
action.

## 7. Terminology requiring verification

Every term needs a jurisdiction-specific definition, authoritative source,
plain-English explanation, safe-use rule, and forbidden implication.

| Term or phrase | Verification needed | Unsafe assumption to avoid | Interim research-language only |
|---|---|---|---|
| estate | Legal and ordinary meanings; territorial differences | It means property/wealth only, or that a legal estate process is underway | practical admin after a death |
| personal representative | Definition, appointment/authority, territorial use | The user is one | person dealing with the paperwork |
| executor / executrix | Will-based terminology, authority, when status takes effect | A person named in a document can automatically act in every context | person described as executor in the source |
| administrator | Court/grant terminology and territorial use | An informal helper is an administrator | person described as administrator in the source |
| next of kin | Legal versus ordinary/service use | It gives inheritance or decision-making authority | relative/contact named by the user or source |
| probate | Legal, court-service, and ordinary meanings by jurisdiction | It is the universal UK name or always required | court/grant process to check |
| grant of representation | Included grant types and territorial use | It is synonymous with every court authority | grant wording shown in the source |
| letters of administration | Definition, variants, and effect | They are required whenever there is no will | document/process named by the source |
| confirmation | Scottish terminology and relationship to other terms | It is interchangeable with probate everywhere | jurisdiction-specific court process to verify |
| will / codicil | Definitions, execution/revocation, interpretation boundaries | A document labelled “will” is valid or latest | document described as a will/codicil |
| intestate / intestacy | Definition and applicable rules | AdminAvenger can determine who inherits | no will situation requiring qualified checking |
| beneficiary / legatee | Definition and source of status | A named person is entitled or payable now | person described in the source |
| dependant / claimant | Statutory and procedural meanings | Ordinary dependence proves a legal claim | person who may need specialist advice |
| domicile / residence / habitual residence | Distinct meanings and relevance | Current address decides jurisdiction or tax | location factors to ask a specialist about |
| asset / liability / estate debt / expense | Legal, accounting, and practical categories | A visible balance belongs to the estate or is payable | amount/document to organise and verify |
| joint ownership / survivorship | Forms and territorial consequences | Every joint asset passes automatically in the same way | joint ownership requiring specialist checking |
| inheritance tax / estate tax | Official terminology and territorial application | Any visible estate value proves tax due or not due | tax question for HMRC or a qualified adviser |
| death certificate | Exact document names, copies, interim variants, and use | One document/copy is accepted everywhere | certificate named by the source |
| medical certificate / coroner / procurator fiscal terms | Jurisdiction-specific terminology and process | Terms and processes are UK-wide equivalents | official process named by the source |
| Tell Us Once | Territorial/service scope and participating bodies | It is available everywhere or notifies every organisation | official notification service to verify |
| notify / report / submit / send | User action versus organisation receipt | Sending means receipt or acceptance | user says they sent/reported |
| acknowledged / accepted / closed | Evidential threshold for each status | One implies the next | exact status stated by the organisation |
| deadline / time limit / target / service standard | Legal and operational distinctions | Any date creates a user deadline | date/period shown in the source, role unverified |
| required / must / should / may | Legal force and source speaker | Guidance wording is law or product advice | exact modal wording from the source |
| practically complete | Product-only scope and emotional/legal safety | Probate, estate, tax, debt, beneficiary, or ownership completion | current practical tasks marked complete by the user |
| legal proof / certified / verified | Evidential meaning and issuer | An AdminAvenger export proves a fact | user-prepared organiser with source references |

## 8. Organisation-specific workflows

### 8.1 Workflow research model

For every organisation or service, research must map:

1. **Scope:** jurisdiction, customer/product/account type, and exclusions.
2. **Trigger:** what event or user request starts the official workflow.
3. **Who may engage:** source wording about callers, helpers, executors,
   administrators, representatives, or other people—without AdminAvenger deciding
   authority.
4. **Channels:** official online, phone, post, in-person, accessible, relay,
   interpreter, or representative routes.
5. **Security:** how the official source tells users to find a genuine route and
   what sensitive information it warns against sharing.
6. **Information/evidence:** exact requested items, originals/copies,
   certification, alternatives, return handling, and source provenance.
7. **Workflow states:** notified, evidence requested, user-confirmed sent,
   acknowledged, action needed, waiting, restricted, closed, payment pending, or
   another source-defined state.
8. **Timing:** source deadlines, estimates, service standards, and
   AdminAvenger-suggested chase dates kept separate.
9. **Money:** balances, fees, refunds, payments, tax, debt, or benefits displayed
   without deciding correctness or counting savings.
10. **Outcome limits:** what the source cannot establish and what still requires
    individual assessment.
11. **Exceptions/escalation:** disputes, vulnerability, fraud, safeguarding,
    overseas factors, insolvency, trusts, property, business interests, or court
    involvement.
12. **Complaints/help:** verified escalation and signposting scope.
13. **Change control:** policy owner, last update, version, and next-review
    trigger.

### 8.2 Workflow comparison rules

- Do not create a universal “bereavement process” by blending organisations.
- A provider’s own policy is authoritative only for that provider and version.
- Regulator rules and provider policy must be stored separately.
- User-confirmed workflow progress and source-observed organisation status must
  remain separate.
- “Sent” never means “received”; “received” never means “accepted”; “accepted”
  never means “completed”.
- An organisation workflow may inform a checklist, but not legal authority,
  entitlement, liability, ownership, or outcome.

### 8.3 Workflow output

Each researched workflow must produce:

- a source register;
- a jurisdiction/scope statement;
- a safe state-transition map;
- source-requested evidence table;
- channel and accessibility table;
- timing-role table;
- safe claims / forbidden claims matrix;
- uncertainty and cannot-know list;
- escalation/signposting triggers;
- change-monitoring owner and expiry date.

## 9. Safety wording requiring validation

### 9.1 Wording families to research and test

- How to describe a likely document without asserting authenticity.
- How to quote a legal/process term without adopting it as a product conclusion.
- How to separate “the document says”, “you told us”, “AdminAvenger suggests”,
  “official guidance says”, and “AdminAvenger cannot know”.
- How to describe possible urgency without inflating it.
- How to describe requested evidence without saying it is legally required.
- How to explain authority uncertainty without frightening or accusing the user.
- How to describe money, balances, debts, benefits, tax, and inheritance without
  implying correctness, ownership, liability, entitlement, or savings.
- How to offer specialist help without implying failure, certainty, or a
  mandatory paid service.
- How to describe practical completion without legal completion.
- How to explain local storage, export, archive, unlinking, and deletion.

### 9.2 Candidate wording validation criteria

- [ ] Plain English without removing a material limitation.
- [ ] Source, user, product, guidance, and cannot-know voices are distinct.
- [ ] Jurisdiction is stated or explicitly unknown.
- [ ] No forbidden individual conclusion is implied.
- [ ] No invented deadline, requirement, status, or consequence appears.
- [ ] No celebratory, adversarial, gamified, or urgency-inflating language.
- [ ] No assumption about relationship, grief, executor status, literacy, or
      digital confidence.
- [ ] Nothing implies that AdminAvenger sent, saved, linked, or completed an
      action.
- [ ] The safest action remains understandable at high stress and low attention.
- [ ] Screen-reader reading order preserves caveats before the action they limit.

### 9.3 Wording that requires authoritative validation

Future research must not approve words such as:

- must, required, legally required, entitled, eligible, liable, responsible;
- valid, invalid, accepted, rejected, complete, settled, final;
- executor, administrator, personal representative, next of kin;
- probate required/not required, tax due/no tax due, debt payable/not payable;
- deadline, late, urgent, immediately, within a named period;
- beneficiary, owner, inherited, passes automatically;
- official, verified, certified, secure, guaranteed;
- free, independent, regulated, specialist, suitable;

unless the exact proposition, jurisdiction, scope, source, and review status
support that use. Some conclusions remain forbidden regardless (§6).

## 10. Accessibility research

### 10.1 Standards and guidance questions

- Which current accessibility standards and public-sector guidance apply to the
  intended product and research outputs?
- What additional requirements arise for mobile reflow, zoom, keyboard, screen
  readers, voice control, switch access, colour/contrast, reduced motion, and
  cognitive accessibility?
- How should long legal/official wording and source quotations remain accessible
  without hiding safety-critical caveats?
- Which accessible alternatives are needed for diagrams, timelines, tables,
  badges, progress states, and downloaded packs?
- What accessible contact channels do researched organisations provide?
- How should fluctuating grief, fatigue, concentration, memory, motor ability,
  vision, hearing, language, and digital confidence affect task design?

### 10.2 Required accessibility evidence

- authoritative standards and normative criteria;
- current platform/user-agent expectations;
- expert accessibility review;
- testing with assistive technologies;
- research with disabled users and bereaved users, with ethical safeguards;
- issue severity, workaround, owner, and approval record.

### 10.3 Accessibility research outputs

- requirements matrix mapped to future screens and exports;
- keyboard/focus model;
- status and error announcement model;
- mobile/reflow and zoom acceptance matrix;
- plain-language and cognitive-load guidance;
- accessible source-quote and provenance pattern;
- accessible confirmation/deletion pattern;
- unresolved barriers and stop criteria.

Accessibility research must not be reduced to automated conformance checks.

## 11. Emotional safety research

### 11.1 Research questions

- Which terms do bereaved people find clear, respectful, alienating, legalistic,
  euphemistic, or distressing?
- When is “the person who died” preferable to a relationship or name?
- How should the product respond when the user does not want to provide a name,
  relationship, date, or jurisdiction?
- How should pauses, reminders, waiting, reopening, archive, and practical
  completion be described without pressure or judgement?
- Which forms of encouragement feel supportive versus celebratory or
  gamified?
- How much information is manageable at first view and after an error?
- How should upsetting source content, disputes, debt, fraud, safeguarding,
  family conflict, and uncertain authority be introduced?
- What opt-outs, breaks, content warnings, and return paths are useful without
  obstructing urgent source-stated information?
- How should research participation avoid coercion, retraumatisation, or
  collecting unnecessary personal stories?

### 11.2 Evidence and review

Future work should combine:

- specialist bereavement and trauma-informed guidance;
- ethics and safeguarding review;
- inclusive qualitative research with appropriate consent and support;
- accessibility research;
- content-design review;
- professional review of legally sensitive wording.

No user-research finding may override legal accuracy, privacy, source-grounding,
or human control.

### 11.3 Emotional-safety outputs

- approved terminology and phrases to avoid;
- progressive-disclosure and pacing principles;
- reminder/pause/archive/completion language;
- escalation-card tone rules;
- research-participant safety protocol;
- distress/safeguarding boundaries and stop rules;
- unresolved language risks requiring pilot review.

## 12. Privacy considerations

### 12.1 Research-data minimisation

The research plan must not require real personal estate documents, private
corpora, account details, certificates, wills, tax records, benefit records,
financial statements, family disputes, or other sensitive content.

Use:

- public authoritative material;
- synthetic examples;
- redacted public templates only where use is lawful and necessary;
- aggregated, consented user-research notes with no unnecessary identifiers.

### 12.2 Privacy questions for future research

- What is the minimum information needed for each proposed workflow?
- Which fields are optional, sensitive, or especially harmful if surfaced in
  navigation, exports, notifications, logs, or screenshots?
- What source/user authority is needed before sharing another person’s
  information?
- What retention, deletion, correction, export, and backup explanations are
  necessary for a local-first product?
- What privacy rights or duties differ after death and by jurisdiction?
- How should downloaded files, browser storage, shared devices, backups, and
  device loss be explained?
- How should source quotations avoid copying more sensitive content than needed?
- Which organisation channels ask for sensitive information, and what official
  anti-fraud warnings accompany them?

Do not answer these questions without authoritative privacy and legal review.

### 12.3 Privacy approval conditions

- data map and purpose for every field;
- collection-minimisation review;
- local-storage, export, backup, unlink, archive, and deletion boundary review;
- threat and shared-device review;
- accessible privacy copy;
- data-protection/legal review where needed;
- user-control and deletion tests specified before implementation;
- no telemetry, upload, training, or data sharing added by implication.

## 13. Unknowns

The following remain deliberately unknown until researched:

- applicable terminology and process in each jurisdiction;
- when any grant, court process, form, notification, tax step, or evidence item
  is required;
- who may act and what evidence of authority an organisation may accept;
- real statutory deadlines versus targets, estimates, or guidance periods;
- process differences caused by a will, intestacy, property, joint assets,
  trusts, business interests, foreign elements, insolvency, disputes, or missing
  people;
- organisation-specific bereavement workflows, channels, security warnings,
  response states, and accessibility;
- tax, benefits, pension, debt, funeral-cost, property, and mortgage effects;
- suitable official/professional/charity signposting;
- safe user-facing terminology across grief experiences and jurisdictions;
- minimum personal data and privacy implications;
- source update frequency and maintenance burden;
- whether any proposed Stage 1 family can be described safely enough for
  controlled implementation.

Unknown means **not available for a product claim**, not permission to use a
likely answer.

## 14. Open questions

### Research governance

1. Who is accountable for the research programme?
2. Which qualified reviewers are required for legal, tax, benefits, pensions,
   debt/insolvency, property, privacy, accessibility, and emotional safety?
3. What is the first jurisdictional scope, if any?
4. What minimum Tier 1–3 coverage is required before a topic can leave
   “researching” status?
5. What review interval and change triggers apply to each source family?
6. Where will approved source records, conflict logs, and superseded versions be
   stored without exposing sensitive material?

### Product boundary

7. Which researched outputs are general information versus questions/checklists
   only?
8. Which claims are too risky for AdminAvenger even with authoritative evidence?
9. What is the minimum safe signposting set?
10. How should the product ask for jurisdiction without implying it can determine
    the applicable law?
11. What evidence is needed to validate “Practical admin after a death” as the
    user-facing name?
12. Which organisation workflows are safe enough for a later controlled slice?

### Validation

13. What synthetic scenarios are needed to expose jurisdiction, authority,
    deadline, tax, debt, benefit, property, and cross-border errors?
14. How will reviewers verify that exact source wording was not broadened?
15. How will inaccessible, emotionally unsafe, or privacy-invasive research
    outputs be blocked?
16. What evidence is required before a research finding may change the product
    blueprint?

These are backlog questions; this framework does not answer them.

## 15. Research backlog

### 15.1 Backlog record

Each backlog item must contain:

- research ID and title;
- exact unanswered question;
- jurisdiction and excluded scope;
- risk class and product claim potentially affected;
- candidate authority and required evidence tier;
- dependencies;
- owner and qualified reviewer;
- status;
- expected output;
- conflict/unknown log;
- review and expiry dates;
- approval gate.

Allowed statuses:

`not_started` · `scoped` · `researching` · `conflict_found` ·
`awaiting_specialist_review` · `approved_for_specification` · `blocked` ·
`superseded`.

“Approved for specification” does not mean approved for implementation.

### 15.2 Priority waves

**Wave 0 — research controls**

- jurisdiction model;
- source/evidence register;
- terminology protocol;
- high-risk claim matrix;
- conflict and change-control process;
- research ethics, privacy, accessibility, and emotional-safety plans.

**Wave 1 — foundational legal/official boundaries**

- death registration;
- probate/confirmation and letters of administration;
- executors and administrators;
- wills;
- inheritance tax and HMRC;
- DWP/benefits boundary;
- estate debts/insolvency boundary.

**Wave 2 — organisation workflows**

- Tell Us Once;
- pensions;
- banks;
- insurers;
- utilities;
- telecom providers;
- council tax and local authorities;
- property and mortgages;
- funeral costs;
- digital accounts.

**Wave 3 — synthesis and validation**

- cross-jurisdiction comparison;
- safe wording and cannot-know library;
- signposting register;
- accessibility and emotional-safety validation;
- privacy/data map;
- source-change monitoring;
- evidence for a later specification decision.

Waves describe order, not permission to begin or publish.

### 15.3 Research-area dossiers

The “official authority to seek” entries below are candidate source classes to
verify. They are not researched findings.

#### 15.3.1 Death registration

- **Why research is required:** terminology, who may register, process, documents,
  timing, coroner/procurator-fiscal interactions, certificate types, fees, and
  territorial systems may differ and may carry serious consequences.
- **Official authority to seek:** applicable legislation; national registration
  authority; central/devolved government guidance; local registration service;
  official coroner or procurator-fiscal material where relevant.
- **Expected outputs:** jurisdiction map; terminology table; source-backed
  workflow; source-requested evidence table; timing-role table; escalation and
  cannot-know wording.
- **Unsupported assumptions:** one UK process; universal time limit; any relative
  may register; one certificate type; a medical document and death certificate
  are interchangeable; registration proves estate authority.
- **Questions to answer:** Who may register in each jurisdiction? Which official
  documents and alternatives are described? Which dates are legal limits versus
  service guidance? How do official investigations change the route? What can a
  helper do? Which accessible channels exist?

#### 15.3.2 Tell Us Once

- **Why research is required:** availability, territorial coverage,
  participating bodies, eligibility, reference codes, timing, data sharing, and
  what remains for the user may change.
- **Official authority to seek:** responsible government service guidance;
  participating department guidance; devolved/local authority material; privacy
  notices and accessibility statements.
- **Expected outputs:** availability matrix; participation/scope table; safe
  description; privacy/data-flow summary; cannot-know list; alternative-route
  signposting.
- **Unsupported assumptions:** UK-wide availability; automatic enrolment; every
  department or council is notified; private organisations are included; use is
  mandatory; a submission proves receipt or completion.
- **Questions to answer:** Where is the service available? Who may use it? Which
  bodies and services are included or excluded? What official reference or
  evidence is described? What does confirmation mean? What must still be done
  separately?

#### 15.3.3 Probate

- **Why research is required:** “probate” is jurisdiction-sensitive and may
  refer to different grants, courts, procedures, thresholds, exceptions, forms,
  fees, and authority.
- **Official authority to seek:** applicable legislation and court rules;
  official court/tribunal service; central/devolved government guidance; tax
  authority where the court process interacts with tax.
- **Expected outputs:** terminology/jurisdiction map; procedural source register;
  no-conclusion claim matrix; form/evidence map; deadline classification;
  specialist-escalation triggers.
- **Unsupported assumptions:** probate is always required; one threshold decides
  every case; a will removes the need; no will creates one universal route; the
  user may apply; a grant proves every ownership question.
- **Questions to answer:** What does the official system call each process? What
  circumstances do official sources say affect the route? Who may apply? What
  evidence and forms are described? Which timings are statutory? Which matters
  require legal interpretation?

#### 15.3.4 Letters of administration

- **Why research is required:** the term, variants, application route, authority,
  evidence, and relationship to wills/intestacy differ and are legally
  sensitive.
- **Official authority to seek:** applicable legislation and court rules;
  official court/probate service; official forms and guidance; qualified legal
  review.
- **Expected outputs:** verified definition by jurisdiction; source-backed
  process map; authority/cannot-know boundary; evidence and form table; safe
  source-quotation pattern.
- **Unsupported assumptions:** always required without a will; next of kin may
  automatically act; one document has the same name/effect everywhere; issue of
  a grant determines entitlement or ownership.
- **Questions to answer:** Which official grants use this term? In what
  circumstances may they be relevant? Who may apply and in what order? What
  evidence is described? What authority does the official source state? Which
  conclusions remain for a court or lawyer?

#### 15.3.5 Executors

- **Why research is required:** naming, acceptance/renunciation, powers, duties,
  timing, multiple executors, substitutes, and jurisdictional language are legal
  matters.
- **Official authority to seek:** legislation and court rules; official
  court/probate guidance; professional regulator/body guidance for risk
  identification; qualified legal review.
- **Expected outputs:** terminology and source-voice rules; authority boundary;
  questions/evidence checklist; multiple-executor and dispute escalation
  triggers; forbidden-claim matrix.
- **Unsupported assumptions:** a named executor has proven authority for every
  action; the user is an executor; one executor may act alone; executor status
  determines inheritance; AdminAvenger can assess duties or breach.
- **Questions to answer:** How do official sources describe executor status and
  authority? What choices/processes exist? How are multiple or unavailable
  executors handled? What evidence do organisations request? Which risks require
  legal advice?

#### 15.3.6 Administrators

- **Why research is required:** appointment, priority, powers, duties,
  restrictions, and terminology may differ from executors and across
  jurisdictions.
- **Official authority to seek:** legislation and court rules; official
  court/probate guidance and forms; qualified legal review.
- **Expected outputs:** verified terminology; appointment/process map;
  authority-versus-user-statement rules; evidence/questions checklist; dispute
  escalation.
- **Unsupported assumptions:** an informal organiser is an administrator; next of
  kin is automatically appointed; administrator and executor are interchangeable;
  a source request proves the user must obtain a grant.
- **Questions to answer:** How is an administrator defined/appointed? Who may
  apply? What official priority or notice rules exist? What evidence is issued?
  What may organisations require? Which issues are unsuitable for product
  guidance?

#### 15.3.7 Wills

- **Why research is required:** validity, execution, revocation, interpretation,
  storage, disclosure, missing/later documents, and territorial rules are
  legally complex and emotionally sensitive.
- **Official authority to seek:** legislation; court rules and official probate
  guidance; official will-search/storage services where applicable; legal
  professional regulators/bodies; qualified legal review.
- **Expected outputs:** terminology map; safe document-description rules;
  evidence-preservation checklist; cannot-know language; dispute/missing-will
  escalation triggers.
- **Unsupported assumptions:** a document is valid/latest; handwriting changes
  are effective; a copy has a particular status; named people inherit; a clause
  has an obvious meaning; no located will means intestacy.
- **Questions to answer:** Which official rules govern form and revocation? What
  official search/storage routes exist? How should copies or missing originals
  be described? Which facts may be extracted safely? Which questions require a
  lawyer or court?

#### 15.3.8 Inheritance tax

- **Why research is required:** liability, reporting, valuation, exemptions,
  reliefs, thresholds, domicile, payment, interest, forms, and interaction with a
  grant are high-risk and change over time.
- **Official authority to seek:** tax legislation and regulations; HMRC official
  guidance, manuals, forms, and updates; official court guidance where
  processes interact; qualified tax/legal review.
- **Expected outputs:** jurisdiction/time-scoped source register; terminology and
  form map; hard forbidden-conclusion matrix; source-backed questions/checklist;
  deadline and change-monitoring register.
- **Unsupported assumptions:** tax is due/not due from an estate value; a
  threshold is universal; property or gifts receive a named treatment; a form is
  required; figures can be calculated safely; tax is settled.
- **Questions to answer:** Which official rules determine reporting and payment
  routes? Which dates/valuations matter? Which forms and exceptions are current?
  What terminology is safe? What may be organised without calculation? When is
  specialist advice required?

#### 15.3.9 HMRC

- **Why research is required:** HMRC has multiple bereavement, estate, income-tax,
  inheritance-tax, repayment, correspondence, authority, and security workflows.
- **Official authority to seek:** HMRC official guidance, forms, manuals,
  privacy/security material, accessibility routes, and underlying tax
  legislation.
- **Expected outputs:** workflow-family map; official-channel register;
  reference/form glossary; source-requested evidence table; timing roles; tax
  boundary and escalation rules.
- **Unsupported assumptions:** one notification covers all taxes; Tell Us Once
  completes HMRC estate work; a letter is a bill; a tax code process applies to
  estate tax; visible figures are correct, owed, refundable, or final.
- **Questions to answer:** Which distinct HMRC workflows exist after a death?
  What can each notification route do? What evidence/authority is described?
  Which correspondence states actionable dates? How are accessibility and
  representative routes described? What must AdminAvenger never calculate?

#### 15.3.10 DWP

- **Why research is required:** notification, stopping payments, overpayments,
  arrears, bereavement-related payments, funeral support, capital/inheritance,
  reporting, and representative routes are benefits decisions and may change.
- **Official authority to seek:** social-security legislation/regulations; DWP
  official guidance and service material; official decision-maker guidance where
  authoritative; appeal/tribunal material where relevant.
- **Expected outputs:** workflow separation; benefit/support terminology;
  notification versus entitlement boundary; source-requested evidence table;
  hard forbidden-claim matrix; signposting research questions.
- **Unsupported assumptions:** eligibility, entitlement, amount, overpayment,
  reporting outcome, effect of inheritance, availability of funeral support, or
  that one notification resolves every award.
- **Questions to answer:** Which separate services/workflows are involved? Who may
  notify or claim? What official evidence and dates are described? What happens
  to payments according to official sources? What cannot be inferred from a
  letter? Which matters require benefits advice?

#### 15.3.11 Pensions

- **Why research is required:** state, workplace, personal, occupational,
  defined-benefit, defined-contribution, annuity, nomination, trustee-discretion,
  tax, and provider processes differ.
- **Official authority to seek:** pensions legislation; pensions regulator;
  pension ombudsman/adjudication material; official government pension guidance;
  scheme rules and provider bereavement policies; tax authority where relevant.
- **Expected outputs:** pension-type taxonomy; regulator/provider distinction;
  organisation workflow template; evidence and status map; tax/beneficiary
  cannot-know rules; specialist triggers.
- **Unsupported assumptions:** a nomination determines payment; funds are estate
  assets; a spouse/partner/child is entitled; tax treatment; payment amount or
  timing; all providers request the same evidence.
- **Questions to answer:** Which pension types require distinct research? What do
  regulators versus schemes decide? What evidence do providers describe? How are
  nominations and trustee decisions framed? Which timing or tax statements are
  authoritative? What signposting is safe?

#### 15.3.12 Banks

- **Why research is required:** notification, account restriction, joint
  accounts, balances, payments, direct debits, small-estate policies, documents,
  fraud, complaints, and provider thresholds vary.
- **Official authority to seek:** financial legislation/regulation; financial
  regulator; financial ombudsman; provider official bereavement policy;
  government/court guidance where authority is involved.
- **Expected outputs:** regulator-versus-provider matrix; provider workflow
  records; evidence/status vocabulary; joint-account and fraud escalation;
  complaint/signposting map.
- **Unsupported assumptions:** every account freezes/closes; joint funds pass a
  certain way; a provider threshold is law; a balance belongs to the estate;
  direct debits stop automatically; user authority; money will be released.
- **Questions to answer:** What do regulators require versus providers choose?
  Which account types differ? What status does each provider confirmation prove?
  What evidence/alternatives are described? How are vulnerable users and
  complaints handled? Which claims require legal advice?

#### 15.3.13 Insurers

- **Why research is required:** life, home, motor, travel, funeral, and other
  policies have different notification, cover, beneficiary, claim, evidence,
  premium, renewal, cancellation, and complaint rules.
- **Official authority to seek:** insurance legislation/regulation; financial
  regulator and ombudsman; policy terms; insurer official bereavement/claims
  guidance.
- **Expected outputs:** policy-type taxonomy; claim-versus-estate boundary;
  provider workflow records; source-evidence table; money/outcome safety rules;
  complaints map.
- **Unsupported assumptions:** cover exists; a claim is valid/payable; proceeds
  form part of the estate; a named person is entitled; premiums/covers stop;
  evidence guarantees acceptance.
- **Questions to answer:** Which policy types need separate treatment? Who may
  notify or claim? What do policy/provider sources request? Which decisions are
  discretionary or regulated? What time limits are stated and by whom? What
  complaint routes apply?

#### 15.3.14 Utilities

- **Why research is required:** energy and water account-holder changes, final
  bills, meter readings, credit/debt, occupancy, vulnerability, disconnection,
  provider processes, and regulatory protections differ.
- **Official authority to seek:** energy/water legislation; relevant regulators;
  official government/local guidance; provider bereavement policies; approved
  dispute-resolution/ombudsman material.
- **Expected outputs:** energy/water split; regulator/provider workflow;
  evidence/meter/billing checklist; debt and vulnerability boundaries;
  accessibility and complaints map.
- **Unsupported assumptions:** supply ends; debt transfers; credit is refundable
  to the user; a meter reading is legally required; final bill is correct; one
  provider process applies to all.
- **Questions to answer:** How do sectors and jurisdictions differ? What must
  providers do versus recommend? What evidence and readings are described? How
  are ongoing occupants handled? What protections/escalations exist? Which
  amounts remain display-only?

#### 15.3.15 Telecom providers

- **Why research is required:** mobile, broadband, landline, device finance,
  bundled services, account access, cancellation, transfer, charges, equipment,
  accessibility, and provider policies vary.
- **Official authority to seek:** communications legislation; communications
  regulator; approved dispute-resolution schemes; provider official bereavement
  policy and terms.
- **Expected outputs:** service-type taxonomy; regulator/provider distinction;
  cancellation/transfer workflow map; evidence and equipment checklist;
  charges/complaints boundaries.
- **Unsupported assumptions:** contracts end automatically; fees are waived;
  service can transfer; equipment ownership; user authority; one notification
  covers bundled/device agreements.
- **Questions to answer:** What regulatory rules apply? Which services/contracts
  need separate workflows? What do providers ask for? How are charges and
  equipment handled? Which accessibility routes exist? What can be prepared
  without recommending cancellation?

#### 15.3.16 Council tax

- **Why research is required:** liability, occupancy, discounts, exemptions,
  reductions, empty-property rules, notifications, billing, recovery, and
  devolved/local differences are high-risk.
- **Official authority to seek:** applicable local-government finance
  legislation; central/devolved government guidance; local authority official
  policy/forms; relevant tribunal/ombudsman material.
- **Expected outputs:** jurisdiction and local-policy separation; notification
  workflow; terminology/claim boundary; source-requested evidence table;
  benefits/reduction escalation.
- **Unsupported assumptions:** liability transfers or ends; a discount/exemption
  applies; a property is empty for legal purposes; the user owes a bill; one
  council policy is national.
- **Questions to answer:** Which national/devolved rules and local choices exist?
  Who may notify? What facts affect billing according to official sources? What
  evidence/forms are described? Which dates are real deadlines? What appeal/help
  routes apply?

#### 15.3.17 Local authorities

- **Why research is required:** registrars, Tell Us Once participation, council
  tax, housing, social care, public-health funerals, electoral services, permits,
  benefits, and local support have separate statutory and local workflows.
- **Official authority to seek:** applicable legislation; central/devolved
  government guidance; individual local authority official material; local
  government ombudsman/review bodies.
- **Expected outputs:** service inventory; statutory-versus-local-policy matrix;
  authority-specific workflow records; signposting/accessibility register;
  cannot-know boundaries.
- **Unsupported assumptions:** one notification updates all council services; all
  councils offer the same service; local guidance applies nationally; a council
  decides legal authority or inheritance.
- **Questions to answer:** Which council services may be relevant? Which are
  linked versus separate? What local discretion exists? What evidence/channels
  are described? How should the correct authority be identified? What complaints
  and accessible routes exist?

#### 15.3.18 Property

- **Why research is required:** title, ownership form, survivorship, occupation,
  tenancy, sale, transfer, valuation, land registration, trusts, foreign assets,
  and tax require legal/conveyancing expertise.
- **Official authority to seek:** property and succession legislation; land
  registration authority; court rules/guidance; tax authority; housing authority
  where relevant; qualified legal/conveyancing review.
- **Expected outputs:** strict product-forbidden matrix; document/evidence
  organiser; land-registry source map; escalation triggers; safe questions for a
  conveyancer/solicitor.
- **Unsupported assumptions:** who owns property; how joint ownership operates;
  property passes automatically; sale/transfer is permitted; a title record is
  complete; valuation/tax treatment.
- **Questions to answer:** Which jurisdiction and ownership facts matter? What
  official records/processes exist? What can be extracted without interpretation?
  Which evidence should be preserved? Which occupation/housing risks require
  urgent specialist help? What must never be automated?

#### 15.3.19 Mortgages

- **Why research is required:** secured debt, joint borrowers, payment
  arrangements, insurance, possession, affordability, lender policy, and
  regulatory duties can create serious housing and debt consequences.
- **Official authority to seek:** mortgage/financial regulation; financial
  regulator and ombudsman; lender official bereavement policy and mortgage terms;
  court/possession guidance; qualified debt/legal review.
- **Expected outputs:** lender/regulator workflow; source-requested evidence;
  payment/possession urgency classification; joint-borrower boundary; complaints
  and specialist escalation.
- **Unsupported assumptions:** debt transfers; payments stop; insurance clears
  the mortgage; the user must pay; repossession is imminent; a lender must offer
  a specific arrangement.
- **Questions to answer:** What duties and provider policies apply? Who may
  contact the lender? What evidence/status wording is used? Which source dates
  create urgent consequences? How are joint borrowers/occupiers treated? Which
  debt/housing services are appropriate?

#### 15.3.20 Funeral costs

- **Why research is required:** invoices, funeral plans, insurance, estate
  expenses, public support, public-health funerals, payment responsibility,
  pricing, contracts, and disputes involve multiple regimes.
- **Official authority to seek:** consumer and funeral-sector regulation;
  government/DWP funeral-support guidance; local-authority official guidance;
  financial regulator for plans/insurance; provider contracts; relevant
  ombudsman/adjudication.
- **Expected outputs:** cost-source taxonomy; invoice/plan/support workflow map;
  display-only money rules; entitlement/debt boundaries; dispute and signposting
  map.
- **Unsupported assumptions:** the user is liable; costs are payable from the
  estate; support is available; a plan covers the invoice; an amount is
  reasonable, recoverable, or saved.
- **Questions to answer:** Which cost and plan types differ? Who contracts or is
  billed? What official support routes exist and what may not be inferred? Which
  evidence is described? What regulatory/complaint routes apply? How should
  unaffordability be signposted safely?

#### 15.3.21 Estate debts

- **Why research is required:** validity, liability, secured/priority status,
  insolvency, creditor notices, limitation, joint debts, guarantees,
  overpayments, recovery, and distribution order are legally high-risk.
- **Official authority to seek:** succession/estate and insolvency legislation;
  court rules; official insolvency service; relevant financial/sector regulator;
  qualified insolvency/legal/debt review.
- **Expected outputs:** hard forbidden-conclusion matrix; creditor-document
  organiser; source status/evidence map; insolvency/dispute escalation triggers;
  safe signposting questions.
- **Unsupported assumptions:** a demanded debt is valid/payable; the user is
  liable; estate funds may be distributed; one creditor has priority; payment is
  safe; a debt is written off after death.
- **Questions to answer:** Which debt categories and jurisdictions require
  separate research? What official processes govern claims and insolvency? What
  evidence should be preserved? Which notices/dates matter? What may a user ask
  without admitting liability? When must product flow stop for specialist help?

#### 15.3.22 Digital accounts

- **Why research is required:** provider terms, memorialisation, deletion,
  content/data access, subscriptions, devices, digital assets, security,
  intellectual property, privacy, and international law vary widely.
- **Official authority to seek:** data-protection and digital legislation;
  information-rights regulator; government guidance where available; provider
  official deceased-user policy/terms; financial regulator for regulated digital
  assets/services; qualified legal review.
- **Expected outputs:** provider-specific workflow register; account-type
  taxonomy; privacy/security boundary; requested-evidence table; no-access/no-
  authority warnings; change-monitoring plan.
- **Unsupported assumptions:** the user may access credentials/content; account
  ownership transfers; provider policy is law; deletion removes every copy;
  subscriptions/assets are handled together; one country’s terms apply.
- **Questions to answer:** Which account/service types need separate treatment?
  What does each provider officially permit/request? Which privacy and property
  questions arise? How can genuine routes be identified safely? What happens to
  paid services or digital value? Which cases require legal advice?

## 16. Standard research output template

Every future research document must use the following structure.

### 16.1 Header

```text
Research ID:
Title:
Status:
Owner:
Qualified reviewer(s):
Product/safety reviewer:
Created:
Last reviewed:
Next review:
Jurisdiction:
Included scope:
Excluded scope:
Related product claim(s):
Related backlog item(s):
```

### 16.2 Exact research question

State one answerable question. Do not begin with a desired product answer.

```text
Question:
Why the product needs to know:
Risk if wrong:
What the product must do while unresolved:
```

### 16.3 Source record

Create one record per source:

```text
Source record ID:
Source title:
Issuing authority:
Evidence tier:
Official/primary status:
Document or page location:
Publication date:
Effective date:
Last-updated date:
Accessed date:
Version/archive reference:
Jurisdiction and territorial extent:
Audience and scope:
Exact wording:
Section/page/paragraph:
Plain-English summary:
Relevance to the research question:
Implementation implications (not approval):
Exceptions/limitations:
Referenced sources followed:
Conflicts with other records:
Unresolved questions:
Confidence:
Review status:
Reviewer and review date:
Next-review trigger:
```

Exact wording must be the shortest sufficient quotation, preserved accurately
and separated from the researcher’s summary.

### 16.4 Findings matrix

| Finding ID | Proposed factual statement | Jurisdiction/scope | Supporting source record(s) | Contrary/limiting evidence | Confidence | Safe for specification? | Reviewer |
|---|---|---|---|---|---|---|---|

No row may say “safe for specification” unless its claim is narrower than or
equal to the source wording and all material limitations are carried forward.

### 16.5 Claim-control record

```text
Potential product claim:
Claim class: evidence-gated / product-forbidden conclusion
Permitted use: fact / general guidance / question / checklist / signposting / none
Required label:
Required source provenance:
Required cannot-know wording:
Required escalation:
Forbidden implications:
Jurisdiction guard:
Expiry/change trigger:
Approval status:
```

### 16.6 Conflict log

| Conflict ID | Sources | Exact conflict | Possible scope/date explanation | Resolution needed from | Interim product treatment | Status |
|---|---|---|---|---|---|---|

### 16.7 Implementation implications

This section may identify:

- product wording to propose;
- fields/provenance a later specification may need;
- status or workflow distinctions;
- safety validation and cannot-know requirements;
- accessibility/privacy implications;
- synthetic test questions a later approved implementation specification should
  consider.

It must not prescribe or authorise code changes.

### 16.8 Unresolved questions

List every unresolved exception, source conflict, jurisdiction gap, user-context
dependency, or review dependency. Empty is not assumed; it must be confirmed by
the reviewer.

### 16.9 Confidence

- **High:** current Tier 1–2 evidence is directly applicable, consistent, scoped,
  and reviewed by the required qualified reviewer. High confidence still does
  not permit a product-forbidden conclusion.
- **Medium:** credible authority exists but interpretation, exception, workflow,
  jurisdiction, date, or corroboration remains incomplete.
- **Low:** only lower-tier, indirect, outdated, ambiguous, conflicting, or
  incomplete material is available.
- **Blocked:** material conflict, missing primary authority, missing qualified
  review, or unacceptable product risk prevents use.

### 16.10 Review status

`unreviewed` · `researcher_checked` · `qualified_review_required` ·
`qualified_reviewed` · `product_safety_reviewed` ·
`approved_for_specification` · `rejected` · `superseded`.

Only `approved_for_specification` permits a finding to be proposed in a later
product specification. It does not approve implementation or public use.

### 16.11 Change control

Record:

- source owner;
- expected review frequency;
- known change event (legislation, policy, form, threshold, regulator guidance,
  provider workflow, service availability);
- next review date;
- person responsible for rechecking;
- affected claims/specifications;
- action if the source disappears or changes.

## 17. Approval gates

### Gate 0 — Framework approval

Required before research begins:

- human approval of this framework;
- named research owner;
- permitted scope and first jurisdiction;
- privacy/ethics constraints;
- qualified-review plan;
- storage/versioning location that does not use private user material.

### Gate 1 — Question and source-plan approval

Required per research area:

- exact unanswered questions;
- included/excluded jurisdiction;
- claim risk class;
- evidence tiers required;
- candidate official authorities;
- dependencies and reviewers;
- stop conditions.

### Gate 2 — Evidence completeness

Required before synthesis:

- primary sources located and recorded;
- territorial/date scope confirmed;
- exact wording captured;
- exceptions and linked material checked;
- conflicts logged;
- lower-tier sources not substituted for missing authority.

### Gate 3 — Qualified review

Required according to topic:

- legal/probate/property review;
- tax review;
- benefits review;
- pensions review;
- debt/insolvency review;
- regulatory/sector review;
- privacy/data-protection review.

Researcher confidence cannot replace qualified review.

### Gate 4 — Product safety, wording, accessibility, and emotional-safety review

Required before a finding may enter a specification:

- claim-control record complete;
- forbidden conclusions excluded;
- source/user/product/guidance voices separated;
- cannot-know and escalation wording approved;
- accessibility implications reviewed;
- emotional-safety language reviewed;
- privacy/data-minimisation implications reviewed.

### Gate 5 — Approved-for-specification

Only reviewed findings may be proposed as updates to the Estate Administration
product specification. The specification must identify:

- exact approved research records;
- jurisdiction and date;
- safe and forbidden outputs;
- source-change/expiry handling;
- unresolved questions;
- separate implementation acceptance and stop criteria.

### Gate 6 — Separate implementation approval

Research and specification approval do not authorise implementation. A separate
explicit approval is required before changing code, tests, fixtures, schemas,
routes, services, components, storage, navigation, configuration, or public
scope.

### Gate 7 — Controlled validation or pilot

Requires:

- implemented behaviour passing the later approved specification;
- current source recheck;
- professional/safety/accessibility/privacy review;
- synthetic validation;
- explicit roadmap approval for any pilot;
- clear jurisdiction and participant safeguards.

### Gate 8 — Public use

Requires:

- authoritative research complete for every public claim and jurisdiction;
- no blocked conflict affecting the public workflow;
- current sources and change monitoring;
- passing safety/accessibility/privacy evidence;
- pilot evidence;
- explicit public-scope and roadmap approval.

### Universal stop conditions

Stop research-to-product progression if:

- jurisdiction is unclear;
- a primary source cannot be located;
- sources materially conflict;
- a source is outdated, withdrawn, or outside scope;
- qualified review is missing;
- the proposed output becomes individual legal, tax, benefits, debt, property,
  pensions, financial, or other regulated advice;
- the wording implies authority, entitlement, liability, ownership, deadline, or
  outcome beyond the evidence;
- privacy or participant-safety controls are inadequate;
- accessibility or emotional-safety risk remains material;
- implementation is proposed before the required separate approval;
- the work would change the current roadmap without explicit approval.

---

*End of framework. This document plans future research; it contains no completed
external research, verified estate-administration guidance, implementation
change, roadmap change, or public-use approval.*
