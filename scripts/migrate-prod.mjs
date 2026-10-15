import { readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(481509)");
  await client.query(await readFile("migrations/001_initial.sql", "utf8"));
  await client.query("COMMIT");
  console.log("Database migration complete.");
} catch {
  await client.query("ROLLBACK").catch(() => {});
  console.error(
    "Database migration failed. Check database connectivity and migration permissions.",
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
