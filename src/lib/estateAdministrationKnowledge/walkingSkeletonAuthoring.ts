import { createAuthoringKnowledgeEntry } from "./governance.ts";

export const TELL_US_ONCE_SEPARATE_CONTACT_ENTRY_ID =
  "ea-ew-tell-us-once-separate-contact-001";

export const TELL_US_ONCE_SEPARATE_CONTACT_REVISION = "r1";

export const tellUsOnceSeparateContactAuthoringEntry =
  createAuthoringKnowledgeEntry({
    entryId: TELL_US_ONCE_SEPARATE_CONTACT_ENTRY_ID,
    revision: TELL_US_ONCE_SEPARATE_CONTACT_REVISION,
    title: "Tell Us Once separate-contact boundary",
    domain: "estate_administration",
    topic: "tell_us_once",
    jurisdiction: "england_and_wales",
    plainEnglishClaim:
      "GOV.UK says banks, mortgage providers, insurers, utilities, landlords or housing associations, and most personal or workplace pension schemes need to be contacted separately from Tell Us Once.",
    preciseInternalClaim:
      "For the England and Wales scope, TUO-01 explicitly directs users to contact banks, mortgage providers, insurance providers, utilities, landlords or housing associations, and personal or workplace pension schemes other than listed public schemes separately.",
    sourceSnapshot: {
      snapshotId: "tuo-01-accessed-2026-07-27",
      sourceId: "TUO-01",
      title: "What to do after someone dies: Tell Us Once",
      issuingAuthority: "GOV.UK",
      sourceType: "government_guidance",
      publicLocation:
        "https://www.gov.uk/after-a-death/organisations-you-need-to-contact-and-tell-us-once",
      jurisdiction: "england_and_wales",
      accessDate: "2026-07-27",
      sourceRevision: "dossier-access-snapshot-2026-07-27",
      pinpoint:
        "Estate Administration death-registration/Tell Us Once dossier, findings VF-33 to VF-36 and claim-control section 13",
      evidenceKind: "dossier_paraphrase",
      evidenceText:
        "The dossier records that GOV.UK directs people to contact banks, mortgage providers, insurers, utilities, landlords or housing associations, and most personal or workplace pension schemes separately.",
    },
    evidenceConfidence: "blocked",
    applicabilityConstraints: [
      "Use only for an England and Wales Tell Us Once separate-contact explanation after jurisdiction and current service coverage are established.",
      "Treat the source as a government service description and the output as a practical preparation prompt, not as a legal requirement or provider-specific notification decision.",
    ],
    exceptions: [
      "The current official list and the organisation's own process may change.",
      "Tell Us Once coverage depends on the deceased person's records and circumstances; notification of a particular organisation cannot be inferred.",
    ],
    uncertaintyNote:
      "This entry cannot establish whether Tell Us Once was used, which organisations were notified, which accounts exist, or what any organisation requires in an individual estate.",
    allowedWording: [
      "The GOV.UK guidance accessed on 27 July 2026 says some organisations need to be contacted separately from Tell Us Once. Check the current official list before deciding what to do.",
    ],
    requiredQualifiers: [
      "This is government service guidance for England and Wales, not a legal requirement.",
      "This is preparation, not confirmation that a particular organisation must be contacted or that any notification is complete.",
      "Check the organisation's current bereavement process.",
    ],
    prohibitedConclusionClasses: [
      "legal_authority",
      "provider_notification_complete",
      "account_closure_complete",
      "estate_administration_complete",
    ],
    escalationNotes: [
      "Do not infer estate authority, account ownership, notification status, or provider requirements.",
      "Stop if the jurisdiction or current service coverage cannot be established.",
    ],
    freshness: {
      category: "government_service_guidance",
      verifiedAt: null,
      validUntil: null,
    },
    approvalProfileId:
      "estate_administration_walking_skeleton_non_production_v1",
    disposition: "draft",
    approvedConsumptionScope:
      "estate_administration_hidden_walking_skeleton",
    supersedes: null,
    supersededBy: null,
    authoringOnly: {
      dossierReferences: [
        "docs/specs/active/estate-administration-research-death-registration-tell-us-once-england-wales-v1.md#7-tell-us-once-findings",
        "docs/specs/active/estate-administration-research-death-registration-tell-us-once-england-wales-v1.md#13-product-safe-claims",
        "docs/specs/active/estate-administration-research-death-registration-tell-us-once-england-wales-v1.md#14-claims-that-must-not-enter-the-product",
        "docs/specs/active/estate-administration-research-death-registration-tell-us-once-england-wales-v1.md#17-example-safe-and-unsafe-wording",
      ],
      privateReviewNotes: [
        "Prepared for genuine human review only; this draft is not approved for product use.",
        "No qualified legal or domain review has been supplied.",
        "No production approval profile, external approval evidence, activation pin, product route, or UI scope has been supplied.",
        "The unsupported phrase 'other private organisations' was removed; this revision makes no claim about unlisted organisation categories.",
      ],
      semanticChangeReason:
        "Narrow the unreviewed r1 draft to the TUO-01 separate-contact proposition and prepare its governed content for human review without approving or activating it.",
    },
  });
