# Customer dashboard

This implementation adds a customer workspace to the existing Astro storefront and extends the local Vendure backend with persistent customer follows. It uses existing authentication, orders, financial snapshots, occurrence scheduling, and confirmed participation. All work is local. No deployment, remote Git action, provider network call, or production database migration is part of this task.

## Features and routes

The same customer can access purchases across markets and direct vendor storefronts. The central account origin also exposes this workspace without requiring a selected merchant.

| Route                  | Behavior                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/account`             | Overview with order/follow counts, three recent purchases, followed-market and favorite-vendor previews, and six upcoming events |
| `/account/orders`      | Purchase history, ten checkouts per page                                                                                         |
| `/account/orders/[id]` | Owned checkout details, vendor portions, purchased quantities, pickup promises, fulfillment and refund status                    |
| `/account/markets`     | Followed markets, upcoming public dates, and searchable public markets to follow                                                 |
| `/account/vendors`     | Favorite vendors, grouped confirmed appearances, and searchable public vendors to follow                                         |
| `/account/settings`    | The existing personal profile, verification, password, business-mode and preference experience                                   |
| `/account/login`       | Existing password login and merchant handoff                                                                                     |
| `/account/sign-in`     | Existing account-link access and merchant handoff                                                                                |
| `/api/customer-follow` | Same-origin server POST for manual follow/unfollow                                                                               |

Navigation contains only Overview, Order History, Followed Markets, Favorite Vendors, and Account Settings. Business mode controls remain inside the reused account settings experience. The desktop sidebar, top bar, mobile disclosure, typography, cards, buttons, focus styles, and spacing use the existing `@market/ui/styles.css` dashboard classes and platform theme. `CustomerLayout.astro` renders an Astro shell because the existing React `AdminShell` requires administrative contexts and operational services. It does not mount or grant administrative functionality to shoppers.

Follow forms work without client JavaScript. Their submit state announces busy status, disables duplicate submission, and displays a saving message. Successful writes redirect back to the relevant customer page with visible feedback. Pages render existing empty states when no orders, follows, appearances, or search results exist. Backend outages produce the existing temporary-unavailable response. Account pages and mutations use private/no-store responses and noindex headers.

## Architecture and data flow

The frontend `customerApi` helper chooses transport based on the existing `isCentral` origin check. Merchant pages use request-local native Shop cookies and the resolved merchant Channel token through `requestCustomerDashboard` and `requestCheckout`. Central pages use the existing server-only account bridge and HttpOnly `platform-unified-account` capability. Browser JavaScript receives neither bridge keys nor account capabilities.

New named GraphQL operations live in `packages/api/operations/customer-dashboard.graphql`, with their generated types/documents in `packages/api/src/generated/shop.ts`. The adapter lives in `packages/api/src/customer-dashboard.ts`. The existing codegen configuration includes the new operations. Schema extraction continues to read backend source without bootstrapping or connecting to a database.

Backend APIs, enabled with customer accounts:

| Shop operation                                            | Purpose                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------- |
| `customerDashboard(section, skip, eventSkip)`             | Counts, bounded follow lists, and bounded event aggregation |
| `customerFollowSubjects(kind, search, skip)`              | Search public active market/vendor storefronts              |
| `setCustomerFollow(kind, id, following)`                  | Update only the authenticated customer's relationship       |
| Existing `myPurchases(options)` and `myPurchase(orderId)` | Owned purchase history and detail                           |

The existing Market Shop allowlist includes these customer operations. Resolver permissions require authentication; `CustomerDashboardService.owner` additionally requires a live, verified Customer/User and Shop context. A caller never supplies a customer ID.

New bridge actions are `customerDashboard`, `customerSubjects`, `customerFollow`, `customerPurchases`, and `customerPurchase`. They retain the controller's bridge-secret/origin validation. `CustomerAccountService.withCustomerDashboardSession` uses the existing central-capability checks, expiry/binding checks, phone requirement, and transactional request context. The purchase projection's optional central path is selected only by this authenticated server bridge. Its native GraphQL methods retain their merchant-context requirement and both paths retain the exact Customer/User ownership predicate.

## Database

Backend migration: `src/migrations/1791770000000-CustomerDashboardFollows.ts`.

| Table                              | Relationships and protection                                                |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `customer_market_follow`           | Customer and real Market foreign keys; unique `(customerId, marketId)`      |
| `customer_vendor_follow`           | Customer and canonical Vendor foreign keys; unique `(customerId, vendorId)` |
| `customer_purchase_follow_receipt` | Root customer Order foreign key; unique `orderId`                           |

Follow rows use the existing Vendure entity ID/timestamp conventions. Customer-first unique indexes support owned lists and duplicate protection. Subject indexes support foreign-key checks and relationship lookup. A partial `(startsAt, id)` index on scheduled `market_occurrence` supports chronological upcoming queries; existing market/date/status and participation/membership indexes remain in use.

The migration adds tables and an index. It does not delete or rewrite existing rows and does not backfill historical purchases. It is forward-only, matching recent repository migrations. The test scenario applies it after a populated existing schema, compares preserved Customer rows, and verifies a second TypeORM migration run does nothing.

These follow tables intentionally differ from the existing operational CustomerRelationship CRM records. Following a market or vendor neither grants tenant access nor creates marketing consent. Purchase attribution and operational CRM consumers remain unchanged.

## Successful purchases and automatic following

`NativeCommerceAdapter.commit` already performs verified placement within the inventory/checkout transaction. It verifies the native settled Payment, root Order structure, purchased line links and allocations, and writes the existing immutable financial snapshot. The new call to `CustomerDashboardService.purchased` runs immediately after that snapshot in the same transaction, before the placement outbox fact. It does not change amounts, taxes, commissions, provider execution, or payouts.

Qualifying purchases require enabled customer accounts and a Shop request whose authenticated User matches the snapshot's customer User. Anonymous/unclaimed checkouts remain available through the existing flow, appear in history after claim, and do not create these shopper follows. A later signed-in qualifying purchase does. This is a deliberate authentication boundary; no customer ID or email supplied by a browser authorizes follows.

Every distinct purchased vendor from the actual root OrderLineLinks is followed. A `MARKET_OCCURRENCE` root also follows its real `marketId`. A `DIRECT_VENDOR` root follows its vendor only. A vendor's directory memberships or appearances never infer a market purchase.

Writes use conflict-safe inserts and a per-customer transaction advisory lock shared with manual changes. A unique purchase receipt prevents a replay from recreating a follow removed after that purchase. The receipt and follows roll back if placement fails. The existing coordinator skips already committed placement on repeated completion. Both local verified payments and configured provider placement use this native commit path; a frontend success-page visit never creates follows.

Manual unfollow deletes the relationship. Refreshing a success page, replaying the same placement, or retrying the same completion does not restore it. A **new** qualifying purchase follows again. Refunds and cancellations after successful placement retain follows; they continue to update the existing purchase/fulfillment projections. No retroactive unfollow policy was added.

## Upcoming events and attendance

Events are existing `market_occurrence` records, including occurrences generated by existing recurrence services. Dashboard code never expands recurrence or invents dates.

Events must start after the database's current timestamp, remain `scheduled`, belong to an active market, and have an active canonical public storefront/Channel. Cancelled, historical, suspended-market and unavailable-market events are excluded. UTC instants determine sorting, with occurrence ID as a stable tie-breaker. The UI formats dates and times using each occurrence's recorded IANA timezone, including daylight-saving changes.

Followed-market events use the customer's `customer_market_follow` relationships. Vendor appearances require explicit `occurrence_participation.status='confirmed'`, an approved membership with verified vendor consent, and an active followed Vendor. A general vendor directory entry, application approval, or planned participation is insufficient.

Matching favorite vendors are aggregated within one occurrence record, ordered by name and ID. Multiple favorite vendors at one date do not duplicate its card. One vendor can appear at multiple dates. Overview uses the union of followed-market events and favorite-vendor appearances, showing an overlapping occurrence once with both its followed-market indication and matching vendors. Dedicated sections intentionally answer different questions and can reference the same occurrence.

Follow lists, discovery and event pages return twelve records plus a has-more sentinel; overview follows return four and events return six. Orders return ten, with three on overview. Filtering, grouping, paging, and limits occur server-side. The new event/follow queries batch joins and aggregation instead of fetching all data into the browser. Empty follow sets skip the event query. Existing bounded purchase composition is reused and still performs its existing per-purchase financial/operational validation queries; this task does not redesign those projections or add caching infrastructure.

## Customer permissions

Orders remain root Regular or Aggregate purchases. Seller orders/portions remain operational children, not duplicate customer purchases. The projection scopes snapshot Customer and User IDs to the authenticated owner, joins matching native Order ownership, and requires a placed root context. A foreign root ID and a Seller Order ID cannot bypass ownership.

Customers may aggregate their own purchases and public market/vendor information across tenant boundaries. They receive no private tenant customer lists, staff memberships, channel tokens, provider facts, administrative business fields, or payouts. Manual follows are always scoped to the session-derived Customer. Unfollow remains possible if a followed storefront later becomes unavailable. Only public active subjects can acquire a new manual follow.

The follow POST checks exact same-origin requests, bounds form size, validates kind/ID/boolean, and restricts redirects to customer overview/follow pages. Backend bridge authentication is additional server-to-server protection. The existing authentication providers and signup behavior are unchanged.

## Local development scenario

Run commands from `E:\coding\farmers-market-platform-web`. Both local repositories need their already installed dependencies, Node 24+, PostgreSQL on loopback, and installed Playwright Chromium. Existing test-database utilities use the backend's local DB connection settings (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`); never supply production credentials. Database names are allocated by `freshTestDatabase`, not taken from ordinary `DB_NAME`.

