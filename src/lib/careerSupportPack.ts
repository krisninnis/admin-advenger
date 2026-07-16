export type CareerSupportDocumentType =
  | "cv"
  | "cv_job_advert_match"
  | "cover_letter"
  | "job_advert"
  | "application_answer"
  | "career_unknown";

export type CareerSupportConfidence = {
  level: "low" | "medium" | "high";
  reason: string;
};

export type CareerRequirementEvidenceMapItem = {
  requirement: string;
  possibleEvidence: string[];
  exampleToPrepare: string;
  verificationNote: string;
};

export type CareerSupportPack = {
  documentType: CareerSupportDocumentType;
  matchMode?: "cv_job_advert_match";
  summary: string;
  likelyTargetRoles: string[];
  roleClues?: string[];
  requirementsFound?: string[];
  cvEvidenceThatMayMatch?: string[];
  strongEvidenceToConsider?: string[];
  advertWordingToReview?: string[];
  examplesToPrepare?: string[];
  claimsToVerify?: string[];
  requirementEvidenceMap?: CareerRequirementEvidenceMapItem[];
  strengthsToHighlight: string[];
  evidenceToUse: string[];
  projectsToHighlight: string[];
  experienceToFrame: string[];
  educationAndTraining: string[];
  possibleGapsToCheck: string[];
  saferRewriteSuggestions: string[];
  nextPreparationSteps: string[];
  safetyNotes: string[];
  confidence: CareerSupportConfidence;
};

