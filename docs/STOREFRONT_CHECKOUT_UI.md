# Vendor storefront checkout and confirmation

Implemented locally on October 23, 2026. Checkout is `/checkout`; confirmation is `/checkout/success?order=<authorized-order-id>`. Both use the existing SSR `SiteLayout`, Harvest header/footer and theme settings. No backend, schema, payment provider, notification or database changes were made.

## Presentation and reuse

`VendorCheckout.tsx` composes the shared `VendorPreorderBanner`, Button, Card, Input, Textarea and PhoneInput. Desktop uses a 62/38 form/summary layout; small screens place the shared Dropdown summary first. The summary reuses the approved disclosure card and chevron, with an optional initially-open prop that preserves existing Dropdown defaults. The summary is sticky only on sufficiently tall desktop viewports. No new UI library or general component standard was introduced.

The unconfigured-payment form presents contact information, pickup details, a modular nonfunctional Stripe placeholder, local draft notes and submission controls. It has an independent **Check my details** action and a disabled **Place order** action. Contact and notes are kept in memory, never persisted in browser storage, query strings, customer profiles or payment APIs. Refreshing/navigating away discards these drafts.

`CartTotals.tsx` extracts the Cart page's existing totals markup without changing its calculations. Both Cart and checkout drafts now consume it. Product images use the existing asset sanitizer; names, variants, quantities, discounted line amounts, discounts, surcharges, included taxes and current totals come from Vendure. No new fee or independent price calculation is introduced.

`CheckoutPickup` and `CheckoutPaymentPlaceholder` are feature compositions. The existing staged Checkout cannot supply a payment-free, all-sections draft form; it remains the controller for configured checkout. Existing market selectors cannot serve as a compact order-specific fulfillment display. The new compositions therefore reuse existing primitives rather than introducing competing cards, forms or payment controllers. `CheckoutSummary` gains an optional totals-only presentation, and the existing Checkout reports refreshed projections to its enclosing summary.

## Validation and pickup

Names are required, trimmed and limited to 100 characters each. Unicode, spaces, apostrophes and hyphens remain supported. Email is required, trimmed, limited to 254 characters and checked with native email format semantics, with custom visible feedback. Notes are optional, preserve line breaks and use the shared 5,000-character note limit. No HTML is rendered from entered notes. Programmatic length violations are checked independently of native maxlength behavior.

The existing PhoneInput/SearchSelect and libphonenumber country handling remain authoritative. Checkout requires phone information. A new opt-in blur/submit validation mode hides untouched errors while existing consumers retain their immediate validation presentation. The shared 64-character raw-input boundary rejects oversized edits without shortening them; country-aware parsing and E.164 normalization remain unchanged. Existing longer initial values are not sliced.

Errors appear on blur or attempted continuation, are associated with inputs, and submission focuses the first invalid field. Other entered values survive failures and summary refreshes. Authenticated profile details prefill the form without profile writes. The retained configured checkout continues to enforce its existing signed-in email ownership restriction. Its existing backend name/email/phone validation and order-contact persistence are preserved; draft notes are deliberately not submitted.

Market context comes from `vendorPreorder` and the populated cart's order occurrence, never a conflicting cookie preference. The shared protected picker retains nonempty-cart switching restrictions. Existing cart eligibility, product availability, quantity and market checks supply problem states. Summary refresh runs on window focus, page restoration, cart events and explicit refresh, with serialized reads and a stale-data warning on failure or changed order identity.

The compact pickup block now shows only the requested lines: Pickup Details, available market name, Date, Time (times only), venue, supplied instructions, and a venue/location link opening Google Maps in a new tab. These are market schedule times, not a newly defined pickup window. Unavailable lines and all extra explanatory pickup copy are omitted. The current projection does not expose a distinct street address, so the linked location uses the authoritative venue rather than inventing an address.

The checkout imports the same preorder-banner stylesheet used by Shop and Cart. The extra introductory tagline was removed. Contact and notes errors use shared FormError, with red status-token text and no additional margins or padding; phone errors use the same scoped red/spacing treatment. Existing validation timing and country handling remain intact. Shared Dropdown owns the summary card presentation rather than a separately styled native marker.

## Payment and confirmation boundaries

No reusable Stripe Payment Element exists in this checkout. The placeholder contains decorative inert shapes, no card fields, keys, credentials, provider packages or payment requests. Checking draft details performs only existing order/cart reads. It cannot create a checkout attempt, paid order or successful confirmation.

When backend availability reports an existing configured checkout, or an attempt already exists, the page retains the original staged Checkout inside the two-column composition. Its explicit **Test Payment** choice, no-charge notice, begin/finalize/release operations, idempotency and uncertainty handling are preserved. It is not silently replaced with the placeholder. Configured environments therefore show their existing payment workflow rather than the new payment-free draft sections. Market storefront checkout also retains the existing controller. This phase does not enable or reconfigure any payment capability.

Confirmation still reads `requestCheckout(...).status(orderId)`, whose backend uses owned-order authorization. A query-string ID alone does not authorize disclosure. Both route and React surface require backend `committed`; the surface also requires an actual order code. Pending, failed, missing and inaccessible orders do not announce success. The route distinguishes failed and uncertain payment states. Actual committed orders show the order code, reported payment status, items, quantities, totals, fulfillment facts, Continue shopping and existing account/order-access actions. Existing account-link and notification behavior remains unchanged.

