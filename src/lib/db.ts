import { PGlite } from "@electric-sql/pglite";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Pool } from "pg";
export interface SQL {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}
type DB = SQL & {
  transaction<T>(fn: (tx: SQL) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
const globalDb = globalThis as unknown as { tpoDb?: Promise<DB> };
export async function getDb(): Promise<DB> {
  if (!globalDb.tpoDb)
    globalDb.tpoDb = (async () => {
      if (process.env.DATABASE_URL) {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 8,
          connectionTimeoutMillis: 15000,
          statement_timeout: 120000,
          lock_timeout: 15000,
          idle_in_transaction_session_timeout: 60000,
        });
        const connectionClosed = () =>
          console.error("Database connection closed");
        pool.on("error", connectionClosed);
        return {
          query: async <T>(s: string, p?: unknown[]) => ({
            rows: (await pool.query(s, p)).rows as T[],
          }),
          transaction: async <T>(fn: (tx: SQL) => Promise<T>) => {
            const c = await pool.connect();
            c.on("error", connectionClosed);
            try {
              await c.query("BEGIN");
              const v = await fn({
                query: async <T>(s: string, p?: unknown[]) => ({
                  rows: (await c.query(s, p)).rows as T[],
                }),
              });
              await c.query("COMMIT");
              return v;
            } catch (e) {
              await c.query("ROLLBACK").catch(() => {});
              throw e;
            } finally {
              c.removeListener("error", connectionClosed);
              c.release();
            }
          },
          close: () => pool.end(),
        };
      }
      if (
        process.env.NODE_ENV === "production" &&
        process.env.ALLOW_LOCAL_DB !== "1"
      )
        throw new Error("DATABASE_URL is required in production");
      const location = process.env.PGLITE_PATH || ".data/postgres";
      if (location !== "memory://")
        await mkdir(dirname(location), { recursive: true });
      const db = new PGlite(location);
      await db.waitReady;
      return {
        query: async <T>(s: string, p?: unknown[]) => ({
          rows: (await db.query(s, p)).rows as T[],
        }),
        transaction: async <T>(fn: (tx: SQL) => Promise<T>) =>
          db.transaction(async (tx) =>
            fn({
              query: async <T>(s: string, p?: unknown[]) => ({
                rows: (await tx.query(s, p)).rows as T[],
              }),
            }),
          ),
        close: () => db.close(),
      };
    })();
  return globalDb.tpoDb;
}
export async function query<T = Record<string, unknown>>(
  s: string,
  p?: unknown[],
) {
  return (await (await getDb()).query<T>(s, p)).rows;
}
export async function closeDb() {
  if (globalDb.tpoDb) {
    await (await globalDb.tpoDb).close();
    delete globalDb.tpoDb;
  }
}
