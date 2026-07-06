import { describe, expect, it } from "vitest";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine";
import { FORBIDDEN_DECISION_PHRASES } from "../types";

const sampleTexts = {
  pipDecisionZeroPoints:
    "We have decided you scored 0 points for daily living and 0 points for mobility.",
  pipAssessmentReport: "This is your PA4 assessment report.",
  mandatoryReconsiderationOptionMentioned:
    "You have one month to ask for a Mandatory Reconsideration.",
  mrNoticeAlreadyIssued:
    "Mandatory Reconsideration Notice: we have looked at the decision again and it is unchanged. You can now appeal to the tribunal if you disagree.",
  pipClaimForm:
    "PIP2 form: How your disability affects you. Please describe how your condition affects your daily living and mobility.",
  dailyLivingWithContext:
    "PIP claim form. I cannot prepare food safely because I forget pans on the hob.",
  mobilityWithContext:
    "PIP claim form. I cannot plan or follow journeys because panic attacks stop me leaving the house.",
  benefitAmountMentioned: "PIP claim form. Your PIP payment could be up to £184.30 a week.",
  scotlandAdp: "Adult Disability Payment decision letter Scotland.",
};

const containsForbiddenPhrase = (text: string) => {
  const lowerText = text.toLowerCase();

  return FORBIDDEN_DECISION_PHRASES.some((phrase) => lowerText.includes(phrase));
};

