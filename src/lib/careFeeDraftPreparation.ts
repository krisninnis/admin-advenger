import {
  formatCareFeeMinorAmount,
  validateCareFeeComparisonCase,
  type CareFeeComparisonCaseV1,
} from "./careFeeCase";
import type { UserConfirmedCareFeeContext } from "./careFeeClaimConfirmation";
import {
  COMPARABILITY_REASONS,
  type ComparabilityReason,
  type ComparableApplicability,
} from "./financialClaimComparability";
import type { ClaimCadence, ClaimCurrency } from "./financialClaims";
import { RECONCILIATION_REASON_EXPLANATIONS } from "./safeReconciliationResult";

export const CARE_FEE_DRAFT_INTENTS = [
  "confirm_or_break_down_figure",
  "explain_comparison_difference",
  "clarify_rate_or_period",
  "request_missing_information",
] as const;

export type CareFeeDraftIntentV1 = (typeof CARE_FEE_DRAFT_INTENTS)[number];

export type CareFeeDraftRecipientV1 = {
  readonly label: string;
  readonly origin: "user_entered_drafting_input";
};

export type CareFeeDraftPreparationRequestV1 = {
  readonly kind: "care_fee_draft_preparation_request";
  readonly version: 1;
  readonly savedCase: CareFeeComparisonCaseV1;
  readonly intent: CareFeeDraftIntentV1;
  readonly recipient?: CareFeeDraftRecipientV1;
};

export type CareFeeDraftSourceFieldV1 =
  | "document_reference"
  | "amount_minor"
  | "cadence";

type CareFeeDraftSourceFactBaseV1 = {
  readonly partition: "source_fact";
  readonly recordLabel: "Record 1" | "Record 2";
  readonly claimId: string;
  readonly sourceDocumentId: string;
  readonly sourceSegmentId?: string;
};

export type CareFeeDraftSourceFactV1 =
  | (CareFeeDraftSourceFactBaseV1 & {
      readonly field: "document_reference";
      readonly value: string;
    })
  | (CareFeeDraftSourceFactBaseV1 & {
      readonly field: "amount_minor";
      readonly value: number;
      readonly currency: ClaimCurrency;
    })
  | (CareFeeDraftSourceFactBaseV1 & {
      readonly field: "cadence";
      readonly value: ClaimCadence;
    });

export type CareFeeDraftUserConfirmedFactV1 = {
  readonly partition: "user_confirmed_fact";
  readonly contextIndex: number;
  readonly context: UserConfirmedCareFeeContext;
};

type CareFeeDraftDerivedBaseV1 = {
  readonly partition: "derived_comparison_fact";
  readonly claimIds: readonly [string, string];
};

export type CareFeeDraftDerivedComparisonFactsV1 =
  | (CareFeeDraftDerivedBaseV1 & {
      readonly state: "agreement";
      readonly amountMinor: number;
      readonly currency: "GBP";
      readonly cadence: Exclude<ClaimCadence, "unknown">;
      readonly applicability: ComparableApplicability;
    })
  | (CareFeeDraftDerivedBaseV1 & {
      readonly state: "disagreement";
      readonly amountsMinor: readonly [number, number];
      readonly differenceMinor: number;
      readonly differenceKind: "absolute";
      readonly currency: "GBP";
      readonly cadence: Exclude<ClaimCadence, "unknown">;
      readonly applicability: ComparableApplicability;
    })
  | (CareFeeDraftDerivedBaseV1 & {
      readonly state: "not_safely_comparable";
      readonly reasons: readonly ComparabilityReason[];
      readonly blockingExplanations: readonly string[];
    });

export type ValidatedCareFeeDraftPreparationContextV1 = {
  readonly kind: "validated_care_fee_draft_preparation_context";
  readonly version: 1;
  readonly caseId: string;
  readonly intent: CareFeeDraftIntentV1;
  readonly sourceFacts: readonly CareFeeDraftSourceFactV1[];
  readonly userConfirmedFacts: readonly CareFeeDraftUserConfirmedFactV1[];
  readonly derivedComparisonFacts: CareFeeDraftDerivedComparisonFactsV1;
  readonly recipient?: CareFeeDraftRecipientV1;
};

export type CareFeeDraftSourceFactReferenceV1 = {
  readonly partition: "source_fact";
  readonly recordLabel: "Record 1" | "Record 2";
  readonly claimId: string;
  readonly field: CareFeeDraftSourceFieldV1;
  readonly sourceDocumentId: string;
  readonly sourceSegmentId?: string;
};

