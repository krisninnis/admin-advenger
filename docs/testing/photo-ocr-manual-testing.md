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

- Full-page letter with background clutter.
- Same photo with the document area selected tightly.
- Close crop of the top section.
- Close crop of the bottom section.
- Poor blurry photo.
- Dark photo.
- Glare or reflection photo.

Expected behaviour:

- `Read this area` should OCR the selected document area.
- `Use full photo` should warn that background may make OCR less reliable.
- The OCR review text remains editable before checking.
- Low-confidence OCR still hides key details until the text is reliable or reviewed.
