# Benefits Action Pack v1 — Product & Technical Plan

Status: draft for review (v1.1 — tightened per review feedback). Planning only —
nothing in this document has been implemented.

This plan follows AGENTS.md / GEMINI.md and the AdminAvenger engineering & writing
standard (Section references below point at that standard). It is scoped to the
benefits side of AdminAvenger only. It does not propose changes to parking, debt,
bailiff, TV licence, bank, or consumer engines, and it does not propose a second
front door — everything here still arrives through "Check a message."

---

## 1. Product positioning

**Recommended positioning:**

> "AdminAvenger turns stressful letters into a clear action pack. Scan it,
> understand it, save it, and know what to do next."

**Why this is not "another chatbot":**

A generic chatbot (ChatGPT, Claude, Grok, etc.) is a blank text box. For a benefits
letter, that means the user has to already know what to ask, has to re-explain
their situation from scratch every time, gets a wall of prose back, and has
nowhere for that answer to live once the tab closes. Nothing persists. Nothing
tracks a deadline. Nothing remembers what evidence they already showed it
yesterday.

AdminAvenger's advantage is not "a smarter answer" — general-purpose chatbots
will likely always be at least as fluent, and possibly more fluent, at raw prose.
The advantage is a **structured, persistent, benefits-shaped workflow** wrapped
around one deliberately narrow task: turn this specific letter into a pack the
user can act on, keep it, and come back to. Concretely, that means:

- A fixed, predictable **output shape** (the Benefits Action Pack, Section 3) —
  the user learns the shape once and every letter after that is faster to read,
  instead of a new wall of text each time.
- **Local-first handling** of a genuinely sensitive document category (DWP
  decisions, health assessments, financial hardship) — nothing leaves the
  browser, which a generic chatbot's "paste this letter" flow cannot promise.
- A **saved case that survives** the session — a chatbot conversation does not
  track "did I send the Mandatory Reconsideration yet."
- **Deadline and evidence tracking that a chat transcript cannot do** — a chat
  history is not a checklist, and nobody re-reads a 40-message thread to check
  what is still missing.
- **The same safety rules every time** — a chatbot's caution about "I can't give
  legal advice" varies message to message and model to model. AdminAvenger's
  boundaries (Section 7) are structural, not a suggestion the model might drop
  under a longer prompt.

This is a positioning bet, not a fluency bet. AdminAvenger should not try to
sound smarter than a general model. It should be *harder to lose track of*.

**The one-line version, kept front and centre through every later section:**
generic AI gives text; AdminAvenger gives a structured workflow that remembers
(expanded in Section 11).

---

## 2. User pain map

Problems people actually describe when they get a benefits letter (see Section 12
for the public-source research behind several of these):

- "I do not understand this letter." — the letter uses DWP/council jargon
  (assessment period, descriptors, LCWRA, taper rate) with no plain explanation.
- "I do not know the deadline." — or worse, do not realise there *is* one until
  it has nearly passed. Mandatory Reconsideration and appeal windows are
  routinely one month, and tribunal appeal windows run from the *Mandatory
  Reconsideration Notice* date, not the original decision date — an easy date to
  get wrong.
- "I do not know why my Universal Credit payment is lower this month." — a
  statement mixes standard allowance, elements, and several possible
  deductions (advance repayment, overpayment recovery, third-party deduction,
  sanction) into one final number with no per-line explanation.
- "I do not know what evidence matters." — especially for PIP/WCA: people
  describe their diagnosis when the assessment actually wants functional,
  day-to-day detail (can you do this safely, repeatedly, to an acceptable
  standard, in reasonable time, unaided).
- "I missed something but I had a good reason." — sanctions in particular turn
  on "good reason," which is not defined in legislation and depends on DWP's
  judgement of what was reasonable — most people do not know what counts, or
  that citing it explicitly matters.
- "DWP is asking for bank statements / review evidence and I do not know what
  counts, or what happens if I miss the deadline." — Universal Credit claim
  reviews commonly ask for 4 (sometimes up to 12) months of unaltered bank
  statements, ID, tenancy evidence, and household evidence, on a routinely short
  deadline (often ~14 days), and missing it is a common cause of a suspended
  claim.
- "I need a journal message but do not know what to write." — the UC online
  journal is the main channel for asking about deductions, reporting changes,
  and starting a Mandatory Reconsideration, but it is a blank box with no
  template.
- "I am scared of sanctions, overpayments, migration, or reviews." — the
  emotional weight of these letters (threat of reduced/stopped payment) is often
  disproportionate to how solvable the immediate next step actually is.
- "I got a migration notice and do not understand what happens if I miss the
  deadline, or what transitional protection even means." — missing the deadline
  (beyond a short grace period) stops the old benefit with no automatic
  replacement, and can forfeit transitional (top-up) protection.
- "My Council Tax Reduction doesn't match what I expected." — because CTR/CTS is
  locally run, the same circumstances produce different outcomes in different
  council areas, and nothing in a generic chatbot answer can look up the
  specific local scheme.
- "I have no money for food/heating/rent right now." — a genuine crisis, where
  the right response is fast, calm signposting, not an assessment.

**Additional pain points (added on review):**

- "I can't read this / fill this in the way the form expects." — **accessibility
  needs**: screen-reader users, people with dyslexia, low vision, or cognitive/
  learning disabilities can struggle with dense DWP form language regardless of
  how good the underlying advice is. Output copy and structure need to hold up
  for assistive technology, not just be readable in principle.
- "I don't really use computers / I don't have reliable data or a smartphone." —
  **digital exclusion**: benefits correspondence increasingly assumes online
  journal access, camera phones, and PDF handling; a meaningful slice of the
  people most affected by sanctions, deductions, and migration notices are the
  least equipped to deal with them digitally.
