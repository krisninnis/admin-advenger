import { describe, expect, it } from "vitest";
import {
  buildCommunityHelperPack,
  detectCommunityHelperSituationType,
  flattenCommunityHelperPackText,
  type CommunityHelperSituationType,
} from "../communityHelperPack";
import { findForbiddenSafetyPhrases } from "../safetyWording";

const examples: Array<{
  name: string;
  expectedType: CommunityHelperSituationType;
  text: string;
}> = [
  {
    name: "missed letters or deadlines",
    expectedType: "missed_letters_or_deadlines",
    text: "Example note. I think we missed a letter and I forgot to reply in time, so the deadline may have passed.",
  },
  {
    name: "difficulty understanding official letters",
    expectedType: "difficulty_understanding_letters",
    text: "Example note. I don't understand this letter, it is full of jargon and I can't work out what it says.",
  },
  {
    name: "housing repair or access difficulty",
    expectedType: "housing_repair_or_access_difficulty",
    text: "Example note. The landlord hasn't fixed the broken heating and there is damp in the hallway, and the stairs are hard to use.",
  },
  {
    name: "OT or support worker visit preparation",
    expectedType: "ot_or_support_visit_preparation",
    text: "Example note. We are getting ready for an OT visit next week and want to prepare properly.",
  },
  {
    name: "carer organising letters",
    expectedType: "carer_organising_letters",
    text: "Example note. I'm a carer for my dad and I'm helping my dad organise his letters, there are a lot of them.",
  },
  {
    name: "support worker meeting notes",
    expectedType: "support_worker_meeting_notes",
    text: "Example note. I am preparing notes for a meeting with his support worker next Tuesday, a review meeting.",
  },
  {
    name: "daily routine admin overwhelm",
    expectedType: "daily_routine_admin_overwhelm",
    text: "Example note. Everything is piling up and I can't keep up with all the admin, it feels overwhelming.",
  },
  {
    name: "communication difficulty",
    expectedType: "communication_difficulty",
    text: "Example note. She has a hearing difficulty and finds it hard to use the phone, so calls are difficult.",
  },
  {
    name: "vulnerability / financial admin concern",
    expectedType: "vulnerability_financial_admin_concern",
    text: "Example note. Someone is controlling his money and he can't access his own bank account, we are worried.",
  },
  {
    name: "urgent safeguarding-like signpost",
    expectedType: "urgent_safeguarding_like_signpost",
    text: "Example note. I think she may be in immediate danger and is being abused at home, I'm scared for her.",
  },
];

const expectSafePack = (text: string, role?: "for_myself" | "helping_someone" | "supporting_people_at_work") => {
  const pack = buildCommunityHelperPack({ text, role });
  const flattened = flattenCommunityHelperPackText(pack);

  expect(findForbiddenSafetyPhrases(flattened)).toEqual([]);
  expect(pack.cannotKnow.length).toBeGreaterThan(0);
  expect(pack.preparationOnlyNotes.length).toBeGreaterThan(0);
  expect(pack.signposting.length).toBeGreaterThan(0);

  return pack;
};

describe("Community Helper Pack Core v1 - situation type detection", () => {
  it.each(examples)("detects $expectedType from a $name example", ({ expectedType, text }) => {
    expect(detectCommunityHelperSituationType(text)).toBe(expectedType);
    expectSafePack(text);
  });

  it("falls back to the conservative unknown type for vague input", () => {
    const pack = expectSafePack("Example note. Please help me with everything, I don't know where to start.");

    expect(pack.situationType).toBe("community_helper_unknown");
    expect(pack.questionsToAsk.some((question) => question.toLowerCase().includes("what has actually happened"))).toBe(
      true,
    );
  });

  it("prioritises the urgent safeguarding-like signpost over an overlapping financial concern", () => {
    const pack = expectSafePack(
      "Example note. Someone is taking his money and I think he may be in immediate danger, I'm really scared.",
    );

    expect(pack.situationType).toBe("urgent_safeguarding_like_signpost");
  });
});

describe("Community Helper Pack Core v1 - urgent safeguarding-like handling", () => {
  it("includes the exact required emergency signposting sentence", () => {
    const pack = expectSafePack("Example note. She may be in immediate danger and is being neglected, please help.");

    const requiredSentence =
      "If someone may be in immediate danger, contact emergency services or the relevant local safeguarding service. AdminAvenger cannot decide safeguarding concerns.";

    expect(pack.riskWarnings).toContain(requiredSentence);
    expect(pack.safeNextSteps.some((step) => step.toLowerCase().includes("emergency services"))).toBe(true);
  });

  it("never claims to decide or confirm a safeguarding issue", () => {
    const pack = expectSafePack("Example note. He is being exploited and coerced by someone he lives with.");
    const flattened = flattenCommunityHelperPackText(pack).toLowerCase();

    expect(flattened).not.toContain("safeguarding issue confirmed");
    expect(flattened).not.toContain("this proves neglect");
    expect(flattened).not.toContain("this is a safeguarding issue");
  });
});

