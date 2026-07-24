import { defineConfig } from "@playwright/test";

const corpusDir =
  process.env.CORPUS_DIR ||
  "C:\\Users\\thoma\\AdminAvenger-private-evaluation\\general-corpus";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "off",
    trace: "off",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  reportInConfig: false,
  outputDir: undefined,
  /* Expose corpusDir to tests via process.env */
  metadata: { corpusDir },
});
