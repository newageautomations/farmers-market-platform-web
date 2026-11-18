# Customer storefront Market Day mode

Implemented locally on November 13, 2026 in the web project and the explicitly authorized sibling API project. No deployment, external service, screenshot or browser automation was used. Existing unrelated working-tree changes were preserved.

## What shipped

An occurrence's manager detail page has a Market Day storefront setting, off by default, with the scheduled start, scheduled end and one-hour visibility cutoff. It reuses SettingsPanel, Field, Checkbox, FarmstandButton, shared feedback and save conventions. An authorized, read-only preview shows the date and its published map without enabling the public homepage or loading any customer's records. Preview and setting reads require the current manager workspace and ReadOwnMarketAssignments; writes additionally require OperateOwnMarketDay, enforced on the server.

Only the market homepage can switch modes. It retains the existing SiteLayout, navigation and theme. Market status, Your pickups and a map access link appear near the top. Regular storefront links to `/?storefront=regular`, which bypasses the landing switch and its activation polling. Shop, occurrence-product, account, order-detail and editor routes retain their existing controllers. Editor preview never activates this mode or reads personalized Market Day data. The safe account-return allowlist narrowly admits `/?marketDay=<numeric occurrence ID>` for returning after sign-in.

MarketDayHome and MarketDayLive are feature compositions because no existing public composition combines the clock, scoped pickups and followed-vendor map overlays. The page shell and directory remain Astro SSR; the island owns the clock, private reads and existing map renderer. MarketVendorCards, Card, Alert, shared button presentation and MarketMap/MapCanvas are reused. An optional, default-empty highlightedIds prop adds dashed outlines through the existing canvas. It does not edit map definitions or change ordinary consumers. No primitive, UI library, parallel style system or pending component approval was introduced. COMPONENT_USAGE_GUIDE.md records this reuse.

## Activation and refresh

The server derives eligibility from its current time, the current occurrence schedule, scheduled status, active public market, saved enablement and Phase D manager completion. The interval is start-inclusive and cutoff-exclusive: `[scheduled start, scheduled end + 1 hour)`. Every eligible occurrence is returned; overlapping dates require an explicit customer selection. One selected occurrence supplies all map, directory and pickup inputs. Private vendor-managed locations have no public mode.

At scheduled end the countdown becomes exactly **Scheduled market hours have ended.** Maps, directory and customer pickups remain available until the cutoff. Manager Finish, disabling the setting or cancellation removes public eligibility. Vendor Finish, legacy CLOSE_DAY/operationsComplete, and Setup/Market/Closing navigation do not control it. Reads and the cutoff never complete a market, finalize attendance or mutate commerce, payments, assignments or admin workflows.

Enablement records the manager-completion revision. Finish and Reopen change that revision, so reopening cannot silently reactivate the page. An explicit authorized save can re-enable after reopening, within the current cutoff. The setting command shares Phase D's occurrence advisory lock and checks its own expected revision. No early-start, late-extension or force-on override exists. Rescheduling preserves the occurrence ID and recalculates its window.

The API returns serverNow, scheduled end and cutoff. Browser countdown ticks use elapsed wall time relative to the returned server clock, with no per-second API request. Public state revalidates on entry, focus and visible-document return, and every **30 seconds while visible**, with overlapping public requests suppressed. An already-open regular homepage can activate on that bounded refresh; an ineligible selected page returns to `/`. Schedule/overlap changes reload authoritative SSR composition. The known cutoff also returns an open page to `/` without waiting for another API result. These are bounded refreshes, not instantaneous push updates. Public read failure leaves the regular SSR fallback available; an already-open page retains its known public projection until recovery or its known cutoff.

Private data refreshes on entry, focus and visible return. Blur, hidden-document and pagehide events clear private state; refresh clears it before requesting the current session. AbortController and a request generation reject late responses from an earlier session. No personalized response is retained in localStorage, a module cache or an SSR prop. Signing out via the existing account flow navigates away; returning or switching customers cannot reuse the previous customer's map key, pickups or directory follow indicators.

Maps and directory are entry snapshots. Public mode polling does not republish assignments or promise coordinated map/directory changes. Refresh the page to read a newly published snapshot.

## Contracts, permissions and caches

Public state, published map and public directory remain separate from customer data. `publicMarketDayState` exposes only serverNow and eligible occurrence schedule/venue fields. `customerMarketDay` accepts an occurrence ID, derives Customer from the authenticated verified Shop user, validates the current active market/storefront and that occurrence's market, and scopes purchases to both Customer and customer User plus market and occurrence. It reads the existing CustomerVendorFollow relationship, restricted through that occurrence's memberships/participations. No supplied customer identity or purchase history is used to infer follows.

