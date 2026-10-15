# Architecture decisions

One Next.js App Router application owns rendering, authenticated APIs, CSV ingestion, analytics, and `POST /webhooks/app`. Business logic lives in `src/lib`, independent of the route handlers. No separate backend, queue, graph database, Redis, or background worker is required for this dataset. TypeScript is strict; parameterized PostgreSQL queries form the typed persistence layer rather than a separate ORM.

## PostgreSQL in both environments

Local development uses PGlite, a real embedded PostgreSQL engine, persisted under `.data`. One Node process must own this directory; stop the application before running CLI imports or migrations. The browser importer uses the running process safely. In production, `DATABASE_URL` selects a connection pool against PostgreSQL; the embedded fallback is refused unless explicitly enabled for a local release smoke test. PGlite is not the hosted datastore. The same SQL schema and transactions run in both modes.

## Raw data and canonical identity

Every CSV row, including blank and invalid rows, is stored as original JSON with batch, row number, flags, and optional canonical person reference. Entire file checksums prevent repeated imports. Different content is retained as a new batch, not silently discarded. Import subscribers first; app accounts and website visits require a newsletter identity layer.

Email normalization is exclusively `normalizeEmail` in `src/lib/identity.ts`: trim, lowercase, validate with Zod. No Gmail-specific rewriting. Valid normalized email is unique in `people`; deterministic hash-derived internal IDs are not sent to AI. Duplicates keep all raw records. Earliest signup wins; latest observed newsletter open wins; any unsubscribed row wins for status; earliest signup record supplies acquisition source, with a deterministic JSON tie-break. Divergent metadata sets the conflict flag. These are conservative snapshot merge rules, not subscription consent history.

App accounts link through normalized valid email; unmatched accounts retain standalone profiles. Direct email-bearing web events link to matching newsletter identities. Anonymous events inherit the visitor mapping only when all valid email claims for that visitor agree. Conflicting claims revoke anonymous backfill; direct explicit claims stay attached. Invalid/unknown emails never become trusted visitor claims for another subscriber.

## Live app events

HMAC-SHA256 covers `timestamp.rawBody`. Five-minute request tolerance and constant-time signature comparison protect delivery. A primary key enforces persisted event idempotency. A canonical payload digest distinguishes identical retries (200) from conflicting reuse (409). Advisory transaction locks serialize event and device changes across application instances; no in-memory deduplication is used.

Event timestamp and ingestion timestamp are separate. Every delivery recomputes the affected device association. Anonymous events at or before a valid login attach only when exactly one explicit user has ever claimed the device. A second user revokes inferred mappings on anonymous events, even if delivered later; explicit user assignments stay intact. Anonymous events after the latest login remain unresolved. This intentionally under-links shared devices rather than guessing session ownership.

Unknown IDs create standalone app accounts and profiles within the same transaction. Test namespace events are derived from the signed event ID (`test_`); the unsigned test header is not trusted. Test identities and events are excluded from audience analytics. Timelines and dynamic segment queries see committed events immediately, with periodic browser refresh.

## Historical analysis

`ANALYSIS_DATE`, defaulting to September 28, 2026, is centralized in `src/lib/config.ts`. Days-since calculations use UTC and clamp future observations to zero. Actual receipt time always uses the database clock. CSV timestamps without offsets are explicitly interpreted as UTC. App metrics include committed live events, even if received after the historical reference date; this distinction is displayed in the UI.

## AI privacy boundary

`classifyQuestion` transforms user text into a small approved intent. Original user messages never cross the model transport. Emails and recognizable identifying IDs are rejected; freeform names and other words are discarded, not echoed. Unsupported historical change/retention/revenue questions are declined.

`safeAnalytics` produces only numeric aggregates, enumerated source labels, approved page paths, signup months, or approved segment definitions and opaque segment references. It never returns people, emails, app/device/visitor IDs, arbitrary source metadata, or raw rows. Counts from one through four are suppressed. Imported page labels are allowlisted before inference.

For segment requests Azure calls `buildSegmentDefinition` using structured function arguments. The server validates the proposal against the approved intent and executes the segment itself. The model receives only the definition, suppressed count, and opaque segment reference; the authenticated browser fetches real membership separately. Other supported requests use deterministic aggregate queries followed by an Azure explanation. The UI exposes exactly what aggregate data went to the model. Model text is untrusted explanatory output; the inspectable numeric data remains authoritative.

## Scaling threshold

The current audience query computes rollups in SQL then applies segments in server memory, appropriate for roughly 3,000 readers. Introduce compiled parameterized segment SQL and incremental materialized rollups when measured latency or audience size warrants it. Extract ingestion only if sustained throughput or isolation requirements exceed the single-app transaction model. The global advisory lock is correct but limits ingestion throughput. Move staff authentication to organizational SSO and database migrations to a separately privileged release job before broader organizational rollout.
