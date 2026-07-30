# Estate Administration knowledge-corpus walking skeleton — v1

## Status

This is hidden, non-production infrastructure. It does not add Estate
Administration to the public product, classifier, navigation, routes or UI.

The provisional claim is:

> GOV.UK says contact is needed with banks, mortgage providers, insurance
> providers, relevant contract companies such as utility companies, landlords
> or housing associations, and personal or workplace pension schemes unless
> Tell Us Once contacts the public-sector scheme.

The repository does not represent this claim as legally or professionally
reviewed. The real entry is `draft`, its approval evidence list is empty, and
its activation manifest has no pins. The unsupported phrase “other private
organisations” has been removed. The official source was rechecked on 30 July
2026, but the narrowed claim remains blocked pending genuine human review,
approved expiry policy, approval evidence, and activation authority.

## Locations

| Concern | Location |
|---|---|
| Authoring/runtime contracts | `src/lib/estateAdministrationKnowledge/types.ts` |
| Structural, governance, eligibility and projection logic | `src/lib/estateAdministrationKnowledge/governance.ts` |
| Single authoring entry and immutable source snapshot | `src/lib/estateAdministrationKnowledge/walkingSkeletonAuthoring.ts` |
| Non-production approval profile | `src/lib/estateAdministrationKnowledge/walkingSkeletonGovernance.ts` |
| External approval evidence | `walkingSkeletonExternalApprovalEvidence` in `walkingSkeletonGovernance.ts`; intentionally empty |
| Activation manifest | `walkingSkeletonActivationManifest` in `walkingSkeletonGovernance.ts`; intentionally unpinned |
| Exact hidden TypeScript rule | `src/lib/estateAdministrationKnowledge/hiddenDecisionRule.ts` |
| Behavioural proofs | `src/lib/estateAdministrationKnowledge/__tests__/walkingSkeleton.test.ts` |
| Human review packet | `docs/product/estate-administration-tell-us-once-approval-readiness-v1.md` |
| Build-only browser-safe asset | `assets/estate-administration-knowledge-runtime.json` in Vite build output |

Approval evidence is supplied separately from the authoring entry. Entry fields
cannot approve themselves. Synthetic tests use reviewer IDs prefixed with
`synthetic-test-role:` and a profile explicitly labelled non-production; they
do not invent a real reviewer. Synthetic approval is eligible only when both
the product availability is `development_only` and the consumption scope is
`estate_administration_hidden_walking_skeleton`. It is blocked for public,
controlled-beta and every non-hidden consumption scope, even when an exact
activation pin exists.

## Approval-content digest contract

Approval evidence binds to a `sha256:` digest of a UTF-8 JSON canonical form.
The canonical form is an ordered array of `[fieldName, value]` pairs under the
schema marker `estate-administration-approval-content-v1`; nested source,
freshness and authoring-provenance records use the same explicit pair ordering.
String-array order is preserved, JSON supplies deterministic escaping, and no
locale-dependent sorting or whitespace is used.

The fields are ordered as follows:

1. identity: `entryId`, `revision`, `exactRevision`;
2. descriptive and claim content: `title`, `domain`, `topic`, `jurisdiction`,
   `plainEnglishClaim`, `preciseInternalClaim`;
3. every `sourceSnapshot` field in declared schema order;
4. `evidenceConfidence`, `applicabilityConstraints`, `exceptions`,
   `uncertaintyNote`, `allowedWording`, `requiredQualifiers`,
   `prohibitedConclusionClasses`, `escalationNotes`;
5. freshness category, verification date and validity date;
6. `approvalProfileId`, `disposition`, `approvedConsumptionScope`,
   `supersedes`, `supersededBy`;
7. authoring-only `dossierReferences`, because evidence and domain review must
   bind to the permitted tracked provenance used for the claim.

`contentDigest` is excluded because it is the result. Authoring-only
`privateReviewNotes` and `semanticChangeReason` are excluded because they are
workflow commentary, do not change the proposition, evidence, constraints,
approved output or runtime eligibility, and never enter the browser-safe
projection. Changing approval-relevant content or exact revision therefore
requires new approval evidence; changing only those two workflow fields does
not.

## Wording and governance boundaries

The runtime `approvedClaim` comes only from the single externally approved
`allowedWording` value. `preciseInternalClaim` and `plainEnglishClaim` are
required, digest-bound authoring aids for evidence and reviewer comparison;
neither is projected. A change to either internal claim invalidates existing
approval evidence but cannot silently change user-facing output.

For the other governance fields:

- `applicabilityConstraints`, `exceptions` and `escalationNotes` are required,
  validated, digest-bound authoring/reviewer constraints. Consistent with the
  approved architecture, the separately reviewed TypeScript rule owns fact
  evaluation; these fields are not projected and are not a rules language.
- `prohibitedConclusionClasses` is required, validated, digest-bound and
  projected so a consuming rule/output boundary can preserve the reviewed
  classes. It remains metadata rather than a generic conclusion engine.
- `allowedWording`, `requiredQualifiers` and `uncertaintyNote` are checked with
  the existing deterministic `safetyWording.ts` forbidden-phrase validator.
  Validation, eligibility and direct projection all fail closed if prohibited
  user-facing wording is present. Phrase scanning does not replace qualified
  substantive review.

`evidenceConfidence: "blocked"` produces the stable
`evidence_confidence_blocked` eligibility reason. The current type model's
`high`, `medium` and `low` values receive no newly invented ranking policy:
they may proceed only if every independent approval, activation, freshness,
scope, jurisdiction, fact and wording gate passes.

The authoring dossier references resolve only to permitted tracked documents.
The product-safe provenance link uses the valid heading anchor
`#13-product-safe-claims`.

## Build and eligibility flow

The Vite build-only plugin:

1. validates the one authoring revision, approval profile, external evidence
   shape and activation manifest;
2. applies product-scope precedence before knowledge selection;
3. derives `usable` or explicit block reasons;
4. projects only eligible exact revisions through the runtime allowlist;
5. emits a runtime JSON artifact containing no authoring notes, dossier
   references, reviewer identities or governance evidence.

The current public scope is unavailable, so the governed-input loader is not
invoked for selection and the emitted `entries` array must be empty. The build
fails if the real candidate leaks into the artifact.

The artifact records that a downloaded offline bundle cannot detect later
source changes or be remotely revoked. `validUntil` can only fail closed using
local time; it is not live re-verification.

## Validation

Run the focused suite:

```powershell
npm test -- src/lib/estateAdministrationKnowledge/__tests__/walkingSkeleton.test.ts
```

Then run the repository verification:

```powershell
npm run test
npm run lint
npm run build
git diff --check
```

No dependency installation is required.

## Decisions still required

Before any real approval, activation or product use, humans must decide:

- the qualified legal or domain reviewer;
- evidence, product-safety, engine-use and activation owners;
- whether the candidate wording and source snapshot are sufficient;
- the approval profile and review policy for mutable Tell Us Once guidance;
- jurisdiction and citation treatment;
- offline expiry behaviour;
- whether and when CODEOWNERS or equivalent ownership, protected pull requests
  and required CI will be configured;
- whether any Estate Administration product scope is approved.

This walking skeleton does not make any of those decisions.

## Deferred

No Estate Workspace, public route, classifier support, broad corpus, generic
rules language, probate or authority decision, tax/benefits/intestacy logic,
remote revocation, database, vector search, automated ingestion or UI has been
implemented.
