# Strategic Next Step Planner v1

Status: implemented as a derivation/view layer.

## Why this exists

AdminAvenger helps users slow down confusing admin and decide the next careful
step. Many letters create pressure before the user understands the stage,
sender, evidence, dates, or risks. The Strategic Next Step Planner turns the
existing result into a calm "what should I check next?" layer.

This is not a new advice engine. It does not decide rights, entitlement,
liability, deadlines, or outcomes. It sits over existing `DecisionResult`,
`BenefitsActionPack`, opportunity cards, and case data.

## How strategy ideas become plain English

The internal model borrows from game-theory-inspired planning concepts:

- actors become "Who is involved"
- available moves become "Your safest move" and "Other safe options"
- missing information becomes "What to check first"
- irreversible or risky moves become "What not to rush"
- uncertainty and external expertise become "When to get advice" and "What
  AdminAvenger cannot know"

The user interface must not use strategy jargon. It should use plain language:

- Best next move
- Why this is safer
- What to check first
- What not to rush
- When to get advice

## Safety boundaries

The planner must not:

- give legal, benefits, debt, financial, medical, housing, employment, or
  immigration advice
- say the user will win
- say DWP, a council, a creditor, landlord, company, or sender is wrong
- tell a user to pay, not pay, ignore, submit, send, claim, appeal, or cancel
  automatically
- count mentioned money as saved or recovered
- imply AdminAvenger contacts anyone
- make high-stakes admin feel like a game

Required visible safety note:

> AdminAvenger helps you compare safe next steps. It does not decide for you,
> contact anyone, or give legal, benefits, debt, or financial advice.

## Supported case types

Version 1 supports:

- Universal Credit statement
- Universal Credit sanction
- Universal Credit deductions
- PIP decision, appeal, assessment report, evidence prep, and review
- WCA / LCWRA
- migration notice
- change of circumstances
- Council Tax Reduction / Support
- crisis support
- parking notices and legal-looking parking letters
- debt collection and bailiff/enforcement-looking letters
- consumer disputes
- unknown or unsupported admin documents

Unsupported or unclear cases fall back to a conservative plan:

- identify the sender
- check dates and references
- gather evidence
- do not send, pay, admit, click, or submit automatically
- get advice if the risk or deadline is unclear

## Strategy rules

A safe next move should usually:

- gather information
- preserve options
- avoid admissions
- avoid missing dates
- avoid automatic sending
- avoid overclaiming
- ask for clarification
- prepare evidence
- signpost to advice when serious

Examples:

- ask for a deduction breakdown
- compare with a previous statement
- check the decision date and reason
- list points, activities, examples, and evidence
- identify whether a debt-looking letter is an early notice, letter before
  claim, enforcement notice, or court claim
- prepare a draft only for the user to review and send themselves

## Forbidden language

Do not use these in the user interface:

- game theory
- opponent
- exploit
- beat DWP
- beat the council
- pressure them
- force them
- guaranteed
- you will win
- you qualify
- DWP is wrong
- this is unlawful
- you do not owe this
- valid claim
- invalid claim

## Technical fit

The implementation lives in:

- `src/lib/strategicNextStep.ts`
- `src/components/StrategicNextStepPanel.tsx`

It is pure and deterministic. It does not write to storage, alter the decision
engine, change the classifier, send messages, create drafts automatically, or
write to the money tracker.

The panel renders in `HomeView` after the main result and alongside the Benefits
Action Pack when relevant.

## Future improvements

Documented only, not implemented in v1:

- compare two or three possible next moves side by side
- user preference controls for urgency, stress, and evidence available
- adviser/export mode
- timeline-aware strategy
- reminders and checkpoints
- community or non-profit helper mode

Future versions must keep the same principle:

AI remembers. AI explains. Humans decide.
