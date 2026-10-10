import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_RUN_DIR_PREFIX, e2eEnv } from "./env";
import { snapshotProjectDatabases, type DbSnapshot } from "./isolation";

/**
 * Tears the throwaway host down and reports exactly what it left behind:
 *  - the per-run temp directory (database + uploads) is deleted,
 *  - `prisma migrate deploy` never resets or deletes a developer database,
 *  - SQLite files in the project root stay byte-for-byte as they were before the run.
 */
export default function globalTeardown() {
  const { runDir } = e2eEnv();
  const beforePath = join(runDir, "project-databases-before.json");
  const before: DbSnapshot = existsSync(beforePath)
    ? (JSON.parse(readFileSync(beforePath, "utf8")) as DbSnapshot)
    : {};

  rmSync(runDir, { recursive: true, force: true });

  const leftovers = readdirSync(tmpdir()).filter((name) =>
    name.startsWith(E2E_RUN_DIR_PREFIX),
  );
  const after = snapshotProjectDatabases();
  const changed = Object.keys({ ...before, ...after }).filter(
    (name) => JSON.stringify(before[name]) !== JSON.stringify(after[name]),
  );

  const problems: string[] = [];
  if (existsSync(runDir)) problems.push(`run directory not removed: ${runDir}`);
  if (leftovers.length)
    problems.push(`leftover run directories: ${leftovers.join(", ")}`);
  if (changed.length)
    problems.push(`project SQLite files changed: ${changed.join(", ")}`);

  if (problems.length)
    throw new Error(`E2E isolation check failed — ${problems.join("; ")}`);
  // eslint-disable-next-line no-console
  console.log(
    `E2E cleanup: removed ${runDir}; no leftover run directories; project databases untouched`,
  );
}
