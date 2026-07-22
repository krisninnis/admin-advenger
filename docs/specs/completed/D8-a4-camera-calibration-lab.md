# Feature Spec: D8 A4 Camera Calibration Lab

Status: Completed

Owner: AdminAvenger

Date: 2026-07-18

Scope note: The expanded development-lab implementation is merged. Physical-device calibration remains pilot and research evidence; calibration thresholds are not production defaults.

## Outcome

Add a development-only A4 camera calibration lab that lets builders test real mobile camera capabilities, A4 framing guidance, capture methods, live quality metrics, scanner output, and local telemetry without changing the normal Journey 5 camera flow.

## Why

Journey 5 depends on people taking clear full-page photos before local scan preparation and OCR. Automated tests can verify the state machine and scanner boundaries, but real devices vary widely in camera constraints, focus, zoom, torch, frame size, capture quality, and browser support. A development-only calibration lab gives repeatable evidence before changing the normal user-facing journey.

## User Journey

1. A developer opens `/dev/camera-lab` in a development build.
2. The page does not request camera permission on load.
3. The developer deliberately opens the camera.
4. The lab displays supported constraints, track capabilities, settings, active constraints, selected camera/facing mode, frame size, frame rate, zoom/focus/torch support, and live A4 readiness.
5. The developer adjusts supported camera/lab settings.
6. The developer captures manually, or enables assisted capture after sustained readiness.
7. The lab captures by canvas, `ImageCapture.takePhoto()` when supported, system camera file input, or gallery upload.
8. The lab sends only the captured or selected image to the existing local scanner, records local telemetry, and offers a user-triggered JSON download.
9. The developer compares guidance, capture, scan, and review variants without changing the normal Journey 5 user flow.

## Development-Only Access

- The lab is reachable only when the browser path is `/dev/camera-lab` and either:
  - `import.meta.env.DEV` is true; or
  - `import.meta.env.VITE_ENABLE_CAMERA_LAB === "true"`.
- `VITE_ENABLE_CAMERA_LAB` is a public boolean build flag, never a secret.
- `VITE_ENABLE_CAMERA_LAB=true` may be configured only for the D8 Vercel Preview branch.
- `VITE_ENABLE_CAMERA_LAB` must remain absent or false in Production.
- The lab is not added to `Sidebar` or normal production navigation.
- Direct route access remains required; there must be no normal app link to the lab.
- Camera permission still requires deliberate user action after the lab route renders.
- In unflagged production, `/dev/camera-lab` must not render the lab.

## Privacy Constraints

- Never request camera permission on page load.
- Never upload image pixels, telemetry, OCR text, or scanner output.
- Keep camera frames, captures, scanner results, and telemetry in the browser only.
- Telemetry JSON must exclude image pixels, OCR text, file paths, usernames, absolute local paths, Vercel bypass tokens, secrets, document names, and personal data.

## A4 Guide Geometry

- Use true portrait A4 aspect ratio: `width / height = 1 / sqrt(2)`.
- Provide adjustable guide scale.
- Calculate guide dimensions from the preview frame while preserving the A4 ratio.

## Camera Capabilities and Settings

- After explicit camera open, display:
  - `navigator.mediaDevices.getSupportedConstraints()`;
  - `MediaStreamTrack.getCapabilities()`;
  - `MediaStreamTrack.getSettings()`;
  - active constraints;
  - selected camera/facing mode;
  - actual width/height and frame rate;
  - zoom range/current zoom when available;
  - focus modes when available;
  - torch support when available.
- Allow controlled experimentation with preferred width/height, frame rate, facing mode/device, zoom, focus mode, and torch.
- Use capabilities before enabling controls.
- Apply constraints safely and show rejected constraints without crashing.

## Capture Methods

- Support existing video-frame/canvas capture.
- Support `ImageCapture.takePhoto()` when available.
- Support system camera capture through a file input using `accept="image/*"` and `capture="environment"`.
- Support existing gallery upload as a universal fallback.
- Compare all four capture strategies:
  - video-frame canvas capture;
  - `ImageCapture.takePhoto()` when available;
  - system camera capture through the environment file input;
  - gallery upload.
- Do not assume `ImageCapture` exists on iOS.
- Fall back honestly when `ImageCapture` is unavailable.
- Record image dimensions, file size, sharpness, scan result, and processing time for every method.
- Do not claim either method is better.

## Live Document-Quality Measurements

- Analyse reduced-size preview frames.
- Display:
  - all four corners visible;
  - document inside frame;
  - document coverage within configured range;
  - skew acceptable;
  - brightness acceptable;
  - glare excessive or acceptable;
  - sharpness acceptable;
  - stable duration.
- Show state: Not ready, Almost ready, Ready.
- Keep raw metrics visible only in the developer panel.

## User-Facing Guidance Experiment

- Provide an experiment mode that shows only one highest-priority instruction at a time.
- Use this priority order:
  1. No document found.
  2. Keep all four corners inside.
  3. Move further away.
  4. Move closer.
  5. Hold the phone level.
  6. More light needed.
  7. Reduce glare.
  8. Hold still.
  9. Ready.
