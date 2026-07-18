# Feature Spec: D8 A4 Camera Calibration Lab

Status: Approved

Owner: AdminAvenger

Date: 2026-07-18

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
7. The lab captures by canvas or `ImageCapture.takePhoto()` when supported.
8. The lab sends only the captured image to the existing local scanner, records local telemetry, and offers a user-triggered JSON download.

## Development-Only Access

- The lab is reachable only when `import.meta.env.DEV` is true and the browser path is `/dev/camera-lab`.
- The lab is not added to `Sidebar` or normal production navigation.
- In production, `/dev/camera-lab` must not render the lab.

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
- Fall back honestly when `ImageCapture` is unavailable.
- Record source and output dimensions for each capture.
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

## Manual and Assisted Capture

- Keep manual capture always available after camera open.
- Optional assisted mode captures only after the document is continuously ready for the configured stability period.
- Prevent duplicate captures.
- Show countdown/feedback.

## Perspective-Correction Handling

- Reuse `scanDocumentFile` for final full-resolution scan preparation.
- Detection may analyse reduced preview frames, but final scan must use the highest practical captured image.
- Do not add public manual crop controls or restore removed crop helpers.
- Keep the normal Journey 5 "Does the whole document look clear?" confirmation unchanged.

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
- warnings;
- processing duration.

Provide a user-triggered JSON download only.

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
- A4 readiness behavior at good/poor distance, skew, low light, glare, and motion;
- scanner success/rejection;
- telemetry export content.

## Acceptance Criteria

- Lab route exists at `/dev/camera-lab` in development only.
- No camera request happens before deliberate user action.
- Unsupported camera controls are disabled.
- Rejected `applyConstraints()` errors are visible and non-fatal.
- Canvas and ImageCapture capture paths are selectable when supported.
- Canvas fallback is honest when ImageCapture is unavailable.
- Live A4 readiness uses the true A4 ratio and shows Not ready, Almost ready, or Ready.
- Assisted capture requires sustained readiness and prevents duplicate captures.
- Every capture runs through the existing local scanner.
- Telemetry download excludes prohibited content.
- Camera tracks stop on close, cancellation, and unmount.
- Production navigation does not expose the lab.
- Normal Journey 5 confirmation behavior remains unchanged.

## Rollback

Remove the dev route branch in `App.tsx`, delete the camera lab view, lab library, tests, and synthetic fixture. Because normal camera defaults and Journey 5 components are not changed, rollback should not require migration or user-data handling.

## Tests

- Pure measurement tests for A4 guide geometry, readiness, capability support, assisted capture gating, duplicate prevention, and telemetry sanitization.
- Rendered lab tests for camera-open behavior, capability display/control disabling, settings display, rejected constraints, ImageCapture/canvas selection, track cleanup, and telemetry export.
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

## Decisions Made During Implementation

- 2026-07-18: The lab will be a dev-only direct route rather than a normal app navigation item.
- 2026-07-18: The lab will use small pure functions for A4 geometry, readiness, assisted capture gating, capability support, and telemetry safety.
- 2026-07-18: Final scan preparation will call the existing `scanDocumentFile`; no new scanner or manual crop UI will be introduced.
- 2026-07-18: Spec approved after inspecting `PhotoCapturePanel`, `photoCapture`, `documentScanner`, `documentImageQuality`, `App`, `Sidebar`, and existing Journey 5 tests.
