# Document Drag/Drop DOCX Fix v1

## Purpose

Fix a bug where a `.docx` file selected through the file picker followed the local document intake path, but a `.docx` dragged into the attachment area could fail to reach the same path.

## Root Cause

The drop handler only read `dataTransfer.files`. Some browsers or desktop drag sources can expose dropped files through `dataTransfer.items`, including Word documents, while `dataTransfer.files` may be empty.

## Fix

Dropped files are now normalised through `getFilesFromDroppedDataTransfer` before being passed to the existing attachment pipeline.

The helper:

- uses `dataTransfer.files` when available
- falls back to `dataTransfer.items`
- keeps only real file items
- returns plain `File` objects

Home still passes those files to `handleAttachmentFilesSelected`, the same local path used by the attachment file picker.

## Safety And Scope

This fix does not add:

- cloud or API calls
- analytics
- auto-send
- auto-submit
- auto-contact
- classifier expansion
- Community Helper file intake
- advice, outcome, eligibility, or scoring claims

Community Helper controlled intake remains manual text only.

## Local-Only Behaviour

DOCX files are read locally by the existing `extractDocxText` path. Files are not uploaded or sent anywhere.

Unsupported files still show safe unsupported-file messaging. Legacy `.doc` files remain unsupported and point users toward `.docx`, copy/paste, or photographing the document.

## Tests

Coverage includes:

- DOCX dropped through `dataTransfer.files`
- DOCX dropped through `dataTransfer.items`
- dropped files routed to `handleAttachmentFilesSelected`
- picked DOCX and dropped DOCX using the same local attachment intake
- unsupported drag/drop items ignored safely
- Community Helper controlled intake remains manual text only
