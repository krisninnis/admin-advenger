# Community Helper Public Beta Prep v1

Status: safety/prep branch only. This is NOT the public beta launch.

## Purpose

This branch adds a readonly readiness checklist for Community Helper and
confirms, with an executable test suite, that every current public-beta-prep
safety boundary is still in place. It changes no runtime behaviour: nothing
in this branch alters what the decision-engine classifier does, what OCR or
file intake does, or what Community Helper actually generates.

## What was added

- `src/lib/communityHelperPublicBetaReadiness.ts` - a pure, readonly module
  that defines 10 readiness checks and an expanded, beta-prep-only forbidden
  phrase list, and reports pass/fail for each check given the raw source of
  `HomeView.tsx` and `DemoTourView.tsx`.
- `src/lib/__tests__/communityHelperPublicBetaReadiness.test.ts` - runs the
  checklist against the real, currently-shipped source and confirms all 10
  checks pass; also confirms the checker itself correctly *fails* on
  synthetic bad input (classifier wiring added, gated entry removed,
  forbidden phrase injected), so the checklist is not a check that always
  passes regardless of input.
- One extra line on the existing gated Home card: "Public beta is being
  prepared carefully. This demo uses synthetic examples only." The card is
  unchanged in size relative to the main "Check a message" intake area and
  remains positioned after it, not as the primary route.
- `docs/product/community-helper-public-beta-prep-v1.md` (this file).

## Why a separate, wider forbidden-phrase list

`src/lib/safetyWording.ts`'s `FORBIDDEN_COMMUNITY_HELPER_CLAIMS` feeds live
text-filtering logic inside `resultViewModel.ts` and `adviserExportPack.ts` -
changing it would risk silently altering generated output, which this branch
must not do. Instead, `communityHelperPublicBetaReadiness.ts` defines its own
`PUBLIC_BETA_PREP_FORBIDDEN_PHRASES` list, which is deliberately wider than
the shared list (adding, for example, "safeguarding confirmed" without the
word "issue", "capacity decision", and the broader "council must" rather than
only "council must provide"). This list is used only for the beta-readiness
checklist, never for filtering what Community Helper actually generates.

## What is ready

- Community Helper remains secondary/gated from Home: a small "Beta / demo"
  card labelled "Community support prep", positioned after the main input
  picker and the primary "What does this mean?" check button.
- Community Helper is not wired into the normal classifier: `HomeView.tsx`
  contains no reference to `CommunityHelperPack`, `communityHelperPack`, or
  `buildCommunityHelperPack`, and does not import
  `../lib/communityHelperPack`.
- `DemoTourView.tsx` remains the only UI surface that calls
  `buildCommunityHelperPack`.
- The community helper demo handler (`handleRunCommunityDemo`) builds its
  pack only from a fixed `scenario.inputText` string - it has no reference to
  OCR, photo capture, or attached-file state, so no OCR/file intake path can
  trigger it.
- The 4 demo scenarios remain exactly as shipped, synthetic and hardcoded, in
  `src/lib/communityHelperDemoScenarios.ts`.
- Boundary wording is present across the gated Home card, the DemoTourView
  community section, the demo scenario outputs, and the shared adviser
  export constants: "preparation only", "AdminAvenger helps prepare. You
  stay in control.", a not-a-professional-assessment / cannot-decide
  equivalent, and "another trusted person" signposting.
- The urgent safeguarding-like demo scenario is confirmed, structurally, to
  produce signposting only (empty daily-life impact, admin barriers, key
  facts, evidence, and questions arrays) - never analysis or a decision.
- The financial admin concern demo scenario is confirmed to stay factual and
  non-accusatory, with no forbidden claim anywhere in its output.
- No forbidden phrase - from either the shared list or the wider
  public-beta-prep list - appears in the gated Home card, the DemoTourView
  community section, any of the 4 demo scenario outputs, or the shared
  adviser export boundary constants.

All 10 checks currently pass against the real, shipped source (see the test
file above).

## What is deliberately not launched yet

This branch does not add:

- automatic community helper detection from pasted or uploaded text
- community helper routing in the main decision-engine classifier
- any way for HomeView to build a `CommunityHelperPack` from real user text
- a way for OCR, photo, or file-intake output to reach Community Helper
- new cloud calls or hidden processing of any kind
- changes to adviser export or result generation behaviour (only the
  readiness checklist and its own tests were added)
- any outcome, entitlement, risk, or abuse claims
- a full "public beta" or "controlled intake" launch

Community Helper is reachable today only through the gated Home card, which
only navigates to the existing Demo/tour page's 4 hardcoded synthetic
scenarios - the same surface shipped in Community Helper Demo UI v1 and
Community Helper Home Gated v1.

## Safety checklist (10 checks)

1. Community Helper remains secondary/gated from Home.
2. Community Helper is not wired into the normal classifier.
3. HomeView does not import `buildCommunityHelperPack`.
4. DemoTourView remains the only UI surface that builds community helper
   demo packs.
5. No OCR/file intake path triggers Community Helper automatically.
6. The demo scenarios remain synthetic/hardcoded (exactly 4, matching known
   ids).
7. Boundary wording (preparation only / control line / not-a-professional-
   assessment / suitable-person signposting) is present.
8. The urgent safeguarding-like scenario is signposting only.
9. The financial admin concern scenario stays factual and non-accusatory.
10. No forbidden phrase (shared or public-beta-prep-only) appears in any
    Community Helper public-beta-facing artifact.

## Risks still to review before real public intake

- The wider `PUBLIC_BETA_PREP_FORBIDDEN_PHRASES` list has now also been
  scanned against the other 7 internal `CommunityHelperSituationType`
  templates that are not reachable through any shipped UI today
  (`difficulty_understanding_letters`, `housing_repair_or_access_difficulty`,
  `carer_organising_letters`, `support_worker_meeting_notes`,
  `daily_routine_admin_overwhelm`, `communication_difficulty`,
  `community_helper_unknown`) - see the `internal-only template ...` test
  cases in `communityHelperPublicBetaReadiness.test.ts`. All 11 situation
  types (4 demo-facing + 7 internal-only) are clean against the wider list.
  This does not make those 7 templates public-beta-facing; it only confirms
  their wording would not need rework on that specific front if a future
  branch does reach them.
- No real user text has ever been processed by Community Helper - readiness
  here only proves the 4 known synthetic scenarios and the gating are safe.
  A future intake branch needs its own safety review of real, messy input
  (mixed situations, ambiguous wording, multiple concerns in one message).
- Consent-and-control wording currently assumes a `helping_someone` or
  `supporting_people_at_work` role is explicit or detected from text; a real
  intake path needs a clear, low-friction way for a user to state which role
  applies, rather than relying on text-pattern detection alone.
- The readiness module's `home_gated_secondary` and `demo_tour_only_surface`
  checks are string-based and scoped to `HomeView.tsx` and
  `DemoTourView.tsx` only - a future branch that adds a third UI surface
  referencing Community Helper would need this checklist extended to cover
  it.

## Recommended next branch

- `community-helper-controlled-intake-v1` (preferred): a narrowly-scoped,
  explicitly opt-in intake path (mirroring the existing workplace support
  beta pattern) that lets a small, controlled set of real users try
  Community Helper with real text, behind an explicit gate, before any
  wider rollout.
- `community-helper-public-beta-v1`: a wider public beta, only after a
  `community-helper-controlled-intake-v1` review confirms the remaining
  risks above have been addressed and the other 7 internal situation-type
  templates have been scanned against the wider forbidden-phrase list.