export type CareFeeDraftUserConfirmedFactReferenceV1 = {
  readonly partition: "user_confirmed_fact";
  readonly contextIndex: number;
  readonly dimension: UserConfirmedCareFeeContext["dimension"];
  readonly appliesToClaimIds: readonly string[];
};

export type CareFeeDraftDerivedFieldV1 =
  | "state"
  | "amount_minor"
  | "amounts_minor"
  | "difference_minor"
  | "difference_kind"
  | "currency"
  | "cadence"
  | "applicability"
  | "reasons"
  | "blocking_explanations";

export type CareFeeDraftDerivedFactReferenceV1 = {
  readonly partition: "derived_comparison_fact";
  readonly field: CareFeeDraftDerivedFieldV1;
  readonly claimIds: readonly [string, string];
};

export type CareFeeDraftUserEnteredInputReferenceV1 = {
  readonly partition: "user_entered_drafting_input";
  readonly field: "recipient_label";
};

export type CareFeePreparedDraftV1 = {
  readonly kind: "care_fee_prepared_draft";
  readonly version: 1;
  readonly id: string;
  readonly caseId: string;
  readonly intent: CareFeeDraftIntentV1;
  readonly recipient?: CareFeeDraftRecipientV1;
  readonly preparedSubject: string;
  readonly preparedBody: string;
  readonly createdAt: string;
  readonly audit: {
    readonly templateVersion: 1;
    readonly sourceFactReferences: readonly CareFeeDraftSourceFactReferenceV1[];
    readonly userConfirmedFactReferences: readonly CareFeeDraftUserConfirmedFactReferenceV1[];
    readonly derivedFactReferences: readonly CareFeeDraftDerivedFactReferenceV1[];
    readonly userEnteredInputReferences: readonly CareFeeDraftUserEnteredInputReferenceV1[];
  };
  readonly safetyBoundary: "preparation_only_no_send_no_claim_conclusion";
};

export type CareFeeDraftPreparationFailureReason =
  | "malformed_request"
  | "unexpected_field"
  | "invalid_saved_case"
  | "unsupported_intent"
  | "unsupported_state_intent"
  | "invalid_recipient"
  | "invalid_nsc_blockers"
  | "missing_source_fact"
  | "invalid_generation_metadata"
  | "unsafe_output"
  | "unexpected_error";

export type CareFeeDraftContextValidation =
  | {
      readonly valid: true;
      readonly request: CareFeeDraftPreparationRequestV1;
      readonly context: ValidatedCareFeeDraftPreparationContextV1;
    }
  | {
      readonly valid: false;
      readonly reason: CareFeeDraftPreparationFailureReason;
      readonly message: string;
    };

export type CareFeeDraftPreparationOutcome =
  | {
      readonly status: "prepared";
      readonly draft: CareFeePreparedDraftV1;
      readonly context: ValidatedCareFeeDraftPreparationContextV1;
    }
  | {
      readonly status: "failed";
      readonly reason: CareFeeDraftPreparationFailureReason;
      readonly message: string;
    };

export type CareFeeNscDraftRuleV1 = {
  readonly statement: string;
  readonly request: string;
  readonly forbiddenInference: string;
};

