import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Project root: the directory that contains playwright.config.ts. */
export const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

export type DbSnapshot = Record<string, { size: number; mtimeMs: number }>;

/**
 * State of SQLite files in the project root. The E2E run must never create or modify them:
 * the specs point at a disposable database in the OS temp directory instead.
 */
export function snapshotProjectDatabases(): DbSnapshot {
  const snapshot: DbSnapshot = {};
  for (const name of readdirSync(PROJECT_ROOT)) {
    if (!/\.db$/i.test(name)) continue;
    const info = statSync(join(PROJECT_ROOT, name));
    snapshot[name] = { size: info.size, mtimeMs: info.mtimeMs };
  }
  return snapshot;
}
