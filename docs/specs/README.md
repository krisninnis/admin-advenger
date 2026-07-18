# AdminAvenger Specification Workflow

This folder keeps durable specifications for future AdminAvenger work. Specifications turn one-off chat prompts into reviewable project memory.

## Statuses

- Draft: the idea is being shaped. Production code should not be edited from a draft unless the task is a tiny isolated fix with an inline spec.
- Approved: the scope, constraints, and acceptance criteria are agreed. Substantial production work can start from here.
- Implementing: the Builder is making the approved change and keeping within scope.
- Verifying: the implementation is being tested against the acceptance criteria and validation commands.
- Completed: the work is merged or otherwise accepted, with evidence recorded.

## Roles

- Planner: writes or updates the specification, identifies scope and non-goals, and gets approval before production edits.
- Builder: implements only the approved specification, inspects existing code first, preserves unrelated behaviour, and updates tests.
- Verifier: checks the implementation against the spec, runs focused and full validation, and records remaining risks.

## How To Use

Put approved feature specs in `docs/specs/active/`. Move completed specs to `docs/specs/completed/` when the work is accepted.

Substantial features require an approved spec before production edits. Tiny isolated fixes may use a short inline specification in the task when creating a full file would be heavier than the change itself.

Use `docs/specs/templates/feature-spec.md` for new feature specs.
