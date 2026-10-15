## 1. Architecture

This is one full-stack Next.js 16 App Router application with React 19, strict TypeScript, Zod, iron-session, Recharts and parameterized SQL; there is no separate backend (`package.json:1`, `src/app/api/[...path]/route.ts:25`). Hosted production uses a PostgreSQL connection pool, while local development uses persistent PGlite with the same schema; production refuses the embedded fallback unless explicitly overridden (`src/lib/db.ts:16`). CSV imports validate headers and rows, preserve original JSON and flags, then transactionally build canonical people, app accounts and website relationships (`src/lib/importer.ts:18`, `src/lib/importer.ts:73`, `migrations/001_initial.sql:2`). Authorized route handlers expose those services to feature components behind an authenticated server layout and persistent navigation shell (`src/app/(workspace)/layout.tsx:6`, `src/components/layout/workspace-layout.tsx:42`). Signed app webhooks update the same database, and segments evaluate current committed audience data rather than storing frozen membership lists (`src/lib/webhook.ts:66`, `src/lib/segments.ts:58`).

## 2. Normalization

There is one shared production email-normalization function: `normalizeEmail` in `src/lib/identity.ts:2`. It trims, lowercases and validates with Zod; nonstrings, empty strings and invalid email values return null. It does not collapse provider aliases, remove Gmail dots or strip plus tags.

Every production call is in `src/lib/importer.ts`:

- `src/lib/importer.ts:122`: group subscriber rows by normalized email.
- `src/lib/importer.ts:174`: map and flag each original subscriber row.
- `src/lib/importer.ts:191`: resolve the app-account email bridge.
- `src/lib/importer.ts:249`: flag nonempty invalid website email values.
- `src/lib/importer.ts:251`: resolve direct website email claims.
- `src/lib/importer.ts:287`: collect valid email claims for each website visitor.

The import at `src/lib/importer.ts:4` is not a second implementation. Direct test calls are at `tests/platform.test.ts:69`, `tests/platform.test.ts:72` and `tests/platform.test.ts:76`. Lowercasing search text, segment comparisons and assistant questions does not normalize stored identity email. Webhooks accept app/device identifiers rather than an email field.

## 3. Dedupe and linking

An exact file reimport is a no-op keyed by import kind and SHA-256 checksum; different content becomes another preserved batch (`src/lib/importer.ts:80`, `migrations/001_initial.sql:2`). Canonical subscribers are grouped by valid normalized email across existing and incoming raw subscriber rows. Blank or invalid email rows remain in `raw_records` without creating newsletter identities (`src/lib/importer.ts:104`, `src/lib/importer.ts:120`).

Within an email group, signup strings are sorted lexicographically with missing values replaced by `9999` and serialized row JSON as the tie-break. The first row supplies canonical signup date and acquisition source. Any exact `unsubscribed` status wins; otherwise the canonical status is active. Parsed valid last-open values are sorted and the latest is selected; duplicate count is group size minus one, and disagreement in status, signup, acquisition source or last-open sets a conflict flag (`src/lib/importer.ts:131`, `src/lib/importer.ts:141`, `src/lib/importer.ts:148`). Canonical columns use SQL DATE types; raw values and every original duplicate remain available (`src/lib/importer.ts:163`, `src/lib/importer.ts:311`).

App accounts link by valid normalized email to an existing person or retain a standalone profile. An existing app ID cannot silently change its established owner: conflicting imports are flagged before creating another profile (`src/lib/importer.ts:191`, `src/lib/importer.ts:206`, `src/lib/importer.ts:214`). Website events with explicit valid email link only to matching newsletter people. A visitor's anonymous events are backfilled only when all stored valid email claims for that visitor agree on one email that matches a newsletter person; competing claims revoke inferred anonymous links while preserving direct explicit matches (`src/lib/importer.ts:249`, `src/lib/importer.ts:279`, `src/lib/importer.ts:293`, `src/lib/importer.ts:307`). A nonempty invalid email is flagged and is not treated as an empty anonymous claim.

