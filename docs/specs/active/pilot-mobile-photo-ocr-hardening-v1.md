# Pilot Mobile Photo OCR Hardening v1

Status: implementation authorised

Human approval date: 8 September 2026

Base: `main` at `20aa3f1315811bc48eba976eeaca34c16a6a914a`

Branch: `codex/pilot-mobile-photo-ocr-hardening-v1`

Tracking: Linear `ADM-9`

## Why this corrective slice exists

Direct-human Android/PWA testing of the synthetic Riverdale Energy price-change notice exposed material OCR errors while the local/privacy and human-review boundary remained intact.

Source truth used for the acceptance run:

- sender: Riverdale Energy
- document date: 18 August 2026
- account reference: RE-60419
- current monthly payment: £64.00
- new monthly payment: £69.50
- effective date: 1 September 2026
- contact date: 25 August 2026
- the notice says supply will not be disconnected
- the notice says no late-payment fee is added

One direct camera run reported about 61% OCR confidence but produced plausible-looking critical-field errors including:

- `18 August 2026` → `28 August 2026`
- `RE-60419` → `RE-60414`
- `25 August 2026` → `25 August 2076`

At that confidence, the current production UI can still show normal `Key details found` and can mark the source review state as confirmed. The direct-human evidence therefore disproves the assumption that the current 60% key-detail boundary is strong enough for critical dates/references.

This is a `HIGH / pilot-blocking` image/camera-route reliability issue. It is not a privacy or automatic-action blocker: the photo stayed local, the OCR text remained reviewable, and no consequential action was taken automatically.

## Governing product boundary

> AI prepares. Humans decide.

This slice must remain local-first and privacy-first.

It must not:

- upload document images or OCR text;
- introduce cloud OCR;
- add production telemetry;
- send, submit, contact, pay, save a case, or take another consequential action automatically;
- silently convert uncertain OCR into a verified source fact.

## Repository diagnosis at the approved base

The approved implementation is based on the following observed repository behaviour:

1. `src/lib/photoOcr.ts` runs one Tesseract recognition pass through local same-origin OCR assets.
2. `OCR_UNRELIABLE_CONFIDENCE_THRESHOLD` is 45.
3. `OCR_KEY_DETAILS_CONFIDENCE_THRESHOLD` is 60.
4. The moderate-confidence warning band extends below 70.
5. `HomeView.tsx` can mark a photo source `reviewState: "confirmed"` whenever the lower unreliability check returns false.
6. The normal production camera path captures the current video frame through canvas and JPEG encoding.
7. The development-only camera calibration lab already contains a capability-gated `ImageCapture.takePhoto()` experiment and honest fallbacks.
8. The current scanner detects a document on a reduced-resolution image, renders a perspective-corrected image, performs grayscale/contrast enhancement, caps the output long edge and re-encodes to JPEG before OCR.
9. Existing OCR tests strongly cover safety and state contracts but mock Tesseract; scanner tests primarily use synthetic pixel geometry. They do not by themselves prove real image → OCR → critical-field accuracy.
10. Close-up OCR currently appends sections; it does not provide a reusable conflict/consensus contract for contradictory critical facts.

Draft PR #54 remains separate. It contains useful Scanner V2 ideas and an engine boundary, but it is stale/conflicting and must not be revived or merged wholesale as part of this corrective slice.

Current scanner engine status remains:

> **PROVISIONAL — REQUIRES REAL MOBILE ACCEPTANCE TESTING**

## Scope

This workstream is deliberately staged. Safety gating comes first, then capture fidelity, then measured OCR/scanner comparison.

### Slice A — fail closed earlier for moderate OCR

Introduce one explicit review-required confidence contract aligned with the existing moderate-confidence range.

Initial target boundary: OCR confidence below 70 requires explicit review before critical details may be treated as normal extracted facts. The exact constant may change only if regression evidence justifies it.

Required behaviour:

- 60–61% OCR must not expose ordinary `Key details found` as if they are sufficiently reliable.
- Moderate-confidence OCR must be routed into a review-required state with clear recovery choices.
- Existing low-confidence wording/action hierarchy should be reused where appropriate rather than creating a second confusing recovery journey.
- Missing confidence must not be silently treated as high confidence.
- A photo source must not be marked `confirmed` merely because OCR cleared the old 45% threshold.
- Human-edited/corrected text may become reviewed/accepted only through an explicit user action already present in the UI.
- No numeric-confidence score needs to become more prominent in the normal user hierarchy.

### Slice B — provenance review-state integrity

Define a pure, testable source-review-state decision rather than deriving source provenance from the old low-confidence helper inline.

The decision must distinguish at minimum:

- `review_required`: OCR is below the approved review boundary, garbled, too short, missing a trustworthy confidence signal for critical-detail use, or contains an unresolved critical-field conflict;
- `confirmed`: the OCR result clears the approved boundary and no conflict signal exists, or the person explicitly reviewed/corrected the text through the existing human-review action.

The exact type names may reuse existing source-provenance vocabulary, but the semantic rule above must be preserved.

### Slice C — improve camera capture fidelity without a new production dependency

Reuse or carefully extract the existing capability-gated still-photo approach already proven in the development calibration lab.

Required behaviour:

- where `ImageCapture.takePhoto()` is supported, it may be used to obtain a higher-fidelity still image;
- where it is unavailable or fails, fall back honestly to the existing canvas/video-frame capture;
- do not assume `ImageCapture` exists on iPhone/Safari;
- preserve gallery/upload and current recovery routes;
- preserve deliberate shutter/capture control;
- stop camera tracks exactly as today on capture/cancel/close/unmount;
- do not add telemetry or network upload;
- no new production dependency is authorised by this spec.

This slice must not claim `ImageCapture` is superior until measured on the same real-device test cases.

### Slice D — OCR candidate comparison and critical-field conflict detection

Before selecting a new production scan/OCR path, add reusable comparison logic for critical facts.

Candidate OCR inputs may include:

- original accepted photo;
- current prepared scan;
- existing safe deterministic preprocessing variants already available in the codebase;
- an explicitly approved additional preprocessing variant only if it requires no new production dependency and is regression-tested.

Critical-field comparison must cover at least:

- dates;
- GBP amounts;
- reference/account/claim-like identifiers;
- sender/company names where a strong structured candidate exists.

Rules:

- exact agreement may strengthen confidence;
- harmless formatting differences may normalize before comparison;
- materially different critical values must create a conflict/review signal;
- the system must not silently choose the most plausible-looking candidate;
- the system must not auto-correct Riverdale-specific values;
- a conflict must fail closed into human review;
- negative source statements such as `no late-payment fee` / `will not be disconnected` must not be contradicted by an OCR-derived invented consequence.

### Slice E — real OCR regression coverage

Keep the current fast mocked/unit coverage and add a focused real-OCR browser regression using the same-origin Tesseract assets.

The regression must use synthetic, non-personal material only.

It must exercise a deterministic document image containing at least:

- a sender/company name;
- one account/reference identifier;
- two GBP amounts;
- a document date;
- an effective date;
- a contact/deadline date;
- negative safety wording comparable to `no disconnection` / `no late-payment fee`.

The browser regression must assert the user-visible/result contract rather than merely checking that Tesseract returned non-empty text.

Where deterministic degraded variants remain stable across local/CI browser runs, add coverage for one or more of:

- downscale/compression;
- modest perspective/rotation;
- reduced contrast;
- mild blur;
- browser-generated screen/moire-like degradation.

Do not commit real mobile photos, private user documents or generated benchmark-output folders.

## Implementation sequence

The authorised order is:

1. Add regression tests that reproduce the unsafe confidence/provenance assumptions.
2. Implement Slice A and Slice B only.
3. Run focused and adjacent tests before touching camera capture.
4. Add the capability-gated capture fidelity work in Slice C with fallback tests.
5. Build local/browser comparison evidence for source-photo vs prepared-scan OCR inputs.
6. Implement only the conflict/consensus behaviour supported by that evidence.
7. Add the real-Tesseract browser regression.
8. Run full verification.
9. Deploy only after review/approval under the normal repository process.
10. Rerun direct-human Android installed-PWA acceptance on the Riverdale source.

Do not combine the work into a broad scanner redesign merely because the branch is already touching image intake.

## Regression-first acceptance criteria

Automated coverage must prove at minimum:

- 61% OCR is review-required, not normal key-detail presentation;
- values at the approved boundary behave deterministically;
- missing confidence does not silently become trusted critical-detail output;
- garbled/short text remains review-required;
- explicit user correction/review can progress safely;
- source provenance remains review-required until the human-review contract is satisfied;
- main-photo and close-up critical-field disagreement fails closed;
- equivalent amount/date/reference formatting does not create false conflicts;
- materially different dates/references/amounts do create conflicts;
- capability-gated `ImageCapture` capture falls back safely to canvas;
- camera lifecycle cleanup remains intact;
- no network/cloud OCR path is introduced;
- existing P-PASTE HMRC, P-DOCX Northbridge and P-PDF Greenfield regressions remain green;
- current resource-safety limits remain intact.

## Required validation

Before the implementation may be called ready for human acceptance:

```powershell
npm test -- src/lib/__tests__/photoOcr.test.ts
npm test -- src/components/__tests__/LowConfidenceOcrReviewPanel.test.tsx
npm test -- src/components/__tests__/PhotoCapturePanel.interaction.test.tsx
npm test -- src/lib/__tests__/photoCapture.test.ts src/lib/__tests__/documentScanner.test.ts src/lib/__tests__/documentImageQuality.test.ts
npm test
npm run lint
npm run build
powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
git diff --check
```

Any new focused real-OCR browser spec must also run explicitly and pass against the local same-origin OCR assets.

A historical failed or flaky run must remain recorded honestly even if a later clean rerun passes.

## Manual pilot gate

`P-IMAGE` / `P-CAMERA` remain `FAIL — HIGH / pilot-blocking` until the corrected production build receives direct-human acceptance.

Minimum post-deploy owner rerun:

### Android installed PWA — gallery/upload

- prepared scan visibly contains the intended document;
- OCR critical facts match the Riverdale source or fail closed into review;
- no wrong date/reference is presented as an ordinary trusted key detail;
- user can recover through correction/retake/close-up/replacement without confusion;
- no unexpected upload/network action occurs.

### Android installed PWA — live camera

Same checks as gallery/upload, plus:

- rear-camera capture works;
- capture method/fallback is not exposed as a technical burden to the user;
- camera stream stops after capture/cancel/close;
- no console-visible product error affects the journey.

### iPhone Safari

Remains a separate device gate under the pilot acceptance matrix. Android evidence must not be used as an iPhone pass.

## Explicit non-goals

This workstream does not:

- merge or revive PR #54 wholesale;
- permanently select the current scanner engine;
- benchmark Scanic or jscanify unless a separate measured comparison is explicitly authorised;
- add OpenCV, PaddleOCR, cloud OCR or another production dependency;
- add manual crop UI to the current pilot route;
- add auto-capture;
- add production document telemetry;
- introduce Riverdale-specific correction rules;
- guess which conflicting OCR value is correct;
- weaken local-first/privacy boundaries;
- broaden into unrelated Result UI, Safety Check, care/benefits, accounts/cloud sync or other deferred workstreams.

## Completion rule

Implementation completion and pilot acceptance are separate.

The code slice may be implementation-complete only after all required automated/browser validation passes at a named SHA.

The image/camera pilot gate may move to PASS only after direct-human production acceptance is recorded for the exact deployed SHA. Automated success cannot override a direct-human failure.
