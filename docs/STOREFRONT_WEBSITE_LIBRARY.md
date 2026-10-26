# Storefront Website Library

## Implementation status

Stage 1 is implemented locally in the web and backend repositories. Vendor `/vendor/storefront` is a Website Library; the market appearance form retains its existing workflow. No deployment or remote Git changes were made. No new Modern Farmhouse design, premium theme, billing, commerce service, public page or hosting integration was implemented.

The persistent demo migration was explicitly authorized and applied through `npm run demo:market-operations:migrate` on October 24, 2026. Post-migration verification confirmed unchanged legacy appearances and exactly one initial website/live pointer for each of 20 vendor storefronts. No migrations remain pending. The manual UI workflow is ready for evaluation; no browser acceptance testing was performed.

## Website instances and templates

`StorefrontWebsite` represents a vendor-owned website with its own stable ID, storefront/vendor/channel ownership tuple, name, template identity/version, draft appearance, published appearance, draft template settings, published template settings, publication timestamp, optimistic version and recoverable deletion timestamp.

`Storefront` remains the domain and commerce identity. Its `liveWebsiteId` identifies exactly one active website. Its `websitePublicationVersion` detects conflicting publication switches across different website instances. Neither a draft nor a duplicate creates a vendor, channel, public hostname or commerce record.

The template catalog distinguishes availability from premium metadata. Harvest is the only available starter template. The `modern-farmhouse` identity remains reserved and unavailable for creation. Imported version-one references remain readable through a quarantined legacy renderer.

Backend `storefront-website-templates.ts` owns starter configuration and validation dispatch. Harvest starts from a fresh clone of its own defaults, never the live site's settings. Extra template settings have an explicit version and validator; version one supports an empty settings object and rejects unknown settings. Its working settings and published settings are stored separately. No speculative page builder or generic plugin framework was added.

Future templates must add their own defaults, schema/version handler, supported editor controls and visual composition. They may define different section models; they must not be normalized into Harvest's sections. The existing appearance contract remains the supported Harvest/legacy contract, not a requirement for future designs. A future independent schema will require the corresponding typed API/editor/SSR adapter and public allowlist.

## Shared and independent data

Each website stores its own homepage, authored page settings/content, public contact details, FAQ, policies, image selections, featured product selection, typography/palette/control settings and supported section configuration. Page visibility and saved unpublished changes belong to that instance. Platform legal terms and authoritative business records remain outside these settings.

Catalog, prices, variants, inventory, product images/media files, market schedules/availability, customer identity, carts, orders, payments and contact submission delivery continue using existing authoritative services. Instance configurations reference authorized existing assets and products. Creating, publishing, duplicating or soft-deleting a website never copies or deletes those business records.

## Schema and additive migration

Backend migration: `src/migrations/1794300000000-StorefrontWebsiteLibrary.ts`.

- Adds `platform_storefront_website`, its bounded-library index, nonnegative versions and ownership constraints.
- Adds a composite storefront/vendor/channel FK to prevent mismatched instance ownership.
- Adds `platform_storefront.liveWebsiteId` and `websitePublicationVersion`.
- Adds a composite live-pointer FK which requires the selected website to belong to that exact storefront.
- Copies one initial website for every existing vendor storefront, preserving raw draft/published JSON, legacy theme references, versions, publication timestamps and existing created/updated timestamps.
- Sets the initial live pointer. Existing legacy appearance columns remain intact as the public projection and recovery archive. Market rows do not receive website instances.

JSON is copied without normalization. A previous theme switch may have left different theme identities in draft and published content; both snapshots remain intact. Null legacy appearances remain null in storage. If only a publication exists, the editor uses it as its initial working configuration; otherwise the existing defaults remain in effect. Reading an instance applies the existing safe configuration validator.

TypeORM migration history prevents a second application. Storefronts provisioned after migration get an initial instance when their library is first opened. Initialization locks the storefront and is idempotent, including concurrent first opens. Website reads use a maximum page size of 50; the UI requests 20. Creation has no draft-count limit. Existing bounded configuration/product/media/preview safeguards remain in force.

Old appearance reads remain available during the transition. Once a storefront has a live website pointer, old single-appearance mutations reject with `USE_WEBSITE_LIBRARY`. Market mutations retain their existing service behavior. Public requests continue reading the existing host-resolved published projection, including legacy fallback, and accept no website ID for selecting a public design.

### Recovery

The migration's `down()` refuses destructive rollback. Keep the new tables and export any new authored data before reverting application code. The old published projection remains usable by earlier public routing. Legacy draft columns preserve their migration-time values; subsequent per-instance drafts live in the new table. Recover from the snapshot only through a separately reviewed, explicit operation. Never reset or reseed the demo database to recover this feature.

## Publication and isolation

