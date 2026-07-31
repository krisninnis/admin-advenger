import type {
  PublicMessageCategory,
  PublicMessageExpectedBehaviour,
  PublicMessageRisk,
  PublicMessageScenario,
  PublicMessageSourceFacts,
} from "./types";
import { PUBLIC_MESSAGE_CORPUS_VERSION } from "./types";

type Seed = {
  subcategory: string;
  message: string;
  userQuestion?: string;
  risk?: PublicMessageRisk;
  sourceFacts?: PublicMessageSourceFacts;
  expected?: Partial<PublicMessageExpectedBehaviour>;
  browserRepresentative?: boolean;
  metamorphicGroup?: string;
};

const unique = <T>(items: readonly T[]) => [...new Set(items)];

const sourceSentenceFor = (message: string, index: number) => {
  const start = Math.max(
    message.lastIndexOf(".", index - 1),
    message.lastIndexOf("\n", index - 1),
  );
  const periodEnd = message.indexOf(".", index);
  const lineEnd = message.indexOf("\n", index);
  const ends = [periodEnd, lineEnd].filter((value) => value >= 0);
  const end = ends.length > 0 ? Math.min(...ends) : message.length;
  return message.slice(start + 1, end).replace(/\s+/g, " ").trim();
};

const deriveSourceFacts = (message: string): PublicMessageSourceFacts => {
  const dates = unique([
    ...message.matchAll(/\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) 20\d{2}(?: at \d{1,2}:\d{2})?\b/gi),
  ].map((match) => match[0]));
  const relativePeriods = unique([
    ...message.matchAll(/\b(?:within|for|after) (?:\d+|one|two|three|four|five|six|seven|ten|twelve|fourteen|fifteen|twenty-one) (?:working |calendar )?(?:days?|months?|weeks?)\b/gi),
  ].map((match) => match[0]));
  const amounts = [...message.matchAll(/(?:£|GBP\s*)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi)].map(
    (match) => ({
      value: Number(match[1].replaceAll(",", "")),
      currency: "GBP" as const,
      role: sourceSentenceFor(message, match.index ?? 0),
    }),
  );
  const references = unique([
    ...message.matchAll(/\b[A-Z]{2,}[A-Z0-9]*(?:[-/]\d+[A-Z0-9/-]*|\d+[A-Z0-9/-]*)\b/g),
  ].map((match) => match[0]).filter((value) => !/^GBP$/i.test(value)));
  const dependencies = unique([
    /\b(?:under review|reviewing|being reviewed|investigat(?:e|ed|ing)|no decision|outcome is not decided|not yet been reviewed)\b/i.test(message)
      ? "review decision pending"
      : undefined,
    /\bcomplaint remains open|\bcomplaint is under investigation\b/i.test(message)
      ? "complaint response pending"
      : undefined,
    /\b(?:send|provide|upload|return)\b[^.\n]*(?:document|evidence|form|photos?|invoice|statement|death certificate|fit note)/i.test(message)
      ? "document or evidence required"
      : undefined,
    /\b(?:due|payable|pay|payment|reply|respond|contact|return|send|upload)\b[^.\n]*\b(?:by|on) \d{1,2} /i.test(message)
      ? "deadline remains open"
      : undefined,
    /\b(?:final )?direct debit\b[^.\n]*\b(?:will|may) (?:be )?collected\b/i.test(message)
      ? "final Direct Debit pending"
      : undefined,
    /\brefund\b[^.\n]*\b(?:will|may)\b[^.\n]*\b(?:within|after)\b|\brefund\b[^.\n]*\bnot yet (?:been )?(?:issued|received)\b/i.test(message)
      ? "refund not yet received"
      : undefined,
    /\b(?:authority|department|provider|council|team)\b[^.\n]*\b(?:review|decision|respond|update)\b/i.test(message)
      ? "authority response pending"
      : undefined,
    /\bmay become payable|\bcould become payable|\bpossible future balance\b/i.test(message)
      ? "future liability decision pending"
      : undefined,
  ].filter((value): value is string => Boolean(value)));
  const statusIndicators = unique([
    ...message.matchAll(/\b(?:closed|cancelled|resolved|confirmed|pending|active|open|under review|approved|issued|received|refused|rejected|upheld|outstanding|payable|due|no action is required|no payment is required)\b/gi),
  ].map((match) => match[0]));

  return {
    ...(dates.length > 0 ? { dates } : {}),
    ...(relativePeriods.length > 0 ? { relativePeriods } : {}),
    ...(amounts.length > 0 ? { amounts } : {}),
    ...(references.length > 0 ? { references } : {}),
    ...(dependencies.length > 0 ? { dependencies } : {}),
    ...(statusIndicators.length > 0 ? { statusIndicators } : {}),
  };
};

const mergeSourceFacts = (
  derived: PublicMessageSourceFacts,
  declared: PublicMessageSourceFacts = {},
): PublicMessageSourceFacts => ({
  dates: unique([...(derived.dates ?? []), ...(declared.dates ?? [])]),
  relativePeriods: unique([...(derived.relativePeriods ?? []), ...(declared.relativePeriods ?? [])]),
  amounts: [
    ...(derived.amounts ?? []),
    ...(declared.amounts ?? []).filter(
      (declaredAmount) =>
        !(derived.amounts ?? []).some(
          (derivedAmount) =>
            derivedAmount.value === declaredAmount.value && derivedAmount.role === declaredAmount.role,
        ),
    ),
  ],
  references: unique([...(derived.references ?? []), ...(declared.references ?? [])]),
  dependencies: unique([...(derived.dependencies ?? []), ...(declared.dependencies ?? [])]),
  statusIndicators: unique([...(derived.statusIndicators ?? []), ...(declared.statusIndicators ?? [])]),
});

