# Ordinary Message Date-Role Extraction V1

## 1. Status and authority

| Field | Value |
|---|---|
| Status | **Approved — implementation authorised** |
| Workstream | `ordinary-message-date-role-extraction-v1` |
| Scope | Ordinary-message source-grounded timing extraction and propagation only |
| Date | 13 August 2026 |
| Evidence base | Repository and browser investigation completed 13 August 2026 |
| Product principle | **AI prepares. Humans decide.** |

This specification is the approved source of truth for the implementation. The
human project owner explicitly approved this exact revision on 13 August 2026.

## 2. Problem and objective

The ordinary-message path can understand the broad meaning of a message while
losing its source-grounded dates before result composition. For example, an
appointment may be classified correctly while the result says "No clear date
was found." The confirmed causes are:

1. the shared month-name date pattern requires a year, so `20 August` and
   `1 September` are not extracted;
2. specialist date extractors use inconsistent patterns;
3. the current broad roles cannot safely distinguish reply deadlines, payment
   due dates, appointments, effective dates, statement dates and relationships;
4. Result View Model composition filters out some legitimate typed dates;
5. preparation progress treats timing presence more broadly than timing meaning;
6. appointment time has no structured path;
7. `do not need to reply` is not covered by the existing reply-negation span;
8. generic timing does not yet apply structured-source OCR review state.

The objective is a narrow deterministic timing path:

```text
source-grounded date/time evidence
→ deterministic semantic timing meaning
→ existing AdminCase timingFacts
→ existing role-aware Result View Model
→ role-aware preparation state
→ human decision
```

The implementation extends existing timing and provenance primitives. It must
not create a parallel date, evidence, result, case, or scheduling system.

## 3. Governing invariants

### 3.1 Date is not deadline

> **A detected date is not automatically a deadline.**

The following meanings are non-interchangeable:

```text
appointment on 20 August          ≠ reply deadline
balance as of 20 August           ≠ payment deadline
statement dated 20 August         ≠ deadline
tariff starts 20 August           = effective/start date
reply by 20 August                = reply deadline
payment due on 5 September        = payment due/deadline
```

Only explicit source cues may establish a deadline. Date detection alone must
never create urgency, a requested reply, a payment instruction, a chase, or an
external action.

### 3.2 Source grounding

Every displayed timing fact must retain the exact source text and be supported
by the supplied source. Where structured source documents exist, the timing fact
must reuse their document/segment identity and review state.

### 3.3 No false precision

The current date, upload date, analysis date, filename, document order or user
locale must not supply a missing source year. `20 August` remains `20 August`.

### 3.4 Multiple facts, not one important date

One message may produce multiple timing facts. A later match must not overwrite
an earlier one, and a deadline must not erase a document date or period boundary.

### 3.5 Human control

Timing extraction may prepare and explain. It must not automatically save,
schedule, reply, send, submit, contact, chase, count money, or record an outcome.

## 4. Existing architecture to extend

The implementation must extend these existing primitives and paths:

- `DateRole`, `ExtractedDate`, `ExtractedRelativePeriod` and
  `extractGeneralAdmin` in `src/lib/generalAdminExtraction.ts`;
- optional `AdminCase.timingFacts` in `src/types.ts`;
- timing construction in `src/lib/caseFactory.ts`;
- `ResultTimingRole`, `ResultDateView`, `keyDates` and source-support validation
  in `src/lib/resultViewModel.ts`;
- `buildKeyDateItem` and existing progress statuses in
  `src/lib/caseProgress.ts`;
- `SourceDocument`, `SourceSegment`, `SourceProvenance`, source review state and
  shared source-support validation;
- existing ordinary-message finding precedence and negation controls in
  `src/lib/mockAnalysis.ts`.

Specialist broadband and payment-reminder extractors must not remain conflicting
authorities. They should consume the shared typed timing facts where practical,
or be made behaviorally equivalent without introducing another representation.

No component or route redesign is required. Existing result components consume
the Result View Model after the model is corrected.

## 5. Minimum timing representation

### 5.1 Compatibility principle

Keep the existing broad `DateRole` because it already controls result and
progress behavior. Add semantic detail to `ExtractedDate`; do not encode every
combination as an unrelated top-level role.

The minimum conceptual contract is:

```ts
type DateRole =
  | "document_date"
  | "stated_deadline"
  | "event_date"
  | "context_date"
  | "period_boundary"
  | "suggested_followup"
  | "unknown"

type DateMeaning =
  | "reply_deadline"
  | "payment_due"
  | "appointment"
  | "effective_start"
  | "statement_as_of"
  | "document_issued"
  | "period"
  | "other"

type DateRelationship =
  | "previous"
  | "replacement"
  | "start"
  | "end"

type DatePrecision = "day_month" | "full_date"

type DateComponents = {
  readonly day: number
  readonly month: number
  readonly year?: number
}

type ExtractedTime = {
  readonly value: string
  readonly sourceQuote: string
  readonly index: number
}

type ExtractedDate = {
  readonly role: DateRole
  readonly meaning: DateMeaning
  readonly relationship?: DateRelationship
  readonly precision: DatePrecision
  readonly components?: DateComponents
  readonly value: string
  readonly sourceQuote: string
  readonly index: number
  readonly time?: ExtractedTime
  readonly provenance?: SourceProvenance
}
```

Exact TypeScript factoring may use shared bases or readonly aliases, but it must
preserve these semantics. `suggested_followup` remains an existing compatibility
role and is not produced by source date extraction in this workstream.

### 5.2 Role and meaning mapping

| Source meaning | Broad role | Meaning | Relationship |
|---|---|---|---|
| `reply by 20 August` | `stated_deadline` | `reply_deadline` | none |
| `payment due on 5 September` | `stated_deadline` | `payment_due` | none |
| `appointment on 20 August` | `event_date` | `appointment` | none |
| `takes effect from 20 August` | `event_date` | `effective_start` | none |
| `balance as of 20 August` | `context_date` | `statement_as_of` | none |
| `statement dated 20 August` | `document_date` | `document_issued` | none |
| `contract runs from 1 September` | `period_boundary` | `period` | `start` |
| `...to 31 August 2027` | `period_boundary` | `period` | `end` |
| appointment `moved from` | `event_date` | `appointment` | `previous` |
| appointment `...to` | `event_date` | `appointment` | `replacement` |
| safely detected but unclassified | `unknown` | `other` | none |

`context_date` is the only new broad role. It prevents an as-of or balance date
from being forced into either an event or document-issue meaning.

## 6. Supported source-date syntax and precision

### 6.1 V1 accepted forms

The shared extractor must retain existing supported full-date forms and add
unambiguous English day-month forms without a year:

```text
20 August
20 August 2026
August 20, 2026
2026-08-20
20/08/2026
```

Existing accepted numeric behavior must not be broadened beyond what is needed
for this workstream. Invalid calendar components must not become trusted dates.

### 6.2 Yearless dates

For `20 August`:

```ts
{
  value: "20 August",
  sourceQuote: "20 August",
  precision: "day_month",
  components: { day: 20, month: 8 }
}
```

Rules:

1. Preserve the exact source string for display and support checking.
2. Do not add an ISO value or inferred year.
3. Do not compare, sort or calculate calendar distance against a full date.
4. A source-grounded connector may establish a relationship (`from`/`to`,
   `moved from`/`to`) without establishing a calendar year or doing date math.
5. Downstream UI receives the exact value, precision, meaning and relationship.
6. User-facing wording for `day_month` timing must make clear that the year was
   not stated when that affects reliance.
7. The current system clock must not affect extraction or meaning.

For an explicit full date, `precision` is `full_date` and `components.year` is
present. A two-digit year must keep existing behavior unless separately
specified; this workstream must not broaden or reinterpret it.

## 7. Deterministic semantic rules

### 7.1 Cue precedence

Role assignment must be clause-scoped and ordered from specific to general:

1. explicit reply deadline;
2. explicit payment due/deadline;
3. explicit appointment movement;
4. explicit appointment date/time;
5. explicit effective/start date;
6. explicit statement/as-of date;
7. explicit document/letter/issue date;
8. explicit period start/end;
9. other safely grounded event/context;
10. unknown.

The word `due` is insufficient by itself. Its subject determines meaning:

```text
payment is due on 20 August       → payment_due
parcel is due to arrive on ...    → other event, never payment_due
appointment is due on ...         → appointment only where appointment cues support it
```

Generic `on`, `from`, `to` and `due` fallbacks must not outrank specific cues.

### 7.2 Clause boundary

A cue may classify only a date in the same bounded clause or source-supported
pattern. It must not reach across sentence boundaries or an unrelated date.
The implementation may use deterministic bounded patterns; it does not require
a natural-language parser.

