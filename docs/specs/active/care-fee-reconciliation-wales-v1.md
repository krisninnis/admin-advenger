# Care Fee Reconciliation — Wales V1

## 1. Status

| Field | Value |
|---|---|
| Status | **Approved — Phase 1 only** |
| Workstream | `care-fee-reconciliation-source-provenance-v1` |
| Product proving ground | Care Fee Check — Wales |
| Reusable capability | Evidence Reconciliation |
| Date | 10 August 2026 |
| Owner | Human project owner instruction dated 10 August 2026 |
| Product principle | AI prepares. Humans decide. |

This specification defines architecture, provenance, deterministic comparison,
safety, evaluation, and human-control requirements. The current approval
authorises only the bounded, development-only Phase 1 source/provenance
foundation. It does not authorise:

- implementation of Phases 2–8;
- public or controlled release;
- user-visible interface or routing behaviour, or new persistence machinery;
- Wales policy or knowledge records;
- external research;
- automatic saving, sending, contacting, chasing, outcome recording, or money
  counting.

The human project owner instruction dated 10 August 2026 authorises Phase 1 as a
non-public foundation slice before the current pilot gate closes. Phase 1 may add
typed source documents, segment/page/photo identity, extraction metadata,
source-review state, fail-closed provenance validation, focused tests, and the
optional analysis handoff needed to carry those records beside `AdminItem.rawText`.
It may not add care-fee claims, comparison, reconciliation, Wales knowledge, UI,
new persistence, or automatic action. Phases 2–8, Wales policy research,
knowledge authoring, qualified review, activation, and release remain unapproved.

## 2. Problem statement

The narrow user problem is:

> “I have several letters, invoices and assessments relating to someone's care.
> Help me understand where the money is going, whether the documents agree with
> each other, and what I should ask about next.”

The first proving ground is **Care Fee Check — Wales**. It is not a separate care
application. It must reuse the existing AdminAvenger front door, local document
intake, OCR, findings, evidence, Result View Model, cases, timelines, drafts,
chase controls, exports, safety controls, and human-confirmation boundaries.

The reusable capability is **Evidence Reconciliation**: preserve factual claims
from more than one source, decide deterministically whether two claims are safely
comparable, describe their relationship without deciding legal or financial
correctness, and prepare a neutral next step.

Current multi-file intake labels attachments and combines their extracted text
into one `AdminItem.rawText`. That is sufficient for ordinary message analysis,
but not sufficient for auditable reconciliation. Stable document identity,
claim-level provenance, typed financial meaning, and explicit comparability are
missing.

## 3. Product boundary

### 3.1 V1 may

- accept up to three relevant documents through the existing local intake;
- identify explicitly evidenced care-fee financial claims;
- preserve the document and source passage supporting every material claim;
- retain page, photo, or segment identity when the intake route provides it;
- normalise money, cadence, roles, dates, and periods deterministically;
- compare only claims that pass the comparability gate in section 9;
- calculate exact same-cadence differences in integer pence;
- identify agreement, disagreement, explicit change over time, different
  periods, missing context, source-review needs, and non-comparability;
- produce a cautious `AdminFinding` through the existing result architecture;
- prepare a neutral, editable question for the user to review;
- offer the existing explicit save-as-case and subsequent human-controlled
  case actions.

### 3.2 V1 must not

- prove or imply an overcharge, error, illegality, liability, debt, or money owed;
- decide legal or contractual correctness;
- decide Continuing Healthcare or NHS-funded nursing contribution eligibility;
- decide whether a top-up or contract term is valid;
- infer a missing funding contribution by subtracting other figures from a total;
- infer an effective date or applicable period from upload or document order;
- decide that one document automatically supersedes another;
- treat a retrospective or one-off adjustment as a recurring contribution;
- silently convert weekly, four-weekly, monthly, or period-total amounts;
- tell the user to stop paying, withhold payment, accuse an organisation, or take
  a formal legal or funding step;
- automatically save a case, prepare or send a final communication, contact an
  organisation, start a chase, mark a result resolved, or count money;
- create a second care-specific finding, evidence, case, result, or action system.

### 3.3 Existing architecture to extend

The design should extend, not bypass:

- `AdminItem`, `AdminFinding`, `EvidenceItem`, `AdminCase`, `CaseTimelineEvent`,
  `PreparedMessageDraft`, and `OpportunityCard` in `src/types.ts`;
- multi-file intake in `src/lib/documentAttachmentIntake.ts`;
- local DOCX/PDF extraction in `src/lib/documentFileText.ts`;
- local OCR and confidence warnings in `src/lib/photoOcr.ts`;
- source support checking in `src/lib/sourceSupport.ts`;
- evidence meaning in `src/lib/evidenceKind.ts`;
- deterministic decision patterns in `src/lib/decisionEngine/`;
- result composition and safety in `src/lib/resultViewModel.ts`;
- cases and evidence construction in `src/lib/caseFactory.ts`;
- existing draft, chase, timeline, export, and explicit user-action flows;
- Wales provenance, review-date, staleness, and approval patterns in
  `src/lib/trustedWalesSignposting/trustedWalesSignposting.ts`.

Existing `rawText` behaviour must remain compatible while the optional typed
multi-document path is introduced.

## 4. Decision pipeline

The authoritative pipeline is:

```text
Source evidence
→ grounded extraction
→ typed, normalised claim
→ deterministic comparability/evaluation
→ reconciled state
→ trusted context
→ cautious finding
→ editable next step
→ human decision
```

