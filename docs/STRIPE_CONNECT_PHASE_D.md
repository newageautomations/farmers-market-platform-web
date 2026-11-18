# Stripe Connect Phase D

Local manual-test repairs on November 9, 2026:

Disconnect follow-up: the Payments settings controller now hides a `DEAUTHORIZED` mapping's account reference, verification and readiness details and shows Not connected with both connection actions. A successful disconnect clears stale Stripe return parameters while preserving unrelated URL parameters. The backend `src/plugins/payments/onboarding.service.ts` no longer reactivates a disconnected hosted account when Set up Stripe is chosen; it creates a new account generation using a fresh creation identity. Historical mappings remain disconnected for financial records. Regression coverage in the frontend Phase C tests and backend `test/payments-stripe/phase-c.ts` checks disconnect, reload, new hosted setup, repeated setup on that replacement, and switching to a different OAuth account. No new component or styling standard was introduced.

- The local test payment composition installed a second socket guard without the demo runner's explicit Stripe test exception. That blocked both account creation and OAuth exchange. `src/vendure-config.ts` in the backend now retains the already validated test-onboarding exception. Checkout collection stays disabled.
- Consumed uncertain OAuth attempts return `OAUTH_RECONCILIATION_REQUIRED` instead of a generic replay error. The shared Payments controller clears terminal OAuth return parameters and offers safe recovery text. The API transport recognizes the fixed Stripe sentinels under Vendure's `USER_INPUT_ERROR` as well as `BAD_USER_INPUT`, without exposing arbitrary backend messages.
- The dedicated Phase D shipping calculators used the unsupported `includesTax=false` value. The fixture creates `exclude` and repairs only the original zero-rate synthetic calculators on rerun. The guarded fixture command was run against `vendure_demo_market_ops`; existing identities, credentials, products, stock operations, dates, Stripe attempt history and fee preferences were preserved.
- `TestPreorderFeeQuote` reuses the existing Field, Select and Button primitives to require authoritative vendor pickup choices before quotation when the cart has no pickup. The staged checkout keeps the quote control at Review, shares updated totals with its parent, and does not reload contact entry or show duplicate quote controls. No new UI primitive or styling standard was introduced.

Local web files changed for this repair: `apps/admin/src/management/payments.tsx`, `apps/storefront/src/components/TestPreorderFeeQuote.tsx`, `Checkout.tsx`, `VendorCheckout.tsx`, `modern-farmhouse/Checkout.tsx`, `apps/storefront/src/lib/use-checkout.ts`, `packages/api/src/errors.ts`, `packages/api/src/transport.ts`, and the Phase C/D frontend tests. Backend files: `src/vendure-config.ts`, `src/plugins/payments/account.service.ts`, `scripts/market-operations-demo/preorder-fee-fixtures.ts`, `guards.test.ts`, and `test/payments-stripe/phase-c.ts` / `phase-d.ts`.

Verification: the backend build passed with `APP_ENV=dev` and `NODE_ENV=development`; the real config/runner network-guard regression passed; all 14 Phase C verification groups and all 7 Phase D database groups passed in guarded disposable databases. Focused frontend settings/checkout suites passed, including OAuth recovery, both error-code envelopes and pickup-before-quote ordering. The scoped web typecheck still reports the pre-existing possibly-undefined `target` in `packages/ui/src/table-navigation.ts:29`.

The local API and worker were restarted through the required web scripts with local fee quotes enabled. Through the normal authenticated API, Orchard's original hosted test creation was resumed with its saved idempotency key, attached, and returned a valid Stripe onboarding link. Its business details remain incomplete: open the clean `/vendor/settings/payments` page and choose Continue Stripe setup. The old OAuth code remains consumed and was not replayed or reset.

A separate anonymous local storefront cart successfully selected Orchard pickup and quoted one $5.00 carrot item at $5.72 total, including $0.72 in preorder fees. The diagnostic quote was then cleared. No order was placed, inventory held, or payment collected. No database reset, migration, deployment or remote Git action was performed.

