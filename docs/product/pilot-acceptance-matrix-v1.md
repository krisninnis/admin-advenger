# Pilot Acceptance Matrix v1

## Authority and current decision

| Field | Value |
|---|---|
| Specification | `docs/specs/active/pilot-acceptance-matrix-v1.md` |
| Baseline commit | `92fa9256a998cc30db8e93ad0ef42aebbdf13824` |
| Matrix state | **Prepared; direct acceptance not yet run** |
| Pilot invitation | **DO NOT invite real pilot users yet** |
| Scanner state | **PROVISIONAL — REQUIRES REAL MOBILE ACCEPTANCE TESTING** |

This is the current acceptance record, not a product-capability claim. Do not
copy a pass from an automated test, historical audit, another device or another
commit into a manual evidence slot.

## Evidence language

| Label | Use |
|---|---|
| `IMPLEMENTED` | Source inspection indicates the behaviour exists at the named SHA. |
| `AUTOMATED` | A named automated test passed; browser/camera/OCR may be mocked. |
| `DESKTOP_CHROME` | Direct observation on the recorded desktop Chrome environment. |
| `ANDROID_CHROME` | Direct observation on the recorded Android Chrome environment. |
| `IPHONE_SAFARI` | Direct observation on the recorded iPhone Safari environment. |
| `DIRECT_HUMAN` | A tester directly completed the task and answered comprehension prompts. |

`IMPLEMENTED/AUTOMATED` and `MANUALLY ACCEPTED` are different states. All
manual slots in this baseline are `NOT RUN`.

## Safe fixture loading

Use only these existing synthetic examples. Do not add real documents to the
repository or acceptance evidence.

| Fixture/example | Source and loading instruction |
|---|---|
| HMRC Tax Code Notice | In `src/lib/__tests__/hmrcOneFrontDoor.test.ts`, find `FULL_TAX_CODE_NOTICE`. Copy only the text between its template-literal backticks into Home → **Paste text**. Do not include `const`, backticks or other TypeScript. |
| Broadband/mobile price rise | Upload `audit-fixtures/journey-3-service-notice.docx`. The adjacent `.txt` is the readable reference/fallback for expected wording. |
| Consumer refund/delivery/faulty goods | In `src/lib/goldenLetters.ts`, find `id: "consumer-refund-refusal-001"` and copy only its `inputText` contents into Home → **Paste text**. The **Consumer refund refusal** demo is useful for comparison but is not a front-door acceptance run. |
| Ordinary bill/admin message | Upload `audit-fixtures/journey-2-payment-reminder.pdf` for PDF and `audit-fixtures/journey-4-payment-notice.png` for image/OCR. |
| Unknown official letter | In `src/lib/goldenLetters.ts`, find `id: "unknown-official-letter-001"`. Copy only its `inputText` into a temporary local document, display it on another screen or print it, then use **Take a photo**. Delete the temporary copy after testing if one was created. The **Unclear letter** demo is reference-only. |

## Known hypothesis to observe, not fix here

At result top, the audit found current support appears:

- clearer for **What is this?** and **What should I do next?**; and
- only partial for **Is anything urgent?**, **What changed or matters?** and
  **What should I have ready?**.

For every primary run, ask the tester to point to the answer for all five
questions without coaching. Record what they actually find. Any change belongs
in `codex/pilot-result-top-clarity-v1`, after baseline evidence.

## Automated evidence baseline

These references help scope direct testing. They do **not** complete a manual
slot.

| Area | State | Current evidence references | Manual state |
|---|---|---|---|
| Pasted HMRC text and optional question | `IMPLEMENTED/AUTOMATED` | `src/views/__tests__/HomeViewHmrcPublicJourney.test.tsx`; `src/lib/__tests__/hmrcOneFrontDoor.test.ts` | `NOT RUN` |
| DOCX and selectable-PDF local extraction | `IMPLEMENTED/AUTOMATED` | `src/lib/__tests__/documentFileText.test.ts`; `src/lib/__tests__/documentAttachmentIntake.test.ts`; `src/views/__tests__/DocumentAttachmentIntake.test.tsx` | `NOT RUN` |
| Uploaded image → prepared scan → OCR review | `IMPLEMENTED/AUTOMATED` | `src/components/__tests__/PhotoCapturePanel.interaction.test.tsx`; `src/views/__tests__/HomeViewPhotoOcrReview.test.ts`; `src/lib/__tests__/photoOcr.test.ts` | `NOT RUN` |
| Live camera and camera recovery contracts | `IMPLEMENTED/AUTOMATED` with mocked browser camera | `src/components/__tests__/PhotoCapturePanel.interaction.test.tsx`; `src/lib/__tests__/photoCapture.test.ts` | `NOT RUN` |
| Low-confidence OCR recovery | `IMPLEMENTED/AUTOMATED` | `src/components/__tests__/LowConfidenceOcrReviewPanel.test.tsx`; `src/lib/__tests__/ocrKeyDetails.test.ts` | `NOT RUN` |
| Save and browser-local persistence | `IMPLEMENTED/AUTOMATED` | `src/lib/__tests__/storageSafety.test.ts`; `src/lib/__tests__/localDataControl.test.ts` | `NOT RUN` |
| Export/download | `IMPLEMENTED/AUTOMATED` | `src/lib/__tests__/adviserExportPack.test.ts`; `src/lib/__tests__/exportCase.test.ts`; `src/views/__tests__/HomeViewAdviserExport.test.ts` | `NOT RUN` |
| Clear local data | `IMPLEMENTED/AUTOMATED` | `src/lib/__tests__/localDataControl.test.ts`; `src/views/__tests__/LocalDataControlSettings.test.tsx` | `NOT RUN` |

