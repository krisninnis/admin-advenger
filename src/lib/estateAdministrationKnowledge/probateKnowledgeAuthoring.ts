import { createAuthoringKnowledgeEntry } from "./governance.ts";
import type {
  AuthoringKnowledgeEntry,
  AuthoringKnowledgeEntryInput,
  SourceSnapshot,
} from "./types.ts";

export const PROBATE_DRAFT_APPROVAL_PROFILE_ID =
  "estate_administration_probate_non_production_v1";

const PROBATE_DOSSIER =
  "docs/specs/active/estate-administration-research-probate-letters-of-administration-england-wales-v1.md";

type ProbateCandidateDraft = Pick<
  AuthoringKnowledgeEntryInput,
  | "entryId"
  | "title"
  | "plainEnglishClaim"
  | "preciseInternalClaim"
  | "applicabilityConstraints"
  | "exceptions"
  | "uncertaintyNote"
  | "allowedWording"
  | "requiredQualifiers"
  | "prohibitedConclusionClasses"
  | "escalationNotes"
> & {
  sourceSnapshot: SourceSnapshot;
  dossierReferences: readonly string[];
  semanticChangeReason: string;
};

const createProbateCandidate = (
  draft: ProbateCandidateDraft,
): AuthoringKnowledgeEntry =>
  createAuthoringKnowledgeEntry({
    entryId: draft.entryId,
    revision: "r1",
    title: draft.title,
    domain: "estate_administration",
    topic: "probate",
    jurisdiction: "england_and_wales",
    plainEnglishClaim: draft.plainEnglishClaim,
    preciseInternalClaim: draft.preciseInternalClaim,
    sourceSnapshot: draft.sourceSnapshot,
    evidenceConfidence: "blocked",
    applicabilityConstraints: draft.applicabilityConstraints,
    exceptions: draft.exceptions,
    uncertaintyNote: draft.uncertaintyNote,
    allowedWording: draft.allowedWording,
    requiredQualifiers: draft.requiredQualifiers,
    prohibitedConclusionClasses: draft.prohibitedConclusionClasses,
    escalationNotes: draft.escalationNotes,
    freshness: {
      category:
        draft.sourceSnapshot.sourceType === "legislation"
          ? "legislation"
          : "government_service_guidance",
      verifiedAt: "2026-07-30",
      validUntil: null,
    },
    approvalProfileId: PROBATE_DRAFT_APPROVAL_PROFILE_ID,
    disposition: "draft",
    approvedConsumptionScope:
      "estate_administration_hidden_walking_skeleton",
    supersedes: null,
    supersededBy: null,
    authoringOnly: {
      dossierReferences: draft.dossierReferences,
      privateReviewNotes: [
        "Draft candidate prepared from authoritative public sources for genuine human review; it is not approved for product use.",
        "No qualified legal, domain, safety, accessibility, privacy, freshness, engine-use, product-scope, or activation review has been supplied.",
        "No external approval evidence, production profile, activation pin, product route, or UI scope has been supplied.",
      ],
      semanticChangeReason: draft.semanticChangeReason,
    },
  });

const govUkSnapshot = (
  snapshotId: string,
  sourceId: string,
  title: string,
  publicLocation: string,
  pinpoint: string,
  evidenceText: string,
  sourceRevision = "live-page-verified-2026-07-30",
): SourceSnapshot => ({
  snapshotId,
  sourceId,
  title,
  issuingAuthority: "GOV.UK",
  sourceType: "government_guidance",
  publicLocation,
  jurisdiction: "england_and_wales",
  accessDate: "2026-07-30",
  sourceRevision,
  pinpoint,
  evidenceKind: "dossier_paraphrase",
  evidenceText,
});

const commonJurisdictionQualifier =
  "This candidate is limited to England and Wales and is not legal advice.";
const commonIndividualBoundary =
  "It does not determine what applies to an individual estate or who has authority to act.";

