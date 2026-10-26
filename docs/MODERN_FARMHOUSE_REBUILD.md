# Modern Farmhouse rebuild

Implemented locally on October 24, 2026. The selectable premium template is `modern-farmhouse`, version `2`. Visual acceptance is pending developer review. No deployment, remote Git changes, generated imagery, persistent database changes, fixture population, or live website publication was performed.

## Architecture and configuration

The existing Website Library, website identities, optimistic versions, publication generation, locks, duplication, deletion, and preview capabilities remain authoritative. New Modern Farmhouse instances receive version two and independent starter settings. Harvest still receives version one and its existing defaults. Retired Modern Farmhouse version-one records retain their compatibility renderer and cannot be duplicated into version two.

`packages/theme/src/modern-farmhouse.ts` defines the typed Zod schema, fresh defaults, renderer discriminator, and bounded page typography adapter. The backend's `modern-farmhouse-settings.ts` supplies its corresponding typed, strict validator and starter configuration. Both reject unknown settings, wrong versions, duplicate/missing section identities, unsupported destinations, unpaired image IDs/URLs, excessive text, and excessive product/tile selections.

Version-two settings contain:

- Six independently ordered and visible sections: cinematic opening, editorial discovery, products, image/story, product story, and closing invitation.
- Section copy, CTAs, authorized photographs, separate desktop/mobile crop positions, up to three editorial tiles, and selected product IDs.
- Evergreen, clay, or charcoal palettes; literary or classic system serif typography.
- Navigation labels, footer copy, shop introduction, story composition, and gallery presentation. The older overlay/message fields remain in stored settings for compatibility, but their editor controls and utility banner have been retired.

These settings persist in each instance's `templateConfig` and `publishedTemplateConfig`. Shared authored pages persist in that instance's existing draft/published page records. Homepage composition does not read Harvest's authored homepage sections. The optional `appearance.template` object is a validated transport/editor envelope containing the explicit identity, version, and settings. The admin API adapter separates that envelope from appearance JSON on save; it is not stored in the legacy appearance column. New starter content does not copy the live site's authored copy, photographs, or asset/product IDs.

Public resolution joins the active website and its published settings in the same database statement, scoped to the storefront/vendor/channel tuple. Unknown versions fail closed. Public authored content continues through the existing allowlist; hidden premium sections have their presentation content cleared in the public projection. Saving another draft cannot change that response. Publication still atomically updates the instance snapshots, live pointer, generation, and compatibility appearance projection.

Private preview uses the actual Astro routes. Its capability resolves an owned, non-deleted website, and its immutable template/version must match the submitted envelope. Image ownership and selected products are checked during save, publication, and unsaved preview. The preview client requests a full Astro render for version-two changes instead of applying Harvest's DOM patches. Existing host/origin, expiry, CSP, account and commerce restrictions remain in place.

## Presentation and reference use

All eleven local reference images were inspected: P01 through P08 and C01 through C03. No reference images, brand assets, logos, or third-party copy are shipped in the theme.

P01/P02 informed the utility strip, three-part masthead, central vendor identity, separate navigation band, and photographic header overlay. Mobile has its own native disclosure navigation with Escape, outside dismissal, focus return, and visible controls. This is independent markup, rather than a centered Harvest header.

P03/P04 informed the broad first discovery panel, smaller supporting photographs, offset caption surfaces, and circular arrows. P05/P06 informed the large main product photograph, substantial supporting images, and integrated purchase column. P07/P08 supplied secondary photography/composition cues. C01 informed the large footer identity and contrasting surface; C02 informed commerce grouping; C03 informed category navigation and grid organization.

The theme uses original CSS and system fonts, warm ivory surfaces, preset dark accents, restrained dividers, image movement, native disclosure interactions, and reduced-motion handling. Photographs come from authorized selections or actual catalog imagery. Missing photographs have stable, truthful placeholders. No stock screenshots are used at runtime.