These rules miss provider aliases, email changes and distinct people sharing one email. Signup selection is string ordering rather than a generalized consent-history model; an invalid earliest signup can yield a null canonical date. An unknown webhook account is not automatically reassigned when a later CSV claims a different owner. There is no fuzzy matching or reviewed manual identity merge. Import order matters: subscribers must exist before channel imports, and changing subscriber snapshots does not by itself rerun every historical channel-linking decision. Conservative under-linking is preferable here to silently assigning a shared visitor/device to the wrong person.

## 4. Webhook

The endpoint authenticates HMAC-SHA256 over the exact `timestamp.rawBody` bytes, checks a five-minute wall-clock tolerance and uses constant-time signature comparison (`src/lib/webhook.ts:40`, `src/lib/webhook.ts:45`). Shape validation and streaming body limits apply; authenticated senders are rate-limited after signature verification (`src/app/webhooks/app/route.ts:7`, `src/lib/auth.ts:91`). Historical event timestamps are independent of signing time.

Event IDs are database primary keys. A digest of the validated event, sorted property keys and test flag distinguishes an identical retry from conflicting reuse. Identical retries return 200, new events 201, and conflicting reuse 409 (`src/lib/webhook.ts:77`, `src/lib/webhook.ts:89`, `src/app/webhooks/app/route.ts:26`, `migrations/001_initial.sql:13`). Imports and webhook identity writes share transaction advisory lock 481510, serializing account creation, event retries and identity recomputation across instances (`src/lib/importer.ts:83`, `src/lib/webhook.ts:87`).

Every delivery recomputes the device's inferred relationships using stored event times and all explicit user claims. When exactly one user has ever claimed a device, anonymous events at or before that user's latest login attach to that account, including anonymous history delivered after login. Anonymous events after that login remain unresolved. A second distinct claimant revokes inferred anonymous assignments; explicit user assignments remain intact (`src/lib/webhook.ts:133`, `src/lib/webhook.ts:140`, `src/lib/webhook.ts:144`). This is deliberately conservative, not a complete shared-device session model.

Unknown user IDs create standalone people and app accounts in the same transaction, preserving events without inflating newsletter subscriber totals (`src/lib/webhook.ts:102`). Reserved `test_` event, device and user identifiers must stay in one namespace; test people/events are excluded from normal analytics (`src/lib/webhook.ts:68`, `src/lib/audience.ts:32`). PostgreSQL lock, acquisition, statement and idle-transaction timeouts bound several failure modes, but the global identity lock limits throughput and busy deliveries can still require retries (`src/lib/db.ts:20`).

## 5. PII and the assistant

**Yes, a response can contain an invented name or other text the filters do not recognize; the implementation cannot guarantee that every possible model response is free of identifying content.** The inspected application request path excludes source emails, source names, raw subscriber rows, person/app/device/visitor identifiers and original user messages. Response filtering rejects common email and identifier patterns, not every possible form of PII (`src/lib/assistant.ts:344`).

`classifyQuestion` rejects recognizable identifying inputs and reduces the question to enumerated metric/source/segment values; other freeform words, including names, are discarded (`src/lib/assistant.ts:25`). `safeAnalytics` constructs aggregate objects with allowlisted acquisition/page labels and validated cohort months. Counts from one through four are suppressed. Segment output contains rules, a suppressed count and an opaque segment reference, not membership rows (`src/lib/assistant.ts:99`, `src/lib/assistant.ts:100`).

The explanatory request's user content is built at `src/lib/assistant.ts:235`:

```ts
content: JSON.stringify({
  request: toolArgs.parse(args),
  aggregate: data,
  analysisDate: process.env.ANALYSIS_DATE || "2026-09-28",
}),
```

Its system instruction tells the model to explain only supplied deterministic aggregates, avoid identifying people, treat null as small-group suppression and return one answer string (`src/lib/assistant.ts:231`). For segment planning, the model-visible user input is exactly (`src/lib/assistant.ts:269`):

