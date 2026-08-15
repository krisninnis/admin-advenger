import {
  compareFinancialClaims,
  type ComparabilityReason,
  type ComparableApplicability,
  type ComparableDimensions,
} from "./financialClaimComparability";
import type { FinancialClaim } from "./financialClaims";
import type { SourceDocument } from "./sourceProvenance";

type ReconciledCurrency = ComparableDimensions["currency"];
type ReconciledCadence = ComparableDimensions["cadence"];

export type ReconciliationResult =
  | {
      readonly state: "agreement";
      readonly claimIds: readonly [string, string];
      readonly amountMinor: number;
      readonly currency: ReconciledCurrency;
      readonly cadence: ReconciledCadence;
      readonly applicability: ComparableApplicability;
    }
  | {
      readonly state: "disagreement";
      readonly claimIds: readonly [string, string];
      /** Source amounts in the same neutral input order as claimIds. */
      readonly amountsMinor: readonly [number, number];
      /** Absolute difference only; it does not encode newer, older, owed, or due. */
      readonly differenceMinor: number;
      readonly differenceKind: "absolute";
      readonly currency: ReconciledCurrency;
      readonly cadence: ReconciledCadence;
      readonly applicability: ComparableApplicability;
    }
  | {
      readonly state: "not_safely_comparable";
      readonly claimIds: readonly [string, string];
      readonly reasons: readonly ComparabilityReason[];
    };

const absoluteDifference = (first: number, second: number): number =>
  first >= second ? first - second : second - first;

/**
 * Compose Phase 2 claims through the Phase 3 gate. No arithmetic is reachable
 * until the gate has revalidated both claims and returned `comparable`.
 */
export const reconcileFinancialClaims = (
  first: FinancialClaim,
  second: FinancialClaim,
  documents: readonly SourceDocument[],
): ReconciliationResult => {
  const comparability = compareFinancialClaims(first, second, documents);

  if (comparability.status === "not_safely_comparable") {
    return {
      state: "not_safely_comparable",
      claimIds: comparability.claimIds,
      reasons: comparability.reasons,
    };
  }

  if (first.amountMinor === second.amountMinor) {
    return {
      state: "agreement",
      claimIds: comparability.claimIds,
      amountMinor: first.amountMinor,
      currency: comparability.dimensions.currency,
      cadence: comparability.dimensions.cadence,
      applicability: comparability.dimensions.applicability,
    };
  }

  return {
    state: "disagreement",
    claimIds: comparability.claimIds,
    amountsMinor: [first.amountMinor, second.amountMinor],
    differenceMinor: absoluteDifference(first.amountMinor, second.amountMinor),
    differenceKind: "absolute",
    currency: comparability.dimensions.currency,
    cadence: comparability.dimensions.cadence,
    applicability: comparability.dimensions.applicability,
  };
};
