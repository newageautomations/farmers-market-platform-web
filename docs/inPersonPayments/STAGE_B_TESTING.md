# Stage B testing and disposable demonstration

## Start and sign in

Local PostgreSQL must be available through the backend's existing local development connection settings. From PowerShell in the web repository:

```powershell
Set-Location E:\coding\farmers-market-platform-web
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:FRONTEND_FIXTURE_MODE = 'false'
$env:FRONTEND_NO_EVIDENCE = 'true'
npm run demo:pos
```

This creates and migrates only its own randomized `vendure_test_pos_demo_<timestamp>_<random>` database on loopback, seeds through existing real commerce services and starts API, account storefront and vendor dashboard. It does not migrate, seed or modify `vendure` or `vendure_demo_market_ops`. Existing Stage A ports are left available to an already running older demo; Stage B uses **4368 and 4586**. Do not substitute ordinary backend development commands or the persistent demo migration command.

- Sign in: [central account](http://auth.platform.localhost:4368/account/login).
- First vendor workspace: [Hill Country Honey](http://localhost:4586/vendor?channel=2&account=1).
- Register after authentication: [In-Person Checkout](http://localhost:4586/vendor/pos).
- Orders: [vendor Orders](http://localhost:4586/vendor/orders).
- Fictional vendor storefronts: `http://pos-honey.localhost:4368`, `http://pos-produce.localhost:4368`, `http://pos-bakery.localhost:4368`.

| Vendor                                 | Login                           | Password                                  |
| -------------------------------------- | ------------------------------- | ----------------------------------------- |
| Hill Country Honey                     | `identity-owner-0@test.invalid` | `local-identity-regression-only-password` |
| Green Acres Farm and Wildflower Bakery | `identity-owner-1@test.invalid` | `local-identity-regression-only-password` |

The second login owns two vendors; select the intended business in the existing account selector. The ignored `.pos-stage-b-demo/ready.json` and startup output supply the actual dynamic API endpoints/channel IDs. Channels normally include 2, 3 and 8, but IDs are references, never authority. The manifest includes seeded completed sale references for all three vendors. Those sales are created through the actual coordinator, Payment, inventory and original financial allocation paths, not arbitrary paid-order inserts.

| Scenario                   | Fictional identifier                                             |
| -------------------------- | ---------------------------------------------------------------- |
| Existing email account     | `email@pos.test.invalid`                                         |
| Existing phone account     | `+12105550142`                                                   |
| Existing account with both | `both@pos.test.invalid` or `+12105550143`                        |
| Guest invitation           | A new `.invalid` email such as `stage-b-manual@pos.test.invalid` |

Products include small/large Raw Honey, Beeswax Candle, out-of-stock Seasonal Honey, Vegetable Box and Sourdough Loaf. The fictional Cedar Meadow market has approved participation and a current occurrence. Both independent and market contexts remain available. All demonstration money stays inside this disposable environment. No external payment provider or real message recipient is contacted. Guest account invitations are captured by the test sender in memory; payment backend tests verify exactly one successful handoff. No separate worker terminal is needed: the owning demo process runs a bounded recovery sweep every 30 seconds. Ordinary installations use the registered minute scheduler task.

## Cash, customer and market walkthrough

1. Sign in, choose In-Person Checkout, select Independent Sale and Start checkout.
   Start checkout does not save an empty draft. Alternatively, tap an available product directly to start with it. Multiple variants prompt for a choice before creating the draft. Closing that choice saves nothing. Removing the last item also removes the cart from Saved drafts.
2. Add Beeswax Candle, choose a Honey variant, increase/decrease quantities and verify the official subtotal/tax/total. Products are selected through the real vendor catalog; unavailable products cannot be sold.
3. Choose Review checkout, then Continue to Payment.
4. Leave Cash selected. Enter less than the total and verify Remaining due and the disabled confirmation.
5. Enter more than the total and verify exact Change due. Alternatively choose Exact Amount.
6. Choose **Confirm Cash Received** only after the fictional cash receipt is attested. Wait for the persistent Sale completed receipt. Check order code, vendor, purchased quantities, subtotal, discount if used, tax, total, cash received, change, context and timestamp.
7. Choose View Order. Confirm the same native order appears in existing Orders, is delivered, has an in-person receipt and has refund controls for the authorized owner.
8. Open Inventory through existing vendor navigation. The product's on-hand amount has decreased by the quantity handed over; allocated stock has returned to its prior value. Reopening the receipt or checking it again must not deduct another unit.
9. Return to In-Person Checkout, start another sale and use Add Customer (Optional) to associate `email@pos.test.invalid`. Complete an exact cash sale and check Existing customer associated on the receipt/order. Repeat with `+12105550142`. No OTP or customer sign-in is requested.
10. Start a guest sale, save a fresh `.invalid` invitation email with the fictional customer's permission and complete cash payment. Only a committed sale triggers the existing purchase-link handoff. No real email leaves the demo. Repeated completion does not issue another successful invitation.
11. Start a market sale using the Cedar Meadow occurrence. Sell an approved product, then check the retained market/occurrence on its receipt and order. Start an independent sale and verify no inferred market attribution.
12. Inspect vendor loyalty and market challenges. These in-person transactions must not award points, redemption or challenge progress.

## Simulated terminal and recovery

1. Prepare a new cart and quote, then select **Simulated Terminal - Test Only**.
2. Choose success and Start simulated payment. Verify a native completed/delivered order and inventory decrement, with simulated evidence rather than cash.
3. Repeat with decline and cancel. Verify a clear terminal result, no paid order/payment and no permanent inventory decrement. A paid sale is never erased by cancelling an unpaid draft.
4. Choose timeout or interruption. The first result is uncertain. There is no success receipt or ordinary New Sale control for that unresolved payment.
5. Reload the page. Open Check payment for order and choose Check Payment Status. This reconciles the original attempt and never starts a second charge. The periodic sweep can also recover the original result.
6. Choose delayed success/failure. Wait at least three seconds and check the same payment. Observe completion or decline, respectively.
7. Choose duplicate success. Verify one order, one payment, one stock decrement and one original financial snapshot. Backend tests independently count these records.
8. The latest completed-sale control restores the last cashier-owned receipt after reload or a lost success response. Existing Orders remains the authoritative history.

## Refund walkthrough

1. Open a completed cash sale through View Order or existing Orders. The seeded native sales are also available immediately.
2. Choose Record refund. Select one original item unit and supply a reason. The displayed amount comes from the original financial unit, including its original tax/discount share.
3. The cash confirmation remains disabled until **I have returned this cash to the customer** is selected.
4. Choose Confirm Cash Returned. Check the separately recorded settled cash-out event and remaining eligible units. Inventory does not automatically increase.
5. Refund the remaining original units. Confirm the total never exceeds the original payment and already reserved/refunded units cannot be selected again.
6. Repeat full/partial refunds on a simulated sale. Use success or duplicate success event and verify a single native refund for that original operation.
7. Use simulated refund failure. Check the recorded failed operation, then use its original-operation status/retry control. Recovery reuses that provider intent and original unit reservation; it does not request another physical cash return or another refund key.
8. Backend fault-injection tests also interrupt finalization after independently recorded capture/refund evidence, then prove scheduled/manual recovery produces one native financial effect.

Refund rights use existing `RequestOwnVendorRefund` and current owner membership. POS-only staff cannot refund. Revoked actors cannot advance new payments or refunds through a cached session. Paid/uncertain records for revoked actors remain retained for reviewed reconciliation, rather than releasing inventory or bypassing current authorization.

## Responsive and keyboard inspection

Use widths 1280, 768 and 390 pixels. Check payment and refund dialogs, long product names, sections, fields, validation, processing feedback, footer actions and the mobile cart. Payment sections use 24px separation, shared action gaps are about 12.8px, touch controls are at least 44px and shared Dialog padding follows its existing responsive clamp (32px desktop, about 23px tablet, 16px mobile). There must be no unintended horizontal overflow. Use Tab, Enter and Escape; focus stays in the active native dialog and restores on permitted dismissal. Unresolved payments deliberately veto dismissal until the outcome is checked.

No screenshots, image snapshots, recordings, videos or traces are authorized or generated. Automated layout validation uses DOM rectangles/computed styles and accessibility assertions. Human visual acceptance remains manual.

## Stop and reset

Run `npm run demo:pos:stop` from another terminal in the web directory, or press Enter or Ctrl+C in the owning `npm run demo:pos` terminal. The stop command writes a database-specific local signal; only the owning supervisor handles it. The wrapper stops only its own children, requests graceful API shutdown and removes only the fresh database created by that process. Restart for a fresh fixture. It refuses occupied ports. Failed diagnostic databases may be retained by the existing harness; do not run blanket cleanup/reset commands against them or protected databases. An older Stage A demo is not stopped or migrated by Stage B.

## Automated qualification commands

From the web repository with the four environment settings above:

```powershell
npm run test:pos:payments
npm run test:pos:backend
npm run test:pos:browser
npx vitest run tests/in-person.test.tsx tests/pos-payments.test.tsx tests/vendor.test.tsx tests/loyalty.test.tsx tests/market-loyalty.test.tsx tests/local-test-checkout.test.tsx
npm run typecheck
npm run build
```

Backend regression suites run from `E:\coding\farmers-market-platform` with `DB_HOST=127.0.0.1` and `FRONTEND_NO_EVIDENCE=true`:

```powershell
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/paid-attribution-refund/tsconfig.json test/paid-attribution-refund/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/marketplace-commerce/tsconfig.json test/marketplace-commerce/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/inventory-capacity/tsconfig.json test/inventory-capacity/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/platform-identity/tsconfig.json test/platform-identity/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/loyalty/tsconfig.json test/loyalty/run.ts
node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project test/market-loyalty/tsconfig.json test/market-loyalty/run.ts
npm run build
```

Use the implementation summary for the actual executed results, limitations and latest manual-demo instance. These commands never authorize applying the Stage B migration to either protected database.
