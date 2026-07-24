# AdminAvenger Corpus Evaluation Harness

Playwright-based harness for evaluating AdminAvenger against a private corpus
of already-redacted admin email inputs.

## What this does

- Reads redacted text from `GC-*/redacted-input.txt` in the private corpus
- Pastes each into AdminAvenger via the normal Paste text journey
- Captures the visible result text and a full-page screenshot
- Records per-case timing and a run summary
- Writes all outputs back into the private corpus directory

## What this does NOT do

- Access Gmail, email accounts, or any network service
- Save cases, create drafts, confirm outcomes, or trigger any app action
- Copy corpus content into the repository
- Judge whether AdminAvenger's answer is factually correct
- Modify any production source code

## Prerequisites

First-time setup downloads the Chromium browser binary (~150 MB). This
requires an internet connection and is only needed once:

```bash
npm install
npx playwright install chromium
```

After setup, corpus execution itself runs entirely against `localhost` — no
network access is required or used.

## Run the full corpus

```bash
npm run test:e2e
```

Or with a custom corpus path (PowerShell):

```powershell
$env:CORPUS_DIR = "C:\path\to\corpus"; npx playwright test tests/e2e/corpus-runner.spec.ts
```

Or with a custom corpus path (bash):

```bash
CORPUS_DIR="/path/to/corpus" npx playwright test tests/e2e/corpus-runner.spec.ts
```

## Run a single case

```bash
npx playwright test -g "GC-01-broadband-price-rise"
```

## Adding a new case

1. Create a directory under the corpus root:
   ```
   C:\Users\thoma\AdminAvenger-private-evaluation\general-corpus\
     GC-21-my-new-case\
   ```

2. Add `redacted-input.txt` with the pasted text to check:
   ```
   GC-21-my-new-case\
     redacted-input.txt
   ```

3. Run the harness. Output files are written alongside the input:
   ```
   GC-21-my-new-case\
     redacted-input.txt       (your input — never modified)
     result-output.txt        (AdminAvenger result text)
     result-screenshot.png    (full-page screenshot)
     timing.json              (per-case timing and status)
   ```

## Prerequisite production change

The harness uses `getByTestId("result-panel")` to locate the result
region. This requires a one-line addition to the source component:

**File:** `src/components/ResultCaseSheet.tsx` line 412

Before:
```tsx
<article className="rounded-xl border border-white/10 ...">
```

After:
```tsx
<article data-testid="result-panel" className="rounded-xl border border-white/10 ...">
```

This is a non-breaking addition that provides a stable test selector
without affecting behaviour or accessibility. The harness will not pass
until this change is applied.

## Selectors used

The harness uses stable, accessible selectors — no CSS id attributes,
no class substrings, no nth-child:

| Element | Selector | Source |
|---|---|---|
| Paste textarea | `getByLabel("Paste text or drop a document here")` | Visible `<label htmlFor="paste-message">` |
| Optional question | `getByLabel("What would you like to know about this?")` | Visible `<label htmlFor="user-question">` |
| Submit button | `getByRole('button', { name: 'What does this mean?' })` | Accessible button name |
| Loading state | `getByRole('button', { name: 'Checking...' })` | Button text changes during analysis |
| Result panel | `getByTestId('result-panel')` | Requires `data-testid` addition (see above) |

## State reset between cases

Before every case the harness performs a complete reset in this order:

1. Navigate to localhost (`page.goto("/")`)
2. `localStorage.clear()` — removes all keys including terms acceptance
3. `sessionStorage.clear()` — removes all session data
4. Enumerate all IndexedDB databases via `indexedDB.databases()`
5. Delete each database, **awaiting** each deletion. If any deletion
   errors or is blocked, the harness **rejects with a clear error**
   rather than silently continuing.
6. Restore only `adminAvengerTermsAcceptedVersion = "2026-07-terms-v1"`
7. Reload the page so the app re-initialises from a clean state
8. Confirm the Paste text journey textarea is visible

