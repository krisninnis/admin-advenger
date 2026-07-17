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

- [x] Open the production home page
- [x] Paste a realistic letter or message
- [x] Run the check
- [x] Confirm the previous result is cleared
- [x] Confirm extracted facts match the source
- [x] Confirm uncertain facts are labelled clearly
- [x] Confirm no invented date, amount, deadline, right, or outcome appears
- [x] Confirm the next action is understandable
- [x] Confirm a draft can be prepared
- [x] Confirm the user remains responsible for sending it

Result: [x] Passed in production on 2026-07-17.

Notes:

- 2026-07-17 production test failed. Severity: high.
- A clear Greenfield Water Services payment reminder fell through to "No obvious saving or action found".
- The production result omitted the sender, dates, amount due, and account reference.
- Local regression fix implemented for deterministic payment-reminder classification, evidence preservation, display-only requested money, and safe next action wording.
- Original fix required a production retest after deployment.
- Production retest after the payment-reminder fix correctly recognised the Greenfield reminder and showed the deadline, amount, account reference, sender, letter date, and payment due date.
- Production correctly counted no saving or recovery for the amount being requested.
- The retest exposed low-severity polish issues: duplicate "Amount being requested" labelling, an overly generic best-next-move prompt, and a safe but overly generic draft.
- Local polish implemented for the duplicate money label, payment-reminder best next move, and payment-reminder draft.
- Production polish deployed and retested successfully. The amount label appeared once, the next move used the extracted facts appropriately, and the prepared draft remained neutral without admitting liability or counting a saving or recovery.

## Journey 2 - Upload a PDF

- [x] Select a readable PDF below 20 MB
- [x] Confirm the filename appears
- [x] Confirm local reading starts
- [x] Confirm extracted text is usable
- [x] Confirm the result matches the document
- [x] Confirm the document is not described as uploaded
- [x] Confirm an adviser export can be created

Result: [x] Passed in production on 2026-07-17.

Notes:

- 2026-07-17 production test used `audit-fixtures/journey-2-payment-reminder.pdf`.
- Passed in production: readable PDF below 20 MB selected; filename appeared; local reading completed; extracted text was usable; important dates, amount, and reference matched; document was described as read locally, not uploaded; evidence pack downloaded successfully.
- Medium issue found: refund/recovery guidance incorrectly appeared for payment reminder.
- Medium issue found: reviewed prepared draft was missing from evidence-pack history after Save to case.
- Low issue found: PDF sender/provider was not preserved.
- Low issue found: source title was recorded as pasted text.
- Low issue found: doubled bullets and punctuation appeared in Markdown export.
- Local fixes implemented for guidance matching, guided draft persistence, flattened-PDF sender extraction, attachment source titles, and Markdown export formatting.
- Production polish deployed and retested successfully. Sender/provider and PDF source title were preserved, the exact edited draft was saved and included in Draft History, refund guidance was absent, Markdown bullets and punctuation were correct, no saving or recovery was counted, and nothing was sent automatically.
- Minor cosmetic note: the Markdown export contains some extra blank lines, with no functional or safety impact.

## Journey 3 - Upload a DOCX or TXT file

- [x] Upload a DOCX below 20 MB
- [x] Upload a TXT file below 20 MB
- [x] Confirm both are read correctly
- [x] Confirm failures provide a useful recovery action

Result: [x] Passed in production on 2026-07-17.

Notes:

- Production tests used `audit-fixtures/journey-3-service-notice.docx` and `audit-fixtures/journey-3-service-notice.txt`.
- Both supported files displayed their filenames, were read locally in the browser, and produced usable extracted text.
- Dates, account reference, current price, new price, monthly increase, annual impact, and response deadline matched the synthetic notice.
- Initial testing found that the standalone heading `Northbridge Broadband` was not preserved as the provider.
- Provider extraction was updated to support plausible standalone notice headings while rejecting filenames, attachment markers, and generic document headings.
- Focused regression tests passed: 3 files and 42 tests.
- Full verification passed: 61 test files and 1,387 tests; lint and build passed.
- The provider fix was deployed and successfully retested with both DOCX and TXT files.
- An unreadable DOCX produced a clear failure message explaining that nothing was uploaded or sent and offering manual paste or document-photo recovery options.
- Money remained display-only and was not counted as saved or recovered. Nothing was sent or submitted automatically.

## Journey 4 - Upload an existing image

- [x] Upload a supported image below 20 MB
- [x] Confirm OCR begins
- [x] Confirm OCR progress is visible
- [x] Confirm OCR success or failure is understandable
- [x] Confirm the user is warned to check OCR mistakes
- [x] Confirm retry and manual paste options work

Result:

- [x] Passed in production on 2026-07-17.

Notes:

- Tested with the synthetic `audit-fixtures/journey-4-payment-notice.png`
  fixture. It contains no personal data and is approximately 0.05 MB.
- Production accepted the PNG and read it locally in the browser without
  uploading or sending it.
- OCR progress was visible and the completed review clearly reported that OCR
  ran on-device.
- OCR extracted the sender, account reference, amount, dates, payment wording,
  telephone number, and full editable text accurately at 95% confidence.
- The review warned that OCR can make mistakes and instructed the user to check
  the extracted text before continuing.
- Editing, Add close-up photo, Retake photo, Cancel, and manual text entry
  remained available.
- Initial production testing exposed false small-image, low-resolution, and
  low-contrast warnings for a clear 1600 x 1200 PNG, plus a shortened sender
  name.
- Fixed compressed-image dimension handling and preserved the full sender name
  `Harbour Energy Services`.
- Added OCR-aware warning handling so a strong OCR result can suppress only a
  conflicting low-contrast warning while retaining other genuine warnings.
- Focused regression tests passed: 137 tests for the initial polish and 55
  tests for the OCR-confidence follow-up.
- Full verification passed with 61 test files and 1,393 tests. Lint completed
  with zero warnings or errors, and the production build succeeded.
- Changes reached production through merge commits `90b2598` and `2f49217`.
  Production served `/assets/index-93N4arQR.js` during the final retest.
- No money was counted as saved or recovered, and nothing was sent, submitted,
  paid, or contacted automatically.

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