export const CARE_FEE_NSC_DRAFT_RULES = {
  invalid_claim: {
    statement: "One selected financial detail could not be validated.",
    request: "Please provide a clearer record showing the figure, what it describes, and when it applies.",
    forbiddenInference: "Which field is wrong, the correct value, or any difference.",
  },
  source_review_required: {
    statement: "A selected source detail needs checking against the original record.",
    request: "Please provide a clear copy or confirm the stated figure and its context.",
    forbiddenInference: "That the source is false, altered, or incorrect.",
  },
  same_claim: {
    statement: "The selected entries appear to refer to the same source claim.",
    request: "Please provide a separate record or figure if another comparison was intended.",
    forbiddenInference: "That a second figure exists or differs.",
  },
  different_concept: {
    statement: "The figures appear to describe different types of charge or contribution.",
    request: "Please explain what each figure represents and which records should be considered together.",
    forbiddenInference: "That the concepts are equivalent or that either amount is wrong.",
  },
  missing_concept_context: {
    statement: "One figure does not clearly state what it describes.",
    request: "Please explain what the figure represents and provide a breakdown or supporting record.",
    forbiddenInference: "The missing concept or how it relates to the other figure.",
  },
  recurring_vs_adjustment: {
    statement: "One figure appears recurring and the other appears to be an adjustment.",
    request: "Please explain the basis and applicable period of each figure.",
    forbiddenInference: "That the adjustment should be added, subtracted, refunded, or compared directly.",
  },
  retrospective_adjustment: {
    statement: "A retrospective adjustment cannot be directly compared with a recurring figure.",
    request: "Please confirm which period the adjustment covers and how it relates to the recurring figure.",
    forbiddenInference: "The arithmetic or financial effect of the adjustment.",
  },
  missing_adjustment_context: {
    statement: "There is insufficient information about an adjustment.",
    request: "Please explain what the adjustment is for, which period it covers, and how it was calculated.",
    forbiddenInference: "Whether the adjustment is valid, payable, or refundable.",
  },
  different_subject: {
    statement: "The records appear to concern different people.",
    request: "Please identify whom each record concerns and provide the matching records.",
    forbiddenInference: "That either record belongs to the user or should be transferred.",
  },
  missing_subject_context: {
    statement: "The records do not establish that they concern the same person.",
    request: "Please confirm whom each record concerns.",
    forbiddenInference: "Identity, sameness, entitlement, or account ownership.",
  },
  different_provider: {
    statement: "The records appear to concern different providers.",
    request: "Please confirm which provider issued or applies to each record and which records should be compared.",
    forbiddenInference: "A recipient identity, provider error, or provider responsibility.",
  },
  missing_provider_context: {
    statement: "The records do not establish that they concern the same provider.",
    request: "Please confirm the provider associated with each figure.",
    forbiddenInference: "A provider name from an opaque ID, document name, or ordering.",
  },
  different_payer_role: {
    statement: "The records identify different payer roles.",
    request: "Please confirm who is recorded as the payer for each payment or contribution.",
    forbiddenInference: "Liability, who ought to pay, or that one role is incorrect.",
  },
  missing_payer_context: {
    statement: "Payer information is missing or unclear.",
    request: "Please confirm who the recorded payer is for each figure.",
    forbiddenInference: "The payer's identity or legal or payment responsibility.",
  },
  different_payee_role: {
    statement: "The records identify different payee roles.",
    request: "Please confirm who receives each recorded payment or contribution.",
    forbiddenInference: "That either payee is incorrect or must return money.",
  },
  missing_payee_context: {
    statement: "Payee information is missing or unclear.",
    request: "Please confirm who receives each figure or contribution.",
    forbiddenInference: "The payee's identity, entitlement, or liability.",
  },
  different_currency: {
    statement: "The figures are stated in different currencies and were not directly compared.",
    request: "Please confirm which currency applies to each figure and provide matching records if appropriate.",
    forbiddenInference: "An exchange rate, converted amount, difference, or preferred currency.",
  },
  missing_currency_context: {
    statement: "Currency information is missing or unclear.",
    request: "Please confirm which currency applies to each figure.",
    forbiddenInference: "A currency from symbols, locale, provider, or surrounding assumptions.",
  },
  different_cadence: {
    statement: "The figures use different stated payment periods.",
    request: "Please confirm which cadence applies and provide a breakdown for each period.",
    forbiddenInference: "A converted rate, normalised amount, or direct difference.",
  },
  missing_cadence_context: {
    statement: "One source does not clearly state how often its amount applies.",
    request: "Please confirm how often the amount applies and provide the relevant record or breakdown.",
    forbiddenInference: "Weekly, monthly, four-weekly, one-off, or invoice-period cadence.",
  },
  non_overlapping_periods: {
    statement: "The stated periods do not overlap.",
    request: "Please confirm which figure applies to which period and whether a record for a common period exists.",
    forbiddenInference: "A common period, date range, or direct difference.",
  },
  different_effective_dates: {
    statement: "The figures have different stated effective dates.",
    request: "Please confirm which rate applies from each date and explain the basis for any change.",
    forbiddenInference: "That either date is wrong, an unstated transition date, or a difference for a common date.",
  },
  missing_period_context: {
    statement: "Period or effective-date information is missing or unclear.",
    request: "Please provide the period or effective date for each figure.",
    forbiddenInference: "Any missing date, overlap, duration, or applicability.",
  },
} as const satisfies Readonly<Record<ComparabilityReason, CareFeeNscDraftRuleV1>>;

const NSC_RATE_OR_PERIOD_REASONS = new Set<ComparabilityReason>([
  "recurring_vs_adjustment",
  "retrospective_adjustment",
  "missing_adjustment_context",
  "different_cadence",
  "missing_cadence_context",
  "non_overlapping_periods",
  "different_effective_dates",
  "missing_period_context",
]);

