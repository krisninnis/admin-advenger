import { describe, expect, it } from "vitest";
import type { AdminItem } from "../../types";
import {
  buildCareerSupportPack,
  detectCareerSupportDocumentType,
} from "../careerSupportPack";
import careerSupportPackSource from "../careerSupportPack.ts?raw";
import { analyseAdminItem } from "../mockAnalysis";

const makeAdminItem = (title: string, rawText: string): AdminItem => ({
  id: "item-career-test",
  title,
  sourceType: "pdf",
  rawText,
  createdAt: "2026-07-16T10:00:00.000Z",
});

const syntheticCv = `
Curriculum Vitae

Professional profile
Front-end developer with experience building accessible React and TypeScript interfaces.

Technical Skills
React, TypeScript, JavaScript, HTML, CSS, Tailwind, GitHub

Projects
Built a subscription tracker project for a portfolio app.
GitHub: github.com/example/portfolio

Professional Experience
Supported customer service teams and improved internal admin workflows.

Education and Training
Web development bootcamp, 2025

References available upon request
`;

const syntheticEntryLevelCv = `
CV

Professional profile
Seeking an entry-level role in front-end development with a focus on accessible websites.

Key Skills
HTML, CSS, JavaScript, React, GitHub

Projects
Portfolio website and task planner app.

Work Experience
Volunteer experience supporting a community group with admin updates.

Education & Training
Software development course, 2026
`;

const syntheticJobAdvert = `
Job advert: Frontend Developer

Job description
We are looking for a candidate with React, TypeScript, accessibility, and customer-facing experience.

Responsibilities
Build user interfaces, maintain components, and work with designers.

Requirements
Portfolio or GitHub examples preferred.

Closing date: 30 August 2026
`;

const syntheticCvWithJobAdvert = `
CV

Professional profile
Front-end developer with experience building accessible React and TypeScript interfaces.

Technical Skills
React, TypeScript, JavaScript, accessibility, GitHub

Projects
AdminAvenger - local-first document preparation prototype using React and TypeScript.

Work Experience
Supported customer service teams and improved internal admin workflows.

Education & Training
Web development bootcamp, 2025

Job advert: Front End Developer

About the role
We are looking for a candidate who can build user interfaces, maintain components, and work with designers.

Requirements
Essential skills: React, TypeScript, accessibility, and customer-facing communication.
Desirable skills: Portfolio or GitHub examples.

Salary: Example salary band
Location: Remote
Apply now with your CV.
`;

const syntheticCvWithNoisyAdvert = `
CV

Professional profile
Entry-level IT support candidate with practical admin and data experience.

Projects
AdminAvenger - local-first document preparation prototype using React and TypeScript.

Technical Skills
HTML, CSS, JavaScript, Python, GitHub

Professional Experience
Supported a community team with spreadsheet updates and record keeping.

Education & Training
BSc Computing and IT, Open University
Excel Skills Training

JOB ADVERT
Junior IT & Data Support Assistant

About the role
We are looking for someone to support the data team and help with internal systems.

Responsibilities
Maintain spreadsheets, update records, and respond to support requests.

Requirements
Basic understanding of IT, software, data or web technologies.
Essential skills: Excel, data handling, communication, and attention to detail.
Desirable skills: GDPR handling, CRM administration, and Power BI awareness.

How to apply
Send a CV and short covering note.
`;

const syntheticCvWithGdprAndAdvert = `
CV

Professional profile
Administrator with experience organising sensitive records.

Professional Experience
Maintained confidential customer records and organised important information.

Education & Training
GDPR Essentials Course
Excel Skills Training

JOB ADVERT
Data Administrator

Requirements
GDPR handling, privacy awareness, and accurate record keeping.
`;

