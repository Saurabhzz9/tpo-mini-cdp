# 5–8 minute recording plan

Record the real running application; this file is a plan, not a completed recording or a submission.

| Time | Demonstration |
|---|---|
| 0:00–0:45 | Sign in. Show the overview: 2,900 canonical newsletter readers, website and app links, honest zero initial app events. Explain the September 28 reference date. |
| 0:45–1:40 | Open Settings and show the three source imports. Re-upload subscribers.csv: checksum detects the repeat. Search a duplicate subscriber, open the profile and expand both original rows. |
| 1:40–2:30 | Show unified newsletter snapshot, real website timeline and identity relationships. Distinguish account existence from observed app activity. Show Data Quality invalid rows and standalone accounts. |
| 2:30–3:20 | Preview and save Instagram readers with days since last open at least 30. Explain that never-opened readers require a separate OR condition. Export the actual authorized CSV. |
| 3:20–4:30 | In Event Lab send anonymous app_open, then login for the same test device with later event time. Show backfilled identity, duplicate redelivery and late-arriving earlier anonymous event. Explain HMAC is applied server-side and test traffic is excluded from audience analytics. |
| 4:30–5:25 | Ask the live Azure assistant about current Instagram inactivity. Expand exact model-visible aggregate data. Request an engaged-reader segment and open it through the authenticated segment UI. No subscriber rows are in either model request. |
| 5:25–6:15 | Show architecture, raw/canonical split, shared normalization, unique event key and privacy transport tests. Mention the real timestamp-parser correction; show its regression assertion. |
| 6:15–7:00 | Show acquisition/cohort insights, transparent engagement scoring and actual test results. Explain remaining SSO/MFA, CSP nonce and production least-privilege work. Distinguish completed local validation from pending paid hosting approval. |

For a non-test live event tied to an existing app account, use `npm run webhook:send -- event.json`. Choose a user ID from an authorized subscriber profile, give the event a unique ID, and use an event timestamp appropriate to the demonstration. This changes real analytics; the test Event Lab intentionally does not. Show the resulting profile and segment refresh without restarting the server.

Disclose AI assistance accurately: Codex wrote the implementation under the user's Next.js/Azure/privacy direction. Do not imply manual authorship, independent review, recorded Loom, hosted availability or passed checks that did not occur.
