# Team permissions Phase A

## Mutation response correction

Product and inventory writes could commit successfully while the client received `You provided an invalid object where a stream was expected`. The Phase A `BusinessApiBoundary` interceptor returned the transaction's plain result from its asynchronous method. Nest expects that method to resolve to an Observable and subsequently flattens it, so response delivery failed after commit.

The interceptor now wraps its transaction Promise with RxJS `from()`. The membership lock, transaction boundary, business authorization, resolver execution, and request-context restoration are retained. This fixes the shared response path for affected business mutations without changing employee grants or adding a migration.

`test/market-operations/team-permissions.ts` now exercises actual GraphQL HTTP product creation/updates and inventory adjustments for Owner, Administrator, Lead, and a Staff membership explicitly granted edit capabilities in the disposable test database. It checks committed product content, a single inventory delta, successful mutation responses, and idempotent retries returning the same receipt. The original code reproduced the exact stream error; the correction passed all 13 security groups and the full backend build.

The running backend was restarted through `npm run demo:market-operations:serve`. Normal local sign-in checks against the existing primary Phase A Vendor confirmed successful product, price, and inventory responses for Owner, Administrator, and Lead. Default Staff remains denied for those edits. Live checks used unchanged product/price values and zero-quantity inventory adjustments; stock and employee grants were preserved. No database migration or frontend change is required.

## Populated permission test businesses

The local `vendure_demo_market_ops` database now contains additive test records for `Phase A primary Vendor` (Vendor 42, Channel 55) and `Phase A primary Market` (Market 13, Channel 56). The four existing `team-phase-a-{owner,administrator,lead,staff}@test.invalid` accounts retain their existing memberships and grants. Their existing fixture password is `Local-Team-Phase-A-2026!`.

- Vendor: four added products with variants, prices, and canonical stock: Wildflower honey, Sourdough loaf, Seasonal vegetable box, and Strawberry preserves. Initial stock was 40 each. Three completed, delivered cash POS sales leave quantities 39, 39, 39, and 40. The existing Berry Beet Juice product is preserved, giving five total catalog products. The dedicated Vendor also has an active storefront and confirmed participation on all four Market dates.
- Market: November 7, 14, 21, and 28, 2026, from 9 am to 2 pm America/Chicago; one published application; four submissions in accepted, waitlisted, needs-information, and submitted states; three directory records; one rental option; one published layout with four booths; three assignments on November 7; and three $40 invoices in draft, open, and paid states. These records are local examples, with no external payment provider calls.

