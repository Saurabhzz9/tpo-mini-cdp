import type { WorkspaceSettings } from "@/types/workspace";
import type { Session } from "./auth";
/** Explicit public projection; secrets and connection strings remain server-side. */
export function workspaceSettings(s: Session): WorkspaceSettings {
  return {
    username: s.username!,
    role: s.role!,
    analysisDate: process.env.ANALYSIS_DATE || "2026-09-28",
    database: process.env.DATABASE_URL
      ? "PostgreSQL"
      : "Local PostgreSQL (PGlite)",
    aiConfigured: !!(
      process.env.AZURE_AI_ENDPOINT &&
      process.env.AZURE_AI_DEPLOYMENT &&
      process.env.AZURE_AI_KEY
    ),
    deployment: process.env.AZURE_AI_DEPLOYMENT || null,
  };
}