const FAILURE_MESSAGES: Readonly<Record<CareFeeDraftPreparationFailureReason, string>> = {
  malformed_request: "This draft request could not be read safely. No draft was prepared.",
  unexpected_field: "This draft request contained unsupported information. No draft was prepared.",
  invalid_saved_case: "This saved Care Fee case could not be verified. No draft was prepared.",
  unsupported_intent: "That message purpose is not supported. No draft was prepared.",
  unsupported_state_intent: "That message purpose is not available for this comparison result.",
  invalid_recipient: "The optional recipient label is not valid. Review it and try again.",
  invalid_nsc_blockers: "The saved comparison blockers could not be verified. No draft was prepared.",
  missing_source_fact: "The saved source facts needed for this message are incomplete. No draft was prepared.",
  invalid_generation_metadata: "The draft could not be identified safely. No draft was prepared.",
  unsafe_output: "The prepared wording did not pass the Care Fee safety checks. No draft is shown.",
  unexpected_error: "AdminAvenger could not prepare this message safely. No draft was prepared.",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
};

const failure = (
  reason: CareFeeDraftPreparationFailureReason,
): Extract<CareFeeDraftContextValidation, { readonly valid: false }> => ({
  valid: false,
  reason,
  message: FAILURE_MESSAGES[reason],
});

const preparationFailure = (
  reason: CareFeeDraftPreparationFailureReason,
): Extract<CareFeeDraftPreparationOutcome, { readonly status: "failed" }> => ({
  status: "failed",
  reason,
  message: FAILURE_MESSAGES[reason],
});

const intentSet = new Set<string>(CARE_FEE_DRAFT_INTENTS);

const normalizeRecipient = (value: unknown): CareFeeDraftRecipientV1 | undefined => {
  if (!isRecord(value) || !hasExactKeys(value, ["label", "origin"]) ||
      value.origin !== "user_entered_drafting_input" || typeof value.label !== "string") {
    return undefined;
  }
  const label = value.label.trim();
  const hasControlCharacter = [...label].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159));
  });
  if (label.length === 0 || [...label].length > 80 || hasControlCharacter) {
    return undefined;
  }
  return { label, origin: "user_entered_drafting_input" };
};

const nscBlockersAreConsistent = (caseRecord: CareFeeComparisonCaseV1): boolean => {
  if (caseRecord.reconciliation.state !== "not_safely_comparable") return true;
  const { reasons } = caseRecord.reconciliation;
  if (reasons.length === 0 || new Set(reasons).size !== reasons.length ||
      caseRecord.blockingExplanations.length !== reasons.length) {
    return false;
  }
  return reasons.every(
    (reason, index) =>
      COMPARABILITY_REASONS.includes(reason) &&
      caseRecord.blockingExplanations[index] === RECONCILIATION_REASON_EXPLANATIONS[reason],
  );
};

const isIntentAllowed = (
  caseRecord: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
): boolean => {
  const reconciliation = caseRecord.reconciliation;
  if (reconciliation.state === "agreement") {
    return intent === "confirm_or_break_down_figure" || intent === "clarify_rate_or_period";
  }
  if (reconciliation.state === "disagreement") {
    return intent === "confirm_or_break_down_figure" ||
      intent === "explain_comparison_difference" ||
      intent === "clarify_rate_or_period";
  }
  if (intent === "request_missing_information") return reconciliation.reasons.length > 0;
  return intent === "clarify_rate_or_period" &&
    reconciliation.reasons.some((reason) => NSC_RATE_OR_PERIOD_REASONS.has(reason));
};

export const getAllowedCareFeeDraftIntents = (
  value: unknown,
): readonly CareFeeDraftIntentV1[] => {
  const validation = validateCareFeeComparisonCase(value);
  if (!validation.valid || !nscBlockersAreConsistent(validation.caseRecord)) return [];
  return CARE_FEE_DRAFT_INTENTS.filter((intent) => isIntentAllowed(validation.caseRecord, intent));
};

const sourceFactBase = (
  record: CareFeeComparisonCaseV1["sourceRecords"][number],
): CareFeeDraftSourceFactBaseV1 => ({
  partition: "source_fact",
  recordLabel: record.recordLabel,
  claimId: record.claim.id,
  sourceDocumentId: record.document.id,
  ...(record.sourceLocation.sourceSegmentId
    ? { sourceSegmentId: record.sourceLocation.sourceSegmentId }
    : {}),
});

