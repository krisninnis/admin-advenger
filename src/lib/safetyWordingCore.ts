export type CoreSafetyWordingGroup =
  | "outcome_claim"
  | "advice_claim"
  | "adversarial_language"
  | "money_claim"
  | "automation_claim"
  | "overclaim_claim"
  | "community_helper_claim";

export type CoreForbiddenSafetyPhraseMatch = {
  phrase: string;
  group: CoreSafetyWordingGroup;
  index: number;
  excerpt: string;
  context?: string;
};

export type CoreFindForbiddenSafetyPhrasesOptions = {
  allowedPhrases?: string[];
  disabledGroups?: CoreSafetyWordingGroup[];
  context?: string;
};

export const CORE_FORBIDDEN_OUTCOME_CLAIMS = [
  "you will win",
  "you will lose",
  "you qualify",
  "you do not qualify",
  "you are entitled",
  "you are not entitled",
  "you deserve",
  "guaranteed",
  "definitely",
  "certainly",
  "confirmed outcome",
] as const;

export const CORE_FORBIDDEN_ADVICE_CLAIMS = [
  "dwp is wrong",
  "the council is wrong",
  "the creditor is wrong",
  "this is unlawful",
  "this is illegal",
  "valid claim",
  "invalid claim",
  "you do not owe this",
  "you definitely owe this",
  "this debt is not enforceable",
  "this debt is enforceable",
  "you should appeal",
  "you must appeal",
  "you should pay",
  "you must pay",
  "you should ignore",
  "you can safely ignore",
  "do not pay",
  "do not contact",
  "tell them they are wrong",
  "case strength",
] as const;

export const CORE_FORBIDDEN_ADVERSARIAL_LANGUAGE = [
  "game theory",
  "opponent",
  "exploit",
  "beat dwp",
  "beat the council",
  "beat the creditor",
  "force them",
  "pressure them",
  "use leverage",
  "weaponise",
  "trap them",
] as const;

export const CORE_FORBIDDEN_MONEY_CLAIMS = [
  "money saved",
  "money recovered",
  "refund won",
  "savings confirmed",
  "amount owed to you",
  "you are owed",
  "we recovered",
] as const;

export const CORE_FORBIDDEN_AUTOMATION_CLAIMS = [
  "sent automatically",
  "submitted automatically",
  "automatic submission",
  "we contacted",
  "we applied for you",
  "we appealed for you",
  "we challenged for you",
  "claim submitted",
] as const;

export const CORE_FORBIDDEN_OVERCLAIM_PHRASES = [
  "secure upload",
  "securely uploaded",
  "cloud processed",
  "gdpr compliant",
  "bank-level security",
  "every pdf",
  "we read every pdf",
  "guaranteed text extraction",
] as const;

export const CORE_FORBIDDEN_COMMUNITY_HELPER_CLAIMS = [
  "you are diagnosed",
  "this proves disability",
  "this proves neglect",
  "safeguarding issue confirmed",
  "risk score",
  "care score",
  "eligibility score",
  "they qualify",
  "council must provide",
  "needs this equipment",
  "needs this adaptation",
  "cannot live alone",
  "lacks capacity",
  "financial abuse proven",
  "money owed",
  "contacted automatically",
] as const;

const coreForbiddenGroups: Record<
  CoreSafetyWordingGroup,
  readonly string[]
> = {
  outcome_claim: CORE_FORBIDDEN_OUTCOME_CLAIMS,
  advice_claim: CORE_FORBIDDEN_ADVICE_CLAIMS,
  adversarial_language: CORE_FORBIDDEN_ADVERSARIAL_LANGUAGE,
  money_claim: CORE_FORBIDDEN_MONEY_CLAIMS,
  automation_claim: CORE_FORBIDDEN_AUTOMATION_CLAIMS,
  overclaim_claim: CORE_FORBIDDEN_OVERCLAIM_PHRASES,
  community_helper_claim: CORE_FORBIDDEN_COMMUNITY_HELPER_CLAIMS,
};

export const normaliseCoreSafetyText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const getCoreExcerpt = (text: string, index: number) => {
  const start = Math.max(0, index - 48);
  const end = Math.min(text.length, index + 96);

  return text.slice(start, end).trim();
};

export const findForbiddenCoreSafetyPhrases = (
  text: string,
  options: CoreFindForbiddenSafetyPhrasesOptions = {},
): CoreForbiddenSafetyPhraseMatch[] => {
  const normalisedText = normaliseCoreSafetyText(text);
  const disabledGroups = new Set(options.disabledGroups ?? []);
  const allowedPhrases = new Set(
    (options.allowedPhrases ?? []).map(normaliseCoreSafetyText),
  );
  const matches: CoreForbiddenSafetyPhraseMatch[] = [];

  for (const [group, phrases] of Object.entries(coreForbiddenGroups) as Array<
    [CoreSafetyWordingGroup, readonly string[]]
  >) {
    if (disabledGroups.has(group)) {
      continue;
    }

    for (const phrase of phrases) {
      const normalisedPhrase = normaliseCoreSafetyText(phrase);

      if (allowedPhrases.has(normalisedPhrase)) {
        continue;
      }

      const index = normalisedText.indexOf(normalisedPhrase);

      if (index >= 0) {
        matches.push({
          phrase,
          group,
          index,
          excerpt: getCoreExcerpt(normalisedText, index),
          context: options.context,
        });
      }
    }
  }

  return matches;
};