To repeat the checks locally, run `npm run demo:market-operations:test`, `npm run test:stripe-connect:accounts`, and `npm run test:stripe-connect:fees` in the backend; run `npx vitest run tests/stripe-connect-phase-c.test.tsx tests/stripe-connect-phase-d.test.tsx tests/management.test.tsx tests/storefront-checkout-ui.test.tsx tests/local-test-checkout.test.tsx --reporter=default` in the web project. The already repaired persistent fixtures do not need to be rerun.

Implemented locally on November 9, 2026. Backend changes in `E:\coding\farmers-market-platform` were explicitly authorized in this chat. Previous Stripe reports were not edited. No Stripe requests, charges, captures, refunds, deployment, persistent database migration, or persistent fixture setup were performed.

## Implementation summary

Vendor Payments settings now support Automatic processing recovery and a custom fixed USD amount, including zero. The platform percentage is centrally fixed at 5% of discounted merchandise excluding tax, shipping, and other fees. Automatic is the default when no configuration exists.

The backend calculates exact integer fees, freezes versioned vendor quotes, adds real Vendure surcharges in an explicitly opted-in local quotation environment, reconciles vendor obligations, and records separate platform and processing recovery shares on original purchased units. The existing local simulator qualifies the complete payment-group and financial-snapshot chain in disposable databases. It does not execute Stripe payments.

Fee taxation and collection remain unapproved. Normal checkout does not silently acquire fees. Native fee quotation requires `DEMO_PREORDER_FEE_QUOTES=true` together with the existing local account checkout configuration. A fee-bearing quote cannot use the ordinary public local payment path. Real Stripe routes remain rejected by the payment-group foundation. No Phase E payment integration was started.

## Backend changes

Paths below are relative to `E:\coding\farmers-market-platform`.

- `src/plugins/marketplace-commerce/financial/preorder-fees.ts`: policy constants, decimal validation, rational gross-up, and deterministic component allocation using the existing MoneyAllocator.
- `financial/preorder-fee.entities.ts`, `financial/preorder-fee.service.ts`, and `financial/preorder-fee.api.ts` in that same plugin: organization configuration history, native test quotations, immutable quote records, server authorization, and Admin/Shop operations.
- `financial/preorder-fee-refunds.service.ts`: internal component reservation and remaining/refunded/reserved projections. There is no public fee-only refund mutation or provider executor.
- `commerce/payment-group.entities.ts` and `payment-group.service.ts`: original quote identity and component snapshot on each vendor obligation; native totals include each vendor's own fees.
- `financial/financial-attribution.service.ts` and `financial-audit.service.ts`: purchase observations, existing PlatformChargeAllocation records, original-unit fee mappings, and independent component reconciliation.
- `commerce/checkout-coordinator.ts`, `commerce/order-context.service.ts`, and `commerce/contracts.ts`: ordinary public collection gate, explicit native surcharge policy, quote fingerprint coverage, and market Shop root registration.
- `customer-account/api.ts` and `customer-account/service.ts`: authoritative combined/vendor fee projection and test quotation availability. Fee-bearing orders advertise no available payment method.
- `marketplace-commerce.plugin.ts`, `types.ts`, and `src/vendure-config.ts`: registration and explicit development/test quotation gate.
- `src/migrations/1796600000000-PreorderFees.ts`: additive persistence and financial-history guards.
- `scripts/market-operations-demo/preorder-fee-fixtures.ts`, `environment.ts`, `run.ts`, and `package.json`: dedicated safe fixture command and allowlisted local quote opt-in.
- `test/payments-stripe/phase-d.ts`, its tsconfig, and `test/paid-attribution-refund/fixture.ts`: focused qualification and current additive migration coverage.

## Frontend changes and reuse

Paths here are relative to `E:\coding\farmers-market-platform-web`.

