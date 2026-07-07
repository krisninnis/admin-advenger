# AdminAvenger Agent Instructions

## Project identity

AdminAvenger is a local-first, privacy-first admin decision assistant.

AdminAvenger has a social mission: reduce the burden of confusing life admin for ordinary people without replacing human judgement, advice services, regulated professionals, or public bodies. Before product or engine work that touches user trust, high-stakes letters, benefits, debt, housing, employment, scams, or consumer harm, read `docs/product/adminavenger-social-mission-v1.md`.

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
- No exploitation of vulnerable users
- No shame, blame, pressure, or fear-based copy
- No replacement for legal, financial, debt, benefits, medical, housing, or employment advice

## Social mission guardrails

AdminAvenger should help people understand and organise confusing admin. It should not pretend to be an authority, advocate, solicitor, benefits adviser, debt adviser, doctor, employer, landlord, bank, court, government department, ombudsman, or charity.

The product should make users feel more capable, not more dependent. Prefer workflows that:

- explain what the document appears to be
- preserve evidence and source wording
- show what is missing or uncertain
- prepare editable drafts and checklists
- encourage careful review before action
- point to specialist advice when stakes are serious

Avoid workflows or copy that:

- imply AdminAvenger can decide rights or entitlement
- guarantee outcomes or deadlines
- encourage unsafe replies, clicks, payments, or non-payment
- inflate savings, recovery, or value
- hide uncertainty in Simple Mode
- turn high-stakes problems into gamified wins

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
