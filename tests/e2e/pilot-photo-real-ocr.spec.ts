import { expect, test, type Page, type Request, type TestInfo, type Worker } from "@playwright/test";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";

const FIXTURE_LINES = [
  "Northshore Utilities",
  "Account update notice",
  "Document date: 18 August 2026",
  "Account reference: NU-48271",
  "Current monthly payment: £64.00",
  "New monthly payment: £69.50",
  "Effective date: 1 September 2026",
  "Please contact us by 25 August 2026.",
  "Your supply will not be disconnected.",
  "No late-payment fee will be added.",
  "This is a synthetic test document.",
] as const;

// Slice E draws the synthetic document deterministically in the browser with
// HTML canvas - no committed binary fixture, no image-generation dependency,
// no personal data. The "downscaled" variant is one deliberate, deterministic
// degradation (render -> half-size -> restored size, i.e. mild downscale
// sharpness loss) to exercise a modestly lower-quality read through the same
// real OCR path.
export type SyntheticFixtureVariant = "clean" | "downscaled";

type ObservedRequest = {
  url: string;
  method: string;
  resourceType: string;
  postDataBytes: number;
};

type CriticalCheck = {
  name: string;
  found: boolean;
};

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

const renderSyntheticDocument = async (
  page: Page,
  variant: SyntheticFixtureVariant,
): Promise<Buffer> => {
  const dataUrl = await page.evaluate(async ({ lines, applyDownscale }) => {
    await document.fonts.ready;
    const base = document.createElement("canvas");
    base.width = 1600;
    base.height = 2200;
    const context = base.getContext("2d");

    if (!context) throw new Error("Canvas 2D context unavailable");

    context.fillStyle = "#303030";
    context.fillRect(0, 0, base.width, base.height);
    context.fillStyle = "#ffffff";
    context.fillRect(100, 100, 1400, 2000);
    context.strokeStyle = "#d0d0d0";
    context.lineWidth = 3;
    context.strokeRect(100, 100, 1400, 2000);

    context.fillStyle = "#000000";
    context.textBaseline = "alphabetic";
    context.font = "700 64px Arial, sans-serif";
    context.fillText(lines[0], 190, 270);
    context.font = "700 46px Arial, sans-serif";
    context.fillText(lines[1], 190, 380);
    context.font = "42px Arial, sans-serif";
    lines.slice(2).forEach((line, index) => {
      context.fillText(line, 190, 520 + index * 145);
    });

    // Deterministic mild downscale/compression: collapse to half size, then
    // restore to the same dimensions. No random values, so a rerun always
    // produces the identical degraded PNG on the same machine.
    if (applyDownscale) {
      const small = document.createElement("canvas");
      small.width = Math.round(base.width / 2);
      small.height = Math.round(base.height / 2);
      const smallContext = small.getContext("2d");
      if (!smallContext) throw new Error("Canvas 2D context unavailable");
      smallContext.drawImage(base, 0, 0, small.width, small.height);

      const restored = document.createElement("canvas");
      restored.width = base.width;
      restored.height = base.height;
      const restoredContext = restored.getContext("2d");
      if (!restoredContext) throw new Error("Canvas 2D context unavailable");
      restoredContext.drawImage(small, 0, 0, restored.width, restored.height);
      return restored.toDataURL("image/png");
    }

    return base.toDataURL("image/png");
  }, { lines: FIXTURE_LINES, applyDownscale: variant === "downscaled" });

  return Buffer.from(dataUrl.split(",")[1], "base64");
};

const criticalChecksFor = (text: string): CriticalCheck[] => [
  { name: "sender", found: /Northshore Utilities/i.test(text) },
  { name: "reference", found: /NU\s*-\s*48271/i.test(text) },
  { name: "current amount", found: /Current monthly payment\s*:\s*(?:£\s*)?64\.00/i.test(text) },
  { name: "new amount", found: /New monthly payment\s*:\s*(?:£\s*)?69\.50/i.test(text) },
  { name: "document date", found: /18 August 2026/i.test(text) },
  { name: "effective date", found: /1 September 2026/i.test(text) },
  { name: "contact date", found: /25 August 2026/i.test(text) },
  { name: "negative disconnection wording", found: /will not be disconnected/i.test(text) },
  { name: "negative late-fee wording", found: /No late-payment fee will be added/i.test(text) },
];

const waitForOcrOutcome = async (page: Page) => {
  const reviewButton = page.getByRole("button", { name: "Review or edit the text we could read" });
  const trustedCheckButton = page.getByRole("button", { name: "Check this text" });

  await expect.poll(
    async () => (await reviewButton.isVisible()) || (await trustedCheckButton.isVisible()),
    { timeout: 60_000, message: "real OCR did not reach a bounded review outcome" },
  ).toBe(true);

  const reviewRequired = await reviewButton.isVisible();
  if (reviewRequired) {
    await reviewButton.click();
  }

  const editor = reviewRequired
    ? page.getByLabel("Text to correct")
    : page.getByLabel("Edit the text if needed");
  await expect(editor).toBeVisible();

  return { reviewRequired, extractedText: await editor.inputValue() };
};

