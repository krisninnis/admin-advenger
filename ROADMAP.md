# AdminAvenger Roadmap

## Product Definition

AdminAvenger is a local-first, human-controlled life-admin preparation and
case-management product.

It helps a person check a message, letter, bill, receipt, CV, job advert,
photo, screenshot, or supported file; understand what it appears to be;
identify important facts and uncertainty; gather evidence; prepare a next step;
and decide what to do.

Core principles:

- AI remembers. AI explains. Humans decide.
- AI extracts facts. Code assesses. Human approves.
- Resolution over engagement.
- Evidence before claims.
- No silent actions.
- AdminAvenger helps prepare. The user stays in control.

AdminAvenger must not present itself as a lawyer, tax adviser, benefits adviser,
debt adviser, employment adviser, medical adviser, social worker, government
department, provider, recruiter, ombudsman, claims company, or autonomous agent.

## Current Public MVP

The public MVP has one calm front door:

> Check a message.

A person can:

- paste or type text;
- take a photo;
- upload an existing photo;
- upload a supported document;
- optionally ask a question about the material;
- review the extracted or prepared text;
- receive a plain-English result;
- save or export the result when useful.

The current public journey is:

1. Provide a message or document.
2. Optionally ask a question about it.
3. Understand what it appears to be.
4. See important facts, dates, amounts, uncertainty, and missing evidence.
5. Know the safest next move.
6. Save or export when useful.
7. Remain in control.

The public product is not a collection of separate category checkers. Internal
classification and deterministic preparation systems sit behind the single
front door.

Nothing is sent, submitted, cancelled, claimed, applied for, paid, archived, or
communicated automatically.

## Completed Foundation

The current repository contains a substantial local-first foundation:

- React, TypeScript, Vite, and Tailwind CSS frontend.
- State-driven single-page application.
- Mobile bottom navigation and desktop shell.
- One public Check a message front door.
- Paste and typed-text intake.
- Visible drag/drop and file attachment intake.
- Local text extraction for:
  - TXT;
  - Markdown;
  - CSV;
  - JSON;
  - DOCX;
  - selectable-text PDF.
- Local image and photo intake through:
  - live camera capture;
  - system camera input;
  - gallery or file upload.
- Camera permission handling and honest unavailable/denied fallbacks.
- High-resolution capture and camera-stream cleanup.
- Local document preparation and prepared-scan confirmation before OCR.
- Local Tesseract OCR.
- Editable OCR review.
- Low-confidence OCR recovery and key-detail hiding.
- Development-only A4 camera calibration laboratory.
- Preview-first checking before a case is saved.
- Admin Items, Findings, Admin Cases, Evidence Locker, Battle Log, drafts,
  checklists, chase dates, case actions, and user-confirmed outcomes.
- LocalStorage persistence, storage safety, reset and clear-data controls.
- Opportunity Cards, Result View Model, Simple Result Panel, Case Sheet,
  Strategic Next Step panel, and Case Progress tracking.
- Savings and Impact Ledger with confirmed, pending, potential, rejected,
  deadline, and no-action states kept separate.
- Evidence Pack export.
- Adviser Export Pack Markdown download.
- Trusted Guidance Cards.
- Terms and Safety gate.
- Trust and Safety page.
- Public covenant.
- Suspicious-email safety override.
- Public-scope gating and controlled-beta build flags.
- Safety wording regression tests.
- Synthetic golden letter and document fixtures.
- Full verification through `scripts/verify.ps1`.

## Current Coverage

Coverage must be described by maturity, not by the presence of a keyword or
module.

### Stable Or Implemented

- Career Support Pack v1.6 for CV, job advert, and CV-plus-job-advert
  preparation. It is frozen except for confirmed defects.
- Shared Decision Result pipeline and Result View Model.
- Suspicious-email safety guard.
- Safe unknown official or administrative document fallback.
- Case, evidence, chase, outcome, and export workflows.

### Narrow Public Preparation

#### HMRC Tax Code Notices

AdminAvenger can:

- identify a likely HMRC Tax Code Notice;
- extract visible previous and replacement tax codes;
- extract the visible tax year, employer, and calculation entries;
- explain that the notice is not itself a tax bill;
- identify visible information that should be checked;
- show missing information and uncertainty.

It must not:

- calculate the person's correct tax code;
- claim HMRC is correct or incorrect;
- provide general tax advice;
- claim a refund, liability, entitlement, or likely outcome;
- automatically contact HMRC;
- market AdminAvenger as a general tax assistant.

#### Broadband And Mobile Price Changes

The narrow assessment can identify visible old and new prices, effective dates,
possible annual impact, contract timing, missing evidence, provider options,
and cautious preparation wording.

#### UK Train Delay And Delay Repay

The proof vertical can organise journey, operator, delay, date, reference,
evidence, uncertainty, draft, chase, and export information when present.

### Implemented At Documented Maturity Levels

The repository also contains preparation systems for:

- parking notices;
- debt collection and enforcement notices;
- TV Licence letters;
- bank complaints;
- consumer disputes;
- benefits-family documents;
- Council Tax Reduction or Support;
- workplace correspondence;
- Community Helper scenarios;
- generic refunds, delivery problems, subscriptions, warranties, deadlines,
  bills, complaints, and important replies.

These are not all equally mature and must not all be marketed as complete
specialist engines.

### Controlled Or Hidden

The following remain hidden, controlled, development-only, or unavailable from
normal public automatic routing unless separately approved:

- benefits specialist workflows;
- debt and enforcement specialist workflows;
- workplace support beta;
- Community Helper beta;
- Career Match beta;
- adviser and validation surfaces;
- camera calibration laboratory;
- internal testing and demo routes.

