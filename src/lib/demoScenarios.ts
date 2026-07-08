import { goldenLetterFixtures, type GoldenLetterFixture } from "./goldenLetters";

export type DemoScenario = {
  id: string;
  title: string;
  category: string;
  description: string;
  fixtureId: string;
  inputText: string;
  synthetic: true;
};

const demoDefinitions = [
  {
    id: "demo-uc-statement",
    title: "Universal Credit statement",
    category: "Benefits statement",
    description: "Shows dates, deductions, money mentioned, and what to check.",
    fixtureId: "benefits-uc-statement-001",
  },
  {
    id: "demo-uc-sanction",
    title: "Universal Credit sanction",
    category: "Benefits decision",
    description: "Shows payment risk, uncertainty, and a careful next step.",
    fixtureId: "benefits-uc-sanction-001",
  },
  {
    id: "demo-pip-decision",
    title: "PIP decision",
    category: "Benefits decision",
    description: "Shows decision dates, evidence to gather, and adviser-ready questions.",
    fixtureId: "benefits-pip-refusal-001",
  },
  {
    id: "demo-uc-deductions",
    title: "UC deductions",
    category: "Benefits deductions",
    description: "Shows display-only money and questions about deductions.",
    fixtureId: "benefits-uc-deductions-001",
  },
  {
    id: "demo-parking-letter",
    title: "Parking/legal-looking letter",
    category: "Debt or parking letter",
    description: "Shows cautious handling of a legal-looking parking demand.",
    fixtureId: "parking-legal-looking-001",
  },
  {
    id: "demo-debt-collection",
    title: "Debt collection letter",
    category: "Debt letter",
    description: "Shows money as display-only and documents to gather.",
    fixtureId: "debt-collection-001",
  },
  {
    id: "demo-consumer-refund",
    title: "Consumer refund refusal",
    category: "Consumer dispute",
    description: "Shows evidence and a preparation-only draft/checklist path.",
    fixtureId: "consumer-refund-refusal-001",
  },
  {
    id: "demo-suspicious-message",
    title: "Suspicious message",
    category: "Safety check",
    description: "Shows conservative wording for a scam-like message.",
    fixtureId: "suspicious-message-001",
  },
  {
    id: "demo-unclear-letter",
    title: "Unclear letter",
    category: "Unknown admin message",
    description: "Shows graceful fallback when there is not enough information.",
    fixtureId: "unknown-official-letter-001",
  },
] as const;

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
