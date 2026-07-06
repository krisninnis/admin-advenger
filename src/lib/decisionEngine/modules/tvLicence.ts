import type { DecisionModuleInput, DecisionResult } from "../types";
import { DECISION_SAFETY_NOTE } from "../types";

export const analyseTvLicence = ({
  normalisedText,
}: DecisionModuleInput): DecisionResult => {
  const mentionsIplayer = /bbc iplayer/i.test(normalisedText);
  const mentionsLiveTv = /live tv/i.test(normalisedText);
  const mentionsVisit = /visit|enforcement/i.test(normalisedText);

  const hasClearTvLicenceSignals =
    mentionsIplayer || mentionsLiveTv || mentionsVisit;

  return {
    documentType: "tv_licence",
    title: "TV Licence letter check",
    plainEnglishSummary:
      "This looks like a TV Licence letter. AdminAvenger can help you check what the letter is asking, but it cannot decide for you whether you need a licence.",
    caseStrength: mentionsVisit
      ? "urgent_get_advice"
      : "not_enough_information",
    strengthLabel: mentionsVisit ? "Check carefully" : "Need more information",
    whatThisLooksLike:
      "This appears to relate to TV Licensing, BBC iPlayer, live TV, a declaration, or a visit/check.",
    possibleGrounds: [
      "Whether you need a licence depends on what you watch or record.",
      "The key questions are whether you watch or record live TV, or use BBC iPlayer.",
      "If you believe a no-licence-needed declaration applies, use the official route only if the declaration is accurate.",
    ],
    confidence: {
      level: hasClearTvLicenceSignals ? "medium" : "low",
      reason: hasClearTvLicenceSignals
        ? "The text mentions TV Licensing, BBC iPlayer, live TV, a visit, or enforcement wording, so this appears to be in the TV Licence area."
        : "Only limited TV Licence wording was found, so the letter should be checked carefully before relying on this result.",
    },
    uncertainty: [
      "Whether a TV Licence is needed depends on what is watched, how it is watched, and whether live TV or BBC iPlayer is used at the address.",
      "The letter alone may not show the full history of contact with TV Licensing.",
      "The correct next step may depend on whether the address, name, and reference details are accurate.",
    ],
    cannotKnow: [
      "AdminAvenger cannot decide whether you legally need a TV Licence.",
      "AdminAvenger cannot know from this letter alone whether anyone at the address watches or records live TV or uses BBC iPlayer.",
      "AdminAvenger cannot verify whether any visit or enforcement wording is accurate or current.",
    ],
    evidenceNeeded: [
      "The full TV Licensing letter.",
      "Whether anyone at the address watches or records live TV.",
      "Whether anyone at the address uses BBC iPlayer.",
      "Whether the address, name, and date on the letter are correct.",
    ],
    deadlines: [
      mentionsVisit
        ? "The letter mentions a visit or enforcement wording. Check the date and verify through the official route."
        : "Check whether the letter gives a response date or visit date.",
    ],
    risks: [
      "Do not make a no-licence-needed declaration unless it is true.",
      "Do not rely on this as legal advice.",
      "Use official TV Licensing information before acting.",
    ],
    nextSteps: [
      "Check whether live TV or BBC iPlayer is used at the address.",
      "Use the official TV Licensing website or letter contact route.",
      "Keep a copy of any declaration or response you make.",
    ],
    safetyNotes: [
      DECISION_SAFETY_NOTE,
      "AdminAvenger cannot make a final TV Licence decision for you. Check the official rules before acting.",
    ],
    draftMessage: `Subject: TV Licence letter query

Hello,

I received a TV Licensing letter and would like to check what action is needed.

Address/reference: [add address or reference]
Date of letter: [add date]

Please confirm what information you need from me and how I should respond through the official process.

Kind regards,`,
    amountTreatment: "no_money_counted",
    sourceFacts: [
      ...(mentionsIplayer
        ? [{ label: "BBC iPlayer mentioned", value: "Yes" }]
        : []),
      ...(mentionsLiveTv ? [{ label: "Live TV mentioned", value: "Yes" }] : []),
      ...(mentionsVisit
        ? [{ label: "Visit/enforcement wording mentioned", value: "Yes" }]
        : []),
    ],
  };
};
