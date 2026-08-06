import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import {
  confirmationShapeOf,
  frontDoorPersonLabelOf,
} from "../frontDoorIntent/frontDoorConfirmationShape";
import { deriveFrontDoorOrientationView } from "../frontDoorIntent/frontDoorOrientationView";
import {
  frontDoorRouteReducer,
  initialFrontDoorRouteState,
  resolveFrontDoorRouteView,
} from "../frontDoorIntent/frontDoorRouteView";
import {
  buildNeedsIntakeSummary,
  carerNeedsIntakeReducer,
  initialCarerNeedsIntakeState,
  needsIntakeSummaryText,
} from "../carerNeedsIntake/carerNeedsIntake";
import {
  buildSupporterNeedsIntakeSummary,
  initialSupporterNeedsIntakeState,
  supporterNeedsIntakeReducer,
  supporterNeedsIntakeSummaryText,
} from "../supporterNeedsIntake/supporterNeedsIntake";
import {
  bothPeoplePreparationReducer,
  bothPeoplePreparationSummaryText,
  buildBothPeoplePreparationSummary,
  createBothPeoplePreparationState,
} from "../bothPeoplePreparation/bothPeoplePreparation";

const safeLabelFor = (text: string): string | undefined =>
  frontDoorPersonLabelOf(classifyFrontDoorIntent(text), text);

const directRelationships = [
  "father",
  "farther",
  "dad",
  "mother",
  "mum",
  "mam",
  "sister",
  "brother",
  "partner",
  "husband",
  "wife",
  "spouse",
  "son",
  "daughter",
  "child",
  "aunt",
  "uncle",
  "grandmother",
  "grandfather",
  "grandma",
  "grandad",
  "granddad",
  "nan",
  "nana",
  "gran",
  "friend",
  "neighbour",
  "neighbor",
] as const;

const compoundExamples = [
  {
    text: "My stepmother's neighbour needs help.",
    forbidden: "neighbour",
    shape: "care",
    routeKind: "confirmation",
  },
  { text: "My partner's mum needs support.", forbidden: "partner", shape: "care", routeKind: "confirmation" },
  { text: "My brother's friend is struggling.", forbidden: "brother", shape: "care", routeKind: "confirmation" },
  { text: "My daughter's teacher needs help.", forbidden: "daughter", shape: "care", routeKind: "confirmation" },
  { text: "My neighbour's husband needs support.", forbidden: "neighbour", shape: "care", routeKind: "confirmation" },
  { text: "My friend's dad has been discharged.", forbidden: "friend", shape: "general", routeKind: "document_analysis" },
  { text: "My sister's partner needs care.", forbidden: "sister", shape: "care", routeKind: "confirmation" },
  { text: "My landlord's mother needs help.", forbidden: "mother", shape: "care", routeKind: "confirmation" },
  { text: "My colleague's wife needs support.", forbidden: "wife", shape: "care", routeKind: "confirmation" },
  { text: "My son's friend needs help.", forbidden: "son", shape: "care", routeKind: "confirmation" },
] as const;

describe("safe Front Door relationship labels", () => {
  it.each(directRelationships)(
    "preserves the existing direct relationship %s",
    (relationship) => {
      expect(safeLabelFor(`My ${relationship} needs help.`)).toBe(relationship);
    },
  );

  it.each(compoundExamples)(
    "does not turn $text into the direct label $forbidden",
    ({ text, forbidden }) => {
      expect(safeLabelFor(text)).toBeUndefined();
      expect(safeLabelFor(text)).not.toBe(forbidden);
    },
  );

  it("recognises a curly-apostrophe possessive chain", () => {
    expect(
      safeLabelFor("My stepmother\u2019s neighbour needs help."),
    ).toBeUndefined();
  });

  it.each([
    "I help him every day.",
    "She needs support.",
    "Someone close to me needs help.",
    "A person I know needs care.",
    "My relative needs help.",
    "My family member needs support.",
  ])("uses no invented relationship label for %s", (text) => {
    expect(safeLabelFor(text)).toBeUndefined();
  });

  it.each([
    "My mum and my sister need help.",
    "My brother helps my neighbour every day.",
  ])("does not collapse multiple people into one direct relationship for %s", (text) => {
    const classification = classifyFrontDoorIntent(text);
    expect(classification.mentionedOtherPeople.length).toBeGreaterThan(1);
    expect(safeLabelFor(text)).toBeUndefined();
  });
});

