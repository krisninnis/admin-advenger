# Ordinary Message Public-Scope Evidence Integrity V1

## 1. Status and authority

| Field | Value |
|---|---|
| Status | **Approved — implementation authorised; uncommitted and unpublished** |
| Workstream | ordinary-message-public-scope-evidence-integrity-v1 |
| Scope | Public ordinary-message communication evidence, classification, urgency and prepared-action integrity |
| Date | 13 August 2026 |
| Evidence base | Repository investigation and clean-main/dirty-tree behavioural comparison completed 13 August 2026 |
| Product principle | **AI prepares. Humans decide.** |

This document is the approved source of truth for the workstream. It settles the
behavioural and implementation boundary. The human project owner explicitly
approved this exact revision on 13 August 2026. Implementation is authorised but
remains uncommitted and unpublished.

## 2. Outcome

AdminAvenger must preserve what a public ordinary message actually says without
turning importance, urgency or a negated communication instruction into an
unsupported requirement to reply or act.

The core invariant is:

> **Source evidence, urgency, importance, reply requirements, action requirements, and preparation guidance are distinct concepts and must not be inferred from one another without source support.**

When the source requests a reply, AdminAvenger may prepare a reply. When the
source says not to reply, AdminAvenger must not offer a reply draft. When the
source merely says Important, AdminAvenger may preserve that importance but must
not invent correspondence. When no source-grounded correspondence action exists,
preparation remains a review/checklist activity under human control.

## 3. Confirmed problem

The live-main-equivalent committed tree has two related failure classes.

First, src/lib/caseFactory.ts creates an Urgent wording evidence row for every
important_reply finding. If it cannot find matching source wording, it inserts
the unsupported value Reply or action wording found. This causes passive
public-scope preparation cases, including PIP-review messages, to present
fabricated source evidence.

Second, the current ordinary-message classification and action pipeline
conflates several concepts:

- Important, urgent, final notice, reply, respond, response needed and please
  confirm all feed the important_reply rule;
- reply negation covers common reply forms but not equivalent respond/response
  forms;
- importance alone can produce the title Important reply needed;
- no-action and important_reply opportunity paths can still fall through to a
  generic correspondence draft;
- Result View Model and guided-next-step fallbacks can therefore recommend
  correspondence even after positive reply evidence has been removed.

The preserved dirty caseFactory change correctly removes the fabricated
fallback and uses the existing negation mechanism when selecting evidence. It
is necessary but not sufficient for this specification.

## 4. Governing behavioural invariants

### 4.1 Source grounding

Every positive communication evidence row must contain wording actually present
in the accepted source. Generic summaries such as Reply or action wording found
must never be presented as source evidence.

If no supported wording exists, omit the positive evidence row. Do not guess.

### 4.2 Semantic separation

The following are independent:

1. importance — the sender marks material as important;
2. urgency — the sender uses time-pressure wording or a source-grounded timing
   fact establishes urgency;
3. reply requirement — the sender explicitly requests a reply or response;
4. action requirement — the sender explicitly requests a non-reply action;
5. preparation guidance — AdminAvenger suggests how the human can review or
   prepare.

No item in this list proves another.

### 4.3 Negation is targeted and local

A supported negation suppresses only the communication action it negates. It
must not erase:

- importance in another clause or sentence;
- an unrelated payment, appointment, effective or document date;
- security signals;
- money or refund facts;
- an independent non-reply action;
- a later positive request outside the negated clause.

### 4.4 Human control

AdminAvenger may prepare editable text or a checklist only when that preparation
matches a source-grounded need. It never sends, saves, contacts, chases,
schedules, submits or marks an outcome automatically.

## 5. Shared communication assessment

V1 extends the existing ordinary-message extraction architecture with one pure,
deterministic shared communication assessment. It must not introduce a parallel
public-message classifier.

The minimum semantic model is:

| Signal | Meaning | May affect | Must not imply |
|---|---|---|---|
| importance | Sender used supported importance wording | Importance evidence; review priority | Urgency, reply, deadline or action |
| urgency | Sender used supported urgency/pressure wording | Urgency evidence and existing urgency policy | Reply or generic action |
| reply_request | Sender explicitly requested a reply/response outside negation | Reply evidence; reply preparation; reply deadline when independently supported | Any unstated deadline |
| action_request | Sender explicitly required a non-reply action outside negation | Action evidence and grounded preparation | Reply or correspondence draft |

The shared assessment must expose source-supported signals and targeted
negations. Each positive signal must carry:

- kind;
- exact matched value;
- source quote;
- source offsets or an equivalent deterministic source location;
- negated state, with only non-negated signals eligible as positive evidence.

All consuming layers must use this shared assessment or a carried result from
it. They must not maintain divergent regular-expression lists for the same
communication meaning.

An additive internal type is expected in generalAdminExtraction.ts. A new
persisted framework or new production dependency is not required. If the
assessment is recomputed by more than one layer, every layer must call the same
pure exported helper.

## 6. Importance, urgency, reply and action rules

### 6.1 Standalone importance

Supported V1 importance wording includes Important and Important notice.

Standalone importance:

- produces Importance wording evidence using the exact source wording;
- must not produce Urgent wording, Reply request or Action request evidence;
- must not use the title Important reply needed;
- must not create a reply deadline or reply draft;
- may raise an otherwise unclassified ordinary message to a medium review
  priority, but never to high urgency solely because it says Important;
- uses the ordinary title Important message to check when no stronger
  specialist or public-scope title already applies;
- preserves a stronger existing public-scope title such as This needs a careful
  human review.

Importance is sender-attributed. User-visible copy must not imply that
AdminAvenger independently verified importance or urgency.

### 6.2 Urgency

Supported urgency wording, including explicit urgent or final notice wording,
may remain source-grounded urgency evidence and may affect existing urgency
policy. Urgency alone does not establish a reply or action request.

A source-grounded deadline may affect urgency through the existing date-role
contract. A word such as reply without a deadline cue must not manufacture a
date.

### 6.3 Reply request

A positive reply request requires a supported reply/respond/response
construction outside a targeted negation. Examples include:

- Please reply;
- Please respond;
- A response is required;
- Reply by 20 August.

A reply draft may be offered only when a positive reply request exists or a
specialist path independently and explicitly authorises correspondence.

### 6.4 Action request

V1 includes explicit action-required semantics because action required and no
action required already participate in the existing ordinary-message
architecture.

Supported positive action requests include unambiguous wording such as Action
required and Please confirm. They produce Action request evidence, not Reply
request evidence.

An action request may lead to a source-grounded checklist or preparation step.
It does not automatically authorise a correspondence draft.

### 6.5 Contact wording

General contact/contact-us semantics are a deliberate V1 non-goal. Contact can
be optional, conditional, a channel description or a true requirement.

Existing date-role behaviour for an explicit construction such as contact us by
20 August remains unchanged. V1 must not add broad contact-keyword routing or
infer a reply from contact. A future specification may type optional and
required contact instructions.

## 7. Evidence labels and presentation

The generic ordinary-message branch must use distinct labels:

- Importance wording;
- Urgency wording;
- Reply request;
- Action request.

The current generic Urgent wording label is not appropriate because it combines
importance, urgency and communication action. It must be retired for newly
analysed generic communication evidence.

This change does not rename unrelated specialist/security evidence labels and
does not migrate historical locally saved records. No existing case is silently
rewritten or saved.

Negative wording must never be placed under a positive label. If a source
statement such as No reply is needed is useful to display, it may appear as a
source statement or informational context, not as Reply request evidence.

## 8. Negation model

### 8.1 Required V1 constructions

Matching is case-insensitive and tolerates ordinary apostrophe variants and
reasonable whitespace.

Reply-target negation must recognise at least:

- Please do not reply;
- Do not reply;
- Don't reply;
- You do not need to reply;
- You don't need to reply;
- No reply is needed;
- No reply is required;
- No reply needed;
- No reply required;
- No-reply.

Response-target negation must recognise at least:

- Please do not respond;
- Do not respond;
- Don't respond;
- You do not need to respond;
- You don't need to respond;
- No response is needed;
- No response is required;
- No response needed;
- No response required.

Action-target negation must preserve existing unambiguous forms:

- No action is required;
- No action required;
- No action is needed;
- No action needed;
- No further action;
- You do not need to do anything;
- You do not need to take any action.

### 8.2 Scope

Negation is action-targeted and clause/sentence-scoped.

A negated construction suppresses the reply, response or action token within
that construction. Its local clause ends at:

- a full stop, question mark or exclamation mark;
- a semicolon;
- a newline;
- an explicit contrast boundary such as but, however, although or yet.

A comma is not a boundary by itself, but a comma followed by an explicit
contrast term is.

The implementation must not suppress every signal merely because its source
offset falls inside one broad generic span. Target kind matters.

Examples:

- Important notice. Please do not reply. preserves importance.
- Please do not reply, but pay by 20 August suppresses reply and preserves the
  payment instruction/date.
- Do not reply to this email. Please respond through your secure account by 20
  August suppresses the first reply token and preserves the later response
  request and deadline.
- No response is required about delivery; payment is still due on 20 August
  suppresses response and preserves payment timing.

### 8.3 Conservative boundary

Ambiguous grammatical negation must fail closed for positive evidence. It may
produce no communication signal and request human review. V1 must not use a
language model, cloud service or broad sentiment inference to decide negation.

## 9. Classification and urgency contract

Classification follows this precedence:

1. existing email-security/high-risk precedence;
2. existing specialist and public-scope boundary precedence;
3. existing structured ordinary-message routes;
4. shared communication assessment;
5. existing safe unknown/no-action fallback.

Rules:

- security precedence always wins over ordinary communication signals;
- a positive reply request may use the existing important_reply category until
  a separately approved category migration exists;
- importance alone must not use important_reply;
- a negated reply/response must not keep important_reply alive;
- an action request without reply semantics must not use a reply-specific title
  or action;
- importance alone may set medium review priority but not high urgency;
- urgency wording may affect urgency but not correspondence;
- an unrelated source-grounded payment or response deadline remains governed by
  its typed date role.

No new public FindingCategory is required for V1. Importance-only ordinary
messages use the existing safe unknown/needs-human-check composition with the
title and evidence rules in this specification.

## 10. Result View Model contract

The composed result must:

- show only non-negated, source-supported positive communication evidence;
- keep importance, urgency, reply and action labels separate;
- omit the historical fallback Reply or action wording found;
- never turn Importance wording into Reply request;
- preserve typed dates, amounts, references and other independent facts;
- preserve source order when multiple communication facts are shown;
- retain existing evidence-kind semantics so only source facts count as
  evidence found;
- preserve uncertainty and human-control wording;
- never present a generated preparation suggestion as source evidence.

The Result View Model should consume corrected upstream case/opportunity data.
It must not become a second communication classifier. A narrow composition
change is permitted only if a failing behavioural test proves the existing
composer cannot faithfully render the corrected upstream semantics.

## 11. Best-next-move and guided-next-step contract

### 11.1 Genuine reply

When a positive reply request exists:

- a reply/draft action may be primary;
- the draft remains editable and never auto-sent;
- any displayed reply deadline must come from typed source timing;
- the action must not claim the reply has been sent.

### 11.2 Explicit no-reply/no-response

When reply/response is explicitly negated and there is no independent
source-grounded correspondence request:

- no reply draft may be primary or secondary;
- no button may say Create draft message, Reply, Respond or equivalent;
- a no-action message may offer Keep as a record;
- a message with independent facts may offer Review the source details;
- a preparation-only public-scope message may offer Review the source and decide
  who should look at it.

