import { describe, expect, it } from "vitest";
import { buildCommunityHelperPack } from "../communityHelperPack";
import { buildResultViewModel, RESULT_FORBIDDEN_PHRASES } from "../resultViewModel";
import { collectTextFromCommunityHelperPack } from "../safetyWording";

const flattenResultText = (value: unknown): string => JSON.stringify(value).toLowerCase();

const expectNoForbiddenResultWording = (text: string) => {
  for (const phrase of RESULT_FORBIDDEN_PHRASES) {
    expect(text).not.toContain(phrase.toLowerCase());
  }
};

describe("community helper ResultViewModel integration", () => {
  it("maps missed letters and deadlines into safe preparation sections", () => {
    const pack = buildCommunityHelperPack({
      text: "My uncle keeps missing official letters and appointment deadlines because he gets overwhelmed and cannot keep track of post.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("community support preparation");
    expect(text).toContain("daily-life impact");
    expect(text).toContain("admin and routine barriers");
    expect(text).toContain("evidence/context to gather");
    expect(text).toContain("questions to ask");
    expect(text).toContain("adminavenger helps prepare. you stay in control.");
    expectNoForbiddenResultWording(text);
  });

  it("maps housing repair/access support safely without council obligation claims", () => {
    const pack = buildCommunityHelperPack({
      text: "My neighbour is overwhelmed by housing repair letters about damp, access appointments, and missed contractor visits.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("community support preparation");
    expect(text).toContain("key facts to check");
    expect(text).toContain("ask someone suitable");
    expect(text).not.toContain("council must provide");
    expect(text).not.toContain("they qualify");
    expectNoForbiddenResultWording(text);
  });

  it("maps OT/support visit preparation without recommending equipment or adaptations", () => {
    const pack = buildCommunityHelperPack({
      text: "We need to prepare notes for an OT visit because Mum struggles with letters, daily routine, stairs, bathing, and explaining what happens at home.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("community support preparation");
    expect(text).toContain("what adminavenger cannot know");
    expect(text).toContain("adminavenger cannot decide care needs");
    expect(text).not.toContain("needs this equipment");
    expect(text).not.toContain("needs this adaptation");
    expectNoForbiddenResultWording(text);
  });

  it("preserves urgent safeguarding-like signposting without deciding safeguarding", () => {
    const pack = buildCommunityHelperPack({
      text: "I am worried someone may be in immediate danger at home and there are concerns about abuse and neglect.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("if someone may be in immediate danger");
    expect(text).toContain("adminavenger cannot decide safeguarding concerns");
    expect(text).not.toContain("safeguarding issue confirmed");
    expect(text).not.toContain("this proves neglect");
    expect(text).not.toContain("risk score");
    expectNoForbiddenResultWording(text);
  });

  it("keeps financial admin concern wording factual and non-accusatory", () => {
    const pack = buildCommunityHelperPack({
      text: "My friend is vulnerable and confused about bank card use, bills, missing payments, and someone else controlling money.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("community support preparation");
    expect(text).toContain("key facts to check");
    expect(text).not.toContain("financial abuse proven");
    expect(text).not.toContain("money owed");
    expect(text).not.toContain("money saved");
    expect(text).not.toContain("money recovered");
    expectNoForbiddenResultWording(text);
  });

  it("preserves consent and control notes for helper scenarios", () => {
    const pack = buildCommunityHelperPack({
      text: "I am helping my brother organise letters and understand appointments because he gets overwhelmed.",
      role: "helping_someone",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("consent and control notes");
    expect(text).toContain("keep them involved");
    expect(text).toContain("this pack is not a record kept secretly");
    expect(text).not.toContain("lacks capacity");
    expect(text).not.toContain("act on their behalf");
    expectNoForbiddenResultWording(text);
  });

  it("keeps unknown community helper input conservative", () => {
    const pack = buildCommunityHelperPack({
      text: "Help me with all these confusing papers and appointments.",
    });

    const result = buildResultViewModel({ communityHelperPack: pack });
    const text = flattenResultText(result);

    expect(text).toContain("community support preparation");
    expect(text).toContain("this is preparation only");
    expect(text).toContain("adminavenger cannot decide care needs");
    expectNoForbiddenResultWording(text);
  });

  it("community helper pack collector includes result-safe pack text", () => {
    const pack = buildCommunityHelperPack({
      text: "A support worker is helping prepare meeting notes about missed letters and communication difficulties.",
      role: "supporting_people_at_work",
    });

    const text = collectTextFromCommunityHelperPack(pack).toLowerCase();

    expect(text).toContain("support");
    expect(text).toContain("which letters are still unopened or unread");
    expect(text).not.toContain("eligibility score");
  });
});
