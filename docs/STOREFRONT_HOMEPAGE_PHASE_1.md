# Storefront homepage Phase 1

Implemented locally on October 22, 2026. Visual acceptance is pending your manual review. No deployment, remote Git operation, persistent database migration, or persistent fixture setup was performed.

## What changed

- Vendor homepage: editorial hero, existing product photography when available, a three-product collection, optional brand story, shopping invitation, responsive navigation, and footer.
- Market homepage: a separate destination composition with the next market date and venue, upcoming date cards, participating vendors from the existing public occurrence catalog, optional market story, visit invitation, and footer. Application links appear only for an advertised public application.
- Both layouts use real backend projections. Missing photography uses a decorative botanical illustration; missing products, dates, or vendors show honest empty states. No testimonials, sales claims, or fabricated business metrics were added.
- Vendor and market dashboards have **Storefront Appearance**, with a draft editor, appearance sample, explicit publishing, optional About controls, and a shell-level **View Storefront** link.

## Theme and component foundation

`harvest` is the single stable theme identifier. Its strict configuration contains a palette, button shape, button hover effect, homepage text/image/story, and About content. Existing stores receive defaults without needing seed data. Historical `modern`/`community` template tags still identify the existing vendor/market compositions; they are not additional new themes.

`packages/theme/src/storefront.ts` supplies validated brand/control tokens. `storefront.css` applies the same button behavior in the storefront and dashboard preview. Astro components under `apps/storefront/src/components/home/` supply the hero, header, artwork, and footer; named components and hero slots permit later Astro or React SSR compositions without a builder or whole-page hydration.

The existing ProductCards, SectionHeader, EmptyState, native Astro Button adapter, React Button, Card, forms, icons, and AdminShell are reused. ProductCards gains an opt-in homepage presentation using the approved embedded/flush Card variants. The Button adapter gains local action links through the existing button presentation function. No UI library or competing button/card system was introduced. New homepage compositions were necessary because the old vendor/market heroes had no shared editorial composition or responsive public menu. Their CSS is scoped to the homepage. Other pages keep their existing layouts and heading font; appearance colors and button tokens apply consistently across the storefront. Pending registry categories remain pending.

## Customization and About

Available palettes: Sage, Terracotta, Coastal blue, Charcoal. Foreground, muted text, and primary colors pass 4.5:1 contrast checks against their light backgrounds. Buttons offer square, softly rounded, or pill shapes, plus lift, darken, or outline hover behavior. Touch and reduced-motion guards preserve ordinary interactions.

Owners can edit the hero heading, introduction, optional image URL, and short homepage story. Blank fields use sensible defaults. Images use HTTPS or loopback development URLs; production images must also satisfy the existing asset-origin CSP. No upload workflow was added.

The preview uses the actual public tokens, hover stylesheet, and shared Button. It is an appearance/content sample, not a full live draft homepage with commerce data. Unsaved edits update the sample immediately. **Save draft** persists privately; **Publish saved changes** publishes the saved version. Editing after saving requires another save before publishing.

About is disabled by default. Its title and plain text use existing form controls. Published enabled content appears at `/about` and in navigation; disabled content returns 404 and has no navigation link. Disabling preserves private saved content for re-enabling. Astro escapes content, including HTML and scripts. About intentionally has only basic typography and spacing.

## Backend and authority

Additive migration: `farmers-market-platform/src/migrations/1793800000000-StorefrontAppearance.ts`. It adds private draft JSON, published JSON, an optimistic version, and publication time to the existing Storefront entity. Configuration belongs to the storefront's existing vendor/market and channel, never the account. Where a business has multiple storefronts, the editor and shell expose a selector.

Admin operations: `ownStorefrontLinks`, `ownStorefrontAppearance`, `saveOwnStorefrontAppearance`, `publishOwnStorefrontAppearance`. Save/publish serialize on the storefront row, reject stale versions, and recheck current business membership/grants. Vendor editing requires current owner membership and `ManageOwnStorefront`; market editing requires current market-admin membership and `ManageMarketStorefront`. New market-admin role presets include that existing permission. Existing roles are not silently rewritten. Read-only business users can receive a valid shell link without gaining editing rights.

Public reads extend the existing host resolver with an explicit published-only projection. Drafts, versions, and publication metadata never enter that DTO. Disabled About content is omitted from public projection. Homepage and About responses use no-store caching. Validation rejects extra keys, invalid enum values, oversize text, unsafe image protocols, credentials in image URLs, and incomplete enabled About content. No arbitrary CSS enters the style contract.

View Storefront uses the selected channel, reloads when business context changes, and asks the same host resolver for a usable canonical URL. Existing eligible hostname/custom-domain routing remains authoritative. Local hosts retain the configured local storefront port; eligible nonlocal hosts use HTTPS. Missing, inactive, or unresolved storefronts produce no functional link. Links use a shared icon/button presentation, `target="_blank"`, and `rel="noopener noreferrer"`. The button appears inside the existing desktop toolbar/mobile menu.

Commerce, account sessions, domain ownership, product publishing, inventory, carts, checkout, payment, loyalty, and order controllers remain authoritative and are reused.

## Verification

Passed:

- 28 focused Vitest tests across `storefront-appearance.test.tsx`, `storefront.test.tsx`, and `market-storefront.test.tsx`: schema/contrast, editor draft/publish sequencing, retained About text, context-specific shell URLs, and existing storefront/cart boundaries.
- Guarded disposable PostgreSQL test `test/farmers-market/storefront-appearance.ts`: real persistence, default settings, unpublished isolation, publishing, stale-version rejection, cross-vendor and cross-market rejection, staff/revoked access, disabled About redaction, anonymous API denial, canonical URLs, fixture idempotence, and preservation of manually edited fixture drafts.
- HTTP-only Astro SSR script: both homepages, palette tokens, product/occurrence/vendor links, empty data, escaped About text, enabled navigation, and disabled About 404/navigation. No browser automation, screenshots, or visual captures.
- Web TypeScript and Astro checks, focused ESLint, package-boundary checks, changed-file formatting, storefront/admin builds, backend TypeScript, demo-tooling TypeScript, and backend server/worker/dashboard build. Existing bundle-size advisories remain; no full regression suite was run.

Useful rerun commands from the web directory:

```powershell
$env:FRONTEND_NO_EVIDENCE = 'true'
npx vitest run tests/storefront-appearance.test.tsx tests/storefront.test.tsx tests/market-storefront.test.tsx
npm run test:storefront:homepage
npm run typecheck
npm run build
```

From the backend directory:

```powershell
$env:NODE_ENV = 'test'
npm run test:storefront:appearance
# Local build only. Explicit mode avoids Vite's default production-mode guard.
$env:APP_ENV = 'dev'
$env:NODE_ENV = 'development'
npm run build
```

Successful disposable databases were dropped through the existing guard. Three intermediate failed-run databases were retained by that guard for diagnostics: `vendure_test_appearance_1792703698102_bb2ea6`, `vendure_test_appearance_1792703762038_457e0a`, and `vendure_test_appearance_1792703844324_60196f`. The final qualification passed.

## Manual testing against the populated database

The existing `vendure_demo_market_ops` dataset and established Manna Roots/manager accounts were not modified. The following commands are provided for a separately authorized local preparation step; they have not been run against that database.

From `E:\coding\farmers-market-platform-web`, apply pending migrations through the guarded command after confirming the target is the existing local `vendure_demo_market_ops`. Do not reset or reseed it:

```powershell
npm run demo:market-operations:migrate
npm run demo:market-operations:storefront-fixtures
```

The fixture command refuses a missing database or pending migrations and cannot apply migrations. It uses the existing demo-environment guard and maintenance lock. It creates only dedicated design identities, verified synthetic test-account records, three test products with stock, approved market participation/offerings, and one future market date through existing business services. It preserves established accounts and previously saved appearance edits. Test products are explicitly labeled design fixtures. Product media is optional, so these fixtures initially demonstrate the illustration fallback; set an allowed hero image URL to evaluate photography.

Start each normal demo process in its own terminal:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

| Context        | Dedicated login after fixture setup | Public homepage                          | Appearance route                          |
| -------------- | ----------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Vendor         | `homepage.vendor@example.test`      | `http://homepage-vendor.localhost:4321/` | `http://localhost:4322/vendor/storefront` |
| Market manager | `homepage.market@example.test`      | `http://homepage-market.localhost:4321/` | `http://localhost:4322/market/storefront` |

Both use the existing local-only `demoPassword` reference in backend `scripts/market-operations-demo/environment.ts`. These identities were qualified in a disposable database; they are created in the persistent database only by the fixture command. Sign in through the existing account flow and select the matching business context. The fixtures do not enable About initially.

1. Visit both homepages at desktop, tablet, and narrow phone widths. Review typography, spacing, hero imagery/illustration, product cards, date/vendor sections, footer, and absence of horizontal overflow. Use keyboard navigation and the mobile Menu; verify Escape closes it and Cart/Account remain reachable.
2. As the vendor, open Storefront Appearance. Change palette, button shape, and hover effect. Confirm the sample changes immediately. Save draft, refresh the public homepage, and confirm it remains unchanged. Publish saved changes and confirm the public appearance changes. Repeat as the market manager and confirm the vendor appearance stays independent. Check reduced-motion behavior manually.
3. Add homepage text/story and an allowed image URL. Save/publish and verify the matching homepage. Clear the image to verify the existing product-image or illustration fallback.
4. Enable About, enter a title and multiline content, and save without publishing. `/about` must remain 404. Publish: the link and content must appear. Enter literal HTML to confirm it displays as text. Disable and publish: the route must return 404 and links disappear. Re-enable to confirm retained content.
5. Use View Storefront from another dashboard page, then from the mobile menu. Confirm it opens the matching homepage in a new tab. Switch business context and confirm the link follows it. Platform-only contexts have no functional storefront button.
6. Follow vendor product links through the existing catalog/product/cart workflow. On the market, follow the next-date action, date cards, and a vendor's offerings link. The vendor filter must be applied in the existing occurrence catalog. Review About-enabled navigation on those unchanged pages too.
7. Open appearance settings in two tabs, save in one, then try to save/publish from the older tab. Expect a conflict and reload instruction. Re-running fixture setup must retain the edited draft. Existing read-only/revoked accounts must not gain editing authority.

The dedicated date is initially seven days ahead and is preserved on reruns. After it expires, schedule another date and its offerings through the existing dedicated manager/vendor workflows. Existing roles lacking `ManageMarketStorefront` require the normal platform permission-management workflow; no existing account grants were changed automatically.

## Boundaries and deferred work

All Phase 1 feature areas are implemented in code. Persistent demo preparation and your visual/responsive acceptance remain outstanding. No additional themes, full live draft-page preview, media uploader, page builder, arbitrary TSX upload, section reordering, CMS/revisions framework, or redesign of product, listing, checkout, or account pages was added. Broader storefront styling remains deferred until homepage review.