- `apps/admin/src/settings/PreorderFeeSettings.tsx` and `SettingsWorkspace.tsx`: one feature composition inside the existing vendor Payments settings panel. It reuses SettingsPanel, CommandForm, ReadState, Field, Radio, PriceInput, and existing save/error feedback. Restricted readers have disabled controls and no save action. No new primitive, settings shell, UI library, or design standard was introduced.
- `apps/admin/src/vendor/service.ts` and `fixture.ts`: typed API integration, existing authority-failure handling, and offline fixture compatibility.
- `packages/api/operations/preorder-fees.graphql`, `operations/checkout.graphql`, `src/vendor.ts`, `src/checkout.ts`, `src/storefront.ts`, and `src/errors.ts`: named operations, types, safe validation messages, and allowed storefront actions.
- `codegen.ts`, `scripts/extract-schema.ts`, schema/provenance files, and generated Admin/Shop documents: source-extracted contracts without backend bootstrap or database access.
- `apps/storefront/src/components/Checkout.tsx`, `VendorCheckout.tsx`, and `modern-farmhouse/Checkout.tsx`: native final totals and combined/vendor fee display in the existing checkout compositions.
- `CartTotals.tsx`: combines native surcharges named Preorder fee into one customer summary row while retaining the authoritative native total. Existing other surcharge behavior is retained.
- `TestPreorderFeeQuote.tsx` and `pages/api/shop.ts`: explicit local test quote/clear actions through the existing same-origin Shop proxy. This small feature controller is shared by checkout presentations because no existing controller owns the new quote workflow. It reuses Button and introduces no control primitive.
- Checkout/farmhouse CSS: component-owned `dd` centering and row alignment, as required by the project guide. No browser or visual automation was run.
- Web demo wrapper/package scripts, typed checkout fixtures, and `tests/stripe-connect-phase-d.test.tsx`: local setup and focused UI coverage. The existing test reporter also updates `docs/evidence/phase13c5/unit-results.json`.

The root component usage guide and approved registry were read. Existing specialist price entry, native form behavior, server authority, and dashboard shell are retained. The new settings controller is needed for version-aware fee configuration; an existing generic primitive cannot own that business behavior.

## Settings and persistence

`vendor_preorder_fee_configuration` is an append-only configuration history with a unique vendor/version pair. It stores vendor ID, mode, custom integer cents, USD currency, version, actor, and creation/update timestamps. The highest version is the single effective preference. An absent record means Automatic with effective version zero.

Saves serialize by vendor, reload current business authority inside the transaction, check the submitted expected version, and append the next version. Stale saves fail. Switching to Automatic stores a zero custom amount. Input is a decimal string, converted without floating-point money arithmetic. Negative values, exponent notation, nonfinite inputs, more than two decimals, unsupported currency/mode, and values over 10,000 cents are rejected. The $100 bound is an operational validation limit, not an asserted legal maximum.

A saved change affects a newly generated quote. Calling freeze again for unchanged merchandise/tax/shipping retains the original quote and configuration version. Clear test fee quote appends a clearing marker after removing native test surcharges; it preserves all earlier quote rows. Preparing again then uses current settings. Cart changes invalidate an old quote; collection fails until it is replaced.

## Formula and rounding

Money is in integer minor units. Let M be discounted merchandise excluding item tax, and B be discounted merchandise plus item tax and vendor-owned shipping/pickup including its tax. For nonnegative amounts:

```text
P = round_half_up(M × 5 / 100)
E_auto = ceil((n × (B + P) + c × d) / (d - n))
E_custom = configured fixed cents
Preorder fee = P + E
T = B + P + E
```

The local US/USD standard domestic online card estimate is versioned as `us-domestic-online-standard-estimate-v1`, with `n=29`, `d=1000`, and `c=30` cents. It is an illustrative platform-controlled pricing assumption, not a promise of actual Stripe costs or a claim about custom account pricing. Unsupported assumptions are rejected. No live pricing is fetched.

