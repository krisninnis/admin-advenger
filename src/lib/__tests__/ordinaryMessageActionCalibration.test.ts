import { describe, expect, it } from "vitest";
import { runPublicMessageScenario } from "../publicMessageEvaluation/runEvaluation";
import type { PublicMessageScenario } from "../publicMessageEvaluation/types";

// W4 - Ordinary Message Action Calibration v1.
//
// Three rules:
//
//   routine messages get routine guidance;
//   a next step never asks for a fact the product already has;
//   escalation reflects the actual state and the stated timing.
//
// The audit found every category receiving the identical six-line warning block,
// including the phishing fixture: a refund approval was warned exactly as
// sternly as a credential-harvesting email, which means severity was not
// modelled at all. It also found pasted text told not to rely on OCR, a delivery
// message asked to go and find a reference it had already read, and a complaint
// draft offered as the primary action for an approved refund on day zero of its
// own stated ten-day window.
//
// Not in scope: extraction, routing, the date-role model, the evidence-kind
// model, or a result-page redesign.

const run = (id: string, message: string) =>
  runPublicMessageScenario({ id, message } as unknown as PublicMessageScenario);

const view = (id: string, message: string) => {
  const journey = run(id, message);
  const primary = journey.guidedNextStep.primaryAction as {
    kind: string;
    label?: string;
    title?: string;
    body?: string;
    checklist?: string[];
    deadlineText?: string;
  };

  return {
    journey,
    risks: journey.resultViewModel.risks,
    gather: journey.resultViewModel.evidenceToGather.map((entry) => entry.value),
    bestNextMove: journey.resultViewModel.bestNextMove,
    primaryKind: primary.kind,
    primaryLabel: primary.label ?? "",
    primaryText: [primary.label, primary.title, primary.body, primary.deadlineText]
      .concat(primary.checklist ?? [])
      .filter((part): part is string => typeof part === "string")
      .join("\n"),
    secondaryKinds: journey.guidedNextStep.secondaryActions.map((action) => action.kind),
    secondaryText: journey.guidedNextStep.secondaryActions
      .flatMap((action) => Object.values(action))
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .join("\n"),
    visible: journey.visibleText,
  };
};

const PRICE_RISE =
  "Important notice: your broadband and mobile tariff will increase from GBP 34 to GBP 46 per month from 1 September 2026. Please review your options before the change date. You can contact us to discuss your package, switch plan, or confirm whether cancellation rights apply.";

const REFUND_IN_WINDOW =
  "Your refund of £68.40 has been approved. It will be paid to your original payment method within 5 to 10 working days. Your reference is RF-20481.";

const REFUND_WINDOW_PASSED =
  "Your refund of £68.40 was approved on 1 July 2026 and the 10 working day window has now passed. The refund has not been paid.";

const REFUND_REFUSED = "We have refused your £68.40 refund request after reviewing the return.";

const PARCEL =
  "We are sorry your order ORD-77194 has not arrived. It was expected on 4 August 2026. We are investigating with the courier and will update you within 3 working days.";

const PHISHING =
  "URGENT: Your account will be suspended. Verify your details immediately at secure-login.example/verify or your access will be lost. Reply with your password now.";

/** Wording that only belongs on an elevated or security-shaped message. */
const ELEVATED_ONLY = [
  /scary-looking message/i,
  /angry message/i,
  /submit a form automatically/i,
];

const OCR_CAUTION = /rely on OCR/i;

// --- A: price-rise warning calibration -------------------------------------

describe("W4 price-rise warning calibration", () => {
  it("does not receive elevated or security-shaped warnings", () => {
    const { risks } = view("price-rise", PRICE_RISE);

    for (const pattern of ELEVATED_ONLY) {
      expect(risks.join("\n")).not.toMatch(pattern);
    }
  });

  it("does not receive OCR caution for pasted text", () => {
    expect(view("price-rise", PRICE_RISE).visible).not.toMatch(OCR_CAUTION);
  });

  it("keeps the money-safety boundary", () => {
    expect(view("price-rise", PRICE_RISE).risks.join("\n")).toMatch(
      /not count money mentioned .* as saved or recovered/i,
    );
  });

  it("keeps the routine checks about what the notice did not say", () => {
    const { gather } = view("price-rise", PRICE_RISE);

    expect(gather.join("\n")).toMatch(/cancellation.switching rights/i);
    expect(gather.join("\n")).toMatch(/provider name missing/i);
  });

  it("keeps every W1 to W3 price-rise fact", () => {
    const { visible } = view("price-rise", PRICE_RISE);

    for (const fact of ["£34", "£46", "£12", "£144", "1 September 2026"]) {
      expect(visible).toContain(fact);
    }
  });
});

// --- B: refund action calibration ------------------------------------------

