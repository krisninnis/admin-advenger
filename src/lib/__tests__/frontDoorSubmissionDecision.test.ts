import { describe, expect, it } from "vitest";
import { frontDoorIntentCorpusV1 } from "../frontDoorIntent/corpusV1";
import { isSecurityShapedInput } from "../frontDoorIntent/securityShapedInput";
import {
  decideFrontDoorSubmission,
  ordinaryDocumentSubmission,
} from "../frontDoorIntent/submissionDecision";
import type { FrontDoorSubmissionSource } from "../frontDoorIntent/submissionSource";
import { assessEmailSafety, shouldPrioritiseEmailSafety } from "../suspiciousEmail";

// Front-Door Intent Routing v1, UI wiring slice.
//
// The submission decision is the single place that says what happens to
// accepted input. These tests assert the order it applies, because the order is
// the safety property: security first, then urgency, then one question, then
// the existing document journey.

const source = (
  acceptedText: string,
  sourceTitle = "Pasted admin text",
  sourceType: FrontDoorSubmissionSource["sourceType"] = "email",
): FrontDoorSubmissionSource => ({ acceptedText, sourceTitle, sourceType });

// Deliberately chosen: this wording asks for a one-time code, and it carries
// none of the document markers ("your", "account", "link", a reference code, a
// currency symbol) that the known scam controls happen to contain. Without an
// explicit security boundary it would be read as an ordinary care sentence and
// the person would be asked who needs help instead of being warned.
const SECURITY_SHAPED_CARE_WORDING =
  "My father needs care. Tell us the one-time code so we can help him.";

const PLAIN_CARE_WORDING = "My father needs care.";

describe("the security boundary is explicit, not incidental", () => {
  it("recognises credential-request wording that carries no document markers", () => {
    expect(isSecurityShapedInput(SECURITY_SHAPED_CARE_WORDING)).toBe(true);
  });

  it("leaves ordinary care, bereavement and benefits wording alone", () => {
    for (const text of [
      PLAIN_CARE_WORDING,
      "Help with my brother.",
      "Can my father claim Attendance Allowance?",
      "My husband died last week and I do not know what to do.",
      "My mum has fallen and cannot get up.",
    ]) {
      expect(isSecurityShapedInput(text), text).toBe(false);
    }
  });

  it("treats empty input as nothing to warn about", () => {
    expect(isSecurityShapedInput("")).toBe(false);
    expect(isSecurityShapedInput("   ")).toBe(false);
  });

  it("does not change the existing safety assessment it reads", () => {
    // isSecurityShapedInput is a new caller of the existing policy, not a new
    // policy. If these two ever disagree, the boundary has drifted.
    expect(isSecurityShapedInput(SECURITY_SHAPED_CARE_WORDING)).toBe(
      shouldPrioritiseEmailSafety(SECURITY_SHAPED_CARE_WORDING),
    );
    expect(assessEmailSafety(SECURITY_SHAPED_CARE_WORDING, "email").isEmailLike).toBe(
      true,
    );
  });
});

describe("security-shaped input cannot be diverted", () => {
  it("sends it to the existing analysis journey, where the security preflight runs", () => {
    const decision = decideFrontDoorSubmission(source(SECURITY_SHAPED_CARE_WORDING));
    expect(decision.kind).toBe("document_analysis");
  });

  it("never becomes a care, benefits, bereavement or general question", () => {
    const decision = decideFrontDoorSubmission(source(SECURITY_SHAPED_CARE_WORDING));

    if (decision.kind === "front_door_route") {
      throw new Error(
        `security-shaped input was diverted to a ${decision.view.kind} screen`,
      );
    }
  });

  it("holds even though the same wording without the request asks a question", () => {
    // The control: strip the credential request and the very same sentence is
    // a care question again. That is what proves the boundary did the work.
    const control = decideFrontDoorSubmission(source(PLAIN_CARE_WORDING));
    expect(control.kind).toBe("front_door_route");
  });
});

