# Unified platform identity and secure Market applications

Implementation report, October 10, 2026. Local repositories: `E:\coding\farmers-market-platform-web` and `E:\coding\farmers-market-platform`. This is the single report created for this implementation.

## Executive summary

Implemented verified Market directory linking, explicit Vendor consent for canonical Market relationships, one existing Vendure User identity with separate Customer and Admin credentials, authoritative account/business selection for applications, independent business and date decisions, protected application identity provenance, safe acceptance reversal, and the optional anonymous-applicant signup invitation. The backend-backed Market homepage now advertises eligible published applications.

Actual signup, anonymous application claiming, reusable private documents, new notification delivery, and applicant subscription billing remain deferred. The signup screen is an honest placeholder and creates nothing.

| Gate                                   | Result                       | Evidence                                                                                                                         |
| -------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A: identity and link security          | Passed                       | Real PostgreSQL/GraphQL link, consent, isolation, correction, late-conversion and legacy-upgrade checks                          |
| B: unified account foundation          | Passed                       | Same User, separate session purposes, actual Admin handoff, current tenant grants, multi-business and multi-Market checks        |
| C: independent application/date review | Passed                       | Acceptance creates no date confirmation; explicit date transitions, assignment/invoice guards and audited reversal               |
| D: applicant experience                | Passed                       | Required preamble, real login return, scoped editable autofill, account-only and anonymous submissions, immutable provenance     |
| E: free-account invitation             | Passed                       | Success precedes invitation, dismissal preserves success, signup placeholder and existing claim route remain separate            |
| F: regression and delivery             | Partial: existing lint issue | Functional regressions, browser suites and builds passed. Full lint fails only on the unchanged prior audit Markdown formatting. |

These are local implementation and test results, not evidence that any deployment or persistent production database has been upgraded.

## Exact changes and API contracts

The platform account uses the existing Vendure `User`, native authentication methods, `Customer`, `Administrator`, Roles, Channels, and tenant memberships. It does not introduce a second user/password system. A verified existing Administrator can acquire a Customer profile referencing that same User after password verification and ambiguity checks. This creates no Vendor, Seller, commerce Channel, subscription, or onboarding completion.

Backend additions include `MarketVendorLinkRequest`, directory verification state, assignment identity binding, occurrence decisions, immutable application provenance, `PlatformRoleOnboarding`, `PlatformRoleCommunicationPreference`, and `UnifiedAccountCapability`. Market operations are still implemented through the existing plugin and command service.

| Surface                      | Contract                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin GraphQL                | `ownPlatformAccountContexts`, `ownVendorLinkRequests`, `respondToVendorLink`, `correctMarketVendorLink`, `exchangePlatformAdminHandoff`                     |
| Existing Admin command API   | `REQUEST_VENDOR_LINK`, `REVIEW_OCCURRENCE`, `CONVERT_OCCURRENCE_IDENTITY`; `REVIEW_APPLICATION` accepts explicit reviewed date IDs for reversal             |
| Vendor relationship API      | `requestOwnMarketMembership(marketId, expectedVersion)` records Vendor consent; Market approval remains a separate action                                   |
| Shop GraphQL                 | `platformAccountContexts`, `marketApplicationApplicant`, required `accountAnswer` and optional chosen `vendorId` on public application submission           |
| Shop password authentication | `authenticate(input: { platformShop: { username, password } })`; the frontend operation preserves its `login` result alias                                  |
| Existing account bridge      | Server-only `unifiedTarget`, `unifiedLogin`, `unifiedAuthorize`, `unifiedLogout` actions; existing Customer claim/link actions remain supported             |
| Storefront server routes     | `/account/login`, `/account/signup`, `/api/application-applicant`, `/api/application-progress`; existing account/callback routes extended for secure return |

Shop/Admin schemas and typed documents were regenerated through `graphql:schema` and `graphql:codegen`, using backend source extraction without a database bootstrap.

## Vendor linking security

Previously, a manager-selected canonical Vendor ID could act as an authoritative directory association, and operational approval could manufacture canonical relationships. A name or email match was not adequate ownership evidence.

Managers now request a link. Requests do not expose booth, invoice, customer, catalog, or order information to the proposed Vendor. An active owner with the current exact Vendor-channel participation capability must confirm. Market permission and membership checks remain separate. Fresh grants are loaded from the database, including during the locked mutation, so cached sessions cannot retain revoked authority.

