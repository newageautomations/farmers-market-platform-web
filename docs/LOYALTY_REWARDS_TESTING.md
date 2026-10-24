# Loyalty rewards testing

Run all commands from `E:\coding\farmers-market-platform-web`. Existing populated databases, including `vendure_demo_market_ops` and `vendure`, are not demo targets and must not be migrated, reseeded or reset for this feature.

## Start the disposable environment

```powershell
npm run demo:loyalty
```

This starts the real backend, Astro storefront and React vendor workspace. It creates a fresh random `vendure_test_loyalty_demo_<timestamp>_<suffix>` PostgreSQL database, applies the actual application migrations, and seeds fictional users/products plus real orders, fulfillments and a partial refund. The ordinary local PostgreSQL credentials are read through the existing guarded test helper. PostgreSQL must already be running on loopback. No ordinary application database is connected to for schema/data work. The PostgreSQL `postgres` maintenance database is used only to create/drop the process-owned disposable database.

Ports 4347 and 4565 must be free. The script refuses to interact with a pre-existing service on either port. The API and demo-control ports are selected dynamically. `.loyalty-demo/ready.json` is an ignored local manifest containing the current URLs, test identities and local control key. Do not copy it into production configuration.

Exact browser URLs:

- Customer sign-in: `http://auth.platform.localhost:4347/account/login`
- Customer wallets: `http://auth.platform.localhost:4347/account/loyalty`
- Vendor sign-in/workspace: `http://localhost:4565/vendor`
- Vendor loyalty: `http://localhost:4565/vendor/loyalty`
- Market storefront: `http://market-a.localhost:4347/occurrences/1`
- Vendor storefronts: `http://vendor-a.localhost:4347`, `http://vendor-b.localhost:4347`, `http://vendor-c.localhost:4347`

The current occurrence ID is printed at startup and stored in the manifest; on a fresh database it is 1. A second fictional market supports cross-market wallet qualification tests. The demo uses the same centralized account handoff as the application. Sign in centrally first, then open a business storefront's `/account/login` or select the Vendor mode from the account selector. For a direct vendor entry after central login, open `http://localhost:4565/vendor?channel=2&account=1`. Channel IDs are printed in the manifest. The existing handoff only preserves its approved vendor/market landing routes; open Loyalty after landing.

## Fictional accounts and starting data

All passwords are `local-identity-regression-only-password`. These identities and credential setup exist only in this freshly generated disposable database; no existing account password is changed.

| Account               | Email                              | Purpose                                               |
| --------------------- | ---------------------------------- | ----------------------------------------------------- |
| Primary customer      | `commerce-buyer@test.invalid`      | Between milestones, affordable and locked rewards     |
| Leaderboard customer  | `leaderboard@loyalty.test.invalid` | Larger historical finalized earning and repeat orders |
| Lifecycle customer    | `lifecycle@loyalty.test.invalid`   | Finalized Honey points and pending Farm points        |
| Zero-points customer  | `zero@loyalty.test.invalid`        | Earn from scratch                                     |
| Honey owner           | `identity-owner-0@test.invalid`    | Hill Country Honey                                    |
| Farm and Bakery owner | `identity-owner-1@test.invalid`    | Separate vendor memberships and channels              |
| Market manager        | `market-a@test.invalid`            | Cedar Meadow Farmers Market                           |

The primary customer's available points are exactly 3,500 Honey, 1,000 Farm and 5,500 Bakery, with zero pending. The balances are backed by actual paid/fulfilled order unit entries, an actual completed Honey redemption and partial refund, and explicit `DEMO_ADJUSTMENT` ledger entries explaining the remaining synthetic starting differences. No balance cache is written. Demo adjustments do not improve earned-point leaderboard rank. The zero account has wallet identities and no points transactions.

The base purchasable items use valid native catalog, canonical inventory sources, approved market participation/listings and pickup methods: Raw Honey $10, Vegetable Box $12 and Sourdough Loaf $14. Values intentionally follow the reused commerce fixture's exact minor-unit prices. Every base item starts with ample stock, less its real seeded sales. No live payment or message transport is registered.

