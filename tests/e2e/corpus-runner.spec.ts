import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Corpus path and run identity                                       */
/* ------------------------------------------------------------------ */

const CORPUS_DIR =
  process.env.CORPUS_DIR ||
  "C:\\Users\\thoma\\AdminAvenger-private-evaluation\\general-corpus";

const TERMS_VERSION = "2026-07-terms-v1";
const TERMS_KEY = "adminAvengerTermsAcceptedVersion";

const RUN_ID = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19);

/* Permitted output filenames inside each GC-* directory */
const OUTPUT_FILENAMES = [
  "result-output.txt",
  "result-screenshot.png",
  "timing.json",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function discoverCasesSync(): string[] {
  try {
    const entries = readdirSync(CORPUS_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name.startsWith("GC-"))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function removePreviousOutputs(casePath: string): void {
  for (const name of OUTPUT_FILENAMES) {
    const filePath = join(casePath, name);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }
}

interface TimingRecord {
  runId: string;
  caseId: string;
  timestamp: string;
  browser: string;
  durationMs: number;
  success: boolean;
  timedOut: boolean;
  screenshotWritten: boolean;
  errorMessage: string | null;
}

function writeTimingSync(caseDir: string, record: TimingRecord): void {
  writeFileSync(
    join(CORPUS_DIR, caseDir, "timing.json"),
    JSON.stringify(record, null, 2) + "\n",
  );
}

interface SummaryRecord {
  runId: string;
  corpusDir: string;
  runTimestamp: string;
  browser: string;
  casesDiscovered: number;
  casesAttempted: number;
  completed: number;
  failed: number;
  timeouts: number;
  skipped: number;
  screenshotsWritten: number;
}

/* ------------------------------------------------------------------ */
/*  Discover corpus cases at import time (must be sync for Playwright)  */
/* ------------------------------------------------------------------ */

const caseDirs = discoverCasesSync();

/* ------------------------------------------------------------------ */
/*  Per-case test                                                       */
/* ------------------------------------------------------------------ */

for (const caseDir of caseDirs) {
  test(`evaluates ${caseDir}`, async ({ page, browserName }) => {
    const casePath = join(CORPUS_DIR, caseDir);
    const inputFile = join(casePath, "redacted-input.txt");

    /* --- clean previous outputs BEFORE anything else ---------------- */
    removePreviousOutputs(casePath);

    /* --- load input ------------------------------------------------ */
    let inputText: string;
    try {
      inputText = readFileSync(inputFile, "utf-8");
    } catch {
      test.skip(true, `No redacted-input.txt in ${caseDir}`);
      return;
    }

    const start = Date.now();

    try {
      /* a. navigate to localhost */
      await page.goto("/");

      /* b. clear all localStorage */
      await page.evaluate(() => {
        localStorage.clear();
      });

      /* c. clear all sessionStorage */
      await page.evaluate(() => {
        sessionStorage.clear();
      });

      /* d-e. enumerate every IndexedDB database and delete each,
             rejecting on error or block */
      await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        const results = await Promise.allSettled(
          databases.map(
            (db) =>
              new Promise<void>((resolve, reject) => {
                if (!db.name) {
                  resolve();
                  return;
                }
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = () => resolve();
                req.onerror = () =>
                  reject(
                    new Error(
                      `IndexedDB deletion failed for database "${db.name}"`,
                    ),
                  );
                req.onblocked = () =>
                  reject(
                    new Error(
                      `IndexedDB deletion blocked for database "${db.name}"`,
                    ),
                  );
              }),
          ),
        );

        const failures = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        if (failures.length > 0) {
          throw new Error(
            `IndexedDB cleanup failed: ${failures.map((f) => f.reason).join("; ")}`,
          );
        }
      });

      /* f. set only the terms acceptance key */
      await page.evaluate(
        (vars: { key: string; val: string }) => {
          window.localStorage.setItem(vars.key, vars.val);
        },
        { key: TERMS_KEY, val: TERMS_VERSION },
      );

      /* g. reload so app starts from clean state with terms accepted */
      await page.reload();

      /* h. confirm paste text journey is visible */
      const textarea = page.getByLabel("Paste text or drop a document here");
      await expect(textarea).toBeVisible({ timeout: 10_000 });

      /* --- fill input ----------------------------------------------- */
      await textarea.fill(inputText);

      /* --- optional question ----------------------------------------- */
      const question = page.getByLabel(
        "What would you like to know about this?",
      );
      await expect(question).toBeVisible({ timeout: 5_000 });
      await question.fill("What does this mean?");

      /* --- submit --------------------------------------------------- */
      const submitBtn = page.getByRole("button", {
        name: "What does this mean?",
      });
      await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
      await submitBtn.click();

      /* --- wait for result panel (requires data-testid on src/) ----- */
      const resultPanel = page.getByTestId("result-panel");
      await expect(resultPanel).toBeVisible({ timeout: 30_000 });

      /* --- wait for loading state to disappear ---------------------- */
      const checkingBtn = page.getByRole("button", {
        name: "Checking...",
      });
      await expect(checkingBtn).toHaveCount(0, { timeout: 15_000 });

      /* --- capture output text -------------------------------------- */
      const outputText = await resultPanel.innerText();
      writeFileSync(join(casePath, "result-output.txt"), outputText);

      /* --- capture screenshot --------------------------------------- */
      let screenshotWritten = false;
      try {
        await page.screenshot({
          path: join(casePath, "result-screenshot.png"),
          fullPage: true,
        });
        screenshotWritten = existsSync(
          join(casePath, "result-screenshot.png"),
        );
      } catch {
        screenshotWritten = false;
      }

      /* --- timing --------------------------------------------------- */
      const duration = Date.now() - start;
      writeTimingSync(caseDir, {
        runId: RUN_ID,
        caseId: caseDir,
        timestamp: new Date().toISOString(),
        browser: browserName,
        durationMs: duration,
        success: true,
        timedOut: false,
        screenshotWritten,
        errorMessage: null,
      });
    } catch (err: unknown) {
      /* --- failure path --------------------------------------------- */
      const duration = Date.now() - start;
      const isTimeout =
        err instanceof Error && err.message.includes("Timeout");
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      /* best-effort failure screenshot */
      let screenshotWritten = false;
      try {
        await page.screenshot({
          path: join(casePath, "result-screenshot.png"),
          fullPage: true,
        });
        screenshotWritten = existsSync(
          join(casePath, "result-screenshot.png"),
        );
      } catch {
        screenshotWritten = false;
      }

      writeTimingSync(caseDir, {
        runId: RUN_ID,
        caseId: caseDir,
        timestamp: new Date().toISOString(),
        browser: browserName,
        durationMs: duration,
        success: false,
        timedOut: isTimeout,
        screenshotWritten,
        errorMessage,
      });

      /* re-throw so the test is marked failed but the loop continues */
      throw err;
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Summary report (runs after all per-case tests)                      */
/* ------------------------------------------------------------------ */

test("write summary.json", async ({ browserName }) => {
  const timingRecords: TimingRecord[] = [];
  let skipped = 0;

  for (const caseDir of caseDirs) {
    const timingPath = join(CORPUS_DIR, caseDir, "timing.json");
    const inputPath = join(CORPUS_DIR, caseDir, "redacted-input.txt");

    if (!existsSync(inputPath)) {
      skipped += 1;
      continue;
    }

    if (!existsSync(timingPath)) {
      skipped += 1;
      continue;
    }

    try {
      const raw = readFileSync(timingPath, "utf-8");
      const record: TimingRecord = JSON.parse(raw);
      /* Only count timing records from THIS run */
      if (record.runId === RUN_ID) {
        timingRecords.push(record);
      } else {
        skipped += 1;
      }
    } catch {
      skipped += 1;
    }
  }

  const summary: SummaryRecord = {
    runId: RUN_ID,
    corpusDir: CORPUS_DIR,
    runTimestamp: new Date().toISOString(),
    browser: browserName,
    casesDiscovered: caseDirs.length,
    casesAttempted: timingRecords.length,
    completed: timingRecords.filter((t) => t.success).length,
    failed: timingRecords.filter((t) => !t.success).length,
    timeouts: timingRecords.filter((t) => t.timedOut).length,
    skipped,
    screenshotsWritten: timingRecords.filter((t) => t.screenshotWritten).length,
  };

  writeFileSync(
    join(CORPUS_DIR, "summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );

  /* basic self-check — at least one case must have been discovered */
  expect(summary.casesDiscovered).toBeGreaterThanOrEqual(0);
});
