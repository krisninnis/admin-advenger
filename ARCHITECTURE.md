# AdminAvenger Architecture

AdminAvenger is currently a React + TypeScript + Vite + Tailwind app with one Vercel
serverless AI extraction gateway.

No authentication, routing framework, database, autonomous agents, email sending, claim
submission, or provider integrations are used yet.

The architecture should preserve the manifesto principle:

AI remembers. AI explains. Humans decide.

Every future automation boundary should keep user consent, evidence, and explainability visible.

Core protocol:

```text
AI extracts facts.
Code assesses.
Human approves.
```

## App Shape

The app is a single-page, state-driven SaaS workspace. It uses local React state for navigation
instead of React Router.

Main views:

- Home: consumer-first input for pasted text, supported uploads, private previews, demo examples,
  and a plain Opportunity Card before anything is saved.
- Dashboard: high-level stats, Chase Engine summary, recent cases, and quick actions.
- Paste: Add Admin Item form, demo scenarios, analysis loading, and analysis errors.
- Cases: findings discovery list, case queue, and practical filters for status, category, chase due,
  potential saving, pending recovery, confirmed saved, and no-action records.
- Case File: selected Admin Case, Evidence Locker, Delay Repay Assessment, Battle Log, Draft Panel, Case Actions, and Evidence Pack Export.
- Validation: real-user testing notes for Refund Avenger and local feedback on what to build next.
- Settings / Data: localStorage data controls and a local data privacy note.

## Core Data Types

Important types live in:

```text
src/types.ts
```

Core objects:

- `AdminItem`: pasted source material from the user.
- `AdminFinding`: a detected opportunity or admin action.
- `AdminCase`: a stronger case file created from a finding.
- `OpportunityCard`: a derived consumer-facing summary of money, deadline, evidence, missing information, and next action.
- `ImpactEntry`: a local ledger entry for potential, pending, confirmed, rejected, or not-applicable outcomes.
- `EvidenceItem`: evidence attached to a case.
- `CaseTimelineEvent`: case history event.
- `AdminDraft`: a mock draft attached to a finding/case.

## Data Flow

1. User checks text from Home or submits the Add Admin Item form.
2. `App.tsx` creates an `AdminItem`.
3. `analyseAdminItem` creates one or more `AdminFinding` records.
4. `createAdminCase` converts each finding into an `AdminCase`.
5. Home checks create a preview result first. Nothing is saved or counted until the user chooses
   Save case or Save as record.
6. Add/Paste workflow analysis can still save directly into the case system for the advanced view.
7. Findings appear in the discovery list after saving.
8. Selecting a finding or case opens the related case in the Case File view.
9. Status changes update both the case and the original finding.
10. Draft generation creates a draft, marks the case as drafted, and adds a timeline event.
11. Opportunity cards are derived from cases for the Home, Cases, Case File, and Savings views.
12. Impact entries track potential, pending, confirmed, rejected, and no-action outcomes without
    mixing them.
13. Saved state is written to localStorage.

Nothing sends, cancels, claims, complains, or contacts anyone automatically.

## Important Files

```text
src/App.tsx
```

Owns top-level state and connects the major components.

```text
src/components/AppShell.tsx
src/components/Sidebar.tsx
src/views/
```

Provide state-driven navigation and focused page layouts. These are view components only; they do
not introduce a routing framework.

```text
src/lib/mockAnalysis.ts
```

Frontend-only mock keyword analysis. Accepts an `AdminItem` and returns `AdminFinding[]`.

```text
src/lib/caseFactory.ts
```

Converts an `AdminFinding` and `AdminItem` into an `AdminCase`.

```text
src/lib/storage.ts
```

Loads, saves, and clears persisted local app state.

```text
src/lib/chaseEngine.ts
```

Calculates chase groups such as due today, overdue, upcoming, and waiting without dates.

```text
src/lib/delayRepayAssessment.ts
```

Contains the first vertical workflow model: a UK train delay refund assessment. It is intentionally train-specific and should not become a generic assessment engine yet.