## Primary journey definitions

The expected result for every primary case includes all shared checks below.

**Shared result checks**

- The tester can identify: What is this? Is anything urgent? What changed or
  matters? What should I do next? What should I have ready?
- Uncertainty and missing evidence are visible where applicable.
- The tester understands that nothing was sent, submitted, shared or contacted
  automatically.
- Source text and an optional user question are understandable as separate
  inputs; the question is not presented as a source fact.

| Case | Route | Fixture | Route-specific expected result |
|---|---|---|---|
| `P-PASTE` | Pasted text | HMRC Tax Code Notice | Text can be checked from the front door; the optional question receives a preparation-only answer; source wording remains distinguishable. |
| `P-DOCX` | DOCX | Northbridge Broadband `.docx` | File is read locally, its status/name are understandable, and the result explains the price change without turning source claims into confirmed advice. |
| `P-PDF` | Selectable-text PDF | Greenfield Water Services `.pdf` | Selectable text is read locally and the ordinary payment reminder is explained with money/dates framed as source details to check. |
| `P-IMAGE` | Uploaded image | Harbour Energy Services `.png` | Image passes through prepared-scan review before OCR; OCR text is reviewable/editable before checking; quality uncertainty and recovery remain visible. |
| `P-CAMERA` | Live camera capture | Rendered/printed unknown official letter | The real camera opens; capture passes through prepared-scan and OCR review; the vague source produces a conservative result with missing evidence visible. |

### Additional fixture coverage

This case covers the remaining requested synthetic family; it is not a sixth
primary input route.

| Case | Route | Fixture | Expected result |
|---|---|---|---|
| `F-CONSUMER` | Pasted text, additional fixture coverage | `consumer-refund-refusal-001` | Result treats the refund/faulty-item wording as preparation, preserves uncertainty, and does not claim entitlement, a guaranteed refund or money recovered. |

## Manual device and direct-human slots

Use an executed-run block for each non-`NOT RUN` cell.

| Case | Desktop Chrome | Android Chrome | iPhone Safari | Direct-human comprehension |
|---|---|---|---|---|
| `P-PASTE` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `P-DOCX` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `P-PDF` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `P-IMAGE` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `P-CAMERA` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `F-CONSUMER` | `NOT RUN` | `NOT RUN` | `NOT RUN` | `NOT RUN` |

Where an iPhone is unavailable, replace `NOT RUN` with `BLOCKED` only after
creating an executed-run block that records the missing-device reason. Never
mark it `PASS` by inference.

## Recovery case definitions and slots

