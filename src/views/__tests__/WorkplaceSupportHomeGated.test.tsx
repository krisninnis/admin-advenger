import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultCaseSheet } from "../../components/ResultCaseSheet";
import { buildAdviserExportPack, renderAdviserExportMarkdown } from "../../lib/adviserExportPack";
import { analyseDecisionProblem } from "../../lib/decisionEngine/decisionEngine";
import { buildResultViewModel } from "../../lib/resultViewModel";
import { findForbiddenSafetyPhrases, normaliseSafetyText } from "../../lib/safetyWording";
import { buildWorkplaceSupportPack } from "../../lib/workplaceSupportPack";
import homeViewSource from "../HomeView.tsx?raw";

const forbiddenWorkplacePhrases = [
  "employer broke the law",
  "you will win",
  "unfair dismissal proven",
  "discrimination proven",
  "valid claim",
  "invalid claim",
  "case strength",
  "success chance",
  "win chance",
  "tribunal prediction",
  "compensation owed",
  "you are owed",
  "money saved",
  "money recovered",
  "resign now",
  "refuse the meeting",
  "sign the agreement",
  "do not sign the agreement",
];

const disciplinaryText = `
Subject: Disciplinary meeting invite

You are invited to a disciplinary meeting with HR on 18 August at 10am.
The meeting will discuss alleged lateness and you may bring a companion.
Please contact People Team if you need documents or support.
`;

const settlementText = `
Subject: Settlement agreement

Please review the attached settlement agreement and without prejudice covering
letter. Contact the solicitor named in the document before the response date.
`;

const wageText = `
Subject: Payroll deduction query

Your payslip shows a deduction of £86.40 for uniform costs in the July pay
period. Contact payroll if you need a breakdown.
`;

const resignationText = `
Subject: Workplace concern

I feel pressured to resign and I am thinking about walking out after the
meeting. I want to understand what to organise before I speak to anyone.
`;

const renderWorkplaceCaseSheet = (text: string) => {
  const workplaceSupportPack = buildWorkplaceSupportPack({ text });
  const resultViewModel = buildResultViewModel({ workplaceSupportPack });
  const adviserExportPack = buildAdviserExportPack({
    resultViewModel,
    workplaceSupportPack,
  });
  const html = renderToStaticMarkup(
    <ResultCaseSheet
      model={resultViewModel}
      adviserExportPack={adviserExportPack}
      workplaceSupportPack={workplaceSupportPack}
      onDownloadAdviserPack={() => undefined}
      supportingDetailsOpen={false}
      onToggleSupportingDetails={() => undefined}
    />,
  );
  const markdown = renderAdviserExportMarkdown(adviserExportPack);

  return {
    workplaceSupportPack,
    resultViewModel,
    adviserExportPack,
    html,
    markdown,
    normalised: normaliseSafetyText(`${html}\n${markdown}`),
  };
};

const expectNoForbiddenWorkplaceWording = (text: string) => {
  const normalised = normaliseSafetyText(text);

  for (const phrase of forbiddenWorkplacePhrases) {
    expect(normalised).not.toContain(normaliseSafetyText(phrase));
  }

  expect(findForbiddenSafetyPhrases(text)).toEqual([]);
};

describe("HomeView gated workplace support beta", () => {
  it("does not promote the Workplace support beta from public Home", () => {
    expect(homeViewSource).not.toContain("Workplace support beta");
    expect(homeViewSource).not.toContain(
      "Use this for workplace letters or messages when you want a preparation",
    );
    expect(homeViewSource).not.toContain("workplaceBetaEnabled");
  });

  it("keeps the default Check a message path on the normal onCheck flow", () => {
    expect(homeViewSource).toContain("buildCheckSourceTitle(rawText, attachedFiles)");
    expect(homeViewSource).toContain("submitAcceptedText({");
    expect(homeViewSource).toContain("acceptedText: textToCheck");
    expect(homeViewSource).not.toContain("buildWorkplaceSupportPack");
  });


  it("does not keep dormant workplace result wiring in Home", () => {
    expect(homeViewSource).not.toContain("setWorkplaceBetaResult");
    expect(homeViewSource).not.toContain("workplaceSupportPack={workplaceSupportPack}");
    expect(homeViewSource).toContain("onDownloadAdviserPack");
  });

  it("selecting workplace beta renders workplace preparation through ResultCaseSheet", () => {
    const { html, markdown, normalised } = renderWorkplaceCaseSheet(disciplinaryText);

    expect(html).toContain("Disciplinary meeting preparation");
    expect(html).toContain("Workplace preparation only");
    expect(html).toContain("Preparation progress");
    expect(html).toContain("Download adviser pack");
    expect(markdown).toContain("## Workplace preparation pack");
    expect(normalised).toContain("this is preparation only, not legal or employment advice");
    expect(normalised).toContain("adminavenger helps prepare. you stay in control");
    expect(normalised).toContain("acas");
    expectNoForbiddenWorkplaceWording(`${html}\n${markdown}`);
  });

  it("settlement agreement input shows hard human-review warning and no signing advice", () => {
    const { workplaceSupportPack, adviserExportPack, html, markdown, normalised } =
      renderWorkplaceCaseSheet(settlementText);

    expect(workplaceSupportPack.documentType).toBe("settlement_agreement_signpost");
    expect(adviserExportPack.draft.included).toBe(false);
    expect(normalised).toContain("do not rely on adminavenger to decide what to do with a settlement agreement");
    expect(markdown).toContain("No draft was included in this pack.");
    expect(normalised).not.toContain("good deal");
    expect(normalised).not.toContain("bad deal");
    expect(normalised).not.toContain("do not sign");
    expect(normalised).not.toContain("sign the agreement");
    expectNoForbiddenWorkplaceWording(`${html}\n${markdown}`);
  });

  it("wage and pay input stays display-only and does not make money outcome claims", () => {
    const { workplaceSupportPack, html } = renderWorkplaceCaseSheet(wageText);
    const normalisedHtml = normaliseSafetyText(html);

    expect(workplaceSupportPack.documentType).toBe("wage_deduction_or_pay_issue");
    expect(normalisedHtml).toContain("Pay issue preparation".toLowerCase());
    expect(normalisedHtml).toContain("amounts are display-only");
    expect(normalisedHtml).not.toContain("you are owed");
    expect(normalisedHtml).not.toContain("money saved");
    expect(normalisedHtml).not.toContain("money recovered");
    expect(normalisedHtml).not.toContain("compensation owed");
  });

  it("resignation input stays neutral and signposted", () => {
    const { html, markdown, normalised } = renderWorkplaceCaseSheet(resignationText);

    expect(normalised).toContain("get advice before making a resignation decision");
    expect(normalised).not.toContain("resign now");
    expect(normalised).not.toContain("you should resign");
    expect(normalised).not.toContain("you should not resign");
    expect(normalised).toContain("acas");
    expectNoForbiddenWorkplaceWording(`${html}\n${markdown}`);
  });

  it("does not change the existing decision-engine classifier for workplace text", () => {
    const decisionResult = analyseDecisionProblem(disciplinaryText);

    expect(decisionResult.documentType).toBe("unknown_admin_dispute");
  });
});
