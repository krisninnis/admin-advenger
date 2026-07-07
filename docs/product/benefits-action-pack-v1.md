# Benefits Action Pack v1 — Product & Technical Plan

Status: draft for review. Planning only — nothing in this document has been implemented.

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

---

## 2. User pain map

Problems people actually describe when they get a benefits letter (see Section 9
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
| `documentStage` | `DecisionResult.strengthLabel` (already stage-flavoured text, e.g. "Sanction - check the deadline and hardship options") or a new small stage label already implicit in each module's internal `Stage`/`documentType` |
| `urgency` | Derived from `DecisionResult.caseStrength` (`urgent_get_advice` → `crisis`/`high`, etc.) — do **not** duplicate urgency logic; map it |
| `plainEnglishSummary` | `DecisionResult.plainEnglishSummary` |
| `keyDates` | New, structured version of `DecisionResult.deadlines` (currently plain strings) — see below |
| `moneyAffected` | New, structured version of `DecisionResult.amountMentioned` + `amountTreatment` — see below |
| `evidenceFound` | Derived from `DecisionResult.sourceFacts` |
| `evidenceMissing` | `DecisionResult.evidenceNeeded` |
| `questionsToAnswer` | `DecisionResult.questionsToAnswer` |
| `uncertainty` | `DecisionResult.uncertainty` |
| `cannotKnow` | `DecisionResult.cannotKnow` |
| `nextActions` | Should reuse `GuidedNextStep`/`NextStepAction` (`src/lib/guidedNextSteps.ts`), **not** a new `type` enum. That file already has `draft_message`, `evidence_checklist`, `answer_questions`, `deadline_checklist`, `official_link`, `uncertainty_list`, `cannot_know_list` — a near-exact match for the brief's `"draft" \| "checklist" \| "timeline" \| "evidence" \| "signpost" \| "question_flow"`. Add `"timeline"` as a new `NextStepAction` kind there instead of inventing a parallel action model. |

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
export type BenefitsMoneyLine = {
  label: string;             // e.g. "Overpayment recovery this month"
  amountText: string;        // e.g. "£58.20" - text, not a parsed number (money-safety: never do arithmetic AdminAvenger cannot verify)
  treatment: "amount_mentioned_only" | "amount_being_demanded" | "possible_refund_or_reduction" | "no_money_counted";
  note: string;              // e.g. "This is money DWP say is owed back, not money you have lost or saved."
};
```

`BenefitsKeyDate.userMustCheck` is deliberately typed `true` (not `boolean`) —
every benefits deadline card is a *possible* deadline the user must confirm
against their own letter, never a system-confirmed date. This is a type-level
guardrail matching Section 5's "possible deadline cards" requirement, so a
future edit cannot accidentally render a deadline as confirmed without a
compiler error.

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
  documentStage: string;
  urgency: "low" | "medium" | "high" | "crisis";
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

### A. Benefits Letter Triage

The front page of every Benefits Action Pack, before any of the deep-dive
features below. Answers, in this order: what is this letter, what stage is it
at, is it urgent, what should you check *today*. This is mostly a rendering
job over the existing `DecisionResult` fields (`title`, `strengthLabel`,
`caseStrength`, `plainEnglishSummary`) — the "what to check today" line is new:
a single derived sentence pulled from the highest-priority item in
`deadlines`/`evidenceNeeded`.

### B. UC Payment Detective

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
`ucStatement.ts`, not a new engine.

Real pain point this addresses: 46% of UC households had at least one
deduction as of February 2026, and the interacting deduction types (advance,
overpayment, sanction, third-party) are exactly the kind of thing a single
final "payment this month" figure hides (see Section 9, source 1).

### C. PIP / WCA Evidence Mapper

`benefits.ts` (PIP) and `wcaLcwra.ts` already detect named activities/
descriptors and already surface the six reliability questions (safely,
repeatedly, acceptable standard, reasonable time, most days, prompting/
supervision/aids/help). The Evidence Mapper is a UI feature built on data that
already exists: for each detected activity, walk the user through the six
questions as a short structured form (not free text), and store the answers as
`sourceFacts`/evidence tied to that activity. This directly targets the real
pain point that most PIP/WCA claim material describes diagnosis, not function
— DWP's own tribunal-stage reversal rate (Section 9, source 3) suggests a lot
of award-strength evidence already exists in claimants' hands but is not
framed the way the assessment reads it.

### D. Sanction Good Reason Builder

Extends `ucSanction.ts`. Currently the module explains the Mandatory
Reconsideration and hardship routes but does not walk the user through *why*
the requirement was missed. Add a short guided set of reason categories
(illness, caring emergency, transport failure, mental health, appointment
conflict, did not receive/see the notification) matching what challenge
guidance says DWP actually weighs (Section 9, source 2), each producing
tailored journal/Mandatory Reconsideration wording. Never assert the reason
*was* accepted — always "you have said X; here is wording that explains this
to DWP," per Section 7.

### E. UC Review / Bank Statement Helper

New, small addition to `ucStatement.ts` or a new sibling module
`ucClaimReview.ts` (needs a decision on scope — see Section 6) that detects
review/evidence-request wording ("claim review," "provide your bank
statements," "verify your details") and produces: a plain-English explanation
of what a claim review is and is not an accusation of wrongdoing by default,
an upload checklist (bank statements — unedited, correct date range; ID;
tenancy evidence; household evidence), a prominent deadline card (reviews
commonly give ~14 days), and a draft journal question for when the request is
unclear about scope. This is one of the most concrete, well-documented pain
points found in research (Section 9, source 5) and currently has no dedicated
engine.

### F. Review Form Assistant

A stage-detection addition, not a new engine: PIP already distinguishes
`benefits_review` (AR1); WCA/LCWRA's internal stage detection could gain a
similar "review" stage. The distinguishing UX is a compact "what changed /
what stayed the same / what got worse" three-question structure feeding into
the same evidence checklist and deadline card pattern already used elsewhere.

### G. Crisis Support Path

`crisisSupport.ts` already exists and already does the right thing
structurally (pure signposting, empty `possibleGrounds`, explicit "cannot
guarantee any payment" safety note). Two updates are needed, not a rebuild:

1. **Terminology is now out of date.** From 1 April 2026, Discretionary
   Housing Payments in England were replaced by the "Housing Payment" strand of
   a new Crisis and Resilience Fund, which also absorbed the Household Support
   Fund (Section 9, source 8). The module's scheme list and copy should be
   updated to mention both the new and old (still commonly used) names,
   flagged as **needs verification against gov.uk before shipping**, since
   scheme names/administration can differ between England, Scotland, and
   Wales.
2. **Crisis should short-circuit UI, not just classification.** When
   `caseStrength === "urgent_get_advice"` and the document type is
   `benefits_crisis_support`, the Benefits Action Pack renderer should promote
   urgent wording and "what to do today" above the fold, ahead of any
   evidence/questions sections — the user in this state should not have to
   scroll past an evidence checklist to find help.

### H. Simple / Stress Mode

Does not exist yet anywhere in the repo (no toggle, no alternate copy path).
This is genuinely new work: a per-user setting (alongside the existing AI-mode
setting in `aiProviderSettings.ts`/Settings view) that, when on, renders the
Benefits Action Pack as three short, calm steps instead of the full pack —
e.g. "1. This is about a payment reduction called a sanction. 2. You may be
able to challenge it — check the date on your letter. 3. Tap here for a
message you can send." The full pack should always still be one tap away
("Show full detail"), never replaced outright, so nothing here becomes a
second/lesser version of the safety-required content (Section 3 of the
adminavenger standard: dropping/hiding required fields is a regression, not a
simplification) — stress mode reorders and shortens presentation, it does not
remove the underlying uncertainty/cannotKnow/safety content, which stays
reachable.

### I. Evidence Vault

**Already exists at the data-model level.** `AdminCase.evidence: EvidenceItem[]`
and `EvidenceItem.source: "user_text" | "detected" | "manual"` are already in
`src/types.ts`. What's missing is: (a) a `"photo"` or `"ocr"` source variant
now that OCR/photo intake exists, so evidence can be tagged as coming from a
scanned document; (b) a benefits-specific "you have / still missing" view that
cross-references `evidenceFound`/`evidenceMissing` against the case's actual
`evidence[]` array, rather than only ever showing the DecisionResult's static
list. This is a rendering and small-schema-extension task, not a new storage
system.

### J. Case Timeline

**Also already exists.** `AdminCase.timeline: CaseTimelineEvent[]` and
`createTimelineEventForCase` in `caseFactory.ts` already exist. What's missing
is benefits-specific timeline *events* being written automatically at the
right moments (letter received/scanned, draft created, evidence added, user
marked "I sent this," status changed to waiting) — currently timeline events
are not obviously wired into the benefits flow specifically. This should reuse
the existing `AdminCaseStatus` enum (`drafted`, `sent_manually`, `waiting`,
etc.) that already exists in `src/types.ts`, not a new status model.

---

## 5. MVP slice

Recommended smallest high-impact build **after OCR** (per the brief's
suggested MVP, refined against what already exists):

1. `buildBenefitsActionPack()` — the pure derivation function (Section 3),
   reusing `DecisionResult`, `OpportunityCard`, and `GuidedNextStep` as-is.
2. **`BenefitsActionPackPanel`** — one new render component (alongside, not
   replacing, `OpportunityCardPanel`) showing Triage + structured
   `BenefitsKeyDate` cards + structured `BenefitsMoneyLine` lines.
3. **"Ask me the 3 missing things"** — a thin UI layer over
   `evidenceMissing`/`questionsToAnswer` that surfaces only the top 3
   highest-priority missing items as a short, answerable list instead of one
   long undifferentiated list. Needs a priority order per benefit area (new,
   small: a static ranking table, not a model).
4. **UC Payment Detective v1** (Feature B) — plain-English deduction
   explanations, no journal-draft yet.
5. **PIP/WCA Evidence Mapper v1** (Feature C) — the six reliability questions
   as a structured mini-form per detected activity, feeding `sourceFacts`.
6. **Evidence checklist separation** — split the existing single
   `evidenceNeeded` list into "you likely already have this" vs. "you still
   need to get this," using the case's actual `evidence[]` array (Feature I,
   partial).
7. **Simple/stress mode toggle v1** — the reordering/shortening behaviour only,
   not a full rewrite of every module's copy (that can follow per benefit
   area).

**Explicitly out of MVP** (defer to Phase 2/3, see Section 6): Sanction Good
Reason Builder, UC Review/Bank Statement Helper, Review Form Assistant,
journal-message drafting beyond what already exists, Crisis Support terminology
update + UI promotion, and the Evidence Vault/Case Timeline UI work (the data
already exists, but wiring it in well is real design + engineering work and
should not be squeezed into the first slice).

**Is the brief's suggested MVP too big?** Yes, slightly, as written — it bundles
7 workstreams including two "v1"s of genuinely new features (Payment Detective,
Evidence Mapper) alongside a new UI panel and a new settings toggle. The list
above keeps the same 7 items but is explicit that items 4–5 are intentionally
shallow "v1"s (no journal drafting yet, no full descriptor coverage yet) so the
slice stays shippable.

---

## 6. Build order

**Phase 1 — after OCR:**
- `BenefitsActionPack` type + `buildBenefitsActionPack()` derivation.
- `BenefitsActionPackPanel` UI (Triage + key dates + money lines).
- "Ask me the 3 missing things."
- Evidence checklist separation (found vs. missing, using real `evidence[]`).

**Phase 2 — stronger benefits workflows:**
- UC Payment Detective (deduction explanations, then journal-draft wording).
- PIP/WCA Evidence Mapper (six-question mini-form).
- Sanction Good Reason Builder.
- UC Review / Bank Statement Helper (new module or `ucStatement.ts` extension
  — decide based on how much the detection logic actually overlaps once
  drafted; if it shares little with statement parsing, it should be its own
  file per the one-engine-per-file rule).
- Review Form Assistant (PIP AR1 stage refinement + equivalent WCA stage).
- Crisis Support terminology refresh (Housing Payment / Crisis and Resilience
  Fund) + urgent-first UI promotion.

**Phase 3 — stickiness / case management:**
- Simple/Stress mode (full rollout across benefit areas, not just MVP's
  reorder-only version).
- Evidence Vault UI (tag evidence to case, "you have / still missing" view,
  photo/OCR-sourced evidence tagging).
- Case Timeline UI (auto-logged events: received, drafted, evidence added,
  marked sent, waiting).
- Migration Notice deadline reminders surfaced more prominently (this is the
  single highest-consequence deadline type in the whole benefits set — missing
  it can end a benefit entirely).

**Phase 4 — optional research / pain radar:**
- A "what's changed recently" internal note (not a user-facing feature) for
  keeping decision-engine copy current as DWP/council rules change (e.g. the
  DHP → Housing Payment rename, deduction cap changes from 25% to 15% of
  standard allowance — Section 9, source 1). This should be a lightweight,
  manually-triggered research/maintenance task, not a live data feed (keeping
  with local-first/no-tracking principles) — AdminAvenger should not phone
  home to check for rule changes automatically.

This order is realistic in the sense that each phase only depends on the
phase before it, and Phase 1 items are all pure rendering/derivation work over
data that already exists end-to-end. The main risk to the order (see Section
6 continued in "What is risky" territory, flagged properly in the review
response rather than duplicated here) is that Phase 2's UC Review/Bank
Statement Helper and Sanction Good Reason Builder both involve new
*classifier* patterns, which is higher-risk than pure rendering work (a wrong
classifier match routes a document to the wrong engine entirely) and should
get real test coverage before merging, not just at the end.

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
  will succeed").
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
- No automatic money counting. Deductions, overpayments, and possible refunds
  are never counted as savings or losses in the impact ledger
  (`impactLedger.ts`) — `BenefitsMoneyLine.treatment` must always resolve to
  one of the existing `DecisionAmountTreatment` values, and a benefits money
  line can only become a `confirmed_saved`/`confirmed_recovered` `ImpactEntry`
  through the existing manual outcome-confirmation flow, never automatically
  from a decision-engine read.
- Deadlines are "possible deadline cards," not confirmed dates.
  `BenefitsKeyDate.userMustCheck` is fixed `true` at the type level (Section
  3) specifically so this cannot regress silently. Every deadline card must
  visibly say "check the exact date on your letter," matching the existing
  wording pattern already used in `ucSanction.ts`/`benefits.ts`
  (e.g. "check the exact date on the letter, not just the sanction start
  date").
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

## 8. How to beat generic AI

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

The one-line version for the doc's audience: **a generic AI gives you an
answer; AdminAvenger gives you a workflow that remembers.** Scan the letter,
detect the stage, extract the dates, build the evidence pack, create a draft,
save the case, track the timeline, remind you what's still missing — and the
user stays in control of every send/submit decision throughout (Section 4 of
the adminavenger standard).

---

## 9. Implementation notes — files this connects to

Repo files inspected for this plan (current state, not proposed changes):

- `src/lib/decisionEngine/types.ts` — `DecisionResult`, `DecisionAmountTreatment`,
  `FORBIDDEN_DECISION_PHRASES`, `BENEFITS_SAFETY_NOTE`. The Benefits Action Pack
  must keep producing a full `DecisionResult` underneath it — it is a view on
  top, not a replacement.
- `src/lib/decisionEngine/classifier.ts` — `detectBenefitsDocumentType` and the
  benefits-family regex patterns. New stages (UC review, sanction good-reason
  categories) need new detection patterns here, following the existing
  most-specific-first ordering.
- `src/lib/decisionEngine/modules/benefits.ts` (PIP), `ucStatement.ts`,
  `ucSanction.ts`, `ucDeductions.ts`, `wcaLcwra.ts`, `migrationNotice.ts`,
  `changeOfCircumstances.ts`, `councilTaxReduction.ts`, `crisisSupport.ts` — the
  nine existing benefits engines this plan extends. All already share the
  `DecisionResult` shape, `BENEFITS_SAFETY_NOTE`/`DECISION_SAFETY_NOTE`, and
  money-safety treatment. No new engine file should duplicate logic already in
  these.
- `src/lib/guidedNextSteps.ts` — `NextStepAction`, `GuidedNextStep`,
  `deriveGuidedNextStep`, `GUIDED_NEXT_STEP_SAFETY_NOTE`. This is the existing
  "next action" model the Benefits Action Pack's `nextActions` should reuse
  (add a `"timeline"` kind here rather than inventing a parallel action type).
- `src/lib/opportunityCards.ts` — `deriveOpportunityCard`, `formatMoneyImpact`,
  `describeConfidence`. Pattern to copy for `buildBenefitsActionPack` (pure
  function, `AdminCase` + friends in, view type out).
- `src/lib/guidedCaseMode.ts` — `getGuidedCaseMode`. Shows the existing
  "classify the case into a UI mode" pattern; a benefits-specific
  `documentStage`/`urgency` mapping should follow the same style.
- `src/lib/caseFactory.ts` — `createAdminCase`, `createTimelineEventForCase`.
  Case Timeline (Feature J) should call the existing
  `createTimelineEventForCase` at the right moments rather than writing a new
  timeline-event creator.
- `src/lib/impactLedger.ts` — `deriveImpactFromCase`, `calculateImpactTotals`,
  `ImpactTotals`. Confirms the existing potential/pending/confirmed money model
  that `BenefitsMoneyLine.treatment` must map onto, never bypass.
- `src/lib/storage.ts` — `saveAdminAvengerState`, `sanitizeStoredAdminAvengerState`,
  local-storage-only persistence. No new storage mechanism needed; Benefits
  Action Pack data is derived at render time from what's already saved.
- `src/types.ts` — `AdminCase` (already has `evidence: EvidenceItem[]` and
  `timeline: CaseTimelineEvent[]`), `OpportunityCard`, `EvidenceItem`,
  `CaseTimelineEvent`, `ImpactEntry`. Confirms Evidence Vault and Case Timeline
  already exist at the schema level (Section 4, Features I and J) and only need
  a `"photo"`/`"ocr"` `EvidenceItem.source` addition plus UI.
- `src/lib/photoIntake.ts`, `src/lib/photoOcr.ts` (added this branch) — OCR/photo
  intake path. Feeds the same "Check a message" pipeline as paste/file, so
  benefits letters scanned via camera flow directly into the same
  `classifyDecisionDocument` → benefits engine path with no separate branch
  needed.
- `src/services/analysisService.ts`, `src/lib/mockAnalysis.ts` — the existing
  entry point that turns raw text into `AdminFinding[]`/`AdminCase[]`. The
  Benefits Action Pack sits downstream of this, not inside it.
- Settings / AI mode (`src/lib/aiProviderSettings.ts`) — the existing pattern
  for a per-user toggle stored alongside other settings; Simple/Stress Mode
  (Feature H) should follow this same pattern rather than a new settings
  mechanism.
- `src/components/SimpleResultPanel.tsx`, `src/components/OpportunityCardPanel.tsx`
  — existing result-rendering components; `BenefitsActionPackPanel` should sit
  alongside these, reusing `SimpleResultPanel`'s action-button conventions
  (primary/secondary/quiet emphasis) rather than inventing new button styling.

### Public-source research (themes, cited; treat exact statistics as
### needs-verification against the primary GOV.UK/HMCTS source before quoting
### them anywhere user-facing)

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
   statistics before being used in any user-facing copy.**
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

## 10. Tests to add later

None of these exist yet — they are proposed for when implementation begins,
following the existing test patterns in
`src/lib/decisionEngine/__tests__/benefits.test.ts`,
`benefitsRecoveryLayer.test.ts`, and `decisionEngineIntegration.test.ts`.

- **PIP action pack** — `buildBenefitsActionPack` on a PIP evidence-prep,
  decision, and appeal-stage sample each produce the right `benefitArea`,
  non-empty `keyDates`/`evidenceMissing`, and never a forbidden phrase.
- **UC statement action pack** — deductions detected in `ucStatement.ts`
  produce `moneyAffected` lines with `treatment` never resolving to a
  saved/recovered state, and the assessment-period/standard-allowance/
  deduction figures round-trip into the pack unchanged.
- **Sanction good reason builder** — for each reason category, the generated
  wording never asserts the reason was accepted, always frames it as "you have
  said," and always includes the Mandatory Reconsideration deadline caveat.
- **UC review request** — bank-statement/evidence-review detection correctly
  distinguishes a review request from an overpayment/sanction notice (classifier
  regression risk flagged in Section 6), and the generated checklist never
  tells the user their evidence is sufficient.
- **Deadline cards** — every `BenefitsKeyDate` produced by any benefits engine
  has `userMustCheck === true` and a non-empty `note`; a snapshot/type test
  that this cannot compile if `userMustCheck` is ever loosened to `boolean`.
- **Stress mode output** — stress-mode rendering always includes a visible path
  back to the full pack, and never omits `uncertainty`/`cannotKnow`/
  `safetyNotes` content (only reorders/shortens presentation).
- **Crisis path** — `crisisSupport.ts` output for an urgent input always has
  `caseStrength === "urgent_get_advice"`, always includes the "cannot guarantee
  any payment" note, and (once Feature G ships) the urgent path renders above
  any evidence/questions section in the pack.
- **Evidence vault** — a photo/OCR-sourced `EvidenceItem` round-trips through
  the pack's `evidenceFound`/`evidenceVault` view correctly tagged with its
  source.
- **No unsafe wording** — extend the existing `FORBIDDEN_DECISION_PHRASES`
  sweep (already used in `decisionEngine.test.ts`/`benefits.test.ts`) to run
  across every new module's full output, not just `possibleGrounds`.
- **No automatic send/contact/submit** — a repo-wide test (in the spirit of
  `adminAvengerSafety.test.ts`) asserting no new benefits copy contains
  send/submit/contact-on-your-behalf wording, matching the pattern already
  used for camera-flow and OCR copy safety tests in this codebase.
- **No automatic money counting** — every new `BenefitsMoneyLine`/decision
  result in the benefits family only ever reaches `confirmed_saved`/
  `confirmed_recovered` in `impactLedger.ts` via the existing manual
  outcome-confirmation flow, never directly from a decision-engine read.

---

## What to build first (summary)

Start with **Phase 1** from Section 6: the pure `buildBenefitsActionPack()`
derivation function, the `BenefitsActionPackPanel` UI, "ask me the 3 missing
things," and the evidence-found-vs-missing split. All four of these are
render/derivation work over data and pipeline stages that already exist in the
repo today, carry the lowest classifier/safety risk, and are the fastest path
to something a user can actually feel is different from pasting a letter into
a generic chatbot.
