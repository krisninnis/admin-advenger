# Photo OCR Manual Testing

AdminAvenger's photo OCR testing should stay local-first and privacy-safe.

Use this folder for real local test images:

```text
manual-test-fixtures/photo-ocr/
```

Rules:

- Do not commit real document photos, screenshots, letters, bills, or receipts.
- Keep real test images in `manual-test-fixtures/photo-ocr/`; that folder is ignored by git.
- Redact names, addresses, references, account numbers, QR codes, barcodes, and payment details before sharing screenshots.
- Use the fixtures only for local manual testing.

Suggested manual checks:

- Full-page synthetic letter in good, even light.
- Full-page synthetic letter with background clutter.
- Low light, glare, shadows, folds/creases, a cropped page, small text, and a
  deliberately blurry photo.
- Existing synthetic screenshot/image uploaded from the device.
- Camera permission denied and camera unavailable.
- Retake, replacement upload, and an optional close-up of a hard-to-read
  section.

Current workflow:

1. From Home, choose `Take or upload a photo` and then take a photo or upload a
   local synthetic image.
2. AdminAvenger finds and prepares the document locally. Review the prepared
   scan at `Does the whole document look clear?`.
3. Choose `Yes, use this` only when the prepared scan contains the intended
   document. Choose `No, try again` to retake or replace it.
4. If no clear document is found, use the current recovery choices: retake,
   upload a clearer image, deliberately use the original with its warning, or
   edit/paste manually.
5. After accepting a prepared scan, wait for on-device OCR and review the
   extracted text. Correct it, add a close-up, or retake before choosing to
   check the reviewed text.

Expected behaviour:

- Every camera or uploaded image goes through prepared-scan review before OCR.
- Rejecting a prepared scan must not run it through the result journey.
- The original-photo fallback appears only when preparation cannot find a clear
  document and retains its explicit background/missing-content warning.
- The OCR review text remains editable before checking.
- Low-confidence OCR still hides key details until the text is reliable or
  reviewed, with correction, close-up, retake, or replacement recovery.
- Permission-denied and camera-unavailable states still offer upload.
- The photo stays in the browser in this version; nothing is sent, saved, or
  checked automatically.
- On first OCR use, the browser may request `/ocr/tesseract/worker.min.js`,
  a compatible same-origin LSTM core loader/WASM pair, and
  `/ocr/tesseract-data/eng.traineddata.gz`.
- No OCR request uses jsDelivr or another external OCR host, and no request
  body contains the document image or extracted text.
