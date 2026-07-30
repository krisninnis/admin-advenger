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
      "Tell Us Once does not notify every organisation. Some organisations, including many banks, insurers, utilities and other private organisations, may still need to be contacted separately.",
    preciseInternalClaim:
      "Tell Us Once does not notify every organisation. Some organisations, including many banks, insurers, utilities and other private organisations, may still need to be contacted separately.",
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
        "The reviewed dossier records that GOV.UK directs people to contact banks, mortgage providers, insurers, utilities, landlords or housing associations, and most private pension schemes separately.",
    },
    evidenceConfidence: "blocked",
    applicabilityConstraints: [
      "The death and service use must fall within the approved England and Wales scope.",
      "The wording is a general preparation prompt, not a provider-specific notification decision.",
    ],
    exceptions: [
      "The current official list and the organisation's own process may change.",
      "Tell Us Once coverage can depend on the deceased person's records and circumstances.",
    ],
    uncertaintyNote:
      "This entry cannot establish which organisations were notified, which accounts exist, or what any organisation requires in an individual estate.",
    allowedWording: [
      "Tell Us Once does not notify every organisation. Check which organisations may still need to be contacted separately.",
    ],
    requiredQualifiers: [
      "This is preparation, not confirmation that a particular organisation must be contacted.",
      "Check the current official Tell Us Once list and the organisation's own bereavement process.",
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
      ],
      privateReviewNotes: [
        "Provisional walking-skeleton subject only.",
        "No qualified legal or domain review has been supplied.",
        "The phrase 'other private organisations' requires evidence and scope review before any approval.",
      ],
      semanticChangeReason:
        "Create the first hidden, non-production authoring revision for governance validation.",
    },
  });
