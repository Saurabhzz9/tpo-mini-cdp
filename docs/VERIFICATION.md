# Verification report — October 15, 2026

The application was built from scratch in this repository. The assessment PDF's three pages and all three source CSVs were inspected before implementation. Source checksums and fields are recorded in `source-manifest.json`.

| Check actually executed | Observed result |
|---|---|
| `npm run import` against the supplied CSVs | 2,995 subscriber rows, 930 app accounts, 10,000 website events persisted; raw total 13,925 |
| Source reconciliation through unit/integration tests | 2,900 canonical subscribers; 85 duplicate groups; 8 blank rows; 2 invalid emails; 900 matched / 30 unmatched app accounts; 8,441 resolved website events |
| `npm run typecheck` | Passed |
| `npm test` | 28 tests passed against isolated in-memory PostgreSQL, including full supplied datasets, concurrency, rollback, device ambiguity, model-request captures and model-proposed segment validation |
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
- Next.js copies loaded `.env` files into standalone builds. The release preparation removes those files; a separate artifact scan confirms configured credentials are absent from the resulting text artifacts.

## Not verified or not completed

- No public hosted URL, Azure resource provisioning, real cloud PostgreSQL connection or network/firewall/backup restore test. Cost approval remains required by the supplied brief.
- Docker configuration is authored, but Docker is unavailable on this machine and no container execution is claimed.
- The Loom recording is planned, not recorded. `LOOM_PLAN.md` provides the concrete demonstration sequence.
- GitHub Actions configuration is included; local test success is separate from a remote workflow result.
- Automated accessibility coverage is the overview plus responsive task flows, not a full manual assistive-technology audit.

See `SECURITY.md` for remaining authentication, CSP and production privilege limitations. No assertion of production hardening or independent penetration testing is made.