Both SSR routes send `private, no-store` and `noindex, nofollow`. Editor previews skip order/cart reads and render an unavailable message rather than customer data. No editor rendering architecture or fixture order was added.

## Verification

No browser automation, screenshots, visual captures, persistent migrations, fixture writes, charges or order-state changes were performed. Existing populated accounts and `vendure_demo_market_ops` were not modified.

Focused verification covers the new checkout/confirmation UI, existing local payment flow, shared international phone behavior, cart refinement, authoritative preorder context and preview security. The new tests use in-memory projections and mocked existing APIs, not live orders. Cross-customer database enforcement remains the existing backend boundary; this phase does not claim a live backend authorization test.

Initial qualification:

- `FRONTEND_NO_EVIDENCE=true` with `npx vitest run tests/storefront-checkout-ui.test.tsx tests/local-test-checkout.test.tsx tests/cart-refinement.test.tsx tests/phone-input.test.tsx tests/vendor-preorder.test.ts tests/storefront-preview-security.test.ts`: **77 tests passed across six files**, including 17 new checkout/confirmation tests. In PowerShell, set the variable with `$env:FRONTEND_NO_EVIDENCE='true'` before the command.
- `npx tsc --noEmit`: passed.
- `npm run typecheck --workspace @market/storefront`: passed, zero errors, warnings or hints across 118 files.
- ESLint on all changed TSX, TypeScript and Astro sources/tests: passed.
- Prettier check on the changed sources, stylesheet, tests and this report: passed.
- `npm run build --workspace @market/storefront`: passed. Vite reports a nonblocking warning for chunks exceeding 500 kB; no dependency or bundling refactor was undertaken.

Refinement qualification: 73 tests passed across `storefront-checkout-ui`, `local-test-checkout`, `cart-refinement`, `phone-input`, and `ui-foundations` (five files). The updated pickup tests check the exact line order, times-only range, omitted missing fields, map-link target, and shared initially-open dropdown. Astro checks, targeted ESLint, Prettier and the storefront build also passed; the same nonblocking bundle-size warning remains. No browser automation or database operations were performed.

The first Vitest invocation also refreshed its existing default generated artifact at `docs/evidence/phase13c5/unit-results.json`; subsequent runs disable evidence output.

Local source changes: checkout routes (`index.astro`, `success.astro`); `VendorCheckout.tsx`, `Checkout.tsx`, `PurchaseSuccess.tsx`, `CheckoutPickup.tsx`, `CheckoutPaymentPlaceholder.tsx`, `CartTotals.tsx` and the totals import in `VendorCart.tsx`; shared `packages/ui/src/PhoneInput.tsx` and the optional initially-open Dropdown prop in `packages/ui/src/index.tsx`; `lib/checkout-contact.ts`; `styles/vendor-checkout.css`; `tests/storefront-checkout-ui.test.tsx`; and this report. Existing unrelated working-tree changes were retained.

## Manual review

1. From `E:\coding\farmers-market-platform-web`, run the existing scripts in separate terminals as needed: `npm run demo:market-operations:serve`, `npm run demo:market-operations:worker`, `npm run demo:market-operations:admin`, and `npm run demo:market-operations:storefront`. These select the persistent `vendure_demo_market_ops` environment. Do not run seed, reset or migrate commands for this change.
2. Open `http://homepage-vendor.localhost:4321/products`. Use the dedicated vendor `homepage.vendor@example.test` and its existing Shop fixtures. Select a currently eligible occurrence and add an available variant. Availability and fixture IDs must be checked in the current interface; none are hardcoded here.
3. Review `/cart`, then `/checkout`. Compare the shared header/footer, market banner, images, variant quantities, discounts, included taxes and current total. Resize to mobile and open/close the summary. Confirm keyboard access and focus visibility.
4. When the existing backend reports payments unconfigured, the complete draft form and Stripe placeholder appear. On a configured local-test environment the original staged flow is deliberately retained. Do not change database data or payment configuration merely to force a placeholder preview; automated tests cover the unconfigured branch.
5. In the unconfigured branch, test empty submission, Unicode names, an invalid email, the international phone selector and optional multiline notes. Check untouched fields stay clean, the first invalid field receives focus, other fields survive errors, and **Place order** stays disabled. **Check my details** validates without persisting contact or notes. Repeat while signed in to inspect profile prefilling.
6. In the retained configured branch, contact and pickup continuation use existing backend validation. Merely reviewing this UI does not require completing a local test purchase. Do not submit real payments.
7. Review an ineligible or unavailable cart using existing data if one is already available. Do not modify persistent fixtures to manufacture this state. Confirm the problem message and Review your cart link. Test summary refresh and recovery after a transient API failure using local network controls if desired.
8. Open `/checkout/success` without an order, and with an inaccessible ID: no successful confirmation or private order details should appear. If an already committed dedicated test order is available in the current authorized customer session, use its verified ID to review the confirmation layout. Do not manufacture a completed order or change its state for visual testing.

## Deferred integration

Before Stripe activation: implement the separately reviewed server authorization, Connect routing, hosted Payment Element, authoritative final totals/eligibility checks, idempotent payment operations, confirmation and webhook reconciliation. Connect draft contact and bounded notes to an approved order workflow; do not overwrite profiles. Add distinct authoritative pickup-window/address presentation when those fields exist. No migration or deployment is needed for this UI change.