const sourceFactsOf = (
  caseRecord: CareFeeComparisonCaseV1,
): readonly CareFeeDraftSourceFactV1[] =>
  caseRecord.sourceRecords.flatMap((record) => {
    const base = sourceFactBase(record);
    const reference: CareFeeDraftSourceFactV1 = {
      ...base,
      field: "document_reference",
      value: record.document.displayName,
    };
    if (caseRecord.reconciliation.state === "not_safely_comparable") return [reference];
    return [
      reference,
      {
        ...base,
        field: "amount_minor",
        value: record.claim.amountMinor,
        currency: record.claim.currency,
      },
      { ...base, field: "cadence", value: record.claim.cadence },
    ];
  });

const cloneUserContext = (context: UserConfirmedCareFeeContext): UserConfirmedCareFeeContext =>
  "answer" in context
    ? { ...context, appliesToClaimIds: [...context.appliesToClaimIds] }
    : { ...context, appliesToClaimIds: [context.appliesToClaimIds[0]] };

const userConfirmedFactsOf = (
  caseRecord: CareFeeComparisonCaseV1,
): readonly CareFeeDraftUserConfirmedFactV1[] =>
  caseRecord.userConfirmedContext.map((context, contextIndex) => ({
    partition: "user_confirmed_fact",
    contextIndex,
    context: cloneUserContext(context),
  }));

const cloneApplicability = (value: ComparableApplicability): ComparableApplicability => ({ ...value });

const derivedFactsOf = (
  caseRecord: CareFeeComparisonCaseV1,
  intent: CareFeeDraftIntentV1,
): CareFeeDraftDerivedComparisonFactsV1 => {
  const reconciliation = caseRecord.reconciliation;
  if (reconciliation.state === "agreement") {
    return {
      partition: "derived_comparison_fact",
      state: reconciliation.state,
      claimIds: [...reconciliation.claimIds],
      amountMinor: reconciliation.amountMinor,
      currency: reconciliation.currency,
      cadence: reconciliation.cadence,
      applicability: cloneApplicability(reconciliation.applicability),
    };
  }
  if (reconciliation.state === "disagreement") {
    return {
      partition: "derived_comparison_fact",
      state: reconciliation.state,
      claimIds: [...reconciliation.claimIds],
      amountsMinor: [...reconciliation.amountsMinor],
      differenceMinor: reconciliation.differenceMinor,
      differenceKind: reconciliation.differenceKind,
      currency: reconciliation.currency,
      cadence: reconciliation.cadence,
      applicability: cloneApplicability(reconciliation.applicability),
    };
  }
  const included = reconciliation.reasons.flatMap((reason, index) =>
    intent === "clarify_rate_or_period" && !NSC_RATE_OR_PERIOD_REASONS.has(reason)
      ? []
      : [{ reason, explanation: caseRecord.blockingExplanations[index] }],
  );
  return {
    partition: "derived_comparison_fact",
    state: reconciliation.state,
    claimIds: [...reconciliation.claimIds],
    reasons: included.map(({ reason }) => reason),
    blockingExplanations: included.map(({ explanation }) => explanation),
  };
};

const contextOf = (
  request: CareFeeDraftPreparationRequestV1,
): ValidatedCareFeeDraftPreparationContextV1 => ({
  kind: "validated_care_fee_draft_preparation_context",
  version: 1,
  caseId: request.savedCase.id,
  intent: request.intent,
  sourceFacts: sourceFactsOf(request.savedCase),
  userConfirmedFacts: userConfirmedFactsOf(request.savedCase),
  derivedComparisonFacts: derivedFactsOf(request.savedCase, request.intent),
  ...(request.recipient ? { recipient: { ...request.recipient } } : {}),
});

export const validateCareFeeDraftPreparationRequest = (
  value: unknown,
): CareFeeDraftContextValidation => {
  if (!isRecord(value)) return failure("malformed_request");
  const expectedKeys = ["kind", "version", "savedCase", "intent"];
  if (value.recipient !== undefined) expectedKeys.push("recipient");
  if (!hasExactKeys(value, expectedKeys)) return failure("unexpected_field");
  if (value.kind !== "care_fee_draft_preparation_request" || value.version !== 1) {
    return failure("malformed_request");
  }
  if (typeof value.intent !== "string" || !intentSet.has(value.intent)) {
    return failure("unsupported_intent");
  }
  const caseValidation = validateCareFeeComparisonCase(value.savedCase);
  if (!caseValidation.valid) return failure("invalid_saved_case");
  if (!nscBlockersAreConsistent(caseValidation.caseRecord)) {
    return failure("invalid_nsc_blockers");
  }
  const intent = value.intent as CareFeeDraftIntentV1;
  if (!isIntentAllowed(caseValidation.caseRecord, intent)) {
    return failure("unsupported_state_intent");
  }
  const recipient = value.recipient === undefined ? undefined : normalizeRecipient(value.recipient);
  if (value.recipient !== undefined && !recipient) return failure("invalid_recipient");
  const request: CareFeeDraftPreparationRequestV1 = {
    kind: "care_fee_draft_preparation_request",
    version: 1,
    savedCase: caseValidation.caseRecord,
    intent,
    ...(recipient ? { recipient } : {}),
  };
  const context = contextOf(request);
  if (context.sourceFacts.length < 2) return failure("missing_source_fact");
  return { valid: true, request, context };
};

