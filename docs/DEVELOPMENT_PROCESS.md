# Engineering ownership and development

Saurabh Rai directed the engineering of this assessment, with AI assistance for implementation and recorded automated execution. The account below combines recorded project decisions with the developer's reported review and manual testing activities. It distinguishes those responsibilities without attributing undocumented handwritten code or independent test executions.

## Planning and architecture

The developer chose a single full-stack Next.js application rather than a separate frontend/backend deployment. For a small internal Growth tool, one application reduces deployment, authentication and operational overhead while keeping ingestion, identity, analytics and model services behind explicit server boundaries. An authenticated Server Component layout supplies safe workspace settings to a persistent client shell; feature components own their own interactions. PostgreSQL was selected for persistent relational data, constraints and transactions. Local PGlite runs the same SQL schema without requiring a separately installed database.

## Data modeling and identity

The developer directed preservation of every source record alongside canonical identities. Raw JSON, batch checksums, row numbers and quality flags support inspection and repeat-safe imports; canonical normalized email supports subscriber analytics without counting duplicates as additional people. Duplicate originals remain visible in Subscriber 360 and the Data Quality Center. One shared normalization function trims, lowercases and validates email without guessing provider aliases.

Identity requirements favor correct, explainable links over maximum coverage. App accounts use the email bridge; website visitors require one consistent valid email claim. Shared visitors/devices lose inferred anonymous links when ownership becomes ambiguous. Conflicting app-account claims preserve the established owner and original disputed record. These choices retain evidence without silently merging different readers.

## Webhook reliability

The developer directed signed event delivery, durable idempotency, explicit conflict handling and event-time processing. HMAC authenticates the timestamp and exact body; persisted IDs and payload digests distinguish retries from conflicting reuse. Transactions serialize identity writes across imports and webhooks. Device history is recomputed from stored claims so late anonymous events can be linked to a valid login without depending on arrival order. Unknown accounts are retained as standalone identities. Event Lab uses a separate test namespace so demonstrations cannot inflate audience analytics.

## Product and privacy decisions

The developer planned Subscriber 360, relationship views, segmentation, engagement/acquisition insights, the Data Quality Center, Event Lab and the Growth assistant. Source lineage, duplicate visibility, current audience membership and transparent score breakdowns make the tool useful for Growth decisions. The developer also directed UI/UX priorities, responsive behavior and alignment with The Pour Over's typography and color palette. Poppins is self-hosted under its Open Font License; the interface uses coral accents, neutral surfaces and dark text.

The assistant's strict PII boundary was a product and security requirement. Questions become approved intents before inference; only allowlisted aggregate data and validated segment definitions cross the model transport. Original messages, source records and subscriber identities stay on the application server. Model proposals are checked before execution, and authorized membership retrieval remains separate. This accepts narrower question coverage in exchange for a reviewable data boundary.

## Review and validation

The developer reviewed generated source and architecture, identified the oversized workspace component, and requested decomposition into feature routes/components with scoped CSS. Security-review direction covered PII boundaries, identity correctness, authenticated webhooks and correction cycles. The developer reports manually testing browser behavior, directing/reviewing E2E scenarios and results, identifying bugs, and evaluating fixes against assessment requirements.

AI assistance produced the recorded application/test code, refactoring and corrective patches, and executed the logged automated checks. Existing CI, integration, privacy-transport, browser and hosted verification evidence is summarized in [VERIFICATION.md](VERIFICATION.md). Those executions support the recorded results; the developer's manual review/testing account is not represented as an independently logged automated run.

## Infrastructure and acceptance

The developer selected Azure and approved a cost-conscious, reasonably responsive demo at approximately US$30/month with removal after fourteen days. One Linux App Service and a small PostgreSQL server reuse an existing approved AI deployment. Scoped GitHub OIDC avoids permanent deployment credentials, and a guarded expiry workflow targets only the dedicated demo group. Hosting ends October 29, 2026 at 12:00 IST; costs, inventory and cleanup instructions are in [DEPLOYMENT.md](DEPLOYMENT.md).

The developer owned feature priorities, engineering trade-offs, correction requests and final technical decisions. Accepted limits include conservative identity under-linking, fixed aggregate AI intents, snapshot rather than longitudinal retention analytics, and scale/authentication hardening still needed before broader organizational use. Source generation and engineering ownership are distinct parts of this delivery.

The single [SELF_AUDIT.md](SELF_AUDIT.md) preserves the complete raw response to the original nine-question prompt. Point 9 directly records these engineering responsibilities. Its response bytes and original prompt are identified in `self-audit-manifest.json`; historical source/evidence paths in that response refer to the recorded source commit. The audit remains unedited when presentation and documentation are updated.