### 11.3 Standalone importance

Standalone importance uses:

- result title Important message to check unless a stronger existing title
  applies;
- best next move Review what needs attention;
- a review/checklist-style guided action;
- no correspondence draft without a separate positive reply request.

### 11.4 Passive public-scope preparation

A passive high-stakes message such as My PIP is being reviewed keeps the public
preparation boundary. It may recommend preserving the source, checking stated
facts and deciding who should review it. It must not default to a
correspondence draft merely because the case needs human preparation.

### 11.5 Independent action

If a non-reply action is source-grounded, the guided action may prepare a
checklist for that action. Reply remains unavailable unless independently
supported.

## 12. Source provenance and review state

### 12.1 Accepted pasted text

For accepted pasted or typed text, the evidence value and source quote must be
supported by the accepted text through the existing shared source-normalisation
rules.

### 12.2 Structured documents

Where structured source documents are available, communication evidence must
retain the existing source-document/segment provenance contract. A match must
not be attributed to an unrelated segment.

### 12.3 Review-required extraction

Review-required or unavailable source text must not silently become trusted
positive communication evidence. Existing provenance confidence and review
state continue to fail closed. This specification does not alter OCR,
confidence thresholds or review controls.

## 13. Required acceptance matrix

| # | Input | Required evidence/result | Required urgency/action | Prohibited |
|---:|---|---|---|---|
| 1 | Please reply by 20 August | Reply request: reply; Reply deadline: 20 August | Reply preparation may be primary | Invented date or payment meaning |
| 2 | Important: your account needs attention | Importance wording: Important; title Important message to check | Medium review priority; review/checklist action | Important reply needed; reply evidence/draft |
| 3 | Please do not reply | No positive communication evidence | Keep/review only; no correspondence | Reply urgency or draft |
| 4 | No reply is needed | Source statement may be shown; no positive reply evidence | Information-only/keep confirmation | Reply route or draft |
| 5 | You do not need to reply | Source statement may be shown; no positive reply evidence | Information-only/keep confirmation | Reply route or draft |
| 6 | You do not need to respond | No positive response/reply evidence | Information-only/keep confirmation | Important reply needed; draft |
| 7 | No response is required | No positive response/reply evidence | Information-only/keep confirmation | Important reply needed; draft |
| 8 | Please do not respond | No positive response/reply evidence | Keep/review only | Response evidence or draft |
| 9 | Important notice. Please do not reply. | Importance wording: Important notice | Review important notice; no correspondence | Important reply needed; reply evidence/draft |
| 10 | Urgent refund notice — send us your one-time passcode. Do not reply to this email. | Existing security evidence; legitimate security pressure evidence | Security checklist is authoritative | Ordinary reply case/draft |
| 11 | Please do not reply. Your payment is due on 20 August. | Payment due date: 20 August; no positive reply evidence | Existing source-grounded payment review | Lost date; reply urgency/draft |
| 12 | My PIP is being reviewed. | No invented urgency/reply evidence; public boundary title retained | Preparation/review checklist | Generic correspondence draft |
| 13 | My wife has a PIP review. | No invented urgency/reply evidence; public boundary title retained | Preparation/review checklist | Reply or action wording found |
| 14 | Important: this letter is about your PIP review. | Public boundary title plus Importance wording: Important | Careful human review; no reply unless separately requested | Important reply needed |
| 15 | Please do not reply. Your PIP is being reviewed. | No positive reply evidence; public boundary title retained | Preparation/review checklist | Reply evidence/draft |
| 16 | Do not reply, but please pay by 20 August. | Payment/action evidence and payment date preserved; no reply evidence | Grounded payment review; no reply draft | Document-wide suppression |
| 17 | Do not reply to this email. Please respond through your secure account by 20 August. | Later Reply request and reply deadline retained | Grounded response preparation may be offered | First negated reply treated as positive |
| 18 | Urgent: your account needs checking. | Urgency wording: Urgent | Existing urgency policy; review action | Reply evidence/draft without request |
| 19 | Action required: upload the completed form through your account. | Action request: Action required | Action checklist may be offered | Reply evidence/draft |
| 20 | No action is required. | No positive action evidence | Information-only/keep confirmation | Action checklist or reply draft |