No `addInitScript` is used. The terms key is set via `page.evaluate`
after storage is cleared, ensuring no init-script/reset ordering conflicts.

## Result completion detection

The harness waits for two deterministic signals:

1. **Result panel visible** — `getByTestId("result-panel")` becomes
   visible (30s timeout)
2. **Loading button disappears** — the "Checking..." button count drops
   to zero (15s timeout)

No fixed sleep delays are used.

## Run identity and summary filtering

Each Playwright execution generates a single `runId` (ISO-8601 timestamp
with colons replaced by hyphens). This runId is written to every
`timing.json` produced during that execution.

`summary.json` counts only `timing.json` records whose `runId` matches
the current execution. Timing records from previous or filtered runs are
excluded from the summary counts and counted as `skipped` instead.

This prevents stale timing data from inflating or deflating summary
numbers when partial re-runs are performed.

## Output locations

All outputs are written to the **private corpus directory**, never into
the repository:

```
C:\Users\thoma\AdminAvenger-private-evaluation\general-corpus\
  GC-XX-case-name/
    redacted-input.txt       (input — never modified or removed)
    result-output.txt        (visible text from result panel)
    result-screenshot.png    (full-page screenshot)
    timing.json              (per-case timing and status)
  summary.json               (aggregate run summary)
```

## Output hygiene

Before each attempted case (including cases that will later be skipped
because `redacted-input.txt` is missing), the harness removes only these
permitted previous outputs (if they exist):

- `result-output.txt`
- `result-screenshot.png`
- `timing.json`

It never removes or alters `redacted-input.txt` or `expected-answer.md`.

## Output schemas

### timing.json

```json
{
  "runId": "2026-07-23T18-39-45",
  "caseId": "GC-01-broadband-price-rise",
  "timestamp": "2026-07-23T18:30:00.000Z",
  "browser": "chromium",
  "durationMs": 4523,
  "success": true,
  "timedOut": false,
  "screenshotWritten": true,
  "errorMessage": null
}
```

`success: false` with a non-null `errorMessage` indicates a failure.
`screenshotWritten` is true only if the screenshot file was actually
created on disk (including failure screenshots when possible).

### summary.json

```json
{
  "runId": "2026-07-23T18-39-45",
  "corpusDir": "C:\\Users\\thoma\\AdminAvenger-private-evaluation\\general-corpus",
  "runTimestamp": "2026-07-23T18:30:00.000Z",
  "browser": "chromium",
  "casesDiscovered": 20,
  "casesAttempted": 18,
  "completed": 16,
  "failed": 1,
  "timeouts": 1,
  "skipped": 2,
  "screenshotsWritten": 17
}
```

- `runId` — matches the execution that produced this summary
- `casesDiscovered` — GC-* directories found in the corpus
- `casesAttempted` — cases with a matching `runId` in their timing.json
- `skipped` — cases with no `redacted-input.txt`, no timing.json, or a
  timing.json from a different runId
- `screenshotsWritten` — summed from `timing.screenshotWritten`, includes
  valid failure screenshots

## Timeout and failure semantics

- Each case has a 30-second timeout for the result panel to appear
- If a case times out or crashes, `timing.json` records the failure
  with the error message
- The harness continues to the next case (does not abort the run)
- A failure screenshot is saved when possible and recorded in
  `timing.json`
- `summary.json` is written after all cases complete

## Test isolation

Playwright tests live in `tests/e2e/` and are excluded from Vitest via
`vitest.config.ts` (a dedicated Vitest config file). The production
`vite.config.ts` is not modified for test exclusion.

## Safety

- The harness reads only from `C:\Users\thoma\AdminAvenger-private-evaluation\`
- It writes only `result-output.txt`, `result-screenshot.png`,
  `timing.json`, and `summary.json` into the private corpus directory
- It never reads, edits, stages, or commits repository files
- It never accesses Gmail, network services, or external APIs
- It runs against `localhost` only (Vite dev server)