Only `LINK_VERIFIED` directory associations grant Vendor-facing operational access, and an assignment must independently carry the matching `verifiedVendorId`. The database permits only one verified directory association for a Vendor within a Market. It does not merge duplicate external or legacy businesses.

Ordinary corrections use a new request and suspend the previous association's authority while verification is pending. Exceptional platform corrections require a freshly loaded SuperAdmin grant, expected revision and nonempty reason. Audit records retain the actor, time, prior identity/state, proposed identity and reason. Corrections preserve directory IDs, submissions, assignments and billing snapshots. A new Vendor cannot inherit old external assignment history merely through a corrected link.

All preexisting non-null directory links become `LEGACY_UNVERIFIED`; old canonical Market memberships receive `LEGACY_UNVERIFIED` consent. Existing references are preserved. Neither old links nor a legacy approved membership silently become proof of Vendor consent.

Late linking leaves existing approvals and assignment identity untouched. Future approvals without assignment history can be explicitly associated only after an approved, consented canonical membership and an already confirmed canonical participation exist. Past occurrences and any approval with assignment history cannot be converted. Operational linking, membership, attendance, catalog publication and preorder offerings remain independent actions.

## Unified account identity and account modes

Customer access uses persisted `platformShop` sessions. Admin handoff issues a native Admin session only for an active Administrator and the configured exact Admin origin. Customer authentication never carries privileged Role grants into Shop authorization, and a Shop session cannot be reused against Admin APIs. Native Admin login remains available. Native Shop password login is disabled to prevent an old Customer credential from later gaining Admin authority.

Capabilities contain stored digests, explicit purposes, target binding, expiry and single-use consumption. Central capabilities rotate when issuing a handoff. Shop handoffs bind to the actual active storefront, origin, channel and browser correlation. Admin redemption requires the exact request Origin and correlation and sets the existing HttpOnly session cookie. The server bridge authenticates its key and central origin. Session invalidation and expiry are checked against persisted state, beyond session-cache contents. Adding the native Customer Role inserts only that specific grant, so it cannot restore an administrative Role concurrently revoked after the login read. A real database regression exercises that interleaving.

The Admin mode selector loads authoritative affiliations, then restores and revalidates the selected channel through the existing context bootstrap. Vendor and Market selectors show only current active memberships with exact current grants. Multiple businesses and Markets share the same principal. Customer mode returns through central authentication to the configured storefront account page. Admin sessions and Customer sessions retain distinct logout scopes; Customer-wide logout does not silently reinterpret Admin credentials.

Application progress is compressed and encrypted with AES-256-GCM using a purpose-derived bridge key. It is retained in up to three short-lived HttpOnly, same-site, path-scoped cookies, rather than browser storage. A separate encrypted binding records nonce, origin, safe application path, expiry and principal. An anonymous draft can bind to the actual returning verified principal. A draft already associated with another principal is rejected. Successful restoration consumes the binding and clears the draft cookies. The limit is 9,900 encoded characters and ten minutes; an oversized or unavailable draft stops navigation while keeping answers on the current screen. Admin return correlation is a short-lived, first-party nonce cookie, distinct from authentication credentials.

Onboarding is explicitly separate from membership: `NOT_STARTED`, `IN_PROGRESS`, `PENDING_REVIEW`, `COMPLETED`, `SUSPENDED`, `CLOSED`, with independent provenance. Missing legacy state is `NOT_STARTED`/`UNKNOWN`. Existing owners/managers are not automatically marked as completed signups. There is no public shortcut that marks onboarding complete.

Platform role communication eligibility requires a current role affiliation and a completed `VERIFIED_SIGNUP` record with completion time and evidence. Role updates also require explicit opt-in; promotion requires current matching policy consent and no withdrawal. These records do not create campaigns or replace existing Market/customer communication preferences.

Configuration extends the existing account setup with backend `ADMIN_ORIGIN` and Admin build values `PLATFORM_ACCOUNT_ORIGIN` and `CUSTOMER_STOREFRONT_ORIGIN`. The existing server-only bridge secret stays server-only. No environment files or live credential values were changed.

## Application workflow

Every public form renders the platform-owned required account Yes/No question before editable Market questions. The builder shows the protected preamble separately. The backend rejects missing or malformed choices and rejects attempts to insert the reserved identity question into the configurable definition. Existing templates are not rewritten to add it.

