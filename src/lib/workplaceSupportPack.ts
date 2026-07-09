export type WorkplaceSupportDocumentType =
  | "disciplinary_invite"
  | "grievance_outcome"
  | "sickness_absence_meeting"
  | "capability_meeting"
  | "redundancy_consultation"
  | "wage_deduction_or_pay_issue"
  | "contract_or_rota_change"
  | "dismissal_letter"
  | "bullying_or_harassment_record_prep"
  | "workplace_investigation_invite"
  | "settlement_agreement_signpost"
  | "workplace_unknown";

export type BuildWorkplaceSupportPackInput = {
  text: string;
};

export type WorkplaceSupportPack = {
  documentType: WorkplaceSupportDocumentType;
  title: string;
  summary: string;
  keyFactsToCheck: string[];
  evidenceToGather: string[];
  questionsToAsk: string[];
  cannotKnow: string[];
  safeNextSteps: string[];
  draftBoundaryNotes: string[];
  riskWarnings: string[];
  signposting: string[];
  preparationOnlyWarning: string;
};

const preparationOnlyWarning =
  "This is workplace admin preparation only. AdminAvenger has not contacted anyone, has not submitted anything, and does not replace ACAS, a union rep, HR, Citizens Advice, an adviser, or a solicitor.";

const commonSignposting = [
  "Consider asking ACAS, a union rep, HR, Citizens Advice, an adviser, or someone trusted if the issue affects your job, pay, health, safety, or next steps.",
];

const commonDraftBoundaries = [
  "Use this as questions and meeting preparation notes only.",
  "Review and edit anything before sharing it.",
  "Do not use this as tribunal paperwork, resignation wording, a payment demand, or a message accusing anyone of wrongdoing.",
  "AdminAvenger has not sent anything for you.",
];

const commonCannotKnow = [
  "Whether the employer has followed the right process.",
  "Whether every relevant document or fact has been included.",
  "What a manager, HR team, adviser, union rep, ACAS, or tribunal would say.",
  "What action you should take.",
];

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const hasAny = (text: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text));

const unique = (items: string[]) => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const trimmed = item.trim();
    const key = normalise(trimmed);

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(trimmed);
  }

  return output;
};