const semanticConceptsFor = (subcategory: string, message: string) => {
  const special: Record<string, readonly (string | readonly string[])[]> = {
    uc_appointment: ["Universal Credit", "appointment"],
    contrast_but: ["closed", ["under review", "still being reviewed"]],
    contrast_however: ["cancelled", "final Direct Debit"],
    contrast_although: ["closed", ["not yet decided", "under review"]],
    until_condition: ["remains active", "document"],
    unless_condition: ["collection", "unless"],
    today_scope: [["not requested today", "no payment is required today"], ["payable later", "become payable"]],
    currently_scope: ["on hold", "disputed"],
    not_yet_scope: ["not yet ended", "cancellation"],
    may_modal: ["may", "remove"],
    will_modal: ["will", "remove"],
    could_modal: ["could", "collection"],
    after_review: ["after review", ["no payment is due now", "not requested today"]],
    within_days: ["within 12 days", "follow up"],
    within_working_days: ["12 working days", "not 12 calendar days"],
    multiple_dates: ["2 August 2026", "1 September 2026", "20 August 2026"],
    several_amounts: ["former balance", "current disputed balance", "payment is recorded"],
    current_former_balances: ["former balance", "current final charge", "under review"],
    mixed_deadlines: ["19 August 2026", "10 working days"],
    reference_formats: ["AB-10482", "Q7/2026/19", "CASE99-X"],
    positive_then_limit: ["account is closed", "complaint", "credit review"],
    contradictory_wording: ["contradictory", "clarify"],
    ocr_formatting: ["under review", "OCR-62-A", "no decision"],
  };
  if (special[subcategory]) {
    return special[subcategory];
  }

  const phrase = subcategory.replaceAll("_", " ");
  const tokens = phrase
    .split(" ")
    .filter((token) => !["wording", "notice", "message", "exact", "later"].includes(token));
  const concepts: (string | readonly string[])[] = [];
  if (tokens.length > 0) {
    concepts.push(tokens.join(" "));
  }
  if (/\bno (?:action|reply|response|payment) (?:is )?(?:required|needed|due)\b/i.test(message)) {
    concepts.push(["no action", "no reply", "no response", "no payment"]);
  }
  return concepts;
};

const titleConceptsFor = (
  category: PublicMessageCategory,
  subcategory: string,
): readonly (string | readonly string[])[] => {
  if (category === "security_scams") {
    return [["email needs safety check", "email safety check"]];
  }
  if (category === "benefits_public_administration" || category === "employment_income" || category === "housing_utilities") {
    return [["careful human review", "important reply", "deadline", "account", "bill", "renewal"]];
  }
  if (subcategory.includes("refund")) {
    return [["refund", "money back"]];
  }
  if (subcategory.includes("complaint") || category === "complaints_disputes") {
    return [["complaint", "dispute"]];
  }
  if (category === "bereavement_general") {
    return [["account", "payment reminder", "careful human review"]];
  }
  if (category === "neutral_low_action") {
    return [["no obvious saving or action", "proof of purchase", "deadline", "information"]];
  }
  return [["bill", "account", "subscription", "payment", "charge", "deadline", "delivery"]];
};

const classifyAmountRole = (role: string) => {
  if (/\b(?:former|cancelled|removed|no payment)\b/i.test(role)) return "former_balance" as const;
  if (/\brefund\b.*\b(?:will|promis|within|may)\b/i.test(role)) return "refund_promised" as const;
  if (/\brefund\b.*\bissued\b/i.test(role)) return "refund_issued" as const;
  if (/\brefund\b.*\b(?:received|reached)\b/i.test(role)) return "refund_received" as const;
  if (/\bstore credit\b/i.test(role)) return "store_credit" as const;
  if (/\bdirect debit\b/i.test(role)) return "automatic_collection" as const;
  if (/\b(?:subscription|monthly|each month|instalments?)\b/i.test(role)) return "recurring_charge" as const;
  if (/\b(?:under review|disputed|not yet confirmed|possible future|may become payable)\b/i.test(role)) return "balance_under_review" as const;
  if (/\b(?:due|payable|pay |arrears|debt|outstanding|deduction|overpayment)\b/i.test(role)) return "amount_requested" as const;
  return "display_only" as const;
};

const assertionsFor = (
  expected: PublicMessageExpectedBehaviour,
  sourceFacts: PublicMessageSourceFacts,
) => [
  ...(expected.titleConcepts ?? []).map((concept) => ({
    type: "title_concept" as const,
    alternatives: typeof concept === "string" ? [concept] : concept,
  })),
  ...(expected.allowedStatuses ? [{ type: "status" as const, allowed: expected.allowedStatuses }] : []),
  ...(expected.opportunityTypes ? [{ type: "opportunity" as const, allowed: expected.opportunityTypes }] : []),
  ...(expected.nextStepKinds ? [{ type: "next_step" as const, allowed: expected.nextStepKinds }] : []),
  ...expected.requiredVisibleConcepts.map((concept) => ({
    type: "visible_concept" as const,
    alternatives: typeof concept === "string" ? [concept] : concept,
  })),
  ...expected.prohibitedVisibleConcepts.map((value) => ({ type: "prohibited_concept" as const, value })),
  ...(sourceFacts.dates ?? []).map((value) => ({ type: "source_date" as const, value })),
  ...(sourceFacts.relativePeriods ?? []).map((value) => ({ type: "source_period" as const, value })),
  ...(sourceFacts.references ?? []).map((value) => ({ type: "source_reference" as const, value })),
  ...(expected.amounts ?? []).map((amount) => ({
    type: "source_amount" as const,
    value: amount.value,
    classification: amount.classification,
  })),
  ...(sourceFacts.dependencies ?? []).map((value) => ({ type: "dependency" as const, value })),
  ...(expected.suggestOfficialVerification ? [{ type: "support_route" as const, kind: "official" as const }] : []),
  ...(expected.suggestIndependentSupport ? [{ type: "support_route" as const, kind: "independent" as const }] : []),
];

const prohibitedClaims = [
  "AdminAvenger has verified",
  "guaranteed outcome",
  "we contacted the organisation",
  "money has been counted as saved",
] as const;

const categoryDefaults: Record<
  PublicMessageCategory,
  Pick<PublicMessageExpectedBehaviour, "primaryMeaning" | "requiredVisibleConcepts">
