# Vendor market discovery

Vendors find markets and start applications from the existing Applications workspace (`/vendor/markets#applications`). This document records what was implemented, the final contract, verification, and manual testing. The original pre-implementation audit is kept below as design context; where they differ, the implementation sections win.

Backend paths are relative to `E:\coding\farmers-market-platform`, frontend paths to `E:\coding\farmers-market-platform-web`.

**Status (2026-11-04):** implemented and covered by focused automated tests. The migration and the manual-test fixture are **not** applied to `vendure_demo_market_ops`. Until the migration is applied, `demo:market-operations:serve` refuses to start, because it blocks on pending migrations.

## 1. What was implemented

### Backend

| Change                                                                                                                                                                             | Location                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vendorMarketDiscovery(input: JSON): JSON!` (admin API only), modes `SEARCH` and `CITIES`                                                                                          | `src/plugins/market-operations/applicant.service.ts` (`discover`), `api.ts` (`VendorMarketDiscoveryResolver`, registered only in the admin API in `market-operations.plugin.ts`) |
| Pure rules: input validation, form selection, `applyState`, ordering, LIKE escaping, storefront origin                                                                             | `src/plugins/market-operations/discovery.ts`                                                                                                                                     |
| Storefront hostname-to-origin logic moved out of `meta()` into the shared `storefrontOrigin()` (same rule, used by both)                                                           | `discovery.ts`, `applicant.service.ts`                                                                                                                                           |
| Applicant reads (list, detail and draft rows) now include `city`/`state` from the Market                                                                                           | `applicant.service.ts` `meta()`                                                                                                                                                  |
| `CONTINUE` accepts a published form `slug` when no `draftId` is supplied. Exactly one of the two is required.                                                                      | `applicant.service.ts` (`publishedFormMarket`)                                                                                                                                   |
| Nullable `Market.city` / `Market.region` and validation                                                                                                                            | `src/plugins/farmers-market/entities/market.entities.ts`, `market-location.ts`                                                                                                   |
| City/state accepted by provisioning (`provisionMarket`, `platformProvisionMarket`, owned signup) and `configureOwnMarket`. Omitting both on configure preserves the stored values. | `market-provisioning.service.ts`, `market.service.ts`, `farmers-market/api/admin-api.ts`, `platform-admin/api.ts`, `farmers-market/types.ts`                                     |
| Additive migration                                                                                                                                                                 | `src/migrations/1795700000000-MarketDiscoveryLocation.ts`                                                                                                                        |
| `market-discovery-fixtures` setup action                                                                                                                                           | `scripts/market-operations-demo/market-discovery-fixture.ts`, registered in `run.ts` and both `package.json` files                                                               |
| Focused test                                                                                                                                                                       | `test/market-operations/market-discovery.ts` (`npm run test:applications:market-discovery`)                                                                                      |
| Shared disposable test config lists the new migration                                                                                                                              | `test/platform-identity/config.ts`                                                                                                                                               |

No change was made to `SAVE_DRAFT`, `submit()`, application review, withdrawal or information-request behavior.

### Frontend

| Change                                                                                                                                                | Location                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VendorMarketDiscovery` operation and schema; codegen regenerated                                                                                     | `packages/api/schema/admin.graphql`, `packages/api/operations/market-operations.graphql`, `packages/api/src/generated/admin.ts`                           |
| `createMarketDiscoveryApi()`, plus `DiscoverableMarket`, `MarketApplyState` and `MarketDiscoveryApi` (moved from the admin app and re-exported there) | `packages/api/src/market-discovery.ts`, `packages/api/src/index.ts`, `apps/admin/src/vendor/market-applications-data.ts`                                  |
| Live vendor service now sets `marketDiscovery`                                                                                                        | `apps/admin/src/vendor/service.ts`                                                                                                                        |
| Apply column driven by `applyState` (`discoveryAction()` plus the `DiscoveryApply` composition of the existing Farmstand link/button)                 | `market-applications-data.ts`, `MarketApplications.tsx`, `market-applications.css` (one layout-only rule)                                                 |
| Storefront continuation: `slug` plus a valid `vendor` uses the admin one-time handoff. Without `vendor`, central sign-in is kept.                     | `apps/storefront/src/pages/vendor/application-continue.ts`                                                                                                |
| Admin continuation sends either `draftId` or a validated `slug`, with a slug-specific error message                                                   | `apps/admin/src/vendor/application-continuation.tsx`                                                                                                      |
| City and State fields in the existing market settings form                                                                                            | `apps/admin/src/market/settings.tsx` (shared `TextField` and `Choice`)                                                                                    |
| Type-only updates for the new optional fields                                                                                                         | `apps/admin/src/market/fixture.ts`, `apps/admin/src/management/platform.tsx` (provisions with `city/region: null`; managers set the location in settings) |
| Focused test                                                                                                                                          | `tests/market-discovery.test.tsx`                                                                                                                         |

**Reuse.** No new primitive, library or style system was added. The page keeps its existing layout, 3-to-10 expansion, shared pagination, 250 ms debounced search, `SearchSelect` city filter, `ReadState`/`EmptyState` patterns and native table. `DiscoveryApply` only selects among the existing `FarmstandLink`, `FarmstandButton` and in-app `ApplicationLink`, because no shared component maps a relationship state to a destination. Workspace links (`/vendor/...`) navigate in-app; Apply and Continue draft are deliberate full navigations to the market storefront.

**What vendors see in the Apply column**

| `applyState`         | Apply cell                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `OPEN`               | **Apply** (primary link to the storefront handoff). It is disabled when the market has no active storefront. |
| `NOT_YET_OPEN`       | Disabled **Apply** plus "Opens {date}" in the market timezone                                                |
| `DRAFT`              | **Continue draft**, which uses the existing draft handoff                                                    |
| `APPLIED`            | **View application**, which goes to `/vendor/applications/{id}` in-app                                       |
| `MEMBER`             | **View membership**, which goes to `/vendor/markets`                                                         |
| `MEMBERSHIP_PENDING` | **Membership pending**, which goes to `/vendor/markets`                                                      |

Every destination is re-validated in the browser. Storefront URLs must have a safe storefront origin and no credentials, and local links must be same-origin `/vendor/` paths. Anything else renders a disabled control. A server response without `applyState` (an older backend) keeps the original Apply behavior.

