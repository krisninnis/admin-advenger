# Document File Support v1

Status: implemented (local DOCX/PDF text extraction + attachment flow and
wording updates). No new decision-engine behaviour, no new
classification/routing logic beyond file-type recognition, no cloud
services.

## Why this exists

Before this change, selecting a DOCX or PDF file anywhere in AdminAvenger
(the "Attach document photos" area, the compact "+" upload menu, or the
"Upload a file" tab) showed a generic "not supported yet" message. Read
quickly, that message could feel like the file had simply disappeared -
"nothing uploaded" - rather than like AdminAvenger had made a clear,
deliberate choice not to read it yet. On top of that, DOCX and PDF are two of
the most common formats people actually have letters, bills, and notices
in, so the app's most common failure mode was exactly the files people
reached for first.

Document File Support v1 fixes both problems: DOCX and PDF are now read
locally in the browser wherever a file can be attached, and the wording
around every file selection - supported or not - is rewritten so it is
always immediately clear that the file was only ever selected in this
browser, never uploaded or sent anywhere.

## What was added

1. **A clearer, five-way file classification** (`classifyFileForIntake` in
   `src/lib/fileIntakeAccept.ts`): every file selected or dropped anywhere in
   the app is classified as `image`, `supported_text`, `supported_docx`,
   `supported_pdf`, or `unsupported`. This is the single source of truth
   behind both `classifyUploadedFile` (used by the compact upload menu and
   the "Upload a file" tab) and `classifyAttachedFileKind` (used by the
   "Attach document photos" area).
2. **Local DOCX text extraction** (`extractDocxText` in
   `src/lib/documentFileText.ts`), using `mammoth.extractRawText` against
   the file's own bytes (`ArrayBuffer`). Plain text only - no formatting,
   headings, or tables are preserved, since only plain text is needed
   downstream.
3. **Local PDF text extraction** (`extractPdfText` in
   `src/lib/documentFileText.ts`), using `pdfjs-dist` to read each page's
   selectable text and join it in page order.
4. **Attachment flow updates** (`src/lib/documentAttachmentIntake.ts` and
   `src/views/HomeView.tsx`): DOCX/PDF files now appear in the attached file
   list exactly like images and text files, with the same
   Selected/Reading/Read/Failed status states. A DOCX/PDF read failure marks
   only that file as failed - every other attached file still reads and
   combines normally.
5. **Clearer wording everywhere a file is selected** (see "Wording changes"
   below) - across `fileIntakeAccept.ts`, `documentAttachmentIntake.ts`, and
   `documentFileText.ts`.

## DOCX support boundary

- Supported: `.docx` files (the modern, XML-based Word format), recognised
  by extension or MIME type.
- Not supported: older `.doc` files (the legacy binary Word format). These
  are deliberately never treated as DOCX, even if a browser reports an
  ambiguous or overlapping MIME type - `isLegacyDocFile` checks the file
  extension specifically. Reliably parsing the old binary format in the
  browser is a much bigger, riskier undertaking than reading `.docx`'s XML,
  so rather than guess, AdminAvenger tells the person clearly: use `.docx`,
  paste the text, or photograph the document.
- Extraction is plain text only. Tables, headings, bold/italic, and images
  inside the document are not preserved or described - only the text mammoth
  can read out of the document body.
- An empty or unreadable DOCX (extraction succeeds but finds no text) is
  reported as its own honest "no text found" state, not a crash and not a
  false "read successfully" result.

## PDF support boundary

- Supported: PDFs with selectable/embedded text - the normal case for a PDF
  exported from a word processor, billing system, or "Print to PDF".
- Not supported (by text extraction): scanned or photographed PDFs with no
  embedded text layer. These are read page by page; if no page yields any
  selectable text, AdminAvenger shows:

  > AdminAvenger could not find selectable text in this PDF. You can
  > upload/take a photo of the document page instead.

  This is a deliberate, honest limit - AdminAvenger does not run OCR against
  PDF pages in this version, and never pretends a scanned PDF was read when
  it was not.