- The guidance mode should be plain-language and suitable for later user testing.
- Developer-only panels may still show the underlying raw metrics.

## Manual and Assisted Capture

- Keep manual capture always available after camera open.
- Optional assisted mode captures only after the document is continuously ready for the configured stability period.
- Prevent duplicate captures.
- Show countdown/feedback.

## Auto-Capture Safety

- Auto-capture must require:
  - a valid four-corner quadrilateral;
  - page completely inside the frame;
  - acceptable page coverage;
  - acceptable skew;
  - acceptable sharpness and brightness;
  - low glare where measurable;
  - quad stability across consecutive frames;
  - sustained readiness for a configurable period;
  - no capture already in progress;
  - cooldown after capture.
- Manual capture must always remain available.
- Use these only as initial calibration defaults:
  - quad IoU: `0.85`;
  - maximum area delta: `0.15`;
  - stable duration: `700 ms`.
- Do not promote these calibration defaults to production without physical-device evidence.

## Review Experiment

- Add a developer-only experiment comparing:
  - prepared scan only;
  - original/prepared toggle;
  - prepared scan with conditional "Fix edges".
- Do not change the normal Journey 5 review screen during the lab.
- Do not reintroduce manual crop or edge fixing to the normal journey.

## Perspective-Correction Handling

- Reuse `scanDocumentFile` for final full-resolution scan preparation.
- Detection may analyse reduced preview frames, but final scan must use the highest practical captured image.
- Do not add public manual crop controls or restore removed crop helpers.
- Keep the normal Journey 5 "Does the whole document look clear?" confirmation unchanged.

## Capture Lifecycle

- Verify and record that all camera tracks stop after:
  - successful capture;
  - Cancel;
  - close;
  - route change;
  - component unmount;
  - capture error.
- Lifecycle results should be visible in the developer panel and included in local telemetry.

## Telemetry and Export Format

For every capture, record locally in memory:

- timestamp;
- anonymized browser/platform description;
- requested constraints;
- actual settings;
- capture method;
- source dimensions;
- output dimensions;
- document coverage;
- four-corner status;
- skew metric;
- sharpness metric;
- brightness metric;
- glare metric;
- stability duration;
- scanner result;
- lifecycle/track-stop result;
- warnings;
- processing duration.

Provide a user-triggered JSON download only.

## Long-Term Architecture Recommendation

- Android native: Google ML Kit Document Scanner.
- iOS native: Apple VisionKit Document Camera.
- Web: capability-selected guided/system-camera fallback.
- Gallery: universal fallback.
- Do not implement native mobile bridges in D8.

## Benchmark Fixture

Add a synthetic A4 calibration sheet fixture with large/small text, synthetic dates, synthetic GBP amounts, fake reference number, small table, edge text, and four corner markers. It must contain no real names, addresses, account numbers, or private information.

## Real-Device Calibration Procedure

Test Android Chrome, iOS Safari, and desktop Chrome where available. For each device/browser, capture:

- permission prompt behavior;
- rear camera selection;
- actual resolution and frame rate;
- zoom/focus/torch availability;
- canvas capture dimensions;
- ImageCapture availability and dimensions;
- system camera file-input capture dimensions;
- gallery upload dimensions;
- A4 readiness behavior at good/poor distance, skew, low light, glare, and motion;
- scanner success/rejection;
- one-instruction guidance behavior;
- auto-capture stability and cooldown behavior;
- review experiment behavior;
- track-stop lifecycle behavior;
- telemetry export content.

## Acceptance Criteria

- Lab route exists at `/dev/camera-lab` in development only.
- No camera request happens before deliberate user action.
- Unsupported camera controls are disabled.
- Rejected `applyConstraints()` errors are visible and non-fatal.
- Canvas and ImageCapture capture paths are selectable when supported.
- System camera file-input and gallery upload capture paths are available.
- Canvas fallback is honest when ImageCapture is unavailable.
- The lab does not assume ImageCapture support on iOS.
- Every capture method records image dimensions, file size, sharpness, scan result, and processing time.
- Live A4 readiness uses the true A4 ratio and shows Not ready, Almost ready, or Ready.
- Guidance experiment shows one highest-priority instruction at a time while developer metrics remain separately visible.
- Assisted capture requires a valid stable quadrilateral, document inside frame, acceptable coverage/skew/sharpness/brightness/glare, sustained readiness, no in-flight capture, and cooldown.
- Assisted capture defaults remain calibration-only and are not production defaults.
- Manual capture remains available.
- Review experiment compares prepared-only, original/prepared toggle, and prepared-with-conditional-Fix-edges variants without changing normal Journey 5.
- Every capture runs through the existing local scanner.
- Telemetry download excludes prohibited content.
- Camera tracks stop on successful capture, Cancel, close, route change, component unmount, and capture error; results are recorded.
- Production navigation does not expose the lab.
- Normal Journey 5 confirmation behavior remains unchanged.

## Rollback

Remove the dev route branch in `App.tsx`, delete the camera lab view, lab library, tests, and synthetic fixture. Because normal camera defaults and Journey 5 components are not changed, rollback should not require migration or user-data handling.

