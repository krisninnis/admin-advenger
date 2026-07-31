import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { PUBLIC_MESSAGE_BROWSER_IDS } from "../../src/lib/publicMessageEvaluation/corpusManifestV1";
import { publicMessageBrowserCorpusV1 } from "../../src/lib/publicMessageEvaluation/corpusV1";
import type { PublicMessageScenario } from "../../src/lib/publicMessageEvaluation/types";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";

type BrowserExpectation = {
  title: string;
  status: string;
  nextMove: string;
  dates?: readonly string[];
  periods?: readonly string[];
  references?: readonly string[];
  money?: { value: string; classification: string };
  evidence: readonly (string | readonly string[])[];
  prohibited: readonly string[];
};

const browserExpectations: Record<(typeof PUBLIC_MESSAGE_BROWSER_IDS)[number], BrowserExpectation> = {
  "refunds_purchases-03-refund_promised": {
    title: "Refund promised",
    status: "Refund promised - not confirmed received",
    nextMove: "Monitor the promised refund for 10 working days",
    periods: ["10 working days"],
    money: { value: "39.00", classification: "Promised refund - not received" },
    evidence: ["Refund promised", "not confirmed received"],
    prohibited: ["refund received", "refund has arrived", "No obvious saving or action found"],
  },
  "complaints_disputes-11-open_after_closure": {
    title: "Complaint opportunity",
    status: "new",
    nextMove: "Keep the complaint reference and wait for the response",
    references: ["CMP-505"],
    evidence: ["complaint", "open"],
    prohibited: ["complaint resolved", "No obvious saving or action found"],
  },
  "benefits_public_administration-01-uc_appointment": {
    title: "Universal Credit appointment to prepare for",
    status: "ready_to_act",
    nextMove: "Check the Universal Credit appointment details and prepare to attend",
    dates: ["13 August 2026"],
    evidence: ["Universal Credit", "appointment"],
    prohibited: ["benefit entitlement confirmed", "No obvious saving or action found"],
  },
  "employment_income-09-disciplinary_invitation": {
    title: "Disciplinary hearing invitation to prepare for",
    status: "ready_to_act",
    nextMove: "Review the disciplinary invitation and gather relevant records",
    dates: ["28 August 2026"],
    evidence: ["disciplinary", ["hearing", "invitation"], ["attached", "evidence"]],
    prohibited: ["disciplinary outcome decided", "No obvious saving or action found"],
  },
  "housing_utilities-07-possession_wording": {
    title: "Possession notice needs urgent checking",
    status: "ready_to_act",
    nextMove: "Check the possession notice urgently and seek independent housing advice",
    dates: ["30 September 2026"],
    evidence: ["possession", "court action", ["independent housing advice", "specialist support"]],
    prohibited: ["you must leave", "No obvious saving or action found"],
  },
  "security_scams-01-suspicious_payment": {
    title: "Email needs safety check",
    status: "Caution - verify before acting",
    nextMove: "Avoid making the requested payment or using the message's link",
    money: { value: "499.00", classification: "Amount requested by message" },
    evidence: ["Suspected payment-pressure scam pattern", "Amount requested by message", ["official website", "official app"]],
    prohibited: ["this is a scam", "payment is owed", "No obvious saving or action found"],
  },
  "neutral_low_action-01-receipt": {
    title: "Proof of purchase found",
    status: "new",
    nextMove: "Identify the sender, date, reference, and deadline",
    money: { value: "14.20", classification: "Receipt value" },
    evidence: ["receipt", "no action"],
    prohibited: ["refund due", "payment required"],
  },
  "mandatory-a-pending-waiver": {
    title: "Account closed - balance needs checking",
    status: "Provider confirmation - charge outcome still under review",
    nextMove: "Wait for the provider's decision and keep the follow-up point",
    periods: ["within 21 days"],
    references: ["BR-10482"],
    money: { value: "152.75", classification: "Balance under review" },
    evidence: ["account has been closed", "still under review", "no waiver decision"],
    prohibited: ["waiver is approved", "No obvious saving or action found"],
  },
  "mandatory-b-clean-resolved": {
    title: "Account closure confirmed",
    status: "Provider confirmation - resolved",
    nextMove: "Keep the confirmation and monitor the account",
    references: ["CLS-9318"],
    money: { value: "93.18", classification: "Former balance" },
    evidence: ["account has been closed", ["removed", "cancelled"], "no payment is required"],
    prohibited: ["payment is still due", "No obvious saving or action found"],
  },
  "mandatory-c-conditional-closure": {
    title: "Account closure needs a document",
    status: "Provider action - account remains open until the required document is sent",
    nextMove: "Send the required document before the deadline",
    dates: ["12 August 2026"],
    references: ["DOC-12884"],
    evidence: ["account remains active", "monthly charges will continue", "death certificate"],
    prohibited: ["account is closed", "No obvious saving or action found"],
  },
  "mandatory-d-final-notice": {
    title: "Payment reminder to check",
    status: "Payment reminder - check before acting",
    nextMove: "Check the account, amount, and payment status",
    dates: ["7 August 2026"],
    references: ["COL-21077"],
    money: { value: "210.00", classification: "Amount being requested" },
    evidence: ["further collection activity", ["pay", "contact the provider"]],
    prohibited: ["no payment is required", "No obvious saving or action found"],
  },
  "mandatory-e-future-liability": {
    title: "Account closed - balance needs checking",
    status: "Provider confirmation - future payment decision still pending",
    nextMove: "Wait for the provider's decision and keep the follow-up point",
    money: { value: "58.90", classification: "Balance under review" },
    evidence: ["payment is not requested today", "may become payable after review", "review is still pending"],
    prohibited: ["balance is waived", "No obvious saving or action found"],
  },
};