The pickup projection extends CustomerPurchaseProjection narrowly, reusing its scoped purchase query and existing CommerceTopologyService portion/status/pickupPromise contract. Each portion stays a separate card with vendor, native order reference, status, authoritative venue/instructions and the existing order-detail link. Missing venue says Pickup location not provided. Neither the projection nor the island joins orders to booths, changes map selection for an order, or creates a pickup-to-map model.

Published map vendor projections add only the verified stable vendorId to the existing public business snapshot. Only those published IDs can receive a follow outline. A followed vendor without a published booth still has a Following directory label but gets no invented marker. Legacy published snapshots without vendorId remain unchanged and unhighlighted until a manager explicitly republishes them. There is no assignment lookup to guess their old identities and no automatic republishing migration.

The Astro API route uses request-local Shop cookie/session transport and private, no-store responses, including errors, with Vary: Cookie. Private Shop GraphQL responses are also no-store and vary by Cookie and Authorization. The resolver requests private, no-store; Apollo emits no-store on the final HTTP response. Public responses contain no orders or follows. Existing marketplace HTTP root guards were extended only for the two scoped Market Day reads. The customer root retains authenticated resolver and service ownership checks. Manager preview cannot read customer records.

## Migration and manual fixture

Read-only preflight found exactly one pending migration. `MarketDayStorefront1797700000000` was applied successfully to **vendure_demo_market_ops** through the web directory's guarded migrate script. It adds the occurrence-unique setting table, foreign keys and market/enabled index. It does not reset, truncate, reseed, replace or backfill existing records.

The dedicated Phase E fixture reuses the existing Fee D test market, manager and two vendor owners without changing their credentials or established scenarios. It adds occurrence **79**, two published booths, its own participation/offering/assignment records, two new customer identities and two real local test-payment purchases through existing native/inventory/payment paths. It sets each fixture order's authoritative pickup promise while its empty draft is editable, before placement freezes it. Initialization receipts use existing append-only operations audit records. Default reruns preserve schedules, completion, enablement, follows, order references and manual changes. Default setup, a repeated default setup and both schedule shortcuts were exercised successfully.

| Record                  | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| Market                  | 34, Preorder Fee D Market                                                |
| Occurrence              | 79                                                                       |
| Manager                 | stripe-fee-d-manager@example.test                                        |
| Manager password        | Local-Fee-D-2026!                                                        |
| Customer 1              | market-day-e-customer-1@example.test                                     |
| Customer 2              | market-day-e-customer-2@example.test                                     |
| Both customer passwords | Local-Market-Day-E-2026!                                                 |
| Customer 1 follows      | Vendor 52, Orchard, published booth e-0                                  |
| Customer 1 pickup       | Vendor 53, Garden, order 319, LDSTMHP93XFSN41D, Shared pickup tent       |
| Customer 2 follows      | Vendor 53, Garden, published booth e-1                                   |
| Customer 2 pickup       | Vendor 52, Orchard, order 321, K53WMUPSSEKKBCA3, Orchard collection desk |

Fixture readback verified both public vendor IDs in the published map and directory, and each customer's own follow and pickup projection. Customer 1 highlights only Orchard's booth; Shared pickup tent appears only on the Garden order card. Customer 2 has the opposite follow/pickup relationship. The new customer accounts have synthetic verified phone identities for the existing central-account flow.

From `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:migrate
npm run demo:market-operations:market-day-storefront-fixtures
```

Both have already run. If the test date is stale, this explicit shortcut changes only occurrence 79's schedule to start ten minutes ago and end five minutes ahead:

```powershell
npm run demo:market-operations:market-day-storefront-refresh-fixtures
```

To test ended hours immediately, this shortcut sets only the dedicated occurrence's end to one minute ago, leaving 59 minutes before its cutoff:

```powershell
npm run demo:market-operations:market-day-storefront-ended-fixtures
```

These fixture-only schedule adjustments preserve the same occurrence/order IDs, immutable generation identity and original schedule fields. They never reopen completion or enable the setting. The normal product still has no early/late override. Neither shortcut modifies the machine clock, established occurrences or established accounts. A finished fixture needs explicit manager Reopen and an explicit re-enable for another public test.

Start or restart the usual processes in separate terminals from the web directory:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Restarting an existing backend is necessary to load the new schema. Ordinary backend development commands select a different database and are not appropriate for this manual flow.

## Manual flow and routes

