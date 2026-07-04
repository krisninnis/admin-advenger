import type { AdminCase, AdminDraft, FindingCategory } from "../types";
import type { ServiceError } from "./analysisService";
import { extractTravelRecoveryDetails, formatCurrency, isTravelDisruptionRecoveryText } from "../lib/moneyParsers";

export type DraftResult =
  | {
      status: "success";
      draft: AdminDraft;
    }
  | {
      status: "error";
      draft?: never;
      error: ServiceError;
    };

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });

const getEvidenceValue = (adminCase: AdminCase, labelPattern: RegExp) =>
  adminCase.evidence.find((evidence) => labelPattern.test(evidence.label))?.value;

const createMockDraftForCase = (adminCase: AdminCase): AdminDraft => {
  const evidenceText = adminCase.evidence.map((evidence) => `${evidence.label}: ${evidence.value}`).join("\n");
  const travelText = `${adminCase.title}\n${adminCase.summary}\n${adminCase.nextAction}\n${evidenceText}`;
  const isTravelRecoveryCase =
    /possible money recovery found/i.test(adminCase.title) ||
    isTravelDisruptionRecoveryText(travelText);

  if (isTravelRecoveryCase) {
    const travel = extractTravelRecoveryDetails(travelText);
    const amount = travel.recoveryAmount !== undefined ? formatCurrency(travel.recoveryAmount) : "the extra hotel night cost";
    const reference = travel.bookingReference ?? getEvidenceValue(adminCase, /booking reference/i) ?? "not yet confirmed";
    const recipient =
      travel.suggestedRecipient ??
      getEvidenceValue(adminCase, /suggested recipient/i) ??
      travel.airline ??
      "the relevant travel team";

    return {
      id: `draft-${crypto.randomUUID()}`,
      findingId: adminCase.findingId,
      subject: `Reimbursement request for additional hotel night - booking reference ${reference}`,
      body: `Hello,\n\nI am writing about booking reference ${reference}.\n\nFollowing the flight cancellation or schedule change, I incurred an additional hotel night cost. My understanding from the correspondence is that this issue was outside my control, and I am asking you to review reimbursement for the additional hotel night.\n\nAmount requested: ${amount}\n\nEvidence I can provide or have available includes:\n\n- Booking reference: ${reference}\n- loveholidays confirmation that the additional amount was added to the payment schedule\n- Proof of payment, including bank or card statement if required\n- Flight change or cancellation evidence, if needed\n- Any booking confirmation or screenshots available\n\nI understand Air Mauritius asked for bank statement proof if additional costs were incurred. Please confirm the best repayment route for this cost, and let me know if you need any further evidence before you can review it.\n\nPlease treat this as a request for review and confirmation of the evidence needed. I am not asking you to proceed without checking the attached information.\n\nThank you.`,
      recommendedNextStep: `Review the evidence, add any bank/card statement proof, then send to ${recipient}. AdminAvenger does not send anything automatically.`,
      chaseAfterDays: 7,
      createdAt: new Date().toISOString(),
    };
  }

  if (adminCase.broadbandPriceRiseAssessment) {
    const assessment = adminCase.broadbandPriceRiseAssessment;
    const providerPrompt = assessment.providerName
      ? ""
      : "\n\nNote before sending: add the provider name if you know it.";
    const contractDate = assessment.contractDate ?? assessment.contractStartOrRenewalDate;
    const details = [
      `- Current monthly price: ${assessment.oldMonthlyPrice ?? "not yet confirmed"}`,
      `- New monthly price: ${assessment.newMonthlyPrice ?? "not yet confirmed"}`,
      `- Monthly increase: ${assessment.monthlyIncrease ?? "not yet confirmed"}`,
      `- Effective date: ${assessment.effectiveDate ?? "not yet confirmed"}`,
      `- Contract start/renewal date: ${contractDate ?? "not yet confirmed"}`,
      `- Response deadline clue: ${assessment.responseDeadline ?? "not yet confirmed"}`,
    ].join("\n");

    return {
      id: `draft-${crypto.randomUUID()}`,
      findingId: adminCase.findingId,
      subject: "Review of upcoming broadband/mobile price increase",
      body: `Hello,\n\nI have received notice of an upcoming broadband/mobile price increase and would like to understand my options before it takes effect.\n\nThe details I have are:\n\n${details}\n\nPlease confirm:\n\n- The reason for the increase\n- Whether this increase was included in pounds and pence when I signed or renewed my contract\n- My contract start date or most recent renewal date\n- What options are available before the increase takes effect, including switching package, retention offers, or cancellation if applicable\n- Any deadline I need to respond by before the effective date\n- The next steps for any option or right that applies to my account\n- Whether you can offer a better deal, discount, or alternative package\n\nPlease do not treat this as acceptance of the price increase. I am asking for the account-specific options and deadlines so I can decide what to do next.${providerPrompt}\n\nThank you.`,
      recommendedNextStep:
        assessment.providerName
          ? "Check the provider terms and contract start/renewal date before sending, then keep any response for the case file."
          : "Add provider name before sending. Then check the provider terms and contract start/renewal date, and keep any response for the case file.",
      chaseAfterDays: 5,
      createdAt: new Date().toISOString(),
    };
  }

  if (adminCase.delayRepayAssessment) {
    const { extracted, evidenceMissing } = adminCase.delayRepayAssessment;
    const missingLine =
      evidenceMissing.length > 0
        ? `\n\nI am still checking the following details before submitting a formal claim: ${evidenceMissing.join(", ")}.`
        : "";

    return {
      id: `draft-${crypto.randomUUID()}`,
      findingId: adminCase.findingId,
      subject: "Delay Repay claim query",
      body: `Hello,\n\nI am writing about a delayed train journey and would like to check the correct Delay Repay claim process for this case.\n\nJourney: ${extracted.journey ?? "not yet confirmed"}\nTravel date: ${extracted.travelDate ?? "not yet confirmed"}\nDelay duration: ${extracted.delayDuration ?? "not yet confirmed"}\nOperator: ${extracted.operator ?? "not yet confirmed"}\nTicket/reference: ${extracted.ticketReference ?? "not yet confirmed"}${missingLine}\n\nPlease confirm what evidence you need and whether this should be submitted through your current Delay Repay form.\n\nThank you.`,
      recommendedNextStep:
        "Check the operator's current Delay Repay rules and attach valid ticket proof before sending or submitting a claim.",
      chaseAfterDays: 7,
      createdAt: new Date().toISOString(),
    };
  }

  const templates: Record<
    FindingCategory,
    Pick<AdminDraft, "subject" | "body" | "recommendedNextStep" | "chaseAfterDays">
  > = {
    refund: {
      subject: `Refund request: ${adminCase.title}`,
      body:
        "Hello,\n\nI am writing to ask whether I am eligible for a refund or compensation based on the details below. Please confirm the next steps, any evidence you need from me, and the expected timeline for a decision.\n\nThank you.",
      recommendedNextStep: "Send with proof of purchase, booking, or account reference.",
      chaseAfterDays: 7,
    },
    complaint: {
      subject: `Complaint: ${adminCase.title}`,
      body:
        "Hello,\n\nI would like to raise a formal complaint about this issue. Please review the details, explain what happened, and confirm what you can do to put things right.\n\nI look forward to your response.",
      recommendedNextStep: "Include dates, reference numbers, and the outcome you want.",
      chaseAfterDays: 10,
    },
    subscription: {
      subject: "Subscription cancellation request",
      body:
        "Hello,\n\nPlease cancel this subscription and confirm that no further payments will be taken. If there is a cancellation reference, please send it to me for my records.\n\nThank you.",
      recommendedNextStep: "Send before the next renewal date and keep the confirmation.",
      chaseAfterDays: 3,
    },
    deadline: {
      subject: `Deadline query: ${adminCase.title}`,
      body:
        "Hello,\n\nI am checking the deadline and required next steps for this item. Please confirm what I need to do, the final due date, and whether any supporting documents are required.\n\nThank you.",
      recommendedNextStep: "Add the deadline to your calendar after sending.",
      chaseAfterDays: 5,
    },
    job_application: {
      subject: "Follow-up on my application",
      body:
        "Hello,\n\nI hope you are well. I wanted to follow up on my application and ask whether there are any updates on the hiring timeline or next steps.\n\nThank you for your time.",
      recommendedNextStep: "Send as a polite check-in, then wait before chasing again.",
      chaseAfterDays: 7,
    },
    bill_increase: {
      subject: "Request to review upcoming bill increase",
      body:
        "Hello,\n\nI have received notice of an upcoming bill increase. Before the change takes effect, please confirm whether there is a better available tariff, discount, or retention offer for my account.\n\nThank you.",
      recommendedNextStep: "Send before the increase date and compare competitor prices.",
      chaseAfterDays: 5,
    },
    warranty: {
      subject: `Warranty claim request: ${adminCase.title}`,
      body:
        "Hello,\n\nI believe this item may still be covered by warranty. Please confirm how I can open a warranty claim and what evidence you need from me.\n\nThank you.",
      recommendedNextStep: "Attach proof of purchase and photos or notes about the fault.",
      chaseAfterDays: 7,
    },
    important_reply: {
      subject: `Reply needed: ${adminCase.title}`,
      body:
        "Hello,\n\nThank you for your message. I am replying to confirm the next step and ask you to let me know if you need anything else from me.\n\nKind regards.",
      recommendedNextStep: "Personalise the first sentence before sending.",
      chaseAfterDays: 4,
    },
    unknown: {
      subject: `Follow-up: ${adminCase.title}`,
      body:
        "Hello,\n\nI am following up on the item below. Please confirm the current status and any action required from me.\n\nThank you.",
      recommendedNextStep: "Check the original text and make the draft more specific.",
      chaseAfterDays: 7,
    },
  };

  return {
    id: `draft-${crypto.randomUUID()}`,
    findingId: adminCase.findingId,
    createdAt: new Date().toISOString(),
    ...templates[adminCase.category],
  };
};

export const generateDraftWithService = async (
  caseFile: AdminCase,
): Promise<DraftResult> => {
  try {
    await wait(500);

    // Future real AI integration point:
    // Replace this mock draft with a structured AI draft request using case evidence.
    const draft = createMockDraftForCase(caseFile);

    return {
      status: "success",
      draft,
    };
  } catch {
    return {
      status: "error",
      error: {
        message: "AdminAvenger could not generate a draft. Please try again.",
        code: "draft_failed",
      },
    };
  }
};