## 2. Final API contract

```graphql
extend type Query {
  vendorMarketDiscovery(input: JSON): JSON!
} # admin API only
```

`@Allow(Permission.Authenticated)`, then `ApplicantApplicationsService.vendor(ctx)`: the active vendor whose `primaryChannelId` is the request channel, followed by `requireApplicantVendor` (an active membership whose affiliation has `canApply`). Errors use the existing `safe()` envelope (`FORBIDDEN`, `MARKET_OPERATIONS_INPUT_INVALID`).

**Input** (allowlisted keys only; anything else is rejected):

| Key      | Rule                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mode`   | `"SEARCH"` or `"CITIES"`. `CITIES` accepts no other key.                                                                                                   |
| `search` | String, whitespace collapsed, at most 100 characters. Case-insensitive substring match on market name **or** city. `%`, `_` and `\` are matched literally. |
| `city`   | `""` or `"<City>\|<ST>"` (a value returned by `CITIES`). Matched case-insensitively on city, exactly on state.                                             |
| `skip`   | Integer from 0 to 10,000 (default 0)                                                                                                                       |
| `take`   | `3` or `10` (default 3)                                                                                                                                    |

**`SEARCH` response**

```json
{
  "totalItems": 13,
  "items": [
    {
      "id": "41",
      "name": "Discovery Test Kerrville Saturday Market",
      "city": "Kerrville",
      "state": "TX",
      "timezone": "America/Chicago",
      "website": "http://discovery-v1-kerrville-saturday.platform.localhost:4321",
      "applyUrl": "http://discovery-v1-kerrville-saturday.platform.localhost:4321/vendor/application-continue?slug=<uuid>&vendor=7&channel=3",
      "applyState": "OPEN",
      "existingApplicationHref": null,
      "nextMarket": {
        "startsAt": "2027-01-09T15:00:00.000Z",
        "timezone": "America/Chicago"
      },
      "deadline": {
        "closesAt": "2027-04-01T04:59:00.000Z",
        "timezone": "America/Chicago"
      },
      "opensAt": null
    }
  ]
}
```

- Exactly these 12 keys are returned. `applyUrl` is non-null only for `OPEN` with an active storefront.
- `existingApplicationHref` is set as follows:
  - `/vendor/markets` for `MEMBER` and `MEMBERSHIP_PENDING`
  - `/vendor/applications/{id}?channel=…` for `APPLIED`
  - the storefront draft continuation URL for `DRAFT`, or `/vendor/applications/drafts/{id}?channel=…` when the market has no storefront
  - `null` otherwise
- `opensAt` is an ISO instant, set only for `NOT_YET_OPEN`.

**`CITIES` response:** `{ "items": [{ "value": "Kerrville|TX", "label": "Kerrville, TX" }] }`. It lists only cities with at least one discoverable market, unique per (lower-case city, state), sorted by label.

**Discovery rules, in order**

1. **Candidates.** One SQL query gathers active markets joined to `PUBLIC` templates that have a `PUBLISHED` version (the latest `versionNumber`). The active storefront hostname is left-joined. Search and city filters are applied in SQL. Only the version's `definition->'schedule'` leaves the database.
2. **Eligibility.** `applicationAvailability()` runs per form, and `CLOSED` forms are dropped. A market with no remaining form is excluded **before** counting, city options or pagination, so closed, private-only, retired, unpublished and suspended markets never consume a count or a page slot.
3. **One form per market:**
   1. the advertised eligible form
   2. otherwise the `OPEN` form with the earliest `closesAt` (no deadline sorts last)
   3. otherwise the `NOT_YET_OPEN` form with the earliest `opensAt`

   Ties go to the newest version id.

4. **Next date.** The earliest `scheduled` occurrence with `startsAt > now` per eligible market, using one `DISTINCT ON` query that the existing index covers.
5. **Order and pages.** Next date ascending (undated last), then name (case-insensitive), then id. `totalItems` is the eligible count; `skip`/`take` slice the ordered set.
6. **Relationship state, for the page's markets only.** Approved or pending memberships, active submissions owned by the vendor directly or through a claim, and current drafts (the principal's and vendor's unsubmitted draft on a `PUBLISHED` version of a non-retired template).

| First matching condition                                                          | `applyState`         |
| --------------------------------------------------------------------------------- | -------------------- |
| Membership `approved`                                                             | `MEMBER`             |
| Membership `pending`                                                              | `MEMBERSHIP_PENDING` |
| Submission in `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFO`, `WAITLISTED`, `ACCEPTED` | `APPLIED`            |
| Current draft                                                                     | `DRAFT`              |
| Selected form `NOT_YET_OPEN`                                                      | `NOT_YET_OPEN`       |
| Otherwise                                                                         | `OPEN`               |

Reapplying is allowed. `DECLINED`/`WITHDRAWN` submissions, `suspended`/`withdrawn` memberships and drafts on retired versions do not block `OPEN`.

**`CONTINUE` (existing `applicantApplicationCommand`, admin API)**

```json
{ "vendorId": 7, "draftId": 12, "origin": "http://<market-host>:4321", "correlation": "<43 chars>" }
{ "vendorId": 7, "slug": "<template slug>", "origin": "http://<market-host>:4321", "correlation": "<43 chars>" }
```

Exactly one of `draftId` or `slug` is required.

- **Slug path:** the slug must match `^[a-zA-Z0-9-]{1,80}$` and name a non-`RETIRED` template with a `PUBLISHED` version (the same rule as `publicApplication(slug)`). Its market must be `active`, and the market's channel token must equal the target storefront's.
- **Draft path:** unchanged.
- **Both paths:** the request `Origin` must equal the admin origin, `ctx.apiType` must be `admin`, the correlation must be valid, and `vendorApplicationHandoff` re-checks the native, unexpired, non-invalidated session and vendor authority. The result is the existing one-time, 60-second `HANDOFF` capability (`{ callback: "{origin}/auth/callback?code=…" }`).

**Frontend adapter:** `createMarketDiscoveryApi({ endpoint, channelToken })` returns `cities()` (`mode: CITIES`) and `search({ search, city, skip, take })` (`mode: SEARCH`, search trimmed), over the existing admin transport and vendor channel token.

## 3. Database migration

`src/migrations/1795700000000-MarketDiscoveryLocation.ts` (additive, no backfill, no data change):

```sql
ALTER TABLE farmers_market ADD COLUMN "city" varchar(120) NULL, ADD COLUMN "region" varchar(64) NULL;
CREATE INDEX "ix_market_location" ON farmers_market (lower("city"), "region");
```

`down()` drops the index and the two columns. Existing markets stay valid with a null location: they show "Location unavailable", still appear in search results, and are absent from city options until a manager sets the location.

**Validation** (`market-location.ts`, mirrored in the settings form):

- City and state are supplied together, or both are cleared (`""` or null gives null).
- City is trimmed, internal whitespace is collapsed, it is at most 120 characters, and it must start with a letter and contain only letters, marks, spaces, `.`, `'` and `-`.
- State is uppercased and must be a US state or DC code.
- On `configureOwnMarket`, omitting both fields preserves the stored values (older clients). Nothing is ever inferred from `venue`.

