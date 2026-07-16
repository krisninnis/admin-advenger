# Document Dropzone Visible Fix v1

## Purpose

Fix the remaining drag/drop confusion after DOCX drop normalisation.

The previous fix made dropped files more robust once they reached the attachment drop handler, but the visible Home paste area was not itself a drop target. A user could drag a `.docx` onto the large visible textarea/card and see nothing happen because the real dropzone lived lower down in the attachment area.

## Root Cause

The local document attachment pipeline supported DOCX, and the dedicated attachment dropzone supported dropped files. The visible main input/textarea area did not have dragover/drop handlers, so drops there never reached `handleAttachmentFilesSelected`.

The UI also made the attachment dropzone too easy to miss while "Paste text" mode was active.

## Fix

The visible Home paste input wrapper now:

- says "Paste text or drop a document here"
- says "DOCX, PDF, TXT, images - read locally in your browser."
- handles dragover, dragleave, and drop
- routes dropped files through `handleAttachmentDrop`
- uses the existing `getFilesFromDroppedDataTransfer` normaliser
- passes files into the existing `handleAttachmentFilesSelected` local attachment pipeline

The file upload mode now:

- says "Choose or drop a file"
- explains supported file types
- shows the same attachment area/dropzone so dropped DOCX files have visible status rows

## Safety And Scope

This fix does not add:

- cloud or API calls
- analytics
- auto-send
- auto-submit
- auto-contact
- Community Helper file intake
- classifier or decisionEngine expansion
- advice, outcome, eligibility, or scoring claims

Community Helper controlled intake remains manual text only.

## Local-Only Behaviour

Dropped DOCX files are read locally through the existing document attachment path and `extractDocxText`. Files are not uploaded, sent, submitted, or shared automatically.

Unsupported files still fail safely with existing unsupported-file messaging.

## Tests

Coverage includes:

- DOCX dropped onto the visible paste/input area routes into attachment intake
- DOCX dropped onto the attachment area still uses the same local path
- file mode reveals the attachment dropzone/status area
- unsupported drag/drop items are ignored safely
- Community Helper controlled intake has no drop, file, photo, OCR, or document intake
