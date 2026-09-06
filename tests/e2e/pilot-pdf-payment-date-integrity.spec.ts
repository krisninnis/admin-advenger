import path from "node:path";
import { expect, test } from "@playwright/test";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";
const FIXTURE = path.resolve("audit-fixtures/journey-2-payment-reminder.pdf");

test("the production Greenfield PDF preserves payment and response date semantics", async ({ page }) => {
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
  await expect(page.getByText("PDF · Read locally in this browser")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Paste text" }).click();
  await page.getByLabel("What would you like to know about this?").fill("What is this?");
  await page.getByRole("button", { name: "What does this mean?" }).click();

  const panel = page.getByTestId("result-panel");
  const dates = page.getByTestId("result-dates");
  const bestNextMove = page.getByTestId("result-best-next-move");
  await expect(panel).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId("result-title")).toContainText("Payment reminder");
  await expect(panel).toContainText("Greenfield Water Services");
  await expect(panel).toContainText("GW-48291");
  await expect(panel).toContainText(/£84\.60|GBP 84\.60/);

  await expect(dates).toContainText("Document date: 14 July 2026");
  await expect(dates).toContainText("Payment due date: 10 July 2026");
  await expect(dates).toContainText("Deadline stated in the message: 24 July 2026");
  await expect(dates).not.toContainText("Payment due date: 24 July 2026");

  await expect(page.getByTestId("result-status")).toContainText("Source-stated date has passed: 10 July 2026");
  await expect(bestNextMove).toContainText("payment due date (10 July 2026)");
  await expect(bestNextMove).toContainText("pay-or-contact date (24 July 2026)");
  await expect(bestNextMove).toContainText("have both passed");
  await expect(bestNextMove).toContainText("Verify the current account status");
  await expect(bestNextMove).not.toContainText(/(?:contact|pay)[^.]*\b(?:before|by)\s+24 July 2026/i);

  await expect(bestNextMove).toContainText("whether the account reference belongs to you (GW-48291)");
  await expect(bestNextMove).toContainText("whether the amount is correct (£84.60)");
  await expect(bestNextMove).toContainText("whether it has already been paid");
  await expect(bestNextMove).toContainText("whether this has already been resolved");
  await expect(bestNextMove).toContainText("without deciding that the amount is valid or legally owed");
  await expect(page.getByTestId("result-deadline-clarity")).toContainText(
    "cannot tell from this date alone what missing it means for your options",
  );
  await expect(panel).toContainText("Preparation only. Nothing has been sent. Nothing has been submitted.");
  await expect(panel).not.toContainText(/late fee (?:was|has been|will be) (?:added|charged)/i);
  await expect(panel).not.toContainText(/(?:penalty|penalties) (?:was|were|has been|have been|will be) (?:added|charged|applied)/i);
  await expect(panel).not.toContainText(/(?:lost|lose) (?:your )?rights/i);
  await expect(panel).not.toContainText(/water supply (?:will|may|has been|was) (?:be )?disconnected/i);
  await expect(panel).not.toContainText(/(?:contract|service) (?:will be|has been|was) cancelled/i);
  await expect(panel).not.toContainText(/(?:you|the user) (?:legally|definitely) owe/i);
  await expect(panel).not.toContainText(/(?:amount|balance) (?:is|remains) (?:legally|definitely) owed|legally liable/i);
  await expect(panel).not.toContainText(/(?:must|need to) pay (?:immediately|now)/i);
});
