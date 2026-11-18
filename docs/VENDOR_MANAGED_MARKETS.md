# Vendor-managed markets

## Implemented

Vendors can use Generate occurrences and Create single date on `/vendor/markets`. They can create or reuse a private location, use the existing recurrence wizard, edit repeating schedules, revise individual future dates and cancel dates. Existing Markets, Upcoming Dates, dashboard and calendar readers consume the same membership and participation records.

Storefront customers select these dates through the existing pickup calendar, cart and checkout. Market name, local date, hours and address are visible on the owning vendor's storefront. Product selection, publication, stock, caps, cutoff windows, order occurrence association and fulfillment continue through existing services.

## Architecture and files

- Backend `src/plugins/farmers-market/`: nullable `Market.ownerVendorId` explicitly distinguishes private vendor locations from manager businesses. Each location retains the existing isolated market channel and technical seller. No manager account, market website, staff, directory entry, application or booth is created.
- Existing membership/participation rows represent the owner's standing participation. Their compatible `approved`/`confirmed` statuses require no approval action. A database trigger rejects other vendors. Ownership type is immutable. Manager authorization always rejects private locations; a separate scheduling authorization path checks current vendor permission and ownership on every call.
- `src/migrations/1796500000000-VendorManagedMarkets.ts`: additive owner FK/index, immutable ownership and membership guards. The protected-owner constraint still requires an owner for manager businesses; private locations inherit their vendor's protected ownership. Rollback refuses populated private locations.
- Backend marketplace commerce projections admit private dates only after validating the owning vendor storefront. They do not require or create a public market website. Discovery and application access explicitly exclude private markets. Administrative scheduling hooks and manager notification targets are excluded.
- Web `apps/admin/src/vendor/VendorManagedMarkets.tsx`: a feature controller composing the existing Dialog, CommandForm, SessionFields and GenerateOccurrencesWizard. No existing vendor controller supplied private-location selection or scheduling, so this controller is new; no new UI primitive, styling system or design standard was introduced. The wizard and range reader accept a narrow scheduling service contract.
- Web `MarketsWorkspace.tsx`, `MarketDetail.tsx`, `MarketOccurrence.tsx`, `UpcomingMarketDates.tsx`: shared integration, editing and appropriate private-location attendance/booth presentation. API operations, generated contracts, service wiring and fixture defaults were updated.
- Backend setup/fixture scripts and both package manifests expose the bounded local commands below. Automated qualification lives in backend `test/marketplace-commerce/vendor-managed-markets.ts`; the existing frontend detail tests include private-date behavior.

The persisted occurrence generation date remains immutable. Rescheduling changes the existing occurrence's times and version, rematerializes private offering windows, and projects the revised local pickup date to storefront customers. Orders retain their original occurrence ID.

## Verification

- `npm run test:vendor-managed-markets`: guarded disposable PostgreSQL qualification covers single creation/retry, recurring generation/retry, automatic participation, vendor schedule facts, current ownership checks, cross-vendor and manager isolation, database joining rejection, discovery/application exclusion, GraphQL vendor creation, storefront availability, native local checkout, placed-order occurrence association, cutoff, editing, stale writes and cancellation.
- `npx vitest run tests/vendor-market-detail.test.tsx tests/upcoming-market-dates.test.tsx tests/vendor-dashboard.test.ts --reporter=dot`: 34 tests passed. Existing Upcoming Dates tests emit React act warnings.
- Admin production build and backend server build passed. New API/controller lint passed. Schema extraction and GraphQL code generation passed.
- Repository-wide TypeScript checking remains blocked by existing errors in LoyaltyDashboard, table-navigation and unrelated test fixtures. Linting all touched vendor consumers also encounters the existing synchronous effect in MarketsWorkspace. The full backend dashboard build stops at its existing explicit production-environment policy; server compilation is checked separately.
- The feature migration was applied to `vendure_demo_market_ops`, with no other migrations pending. Dedicated fixture setup completed successfully and preserves existing accounts, inventory and settings on repeat runs. No browser automation or screenshots were used.

## Manual testing

Run from `E:\coding\farmers-market-platform-web`. The feature migration and dedicated fixture have already been applied. To repeat setup safely:

```powershell
npm run demo:market-operations:vendor-managed -- inspect
npm run demo:market-operations:vendor-managed -- migrate
npm run demo:market-operations:vendor-managed -- seed
```

The migration command refuses unrelated pending migrations. Setup targets only `vendure_demo_market_ops`, disables external providers for that process, and does not reset, truncate or reseed existing accounts. It adds only Cedar Creek Farm's dedicated records. It does not provision a payment-provider account.