Yes requires an authoritative verified session. Account-only applicants can submit without Vendor ownership. Owners choose among their current authorized Vendors; arbitrary IDs and revoked authority are rejected again at submission. Staff do not automatically gain apply-on-behalf rights. An existing verified directory association can be reused during acceptance; the backend revalidates ownership before treating applicant provenance as link evidence.

No permits fully anonymous submission. A signed-in person deliberately choosing No is recorded as anonymous opt-out, with no principal or Vendor association. Neither choice provisions commerce identities or claims previous submissions by matching email.

Autofill uses existing question semantics and only available profile data. Email comes from the verified User identifier; business name comes from the selected authorized Vendor. Unsupported descriptions, websites, social profiles, categories and documents are not invented. Empty compatible fields can be filled, existing/custom answers are preserved, and the applicant can edit the final response without changing a global profile.

Final answers, template definition and rental prices remain submission snapshots. Separate provenance records distinguish `ANONYMOUS`, `ACCOUNT_ONLY`, `AUTHORIZED_VENDOR`, and legacy `LEGACY_UNKNOWN`. PostgreSQL prevents later mutation of identity provenance and submitted requirements. This phase does not associate old anonymous responses with accounts.

Business acceptance creates/reuses the appropriate directory business and records the decision. It does not confirm dates, reserve booths/rentals, issue invoices, approve canonical memberships, publish products, create preorder offerings, or change subscriptions. The previous combined accept-and-assign command is rejected.

Requested dates have independent pending, confirmed, waitlisted, declined or cancelled decisions. Confirmation is deliberate and requires assignment-management authority. The UI distinguishes incomplete booth dimensions, unchecked availability, compatible space and unavailable compatible space. Confirmation itself makes no reservation. Assignment still validates actual requirements, electricity/vehicle/food-truck compatibility, occupancy and rental capacity. A verified Vendor also needs the exact confirmed canonical participation.

Accepted applications can subsequently be declined/withdrawn through an audited, revision-checked transition after the affected dates are explicitly reviewed. Future confirmed dates must first be cancelled. Releasing assignments and voiding draft invoices require explicit choices and appropriate permissions. Open/paid invoices block silent cancellation. Cancelled assignments remain historical rows, rental allocations and invoice snapshots are retained, and released capacity is computed from active assignments. Historical dates and billing facts are not rewritten.

## Free signup placeholder

After committed anonymous submission, the normal success confirmation appears first. The free-account invitation is optional. **Maybe Later** dismisses it without losing success. **Claim My Free Account** navigates to `/account/signup`.

The placeholder explains that signup and the advertised free-account features are coming. It has no registration fields, password collection, account provisioning, subscription or claim capability. It permits return to the Market. The existing real Customer `/auth/claim` route remains separate and was exercised in the existing checkout/account browser regression.

## Testing and validation

Counts below distinguish frontend assertions from backend grouped checks. Recursive groups overlap and should not be summed into a unique test total. Expected denial logs are part of attack tests, not successful unauthorized actions. Browser tests used real local servers and backend writes, not fixture-mode UI substitutes.

