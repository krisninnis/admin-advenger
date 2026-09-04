# Pilot Acceptance Matrix v1

## 1. Status and approval

| Field | Value |
|---|---|
| Status | **Approved for this documentation-only evidence milestone** |
| Version | v1 |
| Human approval date | **4 September 2026** |
| Approved by | Human project owner |
| Authoritative base | `92fa9256a998cc30db8e93ad0ef42aebbdf13824` |
| Product principle | AI prepares. Humans decide. |
| Production behaviour changes | **Not authorised in this milestone** |

The human project owner accepted the preceding read-only audit and authorised
this bounded evidence/device-validation slice. This specification records that
decision. It does not claim that any browser, device or person has completed
acceptance testing.

## 2. Purpose

Create one authoritative framework for deciding whether the existing
document-to-next-step journey is ready for a small, controlled pilot. The
framework must keep five kinds of evidence visibly separate:

1. implemented behaviour;
2. automated or mocked checks;
3. direct desktop-browser checks;
4. direct Android and iPhone checks; and
5. direct human comprehension evidence.

Automated success is not real-device or real-user acceptance. A route remains
manually **NOT RUN** until a tester directly performs it and records evidence in
`docs/product/pilot-acceptance-matrix-v1.md`.

The governing product boundary remains:

> AdminAvenger helps prepare. You stay in control.
>
> AI prepares. Humans decide.

AdminAvenger must not send, submit, share, contact an organisation or take
another consequential action automatically.

## 3. Scope

This milestone covers documentation and evidence capture for:

- pasted text;
- DOCX intake;
- selectable-text PDF intake;
- uploaded-image intake;
- live camera capture;
- targeted recovery behaviour;
- desktop Chrome, Android Chrome and iPhone Safari evidence slots;
- current synthetic fixture reuse;
- current prepared-scan to OCR-review manual instructions; and
- an explicit scanner-provisional decision.

It also records the result-top clarity hypothesis identified by the audit. It
does not resolve that hypothesis in production code.

## 4. Evidence taxonomy

| Evidence class | Meaning | What it may prove | What it must not be called |
|---|---|---|---|
| `IMPLEMENTED` | The current source contains the behaviour. | Code-path existence at a named SHA. | Tested, accepted or usable on a device. |
| `AUTOMATED` | A named automated check passed at a named SHA. The environment may mock files, browser APIs, OCR or cameras. | The exercised contract under that test setup. | Desktop, mobile, camera or human acceptance. |
| `DESKTOP_CHROME` | A tester directly observed the deployed/local build in desktop Chrome and recorded the environment. | That exact run on the recorded desktop/browser. | Android, iPhone or general user acceptance. |
| `ANDROID_CHROME` | A tester directly observed the run on the recorded Android device and Chrome version. | That exact Android run. | iPhone or cross-mobile acceptance. |
| `IPHONE_SAFARI` | A tester directly observed the run on the recorded iPhone and Safari/iOS version. | That exact iPhone run. | Android or cross-mobile acceptance. |
| `DIRECT_HUMAN` | A named or pseudonymous tester answered the comprehension prompts without coaching. | That person's understanding in that exact session. | Representative usability evidence by itself. |

Evidence classes can be combined only when each was actually collected. A
passing unit test can support `AUTOMATED`; it cannot populate any browser,
device or direct-human field.

## 5. Mandatory execution record

Every executed case must record, without unnecessary personal information:

- AdminAvenger commit SHA;
- deployment URL or local environment;
- date;
- tester identifier;
- device;
- operating system and version;
- browser and version;
- input route;
- synthetic fixture/example;
- expected result;
- actual result;
- `PASS`, `FAIL` or `BLOCKED`;
- issue severity when failed;
- evidence/reference; and
- notes.

The matrix may use `NOT RUN` for planned cases only. `NOT RUN` is not an
executed result. Records must not contain a real user's letter, document photo,
account number, address or other unnecessary personal data.

## 6. Primary input journeys

