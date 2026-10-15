import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { importCSV } from "../src/lib/importer";
import { closeDb } from "../src/lib/db";
import { migrate } from "./migrate";
await migrate();
const directory = process.argv[2] || "data";
for (const kind of ["subscribers", "app_users", "web_events"] as const) {
  const filename = `${kind}.csv`;
  const result = await importCSV(
    kind,
    await readFile(join(directory, filename), "utf8"),
    filename,
  );
  console.log(kind, result);
}
await closeDb();
