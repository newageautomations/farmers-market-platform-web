# Local Stripe checkout setup correction

The persistent demo supports account onboarding and checkout collection through separate opt-ins. The local no-charge payment guard must allow the three checkout settings only when the full guarded Stripe test configuration is present. It continues to reject live keys, ordinary Stripe collection, unrelated providers, and databases other than `vendure_demo_market_ops`.

With the Stripe checkout service registered, checkout status advertises `STRIPE_TEST` before a fee quote exists. Both vendor designs reuse the shared staged checkout. After contact information and pickup selection, `useCheckout` calls the existing backend fee-quote mutation, reads the authoritative totals, and advances to review only when the fee quote is present. Quoting failures leave the customer on pickup. The manual quotation controls remain available for fee-only testing and are hidden in the Stripe flow. No new UI components or styling were introduced.

The payment backend still requires the original frozen quote and validates the vendor's test account before starting provider work. Advertising the checkout flow does not confirm payment or establish vendor account readiness.

Restart the backend and recovery worker from the web directory after changing backend settings:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
```

Keep the existing admin and storefront demo scripts running. Reload checkout, continue through contact and pickup, review the fee-inclusive total, and continue to Stripe. There is no separate manual "Prepare test fee quote" step in this flow.

Validation: 39 focused frontend tests, demo environment/network/configuration guard tests including discovery before quotation, full backend build, and storefront production build. A read-only inspection found no pending migrations in `vendure_demo_market_ops`. No reset, reseed, migration, or provider payment was performed for this correction.

Readiness follow-up: Orchard's active OAuth test connection was connected, compatible, details-submitted, and card-enabled, but had one currently due requirement. Its authoritative readiness result was `INFORMATION_REQUIRED`. The existing policy blocks collection until outstanding requirements are resolved; card capability alone does not pass that policy. Complete the requirement in the connected test account's Stripe dashboard, then use Refresh status in the Orchard vendor's Payments settings. OAuth connections do not offer the hosted-account Continue Stripe setup action.

`packages/api/src/transport.ts` now preserves the allowlisted `ACCOUNT_NOT_READY` sentinel and `packages/api/src/errors.ts` supplies a safe setup message. `StripeCheckout.tsx` displays it for pre-setup readiness rejection rather than reporting an uncertain payment. Unknown failures and failures after an existing payment status retain the reconciliation requirement. The follow-up passed 26 focused tests and the storefront build. No account readiness fields were overridden.

Market cart preparation: `MarketCart.tsx` now awaits `lib/prepare-market-checkout.ts` before navigating from Continue to checkout. The helper refreshes the current owned cart, prepares the fee quote through existing Shop operations, rebuilds only explicitly stale editable quotes, and confirms the order and fee snapshot before navigation. Existing valid quotes and pickup selections are retained. Missing pickup coverage uses the backend's unique option per vendor; ambiguous options are selected explicitly through existing shared Field/Select controls in the cart. Duplicate clicks and preparation failures do not navigate. Existing payment-state carts are not requoted. The API transport preserves the exact allowlisted `PREORDER_FEE_REQUOTE_REQUIRED` sentinel to support this recovery without exposing arbitrary backend messages. No new UI component, style, backend code, or schema change was needed.

Market Stripe operation follow-up: the backend commerce root allowlist now includes the two Stripe status/configuration queries and three start/advance/cancel mutations. The Payments plugin and both market allowlists register all five operations as mutations, matching the actual backend schema and generated frontend documents. Earlier query classification was incorrect. Native commerce, owned order, test configuration, vendor readiness, and fee checks remain in force. Guard tests assert the operation classifications. Restart the demo backend and worker after this backend change; no migration is needed.

Live browser qualification: completed market order 266, reference 3DNHEBJU3LTMHKSU, with Stripe sandbox card 4242. The confirmation page reported Succeeded and a total of $11.13 including a $1.13 fee. The test covered cart preparation, pickup coverage, fee quotation, contact, review, Stripe iframe setup, sandbox payment, and native confirmation. The temporary browser session was removed. Backend guard tests and the full backend build passed. Run scripts/check-market-checkout.cjs locally; setting COMPLETE_STRIPE_TEST_CHECKOUT=true explicitly enables its sandbox purchase step.