| ID | Input route | Reused synthetic example | Primary purpose |
|---|---|---|---|
| `P-PASTE` | Pasted text | HMRC Tax Code Notice | Exercise direct pasted text and an optional question. |
| `P-DOCX` | DOCX | Northbridge Broadband service notice | Exercise browser-local DOCX extraction and price-change explanation. |
| `P-PDF` | Selectable-text PDF | Greenfield Water Services payment reminder | Exercise browser-local PDF text extraction and ordinary bill/admin handling. |
| `P-IMAGE` | Uploaded image | Harbour Energy Services payment notice | Exercise prepared-scan review, OCR review and image intake. |
| `P-CAMERA` | Live camera capture | Unknown official letter rendered or printed from the existing inline fixture | Exercise a real camera, prepared-scan review, OCR review and conservative fallback. |

The consumer refund/faulty-goods example is an additional required fixture
coverage case. It is loaded through pasted text so all five requested synthetic
example families are exercised without inventing or duplicating fixtures.

For every primary journey, the tester must determine from the result:

1. What is this?
2. Is anything urgent?
3. What changed or matters?
4. What should I do next?
5. What should I have ready?

The tester must also verify that:

- uncertainty, limitations and missing evidence are visible where applicable;
- nothing was sent, submitted, shared or contacted automatically; and
- source material and the user's optional question remain understandable as
  different inputs, with no question text presented as a source fact.

### Known result-top hypothesis

The pre-implementation audit found the current result top likely makes **What
is this?** and **What should I do next?** clearer than **Is anything urgent?**,
**What changed or matters?** and **What should I have ready?**. This is a test
hypothesis, not an accepted defect and not permission to change the Result UI.
Record direct observations first. Any production change belongs in the later
`codex/pilot-result-top-clarity-v1` workstream.

## 7. Existing fixture reuse

| Example family | Existing source | Safe use |
|---|---|---|
| HMRC Tax Code Notice | `FULL_TAX_CODE_NOTICE` in `src/lib/__tests__/hmrcOneFrontDoor.test.ts` | Copy only the text inside the template literal into Home's **Paste text** field. Do not copy TypeScript syntax. |
| Broadband/mobile price rise | `audit-fixtures/journey-3-service-notice.docx` and `.txt` | Upload the DOCX for `P-DOCX`; use the TXT only to inspect expected source wording or as an explicit recovery fallback. |
| Consumer refund/delivery/faulty goods | `consumer-refund-refusal-001` in `src/lib/goldenLetters.ts` | Copy only that fixture's `inputText` template-literal contents into **Paste text**. It is also available as the **Consumer refund refusal** demo, but the demo does not replace front-door acceptance. |
| Ordinary bill/admin message | `audit-fixtures/journey-2-payment-reminder.pdf` and `journey-4-payment-notice.png` | Upload the PDF for `P-PDF` and the PNG for `P-IMAGE`. |
| Unknown official letter | `unknown-official-letter-001` in `src/lib/goldenLetters.ts` | Copy only its `inputText` contents into a temporary local document, then display on a second screen or print it for `P-CAMERA`. Delete the temporary copy after the session if created. The **Unclear letter** demo is reference-only. |

All listed material is synthetic. Real pilot documents and photos must stay out
of the repository. Testers must not substitute specialist claims or real
personal information into these baseline runs.

## 8. Recovery journeys

The matrix must provide direct, independently scored cases for:

- choosing and drag/dropping a supported file;
- camera permission denied;
- camera unavailable;
- camera/photo retake;
- replacement upload;
- low-confidence OCR review and correction;
- page refresh before and after an explicit save;
- saved-item reopen and local recovery;
- explicit save;
- explicit export/download; and
- clear local data.

Each case must state whether the behaviour is merely `IMPLEMENTED`, supported by
`AUTOMATED` evidence, or directly `MANUALLY ACCEPTED`. Save, export and clear
must remain deliberate human actions. Refresh and local recovery must never be
inferred from a unit test or from another browser profile.

## 9. Device and browser requirements

The matrix must include explicit, initially `NOT RUN`, slots for:

- desktop Chrome;
- Android Chrome; and
- iPhone Safari where a device is available.

