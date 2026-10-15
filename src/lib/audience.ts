import { query } from "./db";
import { daysSince, sources, analysisDate } from "./config";
export interface Person {
  id: string;
  email: string | null;
  newsletter: boolean;
  signup_date: string | null;
  status: string;
  source: string;
  last_open_date: string | null;
  duplicate_count: number;
  conflict: boolean;
  web_visits: number;
  app_accounts: number;
  app_events: number;
  story_reads: number;
  web_pages: string[];
  utm_sources: string[];
  app_types: string[];
  last_web: string | null;
  last_app: string | null;
  first_web: string | null;
  app_ids: string[];
  visitor_ids: string[];
  score: number;
  days_inactive: number | null;
  never_opened: boolean;
  score_breakdown: { newsletter: number; website: number; app: number };
}
export async function getPeople(): Promise<Person[]> {
  const rows = await query<Person>(
    `WITH w AS (SELECT person_id,count(*)::int web_visits,array_agg(DISTINCT page) web_pages,array_agg(DISTINCT utm_source) FILTER(WHERE utm_source IS NOT NULL) utm_sources,min(timestamp)::text first_web,max(timestamp)::text last_web,array_agg(DISTINCT visitor_id) visitor_ids FROM web_events WHERE person_id IS NOT NULL GROUP BY person_id), a AS (SELECT u.person_id,count(DISTINCT u.user_id)::int app_accounts,array_agg(DISTINCT u.user_id) app_ids,count(e.event_id)::int app_events,count(e.event_id) FILTER(WHERE e.event='read_story')::int story_reads,array_agg(DISTINCT e.event) FILTER(WHERE e.event IS NOT NULL) app_types,max(e.timestamp)::text last_app FROM app_users u LEFT JOIN app_events e ON e.resolved_user_id=u.user_id AND NOT e.test GROUP BY u.person_id) SELECT p.id,p.email,p.newsletter,p.signup_date::text,p.status,p.source,p.last_open_date::text,p.duplicate_count,p.conflict,coalesce(w.web_visits,0) web_visits,coalesce(a.app_accounts,0) app_accounts,coalesce(a.app_events,0) app_events,coalesce(a.story_reads,0) story_reads,coalesce(w.web_pages,'{}') web_pages,coalesce(w.utm_sources,'{}') utm_sources,coalesce(a.app_types,'{}') app_types,w.last_web,w.first_web,a.last_app,coalesce(a.app_ids,'{}') app_ids,coalesce(w.visitor_ids,'{}') visitor_ids FROM people p LEFT JOIN w ON w.person_id=p.id LEFT JOIN a ON a.person_id=p.id WHERE NOT p.test ORDER BY p.signup_date DESC NULLS LAST,p.id`,
  );
  return rows.map((p) => {
    const d = daysSince(p.last_open_date),
      newsletter =
        d === null ? 0 : d <= 7 ? 40 : d <= 30 ? 25 : d <= 60 ? 10 : 0,
      website = Math.min(30, p.web_visits * 3),
      app = Math.min(30, p.story_reads * 5 + p.app_events * 2);
    return {
      ...p,
      days_inactive: d,
      never_opened: p.newsletter && !p.last_open_date,
      score: newsletter + website + app,
      score_breakdown: { newsletter, website, app },
    };
  });
}
export async function overview() {
  const people = await getPeople(),
    subs = people.filter((p) => p.newsletter),
    batches = await query<{
      kind: string;
      row_count: number;
      created_at: string;
      filename: string;
    }>(
      "SELECT kind,row_count,created_at::text,filename FROM import_batches ORDER BY created_at DESC",
    );
  const summary = {
    subscribers: subs.length,
    active: subs.filter((p) => p.status === "active").length,
    unsubscribed: subs.filter((p) => p.status === "unsubscribed").length,
    inactive: subs.filter(
      (p) => p.days_inactive === null || p.days_inactive >= 30,
    ).length,
    neverOpened: subs.filter((p) => p.never_opened).length,
    appLinked: subs.filter((p) => p.app_accounts > 0).length,
    webEngaged: subs.filter((p) => p.web_visits > 0).length,
    duplicateGroups: subs.filter((p) => p.duplicate_count > 0).length,
    duplicateRows: subs.reduce((s, p) => s + p.duplicate_count, 0),
    standalone: people.filter((p) => !p.newsletter).length,
    webEvents: Number(
      (await query<{ n: string }>("SELECT count(*) n FROM web_events"))[0].n,
    ),
    appEvents: Number(
      (
        await query<{ n: string }>(
          "SELECT count(*) n FROM app_events WHERE NOT test",
        )
      )[0].n,
    ),
    rawRows: Number(
      (await query<{ n: string }>("SELECT count(*) n FROM raw_records"))[0].n,
    ),
    linkedWebEvents: subs.reduce((s, p) => s + p.web_visits, 0),
  };
  const acquisition = sources
    .map((source) => {
      const group = subs.filter((p) => p.source === source);
      return {
        source,
        count: group.length,
        engaged: group.filter(
          (p) => p.days_inactive !== null && p.days_inactive < 30,
        ).length,
        inactive: group.filter(
          (p) => p.days_inactive === null || p.days_inactive >= 30,
        ).length,
        app: group.filter((p) => p.app_accounts > 0).length,
        web: group.filter((p) => p.web_visits > 0).length,
      };
    })
    .filter((x) => x.count);
  const cohorts = Object.entries(
    Object.groupBy(subs, (p) => (p.signup_date || "Unknown").slice(0, 7)),
  )
    .map(([month, ps]) => ({
      month,
      count: ps!.length,
      engaged: ps!.filter(
        (p) => p.days_inactive !== null && p.days_inactive < 30,
      ).length,
      app: ps!.filter((p) => p.app_accounts > 0).length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const topPages = await query<{ page: string; visits: number }>(
    `SELECT page,count(*)::int visits FROM web_events GROUP BY page ORDER BY visits DESC LIMIT 16`,
  );
  const daily = await query<{ date: string; visits: number }>(
    `SELECT timestamp::date::text date,count(*)::int visits FROM web_events WHERE timestamp::date BETWEEN $1::date-29 AND $1::date GROUP BY timestamp::date ORDER BY timestamp::date`,
    [analysisDate().toISOString().slice(0, 10)],
  );
  return {
    summary,
    acquisition,
    cohorts,
    topPages,
    daily,
    batches,
    referenceDate: analysisDate().toISOString().slice(0, 10),
  };
}
export async function profile(id: string) {
  const person = (await getPeople()).find((p) => p.id === id);
  if (!person) return null;
  const raw = await query(
    "SELECT r.id,r.kind,r.row_number,r.original,r.flags FROM raw_records r WHERE r.person_id=$1 OR EXISTS(SELECT 1 FROM web_events w WHERE w.id=r.id AND w.person_id=$1) ORDER BY r.kind,r.row_number LIMIT 1000",
    [id],
  );
  const web = await query<{
    id: string;
    page: string;
    timestamp: string;
    visitor_id: string;
    utm_source: string;
  }>(
    "SELECT id,page,timestamp::text,visitor_id,utm_source FROM web_events WHERE person_id=$1 ORDER BY timestamp DESC LIMIT 200",
    [id],
  );
  const app = await query(
    `SELECT e.event_id,e.event,e.device_id,e.user_id,e.resolved_user_id,e.timestamp::text,e.ingested_at::text,e.properties FROM app_events e JOIN app_users u ON e.resolved_user_id=u.user_id WHERE u.person_id=$1 AND NOT e.test ORDER BY e.timestamp DESC LIMIT 200`,
    [id],
  );
  const devices = [...new Set(app.map((e) => String(e.device_id)))];
  return { person, raw, web, app, devices };
}
