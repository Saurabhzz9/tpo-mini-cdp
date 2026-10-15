Self-audit of code revision `ec2d155`, produced by the implementing coding assistant in response to the exact assessment prompt preserved in `docs/self-audit-prompt.txt`. This is not an independent review. The response below is retained as written.

1. Architecture.

The application is Next.js 16 App Router with React 19, strict TypeScript, Zod, iron-session, Recharts and custom CSS (`package.json:1`, `next.config.ts:1`). CSVs pass through the transactional importer into preserved raw rows, canonical people, app accounts and website events (`scripts/import.ts:1`, `src/lib/importer.ts:73`, `migrations/001_initial.sql:2`). Local storage is persistent PGlite; a configured DATABASE_URL selects pooled PostgreSQL, and production refuses the embedded fallback unless the explicit local-test override is set (`src/lib/db.ts:16`). Authenticated route handlers query shared services and return data to the client workspace; the separate externally addressed webhook is still part of the same application (`src/app/api/[...path]/route.ts:1`, `src/components/workspace.tsx:1`, `src/app/webhooks/app/route.ts:7`). There is no separate backend service, queue or graph database.

2. Normalization.

There is one production email-normalization implementation: `src/lib/identity.ts:2`, which trims, lowercases and validates using Zod email validation. Its importer call sites are `src/lib/importer.ts:122` for subscriber grouping, `:167` for raw subscriber identity association, `:184` for app accounts, `:235` for web email validation, `:241` for direct web links, and `:268` for visitor email claims. Tests call the same function in `tests/platform.test.ts:25`. Lowercasing a search query in the API is partial text search, not another identity-normalization implementation. Gmail dots and plus tags are not rewritten.

3. Dedupe and linking.

A valid normalized email is the subscriber identity key, backed by the UNIQUE email constraint (`migrations/001_initial.sql:3`). Every input row remains in raw_records, including invalid and blank rows; file checksums suppress only identical whole-file reimports (`src/lib/importer.ts:73`, `migrations/001_initial.sql:2`, `:4`). Duplicate merging uses earliest signup, latest observed open, unsubscribed if any contributing row is unsubscribed, and acquisition source from the earliest signup row with JSON ordering as a deterministic tie-break (`src/lib/importer.ts:125`). Conflicting snapshot values set a conflict flag and retain their originals (`src/lib/importer.ts:136`, `:299`).

App users link through exact normalized valid email to an existing canonical person; unmatched accounts create standalone people (`src/lib/importer.ts:184`). Direct email-bearing web events link to matching newsletter people (`src/lib/importer.ts:241`). A visitor's anonymous events link only if its set of valid email claims contains exactly one email that maps to a newsletter person; conflicting claims remove inferred anonymous links while explicit email events retain their own matches (`src/lib/importer.ts:260`).

Missed or deliberately excluded cases: aliases remain distinct; different people sharing one email cannot be distinguished; email changes and unknown app accounts later gaining an email have no administrative reconciliation workflow. An existing conflicting app user ID is flagged rather than automatically reassigned (`src/lib/importer.ts:213`). Importing a new subscriber later does not itself rebuild previously unresolved website mappings; another relevant web import triggers that resolution pass. Visitor resolution uses all observed claims rather than session-level proof, so it intentionally under-links conflicting visitors. Unsubscribe-wins is conservative snapshot logic, not a reconstructed consent history.

4. Webhook.

The route verifies the raw-body HMAC before processing, validates the event schema, applies a durable authenticated-sender rate bucket and derives test isolation from the signed event_id namespace (`src/app/webhooks/app/route.ts:7`). HMAC-SHA256 signs timestamp plus a dot plus the exact body; the signature is constant-time compared and the signing timestamp must be within five minutes (`src/lib/webhook.ts:40`, `:45`). Request bodies are streamed with a 32 KB cap (`src/lib/auth.ts:66`).

The database event_id primary key enforces uniqueness, and a transaction advisory lock serializes processing across application instances (`migrations/001_initial.sql:13`, `src/lib/webhook.ts:78`). A digest of the validated event with sorted properties distinguishes identical retries from conflicting content; identical delivery returns duplicate=true, and conflicting reuse returns 409 (`src/lib/webhook.ts:66`). Event time and ingestion time are separate database fields.