> = {
  bills_accounts_services: {
    primaryMeaning: "A provider account or service message to check",
    requiredVisibleConcepts: [["bill", "account", "service", "provider", "price", "payment", "check", "review"]],
  },
  refunds_purchases: {
    primaryMeaning: "A purchase or refund position to check",
    requiredVisibleConcepts: [["refund", "purchase", "delivery", "warranty", "subscription", "return"]],
  },
  complaints_disputes: {
    primaryMeaning: "A complaint or dispute position to check",
    requiredVisibleConcepts: [["complaint", "response", "evidence", "review"]],
  },
  benefits_public_administration: {
    primaryMeaning: "A public-administration message requiring careful human review",
    requiredVisibleConcepts: [["check", "review", "prepare", "no action"]],
  },
  employment_income: {
    primaryMeaning: "An employment or income message requiring careful human review",
    requiredVisibleConcepts: [["check", "review", "prepare", "no action"]],
  },
  housing_utilities: {
    primaryMeaning: "A housing or household-service message to check carefully",
    requiredVisibleConcepts: [["careful human review", "specialist support", "bill", "service", "renewal"]],
  },
  bereavement_general: {
    primaryMeaning: "A provider message after a death, without Estate Administration activation",
    requiredVisibleConcepts: [["provider", "account", "balance", "payment", "document"]],
  },
  security_scams: {
    primaryMeaning: "A suspicious message that should be verified independently",
    requiredVisibleConcepts: [["official", "verify", "security", "warning signs", "not links"]],
  },
  neutral_low_action: {
    primaryMeaning: "A low-action informational message",
    requiredVisibleConcepts: [["no action", "keep", "check", "information"]],
  },
};

const makeScenarios = (
  category: PublicMessageCategory,
  seeds: readonly Seed[],
): PublicMessageScenario[] =>
  seeds.map((seed, index) => {
    const defaults = categoryDefaults[category];
    const sourceFacts = mergeSourceFacts(deriveSourceFacts(seed.message), seed.sourceFacts);
    const routeOutcome =
      seed.expected?.routeOutcome ??
      (category === "security_scams"
        ? "security_primary"
        : category === "benefits_public_administration" ||
            category === "employment_income" ||
            (category === "housing_utilities" && (seed.risk ?? "medium") === "high")
          ? "public_scope_boundary"
          : "general_public_flow");
    const amounts =
      seed.expected?.amounts ??
      (sourceFacts.amounts ?? []).map((amount) => ({
        value: amount.value,
        classification: classifyAmountRole(amount.role),
        sourceRole: amount.role,
        countedInMoneyTracker: false as const,
      }));
    const expected: PublicMessageExpectedBehaviour = {
      primaryMeaning: seed.expected?.primaryMeaning ?? defaults.primaryMeaning,
      titleConcepts: seed.expected?.titleConcepts ?? titleConceptsFor(category, seed.subcategory),
      routeOutcome,
      allowedStatuses: seed.expected?.allowedStatuses ?? ["new"],
      opportunityTypes: seed.expected?.opportunityTypes,
      requiredVisibleConcepts:
        seed.expected?.requiredVisibleConcepts ?? semanticConceptsFor(seed.subcategory, seed.message),
      prohibitedVisibleConcepts: unique([
        ...(seed.expected?.prohibitedVisibleConcepts ?? prohibitedClaims),
        ...(category === "neutral_low_action" ? [] : ["No obvious saving or action found"]),
      ]),
      expectedDates: seed.expected?.expectedDates ?? sourceFacts.dates,
      expectedRelativePeriods: seed.expected?.expectedRelativePeriods ?? sourceFacts.relativePeriods,
      expectedReferences: seed.expected?.expectedReferences ?? sourceFacts.references,
      amount: seed.expected?.amount,
      amounts,
      nextStepKinds: seed.expected?.nextStepKinds ?? ["draft_message"],
      allowedImpactTypes: seed.expected?.allowedImpactTypes,
      suggestOfficialVerification:
        seed.expected?.suggestOfficialVerification ?? category === "security_scams",
      suggestIndependentSupport:
        seed.expected?.suggestIndependentSupport ??
        ((category === "benefits_public_administration" ||
          category === "employment_income" ||
          category === "housing_utilities") &&
          (seed.risk ?? "medium") === "high"),
    };
    expected.assertions = assertionsFor(expected, sourceFacts);

    return {
      id: `${category}-${String(index + 1).padStart(2, "0")}-${seed.subcategory}`,
      corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
      category,
      subcategory: seed.subcategory,
      message: seed.message,
      userQuestion: seed.userQuestion,
      risk: seed.risk ?? "medium",
      sourceFacts,
      expected,
      rationale: `Exercises the public pipeline's handling of ${seed.subcategory.replaceAll("_", " ")} wording.`,
      provenance: {
        kind: seed.metamorphicGroup ? "metamorphic_variant" : "synthetic_pattern",
        sourcePattern: "Synthetic administrative-message pattern; no personal or customer data.",
      },
      browserRepresentative: seed.browserRepresentative,
      metamorphicGroup: seed.metamorphicGroup,
    };
  });

