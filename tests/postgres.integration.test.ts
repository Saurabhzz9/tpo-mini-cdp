import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { query, closeDb } from "../src/lib/db";
import { importCSV } from "../src/lib/importer";
import { ingestEvent } from "../src/lib/webhook";
import { getPeople } from "../src/lib/audience";
import { segmentMembers } from "../src/lib/segments";

// Only the dedicated throwaway database runner supplies this variable.
describe.skipIf(!process.env.TPO_POSTGRES_TEST_URL)(
  "network PostgreSQL identity transactions",
  () => {
    beforeAll(async () => {
      const url = new URL(process.env.TPO_POSTGRES_TEST_URL!);
      if (!/^\/tpo_verify_[a-f0-9]+$/.test(url.pathname))
        throw Error("Refusing non-test database");
      process.env.DATABASE_URL = url.toString();
      process.env.ANALYSIS_DATE = "2026-09-28";
      await query(await readFile("migrations/001_initial.sql", "utf8"));
    });
    afterAll(async () => {
      await closeDb();
      delete process.env.DATABASE_URL;
    });
    it("preserves raw duplicates and supports repeat-safe imports", async () => {
      const csv =
        "email,signup_date,status,acquisition_source,last_open_date\nreader@example.test,2026-08-01,active,Instagram,2026-09-20\n READER@example.test ,2026-08-01,active,Instagram,2026-09-20\n";
      await importCSV("subscribers", csv, "isolated.csv");
      expect(
        (await importCSV("subscribers", csv, "isolated.csv")).repeated,
      ).toBe(true);
      expect(await query("SELECT id FROM raw_records")).toHaveLength(2);
      expect((await getPeople())[0].duplicate_count).toBe(1);
    });
    it("serializes concurrent import and webhook identity creation without corrupting links", async () => {
      const results = await Promise.allSettled([
        importCSV(
          "app_users",
          "user_id,email,created_at\npg_concurrent,reader@example.test,2026-08-01\n",
          "accounts.csv",
        ),
        ingestEvent({
          event_id: "pg_first",
          event: "login",
          user_id: "pg_concurrent",
          device_id: "pg_device",
          timestamp: "2026-09-27T11:00:00Z",
          properties: {},
        }),
      ]);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      expect(
        await query(
          "SELECT user_id FROM app_users WHERE user_id='pg_concurrent'",
        ),
      ).toHaveLength(1);
      expect(
        await query(
          "SELECT event_id FROM app_events WHERE event_id='pg_first'",
        ),
      ).toHaveLength(1);
    });
    it("handles concurrent retries, late anonymous events, dynamic segments and conflicting claims", async () => {
      const event = {
        event_id: "pg_anonymous",
        event: "read_story",
        user_id: null,
        device_id: "pg_device",
        timestamp: "2026-09-27T10:00:00Z",
        properties: {},
      };
      const retries = await Promise.all(
        Array.from({ length: 5 }, () => ingestEvent(event)),
      );
      expect(retries.filter((r) => !r.duplicate)).toHaveLength(1);
      expect(
        (
          await query<{ resolved_user_id: string }>(
            "SELECT resolved_user_id FROM app_events WHERE event_id='pg_anonymous'",
          )
        )[0].resolved_user_id,
      ).toBe("pg_concurrent");
      expect(
        segmentMembers(await getPeople(), {
          scope: "all",
          match: "all",
          rules: [{ field: "story_reads", operator: "gte", value: 1 }],
        }),
      ).toHaveLength(1);
      await ingestEvent({
        ...event,
        event_id: "pg_second",
        event: "login",
        user_id: "pg_other",
        timestamp: "2026-09-27T12:00:00Z",
      });
      expect(
        (
          await query<{ resolved_user_id: null }>(
            "SELECT resolved_user_id FROM app_events WHERE event_id='pg_anonymous'",
          )
        )[0].resolved_user_id,
      ).toBeNull();
      await expect(
        ingestEvent({ ...event, event: "app_open" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  },
);