No device/browser receives a pass without direct evidence tied to a commit and
environment. If an iPhone is unavailable, record `BLOCKED`, the reason and the
owner of the decision; do not silently waive or convert it to a pass.

Real-device camera coverage should include, where practical:

- good even lighting;
- low light;
- glare;
- shadows;
- a folded or creased page;
- a cropped page;
- screenshot/upload;
- small text;
- permission denial;
- camera unavailable; and
- poor OCR confidence.

Scanner or OCR failures must record device, conditions, capture route,
prepared-scan observation, OCR observation and evidence so later engine
comparison is attributable rather than anecdotal.

## 10. Scanner contract and status

The preserved future contract is:

```text
Scanner V2 UI
→ DocumentScannerEngine interface
→ current AdminAvenger engine as initial/default implementation
→ OCR/intake
```

Current scanner engine status:

> **PROVISIONAL — REQUIRES REAL MOBILE ACCEPTANCE TESTING**

This milestone does not implement `DocumentScannerEngine`, switch engines or
claim that the current engine beat Scanic or jscanify. A later comparison must
use attributable results from the same fixture/condition cases rather than an
uncontrolled visual impression.

## 11. Result rules

| Result | Rule |
|---|---|
| `PASS` | Every mandatory expectation for that case was directly observed in the recorded environment and no unresolved issue affected the case. |
| `FAIL` | At least one mandatory expectation was not met. Record actual behaviour, severity and evidence. |
| `BLOCKED` | The case could not be completed because the required device, browser, permission, environment or test setup was unavailable. Record the blocker; do not treat it as a pass or product failure. |
| `NOT RUN` | Planning state only. No acceptance claim is permitted. |

An unexpected result is never softened to `PASS` because automated tests are
green. Conversely, an environment/setup blocker is not labelled a product
failure without evidence that the product caused it.

## 12. Severity rules

| Severity | Definition |
|---|---|
| `BLOCKER` | A safety/privacy boundary is breached; a consequential action appears automatic; source/question content is materially misattributed; sensitive data leaves the intended local boundary; or the required pilot journey is unsafe to continue. |
| `HIGH` | A primary route cannot be completed, a required result question cannot be answered, important urgency/action is materially misleading, or required save/reopen/clear recovery loses or exposes data. |
| `MEDIUM` | The task completes only with confusing or fragile recovery, or a material clarity/accessibility issue is recoverable without unsafe action. |
| `LOW` | Cosmetic, wording or layout issue with no material effect on comprehension, safety or task completion. |

Any `BLOCKER` or unresolved `HIGH` issue prevents pilot invitation. Multiple
lower-severity issues may be escalated when their combined effect creates a
material comprehension or safety risk.

## 13. Acceptance criteria

This evidence milestone is complete when:

- the spec and matrix exist at their authoritative paths;
- every planned case has an explicit evidence slot and no unexecuted case is
  presented as accepted;
- all fixture-loading instructions point to existing synthetic material;
- current photo/OCR manual instructions describe prepared-scan review followed
  by OCR review;
- stale manual-pilot counts in the directly related pilot documents say
  approximately 5 to 10 users;
- no production source, package, dependency or runtime behaviour changed;
- repository verification passes; and
- a draft pull request is available for human review.

Invitation of real pilot users remains a separate decision. It requires the
matrix's required desktop and available mobile cases to be directly executed,
all five example families to be reviewed, direct-human comprehension evidence
to be recorded, and no unresolved `BLOCKER` or `HIGH` issue. An unavailable
iPhone remains an explicit `BLOCKED` risk requiring human disposition.

## 14. Non-goals

This milestone does not:

- invite or observe real pilot users;
- change the Result UI;
- change intake, OCR, scanner, save, export or clear-data behaviour;
- add fixtures, dependencies, telemetry, uploads or cloud processing;
- implement or select a scanner engine;
- claim superiority over Scanic or jscanify;
- turn historical audit notes or mocked tests into current acceptance;
- use private evaluation corpora; or
- merge or deploy the documentation.