describe("W4 refund still inside its stated window", () => {
  it("does not offer complaint escalation as the primary action", () => {
    const { primaryLabel } = view("refund-in-window", REFUND_IN_WINDOW);

    expect(primaryLabel).not.toMatch(/complaint/i);
  });

  it("acknowledges the stated window in the immediate guidance", () => {
    const { primaryText } = view("refund-in-window", REFUND_IN_WINDOW);

    expect(primaryText).toMatch(/5 to 10 working days/i);
  });

  it("does not claim the refund arrived, and invents no arrival date", () => {
    const { primaryText, visible } = view("refund-in-window", REFUND_IN_WINDOW);

    expect(visible).toMatch(/not confirmed received|pending/i);
    expect(primaryText).not.toMatch(/has arrived|has been received|refund received/i);
    expect(primaryText).not.toMatch(
      /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/,
    );
  });

  it("keeps escalation available, but conditional rather than definite", () => {
    const { primaryText, secondaryText } = view("refund-in-window", REFUND_IN_WINDOW);
    const all = `${primaryText}\n${secondaryText}`;

    // The product cannot know today's date against a working-day window, so it
    // must ask the person to compare rather than assert the window has passed.
    expect(all).toMatch(/if .* (?:has|have) (?:not )?(?:passed|arrived)|compare|once .* passed/i);
    expect(all).not.toMatch(/the window has (?:now )?passed/i);
  });

  it("keeps the reference and the timing role", () => {
    const { visible, journey } = view("refund-in-window", REFUND_IN_WINDOW);

    expect(visible).toContain("RF-20481");
    expect(
      journey.resultViewModel.keyDates.find((date) =>
        date.value.includes("5 to 10 working days"),
      )?.role,
    ).toBe("refund_window");
  });

  it("stays routine, with no elevated wording and no OCR caution", () => {
    const { risks, visible } = view("refund-in-window", REFUND_IN_WINDOW);

    for (const pattern of ELEVATED_ONLY) {
      expect(risks.join("\n")).not.toMatch(pattern);
    }
    expect(visible).not.toMatch(OCR_CAUTION);
  });
});

describe("W4 refund where the source shows the window has gone or failed", () => {
  it("still offers a follow-up or complaint draft once the source says the window passed", () => {
    const { primaryKind, primaryLabel, secondaryKinds } = view(
      "refund-window-passed",
      REFUND_WINDOW_PASSED,
    );

    expect(
      primaryKind === "draft_message" || secondaryKinds.includes("draft_message"),
    ).toBe(true);
    expect(`${primaryKind} ${primaryLabel}`).toMatch(/draft|complaint|follow/i);
  });

  it("keeps existing escalation for a refused refund", () => {
    const { primaryKind } = view("refund-refused", REFUND_REFUSED);

    expect(primaryKind).toBe("draft_message");
  });
});

// --- C: missing-parcel next-step specificity -------------------------------

describe("W4 missing-parcel next-step specificity", () => {
  it("does not ask for facts it already has", () => {
    const { gather, bestNextMove, primaryText } = view("parcel", PARCEL);
    const asks = [gather.join("\n"), bestNextMove?.label, bestNextMove?.description, primaryText]
      .filter((part): part is string => typeof part === "string")
      .join("\n");

    expect(asks).not.toMatch(/find .*reference|identify .*reference|any reference/i);
    expect(asks).not.toMatch(/find .*date|identify .*date|whether a date is mentioned/i);
    expect(asks).not.toMatch(/Sender, date, reference, requested action/i);
  });

  it("may still ask for what is genuinely absent", () => {
    const { gather, bestNextMove } = view("parcel", PARCEL);
    const asks = `${gather.join("\n")}\n${bestNextMove?.description ?? ""}`;

    // The sender is not named in this message, so asking for it stays fair.
    expect(asks.length).toBeGreaterThan(0);
  });

  it("declares no permanent loss and invents no money", () => {
    const { visible } = view("parcel", PARCEL);

    expect(visible).not.toMatch(/permanently lost|declared lost|confirmed lost/i);
    expect(visible).not.toMatch(/£\s*\d/);
  });

  it("stays routine, with no elevated wording and no OCR caution", () => {
    const { risks, visible } = view("parcel", PARCEL);

    for (const pattern of ELEVATED_ONLY) {
      expect(risks.join("\n")).not.toMatch(pattern);
    }
    expect(visible).not.toMatch(OCR_CAUTION);
  });

  it("keeps every W1 to W3 parcel fact", () => {
    const { visible } = view("parcel", PARCEL);

    expect(visible).toContain("ORD-77194");
    expect(visible).toContain("4 August 2026");
    expect(visible).toMatch(/3 working days/i);
  });
});

// --- D: security must not be softened --------------------------------------

describe("W4 security regression boundary", () => {
  it("keeps the stronger warning set for a phishing-shaped message", () => {
    const { risks } = view("phishing", PHISHING);

    expect(risks.join("\n")).toMatch(/scary-looking message/i);
    expect(risks.join("\n")).toMatch(
      /Do not reply, pay, click, or submit anything before checking/i,
    );
  });

  it("keeps the safety checklist as the primary action", () => {
    expect(view("phishing", PHISHING).primaryLabel).toMatch(/safety checklist/i);
  });

  it("keeps the credential and verification protections visible", () => {
    const { visible } = view("phishing", PHISHING);

    expect(visible).toMatch(/verify|independently/i);
    expect(visible).toMatch(/cannot confirm/i);
  });

  it("is warned more strongly than a routine refund", () => {
    const phishing = view("phishing", PHISHING).risks.length;
    const refund = view("refund-in-window", REFUND_IN_WINDOW).risks.length;

    expect(phishing).toBeGreaterThan(refund);
  });
});

// --- E: input-mode awareness ------------------------------------------------

describe("W4 input-mode awareness", () => {
  it("gives no OCR caution to any pasted-text journey", () => {
    for (const [id, message] of [
      ["price-rise", PRICE_RISE],
      ["refund-in-window", REFUND_IN_WINDOW],
      ["parcel", PARCEL],
      ["phishing", PHISHING],
    ] as const) {
      expect(view(id, message).visible).not.toMatch(OCR_CAUTION);
    }
  });
});
