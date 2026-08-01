import { describe, expect, it } from "vitest";
import { classifyFrontDoorIntent } from "../frontDoorIntent/classifyFrontDoorIntent";
import {
  FRONT_DOOR_INTENT_EXPECTED_SCENARIO_COUNT,
  frontDoorIntentCorpusV1,
} from "../frontDoorIntent/corpusV1";
import type { FrontDoorIntentScenario } from "../frontDoorIntent/types";

const scenario = (id: string): FrontDoorIntentScenario => {
  const found = frontDoorIntentCorpusV1.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing corpus scenario ${id}`);
  return found;
};

const classify = (id: string) => classifyFrontDoorIntent(scenario(id).text);

const labels = (id: string) =>
  classify(id).mentionedOtherPeople.map((person) => person.personLabel);

describe("front-door intent corpus integrity", () => {
  it("holds exactly the approved 90 scenarios with unique, stable ids", () => {
    expect(frontDoorIntentCorpusV1).toHaveLength(
      FRONT_DOOR_INTENT_EXPECTED_SCENARIO_COUNT,
    );
    const ids = frontDoorIntentCorpusV1.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps person labels verbatim rather than normalising them", () => {
    // The specification is explicit: "Dad" is never normalised to "father".
    expect(labels("J04")).toEqual(["MUM", "DAD"]);
    expect(labels("J01")).toEqual(["farther"]);
    expect(labels("B02")).toEqual(["Dad"]);
  });

  it("contains no scenario that asks for help for multiple people by inference", () => {
    for (const entry of frontDoorIntentCorpusV1) {
      expect(entry.expected.helpTarget, entry.id).not.toBe("multiple_other_people");
      expect(entry.expected.helpTarget, entry.id).not.toBe("self_and_other");
    }
  });
});

describe("front-door intent classifier , approved corpus", () => {
  it.each(frontDoorIntentCorpusV1.map((entry) => ({ entry })))(
    "classifies $entry.id exactly as approved",
    ({ entry }) => {
      const result = classifyFrontDoorIntent(entry.text);

      expect(result.inputShape, `${entry.id} shape`).toBe(entry.expected.inputShape);
      expect([...result.signals].sort(), `${entry.id} signals`).toEqual(
        [...entry.expected.signals].sort(),
      );
      expect(result.mentionedUser, `${entry.id} mentionedUser`).toBe(
        entry.expected.mentionedUser,
      );
      expect(
        result.mentionedOtherPeople.map((person) => person.personLabel),
        `${entry.id} people`,
      ).toEqual(entry.expected.mentionedOtherPeople.map((person) => person.personLabel));
      expect(result.helpTarget, `${entry.id} helpTarget`).toBe(entry.expected.helpTarget);
      expect(result.urgency, `${entry.id} urgency`).toBe(entry.expected.urgency);
    },
  );
});

describe("front-door intent classifier , approved prohibitions", () => {
  it("never confirms a target, opens a specialist route, or creates a case", () => {
    for (const entry of frontDoorIntentCorpusV1) {
      const result = classifyFrontDoorIntent(entry.text);
      expect(result.targetConfirmed, entry.id).toBe(false);
      expect(result.specialistRouteOpened, entry.id).toBe(false);
      expect(result.caseCreated, entry.id).toBe(false);
    }
  });

  it("selects document analysis only for document-shaped input", () => {
    for (const entry of frontDoorIntentCorpusV1) {
      const result = classifyFrontDoorIntent(entry.text);
      expect(result.documentAnalysisSelected, entry.id).toBe(
        entry.expected.inputShape === "document_or_message",
      );
    }
  });

  it("never infers multiple_other_people or self_and_other", () => {
    for (const entry of frontDoorIntentCorpusV1) {
      const result = classifyFrontDoorIntent(entry.text);
      expect(result.helpTarget, entry.id).not.toBe("multiple_other_people");
      expect(result.helpTarget, entry.id).not.toBe("self_and_other");
    }
  });

  it("is deterministic and does not mutate its input", () => {
    for (const entry of frontDoorIntentCorpusV1.slice(0, 20)) {
      const original = entry.text;
      const first = classifyFrontDoorIntent(entry.text);
      const second = classifyFrontDoorIntent(entry.text);
      expect(JSON.stringify(first), entry.id).toBe(JSON.stringify(second));
      expect(entry.text, entry.id).toBe(original);
    }
  });

  it("grounds every piece of evidence in a verbatim substring of the source", () => {
    for (const entry of frontDoorIntentCorpusV1) {
      const result = classifyFrontDoorIntent(entry.text);
      for (const item of result.evidence) {
        expect(entry.text.toLowerCase(), `${entry.id} evidence`).toContain(
          item.sourceQuote.toLowerCase(),
        );
      }
    }
  });

  it("handles empty and whitespace-only input as a document by default", () => {
    for (const text of ["", "   ", "\n\n"]) {
      const result = classifyFrontDoorIntent(text);
      expect(result.inputShape).toBe("document_or_message");
      expect(result.helpTarget).toBe("unknown");
      expect(result.urgency).toBe("none_detected");
    }
  });
});

describe("front-door intent classifier , mandatory scenarios", () => {
  it("1. `my father needs care` is the canonical regression", () => {
    const result = classify("A01");
    // Naming a relative does not put the user in the situation.
    expect(result.mentionedUser).toBe(false);
    expect(result.inputShape).toBe("ongoing_situation");
    expect(result.signals).toContain("possible_person_needing_support");
    expect(result.signals).toContain("possible_functional_need");
    expect(result.signals).toContain("person_target_unclear");
    expect(labels("A01")).toEqual(["father"]);
    expect(result.mentionedOtherPeople[0]?.relationship).toBe("father");
    expect(result.helpTarget).toBe("unknown");
    expect(result.targetConfirmed).toBe(false);
    expect(result.urgency).toBe("none_detected");
    expect(result.documentAnalysisSelected).toBe(false);
    expect(result.specialistRouteOpened).toBe(false);
    expect(result.caseCreated).toBe(false);
  });

  it("2. `my sister needs help` names the sister and asks for nobody", () => {
    expect(classify("A02").inputShape).toBe("ongoing_situation");
    expect(labels("A02")).toEqual(["sister"]);
    expect(classify("A02").helpTarget).toBe("unknown");
  });

  it("3. `I look after my neighbour` records a caring role but no help target", () => {
    const result = classify("B01");
    expect(result.signals).toContain("possible_caring_role");
    expect(result.signals).toContain("possible_supporter");
    expect(result.helpTarget).toBe("unknown");
  });

  it("4. `my husband cannot wash himself` is a functional need", () => {
    const result = classify("C01");
    expect(result.signals).toContain("possible_functional_need");
    expect(labels("C01")).toEqual(["husband"]);
    expect(result.urgency).toBe("none_detected");
  });

  it("5. `Mum keeps falling` is unclear urgency, never immediate danger", () => {
    const result = classify("C02");
    expect(result.urgency).toBe("unclear_urgency");
    expect(result.urgency).not.toBe("possible_immediate_danger");
  });

  it("6. `Dad is coming home from hospital tomorrow` is a discharge signal", () => {
    const result = classify("H01");
    expect(result.signals).toContain("possible_hospital_discharge");
    expect(result.urgency).toBe("unclear_urgency");
    expect(result.helpTarget).toBe("unknown");
  });

  it("7. `I cannot cope with caring for my wife` records both people, asks for neither", () => {
    const result = classify("B07");
    expect(result.mentionedUser).toBe(true);
    expect(labels("B07")).toEqual(["wife"]);
    expect(result.helpTarget).toBe("unknown");
    expect(result.urgency).toBe("unclear_urgency");
  });

  it("8. `Can Dad claim Attendance Allowance?` is about Dad and opens no carer route", () => {
    const result = classify("D01");
    expect(result.inputShape).toBe("direct_question");
    expect(result.helpTarget).toBe("one_other_person");
    expect(labels("D01")).toEqual(["Dad"]);
    expect(result.signals).not.toContain("possible_caring_role");
    expect(result.specialistRouteOpened).toBe(false);
  });

  it("9. `My dad gets Attendance Allowance` states a fact and asks nothing", () => {
    const result = classify("D02");
    expect(result.helpTarget).toBe("unknown");
    expect(result.signals).toContain("person_target_unclear");
  });

  it("10. `Mum gets PIP and I help with shopping` requires clarification", () => {
    const result = classify("D03");
    // "I help" places the user in the situation as a supporter.
    expect(result.mentionedUser).toBe(true);
    expect(labels("D03")).toEqual(["Mum"]);
    expect(result.helpTarget).toBe("unknown");
    expect(result.signals).toContain("person_target_unclear");
    expect(result.helpTarget).not.toBe("self");
    expect(result.helpTarget).not.toBe("one_other_person");
    expect(result.helpTarget).not.toBe("self_and_other");
  });

  it("11. `Dad died yesterday and I was his carer` is bereavement first", () => {
    const result = classify("E02");
    expect(result.signals).toContain("possible_bereavement");
    expect(result.helpTarget).toBe("unknown");
    expect(result.inputShape).toBe("ongoing_situation");
  });

  it("12. `my mum died last week` is bereavement, not a document", () => {
    const result = classify("E01");
    expect(result.inputShape).toBe("ongoing_situation");
    expect(result.signals).toContain("possible_bereavement");
    expect(result.documentAnalysisSelected).toBe(false);
  });

  it("13. `help with mum` is ambiguous", () => {
    const result = classify("I01");
    expect(result.inputShape).toBe("ambiguous_request");
    expect(result.urgency).toBe("unclear_urgency");
  });

  it("14. `care` is ambiguous and names nobody", () => {
    const result = classify("I02");
    expect(result.inputShape).toBe("ambiguous_request");
    expect(result.mentionedOtherPeople).toEqual([]);
  });

  it("15. `I don't know what to do` is ambiguous", () => {
    expect(classify("I03").inputShape).toBe("ambiguous_request");
  });

  it("16. `my brother needs help with a form` is a situation, not a document", () => {
    const result = classify("A04");
    expect(result.inputShape).toBe("ongoing_situation");
    expect(labels("A04")).toEqual(["brother"]);
  });

  it("17. `Your father's account has been closed` stays a document", () => {
    const result = classify("L01");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.documentAnalysisSelected).toBe(true);
    expect(result.signals).toEqual([]);
  });

  it("18. `Please send your mother's death certificate` stays a document", () => {
    const result = classify("L02");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.signals).not.toContain("possible_bereavement");
  });

  it("19. `Your PIP appointment is on 14 August 2026` stays a document", () => {
    const result = classify("L03");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.signals).not.toContain("possible_money_or_benefits_need");
  });

  it("20. `We will never ask you to share your verification code` stays a document", () => {
    const result = classify("M01");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.documentAnalysisSelected).toBe(true);
  });

  it("21. the M04 care-home invoice stays a security-shaped document", () => {
    const result = classify("M04");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.documentAnalysisSelected).toBe(true);
    expect(result.signals).not.toContain("possible_caring_role");
    expect(result.signals).not.toContain("possible_person_needing_support");
    expect(result.urgency).toBe("none_detected");
    expect(result.specialistRouteOpened).toBe(false);
  });

  it("22. the OCR-shaped care-needs-assessment stays a document", () => {
    const result = classify("J06");
    expect(result.inputShape).toBe("document_or_message");
    expect(result.documentAnalysisSelected).toBe(true);
    expect(result.signals).toEqual([]);
  });
});

