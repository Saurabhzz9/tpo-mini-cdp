import { z } from "zod";
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return z.email().safeParse(email).success ? email : null;
}
