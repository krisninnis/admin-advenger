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
