import { NextResponse } from "next/server";
import {
  authorized,
  session,
  verifyPassword,
  rateLimit,
  sameOrigin,
  readBody,
  HttpError,
} from "@/lib/auth";
import { query } from "@/lib/db";
import { getPeople, overview, profile } from "@/lib/audience";
import { segmentSchema, matches, exportPeople } from "@/lib/segments";
import { importCSV } from "@/lib/importer";
import { askAssistant } from "@/lib/assistant";
import { eventSchema, sign } from "@/lib/webhook";
import { z } from "zod";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(
  req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const parts = (await context.params).path,
      path = parts.join("/"),
      url = new URL(req.url),
      write = req.method !== "GET";
    if (write) sameOrigin(req);
    if (path === "auth/login" && req.method === "POST") {
      await rateLimit("login-global", 30, 900);
      const { username, password } = z
        .object({
          username: z.string().max(100),
          password: z.string().max(200),
        })
        .parse(JSON.parse(await readBody(req)));
      const admin = username === (process.env.ADMIN_USERNAME || "admin"),
        analyst = username === (process.env.ANALYST_USERNAME || "analyst");
      const hash = admin
        ? process.env.ADMIN_PASSWORD_HASH
        : analyst
          ? process.env.ANALYST_PASSWORD_HASH
          : process.env.ADMIN_PASSWORD_HASH;
      const valid = verifyPassword(password, hash || "");
      if (!valid || (!admin && !analyst))
        throw new HttpError(401, "Invalid username or password");
      const s = await session();
      s.username = username;
      s.role = admin ? "admin" : "analyst";
      s.expires = Date.now() + 8 * 3600000;
      await s.save();
      return NextResponse.json({ ok: true });
    }
    const s = await authorized(path === "imports" || path === "lab/send");
    if (path === "auth/logout" && write) {
      (await session()).destroy();
      return NextResponse.json({ ok: true });
    }
    if (path === "overview" && !write)
      return NextResponse.json(await overview());
    if (path === "people" && !write) {
      let people = await getPeople();
      const q = (url.searchParams.get("q") || "").slice(0, 200).toLowerCase(),
        filter = url.searchParams.get("filter");
      if (q)
        people = people.filter((p) =>
          [p.email, p.id, p.source, ...p.app_ids, ...p.visitor_ids].some((v) =>
            v?.toLowerCase().includes(q),
          ),
        );
      if (filter === "duplicates")
        people = people.filter((p) => p.duplicate_count > 0);
      if (filter === "app-only") people = people.filter((p) => !p.newsletter);
      if (filter === "inactive")
        people = people.filter(
          (p) => p.days_inactive === null || p.days_inactive >= 30,
        );
      const page = Math.max(
        1,
        Math.min(10000, Number(url.searchParams.get("page")) || 1),
      );
      return NextResponse.json({
        people: people.slice((page - 1) * 25, page * 25),
        total: people.length,
        page,
      });
    }
    if (parts[0] === "people" && parts[1] && !write) {
      const p = await profile(parts[1]);
      if (!p) throw new HttpError(404, "Profile not found");
      return NextResponse.json(p);
    }
    if (path === "quality" && !write) {
      const filter = url.searchParams.get("filter") || "",
        page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const issues = await query(
        `SELECT r.id,r.kind,r.row_number,r.person_id,r.original,r.flags FROM raw_records r WHERE cardinality(r.flags)>0 AND ($1='' OR $1=ANY(r.flags)) ORDER BY r.kind,r.row_number LIMIT 50 OFFSET $2`,
        [filter, (page - 1) * 50],
      );
      const counts = await query<{ flag: string; count: number }>(
        "SELECT unnest(flags) flag,count(*)::int count FROM raw_records GROUP BY flag ORDER BY count DESC",
      );
      const visitors = await query(
        "SELECT count(*)::int total,count(*) FILTER(WHERE person_id IS NULL)::int anonymous,count(*) FILTER(WHERE ambiguous)::int ambiguous FROM visitors",
      );
      const appIdentity = (
        await query(
          "SELECT (SELECT count(*)::int FROM people WHERE NOT newsletter AND NOT test) standalone,(SELECT count(*)::int FROM app_events WHERE resolved_user_id IS NULL AND NOT test) unresolved,(SELECT count(*)::int FROM (SELECT device_id FROM app_events WHERE NOT test AND user_id IS NOT NULL GROUP BY device_id HAVING count(DISTINCT user_id)>1) shared) ambiguous",
        )
      )[0];
      const history = await query(
        "SELECT b.id,b.kind,b.created_at::text,b.row_count,count(r.id) FILTER(WHERE cardinality(r.flags)>0)::int flagged FROM import_batches b LEFT JOIN raw_records r ON r.batch_id=b.id GROUP BY b.id ORDER BY b.created_at DESC LIMIT 12",
      );
      return NextResponse.json({
        issues,
        counts,
        visitors: visitors[0],
        history,
        appIdentity,
        page,
      });
    }
    if (path === "segments" && !write) {
      const people = await getPeople(),
        segments = await query<{
          id: string;
          name: string;
          definition: unknown;
          created_at: string;
        }>(
          "SELECT id,name,definition,created_at::text FROM segments ORDER BY updated_at DESC",
        );
      return NextResponse.json(
        segments.map((x) => ({
          ...x,
          count: people.filter(
            (p) =>
              p.newsletter && matches(p, segmentSchema.parse(x.definition)),
          ).length,
        })),
      );
    }
    if (path === "segments/preview" && write) {
      const definition = segmentSchema.parse(JSON.parse(await readBody(req))),
        people = (await getPeople()).filter(
          (p) => p.newsletter && matches(p, definition),
        );
      return NextResponse.json({
        count: people.length,
        people: people.slice(0, 25),
      });
    }
    if (path === "segments" && req.method === "POST") {
      const body = z
          .object({
            id: z.uuid().optional(),
            name: z.string().trim().min(1).max(100),
            definition: segmentSchema,
          })
          .strict()
          .parse(JSON.parse(await readBody(req))),
        id = body.id || randomUUID();
      await query(
        "INSERT INTO segments(id,name,definition) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,definition=EXCLUDED.definition,updated_at=now()",
        [id, body.name, JSON.stringify(body.definition)],
      );
      return NextResponse.json({ id });
    }
    if (parts[0] === "segments" && parts[2] === "export" && !write) {
      await rateLimit(`export:${s.username}`, 10, 3600);
      const segment = (
        await query<{ definition: unknown }>(
          "SELECT definition FROM segments WHERE id=$1",
          [parts[1]],
        )
      )[0];
      if (!segment) throw new HttpError(404, "Segment not found");
      const definition = segmentSchema.parse(segment.definition),
        people = (await getPeople()).filter(
          (p) => p.newsletter && matches(p, definition),
        );
      await query(
        "INSERT INTO audit_log(action,actor,detail) VALUES($1,$2,$3)",
        [
          "segment_export",
          s.username,
          JSON.stringify({ segment: parts[1], count: people.length }),
        ],
      );
      return new Response(exportPeople(people), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="tpo-segment.csv"',
          "cache-control": "no-store",
        },
      });
    }
    if (parts[0] === "segments" && parts[1] && req.method === "DELETE") {
      await query("DELETE FROM segments WHERE id=$1", [parts[1]]);
      return NextResponse.json({ ok: true });
    }
    if (path === "imports" && req.method === "POST") {
      await rateLimit("imports", 12, 3600);
      const body = z
        .object({
          kind: z.enum(["subscribers", "app_users", "web_events"]),
          filename: z.string().max(150),
          content: z.string(),
        })
        .parse(JSON.parse(await readBody(req, 9 * 1024 * 1024)));
      return NextResponse.json(
        await importCSV(body.kind, body.content, body.filename, s.username),
      );
    }
    if (path === "assistant" && req.method === "POST") {
      await rateLimit(`assistant:${s.username}`, 20, 3600);
      const body = z
        .object({ question: z.string().min(3).max(1000) })
        .strict()
        .parse(JSON.parse(await readBody(req)));
      return NextResponse.json(await askAssistant(body.question));
    }
    if (path === "activity" && !write) {
      const events = await query(
        `SELECT event_id,event,user_id,resolved_user_id,device_id,timestamp::text,ingested_at::text,test FROM app_events ORDER BY ingested_at DESC LIMIT 100`,
      );
      return NextResponse.json(events);
    }
    if (path === "lab/send" && req.method === "POST") {
      await rateLimit("lab", 60);
      const input = eventSchema.parse(JSON.parse(await readBody(req)));
      if (
        !input.event_id.startsWith("test_") ||
        !input.device_id.startsWith("test_") ||
        (input.user_id && !input.user_id.startsWith("test_"))
      )
        throw new HttpError(400, "Event Lab requires test_ identifiers");
      const body = JSON.stringify(input),
        timestamp = String(Math.floor(Date.now() / 1000)),
        secret = process.env.WEBHOOK_SECRET;
      if (!secret)
        throw new HttpError(503, "Webhook signing is not configured");
      const response = await fetch(
        `${process.env.APP_URL || "http://localhost:3000"}/webhooks/app`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tpo-timestamp": timestamp,
            "x-tpo-signature": `sha256=${sign(body, timestamp, secret)}`,
            "x-tpo-test": "1",
          },
          body,
          signal: AbortSignal.timeout(15000),
        },
      );
      return NextResponse.json({
        status: response.status,
        result: await response.json(),
      });
    }
    if (path === "settings" && !write)
      return NextResponse.json({
        username: s.username,
        role: s.role,
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
      });
    throw new HttpError(404, "Endpoint not found");
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid input. Check the required fields." },
        { status: 400 },
      );
    console.error(
      "API request failed",
      e instanceof Error ? e.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Request could not be completed." },
      { status: 500 },
    );
  }
}
export const GET = handler,
  POST = handler,
  DELETE = handler;