| Stage | Input | Output | Allowed | Must not do | Provenance rule |
|---|---|---|---|---|---|
| Source evidence | User-selected text, photo, DOCX, PDF, or camera capture | Stable `SourceDocument` and optional segments | Read locally; preserve order, source label, warnings, and available page/photo identity | Upload, contact, persist original bytes by default, or claim extraction is perfect | Document identity begins here and must not be reconstructed later from prose headings |
| Grounded extraction | One source document or segment | Candidate facts with exact passages and confidence | Extract only what the source supports; retain ambiguity | Decide correctness, eligibility, or which document wins | Every material candidate fact keeps document and passage identity |
| Typed, normalised claim | Grounded candidate fact | Validated `FinancialClaim` | Parse integer pence, explicit cadence, roles, and dates; preserve unknowns | Guess a role, cadence, period, currency, or effective date | Claim provenance is required and source support is validated before trust |
| Comparability/evaluation | Two validated claims | Comparability decision and reasons | Apply the deterministic gate in section 9 | Use an LLM to decide core comparability or force a comparison | Decision links the exact claim IDs used |
| Reconciled state | Comparable claims or stopped comparison | State in section 10 and optional derived arithmetic | Calculate only authorised deterministic values | Convert a difference into fault, overcharge, entitlement, or money owed | Derived values retain both input claim IDs and remain distinct from source facts |
| Trusted context | Reconciled state plus eligible reviewed knowledge | Optional bounded explanation and provenance | Explain terminology, document type, Wales context, or signposting | Fill missing evidence, change a state, select a correct claim, or improvise stale knowledge | Knowledge has its own reviewed source/revision identity, separate from user evidence |
| Cautious finding | Reconciliation plus optional context | Existing `AdminFinding`/`ResultViewModel` output | State what documents say, the comparison state, uncertainty, and a safe question | State legal/financial correctness or hide cannot-know information | User-document facts, derived arithmetic, and knowledge context remain visibly distinct |
| Editable next step | Safe finding and source-supported claim references | Neutral draft/checklist or upload request | Prepare text for review and copy | Send, submit, contact, or add unsupported claims | Draft evidence references resolve only to accepted claims/context |
| Human decision | Prepared result and actions | Optional save, copy, chase, ignore, or later outcome | Let the user choose explicitly | Act because a finding exists | Existing explicit action and timeline boundaries remain authoritative |

Evidence, deterministic logic, knowledge, and user-facing wording are separate
layers. A later layer may narrow or explain an earlier result; it may not silently
rewrite the evidence or invent a fact needed by the comparison.

## 5. Source document contract

The implementation may choose different exact TypeScript names, but it must
provide an equivalent minimum contract:

```ts
type SourceDocument = {
  readonly id: string
  readonly displayName: string
  readonly intakeType:
    | "pasted_text"
    | "photo"
    | "camera_photo"
    | "text_file"
    | "docx"
    | "pdf"
  readonly documentClass:
    | "care_home_invoice_or_fee_statement"
    | "local_authority_assessment_or_contribution"
    | "funding_or_contribution_letter"
    | "other_unknown"
  readonly extractionMethod:
    | "user_text"
    | "browser_text"
    | "docx_text"
    | "pdf_text"
    | "local_ocr"
  readonly order: number
  readonly extractedText: string
  readonly warnings: readonly string[]
  readonly confidence?: {
    readonly level: "low" | "medium" | "high" | "unknown"
    readonly score?: number
    readonly reason: string
  }
  readonly segments?: readonly SourceSegment[]
}

type SourceSegment = {
  readonly id: string
  readonly text: string
  readonly pageNumber?: number
  readonly photoNumber?: number
  readonly order: number
}
```

Requirements:

1. `id` is stable for the lifetime of the preview and, only after explicit save,
   for the saved case.
2. Display names are metadata, not parsing delimiters inside a single string.
3. `documentClass` is a narrow V1 classification, not a statement that the
   document is legally effective or current. `other_unknown` remains valid and
   must not be forced into a care-fee class.
4. PDF extraction should preserve page records as well as any compatibility
   combined text.
5. A photograph may use its attachment/photo number as its V1 segment identity.
6. DOCX and pasted text need no invented page number; exact passage plus document
   identity is sufficient.
7. Empty, failed, or unsupported documents remain visible as failed/missing input
   and contribute no trusted claim.
8. Existing `AdminItem.rawText` may remain as a compatibility rendering of the
   documents, but reconciliation must consume typed documents, not parse its own
   synthetic filename headings.
9. Original file bytes, images, or binaries are not persisted by default. This
   specification does not introduce a document-management system.
10. Extracted text and provenance are saved only through the existing explicit
   user save boundary or another separately approved confirmation flow.

## 6. Claim provenance contract

> Every material financial claim used in reconciliation must be traceable to
> source evidence.

The minimum conceptual contract is:

```ts
type ClaimProvenance = {
  readonly claimId: string
  readonly sourceDocumentId: string
  readonly sourceSegmentId?: string
  readonly pageNumber?: number
  readonly photoNumber?: number
  readonly sourceQuote: string
  readonly extractionConfidence: {
    readonly level: "low" | "medium" | "high" | "unknown"
    readonly score?: number
    readonly reason: string
  }
  readonly reviewState:
    | "not_required"
    | "needs_review"
    | "user_confirmed"
    | "rejected"
}
```

The provenance validator must confirm:

- the source document exists;
- any segment/page/photo reference belongs to that document;
- `sourceQuote` is non-empty;
- the source passage is supported by the referenced source text using the shared
  controlled normalisation principle in `src/lib/sourceSupport.ts`;
- the claim ID and provenance claim ID agree;
- rejected or unresolved review states are not trusted.

Missing, invalid, or unresolved provenance fails closed. The candidate claim may
remain visible as “needs checking”, but it must not enter deterministic
reconciliation as trusted evidence.

When a user corrects OCR text, the corrected source segment and supporting quote
must be updated together or the claim must be re-extracted. A confirmation flag
must not bless a quote that no longer exists in the reviewed text.

