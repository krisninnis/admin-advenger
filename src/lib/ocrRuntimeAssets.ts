export const OCR_RUNTIME_ASSET_PATHS = {
  workerPath: "/ocr/tesseract/worker.min.js",
  corePath: "/ocr/tesseract-core",
  langPath: "/ocr/tesseract-data",
} as const;

// Root-relative paths keep every lazy OCR runtime request on the app origin.
// Supplying every Tesseract path is intentional: omitted paths silently fall
// back to jsDelivr in Tesseract.js 7. A direct same-origin worker also avoids
// the library's default blob wrapper.
export const LOCAL_OCR_RUNTIME_OPTIONS = {
  ...OCR_RUNTIME_ASSET_PATHS,
  workerBlobURL: false,
  gzip: true,
} as const;
