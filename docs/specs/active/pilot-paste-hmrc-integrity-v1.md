# Pilot Paste HMRC Integrity v1

Status: **APPROVED FOR IMPLEMENTATION**

Approved by the project owner on 4 September 2026 for implementation from
`afbed233a580255d761a0240c4b6ed14ba6e89c5` on
`codex/pilot-paste-hmrc-integrity-v1`.

## 1. Purpose

Resolve the directly observed Desktop Chrome `P-PASTE` pilot failure without
redesigning the result UI or broadening into other input routes. The accepted
human evidence remains authoritative even though a clean replay did not
reproduce the unsupported urgency result.

The approved fixture is the existing synthetic HMRC Tax Code Notice with:

- optional question `What is this?`;
- previous tax code `C1263L`;
- replacement tax code `C1254L`; and
- tax year `6 April 2026 to 5 April 2027`.

The production result observed at the approved base incorrectly showed
`Urgent message to check`, said the sender used urgent wording, omitted the
HMRC identification and tax-code change, and said no clear date was found.

## 2. Required outcomes

The exact fixture must pass through the complete application intake and
analysis path and visibly:

1. identify an HMRC tax-code notice;
2. answer `What is this?` directly and usefully;
3. preserve and show the change from `C1263L` to `C1254L`;
4. show the supplied tax-year period as contextual timing;
5. never turn either tax-year boundary into a deadline, action date or urgency;
6. never claim unsupported urgency; and
7. retain the preparation-only and nothing-sent boundary.

The browser regression must cover clean state and realistic retained local
state. It must use `App`, not a HomeView-only callback harness.

## 3. Urgency provenance contract

Communication importance, urgency, reply and action findings remain separate.
Every communication finding must retain the exact source-supported signal used
to create it. An urgency finding requires an unnegated `urgency` signal whose
quote is present in the immutable accepted source. Missing, mismatched or
wrong-kind evidence fails closed and cannot produce urgency.

The specialist HMRC classification continues to run on the accepted source and
continues to take precedence over the generic communication fallback. No HMRC
keyword exception may be added merely to make the fixture pass.

The existing legitimate `urgent` and `final notice` patterns remain supported
when they are present in the source. Tests must prove both positive and
negative cases, including a mutation that adds literal `urgent` to otherwise
ordinary source text.

## 4. Tax-year timing contract

The shared timing extractor remains the authority. Its existing typed facts:

```text
6 April 2026 -> period_boundary / period / start
5 April 2027 -> period_boundary / period / end
```

must flow through `AdminCase.timingFacts` into the Result View Model with
source quotes and roles intact. The HMRC blanket suppression must be removed or
narrowed; no parallel HMRC-only date string parser is permitted.

The result must label the two boundaries as period context. They are not
deadlines and cannot create urgency. When period boundaries are the only timing,
`Key date checked` must use the existing contextual `not_needed` state rather
than `complete` or `missing`.

## 5. Test-first sequence

1. Add the exact full-application Playwright regression for clean and retained
   browser state.
2. Update/add focused tests for paired HMRC period presentation and
   `not_needed` progress.
3. Add communication-provenance tests that initially fail when a finding lacks
   valid source evidence.
4. Implement the smallest production changes that satisfy those tests.
5. Run focused tests, the full suite, lint, production build,
   `git diff --check`, and relevant Playwright tests.

Tests must assert behaviour and source-supported semantics rather than
incidental long-form wording.

## 6. Preserved boundaries

This slice must not:

- redesign the general Result top or remove its existing sections;
- change DOCX, PDF, image, OCR, camera, save, export or clear-data behaviour;
- add dependencies, cloud processing, telemetry or uploads;
- contact, send, submit, pay, schedule or save anything automatically;
- change tax advice or money-counting boundaries;
- touch `docs/research/`, `opencode.jsonc`, environment files, secrets or
  private evaluation corpora; or
- merge or deploy the work.

## 7. Completion boundary

Completion requires a clean, focused diff; deterministic full-App browser
coverage; corrected contextual tax-year presentation; attributable urgency
evidence with a fail-closed guard; all required verification green; and a draft
pull request for human review.

The production urgency divergence remains documented as unresolved if it still
cannot be reproduced. After merge and an automatic SHA-attributed deployment,
the owner must rerun `P-PASTE`. DOCX/PDF acceptance remains paused until that
direct run passes.