```powershell
npm run demo:customer:start
```

This command seeds a new owned `vendure_test_customer_dash_*` database, applies normal migrations, runs backend assertions against a separate fixture customer, creates a clean browser customer, builds the normal Astro storefront with fixture mode disabled, and starts it at port **4347**. The backend uses its own ephemeral loopback API port. Keep this terminal open.

No external email/SMS/payment providers are composed. Phone verification uses the existing local test SMS adapter to complete the ordinary signup service. Payment uses the existing explicitly enabled test-only local verified checkout adapter. No fake completed Orders are inserted. Products, stock sources, pickup methods, market memberships, explicit occurrence attendance and real checkout prerequisites are seeded.

The startup output prints the generated test-customer email and password. The default development-only password is `CustomerTest!2026`; override it before starting with `$env:CUSTOMER_TEST_PASSWORD` using a password that satisfies the existing signup policy. Fixture accounts use `@test.invalid` addresses and clearly identified scenario records. Do not reuse their credentials elsewhere.

Runtime manifest: `.runtime/customer-dashboard/ready.json`, ignored by Git. It contains the allocated endpoint, database identity, generated account, fixture IDs and local control keys. It is not a production environment file. The manifest and startup output are the source of truth for occurrence/product IDs.

| Fixture       | Route and relationship                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Customer Test | Generated account, verified via the normal signup flow with local SMS                          |
| Market Alpha  | `http://market-alpha.localhost:4347/`, one qualifying future date, Vendors A/B confirmed       |
| Vendor A      | Public `vendor-a.localhost`, product at Alpha `/occurrences/<occurrenceA>/products/<variantA>` |
| Vendor B      | Public `vendor-b.localhost`, product at Alpha `/occurrences/<occurrenceA>/products/<variantB>` |
| Vendor C      | `http://vendor-c.localhost:4347/products/vendor-c-test-honey`, own stock and pickup            |
| Market Beta   | `http://market-beta.localhost:4347/`, Vendor C confirmed at two future dates                   |

