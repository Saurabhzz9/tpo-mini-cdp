import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const secrets = [
  "SESSION_SECRET",
  "WEBHOOK_SECRET",
  "AZURE_AI_KEY",
  "ADMIN_PASSWORD_HASH",
]
  .map((k) => process.env[k])
  .filter((v) => v && v.length >= 16);
const findings = [];
let scanned = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.isFile() && /\.(js|json|html|map)$/.test(entry.name)) {
      const content = await readFile(path, "utf8");
      scanned++;
      if (secrets.some((value) => content.includes(value))) findings.push(path);
    }
  }
}
const root = ".next/standalone";
if ((await readdir(root)).some((name) => name.startsWith(".env")))
  throw new Error("Environment file present in standalone output");
await scan(root);
await scan(".next/static");
if (findings.length) {
  console.error("Release contains a configured secret in:", findings);
  process.exitCode = 1;
} else
  console.log(
    `Release secret check passed across ${scanned} text artifacts; no configured secret values found.`,
  );
