# AdminAvenger Non-Profit Transition Roadmap v1

Date: 2026-07-08
Status: internal strategy document. Docs-only. No code, test, or package changes.
Inputs: `docs/product/adminavenger-social-mission-v1.md`, `docs/product/adminavenger-department-workshop-v1.md` (Section 2.16 Business Model/Funding, Section 12 Risk Register), and cited external guidance (Section 15).

**This document is not legal, tax, or accountancy advice.** It is a planning aid to help Kristian have a well-informed first conversation with a solicitor, accountant, and/or CIC/charity adviser. Every structural or governance decision described here as "recommended" should be confirmed with a qualified professional before it is acted on. Where GOV.UK, Charity Commission, or sector-body guidance is cited, treat the citation as a pointer to the current official source, not a substitute for reading it directly — guidance changes.

---

## 1. Executive summary

**Is AdminAvenger aiming to be a non-profit, CIC, charity, or social enterprise?**

AdminAvenger is a social enterprise in substance already: a mission-driven product with a free, non-negotiable public-benefit core, deliberately restrained monetisation, and an explicit refusal to profit from vulnerable users. It is not yet any of these things in law — today it has no locked structure at all. The existing docs (social mission v1, department workshop v1 Section 2.16) already point toward a **CIC or a mission-locked Ltd**, not a charity, as the more likely long-term fit. This document treats that as a working hypothesis to test, not a decision to make now.

**Recommended near-term stance.**

Stay informal, but stop being unlocked. Adopt mission-locked operating principles and a public free-forever covenant inside the current company (or as a pre-incorporation commitment if no company exists yet) now, in writing, in the repo and on a public page. Do not incorporate a CIC, apply for charitable status, or restructure the company this quarter. Legal structure is a decision that should follow evidence (a pilot, a first grant target, a first organisational customer) — not precede it. Locking the mission in writing costs nothing and forecloses the worst outcome (an acquirer or future-you quietly monetising vulnerable users) without incurring the governance overhead of a formal restructure before there is anything to govern.

**What should be decided now vs later.**

Decide now: the free-forever covenant (Section 5), the mission-lock operating principles, and the shape of what can and cannot ever be monetised (Section 6). These are cheap, reversible-only-downward (i.e. you can always add more restrictions, never fewer, without breaking trust), and every future structure conversation is easier once they exist in writing.

Decide later, with professional advice: which legal wrapper (CIC limited by guarantee, CIC limited by shares, CIO, company limited by guarantee, or a mission-locked Ltd) to actually adopt; whether to become a charity at all; whether/when to appoint a board or advisory group with legal duties; and the detailed asset-lock and governance drafting. These decisions have real, hard-to-reverse consequences (a CIC cannot become a charity later without dissolving and re-forming; a charity cannot pay directors without special permission) and should not be made from a docs-only workshop.

---

## 2. Mission statement

AdminAvenger exists to help overwhelmed people understand official letters and prepare safe next steps.

- **Local-first.** A person's letter, its content, and the case built from it stay on their own device by default. Privacy is not a feature bolted on; it is the trust architecture the mission depends on.
- **AI prepares, humans decide.** AdminAvenger explains what a document appears to be, organises evidence, and prepares editable drafts. It never decides rights, entitlement, or outcomes, and it never acts (sends, submits, claims, pays) on a person's behalf.
- **Free core for individuals.** The complete individual loop — check a message, understand it, see key dates, prepare a draft, save a case, export it, delete it — is free forever for the people it exists to help. This is not an introductory offer; it is the mission.

This mission statement is drawn directly from `docs/product/adminavenger-social-mission-v1.md` and is restated here because it is the anchor every structural decision in this document is tested against.

---

## 3. Structure options

None of the descriptions below constitute legal advice. Costs, timelines, and rules change; verify current detail with Companies House, the CIC Regulator, or the Charity Commission before relying on any figure here.

### 3.1 CIC limited by guarantee

