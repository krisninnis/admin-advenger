import type { OfficialRuleRecord } from "./types";

export const officialRules: OfficialRuleRecord[] = [
  {
    id: "what-is-tax-code-notice",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported: "What a Tax Code Notice is and when HMRC sends one",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "c-prefix",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "C prefix indicates the tax code applies to income from a second job or pension with a non-cumulative basis",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "s-prefix",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "S prefix indicates the Scottish rate of Income Tax applies",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "annually_variable",
  },
  {
    id: "l-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "L code means you are entitled to the standard Personal Allowance",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "annually_variable",
  },
  {
    id: "m-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "M code means you have received Marriage Allowance from your spouse or civil partner",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "n-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "N code means you have given Marriage Allowance to your spouse or civil partner",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "t-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "T code means your tax code includes other calculations to work out your Personal Allowance",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "k-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "K code means you have income that is not being taxed another way and it is more than your tax-free allowance",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "br-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "BR code means all income from this source is taxed at the basic rate",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "d0-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "D0 code means all income from this source is taxed at the higher rate",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "d1-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "D1 code means all income from this source is taxed at the additional rate",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "0t-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "0T code means your Personal Allowance has been used up or you do not have one",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "nt-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "NT code means no tax is to be deducted from this income",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "emergency-w1-m1",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "W1/M1/X/NONCUM markers indicate an emergency or non-cumulative basis, usually temporary",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "company-benefits",
    sourceTitle: "Tax on company benefits",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "Benefits in kind such as company cars or private medical insurance reduce the tax-free amount",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "annually_variable",
  },
  {
    id: "employment-expenses",
    sourceTitle: "Tax relief for employees",
    officialDomain: "www.gov.uk",
    ruleSupported:
      "Allowable employment expenses such as flat-rate job expenses or professional fees can increase the tax-free amount",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "annually_variable",
  },
  {
    id: "checking-tax-code",
    sourceTitle: "Check your Income Tax for the current year",
    officialDomain: "www.gov.uk",
    ruleSupported: "How to check whether a tax code is correct",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
  {
    id: "checking-payslip",
    sourceTitle: "Understanding your payslip",
    officialDomain: "www.gov.uk",
    ruleSupported: "How to check a payslip against the tax code",
    dateChecked: "2026-07-21",
    taxYearRelevance: "2026-27",
    stability: "stable",
  },
];

export function getRulesForCode(code: string): OfficialRuleRecord[] {
  const upper = code.toUpperCase();
  return officialRules.filter((rule) => {
    if (upper.startsWith("S") && rule.id === "s-prefix") return true;
    if (upper.startsWith("C") && rule.id === "c-prefix") return true;
    if (upper.includes("L") && rule.id === "l-code") return true;
    if (upper.includes("M") && rule.id === "m-code") return true;
    if (upper.includes("N") && rule.id === "n-code") return true;
    if (upper.includes("T") && rule.id === "t-code") return true;
    if (upper.startsWith("K") && rule.id === "k-code") return true;
    if (upper === "BR" && rule.id === "br-code") return true;
    if (upper === "D0" && rule.id === "d0-code") return true;
    if (upper === "D1" && rule.id === "d1-code") return true;
    if (upper === "0T" && rule.id === "0t-code") return true;
    if (upper === "NT" && rule.id === "nt-code") return true;
    return false;
  });
}