const bills = makeScenarios("bills_accounts_services", [
  { subcategory: "price_rise", message: "From 1 September 2026 your monthly service price will rise from £28 to £31. Reference PRICE-310." },
  { subcategory: "renewal_notice", message: "Your home cover renews on 18 September 2026 at £244. Review the terms before renewal. Reference REN-244." },
  { subcategory: "cancellation_confirmed", message: "Your service is cancelled. No further payments are due. Keep reference CAN-100." },
  { subcategory: "cancellation_pending", message: "We received your cancellation request, but your service remains active until 30 September 2026." },
  { subcategory: "account_closure", message: "We have closed your account. No further bills will be issued. Reference CLOSE-42." },
  { subcategory: "closure_conditional_documents", message: "We can close the account after you send the requested identity document by 19 August 2026. Reference DOC-190." },
  { subcategory: "balance_cancelled", message: "We have cancelled the former balance of £64.20. No payment is required." },
  { subcategory: "balance_still_owed", message: "The account is closed, but our letter says £78.40 remains payable by 20 August 2026." },
  { subcategory: "disputed_balance", message: "We recorded your dispute about the £315 balance. Collection is paused while we review it." },
  { subcategory: "waiver_requested", message: "We received your request to waive the £82 charge. No decision has been made." },
  { subcategory: "waiver_pending", message: "Your request to remove the £94 charge is still under review. We will respond within 14 days." },
  { subcategory: "waiver_refused", message: "After review, we have refused your request to waive the £51 charge. The balance remains due." },
  { subcategory: "final_bill", message: "This is your final bill for £43.17, due on 28 August 2026. Reference FINAL-4317." },
  { subcategory: "final_direct_debit", message: "One final Direct Debit of £29.50 will be collected on 3 September 2026." },
  { subcategory: "collection_warning", message: "Unless £160 is paid by 10 August 2026, the account may be referred for collection." , risk: "high"},
  { subcategory: "duplicate_charge", message: "Your statement shows two charges of £17.99 for the same service on 4 July 2026." },
  { subcategory: "billing_error", message: "We are investigating the billing error you reported. The shown balance is not yet confirmed." },
  { subcategory: "payment_plan", message: "Your payment plan is £25 each month for six months, starting 5 September 2026." },
  { subcategory: "arrears", message: "Your account is £125 in arrears. Contact us by 16 August 2026 to discuss the account." },
  { subcategory: "service_suspension", message: "Your service may be suspended on 22 August 2026 if the overdue bill remains unpaid." },
  { subcategory: "estimated_readings", message: "This energy bill uses estimated meter readings. Send a current reading if you want an updated bill." },
  { subcategory: "credit_balance", message: "Your account currently shows a £72 credit balance. This is not confirmation that a refund has been issued." },
  { subcategory: "provider_transfer", message: "Your broadband service will transfer to the new provider on 12 September 2026. Do not cancel the old service separately." },
]);

const refunds = makeScenarios("refunds_purchases", [
  { subcategory: "refund_requested", message: "We received your request for a £39 refund. It has not yet been reviewed." },
  { subcategory: "refund_refused", message: "We have refused the £39 refund request after reviewing the return." },
  {
    subcategory: "refund_promised",
    message: "We will refund £39 to the original payment method within 10 working days.",
    metamorphicGroup: "refund-modal",
    browserRepresentative: true,
    expected: {
      titleConcepts: ["Refund promised"],
      allowedStatuses: ["waiting"],
      opportunityTypes: ["refund_expected"],
      requiredVisibleConcepts: ["Refund promised", "not confirmed received", "10 working days"],
    },
  },
  { subcategory: "refund_approved", message: "Your £39 refund has been approved, but it has not yet been issued.", metamorphicGroup: "refund-stage" },
  { subcategory: "refund_issued", message: "Your £39 refund has been issued to the original payment method.", metamorphicGroup: "refund-stage" },
  { subcategory: "refund_received", message: "Thank you for confirming that the £39 refund reached your account." },
  { subcategory: "partial_refund", message: "We will refund £20 of the £55 purchase price. The remaining £35 is not included." },
  { subcategory: "store_credit", message: "We cannot issue a cash refund, but we have added £24 store credit to your account." },
  { subcategory: "return_deadline", message: "Return the unused item by 14 August 2026 if you want us to assess a refund." },
  { subcategory: "missing_parcel", message: "Tracking says delivered, but you reported that parcel PAR-551 was not received." },
  { subcategory: "damaged_item", message: "We received your report that the kettle arrived damaged. Send photos of the damage." },
  { subcategory: "warranty_issue", message: "Your repair request is being checked under the product warranty. Keep receipt WTY-490." },
  { subcategory: "chargeback_wording", message: "Your card provider has opened a chargeback review for £68. The outcome is not decided." },
  { subcategory: "subscription_renewal", message: "Your annual subscription renews for £79 on 25 August 2026 unless cancelled beforehand." },
  { subcategory: "free_trial_conversion", message: "Your free trial becomes a paid £12 monthly subscription on 9 August 2026 unless cancelled." },
  { subcategory: "cancellation_effective_later", message: "Your cancellation is confirmed and takes effect on 31 August 2026. Charges continue until then." },
  { subcategory: "refund_possible", message: "After review, we may refund £39 to the original payment method.", metamorphicGroup: "refund-modal" },
]);

const complaints = makeScenarios("complaints_disputes", [
  { subcategory: "acknowledged", message: "We acknowledge your complaint under reference CMP-101. It remains open." },
  { subcategory: "under_investigation", message: "Your complaint is under investigation. We expect to update you within 15 working days." },
  { subcategory: "upheld", message: "We have upheld your complaint. The remedy described below is still to be arranged." },
  { subcategory: "partly_upheld", message: "We partly upheld your complaint but rejected the part about delivery costs." },
  { subcategory: "rejected", message: "We have rejected your complaint. This is our final response." },
  { subcategory: "response_by_date", message: "We will respond to complaint CMP-202 by 17 August 2026." },
  { subcategory: "deadlock_final_response", message: "This is our final response and deadlock letter. You may take the complaint to the named ombudsman." , risk: "high"},
  { subcategory: "compensation_offered", message: "We offer £45 as compensation if you accept the proposed resolution." },
  { subcategory: "evidence_requested", message: "Send the invoice and photographs by 21 August 2026 so we can investigate your complaint." },
  { subcategory: "escalation_route", message: "If you remain dissatisfied, ask for a senior review using reference ESC-404." },
  {
    subcategory: "open_after_closure",
    message: "Your account is closed. However, your complaint remains open under CMP-505.",
    metamorphicGroup: "closure-complaint",
    browserRepresentative: true,
    expected: {
      titleConcepts: ["Complaint opportunity"],
      allowedStatuses: ["new"],
      requiredVisibleConcepts: ["complaint remains open", "CMP-505"],
    },
  },
]);