Every matrix case must also assert:

- source support for each positive communication evidence value;
- no automatic save/send/contact/chase/submission/scheduling;
- no money counted as saved or recovered;
- no unrelated date, provenance, refund or security regression;
- consistent fresh and reconstructed local results where the existing harness
  supports reconstruction.

## 14. Adversarial counterexamples

The implementation must fail these unsafe shortcuts:

| Unsafe shortcut | Counterexample | Required distinction |
|---|---|---|
| Any reply token means reply required | Please do not reply | Negated reply |
| Reply-only negation covers response | No response is required | Response negation required |
| Important means urgent reply | Important notice. Please do not reply. | Importance without reply |
| Negation applies to whole document | Do not reply, but pay by 20 August | Payment survives |
| No urgent evidence means no urgency | Urgent: review your account; no reply needed | Urgency survives, reply does not |
| Any action means correspondence | Action required: upload the form in your account | Non-reply action |
| Any high-stakes preparation needs a draft | My PIP is being reviewed | Review/checklist only |
| Ordinary routing outranks security | Send us your passcode. Do not reply. | Security wins |
| Evidence omission alone fixes action | Please do not reply | No draft anywhere |
| Generic fallback is acceptable evidence | Passive PIP review | Unsupported row omitted |

Punctuation, mixed case, apostrophe variants, line breaks and repeated phrases
must not change the semantic result except where they create a defined
clause/sentence boundary.

## 15. Safety regressions that must remain unchanged

- security and sensitive-information precedence;
- public-scope benefits, debt, housing, workplace and specialist gating;
- source provenance and source-support validation;
- date-role meanings and reply/payment deadline separation;
- refund possible/promised/approved/issued/received/refused lifecycle;
- money display-only and no-liability/no-entitlement boundaries;
- evidence-kind semantics and honest evidence counts;
- local-first persistence and explicit-save-only behaviour;
- no automatic sending, saving, contacting, chasing, submission or scheduling;
- human review of every prepared draft/checklist;
- no Estate Administration activation or routing.

Any regression is a stop condition.

## 16. Test-first implementation sequence

Implementation must proceed in this order after explicit approval:

1. Expand
   src/lib/__tests__/ordinaryMessagePublicScopeEvidenceIntegrity.test.ts with
   the complete acceptance matrix. Assert composed evidence, title, urgency,
   Result View Model best-next-move and guided primary/secondary actions. Confirm
   the uncovered cases fail before production changes.
2. Add focused shared-assessment tests to
   src/lib/__tests__/generalAdminExtraction.test.ts for positive signal kinds,
   all required negation forms, action-target scope, sentence/clause boundaries
   and independent-date preservation.
3. Add guided-action red tests to
   src/lib/__tests__/guidedNextSteps.test.ts proving no draft exists for
   no-reply, importance-only and passive public-scope preparation.
4. Add Result View Model assertions to the primary suite first. Change
   src/lib/__tests__/resultViewModel.test.ts only if a composer-specific red case
   remains after corrected upstream data.
5. Implement the smallest shared communication assessment in
   generalAdminExtraction.ts.
6. Make mockAnalysis.ts consume the shared assessment for classification,
   urgency, title and suggested-action decisions.
7. Preserve and complete the current caseFactory.ts evidence correction using
   the shared typed signals and distinct labels.
8. Correct opportunityCards.ts and guidedNextSteps.ts so evidence absence,
   importance-only, no-action and explicit no-reply states cannot fall through
   to correspondence.
