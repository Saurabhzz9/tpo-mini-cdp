# Data dictionary and source review

All three input CSVs are synthetic according to the three-page assessment PDF. They are included in `data/` for reproducible review. No app activity is supplied in these files; app events originate only from signed webhook deliveries.

| Source | Columns | Rows |
|---|---|---:|
| subscribers.csv | email, signup_date, status, acquisition_source, last_open_date | 2,995 |
| app_users.csv | user_id, email, created_at | 930 |
| web_events.csv | visitor_id, page, timestamp, utm_source, email | 10,000 |

Recomputed from source: 2,900 valid unique newsletter identities; 85 duplicate pairs (170 original rows); 8 fully blank rows; 2 invalid emails; 900 matched and 30 unmatched app accounts; 1,400 email-bearing web events; 2,028 visitor IDs; 8,441 website events resolved through direct email or visitor association. The supplied file has no conflicting visitor identities and no conflicting duplicate metadata. The tests exercise those cases separately.

## Store

- `import_batches`: immutable source checksums, kind, filename, row count and receipt time.
- `raw_records`: original JSON, source row number, batch, validation flags and person mapping.
- `people`: canonical normalized email, newsletter snapshot, duplicate count, conflict indicator and test isolation.
- `app_users`: external app identity, canonical person relationship, email bridge and original account record.
- `visitors`: website visitor relationship, all valid email claims and ambiguity state.
- `web_events`: source-linked page views with visitor, event time, optional UTM attribution and raw event JSON.
- `app_events`: unique external event ID, explicit and resolved user IDs, device, event time, receipt time, properties, payload digest and test namespace.
- `segments`: persisted validated AND/OR rules; membership is recalculated, not frozen.
- `audit_log`: import, webhook and export actions without full event bodies or emails.
- `rate_limits`: durable shared endpoint counters and reset time.

Authorized segment CSV exports contain email, status, source, signup date, score, web visits, app events and semicolon-separated `app_user_ids`. The final column keeps standalone accounts actionable when no email is known; it is never included in model context. Every exported cell receives spreadsheet-formula protection and CSV quoting.

## Metric definitions

Unique subscriber means a canonical valid newsletter identity, independent of its status. Active subscription means status `active`, not necessarily recent engagement. The supplied canonical status totals are 2,610 active and 290 unsubscribed. Inactivity on the overview combines 30+ days since last newsletter open and never-opened readers; the individual groups are shown separately. `days_inactive` segment conditions exclude null last-open dates, so add a `never_opened` OR rule when appropriate. Segments default to unique newsletter people. The all-profiles scope also includes standalone app identities; it never counts source rows or unresolved anonymous visitors.

Website-connected means at least one resolved website event. App-connected means at least one linked account; it does not imply observed app activity. First-page analysis uses the first observed web event on or after signup and is not a claim about first-ever acquisition. Cohorts show snapshot engagement by signup month; there is insufficient open-event history to measure longitudinal retention. Channel relationships overlap and are not causal conversions.

Score: newsletter recency 40 points within 7 days, 25 within 30, 10 within 60, otherwise 0; website `min(30, visits × 3)`; app `min(30, story_reads × 5 + app_events × 2)`. All-time observed web/app activity contributes; the score is an interpretable heuristic, not a prediction. Source acquisition and live metrics are calculated from the database, not hardcoded display totals.
