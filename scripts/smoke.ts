import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const origin = process.env.APP_URL || "http://localhost:3000";
const password = (await readFile(".local-access.txt", "utf8"))
  .match(/Password: (.+)/)?.[1]
  .trim();
const login = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({
    username: process.env.ADMIN_USERNAME || "admin",
    password,
  }),
});
if (!login.ok) throw new Error(`Login failed (${login.status})`);
const cookie = login.headers.get("set-cookie")!.split(";")[0];
const summary = await (
  await fetch(`${origin}/api/overview`, { headers: { cookie } })
).json();
console.log("Database summary:", summary.summary);
const response = await fetch(`${origin}/api/assistant`, {
  method: "POST",
  headers: { cookie, origin, "content-type": "application/json" },
  body: JSON.stringify({
    question:
      process.argv[2] === "segment"
        ? "Build a list of our most engaged readers"
        : "How many Instagram signups are inactive?",
  }),
});
const result = await response.json();
await mkdir("docs", { recursive: true });
await writeFile(
  process.argv[2] === "segment"
    ? "docs/ai-segment-smoke.json"
    : "docs/ai-smoke.json",
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      status: response.status,
      ...result,
    },
    null,
    2,
  ),
);
console.log(
  "Azure AI status:",
  response.status,
  "Response:",
  result.answer || result.error,
);
if (!response.ok) process.exitCode = 1;
