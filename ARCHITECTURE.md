# AdminAvenger Architecture

AdminAvenger is a local-first React + TypeScript + Vite + Tailwind app.

The current repository has no backend, no authentication, no database, no
routing framework, no hosted AI gateway, no autonomous agent runtime, no email
sending, no provider integrations, and no automatic submission/cancellation.

The architecture preserves:

```text
AI remembers. AI explains. Humans decide.

AI extracts facts.
Code assesses.
Human approves.
```

## Product Flow

```text
User input
-> local parsing/extraction
-> classification
-> specialist assessment or safe fallback
-> evidence and missing-information model
-> consumer-facing result
-> optional save
-> finding/case
-> draft/checklist
-> chase and timeline
-> user-confirmed outcome
-> evidence-pack export
```

Nothing sends, submits, cancels, applies, contacts, pays, archives, or claims
automatically.

## App Shape

The app is a single-page, state-driven workspace. Navigation is local React
state, not React Router.

Main views include:

- Home: the consumer-first Check a message front door.
- Cases: saved case list and filters.
- Case File: selected case, evidence, timeline, actions, drafts/checklists,
  exports, and outcome controls.
- Savings: local impact tracking.
- Settings / Data: local privacy, data controls, Terms & Safety, and backup
  copy.
- Dashboard / Validation / Demo / Trust & Safety / Covenant views for advanced
  product, testing, and trust surfaces.

Desktop uses a sidebar. Mobile uses a fixed bottom navigation for the main
consumer paths.

## Input Architecture

All current intake routes feed the same local Check a message pipeline.

Supported input paths:

- Pasted or typed text.
- Email/letter-style text.
- TXT, Markdown, CSV, and JSON text files read with browser file APIs.
- DOCX read locally with `mammoth.extractRawText`.
- Selectable-text PDFs read locally with `pdfjs-dist`.
- Image/photo files and camera captures read locally with Tesseract.js OCR.
- Drag/drop into the visible input panel or attachment area.

Unsupported or limited cases:

- Legacy `.doc` files are not parsed.
- Scanned/image-only PDFs are not OCRed as PDFs; the user is told to photograph
  the page or paste text.
- OCR can misread small, blurry, shadowed, cropped, or low-contrast images.
- OCR key details are hidden when confidence is too low or moderate/poor.
- Extracted text is editable before checking.

Privacy model:

- Files are read in the browser.
- Photos are processed locally.
- Text is previewed before a saved case is created.
- LocalStorage is used only after save/record actions or explicit settings.
- Users can clear known AdminAvenger local data.

## Core Data Types

Core product types live in `src/types.ts`.

Important objects:

- `AdminItem`: source material.
- `AdminFinding`: detected opportunity/admin action.
- `AdminCase`: saved case file derived from a finding.
- `EvidenceItem`: evidence attached to a case.
- `CaseTimelineEvent`: battle log event.
- `AdminDraft`: editable prepared message/draft.
- `ImpactEntry`: local impact/savings/recovery/deadline/no-action record.
- `OpportunityCard`: consumer-facing summary derived from a case/finding.

Decision-engine objects live in `src/lib/decisionEngine/types.ts`.

Important decision fields:

- `documentType`.
- `title`.
- `plainEnglishSummary`.
- `caseStrength`.
- `strengthLabel`.
- `confidence`.
- `uncertainty`.
- `cannotKnow`.
- `evidenceNeeded`.
- `deadlines`.
- `risks`.
- `nextSteps`.
- `safetyNotes`.
- `amountTreatment`.
- `sourceFacts`.

## Engine Architecture

AdminAvenger has multiple deterministic preparation systems behind one input.

The main shared decision engine is:

```text
src/lib/decisionEngine/classifier.ts
src/lib/decisionEngine/decisionEngine.ts
src/lib/decisionEngine/modules/
```

It classifies and analyses:

- Parking notices.
- Debt collection and bailiff/enforcement notices.
- TV Licence letters.
- Bank complaints.
- Consumer disputes.
- Benefits-family documents.
- Council Tax Reduction / Support.
- Unknown admin disputes.

Specialist engines and packs also exist:

- `delayRepayAssessment.ts`: train Delay Repay proof vertical.
- `broadbandPriceRiseAssessment.ts`: broadband/mobile price-rise narrow
  assessment.
- `careerSupportPack.ts`: CV, job advert, and CV/job advert match preparation.
- `workplaceSupportPack.ts`: gated workplace preparation beta.
- `communityHelperPack.ts`: controlled manual-text community helper beta.
- `benefitsActionPack.ts`: benefits-specific view/derivation layer over
  benefits DecisionResults.
- `strategicNextStep.ts`: safe next-step planning over Result View Models.

There is no single generic entitlement engine. Generic keyword findings and
fallbacks coexist with narrow specialist engines, and the UI should not present
all categories as equally mature.

## Conceptual Decision Engine Contract

Future and existing engines should be documented against this conceptual
contract. This is documentation only unless a matching type is later introduced
in code.

```ts
type DecisionEngineContract = {
  id: string
  category: string
  supportedInputs: string[]
  classifierSignals: string[]
  conflictingCategories: string[]
  factsExtracted: string[]
  evidenceExpected: string[]
  missingInformation: string[]
  safeOutputs: string[]
  forbiddenOutputs: string[]
  testFixtureIds: string[]
}
```

