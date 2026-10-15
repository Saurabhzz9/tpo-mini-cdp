import { scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { getDb, closeDb } from "../src/lib/db";
import { migrate } from "./migrate";
import { importCSV } from "../src/lib/importer";
import { readFile } from "node:fs/promises";
delete process.env.DATABASE_URL;
process.env.PGLITE_PATH = `.data/e2e-${Date.now()}`;
process.env.APP_URL = "http://localhost:43187";
process.env.NEXT_DIST_DIR = ".next-e2e";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD_HASH = `e2e-salt:${scryptSync("e2e-test-password", "e2e-salt", 64).toString("hex")}`;
process.env.ANALYST_USERNAME = "analyst";
process.env.ANALYST_PASSWORD_HASH = `e2e-salt:${scryptSync("e2e-analyst-password", "e2e-salt", 64).toString("hex")}`;
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
process.env.WEBHOOK_SECRET = "test-webhook-secret-at-least-32-characters-long";
process.env.AZURE_AI_ENDPOINT = "";
process.env.AZURE_AI_KEY = "";
process.env.AZURE_AI_DEPLOYMENT = "";
await migrate();
for (const kind of ["subscribers", "app_users", "web_events"] as const)
  await importCSV(
    kind,
    await readFile(`data/${kind}.csv`, "utf8"),
    `${kind}.csv`,
  );
await closeDb();
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "--webpack", "--port", "43187"],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    child.kill(signal);
    process.exit(0);
  });
child.on("exit", (code) => process.exit(code || 0));
