import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";
import { CovenantView } from "../CovenantView";

const getCovenantHtml = () => renderToStaticMarkup(<CovenantView />);

describe("CovenantView", () => {
  it("renders the Free-Forever Covenant title and core free promise", () => {
    const html = getCovenantHtml();

    expect(html).toContain("The AdminAvenger Free-Forever Covenant");
    expect(html).toContain("Any individual can check a letter for free");
  });

  it("renders the never-monetise promises", () => {
    const html = getCovenantHtml();

    expect(html).toContain("No advertising.");
    expect(html).toContain("No selling, renting, or sharing user data.");
    expect(html).toContain("No success fees.");
  });

  it("keeps human control visible without forbidden automation wording", () => {
    const html = getCovenantHtml();

    expect(html).toContain("AdminAvenger helps prepare. You stay in control.");
    expect(html).toContain("The app helps you understand what a letter appears to be");
    expect(html).toContain("Nothing is sent without you choosing to send it.");
    expect(html).toContain("Nothing is submitted without you choosing to submit it.");
    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });
});
