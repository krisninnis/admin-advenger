// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import appShellSource from "../AppShell.tsx?raw";
import { AppShell } from "../AppShell";

const runtimeGlobal = globalThis as unknown as { process: { cwd: () => string } };
const indexCss = readFileSync(
  resolve(runtimeGlobal.process.cwd(), "src/index.css"),
  "utf8",
);

afterEach(cleanup);

describe("shared mobile care-path focus clearance", () => {
  it("coordinates the fixed navigation and active content through one clearance token", () => {
    render(
      <AppShell
        currentView="home"
        onNavigate={vi.fn()}
        caseCount={0}
        findingCount={0}
      >
        <button type="button">Care choice</button>
      </AppShell>,
    );

    expect(screen.getByRole("navigation", { name: "Mobile navigation" }).getAttribute(
      "data-mobile-navigation-clearance",
    )).toBe("true");
    expect(
      screen.getByRole("button", { name: "Care choice" }).closest(
        "[data-mobile-nav-scroll-clearance]",
      ),
    ).toBeTruthy();
    expect(appShellSource).toContain("min-h-[var(--mobile-navigation-clearance)]");
  });

  it("applies scroll padding and focus margin only below the desktop breakpoint", () => {
    expect(indexCss).toContain("--mobile-navigation-clearance");
    expect(indexCss).toMatch(/@media \(max-width: 47\.999rem\)/);
    expect(indexCss).toContain(
      "scroll-padding-block-end: var(--mobile-navigation-clearance)",
    );
    expect(indexCss).toContain(
      "scroll-margin-block-end: var(--mobile-navigation-clearance)",
    );

    const mobileRuleStart = indexCss.indexOf("@media (max-width: 47.999rem)");
    expect(mobileRuleStart).toBeGreaterThan(-1);
    expect(indexCss.slice(0, mobileRuleStart)).not.toContain(
      "scroll-margin-block-end: var(--mobile-navigation-clearance)",
    );
    expect(indexCss.slice(0, mobileRuleStart)).not.toContain(
      "scroll-padding-block-end: var(--mobile-navigation-clearance)",
    );
  });

  it("keeps the existing horizontal-overflow guard", () => {
    expect(indexCss).toMatch(/html,\s*body\s*\{[\s\S]*?overflow-x: hidden/);
  });
});