```text
src/lib/broadbandPriceRiseAssessment.ts
```

Contains the Money Back Avenger broadband/mobile price-rise assessment. It is intentionally specific to provider price-rise letters and should not become a generic assessment engine.

```text
src/services/delayRepayExtractionService.ts
```

Provides the AI-ready Delay Repay fact extraction boundary. It currently defaults to local mock extraction. Future real AI extraction must happen server-side; API keys must never be placed in frontend code.

```text
src/views/ValidationView.tsx
src/lib/validationStorage.ts
```

Store local real-user validation notes and feedback entries, then export them as Markdown.

```text
src/data/demoScenarios.ts
```

Contains fake sample admin scenarios that can be loaded into the form or analysed through the normal service flow.

```text
src/components/CasePanel.tsx
```

Main right-hand case file view.

```text
src/components/EvidenceLocker.tsx
```

Shows detected and placeholder evidence.

```text
src/components/CaseTimeline.tsx
```

Shows the case battle log.

## Persistence

The app persists one state object to localStorage.

Saved groups:

- `adminItems`
- `findings`
- `adminCases`
- `drafts`
- `impactEntries`
- `selectedFindingId`
- `selectedCaseId`

Separate localStorage keys also store Refund Avenger validation notes and local feedback entries.

If saved data is missing or malformed, the app falls back safely.

Legacy cases without impact entries are hydrated by deriving safe potential/pending/no-action
entries from the existing case data. Confirmed savings or recovered money are never inferred from
AI or case text; they are created only when the user confirms an outcome.

## Opportunity And Impact Layer

The opportunity and savings layer lives in:

```text
src/lib/opportunityCards.ts
src/lib/impactLedger.ts
src/views/SavingsView.tsx
```

Opportunity cards are derived from existing cases and assessments. They answer: what this is, money
or deadline involved, evidence found, missing information, and next best action.

Impact entries are persisted because they may contain user-confirmed outcomes and local proof
metadata. Totals deliberately separate:

- confirmed saved/recovered
- pending recovery
- potential saving
- potential annual saving
- deadlines protected
- resolved cases

The app must not combine potential and confirmed amounts in a way that implies money has already
been saved or recovered.

No-action and evidence-only records are first-class outcomes. They can be saved as records, but they
must not inflate confirmed savings, pending recovery, potential savings, or deadline totals. In the
Savings view they belong under "No action / checked" rather than the main money feed.

Home preview results are deliberately unsaved. This lets someone paste a document, understand what
AdminAvenger sees, then decide whether to save a case, save a record, or clear the result. Private
checks should never create pressure, fake value, or inflated case counts.

Outcome confirmation is human-entered. The UI can offer nudges such as "Money came back", "Bill
reduced", or "Still waiting", but confirmed impact and proof are stored only after the user says what
happened. Prototype proof images and notes remain local to this browser.

## Trusted Guidance Cards

Trusted guidance cards live in:

```text
src/data/trustedGuidanceCards.ts
src/lib/trustedGuidanceMatcher.ts
```

They contain original AdminAvenger checklist wording plus source links only. The app does not scrape,
copy, reproduce, or dynamically fetch third-party guidance.

Local persistence is currently for prototype convenience only. Long-term storage must protect sensitive data, support deletion/export, and avoid selling or leaking personal admin data.

## Backend AI Gateway

AdminAvenger has one backend AI gateway:

```text
/api/analyze-admin
```

It uses the server-side OpenAI SDK from a Vercel serverless route. The gateway exists only to
extract structured facts from user-provided text or selected screenshots/photos.

Environment variables:

- `OPENAI_API_KEY`: server-side only. Never prefix this with `VITE_`.
- `OPENAI_MODEL`: optional model override for a current OpenAI model that supports text, image input, and structured JSON output.

The gateway may:

- Read user-provided text or images.
- Classify document type.
- Extract structured facts.
- Quote supporting evidence.
- List missing information.
- Return safe JSON.

The gateway must not:

