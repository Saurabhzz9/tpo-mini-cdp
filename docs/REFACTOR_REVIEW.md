# Architecture refactor and quality review — October 15, 2026

## Findings and implemented changes

| Finding | Evidence / consequence | Severity and change |
|---|---|---|
| One frontend module imported every feature and both chart libraries | `workspace.tsx` contained 2,518 lines, ten screen functions, shell, HTTP transport, polling hook, formatting and shared UI | Medium maintainability concern. Separate feature modules and explicit routes now isolate dependencies; the largest feature is the 437-line segment workspace, and the persistent shell is 199 lines |
| Screen functions already owned most of their state | The original top-level shell owned only settings and mobile navigation; search, segments, assistant and lab state were already inside their screen functions | The file was not defective merely because it was large. Existing feature state ownership was preserved; no global state library was added |
| Shell and settings were recreated with each routed workspace page | Every original route rendered its own Workspace and fetched `/api/settings` after hydration | The protected server layout now supplies an explicit public settings projection to a persistent shell. Browser regression asserts zero `/api/settings` requests during navigation |
| Fetch lifecycle allowed an old search response to overwrite a later query | Original useData had no abort or response generation guard; timers could overlap and continue work in hidden tabs | Superseded/unmounted requests abort, old responses are ignored, changed paths do not display previous data, and periodic refresh skips hidden/pending work. A delayed-response browser regression verifies the result |
| Component CSS and responsive overrides were mixed with the global foundation | Original `globals.css` had 2,518 lines, feature rules and late accessibility overrides | Nine feature CSS Modules own their corresponding responsive rules. Global CSS is 1,279 lines and retains tokens, shared controls/tables/layout/shell. Repeated metadata color values use a shared token. Final contrast overrides remain deliberate rather than being moved ahead of media rules and changing the cascade |
| Unnecessary aggregate work and sequential profile reads | Settings requested the full overview only to display import batches; a profile materialized all people; lineage/channel reads ran in series | Settings uses a bounded import-history endpoint. Profile selects its person and runs independent reads concurrently. Overview combines three count queries and overlaps audience/batch/count reads. Whole-audience segment rollups remain a documented scaling limit |
| Quadratic duplicate-group construction | Each additional row in a same-email group copied the entire accumulated array | Group arrays now append in place within the importer transaction; raw records and canonical merge rules are unchanged |
| Cloud import incurred one network round trip per subscriber/website event | The first hosted subscriber import took 56.3 seconds; website processing also inserted visitors per event and updated each claim separately | Canonical subscriber upserts, distinct visitor insertion and visitor-claim updates now use parameterized JSON recordset batches. Full-data/conflict tests preserve the original totals and conservative ambiguity rules; the network test also checks anonymous web-link revocation |
| Activity ordering lacked an ingestion-time index | Activity sorts by received time while existing indexes covered device/event time and resolved user | Added `app_ingested_idx`; migration remains idempotent |
| Global login allowance could be exhausted by one anonymous caller | A literal login-global key ran before JSON validation and blocked every staff account | Medium availability finding. Parse bounded credentials, then limit the trusted ingress client. Spoofed leading forwarded addresses do not change the App Service client key; another client retains its allowance. Shared NAT and distributed traffic remain limitations |
| Test and live app identities could collide | One global app_users key space permitted a live event to reference a test-only profile, hiding it from analytics | Correctness issue with trusted sender/admin prerequisites. Mixed namespaces now fail before writes; reserved CSV identities are preserved but flagged. Regression verifies no write occurred |
| Import and webhook identity creation used different advisory locks | Both could create the same app account in separate transactions, causing one workflow to fail a unique constraint | Both workflows use lock 481510. Real PostgreSQL concurrency tests verify committed events and a single account; transactions and conservative conflicting-identity rules remain intact |
| Deployment authority and credentials needed separation | Initial infrastructure used a DB administrator for app runtime; new local cloud credential files also needed build-context exclusions | Application uses separate DML/sequence grants and no schema ownership. Migrations execute separately. Docker/source packaging excludes cloud credentials and local parameters; release scan also checks database URLs and analyst hashes |

The source-backed baseline did not establish an authentication bypass, anonymous PII access, SQL injection, executable imported/model HTML, CSRF bypass, unchecked model execution or unrestricted model access to rows. Shared staff segment/profile access is the intended single-workspace policy, not per-owner tenancy. Those conclusions are bounded source review plus regression evidence, not a penetration-test certificate.

## Responsibilities retained and moved

| Original responsibility | Final owner |
|---|---|
| Mobile menu, active navigation, staff badge, logout | `components/layout/workspace-layout.tsx` |
| Overview refresh, count cards, website chart, acquisition bars, health/quality summary | `components/dashboard/overview.tsx` |
| Debounced query, filters and pagination | `components/subscribers/subscriber-list.tsx` |
| Canonical details, identity branches, merged website/app timeline and raw lineage | `components/subscribers/subscriber-profile.tsx` |
| AND/OR rule editor, scope, presets, preview, save/edit/delete/export and saved list | `components/segments/segments-workspace.tsx` |
| Latest events and periodic/manual refresh | `components/activity/activity-feed.tsx` |
| Acquisition comparisons, cohorts, page ranks and observed relationships | `components/insights/growth-insights.tsx` |
| Quality filters/pages, original records, batch history and unresolved identity counts | `components/data-quality/quality-overview.tsx` |
| Question, busy/error/result state, suggestions and inspectable aggregate explanation | `components/assistant/assistant-workspace.tsx` |
| Event composition, time offset, anonymous/login mode, retry and response/activity refresh | `components/event-lab/event-lab.tsx` |
| CSV selection/upload, repeat-import result and batch refresh | `components/settings/workspace-settings.tsx` |
| Request lifecycle, browser transport, formatting, field names and type-only contracts | `hooks/use-data.ts`, `lib/client-api.ts`, `lib/format.ts`, `lib/segment-fields.ts`, `types/workspace.ts` |
| Database, ingestion, identity, segments, authorization, HMAC and model boundary | Existing `lib` services, independently authorized route handlers and server layout |

