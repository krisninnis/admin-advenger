# Ordinary Message Action & Consequence Integrity V1

Status: implementation authorised

## Purpose

Preserve explicit source actions and consequences in ordinary-message results, and prevent broad historical keyword matches from inventing an unrelated money/refund journey.

This milestone was triggered by supervised pre-pilot checks on live production.

## Observed failures

1. A moved appointment correctly preserved old/new dates and times but dropped:
   - "Please arrive 10 minutes early."
   - "You don't need to reply unless the new appointment time doesn't work for you."

2. An application-processing message saying the application "may be delayed" was incorrectly classified as a refund/money-recovery case, despite containing:
   - a request for the latest bank statement;
   - a deadline of 4 September 2026;
   - a stated consequence that processing may be delayed;
   - an explicit statement that this is not a decision.

## Contract

### Source actions

Material explicit source instructions must remain visible when they affect what the person needs to do.

For moved appointments this includes practical attendance instructions and conditional reply wording.

### Document requests

A source-grounded document request outranks broad generic keyword categories.

When a message asks for a named document and gives a deadline, AdminAvenger must preserve:

- the requested document;
- the stated deadline;
- the stated consequence;
- explicit status/negative statements from the source.

The result must not infer a refund, compensation, recovery or complaint unless separate source evidence supports that interpretation.

### Delay semantics

The words "delay", "delayed" or "delaying" alone are not refund evidence.

Dedicated train-delay, delivery and other established specialist flows retain their existing rules. This change removes only the historical generic refund inference from bare delay wording.

### Safety

No new advice, entitlement, eligibility, liability or outcome inference is introduced.

AdminAvenger continues to prepare and explain; the human decides what to do.

## Non-goals

- result-page redesign;
- shortening the whole result;
- changing date-role extraction;
- changing Care Fee, Benefits, Community Helper or Workplace Support;
- changing storage, sending, export or persistence;
- generic LLM generation.

## Expected files

- `src/lib/generalAdminExtraction.ts`
- `src/lib/mockAnalysis.ts`
- `src/lib/__tests__/ordinaryMessageActionConsequenceIntegrity.test.ts`
- `docs/specs/active/ordinary-message-action-consequence-integrity-v1.md`

## Validation

At minimum:

- new focused regressions;
- ordinary-message date-role regressions;
- refund lifecycle/state regressions;
- general-admin extraction regressions;
- public message adversarial/corpus regressions;
- full test suite;
- lint;
- production build;
- `git diff --check`;
- production-preview re-run of the two observed failing messages.

## Completion boundary

This milestone fixes the internal pre-pilot blocker. It does not itself authorise external pilot users. The manual pilot checklist must resume after the fix is merged and verified.
