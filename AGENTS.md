# AdminAvenger Agent Guide

AdminAvenger is a local-first, privacy-first admin decision assistant. AI prepares, explains, organises, and drafts; humans decide what to trust, save, send, ignore, or do next.

## Working Rules

- Keep the product local-first and privacy-first. Do not add cloud processing, telemetry, upload paths, or data sharing unless an approved specification explicitly requires it.
- Never take silent user action. Do not send messages, submit claims, contact organisations, save outcomes, or count money without explicit user confirmation.
- Preserve existing behaviour unless the approved specification changes it.
- Inspect the relevant files, tests, and existing patterns before editing.
- Use approved specifications in `docs/specs/active/` as the source of truth for substantial feature work.
- Do not implement out-of-scope ideas, even if they seem useful.
- Tiny isolated fixes may use a short inline specification in the task, but substantial production edits need an approved spec first.
- Prefer behavioural tests over source-string tests. Use source-contract tests only when behaviour cannot be exercised directly.
- Run focused tests for the changed area, then complete validation before reporting done.
- Ask before adding production dependencies. Test-only dependencies must stay in development dependencies.
- Never commit secrets, local paths, generated benchmark data, personal information, or private user content.
- Never commit, push, merge, reset, restore, stash, deploy, delete work, or modify unrelated files unless the task explicitly permits it.

## Safety Posture

- Use plain English and keep the human in control.
- Do not present AdminAvenger as legal, financial, benefits, debt, housing, employment, medical, government, charity, or regulated professional advice.
- For high-stakes content, preserve source wording, show uncertainty, explain what AdminAvenger cannot know, and point to suitable specialist help when serious.
- Never count demanded money, deductions, benefit amounts, entitlement, or disputed amounts as saved or recovered.

## Reporting

Every completion report should include:

- files changed;
- validation run and results;
- remaining risks or manual checks;
- any behaviour intentionally left unchanged.