Character offsets and OCR bounding boxes are not required for V1. If the same
quote occurs more than once and document/segment identity cannot disambiguate it,
the claim remains `needs_review` rather than choosing an occurrence.

## 7. Typed financial claim contract

The implementation may use a shared base type plus a Wales adapter, but V1 must
not introduce a universal financial ontology.

```ts
type CareFeeConcept =
  | "total_care_home_fee"
  | "resident_contribution"
  | "local_authority_contribution"
  | "nhs_contribution"
  | "third_party_top_up"
  | "one_off_adjustment"
  | "retrospective_adjustment"
  | "other_unknown_amount"

type ClaimCadence =
  | "weekly"
  | "four_weekly"
  | "monthly"
  | "invoice_period_total"
  | "one_off"
  | "unknown"

type CareFeePartyRole =
  | "resident"
  | "local_authority"
  | "nhs"
  | "third_party"
  | "care_provider"
  | "unknown"

type FinancialClaim = {
  readonly id: string
  readonly subjectId: string | "unknown"
  readonly providerId: string | "unknown"
  readonly concept: CareFeeConcept
  readonly amountMinor: number
  readonly currency: "GBP" | "unknown"
  readonly cadence: ClaimCadence
  readonly payerRole: CareFeePartyRole
  readonly payeeRole: CareFeePartyRole
  readonly documentDate?: string
  readonly assessmentDate?: string
  readonly effectiveDate?: string
  readonly periodStart?: string
  readonly periodEnd?: string
  readonly provenance: ClaimProvenance
}
```

Contract rules:

- `amountMinor` is a non-negative integer number of pence. A negative source
  amount is represented through an explicit adjustment direction, not a negative
  arithmetic shortcut, if a later approved implementation needs that distinction.
- `subjectId` is an internal case-local identifier or `unknown`, not necessarily
  the resident's name. V1 does not create a general people model.
- `providerId` is a case-local, source-supported identifier used to distinguish
  care providers. It is not a cross-user organisation registry.
- `other_unknown_amount` may be displayed with its source but is not automatically
  compared to a typed contribution or fee.
- Contribution types must come from source-supported wording. A model may suggest
  a candidate type, but ordinary typed logic and review rules decide whether it
  is trusted.
- `nhs_contribution` means only that the source explicitly describes an NHS
  contribution. It does not imply FNC or CHC eligibility, correctness, or scope.
- An assessment amount and an invoiced amount may be compared only after all
  section 9 dimensions pass; their different document origins do not themselves
  establish disagreement or error.

## 8. Normalisation rules

### 8.1 Money

- Parse GBP into integer pence.
- Preserve the exact source passage for display and audit.
- Core comparison and difference arithmetic must not use floating-point pounds.
- Currency must be explicit. `unknown` currency blocks amount comparison.
- Currency encoding normalisation may recognise supported pound/GBP variants,
  but must not turn an unsupported question mark or OCR fragment into currency.
- Formatting back to pounds happens only after calculation.

### 8.2 Cadence

V1 represents at least:

- `weekly`;
- `four_weekly`;
- `monthly`;
- `invoice_period_total`;
- `one_off`;
- `unknown`.

Cadence is part of the claim, not a display suffix. Different or unknown cadences
do not pass comparison. V1 does not silently treat four-weekly as monthly, divide
an invoice total into a weekly rate, or calculate a monthly equivalent from a
weekly value. Any future conversion policy requires its own explicit approval,
formula, labels, rounding rules, and tests.

### 8.3 Dates and periods

The following meanings remain distinct:

- `documentDate`: when the document says it was issued;
- `assessmentDate`: when an assessment occurred or was recorded;
- `effectiveDate`: when a stated amount starts to apply;
- `periodStart`/`periodEnd`: the fee, invoice, assessment, or funding period to
  which a claim applies.

An upload date, filename date, document order, or later position in combined text
must not become an effective date. Dates are normalised only when unambiguous;
otherwise the source wording remains visible and the typed date remains unknown.

### 8.4 Roles

Where source evidence allows, retain these roles:

- resident;
- local authority;
- NHS;
- third party;
- care provider;
- unknown.

Payer and payee are separate. “Council contribution” does not by itself prove
which provider received it or that it was applied to a particular invoice.
Unknown roles remain unknown and can block comparison.

## 9. Comparability gate

The core comparability decision is deterministic typed application logic. An LLM
may extract a candidate claim or explain the resulting state, but it must not
decide whether two claims pass this gate.

### 9.1 Evaluation order

For a candidate pair:

1. Validate both claims and their provenance.
2. Apply OCR/source-review rules.
3. Check concept and recurring/adjustment class.
4. Check subject.
5. Check payer and payee/provider roles.
6. Check currency.
7. Check cadence.
8. Check effective dates and periods.
9. Only then permit amount arithmetic.

The first blocking rule stops arithmetic and records all independently known
reasons useful to the user. A later stage cannot weaken an earlier failure.

### 9.2 Truth table