The new visual components live exclusively in `apps/storefront/src/components/modern-farmhouse/`: Header, Footer, Home, Photo, ProductCards, Shop, Gallery, ProductLayout, ProductInformation, Purchase, Cart, Checkout, Success, Content, FindUs, Invitation, ContactForm, and the navigation helper. Their stylesheet is `apps/storefront/src/styles/farmhouse-v2.css`. Its link is emitted only for version two, whose root uses a separate theme marker so quarantined selectors do not match it. This directory imports no Harvest or quarantined presentation.

The architectural reason for new components is the explicitly authorized independent theme design. Existing shared storefront visual compositions and approved ordinary dashboard controls cannot supply that design. The admin editor continues using approved fields, buttons, selectors, checkboxes, and the authorized media library. This does not approve a competing dashboard primitive or alter the design registry.

## Route coverage and shared functionality

| Route               | Version-two presentation                                                                                             | Shared authority                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Photographic opening, asymmetric discovery, product merchandising, story spread, product feature, closing invitation | Existing product/catalog queries and authorized media                                                                  |
| `/products`         | Editorial introduction, category navigation, sort controls, original product grid, empty states, paging              | Existing category/sort/pagination and market availability helpers                                                      |
| `/products/[slug]`  | Editorial gallery, purchase column, independent option/quantity controls and information disclosures                 | Product queries, variants, pricing, stock refresh, market eligibility, cart mutations, related products                |
| `/cart`             | Photographic bag rows and separate summary composition                                                               | Existing cart/session controller, quantity/remove rules, market switch authority, totals and loyalty                   |
| `/checkout`         | Independent grouped form and staged checkout presentation with order panel                                           | Existing contact validation, phone input, pickup, order/payment boundaries, reconciliation, and disabled payment state |
| `/checkout/success` | Independent verified receipt or unconfirmed status                                                                   | Authorized checkout status and account-link operation                                                                  |
| `/about`            | Editorial spreads, image positioning, shapes/sizes, comfortable prose and closing invitation                         | Instance-owned story records and existing editor                                                                       |
| `/find-us`          | Editable image/text introduction, next appearance, chronological schedule and closing invitation                     | Confirmed appearances, timezone, venue, preorder and cart-switch operations                                            |
| `/contact`          | Independent form and conditional public-information column                                                           | Shared guest contact controller, validation, idempotency, rate limiting, inquiry storage and vendor notifications      |
| `/faq`              | Native theme-owned question disclosures and contact invitation                                                       | Ordered, visible, instance-owned questions and safe links                                                              |
| `/policies`         | Readable long-form sections and published revision date                                                              | Existing policy modal, reorder/visibility/delete behavior, safe links and publication metadata                         |

The nonvisual controllers extracted into `apps/storefront/src/lib/use-{product-purchase,vendor-cart,checkout,vendor-checkout,contact-form}.ts` are consumed by both presentations. Existing Harvest JSX retains its presentation. Product queries, market services, authentication, contact delivery, payment providers, and backend commerce rules were not rewritten. The native menu and gallery controllers and phone/loyalty specialists remain shared. No new payment workflow was activated.

`FarmhouseEditor.tsx` supplies the actual premium section controls and design settings inside the existing visual editor. The old homepage/theme controls are omitted for version two. Shared page editors retain their specialist authoring capabilities. Undo/Redo, unsaved changes, Save draft, Publish saved changes, version conflicts, media authorization, and instance remount protections remain in the existing editor lifecycle. Website Library creation and duplication support version two; there is no conversion dropdown.

## Local file changes

Web: the new component directory, `farmhouse-v2.css`, `farmhouse-media.ts`, the five controller hooks, `FarmhouseEditor.tsx`, the theme schema, API adapter, WebsiteLibrary, VisualStorefrontEditor, editor preview bridge, SiteLayout, and the eleven route adapters. The five former combined controller/view components now consume the extracted hooks. Focused tests and the HTTP SSR harness were updated. `COMPONENT_USAGE_GUIDE.md` links this architectural exception. Other pre-existing local changes were preserved.

