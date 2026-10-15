import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPeople, overview } from "./audience";
import { HttpError } from "./auth";
import { pages, sources } from "./config";
import { query } from "./db";
import { matches, segmentSchema } from "./segments";
export const toolArgs = z
  .object({
    metric: z.enum([
      "audience",
      "acquisition",
      "inactive",
      "pages",
      "engagement",
      "cohorts",
      "segment",
    ]),
    source: z.enum(sources).optional(),
    segment: z.enum(["inactive", "engaged", "app-readers"]).optional(),
    definition: segmentSchema.optional(),
  })
  .strict();
type Args = z.infer<typeof toolArgs>;
export function classifyQuestion(question: string): Args {
  if (
    question.length > 1000 ||
    /[@<>]|\b(?:u_|d_|p_|evt_|visitor[_ -]?id|device[_ -]?id|user[_ -]?id)\w*|\b\d{7,}\b/i.test(
      question,
    )
  )
    throw new HttpError(
      400,
      "Ask an aggregate audience question without personal information or identifying IDs.",
    );
  const q = question.toLowerCase(),
    source = sources.find(
      (s) => s !== "Unknown" && new RegExp(`\\b${s.toLowerCase()}\\b`).test(q),
    );
  let metric: Args["metric"] = "audience";
  if (/segment|list|most engaged|who are/.test(q)) metric = "segment";
  else if (/page|first visit/.test(q)) metric = "pages";
  else if (/cohort|retention/.test(q)) metric = "cohorts";
  else if (/inactive|cold|haven.t opened/.test(q)) metric = "inactive";
  else if (/acquisition|source|perform|channel|signups/.test(q))
    metric = "acquisition";
  else if (/engage|read|app|newsletter/.test(q)) metric = "engagement";
  if (/last month|became|went cold|conversion|revenue|retention/.test(q))
    throw new HttpError(
      422,
      "This dataset contains last-open snapshots, not historical open events, revenue, or true retention. Ask about current inactivity, acquisition, or observed engagement.",
    );
  return {
    metric,
    ...(source ? { source } : {}),
    ...(metric === "segment"
      ? {
          segment: /inactive|cold/.test(q)
            ? "inactive"
            : /app|read.stor/.test(q)
              ? "app-readers"
              : "engaged",
        }
      : {}),
  };
}
function approvedDefinition(args: Args) {
  return segmentSchema.parse({
    scope: args.segment === "app-readers" ? "all" : "newsletter",
    match: "all",
    rules: [
      ...(args.source
        ? [{ field: "source", operator: "eq", value: args.source }]
        : []),
      {
        field:
          args.segment === "inactive"
            ? "days_inactive"
            : args.segment === "app-readers"
              ? "story_reads"
              : "score",
        operator: "gte",
        value:
          args.segment === "inactive"
            ? 30
            : args.segment === "app-readers"
              ? 2
              : 60,
      },
    ],
  });
}
const canonicalDefinition = (d: z.infer<typeof segmentSchema>) =>
  JSON.stringify({
    scope: d.scope || "newsletter",
    match: d.match,
    rules: [...d.rules].sort((a, b) => a.field.localeCompare(b.field)),
  });