const cadencePhrase = (cadence: ClaimCadence): string => {
  switch (cadence) {
    case "weekly":
      return "per week";
    case "four_weekly":
      return "every four weeks";
    case "monthly":
      return "per month";
    case "invoice_period_total":
      return "for the stated invoice period";
    case "one_off":
      return "as a one-off amount";
    case "unknown":
      return "with no stated payment period";
  }
};

export const formatCareFeeDraftApplicability = (value: ComparableApplicability): string => {
  if (value.kind === "same_effective_date") {
    return `with the same stated effective date of ${value.effectiveDate}`;
  }
  if (value.kind === "same_explicit_period") {
    return `for the stated period from ${value.periodStart} to ${value.periodEnd}`;
  }
  return `for the overlapping stated period from ${value.periodStart} to ${value.periodEnd}`;
};

const amountWithCadence = (
  amountMinor: number,
  currency: ClaimCurrency,
  cadence: ClaimCadence,
): string => `${formatCareFeeMinorAmount(amountMinor, currency)} ${cadencePhrase(cadence)}`;

const amountFactFor = (
  context: ValidatedCareFeeDraftPreparationContextV1,
  recordLabel: "Record 1" | "Record 2",
): Extract<CareFeeDraftSourceFactV1, { readonly field: "amount_minor" }> | undefined =>
  context.sourceFacts.find(
    (fact): fact is Extract<CareFeeDraftSourceFactV1, { readonly field: "amount_minor" }> =>
      fact.recordLabel === recordLabel && fact.field === "amount_minor",
  );

const cadenceFactFor = (
  context: ValidatedCareFeeDraftPreparationContextV1,
  recordLabel: "Record 1" | "Record 2",
): Extract<CareFeeDraftSourceFactV1, { readonly field: "cadence" }> | undefined =>
  context.sourceFacts.find(
    (fact): fact is Extract<CareFeeDraftSourceFactV1, { readonly field: "cadence" }> =>
      fact.recordLabel === recordLabel && fact.field === "cadence",
  );

const sourceDescription = (
  context: ValidatedCareFeeDraftPreparationContextV1,
  recordLabel: "Record 1" | "Record 2",
): string | undefined => {
  const amount = amountFactFor(context, recordLabel);
  const cadence = cadenceFactFor(context, recordLabel);
  return amount && cadence
    ? amountWithCadence(amount.value, amount.currency, cadence.value)
    : undefined;
};

