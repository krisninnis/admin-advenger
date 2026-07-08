import { describe, expect, it } from "vitest";
import homeViewSource from "../HomeView.tsx?raw";

describe("HomeView adviser export UI", () => {
  it("shows the adviser pack download button and helper copy near the result", () => {
    expect(homeViewSource).toContain("Download adviser pack");
    expect(homeViewSource).toContain(
      "Creates a Markdown file you can save, print, or share with someone you trust.",
    );
    expect(homeViewSource).toContain("AdminAvenger does not send it anywhere.");
  });

  it("uses the local Markdown renderer and local download helper", () => {
    expect(homeViewSource).toContain("renderAdviserExportMarkdown");
    expect(homeViewSource).toContain("downloadAdviserExportMarkdown");
    expect(homeViewSource).toContain("getAdviserExportFilename");
  });
});
