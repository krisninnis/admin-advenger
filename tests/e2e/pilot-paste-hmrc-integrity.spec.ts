import { expect, test, type Page } from "@playwright/test";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";

const FULL_TAX_CODE_NOTICE = `HMRC
HM Revenue & Customs

Tax Code Notice

Page 1 of 2

Tax year: 6 April 2026 to 5 April 2027

This is to tell you your tax code.
Your tax code has changed from C1263L to C1254L.

Employer: Harbour View Opticians Ltd

Previous tax code: C1263L
New code: C1254L

How we worked out your tax code:

Personal Allowance             £12,570
Flat-rate job expenses            £60
Medical insurance                 £88
Total tax-free amount          £12,542

Page 2 of 2

Your tax code for the tax year 2026 to 2027 is C1254L.
This means you can earn £12,542 before you start paying tax.

If you think this tax code is wrong, contact HMRC.`;

const prepareCleanPublicApp = async (page: Page) => {
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
};

const submitMessage = async (page: Page, message: string, question = "What is this?") => {
  await page.getByLabel("Paste text or drop a document here").fill(message);
  await page.getByLabel("What would you like to know about this?").fill(question);
  await page.getByRole("button", { name: "What does this mean?" }).click();
  await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 30_000 });
};

const expectHmrcIntegrityResult = async (page: Page) => {
  const panel = page.getByTestId("result-panel");
  const dates = page.getByTestId("result-dates");
  const visible = await panel.innerText();

  await expect(page.getByTestId("result-title")).toContainText("HMRC tax code notice");
  expect(visible).toContain("not a tax bill");
  expect(visible).toContain("C1263L");
  expect(visible).toContain("C1254L");
  expect(visible).toMatch(/chang(?:ed|ing) (?:your tax code )?from C1263L to C1254L/i);
  expect(visible).not.toContain("Urgent message to check");
  expect(visible).not.toContain("The sender uses urgent wording.");

  await expect(dates).toContainText("Period start");
  await expect(dates).toContainText("6 April 2026");
  await expect(dates).toContainText("Period end");
  await expect(dates).toContainText("5 April 2027");
  await expect(dates).not.toContainText("No clear date was found");
  await expect(dates).not.toContainText(/deadline|payment due|reply deadline/i);
  expect(visible).toContain("Preparation only. Nothing has been sent. Nothing has been submitted.");
};

test.describe("P-PASTE HMRC integrity", () => {
  test.beforeEach(async ({ page }) => {
    await prepareCleanPublicApp(page);
  });

  test("the exact accepted fixture produces a direct, source-grounded clean-state result", async ({ page }) => {
    await submitMessage(page, FULL_TAX_CODE_NOTICE);
    await expectHmrcIntegrityResult(page);
  });

  test("a prior legitimate urgent result cannot contaminate the retained App state", async ({ page }) => {
    await submitMessage(page, "Urgent: check your account today.");
    await expect(page.getByTestId("result-title")).toHaveText("Urgent message to check");
    await expect(page.getByTestId("result-evidence")).toContainText("Urgent");

    await submitMessage(page, FULL_TAX_CODE_NOTICE);
    await expectHmrcIntegrityResult(page);
  });
});
