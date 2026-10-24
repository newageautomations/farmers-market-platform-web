# Financial reporting and expense management

This combined implementation adds private Finances workspaces at `/vendor/finances` and `/market/finances`. It runs locally in the existing dashboard shell. There is no deployment, external accounting integration, bank connection, processor charge, or accounting ledger.

Current chart interactions and personal time zones are documented in [the dashboard update](dashboard-update.md).

## Authoritative activity

The backend `FinancialReportingPlugin` owns the Admin API and centralized `calculate()` function. Vendor activity starts with immutable `purchase_financial_snapshot`, `line_financial_allocation`, and verified capture operations. Online checkout, cash POS, and the native Square and Clover payment coordinators already write these same allocations. Reading allocations once avoids counting customer orders, vendor operational portions, provider observations, and bank transfers as separate sales.

Settled `refund_allocation` records join their original units and successful provider results. Refunds reduce product revenue on the provider-result date, including when the original sale was outside the selected period. Pending, failed, canceled, unverified, or merely imported inventory observations do not create reported sales. Existing legacy orders without verified financial snapshots are not backfilled or interpreted as revenue.

Market manager revenue comes exclusively from native `market_payment` records attached to that manager's market invoices. Complimentary and waived payments are excluded from collected revenue. Vendor merchandise revenue never enters the manager calculation. Outstanding fees are the remaining balances of open invoices issued in the selected period and currency. Sponsorships, application fees, and other revenue without an existing payment record are not invented.

## Definitions

Amounts are integer minor currency units. Reports use inclusive calendar dates in the personal account time zone, up to 366 days. The browser zone is the initial default when no account preference is saved; non-browser calls fall back to America/Chicago. Currencies are selected separately and never converted or combined.

| Value                      | Definition                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gross product sales        | Original product allocation gross, before discounts and refunds                                                                                                          |
| Net product sales          | Gross minus actual allocated discounts and settled product refunds                                                                                                       |
| Estimated production costs | Immutable sold quantity multiplied by the known cost recorded at sale time                                                                                               |
| Automatic payment fees     | Latest observed fee for each processor resource and currency, only with explicit vendor ownership and a configured payer                                                 |
| Deductible expenses        | Active manually recorded expenses classified to reduce profit                                                                                                            |
| Total expenses             | Production costs, known automatic fees, and deductible manual expenses                                                                                                   |
| Estimated net profit       | Net product sales minus total expenses                                                                                                                                   |
| Product contribution       | Product revenue after discounts/refunds minus its direct production costs                                                                                                |
| Recorded spending          | Active manual purchases plus known assigned automatic fees; purchases covered by production costs remain included, while duplicate copies of automatic fees are excluded |

Product revenue excludes sales tax, shipping, shipping tax, and customer platform surcharges. A customer surcharge is not a vendor expense. A vendor platform fee can be recorded explicitly as an expense. The existing processor fee observations commonly have no configured vendor payer. Those remain unknown rather than being fabricated or charged to the vendor by this report. Square/Clover records that lack a recorded processing fee remain unknown as well. Cash processing fees are known zero. Manually entered fees represent the business owner's recorded amount.

Profit is always labeled estimated. Unknown production costs and unassigned fees are omitted from the known-cost subtotal, with visible missing-unit and unknown-fee counts. A zero entered by an owner is a known zero; a blank cost is unknown. No average fee percentages or guessed historical costs are used.

Refunded products retain the production spending incurred when they were made. A refund does not imply ingredients were recovered or a product was resalable. Consequently product contribution can be negative and refund-only reporting periods can have negative product quantities. Units displayed are sales units minus returned units.

## Attribution

Captured native order context determines market and event attribution. POS snapshots provide their selected market/event context. Direct vendor and explicitly independent POS sales belong to Independent sales. General overhead is included once in All sales; it is not copied into each market or independent total. Market and independent expenses affect their own scope. Event-specific manager costs affect that event. Market operating expenses without an event affect the market total and are not distributed across every event.

The smaller cards, daily chart, logs, and CSV all use the same report result. The chart supports daily, Monday-based weekly, and monthly grouping, with daily values still available. The zero baseline and negative points are preserved. The independently toggleable expense series shows costs deducted from profit. The expense card can switch to recorded spending to expose purchases excluded from profit.

## Production costs

`finance_product_cost` is an append-only, effective-dated history for a vendor-owned variant and its canonical currency. The backend chooses the effective time; callers cannot backdate costs. Cost changes require both current owner finance and catalog authority. Costed variant creation composes the existing catalog service and cost write in one transaction.

