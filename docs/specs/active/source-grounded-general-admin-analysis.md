# Feature Spec: Source-Grounded General Admin Analysis

Status: Draft (Proposed — awaiting human approval before any production change)

Owner: (unassigned)

Date: 2026-07-24

> This is a **Phase 1 proposal only**. No production TypeScript, tests, harness,
> package, or configuration files are changed by this document. Implementation
> must not start until this specification is explicitly approved.

> **Revision 2 (2026-07-24).** Architecture approved in principle. This revision
> incorporates five review corrections: (1) `security_alert` is a first-class new
> read, not a generic fallback; (2) explicit specialist-route precedence with
> high-risk email safety ahead of career support; (3) the source-quote invariant
> is validated through one shared normalisation helper rather than a raw substring
> check; (4) a hardened chase-date boundary; (5) tightened corrupted-currency
> (`?`) handling. Sections touched: 3, 5, 6, 7, 12, 13, 15, 16, 17.

---

## 1. Problem statement

The general public "Check a message" intake produces results that present
**unsupported facts** — dates, amounts, statuses, deadlines, required replies,
and recommended actions that are not actually in the submitted document — as if
they came from the source. Eight private-corpus cases (GC-03 Energy price
change, GC-04 Payment receipt, GC-05 Failed login alert, GC-06 Subscription
renewal, GC-07 eBay refund, GC-08 Parcel delivered, GC-09 Dental appointment
reminder, GC-10 O2 mobile bill ready by Direct Debit) all pass the harness but
fail product evaluation (currently P0×5, P1×3).

The common failure is that the public intake in `src/lib/mockAnalysis.ts` routes
by shallow keyword presence, produces **untyped, unsourced** finding fields, and
then downstream layers **synthesise and display** dates and money as if they
were source facts. The five recurring patterns are:

1. Document classification is unreliable (keyword presence, no negation, no
   status, no role awareness).
