/**
 * Read-only view of the per-run environment that playwright.config.ts published.
 * Workers inherit these variables from the runner, so nothing here allocates state:
 * the disposable temp directory is created exactly once, in the config.
 */
export function e2eEnv() {
  const baseUrl = process.env.E2E_BASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const uploadDir = process.env.UPLOAD_DIR;
  const runDir = process.env.E2E_RUN_DIR;
  if (!baseUrl || !databaseUrl || !uploadDir || !runDir)
    throw new Error(
      "E2E environment is not initialised — run the suite through `npm run e2e` so playwright.config.ts can publish DATABASE_URL/UPLOAD_DIR/E2E_RUN_DIR.",
    );
  return { baseUrl, databaseUrl, uploadDir, runDir };
}

export const E2E_RUN_DIR_PREFIX = "repairdesk-e2e-";

/** Absolute path of the SQLite file behind a `file:` DATABASE_URL. */
export function databaseFilePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) return null;
  return databaseUrl.slice("file:".length);
}