describe("Community Helper Pack Core v1 - financial admin concern handling", () => {
  it("never claims financial abuse is proven, or that money is owed/recovered/saved", () => {
    const pack = expectSafePack(
      "Example note. I think someone has taken her bank card and is controlling her money, I'm not sure what has happened.",
    );
    const flattened = flattenCommunityHelperPackText(pack).toLowerCase();

    expect(pack.situationType).toBe("vulnerability_financial_admin_concern");
    expect(flattened).not.toContain("financial abuse proven");
    expect(flattened).not.toContain("money owed");
    expect(flattened).not.toContain("money recovered");
    expect(flattened).not.toContain("money saved");
  });

  it("lists cannotKnow items that avoid asserting wrongdoing occurred", () => {
    const pack = expectSafePack("Example note. Someone is pressuring her to hand over money and it worries me.");

    expect(pack.cannotKnow.some((item) => item.toLowerCase().includes("whether financial abuse or wrongdoing"))).toBe(
      true,
    );
  });
});

describe("Community Helper Pack Core v1 - consent and helper-control safety", () => {
  it("adds full consent/control notes when the role is helping_someone, distinct from the for_myself notes", () => {
    const helpingPack = expectSafePack("Example note. Trying to sort out some paperwork.", "helping_someone");
    const forMyselfPack = expectSafePack("Example note. Trying to sort out some paperwork.", "for_myself");

    expect(helpingPack.consentAndControlNotes.some((note) => note.toLowerCase().includes("happy for this pack"))).toBe(
      true,
    );
    expect(helpingPack.consentAndControlNotes.some((note) => note.toLowerCase().includes("keep them involved"))).toBe(
      true,
    );
    expect(forMyselfPack.consentAndControlNotes.some((note) => note.toLowerCase().includes("keep them involved"))).toBe(
      false,
    );
  });

  it("auto-detects helping-someone-else language even without an explicit role", () => {
    const pack = expectSafePack("Example note. I'm a carer for my mum and I'm helping her sort her letters.");

    expect(pack.consentAndControlNotes.some((note) => note.toLowerCase().includes("happy for this pack"))).toBe(true);
  });

  it("gives professional-boundary consent notes for supporting_people_at_work", () => {
    const pack = expectSafePack("Example note. Reviewing a client's file.", "supporting_people_at_work");

    expect(pack.consentAndControlNotes.some((note) => note.toLowerCase().includes("organisation's own rules"))).toBe(
      true,
    );
  });

  it("still gives a light control note for a for_myself / default role", () => {
    const pack = expectSafePack("Example note. Just organising my own letters.", "for_myself");

    expect(pack.consentAndControlNotes.some((note) => note.toLowerCase().includes("you control what you save"))).toBe(
      true,
    );
  });

  it("never uses banned helper-control phrases in any consent note", () => {
    const bannedPhrases = ["act on their behalf", "they lack capacity", "they cannot decide", "you can take control"];

    for (const example of examples) {
      for (const role of ["for_myself", "helping_someone", "supporting_people_at_work"] as const) {
        const pack = buildCommunityHelperPack({ text: example.text, role });
        const notesText = pack.consentAndControlNotes.join(" ").toLowerCase();

        for (const banned of bannedPhrases) {
          expect(notesText).not.toContain(banned);
        }
      }
    }
  });
});

describe("Community Helper Pack Core v1 - draft/checklist boundaries", () => {
  it("only exposes checklist/next-step style string-array fields, never a sendable draft/email field", () => {
    const pack = buildCommunityHelperPack({ text: "Example note. Some general admin difficulty." });
    const keys = Object.keys(pack);

    expect(keys).not.toContain("draftMessage");
    expect(keys).not.toContain("autoSend");
    expect(keys).not.toContain("sendTo");
    expect(keys).not.toContain("emailBody");
  });

  it("always includes the standing 'AdminAvenger helps prepare. You stay in control.' principle", () => {
    const pack = buildCommunityHelperPack({ text: "Example note. Some general admin difficulty." });

    expect(pack.preparationOnlyNotes).toContain("AdminAvenger helps prepare. You stay in control.");
  });
});

describe("Community Helper Pack Core v1 - evidence extraction and determinism", () => {
  it("surfaces dates and reference numbers found in the input as facts to check", () => {
    const pack = expectSafePack(
      "Example note. The letter is dated 12 September 2026 and has reference number REF-EXAMPLE-CH-009 on it, but we missed a deadline.",
    );

    expect(pack.keyFactsToCheck.some((fact) => fact.includes("12 September") || fact.includes("Date mentioned"))).toBe(
      true,
    );
    expect(pack.keyFactsToCheck.some((fact) => fact.toLowerCase().includes("reference"))).toBe(true);
  });

  it("is deterministic - the same input always produces the same situation type and title", () => {
    const text = "Example note. The landlord hasn't fixed the broken heating, it has been weeks.";
    const first = buildCommunityHelperPack({ text });
    const second = buildCommunityHelperPack({ text });

    expect(second.situationType).toBe(first.situationType);
    expect(second.title).toBe(first.title);
  });
});
