export type TaxCodePrefix = "C" | "S" | null;

export type TaxCodeSuffix = "L" | "M" | "N" | "T" | null;

export type EmergencyMarker = "W1" | "M1" | "X" | "NONCUM" | null;

export type SpecialCode = "BR" | "D0" | "D1" | "0T" | "NT" | "K" | null;

export type ParsedTaxCode = {
  raw: string;
  prefix: TaxCodePrefix;
  number: number | null;
  suffix: TaxCodeSuffix;
  emergency: EmergencyMarker;
  special: SpecialCode;
  isKCode: boolean;
  isCumulative: boolean;
  valid: boolean;
  parseErrors: string[];
};

export type AllowanceDeductionLine = {
  raw: string;
  label: string;
  amountPence: number | null;
  type: "allowance" | "deduction" | "printed_total" | "unknown";
  parseErrors: string[];
};

export type HmrcNoticePage = {
  pageNumber: number;
  rawText: string;
};

export type RecognitionEvidence = {
  hasHmrcSender: boolean;
  hasTaxCodeNoticePhrase: boolean;
  hasTellYouTaxCodePhrase: boolean;
  hasHowWeWorkedOutPhrase: boolean;
  hasTaxYearDates: boolean;
  hasPersonalAllowance: boolean;
  hasTaxFreeAmount: boolean;
  hasCodeReplacement: boolean;
  hasEmployerOrPensionProvider: boolean;
  evidenceCount: number;
};

export type ParsedHmrcTaxCodeNotice = {
  recognised: boolean;
  documentSubType:
    | "tax_code_notice"
    | "p800_calculation"
    | "payslip"
    | "p45"
    | "p60"
    | "generic_hmrc_letter"
    | "paye_underpayment"
    | "self_assessment"
    | "tax_demand_or_enforcement"
    | "unrecognised";
  confidence: "high" | "medium" | "low";
  recognitionEvidence: RecognitionEvidence;
  pages: HmrcNoticePage[];
  appearsIncomplete: boolean;
  duplicatePageDetected: boolean;
  taxYearStart: string | null;
  taxYearEnd: string | null;
  noticeDate: string | null;
  employerOrPensionProvider: string | null;
  previousTaxCode: ParsedTaxCode | null;
  replacementTaxCode: ParsedTaxCode | null;
  lines: AllowanceDeductionLine[];
  printedTaxFreeAmountPence: number | null;
  calculatedTaxFreeAmountPence: number | null;
  calculationDifferencePence: number | null;
  codeApproximateTaxFreePence: number | null;
  warnings: string[];
  assumptions: string[];
};

export type CodeComparisonResult = {
  previousApproxTaxFreePence: number | null;
  newExactTaxFreePence: number | null;
  newApproxTaxFreePence: number | null;
  differencePence: number | null;
  isReduction: boolean | null;
  previousLabelledApproximate: boolean;
  newLabelledApproximate: boolean;
  warnings: string[];
};

export type ImpactEstimate = {
  supported: boolean;
  annualTaxDifferencePence: number | null;
  monthlyAveragePence: number | null;
  weeklyAveragePence: number | null;
  marginalRatePercent: number | null;
  suppressReasons: string[];
  warnings: string[];
};

export type OfficialRuleRecord = {
  id: string;
  sourceTitle: string;
  officialDomain: string;
  ruleSupported: string;
  dateChecked: string;
  taxYearRelevance: string;
  stability: "stable" | "annually_variable";
};