The automatic formula gives the smallest integer E satisfying `E >= ceil(n × (B + P + E) / d + c)`. It includes processing on both P and E. Each vendor is calculated separately, including the fixed 30-cent assumption. Custom recovery is never grossed up. The platform application fee for future provider work is exactly P, never P+E.

| Discounted merchandise | Other payable amounts | Mode | P | E | Preorder fee | Final total |
| --- | --- | --- | --- | --- | --- | --- |
| $100.00 | $0.00 | Automatic | $5.00 | $3.45 | $8.45 | $108.45 |
| $100.00 | $0.00 | Custom $0.00 | $5.00 | $0.00 | $5.00 | $105.00 |
| $100.00 | $0.00 | Custom $1.50 | $5.00 | $1.50 | $6.50 | $106.50 |

There is no approved fee-tax implementation. Calculations for actual native test quotes require `EXPLICIT_NO_FEE_TAX_TEST`; unapproved tax policies fail. The settings example explicitly excludes tax and pickup. Arbitrary zero fee taxation is not adopted as production policy. A taxed-fee solver is deferred until an approved tax engine, ownership, and rounding policy exist.

## Immutable snapshots and allocation

`preorder_fee_quote` stores original order, workspace, principal, monetary-basis fingerprint, currency, native total, and per-vendor snapshots. Each vendor snapshot freezes B, M, P, E, fee tax, total, mode, effective configuration version, processing assumptions, tax gate, platform/refund policy, and rounding versions. It also stores original customer line IDs with original unit ordinals and stable allocation keys.

Fees are genuine native Vendure Surcharge rows. Quotes reject unrelated surcharge models, unsupported inclusive/adjusted shipping, unsupported promotion models, and mismatched native totals. There are no artificial Vendure Payments representing fees.

Payment-group coverage sums exactly to the native quote. Each VendorPaymentObligation references the original quote and copies its original vendor snapshot. Quote, obligation amount, group order/channel/principal, and component identity are guarded. Existing group reservation/finalization deadlines remain authoritative.

At simulated purchase placement, PurchaseFinancialSnapshot retains the original fee quote ID; VendorFinancialAllocation observations retain the original vendor fee snapshot. Existing vendor/line/unit `paid` components retain their merchandise, tax, and shipping meaning. The existing PlatformChargeAllocation separately represents each combined customer fee; its observations retain distinct P/E/tax components. Its historical class name does not mean all customer surcharge revenue is platform application-fee revenue.

`preorder_fee_unit_allocation` links each original UnitFinancialAllocation, LineFinancialAllocation, VendorFinancialAllocation, purchase, original quote, and native surcharge allocation. P, E, and fee tax remain separate columns. Each component uses deterministic largest remainder weighted by each original unit's discounted merchandise, using the same gross/discount unit splitting as attribution. Equal weights are used only when all merchandise weights are zero. Full component sums reconcile exactly. Immutable triggers prevent history edits; deferred purchase guards require complete unit coverage and exact component totals before commit.

Existing historical purchases receive no synthetic fees or historical setting backfill. Existing schema-one native payments remain supported. Existing schema-two payment provenance guards are extended to include frozen fee components without redefining merchandise paid shares.

## Authorization and refund preparation

All settings operations derive vendor identity from current native business authority and the active channel. No operation accepts a target vendor ID. Reads require ReadOwnPaymentAccount. Writes require the current protected owner, or a business administrator with both ManageOwnCatalog and ReadOwnVendorFinance. Ordinary leads/staff do not acquire financial settings rights. A market organization fails the vendor-kind check even when its owner has payment-account management rights. Existing grants are not rewritten.

`PreorderFeeRefundsService` is an internal original-unit component foundation. It requires the original vendor allocation, current vendor refund grant, matching seller channel, and selected original unit IDs. It reports each component's original, refunded, reserved, and remaining cents. Reservations serialize on the operation identity and purchase, are idempotent for the same actor/selection, and reject overlapping or foreign reservations. Database guards prohibit over-reservation and terminal state reversal.

