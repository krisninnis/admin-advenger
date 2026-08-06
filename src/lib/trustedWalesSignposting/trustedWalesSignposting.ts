export type TrustedSignpostingOrganisationType = "official" | "charity";
export type TrustedSignpostingJurisdiction = "Wales" | "UK with Wales service";
export type TrustedSignpostingRole =
  | "find_local_authority"
  | "independent_information_and_advice"
  | "find_local_carers_support";

export type TrustedSignpostingSource = {
  readonly title: string;
  readonly url: string;
};

export type TrustedSignpostingPhone = {
  readonly display: string;
  readonly href: string;
  readonly hours?: string;
  readonly purpose: string;
};

export type TrustedSignpostingRecord = {
  readonly id: string;
  readonly organisationName: string;
  readonly serviceName: string;
  readonly organisationType: TrustedSignpostingOrganisationType;
  readonly jurisdiction: TrustedSignpostingJurisdiction;
  readonly role: TrustedSignpostingRole;
  readonly intendedAudience: string;
  readonly summary: string;
  readonly websiteUrl: string;
  readonly phone?: TrustedSignpostingPhone;
  readonly givesIndividualAdvice: boolean | "limited" | "not_stated";
  readonly languageAvailability?: string;
  readonly limitations: readonly string[];
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly supportingSources: readonly TrustedSignpostingSource[];
  readonly verifiedOn: string;
  readonly reviewDueOn: string;
  readonly timeSensitiveFields: readonly string[];
};

export type TrustedWalesSignpostingDirectory = {
  readonly approvalStatus: "Approved for public release";
  readonly approvedOn: string;
  readonly approvedBy: "Human project owner";
  readonly researchDate: string;
  readonly records: readonly TrustedSignpostingRecord[];
};

const freezeRecord = (
  record: TrustedSignpostingRecord,
): TrustedSignpostingRecord =>
  Object.freeze({
    ...record,
    phone: record.phone ? Object.freeze({ ...record.phone }) : undefined,
    limitations: Object.freeze([...record.limitations]),
    supportingSources: Object.freeze(
      record.supportingSources.map((source) => Object.freeze({ ...source })),
    ),
    timeSensitiveFields: Object.freeze([...record.timeSensitiveFields]),
  });

const RECORDS: readonly TrustedSignpostingRecord[] = Object.freeze([
  freezeRecord({
    id: "welsh-government-local-authority-finder",
    organisationName: "Welsh Government",
    serviceName: "Find your local authority",
    organisationType: "official",
    jurisdiction: "Wales",
    role: "find_local_authority",
    intendedAudience: "People in Wales who need to identify their local authority.",
    summary:
      "Find your council website using a postcode or the official local-authority list.",
    websiteUrl: "https://www.gov.wales/find-your-local-authority",
    givesIndividualAdvice: false,
    languageAvailability:
      "The official finder page is available in English and Welsh.",
    limitations: [
      "This only identifies a local authority. It does not confirm which service to use or what support is available.",
    ],
    sourceTitle: "Find your local authority | GOV.WALES",
    sourceUrl: "https://www.gov.wales/find-your-local-authority",
    supportingSources: [],
    verifiedOn: "2026-08-06",
    reviewDueOn: "2026-11-06",
    timeSensitiveFields: ["service description", "website URL"],
  }),
  freezeRecord({
    id: "carers-uk-helpline",
    organisationName: "Carers UK, including Carers Wales",
    serviceName: "Carers UK Helpline",
    organisationType: "charity",
    jurisdiction: "UK with Wales service",
    role: "independent_information_and_advice",
    intendedAudience:
      "People with a question about caring or who need to talk to someone.",
    summary:
      "Information and support for questions about caring, practical help, benefits or support at work.",
    websiteUrl: "https://www.carersuk.org/wales/about-us/what-we-do/we-help/",
    phone: {
      display: "0808 808 7777",
      href: "tel:+448088087777",
      hours: "Monday to Friday, 9am to 6pm",
      purpose: "A question about caring, or someone to talk to",
    },
    givesIndividualAdvice: true,
    languageAvailability:
      "The Carers Wales website offers English and Welsh pages. Helpline language availability is not stated on the source page.",
    limitations: [
      "Carers UK says more complex queries may be handled more effectively by email.",
      "The service cannot promise a particular outcome.",
    ],
    sourceTitle: "We help | Carers Wales",
    sourceUrl: "https://www.carersuk.org/wales/about-us/what-we-do/we-help/",
    supportingSources: [],
    verifiedOn: "2026-08-06",
    reviewDueOn: "2026-11-06",
    timeSensitiveFields: [
      "service description",
      "website URL",
      "phone number",
      "opening hours",
    ],
  }),
  freezeRecord({
    id: "carers-trust-local-service-finder",
    organisationName: "Carers Trust",
    serviceName: "Find carer services near you",
    organisationType: "charity",
    jurisdiction: "UK with Wales service",
    role: "find_local_carers_support",
    intendedAudience: "Unpaid carers looking for a local carers organisation.",
    summary:
      "Search for a local Carers Trust Network Partner by town, city or postcode.",
    websiteUrl: "https://carers.org/help-for-carers/find-carer-services-near-you",
    phone: {
      display: "0300 772 9600",
      href: "tel:+443007729600",
      hours: "Monday to Friday, 9am to 5pm",
      purpose: "Help finding the nearest Carers Trust Network Partner",
    },
    givesIndividualAdvice: false,
    limitations: [
      "Carers Trust says it cannot provide an individual help and information service.",
      "Not every part of the UK is covered by a Carers Trust Network Partner.",
      "For Wales, the finder also points people to Dewis and Carers Wales when local Network Partner coverage is unavailable.",
    ],
    sourceTitle: "Help & Info - Find Local Carer Services | Carers Trust",
    sourceUrl: "https://carers.org/help-for-carers/find-carer-services-near-you",
    supportingSources: [
      {
        title: "Get in Contact | Carers Trust",
        url: "https://carers.org/home/contact-us-1",
      },
    ],
    verifiedOn: "2026-08-06",
    reviewDueOn: "2026-11-06",
    timeSensitiveFields: [
      "service description",
      "website URL",
      "Network Partner coverage",
      "phone number",
      "opening hours",
    ],
  }),
]);