### 7.3 Unknown

A syntactically valid date with no safely established meaning may remain
`role: "unknown", meaning: "other"`. It may be retained as source evidence but
must not become an actionable key date, deadline, urgency signal or completed
progress item.

## 8. Multiple-date contract

1. Extract all supported dates in deterministic source order.
2. For structured sources, order by document order, segment order and source
   index. For compatibility text, order by source index.
3. Deduplicate only when normalized source value, role, meaning, relationship
   and source identity are all equivalent.
4. Identical values with different meanings or relationships remain distinct.
5. One date must never overwrite another date in `AdminCase.timingFacts`, the
   Result View Model or supporting evidence.
6. Display follows deterministic source order unless a component already has an
   explicitly approved priority order. V1 does not reorder dates by inferred
   chronology.

Required example:

```text
statement dated 20 August - payment is due on 5 September
```

produces, in source order:

```text
document_date/document_issued/day_month: 20 August
stated_deadline/payment_due/day_month: 5 September
```

The same rule applies to document date plus reply deadline.

## 9. Appointment movement and time

### 9.1 Moved appointments

For:

```text
your appointment has moved from 20 August to 27 August
```

produce two source-grounded facts:

```text
event_date + appointment + previous: 20 August
event_date + appointment + replacement: 27 August
```

Both remain inspectable. Result presentation must label them "Previous
appointment date" and "Replacement appointment date". The previous date must
not be presented as the appointment to attend, and neither date becomes a reply
or payment deadline. The explicit source relationship is allowed; no assumption
about later unseen changes is allowed.

`moved`, `rescheduled` and equivalent approved appointment-change cues must take
precedence over generic period-range handling and generic deadline keywords.

### 9.2 Appointment time

For:

```text
your appointment is on 20 August at 2pm
```

the `2pm` fact is attached to the appointment `ExtractedDate.time`. It is not a
standalone date, deadline, reminder or scheduled action.

Rules:

1. Preserve exact time text and its source index/quote.
2. Associate a time only with an appointment date supported in the same clause.
3. A valid appointment date without time remains valid with `time` absent.
4. A time with no safely associated appointment date is not promoted into
   `timingFacts` or result key timing. It may remain visible in the original
   source; V1 does not guess its event.
5. Do not convert 12/24-hour notation, timezone, locale or daylight-saving time.

## 10. Period-boundary contract

For:

```text
your contract runs from 1 September to 31 August 2027
```

produce:

```text
period_boundary + period + start: 1 September
period_boundary + period + end: 31 August 2027
```

The different precision is preserved. Neither fact becomes a reply deadline,
payment deadline, urgent action date or inferred contract duration.

Period classification requires a source-supported period subject or equivalent
bounded cue, such as contract/service/billing period wording. Generic
`from ... to ...` alone must not force a period. Appointment movement uses its
own specific rule, and unrelated date pairs remain separately classified or
unknown rather than being forced into a range.

## 11. Result View Model contract

No parallel result system is permitted. Trusted timing flows through the
existing `ResultDateView`/`keyDates` path, with the existing source quote and
role plus the minimum semantic metadata needed for labels and progress.

| Timing class | Display in Dates to check | Deadline? | Action/urgency implication |
|---|:---:|:---:|---|
| Reply deadline | Yes | Yes | Reply timing only; existing safety/precedence still applies |
| Payment due date | Yes | Yes | Source payment timing only; does not verify liability |
| Appointment date/time | Yes | No | Something to remember/check, not a reply requirement |
| Effective/start date | Yes | No | Change timing only; no automatic reply |
| Statement/as-of date | Yes | No | Context only |
| Document/letter date | Yes | No | Context only |
| Period start/end | Yes, paired labels | No | Period context only |
| Previous appointment | Yes | No | Historical/source relationship; not date to attend |
| Replacement appointment | Yes | No | Date to check/remember; not a reply deadline |
| Unknown trusted date | Supporting context only | No | None |
| Review-required timing | Evidence to review, not trusted key timing | No | None until reviewed |

Required labels must name the established meaning rather than collapse to "Date
or deadline". Yearless timing uses the exact source value and a brief caution
that the source did not state a year. Appointment time appears with its associated
date, not as a separate key-date row.

Unknown dates must not be used as opportunity deadlines. Existing specialist
opportunity fields may continue where grounded, but they must not contradict or
erase the shared typed facts.

## 12. Preparation-progress contract