Backend: `src/plugins/platform-identity/{modern-farmhouse-settings,storefront-website-templates,public-storefront.controller}.ts`, `src/plugins/farmers-market/services/storefront-appearance.service.ts`, and `test/farmers-market/website-library.ts`. The sibling-project edits were explicitly approved during this session. No schema migration is needed for this stage.

## Verification

- 108 frontend tests passed across eleven focused files, covering the existing editor, website library, contact, cart, preorder, checkout and legacy compatibility plus the new schema, editor history/save, independent structure, purchase revalidation, and preview blocking.
- `npm run test:storefront:homepage` passed against actual Astro HTTP SSR for all eleven routes in Harvest, retired version one, and premium version two. It includes populated cart/checkout, verified and unconfirmed success, unsaved premium preview/public isolation, newly created sites' page previews, disabled links, escaping, Unicode, and commerce-preview denial. No browser automation or screenshots were used.
- Backend `npm run test:storefront:websites` passed using a guarded disposable `vendure_test_websites_*` database. Coverage includes migration preservation, independent drafts/defaults, premium duplication/rename/delete, ownership, stale versions, publication races, invalid settings, foreign assets/products, preview version enforcement, and published-only public rendering. Its successful database was dropped by the harness.
- Root TypeScript, Astro check (zero errors/warnings/hints), targeted ESLint, package boundaries, storefront build, admin build, and backend server build passed. Vite reports large-chunk warnings.
- The full Vendure `npm run build` dashboard stage still fails its existing `APP_ENV_EXPLICIT_MODE_REQUIRED` configuration policy, including when attempted with `APP_ENV=test` because the dashboard build selects production Node mode. The changed backend server independently compiles. No production configuration or secrets were changed to bypass that guard.
- One earlier failed assertion run was retained by the existing test harness as `vendure_test_websites_1792884298440_1da529`. It is disposable test data, separate from the persistent demo database. Later regression runs passed and cleaned up their own databases. The cleanup guard deliberately refuses cross-process cleanup.

## Manual review

Use the existing `vendure_demo_market_ops` environment. No reset, reseed, migration, or new fixture population is required. From `E:\coding\farmers-market-platform-web`, start or restart the existing integrated services in separate terminals as needed:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

