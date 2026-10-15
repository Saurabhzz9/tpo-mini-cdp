## 1. Architecture

This is one Next.js 16 App Router application using React 19, strict TypeScript, Zod, parameterized SQL, iron-session and Recharts, with explicit feature routes and an authenticated Server Component layout (`package.json:1`, `src/app/(workspace)/layout.tsx:1`). Production uses a PostgreSQL pool; local development uses persistent PGlite, and production refuses that embedded fallback unless explicitly enabled for a local smoke test (`src/lib/db.ts:16`). CSV ingestion validates fixed headers, stores original rows and flags, constructs canonical identities and channel links, and commits the batch transactionally (`src/lib/importer.ts:18`, `src/lib/importer.ts:73`). Independently authorized API handlers call the data services, while the persistent client shell and feature components render responses and own their interaction state (`src/app/api/[...path]/route.ts:25`, `src/components/layout/workspace-layout.tsx:1`, `src/hooks/use-data.ts:1`). Signed app deliveries update the same store, and dynamic segment membership is recalculated from committed data (`src/lib/webhook.ts:66`, `src/lib/segments.ts:58`).

## 2. Normalization

There is one email-normalization implementation: `normalizeEmail` at `src/lib/identity.ts:2`. It accepts strings, trims whitespace, lowercases and validates using Zod email validation; invalid input returns null. It does not rewrite Gmail dots, plus aliases or domains.

All production call sites are in `src/lib/importer.ts`:

- Line 122: group old and incoming subscriber records by normalized email.
- Line 174: associate and flag each original subscriber row.
- Line 191: resolve an imported app account's email bridge.
- Line 249: flag invalid nonempty website email values.
- Line 251: resolve an explicitly identified website event.
- Line 287: collect valid website visitor email claims across stored events.

The function import is at `src/lib/importer.ts:4`; it is not another implementation. Tests exercise the shared function at `tests/platform.test.ts:68` and `tests/platform.test.ts:74`. Lowercasing search strings, segment comparisons and assistant questions serves those separate operations, not an alternative stored-email normalization policy. Webhooks carry user/device IDs, not an email field.

## 3. Dedupe and linking

An identical file is recognized by `(kind, SHA256(content))` and becomes a checksum no-op (`src/lib/importer.ts:80`). Different-content batches preserve their own original rows. Valid normalized subscriber email is the canonical unique key; blank/invalid rows remain in raw storage rather than creating newsletter identities (`src/lib/importer.ts:120`, `migrations/001_initial.sql:3`).

For every normalized-email group, the importer sorts original signup strings lexicographically, using serialized row JSON as the tie-break; the first record supplies signup date and acquisition source. Any unsubscribed row wins for status; otherwise status becomes active. Valid last-open strings are sorted and the last supplies the canonical last-open date; with the supplied date-only values this is chronological. Duplicate count is group size minus one, and differing status/signup/source/last-open values set the conflict indicator (`src/lib/importer.ts:131`, `src/lib/importer.ts:141`, `src/lib/importer.ts:148`). Canonical writes are batched with the database's DATE column types; original rows and flags remain separate (`src/lib/importer.ts:163`). These are snapshot merge rules: an invalid earliest signup can produce a null canonical date, and an invalid status is flagged without becoming a separate consent-history model.

App accounts link to an existing person by valid normalized email, otherwise retaining a standalone profile. If an existing app ID points to a different candidate person, the importer flags the original claim, retains the established owner and does not create a phantom profile (`src/lib/importer.ts:191`, `src/lib/importer.ts:206`, `src/lib/importer.ts:214`).

Website events with explicit valid email link only to matching newsletter people. Valid email claims for each visitor are collected across stored events; a visitor maps to a person only if exactly one distinct claimed email exists and that email matches a newsletter person. Multiple claims mark ambiguity and revoke inferred links on truly empty-email events, while direct explicit matches remain attached. Nonempty invalid email strings are not silently treated as anonymous (`src/lib/importer.ts:249`, `src/lib/importer.ts:287`, `src/lib/importer.ts:293`).