## Result Architecture

The current result path is built around:

- `src/lib/resultViewModel.ts`
- `src/components/SimpleResultPanel.tsx`
- `src/components/ResultCaseSheet.tsx`
- `src/components/OpportunityCardPanel.tsx`
- `src/components/StrategicNextStepPanel.tsx`
- `src/components/BenefitsActionPackPanel.tsx`
- `src/components/CaseProgressCard.tsx`

The Result View Model composes decision results, benefits action packs,
strategic next steps, workplace packs, career packs, adviser exports, and case
progress into a safety-checked output model.

## Career Match Architecture

Career Match v1.6 is a specialist career preparation system, not a job-search
or suitability-scoring engine.

It supports:

- CV detection.
- Job advert detection.
- CV plus job advert match detection.
- Source splitting between CV-side text and advert-side text.
- Requirement extraction from advert text.
- Role/title clue extraction.
- Requirement-scoped evidence mapping.
- Direct evidence ranking.
- Support-role, privacy, issue-documentation, and digital/web evidence
  prioritisation.
- Claim hygiene for overclaiming or unsupported project claims.
- Final-output evidence guard.
- Requirement-specific checklist association.
- Privacy-specific preparation wording.
- Evidence deduplication within each requirement.

It must not:

- Score suitability.
- Use percentages.
- Claim the user qualifies.
- Predict interviews or outcomes.
- Apply automatically.
- Send messages.
- Contact employers.
- Scrape job sites.
- Use real personal CV fixtures in tests.

Career Match v1.6 is stable for the current MVP and should be frozen except
for confirmed bugs.

## Persistence

AdminAvenger saves local state to localStorage through `src/lib/storage.ts`.

Persisted groups include:

- Admin items.
- Findings.
- Admin cases.
- Drafts.
- Impact entries.
- Selected finding/case IDs.

Other local keys support:

- Terms acceptance.
- Inbox scan prompt state.
- Validation notes.
- Feedback notes.
- Local AI/Ollama settings.

Storage safety:

- Bad or old localStorage data is parsed defensively.
- Save/quota failures are surfaced.
- Proof image data URLs are not persisted; metadata such as filename can be
  retained.
- Users can clear known AdminAvenger keys without clearing unrelated browser
  storage.

## Impact And Money Safety

Impact tracking lives in:

```text
src/lib/impactLedger.ts
src/views/SavingsView.tsx
src/components/OutcomeConfirmation.tsx
```

Totals are separated:

- Confirmed saved/recovered.
- Pending recovery.
- Potential saving.
- Potential annual saving.
- Deadlines protected.
- No action / checked.
- Rejected or not pursuing.

Rules:

- Demanded money is not savings.
- Benefits amounts are display-only.
- Debt balances are display-only.
- Possible recovery is not confirmed recovery.
- A refund approval is not money received.
- Money is counted only after the user confirms the outcome.

## Exports

Exports are local, browser-side downloads/copy actions.

Implemented:

- Case Evidence Pack export (`src/lib/exportCase.ts`).
- Adviser Export Pack builder/renderer/download helper
  (`src/lib/adviserExportPack.ts`, `src/lib/adviserExportDownload.ts`).
- Validation and feedback Markdown exports.

Exports do not upload, email, share, or submit anything automatically.

## AI Boundary

Current truth:

- Hosted AI is not deployed in the current repository.
- There is no `api/` directory.
- There is no backend AI gateway in the deployed code.
- No API keys are required for production frontend use.
- Local Ollama is experimental only.

Local Ollama mode:

- Lives in `src/services/ollamaExtractionService.ts`.
- Is configured locally by the user/developer.
- Reads pasted text only when selected.
- Returns structured facts into the same deterministic checking pipeline.
- Must not decide rights, entitlement, outcomes, or actions.

The future AI boundary, if built, is:

```text
AI extracts facts.
AdminAvenger code assesses.
Human approves.
```

AI may read and organise user-provided material, quote evidence, list missing
information, and return structured JSON. It must not decide legal rights, claim
entitlement, invent facts, submit claims, send emails, cancel services, contact
providers, or override deterministic assessment logic.

## Trust Boundaries

AdminAvenger must keep these boundaries visible:

- No automatic sending.
- No automatic claims.
- No automatic cancellation.
- No automatic application submission.
- No automatic provider/employer contact.
- No entitlement decisions.
- No legal, financial, debt, benefits, medical, housing, care, safeguarding, or
  employment decisions.
- No guaranteed outcomes.
- No invented evidence.
- No confirmed savings without user confirmation.
- No hidden cloud processing.

## Testing Architecture

Key test areas include:

- Decision engine module and integration tests.
- Golden Letter Corpus tests.
- Benefits Action Pack and Result View Model tests.
- Career Support Pack and final UI/output tests.
- Workplace Support and Community Helper gated-flow tests.
- File intake, DOCX/PDF text extraction, photo capture, OCR, and key-detail
  tests.
- Storage, local data control, terms, copy actions, adviser export, case
  progress, safety wording, and UI regression tests.

Golden fixtures are synthetic. Real personal documents and manual OCR images
must not be committed.