const uniqueMappedText = (
  reasons: readonly ComparabilityReason[],
  field: "statement" | "request",
): readonly string[] => {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const reason of reasons) {
    const value = CARE_FEE_NSC_DRAFT_RULES[reason][field];
    if (!seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
};

type PreparedText = {
  readonly subject: string;
  readonly body: string;
};

const greetingOf = (context: ValidatedCareFeeDraftPreparationContextV1): string =>
  context.recipient ? `Hello ${context.recipient.label},` : "Hello,";

const comparablePreparedText = (
  context: ValidatedCareFeeDraftPreparationContextV1,
): PreparedText | undefined => {
  const derived = context.derivedComparisonFacts;
  if (derived.state === "not_safely_comparable") return undefined;
  const first = sourceDescription(context, "Record 1");
  const second = sourceDescription(context, "Record 2");
  if (!first || !second) return undefined;
  const applicability = formatCareFeeDraftApplicability(derived.applicability);
  const greeting = greetingOf(context);

  if (derived.state === "agreement") {
    const request = context.intent === "confirm_or_break_down_figure"
      ? "Please confirm the figure and provide a breakdown of how it was reached."
      : "Please confirm the applicable rate or period and explain the basis for it.";
    return {
      subject: context.intent === "confirm_or_break_down_figure"
        ? "Request for a care fee figure breakdown"
        : "Request to clarify an applicable care fee figure",
      body: [
        greeting,
        "",
        "I am writing to ask for clarification about two care fee records.",
        "",
        `Record 1 shows ${first}, and Record 2 shows ${second}. The two safely comparable figures agree ${applicability}.`,
        "",
        request,
        "",
        "Please reply with the relevant explanation or record details when you can.",
        "",
        "Kind regards,",
      ].join("\n"),
    };
  }

  const difference = amountWithCadence(
    derived.differenceMinor,
    derived.currency,
    derived.cadence,
  );
  const request = context.intent === "confirm_or_break_down_figure"
    ? "Please provide a breakdown of both figures and explain the basis for each."
    : context.intent === "explain_comparison_difference"
      ? "Please explain why the figures differ and confirm which figure applies and the basis for it."
      : "Please confirm which figure applies and explain the applicable rate or period.";
  const subject = context.intent === "confirm_or_break_down_figure"
    ? "Request for a breakdown of care fee figures"
    : context.intent === "explain_comparison_difference"
      ? "Request for an explanation of care fee figures"
      : "Request to clarify an applicable care fee figure";
  return {
    subject,
    body: [
      greeting,
      "",
      "I am writing to ask for clarification about two care fee records.",
      "",
      `Record 1 shows ${first}, and Record 2 shows ${second}. The figures were safely comparable ${applicability}.`,
      `The absolute difference between the two safely comparable figures is ${difference}.`,
      "",
      request,
      "",
      "Please reply with the relevant explanation or record details when you can.",
      "",
      "Kind regards,",
    ].join("\n"),
  };
};

const nscPreparedText = (
  context: ValidatedCareFeeDraftPreparationContextV1,
): PreparedText | undefined => {
  const derived = context.derivedComparisonFacts;
  if (derived.state !== "not_safely_comparable") return undefined;
  const relevantReasons = context.intent === "clarify_rate_or_period"
    ? derived.reasons.filter((reason) => NSC_RATE_OR_PERIOD_REASONS.has(reason))
    : derived.reasons;
  if (relevantReasons.length === 0) return undefined;
  const statements = uniqueMappedText(relevantReasons, "statement");
  const requests = uniqueMappedText(relevantReasons, "request");
  return {
    subject: context.intent === "clarify_rate_or_period"
      ? "Request to clarify care fee rates or periods"
      : "Request for information about care fee records",
    body: [
      greetingOf(context),
      "",
      "I am writing about two care fee records that could not be safely compared.",
      "",
      statements.join(" "),
      "",
      requests.join(" "),
      "",
      "Please reply with the requested information when you can.",
      "",
      "Kind regards,",
    ].join("\n"),
  };
};

const derivedFieldsOf = (
  facts: CareFeeDraftDerivedComparisonFactsV1,
): readonly CareFeeDraftDerivedFieldV1[] => {
  if (facts.state === "agreement") {
    return ["state", "amount_minor", "currency", "cadence", "applicability"];
  }
  if (facts.state === "disagreement") {
    return [
      "state",
      "amounts_minor",
      "difference_minor",
      "difference_kind",
      "currency",
      "cadence",
      "applicability",
    ];
  }
  return ["state", "reasons", "blocking_explanations"];
};

const auditOf = (
  context: ValidatedCareFeeDraftPreparationContextV1,
): CareFeePreparedDraftV1["audit"] => ({
  templateVersion: 1,
  sourceFactReferences: context.sourceFacts.map((fact) => ({
    partition: fact.partition,
    recordLabel: fact.recordLabel,
    claimId: fact.claimId,
    field: fact.field,
    sourceDocumentId: fact.sourceDocumentId,
    ...(fact.sourceSegmentId ? { sourceSegmentId: fact.sourceSegmentId } : {}),
  })),
  userConfirmedFactReferences: context.userConfirmedFacts.map((fact) => ({
    partition: fact.partition,
    contextIndex: fact.contextIndex,
    dimension: fact.context.dimension,
    appliesToClaimIds: [...fact.context.appliesToClaimIds],
  })),
  derivedFactReferences: derivedFieldsOf(context.derivedComparisonFacts).map((field) => ({
    partition: "derived_comparison_fact",
    field,
    claimIds: [...context.derivedComparisonFacts.claimIds],
  })),
  userEnteredInputReferences: context.recipient
    ? [{ partition: "user_entered_drafting_input", field: "recipient_label" }]
    : [],
});

const PROHIBITED_ASSERTION_PATTERNS = [
  /\bovercharg\w*\b/i,
  /\byou owe\b/i,
  /\bamount owed\b/i,
  /\brefund (?:is )?due\b/i,
  /\brefund me\b/i,
  /\breimburse\w*\b/i,
  /\bunlawful\b/i,
  /\billegal\b/i,
  /\bliab(?:le|ility)\b/i,
  /\bentitlement\b/i,
  /\bentitled\b/i,
  /\binvoice is incorrect\b/i,
  /\b(?:invoice|figure|amount) (?:is|was) wrong\b/i,
  /\b(?:over|under)payment\b/i,
  /\bmust pay\b/i,
  /\bpay within\b/i,
  /\blegal action\b/i,
  /\bcompensation\b/i,
  /\bmoney recovered\b/i,
  /\brecover(?:y|ed|able)\b/i,
  /\bsavings\b/i,
  /\bmoney at stake\b/i,
  /\b(?:is|are|was|were) (?:not )?correct\b/i,
  /\bincorrect\b/i,
  /\bat fault\b/i,
] as const;

const MONEY_TEXT_PATTERN = /\bGBP\s+\d{1,3}(?:,\d{3})*\.\d{2}\b/g;

export type CareFeePreparedTextSafety =
  | { readonly safe: true }
  | { readonly safe: false; readonly reason: "prohibited_language" | "unsupported_money" | "invalid_difference_wording" | "unresolved_template" };

export const validateCareFeePreparedTextSafety = (
  prepared: PreparedText,
  context: ValidatedCareFeeDraftPreparationContextV1,
): CareFeePreparedTextSafety => {
  const combined = `${prepared.subject}\n${prepared.body}`;
  if (PROHIBITED_ASSERTION_PATTERNS.some((pattern) => pattern.test(combined))) {
    return { safe: false, reason: "prohibited_language" };
  }
  if (/\{[A-Za-z][^}]*\}/.test(combined)) {
    return { safe: false, reason: "unresolved_template" };
  }
  const allowedMoney = new Set(
    context.sourceFacts.flatMap((fact) =>
      fact.field === "amount_minor"
        ? [formatCareFeeMinorAmount(fact.value, fact.currency)]
        : [],
    ),
  );
  const derived = context.derivedComparisonFacts;
  if (derived.state === "disagreement") {
    allowedMoney.add(formatCareFeeMinorAmount(derived.differenceMinor, derived.currency));
  }
  const moneyValues = combined.match(MONEY_TEXT_PATTERN) ?? [];
  if (moneyValues.some((value) => !allowedMoney.has(value))) {
    return { safe: false, reason: "unsupported_money" };
  }
  if (derived.state === "disagreement") {
    const exactDifference = `The absolute difference between the two safely comparable figures is ${amountWithCadence(
      derived.differenceMinor,
      derived.currency,
      derived.cadence,
    )}.`;
    if (!prepared.body.includes(exactDifference)) {
      return { safe: false, reason: "invalid_difference_wording" };
    }
  } else if (/absolute difference/i.test(prepared.body)) {
    return { safe: false, reason: "invalid_difference_wording" };
  }
  return { safe: true };
};

