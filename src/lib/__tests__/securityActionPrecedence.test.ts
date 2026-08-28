import { describe, expect, it } from "vitest";
import { extractGeneralAdmin, isSecurityAlertText } from "../generalAdminExtraction";
import { publicMessageCorpusV1 } from "../publicMessageEvaluation/corpusV1";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import { shouldPrioritiseEmailSafety } from "../suspiciousEmail";

const corpusBase = publicMessageCorpusV1.find(
  (candidate) => candidate.id === "security_scams-10-verification_code",
)!;

const composed = (rawText: string) => {
  const journey = runPublicMessageScenario({ ...corpusBase, message: rawText });
  const view = journey.resultViewModel;
  return {
    journey,
    title: view.title,
    bestNextMove: view.bestNextMove?.label ?? "",
  };
};

describe("security/action precedence - unsafe source instruction must never surface as a recommendation", () => {
  const dangerousOperative = [
    ["S5 pay now", "Your account is on hold. Send the money now to keep it active."],
    ["S5b transfer funds", "Transfers are suspended. Please transfer the funds today or your service is stopped."],
    ["S-pay-link", "Click here and make a payment of £200 to release your order."],
    ["credential password", "We need you to send us your password to verify your account."],
    ["credential code", "Reply with the six-digit verification code you just received."],
    ["credential card", "Share your payment card details to receive your refund."],
    ["money demand urgent", "Urgent: pay the overdue amount of £460 immediately or face charges."],
  ] as const;

  it.each(dangerousOperative)(
    "%s never promotes the unsafe instruction as a recommendation",
    (_label, text) => {
      const fallback = extractGeneralAdmin(text).fallback;
      expect(fallback?.requestedAction).toBeUndefined();
      expect(fallback?.nextAction ?? "").not.toMatch(/^Follow the source request/);

      const result = composed(text);
      expect(result.bestNextMove).not.toMatch(
        /send (the )?money|transfer (the )?funds|make (a|the) payment|send us your password|reply with|share your payment card|pay the overdue/i,
      );
      expect(result.bestNextMove).not.toMatch(/^Follow the source request/);
    },
  );

  it("credential requests still route to the email safety check", () => {
    for (const text of [
      "We need you to send us your password to verify your account.",
      "Reply with the six-digit verification code you just received.",
      "Share your payment card details to receive your refund.",
    ]) {
      expect(shouldPrioritiseEmailSafety(text)).toBe(true);
      expect(composed(text).title).toBe("Email needs safety check");
    }
  });
});

describe("S7 - quoted, negated, hypothetical and warning wording is not an operative instruction", () => {
  const nonOperative = [
    [
      "quoted warning",
      "Your order will be delivered on 3 October. An email claiming 'send us your payment card details' is a known scam and should be ignored. We will never ask for card details.",
    ],
    [
      "quoted double quotes",
      "Messages that say \"we need your password\" are scams. We never do that.",
    ],
    [
      "hypothetical example",
      "For example, a message may claim 'we need your password' as a scam tactic. Do not respond.",
    ],
    [
      "negated protective",
      "Never send us your payment card details. We only take payment through our official checkout.",
    ],
    [
      "scam warning",
      "Beware of scams. Do not send your bank login details to anyone. We will never email you asking for your password.",
    ],
  ] as const;

  it.each(nonOperative)("%s is not escalated to the email safety check", (_label, text) => {
    expect(shouldPrioritiseEmailSafety(text)).toBe(false);
  });

  it.each(nonOperative)(
    "%s produces no credential request and no unsafe action",
    (_label, text) => {
      const fallback = extractGeneralAdmin(text).fallback;
      expect(fallback?.sensitiveInformationRequested ?? false).toBe(false);
      expect(fallback?.requestedAction).toBeUndefined();
      const result = composed(text);
      expect(result.bestNextMove).not.toMatch(/do not (send|share)|code, password, pin/i);
    },
  );

  it("still treats an unquoted genuine credential request as an instruction to refuse", () => {
    const text = "Please send us your payment card details to verify your account today.";
    expect(shouldPrioritiseEmailSafety(text)).toBe(true);
    const fallback = extractGeneralAdmin(text).fallback;
    expect(fallback?.sensitiveInformationRequested).toBe(true);
    expect(fallback?.nextAction).toMatch(/do not (send|share)/i);
  });
});

describe("S9 - ordinary bill and payment wording must not become a security warning", () => {
  const benign = [
    ["ordinary bill", "Your broadband bill is £46 and payment is due on 4 September."],
    ["payment reminder", "Please pay your balance of £120.00 by 30 September."],
    ["log in to pay", "Log in to your account to pay your bill online."],
    ["neutral login", "You can log in at any time to view your statement."],
    ["routine price rise", "Your monthly price will rise from £29 to £32.50."],
    ["refund notice", "Your refund of £46.00 has been initiated."],
  ] as const;

  it.each(benign)("%s is not escalated to the email safety check", (_label, text) => {
    expect(shouldPrioritiseEmailSafety(text)).toBe(false);
  });

  it.each(benign)(
    "%s does not attach a security/credential warning in the composed result",
    (_label, text) => {
      const result = composed(text);
      expect(result.bestNextMove).not.toMatch(/do not (send|share)|code, password, pin/i);
    },
  );
});

describe("S9 does not suppress genuine security alerts", () => {
  const genuine = [
    "We noticed a new sign-in to your account from an unrecognised device. Was this you?",
    "Security alert: unusual activity detected on your account. Verify it was you.",
    "Your password has been reset. If this was not you, sign in now to secure your account.",
  ] as const;

  it.each(genuine)("genuine security wording is still classified as a security alert: %s", (text) => {
    expect(isSecurityAlertText(text)).toBe(true);
  });

  it("does not classify ordinary log-in-to-view-statement language as a security alert", () => {
    expect(isSecurityAlertText("Please log in to view your monthly statement.")).toBe(false);
  });
});
