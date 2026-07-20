import { describe, expect, it } from "vitest";
import {
  classifyDecisionDocument,
  hasEssentialHardshipContext,
} from "../classifier";

describe("decision document classifier edge cases", () => {
  it.each([
    "We can repair the faulty item under warranty.",
    "Your warranty expires next month.",
    "This is covered by the manufacturer's warranty.",
    "The complaint was unwarranted.",
    "A refund may be warranted after inspection.",
  ])("does not treat ordinary warranty wording as enforcement: %s", (text) => {
    expect(classifyDecisionDocument(text)).not.toBe("bailiff_notice");
  });

  it.each([
    "A warrant of control has been issued.",
    "Enforcement agents may attend under a court warrant.",
    "The bailiff says they have a warrant.",
    "A court warrant was issued for enforcement.",
  ])("still treats warrant enforcement wording as bailiff/enforcement: %s", (text) => {
    expect(classifyDecisionDocument(text)).toBe("bailiff_notice");
  });

  it.each([
    "My benefits have stopped and I cannot buy food or heat the home.",
    "I have no money for food until next week.",
    "There is no food in the house and I cannot afford electricity.",
    "I cannot afford to put the heating on.",
    "We have no heating and cannot keep the children warm.",
    "My Universal Credit stopped and I cannot pay for food.",
    "I have been evicted and have nowhere to stay tonight.",
    "The enforcement agent is coming tomorrow and I have no money for essentials.",
  ])("recognises essential-hardship context: %s", (text) => {
    expect(hasEssentialHardshipContext(text)).toBe(true);
  });

  it.each([
    "The restaurant served cold food.",
    "The oven is not heating the food.",
    "The engineer will repair the home heating system.",
    "This food delivery arrived late.",
    "The main benefit is cheaper heating controls.",
    "The router may heat up during use.",
    "Customer support can help with your boiler warranty.",
  ])("does not infer hardship from isolated benign words: %s", (text) => {
    expect(hasEssentialHardshipContext(text)).toBe(false);
    expect(classifyDecisionDocument(text)).not.toBe("benefits_crisis_support");
    expect(classifyDecisionDocument(text)).not.toBe("bailiff_notice");
  });
});