const datePattern =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4})\b/i;
const moneyPattern = /\b(?:gbp|£)\s?\d+(?:,\d{3})*(?:\.\d{2})?\b/i;
const referencePattern = /\b(?:ref(?:erence)?|case|meeting|payroll|employee)\s*(?:number|no|id|ref)?[:#]?\s*[a-z0-9-]{3,}\b/i;

const extractFirst = (text: string, pattern: RegExp) => text.match(pattern)?.[0];

const buildFoundFactItems = (text: string) => {
  const date = extractFirst(text, datePattern);
  const amount = extractFirst(text, moneyPattern);
  const reference = extractFirst(text, referencePattern);

  return unique([
    date ? `Date mentioned: ${date}. Check this against the original message.` : "Date or meeting time to check against the original message.",
    reference
      ? `Reference or employee detail mentioned: ${reference}. Check this against the original message.`
      : "Reference, employee, payroll, or case number to check if shown.",
    amount
      ? `Amount mentioned for checking: ${amount}. This is display-only and not counted as a saving or recovery.`
      : "",
  ]);
};

const workplaceSignals = {
  settlement: [/settlement agreement/i, /compromise agreement/i, /without prejudice/i, /\bcot3\b/i],
  resignation: [/resignation/i, /constructive dismissal/i, /\bresign\b/i, /\bresigned\b/i, /walking out/i, /quitting/i],
  disciplinary: [/disciplinary/i, /misconduct/i, /gross misconduct/i, /disciplinary meeting/i, /disciplinary hearing/i],
  grievance: [/grievance/i, /grievance outcome/i, /grievance decision/i],
  sickness: [/sickness absence/i, /absence review/i, /fit note/i, /occupational health/i, /return to work/i],
  capability: [/capability/i, /performance improvement/i, /\bpip\b/i, /performance meeting/i, /capability meeting/i],
  redundancy: [/redundancy/i, /at risk/i, /consultation/i, /selection pool/i, /alternative role/i],
  pay: [/wage/i, /salary/i, /payroll/i, /payslip/i, /deduction/i, /unpaid/i, /overtime/i, /holiday pay/i],
  contract: [/contract change/i, /change to your contract/i, /rota/i, /shift pattern/i, /working pattern/i, /hours/i],
  dismissal: [/dismissal/i, /dismissed/i, /termination of employment/i, /employment has ended/i, /notice pay/i],
  bullying: [/bullying/i, /harassment/i, /victimisation/i, /intimidation/i, /workplace incident/i],
  investigation: [/investigation meeting/i, /investigation invite/i, /investigator/i, /witness meeting/i, /investigation process/i],
};

const detectDocumentType = (text: string): WorkplaceSupportDocumentType => {
  if (hasAny(text, workplaceSignals.settlement)) {
    return "settlement_agreement_signpost";
  }

  if (hasAny(text, workplaceSignals.disciplinary)) {
    return "disciplinary_invite";
  }

  if (hasAny(text, workplaceSignals.grievance)) {
    return "grievance_outcome";
  }

  if (hasAny(text, workplaceSignals.redundancy)) {
    return "redundancy_consultation";
  }

  if (hasAny(text, workplaceSignals.dismissal)) {
    return "dismissal_letter";
  }

  if (hasAny(text, workplaceSignals.investigation)) {
    return "workplace_investigation_invite";
  }

  if (hasAny(text, workplaceSignals.bullying)) {
    return "bullying_or_harassment_record_prep";
  }

  if (hasAny(text, workplaceSignals.sickness)) {
    return "sickness_absence_meeting";
  }

  if (hasAny(text, workplaceSignals.capability)) {
    return "capability_meeting";
  }

  if (hasAny(text, workplaceSignals.pay)) {
    return "wage_deduction_or_pay_issue";
  }

  if (hasAny(text, workplaceSignals.contract)) {
    return "contract_or_rota_change";
  }

  return "workplace_unknown";
};

type PackTemplate = {
  title: string;
  summary: string;
  keyFactsToCheck: string[];
  evidenceToGather: string[];
  questionsToAsk: string[];
  cannotKnow: string[];
  safeNextSteps: string[];
  riskWarnings?: string[];
};

const templates: Record<WorkplaceSupportDocumentType, PackTemplate> = {
  disciplinary_invite: {
    title: "Disciplinary meeting preparation",
    summary: "This appears to be about preparing for a disciplinary meeting or hearing.",
    keyFactsToCheck: [
      "Meeting date, time, location, and who will attend.",
      "What issue or allegation the employer says the meeting is about.",
      "Whether the message mentions a companion, representative, or support person.",
      "Which documents or evidence the employer says it will consider.",
    ],
    evidenceToGather: [
      "Original meeting invite.",
      "Relevant policy, contract, handbook, or investigation documents if mentioned.",
      "Emails, messages, rota entries, attendance records, or notes related to what happened.",
      "A short timeline in your own words.",
    ],
    questionsToAsk: [
      "What is the meeting about in plain terms?",
      "What documents will be considered?",
      "Can I bring a companion or representative?",
      "Who should I contact if I need an adjustment, clarification, or cannot attend?",
    ],
    cannotKnow: [
      "Whether the allegation is accurate.",
      "What outcome the employer may choose.",
      "Whether you should attend, ask to postpone, or take another step.",
    ],
    safeNextSteps: [
      "Check the meeting details against the original message.",
      "Gather the documents mentioned and write down questions before replying.",
    ],
  },
  grievance_outcome: {
    title: "Grievance outcome preparation",
    summary: "This appears to be about a grievance outcome or response.",
    keyFactsToCheck: [
      "Outcome date and who made the decision.",
      "What issues the employer says were considered.",
      "Whether a review or appeal route is mentioned.",
      "Any follow-up actions the employer says it will take.",
    ],
    evidenceToGather: [
      "Original grievance.",
      "Outcome letter or email.",
      "Meeting notes, witness names, and documents mentioned.",
      "A timeline of the events you want a human adviser or representative to understand.",
    ],
    questionsToAsk: [
      "What reasons did the employer give?",
      "Is there a review route or date in the letter?",
      "What evidence was considered?",
      "What evidence or examples do I still need to organise?",
    ],
    cannotKnow: [
      "Whether the outcome is complete.",
      "Whether a review route would change anything.",
      "Whether all evidence was considered.",
    ],
    safeNextSteps: [
      "Check any review route and dates against the original letter.",
      "Consider asking ACAS, a union rep, Citizens Advice, or an adviser before replying if the issue is serious or unclear.",
    ],
  },
  sickness_absence_meeting: {
    title: "Sickness absence meeting preparation",
    summary: "This appears to be about preparing for a sickness absence, occupational health, or return-to-work meeting.",
    keyFactsToCheck: [
      "Meeting date, time, and purpose.",
      "Absence period or health-related wording mentioned in the message.",
      "Any occupational health, medical, support, or adjustment wording.",
      "Who to contact with questions before the meeting.",
    ],
    evidenceToGather: [
      "Original invite.",
      "Fit notes or medical documents you are comfortable gathering.",
      "Occupational health reports if already provided.",
      "Return-to-work notes, adjustment messages, or workload/duties notes.",
    ],
    questionsToAsk: [
      "What is the purpose of the meeting?",
      "What information will be discussed?",
      "Can I provide documents or support needs I want considered?",
      "Who can I ask for support before the meeting?",
    ],
    cannotKnow: [
      "Whether any health condition has a particular legal status.",
      "Whether any specific workplace support is required.",
      "Whether the employer's evidence is complete.",
    ],
    safeNextSteps: [
      "Gather meeting details and any documents you are comfortable using.",
      "Consider getting human advice if the issue could affect your job, pay, health, or safety.",
    ],
  },
  capability_meeting: {
    title: "Capability or performance meeting preparation",
    summary: "This appears to be about a capability, performance, or work-standard meeting.",
    keyFactsToCheck: [
      "Meeting date, time, and stated purpose.",
      "Performance or capability concerns described in the message.",
      "Any improvement plan, review period, support, or evidence mentioned.",
      "Who to contact before the meeting.",
    ],
    evidenceToGather: [
      "Original meeting invite.",
      "Performance plan or review documents if supplied.",
      "Examples of work, messages, workload notes, training records, or support requests.",
      "A short timeline of relevant events.",
    ],
    questionsToAsk: [
      "What concerns will be discussed?",
      "What evidence will be used?",
      "What support or training has been offered or requested?",
      "Who can I ask for support before the meeting?",
    ],
    cannotKnow: [
      "Whether the employer's process is complete.",
      "Whether the concerns are accurate.",
      "What the meeting outcome may be.",
    ],
    safeNextSteps: [
      "Check the meeting details and gather documents mentioned in the message.",
      "Prepare calm questions for HR, a union rep, ACAS, Citizens Advice, or an adviser.",
    ],
  },
  redundancy_consultation: {
    title: "Redundancy consultation preparation",
    summary: "This appears to be about redundancy consultation or a role being at risk.",
    keyFactsToCheck: [
      "Consultation date and contact person.",
      "Role, team, or selection pool mentioned.",
      "Selection criteria, alternative roles, notice, or pay figures mentioned.",
      "Any date by which the employer asks for questions or information.",
    ],
    evidenceToGather: [
      "At-risk or consultation letter.",
      "Selection criteria and consultation notes if supplied.",
      "Job description, contract, pay, service length, and alternative role details.",
      "Questions you want to take into consultation.",
    ],
    questionsToAsk: [
      "What role or pool is affected?",
      "What selection criteria are being used?",
      "What alternatives have been considered?",
      "What dates and consultation steps are shown in the letter?",
    ],
    cannotKnow: [
      "Whether redundancy is genuine.",
      "Whether the process is complete.",
      "Whether any payment figure is correct.",
      "Whether you should accept an alternative role.",
    ],
    safeNextSteps: [
      "Check consultation dates and gather the documents mentioned.",
      "Consider asking a union rep, ACAS, Citizens Advice, HR, or an adviser what questions to take into consultation.",
    ],
  },
  wage_deduction_or_pay_issue: {
    title: "Pay issue preparation",
    summary: "This appears to be about pay, payroll, deductions, overtime, holiday pay, or wages.",
    keyFactsToCheck: [
      "Pay period and payroll contact.",
      "Amount mentioned, checked against the payslip or original message.",
      "What the message says the pay issue relates to.",
      "Any reference, payslip, employee, or payroll number shown.",
    ],
    evidenceToGather: [
      "Payslips and bank payment records.",
      "Rota, timesheets, overtime records, or holiday records.",
      "Contract pay rate if available.",
      "Messages approving hours, leave, or changes.",
    ],
    questionsToAsk: [
      "What pay period does this cover?",
      "What amount is shown and what is it said to relate to?",
      "Who can explain the calculation?",
      "What documents can I compare with the payslip?",
    ],
    cannotKnow: [
      "Whether any pay figure is correct.",
      "Whether any deduction or payment has been handled correctly.",
      "Whether a legal claim exists.",
    ],
    safeNextSteps: [
      "Gather payslips, rota or timesheet evidence, and payroll messages.",
      "Ask payroll or HR for a clear breakdown, or ask ACAS, a union rep, Citizens Advice, or an adviser if the issue is serious.",
    ],
  },
  contract_or_rota_change: {
    title: "Contract or rota change preparation",
    summary: "This appears to be about a proposed change to contract terms, hours, rota, shifts, duties, or working pattern.",
    keyFactsToCheck: [
      "What exactly is proposed to change.",
      "Date the change may start.",
      "Any response date or consultation route mentioned.",
      "Person or department to contact with questions.",
    ],
    evidenceToGather: [
      "Current contract or written terms if available.",
      "Proposed change letter or rota message.",
      "Previous rota, pay, or duties records.",
      "Notes on practical impact and questions.",
    ],
    questionsToAsk: [
      "What exactly is changing?",
      "When is the change said to start?",
      "What happens if I have questions or concerns?",
      "Who can explain the proposed change?",
    ],
    cannotKnow: [
      "Whether the change can be made.",
      "Whether you should agree, object, or take another step.",
      "Whether wider employment rights are involved.",
    ],
    safeNextSteps: [
      "Compare the proposed change with your existing contract or rota.",
      "Write down questions before agreeing to anything or replying.",
    ],
  },
  dismissal_letter: {
    title: "Dismissal letter preparation",
    summary: "This appears to be about employment ending or a dismissal decision.",
    keyFactsToCheck: [
      "Date employment is said to end.",
      "Reason stated in the letter.",
      "Any review or appeal route mentioned.",
      "Final pay, notice, or return-of-property details mentioned.",
    ],
    evidenceToGather: [
      "Dismissal letter.",
      "Contract and final pay information.",
      "Prior meeting invites, warnings, or notes.",
      "Emails or messages about the decision.",
    ],
    questionsToAsk: [
      "What reason does the letter give?",
      "Is there a review route and date in the letter?",
      "What final pay or notice information is shown?",
      "Who can I ask for advice before replying?",
    ],
    cannotKnow: [
      "Whether the decision was handled correctly.",
      "Whether a claim exists.",
      "Whether a review, ACAS route, or tribunal would agree with either side.",
      "Whether any payment figure is correct.",
    ],
    safeNextSteps: [
      "Check dates and any review route against the original letter.",
      "Consider asking ACAS, a union rep, Citizens Advice, a solicitor, or an adviser before replying.",
    ],
    riskWarnings: [
      "This may affect work, pay, and future steps. Human advice may be important before replying.",
    ],
  },
  bullying_or_harassment_record_prep: {
    title: "Workplace incident record preparation",
    summary: "This appears to be about preparing a record of workplace incidents, bullying, harassment, or worrying behaviour.",
    keyFactsToCheck: [
      "Dates, times, people involved, and location or channel.",
      "What was said or done, preserving source wording carefully.",
      "Whether witnesses or previous reports are mentioned.",
      "Who already knows, if anyone.",
    ],
    evidenceToGather: [
      "Screenshots, emails, messages, diary notes, or rota/location records.",
      "Names of witnesses or people already told.",
      "A clear timeline of events.",
      "Notes on any safety, health, or retaliation concerns to discuss with a human.",
    ],
    questionsToAsk: [
      "What happened, when, and who was there?",
      "What evidence exists outside memory?",
      "Has it already been reported?",
      "Who can help decide a safe next step?",
    ],
    cannotKnow: [
      "Whether bullying, harassment, discrimination, or retaliation has been proven.",
      "Whether the employer has responsibility for what happened.",
      "Whether reporting could create risk for you.",
    ],
    safeNextSteps: [
      "Write a clear timeline and gather evidence.",
      "If there is risk of retaliation, coercion, discrimination, or harm, consider speaking to a trusted person, union rep, ACAS, Citizens Advice, or an adviser before taking action.",
    ],
  },
  workplace_investigation_invite: {
    title: "Workplace investigation preparation",
    summary: "This appears to be about a workplace investigation meeting or invite.",
    keyFactsToCheck: [
      "Investigation meeting date and contact person.",
      "Your role in the investigation if stated.",
      "Topic or allegation mentioned in the invite.",
      "Documents requested or evidence mentioned.",
    ],
    evidenceToGather: [
      "Investigation invite.",
      "Relevant emails, screenshots, rota entries, or notes.",
      "Timeline of events.",
      "Questions for the investigator, HR, union rep, ACAS, Citizens Advice, or an adviser.",
    ],
    questionsToAsk: [
      "Am I being asked as a witness, complainant, or subject?",
      "What is the meeting about?",
      "What documents should I bring?",
      "Can I bring someone with me?",
    ],
    cannotKnow: [
      "Whether the investigation process is complete.",
      "Whether the employer has all evidence.",
      "What outcome may follow.",
      "What you should say in the meeting.",
    ],
    safeNextSteps: [
      "Check your role in the investigation and gather the documents mentioned.",
      "Consider asking ACAS, a union rep, HR, Citizens Advice, or someone trusted what questions to prepare.",
    ],
  },
  settlement_agreement_signpost: {
    title: "Settlement agreement preparation warning",
    summary: "This appears to mention a settlement agreement, COT3, compromise agreement, or without-prejudice wording.",
    keyFactsToCheck: [
      "Document title and date.",
      "Who sent it and who it asks you to contact.",
      "Any response date shown in the document.",
      "Any adviser, ACAS, solicitor, or representative wording in the document.",
    ],
    evidenceToGather: [
      "The full document.",
      "Any covering email or letter.",
      "Contract, payslips, and recent correspondence if a qualified adviser asks for them.",
      "Questions you want to ask before making any decision.",
    ],
    questionsToAsk: [
      "Who can give qualified advice on this document?",
      "What date does the document ask me to respond by?",
      "What documents should I take to ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser?",
    ],
    cannotKnow: [
      "Whether the document is appropriate for you.",
      "Whether any figure or term should be accepted.",
      "What advice a qualified person would give.",
      "What you should do with the document.",
    ],
    safeNextSteps: [
      "Do not rely on AdminAvenger for a signing decision. Ask ACAS, a union rep, solicitor, Citizens Advice, or another qualified adviser.",
      "Use this pack only to gather questions and documents for a qualified human review.",
    ],
    riskWarnings: [
      "Settlement agreement and COT3 documents can have serious consequences. AdminAvenger cannot advise on the terms.",
    ],
  },
  workplace_unknown: {
    title: "Workplace admin preparation",
    summary: "This appears to be workplace-related, but the exact document type is not clear from the text provided.",
    keyFactsToCheck: [
      "Sender, date, and workplace contact person.",
      "What the message is asking you to do, if anything.",
      "Any meeting, reply date, reference, or document request.",
      "Whether the issue affects work, pay, health, safety, or a workplace relationship.",
    ],
    evidenceToGather: [
      "Full letter, email, or message.",
      "Any related contract, rota, payslip, policy, or previous message.",
      "A short timeline of what happened.",
      "Questions for HR, ACAS, a union rep, Citizens Advice, an adviser, or someone trusted.",
    ],
    questionsToAsk: [
      "What is this message about in plain terms?",
      "Is there a date, meeting, reply request, or reference number?",
      "Who can explain the message safely?",
      "What do I need to check before replying?",
    ],
    cannotKnow: [
      "What exact workplace process this is.",
      "Whether anything needs a formal response.",
      "What a human adviser or representative would suggest after seeing the full context.",
    ],
    safeNextSteps: [
      "Check the sender, date, reference, and requested action against the original message.",
      "Ask ACAS, a union rep, HR, Citizens Advice, an adviser, or someone trusted if the issue is serious or unclear.",
    ],
  },
};

const buildRiskWarnings = (text: string, template: PackTemplate) =>
  unique([
    ...(template.riskWarnings ?? []),
    hasAny(text, workplaceSignals.resignation)
      ? "Resignation decisions can have serious consequences. Ask ACAS, a union rep, Citizens Advice, an adviser, or someone trusted before making decisions about leaving work."
      : "",
    "AdminAvenger cannot decide employment rights, meeting outcomes, or what action you should take.",
  ]);

export const buildWorkplaceSupportPack = ({
  text,
}: BuildWorkplaceSupportPackInput): WorkplaceSupportPack => {
  const documentType = detectDocumentType(text);
  const template = templates[documentType];
  const foundFacts = buildFoundFactItems(text);

  return {
    documentType,
    title: template.title,
    summary: template.summary,
    keyFactsToCheck: unique([...foundFacts, ...template.keyFactsToCheck]),
    evidenceToGather: unique(template.evidenceToGather),
    questionsToAsk: unique(template.questionsToAsk),
    cannotKnow: unique([...template.cannotKnow, ...commonCannotKnow]),
    safeNextSteps: unique(template.safeNextSteps),
    draftBoundaryNotes: unique(commonDraftBoundaries),
    riskWarnings: buildRiskWarnings(text, template),
    signposting: unique(commonSignposting),
    preparationOnlyWarning,
  };
};

export const flattenWorkplaceSupportPackText = (pack: WorkplaceSupportPack): string =>
  [
    pack.documentType,
    pack.title,
    pack.summary,
    ...pack.keyFactsToCheck,
    ...pack.evidenceToGather,
    ...pack.questionsToAsk,
    ...pack.cannotKnow,
    ...pack.safeNextSteps,
    ...pack.draftBoundaryNotes,
    ...pack.riskWarnings,
    ...pack.signposting,
    pack.preparationOnlyWarning,
  ].join("\n");