`Key date checked` means that the result contains source-grounded timing with an
understood role and enough precision for the stated preparation purpose. It does
not mean that every displayed date is a deadline.

Use existing progress statuses; do not create a second progress model.

| Available timing | Expected status | Required meaning |
|---|---|---|
| Trusted full reply deadline | `complete` | Reply deadline found; user must check source |
| Trusted full payment due date | `complete` | Payment timing found; liability remains unverified |
| Trusted full appointment/replacement date | `complete` | Event timing found; not a reply deadline |
| Trusted full effective date | `complete` | Change timing found; no reply implied |
| Meaningful `day_month` deadline/event | `partial` | Role known, year not stated; check year before relying |
| Statement/document date only | `not_needed` | Context retained; no actionable timing established |
| Period start/end only | `not_needed` | Period retained; no immediate deadline established |
| Unknown-role date only | `missing` | Date shape alone is insufficient |
| Review-required OCR timing only | `partial` | Possible timing needs source review; never complete |
| No timing | `missing` | Existing no-timing behavior |

If multiple facts exist, the safest most useful state wins without hiding the
others: a trusted full deadline/event may complete the step; otherwise a
meaningful yearless or review-required fact makes it partial; contextual-only
timing makes it not needed; unknown-only timing remains missing.

Progress copy must distinguish:

```text
date exists
role is understood
source states an actionable deadline
```

It must not call appointments, effective dates, document dates or period
boundaries reply deadlines.

## 13. Source provenance and OCR review

### 13.1 Pasted or typed text

Retain exact `value`, `sourceQuote` and `index`. Validate displayed timing using
the existing shared source-support normalisation. No synthetic source text may
be introduced.

### 13.2 Structured source documents

When `AdminItem.sourceDocuments` is available:

1. resolve each timing fact to the existing `SourceDocument` and, where
   available, `SourceSegment` that supports the quote;
2. reuse `SourceProvenance` and its existing validation instead of creating a
   timing-specific citation system;
3. preserve page/photo identity already present on the segment;
4. do not reconstruct document identity from compatibility headings;
5. keep duplicate source occurrences distinct until document/segment identity
   safely resolves them.

### 13.3 Review state

A date/time whose source document or provenance is `review_required` may be
shown only as a value that needs checking against the original. It must not:

- enter trusted Result View Model `keyDates`;
- create a finding deadline;
- create urgency or a reply/payment instruction;
- complete timing progress;
- drive a draft, chase or external action.

It belongs in existing review/evidence-to-gather presentation and yields
`partial` preparation state. `unavailable` or invalid provenance fails closed
and contributes no displayed trusted timing. After explicit source review, the
ordinary extraction/support path runs again; a flag must not bless unsupported
text.

This workstream does not change OCR, confidence thresholds or review controls.

## 14. Reply-negation contract

The existing clause-scoped negation mechanism must cover at least:

```text
do not reply
do not need to reply
no reply is needed
```

A reply token inside one of these unambiguous spans cannot create:

- `important_reply` classification;
- reply urgency;
- a reply deadline;
- a prepared reply action.

For:

```text
your price changes on 1 September but you do not need to reply
```

the effective date remains trusted and displayable while reply urgency is absent.
Negation must suppress only the negated action; it must not erase an unrelated
source-grounded date.

## 15. Required acceptance matrix

All values below are exact source text. None may gain an inferred year.

| # | Input | Required timing | Prohibited result |
|---:|---|---|---|
| 1 | `my broadband goes from £34 to £46 on 1 September` | `effective_start`, `1 September`, `day_month` | Reply deadline; inferred year |
| 2 | `from 1 September your monthly price will be £46` | `effective_start`, `1 September`, `day_month` | Generic missing date; reply deadline |
| 3 | `please pay £500 by 20 August` | `payment_due`, `20 August`, `day_month` | £500 verified owed; reply deadline |
| 4 | `your balance is £500 as of 20 August` | `statement_as_of`, `20 August`, `day_month` | Payment deadline or verified liability |
| 5 | `your new tariff starts on 20 August` | `effective_start`, `20 August`, `day_month` | Reply urgency |
| 6 | `your appointment is on 20 August at 2pm` | appointment `20 August` with associated `2pm` | Reply/payment deadline |
| 7 | `please reply by 20 August` | `reply_deadline`, `20 August`, `day_month` | Payment deadline |
| 8 | `this change takes effect from 20 August` | `effective_start`, `20 August`, survives ordinary check after permitted clarification | Date discarded because domain is unresolved |
| 9 | `statement dated 20 August - payment is due on 5 September` | document date then payment due date | Either date lost or both collapsed |
| 10 | `your payment is due on 5 September` | `payment_due`, `5 September`, `day_month` | Generic event or parcel-arrival meaning |
| 11 | `your appointment has moved from 20 August to 27 August` | previous appointment then replacement appointment | Deadline; old date shown as date to attend |
| 12 | `your price changes on 1 September but you do not need to reply` | effective date; no reply urgency | Important reply finding |
| 13 | `letter dated 20 August, please reply by 5 September` | document date then reply deadline | Document date lost; both called deadlines |
| 14 | `your contract runs from 1 September to 31 August 2027` | period start `day_month`, period end `full_date` | Immediate reply/payment deadline; duration calculation |

