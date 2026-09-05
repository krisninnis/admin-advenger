# Pilot Result Top Clarity v1

Status: implementation authorised

## Trigger

Direct-human Desktop Chrome pilot evidence on 5 September 2026 found P-DOCX HIGH / pilot-blocking on the Northbridge Broadband service-price-change fixture. DOCX intake and extraction passed, but the visible result did not clearly answer the mandatory pilot question: **Is anything urgent?**

P-PASTE already passed on production main `aa7ee81fefdbee475e60d5f75ea12e6999f3922b` after the HMRC integrity correction.

## Product principle

AI prepares. Humans decide.

The result must explain grounded timing evidence without inventing consequences, rights, urgency, or advice.

## Scope

1. Make the top result clearly answer the five pilot questions when grounded evidence exists:
   - What is this?
   - Is anything urgent?
   - What changed or matters?
   - What should I do next?
   - What should I have ready?
2. For a source-stated deadline, distinguish its relationship to the current date: upcoming, today, or passed.
3. Explain what the source says the deadline is for when that purpose is grounded.
4. Never infer that a passed date means lost rights, cancellation, disconnection, debt, penalty, or mandatory urgent action unless the source supports that consequence.
5. Ensure best-next-move guidance does not tell the user to rediscover sender/date/reference/deadline facts already extracted by AdminAvenger.
6. Preserve all existing source-grounding, money, privacy, preparation-only, and no-automatic-action contracts.

## Primary regression fixture

`audit-fixtures/journey-3-service-notice.docx`

Grounded facts include:
- Northbridge Broadband
- Service price change notice
- Notice date: 15 July 2026
- Account reference: NB-73104
- Monthly price: £29.00 → £32.50
- Effective date: 1 August 2026
- Source-stated contact date: 29 July 2026
- Source says the service has not been cancelled or disconnected

For a run on 5 September 2026, the result must make clear that 29 July 2026 has passed while preserving the source-limited meaning of that date. It must not claim that missing the date caused cancellation, disconnection, loss of rights, a penalty, or another consequence not stated by the source.

## Required regression coverage

- Full-App P-DOCX journey using the production fixture.
- Result-view-model coverage for source-stated deadlines before, on, and after the current date.
- Fail-closed coverage where a date exists but its purpose/consequence is unclear.
- Existing HMRC P-PASTE regression remains green: tax-year period boundaries must not become deadlines or urgency signals.
- No retained-state contamination between journeys.
- Existing safety wording and no-contact/no-send tests remain green.

## Acceptance

P-DOCX is not accepted by automated tests alone. After implementation, review, merge, and green production deployment, owner-01 must rerun the Northbridge DOCX manually in Desktop Chrome. P-PDF remains gated until that direct-human rerun passes.

## Non-goals

- No DOCX parser rewrite.
- No OCR/scanner work.
- No Scanner V2 work.
- No broad ordinary-message date-role redesign beyond what this regression requires.
- No telecom-rights legal determination.
- No automatic contacting, cancelling, switching, paying, submitting, or sending.
- No claim that the historical HMRC urgency divergence has now been root-caused.