**Not executed.** The migration was not run against `vendure_demo_market_ops` or the configured development database. It ran only inside disposable `vendure_test_*` databases created by the automated test.

## 4. Security and authorization

- **Who can call discovery.** It is admin API only, and the Shop schema does not define the query. The caller must be an authenticated user in an active vendor's own channel, with an active membership whose affiliation `canApply`. Guests, customers, market managers (market channel), staff without `canApply`, and vendors who select another channel are rejected.
- **No channel switching.** Discovery reads other markets through read-only SQL projections in the vendor's own context. It never copies a context to another market's channel and never takes a channel from input.
- **Allowlisted projection.** Only the 12 fields above are returned. Discovery never returns:
  - PRIVATE, RETIRED or unpublished slugs
  - template definitions or questions
  - venues or pickup instructions
  - manager notes or membership counts
  - channel tokens
- **Private forms.** They are excluded in SQL (`visibility = 'PUBLIC'`). Direct private links keep their existing behavior: `CONTINUE` with a PRIVATE slug works for an authorized vendor, just as `publicApplication(slug)` serves it.
- **URLs.**
  - Origins are built server-side from the server-owned `Storefront.hostname` with the existing pattern, and the slug is `encodeURIComponent`-encoded.
  - The browser re-validates every URL with `safeMarketApplicationUrl`/`safeStorefrontUrl` and `localVendorDestination`.
  - The storefront route validates `draft`, `claim`, `vendor`, `channel` and `slug`.
  - The admin continuation validates the callback origin, the `/auth/callback` path and the 43-character code before navigating.
- **Handoff.** It reuses the existing one-time 60-second `HANDOFF` capability, the correlation cookies (`path=/auth/callback`, `httpOnly`, 120 s) and session checks. No new authentication mechanism, capability kind or token exists.
- **Advisory state.** `applyState` drives display only. Duplicate prevention is UI gating (decided). A vendor who opens `/apply/{slug}` directly can still create a duplicate draft or submission, and managers see it in review as before. `SAVE_DRAFT` and `submit()` are unchanged.

## 5. Automated verification and results

| Command                                                                                                                                           | Result                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend `npm run test:applications:market-discovery` (disposable `vendure_test_discovery_*` database, complete current migration set)             | **PASS:** 13 checks (pure rules plus 12 integration checks); the database was dropped afterwards                                                                                                                                                                                                                             |
| Backend `npx tsc --noEmit -p tsconfig.json`                                                                                                       | PASS                                                                                                                                                                                                                                                                                                                         |
| Backend `npx tsc --noEmit -p test/market-operations/tsconfig.json` and `-p scripts/market-operations-demo/tsconfig.json`                          | New files clean. Existing unrelated errors remain in `storefront-shop-fixture.ts` and `willow-fixture.ts`.                                                                                                                                                                                                                   |
| Web `npx vitest run tests/market-discovery.test.tsx`                                                                                              | **PASS:** 15/15                                                                                                                                                                                                                                                                                                              |
| Web `npx vitest run tests/market-applications.test.tsx tests/markets-workspace.test.tsx tests/application-progress.test.ts tests/market.test.tsx` | Same as `HEAD`: 3 existing failures in `market-applications.test.tsx` (records-table columns, "Complete application" link, "View review status" label) and 5 existing failures in `market.test.tsx` (bootstrap and denial flows). All of these fail identically with this feature's changes stashed. Everything else passes. |
| Web `npm run graphql:codegen`                                                                                                                     | PASS                                                                                                                                                                                                                                                                                                                         |
| Web `npx tsc --noEmit`                                                                                                                            | New and changed files clean. Existing errors remain in `LoyaltyDashboard.tsx`, `table-navigation.ts` and older test fixtures.                                                                                                                                                                                                |
| Web `npm run typecheck --workspace @market/storefront`                                                                                            | PASS (0 errors)                                                                                                                                                                                                                                                                                                              |

**The backend test covers:**

- eligibility (closed, private, retired, unpublished, suspended, and markets with no forms)
- counts that are stable across pages and unaffected by ineligible forms
- deterministic ordering (dated, then undated by name)
- 3/10 paging and the skip ceiling
- case-insensitive name/city search, literal `%`/`_`, the city filter, and city options
- one form per market under every priority branch
- the response allowlist and no leaking of private slugs, venues or definitions
- every `applyState`, including claim-based submissions and reapply cases, isolated per vendor
- authorization for guest, customer, manager, wrong-channel and Shop-API callers, and invalid input
- applicant read city/state
- configure validation, preserve and clear
- the slug handoff:
  - one-time exchange
  - PRIVATE direct link allowed
  - rejection of foreign market, retired, unpublished, suspended, malformed or unknown slugs, both IDs or neither, wrong origin, bad correlation, wrong vendor, customer, guest, manager and the Shop API
- the existing draft handoff regression
- the fixture: running it twice is idempotent, gives exact record counts, and produces the documented per-account states

**The frontend test covers:**

- adapter requests and the channel header
- every `applyState` mapping, and that unsafe backend URLs never become links
- in-app navigation for workspace links
- the not-yet-open, no-storefront and no-location displays
- the error state
- the storefront route: slug plus vendor goes to the admin handoff with correlation/return cookies, slug alone goes to central sign-in, draft is unchanged, malformed input returns 400
- the admin continuation request shapes, unsafe callback rejection and malformed slugs
- settings location validation

**Existing test-infrastructure gaps, documented and not fixed (out of scope):**