const syntheticCvFirstThenAdvert = `
CV
Name: Sam Taylor

Professional Profile
Entry-level IT and data support applicant with practical admin experience.

Key Skills
- HTML, CSS and basic JavaScript
- GitHub portfolio in progress
- Microsoft Excel, including formulas, filters and simple reports
- GDPR and handling sensitive information

Projects
Personal Portfolio Website
Built a simple website using HTML, CSS and JavaScript.
Used GitHub to store code and track changes.
Study Tracker Spreadsheet
Used filters, formulas and conditional formatting.

Work Experience
Care Administrator
Maintained appointment records and care-related notes.
Organised documents, letters and important dates.
Handled sensitive information carefully.

Family Support Role
Helped organise appointments and paperwork.

Customer Assistant
Supported customers and kept basic records accurate.

Education and Training
Excel Skills Training
GDPR Essentials Course

JOB ADVERT
Junior IT & Data Support Assistant

About the role
We are looking for someone to support internal users and help keep data accurate.

Responsibilities
- Support users with basic IT, software and digital system queries.
- Maintain accurate records, spreadsheets and admin data.
- Help clean, organise and check data for accuracy.
- Use Microsoft Excel for data entry, formulas, filtering and simple reports.
- Follow GDPR and privacy processes when handling sensitive information.

Requirements
- Good attention to detail.
- Clear communication and willingness to learn new systems.
`;

const syntheticNoisyCv = `
CV

Contact
Alex Example
alex.example@example.test
07123 456789

Professional profile
Seeking a junior developer role after building practical portfolio projects and completing training.

Other Technical Skills
React, TypeScript, JavaScript, HTML, CSS, GitHub

GitHub Projects
Development Tools / Portfolio: GitHub
Key areas worked on include:
Memephant - a playful React project using local state and reusable components.
AdminAvenger - local-first document preparation prototype.

Education & Training
BSc Computing and IT, Open University
Completed modules: Web technologies, databases, accessibility
Excel Skills Training
GDPR and data handling awareness
GDPR Essentials Course
`;

