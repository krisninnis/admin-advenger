# AdminAvenger Tasks

This file is intentionally short and operational. It tracks current work, not
old branch history.

Source principles:

- AI remembers. AI explains. Humans decide.
- AI extracts facts. Code assesses. Human approves.
- AdminAvenger helps prepare. You stay in control.

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

## Now

1. Complete repository coverage audit.
2. Create and validate `COVERAGE_MATRIX.md`.
3. Define a standard decision-engine contract.
4. Research authoritative UK complaint sources.
5. Build golden fixtures for existing engines.
6. Run cross-category regression testing.
7. Fix only confirmed engine failures.
8. Freeze stable engines after production verification.

## Next

- Research Wave 1 complaint categories.
- Choose the first new vertical from evidence.
- Implement one vertical.
- Add positive, ambiguous, negative, cross-domain, OCR-error, and safety tests.
- Deploy and perform live tests.

## Later

- Backend.
- Authentication.
- Cloud database.
- Hosted AI extraction.
- Provider/email/calendar/storage integrations.
- Automatic actions, only if a future trust model supports them safely.

## Guardrails

- Keep the default product local-first and privacy-first.
- Keep one user-facing input: Check a message.
- Do not add a separate checker, category picker, or benefits page.
- Do not add legal, financial, benefits, debt, care, medical, housing, or
  employment advice.
- Do not claim entitlement, eligibility, case strength, suitability, or likely
  outcome.
- Do not count money automatically.
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