Future fixtures use dates four and eleven days after startup. Additional cancelled/historical owned fixtures prove filtering. Historical events are inserted as historical event fixtures because public event creation intentionally supports only future dates; completed purchases are always made through real checkout.

To choose another unused storefront port, set `$env:CUSTOMER_DASHBOARD_PORT='4348'` before startup. Replace 4347 in the URLs accordingly. Other running local services are not stopped by this helper.

### Seed, reset, verify and cleanup

`demo:customer:start` is the seed-and-serve command. It uses a fresh isolated database per run. For a repeatable clean state **while the scenario is running**, use another terminal:

```powershell
npm run demo:customer:reset
```

Reset creates another clean test Customer through signup and updates the runtime manifest. It preserves the former customer's orders, financial snapshots, and all fixtures. Sign out of the former central/merchant sessions, then use the newly printed account. No immutable purchase rows are deleted.

After the three purchases:

```powershell
npm run demo:customer:verify
```

The verifier reads the active fixture customer's persistent data and checks three root purchases, one followed market, and three favorite vendors.

When done:

```powershell
npm run demo:customer:cleanup
```

Only the original harness process can drop the database it created. Cleanup shuts down the owned backend/storefront and calls the existing guarded successful-test cleanup. `KEEP_TEST_DB=1` retains the owned database for diagnosis. Failed runs are retained by the existing test guard; no blanket cleanup of failed databases or genuine local application data occurs. A new start always creates a new isolated scenario.

## Manual three-purchase walkthrough

