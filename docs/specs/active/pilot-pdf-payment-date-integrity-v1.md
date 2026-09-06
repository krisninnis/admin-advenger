# Pilot PDF Payment Date Integrity v1

Status: implementation authorised

Base: `main` at `48af92324ddefc14cb5668c9a948f33c2a457717`

Branch: `codex/pilot-pdf-payment-date-integrity-v1`

## Why this corrective slice exists

Direct-human Desktop Chrome pilot acceptance for `audit-fixtures/journey-2-payment-reminder.pdf` failed HIGH / pilot-blocking on 5 September 2026.

The PDF was read locally and the source facts were extracted strongly, but the result created two material timing defects:

1. `10 July 2026` and `24 July 2026` were both presented as `Payment due date`, even though the source says payment was due on 10 July and separately says to pay or contact the provider by 24 July.
2. The best-next-move instructed the user to contact the provider before 24 July 2026 even though that date had already passed.

The source fixture states:

- letter date: 14 July 2026
- account reference: GW-48291
- unpaid balance stated by source: £84.60
- payment due date: 10 July 2026
- pay-or-contact response date: 24 July 2026
- if already paid, provide proof of payment
- no late fee has been added
- the letter does not say water supply will be disconnected

## Scope

This workstream is deliberately narrow.

It must:

1. Preserve `10 July 2026` as the payment due date.
2. Preserve `24 July 2026` as a distinct source-stated response / pay-or-contact deadline.
3. Prevent payment-reminder next-step wording from instructing the user to act before a date that has already passed.
4. Explain passed payment-reminder dates without inferring what missing them means.
5. Preserve uncertainty about whether the balance remains outstanding, valid, or owed now.
6. Keep the source statement about no late fee and no stated disconnection from being contradicted by invented consequences.
7. Add regression coverage for the real `journey-2-payment-reminder.pdf` path.
8. Prove the previously accepted HMRC P-PASTE and Northbridge P-DOCX paths remain green.

It must not:

- rewrite PDF parsing or local-file intake;
- introduce a generic `past date = urgent` rule;
- broaden into the full ordinary-message date-role redesign;
- infer debt validity, late fees, penalties, lost rights, cancellation, disconnection, or mandatory immediate payment;
- contact, send, submit, pay, dispute, or otherwise act for the user.

## Required source semantics

For the pilot fixture:

- `14 July 2026` = document / letter date
- `10 July 2026` = payment due date
- `24 July 2026` = source-stated pay-or-contact response deadline

These meanings must remain distinguishable in the case timing facts and visible result.

## Present-day action semantics

When a source-stated payment or response date has passed, AdminAvenger may state that relationship to today, but must not convert it into an invented consequence or a stale future instruction.

For the pilot fixture on 5 September 2026, the safe next-step meaning is substantively:

> The source-stated payment date and later pay-or-contact date have both passed. Check whether this has already been resolved and verify the current account status before deciding what to do.

The result must not say `contact before 24 July 2026` on or after 25 July 2026.

## Regression-first acceptance criteria

Automated coverage must prove at minimum:

- payment-reminder assessment extracts payment due date and response deadline separately;
- downstream timing facts retain distinct meanings for the two dates;
- result labels do not present the response deadline as another payment due date;
- current-date-aware next-step wording does not issue an already-expired instruction;
- passed-date wording does not infer debt validity, penalty, disconnection, lost rights, or a mandatory action;
- security precedence remains unchanged;
- HMRC tax-year period boundaries remain non-urgent;
- Northbridge conditional deadline purpose remains preserved;
- real selectable-text PDF browser regression covers `audit-fixtures/journey-2-payment-reminder.pdf` with the clock fixed to 5 September 2026.

## Pilot gate

P-PDF remains `FAIL — HIGH / pilot-blocking` until this corrective slice is merged, deployed, and owner-01 reruns the exact production PDF journey on Desktop Chrome.

Only a direct-human production PASS reopens the gate for the next primary route.
