# D6 Production Journey Audit

Date started: 2026-07-17
Production: https://admin-avenger.vercel.app
Branch: d6-production-journey-audit
Baseline commit: f4673cd

## Purpose

Verify that AdminAvenger's main production journeys work safely and clearly on real browsers and devices.

This audit tests the live user experience. Automated tests remain important, but they do not prove camera permissions, mobile layouts, downloads, browser storage, or the clarity of real error messages.

## Status legend

- [ ] Not tested
- [x] Passed
- [!] Issue found
- [-] Not applicable

For every issue, record:

- Device and browser
- Exact steps
- Expected result
- Actual result
- Screenshot or error text
- Severity: blocker, high, medium, or low

## Test environments

### Desktop

- [ ] Windows and Chrome
- [ ] Windows and Edge
- [ ] Keyboard-only navigation
- [ ] Browser zoom at 200 percent

### Mobile

- [ ] Android and Chrome
- [ ] iPhone and Safari
- [ ] Camera permission allowed
- [ ] Camera permission denied
- [ ] Portrait and landscape layouts

## Journey 1 - Paste text

- [ ] Open the production home page
- [ ] Paste a realistic letter or message
- [ ] Run the check
- [ ] Confirm the previous result is cleared
- [ ] Confirm extracted facts match the source
- [ ] Confirm uncertain facts are labelled clearly
- [ ] Confirm no invented date, amount, deadline, right, or outcome appears
- [ ] Confirm the next action is understandable
- [ ] Confirm a draft can be prepared
- [ ] Confirm the user remains responsible for sending it

Result:

Notes:

## Journey 2 - Upload a PDF

- [ ] Select a readable PDF below 20 MB
- [ ] Confirm the filename appears
- [ ] Confirm local reading starts
- [ ] Confirm extracted text is usable
- [ ] Confirm the result matches the document
- [ ] Confirm the document is not described as uploaded
- [ ] Confirm an adviser export can be created

Result:

Notes:

## Journey 3 - Upload a DOCX or TXT file

- [ ] Upload a DOCX below 20 MB
- [ ] Upload a TXT file below 20 MB
- [ ] Confirm both are read correctly
- [ ] Confirm failures provide a useful recovery action

Result:

Notes:

## Journey 4 - Upload an existing image

- [ ] Upload a supported image below 20 MB
- [ ] Confirm OCR begins
- [ ] Confirm OCR progress is visible
- [ ] Confirm OCR success or failure is understandable
- [ ] Confirm the user is warned to check OCR mistakes
- [ ] Confirm retry and manual paste options work

Result:

Notes:

## Journey 5 - Take a photo

- [ ] Choose Take photo
- [ ] Allow camera access
- [ ] Confirm the live camera preview appears
- [ ] Capture a clear document photo
- [ ] Confirm the camera stops after capture
- [ ] Confirm crop or document area controls work
- [ ] Confirm OCR runs on the captured image
- [ ] Retake the photo
- [ ] Upload an existing photo instead
- [ ] Deny camera permission and confirm the fallback works

Result:

Notes:

## Journey 6 - Multiple attachments

- [ ] Add more than one supported file
- [ ] Confirm each file has its own status
- [ ] Confirm failed files are not processed
- [ ] Remove one attachment
- [ ] Confirm remaining attachments still work
- [ ] Confirm combined evidence does not create invented facts

Result:

Notes:

## Journey 7 - File safety boundaries

- [ ] Try a file exactly 20 MB
- [ ] Try a file larger than 20 MB
- [ ] Confirm the oversized file is rejected before reading
- [ ] Confirm the message says it was not read or uploaded
- [ ] Try an unsupported file type
- [ ] Confirm the recovery guidance is clear

Result:

Notes:

## Journey 8 - Save and reopen a case

- [ ] Save a checked result as a case
- [ ] Open the case
- [ ] Confirm evidence and extracted facts are present
- [ ] Refresh the browser
- [ ] Confirm the case remains available
- [ ] Edit the title or next action
- [ ] Confirm edits survive refresh

Result:

Notes:

## Journey 9 - Draft and adviser export

- [ ] Generate a draft
- [ ] Confirm it contains no invented facts
- [ ] Copy the draft
- [ ] Generate the adviser export pack
- [ ] Open the downloaded file
- [ ] Confirm facts, uncertainty, evidence, and next steps are separated clearly
- [ ] Confirm sensitive data is not added automatically

Result:

Notes:

## Journey 10 - Outcome confirmation

- [ ] Mark a case as still waiting
- [ ] Confirm no unverified money is counted as saved
- [ ] Confirm a successful outcome
- [ ] Enter an amount manually where required
- [ ] Add proof filename metadata
- [ ] Try proof above 20 MB
- [ ] Confirm rejected proof is not read or stored
- [ ] Confirm the money tracker updates accurately

Result:

Notes:

## Journey 11 - Local data controls

- [ ] Refresh and confirm saved data remains
- [ ] Close and reopen the browser
- [ ] Confirm saved data remains
- [ ] Clear local data from Settings
- [ ] Confirm cases and saved records are removed
- [ ] Confirm demo data can be restored separately
- [ ] Confirm the user understands that browser data can be lost

Result:

Notes:

## Journey 12 - Accessibility and clarity

- [ ] Complete the main journey using only the keyboard
- [ ] Confirm focus is always visible
- [ ] Confirm status and error messages are announced
- [ ] Confirm headings follow a logical order
- [ ] Confirm every input has a useful label
- [ ] Confirm colour is not the only status indicator
- [ ] Confirm the interface remains usable at 200 percent zoom
- [ ] Confirm touch targets are usable on mobile

Result:

Notes:

## Final audit summary

### Passed journeys

### Issues found

### Launch blockers

### Recommended fixes

### Final decision

- [ ] Ready for an adviser demonstration
- [ ] Ready after listed fixes
- [ ] Not ready