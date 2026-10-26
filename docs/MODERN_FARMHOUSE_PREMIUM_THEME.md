> Retired implementation record. This rejected design is unavailable for new websites. Its renderer is quarantined under `legacy-modern-farmhouse` solely for migrated references. Do not consult this document or its source as design inspiration for Stage 2. See [Website Library](STOREFRONT_WEBSITE_LIBRARY.md) for the current architecture.

# Modern Farmhouse premium storefront theme

## Implementation and boundaries

Modern Farmhouse (`modern-farmhouse`) is an original second vendor theme. Harvest (`harvest`) remains the default. `storefrontThemes` in `packages/theme/src/storefront.ts` records labels, descriptions and premium identity. The vendor visual editor selects between them through the existing versioned appearance API. Backend validation accepts both identities and limits Modern Farmhouse to authorized vendor storefronts. No billing or entitlement enforcement was added.

All changes are local. No deployment, remote Git changes, migration, persistent database edit, seed or automatic theme selection occurred. Willow & Grain's saved and published configuration was not changed. Automated database qualification used the existing guarded `vendure_test_*` mechanism, never `vendure_demo_market_ops`.

## Architecture and component reuse

`SiteLayout.astro` dispatches the vendor shell. The homepage route dispatches its presentation after the existing catalog read. Product detail uses named slots around the same route-owned data, gallery, market banner, purchase island and information disclosures. No route/controller copies, new business service, general theme framework or new UI dependency were introduced.

New feature compositions live in `apps/storefront/src/components/modern-farmhouse/`:

- `Header.astro`: vendor brand, enabled-page navigation, native mobile disclosure and existing account/cart destinations.
- `Home.astro`: landscape hero, derived category discovery, featured catalog, authored About preview and closing invitation.
- `Footer.astro`: business identity, conditional navigation, public configured social links and attribution.
- `ProductLayout.astro`: a two-theme slot composition; Harvest retains its previous DOM hierarchy.
- `VendorCartLink.tsx`: a small island reading the existing vendor cart and listening to existing cart events. The count is the sum of authoritative line quantities; failures omit the count. It never creates a cart and is not mounted in private previews.

Existing Harvest compositions cannot express these layouts. These additions compose shared components rather than replace their primitives. `ProductCards` gained an optional theme argument with the previous default. Its premium version uses the shared embedded Card variant and retains product links, prices, availability and purchase controls. `storefront-menu.ts` enhances native menu disclosure without scroll locking. The existing gallery controller adds a premium-only, reduced-motion-aware image fade.

Reused components/contracts include Button and native `buttonClassName`, Card/`cardClassName`, SectionHeader, UtilityIcon, Input, Select, Textarea, PhoneInput, native DDN-03 disclosures, shared Dialog, semantic notices, EmptyState, Spinner, ProductGallery, ProductPurchase, FeaturedAdd, VendorPreorderBanner, VendorCart, VendorCheckout, PurchaseSuccess, ContactForm and ClosingInvitation. Shared card/disclosure CSS gained optional presentation tokens whose fallbacks preserve their previous values. New user/menu glyphs extend UtilityIcon. No dashboard appearance or pending component category was redesigned.

## Visual direction and page coverage

P01/P02 informed photographic scale and contrast; P03/P04 informed asymmetric discovery panels and mobile hierarchy; P05/P06 informed gallery and purchase-column balance. P07/P08 were secondary references only. C01 informed footer rhythm; C02/C03 informed commerce grouping. None of their screenshots, photography, branding, copy or external assets ships with the theme. No AI imagery or external fonts were added.

The theme combines the existing serif/sans font pairs, spacious editorial typography, fine dividers, photo frames and palette-derived surfaces. Styling is scoped to `html[data-storefront-theme='modern-farmhouse']` in `apps/storefront/src/styles/modern-farmhouse.css`. Shared control behavior, semantic variants, validation colors and focus handling remain authoritative.

| Route               | Modern Farmhouse presentation                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | New full-width photographic hero; staggered category-image panels; unboxed featured cards; image-first About composition; horizontal closing invitation.                                                                      |
| `/products`         | New split photograph/title introduction, horizontal desktop category navigation, roomier three-column catalog, two-column mobile catalog and native mobile category/sort controls.                                            |
| `/products/[slug]`  | New portrait main image with desktop thumbnail rail; title, price, market context, purchase controls and information accordions grouped in the adjoining column. On mobile, imagery precedes identity, market and purchasing. |
| `/cart`             | Existing two-column structure preserved; editorial line-item typography, photographic thumbnails, palette-derived summary surface and desktop sticky summary where viewport height permits.                                   |
| `/checkout`         | Existing contact/pickup/payment workflow preserved; refined field rhythm and summary surface, responsive two-column layout and themed payment-placeholder/validation states.                                                  |
| `/checkout/success` | Restrained centered page introduction and existing verified confirmation/order facts. Pending, failed and unauthorized states remain unconfirmed.                                                                             |
| `/about`            | Existing section layouts retained with editorial type and spacing. Maximum width remains 68rem; text alignment, image position, sizes, visibility and every shape remain supported.                                           |
| `/find-us`          | Normal storefront width; larger image-led featured market with adjoining date/address/actions; existing chronological schedule disclosures and preorder authority.                                                            |
| `/contact`          | Normal storefront width; ruled introduction, existing form/public-information split, softer public-information surface and themed fields. The five fixed public contact fields and inquiry workflow are unchanged.            |
| `/faq`              | 68rem editorial width, larger serif questions, fine disclosure dividers, readable answers and existing safe links/Contact invitation.                                                                                         |
| `/policies`         | 68rem editorial width; policy titles beside body text on desktop and stacked on mobile, published revision date and existing safe links/Contact invitation.                                                                   |

