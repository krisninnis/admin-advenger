# R1 — Roadmap and Pilot Reset v1

Status: Approved

## Purpose

Bring AdminAvenger's roadmap, vision, tasks, architecture, public-scope
documentation, and specification statuses into agreement with the product
currently merged into `main`.

This is a documentation-only milestone. It defines what has been completed,
what the public MVP currently is, what remains limited or controlled, and the
sequence leading to a closed real-user pilot.

## Product Position

AdminAvenger is a local-first, human-controlled life-admin preparation product.

The public promise is:

> AdminAvenger helps prepare. You stay in control.

The public experience has one front door:

> Check a message.

A person can paste text, take or upload a photo, or upload a supported document.
AdminAvenger explains what the material appears to be, identifies important
facts, shows uncertainty and missing evidence, prepares the safest next step,
and optionally lets the person save or export the result.

Nothing is sent, submitted, cancelled, claimed, applied for, or communicated
automatically.

## Current Repository Truth

The current `main` includes:

- React, TypeScript, Vite, and Tailwind frontend.
- One public Check a message journey.
- Paste, camera, photo, drag/drop, and file intake.
- Local TXT, Markdown, CSV, JSON, DOCX, and selectable-PDF extraction.
- Local image OCR with editable review and confidence guards.
- Prepared-scan review before OCR.
- Admin Cases, evidence, timelines, chase dates, drafts, and outcomes.
- Local persistence and local data controls.
- Evidence Pack and Adviser Export Pack downloads.
- Result View Model and Strategic Next Step planning.
- Safety wording regression coverage and synthetic golden fixtures.
- Narrow or specialist preparation for:
  - HMRC Tax Code Notices.
  - broadband and mobile price-rise notices.
  - UK Train Delay / Delay Repay.
  - career CV and job-advert preparation.
  - selected decision-engine document families.
- Controlled or hidden support packs for higher-risk areas.
- Public-scope gating for capabilities that are not approved for normal
  automatic routing.
- Full repository verification through `scripts/verify.ps1`.

## Decisions

### 1. Public MVP focus

The public MVP is not a collection of separate category checkers.

It is one document-to-next-step journey:

1. Provide a document or message.
2. Optionally ask a question about it.
3. Understand what it appears to be.
4. See important facts, dates, amounts, and uncertainty.
5. Know the safest next move.
6. Save or export when useful.
7. Remain in control.

### 2. HMRC scope

HMRC Tax Code Notice support is approved as narrow public informational
preparation.

It may:

- identify a likely Tax Code Notice;
- extract visible tax codes, tax year, employer, and calculation entries;
- explain that a notice is not itself a tax bill;
- help the user check visible details;
- identify missing information and uncertainty.

It must not:

- claim HMRC is correct or incorrect;
- calculate the person's correct tax code;
- provide general tax advice;
- claim a refund, liability, entitlement, or likely outcome;
- automatically contact HMRC or prepare an unnecessary message.

AdminAvenger must not be marketed as a general tax assistant.

### 3. Stable and controlled capabilities

Documentation must distinguish between:

- stable or implemented specialist preparation;
- narrow proof verticals;
- controlled betas;
- generic keyword or fallback handling;
- research candidates that are not implemented.

Generic detection must not be described as full specialist coverage.

### 4. Immediate milestone

The next milestone is pilot readiness, not another specialist engine.

The pilot-ready journey must work across:

- pasted text;
- DOCX;
- selectable-text PDF;
- uploaded image;
- live camera capture.

Required pilot examples:

- HMRC Tax Code Notice;
- broadband or mobile price-rise notice;
- consumer refund, delivery, or faulty-goods message;
- ordinary bill or admin message;
- unknown official letter safe fallback.

### 5. Closed pilot

The target is a closed pilot with approximately 5 to 10 ordinary users.

The pilot should measure:

- whether users understand the single front door;
- whether they notice and use the optional question field;
- whether camera and upload intake work on real devices;
- whether OCR corrections are understandable;
- whether the top of the result answers the user's question;
- whether uncertainty and cannot-know wording are clear;
- whether users understand that nothing was sent;
- whether saving and exporting are useful;
- where users hesitate or abandon the journey.

