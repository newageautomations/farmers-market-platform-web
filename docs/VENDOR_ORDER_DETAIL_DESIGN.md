# Individual vendor order screen

The requested `/vendor/orders/:id` design uses the existing dashboard palette and Farmstand panel, action and table presentation from Products & Inventory. The main column contains the overview, items and operational fulfillment. The sidebar contains pickup or in-person context, payment and colored status indicators with fulfillment progress. Tablet and phone layouts stack the columns. No breadcrumbs, eyebrow labels, print action or general update action are introduced.

## Reuse and behavior

- `order-detail.tsx` is a feature composition because no existing screen combines operational order portions and permission-gated in-person receipts. `OrderStatus` composes the existing Badge with the existing domain-specific status mapping.
- `FarmstandTable` adapts DataTable using an optional class slot. The catalog's table styles now live in the Farmstand stylesheet and serve both consumers; catalog geometry and its existing header treatment remain intact. Operational comparisons retain their full columns and keyboard-accessible horizontal scrolling on narrow screens.
- `order-operations.tsx` retains the existing commands, permissions, native-state eligibility, mixed-line restrictions, confirmation, operation keys, uncertain-outcome handling and refresh behavior. The compact Cancel fulfillment action uses the existing destructive-outline variant through an optional CommandForm submit variant.
- `PosOrderPayment.renderRecord` exposes its existing loaded sale and refund controls. It retains the original read, reload, refund dialogs, eligibility and provider-retry workflow. Other consumers retain their existing receipt layout. Provider/test descriptions share the existing receipt wording.
- Receipt merchandise, discount, tax, tendered cash and change use the existing exact amounts. Operational-only views do not invent prices, customer identity or financial status. Operational cancellation remains distinct from refunds. Fulfillment progress is fulfilled units divided by original ordered units, with cancelled and remaining units separately reported.
- Locally bundled icons are sourced from [Lucide](https://lucide.dev/icons), with the upstream license retained in `packages/ui/src/assets/farmstand/LUCIDE-LICENSE`. No runtime icon service or new UI package is required.

The implementation changes no backend contract or database schema. Qualification uses in-memory fixtures and blocks backend and external browser requests. The persistent test database is untouched.

## Local verification

- Six order tests cover real statuses and quantities, mixed-line restrictions, confirmed cancellation and fulfillment refresh, read-only permissions, receipt/refund integration, payment-read recovery and finance gating.
- Catalog, POS payment, Clover and Square suites passed: 68 tests. The broader vendor suite passed 39 tests and has four failures involving navigation expectations and mocked authentication outside the order-detail changes.
- `scripts/check-order-detail.mjs` verifies one page title, responsive layout, no page overflow, status/progress, confirmation and refreshed fulfillment quantities at 1600, 1280, 768 and 390 pixels. It checks in-person receipt/refund details at 1600, 768 and 390 pixels. Axe found no violations in these checked main-content views.
- Admin production build and targeted ESLint checks passed. Repository TypeScript checking still reports errors in application-review, application-phase-d, market-dashboard, phase15 and occurrence-layouts test fixtures outside this change.

Run the normal local environment with `npm run demo:market-operations:admin`. With that server on port 4322, run `node scripts/check-order-detail.mjs` for fixture-only browser verification. Run `npx vitest run tests/order-detail.test.tsx` for the focused tests. On this Windows installation, browser qualification uses `PLAYWRIGHT_BROWSERS_PATH=C:\Users\jake_\AppData\Local\ms-playwright`.
