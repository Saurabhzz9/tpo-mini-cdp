# Verification report — October 15, 2026

The application was built from scratch in this repository. The assessment PDF's three pages and all three source CSVs were inspected before implementation. Source checksums and fields are recorded in `source-manifest.json`. The following table records the original implementation baseline; the subsequent refactor results follow below.

| Check actually executed | Observed result |
|---|---|
| `npm run import` against the supplied CSVs | 2,995 subscriber rows, 930 app accounts, 10,000 website events persisted; raw total 13,925 |
| Source reconciliation through unit/integration tests | 2,900 canonical subscribers; 85 duplicate groups; 8 blank rows; 2 invalid emails; 900 matched / 30 unmatched app accounts; 8,441 resolved website events |
| `npm run typecheck` | Passed |
| `npm test` | 28 tests passed against isolated in-memory PostgreSQL, including full supplied datasets, concurrency, rollback, device ambiguity, unknown-user segment scope, model-request captures and model-proposed segment validation |
| `npm run test:e2e` | All 10 browser scenarios passed; isolated persistent database and dedicated port 43187 |
| `node node_modules/@playwright/test/cli.js test --grep 'quality filters'` after quality-history/identity additions | Passed |
| `npm run build` | Optimized production build passed, all routes generated, standalone output prepared |
| `ALLOW_LOCAL_DB=1 npm run start` equivalent in PowerShell | Actual standalone production server started on localhost:3000, using the existing persistent local database |
| `node node_modules/@playwright/test/cli.js test --config playwright.release.config.ts` | Passed: real sign-in, real 8,441-linked-event assertion, production chart rendering, live Azure inference, inspectable aggregate data and mobile overflow check |
| `npx tsx scripts/smoke.ts` | Azure HTTP 200; Instagram inactivity: 86 with 30+ days since open, 146 never opened |
| `npx tsx scripts/smoke.ts segment` | Azure structured function proposal and final answer succeeded; 118 readers in the score >= 60 segment |
| `npm audit` | 0 reported vulnerabilities, including development dependencies |
| `az bicep build --file infra/main.bicep --stdout` | Compiled successfully; no deployment was performed |
| `node scripts/check-release.mjs` | 2,166 text artifacts scanned; no configured secret values or root environment files in standalone output |

Desktop, assistant and mobile screenshots in this directory are from the actual optimized local production application. `ai-smoke.json` and `ai-segment-smoke.json` contain real safe aggregate responses, not simulated AI outputs. Synthetic Event Lab traffic is isolated from main analytics. E2E uses a deliberately unconfigured model to verify truthful unavailable states; separate release tests verified the real configured model.

## Corrections made during verification

- Space-separated source timestamps were initially classified as invalid. Raw rows stayed preserved; parser normalization was corrected and the full-data test now asserts 10,000 persisted events and 8,441 resolved links.
- Development CSP blocked webpack initialization, and a pre-hydration form submit used the browser's default GET. The form now specifies POST and remains disabled until hydration; unsafe-eval is development-only. Generated development credentials and session encryption were subsequently rotated.
- Initial dependency review found advisories in csv-parse and Vitest. Patched versions were installed; final npm audit is clean.
- Initial browser run passed eight scenarios but found a route-announcer selector collision and insufficient small-text contrast. Those were corrected; the subsequent full ten-scenario suite passed, including automated WCAG A/AA checks.
- A standard local test port collided with another existing application. No unrelated process was stopped; tests moved to dedicated port 43187.
- The configured Azure model requires `reasoning_effort: none` for function tools on Chat Completions. The segment planner was corrected and then verified against the real deployment.
- Final review expanded segment scope to include standalone app profiles without changing newsletter totals. Signed malformed JSON shapes are validated before test-namespace inspection and return 400.
- Next.js copies loaded `.env` files into standalone builds. The release preparation removes those files; a separate artifact scan confirms configured credentials are absent from the resulting text artifacts.

## Subsequent refactor and cloud verification

The final refactor passed TypeScript, ESLint, production build and dependency audit. Local Vitest ran 31 passing tests and explicitly skipped three network-only tests without a dedicated URL. All three network tests then passed against an isolated temporary database on the actual Azure PostgreSQL server; that exact temporary database was removed. GitHub Actions independently ran all 34 tests against its PostgreSQL 16 service, plus the complete eleven-scenario Playwright suite and production build. See [the successful verification run](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38749444049).

All eleven local browser scenarios passed after separating test output directories. Nine before/after visual comparisons also passed against this machine's fixed dataset/browser at a maximum 0.1% differing-pixel threshold. The optimized local release was exercised again with actual Azure inference and desktop/mobile screenshots. These comparisons do not establish a smaller bundle or measured load capacity.

Azure cost approval was subsequently supplied: approximately US$30/month with removal after fourteen days. Dedicated B1 App Service and B1ms PostgreSQL resources were provisioned in West US 3, TLS connectivity and real PostgreSQL concurrency were verified, and schema migrations were applied separately from the non-owner application role. The current hosted acceptance state and cleanup inventory are recorded in [DEPLOYMENT.md](DEPLOYMENT.md). The historical table's "no deployment performed" describes the earlier syntax-only check, not the final resource state.

After the cloud import/transaction findings, the final local suite passed 32 tests and explicitly skipped four network-only tests. The Linux CI summary for commit `b467b76` records **36/36 passing tests**, including the new actual PostgreSQL abandoned-transaction/lock-release/pool-recovery regression. The complete eleven-scenario browser suite, lint, typecheck, production build, dependency audit and release packaging also passed in that verification job. The local final production rebuild and 2,216-artifact secret scan passed; its server was restarted successfully. See [final source verification](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38758805189).

Exact commands, concrete fixes, visual limitations and failed intermediate executions are in [REFACTOR_REVIEW.md](REFACTOR_REVIEW.md).

## Final hosted acceptance

The final source's [CI and Azure delivery](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38758805189) both succeeded. Actual public API acceptance is generated in `cloud-verification.json`, and actual desktop/mobile browser acceptance in `cloud-browser-verification.json`. These cover the complete supplied dataset reconciliation, secure login and anonymous protection, safe repeat import, signed/concurrent/late/shared-device webhook behavior with analytics isolation, real Azure aggregate and structured-segment answers, identifying-input rejection and browser logout. A client smoke test initially reused a saved stateless cookie after logout; its corrected client clears the cookie, as a browser does. Copied-cookie revocation remains an explicit authentication limitation.

The current hosted screenshots are `cloud-overview.png`, `cloud-assistant.png` and `cloud-overview-mobile.png`. The mobile capture was repeated after waiting for the sidebar transition to finish, and actual mobile navigation was checked. Source totals remain 2,900 subscribers, 900 linked app accounts, 10,000 web events and 8,441 resolved website links. Import and single-request timing evidence is in the deployment runbook; no load-test or broad production-hardening claim is made.

## Remaining verification limits

- A backup restore drill has not been executed. Hosted acceptance is reported separately in the deployment runbook.
- Docker configuration is authored, but Docker is unavailable on this machine and no container execution is claimed.
- The Loom recording is planned, not recorded. `LOOM_PLAN.md` provides the concrete demonstration sequence.
- GitHub Actions verification succeeded; deployment jobs and their acceptance checks are separate from that result.
- Automated accessibility coverage is the overview plus responsive task flows, not a full manual assistive-technology audit.

See `SECURITY.md` for remaining authentication, CSP and production privilege limitations. No assertion of production hardening or independent penetration testing is made.