export const probateMeaningCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-meaning-001",
  title: "Probate public-service meaning",
  plainEnglishClaim:
    "GOV.UK uses probate as the public label for the legal right to deal with a person's property, money and possessions after they die.",
  preciseInternalClaim:
    "P-01 describes probate as the legal right to deal with the property, money and possessions of a person who has died, while the research dossier warns that legal sources may use the word more narrowly.",
  sourceSnapshot: govUkSnapshot(
    "p-01-probate-meaning-2026-07-30",
    "P-01",
    "Applying for probate: What is probate",
    "https://www.gov.uk/applying-for-probate",
    "Heading 'What is probate', opening definition and jurisdiction note",
    "The GOV.UK guide defines probate using the estate-dealing description and links to different rules for Scotland and Northern Ireland.",
  ),
  applicabilityConstraints: [
    "Use only as a general terminology explanation after England and Wales has been established.",
  ],
  exceptions: [
    "The word probate can be used more narrowly in legal material, so preserve the source and context.",
  ],
  uncertaintyNote:
    "This definition does not establish whether a grant is needed or whether a person may act.",
  allowedWording: [
    "For England and Wales, GOV.UK uses “probate” as its public label for the legal right to deal with a person’s property, money and possessions after they die.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    commonIndividualBoundary,
    "Check the context because different grant types sit within the public probate process.",
  ],
  prohibitedConclusionClasses: [
    "grant_required",
    "legal_authority",
    "jurisdiction_inference",
  ],
  escalationNotes: [
    "Stop at a general explanation if the relevant jurisdiction, grant type, or legal effect is disputed or unclear.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#5-terminology-and-official-definitions`,
    `${PROBATE_DOSSIER}#19-future-user-questions-the-corpus-may-need-to-support`,
  ],
  semanticChangeReason:
    "Create the first draft terminology candidate for the bounded GOV.UK meaning of probate.",
});

export const probateGrantTypesCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-grant-types-001",
  title: "Ordinary probate grant types",
  plainEnglishClaim:
    "GOV.UK lists a grant of probate, Letters of Administration with will annexed, and Letters of Administration as different documents that may follow an approved application.",
  preciseInternalClaim:
    "P-07 distinguishes the ordinary output where a will and acting executor exist, the will-annexed output where no executor is named or able to apply, and the administration output where there is no will.",
  sourceSnapshot: govUkSnapshot(
    "p-07-probate-grant-types-2026-07-30",
    "P-07",
    "Applying for probate: After you've applied",
    "https://www.gov.uk/applying-for-probate/after-youve-applied",
    "Sections 'If your application is approved' and 'What you'll get'",
    "The GOV.UK page lists grant of probate, Letters of Administration with will annexed, and Letters of Administration as distinct possible documents.",
  ),
  applicabilityConstraints: [
    "Use only to explain the ordinary names of possible England and Wales grant outputs.",
  ],
  exceptions: [
    "Special, limited, later, disputed, or unusual grants are outside this candidate.",
  ],
  uncertaintyNote:
    "The existence or apparent absence of a will does not let AdminAvenger select a grant type for a person.",
  allowedWording: [
    "GOV.UK lists three ordinary outputs: a grant of probate, Letters of Administration with will annexed, and Letters of Administration.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    commonIndividualBoundary,
    "The grant type is an HMCTS outcome, not an AdminAvenger decision.",
  ],
  prohibitedConclusionClasses: [
    "grant_type_determination",
    "will_validity",
    "applicant_priority",
  ],
  escalationNotes: [
    "Refer to current HMCTS information or professional help where the will, executor position, prior grant, or correct application route is unclear.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#5-terminology-and-official-definitions`,
    `${PROBATE_DOSSIER}#6-core-distinction-will-executor-and-administrator`,
    `${PROBATE_DOSSIER}#13-submission-and-processing`,
  ],
  semanticChangeReason:
    "Create a draft entry that preserves the official distinction between ordinary grant outputs.",
});

export const probatePersonalRepresentativeCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-personal-representative-term-001",
  title: "Personal representative terminology",
  plainEnglishClaim:
    "In the Administration of Estates Act 1925, personal representative includes an executor or administrator for the time being.",
  preciseInternalClaim:
    "P-14 section 55 defines personal representative to include the executor or administrator for the time being and separately defines administrator by reference to a person to whom administration is granted.",
  sourceSnapshot: {
    snapshotId: "p-14-personal-representative-2026-07-30",
    sourceId: "P-14",
    title: "Administration of Estates Act 1925",
    issuingAuthority: "UK Parliament",
    sourceType: "legislation",
    publicLocation:
      "https://www.legislation.gov.uk/ukpga/1925/23/section/55",
    jurisdiction: "england_and_wales",
    accessDate: "2026-07-30",
    sourceRevision: "revised-text-accessed-2026-07-30",
    pinpoint:
      "Section 55(1), definitions of administrator, personal representative, probate and representation",
    evidenceKind: "dossier_paraphrase",
    evidenceText:
      "The revised Act defines personal representative to include the executor or administrator for the time being and distinguishes probate of a will from administration.",
  },
  applicabilityConstraints: [
    "Use only for general England and Wales terminology, not to classify a user or another person.",
  ],
  exceptions: [
    "The statutory definitions contain additional wording and context that this narrow explanation does not reproduce.",
  ],
  uncertaintyNote:
    "A relationship, document, self-description, or practical involvement does not establish personal-representative status.",
  allowedWording: [
    "“Personal representative” is a general England and Wales legal term that includes an executor or administrator for the time being.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    "This explains terminology only and does not identify anyone’s legal status.",
  ],
  prohibitedConclusionClasses: [
    "legal_authority",
    "personal_representative_status",
    "role_inference",
  ],
  escalationNotes: [
    "Do not use this entry to infer status from family relationship, possession of documents, or work already carried out.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#5-terminology-and-official-definitions`,
    `${PROBATE_DOSSIER}#18-source-grounding-rules-for-future-use`,
  ],
  semanticChangeReason:
    "Create a draft statutory terminology entry without deciding any person's status or authority.",
});

export const probateExecutorOrdinaryApplicantCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-executor-ordinary-applicant-001",
    title: "Executor and the ordinary will-based application",
    plainEnglishClaim:
      "GOV.UK says a person named as an executor in a will or codicil can apply for probate.",
    preciseInternalClaim:
      "P-02 states the ordinary executor application position but also records multiple-executor, substitute, power-reserved, renunciation, attorney, death, and capacity paths.",
    sourceSnapshot: govUkSnapshot(
      "p-02-executor-applicant-2026-07-30",
      "P-02",
      "Applying for probate: If there’s a will",
      "https://www.gov.uk/applying-for-probate/if-theres-a-will",
      "Opening eligibility statement and sections about multiple or unavailable executors",
      "The GOV.UK page says a person named as executor in the will or codicil can apply and describes several circumstances that can change how executors proceed.",
    ),
    applicabilityConstraints: [
      "Use only to explain the ordinary official position where a will appears to name an executor.",
    ],
    exceptions: [
      "A will may be disputed, superseded, unclear, missing, damaged, or name executors who cannot or do not wish to apply.",
    ],
    uncertaintyNote:
      "AdminAvenger cannot determine that a will is valid or current, that an appointment is effective, or that a named person can or should apply.",
    allowedWording: [
      "GOV.UK says an executor named in a will or codicil is ordinarily the person who applies for probate.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      commonIndividualBoundary,
      "Being named in a document is not proof that the person can or should apply.",
    ],
    prohibitedConclusionClasses: [
      "will_validity",
      "executor_status",
      "applicant_entitlement",
      "application_recommendation",
    ],
    escalationNotes: [
      "Escalate a missing, damaged, unclear, competing, or disputed will and any substitute, capacity, minority, attorney, or executor disagreement issue.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#6-core-distinction-will-executor-and-administrator`,
      `${PROBATE_DOSSIER}#8-who-may-apply`,
      `${PROBATE_DOSSIER}#15-cases-where-the-ordinary-route-may-not-apply`,
    ],
    semanticChangeReason:
      "Create a draft ordinary-route executor explanation with all authority conclusions prohibited.",
  });

export const probateNoWillOrdinaryApplicantCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-no-will-ordinary-applicant-001",
    title: "No-will administration applicant boundary",
    plainEnglishClaim:
      "GOV.UK says that where there is no will, the most entitled person can apply to become the administrator, using a simplified closest-relative explanation.",
    preciseInternalClaim:
      "P-03 gives a simplified ordinary no-will description; the dossier records that the statutory priority framework, legal relationships, age, competing applicants, and exceptions control any individual conclusion.",
    sourceSnapshot: govUkSnapshot(
      "p-03-no-will-applicant-2026-07-30",
      "P-03",
      "Applying for probate: If there is not a will",
      "https://www.gov.uk/applying-for-probate/if-theres-not-a-will",
      "Opening applicant description and 'If you do not want to apply'",
      "The GOV.UK page says the most entitled person can apply to become administrator and gives a simplified ordinary closest-relative sequence.",
    ),
    applicabilityConstraints: [
      "Use only to explain the existence of an official priority question where no will is known.",
    ],
    exceptions: [
      "Partial intestacy, disputed or unclear relationships, minors, competing applicants, no obvious relative, and special grants require separate review.",
    ],
    uncertaintyNote:
      "AdminAvenger cannot decide who is most entitled, whether there is an effective will, or whether a person may apply.",
    allowedWording: [
      "Where there is no will, GOV.UK says the most entitled person can apply to become the administrator, but the individual priority must be checked.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      commonIndividualBoundary,
      "“Closest relative” is simplified public guidance, not a complete priority decision.",
    ],
    prohibitedConclusionClasses: [
      "applicant_priority",
      "administrator_status",
      "intestacy_entitlement",
      "will_validity",
    ],
    escalationNotes: [
      "Do not rank relatives or resolve legal relationships; escalate competing, minor, unclear-family, partial-intestacy, or no-obvious-applicant cases.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#6-core-distinction-will-executor-and-administrator`,
      `${PROBATE_DOSSIER}#8-who-may-apply`,
      `${PROBATE_DOSSIER}#18-source-grounding-rules-for-future-use`,
    ],
    semanticChangeReason:
      "Create a draft no-will explanation that preserves statutory-priority uncertainty.",
  });

export const probateGrantNeedInstitutionRulesCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-grant-need-institution-rules-001",
    title: "Grant need and institution-specific requirements",
    plainEnglishClaim:
      "GOV.UK says to ask each financial organisation whether probate is needed because every organisation has its own rules.",
    preciseInternalClaim:
      "P-01 makes the asset-holder check organisation-specific and does not establish a universal estate-value threshold for needing a grant.",
    sourceSnapshot: govUkSnapshot(
      "p-01-institution-rules-2026-07-30",
      "P-01",
      "Applying for probate: What is probate",
      "https://www.gov.uk/applying-for-probate",
      "Section 'Check if probate is needed'",
      "The GOV.UK page says to contact the financial organisations used by the person who died because every organisation has its own rules.",
    ),
    applicabilityConstraints: [
      "Use only as preparation to check each relevant asset holder's current evidence requirements.",
    ],
    exceptions: [
      "Property transactions, trusts, disputed ownership, foreign assets, nominations, and different asset types may involve separate requirements.",
    ],
    uncertaintyNote:
      "Estate value alone does not establish whether a grant is needed, and one organisation’s threshold does not decide another organisation’s requirements.",
    allowedWording: [
      "Whether a grant is needed can depend on the asset and the organisation holding it; GOV.UK says each financial organisation has its own rules.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      "This is a prompt to verify current requirements, not a decision that probate is required or unnecessary.",
      "Do not treat a court-fee threshold or one provider’s policy as a universal probate threshold.",
    ],
    prohibitedConclusionClasses: [
      "grant_required",
      "grant_not_required",
      "universal_value_threshold",
      "institution_must_release_asset",
    ],
    escalationNotes: [
      "Escalate unclear ownership, property, trusts, foreign assets, competing claims, or inconsistent institution requirements.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#7-when-a-grant-may-be-needed`,
      `${PROBATE_DOSSIER}#18-source-grounding-rules-for-future-use`,
      `${PROBATE_DOSSIER}#26-product-implications`,
    ],
    semanticChangeReason:
      "Create a draft institution-specific grant-requirements candidate and prohibit a universal value test.",
  });

export const probateJointAssetsCautionCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-joint-assets-caution-001",
  title: "Joint assets require ownership checking",
  plainEnglishClaim:
    "GOV.UK gives conditional examples where jointly held money, shares, land, or property may pass to surviving owners, but the ownership arrangement must be checked.",
  preciseInternalClaim:
    "P-01 describes possible no-grant cases for jointly owned money, shares, and beneficial joint-tenancy property; P-21 records that sole and joint registered-property routes differ.",
  sourceSnapshot: govUkSnapshot(
    "p-01-joint-assets-2026-07-30",
    "P-01",
    "Applying for probate: What is probate",
    "https://www.gov.uk/applying-for-probate",
    "Section 'Check if probate is needed', jointly owned assets bullets",
    "The GOV.UK page gives conditional examples involving jointly owned shares, money, land, and property when explaining that probate may not be needed.",
  ),
  applicabilityConstraints: [
    "Use only as a question to check the legal and beneficial form of ownership for each asset.",
  ],
  exceptions: [
    "Two names do not establish beneficial joint ownership; tenants in common, agreements, trusts, nominations, and disputed ownership may change the position.",
  ],
  uncertaintyNote:
    "AdminAvenger cannot determine that an asset passes by survivorship or that no grant is needed for other assets.",
  allowedWording: [
    "Some jointly held assets may pass to a surviving owner, but the ownership arrangement and the asset holder’s current requirements need checking.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    commonIndividualBoundary,
    "Do not infer survivorship from names, account labels, or possession alone.",
  ],
  prohibitedConclusionClasses: [
    "survivorship_determination",
    "asset_ownership",
    "grant_not_required",
  ],
  escalationNotes: [
    "Escalate sole or unclear property ownership, tenants-in-common indicators, trusts, nominations, foreign assets, or disputed ownership.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#7-when-a-grant-may-be-needed`,
    `${PROBATE_DOSSIER}#15-cases-where-the-ordinary-route-may-not-apply`,
  ],
  semanticChangeReason:
    "Create a draft joint-assets preparation candidate while prohibiting survivorship and grant conclusions.",
});

export const probatePreApplicationSequenceCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-preapplication-sequence-001",
    title: "Valuation, Inheritance Tax and grant application sequence",
    plainEnglishClaim:
      "GOV.UK says the ordinary preparation sequence includes checking grant need and eligibility, estimating estate values, checking the applicable Inheritance Tax reporting route, and then applying.",
    preciseInternalClaim:
      "P-04 separates the grant-need and applicant checks, estate valuation, HMRC reporting or payment steps, and the later probate application.",
    sourceSnapshot: govUkSnapshot(
      "p-04-preapplication-sequence-2026-07-30",
      "P-04",
      "Applying for probate: Before you apply",
      "https://www.gov.uk/applying-for-probate/before-you-apply",
      "Opening numbered steps before application",
      "The GOV.UK page orders grant and applicant checks, estate-value estimates, HMRC reporting checks, and applicable tax payment or code steps before application.",
    ),
    applicabilityConstraints: [
      "Use only as a high-level preparation sequence and link to the current official tax and probate guidance.",
    ],
    exceptions: [
      "The tax route, reporting requirements, values, payment position, and code requirements depend on dates and facts not established by this candidate.",
    ],
    uncertaintyNote:
      "AdminAvenger cannot calculate estate values, decide tax liability, determine reporting duties, or confirm that an application is ready.",
    allowedWording: [
      "Valuing the estate, checking the applicable Inheritance Tax reporting steps, and applying for a grant are connected but separate parts of the official process.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      "This is a sequence overview, not tax advice or confirmation that any tax, form, payment, code, or grant is required.",
      "Use the current HMRC and HMCTS guidance for the actual dates and facts.",
    ],
    prohibitedConclusionClasses: [
      "tax_liability",
      "valuation_calculation",
      "application_ready",
      "grant_required",
    ],
    escalationNotes: [
      "Escalate tax uncertainty, trusts, foreign assets, gifts, disputed values, possible insolvency, or any request for a calculation or filing decision.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#9-preconditions-before-applying`,
      `${PROBATE_DOSSIER}#18-source-grounding-rules-for-future-use`,
      `${PROBATE_DOSSIER}#26-product-implications`,
    ],
    semanticChangeReason:
      "Create a draft high-level sequence that keeps valuation, tax and grant application distinct.",
  });

