import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import { createAdminCase, selectMostImportantCase } from "../caseFactory";
import { analyseAdminItem } from "../mockAnalysis";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// P0 - Ordinary Message Security Precedence v1.
//
// One invariant: if the input is security-shaped and a genuine security finding
// exists, no non-security finding may outrank it because of refund, delivery,
// money or routine-admin wording.
//
// The production-readiness review found that a redelivery scam routed correctly
// to the security path, and that appending "or it will be returned." was enough
// to hand selection to a refund case: routine warnings, a complaint draft, and
// £1.50 rendered as money the person might receive. The governed corpus holds
// the base sentence and passed throughout, because the corpus asserts
// classification of one exact string rather than precedence between competing
// findings.
//
// These tests are written as mutations of one security-shaped message. They are
// deliberately not assertions about the words "returned" or "refund": any benign
// commercial noun must be survivable, so the fix has to live in the selection
// rule.

const makeItem = (rawText: string): AdminItem => ({
  id: "item-security-precedence",
  title: "Pasted admin text",
  sourceType: "email",
  rawText,
  createdAt: "2026-08-07T09:00:00.000Z",
});

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

/**
 * Security is asserted through what the person actually gets, not through any
 * new internal field, so these tests describe the contract rather than the
 * implementation.
 */
const securityView = (id: string, message: string) => {
  const journey = run(id, message);
  const primary = journey.guidedNextStep.primaryAction as { label?: string };

  return {
    journey,
    caseTitle: journey.adminCase.title,
    isSecurityCase: /safety check|security alert/i.test(journey.adminCase.title),
    primaryLabel: primary.label ?? "",
    risks: journey.resultViewModel.risks,
    money: journey.resultViewModel.moneyMentioned,
    visible: journey.visibleText,
  };
};

const BASE_SCAM =
  "Your parcel is held. Pay a £1.50 redelivery fee using parcel-check.example/link.";

/**
 * Benign commercial wording appended to the same scam. Each is a natural
 * sentence a real scam or a real provider might use, and each contains a noun
 * that steers a competing keyword rule.
 */
const BENIGN_APPENDS: ReadonlyArray<readonly [string, string]> = [
  ["returned", "or it will be returned."],
  ["refund", "Your refund will follow separately."],
  ["money", "No money has left your account yet."],
  ["delivery", "Delivery will be attempted again tomorrow."],
  ["fee", "The fee covers the new delivery slot."],
  ["payment", "Payment is required before delivery."],
  ["account", "Your account will be updated after payment."],
  ["charge", "A small charge applies to redelivery."],
  ["claim", "You can claim the parcel after paying."],
  ["credit", "Any credit on your account will be applied."],
];

const COMBINATIONS: ReadonlyArray<readonly [string, string]> = [
  [
    "refund wording",
    "Your refund of £12.00 has been approved and will be returned to your original payment method.",
  ],
  [
    "parcel and delivery wording",
    "Your order ORD-99123 was expected on 4 August 2026 and delivery is now delayed.",
  ],
  [
    "payment reminder wording",
    "Payment reminder: your balance of £84.20 is outstanding. Please pay by 20 August 2026.",
  ],
  ["money-back wording", "You may be entitled to money back on this order."],
];

// --- Base security case -----------------------------------------------------

describe("P0 base phishing case", () => {
  it("routes to the security path", () => {
    expect(securityView("base", BASE_SCAM).isSecurityCase).toBe(true);
  });

  it("keeps the safety checklist as the primary action", () => {
    expect(securityView("base", BASE_SCAM).primaryLabel).toMatch(/safety checklist/i);
  });

  it("keeps the stronger security warning set", () => {
    const { risks } = securityView("base", BASE_SCAM);

    expect(risks.join("\n")).toMatch(/scary-looking message/i);
    expect(risks.join("\n")).toMatch(
      /Do not reply, pay, click, or submit anything before checking/i,
    );
  });

  it("does not present the demanded fee as money the person might receive", () => {
    const { money, visible } = securityView("base", BASE_SCAM);

    for (const line of money) {
      expect(line.treatment).not.toBe("possible_refund_or_reduction");
    }
    expect(visible).not.toMatch(/money back to chase|possible refund/i);
  });
});

// --- Mutations: benign commercial wording must not demote security ----------