| Check                                                                            | Result                                           | Kind                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend `npm test`                                                              | 287 passed, 0 failed, 20 files                   | Unit/component/mock tests, including four real crypto/cookie helper checks                                                                                                                |
| Verified relationships                                                           | 12 passed, 0 failed                              | Real guarded PostgreSQL and GraphQL/service authorization                                                                                                                                 |
| Unified account                                                                  | 15 passed, 0 failed                              | Real User/session/capability/tenant/onboarding integration, including concurrent administrative Role revocation                                                                           |
| Application identity and review                                                  | 17 passed, 0 failed                              | Real writes, permissions, date decisions, assignment/invoice guards and provenance                                                                                                        |
| Legacy populated-schema upgrade                                                  | 5 passed, 0 failed                               | Real old migration chain upgraded with duplicate links and historical operational/billing snapshots                                                                                       |
| Existing Market operations                                                       | 21 passed, 0 failed                              | Real booth, capacity, invoice, day, tenant and revocation regressions                                                                                                                     |
| Existing platform identity                                                       | 19 recorded groups passed                        | Real backend, including migration and same-session revocation                                                                                                                             |
| Existing farmers-market                                                          | 25 recorded groups passed                        | Real memberships, attendance, recurrence and prior identity regression                                                                                                                    |
| Existing catalog publication                                                     | 29 recorded groups passed                        | Real ownership/publication/preorder and prior-phase regression                                                                                                                            |
| Customer relationship focused run                                                | 59 passed, 0 failed                              | Real privacy, purchase attribution, workers, history and safe cleanup                                                                                                                     |
| New unified account browser suite                                                | 6 passed, 0 failed                               | Actual central password login, draft return/autofill, mode switching, authoritative persisted submissions, axe checks                                                                     |
| Existing Market storefront browser suite                                         | 5 passed, 0 failed                               | Actual SSR, catalog/cart/channel isolation, accessibility at 390/768/1280px                                                                                                               |
| Existing Vendor storefront browser suite                                         | 7 passed, 0 failed                               | Actual SSR, catalog/cart, copied-session isolation, accessibility and current revocation                                                                                                  |
| Existing checkout/account browser script                                         | Passed, exit 0                                   | Real unclaimed purchase, later claim, local payment, account history and cross-domain SSO; custom script does not emit a numeric assertion total                                          |
| Frontend typecheck                                                               | Passed; 57 Astro files, no errors/warnings/hints | TypeScript and Astro                                                                                                                                                                      |
| Backend operations and frontend-integration typechecks                           | Passed                                           | TypeScript                                                                                                                                                                                |
| Source schema extraction and code generation                                     | Passed                                           | Offline actual source contract generation                                                                                                                                                 |
| Final local production build                                                     | Passed                                           | Storefront, Admin, Vendure dashboard, server and worker with synthetic production settings                                                                                                |
| Bundle marker check                                                              | Passed, 82 files                                 | Built artifact fixture/credential marker check, not an exhaustive secret audit                                                                                                            |
| ESLint and package boundaries                                                    | Passed, 9 workspaces                             | Actual repository checks                                                                                                                                                                  |
| Full `npm run lint`                                                              | Failed on one preexisting document               | Prettier reports `docs/vendor-application-account-identity-audit.md`; that prior audit was left unchanged                                                                                 |
| Final recursive communications/POS/payments/CRM/finance/commerce/inventory chain | Passed, exit 0                                   | Communications 26 groups; POS 39 direct groups plus regression confirmation; payments 74 passed and 2 sandbox cases not executed; CRM 66, finance 62, commerce 47 and inventory 42 passed |

Existing fixtures now establish actual Vendor consent before Market approval. Fixture-created additional Vendors receive exact owner grants and refreshed channel contexts. Historical rollback tests invoke their original migration class rather than accidentally testing the newly appended forward-only migration. Their restrictive history assertions remain intact. Recursive test timeouts were extended to accommodate the evolved migration/fixture chain; authorization assertions were not relaxed.

Earlier attempts exposed outdated unilateral-consent fixtures, guards targeting the wrong latest migration, short nested timeouts and local cookie-site setup. Those issues were corrected. A sandbox filesystem restriction initially prevented the Vendure dashboard build; the approved local retry passed. Failed test databases were retained by the existing guard until applicable successful owned cleanup; no blanket database cleanup was performed.

No real Stripe sandbox/OAuth, email, SMS, signup, hosting or payment-provider calls were made. Provider tests use deterministic fake ports/transports; provider-dependent sandbox cases are explicitly unexecuted. Local full-stack checkout uses its existing fake/local payment adapter. Historical evidence under `docs/evidence` was preserved.

### Reproduction commands

