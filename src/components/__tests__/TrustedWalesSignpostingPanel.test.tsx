// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrustedWalesSignpostingPanel } from "../TrustedWalesSignpostingPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const OFFER = "Find trusted support in Wales";
const HEADING = "Trusted places to try next";

const renderPanel = (today = "2026-08-06") => {
  render(<TrustedWalesSignpostingPanel today={today} />);
  return userEvent.setup();
};

const openPanel = async (today = "2026-08-06") => {
  const user = renderPanel(today);
  await user.click(screen.getByRole("button", { name: OFFER }));
  return user;
};

describe("the optional disclosure", () => {
  it("is closed by default and requires its explicit button", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: OFFER })).toBeTruthy();
    expect(screen.queryByRole("region", { name: HEADING })).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens and closes with real buttons", async () => {
    const user = await openPanel();
    expect(screen.getByRole("region", { name: HEADING })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close trusted support" }));
    expect(screen.queryByRole("region", { name: HEADING })).toBeNull();
    expect(screen.getByRole("button", { name: OFFER })).toBeTruthy();
  });
});

describe("the visible governed directory", () => {
  it("shows exactly three sources as a semantic list in governed order", async () => {
    await openPanel();

    const list = screen.getByRole("list", { name: "Trusted Wales sources" });
    const items = Array.from(list.children) as HTMLElement[];
    expect(items).toHaveLength(3);
    expect(items.map((item) => within(item).getAllByRole("heading")[0].textContent)).toEqual([
      "Welsh Government",
      "Carers UK, including Carers Wales",
      "Carers Trust",
    ]);
  });

  it("shows organisation types in text", async () => {
    await openPanel();

    expect(screen.getAllByText("Official Wales service")).toHaveLength(1);
    expect(screen.getAllByText("Charity")).toHaveLength(2);
  });

  it("shows short source descriptions and material limitations", async () => {
    await openPanel();

    expect(screen.getByText(/Find your council website using a postcode/i)).toBeTruthy();
    expect(screen.getByText(/Information and support for questions about caring/i)).toBeTruthy();
    expect(screen.getByText(/Search for a local Carers Trust Network Partner/i)).toBeTruthy();
    expect(screen.getByText(/cannot provide an individual help and information service/i)).toBeTruthy();
  });

  it("uses safe descriptive website links", async () => {
    await openPanel();

    const links = screen.getAllByRole("link", { name: /Open official website/i });
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")?.split(" ").sort()).toEqual([
        "noopener",
        "noreferrer",
      ]);
      expect(link.textContent).toContain("leaves AdminAvenger");
    }
  });

  it("renders verified phone links without activating either automatically", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await openPanel();

    const phoneLinks = screen.getAllByRole("link", { name: /^Call /i });
    expect(phoneLinks).toHaveLength(2);
    expect(phoneLinks.map((link) => link.getAttribute("href"))).toEqual([
      "tel:+448088087777",
      "tel:+443007729600",
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows opening hours only for the two directly verified phones", async () => {
    await openPanel();

    expect(screen.getByText(/Opening hours: Monday to Friday, 9am to 6pm/)).toBeTruthy();
    expect(screen.getByText(/Opening hours: Monday to Friday, 9am to 5pm/)).toBeTruthy();
    expect(screen.getAllByText(/Opening hours:/)).toHaveLength(2);
  });
});

describe("provenance and boundaries", () => {
  it("shows the verification date and exact introduction", async () => {
    await openPanel();

    expect(
      screen.getByText(
        "These details come from official organisation websites and were checked on 6 August 2026. AdminAvenger has not contacted them and cannot promise what help they will offer.",
      ),
    ).toBeTruthy();
  });

  it("shows the non-referral, no-eligibility and changeable-details boundaries", async () => {
    await openPanel();

    expect(
      screen.getByText(
        "You decide whether to contact any organisation. AdminAvenger has not checked your eligibility, made a referral or shared your information.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Contact details and opening hours can change. Check the organisation's official website if a call does not connect or the service appears different.",
      ),
    ).toBeTruthy();
  });

  it("contains no recommendation, approval, guarantee or completed action claim", async () => {
    await openPanel();
    const text = screen.getByRole("region", { name: HEADING }).textContent ?? "";

    expect(text).not.toMatch(/recommended for you|best option|you should contact|you need to contact/i);
    expect(text).not.toMatch(/entitled|approved|guaranteed|referral completed|we contacted/i);
    expect(text).not.toMatch(/partner organisation/i);
  });

  it("marks stale details for rechecking and does not present hours as current", async () => {
    await openPanel("2026-11-07");

    expect(screen.getByText(/These details need rechecking/i)).toBeTruthy();
    expect(screen.getAllByText("Details need rechecking")).toHaveLength(3);
    expect(screen.queryByText(/^Opening hours:/)).toBeNull();
  });
});