describe("P0 benign wording must not demote security", () => {
  it.each(BENIGN_APPENDS)("survives an appended sentence about %s", (name, append) => {
    const view = securityView(`append-${name}`, `${BASE_SCAM} ${append}`);

    expect(view.isSecurityCase).toBe(true);
    expect(view.primaryLabel).toMatch(/safety checklist/i);
    expect(view.primaryLabel).not.toMatch(/complaint/i);
  });

  it.each(BENIGN_APPENDS)("keeps security warnings with %s appended", (name, append) => {
    const { risks } = securityView(`warn-${name}`, `${BASE_SCAM} ${append}`);

    expect(risks.join("\n")).toMatch(/scary-looking message/i);
  });

  it.each(BENIGN_APPENDS)("never treats the fee as recoverable with %s appended", (name, append) => {
    const { money } = securityView(`money-${name}`, `${BASE_SCAM} ${append}`);

    for (const line of money) {
      expect(line.treatment).not.toBe("possible_refund_or_reduction");
    }
  });
});

describe("P0 combined security and routine wording", () => {
  it.each(COMBINATIONS)("stays security when combined with %s", (name, append) => {
    const view = securityView(`combo-${name}`, `${BASE_SCAM} ${append}`);

    expect(view.isSecurityCase).toBe(true);
    expect(view.primaryLabel).toMatch(/safety checklist/i);
  });
});

// --- Precedence, not absence ------------------------------------------------

describe("P0 precedence over a genuine competing finding", () => {
  const MUTATED = `${BASE_SCAM} or it will be returned.`;

  it("still generates more than one finding", () => {
    const findings = analyseAdminItem(makeItem(MUTATED), { accessMode: "public" });

    expect(findings.length).toBeGreaterThan(1);
  });

  it("generates a genuine money-shaped competing finding", () => {
    const findings = analyseAdminItem(makeItem(MUTATED), { accessMode: "public" });

    expect(
      findings.some((finding) =>
        ["refund", "complaint", "bill_increase", "subscription", "warranty"].includes(
          finding.category,
        ),
      ),
    ).toBe(true);
  });

  it("selects the security finding despite that competing finding", () => {
    const item = makeItem(MUTATED);
    const findings = analyseAdminItem(item, { accessMode: "public" });
    const selected = selectMostImportantCase(
      findings.map((finding) => createAdminCase(finding, item)),
    );

    expect(selected).toBeDefined();
    expect(selected?.title).toMatch(/safety check|security alert/i);
  });

  it("selects security regardless of the order the cases arrive in", () => {
    const item = makeItem(MUTATED);
    const cases = analyseAdminItem(item, { accessMode: "public" }).map((finding) =>
      createAdminCase(finding, item),
    );

    expect(selectMostImportantCase([...cases])?.title).toMatch(/safety check|security alert/i);
    expect(selectMostImportantCase([...cases].reverse())?.title).toMatch(
      /safety check|security alert/i,
    );
  });
});

// --- Negative boundaries: routine input must stay routine -------------------

describe("P0 routine messages must not become security", () => {
  it.each([
    [
      "an approved refund",
      "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.",
    ],
    [
      "a delayed parcel",
      "We are sorry your order ORD-77194 has not arrived. It was expected on 4 August 2026. We are investigating with the courier and will update you within 3 working days.",
    ],
    [
      "a payment reminder",
      "Payment reminder: your account balance of £84.20 is outstanding. Please pay by 20 August 2026 to avoid further collection activity.",
    ],
    [
      "a price rise",
      "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 September 2026.",
    ],
  ])("leaves %s on its own route", (name, message) => {
    const view = securityView(`routine-${name}`, message);

    expect(view.isSecurityCase).toBe(false);
    expect(view.primaryLabel).not.toMatch(/safety checklist/i);
  });
});

// --- Existing security behaviour must not change -----------------------------

describe("P0 existing security coverage", () => {
  it.each([
    [
      "an account-suspension phishing email",
      "URGENT: Your account will be suspended. Verify your details immediately at secure-login.example/verify or your access will be lost. Reply with your password now.",
    ],
    [
      "a spoofed sender email",
      "From: security@paypa1-alerts.example\nSubject: Verify now\nYour account is suspended. Confirm your card details at paypa1-alerts.example/verify within 24 hours.",
    ],
  ])("keeps %s on the security path", (name, message) => {
    const view = securityView(`existing-${name}`, message);

    expect(view.isSecurityCase).toBe(true);
    expect(view.primaryLabel).toMatch(/safety checklist/i);
  });

  it("keeps credential-request protections", () => {
    const { visible } = securityView(
      "credentials",
      "Please confirm your password, PIN and card number by replying to this email so we can verify your account.",
    );

    expect(visible).toMatch(/never needed|do not send them|do not share/i);
  });

  it("keeps the verification and cannot-confirm wording", () => {
    const { visible } = securityView("wording", BASE_SCAM);

    expect(visible).toMatch(/verify|independently/i);
    expect(visible).toMatch(/cannot confirm/i);
  });
});
