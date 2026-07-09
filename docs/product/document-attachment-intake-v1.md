# Document Attachment Intake v1

Status: implemented (UI + local intake logic). No new decision-engine
behaviour, no new routing/classification logic, no cloud services.

## Why this exists

Before this change, attaching a document photo meant leaving the paste box
and switching into a separate "Take or upload a photo" or "Upload a file"
tab. That works, but it does not match how people actually hold a letter on
their phone: they may want to paste some of the message, attach a photo of
the rest, add a second photo of a hard-to-read section, and check
everything together - on a phone, using whatever their browser's own file
picker already offers (Photos, Gallery, Google Photos, Files, camera), or on
a laptop, by dragging files onto the page.

Document Attachment Intake v1 adds an "Attach document photos" area directly
under the paste box. It complements pasting text - it never replaces it, and
it never becomes a second, parallel way of checking a message. Everything
attached here still flows through the exact same local OCR, the exact same
"Check a message" pipeline, the exact same decision engine, and the exact
same result page as every other input path already in AdminAvenger.

## Mobile gallery/photo-library behaviour

The attachment area's "Choose photos or files" control is a native
`<input type="file" multiple accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.txt,.md,.csv,.json">`.
What the device shows when a person taps it is entirely up to the browser
and operating system, not AdminAvenger:

- On iPhone/iPad, Safari typically offers Photo Library, Take Photo, or
  Choose File.
- On Android, Chrome typically offers Camera, Photos, Google Photos, or
  Files, depending on what apps are installed.
- On desktop/laptop, the browser opens its normal file-open dialog.

A separate "Take photo" control uses
`<input type="file" accept="image/*" capture="environment">`, which asks
supported mobile browsers to open the rear camera directly. `capture` is a
hint, not a guarantee - some browsers/devices ignore it and simply show the
normal picker instead, which is why the "Choose photos or files" control is
always shown alongside it, never hidden behind it.

## Why there is no direct Google Photos/iCloud/Apple Photos integration

AdminAvenger does not connect to Google Photos, iCloud Photos, or Apple
Photos through any API, and does not plan to. Three reasons:

1. **Local-first stays true.** The moment AdminAvenger talks to a cloud photo
   API on the user's behalf, "reads your letter on this device" stops being
   a fact and becomes a claim with an asterisk. The native file picker keeps
   the boundary simple and verifiable: the browser, not AdminAvenger, is what
   talks to Photos/Google Photos, and only to hand a chosen file back to this
   page - never the other way around.
2. **No new account/permission surface.** A direct Photos API integration
   would need OAuth, account linking, and broader photo-library permissions
   than "the one file the user picked". That is a meaningfully bigger trust
   and security surface for very little extra benefit, since the native
   picker already offers Photos/Google Photos as one of its options on most
   phones.
3. **It is not needed.** The native `<input type="file">` picker already
   surfaces Photos, Gallery, Google Photos, and Files on the devices that
   have them installed. AdminAvenger gets the same practical outcome (a
   person can attach a photo from their library) without building or
   maintaining a single cloud integration.

## Drag and drop behaviour

On desktop/laptop, the attachment area is also a drop zone:

- Dragging a file over the zone shows a visible "drop your files" state.
- Dropping a file calls `event.preventDefault()` on both `dragover` and
  `drop`, which stops the browser's default behaviour of navigating away to
  open the dropped file as a new page/tab.
- Multiple files can be dropped at once; each one is added to the attachment
  list and read in order.
- Files that are not supported are added to the list already marked
  "Failed", with a plain-English reason - dropping an unsupported file never
  crashes the page or silently discards the drop.
- Drag and drop is never the only way in: the same "Choose photos or files"
  and "Take photo" controls are always shown inside the drop zone, so
  keyboard-only and non-mouse users always have a working path.

## Multi-file behaviour

Each attached file gets its own row in a simple list: filename, type (Photo
or Text file), and status (Waiting, Reading…, Read, or Failed), with a
Remove button.

Files are processed in the order they were attached:

- Image files are read with the same on-device OCR
  (`readTextFromImage` in `src/lib/photoOcr.ts`, Tesseract.js) already used by
  "Take or upload a photo" - nothing new was added to the OCR pipeline
  itself.
- Text files (`.txt`, `.md`, `.csv`, `.json`) are read with the browser's own
  `File.text()`, the same as the existing "Upload a file" path.
- Once everything that can be read has been read, the extracted text from
  every file is combined, in attachment order, with clear section headers:

  ```
  --- Document photo 1 ---
  [text from the first photo]

  --- Document photo 2 ---
  [text from the second photo]
  ```

  Text files get a header naming the file instead of a photo number
  (`--- Document file: notes.txt ---`).
- If one file fails to read (a corrupt image, an unreadable text file), only
  that file is marked "Failed" with a plain message. The other files still
  read normally, and the combined text still includes everything that did
  work. A single bad file never blocks the rest of the flow.
