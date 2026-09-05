import path from "node:path";
import { expect, test } from "@playwright/test";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";
const FIXTURE = path.resolve("audit-fixtures/journey-3-service-notice.docx");

test("the production Northbridge DOCX shows source-grounded passed-date clarity at the top", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-05T12:00:00.000Z") });
  await page.goto("/");
  await page.evaluate(async ({ termsKey, termsVersion }) => {
    localStorage.clear();
    sessionStorage.clear();
    const databases = await indexedDB.databases();
    await Promise.all(databases.map((database) => new Promise<void>((resolve, reject) => {
      if (!database.name) return resolve();
      const request = indexedDB.deleteDatabase(database.name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error(`Deletion blocked: ${database.name}`));
    })));
    localStorage.setItem(termsKey, termsVersion);
  }, { termsKey: TERMS_KEY, termsVersion: TERMS_VERSION });
  await page.reload();

  await page.getByRole("button", { name: "Upload a file" }).click();
  await page.getByLabel("Choose photos or files").setInputFiles(FIXTURE);
  await expect(page.getByText("Word document · Read locally in this browser")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("What would you like to know about this?").fill("What is this?");
  await page.getByRole("button", { name: "What does this mean?" }).click();

  const panel = page.getByTestId("result-panel");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("result-status")).toHaveText("Source-stated date has passed: 29 July 2026");
  await expect(page.getByTestId("result-secondary-status")).toHaveText("Potential saving opportunity — not confirmed yet");
  await expect(page.getByTestId("result-deadline-clarity")).toContainText(
    "contacting Northbridge Broadband if any details appeared incorrect",
  );
  await expect(page.getByTestId("result-best-next-move")).toContainText("Northbridge Broadband");
  await expect(page.getByTestId("result-best-next-move")).toContainText("NB-73104");
  await expect(panel).toContainText("£29");
  await expect(panel).toContainText("£32.50");
  await expect(panel).toContainText("1 August 2026");
  await expect(panel).toContainText("29 July 2026");
  await expect(panel).toContainText("Preparation only. Nothing has been sent. Nothing has been submitted.");
  await expect(panel).not.toContainText("Identify the sender, date, reference, and deadline");
  await expect(panel).not.toContainText(/lost (?:your )?rights|service (?:was|has been) cancelled|service (?:was|has been) disconnected|penalty/i);
});