| Dimension | Condition | Comparable? | State or treatment |
|---|---|---:|---|
| Provenance | Both claims have valid document/segment support | Continue | Claim IDs and provenance travel into the result |
| Provenance | Missing, invalid, rejected, or ambiguous support | No | `needs_source_review` when correctable; otherwise `not_safely_comparable` |
| OCR/review | Both material values are accepted under the approved confidence/review rule | Continue | Preserve confidence in output |
| OCR/review | A material amount, cadence, concept, or date needs review | No | `needs_source_review` |
| Concept | Same known contribution/fee concept | Continue | Exact concept retained |
| Concept | Different concepts | No | `not_safely_comparable`; both facts may still be displayed |
| Concept | Either concept is `other_unknown_amount` | No | `missing_context` if classification may be resolved; otherwise `not_safely_comparable` |
| Subject | Same explicit case-local subject | Continue | Subject does not need to be displayed by name |
| Subject | Different explicit subjects | No | `not_safely_comparable` |
| Subject | Unknown and the documents could concern different people | No | `missing_context`; invite confirmation, do not infer |
| Payer | Same known payer role | Continue | — |
| Payer | Different known payer roles | No | `not_safely_comparable` |
| Payer | Unknown where payer identity matters | No | `missing_context` |
| Payee/provider | Same known provider/payee, or explicit evidence establishes the same destination | Continue | — |
| Payee/provider | Different known providers/payees | No | `not_safely_comparable` |
| Payee/provider | Unknown where provider identity matters | No | `missing_context` |
| Currency | Same explicit currency (`GBP` in V1) | Continue | — |
| Currency | Different known currencies | No | `not_safely_comparable` |
| Currency | Either currency is unknown | No | `missing_context` |
| Cadence | Same explicit cadence | Continue | Cadence remains on derived difference |
| Cadence | Weekly vs four-weekly vs monthly vs period total | No | `not_safely_comparable`; no conversion |
| Cadence | Either cadence unknown | No | `missing_context` |
| Charge class | Both are recurring base amounts of the same concept | Continue | — |
| Charge class | Recurring amount vs one-off/retrospective adjustment | No | `not_safely_comparable` |
| Adjustment | Same explicit adjustment concept, basis, and period | Continue only for equality/difference between the adjustments themselves | Never treat the adjustment as the base contribution |
| Period | Same explicit period | Continue | — |
| Period | Explicit recurring rates apply over a provable overlapping interval | Continue only over the intersection | Finding must name the shared interval |
| Period | Explicit non-overlapping periods | No direct discrepancy arithmetic | `different_periods`; may become `changed_over_time` only under section 10 conditions |
| Period | Missing period/effective information needed to establish overlap | No | `missing_context` |
| Effective date | Different explicit dates establish an earlier and later value for the same concept | Chronological comparison allowed | Candidate `changed_over_time`, not automatic supersession |
| Effective date | One or both dates unknown and no period resolves applicability | No | `missing_context` |

Passing the gate means the values may be compared arithmetically. It does not
mean either value is correct, payable, lawful, current, or applied in practice.

## 10. Reconciliation states

Only these states are required for V1:

| State | Trigger | Arithmetic | User-facing meaning | Prohibited interpretation |
|---|---|---|---|---|
| `agreement` | Two claims pass the gate and have equal `amountMinor` | Equality only; difference may be shown as zero only if useful | “These comparable documents state the same amount for the stated period.” | The amount is correct, owed, or properly applied |
| `disagreement` | Two claims pass the gate and contain different amounts without sufficient explicit chronology for `changed_over_time` | Exact difference and ordering allowed | “These comparable documents contain different figures.” | Overcharge, error, illegality, liability, or money owed |
| `changed_over_time` | Same concept/roles/cadence with explicit, ordered effective dates or non-overlapping ordered periods establishing earlier and later stated values | Earlier/later values and exact difference allowed | “The documents show the stated amount changing from X to Y from/on the explicit date.” | The later document legally supersedes the earlier one or the change is valid |
| `different_periods` | Valid claims refer to explicit non-overlapping periods without an authorised same-time comparison | No discrepancy arithmetic; date ordering allowed | “These documents cover different periods.” | Agreement or disagreement about one period |
| `missing_context` | A required concept, role, cadence, date, period, subject, or document is absent/unknown and could make comparison possible | No amount arithmetic | “More information is needed before these figures can be compared.” | Missing means zero or confirms the user's preferred explanation |
| `needs_source_review` | A material claim has low/suspicious OCR, ambiguous repeated support, or a correctable provenance/review problem | No amount arithmetic | “Check this amount/cadence/date against the source before comparison.” | The extracted value is probably correct or may be used provisionally |
| `not_safely_comparable` | Known incompatibility such as different concepts, payer roles, providers, currencies, cadences, or recurring/one-off class | No cross-claim amount arithmetic | “These figures refer to different things and should not be directly compared.” | One figure explains, cancels, or proves the other |

State precedence for a pair is:

```text
needs_source_review
→ not_safely_comparable
→ missing_context
→ different_periods
→ changed_over_time / agreement / disagreement
```

The precedence prevents a visually compelling difference from hiding a source or
comparability problem.

## 11. Deterministic calculations

Ordinary typed application logic must perform:

- amount equality;
- amount difference in integer pence;
- amount ordering;
- ISO date ordering after unambiguous normalisation;
- exact period equality;
- exact overlap/non-overlap and intersection boundaries;
- earlier/later selection only from explicit effective dates or periods;
- totals only where source evidence explicitly identifies compatible components,
  the same period, currency, cadence, subject, payer/payee meaning, and the total
  relationship.

Rules:

1. Core calculations use integer minor units.
2. A derived result links all input claim IDs.
3. Derived values are `derived` evidence, never `source_fact` evidence.
4. No missing value is converted to zero.
5. No unknown cadence or period is filled from convention.
6. No weekly-to-monthly, four-weekly-to-monthly, daily-to-weekly, or period-total
   conversion is authorised in V1.
7. Rounding policy is not needed for same-cadence subtraction. Any future
   calculation needing rounding requires a separately approved rule.
8. A sum must not imply that listed contributions have actually been received or
   applied to the invoice.

Example:

```text
£521/week - £486/week = £35/week
```

is permitted only after both claims pass the gate. The result means “difference
between the two stated comparable figures”, not “overcharge” or “money owed”.

## 12. OCR and source-review rule

OCR error is a P0 safety risk because an incorrect but plausible digit or cadence
can create a convincing false discrepancy.

A material claim enters `needs_source_review` when any of these applies:

- document or segment OCR confidence is below the approved threshold;
- OCR warnings indicate garbling, cropping, poor image quality, or uncertain text;
- the amount has an implausible magnitude relative to neighbouring source text;
- currency, decimal placement, cadence, concept, or date is ambiguous;
- two OCR passes or repeated passages produce near-matching financial values;
- the exact passage cannot be uniquely tied to the claim;
- a user edit changes the supporting text after extraction.

Examples:

```text
Source: £486
OCR candidate: £4860
Result: needs_source_review; no comparison or £4,374 difference
```

```text
Source candidate: £521 monthly
Extracted cadence: weekly
Result: needs_source_review; no cross-cadence comparison
```

The review experience should ask the user to check the exact amount, currency,
cadence, contribution label, and applicable period against the original. The user
may correct or reject the candidate. Only a claim whose updated passage remains
source-supported can become `user_confirmed`.

The exact numeric thresholds and suspicious-value heuristics remain an
implementation approval decision. The safe default is to require review rather
than allow a material uncertainty into reconciliation.

## 13. Evidence mapping into existing AdminAvenger primitives

The reconciliation layer must use the existing evidence semantics:

| Reconciliation material | Existing evidence treatment | Required metadata |
|---|---|---|
| Source-linked financial claim | `source_fact` | Claim ID and full `ClaimProvenance` |
| Deterministic difference, ordering, or period relationship | `derived` | Input claim IDs and calculation description |
| Missing document, period, cadence, role, or explanation | `missing` | The exact missing field/evidence and why it blocks comparison |
| Reviewed Wales explanation or approved signposting | `informational` / existing result `evidenceContext` | Runtime knowledge/signposting reference, jurisdiction, verification/freshness data |

`EvidenceItem` may receive optional provenance/reconciliation metadata. Existing
producers without that metadata must remain valid. A new parallel evidence type or
Evidence Locker is not authorised.

The downstream flow is:

```text
source-linked claim
→ source_fact evidence

deterministic arithmetic
→ derived evidence

missing document/period/cadence
→ missing evidence

reviewed Wales explanation
→ informational/trusted context

reconciliation result
→ cautious AdminFinding
→ existing ResultViewModel
→ optional existing AdminCase
→ existing evidence/timeline/chase/export/draft flows
```

Additional boundaries:

- `AdminFinding` remains the finding unit; it may carry an optional reconciliation
  reference rather than embedding the full comparison model in prose fields.
- `ResultViewModel` remains the canonical user-facing composition layer. It must
  show source facts, derived context, missing evidence, uncertainty, and
  cannot-know information distinctly.
- `AdminCase.timeline` remains an action/history log. Effective dates and invoice
  periods stay on claims; they are not fabricated as timeline events.
- A case is created only after the existing explicit save action.
- Chase dates remain case-management suggestions and must not become source or
  Wales-policy deadlines.
- A dedicated care-fee neutral draft builder may use accepted claims and
  reconciliation results. Generic drafting must not invent the requested
  breakdown, amount, period, or legal position.

## 14. Knowledge boundary

> Knowledge may explain evidence. Knowledge may not supply missing evidence.

Knowledge enters only after source claims have been validated and deterministic
reconciliation has produced a state.

Acceptable knowledge use:

- explain what a document type appears to be;
- explain reviewed terminology;
- provide bounded, reviewed Wales-specific context;
- explain which missing information commonly distinguishes two document types;
- provide separately approved signposting.

Prohibited knowledge use:

- invent or estimate a missing contribution;
- infer that the resident owes a difference;
- fabricate a payer, provider, cadence, period, or effective date;
- choose which document is correct or current without source-supported rules;
- convert a policy statement into individual eligibility;
- replace stale, blocked, conflicting, or missing knowledge with model
  improvisation;
- change a reconciliation state so it appears more conclusive.

User-document provenance and knowledge provenance remain separate. User-facing
voices should remain distinguishable:

- “Your invoice states…” for document facts;
- “The difference between these comparable figures is…” for derived logic;
- “Reviewed Wales information checked on [date] explains…” for eligible context;
- “AdminAvenger suggests asking…” for prepared next steps.

If no eligible knowledge record exists, omit the explanation and keep the
evidence-based result. Absence of knowledge must not block a simple factual
comparison, but it may block policy interpretation.

## 15. Wales governance boundary

Wales-specific policy and knowledge are a separate governed workstream. This
specification performs no research and authorises no knowledge records.

Future research areas include:

- residential care financial-assessment terminology;
- resident-contribution terminology;
- local-authority contribution wording;
- third-party/top-up terminology and document boundaries;
- NHS-funded nursing contribution terminology;
- Continuing Healthcare correspondence boundaries;
- retrospective adjustments and effective-date conventions;
- differences between invoice period, assessment period, and funding period;
- Wales service context and any England-and-Wales legal distinction relevant to
  safe explanation;
- Welsh-language release requirements.

Future records should reuse the repository's governed patterns rather than create
another knowledge standard:

- authoritative source and exact public-safe provenance;
- explicit jurisdiction and consumption scope;
- access, verification, effective, and review/expiry dates;
- stale-state or fail-closed treatment;
- immutable revision or other exact reviewed identity where the canonical
  knowledge architecture requires it;
- human approval and separate activation;
- allowed wording, required qualifiers, and prohibited conclusions;
- conflict, retirement, and replacement handling.

`src/lib/trustedWalesSignposting/trustedWalesSignposting.ts` is the current
implemented Wales pattern for jurisdiction, provenance, verification dates,
review dates, stale display, limitations, and human approval. The draft Estate
Administration knowledge specifications describe a stronger general claim
governance direction but do not themselves authorise care-fee records or runtime
use. A future approved workstream must decide which canonical form applies before
authoring any Wales care-fee knowledge.

Knowledge availability never authorises a public route. Product/public-scope
approval must occur before knowledge selection.

## 16. Safety language contract