- The shared `startOperationsHarness`/`identityTestConfig` migration list predates `TeamPermissionsPhaseA` and `VariantProductDetails`, and its identity fixture violates the current one-protected-owner rule. As a result, `npm run test:applications:vendor-context` and the other suites built on that harness fail during setup on `HEAD`, before any check runs.
- The new test therefore uses the self-contained pattern of `team-invitations.ts`: `src/migrations/*.ts` plus owner-backed provisioning.
- Draft-handoff regression coverage is included in the new test.

No full suites, browser automation or screenshots were run.

## 6. Manual testing

### Setup (each step needs your approval; none has been run)

Stop any running demo `serve`/`worker` first, because demo tooling holds an exclusive lock. Then, from `E:\coding\farmers-market-platform-web`:

```
npm run demo:market-operations:migrate
npm run demo:market-operations:market-discovery-fixtures
```

`migrate` verifies the loopback `vendure_demo_market_ops` target and applies only pending migrations, without reset or seed. The fixture action:

- refuses to run if migrations are pending
- is additive and idempotent: reruns create nothing new
- is fixed-dated: open forms close between 2027-03-31 and 2027-06-30, and not-yet-open forms open 2027-08-01
- uses only `discovery-v1-*` provisioning keys, "Discovery Test …" names and `discovery-v1.*@example.test` accounts
- does not modify Manna Roots, the Boerne Market Manager, Boerne's setup or any existing account

It prints the market IDs, websites and vendor channel IDs.

