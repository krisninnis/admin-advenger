# Result Page v2

## Why Result Page v2 exists

AdminAvenger now has several strong preparation layers: the decision engine, Benefits Action Pack, Strategic Next Step planner, ResultViewModel, and Adviser Export Pack.

Before Result Page v2, the Home result could feel like several engines stacked on top of each other. That was functionally useful, but too repetitive for a stressed user.

Result Page v2 turns those outputs into one calm, adviser-ready case sheet.

## Problem with stacked engine panels

Stacked panels can repeat:

- dates
- money amounts
- evidence items
- risks
- questions
- uncertainty
- what AdminAvenger cannot know

This makes the page feel longer and more technical than it needs to be. It can also make a vulnerable user feel less confident because the same warning appears in several formats.

## Composed case sheet model

The primary result surface is a composed case sheet.

It should feel like:

- one answer
- one suggested next move
- one set of things to check
- one evidence/checklist area
- one adviser export action

It should not feel like:

- engine output
- action pack output
- next-step planner output
- adviser pack output

all stacked separately.

## Section order

The v2 result page uses this order:

1. What AdminAvenger found
2. Best next move
3. What to check first
4. Dates to check
5. Money mentioned
6. Evidence / documents to bring
7. Questions to answer
8. What AdminAvenger cannot know
9. Uncertainty / double-check
10. Draft/checklist
11. Adviser export action
12. Supporting detail, collapsed by default

## ResultViewModel as source of truth

`ResultViewModel` is the main source of truth for the composed result page.

It provides:

- title
- summary
- status label
- best next move
- dates
- money mentioned
- evidence found
- evidence to gather
- questions
- risks
- uncertainty
- cannotKnow
- safety notes
- draft/checklist

The page should not re-run classification or invent new facts.

## Safety requirements

Always keep visible:

- preparation-only boundary
- nothing has been sent
- nothing has been submitted
- AdminAvenger does not contact anyone for the user
- AdminAvenger helps prepare; the user stays in control
- what AdminAvenger cannot know

Avoid wording that implies:

- legal, benefits, debt, financial, medical, housing, employment, or immigration advice
- entitlement
- outcome prediction
- automated action
- automatic money counting
- a certain deadline unless the original document clearly says it

## Date and money wording rules

Dates:

- must say to check against the original letter
- should stay cautious if OCR or source text may be wrong
- are reminders to verify, not confirmed deadlines from AdminAvenger

Money:

- must be display-only
- must say AdminAvenger has not checked whether the amount is correct or owed
- must say the amount is not counted as a saving or recovery
- must not inflate money tracker values

## Adviser export placement

The adviser export action stays near the result, inside the case sheet.

Required copy:

Creates a Markdown file you can save, print, or share with someone you trust. AdminAvenger does not send it anywhere.

The export remains local Markdown. It is not PDF, email, cloud sharing, or an automatic submission.

## Progressive disclosure rules

Default visible output should be calm and not huge.

Suggested limits:

- dates: 3 visible, then show more
- money: 3 visible, then show more
- evidence: 5 visible, then show more
- questions: 5 visible, then show more
- risks/uncertainty: 4 visible, then show more
- cannotKnow: at least 2 visible if present

Do not hide:

- no-contact/no-submit boundary
- cannotKnow
- important date-check warning
- money display-only warning

## What not to change

Result Page v2 must not change:

- decision engine behavior
- OCR or photo behavior
- routing or classification logic
- money counting
- adviser export data model
- safety wording rules
- local-first privacy posture

Benefits Action Pack and Strategic Next Step logic remain available. Their panels can be shown as supporting detail, but not as the loud primary result stack.

## Future improvements

- adviser-reviewed layout
- print stylesheet
- mobile usability testing
- redaction preview
- plain-English readability score
- screenshot regression tests