describe("the existing document and security controls are unchanged", () => {
  it.each([
    { id: "L01", text: "Your father's account has been closed" },
    {
      id: "L02",
      text: "We have received your application and will write to you within 10 working days.",
    },
    {
      id: "S01",
      text: "Send us the six-digit verification code you just received so we can secure your account.",
    },
  ])("sends $id straight to analysis", ({ text }) => {
    expect(decideFrontDoorSubmission(source(text)).kind).toBe("document_analysis");
  });

  it("treats empty input as nothing to route", () => {
    expect(decideFrontDoorSubmission(source("   ")).kind).toBe("document_analysis");
  });
});

describe("the security boundary does not swallow the approved corpus", () => {
  // Adding a step before classification is only safe if it changes nothing it
  // was not meant to change. Every approved record keeps the route its expected
  // shape implies.
  const documentRecords = frontDoorIntentCorpusV1.filter(
    (record) => record.expected.inputShape === "document_or_message",
  );
  const situationRecords = frontDoorIntentCorpusV1.filter(
    (record) => record.expected.inputShape !== "document_or_message",
  );

  it("has records of both kinds to check", () => {
    expect(documentRecords.length).toBeGreaterThan(0);
    expect(situationRecords.length).toBeGreaterThan(0);
  });

  it.each(situationRecords.map((record) => ({ id: record.id, text: record.text })))(
    "still holds $id back for the front door",
    ({ text }) => {
      expect(decideFrontDoorSubmission(source(text)).kind).toBe("front_door_route");
    },
  );

  it.each(documentRecords.map((record) => ({ id: record.id, text: record.text })))(
    "still sends $id straight to analysis",
    ({ text }) => {
      expect(decideFrontDoorSubmission(source(text)).kind).toBe("document_analysis");
    },
  );
});

describe("reviewed photo text is decided like any other submission", () => {
  const reviewed = source(
    PLAIN_CARE_WORDING,
    "Photo text (reviewed before checking)",
    "email",
  );

  it("does not bypass routing merely because it came from a photo", () => {
    const decision = decideFrontDoorSubmission(reviewed);
    expect(decision.kind).toBe("front_door_route");
  });

  it("keeps the photo source title and type on the decision", () => {
    const decision = decideFrontDoorSubmission(reviewed);
    expect(decision.source.sourceTitle).toBe("Photo text (reviewed before checking)");
    expect(decision.source.sourceType).toBe("email");
    expect(decision.source.acceptedText).toBe(PLAIN_CARE_WORDING);
  });

  it("still sends reviewed photo text that is a document straight to analysis", () => {
    const decision = decideFrontDoorSubmission(
      source(
        "Your father's account has been closed",
        "Photo text (reviewed before checking)",
      ),
    );
    expect(decision.kind).toBe("document_analysis");
  });
});

describe("the ordinary message override", () => {
  const attachmentSource = source(
    PLAIN_CARE_WORDING,
    "Pasted text with documents: council-letter.txt",
    "bill",
  );

  it("skips the question without changing what is submitted", () => {
    const decision = ordinaryDocumentSubmission(attachmentSource);
    expect(decision.kind).toBe("document_analysis");
    expect(decision.source).toEqual(attachmentSource);
  });

  it("does not relabel the submission as pasted admin text", () => {
    const decision = ordinaryDocumentSubmission(attachmentSource);
    expect(decision.source.sourceTitle).not.toBe("Pasted admin text");
  });
});

describe("no decision creates anything", () => {
  const inputs = [
    PLAIN_CARE_WORDING,
    "Help with my brother.",
    "Can my father claim Attendance Allowance?",
    "My mum has fallen and cannot get up.",
    "My husband died last week and I do not know what to do.",
    SECURITY_SHAPED_CARE_WORDING,
    "Your father's account has been closed",
  ];

  it.each(inputs.map((text) => ({ text })))(
    "opens no case, record or specialist route for %j",
    ({ text }) => {
      const decision = decideFrontDoorSubmission(source(text));

      if (decision.kind !== "front_door_route") {
        return;
      }

      expect(decision.view.caseCreated).toBe(false);
      expect(decision.view.specialistRouteOpened).toBe(false);
      expect(decision.view.targetConfirmed).toBe(false);
      expect(decision.view.estateRouteOpened).toBe(false);
    },
  );
});
