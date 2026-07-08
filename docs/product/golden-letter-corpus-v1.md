# Golden Letter Corpus v1

## Why the corpus exists

AdminAvenger now has several hidden decision engines, Benefits Action Pack output, Strategic Next Step planning, ResultViewModel composition, OCR intake, and safety wording checks.

The Golden Letter Corpus gives the project a reusable set of synthetic prop letters that prove the core analysis and output layers still behave safely across common document types.

It is test and data-quality infrastructure. It is not a user-facing feature, analytics system, or new decision engine.

## Covered fixture types

The first corpus covers:

- Universal Credit statement with payment date, assessment period, deductions, and total payment
- Universal Credit sanction decision
- Universal Credit deductions and overpayment notice
- PIP refusal decision
- PIP evidence request / claim form support
- Work Capability Assessment / LCWRA letter
- Universal Credit migration notice
- Council Tax Reduction / Council Tax Support decision
- benefits change of circumstances
- crisis support / hardship support
- debt collection letter
- parking charge / legal-looking parking debt
- letter before claim / court-looking debt stage
- consumer dispute / refund refusal
- scam-like suspicious message
- unknown official-looking fallback
- bad OCR style partial text
- partial screenshot style benefits text
- letter with multiple dates and amounts
- instruction-like hostile source text

## Synthetic-data rules

Every fixture must be a synthetic prop letter.

Use:

- fake names such as Alex Example or Jordan Sample
- fake addresses such as 1 Example Street, EX1 1EX
- fake references such as REF-EXAMPLE-001
- invented wording that feels realistic but is not copied from a real letter
- dates and amounts that are useful for deterministic tests

Avoid:

- real user letters
- real OCR outputs from user documents
- real photos or screenshots
- real NI numbers
- real addresses
- real claim numbers
- real parking references
- real phone numbers
- copied government, council, creditor, charity, or provider wording

## Never commit real letters

Real user letters, photos, OCR outputs, benefit letters, debt letters, parking claims, or legal documents must never be committed to the corpus. Use prop/synthetic letters only.

Manual OCR fixtures, if used locally, must remain ignored by git and must not be imported by automated tests.

## How to add a fixture

Add a new `GoldenLetterFixture` in:

`src/lib/goldenLetters.ts`

Include:

- stable `id`
- plain `title`
- `category`
- synthetic `inputText`
- `expectedDocumentType`
- expected key terms
- expected dates
- expected money mentions
- expected safety themes
- expected cannot-know themes
- forbidden phrases that must be absent from generated output
- a short note explaining the fixture

Then run:

```bash
npm run test -- src/lib/__tests__/goldenLetterCorpus.test.ts
npm run test
npm run lint
npm run build
```

## What the corpus checks

The corpus runner sends each fixture through:

1. decision engine classification and analysis
2. Benefits Action Pack when relevant
3. Strategic Next Step planning
4. ResultViewModel composition
5. safety wording checks

The tests check:

- unique fixture IDs
- synthetic-data hygiene
- required categories and document types
- expected routing
- expected dates, money, and key terms
- display-only money handling
- user-check-required dates
- cannotKnow and uncertainty
- no-contact / human-control safety themes
- absence of forbidden generated wording

## Relationship to safety wording

The corpus complements `src/lib/safetyWording.ts`.

Safety wording tests prove generated output does not drift into advice, promises, adversarial language, automation claims, or automatic money claims.

The corpus adds breadth: more letters, more routing, more dates, more money mentions, and more confusing high-stakes examples.

## How it unlocks future engine work

Before adding new engines or changing classification, the corpus can show whether:

- benefits letters still route correctly
- debt and parking do not accidentally route as benefits
- suspicious messages remain conservative
- unknown and bad OCR inputs degrade safely
- dates remain check-required
- money remains display-only unless a separate user-confirmed outcome exists

Future engine work should add corpus fixtures before changing broad routing rules.

## Future improvements

- OCR image fixtures using synthetic generated documents only
- DOM rendered-output snapshots
- per-engine confusion matrix
- adviser-reviewed prop fixtures
- low-literacy/plain-English score
- source-provenance checks for every extracted date and amount
- synthetic hostile-input suite for instruction-like letters