The largest structural differences are the shell, homepage, Shop, product-detail grouping and desktop policies. Cart, checkout and the other content pages intentionally retain their existing functional compositions while adopting the theme's presentation. Customer/admin dashboards remain outside this theme work.

## Appearance, editor and data preservation

Only `theme` changes on selection. Existing content, ordered featured products, legacy story, public contact settings, FAQ, policies, section IDs, media references, alternate text, text sizes, palette, font pair, button shape and hover preferences remain intact. There are no new appearance fields. Existing saved settings do not record whether a default was explicitly chosen, so the implementation preserves every persisted value rather than guessing. Modern Farmhouse supplies its own composition, spacing, type scale and derived surface defaults within those choices. The hero alone uses landscape/full-width imagery; its saved Harvest shape remains stored for switching back. Other authored image shapes retain their existing geometry.

Category discovery derives up to three categories with safe images from the already loaded featured catalog. Images come from products in that category, with links to the existing `/products?category=...` destination. Categories without imagery are omitted. Explicitly empty featured selections stay empty. No extra catalog request or promotional CMS was added.

Theme changes participate in the existing history, optimistic save/publish versions and tenant/channel scope. The preview bridge treats theme identity as structural and submits the existing debounced same-origin POST to rerender actual Astro markup. It never emulates the theme in React. Capability, host/origin checks, CSP, asset authorization, commerce blocking and private/public separation are retained. Cart, checkout and success remain outside preview navigation. Category/query links retain the existing preview restriction and should be tested on the normal storefront.

Responsive layouts use the existing general breakpoint ranges. Menus remain native and keyboard operable, including Escape/outside dismissal, without a scroll lock. Cards use independent purchase controls; disclosures retain native details/summary. Motion is limited to image fades, clipped image scale, arrow feedback and existing shared hover/disclosure transitions. Reduced motion disables theme transitions and animations. Content is visible without animation JavaScript. Gallery and card images have reserved geometry; proportional authored images retain their existing natural sizing behavior.

## Automated verification

Results are recorded at completion below. These checks do not constitute manual visual acceptance. No browser, automated page navigation, screenshots or visual-diff tools were used. HTTP-only rendering starts an isolated temporary Astro server with a mock backend and no database. Test reports/captures were disabled with `FRONTEND_NO_EVIDENCE=true`.

- Frontend TypeScript and Astro check: passed, 132 Astro files, zero errors/warnings/hints.
- Frontend production builds: storefront and admin passed; existing large-chunk advisories remain.
- HTTP qualification (`npm run test:storefront:homepage`): passed on all 11 vendor routes under both themes, including populated cart, checkout, verified success, unconfirmed success, disabled navigation, actual unsaved theme render, public isolation, preview commerce denial and unchanged market shell.
- Backend `npm run test:storefront:appearance`: passed in a guarded disposable database, including theme/content round trips, authorization, private draft/published projections, optimistic conflicts, asset rules and unchanged product/variant/order/stock records. Successful database was removed by its harness. One earlier failed fixture run retained `vendure_test_appearance_1792877037104_5d2314` under the harness's failure-retention policy.
- Focused unit/component checks: all 16 theme-related files passed, including a final 11-test rerun covering theme selection, the preview bridge, text-size authority and the added in-flight cart-count race. The broader run also found two failures in unchanged `tests/storefront.test.tsx`: an older direct-add test omits the required occurrence and expects forbidden instead of validation; its older purchase test omits current variant/availability prerequisites and expects an immediately enabled Add to cart button. The authoritative commerce implementation was not altered to satisfy those obsolete assumptions. Existing React `act` warnings appeared in About editor tests.
- Targeted ESLint, Prettier, diff whitespace checks and package boundaries passed (nine workspaces).
- Backend dashboard/server/worker build passed with `APP_ENV=test` and `NODE_ENV=test`. The ordinary invocation requires an explicit environment under the existing configuration guard. No production configuration was changed. Its environment-specific generated GraphQL introspection churn was removed because the appearance field remains JSON and no GraphQL schema generation change is required.