P and E default to fully refundable original shares; a partial item refund selects those units' original shares rather than recalculating current percentages. Full selected-unit coverage returns the entire P/E. There is no approved E-retention policy. No public arbitrary PlatformChargeAllocation refund permission was added. Existing direct-charge refund execution remains gated. The foundation does not mark a Stripe refund as executed; tests of reservation transitions use local records only. A later engine must reconcile customer refunds and application-fee refunds separately and authorize legally required escalation.

## Automated verification

Run from the web folder:

```powershell
npm run test:stripe-connect:fees
npx vitest run tests/stripe-connect-phase-d.test.tsx tests/local-test-checkout.test.tsx tests/storefront-checkout-ui.test.tsx
npm run typecheck:stripe-connect:fees
```

The backend command uses the guarded disposable database mechanism and cannot select `vendure_demo_market_ops`. Qualification covers exact arithmetic and minimum gross-up across thousands of bases, default/zero/custom input validation, half-up percentage rounding, independent fixed charges, zero-weight allocation, tax/shipping base boundaries, actual odd-cent vendor coupon behavior, mixed configurations, native aggregate totals, immutable settings/quotes, frozen obligations, original purchased-unit shares, component reservations, cross-vendor/workspace/market isolation, fixture repeatability, and historical ordinary local checkout.

The focused UI command verifies settings saves and previews, restricted read-only presentation, automatic preview after a saved custom setting, native cart fee combination, both checkout summaries, and existing local checkout behavior. Final results: 7 backend database verification groups plus the arithmetic checks passed; all 28 focused frontend tests passed. The final disposable database was dropped successfully.

Backend `npm run build` passes with explicit `APP_ENV=dev` and `NODE_ENV=development`. The initial invocation without APP_ENV was rejected by the existing environment guard. Backend TypeScript checking also passed.

The scoped `npm run typecheck:stripe-connect:fees` reports the existing `packages/ui/src/table-navigation.ts:29` possibly-undefined target error. The broader diagnostic `npx tsc --noEmit --pretty false` also reports existing unrelated errors in LoyaltyDashboard, shared table-navigation, application/review fixtures, market-dashboard tests, occurrence-layout tests, phase15 tests, and vendor-application-detail tests. These were not repaired. No Phase D source error remained in the final diagnostic review. No broad regression suite, browser automation, screenshots, or visual sweeps were run. Loyalty earning/redemption suites were not rerun; existing supported promotion validation, quote fingerprints, allocation components, inventory, and loyalty hooks remain in place.

Failed disposable setup attempts were retained by the existing harness; successful disposable databases are dropped. No persistent test data was used by these tests.

## Migration and safe manual setup

No following command was executed against the persistent database during implementation. After separate authorization to migrate, run in the web folder:

```powershell
Set-Location E:\coding\farmers-market-platform-web
npm run demo:market-operations:inspect
# Verify actual local vendure_demo_market_ops and review every pending migration.
npm run demo:market-operations:migrate
```

The additive migration is `PreorderFees1796600000000`. It creates four tables, adds nullable fee quote/snapshot columns to vendor obligations, and extends financial identity/coverage guards. It does not reset, reseed, replace organizations, or invent historical fees. Its down method refuses to discard financial history. Targeted quote, purchase, vendor/line, surcharge, and reservation indexes support the allocation joins and component-balance reads. The guarded command can apply other pending migrations, so review the complete list first.

Keep the existing ignored local account bridge configuration used by the demo. The wrapper requires `PLATFORM_ACCOUNT_ORIGIN=http://auth.platform.localhost:4321`, `ADMIN_ORIGIN=http://localhost:4322`, and the same existing server-only bridge key of at least 32 characters across backend/storefront. No Stripe credentials or provider onboarding opt-in is needed for fee testing.

After the separately authorized migration, explicitly run the dedicated setup command:

```powershell
npm run demo:market-operations:preorder-fee-fixtures
```

It verifies the configured and actual loopback database, requires platform authority, and creates/reuses only `stripe-fee-d-*` organizations and identities. It prints site URLs, product IDs, occurrence IDs, fee settings, and credentials. Repeat execution preserves saved vendor fee preferences, existing products, stock-operation identities, accounts, and established organizations. The Orchard vendor starts with no saved preference; Garden starts with Custom $1.50. The fixture includes realistic produce, vendor-owned pickup, stock, listings, and upcoming market dates. The deliberately unapproved herb listing is not used for checkout tests.

| Identity | Role |
| --- | --- |
| `stripe-fee-d-orchard@example.test` | Dedicated vendor owner, initially Automatic |
| `stripe-fee-d-garden@example.test` | Other dedicated vendor owner, initially Custom $1.50 |
| `stripe-fee-d-manager@example.test` | Dedicated market manager |
| `stripe-fee-d-staff@example.test` | Restricted Orchard staff |

The dedicated fixture password is `Local-Fee-D-2026!`. Existing account passwords are not reset by rerunning setup. The fixture prints actual localhost site/occurrence URLs; the predictable storefront hosts are `stripe-fee-d-orchard.localhost:4321`, `stripe-fee-d-garden.localhost:4321`, and `stripe-fee-d-market.localhost:4321`.

Start the existing environment using only the web scripts, in separate terminals. Opt in to fee quotation in the backend terminal:

```powershell
$env:DEMO_PREORDER_FEE_QUOTES='true'
$env:LOCAL_TEST_PAYMENTS_ENABLED='true'
npm run demo:market-operations:serve
```

```powershell
npm run demo:market-operations:worker
```

```powershell
npm run demo:market-operations:admin
```

```powershell
npm run demo:market-operations:storefront
```

Do not use ordinary backend dev commands, reset, seed, or a destructive acceptance harness against the populated database. Removing the quote opt-in returns new ordinary checkouts to their existing fee-free behavior. Clear a test quote before removing the opt-in if you want to resume ordinary checkout on that same cart.

## Detailed manual tests

1. Sign in to the admin app at `http://localhost:4322` as the dedicated Orchard owner. Select its vendor workspace and open Settings > Payments. Verify Automatic is selected, the platform fee is noneditable at 5%, and the $100 example is $5.00 platform plus $3.45 estimated recovery, totaling $108.45.
2. Select Custom, enter $0.00, save, and reload. Confirm persistence and the $105.00 example. Repeat with $0.50 or $1.50. Return to Automatic, save, and reload. Invalid precision and excessive/negative amounts must not save.
3. Sign in as Garden and confirm its separate Custom $1.50 preference. Change Orchard again and confirm Garden remains unchanged.
4. Open the printed Orchard storefront and choose an upcoming market pickup date. Use a separate customer session, add produce, complete contact details, and select owned pickup. In checkout, click Prepare test fee quote. The backend adds native surcharges; the summary shows a separate Preorder fee and authoritative final total. Payment collection remains unavailable.
5. Keep that quote open, change Orchard's fee preference in the admin app, and reload checkout. The original quote retains its original amounts. Click Clear test fee quote, then Prepare test fee quote to generate a new quote using the new setting. Earlier quote rows remain immutable.
6. Open the printed market occurrence URL in a customer session. Add Orchard carrots and Garden tomatoes or strawberries, complete details/pickup, and prepare a test quote. Verify vendor-specific combined fees and the aggregate Preorder fee. Garden contributes its fixed recovery while Orchard's automatic recovery includes its own fixed estimate. Sum of vendor final amounts must equal the native checkout total.
7. As dedicated staff, verify fee configuration is unavailable or read-only according to its existing grants, and direct Admin settings mutations are rejected. As the dedicated market manager, direct `saveOwnPreorderFeeSettings` is rejected. Switching workspaces never selects a vendor from a submitted ID.
8. Inspect frozen records using read-only SQL. Join `preorder_fee_quote` to `vendor_payment_obligation` by feeQuoteId when using the disposable internal group test. Compare each snapshot's P/E and component policy versions before/after settings saves. The UI test workflow intentionally does not create a purchase or obligation by collecting payment.
9. To inspect committed original-unit allocations and reservation balances without any provider payment, run the focused backend command with `$env:KEEP_TEST_DB='1'`. Inspect its printed disposable database, then remove that variable. This internal simulator is deliberately unavailable as a public checkout API. Never retarget it to the persistent database.