Every matrix test must also assert source quotes, precision, deterministic order,
no automatic action and no money recovery/counting side effect.

## 16. Adversarial acceptance

The test suite must prove that a blanket "every date is a deadline" fix fails.

| Input | Required distinction |
|---|---|
| `appointment on 20 August` | Appointment; never reply/payment deadline |
| `balance as of 20 August` | Statement context; never payment deadline |
| `letter dated 20 August` | Document date; never deadline |
| `your tariff starts on 20 August` | Effective date; no reply urgency |
| `your parcel is due to arrive on 20 August` | Delivery event; never payment due |
| `your payment is due on 20 August` | Payment due; distinct from parcel example |
| `your appointment moved from 20 August to 27 August` | Appointment relationship; not a period or deadline |
| `service runs from 20 August to 27 August` | Period only where service/period cues support it |
| `20 August` | Unknown timing unless surrounding source meaning establishes a role |
| `reply about your payment on 20 August` | No deadline without an explicit by/due cue |
| `do not need to reply by 20 August` | Negated reply action; date must not become reply deadline |

Additional tests must prove that identical date values with different roles are
not deduplicated and that source order, not inferred chronology, controls output.

## 17. Test-first implementation contract

Implementation begins with failing behavioral tests, in this order:

1. `src/lib/__tests__/generalAdminExtraction.test.ts`
   - yearless dates, known components, role/meaning, relationships, time,
     multiple dates, periods and adversarial cues;
2. `src/lib/__tests__/ordinaryMessageDateRoles.test.ts`
   - complete extraction → case → Result View Model → progress propagation for
     all 14 cases;
3. existing ordinary-message negation tests or the smallest focused suite
   - the three required reply-negation forms and date coexistence;
4. `src/lib/__tests__/ordinaryMessageSourceFactIntegrity.test.ts`
   - support, source identity and no invented year;
5. existing photo/source-provenance submission suites
   - review-required OCR timing fails closed;
6. `src/lib/__tests__/resultViewModel.test.ts`
   - labels, display classes, multi-date ordering and no false deadlines;
7. `src/lib/__tests__/caseProgress.test.ts`
   - the status table in section 12;
8. a narrowly scoped Playwright browser regression
   - representative cases 1, 6, 9, 11, 12, 13 and 14.

Tests must assert both:

```text
required timing survives
AND
non-deadline timing does not become a deadline
```

Source-string tests are acceptable only for an exhaustive type/mapping contract
that cannot be exercised behaviorally. The primary coverage must be behavioral.

## 18. Implementation sequence and validation

After explicit specification approval:

```text
write focused failing tests
→ extend shared extracted timing
→ propagate through existing case timingFacts
→ compose role-aware existing Result View Model
→ make progress role-aware
→ run focused tests
→ run relevant regressions
→ run full serialized suite
→ lint
→ build
→ git diff --check
→ rerun browser matrix
→ adversarial review
```

At minimum run:

```powershell
npm test -- src/lib/__tests__/generalAdminExtraction.test.ts
npm test -- src/lib/__tests__/ordinaryMessageDateRoles.test.ts
npm test -- src/lib/__tests__/resultViewModel.test.ts src/lib/__tests__/caseProgress.test.ts
npm test -- --maxWorkers=1 --no-file-parallelism
npm run lint
npm run build
git diff --check
```

Relevant regression coverage must include security precedence, public-scope
evidence integrity, claimant resolution, refund lifecycle, source provenance,
storage safety and front-door ordinary-message preservation.

