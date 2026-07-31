import type { PublicMessageCategory } from "./types";

const numberedIds = (category: PublicMessageCategory, suffixes: readonly string[]) =>
  suffixes.map(
    (suffix, index) => `${category}-${String(index + 1).padStart(2, "0")}-${suffix}`,
  );

const categorySuffixes = {
  bills_accounts_services: [
    "price_rise", "renewal_notice", "cancellation_confirmed", "cancellation_pending",
    "account_closure", "closure_conditional_documents", "balance_cancelled",
    "balance_still_owed", "disputed_balance", "waiver_requested", "waiver_pending",
    "waiver_refused", "final_bill", "final_direct_debit", "collection_warning",
    "duplicate_charge", "billing_error", "payment_plan", "arrears", "service_suspension",
    "estimated_readings", "credit_balance", "provider_transfer",
  ],
  refunds_purchases: [
    "refund_requested", "refund_refused", "refund_promised", "refund_approved",
    "refund_issued", "refund_received", "partial_refund", "store_credit",
    "return_deadline", "missing_parcel", "damaged_item", "warranty_issue",
    "chargeback_wording", "subscription_renewal", "free_trial_conversion",
    "cancellation_effective_later", "refund_possible",
  ],
  complaints_disputes: [
    "acknowledged", "under_investigation", "upheld", "partly_upheld", "rejected",
    "response_by_date", "deadlock_final_response", "compensation_offered",
    "evidence_requested", "escalation_route", "open_after_closure",
  ],
  benefits_public_administration: [
    "uc_appointment", "claimant_commitment", "work_search_requirement", "journal_message",
    "evidence_request", "identity_check", "fit_note", "sanction_decision",
    "sanction_warning", "mandatory_reconsideration", "overpayment", "deductions",
    "change_of_circumstances", "inheritance_capital_prompt", "pip_review_form",
    "pip_assessment", "award_review", "decision_letter", "housing_support",
    "council_tax_reduction", "benefit_payment_date", "further_information",
  ],
  employment_income: [
    "payslip_discrepancy", "tax_code_notice", "pension_auto_enrolment",
    "holiday_pay_question", "sickness_meeting", "attendance_warning", "probation_review",
    "redundancy_consultation", "disciplinary_invitation", "grievance_acknowledgement",
    "contract_variation", "job_offer_conditions", "rejected_application",
    "interview_invitation", "right_to_work_evidence",
  ],
  housing_utilities: [
    "rent_increase", "rent_arrears", "deposit_issue", "repair_request",
    "inspection_notice", "tenancy_renewal", "possession_wording", "energy_debt",
    "water_bill", "broadband_cancellation", "council_tax_notice", "insurance_renewal",
    "home_repair_quote",
  ],
  bereavement_general: [
    "provider_notified", "documents_requested", "awaiting_closure", "account_closed",
    "balance_cancelled", "balance_under_review", "balance_payable",
    "not_due_today_future", "direct_debit_pending", "refund_promised", "complaint_open",
    "evidence_requested", "response_period_collection",
  ],
  security_scams: [
    "suspicious_payment", "changed_bank_details", "password_reset", "parcel_payment_link",
    "impersonation", "gift_card", "suspension_threat", "investment_approach",
    "unexpected_attachment", "verification_code",
  ],
  neutral_low_action: [
    "receipt", "payment_received", "appointment_confirmation", "delivery_update",
    "information_notice", "thank_you", "duplicate_confirmation", "provider_update",
  ],
} as const satisfies Record<PublicMessageCategory, readonly string[]>;

export const PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS = {
  bills_accounts_services: 45,
  refunds_purchases: 17,
  complaints_disputes: 11,
  benefits_public_administration: 22,
  employment_income: 15,
  housing_utilities: 13,
  bereavement_general: 18,
  security_scams: 10,
  neutral_low_action: 8,
} as const satisfies Record<PublicMessageCategory, number>;

const adversarialIds = [
  "adversarial-contrast_but", "adversarial-contrast_however",
  "adversarial-contrast_although", "adversarial-until_condition",
  "adversarial-unless_condition", "adversarial-today_scope",
  "adversarial-currently_scope", "adversarial-not_yet_scope", "adversarial-may_modal",
  "adversarial-will_modal", "adversarial-could_modal", "adversarial-after_review",
  "adversarial-within_days", "adversarial-within_working_days",
  "adversarial-multiple_dates", "adversarial-several_amounts",
  "adversarial-current_former_balances", "adversarial-mixed_deadlines",
  "adversarial-reference_formats", "adversarial-positive_then_limit",
  "adversarial-contradictory_wording", "adversarial-ocr_formatting",
] as const;

const mandatoryIds = [
  "mandatory-a-pending-waiver", "mandatory-b-clean-resolved",
  "mandatory-c-conditional-closure", "mandatory-d-final-notice",
  "mandatory-e-future-liability",
] as const;

export const PUBLIC_MESSAGE_EXPECTED_IDS = [
  ...numberedIds("bills_accounts_services", categorySuffixes.bills_accounts_services),
  ...numberedIds("refunds_purchases", categorySuffixes.refunds_purchases),
  ...numberedIds("complaints_disputes", categorySuffixes.complaints_disputes),
  ...numberedIds("benefits_public_administration", categorySuffixes.benefits_public_administration),
  ...numberedIds("employment_income", categorySuffixes.employment_income),
  ...numberedIds("housing_utilities", categorySuffixes.housing_utilities),
  ...numberedIds("bereavement_general", categorySuffixes.bereavement_general),
  ...numberedIds("security_scams", categorySuffixes.security_scams),
  ...numberedIds("neutral_low_action", categorySuffixes.neutral_low_action),
  ...adversarialIds,
  ...mandatoryIds,
] as const;

export const PUBLIC_MESSAGE_EXPECTED_COUNT = 159 as const;

export const PUBLIC_MESSAGE_BROWSER_IDS = [
  "refunds_purchases-03-refund_promised",
  "complaints_disputes-11-open_after_closure",
  "benefits_public_administration-01-uc_appointment",
  "employment_income-09-disciplinary_invitation",
  "housing_utilities-07-possession_wording",
  "security_scams-01-suspicious_payment",
  "neutral_low_action-01-receipt",
  ...mandatoryIds,
] as const;

export const PUBLIC_MESSAGE_METAMORPHIC_GROUPS = {
  "refund-modal": ["refunds_purchases-03-refund_promised", "refunds_purchases-17-refund_possible"],
  "refund-stage": ["refunds_purchases-04-refund_approved", "refunds_purchases-05-refund_issued"],
  "closure-complaint": ["complaints_disputes-11-open_after_closure", "bereavement_general-11-complaint_open"],
  "future-liability": ["bereavement_general-08-not_due_today_future", "mandatory-e-future-liability"],
  "contrast-qualifiers": ["adversarial-contrast_but", "adversarial-contrast_however", "adversarial-contrast_although"],
  "temporal-qualifiers": ["adversarial-until_condition", "adversarial-today_scope", "adversarial-currently_scope", "adversarial-not_yet_scope", "adversarial-after_review"],
  "conditional-qualifiers": ["adversarial-unless_condition"],
  "modal-strength": ["adversarial-may_modal", "adversarial-will_modal", "adversarial-could_modal"],
} as const;
