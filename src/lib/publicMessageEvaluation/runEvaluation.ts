import type { AdminCase, AdminFinding, AdminItem } from "../../types";
import { buildBenefitsActionPack } from "../benefitsActionPack";
import { buildCaseProgress, flattenCaseProgressText } from "../caseProgress";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { deriveGuidedNextStep } from "../guidedNextSteps";
import { deriveImpactFromCase } from "../impactLedger";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import {
  buildResultViewModel,
  flattenResultViewModelText,
  normaliseResultText,
  validateResultViewModelSafety,
} from "../resultViewModel";
import { buildStrategicNextStepPlan } from "../strategicNextStep";
import type {
  PublicMessageCategory,
  PublicMessageEvaluationFailure,
  PublicMessageEvaluationReport,
  PublicMessageRisk,
  PublicMessageScenario,
} from "./types";
import { PUBLIC_MESSAGE_CORPUS_VERSION } from "./types";
import {
  PUBLIC_MESSAGE_BROWSER_IDS,
  PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS,
  PUBLIC_MESSAGE_EXPECTED_COUNT,
  PUBLIC_MESSAGE_EXPECTED_IDS,
  PUBLIC_MESSAGE_METAMORPHIC_GROUPS,
} from "./corpusManifestV1";

const categories: PublicMessageCategory[] = [
  "bills_accounts_services",
  "refunds_purchases",
  "complaints_disputes",
  "benefits_public_administration",
  "employment_income",
  "housing_utilities",
  "bereavement_general",
  "security_scams",
  "neutral_low_action",
];

const risks: PublicMessageRisk[] = ["low", "medium", "high"];

const blankCategoryTotals = () =>
  Object.fromEntries(categories.map((category) => [category, 0])) as Record<
    PublicMessageCategory,
    number
  >;

const blankRiskTotals = () =>
  Object.fromEntries(risks.map((risk) => [risk, 0])) as Record<PublicMessageRisk, number>;

const normalise = (value: string) => normaliseResultText(value);

const contains = (haystack: string, needle: string) =>
  normalise(haystack).includes(normalise(needle));

const actionText = (action: ReturnType<typeof deriveGuidedNextStep>["primaryAction"]) =>
  Object.values(action)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string")
    .join("\n");

type StoredJourneyRecords = {
  item: AdminItem;
  findings: AdminFinding[];
  cases: AdminCase[];
};

const composeJourney = (stored: StoredJourneyRecords, scenarioId: string) => {
  const adminCase = selectMostImportantCase(stored.cases);

  if (!adminCase) {
    throw new Error(`No case was created for ${scenarioId}`);
  }

  const finding = stored.findings.find((candidate) => candidate.id === adminCase.findingId);
  const opportunity = deriveOpportunityCard(adminCase, stored.item, finding);
  const benefitsActionPack = adminCase.decisionResult
    ? buildBenefitsActionPack(adminCase.decisionResult, opportunity, adminCase)
    : null;
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult: adminCase.decisionResult,
    benefitsActionPack,
    opportunity,
    adminCase,
  });
  const resultViewModel = buildResultViewModel({
    decisionResult: adminCase.decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
    opportunity,
    adminCase,
    careerSupportPack: adminCase.careerSupportPack,
  });
  const progress = buildCaseProgress({ resultViewModel, decisionResult: adminCase.decisionResult });
  const guidedNextStep = deriveGuidedNextStep(adminCase, stored.item, finding);
  const impactEntries = deriveImpactFromCase(adminCase, stored.item, finding);
  const visibleText = [
    flattenResultViewModelText(resultViewModel),
    flattenCaseProgressText(progress),
    actionText(guidedNextStep.primaryAction),
    ...guidedNextStep.secondaryActions.map(actionText),
  ].join("\n");

  return {
    item: stored.item,
    findings: stored.findings,
    cases: stored.cases,
    finding,
    adminCase,
    opportunity,
    resultViewModel,
    progress,
    guidedNextStep,
    impactEntries,
    visibleText,
  };
};

