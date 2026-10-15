import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (existsSync(".env")) {
  console.log(".env already exists; no settings changed.");
  process.exit(0);
}
const password = randomBytes(15).toString("base64url"),
  salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
writeFileSync(
  ".env",
  `APP_URL=http://localhost:3000\nSESSION_SECRET=${randomBytes(48).toString("hex")}\nWEBHOOK_SECRET=${randomBytes(32).toString("hex")}\nADMIN_USERNAME=admin\nADMIN_PASSWORD_HASH=${hash}\nANALYSIS_DATE=2026-09-28\n`,
  { mode: 0o600 },
);
writeFileSync(
  ".local-access.txt",
  `Local login\nUsername: admin\nPassword: ${password}\n`,
  { mode: 0o600 },
);
console.log(
  "Generated .env and .local-access.txt. Read the local access file for your password. Never commit these files.",
);
