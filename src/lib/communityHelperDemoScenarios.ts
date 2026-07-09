import type { CommunityHelperRole } from "./communityHelperPack";

// Community Helper Demo UI v1
//
// Small, hardcoded set of synthetic demo scenarios for the gated
// Community Helper demo section inside DemoTourView. These are NOT wired
// into the golden letter fixture corpus (src/lib/goldenLetters.ts) or the
// main demoScenarios list (src/lib/demoScenarios.ts) - they exist purely to
// showcase the already-built CommunityHelperPack pipeline
// (communityHelperPack -> resultViewModel -> caseProgress ->
// adviserExportPack) inside the demo/tour surface. No classifier changes,
// no HomeView routing, no OCR/file-intake changes: see
// docs/product/community-helper-demo-ui-v1.md.
//
// Every inputText below is synthetic and deliberately avoids naming a real
// person, place, or organisation.

export type CommunityHelperDemoScenario = {
  id: string;
  title: string;
  description: string;
  inputText: string;
  role: CommunityHelperRole;
};

export const communityHelperDemoScenarios: CommunityHelperDemoScenario[] = [
  {
    id: "community-demo-missed-letters",
    title: "Missed letters or deadlines",
    description:
      "Shows a preparation pack for someone who has missed official letters and an appointment deadline.",
    inputText:
      "Dad has missed several letters and an appointment deadline recently. He did not open one letter until after the reply-by date had already passed, and two reminder letters followed. He is finding it hard to know which letters are urgent and which can wait.",
    role: "helping_someone",
  },
  {
    id: "community-demo-ot-visit",
    title: "OT or support visit preparation",
    description:
      "Shows a preparation pack for an upcoming occupational therapist or support worker visit.",
    inputText:
      "An occupational therapist visit is coming up next week to see how Mum manages at home. We want to prepare notes about her daily routine, what she finds difficult, and questions to ask during the visit.",
    role: "helping_someone",
  },
  {
    id: "community-demo-urgent-safeguarding",
    title: "Urgent safeguarding-like signposting",
    description:
      "Shows the conservative signposting-only response when wording suggests someone may be at risk.",
    inputText:
      "I am worried someone I support may be in immediate danger at home. There are concerns about possible abuse and neglect, and I am not sure what to do next.",
    role: "helping_someone",
  },
  {
    id: "community-demo-financial-concern",
    title: "Possible financial admin concern",
    description:
      "Shows factual, non-accusatory preparation wording for a possible financial admin concern.",
    inputText:
      "My friend is vulnerable and confused about bank card use, bills, missing payments, and someone else controlling their money. I am not sure what has actually happened yet.",
    role: "helping_someone",
  },
];
