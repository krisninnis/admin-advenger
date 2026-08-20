import { describe, expect, it } from "vitest";
import type {
  DecisionDerivedFact,
  DecisionResult,
  DecisionSourceFact,
} from "../decisionEngine/types";
import { buildResultViewModel } from "../resultViewModel";

const makeDecision = (
  sourceFacts: DecisionSourceFact[] = [],
  derivedFacts: DecisionDerivedFact[] = [],
): DecisionResult => ({
  documentType: "unknown_admin_dispute",
  title: "Deterministic comparison",
  plainEnglishSummary: "Two source facts were compared deterministically.",
  caseStrength: "not_enough_information",
  strengthLabel: "Document comparison only",
  whatThisLooksLike: "A deterministic comparison of source facts.",
  possibleGrounds: [],
  confidence: { level: "high", reason: "The result came from a deterministic comparison." },
  uncertainty: ["The supplied material may not contain every relevant fact."],
  cannotKnow: ["Whether either source figure should apply."],
  evidenceNeeded: [],
  deadlines: [],
  risks: [],
  nextSteps: [],
  safetyNotes: ["This is preparation only. A human decides what happens next."],
  amountTreatment: "no_money_counted",
  sourceFacts,
  derivedFacts,
});

const validTrace = {
  claimId: "claim-a",
  sourceDocumentId: "document-a",
  sourceDocumentName: "Invoice A",
  sourceSegmentId: "segment-a",
  pageNumber: 2,
} as const;

const applicability = {
  kind: "overlapping_explicit_periods",
  periodStart: "2026-02-01",
  periodEnd: "2026-02-28",
} as const;

const derived = (
  inputClaimIds: readonly [string, string] = ["claim-a", "claim-b"],
  overrides: Partial<DecisionDerivedFact> = {},
): DecisionDerivedFact => ({
  kind: "decision_derived",
  label: "Absolute difference",
  value: "GBP 35.00 per week",
  inputClaimIds,
  decisionContext: {
    kind: "financial_reconciliation",
    state: "disagreement",
    differenceKind: "absolute",
  },
  applicability,
  ...overrides,
} as DecisionDerivedFact);

