# AdminAvenger Public MVP Scope Gating v1

Status: Implementing

## Decision

The public AdminAvenger MVP presents one calm front door: Check a message.

Public users can paste text, take or upload a photo, upload a file, use examples,
and open advanced options within that single document-checking journey. AdminAvenger
prepares plain-English notes; humans decide what to do.

## Public Scope

The public journey focuses on general admin documents and low-risk preparation,
including ordinary bills, emails, receipts, subscriptions, delivery issues,
refund records, travel evidence, and broadband or mobile price-rise checks.

Broadband and mobile price-rise checks remain in the normal public flow. They
must stay cautious: provider wording, contract dates, money, and rights need
checking before any action.

## Preserved But Hidden

These capabilities remain in the repository but are not promoted from Home,
normal navigation, Settings, photo intake, file intake, or automatic routing:

- Universal Credit, PIP, WCA/LCWRA, and benefits engines
- council-tax support and reduction engines
- debt, enforcement, and bailiff engines
- homelessness, eviction, crisis, and safeguarding preparation
- Workplace Support beta
- Community Helper beta
- Career Match and CV beta
- adviser exports, validation dashboards, demos, and internal tools

This is a gating decision, not a deletion decision.

## High-Risk Boundary

If normal public intake appears to involve benefits, debt, enforcement, housing,
crisis, safeguarding, workplace, career, adviser, or internal-testing topics,
AdminAvenger must not silently open a specialist workflow.

The public response is preparation-only:

- keep the original wording
- preserve any directly visible date
- count no money as saved or recovered
- do not decide entitlement, rights, debt, employment, housing, safety, or legal
  outcome
- do not provide helpline numbers in this slice
- do not send, submit, contact, or act automatically

## Controlled Access Rule

Controlled beta routes require an explicit public build flag:

`VITE_ENABLE_CONTROLLED_BETAS=true`

The flag is public and non-secret. It must be absent or false in normal
production. Normal public navigation must not link to controlled beta or
development-only routes. Development-only screens remain local-development
surfaces.

## Review Trigger

Reconsider the gate only after real-user testing and, for high-stakes areas,
appropriate professional or adviser review. New public scope must be approved
in a specification before production edits.
