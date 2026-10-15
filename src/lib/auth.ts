import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { query } from "./db";
export type Session = {
  username?: string;
  role?: "admin" | "analyst";
  expires?: number;
};
export async function session() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32)
    throw new Error("Run npm run setup to configure session encryption");
  return getIronSession<Session>(await cookies(), {
    password,
    cookieName: "tpo_session",
    ttl: 8 * 3600,
    cookieOptions: {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_LOCAL_DB !== "1",
      sameSite: "lax",
      path: "/",
    },
  });
}
export async function authorized(admin = false) {
  const s = await session();
  if (!s.username || !s.expires || s.expires < Date.now())
    throw new HttpError(401, "Sign in to continue");
  if (admin && s.role !== "admin")
    throw new HttpError(403, "Administrator access required");
  return s;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function verifyPassword(password: string, hash: string) {
  const [salt, expected] = hash.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected)) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
export function sameOrigin(request: Request) {
  if (
    request.headers.get("origin") !==
    new URL(process.env.APP_URL || request.url).origin
  )
    throw new HttpError(403, "Invalid request origin");
}
export async function rateLimit(key: string, max: number, seconds = 60) {
  const safe = createHash("sha256").update(key).digest("hex");
  const rows = await query<{ hits: number }>(
    `INSERT INTO rate_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.window_at<now()-($2*interval '1 second') THEN 1 ELSE rate_limits.hits+1 END,window_at=CASE WHEN rate_limits.window_at<now()-($2*interval '1 second') THEN now() ELSE rate_limits.window_at END RETURNING hits`,
    [safe, seconds],
  );
  if (rows[0].hits > max)
    throw new HttpError(429, "Too many requests. Try again later.");
}
/** Trust only the last address appended by the configured App Service ingress.
 * A direct Node host must leave this mode disabled; arbitrary forwarded headers
 * must never become identity. The reverse proxy must be the sole public ingress.
 */
export function loginClientKey(request: Request) {
  if (
    process.env.LOGIN_TRUSTED_PROXY !== "azure-app-service" ||
    !process.env.WEBSITE_INSTANCE_ID
  )
    return "local-direct";
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(-1)
    ?.trim();
  const address = forwarded?.startsWith("[")
    ? forwarded.match(/^\[([^\]]+)\](?::\d+)?$/)?.[1]
    : forwarded && isIP(forwarded)
      ? forwarded
      : forwarded?.replace(/:\d+$/, "");
  if (!address || !isIP(address))
    throw new HttpError(503, "Login ingress is not configured correctly");
  return createHash("sha256").update(address).digest("hex");
}
export async function readBody(request: Request, limit = 32768) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new HttpError(413, "Request is too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}
