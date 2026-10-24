# Stage A testing and disposable demonstration

## Start the local demonstration

Local PostgreSQL must already be running with the existing backend's development connection settings. No credentials or environment files are changed. From PowerShell:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:pos
```

One command starts a fresh guarded PostgreSQL fixture, the Vendure API, Astro account frontend and Vite vendor dashboard. It uses `vendure_test_pos_demo_<timestamp>_<random>` on loopback. It refuses occupied ports. It never uses `vendure` or `vendure_demo_market_ops`, resets existing data or runs their migrations. The fixture disables external delivery and payment processing. No separate worker is necessary for Stage A.

Open [central sign-in](http://auth.platform.localhost:4367/account/login), then [the vendor workspace](http://localhost:4585/vendor?channel=2&account=1). The existing account handoff may land on Overview. Choose In-Person Checkout in the sidebar. After signing in, the direct route is [the register](http://localhost:4585/vendor/pos). The startup output and ignored `.pos-demo/ready.json` record exact runtime API URLs, channel IDs and database name. API port is dynamically assigned; use the printed endpoint rather than assuming port 3000.

| Actor                                  | Fictional login                 | Password                                  |
| -------------------------------------- | ------------------------------- | ----------------------------------------- |
| Hill Country Honey                     | `identity-owner-0@test.invalid` | `local-identity-regression-only-password` |
| Green Acres Farm and Wildflower Bakery | `identity-owner-1@test.invalid` | `local-identity-regression-only-password` |

The second login owns two independent vendors. Use the existing account-mode/business selector to choose the explicitly authorized vendor. Their channel IDs are printed in the manifest, normally 3 and the generated third-vendor channel. Never infer a channel ID as authority.

| Customer scenario              | Identifier                                |
| ------------------------------ | ----------------------------------------- |
| Existing email account         | `email@pos.test.invalid`                  |
| Existing phone account         | `+1 (210) 555-0142`                       |
| Existing account with both     | `both@pos.test.invalid` or `+12105550143` |
| New customer invitation intent | `new@pos.test.invalid`                    |
| Anonymous sale                 | Leave customer association empty          |

Fixtures include Raw Honey with small/large variants (`POS-HONEY`, `POS-HONEY-LARGE`), Beeswax Candle (`POS-CANDLE`), unavailable Seasonal Honey, Vegetable Box and Sourdough Loaf. Real Collections include Honey, Home & gifts, Produce and Bakery. Only categories from the selected vendor are returned. Native stock records and canonical ownership are real; images may use the documented existing store-icon fallback. A fictional Cedar Meadow market has approved vendor relationships, confirmed participation and an applicable occurrence. Honey starts with empty, interrupted, customer-linked, guest/invitation and market-attributed saved drafts.

## Manual walkthrough

1. Start the disposable environment with the command above and wait for POS disposable demo ready.
2. Sign in as Hill Country Honey through the central sign-in page.
3. Open the vendor workspace, then In-Person Checkout in the existing navigation.
4. Choose Independent Sale and Start checkout. Confirm recognizable tiles load and the cart total remains visible.
5. Tap Beeswax Candle once. Its pending quantity appears immediately and its server amount follows.
6. Tap it repeatedly. Wait for Cart saved and verify every tap is counted.
7. Choose Honey and Home & gifts, add products, and return to All Products.
8. Search for a product name. Check the no-results state using an unmatched name.
9. Search for `POS-CANDLE`, wait for results and press Enter. It adds the exact matching SKU while retaining search focus.
10. Clear search and tap Raw Honey. Choose a jar variant in the compact shared dialog.
11. Use plus/minus. Enter a direct whole quantity and press Enter or blur. Invalid or decimal entries revert.
12. Remove a line. Seasonal Honey cannot be added while out of stock.
13. Verify subtotal, discounts where applied, tax and final total change from backend responses. Demo tax is 8.25%.
14. Use a 390 by 844 mobile viewport or a phone browser.
15. Open View Cart / Checkout. Check 44px quantity controls, scrollable contents and Escape/header-close focus restoration. Search context remains intact.
16. Choose Add Customer (Optional), enter `email@pos.test.invalid`, then Associate existing customer.
17. Remove the customer association.
18. Associate `+1 (210) 555-0142`. No OTP, email click or customer sign-in is required.
19. Remove that association and continue anonymously.
20. Save `new@pos.test.invalid` as an invitation intent, with the fictional customer's permission.
21. Confirm the UI says invitation saved for after payment. No invitation is sent and no new account is created.
22. Select the authorized Cedar Meadow occurrence in Selling context.
23. Confirm the market and occurrence date are shown. Products without that market's approval are unavailable there.
24. Switch to Independent Sale and confirm no market attribution remains.
25. Choose Saved drafts or reload the page to interrupt the cart.
26. Explicitly Resume the matching saved draft. Other cashiers' carts are never restored.
27. Review checkout and verify all lines, quantities, money, customer status and context.
28. The server refreshes prices, tax, stock and context. A two-minute quote is stored; expiration exposes Refresh quote.
29. Continue to Payment is disabled. The sale is explicitly unpaid, with no success screen, stock decrement or loyalty progress.
30. Return to cart, cancel the draft and confirm it no longer appears among open drafts.
31. Sign out, sign in as the second vendor and verify catalog/drafts differ. Backend tests also submit forged product, draft, customer and occurrence identifiers and assert rejection.
32. Tab through search, product controls and dialogs; use Enter quick-add and Escape to close dialogs. Check keyboard focus and reduced-motion settings at desktop, tablet and mobile widths. No screenshots are needed or permitted.

Ordinary vendor coupons are supported through the real existing coupon engine. The backend suite provisions `POS-SAVE` to qualify discount/tax allocation; the ordinary demo does not invent an always-available coupon or arbitrary cashier discount.

## Safe stop and reset

Press Enter or Ctrl+C in the command's terminal. The wrapper stops only its own child servers and sends the owning fixture process a graceful finish request. That process closes connections and removes only the randomized database it created. Restart `npm run demo:pos` for fresh fixtures. An interrupted or failed backend run retains its named disposable database for diagnosis; do not run a blanket database reset/drop command. No protected-database migration is required for this demonstration.

## Automated commands

From the web directory:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
$env:APP_ENV = 'test'
$env:NODE_ENV = 'test'
$env:FRONTEND_FIXTURE_MODE = 'false'
npm run test:pos:backend
npm run test:pos:browser
npx vitest run tests/in-person.test.tsx tests/vendor.test.tsx tests/loyalty.test.tsx tests/market-loyalty.test.tsx tests/local-test-checkout.test.tsx
npm run typecheck
npm run build
```