describe("front-door intent classifier , critical negative rules", () => {
  it("does not treat every relationship word as care", () => {
    for (const id of ["L01", "L02", "M04"]) {
      expect(classify(id).signals, id).not.toContain("possible_caring_role");
    }
  });

  it("does not treat every benefit term as a caring role", () => {
    expect(classify("L03").signals).not.toContain("possible_caring_role");
    expect(classify("D01").signals).not.toContain("possible_caring_role");
  });

  it("does not treat a death-related document as a bereavement conversation", () => {
    expect(classify("L02").inputShape).toBe("document_or_message");
    expect(classify("L08").inputShape).toBe("document_or_message");
    expect(classify("L08").signals).not.toContain("possible_bereavement");
  });

  it("does not treat every use of `urgent` as urgent danger", () => {
    for (const id of ["G01", "G02", "G03", "G06"]) {
      expect(classify(id).urgency, id).toBe("none_detected");
    }
  });

  it("does not over-escalate resolved or mild wording", () => {
    expect(classify("G04").urgency).toBe("none_detected");
    expect(classify("G05").urgency).toBe("none_detected");
  });

  it("does not convert OCR or file-shaped text into a situation", () => {
    expect(classify("J06").inputShape).toBe("document_or_message");
  });

  it("treats a possessive relationship phrase as naming a person, not the user", () => {
    // Canonical rule: `mentionedUser` is true only when the user is explicitly
    // part of the situation as actor, recipient, supporter or affected person.
    for (const id of ["A01", "A02", "C07", "D02", "D06", "J01"]) {
      expect(classify(id).mentionedUser, id).toBe(false);
      expect(classify(id).mentionedOtherPeople.length, id).toBeGreaterThan(0);
    }
    for (const id of ["B02", "B07", "D03", "D04", "C06", "K01", "K02"]) {
      expect(classify(id).mentionedUser, id).toBe(true);
    }
  });

  it("does not let a mail-client signature make the user a participant", () => {
    // "Sent from my iPhone" is appended by software. It does not place the
    // person in their own situation as an actor, recipient, supporter or
    // affected person.
    for (const text of [
      "my mum needs help. Sent from my iPhone",
      "my mum needs help\nSent from my Android",
      "my mum needs help\nGet Outlook for iOS",
      "my mum needs help. sent from my phone",
      "my mum needs help. Sent from my mobile",
      "my mum needs help. Sent from my Samsung",
      "my mum needs help\nGet Outlook for Android",
    ]) {
      expect(classifyFrontDoorIntent(text).mentionedUser, text).toBe(false);
    }
  });

  it("still records the user when they speak alongside a signature", () => {
    for (const text of [
      "I need help with my mum. Sent from my iPhone",
      "I care for Mum. Sent from my phone.",
    ]) {
      expect(classifyFrontDoorIntent(text).mentionedUser, text).toBe(true);
    }
  });

  it("does not strip a real sentence merely because it contains a device name", () => {
    // Anchored to the whole signature phrase, never to "my" alone.
    const result = classifyFrontDoorIntent("my iPhone helps me track Mum's medication");
    expect(result.mentionedUser).toBe(true);
  });

  it("keeps J07 a situation, with the signature ignored for participation only", () => {
    const result = classify("J07");
    expect(result.inputShape).toBe("ongoing_situation");
    expect(result.mentionedUser).toBe(false);
    expect(labels("J07")).toEqual(["mum"]);
    expect(result.helpTarget).toBe("unknown");
    expect(result.targetConfirmed).toBe(false);
    expect(result.signals).toContain("possible_person_needing_support");
  });

  it("leaves document detection, shape and urgency untouched by signature removal", () => {
    // The signature copy is used only for the participation question, so
    // everything else must be identical with and without the signature.
    const plain = classifyFrontDoorIntent("my mum needs help.");
    const signed = classifyFrontDoorIntent("my mum needs help. Sent from my iPhone");
    expect(signed.inputShape).toBe(plain.inputShape);
    expect([...signed.signals].sort()).toEqual([...plain.signals].sort());
    expect(signed.urgency).toBe(plain.urgency);
    expect(signed.helpTarget).toBe(plain.helpTarget);
    expect(signed.documentAnalysisSelected).toBe(plain.documentAnalysisSelected);
  });

  it("records a source-grounded help target without confirming it", () => {
    for (const id of ["K01", "K02"]) {
      const result = classify(id);
      expect(result.helpTarget, id).toBe("one_other_person");
      expect(result.targetConfirmed, id).toBe(false);
      expect(result.signals, id).not.toContain("person_target_unclear");
    }
  });

  it("does not infer a caring role merely because the user helps someone", () => {
    expect(classify("D03").helpTarget).toBe("unknown");
    expect(classify("B06").helpTarget).toBe("unknown");
  });

  it("keeps a document that also contains a situational sentence as a document", () => {
    expect(classify("K06").inputShape).toBe("document_or_message");
    expect(classify("K06").documentAnalysisSelected).toBe(true);
  });

  it("never records an urgency signal for any document control", () => {
    for (const id of ["L01", "L02", "L03", "L04", "L05", "L06", "L07", "L08", "M02", "M03", "M04"]) {
      expect(classify(id).urgency, id).toBe("none_detected");
    }
  });
});

