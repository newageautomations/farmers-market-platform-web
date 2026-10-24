# Stage A implementation summary

## Delivered behavior

The vendor dashboard has an In-Person Checkout navigation entry and `/vendor/pos` route. The register uses real protected catalog products, native variants and Collections, bounded server-side name/variant/SKU search, durable vendor favorites, recognizable product media/fallbacks, unambiguous quick-add and compact variant selection. Desktop/tablet show a persistent cart; mobile exposes a sticky count/total and shared drawer dialog. Shared controls retain their design contract and use the existing height token at 44px for touch.

Cart quantities update optimistically while official prices, coupon discounts, tax and final totals remain backend values. A per-vendor/cashier queue serializes mutations and retains receipt keys when a response is uncertain. Relative decrements avoid stale quantity overwrites. Native Vendure Draft orders and durable scoped POS records support explicit resume, editing, cancellation, expiration and final review. No arbitrary prices or new financial engine were added.

The backend rechecks native product/publication, protected ownership, currency/tax envelope, canonical source configuration, inventory freshness and free stock. Review locks canonical sources and reprices every line. Drafts create no inventory holds, allocations, permanent stock movements, payments, purchase snapshots or loyalty progress. Quotes last two minutes and preserve identity, version, fingerprint, source allocations, quantities, native money/tax/discount facts, optional customer and selling context. Continue to Payment stays disabled.

Customers remain optional. Exact normalized active email/central phone matches can be associated without OTP at the register. Customer IDs and financial inputs from the browser are rejected. Results contain no profile directory, addresses, payment information, unrelated purchases or loyalty records. Lookup attempts are durably throttled and association changes append immutable audits. Invitation intent sends no email and creates no account. The internal verified-sale handoff delegates to the existing guest purchase-link service after paid provenance checks; its future completion branch is qualified only in an isolated test fixture.

Market context requires an applicable real occurrence, active market, verified approved vendor relationship, confirmed participation, compatible tax/currency and approved published products. Independent Sale has no inferred market attribution. Owners and staff need the explicit POS permission. Current grants and membership are reloaded, and drafts are isolated even between cashiers at the same vendor.

## Local files introduced or integrated

Backend repository, `E:/coding/farmers-market-platform`:

- `src/plugins/marketplace-commerce/in-person/service.ts`: catalog, contexts, favorites, persistent draft commands, validation, quote and expiry.
- `src/plugins/marketplace-commerce/in-person/api.ts`: vendor-only Admin GraphQL operations.
- `src/plugins/marketplace-commerce/in-person/capability.ts`: exact internal native-draft edit scope.
- `src/plugins/marketplace-commerce/in-person/order-process.ts`: reject native POS payment/placement transitions.
- `src/plugins/marketplace-commerce/in-person/invitation-handoff.ts`: guarded reuse of existing paid guest signup links.
- `src/migrations/1792800000000-InPersonCheckout.ts`: additive SQL tables/indexes and audit/identity guards.
- `src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts`, `types.ts` and `src/vendure-config.ts`: optional composition and expiry scheduling.
- `src/plugins/platform-identity/permissions.ts` and `tenant-access-policy.ts`: explicit POS grant and current owner/staff authority.
- `src/plugins/marketplace-commerce/commerce/strategies.ts`: narrowly scoped native draft editing.
- `src/plugins/marketplace-commerce/financial/vendor-promotion.service.ts`: reuse native coupon policies within the exact POS edit capability, with loyalty exclusion.
- `src/plugins/marketplace-commerce/customer-account/service.ts`: centralized exact purchase-attribution lookup.
- `test/in-person/fixture.ts`, `run.ts`, `demo.ts`, `handoff.ts` and `tsconfig.json`: real guarded fixtures, integration checks, demo and isolated handoff contract.

Web repository, `E:/coding/farmers-market-platform-web`:

- `apps/admin/src/vendor/pos.tsx`, `pos.css`, `pos-queue.ts`: register composition and serialized optimistic cart.
- `apps/admin/src/vendor/VendorRoutes.tsx`, `service.ts`: route and typed live API integration.
- `packages/admin-core/src/index.ts` and `apps/admin/src/NavigationIcon.tsx`: scoped permanent navigation and icon.
- `packages/api/src/in-person.ts`, `index.ts` and generated Admin/Shop permission unions: named typed POS operations and explicit permission contract.
- `scripts/in-person.ts`, `in-person-browser.ts`: disposable supervision and real browser walkthrough.
- `tests/in-person.test.tsx`: queue, authorization and UI behavior.
- `package.json` and `.gitignore`: `demo:pos`, `test:pos:backend`, `test:pos:browser` and ignored owned runtime manifest.
- `COMPONENT_USAGE_GUIDE.md` and `UI_COMPONENTS.md`: feature reuse, touch token, accessibility and retained design boundaries.
- This directory's implementation plan, architecture, summary, testing guide and roadmap.

Pre-existing uncommitted work in both repositories is preserved. File lists describe this task's bounded additions/integrations, not ownership of unrelated existing diffs.