| Vendor | Published rewards                                                        |
| ------ | ------------------------------------------------------------------------ |
| Honey  | 2,000 points for $2 off; 5,000 for $5 off; 10,000 for one free Raw Honey |
| Farm   | 1,500 points for 10% off capped at $5; 4,000 for one free Vegetable Box  |
| Bakery | 2,500 points for $3 off; 5,000 for one free Sourdough Loaf               |

## Manual walkthrough

1. Start the demo. Log in as the Honey owner at the central sign-in URL, switch to the Honey vendor mode, then open Loyalty.
2. Review lifetime issuance, net issuance, outstanding/pending points, reward orders, repeat customers, daily trends and the top customers. Open the full leaderboard and redemption history. Record details use the shared dialog pattern.
3. Open Rewards, select Create Reward, choose Fixed amount discount, give it a name and a dollar amount, set a positive point cost, review, then publish. Repeat for a percentage with a mandatory maximum and a free catalog product/variant. The free product must be added to the customer's cart before it can be discounted. Add additional paid merchandise from the same vendor, or order more than the free quantity; each rewarded vendor portion must retain a paid product amount.
4. In a separate profile/private window sign in as the primary customer and open `/account/loyalty`. Honey shows 3,500/5,000 with a 70% primary arc and a stronger translucent remaining track because the 2,000 milestone was achieved. Rings animate on load and stay centered; reduced motion skips all animation. Cards have plain icon/name headings and only next-reward text plus an eligible bouncing/glowing Redeem button below the graphic. Farm has no Redeem button yet. Pending/reserved figures are in details, not on cards.
5. In the Honey card dialog select Redeem for the $2 reward. Review the restrictions. No points move. Following Continue to vendor cart remembers this choice even if you still need to add products; the cart option is preselected and requires confirmation. Alternatively use the market storefront for the multi-vendor exercise below. The preference is scoped to the chosen storefront; another storefront still reads the same wallet and offers its own picker.
6. On `market-a.localhost:4347`, open `/account/login` to complete the same customer account handoff. Browse `/occurrences/1`. Add three Raw Honey and two Vegetable Box units from their real product pages.
7. Open `/cart`. Select Use Rewards for Honey, choose the original $2 reward and confirm Apply to this order. Farm's button is disabled because its available balance is insufficient. The cart updates to $52 in merchandise. Honey points remain 3,500 until payment acquires its hold. Continue to checkout, contact and pickup. Review shows Honey merchandise $28 and Farm merchandise $24. No Farm products receive the Honey discount. The selected reward remains applied after refresh and during checkout.
8. Continue to payment. Choose the existing test payment option, which makes no real charge, and place the order. The application performs its actual verified local payment, inventory hold/conversion, vendor splitting and paid-unit snapshot. Save the `order` ID from the success URL.
9. Return to customer loyalty. Honey has 1,500 available and 2,800 pending; Farm has 1,000 available and 2,400 pending. Cards show the available ring only. Open Points and reward history, then the Purchase entry with +2,800 points for Honey or +2,400 for Farm to inspect the pending amount and original products. Entries are simple activity labels and green/red signed-point pills, not a table.
10. As the Honey vendor, fulfill that vendor's actual order through Orders, or run the narrowly scoped helper below with the customer order ID. Honey becomes 4,300 available and zero pending. Farm's 2,400 remain pending until its vendor fulfills.
11. Revisit the vendor overview and redemptions. Metrics reflect the actual completed use and original discount. The historical net-earned ranking is independent of spent points.
12. Refund one Honey unit using the original-unit demo helper. The original $2 discount was allocated as 67, 67 and 66 cents. Refunding the first unit reverses 933 points, leaving 3,367 available. The ledger references the original unit and reversal. A subsequent partial refund uses its own original allocation. Spent reward points return only when all three Honey units have settled refund allocations.
13. Run `npm run demo:loyalty:cancel -- vendor=0`. It builds a real primary-customer cart, applies an affordable reward, acquires its actual checkout reservation and releases it without placement. The available/reserved totals return exactly once. Abandoned holds are also expired by the existing scheduled capacity worker.
14. Sign in as the zero customer and buy a product without a reward. Its eligible cents first appear pending, then available after real vendor fulfillment.
15. Use the same primary account on vendor-a.localhost, market-a.localhost and market-b.localhost. Its Honey wallet remains the same global vendor/customer wallet. Automated qualification also asserts there is only one wallet across these contexts.