- "I'm helping my mum/son/client with their claim, not my own." — **carers and
  appointees** acting on someone else's behalf need the pack to be legible to a
  third party (whose claim is this, what stage, what's needed) without
  AdminAvenger ever assuming the person using the app is the claimant.
- "I don't know what half these words mean." — **jargon/language confusion**
  beyond the specific terms already named above (assessment period, LCWRA):
  acronyms compound across benefit areas (PIP vs ADP, ESA vs UC health element,
  MR vs SSCS1), and translated/non-native-English readers face this harder.
- "I lost the letter" / "the photo came out blurry and I'm not sure what it
  actually says." — **lost letters or unclear OCR**: the action pack must
  degrade gracefully (per AGENTS.md's graceful-degradation rule) when OCR
  confidence is low or key details (dates, amounts) are missing, not silently
  produce a confident-looking pack from partial/garbled text.
- "I thought I replied in my journal but I'm not sure it went through." —
  **missed or unclear journal messages**: a real and distinct problem from "I
  don't know what to write" — the pack should be honest that it cannot know
  whether a journal message was actually sent or seen (see `cannotKnow`
  requirements, Section 7).
- "Why is my housing element different to my rent?" — **rent/housing element
  confusion**: shortfalls from the benefit cap, bedroom tax (removal of the
  spare room subsidy), or Local Housing Allowance caps are a distinct and
  common confusion from deductions, worth its own evidence/explanation
  treatment rather than folding into the general UC statement engine.
- "What counts as proof for my childcare costs?" — **childcare-cost evidence**:
  a specific, high-friction UC evidence type (provider details, paid receipts,
  the 85% reimbursement rule) that is easy to get wrong and separate from the
  general "evidence needed" list.
- "I reported a change but I don't know what evidence they wanted, or whether
  it was enough." — **change-of-circumstances evidence** specifically (as
  distinct from knowing you must report a change at all, already covered
  above): what counts as adequate proof for each change type.
- "Would this even be different in my council?" — **local council variation**
  reinforced beyond Council Tax Reduction: Discretionary Housing
  Payment/Housing Payment eligibility, local welfare assistance schemes, and
  crisis/hardship funds all vary by local authority, and AdminAvenger cannot
  look up a specific council's current scheme from the letter text alone.

---

## 3. Benefits Action Pack model

### Fit with the existing architecture (important)

The repo already has almost all of the scaffolding this needs. **The
`BenefitsActionPack` shape in the task brief should not become a new,
parallel data structure.** It should be assembled *from* the existing
`DecisionResult` (`src/lib/decisionEngine/types.ts`) plus the existing
derivation layers, the same way `OpportunityCard` and `GuidedNextStep` already
are. Concretely:

| Brief's `BenefitsActionPack` field | Existing source |
|---|---|
| `packTitle` | `DecisionResult.title` |
| `benefitArea` | Derived from `DecisionResult.documentType` (already namespaced: `benefits_uc_statement`, `benefits_uc_sanction`, `benefits_uc_deductions`, `benefits_wca_lcwra`, `benefits_migration_notice`, `benefits_change_of_circumstances`, `council_tax_reduction`, `benefits_crisis_support`, plus the PIP-family types in `benefits.ts`) |
| `documentStage` | Derived from `DecisionResult.documentType` **plus module-specific stage metadata** — **not** from `strengthLabel` and **not** from `caseStrength`. See "`documentStage` vs `caseStrength`" immediately below — this was a mapping error in v1 of this plan and is corrected here. |
| `urgency` | Derived from `DecisionResult.caseStrength` (`urgent_get_advice` → `crisis`/`high`, etc.) — do **not** duplicate urgency logic; map it. `urgency` and `documentStage` are derived from two different source concepts (`caseStrength` vs `documentType`+stage metadata) and must stay on separate code paths. |
| `plainEnglishSummary` | `DecisionResult.plainEnglishSummary` |
| `keyDates` | New, structured version of `DecisionResult.deadlines` (currently plain strings) — see below |
| `moneyAffected` | New, structured version of `DecisionResult.amountMentioned` + `amountTreatment` — see below |
| `evidenceFound` | Derived from `DecisionResult.sourceFacts` |
| `evidenceMissing` | `DecisionResult.evidenceNeeded` |
| `questionsToAnswer` | `DecisionResult.questionsToAnswer` |
| `uncertainty` | `DecisionResult.uncertainty` |
| `cannotKnow` | `DecisionResult.cannotKnow` |
| `nextActions` | Should reuse `GuidedNextStep`/`NextStepAction` (`src/lib/guidedNextSteps.ts`), **not** a new `type` enum. That file already has `draft_message`, `evidence_checklist`, `answer_questions`, `deadline_checklist`, `official_link`, `uncertainty_list`, `cannot_know_list` — a near-exact match for the brief's `"draft" \| "checklist" \| "timeline" \| "evidence" \| "signpost" \| "question_flow"`. Add `"timeline"` as a new `NextStepAction` kind there instead of inventing a parallel action model. |

#### `documentStage` vs `caseStrength` — these are different concepts and must not be conflated

`documentStage` describes **what the letter is and where it sits in the DWP/
council process** — e.g. a sanction notice, a Mandatory Reconsideration, an
appeal. `caseStrength` describes **how urgent, strong, or cautious
AdminAvenger's read of the situation is** (`stronger_possible_ground`,
`possible_ground`, `weak_or_missing_evidence`, `not_enough_information`,
`urgent_get_advice`) — an assessment, not a description of the document. These
must never be derived from each other or treated as interchangeable:

- A **UC sanction notice** is a `documentStage`/`documentType` value — it stays
  "sanction notice" regardless of how urgent or strong the case looks.
- **Mandatory Reconsideration** and **appeal** are `documentStage` values (which
  point in the DWP process the letter belongs to), not case-strength values.
- **Crisis** is fundamentally an urgency/risk state, not a document stage in the
  same sense as the others — it is mapped from `caseStrength === "urgent_get_advice"`
  for `benefits_crisis_support`, and crisis-level correspondence can in
  principle arrive at any stage.
- `caseStrength` describes how urgent/strong/cautious the case is — it is not
  the document stage, and a strong-looking case can exist at an early stage
  (e.g. evidence prep) just as an urgent case can exist at a late one (e.g.
  appeal).
- `strengthLabel` (e.g. "Sanction - check the deadline and hardship options")
  is UI copy that already *mixes* stage and strength for a human reading a
  card. It is display text, not a source of truth, and must not be parsed
  back apart to derive `documentStage` or `urgency` programmatically — this is
  the specific mistake this revision corrects.

`documentStage` should instead be built from each module's own explicit stage
detection where one exists — e.g. `wcaLcwra.ts`'s internal `Stage` type
(`evidence_prep | assessment_report | decision | appeal`), or PIP's stage split
across `benefits_evidence_prep | benefits_assessment_report | benefits_decision
| benefits_appeal | benefits_review` in `benefits.ts` — with a small,
module-owned plain-English label per stage, computed independently of
whatever `caseStrength` that same result also carries.

**Recommendation:** `BenefitsActionPack` should be a *view/render type*, computed
from an existing `AdminCase` + its `DecisionResult`, in the same spirit as
`opportunityCards.ts` and `guidedCaseMode.ts` — a pure function, no new fields
on `AdminCase`, `AdminFinding`, or `DecisionResult` beyond the two additions
below.

### Two genuinely new pieces of data are needed

Everything above can be derived from what already exists, except two things
that are currently just `string[]` and need light structure to render as cards:

```ts
// New: a structured deadline, replacing plain strings in DecisionResult.deadlines
// for benefits engines only (other engines keep deadlines: string[] unchanged).
export type BenefitsKeyDate = {
  label: string;            // e.g. "Mandatory Reconsideration deadline"
  dateText?: string;        // e.g. "12 August 2026" - only when found in the text
  basis: "found_in_document" | "typical_time_limit" | "unknown";
  userMustCheck: true;      // always true - never rendered as a confirmed date
  note: string;             // e.g. "Usually one month from the decision date. Check the exact date on your letter."
};

// New: a structured money line, replacing DecisionResult.amountMentioned (a single string)
// for benefits engines where more than one figure matters (e.g. a UC statement).
// Display-only - see "Money safety" note directly below.
export type BenefitsMoneyLine = {
  label: string;             // e.g. "Overpayment recovery this month"
  amountText: string;        // e.g. "£58.20" - text, not a parsed number (money-safety: never do arithmetic AdminAvenger cannot verify)
  treatment: "amount_mentioned_only" | "amount_being_demanded" | "possible_refund_or_reduction" | "no_money_counted";
  note: string;              // e.g. "This is money DWP say is owed back, not money you have lost or saved."
};
```