const runRealOcrRegression = async (
  page: Page,
  testInfo: TestInfo,
  options: { variant: SyntheticFixtureVariant },
) => {
  const observedRequests: ObservedRequest[] = [];
  const workerUrls: string[] = [];
  let fixtureSubmitted = false;

  const recordRequest = (request: Request) => {
    if (!fixtureSubmitted) return;
    observedRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      postDataBytes: request.postDataBuffer()?.byteLength ?? 0,
    });
  };
  const recordWorker = (worker: Worker) => workerUrls.push(worker.url());
  page.context().on("request", recordRequest);
  page.on("worker", recordWorker);

  await prepareCleanPublicApp(page);
  const fixture = await renderSyntheticDocument(page, options.variant);
  const appOrigin = new URL(page.url()).origin;

  await page.getByRole("button", { name: "Take or upload a photo" }).click();
  const dialog = page.getByRole("dialog", { name: "Take or upload a photo" });
  await expect(dialog).toBeVisible();
  fixtureSubmitted = true;
  const startedAt = Date.now();
  await dialog.getByLabel("Upload existing photo").setInputFiles({
    name: `northshore-utilities-synthetic-${options.variant}.png`,
    mimeType: "image/png",
    buffer: fixture,
  });

  const scanReview = page.getByText("Does the whole document look clear?", { exact: true });
  const noDocument = page.getByText("We couldn’t find a clear document in this photo.", { exact: true });
  await expect.poll(
    async () => (await scanReview.isVisible()) || (await noDocument.isVisible()),
    { timeout: 30_000, message: "synthetic photo did not reach scanner review" },
  ).toBe(true);

  const usedPreparedScan = await scanReview.isVisible();
  if (usedPreparedScan) {
    await page.getByRole("button", { name: "Yes, use this" }).click();
  } else {
    await page.getByRole("button", { name: "Use original photo anyway" }).click();
  }

  const { reviewRequired, extractedText } = await waitForOcrOutcome(page);
  const elapsedMs = Date.now() - startedAt;
  const confidenceText = reviewRequired
    ? "not shown in the fail-closed review UI"
    : await page.getByText(/OCR confidence: \d+%/).innerText();
  const confidence = Number(confidenceText.match(/OCR confidence: (\d+)%/)?.[1]);
  const criticalChecks = criticalChecksFor(extractedText);
  const missingCriticalFields = criticalChecks.filter(({ found }) => !found).map(({ name }) => name);
  const keyDetailsHeading = page.getByText("Key details found", { exact: true });
  const keyDetailsVisible = await keyDetailsHeading.isVisible();
  const keyDetailsText = keyDetailsVisible
    ? await keyDetailsHeading.locator("xpath=..").innerText()
    : "";
  const ocrAssetRequests = observedRequests.filter(({ url }) => new URL(url).pathname.startsWith("/ocr/"));

  // A real Tesseract run must load the actual worker, one compatible core, and
  // English trained data from the same app origin. This deliberately guards
  // against replacing recognition with a returned-text mock in a future test.
  expect(workerUrls.some((url) => new URL(url).pathname === "/ocr/tesseract/worker.min.js")).toBe(true);
  expect(ocrAssetRequests.some(({ url }) => new URL(url).pathname === "/ocr/tesseract/worker.min.js")).toBe(true);
  expect(ocrAssetRequests.some(({ url }) => new URL(url).pathname.startsWith("/ocr/tesseract-core/"))).toBe(true);
  expect(ocrAssetRequests.some(({ url }) => new URL(url).pathname === "/ocr/tesseract-data/eng.traineddata.gz")).toBe(true);
  expect(ocrAssetRequests.every(({ url }) => new URL(url).origin === appOrigin)).toBe(true);
  expect(observedRequests.filter(({ method }) => method !== "GET")).toEqual([]);
  expect(observedRequests.filter(({ postDataBytes }) => postDataBytes > 0)).toEqual([]);

  if (missingCriticalFields.length > 0) {
    expect(reviewRequired, `OCR missed or altered: ${missingCriticalFields.join(", ")}`).toBe(true);
    expect(keyDetailsVisible).toBe(false);
  } else if (!reviewRequired) {
    expect(keyDetailsVisible).toBe(true);
    expect(Number.isFinite(confidence)).toBe(true);
  }

  expect(keyDetailsText).not.toMatch(/28 August 2026|25 August 2076|NU-48214|£63\.50/i);
  expect(keyDetailsText).not.toMatch(/(?:will|may) be disconnected|late-payment fee will be added/i);

  const diagnostics = {
    fixture: `synthetic canvas; no personal data; variant=${options.variant}`,
    usedPreparedScan,
    elapsedMs,
    confidence: Number.isFinite(confidence) ? confidence : confidenceText,
    reviewRequired,
    keyDetailsVisible,
    criticalChecks,
    warnings: await page.locator('[role="alert"]').allInnerTexts(),
    extractedTextSummary: extractedText.replace(/\s+/g, " ").trim(),
    ocrAssetRequests: ocrAssetRequests.map(({ url }) => new URL(url).pathname),
    workerUrls,
  };
  console.log(`[real-ocr-diagnostics-${options.variant}] ${JSON.stringify(diagnostics)}`);
  await testInfo.attach(`real-ocr-diagnostics-${options.variant}.json`, {
    body: Buffer.from(JSON.stringify(diagnostics, null, 2)),
    contentType: "application/json",
  });
};

test("real local Tesseract preserves critical synthetic photo facts or fails closed", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await runRealOcrRegression(page, testInfo, { variant: "clean" });
});

test("real local Tesseract on a mildly downscaled synthetic photo preserves critical facts or fails closed", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await runRealOcrRegression(page, testInfo, { variant: "downscaled" });
});