```ts
{ role: "user", content: JSON.stringify(args) },
```

The tool schema is constructed from the validated segment schema (`src/lib/assistant.ts:278`):

```ts
parameters: z.toJSONSchema(
  z.object({ definition: segmentSchema }).strict(),
),
```

The returned tool name and strict arguments are checked, and the proposed definition must exactly match the approved definition before the server executes it (`src/lib/assistant.ts:304`, `src/lib/assistant.ts:312`). Authorized membership retrieval and CSV export are separate server operations, not model context (`src/app/api/[...path]/route.ts:151`, `src/app/api/[...path]/route.ts:176`). Request-capture tests exercise poisoned metadata, identifying questions and unexpected model tools. Small-count suppression is not formal differential privacy; overlapping aggregates and inaccurate model explanations remain limitations. Operator-controlled configuration, including `ANALYSIS_DATE`, must remain correctly configured; the privacy boundary is not a guarantee against an operator deliberately replacing application configuration with sensitive text.

## 6. Tests

The repository contains these automated suites:

- `tests/platform.test.ts:30`: 32 local PostgreSQL-engine tests covering login abuse isolation, normalization/time handling, complete CSV reconciliation, raw preservation and repeat imports, rollback, AND/OR audiences and scope, scores, HMAC and durable retries, late/unknown/shared-device events, namespace isolation, conflicting identities, model-request privacy, tool validation, small-group suppression and formula-safe CSV. They use isolated PGlite and captured/fake model transports.
- `tests/postgres.integration.test.ts:25`: four network PostgreSQL cases covering abandoned-transaction timeout/lock release/pool recovery, import preservation and visitor-claim revocation, concurrent import/webhook account creation and conflicting claims, and concurrent retries with late events/dynamic audiences/shared devices. The suite requires a dedicated throwaway database naming pattern (`tests/postgres.integration.test.ts:15`).
- `tests/e2e/workspace.spec.ts:19`: eleven browser scenarios covering unauthorized access, login/logout, overview/search/profile/duplicates, segment operations/export, live dynamic updates, Event Lab, quality, unavailable/private assistant states, analyst permissions, mobile navigation, automated overview accessibility and stale-response prevention.
- `tests/visual/identity.spec.ts:3`: one visual scenario comparing nine desktop/mobile views against controlled local baselines, with a maximum 0.1% differing-pixel threshold.
- `tests/release/release.spec.ts:3`: optimized release sign-in, real source totals/charts, configured live Azure inference and mobile overflow checks.

Existing evidence records 36/36 unit/network tests and eleven browser scenarios passing in Linux CI for application source `b467b76`, together with typecheck, lint, build, dependency audit and release packaging; verification and deployment succeeded in [run 38758805189](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38758805189). The local run passed 32 tests and skipped the four network cases when their URL was absent. Separate earlier checks ran against a throwaway Azure PostgreSQL database, which was removed. Retained public acceptance records cover signed concurrent deliveries, source totals, real Azure aggregate/segment responses, authorization and desktop/mobile behavior (`docs/cloud-verification.json:1`, `docs/cloud-browser-verification.json:1`). These are existing execution results; this audit did not rerun the suites. Visual comparisons do not establish cross-platform identity or load capacity, and automated accessibility checks do not establish a full manual accessibility audit.

## 7. Security

The three most serious remaining hardening gaps are:

1. **Staff authentication and session revocation.** Credentials are environment-managed rather than organizational SSO/MFA. Sessions are sealed cookies with an eight-hour lifetime and no selective server-side revocation. Password changes alone do not invalidate existing sessions; logout clears the browser cookie, while a copied cookie remains valid until expiry or session-secret rotation (`src/lib/auth.ts:11`, `src/lib/auth.ts:29`, `src/app/api/[...path]/route.ts:58`). Per-ingress-client throttling does not eliminate distributed credential abuse.
2. **Inline content security policy.** Production permits inline scripts and styles for the current Next.js bootstrap (`next.config.ts:22`). React text escaping and the inspected absence of an imported HTML execution path help, but a nonce-based policy would provide stronger protection against a future injection sink.
3. **Secret lifecycle and recovery.** Runtime database/session/HMAC/model secrets reside in App Service settings and ignored local handover/parameter files with manual rotation (`infra/main.bicep:76`). The runtime database account is non-owner with restricted schema privileges, but application compromise still exposes its DML rights and in-process keys. Backup retention is configured, while a restore drill and verified recovery procedure remain outstanding (`docs/DEPLOYMENT.md:1`).

Existing source/test evidence records fixes for shared login denial, mixed test/live identity namespaces, cross-workflow creation races, rejected-claim phantom profiles and abandoned database transactions. Those results do not establish an independent penetration-test certification. Shared staff access is a single-workspace policy, not per-customer tenancy; organizational deployment would require further access and operational decisions.

## 8. Unfinished

No production TODO/FIXME marker or simulated model-success response was found in the inspected application and script paths. Missing Azure configuration returns a truthful unavailable error (`src/lib/assistant.ts:254`). Test model transports and credentials belong to verification paths; Event Lab sends actual signed requests in an isolated namespace (`src/app/api/[...path]/route.ts:235`).

Intentional fixed policies include the September 28 analysis-date default and source/page allowlists (`src/lib/config.ts:1`), engagement weights and caps (`src/lib/audience.ts:35`), approved AI segment templates (`src/lib/assistant.ts:67`), flat AND/OR groups with at most fifteen rules (`src/lib/segments.ts:50`), request/import/rate bounds and the October 29 temporary hosting expiry (`infra/expiry.bicep:3`). These are implemented policies, not evidence of unrestricted natural-language analytics. Snapshot data cannot establish longitudinal retention or historical open transitions.

There is no unrestricted model SQL, nested segmentation, reviewed manual identity merging, dark theme or saved report/bookmark system. Whole-audience rollups and in-memory segment evaluation remain scale limits (`src/lib/audience.ts:30`, `src/lib/segments.ts:58`). App-account imports still perform sequential identity checks; the global identity lock serializes ingestion (`src/lib/importer.ts:188`, `src/lib/webhook.ts:87`). Profile responses cap raw lineage at 1,000 and each channel timeline at 200 rather than implementing unlimited pagination (`src/lib/audience.ts:133`). Docker execution, a backup restore drill, measured load capacity and broad manual assistive-technology review remain unverified. The Loom submission recording is still outstanding. Hosted demonstration resources are intentionally scheduled for removal on October 29, 2026 at 12:00 IST (`docs/DEPLOYMENT.md:1`).

## 9. Provenance

This is a **human-directed engineering project implemented with AI assistance**. The recorded application and automated-test source was predominantly AI-generated or AI-edited. Commit history and consistent code style do not support a defensible exact percentage of handwritten versus generated lines, and no independently attributable handwritten patch share is established. That source-text attribution is separate from responsibility for architecture, product decisions, technical review, testing direction and acceptance.

The human developer actively directed and reviewed the following engineering work, based on the recorded project decisions and the developer's account of their activities:

- **System architecture and technology strategy:** directed the single full-stack Next.js application without a separate backend and evaluated its trade-offs for a small internal Growth tool. This kept rendering, authenticated APIs and ingestion in one deployable application while retaining service boundaries (`src/app/api/[...path]/route.ts:25`, `src/app/(workspace)/layout.tsx:6`, `src/lib/db.ts:16`).
- **PostgreSQL architecture, data modeling and identity correctness:** directed persistent relational storage, original-row preservation alongside canonical people, duplicate visibility without inflated subscriber analytics, and conservative identity linking. The resulting model separates batches/raw records from people, visitors, accounts and events, preserving disputed claims rather than silently overwriting ownership (`migrations/001_initial.sql:2`, `src/lib/importer.ts:120`, `src/lib/importer.ts:214`, `src/lib/importer.ts:293`).
- **Product and UI/UX engineering:** directed feature planning and priorities for Subscriber 360, identity relationship views, segmentation, engagement/acquisition analytics, the Data Quality Center, dashboard usability and Event Lab. These decisions connect reviewable source lineage and current audience membership to Growth workflows, rather than merely displaying imported tables (`src/components/subscribers/subscriber-profile.tsx:1`, `src/components/segments/segments-workspace.tsx:1`, `src/components/data-quality/quality-overview.tsx:1`, `src/components/event-lab/event-lab.tsx:1`).
- **AI architecture and privacy boundaries:** directed useful assistant capabilities subject to strict PII constraints. The accepted design projects questions into approved intents, sends aggregate data rather than subscriber rows, validates proposed tools and keeps authorized membership retrieval outside model context (`src/lib/assistant.ts:25`, `src/lib/assistant.ts:100`, `src/lib/assistant.ts:220`, `src/lib/assistant.ts:304`).
- **Secure event processing and reliability:** directed webhook authentication, persisted idempotency, conflict handling, event-time ordering, unknown-account preservation and anonymous identity linking. The implementation uses signed raw bodies, durable event IDs and conservative device-claim recomputation; ambiguous devices lose inferred associations (`src/lib/webhook.ts:40`, `src/lib/webhook.ts:77`, `src/lib/webhook.ts:102`, `src/lib/webhook.ts:133`).
- **Azure architecture and cost control:** selected the deployment approach, cheapest reasonably responsive infrastructure, approximately US$30/month target and explicit fourteen-day hosting lifetime. These are concrete operational trade-offs reflected in the small App Service/PostgreSQL deployment, scoped GitHub delivery and guarded resource-removal schedule (`infra/main.bicep:60`, `infra/ci.bicep:14`, `infra/expiry.bicep:3`, `docs/DEPLOYMENT.md:1`).
- **Source, component and security review:** reviewed generated architecture/source, identified maintainability concerns including the oversized workspace component, requested component decomposition and CSS organization, directed security audits and correction cycles, and reviewed identity, PII and webhook behavior. The resulting feature boundaries, request-lifecycle handling and regression coverage are implementation evidence for those review topics (`src/components/layout/workspace-layout.tsx:42`, `src/hooks/use-data.ts:6`, `tests/platform.test.ts:386`, `tests/postgres.integration.test.ts:88`).
- **Browser testing, E2E direction and fix evaluation:** reports manually exercising browser behavior, directing and reviewing E2E scenarios/results, identifying bugs and verifying fixes. These review and testing activities are human engineering contributions. The separately recorded automated executions are the assistant/CI runs, including the eleven-scenario browser suite and retained hosted acceptance records (`tests/e2e/workspace.spec.ts:19`, `docs/cloud-browser-verification.json:1`). No independent human execution log is invented.
- **Engineering trade-offs and acceptance:** evaluated correction requests, feature behavior and assessment coverage, and owned priorities and final technical decisions. Those decisions include retaining raw duplicates while counting canonical identities, under-linking ambiguous devices, constraining AI to aggregate capabilities and limiting hosting duration. They materially define the delivered system and its accepted limitations.

The developer's reported review and manual-testing activities are used as that account; source files corroborate the resulting design and behavior but cannot independently identify every reviewer or keystroke. The assistant generated implementation/test patches, performed the recorded refactoring and fixes, and executed the logged automated checks. Commits such as `3d3af64`, `a444a7b`, `08a4126`, `bb49f00` and `b467b76` record that progression, but their author metadata does not prove manual source authorship. The strongest human intervention is therefore the active architecture, database, feature, security/privacy, operational, review, validation and acceptance work described above. It should not be reduced to supplying files, prompts or requirements, nor converted into an unsupported claim of handwritten code or independently recorded test execution.