describe("front-door intent classifier , urgency is a signal, never a service", () => {
  it("records danger, health and practical signals separately", () => {
    expect(classify("F01").urgency).toBe("possible_immediate_danger");
    expect(classify("F02").urgency).toBe("possible_urgent_health_need");
    expect(classify("F04").urgency).toBe("possible_urgent_practical_support");
  });

  it("exposes no service, route or advice anywhere it speaks in its own voice", () => {
    // `evidence.sourceQuote` is excluded deliberately: it is a verbatim
    // substring of what the person typed, and the specification requires it to
    // stay verbatim. D07 quotes the user's own words "council tax". Quoting a
    // person is not selecting a service; everything the classifier says in its
    // own voice is checked below.
    const ownVoice = frontDoorIntentCorpusV1
      .map((entry) => {
        const { evidence, ...rest } = classifyFrontDoorIntent(entry.text);
        return JSON.stringify({
          ...rest,
          evidence: evidence.map((item) => item.signal),
        });
      })
      .join("\n")
      .toLowerCase();

    for (const forbidden of [
      "999",
      "111",
      "nhs",
      "ambulance",
      "emergency",
      "council",
      "discharge team",
      "ward",
      "scam",
      "fraud",
      "you should",
      "call ",
      "advice",
      "contact",
    ]) {
      expect(ownVoice, forbidden).not.toContain(forbidden);
    }
  });
});