Restart the local environment through the existing scripts, in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

Account: `vendor.markets@example.test`, password: `Local-Vendor-Markets-2026!`. Select Cedar Creek Farm Demo after signing in through the normal account flow.

| Route | Expected result |
| --- | --- |
| `http://localhost:4322/vendor/markets` | Both creation buttons; Boerne Farmers Market appears without an application. Reuse it when creating another date. |
| `http://localhost:4322/vendor/markets#upcoming-dates` | Automatic attendance; booth/application requirements do not apply. |
| `http://localhost:4322/vendor/markets/55` | Existing market detail, reusable scheduling controls and product preorder settings. |
| `http://localhost:4322/vendor/markets/55/dates/71` | November 21, 2026, 9 AM to 1 PM Central, Main Plaza, Boerne. Edit/cancel controls and existing per-date preorder controls. |
| `http://localhost:4322/vendor` | Upcoming market dashboard widgets include the dedicated vendor's dates. |
| `http://vendor-managed-market-demo.localhost:4321/products` | Pickup calendar includes November 14, November 21, November 28 and December 5. Select November 21 and add the $7 egg product. |
| `http://vendor-managed-market-demo.localhost:4321/cart` and `/checkout` | Existing checkout retains the selected private occurrence and pickup details. Payment completion requires the environment's existing configured vendor payment capabilities. |

Fixture IDs: vendor 54, market 35, membership 55, occurrences 70 through 73. Initial stock is 48 dozen; reruns do not replenish it. Fixture preorder windows open 90 days before and close at 11:59 PM Central the preceding day. Expired dates naturally leave upcoming/storefront results; rerunning setup adds the next four Saturdays without rewriting old dates.

For a new location, create a date, open its existing market detail, select products and enable preordering for the desired dates. Product publication is still required. Sign in as another vendor and verify the private location is absent from discovery and cannot be joined, read or edited by changing IDs. Existing manager-operated markets retain their normal behavior.

## Limits

No requested scheduling or preorder capability is intentionally deferred. Existing bounded readers still apply, including the storefront's 90-day horizon and 1,000-row occurrence range limit. Product preorders are configured explicitly through existing controls rather than automatically enabling every catalog item. Historical occurrences cannot be edited. Cancellation does not automatically refund existing orders; their occurrence association and ordinary follow-up workflows remain intact. Manual visual review and provider-backed payment testing remain for the developer.

## Scheduling presentation update

Vendor Markets now uses the manager page's extracted `OccurrenceCreationActions`, with Create single date first, Generate occurrences second, matching icons and semantic button variants. Its heading reuses the manager's wrapping/right-side action layout. No replacement button primitive was created; the existing two-button composition was extracted because it was previously inline in the manager page.

The vendor location stage uses the existing WizardProgress, reward-stage transitions, dialog height animation, embedded CommandForm and Farmstand control scheme. The shared generator accepts an optional preceding location step and Back callback; the manager flow keeps its original three steps. Vendor generation keeps the shared creating/success states and animated checkmark visible until Done. The vendor scheduling dialog is portaled outside the heading so ancestor heading typography cannot override its controls and copy. Reduced-motion behavior and native Dialog focus/dismissal remain shared.

Verification: the focused scheduling UI, manager occurrence and vendor market-detail tests pass (21 tests). They cover button order, isolated modal placement, shared progress stages, persistent success feedback and returning to a newly saved location without creating it twice. Admin build and lint for the new/changed scheduling controllers pass. No browser automation or screenshots were used; visual alignment remains for manual review.

Scheduling polish: dialogs retain vendor theme variables by mounting under the themed dashboard, time zones reuse the shared Select, schedule fields use a responsive two-column grid, and the shared animated Checkbox stays inline with its label. Unsaved changes appear in the dialog header before its close button. Wizard height transitions no longer lock scrolling. Invalid replacement characters in the location summary were corrected. Admin build and focused scheduling regressions were checked without browser automation.

Scheduling spacing: removed the reserved minimum stage height and reduced gaps between progress, headings, form sections and actions. Changes are scoped to occurrence wizards; shared input and button dimensions remain intact.

Further spacing adjustment: occurrence wizard vertical section and field-row gaps reduced by approximately another 50%, retaining horizontal spacing and control sizes.

Spacing correction: scoped field margins and command fieldset padding are now reset in scheduling wizards, rather than reducing only grid gaps. The saved-market separator uses an explicit JSX Unicode escape. Optional preorder fields expand/collapse with an intrinsic-height transition and reduced-motion support; collapsed fields are inert and disabled so hidden inputs do not participate in validation or submission.