Run frontend commands in `E:\coding\farmers-market-platform-web` with evidence writing disabled:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npm test
npm run typecheck
npm run lint
npm run graphql:schema
npm run graphql:codegen
npm run build:production-local
npm run check:bundles
npx tsx scripts/test-unified-account.ts
npm run test:live:checkout-account
npm run test:live:market-storefront
npm run test:live:vendor-storefront
```

Run backend commands in `E:\coding\farmers-market-platform`. Integration runners create guarded disposable databases through the existing local test infrastructure:

```powershell
npm run test:market-operations:types
npx tsc --noEmit --project test/frontend-integration/tsconfig.json
npm run test:market-operations
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/verified-relationships.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/unified-account.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/application-identity.ts
npx ts-node --project test/market-operations/tsconfig.json test/market-operations/legacy-upgrade.ts
npm run test:platform-identity
npm run test:farmers-market
npm run test:catalog-publication
npx ts-node --project test/customer-relationships/tsconfig.json test/customer-relationships/run.ts --workers-only
npm run test:communications
```

The local production build command invokes backend `npm run build` through the existing synthetic environment helper. Browser scripts use their own temporary local ports; avoid overlapping browser runs that share those ports or the Storefront output directory. These commands do not deploy or upgrade a persistent database.

## Database safety and migrations

All integration databases were created through `freshTestDatabase`, checked for the guarded `vendure_test_*` namespace, and scoped to the creating test process. Successful owned databases were dropped. Failed runs may leave isolated diagnostic databases under that namespace. No query, migration, seeding or mutation was executed against the protected `vendure` database.

New forward-only migrations:

| File in backend `src/migrations`                 | Effect                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `1791690000000-MarketRelationshipConsent.ts`     | Add membership consent state/provenance; legacy relationships stay unverified                                                      |
| `1791700000000-VerifiedMarketRelationships.ts`   | Add directory verification, pending-link requests, verified-only uniqueness, decisions and nullable assignment Vendor binding      |
| `1791710000000-PlatformAccountFoundation.ts`     | Add role onboarding and separate communication preferences; invalidate ambiguous legacy native sessions attached to Customer Users |
| `1791720000000-UnifiedAccountCapabilities.ts`    | Add digest-only, purpose-bound central/Shop/Admin handoff capability storage                                                       |
| `1791730000000-ApplicationIdentityProvenance.ts` | Add legacy-safe application provenance, constraints and immutability trigger                                                       |

The populated upgrade test retained duplicate directory IDs, old answers and definitions, published-map snapshots, participation references, historical assignments and paid invoice snapshots. It did not fill historical assignment identity or infer onboarding completion. Original migrations were not rewritten.

Existing native Customer sessions require reauthentication after the account foundation migration. Existing Shop password clients must use the purpose-tagged authentication strategy. Applying these migrations to any persistent environment requires a separate deliberate maintenance/upgrade action; none was performed here. Forward-only migrations do not offer destructive rollback shortcuts.

Representative successful disposable databases include:

```text
vendure_test_operations_1791669445653_ec2e7a   verified links and explicit late conversion
vendure_test_operations_1791670501993_ca600b   final unified account integration, including concurrent Role revocation
vendure_test_operations_1791668571930_2a9d23   application identity and review
vendure_test_identity_upgrade_1791668210384_3bf518   populated legacy upgrade
vendure_test_operations_1791669642445_15151b   existing operations regression
vendure_test_operations_1791669852763_af05af   final unified browser checks
vendure_test_checkout_1791669575200_2d27bd   existing checkout/account browser checks
vendure_test_marketshop_1791669817885_aa2354   existing Market storefront browser checks
vendure_test_storefront_1791670034906_c2702e   existing Vendor storefront browser checks
vendure_test_crm_1791669893270_562c7a   focused Customer relationship regression
```

## Outstanding work

The prior audit's Markdown formatting is the remaining known frontend lint blocker. It was already present in the working tree and was not rewritten as part of this implementation. The final recursive backend regression chain passed. The two Stripe sandbox cases were intentionally not executed.

Deferred product work: real free signup and onboarding completion, narrowly defined staff apply-on-behalf capability, secure submission-bound anonymous claiming, application-history UI, reusable private documents with explicit Market sharing, document snapshots, notification delivery/preferences UI, and any account-only entitlement/billing extension. Marketing policy values and signup completion evidence need a future actual onboarding workflow. None of these features is presented as operational.

Private document uploads remain outside generic catalog assets. Anonymous applications remain unclaimed, even if a subsequently verified account uses the same email. Existing independent Market/customer campaigns remain independent.

## Final file inventory

The repositories already contained substantial unrelated uncommitted work. This inventory lists task changes and generated contracts, not every dirty file. Preexisting dashboard/layout/demo work and the earlier audit were preserved. Formatting was limited to source/tests changed for this task. No remote repository, commit push, PR, remote branch, hosting, deployment, DNS or connector activity occurred.

Backend source files, relative to `E:\coding\farmers-market-platform`:

```text
src/plugins/platform-identity/account-foundation.ts
src/plugins/platform-identity/account-session-policy.ts
src/plugins/platform-identity/api.ts
src/plugins/platform-identity/platform-identity.plugin.ts
src/plugins/platform-identity/shop-context.middleware.ts
src/plugins/farmers-market/api/admin-api.ts
src/plugins/farmers-market/entities/market.entities.ts
src/plugins/farmers-market/services/market-vendor-membership.service.ts
src/plugins/farmers-market/services/participation.service.ts
src/plugins/market-operations/vendor-links.service.ts
src/plugins/market-operations/api.ts
src/plugins/market-operations/entities.ts
src/plugins/market-operations/model.ts
src/plugins/market-operations/service.ts
src/plugins/market-operations/market-operations.plugin.ts
src/plugins/marketplace-commerce/customer-account/api.ts
src/plugins/marketplace-commerce/customer-account/controller.ts
src/plugins/marketplace-commerce/customer-account/entities.ts
src/plugins/marketplace-commerce/customer-account/options.ts
src/plugins/marketplace-commerce/customer-account/service.ts
src/plugins/marketplace-commerce/commerce/contracts.ts
src/plugins/marketplace-commerce/market-browse.interceptor.ts
src/plugins/marketplace-commerce/marketplace-commerce.plugin.ts
src/vendure-config.ts
src/migrations/1791690000000-MarketRelationshipConsent.ts
src/migrations/1791700000000-VerifiedMarketRelationships.ts
src/migrations/1791710000000-PlatformAccountFoundation.ts
src/migrations/1791720000000-UnifiedAccountCapabilities.ts
src/migrations/1791730000000-ApplicationIdentityProvenance.ts
```

Backend tests and fixtures:

```text
test/market-operations/harness.ts
test/market-operations/run.ts
test/market-operations/verified-relationships.ts
test/market-operations/unified-account.ts
test/market-operations/application-identity.ts
test/market-operations/legacy-upgrade.ts
test/market-operations/account-experience-server.ts
test/platform-identity/config.ts
test/platform-identity/client.ts
test/farmers-market/run.ts
test/catalog-publication/run.ts
test/inventory-capacity/fixture.ts
test/inventory-capacity/run.ts
test/marketplace-commerce/fixture.ts
test/marketplace-commerce/acceptance.ts
test/paid-attribution-refund/acceptance.ts
test/customer-relationships/acceptance.ts
test/customer-relationships/run.ts
test/payments-stripe/run.ts
test/pos-integrations/run.ts
test/communications/fixture.ts
test/communications/acceptance.ts
test/communications/run.ts
test/frontend-integration/cookie-client.ts
test/frontend-integration/market-storefront-run.ts
```

The backend build also refreshes generated `src/gql/graphql-env.d.ts`, which was already modified at task start. Test runtime output stays in the existing ignored `.runtime` directories.

Frontend source and contracts, relative to `E:\coding\farmers-market-platform-web`:

```text
apps/admin/src/AdminApp.tsx
apps/admin/src/AccountModes.tsx
apps/admin/src/account-login.ts
apps/admin/src/account-env.d.ts
apps/admin/src/main.tsx
apps/admin/vite.config.ts
apps/admin/src/vendor/markets.tsx
apps/admin/src/vendor/service.ts
apps/admin/src/market/phase14/ApplicationBuilder.tsx
apps/admin/src/market/phase14/Applications.tsx
apps/admin/src/market/phase14/ApplicationReview.tsx
apps/admin/src/market/phase14/Directory.tsx
apps/admin/src/market/phase14/OperationsRoutes.tsx
apps/storefront/src/components/MarketApplication.tsx
apps/storefront/src/components/MarketPublicHome.astro
apps/storefront/src/lib/account.ts
apps/storefront/src/lib/application-progress.ts
apps/storefront/src/pages/index.astro
apps/storefront/src/pages/account/index.astro
apps/storefront/src/pages/account/login.astro
apps/storefront/src/pages/account/signup.astro
apps/storefront/src/pages/api/account.ts
apps/storefront/src/pages/api/market-application.ts
apps/storefront/src/pages/api/application-applicant.ts
apps/storefront/src/pages/api/application-progress.ts
apps/storefront/src/pages/auth/callback.ts
packages/config/src/index.ts
packages/api/src/checkout.ts
packages/api/src/market-operations.ts
packages/api/operations/checkout.graphql
packages/api/operations/market-operations.graphql
packages/api/operations/public-market-operations.graphql
packages/api/operations/shop.graphql
packages/api/schema/admin.graphql
packages/api/schema/shop.graphql
packages/api/schema/provenance.json
packages/api/src/generated/admin.ts
packages/api/src/generated/shop.ts
scripts/extract-schema.ts
scripts/test-unified-account.ts
tests/application-progress.test.ts
tests/market-application.test.tsx
tests/market-dashboard.test.tsx
tests/vendor.test.tsx
docs/unified-platform-identity-implementation.md
```

No package installation or dependency-manifest changes were introduced by this task. Existing modified manifests and earlier reports remain the user's prior work.
