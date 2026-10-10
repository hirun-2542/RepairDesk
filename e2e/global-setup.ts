import { execFileSync } from "node:child_process";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { E2E_RUN_DIR_PREFIX, databaseFilePath, e2eEnv } from "./env";
import { PROJECT_ROOT, snapshotProjectDatabases } from "./isolation";

/**
 * Prepares the disposable host before any test runs:
 *  1. fails loudly if DATABASE_URL/UPLOAD_DIR escaped the per-run temp directory,
 *  2. applies the schema with the non-destructive `prisma migrate deploy`,
 *  3. seeds the database exactly once (never both reset and seed),
 *  4. proves the seeded data actually landed in the disposable file.
 */
export default function globalSetup() {
  const { databaseUrl, uploadDir, runDir } = e2eEnv();

  if (!runDir.startsWith(join(tmpdir(), E2E_RUN_DIR_PREFIX)))
    throw new Error(
      `Refusing to run: E2E_RUN_DIR is not a per-run temp dir (${runDir})`,
    );
  const dbFile = databaseFilePath(databaseUrl);
  if (!dbFile || !dbFile.startsWith(runDir))
    throw new Error(
      `Refusing to run: DATABASE_URL escapes the run directory (${databaseUrl})`,
    );
  if (!basename(dbFile).startsWith("e2e"))
    throw new Error(`Unexpected disposable database name: ${dbFile}`);
  if (!resolve(uploadDir).startsWith(runDir))
    throw new Error(
      `Refusing to run: UPLOAD_DIR escapes the run directory (${uploadDir})`,
    );
  if (existsSync(dbFile))
    throw new Error(
      `Refusing to run: disposable database already exists (${dbFile})`,
    );

  writeFileSync(
    join(runDir, "project-databases-before.json"),
    JSON.stringify(snapshotProjectDatabases()),
  );

  const env = { ...process.env };
  execFileSync("npm", ["run", "db:migrate:deploy"], {
    cwd: PROJECT_ROOT,
    env,
    stdio: "inherit",
  });
  execFileSync("npm", ["run", "db:seed"], {
    cwd: PROJECT_ROOT,
    env,
    stdio: "inherit",
  });

  if (!existsSync(dbFile))
    throw new Error(`Seed did not create the disposable database at ${dbFile}`);
  if (statSync(dbFile).size < 4096)
    throw new Error(`Disposable database at ${dbFile} looks empty after seeding`);
}
