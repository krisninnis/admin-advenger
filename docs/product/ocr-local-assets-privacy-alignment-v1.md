# OCR local-assets privacy alignment — v1

## Status

Implemented. This is a runtime privacy-boundary correction only. It does not
change camera UX, image preparation, OCR accuracy, confidence thresholds,
review behaviour, or document extraction.

## Previous risk and verified behaviour

Both OCR entry points dynamically imported the installed `tesseract.js`
package and called `Tesseract.recognize(...)` without asset paths.

Inspection of the installed Tesseract.js 7.0.0 source established that its
browser defaults were:

- worker:
  `https://cdn.jsdelivr.net/npm/tesseract.js@v7.0.0/dist/worker.min.js`;
- core/WASM base:
  `https://cdn.jsdelivr.net/npm/tesseract.js-core@v7.0.0`;
- English LSTM data:
  `https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz`.

The document image was processed by the browser worker rather than uploaded
to an OCR API, but the worker, core/WASM and language model could leave the
app origin. The CSP explicitly permitted jsDelivr for scripts, workers and
connections. Describing this as “no network activity” would therefore have
been incorrect.

## Final runtime configuration

`src/lib/ocrRuntimeAssets.ts` is the single configuration used by
`src/lib/photoOcr.ts` and `src/services/localOcrService.ts`. It supplies every
Tesseract asset path, keeps gzip language loading enabled, and sets
`workerBlobURL: false`. Tesseract receives no omitted path from which it could
select a CDN default.

The lazy same-origin locations are:

| Asset | Runtime location | Source |
|---|---|---|
| Worker | `/ocr/tesseract/worker.min.js` | installed `tesseract.js` 7.0.0 |
| Baseline LSTM core | `/ocr/tesseract-core/tesseract-core-lstm.wasm.js` and matching `.wasm` | installed `tesseract.js-core` 7.0.0 |
| SIMD LSTM core | `/ocr/tesseract-core/tesseract-core-simd-lstm.wasm.js` and matching `.wasm` | installed `tesseract.js-core` 7.0.0 |
| Relaxed-SIMD LSTM core | `/ocr/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js` and matching `.wasm` | installed `tesseract.js-core` 7.0.0 |
| English trained data | `/ocr/tesseract-data/eng.traineddata.gz` | Tesseract English `4.0.0_best_int` data used by the package default |

Pinned SHA-256 checksums:

| Asset | SHA-256 |
|---|---|
| `worker.min.js` | `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d` |
| `tesseract-core-lstm.wasm.js` | `eef5f8b2f8e20e150680b20adaec4a60babafee3adbe8a94583c81fee46e8680` |
| `tesseract-core-lstm.wasm` | `66b17df6e20c5329a17ffa9c202a47eaa3e32500b253d4c7f38e7f2bc01457c3` |
| `tesseract-core-simd-lstm.wasm.js` | `c58b46a4c796c0b8afccf77591d5b875b6896b45d402bbce8caa6f5362447b38` |
| `tesseract-core-simd-lstm.wasm` | `34e8d50cac216427d86bf397d610fdd9f49492539bbcdfbfccc4eda20c810bea` |
| `tesseract-core-relaxedsimd-lstm.wasm.js` | `861a536cf9ef8e63cb644d57bab39c388f37f7d6b6f60024b741c5f6b39a59b3` |
| `tesseract-core-relaxedsimd-lstm.wasm` | `7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545` |
| `eng.traineddata.gz` | `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` |

The English data was obtained once during development from the package
default path above and is now a version-controlled application asset. That
external URL is not used at runtime.

## Runtime network and privacy boundary

“Local OCR” means:

- OCR execution happens in the browser;
- the document image and extracted text stay within the app/browser and are
  not sent to an external OCR service;
- on first OCR use, the browser may download the worker, core/WASM and English
  data as ordinary application assets from AdminAvenger's own origin;
- those same-origin asset downloads are network activity and must not be
  described as an offline or zero-network guarantee;
- missing or blocked local assets cause OCR to reject through the existing
  failure path; there is no CDN fallback.

Tesseract retains its installed feature detection and selects the compatible
relaxed-SIMD, SIMD, or baseline LSTM core from that same-origin directory.
The service worker may cache successful same-origin asset responses under its
existing cache-first behaviour. The application does not pre-load OCR assets
at startup: both OCR entry points retain their dynamic `import("tesseract.js")`
boundary.

## CSP

`vercel.json` no longer permits `https://cdn.jsdelivr.net` in `script-src`,
`worker-src`, or `connect-src`. Tesseract uses same-origin scripts, workers,
WASM and fetches. Existing localhost allowances for optional local services
remain unchanged.

## Upgrade rule

For every Tesseract.js or language-data upgrade:

1. inspect the installed package's browser defaults and loading code;
2. replace the vendored worker, exact core loader/WASM pair, and language data
   as a reviewed set;
3. update the paths and checksums in this note;
4. keep every path explicit and same-origin;
5. verify both OCR entry points still use the shared configuration and dynamic
   import;
6. inspect the production build for external OCR URLs; and
7. do not add a CDN fallback or CSP permission “just in case.”