const suppress = (n: number) => (n > 0 && n < 5 ? null : n);
export async function safeAnalytics(input: unknown) {
  const args = toolArgs.parse(input),
    all = await getPeople(),
    people = all.filter(
      (p) =>
        (p.newsletter ||
          args.metric === "engagement" ||
          (args.metric === "segment" && args.segment === "app-readers")) &&
        (!args.source || p.source === args.source),
    );
  if (args.metric === "segment") {
    const definition = approvedDefinition(args);
    if (
      args.definition &&
      canonicalDefinition(args.definition) !== canonicalDefinition(definition)
    )
      throw new HttpError(400, "Unapproved segment tool arguments");
    const id = randomUUID(),
      count = people.filter((p) => matches(p, definition)).length;
    await query("INSERT INTO segments(id,name,definition) VALUES($1,$2,$3)", [
      id,
      `${args.source || "Audience"} · ${args.segment || "engaged"} readers`,
      JSON.stringify(definition),
    ]);
    return {
      metric: "segment",
      segmentReference: id,
      count: suppress(count),
      definition,
    };
  }
  if (args.metric === "inactive")
    return {
      metric: "inactive",
      source: args.source || "All",
      inactive30Days: suppress(
        people.filter((p) => p.days_inactive !== null && p.days_inactive >= 30)
          .length,
      ),
      neverOpened: suppress(people.filter((p) => p.never_opened).length),
      definition:
        "30+ days since last newsletter open; never-opened reported separately",
    };
  if (args.metric === "engagement")
    return {
      metric: "engagement",
      audience:
        "All canonical reader profiles; newsletter measures use observed newsletter records only",
      newsletterRecent: suppress(
        people.filter((p) => p.days_inactive !== null && p.days_inactive < 30)
          .length,
      ),
      appAccounts: suppress(people.filter((p) => p.app_accounts > 0).length),
      observedAppReaders: suppress(
        people.filter((p) => p.story_reads > 0).length,
      ),
      repeatStoryReaders: suppress(
        people.filter((p) => p.story_reads >= 2).length,
      ),
      websiteReaders: suppress(people.filter((p) => p.web_visits > 0).length),
    };
  if (args.metric === "acquisition")
    return {
      metric: "acquisition",
      rows: sources
        .filter((s) => !args.source || s === args.source)
        .map((source) => {
          const p = people.filter((x) => x.source === source);
          return {
            source,
            count: suppress(p.length),
            newsletterRecent: suppress(
              p.filter((x) => x.days_inactive !== null && x.days_inactive < 30)
                .length,
            ),
            appLinked: suppress(p.filter((x) => x.app_accounts > 0).length),
          };
        }),
    };
  if (args.metric === "pages") {
    const result = await query<{ page: string; visits: number }>(
      `SELECT page,count(*)::int visits FROM (SELECT DISTINCT ON(w.person_id) w.person_id,w.page FROM web_events w JOIN people p ON p.id=w.person_id WHERE p.newsletter=true AND w.timestamp>=p.signup_date AND ($1::text IS NULL OR p.source=$1) ORDER BY w.person_id,w.timestamp,w.id) firsts GROUP BY page ORDER BY visits DESC`,
      [args.source || null],
    );
    return {
      metric: "first_observed_page_after_signup",
      rows: result
        .filter((r) => (pages as readonly string[]).includes(r.page))
        .map((r) => ({ page: r.page, people: suppress(r.visits) })),
      limitation:
        "First observed visit after signup, not necessarily first-ever visit.",
    };
  }
  if (args.metric === "cohorts") {
    const data = await overview();
    return {
      metric: "cohort_snapshot",
      rows: data.cohorts
        .filter((c) => /^\d{4}-\d{2}$/.test(c.month))
        .map((c) => ({
          month: c.month,
          count: suppress(c.count),
          recentNewsletter: suppress(c.engaged),
          appLinked: suppress(c.app),
        })),
      limitation:
        "Snapshot engagement by signup month; not longitudinal retention.",
    };
  }
  return {
    metric: "audience",
    subscribers: suppress(people.length),
    active: suppress(people.filter((p) => p.status === "active").length),
    unsubscribed: suppress(
      people.filter((p) => p.status === "unsubscribed").length,
    ),
    webLinked: suppress(people.filter((p) => p.web_visits > 0).length),
    appLinked: suppress(people.filter((p) => p.app_accounts > 0).length),
  };
}
export function modelPayload(
  args: Args,
  data: Awaited<ReturnType<typeof safeAnalytics>>,
) {
  // Only a validated intent plus output of the aggregate-only layer can cross this boundary.
  return {
    model: process.env.AZURE_AI_DEPLOYMENT,
    messages: [
      {
        role: "system",
        content:
          "You are The Pour Over Growth Assistant. Explain only the supplied deterministic aggregate data. Never invent numbers or identify people. Null means suppressed for a group smaller than five. Mention limitations. Return JSON with exactly one string field: answer. A segment reference is an opaque link, never a person.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: toolArgs.parse(args),
          aggregate: data,
          analysisDate: process.env.ANALYSIS_DATE || "2026-09-28",
        }),
      },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 700,
  };
}
export async function askAssistant(
  question: string,
  transport: typeof fetch = fetch,
) {
  const args = classifyQuestion(question);
  const endpoint = process.env.AZURE_AI_ENDPOINT,
    key = process.env.AZURE_AI_KEY,
    deployment = process.env.AZURE_AI_DEPLOYMENT;
  if (!endpoint || !key || !deployment)
    throw new HttpError(
      503,
      "Azure AI is not configured. Audience analytics and segment builder remain available.",
    );
  if (args.metric === "segment") {
    const planningPayload = {
      model: deployment,
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "Build one safe structured reader segment. For inactive readers use scope newsletter and days_inactive >= 30 (excludes never-opened). For engaged readers use scope newsletter and score >= 60. For app-readers use scope all and story_reads >= 2. If a source is supplied require source equals that exact value. Combine all conditions with match all. Call buildSegmentDefinition; do not produce text.",
        },
        { role: "user", content: JSON.stringify(args) },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "buildSegmentDefinition",
            description:
              "Build approved structured audience rules, never SQL or subscriber rows.",
            parameters: z.toJSONSchema(
              z.object({ definition: segmentSchema }).strict(),
            ),
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "buildSegmentDefinition" },
      },
      max_completion_tokens: 700,
    };
    const planResponse = await transport(
      `${endpoint.replace(/\/$/, "")}/openai/v1/chat/completions`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "api-key": key },
        body: JSON.stringify(planningPayload),
        signal: AbortSignal.timeout(45000),
      },
    );
    if (!planResponse.ok)
      throw new HttpError(
        502,
        "Azure AI could not build a segment. Please try again.",
      );
    const plan = await planResponse.json(),
      call = plan.choices?.[0]?.message?.tool_calls?.[0];
    if (call?.function?.name !== "buildSegmentDefinition")
      throw new HttpError(502, "Model returned an unsupported tool call");
    const proposed = z
      .object({ definition: segmentSchema })
      .strict()
      .parse(JSON.parse(call.function.arguments));
    const expected = approvedDefinition(args);
    if (
      canonicalDefinition(proposed.definition) !== canonicalDefinition(expected)
    )
      throw new HttpError(
        502,
        "Model segment did not match the approved query. Use the segment builder to refine conditions.",
      );
    args.definition = proposed.definition;
  }
  const data = await safeAnalytics(args),
    payload = modelPayload(args, data);
  const response = await transport(
    `${endpoint.replace(/\/$/, "")}/openai/v1/chat/completions`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!response.ok)
    throw new HttpError(
      502,
      "Azure AI could not complete this request. Please try again.",
    );
  const result = await response.json(),
    raw = result.choices?.[0]?.message?.content;
  const answer = z
    .object({ answer: z.string().min(1).max(6000) })
    .strict()
    .parse(JSON.parse(raw));
  if (/[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:u_|d_|p_|evt_)\w+/i.test(answer.answer))
    throw new HttpError(502, "Model response did not pass privacy validation");
  return {
    ...answer,
    data,
    request: args,
    provider: "Azure AI Foundry",
    privacy:
      "Only validated intent and aggregate results sent to model. Your original message stays on this server.",
  };
}