9. Run the focused manifest and fix only failures caused by this workstream.
10. Run security, date-role, source-fact, evidence-semantics, action-calibration
    and public adversarial adjacent suites.
11. Add or update the narrow browser cases only after deterministic tests pass.
12. Run complete validation and review the final diff/staging boundary before
    any commit.

Tests must be behavioural wherever the real journey can be exercised. A
source-string test is permitted only for an otherwise unobservable internal
contract.

## 17. Focused and adjacent validation

Focused manifest:

- ordinaryMessagePublicScopeEvidenceIntegrity.test.ts;
- generalAdminExtraction.test.ts;
- ordinaryMessageDateRoles.test.ts;
- publicScopeAnalysis.test.ts;
- guidedNextSteps.test.ts;
- resultViewModel.test.ts only when changed or required by a red result contract.

Adjacent manifest:

- ordinaryMessageSecurityPrecedence.test.ts;
- ordinaryMessageActionCalibration.test.ts;
- ordinaryMessageSourceFactIntegrity.test.ts;
- ordinaryMessageEvidenceSemantics.test.ts;
- publicMessageAdversarialEvaluation.test.ts;
- existing source-provenance/storage tests if the implementation changes a
  persisted shape.

Final validation:

    npm test -- --run src/lib/__tests__/ordinaryMessagePublicScopeEvidenceIntegrity.test.ts
    npm test -- --run src/lib/__tests__/generalAdminExtraction.test.ts src/lib/__tests__/ordinaryMessageDateRoles.test.ts src/lib/__tests__/publicScopeAnalysis.test.ts src/lib/__tests__/guidedNextSteps.test.ts
    npm test -- --run src/lib/__tests__/ordinaryMessageSecurityPrecedence.test.ts src/lib/__tests__/ordinaryMessageActionCalibration.test.ts src/lib/__tests__/ordinaryMessageSourceFactIntegrity.test.ts src/lib/__tests__/ordinaryMessageEvidenceSemantics.test.ts src/lib/__tests__/publicMessageAdversarialEvaluation.test.ts
    npm test -- --maxWorkers=1 --no-file-parallelism
    npm run lint
    npm run build
    git diff --check

No dependency installation is authorised.

## 18. Browser verification matrix

Use the existing public Check a message path and synthetic text only. Do not
save a case.

| Scenario | Visible assertions |
|---|---|
| Please reply by 20 August | Reply request and Reply deadline visible; editable draft available; no auto-send claim |
| Important: your account needs attention | Importance wording visible; title Important message to check; no reply/draft control |
| Please do not reply | No positive reply evidence; no draft control; safe keep/review action |
| You do not need to respond | No reply/response evidence; no draft control |
| Important notice. Please do not reply. | Importance visible; no Important reply needed title; no reply draft |
| Passive PIP review | Careful human-review title; no fabricated urgency/reply evidence; preparation checklist rather than draft |
| Passcode request plus do not reply | Security title/checklist wins; no ordinary reply action |
| Do not reply plus payment due on 20 August | Payment date remains visible; no reply evidence/draft |

For each case record:

- result title and primary status;
- Evidence found labels and values;
- Dates to check;
- best-next-move;
- guided primary and secondary actions;
- absence of automatic-action wording.

## 19. Likely implementation boundary

Expected production files:

- src/lib/generalAdminExtraction.ts — shared typed communication assessment and
  targeted negation;
- src/lib/mockAnalysis.ts — classification, title, urgency and action gating;
- src/lib/caseFactory.ts — source-grounded distinct communication evidence;
- src/lib/opportunityCards.ts — importance/no-reply/non-reply-action opportunity
  meaning;
- src/lib/guidedNextSteps.ts — prohibit correspondence fallthrough.

Expected test files:

- src/lib/__tests__/ordinaryMessagePublicScopeEvidenceIntegrity.test.ts;
- src/lib/__tests__/generalAdminExtraction.test.ts;
- src/lib/__tests__/guidedNextSteps.test.ts;
- existing focused/adjacent tests only where a red behavioural contract requires
  an assertion.