**What it is.** A company registered at Companies House and regulated by the Office of the Regulator of Community Interest Companies (CIC Regulator). It has no shareholders; members guarantee a nominal sum (often £1) instead of holding shares. It must pass the "community interest test" and carries a statutory asset lock preventing assets being used for private gain. ([GOV.UK: CIC guidance](https://www.gov.uk/government/publications/community-interest-companies-how-to-form-a-cic/community-interest-companies-guidance-chapters))

**Fit for AdminAvenger.** Strong. This is the structure the department workshop already leans toward (Section 2.16: "CIC (or Ltd with an entrenched mission lock/asset lock adopted early)"). It matches a product with no shareholders, a clear community-benefit purpose, and a plan to earn revenue from organisations while keeping the individual core free.

**Pros.** Statutory asset lock gives partners and funders a legally verifiable promise, not just a public statement. Faster and cheaper to set up than a charity. Retains normal company flexibility (can trade, can pay staff/directors at market rates, can take on organisational contracts) without shareholder profit pressure. Directly answers the R10 risk in the department workshop ("funding pressure pushes dark patterns or data monetisation").

**Risks.** The CIC Regulator's community interest test and annual CIC report add ongoing compliance the current informal setup does not have. Cannot access the widest range of charitable tax reliefs. Cannot later convert into a charity without dissolving and re-forming — the choice is not fully reversible.

**Funding impact.** Broadly compatible with grants aimed at social enterprises and digital-inclusion funders; not eligible for grants restricted to registered charities.

**Governance impact.** Requires directors, a community interest statement, and an annual CIC report to the Regulator. Modest compared to charity trusteeship, but real.

**When to choose it.** Once there is a real product, some pilot evidence, and either an incoming grant application or an organisational customer that wants to contract with a locked-mission entity — i.e. once the extra compliance buys something concrete.

**When not to choose it.** Before there is anything to lock. Incorporating a CIC around an idea with no pilot, no revenue, and no partner relationship converts founder time into paperwork for no immediate benefit.

### 3.2 CIC limited by shares

**What it is.** The same CIC Regulator regime as above, but with shareholders instead of guarantee members. Can pay a capped dividend (currently no more than 35% of profits) to shareholders, subject to the asset lock. ([GOV.UK: CIC guidance](https://www.gov.uk/government/publications/community-interest-companies-how-to-form-a-cic/community-interest-companies-guidance-chapters))

**Fit for AdminAvenger.** Weak, unless external equity investment becomes part of the plan. The current model (grants, organisational B2B2C revenue, no shareholder profit motive) does not need a share structure.

**Pros.** Allows outside investors to hold equity while the asset lock and dividend cap still protect the mission. Useful if impact investment is later sought.

**Risks.** Introduces shareholder interests into a product whose entire trust proposition rests on having none. Even a capped dividend can read, to advice-sector partners and vulnerable-user advocates, as "someone profits from this." Section 2.16 of the workshop explicitly flags that any monetisation resembling profit extraction from this user base is brand-fatal.

**Funding impact.** Opens impact-investment routes that guarantee CICs and charities cannot access; closes nothing that guarantee CICs would otherwise access.

**Governance impact.** Same CIC Regulator oversight as the guarantee form, plus shareholder governance.

**When to choose it.** Only if a specific, named investor relationship makes this necessary, and only with legal advice on how to keep the dividend cap and asset lock credible to partners.

**When not to choose it.** Now, and probably not ever unless the funding model changes fundamentally away from grants and organisational contracts.

### 3.3 Charitable Incorporated Organisation (CIO) / charity

**What it is.** A corporate structure registered solely with the Charity Commission (not Companies House), available once an organisation's purposes are exclusively charitable and for public benefit. Two models exist: "foundation" (trustees only) and "association" (wider voting membership). ([GOV.UK: charity structures](https://www.gov.uk/setting-up-charity/structures); [Charity Commission guidance via GOV.UK](https://www.gov.uk/guidance/how-to-set-up-a-charity-cio))

**Fit for AdminAvenger.** Possible but currently a stretch. Charitable status requires purposes that fall within the legally recognised list of charitable purposes and a public benefit test that the Charity Commission scrutinises closely (the search results above note the Commission asks detailed operational questions, e.g. who exactly is helped and how). AdminAvenger's mission ("reduce the burden of confusing life admin," explicitly not advice, not advocacy) sits adjacent to established charitable purposes (relief of those in need by reason of disability, financial hardship, or other disadvantage; advancement of citizenship or community development) but has not yet been tested against them.

**Pros.** Widest access to charitable tax reliefs (Gift Aid, business rates relief, some grant-only-for-charities funding pools). Strongest public trust signal for some (though not all) advice-sector partners, who work with charities daily. Single regulator (Charity Commission only), which the search results note is a lighter filing regime than a company-plus-Companies-House structure.

**Risks.** Cannot easily pay founders/directors market-rate salaries without specific charity law permissions and independent trustee approval — a real constraint if Kristian intends to draw a founder salary. Charity trustees carry personal legal duties and cannot personally benefit from the charity without documented, arm's-length authorisation. Cannot revert to a CIC or ordinary company without winding up. The public-benefit test is more demanding to satisfy convincingly for a product this new, with no track record.

**Funding impact.** Best access to charity-restricted grants and Gift Aid; worst access to anything resembling founder equity or commercial exit value (there is none — a charity's assets are permanently locked to charitable purpose).

**Governance impact.** Heaviest of all options here: a board of trustees with statutory duties, annual accounts filed with the Charity Commission, and conflict-of-interest management around any payment to the founder.

**When to choose it.** Only after a solicitor or charity-sector adviser confirms the purposes clear the legal charitable-purpose and public-benefit bar, and only once Kristian has decided whether continuing to be paid a market-rate salary matters more than charity status.

**When not to choose it.** Now. Also not as a first structure if the founder needs the flexibility to draw a normal salary without trustee-approval friction, or if there is any chance of a future pivot the charitable-purpose wording would not cover.

### 3.4 Company limited by guarantee (no CIC/charity status)

**What it is.** An ordinary company at Companies House with no shareholders (members guarantee a nominal sum), but with no CIC Regulator or Charity Commission oversight and no statutory asset lock.

**Fit for AdminAvenger.** Weak as an end state, reasonable as a placeholder. It signals "not-for-shareholder-profit" without any of the enforceable protections that make a CIC or charity credible to funders and partners.

**Pros.** Simple, cheap, familiar to any accountant. No dividend question because there are no shares.

**Risks.** The asset lock and mission lock exist only in the company's articles if someone deliberately drafts them in, and articles can be changed by the members later — there is no external regulator holding the line the way the CIC Regulator or Charity Commission do. Funders and partners may read this as a weaker commitment than a CIC.

**Funding impact.** Some grants specifically require CIC or charity status; this structure would fail those eligibility checks.

**Governance impact.** Light — ordinary Companies House filing only.

**When to choose it.** As an interim step if incorporation happens before the CIC-vs-charity question is resolved, provided the articles are drafted with mission-lock language from day one (with legal help) so converting to a CIC later is a formality, not a fight.

**When not to choose it.** As a permanent answer to "what structure protects the mission" — it doesn't, on its own.

### 3.5 Mission-locked Ltd

**What it is.** An ordinary private limited company (with or without shares) whose articles of association, shareholder agreement, or a separate constitutional document contractually commit it to mission-first behaviour — e.g. an entrenched objects clause, a contractual never-monetise covenant, or a "steward-ownership" style structure where founder shares carry restricted rights. This is not a distinct legal category with its own regulator; it is an ordinary company plus deliberate legal drafting.

**Fit for AdminAvenger.** Good as the "now" state. This is what Section 2.16 of the workshop calls "Ltd with an entrenched mission lock/asset lock adopted early" and lists as an acceptable alternative to a CIC.

**Pros.** Fastest to establish (can start today, even pre-incorporation, as a set of public commitments plus repo-level operating principles). Full commercial flexibility retained. Can be upgraded into a CIC later with less friction if the mission-lock language already mirrors CIC Regulator expectations.

**Risks.** The lock is only as strong as the drafting and as credible as it is made public and hard to quietly reverse. Without a regulator, enforcement relies on reputation, contracts with partners, and the founder's own discipline — which is precisely the risk the public covenant (Section 5) exists to reduce.

**Funding impact.** Neutral to slightly negative versus a CIC for social-enterprise-specific funders; broadly fine for general grants and organisational contracts that don't require CIC/charity status.

**Governance impact.** Minimal beyond normal company law, unless deliberately added (e.g. a voluntary advisory group, Section 7).

**When to choose it.** Now — as the starting posture, paired with the free-forever covenant.

**When not to choose it.** As the final answer if a grant, pilot, or partner later requires a CIC or charity specifically — treat it as a stepping stone, not the destination.

### 3.6 Informal open-source / community project for early stage

**What it is.** No incorporated entity at all — a personal project, openly documented, possibly with an open-source licence on parts of the code, operating under Kristian as a sole trader or simply as an individual maintaining a repo.

**Fit for AdminAvenger.** This is close to where the project sits today. It is a legitimate stage, not a failure to progress.

**Pros.** Zero incorporation cost or governance overhead. Maximum flexibility to change direction before any structure has to be unwound. Compatible with everything in Section 5 (a covenant can be published by an individual maintainer as easily as by a company).

**Risks.** No liability protection for Kristian personally. No entity to sign grant agreements, pilot data-sharing agreements, or organisational contracts — this becomes a real blocker the moment a local authority or housing association wants a signed partner agreement (Section 10, 60-day milestone: "partner conversation pack"). No asset lock at all, so the mission-lock protections in this document are purely reputational at this stage.

**Funding impact.** Blocks most grants and all organisational pilots that require contracting with a legal entity.

**Governance impact.** None, by definition.

**When to choose it.** Now, if no pilot or grant is imminent. This document does not recommend incorporating anything this quarter.

**When not to choose it.** The moment a named pilot partner, grant application, or paid organisational customer needs a contract counterparty — at that point some form of incorporation (most simply, the mission-locked Ltd of 3.5) becomes necessary regardless of the eventual CIC/charity decision.

---

## 4. Recommended path

**Now.** Write mission-locked operating principles into the repo (this document, the free-forever covenant in Section 5, and the forbidden-monetisation list in Section 6). No incorporation change required if none exists yet; if a company already exists, this is a statement of intent pending formal articles/constitution drafting later.

**Next.** Publish the covenant publicly (a trust page on the product itself), draft the legal documents a mission-locked Ltd or CIC would need (with a solicitor), and gather pilot evidence (Section 10) that will make any later structure application (CIC community interest statement, charity public-benefit case, or grant application) stronger because it is evidence-based rather than aspirational.

**Later.** Choose CIC, CIO/charity, or another structure with professional legal and accounting advice, informed by: what the first pilot partners actually required contractually, what the first serious grant target's eligibility rules require, and whether Kristian needs to draw a market-rate founder salary (which materially affects the charity option).

**Before grants.** Decide the legal structure. Many grant programmes have eligibility rules tied to legal form (CIC-only, charity-only, or "any not-for-profit" with evidence requirements) — see Section 8. Do not submit a grant application before the underlying entity exists and matches that programme's eligibility.

**Before organisation pilots.** Write partner/data/governance terms (Section 10, 60-day target: "partner conversation pack") even if the entity is still an informal mission-locked Ltd. A local authority, housing association, or advice charity will expect a written data-handling and governance position before agreeing a pilot, independent of what legal wrapper eventually gets chosen.

---

## 5. Free-forever covenant (draft)

The following is a draft public covenant. It should be reviewed by a solicitor before publication as a binding commitment (as opposed to a public statement of intent), particularly the "never" clauses, which should be checked for enforceability and for interaction with any future terms of service.

> **The AdminAvenger Free-Forever Covenant**
>
> AdminAvenger exists to help people understand confusing letters and prepare safe next steps. This is a promise about what will never change, no matter how AdminAvenger is funded, structured, or grown.
>
> - Any individual can check a letter for free, forever. This is not a trial. It is the mission.
> - Safety information is never paywalled. If it helps someone stay safe, it is free.
> - Deadlines and warnings are never paywalled. If a date or a risk matters, everyone sees it, without paying.
> - No advertising, ever.
> - We do not sell, rent, or share user data. We built this app to need as little of your data as possible in the first place.
> - No success fees. We never take a cut of any refund, benefit, compensation, or outcome.
> - No referrals to claims companies. We will never be paid to point you toward one, and we will never point you toward one for that reason.
> - No urgency upsells. We will never tell you that paying unlocks a safer or faster answer.
> - Nothing is sent, submitted, or claimed automatically. You always decide, and you always press send.
> - No dark patterns. No fake countdowns, no manufactured scarcity, no design that pressures you into a decision.
> - You can export your data and delete it, in full, at any time.
>
> This covenant applies to the free individual product, forever. Some features aimed at organisations — support workers, advice agencies, local authorities — may be paid (Section 6). Those paid features will never come at the cost of anything promised here.

This draft mirrors the "never monetise" list already agreed in the department workshop (Section 2.16) and the social mission's "What AdminAvenger Must Not Do" section, so it should not require new internal debate — only legal review of exact wording and a decision on where it is published (a dedicated trust page is the Section 10 30-day target).

---

## 6. What can be paid later

**Allowed possible paid routes** (organisations, not individuals):

- organisation seats — licensed access for support-worker or advice-agency staff
- support-worker workflows — multi-client case handling tools
- adviser pack workflows — the export/chronology product described in the department workshop (Section 2.13)
- training and support for organisations — onboarding, conformance documentation, SLAs
- self-hosting or white-label deployments for trusted organisations
- grants — public and philanthropic funding of the free core
- local authority or housing association pilot and deployment fees

**Forbidden monetisation**, restated from the social mission and department workshop and treated here as permanent, not just current-stage caution:

- selling or sharing user data, in any form
- advertising of any kind
- paywalling safety information
- paywalling deadlines or warnings
- success fees tied to any outcome, refund, or recovery
- "premium confidence" — charging for a more certain or more complete answer
- referral kickbacks from third parties (claims companies, lenders, insurers, or anyone else)
- claims-management-style fees
- outcome-based pricing on disputes or appeals

This list should be treated as a design constraint, not just a marketing promise: any future pricing page, feature flag, or paywall implementation should be checked against it before it ships.

---

## 7. Governance

Governance should scale with what actually exists, not be built out fully now. The department workshop already names most of these roles informally (Legal, Security, Support sections); this section proposes formalising ownership as the organisation grows, not creating a board today.

- **Mission lock.** The covenant (Section 5) and forbidden-monetisation list (Section 6), published and versioned, with any change requiring public changelog disclosure (see below). This is achievable immediately, without incorporation.
- **Asset lock consideration.** A statutory asset lock (CIC or charity) is stronger than a contractual one (mission-locked Ltd), but only becomes available once the corresponding structure is chosen (Section 3). Until then, treat the public covenant as the interim asset-lock equivalent — weaker legally, but real reputationally.
- **Board or advisory group.** Not needed at solo-founder stage. Becomes valuable once there is a pilot partner, a grant funder, or paid organisational customers who want evidence of oversight beyond one person. An informal advisory group (a support worker, an adviser, a privacy/security-minded technologist) is lower-commitment than a statutory board and is a reasonable "next" step (Section 10, 60-day horizon).
- **Safeguarding lead.** Named owner for crisis-content handling (the department workshop's Support section, R11) — this can be Kristian today, but should be named explicitly and written into the support playbook (already a 30-day target in the workshop) so it is not ambiguous under pressure.
- **Data/privacy owner.** Named owner for the threat model, data inventory, and any future DPIA (workshop Section 2.9) — again, can be Kristian now, but the role should be written down separately from "founder" so it survives a future hire.
- **Safety wording owner.** Named owner for the banned/required phrase register (workshop S1/S2) — ties directly into the copy discipline that keeps the "no advice" line defensible.
- **Partner review process.** A lightweight, written process for reviewing any new organisational pilot or data-sharing agreement against the covenant and the mission — needed by the time the first partner conversation pack exists (Section 10, 60-day target).
- **Annual public impact report.** Even a one-page version — people reached, what was measured, what didn't work — builds the evidence trail funders and the Section 13 CEO checklist will need, and it operationalises the "no dependency" and "measurement without surveillance" commitments already in the workshop's Data/Measurement section.
- **Public changelog for safety changes.** Any change to safety wording, the covenant, or the forbidden-monetisation list should be publicly logged. This is the mission-lock equivalent of a CIC's annual report to the Regulator, and it costs nothing to start now.

---

## 8. Funding roadmap

- **Grant pipeline.** Build a shortlist of funders whose eligibility and focus match AdminAvenger (digital inclusion, advice-sector capacity, poverty-focused foundations). The department workshop already names starting points: the GOV.UK Digital Inclusion Innovation Fund class of programmes and NCVO's guidance on funding digital and technology costs. **Verify current eligibility, deadlines, and whether the fund is even open before applying** — funding programmes open and close, and cited examples here may not be currently accepting applications. ([GOV.UK: Digital Inclusion Innovation Fund, example only](https://www.gov.uk/government/publications/digital-inclusion-innovation-fund/digital-inclusion-innovation-fund); [NCVO: funding digital and technology costs](https://www.ncvo.org.uk/help-and-guidance/digital-technology/funding-digital-and-technology-costs/))
- **Local authority pilot.** A named pilot with one council team (welfare rights, digital inclusion, or housing) is a credible first partner, matching the department workshop's Partnerships section.
- **Housing association pilot.** Housing associations often run their own welfare/money advice teams and have a direct interest in tenants understanding benefit and rent letters — a natural fit for the adviser-pack/support-worker workflow described in Section 6.
- **Charity/advice partner pilot.** Citizens Advice, StepChange, Shelter, and local advice networks (AdviceUK members) are named in the department workshop as natural signposting partners; a pilot with one of these (not a signposting relationship, but an actual "we prepared 5-10 clients for appointments" pilot) is the strongest evidence a funder or charity partner will want to see.
- **Digital inclusion / social tech funders.** Nominet, social-tech funders, and JRF-style poverty-focused foundations are named as fits in the workshop; treat all as examples to verify, not commitments.
- **Evidence needed before applying.** A completed pilot (even small: 5-10 clients) with measured outcomes; the four core legal/trust docs live (Terms, Privacy, Safety notice, Accessibility statement — already 90-day targets in the workshop); a chosen legal structure that matches the target fund's eligibility rules; and a one-page impact summary.
- **What metrics funders care about.** People reached; task completion / playback accuracy (does the user correctly understand what to do next); adviser or support-worker time saved per case; accessibility conformance; cost per supported case; signposting-to-advice conversion (a positive metric here, not a failure — see the workshop's Data/Measurement section). These are the same metrics the workshop's Data/Measurement department already proposed collecting for internal reasons; funders and internal evidence needs are the same evidence trail.

---

## 9. Product implications

A non-profit / mission-locked direction is not just a legal-entity decision — it should visibly shape the product, reinforcing rather than contradicting the covenant.

- **UI.** No paywall interstitials anywhere near safety content, deadlines, or warnings. Any future "organisation" surface (seats, adviser workflows) must be visually and structurally distinct from the individual free core, so a stressed individual user never sees pricing UI.
- **Wording.** Copy should never imply the product depends on future payment to keep working for individuals — no "free during beta," no "limited-time" framing anywhere in the free core.
- **Onboarding.** No forced account creation, no upsell prompts, no "unlock more" gamification — consistent with the existing social mission's ban on gamified wins.
- **Trust pages.** The covenant (Section 5) needs a dedicated, permanent, linked-from-everywhere trust page — already a named 30-day target in Section 10 below and echoed in the department workshop's Growth/Trust section ("where your letter goes" page).
- **Data storage.** Local-first storage stays the default regardless of legal structure; any future paid organisational tier (self-host/white-label) should extend, not weaken, the local-first default for individuals.
- **Exports.** Export and delete must remain free and unrestricted for individuals under any future pricing model — this is explicit in the covenant.
- **Case timeline.** Timeline/history features stay part of the free core; do not let "organisation" tooling quietly become the only place richer case management lives, or the free core degrades by omission.
- **Helper mode.** Any future "helping someone else" mode (carers, support workers) should be designed so that a free individual helping a family member is never funnelled toward a paid tier just because they are helping more than one person occasionally — the line between "individual helping family" and "professional multi-client tooling" needs a deliberate, documented threshold (see workshop Section 2.13/2.16 on B2B2C boundaries).
- **Adviser pack.** This is the clearest legitimate paid-adjacent surface (Section 6), but the underlying export data itself (chronology, facts, dates) must remain something an individual can generate for free even without a professional relationship — the paid layer is workflow and multi-client tooling, not the underlying facts.
- **Privacy.** No change to the existing local-first privacy posture is implied by any structure in Section 3; if anything, charity/CIC status raises public expectations of transparency (annual reports, public accounts) that should be treated as an opportunity to reinforce trust, not a new obligation to route around.
- **Avoiding dependency/harm.** All structures in Section 3 are compatible with the existing "capability transfer, not dependency" stance (workshop Section 2.10); the structure decision should never be allowed to introduce retention-driving features (streaks, engagement loops) to satisfy funder growth metrics — flag this explicitly in any funder relationship.

---

## 10. 30/60/90 day roadmap

**30 days**

- Public covenant draft (Section 5), reviewed informally, published as a trust page
- Trust/safety pages (ties to the existing 30-day roadmap in the department workshop: Terms, Privacy, Safety notice)
- Safety wording suite (already a workshop Week 1 target — this document adds no new work here, only notes that safety-wording integrity is part of what makes the covenant credible)
- Golden letter corpus (workshop Week 2 target; relevant here because pilot/grant evidence will lean on measured accuracy)
- First user sessions (workshop Week 1 baseline sessions; relevant here as the start of the evidence trail funders will want)

**60 days**

- Adviser export pack v1 (workshop Month 2 target; the clearest paid-adjacent product surface, Section 6)
- Partner conversation pack — a short, written pack for local authority / housing association / advice-agency conversations covering the mission, the covenant, data handling, and what a pilot would look like
- Structure comparison reviewed — take Section 3 of this document to a solicitor and/or a CIC/charity adviser and get a professional recommendation, informed by whatever pilot conversations have started
- Grant shortlist — a written list of 3-5 target funders with eligibility notes and a flag on which require which legal structure

**90 days**

- Choose likely legal structure — with professional advice, informed by pilot and grant-eligibility findings, not before
- Pilot plan — one named pilot (workshop Month 3 target: support-worker team or local advice agency, 5-10 clients)
- First partner/adviser feedback — from the adviser markup sessions already planned in the workshop's AI/Decision Systems and Partnerships sections
- Impact evidence pack — the first version of the annual public impact report described in Section 7, built from pilot data

---

## 11. Decision gates

- **When to stay informal.** Until there is a named pilot partner, a grant application ready to submit, or a paid organisational customer requiring a contract. Staying informal costs nothing and loses no optionality.
- **When to form a CIC.** Once a pilot or grant requires a contracting entity, and professional advice confirms the CIC route fits better than a charity for the reasons in Section 3.1 (retains commercial flexibility, faster to set up, compatible with a founder salary).
- **When charity/CIO becomes worth exploring.** If a specific charity-only funding stream is identified as materially important, or if a serious advice-sector partner states that charity status specifically (not just "not-for-profit" generally) is a precondition for their partnership — and only after confirming with a solicitor that the charitable-purpose and public-benefit tests are realistically satisfiable given the actual (not aspirational) activities.
- **When to avoid any legal restructure.** While the product, pipeline, or positioning is still changing significantly month to month (the department workshop's own "engine freeze" logic applies here too — don't lock a legal structure around a product that is still finding its shape), or when there is no pilot, grant, or partner need driving the decision.
- **What evidence is required before applying for grants.** A working, safety-tested product (Section 10's 30-day targets); a completed or in-progress pilot with real users; the core legal/trust docs live; a legal structure matching that specific fund's eligibility rules; and a one-page impact summary with honest, unembellished numbers (consistent with the money-safety rules already in the social mission doc — never inflate reach or impact figures, the same discipline that already governs never inflating savings or recovery figures for users).

---

## 12. Risk register

| # | Risk | Mitigation | Owner |
|---|------|------------|-------|
| R1 | The product drifts into giving advice under funder or partner pressure to show "impact" | Hold the preparation-vs-advice line (workshop Section 2.10) regardless of funder expectations; walk away from funding that requires it | Founder / Legal |
| R2 | Charging vulnerable users, even indirectly (e.g. a "family plan" that quietly becomes paid) | Free-forever covenant (Section 5) as a hard product constraint, checked before any pricing feature ships | Founder / Product |
| R3 | Mission drift as organisational revenue grows and individual users generate no revenue to point to | Annual public impact report; forbidden-monetisation list treated as immovable, not negotiable under revenue pressure | Founder |
| R4 | Data/privacy risk from any future organisational or cloud feature undermining the local-first promise | Any cloud/sync feature requires the DPIA-before-cloud rule already in the workshop's engineering standard, independent of legal structure | Security/Privacy owner |
| R5 | Grant dependency creates fragility if a small number of funders control survival | Diversify across grants, organisational contracts, and pilots rather than relying on one funding type | Founder |
| R6 | Governance burden outpaces what a solo founder or tiny team can sustain | Scale governance to actual need (Section 7) rather than adopting full board/trustee structures prematurely | Founder |
| R7 | Partner distrust if the advice sector perceives AdminAvenger as an AI-cowboy competitor | Never-publish-advice commitment, adviser markup sessions, transparency corpus (all already planned in the workshop's Partnerships section) | Partnerships |
| R8 | Wrong legal structure chosen too early, before evidence exists to inform the choice | Decision gates in Section 11; no structure decision before a pilot, grant, or partner need drives it | Founder / Legal |
| R9 | Founder burnout from carrying product, safety, legal, and funding decisions alone | Advisory group (Section 7) as an early, low-commitment step; be honest in the CEO checklist (Section 13) about what one person can sustain | Founder |
| R10 | Acquisition or ownership risk — a future buyer or investor pressures a pivot away from the covenant | Statutory asset lock (CIC or charity, once chosen) is the strongest protection; until then, the public covenant plus mission-locked articles are the best available deterrent | Founder / Legal |

---

## 13. CEO checklist

Questions Kristian can bring to each conversation. None of these should be answered from this document alone.

**To ask a solicitor**
- Given AdminAvenger's actual activities (not the aspiration), does a mission-locked Ltd, CIC, or charitable structure best protect against the risks in Section 12?
- What is the minimum viable mission-lock drafting for a Ltd company today, and how much of that would carry over if we later convert to a CIC?
- What personal liability exposure exists while operating informally, and does that change the "stay informal for now" recommendation in Section 4?
- What data-processing and consent terms does a pilot agreement with a local authority or housing association need, independent of the entity's legal form?

**To ask an accountant**
- What are the tax and founder-salary implications of each structure in Section 3, specifically whether Kristian can draw a normal market-rate salary under each?
- What ongoing filing and accounting burden does each structure add, in realistic time/cost terms for a very small organisation?

**To ask a CIC adviser**
- Does AdminAvenger's activity clearly pass the community interest test as currently practised, or does the current product need to demonstrate more before applying?
- What does the CIC Regulator's annual CIC report actually require in practice, and is that sustainable for a solo founder?

**To ask charities (e.g. Citizens Advice, StepChange, local advice networks)**
- Does your organisation require a specific legal structure (CIC, charity, or "any not-for-profit with evidence") before agreeing a pilot or data-sharing relationship?
- What would make you publicly criticise or distrust a tool like this — and does our current mission-lock/covenant approach address that?
- Would you be willing to name a specific adviser to review AdminAvenger's benefits-engine output before any pilot begins?

**To ask local authorities / housing associations**
- What contracting, data-protection, and governance requirements would a pilot with your team need from us before it could start?
- Who inside your organisation owns a budget for support-worker or welfare-team digital tools, and what evidence would they need to see first?

**To ask funders**
- Does this specific fund require a CIC, a registered charity, or is any locked-mission not-for-profit structure eligible?
- What evidence of impact do you require, and at what stage of pilot maturity do you typically fund (pre-pilot, post-pilot, or scaling only)?
- Is this fund currently open, and what is the realistic timeline from application to decision? (Verify directly — do not rely on this document's examples.)

**To ask users / support workers**
- Does the free-forever covenant, once published, actually change whether you trust or recommend the product?
- Would a support worker use this in front of a client today, and if not, what is missing?
- Does the name "AdminAvenger" help or hurt trust with the audience the mission is for? (Already flagged as an open question in the department workshop's Growth section.)

---

## 14. Actionable next prompts

Five follow-up Cowork/Codex prompts, each scoped to one deliverable and consistent with the docs-only, mission-locked posture of this document.

1. **Public covenant page.** "Using the draft covenant in Section 5 of docs/product/nonprofit-transition-roadmap-v1.md, write a public-facing trust/covenant page (docs or marketing copy, not app code) at reading age ~9 per the existing content-design standard in the department workshop. Keep every 'never' clause. Do not add anything not already listed in Section 5 or 6 of the roadmap without flagging it as new."
2. **Trust/safety page.** "Draft the 'where your letter goes' trust/safety page described in the department workshop's Growth section (2.15) and referenced in Section 9 of the nonprofit roadmap: explain local-first storage in plain language, include the airplane-mode 'prove it' framing, and link out to the covenant page. Docs/copy only, no app code changes."
3. **Adviser export pack spec.** "Write a detailed spec for the adviser export pack v1 described in the department workshop (Section 2.13) and Section 6/9 of the nonprofit roadmap: client-stated issue, document list, chronology, extracted facts with source snippets, deadlines table, questions — explicitly no assessment or caseStrength language. Spec only, no implementation."
4. **Grant pipeline doc.** "Build a grant pipeline document per Section 8 of the nonprofit roadmap: research and list 5 target funders (digital inclusion, advice-sector capacity, poverty-focused foundations), their current eligibility rules, legal-structure requirements, deadlines, and evidence requirements. Flag explicitly wherever a fund's status needs verifying before relying on it — do not treat any funder name in the roadmap as confirmed open."
5. **Partner pilot pack.** "Draft the partner conversation pack described in Section 10 (60-day target) of the nonprofit roadmap: a short written pack for local authority, housing association, or advice-agency conversations covering the mission, the covenant, data-handling posture, and what a pilot would look like. Docs only; flag any point that needs solicitor review before being shown to a real partner."

---

## 15. Sources and further reading

All links were reachable via web search on 2026-07-08. These are pointers to official or high-quality guidance, not a substitute for reading the current version directly — guidance and eligibility rules change.

**CIC Regulator / GOV.UK**
- Community Interest Companies Guidance (chapters): https://www.gov.uk/government/publications/community-interest-companies-how-to-form-a-cic/community-interest-companies-guidance-chapters
- Office of the Regulator of Community Interest Companies: https://www.gov.uk/government/organisations/office-of-the-regulator-of-community-interest-companies
- Community interest companies: forms and step-by-step guides: https://www.gov.uk/government/publications/community-interest-companies-forms-and-step-by-step-guides
- Setting up a social enterprise: https://www.gov.uk/set-up-a-social-enterprise

**Charity Commission / GOV.UK**
- Set up a charity: structures (including CIO): https://www.gov.uk/setting-up-charity/structures
- How to set up a charity (CIO guidance): https://www.gov.uk/guidance/how-to-set-up-a-charity-cio

**Sector guidance (NCVO / UnLtd / Social Enterprise UK)**
- NCVO, choosing your legal structure: https://ncvo.org.uk/help-and-guidance/setting-up/choosing-your-legal-structure/
- NCVO, understanding social enterprise: https://www.ncvo.org.uk/help-and-guidance/setting-up/understanding-social-enterprise/
- NCVO, funding digital and technology costs: https://www.ncvo.org.uk/help-and-guidance/digital-technology/funding-digital-and-technology-costs/
- UnLtd, determining the right legal structure for your social venture: https://unltd.org.uk/spaces/determining-the-right-legal-structure-for-your-social-venture/

**Funding examples (verify current eligibility before applying)**
- Digital Inclusion Innovation Fund (example programme class only): https://www.gov.uk/government/publications/digital-inclusion-innovation-fund/digital-inclusion-innovation-fund

**Internal sources**
- `docs/product/adminavenger-social-mission-v1.md`
- `docs/product/adminavenger-department-workshop-v1.md` (especially Section 2.16 Business Model/Funding, Section 2.13 Partnerships, Section 12 Risk Register)

**Gaps needing manual/professional verification.** No search here substitutes for a solicitor confirming AdminAvenger's specific activities against current charitable-purpose and public-benefit tests, or a CIC adviser confirming current community-interest-test practice. Grant eligibility rules and open/closed status must be checked directly with each funder at application time, not inferred from this document.

---

*End of non-profit transition roadmap v1.*