Then start the environment: `demo:market-operations:serve`, `demo:market-operations:worker`, `demo:market-operations:admin` (http://localhost:4322) and `demo:market-operations:storefront` (http://localhost:4321).

### Dedicated test credentials (local only)

The password for every account below is `Discovery-Local-Only!2026` (the `discoveryPassword` constant in `market-discovery-fixture.ts`). Sign in to the admin through the normal central sign-in. The accounts have verified fictional 202-555-02xx phones.

| Account                               | Role / state                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `discovery-v1.fresh@example.test`     | Owner of **Discovery Test Fresh Start Farm**, with no applications (full from-scratch flow)                                   |
| `discovery-v1.draft@example.test`     | Owner of **Discovery Test Draft Farm**, with a current draft at Wimberley Square                                              |
| `discovery-v1.submitted@example.test` | Owner of **Discovery Test Submitted Farm**, with a submitted application at Wimberley Creek                                   |
| `discovery-v1.member@example.test`    | Owner of **Discovery Test Member Farm**: approved member at Comfort Village, pending membership at Fredericksburg Main Street |
| `discovery-v1.manager@example.test`   | Protected owner/manager of all 16 discovery test markets (settings and review)                                                |

### Fixture markets

All markets are in TX and use the America/Chicago timezone. Each storefront is `http://discovery-v1-<key>.platform.localhost:4321`.

| Key                   | City           | Expected                                                                                              |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| kerrville-saturday    | Kerrville      | Listed: OPEN, deadline Mar 31 2027, next Jan 9 2027                                                   |
| kerrville-river       | Kerrville      | Listed: OPEN, no deadline ("Not specified")                                                           |
| fredericksburg-main   | Fredericksburg | Listed: OPEN; Member Farm sees Membership pending                                                     |
| fredericksburg-spring | Fredericksburg | Listed: NOT_YET_OPEN, "Opens Aug 1, 2027"                                                             |
| fredericksburg-pop-up | Fredericksburg | Listed: OPEN, next market "Not announced"                                                             |
| new-braunfels-plaza   | New Braunfels  | Listed once. The advertised Seasonal form (deadline May 31) wins over the earlier-closing Craft form. |
| new-braunfels-river   | New Braunfels  | Listed once. The advertised Spring form is closed, so the open Summer form (deadline Jun 30) is used. |
| san-marcos-square     | San Marcos     | Listed: OPEN                                                                                          |
| san-marcos-evening    | San Marcos     | Listed: NOT_YET_OPEN, no dates                                                                        |
| wimberley-square      | Wimberley      | Listed: Draft Farm sees Continue draft                                                                |
| wimberley-creek       | Wimberley      | Listed: Submitted Farm sees View application                                                          |
| comfort-village       | Comfort        | Listed: Member Farm sees View membership                                                              |
| location-pending      | none           | Listed: "Location unavailable"; Apply and Website disabled (no storefront); not in city options       |
| closed-only           | Kerrville      | **Hidden** (only form closed)                                                                         |
| private-only          | Fredericksburg | **Hidden** (only form PRIVATE)                                                                        |
| suspended             | San Marcos     | **Hidden** (market suspended)                                                                         |

That makes 13 discoverable fixture markets. Other existing demo markets with a public, published, not-closed form also appear, which is by design (§4 of the audit).

### Steps and expected outcomes

1. **Fresh vendor, from scratch.** Sign in as `discovery-v1.fresh@example.test` and open `/vendor/markets#applications`.
   - At most 3 markets show. **View more markets** expands in place to 10 per page with shared pagination; the URL does not change and nothing reloads.
   - Search `discovery test`: the total covers all 13 fixture markets (two pages).
   - Search `KERR`: only the two listed Kerrville markets show.
   - The Location dropdown lists Comfort, Fredericksburg, Kerrville, New Braunfels, San Marcos and Wimberley (TX) but not the closed, private, suspended or location-less entries. Selecting a city resets to page 1.
   - Dates show in the market's timezone. Fredericksburg Spring shows a disabled Apply with "Opens Aug 1, 2027". Location Pending shows disabled Apply and Website buttons.
2. **Apply handoff.** Still as the fresh vendor, click **Apply** on Kerrville Saturday Market.
   - The browser goes to the storefront `/vendor/application-continue`, then the admin `/vendor/applications/continue`, then the storefront `/auth/callback`, and finally `/apply/<slug>?vendor=<id>`. You remain signed in as Fresh Start Farm, with no second sign-in.
   - Submit the form. Back in `/vendor/markets#applications`, the market now shows **View application**, and the application appears in Your applications with Kerrville, TX.
3. **Draft vendor.** Sign in as `discovery-v1.draft@example.test`.
   - Wimberley Square shows **Continue draft**, which opens the saved draft on its storefront through the existing draft handoff.
   - Your applications lists the draft with Wimberley, TX.
4. **Submitted vendor.** Wimberley Creek shows **View application**, which opens `/vendor/applications/<id>` in-app. Status, review and withdrawal behave as before.
5. **Member vendor.** Comfort Village shows **View membership**, and Fredericksburg Main Street shows **Membership pending**; both lead to `/vendor/markets`. Neither offers Apply.
6. **Direct storefront visitor (regression).** Signed out, open `http://discovery-v1-kerrville-river.platform.localhost:4321/apply/<slug>` (the slug is in that market's Apply URL) and choose to apply with an account. The storefront still uses central account sign-in, because that link carries no vendor.
7. **Manager location editing.** Sign in as `discovery-v1.manager@example.test`, select Location Pending Market, and open `/market/settings`.
   - Set City `Boerne` and State `TX`, then save.
   - Invalid pairs are rejected: a city without a state, a state without a city, or a city with digits.
   - A vendor's Location dropdown now includes "Boerne, TX", and the market shows that location. (It still has no storefront, so Apply stays disabled.)

## 7. Relevant frontend routes

| Route                                                                                             | Purpose                                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Admin `/vendor/markets#applications` (also `/vendor/applications`)                                | Discovery and the vendor's applications                         |
| Admin `/vendor/applications/continue?draft=…\|slug=…&vendor=…&origin=…&correlation=…[&channel=…]` | Issues the one-time handoff                                     |
| Admin `/vendor/applications/{id}`, `/vendor/applications/drafts/{id}`                             | Existing application detail and saved-draft preview             |
| Admin `/market/settings`                                                                          | Market City/State fields                                        |
| Storefront `/vendor/application-continue?slug=…&vendor=…&channel=…` / `?draft=…`                  | Starts the handoff (or central sign-in when no vendor is given) |
| Storefront `/auth/callback`, `/vendor/application-return`, `/apply/{slug}`                        | Existing handoff exchange, return and application form          |

## 8. Known limitations and deferred functionality

- **Scale.** The eligible set (markets × public published forms) and next dates are evaluated in memory per request, because the schedule lives in jsonb. This is fine at current volumes. A large catalog would need an SQL availability pre-filter or a materialized eligibility column.
- **Duplicates.** Duplicate-application prevention is UI-only (decided). Direct `/apply/{slug}` visits can still create duplicate drafts or submissions.
- **Location.** It is US-only (two-letter state or DC) and has no geocoding or distance search. Platform-admin provisioning sets no location; managers add it in settings.
- **Not added:** market photos, descriptions, categories, seasons and other filters; private-form discovery; a discoverability opt-out flag (decided).
- **Fixture dates.** The fixture uses fixed dates. After mid-2027, its open forms close and those markets drop out of discovery. Update the fixture dates if needed.
- **Existing test infrastructure.** The shared operations harness is stale and its existing suites fail at setup (§5). The existing frontend failures listed in §5 also remain.
- **Prior documentation.** `docs/VENDOR_MARKET_APPLICATIONS_DESIGN.md` and `COMPONENT_USAGE_GUIDE.md` still describe discovery as unconnected. They were intentionally not edited, because only this document was in scope.

---

# Pre-implementation audit (2026-11-04)

The read-only audit that guided the implementation, kept for context. It was written before any code changed. Its decisions (§10) are all reflected above.

## Audit 1. Current architecture

| Concern                  | Location                                                                                                                                                                                                                                                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Market record            | `src/plugins/farmers-market/entities/market.entities.ts` (`Market`, table `farmers_market`)                                                                                                                                                                              | `id` (int), `slug` (unique), `name`, `status: 'active' \| 'suspended'`, `timezone` (IANA), `venue` (free text, ≤500), `channelId` (1:1 Vendure channel). **No city, state or address fields.**                                                                                                                                                                                                                                                                               |
| Occurrences              | same file, `MarketOccurrence`                                                                                                                                                                                                                                            | `startsAt`/`endsAt` (timestamptz), `timezone`, `venue`, `status: 'scheduled' \| 'cancelled'`. Indexed by `(marketId, startsAt, status)`. There is no "unpublished" occurrence state.                                                                                                                                                                                                                                                                                         |
| Vendor membership        | same file, `MarketVendorMembership`                                                                                                                                                                                                                                      | Unique on `(marketId, vendorId)`; `status: pending \| approved \| suspended \| withdrawn`.                                                                                                                                                                                                                                                                                                                                                                                   |
| Market website           | `src/plugins/platform-identity/entities.ts` (`Storefront`)                                                                                                                                                                                                               | `marketId`, `status: active \| inactive`, `hostname` (generated, `select:false`). The origin is derived only in `ApplicantApplicationsService.meta()` (`applicant.service.ts:100-139`): `https://{hostname}`, or `http://{host}:4321` for `.localhost`.                                                                                                                                                                                                                      |
| Application forms        | `src/plugins/market-operations/entities.ts`                                                                                                                                                                                                                              | `MarketApplicationTemplate` (`marketId`, unique `slug`, `visibility: PUBLIC \| PRIVATE \| RETIRED`, `advertised`). `MarketApplicationTemplateVersion` (`status: DRAFT \| PUBLISHED \| RETIRED`, `definition` jsonb).                                                                                                                                                                                                                                                         |
| Deadline                 | `market-operations/application-schedule.ts`                                                                                                                                                                                                                              | `definition.schedule = { timeZone, opensAt?, closesAt? }` (market-local wall clock, validated against `Market.timezone`). `applicationAvailability()` returns `{ state: OPEN \| NOT_YET_OPEN \| CLOSED, opensAt, closesAt, timeZone }` as ISO instants.                                                                                                                                                                                                                      |
| Publish/retire rules     | `market-operations/service.ts:630-674`                                                                                                                                                                                                                                   | Publishing retires the template's previous PUBLISHED version. `advertised` can only be true for PUBLIC and is **exclusive per market**: setting it clears the other templates. RETIRE sets `RETIRED` and `advertised=false`.                                                                                                                                                                                                                                                 |
| Public form read         | `service.ts:2229` `publicApplication(ctx, slug?)`                                                                                                                                                                                                                        | Channel-scoped (`publicMarket` = active market of `ctx.channelId`). With no slug it returns the advertised PUBLIC template. With a slug it returns any non-retired template, **including PRIVATE**. It returns the latest PUBLISHED version, availability, future eligible occurrences and rentals.                                                                                                                                                                          |
| Applicant reads/commands | `market-operations/applicant.service.ts`, resolver `ApplicantApplicationsResolver` in `market-operations/api.ts:235`                                                                                                                                                     | `applicantApplications(input: JSON): JSON!` on both shop and admin APIs, `@Allow(Authenticated)`. Vendor scope comes from `vendor()`. On the admin API it is the active vendor whose `primaryChannelId = ctx.channelId`, followed by `PlatformAccountFoundation.requireApplicantVendor` (active TenantMembership plus the affiliation's `canApply`).                                                                                                                         |
| Apply page               | web `apps/storefront/src/pages/apply/[...applicationSlug].astro`                                                                                                                                                                                                         | `{marketOrigin}/apply/{slug}?vendor={vendorId}` on the market's own storefront.                                                                                                                                                                                                                                                                                                                                                                                              |
| Sign-in handoff          | web `apps/storefront/src/pages/vendor/application-continue.ts`, `application-return.astro`; admin `apps/admin/src/vendor/application-continuation.tsx`; backend `applicant.service.ts:312` (`CONTINUE`), `customer-account/service.ts:1377` (`vendorApplicationHandoff`) | With `?draft=`, the storefront sends the vendor to admin `/vendor/applications/continue`. Admin calls `CONTINUE`, which turns the admin session into a one-time 60-second `HANDOFF` code for `{origin}/auth/callback`, and `application-return` then opens `/apply/{slug}?draft=…`. With `?slug=` (no draft), the storefront instead calls `centralSignIn` (central account sign-in), so the admin session is **not** carried over. Backend `CONTINUE` requires a `draftId`. |
| Frontend contract        | web `apps/admin/src/vendor/market-applications-data.ts` (`DiscoverableMarket`, `MarketDiscoveryApi`, `safeMarketApplicationUrl`), `service.ts` (`marketDiscovery?` deliberately unset), `MarketApplications.tsx:149`                                                     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Transport/codegen        | web `packages/api/schema/admin.graphql`, `packages/api/operations/*.graphql`, `codegen.ts`, `npm run graphql:codegen`                                                                                                                                                    |                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Audit 2. Existing capabilities to reuse

- **Vendor authority:** `ApplicantApplicationsService.vendor(ctx)` / `requireApplicantVendor`. This is the same check used for application drafts and submissions, so discovery applies the same rule as applying.
- **Website origin:** the `meta()` hostname→origin logic. Extract it into a shared private helper; don't duplicate it. The frontend already validates the result with `safeStorefrontUrl`.
- **Availability and deadline:** `applicationAvailability(version.definition.schedule, now)` gives the deadline (`closesAt` plus `timeZone`) and OPEN/NOT_YET_OPEN/CLOSED.
- **Form selection:** the `advertised` flag already marks the market's single promoted public application. Discovery uses it to choose which form Apply opens when a market has several. It does not decide whether the market is listed (§4).
- **Next date:** `MarketOccurrence` with `status='scheduled' AND startsAt > now ORDER BY startsAt`. The existing index covers this. Note that `publicApplication` loads up to 2,000 occurrences per market, so don't reuse it per result.
- **Relationship state:** `MarketVendorMembership` (unique per market/vendor), `MarketApplicationSubmission.applicantVendorId` plus `applicant_application_claim`, and `ApplicantApplicationDraft` (by principal+vendor). These are the same predicates the applicant list read uses (`applicant.service.ts:250-295`).
- **Error envelope:** `safe()` in `market-operations/api.ts`.

## Audit 3. Missing pieces

1. **No cross-market discovery read.** Every existing market read is either scoped to one channel (`publicMarketApplication`, `publicMarket`) or to markets the caller already belongs to (`ownMarketBusinessMemberships`, `own*`). A vendor can only see a non-member market by already knowing its storefront host and slug.
2. **No authoritative city/state.** `Market.venue` and `MarketOccurrence.venue` are free text, and the design forbids parsing them.
3. **No server-side "can this vendor apply" projection, and no duplicate guard.** `SAVE_DRAFT` dedupes only by `clientKey`. `submit()` dedupes only by `submissionKey` (idempotency). A vendor can open several drafts and submit several applications to the same market, even while already an approved member.
4. **No market-level discoverability flag, and none will be added** (decided, §10). Listing follows from having an application. Many fixture markets exist (`phase-a/b/c/d`, `attendance-v1-*`, booth scheduling and others), so any of them with a public, open form will appear in the test DB.

## Audit 4. Recommended eligibility and discoverability rules

Decided (2026-11-04): a market is always discoverable when it has an application. There is no opt-in flag, and `advertised` is not required. Concretely, a market is **discoverable** when all of the following hold:

- `Market.status = 'active'`.
- It has at least one template with `visibility='PUBLIC'` and a PUBLISHED version.
- That version's `applicationAvailability(...).state !== 'CLOSED'` (closed forms are hidden, decided earlier).

Suspended markets and RETIRED templates are never listed. PRIVATE templates are excluded (decided, §10): managers use PRIVATE for forms shared only by link, and listing them would publish a form the manager chose not to publicize. A market whose only forms are PRIVATE is not listed.

**Which form Apply opens** when a market has several eligible forms:

1. the advertised form, if it is eligible;
2. otherwise the eligible OPEN form with the earliest `closesAt` (no deadline sorts last);
3. otherwise the NOT_YET_OPEN form with the earliest `opensAt`.

Ties are broken by the newest published version. The chosen form supplies `applyUrl`, `deadline` and `opensAt`. Exactly one row is returned per market.

**Storefront:** a market without an active Storefront is still listed, but with `website: null` and `applyUrl: null`, so the UI shows the disabled Apply and Website buttons. The public apply page only exists on the market's storefront.

Each item also carries an **apply state** computed for the calling vendor. The UI uses it to decide what Apply does:

| Condition (first match wins)                                                              | `applyState`                    | Apply destination                                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Membership `approved` or `pending`                                                        | `MEMBER` / `MEMBERSHIP_PENDING` | none (link to `/vendor/markets`)                                                                                     |
| Submission in `SUBMITTED, UNDER_REVIEW, NEEDS_INFO, WAITLISTED, ACCEPTED` for this market | `APPLIED`                       | `/vendor/applications/{id}`                                                                                          |
| Current draft (same published version)                                                    | `DRAFT`                         | existing continuation href                                                                                           |
| Availability `NOT_YET_OPEN`                                                               | `NOT_YET_OPEN`                  | none; show `opensAt`                                                                                                 |
| Otherwise                                                                                 | `OPEN`                          | `{origin}/vendor/application-continue?slug={slug}&vendor={vendorId}&channel={vendorChannelId}` (sign-in handoff, §6) |

Markets with a `CLOSED` form are excluded before counting, so they never appear in results, city options or `totalItems` (decided, §10). Decided (2026-11-04): reapplying is allowed. A vendor whose only relationships with the market are `DECLINED`/`WITHDRAWN` submissions, `suspended`/`withdrawn` memberships or retired-form drafts gets `OPEN` (or `NOT_YET_OPEN`). The table above therefore treats only approved/pending membership, active submissions and current drafts as blocking.

## Audit 5. Recommended API contract

Use the existing JSON-root style of `market-operations/api.ts`, on the **admin** API (the vendor dashboard's transport):

```graphql
extend type Query {
  vendorMarketDiscovery(input: JSON): JSON!
}
```

`@Allow(Permission.Authenticated)`, then `ApplicantApplicationsService.vendor(ctx)` (the same model as `applicantApplications`). `safe()` wraps the call.

Request:

```json
{ "mode": "SEARCH", "search": "boerne", "city": "boerne|TX", "skip": 0, "take": 3 }
{ "mode": "CITIES" }
```

Validation: `search` trimmed to ≤100 characters. `city` either empty or one of the returned values. `take ∈ {3, 10}`. `skip` an integer from 0 to 10,000. Unknown keys rejected.

`SEARCH` response:

```json
{
  "totalItems": 4,
  "items": [
    {
      "id": "12",
      "name": "Boerne Farmers Market",
      "city": "Boerne",
      "state": "TX",
      "timezone": "America/Chicago",
      "website": "http://boerne.localhost:4321",
      "applyUrl": "http://boerne.localhost:4321/vendor/application-continue?slug=boerne-2027&vendor=7&channel=3",
      "applyState": "OPEN",
      "existingApplicationHref": null,
      "nextMarket": {
        "startsAt": "2026-11-08T15:00:00.000Z",
        "timezone": "America/Chicago"
      },
      "deadline": {
        "closesAt": "2026-12-01T05:59:00.000Z",
        "timezone": "America/Chicago"
      },
      "opensAt": null
    }
  ]
}
```

`CITIES` response: `{ "items": [{ "value": "boerne|TX", "label": "Boerne, TX" }] }`. Only cities that have at least one discoverable market are returned, sorted by label.

Fit with the frontend `MarketDiscoveryApi`: `cities()` and `search()` can be implemented as written. `DiscoverableMarket` needs **additive** optional fields: `applyState`, `existingApplicationHref`, `opensAt` and `timezone`. Without `applyState`, the page would show Apply to markets the vendor already belongs to. `applyUrl` is null unless the state is `OPEN`. Ordering: next market date ascending (nulls last), then name, then id, so pagination is stable.

## Audit 6. Minimal implementation changes

**Backend (`farmers-market-platform`)**

1. `farmers-market/entities/market.entities.ts`: add nullable `city varchar(120)` and `region varchar(64)` columns to `Market`, plus a new file in `src/migrations/` (§8). Store `region` as a two-letter US state code (uppercase) and `city` trimmed; return it to the frontend as `state`. Add them to the provisioning input and the market identity update command, with bounds from `platform-identity/input-validation.ts` (`city: 255` exists; pick 120/64).
2. `market-operations/applicant.service.ts`:
   - Extract the hostname→origin helper from `meta()`.
   - Add `discover(ctx, input)`, using one query builder for the eligible set: active market ⋈ PUBLIC template ⋈ latest PUBLISHED version, with the active storefront left-joined. Pick one form per market using the §4 order. Apply search (`ILIKE` on name, city) and the city filter in SQL. Count before `skip/take`.
   - For the page's ≤10 markets only, load:
     - next occurrence (`DISTINCT ON (marketId)` over scheduled future rows)
     - memberships, submissions and claims, and drafts for this vendor and principal (`In(marketIds)`)
   - Compute `applicationAvailability` and `applyState` in code. Filter `CLOSED` versions in code before counting. The schedule lives in jsonb, so an SQL filter is possible but not required at current volumes; note that the count must be computed after this filter.
3. `market-operations/api.ts`: add `vendorMarketDiscovery` to `operationsAdminSchema` and a resolver method on `ApplicantApplicationsResolver`. Leave the shop schema unchanged.
4. No change to `SAVE_DRAFT` or `submit()`. Duplicate prevention is UI gating via `applyState` only (decided, §10).
5. **Sign-in handoff for new applications** (decided, §10), in `applicant.service.ts` `CONTINUE`. Accept either `draftId` (unchanged) or `slug`, never both. For `slug`:
   - Run `M.bounded(slug, 80)`.
   - Load the `MarketApplicationTemplate` by slug. It must be non-RETIRED, have a PUBLISHED version and belong to an `active` market. This is the same rule as `publicApplication(slug)`.
   - Take that `marketId` into the existing `target.kind === 'MARKET'` and channel-token comparison.
   - Keep the `requestOrigin === adminOrigin` and `ctx.apiType === 'admin'` checks and `vendorApplicationHandoff`'s session checks unchanged.

   No new capability kind and no migration are needed.

**Web (`farmers-market-platform-web`)**

1. `packages/api/schema/admin.graphql`: add the query. Add an operation `VendorMarketDiscovery` to `packages/api/operations/market-operations.graphql`, then run `npm run graphql:codegen`.
2. New `packages/api/src/market-discovery.ts` exporting `createMarketDiscoveryApi(options)` with the same shape as `createApplicantApplicationsApi`. Re-export it from the package index.
3. `apps/admin/src/vendor/market-applications-data.ts`: move or alias the types to `@market/api` and add the optional fields.
4. `apps/admin/src/vendor/service.ts`: set `marketDiscovery: createMarketDiscoveryApi({ endpoint, channelToken })`.
5. `apps/storefront/src/pages/vendor/application-continue.ts`: for `slug` with a valid `vendor`, use the existing admin-handoff branch (set correlation/return cookies, redirect to admin `/vendor/applications/continue?slug=…&vendor=…&origin=…&correlation=…[&channel=…]`) instead of `centralSignIn`. Keep `centralSignIn` when `vendor` is absent, for applicants arriving from the storefront itself. `application-return.astro` already handles `slug`.
6. `apps/admin/src/vendor/application-continuation.tsx`: pass `slug` (validated `^[a-zA-Z0-9-]{1,80}$`) to `CONTINUE` when there is no `draft`. Keep the callback-origin/path/code check. Give the error message a slug-specific variant.
7. `MarketApplications.tsx`: render Apply according to `applyState`, keeping the existing `safeMarketApplicationUrl` and `safeStorefrontUrl` checks. `safeMarketApplicationUrl` already accepts the `/vendor/application-continue?…` form because it only validates the origin.
8. `packages/api/src/applicant-applications.ts`: optionally fill the existing `city`/`state` row fields from `meta()` with the new columns. This clears "Location unavailable" on application rows at no extra cost.

## Audit 7. Authorization and duplicate-application risks

- **Scope leakage.** The projection must be an allowlist: id, name, city, region, timezone, origin, slug, next start, deadline and opensAt. Never include `venue`/`pickupInstructions` (until approved), template definitions, directory entries, manager notes, member counts or rentals. Don't reuse `publicApplication()`'s output. Exposing a market's existence to every authenticated vendor is acceptable for PUBLIC forms, which are already reachable on the storefront.
- **Channel authority.** Run the read in the vendor's admin context. It reads other markets' rows directly through the repositories (as `meta()` already does) and never switches to their channels. It never sets `ctx.channel` from input.
- **Private forms.** `publicApplication(slug)` serves PRIVATE templates by slug. Discovery must filter on `visibility='PUBLIC'` in SQL and must never return a PRIVATE or RETIRED slug.
- **URL safety.** Build origins server-side from `Storefront.hostname` only, using the existing regex. Use `encodeURIComponent` for the slug. Keep the frontend `safeStorefrontUrl` / `safeMarketApplicationUrl` checks as defense in depth. No stored free-form website URL exists, and none should be added.
- **Duplicates (existing gap).** The backend does not stop repeat drafts, repeat submissions or applications from existing members. Decided (2026-11-04): handle this with UI gating only. `applyState` withholds `applyUrl` and the Apply button for members, pending members, active applicants and draft holders. This is an accepted residual risk: a vendor who opens the storefront `/apply/{slug}` page directly can still create a duplicate draft or submission, and managers see it in their review queue as today. `applyState` is advisory display state, never an authorization check. Server enforcement remains a possible later addition in `SAVE_DRAFT` and `submit()`, under the market lock `submit()` already takes.
- **Staff.** `requireApplicantVendor` requires the affiliation's `canApply`. Staff without it get `forbidden`, and the UI should show the existing unavailable state.

## Audit 8. Migrations

**Required.** Decision (2026-11-04): city/state is in scope. There is no structured location anywhere for markets. The migration is a single additive one: `ALTER TABLE farmers_market ADD COLUMN city varchar(120) NULL, ADD COLUMN region varchar(64) NULL` and an index on `(lower(city), region)`. It needs no backfill, and existing markets show "Location unavailable" until a manager fills the fields. Markets without a city still appear in search results but are absent from the city options. Discovery itself (forms, dates, origins and apply state) needs no further schema change.

Market managers need a way to set the fields. Add `city`/`region` to the existing market identity update command and its market-admin settings form, using existing shared `Field`/input components. A fixture can also set them for test markets.

## Audit 9. Manual testing in `vendure_demo_market_ops`

- After a migration request, use `npm run demo:market-operations:migrate` (it verifies the target and does not seed). Never use `reset` or `seed`.
- **Dedicated test markets are needed.** The existing Boerne market alone cannot exercise multi-result pagination, city grouping, the closed/not-yet-open states or the member/applied states for Manna Roots. Several existing fixture markets may surface once they have advertised forms, which is useful for checking the hide-unadvertised rule.
- Recommended: a new additive, idempotent `market-discovery-fixtures` action in `scripts/market-operations-demo/run.ts`, following `phase-*-fixtures` (provisioning keys `discovery-v1-*`, `.localhost` storefronts). It would create about 12 markets in 3–4 cities with these states:
  - open
  - not-yet-open
  - closed
  - no future dates
  - private-only
  - suspended
  - a market where Manna Roots has a draft, a submission and approved membership

  The fixture must not edit existing records. Running it requires explicit approval.

- Checks:
  - 3 → "View more" → 10 per page
  - totals unchanged by pagination
  - city list contains only discoverable cities
  - Apply opens the right storefront `/apply/{slug}?vendor=`
  - member/applied markets show no Apply
  - private, suspended and closed markets never appear
  - a staff account without `canApply` sees the unavailable state

## Audit 10. Decisions needed before implementation

1. ~~**City/state**~~ **Decided:** add nullable `Market.city`/`region` columns (migration), a manager edit field, and the city filter. Location is never parsed from `venue`.
2. ~~**Closed forms**~~ **Decided (2026-11-04):** markets whose advertised form is CLOSED are hidden from discovery results, city options and totals. NOT_YET_OPEN forms remain listed with their `opensAt`.
3. ~~**Discoverability**~~ **Decided (2026-11-04):** any active market with a PUBLIC, published, not-closed form is listed. There is no opt-in flag, and `advertised` only selects the Apply form. PRIVATE (link-only) forms stay excluded.
4. ~~**Duplicate enforcement**~~ **Decided (2026-11-04):** UI gating through `applyState` only, with no backend rejection. Reapplying is allowed: DECLINED/WITHDRAWN applicants and suspended/withdrawn members see Apply as `OPEN`.
5. ~~**Apply handoff**~~ **Decided (2026-11-04):** Apply carries the vendor's admin sign-in to the market storefront by extending the existing draft handoff (`CONTINUE` → one-time `HANDOFF` code) to accept a form slug. This is backend item 5 and web items 5–6 in §6. Today a slug-only continuation falls back to central account sign-in.

All product decisions are resolved. Implementation can proceed from §4–§9. Applying the migration to `vendure_demo_market_ops` and adding the discovery fixture each still require an explicit request.