- Decide legal rights.
- Claim entitlement.
- Invent facts.
- Submit claims.
- Send emails.
- Cancel services.
- Contact providers.
- Override deterministic AdminAvenger assessment logic.
- Silently act on behalf of the user.

The frontend calls `/api/analyze-admin` through `src/services/aiGatewayService.ts`. It never calls
OpenAI directly and never uses frontend API keys.

AI extraction enriches the input. `src/lib/aiExtractionAdapter.ts` converts extracted facts into a
plain text block, then the existing AdminAvenger analysis and case creation flow still performs:

- Case classification.
- Confidence wording.
- Missing evidence.
- Contract/date reasoning.
- Rights caveats.
- Next action.
- Draft safety.

The user must always approve any action.

## Local AI Testing Mode

AdminAvenger also has an experimental local Ollama extraction mode for development and power-user
testing. It is configured from the Home input area and saved in localStorage.

Defaults:

- AI mode: Local rules only
- Ollama URL: `http://localhost:11434`
- Ollama model: `llama3.2`

Local Ollama mode is not the final public customer AI model. It only works when Ollama is installed
and running on the user's own device. Future hosted customers should not need to install Ollama,
manage model names, or provide API keys.

The local Ollama service lives in:

```text
src/services/ollamaExtractionService.ts
```

The service may:

- Read pasted text.
- Classify document type.
- Extract structured facts.
- Quote supporting evidence.
- List missing information.
- Return safe JSON.

The service must not:

- Decide legal rights.
- Claim entitlement.
- Invent missing facts.
- Submit claims.
- Send emails.
- Cancel services.
- Contact providers.
- Override deterministic AdminAvenger assessment logic.

Local Ollama extraction uses the same adapter boundary as the cloud gateway:

```text
AI extracted facts -> src/lib/aiExtractionAdapter.ts -> deterministic AdminAvenger checking
```

If Ollama is not running, the model is missing, or JSON is unreadable, the Home flow shows a
friendly warning and falls back to local rules.

## Current Constraints

Keep these constraints until explicitly changed:

- No backend beyond the `/api/analyze-admin` extraction gateway.
- No auth.
- No routing.
- No real AI outside structured extraction.
- No external APIs beyond the server-side OpenAI extraction call and optional local Ollama testing.
- No new libraries unless there is a clear product need.

## Trust Boundaries

The app should always:

- Show the evidence behind recommendations.
- Explain uncertainty clearly.
- Require approval before meaningful real-world action.
- Keep drafts editable and copy-based until integrations are trusted.
- Let users delete and export their data.
- Avoid legal, financial, or medical decision-making.
- Avoid false confidence.

## Future Integration Boundary

The likely future AI boundary is:

```text
AdminItem -> analysis adapter -> AdminFinding[] -> caseFactory -> AdminCase[]
```

This lets the UI stay stable while mock analysis is later replaced by real AI.

Future AI should return structured, auditable data. The UI should show what was found, why it was found, what is uncertain, and what the human should check before acting.

## Vertical Workflow Rule

Build verticals before abstractions.

The first complete vertical is the Refund Avenger UK train delay workflow. It uses a specific `DelayRepayAssessment` model to show extracted train-delay evidence, missing information, operator-rule caveats, confidence explanation, draft wording, and chase steps. Generalise only after multiple verticals prove the repeated shape.

The public wedge is now Money Back Avenger. Train Delay / Delay Repay remains the completed proof
vertical and demo. Broadband/mobile price-rise letters are the next focused validation vertical.

Principles:

- Verticals are earned from real user behaviour, not declared from architecture.
- The product can support multiple demos, but the launch wedge must be one focused workflow.
- Do not build a generic assessment engine to get ahead of validated user behaviour.

## Product Health Orientation

The system should optimise for:

- Cases resolved
- Loops closed
- Deadlines not missed
- Time saved
- Money saved or recovered
- User confidence increased
- Stress reduced

It should not optimise for unnecessary time-in-app, anxiety, or endless notification loops.