The browser command requires the same free ports as the demo and uses its own fresh database. It launches headless Chromium, performs actual central sign-in and real API commands, checks DOM behavior, keyboard focus, responsive overflow, 44px controls, accessibility and runtime errors. It never requests screenshots, videos, traces or image snapshots.

The backend suite covers scope, staff permissions, cashier isolation/revocation, search/categories/variants/favorites, stock and publication, idempotency/concurrency, exact identity/ambiguity/deletion, throttling/audit, coupons, canonical price/tax refresh, persistence, quote creation, cancellation/expiry and no paid/hold/invitation/loyalty side effects. The signup handoff success branch is an isolated test-only coordinator contract fixture, without a fake live payment API.

Existing backend regressions are run through `node --require ./test/no-evidence.cjs ./node_modules/ts-node/dist/bin.js --project <suite>/tsconfig.json <suite>/run.ts` from the backend directory with `FRONTEND_NO_EVIDENCE=true` and `DB_HOST=127.0.0.1`. Relevant suites are `test/marketplace-commerce`, `test/inventory-capacity`, `test/paid-attribution-refund`, `test/platform-identity`, `test/loyalty` and `test/market-loyalty`. All use their existing guarded disposable database mechanisms.

Exact executed results and any limitations are maintained in [the implementation summary](STAGE_A_IMPLEMENTATION_SUMMARY.md). Automated DOM/accessibility checks establish behavior and geometry; human visual acceptance is left to the manual walkthrough because screenshots are prohibited.
