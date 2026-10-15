# The Pour Over · Reader Intelligence

A mini customer data platform for Growth: preserved source records, canonical reader profiles, identity relationships, dynamic audiences, signed app events, acquisition insights and an aggregate-only Azure AI assistant.

**[Live assessment demo](https://tpo-cdp-s9-261015.azurewebsites.net)** · Hosting ends **October 29, 2026 at 12:00 IST**. Administrator credentials are handed over separately in ignored local access files. The fixed hosting estimate is US$28.50/month, within the approximately US$30/month target before inference, network usage and taxes; dedicated demo resources are scheduled for removal after fourteen days. See [deployment and cleanup](docs/DEPLOYMENT.md).

![Reader Intelligence dashboard](docs/cloud-overview.png)

## Run locally

Requires Node.js 24 and npm. Local PGlite runs PostgreSQL without a separate database installation.

```sh
npm ci
npm run setup
npm run import
npm run dev
```

Open [localhost:3000](http://localhost:3000). Setup creates ignored `.env` and `.local-access.txt` files with a generated administrator login; no shared password is committed. The synthetic CSVs are in `data/`. Identical imports are checksum no-ops; original rows are preserved. For other files use `npm run import -- /path/to/csv-directory`, in subscriber → app-user → web-event order. Stop the local app before CLI imports because PGlite requires one owning process; the authenticated Settings importer works within the running app.

## Capabilities

- Source-backed overview: 2,900 canonical newsletter people, 10,000 website events, 8,441 resolved visits and 900 linked app accounts.
- Search and Subscriber 360 with identity relationships, newsletter snapshots, channel chronology and raw duplicate lineage.
- Data Quality Center for blank/invalid rows, duplicates, unmatched accounts and unresolved visitors.
- AND/OR segments, newsletter/all-profile scope, current previews, saved audiences and formula-safe authorized CSV export.
- Durable signed webhooks, conflicting retry rejection, unknown accounts and conservative event-time identity linking; isolated Event Lab demonstrations.
- Acquisition/cohort insights and transparent engagement scores. AI answers use allowlisted aggregates and validated segment proposals, with inspectable model input.

The visual system follows [The Pour Over's](https://thepourover.org/) Poppins typography, coral accents, white/gray surfaces and dark text. Fonts are self-hosted under the bundled Open Font License. This is an assessment application, not an official production service.

## Configuration

One full-stack Next.js 16 / React 19 application uses strict TypeScript, Zod, parameterized SQL, PostgreSQL/PGlite and iron-session. Services live in `src/lib`; authenticated APIs and `POST /webhooks/app` are Next.js route handlers.

| Variable | Purpose |
|---|---|
| `APP_URL` | Exact public origin and Event Lab delivery target |
| `SESSION_SECRET` | At least 32 random characters; seals eight-hour sessions |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Admin login; hash format `salt:scrypt(password,salt,64).hex` |
| `ANALYST_USERNAME`, `ANALYST_PASSWORD_HASH` | Optional analyst login, without imports/Event Lab |
| `WEBHOOK_SECRET` | At least 32 random characters shared with event sender |
| `ANALYSIS_DATE` | Historical reference date, default `2026-09-28` |
| `DATABASE_URL` | Hosted PostgreSQL URL with verified TLS; required in production |
| `PGLITE_PATH` | Local persistent database directory, default `.data/postgres` |
| `AZURE_AI_ENDPOINT`, `AZURE_AI_DEPLOYMENT`, `AZURE_AI_KEY` | Server-only approved Azure model configuration; endpoint excludes `/openai/v1` |

See `.env.example`. Missing AI configuration returns an explicit unavailable state while other features remain usable. Use `ALLOW_LOCAL_DB=1` with `npm start` only to inspect a locally built optimized release; leave it unset in hosted production.

## Webhook contract

JSON fields: `event_id`, `event` (`app_open`, `read_story`, `link_click`, `login`), nullable `user_id`, `device_id`, ISO timestamp and bounded scalar `properties`. Login requires a user ID.

```text
Content-Type: application/json
X-TPO-Timestamp: <current Unix seconds>
X-TPO-Signature: sha256=<HMAC-SHA256(secret, timestamp + '.' + exact raw JSON body)>
```

Signing time uses the actual clock, independent of historical event time; tolerance is five minutes. New events return 201, identical retries 200 with `duplicate:true`, conflicting reuse 409. The database enforces idempotency. Reserved `test_` events require matching test device/user identifiers and stay outside audience analytics. `npm run webhook:send -- /path/to/event.json` sends a signed delivery; without a file it creates a demonstration event that changes live metrics. Event Lab provides isolated test traffic.

## Review and submission

[Architecture](docs/ARCHITECTURE.md), [data/metric definitions](docs/DATA_DICTIONARY.md), [security](docs/SECURITY.md), [deployment](docs/DEPLOYMENT.md) and [verification](docs/VERIFICATION.md) cover operation, reproduction and remaining limits. Linux CI builds and deploys to the existing Azure app using scoped OIDC. No manual Linux ZIP download is needed.

[Engineering ownership](docs/DEVELOPMENT_PROCESS.md) documents Saurabh Rai's architecture, database, product, privacy/security, infrastructure, source review, browser/E2E involvement and technical acceptance, alongside AI-assisted code generation and recorded automated execution. Point 9 of the single [raw nine-question self-audit](docs/SELF_AUDIT.md) directly records these responsibilities; that complete response remains verbatim and identifies its source snapshot through the integrity manifest.

The **Loom walkthrough recording remains a required submission deliverable** and has not been recorded. Personal recording preparation, dialogue and media stay outside tracked source.

Known limits include fixed AI intents, snapshot rather than longitudinal retention data, conservative shared-device linking, no staff MFA/selective session revocation, and unverified Docker execution/backup restoration. Wider rollout needs measured scale and operational hardening.

## Ownership and assessment use

© 2026 **Saurabh Rai · Saurabhzz9**. Provided for hiring assessment evaluation only. Reuse, redistribution or operational/commercial incorporation of protected submission material requires prior written permission; non-selection does not grant a broader license. See [LICENSE.md](LICENSE.md). The Pour Over's marks, supplied assessment materials, dependencies and fonts retain their respective rights and licenses.
