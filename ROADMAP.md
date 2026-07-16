# AdminAvenger Roadmap

## Product Definition

AdminAvenger is a local-first, human-controlled life-admin preparation and
case-management product.

It helps a person check a message, letter, bill, receipt, CV, job advert,
photo, screenshot, or file; understand what it appears to be; gather evidence;
prepare an editable draft or checklist; and decide what to do next.

Core principles:

- AI remembers. AI explains. Humans decide.
- AI extracts facts. Code assesses. Human approves.
- Resolution over engagement.
- Evidence before claims.
- No silent actions.

The public promise should stay practical:

AdminAvenger helps prepare. You stay in control.

The product must not present itself as a lawyer, benefits adviser, debt adviser,
employment adviser, medical adviser, social worker, government department,
provider, recruiter, ombudsman, or autonomous agent.

## Completed Foundation

The current repository contains a substantial local-first foundation:

- React, TypeScript, Vite, and Tailwind CSS frontend.
- State-driven views without React Router.
- Mobile bottom navigation and desktop shell.
- One front door: Check a message.
- Paste text intake.
- File intake and visible drag/drop from the main input area.
- Local text extraction for TXT, Markdown, CSV, JSON, DOCX, and selectable-text
  PDFs.
- Local image/photo intake through camera or file picker.
- Local OCR with Tesseract.js, editable OCR review, low-confidence guards, and
  key-detail hiding when OCR is unreliable.
- Preview-first checking on Home before a case is saved.
- Admin findings, Admin Cases, Evidence Locker, Battle Log, drafts/checklists,
  chase dates, and case actions.
- LocalStorage persistence, reset/clear controls, storage safety handling, and
  backup/export copy.
- Opportunity Cards and Simple Result/Card Sheet views.
- Savings / Impact Ledger with potential, pending, confirmed, rejected, and
  no-action records kept separate.
- User-confirmed outcome flow; money is not counted as saved/recovered until
  the user records an outcome.
- Evidence Pack export for cases.
- Adviser Export Pack Markdown download for result packs.
- Trusted Guidance Cards with static checklist wording and source links.
- Terms & Safety gate, Trust & Safety page, public covenant page, and safety
  wording regression tests.
- Golden Letter Corpus for high-stakes synthetic fixtures.
- Demo tour, pilot readiness docs, and local validation/feedback tooling.

## Current Specialist Coverage

This section describes verified repository coverage, not marketing claims.

### Stable Or Implemented

- Career Support Pack v1.6: CV, job advert, and CV-plus-job-advert match
  preparation. It includes source splitting, requirement extraction,
  requirement-scoped evidence, evidence ranking, claim hygiene, final-output
  guards, privacy-specific preparation wording, checklist association, and
  evidence deduplication. Career Match v1.6 is stable for the current MVP and
  frozen except for genuine bugs.
- Decision Engine family: a shared `DecisionResult` pipeline for parking,
  debt/bailiff, TV Licence, bank complaint, consumer dispute, benefits-family
  letters, Council Tax Reduction, and unknown admin disputes. These are
  cautious preparation engines, not entitlement or legal engines.
- Benefits Action Pack: implemented as a view/derivation layer over benefits
  DecisionResults, with dates marked user-check-required and benefits money
  display-only.
- Result View Model: implemented to present decision results, action packs,
  strategic next steps, workplace packs, career packs, adviser exports, and
  case progress safely.
- Suspicious email guard: implemented as a safety override so high-risk email
  signals do not become generic reply/deadline advice.

### Dedicated But Narrow

- UK Train Delay / Delay Repay: implemented as a train-specific proof vertical
  with extracted operator/journey/date/delay/reference when present, evidence
  found/missing, uncertainty, draft, chase workflow, and export. It remains a
  useful proof vertical, not a generic travel-rights engine.
- Broadband/mobile price-rise assessment: implemented as a narrow
  broadband/mobile provider price-change assessment with old/new price,
  effective date, annual impact, contract timing, missing evidence, provider
  options, and safe draft/checklist wording.
- Refund/subscription/delivery/warranty/job-follow-up mock opportunities:
  implemented through deterministic mock analysis and opportunity cards. These
  are useful product coverage, but not all are dedicated specialist engines.

### Controlled Betas

- Workplace Support: gated preparation pack for workplace letters/messages,
  including disciplinary, grievance, sickness/capability, redundancy, pay,
  contract/rota changes, dismissal, investigation, bullying record prep,
  settlement agreement signposting, and unknown workplace admin. It is
  preparation-only and not normal Home auto-routing.
- Community Helper: controlled manual-text public beta for carers, family
  helpers, support workers, housing/OT-style preparation, missed letters,
  communication barriers, financial admin concerns, and urgent
  safeguarding-like signposting. It remains manual text only and is not wired
  to OCR/file/photo intake or the main classifier.

### Generic Or Fallback Coverage

- Unknown official/admin letters route to a safe fallback.
- Generic keyword findings can create refund, complaint, subscription,
  deadline, job application, bill increase, warranty, important reply, and
  unknown/no-action findings.
- No-action / checked records are implemented for messages with no clear
  saving, refund, deadline, complaint, or useful action.

Generic keyword handling must not be described as a complete specialist engine.

## Current Phase

The next phase is:

**Coverage consolidation, authoritative UK complaint research and
golden-fixture testing.**

The goal is not to add random features.

The goal is to:

1. Catalogue existing coverage.
2. Standardise engine contracts.
3. Research common UK complaint categories.
4. Build a complaint fixture library.
5. Harden existing engines.
6. Expand one vertical at a time.

## Future Implementation Waves

These are research candidates, not implemented promises. Each candidate needs
source review, safety wording, golden fixtures, negative/cross-domain tests,
and live testing before it becomes product coverage.

### Wave 1 Candidates

- Energy billing and meters.
- Housing repairs and complaints.
- Telecom billing and cancellation.
- Banking fraud and card disputes.
- Consumer refunds, faulty goods, and deliveries.
- Universal Credit payments, deductions, and overpayments.

### Wave 2 Candidates

- Employment correspondence.
- Water billing and supply.
- Insurance complaints.
- Council tax and council complaints.
- Privacy and data requests.
- Used-car and home-improvement disputes.

### Controlled High-Risk Areas Later

- Homelessness.
- Social care.
- SEND and education.
- Solicitor-service complaints.
- Probate and conveyancing administration.

These areas should be approached through preparation, evidence organisation,
and signposting only. They must not become legal, benefits, debt, care, medical,
housing, employment, or financial advice.

## Platform Work Later

Keep these later until coverage, safety, and product usefulness are proven:

- Authentication.
- Cloud database.
- Secure account storage.
- Hosted AI extraction.
- Provider integrations.
- Email integrations.
- Automatic actions.

## Technical Boundary

Current status:

- Frontend: React + TypeScript + Vite + Tailwind.
- Backend: not implemented.
- Authentication: not implemented.
- Database: not implemented.
- Routing library: not implemented.
- Hosted AI gateway: not deployed in the current repo.
- Local Ollama: experimental local structured extraction for pasted text.
- External APIs: not used for product workflows.
- Email sending/provider integrations: not implemented.
- Automatic submission/cancellation/contacting: not implemented.
- Autonomous agents: not implemented.

Hosted AI may be revisited only as an explicit, opt-in extraction gateway with
privacy, abuse controls, and deterministic assessment boundaries preserved.
