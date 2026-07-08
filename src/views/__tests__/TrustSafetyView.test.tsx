import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findForbiddenSafetyPhrases } from "../../lib/safetyWording";
import { TrustSafetyView } from "../TrustSafetyView";

const getTrustSafetyHtml = () => renderToStaticMarkup(<TrustSafetyView />);

describe("TrustSafetyView", () => {
  it("renders the Trust & safety heading and control principle", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("Trust &amp; safety");
    expect(html).toContain("AdminAvenger helps prepare. You stay in control.");
  });

  it("keeps send, submit, and advice boundaries visible", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("AdminAvenger does not send or submit anything for me.");
    expect(html).toContain(
      "It does not provide legal, benefits, debt, financial, medical, or immigration advice.",
    );
  });

  it("explains date and money safety", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("must be checked against the original letter");
    expect(html).toContain("Money is display-only.");
    expect(html).toContain(
      "AdminAvenger has not checked whether it is correct, owed, payable, a saving, or recoverable.",
    );
  });

  it("explains adviser packs as local and user-controlled", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("Adviser packs download to your device as Markdown.");
    expect(html).toContain("you control what you enter, save, download, share, or delete");
    expect(html).toContain("not upload adviser packs or send them anywhere");
  });

  it("keeps cannot-know limits visible", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("What AdminAvenger cannot know");
    expect(html).toContain("whether evidence is enough");
    expect(html).toContain("whether OCR or text extraction missed something");
  });

  it("links local data clearing back to Settings", () => {
    const html = getTrustSafetyHtml();

    expect(html).toContain("Want to clear local data?");
    expect(html).toContain("clear AdminAvenger data saved in this browser from Settings");
    expect(html).toContain("does not delete files you already downloaded");
  });

  it("contains no forbidden safety phrases", () => {
    const html = getTrustSafetyHtml();

    expect(findForbiddenSafetyPhrases(html)).toEqual([]);
  });
});
