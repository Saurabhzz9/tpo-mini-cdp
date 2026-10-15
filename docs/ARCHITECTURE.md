# Architecture decisions

One Next.js App Router application owns rendering, authenticated APIs, CSV ingestion, analytics, and `POST /webhooks/app`. Business logic lives in `src/lib`, independent of the route handlers. No separate backend, queue, graph database, Redis, or background worker is required for this dataset. TypeScript is strict; parameterized PostgreSQL queries form the typed persistence layer rather than a separate ORM.

## Frontend feature boundaries

The former 2,518-line `components/workspace.tsx` has been replaced by explicit App Router pages and ten feature components: dashboard, subscriber list/profile, segments, activity, insights, data quality, assistant, Event Lab and settings. Each route imports its own feature. Recharts is imported only by the two analytics features. Shared presentation primitives and the reader table have small, deliberate reuse boundaries; state remains with the feature that owns the interaction.

The protected Server Component layout authenticates the session and projects only public workspace settings into a persistent client shell. The shell owns mobile navigation and logout, and receives the active page as children. Its settings context contains no database URL, signing key, password hash or model key. Route changes preserve the shell; there is no repeated browser settings request. Interactive features remain Client Components because they own forms, charts or live refresh. Layout authentication and public configuration projection run on the server; API authorization is independently enforced.

`hooks/use-data.ts` owns browser transport lifecycle: abort superseded/unmounted requests, reject older responses, clear data when the resource path changes, avoid overlapping polling and skip periodic work in hidden tabs. It does not introduce a global application store or cache potentially stale identity data. `lib/client-api.ts` handles browser HTTP behavior; `lib/format.ts` and `lib/segment-fields.ts` are client-safe. Type-only contracts live in `types/workspace.ts`; database/model implementations are not runtime client imports. Route loading and error boundaries provide recovery without exposing exception details.

Feature-specific login, dashboard, subscriber profile, segment, insight, quality, assistant, Event Lab and settings styles live in CSS Modules with their responsive rules. Global CSS retains tokens, reset/typography, shared controls, tables, reusable layout primitives and shell styles. Stable semantic DOM classes remain for readability and browser tests, while module names scope feature styling. The existing light interface, chart dimensions and mobile behavior are preserved; dark mode and modals were not existing features and are not invented as part of this refactor.

## PostgreSQL in both environments

Local development uses PGlite, a real embedded PostgreSQL engine, persisted under `.data`. One Node process must own this directory; stop the application before running CLI imports or migrations. The browser importer uses the running process safely. In production, `DATABASE_URL` selects a connection pool against PostgreSQL; the embedded fallback is refused unless explicitly enabled for a local release smoke test. PGlite is not the hosted datastore. The same SQL schema and transactions run in both modes.

## Raw data and canonical identity

Every CSV row, including blank and invalid rows, is stored as original JSON with batch, row number, flags, and optional canonical person reference. Entire file checksums prevent repeated imports. Different content is retained as a new batch, not silently discarded. Import subscribers first; app accounts and website visits require a newsletter identity layer.

Email normalization is exclusively `normalizeEmail` in `src/lib/identity.ts`: trim, lowercase, validate with Zod. No Gmail-specific rewriting. Valid normalized email is unique in `people`; deterministic hash-derived internal IDs are not sent to AI. Duplicates keep all raw records. Earliest signup wins; latest observed newsletter open wins; any unsubscribed row wins for status; earliest signup record supplies acquisition source, with a deterministic JSON tie-break. Divergent metadata sets the conflict flag. These are conservative snapshot merge rules, not subscription consent history.

App accounts link through normalized valid email; unmatched accounts retain standalone profiles. Direct email-bearing web events link to matching newsletter identities. Anonymous events inherit the visitor mapping only when all valid email claims for that visitor agree. Conflicting claims revoke anonymous backfill; direct explicit claims stay attached. Invalid/unknown emails never become trusted visitor claims for another subscriber.

## Live app events

