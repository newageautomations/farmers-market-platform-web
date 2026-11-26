# Hosted market occurrence generation fix

## Root cause

Recurring schedules are stored as JSON on the market and have opaque string keys. The GraphQL schema declared those keys as `ID`. Vendure 3.8.2 applies its entity-ID codec to GraphQL `ID` inputs, including list elements. With the default numeric strategy it decoded the reported `scd201e3a6cfd` as `-1`. Generation then rejected the selection with `Schedule not found` before calculating any occurrences. This explains the same failure for a one-date or multi-date range.

A newly provisioned Test Accounts market reproduced the reported HTTP 200, `data: null`, and masked `INTERNAL_SERVER_ERROR` under the staging HTTP policy and GraphQL sanitizer on disposable PostgreSQL 17.5. Saving the first repeating schedule persisted and returned its correct key. Manual creation succeeded because it accepts explicit timestamps and a string generation key, with no repeating schedule lookup. The same codec runs in local development, staging and production on Vendure 3.8.2. Production masking hid the validation reason.

## Changes and release

- The schedule output key, save input key, delete argument, and generation selection now use GraphQL `String`. The market and occurrence entity IDs still use `ID`. Save and delete used the same codec and received the same correction. Existing persisted keys, including `legacy`, remain usable.
- Generation retains the market lock, authorization, selected-schedule lookup, date limits, time and recurrence rules, version snapshots, duplicate keys, and transaction boundaries. Manual creation and market provisioning require no change.
- Redeploy Railway `api` from the backend revision and `admin` from the matching web revision together. Refresh open Admin tabs after both are ready. GraphQL clients with explicit schedule variables must use `$scheduleIds: [String!]` and `$scheduleId: String!`. The `worker`, `storefront`, `gateway`, and PostgreSQL services require no redeploy for this fix.
- No migration, existing-data repair, or environment variable changes are required.

## Diagnostics

Known generation rejections log `graphql_error` with the server request ID, `/admin-api`, recognized operation `MarketGenerate`, schema field `generateMarketOccurrences`, module `OccurrenceGenerationService`, code `MARKET_OCCURRENCE_GENERATION_REJECTED`, and a fixed reason. These distinguish invalid dates, reversed or oversized ranges, dates outside the current horizon, invalid selection size, unavailable schedules, DST gaps or overlaps, and invalid stored schedule values or generated hours. Stale, nonexistent, and foreign schedule keys return the same safe result. Authorization retains its existing denial responses.

The production sanitizer allows only fixed public input sentinels for these cases. Admin translates those sentinels into actionable messages in the existing dialog and allows the user to correct the input and try again. Private logs omit inputs, credentials, raw exception text, and database details. Unexpected failures retain the existing masking. [Hosted API diagnostics](HOSTED_API_DIAGNOSTICS.md)

## Automated verification

| Check | Result |
| --- | --- |
| Backend `npm run test:occurrence-generation` | Passed with the full release migration ledger on disposable PostgreSQL 17.5. Provisioned a new market through Test Accounts. Verified schedule save, edit, and delete, generation of one or several dates, multiple or omitted selections, spring DST conversion, duplicate prevention, manual creation and scoped reads. Also verified invalid or stale selections and ranges, foreign and anonymous denial, rollback, safe diagnostics, and vendor-managed scheduling with automatic owner attendance. |
| Backend production hardening `test/production-hardening/policy.ts` | Passed. Verified production redaction and existing startup and ingress policy. |
| Backend `npm run build:server` | Passed. |
| Web occurrence and GraphQL contract tests | 10 passed. Covered the corrected operation, schedule selection, and actionable feedback in the existing dialog. |
| Web `npm run build --workspace @market/admin` | Passed with the Vite chunk-size warning. |

The backend qualification ran on Windows with synthetic staging ingress headers. Railway and the affected staging account were left for the post-release check. Full schema extraction picked up pre-existing drift between the pinned frontend snapshot and other backend schema changes. The checked-in contract update is limited to the four recurring-schedule schema definitions, and the Admin documents were generated from that snapshot.

The broader Market UI test run had four authentication and workspace failures. All four reproduced against the unchanged sources at `HEAD`. The existing backend `test:market-auto-enroll` harness stopped in the Vendure 3.8.2 migration because its raw data source lacked `OrderLine` metadata. The focused occurrence suite used the release migration runner.

## Manual verification

### Integrated local environment

The dedicated fixture on `vendure_demo_market_ops` is **Test Market (occurrence-generation 1)**. Use `fixture-occurrence-generation-market-manager-1@fixtures.invalid` and the generated password in the guarded CLI’s private `credentialOutput` file. The created workspace opens at `http://localhost:4322/market?channel=99`. The fixture CLI created only this account and workspace for the test. The fixture starts with no repeating schedules or occurrences.

From the web checkout, run these in separate terminals.

```powershell
npm.cmd run demo:market-operations:serve
npm.cmd run demo:market-operations:worker
npm.cmd run demo:market-operations:admin
npm.cmd run demo:market-operations:storefront
```

To create the same fixture on another integrated local setup, save the following as `.runtime/occurrence-generation-fixture.json` in the web checkout. The guarded apply checks the existing demo database and migration ledger. An exact repeat skips the account and preserves its password.

```json
{
  "namespace": "occurrence-generation",
  "verification": "simulated_verified",
  "accounts": [{ "type": "market_manager", "count": 1 }]
}
```

```powershell
$generationSpec = (Resolve-Path .runtime/occurrence-generation-fixture.json).Path
npm.cmd --prefix ../farmers-market-platform run test-data:seed -- --spec $generationSpec --target demo --dry-run
npm.cmd --prefix ../farmers-market-platform run test-data:seed -- --spec $generationSpec --target demo --apply
```

In the dedicated workspace, use **Create single date** to save one future date on a different weekday from the repeating schedule. In **Generate occurrences**, save a weekly schedule with an address, local hours of 9 a.m. to noon, and an effective date covering at least three upcoming matches. The fixture uses `America/Chicago`.

### Local and staging checks

In staging, after both services are deployed, sign in to the existing affected market manager workspace. Use its saved repeating schedule and note the dates and hours of any existing manual occurrences before beginning.

1. Select the saved schedule and pick one future matching day as both range endpoints. Generate and confirm one result.
2. Extend the range to cover two or more additional matching days within the generation horizon. Confirm their local dates, start and end times, and venue in the occurrence list and details. The first day should still have one row for that schedule.
3. Repeat the extended range. Compare occurrence IDs or list counts before and after. The same schedule and date should resolve to the same occurrence.
4. Confirm the manually created dates and their hours are intact. Open a generated date in **Occurrences**, then confirm it can be selected for market preparation or booth scheduling.
5. If staging rejects a valid selection, capture `X-Request-Id`, timestamp and API revision. Use the matching `graphql_error` and `http_request` entries to identify the specific reason. Keep the request payload and session credentials out of the report.

## Files changed

- Backend `src/plugins/farmers-market/api/admin-api.ts`, `src/plugins/farmers-market/recurrence/{generation-error,local-time}.ts`, and `src/plugins/farmers-market/services/occurrence-generation.service.ts`.
- Backend `src/production-error-diagnostics.ts` and `src/production-http.ts`.
- Backend `package.json` and `test/market-operations/occurrence-generation.ts`.
- Web `packages/api/operations/market.graphql`, `packages/api/schema/{admin.graphql,provenance.json}`, and `packages/api/src/{errors.ts,transport.ts,generated/admin.ts}`.
- Web `tests/market.test.tsx` and this report.