## Tests

- Pure access-gate tests for development, exact preview flag, missing production flag, false flag, and arbitrary flag values.
- Pure measurement tests for A4 guide geometry, readiness, guidance priority, quad stability, capability support, assisted capture gating, cooldown, duplicate prevention, and telemetry sanitization.
- Rendered lab tests for camera-open behavior, capability display/control disabling, settings display, rejected constraints, canvas/ImageCapture/system-camera/gallery selection, review variants, lifecycle recording, track cleanup, and telemetry export.
- Sidebar/navigation test proving production navigation does not expose the lab.
- Existing Journey 5 interaction tests must pass.
- Existing photo/scanner tests must pass.

## Explicit Non-Goals

- Do not change normal user-facing camera defaults.
- Do not replace the existing Journey 5 confirmation gate.
- Do not add PaddleOCR.
- Do not add cloud OCR.
- Do not upload document images or telemetry.
- Do not add manual crop UI to the normal journey.
- Do not expose the calibration lab in production navigation.
- Do not use URL query parameters as the only access gate.
- Do not weaken Vercel Authentication.
- Do not treat `VITE_ENABLE_CAMERA_LAB` as a secret or token.
- Do not implement native mobile bridges in D8.
- Do not promote calibration thresholds to production defaults without physical-device evidence.
- Do not deploy or push.
- Do not use real personal documents as fixtures.

## Validation Commands

```powershell
npm test -- src/lib/__tests__/cameraCalibrationLab.test.ts src/views/__tests__/CameraCalibrationLabView.test.tsx
npm test -- src/components/__tests__/PhotoCapturePanel.interaction.test.tsx
npm test -- src/lib/__tests__/photoCapture.test.ts src/lib/__tests__/documentScanner.test.ts src/lib/__tests__/documentImageQuality.test.ts
npm test
npm run lint
npm run build
powershell -ExecutionPolicy Bypass -File scripts\verify.ps1
git diff --check
```

## Completion Evidence

- 2026-07-18: Added a development-only `/dev/camera-lab` route, lazy-loaded behind `import.meta.env.DEV` and absent from normal navigation.
- 2026-07-18: Added local A4 guide, capability/settings inspection, safe camera controls, canvas/ImageCapture capture paths, live readiness metrics, assisted capture gating, existing scanner processing, and local-only telemetry export.
- 2026-07-18: Added synthetic non-personal A4 calibration fixture at `docs/testing/a4-camera-calibration-sheet.html`.
- 2026-07-18: Focused lab tests passed: `npm test -- src/lib/__tests__/cameraCalibrationLab.test.ts src/views/__tests__/CameraCalibrationLabView.test.tsx` (2 files, 18 tests).
- 2026-07-18: Journey 5 interaction tests passed: `npm test -- src/components/__tests__/PhotoCapturePanel.interaction.test.tsx` (1 file, 2 tests).
- 2026-07-18: Existing photo/scanner tests passed: `npm test -- src/lib/__tests__/photoCapture.test.ts src/lib/__tests__/documentScanner.test.ts src/lib/__tests__/documentImageQuality.test.ts` (3 files, 119 tests).
- 2026-07-18: Full test suite passed: `npm test` (65 files, 1,420 tests).
- 2026-07-18: `npm run lint` passed.
- 2026-07-18: `npm run build` passed with the existing large chunk-size warning.
- 2026-07-18: `powershell -ExecutionPolicy Bypass -File scripts\verify.ps1` passed all verification checks.
- 2026-07-18: `git diff --check` passed with only the normal Windows LF/CRLF warning for `src/App.tsx`.
- 2026-07-18: Research-backed requirements were added after the initial implementation slice. The existing implementation evidence does not yet prove the expanded capture-comparison, guidance, auto-capture stability, review-experiment, and lifecycle requirements.

## Decisions Made During Implementation

- 2026-07-18: The lab will be a dev-only direct route rather than a normal app navigation item.
- 2026-07-18: The lab will use small pure functions for A4 geometry, readiness, assisted capture gating, capability support, and telemetry safety.
- 2026-07-18: Final scan preparation will call the existing `scanDocumentFile`; no new scanner or manual crop UI will be introduced.
- 2026-07-18: Spec approved after inspecting `PhotoCapturePanel`, `photoCapture`, `documentScanner`, `documentImageQuality`, `App`, `Sidebar`, and existing Journey 5 tests.
- 2026-07-18: Added research-backed requirements for comparing canvas, ImageCapture, system camera input, and gallery upload; highest-priority user guidance; safer auto-capture stability/cooldown; developer-only review variants; track lifecycle recording; and long-term native/web/gallery architecture.

## Final Completion Note

- Expanded capture comparison, guidance, stability and cooldown controls, review experiments, lifecycle evidence, and local telemetry are merged.
- The lab remains development-only and is not exposed through normal production navigation.
- Android, iOS, and desktop physical-device calibration remains part of pilot and research validation.
- Calibration thresholds must not become production defaults without physical-device evidence.