**Money safety (tightened on review).** `BenefitsMoneyLine` is display-only. It
must not create, update, or imply confirmed, pending, or potential savings in
`impactLedger.ts`. Benefits money lines can only become saved/recovered money
through a later, explicit manual outcome-confirmation flow — and only if that
flow itself is built safely (the user explicitly confirms an official outcome;
nothing here computes, infers, or defaults to one). **No benefits amount
should ever be counted as money saved, recovered, owed, or won merely because
it appears in a letter.** A figure appearing in `moneyAffected` is a fact about
what the letter says, not a fact about what happened financially.

**Date safety (tightened on review).** `BenefitsKeyDate.userMustCheck` is
deliberately typed `true` (not `boolean`) — every benefits deadline card is a
*possible* deadline the user must confirm against their own letter, never a
system-confirmed date. This is a type-level guardrail matching Section 7's
"possible deadline cards" requirement, so a future edit cannot accidentally
render a deadline as confirmed without a compiler error. Concretely: **every
`BenefitsKeyDate` rendered to the user must display "check the exact date on
your letter" or equivalent wording** — this is a rendering requirement for
whatever component renders `BenefitsKeyDate`, not optional per-module copy, and
`BenefitsKeyDate.userMustCheck` must remain `true`. Deadline cards are possible
date cards to verify, never confirmed legal deadlines.

### Full `BenefitsActionPack` shape (adapted)

```ts
export type BenefitsArea =
  | "pip"
  | "universal_credit_statement"
  | "universal_credit_sanction"
  | "universal_credit_deductions"
  | "wca_lcwra"
  | "migration_notice"
  | "change_of_circumstances"
  | "council_tax_reduction"
  | "crisis"
  | "unknown";

export type BenefitsActionPack = {
  packTitle: string;
  benefitArea: BenefitsArea;
  documentStage: string;   // from documentType + module stage metadata - never from strengthLabel/caseStrength
  urgency: "low" | "medium" | "high" | "crisis"; // from caseStrength - a separate derivation from documentStage
  plainEnglishSummary: string;
  keyDates: BenefitsKeyDate[];
  moneyAffected: BenefitsMoneyLine[];
  evidenceFound: string[];
  evidenceMissing: string[];
  questionsToAnswer: string[];
  uncertainty: string[];
  cannotKnow: string[];
  nextActions: NextStepAction[]; // reuse src/lib/guidedNextSteps.ts, extended with a "timeline" kind
  safetyNotes: string[];         // pass through DecisionResult.safetyNotes unchanged
  // Not new state - a read-only view of the AdminCase fields that already exist:
  evidenceVault: EvidenceItem[]; // AdminCase.evidence, already exists
  timeline: CaseTimelineEvent[]; // AdminCase.timeline, already exists
};

export const buildBenefitsActionPack = (
  adminCase: AdminCase,
  decisionResult: DecisionResult,
): BenefitsActionPack => { /* pure derivation, like deriveOpportunityCard */ };
```

This keeps the "one shared pipeline" rule from AGENTS.md: Input → Classifier →
Decision Engine → Evidence Builder → Questions → Draft Message → Opportunity
Card → AdminFinding → AdminCase → existing save flow. The Benefits Action Pack
is a *renderer* that sits alongside `OpportunityCardPanel`, not a new branch of
that pipeline.

---

## 4. Killer feature proposals

Each of these is scoped to fit inside the existing decision-engine-per-module
architecture (`decision-engine-standard.md` Section 2: one engine, one file).
**Phase status per feature is noted inline — see Section 5 (MVP) and Section 6
(build order) for the authoritative phase assignment; several features
originally sketched as MVP have been moved to Phase 2 on review.**

### A. Benefits Letter Triage — MVP (Phase 1)

The front page of every Benefits Action Pack, before any of the deep-dive
features below. Answers, in this order: what is this letter, what stage is it
at, is it urgent, what should you check *today*. This is mostly a rendering
job over the existing `DecisionResult` fields (`title`, `plainEnglishSummary`)
plus the corrected `documentStage`/`urgency` derivation in Section 3 — the
"what to check today" line is new: a single derived sentence pulled from the
highest-priority item in `deadlines`/`evidenceNeeded`.

### B. UC Payment Detective — Phase 2 (moved out of MVP on review)

