# Security and privacy

## Controls

| Boundary | Implementation |
|---|---|
| Staff access | `src/lib/auth.ts`: scrypt verification, constant-time comparison, encrypted eight-hour HttpOnly/SameSite cookies, production Secure flag, durable per-client login throttles and exact Origin checks for mutations |
| Authorization | Protected server layout plus independent API checks; imports and Event Lab require administrator access. Staff share one workspace, not separate customer tenants |
| Input and database | Zod schemas, parameterized SQL, streaming body bounds, fixed CSV headers, 8 MB/50,000-row import limits and transactional rollback |
| Identity/event integrity | Signed raw-body HMAC with five-minute tolerance, persistent event IDs/digests, conflicting reuse rejection, shared transaction lock, ambiguous-device revocation and separated test/live identifiers |
| AI privacy | Approved intent projection, aggregate-only payloads, allowlisted metadata, suppression of counts 1–4, validated segment tools, no original messages or membership lists in model context |
| Display/export | React text rendering for imported/model text; formula-safe CSV cells including whitespace-prefixed payloads; authorized exports with rate limits |
| Hosting | HTTPS/TLS, frame/nosniff/referrer restrictions, no-store responses, explicit database IP allowlist and a non-owner runtime PostgreSQL role |
| Secrets and packaging | Ignored local environment/access/parameter files, no secrets in logs or browser settings, release artifact scanning, separate schema-owner migrations and an unprivileged optional Docker runtime |

Synthetic assessment CSVs are included for reproduction; real customer data must stay outside Git. Poppins is self-hosted, so font rendering does not contact a third-party font service. Personal recordings, scripts and browser traces are excluded from submission source.

## Verified boundaries

Existing regression tests cover actual constructed model requests, identifying questions, poisoned metadata, unexpected model tools, login-client isolation, mixed test/live namespaces, concurrent import/webhook account creation, rejected account claims and shared-device backfill. Network PostgreSQL coverage also expires an abandoned transaction and verifies lock release and pool recovery. [VERIFICATION.md](VERIFICATION.md) identifies executed results and immutable hosted evidence.

The pool has 15-second acquisition/lock limits, a 120-second statement timeout and a 60-second idle-transaction timeout. Connection errors are handled without printing connection details, and failed rollback preserves the original error. These bounds do not guarantee an overall import duration; webhook senders may need retries while imports hold the global identity lock.

## Remaining limits

1. **Authentication and revocation:** no SSO/MFA or selective session revocation. Password changes do not revoke existing sealed cookies. Logout clears the browser cookie; a copied cookie lasts until its eight-hour expiry or `SESSION_SECRET` rotation. Organizational use needs stronger identity and session management.
2. **CSP and ingress:** production currently permits inline bootstrap scripts/styles; nonce-based CSP remains future hardening. Login trusts the final proxy-appended address only with `LOGIN_TRUSTED_PROXY=azure-app-service` and `WEBSITE_INSTANCE_ID`. App Service must be the sole ingress in that mode; direct local mode intentionally shares a local bucket. Distributed attacks and shared NATs remain throttle limits.
3. **Operations and recovery:** App Service settings supply runtime secrets with manual rotation. The application role has DML/sequence grants but no schema ownership or CREATE privilege. Seven-day backups are configured; a restore drill remains unverified. Wider rollout should evaluate Key Vault/managed identity, private networking and a tested recovery procedure.

Model response filtering catches common email/ID forms but cannot guarantee the absence of invented names or factual mistakes. Inspectable aggregates remain authoritative. Small-count suppression is not differential privacy. Global ingestion locking, whole-audience rollups, in-memory segments and bounded timeline/export paths limit scale. These findings are source review and regression evidence, not an independent penetration test.
