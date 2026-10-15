import { z } from "zod";
import type { Person } from "./audience";
import { daysSince } from "./config";
import { fields } from "./segment-fields";
export { fields } from "./segment-fields";
export const ruleSchema = z
  .object({
    field: z.enum(fields),
    operator: z.enum(["eq", "neq", "gte", "lte", "contains"]),
    value: z.union([
      z.string().max(200),
      z.number().finite().min(0).max(100000),
      z.boolean(),
    ]),
  })
  .strict()
  .superRefine((r, ctx) => {
    const numeric = [
      "days_inactive",
      "web_visits",
      "app_accounts",
      "story_reads",
      "score",
      "last_activity_days",
    ];
    if (
      numeric.includes(r.field) &&
      (typeof r.value !== "number" || r.operator === "contains")
    )
      ctx.addIssue({
        code: "custom",
        message: "Numeric conditions require a number and comparison operator",
      });
    if (
      ["never_opened", "data_complete"].includes(r.field) &&
      (typeof r.value !== "boolean" || !["eq", "neq"].includes(r.operator))
    )
      ctx.addIssue({
        code: "custom",
        message: "Boolean conditions require true/false and is/is-not",
      });
    if (
      r.field === "signup_date" &&
      (typeof r.value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(r.value) ||
        !Number.isFinite(Date.parse(r.value)))
    )
      ctx.addIssue({ code: "custom", message: "Use an ISO signup date" });
  });
export const segmentSchema = z
  .object({
    scope: z.enum(["newsletter", "all"]).optional(),
    match: z.enum(["all", "any"]),
    rules: z.array(ruleSchema).min(1).max(15),
  })
  .strict();
export type Segment = z.infer<typeof segmentSchema>;
export function segmentMembers(people: Person[], definition: Segment) {
  return people.filter(
    (p) =>
      (definition.scope === "all" || p.newsletter) && matches(p, definition),
  );
}
export function matches(p: Person, definition: Segment) {
  const values = definition.rules.map((r) => {
    let actual: unknown;
    switch (r.field) {
      case "web_page":
        actual = p.web_pages;
        break;
      case "utm_source":
        actual = p.utm_sources;
        break;
      case "app_event":
        actual = p.app_types;
        break;
      case "data_complete":
        actual = p.newsletter && !!p.signup_date && !p.conflict;
        break;
      case "last_activity_days":
        actual = daysSince(
          [p.last_open_date, p.last_web, p.last_app]
            .filter(Boolean)
            .sort()
            .at(-1) || null,
        );
        break;
      default:
        actual = p[r.field as keyof Person];
    }
    if (actual === null) return r.operator === "neq";
    if (r.operator === "contains")
      return Array.isArray(actual)
        ? actual.includes(String(r.value))
        : String(actual).toLowerCase().includes(String(r.value).toLowerCase());
    if (r.operator === "eq")
      return String(actual).toLowerCase() === String(r.value).toLowerCase();
    if (r.operator === "neq")
      return String(actual).toLowerCase() !== String(r.value).toLowerCase();
    if (r.operator === "gte")
      return typeof actual === "number"
        ? actual >= Number(r.value)
        : String(actual) >= String(r.value);
    return typeof actual === "number"
      ? actual <= Number(r.value)
      : String(actual) <= String(r.value);
  });
  return definition.match === "all"
    ? values.every(Boolean)
    : values.some(Boolean);
}
export const csvCell = (value: unknown) => {
  let s = String(value ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
export function exportPeople(people: Person[]) {
  return (
    "\ufeffemail,status,source,signup_date,score,web_visits,app_events,app_user_ids\r\n" +
    people
      .map((p) =>
        [
          p.email,
          p.status,
          p.source,
          p.signup_date,
          p.score,
          p.web_visits,
          p.app_events,
          p.app_ids.join(";"),
        ]
          .map(csvCell)
          .join(","),
      )
      .join("\r\n")
  );
}
