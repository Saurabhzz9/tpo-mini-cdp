import pg from "pg";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
if (!process.env.TPO_PG_ADMIN_URL)
  throw Error("Supply TPO_PG_ADMIN_URL through a private environment");
const database = "tpo_verify_" + randomBytes(8).toString("hex");
const admin = new pg.Client({
  connectionString: process.env.TPO_PG_ADMIN_URL,
  connectionTimeoutMillis: 15000,
});
let created = false;
try {
  await admin.connect();
  await admin.query("CREATE DATABASE " + pg.escapeIdentifier(database));
  created = true;
  const testUrl = new URL(process.env.TPO_PG_ADMIN_URL);
  testUrl.pathname = "/" + database;
  const code = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "tests/postgres.integration.test.ts",
      ],
      {
        stdio: "inherit",
        env: { ...process.env, TPO_POSTGRES_TEST_URL: testUrl.toString() },
      },
    );
    child.on("exit", resolve);
  });
  process.exitCode = Number(code) || 0;
} catch (error) {
  console.error(
    "Isolated PostgreSQL verification failed:",
    error.code || error.name,
  );
  process.exitCode = 1;
} finally {
  if (created) {
    await admin.query(
      "DROP DATABASE IF EXISTS " +
        pg.escapeIdentifier(database) +
        " WITH (FORCE)",
    );
    console.log("Removed isolated verification database.");
  }
  await admin.end();
}
