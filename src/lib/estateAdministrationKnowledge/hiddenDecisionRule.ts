import type { RuntimeKnowledgeEntry } from "./types.ts";

export const TELL_US_ONCE_SEPARATE_CONTACT_RULE_ID =
  "ea-hidden-rule-tell-us-once-separate-contact-v1";

// Deliberately pinned here rather than importing authoring data. Runtime code
// knows only the exact approved revision identity and the projected record.
export const TELL_US_ONCE_SEPARATE_CONTACT_RULE_REVISION =
  "ea-ew-tell-us-once-separate-contact-001@r1";

export type TellUsOnceSeparateContactRuleResult =
  | {
      status: "prepared";
      ruleId: string;
      runtimeReferenceId: string;
      wording: string;
      qualifiers: readonly string[];
    }
  | {
      status: "blocked";
      reason: "knowledge_revision_mismatch" | "missing_facts";
    };

export const prepareTellUsOnceSeparateContactNote = (
  entry: RuntimeKnowledgeEntry,
  facts: { separateContactPreparationRequested: boolean },
): TellUsOnceSeparateContactRuleResult => {
  if (
    entry.runtimeReferenceId !==
      TELL_US_ONCE_SEPARATE_CONTACT_RULE_REVISION ||
    entry.consumptionScope !==
      "estate_administration_hidden_walking_skeleton"
  ) {
    return {
      status: "blocked",
      reason: "knowledge_revision_mismatch",
    };
  }

  if (!facts.separateContactPreparationRequested) {
    return {
      status: "blocked",
      reason: "missing_facts",
    };
  }

  return {
    status: "prepared",
    ruleId: TELL_US_ONCE_SEPARATE_CONTACT_RULE_ID,
    runtimeReferenceId: entry.runtimeReferenceId,
    wording: entry.approvedClaim,
    qualifiers: entry.requiredQualifiers,
  };
};
