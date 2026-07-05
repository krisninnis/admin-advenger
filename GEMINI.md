# AdminAvenger Agent Instructions

## Project identity

AdminAvenger is a local-first, privacy-first admin decision assistant.

The product has one front door:

Check a message

Users paste text, upload a file, take a photo, or upload a screenshot. The app classifies and routes the input behind the scenes.

Never add a separate user-facing checker, selector, category picker, or benefits page.

## Core rules

- Local-first
- Privacy-first
- One input
- Hidden decision engines
- Plain English
- Human always decides
- No cloud AI by default
- No automatic actions
- No automatic emails
- No automatic claims
- No hidden money counting

## Existing architecture

Decision-engine work should follow:

Input
→ Classifier
→ Decision Engine
→ Evidence Builder
→ Questions
→ Draft Message
→ Opportunity Card
→ AdminFinding
→ AdminCase
→ Existing save flow

## DecisionResult standard

Every decision-engine module must return the full shared DecisionResult shape, including:

- documentType
- title
- plainEnglishSummary
- caseStrength
- strengthLabel
- whatThisLooksLike
- possibleGrounds
- confidence
- uncertainty
- cannotKnow
- evidenceNeeded
- deadlines
- risks
- nextSteps
- safetyNotes
- draftMessage when useful
- amountMentioned when found
- amountTreatment
- sourceFacts
- questionsToAnswer when useful

confidence must be structured:

confidence: {
  level: "low" | "medium" | "high";
  reason: string;
}

Keep these separate:

- caseStrength = how strong the user's position appears
- confidence = how sure AdminAvenger is about the document read/classification
- uncertainty = missing facts or things that could change the result
- cannotKnow = things the app must not pretend to know from the document alone

## Money safety

Never count demanded money, deductions, benefit amounts, possible entitlement, or disputed amounts as saved or recovered.

Use:

- amount mentioned only
- amount being demanded
- no money counted

Only user-confirmed official outcomes may later be recorded as saved/recovered.

## Safety wording

Never say:

- you will win
- guaranteed
- definitely unlawful
- ignore this
- you do not owe this
- you definitely qualify
- DWP is definitely wrong
- you should score

Prefer:

- may
- appears
- check
- possible
- from what is shown
- evidence would matter
- get advice if serious

## Benefits and high-stakes work

Benefits, debt, bailiffs, housing, employment, health, HMRC, and legal-dispute modules need extra caution.

They must explain:

- what this appears to be
- why it matters
- evidence to gather
- deadlines
- next steps
- draft wording if appropriate
- confidence
- uncertainty
- what AdminAvenger cannot know

Do not give legal, financial, medical, or regulated benefits advice.

## Graceful degradation

Every Decision Engine must degrade gracefully.

Partial, blurry, cropped, incomplete, or low-quality OCR inputs should still return the best safe DecisionResult possible, with confidence, uncertainty, and cannotKnow.

## Files to inspect before decision-engine work

- src/lib/decisionEngine/
- src/lib/decisionEngine/modules/
- mockAnalysis.ts
- opportunityCards.ts
- caseFactory.ts
- messageDrafts.ts
- guidedCaseMode.ts
- impactLedger.ts
- existing tests

## Commands

Run these before reporting completion:

npm run build
npm run lint
npm run test

## Final report required

Always report:

- files changed
- categories/stages supported
- how it integrates behind Check a message
- money safety behaviour
- confidence/uncertainty/cannotKnow behaviour
- graceful-degradation behaviour demonstrated
- tests added
- build/lint/test result
- manual examples checked