Save, rename, publish, duplicate and delete operations authorize the vendor/channel/storefront scope and use a consistent storefront row lock. Save/rename/delete/publish also compare the selected website's version. Publish additionally compares the storefront publication generation, so two concurrent sessions cannot both successfully switch different websites from the same observed state.

Publication validates the selected draft, immutable template/version, supported template settings, referenced story/Find Us assets and selected featured products. In one transaction it updates that website's published snapshots, publication timestamp, live pointer, generation and existing public appearance projection. A failure rolls back the whole transaction. Public readers see the prior committed projection or the new committed projection.

The former live website remains in the library. Its saved draft and published content are not touched by switching to another instance. Edits to a live website affect only its working draft until Publish. A previously published but inactive website can be republished even if its draft equals its last publication.

The library's Publish confirmation explicitly publishes the **saved draft**. If the original website already had unpublished edits, republishing it intentionally publishes those edits; switching away does not discard them.

## Editor and private previews

The library exposes Edit with the shared edit icon, Visit Website with the shared outbound icon, direct Duplicate/Rename/Publish/Delete buttons as applicable, and New Website with the shared plus icon. Redundant Preview and Refresh actions are removed. Action-row alignment preserves the shared ordinary control height, including next to a labelled selector.

The library opens an explicit `storefront` and `website` selection in the existing visual editor. API adapters target that instance for Save, Publish and Preview. Full document navigation preserves the selected channel and gives each website a fresh editor mount, undo/redo history, image-picker lifecycle and preview grant. The existing unsaved-navigation and business-switch/logout warnings remain authoritative.

The actual Astro renderer and existing inspect/browse bridge are reused. There is no second renderer. Preview grants include the website identity server-side, expire after five minutes, remain host-scoped and recheck current vendor ownership/membership and non-deleted instance state on every authorization. Migrated storefronts require an explicit website when requesting grants. Deleted instances cannot continue using an old grant.

Exact-origin/window checks, CSP, private/no-store responses, asset validation, disabled commerce/account mutations and public/draft separation remain in the existing preview pipeline. A guessed instance ID provides no anonymous read access. Preview still uses the existing process-local capability store and needs reconnection on expiry or backend restart.

## Duplication, naming and deletion

Duplicate explicitly deep-copies the source's current saved working configuration and template settings, retains authorized media references, assigns a new identity/name, resets the version and starts unpublished. Its JSON arrays and section IDs belong to the new instance; editor selection/history never carries over. It does not copy unsaved browser edits or change the source. Duplication of retired Modern Farmhouse templates is disabled.

Names are trimmed, required and bounded to 200 characters. Deletion names the target in a shared confirmation dialog. It compares the version, takes the same publication lock and refuses the live website. Deleted records retain their snapshots and timestamps; there is no cascade into shared assets/products/orders. A restore UI is deferred.

## Modern Farmhouse retirement

The populated local demo audit found **no Modern Farmhouse draft or published references**. Willow & Grain remains Harvest, appearance version 53. The audit cannot establish the contents of other database environments. The additive migration therefore preserves legacy premium references, rather than rewriting their JSON or making their public renderer unavailable.

The rejected implementation has been removed from its active-design locations and quarantined for migration compatibility:

| Former location                                                       | Compatibility location                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/storefront/src/components/modern-farmhouse/Header.astro`        | `apps/storefront/src/components/legacy-modern-farmhouse/Header.astro`        |
| `apps/storefront/src/components/modern-farmhouse/Home.astro`          | `apps/storefront/src/components/legacy-modern-farmhouse/Home.astro`          |
| `apps/storefront/src/components/modern-farmhouse/Footer.astro`        | `apps/storefront/src/components/legacy-modern-farmhouse/Footer.astro`        |
| `apps/storefront/src/components/modern-farmhouse/ProductLayout.astro` | `apps/storefront/src/components/legacy-modern-farmhouse/ProductLayout.astro` |
| `apps/storefront/src/components/modern-farmhouse/VendorCartLink.tsx`  | `apps/storefront/src/components/legacy-modern-farmhouse/VendorCartLink.tsx`  |
| `apps/storefront/src/styles/modern-farmhouse.css`                     | `apps/storefront/src/styles/legacy-modern-farmhouse.css`                     |

Imports now point to the compatibility files. They are unavailable as new templates. Existing scoped visual hooks needed by that renderer remain temporarily; Harvest branches retain their behavior. The historical theme document is marked retired.

Remove the compatibility directory, stylesheet and related scoped hooks after auditing **all supported databases** and explicitly retiring or migrating every old reference, including archived drafts. They must never serve as inspiration, a component base or a stylesheet base for Stage 2. The clean `modern-farmhouse` directory is available for a new implementation. Stage 2 must distinguish its new template/configuration version from legacy version one; reusing the stable identifier alone must not reinterpret old content.

## Theme component boundaries and shared UI

Future theme visual components may independently own header/footer, navigation, buttons, cards, galleries, forms, cart/checkout presentation, sections, disclosures and motion. Keep their styles local to their renderer/version. Share accessible primitives when useful without requiring another theme's visual layout. Never change Harvest globally to accommodate a premium design.

Commerce queries/mutations, payment and authentication boundaries, contact submission, asset validation, authorization and route/data-fetching contracts remain shared and authoritative. New themes receive those results through route/controller contracts and own only presentation. Private preview continues rendering actual Astro routes.

`WebsiteLibrary.tsx` is a feature composition because the old appearance form has no multi-instance identity or lifecycle. It reuses the existing dashboard shell, Card, Badge, Button/link adapter, UtilityIcon, Dialog, Field/Input, SelectField, Pagination, Spinner, ErrorState and EmptyState. Its small stylesheet only arranges these shared components. No new UI library, parallel primitive system, category approval, breadcrumbs or numbered/eyebrow UI headings were introduced.

## Local file map

- Web feature: `apps/admin/src/WebsiteLibrary.tsx`, `website-library.css`, `StorefrontAppearance.tsx`, `VisualStorefrontEditor.tsx` and the storefront navigation boundary in `AdminShell.tsx`.
- Web contracts: `packages/api/src/storefront-appearance.ts`, `packages/theme/src/storefront.ts` and vendor navigation in `packages/admin-core/src/index.ts`.
- Compatibility relocation: `SiteLayout.astro`, homepage/product-detail imports, the `legacy-modern-farmhouse` component directory and stylesheet. Existing theme/preview functionality already present in the working tree was retained.
- Backend: `storefront-website.ts`, `storefront-website-templates.ts`, `StorefrontWebsiteLibrary` migration, appearance service/resolver, storefront entity fields, plugin entity registration and the minimal new GraphQL introspection fields.
- Qualification/tooling: backend `website-library.ts`, `website-audit.ts`, shared test migration configuration, web `website-library.test.tsx`, updated legacy theme test and npm scripts in both repositories.
- Guidance: this report, `COMPONENT_USAGE_GUIDE.md` and the retirement notice on the historical Modern Farmhouse document. No unrelated existing local edits were reverted.

## Verification

- Website-library integration: passed in a guarded disposable PostgreSQL database. Exercises the actual additive migration over populated legacy records, separate drafts/publications, timestamps/theme/version preservation, repeated/concurrent setup, defaults, isolation, duplication, soft deletion, immutable templates, versioned setting rejection, stale versions, concurrent publish switches, publish/delete races, retained previous content, unchanged commerce rows, stable host resolution and preview ownership/revocation.
- Anonymous GraphQL requests cannot list/read guessed websites or issue preview grants. Cross-vendor reads and all mutations reject. Existing appearance regression qualification also passed, including market behavior, staff/revoked authorization, assets and preview expiry/host checks.
- Frontend qualification: **84 tests across 16 files passed**, covering the library, transport scoping, dialog behavior, retired catalog entry, per-instance editor remount/history isolation, existing editor/page settings, About/Find Us/FAQ/Contact/Policies, preview bridge/security, text sizes and market storefront behavior.
- HTTP-only actual Astro qualification passed on all 11 vendor routes, including Harvest and legacy compatibility, unsaved render, public isolation, commerce preview denial, CSP/origin/host protections and unchanged market rendering. No browser acceptance tests or screenshots ran.
- Web TypeScript/Astro: passed, 132 Astro files with zero errors, warnings or hints. Targeted ESLint, formatting and nine-workspace boundaries passed.
- Web storefront/admin production builds and backend dashboard/server/worker build passed. Existing bundle-size advisories and a PostgreSQL client deprecation warning remain.
- An initial website integration run found a missing hostname migration in its isolated fixture. The fixture was corrected. That failed database was retained by the existing harness: `vendure_test_websites_1792881354414_103440`. Successful qualification databases were removed by their guard.

Useful reruns from the web folder:

```powershell
npm run test:storefront:websites
npm run test:storefront:homepage
npm run typecheck
npm run build
```

Backend qualification, from `E:\coding\farmers-market-platform`:

```powershell
npm run test:storefront:websites
npm run test:storefront:appearance
```

Both backend suites create their own disposable databases. Never redirect them to the persistent demo database.

## Persistent database preparation

Preflight verified `vendure_demo_market_ops` on PostgreSQL loopback address `::1` and exactly one pending migration, `StorefrontWebsiteLibrary1794300000000`. The guarded command applied only that migration. Postflight confirmed it is the latest applied migration and no migrations remain pending.

Snapshots are ignored local files in backend `.demo-market-operations/website-backups/`. The final pre-migration snapshot is `appearances-1792882418159.json`; the verified post-migration snapshot is `appearances-1792882466680.json`. It contains all storefront appearance records, ownership/hostname identifiers and migration history. The only authorized persistent database changes were the additive Website Library schema, initial website rows and storefront live pointers. No reset, reseed, order, inventory or market change was performed. Snapshot comparison verified unchanged legacy appearance JSON, versions/timestamps, ownership identifiers and hostnames, including Willow & Grain at appearance version 53. Backup files remain ignored local artifacts.

The approved migration has already run. For a future preflight or required migration, use these commands from the web folder:

```powershell
npm run demo:market-operations:website-audit
npm run demo:market-operations:migrate
Push-Location E:\coding\farmers-market-platform
node --require ts-node/register scripts/market-operations-demo/website-audit.ts --verify E:\coding\farmers-market-platform\.demo-market-operations\website-backups\appearances-1792882418159.json
Pop-Location
```

If a newer pre-migration snapshot is created, use its exact path for verification. The audit validates the actual database/server target, lists pending migrations and takes a non-destructive snapshot. Post-migration `--verify` checks that legacy appearance JSON, versions/timestamps, identities and hostnames are unchanged, and that each vendor has exactly one matching initial website/live pointer. If another user intentionally edits appearances between snapshot and verification, investigate that difference before accepting the migration.

## Exact manual testing

The approved guarded migration and snapshot verification are complete. Do not reset/reseed or run fixture commands. Start or restart each required process from `E:\coding\farmers-market-platform-web` in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in as Willow & Grain Farmstead, `homepage.vendor@example.test`, using its existing credentials. Open `http://localhost:4322/vendor/storefront` and select its existing vendor channel if necessary.
2. Confirm the live card shows the original Harvest website and its known publication date. Visit `http://homepage-vendor.localhost:4321/`; note the existing public heading and content.
3. Choose New Website +, keep Harvest, name it Holiday Harvest and create it. Confirm its editor starts with starter content, not a copy of the live site's authored content.
4. Open Hero, change Hero heading to a distinctive holiday heading, and change other page settings/images as desired. Confirm the actual private Astro preview changes while the public URL remains unchanged.
5. Save draft. Reload the editor and confirm the saved heading/settings return. Open a page, make an unsaved change and follow Back to Website Library; cancel the existing discard warning to retain the edit. Save it or explicitly discard before leaving.
6. Use the draft card's Rename button and confirm the name persists. Choose Duplicate. Confirm the copy opens with the source's saved content, then edit/save a different heading. Reopen the source and confirm it retains its own heading. Undo in the new editor must not restore another website's history.
7. Return to the library. Choose Publish on the holiday draft and confirm the named saved-draft publication. Reload the original public hostname and confirm it now shows that website.
8. Confirm the former live website remains in the library with its own content. Edit it if needed, or publish its saved draft through its Publish button. Confirm the same public URL now serves it. Any pre-existing saved unpublished changes on that instance are preserved and explicitly published by this action.
9. Delete an unused draft. Confirm the dialog names it, cancellation preserves it and confirmation removes only that card. Live cards have no Delete action. Shared catalog/media records and existing orders remain available.
10. Open two sessions before publishing different drafts. Publish in one, then attempt to publish from the other stale session. Expect a version conflict, retained content and no second live website. Refresh/reopen the library to load the committed publication generation.
11. With two editor tabs for the same instance, save in one and attempt a stale save in the other. Expect conflict feedback; copy important unsaved text before reloading. Saving the live site's draft must never change the public presentation until Publish.

