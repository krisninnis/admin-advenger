// Community Helper Pack Core v1
//
// Standalone, deterministic, keyword-based data/model/builder layer for
// carers, support workers, occupational therapists, housing officers,
// family members, and other trusted helpers who are preparing a community
// support pack: a structured summary of how an admin problem is affecting
// someone's daily life, written so a human helper (support worker, OT,
// adviser, housing officer, social worker, clinician, or trusted person) can
// understand the situation faster.
//
// This mirrors the existing workplaceSupportPack.ts pattern exactly:
// completely separate from the main decision-engine classifier
// (analyseDecisionProblem), only ever invoked when explicitly called, never
// wired into HomeView/routing, and never auto-detected from a pasted
// message. Community Helper Pack Core v1 is the first implementation layer
// only - see docs/product/community-helper-pack-v1-plan.md and
// docs/product/community-helper-pack-core-v1.md.
//
// Standing principle: AdminAvenger helps prepare. You stay in control.
// This builder produces preparation-only material - drafts and checklists
// for a human to review, edit, and decide on. It never decides safeguarding,
// eligibility, capacity, diagnosis, or entitlement, and it never sends,
// submits, or contacts anyone automatically.

export type CommunityHelperSituationType =
  | "missed_letters_or_deadlines"
  | "difficulty_understanding_letters"
  | "housing_repair_or_access_difficulty"
  | "ot_or_support_visit_preparation"
  | "carer_organising_letters"
  | "support_worker_meeting_notes"
  | "daily_routine_admin_overwhelm"
  | "communication_difficulty"
  | "vulnerability_financial_admin_concern"
  | "urgent_safeguarding_like_signpost"
  | "community_helper_unknown";

export type CommunityHelperRole = "for_myself" | "helping_someone" | "supporting_people_at_work";

export type BuildCommunityHelperPackInput = {
  text: string;
  role?: CommunityHelperRole;
};

export type CommunityHelperPack = {
  situationType: CommunityHelperSituationType;
  title: string;
  summary: string;
  dailyLifeImpact: string[];
  adminBarriers: string[];
  communicationBarriers: string[];
  keyFactsToCheck: string[];
  evidenceToGather: string[];
  questionsToAsk: string[];
  cannotKnow: string[];
  safeNextSteps: string[];
  preparationOnlyNotes: string[];
  consentAndControlNotes: string[];
  riskWarnings: string[];
  signposting: string[];
};

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const hasAny = (text: string, patterns: readonly RegExp[]) => patterns.some((pattern) => pattern.test(text));

