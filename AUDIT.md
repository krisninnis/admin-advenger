# AdminAvenger — Pre-Launch Brutal Audit (2026-07-03)

One-line verdict: the deterministic core is honest by design, but the app currently invents money amounts, mislabels cases with "high confidence", can silently lose all user data, and ships an unauthenticated OpenAI endpoint. None of these are hard fixes. All of them would burn trust with real users.

## 1. LAUNCH BLOCKERS

**B1. Silent total data loss.** `saveAdminAvengerState` swallows quota errors (`src/lib/storage.ts:239`), and proof photos are stored as base64 data URLs inside impact entries (`OutcomeConfirmation.tsx` `readFileAsDataUrl` → `proofImageDataUrl`, `types.ts:207`). One phone photo (~3–8MB base64) exceeds the ~5MB localStorage quota; every save after that fails silently and a refresh wipes everything the tester entered. For a test "with real letters" this is the worst possible failure.

**B2. Drafts assert facts the user never gave.** `messageDrafts.ts` `createTravelRecoveryMessage` hardcodes an "additional hotel night" subject and an "I also have confirmation from loveholidays…" sentence for any case matching loose travel signals. Worse, `moneyParsers.ts:210` falls back to **the first currency amount anywhere in the text** as the recovery amount — on a real letter that's the flight price, not the extra cost — and it goes straight into a money-request email the user is told to send.

**B3. Confident wrong classification.** `createTravelRecoveryFinding` hardcodes `category: "refund"` with `confidence: "high"` (`mockAnalysis.ts:453–470`) — that's your mislabelled travel case. Root cause is broader: `categoryRules[0]` treats "cancelled" and "compensation" as strong *refund* keywords, and `getConfidence()` returns "high" for a single keyword hit. A cancelled dentist appointment reads as "Possible refund follow-up — high confidence."

**B4. Money totals are wrong.** `calculateImpactTotals` (`impactLedger.ts:264`) sums monthly, annual and one-off amounts as flat numbers into "Confirmed saved/recovered" and "Pending recovery". A confirmed £10/month reduction displays as "£10 saved". Also "Still waiting" is in `moneyOutcomeTypes` and pre-fills an amount (see B5) which is then written into `pending_recovery` — users record money they never confirmed.

**B5. The £42.99 bug (see §3).** Stale/prefilled outcome amounts propagate between checks and outcome cycles. Money-correctness bug in the one place the app promises "AI does not confirm money saved."

**B6. Unauthenticated OpenAI proxy.** `api/analyze-admin.ts` is deployed with no auth, no rate limit, no origin check — anyone who finds `/api/analyze-admin` can burn your OpenAI key. Meanwhile the frontend never calls it: `analyzeAdminInput` (`aiGatewayService.ts`) is imported by nothing, and the built bundle contains no reference to it. You carry the risk of the feature without having the feature.

**B7. Privacy claim is one commit away from false.** `HomeView.tsx:972` — "Checks are private until you save them… Local rules only checks this in your browser." Today that's true (both shipping modes are local). But the OpenAI gateway is sitting there waiting to be wired in, and the copy won't stop anyone. If any deployed branch already calls `/api/analyze-admin`, this is a live false privacy claim. Either delete the gateway or rewrite the copy before the first stranger pastes a real letter.

## 2. NOT BLOCKERS (for 10 people)

Not required: Ollama mode (nobody in a soft test installs Ollama — it added a second extraction path, a settings surface, and the classification-conflict shim in `aiExtractionAdapter.ts` with zero validation), the energy/E.ON parser, broadband and delay-repay assessments (three vertical rule engines each overfitted to one demo letter — `moneyParsers.ts` literally hardcodes "Air Mauritius" and "loveholidays"), inbox scan preview, email-safety `threatPercent` scoring, ValidationView, evidence pack export, chase engine polish, legacy storage-key migration, and the seven markdown vision documents.

Risk-without-validation callout: the repo is ~8,400 lines of TypeScript with **zero test files**. Every recent feature above added parsing/classification surface that can be confidently wrong, and none added a single assertion. Don't fix that with a test suite now — fix it by shrinking what's exposed.

Case File repetition (known issue) is real but cosmetic: `CaseFileView` renders `SimpleResultPanel` + `OpportunityCardPanel` + evidence + `TrustedGuidancePanel` + `PreparedMessagePanel`, all derived from the same `deriveOpportunityCard` — same four facts, shown four ways. Annoying, not harmful. Ship the soft test without restructuring it.