export const runPublicMessageScenario = (scenario: PublicMessageScenario) => {
  const item: AdminItem = {
    id: `synthetic-${scenario.id}`,
    // Match the real paste-only submission path. Corpus labels are test metadata
    // and must never enter analysis or satisfy a semantic assertion.
    title: "Pasted admin text",
    sourceType: "email",
    rawText: scenario.message,
    userQuestion: scenario.userQuestion,
    createdAt: "2026-07-31T09:00:00.000Z",
  };
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  return composeJourney({ item, findings, cases }, scenario.id);
};

type Journey = ReturnType<typeof runPublicMessageScenario>;

export const reconstructPublicMessageJourney = (journey: Journey, scenarioId = journey.item.id) => {
  const stored = JSON.parse(
    JSON.stringify({ item: journey.item, findings: journey.findings, cases: journey.cases }),
  ) as StoredJourneyRecords;
  return composeJourney(stored, scenarioId);
};

const semanticSnapshot = (journey: Journey) => ({
  finding: journey.finding
    ? {
        category: journey.finding.category,
        title: journey.finding.title,
        summary: journey.finding.summary,
        status: journey.finding.status,
        deadline: journey.finding.deadline,
      }
    : undefined,
  case: {
    category: journey.adminCase.category,
    title: journey.adminCase.title,
    status: journey.adminCase.status,
    urgency: journey.adminCase.urgency,
  },
  opportunity: {
    type: journey.opportunity.opportunityType,
    title: journey.opportunity.title,
    status: journey.opportunity.statusLabel,
    deadline: journey.opportunity.deadline,
  },
  resultText: flattenResultViewModelText(journey.resultViewModel),
  progressText: flattenCaseProgressText(journey.progress),
  nextStep: {
    primaryKind: journey.guidedNextStep.primaryAction.kind,
    primaryText: actionText(journey.guidedNextStep.primaryAction),
    secondary: journey.guidedNextStep.secondaryActions.map((action) => ({
      kind: action.kind,
      text: actionText(action),
    })),
  },
  impacts: journey.impactEntries.map(({ id: _id, caseId: _caseId, createdAt: _createdAt, updatedAt: _updatedAt, ...entry }) => entry),
});

const failure = (
  scenario: PublicMessageScenario,
  kind: PublicMessageEvaluationFailure["kind"],
  message: string,
  expected?: string,
  actual?: string,
): PublicMessageEvaluationFailure => ({
  scenarioId: scenario.id,
  category: scenario.category,
  kind,
  message,
  expected,
  actual,
});

