# Public-Message Adversarial Evaluation Harness v1

Status: Implemented

## Purpose

Build a repeatable synthetic evaluation layer for the public **Check a message**
journey. The harness tests what the product shows after full deterministic
analysis and composition. It does not activate a specialist beta, send data,
save cases, or use private evaluation material.

The governing principle is:

> AI prepares. Humans decide.

## Runtime pipeline under evaluation

```text
src/views/HomeView.tsx: HomeView.handleCheck
  -> src/lib/submissionHandoff.ts: submitAcceptedText
  -> src/App.tsx: App.handleHomeCheck / runAnalysis
  -> src/services/analysisService.ts: analyseAdminItemWithService
  -> src/lib/mockAnalysis.ts: analyseAdminItem({ accessMode: "public" })
  -> src/lib/generalAdminExtraction.ts and specialist assessors
  -> src/lib/publicScopePolicy.ts: assessPublicIntakeScope
  -> src/lib/mockAnalysis.ts: finding generation and suppression
  -> src/lib/caseFactory.ts: createAdminCase for every finding
  -> src/lib/caseFactory.ts: selectMostImportantCase
  -> src/lib/opportunityCards.ts: deriveOpportunityCard
  -> src/lib/resultViewModel.ts: buildResultViewModel
  -> src/lib/caseProgress.ts / guidedNextSteps.ts / impactLedger.ts
  -> src/components/ResultCaseSheet.tsx and HomeView secondary-case display
```

Saved records are checked by JSON round-tripping the source item, findings, and
cases before the same selection and composition functions run again. This
matches the additive local persistence model without writing to browser
storage.

The browser stores only when a person explicitly chooses a save action.
`src/App.tsx` hydrates locally stored items, findings and cases, after which the
same selection and composition functions derive the current display again.

## Why earlier focused tests disagreed with the browser

The earlier account-outcome helper selected `findings[0]`. HomeView instead
created every case and sorted by urgency and category. A weaker generic finding
could therefore become the visible result even when the first finding looked
correct in a focused test. The exact manual messages also contained contrast
and temporal qualifiers that the earlier fixtures did not exercise.

The shared `selectMostImportantCase` function now prevents the selection rule
from drifting between HomeView and deterministic tests.

## Evaluation architecture

The harness has four layers:

1. `types.ts` defines the versioned schema and separates source-message facts
   from expected product behaviour.
2. `corpusV1.ts` contains synthetic scenarios, source-fact extraction and
   explicit semantic contracts.
3. `corpusManifestV1.ts` fixes the exact IDs, counts, browser subset and
   metamorphic membership.
4. `runEvaluation.ts` runs the real public pipeline and produces structured
   semantic failures and a readable report.
5. Vitest runs the full corpus and harness self-tests; Playwright runs a smaller
   representative subset through the visible localhost interface.

No new runtime dependency, cloud service, telemetry path, or production data
store is introduced.

## Corpus record schema

Each scenario records:

- stable identifier and corpus version;
- category and subcategory;
- synthetic source message and optional question;
- risk level and provenance note;
- source facts: dates, relative periods, amounts, references and dependencies;
- expected result-family title, route, primary meaning and exact safe status;
- required and prohibited visible concepts;
- expected opportunity, amount treatment, next-step kind and impact treatment;
- whether official verification or independent support should be suggested;
- a closed set of executable assertion types; unknown types fail closed;
- rationale.

Required concepts are small semantic phrases, not full-screen snapshots.
Structured fields are asserted wherever the product exposes them.

## Category matrix

| Category | Minimum core coverage |
| --- | ---: |
| Bills, accounts and services | 23 |
| Refunds and purchases | 17 |
| Complaints and disputes | 11 |
| Benefits and public administration | 22 |
| Employment and income administration | 15 |
| Housing and utilities | 13 |
| Bereavement-related public messages | 13 |
| Security and scams | 10 |
| Neutral and low-action messages | 8 |

The executable v1 corpus contains exactly 159 scenarios: the matrix above,
five exact browser regressions, and 22 additional controlled adversarial
variants. Twenty-nine records are labelled as metamorphic variants across the
base, exact and additional sets. They cover contrast, negation, timing, punctuation, OCR-style
line breaks, multiple dates and amounts, and mixed resolved/unresolved facts.

## Failure taxonomy

- `schema`: invalid, incomplete or unknown assertion;
- `manifest`: missing, replaced, duplicated or reordered corpus contract;
- `synthetic_hygiene`: fixture resembles personal or secret data;
- `routing`: wrong public boundary or opportunity type;
- `precedence`: weaker finding selected;
- `fact_missing`: date, period, reference, amount or dependency lost;
- `fact_invented`: unsupported visible claim;
- `qualifier_loss`: contrast, negation or temporal scope reversed;
- `status`: resolved/to-do/waiting state is unsafe;
- `composition`: upstream fact omitted from the visible model;
- `reconstruction`: fresh and reconstructed results diverge;
- `money_safety`: displayed money counted or given an unsafe role;
- `next_step`: action is missing, misleading or too strong;
- `safety`: advice, guarantee, automatic action or verification boundary failure.

## Browser subset

The browser suite:

1. starts the existing Vite development server through Playwright;
2. clears local and session storage;
3. sets only the synthetic terms-acceptance flag;
4. pastes a committed synthetic message and optional question;
5. submits through **What does this mean?**;
6. waits for the visible result panel;
7. checks title, status, next move, dates, money, references, required concepts,
   prohibited concepts and human-control wording;
8. attaches structured diagnostics to a failing Playwright test.

It does not save a case or write to a production service.

## Correction policy

Failures are grouped by shared cause. A production correction requires a
failing scenario first, the smallest coherent change, a focused rerun, a full
corpus rerun, adjacent tests, and complete repository validation. Fixture
expectations must not be weakened merely to make a misleading result pass.

## Independent verification and corrective hardening

The earlier harness could report a clean run while relying on broad generic
concepts, six-status defaults, scenario-label title leakage and unstructured
number matching. It also did not consume most source facts or dependencies.
Independent verification demonstrated that those checks were insufficient.

- direct email-security signals were computed without the submitted item's
  email source type and only after the public topical scope gate, allowing scam
  language to hide the independent-verification result;
- a real provider reference could sit behind generic account/provider evidence
  in the first-three-item UI summary.

The corrected harness uses the real paste-only title, exact manifest contracts,
structured amount equality, canonical source-text safety validation, explicit
dependency checks, and separate browser regions for title, status, next move,
dates, money and evidence. Self-tests deliberately mutate in-memory records to
prove missing concepts, prohibited wording, invented facts, lost dependencies,
unknown assertions and manifest drift are detected.

The scam correction distinguishes signal detection from primary precedence.
Direct sensitive-detail requests can take precedence; weaker link, attachment,
invoice or urgency signals require corroboration. Negated instructions and
ordinary expected messages remain on the normal public route. No message is
marked definitively fraudulent and the human-control rule is unchanged.

The harness report is now evidence, not a predeclared pass claim. Current pass
and failure totals must be taken from the validation run and reported honestly.

## Explicit boundaries

- Synthetic source material only.
- Public Check a message only.
- No Estate Administration activation, routing, UI, corpus, or runtime change.
- No entitlement, liability, rights, deadline, or outcome decision by
  AdminAvenger.
- Provider statements remain provider-attributed and unverified.
- Displayed, waived, promised, disputed, or demanded money is never counted as
  received, saved, or recovered.
- Nothing is sent or submitted automatically.