### 16.1 Permitted language

```text
This invoice states £521 per week.

The assessment letter states £486 per week.

These comparable figures differ by £35 per week.

I cannot determine from the documents currently available whether that
difference is incorrect.

These documents may cover different periods.

You may want to ask for a breakdown explaining the difference.
```

Additional safe patterns:

- “I found two figures described as resident contributions.”
- “The documents give different effective dates.”
- “The period for this amount is not clear, so I have not compared it.”
- “Check this extracted figure against the original before relying on it.”
- “The funding letter states a start date of X. The invoice for period Y states
  Z. I cannot tell from these documents how the contribution was applied.”
- “No funding letter was provided, so I cannot reconcile that part of the cost.”

### 16.2 Prohibited or guarded conclusions

AdminAvenger-generated output must not say or imply:

```text
You were overcharged.
The council acted illegally.
The care home owes you £X.
You are entitled to CHC or FNC.
This top-up is unlawful.
Stop paying.
This document proves fraud or theft.
The latest uploaded document is the legally binding one.
```

“Wrong”, “incorrect”, “unlawful”, “invalid”, “owed”, “entitled”, “stolen”, and
similar conclusion words require source attribution when quoted and must not be
presented as AdminAvenger's determination.

A user's allegation does not become a finding. For example, “they stole money
from me” may be acknowledged neutrally as the user's concern, but the finding is
limited to what the documents establish: a discrepancy, missing context, or no
safe comparison.

Every discrepancy result must state that a difference does not by itself prove an
error or overcharge.

## 17. Human-control contract

The feature preserves:

> AI prepares. Humans decide.

It must not automatically:

- save a case or source documents;
- generate a final communication and treat it as approved;
- send a draft or submit a form;
- contact a care provider, local authority, NHS body, adviser, or other person;
- start or schedule a chase;
- mark an issue resolved;
- record money as owed;
- count disputed or demanded money as saved or recovered;
- infer that an outcome happened;
- download, share, or export material.

The user must explicitly choose to save, prepare, copy, download, chase, ignore,
or record an outcome. Existing action confirmation, timeline, impact-ledger, and
no-send boundaries remain authoritative.

## 18. Care Fee Check — Wales V1 UX contract

### 18.1 Input

The controlled V1 accepts up to three relevant documents through the existing
front door:

1. latest care-home invoice or fee statement;
2. latest local-authority assessment or contribution document;
3. relevant funding or contribution letter, if available.

“Latest” is user guidance, not an inferred document fact. The engine uses explicit
document/effective/period dates, not upload order, to reason about time.

### 18.2 Result

#### Your care costs

Show only explicitly evidenced items:

- total care-home fee;
- resident contribution;
- local-authority contribution;
- NHS contribution;
- third-party/top-up contribution.

Each item shows amount, cadence, applicable period/date when known, document name,
and a way to inspect the supporting passage. Unknown or missing items stay
unknown; they are not displayed as zero.

#### What changed

Show only when safely comparable evidence supports it:

- previous stated amount;
- new stated amount;
- deterministic same-cadence difference;
- explicit effective date or periods.

Do not show this section merely because two documents were uploaded in an order.

#### Things worth checking

Possible items are:

- different comparable contribution figures;
- documents covering different periods;
- missing funding/supporting document;
- change with no explanation visible in the supplied documents;
- low-confidence amount, cadence, date, or contribution label;
- figures that are not safely comparable.

#### Next step

Offer only relevant, human-controlled options:

- ask for a breakdown;
- ask which assessment applies to a stated period;
- ask how an explicitly stated contribution was applied;
- upload missing evidence;
- review a questionable extracted value;
- prepare a neutral editable question;
- save as a case.

Nothing is saved or sent merely because the result is shown.

### 18.3 Neutral question pattern

Where a comparable difference exists, a prepared question may say:

```text
Please could you provide a breakdown explaining the resident-contribution
figures in the attached documents? The assessment document states £486 per week
for [period/date], while the invoice states £521 per week for [period/date].
Please confirm which figure applies to the invoice period and explain any other
charge or adjustment included.
```

Only accepted source facts may fill brackets. Unknown fields remain a checklist
item to complete before use. The user reviews and sends the message themselves.

## 19. Synthetic evaluation matrix

Expected claims and outcomes must be recorded before implementation. Fixtures are
synthetic and contain no real personal care records. “No calculation” means no
cross-claim amount arithmetic, though source amounts may still be displayed.

