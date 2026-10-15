import "dotenv/config";
import { readFile } from "node:fs/promises";
import { getDb, closeDb } from "../src/lib/db";
export async function migrate() {
  const sql = await readFile("migrations/001_initial.sql", "utf8");
  await (
    await getDb()
  ).transaction(async (tx) => {
    for (const statement of sql.split(";").filter((s) => s.trim()))
      await tx.query(statement);
  });
}
if (process.argv[1]?.endsWith("migrate.ts")) {
  await migrate();
  console.log("Database migrations applied.");
  await closeDb();
}
