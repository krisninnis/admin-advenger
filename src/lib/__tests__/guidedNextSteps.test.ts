import { describe, expect, it } from "vitest";
import type { AdminCase, AdminItem, SourceType } from "../../types";
import { createAdminCase } from "../caseFactory";
import { analyseDecisionProblem } from "../decisionEngine/decisionEngine";
import { deriveGuidedNextStep, GUIDED_NEXT_STEP_SAFETY_NOTE } from "../guidedNextSteps";
import { analyseAdminItem } from "../mockAnalysis";

const now = "2026-07-06T09:00:00.000Z";

const makeItem = (
  title: string,
  rawText: string,
  sourceType: SourceType = "email",
): AdminItem => ({
  id: `item-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  title,
  sourceType,
  rawText,
  createdAt: now,
  analysedAt: now,
});

// Builds a real end-to-end case exactly the way Check a message does:
// mockAnalysis classifies the finding, then caseFactory attaches a
// decisionResult whenever the finding's category is "admin_dispute". This
// mirrors decisionEngineIntegration.test.ts's helper so the guided next step
// tests exercise the real pipeline, not a hand-built shortcut.
const firstCase = (item: AdminItem) => {
  const findings = analyseAdminItem(item);
  const finding = findings[0];

  if (!finding) {
    throw new Error("Expected at least one finding");
  }

  const adminCase = createAdminCase(finding, item);

  return { item, finding, adminCase };
};

// A minimal case literal for scenarios that don't need to go through the
// full classifier - e.g. asserting how guidedNextSteps reacts to a
// decisionResult of a specific documentType, or to no decisionResult and no
// recognisable opportunity at all.
const baseCase = (overrides: Partial<AdminCase> = {}): AdminCase => ({
  id: "case-test",
  findingId: "finding-test",
  itemId: "item-test",
  title: "Untitled item",
  category: "unknown",
  summary: "Test case.",
  urgency: "low",
  confidence: "low",
  status: "new",
  nextAction: "Review manually.",
  createdAt: now,
  updatedAt: now,
  evidence: [],
  timeline: [],
  ...overrides,
});

describe("Guided Next Step action system", () => {
  describe("category-specific primary actions", () => {
    it("PIP decision letter shows Create Mandatory Reconsideration draft", () => {
      const { item, finding, adminCase } = firstCase(
        makeItem(
          "PIP decision letter",
          "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.",
        ),
      );

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("benefits_decision");
      expect(guided.primaryAction.kind).toBe("draft_message");
      expect(guided.primaryAction.label).toBe("Create Mandatory Reconsideration draft");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body).toContain("Mandatory Reconsideration");
        expect(guided.primaryAction.safetyNote).toBeTruthy();
      }
    });

    it("UC sanction result shows Create UC journal message", () => {
      const ucSanctionText = `Universal Credit
We have decided to apply a sanction because you did not attend your work search review appointment.
The sanction starts on 10 July 2026.
If you disagree, you can ask for a mandatory reconsideration.
If you cannot pay for food, heating or rent, you may be able to ask about hardship support.`;
      const { item, finding, adminCase } = firstCase(makeItem("UC sanction notice", ucSanctionText));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("benefits_uc_sanction");
      expect(guided.primaryAction.label).toBe("Create UC journal message");
      expect(guided.primaryAction.kind).toBe("draft_message");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body).toContain("10 July 2026");
        expect(guided.primaryAction.body.toLowerCase()).toContain("please confirm");
      }
    });

    it("UC statement result shows Create deduction breakdown request", () => {
      const ucStatementText = `Universal Credit statement
Assessment period: 1 June to 30 June 2026
Standard allowance: £393.45
Housing: £500.00
Total before deductions: £893.45
What we take off:
Advance repayment: £50.00
Overpayment recovery: £30.00
Your payment this month: £813.45`;
      const { item, finding, adminCase } = firstCase(makeItem("UC statement", ucStatementText));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("benefits_uc_statement");
      expect(guided.primaryAction.label).toBe("Create deduction breakdown request");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body.toLowerCase()).toContain("please provide a breakdown");
      }
    });

    it("UC deductions/overpayment result shows Create deduction breakdown request", () => {
      const text =
        "Overpayment decision: You have an overpayment of £320.00. This overpayment arose because you did not report a change in earnings. We will be deducting £25 per month from your Universal Credit.";
      const { item, finding, adminCase } = firstCase(makeItem("UC overpayment notice", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("benefits_uc_deductions");
      expect(guided.primaryAction.label).toBe("Create deduction breakdown request");
    });

    it("parking result shows Create appeal draft", () => {
      const text =
        "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. The signage at the car park was unclear when I parked.";
      const { item, finding, adminCase } = firstCase(makeItem("Parking Charge Notice", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("parking_ticket");
      expect(guided.primaryAction.label).toBe("Create appeal draft");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body.length).toBeGreaterThan(0);
      }
    });

    it("debt collection result shows Create debt response draft", () => {
      const text =
        "You have been passed to collections. Outstanding balance of £450. Please contact us with your account reference.";
      const { item, finding, adminCase } = firstCase(makeItem("Debt collection letter", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("debt_collection");
      expect(guided.primaryAction.label).toBe("Create debt response draft");
    });

    it("bailiff/enforcement result also shows Create debt response draft", () => {
      const text =
        "Notice of enforcement. Enforcement agents may visit. Council tax arrears £1,200. Pay by 12 July.";
      const { item, finding, adminCase } = firstCase(makeItem("Enforcement notice", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("bailiff_notice");
      expect(guided.primaryAction.label).toBe("Create debt response draft");
      // Bailiff/enforcement is urgent - a free-advice link should also be offered.
      expect(guided.secondaryActions.some((action) => action.kind === "official_link")).toBe(true);
    });

    it("consumer/refund complaint (decision engine) shows Create complaint draft", () => {
      const text =
        "Refund refused. The item was faulty and the retailer will not repair, replace, or refund it. Order total £249.";
      const { item, finding, adminCase } = firstCase(makeItem("Consumer complaint", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(adminCase.decisionResult?.documentType).toBe("consumer_dispute");
      expect(guided.primaryAction.label).toBe("Create complaint draft");
    });

    it("consumer/refund complaint (opportunity-based approved refund) also shows a supported draft action", () => {
      const text =
        "Your refund of £42.99 has been approved and will be returned to your original payment method within 5 to 10 working days. Reference RF12345.";
      const { item, finding, adminCase } = firstCase(makeItem("Refund approved", text));

      expect(adminCase.decisionResult).toBeUndefined();

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.kind).toBe("draft_message");
      expect(guided.primaryAction.label).toBe("Create complaint draft");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body).toContain("refund");
      }
    });

    it("travel/payment breakdown issue shows Create payment breakdown request", () => {
      const text =
        "Air Mauritius / loveholidays flight cancellation extra hotel night claim. Booking reference U4FP9V. Extra hotel night cost £219.69. Air Mauritius asked for bank statement proof of payment. loveholidays confirmed £219.69 was added to the payment schedule.";
      const { item, finding, adminCase } = firstCase(makeItem("Travel extra hotel night", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.label).toBe("Create payment breakdown request");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body).toContain("£219.69");
      }
    });

    it("unknown/incomplete decision-engine result (unknown_admin_dispute) shows Add more information", () => {
      const decision = analyseDecisionProblem("asdkfj 29471 %%%$$ garbled nonsense");
      const adminCase = baseCase({
        title: decision.title,
        decisionResult: decision,
      });

      expect(decision.documentType).toBe("unknown_admin_dispute");

      const guided = deriveGuidedNextStep(adminCase, undefined, undefined);

      expect(guided.primaryAction.kind).toBe("answer_questions");
      expect(guided.primaryAction.label).toBe("Add more information");
      if (guided.primaryAction.kind === "answer_questions") {
        expect(guided.primaryAction.questions.length).toBeGreaterThan(0);
      }
    });

    it("unknown fallback with no decision engine match at all shows Add more information", () => {
      const adminCase = baseCase({
        title: "Untitled item",
        category: "unknown",
      });

      const guided = deriveGuidedNextStep(adminCase, undefined, undefined);

      expect(guided.primaryAction.kind).toBe("answer_questions");
      expect(guided.primaryAction.label).toBe("Add more information");
    });
  });

  describe("clicking/opening an action exposes its content through the returned model", () => {
    it("a draft_message action carries the full editable draft body, not just a label", () => {
      const text =
        "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. The signage at the car park was unclear when I parked.";
      const { item, finding, adminCase } = firstCase(makeItem("Parking Charge Notice", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.kind).toBe("draft_message");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body.length).toBeGreaterThan(20);
        expect(guided.primaryAction.copyButtonLabel).toBe("Copy draft");
      }
    });

    it("an evidence_checklist secondary action carries real evidence items, not an empty list", () => {
      const text =
        "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.";
      const { item, finding, adminCase } = firstCase(makeItem("PIP decision letter", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const evidenceAction = guided.secondaryActions.find(
        (action) => action.kind === "evidence_checklist",
      );

      expect(evidenceAction).toBeDefined();
      if (evidenceAction?.kind === "evidence_checklist") {
        expect(evidenceAction.evidenceNeeded.length).toBeGreaterThan(0);
      }
    });

    it("an answer_questions action for the unknown fallback carries real questions", () => {
      const adminCase = baseCase();
      const guided = deriveGuidedNextStep(adminCase, undefined, undefined);

      expect(guided.primaryAction.kind).toBe("answer_questions");
      if (guided.primaryAction.kind === "answer_questions") {
        expect(guided.primaryAction.questions.length).toBeGreaterThan(0);
        expect(guided.primaryAction.questions[0].length).toBeGreaterThan(0);
      }
    });
  });

  describe("copy draft behaviour is safe to test without a browser clipboard", () => {
    it("the draft body is plain data - copying it never requires touching navigator.clipboard in this test", () => {
      const text =
        "You have been passed to collections. Outstanding balance of £450. Please contact us with your account reference.";
      const { item, finding, adminCase } = firstCase(makeItem("Debt collection letter", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.kind).toBe("draft_message");
      if (guided.primaryAction.kind === "draft_message") {
        // What would be copied is exactly this string - a plain, inspectable
        // value, not something that only exists once a button is clicked in
        // a browser.
        const whatWouldBeCopied = guided.primaryAction.body;
        expect(typeof whatWouldBeCopied).toBe("string");
        expect(whatWouldBeCopied.length).toBeGreaterThan(0);
      }
    });
  });

  describe("modal sections are strictly separated by DecisionResult field", () => {
    it("PIP evidence checklist does not include questions, deadlines, uncertainty, or cannotKnow", () => {
      const text =
        "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.";
      const { item, finding, adminCase } = firstCase(makeItem("PIP decision letter", text));

      const decision = adminCase.decisionResult;
      expect(decision).toBeDefined();

      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const evidenceAction = guided.secondaryActions.find(
        (action) => action.kind === "evidence_checklist",
      );

      expect(evidenceAction).toBeDefined();
      if (evidenceAction?.kind === "evidence_checklist" && decision) {
        const evidenceText = evidenceAction.evidenceNeeded.join(" | ").toLowerCase();

        for (const question of decision.questionsToAnswer ?? []) {
          expect(evidenceText).not.toContain(question.toLowerCase());
        }
        for (const deadline of decision.deadlines) {
          expect(evidenceText).not.toContain(deadline.toLowerCase());
        }
        for (const uncertain of decision.uncertainty) {
          expect(evidenceText).not.toContain(uncertain.toLowerCase());
        }
        for (const cannotKnow of decision.cannotKnow) {
          expect(evidenceText).not.toContain(cannotKnow.toLowerCase());
        }
        // Every evidence item should trace back to evidenceNeeded itself.
        for (const evidenceItem of evidenceAction.evidenceNeeded) {
          expect(decision.evidenceNeeded.map((e) => e.toLowerCase())).toContain(evidenceItem.toLowerCase());
        }
      }

      // Action-specific modal title, not the generic decision-module title.
      expect(guided.primaryAction.title).toBe("Mandatory Reconsideration draft");

      // Separately, questions/deadlines/uncertainty/cannotKnow should each
      // still surface, just in their own dedicated sections.
      expect(guided.secondaryActions.some((action) => action.kind === "answer_questions")).toBe(true);
      expect(guided.secondaryActions.some((action) => action.kind === "deadline_checklist")).toBe(true);
      expect(guided.secondaryActions.some((action) => action.kind === "cannot_know_list")).toBe(true);
    });

    it("Parking evidence checklist does not include cannotKnow text (e.g. 'whether an appeal would succeed')", () => {
      const text =
        "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. The signage at the car park was unclear when I parked.";
      const { item, finding, adminCase } = firstCase(makeItem("Parking Charge Notice", text));

      const decision = adminCase.decisionResult;
      expect(decision?.cannotKnow.length).toBeGreaterThan(0);

      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const evidenceAction = guided.secondaryActions.find(
        (action) => action.kind === "evidence_checklist",
      );

      expect(evidenceAction).toBeDefined();
      if (evidenceAction?.kind === "evidence_checklist") {
        const evidenceText = evidenceAction.evidenceNeeded.join(" | ").toLowerCase();

        expect(evidenceText).not.toContain("whether an appeal would succeed");
        for (const cannotKnow of decision?.cannotKnow ?? []) {
          expect(evidenceText).not.toContain(cannotKnow.toLowerCase());
        }
      }

      expect(guided.primaryAction.title).toBe("Parking appeal draft");
    });

    it("PIP deadline appears only in the deadline section, not duplicated and not leaked elsewhere", () => {
      const text =
        "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.";
      const { item, finding, adminCase } = firstCase(makeItem("PIP decision letter", text));

      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const deadlineAction = guided.secondaryActions.find(
        (action) => action.kind === "deadline_checklist",
      );

      expect(deadlineAction).toBeDefined();
      if (deadlineAction?.kind === "deadline_checklist") {
        // No duplicate entries within the deadline checklist itself.
        const uniqueLower = new Set(deadlineAction.checklist.map((item) => item.trim().toLowerCase()));
        expect(uniqueLower.size).toBe(deadlineAction.checklist.length);
        // The headline value is not itself repeated a second time inside the list.
        expect(
          deadlineAction.checklist.filter((item) => item === deadlineAction.deadlineText).length,
        ).toBe(1);

        // The deadline text must not also leak into evidence/questions/uncertainty/cannotKnow.
        const otherSectionsText = guided.secondaryActions
          .filter((action) => action.kind !== "deadline_checklist")
          .map((action) => {
            if (action.kind === "evidence_checklist") return action.evidenceNeeded.join(" | ");
            if (action.kind === "answer_questions") return action.questions.join(" | ");
            if (action.kind === "uncertainty_list") return action.items.join(" | ");
            if (action.kind === "cannot_know_list") return action.items.join(" | ");
            return "";
          })
          .join(" | ")
          .toLowerCase();

        for (const deadline of deadlineAction.checklist) {
          expect(otherSectionsText).not.toContain(deadline.toLowerCase());
        }
      }
    });

    it("UC sanction still shows draft, evidence, questions, deadline, and safety note", () => {
      const ucSanctionText = `Universal Credit
We have decided to apply a sanction because you did not attend your work search review appointment.
The sanction starts on 10 July 2026.
If you disagree, you can ask for a mandatory reconsideration.
If you cannot pay for food, heating or rent, you may be able to ask about hardship support.`;
      const { item, finding, adminCase } = firstCase(makeItem("UC sanction notice", ucSanctionText));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.kind).toBe("draft_message");
      expect(guided.primaryAction.title).toBe("Universal Credit sanction - request for clarification");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.safetyNote).toBeTruthy();
      }

      const kinds = guided.secondaryActions.map((action) => action.kind);
      expect(kinds).toContain("evidence_checklist");
      expect(kinds).toContain("answer_questions");
      expect(kinds).toContain("deadline_checklist");
    });

    it("UC statement still shows the deduction breakdown draft with its action-specific title", () => {
      const ucStatementText = `Universal Credit statement
Assessment period: 1 June to 30 June 2026
Standard allowance: £393.45
Housing: £500.00
Total before deductions: £893.45
What we take off:
Advance repayment: £50.00
Overpayment recovery: £30.00
Your payment this month: £813.45`;
      const { item, finding, adminCase } = firstCase(makeItem("UC statement", ucStatementText));

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      expect(guided.primaryAction.kind).toBe("draft_message");
      expect(guided.primaryAction.title).toBe("Universal Credit deductions - request for a breakdown");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body.toLowerCase()).toContain("please provide a breakdown");
      }
    });

    it("official_link is rendered from a human-readable title, not the raw URL, as the clickable label", () => {
      const text =
        "Notice of enforcement. Enforcement agents may visit. Council tax arrears £1,200. Pay by 12 July.";
      const { item, finding, adminCase } = firstCase(makeItem("Enforcement notice", text));
      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const linkAction = guided.secondaryActions.find((action) => action.kind === "official_link");

      expect(linkAction).toBeDefined();
      if (linkAction?.kind === "official_link") {
        // The label/title shown to the user is human-readable, not the bare URL.
        expect(linkAction.title).toBe("Citizens Advice");
        expect(linkAction.title).not.toContain("http");
        expect(linkAction.url).toContain("citizensadvice.org.uk");
      }
    });
  });

  describe("action system never sends or contacts anyone automatically", () => {
    const scenarios: Array<{ label: string; title: string; rawText: string }> = [
      {
        label: "PIP decision",
        title: "PIP decision letter",
        rawText:
          "We have decided you scored 0 points for daily living and 0 points for mobility. Your PIP payment could have been up to £184.30 a week.",
      },
      {
        label: "UC sanction",
        title: "UC sanction notice",
        rawText:
          "Universal Credit\nWe have decided to apply a sanction because you did not attend your work search review appointment.\nThe sanction starts on 10 July 2026.",
      },
      {
        label: "UC statement",
        title: "UC statement",
        rawText:
          "Universal Credit statement\nAssessment period: 1 June to 30 June 2026\nWhat we take off:\nAdvance repayment: £50.00\nYour payment this month: £813.45",
      },
      {
        label: "Parking",
        title: "Parking Charge Notice",
        rawText:
          "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. Signage was unclear.",
      },
      {
        label: "Debt collection",
        title: "Debt collection letter",
        rawText: "You have been passed to collections. Outstanding balance of £450.",
      },
      {
        label: "Consumer dispute",
        title: "Consumer complaint",
        rawText:
          "Refund refused. The item was faulty and the retailer will not repair, replace, or refund it. Order total £249.",
      },
      {
        label: "Travel recovery",
        title: "Travel extra hotel night",
        rawText:
          "Air Mauritius / loveholidays flight cancellation extra hotel night claim. Booking reference U4FP9V. Extra hotel night cost £219.69.",
      },
    ];

    const forbiddenAutoActionPatterns = [
      /\bwe will send\b/i,
      /\bwe will submit\b/i,
      /\bwe will contact\b/i,
      /\bi will send this for you\b/i,
      /\bhas been sent\b/i,
      /\bhas been submitted\b/i,
      /\bguaranteed\b/i,
      /\byou will win\b/i,
      /\bdefinitely unlawful\b/i,
      /\byou do not owe this\b/i,
      /\byou definitely qualify\b/i,
      /\bdwp is definitely wrong\b/i,
    ];

    const collectActionText = (action: ReturnType<typeof deriveGuidedNextStep>["primaryAction"]) => {
      switch (action.kind) {
        case "draft_message":
          return [action.label, action.title, action.body, action.safetyNote ?? ""].join(" \n ");
        case "evidence_checklist":
          return [action.label, action.title, ...action.evidenceNeeded].join(" \n ");
        case "answer_questions":
          return [action.label, action.title, ...action.questions].join(" \n ");
        case "deadline_checklist":
          return [action.label, action.title, action.deadlineText, ...action.checklist].join(" \n ");
        case "official_link":
          return [action.label, action.title, action.url, action.warning ?? ""].join(" \n ");
        case "uncertainty_list":
          return [action.label, action.title, ...action.items].join(" \n ");
        case "cannot_know_list":
          return [action.label, action.title, ...action.items].join(" \n ");
        default:
          return "";
      }
    };

    it("never uses auto-send/guarantee wording in any generated action, across every supported category", () => {
      for (const scenario of scenarios) {
        const { item, finding, adminCase } = firstCase(makeItem(scenario.title, scenario.rawText));
        const guided = deriveGuidedNextStep(adminCase, item, finding);
        const allText = [
          collectActionText(guided.primaryAction),
          ...guided.secondaryActions.map((action) => collectActionText(action)),
        ].join(" \n ");

        for (const pattern of forbiddenAutoActionPatterns) {
          expect(allText, `${scenario.label}: matched forbidden pattern ${pattern}`).not.toMatch(pattern);
        }
      }
    });

    it("every draft_message action states plainly that AdminAvenger does not send it", () => {
      for (const scenario of scenarios) {
        const { item, finding, adminCase } = firstCase(makeItem(scenario.title, scenario.rawText));
        const guided = deriveGuidedNextStep(adminCase, item, finding);

        if (guided.primaryAction.kind === "draft_message") {
          const safetyText = (guided.primaryAction.safetyNote ?? GUIDED_NEXT_STEP_SAFETY_NOTE).toLowerCase();
          expect(safetyText).toContain("does not");
          expect(safetyText.includes("send") || safetyText.includes("sent")).toBe(true);
        }
      }
    });

    it("the official_link action never claims AdminAvenger will contact the link on the user's behalf", () => {
      const text =
        "Notice of enforcement. Enforcement agents may visit. Council tax arrears £1,200. Pay by 12 July.";
      const { item, finding, adminCase } = firstCase(makeItem("Enforcement notice", text));
      const guided = deriveGuidedNextStep(adminCase, item, finding);
      const linkAction = guided.secondaryActions.find((action) => action.kind === "official_link");

      expect(linkAction).toBeDefined();
      if (linkAction?.kind === "official_link") {
        expect(linkAction.warning?.toLowerCase()).toContain("does not contact");
      }
    });
  });

  describe("Terms & Safety gate compatibility (regression check)", () => {
    it("guided next step derivation is a pure function that never touches window/localStorage or the acceptance gate", () => {
      // deriveGuidedNextStep must not import or call anything from
      // termsAcceptance.ts - it is pure data derivation reachable only from
      // inside HomeView, which App.tsx already only renders once
      // hasAcceptedCurrentTerms() is true. This test asserts the pure-data
      // guarantee directly: calling it with no `window` defined at all must
      // not throw, proving it cannot itself be gating or ungating anything.
      const originalWindow = globalThis.window;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;

      try {
        const adminCase = baseCase();
        expect(() => deriveGuidedNextStep(adminCase, undefined, undefined)).not.toThrow();
      } finally {
        if (originalWindow !== undefined) {
          Object.defineProperty(globalThis, "window", {
            value: originalWindow,
            configurable: true,
          });
        }
      }
    });
  });

  describe("existing save flow is unaffected (regression check)", () => {
    it("adminCase.decisionResult is still attached exactly as before for a decision-engine document", () => {
      const text =
        "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. The signage at the car park was unclear when I parked.";
      const { adminCase } = firstCase(makeItem("Parking Charge Notice", text));

      // Same assertions decisionEngineIntegration.test.ts already makes -
      // proves adding guidedNextSteps.ts did not change caseFactory's output.
      expect(adminCase.decisionResult?.documentType).toBe("parking_ticket");
      expect(adminCase.category).toBe("admin_dispute");
    });

    it("createPreparedMessageDraft still returns the original generic admin-dispute fallback for document types this feature did not touch", () => {
      const text = "Final response from bank. We are not refunding the £89 fee. You may contact the Financial Ombudsman.";
      const { item, finding, adminCase } = firstCase(makeItem("Bank complaint", text));

      expect(adminCase.decisionResult?.documentType).toBe("bank_complaint");

      const guided = deriveGuidedNextStep(adminCase, item, finding);

      // bank_complaint was not one of the 8 explicitly-labelled categories,
      // so it must still fall back to the generic label/draft rather than
      // silently losing its draftMessage.
      expect(guided.primaryAction.kind).toBe("draft_message");
      if (guided.primaryAction.kind === "draft_message") {
        expect(guided.primaryAction.body.length).toBeGreaterThan(0);
      }
    });
  });
});