const unique = (items: string[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const normaliseText = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const getLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const hasAny = (text: string, signals: string[]) =>
  signals.some((signal) => text.includes(signal));

const cvSectionMarkerPattern =
  /^(cv|curriculum vitae|resume|professional profile|key skills|technical skills|projects|projects\s*\/\s*portfolio|professional experience|work experience|education\s*(?:&|and)\s*training)\b/i;

const advertSectionMarkerPattern =
  /^(job advert|job description|about the role|responsibilities|requirements|essential skills|desirable skills|required skills|how to apply|salary|location)\b/i;

const splitCareerMatchText = (text: string) => {
  const rawLines = text.split(/\r?\n/);
  const cvIndex = rawLines.findIndex((line) => cvSectionMarkerPattern.test(line.trim()));
  const advertIndex = rawLines.findIndex((line) => advertSectionMarkerPattern.test(line.trim()));

  if (cvIndex === -1 || advertIndex === -1 || cvIndex === advertIndex) {
    return {
      cvText: text,
      advertText: text,
    };
  }

  if (cvIndex < advertIndex) {
    return {
      cvText: rawLines.slice(cvIndex, advertIndex).join("\n"),
      advertText: rawLines.slice(advertIndex).join("\n"),
    };
  }

  return {
    cvText: rawLines.slice(cvIndex).join("\n"),
    advertText: rawLines.slice(advertIndex, cvIndex).join("\n"),
  };
};

const directCvSignals = [
  "github portfolio",
  "curriculum vitae",
  "resume",
  "professional profile",
  "references available upon request",
];

const cvStructureSignals = [
  "key skills",
  "technical skills",
  "professional experience",
  "work experience",
  "volunteer experience",
  "employment history",
  "education and training",
  "education & training",
  "portfolio",
  "github",
  "projects",
];

const coverLetterSignals = [
  "cover letter",
  "dear hiring manager",
  "dear recruitment team",
  "i am applying for",
  "please find attached my cv",
];

const jobAdvertSignals = [
  "job advert",
  "job description",
  "about the role",
  "responsibilities",
  "requirements",
  "essential skills",
  "essential criteria",
  "desirable criteria",
  "required skills",
  "desirable skills",
  "salary",
  "location",
  "closing date",
  "company is looking for",
  "we are hiring",
  "apply now",
];

const applicationAnswerSignals = [
  "application answer",
  "supporting statement",
  "personal statement",
  "selection criteria",
  "why are you interested",
  "tell us about a time",
];

const roleSignals = [
  "front end developer",
  "frontend developer",
  "front-end developer",
  "software developer",
  "web developer",
  "data analyst",
  "project manager",
  "administrator",
  "customer support",
  "support worker",
  "teaching assistant",
  "care assistant",
  "marketing assistant",
  "operations assistant",
];

const skillSignals = [
  "react",
  "typescript",
  "javascript",
  "html",
  "css",
  "tailwind",
  "node",
  "github",
  "data",
  "excel",
  "customer service",
  "stakeholder",
  "accessibility",
  "case notes",
  "scheduling",
  "record keeping",
  "organisation",
  "organization",
  "problem solving",
  "troubleshooting",
  "communication",
];

const evidenceVerbs = [
  "built",
  "created",
  "managed",
  "supported",
  "improved",
  "reduced",
  "organised",
  "trained",
  "volunteered",
  "delivered",
  "maintained",
];

const confidenceFromSignals = (
  documentType: CareerSupportDocumentType,
  signalCount: number,
): CareerSupportConfidence => {
  if (documentType === "career_unknown") {
    return {
      level: "low",
      reason: "Career or job-search structure was not clear enough from the text.",
    };
  }

  if (signalCount >= 4) {
    return {
      level: "high",
      reason: "Several career-document signals were found, such as CV sections, skills, experience, projects, or job-advert wording.",
    };
  }

  return {
    level: "medium",
    reason: "Some career-document signals were found, but the user should still review the text before using it.",
  };
};

export const detectCareerSupportDocumentType = (
  text: string,
): CareerSupportDocumentType => {
  const normalised = normaliseText(text);

  if (!normalised) {
    return "career_unknown";
  }

  const cvStructureCount = cvStructureSignals.filter((signal) => normalised.includes(signal)).length;
  const hasDirectCvSignal = hasAny(normalised, directCvSignals) || /\bcv\b/i.test(text);
  const hasCvSignal = hasDirectCvSignal || cvStructureCount >= 3;
  const jobAdvertSignalCount = jobAdvertSignals.filter((signal) => normalised.includes(signal)).length;
  const hasJobAdvertContext =
    jobAdvertSignalCount >= 2 &&
    hasAny(normalised, [
      "job advert",
      "job description",
      "about the role",
      "we are looking",
      "company is looking for",
      "we are hiring",
      "apply now",
      "salary",
      "location",
    ]);

  if (hasCvSignal && hasJobAdvertContext) {
    return "cv_job_advert_match";
  }

  if (hasCvSignal) {
    return "cv";
  }

  if (hasAny(normalised, coverLetterSignals)) {
    return "cover_letter";
  }

  if (
    jobAdvertSignalCount >= 2 &&
    hasAny(normalised, ["role", "apply", "candidate", "company", "we are", "hiring"])
  ) {
    return "job_advert";
  }

  if (hasAny(normalised, applicationAnswerSignals)) {
    return "application_answer";
  }

  return "career_unknown";
};

export const isCareerSupportDocument = (text: string) =>
  detectCareerSupportDocumentType(text) !== "career_unknown";

const extractMatchingSignals = (normalised: string, signals: string[]) =>
  unique(signals.filter((signal) => normalised.includes(signal)));

const sectionHeadingSignals = [
  "contact",
  "professional profile",
  "profile",
  "personal statement",
  "key skills",
  "technical skills",
  "other technical skills",
  "projects",
  "projects / portfolio",
  "development tools / portfolio",
  "portfolio",
  "github projects",
  "professional experience",
  "work experience",
  "volunteer experience",
  "employment history",
  "education",
  "education & training",
  "education and training",
  "training",
  "references",
  "cv",
  "curriculum vitae",
  "resume",
  "job advert",
  "job description",
  "about the role",
  "responsibilities",
  "requirements",
  "essential skills",
  "desirable skills",
  "required skills",
  "salary",
  "location",
];

const isLikelySectionHeading = (line: string) => {
  const normalisedLine = normaliseText(line).replace(/:$/, "");

  return (
    line.length <= 45 &&
    sectionHeadingSignals.some((signal) => normalisedLine === signal)
  );
};

const isContactDetail = (line: string) =>
  /@/.test(line) ||
  /\b(?:\+?\d[\d\s().-]{7,}\d)\b/.test(line) ||
  /\b(?:tel|phone|mobile|email|address)\b/i.test(line);

const isProfileLine = (line: string) =>
  /professional profile|personal profile|profile|seeking an?|looking for|career objective/i.test(line);

const isBroadSkillsLine = (line: string) => {
  const normalisedLine = normaliseText(line);
  const hasTrainingSignal =
    /training|course|module|bsc|university|nvq|certificate|certification|gdpr|excel skills|degree|gcse|a level/.test(
      normalisedLine,
    );

  return (
    /^(other\s+)?technical skills\b|^key skills\b|^skills\b/.test(normalisedLine) ||
    (!hasTrainingSignal &&
      normalisedLine.includes(",") &&
      /\b(react|typescript|javascript|html|css|tailwind|node|github)\b/.test(normalisedLine) &&
      !hasAny(normalisedLine, ["memephant", "adminavenger", "portfolio", "project", "app", "built", "created"]))
  );
};

const isNoisyProjectLine = (line: string) => {
  const normalisedLine = normaliseText(line).replace(/:$/, "");

  return (
    /^development tools\s*\/\s*portfolio\b/.test(normalisedLine) ||
    /^key areas worked on include\b/.test(normalisedLine)
  );
};

const isGenericAwarenessLine = (line: string) => {
  const normalisedLine = normaliseText(line);

  return (
    /\bawareness\b/.test(normalisedLine) &&
    !/\b(course|training|module|certificate|certification|qualification|essentials course)\b/.test(normalisedLine)
  );
};

const isUsableCvDetail = (line: string) =>
  !isLikelySectionHeading(line) &&
  !isContactDetail(line) &&
  !isProfileLine(line) &&
  !isBroadSkillsLine(line);

const isUsableProjectDetail = (line: string) =>
  isUsableCvDetail(line) && !isNoisyProjectLine(line);

const isUsableEducationDetail = (line: string) =>
  isUsableCvDetail(line) && !isGenericAwarenessLine(line);

const isUsableRequirementDetail = (line: string) =>
  !isLikelySectionHeading(line) && !isContactDetail(line) && !isProfileLine(line);

const isUsableEvidenceMapLine = (line: string) =>
  !isLikelySectionHeading(line) && !isContactDetail(line) && !isProfileLine(line);

const buildStrengthLabels = (normalised: string, skills: string[]) => {
  const labels: string[] = [];

  if (hasAny(normalised, ["react", "typescript"])) {
    labels.push("React and TypeScript project work");
  }

  if (hasAny(normalised, ["html", "css", "javascript", "tailwind", "node"])) {
    labels.push("Web development fundamentals");
  }

  if (hasAny(normalised, ["excel", "data"])) {
    labels.push("Excel and data handling");
  }

  if (hasAny(normalised, ["record keeping", "case notes", "scheduling", "organisation", "organization", "admin"])) {
    labels.push("Record keeping and organisation");
  }

  if (hasAny(normalised, ["problem solving", "troubleshooting", "built", "created", "maintained", "technical"])) {
    labels.push("Technical/practical problem solving");
  }

  if (hasAny(normalised, ["github", "portfolio"])) {
    labels.push("GitHub portfolio evidence");
  }

  if (labels.length > 0) {
    return unique(labels);
  }

  if (skills.length > 0) {
    return ["Relevant skills to evidence with truthful examples"];
  }

  return ["Identify 3 to 5 strengths that match the target role and can be backed up with examples."];
};

const collectSectionLines = (
  lines: string[],
  headingSignals: string[],
  contentSignals: string[],
  fallback: string,
  isUsableLine = isUsableCvDetail,
) => {
  const matches: string[] = [];

  lines.forEach((line, index) => {
    const normalisedLine = normaliseText(line);
    const isSectionStart = headingSignals.some((signal) => normalisedLine.includes(signal));
    const isDirectContent = contentSignals.some((signal) => normalisedLine.includes(signal));

    if (isSectionStart) {
      for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
        const nextLine = lines[nextIndex];

        if (isLikelySectionHeading(nextLine)) {
          break;
        }

        if (isUsableLine(nextLine)) {
          matches.push(nextLine);
        }
      }
    }

    if (isDirectContent && isUsableLine(line)) {
      matches.push(line);
    }
  });

  return unique(matches.length > 0 ? matches.slice(0, 5) : [fallback]);
};

const extractLinesMatching = (lines: string[], signals: string[], fallback: string) => {
  const matches: string[] = [];

  lines.forEach((line, index) => {
    const normalisedLine = normaliseText(line);
    const isMatch = signals.some((signal) => normalisedLine.includes(signal));

    if (!isMatch) {
      return;
    }

    matches.push(line);

    if (line.length <= 40 && lines[index + 1]) {
      matches.push(lines[index + 1]);
    }
  });

  return unique(matches.length > 0 ? matches.slice(0, 5) : [fallback]);
};

const weakAdvertHeadingPattern =
  /^(job advert|job description|about the role|responsibilities|requirements|essential skills|desirable skills|required skills|how to apply|salary|location)$/i;

const looksLikeRoleTitle = (line: string) => {
  const trimmed = line.trim();

  return (
    trimmed.length >= 5 &&
    trimmed.length <= 90 &&
    !weakAdvertHeadingPattern.test(trimmed) &&
    !/[.!?]$/.test(trimmed) &&
    /(?:developer|assistant|analyst|specialist|manager|administrator|engineer|support|designer|coordinator|officer|consultant)/i.test(
      trimmed,
    )
  );
};

const extractRoleClues = (lines: string[], normalised: string) => {
  const titleFromLabel = lines
    .map((line) => line.replace(/^(job advert|job title|role|position)\s*:\s*/i, "").trim())
    .filter(looksLikeRoleTitle);
  const firstAdvertHeading = lines.findIndex((line) => /^job advert\b/i.test(line.trim()));
  const titleNearAdvert =
    firstAdvertHeading >= 0
      ? lines.slice(firstAdvertHeading + 1, firstAdvertHeading + 4).filter(looksLikeRoleTitle)
      : [];

  return unique([
    ...titleFromLabel,
    ...titleNearAdvert,
    ...extractMatchingSignals(normalised, roleSignals),
  ]).slice(0, 5);
};

const requirementSignals = [
  "react",
  "typescript",
  "javascript",
  "accessibility",
  "customer-facing",
  "customer facing",
  "portfolio",
  "github",
  "build user interfaces",
  "maintain components",
  "work with designers",
  "responsibilities",
  "requirements",
  "essential",
  "desirable",
];

type CareerMatchCategory =
  | "records_admin_data"
  | "excel_spreadsheets"
  | "it_software_support"
  | "web_development"
  | "communication"
  | "gdpr_privacy"
  | "organisation"
  | "problem_solving"
  | "learning_new_systems"
  | "projects_portfolio"
  | "education_computing";

const categorySignals: Record<CareerMatchCategory, string[]> = {
  records_admin_data: ["record", "records", "admin", "data", "spreadsheet", "spreadsheets", "crm"],
  excel_spreadsheets: ["excel", "spreadsheet", "spreadsheets", "formula", "formulas", "pivot"],
  it_software_support: ["software", "systems", "support", "technical", "helpdesk", "information technology"],
  web_development: ["web", "website", "html", "css", "javascript", "typescript", "react", "python", "development"],
  communication: ["communication", "customer", "support requests", "respond", "escalation", "stakeholder"],
  gdpr_privacy: ["gdpr", "privacy", "sensitive data", "confidential", "data protection"],
  organisation: ["organised", "organized", "organisation", "organization", "scheduling", "appointments", "medication"],
  problem_solving: ["problem", "troubleshooting", "solving", "debug", "fixed", "resolved"],
  learning_new_systems: ["learn", "learning", "new systems", "training", "course", "bootcamp", "module"],
  projects_portfolio: ["project", "portfolio", "github", "memephant", "adminavenger"],
  education_computing: ["bsc", "computing", "open university", "university", "maths", "mathematics", "it study"],
};

const categoryExamples: Record<CareerMatchCategory, string> = {
  records_admin_data: "Prepare one short example explaining how records, spreadsheets, or admin data were kept accurately.",
  excel_spreadsheets: "Prepare one short example explaining how you used Excel, spreadsheets, formulas, or data checks.",
  it_software_support: "Prepare a short example of supporting software, systems, users, or technical tasks.",
  web_development: "Prepare a short explanation of one project and what you personally worked on.",
  communication: "Prepare an example of clear communication, responding to a request, or explaining information.",
  gdpr_privacy: "Prepare an example only if you can accurately explain privacy, GDPR, or sensitive-data handling experience.",
  organisation: "Prepare an example of organising tasks, appointments, information, or independent work.",
  problem_solving: "Prepare one short example of a practical problem you investigated or solved.",
  learning_new_systems: "Prepare an example of learning a new system, course topic, or workflow.",
  projects_portfolio: "Prepare one project example and explain your own contribution clearly.",
  education_computing: "Prepare a short explanation of relevant study, modules, or training and how it connects to the advert.",
};

const categoryPriority: CareerMatchCategory[] = [
  "gdpr_privacy",
  "web_development",
  "it_software_support",
  "education_computing",
  "excel_spreadsheets",
  "records_admin_data",
  "projects_portfolio",
  "communication",
  "organisation",
  "problem_solving",
  "learning_new_systems",
];

const categoriesForRequirement = (requirement: string): CareerMatchCategory[] => {
  const normalisedRequirement = normaliseText(requirement);
  const categories = (Object.keys(categorySignals) as CareerMatchCategory[]).filter((category) =>
    categorySignals[category].some((signal) => normalisedRequirement.includes(signal)),
  );
  const addRelatedCategory = (category: CareerMatchCategory) => {
    if (!categories.includes(category)) {
      categories.push(category);
    }
  };

  if (
    /\bit\b/.test(normalisedRequirement) ||
    hasAny(normalisedRequirement, ["software", "technical", "technology", "technologies"])
  ) {
    addRelatedCategory("education_computing");
    addRelatedCategory("projects_portfolio");
  }

  if (hasAny(normalisedRequirement, ["web", "development", "developer", "portfolio", "github"])) {
    addRelatedCategory("projects_portfolio");
  }

  return categories.length > 0
    ? categories.sort((a, b) => categoryPriority.indexOf(a) - categoryPriority.indexOf(b))
    : ["learning_new_systems"];
};

const collectCvEvidenceForCategory = (
  cvLines: string[],
  cvNormalised: string,
  category: CareerMatchCategory,
) => {
  const signals = categorySignals[category];
  const matches = cvLines.filter((line) => {
    const normalisedLine = normaliseText(line);

    return (
      isUsableEvidenceMapLine(line) &&
      signals.some((signal) => normalisedLine.includes(signal))
    );
  });

  if (category === "web_development") {
    if (hasAny(cvNormalised, ["html", "css", "javascript", "python"])) {
      matches.push("HTML, CSS, JavaScript, or Python skills mentioned in the CV.");
    }

    if (hasAny(cvNormalised, ["react", "typescript"])) {
      matches.push("React and TypeScript project work mentioned in the CV.");
    }
  }

  if (category === "projects_portfolio" && hasAny(cvNormalised, ["github"])) {
    matches.push("GitHub or portfolio evidence mentioned in the CV.");
  }

  return unique(matches).slice(0, 4);
};

const buildRequirementEvidenceMap = ({
  requirements,
  cvLines,
  cvNormalised,
}: {
  requirements: string[];
  cvLines: string[];
  cvNormalised: string;
}): CareerRequirementEvidenceMapItem[] =>
  requirements.slice(0, 6).map((requirement) => {
    const categories = categoriesForRequirement(requirement);
    const possibleEvidence = unique(
      categories.flatMap((category) =>
        collectCvEvidenceForCategory(cvLines, cvNormalised, category),
      ),
    ).slice(0, 7);
    const primaryCategory = categories[0];

    return {
      requirement,
      possibleEvidence:
        possibleEvidence.length > 0
          ? possibleEvidence
          : ["No clear CV evidence found for this requirement yet."],
      exampleToPrepare: categoryExamples[primaryCategory],
      verificationNote: "Check before using: only include this if it accurately reflects your CV and experience.",
    };
  });

const buildMatchFields = ({
  advertLines,
  cvLines,
  strengths,
  evidence,
  projects,
  experience,
  education,
  normalised,
}: {
  advertLines: string[];
  cvLines: string[];
  strengths: string[];
  evidence: string[];
  projects: string[];
  experience: string[];
  education: string[];
  normalised: string;
}) => {
  const requirementsFound = collectSectionLines(
    advertLines,
    ["about the role", "responsibilities", "requirements", "essential skills", "desirable skills", "required skills"],
    requirementSignals,
    "Review the job advert requirements and copy out the parts that matter most.",
    isUsableRequirementDetail,
  );
  const advertWordingToReview = extractLinesMatching(
    advertLines,
    ["we are looking", "requirements", "responsibilities", "essential", "desirable", "required skills", "portfolio", "github"],
    "Review the advert wording and tailor only where accurate.",
  );
  const cvEvidenceThatMayMatch = unique([
    ...strengths.map((strength) => `${strength} may match advert wording if backed by examples.`),
    ...projects,
    ...experience,
    ...education,
  ]).slice(0, 7);
  const strongEvidenceToConsider = unique([
    ...projects,
    ...evidence,
    ...strengths,
  ]).slice(0, 6);
  const examplesToPrepare = unique([
    hasAny(normalised, ["react", "typescript"])
      ? "Prepare a short example of React and TypeScript work you can explain accurately."
      : undefined,
    hasAny(normalised, ["accessibility"])
      ? "Prepare an example of accessibility or inclusive-design work if it genuinely applies."
      : undefined,
    hasAny(normalised, ["customer-facing", "customer facing", "customer service"])
      ? "Prepare an example of customer-facing communication or support work."
      : undefined,
    "Prepare one truthful example for each important advert requirement before applying.",
  ].filter((item): item is string => Boolean(item)));
  const claimsToVerify = [
    "Check every requirement match against your actual experience before sending.",
    "Verify dates, qualifications, project links, and role titles against your records.",
    "Tailor only where accurate; do not imply experience you cannot honestly explain.",
  ];
  const requirementEvidenceMap = buildRequirementEvidenceMap({
    requirements: requirementsFound,
    cvLines,
    cvNormalised: normalised,
  });

  return {
    requirementsFound,
    advertWordingToReview,
    cvEvidenceThatMayMatch,
    strongEvidenceToConsider,
    examplesToPrepare,
    claimsToVerify,
    requirementEvidenceMap,
  };
};

const buildSummary = (documentType: CareerSupportDocumentType) => {
  if (documentType === "cv_job_advert_match") {
    return "This appears to contain both CV evidence and job-advert requirements. AdminAvenger has prepared match notes to help compare requirements with truthful evidence before applying.";
  }

  if (documentType === "cv") {
    return "This appears to be a CV or resume. AdminAvenger has prepared review notes so the user can highlight strengths, evidence, projects, and gaps before applying.";
  }

  if (documentType === "cover_letter") {
    return "This appears to be cover-letter material. AdminAvenger has prepared notes to help the user keep wording specific, truthful, and linked to evidence.";
  }

  if (documentType === "job_advert") {
    return "This appears to be a job advert or job description. AdminAvenger has prepared notes to help compare the role requirements with the user's evidence before applying.";
  }

  if (documentType === "application_answer") {
    return "This appears to be application-answer or supporting-statement material. AdminAvenger has prepared notes to help make the answer clearer and evidence-led.";
  }

  return "This does not clearly look like a CV, cover letter, job advert, or application answer.";
};

const buildGaps = (documentType: CareerSupportDocumentType, normalised: string) => {
  const gaps: string[] = [];

  if (!hasAny(normalised, roleSignals)) {
    gaps.push("Check whether the target role or role family is clear.");
  }

  if (!/\b(20\d{2}|19\d{2})\b/.test(normalised)) {
    gaps.push("Check whether dates are included for recent roles, courses, or projects.");
  }

  if (!/\b(\d+%|\d+\s+(people|users|customers|projects|cases|tickets|weeks|months|years))\b/.test(normalised)) {
    gaps.push("Look for places where a real example or measured result could make the evidence clearer.");
  }

  if (documentType === "cv" && !hasAny(normalised, ["github", "portfolio"])) {
    gaps.push("Check whether useful portfolio, GitHub, or work-sample links should be included.");
  }

  if (documentType === "job_advert" && !hasAny(normalised, ["closing date", "apply by", "deadline"])) {
    gaps.push("Check the original advert for the closing date and application instructions.");
  }

  return unique(gaps);
};

export const buildCareerSupportPack = ({ text }: { text: string }): CareerSupportPack => {
  const normalised = normaliseText(text);
  const lines = getLines(text);
  const documentType = detectCareerSupportDocumentType(text);
  const splitText =
    documentType === "cv_job_advert_match"
      ? splitCareerMatchText(text)
      : {
          cvText: text,
          advertText: text,
        };
  const cvNormalised = normaliseText(splitText.cvText);
  const advertNormalised = normaliseText(splitText.advertText);
  const cvLines = getLines(splitText.cvText);
  const advertLines = getLines(splitText.advertText);
  const careerSignals = unique([
    ...extractMatchingSignals(normalised, directCvSignals),
    ...extractMatchingSignals(normalised, cvStructureSignals),
    ...extractMatchingSignals(normalised, coverLetterSignals),
    ...extractMatchingSignals(normalised, jobAdvertSignals),
    ...extractMatchingSignals(normalised, applicationAnswerSignals),
  ]);
  const skills = extractMatchingSignals(
    documentType === "cv_job_advert_match" ? cvNormalised : normalised,
    skillSignals,
  );
  const targetRoles = extractMatchingSignals(
    documentType === "cv_job_advert_match" ? advertNormalised : normalised,
    roleSignals,
  );
  const strengthsToHighlight = buildStrengthLabels(
    documentType === "cv_job_advert_match" ? cvNormalised : normalised,
    skills,
  );
  const evidenceToUse = extractLinesMatching(
    documentType === "cv_job_advert_match" ? cvLines : lines,
    evidenceVerbs,
    "Add specific examples of work, projects, volunteering, training, or responsibilities the user can evidence.",
  );
  const projectsToHighlight = collectSectionLines(
    documentType === "cv_job_advert_match" ? cvLines : lines,
    ["projects", "portfolio", "github projects"],
    ["memephant", "adminavenger", "portfolio project", "portfolio app", "github"],
    "If relevant, add project, portfolio, GitHub, or work-sample evidence.",
    isUsableProjectDetail,
  );
  const experienceToFrame = extractLinesMatching(
    documentType === "cv_job_advert_match" ? cvLines : lines,
    ["professional experience", "work experience", "volunteer experience", "employment history", "managed", "supported", "delivered"],
    "Frame experience around truthful responsibilities, actions taken, and outcomes where known.",
  );
  const educationAndTraining = collectSectionLines(
    documentType === "cv_job_advert_match" ? cvLines : lines,
    ["education", "education & training", "education and training", "training"],
    ["bsc computing and it", "bsc", "open university", "completed modules", "module", "modules", "excel skills training", "gdpr essentials course", "gdpr", "nvq", "degree", "certificate", "certification", "bootcamp", "gcse", "a level", "course", "training", "university"],
    "Add relevant education, training, certificates, or courses if they support the target role.",
    isUsableEducationDetail,
  );
  const matchFields =
    documentType === "cv_job_advert_match"
      ? buildMatchFields({
          advertLines,
          cvLines,
          strengths: strengthsToHighlight,
          evidence: evidenceToUse,
          projects: projectsToHighlight,
          experience: experienceToFrame,
          education: educationAndTraining,
          normalised: cvNormalised,
        })
      : undefined;

  return {
    documentType,
    matchMode: documentType === "cv_job_advert_match" ? "cv_job_advert_match" : undefined,
    summary: buildSummary(documentType),
    likelyTargetRoles:
      targetRoles.length > 0
        ? targetRoles
        : documentType === "job_advert"
          ? ["Check the job title and role family from the advert."]
          : ["Check which role this CV or application is being prepared for."],
    roleClues: documentType === "cv_job_advert_match" ? extractRoleClues(advertLines, advertNormalised) : undefined,
    requirementsFound: matchFields?.requirementsFound,
    cvEvidenceThatMayMatch: matchFields?.cvEvidenceThatMayMatch,
    strongEvidenceToConsider: matchFields?.strongEvidenceToConsider,
    advertWordingToReview: matchFields?.advertWordingToReview,
    examplesToPrepare: matchFields?.examplesToPrepare,
    claimsToVerify: matchFields?.claimsToVerify,
    requirementEvidenceMap: matchFields?.requirementEvidenceMap,
    strengthsToHighlight,
    evidenceToUse,
    projectsToHighlight,
    experienceToFrame,
    educationAndTraining,
    possibleGapsToCheck: buildGaps(documentType, normalised),
    saferRewriteSuggestions: [
      "Turn broad claims into specific examples the user can honestly explain.",
      "Use wording from the job advert only where it genuinely matches the user's experience.",
      "Keep drafts editable and check every claim before sharing it with an employer or recruiter.",
    ],
    nextPreparationSteps: [
      "Choose the target role or job advert before editing the CV or application.",
      "Pick the strongest evidence examples and make sure they are accurate.",
      "Review gaps, dates, and links before sending anything outside AdminAvenger.",
    ],
    safetyNotes: [
      "Preparation only. AdminAvenger helps prepare. You stay in control.",
      "This is not employment, recruitment, legal, benefits, or financial advice.",
      "AdminAvenger does not apply for jobs, send messages, or contact employers for you.",
      "The user should review and edit all wording before using it.",
    ],
    confidence: confidenceFromSignals(documentType, careerSignals.length),
  };
};