- If OCR's own confidence for a photo is low, the existing low-confidence
  warning text (already used elsewhere in the app - see
  `getOcrQualityWarnings` in `src/lib/photoOcr.ts`) is shown next to that
  file, with the usual reminder to check the original photo/letter. No new
  warning wording was invented for this.

## Supported file types

- Images: JPG/JPEG, PNG, WEBP, HEIC, HEIF - wherever the browser and the
  existing OCR path already support them (`isSupportedPhotoFile` in
  `src/lib/photoIntake.ts`).
- Text: `.txt`, `.md`, `.csv`, `.json` - wherever the existing text-file path
  already supports them (`isSupportedTextFile` in `src/lib/fileIntakeAccept.ts`).
- Word documents (`.docx`) and PDF (`.pdf`) - added in **Document File
  Support v1** (see `docs/product/document-file-support-v1.md`), read
  locally via `mammoth`/`pdfjs-dist` in `src/lib/documentFileText.ts`.

## Unsupported file types

- Older Word documents (`.doc`, the legacy binary format) are not supported
  yet - only `.docx` is. Attaching a `.doc` file shows: "Older .doc files are
  not supported yet. Please use .docx, copy and paste the text, or
  upload/take a photo of the document."
- Scanned/image-only PDFs are routed to the PDF extractor like any other PDF,
  but produce their own honest "no selectable text found" result rather than
  being treated as read - see `docs/product/document-file-support-v1.md`.
- Anything else unrecognised falls back to the general
  `UNSUPPORTED_FILE_MESSAGE` already used by the existing "Upload a file"
  path.
- An unsupported file is never silently dropped - it is always added to the
  attachment list, marked "Failed", with its reason visible.

## Local-only privacy wording

Shown directly under the attachment controls, always:

> Files are read in this browser. AdminAvenger does not upload them or send
> them anywhere.

And, right next to it, the OCR caution:

> OCR can misread unclear photos. Always check dates, money, and reference
> numbers against the original document.

Deliberately avoided anywhere in this feature's copy: "secure wipe",
"bank-level security", "permanently deleted everywhere", "guaranteed OCR
accuracy", "GDPR compliant" - none of these are true or verifiable claims for
a client-side prototype, and the existing safety-wording standard already
rules them out (`src/lib/safetyWording.ts`).

## OCR limitations

Nothing about OCR itself changed. The attachment area reuses the same
Tesseract.js-based `readTextFromImage` function, with the same known
limitations already documented in `src/lib/photoOcr.ts`: blurry photos, small
print, folds, shadows, handwriting, and poor lighting can all produce
mistakes. The same low/moderate-confidence warnings already shown on the
single-photo flow are shown here too, file by file.

## How it feeds the normal result flow

Attaching files never creates a second analysis path. What changes is only
the text that gets checked:

- If only text was typed, that text is checked (unchanged behaviour).
- If only files were attached, their combined extracted text is checked.
- If both are present, the typed text and the combined attachment text are
  combined into one string (clearly labelled "Typed text" /
  "Attached documents"), and the UI shows: "Your typed text and attached
  document text will be checked together."

That single string is handed to the exact same `onCheck(...)` call, which
still goes through Classifier → Decision Engine → Evidence Builder →
Questions → Draft Message → Opportunity Card → AdminFinding → AdminCase →
`ResultViewModel` → Result Page v2, unchanged. Nothing here bypasses safety
checks, `ResultViewModel`, or Result Page v2, and nothing auto-downloads the
Adviser Export Pack or auto-saves a case beyond the app's existing save
buttons.

## Safety boundaries

- No file is ever uploaded, emailed, or sent anywhere. Every read happens in
  this browser tab.
- No new accounts, analytics, or telemetry were added.
- No auto-submit: attaching files only ever prepares text for the person to
  review and press "What does this mean?" themselves, exactly like every
  other input path.
- No new decision-engine or classification logic: attached text is checked
  by the same classifier and engines as pasted text, with no special-casing
  for "came from an attachment".
- DOCX/PDF parsing (Document File Support v1) is local-only text extraction
  via `mammoth`/`pdfjs-dist` - no PDF/DOCX *generation* was added, and no
  fake/placeholder extraction was ever shown as if it were real.

## Future improvements

- PDF text extraction and DOCX text extraction shipped in **Document File
  Support v1** - see `docs/product/document-file-support-v1.md` for that
  feature's own future-improvements list (scanned PDF OCR, `.doc` support,
  larger file limits, a manual text review screen).
- Synthetic OCR image fixtures for the Golden Letter Corpus, so multi-photo
  attachment can be tested the same way text fixtures already are.
- A redaction preview before checking or exporting, so a person can review
  what a photo shows before it is combined into the checked text.
- An optional image thumbnail preview toggle (kept off by default in v1 to
  avoid showing sensitive document images anywhere they don't need to be).
- Per-file confidence display (today, warnings are shown per file; a plain-
  language confidence line per file, matching the single-photo flow, is a
  natural next step).
- Mobile usability testing specifically on the attachment area (real phones,
  real file pickers, real camera capture prompts).
- An accessibility review of the drop zone and file list once real users
  (including keyboard-only and screen-reader users) have tried it.
