import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";
import resultCaseSheetSource from "../../components/ResultCaseSheet.tsx?raw";

describe("HomeView adviser export UI", () => {
  it("shows the adviser pack download button and helper copy near the result", () => {
    expect(homeViewSource).toContain("ResultCaseSheet");
    expect(resultCaseSheetSource).toContain("Download adviser pack");
    expect(resultCaseSheetSource).toContain(
      "Creates a Markdown file you can save, print, or share with someone you",
    );
    expect(resultCaseSheetSource).toContain("trust. AdminAvenger does not send it anywhere.");
    expect(resultCaseSheetSource).toContain("AdminAvenger does not send it anywhere.");
  });

  it("uses the local Markdown renderer and local download helper", () => {
    expect(homeViewSource).toContain("renderAdviserExportMarkdown");
    expect(homeViewSource).toContain("downloadAdviserExportMarkdown");
    expect(homeViewSource).toContain("getAdviserExportFilename");
  });
});