- Encrypted/password-protected PDFs, corrupt PDFs, and any other PDF that
  `pdfjs-dist` cannot open are caught and reported as a plain "could not read
  text from this file" failure - the app never crashes, and the person is
  always pointed back at paste/photo as a fallback.

## Local-only file handling

Every DOCX/PDF read happens the same way OCR already does in this app:
entirely inside this browser tab.

- `extractDocxText`/`extractPdfText` only ever call `file.arrayBuffer()` on
  the File object the browser already handed the page - there is no
  network request, no upload, and no server round-trip anywhere in either
  function.
- `mammoth` and `pdfjs-dist` both run their parsing in-browser (`pdfjs-dist`
  via its own local Web Worker, bundled with the package - never a
  network-hosted worker script).
- The attachment area still shows, unconditionally:

  > Files are read in this browser. AdminAvenger does not upload them or
  > send them anywhere.

- And, right next to it:

  > OCR and file text extraction can misread or miss details. Always check
  > dates, money, names, and reference numbers against the original
  > document.

## Clearer "selected but not uploaded" wording

The core UX problem this feature set out to fix was wording that could read
as "the file vanished" once someone picked something AdminAvenger could not
(yet) read. Every message shown after a file is selected now makes the same
three things explicit: the file was **selected in this browser**, it has
**not been uploaded or sent anywhere**, and here is **what to do instead**.

| Situation | Message |
| --- | --- |
| Unrecognised file type | "AdminAvenger cannot read this file type yet. The file was selected in this browser but has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document." |
| Older `.doc` file | "Older .doc files are not supported yet. Please use .docx, copy and paste the text, or upload/take a photo of the document." |
| DOCX/PDF selected but reading failed | "AdminAvenger could not read text from this file. The file has not been uploaded or sent anywhere. You can copy and paste the text, or upload/take a photo of the document." |
| PDF has no selectable text (scanned) | "AdminAvenger could not find selectable text in this PDF. You can upload/take a photo of the document page instead." |
| Any attached file read failure (image/text/DOCX/PDF) | "Your file was selected in this browser, but AdminAvenger could not read the text from this file. It has not uploaded or sent it anywhere. You can copy and paste the text, or upload/take a photo of the document." |

Per-file status labels in the attachment list were also reworded so every
state stays honest about *where* the file is:
`Selected in this browser` → `Reading locally in this browser…` →
`Read locally in this browser` (or `Failed`).

Deliberately avoided everywhere in this feature's copy (and now checked by
`src/lib/safetyWording.ts`'s `overclaim_claim` group - see "Tests added"):
"secure upload"/"securely uploaded", "cloud processed", "GDPR compliant",
"bank-level security", "every PDF", "guaranteed text extraction", and
"automatic submission" - none of these are true or verifiable claims for a
client-side prototype.

## Supported file types

- Images: JPG/JPEG, PNG, WEBP, HEIC, HEIF (unchanged).
- Text: `.txt`, `.md`, `.csv`, `.json` (unchanged).
- Word documents: `.docx` (new).
- PDF: `.pdf`, where the PDF has selectable text (new).

## Unsupported file types

- Older `.doc` Word documents - always shown the specific `.docx`-pointing
  message above, never the generic unsupported message.
- Any other unrecognised file (archives, executables, unknown binaries,
  etc.) - shown the general unsupported-file message.
- Scanned/image-only PDFs are not "unsupported" in the classification sense
  (a PDF is still routed to the PDF extractor) - they simply produce a
  "no selectable text" result once extraction runs, with its own specific
  message pointing at photographing the page instead.

## Failure states

Every DOCX/PDF read is wrapped so a single bad file can never crash the
check flow or block the other attached files:

- **DOCX extraction throws** (corrupt file, unsupported internal structure) →
  that file is marked Failed with the DOCX failure message; every other
  attached file still reads and combines normally.
- **DOCX extraction succeeds but finds no text** → marked Failed with a
  "could not find any text in this document" message - distinct from a
  crash, since extraction genuinely ran.
- **PDF extraction throws** (encrypted/password-protected, corrupt, or any
  other `pdfjs-dist` failure) → marked Failed with the PDF failure message.
- **PDF extraction succeeds but finds no selectable text** (scanned/
  image-only PDF) → marked Failed with the scanned-PDF-specific message.
- **Any unexpected error in the read loop** (image OCR, text file, or
  DOCX/PDF) → still caught by the existing outer `catch` in
  `handleAttachmentFilesSelected`, which falls back to the general
  `ATTACHMENT_READ_FAILED_MESSAGE`. This existing safety net is unchanged.

## Privacy wording

Unchanged principle, now covering DOCX/PDF too: nothing is ever uploaded,
emailed, or sent anywhere. No new accounts, analytics, or telemetry were
added. No auto-submit - DOCX/PDF text only ever feeds the same "Check a
message" pipeline the person still has to press a button to run, exactly
like every other input path.

## Tests added

- `src/lib/__tests__/fileIntakeAccept.test.ts` - classification tests for
  accepting DOCX, accepting PDF, rejecting `.doc`, rejecting unsupported
  binaries, and preserving existing image/text behaviour; accept-string and
  message-wording assertions.
- `src/lib/__tests__/documentFileText.test.ts` (new) - mocked mammoth/
  pdfjs-dist success paths, DOCX/PDF failure paths, PDF no-selectable-text
  path, and assertions that neither function assumes any upload/network
  behaviour (only ever passes the file's own bytes to the library).
- `src/lib/__tests__/documentAttachmentIntake.test.ts` - DOCX/PDF now
  classify to their own kinds and start `waiting` (not `failed`); multiple
  DOCX/PDF attachments combine with numbered `--- Document file N: filename
  ---` separators; a failed DOCX/PDF keeps a different successful attachment;
  local-only failure wording; the `.doc`-specific message.
- `src/views/__tests__/DocumentAttachmentIntake.test.tsx` - the attachment
  area's own copy mentions DOCX/PDF support; the file picker's accept string
  includes `.docx` and `.pdf`; local-only wording is present; unsupported/
  failed wording never reads as only "nothing uploaded"; existing image/text
  assertions are preserved unchanged.
- `src/lib/__tests__/safetyWordingRegression.test.ts` - a new
  `overclaim_claim` safety-wording group (secure upload, cloud processed,
  GDPR compliant, bank-level security, "every PDF", guaranteed extraction) is
  now checked the same way outcome/money/automation overclaims already are.

## Dependencies added

- **mammoth** (`^1.12.0`) - the smallest well-established browser-compatible
  library for extracting plain text from `.docx` files. Used only for
  `extractRawText`; no HTML conversion, styling, or image handling is used.
- **pdfjs-dist** (`^6.1.200`) - Mozilla's PDF.js, used only for its text
  layer (`getTextContent`) via its own bundled local Web Worker. No PDF
  rendering/canvas output is used - AdminAvenger only ever needs the text.

Both are pure client-side libraries with no server component; nothing about
either package changes AdminAvenger's local-first, no-cloud-AI-by-default
posture.

## Future improvements

- Scanned PDF page OCR (running the existing Tesseract.js OCR pipeline
  against a rendered PDF page image), so a scanned PDF could eventually be
  read the same way a photographed page already is.
- A better PDF page preview before/while extracting text.
- `.doc` support, if a reliable enough browser-side parser is found.
- Larger file size limits and a visible warning when a file is very large.
- A manual text review screen for DOCX/PDF extraction, similar to the
  existing OCR review step, so a person can check/edit extracted text before
  it is combined into the checked text.
