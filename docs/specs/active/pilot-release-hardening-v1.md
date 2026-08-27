# Pilot Release Hardening V1

Status: implementation authorised

## Purpose

AdminAvenger must not enter a controlled real-user pilot while a known high-severity vulnerability remains on the public untrusted-document intake path, or until the existing automated and human pre-pilot gates have been completed and recorded.

This milestone removes the confirmed PDF parsing security blocker and preserves the existing pilot-release contract. It does not add product capability.

## Governing principle

**AI prepares. Humans decide.**

## Starting point

This milestone starts from live `main` at:

`a0fd799c36a0e5dbfe6b7363b32af26800919078`

Pilot Readiness Refresh V2 identified no P0 issue and two P1 blockers:

1. public PDF intake used `pdfjs-dist@6.1.200`, inside the affected range of the confirmed PDF.js scripting vulnerability;
2. the repository's existing automated and human pre-pilot evidence was incomplete.

## PDF security contract

### Patched PDF.js

The direct `pdfjs-dist` dependency must resolve to at least `6.2.108`.

The remediation remains within PDF.js major version 6.

### Scripting surface

AdminAvenger uses PDF.js only to extract selectable text from a user-selected local file.

In PDF.js 6.2.108, `enableScripting` is not a `getDocument` initialization parameter. Scripting is a viewer-layer capability associated with viewer/scripting-manager surfaces. AdminAvenger's public PDF extraction path does not instantiate `PDFViewer`, `PDFScriptingManager`, or another PDF scripting surface.

Do not add unsupported viewer options to `getDocument`. The security remediation for this path is the patched PDF.js release while preserving the existing document/text-only architecture.

### Local-only boundary

The existing privacy boundary remains unchanged:

- the browser reads the selected file bytes;
- PDF.js receives local `data`, not a URL;
- the worker remains bundled with the application;
- no cloud upload, remote PDF fetch, telemetry, or background sharing is introduced.

### Failure behaviour

Existing behaviour remains unchanged:

- selectable-text PDF -> extracted text;
- scanned/image-only PDF -> explicit no-selectable-text result;
- corrupt, encrypted/password-protected, unsupported, or mid-document failure -> safe read failure;
- extraction failures do not crash the app;
- failure wording does not imply upload or sending.

## Transitive dependency hardening

A lockfile-only refresh may move already-permitted transitive dependencies to patched versions without changing application or build architecture.

Approved floors:

- `postcss >= 8.5.23`
- `nanoid >= 3.3.16`

Do not widen this milestone merely to achieve a zero-advisory count.

## Protected product contracts

This milestone must not redesign or alter:

- Front Door or ordinary-message routing;
- OCR/photo intake;
- DOCX behaviour;
- Benefits;
- Community Helper;
- Workplace Support;
- Care Fee claims, comparison, reconciliation, cases, drafts, or evidence review;
- generic drafting;
- Chase Engine;
- Impact/money logic;
- storage schemas;
- export;
- sending/contact/submission;
- analytics, telemetry, accounts, hosted AI, or cloud processing.

## Pilot evidence contract

`docs/product/pilot-readiness-checklist-v1.md` remains the operational pilot gate.

This specification does not mark manual checks complete. Before inviting real pilot users, actual evidence must cover the existing mandatory automated, manual, and internal-review checks, including:

- full automated tests;
- lint;
- production build;
- intended deployed commit;
- representative normal-admin, Benefits/Admin, Workplace Support, and Community Helper flows;
- adviser export;
- prepared copy action;
- case progress;
- Settings/local-data controls and clear-data flow;
- at least one internal reviewer checking advice-like wording;
- review of the existing stop/go criteria.

## Validation

### Automated

After implementation:

1. verify the resolved PDF.js version is patched;
2. run focused PDF/document-file tests;
3. verify `getDocument` receives local `data`, not a URL, and that the public extraction path remains document/text-only without viewer scripting surfaces;
4. retain coverage for successful multi-page extraction, scanned/no-text PDFs, encrypted/corrupt PDFs, and mid-document failures;
5. run relevant document-attachment/file-intake regressions;
6. run a complete full test suite using low concurrency if the default Vitest worker startup stalls;
7. run lint;
8. run TypeScript/production build;
9. run `git diff --check`;
10. review available dependency/security checks.

Tests must not be weakened, skipped, or deleted to obtain a green result.

### Manual before pilot

- verify PDF upload/extraction on the intended deployment;
- verify no unexpected network request is introduced by PDF extraction;
- verify representative 320/360/390px and desktop layouts;
- verify physical-device file/camera/OCR flow;
- perform keyboard-only smoke;
- verify privacy/local-only/no-send wording.

### Human review before pilot

- at least one internal reviewer checks representative output for advice-like or over-confident wording;
- record a pilot facilitator/contact route;
- record the stop procedure;
- review the existing stop/go criteria.

## Vitest stall

The previous readiness audit observed worker-start stalls but no assertion failure, while PR #55 had completed a 148-file / 3,924-test serialized run.

Do not change Vitest configuration speculatively.

First use a low-concurrency full run such as:

`npx vitest run --no-file-parallelism --maxWorkers=1`

A test-runner configuration change requires separate evidence if the stall remains reproducible.

## Exact implementation boundary

Expected files:

- `docs/specs/active/pilot-release-hardening-v1.md`
- `package.json`
- `package-lock.json`
- `src/lib/documentFileText.ts`
- `src/lib/__tests__/documentFileText.test.ts`

Any additional production change requires explicit scope justification.

## Non-goals

This milestone does not add:

- user features;
- automatic sending/contact;
- backend or hosted AI;
- analytics or telemetry;
- automatic pilot instrumentation;
- restore/import;
- Community Helper expansion;
- Care Fee expansion;
- accessibility redesign;
- bundle refactoring;
- App/HomeView restructuring;
- speculative test-runner changes.

## Completion boundary

Completing this implementation removes the known PDF security blocker. It does **not** by itself authorise a real-user pilot.

A pilot may proceed only after the patched intake is validated and the existing automated/manual/human pilot evidence is genuinely completed and reviewed.
