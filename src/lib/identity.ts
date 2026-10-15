import { z } from "zod";
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return z.email().safeParse(email).success ? email : null;
}
export function deviceOwner(
  events: { event: string; user_id: string | null; timestamp: string }[],
  timestamp: string,
): string | null {
  const claims = events.filter((e) => e.user_id);
  const users = new Set(claims.map((e) => e.user_id));
  if (
    users.size !== 1 ||
    !claims.some(
      (e) =>
        e.event === "login" && new Date(e.timestamp) >= new Date(timestamp),
    )
  )
    return null;
  return claims[0].user_id;
}
