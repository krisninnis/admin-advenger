import { goldenLetterFixtures, type GoldenLetterFixture } from "./goldenLetters";

export type DemoScenario = {
  id: string;
  title: string;
  category: string;
  description: string;
  fixtureId: string;
  inputText: string;
  synthetic: true;
  demoKind: "standard" | "workplace";
};

const demoDefinitions = [
  {
    id: "demo-uc-adviser-deductions-overpayment",
    title: "Universal Credit deductions and overpayment recovery",
    category: "Benefits statement",
    description:
      "A fictional Universal Credit statement showing advance repayment and overpayment deductions. Demonstrates payment breakdown, uncertainty, evidence preparation and adviser questions.",
    fixtureId: "benefits-uc-adviser-demo-001",
    demoKind: "standard",
  },
  {
    id: "demo-uc-statement",
    title: "Universal Credit statement",
    category: "Benefits statement",
    description: "Shows dates, deductions, money mentioned, and what to check.",
    fixtureId: "benefits-uc-statement-001",
    demoKind: "standard",
  },
  {
    id: "demo-uc-sanction",
    title: "Universal Credit sanction",
    category: "Benefits decision",
    description: "Shows payment risk, uncertainty, and a careful next step.",
    fixtureId: "benefits-uc-sanction-001",
    demoKind: "standard",
  },
  {
    id: "demo-pip-decision",
    title: "PIP decision",
    category: "Benefits decision",
    description: "Shows decision dates, evidence to gather, and adviser-ready questions.",
    fixtureId: "benefits-pip-refusal-001",
    demoKind: "standard",
  },
  {
    id: "demo-uc-deductions",
    title: "UC deductions",
    category: "Benefits deductions",
    description: "Shows display-only money and questions about deductions.",
    fixtureId: "benefits-uc-deductions-001",
    demoKind: "standard",
  },
  {
    id: "demo-parking-letter",
    title: "Parking/legal-looking letter",
    category: "Debt or parking letter",
    description: "Shows cautious handling of a legal-looking parking demand.",
    fixtureId: "parking-legal-looking-001",
    demoKind: "standard",
  },
  {
    id: "demo-debt-collection",
    title: "Debt collection letter",
    category: "Debt letter",
    description: "Shows money as display-only and documents to gather.",
    fixtureId: "debt-collection-001",
    demoKind: "standard",
  },
  {
    id: "demo-consumer-refund",
    title: "Consumer refund refusal",
    category: "Consumer dispute",
    description: "Shows evidence and a preparation-only draft/checklist path.",
    fixtureId: "consumer-refund-refusal-001",
    demoKind: "standard",
  },
  {
    id: "demo-suspicious-message",
    title: "Suspicious message",
    category: "Safety check",
    description: "Shows conservative wording for a scam-like message.",
    fixtureId: "suspicious-message-001",
    demoKind: "standard",
  },
  {
    id: "demo-unclear-letter",
    title: "Unclear letter",
    category: "Unknown admin message",
    description: "Shows graceful fallback when there is not enough information.",
    fixtureId: "unknown-official-letter-001",
    demoKind: "standard",
  },
  {
    id: "demo-workplace-disciplinary",
    title: "Workplace: disciplinary meeting invite",
    category: "Workplace preparation",
    description: "Shows meeting details, evidence to gather, and questions to ask before deciding what to do.",
    fixtureId: "workplace-disciplinary-invite-001",
    demoKind: "workplace",
  },
  {
    id: "demo-workplace-pay-wage",
    title: "Workplace: pay or wage confusion",
    category: "Workplace preparation",
    description: "Shows payslip, rota, hours, and payroll questions without counting money as saved or recovered.",
    fixtureId: "workplace-wage-deduction-001",
    demoKind: "workplace",
  },
  {
    id: "demo-workplace-sickness-capability",
    title: "Workplace: sickness or capability meeting",
    category: "Workplace preparation",
    description: "Shows meeting preparation, support questions, and documents to gather.",
    fixtureId: "workplace-sickness-meeting-001",
    demoKind: "workplace",
  },
  {
    id: "demo-workplace-redundancy",
    title: "Workplace: redundancy consultation",
    category: "Workplace preparation",
    description: "Shows consultation dates, role details, evidence, and questions for a human adviser or representative.",
    fixtureId: "workplace-redundancy-consultation-001",
    demoKind: "workplace",
  },
  {
    id: "demo-workplace-settlement",
    title: "Workplace: settlement agreement warning",
    category: "Workplace preparation",
    description: "Shows human-review signposting without assessing the agreement or preparing a response.",
    fixtureId: "workplace-settlement-agreement-001",
    demoKind: "workplace",
  },
  {
    id: "demo-workplace-unclear",
    title: "Workplace: unclear workplace message",
    category: "Workplace preparation",
    description: "Shows a conservative workplace fallback when the exact process is not clear.",
    fixtureId: "workplace-vague-message-001",
    demoKind: "workplace",
  },
] as const satisfies ReadonlyArray<Omit<DemoScenario, "inputText" | "synthetic">>;

const fixturesById = new Map(goldenLetterFixtures.map((fixture) => [fixture.id, fixture]));

const getFixture = (fixtureId: string): GoldenLetterFixture => {
  const fixture = fixturesById.get(fixtureId);

  if (!fixture) {
    throw new Error(`Missing golden letter fixture for demo: ${fixtureId}`);
  }

  return fixture;
};

export const demoScenarios: DemoScenario[] = demoDefinitions.map((demo) => {
  const fixture = getFixture(demo.fixtureId);

  return {
    ...demo,
    inputText: fixture.inputText,
    synthetic: true,
  };
});

export const standardDemoScenarios = demoScenarios.filter(
  (scenario) => scenario.demoKind === "standard",
);

export const workplaceDemoScenarios = demoScenarios.filter(
  (scenario) => scenario.demoKind === "workplace",
);