1. Run `demo:customer:start`. Open `http://auth.platform.localhost:4347/account/login` and sign in with the generated email and printed development password. Overview should show zero purchases and follows for this account.
2. Visit `http://market-alpha.localhost:4347/account/login` once. The existing central handoff signs you into that merchant without repeating credentials. Return to the Market Alpha homepage and choose **Browse the next occurrence**. Find Vendor A's product, open it, add one item to the cart, and visit `/cart`.
3. Choose **Continue to checkout**, verify the authenticated contact, continue to pickup, review, continue to payment, and select **Confirm local test payment**. Confirm success. Overview/history should show the purchase, Market Alpha once, and Vendor A.
4. Return to Market Alpha and the same occurrence. Purchase Vendor B's product through the same UI steps. History now has two checkouts and favorite vendors A/B. Alpha remains followed once; its upcoming card lists both vendors.
5. Visit `http://vendor-c.localhost:4347/account/login` for the central handoff. Open `http://vendor-c.localhost:4347/products/vendor-c-test-honey`, add one item, view cart, and complete the same local test checkout.
6. Open the central `/account`, `/account/orders`, `/account/markets`, and `/account/vendors`. Expect three checkouts, Market Alpha only, favorite vendors A/B/C, Alpha's grouped A/B appearance, and both upcoming Beta dates with C. Beta stays available to **Follow** manually and is not automatically followed by the direct purchase.
7. Open an order to inspect its vendor portion and pickup information. Try follow/unfollow controls. Unfollowing C removes its Beta appearances from the favorite-vendor section; manually following C restores them. Unfollow a vendor, then make a new purchase to test automatic refollow. That extra purchase makes the scenario's strict three-purchase verifier intentionally fail until you reset to a clean customer.

No real card number, Stripe key, SMS code, or external account email is required in this scenario.

## Automated validation

```powershell
npm run typecheck
node node_modules/tsx/dist/cli.mjs scripts/check-boundaries.ts
npm run test:customer:backend
npm run test:customer:live
```

`test:customer:backend` runs the populated migration and real GraphQL/service integration suite in a fresh owned database, then cleans it up on success. `test:customer:live` runs that suite, starts the real built Astro app, and runs Chromium against it. GraphQL responses and dashboard persistence are not mocked.

Files and coverage:

- `tests/customer-dashboard.test.ts`: customer-only routes, bounded offsets, return-path restrictions, timezone boundary formatting, auth/outage distinction, and same-origin follow mutation protection.
- Backend `test/frontend-integration/customer-dashboard-run.ts`: additive migration preservation/re-execution; authenticated checkout A/B at Alpha and direct C; real order history; duplicate/concurrent follows; manual removal/refollow; new-purchase refollow; receipt/completion replay; cross-customer denial; anonymous denial; released checkout; chronological grouping; historical/cancelled/planned attendance filtering; multiple C occurrences.
- `tests/e2e/customer-dashboard-live.spec.ts`: real signup-fixture login, first-party merchant handoffs, three UI checkouts, persisted central history/detail, manual follow/unfollow, grouped appearances, customer navigation, settings save feedback, actual verify/reset CLI commands with previous orders preserved, and accessibility/overflow checks at 390/768/1440 pixels.
- Existing `tests/e2e/checkout-account-live.spec.ts`: legacy guest purchase/claim, mixed-vendor Aggregate checkout, account ownership/history and merchant SSO. Its account-home assertions follow the new Overview label; its purchase structure assertions remain.
- Existing frontend unit suite: vendor, market, admin, operational layouts, storefront, identity and policy regressions.

Verified results are recorded below after the final test run. Initial test attempts exposed fixture/startup issues and were corrected; a failed attempt is not counted as a pass.

| Check                                        | Result                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| Frontend typecheck                           | Passed, zero Astro errors/warnings/hints                                |
| Scoped frontend ESLint                       | Passed                                                                  |
| Package/source boundaries                    | Passed                                                                  |
| Frontend unit suite                          | 24 files, 308 tests passed                                              |
| Backend typecheck                            | Passed                                                                  |
| Backend full build                           | Passed with `APP_ENV=test`, `NODE_ENV=test`                             |
| Customer migration and backend integration   | Passed inside real isolated harness                                     |
| Customer real browser test                   | Passed, one complete Chromium scenario, including verify/reset commands |
| Existing checkout/account browser regression | Passed, real guest/claim, mixed-vendor Aggregate checkout and SSO       |
| Frontend Storefront and Admin build          | Passed                                                                  |
| Scoped Prettier check                        | Passed                                                                  |

Evidence belongs to `docs/evidence/customer-dashboard/`. Earlier project evidence is preserved. The backend full build initially required explicit environment selection and an unsandboxed filesystem retry; neither changed source configuration or environment files.

## Files created or modified

Frontend:

- `apps/storefront/src/layouts/CustomerLayout.astro`, `components/CustomerNavigation.astro`, and `styles/customer-dashboard.css`: dashboard shell and responsive customer navigation using shared dashboard classes.
- `components/CustomerOrders.astro`, `CustomerFollows.astro`, `CustomerEvents.astro`: bounded purchase, follow, and grouped timezone-aware event displays. `CentralAccount.astro` supports embedding the existing profile experience without duplicate page/signout controls.
- `pages/account/index.astro`, `pages/account/orders/index.astro`, `pages/account/orders/[id].astro`: overview and existing history/detail routes in the customer shell.
- `pages/account/[section].astro`: only markets/vendors sections; other dynamic paths return 404.
- `pages/account/settings.astro`: preserved existing account experience moved into customer settings.
- `lib/customer-dashboard.ts`, `lib/shop.ts`, `pages/api/customer-follow.ts`: authenticated central/merchant adapter and same-origin mutation boundary. `pages/api/account.ts` returns settings form feedback to the new settings route.
- `packages/api/operations/customer-dashboard.graphql`, `packages/api/src/customer-dashboard.ts`, `packages/api/src/index.ts`, `codegen.ts`, Shop schema/generated documents and schema provenance: typed operations and adapters.
- `scripts/customer-dashboard.ts`, `playwright.customer-dashboard.config.ts`, `package.json`: local scenario/test lifecycle commands. `tsconfig.json` includes existing Astro local declarations for root-level tests of server helpers.
- `tests/customer-dashboard.test.ts`, `tests/e2e/customer-dashboard-live.spec.ts`, `tests/e2e/checkout-account-live.spec.ts`: focused tests and account label updates.
- This document and task-specific verification evidence.

Backend, with the user's explicit local sibling-folder exception:

- `customer-account/follows.ts`, `dashboard.service.ts`, `entities.ts`: persistent entity registration and customer aggregation/follow service.
- `customer-account/api.ts`, `controller.ts`, `service.ts`: authenticated Shop operations and existing central bridge integration.
- `marketplace-commerce.plugin.ts`: register the dashboard service.
- `commerce/native-commerce.adapter.ts`: one scoped transaction hook after the existing financial snapshot.
- `commerce/contracts.ts`: permit authenticated customer dashboard operations in Market Shop requests.
- `customer-relationships/projections.ts`: reuse owned purchase composition from the authenticated central bridge.
- `src/migrations/1791770000000-CustomerDashboardFollows.ts`: additive follow schema/index.
- `test/frontend-integration/customer-dashboard-run.ts`: guarded real checkout fixtures and assertions.
- `test/frontend-integration/checkout-account-run.ts`: include the new migration in the existing account-enabled test composition.

Backend paths above are relative to `E:\coding\farmers-market-platform\src\plugins\marketplace-commerce` unless otherwise stated. Both repositories contained substantial earlier uncommitted changes; this inventory describes this task's additions/integrations, not all working-tree differences.

## Decisions, limitations and rollout

The central account is the natural cross-market workspace. Existing tenant dashboards are not refactored, copied into customer authorization, or imported across app boundaries. Existing Regular/Aggregate/Seller modeling and purchase ownership validation remain authoritative. New shopper follows stay independent of administrative CRM and communication consent.

The manual scenario is a real isolated local environment intended for an active testing session. It is not a permanent modification of the existing Bulverde/demo or protected `vendure` database. Reset rotates the fixture customer instead of attempting to erase immutable purchase records. Its APIs and local payment adapter are guarded test composition, outside production entry points.

Only scheduled future event instances appear; recurrence must already have been materialized by the platform's existing generator. Vendor links can be unavailable while an active vendor still has a confirmed public market appearance. Follows to unavailable/suspended subjects remain removable. Already placed historical purchases are not backfilled into follows. Existing per-purchase validated projections remain bounded but have not been rewritten into a new bulk history engine.

No live payment-provider webhook, real Stripe sandbox, external SMS/email delivery, or production hosting integration was exercised. Existing verified provider placement shares the same native commit hook; its external operational qualification remains separate. Currency/amounts and financial refund state continue to come from existing backend projections.

Before rollout, deliberately apply the additive migration using the normal existing migration procedure to the intended database, enable the platform's existing customer-account/native-commerce/paid-attribution/customer-relationship configuration, and verify central account origin/bridge secret plus approved storefront hostnames. Do not run the test harness against a persistent application database. Production HTTPS, cross-domain sessions, approved origins, provider/funds-flow configuration, deployment and any desired historical follow backfill require their normal separate review. None was changed or deployed here.
