import "dotenv/config";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const env = {
  ...process.env,
  HOSTNAME: process.env.APP_HOST || "0.0.0.0",
  PORT: process.env.PORT || "3000",
};
if (!env.DATABASE_URL)
  env.PGLITE_PATH = resolve(process.env.PGLITE_PATH || ".data/postgres");
const child = spawn(process.execPath, [resolve(".next/standalone/server.js")], {
  stdio: "inherit",
  env,
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
