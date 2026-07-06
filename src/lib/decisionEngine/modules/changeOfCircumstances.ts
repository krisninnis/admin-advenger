import type { DecisionModuleInput, DecisionResult, DecisionSourceFact } from "../types";
import { BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE } from "../types";

// Change of circumstances engine. Covers the duty to report changes (income,
// household, address, health, work hours) to DWP/council, and the risk of
// overpayment or sanction if a change is not reported in time. This is
// guidance on the reporting duty itself - it never tells the user their
// backdating request will succeed or that a change was recorded correctly.
const changeTypePatterns: Array<{ label: string; pattern: RegExp }> = [
  { label: "income or earnings change", pattern: /(?:income|earnings|wages|pay) (?:has |have )?changed|started work|stopped work|new job|lost my job/i },
  { label: "household change", pattern: /(?:moved in|moved out|partner|separated|split up|new baby|child (?:was born|left home))/i },
  { label: "address change", pattern: /(?:moved house|new address|change of address)/i },
  { label: "health change", pattern: /(?:health has changed|condition has (?:got worse|improved)|new diagnosis)/i },
  { label: "work hours change", pattern: /(?:hours have changed|working more hours|working fewer hours|reduced hours)/i },
];

const backdatePattern = /backdat\w*/i;

export const analyseChangeOfCircumstances = ({ normalisedText }: DecisionModuleInput): DecisionResult => {
  const sourceFacts: DecisionSourceFact[] = [];
  const uncertainty: string[] = [];

  const changesFound = changeTypePatterns.filter((entry) => entry.pattern.test(normalisedText));
  changesFound.forEach((entry) => sourceFacts.push({ label: "Change mentioned", value: entry.label }));

  if (changesFound.length === 0) {
    uncertainty.push("Exactly what has changed is not clear from this text alone.");
  }

  const mentionsBackdate = backdatePattern.test(normalisedText);
  if (mentionsBackdate) {
    uncertainty.push("Whether a backdated change will be accepted depends on rules AdminAvenger cannot check from this text alone.");
  }

  return {
    documentType: "benefits_change_of_circumstances",
    title: "Change of circumstances check",
    plainEnglishSummary:
      "This looks like a message about reporting a change of circumstances for a benefit, such as income, household, address, or health changes.",
    caseStrength: "not_enough_information",
    strengthLabel: "Report the change and keep evidence",
    whatThisLooksLike:
      "Benefits usually require changes to be reported as soon as possible. Not reporting a change on time can lead to an overpayment you may have to repay, or in some cases a penalty.",
    possibleGrounds: [
      "Reporting the change promptly, with evidence and a record of when you reported it, is the strongest protection if anything is questioned later.",
      ...(mentionsBackdate
        ? ["Backdating is sometimes possible but is not guaranteed and depends on the specific rules for the benefit involved."]
        : []),
    ],
    confidence: {
      level: changesFound.length > 0 ? "medium" : "low",
      reason:
        changesFound.length > 0
          ? "The message names a specific type of change that usually needs to be reported."
          : "The message mentions reporting a change, but does not clearly say what changed.",
    },
    uncertainty,
    cannotKnow: [
      "Whether the change has actually been recorded correctly by DWP or the council.",
      "Whether backdating will be accepted for this change.",
      "Whether this change will increase, decrease, or end your benefit.",
    ],
    evidenceNeeded: [
      "What changed and the exact date it changed.",
      "Evidence of the change (payslip, tenancy agreement, hospital letter, birth certificate, etc.).",
      "A copy or screenshot of how and when you reported the change.",
    ],
    deadlines: [
      "Report the change as soon as possible - most benefits ask for changes to be reported within one month, but check the exact rule for your benefit.",
    ],
    risks: [
      "Not reporting a change on time can lead to an overpayment you may have to repay, or in some cases a sanction or penalty.",
      "Waiting to report a change does not usually help - it can make any overpayment larger.",
    ],
    nextSteps: [
      "Report the change as soon as possible through the official journal, phone line, or online service.",
      "Keep evidence of the change and a record of when you reported it.",
      "Ask for confirmation that the change has been recorded.",
    ],
    safetyNotes: [BENEFITS_SAFETY_NOTE, DECISION_SAFETY_NOTE],
    amountTreatment: "no_money_counted",
    sourceFacts,
    questionsToAnswer: [
      "What exactly has changed, and when?",
      "Have you already reported this change?",
      "Do you have evidence of the change and when you reported it?",
    ],
  };
};