## Database and API

The migration creates `pos_draft`, `pos_operation`, `pos_customer_audit`, `pos_favorite` and `pos_lookup_rate`. It preserves native commerce records, protects attribution history and refuses destructive downgrade after draft creation. Tables follow the existing migration-managed extension pattern; no duplicate TypeORM financial engine was introduced.

Admin operations are `ownPosCatalog`, `ownPosContexts`, `ownPosDrafts`, `ownPosDraft`, `startOwnPosDraft`, `commandOwnPosDraft` and `setOwnPosFavorite`. Every operation enforces current POS/vendor authority; drafts additionally enforce cashier ownership. There is no payment success, customer impersonation, public invitation or loyalty API.

## Verification record

Final qualification on 2026-10-18:

| Check                                               | Result                                                                                                     |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| POS backend integration                             | PASS, 20 groups, own database removed                                                                      |
| Real Chromium POS walkthrough                       | PASS, 9 groups, own database removed                                                                       |
| Related frontend suites                             | PASS, 75 tests across POS, vendor dashboard, vendor loyalty, market loyalty and checkout                   |
| Existing vendor loyalty backend                     | PASS, 33 groups, own database removed                                                                      |
| Existing market loyalty backend                     | PASS, 38 groups, own database removed                                                                      |
| Existing marketplace commerce                       | PASS, 42 labeled groups plus additional migration/session checks and nested prior-phase regressions        |
| Existing inventory capacity                         | PASS, 38 labeled groups plus migration/clock/history checks and nested catalog/market/identity regressions |
| Existing paid attribution/refund                    | PASS, 62 groups, including native tax, coupon, refund and prior-phase regressions                          |
| Web TypeScript and Astro check                      | PASS, 95 Astro files with zero errors, warnings or hints                                                   |
| Web storefront and Admin builds                     | PASS                                                                                                       |
| Backend dashboard/server/worker build               | PASS with explicit local test environment settings                                                         |
| Final backend TypeScript, server and worker rebuild | PASS                                                                                                       |
| Targeted ESLint, Prettier and Git whitespace checks | PASS                                                                                                       |

There are no unresolved failures in the executed checks. Early fixture setup, SQL qualification, missing native relations, duplicate heading and mobile geometry issues were corrected without weakening existing tests or database guards. Browser assertions wait for the actual shared dialog lifecycle. The inactive-product test directly persists a disabled variant in the disposable fixture to simulate a separate concurrent catalog writer; it qualifies POS revalidation, not the pre-existing catalog editor's enable/disable command. The invitation completion branch remains an isolated delegation contract test, not a live paid sale.

The first ordinary backend build rejected an unspecified APP_ENV. The successful full build used `$env:APP_ENV='test'; $env:NODE_ENV='test'; npm run build`. The web build used those same local environment values and `FRONTEND_FIXTURE_MODE=false`. No environment or secret file was edited. Builds retain bundle-size warnings and existing fixtures emit a PostgreSQL driver concurrent-query deprecation notice; these did not fail the commands. No screenshot or other image evidence was generated.

## Deliberate boundaries

No Square/Clover charge, merchant OAuth, terminal pairing, hardware claim, payment capture, refund provider adapter, paid/completed UI or in-person loyalty was implemented. These belong to Stages B through G in the roadmap. Cash and externally recorded payment methods are also unavailable.

Native integer quantities and the existing single-currency/exclusive-tax envelope remain in force. No unrestricted cashier price/discount or shipping workflow is exposed. Catalogs are paged at 30 products with at most 100 variants per product and 100 returned categories. Occurrences begin within seven days and must not have ended. Quotes do not reserve stock and require fresh Stage B coordination before charging. A future physical sale must explicitly preserve provenance and keep both loyalty engines gated until Stage G.

The disposable demo uses fallback product icons where media is absent and does not test real hardware, external delivery or production-scale catalog load. Human visual acceptance remains manual. All automated browser inspection is DOM/accessibility based, without screenshots, video, trace or image snapshots.

## Manual handoff

Run `npm run demo:pos` from the web repository. Sign in at `http://auth.platform.localhost:4367/account/login`, enter the vendor workspace at `http://localhost:4585/vendor?channel=2&account=1`, then select In-Person Checkout. Fictional credentials and the full walkthrough/reset steps are in [STAGE_A_TESTING.md](STAGE_A_TESTING.md). No populated database migration is needed or authorized.

A fresh manual demonstration was started after qualification and left running with `vendure_test_pos_demo_1792357760853_4a96a1`. Its current endpoint and channel references are recorded in the ignored `.pos-demo/ready.json`. This instance contains fresh unpaid fixtures, without the browser walkthrough's mutated carts. The market occurrence is rescheduled through the native command to begin one hour after fixture setup, preserving its correct local display date and version. All 20 backend groups passed again after this fixture correction. Stop its owning terminal with Enter or Ctrl+C, then restart the command for a clean fixture.

No deployment, remote Git action, commit, production credential change or protected-database migration occurred. No screenshots were taken.