HMAC-SHA256 covers `timestamp.rawBody`. Five-minute request tolerance and constant-time signature comparison protect delivery. A primary key enforces persisted event idempotency. A canonical payload digest distinguishes identical retries (200) from conflicting reuse (409). Advisory transaction locks serialize event and device changes across application instances; no in-memory deduplication is used.

Event timestamp and ingestion timestamp are separate. Every delivery recomputes the affected device association. Anonymous events at or before a valid login attach only when exactly one explicit user has ever claimed the device. A second user revokes inferred mappings on anonymous events, even if delivered later; explicit user assignments stay intact. Anonymous events after the latest login remain unresolved. This intentionally under-links shared devices rather than guessing session ownership.

Unknown IDs create standalone app accounts and profiles within the same transaction. Test namespace events are derived from the signed event ID (`test_`); the unsigned test header is not trusted. Test identities and events are excluded from audience analytics. Timelines and dynamic segment queries see committed events immediately, with periodic browser refresh. Segments default to newsletter readers but can explicitly include all profiles, retaining unknown app users in app-activity audiences. Aggregate app-engagement queries also include standalone identities; never-opened newsletter flags apply only to newsletter records.

Imports and webhook identity writes now share advisory lock 481510, avoiding concurrent first-creation races across those workflows. The service rejects any mixture of live and reserved `test_` identifiers before writing; CSV app-user imports preserve but flag reserved IDs. CSV exports include app account IDs so an authorized standalone-reader export remains useful when email is unavailable. Those exported identifiers still never enter model context.

## Historical analysis

`ANALYSIS_DATE`, defaulting to September 28, 2026, is centralized in `src/lib/config.ts`. Days-since calculations use UTC and clamp future observations to zero. Actual receipt time always uses the database clock. CSV timestamps without offsets are explicitly interpreted as UTC. App metrics include committed live events, even if received after the historical reference date; this distinction is displayed in the UI.

## AI privacy boundary

`classifyQuestion` transforms user text into a small approved intent. Original user messages never cross the model transport. Emails and recognizable identifying IDs are rejected; freeform names and other words are discarded, not echoed. Unsupported historical change/retention/revenue questions are declined.

`safeAnalytics` produces only numeric aggregates, enumerated source labels, approved page paths, signup months, or approved segment definitions and opaque segment references. It never returns people, emails, app/device/visitor IDs, arbitrary source metadata, or raw rows. Counts from one through four are suppressed. Imported page labels are allowlisted before inference.

For segment requests Azure calls `buildSegmentDefinition` using structured function arguments. The server validates the proposal against the approved intent and executes the segment itself. The model receives only the definition, suppressed count, and opaque segment reference; the authenticated browser fetches real membership separately. Other supported requests use deterministic aggregate queries followed by an Azure explanation. The UI exposes exactly what aggregate data went to the model. Model text is untrusted explanatory output; the inspectable numeric data remains authoritative.

## Scaling threshold

The current audience query computes rollups in SQL then applies segments in server memory, appropriate for roughly 3,000 readers. Profile responses now select the requested canonical person and run independent lineage/channel queries concurrently. Overview counts use a single SQL count projection, concurrent with audience and batch retrieval; Settings requests bounded import history without recomputing the entire overview. An ingestion-time index supports the activity feed. This does not eliminate whole-audience rollups for segments or the SQL aggregation cost inside profile CTEs.

Canonical subscriber upserts, distinct website visitor inserts and visitor-claim updates use parameterized JSON recordset batches. This removes per-record network database calls while preserving raw rows and conservative claim revocation. App-account imports still perform sequential identity checks, a bounded but slower path for larger files.

Introduce compiled parameterized segment SQL and incremental materialized rollups when measured latency or audience size warrants it. Extract ingestion only if sustained throughput or isolation requirements exceed the single-app transaction model. The global identity lock is correct but limits ingestion throughput and makes webhook writes wait during imports. Hosted migrations are executed with a separate owner credential; the application role has DML/sequence access and no schema ownership. Move staff authentication to organizational SSO before broader organizational rollout.