export const probatePreparationInformationCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-preparation-information-001",
    title: "Route-neutral application preparation",
    plainEnglishClaim:
      "GOV.UK says applicants need estate-value information and, where applicable, the original will and route-specific death evidence before applying.",
    preciseInternalClaim:
      "P-04 identifies estate values, an original will where one exists, and conditional death-certificate evidence; the dossier requires the live route-specific checklist to control.",
    sourceSnapshot: govUkSnapshot(
      "p-04-preparation-information-2026-07-30",
      "P-04",
      "Applying for probate: Before you apply",
      "https://www.gov.uk/applying-for-probate/before-you-apply",
      "Sections 'Valuing an excepted estate' and 'What you'll need to apply'",
      "The GOV.UK page identifies estate-value information, the original will where there is one, and specified conditional death-certificate evidence.",
    ),
    applicabilityConstraints: [
      "Use only to describe categories to check against the current application route; do not collect the documents or identifiers.",
    ],
    exceptions: [
      "Paper, online, will, no-will, coroner, overseas-death, lost-will, capacity, attorney, and professional routes can require different evidence.",
    ],
    uncertaintyNote:
      "A static list cannot establish that the documents are complete, valid, current, or sufficient for a particular application.",
    allowedWording: [
      "Before applying, check the current route for the estate-value information and documents it asks for, including the original will where one exists.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      "You do not need to provide names, account numbers, tax references, wills, certificates, identity documents, or full asset schedules to AdminAvenger for this general explanation.",
      "The live HMCTS route and form version control the actual evidence list.",
    ],
    prohibitedConclusionClasses: [
      "document_sufficiency",
      "will_validity",
      "identity_verification",
      "application_ready",
    ],
    escalationNotes: [
      "Escalate a lost, damaged, marked, unclear, or competing will and any foreign, capacity, identity, or route-specific evidence issue.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#9-preconditions-before-applying`,
      `${PROBATE_DOSSIER}#11-forms-and-supporting-evidence`,
      `${PROBATE_DOSSIER}#17-privacy-and-sensitive-information`,
    ],
    semanticChangeReason:
      "Create a privacy-minimised draft preparation entry tied to the current route rather than a static document checklist.",
  });

export const probateApplicationRoutesCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-application-routes-001",
  title: "High-level personal application routes",
  plainEnglishClaim:
    "GOV.UK says a person can apply for probate online or by post after the applicable valuation and HMRC steps.",
  preciseInternalClaim:
    "P-06 describes personal online and postal routes, with PA1P for a will and PA1A for no will, while route eligibility and evidence remain current-service questions.",
  sourceSnapshot: govUkSnapshot(
    "p-06-application-routes-2026-07-30",
    "P-06",
    "Applying for probate: Apply for probate",
    "https://www.gov.uk/applying-for-probate/apply-for-probate",
    "Sections 'Apply for probate online' and 'Apply for probate by post'",
    "The GOV.UK page describes online and post application routes after estate valuation and applicable HMRC steps, and links PA1P and PA1A for the ordinary postal routes.",
  ),
  applicabilityConstraints: [
    "Use only as a route overview after current official eligibility and evidence instructions have been checked.",
  ],
  exceptions: [
    "Lost or foreign wills, attorney cases, previous grants, disputes, complex ownership, professional applications, and other exceptions may require a different route.",
  ],
  uncertaintyNote:
    "AdminAvenger cannot determine which route or form is correct, that an application is complete, or that it will be accepted.",
  allowedWording: [
    "GOV.UK provides online and postal application routes, but the current route and evidence requirements need checking for the case.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    commonIndividualBoundary,
    "Service routes and form versions can change.",
  ],
  prohibitedConclusionClasses: [
    "route_eligibility",
    "form_recommendation",
    "application_complete",
    "outcome_prediction",
  ],
  escalationNotes: [
    "Escalate any unusual will, applicant, ownership, foreign, trust, dispute, capacity, or prior-grant feature instead of selecting a route.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#10-application-routes`,
    `${PROBATE_DOSSIER}#11-forms-and-supporting-evidence`,
    `${PROBATE_DOSSIER}#15-cases-where-the-ordinary-route-may-not-apply`,
  ],
  semanticChangeReason:
    "Create a draft high-level route explanation without recommending a form or predicting eligibility.",
});

