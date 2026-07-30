import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildAdviserExportPack } from "../../lib/adviserExportPack";
import { buildBenefitsActionPack } from "../../lib/benefitsActionPack";
import { buildCareerSupportPack } from "../../lib/careerSupportPack";
import { analyseDecisionProblem } from "../../lib/decisionEngine/decisionEngine";
import {
  goldenLetterFixtures,
  normaliseGoldenText,
  runGoldenLetterFixture,
} from "../../lib/goldenLetters";
import { buildResultViewModel } from "../../lib/resultViewModel";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";
import { buildStrategicNextStepPlan } from "../../lib/strategicNextStep";
import { ResultCaseSheet } from "../ResultCaseSheet";

const renderCaseSheet = (text: string) => {
  const decisionResult = analyseDecisionProblem(text);
  const benefitsActionPack = buildBenefitsActionPack(decisionResult);
  const strategicNextStepPlan = buildStrategicNextStepPlan({
    decisionResult,
    benefitsActionPack,
  });
  const resultViewModel = buildResultViewModel({
    decisionResult,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const adviserExportPack = buildAdviserExportPack({
    decisionResult,
    resultViewModel,
    benefitsActionPack,
    strategicNextStepPlan,
  });
  const html = renderToStaticMarkup(
    <ResultCaseSheet
      model={resultViewModel}
      decisionResult={decisionResult}
      benefitsActionPack={benefitsActionPack}
      strategicNextStepPlan={strategicNextStepPlan}
      adviserExportPack={adviserExportPack}
      primaryAction={{ label: "Save this check", onClick: () => undefined, emphasis: "primary" }}
      onDownloadAdviserPack={() => undefined}
      supportingDetailsOpen={false}
      onToggleSupportingDetails={() => undefined}
    />,
  );

  return { decisionResult, resultViewModel, adviserExportPack, html };
};

const countOccurrences = (value: string, search: string) =>
  value.split(search).length - 1;

describe("ResultCaseSheet", () => {
  it("renders the v2 case sheet sections and adviser pack action", () => {
    const { html } = renderCaseSheet(`Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    expect(html).toContain("Your result at a glance");
    expect(html).toContain("Is anything urgent?");
    expect(html).toContain("What should I do next?");
    expect(html).toContain("What should I have ready?");
    expect(html).toContain("See dates, money, evidence and questions");
    expect(html).toContain("Dates to check");
    expect(html).toContain("Money mentioned");
    expect(html).toContain("Evidence / documents to bring");
    expect(html).toContain("Questions to answer");
    expect(html).toContain("What AdminAvenger cannot know");
    expect(html).toContain("Uncertainty / double-check");
    expect(html).toContain("Draft/checklist");
    expect(html).toContain("Save this check");
    expect(html).toContain("Download adviser pack");
    expect(html).toContain(
      "Creates a Markdown file you can save, print, or share with someone you trust.",
    );
    expect(html).toContain("AdminAvenger does not send it anywhere.");
  });

  it("keeps date, money, no-contact, and no-submit safety visible", () => {
    const { html } = renderCaseSheet(`Debt collector letter
Outstanding balance: GBP 480.00.
Please reply by 31 July 2026 with your reference.`);
    const text = normaliseGoldenText(html);

    expect(html).toContain("Check against the original letter.");
    expect(text).toContain("display-only");
    expect(text).toContain("adminavenger has not checked whether any amount is correct or owed");
    expect(text).toContain("not counted as a saving or recovery");
    expect(html).toContain("AdminAvenger does not contact anyone for you.");
    expect(html).toContain("Nothing has been submitted.");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("keeps UC sanction payment risk, uncertainty, cannotKnow, and route/check wording visible", () => {
    const { html, decisionResult, resultViewModel } = renderCaseSheet(`Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.
You can ask for a Mandatory Reconsideration if you disagree.
The letter also says hardship support may be available if you cannot cover food, heating, or rent.`);
    const text = normaliseGoldenText(html);

    expect(decisionResult.documentType).toBe("benefits_uc_sanction");
    expect(text).toContain("reduce");
    expect(text).toContain("payment");
    expect(resultViewModel.uncertainty.length).toBeGreaterThan(0);
    expect(resultViewModel.cannotKnow.length).toBeGreaterThan(0);
    expect(text).toContain("uncertainty");
    expect(text).toContain("cannot know");
    expect(text).toContain("check");
  });

  it("keeps unknown fallback conservative", () => {
    const { html, decisionResult } = renderCaseSheet(`Official update
Reference: REF-EXAMPLE-GEN-016
Please see the attached update. We will write again if more information is needed.`);
    const text = normaliseGoldenText(html);

    expect(decisionResult.documentType).toBe("unknown_admin_dispute");
    expect(text).toContain("not clear");
    expect(text).toContain("check");
    expect(text).toContain("cannot know");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("shows a copy button beside the draft/checklist text, copying only that text", () => {
    const { html } = renderCaseSheet(`Universal Credit sanction decision
We have decided to reduce your Universal Credit because you did not attend an appointment.
This sanction starts on 10 July 2026.`);

    expect(html).toContain('aria-label="Copy draft/checklist"');
    // The copy button sits inside the same "Draft/checklist" section, not a
    // separate/duplicate one, and the section still shows the review notice
    // - the button must not replace or hide the existing review warning.
    expect(html).toContain("Draft/checklist");
    expect(html).toContain("Editable preparation. Review before using or sharing.");
  });

  it("does not repeat primary section titles", () => {
    const { html } = renderCaseSheet(`Universal Credit statement
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    for (const title of [
      "Your result at a glance",
      "Is anything urgent?",
      "What should I do next?",
      "What should I have ready?",
      "What AdminAvenger cannot know",
      "Adviser export action",
    ]) {
      expect(countOccurrences(html, title)).toBe(1);
    }
  });

  it("renders CV preparation results without admin-letter date or money panels", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Seeking an entry-level front-end developer role.
Key Skills
React, TypeScript, GitHub
Projects
Portfolio website and accessibility checklist app.
Work Experience
Volunteer experience supporting admin updates.
Education & Training
Web development course, 2026`,
    });
    const resultViewModel = buildResultViewModel({ careerSupportPack });
    const html = renderToStaticMarkup(
      <ResultCaseSheet
        model={resultViewModel}
        primaryAction={{ label: "Save CV review", onClick: () => undefined, emphasis: "primary" }}
        secondaryActions={[
          { label: "Mark reviewed", onClick: () => undefined, emphasis: "quiet" },
          { label: "Ignore", onClick: () => undefined, emphasis: "quiet" },
        ]}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );
    const text = normaliseGoldenText(html);

    expect(html).toContain("CV preparation notes");
    expect(html).toContain("Strengths to highlight");
    expect(html).toContain("Projects to highlight");
    expect(html).toContain("Experience to frame");
    expect(html).toContain("Education/training to mention");
    expect(html).toContain("Choose the target role before editing the CV");
    expect(html).toContain("Save CV review");
    expect(html).toContain("Mark reviewed");
    expect(html).not.toContain("Dates to check");
    expect(html).not.toContain("Money mentioned");
    expect(html).not.toContain("Check email safety");
    expect(html).not.toContain("Create draft message");
    expect(html).not.toContain("Save as record");
    expect(text).not.toContain("check against the original letter");
    expect(text).not.toContain("check the sender, date, reference");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("renders CV plus job advert match preparation sections", () => {
    const careerSupportPack = buildCareerSupportPack({
      text: `CV
Professional profile
Front-end developer with React and TypeScript experience.
Technical Skills
React, TypeScript, accessibility, GitHub
Projects
AdminAvenger - local-first document preparation prototype.
Work Experience
Supported customer service teams.

Job advert: Front End Developer
About the role
We are looking for a candidate who can build user interfaces and maintain components.
Requirements
Essential skills: React, TypeScript, accessibility, and customer-facing communication.
Desirable skills: Portfolio or GitHub examples.`,
    });
    const resultViewModel = buildResultViewModel({ careerSupportPack });
    const html = renderToStaticMarkup(
      <ResultCaseSheet
        model={resultViewModel}
        primaryAction={{ label: "Save career notes", onClick: () => undefined, emphasis: "primary" }}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );
    const text = normaliseGoldenText(html);

    expect(careerSupportPack.documentType).toBe("cv_job_advert_match");
    expect(html).toContain("CV and job advert match notes");
    expect(html).toContain("Requirement-by-requirement evidence map");
    expect(html).toContain("Requirement");
    expect(html).toContain("Possible CV evidence to consider");
    expect(html).toContain("What to prepare");
    expect(html).toContain("Check before using");
    expect(html).toContain("Requirements found in the advert");
    expect(html).toContain("CV evidence that may match");
    expect(html).toContain("Strong evidence to consider using");
    expect(html).toContain("Wording from the advert to review");
    expect(html).toContain("Examples to prepare before applying");
    expect(html).toContain("Claims to verify before sending");
    expect(html).not.toContain("Projects to highlight");
    expect(html).not.toContain("Education/training to mention");
    expect(text).toContain("may match");
    expect(text).not.toContain("match score");
    expect(text).not.toContain("percentage match");
    expect(text).not.toContain("you are qualified");
    expect(text).not.toContain("apply automatically");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("selected golden fixtures render safely through Result Page v2", () => {
    const selectedFixtureIds = [
      "benefits-uc-statement-001",
      "benefits-uc-sanction-001",
      "benefits-pip-refusal-001",
      "benefits-uc-deductions-001",
      "debt-collection-001",
      "parking-legal-looking-001",
      "consumer-refund-refusal-001",
      "suspicious-message-001",
      "unknown-official-letter-001",
    ];

    for (const fixtureId of selectedFixtureIds) {
      const fixture = goldenLetterFixtures.find((item) => item.id === fixtureId);

      if (!fixture) {
        throw new Error(`Missing golden fixture ${fixtureId}`);
      }

      const run = runGoldenLetterFixture(fixture);
      const html = renderToStaticMarkup(
        <ResultCaseSheet
          model={run.resultViewModel}
          onDownloadAdviserPack={() => undefined}
          supportingDetailsOpen={false}
          onToggleSupportingDetails={() => undefined}
        />,
      );
      const text = normaliseGoldenText(html);

      expect(findForbiddenSafetyPhrases(html)).toEqual([]);
      expect(text).toContain("what adminavenger cannot know");

      if (fixture.category === "benefits" || fixture.category === "debt_legal") {
        expect(run.resultViewModel.cannotKnow.length).toBeGreaterThan(0);
      }

      if (fixture.expectedDates.length > 0) {
        expect(text).toContain("check against the original letter");
      }

      if (fixture.expectedMoneyMentions.length > 0) {
        expect(text).toContain("display-only");
        expect(text).toContain("not counted as a saving or recovery");
      }
    }
  });

  it('renders "Preparation progress" as part of the composed result', () => {
    const { html } = renderCaseSheet(`Universal Credit statement
Assessment period: 1 June 2026 to 30 June 2026
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    expect(html).toContain("Preparation progress");
    expect(html).toContain("does not predict the outcome");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("shows preparation progress safely for a PIP decision / Mandatory Reconsideration style result", () => {
    const { html, decisionResult } = renderCaseSheet(`Personal Independence Payment decision
To: Jordan Sample
Reference: REF-EXAMPLE-PIP-004

We have looked at your claim and decided you are not entitled to PIP.
The date of this decision is 4 July 2026.
You can ask us to look at this decision again.
The letter mentions daily living and mobility activities.`);
    const text = normaliseGoldenText(html);

    expect(decisionResult.documentType).toBe("benefits_decision");
    expect(html).toContain("Preparation progress");
    expect(text).toContain("activities or points identified");
    expect(text).toContain("real examples added");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("keeps preparation progress safe for the unknown fallback", () => {
    const { html, decisionResult } = renderCaseSheet(`Official update
Reference: REF-EXAMPLE-GEN-016
Please see the attached update. We will write again if more information is needed.`);
    const text = normaliseGoldenText(html);

    expect(decisionResult.documentType).toBe("unknown_admin_dispute");
    expect(html).toContain("Preparation progress");
    expect(text).toContain("sender or source checked");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });

  it("renders directAnswer in the header when present", () => {
    const taxNotice = `HMRC
Tax Code Notice

Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;

    const decisionResult = analyseDecisionProblem(taxNotice, "What is this?");
    const benefitsActionPack = buildBenefitsActionPack(decisionResult);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult,
      benefitsActionPack,
    });
    const resultViewModel = buildResultViewModel({
      decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
    });
    const html = renderToStaticMarkup(
      <ResultCaseSheet
        model={resultViewModel}
        decisionResult={decisionResult}
        benefitsActionPack={benefitsActionPack}
        strategicNextStepPlan={strategicNextStepPlan}
        primaryAction={{ label: "Save this check", onClick: () => undefined, emphasis: "primary" }}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );

    expect(resultViewModel.directAnswer).toBeDefined();
    expect(resultViewModel.directAnswer).toContain("HMRC tax code notice");
    expect(resultViewModel.directAnswer).toContain("not a tax bill");
    expect(html).toContain("HMRC tax code notice");
    expect(html).toContain("not a tax bill");
    expect(html).toContain("Your result at a glance");
  });

  it("does not render directAnswer block when directAnswer is absent", () => {
    const { html, decisionResult } = renderCaseSheet(`Universal Credit statement
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    expect(decisionResult.directAnswer).toBeUndefined();
    expect(html).toContain("Your result at a glance");
    expect(html).toContain("What AdminAvenger cannot know");
  });

  it("directAnswer appears before explanation sections in the DOM", () => {
    const taxNotice = `HMRC
Tax Code Notice

Page 1 of 2
Tax year: 6 April 2026 to 5 April 2027
This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.
Employer: Harbour View Opticians Ltd

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2
Your tax code for the tax year 2026 to 2027 is C1254L.`;

    const decisionResult = analyseDecisionProblem(taxNotice, "What is this?");
    const benefitsActionPack = buildBenefitsActionPack(decisionResult);
    const strategicNextStepPlan = buildStrategicNextStepPlan({
      decisionResult,
      benefitsActionPack,
    });
    const resultViewModel = buildResultViewModel({
      decisionResult,
      benefitsActionPack,
      strategicNextStepPlan,
    });
    const html = renderToStaticMarkup(
      <ResultCaseSheet
        model={resultViewModel}
        decisionResult={decisionResult}
        benefitsActionPack={benefitsActionPack}
        strategicNextStepPlan={strategicNextStepPlan}
        primaryAction={{ label: "Save this check", onClick: () => undefined, emphasis: "primary" }}
        supportingDetailsOpen={false}
        onToggleSupportingDetails={() => undefined}
      />,
    );

    const titlePos = html.indexOf(resultViewModel.title);
    const directAnswerPos = html.indexOf(resultViewModel.directAnswer!);
    const summaryPos = html.indexOf(resultViewModel.summary);
    const urgentPos = html.indexOf("Is anything urgent?");
    const nextPos = html.indexOf("What should I do next?");

    expect(titlePos).toBeGreaterThan(0);
    expect(directAnswerPos).toBeGreaterThan(titlePos);
    expect(summaryPos).toBeGreaterThan(directAnswerPos);
    expect(urgentPos).toBeGreaterThan(summaryPos);
    expect(nextPos).toBeGreaterThan(urgentPos);
  });

  it("result without directAnswer retains title then summary then supporting sections", () => {
    const { html, resultViewModel } = renderCaseSheet(`Universal Credit statement
Payment date: 7 July 2026
Your payment this month: GBP 843.45`);

    expect(resultViewModel.directAnswer).toBeUndefined();

    const titlePos = html.indexOf(resultViewModel.title);
    const summaryPos = html.indexOf(resultViewModel.summary);
    const urgentPos = html.indexOf("Is anything urgent?");
    const nextPos = html.indexOf("What should I do next?");

    expect(titlePos).toBeGreaterThan(0);
    expect(summaryPos).toBeGreaterThan(titlePos);
    expect(urgentPos).toBeGreaterThan(summaryPos);
    expect(nextPos).toBeGreaterThan(urgentPos);
  });

  it("never renders forbidden case-progress wording", () => {
    const fixtureIds = [
      "benefits-uc-sanction-001",
      "benefits-pip-refusal-001",
      "debt-collection-001",
      "parking-legal-looking-001",
      "suspicious-message-001",
      "unknown-official-letter-001",
    ];

    for (const fixtureId of fixtureIds) {
      const fixture = goldenLetterFixtures.find((item) => item.id === fixtureId);

      if (!fixture) {
        throw new Error(`Missing golden fixture ${fixtureId}`);
      }

      const run = runGoldenLetterFixture(fixture);
      const html = renderToStaticMarkup(
        <ResultCaseSheet
          model={run.resultViewModel}
          decisionResult={run.decisionResult}
          benefitsActionPack={run.benefitsActionPack}
          strategicNextStepPlan={run.strategicNextStepPlan}
          adviserExportPack={run.adviserExportPack}
          onDownloadAdviserPack={() => undefined}
          supportingDetailsOpen={false}
          onToggleSupportingDetails={() => undefined}
        />,
      );
      const lower = html.toLowerCase();

      expect(findForbiddenSafetyPhrases(html)).toEqual([]);
      expect(html).toContain("Preparation progress");

      for (const word of ["win", "chance", "success", "case strength", "valid claim", "invalid claim"]) {
        expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`));
      }
    }
  });
});