Native GraphQL test operations are `freezeTestPreorderFeeQuote` and `clearTestPreorderFeeQuote`. Both require the current owned active order and explicit local test gate. Settings operations are `ownPreorderFeeSettings` and `saveOwnPreorderFeeSettings`; the save input contains only mode, decimal custom amount, currency, and expected version.

## Limitations and Phase E dependencies

Production/native Stripe fee collection remains blocked until Stripe, legal, accounting, fee taxation, and disclosures are approved. A Preorder fee label or applying the same estimate across payment methods does not establish surcharge legality. The operational custom cap is not a legal compliance assertion. Region/account-pricing qualification must be authoritative before real account collection; custom negotiated rates are unsupported.

Only the explicit no-fee-tax local test quote path is enabled. Other fee/tax configurations fail closed. Unsupported inclusive prices, adjusted shipping, unrelated surcharge models, and stale monetary bases are rejected. If a cart is edited after freezing, prepare a replacement through the test mutation before continuing; stale quotes cannot be collected. In ordinary mode, fee-free local checkout remains compatible.

No Stripe PaymentIntent, application-fee collection, refund, application-fee refund, or compensation execution was implemented here. Future provider calls must use the frozen original P as application_fee_amount and use original account/mode/payment identity. Actual Stripe processing costs remain distinct from estimated E. Refund orchestration must consume original component reservations, reconcile both refund legs, and retain existing physical/loyalty exactly-once consequences. Reporting/tax/ledger presentation of E must be approved before activation.

The UI allows dedicated persistent manual testing after an explicitly requested migration/setup. Those persistent tests were prepared, not executed. This report is the only new implementation report; prior phase reports remain unchanged.


## Custom percentage and compact settings revision

The developer subsequently approved custom percentage recovery and confirmed the platform fee remains fixed at 5%. The Payments section now presents Automatic, Custom percentage, and Custom fixed amount with the relevant input and a compact $100 example. The vendor-only platform/recovery lines are explicitly identified as not shown separately to customers; checkout still shows one combined Preorder fee.

Percentage recovery is calculated from discounted merchandise excluding item tax, shipping/pickup, and fees, with integer basis points and half-up minor-unit rounding. For example, a custom 2.5% produces $2.50 recovery plus $5.00 platform fee on $100 merchandise, totaling $107.50 before other payable amounts. Custom percentages are not grossed up. Values from 0% to 100% with at most two decimal places are supported as an operational validation bound, not a legal approval.

The additive `PreorderFeePercentage1796700000000` migration introduces `customPercentageBps`, defaults existing records to zero, and extends mode/component constraints. Existing immutable quotes and settings history remain unchanged. New snapshots freeze the effective percentage in basis points and use policy `preorder-5pct-v2`. Authorization, fee allocation/refund components, tax/collection gates, and owner/workspace isolation remain in force.

Updated files include the fee calculator, configuration entity/service/API, new migration, generated API contracts, vendor fixture adapter, existing settings form, and focused tests. Qualification passed 7 backend database groups including percentage configuration and original-unit snapshots, 29 frontend tests, and the full backend build. Scoped frontend typechecking still reports only the existing shared `table-navigation.ts:29` error.

The percentage migration was subsequently applied successfully through the guarded web demo migration command to local vendure_demo_market_ops. Migration verification passed; no reset, seed, or account replacement occurred.