Every delivery recalculates the affected device's inferred mappings. Anonymous events at or before the latest login attach only when exactly one explicit user has claimed the device; late-arriving earlier events therefore backfill too (`src/lib/webhook.ts:124`). A second user claim revokes inferred anonymous links, while explicit user claims remain intact. Anonymous events after the latest login remain unresolved. Unknown user IDs create an app account and standalone person in the same transaction (`src/lib/webhook.ts:93`). Live queries see the committed records without a restart; all-profile segment scope includes standalone identities (`src/lib/segments.ts:72`). These rules were tested with PGlite and actual local HTTP delivery, not with multiple cloud PostgreSQL application instances.

5. PII and the assistant.

Yes, if the question includes anything a model could generate in an arbitrary response: a model could invent a person's name, and the response validator does not recognize all possible names. That is different from a path that sends subscriber PII to the model. In the implemented request path, source emails, names, identifying account/device/visitor IDs and raw subscriber rows do not enter model context. The guarantee is an aggregate-only input boundary, not proof that a probabilistic model can never utter a name.

The original question is projected to approved enum parameters by classifyQuestion and is never forwarded; obvious email/ID input is rejected, and unrelated words such as freeform names are discarded (`src/lib/assistant.ts:25`). safeAnalytics returns approved aggregate shapes, allowlisted labels, validated segment definitions and an opaque segment reference, never memberships (`src/lib/assistant.ts:100`). Counts one through four are suppressed. App-engagement aggregates include standalone people, while newsletter-specific measures use their newsletter records.

The explanatory model input is built at `src/lib/assistant.ts:235`:

```ts
content: JSON.stringify({
  request: toolArgs.parse(args),
  aggregate: data,
  analysisDate: process.env.ANALYSIS_DATE || "2026-09-28",
}),
```

The segment-planning message at `src/lib/assistant.ts:269` is:

```ts
{ role: "user", content: JSON.stringify(args) },
```

The function schema is derived from the allowed segment schema. Proposed rules must match the approved intent before execution; there is no SQL tool or row-query tool (`src/lib/assistant.ts:274`, `:314`). The server stores the segment and the browser obtains the real membership separately through authenticated endpoints. The Azure credential is a server-side authentication header, not model message content. JSON response shape is validated and common email/identifier patterns are rejected, but prose can still be wrong or contain an invented name (`src/lib/assistant.ts:340`). Small-group suppression is not differential privacy and does not eliminate all inference through repeated aggregates.

6. Tests.

There are 28 Vitest tests in `tests/platform.test.ts:24` covering:

- Shared trim/lowercase normalization without provider rewriting; invalid/empty email rejection; actual SQL timestamp parsing, invalid calendar dates and offsets; fixed historical recency and future-ingestion separation.
- Full supplied CSV import and exact source counts; blank/invalid/duplicate/unmatched raw preservation; checksum repeat-import behavior; transaction rollback; AND/OR, never-opened and scope-aware segments; observed-signal score caps.
- HMAC validity, stale time, malformed signature and tampering; concurrent duplicate delivery and conflicting same-ID data; login backfill and late delivery; unknown profiles and immediate segment/aggregate visibility; shared-device ambiguity; anonymous events after login; Event Lab isolation; malformed event rejection.
- PII rejection before transport; captured model requests excluding names, raw text, injected source labels and identifying values; SQL/unknown-argument rejection and response email filtering; opaque segment references; validated model segment execution; tool-argument injection; small-group suppression; spreadsheet formula escaping.
- Conflicting duplicate merge rules and preserved originals; conflicting visitor claims revoking anonymous links while explicit links survive.

Ten Playwright scenarios in `tests/e2e/workspace.spec.ts:19` cover unauthorized access/CSRF; login/dashboard/search/profile/duplicates/logout; preview/save/edit/export/delete; actual signed live delivery changing segments, including standalone scope and malformed signed payloads; Event Lab login backfill and duplicate retries; source quality inspection; truthful unconfigured-model behavior and PII rejection; analyst authorization; mobile layout; and overview WCAG A/AA automated checks. A separate production-mode browser test exercises real login, real database counts, live Azure inference, the exposed aggregate payload and responsive overflow (`tests/release/release.spec.ts:3`).