There are no arbitrary dozens of one-line presentation wrappers, no new state-management framework and no separate backend. The segment builder and saved audiences intentionally stay together because editing, presets, preview and saved state are coupled. Charts remain client-rendered; authenticated layout and safe settings projection run on the server. Shared primitives can render in either environment without importing database or model code.

## Executed verification

| Command / check | Observed result |
|---|---|
| `npm run typecheck` | Passed after removing obsolete generated-dev directories from the TypeScript input scope; application routes still receive generated production type checks |
| `npm run lint` | Passed with ESLint/TypeScript recommended rules and React Hooks rules/dependency validation |
| `npm test` | 31 tests passed locally; three network-only tests explicitly skipped when no dedicated test URL was supplied |
| `node tmp/verify-cloud-db.mjs` → `scripts/verify-postgres.mjs` | Three tests passed against a temporary Azure PostgreSQL database, then that exact database was dropped; main demo analytics were untouched |
| `npm run test:e2e` | Final full run: 11/11 scenarios passed, including the new stale-response/no-settings-fetch regression |
| `node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts --update-snapshots` before refactor | Captured nine local reference views: six desktop and three mobile |
| `node node_modules/@playwright/test/cli.js test --config playwright.visual.config.ts` after refactor | All nine comparisons passed at the configured maximum 0.1% differing-pixel threshold; mobile overflow assertions passed |
| `npm run build` | Optimized production build passed, explicit feature routes generated and standalone environment files removed |
| `node scripts/check-release.mjs` | Passed; configured secrets absent from the inspected build text artifacts |
| Client static artifact search for `pg_advisory_xact_lock`, `AZURE_AI_KEY`, `@electric-sql/pglite` | No matches |
| `npm audit` | Zero reported vulnerabilities including development dependencies |
| GitHub Actions run `38749444049`, commit `a444a7b` | Successful Linux CI: typecheck, lint, unit/network PostgreSQL tests, browser E2E, build, dependency audit and release packaging |

One intermediate full browser run failed during trace cleanup because a parallel visual run used the same Playwright output directory. The application assertions were not the cause. Separate E2E, release and visual output directories were added; the subsequent complete eleven-scenario run passed. Initial cloud source build failed because production dependency installation omitted the TypeScript resolver; hosted delivery now uses the already verified Linux CI artifact with scoped OIDC authentication. Another initial cloud import was interrupted while deployment instances were still converging; final acceptance waits for stable deployment. Cloud acceptance details are in `DEPLOYMENT.md`.

Visual references intentionally stay in ignored `tmp/visual-baseline` because they capture this exact local persistent dataset and import timestamps. To reproduce a before/after comparison, capture references before making a visual change, then rerun without updating them against the same data/browser. CI does not claim this local visual comparison as a deterministic cross-platform snapshot test. Desktop/mobile release screenshots in docs are separately inspectable.

No end-user latency or whole-application JavaScript-size improvement is inferred solely from splitting files. A sampled uncompressed login script total changed from 568,612 to 569,451 bytes; it is not a bundle-size win. The concrete improvements are route dependency separation, fewer redundant requests and SQL operations, cancellation correctness, bounded history reads and reduced duplicate-array copying. Segments still evaluate in server memory, and profile CTE aggregation is not a materialized/indexed per-person rollup system.

## Assessment coverage and remaining work

Full-data tests retain the supplied source totals, original JSON, invalid flags, duplicate lineage, safe reimports and canonical counts. Identity tests cover unknown users, conflicting visitors/devices and out-of-order anonymous backfill. Segment tests cover AND/OR, scope, current membership and formula-safe exports; app-only exports now include account IDs. HMAC tests cover invalid/stale/tampered signatures, persisted retry behavior, conflicting duplicates and concurrent delivery. Captured model transports cover PII/raw-question removal, poisoned source labels, identifying input, suppressed aggregates and rejected unexpected model tools/definitions. Browser tests exercise authorization, login/logout, real charts, search/profile/duplicates, segments, lab, quality, assistant unavailable/privacy states and mobile tasks. Actual Azure model calls are separate release/cloud smoke checks.

The application is ready for code-level technical review with the documented scope limits. Organizational rollout still needs SSO/MFA/session revocation, stronger CSP, a backup restore drill and measured scale/load work. Dark mode, report bookmarks and arbitrarily nested segment groups are not implemented. The Loom recording is planned, not recorded. The original raw audit remains unchanged; the new nine-question response is a separate unedited artifact. Human and AI responsibilities are documented in `DEVELOPMENT_PROCESS.md`.

The independent security baseline completed, and the parent validated/fixed its concrete login finding. The plugin's canonical scan/report completion was blocked when its tools were removed from the session; scan `d5e319b2-2663-4593-aa47-7ca4df411016` retains its checkpoint. This document reports implementation and test evidence, not a fabricated completed Codex Security report.
