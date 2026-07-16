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

  it("prepares strengths, evidence, projects, and next steps from a synthetic CV", () => {
    const pack = buildCareerSupportPack({ text: syntheticCv });

    expect(pack.strengthsToHighlight.join(" ")).toContain("react");
    expect(pack.evidenceToUse.join(" ")).toContain("Built a subscription tracker project");
    expect(pack.projectsToHighlight.join(" ")).toContain("GitHub");
    expect(pack.nextPreparationSteps).toContain(
      "Choose the target role or job advert before editing the CV or application.",
    );
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
    const pack = buildCareerSupportPack({ text: syntheticCv });
    const text = JSON.stringify(pack).toLowerCase();

    expect(text).not.toContain("you will get the job");
    expect(text).not.toContain("guaranteed interviews");
    expect(text).not.toContain("you qualify");
    expect(text).not.toContain("this is the best cv");
    expect(text).not.toContain("this proves experience");
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
