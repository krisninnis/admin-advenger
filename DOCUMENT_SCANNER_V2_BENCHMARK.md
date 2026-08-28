# Document Scanner V2 Engine Assessment

**Issue:** #53  
**Branch:** `codex/document-scanner-v2`  
**Starting SHA:** `771accc30d0cd1ee4355ad40cc7121df41566fd2`

## Evidence standard

This document deliberately separates repository/source inspection from measurements that were actually executed.

The earlier draft contained unsupported accuracy percentages, timing numbers, and candidate-by-candidate fixture results. Those claims were not backed by executed comparative measurements in the GitHub agent environment and are therefore withdrawn.

No candidate is described here as having "won" a real-device benchmark.

## Current AdminAvenger engine

Direct repository inspection confirms that `src/lib/documentScanner.ts` already provides:

- local pixel analysis;
- four-corner document detection;
- quad validation;
- perspective correction;
- on-device image preparation;
- no external scanner dependency.

Existing repository tests exercise synthetic detection cases and geometry. This is useful evidence that the low-level implementation is testable, but it is not evidence of real-world mobile-camera accuracy.

The human product owner has reported that the current real-world scanning experience is poor. That feedback remains a material acceptance signal.

## Scanic

Candidate: https://github.com/marquaye/scanic

- permissive MIT licence;
- browser-oriented document-scanning candidate;
- considered because it could provide a lighter alternative to OpenCV-based approaches.

Status in this milestone: **not directly benchmarked against real mobile captures in the agent environment**.

No accuracy, latency, or bundle-size claim for Scanic is treated as measured fact in this branch.

## jscanify

Candidate: https://github.com/puffinsoft/jscanify

- permissive MIT licence;
- browser document-scanning library built around OpenCV.js;
- potentially stronger computer-vision primitives at the cost of a materially heavier dependency surface.

Status in this milestone: **not directly benchmarked against real mobile captures in the agent environment**.

No accuracy, latency, or bundle-size claim for jscanify is treated as measured fact in this branch.

## Architecture decision for Scanner V2

Scanner V2 does **not** permanently select the current detector.

The implementation introduces an explicit `DocumentScannerEngine` boundary:

```text
Scanner V2 UI
→ DocumentScannerEngine
→ provisional current AdminAvenger engine
→ existing OCR/intake
```

The current low-level implementation is used provisionally because it is already present, local-only, and compatible with the existing provenance/OCR pipeline. The new user experience is intentionally independent of that detector so it can be replaced later without rebuilding the scanner UI.

Engine status is explicitly:

> **PROVISIONAL PENDING REAL-DEVICE ACCEPTANCE**

## Scanner V2 improvements implemented on this branch

The Scanner V2 work is intended to fix the product-level gaps regardless of the eventual detector:

- live reduced-resolution page detection during camera preview;
- visible page outline;
- plain-English live status;
- manual shutter always available;
- post-capture crop review;
- four draggable, keyboard-adjustable corners;
- manual crop even if automatic detection fails;
- Reset corners;
- Use full image;
- Retake;
- Adjust crop;
- explicit Use scan;
- perspective-corrected preview;
- Original / Colour, Clean, Grayscale and Black & white modes;
- original capture retained until explicit acceptance;
- existing OCR/provenance handoff preserved;
- camera-stream cleanup on cancel/capture/unmount;
- no cloud processing, remote OCR, telemetry, or hidden upload.

## Acceptance decision

Physical Android/PWA testing is required before merge.

The real-device test should determine one of two outcomes:

1. **Current engine + Scanner V2 UX is good enough** — retain the provisional engine for now.
2. **Page detection remains poor** — keep the completed Scanner V2 UI and replace only the `DocumentScannerEngine` implementation with Scanic, jscanify, or another separately reviewed permissive engine.

No permanent engine decision should be made from this document alone.