export const prepareCareFeeDraft = (
  value: unknown,
  metadata: { readonly id?: string; readonly now?: string } = {},
): CareFeeDraftPreparationOutcome => {
  try {
    const validation = validateCareFeeDraftPreparationRequest(value);
    if (!validation.valid) {
      return { status: "failed", reason: validation.reason, message: validation.message };
    }
    const id = metadata.id ?? `care-fee-prepared-draft-${crypto.randomUUID()}`;
    const createdAt = metadata.now ?? new Date().toISOString();
    if (id.trim().length === 0 || Number.isNaN(Date.parse(createdAt))) {
      return preparationFailure("invalid_generation_metadata");
    }
    const prepared = validation.context.derivedComparisonFacts.state === "not_safely_comparable"
      ? nscPreparedText(validation.context)
      : comparablePreparedText(validation.context);
    if (!prepared) return preparationFailure("missing_source_fact");
    const safety = validateCareFeePreparedTextSafety(prepared, validation.context);
    if (!safety.safe) return preparationFailure("unsafe_output");
    const draft: CareFeePreparedDraftV1 = {
      kind: "care_fee_prepared_draft",
      version: 1,
      id,
      caseId: validation.context.caseId,
      intent: validation.context.intent,
      ...(validation.context.recipient ? { recipient: { ...validation.context.recipient } } : {}),
      preparedSubject: prepared.subject,
      preparedBody: prepared.body,
      createdAt,
      audit: auditOf(validation.context),
      safetyBoundary: "preparation_only_no_send_no_claim_conclusion",
    };
    return { status: "prepared", draft, context: validation.context };
  } catch {
    return preparationFailure("unexpected_error");
  }
};