describe("Career Support Pack Core v1", () => {
  it("detects a synthetic CV as a career document", () => {
    const pack = buildCareerSupportPack({ text: syntheticCv });

    expect(pack.documentType).toBe("cv");
    expect(pack.summary).toContain("CV or resume");
    expect(pack.confidence.level).toBe("high");
  });

  it("prioritises CV signals over job-advert wording when a CV says it is seeking a role", () => {
    const text = `${syntheticEntryLevelCv}
Responsibilities I am looking for include building interfaces and learning from a team.
Required skills I am developing: React, JavaScript, accessibility.
`;

    expect(detectCareerSupportDocumentType(text)).toBe("cv");

    const pack = buildCareerSupportPack({ text });

    expect(pack.documentType).toBe("cv");
    expect(pack.summary).toContain("CV or resume");
  });

  it("detects CV and job advert together as match preparation", () => {
    expect(detectCareerSupportDocumentType(syntheticCvWithJobAdvert)).toBe("cv_job_advert_match");

    const pack = buildCareerSupportPack({ text: syntheticCvWithJobAdvert });

    expect(pack.documentType).toBe("cv_job_advert_match");
    expect(pack.matchMode).toBe("cv_job_advert_match");
    expect(pack.summary).toContain("both CV evidence and job-advert requirements");
    expect(pack.roleClues?.join(" ").toLowerCase()).toContain("front end developer");
  });

  it("extracts advert requirements and CV evidence for match preparation", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvWithJobAdvert });
    const requirements = pack.requirementsFound?.join("\n").toLowerCase() ?? "";
    const evidence = pack.cvEvidenceThatMayMatch?.join("\n").toLowerCase() ?? "";
    const strongEvidence = pack.strongEvidenceToConsider?.join("\n").toLowerCase() ?? "";
    const advertWording = pack.advertWordingToReview?.join("\n").toLowerCase() ?? "";

    expect(requirements).toContain("react");
    expect(requirements).toContain("typescript");
    expect(requirements).toContain("accessibility");
    expect(evidence).toContain("may match");
    expect(evidence).toContain("adminavenger");
    expect(strongEvidence).toContain("adminavenger");
    expect(advertWording).toContain("we are looking");
    expect(pack.examplesToPrepare?.join(" ").toLowerCase()).toContain("react and typescript");
    expect(pack.claimsToVerify?.join(" ").toLowerCase()).toContain("tailor only where accurate");
  });

  it("keeps job advert text out of CV-side match evidence", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvWithNoisyAdvert });
    const roleClues = pack.roleClues?.join("\n").toLowerCase() ?? "";
    const requirements = pack.requirementsFound?.join("\n").toLowerCase() ?? "";
    const evidenceToUse = pack.evidenceToUse.join("\n").toLowerCase();
    const projects = pack.projectsToHighlight.join("\n").toLowerCase();
    const education = pack.educationAndTraining.join("\n").toLowerCase();
    const strongEvidence = pack.strongEvidenceToConsider?.join("\n").toLowerCase() ?? "";

    expect(pack.documentType).toBe("cv_job_advert_match");
    expect(roleClues).toContain("junior it & data support assistant");
    expect(roleClues).not.toContain("job advert");
    expect(roleClues).not.toContain("about the role");
    expect(roleClues).not.toContain("responsibilities");
    expect(roleClues).not.toContain("requirements");
    expect(roleClues).not.toContain("desirable skills");
    expect(requirements).toContain("gdpr handling");
    expect(evidenceToUse).not.toContain("we are looking");
    expect(evidenceToUse).not.toContain("desirable skills");
    expect(projects).toContain("adminavenger");
    expect(projects).not.toContain("gdpr handling");
    expect(projects).not.toContain("desirable skills");
    expect(education).toContain("open university");
    expect(education).not.toContain("gdpr handling");
    expect(education).not.toContain("desirable skills");
    expect(strongEvidence).not.toContain("gdpr handling");
    expect(strongEvidence).not.toContain("desirable skills");
  });

  it("builds a requirement-by-requirement evidence map from CV-side evidence", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvWithNoisyAdvert });
    const map = pack.requirementEvidenceMap ?? [];
    const spreadsheetItem = map.find((item) =>
      item.requirement.toLowerCase().includes("excel"),
    );
    const itWebItem = map.find((item) =>
      item.requirement.toLowerCase().includes("it, software"),
    );
    const gdprItem = map.find((item) =>
      item.requirement.toLowerCase().includes("gdpr handling"),
    );
    const allPossibleEvidence = map
      .flatMap((item) => item.possibleEvidence)
      .join("\n")
      .toLowerCase();

    expect(map.length).toBeGreaterThan(0);
    expect(spreadsheetItem?.possibleEvidence.join(" ").toLowerCase()).toContain("excel skills training");
    expect(spreadsheetItem?.possibleEvidence.join(" ").toLowerCase()).toContain("spreadsheet updates");
    expect(spreadsheetItem?.exampleToPrepare.toLowerCase()).toContain("excel");
    expect(itWebItem?.possibleEvidence.join(" ").toLowerCase()).toContain("open university");
    expect(itWebItem?.possibleEvidence.join(" ").toLowerCase()).toContain("html, css, javascript");
    expect(itWebItem?.possibleEvidence.join(" ").toLowerCase()).toContain("adminavenger");
    expect(itWebItem?.exampleToPrepare.toLowerCase()).toContain("project");
    expect(gdprItem?.possibleEvidence.join(" ").toLowerCase()).not.toContain("gdpr handling");
    expect(allPossibleEvidence).not.toContain("we are looking");
    expect(allPossibleEvidence).not.toContain("essential skills");
    expect(allPossibleEvidence).not.toContain("desirable skills");
  });

  it("maps GDPR/privacy requirements only when CV-side evidence is present", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvWithGdprAndAdvert });
    const gdprItem = pack.requirementEvidenceMap?.find((item) =>
      item.requirement.toLowerCase().includes("gdpr handling"),
    );
    const evidence = gdprItem?.possibleEvidence.join("\n").toLowerCase() ?? "";

    expect(gdprItem).toBeDefined();
    expect(evidence).toContain("gdpr essentials course");
    expect(evidence).toContain("confidential customer records");
    expect(gdprItem?.verificationNote.toLowerCase()).toContain("check before using");
  });

  it("keeps CV-first and JOB-ADVERT-second source splitting clean", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvFirstThenAdvert });
    const roleClues = pack.roleClues?.join("\n").toLowerCase() ?? "";
    const requirements = pack.requirementsFound?.join("\n").toLowerCase() ?? "";
    const evidenceMap = pack.requirementEvidenceMap ?? [];
    const allEvidence = evidenceMap
      .flatMap((item) => item.possibleEvidence)
      .join("\n")
      .toLowerCase();
    const recordsItem = evidenceMap.find((item) =>
      item.requirement.toLowerCase().includes("maintain accurate records"),
    );
    const excelItem = evidenceMap.find((item) =>
      item.requirement.toLowerCase().includes("microsoft excel"),
    );
    const gdprItem = evidenceMap.find((item) =>
      item.requirement.toLowerCase().includes("gdpr"),
    );

    expect(pack.documentType).toBe("cv_job_advert_match");
    expect(roleClues).toContain("junior it & data support assistant");
    expect(roleClues).not.toContain("care administrator");
    expect(roleClues).not.toContain("family support role");
    expect(roleClues).not.toContain("customer assistant");
    expect(requirements).toContain("support users with basic it, software and digital system queries");
    expect(requirements).toContain("maintain accurate records, spreadsheets and admin data");
    expect(requirements).toContain("use microsoft excel for data entry, formulas, filtering and simple reports");
    expect(requirements).not.toContain("html, css and basic javascript");
    expect(requirements).not.toContain("github portfolio in progress");
    expect(requirements).not.toContain("personal portfolio website");
    expect(requirements).not.toContain("built a simple website");
    expect(requirements).not.toContain("used github to store code");
    expect(recordsItem?.possibleEvidence.join(" ").toLowerCase()).toContain("maintained appointment records");
    expect(recordsItem?.possibleEvidence.join(" ").toLowerCase()).toContain("organised documents");
    expect(excelItem?.possibleEvidence.join(" ").toLowerCase()).toContain("microsoft excel");
    expect(excelItem?.possibleEvidence.join(" ").toLowerCase()).toContain("study tracker spreadsheet");
    expect(excelItem?.possibleEvidence.join(" ").toLowerCase()).toContain("used filters, formulas");
    expect(gdprItem?.possibleEvidence.join(" ").toLowerCase()).toContain("gdpr and handling sensitive information");
    expect(gdprItem?.possibleEvidence.join(" ").toLowerCase()).toContain("handled sensitive information carefully");
    expect(allEvidence).not.toContain("support users with basic it");
    expect(allEvidence).not.toContain("maintain accurate records, spreadsheets and admin data");
    expect(allEvidence).not.toContain("we are looking for someone");
  });

  it("does not turn a synthetic CV into a subscription finding", () => {
    const findings = analyseAdminItem(makeAdminItem("CV - front-end developer", syntheticCv));

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe("CV preparation notes");
    expect(findings[0].category).toBe("unknown");
    expect(findings.some((finding) => finding.category === "subscription")).toBe(false);
    expect(findings[0].summary).toContain("CV or resume");
  });

  it("produces CV review output for GitHub, projects, education, and work history", () => {
    const pack = buildCareerSupportPack({ text: syntheticEntryLevelCv });

    expect(pack.documentType).toBe("cv");
    expect(pack.projectsToHighlight.join(" ")).toContain("Portfolio website");
    expect(pack.educationAndTraining.join(" ")).toContain("Software development course");
    expect(pack.experienceToFrame.join(" ")).toContain("Volunteer experience");
    expect(pack.nextPreparationSteps.length).toBeGreaterThan(0);
  });

  it("keeps CV projects focused and excludes contact details", () => {
    const pack = buildCareerSupportPack({ text: syntheticNoisyCv });
    const projects = pack.projectsToHighlight.join("\n").toLowerCase();

    expect(projects).toContain("memephant");
    expect(projects).toContain("adminavenger");
    expect(projects).not.toContain("other technical skills");
    expect(projects).not.toContain("projects / portfolio");
    expect(projects).not.toContain("development tools / portfolio");
    expect(projects).not.toContain("key areas worked on include");
    expect(projects).not.toMatch(/^projects$/m);
    expect(projects).not.toMatch(/^portfolio$/m);
    expect(projects).not.toContain("alex.example@example.test");
    expect(projects).not.toContain("07123");
    expect(projects).not.toContain("professional profile");
    expect(projects).not.toContain("seeking a junior developer role");
  });

  it("keeps CV education focused and excludes professional profile paragraphs", () => {
    const pack = buildCareerSupportPack({ text: syntheticNoisyCv });
    const education = pack.educationAndTraining.join("\n").toLowerCase();

    expect(education).toContain("open university");
    expect(education).toContain("completed modules");
    expect(education).toContain("excel skills training");
    expect(education).toContain("gdpr essentials course");
    expect(education).not.toContain("gdpr and data handling awareness");
    expect(education).not.toContain("professional profile");
    expect(education).not.toContain("seeking a junior developer role");
    expect(education).not.toContain("react, typescript");
    expect(education).not.toContain("other technical skills");
  });

  it("prepares strengths, evidence, projects, and next steps from a synthetic CV", () => {
    const pack = buildCareerSupportPack({ text: syntheticCv });

    expect(pack.strengthsToHighlight).toEqual(
      expect.arrayContaining([
        "React and TypeScript project work",
        "Web development fundamentals",
        "GitHub portfolio evidence",
      ]),
    );
    expect(pack.strengthsToHighlight.join(" ")).not.toContain("Evidence around");
    expect(pack.evidenceToUse.join(" ")).toContain("Built a subscription tracker project");
    expect(pack.projectsToHighlight.join(" ")).toContain("GitHub");
    expect(pack.nextPreparationSteps).toContain(
      "Choose the target role or job advert before editing the CV or application.",
    );
  });

  it("uses human-readable CV strength labels for practical and admin evidence", () => {
    const pack = buildCareerSupportPack({
      text: `${syntheticNoisyCv}
Professional Experience
Record keeping, scheduling, data checks, troubleshooting, and practical problem solving.
`,
    });

    expect(pack.strengthsToHighlight).toEqual(
      expect.arrayContaining([
        "React and TypeScript project work",
        "Web development fundamentals",
        "Excel and data handling",
        "Record keeping and organisation",
        "Technical/practical problem solving",
        "GitHub portfolio evidence",
      ]),
    );
    expect(pack.strengthsToHighlight.join(" ")).not.toContain("Evidence around");
  });

  it("detects a synthetic job advert as career/job-search material", () => {
    expect(detectCareerSupportDocumentType(syntheticJobAdvert)).toBe("job_advert");

    const pack = buildCareerSupportPack({ text: syntheticJobAdvert });

    expect(pack.documentType).toBe("job_advert");
    expect(pack.summary).toContain("job advert or job description");
    expect(pack.possibleGapsToCheck).not.toContain(
      "Check the original advert for the closing date and application instructions.",
    );
  });

  it("creates a match finding instead of a plain CV or plain job-advert finding", () => {
    const findings = analyseAdminItem(makeAdminItem("CV and advert", syntheticCvWithJobAdvert));

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe("CV and job advert match notes");
    expect(findings[0].summary).toContain("both CV evidence and job-advert requirements");
    expect(findings[0].summary).not.toContain("subscription");
  });

  it("still lets normal recurring subscription text use the existing admin finding", () => {
    const subscriptionText = `
Google Play receipt
ChatGPT Plus
GBP 18.99/month
Auto-renewing subscription
You will be charged automatically until cancelled.
Learn how to cancel.
`;
    const findings = analyseAdminItem(makeAdminItem("Google Play receipt", subscriptionText));

    expect(findings.some((finding) => finding.category === "subscription")).toBe(true);
    expect(findings[0].title).toBe("Subscription renewal to review");
  });

  it("keeps unsafe career promises and automation wording out of generated packs", () => {
    const pack = buildCareerSupportPack({ text: syntheticCvWithJobAdvert });
    const text = JSON.stringify(pack).toLowerCase();

    expect(text).not.toContain("match score");
    expect(text).not.toContain("percentage match");
    expect(text).not.toContain("you will get the job");
    expect(text).not.toContain("guaranteed interviews");
    expect(text).not.toContain("you qualify");
    expect(text).not.toContain("you are qualified");
    expect(text).not.toContain("employer will like this");
    expect(text).not.toContain("this is the best cv");
    expect(text).not.toContain("this proves experience");
    expect(text).not.toContain("scoring");
    expect(text).not.toContain("apply automatically");
    expect(text).not.toContain("submit automatically");
    expect(text).not.toContain("contact employers automatically");
  });

  it("does not add network or live job-search integration code", () => {
    expect(careerSupportPackSource).not.toMatch(/\bfetch\s*\(/);
    expect(careerSupportPackSource).not.toContain("XMLHttpRequest");
    expect(careerSupportPackSource).not.toContain("sendBeacon");
    expect(careerSupportPackSource).not.toMatch(/https?:\/\//);
    expect(careerSupportPackSource.toLowerCase()).not.toContain("linkedin");
    expect(careerSupportPackSource.toLowerCase()).not.toContain("indeed");
  });
});