describe("neutral fallback routing and gates", () => {
  it.each(compoundExamples)(
    "keeps the existing shape for $text without exposing a misleading direct label",
    ({ text, forbidden, shape, routeKind }) => {
      const classification = classifyFrontDoorIntent(text);
      const route = resolveFrontDoorRouteView(text);
      const orientation = deriveFrontDoorOrientationView(
        classification,
        "other_person",
        text,
      );

      expect(confirmationShapeOf(classification)).toBe(shape);
      expect(route.kind).toBe(routeKind);
      if (route.kind === "confirmation" && shape === "care") {
        expect(route.choices[0]?.label).toBe("Someone else");
        expect(route.choices[0]?.label).not.toBe(`My ${forbidden}`);
      }
      expect(orientation.personLabel).toBeUndefined();
      if (shape === "care") {
        expect(orientation.interpretation).toContain("the person you mentioned");
      }
      expect(orientation.interpretation).not.toContain(`your ${forbidden}`);
      expect(orientation.aboutOneOtherPerson).toBe(false);
      expect(orientation.aboutSupporterWithNamedPerson).toBe(false);
      expect(orientation.aboutBothPeopleWithNamedPerson).toBe(false);
    },
  );

  it("preserves the neutral label after Back and never retains a stale direct label", () => {
    const compound = "My stepmother's neighbour needs help.";
    let state = frontDoorRouteReducer(initialFrontDoorRouteState, {
      type: "input_received",
      text: compound,
    });
    state = frontDoorRouteReducer(state, {
      type: "choice_selected",
      choiceId: "other_person",
    });
    expect(state.view?.kind).toBe("orientation");
    if (state.view?.kind !== "orientation") throw new Error("expected orientation");
    expect(state.view.personLabel).toBeUndefined();

    state = frontDoorRouteReducer(state, { type: "go_back" });
    expect(state.view?.kind).toBe("confirmation");
    if (state.view?.kind !== "confirmation") throw new Error("expected confirmation");
    expect(state.view.choices[0]?.label).toBe("Someone else");

    state = frontDoorRouteReducer(state, {
      type: "input_received",
      text: "My sister needs help.",
    });
    if (state.view?.kind !== "confirmation") throw new Error("expected confirmation");
    expect(state.view.choices[0]?.label).toBe("My sister");
  });

  it.each([
    { choiceId: "other_person" as const, gate: "aboutOneOtherPerson" as const },
    {
      choiceId: "self_supporting" as const,
      gate: "aboutSupporterWithNamedPerson" as const,
    },
    { choiceId: "both" as const, gate: "aboutBothPeopleWithNamedPerson" as const },
  ])("keeps the valid direct sister gate $gate open", ({ choiceId, gate }) => {
    const text = "My sister needs help and supporting her is difficult for me.";
    const view = deriveFrontDoorOrientationView(
      classifyFrontDoorIntent(text),
      choiceId,
      text,
    );
    expect(view.personLabel).toBe("sister");
    expect(view[gate]).toBe(true);
  });
});

describe("downstream direct-label consistency", () => {
  it("uses one approved direct label in summaries, copied text, Back and reset", () => {
    const carer = {
      ...initialCarerNeedsIntakeState,
      step: "summary" as const,
      personLabel: "sister",
      originalInput: "My sister needs help.",
    };
    const supporter = {
      ...initialSupporterNeedsIntakeState,
      step: "summary" as const,
      personLabel: "sister",
      originalInput: "My sister needs help.",
    };
    const carerSummary = buildNeedsIntakeSummary(carer);
    const supporterSummary = buildSupporterNeedsIntakeSummary(supporter);

    expect(carerSummary.aboutLine).toBe(
      "What your sister finds difficult day to day",
    );
    expect(needsIntakeSummaryText(carerSummary)).toContain("your sister");
    expect(supporterSummary.who).toBe("Your sister");
    expect(supporterNeedsIntakeSummaryText(supporterSummary)).toContain(
      "Your sister",
    );
    expect(carerNeedsIntakeReducer(carer, { type: "back" }).personLabel).toBe(
      "sister",
    );
    expect(
      supporterNeedsIntakeReducer(supporter, { type: "reset" }).personLabel,
    ).toBe("sister");

    const both = createBothPeoplePreparationState(
      "sister",
      "My sister needs help.",
    );
    const bothSummary = buildBothPeoplePreparationSummary(both);
    expect(bothSummary.supportedPersonHeading).toBe("Support needed by sister");
    expect(bothSummary.supporterHeading).toBe(
      "How supporting sister affects you",
    );
    expect(bothPeoplePreparationSummaryText(bothSummary)).toContain(
      "Support needed by sister",
    );
    expect(
      bothPeoplePreparationReducer(both, { type: "reset_all" }).personLabel,
    ).toBe("sister");
  });
});

describe("fixed route precedence", () => {
  it("keeps benefits, bereavement, urgent and security outcomes unchanged", () => {
    expect(confirmationShapeOf(classifyFrontDoorIntent("Mum gets PIP and I help every day."))).toBe(
      "benefits",
    );
    expect(resolveFrontDoorRouteView("My father died yesterday.").kind).toBe(
      "confirmation",
    );
    expect(
      resolveFrontDoorRouteView("My mum has fallen and cannot get up.").kind,
    ).toBe("urgent_support");
    expect(
      resolveFrontDoorRouteView(
        "Send us the six-digit verification code you just received so we can secure your account.",
      ).kind,
    ).toBe("document_analysis");
  });
});