Conditional files:

- src/lib/resultViewModel.ts — only if corrected upstream semantics still cannot
  produce the specified visible result;
- src/lib/__tests__/resultViewModel.test.ts — only with that production change;
- tests/e2e/public-message-adversarial.spec.ts and its synthetic public corpus
  support — only for the approved narrow browser matrix;
- src/types.ts — not expected; only if review proves a carried additive type is
  safer than all consumers calling the shared pure assessment.

No UI component change is expected. Browser failures must first be traced to
the deterministic composition path.

## 20. Dirty-worktree and staging constraints

The implementation worktree contains intentionally preserved work from several
workstreams.

- Never reset, restore, stash, clean, rebase or switch branches.
- Inspect the current diff before editing every shared file.
- Preserve the existing coherent caseFactory.ts evidence fix.
- The current caseFactory.ts public-scope diff and the untracked primary test are
  whole-file safe for this workstream.
- Existing resultViewModel.ts changes belong to Care Fee/decision-derived work.
  If this specification later requires that file, stage only the new
  public-scope hunk.
- Existing decisionEngine/types.ts changes belong to Care Fee/decision-derived
  work and are excluded.
- Existing frontDoorIntent changes and benefitsClaimantResolution files belong
  to benefits claimant resolution and are excluded.
- Care Fee modules/specifications/tests and all unrelated untracked work are
  excluded.
- Protected paths remain outside inspection, search, modification and staging.
- Do not reintroduce or restage merged provenance, date-role or refund-lifecycle
  changes.
- Before any future commit, compare the staged patch with this file boundary and
  prove the index contains no unrelated hunk.

## 21. Explicit non-goals

- broad natural-language understanding of every optional/required contact form;
- a new FindingCategory solely for importance;
- cloud or model-based semantic classification;
- OCR changes or confidence-threshold changes;
- historical local-record migration;
- automatic drafting whenever a message is important;
- changing benefits claimant resolution;
- changing Care Fee reconciliation or decision-derived evidence;
- changing refund lifecycle, security precedence, date-role or money semantics;
- changing public scope availability;
- sending, saving, contacting, chasing, scheduling or submitting anything;
- adding dependencies;
- opening or using protected research/private evaluation material.

## 22. Failure and conservative fallback

If communication meaning is ambiguous:

- do not emit positive reply/action evidence;
- do not offer a correspondence draft;
- preserve independently supported importance, urgency, date, money, reference
  and security facts;
- use a calm review/checklist action;
- explain that the human should check the original wording;
- do not claim that no action is required unless the source supports that state.

If source provenance is missing or review-required, existing fail-closed
provenance behaviour applies.

## 23. Definition of done

This workstream is complete only when:

1. every acceptance-matrix case passes through the real public composition path;
2. positive communication evidence always has source-supported wording;
3. Reply or action wording found is absent from newly analysed visible results;
4. all required reply/respond/response negations suppress reply evidence,
   urgency, title and drafts;
5. importance remains visible without becoming reply or high urgency;
6. non-reply action requests remain distinct from correspondence;
7. passive public-scope preparation produces review/checklist guidance, not a
   generic draft;
8. mixed no-reply/date messages retain independent typed timing;
9. security precedence remains authoritative;
10. fresh and reconstructed deterministic results agree where applicable;
11. focused, adjacent, browser, full, lint, build and diff validation pass;
12. no dependency is added;
13. no protected or unrelated file/hunk is inspected, modified or staged;
14. the final staged boundary is reviewed and explicitly authorised before
    commit, push or publication.

## 24. Approval record

| Date | Decision | Authority |
|---|---|---|
| 13 August 2026 | Investigation completed; specification finalised as a draft | Codex, read-only evidence base |
| 13 August 2026 | Explicit approval to implement this exact revision; implementation remains uncommitted and unpublished | Human project owner |
