import { describe, expect, it } from "vitest";
import {
  PUBLIC_MESSAGE_BROWSER_IDS,
  PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS,
  PUBLIC_MESSAGE_EXPECTED_COUNT,
  PUBLIC_MESSAGE_EXPECTED_IDS,
  PUBLIC_MESSAGE_METAMORPHIC_GROUPS,
} from "../publicMessageEvaluation/corpusManifestV1";
import { publicMessageCorpusV1 } from "../publicMessageEvaluation/corpusV1";
import {
  evaluatePublicMessageCorpus,
  evaluatePublicMessageScenario,
  formatPublicMessageEvaluationReport,
  reconstructPublicMessageJourney,
  runPublicMessageScenario,
  validatePublicMessageCorpusManifest,
} from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";
import { PUBLIC_MESSAGE_CORPUS_VERSION } from "../publicMessageEvaluation/types";

const find = (id: string) => {
  const scenario = publicMessageCorpusV1.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Missing corpus scenario ${id}`);
  return scenario;
};

const clone = (scenario: PublicMessageScenario): PublicMessageScenario =>
  structuredClone(scenario);

const failureKinds = (scenario: PublicMessageScenario) =>
  evaluatePublicMessageScenario(scenario).map((entry) => entry.kind);

const freshAndReconstructed = (id: string) => {
  const fresh = runPublicMessageScenario(find(id));
  return [fresh, reconstructPublicMessageJourney(fresh, id)] as const;
};

describe("public-message adversarial evaluation corpus v1", () => {
  it("matches the immutable exact corpus, browser and metamorphic manifests", () => {
    expect(validatePublicMessageCorpusManifest(publicMessageCorpusV1)).toEqual([]);
    expect(publicMessageCorpusV1).toHaveLength(PUBLIC_MESSAGE_EXPECTED_COUNT);
    expect(publicMessageCorpusV1.map((scenario) => scenario.id)).toEqual(PUBLIC_MESSAGE_EXPECTED_IDS);
    expect(publicMessageCorpusV1.filter((scenario) => scenario.browserRepresentative).map((scenario) => scenario.id)).toEqual(PUBLIC_MESSAGE_BROWSER_IDS);

    for (const [group, ids] of Object.entries(PUBLIC_MESSAGE_METAMORPHIC_GROUPS)) {
      expect(publicMessageCorpusV1.filter((scenario) => scenario.metamorphicGroup === group).map((scenario) => scenario.id)).toEqual(ids);
    }
    for (const [category, total] of Object.entries(PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS)) {
      expect(publicMessageCorpusV1.filter((scenario) => scenario.category === category)).toHaveLength(total);
    }
  });

  it("has explicit meaningful contracts for every medium/high and metamorphic record", () => {
    const governed = publicMessageCorpusV1.filter(
      (scenario) => scenario.risk !== "low" || scenario.provenance.kind === "metamorphic_variant",
    );

    expect(governed).toHaveLength(150);
    expect(publicMessageCorpusV1.filter((scenario) => scenario.provenance.kind === "metamorphic_variant")).toHaveLength(29);
    for (const scenario of governed) {
      expect(scenario.expected.titleConcepts?.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.expected.allowedStatuses, scenario.id).toHaveLength(1);
      expect(scenario.expected.requiredVisibleConcepts.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.expected.prohibitedVisibleConcepts, scenario.id).toContain("No obvious saving or action found");
      expect(scenario.expected.assertions?.some((assertion) => assertion.type === "title_concept"), scenario.id).toBe(true);
      expect(scenario.expected.assertions?.some((assertion) => assertion.type === "status"), scenario.id).toBe(true);
      expect(scenario.expected.assertions?.some((assertion) => assertion.type === "visible_concept"), scenario.id).toBe(true);
    }
  });

  it("binds every declared source fact and dependency to an executable assertion", () => {
    for (const scenario of publicMessageCorpusV1) {
      const assertions = scenario.expected.assertions ?? [];
      for (const date of scenario.sourceFacts.dates ?? []) {
        expect(assertions, `${scenario.id} date ${date}`).toContainEqual({ type: "source_date", value: date });
      }
      for (const period of scenario.sourceFacts.relativePeriods ?? []) {
        expect(assertions, `${scenario.id} period ${period}`).toContainEqual({ type: "source_period", value: period });
      }
      for (const reference of scenario.sourceFacts.references ?? []) {
        expect(assertions, `${scenario.id} reference ${reference}`).toContainEqual({ type: "source_reference", value: reference });
      }
      for (const dependency of scenario.sourceFacts.dependencies ?? []) {
        expect(assertions, `${scenario.id} dependency ${dependency}`).toContainEqual({ type: "dependency", value: dependency });
      }
      for (const amount of scenario.expected.amounts ?? []) {
        expect(assertions, `${scenario.id} amount ${amount.value}`).toContainEqual({
          type: "source_amount",
          value: amount.value,
          classification: amount.classification,
        });
      }
    }
  });

  it("evaluates the exact corpus deterministically and reports product gaps honestly", () => {
    const first = evaluatePublicMessageCorpus(publicMessageCorpusV1);
    const second = evaluatePublicMessageCorpus(publicMessageCorpusV1);

    expect(first.total).toBe(PUBLIC_MESSAGE_EXPECTED_COUNT);
    expect(first.passed + first.failed).toBe(first.total);
    expect(first.failures.some((entry) => entry.kind === "manifest")).toBe(false);
    expect(formatPublicMessageEvaluationReport(first)).toBe(formatPublicMessageEvaluationReport(second));
  }, 20_000);

  it("does not leak subcategory metadata into the real paste-title journey", () => {
    const original = find("refunds_purchases-03-refund_promised");
    const renamed = { ...clone(original), subcategory: "totally_different_hidden_label" };
    const left = runPublicMessageScenario(original);
    const right = runPublicMessageScenario(renamed);

    expect(left.item.title).toBe("Pasted admin text");
    expect(right.item.title).toBe("Pasted admin text");
    expect({ title: left.resultViewModel.title, status: left.adminCase.status, opportunity: left.opportunity.opportunityType }).toEqual({
      title: right.resultViewModel.title,
      status: right.adminCase.status,
      opportunity: right.opportunity.opportunityType,
    });
  });

  it("fails when a required concept is absent or prohibited wording is present", () => {
    const absent = clone(find("mandatory-a-pending-waiver"));
    absent.expected.requiredVisibleConcepts = ["concept that the result cannot contain"];
    expect(failureKinds(absent)).toContain("composition");

    const prohibited = clone(find("mandatory-a-pending-waiver"));
    prohibited.expected.prohibitedVisibleConcepts = ["under review"];
    expect(failureKinds(prohibited)).toContain("safety");
  });

  it("fails closed for an invented source fact, lost dependency and unknown assertion", () => {
    const invented = clone(find("refunds_purchases-03-refund_promised"));
    invented.sourceFacts.amounts = [];
    expect(failureKinds(invented)).toContain("fact_invented");

    const dependency = clone(find("mandatory-a-pending-waiver"));
    dependency.sourceFacts.dependencies = ["final Direct Debit pending"];
    expect(failureKinds(dependency)).toContain("fact_missing");

    const unknown = clone(find("mandatory-a-pending-waiver"));
    unknown.expected.assertions = [
      ...(unknown.expected.assertions ?? []),
      { type: "future_unknown_assertion" } as never,
    ];
    expect(failureKinds(unknown)).toContain("schema");
  });

  it("uses structured amount equality so 39 does not match 139", () => {
    const scenario = clone(find("refunds_purchases-03-refund_promised"));
    scenario.message = scenario.message.replace("£39", "£139");
    const failures = evaluatePublicMessageScenario(scenario);

    expect(failures.some((entry) => entry.kind === "fact_missing" && entry.expected === "GBP 39.00")).toBe(true);
    expect(failures.some((entry) => entry.kind === "fact_invented" && entry.actual?.includes("139"))).toBe(true);
  });

  it("fails when a case is skipped, duplicated, or a browser representative is removed or replaced", () => {
    expect(validatePublicMessageCorpusManifest(publicMessageCorpusV1.slice(1))).not.toEqual([]);

    const duplicate = [...publicMessageCorpusV1.slice(0, -1), clone(publicMessageCorpusV1[0])];
    expect(validatePublicMessageCorpusManifest(duplicate).join(" ")).toContain("unique");

    const invalidBrowser = publicMessageCorpusV1.map((scenario) =>
      scenario.id === PUBLIC_MESSAGE_BROWSER_IDS[0]
        ? { ...scenario, browserRepresentative: false }
        : scenario.id === "refunds_purchases-04-refund_approved"
          ? { ...scenario, browserRepresentative: true }
          : scenario,
    );
    expect(validatePublicMessageCorpusManifest(invalidBrowser).join(" ")).toContain("Browser representative IDs");
  });

  it("rejects a generic fallback for an intended semantic result", () => {
    const journey = runPublicMessageScenario(find("adversarial-today_scope"));
    expect(journey.resultViewModel.title).not.toBe("No obvious saving or action found");
    expect(journey.adminCase.status).toBe("waiting");
    expect(journey.visibleText).toContain("No payment is required today");
    expect(journey.visibleText).toContain("could become payable later");
  });

  it("preserves refund modality, stage and open-complaint distinctions", () => {
    const possible = runPublicMessageScenario(find("refunds_purchases-17-refund_possible"));
    const promised = runPublicMessageScenario(find("refunds_purchases-03-refund_promised"));
    const approved = runPublicMessageScenario(find("refunds_purchases-04-refund_approved"));
    const issued = runPublicMessageScenario(find("refunds_purchases-05-refund_issued"));
    const complaint = runPublicMessageScenario(find("complaints_disputes-11-open_after_closure"));

    expect(possible.visibleText.toLowerCase()).toContain("may");
    expect(promised.visibleText).not.toBe(possible.visibleText);
    expect(approved.visibleText.toLowerCase()).toContain("approved");
    expect(issued.visibleText).not.toBe(approved.visibleText);
    expect(complaint.adminCase.status).not.toBe("resolved");
  });

  it("preserves the promised refund amount and exact period through fresh and reconstructed results", () => {
    for (const journey of freshAndReconstructed("refunds_purchases-03-refund_promised")) {
      expect(journey.resultViewModel.title).toBe("Refund promised");
      expect(journey.adminCase.status).toBe("waiting");
      expect(journey.resultViewModel.primaryStatusLabel).toBe(
        "Refund promised - not confirmed received",
      );
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Monitor the promised refund for 10 working days",
      );
      expect(journey.visibleText).toContain("within 10 working days");
      expect(journey.visibleText).toContain("not confirmed received");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).not.toContain("refund has arrived");
      expect(journey.resultViewModel.moneyMentioned).toContainEqual(
        expect.objectContaining({
          label: "Promised refund - not received",
          amountText: "GBP 39.00",
          countedInMoneyTracker: false,
        }),
      );
    }
  });

  it("keeps an open complaint and CMP-505 separate from account closure after reconstruction", () => {
    for (const journey of freshAndReconstructed("complaints_disputes-11-open_after_closure")) {
      expect(journey.resultViewModel.title).toBe("Complaint opportunity");
      expect(journey.adminCase.status).toBe("new");
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Keep the complaint reference and wait for the response",
      );
      expect(journey.visibleText).toContain("The complaint remains open");
      expect(journey.visibleText).toContain("CMP-505");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).not.toContain("complaint resolved");
    }
  });

  it("retains Universal Credit appointment identity without making an entitlement decision", () => {
    for (const journey of freshAndReconstructed("benefits_public_administration-01-uc_appointment")) {
      expect(journey.resultViewModel.title).toBe("Universal Credit appointment to prepare for");
      expect(journey.adminCase.status).toBe("ready_to_act");
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Check the Universal Credit appointment details and prepare to attend",
      );
      expect(journey.visibleText).toContain("13 August 2026");
      expect(journey.visibleText).toContain("cannot decide benefit entitlement");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).not.toContain("benefit entitlement confirmed");
    }
  });

  it("retains disciplinary-invitation identity and preparation boundaries", () => {
    for (const journey of freshAndReconstructed("employment_income-09-disciplinary_invitation")) {
      expect(journey.resultViewModel.title).toBe("Disciplinary hearing invitation to prepare for");
      expect(journey.adminCase.status).toBe("ready_to_act");
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Review the disciplinary invitation and gather relevant records",
      );
      expect(journey.visibleText).toContain("28 August 2026");
      expect(journey.visibleText).toContain("cannot decide whether the employer's action is lawful");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).not.toContain("disciplinary outcome decided");
    }
  });

  it("retains possession-notice urgency, uncertainty and independent advice", () => {
    for (const journey of freshAndReconstructed("housing_utilities-07-possession_wording")) {
      expect(journey.resultViewModel.title).toBe("Possession notice needs urgent checking");
      expect(journey.adminCase.status).toBe("ready_to_act");
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Check the possession notice urgently and seek independent housing advice",
      );
      expect(journey.visibleText).toContain("30 September 2026");
      expect(journey.visibleText).toContain("court action may follow");
      expect(journey.visibleText).toContain("eviction is not confirmed");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).not.toContain("you must leave");
    }
  });

  it("keeps the suspicious payment demand display-only and independently verifiable", () => {
    for (const journey of freshAndReconstructed("security_scams-01-suspicious_payment")) {
      expect(journey.resultViewModel.title).toBe("Email needs safety check");
      expect(journey.adminCase.status).toBe("new");
      expect(journey.resultViewModel.primaryStatusLabel).toBe("Caution - verify before acting");
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Avoid making the requested payment or using the message's link",
      );
      expect(journey.visibleText).toContain("Suspected payment-pressure scam pattern");
      expect(journey.visibleText).toContain("official website");
      expect(journey.visibleText).not.toContain("Identify the sender, date, reference, and deadline");
      expect(journey.visibleText).toContain("Not a scam determination");
      expect(journey.visibleText).not.toContain("this is a scam");
      expect(journey.resultViewModel.moneyMentioned).toContainEqual(
        expect.objectContaining({
          label: "Amount requested by message",
          amountText: "GBP 499.00",
          countedInMoneyTracker: false,
        }),
      );
    }
  });

  it("does not mutate records during evaluation or reconstruction", () => {
    const scenario = find("mandatory-a-pending-waiver");
    const before = JSON.stringify(scenario);
    runPublicMessageScenario(scenario);
    evaluatePublicMessageScenario(scenario);
    expect(JSON.stringify(scenario)).toBe(before);
    expect(scenario.corpusVersion).toBe(PUBLIC_MESSAGE_CORPUS_VERSION);
  });
});
