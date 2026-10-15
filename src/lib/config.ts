export const analysisDate = () =>
  new Date(`${process.env.ANALYSIS_DATE || "2026-09-28"}T23:59:59.999Z`);
export const daysSince = (date: string | null) =>
  date
    ? Math.max(
        0,
        Math.floor(
          (analysisDate().getTime() - new Date(date).getTime()) / 86400000,
        ),
      )
    : null;
export const sources = [
  "Instagram",
  "Facebook",
  "Referral",
  "Google",
  "Direct",
  "Podcast",
  "X",
  "Unknown",
] as const;
export const pages = [
  "/",
  "/subscribe",
  "/about",
  "/beliefs",
  "/our-staff",
  "/shadrachs-picks",
  "/news/ai-regulation-bill",
  "/news/church-attendance-study",
  "/news/federal-budget-standoff",
  "/news/housing-market-cooldown",
  "/news/hurricane-season-update",
  "/news/midterm-primaries-recap",
  "/news/new-space-telescope-images",
  "/news/supreme-court-ruling-explained",
  "/news/what-is-happening-in-sudan",
  "/news/world-series-preview",
] as const;