describe("Benefits & PIP Evidence Helper (Decision Engine)", () => {
  it("classifies a PIP decision letter with 0 points as the decision/MR stage, asks about the deadline and evidence, and never guarantees an award", () => {
    const result = analyseDecisionProblem(sampleTexts.pipDecisionZeroPoints);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("benefits_decision");
    expect(flattened).toContain("mandatory reconsideration");
    expect(flattened).toMatch(/decision date|one month/);
    expect(result.evidenceNeeded.length).toBeGreaterThan(0);
    expect(flattened).toContain("does not give benefits advice or guarantee an award");
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("classifies a PA4 assessment report as the assessment report stage and suggests checking inaccuracies/descriptors", () => {
    const result = analyseDecisionProblem(sampleTexts.pipAssessmentReport);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("benefits_assessment_report");
    expect(flattened).toContain("inaccuracies");
    expect(flattened).toContain("descriptor");
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("treats a Mandatory Reconsideration Notice that has already been issued as the appeal stage", () => {
    const result = analyseDecisionProblem(sampleTexts.mrNoticeAlreadyIssued);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("benefits_appeal");
    expect(flattened).toContain("mandatory reconsideration has already happened");
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("keeps a message that only mentions the option of a Mandatory Reconsideration at the decision stage, not the appeal stage", () => {
    const result = analyseDecisionProblem(sampleTexts.mandatoryReconsiderationOptionMentioned);

    expect(result.documentType).toBe("benefits_decision");
  });

  it("classifies a PIP claim form as the evidence preparation stage", () => {
    const result = analyseDecisionProblem(sampleTexts.pipClaimForm);

    expect(result.documentType).toBe("benefits_evidence_prep");
    expect(result.evidenceNeeded.length).toBeGreaterThan(0);
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("maps daily living wording to a recognised daily living activity", () => {
    const result = analyseDecisionProblem(sampleTexts.dailyLivingWithContext);

    expect(result.sourceFacts).toContainEqual(
      expect.objectContaining({ label: "Daily living activity mentioned", value: "preparing food" }),
    );
    expect(
      result.possibleGrounds.some((ground) => ground.toLowerCase().includes("preparing food")),
    ).toBe(true);
  });

  it("maps mobility wording to a recognised mobility activity", () => {
    const result = analyseDecisionProblem(sampleTexts.mobilityWithContext);
    const mobilityFacts = result.sourceFacts.filter(
      (fact) => fact.label === "Mobility activity mentioned",
    );

    expect(mobilityFacts.length).toBeGreaterThan(0);
    expect(mobilityFacts.map((fact) => fact.value)).toContain("planning and following journeys");
  });

  it("includes the standard PIP reliability wording (safely/repeatedly/reasonable time/acceptable standard)", () => {
    const result = analyseDecisionProblem(sampleTexts.pipClaimForm);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(flattened).toMatch(/safely/);
    expect(flattened).toMatch(/repeatedly/);
    expect(flattened).toMatch(/reasonable time/);
    expect(flattened).toMatch(/acceptable standard/);
  });

  it("treats a benefit amount as 'amount mentioned only', never saved, recovered, or pending", () => {
    const result = analyseDecisionProblem(sampleTexts.benefitAmountMentioned);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.amountTreatment).toBe("amount_mentioned_only");
    expect(result.amountMentioned).toBe("£184.30");
    expect(flattened).not.toContain("saved");
    expect(flattened).not.toContain("recovered");
    expect(flattened).not.toContain("pending recovery");
    expect(flattened).not.toContain("confirmed saved");
  });

  it("warns that Scotland uses Adult Disability Payment (ADP), not PIP", () => {
    const result = analyseDecisionProblem(sampleTexts.scotlandAdp);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(flattened).toContain("scotland");
    expect(flattened).toContain("adult disability payment");
    expect(flattened).toMatch(/instead of pip|not personal independence payment|not pip/);
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("never uses forbidden wording across any benefits stage", () => {
    for (const text of Object.values(sampleTexts)) {
      const result = analyseDecisionProblem(text);
      const flattened = flattenDecisionResultText(result);

      expect(containsForbiddenPhrase(flattened)).toBe(false);
    }
  });

  it("never invents points, predicts a definite award, or tells the user they will win", () => {
    for (const text of Object.values(sampleTexts)) {
      const result = analyseDecisionProblem(text);
      const flattened = flattenDecisionResultText(result).toLowerCase();

      expect(flattened).not.toMatch(/you (will|are going to) (win|qualify|be awarded)/);
      expect(flattened).not.toMatch(/you should score \d+ points/);
      expect(flattened).not.toMatch(/dwp is (definitely |100% )?wrong/);
    }
  });

  describe("Universal Credit Statement and Sanction Routing", () => {
    const ucStatementText = `Universal Credit statement
Assessment period: 1 June to 30 June 2026
Standard allowance: £393.45
Housing: £500.00
Total before deductions: £893.45
What we take off:
Advance repayment: £50.00
Overpayment recovery: £30.00
Your payment this month: £813.45`;

    const ucSanctionText = `Universal Credit
We have decided to apply a sanction because you did not attend your work search review appointment.
The sanction starts on 10 July 2026.
If you disagree, you can ask for a mandatory reconsideration.
If you cannot pay for food, heating or rent, you may be able to ask about hardship support.`;

    it("UC statement beats generic deadline, has correct documentType, and extracts statement facts", () => {
      const result = analyseDecisionProblem(ucStatementText);

      expect(result.documentType).toBe("benefits_uc_statement");
      expect(result.title).toBe("Universal Credit statement check");
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Assessment period", value: "1 June to 30 June 2026" })
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Deductions section found", value: "Yes" })
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Advance repayment", value: "£50.00" })
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Overpayment recovery", value: "£30.00" })
      );
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Payment this month", value: "£813.45" })
      );

      // explaining deductions in grounds
      expect(result.possibleGrounds.some(g => g.includes("Deductions were applied"))).toBe(true);

      // money safety
      expect(result.amountMentioned).toBe("£813.45");
      expect(result.amountTreatment).toBe("amount_mentioned_only");

      // next steps suggest rate reduction or breakdown
      expect(result.nextSteps.some(step => step.toLowerCase().includes("hardship"))).toBe(true);

      // confidence/uncertainty/cannotKnow
      expect(result.confidence?.level).toBe("high");
      expect(result.cannotKnow?.length).toBeGreaterThan(0);
    });

    it("UC sanction beats generic deadline, has correct documentType, and extracts sanction date", () => {
      const result = analyseDecisionProblem(ucSanctionText);

      expect(result.documentType).toBe("benefits_uc_sanction");
      expect(result.title).toBe("Universal Credit sanction check");
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Sanction start date", value: "10 July 2026" })
      );
      expect(result.possibleGrounds.some(g => g.includes("Mandatory Reconsideration"))).toBe(true);
      expect(result.possibleGrounds.some(g => g.includes("Hardship support"))).toBe(true);

      const flattened = flattenDecisionResultText(result);
      expect(containsForbiddenPhrase(flattened)).toBe(false);
      expect(flattened.toLowerCase()).not.toMatch(/dwp is (definitely )?wrong/);
      expect(flattened.toLowerCase()).not.toMatch(/you (will|are going to) (win|qualify|be awarded)/);
    });

    it("PIP decision still works perfectly", () => {
      const result = analyseDecisionProblem(sampleTexts.pipDecisionZeroPoints);
      expect(result.documentType).toBe("benefits_decision");
    });

    it("gracefully degrades for partial UC statement input", () => {
      const partialText = "Universal Credit statement with Advance repayment: £45.00";
      const result = analyseDecisionProblem(partialText);

      expect(result.documentType).toBe("benefits_uc_statement");
      expect(result.sourceFacts).toContainEqual(
        expect.objectContaining({ label: "Advance repayment", value: "£45.00" })
      );
      expect(result.uncertainty).toContain("Exact dates of the assessment period are not confirmed.");
      expect(result.cannotKnow?.length).toBeGreaterThan(0);
    });
  });
});