const benefits = makeScenarios("benefits_public_administration", [
  {
    subcategory: "uc_appointment",
    message: "Universal Credit appointment at the jobcentre on 13 August 2026. Check your journal for appointment details.",
    browserRepresentative: true,
    expected: {
      titleConcepts: ["Universal Credit appointment"],
      allowedStatuses: ["ready_to_act"],
      requiredVisibleConcepts: ["Universal Credit appointment", "prepare", "cannot decide benefit entitlement"],
    },
  },
  { subcategory: "claimant_commitment", message: "Review and accept your Universal Credit claimant commitment in your online account by 15 August 2026." },
  { subcategory: "work_search_requirement", message: "Your claimant commitment records work-search activities. Tell your work coach if circumstances affect them." },
  { subcategory: "journal_message", message: "There is a new Universal Credit journal message asking you to reply by 18 August 2026." },
  { subcategory: "evidence_request", message: "Upload the requested tenancy and earnings evidence to your Universal Credit account by 20 August 2026." },
  { subcategory: "identity_check", message: "Complete the identity check through your official Universal Credit account. Do not send identity documents by email." },
  { subcategory: "fit_note", message: "Provide a current fit note if your health condition continues beyond the date shown in your account." },
  { subcategory: "sanction_decision", message: "This Universal Credit letter says a sanction has been applied. The letter explains the period and how to challenge the decision.", risk: "high" },
  { subcategory: "sanction_warning", message: "Your Universal Credit payment may be reduced if the stated claimant commitment requirement is not met.", risk: "high" },
  { subcategory: "mandatory_reconsideration", message: "You can ask for mandatory reconsideration of this benefit decision. Check the decision-letter date and official instructions.", risk: "high" },
  { subcategory: "overpayment", message: "The department says there was a £420 benefit overpayment. This letter does not prove the calculation is correct.", risk: "high" },
  { subcategory: "deductions", message: "Your Universal Credit statement shows a £32 deduction this assessment period. Check the stated reason.", risk: "high" },
  { subcategory: "change_of_circumstances", message: "Report relevant changes of circumstances through the official benefit account using the instructions provided." },
  { subcategory: "inheritance_capital_prompt", message: "Your official account asks whether money, savings or investments changed, including an inheritance. Answer accurately; AdminAvenger must not decide what counts.", risk: "high" },
  { subcategory: "pip_review_form", message: "Return the PIP award review form by the date on the letter and include information about changes." , risk: "high"},
  { subcategory: "pip_assessment", message: "Your PIP assessment appointment is booked for 24 August 2026. The provider letter explains how it will take place.", risk: "high" },
  { subcategory: "award_review", message: "Your benefit award is being reviewed. No new decision has been made yet.", risk: "high" },
  { subcategory: "decision_letter", message: "This benefit decision letter explains the award period and what to do if you disagree.", risk: "high" },
  { subcategory: "housing_support", message: "The council requests rent evidence for your housing support claim by 27 August 2026.", risk: "high" },
  { subcategory: "council_tax_reduction", message: "The council asks for household income evidence for Council Tax Reduction by 29 August 2026.", risk: "high" },
  { subcategory: "benefit_payment_date", message: "Your next benefit payment is scheduled for 6 September 2026, subject to the official account record." },
  { subcategory: "further_information", message: "The department requests further information about earnings by 16 August 2026 before it makes a decision." },
]);

const employment = makeScenarios("employment_income", [
  { subcategory: "payslip_discrepancy", message: "Your payslip shows 32 hours, but your synthetic time record shows 38. Ask payroll to check the discrepancy." },
  { subcategory: "tax_code_notice", message: "HMRC says your tax code will change to 1257L from 1 September 2026. Check it in your official tax account." },
  { subcategory: "pension_auto_enrolment", message: "Your employer says you will be automatically enrolled in the workplace pension from 1 October 2026." },
  { subcategory: "holiday_pay_question", message: "Payroll acknowledges your question about holiday pay and will review the calculation." },
  { subcategory: "sickness_meeting", message: "Your employer invites you to a sickness absence meeting on 19 August 2026." },
  { subcategory: "attendance_warning", message: "This is an attendance warning. It says improvement will be reviewed on 30 September 2026.", risk: "high" },
  { subcategory: "probation_review", message: "Your probation review is booked for 22 August 2026. No outcome has been decided." },
  { subcategory: "redundancy_consultation", message: "You are invited to a redundancy consultation meeting on 26 August 2026. No final selection decision is stated.", risk: "high" },
  {
    subcategory: "disciplinary_invitation",
    message: "You are invited to a disciplinary hearing on 28 August 2026. The allegations and evidence are attached.",
    risk: "high",
    browserRepresentative: true,
    expected: {
      titleConcepts: ["Disciplinary hearing invitation"],
      allowedStatuses: ["ready_to_act"],
      requiredVisibleConcepts: ["disciplinary hearing invitation", "gather relevant records", "cannot decide whether the employer's action is lawful"],
    },
  },
  { subcategory: "grievance_acknowledgement", message: "Your employer acknowledges your grievance and will appoint someone to investigate it." },
  { subcategory: "contract_variation", message: "Your employer proposes changing your working hours from 1 October 2026 and asks for comments.", risk: "high" },
  { subcategory: "job_offer_conditions", message: "The job offer is conditional on references and a right-to-work check. Do not resign until you decide how to proceed." },
  { subcategory: "rejected_application", message: "Thank you for applying. Your application was unsuccessful and no action is required." },
  { subcategory: "interview_invitation", message: "Interview invitation for 11 August 2026 at 10:30. Reply to confirm attendance." },
  { subcategory: "right_to_work_evidence", message: "Provide right-to-work evidence through the employer's verified process before your proposed start date." },
]);

