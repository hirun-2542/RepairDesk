import { existsSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Chromium for the run: an explicit CHROME path wins, otherwise the revision Playwright
 * 1.64 downloads into the cache, otherwise Playwright resolves the browser itself.
 */
function chromiumExecutable(): string | undefined {
  const candidates = [
    process.env.CHROME,
    join(homedir(), ".cache/ms-playwright/chromium-1248/chrome-linux64/chrome"),
    join(homedir(), ".cache/ms-playwright/chromium-1248/chrome-linux/chrome"),
  ].filter((candidate): candidate is string => Boolean(candidate));
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * Every run gets its own disposable database and upload directory under the OS temp
 * directory so the E2E suite can never touch the developer's dev database or uploads.
 * The paths are published into the environment here — before the web server, global setup
 * and test workers are constructed — because the app reads them at import time. Workers
 * and plugins re-evaluate this file, so the directory is allocated only once: they inherit
 * `E2E_RUN_DIR` from the runner instead of creating a second one.
 */
const RUN_DIR =
  process.env.E2E_RUN_DIR ?? mkdtempSync(join(tmpdir(), "repairdesk-e2e-"));
const DATABASE_URL = `file:${join(RUN_DIR, "e2e.db")}`;
const UPLOAD_DIR = join(RUN_DIR, "uploads");
const AUTH_SECRET = "repairdesk-e2e-secret-not-for-production";

// Next dev blocks its dev resources for origins other than localhost, and without that
// dev channel the client never hydrates — so the suite must talk to localhost, not 127.0.0.1.
const HOST = "localhost";
const PORT = 3417;
const BASE_URL = `http://${HOST}:${PORT}`;

Object.assign(process.env, {
  DATABASE_URL,
  UPLOAD_DIR,
  AUTH_SECRET,
  AUTH_TRUST_HOST: "true",
  E2E_RUN_DIR: RUN_DIR,
  E2E_BASE_URL: BASE_URL,
});

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  // The suite shares one seeded database and flips user activation, so it runs serially.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    launchOptions: { executablePath: chromiumExecutable() },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // --webpack because the worktree links node_modules from outside the project root.
    command: `npm run dev -- --webpack -p ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { DATABASE_URL, UPLOAD_DIR, AUTH_SECRET, AUTH_TRUST_HOST: "true" },
  },
});
