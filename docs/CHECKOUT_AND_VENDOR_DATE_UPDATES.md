Local vendor date and checkout updates, November 11, 2026.

Payment-result follow-up: the processing modal now retains failed, incomplete and uncertain payment outcomes instead of hiding their explanation. Committed checkouts also redirect from the parent controller. Read-only inspection of local order 281 confirmed PaymentSettled, payment group PLACED and a USD 26.59 vendor allocation. `apps/admin/src/vendor/order-financials.ts` joins vendor-scoped finance transactions by operational order ID; `service.ts` supplies that finance-gated payment and refund context to both list and detail views without depending on CRM relationships. Checkout changes are in `StripeCheckout.tsx` and `lib/use-checkout.ts`. No payment records were changed, Stripe was not contacted, and no tests were run for this follow-up.

Cart recovery follow-up: progress labels are no longer clickable; stages use one Back button and retain their existing primary action. Vendor carts automatically read and recover abandoned card setup on mount, focus and subsequent product additions, using `lib/recover-editable-cart.ts` and the existing recovery controller. Failed reads retry automatically. Manual cart refresh controls and refresh instructions have been removed. Payments already being authorized are not automatically canceled. No tests were run for this follow-up, as requested.

Confirmation layout follow-up: the product/company panel starts alongside the thank-you heading on desktop. Customer name, email and phone now appear in Contact details above Pickup details, and are omitted from the product panel. Mobile keeps the sections in a single readable column. The browser check verifies the panel's top alignment and 0px contact label/value center offsets.

Upcoming Dates keeps the booth number, adds paid/unpaid invoice status and opens the existing invoice payment dialog. Dates with confirmed or cancelled attendance no longer offer response buttons, including after reload. Invoice 21 was verified as Manna Roots, booth A01, an untouched $45 dashboard demo invoice with no payments, Stripe collections, adjustments or refunds. Only that invoice and its optional recipient record were removed from `vendure_demo_market_ops`; its booth assignment and other data remain. The removal helper subsequently confirmed it was absent.

Checkout keeps its stage label in the navigation and provides accessible, visually hidden focus headings. Phone countries put the United States first, avoid opening on autofill focus and dismiss on outside interaction without changing the phone. Pickup shows the saved market date and venue/address, with centered radio labels. Zero fees and zero tax rows are omitted and the customer-facing fee label is Preorder fee. Card entry has a clear label and padding, authorization is attached to the purchase action, and the existing animated Dialog and Spinner announce processing. The redundant cart-state warning is suppressed for a frozen checkout, while actual payment failures and uncertain outcomes remain visible. Earlier stages retain contact and pickup details. Returning from card setup or canceling a payment rebuilds the cart through existing Shop APIs only after confirmed cancellation. An encrypted recovery cookie supports interrupted restores without duplicating quantities. Inventory, pricing and payment authority remain on the backend.

Confirmation includes product images, readable totals, pickup details and a free-account invitation. Its link opens the existing password signup with encrypted, expiring checkout contact prefill. Existing phone verification remains required. Prefill grants no account or order authority. Magic-link APIs remain available outside this confirmation flow.

Files changed for this request:

- Vendor panel: `apps/admin/src/vendor/UpcomingMarketDates.tsx`, `markets-data.ts`, `market-dates.css`, `BoothInvoicePayment.tsx`.
- Checkout and confirmation: `apps/storefront/src/components/Checkout.tsx`, `StripeCheckout.tsx`, `VendorCheckout.tsx`, `CartTotals.tsx`, `CheckoutPickup.tsx`, `PurchaseSuccess.tsx`, `modern-farmhouse/Checkout.tsx`, `modern-farmhouse/Success.tsx`.
- Checkout state and private drafts: `apps/storefront/src/lib/use-checkout.ts`, `restart-checkout.ts`, `private-checkout-data.ts`, `account.ts`.
- Routes: `apps/storefront/src/pages/api/shop.ts`, `pages/account/signup.astro`, `pages/checkout/success.astro`.
- Styles: `apps/storefront/src/styles/checkout.css`, `vendor-checkout.css`, `farmhouse-v2.css`.
- Shared controls: `packages/ui/src/PhoneInput.tsx`, `SearchSelect.tsx`.
- Shop contract: `packages/api/operations/checkout.graphql`, `packages/api/src/checkout.ts`, `storefront.ts`, regenerated `generated/shop.ts`.
- Tests: `tests/checkout-recovery.test.ts`, `phone-input.test.tsx`, `upcoming-market-dates.test.tsx`, `stripe-connect-phase-e.test.tsx`, `storefront-checkout-ui.test.tsx`, `fixtures/checkout-preview.tsx`.
- Tooling and documentation: `scripts/check-checkout-presentation.ts`, `scripts/remove-manna-invoice-21.mjs`, `COMPONENT_USAGE_GUIDE.md`, this note and the browser screenshots in `docs/evidence/checkout-vendor-dates`.

Validation: local storefront/admin build passed; Astro checked 234 files with zero errors, warnings or hints. Seven focused suites passed all 64 tests; shared UI foundations passed another 12 tests. The isolated browser fixture passed at 1280px and 390px, checking preserved contact data, centered pickup radios, 0px label/value center offsets, hidden zero pickup fees, product images, card padding, absence of the authorization checkbox, the processing dialog and mobile overflow. Requests outside the local fixture are blocked and payment responses are simulated. No live provider payment was made.

The full repository TypeScript check remains blocked by errors in unrelated loyalty, table-navigation and existing test files. A broader farmhouse suite also has two unrelated existing failures in homepage/editor expectations. Focused lint has zero errors and three existing Stripe effect dependency warnings. The pre-existing booth invoice controller also has two effect-state lint errors. No backend migration or deployment is required.

Useful local commands:

```powershell
npm run build
npm run typecheck --workspace @market/storefront
npx vitest run tests/checkout-recovery.test.ts tests/phone-input.test.tsx tests/upcoming-market-dates.test.tsx tests/stripe-connect-phase-e.test.tsx tests/storefront-checkout-ui.test.tsx tests/local-test-checkout.test.tsx tests/invoice-adjustments-refunds.test.tsx tests/ui-foundations.test.tsx
npx tsx scripts/check-checkout-presentation.ts
```

For manual testing, use the existing persistent demo environment. Start these in separate terminals only if the corresponding service is not already running:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Generated evidence referenced here is retained locally with the relevant qualification run.
