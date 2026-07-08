# Safety Wording Regression Suite v1

Status: implemented as a test architecture layer.

## Why This Exists

AdminAvenger handles stressful letters and messages where overconfident wording
can cause real harm. Safety copy appears in decision engines, result composers,
action packs, next-step planners, and UI panels. As the product grows, dangerous
phrasing could creep into one surface while the rest remains careful.

The safety wording regression suite creates a central tripwire. It scans
generated user-facing output for claims that AdminAvenger must not make.

This suite does not make AdminAvenger safe by itself. It is a guardrail that
helps future changes fail loudly when wording drifts toward advice, guarantees,
automation, adversarial framing, or automatic money claims.

## Forbidden Wording Groups

The central source is:

`src/lib/safetyWording.ts`

It groups forbidden phrases into:

- `FORBIDDEN_OUTCOME_CLAIMS`
- `FORBIDDEN_ADVICE_CLAIMS`
- `FORBIDDEN_ADVERSARIAL_LANGUAGE`
- `FORBIDDEN_MONEY_CLAIMS`
- `FORBIDDEN_AUTOMATION_CLAIMS`

Examples include:

- “you will win”
- “you qualify”
- “you are entitled”
- “DWP is wrong”
- “this is unlawful”
- “you do not owe this”
- “game theory”
- “opponent”
- “exploit”
- “money saved”
- “we contacted”
- “submitted automatically”
- “you should appeal”
- “do not pay”

These phrases should not appear as AdminAvenger-generated user-facing claims.

## Required Safety Themes

The suite also checks for positive safety themes where relevant:

- AdminAvenger does not contact anyone for the user
- the human decides
- money is display-only / not counted unless manually confirmed
- dates must be checked against the original document
- what AdminAvenger cannot know remains visible
- uncertainty remains visible when present
- users are pointed toward advice when stakes are serious or unclear

Positive safety themes matter because removing dangerous wording is not enough.
The result must still explain the boundary clearly.

## What Gets Scanned

The regression tests scan generated outputs from:

- `DecisionResult`
- `BenefitsActionPack`
- `StrategicNextStepPlan`
- `ResultViewModel`

Representative fixtures currently cover:

- Universal Credit statement
- Universal Credit sanction
- PIP decision/refusal
- PIP evidence/claim-form preparation
- Universal Credit deductions
- Council Tax Reduction
- crisis support
- debt collection
- parking/legal-looking debt
- consumer dispute
- scam-like suspicious message fallback
- unknown fallback

The suite intentionally focuses on app-generated output. Source-letter quotes
can contain words such as “not entitled” because the sender wrote them. Those
source quotes should not be treated as AdminAvenger making that claim.

## How To Add A New Fixture

Add a new entry to `fixtures` in:

`src/lib/__tests__/safetyWordingRegression.test.ts`

Include:

- a plain name
- representative pasted text
- the expected `DecisionDocumentType`

Prefer small realistic letters that exercise the actual classifier and builder
pipeline. Do not add private real-user data.

## How To Add A Forbidden Phrase

Add the phrase to the closest group in:

`src/lib/safetyWording.ts`

Then run:

```bash
npm run test -- src/lib/__tests__/safetyWordingRegression.test.ts
npm run test
```

If the new phrase fails existing output, inspect the excerpt. If AdminAvenger is
making the claim, fix the wording. If the phrase appears only as source-letter
text, adjust the collector so it scans generated output rather than user-provided
quotes.

## How To Handle False Positives

False positives should be handled narrowly:

- Prefer rewriting generated copy to avoid the phrase.
- Do not weaken the whole phrase list.
- Do not add broad allowlists for high-risk language.
- If a phrase appears only in source text, exclude that source-text path from
  the generated-output scan.
- If a phrase appears in tests/docs/forbidden lists, do not scan those files as
  user-facing output.

Negated unsafe phrases can still be confusing. For example, “not money saved”
still contains the phrase “money saved”. Prefer clearer wording such as
“not a saving or recovery”.

## What This Suite Does Not Prove

The suite does not prove:

- the legal, benefits, debt, or housing accuracy of any content
- that every future user-facing path is scanned
- that OCR extracted facts are correct
- that users understand the caveats
- that a specialist adviser would approve the output
- that no future phrasing could be harmful in context

It is a regression guard, not an advice review.

## Future Improvements

- Add rendered DOM scans for the main result page once Result Page v2 renders
  directly from `ResultViewModel`.
- Add fixtures for housing, employment, bailiffs, HMRC, and immigration hard-stop
  paths as those engines mature.
- Add a golden corpus with expected classifications and safety assertions.
- Add per-engine required safety themes.
- Add a source/provenance distinction so quoted sender wording can be displayed
  safely without being mistaken for AdminAvenger advice.

The standing principle remains:

AI remembers. AI explains. Humans decide.
