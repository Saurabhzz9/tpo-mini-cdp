import type { Segment } from "@/lib/segments";
export type Overview = Awaited<
  ReturnType<typeof import("@/lib/audience").overview>
>;
export type Profile = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/audience").profile>>
>;
export type Saved = {
  id: string;
  name: string;
  definition: Segment;
  count: number;
};
export type WorkspaceSettings = {
  username: string;
  role: "admin" | "analyst";
  analysisDate: string;
  database: string;
  aiConfigured: boolean;
  deployment: string | null;
};