2. Dates are not role-aware (a document date, a deadline, an appointment, a
   period boundary, and an AdminAvenger-suggested chase date are all treated the
   same, and a computed chase date is shown as a date to "check against the
   letter").
3. Money is not role-aware (subtotal, postage, refund total, amount demanded,
   and amount collected automatically are indistinguishable).
4. Next actions are generic rather than grounded in the source facts.
5. Unsupported facts — particularly deadlines and costs — can be introduced.

## 2. Central invariant (the standard this work must enforce)

> **No date, amount, status, deadline, required reply, manual payment
> instruction, or recommended action may be presented as a source fact unless it
> is supported by the submitted source text or clearly labelled as general
> guidance rather than a fact from the source.**

Everything below exists to make this invariant true and enforceable, and to keep
it true for the existing working document types (HMRC tax code notice, parking,
energy, travel, broadband, train delay, benefits, career, community, workplace).

## 3. Evidence from the code

All line numbers are against the approved baseline
(`git -c core.autocrlf=true diff` shows only `package.json`,
`package-lock.json`, `src/components/ResultCaseSheet.tsx`).

**Runtime pipeline (public intake).**

```
AdminItem
 → services/analysisService.ts:35   analyseAdminItem(item, { accessMode: "public" })
 → lib/mockAnalysis.ts:714          analyseAdminItem(...) → AdminFinding[]
 → lib/caseFactory.ts:616           createAdminCase(finding, item) → AdminCase (+ chaseDate)
 → lib/opportunityCards.ts:252      deriveOpportunityCard(case, item, finding) → OpportunityCard (+ deadline)
 → lib/resultViewModel.ts:648       buildResultViewModel({ opportunity, adminCase, ... }) → keyDates/moneyMentioned
 → components/ResultCaseSheet.tsx:546  <DateList dates={model.keyDates} />  (rendered to the user)
```

`src/views/HomeView.tsx:574-602` wires this exactly: `getMostImportantCase` →
`deriveOpportunityCard` → `buildResultViewModel`. `src/lib/__tests__/hmrcPublicResultDefects.test.ts:91-120`
(`buildPublicJourney`) exercises the same chain, so it is the real runtime path,
not an isolated unit.

**Untyped, unsourced finding fields.** `AdminFinding` (`src/types.ts:74-88`) has
`estimatedValue?: string` and `deadline?: string` — free text with no role and no
provenance. Any string placed here is later shown as a fact.

**Where a synthetic date enters the result.** `createAdminCase`
(`src/lib/caseFactory.ts:634-639`):

```ts
const chaseDate =
  finding.deadline ??
  addDays(new Date(now),
    isApprovedRefundCase || isTravelRecoveryCase ? 14 : finding.urgency === "high" ? 3 : 7);
```

`now = new Date().toISOString()` (`caseFactory.ts:617`) is the wall-clock run
time. `addDays` (`caseFactory.ts:50-54`) returns `now + N` as `YYYY-MM-DD`.
`getDefaultChaseDate` (`src/lib/chaseEngine.ts:31-35`) defaults to `+3`.

**Where the synthetic date is displayed as a source date.** Generic and
specialist opportunity-card branches fall back to `adminCase.chaseDate` for
`deadline`:

- payment reminder — `opportunityCards.ts:432` (`... ?? adminCase.chaseDate`)
- broadband — `opportunityCards.ts:270`
- delivery issue — `opportunityCards.ts:566`
- approved refund — `opportunityCards.ts:832`
- generic default — `opportunityCards.ts:877` (`finding?.deadline ?? adminCase.chaseDate`)

`buildResultViewModel` then turns `opportunity.deadline` into a key date
(`resultViewModel.ts:304-314` `fromOpportunityDeadline`, collected at
`resultViewModel.ts:744-749`). The card is rendered with
`RESULT_DATE_CAUTION = "Check this date against the original letter or message
before acting."` (`resultViewModel.ts:152-153`) and **no `sourceQuote`** — i.e. a
computed date is presented as a date to verify against the letter, where it does
not exist. By contrast the HMRC/decision-engine path does **not** fall back to
`chaseDate`, which is why `hmrcPublicResultDefects.test.ts:246-253,311-315`
require `vm.keyDates` length 0 for a tax-year-only notice. The leak is therefore
confined to the plain-admin categories — exactly the eight-case space.

**Classification defects visible in `mockAnalysis.ts`.**

- `important_reply` weak keywords include `"reply"`, `"respond"`
  (`mockAnalysis.ts:135`) and `mediumUrgencyKeywords` includes `"reply"`
  (`mockAnalysis.ts:169`): "do not reply to this email" matches as a reply
  needed. No negation handling.
- `deadline` strong keywords include `"appointment"` (`mockAnalysis.ts:93`): any
  appointment becomes a deadline. `isAppointmentTask` (`mockAnalysis.ts:416-419`)
  only fires for *cancelled/rebook* appointments, so a plain reminder (GC-09)
  falls through to the deadline rule.
- `createApprovedRefundFinding` (`mockAnalysis.ts:454-470`) sets
  `estimatedValue` from `...match(currencyAmountPattern)?.[0]` — the **first**
  currency amount in the text (`mockAnalysis.ts:179,465`). It cannot tell a
  subtotal, postage, or refund total apart.
- Delivery detection recognises future deliveries (`deliveryUpdateSignals`,
  `mockAnalysis.ts:211-219`) but has no completed-delivery signal ("delivered",
  "left in a safe place") — GC-08 is not understood as complete.
- `createSubscriptionFinding` (`mockAnalysis.ts:472-488`) uses fixed wording and
  `estimatedValue: "Potential recurring cost"`, discarding renewal amount,
  renewal date, billing frequency, and cancellation wording (GC-06).
- There is no bill-notification route that understands "bill ready", "total
  due", "Direct Debit", "automatic collection", "collection date", or "no manual
  payment required" (GC-10). `isBroadbandPriceRiseScenario`
  (`broadbandPriceRiseAssessment.ts:301-311`) needs both a service signal **and**
  an increase signal, so an O2 "bill ready" notice does not match it — it falls
  through to payment-reminder (implying a manual payment) or to the generic
  unknown finding (then a synthetic chase date).

**Money extractors are source-grounded in some modules and not others.**
`assessPaymentReminder` (`paymentReminderAssessment.ts:230-280`) extracts
`responseDeadline`/`paymentDueDate` only from real source date patterns and never
defaults — so it is *not* a fabricated-date source. But its amount pattern
(`paymentReminderAssessment.ts:61`) matches only `£`/`GBP`, while
`moneyParsers.ts:37` and `mockAnalysis.ts:179` also match `Â£` and `?`.
`publicScopePolicy.ts:162` extracts `dateMentioned` as the first source date
(also source-grounded).

**Encoding.** The currency prefix `(?:GBP\s*|£\s*|Â£\s*|\?\s*)`
(`moneyParsers.ts:37`) covers a proper `£`, the single-mojibake `Â£`, and the
`?` degradation, but **not** the double-mojibake `Ã‚Â£`, and `paymentReminderAssessment.ts`
covers neither `Â£` nor `?`. Corrupted amounts are therefore mis-extracted or
dropped inconsistently across modules. The `?` branch is also **too broad**: it
treats any `?` immediately followed by digits as GBP, so an ordinary question
mark before a number could be mis-parsed as money — this must be narrowed to a
label-supported `?` (Sections 13 and 15).

## 4. The fabricated date `2026-07-31`

`2026-07-31` is **not a literal anywhere in the repository** (verified by
`grep -rn "2026-07-31"` across the tree, excluding `docs/research/`,
`opencode.jsonc`, `node_modules`, `.git`). It is produced at runtime.

The only runtime producer of "now + 7 days" is `createAdminCase`
(`caseFactory.ts:634-639`): a finding with **no source-extracted deadline**, of
**medium or low urgency**, that is **not** an approved-refund or travel-recovery
case, gets `chaseDate = addDays(now, 7)`. On a corpus run dated **2026-07-24**
(today), `2026-07-24 + 7 = 2026-07-31`. That synthetic chase date then reaches
the display through the generic opportunity-card `?? adminCase.chaseDate`
fallbacks (Section 3) as a "Key date to check", captioned as if it were in the
letter.

The corpus cases that hit the `+7` default (medium/low urgency, no source
deadline, not approved-refund/travel) — subscription (GC-06), payment receipt
(GC-04), parcel delivered (GC-08), appointment reminder (GC-09), and, when they
do not match a source-dated route, failed-login (GC-05) and the O2 bill (GC-10) —
would all display `2026-07-31`.

**Confidence and honesty about this conclusion.** Phase 1 must not run the
harness or open the private corpus, so `2026-07-31` cannot be bound to one named
GC case with certainty. The evidence that it is the `caseFactory` `+7` default
is nonetheless strong and the alternatives are ruled out:

- No literal in code or fixtures (grep).
- `getDefaultChaseDate` defaults to `+3` → `2026-07-27`, not `-31`.
- `paymentReminder`, `broadband`, and `publicScope` date extractors are
  source-grounded and never default.
- `2026-07-24 + 7 = 2026-07-31` matches exactly, and the leak path is the only
  runtime channel that shows a computed date as a "check against the letter"
  key date.

The one hypothesis that cannot be excluded without the corpus is that
`2026-07-31` also happens to be a genuine date inside a GC source document; but a
genuine source date would not have been flagged as *fabricated*, so this does not
change the diagnosis. **Recommended confirmation once approved:** run the corpus
under a fixed injectable clock (see Section 15) and assert no result contains a
date absent from its own source text.

## 5. Proposed architecture

Extend the existing pipeline; do not build a parallel one (per
`AGENTS.md` and the AdminAvenger engineering standard, Section 7).

1. **Source-grounded extraction layer (new, small, pure).** A
   `generalAdminExtraction` module that, given `AdminItem` text, returns typed,
   **source-quoted** facts: dates (with role), amounts (with role), status
   signals, negation spans, and automatic-vs-manual signals. Every extracted fact
   carries the exact `sourceQuote` substring it came from. This mirrors the shapes
   the codebase already has for the AI adapter (`AiExtractedAmount`/
   `AiExtractedDate`/`AiExtractionResult`, `types.ts:335-376`) so the same
   provenance discipline the AI path already assumes is applied to the local
   mock path.

2. **Status-and-role-aware classifier (extend `mockAnalysis.ts`).** Replace raw
   keyword membership for the affected categories with a small ordered set of
   guarded predicates that consult negation spans and status/role signals from
   the extraction layer before matching. Keep the existing specialist helpers;
   add **five new status-and-role-aware reads**: `bill_ready_direct_debit`,
   `delivery_completed`, `appointment_reminder`, role-aware `refund_confirmation`,
   and `security_alert`. `security_alert` (GC-05) is a first-class read with its
   own classification and its own slot in the precedence order (Section 12); it
   must not be left to the generic keyword fallback.

3. **Typed finding facts (extend types, additively).** Add optional
   `sourceFacts`-style typed date/money fields to the finding/case so a
   downstream layer can tell a source deadline from a suggested chase date, and a
   refund total from a subtotal. Existing free-text fields remain for backward
   compatibility during migration.

4. **Guardrail at the view-model boundary (extend
   `resultViewModel.ts`).** Strengthen `validateResultViewModelSafety` so a
   key date or money line claimed as a source fact must be **supported** by the
   item text. Support is checked through **one shared normalisation helper** that
   applies the same normalisation (whitespace, line-endings, OCR artefacts, and
   currency-encoding) to *both* the item text and the `sourceQuote` before
   comparison — not a raw substring test against already-normalised text. The
   original `sourceQuote` is preserved verbatim for display. The existing
   `isSourceSupportedDate` (`moneyParsers.ts:186`) is a raw `includes` check and
   must be superseded by, or re-implemented in terms of, this shared helper. A
   computed chase date is never validated as a source fact; it is treated as
   guidance (see item 5).

5. **Stop the synthetic-date leak (extend `caseFactory.ts` /
   `opportunityCards.ts`).** `AdminCase.chaseDate` remains available for the
   user-controlled chase and case-management workflow, but it must **never**
   automatically populate `OpportunityCard.deadline`, `ResultViewModel.keyDates`,
   or any date captioned as coming from the submitted document. This means
   removing the `?? adminCase.chaseDate` deadline fallbacks
   (`opportunityCards.ts:270,432,566,832,877`). If no dedicated guidance field
   exists to carry a computed follow-up date, the analysis result **omits** it
   rather than representing it as a deadline.

Nothing here adds a user-visible category, engine picker, model choice, advanced
panel, or auto-send. It stays behind the single "Check a message" front door.

## 6. Source-grounding invariant (mechanics)

- **Provenance is mandatory for source claims.** Any `ResultDateView` /
  `ResultMoneyView` with `source: "main_result"` that is presented as a fact
  from the document MUST carry a non-empty `sourceQuote`, and that quote's support
  MUST be confirmed through **one shared normalisation helper** that normalises
  *both* the item text and the `sourceQuote` consistently (whitespace,
  line-endings, OCR artefacts, currency-encoding) before comparison. The raw
  `sourceQuote` is preserved verbatim for display; it is **not** required to be an
  exact substring of already-normalised text. The helper must tolerate the
  supported normalisations without ever letting an unsupported fact pass.
- **Guidance is explicitly separated, and chase dates never masquerade as
  source.** `AdminCase.chaseDate` must never automatically populate
  `OpportunityCard.deadline`, `ResultViewModel.keyDates`, or any source-captioned
  date. AdminAvenger-generated follow-up dates, where a dedicated guidance field
  exists, are labelled as AdminAvenger's suggestion ("Suggested follow-up —
  AdminAvenger's suggestion, not a date from your document") and never captioned
  "check this date against the original letter". If no guidance field exists, the
  computed follow-up is omitted from the analysis result entirely.
- **Drop, don't guess.** If a fact cannot be source-supported and is not valid
  guidance, it is omitted, and the relevant step stays "not complete" (consistent
  with the existing key-date behaviour in `hmrcPublicResultDefects.test.ts`).
- **Enforced, not hoped for.** The rule is checked in
  `validateResultViewModelSafety` and covered by a new invariant test, so a
  regression fails a test rather than reaching a user.

## 7. Typed date roles

Introduce a `DateRole` discriminated union. Each source-derived role requires a
`sourceQuote`; `suggested_followup` must **not** have one.

- `document_date` — a stated letter/issue/statement date ("Issue date: 12 May
  2026"). Surfaces as a key date.
- `stated_deadline` — a date the source says the user must act by ("pay by",
  "respond by", "contact us by <date>"). Surfaces as a key date and may drive
  urgency.
- `event_date` — a stated date of a scheduled event: appointment date, price
  "effective from" date, Direct Debit collection date. Surfaces as a key date but
  is **not** a deadline to act unless the source also asks for action.
- `period_boundary` — a range such as a tax year or billing period. **Never** a
  deadline; must not complete the key-date step (preserves
  `hmrcPublicResultDefects.test.ts:245-298`).
- `suggested_followup` — AdminAvenger's computed chase/review date. Guidance
  only; no source caption. It must **never** auto-populate
  `OpportunityCard.deadline`, `ResultViewModel.keyDates`, or any source-captioned
  date, and is excluded from the source key-dates list. Where no dedicated
  guidance field exists to carry it, it is omitted from the analysis result
  rather than shown as a deadline.
- `unknown` — a date-shaped string whose role cannot be established. Not
  surfaced as a fact.

## 8. Typed money roles

Introduce a `MoneyRole` discriminated union, each carrying `sourceQuote`,
currency, frequency, and reusing the existing `MoneyImpactStatus`
(`types.ts:31`) / `DecisionAmountTreatment` so the money-safety rules and
`countedInMoneyTracker: false` still apply.

- `amount_demanded` — a bill/total the sender is asking for ("amount due", "total
  due"). Shown as "amount being requested"; never counted as saved/recovered
  (AdminAvenger standard Section 5).
- `amount_collected_automatically` — an amount a Direct Debit / continuous
  authority will take ("we'll collect £X on <date>"). Display only, paired with
  the collection `event_date`, with a note that no manual payment is needed.
- `refund_total` — the actual amount to be returned. Only this role may become a
  pending recovery; must be distinguished from `order_subtotal`, `postage`, and
  `line_item`.
- `order_subtotal` / `postage` / `line_item` — evidence amounts only; never the
  refund figure, never a saving.
- `recurring_charge` — a subscription/renewal amount plus its `frequency` and
  (if stated) the renewal `event_date`.
- `price_old` / `price_new` / `price_increase` — for price/tariff changes;
  annualised increase is a **checking opportunity**, not a confirmed saving.
- `total_cost` — a trip/booking/order total (generalises the existing travel
  guard, `moneyParsers.ts:273-300`); evidence only, never recoverable.
- `recoverable_amount` — clearly refundable/compensation wording
  (`moneyParsers.ts:277-316`); pending recovery only.
- `unknown` — an amount whose role cannot be established. Shown as "amount
  mentioned", never as a demand, saving, or recovery.

## 9. Document / status classifications for the eight corpus categories

A cross-cutting `DocumentStatus` describes what state the document is in, so
negation and automatic-vs-manual reads change the outcome rather than being
ignored:

`pending_manual_action` · `completed_no_action` · `automatic_no_action` ·
`cancelled` · `upcoming_reminder` · `informational`.

Document reads required to cover the eight categories (each additive, behind the
front door):

- **GC-03 energy_price_change** → `bill_increase`, status `informational`;
  old/new annual amounts (`price_old`/`price_new`/`price_increase`), effective
  `event_date` if stated. (Already largely handled; keep.)
- **GC-04 payment_receipt** → proof-of-payment, status `completed_no_action`; no
  `amount_demanded`, no deadline.
- **GC-05 security_alert** (failed login) → account-security notice, status
  `informational`; negation-aware ("do not reply"); no money; no deadline unless
  the source states one.
- **GC-06 subscription_renewal** → `recurring_charge` with amount, frequency,
  renewal `event_date`, and cancellation wording; status `upcoming_reminder`.
- **GC-07 refund_confirmation** (eBay) → approved refund, status
  `informational`/pending arrival; `refund_total` role (not the item subtotal or
  postage); pending recovery only.
- **GC-08 delivery_completed** → completed delivery, status
  `completed_no_action`; recognises "delivered" / "left in a safe place".
- **GC-09 appointment_reminder** → appointment `event_date`, status
  `upcoming_reminder`; **not** a deadline and **not** a cancellation.
- **GC-10 bill_ready_direct_debit** (O2) → bill notification, status
  `automatic_no_action`; total due as `amount_collected_automatically`,
  collection `event_date`, "no manual payment required"; must not be framed as a
  manual payment reminder or a price rise.

## 10. Negation handling

Before any positive keyword rule fires, compute negation spans from the source
and suppress matches that fall inside them. Minimum negators to cover the corpus:
"do not reply" / "please do not reply" / "no-reply" (suppresses
`important_reply`); "no action required" / "no further action" / "you don't need
to do anything" (suppresses action/deadline routes); "no manual payment" / "you
do not need to pay" / "will be collected automatically" (suppresses payment-due /
`amount_demanded`). Negation is span-scoped (a negated clause), not
whole-document, so "do not reply; however you must pay by 3 May" still yields the
stated deadline. This corrects `mockAnalysis.ts:135,169` and the
`isNoActionRecord` gap (`mockAnalysis.ts:242-283`).

## 11. Automatic vs manual action handling

Detect automatic-collection signals ("Direct Debit", "we'll collect", "will be
taken automatically", "continuous payment authority", "no action needed"). When
present and not overridden by an explicit manual demand:

- classify as `automatic_no_action`;
- present any amount as `amount_collected_automatically` with the collection
  `event_date` (from source), not as `amount_demanded`;
- do **not** emit a "pay by" `stated_deadline` or a "Payment reminder to check"
  framing;
- the next step is "check the amount and date look right; no manual payment is
  needed unless you want to cancel or query it."

This is the core of the GC-10 fix and closes the automatic/manual half of defect
pattern 7.

## 12. Specialist-route precedence

Keep the existing "specialist wins before generic keyword rules" structure
(`mockAnalysis.ts:744-931`) and make the order explicit and mutually exclusive,
with negation/status gates evaluated **before** keyword rules. The resolved
precedence, highest to lowest, is:

1. **Public-scope boundary** (`assessPublicIntakeScope`) — unchanged.
2. **High-risk email safety override** — unchanged in behaviour, but see the
   ordering note below.
3. **Career support**.
4. **Status-aware general-admin specialist routes (new):** the status/negation
   gates and the new reads — `security_alert` (GC-05), `completed_no_action`
   (receipt/paid/`delivery_completed`), `automatic_no_action`
   (`bill_ready_direct_debit`), `appointment_reminder`, `cancelled`, and
   role-aware `refund_confirmation`.
5. **Existing remaining specialists:** approved refund, energy price change,
   broadband/mobile price rise (unchanged increase-signal guard), subscription
   renewal, payment reminder (manual demand only, after automatic collection is
   excluded), delivery issue/update, train delay.
6. **Decision engine** (parking/debt/bailiff/TV/bank/consumer) — unchanged gate.
7. **Generic keyword `categoryRules`** — fallback only.

**Ordering note — high-risk safety precedes career.** High-risk email safety
(step 2) must take precedence over accidental career matching (step 3). Today the
career pack short-circuits and returns *before* email safety is even assessed
(`mockAnalysis.ts:728-743`), so a high-risk phishing or account-security message
that happens to contain career-adjacent words ("application", "candidate", "job")
could be routed to career and bypass the safety override. Reordering safety ahead
of career is therefore a **deliberate behaviour change**, called out here per
`AGENTS.md`, and requires a **regression test**: a high-risk email whose text also
trips a career keyword must route to the safety override, not to career support.

Tie-break rule: the most specific route whose **source-supported** facts are
present wins; a route may only claim a case if its defining facts are actually in
the text. This preserves every currently-winning specialist while giving the five
new reads a defined slot.

## 13. Unsupported-claim guardrails

- **View-model gate.** Extend `validateResultViewModelSafety`
  (`resultViewModel.ts:1382-1423`) with `datesSourceSupported` and
  `moneySourceSupported` checks. Every source-claimed key date / money line must
  be supported by the item text **through the shared normalisation helper**
  (Section 6) — which normalises both the item text and the `sourceQuote`
  consistently (whitespace, line-endings, OCR, currency-encoding) before
  comparison, rather than a raw substring test — otherwise `safe` is false.
- **Chase dates never masquerade as source.** `AdminCase.chaseDate` must not
  auto-populate `OpportunityCard.deadline`, `ResultViewModel.keyDates`, or any
  source-captioned date. Where a dedicated guidance field exists, a computed
  follow-up is shown under a distinct "Suggested follow-up" treatment, never
  among source key dates and never with `RESULT_DATE_CAUTION`; where none exists,
  it is omitted from the analysis result.
- **No first-amount refund.** The refund figure must come from a `refund_total`
  role, not "first currency match" (`mockAnalysis.ts:465`).
- **Money-safety unchanged.** `countedInMoneyTracker: false`, possible/likely/
  confirmed, and never counting demanded money as saved all remain
  (AdminAvenger standard Section 5; `resultViewModel.ts:1393-1395`).
- **Encoding normalisation, with a guarded `?`.** A single shared currency/`£`
  normalisation (covering `£`, `Â£`, `Ã‚Â£`, and `GBP`) is used by every money
  extractor. The `?` degradation is **not** treated globally as GBP: a `?`
  immediately followed by digits is read as a degraded pound sign **only** when a
  nearby monetary label or other strong currency context supports it (e.g.
  "amount due", "total", "balance", "refund", an adjacent `GBP`/`£`, or a
  per-month/per-year suffix). An ordinary question mark followed by a number
  ("question 3?", "?4 remaining") must never be parsed as money.

## 14. User-facing behaviour for GC-03 to GC-10

All copy is plain English, keeps the human in control, and uses possible/likely/
confirmed correctly. These reflect only the case descriptions in the brief; the
private corpus is not opened.

- **GC-03 Energy price change.** "This looks like an energy price-change notice.
  It shows an old and a new estimated annual cost." Show old/new/increase as
  amounts to check (not a saving); effective date only if stated. Next step:
  consider whether a cheaper tariff or support is worth checking. Confidence:
  clear read; uncertainty: your usage and any support you already receive.

- **GC-04 Payment receipt.** "This looks like a receipt confirming a payment you
  made." Status: nothing to do. No amount shown as owed; no deadline; no
  synthetic chase date. Keep as proof of payment. Cannot know: whether anything
  else is outstanding beyond this receipt.

- **GC-05 Failed login alert.** "This looks like a security alert about a
  sign-in attempt." If it says do not reply, AdminAvenger does not suggest a
  reply. No money, no deadline unless the source states one. Next step: if it
  wasn't you, use the provider's own app/site (not links in the message) to check
  and change your password. Cannot know: whether the alert is genuine — verify
  independently.

- **GC-06 Subscription renewal.** "This looks like a subscription due to renew."
  Show the renewal amount, how often it recurs, and the renewal date **if stated
  in the message**; show the cancellation wording found. Framed as a possible
  saving to review, not a confirmed one. Next step: decide before the renewal
  date whether to keep or cancel.

- **GC-07 eBay refund.** "This looks like confirmation a refund has been
  approved." Show the **refund total** (not the item subtotal or postage) as a
  pending recovery — money is not recovered until it reaches your account. If the
  message states a refund window, show it; do not invent one. Next step: check
  your original payment method; chase only if it hasn't arrived within any stated
  window.

- **GC-08 Parcel delivered.** "This looks like a delivery that has been
  completed." Status: nothing to do unless you didn't receive it. No deadline, no
  chase date. Next step: if it says left in a safe place and you can't find it,
  contact the sender/courier.

- **GC-09 Dental appointment reminder.** "This looks like a reminder of an
  upcoming appointment." Show the appointment date and time as an event to note —
  **not** a deadline, and not a booking to rebook (it isn't cancelled). Next
  step: add it to your calendar; follow the practice's cancellation notice only
  if you can't attend. Cannot know: anything not written in the reminder.

- **GC-10 O2 mobile bill ready by Direct Debit.** "This looks like a notice that
  your mobile bill is ready and will be collected by Direct Debit." Show the total
  and the collection date as facts to check; state clearly that no manual payment
  is needed. Do **not** frame it as a payment you must make or as a price rise.
  Next step: check the amount and date look right; only act if you want to query
  or cancel.

## 15. Tests to add

Behavioural first (per `AGENTS.md`), all through the real public journey
(`analyseAdminItem → createAdminCase → deriveOpportunityCard →
buildResultViewModel`), using **safe synthetic fixtures written in this repo** —
never the private corpus:

- **Source-grounding invariant test.** For each of the eight category shapes,
  assert every `keyDates` and `moneyMentioned` entry either is supported by the
  item text **through the shared normalisation helper** (Section 6) or is
  explicitly a guidance/suggestion line; assert no result contains a date or
  amount absent from its own source text after consistent normalisation.
- **No synthetic date leak / chase-date boundary.** With an injected fixed clock,
  a medium/low-urgency finding with no source date produces **no**
  `OpportunityCard.deadline` and **no** `ResultViewModel.keyDates` entry equal to
  `now + N`; any computed follow-up is either a labelled guidance line or omitted,
  never a source-captioned date.
- **High-risk safety precedes career (regression).** A high-risk email whose text
  also contains career-adjacent keywords routes to the safety override, not to
  career support.
- **Security alert (GC-05).** A failed-login/account-security message classifies
  as `security_alert` (not the generic fallback), carries no money and no deadline
  unless the source states one, and — when it says do not reply — does not produce
  a reply-needed result.
- **Negation.** "do not reply / no-reply" does not produce a reply-needed result;
  "no action required" / "collected automatically" does not produce a deadline or
  amount-demanded.
- **Automatic vs manual.** A Direct Debit bill (GC-10 shape) is
  `automatic_no_action`, shows the amount as collected-automatically with the
  collection date, and is neither a payment reminder nor a price rise.
- **Money roles.** A refund confirmation with an item subtotal, postage, and a
  refund total surfaces the **refund total** as pending recovery and never the
  subtotal/postage.
- **Status reads.** Completed delivery (GC-08) and payment receipt (GC-04) are
  no-action; appointment reminder (GC-09) is an event, not a deadline and not a
  rebook.
- **Encoding (positive and negative).** `£`, `Â£`, `Ã‚Â£`, and `GBP` variants of
  the same amount extract to the same value; a label-supported `?` (e.g. "amount
  due ?42.99") extracts as £42.99; and ordinary question marks followed by numbers
  ("question 3?", "?4 remaining") are **not** parsed as money.
- **Guardrail unit test.** `validateResultViewModelSafety` returns `safe: false`
  when a source-claimed date/amount is not supported by the item text through the
  shared helper.

## 16. Existing behaviour to preserve

These must stay green (they encode current, correct behaviour):

- `src/lib/__tests__/hmrcPublicResultDefects.test.ts` — HMRC tax-year boundary
  never becomes a key date; a genuine issue date does; evidence counts 8/4;
  direct answer; parking evidence path; no "undefined"/saved/recovered.
- `src/lib/__tests__/resultViewModel.test.ts` — dates `userMustCheck`, money
  `countedInMoneyTracker: false`, `cannotKnow`/`uncertainty` present, safety.
- `src/lib/__tests__/publicScopeAnalysis.test.ts`,
  `src/lib/__tests__/publicScopePolicy.test.ts` — scope gating unchanged.
- `src/lib/__tests__/paymentReminderAssessment.test.ts`,
  `src/lib/__tests__/broadbandPriceRiseAssessment.test.ts` — existing extraction
  behaviour (payment-reminder dates stay source-grounded; broadband still needs
  an increase signal).
- `src/lib/__tests__/adminAvengerSafety.test.ts`,
  `src/lib/__tests__/safetyWordingRegression.test.ts` — forbidden wording and
  money-safety.
- `src/components/__tests__/ResultCaseSheet.test.tsx` — render invariants
  (this file is out of scope to edit; its behaviour must not change).
- `src/lib/__tests__/goldenLetterCorpus.test.ts`,
  `src/lib/__tests__/demoScenarios.test.ts`,
  `src/lib/__tests__/decisionEngineIntegration.test.ts` — broader flows.

The existing energy, travel, broadband, train-delay, decision-engine, career,
community, and workplace routes keep their current outputs; the five new reads
(`security_alert`, `bill_ready_direct_debit`, `delivery_completed`,
`appointment_reminder`, role-aware `refund_confirmation`) are additive and slot
into the precedence in Section 12. The one deliberate exception is the
safety-before-career ordering (Section 12), which is an intentional behaviour
change flagged here and locked by a new regression test rather than changed
silently.

## 17. Implementation order

1. Add the source-grounded extraction layer (`DateRole`/`MoneyRole`/status,
   each with `sourceQuote`) and unit tests — no wiring yet, no behaviour change.
2. Add a shared currency/`£` normalisation (incl. `Ã‚Â£`) and route existing
   money extractors through it; regression-test each.
3. Add negation-span and automatic-vs-manual detection with tests.
4. Extend `mockAnalysis.ts` classification for the **five new reads**
   (`security_alert`, `bill_ready_direct_debit`, `delivery_completed`,
   `appointment_reminder`, role-aware `refund_confirmation`) plus negation gates,
   keeping specialist precedence (Section 12) with high-risk email safety ahead of
   career; behavioural tests per category, including the safety-before-career
   regression test.
5. Harden the chase-date boundary: keep `AdminCase.chaseDate` for the
   user-controlled chase workflow, but stop it populating `OpportunityCard.deadline`
   and `ResultViewModel.keyDates` (remove the `?? adminCase.chaseDate` fallbacks);
   show a computed follow-up only through a dedicated guidance field, or omit it.
6. Strengthen `validateResultViewModelSafety` and add the invariant test.
7. Full validation (Section 18) and update this spec's status.

Each step is independently reviewable and independently revertible.

## 18. Validation plan

Per-step: focused vitest for the changed area. Before "done":

```powershell
npm test
npm run lint
npm run build
git diff --check
```

Plus a manual pass of all eight category shapes through the public journey using
in-repo synthetic fixtures, checking the Section 14 behaviour and confirming no
result shows a date or amount absent from its source. Once approved and
implemented, re-run the corpus harness through its existing command under a fixed
clock and confirm the fabricated-date and unsupported-fact classes are gone.

## 19. Rollback approach

Changes are additive and staged. Rollback options, least to most:

- Behaviour is gated so the five new reads and the guardrail can be disabled by
  reverting their individual commits without touching the working routes.
- The synthetic-date-leak fix is a single change in `caseFactory`/
  `opportunityCards`; reverting it restores prior behaviour (a chase-date-derived
  key date) without affecting the extraction layer.
- The new extraction layer and types are optional/additive, so reverting
  consumers leaves the existing free-text fields working.

No data migration is involved (local-first, no persisted schema change beyond
additive optional fields).

## 20. Risks and unresolved questions

- **Not corpus-confirmed.** `2026-07-31` is diagnosed from code, not observed in
  Phase 1. Confirm with a fixed-clock corpus run before closing.
- **`2026-07-31` as a genuine source date.** Cannot be excluded without the
  corpus; would not change the fix but should be checked.
- **Chase-workflow dependency.** Cases the user actively chases rely on
  `chaseDate` (`App.tsx`, `chaseEngine.ts`, `CasesView.tsx`). The fix must keep
  chase dates for that workflow while removing them from the *analysis result*
  key-dates. Boundary needs care and explicit tests.
- **Ambiguous documents.** Some messages are genuinely mixed (a receipt that also
  mentions a renewal). Precedence (Section 12) plus source-supported tie-breaks
  should resolve these, but real corpus wording may need tuning.
- **Provider-specific wording.** GC-10/O2 and GC-07/eBay phrasings vary; the
  reads must key off generic signals (Direct Debit, refund total) not brand
  names.
- **Locale/timezone in date parsing.** `addDays` uses UTC slicing
  (`caseFactory.ts:53`); any date comparison added must avoid off-by-one across
  timezones.
- **No test currently pins `chaseDate`.** Good for change freedom, but means the
  new invariant tests are the only guard — they must be thorough.

## 21. Explicitly out of scope

- Editing `package.json`, `package-lock.json`, `src/components/ResultCaseSheet.tsx`,
  the Playwright/vitest harness, or any harness configuration.
- Any new user-visible category, engine/model picker, settings toggle, or
  advanced/technical panel (off-standard per AdminAvenger standard Section 6).
- Auto-send, auto-submit, or any third-party contact.
- Real/network AI extraction, cloud processing, telemetry, or new dependencies.
- Reworking the decision-engine modules (parking/debt/benefits/HMRC/TV/bank) or
  the career/community/workplace packs beyond leaving them unchanged.
- Counting any money as saved or recovered, or asserting entitlement.
- Reading, importing, or referencing the private evaluation corpus,
  `docs/research/`, or `opencode.jsonc`.
- Implementation itself — this document is a proposal; no production code is
  changed until it is approved.