| # | Relevant input claims | Comparable? | Expected state | Allowed calculation | Expected cautious finding | Prohibited conclusion | Review or more evidence? |
|---:|---|:---:|---|---|---|---|---|
| 1 | Resident contribution £486/week in assessment and invoice; same resident/provider/period | Yes | `agreement` | Equality; optional £0/week difference | Both comparable documents state £486/week for the same period | The contribution is correct or properly applied | No, if provenance/confidence pass |
| 2 | Resident contribution £486/week vs £521/week; same resident/provider/period | Yes | `disagreement` | £35/week difference; ordering | Comparable documents contain different resident-contribution figures; available evidence does not explain correctness | Overcharge, error, £35/week owed | Ask for breakdown |
| 3 | Resident contribution £500/week in January vs £500/week in March; explicit non-overlapping periods | No direct same-period comparison | `different_periods` | Date ordering only | The amounts match, but the documents cover different periods | Agreement for one current period | Confirm which period matters if needed |
| 4 | Assessment £486/week effective January; invoice £521/week for August; no intervening assessment/change document | No direct discrepancy comparison | `different_periods` or `missing_context` when invoice applicability is unclear | Date ordering only | The assessment and invoice refer to different times; more evidence is needed to explain the later figure | Current invoice is wrong or old assessment still governs | Newer assessment/change notice |
| 5 | Invoice and assessment supplied; no referenced funding letter | Depends on claims being compared; funding reconciliation incomplete | `missing_context` | Same-period resident comparison only if it independently passes | No funding letter was provided, so the funding contribution cannot be reconciled | Missing contribution is zero or unpaid | Funding/contribution letter |
| 6 | £500 total care-home fee and £500 resident contribution | No | `not_safely_comparable` | None | The same amount is attached to different concepts | The resident owes the total fee or the figures agree | Check labels only if extraction uncertain |
| 7 | Funding start date 1 June in one letter and 1 July in another; same funding concept; status/currentness unclear | No until chronology/applicability established | `missing_context` | Date ordering only | The documents state different funding dates; the available evidence does not establish which applies | One date is wrong or funding is owed from June | Current decision/clarification |
| 8 | Resident contribution £486/week vs £486/month | No | `not_safely_comparable` | None; no conversion | The figures use different cadences and have not been compared | They are equal or one is an overcharge | Confirm cadence if source ambiguous |
| 9 | £1,944/four weeks vs £1,944/month | No | `not_safely_comparable` | None; no conversion | Four-weekly and monthly figures are not the same cadence | They are equivalent annual costs | No unless an approved future conversion rule exists |
| 10 | Invoice total £312 for a four-day partial week vs resident contribution £521/week | No | `not_safely_comparable` | Period-length/date analysis only | A partial-period total cannot be directly compared with the weekly rate | Partial invoice proves the weekly charge changed | Full invoice breakdown/period details |
| 11 | Base resident contribution £486/week and retrospective adjustment £140 | No | `not_safely_comparable` | None between base and adjustment | The adjustment is a separate kind of amount from the recurring contribution | Weekly contribution is £626 or £140/week | Adjustment basis and period |
| 12 | Recurring top-up £100/week and one-off administration charge £100 | No | `not_safely_comparable` | None | The same amount refers to recurring and one-off concepts | Duplicate charge or agreement | Check labels if unclear |
| 13 | Total care-home fee £1,200/week vs resident contribution £486/week | No | `not_safely_comparable` | None; do not subtract to infer funding | The figures describe different parts of the care costs | Council/NHS contribution is £714/week | Explicit contribution evidence |
| 14 | Source image appears to show £486; OCR candidate is £4,860 | No | `needs_source_review` | None | The extracted amount may contain an OCR digit error and must be checked | A £4,374 discrepancy exists | User checks/corrects original |
| 15 | £521/week candidate from low-confidence OCR; otherwise comparable claim exists | No | `needs_source_review` | None | Check the £521 figure and cadence before comparison | Provisional £35/week discrepancy | User confirmation or clearer image |
| 16 | Two resident amounts with one cadence missing | No | `missing_context` | None | One document does not clearly state how often the amount applies | Assume weekly from the other document | Source passage or clarification |
| 17 | Same concept/cadence but neither claim has a usable effective or fee period | No | `missing_context` | None | The periods are unclear, so the figures have not been compared | The newer upload supersedes the other | Period/effective-date evidence |
| 18 | User says “they stole money from me”; validated same-period claims differ by £35/week | Yes for claims, not allegation | `disagreement` | £35/week difference | The documents contain different figures; this does not establish why or whether either is incorrect | Theft, fraud, deliberate wrongdoing, overcharge | Ask for breakdown; specialist help if abuse concern is separately evidenced |
| 19 | User claims CHC/FNC eligibility; documents contain no explicit eligibility/funding decision | No eligibility claim enters reconciliation | `missing_context` | None | The supplied documents do not establish the claimed funding decision | Entitled/not entitled to CHC/FNC | Relevant decision letter or specialist advice |
| 20 | Two matching £486/week claims have source quotes but unresolved document/segment identity | No | `needs_source_review` | None | The values match, but their source provenance must be resolved before reconciliation | Proven agreement | Resolve document/segment provenance |

Each fixture must also assert:

- source facts remain separate from derived values;
- no unsupported date, cadence, role, period, or amount appears;
- uncertainty and cannot-know wording remain visible;
- disputed/demanded amounts are not counted;
- no case, draft send, chase, or outcome is created automatically;
- security, urgency, safeguarding, and existing public-scope precedence are not
  weakened.

Later evaluation may use separately governed, consented, redacted real documents.
Such material must not be committed as public fixtures or sourced from a private
evaluation corpus during ordinary development.

## 20. Acceptance criteria

The complete V1 is implementation-ready only when a human approver can answer
yes to every item below and records any approved correction in this document.
The current Phase 1 approval covers only the evidence/identity foundation and
does not imply approval of unchecked requirements for later phases.

### Evidence and identity

- [ ] Source evidence is defined as user-selected text extracted locally and
  retained under stable document/segment identity.
- [ ] Multi-document identity survives beyond combined `AdminItem.rawText`.
- [ ] Every material financial claim points to a valid document and exact passage.
- [ ] Missing or invalid provenance fails closed.

### Claims and normalisation

- [ ] The V1 care-fee concept vocabulary is accepted as sufficient and narrow.
- [ ] Money uses integer pence and explicit currency.
- [ ] Weekly, four-weekly, monthly, invoice-period total, one-off, and unknown
  cadence remain distinct.
- [ ] Document, assessment, effective, and fee-period dates remain distinct.
- [ ] Subject, payer, and payee/provider roles remain explicit or unknown.

### Comparison and states

- [ ] The deterministic comparability truth table has no LLM decision dependency.
- [ ] Comparison stops for invalid provenance, source-review needs, incompatible
  concepts/roles/currencies/cadences/charge classes, and insufficient period data.
- [ ] The seven reconciliation states have non-overlapping meanings and stated
  precedence.
- [ ] Every permitted calculation is ordinary typed logic and produces derived
  evidence.
- [ ] No speculative cadence conversion is authorised.