const housing = makeScenarios("housing_utilities", [
  { subcategory: "rent_increase", message: "Your landlord proposes increasing the rent from £850 to £900 on 1 October 2026.", risk: "high" },
  { subcategory: "rent_arrears", message: "Your landlord says £1,200 rent arrears are outstanding and asks you to respond by 14 August 2026.", risk: "high" },
  { subcategory: "deposit_issue", message: "Your landlord proposes deducting £240 from the tenancy deposit for repairs. You dispute the deduction.", risk: "high" },
  { subcategory: "repair_request", message: "Your landlord acknowledges the heating repair request and says an engineer will attend within five working days.", risk: "high" },
  { subcategory: "inspection_notice", message: "The landlord gives notice of an inspection on 20 August 2026 at 14:00.", risk: "high" },
  { subcategory: "tenancy_renewal", message: "The landlord offers a new tenancy term from 1 November 2026. Review the proposed terms before agreeing.", risk: "high" },
  {
    subcategory: "possession_wording",
    message: "NOTICE SEEKING POSSESSION. The landlord says court action may follow after 30 September 2026. Get prompt independent housing advice.",
    risk: "high",
    browserRepresentative: true,
    expected: {
      titleConcepts: ["Possession notice"],
      allowedStatuses: ["ready_to_act"],
      requiredVisibleConcepts: ["possession notice", "court action may follow", "independent housing advice", "eviction is not confirmed"],
    },
  },
  { subcategory: "energy_debt", message: "Your energy account shows £375 debt. The supplier proposes a repayment plan, but it is not yet agreed.", risk: "high" },
  { subcategory: "water_bill", message: "Your annual water bill is £412, payable in ten instalments starting 5 September 2026." },
  { subcategory: "broadband_cancellation", message: "Your broadband cancellation takes effect on 4 September 2026. A final bill will follow." },
  { subcategory: "council_tax_notice", message: "Your council tax notice shows £146 due on 1 September 2026. Check the council account for the schedule." },
  { subcategory: "insurance_renewal", message: "Your home insurance renews for £286 on 15 September 2026 unless you choose otherwise." },
  { subcategory: "home_repair_quote", message: "This quotation estimates £640 for roof repairs. It is a quote, not an invoice or completed repair." },
]);

const bereavement = makeScenarios("bereavement_general", [
  { subcategory: "provider_notified", message: "Thank you for notifying the provider of the death. The account review has started. Reference BRV-001." },
  { subcategory: "documents_requested", message: "Please provide a copy of the death certificate through our verified document channel. Reference BRV-002." },
  { subcategory: "awaiting_closure", message: "The account is awaiting closure while the provider checks the documents. No outcome is confirmed." },
  { subcategory: "account_closed", message: "The account has been closed. Keep confirmation reference BRV-004." },
  { subcategory: "balance_cancelled", message: "The account is closed and the provider has cancelled the £66 balance. No payment is required." },
  { subcategory: "balance_under_review", message: "The account is closed, but the £77 balance remains under review. No decision has been made." },
  { subcategory: "balance_payable", message: "The provider says the closed account has a final £88 balance payable by 18 August 2026." },
  { subcategory: "not_due_today_future", message: "No payment is required today, but the £58.90 balance may become payable after review.", metamorphicGroup: "future-liability" },
  { subcategory: "direct_debit_pending", message: "The account is closed, but one final Direct Debit of £31 may still be collected." },
  { subcategory: "refund_promised", message: "The provider will refund £42 within 10 working days after its bereavement review." },
  { subcategory: "complaint_open", message: "The account is closed. However, the bereavement complaint remains open under BRV-C11.", metamorphicGroup: "closure-complaint" },
  { subcategory: "evidence_requested", message: "The bereavement team asks for the final statement by 23 August 2026. Reference BRV-E12." },
  { subcategory: "response_period_collection", message: "The provider will respond within 21 days. Until then the balance is paused, but later collection remains possible." , risk: "high"},
]);

