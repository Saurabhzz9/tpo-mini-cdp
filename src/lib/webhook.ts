import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { HttpError } from "./auth";
import { getDb } from "./db";
const identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:-]+$/);
export const eventSchema = z
  .object({
    event_id: identifier,
    event: z.enum(["app_open", "read_story", "link_click", "login"]),
    user_id: identifier.nullable(),
    device_id: identifier,
    timestamp: z.iso.datetime({ offset: true }),
    properties: z
      .record(
        z.string().max(80),
        z.union([
          z.string().max(1000),
          z.number().finite(),
          z.boolean(),
          z.null(),
        ]),
      )
      .refine(
        (p) =>
          Object.keys(p).length <= 20 &&
          !Object.keys(p).some((k) =>
            ["__proto__", "prototype", "constructor"].includes(k),
          ),
      ),
  })
  .strict()
  .refine((e) => e.event !== "login" || e.user_id !== null, {
    message: "Login requires a user ID",
  });
export type AppEvent = z.infer<typeof eventSchema>;
export function sign(body: string, timestamp: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}
export function verifySignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
  secret: string | undefined,
) {
  if (!secret || secret.length < 32)
    throw new HttpError(503, "Webhook signing is not configured");
  if (
    !timestamp ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !signature ||
    !/^sha256=[a-f0-9]{64}$/.test(signature)
  )
    throw new HttpError(401, "Invalid webhook signature");
  const actual = Buffer.from(signature.slice(7), "hex"),
    expected = Buffer.from(sign(body, timestamp, secret), "hex");
  if (!timingSafeEqual(actual, expected))
    throw new HttpError(401, "Invalid webhook signature");
}
export async function ingestEvent(input: unknown, test = false) {
  const e = eventSchema.parse(input);
  if (
    test !== e.event_id.startsWith("test_") ||
    test !== e.device_id.startsWith("test_") ||
    (e.user_id !== null && test !== e.user_id.startsWith("test_"))
  )
    throw new HttpError(
      400,
      "Test and live event identifiers must use separate namespaces",
    );
  const canonical = JSON.stringify({
    ...e,
    properties: Object.fromEntries(
      Object.entries(e.properties).sort(([a], [b]) => a.localeCompare(b)),
    ),
    test,
  });
  const hash = createHash("sha256").update(canonical).digest("hex");
  return (await getDb()).transaction(async (tx) => {
    // Serialize both event-id and device changes across all app instances.
    await tx.query("SELECT pg_advisory_xact_lock(481510)");
    const existing = (
      await tx.query<{ payload_hash: string }>(
        "SELECT payload_hash FROM app_events WHERE event_id=$1",
        [e.event_id],
      )
    ).rows[0];
    if (existing) {
      if (existing.payload_hash !== hash)
        throw new HttpError(
          409,
          "Event ID already exists with different content",
        );
      return { duplicate: true, eventId: e.event_id };
    }
    if (e.user_id) {
      const pid = `unknown_${createHash("sha256").update(e.user_id).digest("hex").slice(0, 24)}`;
      const user = (
        await tx.query("SELECT user_id FROM app_users WHERE user_id=$1", [
          e.user_id,
        ])
      ).rows[0];
      if (!user) {
        await tx.query(
          "INSERT INTO people(id,test) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [pid, test],
        );
        await tx.query(
          "INSERT INTO app_users(user_id,person_id,original) VALUES($1,$2,'{}')",
          [e.user_id, pid],
        );
      }
    }
    await tx.query(
      "INSERT INTO app_events(event_id,event,user_id,resolved_user_id,device_id,timestamp,properties,payload_hash,test) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8)",
      [
        e.event_id,
        e.event,
        e.user_id,
        e.device_id,
        e.timestamp,
        JSON.stringify(e.properties),
        hash,
        test,
      ],
    );
    const claims = (
      await tx.query<{ user_id: string }>(
        "SELECT DISTINCT user_id FROM app_events WHERE device_id=$1 AND user_id IS NOT NULL AND test=$2",
        [e.device_id, test],
      )
    ).rows;
    // Shared devices are intentionally not backfilled. Explicit user claims remain valid.
    await tx.query(
      "UPDATE app_events SET resolved_user_id=user_id WHERE device_id=$1 AND test=$2",
      [e.device_id, test],
    );
    if (claims.length === 1) {
      await tx.query(
        `UPDATE app_events a SET resolved_user_id=$1 WHERE a.device_id=$2 AND a.test=$3 AND a.user_id IS NULL AND a.timestamp<=(SELECT max(timestamp) FROM app_events WHERE device_id=$2 AND test=$3 AND event='login' AND user_id=$1)`,
        [claims[0].user_id, e.device_id, test],
      );
    }
    await tx.query(
      "INSERT INTO audit_log(action,actor,detail) VALUES($1,$2,$3)",
      [
        "app_event",
        test ? "event_lab" : "webhook",
        JSON.stringify({ event: e.event, test }),
      ],
    );
    return { duplicate: false, eventId: e.event_id };
  });
}