1. Open `http://localhost:4322/market/occurrences/79` as the dedicated manager. Check the displayed window, open Preview Market Day, and verify preview has no enablement side effect. Enable for this occurrence and save.
2. Open `http://stripe-fee-d-market.localhost:4321/?marketDay=79`. Sign in using Customer 1. Expect only Orchard's published booth outlined and Following in the directory, with Garden's Shared pickup tent on order 319's card. Its detail is `http://stripe-fee-d-market.localhost:4321/account/orders/319`.
3. Sign out and sign in as Customer 2, or use a separate browser profile. Expect only Garden's booth outlined and Orchard collection desk on order 321. Detail: `http://stripe-fee-d-market.localhost:4321/account/orders/321`. Signed-out visitors get the ordinary public map and sign-in prompt. Refocus an older open page and verify no previous-customer cards or highlights remain.
4. Follow Regular storefront to `http://stripe-fee-d-market.localhost:4321/?storefront=regular`. It must show the normal homepage. Verify `/shop?occurrence=79`, account/order details and the existing website editor still use their existing routes.
5. Run the ended-fixtures command and refocus the homepage. Expect Scheduled market hours have ended while map, directory and pickups remain. The server's cutoff is still one hour after the new end.
6. Open `http://localhost:4322/market/day/79#closing` and use **Finish market**. The public page returns to the regular homepage on its next visible state refresh, at most 30 seconds plus request time. Vendor Finish my market day at `/vendor/day/79#closing` must not do that. Legacy Close day must not do it either.
7. Reopen manager completion. Verify mode remains inactive. If necessary run refresh-fixtures to obtain a new bounded fixture schedule, then explicitly re-enable in occurrence details. Finish remains independent from attendance, payments, orders and phase navigation.

The fixture intentionally leaves the setting off by default. Visual, keyboard, responsive and reduced-motion review remains manual; no screenshot or browser automation was performed.

## Focused verification

- New web tests: **9 passed**, covering explicit overlap selection, server-relative timer/suspension, routing bypass/editor protection, follows versus orders, missing stable IDs/booths, separate order location, missing map, ended hours, account switching/sign-out, late-session responses, visible 30-second polling, hidden-state clearing and open-page return on public ineligibility.
- Existing Phase C/D web tests: **26 passed** in market-day.test.tsx and market-day-actions.test.tsx.
- Dedicated backend `npm run test:market-day-storefront`: guarded disposable qualification for defaults, precise time boundaries, ended-hours/cutoff, permissions and stale writes, manager Finish/Reopen/re-enable, vendor Finish, cancellation, rescheduling, overlaps, cross-customer/market privacy, real split-vendor pickup promises, missing maps and actual Shop HTTP root/session isolation. Successful runs clean up their own database. Final qualification also passed private-market exclusion, canonical published vendor IDs, draft-map rejection, legacy CLOSE_DAY independence and private response cache headers. Its disposable database was dropped.
- Existing backend `npm run test:market-day`: passed, including independent completion, immutable histories, authorization, real fulfillment/refund continuation and invoice corrections after Finish. Its successful disposable database was dropped. Phase D authentication configuration was preserved.
- Storefront Astro check: **256 files, zero errors/warnings/hints**. Backend no-emit TypeScript and Vendure server build passed. Focused feature ESLint passed.
- Scoped web TypeScript has one existing blocker at packages/ui/src/table-navigation.ts:29; no Phase E diagnostic remains. The wider preparation scope also reports existing LoyaltyDashboard.tsx:465-466 issues.
- Required backend `npm run build` was attempted. Its dashboard stage still fails with the existing APP_ENV_EXPLICIT_MODE_REQUIRED configuration policy; `npx vendure build server` passed independently.
- Additional existing market-storefront and visual-editor tests were run: 17 passed and two assertions failed in untouched cart/editor work (an old `li` text expectation for A and an absent Primary button label field). No unrelated cart/editor implementation or expectation was changed to make those pass.

During development, failed disposable qualification runs were retained by the existing safety harness. None targeted the persistent database. No established test account was changed to manufacture Phase E states.

## Local files and Phase F boundary

Web feature files: `apps/admin/src/market/MarketDayStorefrontSetting.tsx`, occurrence detail/service wiring; `apps/storefront/src/components/market/MarketDayHome.astro`, MarketDayLive.tsx and MarketVendorCards.astro; homepage, API route, Shop/account helpers, market-day-routing.ts and market-day.css; typed `packages/api/src/market-day-storefront.ts`, API exports and published-map vendor ID type; optional highlight wiring in MarketMap, MapCanvas and KonvaElement; the two Phase E web test files and scoped tsconfig; demo scripts/package commands, component usage guide and this report.

API feature files: `src/plugins/market-operations/storefront-day.{entity,model,service,api}.ts`, plugin registration and published map projection; the additive migration; customer-relationships projection/resolver and the two existing Shop root guards; `test/marketplace-commerce/storefront-day.ts` and storefront-day-run.ts; the dedicated demo fixture, guarded runner actions and package commands.

Deferred to Phase F: push/subscriptions, coordinated live updates between interfaces, automatic assignment-to-publication propagation, richer website-shell manager preview, historical map identity backfills, pickup-to-map modeling, early/late overrides and unrelated dashboard/editor refactoring. None is required to run the bounded public landing experience above.
