import { parse } from "csv-parse/sync";
import { createHash, randomUUID } from "node:crypto";
import { getDb, type SQL } from "./db";
import { normalizeEmail } from "./identity";
export type ImportKind = "subscribers" | "app_users" | "web_events";
const columns = {
  subscribers: [
    "email",
    "signup_date",
    "status",
    "acquisition_source",
    "last_open_date",
  ],
  app_users: ["user_id", "email", "created_at"],
  web_events: ["visitor_id", "page", "timestamp", "utm_source", "email"],
};
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function parseCSV(
  kind: ImportKind,
  content: string,
): Record<string, string>[] {
  if (Buffer.byteLength(content) > 8 * 1024 * 1024)
    throw new Error("CSV exceeds 8 MB limit");
  let headers: string[] = [];
  const rows = parse(content, {
    bom: true,
    columns: (h: string[]) => {
      headers = h;
      return h;
    },
    skip_empty_lines: false,
    relax_column_count: false,
    max_record_size: 20000,
  }) as Record<string, string>[];
  if (headers.join(",") !== columns[kind].join(","))
    throw new Error(`Expected columns: ${columns[kind].join(", ")}`);
  if (rows.length > 50000) throw new Error("Maximum 50,000 records per import");
  return rows;
}
export function sourceDate(s: string) {
  if (!s) return null;
  // The supplied CSV uses timezone-less SQL timestamps. Interpret these as UTC.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)
    ? s.replace(" ", "T") + "Z"
    : s;
  if (
    !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(normalized) ||
    !Number.isFinite(Date.parse(normalized))
  )
    return null;
  if (
    new Date(normalized.slice(0, 10) + "T00:00:00Z")
      .toISOString()
      .slice(0, 10) !== normalized.slice(0, 10)
  )
    return null;
  return normalized;
}
const date = sourceDate;
async function bulk(
  tx: SQL,
  table: string,
  fields: string,
  types: string,
  records: unknown[],
) {
  if (records.length)
    await tx.query(
      `INSERT INTO ${table} (${fields}) SELECT ${fields} FROM jsonb_to_recordset($1::jsonb) AS x(${types}) ON CONFLICT DO NOTHING`,
      [JSON.stringify(records)],
    );
}
export async function importCSV(
  kind: ImportKind,
  content: string,
  filename: string,
  actor = "cli",
) {
  const rows = parseCSV(kind, content),
    checksum = hash(content),
    id = randomUUID();
  return (await getDb()).transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(481510)");
    const existing = await tx.query(
      "SELECT id,row_count FROM import_batches WHERE kind=$1 AND checksum=$2",
      [kind, checksum],
    );
    if (existing.rows.length)
      return {
        repeated: true,
        rows: rows.length,
        batchId: existing.rows[0].id,
      };
    if (
      kind !== "subscribers" &&
      !(await tx.query("SELECT id FROM people WHERE newsletter=true LIMIT 1"))
        .rows.length
    )
      throw new Error("Import subscribers first");
    await tx.query(
      "INSERT INTO import_batches(id,kind,filename,checksum,row_count) VALUES($1,$2,$3,$4,$5)",
      [id, kind, filename.slice(0, 150), checksum, rows.length],
    );
    const raw = rows.map((r, i) => ({
      id: `${id}:${i + 2}`,
      batch_id: id,
      row_number: i + 2,
      person_id: null as string | null,
      kind,
      original: r,
      flags: [] as string[],
    }));
    if (kind === "subscribers") {
      const old = (
        await tx.query<{ original: Record<string, string> }>(
          "SELECT original FROM raw_records WHERE kind=$1 ORDER BY batch_id,row_number",
          ["subscribers"],
        )
      ).rows.map((x) => x.original);
      const groups = new Map<string, Record<string, string>[]>();
      for (const r of [...old, ...rows]) {
        const email = normalizeEmail(r.email);
        if (email) {
          const group = groups.get(email);
          if (group) group.push(r);
          else groups.set(email, [r]);
        }
      }
      const canonical = [];
      for (const [email, records] of groups) {
        const sorted = [...records].sort(
          (a, b) =>
            (a.signup_date || "9999").localeCompare(b.signup_date || "9999") ||
            JSON.stringify(a).localeCompare(JSON.stringify(b)),
        );
        const first = sorted[0],
          opens = records
            .map((r) => date(r.last_open_date))
            .filter(Boolean)
            .sort() as string[];
        const conflict = [
          "status",
          "signup_date",
          "acquisition_source",
          "last_open_date",
        ].some((k) => new Set(records.map((r) => r[k])).size > 1);
        const personId = `p_${hash(email).slice(0, 24)}`;
        canonical.push({
          id: personId,
          email,
          newsletter: true,
          signup_date: date(first.signup_date),
          status: records.some((r) => r.status === "unsubscribed")
            ? "unsubscribed"
            : "active",
          source: first.acquisition_source || "Unknown",
          last_open_date: opens.at(-1) || null,
          duplicate_count: records.length - 1,
          conflict,
        });
      }
      await tx.query(
        `INSERT INTO people(id,email,newsletter,signup_date,status,source,last_open_date,duplicate_count,conflict) SELECT id,email,newsletter,signup_date,status,source,last_open_date,duplicate_count,conflict FROM jsonb_to_recordset($1::jsonb) AS x(id text,email text,newsletter boolean,signup_date date,status text,source text,last_open_date date,duplicate_count integer,conflict boolean) WHERE true ON CONFLICT(email) DO UPDATE SET newsletter=true,signup_date=EXCLUDED.signup_date,status=EXCLUDED.status,source=EXCLUDED.source,last_open_date=EXCLUDED.last_open_date,duplicate_count=EXCLUDED.duplicate_count,conflict=EXCLUDED.conflict`,
        [JSON.stringify(canonical)],
      );
      const persons = (
        await tx.query<{ id: string; email: string }>(
          "SELECT id,email FROM people WHERE email IS NOT NULL",
        )
      ).rows;
      const byEmail = new Map(persons.map((p) => [p.email, p.id]));
      for (const row of raw) {
        const r = row.original,
          email = normalizeEmail(r.email);
        row.person_id = email ? byEmail.get(email) || null : null;
        if (!Object.values(r).some((v) => v.trim())) row.flags.push("blank");
        else if (!email) row.flags.push("invalid_email");
        if (email && (groups.get(email)?.length || 0) > 1)
          row.flags.push("duplicate");
        if (
          !date(r.signup_date) ||
          !["active", "unsubscribed"].includes(r.status)
        )
          row.flags.push("missing_or_invalid_fields");
        if (r.last_open_date && !date(r.last_open_date))
          row.flags.push("invalid_date");
      }
    } else if (kind === "app_users") {
      for (const row of raw) {
        const r = row.original,
          email = normalizeEmail(r.email);
        if (
          !r.user_id ||
          !date(r.created_at) ||
          r.user_id.startsWith("test_")
        ) {
          row.flags.push("invalid_app_record");
          continue;
        }
        let person = (
          await tx.query<{ id: string; newsletter: boolean }>(
            "SELECT id,newsletter FROM people WHERE email=$1",
            [email],
          )
        ).rows[0];
        if (!person) {
          const pid = `p_${hash(email || r.user_id).slice(0, 24)}`;
          await tx.query(
            "INSERT INTO people(id,email) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [pid, email],
          );
          person = { id: pid, newsletter: false };
        }
        row.person_id = person.id;
        if (!person.newsletter) row.flags.push("unmatched_app");
        if (!email) row.flags.push("invalid_email");
        const existingUser = (
          await tx.query<{ person_id: string }>(
            "SELECT person_id FROM app_users WHERE user_id=$1",
            [r.user_id],
          )
        ).rows[0];
        if (existingUser && existingUser.person_id !== person.id) {
          row.flags.push("conflicting_app_identity");
          continue;
        }
        await tx.query(
          "INSERT INTO app_users(user_id,person_id,email,created_at,original) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
          [r.user_id, person.id, email, date(r.created_at), JSON.stringify(r)],
        );
      }
    } else {
      const people = (
          await tx.query<{ id: string; email: string }>(
            "SELECT id,email FROM people WHERE newsletter=true",
          )
        ).rows,
        byEmail = new Map(people.map((p) => [p.email, p.id]));
      const events = [];
      for (const row of raw) {
        const r = row.original;
        if (!r.visitor_id || !date(r.timestamp) || !r.page.startsWith("/")) {
          row.flags.push("invalid_web_event");
          continue;
        }
        if (r.email && !normalizeEmail(r.email))
          row.flags.push("invalid_email");
        row.person_id = byEmail.get(normalizeEmail(r.email) || "") || null;
        events.push({
          id: row.id,
          batch_id: id,
          person_id: row.person_id,
          visitor_id: r.visitor_id,
          page: r.page,
          timestamp: date(r.timestamp),
          utm_source: r.utm_source || null,
          original: r,
        });
      }
      await bulk(
        tx,
        "visitors",
        "visitor_id",
        "visitor_id text",
        [...new Set(events.map((event) => event.visitor_id))].map(
          (visitor_id) => ({ visitor_id }),
        ),
      );
      await bulk(
        tx,
        "web_events",
        "id,batch_id,person_id,visitor_id,page,timestamp,utm_source,original",
        "id text,batch_id text,person_id text,visitor_id text,page text,timestamp timestamptz,utm_source text,original jsonb",
        events,
      );
      const claims = new Map<string, Set<string>>();
      const all = (
        await tx.query<{
          visitor_id: string;
          original: Record<string, string>;
        }>("SELECT visitor_id,original FROM web_events")
      ).rows;
      for (const e of all) {
        const email = normalizeEmail(e.original.email);
        if (email) {
          if (!claims.has(e.visitor_id)) claims.set(e.visitor_id, new Set());
          claims.get(e.visitor_id)!.add(email);
        }
      }
      const mappings = [...claims].map(([visitor_id, emails]) => {
        const list = [...emails],
          pid = list.length === 1 ? byEmail.get(list[0]) || null : null;
        return {
          visitor_id,
          person_id: pid,
          ambiguous: list.length > 1,
          claims: list,
        };
      });
      await tx.query(
        `UPDATE visitors v SET person_id=x.person_id,ambiguous=x.ambiguous,claims=x.claims FROM jsonb_to_recordset($1::jsonb) AS x(visitor_id text,person_id text,ambiguous boolean,claims jsonb) WHERE v.visitor_id=x.visitor_id`,
        [JSON.stringify(mappings)],
      );
      await tx.query(
        `UPDATE web_events w SET person_id=v.person_id FROM visitors v WHERE w.visitor_id=v.visitor_id AND coalesce(w.original->>'email','')=''`,
      );
    }
    await bulk(
      tx,
      "raw_records",
      "id,batch_id,row_number,person_id,kind,original,flags",
      "id text,batch_id text,row_number integer,person_id text,kind text,original jsonb,flags text[]",
      raw,
    );
    if (kind === "subscribers")
      await tx.query(
        "UPDATE raw_records r SET flags=array_append(r.flags,'duplicate') FROM people p WHERE r.person_id=p.id AND r.kind='subscribers' AND p.duplicate_count>0 AND NOT ('duplicate'=ANY(r.flags))",
      );
    if (kind === "subscribers")
      await tx.query(
        "UPDATE raw_records r SET flags=array_append(r.flags,'conflicting_values') FROM people p WHERE r.person_id=p.id AND r.kind='subscribers' AND p.conflict AND NOT ('conflicting_values'=ANY(r.flags))",
      );
    await tx.query(
      "INSERT INTO audit_log(action,actor,detail) VALUES($1,$2,$3)",
      [
        "csv_import",
        actor,
        JSON.stringify({ kind, rows: rows.length, batchId: id }),
      ],
    );
    return { repeated: false, rows: rows.length, batchId: id };
  });
}