const security = makeScenarios("security_scams", [
  {
    subcategory: "suspicious_payment",
    message: "Urgent: pay £499 today using the link in this message or your account will close.",
    risk: "high",
    expected: {
      titleConcepts: ["Email needs safety check"],
      allowedStatuses: ["new"],
      requiredVisibleConcepts: ["Suspected payment-pressure scam pattern", "Amount requested by message", "verify"],
      suggestOfficialVerification: true,
    },
    browserRepresentative: true,
  },
  { subcategory: "changed_bank_details", message: "Our bank details have changed. Send the invoice payment to this new account immediately.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "password_reset", message: "A password reset was requested. If this was not you, open the provider's official app directly rather than using message links.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "parcel_payment_link", message: "Your parcel is held. Pay a £1.50 redelivery fee using parcel-check.example/link.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "impersonation", message: "This is the tax office. Transfer £700 now to avoid arrest.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "gift_card", message: "Your manager urgently needs you to buy gift cards and send the codes. Keep this confidential.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "suspension_threat", message: "Verify your account using this link within two hours or access will be suspended.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "investment_approach", message: "Guaranteed investment return: send £2,000 today and double it this month.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "unexpected_attachment", message: "Open the attached invoice file and enable editing to see the overdue amount.", risk: "high", expected: { suggestOfficialVerification: true } },
  { subcategory: "verification_code", message: "Send us the six-digit verification code you just received so we can secure your account.", risk: "high", expected: { suggestOfficialVerification: true } },
]);

const neutral = makeScenarios("neutral_low_action", [
  { subcategory: "receipt", message: "Receipt for £14.20 paid by card on 30 July 2026. No action is required.", risk: "low", browserRepresentative: true },
  { subcategory: "payment_received", message: "We received your £52 payment. Your account is up to date and no action is required.", risk: "low" },
  { subcategory: "appointment_confirmation", message: "Appointment confirmed for 12 August 2026 at 09:30. No reply is needed unless you need to change it.", risk: "low" },
  { subcategory: "delivery_update", message: "Your parcel is out for delivery today. No action is required.", risk: "low" },
  { subcategory: "information_notice", message: "Information only: our telephone opening hours change next month. No response is needed.", risk: "low" },
  { subcategory: "thank_you", message: "Thank you for your message. We have added it to the record. No action is required.", risk: "low" },
  { subcategory: "duplicate_confirmation", message: "Duplicate confirmation: your booking remains confirmed. You do not need to reply.", risk: "low" },
  { subcategory: "provider_update", message: "Provider update: planned maintenance is complete. Your service is operating normally and no action is required.", risk: "low" },
]);

const adversarialVariations = makeScenarios("bills_accounts_services", [
  { subcategory: "contrast_but", message: "The account is closed, but the final £41 balance is still being reviewed.", metamorphicGroup: "contrast-qualifiers" },
  { subcategory: "contrast_however", message: "The service is cancelled. However, one final Direct Debit may still be collected.", metamorphicGroup: "contrast-qualifiers" },
  { subcategory: "contrast_although", message: "Although the account is closed, the provider has not yet decided whether the £36 charge will be removed.", metamorphicGroup: "contrast-qualifiers" },
  { subcategory: "until_condition", message: "The account remains active until the requested document is received. Charges continue until then.", metamorphicGroup: "temporal-qualifiers" },
  { subcategory: "unless_condition", message: "No collection action is planned unless the payment arrangement is missed.", metamorphicGroup: "conditional-qualifiers" },
  { subcategory: "today_scope", message: "No payment is required today, but the £27 balance could become payable later.", metamorphicGroup: "temporal-qualifiers" },
  { subcategory: "currently_scope", message: "The account is currently on hold while the provider reviews the disputed £73 balance.", metamorphicGroup: "temporal-qualifiers" },
  { subcategory: "not_yet_scope", message: "The cancellation request is accepted, but the service has not yet ended.", metamorphicGroup: "temporal-qualifiers" },
  { subcategory: "may_modal", message: "After review, the provider may remove the £48 charge.", metamorphicGroup: "modal-strength" },
  { subcategory: "will_modal", message: "After review, the provider will remove the £48 charge.", metamorphicGroup: "modal-strength" },
  { subcategory: "could_modal", message: "The balance could be referred for collection if the dispute is rejected.", risk: "high", metamorphicGroup: "modal-strength" },
  { subcategory: "after_review", message: "No payment is due now. The provider will decide the final balance after review.", metamorphicGroup: "temporal-qualifiers" },
  { subcategory: "within_days", message: "The provider will respond within 12 days. Follow up only if no response arrives after that period." },
  { subcategory: "within_working_days", message: "The provider promises an update within 12 working days, not 12 calendar days." },
  { subcategory: "multiple_dates", message: "Letter dated 2 August 2026. The new price starts 1 September 2026 and the response date is 20 August 2026." },
  { subcategory: "several_amounts", message: "The former balance was £120. The current disputed balance is £45, and a £15 payment is recorded." },
  { subcategory: "current_former_balances", message: "Your former balance of £90 was cancelled, but a current final charge of £18 remains under review." },
  { subcategory: "mixed_deadlines", message: "Reply by 19 August 2026. If no response arrives within 10 working days after that, follow up." },
  { subcategory: "reference_formats", message: "Keep references AB-10482, Q7/2026/19 and CASE99-X with the account record." },
  { subcategory: "positive_then_limit", message: "Good news: the account is closed, but the complaint and £22 credit review remain open." },
  { subcategory: "contradictory_wording", message: "The notice says the balance is cancelled; a later paragraph says it may still be payable. Ask the provider to clarify.", userQuestion: "Is this actually resolved?", risk: "high" },
  { subcategory: "ocr_formatting", message: "ACCOUNT UPDATE\n\nBALANCE: £62.00\nSTATUS - UNDER REVIEW\nREFERENCE / OCR-62-A\n\nNo decision yet." },
]).map((scenario) => ({
  ...scenario,
  id: `adversarial-${scenario.subcategory}`,
  provenance: {
    kind: "metamorphic_variant" as const,
    sourcePattern: "Synthetic controlled wording variation; no personal or customer data.",
  },
}));

const exactMandatory: PublicMessageScenario[] = [
  {
    id: "mandatory-a-pending-waiver",
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    category: "bereavement_general",
    subcategory: "pending_waiver_exact",
    message: `Thank you for sending the death certificate. The account has been closed.

We have received your request for the final balance of £152.75 to be waived. Our bereavement team is still reviewing this request and has not yet made a decision.

You do not need to contact us again unless you have not heard from us within 21 days.

Reference: BR-10482.`,
    risk: "medium",
    sourceFacts: { amounts: [{ value: 152.75, currency: "GBP", role: "balance under review" }], relativePeriods: ["within 21 days"], references: ["BR-10482"], dependencies: ["provider waiver decision"] },
    expected: {
      primaryMeaning: "The account is closed but the waiver remains under review",
      allowedStatuses: ["waiting"],
      opportunityTypes: ["account_outcome_confirmation"],
      requiredVisibleConcepts: ["still under review", "no decision", "do not treat the charge as removed"],
      prohibitedVisibleConcepts: [...prohibitedClaims, "waiver is approved"],
      expectedRelativePeriods: ["within 21 days"],
      expectedReferences: ["BR-10482"],
      amount: { value: 152.75, classification: "balance_under_review", countedInMoneyTracker: false },
      allowedImpactTypes: ["under_review"],
    },
    rationale: "Exact regression A: closure must not suppress a pending waiver.",
    provenance: { kind: "exact_synthetic_regression", sourcePattern: "Exact synthetic regression supplied in the task brief." },
    browserRepresentative: true,
  },
  {
    id: "mandatory-b-clean-resolved",
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    category: "bereavement_general",
    subcategory: "clean_resolved_exact",
    message: `We have closed the account and cancelled the outstanding balance of £93.18.

No payment is required. No further bills or Direct Debits will be issued.

Please keep this confirmation for your records. Reference CLS-9318.`,
    risk: "low",
    sourceFacts: { amounts: [{ value: 93.18, currency: "GBP", role: "former cancelled balance" }], references: ["CLS-9318"] },
    expected: {
      primaryMeaning: "The account and balance are resolved",
      allowedStatuses: ["resolved"],
      opportunityTypes: ["account_outcome_confirmation"],
      requiredVisibleConcepts: ["closed", ["cancelled", "removed"], "no payment"],
      prohibitedVisibleConcepts: [...prohibitedClaims, "payment is still due"],
      expectedReferences: ["CLS-9318"],
      amount: { value: 93.18, classification: "former_balance", countedInMoneyTracker: false },
      allowedImpactTypes: ["no_saving"],
    },
    rationale: "Exact regression B: an unqualified completed cancellation may resolve.",
    provenance: { kind: "exact_synthetic_regression", sourcePattern: "Exact synthetic regression supplied in the task brief." },
    browserRepresentative: true,
  },
  {
    id: "mandatory-c-conditional-closure",
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    category: "bereavement_general",
    subcategory: "conditional_closure_exact",
    message: `Once we receive the death certificate, we will be able to close the account.

Until then, the account remains active and monthly charges will continue. Please send the document by 12 August 2026.

Reference DOC-12884.`,
    risk: "high",
    sourceFacts: { dates: ["12 August 2026"], references: ["DOC-12884"], dependencies: ["death certificate"] },
    expected: {
      primaryMeaning: "Closure is conditional on a document and the account remains active",
      allowedStatuses: ["ready_to_act"],
      opportunityTypes: ["account_outcome_confirmation"],
      requiredVisibleConcepts: ["account remains active", "charges will continue", "death certificate"],
      prohibitedVisibleConcepts: [...prohibitedClaims, "account is closed"],
      expectedDates: ["12 August 2026"],
      expectedReferences: ["DOC-12884"],
      nextStepKinds: ["evidence_checklist", "deadline_checklist", "draft_message"],
      allowedImpactTypes: ["no_saving"],
    },
    rationale: "Exact regression C: positive future wording must not become completed closure.",
    provenance: { kind: "exact_synthetic_regression", sourcePattern: "Exact synthetic regression supplied in the task brief." },
    browserRepresentative: true,
  },
  {
    id: "mandatory-d-final-notice",
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    category: "bereavement_general",
    subcategory: "final_notice_exact",
    message: `FINAL NOTICE

The account has been closed, but an unpaid balance of £210.00 remains outstanding.

Unless payment is received by 7 August 2026, the balance may be referred for further collection activity.

If you believe this is incorrect, contact the bereavement team using reference COL-21077.`,
    risk: "high",
    sourceFacts: { dates: ["7 August 2026"], amounts: [{ value: 210, currency: "GBP", role: "amount requested" }], references: ["COL-21077"], dependencies: ["payment or dispute check"] },
    expected: {
      primaryMeaning: "A closed account still has a demanded balance and collection warning",
      allowedStatuses: ["ready_to_act"],
      opportunityTypes: ["deadline"],
      requiredVisibleConcepts: [["remains outstanding", "amount still due", "payment reminder"], "further collection activity", ["verified channel", "check"]],
      prohibitedVisibleConcepts: [...prohibitedClaims, "no payment is required"],
      expectedDates: ["7 August 2026"],
      expectedReferences: ["COL-21077"],
      amount: { value: 210, classification: "amount_requested", countedInMoneyTracker: false },
      nextStepKinds: ["deadline_checklist", "draft_message", "evidence_checklist"],
      allowedImpactTypes: ["no_saving", "deadline_protected"],
      suggestOfficialVerification: true,
    },
    rationale: "Exact regression D: closure must not outrank an outstanding balance and collection deadline.",
    provenance: { kind: "exact_synthetic_regression", sourcePattern: "Exact synthetic regression supplied in the task brief." },
    browserRepresentative: true,
  },
  {
    id: "mandatory-e-future-liability",
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    category: "bereavement_general",
    subcategory: "future_liability_exact",
    message: `We have closed the account and no further bills will be issued.

The final balance is £58.90. You do not need to pay this amount today, but it may become payable after our bereavement review is completed.

We will write to you again with our decision.`,
    risk: "medium",
    sourceFacts: { amounts: [{ value: 58.9, currency: "GBP", role: "possible future balance" }], dependencies: ["provider review decision"] },
    expected: {
      primaryMeaning: "No payment today, but future liability remains possible",
      allowedStatuses: ["waiting"],
      opportunityTypes: ["account_outcome_confirmation"],
      requiredVisibleConcepts: ["not requested today", "may become payable", "wait"],
      prohibitedVisibleConcepts: [...prohibitedClaims, "balance is waived"],
      amount: { value: 58.9, classification: "balance_under_review", countedInMoneyTracker: false },
      allowedImpactTypes: ["under_review"],
    },
    rationale: "Exact regression E: a temporal qualifier keeps the outcome unresolved.",
    provenance: { kind: "exact_synthetic_regression", sourcePattern: "Exact synthetic regression supplied in the task brief." },
    browserRepresentative: true,
    metamorphicGroup: "future-liability",
  },
];

const mandatoryTitleConcepts: Record<string, readonly (string | readonly string[])[]> = {
  "mandatory-a-pending-waiver": [["balance needs checking", "under review"]],
  "mandatory-b-clean-resolved": [["account closure confirmed", "resolved"]],
  "mandatory-c-conditional-closure": [["needs a document", "remains open"]],
  "mandatory-d-final-notice": [["payment reminder", "deadline"]],
  "mandatory-e-future-liability": [["balance needs checking", "future payment"]],
};

const strengthenExactScenario = (scenario: PublicMessageScenario): PublicMessageScenario => {
  const sourceFacts = mergeSourceFacts(deriveSourceFacts(scenario.message), scenario.sourceFacts);
  const amounts = scenario.expected.amounts ?? [
    ...(scenario.expected.amount
      ? [{ ...scenario.expected.amount, sourceRole: sourceFacts.amounts?.[0]?.role ?? scenario.expected.primaryMeaning }]
      : (sourceFacts.amounts ?? []).map((amount) => ({
          value: amount.value,
          classification: classifyAmountRole(amount.role),
          sourceRole: amount.role,
          countedInMoneyTracker: false as const,
        }))),
  ];
  const expected: PublicMessageExpectedBehaviour = {
    ...scenario.expected,
    titleConcepts: mandatoryTitleConcepts[scenario.id] ?? titleConceptsFor(scenario.category, scenario.subcategory),
    routeOutcome: "general_public_flow",
    expectedDates: scenario.expected.expectedDates ?? sourceFacts.dates,
    expectedRelativePeriods: scenario.expected.expectedRelativePeriods ?? sourceFacts.relativePeriods,
    expectedReferences: scenario.expected.expectedReferences ?? sourceFacts.references,
    amounts,
    prohibitedVisibleConcepts: unique([
      ...scenario.expected.prohibitedVisibleConcepts,
      "No obvious saving or action found",
    ]),
  };
  expected.assertions = assertionsFor(expected, sourceFacts);
  return { ...scenario, sourceFacts, expected };
};

export const publicMessageCorpusV1: readonly PublicMessageScenario[] = [
  ...bills,
  ...refunds,
  ...complaints,
  ...benefits,
  ...employment,
  ...housing,
  ...bereavement,
  ...security,
  ...neutral,
  ...adversarialVariations,
  ...exactMandatory.map(strengthenExactScenario),
];

export const publicMessageBrowserCorpusV1 = publicMessageCorpusV1.filter(
  (scenario) => scenario.browserRepresentative,
);
