# Azure deployment runbook

Status: configuration is prepared and Bicep syntax compilation has succeeded. No hosting resources have been provisioned for this project, no public URL has been verified, and no costs have been approved. The existing Azure AI deployment was reused for an aggregate smoke test; no model deployment was created.

## Proposed services and cost approval

The template selects Linux App Service Basic B1, PostgreSQL Flexible Server Burstable Standard_B1ms (PostgreSQL 16, 32 GB storage, 7-day backup retention, no HA), and an existing approved Azure AI Foundry deployment. No Redis, Kubernetes, GPU, separate ingestion service or paid observability workspace is introduced.

Microsoft's public US-dollar example prices checked October 15, 2026 list approximately $13.14/month for [Linux B1](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/) and $12.41/month for [PostgreSQL B1ms compute](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/). Database storage, inference, egress, taxes and regional variation are additional. A planning envelope is roughly $30–45/month for a small always-on assessment deployment, excluding heavy model usage; this is an estimate, not a subscription-specific quote. Recheck the chosen region and subscription's retail calculator before requesting approval. Do not run resource-creation commands before that approval.

Create a resource-group cost budget with alerts at 50%, 80% and 100% of the approved amount. Supply the intended recipient explicitly; this repository does not assume an email address or send notifications. Budgets alert rather than impose a hard spending cap. Use a dedicated resource group so cleanup does not affect existing applications.

## Prepare a release on Linux

Use Node.js 24. Windows standalone output may contain absolute junctions and must not be copied to Linux hosting. The Dockerfile builds on Linux and runs as an unprivileged user; alternatively prepare a Linux ZIP:

```sh
npm ci
npm run typecheck
npm test
npm run build
mkdir -p release/.next release/scripts
cp -R .next/standalone/. release/
cp -R .next/static release/.next/static
cp -R public migrations release/
cp scripts/migrate-prod.mjs release/scripts/
```

Verify no `.env*`, `.local-access.txt`, `.data`, development credentials, dataset CSVs, screenshots or test traces enter `release/`. Create the ZIP with the release directory contents at archive root, including `.next`; do not wrap everything in a parent directory. See [Azure ZIP deployment requirements](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip). The PowerShell helper illustrates staging but explicitly warns that its Windows build is not a Linux release.

## Provision only after approval

1. Choose the region, globally unique `appName`, dedicated resource group, existing AI deployment and a database password. Generate independent session/signing secrets and a scrypt staff-password hash. Supply secure Bicep parameters through an ignored local parameter file or a secure deployment pipeline; never command-line plaintext or committed parameter values.
2. Validate `infra/main.bicep` with `az bicep build --file infra/main.bicep`. Run an ARM what-if review before creating resources. The template intentionally does not create an AI deployment.
3. Create the approved resource group and deploy the template. With the default empty database IP allowlist the database rejects network clients. That is expected; do not enable the broad “allow all Azure services” firewall shortcut.
4. Read the new web app's `outboundIpAddresses` and `possibleOutboundIpAddresses`. Redeploy with exactly those required IPs in `allowedDatabaseIps`. If importing locally, temporarily allow only the developer's current public IP and remove it afterward. For organizational use prefer private networking.
5. Use Key Vault references for runtime secrets where practical. Verify `DATABASE_URL` uses `sslmode=verify-full` and the Azure PostgreSQL certificate chain is trusted. `APP_URL` must be the exact HTTPS origin; it controls mutation CSRF checks and internal Event Lab delivery. Keep `ALLOW_LOCAL_DB` unset in hosting.
6. Deploy the Linux release ZIP using `az webapp deploy --resource-group <group> --name <app> --src-path <zip> --type zip`. Runtime command is `node scripts/migrate-prod.mjs && node server.js`; `PORT=8080` and `HOSTNAME=0.0.0.0` are set in the template. Initial health stays unavailable until the migrations can connect.
7. Log in, upload the three supplied CSVs through Settings in order, and repeat-upload one to verify checksum idempotency. Alternatively run the CLI importer from an explicitly allowed host against the production `DATABASE_URL` during a maintenance window.
8. Split migration-owner credentials from the least-privilege application role. Verify backups and a restore into an isolated database. Record app URL, webhook URL, Azure region, deployed commit and database migration version.

## Release acceptance checks

- `GET /api/health` returns 200, and an anonymous `GET /api/people` returns 401.
- UI redirects to login before exposing data. Cookie has Secure, HttpOnly, SameSite and eight-hour expiry. HTTP redirects to HTTPS.
- Baseline totals match the reproducible tests, including 10,000 website events and 8,441 resolved links.
- Invalid signature and stale signing time are rejected. Signed live delivery, duplicate redelivery, unknown users, anonymous login backfill and shared-device ambiguity work on the actual PostgreSQL server.
- A newly received real app event appears in profile lookup and changes an applicable dynamic segment without a restart. Test namespace activity does not inflate analytics.
- Azure assistant returns a real answer and a saved model-proposed segment. Model request capture contains only approved intents/aggregates, never identities.
- Runtime logs contain safe operation labels, not request bodies, CSV rows, database URLs or credentials.

Public hosting, actual cloud PostgreSQL integration, Docker image execution and the Loom recording remain separate verification steps. Bicep compilation alone proves none of those.
