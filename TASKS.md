# AdminAvenger Tasks

This file tracks practical next work. Keep it short, current, and useful.

Source principle:

AI remembers. AI explains. Humans decide.

Prefer tasks that close loops, reduce stress, show evidence, and keep the user in control.

## Done

- Created React + TypeScript + Vite project.
- Installed Tailwind CSS.
- Built dashboard.
- Built Add Admin Item form.
- Built findings list.
- Built mock analysis.
- Added multiple findings per pasted item.
- Added Admin Case layer.
- Added Evidence Locker.
- Added Battle Log / Case Timeline.
- Attached drafts to cases.
- Added status timeline events.
- Added localStorage persistence.
- Added reset demo data control.
- Added clear all local data control.
- Added case title and next action editing.
- Added chase date and outcome note editing.
- Added quick mark resolved action.
- Added delete case action.
- Added Markdown evidence pack export.
- Added Chase Engine dashboard panel.
- Added chase date, waiting, chasing, and chased-today controls.
- Added demo scenarios with load and analyse actions.
- Added first Refund Avenger workflow for UK train delay refund checks.
- Reorganised the app into state-driven views without React Router.
- Added THE_COVENANT.md.
- Added Refund Avenger validation workflow for real-user testing notes.
- Added local feedback loop for what users want built next.
- Added AI-ready Delay Repay extraction service boundary without frontend API calls.
- Aligned roadmap around Money Back Avenger as the public wedge.
- Reordered demo scenarios around broadband/mobile price-rise validation.
- Added broadband/mobile price-rise assessment vertical.
- Added backend AI gateway at `/api/analyze-admin`.
- Added server-side OpenAI structured extraction.
- Added AI extraction service for the Home input.
- Added Home AI extraction toggle.
- Added AI extracted facts panel.
- Added image/photo AI extraction attempt with local fallback.
- Added Local Ollama experimental extraction mode for pasted text.
- Added Opportunity Cards for consumer-facing money/deadline/action summaries.
- Added local Savings / Impact Ledger with confirmed, pending, potential, and no-action records.
- Added Savings view for money tracked and impact history.
- Added user-confirmed outcome workflow with local proof notes/images.
- Added Trusted Guidance Cards with original checklists and source links only.
- Added preview-first Home checks so pasted documents are not saved until the user chooses.
- Added Save case, Save as record, and Ignore / Clear result paths on Home.
- Added no-action handling for documents with no obvious saving, deadline, complaint, or useful action.
- Added Home demo example buttons for price rise, refund, subscription, receipt, missing parcel,
  delivery update, and payment received checks.
- Added Savings and Cases filters for no-action records, chase due, potential saving, pending
  recovery, and confirmed saved.
- Added outcome nudges for user-confirmed money, deadline, waiting, rejected, and no-saving results.

## Next

- Validate broadband/mobile price-rise letters with real users.
- Validate whether preview-first-save-later reduces anxiety and false case creation.
- Validate the no-action result with ordinary delivery updates, payment confirmations, and receipts.
- Validate whether Savings / Impact history helps users understand value without overclaiming.
- Improve proof handling before any account-backed storage.
- Test Ollama quality on broadband/mobile price-rise letters.
- Compare local Ollama extraction with OpenAI extraction later.
- Add screenshot/photo extraction later.
- Test AI extraction with real screenshots/photos.
- Improve the AI extraction adapter from real examples.
- Consider rate limiting and abuse protection before public release.
- Add cloud AI gateway refinements after validation.
- Use validation notes to decide whether broadband/mobile becomes the next vertical.
- Keep Train Delay / Delay Repay as the completed proof vertical and demo.
- Add archive or hide ignored cases.
- Add filters for category, urgency, and status.
- Run 10 real-user Refund Avenger tests and review validation export.
- Add actual value recovered field.
- Add money recovered and money saved tracking.
- Add loop-closed / case-resolved dashboard signals.
- Add confidence and uncertainty notes to cases.
- Add "check before acting" notes to draft and case views.
- Improve evidence extraction for amounts, dates, company names, and references.
- Move draft generation into a small reusable helper.
- Later add accounts/auth only if storing server-side user data.
- Later consider Gmail/Outlook only with explicit user consent.

## Product Strategy Notes

- Verticals are earned from real user behaviour, not declared from architecture.
- The product can support multiple demos, but the launch wedge must be one focused workflow.
- Do not build five verticals at once.
- Broadband/mobile price-rise letters are the next validation candidate.
- Subscriptions, delivery/returns, and warranties follow only after validation.

## Later

- Improve upload support.
- Add better draft tone controls.
- Improve real AI extraction quality.
- Add backend and accounts only after local prototype is useful.
- Add privacy-first data export and deletion UX for account-backed data.
- Add integrations only when consent and trust boundaries are explicit.

## Guardrails

- Keep app state frontend/local-first for now.
- Do not add backend features beyond the AI extraction gateway unless explicitly scoped.
- Do not add auth yet.
- Do not add routing yet.
- Do not add autonomous AI actions.
- Do not call external APIs from the frontend.
- Do not install new libraries without a clear reason.
- Do not silently act on behalf of the user.
- Do not optimise for time-in-app.
- Do not hide why a recommendation was made.
- Do not create false confidence.
- Do not make legal, financial, or medical decisions for the user.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
```
