# AdminAvenger Roadmap

## Product Direction

AdminAvenger is a human-in-the-loop AI life-admin advocate. It turns messy admin emails, messages, bills, receipts, letters, and notes into clear cases with evidence, missing information, next actions, drafts, chase steps, and outcomes.

The goal is resolution, not engagement. AdminAvenger should help people understand what matters, recover money where possible, close loops, and leave with more confidence than they arrived with.

Core principle:

**AI remembers. AI explains. Humans decide.**

Operating protocol:

**AI extracts facts. Code assesses. Human decides.**

Current product direction:

- Public wedge: **Money Back Avenger**
- Completed proof vertical: **UK Train Delay / Delay Repay**
- Next validation vertical: **Broadband/Mobile Price-Rise Letters**

Train Delay remains valuable as a completed proof vertical and demo, but it is not currently the main launch wedge. Verticals are earned from observed user behaviour, not declared from architecture. The product can support multiple demos, but the launch wedge must be one focused workflow.

## Current Completed Foundation

Complete:

- React + TypeScript + Vite
- Tailwind CSS
- View-based app structure
- localStorage persistence
- Admin Cases
- Findings
- Evidence Locker
- Battle Log
- Draft Panel
- Chase Engine
- Evidence Pack export
- Demo Scenarios
- Data controls
- AI-ready service boundaries
- Refund Avenger / Delay Repay proof vertical
- Validation and feedback tools
- Project docs, manifesto, research notes, and covenant

Not added yet:

- Backend
- Authentication
- Routing
- Database
- Real AI calls
- External APIs
- File uploads

## Completed Proof Vertical: Refund Avenger / Train Delay

The UK Train Delay / Delay Repay workflow proved that AdminAvenger can support a complete vertical without pretending certainty.

It proved:

- Train-delay assessment
- Evidence found
- Evidence missing
- Unknown information
- Honest confidence
- Case creation
- Draft generation
- Chase date
- Evidence Pack export

Guardrail:

Train Delay is not currently the main launch wedge. It remains a useful proof vertical and demo because it shows the full loop: paste messy text, extract facts, show evidence, explain uncertainty, prepare a draft, set a chase date, and export the case.

## Current Phase: Money Back Avenger Validation

This is the current priority.

The immediate goal is to validate which everyday money-back admin problem users actually care about before building broader features.

Current tasks:

- Validate which everyday money-back admin problem users actually care about.
- Focus on mobile and paste behaviour.
- Test with real users.
- Record confusion and hesitation.
- Measure whether users would act on the assessment.
- Measure whether users would use the flow on mobile.
- Avoid adding broad features until evidence supports them.

Do not build multiple verticals at once. Do not build a generic assessment engine.

## Next Validation Vertical: Broadband/Mobile Price-Rise Letters

Broadband/mobile price-rise letters are the next validation priority.

Why this is promising:

- Users receive these as emails, messages, bills, and letters.
- They are paste-friendly and screenshot-friendly.
- They involve real money.
- They require explanation, not just lookup.
- They are a strong showcase of AI reading, fact extraction, and evidence organisation.
- Recent UK telecom price-rise rules can be confusing for everyday users.

Planned workflow features:

- Detect provider if present.
- Extract old price.
- Extract new price.
- Extract increase amount.
- Estimate annual impact.
- Extract effective date.
- Extract contract clues.
- Detect wording about price-rise terms.
- Show evidence found.
- Show missing evidence.
- Show unknowns.
- Generate a safe next action.
- Draft a negotiation or check-rights message.
- Never make legal or financial claims beyond what the evidence supports.

This should stay specific to broadband/mobile price-rise letters until real-user validation proves the shape is useful.

## AI Protocol

**AI extracts facts. Code assesses. Human decides.**

Rules:

- No API keys in frontend code.
- Real AI calls must go through a backend AI gateway.
- Use structured JSON outputs only.
- Every extracted fact should include source text or an evidence quote where possible.
- AI should not decide entitlement.
- Deterministic app code should apply rules and confidence logic.
- Drafts must only use verified facts.
- High-stakes actions require deliberate human confirmation.

The AI should prepare, explain, and organise. The human keeps judgement, consent, and final authority.

## AI Implementation Roadmap

Recommended order:

1. Keep current mock/local extraction working.
2. Harden deterministic checks with golden-case tests before adding any hosted AI.
3. Consider a backend extraction gateway only after validation, auth, abuse controls, and privacy copy are ready.
4. Keep deterministic assessment code in the app/backend.
5. Add AI draft generation only after extraction is reliable.
6. Add provider flexibility later if needed.

Recommended first hosted path:

- A narrow structured extraction gateway that only reads and organises facts. It must not assess rights, claim entitlement, draft unsafe action, or act for the user.

Possible later providers:

- Gemini later for screenshots/photos.
- Claude later as an optional high-quality drafting/reasoning provider.
- Local AI remains a developer/privacy experiment.

Do not use autonomous agent frameworks as the core runtime yet.

## Mobile-First Input Roadmap

Prioritise:

1. Paste text.
2. Paste email/message.
3. Screenshot/photo later.
4. Upload files later.

User-facing concept:

**What do you need help with?**

Not:

**Add admin item.**

The product should meet the everyday behaviour: someone has a worrying email, letter, message, bill, or screenshot and wants to know what it means and what they can do next.

## Future Verticals

Future vertical order:

1. Subscriptions / unwanted renewals
2. Missing delivery / faulty goods / returns
3. Warranty claims
4. Energy/water billing later
5. Benefits/financial complaints much later due to sensitivity and risk

Guardrail:

Do not build these until the current validation vertical has been tested with real users.

## Backend and Accounts

Backend and accounts come later.

Only add them after:

- The local product is useful.
- The wedge is validated.
- The privacy model is clear.
- The AI gateway pattern is proven.

Future backend/account features may include:

- User accounts
- Database persistence
- Secure document storage
- Account export/delete
- Explicit deletion controls
- Transparent data handling

## Integrations

Integrations stay later.

Possible integrations:

- Gmail
- Outlook
- Calendar
- Cloud storage
- CSV imports

Guardrail:

Integrations must not reduce trust or user control. The user must understand what is connected, what is read, what is stored, and what actions are being prepared.

## Product Health Metrics

Primary validation metric:

**Did this help someone understand, act, or recover money?**

Good metrics:

- Cases resolved
- Money recovered
- Money saved
- Admin loops closed
- Deadlines not missed
- User confidence increased
- Stress reduced
- Fewer forgotten follow-ups

Bad metrics:

- Time in app for its own sake
- More notifications
- More open loops
- Unnecessary engagement
- User dependency

AdminAvenger should optimise for closed loops and user confidence, not time-on-site.

## Current Top Priorities

1. Polish paste-first/mobile-first flow.
2. Validate broadband/mobile price-rise letters with real users.
3. Add backend AI gateway.
4. Add real AI extraction for price-rise letters only.
5. Improve from observed user behaviour.
6. Only then choose the second vertical.
