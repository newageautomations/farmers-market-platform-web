# Market date cancellation

Cancelling a future market date cancels its vendor participation and approvals and disables its offerings in the same transaction. Booth assignments and rental snapshots remain available as history and are marked cancelled using the occurrence's authoritative status.

Unissued invoices are voided. Unpaid issued invoices are cancelled with a recorded obligation adjustment. Invoices with payments enter cancellation pending and cannot collect further payment. Active card or refund reservations retain the frozen invoice row until recovery clears the reservation; the cancelled occurrence immediately blocks collection and supplies the vendor's cancelled presentation. Existing payments are preserved for the established refund workflow. Cancelling a date does not itself return money or change customer orders.

An unsubmitted prepared card collection is released by the existing payment recovery flow. An authorized intent is cancelled through that flow; an already captured payment still requires reconciliation. Invoice cancellation is finalized only after reservations and refunds have cleared. The originating manager remains recorded in the cancellation audit.

Vendor booth assignments, date details, and upcoming dates explain that the market cancelled the date. Invoice history stays readable. Payment controls and card preparation are omitted for cancelled dates, void invoices, and invoices pending cancellation. The backend independently rejects payment preparation and confirmation for cancelled dates, including old records whose invoice status is still open. Historical records require no destructive data repair or schema migration to receive this protection.

The existing vendor cancellation notification still targets vendors with participation after that participation becomes cancelled.

Dashboard urgent requests omit booth fees when either the assignment or matching market date is cancelled, even if a reserved or historical invoice still has an open balance. This also removes those invoice reminders from the dashboard's weekly tasks, which reuse the urgency list.

The UI reuses Dropdown, StatusBadge, Badge, Alert, Dialog, FarmstandButton, and the existing BoothInvoicePayment controller. No new component, style system, or approval category is introduced.

Changed web files:

- `apps/admin/src/vendor/booths.tsx`
- `apps/admin/src/vendor/BoothInvoicePayment.tsx`
- `apps/admin/src/vendor/UpcomingMarketDates.tsx`
- `apps/admin/src/vendor/MarketOccurrence.tsx`
- `apps/admin/src/vendor/MarketDetail.tsx`
- `apps/admin/src/vendor/markets-data.ts`
- `apps/admin/src/market/OccurrenceDetail.tsx`
- `packages/api/src/booth-invoice.ts`
- `packages/api/src/market-operations.ts`
- `tests/stripe-connect-phase-g.test.tsx`
- `tests/upcoming-market-dates.test.tsx`
- `apps/admin/src/vendor/dashboard-data.ts`
- `tests/vendor-dashboard.test.ts`
- `COMPONENT_USAGE_GUIDE.md`
- `docs/MARKET_DATE_CANCELLATION.md`

The broader market test run also regenerated `docs/evidence/phase13c5/unit-results.json`.

Changed sibling backend files:

- `src/plugins/farmers-market/services/market-domain.service.ts`
- `src/plugins/farmers-market/services/occurrence.service.ts`
- `src/plugins/market-operations/service.ts`
- `src/plugins/payments/invoice.service.ts`
- `src/plugins/platform-notifications/inbox-projector.ts`
- `test/payments-stripe/invoice-lifecycle.ts`

Validation commands from the web folder:

```powershell
npx vitest run tests/stripe-connect-phase-g.test.tsx tests/upcoming-market-dates.test.tsx --reporter=default
npm run test:stripe-connect:invoice-lifecycle
```

The lifecycle command uses a guarded disposable PostgreSQL database. It does not use `vendure_demo_market_ops`.

Validation passed: 30 focused vendor UI tests, 15 backend invoice lifecycle groups (including cancellation and prepared-payment recovery), backend feature type checking, formatting, and the full backend dashboard/server/worker build with `APP_ENV=dev` and `NODE_ENV=development`. The successful lifecycle database was removed by its guarded cleanup.

Broader checks remain limited by existing web TypeScript errors, four market workspace/authority tests, and pre-existing lint findings in the invoice controller and test fixtures. These were left outside this change.

Restart the affected local processes with `demo:market-operations:serve`, `demo:market-operations:worker`, and `demo:market-operations:admin`. No database migration is required.

Generated evidence referenced here is retained locally with the relevant qualification run.
