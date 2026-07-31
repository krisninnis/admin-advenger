import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import {
  buildStructuredGeneralAdminFallback,
  detectInternalInconsistency,
  detectPossibleCollection,
  detectPromisedReview,
  detectUnresolvedContrast,
} from "../generalAdminExtraction";
import { deriveGuidedNextStep } from "../guidedNextSteps";
import { deriveImpactFromCase } from "../impactLedger";
import { analyseAdminItem } from "../mockAnalysis";
import { deriveOpportunityCard } from "../opportunityCards";
import { publicMessageCorpusV1 } from "../publicMessageEvaluation/corpusV1";
import {
  reconstructPublicMessageJourney,
  runPublicMessageScenario,
} from "../publicMessageEvaluation/runEvaluation";
import {
  detectSensitiveInformationRequest,
  SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL,
  SENSITIVE_INFORMATION_WARNING,
} from "../sensitiveInformationRequest";
import { shouldPrioritiseEmailSafety } from "../suspiciousEmail";

const GENERIC_FALLBACK_TITLE = "No obvious saving or action found";
const OLD_GENERIC_NEXT_STEP = "Identify the sender, date, reference, and deadline";
const ECHOED_REQUEST_PREFIX = "Follow the source request";

const scenario = (id: string) => {
  const found = publicMessageCorpusV1.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing corpus scenario ${id}`);
  return found;
};

/** Fresh analysis and the same records after a save/reload round trip. */
const journeys = (id: string) => {
  const fresh = runPublicMessageScenario(scenario(id));
  return [fresh, reconstructPublicMessageJourney(fresh, id)] as const;
};

/** Minimal public journey for messages that are not corpus records. */
const routeMessage = (rawText: string) => {
  const item: AdminItem = {
    id: "regression-item",
    title: "Pasted admin text",
    sourceType: "email",
    rawText,
    createdAt: "2026-07-31T09:00:00.000Z",
  };
  const findings = analyseAdminItem(item, { accessMode: "public" });
  const cases = findings.map((finding) => createAdminCase(finding, item));
  const adminCase = selectMostImportantCase(cases);
  if (!adminCase) throw new Error("No case was created");
  const finding = findings.find((candidate) => candidate.id === adminCase.findingId);

  return {
    item,
    findings,
    adminCase,
    finding,
    opportunity: deriveOpportunityCard(adminCase, item, finding),
  };
};

const expectNoMoneyCredit = (journey: ReturnType<typeof runPublicMessageScenario>) => {
  expect(
    journey.resultViewModel.moneyMentioned.every((line) => line.countedInMoneyTracker === false),
  ).toBe(true);
  expect(
    journey.impactEntries.every(
      (entry) => !["confirmed_saved", "confirmed_recovered"].includes(entry.type),
    ),
  ).toBe(true);
};

const expectNoSpecialistActivation = (
  journey: ReturnType<typeof runPublicMessageScenario>,
) => {
  expect(journey.adminCase.decisionResult).toBeUndefined();
  expect(journey.adminCase.careerSupportPack).toBeUndefined();
  expect(journey.visibleText).not.toMatch(/estate administration/i);
  expect(journey.visibleText).not.toMatch(/probate/i);
};

describe("C1 product defect 1 - a verification-code request is never turned into an action", () => {
  const requestQuote = "Send us the six-digit verification code";

  it("routes the request to the safety result and refuses it, fresh and reconstructed", () => {
    for (const journey of journeys("security_scams-10-verification_code")) {
      expect(journey.resultViewModel.title).toBe("Email needs safety check");
      expect(journey.adminCase.status).toBe("new");
      expect(journey.opportunity.opportunityType).toBe("suspicious_email_risk");
      expect(journey.adminCase.generalAdminFallback).toBeUndefined();

      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Do not share the requested code, password, PIN, or card or bank details",
      );
      expect(journey.resultViewModel.bestNextMove?.description).toBe(
        SENSITIVE_INFORMATION_WARNING,
      );
      expect(journey.guidedNextStep.primaryAction.kind).toBe("draft_message");

      expectNoMoneyCredit(journey);
      expectNoSpecialistActivation(journey);
    }
  });

  it("never presents the requested code instruction as the best next move", () => {
    for (const journey of journeys("security_scams-10-verification_code")) {
      const bestNextMove = [
        journey.resultViewModel.bestNextMove?.label,
        journey.resultViewModel.bestNextMove?.description,
        journey.resultViewModel.bestNextMove?.whyThisHelps,
      ].join("\n");

      expect(bestNextMove).not.toContain(requestQuote);
      expect(bestNextMove).not.toContain(ECHOED_REQUEST_PREFIX);
      expect(journey.opportunity.nextBestAction).not.toContain(requestQuote);
      expect(journey.opportunity.nextBestAction).not.toContain(ECHOED_REQUEST_PREFIX);
      expect(journey.visibleText).not.toContain(ECHOED_REQUEST_PREFIX);
      expect(journey.visibleText).not.toContain(OLD_GENERIC_NEXT_STEP);
      expect(journey.resultViewModel.title).not.toBe(GENERIC_FALLBACK_TITLE);
    }
  });

  it("keeps the request visible as an attributed source fact and keeps the sender unjudged", () => {
    for (const journey of journeys("security_scams-10-verification_code")) {
      expect(journey.visibleText).toContain(SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL);
      expect(journey.visibleText).toContain(requestQuote);
      expect(journey.visibleText).toContain("obtained independently");
      expect(journey.visibleText).toContain(
        "AdminAvenger cannot determine whether the message is fraudulent",
      );
      expect(journey.visibleText).not.toMatch(/this is a scam|the sender is fraudulent/i);
    }
  });

  it("recognises every governed credential wording and keeps protective wording safe", () => {
    for (const text of [
      "Send us the six-digit verification code you just received so we can secure your account.",
      "Please reply with your one-time passcode.",
      "Confirm your password to keep the account open.",
      "Enter your PIN number on the next screen.",
      "Provide the full card details and the card security code.",
      "We need your bank login details to release the payment.",
      "Send us the OTP we just sent.",
      "Share your online banking password with our agent.",
    ]) {
      expect(detectSensitiveInformationRequest(text).requested, text).toBe(true);
      expect(shouldPrioritiseEmailSafety(text), text).toBe(true);
    }
  });

  it("guards the structured fallback even if the security route is bypassed", () => {
    const fallback = buildStructuredGeneralAdminFallback(
      "Send us the six-digit verification code you just received so we can secure your account.",
    );

    expect(fallback?.sensitiveInformationRequested).toBe(true);
    expect(fallback?.requestedAction).toBeUndefined();
    expect(fallback?.requestedDocument).toBeUndefined();
    expect(fallback?.nextAction).toBe(SENSITIVE_INFORMATION_WARNING);
    expect(fallback?.nextAction).not.toContain(ECHOED_REQUEST_PREFIX);
    expect(fallback?.nextStepKind).toBe("verify_outcome");
  });
});

describe("C1 product defect 2 - a link plus an urgent suspension threat is a security caution", () => {
  it("makes the safety check the primary result instead of an information-only confirmation", () => {
    for (const journey of journeys("security_scams-07-suspension_threat")) {
      expect(journey.resultViewModel.title).toBe("Email needs safety check");
      expect(journey.resultViewModel.title).not.toBe("Information-only confirmation");
      expect(journey.opportunity.opportunityType).toBe("suspicious_email_risk");
      expect(journey.adminCase.generalAdminFallback).toBeUndefined();
      expect(journey.resultViewModel.bestNextMove?.label).toBe(
        "Avoid making the requested payment or using the message's link",
      );

      expectNoMoneyCredit(journey);
      expectNoSpecialistActivation(journey);
    }
  });

  it("keeps the stated threat and time limit as source-attributed facts without endorsing them", () => {
    for (const journey of journeys("security_scams-07-suspension_threat")) {
      expect(journey.visibleText).toContain("Consequence stated by message");
      expect(journey.visibleText).toContain(
        "Verify your account using this link within two hours or access will be suspended.",
      );
      expect(journey.visibleText).toContain("official website");
      expect(journey.visibleText).toContain("Not a scam determination");
      expect(journey.visibleText).not.toMatch(
        /your account will definitely|suspension is confirmed|this is a scam/i,
      );
      expect(journey.visibleText).not.toContain(OLD_GENERIC_NEXT_STEP);
    }
  });

  it("requires corroboration, so a single weak signal stays on its normal route", () => {
    expect(
      shouldPrioritiseEmailSafety("Open the link in this message to view your statement."),
    ).toBe(false);
    expect(shouldPrioritiseEmailSafety("Please reply as soon as possible.")).toBe(false);
    expect(
      shouldPrioritiseEmailSafety("Your service may be suspended on 22 August 2026 if the overdue bill remains unpaid."),
    ).toBe(false);
    expect(
      shouldPrioritiseEmailSafety(
        "Verify your account using this link within two hours or access will be suspended.",
      ),
    ).toBe(true);
  });
});

describe("C1 product defect 3 - an acknowledged payroll query stays open", () => {
  it("preserves the acknowledgement and the pending review instead of finding nothing", () => {
    for (const journey of journeys("employment_income-04-holiday_pay_question")) {
      const fallback = journey.adminCase.generalAdminFallback;

      expect(journey.resultViewModel.title).not.toBe(GENERIC_FALLBACK_TITLE);
      expect(journey.visibleText).not.toContain(GENERIC_FALLBACK_TITLE);
      expect(journey.visibleText).not.toContain(OLD_GENERIC_NEXT_STEP);

      expect(fallback?.topic).toBe("decision_or_review");
      expect(journey.adminCase.status).toBe("waiting");
      expect(fallback?.dependency).toMatch(/acknowledges your question about holiday pay/i);
      expect(fallback?.dependency).toMatch(/will review the calculation/i);
      expect(journey.visibleText).toContain(
        "Payroll acknowledges your question about holiday pay and will review the calculation.",
      );

      expect(journey.resultViewModel.bestNextMove?.description).toMatch(
        /keep this acknowledgement and wait for the stated outcome/i,
      );
      expect(journey.resultViewModel.bestNextMove?.description).toMatch(
        /chase through a verified channel if the promised response does not arrive/i,
      );
      expect(fallback?.evidenceToGather).toEqual([
        "your holiday record or entitlement statement",
        "the calculation the message refers to",
      ]);
      expect(journey.guidedNextStep.primaryAction.kind).toBe("evidence_checklist");

      expectNoMoneyCredit(journey);
      expectNoSpecialistActivation(journey);
    }
  });

  it("makes no legal or entitlement finding about the holiday pay", () => {
    for (const journey of journeys("employment_income-04-holiday_pay_question")) {
      expect(journey.visibleText).not.toMatch(
        /you are (?:owed|entitled)|underpaid|the employer is wrong|unlawful|breach of contract/i,
      );
      expect(journey.visibleText).toMatch(/has not independently verified/i);
    }
  });

  it("treats a promised review as open only when the sender is answering the person", () => {
    expect(
      detectPromisedReview("Payroll acknowledges your question and will review the calculation."),
    ).toBeDefined();
    expect(
      buildStructuredGeneralAdminFallback(
        "This is an attendance warning. It says improvement will be reviewed on 30 September 2026.",
      )?.dependency,
    ).toBeUndefined();
  });
});

describe("C1 product defect 4 - a cancellation with a possible final collection stays unresolved", () => {
  it("keeps both the cancellation and the possible Direct Debit", () => {
    for (const journey of journeys("adversarial-contrast_however")) {
      const fallback = journey.adminCase.generalAdminFallback;

      expect(journey.resultViewModel.title).not.toBe(GENERIC_FALLBACK_TITLE);
      expect(journey.visibleText).not.toContain(GENERIC_FALLBACK_TITLE);
      expect(journey.visibleText).not.toContain(OLD_GENERIC_NEXT_STEP);

      expect(journey.adminCase.status).toBe("waiting");
      expect(journey.adminCase.status).not.toBe("resolved");
      expect(journey.adminCase.status).not.toBe("no_action_needed");
      expect(journey.opportunity.opportunityType).toBe("needs_human_check");

      expect(journey.visibleText).toContain("The service is cancelled.");
      expect(journey.visibleText).toContain("one final Direct Debit may still be collected");
      expect(fallback?.dependency).toMatch(/however, one final direct debit may still be collected/i);

      expect(journey.resultViewModel.bestNextMove?.description).toMatch(
        /watch the account for the collection the source says may still be taken/i,
      );

      expect(journey.resultViewModel.keyDates).toEqual([]);
      expect(journey.resultViewModel.moneyMentioned).toEqual([]);
      expectNoMoneyCredit(journey);
      expectNoSpecialistActivation(journey);
    }
  });

  it("shares contrast and possible-collection handling rather than matching one message", () => {
    expect(
      detectPossibleCollection("However, one final premium could still be taken next month."),
    ).toBeDefined();
    expect(
      detectUnresolvedContrast("The claim is closed. However, a further charge may follow."),
    ).toBeDefined();
    expect(
      buildStructuredGeneralAdminFallback(
        "Your account is closed, but one final payment may still be debited.",
      )?.status,
    ).toBe("waiting");
  });

  it("leaves a scheduled collection alone, because it is stated rather than uncertain", () => {
    const scheduled = buildStructuredGeneralAdminFallback(
      "One final Direct Debit of £29.50 will be collected on 3 September 2026.",
    );

    expect(detectPossibleCollection(
      "One final Direct Debit of £29.50 will be collected on 3 September 2026.",
    )).toBeUndefined();
    expect(scheduled?.status).toBe("new");
  });
});

describe("C1 product defect 5 - a self-contradicting message is named as contradictory", () => {
  it("reports the conflict, keeps both statements and stays unresolved", () => {
    for (const journey of journeys("adversarial-contradictory_wording")) {
      const fallback = journey.adminCase.generalAdminFallback;

      expect(fallback?.inconsistency).toBe(
        "The notice says the balance is cancelled; a later paragraph says it may still be payable.",
      );
      expect(fallback?.consequence).toBeUndefined();
      expect(journey.visibleText).toContain("Contradictory statements in the message");
      expect(journey.visibleText).toContain(
        "The message contains contradictory statements and the position is unresolved",
      );
      expect(journey.visibleText).not.toContain("Consequence stated by source");

      expect(journey.visibleText).toContain("the balance is cancelled");
      expect(journey.visibleText).toContain("it may still be payable");

      expect(journey.adminCase.status).toBe("ready_to_act");
      expect(journey.adminCase.status).not.toBe("resolved");
      expect(journey.adminCase.status).not.toBe("no_action_needed");

      expect(journey.resultViewModel.bestNextMove?.description).toMatch(
        /ask the provider to clarify in writing through a verified channel/i,
      );
      expect(journey.visibleText).toMatch(/cannot decide which statement is correct/i);
      expect(journey.visibleText).not.toMatch(
        /the balance is not owed|you do not have to pay|the cancellation is correct/i,
      );

      expectNoMoneyCredit(journey);
      expectNoSpecialistActivation(journey);
    }
  });

  it("uses a shared inconsistency signal, not one message's wording", () => {
    expect(
      detectInternalInconsistency("Our records conflict with the statement we sent you."),
    ).toBeDefined();
    expect(
      detectInternalInconsistency(
        "The charge has been waived. The account still shows the amount as outstanding.",
      ),
    ).toBeDefined();
    expect(
      detectInternalInconsistency("We have cancelled the former balance of £64.20. No payment is required."),
    ).toBeUndefined();
    expect(
      detectInternalInconsistency("This is your final bill for £43.17, due on 28 August 2026."),
    ).toBeUndefined();
  });
});

describe("security negative regressions - ordinary messages keep their normal route", () => {
  const ordinaryMessages: readonly { label: string; text: string }[] = [
    {
      label: "protective do-not-share notice",
      text: "Do not share your verification code with anyone. We will never ask for it by email.",
    },
    {
      label: "provider promise never to ask for a password",
      text: "A reminder about account security: we will never ask for your password, and we will never ask for your PIN.",
    },
    {
      label: "expected one-time passcode notification",
      text: "Your one-time passcode is 481920. Use it on our app to finish signing in. It expires in 10 minutes.",
    },
    {
      label: "ordinary invoice with a legitimate amount",
      text: "This is your invoice for £120.00, due on 20 August 2026. Reference INV-120.",
    },
    {
      label: "ordinary provider link without pressure",
      text: "Your monthly statement is ready. Visit our website when convenient to download a copy.",
    },
    {
      label: "expected attachment",
      text: "Please find the agreed contract attached, as we discussed on the call last week.",
    },
  ];

  it.each(ordinaryMessages)("keeps $label off the primary security route", ({ text }) => {
    expect(detectSensitiveInformationRequest(text).requested).toBe(false);
    expect(shouldPrioritiseEmailSafety(text)).toBe(false);

    const routed = routeMessage(text);
    expect(routed.opportunity.opportunityType).not.toBe("suspicious_email_risk");
    expect(routed.adminCase.title).not.toBe("Email needs safety check");
    expect(routed.adminCase.title).not.toBe("Email safety check");
  });

  it("does not add the credential warning to an ordinary message", () => {
    for (const { text } of ordinaryMessages) {
      const routed = routeMessage(text);
      const guided = deriveGuidedNextStep(routed.adminCase, routed.item, routed.finding);
      const impacts = deriveImpactFromCase(routed.adminCase, routed.item, routed.finding);

      expect(routed.opportunity.nextBestAction).not.toBe(SENSITIVE_INFORMATION_WARNING);
      expect(
        routed.adminCase.evidence.some((entry) =>
          entry.label === SENSITIVE_INFORMATION_REQUEST_EVIDENCE_LABEL,
        ),
      ).toBe(false);
      expect(guided.primaryAction.kind).toBeDefined();
      expect(
        impacts.every((entry) => !["confirmed_saved", "confirmed_recovered"].includes(entry.type)),
      ).toBe(true);
    }
  });
});