Limits include shared email addresses, email changes, provider aliases and missing identity bridges. There is no fuzzy identity graph or manual reviewed merge workflow. A webhook-created unknown app account is not automatically reassigned when a later CSV claims another person; it becomes a flagged conflict. Conflicting visitors/devices are deliberately under-linked rather than guessed. A different-content snapshot is preserved as another batch, so raw duplicate lineage can grow without increasing canonical subscriber count.

## 4. Webhook

`event_id` is the persistent primary key. A SHA-256 digest covers the validated canonical event, sorted property keys and test flag; identical redeliveries return 200, conflicting reuse returns 409, and new events return 201 (`src/lib/webhook.ts:77`, `src/lib/webhook.ts:89`, `src/app/webhooks/app/route.ts:26`, `migrations/001_initial.sql:13`). Import and webhook identity writes share transaction-scoped advisory lock 481510, so concurrent first-account creation and retries serialize (`src/lib/importer.ts:83`, `src/lib/webhook.ts:87`).

Event time is stored separately from ingestion time. Each delivery recomputes the affected device's resolution from all explicit user claims, so delivery order does not determine ownership. With exactly one explicit claimant, anonymous events at or before that claimant's latest login are attached, including anonymous history delivered after login. Later anonymous events stay unresolved. A second distinct claimant revokes inferred anonymous assignments while preserving explicit user claims (`src/lib/webhook.ts:133`, `src/lib/webhook.ts:144`). This is not sessionized ownership of a shared device.

An unknown user ID creates a standalone person and app account in the same transaction, preserving the event rather than dropping it (`src/lib/webhook.ts:104`). It is available through authorized all-profile audiences without inflating newsletter totals. Reserved `test_` event/device/user identifiers must stay in one namespace, and test people/events are excluded from real audience metrics (`src/lib/webhook.ts:69`, `src/lib/audience.ts:32`).

Authentication is HMAC-SHA256 over the exact `timestamp.rawBody` bytes, using the server-only signing secret, constant-time comparison and a five-minute actual-clock tolerance (`src/lib/webhook.ts:40`, `src/lib/webhook.ts:45`). Event time may be historical. Strict shape validation, streaming body limits and post-authentication rate limiting are also enforced (`src/app/webhooks/app/route.ts:7`). PostgreSQL acquisition/lock, statement and idle-transaction limits prevent indefinite orphan-lock waits; a busy sender may still need to retry a failed delivery (`src/lib/db.ts:20`).

## 5. PII and the assistant

**Yes, a model response can contain an invented name; a universal claim that no name can ever appear is unsupported.** The inspected request path does not send source names, emails, identifying app/device/visitor IDs, raw subscriber rows or original user messages to the model. Common email/ID patterns in the final response are rejected, but this regex is not complete semantic PII detection or a guarantee of factual correctness (`src/lib/assistant.ts:344`).

`classifyQuestion` turns original text into finite validated intent/source/segment values; recognizable identifying input is rejected and other words, including freeform names, are discarded (`src/lib/assistant.ts:25`). `safeAnalytics` constructs explicit aggregate objects with allowlisted source/page labels and validated month strings; counts one through four become null. It does not return source rows or membership lists (`src/lib/assistant.ts:99`, `src/lib/assistant.ts:100`).

The final explanatory model input is built as follows at `src/lib/assistant.ts:235`:

```ts
content: JSON.stringify({
  request: toolArgs.parse(args),
  aggregate: data,
  analysisDate: process.env.ANALYSIS_DATE || "2026-09-28",
}),
```

The system instruction at `src/lib/assistant.ts:231` directs the model to explain supplied deterministic aggregates, avoid identifying people and return an answer string. For segment planning, the user message at `src/lib/assistant.ts:269` is exactly:

```ts
{ role: "user", content: JSON.stringify(args) },
```