### Unauthorized access and previews

- Copy an editor URL, sign out and open it without an authenticated vendor session. No draft should load. Merely knowing the `website` query parameter must not grant access.
- As a different vendor, attempt that URL and GraphQL `ownStorefrontWebsite`/`changeStorefrontWebsite` calls with Willow's storefront and website IDs. All must reject; do not modify unrelated vendors to perform this check.
- Choose Edit on any saved draft to open its private Astro preview. Confirm the actual Astro pages render it while an ordinary public tab still renders the live website. A public URL with `?website=<draft-id>` must still render the live website.
- Try cart/account/checkout actions inside private preview. They remain blocked. Wrong-host, invalid or expired preview grants must reject. Deleting a draft invalidates its prior grant.
- Select an unauthorized story/Find Us asset ID through a deliberate API test. Save, publish and preview validation must reject it. Normal media selection continues using the existing authorized library.

## Deferred work and limits

The persistent migration and snapshot verification are complete. The integrated manual UI workflow remains for developer evaluation. New Modern Farmhouse visuals, additional templates, theme billing/entitlements, cross-theme conversion, new navigation editors/page types, restore UI and automated browser/visual acceptance are outside this stage. The existing editor remains desktop-oriented. Template-specific version-one settings are intentionally empty until a concrete template defines a validated schema. The rejected renderer remains only as temporary imported-reference compatibility and must be removed after a complete legacy-reference retirement audit.
