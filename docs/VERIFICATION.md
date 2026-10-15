# Verification evidence

The current presentation release, `f0d657a53826543a2bac22968aa369714667c83c`, passed [Linux CI and Azure deployment](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38765421523): 36 unit/integration tests, eleven browser scenarios, typecheck, lint, optimized build, dependency audit and release scanning/packaging. Post-deployment checks verified the requested administrator login, source-backed overview, loaded self-hosted Poppins, coral `#f2817d`, ownership notice, desktop layout and working mobile navigation without horizontal overflow. The three hosted screenshots below were refreshed from that release; this presentation check made no model requests.

The application baseline at `b467b76e4570fef61c12f4d307b39b523997ccc8` passed [Linux CI and Azure delivery](https://github.com/Saurabhzz9/tpo-mini-cdp/actions/runs/38758805189) on October 15, 2026. This page consolidates the recorded results; it does not present historical checks as newly executed checks.

| Executed check | Recorded result |
|---|---|
| TypeScript, ESLint and optimized production build | Passed |
| Unit/integration suite | 36/36 in CI: 32 local PostgreSQL-engine cases plus four network PostgreSQL cases |
| Browser E2E | 11/11 scenarios, including authorization, profile/quality/segments, Event Lab, analyst permissions, mobile, overview accessibility and stale-request handling |
| Controlled local visual comparisons | Nine desktop/mobile views passed at a maximum 0.1% differing-pixel threshold; a local fixed-data comparison, not a portable CI baseline |
| Dependency audit and release preparation | No reported dependency vulnerabilities at the recorded check; release scan found no configured secrets across 2,216 local text artifacts |
| Separate Azure PostgreSQL validation | Three earlier network scenarios passed in a temporary database, which was removed |
| Public HTTPS acceptance | Database-backed health 200; anonymous API access 401; secure staff login; HTTP redirects to HTTPS |
| Webhook acceptance | Invalid/stale signatures rejected; persisted/concurrent retries, payload conflicts, unknown users, late anonymous backfill and shared-device revocation verified |
| Real Azure model calls | Aggregate and structured-segment answers succeeded; 118-member engaged segment; identifying input rejected before inference |
| Hosted browser acceptance | Chart rendered; seven feature routes returned 200; mobile navigation worked with no horizontal overflow |

Source reconciliation: **2,995 subscriber rows, 930 app accounts and 10,000 website events**, retaining 13,925 raw rows; 2,900 canonical newsletter people, 85 duplicate groups, eight blank rows, two invalid emails, 900 linked and 30 standalone app accounts, and 8,441 resolved website events. Test events are isolated from these audience totals. See [DATA_DICTIONARY.md](DATA_DICTIONARY.md) for source checksums and metric definitions.

The original generated [public API acceptance](https://github.com/Saurabhzz9/tpo-mini-cdp/blob/c98518de5e1d22863b8c3123ade5140dde94e0ff/docs/cloud-verification.json) and [browser acceptance](https://github.com/Saurabhzz9/tpo-mini-cdp/blob/c98518de5e1d22863b8c3123ade5140dde94e0ff/docs/cloud-browser-verification.json) remain available at their immutable evidence commit. Current hosted screenshots are `cloud-overview.png`, `cloud-overview-mobile.png` and `cloud-assistant.png`. Raw audit references to historical files can be resolved at the source commit in `self-audit-manifest.json`.

## Reproduce

```sh
npm ci
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
node scripts/check-release.mjs
npm audit
```

Network integration cases require `TPO_POSTGRES_TEST_URL` pointing to a dedicated database matching `/tpo_verify_[a-f0-9]+`; they skip without that URL. Never point tests at the assessment database. E2E uses its own database and port 43187, and deliberately omits Azure configuration to test truthful unavailable/privacy states without inference charges. `playwright.release.config.ts` separately exercises a configured live model against the local optimized release. Local smoke commands can regenerate ignored screenshots/aggregate JSON; those outputs are not required submission source.

The Poppins/coral branding update passed local TypeScript, lint, optimized build and release secret scanning, plus three focused browser scenarios: login/profile flow, mobile navigation and automated overview accessibility. Those checks cover the presentation change; the raw self-audit continues to identify its earlier application snapshot.

Remaining limits: no measured load capacity, Docker execution, backup restore drill, completed Loom recording or broad manual assistive-technology audit. The local visual comparison predates the current branding update. Staff MFA/selective session revocation, nonce-based CSP and managed secret/recovery improvements remain in [SECURITY.md](SECURITY.md). No independent penetration-test certification is claimed.