Browser reruns must record title/summary, Dates to check, evidence, preparation
progress and absence of false reply/payment deadlines for all 14 cases.

## 19. Protections that must remain unchanged

- security and risky-message precedence;
- public-scope urgency evidence integrity;
- existing `do not reply` behavior, extended rather than replaced;
- benefits/public-scope gating;
- deterministic benefits claimant resolution;
- refund lifecycle and received/pending/refused distinctions;
- source provenance and source-support validation;
- OCR confidence and review states;
- money display-only, no-liability and no-entitlement boundaries;
- explicit-save-only persistence;
- no automatic savings/recovery counting;
- no automatic saving, sending, replying, contacting, chasing or submission;
- existing front-door clarification and original-text preservation;
- Care Fee Reconciliation Phases 1–5.

Any regression in these protections is a stop condition, not an acceptable
tradeoff for better date coverage.

## 20. Dirty-worktree discipline

The likely shared implementation files already contain valuable uncommitted work
from adjacent workstreams. Before editing each file, the implementation agent
must inspect its current relevant content and diff, make the smallest local
change, and preserve unrelated modifications.

No clean/reset/restore/stash operation is permitted. No stale Git lock may be
removed without separate explicit authorization. Protected paths remain outside
inspection and implementation scope.

## 21. Likely implementation files

This is a forecast, not authorization to change every file:

- `src/lib/generalAdminExtraction.ts` — shared syntax, semantics, precision,
  relationships, time and negation;
- `src/types.ts` — only if existing timing facts need additive carried metadata;
- `src/lib/mockAnalysis.ts` — refined appointment/change and reply-negation use;
- `src/lib/caseFactory.ts` — trusted timing/provenance propagation;
- `src/lib/resultViewModel.ts` — typed labels, display and trust filtering;
- `src/lib/caseProgress.ts` — role/precision/review-aware progress;
- `src/lib/broadbandPriceRiseAssessment.ts` — remove inconsistent timing
  authority or consume shared facts if required by red tests;
- `src/lib/paymentReminderAssessment.ts` — consume shared payment timing if
  required by red tests;
- the focused tests named in section 17;
- one narrow browser regression spec.

No UI component should change unless browser testing proves the existing
component cannot render the corrected Result View Model. Copy-only or layout
cleanup is not authorized.

## 22. Explicit non-goals

This specification does not authorize:

- generic natural-language temporal reasoning;
- speculative year inference;
- timezone, locale or daylight-saving reasoning;
- recurrence or scheduling systems;
- automatic calendar creation;
- automatic reminders or chase dates;
- automatic chase-date generation;
- a full date-parser replacement;
- redesign of the ordinary-message engine or front door;
- broad UI redesign;
- Care Fee Reconciliation next-action/UI work;
- benefits eligibility or claimant-resolution changes;
- refund lifecycle changes;
- liability, entitlement, overcharge, refund-due or money-owed conclusions;
- unrelated money-role semantics;
- annualisation, cadence conversion or financial calculations;
- cloud processing, telemetry, network calls or new dependencies.

The separate issue in:

```text
your price increased by £12 to £46
```

is amount-role semantics and remains out of scope.

## 23. Definition of done

The workstream is complete only when:

1. all 14 acceptance cases pass through the full ordinary-message composition
   path and in the browser;
2. yearless dates remain yearless and source-grounded;
3. every required timing meaning in section 5.2 is deterministic;
4. multiple facts and explicit relationships survive independently;
5. appointment time remains associated with the correct date;
6. document, statement and period dates are visible but never promoted to
   deadlines;
7. progress matches section 12 for every timing class;
8. review-required OCR timing cannot become trusted timing;
9. the three reply-negation forms suppress reply urgency without erasing an
   unrelated effective date;
10. source quotes and structured provenance remain valid;
11. no money, liability, eligibility, refund, savings or external-action state
    changes because a date was extracted;
12. focused, relevant, full, lint, build and diff validation pass;
13. protected safety and adjacent workstreams remain unchanged;
14. no dependency is added;
15. a completion report lists exact files, test counts, browser evidence,
    remaining risks and intentionally unchanged behavior.

## 24. Approval record

- Investigation recommendation: `GO WITH CHANGES` on 13 August 2026.
- Specification status: explicitly approved by the human project owner on 13 August 2026.
- Implementation approval: **recorded on 13 August 2026**.

This approval authorises implementation of the exact specification revision; it
does not record the implementation itself as committed or published.
