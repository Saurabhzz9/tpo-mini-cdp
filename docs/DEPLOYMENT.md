# Azure assessment deployment and removal

The developer approved the cheapest reasonably responsive deployment at approximately US$30/month and explicitly requested removal after fourteen days. Resources were provisioned on October 15, 2026. Cloud PostgreSQL TLS connectivity, schema migration and isolated concurrency tests have passed. Public application acceptance is pending completion of the ZIP deployment; provisioning alone is not a successful release.

## Dedicated inventory and cost

Subscription: `e96c8788-8622-4dae-a0b4-ec85fe87fde6`. Region: **West US 3**. Dedicated group: **`tpo-mini-cdp-demo-rg`**, tagged `project=tpo-mini-cdp`, `expiresOn=2026-10-29`, `monthlyBudgetUSD=30`.

| Resource | Configuration / purpose |
|---|---|
| `tpo-cdp-s9-261015-plan` | Linux App Service Basic B1, one always-on instance |
| `tpo-cdp-s9-261015` | One Next.js application, Node.js 24 LTS, HTTPS only, TLS 1.2 minimum, FTP disabled |
| `tpo-cdp-s9-261015-pg` | PostgreSQL 16, Standard B1ms burstable, 32 GB storage, no HA, seven-day backup retention |
| `tpo-cdp-s9-261015-ci` | Managed identity for GitHub deployment to this exact web app |
| `tpo-cdp-s9-261015-expiry` | Consumption Logic App with a guarded October 29 deletion schedule |

The existing Azure AI resource/deployment is reused. It is outside this group and must not be deleted with the demo. No separate backend, Redis, Kubernetes, container registry, GPU or paid monitoring workspace is required.

The West US 3 public retail rates checked on October 15 were US$0.017/hour for Linux B1, US$0.017/hour for B1ms database compute and US$0.115/GB/month for 32 GB storage. At 730 hours/month this is approximately **US$28.50/month**, or **US$13.15 for fourteen days**, before inference, egress, small consumption-workflow execution charges and taxes. These are estimates, not a hard bill cap. The [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) supplies public rates; actual subscription billing can differ.

A US$30 monthly resource-group budget exists for October. It does not stop resources or cap billing. No email recipient was supplied, so notification emails are not configured. The assistant has a shared ten-request/day demo allowance in addition to the normal staff hourly limit; direct calls outside this app to the shared AI resource are outside that allowance. Managed identities/OIDC do not require a separate paid hosting plan.

## Linux package and scoped GitHub deployment

`.github/workflows/ci.yml` installs dependencies, typechecks, lints, runs unit/PostgreSQL/browser tests, builds on Linux, audits production dependencies, scans release text for configured secrets and uploads the standalone ZIP. Its root contains `server.js`, `.next`, dependencies, public assets and migration tooling. Synthetic source CSVs, `.env` files and local credential files are excluded. Windows build junctions are not portable to Linux, which is why the release is built by the Linux CI worker. A manual ZIP download to the developer computer is unnecessary.

The deployment job downloads that verified artifact directly inside GitHub Actions. Azure OIDC exchanges a short-lived GitHub identity token for Azure access; no permanent publish password or Azure client secret is saved in GitHub. Its identity has Website Contributor on **only this web app**, with no database or resource-group deletion authority. Federation requires the exact immutable repository/owner and main-branch subject:

```text
repo:Saurabhzz9@74092471/tpo-mini-cdp@1420653576:ref:refs/heads/main
```

The deployment job checks the UTC date and skips cloud delivery from October 29 onward. Hosting build automation is disabled for the prebuilt package; startup is `node server.js`. `infra/ci.bicep` reproduces federation and scoped role assignment. When applying it over this existing deployment, retain role assignment name `eea8450e-cff6-40d1-bd36-7985cefa14ff` rather than creating a duplicate assignment.

Two source-build attempts were unsuccessful: the first omitted build-time TypeScript dependencies, and the second stalled in dependency installation. Their abandoned deployment lock blocked subsequent ZIP attempts with HTTP 409. After verifying the original build process was gone, its exact lock was archived and the app restarted, following [Microsoft's deployment-lock troubleshooting](https://azureossd.github.io/2023/08/14/Troubleshooting-HTTP-409s-when-deploying-to-App-Service/index.html). This is a recorded deployment issue, not a passing acceptance check.

## Database and secret boundaries

The `tpo` database uses verified TLS. Schema migrations are applied with the owner account separately; runtime connects as `tpoapp` with CONNECT, schema USAGE, table DML and sequence grants, no schema ownership or CREATE privilege. Changes to the schema require a separate maintenance migration and any new grants. The application never receives the database administrator password.

The database firewall allows the web app's enumerated outbound and possible outbound IPv4 addresses. The broad allow-all-Azure rule is not enabled. A temporary exact developer-IP rule used for schema preparation/testing must be removed after final database diagnostics. If App Service outbound addresses change, refresh the explicit allowlist before deployment. This public-IP approach is appropriate for the constrained assessment; organizational rollout should evaluate private networking.

Independent cloud staff, session and HMAC credentials were generated. Runtime values are Azure app settings supplied via ignored `infra/demo.local.json`; `.cloud-access.txt` holds the generated local handover login. Neither belongs in Git, screenshots, pipeline artifacts or build context. `ALLOW_LOCAL_DB` is unset in cloud hosting. `APP_URL` is the exact HTTPS origin. Login trusts the final App Service ingress-appended address only in its explicitly configured hosting mode.

## Fourteen-day expiry

`infra/expiry.bicep` schedules the workflow for **October 29, 2026 at 06:30 UTC / 12:00 IST**, recurring daily if necessary. Its system identity can delete only the dedicated group. Before deletion it checks the current time, exact group ownership/expiry tags, a complete inventory without pagination, and that every listed resource has the expected project tag and one of the **five exact resource IDs above**. Unexpected resources cause a failed guard and no deletion. It then requests deletion of this group, including its own workflow and identity.

A pre-expiry guard execution verified the inventory reads and skipped the delete action. Actual future deletion cannot be verified in advance. A Codex follow-up is scheduled for 12:15 IST on October 29 to verify removal and report an actionable failure or completion. It must never delete the shared AI resource or unrelated groups. Removal intentionally makes the hosted assessment URL unavailable; this lifetime should accompany the submitted demo link.

For manual fallback, inspect and compare the exact group inventory and tags first, then delete only `tpo-mini-cdp-demo-rg`. Export any wanted assessment artifacts before expiry. Database backups are not a substitute for preserving data beyond deletion of the server/group. A backup restore drill remains unexecuted.

## Release acceptance evidence

Pending hosted health/login/import/webhook/model/browser checks will be recorded here only after execution. Existing evidence includes three real Azure PostgreSQL integration tests in a temporary database, all 34 CI unit/integration tests, eleven E2E scenarios, production build and the optimized local release's actual Azure inference. These do not yet establish a working public URL.

Docker execution is unverified because Docker is unavailable locally. The Loom recording is still planned. See `REFACTOR_REVIEW.md` and `VERIFICATION.md` for implementation evidence and remaining scope limits.