const unique = (items: readonly string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const datePattern = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
const referencePattern = /\b(ref(?:erence)?|case|claim|application)\s*(?:number|no\.?|#)?\s*[:#]?\s*[a-z0-9-]{4,}/gi;

// --- Signal keyword groups (cautious, priority-ordered) ---------------------
// These are deliberately narrow, phrase-shaped patterns rather than broad
// single-word matches, following the same discipline as
// workplaceSupportPack.ts's Signals object: fewer false positives matter more
// than catching every possible phrasing, since a wrong situationType only
// changes template wording, never a safety decision.

const Signals = {
  urgentSafeguarding: [
    /immediate danger/i,
    /in danger/i,
    /\bunsafe at home\b/i,
    /self-neglect/i,
    /\bneglect(ed|ing)?\b/i,
    /\babuse(d|s)?\b/i,
    /\bexploitation\b/i,
    /\bcoerc(ed|ion|ing)\b/i,
    /being (controlled|threatened|hurt)/i,
    /can(no|')?t care for (himself|herself|themselves|him|her|them)self/i,
    /unable to care for (himself|herself|themselves)/i,
    /at risk of harm/i,
    /scared (of|for) (him|her|them)/i,
    /worried (he|she|they) (is|are) in danger/i,
  ],
  vulnerabilityFinancialConcern: [
    /financial abuse/i,
    /someone (else )?(is |has been )?(taking|controlling|managing) (his|her|their|my)?\s*money/i,
    /taking (his|her|their) money/i,
    /controlling (his|her|their|the) (money|finances|bank)/i,
    /pressur(?:ed|ing|e)?\s*(?:him|her|them|me)?\s*(?:to|into)\s*(?:give|hand over|share|sign)\s*(?:money|the money|his money|her money|their money)/i,
    /missing (money|payments)/i,
    /bank card (was |has been )?(taken|missing)/i,
    /taken (his|her|their) bank card/i,
    /won'?t let (him|her|them) (see|access) (his|her|their) (money|bank|account)/i,
  ],
  housingRepairOrAccess: [
    /\brepair(s)?\b/i,
    /\bdamp\b/i,
    /\bmould\b/i,
    /broken (boiler|heating|lock|window|door|lift)/i,
    /access (difficulty|difficulties|problem)/i,
    /can'?t (get up|use) the stairs/i,
    /no working lift/i,
    /\blandlord\b/i,
    /housing association/i,
    /\bheating (is |has been )?(broken|not working|off)\b/i,
    /home adaptation/i,
    /wheelchair access/i,
  ],
  otOrSupportVisit: [
    /occupational therapist/i,
    /\bOT (visit|assessment|appointment)/,
    /support worker (visit|appointment)/i,
    /home visit (is |has been )?(scheduled|arranged|coming)/i,
    /assessment visit/i,
    /\bsupport visit\b/i,
    /getting ready for (a|the|an) (OT|assessment|support worker) visit/i,
  ],
  carerOrganisingLetters: [
    /\bI'?m a carer\b/i,
    /\bI am a carer\b/i,
    /\bcarer for (my|his|her|their)/i,
    /helping (my|his|her|their)? ?(mum|dad|mother|father|husband|wife|partner|son|daughter|nan|grandad|grandmother|grandfather|neighbour|client|tenant|resident)/i,
    /organis(e|ing) (his|her|their|my dad'?s|my mum'?s)? ?letters/i,
    /sort(ing)? out (his|her|their) (letters|post|paperwork)/i,
    /caring for (my|him|her|them)/i,
  ],
  supportWorkerMeeting: [
    /support worker meeting/i,
    /case conference/i,
    /review meeting/i,
    /preparing (notes|for a meeting)/i,
    /meeting with (his|her|their|the) support worker/i,
    /notes for (the|a) meeting/i,
  ],
  dailyRoutineOverwhelm: [
    /overwhelm(ed|ing)?/i,
    /can'?t keep up/i,
    /falling behind/i,
    /too much admin/i,
    /can'?t cope with (all )?(the )?(letters|admin|paperwork)/i,
    /everything('?s| is) piling up/i,
    /pile of (unopened )?letters/i,
  ],
  communicationDifficulty: [
    /hard(er)? to understand/i,
    /difficulty (reading|hearing|speaking)/i,
    /hearing (loss|difficulty|impairment)/i,
    /speech difficulty/i,
    /language barrier/i,
    /doesn'?t speak english (well|fluently)/i,
    /anxious about (phone calls|calling)/i,
    /can'?t use the phone/i,
    /reading difficulty/i,
    /\bdyslexi(a|c)\b/i,
    /needs (things|letters) (read out|explained)/i,
  ],
  difficultyUnderstandingLetters: [
    /don'?t understand (the |this )?letter/i,
    /confusing letter/i,
    /what does this letter mean/i,
    /can'?t (understand|work out) (what|the) (this|it) (says|means)/i,
    /\bjargon\b/i,
    /letter (is|was) confusing/i,
  ],
  missedLettersOrDeadlines: [
    /missed (a |the |several )?(letter|letters|appointment|deadline)/i,
    /forgot (about|to reply)/i,
    /opened (the letter )?late/i,
    /didn'?t open (the )?(letter|post) (in time|until)/i,
    /missed (the )?deadline/i,
  ],
} as const;

const helpingSomeoneElseSignals = [
  /\bI'?m a carer\b/i,
  /\bI am a carer\b/i,
  /\bcarer for\b/i,
  /helping (my|his|her|their)? ?(mum|dad|mother|father|husband|wife|partner|son|daughter|nan|grandad|grandmother|grandfather|neighbour|client|tenant|resident)/i,
  /on (his|her|their) behalf/i,
  /the person (I|we) (care for|support|look after)/i,
  /support worker (for|helping)/i,
  /\bmy (mum|dad|mother|father|husband|wife|partner|son|daughter)\b/i,
] as const;

const workContextSignals = [
  /my (client|tenant|resident|service user)/i,
  /as (a|his|her|their) support worker/i,
  /as (a|his|her|their) housing officer/i,
  /as (a|his|her|their) occupational therapist/i,
  /in my (professional|work) role/i,
] as const;

const detectsHelpingSomeoneElse = (text: string) => hasAny(text, helpingSomeoneElseSignals);
const detectsWorkContext = (text: string) => hasAny(text, workContextSignals);

// --- Situation type detection (priority-ordered, safety-critical first) ----

export const detectCommunityHelperSituationType = (rawText: string): CommunityHelperSituationType => {
  const text = normalise(rawText);

  if (hasAny(text, Signals.urgentSafeguarding)) {
    return "urgent_safeguarding_like_signpost";
  }

  if (hasAny(text, Signals.vulnerabilityFinancialConcern)) {
    return "vulnerability_financial_admin_concern";
  }

  if (hasAny(text, Signals.housingRepairOrAccess)) {
    return "housing_repair_or_access_difficulty";
  }

  if (hasAny(text, Signals.otOrSupportVisit)) {
    return "ot_or_support_visit_preparation";
  }

  if (hasAny(text, Signals.carerOrganisingLetters)) {
    return "carer_organising_letters";
  }

  if (hasAny(text, Signals.supportWorkerMeeting)) {
    return "support_worker_meeting_notes";
  }

  if (hasAny(text, Signals.dailyRoutineOverwhelm)) {
    return "daily_routine_admin_overwhelm";
  }

  if (hasAny(text, Signals.communicationDifficulty)) {
    return "communication_difficulty";
  }

  if (hasAny(text, Signals.difficultyUnderstandingLetters)) {
    return "difficulty_understanding_letters";
  }

  if (hasAny(text, Signals.missedLettersOrDeadlines)) {
    return "missed_letters_or_deadlines";
  }

  return "community_helper_unknown";
};

// --- Shared building blocks --------------------------------------------------

const commonCannotKnow = [
  "Whether a diagnosis or health condition applies.",
  "Whether this person is eligible for care, support, or benefits.",
  "Whether specific equipment or a home adaptation would be approved.",
  "Whether a safeguarding referral is needed.",
  "Whether the council, housing provider, or another body is required to act.",
  "Whether a professional assessment would reach the same view.",
  "Whether every detail relevant to this situation has been included here.",
];

const commonPreparationOnlyNotes = [
  "This is preparation only - not an assessment, diagnosis, safeguarding decision, or care/benefits eligibility decision.",
  "AdminAvenger helps prepare. You stay in control.",
  "Nothing here has been sent, submitted, or shared with anyone. You decide what to share, with whom, and when.",
];

const commonSignposting = [
  "Consider sharing this with a support worker, OT, housing officer, adviser, GP or other clinician where relevant, social worker, or another trusted person who can help with the next step.",
];

const urgentSignpostingLine =
  "If someone may be in immediate danger, contact emergency services or the relevant local safeguarding service. AdminAvenger cannot decide safeguarding concerns.";

const buildConsentAndControlNotes = (input: BuildCommunityHelperPackInput, text: string): string[] => {
  const isHelpingSomeoneElse = input.role === "helping_someone" || detectsHelpingSomeoneElse(text);
  const isWorkContext = input.role === "supporting_people_at_work" || detectsWorkContext(text);

  if (isHelpingSomeoneElse) {
    return [
      "Check that the person you are helping is happy for this pack to be prepared, where they are able to say so.",
      "Keep them involved in what is written down and what gets shared, as far as they are able to take part.",
      "Only include the details that are actually needed to explain the situation - avoid adding anything unnecessary or private.",
      "This pack is not a record kept secretly. If they ask what is in it, you can show them.",
      "Check the wording with them, or with someone who knows them well, before sharing it with anyone else.",
    ];
  }

  if (isWorkContext) {
    return [
      "Follow your organisation's own rules on records, consent, and information sharing - this pack does not replace them.",
      "Avoid including sensitive details that are not needed to explain the admin problem.",
      "This is preparation material, not an official case record or a substitute for your organisation's own notes.",
      "Involve the person you are supporting in what is shared, where appropriate and safe to do so.",
    ];
  }

  return ["You control what you save, download, share, or delete. Nothing here is shared automatically."];
};

const extractKeyFacts = (rawText: string): string[] => {
  const dates = unique(Array.from(rawText.matchAll(datePattern)).map((match) => match[0]));
  const references = unique(Array.from(rawText.matchAll(referencePattern)).map((match) => match[0]));

  return [
    ...dates.map((date) => `Date mentioned: ${date} - check this date against the original letter/document.`),
    ...references.map((reference) => `Reference mentioned: ${reference} - check this against the original letter/document.`),
  ];
};

type CommunityHelperPackTemplate = {
  title: string;
  summary: string;
  dailyLifeImpact: string[];
  adminBarriers: string[];
  communicationBarriers: string[];
  keyFactsToCheck: string[];
  evidenceToGather: string[];
  questionsToAsk: string[];
  cannotKnow: string[];
  safeNextSteps: string[];
  riskWarnings: string[];
};

const templates: Record<CommunityHelperSituationType, CommunityHelperPackTemplate> = {
  missed_letters_or_deadlines: {
    title: "Missed letters or deadlines",
    summary:
      "It looks like one or more letters, appointments, or deadlines may have been missed. This pack gathers what is known so a helper can see what happened and what to check next.",
    dailyLifeImpact: [
      "Post or letters may be building up faster than they can be opened and dealt with.",
      "Missed deadlines can create knock-on admin problems (reminders, follow-up letters, or calls) that add to the load.",
    ],
    adminBarriers: [
      "Keeping track of multiple letters, dates, and senders without a system in place.",
      "Difficulty knowing which letters are urgent and which can wait.",
    ],
    communicationBarriers: [],
    keyFactsToCheck: [
      "Which letters have been missed or opened late, and from whom.",
      "Whether any of the missed items had a deadline that may have already passed.",
    ],
    evidenceToGather: [
      "The letters themselves (or photos/copies of them), in date order if possible.",
      "Any reminder letters, texts, or calls that followed.",
    ],
    questionsToAsk: [
      "Which letters are still unopened or unread?",
      "Is there a deadline in any of these letters that may already have passed?",
      "Would a simple system (a folder, a box, or a regular check-in) help going forward?",
    ],
    cannotKnow: [
      "Whether a missed deadline has already caused a formal consequence.",
      "Whether the sender will accept a late response or action.",
    ],
    safeNextSteps: [
      "Sort the letters by date and sender, and check each one for a deadline.",
      "Contact the sender directly to ask about a missed deadline, if that feels appropriate - AdminAvenger does not contact anyone automatically.",
      "Set up a simple ongoing routine (a dedicated folder, a weekly check-in) to reduce the chance of this happening again.",
    ],
    riskWarnings: [],
  },
  difficulty_understanding_letters: {
    title: "Difficulty understanding official letters",
    summary:
      "It looks like an official letter or document is difficult to understand. This pack captures what the letter appears to be about, so a helper can explain it more easily.",
    dailyLifeImpact: [
      "Confusing letters can cause worry even when the underlying issue is minor or routine.",
      "Not understanding a letter can delay a response, even when a response is not urgent.",
    ],
    adminBarriers: [
      "Official or technical wording that is hard to follow without background knowledge.",
      "Uncertainty about who the letter is from, what it is asking for, or what happens next.",
    ],
    communicationBarriers: [
      "The letter's own wording may be the main barrier, rather than anything about the person reading it.",
    ],
    keyFactsToCheck: [
      "Who the letter is from and what it appears to be about.",
      "Whether the letter mentions a date, deadline, or action needed.",
    ],
    evidenceToGather: ["The letter itself (or a photo/copy of it).", "Any earlier letters on the same topic, if kept."],
    questionsToAsk: [
      "What does this letter appear to be asking for or telling us?",
      "Is there a date or deadline mentioned?",
      "Who sent it, and is there a phone number or reference on it?",
    ],
    cannotKnow: [
      "Whether the letter's content is accurate or complete.",
      "Whether a reply is legally required, or what the consequences of not replying would be.",
    ],
    safeNextSteps: [
      "Read the letter through together and note down what it appears to say in plain language.",
      "Check the sender's official contact details (on the letter itself, not a number found elsewhere) if a call is needed.",
      "Get advice from a relevant adviser or support professional if the letter concerns something serious (money, housing, health, or legal matters).",
    ],
    riskWarnings: [],
  },
  housing_repair_or_access_difficulty: {
    title: "Housing repair or access difficulty",
    summary:
      "It looks like there is a housing repair issue or an access/mobility difficulty at home. This pack captures the details so a helper (housing officer, OT, or landlord contact) can see the full picture.",
    dailyLifeImpact: [
      "A repair issue (heating, damp, broken fixtures) can affect comfort, health, and safety at home.",
      "Access difficulties (stairs, doors, lack of a working lift) can make daily routines harder or unsafe.",
    ],
    adminBarriers: [
      "Knowing who is responsible for a repair (landlord, housing association, council).",
      "Chasing a repair that has already been reported once without a clear response.",
    ],
    communicationBarriers: [],
    keyFactsToCheck: [
      "What the repair or access issue is, and how long it has been a problem.",
      "Whether it has already been reported, and to whom.",
    ],
    evidenceToGather: [
      "Photos of the repair issue or access difficulty.",
      "Any previous correspondence with the landlord or housing provider.",
      "Dates of when the issue started and when it was reported, if known.",
    ],
    questionsToAsk: [
      "Has this been reported before, and what happened?",
      "Is there a tenancy agreement or repair policy that sets out response times?",
      "Does this affect anyone's safety or ability to get in and out of the home?",
    ],
    cannotKnow: [
      "Whether the landlord or housing provider is legally required to act by a certain date.",
      "Whether an adaptation would be approved or is the right solution.",
    ],
    safeNextSteps: [
      "Put the repair request in writing (if not already done) with photos and dates, for the person's own records.",
      "Check the tenancy agreement or housing provider's repair policy for expected response times.",
      "Ask a housing officer, OT, or advice service for help with next steps, especially if safety is involved.",
    ],
    riskWarnings: [],
  },
  ot_or_support_visit_preparation: {
    title: "Preparing for an OT or support worker visit",
    summary:
      "It looks like a visit from an occupational therapist, support worker, or similar professional is coming up. This pack gathers information to help the visit go smoothly.",
    dailyLifeImpact: [
      "Preparing in advance can help make the most of a visit that may be short or infrequent.",
      "Having key facts ready can reduce the pressure of remembering everything on the day.",
    ],
    adminBarriers: ["Remembering everything relevant to mention during a single visit."],
    communicationBarriers: [],
    keyFactsToCheck: [
      "The date, time, and purpose of the visit, if known.",
      "Who is visiting (which organisation or role).",
    ],
    evidenceToGather: [
      "Any letters confirming the visit.",
      "A short list of the day-to-day difficulties to mention.",
      "Any previous assessment or visit notes, if kept.",
    ],
    questionsToAsk: [
      "What would be most helpful to raise during this visit?",
      "Are there specific daily tasks that are currently difficult?",
      "Is there anything from a previous visit that is still unresolved?",
    ],
    cannotKnow: [
      "What the visiting professional will conclude or recommend.",
      "Whether any equipment, adaptation, or support will be approved.",
    ],
    safeNextSteps: [
      "Write down a short, clear list of the main day-to-day difficulties to raise during the visit.",
      "Gather any relevant letters or previous notes to have on hand.",
      "Note down any questions to ask the visiting professional.",
    ],
    riskWarnings: [],
  },
  carer_organising_letters: {
    title: "Carer organising someone else's letters",
    summary:
      "It looks like someone is helping organise another person's letters or admin as a carer or family member. This pack helps keep track of what has been found and what still needs checking.",
    dailyLifeImpact: [
      "Keeping on top of someone else's admin, on top of caring responsibilities, can be a significant extra load.",
      "Letters may cover several different topics (benefits, housing, health, finances) at once.",
    ],
    adminBarriers: [
      "Not always having full authority to act on the other person's behalf, even when helping day-to-day.",
      "Keeping track of multiple organisations, reference numbers, and dates for someone else.",
    ],
    communicationBarriers: [],
    keyFactsToCheck: [
      "Which letters have been found and what they appear to relate to.",
      "Whether any letters mention deadlines or required actions.",
    ],
    evidenceToGather: [
      "The letters themselves, sorted by date and topic.",
      "Any existing authority documents (for example a Lasting Power of Attorney or appointee status), if relevant.",
    ],
    questionsToAsk: [
      "Is there an existing authority (such as power of attorney or appointeeship) in place, or does one need to be set up?",
      "Which letters are most urgent?",
      "Would it help to set up a simple filing system going forward?",
    ],
    cannotKnow: [
      "Whether existing authority (for example power of attorney) covers a specific letter or organisation.",
      "Whether the person being helped agrees with every step being taken.",
    ],
    safeNextSteps: [
      "Sort letters by topic and date, noting anything with a deadline.",
      "Check what authority is already in place to act on the other person's behalf, and whether more is needed for a specific organisation.",
      "Keep the person being helped involved in decisions where they are able to take part.",
    ],
    riskWarnings: [],
  },
  support_worker_meeting_notes: {
    title: "Preparing notes for a support worker meeting",
    summary:
      "It looks like notes are being prepared for a meeting with a support worker or similar professional (for example a review meeting or case conference). This pack organises the key points.",
    dailyLifeImpact: ["Meetings can move quickly, so having key facts ready in advance can help make sure nothing important is missed."],
    adminBarriers: ["Remembering and organising relevant facts and dates across multiple issues before a meeting."],
    communicationBarriers: [],
    keyFactsToCheck: ["The date and purpose of the meeting, if known.", "Which topics or issues are expected to come up."],
    evidenceToGather: [
      "Any letters or notes relevant to the topics likely to be discussed.",
      "A short summary of what has changed since the last meeting, if there was one.",
    ],
    questionsToAsk: [
      "What are the main points to raise at this meeting?",
      "Is there anything from a previous meeting that is still outstanding?",
      "What would a good outcome from this meeting look like?",
    ],
    cannotKnow: [
      "What will be decided or agreed at the meeting.",
      "Whether the meeting has the authority to resolve every issue raised.",
    ],
    safeNextSteps: [
      "Write a short, clear list of the main points to raise, in order of importance.",
      "Gather any supporting letters or notes to bring along.",
      "Note down questions in advance so they are not forgotten during the meeting.",
    ],
    riskWarnings: [],
  },
  daily_routine_admin_overwhelm: {
    title: "Daily routine admin overwhelm",
    summary:
      "It looks like the amount of admin (letters, forms, calls, appointments) is currently difficult to keep on top of. This pack breaks things down into smaller, more manageable pieces.",
    dailyLifeImpact: [
      "Feeling behind on admin can affect wellbeing and make it harder to prioritise what matters most.",
      "When everything feels urgent, it can be difficult to know where to start.",
    ],
    adminBarriers: ["Too many separate items (letters, tasks, deadlines) to track at once without a system."],
    communicationBarriers: [],
    keyFactsToCheck: ["Which items are genuinely time-sensitive versus which can wait.", "Whether any deadlines have already passed."],
    evidenceToGather: ["A simple list of everything outstanding, gathered in one place.", "Any letters with visible dates or deadlines."],
    questionsToAsk: [
      "Which one or two things feel most urgent right now?",
      "Is there anyone (a friend, family member, or support worker) who could help split up these tasks?",
      "Would a simple weekly routine help going forward?",
    ],
    cannotKnow: ["Which tasks are genuinely most urgent without checking each letter individually."],
    safeNextSteps: [
      "List everything outstanding in one place, then sort by date if a date is known.",
      "Pick one or two items to deal with first, rather than trying to do everything at once.",
      "Ask a trusted person or support worker for help splitting up the remaining tasks.",
    ],
    riskWarnings: [],
  },
  communication_difficulty: {
    title: "Communication difficulty",
    summary:
      "It looks like there is a communication difficulty (reading, hearing, speech, language, or phone-related) affecting how admin gets dealt with. This pack notes what would help.",
    dailyLifeImpact: ["Communication difficulties can make ordinary admin tasks - reading a letter, making a call - take much longer or feel much harder."],
    adminBarriers: ["Standard letters, forms, and phone processes are not always designed with this difficulty in mind."],
    communicationBarriers: [
      "This may include difficulty reading, hearing, speaking, using the phone, or communicating in English.",
    ],
    keyFactsToCheck: ["What kind of communication difficulty is affecting this situation.", "Whether the organisation involved offers alternative formats or contact methods."],
    evidenceToGather: ["Any letters or forms that are hard to use in their current format.", "Details of any accessible-format or interpreter services the relevant organisation offers, if known."],
    questionsToAsk: [
      "Does the organisation involved offer large print, easy read, braille, or an interpreter service?",
      "Would a different contact method (letter, email, in-person) work better than the phone, or vice versa?",
      "Is there a trusted person who can help with this specific communication difficulty?",
    ],
    cannotKnow: ["Whether a specific organisation will provide a particular accessible format or adjustment without asking them directly."],
    safeNextSteps: [
      "Ask the relevant organisation directly what accessible formats or contact methods they offer.",
      "Note down a preferred contact method for future letters, if one exists.",
      "Involve a trusted person or interpreter where that would help.",
    ],
    riskWarnings: [],
  },
  vulnerability_financial_admin_concern: {
    title: "Possible financial admin concern",
    summary:
      "It looks like there may be a concern about someone else's involvement with this person's money or admin. This pack gathers the facts as known, without assuming what has happened.",
    dailyLifeImpact: ["Uncertainty about money or admin being handled by someone else can cause worry and make it harder to plan."],
    adminBarriers: ["Limited visibility into what has actually happened with letters, payments, or accounts."],
    communicationBarriers: [],
    keyFactsToCheck: [
      "What has actually been observed (missing letters, missing money, restricted access) versus what is suspected.",
      "Who else has access to or involvement in this person's money or admin.",
    ],
    evidenceToGather: [
      "Bank statements or account summaries, if accessible and appropriate to gather.",
      "Any letters, messages, or notes relating to the concern.",
      "Dates of anything noticed as unusual.",
    ],
    questionsToAsk: [
      "What exactly has been noticed, and when?",
      "Is there someone independent (a bank, an adviser, a social worker) who could look at this?",
      "Does the person affected know about this concern, and how do they feel about it?",
    ],
    cannotKnow: [
      "Whether financial abuse or wrongdoing has actually occurred.",
      "Whether any money has been taken, moved, or is missing.",
      "What a bank, adviser, or investigating body would conclude.",
    ],
    safeNextSteps: [
      "Write down exactly what has been noticed and when, without assuming a cause.",
      "Speak to a trusted, independent adviser, the person's bank, or a social worker about the concern.",
      "Keep the person affected involved as far as they are able to be, and respect their wishes where possible.",
    ],
    riskWarnings: [
      "If there is any concern that someone may be in danger, contact emergency services or the relevant local safeguarding service rather than relying on this pack alone.",
    ],
  },
  urgent_safeguarding_like_signpost: {
    title: "Urgent concern - please seek help directly",
    summary:
      "This input contains wording that may describe someone being in danger, at risk of harm, abuse, neglect, or someone taking advantage of them. AdminAvenger cannot assess or decide safeguarding concerns.",
    dailyLifeImpact: [],
    adminBarriers: [],
    communicationBarriers: [],
    keyFactsToCheck: [],
    evidenceToGather: [],
    questionsToAsk: [],
    cannotKnow: [
      "Whether the situation described amounts to a safeguarding concern.",
      "Whether someone is currently in danger.",
      "What action any authority, service, or professional will take.",
    ],
    safeNextSteps: [
      "If someone may be in immediate danger, contact emergency services now.",
      "Contact the relevant local safeguarding service, GP, or a trusted professional to discuss this directly.",
      "This pack does not replace an urgent conversation with the right service.",
    ],
    riskWarnings: [urgentSignpostingLine],
  },
  community_helper_unknown: {
    title: "Community helper pack - more detail needed",
    summary:
      "It is not yet clear which kind of situation this is. This pack gathers what is known and lists the questions that would help clarify the situation, without assuming a category.",
    dailyLifeImpact: [],
    adminBarriers: [],
    communicationBarriers: [],
    keyFactsToCheck: [],
    evidenceToGather: ["Any letters, documents, or notes relevant to the situation."],
    questionsToAsk: [
      "What has actually happened, in a few plain sentences?",
      "What feels hardest to deal with right now?",
      "Are there any dates, deadlines, or reference numbers involved?",
      "Who else, if anyone, can help with the next step?",
    ],
    cannotKnow: ["What kind of situation this is, without more detail."],
    safeNextSteps: [
      "Write down what has happened in a few plain sentences.",
      "Gather any relevant letters or documents.",
      "Share this with a trusted person or support worker who can help work out the next step.",
    ],
    riskWarnings: [],
  },
};

// --- Main builder -------------------------------------------------------------

export const buildCommunityHelperPack = (input: BuildCommunityHelperPackInput): CommunityHelperPack => {
  const rawText = input.text ?? "";
  const situationType = detectCommunityHelperSituationType(rawText);
  const template = templates[situationType];
  const extractedFacts = extractKeyFacts(rawText);
  const consentAndControlNotes = buildConsentAndControlNotes(input, normalise(rawText));

  const isUrgent = situationType === "urgent_safeguarding_like_signpost";
  const isFinancialConcern = situationType === "vulnerability_financial_admin_concern";

  const signposting = unique([
    ...(isUrgent ? [urgentSignpostingLine] : []),
    ...commonSignposting,
    ...(isFinancialConcern ? ["Consider speaking to the person's bank, an independent financial adviser, or a social worker about this concern."] : []),
  ]);

  return {
    situationType,
    title: template.title,
    summary: template.summary,
    dailyLifeImpact: unique(template.dailyLifeImpact),
    adminBarriers: unique(template.adminBarriers),
    communicationBarriers: unique(template.communicationBarriers),
    keyFactsToCheck: unique([...template.keyFactsToCheck, ...extractedFacts]),
    evidenceToGather: unique(template.evidenceToGather),
    questionsToAsk: unique(template.questionsToAsk),
    cannotKnow: unique([...template.cannotKnow, ...commonCannotKnow]),
    safeNextSteps: unique(template.safeNextSteps),
    preparationOnlyNotes: unique(commonPreparationOnlyNotes),
    consentAndControlNotes: unique(consentAndControlNotes),
    riskWarnings: unique(template.riskWarnings),
    signposting,
  };
};

// --- Safety scanning helper ---------------------------------------------------
// Mirrors workplaceSupportPack.ts's flatten helper: joins every user-facing
// field into a single string so safetyWording.ts's findForbiddenSafetyPhrases
// can scan the whole generated pack for forbidden wording in one pass.

export const flattenCommunityHelperPackText = (pack: CommunityHelperPack): string =>
  [
    pack.title,
    pack.summary,
    ...pack.dailyLifeImpact,
    ...pack.adminBarriers,
    ...pack.communicationBarriers,
    ...pack.keyFactsToCheck,
    ...pack.evidenceToGather,
    ...pack.questionsToAsk,
    ...pack.cannotKnow,
    ...pack.safeNextSteps,
    ...pack.preparationOnlyNotes,
    ...pack.consentAndControlNotes,
    ...pack.riskWarnings,
    ...pack.signposting,
  ]
    .filter((item): item is string => Boolean(item && item.trim()))
    .join("\n");

// Kept available for callers that already have a date-extraction utility
// available (mirrors workplaceSupportPack.ts's exported helpers) - not
// currently used outside this module but useful for future integration work
// (e.g. a future community-helper-resultviewmodel-v1 branch).
export const extractCommunityHelperDates = (text: string) =>
  unique(Array.from(text.matchAll(datePattern)).map((match) => match[0]));

export const extractCommunityHelperReferences = (text: string) =>
  unique(Array.from(text.matchAll(referencePattern)).map((match) => match[0]));