On capture, the existing financial attribution transaction writes `finance_sale_cost` for each sold line. It selects the latest cost effective at the verified capture time. Missing costs are saved as unknown. Earlier sales without a cost snapshot also remain unknown. Subsequent product edits, clearing a cost, or changing costs cannot rewrite those snapshots. These tables are separate from Vendure public custom fields and the Shop schema. No customer receipt, checkout, product price, tax, or POS charge consumes production cost.

## Expenses and receipts

`finance_expense` stores description, amount, canonical currency, date, category, optional payee/notes, attribution, and profit treatment. Creation keys are serialized and replayed against immutable original audit facts. Updates use row locks and optimistic versions. Removal is an auditable void. `finance_expense_audit` retains before/after values and actors, with database triggers preventing history edits or deletion. See [expense policy](expense-policy.md).

Receipts live in `finance_receipt`, linked to an owned expense. The feature reuses the Documents plugin's existing encrypted private storage, signature validation, bounded upload reader, and ClamAV scanner. It does not use public Vendure assets, compliance sharing grants, or a second storage system. Images and PDFs retain the existing 10 MB limit. Files are unavailable until scanning succeeds. Scanner failure removes stored bytes and keeps a failed receipt record. Expense owners can retain access to receipts after voiding the expense; another vendor, customer, or market manager cannot acquire access through a market association.

Vendor reports also read native booth payments whose original invoice assignment identifies the verified vendor. These are cost transactions on the payment date and assigned market/event, without creating sales. Unverified billing relationships are not inferred. A manually recorded copy can use Already in recorded fees, preserving the record while excluding it from both spending and profit totals. The same original payment is revenue in the manager's separate business scope.

## APIs and isolation

Admin queries are `ownFinanceOptions`, `ownFinanceReport`, `ownFinanceExport`, `ownFinanceExpense`, and `ownProductionCost`. Mutations are `saveOwnFinanceExpense`, `setOwnProductionCost`, `createOwnCostedVariant`, `uploadOwnFinanceReceipt`, and `downloadOwnFinanceReceipt`. JSON results are handled through named, typed Admin-only application adapters. None is added to the Shop API.

Every request reloads active membership and channel-scoped grants through the existing `TenantAccessPolicy`. Vendor finance is owner-only. Expense writes also require owner storefront management authority. Cost writes additionally require catalog management authority. Managers require `ReadOwnMarketBilling`; writes require `ManageOwnMarketBilling`. Request inputs never select the owning business. Supplying another business's expense, receipt, product variant, or market does not confer access. Reports read inside a repeatable-read transaction. Downloads retain transactional membership checks.

## Migration and configuration

The additive backend migration is `1793400000000-FinancialReporting.ts`. It creates five private finance tables, including the audit table, and ownership/date lookup indexes. It does not alter prices, orders, stock, existing financial rows, or existing accounts. Rollback refuses to discard financial history. `financialReporting: true` enables cost snapshots in the existing commerce plugin; the normal configuration registers the report plugin.

The persistent `vendure_demo_market_ops` database is not migrated or seeded by this implementation. If the developer later requests migration for that populated environment, use only the guarded web command `npm run demo:market-operations:migrate`. Continue to start that persistent environment with its existing `demo:market-operations:*` commands. The isolated finance fixture has separate explicit commands described in [manual testing](manual-testing.md).

## UI reuse and limits

Finances reuses Card, the approved `ui-kpi-grid` presentation, Dialog, SelectField, Field, Input, Textarea, DataTable record details, Badge, Tooltip, Button, Pagination, route controls, and existing read/error lifecycles. `Finances`, `ProductionCost`, and the SVG chart adapter are feature compositions. Existing analytics charts are private controllers tied to analytics projections or loyalty points and cannot represent signed money with shared finance filters, so the finance chart is a role-neutral feature adapter. This does not approve a new primitive, design category, or chart library. Astro storefront rendering and customer authority boundaries remain intact.

There is no automatic inventory valuation, restocking cost reversal, overhead allocation, depreciation, tax accounting, FX conversion, bank reconciliation, OCR, or import of processor-only activity that lacks native verified sale allocations. Reports are bounded to 50,000 activity rows and 50,000 expenses per range and ask for a shorter range when exceeded. These limits do not silently truncate financial totals. No independent audit or production deployment is claimed.