Vendor charts show dated axes, a scale, bounded-width bars and actual totals. View daily values is a Button opening a dialog: select From/Through UTC dates, then Update graph. Test a three-day range in 2000 to see an empty graph and three zero values; reversed or excessive ranges must fail. Leading customer cards have full gold/silver/bronze tints, top-right trophy/medal icons and no visible numbers. Click each to inspect its authorized details. Full leaderboard ranks retain their numbers.

After applying a reward in the cart, Use Rewards remains enabled. Open it and select Save my points, use no reward, then Remove reward: totals must return to the undiscounted value while available/reserved points remain unchanged. Reopen and apply a reward again. Create another affordable reward through the vendor wizard, then switch to it in the same cart; only one discount applies. Once payment reserves points these controls are locked. Reward-type radios keep their spacing/alignment. A fixed $2 discount still rejects a minimum above $2.

## Demo-only lifecycle commands

These commands use the running demo's random loopback control key and delegate to the actual application coordinators. They do not change balances directly. `vendor=0` is Honey, `vendor=1` is Farm and `vendor=2` is Bakery. `order` is the customer order ID, not a vendor portion ID.

```powershell
npm run demo:loyalty:orders
npm run demo:loyalty:fulfill -- order=123 vendor=0 quantity=3
npm run demo:loyalty:refund -- order=123 vendor=0 quantity=1
# For a supported unfulfilled refund/cancellation:
npm run demo:loyalty:refund -- order=123 vendor=0 quantity=1 cancel=true
npm run demo:loyalty:release -- attempt=456
# A complete, deterministic abandoned-checkout exercise:
npm run demo:loyalty:cancel -- vendor=0
```

Inspect the actual order first and use only its remaining unfulfilled quantity. For multi-line portions, use the vendor Orders UI for individual lines; the compact helper applies the requested quantity to each selected vendor line. The refund helper selects the earliest still-unrefunded original units in that vendor portion and uses RefundCoordinator. Unsupported mixed fulfillment cancellations are rejected by the existing commerce policy.

The cancel helper returns the real order/attempt IDs and the before, held and released ledger balances. Inspect the resulting cancellation in customer history and vendor redemption details. It uses the existing local payment simulator and CheckoutCoordinator release/compensation path without creating a placed order. The normal browser checkout remains unchanged. Expiry, duplicate delivery and concurrent spending are separately qualified through the same coordinators.

## Reset and teardown

Press Enter or Ctrl+C in the demo terminal. The wrapper stops only its own frontend children, asks the backend to close, and drops only the fresh randomized database created by that backend process. Start `npm run demo:loyalty` again for a fresh copy. There is no reset/drop command accepting an arbitrary database name. Failed setup runs retain only their own random test database for diagnosis, consistent with the existing helper. A forced process kill may leave a diagnostic database; do not repurpose a normal or persistent demo reset command to remove it.

Do not run `demo:market-operations:reset`, `seed`, `migrate` or ordinary backend development commands for this feature's demo. No persistent database migration was requested or applied.

## Automated commands

```powershell
npm run test:loyalty:backend
npm run test:loyalty:browser
npx vitest run tests/loyalty.test.tsx tests/customer-dashboard.test.ts --reporter=default
npm run typecheck
npm run build
```

Backend build, from `E:\coding\farmers-market-platform`:

```powershell
$env:APP_ENV='dev'
$env:NODE_ENV='development'
npm run build
```

The browser runner launches Chromium directly, uses DOM and accessibility assertions, and captures no screenshots, videos or traces. Existing protected database guards, authentication and verified payment/refund controls remain enabled. See the implementation summary for the actual final check results and remaining limits.
