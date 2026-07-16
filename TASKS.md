# AdminAvenger Tasks

This file is intentionally short and operational. It tracks current work, not
old branch history.

Source principles:

- AI remembers. AI explains. Humans decide.
- AI extracts facts. Code assesses. Human approves.
- AdminAvenger helps prepare. You stay in control.
- Research does not equal implementation.
- Fixture ideas do not equal passing tests.
- Possible money does not equal confirmed savings.
- Stable engines should be frozen except for genuine defects.
- No automatic sending, submission, cancellation, appeal, application or
  provider contact.

## Done

- Built the React + TypeScript + Vite + Tailwind frontend.
- Built the one-front-door Check a message experience.
- Added paste-first checking with preview-first-save-later behaviour.
- Added local file/photo intake:
  - TXT, Markdown, CSV, JSON.
  - DOCX via local Mammoth extraction.
  - selectable-text PDF via local pdfjs extraction.
  - JPG/PNG/WebP/HEIC-style image selection and camera capture.
  - local Tesseract OCR with editable review and low-confidence guards.
- Added visible drag/drop into the main input area and attachment area.
- Added Admin Items, Findings, Admin Cases, Evidence Locker, Battle Log,
  drafts/checklists, chase dates, and case actions.
- Added localStorage persistence, reset demo data, clear local data, and
  storage safety handling.
- Added Opportunity Cards, Result View Model, Simple Result Panel, Case Sheet,
  Strategic Next Step panel, and Case Progress tracker.
- Added no-action / checked records.
- Added Savings / Impact Ledger with confirmed, pending, potential, rejected,
  deadline, and no-action states kept separate.
- Added user-confirmed outcome workflow with local proof notes/images metadata.
- Added Trusted Guidance Cards.
- Added Evidence Pack export and Adviser Export Pack Markdown download.
- Added UK Train Delay / Delay Repay proof vertical.
- Added broadband/mobile price-rise narrow assessment.
- Added decision-engine modules for parking, debt/bailiff, TV Licence, bank
  complaint, consumer dispute, benefits-family documents, Council Tax
  Reduction, and unknown admin fallback.
- Added Benefits Action Pack and benefits-focused Result View Model coverage.
- Added high-risk suspicious email guard.
- Added Workplace Support gated beta.
- Added Community Helper controlled manual-text beta.
- Added local-only Community Helper feedback panel.
- Added Career Support Pack, CV result polish, CV/job advert matching, source
  splitting, requirement-scoped evidence, claim hygiene, final output guard,
  preparation wording, privacy wording, checklist association, and evidence
  deduplication.
- Career Match v1.6 is deployed and production Tests 7 and 8 pass.
- Added golden letter corpus, safety wording regression coverage, pilot docs,
  and product mission docs.
- Completed Phase 1A research.
- Completed Phase 1B1 research.
- Completed Phase 1B2 research.
- Completed the source register.
- Completed the UK complaint research document.
- Completed the golden fixture standard.
- Completed documentation coverage consolidation.
- Completed Career Match v1.6 stabilisation.

## Now

1. Review and approve `GOLDEN_FIXTURE_STANDARD.md`.
2. Inventory existing decision-engine and classifier tests.
3. Map existing tests to golden-fixture categories.
4. Create machine-readable fixture records for one engine only.
5. Select telecom as the first hardening candidate.
6. Create telecom fixtures before changing behaviour.
7. Run telecom and cross-domain regression tests.
8. Fix only confirmed failures.
9. Perform production live tests.
10. Freeze telecom behaviour after passing.

## Next

- Energy fixture design and engine evaluation.
- Banking fixture design and fraud-boundary review.
- Consumer fixture design and engine evaluation.
- Benefits-family fixture audit.
- Existing parking/debt/TVL/bank regression mapping.
- Research-source review and stale-source monitoring.
- Resolve sources marked `Needs review` or `Needs manual extraction`.
- Wales-specific jurisdiction review.
- One-engine-at-a-time hardening.

## Later

- Housing controlled research and fixtures.
- Workplace controlled-beta fixtures.
- Water Wave 2 fixtures.
- Additional specialist verticals only after current engines are frozen.
- Backend/auth/database only when required by validated product needs.
- Hosted AI only through a defined privacy and consent model.

## Guardrails

- Keep the default product local-first and privacy-first.
- Keep one user-facing input: Check a message.
- Do not add a separate checker, category picker, or benefits page.
- Do not add legal, financial, benefits, debt, care, medical, housing, or
  employment advice.
- Do not claim entitlement, eligibility, case strength, suitability, or likely
  outcome.
- Do not count money automatically.
- Do not count demanded, deducted, disputed, possible, or researched money as
  saved or recovered.
- Do not send, submit, cancel, apply, contact, or archive anything
  automatically.
- Do not hide uncertainty, missing evidence, OCR weakness, or cannot-know
  fields.
- Do not expand stable engines without tests and source review.

## Useful Commands

```bash
npm run dev
npm run test
npm run lint
npm run build
```