Open [Vendor workspace](http://localhost:4322/vendor?channel=55) or [Market workspace](http://localhost:4322/market?channel=56) after signing in with the account being tested. Select November 7 for populated assignments and booth billing. Day-to-day attendance remains available for manual testing; the three Vendor sales are completed counter sales, rather than unfulfilled pickup orders.

Normal local sign-in and Admin API checks passed for all eight account/workspace combinations. All four accounts can read Vendor catalog, inventory, orders, and POS, and Market applications and assignments. Owner/Administrator can read finance, layouts, and booth billing. Lead/Staff receive `FORBIDDEN` for finance and booth billing; Staff also receives `FORBIDDEN` for layouts and an attempted product-price edit. Each account is denied catalog reads on the separate other Vendor. These checks verify selected backend gates; they do not claim exhaustive UI or capability coverage.

The new backend `scripts/market-operations-demo/team-permissions-data.ts` uses existing domain services, the guarded fixture action in `run.ts`, stable inventory/payment operation keys, and a transactional Market completion marker. Retry verification confirmed exactly three completed sales, unchanged post-sale stock, four applications, three assignments/invoices, and identical employee grants. Backend fixture typechecking and the full backend build passed.

Already applied locally. To rerun the additive setup from the web project, use `npm run demo:market-operations:team-permissions-data`. It preserves existing employee grant edits and completed workflow records. It does not reset or replace the test dataset. Web changes for this request are the npm shortcut in `package.json` and this report; backend changes are the new data module and its guarded dispatch.

## Employee workspace login correction

The Lead/Staff loading loop was reproduced through the running local sign-in and Admin APIs. All four combinations of Lead/Staff and Vendor/Market completed login, session restoration, account-context discovery, and business identity checks successfully. Both overview pages then mounted document-compliance reads despite lacking `ReadOwnDocuments`. The resulting `FORBIDDEN` response reset the workspace, causing the same read on every remount.

The existing Vendor and Market overview components now mount compliance panels only with document read authority. Vendor catalog and order overview reads also check their respective read capabilities. `AdminApp.tsx` coalesces authority-error checks, restores the current session, and compares current workspace authority before refreshing. A denied resource with unchanged authority keeps its stable page error. Actual permission changes still refresh the workspace; a revoked membership shows a stable unavailable screen. Backend authorization and employee grants are unchanged.

Regression coverage in `tests/employee-overview.test.tsx` and `tests/admin-authority-refresh.test.tsx` includes both employee labels in both workspaces, a base-read-only Vendor, the authorized Owner compliance panel, coalesced permission denials, changed permissions, and revoked membership. The focused run of these files plus team-permissions, unified-authentication, and account-switching tests passed all 35 tests. Scoped TypeScript checking and the Admin production build passed. The running local Admin dev server was checked to confirm it serves all three corrected modules. No migration or fixture reset is needed for this correction.

Implemented locally across the web and backend repositories on October 31, 2026. This is the ownership and employee authorization foundation. Invitations, acceptance, employee management screens, permission checklists, ownership transfer, and business deletion workflows are not implemented.

## Implementation summary

The existing Vendure User, Administrator, channel Roles, TenantMembership, TenantAccessPolicy, OwnershipDirectory, specialist domain services, and unified account infrastructure remain in use. There is no second authentication system or JSON permission store.

Each membership has a dedicated native Role on exactly its business Channel. Live authorization reads that Role rather than the union of unrelated native Roles. Current active membership, a live native Administrator/User, the selected business Channel, resource ownership, entitlements, and domain checks remain required. Ordinary operational capabilities work for Administrator, Lead, and Staff without an Owner label.

The frontend changes are limited to recognizing the new roles, using the corresponding read/action permissions, and keeping protected provider actions behind Owner checks. Existing components, dashboard shells, layouts, and interactions are reused. No UI primitive or competing design standard was created.

## Database and protected ownership

Backend migration: `src/migrations/1795300000000-TeamPermissionsPhaseA.ts`.

- `platform_business_ownership` binds each Vendor or Market to one protected membership, with restrictive foreign keys, unique subject/membership references, and evidence text.
- Membership roles persist as `owner`, `administrator`, `lead`, or `staff`. Historical `marketAdmin` rows become Administrators unless trusted evidence or an explicit resolution identifies them as the Owner.
- Memberships gain `managedRoleId`, `delegationRoleId`, `grantRevision`, and `presetVersion`. Effective grants and delegation ceilings are native Role permission arrays. Ceiling Roles are never assigned to Users.
- Partial unique indexes prevent multiple Owners. Checks require Owner memberships to be active. Triggers reject Owner removal, demotion, principal replacement, membership reassignment, managed Role replacement, and ownership-row update/deletion.
- Deferred constraint triggers require every business to have its valid protected Owner at transaction commit. Provisioning and initial ownership must occur in the same transaction. Existing unified signup and platform provisioning with an explicit initial principal do this. Low-level callers must not commit an unowned business as an intermediate step.
- Ordinary onboarding suspension/closure suspends the business instead of revoking its protected Owner. Ownership stays intact and operational business checks deny suspended access.
- Billing provider operations gain a membership reference for newly accepted employee work. Pending work reauthorizes before provider execution; revoked authority cancels it. Recovery of provider calls already started uses the durable financial operation's service authority. Historical durable operations retain their existing service authority.

The migration is transactional and does not reset, truncate, seed, or replace existing business/customer data. A single existing active Vendor Owner is trusted provisioning evidence. Market ownership requires matching verified signup onboarding evidence. Missing or duplicate candidates stop Phase A before schema changes. Explicit resolutions validate the exact active native Administrator membership and retain the operator's evidence. Unselected legacy Owners become Administrators with their original allowlisted grants, rather than receiving an Administrator preset.

Non-owner Role backfills copy only existing exact-channel permissions intersected with the explicit allowlist. No employee preset or newly separated sensitive-read permission is automatically granted to existing non-owners. Protected Owners receive the applicable full business grant set, including the protected provider permissions, while entitlements and domain safeguards still apply. Generic legacy Role assignments are retained for data preservation but do not contribute to business authorization.

Downgrade deliberately refuses to discard ownership and employee grants; it requires a separately reviewed preservation migration.

## Business roles and capabilities

The backend's `business-capabilities.ts` is the explicit allowlist and preset registry. Native `Permission.Owner` remains a customer/resource concept. Business capabilities never confer platform SuperAdmin or generic native role, Administrator, Channel, customer, order, or catalog administration.

| Role          | Foundation behavior                                                                                                                                              |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owner         | Protected identity with all applicable business capabilities. Cannot edit away ownership through team commands.                                                  |
| Administrator | Suggested full delegable operational grant set. Can manage only existing Lead/Staff members when explicitly granted team authority and an Owner-defined ceiling. |
| Lead          | Suggested operational/supervisory grants, copied once and individually customizable through the foundation service.                                              |
| Staff         | Suggested limited operational grants, copied once. No finance, CRM, refunds, team administration, or integration ownership by default.                           |

Presets are suggestions, not continuously applied policy. Role labels do not grant ordinary workflow authority. The team writer's additional hierarchy safeguards prevent Administrator self-edits, peer edits, assigning Owner/Administrator, or using another employee to escalate. Both existing target grants and requested grants must fit the actor's current authority and the Owner-defined ceiling. An absent ceiling delegates nothing.

Existing business permissions cover catalog changes, inventory adjustment, POS, participation/applications, CRM/loyalty, finance/refunds, publication/storefronts, subscription billing, Market applications/layouts/assignments/scheduling/attendance/booth billing, analytics, and communications. Meaningful additions separate:

- `ReadOwnCatalog` and `ReadOwnInventory` from modification.
- `ReadOwnOrders`, `FulfillOwnOrders`, and `CancelOwnOrders` from inventory modification.
- `ReadOwnMarketOrders` from Market workspace discovery, including the separate customer-order projection.
- `ReadOwnDocuments` and `ManageOwnDocuments` from workspace discovery and storefront editing.
- `ConfigureOwnPosIntegrations` for existing mappings/policies from protected provider connection ownership.
- `ManageOwnMarketTeam` from Vendor participation relationships in a Market.

Packing reads require order access, and packing changes require fulfillment authority. POS order-payment detail requires financial read authority. Workspace base reads do not authorize catalog, inventory, sensitive order/customer projections, documents, or finance. Existing compound workflow requirements remain in force. New permissions are registered and reflected in regenerated Shop/Admin contracts.

Protected operations are explicitly enumerated as transfer, business deletion, legal identity, payout ownership, banking, and provider ownership. `BusinessTeamService.requireOwner()` supplies the live non-delegable boundary for future workflows. Stripe/POS ownership commands retain protected Owner checks; QuickBooks connect, complete, and disconnect now check protected ownership explicitly. There is no new legal-identity, transfer, or deletion endpoint.

## Authorization safeguards

`business-authority.ts` resolves the exact business and current active membership, verifies its dedicated Role code and sole Channel, and verifies the Role is assigned to the principal. It ignores additive native Roles for employee business authority. Native platform SuperAdmin remains separately trusted platform authority.

`AccountSessionAccessStrategy` retains session lifetime, purpose, phone proof, live Administrator, and Shop/Admin separation checks. It evaluates current managed grants at every native permission gate and replaces the selected request's cached permission projection. Other workspace Channels remain available for switching. Cached permission snapshots cannot preserve a revoked employee's authority.

The typed native API boundary rejects sensitive native/nested entity graphs, including fragment/alias traversal, for business users. Owned DTOs and their resource checks remain the supported access paths. This supplements the existing customer-privacy and native-writer guards.

Tenant, billing, analytics, communications, applicant/document, and notification authorities use managed grants. Notification recipient projection and inbox reads use the membership's managed Role, preventing an unrelated Role from exposing business notifications. Provider callbacks reload current employee/Owner authority where applicable. New pending billing operations retain a membership reference and reauthorize at claim.

Transactional authority reads lock membership before reading grants. Grant writers/revocation lock the affected membership and update Role permissions, assignment, membership revision, audit, and outbox facts atomically. Protected local GraphQL mutations hold that lock until commit. Specialists that prepare and commit before provider I/O keep their existing transaction boundaries and result/recovery safeguards; no outer transaction is introduced across their network calls. Native Role saves also invoke Vendure's cache invalidation, while live database checks remain authoritative regardless of cache timing.

## Existing functionality preserved

Unified email/password login, personal phone identity, central capabilities, purpose-separated Shop/Admin handoffs, native sessions, workspace switching, and multiple independent business memberships are retained. Resource attribution is still enforced by OwnershipDirectory and the existing protected resource-ownership service. Existing inventory locks, order portions, original financial attribution/refunds, application provenance, billing safeguards, consent, provider readiness, and entitlement checks are retained.

The reusable fixture setup creates its own Users, Administrator records, verified local test identities, memberships, and dedicated businesses through the established provisioning/team services. Retries reuse these identities/businesses and do not reset customized or revoked employee grants. It never modifies Manna Roots, the Boerne Manager, or other established accounts.

## Automated verification

| Check                                                                       | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:team-permissions` in backend                                  | 12 focused disposable PostgreSQL security groups passed. The suite covers missing/ambiguous ownership, populated duplicate-Owner resolution, non-owner grant preservation, Owner protections, real delegated catalog creation and scheduling, cross-business denial, independent memberships, sensitive base-read denial, native Role unions/nested APIs, delegation limits, stale sessions, queued billing cancellation, and concurrent revocation. Successful disposable databases are dropped by the existing guard. |
| Backend `npx tsc --noEmit --pretty false`                                   | Passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Backend `$env:APP_ENV='dev'; $env:NODE_ENV='development'; npm run build`    | Dashboard, server, and worker passed. Follow-up server builds also passed after authorization refinements. Plain build without explicit development settings initially hit the existing environment policy.                                                                                                                                                                                                                                                                                                             |
| Web `npm run graphql:schema` and `npm run graphql:codegen`                  | Passed offline, without bootstrap or database access.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Web `npx tsc --noEmit --project tests/tsconfig.packing.json --pretty false` | Passed for the changed admin/auth/packing dependency graph.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Web targeted unified-authentication/account-switching/team tests            | 26 tests passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Web packing and team tests                                                  | 22 tests passed after updating the packing fixture's explicit fulfillment grants.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Existing admin navigation regression                                        | Passed after updating its Owner fixture for the new read capabilities.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

An initial disposable run exposed an initialization-order bug, which was fixed before the successful runs. Its isolated database `vendure_test_team_permissions_1793474314126_ee9f0e` was retained by the existing failed-test guard. Two stricter test-assertion runs also retained `vendure_test_team_permissions_1793475957071_112dd3` and `vendure_test_team_permissions_1793478281332_7863ba`: the native Administrator traversal correctly returned `FORBIDDEN` before reaching the additional typed boundary. The final traversal test uses the authenticated native Channel root to exercise that boundary directly.

A broader root web TypeScript check found existing application review mock signature errors in `application-phase-d`, `phase15`, and related review tests, plus the obsolete `retire` prop in `occurrence-layouts.test.tsx`. These test contracts were not changed here. The initial targeted `admin.test.tsx` run also contains a pre-existing test expecting the retired native password form (`Sign in` and `Password`); unified-authentication tests pass and that obsolete expectation was left untouched. No broad backend/frontend suite or browser/screenshot run was performed. A pg client concurrency deprecation warning occurs during native catalog fixture work; the focused assertions pass.

## Safe migration and ownership resolution

**Phase A was applied to the local `vendure_demo_market_ops` database on October 31, 2026, after explicit user authorization of all 12 Market Owners.** The guarded web-directory `npm run demo:market-operations:migrate` command applied `TeamPermissionsPhaseA1795300000000` successfully. Follow-up guarded inspection reported no pending migrations. No reset, reseed, fixture setup, or application bootstrap was performed.

Post-migration verification confirmed all 12 approved Market Owner memberships, all 38 existing Vendor Owners, and valid dedicated native Roles for all 50 existing memberships. Read-only data fingerprints across 290 existing tables matched the baseline after excluding only the intended membership role changes and newly added nullable columns. Legacy native Roles and their existing Channel/User assignments were preserved. Business, customer, order, inventory, and financial data passed preservation checks. All six ownership protection/validation triggers are enabled.

The reviewed resolution file is saved locally at `.runtime/team-phase-a-ownership-resolutions.json`, with explicit user approval recorded as evidence for each Market. Pre-migration fingerprints and the read-only verification helper are also under the ignored `.runtime` directory. Disposable automated tests continue to use the separate existing `vendure_test_*` safety mechanism.

Before applying the migration, inspection found only `TeamPermissionsPhaseA1795300000000` pending. All inspected Vendors had a single active Owner candidate. The user explicitly approved these Market membership mappings, resolving all 12 missing automatic ownership candidates:

| Market ID | Business                             | Approved Owner membership | Owner                                   |
| --------- | ------------------------------------ | ------------------------- | --------------------------------------- |
| 1         | Bulverde Market Day Demo             | 1                         | `market.manager@example.test`           |
| 2         | Boerne Farmers Market                | 24                        | `boerne.manager@example.test`           |
| 3         | Willow Green Market Design Fixture   | 28                        | `homepage.market@example.test`          |
| 4         | Oak Bend Saturday Market             | 29                        | `homepage.market@example.test`          |
| 5         | Riverstone Community Market          | 30                        | `homepage.market@example.test`          |
| 6         | Cedar Grove Farmers Market           | 31                        | `homepage.market@example.test`          |
| 7         | Phase A Applications Test Market     | 33                        | `phase-a.manager@example.test`          |
| 8         | Phase B Applications Test Market     | 35                        | `phase-b.manager@example.test`          |
| 9         | Phase C Applications Test Market     | 39                        | `phase-c.manager@example.test`          |
| 10        | Phase D Applications Test Market     | 40                        | `phase-d.manager@example.test`          |
| 11        | Attendance V1 Test Market            | 47                        | `attendance-v1.manager@example.test`    |
| 12        | Booth Scheduling Phase B Test Market | 52                        | `booth-scheduling.manager@example.test` |

The migration procedure is retained below for reference. This local database has already been migrated. Inspect its current status from `E:\coding\farmers-market-platform-web`:

```powershell
npm run demo:market-operations:inspect
```

The output includes pending migrations, ownership candidates, and active membership IDs/principals for review. Choose each Market's actual Owner using trusted provisioning/business evidence. Do not select an employee just because they are the oldest or sole administrator.

Prepare a local resolution JSON array. Each entry requires `kind` (`market` or `vendor`), the business `id`, the exact active `membershipId`, and a meaningful `evidence` string. For example, the following uses a deliberately invalid placeholder membership ID that must be replaced:

```json
[
  {
    "kind": "market",
    "id": 2,
    "membershipId": 12345,
    "evidence": "Replace with the verified business ownership evidence and approved membership"
  }
]
```

Include reviewed entries for all unresolved businesses. The file is one-time migration evidence, not an authorization source of truth. Then, only when explicitly choosing to apply the migration:

```powershell
$env:TEAM_OWNERSHIP_RESOLUTIONS_FILE = 'E:\coding\farmers-market-platform-web\ownership-resolutions.local.json'
npm run demo:market-operations:migrate
Remove-Item Env:TEAM_OWNERSHIP_RESOLUTIONS_FILE
npm run demo:market-operations:inspect
```

Stop the demo server and worker before applying the migration, and restart the demo processes on the changed code afterward. The guarded command verifies the local `vendure_demo_market_ops` target and uses normal project migration locking. Invalid, missing, duplicate, mismatched, or inactive resolution entries fail. There is no reset or reseed prerequisite. If evidence is not available, leave Phase A unapplied until ownership is resolved.

## Manual testing

The migration is applied. The dedicated employee fixtures have not been created. To create them explicitly for manual testing, run:

```powershell
npm run demo:market-operations:team-permissions-fixtures
```

This is an explicit data-writing setup command. It first requires the existing demo schema to be current. It creates `Phase A primary Vendor`, `Phase A primary Market`, `Phase A other Vendor`, and `Phase A other Market`, and prints their Channel IDs. It copies the suggested presets once for new employees. It does not create sales, invitations, or external provider connections. The test phone/email proof is synthetic and limited to these dedicated local identities; no SMS/email is sent.

All five dedicated accounts use the local-only password `Local-Team-Phase-A-2026!`:

| Email                                     | Workspaces                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `team-phase-a-owner@test.invalid`         | Protected Owner of both primary businesses                                       |
| `team-phase-a-administrator@test.invalid` | Administrator of both primary businesses; no delegation ceiling is initially set |
| `team-phase-a-lead@test.invalid`          | Lead of both primary businesses                                                  |
| `team-phase-a-staff@test.invalid`         | Staff of both primary businesses                                                 |
| `team-phase-a-other-owner@test.invalid`   | Protected Owner of the two other businesses                                      |

Start the existing environment in separate terminals using only these web-directory scripts:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Sign in at `http://auth.platform.localhost:4321/account/login` and use `/account/workspaces`. Primary members should see the primary Vendor and Market and be able to switch between them. Use the printed Channel IDs with existing Admin routes, for example `http://localhost:4322/vendor?channel=<vendor-channel-id>` and `http://localhost:4322/market?channel=<market-channel-id>`.

- Owner: existing `/vendor/products`, `/vendor/inventory`, `/vendor/orders`, `/vendor/storefront`, `/vendor/finances`, `/market/occurrences`, `/market/applications`, and `/market/storefront` routes use ordinary applicable Owner authority. Empty dedicated workspaces have no pre-existing catalog/orders. Provider, billing, and entitlement configuration can still legitimately prevent a domain operation.
- Lead: catalog/inventory modification and Market scheduling/application/assignment operations are available according to the copied preset. Refunds, financial reads, and protected provider ownership are absent.
- Staff: catalog/inventory/order reads, selected POS/fulfillment, Market application/assignment reads, and Market Day tasks follow the limited preset. Finance, CRM, documents, refunds, configuration, and team administration are absent unless explicitly granted later.
- Any primary employee: a direct URL with the other business's Channel ID must be denied. The other Owner must not see primary workspaces.
- Backend-only grant customization, delegation ceilings, exact revocation timing, native traversal denial, and concurrency are verified by `npm run test:team-permissions` from either repository. There is no employee-management screen with which to perform those edits manually in Phase A.

## Local files and deferred work

Backend additions are the Phase A migration, `platform-identity/business-capabilities.ts`, `business-authority.ts`, `business-team.service.ts`, `business-api-boundary.ts`, the guarded team fixture module, and `test/market-operations/team-permissions.ts`. Existing identity/membership/provisioning/onboarding services, native session policy, Market reads/applicants/packing, catalog/inventory/order projections, billing/analytics/communications/documents/notification authorities, POS integration configuration, and QuickBooks protected connection commands were updated in place. Backend package scripts and guarded demo inspection/setup dispatch were extended.

Web changes are in `packages/admin-core/src/index.ts`, existing Admin Vendor/Market/management adapters and Order/Packing permission guards, Owner/packing fixtures, regenerated `packages/api/schema/*` and `packages/api/src/generated/{admin,shop}.ts`, guarded demo/package scripts, focused team tests, and this report. No unrelated UI redesign, dependency upgrade, deployment, commit, or remote operation was performed.

Phases B and C still own invitations, proof/acceptance flows, public employee-management APIs/screens, permission checklist presentation, and broader frontend affordances for custom combinations. There is no pushed permission refresh; backend denial is immediate while an already rendered page may need its next request/refresh to update its controls. Native generic platform APIs remain unavailable to employees. Ownership recovery/transfer/deletion and new protected legal/banking workflows need separate designs. Historical feature suites pinned to pre-Phase-A schemas were not run or certified by this focused qualification.