const normalise = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

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

const attachFailure = async (page: Page, testInfo: TestInfo, scenario: PublicMessageScenario, visibleText: string, error: unknown) => {
  await testInfo.attach(`${scenario.id}-failure.json`, {
    body: Buffer.from(JSON.stringify({ scenarioId: scenario.id, expected: browserExpectations[scenario.id as keyof typeof browserExpectations], visibleText, error: error instanceof Error ? error.message : String(error) }, null, 2)),
    contentType: "application/json",
  });
  await testInfo.attach(`${scenario.id}-failure.png`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
};

const expectConcept = (text: string, concept: string | readonly string[], label: string) => {
  const alternatives = typeof concept === "string" ? [concept] : concept;
  expect(alternatives.some((value) => normalise(text).includes(normalise(value))), `${label}: ${alternatives.join(" | ")}`).toBe(true);
};

test.describe("public-message adversarial browser subset", () => {
  test("contains the exact immutable representative matrix", () => {
    expect(publicMessageBrowserCorpusV1.map((scenario) => scenario.id)).toEqual(PUBLIC_MESSAGE_BROWSER_IDS);
    expect(Object.keys(browserExpectations)).toEqual([...PUBLIC_MESSAGE_BROWSER_IDS]);
  });

  for (const scenario of publicMessageBrowserCorpusV1) {
    test(`${scenario.id} preserves structured browser-visible semantics`, async ({ page }, testInfo) => {
      let visibleText = "";
      try {
        await prepareCleanPublicApp(page);
        await page.getByLabel("Paste text or drop a document here").fill(scenario.message);
        await page.getByLabel("What would you like to know about this?").fill(scenario.userQuestion ?? "What does this mean?");
        await page.getByRole("button", { name: "What does this mean?" }).click();

        const panel = page.getByTestId("result-panel");
        await expect(panel).toBeVisible({ timeout: 30_000 });
        visibleText = await panel.innerText();
        const expected = browserExpectations[scenario.id as keyof typeof browserExpectations];

        await expect(page.getByTestId("result-title")).toHaveText(expected.title);
        await expect(page.getByTestId("result-status")).toHaveText(expected.status);
        await expect(page.getByTestId("result-best-next-move")).toContainText(expected.nextMove);

        const dates = await page.getByTestId("result-dates").innerText();
        for (const date of expected.dates ?? []) expect(normalise(dates)).toContain(normalise(date));

        const checkFirst = await page.getByTestId("result-check-first").innerText();
        for (const reference of expected.references ?? []) expect(normalise(checkFirst)).toContain(normalise(reference));

        const money = await page.getByTestId("result-money").innerText();
        if (expected.money) {
          expect(normalise(money)).toContain(normalise(expected.money.value));
          expect(normalise(money)).toContain(normalise(expected.money.classification));
          expect(normalise(money)).toContain("not counted");
        }

        const evidence = await page.getByTestId("result-evidence").innerText();
        const structuredVisible = [visibleText, evidence, checkFirst].join("\n");
        for (const period of expected.periods ?? []) expectConcept(structuredVisible, period, "Missing period");
        for (const concept of expected.evidence) expectConcept(structuredVisible, concept, "Missing evidence concept");
        for (const prohibited of expected.prohibited) expect(normalise(visibleText)).not.toContain(normalise(prohibited));
      } catch (error) {
        await attachFailure(page, testInfo, scenario, visibleText, error);
        throw error;
      }
    });
  }
});