export const probateNoActingExecutorCandidate = createProbateCandidate({
  entryId: "ea-ew-probate-no-acting-executor-001",
  title: "Will exists but no executor can apply",
  plainEnglishClaim:
    "GOV.UK says Letters of Administration with will annexed may be the document issued where a will does not name an executor or the named executor cannot apply.",
  preciseInternalClaim:
    "P-07 identifies the will-annexed grant outcome at a high level; P-02 and the dossier record substitute, beneficiary, capacity, attorney, renunciation, power-reserved, and priority complications.",
  sourceSnapshot: govUkSnapshot(
    "p-07-no-acting-executor-2026-07-30",
    "P-07",
    "Applying for probate: After you've applied",
    "https://www.gov.uk/applying-for-probate/after-youve-applied",
    "Section 'What you'll get', will-annexed bullet",
    "The GOV.UK page identifies Letters of Administration with will annexed where the will does not name an executor or the named executor cannot apply.",
  ),
  applicabilityConstraints: [
    "Use only to explain that a separate grant type exists when no executor receives the grant.",
  ],
  exceptions: [
    "The route and applicant depend on the will, executor circumstances, legal priority, evidence, and HMCTS process.",
  ],
  uncertaintyNote:
    "AdminAvenger cannot decide that an executor cannot act, recommend renunciation or power reserved, or identify the next applicant.",
  allowedWording: [
    "If a will exists but no executor receives the grant, the official process may instead result in Letters of Administration with will annexed.",
  ],
  requiredQualifiers: [
    commonJurisdictionQualifier,
    commonIndividualBoundary,
    "Do not treat a beneficiary, relative, or helper as automatically entitled to apply.",
  ],
  prohibitedConclusionClasses: [
    "executor_replacement",
    "renunciation_recommendation",
    "applicant_priority",
    "grant_type_determination",
  ],
  escalationNotes: [
    "Seek current HMCTS information or legal help where no executor is willing or able to act, or where substitution, capacity, minority, attorney authority, or disagreement is involved.",
  ],
  dossierReferences: [
    `${PROBATE_DOSSIER}#6-core-distinction-will-executor-and-administrator`,
    `${PROBATE_DOSSIER}#8-who-may-apply`,
    `${PROBATE_DOSSIER}#15-cases-where-the-ordinary-route-may-not-apply`,
  ],
  semanticChangeReason:
    "Create a draft will-annexed boundary entry without recommending an executor action or replacement.",
});

export const probateGrantStartsAdministrationCandidate =
  createProbateCandidate({
    entryId: "ea-ew-probate-grant-starts-administration-001",
    title: "A grant starts rather than completes administration",
    plainEnglishClaim:
      "GOV.UK says the issued probate document allows the recipient to start dealing with the estate and can be shown to organisations holding assets.",
    preciseInternalClaim:
      "P-07 describes the grant as enabling the start of estate dealings and the sending of copies to asset holders; it does not describe the estate as complete.",
    sourceSnapshot: govUkSnapshot(
      "p-07-grant-starts-administration-2026-07-30",
      "P-07",
      "Applying for probate: After you've applied",
      "https://www.gov.uk/applying-for-probate/after-youve-applied",
      "Sections 'What you'll get' and 'What happens next'",
      "The GOV.UK page says the probate document allows the recipient to start dealing with the estate and to send copies to organisations holding assets.",
    ),
    applicabilityConstraints: [
      "Use only as a general explanation of the next-stage purpose of an issued grant.",
    ],
    exceptions: [
      "Each asset, transaction, debt, tax issue, ownership question, and organisation may have further requirements.",
    ],
    uncertaintyNote:
      "A grant does not establish that tax, debts, ownership, beneficiary questions, distribution, or the estate as a whole are complete or resolved.",
    allowedWording: [
      "A grant allows estate administration to start or continue; it does not mean the estate is finished.",
    ],
    requiredQualifiers: [
      commonJurisdictionQualifier,
      "The grant and any organisation-specific requirements must be checked for the proposed step.",
      "This does not confirm tax, debt, ownership, solvency, inheritance, or distribution outcomes.",
    ],
    prohibitedConclusionClasses: [
      "estate_administration_complete",
      "tax_settled",
      "estate_solvency",
      "distribution_lawful",
      "institution_must_accept_action",
    ],
    escalationNotes: [
      "Escalate disputed ownership, tax, debt, possible insolvency, trusts, foreign assets, beneficiary disagreement, or any proposed distribution conclusion.",
    ],
    dossierReferences: [
      `${PROBATE_DOSSIER}#14-the-grant-and-what-it-enables`,
      `${PROBATE_DOSSIER}#18-source-grounding-rules-for-future-use`,
      `${PROBATE_DOSSIER}#26-product-implications`,
    ],
    semanticChangeReason:
      "Create a draft explanation that the grant begins rather than completes estate administration.",
  });

export const probateKnowledgeCandidates: readonly AuthoringKnowledgeEntry[] = [
  probateMeaningCandidate,
  probateGrantTypesCandidate,
  probatePersonalRepresentativeCandidate,
  probateExecutorOrdinaryApplicantCandidate,
  probateNoWillOrdinaryApplicantCandidate,
  probateGrantNeedInstitutionRulesCandidate,
  probateJointAssetsCautionCandidate,
  probatePreApplicationSequenceCandidate,
  probatePreparationInformationCandidate,
  probateApplicationRoutesCandidate,
  probateNoActingExecutorCandidate,
  probateGrantStartsAdministrationCandidate,
];