Extends `ucStatement.ts`, which already detects assessment period, standard
allowance, housing element, advance repayment, overpayment recovery, and
third-party deduction via regex. The "detective" framing is mostly a stronger
explanation layer: for each deduction type found, add a one-line plain-English
"why this might be happening" note (advance repayment → "you likely took an
advance when your claim started, and it's being paid back over time";
overpayment recovery → "DWP say you were paid too much at some point and are
recovering it now"), plus a **pre-filled journal message draft** asking DWP for
a full breakdown of a specific deduction line, referencing the exact
assessment period found. This is a new `draftMessage` variant in
`ucStatement.ts`, not a new engine. All draft wording must follow the
allowed/forbidden standard in Section 8.

Real pain point this addresses: 46% of UC households had at least one
deduction as of February 2026, and the interacting deduction types (advance,
overpayment, sanction, third-party) are exactly the kind of thing a single
final "payment this month" figure hides (see Section 12, source 1).

### C. PIP / WCA Evidence Mapper — Phase 2 (moved out of MVP on review)

`benefits.ts` (PIP) and `wcaLcwra.ts` already detect named activities/
descriptors and already surface the six reliability questions (safely,
repeatedly, acceptable standard, reasonable time, most days, prompting/
supervision/aids/help). The Evidence Mapper is a UI feature built on data that
already exists: for each detected activity, walk the user through the six
questions as a short structured form (not free text), and store the answers as
`sourceFacts`/evidence tied to that activity. This directly targets the real
pain point that most PIP/WCA claim material describes diagnosis, not function
— DWP's own tribunal-stage reversal pattern (Section 12, source 3) suggests a
lot of award-strength evidence already exists in claimants' hands but is not
framed the way the assessment reads it.

### D. Sanction Good Reason Builder — Phase 2 (moved out of MVP on review)

Extends `ucSanction.ts`. Currently the module explains the Mandatory
Reconsideration and hardship routes but does not walk the user through *why*
the requirement was missed. Add a short guided set of reason categories
(illness, caring emergency, transport failure, mental health, appointment
conflict, did not receive/see the notification) matching what challenge
guidance says DWP actually weighs (Section 12, source 2), each producing
tailored journal/Mandatory Reconsideration wording. Never assert the reason
*was* accepted — always "you have said X; here is wording that explains this
to DWP," per Section 7 and the draft-wording standard in Section 8. This is
also the feature at highest risk of drifting into outcome-guarantee language
(Section 7), so it should not ship without the wording standard applied
line-by-line.

### E. UC Review / Bank Statement Helper — Phase 2 (moved out of MVP on review)

New, small addition to `ucStatement.ts`, **or more likely its own module**,
`ucClaimReview.ts` — see the dedicated module note directly below. Detects
review/evidence-request wording ("claim review," "provide your bank
statements," "verify your details") and produces: a plain-English explanation
of what a claim review is and is not an accusation of wrongdoing by default,
an upload checklist (bank statements — unedited, correct date range; ID;
tenancy evidence; household evidence), a prominent deadline card (reviews
commonly give ~14 days), and a draft journal question for when the request is
unclear about scope. This is one of the most concrete, well-documented pain
points found in research (Section 12, source 5) and currently has no dedicated
engine.

**Module note (added on review):** UC Claim Review / Bank Statement Helper
should probably begin as its own module, `ucClaimReview.ts`, if its classifier
patterns are materially different from UC statement parsing — which they
likely are, since a claim review is an evidence *request* about the claim as a
whole, not a payment breakdown. **Do not mix it into `ucStatement.ts` if doing
so risks routing claim-review evidence requests as if they were payment
statements** — the two need different `evidenceNeeded`/`nextActions` content
and, most importantly, different urgency framing (a review is about proving
continued eligibility under a deadline; a statement is informational). See
Section 9 (classifier regression plan) for the specific confusion pairs this
must be tested against before merging.

### F. Review Form Assistant — Phase 2 (moved out of MVP on review)

A stage-detection addition, not a new engine: PIP already distinguishes
`benefits_review` (AR1); WCA/LCWRA's internal stage detection could gain a
similar "review" stage. The distinguishing UX is a compact "what changed /
what stayed the same / what got worse" three-question structure feeding into
the same evidence checklist and deadline card pattern already used elsewhere.

### G. Crisis Support Path — Phase 2

`crisisSupport.ts` already exists and already does the right thing
structurally (pure signposting, empty `possibleGrounds`, explicit "cannot
guarantee any payment" safety note). Two updates are needed, not a rebuild:

1. **Terminology is now out of date.** From 1 April 2026, Discretionary
   Housing Payments in England were replaced by the "Housing Payment" strand of
   a new Crisis and Resilience Fund, which also absorbed the Household Support
   Fund (Section 12, source 8). The module's scheme list and copy should be
   updated to mention both the new and old (still commonly used) names,
   flagged as **needs verification against gov.uk before shipping** (see
   Section 10, source freshness checklist), since scheme names/administration
   can differ between England, Scotland, and Wales.
2. **Crisis should short-circuit UI, not just classification.** When
   `caseStrength === "urgent_get_advice"` and the document type is
   `benefits_crisis_support`, the Benefits Action Pack renderer should promote
   urgent wording and "what to do today" above the fold, ahead of any
   evidence/questions sections — the user in this state should not have to
   scroll past an evidence checklist to find help.

### H. Simple / Stress Mode — Phase 2 (moved out of MVP on review)

Does not exist yet anywhere in the repo (no toggle, no alternate copy path).
This is genuinely new work: a per-user setting (alongside the existing AI-mode
setting in `aiProviderSettings.ts`/Settings view) that, when on, renders the
Benefits Action Pack as three short, calm steps instead of the full pack —
e.g. "1. This is about a payment reduction called a sanction. 2. You may be
able to challenge it — check the date on your letter. 3. Tap here for a
message you can send." The full pack should always still be one tap away
("Show full detail"), never replaced outright.

**Safety invariant (tightened on review, and the reason this is not in MVP):**
Stress Mode must not hide deadlines, risks, uncertainty, `cannotKnow`, or
safety notes for crisis, deadline, sanction, migration, overpayment, or other
high-stakes cases. Stress Mode may simplify order and wording, but must not
remove required safety content. This is not a lesser/second version of the
safety-required content (Section 3 of the adminavenger standard: dropping or
hiding required fields is a regression, not a simplification) — stress mode
reorders and shortens *presentation*, it does not remove the underlying
uncertainty/`cannotKnow`/safety content, which must stay reachable and, for
the high-stakes cases listed above, visible without an extra tap.

### I. Evidence Vault — Phase 3

**Already exists at the data-model level.** `AdminCase.evidence: EvidenceItem[]`
and `EvidenceItem.source: "user_text" | "detected" | "manual"` are already in
`src/types.ts`. What's missing is: (a) a `"photo"` or `"ocr"` source variant
now that OCR/photo intake exists, so evidence can be tagged as coming from a
scanned document; (b) a benefits-specific "you have / still missing" view that
cross-references `evidenceFound`/`evidenceMissing` against the case's actual
`evidence[]` array, rather than only ever showing the DecisionResult's static
list. This is a rendering and small-schema-extension task, not a new storage
system.

### J. Case Timeline — Phase 3

**Also already exists.** `AdminCase.timeline: CaseTimelineEvent[]` and
`createTimelineEventForCase` in `caseFactory.ts` already exist. What's missing
is benefits-specific timeline *events* being written automatically at the
right moments (letter received/scanned, draft created, evidence added, user
marked "I sent this," status changed to waiting) — currently timeline events
are not obviously wired into the benefits flow specifically. This should reuse
the existing `AdminCaseStatus` enum (`drafted`, `sent_manually`, `waiting`,
etc.) that already exists in `src/types.ts`, not a new status model.

---

## 5. MVP slice (shrunk on review)

The MVP slice in v1 of this plan was too large — it bundled two "v1"s of
genuinely new features alongside a new UI panel and a new settings toggle.
**The MVP is now render/derivation work only**, over data and pipeline stages
that already exist end-to-end, with the lowest possible classifier and safety
risk:

1. **`buildBenefitsActionPack()`** — the pure derivation layer (Section 3),
   reusing `DecisionResult`, `OpportunityCard`, and `GuidedNextStep` as-is. No
   new classifier patterns, no new engines.
2. **`BenefitsKeyDate` and `BenefitsMoneyLine`** — the two new view types
   (Section 3), with the money-safety and date-safety invariants from Section
   3 applied from the first line of code, not retrofitted later.
3. **`BenefitsActionPackPanel`** — one new render component (alongside, not
   replacing, `OpportunityCardPanel`), showing, in this order:
   - what this is
   - what matters
   - possible dates to check (`BenefitsKeyDate` cards, each with "check the
     exact date on your letter")
   - money mentioned but not counted (`BenefitsMoneyLine` lines, each
     display-only per Section 3)
   - evidence found
   - evidence missing
   - questions to answer
   - uncertainty
   - what AdminAvenger cannot know
   - next safe step (one `NextStepAction`, reusing `guidedNextSteps.ts`)
4. **"Ask me the 3 missing things"** — a thin UI layer over
   `evidenceMissing`/`questionsToAnswer`, surfacing only the top 3
   highest-priority missing items. **This must render only after the required
   safety/date/uncertainty fields above are visible** — it is a convenience
   layer on top of the full pack, never a substitute that lets a user skip
   past dates, uncertainty, or `cannotKnow` content to get straight to "the 3
   things."

**Explicitly out of MVP, moved to Phase 2** (see Section 6): UC Payment
Detective v1, PIP/WCA Evidence Mapper v1, Simple/Stress Mode toggle, Sanction
Good Reason Builder, UC Review/Bank Statement Helper, and Review Form
Assistant. Also still out of MVP (unchanged from v1 of this plan, now Phase
2/3 — see Section 6): Crisis Support terminology update + UI promotion, and
the Evidence Vault/Case Timeline UI work.

This is a narrower MVP than the brief originally suggested. It intentionally
ships *only* the Benefits Action Pack renderer and its two new view types —
nothing that introduces a new classifier pattern, a new draft-wording surface,
or a new settings toggle. Everything in this MVP is testable purely by
checking that existing `DecisionResult` output renders correctly into the new
shape.

---

## 6. Build order

**Phase 1 — after OCR (MVP, see Section 5):**
- `BenefitsActionPack` type, `BenefitsKeyDate`, `BenefitsMoneyLine` + `buildBenefitsActionPack()` derivation.
- `BenefitsActionPackPanel` UI, in the fixed order given in Section 5.
- "Ask me the 3 missing things," gated behind the required safety/date/uncertainty content per Section 5.

**Phase 2 — stronger benefits workflows (includes everything moved out of MVP on review):**
- UC Payment Detective v1 (Feature B) — plain-English deduction explanations, then journal-draft wording once the Section 8 wording standard is applied.
- PIP/WCA Evidence Mapper v1 (Feature C) — the six reliability questions as a structured mini-form per detected activity, feeding `sourceFacts`.
- Simple/Stress Mode toggle (Feature H) — with the safety invariant from Section 4H enforced from the first version, not added after the fact.
- Sanction Good Reason Builder (Feature D) — highest wording risk in this phase; needs the Section 8 standard applied line-by-line before merge.
- UC Review / Bank Statement Helper (Feature E) — start as its own `ucClaimReview.ts` module unless detection logic is shown to overlap heavily with `ucStatement.ts` (see Feature E's module note and Section 9's classifier regression plan).
- Review Form Assistant (Feature F) — PIP AR1 stage refinement + equivalent WCA stage.
- Crisis Support terminology refresh (Housing Payment / Crisis and Resilience Fund) + urgent-first UI promotion (Feature G) — needs the Section 10 source-freshness checklist completed before the copy ships.
- Evidence checklist separation (found vs. missing, using the case's real `evidence[]` array) — can land in Phase 2 rather than Phase 1 since it depends on Evidence Vault wiring, not just the pack renderer.

**Phase 3 — stickiness / case management:**
- Evidence Vault UI (Feature I) — tag evidence to case, "you have / still missing" view, photo/OCR-sourced evidence tagging.
- Case Timeline UI (Feature J) — auto-logged events: received, drafted, evidence added, marked sent, waiting.
- Migration Notice deadline reminders surfaced more prominently (this is the
  single highest-consequence deadline type in the whole benefits set — missing
  it can end a benefit entirely).

**Phase 4 — optional research / pain radar:**
- A "what's changed recently" internal note (not a user-facing feature) for
  keeping decision-engine copy current as DWP/council rules change (e.g. the
  DHP → Housing Payment rename, deduction cap changes from 25% to 15% of
  standard allowance — Section 12, source 1). This should be a lightweight,
  manually-triggered research/maintenance task, not a live data feed (keeping
  with local-first/no-tracking principles) — AdminAvenger should not phone
  home to check for rule changes automatically. This is where the Section 10
  source-freshness checklist gets actively maintained over time.

This order is realistic in the sense that each phase only depends on the
phase before it, and Phase 1 items are all pure rendering/derivation work over
data that already exists end-to-end. **Remaining risk to flag explicitly:**
Phase 2's UC Review/Bank Statement Helper and Sanction Good Reason Builder
both involve new *classifier* patterns, which is higher-risk than pure
rendering work (a wrong classifier match routes a document to the wrong
engine entirely). Per Section 9, these need dedicated regression tests before
merging, not just at the end of Phase 2.

---

## 7. Safety and legal boundaries

These are not new rules — they restate AGENTS.md and the adminavenger standard
specifically as they apply to the benefits work in this document, so nothing
here can be built in a way that quietly loosens them:

- No legal, financial, medical, debt, or regulated benefits advice, ever —
  every benefits engine explains the *stage*, the *evidence*, and the
  *process*, never "you qualify," "you don't qualify," or a predicted award.
- No award or outcome guarantees. Never "you will win," "you will get this
  awarded," or any equivalent phrasing, in any new copy (Sanction Good Reason
  Builder and PIP/WCA Evidence Mapper are the two features most tempted to
  drift into this, because they are inherently about building a stronger
  case — wording must stay at "here is evidence/wording to consider," not "this
  will succeed"). See Section 8 for the specific allowed/forbidden wording
  standard this applies to every benefits draft.
- Never "you definitely qualify" or "DWP is definitely wrong" — every
  `FORBIDDEN_DECISION_PHRASES` check in `decision-engine-standard.md` /
  `types.ts` applies unchanged to every new module.
- No automatic messages, journal posts, or submissions. Every draft (journal
  message, Mandatory Reconsideration wording, evidence request) is
  copy-to-clipboard/review text only, exactly like every existing draft in
  `messageDrafts.ts` and `guidedNextSteps.ts`. The UC Payment Detective's
  journal draft and the Sanction Good Reason Builder's wording are drafts,
  full stop — AdminAvenger does not have journal/API access to DWP and must
  never imply it does.
- **No automatic money counting (tightened on review).** Deductions,
  overpayments, and possible refunds are never counted as savings or losses in
  the impact ledger (`impactLedger.ts`). `BenefitsMoneyLine` is display-only —
  it must not create, update, or imply confirmed, pending, or potential
  savings — and can only become a `confirmed_saved`/`confirmed_recovered`
  `ImpactEntry` through the existing manual outcome-confirmation flow, never
  automatically from a decision-engine read. **No benefits amount should be
  counted as money saved, recovered, owed, or won merely because it appears in
  a letter.**
- **Deadlines are "possible deadline cards," not confirmed dates (tightened on
  review).** `BenefitsKeyDate.userMustCheck` is fixed `true` at the type level
  (Section 3) specifically so this cannot regress silently. Every deadline
  card must render "check the exact date on your letter" (or equivalent
  wording) — this is a rendering requirement, not optional per-module copy.
  Deadline cards must always be shown as possible date cards to verify, never
  as confirmed legal deadlines.
- Crisis situations need urgent, human signposting, not just an assessment.
  `crisisSupport.ts`'s existing pattern (empty `possibleGrounds`, explicit "we
  cannot guarantee any payment" note, urgency-first copy) is the template for
  every new crisis-adjacent surface, including the Crisis Support Path UI
  promotion in Feature G.
- Scotland/Wales/Northern Ireland variance must stay explicit, not silently
  assumed to be England/Wales DWP rules. `benefits.ts` already does this for
  Adult Disability Payment vs. PIP; Council Tax Reduction already flags that it
  is locally run; any new module (migration notice extensions, UC review) must
  carry the same "this may not apply to your nation/council" caveat where
  relevant rather than assuming a single UK-wide rule.

---

## 8. Non-advice draft wording standard (new)

Every draft/journal-message/Mandatory-Reconsideration wording produced by any
benefits feature (Sanction Good Reason Builder, UC Payment Detective, UC
Review Helper, PIP/WCA Evidence Mapper, Review Form Assistant) must be
reviewed against this standard line-by-line before shipping. This is the
concrete, phrase-level version of Section 7's boundaries, specific to
benefits draft wording.

**Allowed wording (hedged, reviewable, non-committal about outcome):**

- "Please can you confirm…"
- "I would like this looked at again…"
- "From the letter, I understand…"
- "Please provide a breakdown…"
- "I am asking for clarification…"
- "I believe this may need checking because…"

**Forbidden wording (asserts an outcome, an entitlement, or a legal
conclusion AdminAvenger cannot know):**

- "You definitely qualify…"
- "DWP is definitely wrong…"
- "You will win…"
- "You are entitled to…"
- "This decision is unlawful…"
- "You do not owe this…"

Any draft-generation code path should be testable against both lists directly
(see Section 13's "no unsafe wording" test) — allowed phrasings are examples
of the tone to write toward, not an exhaustive whitelist; forbidden phrasings
(and close paraphrases of them) are the actual gate a test can check for.

---

## 9. Classifier regression plan (new)

Every new benefits module or stage added under this plan needs regression
tests that check it is not confused with its neighbours, in addition to
positive-detection tests for itself. The classifier (`classifier.ts`) already
orders benefits sub-classification by specificity (migration notice → UC
statement → UC sanction → UC deductions → change of circumstances → crisis
support → WCA/LCWRA → appeal → assessment report → review → decision →
fallback evidence-prep); every new pattern added to this list has the
potential to shift that ordering and silently misroute an existing case.

At minimum, add confusion-pair tests between:

- UC statement vs. UC deduction (a statement that *contains* a deduction line
  should still classify as a statement unless it is *only* about the
  deduction/overpayment).
- UC deduction vs. UC sanction (both can mention money being taken, but a
  sanction is about a missed requirement, not a debt).
- UC claim review / bank statement request vs. UC statement (a review asking
  for evidence must not be classified as a payment statement, and vice versa
  — this is the specific risk flagged in Feature E's module note).
- UC claim review vs. UC overpayment/deductions (a review can *lead to* an
  overpayment finding, but the request itself is not yet an overpayment
  notice).
- Migration notice vs. change of circumstances (both can mention "you must
  report/claim by," but a migration notice is about moving benefit systems
  entirely, not reporting a change within one).
- PIP decision vs. PIP review (AR1) — both share "decision"-adjacent language,
  but a review is prospective (how are things *now*) while a decision is
  retrospective (what was just decided).
- WCA / UC50 (evidence prep) vs. PIP evidence prep — these are different
  assessments (work capability vs. daily living/mobility) that share some
  vocabulary (assessment, descriptors, activities) and must not cross-route.
- Crisis support vs. any of the above — crisis wording (no food, no heating,
  eviction) should be able to co-occur with, for example, a sanction notice,
  and the classifier's existing "crisis checked before WCA/LCWRA" ordering
  needs an explicit test that a sanction-plus-crisis message still surfaces
  crisis urgency rather than being silently absorbed into the sanction path.

These tests belong in `src/lib/decisionEngine/__tests__/`, following the
existing pattern in `decisionEngineIntegration.test.ts`, and should be written
*before* or alongside each new module in Phase 2, not retrofitted afterward.

---

## 10. Source freshness checklist (new)

Every benefits module whose copy references a specific rule, figure, scheme
name, or time limit needs a maintained freshness record. **Current-rule claims
must not be shipped from this planning document alone** — this document's
Section 12 research is themed and dated to this research pass; it is not a
substitute for checking the live GOV.UK/HMCTS/council source at
implementation time.

For each module (or each rule/figure within a module), track:

- **Last verified date** — when a human last checked this claim against a
  primary source.
- **Source URL** — the specific GOV.UK/HMCTS/legislation.gov.uk/council page
  the claim was checked against (not a secondary aggregator).
- **Nation / local authority applicability** — England/Scotland/Wales/Northern
  Ireland, and for council-run schemes (Council Tax Reduction, Housing
  Payment/local welfare assistance), whether the copy is generic enough to be
  safe across councils or needs an explicit "this varies locally" caveat.
- **Whether the copy is safe to show user-facing** — i.e. it has been checked
  against the current rule, not carried over from this planning pass
  unverified.
- **Whether a rule or statistic is from an official source or a secondary
  source** — official (GOV.UK, HMCTS, legislation.gov.uk, a named charity's
  primary guidance such as Citizens Advice/CPAG/Turn2us/Shelter) vs. secondary/
  aggregator (SEO/explainer sites) — several figures gathered for Section 12
  of this document (notably the PIP Mandatory Reconsideration/tribunal
  percentages) came from secondary sources and are explicitly flagged
  needs-verification there.
- **Whether the module needs GOV.UK verification before shipping** — a simple
  yes/no gate; Feature G (Crisis Support terminology) and any figure carried
  over from Section 12 of this document should default to "yes" until
  checked.

This checklist should live as a maintained artefact once implementation
starts (e.g. a table in each module's test file or a shared tracking doc) —
this planning document only establishes that it must exist and what it must
cover.

---

## 11. How to beat generic AI

| | Generic AI (ChatGPT/Claude/Grok) | AdminAvenger |
|---|---|---|
| Input | Blank text box, re-explain every time | Scan/upload/paste, same shape every time |
| Output | Unstructured prose, different every time | Fixed Benefits Action Pack shape |
| Persistence | None (or account-level chat history, not case-shaped) | Saved case with status, evidence, timeline |
| Deadlines | Only if you ask, and only for that session | Deadline cards attached to the case |
| Evidence | You have to remember what you already gave it | Evidence vault shows have/missing per case |
| Drafts | One-off text in the chat | Saved draft, reviewable, never auto-sent |
| Safety wording | Varies by prompt, by model, by mood of that response | Structural — same rules on every module, enforced by shared types/tests |
| Privacy | Text sent to a third-party model provider | Local-first: text/photo/OCR stay in the browser |
| Follow-up | You have to remember to go back and ask "what's missing" | "Ask me the 3 missing things" is a standing feature of the pack |

**Generic AI gives text. AdminAvenger gives a structured workflow that
remembers.** Scan the letter, detect the stage, extract the dates, build the
evidence pack, create a draft, save the case, track the timeline, remind you
what's still missing — and the user stays in control of every send/submit
decision throughout (Section 4 of the adminavenger standard).

---

## 12. Implementation notes — files this connects to

Repo files inspected for this plan (current state, not proposed changes):

- `src/lib/decisionEngine/types.ts` — `DecisionResult`, `DecisionAmountTreatment`,
  `FORBIDDEN_DECISION_PHRASES`, `BENEFITS_SAFETY_NOTE`. The Benefits Action Pack
  must keep producing a full `DecisionResult` underneath it — it is a view on
  top, not a replacement.
- `src/lib/decisionEngine/classifier.ts` — `detectBenefitsDocumentType` and the
  benefits-family regex patterns. New stages (UC review, sanction good-reason
  categories) need new detection patterns here, following the existing
  most-specific-first ordering, and need the regression tests in Section 9.
- `src/lib/decisionEngine/modules/benefits.ts` (PIP), `ucStatement.ts`,
  `ucSanction.ts`, `ucDeductions.ts`, `wcaLcwra.ts`, `migrationNotice.ts`,
  `changeOfCircumstances.ts`, `councilTaxReduction.ts`, `crisisSupport.ts` — the
  nine existing benefits engines this plan extends. All already share the
  `DecisionResult` shape, `BENEFITS_SAFETY_NOTE`/`DECISION_SAFETY_NOTE`, and
  money-safety treatment. No new engine file should duplicate logic already in
  these. `ucClaimReview.ts` (Feature E) is the one likely new file, and only if
  its classifier patterns diverge enough from `ucStatement.ts` (Section 9).
- `src/lib/guidedNextSteps.ts` — `NextStepAction`, `GuidedNextStep`,
  `deriveGuidedNextStep`, `GUIDED_NEXT_STEP_SAFETY_NOTE`. This is the existing
  "next action" model the Benefits Action Pack's `nextActions` should reuse
  (add a `"timeline"` kind here rather than inventing a parallel action type).
- `src/lib/opportunityCards.ts` — `deriveOpportunityCard`, `formatMoneyImpact`,
  `describeConfidence`. Pattern to copy for `buildBenefitsActionPack` (pure
  function, `AdminCase` + friends in, view type out).
- `src/lib/guidedCaseMode.ts` — `getGuidedCaseMode`. Shows the existing
  "classify the case into a UI mode" pattern; a benefits-specific
  `documentStage`/`urgency` mapping should follow the same style, keeping the
  two derivations separate per Section 3.
- `src/lib/caseFactory.ts` — `createAdminCase`, `createTimelineEventForCase`.
  Case Timeline (Feature J) should call the existing
  `createTimelineEventForCase` at the right moments rather than writing a new
  timeline-event creator.
- `src/lib/impactLedger.ts` — `deriveImpactFromCase`, `calculateImpactTotals`,
  `ImpactTotals`. Confirms the existing potential/pending/confirmed money model
  that `BenefitsMoneyLine.treatment` must map onto, never bypass, and never
  write to directly (Section 7).
- `src/lib/storage.ts` — `saveAdminAvengerState`, `sanitizeStoredAdminAvengerState`,
  local-storage-only persistence. No new storage mechanism needed; Benefits
  Action Pack data is derived at render time from what's already saved.
- `src/types.ts` — `AdminCase` (already has `evidence: EvidenceItem[]` and
  `timeline: CaseTimelineEvent[]`), `OpportunityCard`, `EvidenceItem`,
  `CaseTimelineEvent`, `ImpactEntry`. Confirms Evidence Vault and Case Timeline
  already exist at the schema level (Section 4, Features I and J) and only need
  a `"photo"`/`"ocr"` `EvidenceItem.source` addition plus UI.
- `src/lib/photoIntake.ts`, `src/lib/photoOcr.ts` (added on the OCR branch) —
  OCR/photo intake path. Feeds the same "Check a message" pipeline as
  paste/file, so benefits letters scanned via camera flow directly into the
  same `classifyDecisionDocument` → benefits engine path with no separate
  branch needed. Low-confidence/garbled OCR output is the concrete case behind
  the new "lost letters or unclear OCR" pain point in Section 2 — the pack
  must degrade gracefully rather than presenting a confident-looking result
  from partial text.
- `src/services/analysisService.ts`, `src/lib/mockAnalysis.ts` — the existing
  entry point that turns raw text into `AdminFinding[]`/`AdminCase[]`. The
  Benefits Action Pack sits downstream of this, not inside it.
- Settings / AI mode (`src/lib/aiProviderSettings.ts`) — the existing pattern
  for a per-user toggle stored alongside other settings; Simple/Stress Mode
  (Feature H, now Phase 2) should follow this same pattern rather than a new
  settings mechanism.
- `src/components/SimpleResultPanel.tsx`, `src/components/OpportunityCardPanel.tsx`
  — existing result-rendering components; `BenefitsActionPackPanel` should sit
  alongside these, reusing `SimpleResultPanel`'s action-button conventions
  (primary/secondary/quiet emphasis) rather than inventing new button styling.

### Public-source research (themes, cited; treat exact statistics as
### needs-verification against the primary GOV.UK/HMCTS source before quoting
### them anywhere user-facing — see Section 10)

1. **Universal Credit deductions are extremely common.** Around 46% of UC
   households had at least one deduction in February 2026; the deduction cap
   was reduced from 25% to 15% of the standard allowance. Advance repayments
   are the single most common deduction type.
   [GOV.UK — Universal Credit deductions statistics](https://www.gov.uk/government/statistics/universal-credit-quarterly-statistics-29-april-2013-to-12-february-2026/universal-credit-deductions-statistics-march-2025-to-february-2026),
   [GOV.UK — Find out about money taken off your Universal Credit payment](https://www.gov.uk/guidance/find-out-about-money-taken-off-your-universal-credit-payment),
   [Policy in Practice — Hidden holes: deductions and sanctions](https://policyinpractice.co.uk/publication/hidden-holes-deductions-and-sanctions-for-people-on-universal-credit/).
2. **"Good reason" for a sanction is undefined in legislation** and turns on
   DWP's judgement of what was reasonable; commonly accepted reasons include
   illness, bereavement, a caring emergency, a conflicting job interview (with
   evidence), and transport failure. Mandatory Reconsideration requests are
   usually within one month, though DWP can accept late requests up to 13
   months with a good reason for the delay.
   [Citizens Advice — Arguments for challenging a sanction](https://www.citizensadvice.org.uk/benefits/universal-credit/sanctions/challenging-a-sanction/),
   [CPAG — Universal Credit and sanctions](https://cpag.org.uk/welfare-rights/key-topics/universal-credit/universal-credit-and-sanctions).
3. **PIP Mandatory Reconsideration success rates are reported as much lower
   than tribunal success rates** (widely reported as roughly 20–25% at MR vs.
   a majority winning at tribunal), and a majority of claimants who receive a
   negative MR are reported to not go on to appeal. These specific percentages
   came from secondary/aggregator sources in this research pass and **should
   be verified against official HMCTS Tribunal Statistics and GOV.UK PIP
   statistics before being used in any user-facing copy** (Section 10: this
   is a "secondary source, needs verification" entry, not an official-source
   one).
   [Citizens Advice — Challenging a PIP decision](https://www.citizensadvice.org.uk/) *(general reference — verify specific figures against HMCTS/GOV.UK directly)*.
4. **Missing a Universal Credit migration notice deadline stops the old
   benefit**, with a roughly one-month grace period to still claim and keep
   transitional protection; missing it entirely can forfeit that protection.
   [GOV.UK — Move to Universal Credit if you get a Migration Notice letter](https://www.gov.uk/guidance/move-to-universal-credit-if-you-get-a-migration-notice-letter),
   [Citizens Advice — Moving to Universal Credit if you've got a migration notice](https://www.citizensadvice.org.uk/benefits/universal-credit/moving-from-other-benefits/if-youve-got-a-migration-notice/),
   [MoneySavingExpert — Universal Credit migration notice letter](https://www.moneysavingexpert.com/family/managed-migration/).
5. **Universal Credit claim reviews commonly ask for several months of
   unaltered bank statements** plus ID, tenancy, and household evidence, often
   on a short (commonly ~14-day) deadline; missing the deadline is described as
   a common cause of claim suspension.
   [GOV.UK — If your Universal Credit is reviewed](https://www.gov.uk/universal-credit-reviews),
   [rightsnet — Universal Credit Claim Review Toolkit](https://www.rightsnet.org.uk/pdfs/July_2025_UCR_toolkit.pdf).
6. **Overpayment decisions can be challenged**, including asking DWP for "full
   written reasons" (which can extend the appeal window), requesting Mandatory
   Reconsideration through the journal, and in cases of official DWP error,
   asking for a reduced repayment rate or a hardship-based waiver.
   [Advicenow — Universal Credit overpayments](https://www.advicenow.org.uk/get-help/benefits/universal-credit-uc/universal-credit-overpayments),
   [Citizens Advice — Benefit overpayments](https://www.citizensadvice.org.uk/benefits/benefits-introduction/problems-with-benefits-and-tax-credits/benefit-overpayments/).
7. **Council Tax Reduction/Support genuinely varies by council** — each
   council runs its own local scheme (since national Council Tax Benefit ended
   in 2013), with different earnings disregards, minimum-payment rules, and
   whether the second-adult rebate still applies, so the same circumstances
   can produce different support in different areas.
   [House of Commons Library — Council Tax Reduction Schemes](https://commonslibrary.parliament.uk/research-briefings/sn06672/),
   [Citizens Advice — Check if you can pay less council tax](https://www.citizensadvice.org.uk/housing/council-tax/check-if-you-can-pay-less-council-tax/).
8. **Discretionary Housing Payments in England were replaced from 1 April 2026**
   by the "Housing Payment" strand of a new Crisis and Resilience Fund, which
   also absorbed the Household Support Fund — the application process and
   eligibility are described as similar to the old DHP scheme, but the naming
   has changed and both terms are likely to be in circulation for a while. This
   directly affects `crisisSupport.ts`'s copy (see Feature G) and should be
   verified against the current GOV.UK guidance before the copy is updated.
   [GOV.UK — Crisis and Resilience Fund guidance for local authorities](https://www.gov.uk/government/publications/crisis-and-resilience-fund-guidance-for-local-authorities-in-england-1-april-2026-to-31-march-2029/the-crisis-and-resilience-fund-guidance-for-local-authorities-in-england-1-april-2026-to-31-march-2029),
   [Shelter England — Discretionary housing payments](https://england.shelter.org.uk/professional_resources/legal/benefits/discretionary_housing_payments).
9. **UC50/WCA questionnaire guidance consistently stresses functional detail
   over diagnosis** — e.g. the specific difference between "reaching to head
   height" and "lifting an arm above the head" changes how an activity scores,
   which is exactly the kind of granular, easy-to-miss detail the PIP/WCA
   Evidence Mapper (Feature C) is designed to surface as guided questions
   rather than expecting the user to already know to mention it.
   [Turn2us — Work Capability Assessment: the questionnaire](https://www.turn2us.org.uk/get-support/information-for-your-situation/work-capability-assessment/the-questionnaire-wca50),
   [GOV.UK — UC50 form](https://www.gov.uk/government/publications/uc50-form-universal-credit-capability-for-work-questionnaire).

---

## 13. Tests to add later

None of these exist yet — they are proposed for when implementation begins,
following the existing test patterns in
`src/lib/decisionEngine/__tests__/benefits.test.ts`,
`benefitsRecoveryLayer.test.ts`, and `decisionEngineIntegration.test.ts`.

- **PIP action pack** — `buildBenefitsActionPack` on a PIP evidence-prep,
  decision, and appeal-stage sample each produce the right `benefitArea` and
  a `documentStage` that is independent of `caseStrength` (Section 3), plus
  non-empty `keyDates`/`evidenceMissing`, and never a forbidden phrase.
- **UC statement action pack** — deductions detected in `ucStatement.ts`
  produce `moneyAffected` lines with `treatment` never resolving to a
  saved/recovered state, and the assessment-period/standard-allowance/
  deduction figures round-trip into the pack unchanged.
- **Sanction good reason builder** — for each reason category, the generated
  wording never asserts the reason was accepted, always frames it as "you have
  said," always includes the Mandatory Reconsideration deadline caveat, and
  passes the Section 8 allowed/forbidden wording check.
- **UC review request** — bank-statement/evidence-review detection correctly
  distinguishes a review request from an overpayment/sanction/statement notice
  (Section 9's classifier regression plan), and the generated checklist never
  tells the user their evidence is sufficient.
- **Deadline cards** — every `BenefitsKeyDate` produced by any benefits engine
  has `userMustCheck === true`, a non-empty `note`, and renders "check the
  exact date on your letter" (or equivalent); a type test confirming this
  cannot compile if `userMustCheck` is ever loosened to `boolean`.
- **Money lines** — every `BenefitsMoneyLine` produced by any benefits engine
  never writes to or is read by `impactLedger.ts` directly, and its
  `treatment` is always one of the existing `DecisionAmountTreatment` values.
- **Classifier regression suite** — the specific confusion pairs listed in
  Section 9 (UC statement/deduction/sanction/claim review/overpayment,
  migration notice vs. change of circumstances, PIP decision vs. review,
  WCA/UC50 vs. PIP evidence prep, crisis vs. any of the above) each get an
  explicit "does not misroute" test.
- **Stress mode output** — stress-mode rendering always includes a visible
  path back to the full pack, and never omits `uncertainty`/`cannotKnow`/
  `safetyNotes`/deadline content for crisis, deadline, sanction, migration, or
  overpayment cases specifically (Section 4H), not just "in general."
- **Crisis path** — `crisisSupport.ts` output for an urgent input always has
  `caseStrength === "urgent_get_advice"`, always includes the "cannot guarantee
  any payment" note, and (once Feature G ships) the urgent path renders above
  any evidence/questions section in the pack.
- **Evidence vault** — a photo/OCR-sourced `EvidenceItem` round-trips through
  the pack's `evidenceFound`/`evidenceVault` view correctly tagged with its
  source.
- **No unsafe wording** — extend the existing `FORBIDDEN_DECISION_PHRASES`
  sweep (already used in `decisionEngine.test.ts`/`benefits.test.ts`) to run
  across every new module's full output, not just `possibleGrounds`, and add
  the Section 8 forbidden-phrase list as a second, benefits-draft-specific
  sweep.
- **No automatic send/contact/submit** — a repo-wide test (in the spirit of
  `adminAvengerSafety.test.ts`) asserting no new benefits copy contains
  send/submit/contact-on-your-behalf wording, matching the pattern already
  used for camera-flow and OCR copy safety tests in this codebase.
- **No automatic money counting** — every new `BenefitsMoneyLine`/decision
  result in the benefits family only ever reaches `confirmed_saved`/
  `confirmed_recovered` in `impactLedger.ts` via the existing manual
  outcome-confirmation flow, never directly from a decision-engine read, and
  never merely because an amount appears in a letter.
- **Source freshness** — a lightweight check (even just a documented manual
  process, per Section 10) that any module referencing a dated rule/statistic
  has a recorded last-verified date and source URL before shipping.

---

## What to build first (summary)

Start with the narrowed **Phase 1 / MVP** from Section 5: the pure
`buildBenefitsActionPack()` derivation function, the `BenefitsKeyDate`/
`BenefitsMoneyLine` view types with their safety invariants applied from day
one, the `BenefitsActionPackPanel` UI in its fixed order (what this is → what
matters → possible dates → money mentioned but not counted → evidence found →
evidence missing → questions to answer → uncertainty → cannot know → next safe
step), and "ask me the 3 missing things" gated behind that required content.

Everything else from the original brief — UC Payment Detective, PIP/WCA
Evidence Mapper, Simple/Stress Mode, Sanction Good Reason Builder, UC Review/
Bank Statement Helper, and Review Form Assistant — moves to **Phase 2**
(Section 6), specifically because each of them introduces either a new
classifier pattern (regression risk, Section 9), a new draft-wording surface
(wording risk, Section 8), or a new settings surface (Simple/Stress Mode) —
none of which belong in a first slice whose entire purpose is to prove the
render/derivation layer works safely over data that already exists.

**Remaining risks to track going into Phase 2** (not blockers to starting
Phase 1): the classifier confusion pairs in Section 9 are real and need tests
written alongside each new module, not after; the PIP MR/tribunal statistics
and the DHP → Housing Payment rename both need official-source verification
before any of their specific figures reach user-facing copy (Section 10); and
Sanction Good Reason Builder / UC Payment Detective's journal drafts are the
two surfaces most likely to accidentally drift into outcome-guarantee wording
during implementation, so the Section 8 standard should be part of their
code review checklist, not just this document.
