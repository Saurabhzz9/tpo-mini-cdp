import "dotenv/config";
import { readFile } from "node:fs/promises";
import { sign } from "../src/lib/webhook";
const body = process.argv[2]
  ? await readFile(process.argv[2], "utf8")
  : JSON.stringify({
      event_id: `demo_${Date.now()}`,
      event: "app_open",
      user_id: "demo_unknown_user",
      device_id: "demo_device",
      timestamp: new Date().toISOString(),
      properties: {},
    });
if (!process.env.WEBHOOK_SECRET) throw new Error("Configure WEBHOOK_SECRET");
const timestamp = String(Math.floor(Date.now() / 1000));
const response = await fetch(
  `${process.env.APP_URL || "http://localhost:3000"}/webhooks/app`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tpo-timestamp": timestamp,
      "x-tpo-signature": `sha256=${sign(body, timestamp, process.env.WEBHOOK_SECRET)}`,
    },
    body,
  },
);
console.log(response.status, await response.json());