## 3. STATE-LEAK AUDIT

How state is initialised/reset today, and every place stale state leaks:

1. **`OutcomeConfirmation` amount prefill (primary £42.99 vector).** The form *does* reset on `[adminCase.id]`, but it pre-fills `amount` from pending/potential impact entries (`getDefaultAmount`). £42.99 enters via the demo refund text → `deriveImpactFromCase` creates `pending_recovery(42.99)` → prefilled into the form → confirming "Still waiting" (a money outcome) writes a **new** `pending_recovery` carrying that amount → prefilled again next time. The number self-perpetuates and lands in Savings totals without the user ever typing it.
2. **`homeResult` never cleared** (`App.tsx:137`). Not cleared when a new check starts, when analysis errors (`runAnalysis` error path returns early), or after saving. Paste a new letter, check fails or is slow → the previous letter's result — with its amount and Save button — is still on screen and saveable against the wrong document.
3. **`aiExtraction` cleared only on the Ollama path** (`HomeView.tsx` `runOllamaExtraction` vs `handleCheck`). In local-rules mode the previous "AI extracted facts" panel persists under a new check.
4. **Deterministic impact IDs** — `impact-${caseId}-${type}` (`impactLedger.ts` `makeEntry`). Confirming an outcome removes the pending entry, but any re-derivation path (`handleSaveScannedItem`, `handleSaveHomeResultCase`) resurrects it with the same ID and old amount; only the dedupe-by-ID filters in `App.tsx` keep this contained.
5. **Save saves everything.** `handleSaveHomeResultCase` maps over **all** `homeResult.cases` (`App.tsx:385`), not just the clicked card.
6. **`CaseActions` resets on `[adminCase]` object identity** — every timeline/status update recreates the case object and wipes the user's in-progress edits (the reverse leak: fresh user input destroyed by unrelated state changes).
7. **`selectedDraft` matched by `findingId`** (`App.tsx:147`) — safe today, fragile: any future finding-ID reuse cross-wires drafts between cases.

**Duplicate proof items (known issue), located:** `messageDrafts.ts` `missingBeforeSending` concatenates 4 hardcoded items with `travel.missingProof` — itself 6 hardcoded items in `moneyParsers.ts:239` — "Any standalone hotel receipt if available" appears verbatim in both; the bank-statement line appears in two spellings. Same additive-assembly pattern in `caseFactory.ts:306–324`.

## 4. THE SMALLEST LAUNCH (checklist, ~1 day)

- [ ] Remove amount prefill for "Still waiting"; drop `still_waiting` from `moneyOutcomeTypes`; require explicitly typed amounts for money outcomes. (`OutcomeConfirmation.tsx`)
- [ ] Clear `homeResult` and `aiExtraction` at the **start** of every check and on error. (`App.tsx` `runAnalysis`, `HomeView.tsx` `handleCheck`)
- [ ] Travel finding: own category/label (not "refund"); remove "cancelled"/"compensation" from refund strong keywords; single-keyword match caps at "medium" confidence. (`mockAnalysis.ts`)
- [ ] Delete the first-currency-amount fallback in `extractTravelRecoveryDetails`; use the existing "Amount needs checking" path. Gate the loveholidays/hotel-night draft sentences on their regexes actually matching. (`moneyParsers.ts:210`, `messageDrafts.ts`)
- [ ] Dedupe proof/missing-proof lists (Set on normalised strings). (`messageDrafts.ts`, `caseFactory.ts`)
- [ ] Show a visible banner when `saveAdminAvengerState` catches; store proof image **name only** (or downscale to a thumbnail) instead of full base64. (`storage.ts`, `OutcomeConfirmation.tsx`)
- [ ] Delete `api/analyze-admin.ts` + `aiGatewayService.ts` from the deploy (or add a key check + rate limit); rotate the OpenAI key either way.
- [ ] Make totals frequency-aware: keep monthly/annual separate like `potentialSaving` already does, or suffix "/month". (`impactLedger.ts` `calculateImpactTotals`)
- [ ] Rewrite the privacy line to exactly what is true and nothing more: "Text you paste is checked in this browser. Nothing is uploaded in this version." Keep it true. (`HomeView.tsx:972`)

Everything else — including every panel, parser, and view added in the last 48 hours that isn't on this list — is allowed to be imperfect for 10 people.