## Current Milestone

The current phase is:

**Pilot readiness and closed real-user validation.**

The goal is not to add another specialist category.

The goal is to make the existing document-to-next-step journey understandable,
dependable, safe, and useful for approximately 5 to 10 ordinary pilot users.

## Pilot-Readiness Work

### Experience Clarity

- Make the optional question field easier to notice.
- Clarify that the question is about the supplied document or message.
- Simplify the top of the result so it quickly answers:
  - What is this?
  - Is anything urgent?
  - What changed or matters?
  - What should I do next?
  - What should I have ready?
- Reduce repeated information and move secondary detail behind progressive
  disclosure where appropriate.

### Input Reliability

Validate:

- pasted text;
- DOCX;
- selectable-text PDF;
- uploaded image;
- live camera capture;
- drag/drop;
- camera permission denied;
- camera unavailable;
- replacement and retake paths;
- low-confidence OCR recovery;
- refresh and local recovery;
- save, export, and clear-data behaviour.

### Pilot Examples

Prepare synthetic, non-personal examples for:

- HMRC Tax Code Notice;
- broadband or mobile price-rise notice;
- consumer refund, delivery, or faulty-goods message;
- ordinary bill or administrative message;
- unknown official letter safe fallback.

### Real-Device Checks

Test where available on:

- Android Chrome;
- iPhone Safari;
- desktop Chrome.

Include:

- good lighting;
- low light;
- glare;
- shadows;
- folded or creased letters;
- cropped pages;
- screenshots;
- small text;
- long documents;
- permission denial;
- camera unavailability;
- poor OCR confidence.

### Closed Pilot

Observe approximately 5 to 10 ordinary users completing tasks without coaching.

Record:

- hesitation;
- misunderstanding;
- intake failures;
- OCR corrections;
- result comprehension;
- trust;
- uncertainty comprehension;
- whether users realise nothing was sent;
- save and export usefulness;
- abandonment;
- willingness to use the product again.

No new specialist category should be added during the first pilot cycle.

## Pilot Exit Criteria

The first pilot cycle can close when:

1. The five core input routes have documented acceptance results.
2. The five synthetic pilot examples complete safely.
3. Users can identify what the document appears to be.
4. Users can find the main next step.
5. Users understand uncertainty and missing evidence.
6. Users understand that nothing was sent automatically.
7. Camera and upload recovery paths are usable.
8. Save and export actions are understandable.
9. High-impact failures are ranked and addressed.
10. The same core journeys pass after the fixes.

## Known Limitations

- Legacy `.doc` files are not parsed.
- Scanned or image-only PDFs are not currently OCRed directly as PDF documents.
- OCR may misread blurred, shadowed, cropped, folded, low-contrast, or
  low-resolution images.
- Real-device evidence is still incomplete.
- Real-person comprehension evidence is still incomplete.
- There is no backend.
- There is no authentication.
- There is no cloud database.
- There is no hosted production AI gateway.
- There are no email or provider integrations.
- There are no automatic actions.

Scanned-PDF OCR should later reuse the existing local preparation, review,
confidence, and human-approval boundaries rather than create a separate public
journey.

## Post-Pilot Sequence

After the first closed pilot:

1. Rank observed problems by frequency and user impact.
2. Fix only confirmed high-impact failures.
3. Repeat the same acceptance journeys.
4. Freeze the pilot release when they pass.
5. Select telecom as the first formal post-pilot hardening vertical.
6. Create telecom fixtures before changing behaviour.
7. Run telecom and cross-domain regression tests.
8. Fix only confirmed failures.
9. Freeze telecom behaviour after passing.
10. Expand one researched vertical at a time.

## Future Research And Hardening Waves

These are candidates, not implemented promises.

Each candidate requires:

- authoritative source review;
- documented scope;
- safe and forbidden outputs;
- synthetic golden fixtures;
- negative and cross-domain tests;
- live testing;
- explicit public-scope approval.

### First Post-Pilot Candidate

- Telecom billing, price changes, cancellation, and complaint preparation.

### Later Candidates

- Energy billing and meters.
- Consumer refunds, faulty goods, returns, and deliveries.
- Banking fraud and card disputes.
- Universal Credit payments, deductions, and overpayments.
- Water billing and supply.
- Insurance complaints.
- Council tax and council complaints.
- Privacy and data requests.
- Used-car and home-improvement disputes.

### Controlled High-Risk Areas Later

- Housing repairs and housing complaints.
- Homelessness.
- Social care.
- SEND and education.
- Workplace correspondence.
- Solicitor-service complaints.
- Probate and conveyancing administration.

These areas should remain preparation, evidence organisation, and signposting
systems. They must not become legal, tax, benefits, debt, housing, care,
medical, employment, or financial decision engines.

## Platform Work Later

Keep these later until validated product needs require them:

- authentication;
- cloud database;
- secure account storage;
- hosted AI extraction;
- provider integrations;
- email integrations;
- automatic actions.

Hosted AI may be reconsidered only as an explicit, opt-in extraction gateway
with privacy, abuse controls, deterministic assessment, visible uncertainty,
and human approval preserved.

## Technical Boundary

Current truth:

- Frontend: React, TypeScript, Vite, and Tailwind.
- Backend: not implemented.
- Authentication: not implemented.
- Database: not implemented.
- Routing framework: not implemented.
- Hosted AI gateway: not deployed.
- Local Ollama: experimental structured extraction for pasted text.
- External product workflow APIs: not used.
- Email sending: not implemented.
- Provider contact: not implemented.
- Automatic submission or cancellation: not implemented.
- Autonomous agents: not implemented.

The boundary remains:

```text
AI extracts facts.
AdminAvenger code assesses.
Human approves.
```