### Architecture fit

- [ ] Results map into existing evidence, findings, Result View Model, cases,
  timelines, drafts, chase, and export flows.
- [ ] No parallel care-specific platform primitive is required.
- [ ] Existing ordinary-message and single-source behaviour can remain compatible.

### Knowledge and safety

- [ ] Knowledge enters only after source claims and deterministic reconciliation.
- [ ] Wales policy research/records remain separately governed and unapproved by
  this specification.
- [ ] Difference found is explicitly not overcharge proven.
- [ ] Eligibility, legality, contractual validity, money owed, and stop-payment
  conclusions remain prohibited.
- [ ] OCR uncertainty blocks comparison until source review where required.

### Human control and evaluation

- [ ] Save, draft use, send, contact, chase, resolution, export, and outcome remain
  explicit user actions.
- [ ] Disputed money is never counted as saved, recovered, or owed.
- [ ] All 20 synthetic fixtures have expected claims, comparability, state,
  calculation, finding, prohibited conclusion, and review requirements recorded
  before implementation.
- [ ] Private or personal care records are not required for implementation tests.

There must be no ambiguity:

```text
difference found
≠
overcharge proven
```

The latter is outside V1.

### 20.1 Required validation after implementation approval

An approved implementation specification must name focused behavioural suites and
then require the repository's complete validation workflow. At minimum:

```powershell
npm test
npm run lint
npm run build
git diff --check
```

It must also require manual source/provenance inspection, low-confidence OCR
review, accessibility checks, mobile/desktop result checks, and a check that no
action or money state changed without user confirmation.

## 21. Explicit non-goals

The current Phase 1 approval does not authorise:

- production implementation outside the Phase 1 source/provenance foundation;
- tests or fixtures outside the focused Phase 1 contract and regressions;
- UI or route implementation;
- public or controlled release;
- a care-specific parallel finding, case, evidence, result, timeline, or draft
  system;
- a universal claims ontology;
- a generic rule language or rules DSL;
- knowledge corpus authoring or activation;
- web research or source collection;
- Welsh policy hard-coding in prompts, components, or comparison code;
- scanned-PDF OCR work;
- original-file persistence or a document-management system;
- automatic eligibility, legal, contractual, financial, safeguarding, or care
  decisions;
- a broad Wales or UK care-funding engine;
- CHC/FNC eligibility logic;
- cadence-conversion policy;
- live policy retrieval, monitoring, telemetry, cloud processing, or uploads;
- provider, council, NHS, email, or messaging integrations;
- implementation for broadband, energy, benefits, estates, insurance,
  employment, subscriptions, refunds, or other future reconciliation domains;
- changing the current pilot roadmap or declaring a specialist category public.

## 22. Proposed implementation sequence after approval

Only Phase 1 may begin under the current approval. Every later phase requires a
separate recorded approval and must preserve existing behaviour outside its named
slice.

### Phase 1 — stable source-document and provenance foundation

- Add optional typed document/segment identity beside compatibility `rawText`.
- Preserve local-only extraction warnings and confidence.
- Validate exact source support.
- Add no care-specific comparison or UI yet.

### Phase 2 — typed financial claims

- Add the narrow financial-claim envelope and care-fee vocabulary.
- Implement deterministic money/cadence/date/role normalisation.
- Add source-review state and fail-closed claim validation.

### Phase 3 — deterministic comparability and reconciliation

- Implement the section 9 gate and section 10 states as pure typed logic.
- Add integer-pence calculations and derived-evidence records.
- Make all 20 synthetic matrix cases pass at the domain layer.

### Phase 4 — controlled Care Fee Check result

- Compose “Your care costs”, “What changed”, and “Things worth checking” through
  the existing Result View Model.
- Keep the feature controlled/non-public unless separately approved.
- Preserve security, urgency, safeguarding, and public-scope precedence.

### Phase 5 — safe finding, draft, and case integration

- Produce a cautious existing `AdminFinding`.
- Add the neutral editable question pattern.
- Reuse explicit save, existing case evidence, timeline, chase, export, and draft
  actions without automatic side effects.

### Phase 6 — synthetic and redacted evaluation

- Run unit, provenance, integration, safety, accessibility, and cross-domain
  regression coverage.
- Evaluate separately governed redacted documents only after expected records are
  fixed and privacy approval exists.
- Measure false comparison, missed comparison, provenance, OCR review, and safety
  failures separately.

### Phase 7 — separate Wales knowledge and governance review

- Conduct separately approved primary-source research.
- Select the canonical knowledge governance pattern.
- Obtain qualified domain/safety and human approval for exact records.
- Keep knowledge optional and downstream of reconciliation.

### Phase 8 — controlled release decision

- Resolve roadmap timing, public scope, Welsh-language requirements, staleness
  operations, user research, and qualified review.
- Release only after explicit human approval of the exact capability and knowledge
  revisions.

## Approval record and decisions deferred to later phases

1. **Resolved for Phase 1:** the non-public foundation may begin before the
   current closed-pilot gate closes.
2. **Resolved for Phase 1:** this slice is development-only, not a controlled
   beta or release.
3. **Deferred:** exact material financial-claim thresholds. Phase 1 reuses
   existing generic OCR reliability semantics and adds no care-fee threshold.
4. **Deferred:** confirmation rules for `subjectId`, payer, and provider identity.
5. **Resolved for Phase 1:** structured extracted text and provenance may travel
   beside `AdminItem.rawText`; original binaries are excluded and no new storage
   machinery or automatic save is authorised.
6. **Resolved for Phase 1:** provenance remains a separate reusable source type;
   `EvidenceItem` is unchanged.
7. **Deferred:** the canonical Wales knowledge-governance design.
8. **Deferred:** qualified reviewers and Welsh-language requirements before any
   Wales-facing release.
