# Expense history and order refund details

Implemented locally on October 21, 2026. These are presentation changes and additive reads. No migrations, fixture regeneration, persistent database writes, payment/refund engine changes, deployments, or remote operations were performed.

## Changes

Expense details now reuse the shared DDN-03 `Dropdown`. The activity list is chronological, oldest first, with account-local timestamps and readable Created, Increased, Reduced, Voided, Updated details, and Changed category labels. Amount edits show the signed difference, not the new balance. A void shows the negative previous balance, even though the stored voided expense retains its original amount. Simultaneous amount/category changes remain one entry. Native audit bigint strings are supported. Missing or invalid historical values receive a neutral description without a guessed adjustment. Raw JSON, audit IDs, internal action codes and versions are not rendered, and the current expense is never replaced with historical values.

The existing in-person payment composition within vendor Orders now has **Refund Details** whenever refund records exist. **Record Refund** appears only with current vendor authority, backend eligibility, positive unreserved original units, and remaining completed payment value. A fully returned payment hides Record Refund even if a stale status badge says otherwise. Existing retry/status actions remain available under their existing permissions.

The new dialog composition reuses shared `Dialog`, existing receipt-product rows, monetary definition lists and payment-section spacing. It shows original net merchandise, original discounts where present, original tax/payment, individual returned products/quantities, completion dates, merchandise/tax/shipping components where recorded, completed-refund totals, remaining payment and readable status. Pending, failed, canceled and review states remain separate and are excluded from completed totals. The dialog contains no provider references, allocation IDs, raw enums or JSON. Shared dialog focus, dismissal and nested-dialog behavior remain authoritative; no shared primitive or design standard was changed.

## Additive backend/API reads

The existing POS sale JSON response adds `canRecordRefund`, the account's saved `timezone`, and nullable per-refund `details`. Details read settled immutable refund allocations, successful provider-result timestamps and the original POS product names. The projection checks that saved components reconcile exactly to the refund operation amount; incomplete legacy breakdowns remain unavailable rather than being rebuilt from current prices or taxes. Read queries remain scoped to the selected vendor, channel and original purchase. Eligibility reflects the existing purchase refund policy, current refund permission, remaining original units and configured provider capability; the mutation still performs all authoritative checks.

Changed web files: `apps/admin/src/finance/Finances.tsx`, `expense-history.ts`, `finance.css`, `apps/admin/src/vendor/pos-payments.tsx`, `packages/api/src/in-person.ts`, and the three focused test files. The existing Vitest reporter also refreshes `docs/evidence/phase13c5/unit-results.json`.

Changed backend files: `src/plugins/marketplace-commerce/in-person/payment-coordinator.ts`, new `refund-details.ts`, and `test/in-person/refund-details.ts`.

## Verification

- 52 frontend tests passed across `tests/expense-history.test.ts`, `tests/finance.test.tsx`, and `tests/pos-payments.test.tsx`.
- The focused native refund read-model test passed in a guarded disposable database. It covers full/partial/multiple refunds, original merchandise/tax/product evidence after current price/tax changes, completion timestamps, failed requests, current eligibility, read-only roles and cross-vendor isolation. Its successful database was removed through the existing test guard.
- Frontend TypeScript and targeted ESLint passed. Backend TypeScript and the required dashboard/server/worker build passed with `APP_ENV=dev` and `NODE_ENV=development`. Targeted formatting checks cover the new presentation/read-model modules and changed frontend files.
- The existing pg concurrent-query deprecation warning was observed without unrelated investigation. No browser automation, screenshots, visual comparisons or broad regression suites were run.

To repeat focused checks from the web root:

```powershell
node node_modules/vitest/vitest.mjs run tests/expense-history.test.ts tests/finance.test.tsx tests/pos-payments.test.tsx
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js apps/admin/src/finance/Finances.tsx apps/admin/src/finance/expense-history.ts apps/admin/src/vendor/pos-payments.tsx packages/api/src/in-person.ts tests/expense-history.test.ts tests/finance.test.tsx tests/pos-payments.test.tsx
```

From the backend root:

```powershell
node node_modules/ts-node/dist/bin.js --project test/in-person/tsconfig.json test/in-person/refund-details.ts
```

## Manual testing with existing data

1. From `E:\coding\farmers-market-platform-web`, run the existing `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin`, and `demo:market-operations:storefront` npm scripts in separate terminals. Restart the backend to load the additive read model. No migration or seed command is required.
2. Sign in at `http://localhost:4322` using `refund.accounting@example.test` / `local-identity-regression-only-password`. Select **FMP Refund & Accounting Test Vendor**. The existing manually approved phone remains unchanged.
3. Open `/vendor/finances/expenses` and select October 21, 2026 if necessary. Open **Equipment repair** and expand **Expense history**: Created $100.00, then Reduced -$20.00, oldest first; current Amount remains $80.00. There is no Recorded change JSON disclosure.
4. In the same expense log, open **Canceled stall supplies**, which retains its existing Voided status. Its history should show Created $30.00 and Voided -$30.00. The saved original amount is retained by the native expense record, while the void excludes it from expense-report totals. No JSON or technical event details are displayed.
5. Open `/vendor/orders/63`, or use Orders' existing lookup for 63. **Refund Details** is visible; **Record Refund** is absent. Open the dialog: Gift Basket × 1, merchandise $20.00, tax $1.65, total $21.65, fully refunded, remaining $0.00.
6. Open order 64: Refund Details and Record Refund are visible when current permissions/policy permit another return. The original purchase is $25.00 merchandise + $0.66 tax = $25.66; the Jam refund is $8.00 + $0.66 = $8.66, leaving $17.00.
7. Open order 65: two separate completed Jam × 1 events, each $8.00 merchandise + $0.66 tax = $8.66. Summary refunded is $17.32; remaining is $8.66. Both actions remain available if the final original unit remains refundable.
8. Open order 67: Refund Details is hidden while no refund records exist. Existing permitted Record Refund remains available. Do not actually record another return merely to test presentation.
9. Close a refund dialog using its header close control or Escape and confirm focus returns to Refund Details. Inspect mobile widths manually for wrapping and spacing. Read-only users can inspect authorized history but do not gain the recording action. Do not change Manna Roots or market-manager identities.

## Limits

No requested change within the existing POS order-refund surface was deferred. The interface does not introduce a new online-order refund workflow, alter provider restrictions, unlock reserved units, change permissions, or reconstruct missing legacy financial evidence. Old records with no sufficient item/tax allocation show the actual recorded total and an unavailable-breakdown explanation. Manual visual acceptance remains with the developer.
