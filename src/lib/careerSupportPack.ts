export type CareerSupportDocumentType =
  | "cv"
  | "cover_letter"
  | "job_advert"
  | "application_answer"
  | "career_unknown";

export type CareerSupportConfidence = {
  level: "low" | "medium" | "high";
  reason: string;
};

export type CareerSupportPack = {
  documentType: CareerSupportDocumentType;
  summary: string;
  likelyTargetRoles: string[];
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

  if (hasDirectCvSignal || cvStructureCount >= 3) {
    return "cv";
  }

  if (hasAny(normalised, coverLetterSignals)) {
    return "cover_letter";
  }

  const jobAdvertSignalCount = jobAdvertSignals.filter((signal) => normalised.includes(signal)).length;

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

const buildSummary = (documentType: CareerSupportDocumentType) => {
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
  const careerSignals = unique([
    ...extractMatchingSignals(normalised, directCvSignals),
    ...extractMatchingSignals(normalised, cvStructureSignals),
    ...extractMatchingSignals(normalised, coverLetterSignals),
    ...extractMatchingSignals(normalised, jobAdvertSignals),
    ...extractMatchingSignals(normalised, applicationAnswerSignals),
  ]);
  const skills = extractMatchingSignals(normalised, skillSignals);
  const targetRoles = extractMatchingSignals(normalised, roleSignals);

  return {
    documentType,
    summary: buildSummary(documentType),
    likelyTargetRoles:
      targetRoles.length > 0
        ? targetRoles
        : documentType === "job_advert"
          ? ["Check the job title and role family from the advert."]
          : ["Check which role this CV or application is being prepared for."],
    strengthsToHighlight: buildStrengthLabels(normalised, skills),
    evidenceToUse: extractLinesMatching(
      lines,
      evidenceVerbs,
      "Add specific examples of work, projects, volunteering, training, or responsibilities the user can evidence.",
    ),
    projectsToHighlight: collectSectionLines(
      lines,
      ["projects", "portfolio", "github projects"],
      ["memephant", "adminavenger", "portfolio project", "portfolio app", "github"],
      "If relevant, add project, portfolio, GitHub, or work-sample evidence.",
      isUsableProjectDetail,
    ),
    experienceToFrame: extractLinesMatching(
      lines,
      ["professional experience", "work experience", "volunteer experience", "employment history", "managed", "supported", "delivered"],
      "Frame experience around truthful responsibilities, actions taken, and outcomes where known.",
    ),
    educationAndTraining: collectSectionLines(
      lines,
      ["education", "education & training", "education and training", "training"],
      ["bsc computing and it", "bsc", "open university", "completed modules", "module", "modules", "excel skills training", "gdpr essentials course", "gdpr", "nvq", "degree", "certificate", "certification", "bootcamp", "gcse", "a level", "course", "training", "university"],
      "Add relevant education, training, certificates, or courses if they support the target role.",
      isUsableEducationDetail,
    ),
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
