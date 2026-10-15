import { readdir, unlink, cp } from "node:fs/promises";
import { join } from "node:path";
// Next.js copies loaded .env files into standalone output. Never ship them.
const root = ".next/standalone";
for (const file of await readdir(root, { withFileTypes: true })) {
  if (file.isFile() && file.name.startsWith(".env"))
    await unlink(join(root, file.name));
}
await cp(".next/static", join(root, ".next/static"), { recursive: true });
await cp("public", join(root, "public"), { recursive: true });
console.log(
  "Standalone output contains no environment files. Supply runtime secrets through hosting configuration.",
);