describe("decision-derived Result context", () => {
  it("maps source and derived facts into structurally separate evidence", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision(
        [{ kind: "source", label: "Source amount", value: "GBP 500.00", sourceQuote: "Total GBP 500.00", trace: validTrace }],
        [derived()],
      ),
    });

    expect(model.evidenceFound).toContainEqual(expect.objectContaining({
      kind: "source",
      sourceQuote: "Total GBP 500.00",
      trace: validTrace,
    }));
    expect(model.evidenceContext).toContainEqual(expect.objectContaining({
      kind: "decision_derived",
      inputClaimIds: ["claim-a", "claim-b"],
      applicability,
    }));
    expect(model.evidenceContext[0]).not.toHaveProperty("sourceQuote");
    expect(model.evidenceContext[0]).not.toHaveProperty("trace");
  });

  it("preserves a valid trace and fails closed for malformed trace IDs", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision([
        { label: "Valid", value: "Kept", trace: validTrace },
        { label: "Empty claim", value: "Omitted", trace: { ...validTrace, claimId: "" } },
        { label: "Padded document", value: "Omitted", trace: { ...validTrace, sourceDocumentId: " document-a " } },
        { label: "Empty segment", value: "Omitted", trace: { ...validTrace, sourceSegmentId: "" } },
      ]),
    });

    expect(model.evidenceFound).toHaveLength(1);
    expect(model.evidenceFound[0]).toMatchObject({ label: "Valid", trace: validTrace });
  });

  it("omits derived facts with empty, missing, or duplicate required input IDs", () => {
    const unsafe = [
      derived(["", "claim-b"]),
      derived(["claim-a", "claim-a"]),
      { ...derived(), inputClaimIds: ["claim-a"] },
    ] as unknown as DecisionDerivedFact[];
    const model = buildResultViewModel({ decisionResult: makeDecision([], unsafe) });

    expect(model.evidenceContext).toEqual([]);
  });

  it("does not allow source and derived metadata to masquerade as each other", () => {
    const contradictorySource = {
      label: "Source",
      value: "Unsafe",
      inputClaimIds: ["claim-a", "claim-b"],
    } as unknown as DecisionSourceFact;
    const contradictoryDerived = {
      ...derived(),
      sourceQuote: "Fabricated quote",
      trace: validTrace,
    } as unknown as DecisionDerivedFact;
    const model = buildResultViewModel({
      decisionResult: makeDecision([contradictorySource], [contradictoryDerived]),
    });

    expect(model.evidenceFound).toEqual([]);
    expect(model.evidenceContext).toEqual([]);
  });

  it("preserves different source traces when label and value match", () => {
    const sourceFacts: DecisionSourceFact[] = [
      { label: "Amount", value: "GBP 500.00", trace: validTrace },
      {
        label: "Amount",
        value: "GBP 500.00",
        trace: { ...validTrace, claimId: "claim-b", sourceDocumentId: "document-b" },
      },
    ];
    const model = buildResultViewModel({ decisionResult: makeDecision(sourceFacts) });

    expect(model.evidenceFound).toHaveLength(2);
  });

  it("deduplicates truly identical source evidence", () => {
    const fact: DecisionSourceFact = { label: "Amount", value: "GBP 500.00", trace: validTrace };
    const model = buildResultViewModel({ decisionResult: makeDecision([fact, fact]) });

    expect(model.evidenceFound).toHaveLength(1);
  });

  it("preserves ordered input identity while deduplicating truly identical derived evidence", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision([], [
        derived(["claim-a", "claim-b"]),
        derived(["claim-b", "claim-a"]),
        derived(["claim-a", "claim-b"]),
      ]),
    });

    expect(model.evidenceContext.map((item) => item.inputClaimIds)).toEqual([
      ["claim-a", "claim-b"],
      ["claim-b", "claim-a"],
    ]);
  });

  it("keeps source and derived evidence distinct when their display text matches", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision(
        [{ label: "Amount", value: "GBP 500.00", trace: validTrace }],
        [derived(["claim-a", "claim-b"], { label: "Amount", value: "GBP 500.00" })],
      ),
    });

    expect(model.evidenceFound).toHaveLength(1);
    expect(model.evidenceContext).toHaveLength(1);
    expect(model.evidenceFound[0].kind).toBe("source");
    expect(model.evidenceContext[0].kind).toBe("decision_derived");
  });

  it("preserves exact inherited applicability without reconstruction under input reversal", () => {
    const reversed = derived(["claim-b", "claim-a"]);
    const model = buildResultViewModel({ decisionResult: makeDecision([], [reversed]) });

    expect(model.evidenceContext[0]).toMatchObject({
      inputClaimIds: ["claim-b", "claim-a"],
      applicability,
    });
    expect(model.evidenceContext[0].applicability).toBe(applicability);
  });

  it("preserves derived evidence whose inherited applicability differs", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision([], [
        derived(),
        derived(["claim-a", "claim-b"], {
          applicability: {
            kind: "overlapping_explicit_periods",
            periodStart: "2026-02-08",
            periodEnd: "2026-02-28",
          },
        }),
      ]),
    });

    expect(model.evidenceContext).toHaveLength(2);
  });

  it.each([
    { kind: "same_explicit_period", periodStart: "2026-01-01", periodEnd: "2026-01-31" },
    { kind: "overlapping_explicit_periods", periodStart: "2026-02-01", periodEnd: "2026-02-28" },
    { kind: "same_effective_date", effectiveDate: "2026-03-01" },
  ] as const)("preserves exact $kind applicability", (inheritedApplicability) => {
    const fact = derived(["claim-a", "claim-b"], { applicability: inheritedApplicability });
    const model = buildResultViewModel({ decisionResult: makeDecision([], [fact]) });

    expect(model.evidenceContext[0].applicability).toBe(inheritedApplicability);
  });

  it("omits malformed applicability and does not invent a replacement", () => {
    const malformed = {
      ...derived(),
      applicability: { kind: "same_explicit_period", periodStart: "", periodEnd: "2026-01-31" },
    } as unknown as DecisionDerivedFact;
    const model = buildResultViewModel({ decisionResult: makeDecision([], [malformed]) });

    expect(model.evidenceContext).toEqual([]);
  });

  it("is deterministic across repeated mappings", () => {
    const decisionResult = makeDecision(
      [{ label: "Source amount", value: "GBP 500.00", trace: validTrace }],
      [derived()],
    );

    expect(buildResultViewModel({ decisionResult })).toEqual(buildResultViewModel({ decisionResult }));
  });

  it("keeps existing producers without derived facts compatible", () => {
    const model = buildResultViewModel({
      decisionResult: makeDecision([{ label: "Legacy source fact", value: "Still mapped" }]),
    });

    expect(model.evidenceFound).toContainEqual(expect.objectContaining({
      kind: "source",
      label: "Legacy source fact",
      value: "Still mapped",
    }));
    expect(model.evidenceContext).toEqual([]);
  });
});