Observed local results are 28 passing unit/integration/privacy tests, all ten E2E scenarios passing, the affected webhook scenario passing after the final route validation change, and a passing optimized-release smoke test. The model transport is mocked only in unit privacy tests. The default E2E server deliberately leaves AI unconfigured; the separate release check uses the actual Azure deployment. Cloud PostgreSQL, Docker execution, manual assistive-technology review and a remote CI result are not established by these local checks.

7. Security.

The three most serious remaining gaps are:

1. Staff authentication is configured by environment credentials, with no MFA, SSO or individual session registry. A stolen valid cookie remains usable until expiry unless the global encryption secret is rotated; the global login rate bucket can also deny legitimate logins when exhausted (`src/lib/auth.ts:10`, `:28`, `:57`).
2. Production CSP permits unsafe-inline scripts and styles. There is no identified imported-HTML execution sink, but a future injection defect would have weaker CSP containment than a nonce-based policy (`next.config.ts:21`).
3. The runtime and startup migration use the same DATABASE_URL credential, and the supplied Azure template constructs that connection from the database administrator. Runtime compromise would therefore inherit schema-changing database privileges; a separately privileged migration identity and least-privilege application role are needed (`scripts/migrate-prod.mjs:3`, `src/lib/db.ts:20`, `infra/main.bicep:66`). Actual cloud firewall, TLS and backup/restore behavior remains unverified.

8. Unfinished.

There is no observed production mock data or canned AI fallback, and no TODO/FIXME marker was found in application code. The synthetic CSVs are the actual assessment inputs. Hardcoded policy defaults do exist: analysis date, inactivity thresholds, score weights, source/page allowlists, AI intent grammar and presets, session duration and endpoint limits (`src/lib/config.ts:1`, `src/lib/audience.ts:34`, `src/lib/assistant.ts:25`, `src/lib/auth.ts:17`). Those are implemented choices, not learned analytics or configurable administration screens.

Public Azure hosting, standard PostgreSQL network integration, Docker execution and the Loom recording are unfinished external verification/delivery items (`docs/DEPLOYMENT.md:1`, `docs/LOOM_PLAN.md:1`). Azure infrastructure is authored and syntax-compiled only. No live hosted URL is present. Staff credential provisioning is environment-based, environment validation is primarily performed when a capability is used, and there is no comprehensive staff/session audit trail. Saved segments are implemented; a separate bookmark/report system and dark mode are not. The segment builder supports flat all/any conditions rather than arbitrarily nested groups. The AI intentionally supports a finite approved grammar and cannot provide unrestricted conversational analytics, historical open transitions or true retention. Email-change reconciliation is missing as described above. Exported app-only records without an email currently lack an app-user-ID column (`src/lib/segments.ts:131`).

The pure deviceOwner helper remains unused; actual production linking is performed by SQL in ingestEvent (`src/lib/identity.ts:7`, `src/lib/webhook.ts:124`). Audience rollups and membership evaluation load the current audience into server memory, which is acceptable for the supplied few-thousand-person assessment but is not a scalable query compiler (`src/lib/audience.ts:30`, `src/lib/segments.ts:72`). Model text can contain factual mistakes despite having safe inputs; the exact deterministic aggregate payload is inspectable.

9. Provenance.

History at audit time contains the initial README commit `e841d51`, the large implementation commit `3d3af64`, the timestamp/never-opened test extension `ff8378d`, and the standalone identity scope correction `ec2d155`. Commit authorship metadata and style alone do not reliably identify human versus AI source authorship. In this recorded development session, essentially all implementation code was authored and revised by Codex; no separate human source edits are evidenced. The human selected the repository/account, supplied the assessment, CSVs and detailed product/architecture constraints, and requested the build; that does not prove the brief itself was manually written. The large shared client workspace and CSS file reflect rapid AI-assisted implementation rather than evidence of careful manual component decomposition. It would be unsupported to assign particular implementation files to a human author or claim an independent review.