No new specialist category should be added during the first pilot cycle.

### 6. Post-pilot sequence

After pilot evidence is collected:

1. Rank observed problems by frequency and user impact.
2. Fix the highest-impact usability and reliability failures.
3. Repeat the same pilot journeys.
4. Freeze the pilot release when the acceptance journeys pass.
5. Harden telecom as the first formal post-pilot vertical.
6. Add fixtures before changing telecom behaviour.
7. Expand only one researched vertical at a time.

### 7. Platform boundaries

Keep these later until validated product needs require them:

- authentication;
- cloud database;
- secure account storage;
- hosted AI extraction;
- provider integrations;
- email integrations;
- automatic actions.

## Documentation In Scope

Update only documentation necessary to create one consistent current plan:

- `ROADMAP.md`
- `VISION.md`
- `TASKS.md`
- `ARCHITECTURE.md`
- `docs/product/public-mvp-scope-gating-v1.md`
- relevant files under `docs/specs/active/`
- relevant files under `docs/specs/completed/`

## Required Documentation Changes

### ROADMAP.md

- Record the camera, OCR safety, public-scope, and HMRC work as completed.
- Replace the outdated current phase with pilot readiness and closed-pilot
  validation.
- Preserve long-term research waves but place them after the pilot sequence.
- Record scanned/image-only PDF OCR as a known intake limitation.
- Record telecom as the first post-pilot hardening candidate.

### VISION.md

- Preserve the long-term life-admin advocate vision.
- Replace conflicting first-wedge language with the one-front-door
  document-to-next-step public MVP.
- Describe money-back outcomes as one valuable use case rather than the only
  public identity.
- Add the closed-pilot milestone and current north-star journey.

### TASKS.md

- Replace completed or obsolete current tasks.
- Add a short ordered pilot-readiness worklist.
- Keep operational tasks concise.
- Mark HMRC Tax Code Notice preparation as implemented.
- Keep stable engines frozen except for confirmed defects.

### ARCHITECTURE.md

- Add the current camera preparation and document-scanner flow.
- Add HMRC Tax Code Notice to the specialist engine list.
- Preserve the deterministic assessment and human-approval boundary.
- Record scanned/image-only PDF limitations accurately.
- Do not describe any backend, hosted AI, or automatic-action capability as
  implemented.

### Public MVP scope document

- Change its status to reflect the implemented public gate.
- Explicitly record narrow HMRC Tax Code Notice preparation as approved public
  scope.
- Preserve controlled-beta and high-risk restrictions.
- Preserve the single-front-door rule.

### Specification status

- Move specifications for work already merged and accepted from
  `docs/specs/active/` to `docs/specs/completed/`.
- Do not mark unimplemented work completed.
- Keep this R1 specification active until the documentation reset is merged.

## Non-Goals

This milestone must not:

- modify files under `src/`;
- modify `package.json` or `package-lock.json`;
- add or change runtime behaviour;
- create a backend;
- add authentication;
- add a database;
- add hosted AI;
- add a new specialist engine;
- expand high-risk public scope;
- add category selectors or separate public checkers;
- alter tests except where a documentation-only repository assertion genuinely
  requires it;
- touch `docs/research/`;
- touch `opencode.jsonc`.

## Acceptance Criteria

The milestone is complete when:

1. The roadmap, vision, tasks, architecture, and public-scope documents describe
   the same current product phase.
2. The one-front-door public MVP is unambiguous.
3. Narrow HMRC Tax Code Notice public scope is explicitly documented.
4. Stable, narrow, controlled, generic, and research-only coverage are not
   confused.
5. Pilot readiness and a 5-to-10-person closed pilot are the immediate roadmap.
6. Telecom is identified as the first post-pilot hardening candidate.
7. Merged specifications are moved from active to completed.
8. No production source files are changed.
9. `docs/research/` and `opencode.jsonc` remain untracked and untouched.
10. `git diff --check` passes.
11. Full repository verification passes before merge.

## Verification Commands

```powershell
git status --short
git diff --check
git diff --name-only origin/main...HEAD
powershell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```