const amountValues = (value: string) =>
  [...value.matchAll(/(?:GBP\s*|£\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter(Number.isFinite);

const sameAmount = (left: number, right: number) =>
  Math.round(left * 100) === Math.round(right * 100);

const matchingMoneyLines = (journey: Journey, value: number) =>
  journey.resultViewModel.moneyMentioned.filter((line) =>
    amountValues(line.amountText).some((candidate) => sameAmount(candidate, value)),
  );

const amountIsVisible = (journey: Journey, value: number) =>
  matchingMoneyLines(journey, value).length > 0;

const structuredReferenceText = (journey: Journey) =>
  journey.resultViewModel.evidenceFound
    .filter((entry) => /reference|case number|account number/i.test(`${entry.label} ${entry.value}`))
    .flatMap((entry) => [entry.label, entry.value, entry.sourceQuote ?? ""])
    .join("\n");

const primaryClaimText = (journey: Journey) =>
  [
    journey.resultViewModel.title,
    journey.resultViewModel.summary,
    journey.resultViewModel.directAnswer ?? "",
    journey.resultViewModel.primaryStatusLabel ?? "",
    ...journey.resultViewModel.evidenceFound.flatMap((entry) => [entry.label, entry.value]),
    ...journey.resultViewModel.moneyMentioned.flatMap((entry) => [entry.label, entry.amountText]),
  ].join("\n");

const classificationConcepts: Record<string, readonly string[]> = {
  display_only: ["mentioned", "display only", "check"],
  amount_requested: ["due", "payable", "requested", "outstanding", "arrears", "deduction"],
  balance_under_review: ["under review", "not confirmed", "pending", "no decision"],
  former_balance: ["former", "cancelled", "removed", "no payment"],
  refund_promised: ["will refund", "promised", "not received", "pending"],
  refund_issued: ["issued", "sent", "pending recovery"],
  refund_received: ["received", "reached", "confirmed"],
  store_credit: ["store credit", "credit"],
  recurring_charge: ["monthly", "annual", "recurring", "subscription", "instalment"],
  automatic_collection: ["direct debit", "collected", "automatic"],
  unknown: ["check", "unknown"],
};

const dependencyConcepts = (dependency: string): readonly string[] => {
  const normalised = normalise(dependency);
  if (normalised.includes("complaint")) return ["complaint", "open", "investigation", "response"];
  if (normalised.includes("document") || normalised.includes("evidence") || normalised.includes("death certificate")) {
    return ["document", "evidence", "death certificate", "form", "photos", "statement"];
  }
  if (normalised.includes("deadline") || normalised.includes("payment or dispute")) {
    return ["deadline", "due", "pay", "contact", "reply", "respond", "dispute", "check"];
  }
  if (normalised.includes("direct debit")) return ["direct debit", "collected", "pending"];
  if (normalised.includes("refund")) return ["refund", "not confirmed received", "not yet", "pending"];
  if (normalised.includes("future liability")) return ["may become payable", "future payment", "after review"];
  return ["under review", "review", "pending", "no decision", "respond", "update"];
};

const knownAssertionTypes = new Set([
  "title_concept",
  "status",
  "opportunity",
  "next_step",
  "visible_concept",
  "prohibited_concept",
  "source_date",
  "source_period",
  "source_reference",
  "source_amount",
  "dependency",
  "support_route",
]);

export const evaluatePublicMessageScenario = (
  scenario: PublicMessageScenario,
): PublicMessageEvaluationFailure[] => {
  const failures: PublicMessageEvaluationFailure[] = [];
  let fresh: Journey;
  let reconstructed: Journey;

  try {
    fresh = runPublicMessageScenario(scenario);
    reconstructed = reconstructPublicMessageJourney(fresh, scenario.id);
  } catch (error) {
    return [
      failure(
        scenario,
        "routing",
        "The public pipeline did not produce a complete journey.",
        "A composed public result",
        error instanceof Error ? error.message : String(error),
      ),
    ];
  }

  if (scenario.corpusVersion !== PUBLIC_MESSAGE_CORPUS_VERSION || !scenario.id || !scenario.message.trim()) {
    failures.push(failure(scenario, "schema", "The corpus record is incomplete or has the wrong version."));
  }

  if (!scenario.expected.assertions || scenario.expected.assertions.length === 0) {
    failures.push(failure(scenario, "schema", "The scenario has no explicit semantic assertions."));
  }
  for (const assertion of scenario.expected.assertions ?? []) {
    if (!knownAssertionTypes.has((assertion as { type?: string }).type ?? "")) {
      failures.push(
        failure(
          scenario,
          "schema",
          "An unknown assertion type was rejected fail-closed.",
          [...knownAssertionTypes].join(" | "),
          (assertion as { type?: string }).type,
        ),
      );
    }
  }

  if (/\b(?:real customer|gmail account|private corpus|actual claimant)\b/i.test(scenario.message)) {
    failures.push(failure(scenario, "synthetic_hygiene", "The scenario contains a prohibited non-synthetic marker."));
  }

  for (const concept of scenario.expected.titleConcepts ?? []) {
    const alternatives = typeof concept === "string" ? [concept] : concept;
    if (!alternatives.some((item) => contains(fresh.resultViewModel.title, item))) {
      failures.push(
        failure(
          scenario,
          "composition",
          "The final visible title does not identify an expected result family.",
          alternatives.join(" | "),
          fresh.resultViewModel.title,
        ),
      );
    }
  }

  if (
    scenario.expected.routeOutcome === "security_primary" &&
    fresh.opportunity.opportunityType !== "suspicious_email_risk"
  ) {
    failures.push(failure(scenario, "routing", "The scenario did not take the required primary security route."));
  }
  if (
    scenario.expected.routeOutcome !== "security_primary" &&
    fresh.opportunity.opportunityType === "suspicious_email_risk"
  ) {
    failures.push(failure(scenario, "precedence", "Security incorrectly replaced the expected public route."));
  }
  if (
    scenario.expected.routeOutcome === "public_scope_boundary" &&
    fresh.adminCase.decisionResult
  ) {
    failures.push(failure(scenario, "routing", "A public-scope boundary scenario entered a specialist decision route."));
  }

  if (!scenario.expected.allowedStatuses?.includes(fresh.adminCase.status) && scenario.expected.allowedStatuses) {
    failures.push(
      failure(
        scenario,
        "status",
        "The composed case status is outside the expected safe states.",
        scenario.expected.allowedStatuses.join(" | "),
        fresh.adminCase.status,
      ),
    );
  }

  if (
    scenario.expected.opportunityTypes &&
    !scenario.expected.opportunityTypes.includes(fresh.opportunity.opportunityType)
  ) {
    failures.push(
      failure(
        scenario,
        "precedence",
        "The primary opportunity does not match an expected interpretation.",
        scenario.expected.opportunityTypes.join(" | "),
        fresh.opportunity.opportunityType,
      ),
    );
  }

  for (const concept of scenario.expected.requiredVisibleConcepts) {
    const alternatives = typeof concept === "string" ? [concept] : concept;
    if (!alternatives.some((item) => contains(fresh.visibleText, item))) {
      failures.push(
        failure(
          scenario,
          "composition",
          "A required concept is missing from the composed result.",
          alternatives.join(" | "),
        ),
      );
    }
  }

  for (const concept of scenario.expected.prohibitedVisibleConcepts) {
    if (contains(fresh.visibleText, concept)) {
      failures.push(
        failure(
          scenario,
          "safety",
          "A prohibited claim is visible in the composed result.",
          `Must not contain: ${concept}`,
          concept,
        ),
      );
    }
  }

  for (const date of scenario.expected.expectedDates ?? []) {
    const structured = fresh.resultViewModel.keyDates.some(
      (entry) => contains(entry.value, date) || contains(entry.sourceQuote ?? "", date),
    );
    if (!structured) {
      failures.push(failure(scenario, "fact_missing", "An expected source date was lost.", date));
    }
  }

  for (const period of scenario.expected.expectedRelativePeriods ?? []) {
    if (!contains(fresh.visibleText, period)) {
      failures.push(failure(scenario, "fact_missing", "An expected relative period was lost.", period));
    }
  }

  for (const reference of scenario.expected.expectedReferences ?? []) {
    if (!contains(structuredReferenceText(fresh), reference)) {
      failures.push(failure(scenario, "fact_missing", "An expected reference was lost.", reference));
    }
  }

  const declaredDates = scenario.sourceFacts.dates ?? [];
  for (const date of fresh.resultViewModel.keyDates) {
    if (/check (?:the )?(?:original|case)/i.test(date.value)) continue;
    if (!declaredDates.some((declared) => contains(date.value, declared) || contains(date.sourceQuote ?? "", declared))) {
      failures.push(
        failure(scenario, "fact_invented", "The result displays a date not declared by the source facts.", declaredDates.join(" | "), date.value),
      );
    }
  }

  const declaredAmounts = scenario.sourceFacts.amounts ?? [];
  for (const line of fresh.resultViewModel.moneyMentioned) {
    if (/check the original document/i.test(line.amountText)) continue;
    for (const displayed of amountValues(line.amountText)) {
      if (!declaredAmounts.some((amount) => sameAmount(amount.value, displayed))) {
        failures.push(
          failure(
            scenario,
            "fact_invented",
            "The result displays an amount not declared by the source facts.",
            declaredAmounts.map((amount) => `GBP ${amount.value.toFixed(2)}`).join(" | "),
            line.amountText,
          ),
        );
      }
    }
  }

  const declaredReferences = scenario.sourceFacts.references ?? [];
  const displayedReferenceText = structuredReferenceText(fresh);
  for (const reference of displayedReferenceText.match(/\b[A-Z]{2,}[A-Z0-9]*(?:[-/]\d+[A-Z0-9/-]*|\d+[A-Z0-9/-]*)\b/g) ?? []) {
    if (!declaredReferences.some((declared) => normalise(declared) === normalise(reference))) {
      failures.push(failure(scenario, "fact_invented", "The result displays an unsupported reference.", declaredReferences.join(" | "), reference));
    }
  }

  const expectedAmounts = scenario.expected.amounts ??
    (scenario.expected.amount
      ? [{ ...scenario.expected.amount, sourceRole: scenario.expected.primaryMeaning }]
      : []);
  for (const expectedAmount of expectedAmounts) {
    const lines = matchingMoneyLines(fresh, expectedAmount.value);
    if (!amountIsVisible(fresh, expectedAmount.value)) {
      failures.push(
        failure(
          scenario,
          "fact_missing",
          "The expected source amount is not visible in the composed result.",
          `GBP ${expectedAmount.value.toFixed(2)}`,
        ),
      );
    }
    if (lines.some((line) => line.countedInMoneyTracker !== false)) {
      failures.push(failure(scenario, "money_safety", "Source money was made eligible for the money tracker."));
    }
    const associatedText = [
      ...lines.flatMap((line) => [line.label, line.amountText, line.caution, line.sourceQuote ?? ""]),
      primaryClaimText(fresh),
    ].join("\n");
    const qualifiers = classificationConcepts[expectedAmount.classification] ?? [];
    if (qualifiers.length > 0 && !qualifiers.some((term) => contains(associatedText, term))) {
      failures.push(
        failure(
          scenario,
          "qualifier_loss",
          "The amount is not attached to its governed source classification.",
          `${expectedAmount.classification}: ${expectedAmount.sourceRole}`,
        ),
      );
    }
  }

  const dependencies = scenario.sourceFacts.dependencies ?? [];
  for (const dependency of dependencies) {
    const concepts = dependencyConcepts(dependency);
    const matchedConcepts = concepts.filter((term) => contains(primaryClaimText(fresh), term));
    const minimumMatches = concepts.length >= 3 ? 2 : 1;
    if (matchedConcepts.length < minimumMatches) {
      failures.push(
        failure(
          scenario,
          "fact_missing",
          "An unresolved source dependency was dropped from the final result.",
          `${dependency}: ${concepts.join(" | ")}`,
        ),
      );
    }
    if (fresh.adminCase.status === "resolved" || fresh.adminCase.status === "no_action_needed") {
      failures.push(
        failure(
          scenario,
          "fact_invented",
          "The result marks a scenario resolved while a declared dependency remains open.",
          dependency,
          fresh.adminCase.status,
        ),
      );
    }
  }

  const sourceStatus = (scenario.sourceFacts.statusIndicators ?? []).join(" ");
  if (
    fresh.adminCase.status === "resolved" &&
    !/\b(?:resolved|closed|cancelled|removed|no payment is required)\b/i.test(sourceStatus)
  ) {
    failures.push(failure(scenario, "fact_invented", "Resolved status is not supported by declared source status facts."));
  }
  if (
    /\b(?:refund (?:was |has been )?received|refund reached|money has arrived)\b/i.test(primaryClaimText(fresh)) &&
    !/\b(?:received|reached)\b/i.test(scenario.message)
  ) {
    failures.push(failure(scenario, "fact_invented", "The result claims refund receipt without source support."));
  }
  if (
    /\b(?:payment is required|amount (?:is )?due|remains payable|must pay)\b/i.test(primaryClaimText(fresh)) &&
    !/\b(?:payment is required|due|payable|remains outstanding|arrears|overdue)\b/i.test(scenario.message)
  ) {
    failures.push(failure(scenario, "fact_invented", "The result introduces an unsupported payment obligation."));
  }

  if (
    scenario.expected.nextStepKinds &&
    !scenario.expected.nextStepKinds.includes(fresh.guidedNextStep.primaryAction.kind)
  ) {
    failures.push(
      failure(
        scenario,
        "next_step",
        "The primary preparation action has the wrong kind.",
        scenario.expected.nextStepKinds.join(" | "),
        fresh.guidedNextStep.primaryAction.kind,
      ),
    );
  }

  if (
    scenario.expected.allowedImpactTypes &&
    fresh.impactEntries.some((entry) => !scenario.expected.allowedImpactTypes?.includes(entry.type))
  ) {
    failures.push(
      failure(
        scenario,
        "money_safety",
        "The pipeline created an impact type that the scenario does not permit.",
        scenario.expected.allowedImpactTypes.join(" | "),
        fresh.impactEntries.map((entry) => entry.type).join(" | "),
      ),
    );
  }

  if (
    scenario.expected.suggestOfficialVerification &&
    !["official", "verified", "directly", "original organisation"].some((term) =>
      contains(fresh.visibleText, term),
    )
  ) {
    failures.push(failure(scenario, "next_step", "Official or independently obtained verification is not suggested."));
  }

  if (
    scenario.expected.suggestIndependentSupport &&
    !["independent", "specialist", "qualified", "advice", "support"].some((term) =>
      contains(fresh.visibleText, term),
    )
  ) {
    failures.push(failure(scenario, "next_step", "Independent or specialist support is not suggested."));
  }

  const safety = validateResultViewModelSafety(fresh.resultViewModel, {
    sourceText: scenario.message,
  });
  if (!safety.datesSourceSupported || !safety.moneySourceSupported) {
    failures.push(
      failure(
        scenario,
        "fact_invented",
        "The canonical source-support validator found an unsupported date or amount.",
        "datesSourceSupported=true; moneySourceSupported=true",
        JSON.stringify({
          datesSourceSupported: safety.datesSourceSupported,
          moneySourceSupported: safety.moneySourceSupported,
        }),
      ),
    );
  }
  if (!safety.safe) {
    failures.push(
      failure(
        scenario,
        "safety",
        "The canonical result-view safety validator rejected the composed result.",
        "safe=true",
        JSON.stringify(safety),
      ),
    );
  }

  if (JSON.stringify(semanticSnapshot(fresh)) !== JSON.stringify(semanticSnapshot(reconstructed))) {
    failures.push(
      failure(
        scenario,
        "reconstruction",
        "Semantic output changed after the same records were serialized and reconstructed.",
      ),
    );
  }

  return failures;
};

export const validatePublicMessageCorpusManifest = (
  corpus: readonly PublicMessageScenario[],
) => {
  const errors: string[] = [];
  const ids = corpus.map((scenario) => scenario.id);
  if (corpus.length !== PUBLIC_MESSAGE_EXPECTED_COUNT) {
    errors.push(`Expected exactly ${PUBLIC_MESSAGE_EXPECTED_COUNT} scenarios; received ${corpus.length}.`);
  }
  if (new Set(ids).size !== ids.length) {
    errors.push("Scenario IDs must be unique.");
  }
  if (JSON.stringify(ids) !== JSON.stringify(PUBLIC_MESSAGE_EXPECTED_IDS)) {
    errors.push("Scenario IDs or their immutable order do not match the v1 manifest.");
  }

  for (const category of categories) {
    const actual = corpus.filter((scenario) => scenario.category === category).length;
    if (actual !== PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS[category]) {
      errors.push(`Category ${category} expected ${PUBLIC_MESSAGE_EXPECTED_CATEGORY_TOTALS[category]}; received ${actual}.`);
    }
  }

  const browserIds = corpus.filter((scenario) => scenario.browserRepresentative).map((scenario) => scenario.id);
  if (JSON.stringify(browserIds) !== JSON.stringify(PUBLIC_MESSAGE_BROWSER_IDS)) {
    errors.push("Browser representative IDs do not match the v1 manifest.");
  }

  for (const [group, expectedIds] of Object.entries(PUBLIC_MESSAGE_METAMORPHIC_GROUPS)) {
    const actualIds = corpus.filter((scenario) => scenario.metamorphicGroup === group).map((scenario) => scenario.id);
    if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
      errors.push(`Metamorphic group ${group} does not match the v1 manifest.`);
    }
  }
  const knownGroups = new Set(Object.keys(PUBLIC_MESSAGE_METAMORPHIC_GROUPS));
  const unexpectedGroups = uniqueStrings(
    corpus
      .map((scenario) => scenario.metamorphicGroup)
      .filter((group): group is string => typeof group === "string" && !knownGroups.has(group)),
  );
  if (unexpectedGroups.length > 0) {
    errors.push(`Unexpected metamorphic groups: ${unexpectedGroups.join(", ")}.`);
  }

  return errors;
};

const uniqueStrings = (values: readonly string[]) => [...new Set(values)];

export const evaluatePublicMessageCorpus = (
  corpus: readonly PublicMessageScenario[],
): PublicMessageEvaluationReport => {
  const manifestFailures: PublicMessageEvaluationFailure[] = validatePublicMessageCorpusManifest(corpus).map(
    (message) => ({
      scenarioId: "<corpus-manifest>",
      category: "bills_accounts_services",
      kind: "manifest",
      message,
    }),
  );
  const failures = [...manifestFailures, ...corpus.flatMap(evaluatePublicMessageScenario)];
  const corpusIds = new Set(corpus.map((scenario) => scenario.id));
  const failedIds = new Set(
    failures.map((entry) => entry.scenarioId).filter((id) => corpusIds.has(id)),
  );
  const totalsByCategory = blankCategoryTotals();
  const totalsByRisk = blankRiskTotals();

  for (const scenario of corpus) {
    totalsByCategory[scenario.category] += 1;
    totalsByRisk[scenario.risk] += 1;
  }

  return {
    corpusVersion: PUBLIC_MESSAGE_CORPUS_VERSION,
    total: corpus.length,
    passed: corpus.length - failedIds.size,
    failed: failedIds.size,
    failures,
    totalsByCategory,
    totalsByRisk,
  };
};

export const formatPublicMessageEvaluationReport = (report: PublicMessageEvaluationReport) => {
  const grouped = new Map<string, PublicMessageEvaluationFailure[]>();
  for (const entry of report.failures) {
    const key = `${entry.kind} / ${entry.category}`;
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }

  const lines = [
    `Public-message corpus ${report.corpusVersion}`,
    `Scenarios: ${report.total}; passed: ${report.passed}; failed: ${report.failed}`,
  ];
  for (const [group, entries] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push("", `${group} (${entries.length})`);
    for (const entry of entries) {
      lines.push(`- ${entry.scenarioId}: ${entry.message}${entry.expected ? ` Expected: ${entry.expected}.` : ""}`);
    }
  }

  return lines.join("\n");
};