HTTP/PostgreSQL qualification required local execution permission for loopback connections. Recovered test-fixture and listener-isolation failures were corrected. The earlier failed disposable database noted above was retained by the test harness; it has no connection to the populated manual-test environment.

## Manual testing with Willow & Grain

Use the populated local `vendure_demo_market_ops` environment and **Willow & Grain Farmstead**, login `homepage.vendor@example.test`. Use its existing credentials. From `E:\coding\farmers-market-platform-web`, start/restart the required processes in separate terminals:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

No migration, reset, fixture or seed command is needed. Restart the backend to load its expanded validation contract; refresh the admin editor and storefront. Do not run ordinary backend dev scripts against `vendure`.

1. Open `http://localhost:4322/vendor/storefront`. Verify Willow & Grain is the selected business. Record its current published theme/settings and keep a separate published storefront tab open at `http://homepage-vendor.localhost:4321/`.
2. Open Theme settings, select **Modern Farmhouse · Premium**. The iframe should show the actual photographic Astro composition before saving. Confirm that the separate public tab still shows its previous published theme.
3. Undo the theme selection, then Redo it. Confirm both layout changes and retention of existing text, photos, featured ordering, fonts, palette, shapes and page settings. The hero uses a landscape crop; other image shapes remain honored.
4. Browse homepage, Shop, a product, Our Story, Find Us, Contact, FAQ and Policies inside the preview. Switch desktop/tablet/mobile tools. In inspection mode edit text temporarily, switch themes and verify that the text survives. Undo temporary changes if unwanted.
5. Save draft. Reload the editor to confirm its saved theme; refresh the public tab to confirm it is unchanged. Only when ready, select Publish saved changes and verify the public theme. Check a second stale editor tab reports a version conflict rather than replacing newer edits.
6. Review `/`, `/products`, `/about`, `/find-us`, `/contact`, `/faq` and `/policies` on the published storefront. Compare both themes by saving/publishing deliberately through the editor. Switch back to Harvest and verify original content, layout and appearance; select Modern Farmhouse again if desired.
7. On Shop, use the currently offered authoritative pickup markets, categories, sorting and pagination. Willow fixtures include Produce, Bakery and Pantry, with Swiss Chard Bundle, Country Sourdough Boule and Wildflower Honey. Follow actual product links; the imported source uses `/products/willow-grain-0` for chard, `/products/willow-grain-3` for sourdough and `/products/willow-grain-5` for honey, if those slugs remain unchanged.
8. Open one available product for the selected market. Check gallery thumbnails, variant selection, quantity, information accordions and related products, then add one unit through the existing cart action. Confirm the header count updates. If no current occurrence is eligible, verify the unavailable state and pause purchase testing. Do not assume old fixture dates remain future, alter attendance or restock inventory to force a purchase.
9. Review `/cart`: image, quantity controls, remove, totals, market context, loyalty if present and Continue shopping. Where two current eligible occurrences exist, confirm a populated cart prevents incompatible market switching. Retain existing order/stock authority.
10. Open `/checkout` with that cart. Review contact fields and international phone controls, pickup, summary, disabled/loading/validation and payment placeholder. Trigger field errors through the existing details-validation step. Do not process payment or enable a provider.
11. Review `/checkout/success?order=<authorized-existing-order-id>` using an already confirmed order belonging to this customer, if available. Verify actual confirmation facts. Without an authorized committed order, `/checkout/success` must show unconfirmed status, never fabricated success. Do not create a paid order solely for visual QA.
12. On a phone-sized viewport, check menu open/close, Escape and focus, account/cart reachability, grid readability, gallery, cart summary, checkout phone controls, contact forms and footer. Check long names/content and large text for overflow. Use the live storefront for category filters and purchasing, which are deliberately blocked inside the preview.
13. Check each About section layout, image-left/right, text alignment, small/medium/large image size and all saved shapes. Include proportional Straight/Rounded images. Confirm About, FAQ and Policies remain 68rem maximum, while Find Us and Contact retain normal storefront width.
14. Check FAQ/disclosure keyboard interaction and safe links. Confirm the FAQ editor's always-visible question/answer fields, the fixed Contact fields, and Policies' modal/reorder/delete/visibility workflows remain intact. Submitting a valid Contact inquiry creates real vendor inquiry data, so do that only if wanted; invalid-form validation can be reviewed without submission.
15. Enable reduced motion in the OS/browser and confirm animation stops with usable focus/controls. Verify missing images, empty selections and unavailable markets have honest fallbacks. Temporarily disable optional pages in an unsaved draft and confirm their header/footer links disappear; Undo afterward if retaining the original configuration.

## Limits and deferred work

Manual visual/responsive acceptance remains with the developer. Premium entitlements, theme purchasing and billing are deliberately deferred. There is no new CMS, announcement system, review system, newsletter service, payment provider or page type. Discovery panels depend on featured products with category imagery, so a minimal catalog intentionally yields fewer panels. Existing cart/checkout/contact workflows and account/dashboard boundaries are reused. No populated database migration or automatic publishing is necessary.
