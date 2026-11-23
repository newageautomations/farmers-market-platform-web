# Vendor terms and checkout acceptance

## Implementation

- Vendor storefronts serve `/terms-and-conditions` and link it from the footer in each theme. The website editor offers Terms & Conditions in the preview page selector and uses its existing Save draft and Publish actions. The separate `terms` field has no visibility setting. A blank publication uses version 1 of the shared, server-owned default with the public storefront name substituted.
- The page uses the existing storefront shell and Policies typography. It has a small shared content renderer because the Policies page renderer also owns Policies visibility, sections, and its closing invitation. The editor reuses the existing inspector, Field and Textarea. The checkout composition reuses the shared Checkbox and groups seller-specific disclosure text and versioned links next to the final purchase action.
- Vendor and market checkout use the same acceptance control. Market checkout links each seller name directly in the checkbox sentence. Links open a new tab with the seller's exact terms revision. Checkout displays visible, complete text from each seller's enabled, published Policies, plus the pickup refund exclusion when the configured refund policy excludes a charged pickup fee. No enforced cancellation deadline or missed-pickup forfeiture rule was found in the inspected sale and refund paths. The published Policies page, editor controls, and visibility behavior are preserved.
- Vendure reconstructs the seller set from order lines and verifies the order-bound disclosure token before customer payment submission. Missing or stale acceptance can be retried from the same checkout. Resuming a payment already submitted with valid acceptance uses that accepted disclosure. The migration creates `vendor_terms_revision` and `checkout_terms_acceptance`. The latter records a database timestamp, the exact terms revisions, and snapshots of the policies shown. The checkout attempt links it to the customer order, and `order_line_link` joins each resulting vendor order to the same attempt through that vendor's lines. No new vendor-facing read or buyer information is collected.

## Local setup

Run from `E:\coding\farmers-market-platform-web` with the existing ignored local demo account configuration. The terms migration was applied to `vendure_demo_market_ops` after a read-only check found it was the only pending migration and no checkout holds were active. For another copy of the demo, resolve any in-progress checkout before applying it, since earlier attempts have no acceptance records.

```powershell
npm run demo:market-operations:migrate
$env:DEMO_VENDOR_TERMS_QA = 'true'
npm run demo:market-operations:vendor-terms-fixtures
```

The dedicated vendors, market, products and accounts are seeded in `vendure_demo_market_ops`. The fixture command reuses them and preserves published edits and previously seeded stock. The current pickup is at [the Terms QA market shop](http://terms-qa-market.localhost:4321/shop?occurrence=81). After that pickup closes, rerun the fixture command and use the dated URL it prints.

Start the standard persistent demo processes in separate terminals. Set `$env:DEMO_VENDOR_TERMS_QA = 'true'` in the server and worker terminals before starting them. This opts into no-charge checkout for the local QA run and disables provider configuration for those processes.

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The fixture vendor logins are `terms-qa-orchard@example.test` and `terms-qa-garden@example.test`. The fixture market manager is `terms-qa-manager@example.test`. All three use `Local-Terms-QA-2026!`. For the buyer, use guest checkout and enter `terms-qa-buyer@example.test` when asked for contact details.

## Manual checks

1. **Vendor purchase.** Visit `http://terms-qa-orchard.localhost:4321/products`. Add Orchard apples and go to `http://terms-qa-orchard.localhost:4321/checkout`. Enter contact details, select pickup and choose the no-charge test payment. Verify Orchard is the only seller in the terms disclosure, the checkbox is unchecked, and Place order is disabled. Open the terms link and return to the checkout tab. The link shows the Orchard publication and the order details remain in place. Check the box and submit. Expect the order confirmation.
2. **Two-seller market purchase.** Open `http://terms-qa-market.localhost:4321/shop?occurrence=81` or the newer dated URL printed by setup. Add Orchard apples and Garden carrots. Visit `http://terms-qa-market.localhost:4321/checkout`, enter contact details, and choose pickup for both sellers. Verify one checkbox with Orchard and Garden linked in the acceptance sentence, the Orchard cutoff text, and no Garden Policies text. Accept once and submit. Expect one purchase confirmation with both sellers. Repeat with only one seller in the market cart and verify that the same market checkbox wording appears once.
3. **Terms change before submission.** Reach payment and check the box on either checkout. In a separate session, sign in as the relevant vendor and open `http://localhost:4322/vendor/storefront`. Edit the live website, use the Terms & Conditions preview page, and Save draft. The ordinary public terms route should still show the prior text. Publish the change. Return to checkout. If it refreshes on focus, expect the updated disclosure and an unchecked box. If you submit before the refresh, expect a recoverable error, no purchase or charge, and the updated disclosure with the box cleared. A previously opened versioned link should still display the old wording. Review, check the box again, and submit successfully.
4. **Policies regression and default.** Compare `http://terms-qa-orchard.localhost:4321/policies` before and after publishing a Terms edit. Its content and footer link should remain available. `http://terms-qa-garden.localhost:4321/policies` should stay unavailable and its hidden rule should stay absent from checkout. On Garden, publish blank Terms text. Visit `http://terms-qa-garden.localhost:4321/terms-and-conditions` and verify all five default sections use Terms QA Garden as the seller name. Check the footer, desktop header, and mobile menu.
5. **Order evidence.** After completing a purchase, keep one versioned checkout link and publish another Terms edit. The saved link should still show the accepted wording. To verify the durable record locally, look up the confirmation code with the read-only query below. For a market order the child orders are available from `order_line_link` using the same attempt ID.

```sql
SELECT a.id AS attempt_id, e."acceptedAt", e.sellers
FROM "order" o
JOIN checkout_attempt a ON a."orderId" = o.id
JOIN checkout_terms_acceptance e ON e."attemptId" = a.id
WHERE o.code = '<confirmation-code>';
```

## Verification

- **50 focused Vitest tests passed** across vendor terms, local checkout, Stripe checkout, checkout UI and Policies. They cover footer-only placement, one checkbox in single- and two-seller market checkout, versioned links, and clearing stale acceptance before a payment call.
- **Guarded PostgreSQL publishing and payment scenarios passed** with the `--terms-only` modes in `test/farmers-market/website-library.ts` and `test/payments-stripe/phase-e.ts` in the backend. These cover the default, blank fallback, draft isolation, cross-vendor save and publish denial, preserved Policies, and successful vendor and two-vendor Stripe purchases with a simulated provider. Missing and stale submissions left payment untouched. A post-purchase edit preserved the timestamp, terms version, original text and seller-order links.
- The guarded QA fixture command completed twice and returned the same vendor storefronts and market occurrence on the second run.
- The Vendure and web admin builds and the Astro storefront typecheck passed. The workspace-wide web typecheck reports existing errors outside the terms feature, including application and table types. No browser preview, browser automation or screenshots were used. The manual checks above remain to be performed.