export const TRUSTED_WALES_SIGNPOSTING_DIRECTORY: TrustedWalesSignpostingDirectory =
  Object.freeze({
    approvalStatus: "Approved for public release",
    approvedOn: "2026-08-06",
    approvedBy: "Human project owner",
    researchDate: "2026-08-06",
    records: RECORDS,
  });

export type TrustedSignpostingFreshness = "current" | "needs_recheck";

export type TrustedSignpostingViewRecord = TrustedSignpostingRecord & {
  readonly freshness: TrustedSignpostingFreshness;
  readonly hoursToDisplay: string | undefined;
};

export type TrustedSignpostingView = {
  readonly records: readonly TrustedSignpostingViewRecord[];
  readonly needsRecheck: boolean;
};

export const trustedSignpostingViewOn = (asOfDate: string): TrustedSignpostingView => {
  const records = TRUSTED_WALES_SIGNPOSTING_DIRECTORY.records.map((record) => {
    const freshness: TrustedSignpostingFreshness =
      asOfDate > record.reviewDueOn ? "needs_recheck" : "current";

    return Object.freeze({
      ...record,
      freshness,
      hoursToDisplay: freshness === "current" ? record.phone?.hours : undefined,
    });
  });

  return Object.freeze({
    records: Object.freeze(records),
    needsRecheck: records.some((record) => record.freshness === "needs_recheck"),
  });
};

export type TrustedSignpostingVisibility = "closed" | "open";

export type TrustedSignpostingState = {
  readonly visibility: TrustedSignpostingVisibility;
  readonly caseCreated: false;
  readonly savedAutomatically: false;
  readonly referralMade: false;
  readonly personalInformationShared: false;
  readonly specialistRouteOpened: false;
  readonly estateRouteOpened: false;
};

export type TrustedSignpostingAction =
  | { readonly type: "open" }
  | { readonly type: "close" };

const PROHIBITED_OUTCOMES = {
  caseCreated: false,
  savedAutomatically: false,
  referralMade: false,
  personalInformationShared: false,
  specialistRouteOpened: false,
  estateRouteOpened: false,
} as const;

export const createTrustedSignpostingState = (): TrustedSignpostingState => ({
  ...PROHIBITED_OUTCOMES,
  visibility: "closed",
});

export const trustedSignpostingReducer = (
  state: TrustedSignpostingState,
  action: TrustedSignpostingAction,
): TrustedSignpostingState => ({
  ...state,
  visibility: action.type === "open" ? "open" : "closed",
});