The planner receives the approved intent and a structured function schema, not the original question or subscriber list. Its tool name, strict arguments and proposed definition are checked; canonical rules must exactly match the approved definition before execution (`src/lib/assistant.ts:260`, `src/lib/assistant.ts:308`, `src/lib/assistant.ts:314`). The subsequent explanation receives definition, suppressed count and opaque segment reference. Authorized membership retrieval/export occurs separately through server routes (`src/app/api/[...path]/route.ts:151`, `src/app/api/[...path]/route.ts:193`).

Model-request capture tests verify the boundary against identifying questions, poisoned metadata and unapproved definitions. Actual Azure calls also succeeded. Small-count suppression does not establish formal differential privacy or prevent every inference from overlapping aggregates; model explanations remain untrusted text alongside inspectable deterministic data.

## 6. Tests

Automated coverage exists:

- `tests/platform.test.ts:30`: 32 local PostgreSQL-engine tests, grouped into authentication/ingress abuse controls, email/time parsing, complete supplied-dataset reconciliation, raw preservation/idempotency/rollback, AND/OR/scoped segments and scores, HMAC/retries/out-of-order/unknown/shared-device/test-namespace behavior, aggregate-only model transports/tool rejection/suppression/formula-safe CSV, and conflicting subscriber/visitor/app-account claims. These use isolated PGlite and test transports rather than charging Azure for unit tests.
- `tests/postgres.integration.test.ts:25`: four actual network PostgreSQL scenarios: expiry of a checked-out idle transaction and subsequent lock/pool recovery; raw/repeat-safe imports plus website claim revocation; concurrent account import/webhook creation plus rejected conflicting app claims; concurrent retries, late anonymous events, dynamic membership and competing device claims. The suite refuses database names outside its throwaway naming pattern.
- `tests/e2e/workspace.spec.ts:19`: eleven browser scenarios covering authorization, login/logout, source-backed overview, search/profile/duplicates, segment CRUD/export, live dynamic updates, Event Lab, quality, unavailable/private assistant states, analyst restrictions, mobile tasks, automated overview accessibility and delayed-response/no-settings-refetch regression.
- `tests/visual/identity.spec.ts:3`: one controlled visual scenario comparing nine desktop/mobile views at a maximum 0.1% differing-pixel threshold. These are local baseline comparisons, not nine separate test cases or a portable CI visual guarantee.
- `tests/release/release.spec.ts:3`: optimized local production sign-in, source totals/chart, actual Azure answer/aggregate inspection and mobile overflow checks.
- Executed cloud API/browser scripts under ignored `tmp/` exercised the real hosted deployment, HMAC concurrency/linking, real Azure aggregate and segment answers, privacy rejection, cookie behavior, actual charts and mobile navigation. Generated safe results are in `docs/cloud-verification.json` and `docs/cloud-browser-verification.json`; their scripts are not committed as a claim of a reusable CI suite.

Final local Vitest execution passed 32 tests and explicitly skipped four network tests without their URL. Final Linux CI ran **36/36 tests without those skips**, all eleven browser scenarios, typecheck, lint, build, production dependency audit and release packaging; verification and Azure delivery both succeeded in run `38758805189` for source `b467b76`. Earlier, three network cases passed against a temporary database on the actual Azure PostgreSQL server, which was then removed. Local final build and release secret scan also passed. Failed intermediate trace cleanup, Windows output-file locking, cloud deployment/import interruption and a smoke client's incorrect replay of a logout cookie are recorded in `docs/REFACTOR_REVIEW.md` and `docs/VERIFICATION.md`; they are not represented as passing executions.

## 7. Security

The largest remaining hardening gaps are:

1. **Staff authentication and revocation.** Environment-managed passwords have no SSO/MFA or selective session revocation. Logout clears the browser cookie, but a copied sealed cookie remains usable until its eight-hour expiry or secret rotation; password changes alone do not revoke it (`src/lib/auth.ts:11`, `src/lib/auth.ts:29`). Per-ingress-client throttling is not complete distributed credential-abuse protection.
2. **Inline CSP allowance.** Production permits inline scripts/styles for the current Next.js bootstrap, weakening defense against a future injection sink (`next.config.ts:22`). React text rendering and the inspected absence of executable imported HTML are useful controls, but nonce-based CSP is still unfinished hardening.
3. **Operational secret/compromise recovery.** Database/session/HMAC/model secrets are supplied as App Service settings and local ignored handover/parameter files, with manual rotation rather than a managed secret lifecycle (`infra/main.bicep:76`). The runtime role is now non-owner and cannot create schema objects, but application compromise still exposes its DML access and in-process keys. Backups are configured, while a restore drill and recovery procedure verification remain unfinished (`docs/SECURITY.md:1`, `docs/DEPLOYMENT.md:1`).

The global anonymous login lockout, mixed identity namespaces, cross-workflow creation race, rejected-claim phantom profiles and cloud-observed unbounded idle transaction were fixed and regression-tested. Source review/tests did not establish an anonymous PII/SQL/IDOR bypass. The security plugin's canonical report could not be completed after its tools became unavailable; this implementing-assistant audit is not an independent penetration-test certificate.

## 8. Unfinished

No production TODO/FIXME or simulated provider result was found in the inspected `src` and `scripts` paths. Missing Azure configuration returns a real unavailable error. Mock transports and test credentials are in verification paths; Event Lab sends actual signed requests using an excluded test namespace.

Intentional fixed policies include the September 28 analysis-date default, acquisition/page allowlists (`src/lib/config.ts:1`), scoring weights/caps (`src/lib/audience.ts:35`), approved AI segment templates (`src/lib/assistant.ts:67`), flat AND/OR groups with at most fifteen rules (`src/lib/segments.ts:50`), body/import/rate bounds and October 29 demo expiry. New categories/pages require deliberate privacy-catalog changes. There is no longitudinal retention/open-transition history, unrestricted model SQL, nested segmentation, dark theme, bookmark/report persistence or reviewed identity merge workflow.

Whole-audience rollups and in-memory segmentation remain scaling limits, and app-account imports still perform sequential identity checks. Profiles cap channel history/raw lineage rather than implementing unlimited timeline pagination (`src/lib/audience.ts:130`). A global identity lock limits throughput even with timeout protection. Docker execution, a backup restore drill, broad assistive-technology/manual accessibility review and measured load capacity are unverified. The Loom recording is planned but not recorded. The verified hosted demo is intentionally temporary and scheduled for removal on October 29, 2026 at 12:00 IST.

## 9. Provenance

The recorded first-party application and automated-test implementation is overwhelmingly AI-generated or AI-edited; the available workflow supports an estimate approaching all of the implementation text, without establishing a separately attributable handwritten human patch share. Git author metadata and stylistic consistency cannot establish an exact percentage. Commits `3d3af64`, `a444a7b`, `08a4126`, `bb49f00` and `b467b76` record the implementation/refactoring/corrections; history and authorship were not rewritten.

That source-text estimate does not measure engineering ownership. Direct session evidence shows the human supplying requirements/data and architecture constraints, selecting the repository/account, requesting corrections and refactoring, choosing the low-cost deployment budget and fourteen-day lifetime, and directing technical acceptance. The developer also reports active system-design trade-offs, generated-source/security review, issue identification, manual browser testing, E2E direction/review and evaluation of fixes. These are engineering contributions; where an independent human review/test record was not supplied, they remain explicitly developer-reported (`docs/DEVELOPMENT_PROCESS.md:1`).

The assistant generated the recorded code/test patches, proposed implementation details and executed the logged automated checks. The strongest evidenced human intervention is requirements, architecture/feature constraints, correctness/privacy expectations, feedback, deployment decisions and acceptance ownership. No handwritten source or independently performed human test execution is invented, and no inference about authorship of the initial brief is needed. This response is the implementing assistant's self-assessment; the previous raw audit remains an unchanged historical artifact.
