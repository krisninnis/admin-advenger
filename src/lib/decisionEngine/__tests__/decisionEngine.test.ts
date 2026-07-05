import { describe, expect, it } from "vitest";
import { analyseDecisionProblem, flattenDecisionResultText } from "../decisionEngine";
import { FORBIDDEN_DECISION_PHRASES } from "../types";

const sampleTexts = {
  parkingClearGround:
    "Parking Charge Notice. Vehicle AB12 CDE. Amount £100, reduced to £60 if paid within 14 days. The signage at the car park was unclear when I parked.",
  parkingNoGround: "Parking Charge Notice. Please pay £100 within 28 days.",
  bailiff:
    "Notice of enforcement. Enforcement agents may visit. Council tax arrears £1,200. Pay by 12 July.",
  debtCollector:
    "You have been passed to collections. Outstanding balance of £450. Please contact us with your account reference.",
  tvLicence:
    "TV Licensing enforcement visit warning. We have no record of a TV Licence at this address. Do you watch live TV or use BBC iPlayer?",
  bankFinalResponse:
    "Final response from bank. We are not refunding the £89 fee. You may contact the Financial Ombudsman.",
  consumerDispute:
    "Refund refused. The item was faulty and the retailer will not repair, replace, or refund it. Order total £249.",
  unknownAdminDispute: "I got a strange letter yesterday and I'm not sure what it means.",
};

const containsForbiddenPhrase = (text: string) => {
  const lowerText = text.toLowerCase();

  return FORBIDDEN_DECISION_PHRASES.some((phrase) => lowerText.includes(phrase));
};

describe("Decision Engine v1", () => {
  it("classifies a parking charge with unclear signage as parking_ticket with possible/stronger grounds and amount being demanded", () => {
    const result = analyseDecisionProblem(sampleTexts.parkingClearGround);

    expect(result.documentType).toBe("parking_ticket");
    expect(["possible_ground", "stronger_possible_ground"]).toContain(result.caseStrength);
    expect(result.amountTreatment).toBe("amount_being_demanded");
    expect(result.amountMentioned).toBe("£100");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("classifies a parking charge with only 'pay £100' as weak/missing evidence or not enough information", () => {
    const result = analyseDecisionProblem(sampleTexts.parkingNoGround);

    expect(result.documentType).toBe("parking_ticket");
    expect(["weak_or_missing_evidence", "not_enough_information"]).toContain(result.caseStrength);
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("treats a bailiff/enforcement notice as urgent, says do not ignore, and never says you do not owe this", () => {
    const result = analyseDecisionProblem(sampleTexts.bailiff);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("bailiff_notice");
    expect(result.caseStrength).toBe("urgent_get_advice");
    expect(flattened).toContain("do not ignore");
    expect(flattened).not.toContain("you do not owe this");
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("classifies a debt collector letter as debt_collection and asks to check creditor/reference/amount", () => {
    const result = analyseDecisionProblem(sampleTexts.debtCollector);
    const evidenceText = result.evidenceNeeded.join(" ").toLowerCase();

    expect(result.documentType).toBe("debt_collection");
    expect(evidenceText).toMatch(/creditor/);
    expect(evidenceText).toMatch(/reference/);
    expect(evidenceText).toMatch(/amount/);
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("classifies a TV Licence letter as tv_licence, asks about live TV/iPlayer, and never definitively says a licence is needed or not needed", () => {
    const result = analyseDecisionProblem(sampleTexts.tvLicence);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("tv_licence");
    expect(flattened).toMatch(/live tv/);
    expect(flattened).toMatch(/bbc iplayer/);
    expect(flattened).not.toMatch(/you do not need a licen[cs]e/);
    expect(flattened).not.toMatch(/no licen[cs]e (is )?needed/);
    expect(flattened).not.toMatch(/definitely (need|do not need)/);
    expect(flattened).toMatch(/cannot (decide|tell you|definitively)/);
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("classifies a bank final response as bank_complaint with cautious escalation wording", () => {
    const result = analyseDecisionProblem(sampleTexts.bankFinalResponse);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.documentType).toBe("bank_complaint");
    expect(flattened).toMatch(/escalation/);
    expect(flattened).toMatch(/cannot guarantee|cannot decide|not decided/);
    expect(containsForbiddenPhrase(flattened)).toBe(false);
  });

  it("classifies a consumer faulty item/refund refused message as consumer_dispute with an evidence list and a draft request", () => {
    const result = analyseDecisionProblem(sampleTexts.consumerDispute);

    expect(result.documentType).toBe("consumer_dispute");
    expect(result.evidenceNeeded.length).toBeGreaterThan(0);
    expect(result.draftMessage).toBeDefined();
    expect(result.draftMessage?.length ?? 0).toBeGreaterThan(0);
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("classifies an unrecognised admin message as not_enough_information", () => {
    const result = analyseDecisionProblem(sampleTexts.unknownAdminDispute);

    expect(result.documentType).toBe("unknown_admin_dispute");
    expect(result.caseStrength).toBe("not_enough_information");
    expect(containsForbiddenPhrase(flattenDecisionResultText(result))).toBe(false);
  });

  it("never treats a demanded amount as saved or recovered money", () => {
    const result = analyseDecisionProblem(sampleTexts.bailiff);
    const flattened = flattenDecisionResultText(result).toLowerCase();

    expect(result.amountMentioned).toBe("£1,200");
    expect(result.amountTreatment).toBe("amount_being_demanded");
    expect(flattened).not.toContain("saved");
    expect(flattened).not.toContain("recovered");
    expect(flattened).not.toContain("confirmed saved");
    expect(flattened).not.toContain("pending recovery");
  });

  it("never uses forbidden wording across any supported document type", () => {
    for (const text of Object.values(sampleTexts)) {
      const result = analyseDecisionProblem(text);
      const flattened = flattenDecisionResultText(result);

      expect(containsForbiddenPhrase(flattened)).toBe(false);
    }
  });
});