1. Sign in to the admin as `homepage.vendor@example.test` using its existing credentials. Open [Website Library](http://localhost:4322/vendor/storefront) for Willow & Grain Farmstead. Confirm its existing Harvest website is still live at [the public storefront](http://homepage-vendor.localhost:4321/).
2. Choose New Website, select Modern Farmhouse Premium, and create two differently named drafts. Confirm each starts with the premium starter copy. Do not publish while inspecting initial isolation.
3. Edit the first draft. Choose existing authorized farm/catalog photographs for the opening and story sections. Review desktop/mobile crops, palette/type choices, header overlay, discovery tiles and product/category destinations. Move/hide sections, try Undo/Redo, then save. Check the second draft and public Harvest site remain unchanged.
4. Use the real preview to inspect Homepage, Shop, a product, Our Story, Find Us, Contact, FAQ and Policies at desktop, tablet and mobile widths. Enable and author the optional pages in that draft. Confirm image positions/shapes, FAQ ordering and policy modal editing. Cart, Checkout, Success and account mutations remain excluded from editor browsing.
5. Duplicate and rename the saved premium draft. Edit its copy and verify the source remains unchanged. With two editor tabs for one draft, save in one and confirm the other reports a stale version instead of overwriting it. Confirm an unsaved headline appears only in the private preview.
6. Only when you choose to change the live website, publish the saved premium draft. Review `/`, `/products`, a real `/products/[slug]`, `/cart`, `/checkout`, `/checkout/success`, `/about`, `/find-us`, `/contact`, `/faq`, and `/policies`. Review the new header and footer on each route, including long names, missing images, small catalogs, keyboard focus, mobile menu dismissal and reduced motion.
7. Check existing selected-market behavior, unavailable products, variant selection, add/remove/quantity updates, cart restrictions, loyalty and checkout validation. Do not place orders or submit payments for this review. An unconfirmed Success URL must report that the purchase is unconfirmed. A receipt requires an existing authorized, committed order.
8. Test a guest Contact submission only if you intend to create a real test inquiry and notification. Disabled pages must disappear from navigation. Review the prior Harvest draft before any later publication switch, since publishing always publishes that website's saved draft.

No requested route implementation is intentionally deferred. Manual visual acceptance and integrated UI evaluation remain outstanding by request. Billing, entitlements, arbitrary page-builder features, custom fonts, new payment methods and new catalog/market records remain outside scope. The existing bounded media/product pickers and desktop-oriented editor are retained. Starter imagery is deliberately unassigned; select the vendor's authorized photographs for the strongest visual result.

## Homepage design refinement

The subsequent homepage refinement removes the utility banner and search field from the new theme header, uses accessible icon-only account/bag links, an SVG text-path business-name arc, and uppercase navigation. The homepage header is sticky with a fully transparent initial background and a top-to-bottom fading backdrop blur. After scrolling it uses a readable themed surface. Its measured height offsets its normal flow space so the opening photograph fills the viewport from the top.

Homepage category and featured product cards share the theme's circle-arrow contract: inverse-color hover/focus treatment, a small up-right arrow translation, and photograph zoom. Featured product names and prices now sit over a theme-colored bottom gradient, with the circle at the upper right. Shop and related-product card layouts retain their existing presentation. The homepage story spread uses a roughly fourteen-rem desktop photograph crop instead of the previous forty-rem minimum, with a shorter mobile crop and content-driven height. Link hover treatments preserve keyboard focus and reduced-motion support.

Changed files for this refinement: Header, Home and ProductCards in the new theme directory, `farmhouse-v2.css`, SiteLayout, and FarmhouseEditor. Reload the local storefront and editor after the development servers pick up these source changes. No database migration or backend change is required.

The next refinement raises header backdrop blur to 36px with exponential-rise mask stops from the bottom toward the top; the scrolled header uses a fully opaque theme surface. The story spread minimum is now 28rem on desktop, with a 16rem mobile photo crop. Premium editing now uses Harvest's shared disclosure classes and controlled open/collapse behavior. Separate Header, Footer and Theme settings are available on every preview page and edit the same website-level settings. Homepage sections appear only on Homepage; shop, story composition and gallery settings appear on their corresponding pages. A focused regression checks collapse behavior and preservation of all three global settings while changing preview pages.

Verification for the editor/blur correction: 21 focused theme, Website Library and appearance tests passed, including global settings across preview pages; root TypeScript and targeted ESLint passed. No database or backend changes were made.

## Header, theme and featured-product controls

The header now has an instance-owned optional logo photograph, selected or uploaded through the existing authorized media library. The backend validates logo asset ownership and URL equality during draft save, publication and unsaved preview. Desktop places the logo at the left; mobile has symmetric logo/menu tracks around the centered arced company name. Account and bag links move into the mobile navigation, and the hamburger has no visible Menu label.

The theme editor includes all four existing Harvest palettes and five Harvest font pairs in addition to the premium presets. Every palette uses the same four-swatch option presentation as Harvest. Shared button shape and hover settings remain in the existing appearance fields and now control premium buttons, inputs and card corners. The new `farmhouse-presentation` theme export reuses the approved preset contracts for both the editor and SSR renderer. The additive logo and preset schema changes require no database migration; restart the integrated backend to load their validation.

Featured-product selection uses the existing wide Dialog, full product names, search, multi-selection, a twelve-product bound, and Apply/Cancel behavior. Reordering uses shared arrow IconButtons. Section visibility uses the existing enabled/disabled switch presentation.

The selected-section label is now an actual decorative span rather than a pseudo-element. This fixes the blue hero by preserving its photographic gradient layer and avoids changing sticky header positioning during inspection.

The new FeaturedCarousel composes the existing premium ProductCards with a small native scrolling controller because no reusable storefront carousel existed. It never clones, wraps or autoplays products. Previous/next chevrons disappear at their respective ends, both disappear if all products fit, and keyboard/touch scrolling remains available. Its circle controls use only theme color inversion, independent of configurable button hover/shape effects. Preview browsing permits these presentation-only controls while retaining commerce restrictions.

Changed files include the header, homepage/product cards and carousel, premium CSS, FarmhouseEditor, shared theme presentation/schema and API types, SiteLayout, editor preview bridge, focused tests, and backend premium settings/reference validation. No persistent demo data, prices, inventory, published website or orders were changed.

Verification for the logo/theme/carousel update: 24 focused frontend/editor/preview tests passed, HTTP SSR passed across all eleven routes, guarded backend website regressions passed including foreign-logo rejection and new preset persistence, and frontend builds, backend server build, root TypeScript, package boundaries, targeted lint and formatting passed. No browser automation or screenshots were used.

The header and link refinement slows the header color/background transition to 0.7s, keeps its settled surface opaque, explicitly binds menu and button text to the chosen paragraph font, and gives menu items a semibold weight. Navigation and text CTAs use a left-origin animated underline with no resting underline. Diagonal-arrow circles lift slightly with their inner arrow motion; carousel chevrons retain their explicit color-only exception. Keyboard focus and reduced-motion behavior remain supported. Changed files are the premium stylesheet and Footer arrow markup. Reload the local storefront; no backend restart or migration is needed for this refinement.

## Scroll fade, search and footer refinement

Added the website-wide optional `scrollFade` setting, off by default for existing and new websites. Theme settings uses the existing shared enabled/disabled switch presentation. Its frontend controller progressively enhances below-viewport content, reveals sections once, leaves the hero and initial viewport visible, and reveals content on keyboard focus. Reduced motion, unsupported observers and editor previews keep content visible. Frontend and backend validators accept only an optional boolean; historical saved configurations remain valid. No migration is needed.

The header's left position now contains the native product search form instead of an uploaded logo. Mobile keeps a search target at the left, a centered business name and the hamburger at the right; focusing search expands the field. Submitting opens the existing shop with product-name filtering, and sorting, category navigation and paging preserve the search. An empty result's Explore everything link clears the filters. Header anchors inherit the parent color animation without an additional color transition, keeping text synchronized with the surface.

Standard content has a fixed 80rem outer width, with approximately 74rem usable space, and matching bounded story/market/footer content. There is no editor width option. The hero, homepage photo/story spread, featured-section background and other full-width surfaces retain their full width. Section introductions stack their description below a wider heading. Discovery tiles use right-pointing arrows with their whole circles translating right; the inner arrow has no independent motion. Other diagonal circles and finite carousel controls retain their existing contracts.

The footer now contains Site (Shop, Our Story, Find Us, Contact, FAQ), Products (real product-category destinations) and Legal (Policies and a non-interactive future Terms & Conditions label). Disabled pages stay omitted, and FAQ and Policies are absent from the header. The invitation and tagline are removed, including their obsolete editor inputs. The Footer disclosure explains its page/category/contact sources. Business-name hover lifts and slightly darkens the name without an underline. Existing public social links remain. Retired stored logo/footer copy fields remain accepted for backwards compatibility but no longer produce hidden editing controls.

Footer categories reuse the public, channel-authorized catalog and existing shopCategories helper. A request-scoped WeakMap shares one bounded, paginated catalog read between the premium homepage/shop and footer; it never caches across requests, visitors, storefronts or preview authorization. The helper replaces duplicate catalog fetching only on premium routes. No new UI primitives or libraries were needed: this change composes the existing native storefront search, editor disclosure and switch contracts.

Local files changed for this refinement:

- Premium Header, Footer, Home and Shop components; SiteLayout; homepage and shop route adapters; farmhouse-v2.css.
- New farmhouse-scroll-fade.ts and farmhouse-catalog.ts controllers/helpers.
- FarmhouseEditor.tsx, theme modern-farmhouse.ts schema and API storefront-appearance.ts type.
- Backend modern-farmhouse-settings.ts and guarded website-library.ts regression.
- farmhouse-scroll-fade.test.ts, farmhouse-v2.test.tsx, HTTP SSR test script and this report.

Verification: 21 focused frontend/editor/preview tests passed, including fade opt-in, one-time reveal, keyboard focus, reduced motion and preview/unsupported-browser visibility. HTTP SSR passed across all eleven routes, including product search, empty results, real category links and footer/header separation. Guarded backend website regressions passed with fade-setting persistence and invalid-type rejection; each disposable database was dropped. TypeScript, Astro checks, targeted lint, package boundaries, frontend builds and backend server build passed. The full backend dashboard build still stops at the existing APP_ENV_EXPLICIT_MODE_REQUIRED configuration guard. Existing frontend chunk-size warnings remain. No browser automation, screenshots, deployments or persistent demo database changes were performed.

To load the backend validator, restart the existing local backend with `npm run demo:market-operations:serve` from the web directory. Use the existing `demo:market-operations:storefront` and `demo:market-operations:admin` scripts if those development processes need restarting, then reload the storefront/editor. Enable Fade in while scrolling under Theme settings to use the new effect. No migration command is required.

The next interaction refinement removes the search form's resting border and pointer-focus outline/shadow, including the expanded mobile border. Search retains its existing focus-visible outline for Tab navigation. A small header-local input-modality hook distinguishes pointer activation from Tab focus, since native text inputs may match focus-visible on pointer clicks; without JavaScript the native accessible focus fallback remains. Discovery photographs are 20% shorter across desktop and mobile (desktop clamp 16rem/24vw/28rem, mobile 14.4rem and first-card 19.2rem), preserving their crop and card interactions. Scroll reveals now begin when offscreen sections reach 80% of the viewport height, rather than 24px above its bottom. The observer uses a viewport-height-derived pixel margin to avoid width-relative percentage behavior. Reduced-motion, preview and keyboard-focus safeguards remain.

Files changed for this follow-up: premium Header.astro, farmhouse-v2.css, farmhouse-scroll-fade.ts, its existing regression test, and this report. Six fade regressions, targeted ESLint, Astro checks and the storefront build passed (existing chunk-size warning only). Reload the local storefront; no backend restart or migration is required.

The header search now opens product-name suggestions after typing, using a 150ms debounce, at most eight results, case-insensitive substring matching, real product links and the existing SEL-07 dropdown surface/active-option presentation. A native Astro adapter is used because React SearchSelect selects field values rather than navigating; real anchors preserve the preview bridge and ordinary navigation while the header remains server-rendered. The new read-only /api/product-search route uses the resolved vendor/channel and public Shop API, with bounded queries, escaped literal wildcard characters and no shared response caching. It returns only product names and local product paths. It also works when previewing a premium draft before publication because it reads public vendor products independently of the published theme. No Admin API, database changes or new backend code are involved.

The controller cancels superseded requests, ignores stale responses, supports arrows/Home/End/Enter/Escape, dismisses on blur/outside pointer interaction, and announces empty/unavailable results. Plain Enter without a highlighted suggestion retains native full-shop search submission. Names render with textContent and destinations are restricted to local product paths. The input is now text with search input mode, eliminating the browser search-cancel X, and its underline is restored on desktop/mobile. Existing keyboard-only outline handling remains.

Changed files: premium Header.astro; farmhouse-v2.css; new farmhouse-search.ts controller and pages/api/product-search.ts endpoint; farmhouse-search.test.ts; the existing HTTP SSR harness; COMPONENT_USAGE_GUIDE.md; this report. Three focused controller regressions passed, including keyboard activation, stale responses, empty/error states and safe rendering. HTTP SSR checks passed across all eleven routes with additional API checks for mixed-case names, empty queries, no matches, literal percent characters, the eight-result bound and market rejection. TypeScript, Astro checks, targeted lint, package boundaries and storefront build passed. Existing chunk-size warnings remain. Reload the storefront; no restart command, migration, deployment or publication is needed for local development.
