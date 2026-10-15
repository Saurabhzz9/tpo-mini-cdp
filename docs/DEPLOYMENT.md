# Azure assessment deployment and removal

The developer approved the cheapest reasonably responsive deployment at approximately US$30/month with removal after fourteen days. Resources were provisioned on October 15, 2026. The application is live at **[tpo-cdp-s9-261015.azurewebsites.net](https://tpo-cdp-s9-261015.azurewebsites.net)**. Staff credentials are handed over in ignored `.cloud-access.txt`; no password is published here. Hosting ends October 29 at 12:00 IST. [VERIFICATION.md](VERIFICATION.md) identifies the recorded application baseline and hosted acceptance evidence.

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

Deploy the verified Linux artifact through the existing workflow. Avoid simultaneous deployments and settings changes during upload. If a deployment lock persists, confirm no deployment process is active before following the platform's recovery procedure. Wait for the app's database-backed health check and verify sign-in after rollout; do not run imports while instances are still converging.

## Database and secret boundaries

The `tpo` database uses verified TLS. Schema migrations are applied with the owner account separately; runtime connects as `tpoapp` with CONNECT, schema USAGE, table DML and sequence grants, no schema ownership or CREATE privilege. Changes to the schema require a separate maintenance migration and any new grants. The application never receives the database administrator password.

The database firewall allows the web app's 25 enumerated outbound and possible outbound IPv4 addresses. The broad allow-all-Azure rule is not enabled. The temporary exact developer-IP rule used for schema preparation/testing was removed and the resulting 25-rule inventory verified. A TLS connection as the runtime role also verified DML access, no schema CREATE privilege, no superuser flag and zero owned schema objects. If App Service outbound addresses change, refresh the explicit allowlist before deployment. This public-IP approach is appropriate for the constrained assessment; organizational rollout should evaluate private networking.

Runtime credentials are Azure app settings supplied via ignored `infra/demo.local.json`; `.cloud-access.txt` holds the private handover login. Neither belongs in Git, screenshots, pipeline artifacts or build context. Keep the app's admin hash and private handover files synchronized when changing the password, then verify sign-in after the settings restart. `ALLOW_LOCAL_DB` is unset in cloud hosting. `APP_URL` is the exact HTTPS origin. Login trusts the final App Service ingress-appended address only in its explicitly configured hosting mode.

## Fourteen-day expiry

`infra/expiry.bicep` schedules the workflow for **October 29, 2026 at 06:30 UTC / 12:00 IST**, recurring daily if necessary. Its system identity can delete only the dedicated group. Before deletion it checks the current time, exact group ownership/expiry tags, a complete inventory without pagination, and that every listed resource has the expected project tag and one of the **five exact resource IDs above**. Unexpected resources cause a failed guard and no deletion. It then requests deletion of this group, including its own workflow and identity.

A pre-expiry execution of the final guard verified the inventory reads, returned zero unexpected resource IDs/tags and skipped the delete action (run `08584095313685205017335190448CU22`). The run's intentional failure code is `DemoCleanupGuard` because the expiry date has not arrived. Actual future deletion cannot be verified in advance. A Codex follow-up is scheduled for 12:15 IST on October 29 to verify removal and report an actionable failure or completion. It must never delete the shared AI resource or unrelated groups. Removal intentionally makes the hosted assessment URL unavailable; this lifetime should accompany the submitted demo link.

For manual fallback, inspect and compare the exact group inventory and tags first, then delete only `tpo-mini-cdp-demo-rg`. Export any wanted assessment artifacts before expiry. Database backups are not a substitute for preserving data beyond deletion of the server/group. A backup restore drill remains unexecuted.

## Release acceptance

[VERIFICATION.md](VERIFICATION.md) is the single results summary, including CI, immutable public API/browser acceptance and reproducible commands. Historical observed import times were 5.85 seconds for app accounts and 5.43 seconds for website events; individual WAN samples measured overview at 1.07 seconds and segment preview at 0.47 seconds. These are observations, not concurrent-load benchmarks. Sign-in, database-backed health and desktop/mobile presentation should be checked after a release.

Docker execution and backup restoration remain unverified. A Loom walkthrough recording is still required for submission. Authentication, CSP and operational limits are in [SECURITY.md](SECURITY.md).
