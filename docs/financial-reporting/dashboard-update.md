# Finance dashboard interaction and timezone update

The main chart now independently shows gross sales, expenses, and estimated net profit using the existing searchable multiselect. Metric and Group by controls are left aligned in the row below Period. Hover, keyboard focus, or touch activation on a point opens a nearby date/value card. Escape dismisses it. Changing a metric or grouping is local; date/market changes fetch one updated report while retaining the mounted chart and consistent prior totals until the response arrives. No document navigation or reload is used.

Profit by product, Product sales, and Expenses by category now use donut charts. Hover/focus highlights a slice and shows its name, amount, and percentage. Existing product detail dialogs remain available. Product sales defaults to revenue and can still show quantities. Negative contributions keep their sign and danger color; slice size uses absolute magnitude and explicitly labels the absolute total. Zero-only distributions show the shared empty state. All nonzero items contribute to the percentage denominator.

## Personal timezone

Set Time zone under Account time zone in vendor, manager, or platform Settings, then click Save time zone. It is also editable in the central personal account's profile form. This is one account preference across roles, stored in Vendure's existing settings store at `platformAccount.timezone` with server-derived `user:<activeUserId>` scope. Callers cannot select another account. Valid IANA zones are checked server-side. No new table or migration is required.

When no preference is saved, the web UI detects the browser timezone. Reporting accepts that initial zone hint; once a preference exists, the backend preference takes precedence over client hints. Non-browser callers without a saved preference or hint use the project's America/Chicago fallback. UTC is available as an explicit choice, rather than the hardcoded reporting default. Market schedule/occurrence zones are unchanged.

Sales, settled refunds, actual booth costs/collections, and outstanding invoice ranges use local-midnight boundaries converted to instants. Timestamp-without-zone native financial facts are explicitly interpreted as UTC storage before conversion. Indexed timestamp columns stay bare in range predicates. Daylight-saving ranges naturally cover 23 or 25 hours. Expense dates remain the entered business calendar date. Presets use the account calendar, weekly buckets start Monday, and CSV identifies the report zone. September reference totals remain unchanged in America/Chicago.

## Changed local files

Web: `apps/admin/src/finance/{charts,Finances}.tsx`, `finance.css`, `AccountTimezoneSettings.tsx`, `AdminShell.tsx`, the opt-in retained-read parameter in `vendor/common.tsx`, `packages/api/src/{finance,account-timezone,index}.ts`, central account profile/settings adapters, schema/generated Admin contract files, finance DOM/browser checks, and component usage documentation.

Backend: `platform-identity/account-timezone.ts`, settings-field registration in `platform-identity.plugin.ts`, central account profile read/write adapters, finance API/options/report/date calculation changes, and the combined feature qualification. Existing expense, payment and immutable cost records are not rewritten.

## Verification

- Combined backend: 20 groups passed, including account setting ownership, invalid-zone rejection, saved-zone precedence, native sale date rollover, daylight-saving boundaries, all previous calculations, cost snapshots, receipt security, and payment compatibility. Successful disposable test database was dropped through the guard.
- Finance/shared admin DOM tests: 34 passed. They verify hover/focus cards, signed donut percentages, series visibility, local-midnight presets, and graph-node retention during pending reads.
- Existing UI refinement, dialog lifecycle, and vendor compatibility tests: 82 passed.
- Screenshot-free browser: all checks passed, including 1280/768/390 geometry, left alignment, real point/arc hover, mounted graph updates, both business roles, expense/receipt/CSV flows, and saving Asia/Tokyo then restoring America/Chicago through Settings.
- Both repositories built successfully, including storefront/admin and backend dashboard/server/worker. Root/Astro and strict backend typechecks, schema extraction/codegen, targeted lint and boundary checks passed. Existing bundle-size warnings remain.

Evidence: [backend](dashboard-backend.log), [DOM](dashboard-update/unit-results.json), [compatibility](dashboard-compatibility/unit-results.json), [browser](dashboard-browser.log), [builds](dashboard-build.log), [typecheck](dashboard-typecheck.log). No screenshots, recordings, or visual review were used.

The retained manual fixture is unchanged in scope: `vendure_test_pos_demo_1792526989882_c5c1fa`. Browser expenses were voided and the vendor timezone was restored to America/Chicago. `vendure_demo_market_ops` and `vendure` were not migrated, seeded, or modified. Nothing was committed, pushed, or deployed.
