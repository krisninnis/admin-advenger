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
- Stable engines stay frozen except for confirmed defects.
- Nothing is sent, submitted, cancelled, claimed, applied for, or communicated
  automatically.

## Current Milestone

**Pilot readiness and closed real-user validation.**

The immediate goal is not to add another specialist engine.

The goal is to make the existing one-front-door journey clear, dependable, and
ready for a closed pilot with approximately 5 to 10 ordinary users.

The pilot journey is:

1. Provide a message or document.
2. Optionally ask a question about it.
3. Understand what it appears to be.
4. See important facts, dates, amounts, uncertainty, and missing evidence.
5. Know the safest next move.
6. Save or export when useful.
7. Remain in control.

## Done

- Built the React, TypeScript, Vite, and Tailwind frontend.
- Built one public Check a message front door.
- Added paste, drag/drop, file, photo, upload, and live-camera intake.
- Added local extraction for TXT, Markdown, CSV, JSON, DOCX, and
  selectable-text PDF files.
- Added local image OCR with editable review, prepared-scan confirmation, and
  low-confidence safety guards.
- Added camera permission handling, upload fallback, high-resolution capture,
  stream cleanup, and a development-only camera calibration lab.
- Added Admin Items, Findings, Admin Cases, Evidence Locker, Battle Log,
  drafts, checklists, chase dates, actions, and user-confirmed outcomes.
- Added local persistence, clear-data controls, storage safety, and local
  exports.
- Added the Result View Model, Simple Result Panel, Case Sheet, Strategic Next
  Step panel, and Case Progress tracking.
- Added the Savings and Impact Ledger with confirmed, pending, potential,
  rejected, deadline, and no-action states kept separate.
- Added Evidence Pack and Adviser Export Pack downloads.
- Added safety wording regression coverage, synthetic golden fixtures, Terms
  and Safety, Trust and Safety, and public-scope gating.
- Added narrow HMRC Tax Code Notice preparation through the normal public front
  door.
- Added narrow broadband and mobile price-rise preparation.
- Added the UK Train Delay and Delay Repay proof vertical.
- Added Career Support, Workplace Support, Community Helper, benefits-family,
  debt, enforcement, bank, consumer, parking, TV Licence, Council Tax
  Reduction, and unknown-document preparation at their documented maturity
  levels.
- Archived completed low-confidence OCR and camera calibration specifications.
- Verified the current merged application with the full repository validation
  workflow.

## Now

1. Complete the roadmap and documentation reset.
2. Make the optional question field easier to notice and understand.
3. Simplify the top of the result so it answers:
   - What is this?
   - Is anything urgent?
   - What changed or matters?
   - What should I do next?
   - What should I have ready?
4. Create one pilot acceptance matrix covering:
   - pasted text;
   - DOCX;
   - selectable-text PDF;
   - uploaded image;
   - live camera capture.
5. Prepare synthetic pilot examples for:
   - HMRC Tax Code Notice;
   - broadband or mobile price-rise notice;
   - consumer refund, delivery, or faulty-goods message;
   - ordinary bill or admin message;
   - unknown official letter safe fallback.
6. Run real-device camera checks on Android Chrome, iPhone Safari where
   available, and desktop Chrome.
7. Test permission denied, camera unavailable, poor lighting, glare, shadows,
   folded letters, cropped pages, screenshots, and long documents.
8. Confirm users understand low-confidence OCR recovery and that nothing has
   been sent or saved automatically.
9. Confirm save, export, clear-data, refresh, and local recovery behaviour.
10. Recruit approximately 5 to 10 ordinary pilot users.
11. Observe uncoached use and record hesitation, misunderstanding, failure,
    abandonment, trust, and usefulness.
12. Rank findings by frequency and user impact.
13. Fix only the highest-impact confirmed pilot failures.

## Next

After the first pilot cycle:

1. Repeat the same acceptance journeys after fixes.
2. Freeze the pilot release when the core journeys pass.
3. Select telecom as the first formal post-pilot hardening vertical.
4. Create telecom golden fixtures before changing behaviour.
5. Run telecom and cross-domain regression tests.
6. Fix only confirmed failures.
7. Freeze telecom behaviour after passing.
8. Review energy, banking, consumer, and benefits-family coverage one vertical
   at a time.

## Known Limitations

- Legacy `.doc` files are not parsed.
- Scanned or image-only PDFs are not currently OCRed as PDF documents.
- OCR can misread blurred, shadowed, cropped, folded, low-contrast, or
  low-resolution images.
- The current application has no backend, authentication, cloud database,
  hosted AI gateway, email integration, provider integration, or automatic
  actions.
- Real-device and real-person evidence is still needed before broader public
  promotion.

## Later

- Scanned-PDF OCR through the existing local review and confidence pipeline.
- Energy fixture design and engine evaluation.
- Banking fixture design and fraud-boundary review.
- Consumer fixture design and engine evaluation.
- Benefits-family fixture audit.
- Wales-specific jurisdiction review.
- Housing and other controlled high-risk research.
- Backend, authentication, database, and hosted AI only when validated product
  needs require them.

## Guardrails

- Keep one user-facing input: Check a message.
- Do not add category selection or separate public checker pages.
- Do not add another specialist category during the first pilot cycle.
- Do not present generic detection as complete specialist coverage.
- Do not provide legal, financial, tax, benefits, debt, care, medical, housing,
  safeguarding, or employment decisions.
- Do not claim entitlement, eligibility, case strength, suitability, likely
  outcome, or a correct tax code.
- Do not count money automatically.
- Do not hide uncertainty, missing evidence, OCR weakness, or cannot-know
  information.
- Do not send, submit, cancel, apply, contact, claim, or archive anything
  automatically.
- Do not expand stable engines without fixtures, source review, and passing
  regression tests.
- Do not touch `docs/research/` or `opencode.jsonc` during normal roadmap work.

## Useful Commands

```powershell
npm run dev
npm run test
npm run lint
npm run build
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```