| Case | Recovery action and expected result | Desktop Chrome | Android Chrome | iPhone Safari |
|---|---|---|---|---|
| `R-DRAG` | Drag/drop a supported standalone fixture. Browser does not navigate away; the same local attachment flow is used. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-PERMISSION` | Deny camera permission. Clear denial message appears and upload remains available; no capture is implied. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-NOCAMERA` | Use an environment with no camera or camera API. Unavailable message appears and upload remains available. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-RETAKE` | Reject/retake a capture. Prior candidate is not checked or saved; a new capture can be reviewed. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-REPLACE` | Replace an uploaded image with another synthetic image. Only the deliberately accepted replacement continues. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-LOWCONF` | Use a deliberately poor synthetic capture. Low OCR confidence/quality is visible; text can be corrected, a close-up added or photo retaken before checking. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-REFRESH-UNSAVED` | Refresh before explicit save. Record honestly whether transient work is lost and whether the consequence was understandable; nothing is silently saved. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-SAVE` | Explicitly save a synthetic result. Save occurs only after the user's action and does not imply sending/submission. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-REOPEN` | Refresh after explicit save and reopen the saved item in the same browser/profile. Record exact local recovery. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-EXPORT` | Explicitly export/download a synthetic result. File remains user-controlled and does not imply it was sent or submitted. | `NOT RUN` | `NOT RUN` | `NOT RUN` |
| `R-CLEAR` | Clear local AdminAvenger data in a test profile. App data is removed as described; downloaded files are not falsely claimed to be deleted. | `NOT RUN` | `NOT RUN` | `NOT RUN` |

## Camera and image condition slots

Run with synthetic content only. Capture failures must say whether failure was
in camera access, prepared-scan detection/review, OCR, OCR review or result
comprehension.

| Condition | Expected observation | Android Chrome | iPhone Safari |
|---|---|---|---|
| Good even lighting | Whole page can be reviewed as a prepared scan and OCR is usable. | `NOT RUN` | `NOT RUN` |
| Low light | Degradation or recovery guidance is honest; no false confidence. | `NOT RUN` | `NOT RUN` |
| Glare | Missing/unclear text is detectable during review or recovery remains available. | `NOT RUN` | `NOT RUN` |
| Shadows | Missing/unclear text is detectable during review or recovery remains available. | `NOT RUN` | `NOT RUN` |
| Folded/creased page | Distortion does not bypass prepared-scan/OCR review; limitations remain visible. | `NOT RUN` | `NOT RUN` |
| Cropped page | Missing page content is not silently treated as complete; retake/replacement is available. | `NOT RUN` | `NOT RUN` |
| Screenshot/upload | Existing PNG can be uploaded and follows the same prepared-scan review gate. | `NOT RUN` | `NOT RUN` |
| Small text | OCR quality/limitations are understandable; close-up, correction or retake is available. | `NOT RUN` | `NOT RUN` |
| Permission denial | Upload fallback remains available. | `NOT RUN` | `NOT RUN` |
| Camera unavailable | Upload fallback remains available. | `NOT RUN` | `NOT RUN` |
| Poor OCR confidence | Key details are not presented as reliable without review; recovery remains available. | `NOT RUN` | `NOT RUN` |

## Executed-run block

Copy this whole block once per device/session. A result row is valid only while
attached to its completed metadata and evidence. Use a short tester identifier;
do not record unnecessary personal information.

### Run `<RUN-ID>`

| Required metadata | Recorded value |
|---|---|
| AdminAvenger commit SHA | |
| Deployment URL or local environment | |
| Date (`YYYY-MM-DD`) | |
| Tester identifier | |
| Device/model | |
| OS/version | |
| Browser/version | |

| Case | Input route | Fixture/example | Expected result | Actual result | Result (`PASS`/`FAIL`/`BLOCKED`) | Severity if failed | Evidence/reference | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

For each executed primary or additional fixture case, capture the tester's
uncoached answers:

| Prompt | Tester could locate/understand? | Evidence/observation |
|---|---|---|
| What is this? | |
| Is anything urgent? | |
| What changed or matters? | |
| What should I do next? | |
| What should I have ready? | |
| Was uncertainty/missing evidence visible where applicable? | |
| Was it clear nothing was sent automatically? | |
| Were source material and the optional question clearly separate? | |

## Result and severity rules

- `PASS`: every mandatory expectation for that case was directly observed in
  the recorded environment; no unresolved issue affected it.
- `FAIL`: one or more mandatory expectations were not met. Record actual
  behaviour, evidence and severity.
- `BLOCKED`: the run could not be completed because device, browser,
  permission, environment or setup was unavailable. It is neither a pass nor,
  without product evidence, a product failure.
- `NOT RUN`: planning state only; never manual acceptance.

Severity:

- `BLOCKER`: privacy/safety boundary breach, automatic consequential action,
  material source/question misattribution, data leaving the intended local
  boundary, or unsafe required journey.
- `HIGH`: primary route fails, a required result question cannot be answered,
  urgency/action is materially misleading, or required local recovery loses or
  exposes data.
- `MEDIUM`: recoverable but material confusion, fragility or accessibility
  failure.
- `LOW`: cosmetic/wording issue without material task or safety effect.

## Acceptance decision

Current decision: **DO NOT PROCEED TO REAL PILOT USERS — DIRECT EVIDENCE NOT YET
COLLECTED**.

Change that decision only after:

- required primary and recovery cases pass on desktop Chrome;
- uploaded-image and live-camera cases, including practical adverse
  conditions, have direct Android Chrome evidence;
- the same mobile cases have direct iPhone Safari evidence where available, or
  a human explicitly reviews a recorded `BLOCKED` gap;
- all five synthetic example families have direct result/comprehension
  evidence;
- direct-human testers can answer the five result questions and understand
  uncertainty, source/question separation and that nothing was sent;
- no unresolved `BLOCKER` or `HIGH` issue remains; and
- a human project owner approves the pilot invitation.

## Scanner attribution note

Preserve this future contract without implementing it here:

```text
Scanner V2 UI
→ DocumentScannerEngine interface
→ current AdminAvenger engine as initial/default implementation
→ OCR/intake
```

The current engine has not been shown to beat Scanic or jscanify. Record enough
device, condition, capture, prepared-scan and OCR detail that a later controlled
comparison can distinguish scanner failure from camera, OCR, UI or fixture
failure.
